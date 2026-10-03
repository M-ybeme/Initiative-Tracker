/**
 * Live Share Milestone 5B.1: the session host's room and admission model (planning doc §7-§9, §22).
 *
 * One model per Live Share session, held in the session host page's memory only: nothing is
 * persisted (host-refresh recovery is Milestone 7). The host is authoritative: every claim is decided
 * here, synchronously, one at a time, so two requests can never both win a seat. A WebRTC connection
 * is not authorization: a peer is admitted only by requestAdmission(). 5B.2 wires this into real peers;
 * until then nothing in the product uses it.
 *
 * Seats. Each seat has a stable internal id (not a secret, never authentication), a display name and
 * an enabled flag, and at most one claim: { peerId, credential, connected }. Every seat is in exactly
 * one of these states, derived from those fields (seatState()):
 *   'available'               enabled, no claim
 *   'claimed'                 claimed, its player connected (claim.connected)
 *   'claimed-disconnected'    claimed, its player's connection closed; the credential stays valid, so
 *                             the seat can be reclaimed with it (modeled here; a reconnecting client
 *                             is Milestone 7)
 *   'disabled'                not enabled; never claimed (disabling a claimed seat releases it)
 * A disabled seat never has a claim, and a connected claim's peer id is admitted to that seat only.
 *
 * Credentials (§8). On admission the seat gets a temporary seat-session credential: 32 random bytes
 * (crypto.getRandomValues), base64url, 43 characters, an opaque capability scoped to this session and
 * this seat. Not derived from anything: not the seat id or name, not the password, not a counter or
 * time. Valid only while that seat's claim holds it; kick, reset, disable and session end invalidate
 * it, every successful reclaim replaces it, and another session (another model) never knows it. Never
 * in diagnostics or admission state.
 *
 * Password (§9). Optional, DM-only, exact string comparison (no normalization), 1-128 UTF-16 code
 * units. Checked before any seat is claimed; a failure claims nothing. Changing or removing it affects
 * new admissions only. The lock is separate: a locked room refuses new claims even with the password.
 *
 * Every request, in this order: peer id well-formed -> peer not throttled (request and failure limits)
 * -> request well-formed -> session running. Then, for a NEW CLAIM (join-request), as §7 orders it:
 *   room failure limit not tripped -> room not locked -> password -> seat exists -> seat enabled ->
 *   seat available -> peer holds no seat -> claim + credential.
 * For a RECLAIM (rejoin-request, with a credential; allowed while locked, no password, and never held
 * back by the room failure limit):
 *   peer holds no seat -> credential is that seat's, in this session -> the seat is claimed-disconnected
 *   -> re-admit with a NEW credential (the presented one dies at once).
 * Milestone 5 rule: a seat whose player is still connected can't be reclaimed ('seat-unavailable';
 * nothing changes, no failure counted). Nothing in Milestone 5 needs a live seat taken over;
 * replacing a live connection, with liveness evidence and a grace period, is Milestone 7's to decide.
 * Failures count towards the per-peer failure limit: a bad password, an invalid credential, a malformed
 * request. Only a bad password also counts room-wide: the room limit exists to stop password guessing
 * across rotating peer ids, so a room without a password can't be throttled room-wide at all, and
 * credential guesses (256 bits) or malformed spam can't block anyone else's join or reclaim.
 *
 * Operations that remove a player return effects: { disconnect: [{ peerId, reason }] } for 5B.2 to
 * enforce (send session-ended with that reason, close the link). endSession lists the admitted peers;
 * 5B.2 also tells every unadmitted open link, which this model doesn't track.
 *
 * Decisions this module makes (recorded in ADR §6.3; the planning doc leaves them open):
 *   - kick and reset leave the seat in the same state (available, credential invalidated); they differ
 *     only in the reason the removed player is given ('kicked' / 'seat-reset'). A kick is not a ban:
 *     the player may join again unless the DM also locks the room, sets a password or disables the seat;
 *   - disabling a claimed seat releases it like a reset (reason 'seat-disabled');
 *   - a player who leaves releases its seat (reason 'left');
 *   - a peer holds one seat at a time ('already-admitted');
 *   - Milestone 5: only a claimed-disconnected seat can be reclaimed, and every successful reclaim
 *     rotates the credential, so a copied credential works at most once and an old one never comes
 *     back. (The cost, a player stranded if the result carrying the new credential is lost, matters
 *     once a reconnecting client exists: Milestone 7.)
 */
import { createAttemptLimiter } from './admission-throttle.js';

export const MAX_SEATS = 32; // a generous table; bounds memory and the admission-state message
export const MAX_SEAT_NAME = 40;
export const MAX_PASSWORD_LENGTH = 128;
export const CREDENTIAL_BYTES = 32;
export const CREDENTIAL_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SEAT_ID = /^s[1-9][0-9]{0,5}$/;
const PEER_ID = /^[A-Za-z0-9_-]{1,64}$/;

// Admission throttling (§9, §22). Per peer: 5 failures a minute, and 20 requests of any kind per 10 s
// (malformed spam included), which bounds the work one peer causes. Room-wide: 20 wrong passwords a
// minute, so rotating peer ids gets no more guesses. While the room limit is tripped new claims wait;
// a flood of wrong passwords can keep it tripped as long as the flood lasts, but reclaims with a valid
// credential still get in, and a room without a password is never room-throttled.
export const THROTTLE = Object.freeze({
  peerFailures: { limit: 5, windowMs: 60000 },
  roomFailures: { limit: 20, windowMs: 60000 },
  peerRequests: { limit: 20, windowMs: 10000 },
  maxTrackedPeers: 64,
});

export const isSeatId = (v) => typeof v === 'string' && SEAT_ID.test(v);
export const isCredential = (v) => typeof v === 'string' && CREDENTIAL_PATTERN.test(v);
export const isPasswordValue = (v) => typeof v === 'string' && v.length >= 1 && v.length <= MAX_PASSWORD_LENGTH;
const isPeerId = (v) => typeof v === 'string' && PEER_ID.test(v);
const isSeatName = (v) => typeof v === 'string' && v.trim().length >= 1 && v.length <= MAX_SEAT_NAME;

/** A fresh seat-session credential: 256 random bits, base64url. */
export function generateCredential(cryptoObj = globalThis.crypto) {
  const bytes = new Uint8Array(CREDENTIAL_BYTES);
  cryptoObj.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Same result for equal strings; the time doesn't depend on where they first differ.
function sameString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function seatState(seat) {
  if (!seat.enabled) return 'disabled';
  if (!seat.claim) return 'available';
  return seat.claim.connected ? 'claimed' : 'claimed-disconnected';
}

// A monotonic clock where there is one, so a wall-clock correction can't stretch a window.
const monotonicNow = () => (globalThis.performance && typeof globalThis.performance.now === 'function' ? globalThis.performance.now() : Date.now());

/**
 * @param {object} [options]
 * @param {Crypto} [options.crypto]
 * @param {() => number} [options.now]
 */
export function createAdmissionModel({ crypto: cryptoObj = globalThis.crypto, now = monotonicNow } = {}) {
  const seats = new Map(); // id -> { id, name, enabled, claim }
  const admitted = new Map(); // peerId -> seatId (connected peers admitted to a seat)
  let nextSeat = 1;
  let password = null;
  let locked = false;
  let ended = false;
  const limits = {
    peerFailures: createAttemptLimiter({ ...THROTTLE.peerFailures, maxKeys: THROTTLE.maxTrackedPeers, now }),
    roomFailures: createAttemptLimiter({ ...THROTTLE.roomFailures, maxKeys: 1, now }),
    peerRequests: createAttemptLimiter({ ...THROTTLE.peerRequests, maxKeys: THROTTLE.maxTrackedPeers, now }),
  };
  const stats = { accepted: 0, rejected: 0, throttled: 0, lastRejection: null };

  // failure: 'peer' counts towards the peer's failure limit; 'room' (wrong passwords only) towards
  // both the peer's and the room's.
  const reject = (reason, peerId, { failure = null } = {}) => {
    stats.rejected += 1;
    stats.lastRejection = reason;
    if (failure && isPeerId(peerId)) {
      limits.peerFailures.record(peerId);
      if (failure === 'room') limits.roomFailures.record('room');
    }
    return { ok: false, reason };
  };
  const throttled = (peerId) => {
    stats.throttled += 1;
    return reject('throttled', peerId);
  };

  // Ends a seat's claim: its credential stops working at once; a connected player must be removed.
  function release(seat, reason) {
    const effects = { disconnect: [] };
    if (!seat.claim) return effects;
    const { peerId, connected } = seat.claim;
    seat.claim = null;
    if (connected) {
      admitted.delete(peerId);
      effects.disconnect.push({ peerId, reason });
    }
    return effects;
  }

  const live = () => {
    if (ended) throw new Error('the session has ended');
  };
  const seatOf = (seatId) => {
    const seat = isSeatId(seatId) ? seats.get(seatId) : null;
    if (!seat) throw new Error('unknown seat');
    return seat;
  };

  function admit(seat, peerId, credential) {
    seat.claim = { peerId, credential, connected: true };
    admitted.set(peerId, seat.id);
    stats.accepted += 1;
  }

  return {
    // ---- DM configuration ----------------------------------------------------------------------

    createSeat(name) {
      live();
      if (!isSeatName(name)) throw new Error('bad seat name');
      if (seats.size >= MAX_SEATS) throw new Error('too many seats');
      const seat = { id: `s${nextSeat++}`, name, enabled: true, claim: null };
      seats.set(seat.id, seat);
      return seat.id;
    },

    /** A new label only: the claim and its credential are untouched. */
    renameSeat(seatId, name) {
      live();
      if (!isSeatName(name)) throw new Error('bad seat name');
      seatOf(seatId).name = name;
    },

    enableSeat(seatId) {
      live();
      seatOf(seatId).enabled = true;
    },

    /** Disabling a claimed seat releases it (its player is removed, its credential invalidated). */
    disableSeat(seatId) {
      live();
      const seat = seatOf(seatId);
      const effects = release(seat, 'seat-disabled');
      seat.enabled = false;
      return effects;
    },

    /** Kick: the player is removed, the credential invalidated, the seat available again. */
    kickSeat(seatId) {
      live();
      return release(seatOf(seatId), 'kicked');
    },

    /** Reset: the same seat outcome as a kick (available, credential invalidated); reason 'seat-reset'. */
    resetSeat(seatId) {
      live();
      return release(seatOf(seatId), 'seat-reset');
    },

    /** null removes the password. Affects new admissions only. */
    setPassword(value) {
      live();
      if (value !== null && !isPasswordValue(value)) throw new Error('bad password');
      password = value;
    },

    setLocked(value) {
      live();
      locked = !!value;
    },

    // ---- Players ---------------------------------------------------------------------------------

    /**
     * The one admission decision. `request` is a validated join-request ({ seatId, password? }) or
     * rejoin-request ({ seatId, credential }) from `peerId`, an ephemeral transport id (never
     * authentication). Returns { ok: true, seat: { id, name }, credential, effects } or
     * { ok: false, reason } with a JOIN_REJECT_REASONS code (protocol-v1.js).
     */
    requestAdmission(peerId, request) {
      if (!isPeerId(peerId)) return reject('malformed-request', null);
      if (!limits.peerRequests.allowed(peerId) || !limits.peerFailures.allowed(peerId)) return throttled(peerId);
      limits.peerRequests.record(peerId);
      if (!request || typeof request !== 'object' || !isSeatId(request.seatId)) return reject('malformed-request', peerId, { failure: 'peer' });
      if (ended) return reject('session-ended', peerId);

      if (request.kind === 'rejoin') {
        if (!isCredential(request.credential)) return reject('malformed-request', peerId, { failure: 'peer' });
        if (admitted.has(peerId)) return reject('already-admitted', peerId);
        const seat = seats.get(request.seatId);
        if (!seat || !seat.claim || !sameString(seat.claim.credential, request.credential)) return reject('invalid-credential', peerId, { failure: 'peer' });
        // Milestone 5: a seat whose player is still connected is not taken over (Milestone 7 decides).
        if (seat.claim.connected) return reject('seat-unavailable', peerId);
        const credential = generateCredential(cryptoObj); // rotated: the presented one dies now
        admit(seat, peerId, credential);
        return { ok: true, seat: { id: seat.id, name: seat.name }, credential, effects: { disconnect: [] } };
      }

      if (request.kind !== 'join') return reject('malformed-request', peerId, { failure: 'peer' });
      if (request.password !== undefined && !isPasswordValue(request.password)) return reject('malformed-request', peerId, { failure: 'peer' });
      if (!limits.roomFailures.allowed('room')) return throttled(peerId);
      if (locked) return reject('room-locked', peerId);
      if (password !== null && !sameString(password, request.password)) return reject('bad-password', peerId, { failure: 'room' });
      const seat = seats.get(request.seatId);
      if (!seat) return reject('unknown-seat', peerId);
      if (!seat.enabled) return reject('seat-disabled', peerId);
      if (seat.claim) return reject('seat-unavailable', peerId);
      if (admitted.has(peerId)) return reject('already-admitted', peerId);
      const credential = generateCredential(cryptoObj);
      admit(seat, peerId, credential);
      return { ok: true, seat: { id: seat.id, name: seat.name }, credential, effects: { disconnect: [] } };
    },

    /** The peer's connection closed: its seat stays claimed (and reclaimable) but disconnected. */
    peerDisconnected(peerId) {
      const seatId = admitted.get(peerId);
      if (seatId === undefined) return;
      admitted.delete(peerId);
      const seat = seats.get(seatId);
      if (seat && seat.claim && seat.claim.peerId === peerId) seat.claim.connected = false;
    },

    /** The player left the room (a leave message): its seat is released, available again. */
    peerLeft(peerId) {
      const seatId = admitted.get(peerId);
      if (seatId === undefined) return { disconnect: [] };
      return release(seats.get(seatId), 'left');
    },

    /** Whether `peerId` is admitted now (connected and holding a seat), and to which seat. */
    admittedSeat(peerId) {
      const seatId = admitted.get(peerId);
      return seatId === undefined ? null : seatId;
    },

    /**
     * Whether `credential` is the live credential of `seatId` in this session. For tests only (the DM
     * never holds credentials): never call it with peer input, as it skips throttling. Peers reclaim
     * through requestAdmission.
     */
    credentialValid(seatId, credential) {
      if (!isSeatId(seatId) || !isCredential(credential)) return false;
      const seat = seats.get(seatId);
      return !!(seat && seat.claim && sameString(seat.claim.credential, credential));
    },

    /**
     * Session end: every admitted player is removed, every credential, seat, password, lock and
     * throttle state is discarded. The model refuses everything afterwards; a new session is a new
     * model, which knows none of this one's credentials.
     */
    endSession() {
      if (ended) return { disconnect: [] };
      const effects = { disconnect: [...admitted.keys()].map((peerId) => ({ peerId, reason: 'ended' })) };
      ended = true;
      seats.clear();
      admitted.clear();
      password = null;
      locked = false;
      Object.values(limits).forEach((l) => l.clear());
      return effects;
    },

    get ended() {
      return ended;
    },

    /**
     * What an unadmitted player may know to join (§7 step 4): the lock, whether a password is
     * required, and the enabled seats with their names and whether they can be claimed. Never the
     * password, a credential, a peer id, claim details or anything about shared surfaces.
     */
    admissionState() {
      return {
        locked,
        passwordRequired: password !== null,
        seats: [...seats.values()].filter((s) => s.enabled).map((s) => ({ id: s.id, name: s.name, available: !s.claim })),
      };
    },

    /** The DM's view of the seats: states, names and the connected peer (no credentials, no password). */
    seats() {
      return [...seats.values()].map((s) => ({ id: s.id, name: s.name, state: seatState(s), peerId: s.claim && s.claim.connected ? s.claim.peerId : null }));
    },

    /** Counts only: never the password, a credential or a peer id. */
    diagnostics() {
      const states = { available: 0, claimed: 0, 'claimed-disconnected': 0, disabled: 0 };
      for (const s of seats.values()) states[seatState(s)] += 1;
      return { ended, locked, passwordSet: password !== null, seats: states, admitted: admitted.size, ...stats };
    },
  };
}
