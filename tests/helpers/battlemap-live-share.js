// Shared helpers for the Battle Map Live Share browser specs (live-share-assets.spec.js,
// battlemap-staged-publishing.spec.js): a Battle Map host (battlemap.html?liveshare=1) and a player
// (liveshare-dev.html) in separate contexts through the local relay, with send logs, generated maps
// and token art, the Battle Map's own JSON import, and its save (Ctrl+S).
import { expect } from '@playwright/test';
import { RELAY } from './live-share.js';

export const HOST_PAGE = `/battlemap?liveshare=1&relay=${RELAY}`;
export const VIEW_SCALE = 0.6;
export const SECRET = { x: 500, y: 200, w: 100, h: 100 }; // under the cover shape below
export const COVER = { x: 480, y: 180, w: 140, h: 140 };

export function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()} (${m.location().url})`);
  });
  return errors;
}

// Host: log every data-channel send (text as-is; binary as its size and first bytes).
export function recordHostSends() {
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
export function recordPlayerTraffic() {
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

export const hostSnapshot = (page) => page.evaluate(() => window.BattleMapLiveShare.getPlayerSafeState());
export const diagnostics = async (page) => JSON.parse(await page.getByTestId('diagnostics').textContent());
export const sentText = (page) => page.evaluate(() => window.__lsSent.filter((m) => typeof m === 'string'));
export const sentMetas = async (page) => (await sentText(page)).map((t) => JSON.parse(t)).filter((m) => m.type === 'asset-meta');

// A generated map image, as a data URL: green left half, blue right half, and the secret.
export function makeMap(page, { width = 800, height = 600, noise = false } = {}) {
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
export async function makeTokenPng(page) {
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

// 2.3.27: players see the last saved map, so DM changes here are followed by a save (Ctrl+S).
export async function save(page) {
  await page.keyboard.press('Control+s');
  await expect(page.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/, { timeout: 15000 });
}

// Opens a sidebar accordion panel and waits for it to finish animating. Opening one panel collapses
// the others over ~350ms, and a collapsing panel still counts as visible, so checking visibility
// mid-animation and skipping the click leaves the panel closing under the next action.
export async function openPanel(page, panelId) {
  const settled = () => expect(page.locator('#bmAccordion .collapsing')).toHaveCount(0);
  await settled();
  if (!(await page.locator(`#${panelId}`).evaluate((el) => el.classList.contains('show')))) await page.locator(`[data-bs-target="#${panelId}"]`).click();
  await expect(page.locator(`#${panelId}`)).toHaveClass(/(^|\s)show(\s|$)/);
  await settled();
}

export async function importMap(page, mapDataUrl, { tokens, fogShapes = [{ id: 'fs_cover', type: 'rect', ...COVER, rot: 0, mode: 'cover', color: '#000000' }], fog = undefined }) {
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
  await openPanel(page, 'accSession');
  await page.locator('#importJsonFile').setInputFiles({ name: 'map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty', { timeout: 15000 }); // imported (a draft)
  await save(page);
  await expect.poll(async () => (await hostSnapshot(page))?.map.width, { timeout: 15000 }).toBeGreaterThan(0);
  await expect.poll(async () => (await hostSnapshot(page)).tokens.length).toBe(tokens.filter((t) => t.visibleToPlayers !== false).length);
}

// Screen position (CSS px) of a world point, from the imported view (x 0, y 0, scale VIEW_SCALE).
export async function screenOf(page, wx, wy) {
  const box = await page.locator('#uiLayer').boundingBox();
  return { x: box.x + wx * VIEW_SCALE, y: box.y + wy * VIEW_SCALE };
}

// Right-clicks the token at a world point and picks a context-menu command; returns the item's text.
export async function tokenMenu(page, world, cmd) {
  const at = await screenOf(page, world.x, world.y);
  await page.mouse.click(at.x, at.y, { button: 'right' });
  const item = page.locator(`#ctxMenu [data-cmd="${cmd}"]`);
  const text = await item.textContent();
  await item.click();
  return text;
}

export async function addPresetToken(page, label) {
  await openPanel(page, 'accTokens');
  await page.locator('#tokenPreset').selectOption({ label });
  await page.locator('#addPreset').click();
}

export async function startAndJoin(browser, host) {
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

export async function openHost(browser, page = HOST_PAGE) {
  const hostContext = await browser.newContext();
  await hostContext.addInitScript(recordHostSends);
  const host = await hostContext.newPage();
  const hostErrors = watchErrors(host);
  await host.goto(page);
  await host.waitForFunction(() => window.BattleMapLiveShare);
  return { hostContext, host, hostErrors };
}

// Decode the background the player is showing and read pixels from it (in background pixels).
export function playerBackgroundPixels(player, points) {
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

export const near = (px, rgb, tol = 24) => px.every((v, i) => Math.abs(v - rgb[i]) <= tol);
