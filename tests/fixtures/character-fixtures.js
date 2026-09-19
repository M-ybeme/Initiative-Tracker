// A "golden" character for the sheet save/load characterization test (tests/e2e/character-persistence.spec.js).
//
// Every value is deliberately distinctive so a field that is dropped, swapped with another, or reset to a default
// on save or load shows up. Only fields the sheet really persists are here. The character is a consistent
// single-class caster (Wizard 5), because several fields are recalculated from the stats, level and class on every
// save and load (see DERIVED below), and the test asserts those as recalculated values, not as typed values.

export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export const GOLDEN_NAME = 'Zephyrine Quillfeather';
export const OTHER_NAME = 'Other Sheet Person';

// Scalar inputs, typed into the sheet's own fields by element id.
export const SCALAR_FIELDS = {
  charName: GOLDEN_NAME,
  playerName: 'Marlowe the Player',
  charRace: 'Aasimar',
  charClass: 'Wizard (Evocation)', // the class field: "Class (Subclass)"
  charBackground: 'Sage of the Hollow Library',
  charLevel: '5',
  charAlignment: 'Chaotic Good',
  charRoleNotes: 'Party blaster; keeps the map',
  charAC: '17',
  charMaxHP: '38',
  charCurrentHP: '29',
  charTempHP: '6',
  charSpeed: '35 ft, 20 ft climb',
  charInitMod: '3',
  exhaustionLevel: '2',
  charHitDice: '5d6',
  charHitDiceRemaining: '3',
  charInspiration: true,
  spellcastingAbility: 'int',
  statStr: '9', statDex: '15', statCon: '13', statInt: '19', statWis: '11', statCha: '7',
  currencyCP: '41', currencySP: '32', currencyEP: '23', currencyGP: '1234', currencyPP: '5',
  includeCoinWeight: true,
  charLanguages: 'Common, Celestial, Draconic',
  charArmorWeaponProf: 'Daggers, quarterstaffs',
  charToolProf: "Calligrapher's supplies",
  saveNotes: 'Advantage vs charm (fixture)',
  skillsNotes: 'Skill notes (fixture)',
  skillJoAT: true,
  senseDarkvision: '60', senseBlindsight: '5', senseTremorsense: '10', senseTruesight: '15',
  sensesNotes: 'Sees in dim light (fixture)',
  charFeatures: 'Arcane Recovery; Sculpt Spells',
  charSpells: 'Spell notes line (fixture)',
  charNotes: 'Free-form notes (fixture)',
  charTableNotes: 'At-the-table notes (fixture)',
  // spell slot "used" counts are source data; the maxes are recalculated (see STALE_TYPED_VALUES)
  slots1Used: '1', slots2Used: '2', slots3Used: '1',
  pactLevel: '2', pactMax: '2', pactUsed: '1',
};

// Deliberately wrong values typed into fields the app recalculates. They are used only to populate the sheet, to
// prove the app overwrites them; the expected values live in DERIVED and never read from here.
export const STALE_TYPED_VALUES = { slots1Max: '9', saveIntBonus: '99', skillArcanaBonus: '99' };

export const SAVE_PROFS = ['Int', 'Wis'];
export const SKILL_PROFS = ['Arcana', 'History', 'Insight', 'Perception', 'Stealth'];
export const SKILL_EXPERTISE = ['Arcana'];
export const DEATH_SAVES = { successes: 2, failures: 1, stable: true };

// Categorised notes, typed one category at a time through the notes-category selector.
export const CATEGORISED_NOTES = {
  general: 'General note, first line\nGeneral note, second line',
  sessionNotes: 'Session 12: the bridge collapsed',
  lootLeads: 'The crypt key is in the well',
  questHooks: 'A sealed letter for the Duke',
};

export const ATTACKS = [
  { name: 'Fire Bolt Staff', type: 'melee-weapon', range: '5 ft', bonus: '+7', saveDC: '', damage: '1d8+3', damageType: 'fire', damage2: '1d6', damageType2: 'radiant', properties: 'Versatile', offhand: false },
  { name: 'Hurled Inkpot', type: 'ranged-weapon', range: '20/60', bonus: '+4', saveDC: '15', damage: '2d4', damageType: 'acid', damage2: '', damageType2: '', properties: 'Thrown, improvised', offhand: true },
];

export const INVENTORY = [
  { name: 'Wand of Secrets', quantity: 1, weight: 1, equipped: true, attuned: true, magical: true, rarity: 'uncommon', notes: 'Pulses near hidden doors' },
  { name: 'Ration Tin', quantity: 7, weight: 2.5, equipped: false, attuned: false, magical: false, rarity: '', notes: 'Smells of fish' },
];

export const RESOURCES = [
  { name: 'Arcane Recovery', current: 1, max: 1, resetOn: 'long' },
  { name: 'Portent Die', current: 2, max: 3, resetOn: 'short' },
];

// Spells added from the spell search by title (the persisted entries come from the library).
export const SPELL_TITLES = ['Magic Missile', 'Shield', 'Fireball'];

// Condition toggle buttons pressed on the sheet (data-condition values).
export const CONDITIONS = ['Poisoned', 'Prone'];

// Action-economy buttons pressed on the sheet; the rest stay unused.
export const ACTIONS_USED = ['actionUsed', 'reactionUsed'];

export const CONCENTRATION_SPELL = 'Shield';
export const XP_TO_ADD = 7345; // under the level 6 threshold, so no level-up prompt opens

// 1x1 transparent PNG: enough for the sheet to accept a portrait without a network request.
export const PORTRAIT_SCALE = 1.5; // set with the portrait dialog's zoom slider (the offsets need a drag, so stay 0)
export const PORTRAIT_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Values the app recalculates from the stats, level, class and proficiencies on every save and load.
// These are NOT what was typed; they are what the app computes for the golden character (level 5 => +3 proficiency).
export const DERIVED = {
  proficiencyBonus: 3,
  statMods: { str: -1, dex: 2, con: 1, int: 4, wis: 0, cha: -2 },
  savingThrows: { str: -1, dex: 2, con: 1, int: 7, wis: 3, cha: -2 },
  skills: {
    arcana: 10, history: 7, insight: 3, perception: 3, stealth: 5, // proficient (arcana has expertise)
    // Not proficient: ability modifier + 1, because Jack of All Trades adds half of the +3 proficiency bonus.
    acrobatics: 3, animalHandling: 1, athletics: 0, deception: -1, intimidation: -1, investigation: 5,
    medicine: 1, nature: 5, performance: -1, persuasion: -1, religion: 5, sleightOfHand: 3, survival: 1,
  },
  passivePerception: 13,
  passiveInvestigation: 15, // 10 + investigation bonus 5 (Int mod 4 + Jack of All Trades 1)
  passiveInsight: 13, // 10 + insight bonus 3
  // Wizard 5 slot maxes from the class table, replacing whatever was typed into the max boxes.
  spellSlotMax: { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  spellSaveDC: 15, // 8 + proficiency 3 + Int mod 4
  spellAttackBonus: 7, // proficiency 3 + Int mod 4
  xpNext: 14000,
};

// What a persisted spell entry is reduced to for the canonical comparison (the library supplies the rest).
export const SPELL_PROJECTION = {
  'Magic Missile': { name: 'Magic Missile', title: 'Magic Missile', level: 1, source: 'builtin' },
  Shield: { name: 'Shield', title: 'Shield', level: 1, source: 'builtin' },
  Fireball: { name: 'Fireball', title: 'Fireball', level: 3, source: 'builtin' },
};
export const projectSpell = s => ({ name: s.name, title: s.title, level: s.level, source: s.source });

// The one canonical persisted record the golden sheet should save as, minus the generated id and lastUpdated.
// spellList is projected to the fields the test pins (name, title, level, source): the rest is library text.
export function buildExpectedPersisted() {
  const S = SCALAR_FIELDS;
  return {
    name: S.charName, playerName: S.playerName, race: S.charRace,
    charClass: 'Wizard', subclass: 'Evocation', subclassLevel: 2,
    background: S.charBackground, level: 5, alignment: S.charAlignment, xp: XP_TO_ADD, roleNotes: S.charRoleNotes,
    multiclass: false, classes: [],
    ac: 17, maxHP: 38, currentHP: 29, tempHP: 6, speed: S.charSpeed, initMod: 3,
    passivePerception: DERIVED.passivePerception,
    conditions: 'Poisoned, Prone, Concentrating', inspiration: true,
    concentrating: true, concentrationSpell: CONCENTRATION_SPELL,
    actionUsed: true, bonusActionUsed: false, reactionUsed: true, moveUsed: false,
    currency: { cp: 41, sp: 32, ep: 23, gp: 1234, pp: 5 },
    deathSaves: { ...DEATH_SAVES },
    exhaustion: 2,
    stats: { str: 9, dex: 15, con: 13, int: 19, wis: 11, cha: 7 },
    statMods: { ...DERIVED.statMods },
    savingThrows: Object.fromEntries(Object.keys(DERIVED.savingThrows).map(ab => [ab, {
      prof: SAVE_PROFS.includes(cap(ab)), bonus: DERIVED.savingThrows[ab],
    }])),
    saveNotes: S.saveNotes,
    skills: Object.fromEntries(Object.keys(DERIVED.skills).map(k => [k, {
      prof: SKILL_PROFS.includes(cap(k)), exp: SKILL_EXPERTISE.includes(cap(k)), bonus: DERIVED.skills[k],
    }])),
    skillsNotes: S.skillsNotes,
    senses: {
      passivePerception: DERIVED.passivePerception, passiveInvestigation: DERIVED.passiveInvestigation,
      passiveInsight: DERIVED.passiveInsight,
      darkvision: 60, blindsight: 5, tremorsense: 10, truesight: 15, notes: S.sensesNotes,
    },
    hitDice: S.charHitDice, hitDiceRemaining: S.charHitDiceRemaining, // stored as typed: text, not a number
    resources: RESOURCES.map(r => ({ ...r })),
    features: S.charFeatures, spells: S.charSpells,
    spellList: SPELL_TITLES.map(t => ({ ...SPELL_PROJECTION[t] })),
    attacks: ATTACKS.map(a => ({ ...a })),
    inventory: '', inventoryItems: INVENTORY.map(i => ({ ...i })),
    notes: S.charNotes, tableNotes: S.charTableNotes, extraNotes: '',
    spellcastingAbility: 'int',
    spellSlots: Object.fromEntries(Object.entries(DERIVED.spellSlotMax).map(([lvl, max]) => [lvl, {
      max, used: { 1: 1, 2: 2, 3: 1 }[lvl] || 0,
    }])),
    pactSlots: { level: 2, max: 2, used: 1 },
    portraitType: 'url', portraitData: PORTRAIT_DATA_URL, portraitSettings: { scale: PORTRAIT_SCALE, offsetX: 0, offsetY: 0 },
    proficiencyBonus: DERIVED.proficiencyBonus,
    includeCoinWeight: true, skillJoAT: true,
    languages: S.charLanguages, armorWeaponProf: S.charArmorWeaponProf, toolProf: S.charToolProf,
    categorizedNotes: { ...CATEGORISED_NOTES },
  };
}
