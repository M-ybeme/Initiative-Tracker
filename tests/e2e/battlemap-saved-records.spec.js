// 2.3.27: what Live Share players get always comes from the Battle Map's last explicit Save, however
// the map reaches the page: through Export / Import, a reload while images are still decoding, a
// reload with an autosaved draft, or a saved record whose map image can't be read. The DM's working
// draft is stored separately and restored, but never published until it is saved.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import {
  watchErrors,
  recordPlayerTraffic,
  hostSnapshot,
  sentText,
  sentMetas,
  makeMap,
  makeTokenPng,
  save,
  importMap,
  openHost,
  openPanel,
  tokenMenu,
  addPresetToken,
  SECRET,
} from '../helpers/battlemap-live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const HEX = /^[0-9a-f]{64}$/;
const DRAFT_KEY = 'dmtoolbox.battlemap.mvp.v3.draft';
const ids = async (page) => (await hostSnapshot(page)).tokens.map((t) => t.id);
const tokenPills = (page) => page.evaluate(() => document.querySelectorAll('#tokenList .pill').length);
const sentSnapshots = async (page) => (await sentText(page)).map((t) => JSON.parse(t)).filter((m) => m.type === 'battlemap-snapshot');

async function startRoom(host) {
  await host.getByTestId('start-room').click();
  await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players');
  return host.getByTestId('join-link').textContent();
}

async function joinPlayer(browser, joinUrl) {
  const context = await browser.newContext();
  await context.addInitScript(recordPlayerTraffic);
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  const tokenIds = () => player.evaluate(() => [...document.querySelectorAll('[data-testid="player-map"] .ls-token')].map((g) => g.getAttribute('data-token-id')));
  return { context, player, errors, tokenIds };
}

const purpleArt = (page) =>
  page.evaluate(() => {
    const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
    const g = c.getContext('2d');
    g.fillStyle = '#7a00ff';
    g.fillRect(0, 0, 64, 64);
    return c.toDataURL('image/png');
  });

// The host's published background, decoded: the [r, g, b, a] at a map-image point.
function publishedBackgroundPixel(page, x, y) {
  return page.evaluate(
    async ({ x, y }) => {
      const snap = window.BattleMapLiveShare.getPlayerSafeState();
      const a = window.BattleMapLiveShare.getAsset(snap.background.assetId);
      const bmp = await createImageBitmap(new Blob([a.bytes], { type: a.mime }));
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      c.getContext('2d').drawImage(bmp, 0, 0);
      return Array.from(c.getContext('2d').getImageData(Math.round((x * bmp.width) / 800), Math.round((y * bmp.height) / 600), 1, 1).data);
    },
    { x, y }
  );
}

// While sessionStorage 'hold' is set, stored images (data: URLs) decode only when the test releases
// them: release('map') lets the map image through, release('all') everything; holdAgain() holds
// images set from then on; holdOnly(src) holds just that image.
function holdStoredImages(mapSrc) {
  if (!sessionStorage.getItem('hold')) return;
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  const held = [];
  const free = new Set();
  let only = null; // holdOnly(src): hold just this image
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() {
      return desc.get.call(this);
    },
    set(v) {
      const kind = v === mapSrc ? 'map' : 'other';
      const hold = typeof v === 'string' && v.startsWith('data:image/') && (only !== null ? v === only : !free.has(kind) && !free.has('all'));
      if (hold) held.push([this, v, kind]);
      else desc.set.call(this, v);
    },
  });
  window.__holdAgain = () => free.clear();
  window.__holdOnly = (src) => {
    only = src;
    for (const entry of held.splice(0)) {
      if (entry[1] === src) held.push(entry);
      else desc.set.call(entry[0], entry[1]);
    }
  };
  window.__release = (what) => {
    if (what === 'all') only = null;
    free.add(what);
    for (const entry of held.splice(0)) {
      if (what === 'all' || entry[2] === what) desc.set.call(entry[0], entry[1]);
      else held.push(entry);
    }
  };
}

test.describe('Battle Map saved record vs draft (2.3.27)', () => {
  test('Visible to Players survives Export / Import: a hidden token and its art stay hidden, a visible one stays visible', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const heroArt = `data:image/png;base64,${(await makeTokenPng(host)).toString('base64')}`;
    const spyArt = await purpleArt(host);

    // 1: both visible; the spy's custom art is prepared (so its asset id is known).
    await importMap(host, await makeMap(host), {
      tokens: [
        { id: 't_hero', name: 'Hero', imgSrc: heroArt, x: 100, y: 100, w: 50, h: 50, rot: 0, showLabel: true },
        { id: 't_spy', name: 'SecretSpy', imgSrc: spyArt, x: 300, y: 100, w: 50, h: 50, rot: 0, showLabel: true },
      ],
    });
    await expect.poll(async () => (await hostSnapshot(host)).tokens.find((t) => t.id === 't_spy')?.assetId, { timeout: 10000 }).toMatch(HEX);
    const spyAsset = (await hostSnapshot(host)).tokens.find((t) => t.id === 't_spy').assetId;

    // 2-3: hide it and save.
    expect(await tokenMenu(host, { x: 325, y: 125 }, 'toggleVisible')).toContain('☑ Visible to Players');
    await save(host);
    await expect.poll(() => ids(host)).toEqual(['t_hero']);

    // 4-5: Export JSON writes the setting explicitly, for both tokens.
    await openPanel(host, 'accSession');
    const [download] = await Promise.all([host.waitForEvent('download'), host.locator('#exportJson').click()]);
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    expect(exported.tokens.map((t) => [t.id, t.visibleToPlayers])).toEqual([
      ['t_hero', true],
      ['t_spy', false],
    ]);
    await hostContext.close();

    // 6-7: import that file on a fresh Battle Map (nothing stored: the file is the only source), save.
    const second = await openHost(browser);
    await openPanel(second.host, 'accSession');
    await second.host.locator('#importJsonFile').setInputFiles({ name: 'export.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
    await expect(second.host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty', { timeout: 15000 });
    await save(second.host);
    await expect.poll(async () => (await hostSnapshot(second.host))?.tokens.map((t) => t.id)).toEqual(['t_hero']);
    await expect.poll(async () => (await hostSnapshot(second.host)).tokens[0].assetId, { timeout: 10000 }).toMatch(HEX);
    const heroAsset = (await hostSnapshot(second.host)).tokens[0].assetId;

    // 8-9: a player joins; nothing of the spy is sent, its art included, while the hero's is.
    const p = await joinPlayer(browser, await startRoom(second.host));
    await expect.poll(p.tokenIds, { timeout: 15000 }).toEqual(['t_hero']);
    await expect(p.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    const snapshots = await sentSnapshots(second.host);
    expect(snapshots.length).toBeGreaterThan(0);
    expect(JSON.stringify(snapshots)).not.toMatch(/t_spy|SecretSpy/);
    const metas = (await sentMetas(second.host)).map((m) => m.asset.assetId);
    expect(metas).toContain(heroAsset);
    expect(metas).not.toContain(spyAsset);
    expect(await p.player.evaluate((id) => window.__lsLog.some((e) => e.assetId === id), spyAsset)).toBe(false);
    expect(await second.host.evaluate((id) => window.BattleMapLiveShare.getAsset(id), spyAsset)).toBeNull();
    // The flag survives the fresh page's own save too.
    expect(await second.host.evaluate(() => JSON.parse(localStorage.getItem('dmtoolbox.battlemap.mvp.v3')).tokens.map((t) => [t.id, t.visibleToPlayers]))).toEqual([
      ['t_hero', true],
      ['t_spy', false],
    ]);

    expect(hostErrors).toEqual([]);
    expect(second.hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await second.hostContext.close();
    await p.context.close();
  });

  test('edits made while the saved map is still decoding after a reload are not published as saved', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const map = await makeMap(host);
    await importMap(host, map, { tokens: [{ id: 't_bard', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    const A = await hostSnapshot(host);
    expect(A.tokens.map((t) => t.id)).toEqual(['t_bard']);

    // After the reload the saved map image decodes only when the test says so.
    await hostContext.addInitScript((mapSrc) => {
      const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      const held = [];
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        get() {
          return desc.get.call(this);
        },
        set(v) {
          if (v === mapSrc && !window.__released) held.push(this);
          else desc.set.call(this, v);
        },
      });
      window.__releaseMap = () => {
        window.__released = true;
        held.splice(0).forEach((img) => desc.set.call(img, mapSrc));
      };
    }, map);
    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare && window.__releaseMap);

    // The DM edits before the map has decoded.
    await addPresetToken(host, 'Fighter');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await expect.poll(() => tokenPills(host)).toBe(2);
    await host.waitForTimeout(500);
    expect(await hostSnapshot(host)).toBeNull(); // nothing published while the saved map loads
    await host.getByTestId('start-room').click();
    await expect(host.getByTestId('host-status')).toHaveText('The saved map is still loading. Try again in a moment.');

    // Decoding completes: players get exactly the saved state; the edit stays a private draft.
    await host.evaluate(() => window.__releaseMap());
    await expect.poll(() => hostSnapshot(host), { timeout: 15000 }).not.toBeNull();
    const published = await hostSnapshot(host);
    expect(published.tokens.map((t) => [t.id, t.x, t.y])).toEqual(A.tokens.map((t) => [t.id, t.x, t.y]));
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    const p = await joinPlayer(browser, await startRoom(host));
    await expect.poll(p.tokenIds, { timeout: 15000 }).toEqual(['t_bard']);

    // Saving publishes the edit.
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).tokens.length).toBe(2);
    await expect.poll(async () => (await p.tokenIds()).length, { timeout: 15000 }).toBe(2);
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('Save A, then a draft B: after a reload the DM gets B back unsaved, players get A; saving promotes B', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_bard', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    const A = await hostSnapshot(host);
    expect(await host.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull();

    // Draft B: placing a token stores a draft, in its own record.
    await addPresetToken(host, 'Fighter');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await expect.poll(() => host.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).not.toBeNull();
    const saved = await host.evaluate(() => JSON.parse(localStorage.getItem('dmtoolbox.battlemap.mvp.v3')));
    expect(saved.tokens.map((t) => t.id)).toEqual(['t_bard']); // the saved record is untouched
    expect(saved.unsavedDraft).toBeUndefined();

    // Reload: the working map is B, still unsaved; what is published is A.
    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await expect(host.locator('#unsavedIndicator')).not.toHaveCSS('display', 'none');
    await expect.poll(() => tokenPills(host)).toBe(2);
    const { revision: _r, ...contentA } = A;
    const { revision: _r2, ...contentAfter } = await hostSnapshot(host);
    expect(contentAfter).toEqual(contentA);

    // Starting Live Share publishes A to a player.
    const p = await joinPlayer(browser, await startRoom(host));
    await expect.poll(p.tokenIds, { timeout: 15000 }).toEqual(['t_bard']);

    // Save promotes B: published, stored as the saved record, and the draft is gone.
    await save(host);
    await expect.poll(async () => (await p.tokenIds()).length, { timeout: 15000 }).toBe(2);
    const B = await hostSnapshot(host);
    expect(B.tokens.length).toBe(2);
    await expect.poll(() => host.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull();

    // The next reload treats B as the saved version.
    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'clean');
    await expect(host.locator('#unsavedIndicator')).toHaveCSS('display', 'none');
    expect((await hostSnapshot(host)).tokens.map((t) => t.id)).toEqual(B.tokens.map((t) => t.id));
    expect(await tokenPills(host)).toBe(2);
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('a saved map whose image cannot be loaded publishes nothing, not even the draft, and Live Share says why', async ({ browser }) => {
    test.setTimeout(60000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const goodMap = await makeMap(host);
    // Stored by hand: a saved record with an unreadable map image, and a draft (with a readable
    // map) that continues it and has a token the save does not.
    await host.evaluate(async (goodMap) => {
      const base = { mapTransform: { scale: 1, x: 0, y: 0 }, grid: { size: 50 }, view: { x: 0, y: 0, scale: 0.6 }, fogState: { enabled: false }, fogShapes: [] };
      const token = (id) => ({ id, name: id, imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, visibleToPlayers: true });
      await IndexedDBStorage.saveBattleMap({ ...base, saveId: 's_broken', map: { imgSrc: 'data:image/png;base64,bm90IGFuIGltYWdl', w: 800, h: 600 }, tokens: [token('t_saved')] }, 'current-session');
      await IndexedDBStorage.saveBattleMap({ ...base, unsavedDraft: true, baseSaveId: 's_broken', map: { imgSrc: goodMap, w: 800, h: 600 }, tokens: [token('t_saved'), token('t_draftonly')] }, 'current-draft');
    }, goodMap);
    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.savedMapProblem() === 'unreadable', null, { timeout: 15000 });

    // The DM is told, the draft is the working map (unsaved), and nothing is published.
    await expect(host.getByText(/could not be loaded from storage/)).toBeVisible();
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await expect.poll(() => tokenPills(host)).toBe(2);
    expect(await hostSnapshot(host)).toBeNull();
    expect(await host.evaluate(() => window.BattleMapLiveShare.hasPublishedState())).toBe(false);

    // Live Share fails closed, with the reason.
    await host.getByTestId('start-room').click();
    await expect(host.getByTestId('host-status')).toHaveText(/could not be loaded \(its image is unreadable\)/);
    await expect(host.getByTestId('join-link')).toBeHidden();
    expect(await sentText(host)).toEqual([]);
    expect(hostErrors.filter((e) => !/could not be loaded from storage|Failed to load resource/.test(e))).toEqual([]);
    await hostContext.close();
  });

  test('saving or storing a draft while the stored map and fog are still decoding keeps both: the hidden area stays covered for players', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const map = await makeMap(host);
    const fullFog = await host.evaluate(() => {
      const c = Object.assign(document.createElement('canvas'), { width: 800, height: 600 });
      c.getContext('2d').fillRect(0, 0, 800, 600); // the whole map under fog (painted, no shapes)
      return c.toDataURL('image/png');
    });
    await importMap(host, map, { tokens: [{ id: 't_bard', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0 }], fogShapes: [], fog: fullFog });
    await expect.poll(async () => (await hostSnapshot(host)).background?.assetId, { timeout: 15000 }).toMatch(HEX);
    const covered = (px) => px[0] < 20 && px[1] < 20 && px[2] < 20 && px[3] === 255;
    expect(covered(await publishedBackgroundPixel(host, SECRET.x + 50, SECRET.y + 50))).toBe(true);
    await hostContext.addInitScript(holdStoredImages, map);

    const reload = async (hold) => {
      await host.evaluate((h) => (h ? sessionStorage.setItem('hold', '1') : sessionStorage.removeItem('hold')), hold);
      await host.reload();
      await host.waitForFunction(() => window.BattleMapLiveShare);
    };
    // A normal reload: the stored map is intact and players get it covered.
    const expectStoredIntact = async () => {
      await reload(false);
      await expect.poll(async () => (await hostSnapshot(host))?.background?.assetId, { timeout: 15000 }).toMatch(HEX);
      const stored = await host.evaluate(() => JSON.parse(localStorage.getItem('dmtoolbox.battlemap.mvp.v3')));
      expect(stored.map.imgSrc).toBe(map);
      expect(covered(await publishedBackgroundPixel(host, SECRET.x + 50, SECRET.y + 50))).toBe(true);
    };

    // 1: Save while neither the map image nor the fog has decoded: the save waits for them.
    await reload(true);
    await host.keyboard.press('Control+s');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'saving');
    await host.waitForTimeout(500);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'saving');
    await host.evaluate(() => window.__release('all'));
    await expect(host.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/, { timeout: 15000 });
    await expectStoredIntact();

    // 2: Save once the map image has decoded but the fog bitmap has not.
    await reload(true);
    await host.evaluate(() => window.__release('map'));
    await host.waitForTimeout(300);
    await host.getByTestId('save-map').click();
    await host.waitForTimeout(300);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'saving');
    await host.evaluate(() => window.__release('all'));
    await expect(host.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/, { timeout: 15000 });
    await expectStoredIntact();

    // 3: A draft stored while decoding (placing a token) keeps the map image and fog.
    await reload(true);
    await addPresetToken(host, 'Fighter');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await host.waitForTimeout(300);
    expect(await host.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull(); // not written yet
    await host.evaluate(() => window.__release('all'));
    await expect.poll(() => host.evaluate((k) => localStorage.getItem(k), DRAFT_KEY), { timeout: 15000 }).not.toBeNull();
    const draft = await host.evaluate((k) => JSON.parse(localStorage.getItem(k)), DRAFT_KEY);
    expect(draft.map.imgSrc).toBe(map);
    expect(draft.tokens.length).toBe(2);
    await reload(false);
    await expect.poll(async () => (await hostSnapshot(host))?.background?.assetId, { timeout: 15000 }).toMatch(HEX);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await save(host); // the draft becomes the saved map: still covered
    await expect.poll(async () => (await hostSnapshot(host)).tokens.length).toBe(2);
    expect(covered(await publishedBackgroundPixel(host, SECRET.x + 50, SECRET.y + 50))).toBe(true);

    // 4: Save right after an Import, while the imported map and fog are still decoding.
    await reload(true);
    await host.evaluate(() => window.__release('all'));
    await expect.poll(async () => (await hostSnapshot(host))?.background?.assetId, { timeout: 15000 }).toMatch(HEX);
    await host.evaluate(() => window.__holdAgain());
    const imported = { map: { imgSrc: map }, fog: fullFog, fogState: { enabled: true, mode: 'cover', brush: 80 }, fogShapes: [], mapTransform: { scale: 1, x: 0, y: 0 }, grid: { size: 50 }, view: { x: 0, y: 0, scale: 0.6 }, tokens: [{ id: 't_imported', name: 'Imported', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0 }] };
    await openPanel(host, 'accSession');
    await host.locator('#importJsonFile').setInputFiles({ name: 'map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
    await host.keyboard.press('Control+s');
    await host.waitForTimeout(500);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'saving');
    await host.evaluate(() => window.__release('all'));
    await expect(host.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/, { timeout: 15000 });
    await expectStoredIntact();
    expect((await hostSnapshot(host)).tokens.map((t) => t.id)).toEqual(['t_imported']);

    // 5: Two imports in quick succession, the first one's fog slow to decode: the second (with its
    // own fog, covering everything) is what ends up on screen and stored, never the first one's
    // (empty) fog on the second one's map.
    const otherMap = await makeMap(host, { width: 640, height: 480 });
    const emptyFog = await host.evaluate(() => Object.assign(document.createElement('canvas'), { width: 640, height: 480 }).toDataURL('image/png'));
    await reload(true);
    await host.evaluate(() => window.__release('all'));
    await expect.poll(async () => (await hostSnapshot(host))?.background?.assetId, { timeout: 15000 }).toMatch(HEX);
    await host.evaluate((src) => window.__holdOnly(src), emptyFog);
    const first = { ...imported, map: { imgSrc: otherMap }, fog: emptyFog, tokens: [{ ...imported.tokens[0], id: 't_first' }] };
    await host.locator('#importJsonFile').setInputFiles({ name: 'first.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(first)) });
    await host.waitForTimeout(300);
    await host.locator('#importJsonFile').setInputFiles({ name: 'second.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
    await host.waitForTimeout(500);
    await host.evaluate(() => window.__release('all')); // the first import's fog decodes last
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty', { timeout: 15000 });
    await host.waitForTimeout(500);
    await save(host);
    await expectStoredIntact();
    expect((await hostSnapshot(host)).tokens.map((t) => t.id)).toEqual(['t_imported']);

    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });

  test('which stored draft is restored: a stale one is ignored, one continuing a pre-2.3.27 save is restored, a pre-release draft is never published', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const map = await makeMap(host);
    const seed = (saved, draft) =>
      host.evaluate(
        async ({ saved, draft, map }) => {
          const base = { map: { imgSrc: map, w: 800, h: 600 }, mapTransform: { scale: 1, x: 0, y: 0 }, grid: { size: 50 }, view: { x: 0, y: 0, scale: 0.6 }, fogState: { enabled: false }, fogShapes: [] };
          const token = (id) => ({ id, name: id, imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0 });
          localStorage.clear();
          await IndexedDBStorage.deleteBattleMap('current-session');
          await IndexedDBStorage.deleteBattleMap('current-draft');
          if (saved) await IndexedDBStorage.saveBattleMap({ ...base, ...saved, tokens: saved.tokens.map(token) }, 'current-session');
          if (draft) await IndexedDBStorage.saveBattleMap({ ...base, unsavedDraft: true, ...draft, tokens: draft.tokens.map(token) }, 'current-draft');
        },
        { saved, draft, map }
      );
    const reloaded = async () => {
      await host.reload();
      await host.waitForFunction(() => window.BattleMapLiveShare);
      await expect.poll(() => tokenPills(host)).toBeGreaterThan(0);
    };

    // A draft left from before a later save (its save id is not the saved record's): ignored.
    await seed({ saveId: 's_new', tokens: ['t_saved'] }, { baseSaveId: 's_old', tokens: ['t_saved', 't_stale'] });
    await reloaded();
    await expect.poll(async () => (await hostSnapshot(host))?.tokens.map((t) => t.id)).toEqual(['t_saved']);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'clean');
    expect(await tokenPills(host)).toBe(1);

    // A map saved by 2.3.26 (no save id) and a draft continuing it: the draft is restored, unsaved.
    await seed({ tokens: ['t_saved'] }, { baseSaveId: 'legacy', tokens: ['t_saved', 't_draft'] });
    await reloaded();
    await expect.poll(async () => (await hostSnapshot(host))?.tokens.map((t) => t.id)).toEqual(['t_saved']);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    expect(await tokenPills(host)).toBe(2);

    // A draft in the saved record (2.3.27 pre-release): restored for the DM, never published.
    await seed({ unsavedDraft: true, tokens: ['t_pre'] }, null);
    await reloaded();
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    expect(await tokenPills(host)).toBe(1);
    await host.waitForTimeout(500);
    expect(await hostSnapshot(host)).toBeNull();
    expect(await host.evaluate(() => window.BattleMapLiveShare.hasPublishedState())).toBe(false);

    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });
});
