// 2.3.27: Battle Map Live Share publishes only saved maps, and a token can be hidden from players.
// The DM edits the real Battle Map (battlemap.html?liveshare=1); players (liveshare-dev.html, separate
// contexts, local relay) must see nothing of an unsaved draft: not token moves, new tokens, fog or
// visibility changes. One Save (button or Ctrl+S) publishes the saved state; a failed save publishes
// nothing; a player joining while the DM has unsaved edits gets the last saved map. A token hidden
// from players is absent from everything sent, its art included.
import { test, expect } from '@playwright/test';
import { watchErrors, recordPlayerTraffic, hostSnapshot, sentText, sentMetas, makeMap, makeTokenPng, save, importMap, screenOf, openHost, openPanel, tokenMenu, addPresetToken } from '../helpers/battlemap-live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const sentSnapshots = async (page) => (await sentText(page)).map((t) => JSON.parse(t)).filter((m) => m.type === 'battlemap-snapshot');
const saveState = (page) => page.getByTestId('save-map').getAttribute('data-state');

// What a player shows: its revision, token ids and positions, and background asset id.
function playerView(player) {
  return player.evaluate(() => {
    const svg = document.querySelector('[data-testid="player-map"]');
    const bg = svg.querySelector('.ls-background-image');
    return {
      revision: Number(svg.getAttribute('data-revision')),
      tokens: [...svg.querySelectorAll('.ls-token')].map((g) => ({
        id: g.getAttribute('data-token-id'),
        at: g.querySelector('.ls-token-body').getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/).slice(1).map(Number),
        art: g.getAttribute('data-art'),
      })),
      background: bg ? bg.getAttribute('data-asset-id') : null,
    };
  });
}

async function joinPlayer(browser, joinUrl) {
  const context = await browser.newContext();
  await context.addInitScript(recordPlayerTraffic);
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  return { context, player, errors };
}

// The player shows exactly the host's published state (revision, tokens, background). The player
// draws positions rounded to 2 decimals.
const round = (n) => Math.round(n * 100) / 100;
async function expectShowing(player, host) {
  let last = null;
  await expect
    .poll(
      async () => {
        const published = await hostSnapshot(host);
        const view = await playerView(player);
        last = { published: { revision: published.revision, background: published.background, tokens: published.tokens.map((t) => [t.id, t.x + t.w / 2, t.y + t.h / 2]) }, view };
        return (
          view.revision === published.revision &&
          view.background === (published.background && published.background.assetId) &&
          JSON.stringify(view.tokens.map((t) => [t.id, ...t.at])) === JSON.stringify(published.tokens.map((t) => [t.id, round(t.x + t.w / 2), round(t.y + t.h / 2)]))
        );
      },
      { timeout: 15000, message: 'player shows the published state' }
    )
    .toBe(true)
    .catch((err) => {
      throw new Error(`${err.message}
${JSON.stringify(last)}`);
    });
  return playerView(player);
}

async function drag(page, fromWorld, dx, dy) {
  const from = await screenOf(page, fromWorld.x, fromWorld.y);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
  await page.mouse.up();
}

// The DM's own canvas at a world point: [r, g, b, a] of the token layer.
function tokenLayerPixel(page, wx, wy) {
  return page.evaluate(({ wx, wy }) => {
    const c = document.getElementById('tokenLayer');
    const d = c.getContext('2d').getImageData(Math.round(wx * 0.6 * devicePixelRatio), Math.round(wy * 0.6 * devicePixelRatio), 1, 1).data;
    return Array.from(d);
  }, { wx, wy });
}

// Whether the DM-only hidden badge (amber) is drawn near a token's top-right corner.
function hiddenBadgeAt(page, t) {
  return page.evaluate(({ x, y }) => {
    const c = document.getElementById('tokenLayer');
    const d = c.getContext('2d').getImageData(Math.round(x * 0.6 - 12), Math.round(y * 0.6 - 12), 24, 24).data;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] > 160 && d[i + 1] < 210 && d[i + 2] < 90 && d[i + 3] > 200) return true;
    return false;
  }, { x: t.x + t.w - 9, y: t.y + 9 });
}

test.describe('Battle Map staged Live Share publishing (2.3.27)', () => {
  test('players see only saved maps: drafts stay private, one save publishes, a failed save publishes nothing', async ({ browser }) => {
    test.setTimeout(150000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const art = await makeTokenPng(host);
    const artUrl = `data:image/png;base64,${art.toString('base64')}`;
    const spyArt = await host.evaluate(() => {
      const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
      const g = c.getContext('2d');
      g.fillStyle = '#7a00ff';
      g.fillRect(0, 0, 64, 64);
      return c.toDataURL('image/png');
    });

    // 1-2: saved state A. The spy (custom art) is hidden from players from the start.
    const BARD = { id: 't_bard', x: 100, y: 100, w: 50, h: 50 };
    const HERO = { id: 't_hero', x: 300, y: 100, w: 50, h: 50 };
    await importMap(host, await makeMap(host), {
      tokens: [
        { ...BARD, name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', rot: 0, showLabel: true },
        { ...HERO, name: 'Hero', imgSrc: artUrl, rot: 0, showLabel: true },
        { id: 't_spy', name: 'SecretSpy', imgSrc: spyArt, x: 400, y: 100, w: 50, h: 50, rot: 0, showLabel: true, visibleToPlayers: false },
      ],
    });
    const A = await hostSnapshot(host);
    expect(A.tokens.map((t) => t.id)).toEqual(['t_bard', 't_hero']);
    await expect.poll(async () => (await hostSnapshot(host)).tokens[1].assetId, { timeout: 10000 }).toMatch(/^[0-9a-f]{64}$/);

    // 3-4: a player joins and sees A.
    await host.getByTestId('start-room').click();
    await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players');
    await expect(host.getByTestId('save-map')).toHaveAttribute('title', /update players/);
    const joinUrl = await host.getByTestId('join-link').textContent();
    const p1 = await joinPlayer(browser, joinUrl);
    const viewA = await expectShowing(p1.player, host);
    await expect(p1.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    expect(viewA.tokens.map((t) => t.id)).toEqual(['t_bard', 't_hero']);
    const published = await hostSnapshot(host);

    // 5-8: a draft: move the bard, add a token, change the fog, hide the hero.
    const snapshotsBefore = (await sentSnapshots(host)).length;
    const metasBefore = (await sentMetas(host)).length;
    const heroCenter = { x: HERO.x + 25, y: HERO.y + 25 };
    await expect.poll(async () => (await tokenLayerPixel(host, heroCenter.x, heroCenter.y))[3]).toBe(255);
    expect(await hiddenBadgeAt(host, HERO)).toBe(false);
    await drag(host, { x: BARD.x + 25, y: BARD.y + 25 }, 60, 30);
    await addPresetToken(host, 'Fighter');
    await expect.poll(() => host.evaluate(() => document.querySelectorAll('#tokenList .pill').length)).toBe(4);
    await host.locator('#fogCover').click();
    await host.locator('#addFogShape').click();
    // ...and paint fog with the brush (cover), as a DM preparing a reveal would.
    await host.locator('#fogBrushMode').click();
    await drag(host, { x: 650, y: 480 }, 60, 0);
    await host.locator('#fogBrushMode').click();
    expect(await tokenMenu(host, heroCenter, 'toggleVisible')).toContain('☑ Visible to Players');
    // DM-only look: dimmed, with a crossed-eye badge; the menu shows the new state.
    await expect.poll(async () => (await tokenLayerPixel(host, heroCenter.x, heroCenter.y))[3]).toBeLessThan(180);
    expect((await tokenLayerPixel(host, heroCenter.x, heroCenter.y))[3]).toBeGreaterThan(100);
    expect(await hiddenBadgeAt(host, HERO)).toBe(true);
    const heroOnScreen = await screenOf(host, heroCenter.x, heroCenter.y);
    await host.mouse.click(heroOnScreen.x, heroOnScreen.y, { button: 'right' }); // reopen the menu
    await expect(host.locator('#ctxMenu [data-cmd="toggleVisible"]')).toHaveText('☐ Visible to Players (hidden)');
    await expect(host.locator('#ctxMenu [data-cmd="toggleVisible"]')).toHaveAttribute('aria-checked', 'false');
    await host.keyboard.press('Escape');

    // 9-10: unsaved; players still see exactly A, and nothing was sent.
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await host.waitForTimeout(1500); // past any rebuild or throttle window
    expect(await hostSnapshot(host)).toEqual(published);
    expect(await playerView(p1.player)).toEqual(viewA);
    expect((await sentSnapshots(host)).length).toBe(snapshotsBefore);
    expect((await sentMetas(host)).length).toBe(metasBefore);

    // 11-14: the Save button publishes the final draft as one new state B.
    await host.getByTestId('save-map').click();
    await expect(host.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/, { timeout: 15000 });
    await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 15000 }).toBe(published.revision + 1);
    const B = await hostSnapshot(host);
    const viewB = await expectShowing(p1.player, host);
    expect(B.tokens.map((t) => t.id)).toEqual(['t_bard', expect.stringMatching(/^t_/)]); // hero hidden, fighter added
    expect(B.tokens.some((t) => t.id === 't_hero')).toBe(false);
    expect(B.tokens[0].x).not.toBe(BARD.x);
    expect(B.background.revision).toBe(A.background.revision + 1); // the fog change, published with it
    expect(viewB.background).toBe(B.background.assetId);
    await expect(p1.player.locator('[data-token-id="t_hero"]')).toHaveCount(0);
    const newSnapshots = (await sentSnapshots(host)).slice(snapshotsBefore);
    expect(newSnapshots.map((m) => m.payload.revision)).toEqual([B.revision]); // no intermediate drafts
    const bJson = JSON.stringify(newSnapshots[0]);
    expect(bJson).not.toMatch(/t_hero|t_spy|SecretSpy|"Hero"|visibleToPlayers|"visible"/);

    // 15-17: draft C (move the bard, unhide the hero); a new player joining now gets B, not C.
    await drag(host, { x: B.tokens[0].x + 25, y: B.tokens[0].y + 25 }, -90, 60);
    await tokenMenu(host, heroCenter, 'toggleVisible');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await p1.player.getByTestId('leave-session').click();
    await expect(host.getByTestId('peer-list')).toContainText('No players connected.');
    const p2 = await joinPlayer(browser, joinUrl);
    const joinedView = await expectShowing(p2.player, host);
    expect(joinedView.revision).toBe(B.revision);
    expect(joinedView.tokens.map((t) => t.id)).toEqual(B.tokens.map((t) => t.id));
    expect(joinedView.tokens[0].at).toEqual([round(B.tokens[0].x + 25), round(B.tokens[0].y + 25)]);

    // 18-20: Ctrl+S publishes C the same way: the hero is back (its art is requested normally by
    // this new player), and a save with no fog change sends no new background.
    const bgMetasBefore = (await sentMetas(host)).filter((m) => m.asset.kind === 'background').length;
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 15000 }).toBe(B.revision + 1);
    const C = await hostSnapshot(host);
    expect(C.tokens.map((t) => t.id)).toContain('t_hero');
    expect(C.background).toEqual(B.background);
    await expectShowing(p2.player, host);
    await expect(p2.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    expect((await sentMetas(host)).filter((m) => m.asset.kind === 'background').length).toBe(bgMetasBefore);

    // The spy's art was never prepared or sent, and nothing about it ever left the host.
    const tokenMetaIds = new Set((await sentMetas(host)).filter((m) => m.asset.kind === 'token').map((m) => m.asset.assetId));
    expect([...tokenMetaIds]).toEqual([C.tokens.find((t) => t.id === 't_hero').assetId]);
    for (const text of await sentText(host)) expect(text).not.toMatch(/t_spy|SecretSpy/);

    // Saving again with nothing new publishes nothing.
    const snapshotCount = (await sentSnapshots(host)).length;
    await save(host);
    await host.waitForTimeout(800);
    expect((await hostSnapshot(host)).revision).toBe(C.revision);
    expect((await sentSnapshots(host)).length).toBe(snapshotCount);

    // 21: a save that fails publishes nothing and stays unsaved; players keep C.
    await host.evaluate(() => {
      window.__realSaveBattleMap = IndexedDBStorage.saveBattleMap;
      window.__realSetItem = Storage.prototype.setItem;
      IndexedDBStorage.saveBattleMap = () => Promise.reject(new Error('disk full (test)'));
      Storage.prototype.setItem = function () {
        throw new Error('quota exceeded (test)');
      };
    });
    const bardC = C.tokens.find((t) => t.id === 't_bard');
    await drag(host, { x: bardC.x + 25, y: bardC.y + 25 }, 30, 0);
    await host.keyboard.press('Control+s');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty', { timeout: 10000 });
    await host.waitForTimeout(800);
    expect(await saveState(host)).toBe('dirty');
    expect(await hostSnapshot(host)).toEqual(C);
    expect((await sentSnapshots(host)).length).toBe(snapshotCount);
    expect((await playerView(p2.player)).revision).toBe(C.revision);
    // Storage works again: the next save publishes.
    await host.evaluate(() => {
      IndexedDBStorage.saveBattleMap = window.__realSaveBattleMap;
      Storage.prototype.setItem = window.__realSetItem;
    });
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 15000 }).toBe(C.revision + 1);
    await expectShowing(p2.player, host);

    // Expected console errors: only the forced storage failures above.
    expect(hostErrors.filter((e) => !/disk full \(test\)|quota exceeded \(test\)|save failed|could not be saved/i.test(e))).toEqual([]);
    expect(p1.errors).toEqual([]);
    expect(p2.errors).toEqual([]);
    await hostContext.close();
    await p1.context.close();
    await p2.context.close();
  });

  test('a map that was never saved cannot be shared until it is saved', async ({ browser }) => {
    const { hostContext, host, hostErrors } = await openHost(browser);
    expect(await hostSnapshot(host)).toBeNull();
    await addPresetToken(host, 'Fighter');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await host.getByTestId('start-room').click();
    await expect(host.getByTestId('host-status')).toHaveText('Save the map first (Save button or Ctrl+S): players only see saved maps.');
    await expect(host.getByTestId('join-link')).toBeHidden();
    await save(host);
    await host.getByTestId('start-room').click();
    await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players');
    const joinUrl = await host.getByTestId('join-link').textContent();
    const p = await joinPlayer(browser, joinUrl);
    await expect(p.player.locator('.ls-token')).toHaveCount(1, { timeout: 15000 });
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('the save button shows every kind of unsaved edit, on the ordinary Battle Map too', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser, '/battlemap'); // no Live Share
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_a', name: 'A', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    await expect(host.getByTestId('save-map')).toHaveAttribute('title', 'Save map (Ctrl+S)');
    const saves = [
      async () => host.getByTestId('save-map').click(),
      async () => host.keyboard.press('Control+s'),
      async () => {
        await openPanel(host, 'accSession');
        await host.locator('#saveSession').click();
      },
    ];
    let n = 0;
    const edit = async (label, act) => {
      await expect(host.getByTestId('save-map'), `${label}: starts clean`).not.toHaveAttribute('data-state', /dirty|saving/);
      await act();
      await expect(host.getByTestId('save-map'), `${label}: marks the map unsaved`).toHaveAttribute('data-state', 'dirty');
      await expect(host.getByTestId('save-map'), `${label}: save button usable`).toBeEnabled();
      // Nothing stays on top of it (a closing modal's backdrop may for a moment).
      await expect.poll(() => host.getByTestId('save-map').evaluate((b) => { const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), { message: `${label}: save button not covered` }).toBe(true);
      // The older "Unsaved Changes" badge follows too. It sits in the (usually collapsed) Session
      // panel, so its own display is asserted, not whether it is on screen (in its flex row a shown
      // badge computes to "block").
      await expect(host.locator('#unsavedIndicator'), `${label}: badge shown`).not.toHaveCSS('display', 'none');
      await saves[n++ % saves.length]();
      await expect(host.getByTestId('save-map'), `${label}: saving clears it`).not.toHaveAttribute('data-state', /dirty|saving/, { timeout: 10000 });
      await expect(host.locator('#unsavedIndicator'), `${label}: badge hidden`).toHaveCSS('display', 'none');
    };
    const tokenAt = async (id) => {
      const t = (await hostSnapshot(host)).tokens.find((x) => x.id === id);
      return { x: t.x + t.w / 2, y: t.y + t.h / 2 };
    };

    await edit('token move', () => drag(host, { x: 125, y: 125 }, 40, 0));
    await edit('token add', () => addPresetToken(host, 'Fighter'));
    const fighter = (await hostSnapshot(host)).tokens.find((t) => t.id !== 't_a');
    await edit('token delete', () => tokenMenu(host, { x: fighter.x + 25, y: fighter.y + 25 }, 'delete'));
    await edit('label', async () => tokenMenu(host, await tokenAt('t_a'), 'toggleLabel'));
    await edit('condition', async () => {
      await tokenMenu(host, await tokenAt('t_a'), 'addStatus');
      await host.locator('#statusCheckboxes input[value="Prone"]').check();
      await host.locator('#statusSaveBtn').click();
    });
    await edit('fog painting', async () => {
      await host.locator('#fogCover').click();
      await host.locator('#fogBrushMode').click();
      await drag(host, { x: 650, y: 480 }, 50, 0);
      await host.locator('#fogBrushMode').click();
    });
    await edit('fog shape add', () => host.locator('#addFogShape').click());
    await edit('fog shape delete', () => host.locator('#deleteFogShape').click());
    await edit('grid', async () => {
      await openPanel(host, 'accMap');
      // 25 keeps token A (x 150, y 100) on the grid: a right-click press on a token snaps it, so an
      // off-grid token would jump out from under the later right-clicks and no menu would open.
      await host.locator('#gridSize').fill('25');
      await host.evaluate(() => document.activeElement.blur());
    });
    await edit('measurement', async () => {
      await host.locator('#tabMeasure').click();
      await host.locator('#persistentMeasureToggle').click();
      await host.locator('#measureToggle').click();
      await drag(host, { x: 200, y: 400 }, 120, 0);
      await host.locator('#measureToggle').click();
      await host.locator('#persistentMeasureToggle').click();
      await host.locator('#tabFog').click();
    });
    await edit('visibility', async () => tokenMenu(host, await tokenAt('t_a'), 'toggleVisible'));

    // No Live Share without ?liveshare=1: no connections, no prepared assets.
    expect(await host.evaluate(() => window.BattleMapLiveShare.getAssetDiagnostics())).toBeNull();
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });

  test('Visible to Players survives saving and reloading; maps without the setting stay visible', async ({ browser }) => {
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), {
      tokens: [
        { id: 't_old', name: 'Old', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0 }, // no setting: visible
        { id: 't_x', name: 'X', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 300, y: 100, w: 50, h: 50, rot: 0 },
      ],
    });
    expect((await hostSnapshot(host)).tokens.map((t) => t.id)).toEqual(['t_old', 't_x']);
    await tokenMenu(host, { x: 325, y: 125 }, 'toggleVisible');
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).tokens.map((t) => t.id)).toEqual(['t_old']);
    const stored = await host.evaluate(() => JSON.parse(localStorage.getItem('dmtoolbox.battlemap.mvp.v3')).tokens.map((t) => [t.id, t.visibleToPlayers]));
    expect(stored).toEqual([['t_old', true], ['t_x', false]]);

    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
    expect((await hostSnapshot(host)).tokens.map((t) => t.id)).toEqual(['t_old']);
    const at = await screenOf(host, 325, 125);
    await host.mouse.click(at.x, at.y, { button: 'right' });
    await expect(host.locator('#ctxMenu [data-cmd="toggleVisible"]')).toHaveText('☐ Visible to Players (hidden)');
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });
});
