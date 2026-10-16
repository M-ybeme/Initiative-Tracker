/**
 * Live Share Milestone 5B.2: the session host's players (session-players.js), with the real admission
 * model, gate, protocol v1 and senders, and fake links that record every send.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionPlayers, MAX_PLAYER_LINKS, CLOSE_GRACE_MS, INBOUND_LIMIT } from '../../js/modules/live-share/session-players.js';
import { createAdmissionModel, CREDENTIAL_PATTERN } from '../../js/modules/live-share/admission.js';
import { RELAY_LIMITS } from '../../relay/room-core.mjs';

const ASSET_ID = 'a'.repeat(64);
const OTHER_ID = 'b'.repeat(64);

function fakeLink() {
  const listeners = new Map();
  return {
    sent: [], // parsed JSON, or { chunk: true }
    closed: false,
    buffered: 0,
    send(data) {
      if (this.closed) return false;
      this.sent.push(typeof data === 'string' ? JSON.parse(data) : { chunk: true });
      return true;
    },
    bufferedAmount() {
      return this.buffered;
    },
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    off(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    close() {
      this.closed = true;
    },
    // The player sends something (raw text, as it arrives on the channel).
    receive(msg) {
      this.receiveRaw(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
    receiveRaw(data) {
      for (const fn of listeners.get('message') || []) fn({ data });
    },
    types() {
      return this.sent.map((m) => (m.chunk ? 'chunk' : m.type));
    },
    last(type) {
      return this.sent.filter((m) => m.type === type).at(-1);
    },
  };
}

function fakeTimers() {
  let t = 0;
  let seq = 0;
  const timers = new Map();
  return {
    now: () => t,
    setTimer: (fn, ms) => {
      timers.set(++seq, { at: t + ms, fn });
      return seq;
    },
    clearTimer: (id) => timers.delete(id),
    advance(ms) {
      const end = t + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]);
        t = next[1].at;
        next[1].fn();
      }
      t = end;
    },
  };
}

const join = (seatId, password) => ({ v: 1, type: 'join-request', seatId, ...(password !== undefined ? { password } : {}) });
const rejoin = (seatId, credential) => ({ v: 1, type: 'rejoin-request', seatId, credential });

let time;
let snapshot;
let asset;
let players;
let changes;
function setup(options = {}) {
  time = fakeTimers();
  snapshot = { schema: 'dmtoolbox.battlemap.player-safe', version: 1, revision: 3, tokens: [] };
  asset = { assetId: ASSET_ID, kind: 'token', mime: 'image/png', bytes: new Uint8Array(100), width: 10, height: 10 };
  changes = 0;
  players = createSessionPlayers({
    getSnapshot: () => snapshot,
    getAsset: (id) => (asset && id === asset.assetId ? asset : null),
    hasAsset: (id) => !!asset && id === asset.assetId,
    onChange: () => (changes += 1),
    admission: createAdmissionModel({ now: time.now }),
    setTimer: time.setTimer,
    clearTimer: time.clearTimer,
    now: time.now,
    snapshotOptions: { now: time.now },
    ...options,
  });
  return players;
}
function connect(id) {
  const link = fakeLink();
  expect(players.attach(id, link)).toBe(true);
  return link;
}
const GAMEPLAY = ['surface-snapshot', 'asset-meta', 'asset-abort', 'chunk', 'session-state'];
const gameplayOf = (link) => link.types().filter((t) => GAMEPLAY.includes(t));

beforeEach(() => setup());

describe('session players: a new connection is unadmitted', () => {
  it('is sent only the sanitized admission state, even with a committed map and assets', () => {
    const a = players.createSeat('Aria');
    players.setPassword('pw');
    const link = connect('p1');
    expect(link.sent).toEqual([{ v: 1, type: 'admission-state', locked: false, passwordRequired: true, seats: [{ id: a, name: 'Aria', available: true }] }]);
    players.committed(); // a new publication while it waits
    time.advance(5000);
    expect(gameplayOf(link)).toEqual([]);
    expect(JSON.stringify(link.sent)).not.toContain('pw');
    expect(players.counts()).toEqual({ links: 1, admitted: 0, waiting: 1 });
  });

  it('may not request assets, and learns nothing about them by trying', () => {
    players.createSeat('A');
    const link = connect('p1');
    link.receive({ v: 1, type: 'asset-request', assetIds: [ASSET_ID, OTHER_ID] });
    time.advance(1000);
    expect(link.types()).toEqual(['admission-state']); // no meta, no abort ('unavailable' would be an oracle)
    expect(players.diagnostics()).toMatchObject({ messagesRefused: 1, lastRefused: 'asset-request while unadmitted', sendsBlocked: 0 });
  });

  it('drops v0, malformed, unknown, wrong-direction and oversized messages without answering', () => {
    players.createSeat('A');
    const link = connect('p1');
    const junk = [
      { v: 0, type: 'asset-request', assetIds: [ASSET_ID] },
      { v: 0, type: 'battlemap-snapshot', payload: snapshot },
      'not json',
      { v: 1, type: 'ping' },
      { v: 1, type: 'surface-snapshot', surface: 'battle-map', revision: 1, payload: {} },
      { v: 1, type: 'join-request', seatId: '__proto__' },
      { v: 1, type: 'join-request', seatId: 's1', extra: 1 },
      JSON.stringify({ v: 1, type: 'join-request', seatId: 's1', password: 'x'.repeat(300000) }),
    ];
    for (const msg of junk) link.receive(msg);
    expect(link.types()).toEqual(['admission-state']);
    expect(players.diagnostics()).toMatchObject({ protocolErrors: junk.length, admitted: 0 });
    expect(players.diagnostics().lastProtocolError).not.toContain('x'.repeat(10));
  });

  it('a binary message from a player is a protocol error, never acted on', () => {
    players.createSeat('A');
    const link = connect('p1');
    link.receiveRaw(new Uint8Array([1, 2, 3]).buffer);
    expect(link.types()).toEqual(['admission-state']);
    expect(players.diagnostics()).toMatchObject({ protocolErrors: 1, lastProtocolError: 'players send no binary messages' });
  });
});

describe('session players: joining', () => {
  it('a valid join is answered with its own credential, then the current map; assets follow on request', () => {
    const a = players.createSeat('Aria');
    const link = connect('p1');
    link.receive(join(a));
    expect(link.types()).toEqual(['admission-state', 'join-result', 'surface-snapshot']);
    const result = link.last('join-result');
    expect(result).toEqual({ v: 1, type: 'join-result', accepted: true, seat: { id: a, name: 'Aria' }, credential: expect.stringMatching(CREDENTIAL_PATTERN) });
    const { revision, ...payload } = snapshot;
    expect(link.last('surface-snapshot')).toEqual({ v: 1, type: 'surface-snapshot', surface: 'battle-map', revision, payload });
    link.receive({ v: 1, type: 'asset-request', assetIds: [ASSET_ID] });
    expect(link.types().slice(3)).toEqual(['asset-meta', 'chunk']);
    expect(players.counts()).toEqual({ links: 1, admitted: 1, waiting: 0 });
    expect(players.peerState('p1')).toBe('admitted');
  });

  it('only committed assets are served: an unknown id is aborted unavailable, after admission only', () => {
    const a = players.createSeat('A');
    const link = connect('p1');
    link.receive(join(a));
    link.receive({ v: 1, type: 'asset-request', assetIds: [OTHER_ID] });
    expect(link.last('asset-abort')).toEqual({ v: 1, type: 'asset-abort', assetId: OTHER_ID, reason: 'unavailable' });
  });

  it('two peers asking for the same seat: exactly one wins; the loser stays unadmitted, sees no map and may pick another seat', () => {
    const a = players.createSeat('A');
    const b = players.createSeat('B');
    const l1 = connect('p1');
    const l2 = connect('p2');
    l1.receive(join(a));
    l2.receive(join(a));
    expect(l1.last('join-result').accepted).toBe(true);
    expect(l2.last('join-result')).toEqual({ v: 1, type: 'join-result', accepted: false, reason: 'seat-unavailable' });
    expect(gameplayOf(l2)).toEqual([]);
    expect(players.seats().filter((s) => s.peerId)).toEqual([{ id: a, name: 'A', state: 'claimed', peerId: 'p1' }]);
    // The loser was told the seat is gone, and takes another one.
    expect(l2.last('admission-state').seats).toEqual([
      { id: a, name: 'A', available: false },
      { id: b, name: 'B', available: true },
    ]);
    l2.receive(join(b));
    expect(l2.last('join-result').accepted).toBe(true);
    expect(gameplayOf(l2)).toEqual(['surface-snapshot']);
    expect(l1.last('join-result').credential).not.toBe(l2.last('join-result').credential);
  });

  it('a wrong password claims nothing and sends no map; repeated failures are throttled', () => {
    const a = players.createSeat('A');
    players.setPassword('right');
    const link = connect('p1');
    link.receive(join(a, 'wrong'));
    expect(link.last('join-result')).toMatchObject({ accepted: false, reason: 'bad-password' });
    expect(players.seats()[0].state).toBe('available');
    for (let i = 0; i < 4; i++) link.receive(join(a, `wrong${i}`));
    link.receive(join(a, 'right'));
    expect(link.last('join-result')).toMatchObject({ accepted: false, reason: 'throttled' });
    expect(gameplayOf(link)).toEqual([]);
    // Another peer with the right password is not held back by this one.
    const other = connect('p2');
    other.receive(join(a, 'right'));
    expect(other.last('join-result').accepted).toBe(true);
  });

  it('a locked room refuses new claims even with the right password; admitted players stay; unlock admits', () => {
    const a = players.createSeat('A');
    const b = players.createSeat('B');
    players.setPassword('pw');
    const inside = connect('p1');
    inside.receive(join(a, 'pw'));
    const waiting = connect('p2');
    players.setLocked(true);
    expect(waiting.last('admission-state').locked).toBe(true); // told at once
    waiting.receive(join(b, 'pw'));
    expect(waiting.last('join-result')).toMatchObject({ accepted: false, reason: 'room-locked' });
    expect(inside.closed).toBe(false);
    expect(players.peerState('p1')).toBe('admitted');
    players.setLocked(false);
    waiting.receive(join(b, 'pw'));
    expect(waiting.last('join-result').accepted).toBe(true);
  });

  it('a password change affects new joins only and is never sent', () => {
    const a = players.createSeat('A');
    const b = players.createSeat('B');
    const inside = connect('p1');
    inside.receive(join(a));
    const waiting = connect('p2');
    players.setPassword('secret');
    expect(waiting.last('admission-state').passwordRequired).toBe(true);
    expect(players.peerState('p1')).toBe('admitted');
    waiting.receive(join(b));
    expect(waiting.last('join-result')).toMatchObject({ accepted: false, reason: 'bad-password' });
    players.setPassword(null);
    waiting.receive(join(b));
    expect(waiting.last('join-result').accepted).toBe(true);
    expect(JSON.stringify([...inside.sent, ...waiting.sent])).not.toContain('secret');
  });

  it('an admitted player cannot join again, claim another seat or send host messages', () => {
    const a = players.createSeat('A');
    const b = players.createSeat('B');
    const link = connect('p1');
    link.receive(join(a));
    const before = link.sent.length;
    link.receive(join(b));
    link.receive(rejoin(b, 'A'.repeat(43)));
    link.receive({ v: 1, type: 'session-ended', reason: 'kicked' });
    link.receive({ v: 1, type: 'admission-state', locked: false, passwordRequired: false, seats: [] });
    expect(link.sent.length).toBe(before);
    expect(players.seats().map((s) => s.state)).toEqual(['claimed', 'available']);
  });
});

describe('session players: publication delivery', () => {
  it('a commit reaches every admitted player and no waiting one; a late joiner gets the current map', () => {
    const seats = ['A', 'B', 'C'].map((n) => players.createSeat(n));
    const links = ['p1', 'p2', 'p3'].map((id, i) => {
      const l = connect(id);
      l.receive(join(seats[i]));
      return l;
    });
    const waiting = connect('p4');
    snapshot = { ...snapshot, revision: 4 };
    time.advance(200);
    players.committed();
    for (const l of links) expect(l.last('surface-snapshot').revision).toBe(4);
    expect(gameplayOf(waiting)).toEqual([]);
    const d = players.createSeat('D');
    waiting.receive(join(d));
    expect(waiting.last('surface-snapshot').revision).toBe(4);
  });

  it("one slow player's backpressure holds back nobody else", () => {
    const [a, b] = ['A', 'B'].map((n) => players.createSeat(n));
    const slow = connect('p1');
    const fast = connect('p2');
    slow.receive(join(a));
    fast.receive(join(b));
    slow.buffered = 10 * 1024 * 1024;
    snapshot = { ...snapshot, revision: 9 };
    time.advance(200);
    players.committed();
    expect(fast.last('surface-snapshot').revision).toBe(9);
    expect(slow.last('surface-snapshot').revision).toBe(3); // held (a flag), sent on drain
  });
});

describe('session players: leaving, disconnecting and DM actions', () => {
  function three() {
    const seats = ['A', 'B', 'C'].map((n) => players.createSeat(n));
    const links = ['pa', 'pb', 'pc'].map((id, i) => {
      const l = connect(id);
      l.receive(join(seats[i]));
      return l;
    });
    return { seats, links };
  }

  it('an unexpected disconnect leaves the seat claimed-disconnected; others carry on; nobody new can claim it', () => {
    const { seats, links } = three();
    const credential = links[0].last('join-result').credential;
    players.detach('pa');
    expect(players.seats()[0]).toMatchObject({ state: 'claimed-disconnected', peerId: null });
    snapshot = { ...snapshot, revision: 5 };
    time.advance(200);
    players.committed();
    expect(links[1].last('surface-snapshot').revision).toBe(5);
    expect(links[2].last('surface-snapshot').revision).toBe(5);
    expect(links[0].last('surface-snapshot').revision).toBe(3);
    const newcomer = connect('px');
    newcomer.receive(join(seats[0]));
    expect(newcomer.last('join-result')).toMatchObject({ accepted: false, reason: 'seat-unavailable' });
    // The credential still reclaims it (protocol level; automatic reconnect is Milestone 7), rotated.
    const back = connect('pa2');
    back.receive(rejoin(seats[0], credential));
    expect(back.last('join-result')).toMatchObject({ accepted: true, seat: { id: seats[0] } });
    expect(back.last('join-result').credential).not.toBe(credential);
    expect(back.last('surface-snapshot').revision).toBe(5);
  });

  it('a reclaim of a seat whose player is still connected is refused and changes nothing', () => {
    const { seats, links } = three();
    const credential = links[0].last('join-result').credential;
    const thief = connect('px');
    thief.receive(rejoin(seats[0], credential));
    expect(thief.last('join-result')).toMatchObject({ accepted: false, reason: 'seat-unavailable' });
    expect(links[0].closed).toBe(false);
    expect(players.peerState('pa')).toBe('admitted');
    expect(gameplayOf(thief)).toEqual([]);
  });

  it("leave releases the seat, ends that player's session and frees the seat for others", () => {
    const { links } = three();
    const waiting = connect('pw');
    links[1].receive({ v: 1, type: 'leave' });
    expect(links[1].last('session-ended')).toEqual({ v: 1, type: 'session-ended', reason: 'left' });
    expect(players.seats()[1].state).toBe('available');
    expect(waiting.last('admission-state').seats[1].available).toBe(true);
    time.advance(CLOSE_GRACE_MS);
    expect(links[1].closed).toBe(true);
    expect(links[0].closed || links[2].closed).toBe(false);
  });

  it('kick: only that player is told, dropped from the senders and closed; others are unaffected', () => {
    const { seats, links } = three();
    const waiting = connect('pw');
    const credential = links[1].last('join-result').credential;
    players.kickSeat(seats[1]);
    expect(links[1].last('session-ended')).toEqual({ v: 1, type: 'session-ended', reason: 'kicked' });
    expect(players.peerState('pb')).toBe('unadmitted');
    expect(waiting.last('admission-state').seats[1].available).toBe(true);
    // Messages from the kicked peer while it closes are ignored.
    links[1].receive({ v: 1, type: 'asset-request', assetIds: [ASSET_ID] });
    links[1].receive(join(seats[1]));
    snapshot = { ...snapshot, revision: 6 };
    time.advance(200);
    players.committed();
    expect(links[1].types().at(-1)).toBe('session-ended');
    expect(links[0].last('surface-snapshot').revision).toBe(6);
    expect(links[2].last('surface-snapshot').revision).toBe(6);
    time.advance(CLOSE_GRACE_MS);
    expect(links.map((l) => l.closed)).toEqual([false, true, false]);
    expect(players.diagnostics()).toMatchObject({ sendsBlocked: 0, snapshots: { peers: 2 }, assets: { peers: 2 } }); // dropped from the senders, not merely gated
    players.detach('pb');
    // Its credential is dead.
    const back = connect('pb2');
    back.receive(rejoin(seats[1], credential));
    expect(back.last('join-result')).toMatchObject({ accepted: false, reason: 'invalid-credential' });
  });

  it('reset and disable remove the player with their own reason; a disabled seat is not offered', () => {
    const { seats, links } = three();
    players.resetSeat(seats[0]);
    players.disableSeat(seats[2]);
    expect(links[0].last('session-ended').reason).toBe('seat-reset');
    expect(links[2].last('session-ended').reason).toBe('seat-disabled');
    const waiting = connect('pw');
    expect(waiting.last('admission-state').seats.map((s) => s.id)).toEqual([seats[0], seats[1]]);
    expect(players.peerState('pb')).toBe('admitted');
  });

  it('a rename changes the label only; the player stays', () => {
    const { seats, links } = three();
    const waiting = connect('pw');
    players.renameSeat(seats[0], 'Aria');
    expect(waiting.last('admission-state').seats[0].name).toBe('Aria');
    expect(links[0].closed).toBe(false);
    expect(players.peerState('pa')).toBe('admitted');
  });

  it('session end tells every open link, admitted or not, and the model forgets everything', () => {
    const { seats, links } = three();
    const waiting = connect('pw');
    players.end();
    for (const l of [...links, waiting]) expect(l.last('session-ended')).toEqual({ v: 1, type: 'session-ended', reason: 'ended' });
    expect(players.ended).toBe(true);
    expect(players.counts()).toEqual({ links: 0, admitted: 0, waiting: 0 });
    expect(players.seats()).toEqual([]);
    expect(players.attach('late', fakeLink())).toBe(false);
    expect(() => players.createSeat('again')).toThrow();
    void seats;
  });
});

describe('session players: bounds and policy', () => {
  it('the send gate holds on its own: a peer the senders still serve, but the model no longer admits, is sent nothing', () => {
    // Make the two layers disagree: the model stops admitting p1 (as a future model path might, without
    // reporting a disconnect), while the senders still hold p1 as a recipient.
    const real = createAdmissionModel({ now: time.now });
    let revoked = false;
    const admission = { ...real, admittedSeat: (id) => (revoked && id === 'p1' ? null : real.admittedSeat(id)) };
    setup({ admission });
    const a = players.createSeat('A');
    const link = connect('p1');
    link.receive(join(a));
    expect(link.last('surface-snapshot').revision).toBe(3);
    revoked = true;
    const sent = link.sent.length;
    snapshot = { ...snapshot, revision: 4 };
    time.advance(200);
    players.committed();
    // The snapshot sender still believes p1 is a recipient: it tried, and the gate refused.
    expect(players.diagnostics()).toMatchObject({ snapshots: { peers: 1 }, assets: { peers: 1 }, sendsBlocked: 1 });
    expect(link.sent.length).toBe(sent);
    expect(link.sent.filter((m) => m.type === 'surface-snapshot').map((m) => m.revision)).toEqual([3]);
  });

  it('the send gate holds on its own for an asset transfer already under way', () => {
    // A 3-chunk asset; the transfer starts while p1 is admitted and pauses on backpressure after its
    // metadata. Then only the model stops admitting p1: the asset sender still holds p1 and its
    // transfer, and resumes it when the channel drains.
    const real = createAdmissionModel({ now: time.now });
    let revoked = false;
    const admission = { ...real, admittedSeat: (id) => (revoked && id === 'p1' ? null : real.admittedSeat(id)) };
    setup({ admission });
    asset = { ...asset, bytes: new Uint8Array(40 * 1024) };
    const a = players.createSeat('A');
    const link = connect('p1');
    link.receive(join(a));
    link.buffered = 1024 * 1024; // the channel is busy: the transfer waits after its metadata
    link.receive({ v: 1, type: 'asset-request', assetIds: [ASSET_ID] });
    expect(link.types().slice(-1)).toEqual(['asset-meta']);
    expect(players.diagnostics().assets).toMatchObject({ peers: 1, activeTransfers: 1 });
    revoked = true;
    link.buffered = 0;
    time.advance(500); // the transfer resumes and tries its next chunk
    expect(link.types().filter((t) => t === 'chunk')).toEqual([]);
    expect(players.diagnostics()).toMatchObject({ assets: { peers: 1, activeTransfers: 1 }, sendsBlocked: 1 });
  });

  it('the senders know exactly the admitted peers, so the gate never has to refuse a send', () => {
    const [a, b] = ['A', 'B'].map((n) => players.createSeat(n));
    const senders = () => {
      const d = players.diagnostics();
      return [d.snapshots.peers, d.assets.peers];
    };
    const l1 = connect('p1');
    connect('p2');
    connect('p3');
    expect(senders()).toEqual([0, 0]);
    l1.receive(join(a));
    expect(senders()).toEqual([1, 1]);
    players.committed();
    players.kickSeat(a);
    expect(senders()).toEqual([0, 0]);
    const l4 = connect('p4');
    l4.receive(join(b));
    snapshot = { ...snapshot, revision: 8 };
    time.advance(200);
    players.committed();
    expect(senders()).toEqual([1, 1]);
    expect(players.diagnostics().sendsBlocked).toBe(0);
  });

  it("keeps at most MAX_PLAYER_LINKS links, the relay's room size", () => {
    expect(MAX_PLAYER_LINKS).toBe(RELAY_LIMITS.maxPeersPerRoom);
    for (let i = 0; i < MAX_PLAYER_LINKS; i++) connect(`p${i}`);
    const extra = fakeLink();
    expect(players.attach('extra', extra)).toBe(false);
    expect(extra.closed).toBe(true);
    expect(players.attach('p0', fakeLink())).toBe(false); // the same id twice
  });

  it('drops a flood of messages beyond the per-peer inbound limit unread', () => {
    const link = connect('p1');
    for (let i = 0; i < INBOUND_LIMIT.limit + 50; i++) link.receive('junk');
    expect(players.diagnostics()).toMatchObject({ protocolErrors: INBOUND_LIMIT.limit, messagesDropped: 50 });
  });

  it('never puts a credential or the password in diagnostics', () => {
    const a = players.createSeat('A');
    players.setPassword('hunter2');
    const link = connect('p1');
    link.receive(join(a, 'hunter2'));
    const text = JSON.stringify(players.diagnostics()) + JSON.stringify(players.seats());
    expect(text).not.toContain(link.last('join-result').credential);
    expect(text).not.toContain('hunter2');
  });
});
