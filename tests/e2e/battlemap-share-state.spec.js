// Live Share Milestone 1: the Battle Map's share-state seam on the real page. Real UI actions change
// the map; window.BattleMapLiveShare exposes the player-safe snapshot and the change signal. Nothing
// is sent anywhere: this checks the seam only, and that saving and loading still work as before.
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

// Let any pending frame render (and with it, the seam's check) run.
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function openMap(page) {
  await page.goto(PAGE);
  await page.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
  // Record every signal from here on.
  await page.evaluate(() => {
    window.__shareSignals = [];
    window.BattleMapLiveShare.onShareableStateChanged((e) => window.__shareSignals.push(e.revision));
  });
}

async function addPresetToken(page, label) {
  // The token controls live in the sidebar's "Tokens" section, collapsed by default.
  if (!(await page.locator('#tokenPreset').isVisible())) {
    await page.locator('[data-bs-target="#accTokens"]').click();
    await expect(page.locator('#tokenPreset')).toBeVisible();
  }
  await page.locator('#tokenPreset').selectOption({ label });
  await page.locator('#addPreset').click();
  await expect.poll(async () => (await snapshot(page)).tokens.length).toBeGreaterThan(0);
}

async function tokenMenu(page, cmd) {
  // Tokens are placed at the centre of the map view, selected.
  const box = await page.locator('#uiLayer').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
  await page.locator(`#ctxMenu [data-cmd="${cmd}"]`).click();
}

test.describe('Battle Map share-state seam (Live Share Milestone 1)', () => {
  test('placing a token is shared; HP and selection are not; showing the label shares the name', async ({ page }) => {
    const errors = watchErrors(page);
    await openMap(page);
    const empty = await snapshot(page);
    expect(empty).toMatchObject({ schema: 'dmtoolbox.battlemap.player-safe', version: 2, background: null, tokens: [], measurements: [] });
    expect(empty.revision).toBeGreaterThanOrEqual(1);

    await addPresetToken(page, 'Fighter');
    const placed = await snapshot(page);
    expect(placed.revision).toBeGreaterThan(empty.revision);
    expect(placed.tokens).toHaveLength(1);
    const [token] = placed.tokens;
    expect(Object.keys(token).sort()).toEqual(['assetId', 'conditions', 'h', 'id', 'name', 'rot', 'w', 'x', 'y']);
    expect(token).toMatchObject({ name: null, conditions: [], rot: 0, w: 50, h: 50 }); // label off by default
    expect(await page.evaluate(() => window.__shareSignals)).toContain(placed.revision);

    // Clicking a token snaps it to the grid (existing Battle Map behavior), which really moves it
    // for players: the seam reports that as a change of its own.
    await tokenMenu(page, 'setHp');
    await settle(page);
    const snapped = await snapshot(page);
    expect(snapped.tokens[0].x % 50).toBe(0);
    expect(snapped.tokens[0].y % 50).toBe(0);

    // HP through the real HP dialog: saved on the token, never shared, no revision change.
    await page.locator('#hpCurrent').fill('12');
    await page.locator('#hpMax').fill('20');
    await page.locator('#hpSaveBtn').click();
    await expect(page.locator('#hpModal')).toBeHidden();
    await settle(page);
    const afterHp = await snapshot(page);
    expect(afterHp.revision).toBe(snapped.revision);
    expect(afterHp.tokens).toEqual(snapped.tokens);
    expect(JSON.stringify(afterHp)).not.toMatch(/"hp"|maxHp|"12"|"20"/);
    // The edit really happened: reopening the dialog shows the token's stored HP.
    await tokenMenu(page, 'setHp');
    await expect(page.locator('#hpCurrent')).toHaveValue('12');
    await expect(page.locator('#hpMax')).toHaveValue('20');
    await page.locator('#hpSaveBtn').click();
    await expect(page.locator('#hpModal')).toBeHidden();
    await settle(page);
    expect((await snapshot(page)).revision).toBe(snapped.revision);

    // Showing the label is player-visible: the name appears, the revision moves on, one signal.
    const signalsBefore = (await page.evaluate(() => window.__shareSignals)).length;
    await tokenMenu(page, 'toggleLabel');
    await expect.poll(async () => (await snapshot(page)).tokens[0].name).toBe('Fighter');
    const labelled = await snapshot(page);
    expect(labelled.revision).toBe(afterHp.revision + 1);
    expect((await page.evaluate(() => window.__shareSignals)).slice(signalsBefore)).toEqual([labelled.revision]);

    // Nothing private or asset-related anywhere in the snapshot.
    const text = JSON.stringify(labelled);
    expect(text).not.toMatch(/imgSrc|data:image|\/images\/|selected|dragMode|"view"|fog|dmtoolbox\.battlemap\.mvp/);

    expect(errors).toEqual([]);
  });

  test('saving and loading are unchanged: a reload restores the same shared content', async ({ page }) => {
    const errors = watchErrors(page);
    await openMap(page);
    await addPresetToken(page, 'Wizard');
    await tokenMenu(page, 'toggleLabel');
    await expect.poll(async () => (await snapshot(page)).tokens[0]?.name).toBe('Wizard');
    const before = await snapshot(page);

    // The label toggle only marks the map unsaved. Placing another token saves the whole map
    // (the page's own save path), label included.
    await addPresetToken(page, 'Rogue');
    await expect.poll(async () => (await snapshot(page)).tokens.length).toBe(2);
    const saved = await snapshot(page);

    await page.reload();
    await page.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState().tokens.length === 2);
    const reloaded = await snapshot(page);
    const content = ({ revision: _r, ...rest }) => rest;
    expect(content(reloaded)).toEqual(content(saved));
    expect(reloaded.tokens.find((t) => t.name === 'Wizard')).toBeTruthy();
    expect(before.tokens[0].name).toBe('Wizard');
    expect(errors).toEqual([]);
  });

  test('checking the seam many times without changes costs no revisions', async ({ page }) => {
    await openMap(page);
    await addPresetToken(page, 'Cleric');
    await settle(page);
    const first = await snapshot(page);
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(100 + i * 10, 200); // hover redraws the UI layer
      await settle(page);
    }
    expect((await snapshot(page)).revision).toBe(first.revision);
  });
});
