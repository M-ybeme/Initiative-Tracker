// @vitest-environment node
//
// Live Share Milestone 2, end to end without a browser: a Battle Map-shaped state behind the real
// Milestone 1 seam, the real HostSession, SignalingClient and PeerLink negotiating through the local
// Node relay over real WebSockets, the real snapshot sender, protocol and player receiver. Node has
// no WebRTC, so RTCPeerConnection is an in-memory pair joined once offer and answer have crossed the
// relay (tests/helpers/memory-webrtc.js); its data channel delivers messages in order,
// asynchronously, like the real one.
// The real WebRTC path is covered by tests/e2e/live-share-battlemap.spec.js.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { startRelay } from '../../relay/node-relay.mjs';
import '../../js/modules/battle-map-share-state.js';
import { SignalingClient } from '../../js/modules/live-share/signaling-client.js';
import { PeerLink } from '../../js/modules/live-share/peer-link.js';
import { HostSession } from '../../js/modules/live-share/host-session.js';
import { createSnapshotSender } from '../../js/modules/live-share/snapshot-sender.js';
import { createSnapshotReceiver } from '../../js/modules/live-share/battlemap-snapshot.js';
import { parseChannelMessage } from '../../js/modules/live-share/protocol.js';
import { createMemoryWebRTC, until } from '../helpers/memory-webrtc.js';

const { createShareStateSeam } = globalThis.BattleMapShareState;

const { MemoryPC } = createMemoryWebRTC();

// ---- Harness -------------------------------------------------------------------------------------

let relay;
let relayUrl;
beforeAll(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1', turnEnv: {} });
  relayUrl = `ws://127.0.0.1:${relay.port}`;
});
afterAll(async () => {
  await relay.close();
});

// The Battle Map side: canonical state (with HP, images, selection, the DM's view) behind the seam,
// exactly as battlemap.html wires it. `edit(fn)` changes state then runs the seam's check, as the
// page's renderFrame() does after every frame.
function battleMap() {
  const state = {
    map: { imgSrc: 'data:image/png;base64,SECRETMAP', img: {}, w: 1000, h: 800 },
    mapTransform: { scale: 1, x: 0, y: 0 },
    grid: { size: 50, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
    view: { x: 5, y: 6, scale: 1.2 },
    tokens: [{ id: 't_ogre', name: 'Ogre', showLabel: true, x: 100, y: 100, w: 100, h: 100, rot: 0, hp: 59, maxHp: 59, imgSrc: '/images/ogre.png', selected: true, statusConditions: [] }],
  };
  const persistentMeasurements = [];
  const seam = createShareStateSeam({ getSource: () => ({ state, persistentMeasurements }) });
  seam.check();
  return {
    state,
    persistentMeasurements,
    seam,
    edit(fn) {
      fn(state, persistentMeasurements);
      seam.check();
    },
  };
}

// The host page: a HostSession whose players get snapshots from the seam, through the sender.
function host(map, { intervalMs = 30 } = {}) {
  const sender = createSnapshotSender({ getSnapshot: () => map.seam.getPlayerSafeState(), intervalMs });
  map.seam.onChange(() => sender.notifyChanged());
  const session = new HostSession({
    relayUrl,
    resolveIce: async () => ({ iceServers: [], turn: { configured: false, status: 'not-configured' } }),
    createSignaling: (o) => new SignalingClient({ ...o, WebSocketImpl: WebSocket, connectTimeoutMs: 3000 }),
    createLink: (o) => new PeerLink({ ...o, RTCPeerConnectionImpl: MemoryPC, connectTimeoutMs: 3000 }),
  });
  const links = [];
  session.on('peer-link', ({ peerId, link }) => {
    links.push(link);
    link.on('open', () => sender.addPeer(peerId, link));
    link.on('close', () => sender.removePeer(peerId));
  });
  return { session, sender, links };
}

// The player page: signaling, a PeerLink, and the receiver (liveshare-dev.js, without the DOM).
function player(roomId) {
  const applied = [];
  const receiver = createSnapshotReceiver({ onApply: (s) => applied.push(s) });
  const raw = [];
  const signaling = new SignalingClient({ relayUrl, roomId, role: 'peer', WebSocketImpl: WebSocket, connectTimeoutMs: 3000 });
  let link = null;
  signaling.on('ready', () => {
    link = new PeerLink({ role: 'player', sendSignal: (d) => signaling.sendSignal(d), RTCPeerConnectionImpl: MemoryPC, connectTimeoutMs: 3000 });
    link.on('message', ({ data }) => {
      raw.push(data);
      const parsed = parseChannelMessage(data);
      if (!parsed.ok) return parsed.type === 'battlemap-snapshot' && receiver.reject(parsed.error);
      if (parsed.message.type === 'battlemap-snapshot') receiver.receive(parsed.message.snapshot);
    });
    link.start();
  });
  signaling.on('signal', ({ from, data }) => from === 'host' && link && link.handleSignal(data));
  signaling.connect();
  return {
    applied,
    receiver,
    raw,
    get link() {
      return link;
    },
    latest: () => applied[applied.length - 1],
    close() {
      if (link) link.close();
      signaling.close();
    },
  };
}

async function connect(map, options) {
  const h = host(map, options);
  const roomId = h.session.start();
  await new Promise((resolve) => h.session.on('ready', resolve));
  const p = player(roomId);
  await until(() => p.link && p.link.opened);
  return { h, p };
}

describe('Live Share Battle Map sync through the local relay', () => {
  it('a player that joins gets the current snapshot at once, without any change on the map', async () => {
    const map = battleMap();
    const revision = map.seam.revision;
    const { h, p } = await connect(map);
    const first = await until(() => p.latest());
    expect(first.revision).toBe(revision);
    expect(first.tokens).toEqual([{ id: 't_ogre', x: 100, y: 100, w: 100, h: 100, rot: 0, name: 'Ogre', conditions: [], assetId: null, aura: null, visionCone: null }]);
    expect(map.seam.revision).toBe(revision); // nothing changed to trigger it
    expect(h.sender.diagnostics()).toMatchObject({ snapshotsSent: 1, lastSnapshotSentRevision: revision });
    p.close();
    h.session.end();
  });

  it('a player-visible change reaches the player; an editor-only change sends nothing', async () => {
    const map = battleMap();
    const { h, p } = await connect(map);
    await until(() => p.latest());

    map.edit((s) => (s.tokens[0].statusConditions = ['Frightened']));
    const updated = await until(() => p.latest().tokens[0].conditions.length && p.latest());
    expect(updated.revision).toBe(map.seam.revision);
    expect(updated.tokens[0].conditions).toEqual(['Frightened']);

    const sent = h.sender.diagnostics().snapshotsSent;
    map.edit((s) => {
      s.tokens[0].hp = 3; // HP, selection and the DM's view are not player-visible
      s.tokens[0].selected = false;
      s.view.scale = 3;
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(h.sender.diagnostics().snapshotsSent).toBe(sent);
    p.close();
    h.session.end();
  });

  it('a burst of edits collapses into a few snapshots and the final state reaches the player', async () => {
    const map = battleMap();
    const { h, p } = await connect(map, { intervalMs: 40 });
    await until(() => p.latest());
    const startRevision = map.seam.revision;

    // A token dragged across the map, one change per "frame".
    const startedAt = Date.now();
    for (let i = 1; i <= 60; i++) {
      map.edit((s) => (s.tokens[0].x = 100 + i * 5));
      await new Promise((r) => setTimeout(r, 4));
    }
    map.edit((s, pm) => pm.push({ id: 'pm-1', type: 'circle', x1: 0, y1: 0, x2: 100, y2: 0, color: '#ff0000', selected: true }));
    const elapsed = Date.now() - startedAt;
    const finalRevision = map.seam.revision;
    expect(finalRevision - startRevision).toBe(61);

    const last = await until(() => p.latest().revision === finalRevision && p.latest());
    expect(last.tokens[0].x).toBe(400);
    expect(last.measurements).toEqual([{ id: 'pm-1', type: 'circle', x1: 0, y1: 0, x2: 100, y2: 0, color: '#ff0000' }]);
    // At most one message per 40 ms interval (plus the trailing one), not one per revision, applied
    // in increasing order. (Timer resolution varies by OS, so the bound follows the measured time.)
    const burst = p.applied.slice(1);
    expect(burst.length).toBeLessThanOrEqual(Math.ceil(elapsed / 40) + 2);
    expect(burst.length).toBeLessThan(61);
    expect(burst.map((s) => s.revision)).toEqual([...burst.map((s) => s.revision)].sort((a, b) => a - b));
    expect(h.sender.diagnostics().changesCoalesced).toBeGreaterThan(20);
    p.close();
    h.session.end();
  });

  it('an old snapshot arriving late cannot roll the player back', async () => {
    const map = battleMap();
    const { h, p } = await connect(map);
    await until(() => p.latest());
    map.edit((s) => (s.tokens[0].x = 500));
    await until(() => p.latest().tokens[0].x === 500);
    const current = p.latest();

    // Replay the very first message on the real channel, as a delayed network packet would arrive.
    const channel = h.links[0].channel;
    const [first, latest] = [channel.sent[0], channel.sent[channel.sent.length - 1]];
    channel.send(first);
    channel.send(latest); // and the latest one again
    await until(() => p.receiver.stats().snapshotsIgnoredStale === 2);
    expect(p.latest()).toBe(current);
    expect(p.receiver.lastAppliedRevision).toBe(current.revision);
    p.close();
    h.session.end();
  });

  it('only the player-safe projection crosses the channel', async () => {
    const map = battleMap();
    const { h, p } = await connect(map);
    map.edit((s) => (s.tokens[0].x = 250));
    await until(() => p.latest() && p.latest().tokens[0].x === 250);
    expect(p.raw.length).toBeGreaterThan(0);
    for (const text of p.raw) {
      expect(text).not.toMatch(/SECRETMAP|imgSrc|ogre\.png|"hp"|maxHp|"selected"|"view"|showLabel|statusConditions/);
      expect(JSON.parse(text).payload).toEqual(p.applied.find((s) => s.revision === JSON.parse(text).payload.revision));
    }
    p.close();
    h.session.end();
  });

  it('when the connection closes the player keeps its last snapshot and the host stops sending', async () => {
    const map = battleMap();
    const { h, p } = await connect(map);
    await until(() => p.latest());
    const last = p.latest();
    h.session.end();
    await until(() => p.link.closed);
    expect(p.latest()).toBe(last);
    map.edit((s) => (s.tokens[0].x = 999));
    await new Promise((r) => setTimeout(r, 80));
    expect(h.sender.diagnostics().peers).toBe(0);
    expect(p.latest()).toBe(last);
    p.close();
  });
});
