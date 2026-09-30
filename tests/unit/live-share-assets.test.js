// Live Share Milestone 3: asset transfer on the wire and on both ends:
//   asset-protocol.js  message and binary chunk validation
//   asset-cache.js     the player's request/possession model, reassembly, verification, object URLs
//   asset-sender.js    request-driven sending, chunk pacing under backpressure, latest background wins
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CHUNK_BYTES,
  CHUNK_HEADER_BYTES,
  ASSET_LIMITS,
  MAX_REQUEST_IDS,
  encodeAssetRequest,
  encodeAssetMeta,
  encodeAssetAbort,
  encodeAssetChunk,
  parseAssetChunk,
  chunkCountFor,
  matchesMime,
  sha256Hex,
} from '../../js/modules/live-share/asset-protocol.js';
import { parseChannelMessage } from '../../js/modules/live-share/protocol.js';
import { createAssetCache, MAX_ACTIVE_TRANSFERS } from '../../js/modules/live-share/asset-cache.js';
import { createAssetSender, ASSET_BUFFER_BUDGET_BYTES, MAX_SENDS_PER_ASSET } from '../../js/modules/live-share/asset-sender.js';
import { SNAPSHOT_BUSY_BYTES } from '../../js/modules/live-share/snapshot-sender.js';
import { BUFFERED_LOW_WATER_BYTES } from '../../js/modules/live-share/peer-link.js';

const WEBP_SIG = [...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)));

// A fake but well-formed WebP of `size` bytes, and its asset record.
async function makeAsset(size, { kind = 'background', seed = 1, mime = 'image/webp' } = {}) {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = (i * 31 + seed * 7) & 255;
  if (mime === 'image/webp') bytes.set(WEBP_SIG, 0);
  else bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return { assetId: await sha256Hex(bytes), kind, mime, width: 100, height: 80, bytes };
}

const metaOf = (asset) => JSON.parse(encodeAssetMeta(0, asset)).asset;
const chunksOf = (asset) => Array.from({ length: chunkCountFor(asset.bytes.length) }, (_, i) => parseAssetChunk(encodeAssetChunk(asset.assetId, i, asset.bytes)).message);

describe('asset protocol', () => {
  it('keeps every chunk message far below the data-channel limits, and snapshots ahead of chunks', () => {
    expect(CHUNK_BYTES + CHUNK_HEADER_BYTES).toBeLessThan(64 * 1024);
    // Chunks never fill the channel to where snapshots would be held back.
    expect(ASSET_BUFFER_BUDGET_BYTES + CHUNK_BYTES + CHUNK_HEADER_BYTES).toBeLessThan(SNAPSHOT_BUSY_BYTES);
    expect(BUFFERED_LOW_WATER_BYTES).toBeLessThan(ASSET_BUFFER_BUDGET_BYTES);
    expect(chunkCountFor(ASSET_LIMITS.background.maxBytes)).toBe(1024);
  });

  it('round-trips a binary chunk frame, without JSON or base64', async () => {
    const asset = await makeAsset(CHUNK_BYTES * 2 + 100);
    const frame = encodeAssetChunk(asset.assetId, 2, asset.bytes);
    expect(frame).toBeInstanceOf(ArrayBuffer);
    expect(frame.byteLength).toBe(CHUNK_HEADER_BYTES + 100);
    const parsed = parseChannelMessage(frame);
    expect(parsed.ok).toBe(true);
    expect(parsed.message).toMatchObject({ type: 'asset-chunk', assetId: asset.assetId, index: 2 });
    expect([...parsed.message.payload]).toEqual([...asset.bytes.subarray(CHUNK_BYTES * 2)]);
  });

  it.each([
    ['an empty frame', new ArrayBuffer(0)],
    ['a header without payload', new ArrayBuffer(CHUNK_HEADER_BYTES)],
    ['an oversized chunk', new ArrayBuffer(CHUNK_HEADER_BYTES + CHUNK_BYTES + 1)],
    ['an unknown frame type', new Uint8Array(CHUNK_HEADER_BYTES + 10).fill(7).buffer],
  ])('rejects %s', (_label, frame) => {
    expect(parseChannelMessage(frame).ok).toBe(false);
  });

  it('round-trips metadata, requests and aborts', async () => {
    const asset = await makeAsset(40000);
    expect(parseChannelMessage(encodeAssetMeta(0, asset))).toEqual({
      ok: true,
      message: { type: 'asset-meta', asset: { assetId: asset.assetId, kind: 'background', mime: 'image/webp', byteLength: 40000, width: 100, height: 80, chunkCount: 3 } },
    });
    expect(parseChannelMessage(encodeAssetRequest(0, [asset.assetId, asset.assetId]))).toEqual({ ok: true, message: { type: 'asset-request', assetIds: [asset.assetId] } });
    expect(parseChannelMessage(encodeAssetAbort(0, asset.assetId, 'superseded'))).toEqual({ ok: true, message: { type: 'asset-abort', assetId: asset.assetId, reason: 'superseded' } });
  });

  const ID = 'a'.repeat(64);
  const meta = (over) => JSON.stringify({ v: 0, type: 'asset-meta', asset: { assetId: ID, kind: 'background', mime: 'image/webp', byteLength: 20000, width: 100, height: 100, chunkCount: 2, ...over } });
  it.each([
    ['a bad id', meta({ assetId: 'A'.repeat(64) })],
    ['a URL as id', meta({ assetId: 'https://evil.example/x.png' })],
    ['an unknown kind', meta({ kind: 'fog' })],
    ['a disallowed MIME type', meta({ mime: 'image/svg+xml' })],
    ['a text MIME type', meta({ mime: 'text/html' })],
    ['a negative length', meta({ byteLength: -1, chunkCount: 0 })],
    ['a zero length', meta({ byteLength: 0, chunkCount: 0 })],
    ['a NaN length', meta({ byteLength: 'NaN' })],
    ['a fractional length', meta({ byteLength: 1.5, chunkCount: 1 })],
    ['a giant allocation', meta({ byteLength: 2 ** 40, chunkCount: chunkCountFor(2 ** 40) })],
    ['more than the background byte limit', meta({ byteLength: ASSET_LIMITS.background.maxBytes + 1, chunkCount: chunkCountFor(ASSET_LIMITS.background.maxBytes + 1) })],
    ['more than the token byte limit', meta({ kind: 'token', width: 64, height: 64, byteLength: ASSET_LIMITS.token.maxBytes + 1, chunkCount: chunkCountFor(ASSET_LIMITS.token.maxBytes + 1) })],
    ['a chunk count that does not match the length', meta({ chunkCount: 3 })],
    ['too wide', meta({ width: 8193 })],
    ['too many pixels', meta({ width: 8192, height: 8192 })],
    ['a token larger than 512 px', meta({ kind: 'token', width: 600, height: 64, byteLength: 1000, chunkCount: 1 })],
    ['Infinity dimensions', JSON.stringify({ v: 0, type: 'asset-meta', asset: { assetId: ID, kind: 'background', mime: 'image/webp', byteLength: 100, width: 1e999, height: 1, chunkCount: 1 } })],
    ['a missing asset', JSON.stringify({ v: 0, type: 'asset-meta' })],
    ['a request with no ids', JSON.stringify({ v: 0, type: 'asset-request', assetIds: [] })],
    ['a request with too many ids', JSON.stringify({ v: 0, type: 'asset-request', assetIds: Array(MAX_REQUEST_IDS + 1).fill(ID) })],
    ['a request with a bad id', JSON.stringify({ v: 0, type: 'asset-request', assetIds: ['../secret'] })],
    ['an abort with an unknown reason', JSON.stringify({ v: 0, type: 'asset-abort', assetId: ID, reason: '<b>' })],
  ])('rejects %s', (_label, raw) => {
    const parsed = parseChannelMessage(raw);
    expect(parsed.ok).toBe(false);
  });

  it('copies only known metadata fields (no __proto__ or extras)', () => {
    const raw = meta({}).replace('"assetId"', '"__proto__":{"polluted":true},"extra":"x","assetId"');
    const parsed = parseChannelMessage(raw);
    expect(Object.keys(parsed.message.asset).sort()).toEqual(['assetId', 'byteLength', 'chunkCount', 'height', 'kind', 'mime', 'width']);
    expect({}.polluted).toBeUndefined();
  });

  it('checks image signatures', async () => {
    expect(matchesMime((await makeAsset(100)).bytes, 'image/webp')).toBe(true);
    expect(matchesMime((await makeAsset(100, { mime: 'image/png' })).bytes, 'image/png')).toBe(true);
    expect(matchesMime((await makeAsset(100, { mime: 'image/png' })).bytes, 'image/webp')).toBe(false);
    expect(matchesMime(new TextEncoder().encode('<svg onload=alert(1)>'), 'image/png')).toBe(false);
  });

  it('derives the same id from the same bytes, and a different id from different bytes', async () => {
    const a = await makeAsset(5000, { seed: 1 });
    const b = await makeAsset(5000, { seed: 1 });
    const c = await makeAsset(5000, { seed: 2 });
    expect(a.assetId).toBe(b.assetId);
    expect(a.assetId).not.toBe(c.assetId);
    expect(a.assetId).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---- Player cache ----------------------------------------------------------------------------------

describe('player asset cache', () => {
  let requests;
  let ready;
  let urls;
  let cache;
  beforeEach(() => {
    requests = [];
    ready = [];
    urls = { created: [], revoked: [] };
    let n = 0;
    cache = createAssetCache({
      requestAssets: (ids) => requests.push(ids),
      onReady: (id) => ready.push(id),
      createObjectURL: () => {
        const u = `blob:test/${++n}`;
        urls.created.push(u);
        return u;
      },
      revokeObjectURL: (u) => urls.revoked.push(u),
    });
  });

  const snap = (background, tokenIds = []) => ({
    map: { width: 100, height: 80 },
    background: background ? { assetId: background, revision: 1 } : null,
    tokens: tokenIds.map((assetId, i) => ({ id: `t${i}`, assetId })),
  });

  async function deliver(asset, order = null) {
    cache.handleMeta(metaOf(asset));
    const chunks = chunksOf(asset);
    let done = null;
    for (const i of order || chunks.map((_, k) => k)) done = cache.handleChunk(chunks[i]) || done;
    await done;
  }

  it('requests what a snapshot references once, in one message; nothing when cached', async () => {
    const bg = await makeAsset(40000);
    const art = await makeAsset(3000, { kind: 'token', seed: 5 });
    cache.sync(snap(bg.assetId, [art.assetId, art.assetId, null]));
    expect(requests).toEqual([[bg.assetId, art.assetId]]);
    cache.sync(snap(bg.assetId, [art.assetId])); // still on its way: no second request
    expect(requests).toHaveLength(1);
    await deliver(bg);
    await deliver(art);
    expect(ready).toEqual([bg.assetId, art.assetId]);
    cache.sync(snap(bg.assetId, [art.assetId, art.assetId]));
    expect(requests).toHaveLength(1);
    expect(cache.stats()).toMatchObject({ requested: 2, received: 2, cached: 2, failed: 0 });
    expect(cache.stats().deduplicated).toBe(2); // both ids served from the cache, the shared art once
  });

  it('reassembles chunks in any order and ignores identical duplicates', async () => {
    const bg = await makeAsset(CHUNK_BYTES * 4 + 7);
    cache.sync(snap(bg.assetId));
    const chunks = chunksOf(bg);
    cache.handleMeta(metaOf(bg));
    cache.handleChunk(chunks[3]);
    cache.handleChunk(chunks[3]); // duplicate
    cache.handleChunk(chunks[0]);
    cache.handleChunk(chunks[4]);
    cache.handleChunk(chunks[1]);
    await cache.handleChunk(chunks[2]);
    expect(cache.url(bg.assetId)).toBe('blob:test/1');
    expect(cache.stats()).toMatchObject({ failed: 0, rejected: 0 });
  });

  it('makes nothing from a partial asset', async () => {
    const bg = await makeAsset(CHUNK_BYTES * 3);
    cache.sync(snap(bg.assetId));
    cache.handleMeta(metaOf(bg));
    const chunks = chunksOf(bg);
    cache.handleChunk(chunks[0]);
    cache.handleChunk(chunks[2]);
    expect(cache.url(bg.assetId)).toBeNull();
    expect(urls.created).toEqual([]);
  });

  it.each([
    ['a chunk before its metadata', async (bg) => cache.handleChunk(chunksOf(bg)[0]), false],
    ['metadata nobody asked for', async (bg) => cache.handleMeta(metaOf({ ...bg, assetId: 'f'.repeat(64) })), false],
    ['a chunk with the wrong length', async (bg) => {
      cache.handleMeta(metaOf(bg));
      const c = chunksOf(bg)[0];
      cache.handleChunk({ ...c, payload: c.payload.subarray(0, 100) });
    }, true],
    ['a chunk index past the end', async (bg) => {
      cache.handleMeta(metaOf(bg));
      cache.handleChunk({ ...chunksOf(bg)[0], index: 99 });
    }, true],
    ['a conflicting duplicate chunk', async (bg) => {
      cache.handleMeta(metaOf(bg));
      const c = chunksOf(bg)[0];
      cache.handleChunk(c);
      cache.handleChunk({ ...c, payload: c.payload.map((b) => b ^ 1) });
    }, true],
    ['conflicting metadata for the same id', async (bg) => {
      cache.handleMeta(metaOf(bg));
      cache.handleMeta({ ...metaOf(bg), width: 50 });
    }, true],
  ])('rejects %s', async (_label, act, failsTransfer) => {
    const bg = await makeAsset(CHUNK_BYTES * 2 + 10);
    cache.sync(snap(bg.assetId));
    await act(bg);
    expect(cache.stats().rejected).toBe(1);
    expect(cache.url(bg.assetId)).toBeNull();
    expect(cache.stats().failed).toBe(failsTransfer ? 1 : 0);
  });

  it('rejects bytes that do not hash to the asset id, or are not the claimed image type', async () => {
    const real = await makeAsset(20000);
    const forged = { ...real, bytes: real.bytes.map((b, i) => (i === 500 ? b ^ 0xff : b)) }; // same id, other bytes
    cache.sync(snap(real.assetId));
    await deliver(forged);
    expect(cache.url(real.assetId)).toBeNull();
    expect(cache.stats().failed).toBe(1);
    expect(urls.created).toEqual([]);

    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
    const fake = { assetId: await sha256Hex(svg), kind: 'token', mime: 'image/png', width: 10, height: 10, bytes: svg };
    cache.sync(snap(null, [fake.assetId]));
    await deliver(fake);
    expect(cache.url(fake.assetId)).toBeNull();
    expect(urls.created).toEqual([]);
  });

  it('bounds the number of transfers in flight', async () => {
    const assets = await Promise.all(Array.from({ length: MAX_ACTIVE_TRANSFERS + 1 }, (_, i) => makeAsset(20000, { kind: 'token', seed: i + 10 })));
    cache.sync(snap(null, assets.map((a) => a.assetId)));
    assets.forEach((a) => cache.handleMeta(metaOf(a)));
    expect(cache.stats().activeTransfers).toBe(MAX_ACTIVE_TRANSFERS);
    expect(cache.stats().rejected).toBe(1);
  });

  it('forgets a superseded or unavailable asset, and asks again a bounded number of times', async () => {
    const bg = await makeAsset(20000);
    for (let i = 0; i < 5; i++) {
      cache.sync(snap(bg.assetId));
      cache.handleAbort({ assetId: bg.assetId, reason: 'unavailable' });
    }
    expect(requests).toHaveLength(3);
    expect(cache.stats().failed).toBe(1);
    const other = await makeAsset(100, { kind: 'token', seed: 3 });
    cache.sync(snap(null, [other.assetId]));
    cache.handleAbort({ assetId: other.assetId, reason: 'limit' });
    cache.sync(snap(null, [other.assetId]));
    expect(requests).toHaveLength(4); // refused by the host: not asked again
  });

  it('keeps showing the previous background until the new one is here, then revokes it', async () => {
    const first = await makeAsset(20000, { seed: 1 });
    const second = await makeAsset(20000, { seed: 2 });
    cache.sync(snap(first.assetId));
    await deliver(first);
    expect(cache.backgroundFor(snap(first.assetId))).toEqual({ url: 'blob:test/1', assetId: first.assetId, current: true });
    // The fog changed: the new background is on its way; the old one stays up (no placeholder flash).
    cache.sync(snap(second.assetId));
    expect(cache.backgroundFor(snap(second.assetId))).toEqual({ url: 'blob:test/1', assetId: first.assetId, current: false });
    await deliver(second);
    expect(cache.backgroundFor(snap(second.assetId))).toEqual({ url: 'blob:test/2', assetId: second.assetId, current: true });
    await Promise.resolve();
    expect(urls.revoked).toEqual(['blob:test/1']);
    expect(cache.url(first.assetId)).toBeNull();
    // A different map size: the old background is not stretched over it.
    expect(cache.backgroundFor({ ...snap('9'.repeat(64)), map: { width: 1, height: 1 } })).toBeNull();
  });

  it('dispose() revokes every object URL and stops accepting anything', async () => {
    const bg = await makeAsset(20000);
    const art = await makeAsset(2000, { kind: 'token', seed: 4 });
    cache.sync(snap(bg.assetId, [art.assetId]));
    await deliver(bg);
    await deliver(art);
    cache.dispose();
    expect(urls.revoked.sort()).toEqual([...urls.created].sort());
    expect(cache.url(bg.assetId)).toBeNull();
    expect(cache.backgroundFor(snap(bg.assetId))).toBeNull();
    expect(cache.sync(snap(bg.assetId))).toEqual([]);
  });

  it('diagnostics are counts only', async () => {
    const bg = await makeAsset(20000);
    cache.sync(snap(bg.assetId));
    await deliver(bg);
    const text = JSON.stringify(cache.stats());
    expect(text).not.toMatch(/blob:|RIFF|WEBP/);
    for (const v of Object.values(cache.stats())) expect(typeof v).toBe('number');
  });
});

// ---- Host sender ---------------------------------------------------------------------------------

// A link whose channel drains only when the test says so.
function fakeLink() {
  const listeners = new Set();
  return {
    sent: [],
    buffered: 0,
    send(data) {
      this.sent.push(data);
      this.buffered += typeof data === 'string' ? data.length : data.byteLength;
      return true;
    },
    bufferedAmount() {
      return this.buffered;
    },
    on: (type, fn) => type === 'drain' && listeners.add(fn),
    off: (type, fn) => type === 'drain' && listeners.delete(fn),
    drain() {
      this.buffered = 0;
      for (const fn of [...listeners]) fn();
    },
    texts() {
      return this.sent.filter((d) => typeof d === 'string').map((d) => JSON.parse(d));
    },
    chunkCount() {
      return this.sent.filter((d) => typeof d !== 'string').length;
    },
  };
}

describe('host asset sender', () => {
  let store;
  let sender;
  let link;
  let timers;
  beforeEach(() => {
    store = new Map();
    timers = [];
    sender = createAssetSender({
      protocolVersion: 0,
      getAsset: (id) => (store.has(id) ? { ...store.get(id), bytes: store.get(id).bytes.slice() } : null),
      hasAsset: (id) => store.has(id),
      setTimer: (fn) => timers.push(fn) && timers.length,
      clearTimer: () => {},
    });
    link = fakeLink();
    sender.addPeer('p1', link);
  });
  const add = (asset) => store.set(asset.assetId, asset);
  const drainUntilDone = () => {
    for (let i = 0; i < 10000 && link.buffered > 0; i++) link.drain();
  };

  it('sends nothing until asked', async () => {
    add(await makeAsset(50000));
    expect(link.sent).toEqual([]);
  });

  it('sends metadata, then chunks, pausing whenever the channel holds its budget', async () => {
    const bg = await makeAsset(CHUNK_BYTES * 10 + 5);
    add(bg);
    sender.request('p1', [bg.assetId]);
    // Bounded: only what fits in the budget (plus one chunk) is handed to the channel.
    expect(link.buffered).toBeLessThan(ASSET_BUFFER_BUDGET_BYTES + CHUNK_BYTES + CHUNK_HEADER_BYTES + 400);
    expect(link.chunkCount()).toBeLessThan(11);
    expect(sender.diagnostics()).toMatchObject({ activeTransfers: 1 });
    drainUntilDone();
    expect(link.texts()[0]).toMatchObject({ type: 'asset-meta', asset: { assetId: bg.assetId, chunkCount: 11 } });
    expect(link.chunkCount()).toBe(11);
    expect(sender.diagnostics()).toMatchObject({ sent: 1, activeTransfers: 0, bytesSent: bg.bytes.length });
    // What arrived reassembles to exactly the asset.
    const cacheUrls = [];
    const cache = createAssetCache({ requestAssets: () => {}, createObjectURL: () => cacheUrls.push('blob:x') && 'blob:x', revokeObjectURL: () => {} });
    cache.sync({ background: { assetId: bg.assetId, revision: 1 }, tokens: [], map: {} });
    cache.handleMeta(link.texts()[0].asset);
    let done;
    for (const d of link.sent.filter((x) => typeof x !== 'string')) done = cache.handleChunk(parseAssetChunk(d).message) || done;
    await done;
    expect(cache.url(bg.assetId)).toBe('blob:x');
  });

  it('resumes on a timer if the channel never reports draining', async () => {
    const bg = await makeAsset(CHUNK_BYTES * 6);
    add(bg);
    sender.request('p1', [bg.assetId]);
    const before = link.chunkCount();
    link.buffered = 0; // drained silently
    timers.shift()();
    expect(link.chunkCount()).toBeGreaterThan(before);
  });

  it('answers unknown ids with "unavailable" and ignores a repeated request in progress', async () => {
    const bg = await makeAsset(CHUNK_BYTES * 10);
    add(bg);
    sender.request('p1', ['0'.repeat(64), bg.assetId]);
    sender.request('p1', [bg.assetId]); // still being sent
    drainUntilDone();
    const texts = link.texts();
    expect(texts[0]).toEqual({ v: 0, type: 'asset-abort', assetId: '0'.repeat(64), reason: 'unavailable' });
    expect(texts.filter((m) => m.type === 'asset-meta')).toHaveLength(1);
    expect(sender.diagnostics()).toMatchObject({ unavailable: 1, alreadyQueued: 1, sent: 1 });
  });

  it('aborts a background replaced while it is being sent (latest wins)', async () => {
    const old = await makeAsset(CHUNK_BYTES * 20, { seed: 1 });
    const next = await makeAsset(CHUNK_BYTES * 2, { seed: 2 });
    add(old);
    sender.request('p1', [old.assetId]);
    const partial = link.chunkCount();
    store.delete(old.assetId);
    add(next);
    sender.assetsChanged();
    expect(link.texts().pop()).toEqual({ v: 0, type: 'asset-abort', assetId: old.assetId, reason: 'superseded' });
    drainUntilDone();
    expect(link.chunkCount()).toBe(partial); // nothing more of the old one
    sender.request('p1', [next.assetId]);
    drainUntilDone();
    expect(link.texts().filter((m) => m.type === 'asset-meta').map((m) => m.asset.assetId)).toEqual([old.assetId, next.assetId]);
    expect(sender.diagnostics().superseded).toBe(1);
  });

  it(`refuses a player that asks for the same asset more than ${MAX_SENDS_PER_ASSET} times`, async () => {
    const art = await makeAsset(1000, { kind: 'token' });
    add(art);
    for (let i = 0; i < MAX_SENDS_PER_ASSET + 1; i++) {
      sender.request('p1', [art.assetId]);
      drainUntilDone();
    }
    expect(link.texts().filter((m) => m.type === 'asset-meta')).toHaveLength(MAX_SENDS_PER_ASSET);
    expect(link.texts().pop()).toMatchObject({ type: 'asset-abort', reason: 'limit' });
  });

  it('stops sending to a removed player', async () => {
    const bg = await makeAsset(CHUNK_BYTES * 10);
    add(bg);
    sender.request('p1', [bg.assetId]);
    const count = link.sent.length;
    sender.removePeer('p1');
    link.drain();
    expect(link.sent.length).toBe(count);
  });
});

// ---- Cache and sender together (review fixes) ------------------------------------------------------

// The real player cache wired to the real host sender through a synchronous in-memory link: what
// the cache requests reaches the sender, and everything the sender sends reaches the cache.
function wired(store) {
  const urls = { created: [], revoked: [] };
  const toPlayer = [];
  const link = {
    buffered: 0,
    send(data) {
      toPlayer.push(data);
      return true;
    },
    bufferedAmount: () => 0,
    on() {},
    off() {},
  };
  const sender = createAssetSender({
    protocolVersion: 0,
    getAsset: (id) => (store.has(id) ? { ...store.get(id) } : null),
    hasAsset: (id) => store.has(id),
    setTimer: () => 0,
    clearTimer: () => {},
  });
  sender.addPeer('p', link);
  const cache = createAssetCache({
    requestAssets: (ids) => sender.request('p', ids),
    createObjectURL: () => {
      const u = `blob:w/${urls.created.length + 1}`;
      urls.created.push(u);
      return u;
    },
    revokeObjectURL: (u) => urls.revoked.push(u),
  });
  // Deliver everything sent so far, and whatever that triggers, until the link is quiet.
  async function settle() {
    for (let round = 0; round < 200; round++) {
      await new Promise((r) => setTimeout(r, 0));
      if (!toPlayer.length) {
        await new Promise((r) => setTimeout(r, 0));
        if (!toPlayer.length) return;
      }
      const pending = [];
      for (const data of toPlayer.splice(0)) {
        const parsed = parseChannelMessage(data);
        const m = parsed.message;
        if (m.type === 'asset-meta') cache.handleMeta(m.asset);
        else if (m.type === 'asset-abort') cache.handleAbort(m);
        else if (m.type === 'asset-chunk') pending.push(cache.handleChunk(m));
      }
      await Promise.all(pending.filter(Boolean));
    }
    throw new Error('link never went quiet');
  }
  return { cache, sender, urls, settle };
}

const bgSnap = (asset, tokens = []) => ({ map: { width: 100, height: 80 }, background: asset ? { assetId: asset.assetId, revision: 1 } : null, tokens });

describe('recurring backgrounds (review blocker)', () => {
  it('A -> B -> A -> B -> A -> B -> A: every recurrence of the same id is requested, served and shown as current', async () => {
    const A = await makeAsset(CHUNK_BYTES * 3 + 11, { seed: 1 });
    const B = await makeAsset(CHUNK_BYTES * 2 + 5, { seed: 2 });
    const A2 = await makeAsset(CHUNK_BYTES * 3 + 11, { seed: 1 });
    expect(A2.assetId).toBe(A.assetId); // identical bytes, identical id: the recurrence is real
    const store = new Map();
    const { cache, sender, urls, settle } = wired(store);
    const sequence = [A, B, A, B, A, B, A];
    for (const [step, current] of sequence.entries()) {
      // The host's background changes: only the current one is on the host.
      store.clear();
      store.set(current.assetId, current);
      sender.assetsChanged();
      cache.sync(bgSnap(current));
      await settle();
      const shown = cache.backgroundFor(bgSnap(current));
      expect(shown, `step ${step}`).toEqual({ url: expect.stringMatching(/^blob:/), assetId: current.assetId, current: true });
      expect(cache.status(current.assetId)).toBe('ready');
      // Time passes before the next fog change: the replaced background is released, so the next
      // recurrence of its id really has to be requested and sent again.
      await settle();
      if (step > 0) expect(urls.revoked).toHaveLength(step);
    }
    // The host served every legitimate recurrence; nothing was refused or failed.
    expect(sender.diagnostics()).toMatchObject({ sent: 7, refused: 0 });
    expect(cache.stats()).toMatchObject({ received: 7, failed: 0, waiting: 0 });
  });

  it('a recurrence after a mid-transfer supersession is still served', async () => {
    const A = await makeAsset(CHUNK_BYTES * 30, { seed: 1 });
    const B = await makeAsset(CHUNK_BYTES * 2, { seed: 2 });
    const store = new Map([[A.assetId, A]]);
    const { cache, sender, settle } = wired(store);
    // A starts; before it can finish, the host replaces it with B (latest wins).
    cache.sync(bgSnap(A));
    store.clear();
    store.set(B.assetId, B);
    sender.assetsChanged();
    await settle();
    cache.sync(bgSnap(B));
    await settle();
    expect(cache.backgroundFor(bgSnap(B))).toMatchObject({ assetId: B.assetId, current: true });
    // Later the fog goes back to A's state.
    store.clear();
    store.set(A.assetId, A);
    sender.assetsChanged();
    cache.sync(bgSnap(A));
    await settle();
    expect(cache.backgroundFor(bgSnap(A))).toMatchObject({ assetId: A.assetId, current: true });
  });

  it('never shows an older background once the current one has failed', async () => {
    const A = await makeAsset(20000, { seed: 1 });
    const B = await makeAsset(20000, { seed: 2 });
    const forgedB = { ...B, bytes: B.bytes.map((b, i) => (i === 100 ? b ^ 1 : b)) }; // fails the hash
    const store = new Map([[A.assetId, A]]);
    const { cache, sender, urls, settle } = wired(store);
    cache.sync(bgSnap(A));
    await settle();
    expect(cache.backgroundFor(bgSnap(A))).toMatchObject({ assetId: A.assetId, current: true });
    store.clear();
    store.set(B.assetId, forgedB);
    sender.assetsChanged();
    cache.sync(bgSnap(B));
    await settle();
    expect(cache.status(B.assetId)).toBe('failed');
    expect(cache.backgroundFor(bgSnap(B))).toBeNull(); // not A
    await Promise.resolve();
    expect(urls.revoked).toEqual([urls.created[0]]); // A's pixels are released, not kept for display
  });

  it('keeps the previous background only while the current one is still loading', async () => {
    const A = await makeAsset(20000, { seed: 1 });
    const B = await makeAsset(20000, { seed: 2 });
    const store = new Map([[A.assetId, A]]);
    const { cache, sender, settle } = wired(store);
    cache.sync(bgSnap(A));
    await settle();
    cache.backgroundFor(bgSnap(A));
    store.clear();
    store.set(B.assetId, B);
    sender.assetsChanged();
    cache.sync(bgSnap(B)); // requested, not delivered yet
    expect(cache.status(B.assetId)).toBe('loading');
    expect(cache.backgroundFor(bgSnap(B))).toMatchObject({ assetId: A.assetId, current: false });
    await settle();
    expect(cache.backgroundFor(bgSnap(B))).toMatchObject({ assetId: B.assetId, current: true });
  });
});

describe('request batching (review fix)', () => {
  it('70 referenced assets: at most 64 outstanding, the rest requested as answers arrive, all ready', async () => {
    const assets = await Promise.all(Array.from({ length: 70 }, (_, i) => makeAsset(600 + i, { kind: 'token', seed: i + 100 })));
    const store = new Map(assets.map((a) => [a.assetId, a]));
    const { cache, sender, settle } = wired(store);
    const requests = [];
    const request = sender.request.bind(sender);
    sender.request = (id, ids) => {
      requests.push(ids.length);
      request(id, ids);
    };
    const snapshot = bgSnap(null, assets.map((a, i) => ({ id: `t${i}`, assetId: a.assetId })));
    const first = cache.sync(snapshot);
    expect(first).toHaveLength(MAX_REQUEST_IDS);
    expect(cache.stats().waiting).toBeLessThanOrEqual(MAX_REQUEST_IDS);
    await settle();
    expect(requests[0]).toBe(MAX_REQUEST_IDS);
    expect(requests.reduce((a, b) => a + b, 0)).toBe(70); // each id asked for exactly once
    for (const a of assets) expect(cache.status(a.assetId)).toBe('ready');
    expect(cache.stats()).toMatchObject({ received: 70, waiting: 0, failed: 0 });
    expect(sender.diagnostics()).toMatchObject({ queueFull: 0, refused: 0 });
  });
});
