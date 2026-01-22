/**
 * Integration Tests: Cross-Tool Communication
 * Tests data passing between different tools in the application
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import modules
import {
  getAbilityModifier,
  getProficiencyBonus
} from '../../js/modules/character-calculations.js';

import {
  serializeCharacter,
  deserializeCharacter,
  createLocalStorageAdapter,
  generateCharacterId
} from '../../js/modules/storage.js';

import {
  generateInitiativeExport,
  generateCharacterJSON,
  parseCharacterImport
} from '../../js/modules/export-utils.js';

import {
  generateNPC,
  generateName,
  generateShopInventory,
  createSeededRandom
} from '../../js/modules/generators.js';

import { validateCharacter } from '../../js/modules/validation.js';

// ============================================================
// Test Data Fixtures
// ============================================================

/**
 * Creates a full character for export testing
 */
function createExportableCharacter(overrides = {}) {
  return {
    id: generateCharacterId(() => 0.5),
    name: 'Export Hero',
    playerName: 'Test Player',
    race: 'Human',
    charClass: 'Fighter',
    subclass: 'Champion',
    level: 5,
    alignment: 'Neutral Good',
    background: 'Soldier',
    ac: 18,
    maxHP: 44,
    currentHP: 38,
    tempHP: 0,
    speed: 30,
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    statMods: { str: 3, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
    skills: {
      athletics: { prof: true, exp: false, bonus: 6 },
      perception: { prof: true, exp: false, bonus: 4 }
    },
    savingThrows: {
      str: { prof: true, bonus: 6 },
      con: { prof: true, bonus: 5 }
    },
    inventoryItems: [
      { name: 'Longsword', quantity: 1 },
      { name: 'Shield', quantity: 1 }
    ],
    features: 'Second Wind, Action Surge, Extra Attack',
    ...overrides
  };
}

// ============================================================
// Character to Initiative Tracker Export
// ============================================================

describe('Character to Initiative Tracker Export', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
  });

  afterEach(() => {
    mockStorage = {};
  });

  it('generates initiative export format from character', () => {
    const character = createExportableCharacter();
    const exported = generateInitiativeExport(character);

    expect(exported.name).toBe('Export Hero');
    expect(exported.type).toBe('PC');
    expect(exported.hp).toBe(38);
    expect(exported.maxHp).toBe(44);
    expect(exported.ac).toBe(18);
  });

  it('calculates initiative bonus from DEX', () => {
    const character = createExportableCharacter({
      stats: { str: 10, dex: 16, con: 14, int: 10, wis: 12, cha: 8 }
    });
    const exported = generateInitiativeExport(character);

    expect(exported.initiativeBonus).toBe(3); // DEX 16 = +3
  });

  it('includes empty conditions array', () => {
    const character = createExportableCharacter();
    const exported = generateInitiativeExport(character);

    expect(exported.conditions).toEqual([]);
  });

  it('handles character with missing stats', () => {
    const character = createExportableCharacter();
    delete character.stats;
    const exported = generateInitiativeExport(character);

    expect(exported.initiativeBonus).toBe(0);
  });

  it('simulates localStorage export workflow', () => {
    const character = createExportableCharacter();
    const exported = generateInitiativeExport(character);

    // Simulate setting pending import data
    const pendingData = JSON.stringify({
      name: exported.name,
      maxHp: exported.maxHp,
      ac: exported.ac,
      initiative: exported.initiativeBonus,
      useActualInitiative: false
    });

    mockStorage['dmtools.pendingInitiativeImport'] = pendingData;

    // Simulate reading on initiative page
    const loadedData = JSON.parse(mockStorage['dmtools.pendingInitiativeImport']);

    expect(loadedData.name).toBe('Export Hero');
    expect(loadedData.maxHp).toBe(44);
    expect(loadedData.ac).toBe(18);
    expect(loadedData.initiative).toBe(2); // DEX 14 = +2
  });
});

// ============================================================
// Character JSON Export/Import
// ============================================================

describe('Character JSON Export and Import', () => {
  it('exports character to JSON format', () => {
    const character = createExportableCharacter();
    const json = generateCharacterJSON(character);

    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.exportVersion).toBe('1.0');
    expect(parsed.exportDate).toBeDefined();
    expect(parsed.character.name).toBe('Export Hero');
  });

  it('includes calculated proficiency bonus in export', () => {
    const character = createExportableCharacter({ level: 5 });
    const json = generateCharacterJSON(character);
    const parsed = JSON.parse(json);

    expect(parsed.character.proficiencyBonus).toBe(3);
  });

  it('imports character from our export format', () => {
    const character = createExportableCharacter();
    const json = generateCharacterJSON(character);

    const result = parseCharacterImport(json);

    expect(result.success).toBe(true);
    expect(result.character.name).toBe('Export Hero');
  });

  it('imports raw character object', () => {
    const rawCharacter = { name: 'Raw Import', level: 3, stats: { str: 14 } };
    const json = JSON.stringify(rawCharacter);

    const result = parseCharacterImport(json);

    expect(result.success).toBe(true);
    expect(result.character.name).toBe('Raw Import');
  });

  it('rejects invalid JSON', () => {
    const result = parseCharacterImport('not valid json');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Parse error');
  });

  it('rejects unrecognized format', () => {
    const json = JSON.stringify({ unrelated: 'data' });
    const result = parseCharacterImport(json);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unrecognized');
  });

  it('supports compact vs pretty JSON format', () => {
    const character = createExportableCharacter();

    const pretty = generateCharacterJSON(character, true);
    const compact = generateCharacterJSON(character, false);

    expect(pretty.length).toBeGreaterThan(compact.length);
    expect(pretty).toContain('\n');
    expect(compact).not.toContain('\n');
  });
});

// ============================================================
// NPC Generator to Name Generator Integration
// ============================================================

describe('NPC Generator Integration', () => {
  it('generates NPC with consistent traits', () => {
    const seededRandom = createSeededRandom(12345);
    const npc = generateNPC({}, seededRandom);

    expect(npc.personality).toBeDefined();
    expect(npc.quirk).toBeDefined();
    expect(npc.motivation).toBeDefined();
    expect(npc.occupation).toBeDefined();
  });

  it('respects occupation override', () => {
    const npc = generateNPC({ occupation: 'Blacksmith' });

    expect(npc.occupation).toBe('Blacksmith');
  });

  it('generates names by race', () => {
    const seededRandom = createSeededRandom(54321);

    const humanName = generateName('human', 'male', seededRandom);
    const elfName = generateName('elf', 'female', createSeededRandom(54321));
    const dwarfName = generateName('dwarf', 'male', createSeededRandom(54321));

    expect(humanName).toBeDefined();
    expect(elfName).toBeDefined();
    expect(dwarfName).toBeDefined();
    expect(humanName.length).toBeGreaterThan(2);
  });

  it('produces deterministic results with same seed', () => {
    const r1 = createSeededRandom(99999);
    const r2 = createSeededRandom(99999);

    const npc1 = generateNPC({}, r1);
    const npc2 = generateNPC({}, r2);

    expect(npc1.personality).toBe(npc2.personality);
    expect(npc1.quirk).toBe(npc2.quirk);
  });
});

// ============================================================
// Shop Generator to Character Inventory
// ============================================================

describe('Shop to Character Inventory Integration', () => {
  it('generates shop inventory items', () => {
    const seededRandom = createSeededRandom(11111);
    const inventory = generateShopInventory('weapons', 5, seededRandom);

    expect(inventory.length).toBeGreaterThan(0);
    expect(inventory.length).toBeLessThanOrEqual(5);

    inventory.forEach(item => {
      expect(item.name).toBeDefined();
      expect(item.price).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
    });
  });

  it('can add shop item to character inventory', () => {
    const character = createExportableCharacter();
    const seededRandom = createSeededRandom(22222);
    const shopInventory = generateShopInventory('weapons', 3, seededRandom);

    // Simulate purchasing first item
    const purchasedItem = shopInventory[0];
    character.inventoryItems.push({
      name: purchasedItem.name,
      quantity: 1,
      weight: purchasedItem.weight || 0
    });

    expect(character.inventoryItems.some(i => i.name === purchasedItem.name)).toBe(true);
  });

  it('character with added items passes validation', () => {
    const character = createExportableCharacter();
    const seededRandom = createSeededRandom(33333);
    const shopItems = generateShopInventory('armor', 2, seededRandom);

    // Add items to character
    shopItems.forEach(item => {
      character.inventoryItems.push({
        name: item.name,
        quantity: 1
      });
    });

    const result = validateCharacter(character);
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// Storage Adapter Cross-Tool Tests
// ============================================================

describe('Storage Adapter Cross-Tool Integration', () => {
  let mockStorage;
  let characterAdapter;

  beforeEach(() => {
    mockStorage = {};
    const mockLocalStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = String(value); },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    characterAdapter = createLocalStorageAdapter(mockLocalStorage, 'dmtoolboxCharactersV1');
  });

  it('saves character accessible by other tools', () => {
    const character = createExportableCharacter();
    characterAdapter.save([character]);

    // Simulate another tool reading from storage
    const rawData = mockStorage['dmtoolboxCharactersV1'];
    const parsed = JSON.parse(rawData);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Export Hero');
  });

  it('multiple characters accessible by ID', () => {
    const char1 = createExportableCharacter({ name: 'Character One' });
    const char2 = createExportableCharacter({ name: 'Character Two' });
    char2.id = 'different-id';

    characterAdapter.save([char1, char2]);

    const retrieved1 = characterAdapter.getOne(char1.id);
    const retrieved2 = characterAdapter.getOne(char2.id);

    expect(retrieved1.name).toBe('Character One');
    expect(retrieved2.name).toBe('Character Two');
  });

  it('character survives round-trip through storage', () => {
    const original = createExportableCharacter({
      spellSlots: {
        1: { max: 4, used: 1 },
        2: { max: 3, used: 0 }
      }
    });

    characterAdapter.save([original]);
    const retrieved = characterAdapter.getOne(original.id);

    expect(retrieved.name).toBe(original.name);
    expect(retrieved.stats.str).toBe(original.stats.str);
    expect(retrieved.spellSlots[1].used).toBe(1);
  });
});

// ============================================================
// Cross-Tool Data Format Compatibility
// ============================================================

describe('Data Format Compatibility', () => {
  it('character data serializes correctly for localStorage', () => {
    const character = createExportableCharacter();
    const serialized = serializeCharacter(character);

    // Verify it's valid JSON
    expect(() => JSON.parse(serialized)).not.toThrow();

    // Verify complex nested data preserved
    const parsed = JSON.parse(serialized);
    expect(parsed.stats.str).toBe(16);
    expect(parsed.inventoryItems).toHaveLength(2);
  });

  it('deserializes character with all properties intact', () => {
    const original = createExportableCharacter({
      features: 'Test Feature',
      notes: 'Some notes',
      conditions: 'Poisoned'
    });

    const serialized = serializeCharacter(original);
    const restored = deserializeCharacter(serialized);

    expect(restored.features).toBe('Test Feature');
    expect(restored.notes).toBe('Some notes');
    expect(restored.conditions).toBe('Poisoned');
  });

  it('initiative export contains all required fields', () => {
    const character = createExportableCharacter();
    const exported = generateInitiativeExport(character);

    // Required fields for initiative tracker
    expect(exported).toHaveProperty('name');
    expect(exported).toHaveProperty('hp');
    expect(exported).toHaveProperty('maxHp');
    expect(exported).toHaveProperty('ac');
    expect(exported).toHaveProperty('initiativeBonus');
    expect(exported).toHaveProperty('type');
    expect(exported).toHaveProperty('conditions');
  });
});

// ============================================================
// Edge Cases for Cross-Tool Communication
// ============================================================

describe('Cross-Tool Edge Cases', () => {
  it('handles character with special characters in name', () => {
    const character = createExportableCharacter({
      name: "Sir Reginald O'Brien III"
    });

    const json = generateCharacterJSON(character);
    const parsed = JSON.parse(json);

    expect(parsed.character.name).toBe("Sir Reginald O'Brien III");

    const result = parseCharacterImport(json);
    expect(result.success).toBe(true);
    expect(result.character.name).toBe("Sir Reginald O'Brien III");
  });

  it('handles character with unicode in notes', () => {
    const character = createExportableCharacter({
      notes: 'Found treasure 💰 in the dungeon 🏰'
    });

    const serialized = serializeCharacter(character);
    const restored = deserializeCharacter(serialized);

    expect(restored.notes).toBe('Found treasure 💰 in the dungeon 🏰');
  });

  it('handles empty character fields gracefully', () => {
    const minimalCharacter = {
      id: 'min-char',
      name: 'Minimal',
      level: 1,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    };

    const exported = generateInitiativeExport(minimalCharacter);
    expect(exported.name).toBe('Minimal');
    expect(exported.initiativeBonus).toBe(0);
  });

  it('handles null character gracefully', () => {
    expect(generateInitiativeExport(null)).toBeNull();
    expect(generateCharacterJSON(null)).toBe('{}');
    expect(parseCharacterImport(null).success).toBe(false);
  });
});

// ============================================================
// Workflow Simulation Tests
// ============================================================

describe('Complete Workflow Simulations', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
  });

  it('simulates: Create Character → Save → Export to Initiative', () => {
    // Step 1: Create character
    const character = createExportableCharacter();

    // Step 2: Validate
    const validation = validateCharacter(character);
    expect(validation.valid).toBe(true);

    // Step 3: Save to storage
    const adapter = createLocalStorageAdapter(
      {
        getItem: (key) => mockStorage[key] || null,
        setItem: (key, value) => { mockStorage[key] = String(value); }
      },
      'characters'
    );
    adapter.save([character]);

    // Step 4: Load and export to initiative
    const loaded = adapter.getOne(character.id);
    const initiativeData = generateInitiativeExport(loaded);

    // Step 5: Set pending import
    mockStorage['dmtools.pendingInitiativeImport'] = JSON.stringify({
      name: initiativeData.name,
      maxHp: initiativeData.maxHp,
      ac: initiativeData.ac,
      initiative: initiativeData.initiativeBonus
    });

    // Step 6: Verify initiative can read data
    const pending = JSON.parse(mockStorage['dmtools.pendingInitiativeImport']);
    expect(pending.name).toBe('Export Hero');
    expect(pending.maxHp).toBe(44);
  });

  it('simulates: Generate NPC → Add to Initiative', () => {
    const seededRandom = createSeededRandom(77777);

    // Step 1: Generate NPC
    const npc = generateNPC({ occupation: 'Guard' }, seededRandom);
    const npcName = generateName('human', 'male', createSeededRandom(77777));

    // Step 2: Create combatant data
    const combatant = {
      name: `${npcName} (${npc.occupation})`,
      type: 'NPC',
      ac: 16,
      maxHp: 11,
      hp: 11,
      initiativeBonus: 1,
      notes: `${npc.personality}, ${npc.quirk}`
    };

    // Step 3: Set pending import
    mockStorage['dmtools.pendingInitiativeImport'] = JSON.stringify(combatant);

    // Step 4: Verify data
    const pending = JSON.parse(mockStorage['dmtools.pendingInitiativeImport']);
    expect(pending.type).toBe('NPC');
    expect(pending.notes).toContain(npc.personality);
  });
});
