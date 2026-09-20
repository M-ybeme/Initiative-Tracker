import { test, expect } from '@playwright/test';
import {
  watchErrors, installHydrationCounter, loadSheet, readPersisted, seedPersisted, saveViaButton, setSheetFields,
} from '../helpers/character-sheet.js';

// Level-up hardening: runtime class-level normalisation, Add New Class hit die and slots, array-format resources,
// the spell-list snapshot timing of a refused level-up, and save/level-up success only after the write finished.
// Everything is driven through the real Level Up button, picker and modal.

const stats = { str: 14, dex: 14, con: 10, int: 14, wis: 10, cha: 14 };
const slotsOf = maxes => Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, { max: maxes[i] || 0, used: 0 }]));
const slotMaxes = rec => Array.from({ length: 9 }, (_, i) => rec.spellSlots[i + 1].max);
const CLERIC = { className: 'Cleric', subclass: 'Life Domain', level: 2, subclassLevel: 1 };
const WIZARD = { className: 'Wizard', subclass: 'Evocation', level: 3, subclassLevel: 2 };

// Cleric 2 / Wizard 3: caster level 5, shared slots 4/3/2
const multiRecord = (overrides = {}) => ({
  id: 'multi-1', name: 'Two Classes', charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1, level: 5,
  multiclass: true, classes: [{ ...CLERIC }, { ...WIZARD }], stats, maxHP: 30, currentHP: 30,
  hitDice: '5d8', hitDiceRemaining: '5d8', spellSlots: slotsOf([4, 3, 2]), ...overrides,
});
const singleRecord = (overrides = {}) => ({
  id: 'single-1', name: 'One Wizard', charClass: 'Wizard', subclass: 'Evocation', subclassLevel: 2, level: 5,
  multiclass: false, classes: [], stats, maxHP: 30, currentHP: 30, hitDice: '5d6', hitDiceRemaining: '5d6',
  spellSlots: slotsOf([4, 3, 2]), ...overrides,
});

async function seedAndLoad(page, record) {
  await loadSheet(page, { blank: true });
  await seedPersisted(page, [record]);
  await page.reload();
  await loadSheet(page, { blank: false });
}

const shown = (page, id) => page.evaluate(i => window.__shown?.[i] || 0, id);
const waitShown = (page, id, before) => page.waitForFunction(([i, n]) => (window.__shown?.[i] || 0) > n, [id, before]);

// Level Up button; for a multiclass character then a choice in the picker. Resolves with the level-up modal open.
async function openLevelUp(page, { pick } = {}) {
  const modalBefore = await shown(page, 'levelUpModal');
  const pickerBefore = await shown(page, 'levelUpClassPickerModal');
  await page.locator('#levelUpCharacterBtn').click();
  if (pick) {
    await waitShown(page, 'levelUpClassPickerModal', pickerBefore);
    await page.locator(`#levelUpClassPickerModal ${pick}`).click();
  }
  await waitShown(page, 'levelUpModal', modalBefore);
}

// Sets the new class, HP method, subclass, ASI, then picks spells until the modal accepts. Does not confirm.
async function fillModal(page, { newClass, asi, subclass } = {}) {
  await page.evaluate(({ newClass, asi, subclass }) => {
    const modal = document.getElementById('levelUpModal');
    if (newClass) {
      const radio = modal.querySelector('input[name="multiclassPath"][value="multiclass"]');
      if (!radio.checked) radio.click();
      const select = modal.querySelector('#multiclassNewClass');
      select.value = newClass; select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    modal.querySelector('#hpMethodAverage').click();
    if (subclass) modal.querySelector(`input[name="subclassChoice"][value="${subclass}"]`).click();
    if (asi) {
      modal.querySelector('#asiChoiceASI').click();
      const select = modal.querySelector(`.asi-increase[data-ability="${asi}"]`);
      select.value = '2'; select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const confirm = modal.querySelector('#confirmLevelUpBtn');
    for (let i = 0; i < 6 && confirm.disabled; i++) {
      const next = modal.querySelector('#availableSpellsList [data-spell-name]:not(.text-white)');
      if (!next) break;
      next.click();
    }
  }, { newClass, asi, subclass });
}

async function confirmLevelUp(page) {
  await expect(page.locator('#confirmLevelUpBtn')).toBeEnabled();
  await page.locator('#confirmLevelUpBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0, { timeout: 10000 });
}

const completeLevelUp = async (page, options) => { await fillModal(page, options); await confirmLevelUp(page); };

const stored = async (page, id) => (await readPersisted(page)).find(c => c.id === id);
async function storedAfterLevel(page, id, level) {
  await expect.poll(async () => (await stored(page, id))?.level, { message: 'the level-up reached IndexedDB with no Save' }).toBe(level);
  return stored(page, id);
}

const dialogsOf = page => {
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  return dialogs;
};
const pageErrorsOf = errors => errors.filter(e => e.startsWith('pageerror'));

test.beforeEach(async ({ page }) => {
  await installHydrationCounter(page);
  await page.addInitScript(() => {
    window.__shown = {};
    document.addEventListener('shown.bs.modal', e => { window.__shown[e.target.id] = (window.__shown[e.target.id] || 0) + 1; });
  });
});

test.describe('Class levels stored as text, missing or malformed', () => {
  // [label, stored Wizard level, level the modal opens for, Wizard's new level, needs the level-4 ASI]
  const cases = [
    ['a number', 3, 3, 4, true],
    ['a numeric string', '3', 3, 4, true],
    ['missing', undefined, 0, 1, false],
    ['malformed text', 'abc', 0, 1, false],
  ];
  for (const [label, stored_, from, to, asi] of cases) {
    test(`a Wizard level that is ${label} levels to the number ${to}`, async ({ page }) => {
      const errors = watchErrors(page);
      const dialogs = dialogsOf(page);
      const wizard = { ...WIZARD };
      if (stored_ === undefined) delete wizard.level; else wizard.level = stored_;
      await seedAndLoad(page, multiRecord({ classes: [{ ...CLERIC }, wizard] }));
      await openLevelUp(page, { pick: '[data-level-index="1"]' });
      await expect(page.locator('#levelUpModal .modal-title + small')).toHaveText(`Wizard ${from} → ${to}`);
      await completeLevelUp(page, asi ? { asi: 'str' } : {});

      const rec = await storedAfterLevel(page, 'multi-1', 6);
      const entry = rec.classes.find(c => c.className === 'Wizard');
      expect(entry.level, 'a number, never "31" or NaN').toBe(to);
      expect(rec.classes.find(c => c.className === 'Cleric').level).toBe(2);
      expect(rec.classes.map(c => c.subclass)).toEqual(['Life Domain', 'Evocation']);
      expect(dialogs).toEqual([]);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('levels are read as numbers when the caster level is worked out, and other entries are left as stored', async ({ page }) => {
    await seedAndLoad(page, multiRecord({ classes: [{ ...CLERIC, level: '2' }, { ...WIZARD, level: '3' }] }));
    await openLevelUp(page, { pick: '[data-level-index="1"]' });
    await completeLevelUp(page, { asi: 'str' });
    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(rec.classes.map(c => c.level), 'only the levelled class is rewritten; no migration of the rest').toEqual(['2', 4]);
    expect(slotMaxes(rec), 'caster level 5 -> 6, not the text "2"+"3"').toEqual([4, 3, 3, 0, 0, 0, 0, 0, 0]);
    expect(rec.hitDice).toBe('2d8 + 4d6');
  });
});

test.describe('Add New Class uses the class that is chosen', () => {
  test('the hit die follows the new class: Wizard d6 primary, Fighter d10 chosen', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, singleRecord()); // Wizard 5, CON 10
    await openLevelUp(page);
    await expect(page.locator('#levelUpModal .modal-body')).toContainText('Roll 1d6');

    await page.evaluate(() => document.querySelector('#levelUpModal input[name="multiclassPath"][value="multiclass"]').click());
    await expect(page.locator('#hpMethodAverage'), 'no hit die is offered until the class is chosen').toBeDisabled();
    await page.evaluate(() => {
      const select = document.querySelector('#multiclassNewClass');
      select.value = 'Fighter'; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#levelUpModal .modal-body')).toContainText('Roll 1d10');
    await expect(page.locator('#hpAvgGain')).toHaveText('6'); // d10 average, not the Wizard's 4

    await completeLevelUp(page);
    const rec = await storedAfterLevel(page, 'single-1', 6);
    expect(rec.maxHP, "Fighter's d10 average (6), not the Wizard's d6 (4)").toBe(36);
    expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Wizard', 5], ['Fighter', 1]]);
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  test('changing the chosen class re-applies an HP method already picked, and going back to the current class restores its die', async ({ page }) => {
    await seedAndLoad(page, singleRecord());
    await openLevelUp(page);
    const choose = cls => page.evaluate(c => {
      const select = document.querySelector('#multiclassNewClass');
      select.value = c; select.dispatchEvent(new Event('change', { bubbles: true }));
    }, cls);
    await page.evaluate(() => document.querySelector('#levelUpModal input[name="multiclassPath"][value="multiclass"]').click());
    await choose('Rogue'); // d8
    await page.evaluate(() => document.getElementById('hpMethodAverage').click());
    await expect(page.locator('#hpBadge')).toHaveText('+5 HP');
    await choose('Fighter'); // d10: the picked method follows the new die
    await expect(page.locator('#hpBadge')).toHaveText('+6 HP');
    expect(await page.locator('#hpGainValue').inputValue()).toBe('6');
    await page.evaluate(() => document.querySelector('#levelUpModal input[name="multiclassPath"][value="continue"]').click());
    await expect(page.locator('#hpBadge')).toHaveText('+4 HP'); // back to the Wizard's d6
    await expect(page.locator('#levelUpModal .modal-body')).toContainText('Roll 1d6');
  });

  test('from the picker, no hit die is offered until the new class is chosen', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    await openLevelUp(page, { pick: '[data-level-class-new]' });
    await expect(page.locator('#hpMethodAverage')).toBeDisabled();
    await expect(page.locator('#hpMethodRoll')).toBeDisabled();
    await expect(page.locator('#hpNeedsClass')).toBeVisible();
    await page.evaluate(() => {
      const select = document.querySelector('#multiclassNewClass');
      select.value = 'Fighter'; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#hpMethodAverage')).toBeEnabled();
    await expect(page.locator('#hpNeedsClass')).toBeHidden();
  });
});

test.describe('Add New Class recomputes shared slots from the new class', () => {
  // Cleric 2 / Wizard 3 has caster level 5 (slots 4/3/2)
  const cases = [
    { added: 'Sorcerer', label: 'a full caster raises the caster level', slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
    { added: 'Paladin', label: 'a half caster at level 1 adds nothing', slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
    { added: 'Fighter', label: 'a non-caster adds nothing', slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
  ];
  for (const { added, label, slots } of cases) {
    test(`adding ${added}: ${label}`, async ({ page }) => {
      const errors = watchErrors(page);
      dialogsOf(page);
      await seedAndLoad(page, multiRecord());
      await openLevelUp(page, { pick: '[data-level-class-new]' });
      await completeLevelUp(page, { newClass: added });
      const rec = await storedAfterLevel(page, 'multi-1', 6);
      expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Cleric', 2], ['Wizard', 3], [added, 1]]);
      expect(slotMaxes(rec)).toEqual(slots);
      expect(pageErrorsOf(errors)).toEqual([]);
    });
  }

  test('adding a Warlock sets Pact Magic on its own and leaves the shared slots alone', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, multiRecord());
    await openLevelUp(page, { pick: '[data-level-class-new]' });
    await completeLevelUp(page, { newClass: 'Warlock' });
    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(slotMaxes(rec), 'Warlock adds no shared caster level').toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(rec.pactSlots).toEqual({ level: 1, max: 1, used: 0 });
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  test('a single-class non-caster that adds a caster gets its first slots', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, singleRecord({ charClass: 'Fighter', subclass: 'Champion', subclassLevel: 3, level: 6, spellSlots: slotsOf([]), hitDice: '6d10', hitDiceRemaining: '6d10' }));
    await openLevelUp(page);
    await completeLevelUp(page, { newClass: 'Wizard' });
    const rec = await storedAfterLevel(page, 'single-1', 7);
    expect(slotMaxes(rec)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Fighter', 6], ['Wizard', 1]]);
  });

  test('levelling an existing caster changes the shared slots when its caster level changes', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, multiRecord());
    await openLevelUp(page, { pick: '[data-level-index="1"]' });
    await completeLevelUp(page, { asi: 'str' });
    expect(slotMaxes(await storedAfterLevel(page, 'multi-1', 6))).toEqual([4, 3, 3, 0, 0, 0, 0, 0, 0]);
  });
});

test.describe('Add New Class refuses a class the character already has', () => {
  // Cleric 3 / Warlock 3 with Pact Magic 2 x level 2 (one used) and shared slots 4/2
  const warlockRecord = () => multiRecord({
    level: 6,
    classes: [{ ...CLERIC, level: 3 }, { className: 'Warlock', subclass: 'The Fiend', level: 3, subclassLevel: 1 }],
    spellSlots: slotsOf([4, 2]),
    pactSlots: { level: 2, max: 2, used: 1 }, pactLevel: 2, pactMax: 2, pactUsed: 1,
    resources: [{ name: 'Pact Slots (Lvl 2)', current: 1, max: 2, resetOn: 'short' }],
    spellList: [{ name: 'Fireball', title: 'Fireball', level: 3 }],
  });

  // Fills the Add New Class modal and presses Complete, without waiting for the modal to close
  async function tryAdding(page, newClass, pick) {
    await openLevelUp(page, pick ? { pick } : {});
    await fillModal(page, { newClass });
    await expect(page.locator('#confirmLevelUpBtn')).toBeEnabled();
    await page.locator('#confirmLevelUpBtn').click();
  }

  test('a Warlock added to a Warlock is refused and nothing changes, in memory or in storage', async ({ page }) => {
    const errors = watchErrors(page);
    const alerts = dialogsOf(page);
    await seedAndLoad(page, warlockRecord());
    const before = await readPersisted(page);
    const memoryBefore = await page.evaluate(() => JSON.stringify(window.getCurrentCharacter()));

    await tryAdding(page, 'Warlock', '[data-level-class-new]');
    await expect.poll(() => alerts.join('|')).toContain("Warlock is already one of this character's classes");
    await expect(page.locator('#levelUpModal'), 'the level-up stays open, uncommitted').toHaveCount(1);

    expect(await readPersisted(page), 'raw IndexedDB is untouched').toEqual(before);
    const rec = before[0];
    expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Cleric', 3], ['Warlock', 3]]);
    expect(rec.level).toBe(6);
    expect(rec.pactSlots).toEqual({ level: 2, max: 2, used: 1 });
    expect(slotMaxes(rec)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(await page.evaluate(() => JSON.stringify(window.getCurrentCharacter())), 'the character in memory is untouched').toBe(memoryBefore);
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  test('a single-class character cannot add its own class either', async ({ page }) => {
    const alerts = dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    const before = await readPersisted(page);
    await tryAdding(page, 'Wizard');
    await expect.poll(() => alerts.join('|')).toContain("Wizard is already one of this character's classes");
    expect(await readPersisted(page)).toEqual(before);
  });

  test('a class the character does not have can still be added', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, warlockRecord());
    await openLevelUp(page, { pick: '[data-level-class-new]' });
    await completeLevelUp(page, { newClass: 'Fighter' });
    const rec = await storedAfterLevel(page, 'multi-1', 7);
    expect(rec.classes.map(c => [c.className, c.level])).toEqual([['Cleric', 3], ['Warlock', 3], ['Fighter', 1]]);
    expect(rec.pactSlots, 'Pact Magic is untouched by adding a non-caster').toEqual({ level: 2, max: 2, used: 1 });
  });
});

test.describe('Class resources in the array format', () => {
  const resourcesOf = () => [
    { name: 'Channel Divinity', current: 0, max: 2, resetOn: 'short' },
    { name: 'Lucky Charm', current: 1, max: 3, resetOn: 'long' },
  ];
  const sameNames = rec => rec.resources.map(r => r.name);

  test('a new class resource is added to the array, unrelated ones survive, and it survives save and reload', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, multiRecord({ resources: resourcesOf() }));
    await openLevelUp(page, { pick: '[data-level-index="1"]' }); // Wizard 3 -> 4
    await completeLevelUp(page, { asi: 'str' });
    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(Array.isArray(rec.resources), 'still the array format, no res1 keys').toBe(true);
    expect(rec.resources.map(r => r.name)).toEqual(['Channel Divinity', 'Lucky Charm', 'Arcane Recovery']);
    expect(rec.resources[0]).toEqual({ name: 'Channel Divinity', current: 0, max: 2, resetOn: 'short' });
    expect(rec.resources[1]).toEqual({ name: 'Lucky Charm', current: 1, max: 3, resetOn: 'long' });
    expect(rec.resources[2]).toMatchObject({ max: 1, current: 1 });

    await page.reload();
    await loadSheet(page, { blank: false });
    await expect(page.locator('#resourcesList .res-name')).toHaveCount(3);
    const saved = await saveViaButton(page, 'multi-1');
    expect(sameNames(saved)).toEqual(['Channel Divinity', 'Lucky Charm', 'Arcane Recovery']);
    expect(pageErrorsOf(errors)).toEqual([]);
  });

  test('an existing class resource is updated in place with no duplicate', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, multiRecord({ resources: resourcesOf() }));
    await openLevelUp(page, { pick: '[data-level-index="0"]' }); // Cleric 2 -> 3
    await completeLevelUp(page);
    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(sameNames(rec)).toEqual(['Channel Divinity', 'Lucky Charm']);
    expect(rec.resources[0]).toEqual({ name: 'Channel Divinity', current: 2, max: 2, resetOn: 'short' }); // replenished
    expect(rec.resources[1]).toEqual({ name: 'Lucky Charm', current: 1, max: 3, resetOn: 'long' });
  });

  test('an older { res1 } object is converted to the array rather than written back', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, multiRecord({ resources: { res1: { name: 'Channel Divinity', current: 0, max: 2 } } }));
    await openLevelUp(page, { pick: '[data-level-index="0"]' });
    await completeLevelUp(page);
    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(Array.isArray(rec.resources)).toBe(true);
    expect(rec.resources).toEqual([{ name: 'Channel Divinity', current: 2, max: 2, resetOn: 'long' }]);
  });

  test('a Pact Slots resource in the array follows the Warlock level-up', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, multiRecord({
      classes: [{ ...CLERIC }, { className: 'Warlock', subclass: 'The Fiend', level: 3, subclassLevel: 1 }],
      spellSlots: slotsOf([3]), pactSlots: { level: 2, max: 2, used: 1 }, pactMax: 2, pactLevel: 2, pactUsed: 1,
      resources: [{ name: 'Pact Slots (Lvl 1)', current: 0, max: 1, resetOn: 'short' }, { name: 'Lucky Charm', current: 1, max: 3, resetOn: 'long' }],
    }));
    await openLevelUp(page, { pick: '[data-level-index="1"]' }); // Warlock 3 -> 4
    await completeLevelUp(page, { asi: 'str' });
    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(rec.resources).toEqual([
      { name: 'Pact Slots (Lvl 2)', current: 2, max: 2, resetOn: 'short' },
      { name: 'Lucky Charm', current: 1, max: 3, resetOn: 'long' },
    ]);
    expect(rec.pactSlots).toEqual({ level: 2, max: 2, used: 0 });
  });
});

test.describe('A refused level-up leaves the spell list alone', () => {
  const SEEDED = [{ name: 'Fireball', title: 'Fireball', level: 3 }];
  // A spell that exists only on the open sheet: a level-up that got as far as its snapshot would copy it in
  const addSheetOnlySpell = page => page.evaluate(() => {
    window.currentSpellList.push({ name: 'Shield', title: 'Shield', level: 1 });
  });
  const spellNames = page => page.evaluate(() => (window.getCurrentCharacter().spellList || []).map(s => s.name));

  test('a class already at level 20 refuses, and the spell list is not touched', async ({ page }) => {
    const alerts = dialogsOf(page);
    await seedAndLoad(page, multiRecord({ spellList: SEEDED, classes: [{ ...CLERIC }, { ...WIZARD, level: 20 }] }));
    await addSheetOnlySpell(page);
    const pickerBefore = await shown(page, 'levelUpClassPickerModal');
    await page.locator('#levelUpCharacterBtn').click();
    await waitShown(page, 'levelUpClassPickerModal', pickerBefore);
    await page.locator('#levelUpClassPickerModal [data-level-index="1"]').click();
    await expect.poll(() => alerts.join('|')).toContain('already at level 20');
    await expect(page.locator('#levelUpModal')).toHaveCount(0);
    expect(await spellNames(page)).toEqual(['Fireball']);
  });

  test('a class that is not on the character refuses, and the spell list is not touched', async ({ page }) => {
    const alerts = dialogsOf(page);
    await seedAndLoad(page, multiRecord({ spellList: SEEDED }));
    await addSheetOnlySpell(page);
    await page.evaluate(() => window.LevelUpSystem.startLevelUp(window.getCurrentCharacter(), 'Rogue'));
    await expect.poll(() => alerts.join('|')).toContain("not one of this character's classes");
    expect(await spellNames(page)).toEqual(['Fireball']);
  });

  test('a level-up that goes ahead still snapshots the spells', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, multiRecord({ spellList: SEEDED }));
    await addSheetOnlySpell(page);
    await openLevelUp(page, { pick: '[data-level-index="0"]' });
    expect(await spellNames(page)).toEqual(['Fireball', 'Shield']);
  });
});

// Replaces the storage write with one the test controls: 'defer' holds every write until released, 'fail' rejects
const stubStorage = (page, mode) => page.evaluate(m => {
  const real = window.IndexedDBStorage.saveCharacters.bind(window.IndexedDBStorage);
  window.__writes = [];
  window.IndexedDBStorage.saveCharacters = (...args) => new Promise((resolve, reject) => {
    if (m === 'fail') { reject(new Error('stubbed storage failure')); return; }
    window.__writes.push(() => real(...args).then(resolve, reject));
  });
}, mode);
const releaseWrite = page => page.evaluate(() => window.__writes.shift()());
const pendingWrites = page => page.evaluate(() => window.__writes.length);
const toast = page => page.evaluate(() => ({
  text: document.getElementById('appToastBody').textContent.trim(),
  danger: document.getElementById('appToast').classList.contains('bg-danger'),
}));
const dirtyDot = page => page.locator('#saveCharacterBtn .dirty-dot');
const pressSave = page => page.evaluate(() => document.getElementById('saveCharacterBtn').click());

test.describe('Success is reported only after the write finished', () => {
  test('a Save: the sheet stays unsaved and silent while the write is pending, then clears when it lands', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, singleRecord());
    await stubStorage(page, 'defer');
    await setSheetFields(page, { charName: 'Renamed' });
    await expect(dirtyDot(page)).toHaveCount(1);
    await pressSave(page);
    await expect.poll(() => pendingWrites(page)).toBe(1);
    await expect(dirtyDot(page), 'still unsaved while the write is pending').toHaveCount(1);
    expect((await toast(page)).text, 'no success message yet').not.toBe('Character saved');

    await releaseWrite(page);
    await expect(dirtyDot(page)).toHaveCount(0);
    await expect.poll(async () => (await toast(page)).text).toBe('Character saved');
    expect((await stored(page, 'single-1')).name).toBe('Renamed');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a failed Save: the sheet stays unsaved, no success toast, and the failure is shown', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await stubStorage(page, 'fail');
    await setSheetFields(page, { charName: 'Renamed' });
    await pressSave(page);
    await expect.poll(async () => (await toast(page)).text).toContain('NOT saved');
    expect((await toast(page)).danger).toBe(true);
    await expect(dirtyDot(page)).toHaveCount(1);
    expect((await stored(page, 'single-1')).name, 'nothing was written').toBe('One Wizard');
    expect(pageErrorsOf(errors), 'the failure is handled, not an unhandled rejection').toEqual([]);
  });

  test('an edit made while the write is in flight keeps the sheet marked unsaved', async ({ page }) => {
    await seedAndLoad(page, singleRecord());
    await stubStorage(page, 'defer');
    await setSheetFields(page, { charName: 'First' });
    await pressSave(page);
    await expect.poll(() => pendingWrites(page)).toBe(1);
    await setSheetFields(page, { charName: 'Second' }); // not part of the write in flight
    await releaseWrite(page);
    await expect.poll(async () => (await stored(page, 'single-1')).name).toBe('First');
    await expect(dirtyDot(page)).toHaveCount(1);
  });

  test('a level-up: "Level Up Complete" appears only after the write, and a failed write is reported instead', async ({ page }) => {
    dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await stubStorage(page, 'defer');
    await openLevelUp(page);
    await completeLevelUp(page);
    await expect.poll(() => pendingWrites(page)).toBe(1);
    await expect(page.getByText('Level Up Complete'), 'no success message while the write is pending').toHaveCount(0);
    await releaseWrite(page);
    await expect(page.getByText('Level Up Complete')).toBeVisible();
    expect((await storedAfterLevel(page, 'single-1', 6)).level).toBe(6);
  });

  test('a level-up whose write fails is surfaced, with no success message', async ({ page }) => {
    const errors = watchErrors(page);
    dialogsOf(page);
    await seedAndLoad(page, singleRecord());
    await stubStorage(page, 'fail');
    await openLevelUp(page);
    await completeLevelUp(page);
    await expect(page.locator('#levelUpSaveFailure')).toContainText('Level Up Not Saved');
    await expect(page.getByText('Level Up Complete')).toHaveCount(0);
    expect((await toast(page)).danger).toBe(true);
    expect(await page.locator('#charLevel').inputValue(), 'the sheet shows the new level').toBe('6');
    await expect(dirtyDot(page), 'so it must not look saved').toHaveCount(1);
    expect((await stored(page, 'single-1')).level, 'nothing was written').toBe(5);
    expect(pageErrorsOf(errors)).toEqual([]);
  });
});
