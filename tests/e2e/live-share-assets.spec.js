// Live Share Milestone 3: the player-visible background and custom token art, end to end, on the
// real Battle Map (battlemap.html?liveshare=1) with a player in a separate context
// (liveshare-dev.html), over a real RTCDataChannel through the local relay.
//
// The map is imported through the Battle Map's own "Import JSON" input: a generated map image with
// a distinctive secret (a magenta/white checkerboard) under a fog cover shape, plus tokens. Every
// other change is made through the Battle Map UI. What the player received is checked by decoding
// the background it displays; what left the host is checked from a log of every data-channel send.
import { test, expect } from '@playwright/test';
import { RELAY } from '../helpers/live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const HOST_PAGE = `/battlemap?liveshare=1&relay=${RELAY}`;
const VIEW_SCALE = 0.6;
const SECRET = { x: 500, y: 200, w: 100, h: 100 }; // under the cover shape below
const COVER = { x: 480, y: 180, w: 140, h: 140 };

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()} (${m.location().url})`);
  });
  return errors;
}

// Host: log every data-channel send (text as-is; binary as its size and first bytes).
function recordHostSends() {
  const send = RTCDataChannel.prototype.send;
  window.__lsSent = [];
  window.__lsChannels = [];
  window.__lsOnSend = null;
  RTCDataChannel.prototype.send = function (data) {
    if (!window.__lsChannels.includes(this)) window.__lsChannels.push(this);
    if (typeof data === 'string') window.__lsSent.push(data);
    else {
      const bytes = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer);
      window.__lsSent.push({ binary: bytes.length, head: Array.from(bytes.subarray(0, 48)) });
    }
    const result = send.call(this, data);
    if (window.__lsOnSend) window.__lsOnSend(data);
    return result;
  };
}

// Player: log the order of arriving messages, and track object URLs.
function recordPlayerTraffic() {
  window.__lsLog = [];
  window.__lsUrls = { created: new Set(), revoked: new Set() };
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (b) => {
    const u = create(b);
    window.__lsUrls.created.add(u);
    return u;
  };
  URL.revokeObjectURL = (u) => {
    window.__lsUrls.revoked.add(u);
    revoke(u);
  };
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = function (...args) {
    const pc = new PC(...args);
    pc.addEventListener('datachannel', (e) =>
      e.channel.addEventListener('message', (m) => {
        if (typeof m.data === 'string') {
          const msg = JSON.parse(m.data);
          window.__lsLog.push({ type: msg.type, revision: msg.payload && msg.payload.revision, kind: msg.asset && msg.asset.kind, assetId: msg.asset ? msg.asset.assetId : msg.assetId });
        } else window.__lsLog.push({ type: 'chunk' });
      })
    );
    return pc;
  };
  // When did structured state first appear, and was a background image already there?
  document.addEventListener('DOMContentLoaded', () => {
    const svg = document.querySelector('[data-testid="player-map"]');
    new MutationObserver(() => {
      if (!window.__lsFirstRender && svg.querySelector('.ls-token')) {
        window.__lsFirstRender = { tokens: svg.querySelectorAll('.ls-token').length, background: !!svg.querySelector('.ls-background-image') };
      }
    }).observe(svg, { childList: true, subtree: true });
  });
}

const hostSnapshot = (page) => page.evaluate(() => window.BattleMapLiveShare.getPlayerSafeState());
const diagnostics = async (page) => JSON.parse(await page.getByTestId('diagnostics').textContent());
const sentText = (page) => page.evaluate(() => window.__lsSent.filter((m) => typeof m === 'string'));
const sentMetas = async (page) => (await sentText(page)).map((t) => JSON.parse(t)).filter((m) => m.type === 'asset-meta');

// A generated map image, as a data URL: green left half, blue right half, and the secret.
function makeMap(page, { width = 800, height = 600, noise = false } = {}) {
  return page.evaluate(
    ({ width, height, noise, SECRET }) => {
      const c = Object.assign(document.createElement('canvas'), { width, height });
      const g = c.getContext('2d');
      if (noise) {
        const d = g.createImageData(width, height);
        crypto.getRandomValues(d.data.subarray(0, Math.min(d.data.length, 65536)));
        for (let i = 65536; i < d.data.length; i += 65536) crypto.getRandomValues(d.data.subarray(i, Math.min(d.data.length, i + 65536)));
        for (let i = 3; i < d.data.length; i += 4) d.data[i] = 255;
        g.putImageData(d, 0, 0);
        return c.toDataURL('image/jpeg', 0.92);
      }
      g.fillStyle = '#208040';
      g.fillRect(0, 0, width / 2, height);
      g.fillStyle = '#204080';
      g.fillRect(width / 2, 0, width / 2, height);
      for (let y = 0; y < SECRET.h; y += 10) {
        for (let x = 0; x < SECRET.w; x += 10) {
          g.fillStyle = (x + y) % 20 === 0 ? '#ff00ff' : '#ffffff';
          g.fillRect(SECRET.x + x, SECRET.y + y, 10, 10);
        }
      }
      return c.toDataURL('image/png');
    },
    { width, height, noise, SECRET }
  );
}

// A small, distinctive token image (orange with a white bar) as PNG bytes.
async function makeTokenPng(page) {
  const b64 = await page.evaluate(() => {
    const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
    const g = c.getContext('2d');
    g.fillStyle = '#ff8000';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 28, 64, 8);
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}

async function importMap(page, mapDataUrl, { tokens, fogShapes = [{ id: 'fs_cover', type: 'rect', ...COVER, rot: 0, mode: 'cover', color: '#000000' }], fog = undefined }) {
  const data = {
    fog,
    map: { imgSrc: mapDataUrl },
    mapTransform: { scale: 1, x: 0, y: 0 },
    grid: { size: 50, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
    view: { x: 0, y: 0, scale: VIEW_SCALE },
    tokens,
    fogState: { enabled: true, mode: 'cover', brush: 80 },
    fogShapes,
  };
  if (!(await page.locator('#importJsonFile').isVisible())) await page.locator('[data-bs-target="#accSession"]').click();
  await page.locator('#importJsonFile').setInputFiles({ name: 'map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect.poll(async () => (await hostSnapshot(page)).map.width, { timeout: 15000 }).toBeGreaterThan(0);
  await expect.poll(async () => (await hostSnapshot(page)).tokens.length).toBe(tokens.length);
}

// Screen position (CSS px) of a world point, from the imported view (x 0, y 0, scale VIEW_SCALE).
async function screenOf(page, wx, wy) {
  const box = await page.locator('#uiLayer').boundingBox();
  return { x: box.x + wx * VIEW_SCALE, y: box.y + wy * VIEW_SCALE };
}

async function startAndJoin(browser, host) {
  await host.getByTestId('start-room').click();
  await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players');
  const joinUrl = await host.getByTestId('join-link').textContent();
  const playerContext = await browser.newContext();
  await playerContext.addInitScript(recordPlayerTraffic);
  const player = await playerContext.newPage();
  const playerErrors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  return { playerContext, player, playerErrors };
}

async function openHost(browser, page = HOST_PAGE) {
  const hostContext = await browser.newContext();
  await hostContext.addInitScript(recordHostSends);
  const host = await hostContext.newPage();
  const hostErrors = watchErrors(host);
  await host.goto(page);
  await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
  return { hostContext, host, hostErrors };
}

// Decode the background the player is showing and read pixels from it (in background pixels).
function playerBackgroundPixels(player, points) {
  return player.evaluate(async (points) => {
    const img = document.querySelector('[data-testid="player-map"] .ls-background-image');
    const href = img.getAttribute('href');
    const bitmap = await createImageBitmap(await (await fetch(href)).blob());
    const c = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
    const g = c.getContext('2d');
    g.drawImage(bitmap, 0, 0);
    const read = ({ x, y, w = 1, h = 1 }) => {
      const d = g.getImageData(x, y, w, h).data;
      const px = [];
      for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
      return px;
    };
    return { width: bitmap.width, height: bitmap.height, pixels: points.map(read) };
  }, points);
}

const near = (px, rgb, tol = 24) => px.every((v, i) => Math.abs(v - rgb[i]) <= tol);

test.describe('Live Share player-visible background and assets (Milestone 3)', () => {
  test('the player gets the fogged map, custom token art once, and markers otherwise; nothing hidden is sent', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);

    // 1-2: a real map image with a secret under a fog cover shape, a preset token (generic art) and
    // a token whose image is on another origin without CORS (the host cannot read it).
    const mapUrl = await makeMap(host);
    const external = 'http://127.0.0.1:3100/images/playerTokens/PlayerBardToken.png';
    await importMap(host, mapUrl, {
      tokens: [
        { id: 't_generic', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, showLabel: true },
        { id: 't_external', name: 'Guest', imgSrc: external, x: 200, y: 400, w: 50, h: 50, rot: 0 },
      ],
    });
    await expect.poll(async () => (await hostSnapshot(host)).background, { timeout: 10000 }).not.toBeNull();
    const first = await hostSnapshot(host);
    expect(first.background).toEqual({ assetId: expect.stringMatching(/^[0-9a-f]{64}$/), revision: 1 });
    expect(first.tokens.map((t) => t.assetId)).toEqual([null, null]); // generic art; unreadable external art

    // 3-6: the player joins: structured state first (markers, placeholder), then the background.
    const { playerContext, player, playerErrors } = await startAndJoin(browser, host);
    await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 10000 });
    expect(await player.evaluate(() => window.__lsFirstRender)).toEqual({ tokens: 2, background: false });
    await expect(player.getByTestId('map-assets')).toHaveText('Map image shown.');
    expect(await player.locator('.ls-background-image').getAttribute('data-asset-id')).toBe(first.background.assetId);
    await expect(player.locator('[data-token-id="t_generic"]')).toHaveAttribute('data-art', 'marker');
    await expect(player.locator('[data-token-id="t_external"]')).toHaveAttribute('data-art', 'marker'); // 17-18: fallback

    // Placement: the background covers the map's world rectangle, under the grid and tokens.
    const bgBox = await player.locator('.ls-background-image').evaluate((el) => ['x', 'y', 'width', 'height'].map((a) => el.getAttribute(a)));
    expect(bgBox).toEqual(['0', '0', '800', '600']);
    const layerOrder = await player.evaluate(() => [...document.querySelector('[data-testid="player-map"]').children].map((n) => n.getAttribute('class')));
    expect(layerOrder.indexOf('ls-background-image')).toBeLessThan(layerOrder.indexOf('ls-grid'));
    expect(layerOrder.indexOf('ls-grid')).toBeLessThan(layerOrder.indexOf('ls-tokens'));

    // 7-8: visible areas match the source; the covered secret is solid fog, with nothing of the
    // magenta/white checkerboard recoverable from the decoded pixels.
    const seen = await playerBackgroundPixels(player, [
      { x: 100, y: 300 },
      { x: 700, y: 500 },
      { x: SECRET.x, y: SECRET.y, w: SECRET.w, h: SECRET.h },
    ]);
    expect([seen.width, seen.height]).toEqual([800, 600]);
    expect(near(seen.pixels[0][0], [0x20, 0x80, 0x40])).toBe(true);
    expect(near(seen.pixels[1][0], [0x20, 0x40, 0x80])).toBe(true);
    const hidden = seen.pixels[2];
    expect(hidden).toHaveLength(SECRET.w * SECRET.h);
    for (const px of hidden) expect(px[0] + px[1] + px[2]).toBeLessThan(24); // opaque black fog
    const spread = Math.max(...hidden.map((p) => p[0] + p[1] + p[2])) - Math.min(...hidden.map((p) => p[0] + p[1] + p[2]));
    expect(spread).toBeLessThan(12); // no trace of the checkerboard

    // 9-10: moving a token sends structured state only: no new background, no asset transfer.
    const rebuilds = () => host.evaluate(() => window.BattleMapLiveShare.getAssetDiagnostics().background.rebuilds);
    const backgroundMetas = async () => (await sentMetas(host)).filter((m) => m.asset.kind === 'background').length;
    const rebuildsBefore = await rebuilds();
    const metasBefore = await backgroundMetas();
    const from = await screenOf(host, 125, 125);
    await host.mouse.move(from.x, from.y);
    await host.mouse.down();
    await host.mouse.move(from.x + 90, from.y + 60, { steps: 10 });
    await host.mouse.up();
    await expect.poll(async () => (await hostSnapshot(host)).tokens[0].x).not.toBe(100);
    const moved = await hostSnapshot(host);
    await expect(player.locator('.ls-token-body').first()).toHaveAttribute('transform', new RegExp(`^translate\\(${moved.tokens[0].x + 25} `));
    // A rebuild would start up to 250 ms after a change (1 s at most during continuous changes) and
    // then take time to encode: wait well past that window before checking nothing happened.
    await host.waitForTimeout(1500);
    expect((await hostSnapshot(host)).background).toEqual(first.background);
    expect(await rebuilds()).toBe(rebuildsBefore);
    expect(await backgroundMetas()).toBe(metasBefore);

    // 11-12: a fog change (a new cover shape at the view centre) makes a new background revision.
    await host.locator('#fogCover').click();
    await host.locator('#addFogShape').click();
    await expect.poll(async () => (await hostSnapshot(host)).background.revision, { timeout: 10000 }).toBe(2);
    const refogged = await hostSnapshot(host);
    expect(refogged.background.assetId).not.toBe(first.background.assetId);
    await expect(player.locator('.ls-background-image')).toHaveAttribute('data-asset-id', refogged.background.assetId, { timeout: 10000 });

    // 13-14: custom token art, uploaded through the Battle Map, appears on the player.
    const art = await makeTokenPng(host);
    if (!(await host.locator('#tokenFile').isVisible())) await host.locator('[data-bs-target="#accTokens"]').click();
    await host.locator('#tokenFile').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: art });
    await host.locator('#tokenName').fill('Hero');
    await host.locator('#addToken').click();
    await expect.poll(async () => (await hostSnapshot(host)).tokens[2]?.assetId ?? '', { timeout: 10000 }).toMatch(/^[0-9a-f]{64}$/);
    const withArt = await hostSnapshot(host);
    const heroId = withArt.tokens[2].id;
    const artId = withArt.tokens[2].assetId;
    await expect(player.locator(`[data-token-id="${heroId}"]`)).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    const artPixel = await player.evaluate(async (heroId) => {
      const href = document.querySelector(`[data-token-id="${heroId}"] .ls-token-art`).getAttribute('href');
      const bitmap = await createImageBitmap(await (await fetch(href)).blob());
      const c = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
      const g = c.getContext('2d');
      g.drawImage(bitmap, 0, 0);
      return [Array.from(g.getImageData(8, 8, 1, 1).data.slice(0, 3)), Array.from(g.getImageData(8, 32, 1, 1).data.slice(0, 3))];
    }, heroId);
    expect(near(artPixel[0], [0xff, 0x80, 0x00])).toBe(true);
    expect(near(artPixel[1], [0xff, 0xff, 0xff])).toBe(true);

    // 15-16: a second token with the same art reuses the asset: it is not sent again.
    const tokenMetas = async () => (await sentMetas(host)).filter((m) => m.asset.kind === 'token');
    await expect.poll(async () => (await tokenMetas()).length).toBe(1);
    await host.locator('#tokenFile').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: art });
    await host.locator('#addToken').click();
    await expect.poll(async () => (await hostSnapshot(host)).tokens.length).toBe(4);
    await expect.poll(async () => (await hostSnapshot(host)).tokens[3].assetId).toBe(artId);
    const secondId = (await hostSnapshot(host)).tokens[3].id;
    await expect(player.locator(`[data-token-id="${secondId}"]`)).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    expect((await tokenMetas()).length).toBe(1);
    expect(await player.locator(`[data-token-id="${secondId}"] .ls-token-art`).getAttribute('href')).toBe(
      await player.locator(`[data-token-id="${heroId}"] .ls-token-art`).getAttribute('href')
    );

    // Privacy: nothing that left the host is the source map, fog state, a token source or HP.
    const texts = await sentText(host);
    for (const text of texts) {
      expect(text).not.toMatch(/data:image|imgSrc|127\.0\.0\.1|playerTokens|fogShapes|fogState|"fog"|"cover"|"reveal"|"hp"|maxHp/);
    }
    const binaries = await host.evaluate(() => window.__lsSent.filter((m) => typeof m !== 'string'));
    const PNG = [0x89, 0x50, 0x4e, 0x47];
    for (const b of binaries) {
      // Chunk payloads start at byte 37: none is a PNG (the source map and uploaded art are PNGs;
      // what is sent is the re-encoded WebP composite and WebP token art).
      expect(b.head.slice(37, 41)).not.toEqual(PNG);
    }
    const metas = await sentMetas(host);
    expect(metas.map((m) => m.asset.mime)).toEqual(metas.map(() => 'image/webp'));
    // Only content-derived ids in the structured snapshots.
    const snapshots = texts.map((t) => JSON.parse(t)).filter((m) => m.type === 'battlemap-snapshot');
    for (const s of snapshots) {
      if (s.payload.background) expect(Object.keys(s.payload.background).sort()).toEqual(['assetId', 'revision']);
      for (const t of s.payload.tokens) expect(t.assetId === null || /^[0-9a-f]{64}$/.test(t.assetId)).toBe(true);
    }

    // Diagnostics: counts and ids, no bytes or sources.
    const hostDiag = await diagnostics(host);
    expect(hostDiag.preparedAssets.background).toMatchObject({ status: 'ready', revision: 2, mime: 'image/webp' });
    expect(hostDiag.preparedAssets.tokens).toMatchObject({ unreadable: 1 });
    await expect.poll(async () => (await diagnostics(host)).assets.sent).toBeGreaterThanOrEqual(3);
    const playerDiag = await diagnostics(player);
    expect(playerDiag.assets).toMatchObject({ failed: 0, rejected: 0 });
    expect(playerDiag.assets.deduplicated).toBeGreaterThan(0);
    expect(JSON.stringify(hostDiag) + JSON.stringify(playerDiag)).not.toMatch(/data:|blob:|127\.0\.0\.1|playerTokens/);

    // 19-20: the DM ends the session: every object URL is revoked; the structured map stays.
    const liveBefore = await player.evaluate(() => [...window.__lsUrls.created].filter((u) => !window.__lsUrls.revoked.has(u)).length);
    expect(liveBefore).toBeGreaterThanOrEqual(2); // background + token art
    await host.getByTestId('end-session').click();
    await expect(player.getByTestId('map-status')).toContainText('Disconnected', { timeout: 10000 });
    await expect.poll(() => player.evaluate(() => [...window.__lsUrls.created].filter((u) => !window.__lsUrls.revoked.has(u)).length)).toBe(0);
    await expect(player.locator('.ls-background-image, .ls-token-art')).toHaveCount(0);
    await expect(player.locator('.ls-token')).toHaveCount(4);

    // The only expected errors: the browser refusing the host's CORS read of the external token
    // image (reported twice, both naming that URL).
    expect(hostErrors.filter((e) => !e.includes(external))).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await playerContext.close();
  });

  test('a large background is chunked, paced by backpressure, and does not hold up structured updates', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const mapUrl = await makeMap(host, { width: 3000, height: 3000, noise: true });
    await importMap(host, mapUrl, {
      tokens: [{ id: 't_a', name: 'A', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, selected: true }],
      fogShapes: [],
    });
    await expect.poll(async () => (await hostSnapshot(host)).background, { timeout: 20000 }).not.toBeNull();

    // As soon as the background's metadata goes out, rotate the token: a structured change made
    // while the transfer runs.
    await host.evaluate(() => {
      window.__lsOnSend = (data) => {
        if (typeof data === 'string' && data.includes('"asset-meta"') && data.includes('"background"')) {
          window.__lsOnSend = null;
          setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })), 0);
        }
      };
    });
    const { playerContext, player, playerErrors } = await startAndJoin(browser, host);
    await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 30000 });

    const log = await player.evaluate(() => window.__lsLog);
    const meta = log.findIndex((m) => m.type === 'asset-meta' && m.kind === 'background');
    const chunks = log.map((m, i) => (m.type === 'chunk' ? i : -1)).filter((i) => i > meta);
    expect(chunks.length).toBeGreaterThan(100); // many 16 KiB chunks
    const lastChunk = chunks[chunks.length - 1];
    // A snapshot for the rotation arrived between the first and the last chunk.
    const during = log.slice(meta, lastChunk).filter((m) => m.type === 'battlemap-snapshot');
    expect(during.length).toBeGreaterThan(0);
    await expect.poll(async () => Number(await player.getByTestId('player-map').getAttribute('data-revision'))).toBe((await hostSnapshot(host)).revision);
    const playerDiag = await diagnostics(player);
    expect(playerDiag.assets).toMatchObject({ received: 1, failed: 0, rejected: 0 });

    expect(hostErrors).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await playerContext.close();
  });

  test('a saved fog bitmap that cannot be decoded covers the whole map: the source never reaches the player', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const warnings = [];
    host.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
    const mapUrl = await makeMap(host);
    // A corrupt fog bitmap in the saved map (and no fog shapes): previously the fog stayed cleared.
    await importMap(host, mapUrl, { tokens: [], fogShapes: [], fog: 'data:image/png;base64,bm90IGFuIGltYWdl' });
    await expect.poll(async () => (await hostSnapshot(host)).background, { timeout: 10000 }).not.toBeNull();
    expect(warnings.some((w) => w.includes('Saved fog could not be loaded'))).toBe(true);

    const { playerContext, player, playerErrors } = await startAndJoin(browser, host);
    await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 10000 });
    // The raster the player received: fully covered, nothing of the map anywhere.
    const seen = await playerBackgroundPixels(player, [
      { x: 0, y: 0, w: 800, h: 600 },
    ]);
    const pixels = seen.pixels[0];
    expect(pixels).toHaveLength(800 * 600);
    const maxBrightness = pixels.reduce((m, p) => Math.max(m, p[0] + p[1] + p[2]), 0);
    expect(maxBrightness).toBeLessThan(24); // no green, blue, magenta or white survives

    expect(hostErrors).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await playerContext.close();
  });

  test('without ?liveshare=1 the Battle Map composes, encodes and hashes nothing', async ({ browser }) => {
    test.setTimeout(90000);
    // Count every way the page could encode an image or hash one.
    const instrument = () => {
      window.__encodes = 0;
      window.__digests = 0;
      window.__peerConnections = 0;
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (...a) {
        window.__encodes += 1;
        return toBlob.apply(this, a);
      };
      if (window.OffscreenCanvas) {
        const convert = OffscreenCanvas.prototype.convertToBlob;
        OffscreenCanvas.prototype.convertToBlob = function (...a) {
          window.__encodes += 1;
          return convert.apply(this, a);
        };
      }
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle.digest = (...a) => {
        window.__digests += 1;
        return digest(...a);
      };
      const PC = window.RTCPeerConnection;
      window.RTCPeerConnection = function (...a) {
        window.__peerConnections += 1;
        return new PC(...a);
      };
    };
    const run = async (url) => {
      const context = await browser.newContext();
      await context.addInitScript(instrument);
      const page = await context.newPage();
      await page.goto(url);
      await page.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
      // A map with fog and a custom (uploaded) token: everything that would be prepared for sharing.
      await importMap(page, await makeMap(page), { tokens: [{ id: 't_art', name: 'Art', imgSrc: `data:image/png;base64,${(await makeTokenPng(page)).toString('base64')}`, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
      await page.locator('#fogCover').click();
      await page.locator('#addFogShape').click(); // a fog change after load, too
      await page.waitForTimeout(2000); // past any rebuild window
      const result = await page.evaluate(() => ({
        encodes: window.__encodes,
        digests: window.__digests,
        peerConnections: window.__peerConnections,
        diagnostics: window.BattleMapLiveShare.getAssetDiagnostics(),
        snapshot: window.BattleMapLiveShare.getPlayerSafeState(),
        panel: !!document.getElementById('bm-live-share'),
      }));
      await context.close();
      return result;
    };

    const plain = await run('/battlemap');
    expect(plain).toMatchObject({ encodes: 0, digests: 0, peerConnections: 0, diagnostics: null, panel: false });
    expect(plain.snapshot.background).toBeNull();
    expect(plain.snapshot.tokens.map((t) => t.assetId)).toEqual([null]);

    // Control: the same steps in Live Share mode do encode and hash, so the counters see the work.
    const sharing = await run(HOST_PAGE);
    expect(sharing.encodes).toBeGreaterThan(0);
    expect(sharing.digests).toBeGreaterThan(0);
    expect(sharing.snapshot.background).not.toBeNull();
    expect(sharing.snapshot.tokens[0].assetId).toMatch(/^[0-9a-f]{64}$/);
  });
});
