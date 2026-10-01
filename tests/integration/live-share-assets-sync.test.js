// @vitest-environment node
//
// Live Share Milestone 3 without a browser: the real Battle Map asset seam
// (BattleMapShareAssets, with a stand-in canvas since Node has none) and the real Milestone 1 seam
// on the host; the real HostSession, SignalingClient and PeerLink through the local Node relay;
// the real snapshot and asset senders, protocol, player receiver and asset cache. The data channel
// is the in-memory pair from tests/helpers/memory-webrtc.js, optionally bandwidth-limited so large
// transfers take real time. Pixels and rendering are covered in the browser
// (tests/e2e/live-share-assets.spec.js).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { startRelay } from '../../relay/node-relay.mjs';
import '../../js/modules/battle-map-share-state.js';
import '../../js/modules/battle-map-share-assets.js';
import { SignalingClient } from '../../js/modules/live-share/signaling-client.js';
import { PeerLink } from '../../js/modules/live-share/peer-link.js';
import { HostSession } from '../../js/modules/live-share/host-session.js';
import { createSnapshotSender } from '../../js/modules/live-share/snapshot-sender.js';
import { createAssetSender } from '../../js/modules/live-share/asset-sender.js';
import { createSnapshotReceiver } from '../../js/modules/live-share/battlemap-snapshot.js';
import { createAssetCache } from '../../js/modules/live-share/asset-cache.js';
import { encodeAssetRequest } from '../../js/modules/live-share/asset-protocol.js';
import { parseChannelMessage, PROTOCOL_VERSION } from '../../js/modules/live-share/protocol.js';
import { createMemoryWebRTC, until } from '../helpers/memory-webrtc.js';

const { createShareStateSeam } = globalThis.BattleMapShareState;
const { createShareAssets } = globalThis.BattleMapShareAssets;

let relay;
let relayUrl;
beforeAll(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1', turnEnv: {} });
  relayUrl = `ws://127.0.0.1:${relay.port}`;
});
afterAll(async () => {
  await relay.close();
});

// A stand-in canvas: "pixels" are a string of what was drawn; encoding gives a WebP-signed byte
// string of `size(content)` bytes derived from that content, so identical inputs give identical bytes.
function canvasWorld({ size = () => 30000 } = {}) {
  return (w, h) => {
    const canvas = { width: w, height: h, content: [] };
    const ctx = {
      drawImage: (src) => canvas.content.push(src.content),
      getImageData: (x, y, gw, gh) => {
        const hash = [...canvas.content.join('|')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
        return { data: new Uint8ClampedArray(Math.min(gw * gh, 16) * 4).map((_, i) => (hash >>> (i % 24)) & 255) };
      },
      putImageData: (img) => canvas.content.push(`masked:${img.data.join(',')}`),
      fillRect: (...a) => canvas.content.push(`rect${a.join(',')}`),
      fill: () => canvas.content.push('fill'),
      arc: (...a) => canvas.content.push(`arc${a.join(',')}`),
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      beginPath() {},
    };
    canvas.getContext = () => ctx;
    canvas.toBlob = (cb) => {
      const text = canvas.content.join('|');
      const n = size(text, canvas);
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) bytes[i] = text.charCodeAt(i % text.length) ^ (i & 255);
      bytes.set([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80], 0); // RIFF....WEBP
      setTimeout(() => cb(new Blob([bytes], { type: 'image/webp' })), 0);
    };
    return canvas;
  };
}

// The Battle Map page, as battlemap.html wires it: canonical state, the asset seam, the structured
// seam, and `edit(fn)`, which changes state and runs the checks the page runs after each frame.
function battleMap({ size } = {}) {
  const state = {
    map: { image: { content: 'MAP-ORIGINAL-PIXELS' }, width: 800, height: 600 },
    fogEnabled: true,
    fog: { width: 800, height: 600, content: 'FOG-BITMAP-v0' },
    fogVersion: 0,
    fogShapes: [{ id: 'fs1', type: 'rect', x: 10, y: 10, w: 100, h: 100, rot: 0, mode: 'cover', color: '#000000' }],
    tokens: [
      { id: 't_hero', name: 'Hero', showLabel: true, imgSrc: 'data:image/png;base64,HEROART', x: 0, y: 0, w: 50, h: 50, rot: 0, hp: 12 },
      { id: 't_twin', name: 'Twin', showLabel: true, imgSrc: 'data:image/png;base64,HEROART', x: 60, y: 0, w: 50, h: 50, rot: 0 },
      { id: 't_goblin', name: 'Goblin', imgSrc: '/images/enemyTokens/Goblin.png', x: 120, y: 0, w: 50, h: 50, rot: 0 },
      { id: 't_far', name: 'Far', imgSrc: 'https://unreachable.example/art.png', x: 180, y: 0, w: 50, h: 50, rot: 0 },
    ],
    grid: { size: 50 },
    mapTransform: { scale: 1, x: 0, y: 0 },
  };
  let seam = null;
  const assets = createShareAssets({
    getInputs: () => ({ map: state.map, fogEnabled: state.fogEnabled, fogCanvas: state.fog, fogShapes: state.fogShapes, fogVersion: state.fogVersion, tokens: state.tokens }),
    onChange: () => seam && seam.schedule(),
    createCanvas: canvasWorld({ size }),
    loadImage: async (src) => {
      if (src.includes('unreachable')) throw new Error('unreachable');
      return { naturalWidth: 64, naturalHeight: 64, content: src };
    },
    subtle: globalThis.crypto.subtle,
    pageOrigin: 'http://localhost:3100',
    debounceMs: 10,
    maxWaitMs: 50,
  });
  seam = createShareStateSeam({
    getSource: () => ({ state: { map: { w: state.map.width, h: state.map.height }, mapTransform: state.mapTransform, grid: state.grid, tokens: state.tokens }, persistentMeasurements: [], assets }),
  });
  const check = () => {
    assets.check();
    seam.check();
  };
  check();
  return {
    state,
    assets,
    seam,
    edit(fn) {
      fn(state);
      check();
    },
    // The window.BattleMapLiveShare surface networking uses: nothing else.
    api: {
      getPlayerSafeState: () => seam.getPlayerSafeState(),
      onShareableStateChanged: (fn) => seam.onChange(fn),
      getAsset: (id) => assets.getAsset(id),
      hasAsset: (id) => assets.hasAsset(id),
    },
  };
}

// The host page (js/battlemap-live-share.js), talking only to `api`.
function host(api, { MemoryPC }) {
  const snapshots = createSnapshotSender({ getSnapshot: () => api.getPlayerSafeState(), intervalMs: 30 });
  const assetSender = createAssetSender({ protocolVersion: PROTOCOL_VERSION, getAsset: api.getAsset, hasAsset: api.hasAsset });
  api.onShareableStateChanged(() => {
    snapshots.notifyChanged();
    assetSender.assetsChanged();
  });
  const session = new HostSession({
    relayUrl,
    resolveIce: async () => ({ iceServers: [], turn: { configured: false, status: 'not-configured' } }),
    createSignaling: (o) => new SignalingClient({ ...o, WebSocketImpl: WebSocket, connectTimeoutMs: 3000 }),
    createLink: (o) => new PeerLink({ ...o, RTCPeerConnectionImpl: MemoryPC, connectTimeoutMs: 3000 }),
  });
  const links = [];
  session.on('peer-link', ({ peerId, link }) => {
    links.push(link);
    link.on('message', ({ data }) => {
      const parsed = parseChannelMessage(data);
      if (parsed.ok && parsed.message.type === 'asset-request') assetSender.request(peerId, parsed.message.assetIds);
    });
    link.on('open', () => {
      assetSender.addPeer(peerId, link);
      snapshots.addPeer(peerId, link);
    });
    link.on('close', () => {
      snapshots.removePeer(peerId);
      assetSender.removePeer(peerId);
    });
  });
  const sent = () => links[0].channel.sent;
  return { session, assetSender, links, sent, metas: () => sent().filter((d) => typeof d === 'string' && d.includes('"asset-meta"')).map((d) => JSON.parse(d).asset) };
}

// The player page (js/live-share-dev.js), without the DOM.
function player(roomId, { MemoryPC }) {
  let latest = null;
  const applied = [];
  const urls = { created: [], revoked: [] };
  const assets = createAssetCache({
    requestAssets: (ids) => link.send(encodeAssetRequest(PROTOCOL_VERSION, ids)),
    createObjectURL: () => {
      const u = `blob:player/${urls.created.length + 1}`;
      urls.created.push(u);
      return u;
    },
    revokeObjectURL: (u) => urls.revoked.push(u),
  });
  const receiver = createSnapshotReceiver({
    onApply: (s) => {
      latest = s;
      applied.push({ revision: s.revision, at: Date.now(), activeTransfers: assets.stats().activeTransfers, x: s.tokens[0] && s.tokens[0].x });
      assets.sync(s);
    },
  });
  const signaling = new SignalingClient({ relayUrl, roomId, role: 'peer', WebSocketImpl: WebSocket, connectTimeoutMs: 3000 });
  let link = null;
  signaling.on('ready', () => {
    link = new PeerLink({ role: 'player', sendSignal: (d) => signaling.sendSignal(d), RTCPeerConnectionImpl: MemoryPC, connectTimeoutMs: 3000 });
    link.on('message', ({ data }) => {
      const parsed = parseChannelMessage(data);
      if (!parsed.ok) return;
      const m = parsed.message;
      if (m.type === 'battlemap-snapshot') receiver.receive(m.snapshot);
      else if (m.type === 'asset-meta') assets.handleMeta(m.asset);
      else if (m.type === 'asset-chunk') assets.handleChunk(m);
      else if (m.type === 'asset-abort') assets.handleAbort(m);
    });
    link.start();
  });
  signaling.on('signal', ({ from, data }) => from === 'host' && link && link.handleSignal(data));
  signaling.connect();
  return {
    assets,
    urls,
    applied,
    latest: () => latest,
    get link() {
      return link;
    },
    // What the renderer would draw: the background and each token's art (or null: the marker).
    view: () => ({ background: latest && assets.backgroundFor(latest), art: latest ? latest.tokens.map((t) => (t.assetId ? assets.url(t.assetId) : null)) : [] }),
    close() {
      if (link) link.close();
      signaling.close();
      assets.dispose();
    },
  };
}

async function share({ size, bytesPerMs, oneMessagePerTask = false } = {}) {
  const webrtc = createMemoryWebRTC({ bytesPerMs, oneMessagePerTask });
  const map = battleMap({ size });
  await until(() => map.assets.background() && map.assets.tokenAssetId(map.state.tokens[0]));
  const h = host(map.api, webrtc);
  const roomId = h.session.start();
  await new Promise((resolve) => h.session.on('ready', resolve));
  const p = player(roomId, webrtc);
  await until(() => p.link && p.link.opened);
  return { map, h, p };
}

describe('Live Share Milestone 3 asset transfer through the local relay', () => {
  it('the snapshot references the background and custom art; the player asks, verifies, caches and shows them', async () => {
    const { map, h, p } = await share();
    await until(() => p.view().background && p.view().background.current && p.view().art[0]);
    const snap = p.latest();
    const bg = map.assets.background();
    expect(snap.background).toEqual({ assetId: bg.assetId, revision: 1 });
    expect(snap.tokens.map((t) => t.assetId)).toEqual([expect.stringMatching(/^[0-9a-f]{64}$/), snap.tokens[0].assetId, null, null]);
    const view = p.view();
    expect(view.background).toEqual({ url: expect.stringMatching(/^blob:/), assetId: bg.assetId, current: true });
    expect(view.art[0]).toMatch(/^blob:/);
    expect(view.art).toEqual([view.art[0], view.art[0], null, null]); // two tokens share one image; the others are markers
    // Exactly two transfers: the background and the shared art. No generic or unreadable art.
    expect(h.metas().map((m) => m.kind).sort()).toEqual(['background', 'token']);
    expect(p.assets.stats()).toMatchObject({ received: 2, cached: 2, failed: 0, rejected: 0 });
    // Nothing canonical crossed: no map/fog content, token sources or HP, in text or in bytes.
    const decoder = new TextDecoder();
    for (const d of h.sent()) {
      const text = typeof d === 'string' ? d : decoder.decode(d);
      expect(text).not.toMatch(/MAP-ORIGINAL-PIXELS|FOG-BITMAP|fogShapes|HEROART|data:image|unreachable|enemyTokens|"hp"/);
    }
    p.close();
    h.session.end();
  });

  it('a token move sends structured state only: no asset traffic, same background', async () => {
    const { map, h, p } = await share();
    await until(() => p.view().background && p.view().background.current);
    const before = h.sent().length;
    const metas = h.metas().length;
    const bg = p.latest().background;
    map.edit((s) => (s.tokens[0].x = 400));
    await until(() => p.latest().tokens[0].x === 400);
    const traffic = h.sent().slice(before);
    expect(traffic.every((d) => typeof d === 'string' && d.includes('"battlemap-snapshot"'))).toBe(true);
    expect(h.metas()).toHaveLength(metas);
    expect(p.latest().background).toEqual(bg);
    p.close();
    h.session.end();
  });

  it('a fog change produces a new background revision, which replaces the old one on the player', async () => {
    const { map, p, h } = await share();
    await until(() => p.view().background && p.view().background.current);
    const first = p.view().background;
    map.edit((s) => {
      s.fog.content = 'FOG-BITMAP-v1';
      s.fogVersion += 1;
    });
    await until(() => p.latest().background.revision === 2 && p.view().background.current && p.view().background.assetId !== first.assetId);
    await until(() => p.urls.revoked.includes(first.url));
    expect(p.assets.url(first.assetId)).toBeNull();
    expect(h.metas().filter((m) => m.kind === 'background')).toHaveLength(2);
    p.close();
    h.session.end();
  });

  it('art that cannot be prepared leaves the token on its marker, and nothing is requested for it', async () => {
    const { p, h } = await share();
    await until(() => p.view().art[0]);
    const far = p.latest().tokens.find((t) => t.id === 't_far');
    expect(far.assetId).toBeNull();
    expect(p.view().art[3]).toBeNull();
    expect(p.assets.stats().requested).toBe(2);
    p.close();
    h.session.end();
  });

  it('structured snapshots keep flowing during a large background transfer', { timeout: 30000 }, async () => {
    // A 2 MB background over a 2 MB/s link: the transfer takes about a second.
    const { map, h, p } = await share({ size: (text) => (text.includes('MAP') ? 2 * 1024 * 1024 : 20000), bytesPerMs: 2048 });
    await until(() => p.assets.stats().activeTransfers > 0, 10000);
    const moves = [];
    for (let i = 1; i <= 5; i++) {
      await new Promise((r) => setTimeout(r, 60));
      const x = 1000 + i;
      moves.push({ x, at: Date.now() });
      map.edit((s) => (s.tokens[0].x = x));
    }
    await until(() => p.view().background && p.view().background.current, 10000);
    // Every move reached the player while the background was still arriving, within 250 ms.
    for (const move of moves) {
      const seen = p.applied.find((a) => a.x === move.x) || p.applied.find((a) => a.x > move.x);
      expect(seen).toBeTruthy();
      expect(seen.activeTransfers).toBeGreaterThan(0);
      expect(seen.at - move.at).toBeLessThan(250);
    }
    expect(h.assetSender.diagnostics()).toMatchObject({ sent: 2 });
    expect(h.sent().filter((d) => typeof d !== 'string').length).toBeGreaterThan(128);
    p.close();
    h.session.end();
  });

  // The host's "superseded" abort and the snapshot naming the new background reach the player in
  // one task or in separate tasks depending on timer resolution (coarse on Windows, fine on CI's
  // Linux); the second case forces separate tasks.
  // Either way exactly one transfer is aborted: the player does not ask again for the replaced
  // background before the newer snapshot arrives (that request could only be answered "unavailable").
  it.each([
    ['delivered as the timers allow', false],
    ['delivered in separate tasks', true],
  ])('latest background wins: a background replaced mid-transfer is aborted and the newest one is shown (abort and new snapshot %s)', { timeout: 30000 }, async (_label, oneMessagePerTask) => {
    const { map, h, p } = await share({ size: (text) => (text.includes('MAP') ? 1024 * 1024 : 20000), bytesPerMs: 1024, oneMessagePerTask });
    await until(() => p.assets.stats().activeTransfers > 0 && p.latest().background.revision === 1, 10000);
    map.edit((s) => {
      s.fog.content = 'FOG-BITMAP-v9';
      s.fogVersion += 1;
    });
    const latestBg = await until(() => map.assets.background().revision === 2 && map.assets.background(), 10000);
    await until(() => p.view().background && p.view().background.assetId === latestBg.assetId && p.view().background.current, 10000);
    expect(h.assetSender.diagnostics()).toMatchObject({ superseded: 1, unavailable: 0 });
    expect(p.assets.stats()).toMatchObject({ aborted: 1, failed: 0 });
    p.close();
    h.session.end();
  });

  it('fog switched back and forth between two states: every recurrence of the same background id is shown as current', { timeout: 30000 }, async () => {
    const { map, h, p } = await share();
    await until(() => p.view().background && p.view().background.current);
    const ids = [];
    let previous = map.assets.background().assetId; // the initial fog state's background
    for (let step = 0; step < 7; step++) {
      const content = step % 2 === 0 ? 'FOG-STATE-A' : 'FOG-STATE-B';
      map.edit((s) => {
        s.fog.content = content;
        s.fogVersion += 1;
      });
      const bg = await until(() => map.assets.diagnostics().background.status === 'ready' && map.assets.background().assetId !== previous && map.assets.background(), 5000);
      ids.push(bg.assetId);
      previous = bg.assetId;
      await until(() => {
        const v = p.view().background;
        return v && v.current && v.assetId === bg.assetId && p.latest().background.assetId === bg.assetId;
      }, 5000);
      await new Promise((r) => setTimeout(r, 50)); // time passes: the replaced background is released
    }
    // Two distinct backgrounds, each coming back: identical fog gives the identical id.
    expect(new Set(ids).size).toBe(2);
    expect(ids).toEqual([ids[0], ids[1], ids[0], ids[1], ids[0], ids[1], ids[0]]);
    // The host served every recurrence (plus the initial background), refusing nothing.
    expect(h.assetSender.diagnostics()).toMatchObject({ refused: 0 });
    expect(h.metas().filter((m) => m.kind === 'background')).toHaveLength(8);
    expect(p.assets.stats()).toMatchObject({ failed: 0, waiting: 0 });
    p.close();
    h.session.end();
  });
});
