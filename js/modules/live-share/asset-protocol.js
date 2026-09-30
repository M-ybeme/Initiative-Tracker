/**
 * Live Share Milestone 3: asset transfer messages (planning doc §15.4).
 *
 *   player -> host  {v, type:'asset-request', assetIds:[id, ...]}      ids the player is missing
 *   host -> player  {v, type:'asset-meta', asset:{assetId, kind, mime, byteLength, width, height, chunkCount}}
 *   host -> player  binary chunk frames (below), chunkCount of them, in any order
 *   host -> player  {v, type:'asset-abort', assetId, reason}              the transfer will not complete
 *
 * A chunk is a binary data-channel message, never JSON or base64:
 *   byte 0        frame type 0x01 (asset chunk)
 *   bytes 1-32    the asset id (raw SHA-256)
 *   bytes 33-36   chunk index, uint32 big-endian
 *   bytes 37-     payload: CHUNK_BYTES, except the last chunk (the remainder)
 *
 * An asset id is the lowercase hex SHA-256 of the encoded image bytes, so identical bytes share an
 * id and the player can verify what it reassembled. Everything here validates untrusted input.
 */

export const ASSET_ID_PATTERN = /^[0-9a-f]{64}$/;
export const ASSET_KINDS = new Set(['background', 'token']);
export const ASSET_MIME_TYPES = new Set(['image/webp', 'image/png']);
export const ABORT_REASONS = new Set(['superseded', 'unavailable', 'limit']);
// 16 KiB per chunk: the message size every WebRTC implementation has always accepted, far below the
// 240 KB the structured channel allows, and small enough that a snapshot never queues behind much.
export const CHUNK_BYTES = 16 * 1024;
export const CHUNK_HEADER_BYTES = 37;
const FRAME_ASSET_CHUNK = 0x01;
// Per-kind limits; they must match BattleMapShareAssets.LIMITS (checked by the unit tests).
export const ASSET_LIMITS = Object.freeze({
  background: { maxBytes: 16 * 1024 * 1024, maxDimension: 8192, maxPixels: 4096 * 4096 },
  token: { maxBytes: 1024 * 1024, maxDimension: 512, maxPixels: 512 * 512 },
});
export const MAX_REQUEST_IDS = 64;

export const chunkCountFor = (byteLength) => Math.ceil(byteLength / CHUNK_BYTES);
export const isAssetId = (v) => typeof v === 'string' && ASSET_ID_PATTERN.test(v);
const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const posInt = (v, max) => Number.isSafeInteger(v) && v >= 1 && v <= max;

// ---- asset-request (player -> host) --------------------------------------------------------------

export function encodeAssetRequest(v, assetIds) {
  return JSON.stringify({ v, type: 'asset-request', assetIds: [...assetIds].slice(0, MAX_REQUEST_IDS) });
}

export function validateAssetRequest(msg) {
  if (!Array.isArray(msg.assetIds) || msg.assetIds.length === 0 || msg.assetIds.length > MAX_REQUEST_IDS) return { ok: false, error: 'bad asset-request ids' };
  if (!msg.assetIds.every(isAssetId)) return { ok: false, error: 'bad asset id in asset-request' };
  return { ok: true, message: { type: 'asset-request', assetIds: [...new Set(msg.assetIds)] } };
}

// ---- asset-meta / asset-abort (host -> player) ---------------------------------------------------

export function encodeAssetMeta(v, { assetId, kind, mime, bytes, width, height }) {
  return JSON.stringify({
    v,
    type: 'asset-meta',
    asset: { assetId, kind, mime, byteLength: bytes.length, width, height, chunkCount: chunkCountFor(bytes.length) },
  });
}

export function validateAssetMeta(msg) {
  const a = msg.asset;
  if (!isPlainObject(a)) return { ok: false, error: 'bad asset-meta' };
  if (!isAssetId(a.assetId)) return { ok: false, error: 'bad asset id' };
  if (!ASSET_KINDS.has(a.kind)) return { ok: false, error: 'bad asset kind' };
  if (!ASSET_MIME_TYPES.has(a.mime)) return { ok: false, error: 'asset MIME type not allowed' };
  const limits = ASSET_LIMITS[a.kind];
  if (!posInt(a.byteLength, limits.maxBytes)) return { ok: false, error: 'bad asset byte length' };
  if (!posInt(a.width, limits.maxDimension) || !posInt(a.height, limits.maxDimension) || a.width * a.height > limits.maxPixels) {
    return { ok: false, error: 'bad asset dimensions' };
  }
  if (a.chunkCount !== chunkCountFor(a.byteLength)) return { ok: false, error: 'asset chunk count does not match its length' };
  return {
    ok: true,
    message: { type: 'asset-meta', asset: { assetId: a.assetId, kind: a.kind, mime: a.mime, byteLength: a.byteLength, width: a.width, height: a.height, chunkCount: a.chunkCount } },
  };
}

export function encodeAssetAbort(v, assetId, reason) {
  return JSON.stringify({ v, type: 'asset-abort', assetId, reason });
}

export function validateAssetAbort(msg) {
  if (!isAssetId(msg.assetId) || !ABORT_REASONS.has(msg.reason)) return { ok: false, error: 'bad asset-abort' };
  return { ok: true, message: { type: 'asset-abort', assetId: msg.assetId, reason: msg.reason } };
}

// ---- binary chunks ---------------------------------------------------------------------------------

function hexToBytes(hex, out, offset) {
  for (let i = 0; i < 32; i++) out[offset + i] = parseInt(hex.substr(i * 2, 2), 16);
}

function bytesToHex(bytes, offset) {
  let hex = '';
  for (let i = 0; i < 32; i++) hex += bytes[offset + i].toString(16).padStart(2, '0');
  return hex;
}

/** The binary frame for chunk `index` of `bytes` (a Uint8Array), as an ArrayBuffer. */
export function encodeAssetChunk(assetId, index, bytes) {
  const start = index * CHUNK_BYTES;
  const payload = bytes.subarray(start, Math.min(bytes.length, start + CHUNK_BYTES));
  const frame = new Uint8Array(CHUNK_HEADER_BYTES + payload.length);
  frame[0] = FRAME_ASSET_CHUNK;
  hexToBytes(assetId, frame, 1);
  new DataView(frame.buffer).setUint32(33, index, false);
  frame.set(payload, CHUNK_HEADER_BYTES);
  return frame.buffer;
}

/** Parse a binary frame (ArrayBuffer or typed array). The payload is a copy, safe to keep. */
export function parseAssetChunk(data) {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
  if (!bytes) return { ok: false, error: 'not a binary message' };
  if (bytes.length <= CHUNK_HEADER_BYTES || bytes.length > CHUNK_HEADER_BYTES + CHUNK_BYTES) return { ok: false, type: 'asset-chunk', error: 'bad chunk size' };
  if (bytes[0] !== FRAME_ASSET_CHUNK) return { ok: false, error: 'unknown binary frame' };
  const index = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(33, false);
  return {
    ok: true,
    message: { type: 'asset-chunk', assetId: bytesToHex(bytes, 1), index, payload: bytes.slice(CHUNK_HEADER_BYTES) },
  };
}

// ---- content checks --------------------------------------------------------------------------------

/** Whether `bytes` really are the image type they claim (PNG or WebP signature). */
export function matchesMime(bytes, mime) {
  if (mime === 'image/png') return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b);
  if (mime === 'image/webp') {
    const ascii = (from, s) => [...s].every((c, i) => bytes[from + i] === c.charCodeAt(0));
    return bytes.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP');
  }
  return false;
}

export async function sha256Hex(bytes, subtle = globalThis.crypto && globalThis.crypto.subtle) {
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  return bytesToHex(digest, 0);
}
