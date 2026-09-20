import { test, expect } from '@playwright/test';
import {
  watchErrors, installHydrationCounter, loadSheet, readPersisted, seedPersisted, saveViaButton, currentId,
  setSheetFields, readShown,
} from '../helpers/character-sheet.js';

// Regressions for the character sheet's live derived values and for multiclass state.
// classes[] plus multiclass are the record; the class field is text derived from them.

const reload = async page => { await page.reload(); await loadSheet(page, { blank: false }); };

// Opens the multiclass dialog and waits until its fade-in has finished (Bootstrap ignores hide() before that).
const openMulticlassDialog = page => page.evaluate(() => new Promise(resolve => {
  document.getElementById('multiclassModal').addEventListener('shown.bs.modal', () => resolve(), { once: true });
  document.getElementById('manageMulticlassBtn').click();
}));

const dialogRows = page => page.evaluate(() => [...document.querySelectorAll('#multiclassClassList .card')].map(card => ({
  className: card.querySelector('[data-field="className"]').value,
  subclass: card.querySelector('[data-field="subclass"]').value,
  level: card.querySelector('[data-field="level"]').value,
})));

const classShape = rec => ({
  multiclass: rec.multiclass, charClass: rec.charClass, subclass: rec.subclass, subclassLevel: rec.subclassLevel,
  level: rec.level, classes: rec.classes,
});

const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
const MULTI_CLASSES = [
  { className: 'Cleric', subclass: 'Life Domain', level: 2, subclassLevel: 1 },
  { className: 'Wizard', subclass: 'Evocation', level: 3, subclassLevel: 2 },
];
const multiRecord = () => ({
  id: 'multi-1', name: 'Two Classes', charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1, level: 5,
  multiclass: true, classes: MULTI_CLASSES.map(c => ({ ...c })), stats,
});
const singleRecord = () => ({
  id: 'single-1', name: 'One Wizard', charClass: 'Wizard', subclass: 'Evocation', subclassLevel: 2, level: 5,
  multiclass: false, classes: [], stats,
});

async function seedAndLoad(page, record) {
  await loadSheet(page, { blank: true });
  await seedPersisted(page, [record]);
  await reload(page);
}

test.describe('Passive Investigation and Insight while editing', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  // Level 5 (proficiency +3). Each case sets a baseline, then makes ONE ability edit and nothing else.
  const cases = [
    { skill: 'Investigation', stat: 'statInt', passive: 'charPassiveInvestigation', key: 'investigation', sense: 'passiveInvestigation' },
    { skill: 'Insight', stat: 'statWis', passive: 'charPassiveInsight', key: 'insight', sense: 'passiveInsight' },
  ];
  const variants = [
    { name: 'not proficient', fields: {}, extra: 0 },
    { name: 'proficient', fields: { prof: true }, extra: 3 },
    { name: 'expertise', fields: { prof: true, exp: true }, extra: 6 },
    { name: 'Jack of All Trades', fields: { joat: true }, extra: 1 }, // half of +3, rounded down
  ];

  for (const c of cases) {
    for (const v of variants) {
      test(`${c.stat} edit updates ${c.skill} and passive ${c.skill} at once (${v.name}), and the next save stores them`, async ({ page }) => {
        const errors = watchErrors(page);
        await loadSheet(page, { blank: true });
        await setSheetFields(page, {
          charLevel: '5', statStr: '10', statDex: '10', statCon: '10', statInt: '10', statWis: '10', statCha: '10',
          [`skill${c.skill}Prof`]: !!v.fields.prof, [`skill${c.skill}Exp`]: !!v.fields.exp, skillJoAT: !!v.fields.joat,
        });
        expect(await readShown(page, c.passive), 'baseline passive').toBe(String(10 + v.extra));

        await setSheetFields(page, { [c.stat]: '18' }); // +4: the only edit

        const bonus = 4 + v.extra;
        expect(await readShown(page, `skill${c.skill}Bonus`), `${c.skill} bonus right after the edit`).toBe(String(bonus));
        expect(await readShown(page, c.passive), `passive ${c.skill} right after the edit`).toBe(String(10 + bonus));

        const saved = await saveViaButton(page, await currentId(page)); // no other action
        expect(saved.skills[c.key].bonus, `persisted ${c.skill} bonus`).toBe(bonus);
        expect(saved.senses[c.sense], `persisted passive ${c.skill}`).toBe(10 + bonus);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }
  }

  test('a level edit that changes the proficiency bonus refreshes the skills and the passives', async ({ page }) => {
    await loadSheet(page, { blank: true });
    await setSheetFields(page, { charLevel: '4', statInt: '18', statWis: '18', skillInvestigationProf: true, skillInsightProf: true });
    expect(await readShown(page, 'charPassiveInvestigation')).toBe('16'); // 10 + 4 + 2
    await setSheetFields(page, { charLevel: '5' });
    expect(await readShown(page, 'skillInvestigationBonus')).toBe('7');
    expect(await readShown(page, 'charPassiveInvestigation')).toBe('17');
    expect(await readShown(page, 'charPassiveInsight')).toBe('17');
    expect(await readShown(page, 'charPassivePerception'), 'passive Perception follows the same edit').toBe('14'); // 10 + WIS +4, not proficient
  });

  test('typing a Perception bonus by hand is not overwritten by the other skills recalculating', async ({ page }) => {
    await loadSheet(page, { blank: true });
    await setSheetFields(page, { charLevel: '5', statWis: '10' });
    await setSheetFields(page, { skillPerceptionBonus: '9', skillStealthBonus: '7' });
    expect(await readShown(page, 'charPassivePerception')).toBe('19');
    expect(await readShown(page, 'skillStealthBonus'), 'another typed bonus is left alone by the Perception edit').toBe('7');
  });
});

test.describe('Multiclass dialog and a single-class subclass', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  test('opening and applying the dialog keeps a single class\'s subclass, through save and reopen', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, singleRecord());
    const before = classShape((await readPersisted(page))[0]);

    await openMulticlassDialog(page);
    expect(await dialogRows(page), 'the class row carries the subclass').toEqual([{ className: 'Wizard', subclass: 'Evocation', level: '5' }]);
    await page.evaluate(() => document.getElementById('applyMulticlassBtn').click());
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);

    const saved = await saveViaButton(page, 'single-1');
    expect(classShape(saved), 'nothing about the class changed').toStrictEqual(before);
    expect(await readShown(page, 'charClass')).toBe('Wizard (Evocation)');

    await openMulticlassDialog(page);
    expect(await dialogRows(page), 'the subclass is still there when the dialog is reopened').toEqual([{ className: 'Wizard', subclass: 'Evocation', level: '5' }]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a single class without a subclass stays single-class and gains no classes[]', async ({ page }) => {
    const record = singleRecord();
    Object.assign(record, { charClass: 'Fighter', subclass: '', subclassLevel: 0 });
    await seedAndLoad(page, record);
    await openMulticlassDialog(page);
    await page.evaluate(() => document.getElementById('applyMulticlassBtn').click());
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    const saved = await saveViaButton(page, 'single-1');
    expect(classShape(saved)).toStrictEqual({ multiclass: false, charClass: 'Fighter', subclass: '', subclassLevel: 0, level: 5, classes: [] });
  });

  test('splitting a single class with a subclass in the dialog keeps the subclass on its class', async ({ page }) => {
    await seedAndLoad(page, singleRecord());
    await openMulticlassDialog(page);
    const setEntry = (index, field, value) => page.evaluate(([i, f, v]) => {
      const el = document.querySelector(`#multiclassClassList [data-index="${i}"][data-field="${f}"]`);
      el.value = v; el.dispatchEvent(new Event('change', { bubbles: true }));
    }, [index, field, value]);
    await setEntry(0, 'level', '3');
    await page.evaluate(() => document.getElementById('addMulticlassBtn').click());
    await setEntry(1, 'className', 'Cleric');
    await setEntry(1, 'level', '2');
    await page.evaluate(() => document.getElementById('applyMulticlassBtn').click());
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    await expect.poll(async () => (await readPersisted(page))[0].multiclass).toBe(true);
    const stored = (await readPersisted(page))[0];
    expect(stored.classes.map(c => [c.className, c.subclass, c.level, c.subclassLevel])).toEqual([['Wizard', 'Evocation', 3, 2], ['Cleric', '', 2, 0]]);
    expect([stored.charClass, stored.subclass, stored.subclassLevel]).toEqual(['Wizard', 'Evocation', 2]);
  });
});

test.describe('Level-up on a multiclass character', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  // Drives the real level-up modal for the named class and confirms it. The level-up reloads the sheet from the
  // character and calls save while that reload is still in progress, and the app skips such a save; so the tests
  // wait for the reload to finish and press Save themselves.
  async function levelUp(page, className) {
    const loadedBefore = await page.evaluate(() => window.__characterLoaded);
    // Bootstrap ignores hide() until the fade-in has finished, so wait for the modal's shown event
    await page.evaluate(name => new Promise(resolve => {
      document.addEventListener('shown.bs.modal', e => { if (e.target.id === 'levelUpModal') resolve(); });
      window.LevelUpSystem.startLevelUp(window.getCurrentCharacter(), name);
    }), className);
    await page.evaluate(() => document.getElementById('hpMethodAverage').click());
    // pick spells until the modal accepts, when the class learns any at this level
    await page.evaluate(() => {
      const modalEl = document.getElementById('levelUpModal');
      const confirm = modalEl.querySelector('#confirmLevelUpBtn');
      for (let i = 0; i < 6 && confirm.disabled; i++) {
        const next = modalEl.querySelector('#availableSpellsList [data-spell-name]:not(.text-white)');
        if (!next) break;
        next.click();
      }
    });
    await expect(page.locator('#confirmLevelUpBtn')).toBeEnabled();
    await page.evaluate(() => document.getElementById('confirmLevelUpBtn').click());
    await expect(page.locator('.modal-backdrop')).toHaveCount(0, { timeout: 10000 });
    await page.waitForFunction(n => window.__characterLoaded > n, loadedBefore);
  }

  const summary = rec => ({
    level: rec.level, multiclass: rec.multiclass, charClass: rec.charClass, subclass: rec.subclass,
    classes: rec.classes.map(c => [c.className, c.subclass, c.level, c.subclassLevel]),
  });

  test('levelling the second class raises that class only, and the result survives a reload', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, multiRecord());
    await levelUp(page, 'Wizard');

    const expected = {
      level: 6, multiclass: true, charClass: 'Cleric', subclass: 'Life Domain',
      classes: [['Cleric', 'Life Domain', 2, 1], ['Wizard', 'Evocation', 4, 2]],
    };
    expect(summary(await saveViaButton(page, 'multi-1')), 'the save right after the level-up').toEqual(expected);
    await reload(page);
    expect(await readShown(page, 'charClass')).toBe('Cleric (Life Domain) / Wizard (Evocation)');
    expect(await readShown(page, 'charLevel')).toBe('6');
    expect(summary(await saveViaButton(page, 'multi-1')), 'a save after the reload changes nothing').toEqual(expected);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('levelling the first class raises that class only, and the result survives a reload', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, multiRecord());
    await levelUp(page, 'Cleric');

    const expected = {
      level: 6, multiclass: true, charClass: 'Cleric', subclass: 'Life Domain',
      classes: [['Cleric', 'Life Domain', 3, 1], ['Wizard', 'Evocation', 3, 2]],
    };
    expect(summary(await saveViaButton(page, 'multi-1')), 'the save right after the level-up').toEqual(expected);
    await reload(page);
    expect(summary(await saveViaButton(page, 'multi-1'))).toEqual(expected);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the level-up for a class that is not on the character is refused and changes nothing', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    page.on('dialog', d => d.dismiss());
    await page.evaluate(() => window.LevelUpSystem.startLevelUp(window.getCurrentCharacter(), 'Rogue'));
    await expect(page.locator('#levelUpModal')).toHaveCount(0);
    expect(summary((await readPersisted(page))[0]).classes).toEqual(MULTI_CLASSES.map(c => [c.className, c.subclass, c.level, c.subclassLevel]));
  });

  test('a single-class character still levels up normally', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, singleRecord());
    await levelUp(page, undefined);
    const expected = { level: 6, multiclass: false, charClass: 'Wizard', subclass: 'Evocation', classes: [] };
    expect(summary(await saveViaButton(page, 'single-1')), 'the save right after the level-up').toEqual(expected);
    await reload(page);
    expect(summary(await saveViaButton(page, 'single-1'))).toEqual(expected);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Manual class-field edits', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  const rejected = [
    ['a trailing separator', 'Cleric (Life Domain) /'],
    ['a trailing separator after the first class alone', 'Cleric /'],
    ['an empty secondary entry', 'Cleric (Life Domain) / / Wizard (Evocation)'],
    ['a whitespace-only segment', 'Cleric (Life Domain) /    '],
    ['an unclosed subclass', 'Cleric (Life Domain) / Wizard (Evocation'],
    ['a segment that is only a subclass', 'Cleric (Life Domain) / (Evocation)'],
    ['a new class with no level to give it', 'Cleric (Life Domain) / Wizard (Evocation) / Rogue'],
    ['typed levels that do not add up to the character level', 'Cleric (Life Domain) 4 / Wizard (Evocation) 3'],
    ['an empty field', ''],
    ['a lone partial class', 'Cleric ('],
  ];

  for (const [name, text] of rejected) {
    test(`${name} does not change classes[], levels or subclasses`, async ({ page }) => {
      const errors = watchErrors(page);
      await seedAndLoad(page, multiRecord());
      const before = classShape((await readPersisted(page))[0]);
      await setSheetFields(page, { charClass: text });
      const saved = await saveViaButton(page, 'multi-1');
      expect(classShape(saved)).toStrictEqual(before);
      expect(saved.classes.map(c => [c.className, c.subclass, c.level, c.subclassLevel])).toEqual(
        MULTI_CLASSES.map(c => [c.className, c.subclass, c.level, c.subclassLevel]));
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('a rejected edit shows a warning, and a reload shows the stored classes again', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    // the Save button's own "Character saved" toast follows the warning, so record every toast text
    await page.evaluate(() => {
      window.__toasts = [];
      new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => window.__toasts.push(n.textContent.trim()))))
        .observe(document.getElementById('appToastBody'), { childList: true, characterData: true, subtree: true });
    });
    await setSheetFields(page, { charClass: 'Cleric /' });
    await saveViaButton(page, 'multi-1');
    expect((await page.evaluate(() => window.__toasts)).join('|')).toContain('Class field not applied');
    await reload(page);
    expect(await readShown(page, 'charClass')).toBe('Cleric (Life Domain) / Wizard (Evocation)');
  });

  test('a complete edit still applies: levels typed for a new class that add up', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    await setSheetFields(page, { charClass: 'Cleric (Life Domain) / Wizard (Evocation) 2 / Rogue 1' });
    const saved = await saveViaButton(page, 'multi-1');
    expect(saved.classes.map(c => [c.className, c.subclass, c.level, c.subclassLevel])).toEqual([
      ['Cleric', 'Life Domain', 2, 1], ['Wizard', 'Evocation', 2, 2], ['Rogue', '', 1, 0],
    ]);
  });

  test('editing the field of a multiclass character down to one class is rejected, with a warning', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    const before = classShape((await readPersisted(page))[0]);
    await page.evaluate(() => {
      window.__toasts = [];
      new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => window.__toasts.push(n.textContent.trim()))))
        .observe(document.getElementById('appToastBody'), { childList: true, characterData: true, subtree: true });
    });
    for (const text of ['Wizard (Evocation)', 'Cleric']) { // one whole class, and the mid-retype state
      await setSheetFields(page, { charClass: text });
      const saved = await saveViaButton(page, 'multi-1');
      expect(classShape(saved), `"${text}" leaves multiclass, classes[], levels and subclasses as stored`).toStrictEqual(before);
    }
    expect((await page.evaluate(() => window.__toasts)).join('|')).toContain('Manage Multiclass');
    await reload(page);
    expect(await readShown(page, 'charClass')).toBe('Cleric (Life Domain) / Wizard (Evocation)');
  });

  test('the multiclass dialog can still remove a class, leaving a single-class character', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    await openMulticlassDialog(page);
    await page.evaluate(() => document.querySelector('#multiclassClassList [data-action="remove"][data-index="1"]').click());
    await page.evaluate(() => {
      const el = document.querySelector('#multiclassClassList [data-index="0"][data-field="level"]');
      el.value = '5'; el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.evaluate(() => document.getElementById('applyMulticlassBtn').click());
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    await expect.poll(async () => (await readPersisted(page))[0].multiclass).toBe(false);
    const saved = await saveViaButton(page, 'multi-1');
    expect(classShape(saved)).toMatchObject({ multiclass: false, charClass: 'Cleric', subclass: 'Life Domain', level: 5, classes: [] });
  });

  test('a single-class character keeps its class when a slash-joined field has no levels', async ({ page }) => {
    await seedAndLoad(page, singleRecord());
    await setSheetFields(page, { charClass: 'Wizard (Evocation) / Cleric' });
    const saved = await saveViaButton(page, 'single-1');
    expect(classShape(saved)).toStrictEqual({ multiclass: false, charClass: 'Wizard', subclass: 'Evocation', subclassLevel: 2, level: 5, classes: [] });
  });
});
