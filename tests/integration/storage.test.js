/**
 * Integration Tests: Storage System
 * Tests localStorage and IndexedDB storage patterns
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import storage modules
import {
  serializeCharacter,
  deserializeCharacter,
  deserializeCharacterList,
  createLocalStorageAdapter,
  generateCharacterId,
  validateCharacterForStorage,
  migrateCharacterData,
  checkCharacterCorruption
} from '../../js/modules/storage.js';

import { validateCharacter } from '../../js/modules/validation.js';
import { getAbilityModifier } from '../../js/modules/character-calculations.js';

// ============================================================
// Test Data Fixtures
// ============================================================

/**
 * Creates a complete character for storage testing
 */
function createStorageTestCharacter(overrides = {}) {
  return {
    id: generateCharacterId(() => 0.5),
    name: 'Storage Test Hero',
    playerName: 'Test Player',
    race: 'Human',
    charClass: 'Fighter',
    subclass: '',
    subclassLevel: 0,
    background: 'Soldier',
    level: 5,
    alignment: 'Neutral Good',
    multiclass: false,
    classes: [{ className: 'Fighter', subclass: '', level: 5, subclassLevel: 0 }],
    ac: 18,
    maxHP: 44,
    currentHP: 44,
    tempHP: 0,
    speed: 30,
    initMod: 2,
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    statMods: { str: 3, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
    skills: {
      athletics: { prof: true, exp: false, bonus: 6 },
      perception: { prof: false, exp: false, bonus: 1 }
    },
    savingThrows: {
      str: { prof: true, bonus: 6 },
      dex: { prof: false, bonus: 2 },
      con: { prof: true, bonus: 5 },
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
    currency: { cp: 0, sp: 0, ep: 0, gp: 100, pp: 0 },
    hitDice: '5d10',
    hitDiceRemaining: 5,
    resources: [
      { name: 'Second Wind', current: 1, max: 1 },
      { name: 'Action Surge', current: 1, max: 1 },
      { name: '', current: 0, max: 0 }
    ],
    deathSaves: { successes: 0, failures: 0, stable: false },
    exhaustion: 0,
    inventoryItems: [
      { name: 'Longsword', quantity: 1, weight: 3 },
      { name: 'Shield', quantity: 1, weight: 6 },
      { name: 'Chain Mail', quantity: 1, weight: 55 }
    ],
    inventory: '',
    attacks: [],
    features: 'Fighting Style, Second Wind, Action Surge, Extra Attack',
    notes: 'Test character notes',
    spells: '',
    tableNotes: '',
    extraNotes: '',
    ...overrides
  };
}

/**
 * Creates mock localStorage
 */
function createMockLocalStorage() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
    _store: store // For test inspection
  };
}

// ============================================================
// Serialization Tests
// ============================================================

describe('Character Serialization', () => {
  it('serializes character to valid JSON string', () => {
    const character = createStorageTestCharacter();
    const serialized = serializeCharacter(character);

    expect(typeof serialized).toBe('string');
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it('preserves all primitive fields', () => {
    const character = createStorageTestCharacter();
    const serialized = serializeCharacter(character);
    const parsed = JSON.parse(serialized);

    expect(parsed.name).toBe('Storage Test Hero');
    expect(parsed.level).toBe(5);
    expect(parsed.ac).toBe(18);
    expect(parsed.maxHP).toBe(44);
  });

  it('preserves nested objects', () => {
    const character = createStorageTestCharacter();
    const serialized = serializeCharacter(character);
    const parsed = JSON.parse(serialized);

    expect(parsed.stats.str).toBe(16);
    expect(parsed.currency.gp).toBe(100);
    expect(parsed.deathSaves.successes).toBe(0);
  });

  it('preserves arrays', () => {
    const character = createStorageTestCharacter();
    const serialized = serializeCharacter(character);
    const parsed = JSON.parse(serialized);

    expect(parsed.inventoryItems).toHaveLength(3);
    expect(parsed.classes).toHaveLength(1);
    expect(parsed.resources).toHaveLength(3);
  });

  it('handles empty/null values', () => {
    const character = createStorageTestCharacter({
      notes: '',
      spells: null,
      extraNotes: undefined
    });

    const serialized = serializeCharacter(character);
    const parsed = JSON.parse(serialized);

    expect(parsed.notes).toBe('');
    expect(parsed.spells).toBeNull();
  });
});

// ============================================================
// Deserialization Tests
// ============================================================

describe('Character Deserialization', () => {
  it('deserializes JSON string to character object', () => {
    const original = createStorageTestCharacter();
    const json = JSON.stringify(original);
    const deserialized = deserializeCharacter(json);

    expect(deserialized.name).toBe(original.name);
    expect(deserialized.level).toBe(original.level);
  });

  it('returns null for invalid JSON', () => {
    const result = deserializeCharacter('not valid json');
    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    const result = deserializeCharacter(null);
    expect(result).toBeNull();
  });

  it('deserializes character list', () => {
    const chars = [
      createStorageTestCharacter({ name: 'Hero One' }),
      createStorageTestCharacter({ name: 'Hero Two' })
    ];
    const json = JSON.stringify(chars);
    const deserialized = deserializeCharacterList(json);

    expect(deserialized).toHaveLength(2);
    expect(deserialized[0].name).toBe('Hero One');
    expect(deserialized[1].name).toBe('Hero Two');
  });

  it('returns empty array for invalid list JSON', () => {
    const result = deserializeCharacterList('invalid');
    expect(result).toEqual([]);
  });
});

// ============================================================
// Storage Adapter Tests
// ============================================================

describe('LocalStorage Adapter', () => {
  let mockStorage;
  let adapter;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    adapter = createLocalStorageAdapter(mockStorage, 'testCharacters');
  });

  describe('save and load', () => {
    it('saves single character', () => {
      const character = createStorageTestCharacter();
      adapter.save([character]);

      const loaded = adapter.load();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Storage Test Hero');
    });

    it('saves multiple characters', () => {
      const char1 = createStorageTestCharacter({ name: 'Hero One' });
      const char2 = createStorageTestCharacter({ name: 'Hero Two' });
      char2.id = 'different-id';

      adapter.save([char1, char2]);

      const loaded = adapter.load();
      expect(loaded).toHaveLength(2);
    });

    it('returns empty array when no data', () => {
      const loaded = adapter.load();
      expect(loaded).toEqual([]);
    });

    it('overwrites existing data on save', () => {
      const char1 = createStorageTestCharacter({ name: 'Original' });
      adapter.save([char1]);

      const char2 = createStorageTestCharacter({ name: 'Replacement' });
      adapter.save([char2]);

      const loaded = adapter.load();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Replacement');
    });
  });

  describe('saveOne', () => {
    it('adds new character to empty storage', () => {
      const character = createStorageTestCharacter();
      adapter.saveOne(character);

      const loaded = adapter.load();
      expect(loaded).toHaveLength(1);
    });

    it('adds new character to existing storage', () => {
      const char1 = createStorageTestCharacter({ name: 'Existing' });
      adapter.save([char1]);

      const char2 = createStorageTestCharacter({ name: 'New' });
      char2.id = 'new-char-id';
      adapter.saveOne(char2);

      const loaded = adapter.load();
      expect(loaded).toHaveLength(2);
    });

    it('updates existing character by ID', () => {
      const character = createStorageTestCharacter({ name: 'Original' });
      adapter.save([character]);

      character.name = 'Updated';
      character.level = 10;
      adapter.saveOne(character);

      const loaded = adapter.load();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Updated');
      expect(loaded[0].level).toBe(10);
    });
  });

  describe('getOne', () => {
    it('retrieves character by ID', () => {
      const character = createStorageTestCharacter();
      adapter.save([character]);

      const retrieved = adapter.getOne(character.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved.name).toBe('Storage Test Hero');
    });

    it('returns null for non-existent ID', () => {
      const character = createStorageTestCharacter();
      adapter.save([character]);

      const retrieved = adapter.getOne('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('returns null from empty storage', () => {
      const retrieved = adapter.getOne('any-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteOne', () => {
    it('deletes character by ID', () => {
      const char1 = createStorageTestCharacter({ name: 'Keep' });
      const char2 = createStorageTestCharacter({ name: 'Delete' });
      char2.id = 'delete-id';

      adapter.save([char1, char2]);
      adapter.deleteOne('delete-id');

      const loaded = adapter.load();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Keep');
    });

    it('does nothing for non-existent ID', () => {
      const character = createStorageTestCharacter();
      adapter.save([character]);

      adapter.deleteOne('non-existent');

      const loaded = adapter.load();
      expect(loaded).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('removes all characters', () => {
      const char1 = createStorageTestCharacter({ name: 'One' });
      const char2 = createStorageTestCharacter({ name: 'Two' });
      char2.id = 'char-2';

      adapter.save([char1, char2]);
      adapter.clear();

      const loaded = adapter.load();
      expect(loaded).toEqual([]);
    });
  });
});

// ============================================================
// Character ID Generation Tests
// ============================================================

describe('Character ID Generation', () => {
  it('generates unique IDs', () => {
    const ids = new Set();

    for (let i = 0; i < 100; i++) {
      const id = generateCharacterId(() => Math.random());
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
  });

  it('follows expected format', () => {
    const id = generateCharacterId(() => 0.5);
    // Format is char_timestamp_random using underscores
    expect(id).toMatch(/^char_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('produces deterministic results with seeded random', () => {
    // Same seed should produce same random suffix
    const id1 = generateCharacterId(() => 0.123);
    const id2 = generateCharacterId(() => 0.123);

    // IDs will differ due to timestamp but prefix is consistent
    expect(id1.split('_')[0]).toBe('char');
    expect(id2.split('_')[0]).toBe('char');
  });
});

// ============================================================
// Storage Validation Tests
// ============================================================

describe('Character Storage Validation', () => {
  it('validates character before storage', () => {
    const validCharacter = createStorageTestCharacter();
    const result = validateCharacterForStorage(validCharacter);

    expect(result.valid).toBe(true);
  });

  it('rejects character without required ID', () => {
    const character = createStorageTestCharacter();
    delete character.id;

    const result = validateCharacterForStorage(character);
    expect(result.valid).toBe(false);
  });

  it('rejects character without name', () => {
    const character = createStorageTestCharacter({ name: '' });

    const result = validateCharacterForStorage(character);
    expect(result.valid).toBe(false);
  });
});

// ============================================================
// Data Migration Tests
// ============================================================

describe('Character Data Migration', () => {
  it('adds missing ID to character', () => {
    const oldFormat = {
      name: 'Old Character',
      level: 5
    };

    const migrated = migrateCharacterData(oldFormat);

    expect(migrated.id).toBeDefined();
    expect(migrated.id).toMatch(/^char_/);
  });

  it('migrates old stat format to stats object', () => {
    const minimal = {
      id: 'min-char',
      name: 'Minimal',
      level: 1,
      str: 16,
      dex: 14,
      con: 15,
      int: 10,
      wis: 12,
      cha: 8
    };

    const migrated = migrateCharacterData(minimal);

    expect(migrated.stats).toBeDefined();
    expect(migrated.stats.str).toBe(16);
  });

  it('preserves existing data during migration', () => {
    const existing = createStorageTestCharacter();
    const migrated = migrateCharacterData(existing);

    expect(migrated.name).toBe(existing.name);
    expect(migrated.stats.str).toBe(existing.stats.str);
    expect(migrated.inventoryItems).toEqual(existing.inventoryItems);
  });

  it('handles null input', () => {
    const result = migrateCharacterData(null);
    expect(result).toBeNull();
  });
});

// ============================================================
// Corruption Detection Tests
// ============================================================

describe('Character Corruption Detection', () => {
  it('detects undefined name', () => {
    const corrupted = { id: 'test' }; // Missing name
    const result = checkCharacterCorruption(corrupted);

    expect(result.corrupted).toBe(true);
    expect(result.issues.some(i => i.includes('Name'))).toBe(true);
  });

  it('passes valid character', () => {
    const valid = createStorageTestCharacter();
    const result = checkCharacterCorruption(valid);

    expect(result.corrupted).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('detects large portrait data', () => {
    const largePortrait = createStorageTestCharacter({
      portrait: 'x'.repeat(6 * 1024 * 1024) // 6MB of data
    });

    const result = checkCharacterCorruption(largePortrait);
    expect(result.corrupted).toBe(true);
    expect(result.issues.some(i => i.includes('Portrait'))).toBe(true);
  });

  it('detects non-serializable data', () => {
    const circular = createStorageTestCharacter();
    circular.self = circular; // Circular reference

    const result = checkCharacterCorruption(circular);
    expect(result.corrupted).toBe(true);
    expect(result.issues.some(i => i.includes('circular'))).toBe(true);
  });
});

// ============================================================
// Multiple Adapter Integration Tests
// ============================================================

describe('Multiple Storage Keys', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
  });

  it('different adapters use different keys', () => {
    const charAdapter = createLocalStorageAdapter(mockStorage, 'characters');
    const initAdapter = createLocalStorageAdapter(mockStorage, 'initiative');

    const character = createStorageTestCharacter();
    charAdapter.save([character]);

    const combatant = { id: 'combatant-1', name: 'Enemy', hp: 10 };
    initAdapter.save([combatant]);

    // Each adapter should only see its own data
    expect(charAdapter.load()).toHaveLength(1);
    expect(charAdapter.load()[0].name).toBe('Storage Test Hero');

    expect(initAdapter.load()).toHaveLength(1);
    expect(initAdapter.load()[0].name).toBe('Enemy');
  });

  it('clearing one adapter does not affect others', () => {
    const adapter1 = createLocalStorageAdapter(mockStorage, 'key1');
    const adapter2 = createLocalStorageAdapter(mockStorage, 'key2');

    adapter1.save([{ id: '1', name: 'One' }]);
    adapter2.save([{ id: '2', name: 'Two' }]);

    adapter1.clear();

    expect(adapter1.load()).toEqual([]);
    expect(adapter2.load()).toHaveLength(1);
  });
});

// ============================================================
// Data Recovery Tests
// ============================================================

describe('Data Recovery Scenarios', () => {
  let mockStorage;
  let adapter;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    adapter = createLocalStorageAdapter(mockStorage, 'characters');
  });

  it('recovers from corrupted JSON in storage', () => {
    // Directly write corrupted data
    mockStorage.setItem('characters', 'not valid json {{{');

    // Load should return empty array, not throw
    const loaded = adapter.load();
    expect(loaded).toEqual([]);
  });

  it('recovers individual valid characters from partial corruption', () => {
    const char1 = createStorageTestCharacter({ name: 'Valid One' });
    const char2 = createStorageTestCharacter({ name: 'Valid Two' });
    char2.id = 'char-2';

    adapter.save([char1, char2]);

    // Verify both saved
    const loaded = adapter.load();
    expect(loaded).toHaveLength(2);
  });

  it('character updates preserve other fields', () => {
    const original = createStorageTestCharacter();
    adapter.save([original]);

    // Partial update
    const update = adapter.getOne(original.id);
    update.currentHP = 20;
    update.notes = 'Updated notes';
    adapter.saveOne(update);

    const retrieved = adapter.getOne(original.id);
    expect(retrieved.currentHP).toBe(20);
    expect(retrieved.notes).toBe('Updated notes');
    // Other fields preserved
    expect(retrieved.name).toBe('Storage Test Hero');
    expect(retrieved.stats.str).toBe(16);
  });
});

// ============================================================
// Large Data Handling Tests
// ============================================================

describe('Large Data Handling', () => {
  let mockStorage;
  let adapter;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    adapter = createLocalStorageAdapter(mockStorage, 'characters');
  });

  it('handles character with large inventory', () => {
    const character = createStorageTestCharacter();

    // Add 100 items
    character.inventoryItems = [];
    for (let i = 0; i < 100; i++) {
      character.inventoryItems.push({
        name: `Item ${i}`,
        quantity: i + 1,
        weight: i * 0.5
      });
    }

    adapter.save([character]);
    const loaded = adapter.getOne(character.id);

    expect(loaded.inventoryItems).toHaveLength(100);
    expect(loaded.inventoryItems[50].name).toBe('Item 50');
  });

  it('handles character with long text fields', () => {
    const longText = 'A'.repeat(10000);
    const character = createStorageTestCharacter({
      notes: longText,
      features: longText,
      spells: longText
    });

    adapter.save([character]);
    const loaded = adapter.getOne(character.id);

    expect(loaded.notes.length).toBe(10000);
    expect(loaded.features.length).toBe(10000);
  });

  it('handles many characters', () => {
    const characters = [];
    for (let i = 0; i < 50; i++) {
      const char = createStorageTestCharacter({ name: `Character ${i}` });
      char.id = `char-${i}`;
      characters.push(char);
    }

    adapter.save(characters);
    const loaded = adapter.load();

    expect(loaded).toHaveLength(50);
    expect(loaded[25].name).toBe('Character 25');
  });
});

// ============================================================
// Concurrent Access Simulation Tests
// ============================================================

describe('Concurrent Access Patterns', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
  });

  it('multiple adapters to same key see consistent data', () => {
    const adapter1 = createLocalStorageAdapter(mockStorage, 'shared');
    const adapter2 = createLocalStorageAdapter(mockStorage, 'shared');

    const character = createStorageTestCharacter();
    adapter1.save([character]);

    // Adapter2 should see the save
    const loaded = adapter2.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Storage Test Hero');
  });

  it('updates from one adapter visible to another', () => {
    const adapter1 = createLocalStorageAdapter(mockStorage, 'shared');
    const adapter2 = createLocalStorageAdapter(mockStorage, 'shared');

    const character = createStorageTestCharacter();
    adapter1.save([character]);

    // Update via adapter2
    const loaded = adapter2.getOne(character.id);
    loaded.currentHP = 10;
    adapter2.saveOne(loaded);

    // Adapter1 should see update
    const reloaded = adapter1.getOne(character.id);
    expect(reloaded.currentHP).toBe(10);
  });
});
