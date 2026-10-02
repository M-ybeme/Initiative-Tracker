// Live Share Milestone 4B: profile the Battle Map Save -> player-visible path on the real pages.
//
// The DM edits the real Battle Map (battlemap.html?liveshare=1); a player (liveshare-dev.html) in a
// separate browser context connects through the local relay over real WebRTC (direct host
// candidates, or the loopback TURN server with ?forceRelay=1). Nothing in the app is changed for
// this: test-only init scripts timestamp what the pages already do (canvas composition and toBlob,
// SHA-256, IndexedDB save, every data-channel send / receive, the player's background <image> load)
// and watch the host's main thread (Long Tasks API, requestAnimationFrame gaps).
//
// Clocks: host and player are pages of one browser on one machine, so wall-clock timestamps
// (performance.timeOrigin + performance.now()) are comparable between them. That does NOT hold
// across real devices; the manual real-device check uses per-device durations instead.
//
// Synthetic numbers here measure this machine's composition / encoding and a loopback network;
// they are not claims about real network throughput.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { RELAY } from '../helpers/live-share.js';

// Outside test-results/, which Playwright empties at the start of every run.
const OUT = 'perf-results/live-share-profile';
const VIEW_SCALE = 0.6;
const SAVES = Number(process.env.PROFILE_SAVES || 5); // measured background saves per case
const median = (xs) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const max = (xs) => (xs.filter(Number.isFinite).length ? Math.max(...xs.filter(Number.isFinite)) : null);
const r0 = (x) => (x == null ? null : Math.round(x));

// ---- Instrumentation (init scripts) -------------------------------------------------------------

function hostProbe() {
  const W = () => performance.timeOrigin + performance.now();
  const P = (window.__perf = { events: [], longtasks: [], gaps: [] });
  const ev = (name, data = {}) => P.events.push({ t: W(), name, ...data });
  window.__perfEv = ev;
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) ev('save-key');
  }, true);
  const toBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (cb, type, q) {
    const w = this.width, h = this.height, t0 = W();
    ev('encode-start', { w, h, type });
    return toBlob.call(this, (b) => {
      ev('encode-end', { w, h, ms: W() - t0, bytes: b ? b.size : null, mime: b ? b.type : null });
      cb(b);
    }, type, q);
  };
  const toDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    const t0 = W();
    const r = toDataURL.apply(this, args);
    if (this.width * this.height > 100000) ev('toDataURL', { w: this.width, h: this.height, ms: W() - t0, chars: r.length });
    return r;
  };
  const C2D = CanvasRenderingContext2D.prototype;
  const drawImage = C2D.drawImage;
  C2D.drawImage = function (src, ...rest) {
    const big = !this.canvas.isConnected && this.canvas.width * this.canvas.height > 200000;
    if (big && typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) ev('compose-map-draw', { w: this.canvas.width, h: this.canvas.height });
    return drawImage.call(this, src, ...rest);
  };
  for (const name of ['getImageData', 'putImageData']) {
    const fn = C2D[name];
    C2D[name] = function (...args) {
      const t0 = W();
      const r = fn.apply(this, args);
      if (this.canvas.width * this.canvas.height > 200000) ev(name, { w: this.canvas.width, h: this.canvas.height, ms: W() - t0 });
      return r;
    };
  }
  const digest = SubtleCrypto.prototype.digest;
  SubtleCrypto.prototype.digest = function (alg, data) {
    const t0 = W();
    return digest.call(this, alg, data).then((r) => {
      ev('hash', { start: t0, ms: W() - t0, bytes: data.byteLength });
      return r;
    });
  };
  const send = RTCDataChannel.prototype.send;
  RTCDataChannel.prototype.send = function (data) {
    if (typeof data === 'string') {
      let m = null;
      try { m = JSON.parse(data); } catch {}
      ev('send', { kind: m && m.type, revision: m && m.payload ? m.payload.revision : undefined, assetId: m && m.asset ? m.asset.assetId : undefined, assetKind: m && m.asset ? m.asset.kind : undefined, bytes: data.length, bgId: m && m.payload && m.payload.background ? m.payload.background.assetId : undefined });
    } else ev('send', { kind: 'chunk', bytes: data.byteLength });
    return send.call(this, data);
  };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) P.longtasks.push({ t: performance.timeOrigin + e.startTime, ms: e.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
  let last = 0;
  const frame = (now) => {
    if (last && now - last > 50) P.gaps.push({ t: performance.timeOrigin + last, ms: now - last });
    last = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function playerProbe() {
  const W = () => performance.timeOrigin + performance.now();
  const P = (window.__perf = { events: [] });
  const ev = (name, data = {}) => P.events.push({ t: W(), name, ...data });
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = function (...args) {
    const pc = new PC(...args);
    pc.addEventListener('datachannel', (e) =>
      e.channel.addEventListener('message', (m) => {
        if (typeof m.data === 'string') {
          let msg = null;
          try { msg = JSON.parse(m.data); } catch {}
          ev('recv', { kind: msg && msg.type, revision: msg && msg.payload ? msg.payload.revision : undefined, assetId: msg && msg.asset ? msg.asset.assetId : msg && msg.assetId, bytes: m.data.length });
        } else ev('recv', { kind: 'chunk', bytes: m.data.byteLength || m.data.size });
      })
    );
    return pc;
  };
  const send = RTCDataChannel.prototype.send;
  RTCDataChannel.prototype.send = function (data) {
    let m = null;
    try { m = JSON.parse(data); } catch {}
    ev('send', { kind: m && m.type, ids: m && m.assetIds });
    return send.call(this, data);
  };
  const digest = SubtleCrypto.prototype.digest;
  SubtleCrypto.prototype.digest = function (alg, data) {
    const t0 = W();
    return digest.call(this, alg, data).then((r) => {
      ev('hash', { start: t0, ms: W() - t0, bytes: data.byteLength });
      return r;
    });
  };
  document.addEventListener('DOMContentLoaded', () => {
    const svg = document.querySelector('[data-testid="player-map"]');
    let rev = null;
    let bg = null;
    new MutationObserver(() => {
      const r = svg.getAttribute('data-revision');
      if (r !== rev) {
        rev = r;
        ev('applied', { revision: Number(r) });
      }
      const img = svg.querySelector('.ls-background-image');
      const id = img && img.getAttribute('data-asset-id');
      if (id && id !== bg) {
        bg = id;
        ev('bg-attached', { assetId: id });
        const done = () => ev('bg-loaded', { assetId: id });
        img.addEventListener('load', done, { once: true });
        // An <image> re-created with an already decoded object URL may not fire load again.
        const probe = new Image();
        probe.src = img.getAttribute('href');
        probe.decode().then(() => ev('bg-decoded', { assetId: id }), () => {});
      }
    }).observe(svg, { attributes: true, childList: true, subtree: true });
  });
}

// ---- Fixtures (deterministic, generated in the host page) --------------------------------------

function makeFixture(page, kind, w, h, opts = {}) {
  return page.evaluate(async ({ kind, w, h, opts }) => {
    let s = opts.seed || 12345;
    const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216;
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const g = c.getContext('2d');
    if (kind === 'dungeon') {
      // Flat floor and walls, rooms and corridors, a drawn grid, a little floor texture.
      g.fillStyle = '#2b2b2b';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = i % 3 ? '#c9b48a' : '#b9a47c';
        g.fillRect(rnd() * w * 0.8, rnd() * h * 0.8, w * (0.08 + rnd() * 0.15), h * (0.08 + rnd() * 0.15));
      }
      g.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 4000; i++) g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 6, 3 + rnd() * 6);
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      for (let x = 0; x <= w; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      return c.toDataURL('image/png');
    }
    // 'photo': the repository's painted art texture, tiled and scaled, with seeded fine detail on top
    // (stone/grass-like grain) so it behaves like a high-detail painted or photographic map.
    const art = new Image();
    art.src = '/images/BGMap.png';
    await art.decode();
    const tile = Math.max(w, h) / 2;
    for (let y = 0; y < h; y += tile * 0.66) for (let x = 0; x < w; x += tile) g.drawImage(art, x, y, tile, tile * 0.66);
    if (opts.grain === false) return c.toDataURL('image/jpeg', 0.9);
    const n = g.createImageData(Math.min(w, 1024), Math.min(h, 1024));
    for (let i = 0; i < n.data.length; i += 4) {
      const v = rnd() * 255;
      n.data[i] = v; n.data[i + 1] = v * 0.9; n.data[i + 2] = v * 0.7; n.data[i + 3] = 46;
    }
    const nc = Object.assign(document.createElement('canvas'), { width: n.width, height: n.height });
    nc.getContext('2d').putImageData(n, 0, 0);
    for (let y = 0; y < h; y += n.height) for (let x = 0; x < w; x += n.width) g.drawImage(nc, x, y);
    return c.toDataURL('image/jpeg', 0.9);
  }, { kind, w, h, opts });
}

// A saved painted-fog bitmap covering about `coverage` of the map (opaque black), with irregular
// revealed areas cut out of it.
function makeFog(page, w, h, coverage, seed = 99) {
  return page.evaluate(({ w, h, coverage, seed }) => {
    let s = seed;
    const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216;
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const g = c.getContext('2d');
    g.fillStyle = '#000000';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const target = w * h * (1 - coverage);
    let cut = 0;
    while (cut < target) {
      const r = Math.min(w, h) * (0.03 + rnd() * 0.06);
      g.beginPath();
      g.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2);
      g.fill();
      cut += Math.PI * r * r * 0.8;
    }
    return c.toDataURL('image/png');
  }, { w, h, coverage, seed });
}

function makeTokenArt(page, count) {
  return page.evaluate((count) => {
    const out = [];
    for (let k = 0; k < count; k++) {
      let s = 1000 + k;
      const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216;
      const c = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
      const g = c.getContext('2d');
      g.fillStyle = `hsl(${k * 45} 60% 40%)`;
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = `hsla(${rnd() * 360} 70% ${30 + rnd() * 50}% / 0.7)`;
        g.beginPath();
        g.arc(rnd() * 256, rnd() * 256, 4 + rnd() * 20, 0, Math.PI * 2);
        g.fill();
      }
      out.push(c.toDataURL('image/png'));
    }
    return out;
  }, count);
}

// ---- Pages ------------------------------------------------------------------------------------

const hostSnapshot = (page) => page.evaluate(() => window.BattleMapLiveShare.getPlayerSafeState());

async function openHost(browser, { forceRelay = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addInitScript(hostProbe);
  const page = await context.newPage();
  await page.goto(`/battlemap?liveshare=1&relay=${RELAY}${forceRelay ? '&forceRelay=1' : ''}`);
  await page.waitForFunction(() => window.BattleMapLiveShare);
  // Persistence timing: the save's IndexedDB write.
  await page.evaluate(() => {
    const s = window.IndexedDBStorage;
    if (!s || !s.saveBattleMap) return;
    const orig = s.saveBattleMap.bind(s);
    s.saveBattleMap = (...a) => {
      window.__perfEv('persist-start');
      return orig(...a).finally(() => window.__perfEv('persist-end'));
    };
  });
  return { context, page };
}

async function saveAndSettle(page) {
  await page.keyboard.press('Control+s');
  await expect(page.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/, { timeout: 120000 });
}

async function importCase(page, { map, fog, tokens = [], measurements = [], fogShapes = [] }) {
  const data = {
    fog,
    map: { imgSrc: map },
    mapTransform: { scale: 1, x: 0, y: 0 },
    grid: { size: 70, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
    view: { x: 0, y: 0, scale: VIEW_SCALE },
    tokens,
    persistentMeasurements: measurements,
    fogState: { enabled: true, mode: 'cover', brush: 80 },
    fogShapes,
  };
  const panel = page.locator('#accSession');
  if (!(await panel.evaluate((el) => el.classList.contains('show')))) await page.locator('[data-bs-target="#accSession"]').click();
  await expect(page.locator('#bmAccordion .collapsing')).toHaveCount(0);
  await page.locator('#importJsonFile').setInputFiles({ name: 'map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty', { timeout: 120000 });
  await saveAndSettle(page);
  await expect.poll(async () => (await hostSnapshot(page))?.background?.assetId, { timeout: 180000 }).toMatch(/^[0-9a-f]{64}$/);
}

async function startAndJoin(browser, host, { forceRelay = false } = {}) {
  await host.getByTestId('start-room').click();
  await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players');
  const joinUrl = await host.getByTestId('join-link').textContent();
  expect(joinUrl.includes('forceRelay=1')).toBe(forceRelay);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(playerProbe);
  const player = await context.newPage();
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 30000 });
  return { context, player };
}

async function connectionInfo(player) {
  const d = JSON.parse(await player.getByTestId('diagnostics').textContent());
  const host = d.peers && d.peers.host;
  return host ? { usingTurnRelay: host.usingTurnRelay, local: host.localCandidateType, remote: host.remoteCandidateType, protocol: host.transportProtocol } : null;
}

const clearPerf = (...pages) => Promise.all(pages.map((p) => p.evaluate(() => { window.__perf.events.length = 0; if (window.__perf.longtasks) window.__perf.longtasks.length = 0; if (window.__perf.gaps) window.__perf.gaps.length = 0; })));
const perfOf = (page) => page.evaluate(() => window.__perf);

async function screenOf(page, wx, wy) {
  const box = await page.locator('#uiLayer').boundingBox();
  return { x: box.x + wx * VIEW_SCALE, y: box.y + wy * VIEW_SCALE };
}

async function brushStroke(page, wx, wy, mode) {
  await page.locator(mode === 'reveal' ? '#fogReveal' : '#fogCover').click();
  await page.locator('#fogBrushMode').click();
  const a = await screenOf(page, wx, wy);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 60, a.y + 20, { steps: 6 });
  await page.mouse.up();
  await page.locator('#fogBrushMode').click();
}

// ---- Analysis ---------------------------------------------------------------------------------

function analyzeBackgroundSave(hostPerf, playerPerf, newBgId) {
  const h = hostPerf.events;
  const p = playerPerf.events;
  const first = (arr, pred, after = -Infinity) => arr.find((e) => e.t >= after && pred(e));
  const lastOf = (arr, pred) => [...arr].reverse().find(pred);
  const T0 = first(h, (e) => e.name === 'save-key');
  if (!T0) return null;
  const persist = first(h, (e) => e.name === 'persist-end', T0.t);
  const fogUrl = h.filter((e) => e.name === 'toDataURL' && e.t >= T0.t);
  const draw = first(h, (e) => e.name === 'compose-map-draw', T0.t);
  // The background encode is the largest canvas encoded after the save (token art is 512 px at most).
  const encEnds = h.filter((e) => e.name === 'encode-end' && e.t >= T0.t).sort((a, b) => b.w * b.h - a.w * a.h);
  const encEnd = encEnds[0];
  const encStart = encEnd && lastOf(h, (e) => e.name === 'encode-start' && e.w === encEnd.w && e.h === encEnd.h && e.t <= encEnd.t);
  const mask = h.filter((e) => (e.name === 'getImageData' || e.name === 'putImageData') && e.t >= T0.t && encEnd && e.w === encEnd.w);
  const hash = encEnd && first(h, (e) => e.name === 'hash' && e.bytes === encEnd.bytes, encEnd.t);
  const snap = first(h, (e) => e.name === 'send' && e.kind === 'battlemap-snapshot' && e.bgId === newBgId, T0.t);
  const req = first(p, (e) => e.name === 'send' && e.kind === 'asset-request' && (e.ids || []).includes(newBgId), T0.t);
  const meta = first(h, (e) => e.name === 'send' && e.kind === 'asset-meta' && e.assetId === newBgId, T0.t);
  const chunksOut = meta ? h.filter((e) => e.name === 'send' && e.kind === 'chunk' && e.t >= meta.t) : [];
  const recvMeta = first(p, (e) => e.name === 'recv' && e.kind === 'asset-meta' && e.assetId === newBgId, T0.t);
  const chunksIn = recvMeta ? p.filter((e) => e.name === 'recv' && e.kind === 'chunk' && e.t >= recvMeta.t) : [];
  const lastChunkIn = chunksIn.length ? chunksIn[chunksIn.length - 1] : null;
  const pHash = lastChunkIn && first(p, (e) => e.name === 'hash', lastChunkIn.t - 1);
  const attached = first(p, (e) => e.name === 'bg-attached' && e.assetId === newBgId, T0.t);
  const loaded = first(p, (e) => (e.name === 'bg-loaded' || e.name === 'bg-decoded') && e.assetId === newBgId, T0.t);
  const T7 = snap ? snap.t : null;
  const window = [T0.t, T7 || T0.t + 30000];
  const lt = hostPerf.longtasks.filter((e) => e.t + e.ms >= window[0] && e.t <= window[1]);
  const gaps = hostPerf.gaps.filter((e) => e.t + e.ms >= window[0] && e.t <= window[1]);
  const d = (a, b) => (a != null && b != null ? b - a : null);
  return {
    composite: encEnd ? `${encEnd.w}x${encEnd.h}` : null,
    mime: encEnd ? encEnd.mime : null,
    bytes: encEnd ? encEnd.bytes : null,
    persistMs: persist ? d(T0.t, persist.t) : null,
    fogToDataURLms: fogUrl.reduce((a, e) => a + e.ms, 0),
    composeMs: draw && encStart ? d(draw.t, encStart.t) : null,
    fogMaskMs: mask.reduce((a, e) => a + e.ms, 0),
    encodeMs: encStart && encEnd ? d(encStart.t, encEnd.t) : null,
    hashMs: hash ? hash.ms : null,
    hostPrepMs: d(T0.t, T7),
    snapshotToRequestMs: d(T7, req && req.t),
    transferMs: d(req && req.t, lastChunkIn && lastChunkIn.t),
    sendMs: chunksOut.length ? d(chunksOut[0].t, chunksOut[chunksOut.length - 1].t) : null,
    chunks: chunksIn.length,
    playerHashMs: pHash ? pHash.ms : null,
    playerApplyMs: d(lastChunkIn && lastChunkIn.t, loaded && loaded.t),
    saveToAttachedMs: d(T0.t, attached && attached.t),
    saveToVisibleMs: d(T0.t, loaded && loaded.t),
    longestTaskMs: max(lt.map((e) => e.ms)),
    longTasksTotalMs: lt.reduce((a, e) => a + e.ms, 0),
    longestFrameGapMs: max(gaps.map((e) => e.ms)),
  };
}

function analyzeStructuredSave(hostPerf, playerPerf, revision) {
  const h = hostPerf.events;
  const T0 = h.find((e) => e.name === 'save-key');
  const snap = h.find((e) => e.name === 'send' && e.kind === 'battlemap-snapshot' && e.revision === revision);
  const applied = playerPerf.events.find((e) => e.name === 'applied' && e.revision === revision);
  const encodes = h.filter((e) => e.name === 'encode-start' && e.w * e.h > 300000);
  const bgMetas = h.filter((e) => e.name === 'send' && e.kind === 'asset-meta' && e.assetKind === 'background');
  const lt = hostPerf.longtasks.filter((e) => T0 && snap && e.t + e.ms >= T0.t && e.t <= snap.t);
  return {
    hostPrepMs: T0 && snap ? snap.t - T0.t : null,
    saveToAppliedMs: T0 && applied ? applied.t - T0.t : null,
    snapshotBytes: snap ? snap.bytes : null,
    backgroundEncodes: encodes.length,
    backgroundEncodeMs: encodes.length ? h.filter((e) => e.name === 'encode-end' && e.w * e.h > 300000).reduce((a, e) => a + e.ms, 0) : 0,
    backgroundTransfers: bgMetas.length,
    longestTaskMs: max(lt.map((e) => e.ms)),
  };
}

function summarize(rows) {
  const keys = Object.keys(rows[0] || {}).filter((k) => typeof rows[0][k] === 'number' || rows[0][k] === null);
  const out = {};
  for (const k of keys) out[k] = { median: r0(median(rows.map((r) => r[k]))), worst: r0(max(rows.map((r) => r[k]))) };
  for (const k of Object.keys(rows[0] || {})) if (!(k in out)) out[k] = rows[0][k];
  return out;
}

function record(name, data) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 2));
  console.log(`\n### ${name}\n${JSON.stringify(data, null, 1)}`);
}

// ---- Cases ------------------------------------------------------------------------------------

async function backgroundSaves(host, player, { n = SAVES, mode = 'cover', origin = { x: 120, y: 120 } } = {}) {
  const rows = [];
  for (let i = 0; i < n + 1; i++) {
    const before = await hostSnapshot(host);
    await brushStroke(host, origin.x + (i % 5) * 140, origin.y + Math.floor(i / 5) * 120 + (i % 2) * 30, mode);
    await clearPerf(host, player);
    await saveAndSettle(host);
    await expect.poll(async () => (await hostSnapshot(host)).background.assetId, { timeout: 120000 }).not.toBe(before.background.assetId);
    const after = await hostSnapshot(host);
    await expect.poll(async () => player.evaluate((id) => window.__perf.events.some((e) => (e.name === 'bg-loaded' || e.name === 'bg-decoded') && e.assetId === id), after.background.assetId), { timeout: 120000 }).toBe(true);
    await host.waitForTimeout(300);
    const row = analyzeBackgroundSave(await perfOf(host), await perfOf(player), after.background.assetId);
    if (i > 0) rows.push(row); // the first is a warm-up
  }
  return rows;
}

async function structuredSaves(host, player, kinds, n = 3) {
  const out = {};
  for (const [label, act] of kinds) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const before = await hostSnapshot(host);
      await act(i);
      await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty').catch(async (e) => {
        await host.screenshot({ path: `${OUT}/debug-${label.replace(/\W+/g, '-')}.png` });
        throw e;
      });
      await clearPerf(host, player);
      await saveAndSettle(host);
      await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 30000 }).toBe(before.revision + 1);
      const rev = before.revision + 1;
      await expect.poll(() => player.evaluate((r) => window.__perf.events.some((e) => e.name === 'applied' && e.revision === r), rev), { timeout: 30000 }).toBe(true);
      await host.waitForTimeout(200);
      rows.push(analyzeStructuredSave(await perfOf(host), await perfOf(player), rev));
      expect((await hostSnapshot(host)).background).toEqual(before.background);
    }
    out[label] = summarize(rows);
  }
  return out;
}

// The centre of a token as last saved (structured edits are saved one at a time, so this is current).
async function centreOf(host, id) {
  const t = (await hostSnapshot(host)).tokens.find((x) => x.id === id);
  return { x: t.x + t.w / 2, y: t.y + t.h / 2 };
}

// The first saves after a host reload: the reload published the saved record under its own fog
// version, so the first live save re-encodes the (unchanged) background once. That save's structured
// snapshot waits for it; nothing is transferred (same bytes, same id).
async function firstSavesAfterReload(host, player, tokenId) {
  await host.reload();
  await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
  await host.evaluate(() => {
    const s = window.IndexedDBStorage;
    const orig = s.saveBattleMap.bind(s);
    s.saveBattleMap = (...a) => { window.__perfEv('persist-start'); return orig(...a).finally(() => window.__perfEv('persist-end')); };
  });
  await host.waitForTimeout(3000);
  const rows = [];
  for (let i = 0; i < 2; i++) {
    const before = await hostSnapshot(host);
    await host.evaluate(() => { window.__perf.events.length = 0; window.__perf.longtasks.length = 0; window.__perf.gaps.length = 0; });
    await tokenDrag(host, await centreOf(host, tokenId), i % 2 ? -42 : 42, 0);
    await saveAndSettle(host);
    await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 60000 }).toBe(before.revision + 1);
    await host.waitForTimeout(500);
    const after = await hostSnapshot(host);
    const perf = await perfOf(host);
    const T0 = perf.events.find((e) => e.name === 'save-key');
    // The host page reloaded, so its snapshot sends are not seen by the probe's channel log here;
    // the published revision's arrival time is the seam's (getPlayerSafeState) at poll time.
    const enc = perf.events.filter((e) => e.name === 'encode-end' && e.w * e.h > 300000);
    const persist = perf.events.find((e) => e.name === 'persist-end');
    rows.push({
      save: i + 1,
      backgroundEncodes: enc.length,
      encodeMs: r0(enc.reduce((a, e) => a + e.ms, 0)),
      persistMs: persist && T0 ? r0(persist.t - T0.t) : null,
      longestTaskMs: r0(max(perf.longtasks.filter((e) => T0 && e.t >= T0.t).map((e) => e.ms))),
      backgroundUnchanged: after.background.assetId === before.background.assetId,
    });
  }
  return rows;
}

async function tokenDrag(host, from, dx, dy) {
  const a = await screenOf(host, from.x, from.y);
  await host.mouse.move(a.x, a.y);
  await host.mouse.down();
  await host.mouse.move(a.x + dx, a.y + dy, { steps: 6 });
  await host.mouse.up();
}

async function openModal(host, at, cmd) {
  const a = await screenOf(host, at.x, at.y);
  await host.mouse.click(a.x, a.y, { button: 'right' });
  await host.locator(`#ctxMenu [data-cmd="${cmd}"]`).click();
}

const BARD = '/images/playerTokens/PlayerBardToken.png';

test.describe.configure({ mode: 'serial' });

for (const forceRelay of [false, true]) {
  const conn = forceRelay ? 'loopback-TURN' : 'direct';

  test(`A. ordinary dungeon map (${conn})`, async ({ browser }) => {
    test.setTimeout(600000);
    const { context: hc, page: host } = await openHost(browser, { forceRelay });
    const W = 2800, H = 2000;
    await importCase(host, {
      map: await makeFixture(host, 'dungeon', W, H),
      tokens: [{ id: 't_bard', name: 'Bard', imgSrc: BARD, x: 140, y: 140, w: 70, h: 70, rot: 0, showLabel: true }],
      fogShapes: [{ id: 'fs1', type: 'rect', x: 1600, y: 900, w: 900, h: 800, rot: 0, mode: 'cover', color: '#000000' }],
    });
    const { context: pc, player } = await startAndJoin(browser, host, { forceRelay });
    await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 60000 });
    const connection = await connectionInfo(player);
    expect(connection.usingTurnRelay).toBe(forceRelay);
    const rows = await backgroundSaves(host, player);
    const result = { case: 'A dungeon', connection, source: `${W}x${H} PNG`, fog: '1 cover shape (~13%) + brush strokes', saves: rows, summary: summarize(rows) };
    if (!forceRelay) {
      result.structured = await structuredSaves(host, player, [
        ['token move', async (i) => tokenDrag(host, await centreOf(host, 't_bard'), i % 2 ? -42 : 42, 0)],
        ['token rotate', async () => { const c = await centreOf(host, 't_bard'); const a = await screenOf(host, c.x, c.y); await host.mouse.click(a.x, a.y); await host.keyboard.press('r'); }],
        ['aura', async (i) => { await openModal(host, await centreOf(host, 't_bard'), 'setAura'); await host.locator('#auraRadius').fill(String(2 + i)); await host.locator('#auraSaveBtn').click(); await expect(host.locator('#auraModal')).toBeHidden(); }],
        ['vision cone', async (i) => { await openModal(host, await centreOf(host, 't_bard'), 'setVision'); await host.locator('#visionRange').fill(String(4 + i)); await host.locator('#visionSaveBtn').click(); await expect(host.locator('#visionModal')).toBeHidden(); }],
        ['grid style', async (i) => {
          if (!(await host.locator('#accMap').evaluate((el) => el.classList.contains('show')))) await host.locator('[data-bs-target="#accMap"]').click();
          await expect(host.locator('#bmAccordion .collapsing')).toHaveCount(0);
          await host.locator('#gridColor').fill(['#ff00aa', '#00ffcc', '#ffaa00'][i % 3]);
        }],
      ]);
      const reloadRows = await firstSavesAfterReload(host, player, 't_bard');
      result.firstSaveAfterReload = reloadRows;
    }
    record(`A-dungeon-${conn}`, result);
    await hc.close();
    await pc.close();
  });

  test(`D. large map near the limits (${conn})`, async ({ browser }) => {
    test.setTimeout(900000);
    const { context: hc, page: host } = await openHost(browser, { forceRelay });
    const W = 8000, H = 6000;
    await importCase(host, {
      map: await makeFixture(host, 'photo', W, H, { seed: 7 }),
      tokens: [{ id: 't_bard', name: 'Bard', imgSrc: BARD, x: 140, y: 140, w: 70, h: 70, rot: 0 }],
      fogShapes: [{ id: 'fs1', type: 'rect', x: 4000, y: 3000, w: 3000, h: 2500, rot: 0, mode: 'cover', color: '#000000' }],
    });
    const { context: pc, player } = await startAndJoin(browser, host, { forceRelay });
    await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 120000 });
    const connection = await connectionInfo(player);
    expect(connection.usingTurnRelay).toBe(forceRelay);
    const rows = await backgroundSaves(host, player, { n: forceRelay ? 3 : SAVES });
    const result = { case: 'D large', connection, source: `${W}x${H} JPEG (painted art + grain)`, fog: '1 cover shape (~16%) + brush strokes', saves: rows, summary: summarize(rows) };
    if (!forceRelay) result.firstSaveAfterReload = await firstSavesAfterReload(host, player, 't_bard');
    record(`D-large-${conn}`, result);
    await hc.close();
    await pc.close();
  });
}

test('B. high-detail painted map (direct)', async ({ browser }) => {
  test.setTimeout(600000);
  const { context: hc, page: host } = await openHost(browser);
  const W = 4096, H = 2730;
  await importCase(host, { map: await makeFixture(host, 'photo', W, H, { seed: 3 }), tokens: [{ id: 't_bard', name: 'Bard', imgSrc: BARD, x: 140, y: 140, w: 70, h: 70, rot: 0 }] });
  const { context: pc, player } = await startAndJoin(browser, host);
  await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 60000 });
  const rows = await backgroundSaves(host, player);
  record('B-detailed-direct', { case: 'B high-detail', connection: await connectionInfo(player), source: `${W}x${H} JPEG`, fog: 'brush strokes only (<2%)', saves: rows, summary: summarize(rows) });
  await hc.close();
  await pc.close();
});

test('B2. painted map without synthetic grain (direct)', async ({ browser }) => {
  test.setTimeout(600000);
  const { context: hc, page: host } = await openHost(browser);
  const W = 4096, H = 2730;
  await importCase(host, { map: await makeFixture(host, 'photo', W, H, { seed: 3, grain: false }), tokens: [{ id: 't_bard', name: 'Bard', imgSrc: BARD, x: 140, y: 140, w: 70, h: 70, rot: 0 }] });
  const { context: pc, player } = await startAndJoin(browser, host);
  await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 60000 });
  const rows = await backgroundSaves(host, player);
  record('B2-painted-direct', { case: 'B2 painted (no grain)', connection: await connectionInfo(player), source: `${W}x${H} JPEG`, fog: 'brush strokes only (<2%)', saves: rows, summary: summarize(rows) });
  await hc.close();
  await pc.close();
});

test('C. heavily fogged map, revealing as play goes (direct)', async ({ browser }) => {
  test.setTimeout(600000);
  const { context: hc, page: host } = await openHost(browser);
  const W = 4096, H = 2730;
  await importCase(host, {
    map: await makeFixture(host, 'photo', W, H, { seed: 5 }),
    fog: await makeFog(host, W, H, 0.8),
    tokens: [{ id: 't_bard', name: 'Bard', imgSrc: BARD, x: 140, y: 140, w: 70, h: 70, rot: 0 }],
  });
  const { context: pc, player } = await startAndJoin(browser, host);
  await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 60000 });
  const rows = await backgroundSaves(host, player, { mode: 'reveal', origin: { x: 300, y: 300 } });
  record('C-fogged-direct', { case: 'C heavy fog', connection: await connectionInfo(player), source: `${W}x${H} JPEG`, fog: 'painted fog bitmap ~80% + reveal strokes', saves: rows, summary: summarize(rows) });
  await hc.close();
  await pc.close();
});

test('E. several distinct custom token images (direct)', async ({ browser }) => {
  test.setTimeout(600000);
  const { context: hc, page: host } = await openHost(browser);
  const W = 2800, H = 2000;
  const art = await makeTokenArt(host, 8);
  await importCase(host, {
    map: await makeFixture(host, 'dungeon', W, H),
    tokens: art.map((src, i) => ({ id: `t_art${i}`, name: `Hero ${i}`, imgSrc: src, x: 140 + i * 140, y: 140, w: 70, h: 70, rot: 0, showLabel: true })),
  });
  await expect.poll(async () => (await hostSnapshot(host)).tokens.filter((t) => t.assetId).length, { timeout: 60000 }).toBe(8);
  const tokenEncodes = (await perfOf(host)).events.filter((e) => e.name === 'encode-end' && e.w <= 512 && e.h <= 512);
  const joinT0 = Date.now();
  const { context: pc, player } = await startAndJoin(browser, host);
  await expect(player.locator('[data-art="image"]')).toHaveCount(8, { timeout: 60000 });
  const joinToArtMs = Date.now() - joinT0;
  const pp = await perfOf(player);
  const tokenMetas = pp.events.filter((e) => e.name === 'recv' && e.kind === 'asset-meta');
  const tokenBytes = (await perfOf(host)).events.filter((e) => e.name === 'send' && e.kind === 'chunk').reduce((a, e) => a + e.bytes, 0);
  const rows = await backgroundSaves(host, player, { n: 3 });
  record('E-token-art-direct', {
    case: 'E custom token art',
    connection: await connectionInfo(player),
    source: `${W}x${H} PNG + 8 distinct 256x256 token images`,
    tokenArt: { prepared: tokenEncodes.length, prepareEncodeMsTotal: r0(tokenEncodes.reduce((a, e) => a + e.ms, 0)), tokenBytesEach: tokenEncodes.map((e) => e.bytes), assetsReceivedOnJoin: tokenMetas.length, bytesSentOnJoin: tokenBytes, joinToAllArtShownMs: joinToArtMs },
    saves: rows,
    summary: summarize(rows),
  });
  await hc.close();
  await pc.close();
});

test('F. structured-heavy map: many tokens and measurements (direct)', async ({ browser }) => {
  test.setTimeout(600000);
  const { context: hc, page: host } = await openHost(browser);
  const W = 2800, H = 2000;
  const tokens = Array.from({ length: 200 }, (_, i) => ({
    id: `t_${i}`, name: `Goblin ${i}`, imgSrc: i % 3 ? BARD : '/images/enemyTokens/EnemyHumanoidToken.png',
    x: 70 * (i % 38), y: 70 * Math.floor(i / 38) + 280, w: 70, h: 70, rot: (i % 8) * 0.785, showLabel: i % 2 === 0,
    statusConditions: i % 5 === 0 ? ['Prone', 'Poisoned'] : [],
    aura: i % 10 === 0 ? { radius: 2, color: '#8bd3ff' } : undefined, visionCone: i % 7 === 0 ? { range: 12, angle: 90, color: '#ffff88' } : undefined,
  }));
  tokens[0].x = 140; tokens[0].y = 140;
  const measurements = Array.from({ length: 60 }, (_, i) => ({ id: `pm-${i}`, type: ['line', 'cone', 'circle'][i % 3], x1: 50 + i * 40, y1: 1800, x2: 150 + i * 40, y2: 1900, color: '#8bd3ff' }));
  await importCase(host, { map: await makeFixture(host, 'dungeon', W, H), tokens, measurements });
  const { context: pc, player } = await startAndJoin(browser, host);
  await expect(player.locator('.ls-token')).toHaveCount(200, { timeout: 60000 });
  const rows = await backgroundSaves(host, player, { n: 3 });
  const structured = await structuredSaves(host, player, [['token move (200 tokens, 60 measurements)', async (i) => tokenDrag(host, await centreOf(host, 't_0'), i % 2 ? -42 : 42, 0)]], 5);
  record('F-structured-heavy-direct', { case: 'F structured-heavy', connection: await connectionInfo(player), source: `${W}x${H} PNG, 200 tokens, 60 measurements`, saves: rows, summary: summarize(rows), structured });
  await hc.close();
  await pc.close();
});
