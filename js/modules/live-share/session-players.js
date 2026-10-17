/**
 * Live Share Milestone 5B.2: the session host's players. Admission enforced on real peers.
 *
 * The session host page (js/live-share-host.js) creates one of these per started session. It owns:
 *   - the session's one admission model (admission.js): seats, password, lock, credentials. In this
 *     page's memory only; nothing is persisted (host refresh is Milestone 7).
 *   - every player link whose data channel is open: peerId -> { link, closing, ... }, at most
 *     MAX_PLAYER_LINKS (the relay's room size).
 *   - one snapshot sender and one asset sender, which keep independent per-peer state (each peer's
 *     own backpressure flag, asset queue and transfer), so one slow player holds back nobody else.
 *
 * A WebRTC connection is not authorization:
 *   - A peer starts UNADMITTED when its channel opens and is sent only the sanitized admission state.
 *   - It joins with a protocol-v1 join-request / rejoin-request, decided by requestAdmission alone.
 *   - Only once admitted is it added to the senders, which send it the current committed publication
 *     at once (after its join-result, on the same ordered channel).
 *   - Every message to a peer, from any sender, goes through one function, send(), which asks the
 *     admission gate (admission-gate.js) with the peer's state derived from the model at that moment
 *     (admittedSeat), never a cached flag. A send without a known type is refused. The senders get a
 *     gated stand-in for the link, never the link itself.
 *   - Every message from a peer is parsed as protocol v1 (anything else, v0 included, is dropped) and
 *     acted on only if the gate accepts its type in the peer's current state.
 *
 * Leaving is not losing the connection:
 *   - leave (a player's message): the seat is released (available again), the credential dies, the
 *     player is told 'left' and its link closed.
 *   - an unexpected close: the seat stays claimed-disconnected, its credential valid for a reclaim.
 *     No timer, no grace period, no automatic reconnect (Milestone 7).
 *
 * DM actions (kick, reset, disable, password, lock, seats) go through the model; whoever it says
 * must go is sent session-ended with the model's reason, dropped from the senders at once and closed
 * after CLOSE_GRACE_MS (time for the message to arrive; the player closes on it). While closing, a
 * peer's messages are ignored. Unadmitted peers are sent the new admission state when it changes.
 *
 * Session state (5B.3): an admitted player is told whether a Battle Map is shared at all
 * (session-state, right after its join-result, and again whenever that changes), so its page can say
 * "the DM isn't sharing a map yet" instead of loading forever. Admitted players only, like the map.
 */
import { createAdmissionModel } from './admission.js';
import { createAttemptLimiter } from './admission-throttle.js';
import { maySend, mayAccept } from './admission-gate.js';
import { PROTOCOL_V1, encode, parsePlayerMessage, admissionRequestOf, encodeAdmissionState, encodeJoinResult, encodeSessionEnded } from './protocol-v1.js';
import { createSnapshotSender } from './snapshot-sender.js';
import { createAssetSender } from './asset-sender.js';

// The most player links one session keeps: the relay's room size (relay/room-core.mjs
// RELAY_LIMITS.maxPeersPerRoom; a unit test checks they agree). The host enforces it too, so a
// misconfigured relay can't make it keep more.
export const MAX_PLAYER_LINKS = 8;
// Messages a peer may send per window before the rest are dropped unread (admission requests have
// their own, tighter limits in the model; asset requests are bounded by the asset sender's queue).
export const INBOUND_LIMIT = Object.freeze({ limit: 100, windowMs: 10000 });
// How long a removed player's link stays open for its session-ended to arrive.
export const CLOSE_GRACE_MS = 1000;

/**
 * @param {object} options
 * @param {() => object|null} options.getSnapshot    the committed Battle Map snapshot (publication store)
 * @param {(id: string) => object|null} options.getAsset   a committed asset (never a pending one)
 * @param {(id: string) => boolean} options.hasAsset
 * @param {() => void} [options.onChange]            seats, admission or links changed
 * @param {object} [options.admission]               for tests; one fresh model per session otherwise
 */
export function createSessionPlayers({
  getSnapshot,
  getAsset,
  hasAsset,
  onChange = () => {},
  admission = createAdmissionModel(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (t) => clearTimeout(t),
  snapshotOptions = {},
  assetOptions = {},
  now,
} = {}) {
  const peers = new Map(); // peerId -> { id, link, closing, closeTimer, lastAdmissionText, off }
  const inbound = createAttemptLimiter({ ...INBOUND_LIMIT, maxKeys: MAX_PLAYER_LINKS * 2, ...(now ? { now } : {}) });
  let ended = false;
  const stats = {
    linksRefused: 0,
    sendsBlocked: 0, // a send the gate refused (should stay 0: nothing asks out of turn)
    messagesDropped: 0, // over the inbound rate
    protocolErrors: 0,
    lastProtocolError: null, // fixed strings only, never a peer's text
    messagesRefused: 0, // valid, but not allowed in the peer's state
    lastRefused: null,
  };

  const stateOf = (peerId) => (admission.admittedSeat(peerId) !== null ? 'admitted' : 'unadmitted');

  // The one way anything reaches a player.
  function send(peer, type, data) {
    if (peers.get(peer.id) !== peer || !maySend(stateOf(peer.id), type)) {
      stats.sendsBlocked += 1;
      return false;
    }
    return peer.link.send(data);
  }

  // What the senders get instead of the link: every send names its type and is gated.
  const gated = (peer) => ({
    send: (data, type) => send(peer, type, data),
    bufferedAmount: () => peer.link.bufferedAmount(),
    on: (type, fn) => peer.link.on(type, fn),
    off: (type, fn) => peer.link.off(type, fn),
  });

  // Whether a Battle Map publication is committed, as the admitted players were last told.
  let mapShared = null;
  const sessionState = () => encode('session-state', { surfaces: [{ surface: 'battle-map', available: !!getSnapshot() }] });

  const snapshots = createSnapshotSender({ getSnapshot, setTimer, clearTimer, ...snapshotOptions });
  const assets = createAssetSender({ protocolVersion: PROTOCOL_V1, getAsset, hasAsset, setTimer, clearTimer, ...assetOptions });

  function sendAdmissionState(peer, encoded) {
    if (peer.closing || stateOf(peer.id) !== 'unadmitted' || peer.lastAdmissionText === encoded.text) return;
    if (send(peer, 'admission-state', encoded.text)) peer.lastAdmissionText = encoded.text;
  }

  // Every waiting peer learns of a change in seats, lock or password requirement.
  function refreshAdmissionState() {
    if (ended) return;
    const encoded = encodeAdmissionState(admission.admissionState());
    if (!encoded.ok) return;
    for (const peer of [...peers.values()]) sendAdmissionState(peer, encoded);
  }

  // A peer the model removed (or that left): no more gameplay traffic, told why, then closed.
  function disconnect(peer, reason) {
    if (peer.closing) return;
    peer.closing = true;
    snapshots.removePeer(peer.id);
    assets.removePeer(peer.id);
    if (reason) {
      const encoded = encodeSessionEnded(reason);
      if (encoded.ok) send(peer, 'session-ended', encoded.text);
    }
    peer.closeTimer = setTimer(() => {
      peer.closeTimer = null;
      peer.link.close();
    }, CLOSE_GRACE_MS);
  }

  function enforce(effects) {
    for (const { peerId, reason } of (effects && effects.disconnect) || []) {
      const peer = peers.get(peerId);
      if (peer) disconnect(peer, reason);
    }
  }

  function handleAdmission(peer, message) {
    const result = admission.requestAdmission(peer.id, admissionRequestOf(message));
    const encoded = encodeJoinResult(result);
    if (encoded.ok) send(peer, 'join-result', encoded.text);
    if (!result.ok) return;
    enforce(result.effects);
    // Admitted: told whether a map is shared, then the senders serve it the current publication.
    const status = sessionState();
    if (status.ok) send(peer, 'session-state', status.text);
    peer.lastAdmissionText = null;
    snapshots.addPeer(peer.id, gated(peer));
    assets.addPeer(peer.id, gated(peer));
    refreshAdmissionState(); // that seat is no longer available to the others
  }

  function handleLeave(peer) {
    if (stateOf(peer.id) === 'admitted') enforce(admission.peerLeft(peer.id));
    else disconnect(peer, null);
    refreshAdmissionState();
  }

  function receive(peer, data) {
    if (peers.get(peer.id) !== peer || peer.closing || ended) return;
    if (!inbound.allowed(peer.id)) {
      stats.messagesDropped += 1;
      return;
    }
    inbound.record(peer.id);
    const parsed = parsePlayerMessage(data);
    if (!parsed.ok) {
      stats.protocolErrors += 1;
      stats.lastProtocolError = parsed.error;
      return;
    }
    const { message } = parsed;
    const state = stateOf(peer.id);
    if (!mayAccept(state, message.type)) {
      stats.messagesRefused += 1;
      stats.lastRefused = `${message.type} while ${state}`;
      return;
    }
    // Only admission changes are news to the page (an asset request is not: the DM's seat list must not
    // be rebuilt under the pointer for every request during a transfer).
    if (message.type === 'asset-request') return assets.request(peer.id, message.assetIds);
    if (message.type === 'join-request' || message.type === 'rejoin-request') handleAdmission(peer, message);
    else if (message.type === 'leave') handleLeave(peer);
    onChange();
  }

  // A DM action: the model decides, whoever it removes is disconnected, waiting peers are updated.
  const dmAction =
    (fn) =>
    (...args) => {
      const result = fn(...args);
      if (result && result.disconnect) enforce(result);
      refreshAdmissionState();
      onChange();
      return result;
    };

  return {
    /** A player's data channel opened: it is registered unadmitted and sent the admission state. */
    attach(peerId, link) {
      if (ended || peers.has(peerId) || peers.size >= MAX_PLAYER_LINKS) {
        stats.linksRefused += 1;
        link.close();
        return false;
      }
      const peer = { id: peerId, link, closing: false, closeTimer: null, lastAdmissionText: null, off: null };
      const onMessage = ({ data }) => receive(peer, data);
      link.on('message', onMessage);
      peer.off = () => link.off('message', onMessage);
      peers.set(peerId, peer);
      const encoded = encodeAdmissionState(admission.admissionState());
      if (encoded.ok) sendAdmissionState(peer, encoded);
      onChange();
      return true;
    },

    /**
     * The player's link closed or it left the relay. If it was admitted and nothing removed it first,
     * its seat stays claimed-disconnected (reclaimable with its credential).
     */
    detach(peerId) {
      const peer = peers.get(peerId);
      if (!peer) return;
      peers.delete(peerId);
      peer.off();
      if (peer.closeTimer !== null) clearTimer(peer.closeTimer);
      snapshots.removePeer(peerId);
      assets.removePeer(peerId);
      inbound.clear(peerId);
      if (!ended) admission.peerDisconnected(peerId);
      refreshAdmissionState();
      onChange();
    },

    /** The host committed a new publication: admitted players get it now, and stale transfers end. */
    committed() {
      if (ended) return;
      const shared = !!getSnapshot();
      if (shared !== mapShared) {
        mapShared = shared;
        const status = sessionState();
        for (const peer of [...peers.values()]) if (status.ok && !peer.closing && stateOf(peer.id) === 'admitted') send(peer, 'session-state', status.text);
      }
      snapshots.sendNow();
      assets.assetsChanged();
    },

    // ---- DM actions (each throws on bad input, as the model does) -----------------------------------
    createSeat: dmAction((name) => admission.createSeat(name)),
    renameSeat: dmAction((seatId, name) => admission.renameSeat(seatId, name)),
    enableSeat: dmAction((seatId) => admission.enableSeat(seatId)),
    disableSeat: dmAction((seatId) => admission.disableSeat(seatId)),
    kickSeat: dmAction((seatId) => admission.kickSeat(seatId)),
    resetSeat: dmAction((seatId) => admission.resetSeat(seatId)),
    setPassword: dmAction((value) => admission.setPassword(value)),
    setLocked: dmAction((value) => admission.setLocked(value)),

    /**
     * The session ends: every open link (admitted or not) is told 'ended', the model discards every
     * seat, credential and password, and the senders stop. The caller closes the links (HostSession).
     */
    end() {
      if (ended) return;
      admission.endSession();
      ended = true;
      const encoded = encodeSessionEnded('ended');
      for (const peer of [...peers.values()]) {
        snapshots.removePeer(peer.id);
        assets.removePeer(peer.id);
        if (!peer.closing && encoded.ok) send(peer, 'session-ended', encoded.text);
        peer.off();
        if (peer.closeTimer !== null) clearTimer(peer.closeTimer);
      }
      peers.clear();
      snapshots.dispose();
      assets.dispose();
      onChange();
    },

    get ended() {
      return ended;
    },

    /** The DM's seat list (admission.js seats(): no credentials, no password). */
    seats: () => admission.seats(),
    admissionState: () => admission.admissionState(),
    /** Open links, and how many of them are admitted players (the player count surfaces see). */
    counts() {
      let admitted = 0;
      for (const id of peers.keys()) if (stateOf(id) === 'admitted') admitted += 1;
      return { links: peers.size, admitted, waiting: peers.size - admitted };
    },
    /** 'admitted' | 'unadmitted' | null (no such open link). */
    peerState: (peerId) => (peers.has(peerId) ? stateOf(peerId) : null),

    /** Counts and states only: never a credential, the password or message content. */
    diagnostics() {
      return { ...this.counts(), ...stats, admission: admission.diagnostics(), snapshots: snapshots.diagnostics(), assets: assets.diagnostics() };
    },
  };
}
