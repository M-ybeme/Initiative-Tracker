import { test, expect } from '@playwright/test';
import { installHydrationCounter } from '../helpers/character-sheet.js';

// One stored attack must roll the same way on the Character Sheet and in Combat Mode: the same notation
// accepted, the same flat bonus applied, a truthful history entry, and the same refusal (with a specific
// message and no history entry) for notation the dice engine cannot roll.

async function installDice(page) {
  await page.addInitScript(() => {
    const real = Math.random;
    window.__dice = [];
    Math.random = () => (window.__dice.length ? window.__dice.shift() : real());
  });
}
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('dialog', d => { errors.push(`dialog: ${d.message()}`); d.dismiss().catch(() => {}); });
  return errors;
}
const SHEET = {
  charName: 'Testa Brightblade', charRace: 'Human', charClass: 'Fighter', charLevel: '5',
  charAC: '17', charCurrentHP: '27', charMaxHP: '40', charTempHP: '0', charSpeed: '30',
  charInitMod: '3', statStr: '20', statDex: '14', statCon: '14'
};
async function setup(page, attacks, character = {}) {
  await installHydrationCounter(page);
  await installDice(page);
  await page.goto('/characters.html');
  await page.waitForFunction(() =>
    typeof window.getAttackFeatureBonuses === 'function' && typeof window.triggerActionEconomy === 'function');
  await page.locator('#chooseBlankBtn').click({ timeout: 8000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  await page.waitForFunction(() => window.__characterLoaded > 0 && window.getCurrentCharacter() !== null);
  await page.evaluate(([f, list, extra]) => {
    for (const [id, value] of Object.entries(f)) {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    Object.assign(window.getCurrentCharacter(), extra); // the live character the attack features read
    window.currentAttackList.push(...list);
    const toggle = document.getElementById('dmCombatModeToggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    window.rollHistory.length = 0;
  }, [SHEET, attacks, character]);
  await expect(page.locator('body')).toHaveClass(/combat-mode/);
}
const history = page => page.evaluate(() => window.rollHistory.map(r => ({ ...r })));
// Scripts the dice and clicks in one page task, so nothing else can draw from the scripted queue.
const roll = (page, how, index, type, faces = []) => page.evaluate(([h, i, t, f]) => {
  window.__dice.push(...f.map(([sides, face]) => (face - 0.5) / sides));
  if (h === 'combat') {
    document.querySelector(`.combat-roll-damage[data-index="${i}"][data-type="${t}"]`).click();
  } else { // the sheet's own damage buttons
    const b = document.createElement('button');
    b.setAttribute('data-damage-roll', String(i));
    b.setAttribute('data-roll-type', t);
    document.body.appendChild(b);
    b.click();
    b.remove();
  }
}, [how, index, type, faces]);
const rebuilt = e => e.groups
  ? e.groups.reduce((n, g) => n + g.sign * g.kept.reduce((a, b) => a + b, 0), 0) + e.modifier
  : e.kept.reduce((a, b) => a + b, 0) + e.modifier;

for (const how of ['combat', 'sheet']) {
  test.describe(`${how === 'combat' ? 'Combat Mode' : 'Character Sheet'} damage`, () => {
    test('a flat bonus (Dueling +2) reaches the total for notation the old pattern skipped', async ({ page }) => {
      const errors = watchErrors(page);
      await setup(page, [
        { name: 'Spaced', type: 'melee-weapon', bonus: '+5', damage: '1d8 + 3', damageType: 'slashing' },
        { name: 'Kept', type: 'melee-weapon', bonus: '+5', damage: '4d6kh3+1', damageType: 'force' },
        { name: 'Pair', type: 'melee-weapon', bonus: '+5', damage: '2d6+1d4', damageType: 'force' }
      ], { fightingStyles: ['Dueling'] });

      await roll(page, how, 0, 'normal', [[8, 5]]);
      await roll(page, how, 1, 'normal', [[6, 6], [6, 5], [6, 4], [6, 1]]);
      await roll(page, how, 2, 'normal', [[6, 2], [6, 3], [4, 4]]);
      const [pair, kept, spaced] = await history(page); // newest first
      expect(spaced).toMatchObject({ total: 5 + 3 + 2, modifier: 5 }); // the +2 used to be dropped here
      expect(kept).toMatchObject({ total: 15 + 1 + 2, modifier: 3 });
      expect(pair.total).toBe(2 + 3 + 4 + 2);
      for (const e of [spaced, kept, pair]) expect(rebuilt(e)).toBe(e.total);
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('a signed expression rolls, and its history entry adds up to the total', async ({ page }) => {
      const errors = watchErrors(page);
      await setup(page, [{ name: 'Trickster', type: 'melee-weapon', bonus: '+5', damage: '2d6 - 4d6kh3 + 2', damageType: 'force' }]);
      await roll(page, how, 0, 'normal', [[6, 4], [6, 5], [6, 6], [6, 5], [6, 4], [6, 1]]);
      const h = await history(page);
      expect(h).toHaveLength(1); // the sheet used to roll nothing for several dice groups
      expect(h[0].total).toBe(9 - 15 + 2);
      expect(h[0].groups).toMatchObject([
        { sign: 1, rolls: [4, 5], kept: [4, 5], dropped: [] },
        { sign: -1, rolls: [6, 5, 4, 1], kept: [4, 5, 6], dropped: [1] }
      ]);
      expect(rebuilt(h[0])).toBe(h[0].total);
      expect(errors, errors.join('\n')).toEqual([]);
    });

    // A crit doubles every damage die: 2d6+1d4+3 is 4d6+2d4+3, and 2d6-1d4+3 is 4d6-2d4+3 (+3 once).
    test('Critical on several dice groups doubles each group, keeps signs, and adds the modifier once', async ({ page }) => {
      const errors = watchErrors(page);
      await setup(page, [
        { name: 'Pair', type: 'melee-weapon', bonus: '+5', damage: '2d6+1d4+3', damageType: 'force' },
        { name: 'Trick', type: 'melee-weapon', bonus: '+5', damage: '2d6-1d4+3', damageType: 'force' }
      ]);
      await roll(page, how, 0, 'critical', [[6, 2], [6, 3], [6, 5], [6, 6], [4, 4], [4, 1]]);
      await roll(page, how, 1, 'critical', [[6, 2], [6, 3], [6, 5], [6, 6], [4, 4], [4, 1]]);
      const [trick, pair] = await history(page); // newest first
      expect(pair).toMatchObject({ total: 16 + 5 + 3, modifier: 3, isCritical: true });
      expect(pair.rolls).toEqual([2, 3, 5, 6, 4, 1]); // 4d6 and 2d4
      expect(trick).toMatchObject({ total: 16 - 5 + 3, modifier: 3, isCritical: true });
      expect(trick.groups.map(g => [g.sign, g.rolls])).toEqual([[1, [2, 3]], [1, [5, 6]], [-1, [4]], [-1, [1]]]);
      for (const e of [pair, trick]) {
        expect(rebuilt(e)).toBe(e.total);
        expect(e.notation).toMatch(/\(crit\)/);
        expect(e.description).toMatch(/crit/i);
      }
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('a crit that would double one of several groups past the dice limit is refused, not rolled normally', async ({ page }) => {
      const errors = watchErrors(page);
      await setup(page, [
        { name: 'Swarm', type: 'melee-weapon', bonus: '+5', damage: '2d6+600d6', damageType: 'force' },
        { name: 'Sword', type: 'melee-weapon', bonus: '+5', damage: '1d8+3', damageType: 'slashing' }
      ]);
      await roll(page, how, 0, 'critical');
      await expect(page.locator('#appToastBody')).toContainText('Swarm');
      await expect(page.locator('#appToastBody')).toContainText('Critical roll exceeds the maximum dice limit.');
      expect(await history(page)).toHaveLength(0); // no normal-damage fallback, no 0-damage entry
      await roll(page, how, 1, 'normal', [[8, 5]]); // the next roll still works
      expect((await history(page))[0].total).toBe(8);
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('GWF and Savage Attacker apply to every group of added dice', async ({ page }) => {
      const errors = watchErrors(page);
      await setup(page, [{ name: 'Pair', type: 'melee-weapon', bonus: '+5', damage: '2d6+1d4', damageType: 'force' }],
        { fightingStyles: ['Great Weapon Fighting'], feats: ['Savage Attacker'] });
      // set 1: 1->reroll 6, 3, d4 2->reroll 4 = 13; set 2: 5, 5, 3 = 13 (a tie keeps the first)
      await roll(page, how, 0, 'normal', [[6, 1], [6, 6], [6, 3], [4, 2], [4, 4], [6, 5], [6, 5], [4, 3]]);
      const [e] = await history(page);
      expect(e.total).toBe(13);
      expect(e.rolls).toEqual([6, 3, 4]);
      expect(e.description).toContain('[SA: 13 vs 13]');
      expect(e.description).toContain('[GWF]');
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('GWF and Savage Attacker on damage that subtracts a group: not applied, and the user is told', async ({ page }) => {
      const errors = watchErrors(page);
      await setup(page, [{ name: 'Trick', type: 'melee-weapon', bonus: '+5', damage: '2d6-1d4+3', damageType: 'force' }],
        { fightingStyles: ['Great Weapon Fighting'], feats: ['Savage Attacker'] });
      await roll(page, how, 0, 'normal', [[6, 1], [6, 2], [4, 1]]); // no rerolls, one set
      const [e] = await history(page);
      expect(e.total).toBe(1 + 2 - 1 + 3);
      expect(e.rolls).toEqual([1, 2, 1]);
      expect(e.description).toContain('[GWF, SA not applied: subtracted dice]');
      expect(e.description).not.toMatch(/\[SA:|\[GWF\]/);
      await expect(page.locator('#appToastBody')).toContainText('Great Weapon Fighting and Savage Attacker not applied');
      expect(errors, errors.join('\n')).toEqual([]);
    });

    for (const bad of [
      { damage: '2d6 fire and 1d6 cold', says: 'Dice notation not recognized' },
      { damage: '2d6 3', says: 'Dice notation not recognized' }, // used to roll a d63
      { damage: '1001d6', says: 'Too many dice: at most 1000 in one group.' },
      { damage: '1d6+99999999999999999999', says: 'too large to add up exactly' }
    ]) {
      test(`"${bad.damage}" is refused with a specific message and nothing is recorded`, async ({ page }) => {
        const errors = watchErrors(page);
        // A level 11 Paladin also gets an Improved Divine Smite extra roll: it must not be rolled on its own.
        await setup(page, [
          { name: 'Broken', type: 'melee-weapon', bonus: '+5', damage: bad.damage, damageType: 'fire' },
          { name: 'Sword', type: 'melee-weapon', bonus: '+5', damage: '1d8+3', damageType: 'slashing' }
        ], { charClass: 'Paladin 11' });

        await roll(page, how, 0, 'normal');
        await expect(page.locator('#appToastBody')).toContainText(bad.says);
        await expect(page.locator('#appToastBody')).toContainText('Broken');
        expect(await history(page)).toHaveLength(0); // no 0-damage entry, no stranded smite roll
        if (how === 'combat') await expect(page.locator('#combatRollResult0')).toContainText(bad.says);

        // the next roll still works normally
        await roll(page, how, 1, 'normal', [[8, 5], [8, 7]]);
        const h = await history(page);
        const sword = h.find(e => /Sword/.test(e.description) && !/Smite/.test(e.description));
        expect(sword.total).toBe(8);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }

    test('Savage Attacker: the history entry says a second set was rolled and which total was kept', async ({ page }) => {
      const errors = watchErrors(page);
      await setup(page, [{ name: 'Axe', type: 'melee-weapon', bonus: '+5', damage: '1d12+3', damageType: 'slashing' }],
        { feats: ['Savage Attacker'] });
      await roll(page, how, 0, 'normal', [[12, 4], [12, 9]]);
      const [e] = await history(page);
      expect(e.total).toBe(12);
      expect(e.rolls).toEqual([9]);
      expect(e.description).toContain('[SA: 9 vs 4]'); // Combat Mode's entry used to leave this out
      expect(errors, errors.join('\n')).toEqual([]);
    });
  });
}

// Spell rolls reach the combined roll toast (showRollToast's multi-result branch). It used to show "undefined"
// for a flat-number roll (Goodberry's heal_dice "1") and drop the sign of a subtracted group.
test.describe('spell roll toast', () => {
  const cast = (page, spell, faces = []) => page.evaluate(([sp, f]) => {
    window.__dice.push(...f.map(([sides, face]) => (face - 0.5) / sides));
    window.currentSpellList = [sp];
    window.rollSpellDice(0);
  }, [spell, faces]);
  const toast = page => page.locator('#rollToastBody');

  test('a flat-number heal shows its total, not "undefined"', async ({ page }) => {
    const errors = watchErrors(page);
    await setup(page, []);
    await cast(page, { title: 'Goodberry', level: 1, tags: ['healing'], heal_dice: '1' });
    await expect(toast(page)).toContainText('Goodberry');
    await expect(toast(page)).toContainText('Healing: 1');
    await expect(toast(page)).not.toContainText('undefined');
    expect((await history(page))[0].total).toBe(1);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a signed expression keeps its sign and its displayed total matches the roll', async ({ page }) => {
    const errors = watchErrors(page);
    await setup(page, []);
    await cast(page, { title: 'Odd Bolt', level: 1, tags: ['damage'], damage_dice: '2d6-1d4' }, [[6, 2], [6, 5], [4, 4]]);
    await expect(toast(page)).toContainText('[2, 5] -[4] = 3');
    await expect(toast(page)).not.toContainText('undefined');
    expect((await history(page))[0].total).toBe(3);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a single dice group still reads as before', async ({ page }) => {
    const errors = watchErrors(page);
    await setup(page, []);
    await cast(page, { title: 'Burning Thing', level: 1, tags: ['damage'], damage_dice: '3d6+2' }, [[6, 1], [6, 2], [6, 3]]);
    await expect(toast(page)).toContainText('[1, 2, 3] +2 = 8');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test('the Initiative Tracker roller names a limit instead of calling valid notation a format error', async ({ page }) => {
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  await page.addInitScript(() => localStorage.setItem('initiativeHelpSeen', '1'));
  await page.goto('/initiative.html');
  for (const [expr, says] of [
    ['1001d6', 'Too many dice: at most 1000 in one group.'],
    ['1d6+99999999999999999999', 'too large to add up exactly'],
    ['2d6 3', 'Invalid format.']
  ]) {
    await page.fill('#custom-dice-input', expr);
    await page.click('#roll-custom-dice');
    await expect.poll(() => dialogs.length).toBeGreaterThan(0);
    expect(dialogs.shift()).toContain(says);
  }
});
