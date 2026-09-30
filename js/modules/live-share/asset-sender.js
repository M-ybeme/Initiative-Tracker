/**
 * Live Share Milestone 3: the host's asset sender. It sends a player-visible asset only when that
 * player asks for it (asset-request): the player's cache decides what is missing, so an asset it
 * already holds is never sent again (planning doc §15.4).
 *
 * Assets come from the Battle Map seam by id (`getAsset(id)` / `hasAsset(id)`): encoded bytes that
 * are already player-safe. This file never sees map images, fog or token image sources.
 *
 * Per player: one transfer at a time (metadata, then 16 KiB binary chunks), then the next request.
 *
 * Priority over structured snapshots, on the one existing data channel: chunks are only sent while
 * the channel holds less than ASSET_BUFFER_BUDGET_BYTES (40 KiB). With one 16 KiB chunk on top that
 * stays below the snapshot sender's 64 KiB "busy" level, so a snapshot is always sent at once and
 * waits behind at most ~56 KiB of chunks. When the budget is used up the transfer pauses until the
 * channel drains (bufferedamountlow at 16 KiB), with a short timer as a fallback. Only the chunk
 * being sent is ever materialized; the asset's bytes are sliced as the transfer goes.
 *
 * Latest background wins: before each chunk the sender checks the asset still exists on the host.
 * A background that was replaced (fog changed) is aborted as `superseded`; the player then asks for
 * the new one, which the next snapshot references. Unknown ids are answered `unavailable`.
 *
 * Loop guard: a player gets at most MAX_SENDS_PER_ASSET complete sends of an asset while that asset
 * stays on the host. Once it leaves (a background replaced by another), its count is forgotten, so
 * the same content coming back later (identical fog, identical bytes, the same id) is served again.
 */
import { encodeAssetMeta, encodeAssetAbort, encodeAssetChunk, chunkCountFor, isAssetId, CHUNK_BYTES } from './asset-protocol.js';

export const ASSET_BUFFER_BUDGET_BYTES = 40 * 1024;
export const MAX_QUEUED_REQUESTS = 64;
// Complete sends per player of an asset that has stayed on the host all along: a player asking for
// more is looping. Counts are dropped when the asset leaves the host (see assetsChanged).
export const MAX_SENDS_PER_ASSET = 3;
const RESUME_POLL_MS = 100;

export function createAssetSender({
  protocolVersion,
  getAsset,
  hasAsset,
  budgetBytes = ASSET_BUFFER_BUDGET_BYTES,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (t) => clearTimeout(t),
}) {
  const peers = new Map(); // id -> { link, queue: [assetId], active, sends: Map, timer, offDrain }
  const stats = {
    requests: 0,
    requestedIds: 0,
    alreadyQueued: 0,
    sent: 0,
    bytesSent: 0,
    unavailable: 0,
    superseded: 0,
    refused: 0,
    queueFull: 0,
  };

  function abort(peer, assetId, reason) {
    peer.link.send(encodeAssetAbort(protocolVersion, assetId, reason));
  }

  function pump(peer) {
    if (peer.timer !== null) {
      clearTimer(peer.timer);
      peer.timer = null;
    }
    for (;;) {
      if (!peers.has(peer.id)) return;
      if (!peer.active) {
        const assetId = peer.queue.shift();
        if (!assetId) return;
        const asset = getAsset(assetId);
        if (!asset) {
          stats.unavailable += 1;
          abort(peer, assetId, 'unavailable');
          continue;
        }
        if (!peer.link.send(encodeAssetMeta(protocolVersion, asset))) return;
        peer.active = { asset, next: 0, count: chunkCountFor(asset.bytes.length) };
      }
      const { asset } = peer.active;
      if (!hasAsset(asset.assetId)) {
        // Replaced on the host (a newer background) while it was being sent.
        stats.superseded += 1;
        abort(peer, asset.assetId, 'superseded');
        peer.active = null;
        continue;
      }
      if (peer.link.bufferedAmount() >= budgetBytes) {
        // Wait for the channel to drain; the timer covers a browser that never fires the event.
        peer.timer = setTimer(() => pump(peer), RESUME_POLL_MS);
        return;
      }
      if (!peer.link.send(encodeAssetChunk(asset.assetId, peer.active.next, asset.bytes))) return;
      stats.bytesSent += Math.min(asset.bytes.length - peer.active.next * CHUNK_BYTES, CHUNK_BYTES);
      peer.active.next += 1;
      if (peer.active.next === peer.active.count) {
        stats.sent += 1;
        peer.sends.set(asset.assetId, (peer.sends.get(asset.assetId) || 0) + 1);
        peer.active = null;
      }
    }
  }

  return {
    addPeer(id, link) {
      if (peers.has(id)) this.removePeer(id);
      const peer = { id, link, queue: [], active: null, sends: new Map(), timer: null, offDrain: null };
      const onDrain = () => pump(peer);
      link.on('drain', onDrain);
      peer.offDrain = () => link.off('drain', onDrain);
      peers.set(id, peer);
    },

    removePeer(id) {
      const peer = peers.get(id);
      if (!peer) return;
      peers.delete(id);
      peer.offDrain();
      if (peer.timer !== null) clearTimer(peer.timer);
    },

    /** A validated asset-request from player `id`. */
    request(id, assetIds) {
      const peer = peers.get(id);
      if (!peer) return;
      stats.requests += 1;
      for (const assetId of assetIds) {
        if (!isAssetId(assetId)) continue;
        stats.requestedIds += 1;
        if ((peer.active && peer.active.asset.assetId === assetId) || peer.queue.includes(assetId)) {
          stats.alreadyQueued += 1;
          continue;
        }
        if ((peer.sends.get(assetId) || 0) >= MAX_SENDS_PER_ASSET) {
          stats.refused += 1;
          abort(peer, assetId, 'limit');
          continue;
        }
        if (peer.queue.length >= MAX_QUEUED_REQUESTS) {
          stats.queueFull += 1;
          abort(peer, assetId, 'limit');
          continue;
        }
        peer.queue.push(assetId);
      }
      pump(peer);
    },

    /** The host's assets changed (e.g. a new background): drop transfers of assets that are gone. */
    assetsChanged() {
      for (const peer of peers.values()) {
        // An asset the host no longer has can only come back as a new, legitimate use.
        for (const assetId of [...peer.sends.keys()]) if (!hasAsset(assetId)) peer.sends.delete(assetId);
        pump(peer);
      }
    },

    dispose() {
      for (const id of [...peers.keys()]) this.removePeer(id);
    },

    diagnostics() {
      let active = 0;
      let queued = 0;
      for (const peer of peers.values()) {
        if (peer.active) active += 1;
        queued += peer.queue.length;
      }
      return { ...stats, activeTransfers: active, queued };
    },
  };
}
