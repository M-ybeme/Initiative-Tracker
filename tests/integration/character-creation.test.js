/**
 * Integration Tests: Character Creation Flow
 * Tests the complete character creation process from start to finish
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import pure modules for calculations
import {
  getAbilityModifier,
  getProficiencyBonus,
  getSkillBonus,
  getLevel1HP,
  getLevelUpHP,
  getTotalHP
} from '../../js/modules/character-calculations.js';

import {
  validateCharacter,
  validateCharacterName,
  validateAbilityScore,
  validateAllAbilityScores,
  validateLevel,
  validateClass,
  VALID_CLASSES,
  VALID_RACES
} from '../../js/modules/validation.js';

import {
  serializeCharacter,
  deserializeCharacter,
  createLocalStorageAdapter,
  generateCharacterId,
  migrateCharacterData
} from '../../js/modules/storage.js';

import { rollAbilityScoreSet, createSeededRandom } from '../../js/modules/dice.js';
import { FULL_CASTER_SLOTS, getMaxSpellLevel } from '../../js/modules/spell-utils.js';

// ============================================================
// Test Data Fixtures
// ============================================================

/**
 * Creates a complete character object matching the application structure
 */
function createTestCharacter(overrides = {}) {
  const baseChar = {
    id: generateCharacterId(() => 0.5),
    name: 'Test Hero',
    playerName: 'Test Player',
    race: 'Human',
    charClass: 'Fighter',
    subclass: '',
    subclassLevel: 0,
    background: 'Soldier',
    level: 1,
    alignment: 'Neutral Good',
    multiclass: false,
    classes: [{ className: 'Fighter', subclass: '', level: 1, subclassLevel: 0 }],
    ac: 16,
    maxHP: 12,
    currentHP: 12,
    tempHP: 0,
    speed: 30,
    initMod: 2,
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    statMods: { str: 3, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
    skills: {
      acrobatics: { prof: false, exp: false, bonus: 2 },
      animalHandling: { prof: false, exp: false, bonus: 1 },
      arcana: { prof: false, exp: false, bonus: 0 },
      athletics: { prof: true, exp: false, bonus: 5 },
      deception: { prof: false, exp: false, bonus: -1 },
      history: { prof: false, exp: false, bonus: 0 },
      insight: { prof: false, exp: false, bonus: 1 },
      intimidation: { prof: true, exp: false, bonus: 1 },
      investigation: { prof: false, exp: false, bonus: 0 },
      medicine: { prof: false, exp: false, bonus: 1 },
      nature: { prof: false, exp: false, bonus: 0 },
      perception: { prof: false, exp: false, bonus: 1 },
      performance: { prof: false, exp: false, bonus: -1 },
      persuasion: { prof: false, exp: false, bonus: -1 },
      religion: { prof: false, exp: false, bonus: 0 },
      sleightOfHand: { prof: false, exp: false, bonus: 2 },
      stealth: { prof: false, exp: false, bonus: 2 },
      survival: { prof: false, exp: false, bonus: 1 }
    },
    savingThrows: {
      str: { prof: true, bonus: 5 },
      dex: { prof: false, bonus: 2 },
      con: { prof: true, bonus: 4 },
      int: { prof: false, bonus: 0 },
      wis: { prof: false, bonus: 1 },
      cha: { prof: false, bonus: -1 }
    },
    spellcastingAbility: '',
    spellSlots: {},
    pactSlots: { level: 0, max: 0, used: 0 },
    spellList: [],
    conditions: '',
    inspiration: false,
    concentrating: false,
    concentrationSpell: '',
    currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 },
    hitDice: '1d10',
    hitDiceRemaining: 1,
    resources: [
      { name: 'Second Wind', current: 1, max: 1 },
      { name: '', current: 0, max: 0 },
      { name: '', current: 0, max: 0 }
    ],
    deathSaves: { successes: 0, failures: 0, stable: false },
    exhaustion: 0,
    inventoryItems: [],
    inventory: '',
    attacks: [],
    features: 'Fighting Style, Second Wind',
    notes: '',
    spells: '',
    tableNotes: '',
    extraNotes: ''
  };

  return { ...baseChar, ...overrides };
}

/**
 * Creates a spellcaster character
 */
function createSpellcasterCharacter(className = 'Wizard', level = 1) {
  const spellSlots = {};
  if (FULL_CASTER_SLOTS[level]) {
    FULL_CASTER_SLOTS[level].forEach((slots, index) => {
      spellSlots[index + 1] = { max: slots, used: 0 };
    });
  }

  return createTestCharacter({
    name: 'Test Wizard',
    charClass: className,
    level: level,
    classes: [{ className, subclass: '', level, subclassLevel: 0 }],
    stats: { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
    statMods: { str: -1, dex: 2, con: 2, int: 3, wis: 1, cha: 0 },
    spellcastingAbility: 'int',
    spellSlots: spellSlots,
    maxHP: 8 + getAbilityModifier(14), // d6 + CON
    currentHP: 8 + getAbilityModifier(14),
    hitDice: `${level}d6`
  });
}

// ============================================================
// Character Creation Flow Tests
// ============================================================

describe('Character Creation Flow', () => {
  let mockStorage;
  let storageAdapter;

  beforeEach(() => {
    // Create mock localStorage
    mockStorage = {};
    const mockLocalStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = String(value); },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    storageAdapter = createLocalStorageAdapter(mockLocalStorage, 'testCharacters');
  });

  afterEach(() => {
    mockStorage = {};
  });

  describe('Step 1: Basic Info Validation', () => {
    it('validates character name requirements', () => {
      expect(validateCharacterName('Gandalf').valid).toBe(true);
      expect(validateCharacterName('').valid).toBe(false);
      expect(validateCharacterName('A'.repeat(101)).valid).toBe(false);
    });

    it('validates race selection', () => {
      VALID_RACES.slice(0, 5).forEach(race => {
        const char = createTestCharacter({ race });
        const result = validateCharacter(char);
        expect(result.errors.race).toBeUndefined();
      });
    });

    it('validates class selection', () => {
      VALID_CLASSES.forEach(cls => {
        expect(validateClass(cls).valid).toBe(true);
      });
      expect(validateClass('InvalidClass').valid).toBe(false);
    });
  });

  describe('Step 2: Ability Score Assignment', () => {
    it('generates valid ability score sets', () => {
      const seededRandom = createSeededRandom(12345);
      const scores = rollAbilityScoreSet(seededRandom);

      expect(scores).toHaveLength(6);
      scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(18);
      });
    });

    it('validates ability score ranges', () => {
      const validScores = { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 };
      const result = validateAllAbilityScores(validScores);
      expect(result.valid).toBe(true);

      const invalidScores = { str: 0, dex: 31, con: 15, int: 10, wis: 12, cha: 8 };
      const invalidResult = validateAllAbilityScores(invalidScores);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.str).toBeDefined();
      expect(invalidResult.errors.dex).toBeDefined();
    });

    it('calculates ability modifiers correctly', () => {
      const char = createTestCharacter({
        stats: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 }
      });

      expect(getAbilityModifier(char.stats.str)).toBe(3);
      expect(getAbilityModifier(char.stats.dex)).toBe(2);
      expect(getAbilityModifier(char.stats.con)).toBe(2);
      expect(getAbilityModifier(char.stats.int)).toBe(0);
      expect(getAbilityModifier(char.stats.wis)).toBe(1);
      expect(getAbilityModifier(char.stats.cha)).toBe(-1);
    });
  });

  describe('Step 3: Class Selection and HP', () => {
    // Note: getLevel1HP takes (hitDie, conScore) not (className, conMod)
    it('calculates level 1 HP for Fighter correctly', () => {
      const hitDie = 10; // Fighter d10
      const conScore = 14; // CON 14 = +2 mod
      const hp = getLevel1HP(hitDie, conScore);
      expect(hp).toBe(12); // 10 (d10 max) + 2 (CON mod)
    });

    it('calculates level 1 HP for Wizard correctly', () => {
      const hitDie = 6; // Wizard d6
      const conScore = 14; // CON 14 = +2 mod
      const hp = getLevel1HP(hitDie, conScore);
      expect(hp).toBe(8); // 6 (d6 max) + 2 (CON mod)
    });

    it('calculates level 1 HP for Barbarian correctly', () => {
      const hitDie = 12; // Barbarian d12
      const conScore = 16; // CON 16 = +3 mod
      const hp = getLevel1HP(hitDie, conScore);
      expect(hp).toBe(15); // 12 (d12 max) + 3 (CON mod)
    });

    it('assigns proficiency bonus based on level', () => {
      expect(getProficiencyBonus(1)).toBe(2);
      expect(getProficiencyBonus(4)).toBe(2);
      expect(getProficiencyBonus(5)).toBe(3);
      expect(getProficiencyBonus(9)).toBe(4);
      expect(getProficiencyBonus(13)).toBe(5);
      expect(getProficiencyBonus(17)).toBe(6);
    });
  });

  describe('Step 4: Skill Proficiencies', () => {
    it('calculates skill bonuses with proficiency', () => {
      const level = 1;
      const strScore = 16;
      const profBonus = getProficiencyBonus(level);

      // Athletics with proficiency
      const athleticsBonus = getSkillBonus(strScore, true, level, false);
      expect(athleticsBonus).toBe(5); // +3 (STR) + 2 (prof)

      // Athletics without proficiency
      const unprofBonus = getSkillBonus(strScore, false, level, false);
      expect(unprofBonus).toBe(3); // +3 (STR) only
    });

    it('calculates skill bonuses with expertise', () => {
      const level = 1;
      const dexScore = 16;

      const expertiseBonus = getSkillBonus(dexScore, true, level, true);
      expect(expertiseBonus).toBe(7); // +3 (DEX) + 4 (double prof)
    });
  });

  describe('Step 5: Spellcaster Setup', () => {
    it('sets up spell slots for Wizard level 1', () => {
      const wizard = createSpellcasterCharacter('Wizard', 1);

      expect(wizard.spellSlots[1].max).toBe(2); // 2 first-level slots
      expect(wizard.spellcastingAbility).toBe('int');
    });

    it('sets up spell slots for Wizard level 5', () => {
      const wizard = createSpellcasterCharacter('Wizard', 5);

      expect(wizard.spellSlots[1].max).toBe(4);
      expect(wizard.spellSlots[2].max).toBe(3);
      expect(wizard.spellSlots[3].max).toBe(2);
    });

    it('determines max spell level correctly', () => {
      expect(getMaxSpellLevel('Wizard', 1)).toBe(1);
      expect(getMaxSpellLevel('Wizard', 3)).toBe(2);
      expect(getMaxSpellLevel('Wizard', 5)).toBe(3);
      expect(getMaxSpellLevel('Wizard', 9)).toBe(5);
      expect(getMaxSpellLevel('Wizard', 17)).toBe(9);
    });

    it('non-casters have no spell level access', () => {
      expect(getMaxSpellLevel('Fighter', 10)).toBe(0);
      expect(getMaxSpellLevel('Barbarian', 20)).toBe(0);
    });
  });

  describe('Step 6: Complete Character Validation', () => {
    it('validates a complete character object', () => {
      const char = createTestCharacter();
      const result = validateCharacter(char);
      expect(result.valid).toBe(true);
    });

    it('collects multiple validation errors', () => {
      const invalidChar = createTestCharacter({
        name: '',
        level: 25,
        stats: { str: 50, dex: 14, con: 15, int: 10, wis: 12, cha: 8 }
      });

      const result = validateCharacter(invalidChar);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.level).toBeDefined();
      expect(result.errors.stats).toBeDefined();
    });
  });

  describe('Step 7: Storage Persistence', () => {
    it('saves character to storage', () => {
      const char = createTestCharacter();

      storageAdapter.save([char]);
      const loaded = storageAdapter.load();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Test Hero');
    });

    it('saves and retrieves multiple characters', () => {
      const char1 = createTestCharacter({ name: 'Hero One' });
      const char2 = createTestCharacter({ name: 'Hero Two' });

      storageAdapter.save([char1, char2]);
      const loaded = storageAdapter.load();

      expect(loaded).toHaveLength(2);
      expect(loaded.map(c => c.name)).toContain('Hero One');
      expect(loaded.map(c => c.name)).toContain('Hero Two');
    });

    it('retrieves single character by ID', () => {
      const char = createTestCharacter({ name: 'Specific Hero' });
      storageAdapter.save([char]);

      const retrieved = storageAdapter.getOne(char.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved.name).toBe('Specific Hero');
    });

    it('deletes character from storage', () => {
      const char1 = createTestCharacter({ name: 'Keep Me' });
      const char2 = createTestCharacter({ name: 'Delete Me' });
      char2.id = 'delete-me-id';

      storageAdapter.save([char1, char2]);
      storageAdapter.deleteOne('delete-me-id');

      const loaded = storageAdapter.load();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Keep Me');
    });

    it('serializes and deserializes character data correctly', () => {
      const char = createTestCharacter();
      const serialized = serializeCharacter(char);
      const deserialized = deserializeCharacter(serialized);

      expect(deserialized.name).toBe(char.name);
      expect(deserialized.stats.str).toBe(char.stats.str);
      expect(deserialized.skills.athletics.prof).toBe(char.skills.athletics.prof);
    });
  });

  describe('Step 8: Character ID Generation', () => {
    it('generates unique character IDs', () => {
      const id1 = generateCharacterId(() => 0.1);
      const id2 = generateCharacterId(() => 0.9);

      expect(id1).not.toBe(id2);
      // ID format uses underscores: char_timestamp_random
      expect(id1).toMatch(/^char_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('ID format follows expected pattern', () => {
      const id = generateCharacterId(() => 0.5);
      const parts = id.split('_');

      expect(parts[0]).toBe('char');
      expect(parts[1]).toMatch(/^[a-z0-9]+$/); // timestamp in base36
      expect(parts[2]).toMatch(/^[a-z0-9]+$/); // random suffix
    });
  });
});

// ============================================================
// Race Selection Integration Tests
// ============================================================

describe('Race Selection Integration', () => {
  it('Human gets correct base stats and speed', () => {
    const human = createTestCharacter({
      race: 'Human',
      speed: 30
    });

    expect(human.race).toBe('Human');
    expect(human.speed).toBe(30);
  });

  it('Elf with subrace notation is valid', () => {
    const elf = createTestCharacter({
      race: 'Elf (High)',
      speed: 30
    });

    const result = validateCharacter(elf);
    expect(result.valid).toBe(true);
  });

  it('Dwarf with subrace notation is valid', () => {
    const dwarf = createTestCharacter({
      race: 'Dwarf (Mountain)',
      speed: 25
    });

    const result = validateCharacter(dwarf);
    expect(result.valid).toBe(true);
    expect(dwarf.speed).toBe(25);
  });
});

// ============================================================
// Class Selection Integration Tests
// ============================================================

describe('Class Selection Integration', () => {
  it('Fighter with subclass notation is valid', () => {
    const fighter = createTestCharacter({
      charClass: 'Fighter (Champion)',
      subclass: 'Champion',
      subclassLevel: 3
    });

    const result = validateCharacter(fighter);
    expect(result.valid).toBe(true);
  });

  it('Wizard with subclass notation is valid', () => {
    const wizard = createSpellcasterCharacter('Wizard', 2);
    wizard.charClass = 'Wizard (Evocation)';
    wizard.subclass = 'Evocation';
    wizard.subclassLevel = 2;

    const result = validateCharacter(wizard);
    expect(result.valid).toBe(true);
  });

  it('all PHB classes are valid', () => {
    const phbClasses = [
      'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
      'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
      'Warlock', 'Wizard'
    ];

    phbClasses.forEach(cls => {
      const char = createTestCharacter({ charClass: cls });
      const result = validateCharacter(char);
      expect(result.errors.class).toBeUndefined();
    });
  });
});

// ============================================================
// Background Selection Tests
// ============================================================

describe('Background Selection Integration', () => {
  it('character with background is valid', () => {
    const backgrounds = ['Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage', 'Soldier'];

    backgrounds.forEach(bg => {
      const char = createTestCharacter({ background: bg });
      const result = validateCharacter(char);
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================
// Starting Equipment Integration Tests
// ============================================================

describe('Starting Equipment Integration', () => {
  it('saves character with inventory items', () => {
    const char = createTestCharacter({
      inventoryItems: [
        { name: 'Longsword', quantity: 1, weight: 3 },
        { name: 'Shield', quantity: 1, weight: 6 },
        { name: 'Chain Mail', quantity: 1, weight: 55 }
      ]
    });

    const serialized = serializeCharacter(char);
    const deserialized = deserializeCharacter(serialized);

    expect(deserialized.inventoryItems).toHaveLength(3);
    expect(deserialized.inventoryItems[0].name).toBe('Longsword');
  });

  it('saves character with currency', () => {
    const char = createTestCharacter({
      currency: { cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 }
    });

    const serialized = serializeCharacter(char);
    const deserialized = deserializeCharacter(serialized);

    expect(deserialized.currency.gp).toBe(15);
  });
});

// ============================================================
// Data Migration Tests
// ============================================================

describe('Character Data Migration', () => {
  it('adds missing ID to character', () => {
    const oldCharacter = {
      name: 'Old Character',
      level: 5,
      stats: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 }
    };

    const migrated = migrateCharacterData(oldCharacter);

    expect(migrated.id).toBeDefined();
    expect(migrated.level).toBe(5);
  });

  it('migrates old stat format (str/dex/etc at root) to stats object', () => {
    const oldCharacter = {
      name: 'Old Stats Format',
      level: 3,
      str: 16,
      dex: 14,
      con: 15,
      int: 10,
      wis: 12,
      cha: 8
    };

    const migrated = migrateCharacterData(oldCharacter);

    expect(migrated.stats).toBeDefined();
    expect(migrated.stats.str).toBe(16);
  });

  it('preserves already-migrated data', () => {
    const newCharacter = createTestCharacter();
    const migrated = migrateCharacterData(newCharacter);

    expect(migrated.charClass).toBe(newCharacter.charClass);
    expect(migrated.name).toBe(newCharacter.name);
  });
});
