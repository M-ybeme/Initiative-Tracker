// Live Share Milestone 1 seam on the real Battle Map, with the 2.3.27 save-gated publication: the
// player-safe snapshot (window.BattleMapLiveShare) is the last SAVED map. Edits change only the
// DM's own view until Save / Ctrl+S; HP, selection and images are never shared; a map stored as an
// unsaved draft (by placing a token, for example) is not published after a reload until it is saved.
import { test, expect } from '@playwright/test';

const PAGE = '/battlemap';

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

const snapshot = (page) => page.evaluate(() => window.BattleMapLiveShare.getPlayerSafeState());
const signals = (page) => page.evaluate(() => window.__shareSignals);

// Let any pending frame render run.
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function save(page) {
  await page.keyboard.press('Control+s');
  await expect(page.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/);
}

async function openMap(page) {
  await page.goto(PAGE);
  await page.waitForFunction(() => window.BattleMapLiveShare);
  // A map that was never saved has nothing published.
  expect(await snapshot(page)).toBeNull();
  await page.evaluate(() => {
    window.__shareSignals = [];
    window.BattleMapLiveShare.onShareableStateChanged((e) => window.__shareSignals.push(e.revision));
  });
  await save(page);
  await expect.poll(() => snapshot(page)).not.toBeNull();
}

async function addPresetToken(page, label) {
  // The token controls live in the sidebar's "Tokens" section, collapsed by default.
  if (!(await page.locator('#tokenPreset').isVisible())) {
    await page.locator('[data-bs-target="#accTokens"]').click();
    await expect(page.locator('#tokenPreset')).toBeVisible();
  }
  await page.locator('#tokenPreset').selectOption({ label });
  await page.locator('#addPreset').click();
  await expect(page.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
}

async function tokenMenu(page, cmd) {
  // Tokens are placed at the centre of the map view, selected.
  const box = await page.locator('#uiLayer').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
  await page.locator(`#ctxMenu [data-cmd="${cmd}"]`).click();
}

test.describe('Battle Map share-state seam with save-gated publication', () => {
  test('edits publish only on save; HP and selection never do; a shown label shares the name', async ({ page }) => {
    const errors = watchErrors(page);
    await openMap(page);
    const empty = await snapshot(page);
    expect(empty).toMatchObject({ schema: 'dmtoolbox.battlemap.player-safe', version: 2, background: null, tokens: [], measurements: [] });

    // Placing a token is a draft: nothing is published until Save.
    await addPresetToken(page, 'Fighter');
    await settle(page);
    expect(await snapshot(page)).toEqual(empty);
    await save(page);
    await expect.poll(async () => (await snapshot(page)).tokens.length).toBe(1);
    const placed = await snapshot(page);
    expect(placed.revision).toBe(empty.revision + 1);
    const [token] = placed.tokens;
    expect(Object.keys(token).sort()).toEqual(['assetId', 'conditions', 'h', 'id', 'name', 'rot', 'w', 'x', 'y']);
    expect(token).toMatchObject({ name: null, conditions: [], rot: 0, w: 50, h: 50 }); // label off by default

    // HP through the real HP dialog, then saved: never shared, no revision change.
    await tokenMenu(page, 'setHp');
    await page.locator('#hpCurrent').fill('12');
    await page.locator('#hpMax').fill('20');
    await page.locator('#hpSaveBtn').click();
    await expect(page.locator('#hpModal')).toBeHidden();
    await save(page);
    const afterHp = await snapshot(page);
    // (The click snapped the token to the grid: that position change is what this save published.)
    expect(afterHp.tokens[0].x % 50).toBe(0);
    expect(JSON.stringify(afterHp)).not.toMatch(/"hp"|maxHp|"12"|"20"/);
    await save(page); // saving again with nothing new publishes nothing new
    expect((await snapshot(page)).revision).toBe(afterHp.revision);

    // Showing the label: unpublished until saved, then exactly one new revision and one signal.
    const signalsBefore = (await signals(page)).length;
    await tokenMenu(page, 'toggleLabel');
    await settle(page);
    expect((await snapshot(page)).tokens[0].name).toBeNull();
    await save(page);
    await expect.poll(async () => (await snapshot(page)).tokens[0].name).toBe('Fighter');
    const labelled = await snapshot(page);
    expect(labelled.revision).toBe(afterHp.revision + 1);
    expect((await signals(page)).slice(signalsBefore)).toEqual([labelled.revision]);

    const text = JSON.stringify(labelled);
    expect(text).not.toMatch(/imgSrc|data:image|\/images\/|selected|dragMode|"view"|fog|dmtoolbox\.battlemap\.mvp|visibleToPlayers/);
    expect(errors).toEqual([]);
  });

  test('a saved map is published again after a reload; an unsaved draft is restored but not published, until it is saved', async ({ page }) => {
    const errors = watchErrors(page);
    await openMap(page);
    await addPresetToken(page, 'Wizard');
    await tokenMenu(page, 'toggleLabel');
    await save(page);
    await expect.poll(async () => (await snapshot(page)).tokens[0]?.name).toBe('Wizard');
    const saved = await snapshot(page);

    await page.reload();
    await page.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
    const content = ({ revision: _r, ...rest }) => rest;
    expect(content(await snapshot(page))).toEqual(content(saved));
    await expect(page.getByTestId('save-map')).toHaveAttribute('data-state', 'clean');

    // Placing a token stores the map straight away (as before), but as a separate unsaved draft:
    // after a reload the DM gets the draft back, still unsaved, and players still get the save.
    await addPresetToken(page, 'Rogue');
    await page.reload();
    await page.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
    await expect(page.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('#tokenList .pill').length)).toBe(2);
    expect(content(await snapshot(page))).toEqual(content(saved));
    await save(page);
    await expect.poll(async () => (await snapshot(page))?.tokens.length).toBe(2);
    expect(errors).toEqual([]);
  });

  test('redraws and hovering without edits cost no revisions', async ({ page }) => {
    await openMap(page);
    await addPresetToken(page, 'Cleric');
    await save(page);
    const first = await snapshot(page);
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(100 + i * 10, 200); // hover redraws the UI layer
      await settle(page);
    }
    expect((await snapshot(page)).revision).toBe(first.revision);
  });
});
