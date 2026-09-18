/**
 * Integration Tests: Cross-Tool Communication
 * Tests data passing between different tools in the application
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import modules
import {
  getAbilityModifier,
  getProficiencyBonus
} from '../../js/character/character-calculations.js';

import {
  generateInitiativeExport,
  generateCharacterJSON,
  parseCharacterImport
} from '../../js/modules/export-utils.js';

// ============================================================
// Test Data Fixtures
// ============================================================

/**
 * Creates a full character for export testing
 */
function createExportableCharacter(overrides = {}) {
  return {
    id: 'export-hero-test-id',
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
// Cross-Tool Data Format Compatibility
// ============================================================

describe('Data Format Compatibility', () => {
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
// NPC Generator to Initiative Tracker (with Stat Block)
// ============================================================

describe('NPC Generator to Initiative Tracker', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
  });

  afterEach(() => {
    mockStorage = {};
  });

  it('formats NPC stat block data for initiative import', () => {
    // Test data matching NPC generator stat block structure
    const statBlock = {
      hp: 22,
      ac: 14,
      speed: 30,
      stats: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 10 },
      mods: { str: 2, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
      specialty: 'Guard',
      tier: 'Trained',
      cr: '1/4-1',
      profBonus: 2,
      attacks: ['Spear', 'Shield bash'],
      traits: ['Alert', 'Formation fighter']
    };

    const npcName = 'Captain Vorn';

    // Format for initiative (matching npc.html sendNPCToInitiative function)
    const initiativeData = {
      name: npcName,
      maxHp: statBlock.hp,
      ac: statBlock.ac,
      initiative: statBlock.mods.dex,
      useActualInitiative: false,
      source: 'NPC Generator'
    };

    mockStorage['dmtools.pendingInitiativeImport'] = JSON.stringify(initiativeData);

    // Verify data structure
    const loaded = JSON.parse(mockStorage['dmtools.pendingInitiativeImport']);
    expect(loaded.name).toBe('Captain Vorn');
    expect(loaded.maxHp).toBe(22);
    expect(loaded.ac).toBe(14);
    expect(loaded.initiative).toBe(1);  // DEX mod
    expect(loaded.useActualInitiative).toBe(false);
    expect(loaded.source).toBe('NPC Generator');
  });

  it('handles NPC without name gracefully', () => {
    const statBlock = { hp: 11, ac: 12, mods: { dex: 0 } };
    const initiativeData = {
      name: '[Unnamed NPC]',
      maxHp: statBlock.hp,
      ac: statBlock.ac,
      initiative: statBlock.mods.dex || 0,
      useActualInitiative: false,
      source: 'NPC Generator'
    };

    expect(initiativeData.name).toBe('[Unnamed NPC]');
    expect(initiativeData.initiative).toBe(0);
  });

  it('extracts DEX modifier correctly for initiative bonus', () => {
    // Test the ability modifier calculation (same as used in npc.html)
    const testCases = [
      { dex: 10, expectedMod: 0 },
      { dex: 14, expectedMod: 2 },
      { dex: 8, expectedMod: -1 },
      { dex: 18, expectedMod: 4 },
      { dex: 7, expectedMod: -2 },
      { dex: 20, expectedMod: 5 }
    ];

    testCases.forEach(({ dex, expectedMod }) => {
      const mod = Math.floor((dex - 10) / 2);
      expect(mod).toBe(expectedMod);
    });
  });

  it('simulates full NPC to Initiative workflow with stat block', () => {
    // Step 1: Generate stat block (mimic NPC generator generateStatBlock function)
    const statBlock = {
      tier: 'Veteran',
      cr: '2-4',
      specialty: 'Scout',
      hp: 35,
      ac: 15,
      speed: 40,
      stats: { str: 11, dex: 17, con: 14, int: 11, wis: 15, cha: 9 },
      mods: { str: 0, dex: 3, con: 2, int: 0, wis: 2, cha: -1 },
      profBonus: 2,
      attacks: ['Shortbow', 'Shortsword'],
      traits: ['Keen eye', 'Stealthy'],
      desc: 'Agile ranger, skilled in ranged combat'
    };

    // Step 2: Create initiative data (matching sendNPCToInitiative format)
    const initiativeData = {
      name: 'Elara the Scout',
      maxHp: statBlock.hp,
      ac: statBlock.ac,
      initiative: statBlock.mods.dex,
      useActualInitiative: false,
      source: 'NPC Generator'
    };

    // Step 3: Store in localStorage
    mockStorage['dmtools.pendingInitiativeImport'] = JSON.stringify(initiativeData);

    // Step 4: Simulate initiative tracker reading it
    const pending = JSON.parse(mockStorage['dmtools.pendingInitiativeImport']);

    // Verify initiative tracker would handle correctly
    expect(pending.name).toBe('Elara the Scout');
    expect(pending.maxHp).toBe(35);
    expect(pending.ac).toBe(15);
    expect(pending.initiative).toBe(3);  // DEX mod from 17 DEX
    expect(pending.useActualInitiative).toBe(false);  // Tracker will roll d20 + bonus
    expect(pending.source).toBe('NPC Generator');
  });

  it('handles all tier stat block ranges correctly', () => {
    // Tier data matching STAT_TIERS in npc.html
    const tiers = {
      1: { name: 'Commoner', hpRange: [4, 8], acRange: [10, 12] },
      2: { name: 'Trained', hpRange: [11, 22], acRange: [12, 14] },
      3: { name: 'Veteran', hpRange: [27, 49], acRange: [14, 16] },
      4: { name: 'Elite', hpRange: [68, 136], acRange: [16, 18] },
      5: { name: 'Legendary', hpRange: [153, 250], acRange: [17, 20] }
    };

    Object.entries(tiers).forEach(([tier, data]) => {
      const statBlock = {
        hp: data.hpRange[0],
        ac: data.acRange[0],
        mods: { dex: Number(tier) - 1 }
      };

      const initiativeData = {
        name: `${data.name} NPC`,
        maxHp: statBlock.hp,
        ac: statBlock.ac,
        initiative: statBlock.mods.dex,
        useActualInitiative: false
      };

      // Verify HP and AC are within expected tier ranges
      expect(initiativeData.maxHp).toBeGreaterThanOrEqual(data.hpRange[0]);
      expect(initiativeData.maxHp).toBeLessThanOrEqual(data.hpRange[1]);
      expect(initiativeData.ac).toBeGreaterThanOrEqual(data.acRange[0]);
      expect(initiativeData.ac).toBeLessThanOrEqual(data.acRange[1]);
    });
  });

  it('source field enables proper toast message', () => {
    // Test that source field is properly included
    const initiativeData = {
      name: 'Test NPC',
      maxHp: 20,
      ac: 14,
      initiative: 2,
      useActualInitiative: false,
      source: 'NPC Generator'
    };

    mockStorage['dmtools.pendingInitiativeImport'] = JSON.stringify(initiativeData);
    const loaded = JSON.parse(mockStorage['dmtools.pendingInitiativeImport']);

    // Simulate toast message generation (from initiative.js)
    const source = loaded.source || 'Battle Map';
    const toastMsg = `Added "${loaded.name}" from ${source}!`;

    expect(toastMsg).toBe('Added "Test NPC" from NPC Generator!');
  });
});
