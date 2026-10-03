// Live Share Milestone 5A.3: the surface ↔ session host boundary. The envelope and message checks
// (surface-boundary.js), the host side (session-host-boundary.js: registration, roles, liveness,
// session gating), the surface side (surface-publisher.js), and the host serving players from its
// publication store through the real SnapshotSender and AssetSender. BroadcastChannel is an in-memory
// bus that copies and delivers asynchronously (tests/helpers/live-share-boundary.js).
import { describe, it, expect, beforeEach } from 'vitest';
import { createBus, makeAsset, battleMapContent, publication } from '../helpers/live-share-boundary.js';
import {
  parseSurfaceMessage,
  parseHostMessage,
  envelope,
  newInstanceId,
  isInstanceId,
  CONTROL_CHANNEL,
  surfaceDataChannel,
  BOUNDARY_MARKER,
  BOUNDARY_PROTOCOL_VERSION,
  NOT_RESPONDING_MS,
} from '../../js/modules/live-share/surface-boundary.js';
import { createSessionHostBoundary, MAX_REGISTERED } from '../../js/modules/live-share/session-host-boundary.js';
import { createSurfacePublisher } from '../../js/modules/live-share/surface-publisher.js';
import { createPublicationStore } from '../../js/modules/live-share/publication-store.js';
import { battleMapSurface, BATTLE_MAP_SURFACE_VERSION } from '../../js/modules/live-share/battlemap-publication.js';
import { createSnapshotSender } from '../../js/modules/live-share/snapshot-sender.js';
import { createAssetSender } from '../../js/modules/live-share/asset-sender.js';
import { parseChannelMessage, PROTOCOL_VERSION } from '../../js/modules/live-share/protocol.js';

const BM = 'battle-map';
const ID1 = 'a'.repeat(32);
const ID2 = 'b'.repeat(32);

describe('boundary envelope and messages (surface-boundary.js)', () => {
  const hello = (fields = {}, env = {}) => ({ ...envelope('surface-hello', ID1, { surface: BM, surfaceVersion: 1, hasPublication: false, ...fields }, 'host'), ...env });

  it('accepts a good surface-hello and copies only known fields', () => {
    const parsed = parseSurfaceMessage(hello());
    expect(parsed).toEqual({ ok: true, message: { type: 'surface-hello', from: ID1, surface: BM, surfaceVersion: 1, hasPublication: false } });
  });

  it('refuses a wrong marker, version, type, sender, recipient or unknown field', () => {
    for (const bad of [
      hello({}, { ch: 'other' }),
      hello({}, { v: BOUNDARY_PROTOCOL_VERSION + 1 }),
      hello({}, { v: 0 }),
      hello({}, { type: 'surface-hullo' }),
      hello({}, { type: 42 }),
      hello({}, { from: 'host' }),
      hello({}, { from: 'short' }),
      hello({}, { from: 'x'.repeat(65) }),
      hello({}, { from: 'has spaces in it!!' }),
      hello({}, { to: undefined }),
      hello({}, { to: ID2 }),
      hello({ extra: 1 }),
      hello({ seats: [] }),
      hello({ surface: 'notes' }),
      hello({ surface: '__proto__' }),
      hello({ surfaceVersion: '1' }),
      hello({ surfaceVersion: 0 }),
      hello({ hasPublication: 'yes' }),
      null,
      'surface-hello',
      [],
    ]) {
      expect(parseSurfaceMessage(bad).ok).toBe(false);
    }
  });

  it('checks publication-offer metadata against the Milestone 3 asset limits', async () => {
    const bg = await makeAsset('background');
    const offer = (assets, extra = {}) => envelope('publication-offer', ID1, { publicationSeq: 1, structured: battleMapContent(), assets, ...extra }, 'host');
    expect(parseSurfaceMessage(offer([bg.meta])).ok).toBe(true);
    for (const bad of [
      offer([{ ...bg.meta, byteLength: 16 * 1024 * 1024 + 1 }]),
      offer([{ ...bg.meta, width: 9000 }]),
      offer([{ ...bg.meta, kind: 'token' }]), // 1400 px is over the token limit
      offer([{ ...bg.meta, kind: 'fog' }]),
      offer([{ ...bg.meta, mime: 'image/svg+xml' }]),
      offer([{ ...bg.meta, assetId: 'A'.repeat(64) }]),
      offer([{ ...bg.meta, url: 'https://example.com/a.png' }]),
      offer([bg.meta, bg.meta]),
      offer(bg.meta),
      offer([bg.meta], { publicationSeq: 0 }),
      offer([bg.meta], { publicationSeq: 1.5 }),
      offer([bg.meta], { publicationSeq: Number.MAX_SAFE_INTEGER + 1 }),
      offer([bg.meta], { structured: 'x' }),
      offer(Array(502).fill(bg.meta)),
    ]) {
      expect(parseSurfaceMessage(bad).ok).toBe(false);
    }
  });

  it('asset bytes travel only on a data channel, as an ArrayBuffer, never a URL', async () => {
    const bg = await makeAsset('background');
    const { assetId, ...meta } = bg.meta;
    const msg = (extra = {}) => envelope('publication-asset', ID1, { publicationSeq: 1, assetId, meta, bytes: bg.bytes.slice().buffer, ...extra }, 'host');
    expect(parseSurfaceMessage(msg(), 'data').ok).toBe(true);
    expect(parseSurfaceMessage(msg(), 'control').ok).toBe(false);
    expect(parseSurfaceMessage(envelope('surface-heartbeat', ID1, {}, 'host'), 'data').ok).toBe(false);
    expect(parseSurfaceMessage(msg({ bytes: 'https://example.com/map.png' }), 'data').ok).toBe(false);
    expect(parseSurfaceMessage(msg({ bytes: new Uint8Array(4) }), 'data').ok).toBe(false);
    expect(parseSurfaceMessage(msg({ meta: { ...meta, extra: 1 } }), 'data').ok).toBe(false);
  });

  it('a surface acts only on host messages addressed to it (or broadcast), from the host', () => {
    const role = (to, from = 'host') => ({ ...envelope('surface-role', from, { active: true, reason: 'registered' }, to) });
    expect(parseHostMessage(role(ID1), ID1).ok).toBe(true);
    expect(parseHostMessage(role(ID2), ID1)).toEqual({ ok: false, error: 'not for this instance' });
    expect(parseHostMessage(role(undefined), ID1).ok).toBe(false);
    expect(parseHostMessage(role(ID1, ID2), ID1).ok).toBe(false);
    expect(parseHostMessage(envelope('host-hello', 'host', { sessionActive: true }), ID1).ok).toBe(true);
    expect(parseHostMessage(envelope('host-hello', 'host', { sessionActive: true }, ID1), ID1).ok).toBe(false);
    expect(parseHostMessage(envelope('session-status', 'host', { running: true, players: 2 }), ID1).ok).toBe(true);
    expect(parseHostMessage(envelope('session-status', 'host', { running: true, players: 2, seats: ['Caleb'] }), ID1).ok).toBe(false);
    expect(parseHostMessage(envelope('publication-rejected', 'host', { publicationSeq: 1, reason: 'Error: boom at line 3' }, ID1), ID1).ok).toBe(false);
  });

  it('instance ids are random and well-formed', () => {
    const a = newInstanceId();
    expect(isInstanceId(a)).toBe(true);
    expect(newInstanceId()).not.toBe(a);
  });
});

// ---- host and surfaces over the bus -----------------------------------------------------------------

function fakeLink() {
  const sent = [];
  const handlers = new Map();
  return {
    sent,
    buffered: 0,
    send(data) {
      sent.push(data);
      return true;
    },
    bufferedAmount() {
      return this.buffered;
    },
    on(event, fn) {
      handlers.set(event, fn);
    },
    off(event) {
      handlers.delete(event);
    },
    snapshots: () => sent.filter((d) => typeof d === 'string').map(parseChannelMessage).filter((p) => p.ok && p.message.type === 'battlemap-snapshot').map((p) => p.message.snapshot),
    binary: () => sent.filter((d) => typeof d !== 'string'),
    metas: () => sent.filter((d) => typeof d === 'string').map(parseChannelMessage).filter((p) => p.ok && p.message.type === 'asset-meta').map((p) => p.message.asset),
  };
}

function setup({ supported = { [BM]: [BATTLE_MAP_SURFACE_VERSION] } } = {}) {
  const bus = createBus();
  let clock = 1000;
  const store = createPublicationStore({ surfaces: [battleMapSurface] });
  const committed = [];
  // The host page's wiring (js/live-share-host.js): senders read the store, a commit sends now.
  const sender = createSnapshotSender({ getSnapshot: () => store.snapshot(BM), now: () => clock, setTimer: () => 1, clearTimer: () => {} });
  const assetSender = createAssetSender({ protocolVersion: PROTOCOL_VERSION, getAsset: (id) => store.getAsset(BM, id), hasAsset: (id) => store.hasAsset(BM, id), setTimer: () => 1, clearTimer: () => {} });
  const host = createSessionHostBoundary({
    store,
    supported,
    openChannel: bus.open,
    now: () => clock,
    onCommitted: (surface, result) => {
      committed.push({ surface, revision: result.revision });
      clock += 1000; // a later event: outside the sender's throttle
      sender.sendNow();
      assetSender.assetsChanged();
    },
  });
  const surfaces = [];
  function surface({ pub = null, version = BATTLE_MAP_SURFACE_VERSION, assets = [], id } = {}) {
    const state = { pub, assets: new Map(assets.map((a) => [a.meta.assetId, a])) };
    const s = createSurfacePublisher({
      surface: BM,
      surfaceVersion: version,
      instanceId: id,
      getPublication: () => state.pub,
      getAsset: (assetId) => state.assets.get(assetId) || null,
      openChannel: bus.open,
      setRepeat: () => 1,
      clearRepeat: () => {},
      win: null,
    });
    s.state = state;
    s.set = (pubNext, assetsNext = []) => {
      state.pub = pubNext;
      for (const a of assetsNext) state.assets.set(a.meta.assetId, a);
    };
    surfaces.push(s);
    return s;
  }
  return {
    bus,
    store,
    host,
    sender,
    assetSender,
    committed,
    surface,
    tick: (ms) => (clock += ms),
    roleOf: (id) => host.surfaces().find((s) => s.instance === id.slice(0, 8)),
  };
}

describe('session host boundary: registration and roles', () => {
  let t;
  beforeEach(() => {
    t = setup();
  });

  it('a host that starts asks open surfaces to announce themselves; a surface that opens later finds the host', async () => {
    const early = t.surface();
    early.start();
    await t.bus.settle();
    expect(t.host.surfaces()).toEqual([]); // no host yet: nothing answered
    t.host.start();
    await t.bus.settle();
    expect(t.host.surfaces()).toMatchObject([{ surface: BM, active: true, liveness: 'open', compatible: true }]);
    const late = t.surface();
    late.start();
    await t.bus.settle();
    expect(t.host.surfaces().map((s) => s.active)).toEqual([true, false]); // the latest registration publishes
    expect(late.status()).toMatchObject({ active: true, roleReason: 'registered' });
    expect(early.status()).toMatchObject({ active: false, roleReason: 'superseded' });
  });

  it('an unsupported surface version registers (the DM sees it) but never publishes', async () => {
    t.host.start();
    t.host.setSession({ running: true, players: 0 });
    const old = t.surface({ version: BATTLE_MAP_SURFACE_VERSION + 1, pub: publication(battleMapContent()) });
    old.start();
    await t.bus.settle();
    expect(t.host.surfaces()).toMatchObject([{ compatible: false, active: false }]);
    expect(old.status()).toMatchObject({ active: false, roleReason: 'incompatible' });
    // Even a forced offer and a claim are refused.
    t.bus.inject(CONTROL_CHANNEL, envelope('publication-offer', old.status().instanceId, { publicationSeq: 1, structured: battleMapContent(), assets: [] }, 'host'));
    old.claim();
    await t.bus.settle();
    expect(t.store.snapshot(BM)).toBeNull();
    expect(t.host.diagnostics()).toMatchObject({ offersRefused: 1, lastRejection: 'incompatible' });
  });

  it('the initiative surface is recognized but has no supported version yet', async () => {
    t.host.start();
    await t.bus.settle();
    t.bus.inject(CONTROL_CHANNEL, envelope('surface-hello', ID1, { surface: 'initiative', surfaceVersion: 1, hasPublication: true }, 'host'));
    await t.bus.settle();
    expect(t.host.surfaces()).toMatchObject([{ surface: 'initiative', compatible: false, active: false }]);
  });

  it('malformed, spoofed or unregistered messages change nothing', async () => {
    t.host.start();
    t.host.setSession({ running: true, players: 0 });
    for (const bad of [
      { type: 'publication-offer' },
      envelope('publication-offer', ID1, { publicationSeq: 1, structured: battleMapContent(), assets: [] }, 'host'), // never said hello
      envelope('surface-hello', ID1, { surface: BM, surfaceVersion: 1, hasPublication: false }), // no recipient
      { ...envelope('surface-hello', ID1, { surface: BM, surfaceVersion: 1, hasPublication: false }, 'host'), v: 2 },
      envelope('host-hello', 'host', { sessionActive: true }), // the host's own type, from someone else
    ]) {
      t.bus.inject(CONTROL_CHANNEL, bad);
    }
    await t.bus.settle();
    expect(t.host.surfaces()).toEqual([]);
    expect(t.store.snapshot(BM)).toBeNull();
    expect(t.host.diagnostics()).toMatchObject({ refused: 5, unknownInstance: 1 });
  });

  it('a re-hello (answering host-hello) re-sends the role without stealing it; a claim takes it', async () => {
    t.host.start();
    const a = t.surface();
    const b = t.surface();
    a.start();
    await t.bus.settle();
    b.start();
    await t.bus.settle();
    t.host.setSession({ running: true, players: 0 }); // host-hello: both say hello again
    await t.bus.settle();
    expect(b.status().active).toBe(true);
    expect(a.status().active).toBe(false);
    a.start(); // the older tab says hello again, last
    await t.bus.settle();
    expect(b.status().active).toBe(true);
    expect(a.status()).toMatchObject({ active: false, roleReason: 'superseded' });
    a.claim();
    await t.bus.settle();
    expect(a.status()).toMatchObject({ active: true, roleReason: 'claimed' });
    expect(b.status()).toMatchObject({ active: false, roleReason: 'superseded' });
  });

  it('a tab with nothing to publish never takes the role from one that has something; once it has something it does (the latest registration)', async () => {
    t.host.start();
    t.host.setSession({ running: true, players: 0 });
    const content = (x) => publication(battleMapContent({ tokens: [{ id: 't1', x, y: 0, w: 1, h: 1 }] }));
    const a = t.surface({ pub: content(70) });
    a.start();
    await t.bus.settle();
    const empty = t.surface(); // still loading, or no map
    empty.start();
    await t.bus.settle();
    expect(a.status().active).toBe(true);
    expect(empty.status()).toMatchObject({ active: false, roleReason: 'superseded' });
    a.set(content(700));
    a.publish();
    await t.bus.settle();
    expect(t.store.snapshot(BM).tokens[0].x).toBe(700); // updates keep flowing from the tab that has a map
    // The other tab gets a map: it says hello again and, being the newer registration, publishes.
    empty.set(content(5));
    expect(empty.publish()).toBe(false); // not yet the publisher: it tells the host instead
    await t.bus.settle();
    expect(empty.status()).toMatchObject({ active: true, roleReason: 'registered' });
    expect(a.status()).toMatchObject({ active: false, roleReason: 'superseded' });
    expect(t.store.snapshot(BM).tokens[0].x).toBe(5);
  });

  it('a claim outranks a tab held back for being empty', async () => {
    t.host.start();
    t.host.setSession({ running: true, players: 0 });
    const content = (x) => publication(battleMapContent({ tokens: [{ id: 't1', x, y: 0, w: 1, h: 1 }] }));
    const a = t.surface({ pub: content(70) });
    a.start();
    await t.bus.settle();
    const later = t.surface();
    later.start();
    await t.bus.settle();
    a.claim(); // the DM chose tab A
    await t.bus.settle();
    later.set(content(5));
    later.publish();
    await t.bus.settle();
    expect(a.status().active).toBe(true);
    expect(t.store.snapshot(BM).tokens[0].x).toBe(70);
  });

  it('a tab that gets something to publish takes the role from an active tab that has nothing', async () => {
    t.host.start();
    t.host.setSession({ running: true, players: 0 });
    const blank = t.surface();
    blank.start();
    await t.bus.settle();
    const loading = t.surface();
    loading.start();
    await t.bus.settle();
    expect(loading.status().active).toBe(true);
    blank.set(publication(battleMapContent()));
    blank.publish();
    await t.bus.settle();
    expect(blank.status()).toMatchObject({ active: true, roleReason: 'registered' });
    expect(t.store.snapshot(BM)).toMatchObject({ revision: 1 });
  });

  it('other surfaces’ messages on the control channel are not counted as protocol errors', async () => {
    t.host.start();
    const a = t.surface();
    const b = t.surface();
    a.start();
    b.start();
    await t.bus.settle();
    expect(a.status().protocolErrors).toBe(0);
    t.bus.inject(CONTROL_CHANNEL, { ...envelope('surface-role', 'host', { active: true, reason: 'bogus' }, a.status().instanceId) });
    await t.bus.settle();
    expect(a.status().protocolErrors).toBe(1); // a malformed host message still is
  });

  it('rapid competing registrations end with exactly one active publisher, the last one', async () => {
    t.host.start();
    const many = Array.from({ length: 6 }, () => t.surface());
    many.forEach((s) => s.start());
    await t.bus.settle();
    expect(t.host.surfaces().filter((s) => s.active)).toHaveLength(1);
    expect(many.map((s) => s.status().active)).toEqual([false, false, false, false, false, true]);
  });
});

// The external review of 5A.3 reproduced two holes in the role rule (an empty tab promoted in place of
// a silent publisher kept it locked out; an older held-back tab beat a newer registration). These run
// the real host and surface modules over the in-memory bus.
describe('session host boundary: the role rule', () => {
  let t;
  beforeEach(() => {
    t = setup();
    t.host.start();
    t.host.setSession({ running: true, players: 0 });
  });
  const content = (x) => publication(battleMapContent({ tokens: [{ id: 't1', x, y: 0, w: 1, h: 1 }] }));
  const x = () => t.store.snapshot(BM).tokens[0].x;
  const rec = (s) => t.host.surfaces().find((r) => r.instance === s.status().instanceId.slice(0, 8));
  const heartbeat = (s) => t.bus.inject(CONTROL_CHANNEL, envelope('surface-heartbeat', s.status().instanceId, {}, 'host'));
  const hellos = (s) => t.bus.log.filter((e) => e.msg.type === 'surface-hello' && e.msg.from === s.status().instanceId).length;
  async function open(pub) {
    const s = t.surface({ pub });
    s.start();
    await t.bus.settle();
    return s;
  }

  it('A: a publisher that went silent and comes back is not locked out by the empty tab promoted meanwhile', async () => {
    const a = await open(content(70)); // map X
    const e = await open(null); // empty: held back
    expect(rec(e)).toMatchObject({ active: false, heldBack: true });
    t.tick(NOT_RESPONDING_MS + 1);
    heartbeat(e);
    await t.bus.settle();
    t.host.checkLiveness();
    await t.bus.settle();
    expect(rec(a)).toMatchObject({ liveness: 'not-responding', active: false });
    expect(e.status()).toMatchObject({ active: true, roleReason: 'promoted' }); // the only responding tab
    // A responds again: a heartbeat alone changes no role.
    heartbeat(a);
    await t.bus.settle();
    expect(rec(a)).toMatchObject({ liveness: 'open', active: false });
    // A publishes map Y: it re-announces that it has something, once, and the empty E yields.
    const before = hellos(a);
    a.set(content(700));
    expect(a.publish()).toBe(false);
    await t.bus.settle();
    expect(hellos(a)).toBe(before + 1);
    expect(a.status()).toMatchObject({ active: true });
    expect(e.status()).toMatchObject({ active: false, roleReason: 'superseded' });
    expect(x()).toBe(700); // Y committed: players are no longer stuck on X
    a.set(content(800));
    a.publish();
    await t.bus.settle();
    expect(x()).toBe(800);
    expect(hellos(a)).toBe(before + 1); // publishing while active sends no hellos
  });

  it('B: an older held-back tab never takes the role from a newer registration (A / B / C)', async () => {
    const a = await open(content(70));
    const b = await open(null);
    expect(rec(b)).toMatchObject({ active: false, heldBack: true });
    const c = await open(content(300));
    expect(c.status().active).toBe(true);
    expect(a.status().active).toBe(false);
    expect(rec(b)).toMatchObject({ active: false, heldBack: false }); // no stale standing left behind
    expect(x()).toBe(300);
    b.set(content(5));
    b.publish();
    await t.bus.settle();
    expect(c.status().active).toBe(true);
    expect(b.status().active).toBe(false);
    expect(x()).toBe(300);
    // Its direct offer is not authoritative either.
    t.bus.inject(CONTROL_CHANNEL, envelope('publication-offer', b.status().instanceId, { publicationSeq: 50, ...content(6) }, 'host'));
    await t.bus.settle();
    expect(t.host.diagnostics().lastRejection).toBe('inactive');
    expect(x()).toBe(300);
  });

  it('B: a held-back tab takes the role only while it is newer than the active one (order guard)', async () => {
    await open(content(70)); // A, active
    const b = await open(null); // held back
    const c = await open(null); // held back, newer than B
    c.set(content(300));
    c.publish();
    await t.bus.settle();
    expect(c.status().active).toBe(true); // newer than A, held back only for being empty
    expect(rec(b)).toMatchObject({ heldBack: true }); // still held back, but now older than the active tab
    b.set(content(5));
    b.publish();
    await t.bus.settle();
    expect(c.status().active).toBe(true);
    expect(b.status().active).toBe(false);
    expect(x()).toBe(300);
  });

  it('C: a claimed tab with something to publish keeps the role: republishing, new tabs, heartbeats and silence don’t displace it for good', async () => {
    const a = await open(content(70));
    const b = await open(content(140));
    expect(x()).toBe(140);
    a.claim();
    await t.bus.settle();
    expect(a.status()).toMatchObject({ active: true, roleReason: 'claimed' });
    expect(x()).toBe(70);
    // The other tab keeps publishing: one hello for its lost role, then nothing more, and no takeover.
    const before = hellos(b);
    for (const v of [141, 142, 143]) {
      b.set(content(v));
      b.publish();
      await t.bus.settle();
    }
    expect(hellos(b)).toBe(before + 1);
    expect(a.status().active).toBe(true);
    expect(x()).toBe(70);
    // A newer registration with a map does not outrank the claim; heartbeats and re-hellos change nothing.
    const d = await open(content(400));
    expect(d.status().active).toBe(false);
    for (const s of [a, b, d]) heartbeat(s);
    b.start(); // a re-hello
    await t.bus.settle();
    expect(a.status().active).toBe(true);
    expect(x()).toBe(70);
    // A goes silent: the newest responding tab with a map takes over meanwhile (status, not data).
    t.tick(NOT_RESPONDING_MS + 1);
    heartbeat(b);
    heartbeat(d);
    await t.bus.settle();
    t.host.checkLiveness();
    await t.bus.settle();
    expect(d.status()).toMatchObject({ active: true, roleReason: 'promoted' });
    // A comes back: its claim was not erased; its next publication takes the role back.
    heartbeat(a);
    await t.bus.settle();
    a.set(content(77));
    a.publish();
    await t.bus.settle();
    expect(a.status()).toMatchObject({ active: true, roleReason: 'claimed' });
    expect(x()).toBe(77);
  });

  it('D: a claimed EMPTY tab does not freeze sharing; once it has something, its claim applies again', async () => {
    const a = await open(content(70));
    const e = await open(null);
    e.claim();
    await t.bus.settle();
    expect(e.status()).toMatchObject({ active: true, roleReason: 'claimed' });
    expect(x()).toBe(70); // nothing new to show yet
    a.set(content(700));
    a.publish();
    await t.bus.settle();
    expect(a.status().active).toBe(true); // an empty claim never freezes players on old content
    expect(x()).toBe(700);
    e.set(content(5));
    e.publish();
    await t.bus.settle();
    expect(e.status()).toMatchObject({ active: true, roleReason: 'claimed' });
    expect(x()).toBe(5);
  });

  it('F: re-hellos and heartbeats alone never reshuffle healthy publishers', async () => {
    const a = await open(content(70));
    const b = await open(content(140));
    for (let i = 0; i < 3; i++) {
      a.start();
      heartbeat(a);
      heartbeat(b);
      await t.bus.settle();
    }
    t.host.setSession({ running: false });
    t.host.setSession({ running: true, players: 0 }); // host-hello: both say hello again
    await t.bus.settle();
    expect(b.status().active).toBe(true);
    expect(a.status().active).toBe(false);
  });
});

describe('session host boundary: registry eviction', () => {
  it(`keeps at most ${MAX_REGISTERED} records, forgetting closed, then silent, then the oldest open inactive tab, never the active one`, async () => {
    const t = setup();
    t.host.start();
    t.host.setSession({ running: true, players: 0 });
    const id = (n) => `${String(n).padStart(8, '0')}${'x'.repeat(24)}`;
    const hello = (n, hasPublication = false) => t.bus.inject(CONTROL_CHANNEL, envelope('surface-hello', id(n), { surface: BM, surfaceVersion: 1, hasPublication }, 'host'));
    const ids = () => t.host.surfaces().map((r) => r.instance);
    hello(1, true); // the active publisher, and the oldest record
    for (let n = 2; n <= MAX_REGISTERED; n++) hello(n);
    await t.bus.settle();
    expect(ids()).toHaveLength(MAX_REGISTERED);
    expect(t.host.surfaces().find((r) => r.active).instance).toBe(id(1).slice(0, 8));
    // #20 says bye; #10 falls silent while every other tab keeps talking.
    t.bus.inject(CONTROL_CHANNEL, envelope('surface-bye', id(20), {}, 'host'));
    t.tick(NOT_RESPONDING_MS + 1);
    for (let n = 1; n <= MAX_REGISTERED; n++) if (n !== 10 && n !== 20) t.bus.inject(CONTROL_CHANNEL, envelope('surface-heartbeat', id(n), {}, 'host'));
    await t.bus.settle();
    t.host.checkLiveness();
    const gone = [];
    for (const n of [33, 34, 35]) {
      const before = new Set(ids());
      hello(n);
      await t.bus.settle();
      expect(ids()).toHaveLength(MAX_REGISTERED);
      gone.push([...before].filter((i) => !ids().includes(i))[0]);
    }
    // Closed first (although newer than #10), then silent, then the oldest open inactive tab (#2):
    // the active #1, older still, stays.
    expect(gone).toEqual([id(20), id(10), id(2)].map((i) => i.slice(0, 8)));
    expect(t.host.surfaces().find((r) => r.active).instance).toBe(id(1).slice(0, 8));
    expect(t.store.snapshot(BM)).toBeNull(); // nothing else happened: no offers, no commits
  });
});

describe('session host boundary: publications', () => {
  let t;
  let bg1;
  let bg2;
  beforeEach(async () => {
    t = setup();
    bg1 = await makeAsset('background', { seed: 1 });
    bg2 = await makeAsset('background', { seed: 2 });
    t.host.start();
  });
  const withBg = (asset, x = 70) => publication(battleMapContent({ background: asset.meta.assetId, tokens: [{ id: 't1', x, y: 70, w: 70, h: 70 }] }), [asset]);

  it('offers wait for a running session; the active surface offers by itself once one starts', async () => {
    const s = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s.start();
    await t.bus.settle();
    expect(s.publish()).toBe(false); // nothing running: it doesn't even offer
    t.bus.inject(CONTROL_CHANNEL, envelope('publication-offer', s.status().instanceId, { publicationSeq: 7, structured: withBg(bg1).structured, assets: [bg1.meta] }, 'host'));
    await t.bus.settle();
    expect(t.host.diagnostics().lastRejection).toBe('no-session');
    t.host.setSession({ running: true, players: 0 });
    await t.bus.settle();
    expect(t.store.snapshot(BM)).toMatchObject({ revision: 1, background: { assetId: bg1.meta.assetId, revision: 1 } });
    expect(s.status()).toMatchObject({ running: true, lastCommitted: { revision: 1 } });
    // Only the one missing asset crossed, once, on the Battle Map data channel.
    const assetMsgs = t.bus.log.filter((e) => e.msg.type === 'publication-asset');
    expect(assetMsgs).toHaveLength(1);
    expect(assetMsgs[0].name).toBe(surfaceDataChannel(BM));
  });

  it('an inactive tab’s offer, and a former publisher’s late messages, cannot replace the committed publication', async () => {
    t.host.setSession({ running: true, players: 0 });
    const a = t.surface({ pub: withBg(bg1), assets: [bg1] });
    a.start();
    await t.bus.settle();
    const committed = t.store.snapshot(BM);
    expect(committed.background.assetId).toBe(bg1.meta.assetId);
    const b = t.surface({ pub: withBg(bg1), assets: [bg1] });
    b.start();
    await t.bus.settle();
    expect(t.store.snapshot(BM)).toBe(committed); // identical content from the new tab: nothing new
    // The former publisher offers something else, and sends bytes nobody asked for.
    a.set(withBg(bg2), [bg2]);
    t.bus.inject(CONTROL_CHANNEL, envelope('publication-offer', a.status().instanceId, { publicationSeq: 50, structured: withBg(bg2).structured, assets: [bg2.meta] }, 'host'));
    const { assetId, ...meta } = bg2.meta;
    t.bus.inject(surfaceDataChannel(BM), envelope('publication-asset', a.status().instanceId, { publicationSeq: 50, assetId, meta, bytes: bg2.bytes.slice().buffer }, 'host'));
    await t.bus.settle();
    expect(t.store.snapshot(BM)).toBe(committed);
    expect(t.host.diagnostics().lastRejection).toBe('inactive');
    expect(t.store.diagnostics()[BM].heldAssets).toBe(1);
  });

  it('asset bytes on another surface type’s data channel are refused', async () => {
    t.host.setSession({ running: true, players: 0 });
    const s = t.surface({ pub: withBg(bg1), assets: [] }); // bytes not available: stays pending
    s.start();
    await t.bus.settle();
    expect(t.store.pendingOf(BM)).toMatchObject({ publicationSeq: 1, missing: 1 });
    const { assetId, ...meta } = bg1.meta;
    t.bus.inject(surfaceDataChannel('initiative'), envelope('publication-asset', s.status().instanceId, { publicationSeq: 1, assetId, meta, bytes: bg1.bytes.slice().buffer }, 'host'));
    await t.bus.settle();
    expect(t.store.pendingOf(BM)).toMatchObject({ publicationSeq: 1, missing: 1 });
    expect(t.store.snapshot(BM)).toBeNull();
    expect(t.host.diagnostics().lastRefusal).toMatch(/may not publish/);
  });

  it('a stale or repeated publicationSeq is refused', async () => {
    t.host.setSession({ running: true, players: 0 });
    const s = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s.start();
    await t.bus.settle(); // offered seq 1
    const id = s.status().instanceId;
    for (const seq of [1, 0.5, -3]) t.bus.inject(CONTROL_CHANNEL, envelope('publication-offer', id, { publicationSeq: seq, structured: withBg(bg2).structured, assets: [bg2.meta] }, 'host'));
    await t.bus.settle();
    expect(t.store.snapshot(BM).background.assetId).toBe(bg1.meta.assetId);
    expect(t.host.diagnostics().lastRejection).toBe('stale');
  });

  it('a surface that closes or stops responding mid-publication: the pending offer is dropped, the committed one stays', async () => {
    t.host.setSession({ running: true, players: 0 });
    const s = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s.start();
    await t.bus.settle();
    const committed = t.store.snapshot(BM);
    s.set(withBg(bg2), []); // bytes not available: the offer stays pending
    s.publish();
    await t.bus.settle();
    expect(t.store.pendingOf(BM)).toMatchObject({ missing: 1 });
    s.close();
    await t.bus.settle();
    expect(t.store.pendingOf(BM)).toBeNull();
    expect(t.store.snapshot(BM)).toBe(committed);
    expect(t.store.hasAsset(BM, bg1.meta.assetId)).toBe(true);
    expect(t.host.surfaces()).toMatchObject([{ liveness: 'closed' }]);

    // Silence (a crash, no bye): only status changes.
    const s2 = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s2.start();
    await t.bus.settle();
    t.tick(NOT_RESPONDING_MS + 1);
    t.host.checkLiveness();
    expect(t.host.surfaces()[0]).toMatchObject({ liveness: 'not-responding', active: true });
    expect(t.store.snapshot(BM)).toBe(committed);
    expect(t.store.hasAsset(BM, bg1.meta.assetId)).toBe(true);
    // It comes back: any message is a sign of life.
    t.bus.inject(CONTROL_CHANNEL, envelope('surface-heartbeat', s2.status().instanceId, {}, 'host'));
    await t.bus.settle();
    expect(t.host.surfaces()[0]).toMatchObject({ liveness: 'open', active: true });
  });

  it('when the active tab leaves, the newest other open tab takes over and offers', async () => {
    t.host.setSession({ running: true, players: 0 });
    const a = t.surface({ pub: withBg(bg1), assets: [bg1] });
    const b = t.surface({ pub: withBg(bg1, 140), assets: [bg1] });
    a.start();
    await t.bus.settle();
    b.start();
    await t.bus.settle();
    expect(t.store.snapshot(BM).tokens[0].x).toBe(140);
    a.claim();
    await t.bus.settle();
    expect(t.store.snapshot(BM).tokens[0].x).toBe(70);
    a.close();
    await t.bus.settle();
    expect(b.status()).toMatchObject({ active: true, roleReason: 'promoted' });
    expect(t.store.snapshot(BM).tokens[0].x).toBe(140);
  });

  it('session end clears the store; the next session gets the active surface’s state again', async () => {
    t.host.setSession({ running: true, players: 0 });
    const s = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s.start();
    await t.bus.settle();
    t.host.setSession({ running: false });
    await t.bus.settle();
    expect(t.store.snapshot(BM)).toBeNull();
    expect(s.status()).toMatchObject({ running: false, players: 0 });
    t.host.setSession({ running: true, players: 0 });
    await t.bus.settle();
    expect(t.store.snapshot(BM)).toMatchObject({ revision: 1 });
    expect(t.bus.log.filter((e) => e.msg.type === 'publication-asset')).toHaveLength(2); // the store was empty again
  });

  it('session status reaches surfaces as a running flag and a count, nothing else', async () => {
    const s = t.surface();
    s.start();
    t.host.setSession({ running: true, players: 2 });
    await t.bus.settle();
    expect(s.status()).toMatchObject({ running: true, players: 2 });
    for (const m of t.bus.sent('session-status')) expect(Object.keys(m).sort()).toEqual(['ch', 'from', 'players', 'running', 'type', 'v']);
  });

  it('nothing but player-safe content crosses the boundary (every posted message, checked)', async () => {
    t.host.setSession({ running: true, players: 1 });
    const content = battleMapContent({
      background: bg1.meta.assetId,
      tokens: [
        { id: 't1', name: 'Goblin', showLabel: true, x: 1, y: 1, w: 1, h: 1, hp: 7, maxHp: 9, imgSrc: 'img/secret-boss.png' },
        { id: 't_hidden', name: 'Ambusher', showLabel: true, visibleToPlayers: false, x: 1, y: 1, w: 1, h: 1 },
      ],
    });
    const s = t.surface({ pub: publication(content, [bg1]), assets: [bg1] });
    s.start();
    await t.bus.settle();
    const text = JSON.stringify(t.bus.log.map((e) => ({ ...e.msg, bytes: undefined })));
    for (const secret of ['hp', 'maxHp', 'secret-boss', 'Ambusher', 't_hidden', 'imgSrc', 'visibleToPlayers', 'fog', 'password', 'seat', 'credential']) {
      expect(text).not.toContain(secret);
    }
  });
});

describe('host → players from the publication store', () => {
  let t;
  let bg1;
  let bg2;
  beforeEach(async () => {
    t = setup();
    bg1 = await makeAsset('background', { seed: 1 });
    bg2 = await makeAsset('background', { seed: 2 });
    t.host.start();
    t.host.setSession({ running: true, players: 1 });
  });
  const withBg = (asset, x = 70) => publication(battleMapContent({ background: asset.meta.assetId, tokens: [{ id: 't1', x, y: 70, w: 70, h: 70 }] }), [asset]);

  it('a commit is sent from the commit event in the current wire format; assets are served from the host store after the surface closed', async () => {
    const link = fakeLink();
    t.sender.addPeer('p1', link);
    t.assetSender.addPeer('p1', link);
    const s = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s.start();
    await t.bus.settle();
    // Sent synchronously by sendNow() from the commit (the test's timer never fires).
    expect(link.snapshots()).toMatchObject([{ revision: 1, background: { assetId: bg1.meta.assetId, revision: 1 } }]);
    const wire = JSON.parse(link.sent[0]);
    expect(Object.keys(wire).sort()).toEqual(['payload', 'type', 'v']);
    expect(wire).toMatchObject({ v: 0, type: 'battlemap-snapshot' });

    s.close();
    await t.bus.settle();
    t.assetSender.request('p1', [bg1.meta.assetId]);
    expect(link.metas()).toMatchObject([{ assetId: bg1.meta.assetId, kind: 'background', byteLength: bg1.meta.byteLength }]);
    expect(link.binary().length).toBe(1);

    // A late player (a new peer) gets the same committed state and asset with the surface closed.
    const late = fakeLink();
    t.sender.addPeer('p2', late);
    t.assetSender.addPeer('p2', late);
    t.assetSender.request('p2', [bg1.meta.assetId]);
    expect(late.snapshots()).toMatchObject([{ revision: 1 }]);
    expect(late.metas()).toHaveLength(1);
  });

  it('a structured-only save sends a new snapshot revision with the same background revision, and no asset moves', async () => {
    const link = fakeLink();
    t.sender.addPeer('p1', link);
    const s = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s.start();
    await t.bus.settle();
    s.set(withBg(bg1, 140));
    s.publish();
    await t.bus.settle();
    expect(link.snapshots().map((x) => [x.revision, x.background.revision, x.tokens[0].x])).toEqual([
      [1, 1, 70],
      [2, 1, 140],
    ]);
    expect(t.bus.log.filter((e) => e.msg.type === 'publication-asset')).toHaveLength(1);
  });

  it('a reloaded surface (a new instance) offering the same map does not resend anything to players', async () => {
    const link = fakeLink();
    t.sender.addPeer('p1', link);
    const s = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s.start();
    await t.bus.settle();
    s.close();
    const reloaded = t.surface({ pub: withBg(bg1), assets: [bg1] });
    reloaded.start();
    await t.bus.settle();
    expect(reloaded.status().lastCommitted).toEqual({ publicationSeq: 1, revision: 1 });
    expect(link.snapshots()).toHaveLength(1);
    expect(t.committed).toHaveLength(1);
  });

  it('a replaced background: players keep the old one until the new one commits, then its transfer is superseded', async () => {
    const link = fakeLink();
    t.sender.addPeer('p1', link);
    t.assetSender.addPeer('p1', link);
    const s = t.surface({ pub: withBg(bg1), assets: [bg1] });
    s.start();
    await t.bus.settle();
    link.buffered = 1e9; // the asset transfer is paused: the channel is full
    t.assetSender.request('p1', [bg1.meta.assetId]);
    s.set(withBg(bg2), []); // pending: bytes not yet available on the surface
    s.publish();
    await t.bus.settle();
    expect(t.store.hasAsset(BM, bg1.meta.assetId)).toBe(true); // still being served
    s.set(withBg(bg2), [bg2]);
    s.publish();
    await t.bus.settle();
    expect(t.store.snapshot(BM).background).toEqual({ assetId: bg2.meta.assetId, revision: 2 });
    expect(t.store.hasAsset(BM, bg1.meta.assetId)).toBe(false);
    link.buffered = 0;
    t.assetSender.request('p1', []); // pump
    expect(link.sent.some((d) => typeof d === 'string' && d.includes('"asset-abort"') && d.includes('superseded'))).toBe(true);
  });
});
