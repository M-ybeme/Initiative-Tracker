import { test, expect } from '@playwright/test';
import { installHydrationCounter, readPersisted, saveViaButton, currentId } from '../helpers/character-sheet.js';

// Combat Mode correctness pass: damage rolls reach roll history, and the host dependencies the card relies on
// (app toast, condition sync, Short Rest, Long Rest) work end to end through the real card controls.

async function installDice(page) {
  await page.addInitScript(() => {
    const real = Math.random;
    window.__dice = [];
    Math.random = () => (window.__dice.length ? window.__dice.shift() : real());
  });
}
const script = (page, faces) =>
  page.evaluate(f => { window.__dice.push(...f.map(([sides, face]) => (face - 0.5) / sides)); }, faces);
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}
const SHEET = {
  charName: 'Testa Brightblade', charRace: 'Human', charClass: 'Fighter', charLevel: '5',
  charAC: '17', charCurrentHP: '27', charMaxHP: '40', charTempHP: '0', charSpeed: '30',
  charInitMod: '3', statStr: '20', statDex: '14', statCon: '14'
};

async function loadPage(page) {
  await installHydrationCounter(page);
  await installDice(page);
  await page.goto('/characters.html');
  await page.waitForFunction(() =>
    typeof window.getAttackFeatureBonuses === 'function' && typeof window.triggerActionEconomy === 'function');
  await page.locator('#chooseBlankBtn').click({ timeout: 8000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  await page.waitForFunction(() => window.__characterLoaded > 0 && window.getCurrentCharacter() !== null);
}
async function enterCombatMode(page, fields = SHEET) {
  await page.evaluate((f) => {
    for (const [id, value] of Object.entries(f)) {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const toggle = document.getElementById('dmCombatModeToggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  }, fields);
  await expect(page.locator('body')).toHaveClass(/combat-mode/);
}
const value = (page, id) => page.evaluate(i => document.getElementById(i).value, id);
const history = page => page.evaluate(() => window.rollHistory.map(r => ({ ...r })));

test.describe('damage rolls reach roll history', () => {
  const addAttacks = (page, attacks) => page.evaluate(list => {
    window.currentAttackList.push(...list);
    document.getElementById('dmCombatModeToggle').dispatchEvent(new Event('change', { bubbles: true }));
  }, attacks);
  // Scripts the dice and clicks in ONE page task, so no other page code (ids, timers) can draw from the scripted
  // Math.random queue in between.
  const rollDamage = async (page, index, type = 'normal', faces = []) => {
    await page.evaluate(([i, t, f]) => {
      window.__dice.push(...f.map(([sides, face]) => (face - 0.5) / sides));
      document.querySelector(`.combat-roll-damage[data-index="${i}"][data-type="${t}"]`).click();
    }, [index, type, faces]);
  };

  test('an ordinary damage roll adds one entry with its dice, modifier and total; no exception is swallowed', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    await addAttacks(page, [{ name: 'Longsword', type: 'melee-weapon', bonus: '+5', damage: '1d8+3', damageType: 'slashing' }]);
    await rollDamage(page, 0, 'normal', [[8, 6]]);
    const h = await history(page);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ description: 'Longsword Damage', notation: '1d8+3', rolls: [6], modifier: 3, total: 9 });
    await expect(page.locator('#combatRollResult0')).toContainText('9');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('several dice groups and a secondary damage roll: every die, the flat modifier and the total are recorded', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    await addAttacks(page, [{ name: 'Flame Tongue', type: 'melee-weapon', bonus: '+5', damage: '2d6+1d4+2', damage2: '2d6-1', damageType: 'slashing' }]);
    await rollDamage(page, 0, 'normal', [[6, 3], [6, 5], [4, 2], [6, 4], [6, 1]]);
    const h = await history(page);
    expect(h).toHaveLength(1);
    // main 3+5+2+2 = 12; secondary 4+1-1 = 4
    expect(h[0]).toMatchObject({ notation: '2d6+1d4+2 + 2d6-1', rolls: [3, 5, 2, 4, 1], modifier: 1, total: 16 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a critical hit doubles the dice, keeps the flat modifier, and is recorded as a crit', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    await addAttacks(page, [{ name: 'Longsword', type: 'melee-weapon', bonus: '+5', damage: '1d8+3', damageType: 'slashing' }]);
    await rollDamage(page, 0, 'critical', [[8, 6], [8, 2]]);
    const h = await history(page);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ description: 'Longsword Damage (Crit)', notation: '1d8+3 (crit)', rolls: [6, 2], modifier: 3, total: 11 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a critical hit on a keep-highest damage group keeps the same mechanic on twice the dice', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page);
    await addAttacks(page, [{ name: 'Odd Blade', type: 'melee-weapon', bonus: '+5', damage: '4d6kh3', damageType: 'force' }]);
    await rollDamage(page, 0, 'critical', [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 1], [6, 2]]);
    const [entry] = await history(page);
    expect(entry.total).toBe(2 + 2 + 3 + 4 + 5 + 6); // 8d6 rolled; the six highest of [1,2,3,4,5,6,1,2] count (drops the two 1s)
    expect(entry.rolls).toHaveLength(8);
  });

  test('a legacy attack ("1d8+3 slashing", "1d4 fire") rolls the same in Combat Mode and on the sheet', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    await addAttacks(page, [{ name: 'Old Sword', type: 'melee-weapon', bonus: '+5', damage: '1d8+3 slashing', damageType: 'slashing', damage2: '1d4 fire', damageType2: 'fire' }]);

    // Combat Mode: main + secondary in one entry
    await rollDamage(page, 0, 'normal', [[8, 5], [4, 3]]);
    const [fromCard] = await history(page);
    expect(fromCard).toMatchObject({ rolls: [5, 3], modifier: 3, total: 11 });

    // The sheet's own roll buttons (delegated on the document): primary, then secondary
    await page.evaluate(() => { window.rollHistory.length = 0; });
    await page.evaluate(() => {
      window.__dice.push(...[[8, 5], [4, 3]].map(([sides, face]) => (face - 0.5) / sides));
      for (const attr of ['data-damage-roll', 'data-damage2-roll']) {
        const b = document.createElement('button');
        b.setAttribute(attr, '0');
        document.body.appendChild(b);
        b.click();
        b.remove();
      }
    });
    const sheet = await history(page); // newest first
    expect(sheet).toHaveLength(2);
    expect(sheet[1]).toMatchObject({ rolls: [5], modifier: 3, total: 8 });
    expect(sheet[0]).toMatchObject({ rolls: [3], modifier: 0, total: 3 });
    expect(sheet[1].total + sheet[0].total, 'same stored attack, same damage in both views').toBe(fromCard.total);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('host dependencies used by Combat Mode', () => {
  test('toast: the initiative reminder shows an app toast', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    await page.evaluate(() => { window.getCurrentCharacter().features = 'Feral Instinct'; });
    await script(page, [[20, 12]]);
    await page.click('#combatInitiativeBox');
    await expect(page.locator('#appToastBody')).toContainText('Initiative reminder: roll with advantage (Feral Instinct)');
    await expect(page.locator('#appToast')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('conditions: adding and removing on the card keeps the sheet field in step and persists', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    const id = await currentId(page);

    await page.evaluate(() => document.querySelector('#combatAddConditionMenu [data-add-condition="Prone"]').click());
    await page.evaluate(() => document.querySelector('#combatAddConditionMenu [data-add-condition="Poisoned"]').click());
    expect((await value(page, 'charConditions')).split(', ').sort()).toEqual(['Poisoned', 'Prone']);
    await expect(page.locator('#combatConditions')).toContainText('Prone');

    await page.evaluate(() => document.querySelector('#combatConditions [data-remove-condition="Prone"]').click());
    expect(await value(page, 'charConditions')).toBe('Poisoned');
    await expect(page.locator('#combatConditions')).not.toContainText('Prone');

    const saved = await saveViaButton(page, id);
    expect(saved.conditions).toBe('Poisoned');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Short Rest from the card opens the hit-dice path, heals, spends dice, and persists', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page, { ...SHEET, charCurrentHP: '5', charHitDice: '3d8', charHitDiceRemaining: '3d8' });
    const id = await currentId(page);
    await page.click('#combatShortRestBtn');
    await expect(page.locator('#hitDiceModal')).toBeVisible();
    await page.fill('#hdSpendCount', '2');
    await script(page, [[8, 4], [8, 6]]);
    await page.click('#hdRollBtn');
    await page.click('#hdApplyBtn');
    await expect.poll(() => value(page, 'charCurrentHP')).toBe('19'); // 5 + (4+2) + (6+2)
    expect(await value(page, 'charHitDiceRemaining')).toBe('1d8');
    const saved = await saveViaButton(page, id);
    expect(saved.currentHP).toBe(19);
    expect(saved.hitDiceRemaining ?? saved.hitDice?.remaining ?? saved.hitDiceRemainingText).toBeDefined();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Long Rest from the card restores HP, temp HP, hit dice, slots and resources, shows a toast, and persists', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page, {
      ...SHEET, charCurrentHP: '5', charTempHP: '4', charHitDice: '4d8', charHitDiceRemaining: '0d8',
      slots1Max: '4', slots1Used: '3',
    });
    const id = await currentId(page);
    await page.click('#combatLongRestBtn');
    await expect(page.locator('#appToastBody')).toContainText('Long rest complete');
    expect(await value(page, 'charCurrentHP')).toBe('40');
    expect(await value(page, 'charTempHP')).toBe('0');
    expect(await value(page, 'charHitDiceRemaining')).toBe('2d8'); // half of 4
    expect(await value(page, 'slots1Used')).toBe('0');
    const saved = await saveViaButton(page, id);
    expect(saved.currentHP).toBe(40);
    expect(saved.tempHP).toBe(0);
    expect(errors, errors.join('\n')).toEqual([]);
    expect((await readPersisted(page)).length).toBe(1);
  });
});
