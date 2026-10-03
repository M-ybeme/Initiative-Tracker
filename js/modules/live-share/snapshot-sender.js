/**
 * Live Share Milestone 2: sends the Battle Map's whole player-safe snapshot to connected players.
 *
 * It knows nothing about the Battle Map: `getSnapshot()` is the Milestone 1 seam's
 * getPlayerSafeState(), and notifyChanged() is called from the seam's single "shareable state
 * changed" signal. It never reads or reshapes Battle Map state; the snapshot goes out exactly as the
 * seam produced it.
 *
 * Throttle (planning doc §14): at most one snapshot per SNAPSHOT_INTERVAL_MS (100 ms). The first
 * change after a quiet spell goes out on the next tick; changes during the interval collapse into one
 * send at its end. Nothing is queued: each send reads the seam at that moment, so it always carries
 * the latest state, and the last state of a burst is always sent. 100 ms keeps a dragged token
 * visibly live for players (≤10 updates/s, ~0.1 s behind) while a 60 fps drag costs a few KB per
 * tenth of a second instead of one message per frame. Sends are never made inside the Battle Map's
 * render (the seam signals from renderFrame): they always run on a later timer tick.
 *
 * A player that connects gets the current snapshot at once, outside the throttle.
 *
 * Event-driven sends (Milestone 5A.2, the hidden-tab spike's outcome B; docs/live-share-session-
 * host-architecture.md §9): sendNow() is for a caller that learns of a published change from an event
 * outside any render, such as the Live Share session host committing a surface's publication. If the
 * throttle allows (nothing sent in the last interval), it sends at once, in that event, instead of
 * waiting for a timer: a hidden tab runs timers about once a second, and Firefox delayed even a 0 ms
 * timer by ~0.5 s. Within the interval it coalesces exactly like notifyChanged(). A send whose timer is
 * already late (throttled past the interval) is released by the next sendNow() rather than waiting
 * for that timer. Same whole snapshot, same latest-wins and backpressure rules; only the scheduling
 * differs. notifyChanged() keeps its timer-only behavior for callers that signal from a render.
 *
 * Backpressure: before each send the channel's bufferedAmount is checked. Above
 * SNAPSHOT_BUSY_BYTES the peer is only marked pending (a flag, not a queue); when the channel's
 * `drain` fires, it gets the snapshot current at that moment. Intermediate states are dropped, which
 * whole-state snapshots make harmless. So at most one snapshot per peer is ever waiting, as a flag.
 *
 * Diagnostics are counts and revisions only, never snapshot content.
 */
import { encodeBattleMapSnapshot } from './protocol.js';

export const SNAPSHOT_INTERVAL_MS = 100;
// Hold snapshots back above this. Asset chunks (Milestone 3) never fill the channel past 40 KiB plus
// one 16 KiB chunk, so a snapshot is never held back because of an asset transfer (asset-sender.js).
export const SNAPSHOT_BUSY_BYTES = 64 * 1024;

/**
 * @param {object} options
 * @param {() => object|null} options.getSnapshot  the seam's current player-safe snapshot (with revision)
 * @param {number} [options.intervalMs]
 * @param {number} [options.busyBytes]            hold sends while more than this is buffered
 * @param {() => number} [options.now]
 * @param {Function} [options.setTimer]
 * @param {Function} [options.clearTimer]
 */
export function createSnapshotSender({
  getSnapshot,
  intervalMs = SNAPSHOT_INTERVAL_MS,
  busyBytes = SNAPSHOT_BUSY_BYTES,
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (t) => clearTimeout(t),
} = {}) {
  const peers = new Map(); // id -> { link, lastSentRevision, pending, offDrain }
  let timer = null;
  let lastFlushAt = -Infinity;
  const stats = {
    snapshotsSent: 0,
    lastSnapshotSentRevision: null,
    changesCoalesced: 0, // change signals folded into an already scheduled send
    snapshotSendThrottled: 0, // sends held back because a channel was busy
    snapshotsTooLarge: 0,
    snapshotErrors: 0,
  };

  // The current snapshot, encoded once for every peer. Null if the seam has none or it can't be sent.
  function current() {
    let snapshot;
    try {
      snapshot = getSnapshot();
    } catch {
      stats.snapshotErrors += 1;
      return null;
    }
    if (!snapshot) return null;
    const encoded = encodeBattleMapSnapshot(snapshot);
    if (!encoded.ok) {
      stats.snapshotsTooLarge += 1;
      return null;
    }
    return { revision: snapshot.revision, text: encoded.text };
  }

  function sendTo(peer, message) {
    if (!message || message.revision === peer.lastSentRevision) {
      peer.pending = false;
      return;
    }
    if (peer.link.bufferedAmount() > busyBytes) {
      if (!peer.pending) stats.snapshotSendThrottled += 1;
      peer.pending = true; // the drain handler sends whatever is current then
      return;
    }
    peer.pending = false;
    if (peer.link.send(message.text)) {
      peer.lastSentRevision = message.revision;
      stats.snapshotsSent += 1;
      stats.lastSnapshotSentRevision = message.revision;
    }
  }

  function flush() {
    timer = null;
    lastFlushAt = now();
    if (peers.size === 0) return;
    const message = current();
    for (const peer of peers.values()) sendTo(peer, message);
  }

  return {
    /** A player's channel opened: send it the current snapshot now, then keep it updated. */
    addPeer(id, link) {
      if (peers.has(id)) this.removePeer(id);
      const peer = { link, lastSentRevision: null, pending: false, offDrain: null };
      const onDrain = () => {
        if (peer.pending && peers.get(id) === peer) sendTo(peer, current());
      };
      link.on('drain', onDrain);
      peer.offDrain = () => link.off('drain', onDrain);
      peers.set(id, peer);
      sendTo(peer, current());
    },

    removePeer(id) {
      const peer = peers.get(id);
      if (!peer) return;
      peers.delete(id);
      peer.offDrain();
    },

    /**
     * Player-visible state changed, learned from an event outside any render (see the header).
     * If nothing was flushed in the last interval, flush now, in this call: every player is sent the
     * current snapshot, under the usual rules (a busy channel is only marked pending; a revision a
     * player already has is not resent; with no players nothing is sent). Otherwise coalesce into the
     * scheduled send, exactly like notifyChanged(). Returns nothing: whether bytes went out is the
     * senders' and channels' business, visible in diagnostics().
     */
    sendNow() {
      if (now() - lastFlushAt < intervalMs) {
        this.notifyChanged();
        return;
      }
      if (timer !== null) clearTimer(timer); // a throttled timer that is already late: flush instead
      flush();
    },

    /** Player-visible state changed. Schedules one throttled send of whatever is current then. */
    notifyChanged() {
      if (timer !== null) {
        stats.changesCoalesced += 1;
        return;
      }
      const wait = Math.max(0, lastFlushAt + intervalMs - now());
      timer = setTimer(flush, wait);
    },

    dispose() {
      if (timer !== null) clearTimer(timer);
      timer = null;
      for (const id of [...peers.keys()]) this.removePeer(id);
    },

    diagnostics() {
      let pending = 0;
      for (const peer of peers.values()) if (peer.pending) pending += 1;
      return { ...stats, peers: peers.size, pendingSnapshot: pending > 0, pendingPeers: pending, sendScheduled: timer !== null };
    },
  };
}
