import { test, expect } from '@playwright/test';
import * as G from '../fixtures/character-fixtures.js';
import {
  watchErrors, installHydrationCounter, loadSheet, readPersisted, seedPersisted, saveViaButton, currentId,
  populateGoldenSheet, createBlankCharacter, selectCharacter, readSheetFields, readShown, setSheetFields,
  normalizePersisted,
} from '../helpers/character-sheet.js';

// Characterization of full character save/load on characters.html, in a real browser:
//   sheet fields -> real Save button -> the record the app wrote to IndexedDB -> reload -> the app's own load path
//   -> the hydrated sheet.
// The persisted record is read with the raw IndexedDB API. Derived values (modifiers, bonuses, spell slot maxes,
// proficiency bonus, passives) are asserted as the recalculated values the app produces, not as typed values.

const { cap } = G;
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));

// One check per subsystem, so a failure names the subsystem and field that broke.
function expectSubsystem(name, actual, expected) {
  expect(actual, `persisted "${name}"`).toEqual(expected);
}

function assertPersistedBySubsystem(rec) {
  const E = G.buildExpectedPersisted();
  const same = (name, keys) => expectSubsystem(name, pick(rec, keys), pick(E, keys));
  same('identity', ['name', 'playerName', 'race', 'charClass', 'subclass', 'subclassLevel', 'background', 'alignment', 'level', 'roleNotes', 'multiclass', 'classes']);
  same('vitals', ['ac', 'maxHP', 'currentHP', 'tempHP', 'speed', 'initMod', 'exhaustion', 'deathSaves', 'hitDice', 'hitDiceRemaining', 'inspiration', 'xp']);
  same('abilities', ['stats', 'statMods']);
  same('saving throws', ['savingThrows', 'saveNotes']);
  same('skills', ['skills', 'skillsNotes', 'skillJoAT']);
  same('senses', ['senses']);
  same('proficiencies', ['proficiencyBonus', 'languages', 'armorWeaponProf', 'toolProf']);
  same('spellcasting', ['spellcastingAbility', 'spellSlots', 'pactSlots', 'spells']);
  expectSubsystem('spell list', rec.spellList.map(G.projectSpell), E.spellList);
  same('attacks', ['attacks']);
  same('inventory', ['inventoryItems', 'inventory']);
  same('currency', ['currency', 'includeCoinWeight']);
  same('resources', ['resources']);
  same('notes', ['notes', 'tableNotes', 'extraNotes', 'categorizedNotes', 'features']);
  same('conditions and concentration', ['conditions', 'concentrating', 'concentrationSpell']);
  same('portrait', ['portraitType', 'portraitData', 'portraitSettings']);
  same('per-turn flags', ['actionUsed', 'bonusActionUsed', 'reactionUsed', 'moveUsed']);
}

const withProjectedSpells = rec => ({ ...normalizePersisted(rec), spellList: rec.spellList.map(G.projectSpell) });

// What the sheet fields should hold after a load: what was typed, except where the app recalculates.
function expectedSheetFields() {
  const shown = {
    ...G.SCALAR_FIELDS,
    charConditions: 'Poisoned, Prone, Concentrating',
    charConcentrating: true,
    charConcentrationSpell: G.CONCENTRATION_SPELL,
    slots1Max: G.DERIVED.spellSlotMax[1], // typed 9; the class table says 4
    saveIntBonus: G.DERIVED.savingThrows.int, // typed 99
    skillArcanaBonus: G.DERIVED.skills.arcana, // typed 99
  };
  return Object.fromEntries(Object.entries(shown).map(([id, v]) => [id, typeof v === 'boolean' ? v : String(v)]));
}

async function assertHydratedSheet(page) {
  // scalars typed into fields
  expect(await readSheetFields(page, Object.keys(expectedSheetFields())), 'hydrated scalar fields').toEqual(expectedSheetFields());

  // proficiency / expertise / death save checkboxes
  const want = {};
  for (const a of ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']) want[`save${a}Prof`] = G.SAVE_PROFS.includes(a);
  for (const k of Object.keys(G.DERIVED.skills)) {
    want[`skill${cap(k)}Prof`] = G.SKILL_PROFS.includes(cap(k));
    want[`skill${cap(k)}Exp`] = G.SKILL_EXPERTISE.includes(cap(k));
  }
  const ds = G.DEATH_SAVES;
  [1, 2, 3].forEach(i => { want[`deathSaveSuccess${i}`] = i <= ds.successes; want[`deathSaveFailure${i}`] = i <= ds.failures; });
  want.deathSaveStable = ds.stable;
  expect(await readSheetFields(page, Object.keys(want)), 'hydrated proficiency and death save checkboxes').toEqual(want);

  // recalculated numbers
  const derived = {};
  for (const [ab, mod] of Object.entries(G.DERIVED.statMods)) derived[`mod${cap(ab)}`] = String(mod);
  for (const [ab, b] of Object.entries(G.DERIVED.savingThrows)) derived[`save${cap(ab)}Bonus`] = String(b);
  for (const [k, b] of Object.entries(G.DERIVED.skills)) derived[`skill${cap(k)}Bonus`] = String(b);
  for (const [lvl, max] of Object.entries(G.DERIVED.spellSlotMax)) derived[`slots${lvl}Max`] = String(max);
  Object.assign(derived, {
    charPassivePerception: String(G.DERIVED.passivePerception),
    charPassiveInvestigation: String(G.DERIVED.passiveInvestigation),
    charPassiveInsight: String(G.DERIVED.passiveInsight),
  });
  const shownDerived = {};
  for (const id of Object.keys(derived)) shownDerived[id] = await readShown(page, id);
  expect(shownDerived, 'hydrated derived values (recalculated, not typed)').toEqual(derived);
  expect(await readShown(page, 'charProficiencyBonusDisplay'), 'proficiency bonus display').toBe('+' + G.DERIVED.proficiencyBonus);
  expect(await readShown(page, 'spellSaveDC'), 'spell save DC right after load').toBe('DC ' + G.DERIVED.spellSaveDC);
  expect(await readShown(page, 'spellAttackBonus'), 'spell attack bonus right after load').toBe('+' + G.DERIVED.spellAttackBonus);

  // XP is set through the XP dialog and shown as a progress readout
  expect(await readShown(page, 'xpValue'), 'xp value').toBe(G.XP_TO_ADD.toLocaleString('en-US'));
  expect(await readShown(page, 'xpNextDisplay'), 'xp next level').toBe('/ ' + G.DERIVED.xpNext.toLocaleString('en-US'));
  expect(await readShown(page, 'xpProgressLabel'), 'xp progress').toBe(`${(G.DERIVED.xpNext - G.XP_TO_ADD).toLocaleString('en-US')} XP to level 6`);
  expect(await readShown(page, 'exhaustionDescription'), 'exhaustion text').toContain('2 =');

  // attacks, inventory, spells, resources: rendered rows and the list state behind them
  const lists = await page.evaluate(() => ({
    attackRows: [...document.querySelectorAll('#attacksList > li')].map(li => li.textContent),
    inventoryRows: [...document.querySelectorAll('#inventoryTableBody > tr')].filter(tr => tr.querySelector('[data-inventory-edit]')).map(tr => {
      const cells = tr.querySelectorAll('td');
      return {
        name: cells[0].querySelector('strong').textContent.trim(),
        rarityBadge: cells[0].querySelector('.badge')?.textContent.trim() || '',
        notes: cells[0].querySelector('small')?.textContent.trim() || '',
        quantity: cells[1].textContent.trim(), weight: cells[2].textContent.trim(),
        equipped: cells[3].querySelector('button').classList.contains('btn-success'),
        attuned: !!cells[4].querySelector('.bi-star-fill'), total: cells[5].textContent.trim(),
      };
    }),
    spellListText: document.getElementById('characterSpellList').textContent,
    resources: [...document.querySelectorAll('#resourcesList .resource-row')].map(r => ({
      name: r.querySelector('.res-name').value, current: Number(r.querySelector('.res-current').value),
      max: Number(r.querySelector('.res-max').value), resetOn: r.querySelector('.res-reset').value,
    })),
    attackState: window.currentAttackList,
    spellState: (window.currentSpellList || []).map(s => s.title),
  }));
  expect(lists.attackRows, 'attack row count').toHaveLength(G.ATTACKS.length);
  G.ATTACKS.forEach((a, i) => {
    expect(lists.attackRows[i], `attack row ${i} name`).toContain(a.name);
    expect(lists.attackRows[i], `attack row ${i} damage`).toContain(a.damage);
    expect(lists.attackRows[i], `attack row ${i} bonus`).toContain(a.bonus);
  });
  expect(lists.attackState, 'attack list state').toEqual(G.ATTACKS);
  expect(lists.inventoryRows, 'inventory row count').toHaveLength(G.INVENTORY.length);
  expect(lists.inventoryRows, 'inventory rows').toEqual(G.INVENTORY.map(it => ({
    name: it.name, rarityBadge: it.rarity ? cap(it.rarity) : '', notes: it.notes,
    quantity: String(it.quantity), weight: it.weight.toFixed(1), equipped: it.equipped, attuned: it.attuned,
    total: (it.quantity * it.weight).toFixed(1) + ' lb',
  })));
  G.SPELL_TITLES.forEach(t => expect(lists.spellListText, `spell list shows ${t}`).toContain(t));
  expect(lists.spellState, 'spell list state').toEqual(G.SPELL_TITLES);
  expect(lists.resources, 'resource rows').toEqual(G.RESOURCES);

  // categorised notes: each category keeps its own text, and the selector stays on the category the user was in
  // (page state, remembered across loads; the exact category is pinned in character-correctness-pass.spec.js)
  expect(Object.keys(G.CATEGORISED_NOTES), 'notes category after load').toContain(await readShown(page, 'notesCategorySelect'));
  for (const [category, text] of Object.entries(G.CATEGORISED_NOTES)) {
    await setSheetFields(page, { notesCategorySelect: category });
    expect(await readShown(page, 'charExtraNotes'), `notes category ${category}`).toBe(text);
  }
  await setSheetFields(page, { notesCategorySelect: 'general' });

  // conditions, concentration, portrait
  const flags = await page.evaluate(() => ({
    active: [...document.querySelectorAll('.condition-btn.active')].map(b => b.dataset.condition).sort(),
    conc: window.currentConcentrationSpell,
    portraitShown: !document.getElementById('portraitPreview').classList.contains('d-none'),
    portraitSrc: document.getElementById('portraitPreview').getAttribute('src'),
    portraitUrl: document.getElementById('portraitUrl').value,
    portraitTransform: document.getElementById('portraitPreview').style.transform,
    usedActionButtons: ['action', 'bonusAction', 'reaction', 'move'].filter(k => document.getElementById(`btn-${k}Slot`).classList.contains('btn-secondary')),
  }));
  expect(flags.active, 'condition buttons').toEqual([...G.CONDITIONS, 'Concentrating'].sort());
  expect(flags.conc, 'concentration spell state').toBe(G.CONCENTRATION_SPELL);
  expect(flags.portraitShown, 'portrait visible').toBe(true);
  expect(flags.portraitSrc, 'portrait image').toBe(G.PORTRAIT_DATA_URL);
  expect(flags.portraitUrl, 'portrait url field').toBe(G.PORTRAIT_DATA_URL);
  expect(flags.portraitTransform, 'portrait zoom applied').toContain(`scale(${G.PORTRAIT_SCALE})`);
  expect(flags.usedActionButtons, 'action economy buttons shown as used').toEqual(G.ACTIONS_USED.map(k => k.replace('Used', '')));
}

// A representative slice of every subsystem's visible state, for comparing one blank sheet with another.
const SURFACE_FIELDS = [
  'playerName', 'charRace', 'charClass', 'charBackground', 'charLevel', 'charAlignment', 'charAC', 'charMaxHP',
  'charCurrentHP', 'charTempHP', 'charSpeed', 'statStr', 'statInt', 'modInt', 'saveIntProf', 'saveIntBonus',
  'skillArcanaProf', 'skillArcanaExp', 'skillArcanaBonus', 'skillJoAT', 'currencyGP', 'currencyPP', 'exhaustionLevel',
  'charHitDice', 'charHitDiceRemaining', 'deathSaveSuccess1', 'deathSaveStable', 'spellcastingAbility', 'slots1Max',
  'slots1Used', 'pactMax', 'charConditions', 'charConcentrating', 'charConcentrationSpell', 'charInspiration',
  'charFeatures', 'charSpells', 'charNotes', 'charTableNotes', 'charExtraNotes', 'charLanguages', 'senseDarkvision',
  'portraitUrl',
];
const readSurface = page => page.evaluate(ids => ({
  fields: Object.fromEntries(ids.map(id => { const e = document.getElementById(id); return [id, e.type === 'checkbox' ? e.checked : e.value]; })),
  attacks: window.currentAttackList.length,
  inventoryRows: document.querySelectorAll('#inventoryTableBody button[data-inventory-edit]').length,
  spells: window.currentSpellList.length,
  resources: document.querySelectorAll('#resourcesList .resource-row').length,
  activeConditions: document.querySelectorAll('.condition-btn.active').length,
  concentration: window.currentConcentrationSpell,
  portraitShown: !document.getElementById('portraitPreview').classList.contains('d-none'),
  usedActionButtons: document.querySelectorAll('#btn-actionSlot.btn-secondary, #btn-reactionSlot.btn-secondary').length,
  xpValue: document.getElementById('xpValue').textContent.trim(),
}), SURFACE_FIELDS);

test.describe('Character sheet save / load persistence', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  test('golden character: sheet -> Save -> IndexedDB record -> reload -> hydrated sheet', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page, { blank: true });
    await populateGoldenSheet(page);
    const id = await currentId(page);
    const saved = await saveViaButton(page, id);

    // the record the app actually wrote
    expect((await readPersisted(page)).map(c => c.id), 'exactly one stored character').toEqual([id]);
    expect(Number.isNaN(Date.parse(saved.lastUpdated)), 'lastUpdated is stamped on save').toBe(false);
    assertPersistedBySubsystem(saved);
    expect(withProjectedSpells(saved), 'whole persisted record (missing, extra or drifted keys)').toStrictEqual(G.buildExpectedPersisted());

    // fresh load: the app reads the record back through its own path
    await page.reload();
    await loadSheet(page, { blank: false });
    expect(await currentId(page), 'same character selected after reload').toBe(id);
    await assertHydratedSheet(page);

    // loading alone must not have altered the stored record
    expect((await readPersisted(page)).find(c => c.id === id), 'record untouched by a load').toEqual(saved);

    // a second save from the hydrated sheet is a fixed point: nothing lost or drifted through the round trip
    const resaved = await saveViaButton(page, id);
    expect(withProjectedSpells(resaved), 'record after load + re-save').toStrictEqual(G.buildExpectedPersisted());
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('switching away and back through the character selector keeps every field', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page, { blank: true });
    const blankSurface = await readSurface(page); // what a blank sheet looks like, before anything is typed
    await populateGoldenSheet(page);
    const goldenId = await currentId(page);
    await saveViaButton(page, goldenId);

    const otherId = await createBlankCharacter(page, G.OTHER_NAME);
    expect(otherId).not.toBe(goldenId);
    await saveViaButton(page, otherId);

    const options = await page.evaluate(() => [...document.getElementById('characterSelect').options].map(o => [o.value, o.text]));
    expect(options, 'selector lists both characters').toEqual(expect.arrayContaining([[goldenId, G.GOLDEN_NAME], [otherId, G.OTHER_NAME]]));

    // nothing from the golden character leaked into the other sheet: it looks like the blank sheet did
    expect(await readSheetFields(page, ['charName']), 'other character name').toEqual({ charName: G.OTHER_NAME });
    const otherSurface = await readSurface(page);
    expect(otherSurface, 'other character sheet, across subsystems, vs a blank sheet').toEqual(blankSurface);
    expect(otherSurface.fields.charClass, 'no golden class on the other sheet').not.toContain('Wizard');
    expect(otherSurface.fields.statInt, 'no golden Int on the other sheet').not.toBe('19');

    const goldenBeforeReturn = (await readPersisted(page)).find(c => c.id === goldenId);
    await selectCharacter(page, goldenId);
    await assertHydratedSheet(page);

    // switching back and hydrating did not rewrite the golden record (same lastUpdated, same content)
    const stored = await readPersisted(page);
    const golden = stored.find(c => c.id === goldenId);
    expect(golden, 'golden record unchanged by switching back to it').toStrictEqual(goldenBeforeReturn);
    expect(withProjectedSpells(golden), 'golden record after switching').toStrictEqual(G.buildExpectedPersisted());
    expect(stored.find(c => c.id === otherId).name, 'other character kept its own name').toBe(G.OTHER_NAME);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('derived values are recalculated from the stats and level on save', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page, { blank: true });
    await populateGoldenSheet(page);
    await setSheetFields(page, { statInt: '12', charLevel: '9' });
    const saved = await saveViaButton(page, await currentId(page));
    expect(saved.statMods.int, 'int modifier').toBe(1);
    expect(saved.proficiencyBonus, 'proficiency bonus at level 9').toBe(4);
    expect(saved.savingThrows.int, 'int save (proficient)').toEqual({ prof: true, bonus: 1 + 4 });
    expect(saved.skills.arcana.bonus, 'arcana (expertise)').toBe(1 + 4 * 2);
    expect(saved.skills.athletics.bonus, 'athletics (not proficient, Jack of All Trades: half of +4)').toBe(-1 + 2);
    expect(saved.spellSlots['5'].max, 'level 5 slot max at wizard 9').toBe(1);
    expect(await readShown(page, 'spellSaveDC'), 'spell save DC after the stat edit').toBe('DC ' + (8 + 4 + 1));
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a multiclass class field is saved as separate classes', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page, { blank: true });
    await setSheetFields(page, { charName: 'Two Classes', charClass: 'Paladin 3 / Wizard (Evocation) 2', charLevel: '5' });
    const saved = await saveViaButton(page, await currentId(page));
    expect(saved.multiclass).toBe(true);
    expect(saved.classes.map(c => [c.className, c.subclass, c.level]), 'classes, subclasses and typed levels parsed from the field').toEqual([['Paladin', '', 3], ['Wizard', 'Evocation', 2]]);
    expect([saved.charClass, saved.subclass], 'primary class mirrors the first class').toEqual(['Paladin', '']);
    await page.reload();
    await loadSheet(page, { blank: false });
    expect((await readPersisted(page))[0], 'a load leaves the multiclass record as saved').toEqual(saved);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test.describe('legacy and compatibility behavior', () => {
    const legacy = () => ({
      id: 'legacy-1', name: 'Legacy Larry', charClass: 'Wizard', level: 5,
      stats: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 },
      extraNotes: 'old flat notes', // before categorised notes: one flat text
      resources: { res1: { name: 'Old One', current: 1, max: 2 } }, // before resources were a list
      // derived values that are stale on purpose
      proficiencyBonus: 9, statMods: { str: 9, dex: 9, con: 9, int: 9, wis: 9, cha: 9 },
      savingThrows: { int: { prof: true, bonus: 99 } }, skills: { arcana: { prof: true, exp: false, bonus: 99 } },
      spellSlots: { 1: { max: 9, used: 1 } },
    });

    test('flat extra notes become the General note, and stale derived values are recalculated', async ({ page }) => {
      const errors = watchErrors(page);
      await loadSheet(page, { blank: true });
      await seedPersisted(page, [legacy()]);
      await page.reload();
      await loadSheet(page, { blank: false });

      // on the sheet
      expect(await readShown(page, 'notesCategorySelect')).toBe('general');
      expect(await readShown(page, 'charExtraNotes'), 'legacy flat notes shown as General').toBe('old flat notes');
      expect(await readShown(page, 'charProficiencyBonusDisplay'), 'proficiency bonus recalculated').toBe('+3');
      expect(await readShown(page, 'saveIntBonus'), 'int save recalculated').toBe('7');
      expect(await readShown(page, 'skillArcanaBonus'), 'arcana recalculated').toBe('7');
      expect(await readShown(page, 'slots1Max'), 'slot max from the class table').toBe('4');
      expect(await readShown(page, 'slots1Used'), 'used slots are source data, kept').toBe('1');
      expect(await page.evaluate(() => [...document.querySelectorAll('#resourcesList .resource-row')].map(r => [r.querySelector('.res-name').value, r.querySelector('.res-current').value, r.querySelector('.res-max').value, r.querySelector('.res-reset').value])), 'old-style resources shown as rows').toEqual([['Old One', '1', '2', 'long']]);

      // a load does not rewrite the record; the next save does
      expect((await readPersisted(page))[0].proficiencyBonus, 'stored record untouched by a load').toBe(9);
      const saved = await saveViaButton(page, 'legacy-1');
      expect(saved.categorizedNotes, 'flat notes migrated into categorizedNotes.general').toEqual({ general: 'old flat notes', sessionNotes: '', lootLeads: '', questHooks: '' });
      expect(saved.extraNotes, 'the flat field is kept as it was').toBe('old flat notes');
      expect(saved.proficiencyBonus).toBe(3);
      expect(saved.statMods.int).toBe(4);
      expect(saved.savingThrows.int).toEqual({ prof: true, bonus: 7 });
      expect(saved.skills.arcana).toEqual({ prof: true, exp: false, bonus: 7 });
      expect(saved.spellSlots['1']).toEqual({ max: 4, used: 1 });
      expect(saved.resources, 'resources saved as a list').toEqual([{ name: 'Old One', current: 1, max: 2, resetOn: 'long' }]);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  });
});

// ---- regressions for load-time derived values and multiclass round trips ----

const reload = async page => { await page.reload(); await loadSheet(page, { blank: false }); };

// Opens the multiclass dialog and waits until its fade-in has finished (Bootstrap ignores hide() before that).
const openMulticlassDialog = page => page.evaluate(() => new Promise(resolve => {
  document.getElementById('multiclassModal').addEventListener('shown.bs.modal', () => resolve(), { once: true });
  document.getElementById('manageMulticlassBtn').click();
}));

test.describe('Derived values right after a load', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  const caster = { charName: 'Caster', charClass: 'Wizard', charLevel: '5', spellcastingAbility: 'int', statStr: '10', statDex: '10', statCon: '10', statInt: '19', statWis: '8', statCha: '10' };

  test('spell save DC and attack bonus are right as soon as a saved character loads, and stay right on the next save', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page, { blank: true });
    await setSheetFields(page, caster);
    const id = await currentId(page);
    const saved = await saveViaButton(page, id);

    await reload(page); // no stat is edited from here on
    expect(await readShown(page, 'spellSaveDC'), 'spell save DC right after load').toBe('DC 15'); // 8 + 3 + Int mod 4
    expect(await readShown(page, 'spellAttackBonus'), 'spell attack right after load').toBe('+7'); // 3 + 4

    const resaved = await saveViaButton(page, id);
    expect(pick(resaved, ['statMods', 'proficiencyBonus', 'spellcastingAbility', 'stats']), 'derived and source values persisted by the save after the load').toEqual({
      statMods: { str: 0, dex: 0, con: 0, int: 4, wis: -1, cha: 0 }, proficiencyBonus: 3, spellcastingAbility: 'int',
      stats: saved.stats,
    });
    await reload(page);
    expect(await readShown(page, 'spellSaveDC'), 'spell save DC after a second load').toBe('DC 15');
    expect(normalizePersisted(await saveViaButton(page, id)), 'a further load + save changes nothing').toStrictEqual(normalizePersisted(resaved));
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('with Jack of All Trades on, passive Investigation is the same after a load and after the next save', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page, { blank: true });
    await setSheetFields(page, { ...caster, skillJoAT: true }); // Int 19 (+4), proficiency +3, not proficient in Investigation
    const id = await currentId(page);
    const saved = await saveViaButton(page, id);
    expect(saved.senses.passiveInvestigation, 'passive Investigation saved as 10 + 4 + 1').toBe(15);

    await reload(page);
    expect(await readShown(page, 'charPassiveInvestigation'), 'passive Investigation right after load').toBe('15');

    const resaved = await saveViaButton(page, id);
    expect(resaved.senses.passiveInvestigation, 'passive Investigation did not drift on the next save').toBe(15);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Class and multiclass round trips', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  // Two classes with different levels and subclasses; the field text can not carry the levels.
  const MULTI_CLASSES = [
    { className: 'Cleric', subclass: 'Life Domain', level: 2, subclassLevel: 1 },
    { className: 'Wizard', subclass: 'Evocation', level: 3, subclassLevel: 2 },
  ];
  const multiRecord = () => ({
    id: 'multi-1', name: 'Two Classes', charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1, level: 5,
    multiclass: true, classes: MULTI_CLASSES.map(c => ({ ...c })), stats,
  });
  const singleRecord = () => ({
    id: 'single-1', name: 'One Class', charClass: 'Paladin', subclass: 'Oath of Devotion', subclassLevel: 3, level: 5,
    multiclass: false, classes: [], stats,
  });
  const classShape = rec => ({ multiclass: rec.multiclass, charClass: rec.charClass, subclass: rec.subclass, subclassLevel: rec.subclassLevel, level: rec.level, classes: rec.classes });

  async function seedAndLoad(page, record) {
    await loadSheet(page, { blank: true });
    await seedPersisted(page, [record]);
    await reload(page);
  }

  test('a multiclass character survives repeated load -> save -> reload cycles with nothing lost', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, multiRecord());
    const expected = { multiclass: true, charClass: 'Cleric', subclass: 'Life Domain', subclassLevel: 1, level: 5, classes: MULTI_CLASSES };

    for (let cycle = 1; cycle <= 2; cycle++) {
      const at = `cycle ${cycle}`;
      expect(await readShown(page, 'charClass'), `${at}: class field shows every class`).toBe('Cleric (Life Domain) / Wizard (Evocation)');
      expect(await readShown(page, 'charLevel'), `${at}: total level on the sheet`).toBe('5');
      const saved = await saveViaButton(page, 'multi-1'); // no edits at all
      expect(classShape(saved), `${at}: persisted class data`).toStrictEqual(expected);
      expect(saved.classes.reduce((sum, c) => sum + c.level, 0), `${at}: class levels add up to the total level`).toBe(saved.level);
      await reload(page);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a saved multiclass record whose class levels do not add up to the total level is kept as it is', async ({ page }) => {
    // Shape left behind by older versions: every class at level 1 under a level 5 character. There is no way to tell
    // which class the missing levels belong to, so a load and save must not guess; this pins that, it does not endorse it.
    const record = multiRecord();
    record.classes = record.classes.map(c => ({ ...c, level: 1 }));
    await seedAndLoad(page, record);
    expect(await readShown(page, 'charClass'), 'class field').toBe('Cleric (Life Domain) / Wizard (Evocation)');
    for (let cycle = 1; cycle <= 2; cycle++) {
      const saved = await saveViaButton(page, 'multi-1');
      expect(saved.classes.map(c => [c.className, c.subclass, c.level, c.subclassLevel]), `cycle ${cycle}: class data as stored`).toEqual([
        ['Cleric', 'Life Domain', 1, 1], ['Wizard', 'Evocation', 1, 2],
      ]);
      expect([saved.multiclass, saved.level], `cycle ${cycle}: multiclass flag and total level`).toEqual([true, 5]);
      await reload(page);
    }
  });

  test('a single-class character stays single-class through the same cycles', async ({ page }) => {
    await seedAndLoad(page, singleRecord());
    for (let cycle = 1; cycle <= 2; cycle++) {
      const at = `cycle ${cycle}`;
      expect(await readShown(page, 'charClass'), `${at}: class field`).toBe('Paladin (Oath of Devotion)');
      const saved = await saveViaButton(page, 'single-1');
      expect(classShape(saved), `${at}: persisted class data`).toStrictEqual({
        multiclass: false, charClass: 'Paladin', subclass: 'Oath of Devotion', subclassLevel: 3, level: 5, classes: [],
      });
      await reload(page);
    }
  });

  test('editing the class field of a multiclass character keeps the levels of classes that remain', async ({ page }) => {
    await seedAndLoad(page, multiRecord());
    await setSheetFields(page, { charClass: 'Cleric (Life Domain) / Wizard (Abjuration)' }); // change one subclass
    const saved = await saveViaButton(page, 'multi-1');
    expect(saved.classes.map(c => [c.className, c.subclass, c.level]), 'levels carried over by class name').toEqual([
      ['Cleric', 'Life Domain', 2], ['Wizard', 'Abjuration', 3],
    ]);
    expect(saved.classes[0].subclassLevel, 'unchanged subclass keeps its level').toBe(1);
  });

  test('the multiclass dialog writes the levels it shows, and reopening it shows them again', async ({ page }) => {
    const errors = watchErrors(page);
    await seedAndLoad(page, singleRecord());
    await openMulticlassDialog(page);
    const setEntry = (index, field, value) => page.evaluate(([i, f, v]) => {
      const el = document.querySelector(`#multiclassClassList [data-index="${i}"][data-field="${f}"]`);
      el.value = v; el.dispatchEvent(new Event('change', { bubbles: true }));
    }, [index, field, value]);
    await setEntry(0, 'level', '3');
    await page.evaluate(() => document.getElementById('addMulticlassBtn').click());
    await setEntry(1, 'className', 'Wizard');
    await setEntry(1, 'subclass', 'Evocation');
    await setEntry(1, 'level', '2');
    await page.evaluate(() => document.getElementById('applyMulticlassBtn').click());
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    await expect.poll(async () => (await readPersisted(page))[0].multiclass, { message: 'dialog saved the multiclass character' }).toBe(true);

    const stored = (await readPersisted(page))[0];
    expect(stored.classes.map(c => [c.className, c.subclass, c.level]), 'levels chosen in the dialog').toEqual([['Paladin', 'Oath of Devotion', 3], ['Wizard', 'Evocation', 2]]);
    expect(stored.classes[0].subclassLevel, 'the single class subclass keeps its level').toBe(3);
    expect(stored.classes[1].subclassLevel, 'a new subclass starts at its class level').toBe(2);

    await reload(page);
    expect(await readShown(page, 'charClass')).toBe('Paladin (Oath of Devotion) / Wizard (Evocation)');
    const again = await saveViaButton(page, 'single-1');
    expect(again.classes, 'a save after the reload keeps the dialog levels').toEqual(stored.classes);

    await openMulticlassDialog(page);
    expect(await page.evaluate(() => [...document.querySelectorAll('#multiclassClassList [data-field="level"]')].map(e => e.value)), 'dialog reopens with both classes and their levels').toEqual(['3', '2']);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
