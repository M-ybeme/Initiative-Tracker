// Live Share Milestone 2: the host's snapshot sender (js/modules/live-share/snapshot-sender.js):
// throttling with latest-state-wins, the immediate first snapshot, and channel backpressure.
// Time is a hand-driven clock, so every timing below is exact.
import { describe, it, expect, beforeEach } from 'vitest';
import { createSnapshotSender, SNAPSHOT_INTERVAL_MS, SNAPSHOT_BUSY_BYTES } from '../../js/modules/live-share/snapshot-sender.js';

// A clock and timer queue under the test's control.
function fakeTime() {
  let t = 1000;
  let timers = [];
  let nextId = 1;
  return {
    now: () => t,
    setTimer: (fn, ms) => {
      const id = nextId++;
      timers.push({ id, at: t + ms, fn });
      return id;
    },
    clearTimer: (id) => {
      timers = timers.filter((x) => x.id !== id);
    },
    pending: () => timers.length,
    advance(ms) {
      const end = t + ms;
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        const next = timers[0];
        if (!next || next.at > end) break;
        timers.shift();
        t = next.at;
        next.fn();
      }
      t = end;
    },
  };
}

// A stand-in for PeerLink: records what it is sent, with a settable buffered amount.
function fakeLink() {
  const listeners = new Map();
  return {
    sent: [],
    buffered: 0,
    open: true,
    send(text) {
      if (!this.open) return false;
      this.sent.push(JSON.parse(text));
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
    listenerCount: (type) => listeners.get(type)?.size || 0,
    drain() {
      this.buffered = 0;
      for (const fn of listeners.get('drain') || []) fn();
    },
    revisions() {
      return this.sent.map((m) => m.payload.revision);
    },
  };
}

// A stand-in for the Milestone 1 seam: a revision that moves when the test changes the "map".
function fakeSeam() {
  let revision = 1;
  let x = 0;
  return {
    reads: 0,
    change() {
      revision += 1;
      x += 10;
    },
    getPlayerSafeState() {
      this.reads += 1;
      return { schema: 'dmtoolbox.battlemap.player-safe', version: 1, revision, tokens: [{ id: 't', x }] };
    },
    get revision() {
      return revision;
    },
  };
}

let time;
let seam;
let sender;
beforeEach(() => {
  time = fakeTime();
  seam = fakeSeam();
  sender = createSnapshotSender({ getSnapshot: () => seam.getPlayerSafeState(), now: time.now, setTimer: time.setTimer, clearTimer: time.clearTimer });
});

describe('snapshot sender', () => {
  it('uses a 100 ms interval', () => {
    expect(SNAPSHOT_INTERVAL_MS).toBe(100);
  });

  it('sends the current snapshot to a player the moment its channel opens, unthrottled', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    expect(link.sent).toEqual([{ v: 0, type: 'battlemap-snapshot', payload: seam.getPlayerSafeState() }]);
    // A second player joining right after still gets it at once.
    const link2 = fakeLink();
    sender.addPeer('p2', link2);
    expect(link2.revisions()).toEqual([1]);
  });

  it('never sends inside the change signal itself (the Battle Map is mid-render then)', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    time.advance(500);
    seam.change();
    sender.notifyChanged();
    expect(link.revisions()).toEqual([1]);
    time.advance(0);
    expect(link.revisions()).toEqual([1, 2]);
  });

  it('collapses a burst into one send per interval and always sends the final state', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    time.advance(1000);
    // A 60 fps drag for half a second: 30 changes, one every ~16 ms.
    for (let i = 0; i < 30; i++) {
      seam.change();
      sender.notifyChanged();
      time.advance(16);
    }
    time.advance(SNAPSHOT_INTERVAL_MS); // let the trailing send go
    const revisions = link.revisions();
    expect(revisions[revisions.length - 1]).toBe(seam.revision); // the last state arrived
    expect(revisions.length - 1).toBeLessThanOrEqual(Math.ceil((30 * 16) / SNAPSHOT_INTERVAL_MS) + 1);
    expect(revisions.length - 1).toBeGreaterThanOrEqual(4);
    expect(revisions).toEqual([...revisions].sort((a, b) => a - b)); // only ever forward
    expect(sender.diagnostics()).toMatchObject({ lastSnapshotSentRevision: seam.revision, sendScheduled: false });
    expect(sender.diagnostics().changesCoalesced).toBeGreaterThan(20);
  });

  it('sends the state current at send time, not the state at the time of the signal', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    seam.change();
    sender.notifyChanged(); // revision 2 signalled...
    seam.change();
    seam.change(); // ...but by the time the timer fires the map is at revision 4
    time.advance(SNAPSHOT_INTERVAL_MS);
    expect(link.revisions()).toEqual([1, 4]);
  });

  it('keeps at most one timer, whatever the number of signals', () => {
    sender.addPeer('p1', fakeLink());
    for (let i = 0; i < 1000; i++) {
      seam.change();
      sender.notifyChanged();
    }
    expect(time.pending()).toBe(1);
  });

  it('does not resend a revision a player already has', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    sender.notifyChanged(); // e.g. a signal for a revision that was already sent
    time.advance(SNAPSHOT_INTERVAL_MS);
    expect(link.revisions()).toEqual([1]);
  });

  it('holds back while a channel is busy, as a flag, and sends only the latest state when it drains', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    link.buffered = SNAPSHOT_BUSY_BYTES + 1;
    for (let i = 0; i < 50; i++) {
      seam.change();
      sender.notifyChanged();
      time.advance(SNAPSHOT_INTERVAL_MS);
    }
    // Nothing was piled onto the busy channel, and nothing was queued: one pending flag.
    expect(link.revisions()).toEqual([1]);
    expect(sender.diagnostics()).toMatchObject({ pendingSnapshot: true, pendingPeers: 1, snapshotSendThrottled: 1 });
    link.drain();
    expect(link.revisions()).toEqual([1, seam.revision]);
    expect(sender.diagnostics()).toMatchObject({ pendingSnapshot: false, pendingPeers: 0 });
    // A drain with nothing pending sends nothing.
    link.drain();
    expect(link.revisions()).toEqual([1, seam.revision]);
  });

  it('a busy player does not hold back the others', () => {
    const slow = fakeLink();
    const fast = fakeLink();
    sender.addPeer('slow', slow);
    sender.addPeer('fast', fast);
    slow.buffered = SNAPSHOT_BUSY_BYTES * 4;
    seam.change();
    sender.notifyChanged();
    time.advance(SNAPSHOT_INTERVAL_MS);
    expect(fast.revisions()).toEqual([1, 2]);
    expect(slow.revisions()).toEqual([1]);
  });

  it('a player that is busy when it joins gets the map once its channel drains', () => {
    const link = fakeLink();
    link.buffered = SNAPSHOT_BUSY_BYTES + 1;
    sender.addPeer('p1', link);
    expect(link.sent).toEqual([]);
    link.drain();
    expect(link.revisions()).toEqual([1]);
  });

  it('stops sending to a removed player and drops its drain listener', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    expect(link.listenerCount('drain')).toBe(1);
    sender.removePeer('p1');
    expect(link.listenerCount('drain')).toBe(0);
    seam.change();
    sender.notifyChanged();
    time.advance(SNAPSHOT_INTERVAL_MS);
    expect(link.revisions()).toEqual([1]);
  });

  it('does not read the seam while no player is connected', () => {
    seam.change();
    sender.notifyChanged();
    time.advance(SNAPSHOT_INTERVAL_MS);
    expect(seam.reads).toBe(0);
  });

  it('skips a snapshot too large to send and counts it', () => {
    const big = createSnapshotSender({
      getSnapshot: () => ({ revision: 1, padding: 'x'.repeat(300 * 1024) }),
      now: time.now,
      setTimer: time.setTimer,
      clearTimer: time.clearTimer,
    });
    const link = fakeLink();
    big.addPeer('p1', link);
    expect(link.sent).toEqual([]);
    expect(big.diagnostics().snapshotsTooLarge).toBe(1);
  });

  it('survives a seam that throws', () => {
    const broken = createSnapshotSender({
      getSnapshot: () => {
        throw new Error('seam failed');
      },
    });
    const link = fakeLink();
    expect(() => broken.addPeer('p1', link)).not.toThrow();
    expect(broken.diagnostics().snapshotErrors).toBe(1);
  });

  it('dispose cancels the scheduled send and forgets every player', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    seam.change();
    sender.notifyChanged();
    sender.dispose();
    expect(time.pending()).toBe(0);
    time.advance(1000);
    expect(link.revisions()).toEqual([1]);
    expect(sender.diagnostics().peers).toBe(0);
  });

  it('diagnostics are counts and revisions only', () => {
    sender.addPeer('p1', fakeLink());
    const diag = sender.diagnostics();
    expect(Object.keys(diag).sort()).toEqual(
      ['changesCoalesced', 'lastSnapshotSentRevision', 'pendingPeers', 'pendingSnapshot', 'peers', 'sendScheduled', 'snapshotErrors', 'snapshotSendThrottled', 'snapshotsSent', 'snapshotsTooLarge'].sort()
    );
    for (const value of Object.values(diag)) expect(['number', 'boolean']).toContain(typeof value);
  });
});

describe('snapshot sender: event-driven sends (sendNow, Milestone 5A.2)', () => {
  it('sends at once, inside the event, after a quiet spell (no timer involved)', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    time.advance(500);
    seam.change();
    sender.sendNow();
    expect(link.revisions()).toEqual([1, 2]); // flushed in the call
    expect(time.pending()).toBe(0);
  });

  it('within the interval it coalesces into one trailing send of the latest state', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    time.advance(500);
    seam.change();
    sender.sendNow(); // sent: 2
    time.advance(10);
    seam.change();
    sender.sendNow(); // too soon: scheduled, not sent
    expect(link.revisions()).toEqual([1, 2]);
    seam.change();
    sender.sendNow(); // still the same single schedule
    expect(time.pending()).toBe(1);
    expect(link.revisions()).toEqual([1, 2]);
    time.advance(SNAPSHOT_INTERVAL_MS);
    expect(link.revisions()).toEqual([1, 2, 4]); // the latest state, once
  });

  it('a throttled timer that is already late does not hold the snapshot: the next event sends it', () => {
    // A hidden tab: the clock moves on but timers have not run (they fire about once a second).
    let clock = 1000;
    const timers = [];
    const throttled = createSnapshotSender({
      getSnapshot: () => seam.getPlayerSafeState(),
      now: () => clock,
      setTimer: (fn, ms) => timers.push({ fn, ms }) && timers.length,
      clearTimer: (id) => (timers[id - 1] = null),
    });
    const link = fakeLink();
    throttled.addPeer('p1', link);
    clock += 500;
    seam.change();
    throttled.sendNow(); // sent: 2
    clock += 10;
    seam.change();
    throttled.sendNow(); // too soon: a 100 ms timer is scheduled...
    expect(timers.filter(Boolean)).toHaveLength(1);
    clock += 140; // ...and 140 ms later it still hasn't run
    seam.change();
    throttled.sendNow(); // the event releases the latest state itself
    expect(link.revisions()).toEqual([1, 2, 4]);
    expect(timers.filter(Boolean)).toHaveLength(0); // the late timer was cancelled: no second send
  });

  it('keeps backpressure: a busy channel only marks the player pending; the drain sends the latest', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    time.advance(500);
    link.buffered = SNAPSHOT_BUSY_BYTES + 1;
    seam.change();
    sender.sendNow(); // it flushes, but the busy player is only marked pending: nothing is sent
    expect(link.revisions()).toEqual([1]);
    expect(time.pending()).toBe(0); // flushed in the call, not scheduled
    expect(sender.diagnostics()).toMatchObject({ pendingSnapshot: true, snapshotSendThrottled: 1 });
    seam.change();
    link.drain();
    expect(link.revisions()).toEqual([1, 3]); // latest wins
  });

  it('does not flood: a stream of events sends at most once per interval, ending on the final state', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    time.advance(1000);
    for (let i = 0; i < 50; i++) {
      seam.change();
      sender.sendNow();
      time.advance(10);
    }
    time.advance(SNAPSHOT_INTERVAL_MS);
    const sends = link.revisions().length - 1;
    expect(sends).toBeLessThanOrEqual(Math.ceil((50 * 10) / SNAPSHOT_INTERVAL_MS) + 1);
    expect(link.revisions().at(-1)).toBe(seam.revision);
    expect(new Set(link.revisions()).size).toBe(link.revisions().length); // never the same revision twice
  });

  it('returns nothing, and with no players a flush sends nothing', () => {
    time.advance(500);
    seam.change();
    expect(sender.sendNow()).toBeUndefined();
    expect(sender.diagnostics()).toMatchObject({ snapshotsSent: 0, peers: 0, sendScheduled: false });
    expect(seam.reads).toBe(0); // with no players the seam is not even read
  });

  it('notifyChanged keeps its timer-only behavior (the Battle Map prototype signals from a render)', () => {
    const link = fakeLink();
    sender.addPeer('p1', link);
    time.advance(500);
    seam.change();
    sender.notifyChanged();
    expect(link.revisions()).toEqual([1]);
    time.advance(0);
    expect(link.revisions()).toEqual([1, 2]);
  });
});
