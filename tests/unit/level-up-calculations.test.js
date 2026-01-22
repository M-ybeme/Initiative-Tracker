import { describe, it, expect } from 'vitest';
import {
  MULTICLASS_PREREQUISITES,
  MULTICLASS_SPELL_SLOTS,
  canMulticlass,
  getCasterLevel,
  getSpellSlots,
  getASICount,
  getTotalLevel,
  getProficiencyBonusFromLevel
} from '../../js/modules/level-up-calculations.js';

describe('canMulticlass', () => {
  describe('single class prerequisites', () => {
    it('allows multiclass when requirements are met', () => {
      const abilities = { str: 13, dex: 14, con: 12, int: 10, wis: 15, cha: 8 };
      const result = canMulticlass(abilities, 'Cleric');
      expect(result.canMulticlass).toBe(true);
      expect(result.missingRequirements).toEqual([]);
    });

    it('prevents multiclass when requirements are not met', () => {
      const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      const result = canMulticlass(abilities, 'Paladin');
      expect(result.canMulticlass).toBe(false);
      expect(result.missingRequirements).toContain('STR 13');
      expect(result.missingRequirements).toContain('CHA 13');
    });

    it('handles Fighter OR requirement (STR or DEX)', () => {
      // Only STR 13
      const strFighter = { str: 13, dex: 8, con: 10, int: 10, wis: 10, cha: 10 };
      expect(canMulticlass(strFighter, 'Fighter').canMulticlass).toBe(true);

      // Only DEX 13
      const dexFighter = { str: 8, dex: 13, con: 10, int: 10, wis: 10, cha: 10 };
      expect(canMulticlass(dexFighter, 'Fighter').canMulticlass).toBe(true);

      // Neither
      const noFighter = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      const result = canMulticlass(noFighter, 'Fighter');
      expect(result.canMulticlass).toBe(false);
      expect(result.missingRequirements).toContain('STR 13 or DEX 13');
    });
  });

  describe('multiclass out requirements', () => {
    it('checks requirements of current class too', () => {
      const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 };
      // Trying to multiclass FROM Paladin (needs STR 13, CHA 13) TO Cleric (needs WIS 13)
      const result = canMulticlass(abilities, 'Cleric', ['Paladin']);
      expect(result.canMulticlass).toBe(false);
      expect(result.missingRequirements).toContain('STR 13 (to leave Paladin)');
      expect(result.missingRequirements).toContain('CHA 13 (to leave Paladin)');
    });
  });

  it('allows any class if no prerequisites defined', () => {
    const abilities = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
    // Unknown class should pass
    const result = canMulticlass(abilities, 'UnknownClass');
    expect(result.canMulticlass).toBe(true);
  });
});

describe('getCasterLevel', () => {
  it('returns 0 for non-casters', () => {
    const classes = [{ className: 'Fighter', level: 10 }];
    expect(getCasterLevel(classes)).toBe(0);
  });

  it('returns full level for full casters', () => {
    const classes = [{ className: 'Wizard', level: 10 }];
    expect(getCasterLevel(classes)).toBe(10);
  });

  it('returns half level (rounded down) for half casters', () => {
    expect(getCasterLevel([{ className: 'Paladin', level: 5 }])).toBe(2);
    expect(getCasterLevel([{ className: 'Paladin', level: 6 }])).toBe(3);
    expect(getCasterLevel([{ className: 'Ranger', level: 10 }])).toBe(5);
  });

  it('returns ceiling for Artificer', () => {
    expect(getCasterLevel([{ className: 'Artificer', level: 1 }])).toBe(1);
    expect(getCasterLevel([{ className: 'Artificer', level: 2 }])).toBe(1);
    expect(getCasterLevel([{ className: 'Artificer', level: 3 }])).toBe(2);
  });

  it('ignores Warlock (Pact Magic is separate)', () => {
    const classes = [
      { className: 'Wizard', level: 5 },
      { className: 'Warlock', level: 5 }
    ];
    expect(getCasterLevel(classes)).toBe(5); // Only Wizard counts
  });

  it('handles third casters via subclass', () => {
    const classes = [{ className: 'Fighter', level: 9, subclass: 'Eldritch Knight' }];
    expect(getCasterLevel(classes)).toBe(3); // 9/3 = 3

    const classes2 = [{ className: 'Rogue', level: 12, subclass: 'Arcane Trickster' }];
    expect(getCasterLevel(classes2)).toBe(4); // 12/3 = 4
  });

  it('calculates multiclass caster level correctly', () => {
    // Wizard 5 / Paladin 6 / Cleric 3
    // = 5 + 3 + 3 = 11
    const classes = [
      { className: 'Wizard', level: 5 },
      { className: 'Paladin', level: 6 },
      { className: 'Cleric', level: 3 }
    ];
    expect(getCasterLevel(classes)).toBe(11);
  });
});

describe('getSpellSlots', () => {
  it('returns null for non-casters', () => {
    const classes = [{ className: 'Barbarian', level: 10 }];
    expect(getSpellSlots(classes)).toBeNull();
  });

  it('returns correct slots for caster level', () => {
    const classes = [{ className: 'Wizard', level: 5 }];
    const slots = getSpellSlots(classes);
    expect(slots).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
  });

  it('uses multiclass spell slot table', () => {
    // Wizard 3 / Cleric 2 = caster level 5
    const classes = [
      { className: 'Wizard', level: 3 },
      { className: 'Cleric', level: 2 }
    ];
    const slots = getSpellSlots(classes);
    expect(slots).toEqual(MULTICLASS_SPELL_SLOTS[5]);
  });
});

describe('getASICount', () => {
  it('counts standard ASIs at 4, 8, 12, 16, 19', () => {
    expect(getASICount([{ className: 'Wizard', level: 4 }])).toBe(1);
    expect(getASICount([{ className: 'Wizard', level: 8 }])).toBe(2);
    expect(getASICount([{ className: 'Wizard', level: 12 }])).toBe(3);
    expect(getASICount([{ className: 'Wizard', level: 16 }])).toBe(4);
    expect(getASICount([{ className: 'Wizard', level: 19 }])).toBe(5);
    expect(getASICount([{ className: 'Wizard', level: 20 }])).toBe(5);
  });

  it('counts Fighter extra ASIs at 6 and 14', () => {
    expect(getASICount([{ className: 'Fighter', level: 4 }])).toBe(1);
    expect(getASICount([{ className: 'Fighter', level: 6 }])).toBe(2); // 4 + 6
    expect(getASICount([{ className: 'Fighter', level: 8 }])).toBe(3); // 4, 6, 8
    expect(getASICount([{ className: 'Fighter', level: 14 }])).toBe(5); // 4, 6, 8, 12, 14
    expect(getASICount([{ className: 'Fighter', level: 20 }])).toBe(7); // 4, 6, 8, 12, 14, 16, 19
  });

  it('counts Rogue extra ASI at 10', () => {
    expect(getASICount([{ className: 'Rogue', level: 8 }])).toBe(2);
    expect(getASICount([{ className: 'Rogue', level: 10 }])).toBe(3); // 4, 8, 10
    expect(getASICount([{ className: 'Rogue', level: 12 }])).toBe(4); // 4, 8, 10, 12
    expect(getASICount([{ className: 'Rogue', level: 20 }])).toBe(6); // 4, 8, 10, 12, 16, 19
  });

  it('sums ASIs across multiclass', () => {
    // Fighter 6 (2 ASIs) + Wizard 4 (1 ASI) = 3 total
    const classes = [
      { className: 'Fighter', level: 6 },
      { className: 'Wizard', level: 4 }
    ];
    expect(getASICount(classes)).toBe(3);
  });
});

describe('getTotalLevel', () => {
  it('sums all class levels', () => {
    const classes = [
      { className: 'Fighter', level: 5 },
      { className: 'Wizard', level: 3 }
    ];
    expect(getTotalLevel(classes)).toBe(8);
  });

  it('handles single class', () => {
    expect(getTotalLevel([{ className: 'Bard', level: 10 }])).toBe(10);
  });

  it('handles empty array', () => {
    expect(getTotalLevel([])).toBe(0);
  });

  it('handles missing level property', () => {
    expect(getTotalLevel([{ className: 'Fighter' }])).toBe(0);
  });
});

describe('getProficiencyBonusFromLevel', () => {
  it('returns +2 for levels 1-4', () => {
    expect(getProficiencyBonusFromLevel(1)).toBe(2);
    expect(getProficiencyBonusFromLevel(4)).toBe(2);
  });

  it('returns +3 for levels 5-8', () => {
    expect(getProficiencyBonusFromLevel(5)).toBe(3);
    expect(getProficiencyBonusFromLevel(8)).toBe(3);
  });

  it('returns +4 for levels 9-12', () => {
    expect(getProficiencyBonusFromLevel(9)).toBe(4);
    expect(getProficiencyBonusFromLevel(12)).toBe(4);
  });

  it('returns +5 for levels 13-16', () => {
    expect(getProficiencyBonusFromLevel(13)).toBe(5);
    expect(getProficiencyBonusFromLevel(16)).toBe(5);
  });

  it('returns +6 for levels 17-20', () => {
    expect(getProficiencyBonusFromLevel(17)).toBe(6);
    expect(getProficiencyBonusFromLevel(20)).toBe(6);
  });
});
