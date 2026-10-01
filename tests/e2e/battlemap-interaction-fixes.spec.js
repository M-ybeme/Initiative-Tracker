// 2.3.28: Battle Map input fixes, on the real Battle Map in Live Share mode (so publication can be
// checked too).
//  - Measure: only a measurement gesture that began on the map can store a persistent measurement;
//    a click on the Measure / Persistent buttons, the Save button, the sidebar or the context menu
//    never does (it used to store one ending at the button).
//  - Right-click: only the primary button (or the middle button, which pans) starts a drag; a
//    right-click opens the token's context menu and changes nothing (it used to snap an off-grid
//    token, mark the map unsaved, and make the menu miss the token).
// "Changes nothing" is checked through the Save button (it stays clean), the stored map, the draft
// record and what Live Share has published and sent.
import { test, expect } from '@playwright/test';
import { hostSnapshot, sentText, makeMap, importMap, openHost, openPanel, screenOf, save, watchErrors, recordHostSends, HOST_PAGE, VIEW_SCALE } from '../helpers/battlemap-live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const STORED = 'dmtoolbox.battlemap.mvp.v3';
const DRAFT = 'dmtoolbox.battlemap.mvp.v3.draft';
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORED);
const draft = (page) => page.evaluate((k) => localStorage.getItem(k), DRAFT);
const saveState = (page) => page.getByTestId('save-map').getAttribute('data-state');
const expectClean = (page, why) => expect(page.getByTestId('save-map'), why).not.toHaveAttribute('data-state', /dirty|saving/);
const BARD = '/images/playerTokens/PlayerBardToken.png';

// A press, a move and a release on the map, between two world points.
async function dragOnMap(page, from, to, button = 'left') {
  const a = await screenOf(page, from.x, from.y);
  const b = await screenOf(page, to.x, to.y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down({ button });
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up({ button });
}

async function measureMode(page) {
  await page.locator('#tabMeasure').click();
  await page.locator('#persistentMeasureToggle').click();
  await page.locator('#measureToggle').click();
  await expect(page.locator('#persistentMeasureToggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#measureToggle')).toHaveAttribute('aria-pressed', 'true');
}

// What the Battle Map has stored after a save: its persistent measurements, in world coordinates.
async function storedMeasurements(page) {
  await save(page);
  return (await stored(page)).persistentMeasurements.map((m) => [Math.round(m.x1), Math.round(m.y1), Math.round(m.x2), Math.round(m.y2)]);
}

async function liveShareMarks(page) {
  return { revision: (await hostSnapshot(page)).revision, sent: (await sentText(page)).length };
}

test.describe('Battle Map measurement gestures (2.3.28)', () => {
  test('only gestures on the map store persistent measurements; clicks on controls never do', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_a', name: 'A', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    await measureMode(host);
    await expectClean(host, 'turning the modes on changes nothing');

    // A genuine gesture: exactly one measurement, between the gesture's own points.
    await dragOnMap(host, { x: 200, y: 400 }, { x: 400, y: 400 });
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    expect(await storedMeasurements(host)).toEqual([[200, 400, 400, 400]]);
    const marks = await liveShareMarks(host);

    // The original reproduction: Measure off through its own button. Nothing is stored.
    await host.locator('#measureToggle').click();
    await expect(host.locator('#measureToggle')).toHaveAttribute('aria-pressed', 'false');
    await expectClean(host, 'Measure off creates no measurement');
    // Measure on again, then the Persistent button off and on: nothing either.
    await host.locator('#measureToggle').click();
    await host.locator('#persistentMeasureToggle').click();
    await host.locator('#persistentMeasureToggle').click();
    await expectClean(host, 'Persistent button creates no measurement');
    // Other controls while measuring: the Fog tab and back, the Save button, the sidebar.
    await host.locator('#tabFog').click();
    await host.locator('#tabMeasure').click();
    await host.getByTestId('save-map').click();
    await openPanel(host, 'accTokens');
    await openPanel(host, 'accSession');
    await expectClean(host, 'other controls create no measurement');
    // A press that began off the map and is released over it is not a gesture on the map.
    const sidebar = await host.locator('#accSessionHdr').boundingBox();
    const onMap = await screenOf(host, 600, 300);
    await host.mouse.move(sidebar.x + 20, sidebar.y + 10);
    await host.mouse.down();
    await host.mouse.move(onMap.x, onMap.y, { steps: 6 });
    await host.mouse.up();
    await expectClean(host, 'a release over the map without a gesture creates nothing');
    expect(await storedMeasurements(host)).toEqual([[200, 400, 400, 400]]);
    // Nothing was published or sent for any of this.
    expect(await liveShareMarks(host)).toEqual(marks);

    // Several genuine gestures: one measurement each.
    await dragOnMap(host, { x: 100, y: 300 }, { x: 160, y: 300 });
    await dragOnMap(host, { x: 500, y: 100 }, { x: 500, y: 250 });
    expect(await storedMeasurements(host)).toEqual([
      [200, 400, 400, 400],
      [100, 300, 160, 300],
      [500, 100, 500, 250],
    ]);
    // ...and controls clicked after them still add nothing.
    await host.locator('#measureToggle').click();
    await host.locator('#tabFog').click();
    await expectClean(host, 'controls after measurements create nothing');
    expect((await stored(host)).persistentMeasurements).toHaveLength(3);
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });

  test('Alt+drag quick measure stores exactly one measurement and then ends', async ({ browser }) => {
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_a', name: 'A', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    await host.locator('#tabMeasure').click();
    await host.locator('#persistentMeasureToggle').click(); // Persistent on, the Measure toggle off
    await host.keyboard.down('Alt');
    await dragOnMap(host, { x: 200, y: 400 }, { x: 350, y: 400 });
    await host.keyboard.up('Alt');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    expect(await storedMeasurements(host)).toEqual([[200, 400, 350, 400]]);
    // Measuring ended with Alt: a later click on the map or a control stores nothing.
    const at = await screenOf(host, 600, 450);
    await host.mouse.click(at.x, at.y);
    await host.locator('#tabFog').click();
    await expectClean(host, 'after Alt measuring, clicks store nothing');
    expect((await stored(host)).persistentMeasurements).toHaveLength(1);
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });

  test('a cancelled gesture, or Measure turned off mid-gesture, stores nothing', async ({ browser }) => {
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_a', name: 'A', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    await measureMode(host);
    const a = await screenOf(host, 200, 400);
    const b = await screenOf(host, 400, 400);

    // The browser cancels the pointer mid-gesture (e.g. a system gesture took over).
    await host.mouse.move(a.x, a.y);
    await host.mouse.down();
    await host.mouse.move(b.x, b.y, { steps: 4 });
    await host.evaluate(() => document.getElementById('uiLayer').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true })));
    await host.mouse.up();
    await expectClean(host, 'a cancelled gesture stores nothing');

    // Measure turned off while the button is still held on the map.
    await host.mouse.move(a.x, a.y);
    await host.mouse.down();
    await host.mouse.move(b.x, b.y, { steps: 4 });
    await host.evaluate(() => document.getElementById('measureToggle').click());
    await host.mouse.up();
    await expectClean(host, 'Measure off mid-gesture stores nothing');
    expect(await storedMeasurements(host)).toEqual([]);

    // Measuring still works afterwards.
    await host.locator('#measureToggle').click();
    await dragOnMap(host, { x: 200, y: 400 }, { x: 300, y: 400 });
    expect(await storedMeasurements(host)).toEqual([[200, 400, 300, 400]]);
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });
});

test.describe('Battle Map right-click (2.3.28)', () => {
  // Opens the context menu on a world point; returns the token the page selected for it.
  async function rightClick(page, world) {
    const at = await screenOf(page, world.x, world.y);
    await page.mouse.click(at.x, at.y, { button: 'right' });
    await expect(page.locator('#ctxMenu')).toBeVisible();
    return page.evaluate(() => [...document.querySelectorAll('#tokenList .pill')].filter((p) => p.style.outline).map((p) => p.textContent));
  }
  const closeMenu = async (page) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('#ctxMenu')).toBeHidden();
  };
  const positions = async (page) => (await stored(page)).tokens.map((t) => [t.id, t.x, t.y, t.w, t.h, t.rot]);
  const setGrid = async (page, size) => {
    await openPanel(page, 'accMap');
    await page.locator('#gridSize').fill(String(size));
    await page.evaluate(() => document.activeElement.blur());
  };

  test('right-clicking a token opens its menu and changes nothing, on or off the grid; left-drag still moves and snaps', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), {
      tokens: [
        { id: 't_a', name: 'Alpha', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 },
        { id: 't_b', name: 'Beta', imgSrc: BARD, x: 150, y: 100, w: 50, h: 50, rot: 0, visibleToPlayers: false }, // right next to it
      ],
    });
    // On the grid: an ordinary right-click.
    expect(await rightClick(host, { x: 125, y: 125 })).toEqual(['Alpha']);
    await expect(host.locator('#ctxMenu [data-cmd="toggleVisible"]')).toHaveText('☑ Visible to Players');
    await closeMenu(host);
    await expectClean(host, 'on-grid right-click');

    // Off the grid: the grid is now 60, so Alpha (x 100, y 100) no longer sits on it.
    await setGrid(host, 60);
    await save(host);
    const before = await positions(host);
    const marks = await liveShareMarks(host);
    expect(await draft(host)).toBeNull();

    expect(await rightClick(host, { x: 125, y: 125 })).toEqual(['Alpha']);
    await closeMenu(host);
    // The neighbour, hidden from players: its own menu.
    expect(await rightClick(host, { x: 175, y: 125 })).toEqual(['Beta']);
    await expect(host.locator('#ctxMenu [data-cmd="toggleVisible"]')).toHaveText('☐ Visible to Players (hidden)');
    await closeMenu(host);
    // A right-button drag across the token: no drag either.
    await dragOnMap(host, { x: 125, y: 125 }, { x: 260, y: 220 }, 'right');
    await closeMenu(host);

    expect(await saveState(host)).not.toMatch(/dirty|saving/);
    expect(await draft(host)).toBeNull();
    expect(await liveShareMarks(host)).toEqual(marks); // nothing published or sent
    await save(host);
    expect(await positions(host)).toEqual(before); // x, y, size and rotation exactly as they were

    // A left-drag still moves the off-grid token, snapped to the 60 grid, and marks the map unsaved.
    await dragOnMap(host, { x: 125, y: 125 }, { x: 225, y: 160 });
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await save(host);
    const [, x, y] = (await positions(host)).find((t) => t[0] === 't_a');
    expect([x % 60, y % 60]).toEqual([0, 0]);
    expect([x, y]).not.toEqual([100, 100]);
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });

  test('a right-click makes the token the only selection: Delete then removes just that token', async ({ browser }) => {
    const { hostContext, host, hostErrors } = await openHost(browser);
    // importMap adds one cover fog shape (COVER, x 480-620, y 180-320).
    await importMap(host, await makeMap(host), {
      tokens: [
        { id: 't_a', name: 'Alpha', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 },
        { id: 't_b', name: 'Beta', imgSrc: BARD, x: 300, y: 100, w: 50, h: 50, rot: 0 },
      ],
    });
    // A persistent measurement, then Measure off.
    await measureMode(host);
    await dragOnMap(host, { x: 200, y: 450 }, { x: 400, y: 450 });
    await host.locator('#measureToggle').click();
    await save(host);
    const clickAt = async (p) => {
      const at = await screenOf(host, p.x, p.y);
      await host.mouse.click(at.x, at.y);
    };

    // A selected fog shape, then a right-click on Alpha and Delete (with the menu open: Escape
    // would clear the selection): only Alpha goes.
    await clickAt({ x: 550, y: 250 });
    expect(await rightClick(host, { x: 125, y: 125 })).toEqual(['Alpha']);
    await host.keyboard.press('Delete');
    await closeMenu(host); // (Delete leaves the menu open, over the map)
    await save(host);
    let after = await stored(host);
    expect(after.tokens.map((t) => t.id)).toEqual(['t_b']);
    expect(after.fogShapes).toHaveLength(1);

    // A selected measurement, then a right-click on Beta and Delete: only Beta goes.
    await clickAt({ x: 300, y: 450 });
    expect(await rightClick(host, { x: 325, y: 125 })).toEqual(['Beta']);
    await host.keyboard.press('Delete');
    await save(host);
    after = await stored(host);
    expect(after.tokens).toHaveLength(0);
    expect(after.persistentMeasurements).toHaveLength(1);
    expect(after.fogShapes).toHaveLength(1);
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });

  test('on an already unsaved map, a right-click adds no change; the middle button still pans', async ({ browser }) => {
    const { hostContext, host, hostErrors } = await openHost(browser);
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_a', name: 'Alpha', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    await setGrid(host, 60); // unsaved: the map is dirty from here on
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    const marks = await liveShareMarks(host);
    expect(await rightClick(host, { x: 125, y: 125 })).toEqual(['Alpha']);
    await closeMenu(host);
    expect(await draft(host)).toBeNull(); // no draft written by the right-click
    expect(await liveShareMarks(host)).toEqual(marks);
    await save(host);
    expect((await positions(host))[0]).toEqual(['t_a', 100, 100, 50, 50, 0]);

    // Middle-drag pans the view (documented); it moves no token.
    const view = (await stored(host)).view;
    await dragOnMap(host, { x: 400, y: 300 }, { x: 450, y: 330 }, 'middle');
    await save(host);
    const after = await stored(host);
    expect(after.view.x).not.toBe(view.x);
    expect(after.view.scale).toBe(VIEW_SCALE);
    expect(after.tokens[0].x).toBe(100);
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });
});

test.describe('Battle Map touch input (2.3.28 guard)', () => {
  test('a touch drag still moves and snaps a token, and a touch measurement is still stored', async ({ browser }) => {
    const hostContext = await browser.newContext({ hasTouch: true });
    await hostContext.addInitScript(recordHostSends);
    const host = await hostContext.newPage();
    const hostErrors = watchErrors(host);
    await host.goto(HOST_PAGE);
    await host.waitForFunction(() => window.BattleMapLiveShare);
    await importMap(host, await makeMap(host), { tokens: [{ id: 't_a', name: 'Alpha', imgSrc: BARD, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
    const cdp = await hostContext.newCDPSession(host);
    // A real touch (the browser makes pointer events of pointerType "touch", button 0 from it).
    const touchDrag = async (from, to) => {
      const a = await screenOf(host, from.x, from.y);
      const b = await screenOf(host, to.x, to.y);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
      for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + ((b.x - a.x) * i) / 6, y: a.y + ((b.y - a.y) * i) / 6 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };

    await touchDrag({ x: 125, y: 125 }, { x: 240, y: 175 });
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await save(host);
    const t = (await stored(host)).tokens[0];
    expect([t.x % 50, t.y % 50]).toEqual([0, 0]);
    expect([t.x, t.y]).not.toEqual([100, 100]);

    await measureMode(host);
    await touchDrag({ x: 200, y: 400 }, { x: 400, y: 400 });
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    expect(await storedMeasurements(host)).toEqual([[200, 400, 400, 400]]);
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });
});
