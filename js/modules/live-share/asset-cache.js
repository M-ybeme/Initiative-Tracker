/**
 * Live Share Milestone 3: the player's session-scoped asset cache (planning doc §15.4, §15.5).
 *
 * Possession model: the player's cache is the only record of what the player holds. Each applied
 * snapshot is passed to sync(): every asset id it references (the background, custom token art)
 * that is neither cached nor on its way is requested. The host sends nothing it wasn't asked for,
 * so an asset already here is never transferred again, whether it is referenced by one token or
 * twenty, in one snapshot or the next hundred. An asset that was released (a replaced background)
 * and is referenced again later (the same fog state back: identical bytes, the same id) is simply
 * requested again: only unfinished attempts count towards the retry limit, never deliveries.
 *
 * A background the host aborts as `superseded` (replaced while it was being sent) is not asked for
 * again until a newer snapshot references it: the snapshot that replaced it is on its way, and
 * asking before it arrives would only be answered `unavailable`. A newer snapshot reflects the
 * host's current state, so if it references the same id again (identical fog back), it is asked
 * for afresh.
 *
 * At most MAX_REQUEST_IDS ids are outstanding (asked for, not yet answered) at a time, one
 * asset-request's worth, which also keeps the host's queue bounded. The rest stay eligible: the
 * cache syncs again against the latest snapshot whenever an answer comes in (asset ready, failed
 * or aborted), until everything referenced has arrived, failed, is on its way, or was superseded
 * (waiting for a newer snapshot).
 *
 * Reassembly is untrusted input handling: metadata is accepted only for an id this player asked
 * for; chunks only for a transfer in progress, at a valid index, of exactly the expected length; a
 * repeated identical chunk is ignored, a different one fails the transfer. When every chunk is in,
 * the bytes must carry the claimed image signature and hash to the asset id before a Blob and an
 * object URL are made from them. Buffers are sized from validated metadata and bounded in number.
 *
 * Object URLs live only in memory for this session: a background no longer shown is revoked, and
 * dispose() revokes everything (Leave, session end). Nothing is stored in IndexedDB or localStorage.
 */
import { CHUNK_BYTES, MAX_REQUEST_IDS, matchesMime, sha256Hex } from './asset-protocol.js';

export const MAX_ACTIVE_TRANSFERS = 4;
export const MAX_IN_FLIGHT_BYTES = 32 * 1024 * 1024;
// Unfinished attempts (aborted or answered with nothing) in a row before an id counts as failed.
// Completed deliveries never count: a content-addressed asset may legitimately come back any
// number of times.
export const MAX_REQUESTS_PER_ASSET = 3;

export function createAssetCache({
  requestAssets,
  onReady = () => {},
  subtle = globalThis.crypto && globalThis.crypto.subtle,
  createObjectURL = (blob) => URL.createObjectURL(blob),
  revokeObjectURL = (url) => URL.revokeObjectURL(url),
}) {
  const cache = new Map(); // assetId -> { assetId, kind, mime, width, height, byteLength, url }
  const waiting = new Set(); // asked for, no metadata or abort yet
  const tries = new Map(); // assetId -> unfinished attempts since it was last delivered
  const transfers = new Map(); // assetId -> { meta, buffer, got: Uint8Array, gotCount }
  const verifying = new Set(); // every chunk in, signature and hash being checked
  const failed = new Map(); // assetId -> reason
  const superseded = new Set(); // replaced on the host: not asked for again until a newer snapshot
  let displayedBackground = null; // { assetId, url, width, height } of the map it was drawn for
  let latest = null; // the last snapshot synced, so the rest can be requested as answers come in
  let disposed = false;
  const stats = {
    requested: 0,
    requestMessages: 0,
    received: 0,
    cached: 0,
    deduplicated: 0, // references satisfied from the cache without a transfer
    failed: 0,
    rejected: 0, // messages refused (unrequested, unknown, malformed, conflicting)
    aborted: 0,
    bytesReceived: 0,
    revoked: 0,
  };

  const referencedIds = (snapshot) => {
    const ids = [];
    if (snapshot.background) ids.push(snapshot.background.assetId);
    for (const t of snapshot.tokens) if (t.assetId && !ids.includes(t.assetId)) ids.push(t.assetId);
    return ids;
  };

  // An answer came in: ask for whatever else the latest snapshot still needs (the next batch).
  function resync() {
    if (latest && !disposed) Promise.resolve().then(() => api.sync(latest, { internal: true }));
  }

  function fail(assetId, reason) {
    transfers.delete(assetId);
    waiting.delete(assetId);
    failed.set(assetId, reason);
    stats.failed += 1;
    resync();
  }

  async function complete(assetId, transfer) {
    transfers.delete(assetId);
    verifying.add(assetId); // still on its way: not to be asked for again meanwhile
    const { meta, buffer } = transfer;
    let hash = null;
    if (matchesMime(buffer, meta.mime)) {
      try {
        hash = await sha256Hex(buffer, subtle);
      } catch {}
    }
    verifying.delete(assetId);
    if (hash === null) return fail(assetId, matchesMime(buffer, meta.mime) ? 'could not hash' : 'not the claimed image type');
    if (hash !== assetId) return fail(assetId, 'hash mismatch');
    if (disposed) return;
    const url = createObjectURL(new Blob([buffer], { type: meta.mime }));
    tries.delete(assetId); // delivered: a later reference to the same id starts afresh
    cache.set(assetId, { assetId, kind: meta.kind, mime: meta.mime, width: meta.width, height: meta.height, byteLength: meta.byteLength, url });
    stats.received += 1;
    stats.cached = cache.size;
    onReady(assetId);
    resync();
  }

  const api = {
    /**
     * Request the assets `snapshot` references that are neither here nor on their way, keeping at
     * most MAX_REQUEST_IDS outstanding; the rest follow as answers come in.
     */
    sync(snapshot, { internal = false } = {}) {
      if (disposed) return [];
      if (!internal) {
        latest = snapshot;
        superseded.clear(); // a newer snapshot: whatever it references is current on the host
      } else if (snapshot !== latest) return []; // a newer snapshot has taken over
      const ids = referencedIds(snapshot);
      if (!internal) {
        // An id no longer referenced (e.g. a background replaced mid-transfer) starts afresh if it
        // comes back: its unfinished attempts, and a "not delivered" failure from them, are forgotten.
        const referenced = new Set(ids);
        for (const id of [...tries.keys()]) if (!referenced.has(id)) tries.delete(id);
        for (const [id, reason] of [...failed]) if (reason === 'not delivered' && !referenced.has(id)) failed.delete(id);
      }
      const missing = [];
      for (const id of ids) {
        if (cache.has(id)) {
          if (!internal) stats.deduplicated += 1;
          continue;
        }
        if (transfers.has(id) || verifying.has(id) || waiting.has(id) || failed.has(id) || superseded.has(id)) continue;
        if ((tries.get(id) || 0) >= MAX_REQUESTS_PER_ASSET) {
          failed.set(id, 'not delivered');
          stats.failed += 1;
          continue;
        }
        if (waiting.size + missing.length >= MAX_REQUEST_IDS) break; // the rest in a later batch
        missing.push(id);
      }
      if (missing.length) {
        for (const id of missing) {
          waiting.add(id);
          tries.set(id, (tries.get(id) || 0) + 1);
        }
        stats.requested += missing.length;
        stats.requestMessages += 1;
        requestAssets(missing);
      }
      return missing;
    },

    handleMeta(meta) {
      if (disposed) return;
      const id = meta.assetId;
      if (cache.has(id)) {
        stats.deduplicated += 1; // e.g. a duplicate answer; nothing to do
        return;
      }
      const existing = transfers.get(id);
      if (existing) {
        if (JSON.stringify(existing.meta) !== JSON.stringify(meta)) {
          stats.rejected += 1;
          fail(id, 'conflicting metadata');
        }
        return;
      }
      if (!waiting.has(id)) {
        stats.rejected += 1; // never asked for: not accepted
        return;
      }
      waiting.delete(id);
      let inFlight = 0;
      for (const t of transfers.values()) inFlight += t.meta.byteLength;
      if (transfers.size >= MAX_ACTIVE_TRANSFERS || inFlight + meta.byteLength > MAX_IN_FLIGHT_BYTES) {
        stats.rejected += 1;
        return fail(id, 'too many transfers at once');
      }
      transfers.set(id, { meta, buffer: new Uint8Array(meta.byteLength), got: new Uint8Array(meta.chunkCount), gotCount: 0 });
    },

    /** Returns a promise when this chunk completed the asset (resolves once it is cached or failed). */
    handleChunk({ assetId, index, payload }) {
      if (disposed) return null;
      const transfer = transfers.get(assetId);
      if (!transfer) {
        stats.rejected += 1; // no metadata, finished, failed or unknown
        return null;
      }
      const { meta } = transfer;
      if (index >= meta.chunkCount) {
        stats.rejected += 1;
        fail(assetId, 'chunk index out of range');
        return null;
      }
      const expected = index < meta.chunkCount - 1 ? CHUNK_BYTES : meta.byteLength - CHUNK_BYTES * (meta.chunkCount - 1);
      if (payload.length !== expected) {
        stats.rejected += 1;
        fail(assetId, 'chunk length mismatch');
        return null;
      }
      const offset = index * CHUNK_BYTES;
      if (transfer.got[index]) {
        // A duplicate: harmless if identical, a failure if not.
        for (let i = 0; i < payload.length; i++) {
          if (transfer.buffer[offset + i] !== payload[i]) {
            stats.rejected += 1;
            fail(assetId, 'conflicting duplicate chunk');
            return null;
          }
        }
        return null;
      }
      transfer.buffer.set(payload, offset);
      transfer.got[index] = 1;
      transfer.gotCount += 1;
      stats.bytesReceived += payload.length;
      return transfer.gotCount === meta.chunkCount ? complete(assetId, transfer) : null;
    },

    handleAbort({ assetId, reason }) {
      if (!transfers.has(assetId) && !waiting.has(assetId)) return;
      stats.aborted += 1;
      transfers.delete(assetId);
      waiting.delete(assetId);
      if (reason === 'limit') return fail(assetId, 'refused by host');
      // Superseded: replaced on the host; asked for again only if a newer snapshot references it.
      // Unavailable: forgotten; if the latest snapshot still references it, it is asked for again,
      // at most MAX_REQUESTS_PER_ASSET unfinished attempts in a row.
      if (reason === 'superseded') superseded.add(assetId);
      resync();
    },

    /**
     * 'ready', 'failed', or 'loading' (asked for, arriving, being verified, waiting for its turn, or
     * superseded and waiting for a newer snapshot).
     */
    status(assetId) {
      if (cache.has(assetId)) return 'ready';
      if (failed.has(assetId)) return 'failed';
      return 'loading';
    },

    /** The object URL for a cached asset, or null. */
    url(assetId) {
      const entry = assetId ? cache.get(assetId) : null;
      return entry ? entry.url : null;
    },

    /**
     * The background to draw for `snapshot`: its own if cached. While its own is still loading, the
     * last one shown stays up (no flash of the placeholder when the fog changes), marked
     * current:false, as long as the map size is unchanged. Once its own has failed: nothing. An
     * older background, possibly with less fog, is never shown in its place. Backgrounds that are
     * no longer shown are revoked.
     */
    backgroundFor(snapshot) {
      if (disposed || !snapshot.background) return null;
      const targetId = snapshot.background.assetId;
      const target = cache.get(targetId);
      const releaseAllBut = (keep) => {
        const others = [...cache.values()].filter((e) => e.kind === 'background' && e.assetId !== keep).map((e) => e.assetId);
        if (others.length) Promise.resolve().then(() => others.forEach((id) => api.releaseBackground(id)));
      };
      if (target) {
        // Every other background (the one shown before, or one that arrived already out of date)
        // can go once the new one replaces it in this render.
        releaseAllBut(targetId);
        displayedBackground = { assetId: target.assetId, url: target.url, width: snapshot.map.width, height: snapshot.map.height };
        return { url: target.url, assetId: target.assetId, current: true };
      }
      if (failed.has(targetId)) {
        displayedBackground = null;
        releaseAllBut(null);
        return null;
      }
      if (displayedBackground && displayedBackground.width === snapshot.map.width && displayedBackground.height === snapshot.map.height && cache.has(displayedBackground.assetId)) {
        return { url: displayedBackground.url, assetId: displayedBackground.assetId, current: false };
      }
      return null;
    },

    releaseBackground(assetId) {
      const entry = cache.get(assetId);
      if (!entry || entry.kind !== 'background' || (displayedBackground && displayedBackground.assetId === assetId)) return;
      // Referenced again by the latest snapshot (the same background back) since release was scheduled.
      if (latest && latest.background && latest.background.assetId === assetId) return;
      cache.delete(assetId);
      revokeObjectURL(entry.url);
      stats.revoked += 1;
      stats.cached = cache.size;
    },

    /** Release every object URL and forget everything (Leave, session end). */
    dispose() {
      disposed = true;
      for (const entry of cache.values()) {
        revokeObjectURL(entry.url);
        stats.revoked += 1;
      }
      cache.clear();
      transfers.clear();
      verifying.clear();
      waiting.clear();
      superseded.clear();
      displayedBackground = null;
      latest = null;
      stats.cached = 0;
    },

    stats: () => ({ ...stats, activeTransfers: transfers.size, waiting: waiting.size, failedIds: failed.size }),
  };
  return api;
}
