import { test, expect } from '@playwright/test';

// Real-browser flows for Combat Mode, the card view on characters.html (implemented in
// js/character/combat-mode.js): startup and load order, the card, hit points, rolls from the card, death
// saves and hit dice. The dice rules themselves are covered in dice-callers.spec.js; here the dice are
// scripted only to make the flows deterministic.

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
  charInitMod: '3', saveStrBonus: '5', statDex: '14', statCon: '14' // statDex 14 gives the +2 Dexterity modifier
};

// Loads the page and waits until both the character module and the Combat Mode script are ready.
async function loadPage(page) {
  await installDice(page);
  await page.goto('/characters.html');
  await page.waitForFunction(() =>
    typeof window.getAttackFeatureBonuses === 'function' && typeof window.triggerActionEconomy === 'function');
  // With no saved character the page offers "new character" in a modal that blocks clicks. Choosing a blank
  // sheet dismisses it for good (it would otherwise reopen) and gives Combat Mode a current character.
  await page.locator('#chooseBlankBtn').click({ timeout: 8000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
}
// Fills the sheet fields the card reads, then switches Combat Mode on the way a user would.
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
const historyLength = page => page.evaluate(() => window.rollHistory.length);
const latestRoll = page => page.evaluate(() => window.rollHistory[0]);
const value = (page, id) => page.evaluate(i => document.getElementById(i).value, id);
const text = (page, id) => page.evaluate(i => document.getElementById(i).textContent.trim(), id);

test.describe('Combat Mode: startup', () => {
  // Execution: these functions exist on window only if combat-mode.js ran its startup to the end. That is
  // separate from the test below, which checks that the file was fetched and where it sits in the page.
  test('the Combat Mode script is running: its public surface is on window', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    const surface = await page.evaluate(() => Object.fromEntries([
      'triggerActionEconomy', 'updateActionTracker', 'handleCombatHP', 'rollSpellDice', 'executeCast',
      'showUpcastModal', 'getAvailableSlotLevels', 'parseSpellRollInfo', 'detectSpellActionType'
    ].map(name => [name, typeof window[name]])));
    expect(surface).toEqual({
      triggerActionEconomy: 'function', updateActionTracker: 'function', handleCombatHP: 'function',
      rollSpellDice: 'function', executeCast: 'function', showUpcastModal: 'function',
      getAvailableSlotLevels: 'function', parseSpellRollInfo: 'function', detectSpellActionType: 'function'
    });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('/js/character/combat-mode.js loads at its place in the script order and initializes', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    const loaded = await page.evaluate(() => {
      const entry = performance.getEntriesByType('resource').find(e => /\/js\/character\/combat-mode\.js$/.test(e.name));
      const scripts = [...document.scripts].map(s => (s.getAttribute('src') || '(inline)') + (s.type === 'module' ? ' [module]' : ''));
      return {
        fetched: !!entry,
        order: scripts.filter(s => /combat-mode|character\.js|level-up-system|multiclass-ui/.test(s)),
        initialized: typeof window.triggerActionEconomy === 'function'
      };
    });
    expect(loaded.fetched).toBe(true);
    // Document order: combat-mode.js is the last of these tags, after the module (character.js) and the
    // deferred multiclass-ui.js. It still runs first among them: it is a plain parser-blocking script,
    // while the module and deferred scripts wait until the page has been parsed.
    expect(loaded.order).toEqual([
      '/js/character/level-up-system.js', '/js/character/character.js [module]', '/js/character/multiclass-ui.js',
      '/js/character/combat-mode.js'
    ]);
    expect(loaded.initialized).toBe(true); // and its startup ran (the full public surface is checked above)
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the mode toggle is wired: on and off change the page, and the choice is remembered', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    expect(await page.evaluate(() => localStorage.getItem('dmCombatMode'))).toBe('true');

    await page.evaluate(() => {
      const t = document.getElementById('dmCombatModeToggle');
      t.checked = false;
      t.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('body')).not.toHaveClass(/combat-mode/);
    expect(await page.evaluate(() => localStorage.getItem('dmCombatMode'))).toBe('false');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  // Startup runs once when the script loads. Opening and closing Combat Mode again must not rebind or
  // reinitialize anything, or every action would run several times.
  test('switching the mode off and on repeatedly does not multiply what a click does', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const t = document.getElementById('dmCombatModeToggle');
        for (const on of [false, true]) { t.checked = on; t.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    }
    await expect(page.locator('body')).toHaveClass(/combat-mode/);

    await page.click('#combatHPBox');
    await page.fill('#combatHPAdjAmount', '6');
    await page.click('[data-combat-hp="damage"]');
    expect(await value(page, 'charCurrentHP')).toBe('21'); // once, not once per toggle
    await page.click('#combatCharName'); // close the HP panel, which covers the initiative box

    const before = await historyLength(page);
    await script(page, [[20, 8]]);
    await page.click('#combatInitiativeBox');
    expect(await historyLength(page)).toBe(before + 1);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a saved "on" state is restored on reload, before the data is refreshed', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page);
    await page.reload();
    await expect(page.locator('body')).toHaveClass(/combat-mode/); // applied immediately by the startup code
    await expect(page.locator('#dmCombatModeToggle')).toBeChecked();
    await page.waitForFunction(() => typeof window.triggerActionEconomy === 'function');
  });
});

test.describe('Combat Mode: the card', () => {
  test('shows the sheet data when Combat Mode opens', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page);
    expect(await text(page, 'combatCharName')).toBe('Testa Brightblade');
    expect(await text(page, 'combatAC')).toBe('17');
    expect(await text(page, 'combatCurrentHP')).toBe('27');
    expect(await text(page, 'combatMaxHP')).toBe('40');
    expect(await text(page, 'combatLevel')).toBe('5');
  });

  test('follows later sheet edits (the document input listener, debounced)', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page);
    await page.evaluate(() => {
      const el = document.getElementById('charCurrentHP');
      el.value = '12';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect.poll(() => text(page, 'combatCurrentHP')).toBe('12');
  });

  test('adding a condition shows it on the card and marks the sheet button', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    await page.evaluate(() => document.querySelector('#combatAddConditionMenu [data-add-condition="Prone"]').click());
    await expect(page.locator('#combatConditions')).toContainText('Prone');
    await expect(page.locator('.condition-btn[data-condition="Prone"]')).toHaveClass(/active/);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Combat Mode: hit points', () => {
  test('damage, healing (Enter key) and temp HP change the sheet and the card once each', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    await page.click('#combatHPBox');
    await expect(page.locator('#combatHPControls')).toBeVisible();

    await page.fill('#combatHPAdjAmount', '6');
    await page.click('[data-combat-hp="damage"]');
    expect(await value(page, 'charCurrentHP')).toBe('21'); // once: not 15
    expect(await text(page, 'combatCurrentHP')).toBe('21');

    await page.fill('#combatHPAdjAmount', '4');
    await page.press('#combatHPAdjAmount', 'Enter'); // Enter heals
    expect(await value(page, 'charCurrentHP')).toBe('25');

    await page.fill('#combatHPAdjAmount', '5');
    await page.click('[data-combat-hp="temp"]');
    expect(await value(page, 'charTempHP')).toBe('5');
    await expect(page.locator('#combatTempHP')).toHaveText('5');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('temp HP absorbs damage first', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page, { ...SHEET, charTempHP: '5' });
    await page.click('#combatHPBox');
    await page.fill('#combatHPAdjAmount', '8');
    await page.click('[data-combat-hp="damage"]');
    expect(await value(page, 'charTempHP')).toBe('0');
    expect(await value(page, 'charCurrentHP')).toBe('24'); // 8 damage: 5 from temp, 3 from HP
  });

  test('clicking outside closes the HP controls (the document click listener)', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page);
    await page.click('#combatHPBox');
    await expect(page.locator('#combatHPControls')).toBeVisible();
    await page.click('#combatCharName');
    await expect(page.locator('#combatHPControls')).toBeHidden();
  });

  test('an empty or zero amount changes nothing', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page);
    await page.click('#combatHPBox');
    await page.fill('#combatHPAdjAmount', '');
    await page.click('[data-combat-hp="damage"]');
    await page.fill('#combatHPAdjAmount', '0');
    await page.click('[data-combat-hp="heal"]');
    expect(await value(page, 'charCurrentHP')).toBe('27');
  });
});

test.describe('Combat Mode: rolls from the card', () => {
  test('initiative: one click, one roll, one history entry', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    const before = await historyLength(page);
    await script(page, [[20, 14]]);
    await page.click('#combatInitiativeBox');
    expect(await historyLength(page)).toBe(before + 1); // listeners are bound once
    expect(await latestRoll(page)).toMatchObject({ description: 'Initiative', notation: '1d20', rolls: [14], modifier: 3, total: 17 });
    await expect(page.locator('#combatInitiativeBox .combat-stat-value')).toContainText('17');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a saving throw: normal, Shift for advantage, Ctrl for disadvantage', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page);
    const before = await historyLength(page);
    await script(page, [[20, 9]]);
    await page.click('#combatSaveStrBox');
    expect(await latestRoll(page)).toMatchObject({ description: 'Strength Save', rolls: [9], modifier: 5, total: 14 });

    await script(page, [[20, 4], [20, 16]]);
    await page.click('#combatSaveStrBox', { modifiers: ['Shift'] });
    expect(await latestRoll(page)).toMatchObject({ description: 'Strength Save (Adv)', rolls: [4, 16], chosen: 16, total: 21, isAdvantage: true });

    await script(page, [[20, 4], [20, 16]]);
    await page.click('#combatSaveStrBox', { modifiers: ['Control'] });
    expect(await latestRoll(page)).toMatchObject({ description: 'Strength Save (Disadv)', chosen: 4, total: 9, isDisadvantage: true });
    expect(await historyLength(page)).toBe(before + 3);
  });

  test('an ability check uses the modifier', async ({ page }) => {
    await loadPage(page);
    await enterCombatMode(page);
    await script(page, [[20, 11]]);
    await page.click('.combat-ability-box[data-ability="Dex"]');
    expect(await latestRoll(page)).toMatchObject({ description: 'Dexterity Check', rolls: [11], modifier: 2, total: 13 });
  });

  test('a skill check from the skills grid', async ({ page }) => {
    const errors = watchErrors(page);
    await loadPage(page);
    await enterCombatMode(page);
    await page.waitForSelector('#combatSkillsGrid .combat-skill-btn');
    const before = await historyLength(page);
    await script(page, [[20, 10]]);
    await page.locator('#combatSkillsGrid .combat-skill-btn').first().click();
    expect(await historyLength(page)).toBe(before + 1);
    expect(await latestRoll(page)).toMatchObject({ notation: '1d20', rolls: [10] });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Combat Mode: death saves and hit dice', () => {
  // Answers alerts and prompts, and records what was shown.
  const answerDialogs = (page, promptAnswer = null) => {
    const shown = [];
    page.on('dialog', async d => {
      shown.push({ type: d.type(), message: d.message() });
      if (d.type() === 'prompt') await d.accept(promptAnswer ?? '');
      else await d.accept();
    });
    return shown;
  };

  test('a death save marks a success or a failure, reports it once, and logs it', async ({ page }) => {
    const errors = watchErrors(page);
    const shown = answerDialogs(page);
    await loadPage(page);
    await enterCombatMode(page, { ...SHEET, charCurrentHP: '0' });
    const before = await historyLength(page);

    await script(page, [[20, 12]]);
    await page.click('#combatDeathSaveBtn');
    await expect(page.locator('#deathSaveSuccess1')).toBeChecked();
    expect(shown).toHaveLength(1); // one alert for one click
    expect(shown[0].message).toContain('Rolled 12 - Success (1/3)');
    expect(await latestRoll(page)).toMatchObject({ description: 'Death Save', rolls: [12], total: 12 });

    await script(page, [[20, 5]]);
    await page.click('#combatDeathSaveBtn');
    await expect(page.locator('#deathSaveFailure1')).toBeChecked();
    expect(shown[1].message).toContain('Rolled 5 - Failure (1/3)');
    expect(await historyLength(page)).toBe(before + 2);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a natural 20 on a death save brings you back to 1 HP and clears the saves', async ({ page }) => {
    const shown = answerDialogs(page);
    await loadPage(page);
    await enterCombatMode(page, { ...SHEET, charCurrentHP: '0' });
    await page.evaluate(() => { document.getElementById('deathSaveFailure1').checked = true; });
    await script(page, [[20, 20]]);
    await page.click('#combatDeathSaveBtn');
    await expect.poll(() => value(page, 'charCurrentHP')).toBe('1');
    await expect(page.locator('#deathSaveFailure1')).not.toBeChecked();
    expect(shown[0].message).toContain('Natural 20');
  });

  test('hit dice: spending 2 of 3 rolls them, heals, and updates what is left', async ({ page }) => {
    const errors = watchErrors(page);
    const shown = answerDialogs(page, '2');
    await loadPage(page);
    await enterCombatMode(page, { ...SHEET, charCurrentHP: '5' });
    await page.evaluate(() => {
      const el = document.getElementById('charHitDiceRemaining');
      el.value = '3d8';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const before = await historyLength(page);
    await script(page, [[8, 4], [8, 6]]);
    await page.click('#combatHitDiceBtn');
    await expect.poll(() => value(page, 'charCurrentHP')).toBe('19'); // 5 + (4+2) + (6+2)
    expect(await value(page, 'charHitDiceRemaining')).toBe('1d8');
    expect(await latestRoll(page)).toMatchObject({ rolls: [4, 6], modifier: 4 });
    expect(await historyLength(page)).toBe(before + 1);
    expect(shown.find(d => d.type === 'prompt')).toBeTruthy();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('hit dice with none left explain why and change nothing', async ({ page }) => {
    const shown = answerDialogs(page);
    await loadPage(page);
    await enterCombatMode(page, { ...SHEET, charCurrentHP: '5' });
    await page.evaluate(() => { document.getElementById('charHitDiceRemaining').value = '0d8'; });
    await page.click('#combatHitDiceBtn');
    await expect.poll(() => shown.length).toBe(1);
    expect(shown[0].message).toMatch(/No hit dice remaining/);
    expect(await value(page, 'charCurrentHP')).toBe('5');
  });
});
