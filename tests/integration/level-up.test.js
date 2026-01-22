/**
 * Integration Tests: Level-Up Flow
 * Tests the complete leveling process from level 1 to 20
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Import calculation modules
import {
  getAbilityModifier,
  getProficiencyBonus,
  getLevel1HP,
  getLevelUpHP
} from '../../js/modules/character-calculations.js';

import {
  canMulticlass,
  getCasterLevel,
  getSpellSlots,
  getASICount,
  getTotalLevel,
  getProficiencyBonusFromLevel,
  MULTICLASS_SPELL_SLOTS
} from '../../js/modules/level-up-calculations.js';

import {
  FULL_CASTER_SLOTS,
  PACT_MAGIC_SLOTS,
  getMaxSpellLevel
} from '../../js/modules/spell-utils.js';

import {
  validateLevel,
  validateCharacter
} from '../../js/modules/validation.js';

import {
  serializeCharacter,
  deserializeCharacter,
  createLocalStorageAdapter
} from '../../js/modules/storage.js';

// ============================================================
// Test Helpers
// ============================================================

// Hit dice by class
const HIT_DICE = {
  Barbarian: 12,
  Fighter: 10,
  Paladin: 10,
  Ranger: 10,
  Bard: 8,
  Cleric: 8,
  Druid: 8,
  Monk: 8,
  Rogue: 8,
  Warlock: 8,
  Sorcerer: 6,
  Wizard: 6,
  Artificer: 8
};

/**
 * Creates a character at a specific level with class
 */
function createCharacterAtLevel(className, level, abilities = null) {
  const defaultAbilities = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
  const stats = abilities || defaultAbilities;
  const hitDie = HIT_DICE[className] || 8;

  // Calculate HP for this level using hitDie and conScore
  let hp = getLevel1HP(hitDie, stats.con);
  for (let lvl = 2; lvl <= level; lvl++) {
    hp += getLevelUpHP(hitDie, stats.con);
  }

  return {
    id: `test-char-${Date.now()}`,
    name: `Test ${className}`,
    charClass: className,
    level: level,
    multiclass: false,
    classes: [{ className, subclass: '', level, subclassLevel: 0 }],
    stats: stats,
    statMods: {
      str: getAbilityModifier(stats.str),
      dex: getAbilityModifier(stats.dex),
      con: getAbilityModifier(stats.con),
      int: getAbilityModifier(stats.int),
      wis: getAbilityModifier(stats.wis),
      cha: getAbilityModifier(stats.cha)
    },
    maxHP: hp,
    currentHP: hp,
    ac: 10 + getAbilityModifier(stats.dex),
    proficiencyBonus: getProficiencyBonus(level)
  };
}

/**
 * Creates a multiclass character
 */
function createMulticlassCharacter(classLevels, abilities = null) {
  const defaultAbilities = { str: 16, dex: 14, con: 14, int: 12, wis: 13, cha: 13 };
  const stats = abilities || defaultAbilities;

  const classes = classLevels.map(cl => ({
    className: cl.className,
    subclass: cl.subclass || '',
    level: cl.level,
    subclassLevel: cl.subclassLevel || 0
  }));

  const totalLevel = getTotalLevel(classes);

  // Calculate HP (first class gets max die, others get average)
  const firstHitDie = HIT_DICE[classLevels[0].className] || 8;
  let hp = getLevel1HP(firstHitDie, stats.con);
  for (let i = 1; i < classLevels[0].level; i++) {
    hp += getLevelUpHP(firstHitDie, stats.con);
  }
  for (let i = 1; i < classLevels.length; i++) {
    const hitDie = HIT_DICE[classLevels[i].className] || 8;
    for (let j = 0; j < classLevels[i].level; j++) {
      hp += getLevelUpHP(hitDie, stats.con);
    }
  }

  return {
    id: `test-multiclass-${Date.now()}`,
    name: 'Test Multiclass',
    charClass: classLevels[0].className,
    level: totalLevel,
    multiclass: true,
    classes: classes,
    stats: stats,
    statMods: {
      str: getAbilityModifier(stats.str),
      dex: getAbilityModifier(stats.dex),
      con: getAbilityModifier(stats.con),
      int: getAbilityModifier(stats.int),
      wis: getAbilityModifier(stats.wis),
      cha: getAbilityModifier(stats.cha)
    },
    maxHP: hp,
    currentHP: hp,
    proficiencyBonus: getProficiencyBonus(totalLevel)
  };
}

// ============================================================
// Basic Level-Up Tests
// ============================================================

describe('Basic Level-Up Flow', () => {
  it('validates level 1 character', () => {
    const char = createCharacterAtLevel('Fighter', 1);
    const result = validateLevel(char.level);
    expect(result.valid).toBe(true);
  });

  it('validates level 20 character', () => {
    const char = createCharacterAtLevel('Fighter', 20);
    const result = validateLevel(char.level);
    expect(result.valid).toBe(true);
  });

  it('rejects level above 20', () => {
    const result = validateLevel(21);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('20');
  });

  it('rejects level 0 or negative', () => {
    expect(validateLevel(0).valid).toBe(false);
    expect(validateLevel(-1).valid).toBe(false);
  });
});

// ============================================================
// HP Progression Tests
// ============================================================

describe('HP Progression on Level-Up', () => {
  it('Fighter HP increases correctly level 1-5', () => {
    const conScore = 14; // CON 14 = +2 mod
    const hitDie = 10; // Fighter d10

    // Level 1: max die (10) + CON mod
    const hp1 = getLevel1HP(hitDie, conScore);
    expect(hp1).toBe(12);

    // Level 2-5: average (6) + CON mod each
    let totalHP = hp1;
    for (let level = 2; level <= 5; level++) {
      const hpGain = getLevelUpHP(hitDie, conScore);
      expect(hpGain).toBe(8); // 6 average + 2 CON
      totalHP += hpGain;
    }
    expect(totalHP).toBe(44); // 12 + 8*4 = 44
  });

  it('Wizard HP increases correctly level 1-5', () => {
    const conScore = 14; // +2 mod
    const hitDie = 6; // Wizard d6

    const hp1 = getLevel1HP(hitDie, conScore);
    expect(hp1).toBe(8); // d6 max (6) + 2

    let totalHP = hp1;
    for (let level = 2; level <= 5; level++) {
      const hpGain = getLevelUpHP(hitDie, conScore);
      expect(hpGain).toBe(6); // 4 average + 2 CON
      totalHP += hpGain;
    }
    expect(totalHP).toBe(32); // 8 + 6*4 = 32
  });

  it('Barbarian HP increases correctly level 1-5', () => {
    const conScore = 16; // +3 mod
    const hitDie = 12; // Barbarian d12

    const hp1 = getLevel1HP(hitDie, conScore);
    expect(hp1).toBe(15); // d12 max (12) + 3

    let totalHP = hp1;
    for (let level = 2; level <= 5; level++) {
      const hpGain = getLevelUpHP(hitDie, conScore);
      expect(hpGain).toBe(10); // 7 average + 3 CON
      totalHP += hpGain;
    }
    expect(totalHP).toBe(55); // 15 + 10*4 = 55
  });
});

// ============================================================
// Proficiency Bonus Progression Tests
// ============================================================

describe('Proficiency Bonus Progression', () => {
  it('increases at correct level thresholds', () => {
    // Levels 1-4: +2
    for (let level = 1; level <= 4; level++) {
      expect(getProficiencyBonusFromLevel(level)).toBe(2);
    }

    // Levels 5-8: +3
    for (let level = 5; level <= 8; level++) {
      expect(getProficiencyBonusFromLevel(level)).toBe(3);
    }

    // Levels 9-12: +4
    for (let level = 9; level <= 12; level++) {
      expect(getProficiencyBonusFromLevel(level)).toBe(4);
    }

    // Levels 13-16: +5
    for (let level = 13; level <= 16; level++) {
      expect(getProficiencyBonusFromLevel(level)).toBe(5);
    }

    // Levels 17-20: +6
    for (let level = 17; level <= 20; level++) {
      expect(getProficiencyBonusFromLevel(level)).toBe(6);
    }
  });

  it('character proficiency bonus matches level calculation', () => {
    for (let level = 1; level <= 20; level++) {
      const char = createCharacterAtLevel('Fighter', level);
      expect(char.proficiencyBonus).toBe(getProficiencyBonusFromLevel(level));
    }
  });
});

// ============================================================
// ASI (Ability Score Improvement) Tests
// ============================================================

describe('ASI Count Progression', () => {
  describe('Standard Classes', () => {
    it('Wizard gets ASIs at 4, 8, 12, 16, 19', () => {
      expect(getASICount([{ className: 'Wizard', level: 3 }])).toBe(0);
      expect(getASICount([{ className: 'Wizard', level: 4 }])).toBe(1);
      expect(getASICount([{ className: 'Wizard', level: 8 }])).toBe(2);
      expect(getASICount([{ className: 'Wizard', level: 12 }])).toBe(3);
      expect(getASICount([{ className: 'Wizard', level: 16 }])).toBe(4);
      expect(getASICount([{ className: 'Wizard', level: 19 }])).toBe(5);
      expect(getASICount([{ className: 'Wizard', level: 20 }])).toBe(5);
    });
  });

  describe('Fighter Extra ASIs', () => {
    it('Fighter gets extra ASIs at 6 and 14', () => {
      expect(getASICount([{ className: 'Fighter', level: 4 }])).toBe(1);
      expect(getASICount([{ className: 'Fighter', level: 6 }])).toBe(2);
      expect(getASICount([{ className: 'Fighter', level: 8 }])).toBe(3);
      expect(getASICount([{ className: 'Fighter', level: 12 }])).toBe(4);
      expect(getASICount([{ className: 'Fighter', level: 14 }])).toBe(5);
      expect(getASICount([{ className: 'Fighter', level: 16 }])).toBe(6);
      expect(getASICount([{ className: 'Fighter', level: 20 }])).toBe(7);
    });
  });

  describe('Rogue Extra ASI', () => {
    it('Rogue gets extra ASI at 10', () => {
      expect(getASICount([{ className: 'Rogue', level: 8 }])).toBe(2);
      expect(getASICount([{ className: 'Rogue', level: 10 }])).toBe(3);
      expect(getASICount([{ className: 'Rogue', level: 12 }])).toBe(4);
      expect(getASICount([{ className: 'Rogue', level: 20 }])).toBe(6);
    });
  });
});

// ============================================================
// Spellcasting Progression Tests
// ============================================================

describe('Spellcasting Progression', () => {
  describe('Full Caster Spell Slots', () => {
    it('Wizard level 1 has correct slots', () => {
      const slots = getSpellSlots([{ className: 'Wizard', level: 1 }]);
      expect(slots).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('Wizard level 5 has correct slots', () => {
      const slots = getSpellSlots([{ className: 'Wizard', level: 5 }]);
      expect(slots).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    });

    it('Wizard level 20 has correct slots', () => {
      const slots = getSpellSlots([{ className: 'Wizard', level: 20 }]);
      expect(slots).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
    });
  });

  describe('Half Caster Spell Slots', () => {
    it('Paladin level 2 has correct slots', () => {
      // Paladin gets spells at level 2
      const casterLevel = getCasterLevel([{ className: 'Paladin', level: 2 }]);
      expect(casterLevel).toBe(1); // 2/2 = 1

      const slots = getSpellSlots([{ className: 'Paladin', level: 2 }]);
      expect(slots[0]).toBe(2); // 2 first-level slots at caster level 1
    });

    it('Ranger level 5 has correct slots', () => {
      const casterLevel = getCasterLevel([{ className: 'Ranger', level: 5 }]);
      expect(casterLevel).toBe(2); // 5/2 = 2 (rounded down)
    });
  });

  describe('Max Spell Level Progression', () => {
    it('Wizard gains access to higher spell levels at correct levels', () => {
      expect(getMaxSpellLevel('Wizard', 1)).toBe(1);
      expect(getMaxSpellLevel('Wizard', 3)).toBe(2);
      expect(getMaxSpellLevel('Wizard', 5)).toBe(3);
      expect(getMaxSpellLevel('Wizard', 7)).toBe(4);
      expect(getMaxSpellLevel('Wizard', 9)).toBe(5);
      expect(getMaxSpellLevel('Wizard', 11)).toBe(6);
      expect(getMaxSpellLevel('Wizard', 13)).toBe(7);
      expect(getMaxSpellLevel('Wizard', 15)).toBe(8);
      expect(getMaxSpellLevel('Wizard', 17)).toBe(9);
    });

    it('Paladin caps at 5th level spells', () => {
      expect(getMaxSpellLevel('Paladin', 2)).toBe(1);
      expect(getMaxSpellLevel('Paladin', 5)).toBe(2);
      expect(getMaxSpellLevel('Paladin', 20)).toBe(5);
    });

    it('Warlock caps at 5th level spells', () => {
      expect(getMaxSpellLevel('Warlock', 1)).toBe(1);
      expect(getMaxSpellLevel('Warlock', 9)).toBe(5);
      expect(getMaxSpellLevel('Warlock', 20)).toBe(5);
    });
  });
});

// ============================================================
// Multiclass Tests
// ============================================================

describe('Multiclass Level-Up', () => {
  describe('Multiclass Prerequisites', () => {
    it('allows multiclass into Cleric with WIS 13', () => {
      const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 13, cha: 10 };
      const result = canMulticlass(abilities, 'Cleric');
      expect(result.canMulticlass).toBe(true);
    });

    it('prevents multiclass into Paladin without STR and CHA 13', () => {
      const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      const result = canMulticlass(abilities, 'Paladin');
      expect(result.canMulticlass).toBe(false);
      expect(result.missingRequirements).toContain('STR 13');
      expect(result.missingRequirements).toContain('CHA 13');
    });

    it('allows Fighter with STR OR DEX 13', () => {
      const strFighter = { str: 13, dex: 8, con: 10, int: 10, wis: 10, cha: 10 };
      const dexFighter = { str: 8, dex: 13, con: 10, int: 10, wis: 10, cha: 10 };

      expect(canMulticlass(strFighter, 'Fighter').canMulticlass).toBe(true);
      expect(canMulticlass(dexFighter, 'Fighter').canMulticlass).toBe(true);
    });

    it('checks requirements to leave current class', () => {
      const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 };
      // Trying to leave Paladin (needs STR 13, CHA 13) to take Cleric
      const result = canMulticlass(abilities, 'Cleric', ['Paladin']);
      expect(result.canMulticlass).toBe(false);
    });
  });

  describe('Multiclass Caster Level', () => {
    it('calculates multiclass caster level correctly', () => {
      // Wizard 5 / Cleric 3 = 5 + 3 = 8
      const classes = [
        { className: 'Wizard', level: 5 },
        { className: 'Cleric', level: 3 }
      ];
      expect(getCasterLevel(classes)).toBe(8);
    });

    it('half casters contribute half level (rounded down)', () => {
      // Wizard 5 / Paladin 6 = 5 + 3 = 8
      const classes = [
        { className: 'Wizard', level: 5 },
        { className: 'Paladin', level: 6 }
      ];
      expect(getCasterLevel(classes)).toBe(8);
    });

    it('ignores Warlock in caster level calculation', () => {
      // Wizard 5 / Warlock 5 = 5 (only Wizard counts)
      const classes = [
        { className: 'Wizard', level: 5 },
        { className: 'Warlock', level: 5 }
      ];
      expect(getCasterLevel(classes)).toBe(5);
    });

    it('third casters (Eldritch Knight) contribute 1/3 level', () => {
      const classes = [{ className: 'Fighter', level: 9, subclass: 'Eldritch Knight' }];
      expect(getCasterLevel(classes)).toBe(3); // 9/3 = 3
    });
  });

  describe('Multiclass Spell Slots', () => {
    it('uses multiclass spell slot table', () => {
      const classes = [
        { className: 'Wizard', level: 3 },
        { className: 'Cleric', level: 2 }
      ];
      // Caster level 5
      const slots = getSpellSlots(classes);
      expect(slots).toEqual(MULTICLASS_SPELL_SLOTS[5]);
    });
  });

  describe('Multiclass ASI', () => {
    it('sums ASIs from each class separately', () => {
      // Fighter 6 (2 ASIs: 4, 6) + Wizard 4 (1 ASI: 4) = 3
      const classes = [
        { className: 'Fighter', level: 6 },
        { className: 'Wizard', level: 4 }
      ];
      expect(getASICount(classes)).toBe(3);
    });
  });

  describe('Total Level Calculation', () => {
    it('sums all class levels', () => {
      const classes = [
        { className: 'Fighter', level: 5 },
        { className: 'Wizard', level: 3 },
        { className: 'Cleric', level: 2 }
      ];
      expect(getTotalLevel(classes)).toBe(10);
    });

    it('handles single class', () => {
      expect(getTotalLevel([{ className: 'Fighter', level: 10 }])).toBe(10);
    });

    it('handles empty array', () => {
      expect(getTotalLevel([])).toBe(0);
    });
  });
});

// ============================================================
// Subclass Selection Tests
// ============================================================

describe('Subclass Selection', () => {
  it('Fighter gets subclass at level 3', () => {
    const fighter3 = createCharacterAtLevel('Fighter', 3);
    fighter3.subclass = 'Champion';
    fighter3.subclassLevel = 3;
    fighter3.classes[0].subclass = 'Champion';
    fighter3.classes[0].subclassLevel = 3;

    const result = validateCharacter(fighter3);
    expect(result.valid).toBe(true);
  });

  it('Wizard gets subclass at level 2', () => {
    const wizard2 = createCharacterAtLevel('Wizard', 2);
    wizard2.subclass = 'Evocation';
    wizard2.subclassLevel = 2;
    wizard2.classes[0].subclass = 'Evocation';
    wizard2.classes[0].subclassLevel = 2;

    const result = validateCharacter(wizard2);
    expect(result.valid).toBe(true);
  });

  it('Cleric gets subclass at level 1', () => {
    const cleric1 = createCharacterAtLevel('Cleric', 1);
    cleric1.subclass = 'Life Domain';
    cleric1.subclassLevel = 1;
    cleric1.classes[0].subclass = 'Life Domain';
    cleric1.classes[0].subclassLevel = 1;

    const result = validateCharacter(cleric1);
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// Level-Up Storage Persistence Tests
// ============================================================

describe('Level-Up Storage Persistence', () => {
  let mockStorage;
  let storageAdapter;

  beforeEach(() => {
    mockStorage = {};
    const mockLocalStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = String(value); },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    storageAdapter = createLocalStorageAdapter(mockLocalStorage, 'testCharacters');
  });

  it('persists level change to storage', () => {
    const char = createCharacterAtLevel('Fighter', 4);
    storageAdapter.save([char]);

    // Simulate level up
    char.level = 5;
    char.proficiencyBonus = getProficiencyBonus(5);
    const hitDie = HIT_DICE['Fighter'];
    char.maxHP += getLevelUpHP(hitDie, char.stats.con);
    char.currentHP = char.maxHP;

    storageAdapter.saveOne(char);

    const loaded = storageAdapter.getOne(char.id);
    expect(loaded.level).toBe(5);
    expect(loaded.proficiencyBonus).toBe(3);
  });

  it('persists multiclass data to storage', () => {
    const multichar = createMulticlassCharacter([
      { className: 'Fighter', level: 5 },
      { className: 'Wizard', level: 3 }
    ]);

    storageAdapter.save([multichar]);
    const loaded = storageAdapter.getOne(multichar.id);

    expect(loaded.multiclass).toBe(true);
    expect(loaded.classes).toHaveLength(2);
    expect(loaded.level).toBe(8);
  });

  it('character survives serialization cycle', () => {
    const char = createCharacterAtLevel('Wizard', 10);
    char.spellSlots = {};
    FULL_CASTER_SLOTS[10].forEach((slots, index) => {
      char.spellSlots[index + 1] = { max: slots, used: 0 };
    });

    const serialized = serializeCharacter(char);
    const deserialized = deserializeCharacter(serialized);

    expect(deserialized.level).toBe(10);
    expect(deserialized.spellSlots[1].max).toBe(4);
    expect(deserialized.spellSlots[5].max).toBe(2);
  });
});

// ============================================================
// Complete Level 1-20 Progression Test
// ============================================================

describe('Complete Progression 1-20', () => {
  it('Fighter can progress from 1 to 20 with correct HP', () => {
    const conScore = 14; // +2 mod
    const hitDie = HIT_DICE['Fighter'];
    let expectedHP = getLevel1HP(hitDie, conScore);

    for (let level = 2; level <= 20; level++) {
      expectedHP += getLevelUpHP(hitDie, conScore);
      const char = createCharacterAtLevel('Fighter', level);

      expect(char.maxHP).toBe(expectedHP);
      expect(validateLevel(char.level).valid).toBe(true);
    }
  });

  it('Wizard can progress from 1 to 20 with correct spell slots', () => {
    for (let level = 1; level <= 20; level++) {
      const slots = getSpellSlots([{ className: 'Wizard', level }]);
      expect(slots).toEqual(FULL_CASTER_SLOTS[level]);
    }
  });
});
