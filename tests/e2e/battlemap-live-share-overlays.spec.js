// 2.3.29 (Live Share Milestone 4, presentation completeness): a token's aura and vision cone reach
// players as structured overlays. The DM edits them through the real Battle Map dialogs
// (publishing to the Live Share session page); players (liveshare-dev.html, separate contexts, local relay) see
// them only once saved, drawn with the DM map's geometry. Overlay, rotation and grid edits never
// recompose or resend the background. A token hidden from players sends no overlay information.
import { test, expect } from '@playwright/test';
import { watchErrors, recordPlayerTraffic, hostSnapshot, sentText, sentMetas, makeMap, makeTokenPng, save, importMap, screenOf, openHost, openPanel, tokenMenu, addPresetToken, startRoom as startRoomOn, sessionOf } from '../helpers/battlemap-live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const DRAFT_KEY = 'dmtoolbox.battlemap.mvp.v3.draft';
const PRESET = '/images/playerTokens/PlayerBardToken.png';
const sentSnapshots = async (page) => (await sentText(page)).map((t) => JSON.parse(t)).filter((m) => m.type === 'battlemap-snapshot');
const backgroundMetas = async (page) => (await sentMetas(page)).filter((m) => m.asset.kind === 'background').length;
const rebuilds = (page) => page.evaluate(() => window.BattleMapLiveShare.getAssetDiagnostics().background.rebuilds);

// The room on the Battle Map's session page (already started by openHost); its join link.
const startRoom = (host) => startRoomOn(sessionOf(host));

async function joinPlayer(browser, joinUrl, viewport) {
  const context = await browser.newContext(viewport ? { viewport } : {});
  await context.addInitScript(recordPlayerTraffic);
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  return { context, player, errors };
}

// What the player draws for one token's overlays (world units, as in the SVG), or null.
function playerOverlays(player, id) {
  return player.evaluate((id) => {
    const nums = (s) => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    const svg = document.querySelector('[data-testid="player-map"]');
    const token = [...svg.querySelectorAll('.ls-token')].find((g) => g.getAttribute('data-token-id') === id);
    const g = [...svg.querySelectorAll('.ls-token-overlays')].find((o) => o.getAttribute('data-token-id') === id);
    const aura = g && g.querySelector('.ls-aura');
    const cone = g && g.querySelector('.ls-vision-cone');
    const c = cone ? nums(cone.getAttribute('d')) : null;
    return {
      revision: Number(svg.getAttribute('data-revision')),
      token: token ? { rot: nums(token.querySelector('.ls-token-body').getAttribute('transform'))[2] } : null,
      aura: aura ? { cx: +aura.getAttribute('cx'), cy: +aura.getAttribute('cy'), r: +aura.getAttribute('r'), color: aura.getAttribute('fill') } : null,
      cone: cone ? { apex: c.slice(0, 2), start: c.slice(2, 4), r: c[4], mid: c.slice(9, 11), end: c.slice(16, 18), color: cone.getAttribute('fill') } : null,
      background: svg.querySelector('.ls-background-image')?.getAttribute('data-asset-id') ?? null,
    };
  }, id);
}

async function waitForRevision(player, revision) {
  await expect.poll(async () => (await playerOverlays(player, '')).revision, { timeout: 15000 }).toBe(revision);
}

const close = (a, b, tol = 0.6) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

async function setAura(host, at, radius, color) {
  await tokenMenu(host, at, 'setAura');
  await expect(host.locator('#auraModal')).toBeVisible();
  await host.locator('#auraRadius').fill(String(radius));
  await host.locator('#auraColor').fill(color);
  await host.locator('#auraSaveBtn').click();
  await expect(host.locator('#auraModal')).toBeHidden();
}

async function setVision(host, at, range, angle, color) {
  await tokenMenu(host, at, 'setVision');
  await expect(host.locator('#visionModal')).toBeVisible();
  await host.locator('#visionRange').fill(String(range));
  // A value the number input can't be typed with (e.g. 'abc') is set by script, as a paste would.
  if (/^[-+.\de]*$/i.test(String(angle))) await host.locator('#visionAngle').fill(String(angle));
  else await host.locator('#visionAngle').evaluate((el, v) => (el.value = v), String(angle));
  await host.locator('#visionColor').fill(color);
  await host.locator('#visionSaveBtn').click();
  await expect(host.locator('#visionModal')).toBeHidden();
}

// An unsaved edit: the map is dirty, nothing is published or sent, and the player is unchanged.
async function expectUnpublished(host, player, id, { published, before, snapshotsBefore }) {
  await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
  await host.waitForTimeout(1200); // past any throttle window
  expect(await hostSnapshot(host)).toEqual(published);
  expect((await sentSnapshots(host)).length).toBe(snapshotsBefore);
  expect(await playerOverlays(player, id)).toEqual(before);
}

test.describe('Live Share aura and vision cone presentation (2.3.29)', () => {
  test('auras, vision cones, rotation and grid reach players only when saved, with the DM geometry and no background work', async ({ browser }) => {
    test.setTimeout(180000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    // A grid of 50; the seer's centre is (125, 125).
    const SEER = { id: 't_seer', x: 100, y: 100, w: 50, h: 50 };
    const center = { x: 125, y: 125 };
    await importMap(host, await makeMap(host), {
      tokens: [
        { ...SEER, name: 'Seer', imgSrc: PRESET, rot: 0, showLabel: true, aura: { radius: 2, color: '#ff0000' }, visionCone: { range: 6, angle: 90, color: '#ffff88' } },
        { id: 't_plain', name: 'Plain', imgSrc: PRESET, x: 300, y: 300, w: 50, h: 50, rot: 0 }, // a legacy token: no overlays
      ],
    });
    const A = await hostSnapshot(host);
    expect(A.version).toBe(4);
    expect(A.tokens[0]).toMatchObject({ aura: { radius: 2, color: '#ff0000' }, visionCone: { range: 6, angle: 90, color: '#ffff88' } });
    expect(A.tokens[1]).toMatchObject({ aura: null, visionCone: null });
    expect(A.background.assetId).toMatch(/^[0-9a-f]{64}$/);

    const p = await joinPlayer(browser, await startRoom(host));
    await waitForRevision(p.player, A.revision);
    await expect.poll(async () => (await playerOverlays(p.player, 't_seer')).background, { timeout: 15000 }).toBe(A.background.assetId);
    let view = await playerOverlays(p.player, 't_seer');
    expect(view.aura).toEqual({ cx: 125, cy: 125, r: 125, color: '#ff0000' }); // (2 + 0.5) cells
    expect(view.cone.color).toBe('#ffff88');
    expect(view.cone.r).toBe(300); // 6 cells
    expect(close(view.cone.apex, [125, 125])).toBe(true);
    expect(close(view.cone.mid, [425, 125])).toBe(true); // rotation 0 points along +x
    expect(close(view.cone.start, [125 + 300 * Math.SQRT1_2, 125 - 300 * Math.SQRT1_2])).toBe(true);
    expect(await playerOverlays(p.player, 't_plain')).toMatchObject({ aura: null, cone: null });
    await expect(p.player.locator('[data-testid="player-map"] .ls-token-overlays')).toHaveCount(1);

    // From here on, nothing may recompose or resend the background.
    const background = A.background;
    const rebuilds0 = await rebuilds(host);
    const bgMetas0 = await backgroundMetas(host);
    const expectSameBackground = async (label) => {
      expect((await hostSnapshot(host)).background, label).toEqual(background);
      expect(await rebuilds(host), label).toBe(rebuilds0);
      expect(await backgroundMetas(host), label).toBe(bgMetas0);
      expect((await playerOverlays(p.player, 't_seer')).background, label).toBe(background.assetId);
    };
    const saveAndWait = async () => {
      const before = (await hostSnapshot(host)).revision;
      await save(host);
      await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 15000 }).toBe(before + 1);
      const snap = await hostSnapshot(host);
      await waitForRevision(p.player, snap.revision);
      return snap;
    };

    // A. Aura: edit radius and color; unsaved -> unchanged; saved -> updated.
    let published = await hostSnapshot(host);
    let snapshotsBefore = (await sentSnapshots(host)).length;
    await setAura(host, center, 4, '#00ff00');
    await expectUnpublished(host, p.player, 't_seer', { published, before: view, snapshotsBefore });
    const B = await saveAndWait();
    expect(B.tokens[0].aura).toEqual({ radius: 4, color: '#00ff00' });
    view = await playerOverlays(p.player, 't_seer');
    expect(view.aura).toEqual({ cx: 125, cy: 125, r: 225, color: '#00ff00' });
    expect((await sentSnapshots(host)).slice(snapshotsBefore).map((m) => m.payload.revision)).toEqual([B.revision]);
    await expectSameBackground('aura save');

    // B. Vision cone: range, angle and color.
    published = B;
    snapshotsBefore = (await sentSnapshots(host)).length;
    await setVision(host, center, 3, 60, '#ff00ff');
    await expectUnpublished(host, p.player, 't_seer', { published, before: view, snapshotsBefore });
    const C = await saveAndWait();
    expect(C.tokens[0].visionCone).toEqual({ range: 3, angle: 60, color: '#ff00ff' });
    view = await playerOverlays(p.player, 't_seer');
    expect(view.cone.r).toBe(150);
    expect(view.cone.color).toBe('#ff00ff');
    expect(close(view.cone.mid, [275, 125])).toBe(true);
    expect(close(view.cone.start, [125 + 150 * Math.cos(-Math.PI / 6), 125 + 150 * Math.sin(-Math.PI / 6)])).toBe(true); // 60° wide
    expect(close(view.cone.end, [125 + 150 * Math.cos(Math.PI / 6), 125 + 150 * Math.sin(Math.PI / 6)])).toBe(true);
    await expectSameBackground('vision save');

    // Rotation: 6 × 15° = 90°. Unsaved the cone stays at 0; saved, token and cone turn together.
    published = C;
    snapshotsBefore = (await sentSnapshots(host)).length;
    const at = await screenOf(host, center.x, center.y);
    await host.mouse.click(at.x, at.y); // select the seer (on the grid: no snap)
    for (let i = 0; i < 6; i++) await host.keyboard.press('r');
    await expectUnpublished(host, p.player, 't_seer', { published, before: view, snapshotsBefore });
    const D = await saveAndWait();
    expect(D.tokens[0].rot).toBeCloseTo(Math.PI / 2, 9);
    expect(D.tokens[0]).toMatchObject({ x: SEER.x, y: SEER.y });
    view = await playerOverlays(p.player, 't_seer');
    expect(view.token.rot).toBeCloseTo(90, 1);
    expect(close(view.cone.mid, [125, 275])).toBe(true); // now along +y
    expect(view.aura).toEqual({ cx: 125, cy: 125, r: 225, color: '#00ff00' }); // unaffected
    await expectSameBackground('rotation save');

    // Grid size: overlays are in cells, so the same overlays cover a different world area.
    published = D;
    snapshotsBefore = (await sentSnapshots(host)).length;
    await openPanel(host, 'accMap');
    await host.locator('#gridSize').fill('25');
    await host.evaluate(() => document.activeElement.blur());
    await expectUnpublished(host, p.player, 't_seer', { published, before: view, snapshotsBefore });
    const E = await saveAndWait();
    expect(E.grid.size).toBe(25);
    view = await playerOverlays(p.player, 't_seer');
    expect(view.aura.r).toBe(112.5); // (4 + 0.5) × 25
    expect(view.cone.r).toBe(75); // 3 × 25
    expect(close(view.cone.mid, [125, 200])).toBe(true);
    await expectSameBackground('grid save');

    // Responsive player: on other viewport shapes the drawing is the same world geometry, and on
    // screen the aura stays centred on the token at 2 × (4.5 cells) / 2 cells = 4.5 token widths.
    const world = await playerOverlays(p.player, 't_seer');
    for (const viewport of [{ width: 1280, height: 420 }, { width: 420, height: 900 }]) {
      await p.player.setViewportSize(viewport);
      expect(await playerOverlays(p.player, 't_seer')).toEqual(world);
      const screen = await p.player.evaluate(() => {
        const svg = document.querySelector('[data-testid="player-map"]');
        const a = svg.querySelector('.ls-aura').getBoundingClientRect();
        const t = svg.querySelector('[data-token-id="t_seer"] .ls-token-body').getBoundingClientRect();
        return { a: [a.x + a.width / 2, a.y + a.height / 2, a.width], t: [t.x + t.width / 2, t.y + t.height / 2, t.width] };
      });
      expect(close(screen.a.slice(0, 2), screen.t.slice(0, 2), 1)).toBe(true);
      expect(screen.a[2] / screen.t[2]).toBeCloseTo(225 / 50, 1);
    }

    // Removing both overlays (radius / range 0) and saving: they are gone for players.
    await setAura(host, center, 0, '#00ff00');
    await setVision(host, center, 0, 90, '#ffff88');
    const F = await saveAndWait();
    expect(F.tokens[0]).toMatchObject({ aura: null, visionCone: null });
    expect(await playerOverlays(p.player, 't_seer')).toMatchObject({ aura: null, cone: null });
    await expect(p.player.locator('[data-testid="player-map"] .ls-token-overlays')).toHaveCount(0);
    await expectSameBackground('overlay removal');

    // Every snapshot sent carried only the allowlisted overlay fields, as primitives.
    for (const m of await sentSnapshots(host)) {
      expect(m.payload.version).toBe(4);
      for (const t of m.payload.tokens) {
        if (t.aura) expect(Object.keys(t.aura).sort()).toEqual(['color', 'radius']);
        if (t.visionCone) expect(Object.keys(t.visionCone).sort()).toEqual(['angle', 'color', 'range']);
      }
    }
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('a hidden token, custom art included, sends no overlay information; hiding and showing follow Save', async ({ browser }) => {
    test.setTimeout(150000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const heroArt = `data:image/png;base64,${(await makeTokenPng(host)).toString('base64')}`;
    const spyArt = await host.evaluate(() => {
      const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
      const g = c.getContext('2d');
      g.fillStyle = '#7a00ff';
      g.fillRect(0, 0, 64, 64);
      return c.toDataURL('image/png');
    });
    const HERO = { id: 't_hero', x: 100, y: 100, w: 50, h: 50 };
    const heroCenter = { x: 125, y: 125 };
    await importMap(host, await makeMap(host), {
      tokens: [
        { ...HERO, name: 'Hero', imgSrc: heroArt, rot: 0, showLabel: true, aura: { radius: 1, color: '#11aa22' }, visionCone: { range: 4, angle: 120, color: '#2233cc' } },
        { id: 't_spy', name: 'SecretSpy', imgSrc: spyArt, x: 300, y: 100, w: 50, h: 50, rot: 0, showLabel: true, visibleToPlayers: false, aura: { radius: 3, color: '#abcdef' }, visionCone: { range: 7, angle: 33, color: '#fedcba' } },
      ],
    });
    await expect.poll(async () => (await hostSnapshot(host)).tokens[0].assetId, { timeout: 10000 }).toMatch(/^[0-9a-f]{64}$/);
    const A = await hostSnapshot(host);
    expect(A.tokens.map((t) => t.id)).toEqual(['t_hero']);
    const p = await joinPlayer(browser, await startRoom(host));
    await waitForRevision(p.player, A.revision);
    await expect(p.player.locator('[data-token-id="t_hero"].ls-token')).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    const visible = await playerOverlays(p.player, 't_hero');
    expect(visible.aura).toEqual({ cx: 125, cy: 125, r: 75, color: '#11aa22' });
    expect(visible.cone).toMatchObject({ r: 200, color: '#2233cc' });
    expect(await playerOverlays(p.player, 't_spy')).toMatchObject({ token: null, aura: null, cone: null });
    const background = A.background;

    // Hide the hero without saving: players keep it, overlays included.
    const snapshotsBefore = (await sentSnapshots(host)).length;
    await tokenMenu(host, heroCenter, 'toggleVisible');
    await expectUnpublished(host, p.player, 't_hero', { published: A, before: visible, snapshotsBefore });

    // Save: the token, its aura and its cone are gone, and the snapshot has nothing of them.
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 15000 }).toBe(A.revision + 1);
    const B = await hostSnapshot(host);
    await waitForRevision(p.player, B.revision);
    expect(B.tokens).toEqual([]);
    expect(await playerOverlays(p.player, 't_hero')).toMatchObject({ token: null, aura: null, cone: null });
    await expect(p.player.locator('[data-testid="player-map"] .ls-token-overlays, [data-testid="player-map"] .ls-aura, [data-testid="player-map"] .ls-vision-cone')).toHaveCount(0);
    const hiddenSnapshot = JSON.stringify((await sentSnapshots(host)).at(-1));
    expect(hiddenSnapshot).not.toMatch(/t_hero|Hero|11aa22|2233cc|"aura":\{|"visionCone":\{/);
    expect(B.background).toEqual(background);

    // Show it again without saving: still absent.
    await tokenMenu(host, heroCenter, 'toggleVisible');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await host.waitForTimeout(1200);
    expect(await hostSnapshot(host)).toEqual(B);
    expect(await playerOverlays(p.player, 't_hero')).toMatchObject({ token: null, aura: null, cone: null });

    // Save: token and overlays return.
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 15000 }).toBe(B.revision + 1);
    const C = await hostSnapshot(host);
    await waitForRevision(p.player, C.revision);
    expect(await playerOverlays(p.player, 't_hero')).toEqual({ ...visible, revision: C.revision });
    expect(C.background).toEqual(background);

    // The spy (hidden, custom art) never crossed in any form: no id, overlays, art or art request.
    for (const text of await sentText(host)) expect(text).not.toMatch(/t_spy|SecretSpy|abcdef|fedcba|"radius":3|"range":7|"angle":33/);
    const tokenMetas = (await sentMetas(host)).filter((m) => m.asset.kind === 'token').map((m) => m.asset.assetId);
    expect(new Set(tokenMetas)).toEqual(new Set([C.tokens[0].assetId]));
    const received = await p.player.evaluate(() => window.__lsLog.filter((m) => m.type === 'asset-meta' && m.kind === 'token').map((m) => m.assetId));
    expect(new Set(received)).toEqual(new Set([C.tokens[0].assetId]));
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('the vision modal stores only angles of 10–360°, so the DM map and players draw the same cone', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const center = { x: 125, y: 125 };
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_seer', name: 'Seer', imgSrc: PRESET, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    const p = await joinPlayer(browser, await startRoom(host));
    const storedAngle = () => host.evaluate(() => JSON.parse(localStorage.getItem('dmtoolbox.battlemap.mvp.v3')).tokens[0].visionCone.angle);
    // Alpha of the DM's token layer at a world point (the cone fill is translucent; empty is 0).
    const dmAlpha = (wx, wy) =>
      host.evaluate(({ wx, wy }) => {
        const c = document.getElementById('tokenLayer');
        return c.getContext('2d').getImageData(Math.round(wx * 0.6 * devicePixelRatio), Math.round(wy * 0.6 * devicePixelRatio), 1, 1).data[3];
      }, { wx, wy });

    // typed -> stored: below 10 (negative included) is raised to 10, above 360 lowered to 360;
    // empty, 0 or not a number is the dialog's 90° default (as before); valid angles are kept exactly.
    // '1e999' (Infinity) is out of the number input's range, so the browser reports it as empty.
    const cases = [
      ['-45', 10], ['-720', 10], ['5', 10], ['0', 90], ['', 90], ['abc', 90], ['1e999', 90], ['-1e999', 90],
      ['720', 360], ['361', 360], ['10', 10], ['45', 45], ['47.5', 47.5], ['90', 90], ['180', 180], ['360', 360],
    ];
    for (const [typed, stored] of cases) {
      const label = `typed ${JSON.stringify(typed)}`;
      const revision = (await hostSnapshot(host)).revision;
      await setVision(host, center, 3, typed, '#ff0000');
      await save(host);
      expect(await storedAngle(), label).toBe(stored);
      expect(Number.isFinite(await storedAngle()), label).toBe(true);
      // What the DM's map draws from and what players get agree.
      await expect.poll(async () => (await hostSnapshot(host)).tokens[0].visionCone, { message: label }).toEqual({ range: 3, angle: stored, color: '#ff0000' });
      const snap = await hostSnapshot(host);
      if (snap.revision > revision) await waitForRevision(p.player, snap.revision);
      const cone = (await playerOverlays(p.player, 't_seer')).cone;
      const half = (stored * Math.PI) / 360;
      expect(close(cone.start, [125 + 150 * Math.cos(-half), 125 + 150 * Math.sin(-half)]), label).toBe(true);
      // The DM's own cone: always in front (+x); behind the token (-x) only for a full circle.
      // A negative angle would have drawn a backward wedge there.
      await expect.poll(() => dmAlpha(225, 125), { message: label }).toBeGreaterThan(0);
      if (stored === 360) expect(await dmAlpha(25, 125), label).toBeGreaterThan(0);
      else expect(await dmAlpha(25, 125), label).toBe(0);
    }
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('Save A, draft B with new overlays, reload: the DM gets B back unsaved, players get A until Save', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const center = { x: 125, y: 125 };
    await importMap(host, await makeMap(host), {
      tokens: [{ id: 't_seer', name: 'Seer', imgSrc: PRESET, x: 100, y: 100, w: 50, h: 50, rot: 0, aura: { radius: 1, color: '#ff0000' }, visionCone: { range: 2, angle: 90, color: '#ffff88' } }],
    });
    const A = await hostSnapshot(host);

    // Draft B: a bigger aura in another color, a different cone. Like a token move, an overlay edit
    // only marks the map unsaved; the draft record is written by the next drafting action (here,
    // placing a token), and it holds the whole working map, overlays included.
    await setAura(host, center, 3, '#0000ff');
    await setVision(host, center, 5, 45, '#00ffff');
    expect(await host.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull();
    await addPresetToken(host, 'Fighter');
    await expect.poll(() => host.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).not.toBeNull();
    const draft = await host.evaluate((k) => JSON.parse(localStorage.getItem(k)).tokens[0], DRAFT_KEY);
    expect(draft).toMatchObject({ aura: { radius: 3, color: '#0000ff' }, visionCone: { range: 5, angle: 45, color: '#00ffff' } });
    const saved = await host.evaluate(() => JSON.parse(localStorage.getItem('dmtoolbox.battlemap.mvp.v3')).tokens[0]);
    expect(saved).toMatchObject({ aura: { radius: 1, color: '#ff0000' }, visionCone: { range: 2, angle: 90, color: '#ffff88' } });

    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    const { revision: _r1, ...contentA } = A;
    const { revision: _r2, ...contentAfter } = await hostSnapshot(host);
    expect(contentAfter).toEqual(contentA);
    // The DM's working token has B (read back through its dialogs).
    await tokenMenu(host, center, 'setAura');
    await expect(host.locator('#auraRadius')).toHaveValue('3');
    await expect(host.locator('#auraColor')).toHaveValue('#0000ff');
    await host.locator('#auraModal [data-bs-dismiss="modal"]').last().click();
    await expect(host.locator('#auraModal')).toBeHidden();

    const p = await joinPlayer(browser, await startRoom(host));
    await expect.poll(async () => (await playerOverlays(p.player, 't_seer')).aura, { timeout: 15000 }).toEqual({ cx: 125, cy: 125, r: 75, color: '#ff0000' });
    expect((await playerOverlays(p.player, 't_seer')).cone).toMatchObject({ r: 100, color: '#ffff88' });
    const background = (await hostSnapshot(host)).background;
    const bgMetas0 = await backgroundMetas(host);

    await save(host);
    await expect.poll(async () => (await playerOverlays(p.player, 't_seer')).aura, { timeout: 15000 }).toEqual({ cx: 125, cy: 125, r: 175, color: '#0000ff' });
    const view = await playerOverlays(p.player, 't_seer');
    expect(view.cone).toMatchObject({ r: 250, color: '#00ffff' });
    expect(close(view.cone.start, [125 + 250 * Math.cos(-Math.PI / 8), 125 + 250 * Math.sin(-Math.PI / 8)])).toBe(true);
    // Same background, not sent again. (The first save after a reload re-encodes it once, whatever
    // was edited: the reload published it from the saved record under its own fog version. The
    // bytes, and so the id and revision, are unchanged.)
    expect((await hostSnapshot(host)).background).toEqual(background);
    expect(await backgroundMetas(host)).toBe(bgMetas0);
    await expect.poll(() => host.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull();
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });
});
