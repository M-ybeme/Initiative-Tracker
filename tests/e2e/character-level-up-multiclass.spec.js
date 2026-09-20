import { test, expect } from '@playwright/test';
import {
  watchErrors, installHydrationCounter, loadSheet, readPersisted, seedPersisted, readShown,
} from '../helpers/character-sheet.js';

// Level-up for multiclass and single-class characters, driven only through the real controls:
// the Level Up button, the class picker, the level-up modal. Results are read straight from IndexedDB with no
// Save press, because a finished level-up must already be stored.

const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
const slotsOf = maxes => Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, { max: maxes[i] || 0, used: 0 }]));
const slotMaxes = rec => Array.from({ length: 9 }, (_, i) => rec.spellSlots[i + 1].max);
const CLERIC = { className: 'Cleric', subclass: 'Life Domain', level: 2, subclassLevel: 1 };
const WIZARD = { className: 'Wizard', subclass: 'Evocation', level: 3, subclassLevel: 2 };

// Cleric 2 / Wizard 3. Hit dice differ (d8 / d6), the level-4 Wizard has an ASI while the level-3 Cleric has no
// feature, and the total level (6) would give a Cleric "Channel Divinity (2/rest)" and a Wizard "Tradition Feature".
const multiRecord = (overrides = {}) => ({
  id: 'multi-1', name: 'Two Classes', charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1, level: 5,
  multiclass: true, classes: [{ ...CLERIC }, { ...WIZARD }], stats, maxHP: 30, currentHP: 30,
  hitDice: '5d8', hitDiceRemaining: '5d8',
  resources: { res1: { name: 'Channel Divinity', current: 0, max: 2 } },
  spellSlots: slotsOf([4, 3, 2]),
  ...overrides,
});
const singleRecord = (overrides = {}) => ({
  id: 'single-1', name: 'One Wizard', charClass: 'Wizard', subclass: 'Evocation', subclassLevel: 2, level: 5,
  multiclass: false, classes: [], stats, maxHP: 30, currentHP: 30, hitDice: '5d6', hitDiceRemaining: '5d6', ...overrides,
});

const summary = rec => ({
  level: rec.level, multiclass: rec.multiclass, charClass: rec.charClass, subclass: rec.subclass, subclassLevel: rec.subclassLevel,
  classes: rec.classes.map(c => [c.className, c.subclass, c.level, c.subclassLevel]),
});

async function seedAndLoad(page, record) {
  await loadSheet(page, { blank: true });
  await seedPersisted(page, [record]);
  await page.reload();
  await loadSheet(page, { blank: false });
}

// Bootstrap ignores hide() until a modal's fade-in has finished, so count shown.bs.modal per modal id
const shown = (page, id) => page.evaluate(i => window.__shown?.[i] || 0, id);
const waitShown = (page, id, before) => page.waitForFunction(([i, n]) => (window.__shown?.[i] || 0) > n, [id, before]);

async function pressLevelUp(page) {
  const before = await shown(page, 'levelUpClassPickerModal');
  await page.locator('#levelUpCharacterBtn').click();
  return before;
}

// Real UI path for a multiclass character: Level Up button, then a choice in the class picker
async function chooseInPicker(page, selector) {
  const modalBefore = await shown(page, 'levelUpModal');
  const pickerBefore = await pressLevelUp(page);
  await waitShown(page, 'levelUpClassPickerModal', pickerBefore);
  await page.locator(`#levelUpClassPickerModal ${selector}`).click();
  await waitShown(page, 'levelUpModal', modalBefore);
}

// Fills the open level-up modal and confirms it. Waits for the modal to close, not for a save.
async function completeModal(page, { subclass, asi, newClass } = {}) {
  await page.evaluate(({ subclass, asi, newClass }) => {
    const modal = document.getElementById('levelUpModal');
    modal.querySelector('#hpMethodAverage').click();
    if (newClass) {
      const select = modal.querySelector('#multiclassNewClass');
      select.value = newClass; select.dispatchEvent(new Event('change', { bubbles: true }));
    }
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
  }, { subclass, asi, newClass });
  await expect(page.locator('#confirmLevelUpBtn')).toBeEnabled();
  await page.locator('#confirmLevelUpBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0, { timeout: 10000 });
}

const stored = async (page, id) => (await readPersisted(page)).find(c => c.id === id);
// The record IndexedDB holds, as soon as it holds the expected total level (never after a Save press)
async function storedAfterLevel(page, id, level) {
  await expect.poll(async () => (await stored(page, id))?.level, { message: 'the level-up reached IndexedDB with no Save' }).toBe(level);
  return stored(page, id);
}

test.beforeEach(async ({ page }) => {
  await installHydrationCounter(page);
  await page.addInitScript(() => {
    window.__shown = {};
    document.addEventListener('shown.bs.modal', e => { window.__shown[e.target.id] = (window.__shown[e.target.id] || 0) + 1; });
  });
});

const failOnDialogs = page => {
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  return dialogs;
};

test.describe('Class picker', () => {
  test('a multiclass character is offered each of its classes and "Add a new class"', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, multiRecord());
    const before = await pressLevelUp(page);
    await waitShown(page, 'levelUpClassPickerModal', before);
    const options = await page.locator('#levelUpClassPickerModal .list-group-item').allInnerTexts();
    expect(options.map(t => t.replace(/\s+/g, ' ').trim())).toEqual([
      'Level Cleric (Life Domain) 2 → 3', 'Level Wizard (Evocation) 3 → 4', 'Add a new class',
    ]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a single-class character goes straight to the level-up modal', async ({ page }) => {
    await seedAndLoad(page, singleRecord());
    const modalBefore = await shown(page, 'levelUpModal');
    await page.locator('#levelUpCharacterBtn').click();
    await waitShown(page, 'levelUpModal', modalBefore);
    await expect(page.locator('#levelUpClassPickerModal')).toHaveCount(0);
  });
});

test.describe('Levelling an existing class of a multiclass character', () => {
  test('the Wizard: Wizard data at Wizard level 4, stored at once, survives a reload', async ({ page }) => {
    const errors = watchErrors(page);
    const dialogs = failOnDialogs(page);
    await seedAndLoad(page, multiRecord());
    await chooseInPicker(page, '[data-level-index="1"]');
    // the modal is for Wizard 3 -> 4, and asks for the Wizard's level-4 ASI
    await expect(page.locator('#levelUpModal .modal-title + small')).toHaveText('Wizard 3 → 4');
    await expect(page.locator('#levelUpModal #asiChoiceASI')).toHaveCount(1);
    await expect(page.locator('#levelUpModal #hpMethodRoll')).toHaveCount(1);
    await expect(page.locator('#levelUpModal .modal-body')).toContainText('Roll 1d6'); // the Wizard's hit die, not the Cleric's d8
    await completeModal(page, { asi: 'str' });

    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(summary(rec)).toEqual({
      level: 6, multiclass: true, charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1,
      classes: [['Cleric', 'Life Domain', 2, 1], ['Wizard', 'Evocation', 4, 2]],
    });
    expect(rec.maxHP, 'd6 average (4), not the primary d8 average (5)').toBe(34);
    expect(rec.hitDice).toBe('2d8 + 4d6');
    expect(rec.stats.str).toBe(12);
    expect(slotMaxes(rec), 'caster level 5 -> 6 raises the shared slots').toEqual([4, 3, 3, 0, 0, 0, 0, 0, 0]);
    expect(rec.features).toContain('Wizard Level 4 Class Features');
    expect(rec.features).toContain('Ability Score Improvement');
    expect(rec.features, 'not the features of total level 6').not.toMatch(/Tradition Feature|Channel Divinity \(2\/rest\)|Domain Feature/);
    // Wizard resource added beside the Cleric's, which is left alone
    expect(rec.resources.res1).toEqual({ name: 'Channel Divinity', current: 0, max: 2 });
    expect(Object.values(rec.resources).find(r => r.name === 'Arcane Recovery')).toMatchObject({ max: 1, current: 1 });

    await page.reload();
    await loadSheet(page, { blank: false });
    expect(await readShown(page, 'charClass')).toBe('Cleric (Life Domain) / Wizard (Evocation)');
    expect(await readShown(page, 'charLevel')).toBe('6');
    expect(summary(await stored(page, 'multi-1')).classes).toEqual([['Cleric', 'Life Domain', 2, 1], ['Wizard', 'Evocation', 4, 2]]);
    expect(dialogs).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the Cleric: Cleric data at Cleric level 3, stored at once, survives a reload', async ({ page }) => {
    const errors = watchErrors(page);
    const dialogs = failOnDialogs(page);
    await seedAndLoad(page, multiRecord());
    await chooseInPicker(page, '[data-level-index="0"]');
    await expect(page.locator('#levelUpModal .modal-title + small')).toHaveText('Cleric 2 → 3');
    await expect(page.locator('#levelUpModal #asiChoiceASI'), 'Cleric level 3 has no ASI').toHaveCount(0);
    await expect(page.locator('#levelUpModal .modal-body')).toContainText('Roll 1d8');
    await completeModal(page);

    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(summary(rec)).toEqual({
      level: 6, multiclass: true, charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1,
      classes: [['Cleric', 'Life Domain', 3, 1], ['Wizard', 'Evocation', 3, 2]],
    });
    expect(rec.maxHP, 'd8 average').toBe(35);
    expect(rec.hitDice).toBe('3d8 + 3d6');
    expect(rec.features || '', 'not the features of total level 6').not.toMatch(/Channel Divinity \(2\/rest\)|Domain Feature/);
    expect(rec.resources.res1).toEqual({ name: 'Channel Divinity', current: 2, max: 2 }); // replenished
    expect(Object.values(rec.resources).some(r => r.name === 'Arcane Recovery')).toBe(false);

    await page.reload();
    await loadSheet(page, { blank: false });
    expect(summary(await stored(page, 'multi-1')).classes).toEqual([['Cleric', 'Life Domain', 3, 1], ['Wizard', 'Evocation', 3, 2]]);
    expect(await readShown(page, 'charLevel')).toBe('6');
    expect(dialogs).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a subclass chosen for a non-primary class lands on that class only', async ({ page }) => {
    const errors = watchErrors(page);
    const dialogs = failOnDialogs(page);
    // Wizard chooses its subclass at level 2; here it has one level
    await seedAndLoad(page, multiRecord({
      level: 5, classes: [{ ...CLERIC, level: 4 }, { className: 'Wizard', subclass: '', level: 1, subclassLevel: 0 }],
    }));
    await chooseInPicker(page, '[data-level-index="1"]');
    await expect(page.locator('#levelUpModal input[name="subclassChoice"]').first()).toBeAttached();
    await expect(page.locator('#levelUpModal .modal-body')).toContainText('Arcane Tradition');
    await completeModal(page, { subclass: 'School of Evocation' });

    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(summary(rec)).toEqual({
      level: 6, multiclass: true, charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1,
      classes: [['Cleric', 'Life Domain', 4, 1], ['Wizard', 'School of Evocation', 2, 2]],
    });

    await page.reload();
    await loadSheet(page, { blank: false });
    expect(summary(await stored(page, 'multi-1')).classes).toEqual([['Cleric', 'Life Domain', 4, 1], ['Wizard', 'School of Evocation', 2, 2]]);
    expect(await readShown(page, 'charClass')).toBe('Cleric (Life Domain) / Wizard (School of Evocation)');
    expect(dialogs).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a class that already has a subclass is not asked for one again', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    await chooseInPicker(page, '[data-level-index="1"]');
    await expect(page.locator('#levelUpModal input[name="subclassChoice"]')).toHaveCount(0);
  });
});

test.describe('Picker safety', () => {
  const HOSTILE = 'Ev"o<img src=x onerror="window.__pwn=1">';

  test('names with quotes and markup render as text, add no attributes, and the right class is still chosen', async ({ page }) => {
    const errors = watchErrors(page);
    const dialogs = failOnDialogs(page);
    await seedAndLoad(page, multiRecord({
      name: 'Bob <b>"the"</b>',
      classes: [{ ...CLERIC }, { ...WIZARD, subclass: HOSTILE }, { className: 'Ro"g<u>e', subclass: '', level: 1, subclassLevel: 0 }],
      level: 6,
    }));
    const pickerBefore = await pressLevelUp(page);
    await waitShown(page, 'levelUpClassPickerModal', pickerBefore);
    const picker = page.locator('#levelUpClassPickerModal');
    expect(await picker.locator('.modal-title').innerText()).toContain('Bob <b>"the"</b>');
    expect(await picker.locator('.list-group-item').allInnerTexts().then(t => t.map(x => x.replace(/\s+/g, ' ').trim())))
      .toEqual([`Level Cleric (Life Domain) 2 → 3`, `Level Wizard (${HOSTILE}) 3 → 4`, 'Level Ro"g<u>e 1 → 2', 'Add a new class']);
    expect(await picker.locator('img, b, u').count(), 'no element was created from the names').toBe(0);
    expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
    const attrs = await picker.locator('.list-group-item').evaluateAll(els => els.map(e => e.getAttributeNames().sort()));
    expect(attrs).toEqual([
      ['class', 'data-level-index', 'type'], ['class', 'data-level-index', 'type'], ['class', 'data-level-index', 'type'],
      ['class', 'data-level-class-new', 'type'],
    ]);

    // the hostile subclass row still picks the Wizard; the odd class name reaches the level-up with its exact name
    await picker.locator('[data-level-index="2"]').click();
    await expect.poll(() => dialogs.join('|')).toContain('Ro"g<u>e');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a hostile subclass does not stop its class being levelled', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, multiRecord({ classes: [{ ...CLERIC }, { ...WIZARD, subclass: HOSTILE }] }));
    await chooseInPicker(page, '[data-level-index="1"]');
    await expect(page.locator('#levelUpModal .modal-title + small')).toHaveText('Wizard 3 → 4');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Rapid repeated Level Up', () => {
  test('two quick presses on a multiclass character make one picker and one level-up', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, multiRecord());
    const modalBefore = await shown(page, 'levelUpModal');
    await page.evaluate(() => { const b = document.getElementById('levelUpCharacterBtn'); b.click(); b.click(); });
    await expect(page.locator('#levelUpClassPickerModal')).toHaveCount(1);
    await page.evaluate(() => new Promise(resolve => {
      const picker = document.getElementById('levelUpClassPickerModal');
      const pick = () => { picker.querySelector('[data-level-index="1"]').click(); resolve(); };
      picker.classList.contains('show') ? pick() : picker.addEventListener('shown.bs.modal', pick, { once: true });
    }));
    await waitShown(page, 'levelUpModal', modalBefore);
    await expect(page.locator('#levelUpModal')).toHaveCount(1);
    await expect(page.locator('#levelUpClassPickerModal')).toHaveCount(0);
    await completeModal(page, { asi: 'str' });
    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(summary(rec).classes, 'levelled once').toEqual([['Cleric', 'Life Domain', 2, 1], ['Wizard', 'Evocation', 4, 2]]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('two quick presses on a single-class character make one level-up modal', async ({ page }) => {
    await seedAndLoad(page, singleRecord());
    const modalBefore = await shown(page, 'levelUpModal');
    await page.evaluate(() => { const b = document.getElementById('levelUpCharacterBtn'); b.click(); b.click(); });
    await waitShown(page, 'levelUpModal', modalBefore);
    await expect(page.locator('#levelUpModal')).toHaveCount(1);
    await completeModal(page);
    expect((await storedAfterLevel(page, 'single-1', 6)).level).toBe(6);
  });
});

test.describe('Adding a new class from the picker', () => {
  test('a new class starts at level 1, the others keep their levels and subclasses, stored at once', async ({ page }) => {
    const errors = watchErrors(page);
    const dialogs = failOnDialogs(page);
    await seedAndLoad(page, multiRecord({ stats: { ...stats, dex: 14 } }));
    await chooseInPicker(page, '[data-level-class-new]');
    await expect(page.locator('#levelUpModal input[name="multiclassPath"][value="continue"]')).toHaveCount(0);
    await completeModal(page, { newClass: 'Rogue' });

    const rec = await storedAfterLevel(page, 'multi-1', 6);
    expect(summary(rec)).toEqual({
      level: 6, multiclass: true, charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1,
      classes: [['Cleric', 'Life Domain', 2, 1], ['Wizard', 'Evocation', 3, 2], ['Rogue', '', 1, 0]],
    });
    expect(slotMaxes(rec), 'a non-caster adds no caster level, so the shared slots stay as they were').toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(dialogs).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the prerequisite check still refuses a class the character does not qualify for', async ({ page }) => {
    await seedAndLoad(page, multiRecord()); // DEX 10
    const dialogs = failOnDialogs(page);
    await chooseInPicker(page, '[data-level-class-new]');
    await page.evaluate(() => {
      const modal = document.getElementById('levelUpModal');
      modal.querySelector('#hpMethodAverage').click();
      const select = modal.querySelector('#multiclassNewClass');
      select.value = 'Rogue'; select.dispatchEvent(new Event('change', { bubbles: true }));
      for (let i = 0; i < 6 && modal.querySelector('#confirmLevelUpBtn').disabled; i++) {
        modal.querySelector('#availableSpellsList [data-spell-name]:not(.text-white)')?.click();
      }
    });
    await page.locator('#confirmLevelUpBtn').click();
    await expect.poll(() => dialogs.join('|')).toContain('Prerequisites not met');
    await expect(page.locator('#levelUpModal')).toHaveCount(1);
    expect((await stored(page, 'multi-1')).level).toBe(5);
  });
});

test.describe('Single-class level-up', () => {
  test('levels the class, stored at once, with no picker', async ({ page }) => {
    const errors = watchErrors(page);
    const dialogs = failOnDialogs(page);
    await seedAndLoad(page, singleRecord());
    const modalBefore = await shown(page, 'levelUpModal');
    await page.locator('#levelUpCharacterBtn').click();
    await waitShown(page, 'levelUpModal', modalBefore);
    await expect(page.locator('#levelUpClassPickerModal')).toHaveCount(0);
    await completeModal(page);

    const rec = await storedAfterLevel(page, 'single-1', 6);
    expect(summary(rec)).toEqual({ level: 6, multiclass: false, charClass: 'Wizard', subclass: 'Evocation', subclassLevel: 2, classes: [] });
    expect(rec.maxHP, 'Wizard d6 average').toBe(34);
    expect(rec.hitDice).toBe('6d6');
    expect(rec.features).toContain('Tradition Feature');
    expect(dialogs).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a single class reaching its subclass level still picks one, stored at once', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, singleRecord({ subclass: '', subclassLevel: 0, level: 1, maxHP: 8, currentHP: 8, hitDice: '1d6', hitDiceRemaining: '1d6' }));
    await page.locator('#levelUpCharacterBtn').click();
    await expect(page.locator('#levelUpModal input[name="subclassChoice"]').first()).toBeAttached();
    await completeModal(page, { subclass: 'School of Evocation' });
    const rec = await storedAfterLevel(page, 'single-1', 2);
    expect(summary(rec)).toEqual({ level: 2, multiclass: false, charClass: 'Wizard', subclass: 'School of Evocation', subclassLevel: 2, classes: [] });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
