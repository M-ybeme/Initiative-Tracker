// Sheet-specific helpers for the character save/load characterization tests (characters.html).
// They drive the real page: fill the real fields, press the real Save button, read what the app actually wrote to
// IndexedDB with the raw IndexedDB API (not the app's own read path), and wait on observable app state.
import { expect } from '@playwright/test';
import * as G from '../fixtures/character-fixtures.js';

export function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}

// fillFormFromCharacter() ends by dispatching a document "characterLoaded" event ~100 ms after it starts, and a
// save made before then is silently skipped. Count the events so a test can wait for the next one.
export async function installHydrationCounter(page) {
  await page.addInitScript(() => {
    window.__characterLoaded = 0;
    document.addEventListener('characterLoaded', () => { window.__characterLoaded++; });
  });
}
const hydrationCount = page => page.evaluate(() => window.__characterLoaded);
const waitForHydrationAfter = (page, before) =>
  page.waitForFunction(n => window.__characterLoaded > n, before);

// Open the sheet. With nothing stored the page offers a "new character" modal: choose a blank sheet.
// Otherwise the app loads the first stored character itself. Resolves once the sheet has finished hydrating.
export async function loadSheet(page, { blank }) {
  await page.goto('/characters.html');
  await page.waitForFunction(() => typeof window.getCurrentCharacter === 'function' && typeof window.saveCurrentCharacter === 'function');
  if (blank) await page.locator('#chooseBlankBtn').click({ timeout: 8000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  await page.waitForFunction(() => window.__characterLoaded > 0 && window.getCurrentCharacter() !== null);
}

// ---- storage ----
export const readPersisted = page => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open('DMToolboxDB');
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains('characters')) { db.close(); resolve([]); return; }
    const req = db.transaction('characters', 'readonly').objectStore('characters').getAll();
    req.onerror = () => { db.close(); reject(req.error); };
    req.onsuccess = () => { db.close(); resolve(req.result); };
  };
}));

// Writes records straight into the characters store (legacy-shape characterization only).
export const seedPersisted = (page, records) => page.evaluate(recs => new Promise((resolve, reject) => {
  const open = indexedDB.open('DMToolboxDB');
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const db = open.result;
    const tx = db.transaction('characters', 'readwrite');
    const store = tx.objectStore('characters');
    store.clear();
    recs.forEach(r => store.put(r));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  };
}), records);

// Press the real Save button and wait until the store holds that save (its lastUpdated moved on).
export async function saveViaButton(page, id) {
  const before = (await readPersisted(page)).find(c => c.id === id)?.lastUpdated;
  await domClick(page, 'saveCharacterBtn');
  await expect.poll(async () => (await readPersisted(page)).find(c => c.id === id)?.lastUpdated, { message: 'save reached IndexedDB' }).not.toBe(before);
  return (await readPersisted(page)).find(c => c.id === id);
}

export const currentId = page => page.evaluate(() => window.getCurrentCharacter().id);

// ---- populate the sheet ----
// Sets each field and fires input and change on it (a user would fire only the ones their edit causes).
export async function setSheetFields(page, fields) {
  await page.evaluate(f => {
    for (const [id, value] of Object.entries(f)) {
      const el = document.getElementById(id);
      if (!el) throw new Error('no element #' + id);
      if (el.type === 'checkbox') el.checked = !!value; else el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, fields);
}

// The sheet keeps most controls on inactive tabs. Clicking through the DOM calls the control's own click handler
// without having to open each tab first (it does not check that the control is visible).
const domClick = (page, id) => page.evaluate(i => document.getElementById(i).click(), id);

async function setChecks(page, ids, checked = true) {
  await page.evaluate(([list, c]) => list.forEach(id => {
    const el = document.getElementById(id);
    if (!el) throw new Error('no element #' + id);
    el.checked = c;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }), [ids, checked]);
}

async function addAttack(page, a) {
  await domClick(page, 'addAttackBtn');
  await expect(page.locator('#attackModal')).toBeVisible();
  await setSheetFields(page, {
    attackName: a.name, attackType: a.type, attackRange: a.range, attackBonus: a.bonus, attackSaveDC: a.saveDC,
    attackDamage: a.damage, attackDamageType: a.damageType, attackDamage2: a.damage2, attackDamageType2: a.damageType2,
    attackProperties: a.properties, attackOffhand: a.offhand,
  });
  await page.locator('#saveAttackBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
}

async function addInventoryItem(page, it) {
  await domClick(page, 'addInventoryItemBtn');
  await expect(page.locator('#inventoryItemModal')).toBeVisible();
  await setSheetFields(page, {
    inventoryItemName: it.name, inventoryItemQuantity: it.quantity, inventoryItemWeight: it.weight,
    inventoryItemRarity: it.rarity, inventoryItemNotes: it.notes,
    inventoryItemEquipped: it.equipped, inventoryItemAttuned: it.attuned, inventoryItemMagical: it.magical,
  });
  await page.locator('#saveInventoryItemBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
}

async function addSpellFromSearch(page, title) {
  await setSheetFields(page, { spellSearchInput: title });
  await page.waitForFunction(t => [...document.querySelectorAll('#spellSearchResults button strong')].some(s => s.textContent.trim() === t), title);
  await page.evaluate(t => {
    [...document.querySelectorAll('#spellSearchResults button')].find(b => b.querySelector('strong')?.textContent.trim() === t).click();
  }, title);
  await page.waitForFunction(t => (window.currentSpellList || []).some(s => s.title === t || s.name === t), title);
}

async function addResources(page, rows) {
  for (let i = 0; i < rows.length; i++) {
    await domClick(page, 'addResourceBtn');
    await expect(page.locator('#resourcesList .resource-row')).toHaveCount(i + 1);
  }
  await page.evaluate(list => {
    const rowEls = document.querySelectorAll('#resourcesList .resource-row');
    list.forEach((r, i) => {
      const set = (sel, v) => { const el = rowEls[i].querySelector(sel); el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      set('.res-name', r.name); set('.res-current', r.current); set('.res-max', r.max); set('.res-reset', r.resetOn);
    });
  }, rows);
}

async function setCategorisedNotes(page) {
  for (const [category, text] of Object.entries(G.CATEGORISED_NOTES)) {
    await setSheetFields(page, { notesCategorySelect: category });
    await setSheetFields(page, { charExtraNotes: text });
  }
}

async function addXp(page, amount) {
  await domClick(page, 'xpDisplay');
  await expect(page.locator('#xpAdjustModal')).toBeVisible();
  await page.locator('#xpAdjustAmount').fill(String(amount));
  await page.locator('#xpAddBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
}

async function setPortrait(page) {
  await setSheetFields(page, { portraitUrl: G.PORTRAIT_DATA_URL });
  await domClick(page, 'applyPortraitUrlBtn');
  await expect(page.locator('#portraitModal')).toBeVisible();
  await setSheetFields(page, { portraitZoomModal: G.PORTRAIT_SCALE });
  await page.locator('#savePortraitModalBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  await page.waitForFunction(() => window.getCurrentCharacter().portraitData);
}

// Fill the whole sheet with the golden character through the real controls. Does not save.
export async function populateGoldenSheet(page) {
  await setSheetFields(page, { ...G.SCALAR_FIELDS, ...G.STALE_TYPED_VALUES });
  await setChecks(page, G.SAVE_PROFS.map(a => `save${a}Prof`));
  await setChecks(page, G.SKILL_PROFS.map(s => `skill${s}Prof`));
  await setChecks(page, G.SKILL_EXPERTISE.map(s => `skill${s}Exp`));
  const ds = G.DEATH_SAVES;
  await setChecks(page, [
    ...Array.from({ length: ds.successes }, (_, i) => `deathSaveSuccess${i + 1}`),
    ...Array.from({ length: ds.failures }, (_, i) => `deathSaveFailure${i + 1}`),
    ...(ds.stable ? ['deathSaveStable'] : []),
  ]);
  for (const a of G.ATTACKS) await addAttack(page, a);
  for (const it of G.INVENTORY) await addInventoryItem(page, it);
  for (const t of G.SPELL_TITLES) await addSpellFromSearch(page, t);
  await addResources(page, G.RESOURCES);
  await setCategorisedNotes(page);
  for (const c of G.CONDITIONS) await page.evaluate(n => document.querySelector('.condition-btn[data-condition="' + n + '"]').click(), c);
  // The app's own concentration entry point: it sets the flag, the spell name and the Concentrating condition together.
  await page.evaluate(spell => window.setConcentration(true, spell), G.CONCENTRATION_SPELL);
  for (const key of G.ACTIONS_USED) await domClick(page, `btn-${key.replace('Used', '')}Slot`);
  await addXp(page, G.XP_TO_ADD);
  await setPortrait(page);
}

// Create another blank character through the real "new character" flow and return its id.
export async function createBlankCharacter(page, name) {
  const before = await hydrationCount(page);
  await domClick(page, 'newCharacterBtn');
  await page.locator('#chooseBlankBtn').click({ timeout: 8000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  await waitForHydrationAfter(page, before);
  const id = await currentId(page);
  await setSheetFields(page, { charName: name });
  return id;
}

// Switch with the real character selector and wait for the new character to finish hydrating.
export async function selectCharacter(page, id) {
  const before = await hydrationCount(page);
  await setSheetFields(page, { characterSelect: id });
  await waitForHydrationAfter(page, before);
  expect(await currentId(page)).toBe(id);
}

// ---- reading the hydrated sheet back ----
// The value of a form control, or the text of any other element (whitespace collapsed).
export const readShown = (page, id) => page.evaluate(i => {
  const el = document.getElementById(i);
  if (!el) throw new Error('no element #' + i);
  return el.matches('input,select,textarea') ? el.value : el.textContent.trim().replace(/\s+/g, ' ');
}, id);

export async function readSheetFields(page, ids) {
  return page.evaluate(list => Object.fromEntries(list.map(id => {
    const el = document.getElementById(id);
    return [id, el ? (el.type === 'checkbox' ? el.checked : el.value) : '<missing>'];
  })), ids);
}

// ---- normalization ----
// Strip only what legitimately differs run to run: the generated id and the save timestamp.
export function normalizePersisted(char) {
  const rest = { ...char };
  delete rest.id;
  delete rest.lastUpdated;
  return rest;
}
