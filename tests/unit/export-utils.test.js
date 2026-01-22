import { describe, it, expect } from 'vitest';
import {
  formatModifier,
  generateCharacterText,
  generateCharacterMarkdown,
  generateCharacterJSON,
  generateStatBlock,
  generateInitiativeExport,
  parseCharacterImport
} from '../../js/modules/export-utils.js';

describe('formatModifier', () => {
  it('formats positive modifiers with +', () => {
    expect(formatModifier(14)).toBe('+2');
    expect(formatModifier(20)).toBe('+5');
  });

  it('formats zero as +0', () => {
    expect(formatModifier(10)).toBe('+0');
    expect(formatModifier(11)).toBe('+0');
  });

  it('formats negative modifiers', () => {
    expect(formatModifier(8)).toBe('-1');
    expect(formatModifier(1)).toBe('-5');
  });
});

describe('generateCharacterText', () => {
  const testCharacter = {
    name: 'Test Hero',
    race: 'Human',
    charClass: 'Fighter',
    level: 5,
    background: 'Soldier',
    alignment: 'Lawful Good',
    stats: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
    ac: 18,
    maxHP: 44,
    currentHP: 44,
    speed: 30
  };

  it('includes character name', () => {
    const text = generateCharacterText(testCharacter);
    expect(text).toContain('Test Hero');
  });

  it('includes basic info', () => {
    const text = generateCharacterText(testCharacter);
    expect(text).toContain('Race: Human');
    expect(text).toContain('Class: Fighter');
    expect(text).toContain('Level: 5');
  });

  it('includes ability scores with modifiers', () => {
    const text = generateCharacterText(testCharacter);
    expect(text).toContain('STR: 16 (+3)');
    expect(text).toContain('DEX: 14 (+2)');
    expect(text).toContain('CHA: 8 (-1)');
  });

  it('includes combat stats', () => {
    const text = generateCharacterText(testCharacter);
    expect(text).toContain('AC: 18');
    expect(text).toContain('HP: 44/44');
    expect(text).toContain('Speed: 30 ft');
  });

  it('includes proficiency bonus', () => {
    const text = generateCharacterText(testCharacter);
    expect(text).toContain('Proficiency Bonus: +3');
  });

  it('includes features if present', () => {
    const charWithFeatures = {
      ...testCharacter,
      features: [{ name: 'Second Wind' }, { name: 'Action Surge' }]
    };
    const text = generateCharacterText(charWithFeatures);
    expect(text).toContain('Second Wind');
    expect(text).toContain('Action Surge');
  });

  it('includes equipment if present', () => {
    const charWithGear = {
      ...testCharacter,
      equipment: [{ name: 'Longsword' }, { name: 'Shield' }]
    };
    const text = generateCharacterText(charWithGear);
    expect(text).toContain('Longsword');
    expect(text).toContain('Shield');
  });

  it('returns empty string for null', () => {
    expect(generateCharacterText(null)).toBe('');
  });
});

describe('generateCharacterMarkdown', () => {
  const testCharacter = {
    name: 'Test Hero',
    race: 'Human',
    charClass: 'Fighter',
    level: 5,
    stats: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
    ac: 18,
    maxHP: 44
  };

  it('uses markdown heading for name', () => {
    const md = generateCharacterMarkdown(testCharacter);
    expect(md).toContain('# Test Hero');
  });

  it('uses markdown tables', () => {
    const md = generateCharacterMarkdown(testCharacter);
    expect(md).toContain('| Attribute | Value |');
    expect(md).toContain('|-----------|-------|');
  });

  it('includes ability scores table', () => {
    const md = generateCharacterMarkdown(testCharacter);
    expect(md).toContain('## Ability Scores');
    expect(md).toContain('| Strength | 16 | +3 |');
  });

  it('includes combat section', () => {
    const md = generateCharacterMarkdown(testCharacter);
    expect(md).toContain('## Combat');
    expect(md).toContain('| Armor Class | 18 |');
  });

  it('formats features as bold', () => {
    const charWithFeatures = {
      ...testCharacter,
      features: [{ name: 'Second Wind', description: 'Heal yourself' }]
    };
    const md = generateCharacterMarkdown(charWithFeatures);
    expect(md).toContain('**Second Wind**');
    expect(md).toContain('Heal yourself');
  });

  it('returns empty string for null', () => {
    expect(generateCharacterMarkdown(null)).toBe('');
  });
});

describe('generateCharacterJSON', () => {
  const testCharacter = {
    name: 'Test Hero',
    charClass: 'Fighter',
    level: 5,
    stats: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 }
  };

  it('returns valid JSON', () => {
    const json = generateCharacterJSON(testCharacter);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes export metadata', () => {
    const json = generateCharacterJSON(testCharacter);
    const parsed = JSON.parse(json);

    expect(parsed.exportVersion).toBe('1.0');
    expect(parsed.exportDate).toBeDefined();
  });

  it('includes character data', () => {
    const json = generateCharacterJSON(testCharacter);
    const parsed = JSON.parse(json);

    expect(parsed.character.name).toBe('Test Hero');
    expect(parsed.character.class).toBe('Fighter');
  });

  it('calculates proficiency bonus', () => {
    const json = generateCharacterJSON(testCharacter);
    const parsed = JSON.parse(json);

    expect(parsed.character.proficiencyBonus).toBe(3);
  });

  it('supports compact format', () => {
    const pretty = generateCharacterJSON(testCharacter, true);
    const compact = generateCharacterJSON(testCharacter, false);

    expect(pretty.length).toBeGreaterThan(compact.length);
    expect(pretty).toContain('\n');
    expect(compact).not.toContain('\n');
  });

  it('returns empty object for null', () => {
    expect(generateCharacterJSON(null)).toBe('{}');
  });
});

describe('generateStatBlock', () => {
  const testCreature = {
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    alignment: 'neutral evil',
    ac: 15,
    hp: 7,
    speed: 30,
    stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }
  };

  it('includes name and type line', () => {
    const block = generateStatBlock(testCreature);
    expect(block).toContain('Goblin');
    expect(block).toContain('Small humanoid, neutral evil');
  });

  it('includes AC, HP, Speed', () => {
    const block = generateStatBlock(testCreature);
    expect(block).toContain('Armor Class 15');
    expect(block).toContain('Hit Points 7');
    expect(block).toContain('Speed 30 ft.');
  });

  it('includes ability score line', () => {
    const block = generateStatBlock(testCreature);
    expect(block).toContain('STR');
    expect(block).toContain('DEX');
    expect(block).toContain('8 (-1)');
    expect(block).toContain('14 (+2)');
  });

  it('includes traits if present', () => {
    const creatureWithTraits = {
      ...testCreature,
      traits: [{ name: 'Nimble Escape', description: 'Can Disengage or Hide as bonus action' }]
    };
    const block = generateStatBlock(creatureWithTraits);
    expect(block).toContain('Nimble Escape');
    expect(block).toContain('Disengage or Hide');
  });

  it('includes actions if present', () => {
    const creatureWithActions = {
      ...testCreature,
      actions: [{ name: 'Scimitar', description: 'Melee Weapon Attack: +4 to hit' }]
    };
    const block = generateStatBlock(creatureWithActions);
    expect(block).toContain('ACTIONS');
    expect(block).toContain('Scimitar');
    expect(block).toContain('+4 to hit');
  });

  it('returns empty string for null', () => {
    expect(generateStatBlock(null)).toBe('');
  });
});

describe('generateInitiativeExport', () => {
  const testCharacter = {
    name: 'Test Hero',
    maxHP: 44,
    currentHP: 30,
    ac: 18,
    stats: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 }
  };

  it('returns initiative tracker format', () => {
    const exported = generateInitiativeExport(testCharacter);

    expect(exported.name).toBe('Test Hero');
    expect(exported.type).toBe('PC');
    expect(exported.hp).toBe(30);
    expect(exported.maxHp).toBe(44);
    expect(exported.ac).toBe(18);
  });

  it('calculates initiative bonus from DEX', () => {
    const exported = generateInitiativeExport(testCharacter);
    expect(exported.initiativeBonus).toBe(2); // DEX 14 = +2
  });

  it('includes empty conditions array', () => {
    const exported = generateInitiativeExport(testCharacter);
    expect(exported.conditions).toEqual([]);
  });

  it('returns null for null input', () => {
    expect(generateInitiativeExport(null)).toBeNull();
  });

  it('handles missing stats', () => {
    const noStats = { name: 'NPC', maxHP: 10, ac: 10 };
    const exported = generateInitiativeExport(noStats);
    expect(exported.initiativeBonus).toBe(0);
  });
});

describe('parseCharacterImport', () => {
  it('parses our export format', () => {
    const exportData = {
      exportVersion: '1.0',
      exportDate: '2024-01-01',
      character: { name: 'Test', level: 5 }
    };
    const json = JSON.stringify(exportData);

    const result = parseCharacterImport(json);
    expect(result.success).toBe(true);
    expect(result.character.name).toBe('Test');
  });

  it('parses raw character object', () => {
    const raw = { name: 'Test', stats: { str: 16 } };
    const json = JSON.stringify(raw);

    const result = parseCharacterImport(json);
    expect(result.success).toBe(true);
    expect(result.character.name).toBe('Test');
  });

  it('returns error for invalid JSON', () => {
    const result = parseCharacterImport('not json');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Parse error');
  });

  it('returns error for unrecognized format', () => {
    const json = JSON.stringify({ unrelated: 'data' });
    const result = parseCharacterImport(json);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unrecognized');
  });

  it('returns error for empty input', () => {
    expect(parseCharacterImport('').success).toBe(false);
    expect(parseCharacterImport(null).success).toBe(false);
  });
});
