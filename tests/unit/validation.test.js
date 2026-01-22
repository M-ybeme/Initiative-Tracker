import { describe, it, expect } from 'vitest';
import {
  validateCharacterName,
  validateAbilityScore,
  validateAllAbilityScores,
  validateLevel,
  validateHitPoints,
  validateArmorClass,
  validateClass,
  validateRace,
  validateCharacter,
  sanitizeFilename,
  VALID_CLASSES,
  VALID_RACES
} from '../../js/modules/validation.js';

describe('validateCharacterName', () => {
  it('accepts valid names', () => {
    expect(validateCharacterName('Gandalf').valid).toBe(true);
    expect(validateCharacterName('Sir Reginald the Third').valid).toBe(true);
  });

  it('rejects empty names', () => {
    expect(validateCharacterName('').valid).toBe(false);
    expect(validateCharacterName('   ').valid).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(validateCharacterName(null).valid).toBe(false);
    expect(validateCharacterName(undefined).valid).toBe(false);
  });

  it('rejects names over 100 characters', () => {
    const longName = 'A'.repeat(101);
    expect(validateCharacterName(longName).valid).toBe(false);
  });

  it('accepts name exactly 100 characters', () => {
    const maxName = 'A'.repeat(100);
    expect(validateCharacterName(maxName).valid).toBe(true);
  });
});

describe('validateAbilityScore', () => {
  it('accepts scores 1-30', () => {
    expect(validateAbilityScore(1).valid).toBe(true);
    expect(validateAbilityScore(10).valid).toBe(true);
    expect(validateAbilityScore(20).valid).toBe(true);
    expect(validateAbilityScore(30).valid).toBe(true);
  });

  it('rejects scores below 1', () => {
    expect(validateAbilityScore(0).valid).toBe(false);
    expect(validateAbilityScore(-5).valid).toBe(false);
  });

  it('rejects scores above 30', () => {
    expect(validateAbilityScore(31).valid).toBe(false);
    expect(validateAbilityScore(100).valid).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(validateAbilityScore(10.5).valid).toBe(false);
    expect(validateAbilityScore(14.7).valid).toBe(false);
  });

  it('rejects non-numbers', () => {
    expect(validateAbilityScore('ten').valid).toBe(false);
    expect(validateAbilityScore(NaN).valid).toBe(false);
  });

  it('includes ability name in error', () => {
    const result = validateAbilityScore(0, 'Strength');
    expect(result.error).toContain('Strength');
  });
});

describe('validateAllAbilityScores', () => {
  it('accepts valid ability scores', () => {
    const abilities = { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 };
    const result = validateAllAbilityScores(abilities);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('reports invalid ability scores', () => {
    const abilities = { str: 0, dex: 14, con: 35, int: 10, wis: 12, cha: 8 };
    const result = validateAllAbilityScores(abilities);
    expect(result.valid).toBe(false);
    expect(result.errors.str).toBeDefined();
    expect(result.errors.con).toBeDefined();
    expect(result.errors.dex).toBeUndefined();
  });

  it('handles missing abilities', () => {
    const abilities = { str: 16 }; // Missing others
    const result = validateAllAbilityScores(abilities);
    expect(result.valid).toBe(false);
  });
});

describe('validateLevel', () => {
  it('accepts levels 1-20', () => {
    expect(validateLevel(1).valid).toBe(true);
    expect(validateLevel(10).valid).toBe(true);
    expect(validateLevel(20).valid).toBe(true);
  });

  it('rejects level 0 or negative', () => {
    expect(validateLevel(0).valid).toBe(false);
    expect(validateLevel(-1).valid).toBe(false);
  });

  it('rejects level above 20', () => {
    expect(validateLevel(21).valid).toBe(false);
    expect(validateLevel(30).valid).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(validateLevel(5.5).valid).toBe(false);
  });

  it('rejects non-numbers', () => {
    expect(validateLevel('five').valid).toBe(false);
  });
});

describe('validateHitPoints', () => {
  it('accepts valid HP values', () => {
    const result = validateHitPoints(30, 45);
    expect(result.valid).toBe(true);
  });

  it('accepts current HP at 0', () => {
    const result = validateHitPoints(0, 45);
    expect(result.valid).toBe(true);
  });

  it('accepts current HP equal to max', () => {
    const result = validateHitPoints(45, 45);
    expect(result.valid).toBe(true);
  });

  it('rejects negative current HP', () => {
    const result = validateHitPoints(-5, 45);
    expect(result.valid).toBe(false);
  });

  it('rejects max HP below 1', () => {
    const result = validateHitPoints(0, 0);
    expect(result.valid).toBe(false);
  });

  it('returns multiple errors if needed', () => {
    const result = validateHitPoints(-5, 0);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateArmorClass', () => {
  it('accepts AC 1-30', () => {
    expect(validateArmorClass(10).valid).toBe(true);
    expect(validateArmorClass(18).valid).toBe(true);
    expect(validateArmorClass(30).valid).toBe(true);
  });

  it('rejects AC below 1', () => {
    expect(validateArmorClass(0).valid).toBe(false);
    expect(validateArmorClass(-5).valid).toBe(false);
  });

  it('rejects AC above 30', () => {
    expect(validateArmorClass(31).valid).toBe(false);
  });

  it('rejects non-numbers', () => {
    expect(validateArmorClass('high').valid).toBe(false);
  });
});

describe('validateClass', () => {
  it('accepts all valid classes', () => {
    VALID_CLASSES.forEach(cls => {
      expect(validateClass(cls).valid).toBe(true);
    });
  });

  it('accepts class with subclass notation', () => {
    expect(validateClass('Fighter (Champion)').valid).toBe(true);
    expect(validateClass('Wizard (Evocation)').valid).toBe(true);
  });

  it('rejects invalid classes', () => {
    expect(validateClass('Jedi').valid).toBe(false);
    expect(validateClass('Mage').valid).toBe(false);
  });

  it('rejects empty/null', () => {
    expect(validateClass('').valid).toBe(false);
    expect(validateClass(null).valid).toBe(false);
  });
});

describe('validateRace', () => {
  it('accepts standard races', () => {
    expect(validateRace('Human').valid).toBe(true);
    expect(validateRace('Elf').valid).toBe(true);
    expect(validateRace('Dwarf').valid).toBe(true);
  });

  it('accepts race with subrace notation', () => {
    expect(validateRace('Elf (High)').valid).toBe(true);
    expect(validateRace('Dwarf (Mountain)').valid).toBe(true);
  });

  it('accepts custom races', () => {
    expect(validateRace('Owlin').valid).toBe(true);
    expect(validateRace('Custom Race').valid).toBe(true);
  });

  it('rejects empty race', () => {
    expect(validateRace('').valid).toBe(false);
    expect(validateRace('   ').valid).toBe(false);
  });
});

describe('validateCharacter', () => {
  it('accepts valid character', () => {
    const character = {
      name: 'Test Hero',
      level: 5,
      charClass: 'Fighter',
      race: 'Human',
      stats: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
      maxHP: 44,
      currentHP: 44
    };
    const result = validateCharacter(character);
    expect(result.valid).toBe(true);
  });

  it('requires name', () => {
    const character = { level: 5 };
    const result = validateCharacter(character);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('collects all errors', () => {
    const character = {
      name: '', // Invalid
      level: 25, // Invalid
      charClass: 'Jedi', // Invalid
      stats: { str: 50 } // Invalid
    };
    const result = validateCharacter(character);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.level).toBeDefined();
    expect(result.errors.class).toBeDefined();
    expect(result.errors.stats).toBeDefined();
  });

  it('handles null input', () => {
    const result = validateCharacter(null);
    expect(result.valid).toBe(false);
    expect(result.errors._general).toBeDefined();
  });
});

describe('sanitizeFilename', () => {
  it('removes invalid characters', () => {
    // Invalid chars (<>:"/\|?*) are removed entirely, not replaced
    expect(sanitizeFilename('Test<Hero>')).toBe('TestHero');
    expect(sanitizeFilename('Name:With"Quotes')).toBe('NameWithQuotes');
  });

  it('replaces spaces with dashes', () => {
    expect(sanitizeFilename('Hero Name')).toBe('Hero-Name');
    expect(sanitizeFilename('Multiple   Spaces')).toBe('Multiple-Spaces');
  });

  it('limits length to 50 characters', () => {
    const longName = 'A'.repeat(100);
    expect(sanitizeFilename(longName).length).toBe(50);
  });

  it('returns "character" for empty/null', () => {
    expect(sanitizeFilename('')).toBe('character');
    expect(sanitizeFilename(null)).toBe('character');
    expect(sanitizeFilename(undefined)).toBe('character');
  });

  it('trims whitespace', () => {
    expect(sanitizeFilename('  Hero  ')).toBe('Hero');
  });
});

describe('VALID_CLASSES', () => {
  it('includes all PHB classes', () => {
    const phbClasses = [
      'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
      'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
      'Warlock', 'Wizard'
    ];
    phbClasses.forEach(cls => {
      expect(VALID_CLASSES).toContain(cls);
    });
  });

  it('includes Artificer', () => {
    expect(VALID_CLASSES).toContain('Artificer');
  });
});

describe('VALID_RACES', () => {
  it('includes core races', () => {
    const coreRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn'];
    coreRaces.forEach(race => {
      expect(VALID_RACES).toContain(race);
    });
  });

  it('includes Custom option', () => {
    expect(VALID_RACES).toContain('Custom');
  });
});
