// 2.3.30 (Live Share player view polish): built-in token images by preset id, the DM's saved grid
// style, and the player's own pan / zoom. The DM edits the real Battle Map (publishing to the Live Share session page)
// and players (liveshare-dev.html, separate contexts, local relay) must see built-in images without
// any URL crossing, follow the saved grid style only after Save (without any background work), and
// navigate locally without anything reaching the host.
import { test, expect } from '@playwright/test';
import { watchErrors, recordPlayerTraffic, hostSnapshot, sentText, sentMetas, makeMap, makeTokenPng, save, importMap, openHost, openPanel, screenOf, startRoom as startRoomOn, sessionOf } from '../helpers/battlemap-live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const BARD = '/images/playerTokens/PlayerBardToken.png';
const DRAGON = '/images/enemyTokens/EnemyDragonToken.png';
const sentSnapshots = async (page) => (await sentText(page)).map((t) => JSON.parse(t)).filter((m) => m.type === 'battlemap-snapshot');
const backgroundMetas = async (page) => (await sentMetas(page)).filter((m) => m.asset.kind === 'background').length;
const rebuilds = (page) => page.evaluate(() => window.BattleMapLiveShare.getAssetDiagnostics().background.rebuilds);
const MAP = '[data-testid="player-map"]';

// The room on the Battle Map's session page (already started by openHost); its join link.
const startRoom = (host) => startRoomOn(sessionOf(host));

// A player that also records its own data-channel sends and every request its page makes.
async function joinPlayer(browser, joinUrl, contextOptions = {}) {
  const context = await browser.newContext(contextOptions);
  await context.addInitScript(recordPlayerTraffic);
  await context.addInitScript(() => {
    const send = RTCDataChannel.prototype.send;
    window.__playerSent = [];
    RTCDataChannel.prototype.send = function (data) {
      window.__playerSent.push(typeof data === 'string' ? data : `binary:${data.byteLength}`);
      return send.call(this, data);
    };
  });
  const player = await context.newPage();
  const errors = watchErrors(player);
  const requests = [];
  player.on('request', (r) => requests.push({ url: r.url(), type: r.resourceType() }));
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  return { context, player, errors, requests };
}

const viewBox = (player) => player.locator(MAP).getAttribute('viewBox');
const viewMode = (player) => player.locator(MAP).getAttribute('data-view');
const playerSends = (player) => player.evaluate(() => window.__playerSent.length);
const revisionShown = async (player) => Number(await player.locator(MAP).getAttribute('data-revision'));

test.describe('Live Share player view polish (2.3.30)', () => {
  test('built-in token images by preset id; custom art transferred; markers otherwise; hidden tokens send nothing', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const heroArt = `data:image/png;base64,${(await makeTokenPng(host)).toString('base64')}`;
    const spyArt = await host.evaluate(() => {
      const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
      c.getContext('2d').fillStyle = '#7a00ff';
      c.getContext('2d').fillRect(0, 0, 64, 64);
      return c.toDataURL('image/png');
    });
    await importMap(host, await makeMap(host), {
      tokens: [
        { id: 't_bard', name: 'Bard', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 }, // A: built-in
        { id: 't_hero', name: 'Hero', imgSrc: heroArt, x: 200, y: 100, w: 50, h: 50, rot: 0 }, // B: custom art
        { id: 't_own', name: 'Own', imgSrc: '/images/DMsToolboxLogo.png', x: 300, y: 100, w: 50, h: 50, rot: 0 }, // C: unlisted same-origin
        { id: 't_dragon', name: 'Dragon', imgSrc: DRAGON, x: 400, y: 100, w: 50, h: 50, rot: 0, visibleToPlayers: false }, // D: hidden built-in
        { id: 't_spy', name: 'Spy', imgSrc: spyArt, x: 500, y: 100, w: 50, h: 50, rot: 0, visibleToPlayers: false }, // E: hidden custom
      ],
    });
    await expect.poll(async () => (await hostSnapshot(host)).tokens[1].assetId, { timeout: 10000 }).toMatch(/^[0-9a-f]{64}$/);
    const A = await hostSnapshot(host);
    expect(A.version).toBe(4);
    expect(A.tokens.map((t) => [t.id, t.presetId, t.assetId === null])).toEqual([
      ['t_bard', 'player-bard', true],
      ['t_hero', null, false],
      ['t_own', null, true],
    ]);

    const p = await joinPlayer(browser, await startRoom(host));
    await expect(p.player.locator('[data-token-id="t_bard"]')).toHaveAttribute('data-art', 'preset', { timeout: 15000 });
    expect(await p.player.locator('[data-token-id="t_bard"] .ls-token-art').getAttribute('href')).toBe(BARD);
    // The built-in image really loads (from the player's own site).
    await expect.poll(() => p.player.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return i.naturalWidth; }, BARD)).toBeGreaterThan(0);
    await expect(p.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    await expect(p.player.locator('[data-token-id="t_own"]')).toHaveAttribute('data-art', 'marker');
    await expect(p.player.locator('[data-token-id="t_dragon"], [data-token-id="t_spy"]')).toHaveCount(0);

    // Only the custom art crossed as bytes; no URL or path of any token image was sent.
    const tokenMetas = (await sentMetas(host)).filter((m) => m.asset.kind === 'token').map((m) => m.asset.assetId);
    expect(new Set(tokenMetas)).toEqual(new Set([A.tokens[1].assetId]));
    for (const text of await sentText(host)) {
      expect(text).not.toMatch(/\/images\/|\.png|playerTokens|enemyTokens|DMsToolboxLogo|enemy-dragon|t_dragon|t_spy|Dragon"|"Spy"|data:image/);
    }

    // F: hostile preset ids, sent straight down the channel. A well-formed unknown id draws a
    // marker; a URL or path is rejected with the whole snapshot. Nothing is fetched from them.
    const before = await revisionShown(p.player);
    await sessionOf(host).evaluate(() => { // the session page owns the channel
      const base = JSON.parse(window.__lsSent.filter((m) => typeof m === 'string' && m.includes('battlemap-snapshot')).at(-1));
      const send = (msg) => window.__lsChannels[0].send(JSON.stringify(msg));
      const withPreset = (presetId, revision) => ({ ...base, payload: { ...base.payload, revision, tokens: base.payload.tokens.map((t, i) => (i === 0 ? { ...t, presetId } : t)) } });
      send(withPreset('https://evil.example/x.png', 1e8));
      send(withPreset('/images/playerTokens/../../secret.png', 1e8));
      send(withPreset('evil-example-com', 1e8)); // well-formed but unknown: accepted, drawn as a marker
    });
    await expect.poll(() => revisionShown(p.player)).toBe(1e8);
    expect(before).toBeLessThan(1e8);
    await expect(p.player.locator('[data-token-id="t_bard"]')).toHaveAttribute('data-art', 'marker');
    const playerDiag = JSON.parse(await p.player.getByTestId('diagnostics').textContent());
    expect(playerDiag.snapshots.snapshotsRejectedInvalid).toBe(2);
    // Every image the player page loaded came from its own site (page images and built-in token
    // images) or is an object URL it made from transferred bytes; the token images among them are
    // exactly built-in ones; nothing was requested for the hostile ids.
    const origin = new URL(p.player.url()).origin;
    const images = p.requests.filter((r) => r.type === 'image').map((r) => r.url);
    for (const url of images) expect(url.startsWith(`${origin}/`) || url.startsWith('blob:'), url).toBe(true);
    const tokenImages = images.filter((u) => /Tokens\//.test(u)).map((u) => u.slice(origin.length));
    expect(tokenImages).toContain(BARD);
    for (const path of tokenImages) expect(path, path).toMatch(/^\/images\/(playerTokens|enemyTokens)\/[A-Za-z]+Token\.png$/);
    expect(tokenImages).not.toContain(DRAGON); // the hidden built-in token: never loaded
    expect(p.requests.filter((r) => /evil|secret/.test(r.url))).toEqual([]);

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('the grid follows the DM\'s saved grid style, only after Save, with no background work', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_bard', name: 'Bard', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    // 1: a saved, unusual grid style.
    await openPanel(host, 'accMap');
    await host.locator('#gridColor').fill('#ff00aa');
    await host.locator('#gridAlpha').fill('0.8');
    await host.locator('#gridAlpha').dispatchEvent('input');
    await save(host);
    const A = await hostSnapshot(host);
    expect(A.grid).toMatchObject({ color: '#ff00aa', alpha: 0.8, show: true });

    // 2-3: the player draws it.
    const p = await joinPlayer(browser, await startRoom(host));
    const grid = () => p.player.evaluate(() => {
      const g = document.querySelector('[data-testid="player-map"] .ls-grid');
      return { stroke: g.getAttribute('stroke'), opacity: g.getAttribute('stroke-opacity'), lines: g.querySelectorAll('line').length };
    });
    await expect.poll(async () => (await grid()).stroke, { timeout: 15000 }).toBe('#ff00aa');
    const shown = await grid();
    expect(shown).toMatchObject({ opacity: '0.8' });
    expect(shown.lines).toBeGreaterThan(10);
    await expect.poll(async () => p.player.locator('.ls-background-image').getAttribute('data-asset-id'), { timeout: 15000 }).toBe(A.background.assetId);
    const rebuilds0 = await rebuilds(host);
    const bgMetas0 = await backgroundMetas(host);
    const snapshots0 = (await sentSnapshots(host)).length;

    // 4-5: unsaved style changes: the player is unchanged, nothing is sent.
    await host.locator('#gridColor').fill('#00ffcc');
    await host.locator('#gridAlpha').fill('0.3');
    await host.locator('#gridAlpha').dispatchEvent('input');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await host.waitForTimeout(1200);
    expect(await grid()).toEqual(shown);
    expect((await sentSnapshots(host)).length).toBe(snapshots0);

    // 6-7: Save: the player follows; the background is neither rebuilt nor sent again.
    await save(host);
    await expect.poll(async () => (await grid()).stroke, { timeout: 15000 }).toBe('#00ffcc');
    expect((await grid()).opacity).toBe('0.3');
    const B = await hostSnapshot(host);
    expect(B.revision).toBe(A.revision + 1);
    expect(B.background).toEqual(A.background);
    expect(await rebuilds(host)).toBe(rebuilds0);
    expect(await backgroundMetas(host)).toBe(bgMetas0);
    expect(await p.player.locator('.ls-background-image').getAttribute('data-asset-id')).toBe(A.background.assetId);

    // Hiding the grid: gone on the player after Save, still no background work.
    await host.locator('#showGrid').uncheck();
    await save(host);
    await expect.poll(async () => (await grid()).lines, { timeout: 15000 }).toBe(0);
    expect((await hostSnapshot(host)).background).toEqual(A.background);
    expect(await backgroundMetas(host)).toBe(bgMetas0);

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('players pan and zoom locally: nothing reaches the host, and updates do not reset the view', async ({ browser }) => {
    test.setTimeout(150000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), {
      tokens: [
        { id: 't_bard', name: 'Bard', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 },
        { id: 't_orc', name: 'Orc', imgSrc: DRAGON, x: 300, y: 300, w: 50, h: 50, rot: 0 },
      ],
    });
    const p = await joinPlayer(browser, await startRoom(host), { viewport: { width: 1100, height: 900 } });
    const { player } = p;
    await expect.poll(async () => player.locator('.ls-background-image').count(), { timeout: 15000 }).toBe(1);
    await expect(player.locator('[data-token-id="t_bard"]')).toHaveAttribute('data-art', 'preset');
    const published = await hostSnapshot(host);
    const hostTexts0 = (await sentText(host)).length;
    const playerSends0 = await playerSends(player);
    // View changes are drawn on the next animation frame: read the viewBox after it.
    const settled = async () => {
      await player.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      return viewBox(player);
    };
    const nums = async () => (await settled()).split(' ').map(Number);

    // Initial fit.
    await expect.poll(() => viewMode(player)).toBe('fit');
    const fitBox = await settled();
    const box = await player.locator(MAP).boundingBox();
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    // A click without a drag is a tap candidate (for future pings): the view does not move.
    await player.mouse.click(centre.x, centre.y);
    await expect.poll(async () => JSON.parse(await player.getByTestId('diagnostics').textContent()).view.taps).toBe(1);
    expect(await settled()).toBe(fitBox);
    await expect.poll(() => viewMode(player)).toBe('fit');

    // Wheel zoom about the pointer.
    await player.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
    await player.mouse.wheel(0, -400);
    await expect.poll(() => viewMode(player)).toBe('player');
    const zoomed = await nums();
    const fit = fitBox.split(' ').map(Number);
    expect(zoomed[2]).toBeLessThan(fit[2]);
    expect(zoomed[3]).toBeLessThan(fit[3]);

    // Drag pans; the release after a drag is not a tap.
    await player.mouse.move(centre.x, centre.y);
    await player.mouse.down();
    await player.mouse.move(centre.x - 120, centre.y - 60, { steps: 6 });
    await player.mouse.up();
    const panned = await nums();
    expect(panned[0]).toBeGreaterThan(zoomed[0]);
    expect(panned[1]).toBeGreaterThan(zoomed[1]);
    expect(panned[2]).toBeCloseTo(zoomed[2], 1);
    expect(JSON.parse(await player.getByTestId('diagnostics').textContent()).view.taps).toBe(1);

    // Navigation is local: nothing was sent by the player or the host, the host is unchanged.
    await player.waitForTimeout(500);
    expect(await playerSends(player)).toBe(playerSends0);
    expect((await sentText(host)).length).toBe(hostTexts0);
    expect(await hostSnapshot(host)).toEqual(published);
    await expect(host.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/);
    expect(await revisionShown(player)).toBe(published.revision);

    // Zoomed all the way in, the DM saves a token moved far off the map: the fitted rectangle grows,
    // but the player's view stays, and the next small zoom step is small (no jump).
    for (let i = 0; i < 20; i++) await player.mouse.wheel(0, -600);
    const atMax = await nums();
    expect(fit[2] / atMax[2]).toBeCloseTo(8, 1);
    const orcAt = await screenOf(host, 325, 325);
    await host.mouse.move(orcAt.x, orcAt.y);
    await host.mouse.down();
    await host.mouse.move(orcAt.x + 500, orcAt.y + 300, { steps: 8 });
    await host.mouse.up();
    await save(host);
    await expect.poll(() => revisionShown(player), { timeout: 15000 }).toBe(published.revision + 1);
    const moved = await hostSnapshot(host);
    expect(moved.tokens.find((t) => t.id === 't_orc').x).toBeGreaterThan(900); // off the 800-wide map
    expect(await settled()).toBe(atMax.join(' '));
    await player.mouse.wheel(0, 40);
    const stepped = await nums();
    expect(stepped[2] / atMax[2]).toBeCloseTo(Math.exp(40 * 0.0015), 2);
    const viewBefore = await settled();

    // A saved fog change: a new background arrives; the view still stays.
    const bg0 = await player.locator('.ls-background-image').getAttribute('data-asset-id');
    await host.locator('#fogCover').click();
    await host.locator('#addFogShape').click();
    await save(host);
    await expect.poll(() => player.locator('.ls-background-image').getAttribute('data-asset-id'), { timeout: 15000 }).not.toBe(bg0);
    expect(await settled()).toBe(viewBefore);
    await expect.poll(() => viewMode(player)).toBe('player');

    // Resizing the window keeps the same world view (centre and area).
    await player.setViewportSize({ width: 700, height: 900 });
    await player.waitForTimeout(200);
    expect(await settled()).toBe(viewBefore);

    // Repeated zoom / pan stays usable and bounded; Fit restores the (new) fitted view.
    for (let i = 0; i < 12; i++) await player.mouse.wheel(0, i % 3 === 2 ? 600 : -600);
    for (let i = 0; i < 4; i++) {
      await player.mouse.move(centre.x, centre.y - 200);
      await player.mouse.down();
      await player.mouse.move(centre.x + (i % 2 ? 2000 : -2000), centre.y - 200 + (i % 2 ? 900 : -900), { steps: 4 });
      await player.mouse.up();
    }
    const wild = await nums();
    expect(wild.every(Number.isFinite)).toBe(true);
    expect(wild[2]).toBeGreaterThanOrEqual(fit[2] / 8 - 0.01); // at most 8x
    await expect(player.locator('.ls-token')).toHaveCount(2);
    await player.getByTestId('map-fit').click();
    await expect.poll(() => viewMode(player)).toBe('fit');
    const newFit = (await settled()).split(' ').map(Number);
    expect(newFit[2]).toBeGreaterThan(fit[2]); // it now includes the far token

    // Touch: one-finger pan and a two-finger pinch (pointer events, as a touch screen sends them).
    const touch = (steps) =>
      player.evaluate((steps) => {
        const svg = document.querySelector('[data-testid="player-map"]');
        const r = svg.getBoundingClientRect();
        for (const [type, id, fx, fy] of steps) {
          svg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, bubbles: true, cancelable: true, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy }));
        }
      }, steps);
    await touch([['pointerdown', 1, 0.5, 0.5], ['pointermove', 1, 0.4, 0.5], ['pointermove', 1, 0.3, 0.5], ['pointerup', 1, 0.3, 0.5]]);
    await expect.poll(() => viewMode(player)).toBe('player');
    const afterTouchPan = await nums();
    expect(afterTouchPan[0]).toBeGreaterThan(newFit[0]);
    expect(afterTouchPan[2]).toBeCloseTo(newFit[2], 1);
    await touch([
      ['pointerdown', 1, 0.45, 0.5], ['pointerdown', 2, 0.55, 0.5],
      ['pointermove', 1, 0.4, 0.5], ['pointermove', 2, 0.6, 0.5],
      ['pointermove', 1, 0.35, 0.5], ['pointermove', 2, 0.65, 0.5],
      ['pointerup', 1, 0.35, 0.5], ['pointerup', 2, 0.65, 0.5],
    ]);
    const pinched = await nums();
    expect(newFit[2] / pinched[2]).toBeGreaterThan(2.5); // fingers 3x further apart
    // The page around the map still scrolls: only the map takes touch gestures for itself.
    expect(await player.locator(MAP).evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
    expect(await player.evaluate(() => getComputedStyle(document.body).touchAction)).toBe('auto');

    // A different map (another image size) starts fitted again.
    await importMap(host, await makeMap(host, { width: 1200, height: 500 }), { tokens: [{ id: 't_bard', name: 'Bard', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    await expect.poll(() => viewMode(player), { timeout: 15000 }).toBe('fit');

    // Everything the player ever sent was an asset request: no view state in any form.
    const sent = await player.evaluate(() => window.__playerSent);
    expect(sent.length).toBeGreaterThan(0);
    for (const m of sent) expect(JSON.parse(m).type).toBe('asset-request');
    expect(sent.join('')).not.toMatch(/view|zoom|viewBox|tap|pan/i);
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });
});
