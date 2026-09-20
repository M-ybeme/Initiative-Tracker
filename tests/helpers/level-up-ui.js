// Helpers for the level-up specs that drive characters.html through the real Level Up button, class picker and
// modal, and read results with the raw IndexedDB API (see character-sheet.js).
import { expect } from '@playwright/test';
import { installHydrationCounter, loadSheet, readPersisted, seedPersisted } from './character-sheet.js';

export const stats = { str: 14, dex: 14, con: 10, int: 14, wis: 10, cha: 14 };
export const slotsOf = maxes => Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, { max: maxes[i] || 0, used: 0 }]));
export const slotMaxes = rec => Array.from({ length: 9 }, (_, i) => rec.spellSlots[i + 1].max);
export const CLERIC = { className: 'Cleric', subclass: 'Life Domain', level: 2, subclassLevel: 1 };
export const WIZARD = { className: 'Wizard', subclass: 'Evocation', level: 3, subclassLevel: 2 };

// Cleric 2 / Wizard 3: caster level 5, shared slots 4/3/2, hit dice 2d8 + 3d6
export const multiRecord = (overrides = {}) => ({
  id: 'multi-1', name: 'Two Classes', charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1, level: 5,
  multiclass: true, classes: [{ ...CLERIC }, { ...WIZARD }], stats, maxHP: 30, currentHP: 30,
  hitDice: '2d8 + 3d6', hitDiceRemaining: '2d8 + 3d6', spellSlots: slotsOf([4, 3, 2]), ...overrides,
});
export const singleRecord = (overrides = {}) => ({
  id: 'single-1', name: 'One Wizard', charClass: 'Wizard', subclass: 'Evocation', subclassLevel: 2, level: 5,
  multiclass: false, classes: [], stats, maxHP: 30, currentHP: 30, hitDice: '5d6', hitDiceRemaining: '5d6',
  spellSlots: slotsOf([4, 3, 2]), ...overrides,
});

export async function seedAndLoad(page, records) {
  await loadSheet(page, { blank: true });
  await seedPersisted(page, Array.isArray(records) ? records : [records]);
  await page.reload();
  await loadSheet(page, { blank: false });
}

// Counts shown.bs.modal per modal id, because Bootstrap ignores hide() until a modal has finished fading in
export async function installLevelUpHooks(page) {
  await installHydrationCounter(page);
  await page.addInitScript(() => {
    window.__shown = {};
    document.addEventListener('shown.bs.modal', e => { window.__shown[e.target.id] = (window.__shown[e.target.id] || 0) + 1; });
  });
}
export const shown = (page, id) => page.evaluate(i => window.__shown?.[i] || 0, id);
export const waitShown = (page, id, before) => page.waitForFunction(([i, n]) => (window.__shown?.[i] || 0) > n, [id, before]);

// Level Up button; for a multiclass character then a choice in the picker. Resolves with the level-up modal open.
export async function openLevelUp(page, { pick } = {}) {
  const modalBefore = await shown(page, 'levelUpModal');
  const pickerBefore = await shown(page, 'levelUpClassPickerModal');
  await page.locator('#levelUpCharacterBtn').click();
  if (pick) {
    await waitShown(page, 'levelUpClassPickerModal', pickerBefore);
    await page.locator(`#levelUpClassPickerModal ${pick}`).click();
  }
  await waitShown(page, 'levelUpModal', modalBefore);
}

// Chooses the multiclass path and a new class in the open modal (as a user would with the radio and the list)
export const chooseNewClass = (page, className) => page.evaluate(name => {
  const modal = document.getElementById('levelUpModal');
  const radio = modal.querySelector('input[name="multiclassPath"][value="multiclass"]');
  if (!radio.checked) radio.click();
  const select = modal.querySelector('#multiclassNewClass');
  select.value = name; select.dispatchEvent(new Event('change', { bubbles: true }));
}, className);

// Sets the new class, HP method (or a manual HP gain), subclass, ASI, then picks spells until the modal accepts
export async function fillModal(page, { newClass, asi, subclass, manualHp } = {}) {
  if (newClass) await chooseNewClass(page, newClass);
  await page.evaluate(({ asi, subclass, manualHp }) => {
    const modal = document.getElementById('levelUpModal');
    if (manualHp) {
      const input = modal.querySelector('#hpManualInput');
      input.value = String(manualHp); input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      modal.querySelector('#hpMethodAverage').click();
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
  }, { asi, subclass, manualHp });
}

export async function confirmLevelUp(page) {
  await expect(page.locator('#confirmLevelUpBtn')).toBeEnabled();
  await page.locator('#confirmLevelUpBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0, { timeout: 10000 });
}
export const completeLevelUp = async (page, options) => { await fillModal(page, options); await confirmLevelUp(page); };

export const stored = async (page, id) => (await readPersisted(page)).find(c => c.id === id);
export async function storedAfterLevel(page, id, level) {
  await expect.poll(async () => (await stored(page, id))?.level, { message: 'the level-up reached IndexedDB with no Save' }).toBe(level);
  return stored(page, id);
}

export const dialogsOf = (page, { prompts = [] } = {}) => {
  const dialogs = [];
  const answers = [...prompts];
  page.on('dialog', d => {
    dialogs.push(d.message());
    if (d.type() === 'prompt') d.accept(answers.length ? answers.shift() : d.defaultValue()); else d.dismiss();
  });
  return dialogs;
};
export const pageErrorsOf = errors => errors.filter(e => e.startsWith('pageerror'));

// ---- storage stub: the write is held until released, rejected, or switched between the two ----
export const stubStorage = (page, mode) => page.evaluate(m => {
  const real = window.IndexedDBStorage.saveCharacters.bind(window.IndexedDBStorage);
  window.__writes = [];
  window.__writeCalls = 0;
  window.__failWrites = m === 'fail';
  window.IndexedDBStorage.saveCharacters = (...args) => new Promise((resolve, reject) => {
    window.__writeCalls++;
    if (window.__failWrites) { reject(new Error('stubbed storage failure')); return; }
    if (m === 'defer') { window.__writes.push(() => real(...args).then(resolve, reject)); return; }
    real(...args).then(resolve, reject);
  });
}, mode);
export const setWritesFailing = (page, failing) => page.evaluate(f => { window.__failWrites = f; }, failing);
export const releaseWrite = page => page.evaluate(() => window.__writes.shift()());
export const pendingWrites = page => page.evaluate(() => window.__writes.length);
export const writeCalls = page => page.evaluate(() => window.__writeCalls);

// The shared toast, and a running record of every message put in it
export const watchToasts = page => page.evaluate(() => {
  window.__toasts = [];
  new MutationObserver(() => window.__toasts.push(document.getElementById('appToastBody').textContent.trim()))
    .observe(document.getElementById('appToastBody'), { childList: true, characterData: true, subtree: true });
});
export const toastLog = page => page.evaluate(() => window.__toasts);
export const toast = page => page.evaluate(() => ({
  text: document.getElementById('appToastBody').textContent.trim(),
  danger: document.getElementById('appToast').classList.contains('bg-danger'),
}));
export const dirtyDot = page => page.locator('#saveCharacterBtn .dirty-dot');
export const pressSave = page => page.evaluate(() => document.getElementById('saveCharacterBtn').click());
