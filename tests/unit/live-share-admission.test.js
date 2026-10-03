// Live Share Milestone 5B.1: the session host's room and admission model (admission.js) and its
// attempt limiter (admission-throttle.js): seats and their states, claims, the password, the lock,
// seat-session credentials, throttling, session end, and the sanitized admission state.
import { describe, it, expect, beforeEach } from 'vitest';
import { createAdmissionModel, generateCredential, seatState, CREDENTIAL_PATTERN, MAX_SEATS, MAX_PASSWORD_LENGTH, THROTTLE } from '../../js/modules/live-share/admission.js';
import { createAttemptLimiter } from '../../js/modules/live-share/admission-throttle.js';

const join = (seatId, password) => ({ kind: 'join', seatId, ...(password !== undefined ? { password } : {}) });
const rejoin = (seatId, credential) => ({ kind: 'rejoin', seatId, credential });

function setup() {
  let clock = 1000;
  const model = createAdmissionModel({ now: () => clock });
  return { model, tick: (ms) => (clock += ms) };
}

describe('seats', () => {
  let t;
  beforeEach(() => {
    t = setup();
  });

  it('are created with stable, unique ids, renamed without touching their claim, and enabled or disabled', () => {
    const a = t.model.createSeat('Caleb');
    const b = t.model.createSeat('Jester');
    expect(a).not.toBe(b);
    expect(t.model.seats()).toEqual([
      { id: a, name: 'Caleb', state: 'available', peerId: null },
      { id: b, name: 'Jester', state: 'available', peerId: null },
    ]);
    const admitted = t.model.requestAdmission('p1', join(a));
    t.model.renameSeat(a, 'Caleb W.');
    expect(t.model.seats()[0]).toMatchObject({ id: a, name: 'Caleb W.', state: 'claimed', peerId: 'p1' });
    expect(t.model.credentialValid(a, admitted.credential)).toBe(true); // a rename is not a credential change
    t.model.disableSeat(b);
    expect(t.model.seats()[1].state).toBe('disabled');
    t.model.enableSeat(b);
    expect(t.model.seats()[1].state).toBe('available');
  });

  it('refuse bad names, unknown ids and more than MAX_SEATS', () => {
    for (const name of ['', '   ', 'x'.repeat(41), 42, null]) expect(() => t.model.createSeat(name)).toThrow();
    expect(() => t.model.renameSeat('s99', 'x')).toThrow();
    expect(() => t.model.kickSeat('nope')).toThrow();
    for (let i = 0; i < MAX_SEATS; i++) t.model.createSeat(`Seat ${i}`);
    expect(() => t.model.createSeat('one more')).toThrow();
  });

  it('a disabled seat cannot be claimed; disabling a claimed seat releases it and invalidates its credential', () => {
    const a = t.model.createSeat('A');
    t.model.disableSeat(a);
    expect(t.model.requestAdmission('p1', join(a))).toEqual({ ok: false, reason: 'seat-disabled' });
    t.model.enableSeat(a);
    const admitted = t.model.requestAdmission('p1', join(a));
    expect(admitted.ok).toBe(true);
    expect(t.model.disableSeat(a)).toEqual({ disconnect: [{ peerId: 'p1', reason: 'seat-disabled' }] });
    expect(t.model.seats()[0]).toMatchObject({ state: 'disabled', peerId: null });
    expect(t.model.credentialValid(a, admitted.credential)).toBe(false);
    expect(t.model.admittedSeat('p1')).toBeNull();
    t.model.enableSeat(a);
    expect(t.model.requestAdmission('p2', rejoin(a, admitted.credential))).toEqual({ ok: false, reason: 'invalid-credential' });
  });

  it('kick and reset remove the player, invalidate the credential and leave the seat available', () => {
    const a = t.model.createSeat('A');
    for (const [op, reason] of [
      ['kickSeat', 'kicked'],
      ['resetSeat', 'seat-reset'],
    ]) {
      const admitted = t.model.requestAdmission('p1', join(a));
      expect(admitted.ok).toBe(true);
      expect(t.model[op](a)).toEqual({ disconnect: [{ peerId: 'p1', reason }] });
      expect(t.model.seats()[0]).toMatchObject({ state: 'available', peerId: null });
      expect(t.model.credentialValid(a, admitted.credential)).toBe(false);
      expect(t.model.requestAdmission('p1', rejoin(a, admitted.credential)).reason).toBe('invalid-credential');
      expect(t.model[op](a)).toEqual({ disconnect: [] }); // nothing to release now
    }
  });

  it('a disconnected player keeps its seat claimed (reclaimable), and is no longer admitted; leaving releases it', () => {
    const a = t.model.createSeat('A');
    const admitted = t.model.requestAdmission('p1', join(a));
    t.model.peerDisconnected('p1');
    expect(seatState({ enabled: true, claim: { connected: false } })).toBe('claimed-disconnected');
    expect(t.model.seats()[0].state).toBe('claimed-disconnected');
    expect(t.model.admittedSeat('p1')).toBeNull();
    expect(t.model.requestAdmission('p2', join(a))).toEqual({ ok: false, reason: 'seat-unavailable' });
    expect(t.model.credentialValid(a, admitted.credential)).toBe(true);
    // A kick of a disconnected seat has nobody to disconnect, but still invalidates.
    expect(t.model.kickSeat(a)).toEqual({ disconnect: [] });
    expect(t.model.credentialValid(a, admitted.credential)).toBe(false);
    // Leaving releases the seat at once, and says so (5B.2 closes the link with that reason).
    t.model.requestAdmission('p3', join(a));
    expect(t.model.peerLeft('p3')).toEqual({ disconnect: [{ peerId: 'p3', reason: 'left' }] });
    expect(t.model.seats()[0].state).toBe('available');
    expect(t.model.peerLeft('p3')).toEqual({ disconnect: [] }); // nothing held any more
    expect(t.model.peerLeft('never-admitted')).toEqual({ disconnect: [] });
  });

  it('a claimed-disconnected seat is not offered as available to joining players', () => {
    const a = t.model.createSeat('A');
    t.model.requestAdmission('p1', join(a));
    t.model.peerDisconnected('p1');
    expect(t.model.admissionState().seats).toEqual([{ id: a, name: 'A', available: false }]);
  });

  it('the DM seat list shows a peer only on a connected claim', () => {
    const a = t.model.createSeat('A');
    const b = t.model.createSeat('B');
    t.model.requestAdmission('p1', join(a));
    t.model.peerDisconnected('p1');
    t.model.requestAdmission('p1', join(b)); // the same transport id, on another seat
    expect(t.model.seats().map((s) => [s.state, s.peerId])).toEqual([
      ['claimed-disconnected', null],
      ['claimed', 'p1'],
    ]);
  });
});

describe('claims', () => {
  let t;
  let a;
  beforeEach(() => {
    t = setup();
    a = t.model.createSeat('A');
  });

  it('one claim of a seat wins; the next, back to back, is refused, and the winner keeps it', () => {
    const first = t.model.requestAdmission('p1', join(a));
    const second = t.model.requestAdmission('p2', join(a));
    expect(first).toMatchObject({ ok: true, seat: { id: a, name: 'A' }, credential: expect.stringMatching(CREDENTIAL_PATTERN) });
    expect(second).toEqual({ ok: false, reason: 'seat-unavailable' });
    expect(t.model.admittedSeat('p1')).toBe(a);
    expect(t.model.admittedSeat('p2')).toBeNull();
    expect(t.model.credentialValid(a, first.credential)).toBe(true);
  });

  it('missing, unknown or malformed seats and requests fail and change nothing', () => {
    const before = JSON.stringify(t.model.seats());
    expect(t.model.requestAdmission('p1', join('s9'))).toEqual({ ok: false, reason: 'unknown-seat' });
    let n = 0; // a peer each: malformed requests count as failures, and would throttle one peer
    for (const bad of [null, {}, { kind: 'join' }, join('S1'), join('s1; drop'), { kind: 'other', seatId: a }, join(a, ''), join(a, 'x'.repeat(MAX_PASSWORD_LENGTH + 1)), join(a, 7)]) {
      expect(t.model.requestAdmission(`bad${n++}`, bad).reason).toBe('malformed-request');
    }
    expect(t.model.requestAdmission('bad peer id!', join(a)).reason).toBe('malformed-request');
    expect(JSON.stringify(t.model.seats())).toBe(before);
  });

  it('a peer holds one seat at a time; a peer id is no credential', () => {
    const b = t.model.createSeat('B');
    const first = t.model.requestAdmission('p1', join(a));
    expect(t.model.requestAdmission('p1', join(b))).toEqual({ ok: false, reason: 'already-admitted' });
    // Another peer can't reclaim a without the credential, nor with another seat's.
    const other = t.model.requestAdmission('p2', join(b));
    expect(t.model.requestAdmission('p3', rejoin(a, other.credential))).toEqual({ ok: false, reason: 'invalid-credential' });
    expect(t.model.requestAdmission('p3', rejoin(a, generateCredential()))).toEqual({ ok: false, reason: 'invalid-credential' });
    // p1, seen before, gets no shortcut: after leaving, its next join is a new claim like anyone's.
    t.model.peerLeft('p1');
    t.model.setPassword('pw');
    expect(t.model.requestAdmission('p1', join(a))).toEqual({ ok: false, reason: 'bad-password' });
    expect(t.model.credentialValid(a, first.credential)).toBe(false);
  });
});

describe('decision order (planning doc §7)', () => {
  it('a locked room answers room-locked whatever the password: it is never a password oracle, and counts no failure', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    t.model.setPassword('right');
    t.model.setLocked(true);
    for (let i = 0; i < 10; i++) expect(t.model.requestAdmission('p1', join(a, `wrong${i}`))).toEqual({ ok: false, reason: 'room-locked' });
    expect(t.model.requestAdmission('p1', join(a, 'right'))).toEqual({ ok: false, reason: 'room-locked' });
    t.model.setLocked(false);
    expect(t.model.requestAdmission('p1', join(a, 'right')).ok).toBe(true); // no failures were counted
  });

  it('the password is checked before anything about the seat', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const d = t.model.createSeat('D');
    t.model.disableSeat(d);
    t.model.setPassword('right');
    t.model.requestAdmission('p1', join(a, 'right'));
    for (const seatId of ['s99', d, a]) expect(t.model.requestAdmission(`q${seatId}`, join(seatId, 'wrong'))).toEqual({ ok: false, reason: 'bad-password' });
  });

  it('then: seat exists -> enabled -> available -> the peer holds no seat', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const d = t.model.createSeat('D');
    t.model.disableSeat(d);
    expect(t.model.requestAdmission('p1', join('s99')).reason).toBe('unknown-seat');
    expect(t.model.requestAdmission('p1', join(d)).reason).toBe('seat-disabled');
    t.model.requestAdmission('p1', join(a));
    expect(t.model.requestAdmission('p1', join(a)).reason).toBe('seat-unavailable'); // its own seat: taken
    expect(t.model.requestAdmission('p2', join(a)).reason).toBe('seat-unavailable');
  });

  it('a reclaim of another seat by a peer already holding one is refused, leaving both seats as they were', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const b = t.model.createSeat('B');
    const ca = t.model.requestAdmission('pa', join(a)).credential;
    t.model.peerDisconnected('pa');
    t.model.requestAdmission('pb', join(b));
    const before = JSON.stringify(t.model.seats());
    expect(t.model.requestAdmission('pb', rejoin(a, ca))).toEqual({ ok: false, reason: 'already-admitted' });
    expect(JSON.stringify(t.model.seats())).toBe(before);
    expect(t.model.admittedSeat('pb')).toBe(b);
    expect(t.model.credentialValid(a, ca)).toBe(true);
  });
});

describe('password', () => {
  let t;
  let a;
  beforeEach(() => {
    t = setup();
    a = t.model.createSeat('A');
  });

  it('none: a join needs no password; set: only the exact password admits, and a wrong one claims nothing', () => {
    expect(t.model.requestAdmission('p1', join(a)).ok).toBe(true);
    t.model.peerLeft('p1');
    t.model.setPassword('Sesame');
    expect(t.model.requestAdmission('p2', join(a))).toEqual({ ok: false, reason: 'bad-password' });
    expect(t.model.requestAdmission('p2', join(a, 'sesame'))).toEqual({ ok: false, reason: 'bad-password' }); // exact
    expect(t.model.requestAdmission('p2', join(a, 'Sesame '))).toEqual({ ok: false, reason: 'bad-password' });
    expect(t.model.seats()[0].state).toBe('available');
    expect(t.model.requestAdmission('p2', join(a, 'Sesame')).ok).toBe(true);
  });

  it('a change affects new admissions only; removal admits without one; it is never in admission state', () => {
    t.model.setPassword('one');
    const first = t.model.requestAdmission('p1', join(a, 'one'));
    const b = t.model.createSeat('B');
    t.model.setPassword('two');
    expect(t.model.admittedSeat('p1')).toBe(a); // still admitted
    expect(t.model.credentialValid(a, first.credential)).toBe(true);
    expect(t.model.requestAdmission('p2', join(b, 'one')).reason).toBe('bad-password');
    expect(JSON.stringify(t.model.admissionState())).not.toMatch(/two|one/);
    expect(JSON.stringify(t.model.diagnostics())).not.toMatch(/"two"|"one"/);
    t.model.setPassword(null);
    expect(t.model.admissionState().passwordRequired).toBe(false);
    expect(t.model.requestAdmission('p2', join(b)).ok).toBe(true);
    for (const bad of ['', 'x'.repeat(MAX_PASSWORD_LENGTH + 1), 5, {}]) expect(() => t.model.setPassword(bad)).toThrow();
  });
});

describe('room lock', () => {
  it('refuses new claims, even with the right password; admitted players stay; a valid credential reclaims', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const b = t.model.createSeat('B');
    t.model.setPassword('pw');
    const first = t.model.requestAdmission('p1', join(a, 'pw'));
    t.model.setLocked(true);
    expect(t.model.requestAdmission('p2', join(b, 'pw'))).toEqual({ ok: false, reason: 'room-locked' });
    expect(t.model.seats()[1].state).toBe('available');
    expect(t.model.admittedSeat('p1')).toBe(a);
    expect(t.model.admissionState()).toMatchObject({ locked: true, passwordRequired: true });
    // The player's connection drops; it reclaims its seat with its credential while the room is
    // locked, without the password (the model allows it; a reconnecting client is Milestone 7).
    t.model.peerDisconnected('p1');
    const back = t.model.requestAdmission('p9', rejoin(a, first.credential));
    expect(back).toMatchObject({ ok: true, seat: { id: a } });
    expect(t.model.admittedSeat('p9')).toBe(a);
    t.model.setLocked(false);
    expect(t.model.requestAdmission('p2', join(b, 'pw')).ok).toBe(true);
  });
});

describe('reclaim (Milestone 5: disconnected seats only, credential rotated)', () => {
  let t;
  let a;
  let first;
  beforeEach(() => {
    t = setup();
    a = t.model.createSeat('A');
    first = t.model.requestAdmission('p1', join(a));
  });

  it('a claimed-disconnected seat is reclaimed with a NEW credential; the old one dies at once', () => {
    t.model.peerDisconnected('p1');
    const back = t.model.requestAdmission('p2', rejoin(a, first.credential));
    expect(back).toEqual({ ok: true, seat: { id: a, name: 'A' }, credential: expect.stringMatching(CREDENTIAL_PATTERN), effects: { disconnect: [] } });
    expect(back.credential).not.toBe(first.credential);
    expect(t.model.credentialValid(a, back.credential)).toBe(true); // the only valid one now
    expect(t.model.credentialValid(a, first.credential)).toBe(false);
    expect(t.model.seats()[0]).toMatchObject({ state: 'claimed', peerId: 'p2' });
    // The old credential can't reclaim again, even once the seat is disconnected again.
    t.model.peerDisconnected('p2');
    expect(t.model.requestAdmission('p3', rejoin(a, first.credential))).toEqual({ ok: false, reason: 'invalid-credential' });
    const again = t.model.requestAdmission('p3', rejoin(a, back.credential));
    expect(again.ok).toBe(true);
    expect(again.credential).not.toBe(back.credential); // rotated every time
  });

  it('a seat whose player is still connected is not taken over: seat-unavailable, and nothing changes', () => {
    const before = { seats: JSON.stringify(t.model.seats()), diag: t.model.diagnostics() };
    for (let i = 0; i < 3; i++) {
      expect(t.model.requestAdmission(`thief${i}`, rejoin(a, first.credential))).toEqual({ ok: false, reason: 'seat-unavailable' });
    }
    expect(JSON.stringify(t.model.seats())).toBe(before.seats);
    expect(t.model.admittedSeat('p1')).toBe(a);
    expect(t.model.credentialValid(a, first.credential)).toBe(true); // not rotated by a failed reclaim
    // Only the intended request accounting: rejected and lastRejection; no failure towards any limit.
    expect(t.model.diagnostics()).toMatchObject({ ...before.diag, rejected: before.diag.rejected + 3, lastRejection: 'seat-unavailable' });
    for (let i = 0; i < 10; i++) t.model.requestAdmission('thief0', rejoin(a, first.credential)); // no failures piling up
    t.model.peerDisconnected('p1');
    expect(t.model.requestAdmission('thief0', rejoin(a, first.credential)).ok).toBe(true); // not throttled
  });

  it('a wrong credential on a disconnected seat still fails, and rotates nothing', () => {
    t.model.peerDisconnected('p1');
    expect(t.model.requestAdmission('p2', rejoin(a, generateCredential()))).toEqual({ ok: false, reason: 'invalid-credential' });
    expect(t.model.credentialValid(a, first.credential)).toBe(true);
    expect(t.model.seats()[0].state).toBe('claimed-disconnected');
  });

  it('a malformed credential is malformed, not invalid', () => {
    t.model.peerDisconnected('p1');
    for (const credential of ['short', 'x'.repeat(44), 42]) expect(t.model.requestAdmission('p2', rejoin(a, credential)).reason).toBe('malformed-request');
  });

  it('a peer already holding a seat can reclaim none, valid credential or not', () => {
    const b = t.model.createSeat('B');
    t.model.peerDisconnected('p1');
    t.model.requestAdmission('pb', join(b));
    const before = JSON.stringify(t.model.seats());
    expect(t.model.requestAdmission('pb', rejoin(a, first.credential))).toEqual({ ok: false, reason: 'already-admitted' });
    expect(t.model.requestAdmission('pb', rejoin(a, generateCredential()))).toEqual({ ok: false, reason: 'already-admitted' }); // no validity oracle
    expect(JSON.stringify(t.model.seats())).toBe(before);
    expect(t.model.credentialValid(a, first.credential)).toBe(true);
  });

  it('reset, kick, disable and session end invalidate the rotated credential', () => {
    for (const op of ['resetSeat', 'kickSeat', 'disableSeat', 'endSession']) {
      const m = setup().model;
      const s = m.createSeat('S');
      const c0 = m.requestAdmission('q1', join(s)).credential;
      m.peerDisconnected('q1');
      const c1 = m.requestAdmission('q2', rejoin(s, c0)).credential;
      expect(m.credentialValid(s, c1)).toBe(true);
      if (op === 'endSession') m.endSession();
      else m[op](s);
      expect(m.credentialValid(s, c1), op).toBe(false);
      expect(m.credentialValid(s, c0), op).toBe(false);
    }
  });
});

describe('seat-session credentials', () => {
  it('are 256 random bits in base64url, different every time, and derived from nothing', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const c = generateCredential();
      expect(c).toMatch(CREDENTIAL_PATTERN);
      seen.add(c);
    }
    expect(seen.size).toBe(200);
    // Uses the injected random source only: a fixed source gives a fixed token, whatever the seat,
    // name, password or time.
    const zeros = { getRandomValues: (b) => b.fill(0) };
    const t1 = createAdmissionModel({ crypto: zeros });
    const t2 = createAdmissionModel({ crypto: zeros, now: () => 9e12 });
    const s1 = t1.createSeat('Caleb');
    t1.setPassword('pw');
    const s2 = t2.createSeat('Somebody else');
    const c1 = t1.requestAdmission('p1', join(s1, 'pw')).credential;
    const c2 = t2.requestAdmission('p7', join(s2)).credential;
    expect(c1).toBe(c2);
    expect(c1).toBe('A'.repeat(43));
  });

  it('validate only for their seat, in their session, while the claim holds them', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const b = t.model.createSeat('B');
    const ca = t.model.requestAdmission('p1', join(a)).credential;
    const cb = t.model.requestAdmission('p2', join(b)).credential;
    expect(ca).not.toBe(cb);
    expect(t.model.credentialValid(a, ca)).toBe(true);
    expect(t.model.credentialValid(b, ca)).toBe(false); // wrong seat
    expect(t.model.credentialValid(a, generateCredential())).toBe(false); // fabricated
    expect(t.model.credentialValid(a, 'short')).toBe(false);
    const other = setup(); // another session
    const oa = other.model.createSeat('A');
    expect(oa).toBe(a); // same seat id: ids are not secrets...
    expect(other.model.credentialValid(oa, ca)).toBe(false); // ...and the credential is still worthless there
    expect(other.model.requestAdmission('p1', rejoin(oa, ca))).toEqual({ ok: false, reason: 'invalid-credential' });
  });

  it('never appear in admission state, the DM seat list or diagnostics', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const { credential } = t.model.requestAdmission('p1', join(a));
    for (const view of [t.model.admissionState(), t.model.seats(), t.model.diagnostics()]) expect(JSON.stringify(view)).not.toContain(credential);
  });
});

describe('admission state (what an unadmitted player may know)', () => {
  it('lists enabled seats with name and availability, the lock and whether a password is needed, nothing else', () => {
    const t = setup();
    const a = t.model.createSeat('Caleb');
    const b = t.model.createSeat('Jester');
    const c = t.model.createSeat('Hidden seat');
    t.model.disableSeat(c);
    t.model.setPassword('pw');
    t.model.requestAdmission('peer-123', join(a, 'pw'));
    const state = t.model.admissionState();
    expect(state).toEqual({
      locked: false,
      passwordRequired: true,
      seats: [
        { id: a, name: 'Caleb', available: false },
        { id: b, name: 'Jester', available: true },
      ],
    });
    expect(JSON.stringify(state)).not.toMatch(/peer-123|"pw"|Hidden seat/);
  });
});

describe('throttling', () => {
  it('a peer guessing passwords is throttled after 5 failures, then may try again after the window', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    t.model.setPassword('right');
    for (let i = 0; i < THROTTLE.peerFailures.limit; i++) expect(t.model.requestAdmission('p1', join(a, `guess${i}`)).reason).toBe('bad-password');
    expect(t.model.requestAdmission('p1', join(a, 'right'))).toEqual({ ok: false, reason: 'throttled' }); // even the right one
    expect(t.model.seats()[0].state).toBe('available'); // throttled requests change nothing
    expect(t.model.requestAdmission('p2', join(a, 'right')).ok).toBe(true); // another peer isn't affected
    t.model.peerLeft('p2');
    t.tick(THROTTLE.peerFailures.windowMs);
    expect(t.model.requestAdmission('p1', join(a, 'right')).ok).toBe(true);
  });

  it('rotating peer ids does not escape the room-wide limit; it recovers after its window', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    t.model.setPassword('right');
    for (let i = 0; i < THROTTLE.roomFailures.limit; i++) t.model.requestAdmission(`attacker${i}`, join(a, 'wrong'));
    expect(t.model.requestAdmission('fresh-peer', join(a, 'right'))).toEqual({ ok: false, reason: 'throttled' });
    expect(t.model.diagnostics().throttled).toBeGreaterThan(0);
    t.tick(THROTTLE.roomFailures.windowMs);
    expect(t.model.requestAdmission('fresh-peer', join(a, 'right')).ok).toBe(true);
  });

  it('only wrong passwords count room-wide: credential guesses and malformed spam from rotating peers block nobody', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const b = t.model.createSeat('B');
    const ca = t.model.requestAdmission('alice', join(a)).credential;
    t.model.peerDisconnected('alice');
    for (let i = 0; i < 4 * THROTTLE.roomFailures.limit; i++) {
      t.model.requestAdmission(`guess${i}`, rejoin(a, generateCredential()));
      t.model.requestAdmission(`spam${i}`, { kind: 'join', seatId: 'nope' });
    }
    expect(t.model.requestAdmission('bob', join(b)).ok).toBe(true);
    expect(t.model.requestAdmission('alice2', rejoin(a, ca)).ok).toBe(true);
  });

  it('a valid reclaim gets in while wrong passwords keep the room limit tripped; new claims wait', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const b = t.model.createSeat('B');
    t.model.setPassword('right');
    const ca = t.model.requestAdmission('alice', join(a, 'right')).credential;
    t.model.peerDisconnected('alice');
    for (let i = 0; i < THROTTLE.roomFailures.limit; i++) t.model.requestAdmission(`guess${i}`, join(b, 'wrong'));
    expect(t.model.requestAdmission('bob', join(b, 'right'))).toEqual({ ok: false, reason: 'throttled' });
    expect(t.model.requestAdmission('alice2', rejoin(a, ca))).toMatchObject({ ok: true, seat: { id: a } });
  });

  it('invalid credentials count towards the peer\'s own failure limit', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const ca = t.model.requestAdmission('alice', join(a)).credential;
    t.model.peerDisconnected('alice');
    for (let i = 0; i < THROTTLE.peerFailures.limit; i++) expect(t.model.requestAdmission('mallory', rejoin(a, generateCredential())).reason).toBe('invalid-credential');
    expect(t.model.requestAdmission('mallory', rejoin(a, ca))).toEqual({ ok: false, reason: 'throttled' }); // even a stolen valid one
  });

  it('a clock that goes backwards ends a window rather than stretching it', () => {
    let clock = 10 * 60000;
    const model = createAdmissionModel({ now: () => clock });
    const a = model.createSeat('A');
    model.setPassword('right');
    for (let i = 0; i < THROTTLE.peerFailures.limit; i++) model.requestAdmission('p1', join(a, 'wrong'));
    expect(model.requestAdmission('p1', join(a, 'right')).reason).toBe('throttled');
    clock -= 3600000; // corrected an hour back
    expect(model.requestAdmission('p1', join(a, 'right')).ok).toBe(true);
  });

  it('malformed spam is throttled too, and one peer can only make so many requests', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    for (let i = 0; i < THROTTLE.peerFailures.limit; i++) t.model.requestAdmission('p1', { kind: 'join', seatId: 'bad!' });
    expect(t.model.requestAdmission('p1', join(a)).reason).toBe('throttled');
    // Requests of any kind (here: a locked room) are capped per peer.
    t.model.setLocked(true);
    for (let i = 0; i < THROTTLE.peerRequests.limit; i++) expect(t.model.requestAdmission('p2', join(a)).reason).toBe('room-locked');
    expect(t.model.requestAdmission('p2', join(a)).reason).toBe('throttled');
  });

  it('the limiter keeps a bounded number of keys and forgets the oldest window first', () => {
    let clock = 0;
    const l = createAttemptLimiter({ limit: 1, windowMs: 1000, maxKeys: 3, now: () => clock });
    for (const k of ['a', 'b', 'c']) {
      l.record(k);
      clock += 1;
    }
    expect(l.allowed('a')).toBe(false);
    l.record('d'); // full: 'a', the oldest, is forgotten
    expect(l.size).toBe(3);
    expect(l.allowed('a')).toBe(true);
    expect(l.allowed('d')).toBe(false);
    clock += 1000;
    expect(l.allowed('d')).toBe(true);
    for (let i = 0; i < 1000; i++) l.record(`k${i}`);
    expect(l.size).toBe(3);
    expect(() => createAttemptLimiter({ limit: 0, windowMs: 1 })).toThrow();
  });
});

describe('session end', () => {
  it('removes everyone, invalidates every credential and leaves nothing usable', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    const b = t.model.createSeat('B');
    t.model.setPassword('pw');
    t.model.setLocked(false);
    const ca = t.model.requestAdmission('p1', join(a, 'pw')).credential;
    t.model.requestAdmission('p2', join(b, 'pw'));
    t.model.requestAdmission('p3', join(b, 'nope'));
    expect(t.model.endSession()).toEqual({ disconnect: [{ peerId: 'p1', reason: 'ended' }, { peerId: 'p2', reason: 'ended' }] });
    expect(t.model.ended).toBe(true);
    expect(t.model.credentialValid(a, ca)).toBe(false);
    expect(t.model.requestAdmission('p1', rejoin(a, ca))).toEqual({ ok: false, reason: 'session-ended' });
    expect(t.model.requestAdmission('p4', join(a, 'pw'))).toEqual({ ok: false, reason: 'session-ended' });
    expect(t.model.admissionState()).toEqual({ locked: false, passwordRequired: false, seats: [] });
    expect(t.model.diagnostics()).toMatchObject({ ended: true, admitted: 0, passwordSet: false, seats: { available: 0, claimed: 0, 'claimed-disconnected': 0, disabled: 0 } });
    expect(() => t.model.createSeat('again')).toThrow();
    for (const op of [() => t.model.renameSeat(a, 'x'), () => t.model.enableSeat(a), () => t.model.disableSeat(a), () => t.model.kickSeat(a), () => t.model.resetSeat(a), () => t.model.setPassword('x'), () => t.model.setLocked(true)]) {
      expect(op).toThrow('the session has ended');
    }
    expect(t.model.endSession()).toEqual({ disconnect: [] });
  });

  it('clears throttling state', () => {
    const t = setup();
    const a = t.model.createSeat('A');
    t.model.setPassword('right');
    for (let i = 0; i < THROTTLE.peerFailures.limit; i++) t.model.requestAdmission('p1', join(a, 'wrong'));
    expect(t.model.requestAdmission('p1', join(a, 'right')).reason).toBe('throttled');
    t.model.endSession();
    expect(t.model.requestAdmission('p1', join(a, 'right')).reason).toBe('session-ended'); // not 'throttled'
  });
});
