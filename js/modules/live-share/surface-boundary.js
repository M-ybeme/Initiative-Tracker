/**
 * Live Share Milestone 5A.3: the surface ↔ session host boundary protocol
 * (docs/live-share-session-host-architecture.md §6).
 *
 * Toolbox pages that share something with players (the Battle Map; later the Initiative Tracker) are
 * "surfaces". They publish player-safe state to the session host page (live-share.html) over
 * same-origin BroadcastChannels:
 *
 *   CONTROL_CHANNEL                 registration, liveness, roles, publication negotiation, status
 *   surfaceDataChannel(surface)     asset bytes, one channel per surface type, so a 16 MiB Battle Map
 *                                   background is copied only into the host and Battle Map tabs
 *
 * Every message is an envelope { ch: BOUNDARY_MARKER, v: BOUNDARY_PROTOCOL_VERSION, type, from, to?, ... }.
 * `from` is a surface instance id (one page load) or 'host'. An instance id identifies, it does not
 * authenticate: same-origin is not trusted either (an old cached tab, a bug or an injected script can
 * post anything), so every message is checked here, field by field, before it can affect anything,
 * and messages are copied into fresh objects of known fields. Unknown fields, types and versions are
 * refused. What a structured publication may contain is the surface's own schema
 * (battlemap-publication.js); this file checks only the envelope and the message shapes.
 *
 * Never on this boundary: seats, player names, passwords, credentials or admission state (5B). The
 * session status a surface gets is { running, players: <count> }, nothing more.
 *
 *   surface -> host  surface-hello { surface, surfaceVersion, hasPublication }   on load and on host-hello
 *                    surface-heartbeat {}                                         ~5 s (throttled when hidden)
 *                    surface-claim {}           "publish from this tab" (no UI yet; 5A.4)
 *                    publication-offer { publicationSeq, structured, assets: [meta] }
 *                    publication-asset { publicationSeq, assetId, meta, bytes }   data channel only
 *                    surface-bye {}                                               on pagehide (advisory)
 *   host -> surface  host-hello { sessionActive }                                 broadcast
 *                    session-status { running, players }                          broadcast
 *                    surface-role { active, reason }                              to one instance
 *                    publication-need { publicationSeq, assetIds }                to one instance
 *                    publication-committed { publicationSeq, revision }           to one instance
 *                    publication-rejected { publicationSeq, reason }              to one instance
 */
import { isAssetId, validateAssetMeta, chunkCountFor } from './asset-protocol.js';

export const BOUNDARY_MARKER = 'dmtoolbox.live-share';
export const BOUNDARY_PROTOCOL_VERSION = 1;
export const CONTROL_CHANNEL = 'dmtoolbox.live-share.control';
export const surfaceDataChannel = (surface) => `dmtoolbox.live-share.surface.${surface}`;

// The surfaces Live Share knows. 'initiative' is reserved for the future Initiative Tracker: it may
// register (the DM sees it), but the host supports no version of it yet, so it can't publish.
export const SURFACE_TYPES = Object.freeze(['battle-map', 'initiative']);
export const HOST_ID = 'host';
// Liveness (status only). A surface heartbeats every HEARTBEAT_MS, but hidden tabs run timers about
// once a second and Chrome throttles long-hidden ones to about once a minute, so the host waits
// NOT_RESPONDING_MS of silence before it calls a surface "not responding".
export const HEARTBEAT_MS = 5000;
export const NOT_RESPONDING_MS = 150000;
const INSTANCE_ID = /^[A-Za-z0-9_-]{16,64}$/;
// One publication references at most one background and one asset per token (battlemap-snapshot.js).
export const MAX_OFFER_ASSETS = 501;
export const MAX_NEED_IDS = MAX_OFFER_ASSETS;
// Stable reasons, for the surface's status and the host's diagnostics (never raw error text).
export const REJECT_REASONS = Object.freeze([
  'no-session', // no Live Share session is running
  'inactive', // another tab of this surface is the active publisher
  'incompatible', // this surface version is not supported by this host
  'stale', // an older or repeated publicationSeq
  'invalid', // the structured content or asset list failed validation
  'limit', // over a size limit
  'asset-invalid', // an asset's bytes did not match its metadata, type or id (hash)
  'superseded', // a newer offer from the same tab replaced this one
]);
export const ROLE_REASONS = Object.freeze(['registered', 'claimed', 'promoted', 'superseded', 'incompatible']);

export const isInstanceId = (v) => typeof v === 'string' && INSTANCE_ID.test(v);
const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isSeq = (v) => Number.isSafeInteger(v) && v >= 1;
const isCount = (v) => Number.isSafeInteger(v) && v >= 0 && v <= 10000;

/** A fresh random instance id for one page load of a surface. */
export function newInstanceId(crypto = globalThis.crypto) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Fields every envelope has; each type lists the rest. A message with any other field is refused.
const ENVELOPE = ['ch', 'v', 'type', 'from', 'to'];
const SURFACE_TO_HOST = {
  'surface-hello': { fields: ['surface', 'surfaceVersion', 'hasPublication'] },
  'surface-heartbeat': { fields: [] },
  'surface-claim': { fields: [] },
  'surface-bye': { fields: [] },
  'publication-offer': { fields: ['publicationSeq', 'structured', 'assets'] },
  'publication-asset': { fields: ['publicationSeq', 'assetId', 'meta', 'bytes'], data: true },
};
const HOST_TO_SURFACE = {
  'host-hello': { fields: ['sessionActive'], broadcast: true },
  'session-status': { fields: ['running', 'players'], broadcast: true },
  'surface-role': { fields: ['active', 'reason'] },
  'publication-need': { fields: ['publicationSeq', 'assetIds'] },
  'publication-committed': { fields: ['publicationSeq', 'revision'] },
  'publication-rejected': { fields: ['publicationSeq', 'reason'] },
};

/**
 * An asset's metadata as offered: { assetId, kind, mime, width, height, byteLength }, checked against
 * the Milestone 3 per-kind limits (asset-protocol.js, the same checks players apply).
 */
export function validateOfferedAsset(a) {
  if (!isPlainObject(a)) return { ok: false, error: 'asset is not an object' };
  const keys = Object.keys(a);
  if (keys.length !== 6 || !['assetId', 'kind', 'mime', 'width', 'height', 'byteLength'].every((k) => keys.includes(k))) {
    return { ok: false, error: 'asset fields are not { assetId, kind, mime, width, height, byteLength }' };
  }
  if (!isAssetId(a.assetId)) return { ok: false, error: 'bad asset id' };
  const checked = validateAssetMeta({ asset: { ...a, chunkCount: Number.isSafeInteger(a.byteLength) ? chunkCountFor(a.byteLength) : NaN } });
  if (!checked.ok) return checked;
  const { assetId, kind, mime, width, height, byteLength } = checked.message.asset;
  return { ok: true, asset: { assetId, kind, mime, width, height, byteLength } };
}

function validateMeta(meta) {
  if (!isPlainObject(meta)) return null;
  const keys = Object.keys(meta);
  if (keys.length !== 5 || !['kind', 'mime', 'width', 'height', 'byteLength'].every((k) => keys.includes(k))) return null;
  return { kind: meta.kind, mime: meta.mime, width: meta.width, height: meta.height, byteLength: meta.byteLength };
}

function checkEnvelope(msg, table) {
  if (!isPlainObject(msg)) return { ok: false, error: 'not an object' };
  if (msg.ch !== BOUNDARY_MARKER) return { ok: false, error: 'not a Live Share boundary message' };
  if (msg.v !== BOUNDARY_PROTOCOL_VERSION) return { ok: false, error: 'unsupported boundary protocol version' };
  if (typeof msg.type !== 'string' || !Object.prototype.hasOwnProperty.call(table, msg.type)) return { ok: false, error: 'unknown message type' };
  const spec = table[msg.type];
  for (const key of Object.keys(msg)) if (!ENVELOPE.includes(key) && !spec.fields.includes(key)) return { ok: false, error: `unexpected field ${key}` };
  return { ok: true, spec };
}

/**
 * A message a surface sent to the host. `channel` is 'control' or 'data': asset bytes only travel
 * on a data channel, everything else only on the control channel. Returns { ok, message } with a
 * fresh copy of the known fields, or { ok: false, error }. Never throws.
 */
export function parseSurfaceMessage(msg, channel = 'control') {
  try {
    const env = checkEnvelope(msg, SURFACE_TO_HOST);
    if (!env.ok) return env;
    if (!!env.spec.data !== (channel === 'data')) return { ok: false, error: `${msg.type} on the wrong channel` };
    if (!isInstanceId(msg.from)) return { ok: false, error: 'bad sender instance id' };
    if (msg.to !== HOST_ID) return { ok: false, error: 'not addressed to the host' };
    const base = { type: msg.type, from: msg.from };
    switch (msg.type) {
      case 'surface-hello':
        if (!SURFACE_TYPES.includes(msg.surface)) return { ok: false, error: 'unknown surface type' };
        if (!Number.isSafeInteger(msg.surfaceVersion) || msg.surfaceVersion < 1) return { ok: false, error: 'bad surfaceVersion' };
        if (typeof msg.hasPublication !== 'boolean') return { ok: false, error: 'bad hasPublication' };
        return { ok: true, message: { ...base, surface: msg.surface, surfaceVersion: msg.surfaceVersion, hasPublication: msg.hasPublication } };
      case 'surface-heartbeat':
      case 'surface-claim':
      case 'surface-bye':
        return { ok: true, message: base };
      case 'publication-offer': {
        if (!isSeq(msg.publicationSeq)) return { ok: false, error: 'bad publicationSeq' };
        if (!isPlainObject(msg.structured)) return { ok: false, error: 'bad structured' };
        if (!Array.isArray(msg.assets)) return { ok: false, error: 'bad asset list' };
        if (msg.assets.length > MAX_OFFER_ASSETS) return { ok: false, error: 'too many assets' };
        const assets = [];
        const ids = new Set();
        for (const a of msg.assets) {
          const checked = validateOfferedAsset(a);
          if (!checked.ok) return { ok: false, error: `bad asset: ${checked.error}` };
          if (ids.has(checked.asset.assetId)) return { ok: false, error: 'duplicate asset id' };
          ids.add(checked.asset.assetId);
          assets.push(checked.asset);
        }
        // `structured` is checked by the surface's own schema (the host publication store).
        return { ok: true, message: { ...base, publicationSeq: msg.publicationSeq, structured: msg.structured, assets } };
      }
      case 'publication-asset': {
        if (!isSeq(msg.publicationSeq)) return { ok: false, error: 'bad publicationSeq' };
        if (!isAssetId(msg.assetId)) return { ok: false, error: 'bad asset id' };
        const meta = validateMeta(msg.meta);
        if (!meta) return { ok: false, error: 'bad asset meta' };
        // Bytes, never a URL or a reference to something to fetch.
        if (!(msg.bytes instanceof ArrayBuffer)) return { ok: false, error: 'asset bytes are not an ArrayBuffer' };
        return { ok: true, message: { ...base, publicationSeq: msg.publicationSeq, assetId: msg.assetId, meta, bytes: msg.bytes } };
      }
    }
    return { ok: false, error: 'unknown message type' };
  } catch {
    return { ok: false, error: 'malformed message' };
  }
}

/**
 * A message the host sent to surfaces, as a surface reads it. Targeted messages for another instance
 * are refused (`error: 'not for this instance'`), so a surface acts only on its own.
 */
export function parseHostMessage(msg, instanceId) {
  try {
    const env = checkEnvelope(msg, HOST_TO_SURFACE);
    if (!env.ok) return env;
    if (msg.from !== HOST_ID) return { ok: false, error: 'not from the host' };
    if (env.spec.broadcast) {
      if (msg.to !== undefined) return { ok: false, error: 'unexpected recipient' };
    } else if (msg.to !== instanceId) {
      return { ok: false, error: 'not for this instance' };
    }
    const base = { type: msg.type };
    switch (msg.type) {
      case 'host-hello':
        if (typeof msg.sessionActive !== 'boolean') return { ok: false, error: 'bad sessionActive' };
        return { ok: true, message: { ...base, sessionActive: msg.sessionActive } };
      case 'session-status':
        if (typeof msg.running !== 'boolean' || !isCount(msg.players)) return { ok: false, error: 'bad session-status' };
        return { ok: true, message: { ...base, running: msg.running, players: msg.players } };
      case 'surface-role':
        if (typeof msg.active !== 'boolean' || !ROLE_REASONS.includes(msg.reason)) return { ok: false, error: 'bad surface-role' };
        return { ok: true, message: { ...base, active: msg.active, reason: msg.reason } };
      case 'publication-need':
        if (!isSeq(msg.publicationSeq) || !Array.isArray(msg.assetIds) || msg.assetIds.length > MAX_NEED_IDS || !msg.assetIds.every(isAssetId)) {
          return { ok: false, error: 'bad publication-need' };
        }
        return { ok: true, message: { ...base, publicationSeq: msg.publicationSeq, assetIds: [...new Set(msg.assetIds)] } };
      case 'publication-committed':
        if (!isSeq(msg.publicationSeq) || !isSeq(msg.revision)) return { ok: false, error: 'bad publication-committed' };
        return { ok: true, message: { ...base, publicationSeq: msg.publicationSeq, revision: msg.revision } };
      case 'publication-rejected':
        if (!isSeq(msg.publicationSeq) || !REJECT_REASONS.includes(msg.reason)) return { ok: false, error: 'bad publication-rejected' };
        return { ok: true, message: { ...base, publicationSeq: msg.publicationSeq, reason: msg.reason } };
    }
    return { ok: false, error: 'unknown message type' };
  } catch {
    return { ok: false, error: 'malformed message' };
  }
}

/** An envelope for `type`; the caller supplies the type's own fields. */
export function envelope(type, from, fields = {}, to = undefined) {
  const msg = { ch: BOUNDARY_MARKER, v: BOUNDARY_PROTOCOL_VERSION, type, from, ...fields };
  if (to !== undefined) msg.to = to;
  return msg;
}
