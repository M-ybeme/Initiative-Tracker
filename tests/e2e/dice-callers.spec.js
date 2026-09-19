import { test, expect } from '@playwright/test';

// Real-browser checks that each caller of the shared dice engine (js/modules/dice-engine.js) still
// rolls and reports correctly: the Initiative Tracker's roller (a classic script), the Character
// Sheet (an ES module) and Combat Mode (inline script on characters.html). Math.random is scripted so
// every roll is known. Combat Mode lives inline in the HTML and cannot be imported, so this is the
// only place it is exercised.

// Replace Math.random with a queue the test fills; when the queue is empty it falls through to the
// real one so unrelated page code keeps working.
async function installDice(page) {
  await page.addInitScript(() => {
    const real = Math.random;
    window.__dice = [];
    Math.random = () => (window.__dice.length ? window.__dice.shift() : real());
  });
}
// faces: [sides, face] pairs, produced in order by the next rolls
const script = (page, faces) =>
  page.evaluate(f => { window.__dice.push(...f.map(([sides, face]) => (face - 0.5) / sides)); }, faces);
const unscriptedDiceLeft = page => page.evaluate(() => window.__dice.length);

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}

test.describe('the dice engine loads in the browser', () => {
  for (const url of ['/initiative.html', '/characters.html', '/encounterbuilder.html']) {
    test(`${url} publishes window.DiceEngine`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(url);
      const api = await page.evaluate(() => Object.keys(window.DiceEngine || {}).sort());
      expect(api).toContain('rollDiceExpression');
      expect(api).toContain('rollD20');
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});

test.describe('Initiative Tracker roller (classic script)', () => {
  test.beforeEach(async ({ page }) => {
    await installDice(page);
    await page.addInitScript(() => localStorage.setItem('initiativeHelpSeen', '1'));
    await page.goto('/initiative.html');
  });

  const rollCustom = async (page, text) => {
    await page.fill('#custom-dice-input', text);
    await page.click('#roll-custom-dice');
  };

  test('a positive modifier', async ({ page }) => {
    const errors = watchErrors(page);
    await script(page, [[6, 3], [6, 5]]);
    await rollCustom(page, '2d6+3');
    await expect(page.locator('#dice-result')).toHaveText('🎲 Rolled 2d6+3: 2d6 [3, 5] +3 = 11');
    expect(await unscriptedDiceLeft(page)).toBe(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a negative modifier and a dice group subtracted', async ({ page }) => {
    await script(page, [[8, 6]]);
    await rollCustom(page, '1d8-2');
    await expect(page.locator('#dice-result')).toHaveText('🎲 Rolled 1d8-2: 1d8 [6] -2 = 4');
    await script(page, [[6, 6], [4, 4]]);
    await rollCustom(page, '1d6-1d4');
    await expect(page.locator('#dice-result')).toHaveText('🎲 Rolled 1d6-1d4: 1d6 [6] -1d4 [4] = 2');
  });

  test('keep highest', async ({ page }) => {
    await script(page, [[6, 3], [6, 5], [6, 2], [6, 6]]);
    await rollCustom(page, '4d6kh3');
    await expect(page.locator('#dice-result')).toHaveText('🎲 Rolled 4d6kh3: 4d6kh3 [3, 5, 2, 6] → kept [3, 5, 6] = 14');
  });

  test('the Adv and Dis buttons and a d20 button', async ({ page }) => {
    await script(page, [[20, 7], [20, 15]]);
    await page.click('#roll-adv');
    await expect(page.locator('#dice-result')).toHaveText('🎲 Advantage (2d20kh1): [7, 15] → kept [15] = 15');
    await script(page, [[20, 7], [20, 15]]);
    await page.click('#roll-dis');
    await expect(page.locator('#dice-result')).toHaveText('🎲 Disadvantage (2d20kl1): [7, 15] → kept [7] = 7');
    await script(page, [[20, 12]]);
    await page.click('.dice-btn[data-dice="20"]');
    await expect(page.locator('#dice-result')).toHaveText('🎲 Rolled 1d20: [12] = 12');
  });

  test('invalid notation shows the format help and rolls nothing', async ({ page }) => {
    const dialogs = [];
    page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
    await script(page, [[6, 3], [6, 3]]);
    await rollCustom(page, 'banana');
    await rollCustom(page, '2d6+');
    expect(dialogs).toHaveLength(2);
    expect(dialogs[0]).toMatch(/Invalid format/);
    expect(await unscriptedDiceLeft(page)).toBe(2); // no dice were used up
  });
});

test.describe('Character Sheet rolls (ES module)', () => {
  test.beforeEach(async ({ page }) => {
    await installDice(page);
    await page.goto('/characters.html');
    await page.waitForFunction(() => typeof window.rollDice === 'function');
  });
  const lastHistory = page => page.evaluate(() => window.rollHistory[0]);

  test('positive and negative modifiers are added and logged', async ({ page }) => {
    const errors = watchErrors(page);
    await script(page, [[6, 3], [6, 5]]);
    expect(await page.evaluate(() => window.rollDice('2d6+3', 'Fire').total)).toBe(11);
    expect(await lastHistory(page)).toMatchObject({ notation: '2d6+3', description: 'Fire', rolls: [3, 5], modifier: 3, total: 11 });
    await script(page, [[8, 6]]);
    expect(await page.evaluate(() => window.rollDice('1d8-2', 'Cold').total)).toBe(4);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('invalid notation returns null and logs nothing', async ({ page }) => {
    const before = await page.evaluate(() => window.rollHistory.length);
    const result = await page.evaluate(() => window.rollDice('banana', 'x'));
    expect(result).toBeNull();
    expect(await page.evaluate(() => window.rollHistory.length)).toBe(before);
  });

  test('flags a natural 20 and a natural 1 on a d20', async ({ page }) => {
    await script(page, [[20, 20]]);
    expect(await page.evaluate(() => window.rollDice('1d20+2', 'x'))).toMatchObject({ isCritical: true, isFumble: false, total: 22 });
    await script(page, [[20, 1]]);
    expect(await page.evaluate(() => window.rollDice('1d20+2', 'x'))).toMatchObject({ isCritical: false, isFumble: true, total: 3 });
  });

  test('keep highest is honored (the sheet used to add every die)', async ({ page }) => {
    await script(page, [[6, 3], [6, 5], [6, 2], [6, 6]]);
    expect(await page.evaluate(() => window.rollDice('4d6kh3', 'Stats').total)).toBe(14);
  });

  test('Great Weapon Fighting and Savage Attacker notes reach the description', async ({ page }) => {
    await script(page, [[6, 1], [6, 5], [6, 2], [6, 4]]); // 1->5, 2->4
    const gwf = await page.evaluate(() => window.rollDice('2d6+3', 'Maul', { rerollLowDice: true }));
    expect(gwf).toMatchObject({ rolls: [5, 4], total: 12, description: 'Maul [GWF]' });
    await script(page, [[6, 2], [6, 3], [6, 6], [6, 5]]); // set 1 = 5, set 2 = 11
    const sa = await page.evaluate(() => window.rollDice('2d6', 'Blade', { rollTwiceTakeBest: true }));
    expect(sa).toMatchObject({ rolls: [6, 5], total: 11, description: 'Blade [SA: 11 vs 5]' });
  });

  test('a skill roll with advantage and with disadvantage', async ({ page }) => {
    const errors = watchErrors(page);
    const roll = async (type) => {
      await page.evaluate(t => {
        const btn = document.querySelector('[data-skill-roll]');
        btn.setAttribute('data-roll-type', t);
        btn.click();
      }, type);
    };
    await script(page, [[20, 7], [20, 15]]);
    await roll('advantage');
    expect(await lastHistory(page)).toMatchObject({ notation: '2d20 (advantage)', rolls: [7, 15], chosen: 15, isAdvantage: true });
    await script(page, [[20, 7], [20, 15]]);
    await roll('disadvantage');
    expect(await lastHistory(page)).toMatchObject({ notation: '2d20 (disadvantage)', rolls: [7, 15], chosen: 7, isDisadvantage: true });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Combat Mode rolls (inline script on characters.html)', () => {
  test.beforeEach(async ({ page }) => {
    await installDice(page);
    await page.goto('/characters.html');
    await page.waitForFunction(() => typeof window.getAttackFeatureBonuses === 'function');
  });

  // Puts one attack in the list Combat Mode reads and clicks its real delegated roll button.
  async function combatRoll(page, { kind, attack, type = 'normal', character = null }) {
    await page.evaluate(({ kind, attack, type, character }) => {
      window.currentAttackList = [attack];
      window.getCurrentCharacter = () => character;
      const host = document.getElementById('combatActions');
      host.innerHTML = `<div id="combatRollResult0" class="d-none"></div>
        <button class="combat-roll-${kind}" data-index="0" data-type="${type}">roll</button>`;
      host.querySelector('button').click();
    }, { kind, attack, type, character });
    const total = await page.locator('#combatRollResult0 .roll-total').innerText();
    const detail = await page.locator('#combatRollResult0 .small').innerText();
    return `${total} | ${detail.replace(/\s+/g, ' ').trim()}`; // the total, then the breakdown beside it
  }
  const sword = { name: 'Sword', bonus: '+5', damage: '1d8+3', damageType: 'slashing', type: 'melee-weapon' };

  test('an attack roll adds the bonus', async ({ page }) => {
    const errors = watchErrors(page);
    await script(page, [[20, 13]]);
    expect(await combatRoll(page, { kind: 'hit', attack: sword })).toBe('18 | d20: 13 +5');
    expect(await unscriptedDiceLeft(page)).toBe(0); // one d20, not two
    expect(errors, errors.join('\n')).toEqual([]);
  });

  for (const [type, faces, text, total] of [
    ['advantage', [7, 15], 'Advantage: [7, 15] → 15 +5', '20'],
    ['disadvantage', [7, 15], 'Disadvantage: [7, 15] → 7 +5', '12']
  ]) {
    test(`an attack with ${type}`, async ({ page }) => {
      await script(page, faces.map(f => [20, f]));
      expect(await combatRoll(page, { kind: 'hit', attack: sword, type })).toBe(`${total} | ${text}`);
    });
  }

  test('a natural 20 and a natural 1 are flagged', async ({ page }) => {
    await script(page, [[20, 20]]);
    expect(await combatRoll(page, { kind: 'hit', attack: sword })).toContain('CRIT!');
    await script(page, [[20, 1]]);
    expect(await combatRoll(page, { kind: 'hit', attack: sword })).toContain('FUMBLE!');
  });

  test('damage with a positive and a negative modifier', async ({ page }) => {
    await script(page, [[8, 5]]);
    expect(await combatRoll(page, { kind: 'damage', attack: sword })).toBe('8 | 1d8+3 = [5]+3 = 8 slashing');
    await script(page, [[8, 5]]);
    expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '1d8-1' } })).toBe('4 | 1d8-1 = [5]-1 = 4 slashing');
  });

  test('a critical hit doubles the dice and not the modifier', async ({ page }) => {
    await script(page, [[8, 5], [8, 6]]);
    expect(await combatRoll(page, { kind: 'damage', attack: sword, type: 'critical' }))
      .toBe('14 | 2d8+3 = [5, 6]+3 = 14 slashing CRIT!');
  });

  test('secondary damage is rolled and added', async ({ page }) => {
    await script(page, [[8, 5], [6, 4]]);
    const text = await combatRoll(page, { kind: 'damage', attack: { ...sword, damage2: '1d6', damageType: '' } });
    expect(text).toBe('12 | 1d8+3 = [5]+3 = 8 + 1d6+0 = [4]+0 = 4');
  });

  test('Great Weapon Fighting rerolls 1s and 2s', async ({ page }) => {
    await script(page, [[6, 1], [6, 5], [6, 2], [6, 4]]);
    const text = await combatRoll(page, {
      kind: 'damage',
      attack: { ...sword, damage: '2d6+3' },
      character: { charClass: 'Fighter 5', fightingStyles: ['Great Weapon Fighting'], feats: [] }
    });
    expect(text).toBe('12 | 2d6+3 = [5, 4]+3 = 12 [GWF] slashing');
  });

  test('Savage Attacker keeps the higher of two damage rolls', async ({ page }) => {
    await script(page, [[6, 2], [6, 3], [6, 6], [6, 5]]);
    const text = await combatRoll(page, {
      kind: 'damage',
      attack: { ...sword, damage: '2d6' },
      character: { charClass: 'Fighter 5', fightingStyles: [], feats: ['Savage Attacker'] }
    });
    expect(text).toBe('11 | 2d6+0 = [6, 5]+0 = 11 [SA: 11 vs 5] slashing');
  });

  test('a flat number is its own damage', async ({ page }) => {
    expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '5' } })).toBe('5 | 5 slashing');
  });

  test('unreadable damage notation totals 0', async ({ page }) => {
    await script(page, [[6, 3]]);
    expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: 'lots' } })).toBe('0 | 0 slashing');
    expect(await unscriptedDiceLeft(page)).toBe(1); // nothing was rolled
  });

  // Combat Mode used to read only the first "XdY+Z" it found: "d8+2" (no die count) rolled nothing and
  // "2d6+1d4" took just the first group and a wrong modifier. The engine reads both correctly.
  test('INTENTIONAL: "d8+2" now rolls one d8 and "2d6+1d4" adds both groups', async ({ page }) => {
    await script(page, [[8, 5]]);
    expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: 'd8+2' } })).toBe('7 | 1d8+2 = [5]+2 = 7 slashing');
    await script(page, [[6, 3], [6, 4], [4, 2]]);
    expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '2d6+1d4' } })).toBe('9 | 2d6+1d4 = [3, 4, 2] = 9 slashing');
  });

  // Older saved attacks put the damage type in the notation. The engine stays strict; Combat Mode
  // drops recognized trailing damage words before rolling, and warns so the saved data can be found.
  test.describe('legacy trailing text in saved damage notation', () => {
    const warnings = [];
    test.beforeEach(async ({ page }) => {
      warnings.length = 0;
      page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
    });

    test('"1d8+3 slashing" rolls as 1d8+3 and warns once', async ({ page }) => {
      await script(page, [[8, 5]]);
      expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '1d8+3 slashing' } }))
        .toBe('8 | 1d8+3 = [5]+3 = 8 slashing');
      expect(warnings.filter(w => /dropped trailing text/.test(w))).toHaveLength(1);
      expect(warnings.join('\n')).toContain('"1d8+3 slashing"');
      expect(warnings.join('\n')).toContain('rolling "1d8+3"');
    });

    for (const [raw, dice, expected] of [
      ['2d6 fire damage', [[6, 3], [6, 4]], '7 | 2d6+0 = [3, 4]+0 = 7 slashing'],
      ['1d8 +3 piercing', [[8, 2]], '5 | 1d8+3 = [2]+3 = 5 slashing'],
      ['1d10 Fire, Cold', [[10, 6]], '6 | 1d10+0 = [6]+0 = 6 slashing'],
      ['1d6-1  slashing  ', [[6, 4]], '3 | 1d6-1 = [4]-1 = 3 slashing']
    ]) {
      test(`${JSON.stringify(raw)} is normalized and rolls`, async ({ page }) => {
        await script(page, dice);
        expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: raw } })).toBe(expected);
        expect(warnings.some(w => /dropped trailing text/.test(w))).toBe(true);
      });
    }

    test('a critical hit doubles the dice of a legacy string too', async ({ page }) => {
      await script(page, [[8, 5], [8, 6]]);
      expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '1d8+3 slashing' }, type: 'critical' }))
        .toBe('14 | 2d8+3 = [5, 6]+3 = 14 slashing CRIT!');
    });

    test('trailing spaces alone do not warn, and the rolled notation is unchanged', async ({ page }) => {
      await script(page, [[8, 5], [8, 5]]);
      const padded = await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '1d8+3   ' } });
      const clean = await combatRoll(page, { kind: 'damage', attack: sword });
      expect(padded).toBe('8 | 1d8+3 = [5]+3 = 8 slashing');
      expect(padded).toBe(clean);
      expect(warnings.filter(w => /dropped trailing text/.test(w))).toHaveLength(0);
    });

    test('real trailing text still warns, with or without extra trailing spaces', async ({ page }) => {
      await script(page, [[8, 5], [8, 5]]);
      expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '1d8+3 slashing' } }))
        .toBe('8 | 1d8+3 = [5]+3 = 8 slashing');
      expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '1d8+3 slashing   ' } }))
        .toBe('8 | 1d8+3 = [5]+3 = 8 slashing');
      expect(warnings.filter(w => /dropped trailing text/.test(w))).toHaveLength(2);
    });

    test('clean notation is left alone and does not warn', async ({ page }) => {
      await script(page, [[8, 5]]);
      await combatRoll(page, { kind: 'damage', attack: sword });
      expect(warnings.filter(w => /dropped trailing text/.test(w))).toHaveLength(0);
    });

    // Only whitespace-separated damage words are dropped. Everything else the engine rejects stays 0
    // (with a warning naming the notation) and no die is rolled: nothing is "rescued".
    for (const raw of ['hello world', '2d6+ fire', '4d6kh', '1d8+3slashing', '1d8 sonic', '1d8+3 sl', 'slashing 1d8', '1d8 +', '1001d6']) {
      test(`${JSON.stringify(raw)} is not rescued`, async ({ page }) => {
        await script(page, [[6, 3], [6, 3]]);
        expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: raw } })).toBe('0 | 0 slashing');
        expect(await unscriptedDiceLeft(page)).toBe(2); // nothing was rolled
        const unreadable = warnings.filter(w => /could not read dice notation/.test(w));
        expect(unreadable).toHaveLength(1);
        expect(unreadable[0]).toContain(`"${raw}"`); // the string that was actually saved, not a cleaned copy
      });
    }

    test('an unreadable string that was also cleaned up names the original and the cleaned text', async ({ page }) => {
      await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '2d6+ fire' } });
      const unreadable = warnings.find(w => /could not read dice notation/.test(w));
      expect(unreadable).toContain('"2d6+ fire"');
      expect(unreadable).toContain('as rolled: "2d6+"');
    });

    // Dueling adds +2 to melee damage. It used to be added to the RAW string, so for a legacy string it
    // was shown in the breakdown but never rolled. The text is cleaned first now.
    test.describe('flat bonuses (Dueling +2) with legacy strings', () => {
      const duelist = { charClass: 'Fighter 5', fightingStyles: ['Dueling'], feats: [] };
      const roll = (page, damage) => combatRoll(page, { kind: 'damage', attack: { ...sword, damage }, character: duelist });

      test('"1d8+3 slashing" gets the bonus, exactly like clean "1d8+3"', async ({ page }) => {
        await script(page, [[8, 5]]);
        const legacy = await roll(page, '1d8+3 slashing');
        await script(page, [[8, 5]]);
        const clean = await roll(page, '1d8+3');
        expect(legacy).toBe('10 | 1d8+5 = [5]+5 = 10 (+2) slashing'); // 5 + 3 + 2, and the notation rolled is 1d8+5
        expect(legacy).toBe(clean);
        expect(warnings.filter(w => /dropped trailing text/.test(w))).toHaveLength(1); // only the legacy one, once
      });

      test('a legacy string with no modifier gets the bonus too', async ({ page }) => {
        await script(page, [[6, 4]]);
        expect(await roll(page, '1d6 fire')).toBe('6 | 1d6+2 = [4]+2 = 6 (+2) slashing');
      });

      test('a critical hit doubles the dice and still gets the bonus', async ({ page }) => {
        await script(page, [[8, 5], [8, 6]]);
        const text = await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '1d8+3 slashing' }, character: duelist, type: 'critical' });
        expect(text).toBe('16 | 2d8+5 = [5, 6]+5 = 16 (+2) slashing CRIT!');
      });

      for (const raw of ['1d8+ slashing', 'hello world', '1d8+3 sonic', '1d8+3slashing']) {
        test(`${JSON.stringify(raw)} is not rescued by the bonus step`, async ({ page }) => {
          await script(page, [[8, 5]]);
          expect(await roll(page, raw)).toBe('0 | 0 (+2) slashing'); // 0 rolled: the (+2) is only the breakdown label
          expect(await unscriptedDiceLeft(page)).toBe(1);
          expect(warnings.some(w => /could not read dice notation/.test(w))).toBe(true);
        });
      }
    });

    // The regex that drops trailing words is never run on a string past the engine's length limit.
    test.describe('very long saved strings', () => {
      // records every String.replace that uses the legacy-words regex
      const spyOnLegacyRegex = page => page.evaluate(() => {
        window.__legacyRegexRuns = 0;
        const original = String.prototype.replace;
        String.prototype.replace = function (pattern, ...rest) {
          if (pattern instanceof RegExp && pattern.source.includes('bludgeoning')) window.__legacyRegexRuns++;
          return original.call(this, pattern, ...rest);
        };
      });
      const regexRuns = page => page.evaluate(() => window.__legacyRegexRuns);

      test('a 250 KB string is rejected without ever reaching the regex, and quickly', async ({ page }) => {
        await spyOnLegacyRegex(page);
        await script(page, [[6, 3]]);
        const raw = '1d8+3 ' + 'fire '.repeat(50000) + 'x';
        const started = Date.now();
        expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: raw } })).toBe('0 | 0 slashing');
        expect(Date.now() - started).toBeLessThan(5000);
        expect(await regexRuns(page)).toBe(0);
        expect(await unscriptedDiceLeft(page)).toBe(1);
        const unreadable = warnings.filter(w => /could not read dice notation/.test(w));
        expect(unreadable).toHaveLength(1);
        expect(unreadable[0]).toContain('250007 characters'); // named, but not echoed in full
        expect(unreadable[0].length).toBeLessThan(300);
      });

      test('the limit is the engine\'s: 200 characters is cleaned and rolled, 201 is not', async ({ page }) => {
        await spyOnLegacyRegex(page);
        const at200 = '1d8+3' + ' fire'.repeat(39); // exactly 200
        expect(at200).toHaveLength(200);
        await script(page, [[8, 5]]);
        expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: at200 } })).toBe('8 | 1d8+3 = [5]+3 = 8 slashing');
        expect(await regexRuns(page)).toBeGreaterThan(0); // control: the spy does see the regex run

        const runsBefore = await regexRuns(page);
        await script(page, [[8, 5]]);
        expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: at200 + ' ' } })).toBe('0 | 0 slashing'); // 201
        expect(await regexRuns(page)).toBe(runsBefore); // no further regex run
        expect(await unscriptedDiceLeft(page)).toBe(1);
      });
    });

    test.describe('a critical hit at the dice limit', () => {
      test('500 dice double to the maximum of 1000 and roll', async ({ page }) => {
        const text = await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '500d6' }, type: 'critical' });
        expect(text).toMatch(/^\d+ \| 1000d6\+0 = \[/);
      });

      test('501 dice would double past the limit: the crit is refused, not rolled as normal damage', async ({ page }) => {
        await script(page, [[6, 3]]);
        expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '501d6' }, type: 'critical' })).toBe('0 | 0 slashing CRIT!');
        expect(await unscriptedDiceLeft(page)).toBe(1); // nothing was rolled
        expect(warnings.some(w => /critical hit on "501d6" would pass the 1000-dice limit/.test(w))).toBe(true);
      });

      test('the same 501 dice as a normal hit still roll', async ({ page }) => {
        const text = await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '501d6' } });
        expect(text).toMatch(/^\d+ \| 501d6\+0 = \[/);
      });
    });

    test('the engine itself still rejects the raw legacy string', async ({ page }) => {
      const raw = await page.evaluate(() => ({
        single: DiceEngine.parseDiceNotation('1d8+3 slashing'),
        expression: DiceEngine.parseDiceExpression('1d8+3 slashing'),
        rolled: DiceEngine.rollDiceNotation('1d8+3 slashing'),
        clean: DiceEngine.parseDiceNotation('1d8+3')
      }));
      expect(raw).toMatchObject({ single: null, expression: null, rolled: null });
      expect(raw.clean).toMatchObject({ count: 1, sides: 8, modifier: 3 });
    });
  });

  test('a huge damage notation is rejected instantly and rolls no dice', async ({ page }) => {
    await script(page, [[6, 3]]);
    const started = Date.now();
    expect(await combatRoll(page, { kind: 'damage', attack: { ...sword, damage: '99999999d6' } })).toBe('0 | 0 slashing');
    expect(Date.now() - started).toBeLessThan(2000);
    expect(await unscriptedDiceLeft(page)).toBe(1);
  });

  test('hit dice from a saved count beyond the limit are refused, not rolled', async ({ page }) => {
    const errors = watchErrors(page);
    const dialogs = [];
    page.on('dialog', async d => {
      dialogs.push(d.message());
      if (d.type() === 'prompt') await d.accept('5000');
      else await d.dismiss();
    });
    await page.evaluate(() => {
      const el = document.getElementById('charHitDiceRemaining');
      el.value = '9999d8';
      document.getElementById('charCurrentHP').value = '3';
      document.getElementById('charMaxHP').value = '30';
    });
    await page.evaluate(() => document.getElementById('combatHitDiceBtn').click());
    await expect.poll(() => dialogs.some(m => /Too many hit dice/.test(m))).toBe(true);
    expect(await page.evaluate(() => document.getElementById('charCurrentHP').value)).toBe('3'); // no healing
    expect(await page.evaluate(() => document.getElementById('charHitDiceRemaining').value)).toBe('9999d8');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('dice limits in the other callers', () => {
  test('the Initiative Tracker box rejects a huge expression quickly and rolls nothing', async ({ page }) => {
    await installDice(page);
    await page.addInitScript(() => localStorage.setItem('initiativeHelpSeen', '1'));
    await page.goto('/initiative.html');
    const dialogs = [];
    page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
    await script(page, [[6, 3]]);
    const started = Date.now();
    for (const huge of ['99999999d6', '1001d6', '1d1000001', '2d6+1001d6', '1d6' + '+1'.repeat(150), Array(200).fill('1000d6').join('+')]) {
      await page.fill('#custom-dice-input', huge);
      await page.click('#roll-custom-dice');
    }
    expect(Date.now() - started).toBeLessThan(5000);
    expect(dialogs).toHaveLength(6);
    expect(dialogs.every(m => /Invalid format/.test(m))).toBe(true);
    expect(await unscriptedDiceLeft(page)).toBe(1);
    await expect(page.locator('#dice-result')).toHaveText('');
  });

  test('the Character Sheet returns null for a huge notation and logs nothing', async ({ page }) => {
    await installDice(page);
    await page.goto('/characters.html');
    await page.waitForFunction(() => typeof window.rollDice === 'function');
    const before = await page.evaluate(() => window.rollHistory.length);
    const started = Date.now();
    expect(await page.evaluate(() => window.rollDice('99999999d6', 'x'))).toBeNull();
    expect(Date.now() - started).toBeLessThan(2000);
    expect(await page.evaluate(() => window.rollHistory.length)).toBe(before);
  });

  test.describe('Character Sheet hit-dice count', () => {
    // Opens the hit-dice modal (a short rest does it) for a saved pool such as "3d8".
    async function openHitDiceModal(page, pool) {
      await page.goto('/characters.html');
      await page.waitForFunction(() => typeof window.rollDice === 'function');
      await page.evaluate(p => { document.getElementById('charHitDiceRemaining').value = p; }, pool);
      await page.evaluate(() => document.getElementById('shortRestBtn').click());
      await page.waitForSelector('#hitDiceModal.show');
    }
    const rollWith = async (page, count) => {
      await page.fill('#hdSpendCount', count);
      await page.evaluate(() => document.getElementById('hdRollBtn').click());
    };

    // A blank field parses to NaN, which used to slip past the bounds check and show the wrong message.
    // (A type=number input cannot hold non-numeric text: the browser turns it into a blank value.)
    test('a blank count is "invalid", not "too many", and nothing is rolled', async ({ page }) => {
      const errors = watchErrors(page);
      await openHitDiceModal(page, '3d8');
      await rollWith(page, '');
      await expect(page.locator('#appToastBody')).toContainText('Invalid number of hit dice');
      await expect(page.locator('#appToastBody')).not.toContainText('Too many');
      await expect(page.locator('#hdRollResults')).toBeHidden();
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('a valid count still rolls and shows the healing', async ({ page }) => {
      const errors = watchErrors(page);
      await openHitDiceModal(page, '3d8');
      await rollWith(page, '2');
      await expect(page.locator('#hdRollResults')).toBeVisible();
      await expect(page.locator('#hdTotalHealing')).toHaveText(/^\+\d+ HP$/);
      await expect(page.locator('#hdRollDetails')).toHaveText(/^\[\d+\+\d+, \d+\+\d+\]$/); // two dice
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('zero and a count above the saved pool are "invalid", not "too many"', async ({ page }) => {
      await openHitDiceModal(page, '3d8');
      await rollWith(page, '0');
      await expect(page.locator('#appToastBody')).toContainText('Invalid number of hit dice');
      await rollWith(page, '4');
      await expect(page.locator('#appToastBody')).toContainText('Invalid number of hit dice');
      await expect(page.locator('#hdRollResults')).toBeHidden();
    });

    test('a huge saved pool still gets the over-limit message', async ({ page }) => {
      await openHitDiceModal(page, '5000d8');
      await rollWith(page, '5000');
      await expect(page.locator('#appToastBody')).toContainText('Too many hit dice');
      await expect(page.locator('#hdRollResults')).toBeHidden();
    });
  });

  test('the Character Sheet hit-dice roll refuses a saved count beyond the limit', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/characters.html');
    await page.waitForFunction(() => typeof window.rollDice === 'function');
    await page.evaluate(() => { document.getElementById('charHitDiceRemaining').value = '5000d8'; });
    await page.evaluate(() => document.getElementById('shortRestBtn').click()); // opens the hit-dice modal
    await page.waitForSelector('#hitDiceModal.show');
    await page.fill('#hdSpendCount', '5000');
    await page.evaluate(() => document.getElementById('hdRollBtn').click());
    await expect(page.locator('#appToastBody')).toContainText('Too many hit dice');
    await expect(page.locator('#hdRollResults')).toBeHidden(); // nothing was rolled or offered to apply
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
