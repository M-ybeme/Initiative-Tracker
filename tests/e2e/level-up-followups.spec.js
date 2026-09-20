import { test, expect } from '@playwright/test';
import { watchErrors, loadSheet, readPersisted, saveViaButton, setSheetFields, currentId } from '../helpers/character-sheet.js';
import {
  stats, slotsOf, slotMaxes, CLERIC, WIZARD, multiRecord, singleRecord, seedAndLoad, installLevelUpHooks,
  shown, waitShown, openLevelUp, chooseNewClass, fillModal, confirmLevelUp, completeLevelUp, stored, storedAfterLevel,
  dialogsOf, pageErrorsOf, stubStorage, setWritesFailing, releaseWrite, pendingWrites, writeCalls, watchToasts, toastLog,
  toast, dirtyDot, pressSave,
} from '../helpers/level-up-ui.js';

// Level-up follow-ups: the single-class modal switched to Multiclass, a new class with no hit die, mixed hit dice,
// saves finishing after a character switch, legacy resource keys, failure noise, Wild Shape, and the class picker.
// Everything is driven through the real controls; results are read from raw IndexedDB with no Save press.

test.beforeEach(async ({ page }) => { await installLevelUpHooks(page); });

const body = page => page.locator('#levelUpModal .modal-body');
const pickMulticlass = page => page.evaluate(() => document.querySelector('#levelUpModal input[name="multiclassPath"][value="multiclass"]').click());
const pickContinue = page => page.evaluate(() => document.querySelector('#levelUpModal input[name="multiclassPath"][value="continue"]').click());

test.describe('A single-class level-up switched to Multiclass', () => {
  // Fighter 5 -> 6 is an ASI level for the Fighter, and Fighter has no spellcasting
  const fighter = () => singleRecord({
    charClass: 'Fighter', subclass: 'Champion', subclassLevel: 3, level: 5,
    hitDice: '5d10', hitDiceRemaining: '5d10', spellSlots: slotsOf([]),
  });

  test('the Fighter steps go, and the chosen class is what the modal shows and applies; going back restores them', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, fighter());
    await openLevelUp(page);
    await expect(page.locator('#levelUpModal #asiChoiceASI'), 'continuing as a Fighter asks for the level-6 ASI').toHaveCount(1);
    await expect(body(page)).toContainText('Roll 1d10');
    await expect(body(page)).toContainText('Ability Score Improvement');

    await pickMulticlass(page);
    await expect(page.locator('#levelUpModal .modal-header small')).toHaveText('Level 5 → 6: new class');
    await expect(page.locator('#levelUpModal #asiChoiceASI'), 'no Fighter ASI on the new-class path').toHaveCount(0);
    await expect(body(page)).not.toContainText('Ability Score Improvement');
    await expect(page.locator('#hpMethodAverage'), 'no hit die until the class is chosen').toBeDisabled();

    await chooseNewClass(page, 'Wizard');
    await expect(page.locator('#levelUpModal .modal-header small')).toHaveText('Level 5 → 6: new class (Wizard)');
    await expect(page.locator('#hpMethodAverage')).toBeEnabled();
    await expect(body(page)).toContainText('Roll 1d6'); // the Wizard's die, not the Fighter's
    await expect(body(page)).not.toContainText('Roll 1d10');
    await expect(page.locator('#levelUpModal #asiChoiceASI')).toHaveCount(0);
    // a Wizard is a caster: the slot step shows the first slots the multiclass character gets
    await expect(page.locator('#levelUpModal tr:has(th:has-text("After (Level 6)")) td').first()).toHaveText('2');

    await pickContinue(page);
    await expect(page.locator('#levelUpModal #asiChoiceASI'), 'the Fighter progression comes back').toHaveCount(1);
    await expect(body(page)).toContainText('Roll 1d10');
    await expect(page.locator('#levelUpModal .modal-header small')).toHaveText('Fighter 5 → 6');

    // and finishing on the new-class path applies the Wizard, not the Fighter level
    await completeLevelUp(page, { newClass: 'Wizard' });
    const rec = await storedAfterLevel(page, 'single-1', 6);
    expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Fighter', 5], ['Wizard', 1]]);
    expect(rec.stats.str, 'no ASI was applied').toBe(14);
    expect(rec.maxHP, "Wizard d6 average (4), not the Fighter's d10 (6)").toBe(34);
    expect(slotMaxes(rec)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(rec.features || '', 'no Fighter level-6 features were added').not.toContain('Ability Score Improvement');
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  test('the spell-learning step of a caster goes when it switches to a class that is added', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, singleRecord()); // Wizard 5 -> 6 learns spells
    await openLevelUp(page);
    await expect(page.locator('#levelUpModal #availableSpellsList')).toHaveCount(1);
    await pickMulticlass(page);
    await expect(page.locator('#levelUpModal #availableSpellsList'), 'no Wizard spells for a class that is not the Wizard').toHaveCount(0);
    await chooseNewClass(page, 'Fighter');
    await expect(page.locator('#levelUpModal #availableSpellsList')).toHaveCount(0);
    await expect(body(page)).toContainText('Roll 1d10');
    await pickContinue(page);
    await expect(page.locator('#levelUpModal #availableSpellsList')).toHaveCount(1);
  });

  test('an HP method already picked survives the switch when it still applies', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await openLevelUp(page);
    await pickMulticlass(page);
    await chooseNewClass(page, 'Rogue'); // d8
    await page.evaluate(() => document.getElementById('hpMethodAverage').click());
    await expect(page.locator('#hpBadge')).toHaveText('+5 HP');
    await chooseNewClass(page, 'Fighter'); // d10: the picked method follows the new die
    await expect(page.locator('#hpBadge')).toHaveText('+6 HP');
  });
});

test.describe('A new class with no hit-die data', () => {
  const defineMystic = page => page.evaluate(() => { window.LevelUpData.CLASS_DATA.Mystic = { name: 'Mystic', features: {}, spellcaster: false }; });

  test('no die is guessed: HP is entered by hand and the level-up completes and is stored', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, singleRecord()); // Wizard d6, 5d6
    await defineMystic(page);
    await openLevelUp(page);
    await pickMulticlass(page);
    await chooseNewClass(page, 'Mystic');

    await expect(page.locator('#hpNoHitDie')).toContainText('Hit-die data is not available for Mystic');
    await expect(page.locator('#hpMethodAverage'), 'no automatic average').toHaveCount(0);
    await expect(page.locator('#hpMethodRoll'), 'no automatic roll').toHaveCount(0);
    await expect(page.locator('#rollHPBtn')).toHaveCount(0);
    await expect(body(page), "not the Wizard's die").not.toContainText('Roll 1d6');
    await expect(page.locator('#hpManualInput')).toBeVisible();
    await expect(page.locator('#confirmLevelUpBtn'), 'cannot complete until HP is given').toBeDisabled();

    await completeLevelUp(page, { newClass: 'Mystic', manualHp: 7 });
    const rec = await storedAfterLevel(page, 'single-1', 6);
    expect(rec.maxHP, 'exactly the HP typed').toBe(37);
    expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Wizard', 5], ['Mystic', 1]]);
    expect(rec.hitDice, 'no die was invented for the new class').toBe('5d6');
    expect(rec.hitDiceRemaining).toBe('5d6');
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  // Homebrew data can hold text that is not a die ("d8 (large)"): that must not count as hit-die data either
  const defineOdd = (page, hitDie) => page.evaluate(die => { window.LevelUpData.CLASS_DATA.Odd = { name: 'Odd', features: {}, spellcaster: false, hitDie: die }; }, hitDie);

  test('a hit die that is text, not a number, takes the manual path and corrupts nothing', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, singleRecord()); // Wizard d6, 5d6
    await defineOdd(page, 'd8 (large)');
    await openLevelUp(page);
    await pickMulticlass(page);
    await chooseNewClass(page, 'Odd');

    await expect(page.locator('#hpNoHitDie')).toContainText('Hit-die data is not available for Odd');
    await expect(page.locator('#hpMethodAverage'), 'not automatic dice mode').toHaveCount(0);
    await expect(page.locator('#hpMethodRoll')).toHaveCount(0);
    await expect(body(page), 'no die is shown, neither its own nor the primary class').not.toContainText(/Roll 1d/);
    await expect(page.locator('#hpManualInput')).toBeVisible();

    await completeLevelUp(page, { newClass: 'Odd', manualHp: 7 });
    const rec = await storedAfterLevel(page, 'single-1', 6);
    expect(rec.maxHP).toBe(37);
    expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Wizard', 5], ['Odd', 1]]);
    expect(rec.hitDice).toBe('5d6');
    expect(rec.hitDiceRemaining).toBe('5d6');
    expect(`${rec.hitDice}|${rec.hitDiceRemaining}`).not.toMatch(/dd|NaN|large/);

    // a later level-up of the Wizard leaves the class with no die out of the pool
    await openLevelUp(page, { pick: '[data-level-index="0"]' });
    await completeLevelUp(page);
    const later = await storedAfterLevel(page, 'single-1', 7);
    expect(later.hitDice).toBe('6d6');
    expect(later.hitDiceRemaining).toBe('6d6');
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  test('a hit die given as numeric text is still a die', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await defineOdd(page, '10');
    await openLevelUp(page);
    await chooseNewClass(page, 'Odd');
    await expect(body(page)).toContainText('Roll 1d10');
    await completeLevelUp(page, { newClass: 'Odd' });
    const rec = await storedAfterLevel(page, 'single-1', 6);
    expect(rec.maxHP, 'd10 average').toBe(36);
    expect(rec.hitDice).toBe('1d10 + 5d6');
  });

  test('switching from a class with no die back to one that has it restores the dice', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await defineMystic(page);
    await openLevelUp(page);
    await chooseNewClass(page, 'Mystic');
    await expect(page.locator('#hpManualInput')).toBeVisible();
    await chooseNewClass(page, 'Fighter');
    await expect(page.locator('#hpManualInput')).toHaveCount(0);
    await expect(body(page)).toContainText('Roll 1d10');
  });
});

test.describe('Mixed hit dice', () => {
  const remaining = page => page.locator('#charHitDiceRemaining');
  const openShortRest = async page => {
    await page.evaluate(() => document.getElementById('shortRestBtn').click());
    await expect(page.locator('#hitDiceModal')).toBeVisible();
  };
  const spend = async (page, count, size) => {
    if (size) await page.locator('#hdDieSize').selectOption(String(size));
    await page.locator('#hdSpendCount').fill(String(count));
    await page.locator('#hdRollBtn').click();
    await page.locator('#hdApplyBtn').click();
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  };

  test('a single-class pool is unchanged: no die choice, and spending reduces it', async ({ page }) => {
    await seedAndLoad(page, singleRecord());
    await openShortRest(page);
    await expect(page.locator('#hdDieSizeRow')).toBeHidden();
    await expect(page.locator('#hdModalAvailable')).toHaveText('5d6');
    await spend(page, 2);
    await expect(remaining(page)).toHaveValue('3d6');
  });

  test('a d8 + d6 pool: spending a d6 leaves the d8s, and it survives save and reload', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, multiRecord());
    await openShortRest(page);
    await expect(page.locator('#hdDieSizeRow')).toBeVisible();
    await expect(page.locator('#hdDieSize option')).toHaveText(['d8 (2 left)', 'd6 (3 left)']);
    await expect(page.locator('#hdModalAvailable')).toHaveText('2d8 + 3d6');
    await spend(page, 2, 6);
    await expect(remaining(page), 'the d6 pool went down, the d8 pool did not').toHaveValue('2d8 + 1d6');

    const saved = await saveViaButton(page, 'multi-1');
    expect(saved.hitDiceRemaining).toBe('2d8 + 1d6');
    expect(saved.hitDice).toBe('2d8 + 3d6');
    await page.reload();
    await loadSheet(page, { blank: false });
    await expect(remaining(page)).toHaveValue('2d8 + 1d6');

    // the d8s are still there to spend, and spending them leaves the d6
    await openShortRest(page);
    await spend(page, 2, 8);
    await expect(remaining(page)).toHaveValue('0d8 + 1d6');
    // a long rest gives back half the total number of dice (2 of 5), largest die first
    await page.evaluate(() => document.getElementById('longRestBtn').click());
    await expect(remaining(page)).toHaveValue('2d8 + 1d6');
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  test('a remaining value from before mixed pools existed is kept, not discarded', async ({ page }) => {
    // an earlier level-up wrote "6d6" for a character whose total is 2d8 + 4d6
    await seedAndLoad(page, multiRecord({ hitDice: '2d8 + 4d6', hitDiceRemaining: '6d6', level: 6 }));
    await openShortRest(page);
    await expect(page.locator('#hdModalAvailable')).toHaveText('2d8 + 4d6');
  });

  for (const value of ['', '0d0']) {
    test(`a remaining value of ${value === '' ? 'blank' : value} means none left, not an invalid format`, async ({ page }) => {
      await seedAndLoad(page, singleRecord({ hitDiceRemaining: value }));
      await page.evaluate(() => document.getElementById('shortRestBtn').click());
      await expect(page.locator('#appToastBody')).toContainText('No hit dice remaining');
      await expect(page.locator('#appToastBody')).not.toContainText('Invalid hit dice format');
      await expect(page.locator('#hitDiceModal')).toBeHidden();
    });
  }

  test('a level-up adds its die to that size: Wizard 3 -> 4 adds a d6', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, multiRecord({ hitDiceRemaining: '1d8 + 2d6' }));
    await openLevelUp(page, { pick: '[data-level-index="1"]' });
    await completeLevelUp(page, { asi: 'str' });
    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(rec.hitDice).toBe('2d8 + 4d6');
    expect(rec.hitDiceRemaining, 'one more d6, the d8s as they were').toBe('1d8 + 3d6');
  });

  test('a level-up that adds a new class adds a new die size', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, singleRecord({ hitDiceRemaining: '3d6' })); // two spent
    await openLevelUp(page);
    await completeLevelUp(page, { newClass: 'Fighter' });
    const rec = await storedAfterLevel(page, 'single-1', 6);
    expect(rec.hitDice, 'largest die first').toBe('1d10 + 5d6');
    expect(rec.hitDiceRemaining).toBe('1d10 + 3d6');
  });

  test('Combat Mode spends from the die the player names', async ({ page }) => {
    const dialogs = dialogsOf(page, { prompts: ['d6', '2'] });
    await seedAndLoad(page, multiRecord());
    await page.evaluate(() => document.getElementById('combatHitDiceBtn').click());
    await expect.poll(() => dialogs.join('|')).toContain('Hit dice remaining: 2d8 + 1d6');
    expect(dialogs[0]).toContain('d8 (2 left), d6 (3 left)');
    await expect(remaining(page)).toHaveValue('2d8 + 1d6');
  });
});

test.describe('A save that finishes after switching characters', () => {
  const A = () => singleRecord({ lastUpdated: '2026-01-01T09:00:00.000Z' });
  const B = () => multiRecord({ lastUpdated: '2026-02-02T15:30:00.000Z' });

  test('the write lands for the character saved, and the other sheet is left alone', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, [A(), B()]);
    const first = await currentId(page); // whichever the sheet opens on is the one being saved
    const second = first === 'single-1' ? 'multi-1' : 'single-1';
    await stubStorage(page, 'defer');
    await watchToasts(page);

    await setSheetFields(page, { charName: 'Renamed first' });
    await pressSave(page);
    await expect.poll(() => pendingWrites(page)).toBe(1);

    // switch to the other character while the first one's write is still pending (the switch saves it once more)
    const loadedBefore = await page.evaluate(() => window.__characterLoaded);
    await setSheetFields(page, { characterSelect: second });
    await page.waitForFunction(n => window.__characterLoaded > n, loadedBefore);
    expect(await currentId(page)).toBe(second);
    await setSheetFields(page, { charName: 'Edited second' }); // the sheet on screen now has unsaved changes of its own
    const lastUpdatedShown = await page.locator('#lastUpdatedText').textContent();
    expect(lastUpdatedShown).not.toBe('');
    await expect(dirtyDot(page)).toHaveCount(1);

    while (await pendingWrites(page) > 0) await releaseWrite(page);
    await expect.poll(async () => (await stored(page, first)).name, { message: 'the write was not cancelled' }).toBe('Renamed first');

    expect(await page.locator('#lastUpdatedText').textContent(), "the sheet on screen keeps its own last-saved text").toBe(lastUpdatedShown);
    await expect(dirtyDot(page), 'and its own unsaved edit stays marked unsaved').toHaveCount(1);
    expect(await toastLog(page), 'no saved message for a sheet that is not on screen').not.toContain('Character saved');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Legacy resource keys survive conversion', () => {
  test('res1 and res4 (with extra fields) become array entries in numeric order, and survive save and reload', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, singleRecord({
      resources: {
        res4: { name: 'Fourth Wind', current: 2, max: 2, resetOn: 'short', note: 'keep me' },
        res1: { name: 'Lucky Charm', current: 1, max: 3, note: 'first' },
        unrelated: { name: 'not a slot', max: 9 },
      },
    }));
    await openLevelUp(page);
    await completeLevelUp(page);
    const rec = await storedAfterLevel(page, 'single-1', 6);
    expect(Array.isArray(rec.resources), 'the array is canonical').toBe(true);
    expect(rec.resources.map(r => r.name)).toEqual(['Lucky Charm', 'Fourth Wind', 'Arcane Recovery']);
    expect(rec.resources[1]).toMatchObject({ current: 2, max: 2, resetOn: 'short', note: 'keep me' });
    expect(rec.resources[0]).toMatchObject({ current: 1, max: 3, resetOn: 'long', note: 'first' });

    await page.reload();
    await loadSheet(page, { blank: false });
    await expect(page.locator('#resourcesList .res-name')).toHaveCount(3);
    const saved = await saveViaButton(page, 'single-1');
    expect(saved.resources.map(r => [r.name, r.max])).toEqual([['Lucky Charm', 3], ['Fourth Wind', 2], ['Arcane Recovery', 1]]);
    expect(pageErrorsOf(errors)).toEqual([]);
  });
});

test.describe('One failure message per failed operation', () => {
  const danger = async page => (await toastLog(page)).filter(t => t.includes('NOT saved'));

  test('a failed Save gives one toast and no alert, and the sheet stays unsaved', async ({ page }) => {
    const dialogs = dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await stubStorage(page, 'fail');
    await watchToasts(page);
    await setSheetFields(page, { charName: 'Renamed' });
    await pressSave(page);
    await expect.poll(async () => (await danger(page)).length).toBe(1);
    expect(dialogs, 'no native alert as well').toEqual([]);
    await expect(dirtyDot(page)).toHaveCount(1);
    expect((await toast(page)).danger).toBe(true);
  });

  test('a failed level-up gives its own notice only: no toast, no alert, sheet unsaved', async ({ page }) => {
    const dialogs = dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await stubStorage(page, 'fail');
    await watchToasts(page);
    await openLevelUp(page);
    await completeLevelUp(page);
    await expect(page.locator('#levelUpSaveFailure')).toContainText('Level Up Not Saved');
    expect(await danger(page), 'the level-up notice is the one message').toEqual([]);
    expect(dialogs).toEqual([]);
    await expect(dirtyDot(page)).toHaveCount(1);
    expect((await stored(page, 'single-1')).level).toBe(5);
  });

  test('repeated automatic failures report once; a manual Save reports again; a success resets it', async ({ page }) => {
    const dialogs = dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await stubStorage(page, 'fail');
    await watchToasts(page);
    await setSheetFields(page, { charName: 'Renamed' });

    const auto = async n => {
      await page.evaluate(() => window.saveCurrentCharacter()); // what the 30-second autosave calls
      await expect.poll(() => writeCalls(page)).toBe(n);
      await page.evaluate(() => Promise.resolve()); // let the failed write finish
    };
    await auto(1);
    await auto(2);
    await auto(3);
    expect((await danger(page)).length, 'three automatic failures, one message').toBe(1);
    expect(dialogs).toEqual([]);
    await expect(dirtyDot(page), 'still visibly unsaved').toHaveCount(1);

    await pressSave(page); // an explicit Save retries at once and says so
    await expect.poll(async () => (await danger(page)).length).toBe(2);

    await setWritesFailing(page, false);
    await pressSave(page);
    await expect.poll(async () => (await toastLog(page)).includes('Character saved')).toBe(true);
    await expect(dirtyDot(page)).toHaveCount(0);

    await setWritesFailing(page, true); // after a success the next failure is news again
    await setSheetFields(page, { charName: 'Renamed again' });
    await auto(6);
    await expect.poll(async () => (await danger(page)).length).toBe(3);
  });
});

test.describe('Wild Shape follows the Druid entry only', () => {
  const OLD_WILD_SHAPE = '**Wild Shape Forms** (Max CR: 1/2, can swim)\nOld reference text';
  // Cleric 4 (Life Domain) is the primary class; Druid 3 (Circle of the Moon) is the one with Wild Shape.
  // Total level 7 -> 8 would give CR 2 and flying; the Druid's own level 4 gives CR 1 with swimming.
  const druidRecord = () => multiRecord({
    level: 7, charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1,
    classes: [{ ...CLERIC, level: 4 }, { className: 'Druid', subclass: 'Circle of the Moon', level: 3, subclassLevel: 2 }],
    hitDice: '7d8', hitDiceRemaining: '7d8', spellSlots: slotsOf([4, 3, 3, 1]),
    features: OLD_WILD_SHAPE, tableNotes: '',
  });

  test('levelling the Druid updates Wild Shape from the Druid level and subclass, and it survives save and reload', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, druidRecord());
    await openLevelUp(page, { pick: '[data-level-index="1"]' }); // Druid 3 -> 4
    await completeLevelUp(page, { asi: 'str' });
    const rec = await storedAfterLevel(page, 'multi-1', 8);
    expect(rec.classes.map(c => [c.className, c.subclass, c.level])).toEqual([['Cleric', 'Life Domain', 4], ['Druid', 'Circle of the Moon', 4]]);
    expect(rec.features).toContain('Max CR: 1, can swim');
    expect(rec.features, 'not level-8 Druid Wild Shape').not.toContain('can fly');
    expect(rec.features, 'the old reference was replaced').not.toContain('Max CR: 1/2');

    await page.reload();
    await loadSheet(page, { blank: false });
    const saved = await saveViaButton(page, 'multi-1');
    expect(saved.features).toContain('Max CR: 1, can swim');
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  test('levelling the Cleric leaves Wild Shape as it was', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, druidRecord());
    await openLevelUp(page, { pick: '[data-level-index="0"]' }); // Cleric 4 -> 5
    await completeLevelUp(page);
    const rec = await storedAfterLevel(page, 'multi-1', 8);
    expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Cleric', 5], ['Druid', 3]]);
    expect(rec.features).toContain(OLD_WILD_SHAPE);
    expect(rec.features).not.toContain('Max CR: 1, can swim');
    expect(rec.tableNotes || '', 'no new forms were added').not.toContain('Wild Shape: New Forms');
  });
});

test.describe('Class picker edges', () => {
  test('a class already at level 20 is shown but not offered', async ({ page }) => {
    await seedAndLoad(page, multiRecord({ classes: [{ ...CLERIC }, { ...WIZARD, level: 20 }] }));
    const pickerBefore = await shown(page, 'levelUpClassPickerModal');
    await page.locator('#levelUpCharacterBtn').click();
    await waitShown(page, 'levelUpClassPickerModal', pickerBefore);
    const wizard = page.locator('#levelUpClassPickerModal [data-level-index="1"]');
    await expect(wizard).toBeDisabled();
    await expect(wizard).toContainText('level 20 (maximum)');
    await expect(page.locator('#levelUpClassPickerModal [data-level-index="0"]')).toBeEnabled();
    await expect(page.locator('#levelUpClassPickerModal [data-level-class-new]')).toBeEnabled();
  });

  test('the choices stay disabled until the picker has finished showing, then work', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    const modalBefore = await shown(page, 'levelUpModal');
    const pickerBefore = await shown(page, 'levelUpClassPickerModal');
    // in the same turn as the press, before Bootstrap has fired shown: nothing can be clicked (and lost)
    const during = await page.evaluate(() => {
      document.getElementById('levelUpCharacterBtn').click();
      return [...document.querySelectorAll('#levelUpClassPickerModal .picker-choice')].map(b => b.disabled);
    });
    expect(during).toEqual([true, true, true]);
    await waitShown(page, 'levelUpClassPickerModal', pickerBefore);
    await expect(page.locator('#levelUpClassPickerModal .picker-choice:disabled')).toHaveCount(0);
    await page.locator('#levelUpClassPickerModal [data-level-index="0"]').click();
    await waitShown(page, 'levelUpModal', modalBefore);
    await expect(page.locator('#levelUpModal .modal-header small')).toHaveText('Cleric 2 → 3');
  });
});
