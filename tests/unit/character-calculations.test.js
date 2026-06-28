import { describe, it, expect } from 'vitest';
import {
  getAbilityModifier,
  getProficiencyBonus,
  getSkillBonus,
  getPassivePerception,
  getExhaustionPenalty,
  isDeadFromExhaustion,
  getBarbarianUnarmoredAC,
  getMonkUnarmoredAC,
  getArmoredAC,
  getLevel1HP,
  getLevelUpHP,
  getTotalHP,
  getMulticlassHP,
  calculateEncumbrance,
  recalcDerivedStats,
  calculateConcentrationCheckDC,
  calculateSpellDC,
  calculateSpellAttackBonus
} from '../../js/character/character-calculations.js';

describe('getAbilityModifier', () => {
  it('returns -5 for score of 1', () => {
    expect(getAbilityModifier(1)).toBe(-5);
  });

  it('returns -4 for score of 2-3', () => {
    expect(getAbilityModifier(2)).toBe(-4);
    expect(getAbilityModifier(3)).toBe(-4);
  });

  it('returns -1 for score of 8-9', () => {
    expect(getAbilityModifier(8)).toBe(-1);
    expect(getAbilityModifier(9)).toBe(-1);
  });

  it('returns 0 for score of 10-11', () => {
    expect(getAbilityModifier(10)).toBe(0);
    expect(getAbilityModifier(11)).toBe(0);
  });

  it('returns +1 for score of 12-13', () => {
    expect(getAbilityModifier(12)).toBe(1);
    expect(getAbilityModifier(13)).toBe(1);
  });

  it('returns +5 for score of 20-21', () => {
    expect(getAbilityModifier(20)).toBe(5);
    expect(getAbilityModifier(21)).toBe(5);
  });

  it('returns +10 for score of 30', () => {
    expect(getAbilityModifier(30)).toBe(10);
  });

  it('handles string input', () => {
    expect(getAbilityModifier('14')).toBe(2);
  });

  it('returns 0 for NaN and non-numeric strings', () => {
    expect(getAbilityModifier(NaN)).toBe(0);
    expect(getAbilityModifier('invalid')).toBe(0);
  });

  it('treats null/undefined as 0 (modifier -5)', () => {
    // Number(null) = 0, Number(undefined) = NaN
    expect(getAbilityModifier(null)).toBe(-5); // null -> 0 -> -5 mod
    expect(getAbilityModifier(undefined)).toBe(0); // undefined -> NaN -> 0 (fallback)
  });
});

describe('getProficiencyBonus', () => {
  it('returns +2 for levels 1-4', () => {
    expect(getProficiencyBonus(1)).toBe(2);
    expect(getProficiencyBonus(2)).toBe(2);
    expect(getProficiencyBonus(3)).toBe(2);
    expect(getProficiencyBonus(4)).toBe(2);
  });

  it('returns +3 for levels 5-8', () => {
    expect(getProficiencyBonus(5)).toBe(3);
    expect(getProficiencyBonus(6)).toBe(3);
    expect(getProficiencyBonus(7)).toBe(3);
    expect(getProficiencyBonus(8)).toBe(3);
  });

  it('returns +4 for levels 9-12', () => {
    expect(getProficiencyBonus(9)).toBe(4);
    expect(getProficiencyBonus(10)).toBe(4);
    expect(getProficiencyBonus(11)).toBe(4);
    expect(getProficiencyBonus(12)).toBe(4);
  });

  it('returns +5 for levels 13-16', () => {
    expect(getProficiencyBonus(13)).toBe(5);
    expect(getProficiencyBonus(14)).toBe(5);
    expect(getProficiencyBonus(15)).toBe(5);
    expect(getProficiencyBonus(16)).toBe(5);
  });

  it('returns +6 for levels 17-20', () => {
    expect(getProficiencyBonus(17)).toBe(6);
    expect(getProficiencyBonus(18)).toBe(6);
    expect(getProficiencyBonus(19)).toBe(6);
    expect(getProficiencyBonus(20)).toBe(6);
  });

  it('handles invalid input by defaulting to level 1', () => {
    expect(getProficiencyBonus(0)).toBe(2);
    expect(getProficiencyBonus(-1)).toBe(2);
    expect(getProficiencyBonus(null)).toBe(2);
  });
});

describe('getSkillBonus', () => {
  it('returns just ability mod when not proficient', () => {
    expect(getSkillBonus(14, false, 5)).toBe(2); // +2 DEX mod only
    expect(getSkillBonus(10, false, 10)).toBe(0); // +0 mod
    expect(getSkillBonus(8, false, 1)).toBe(-1); // -1 mod
  });

  it('adds proficiency bonus when proficient', () => {
    expect(getSkillBonus(14, true, 1)).toBe(4); // +2 DEX + 2 prof
    expect(getSkillBonus(14, true, 5)).toBe(5); // +2 DEX + 3 prof
    expect(getSkillBonus(10, true, 9)).toBe(4); // +0 + 4 prof
  });

  it('doubles proficiency bonus with expertise', () => {
    expect(getSkillBonus(14, true, 1, true)).toBe(6); // +2 DEX + (2 * 2) prof
    expect(getSkillBonus(14, true, 5, true)).toBe(8); // +2 DEX + (2 * 3) prof
    expect(getSkillBonus(10, true, 17, true)).toBe(12); // +0 + (2 * 6) prof
  });

  it('expertise without proficiency still just returns ability mod', () => {
    // Edge case: expertise flag true but proficient false
    expect(getSkillBonus(14, false, 5, true)).toBe(2);
  });
});

describe('getPassivePerception', () => {
  it('calculates 10 + perception bonus', () => {
    expect(getPassivePerception(10, false, 1)).toBe(10); // 10 + 0
    expect(getPassivePerception(14, false, 1)).toBe(12); // 10 + 2
    expect(getPassivePerception(14, true, 1)).toBe(14); // 10 + 2 + 2
    expect(getPassivePerception(14, true, 5, true)).toBe(18); // 10 + 2 + 6
  });
});

describe('getBarbarianUnarmoredAC', () => {
  it('calculates 10 + DEX + CON', () => {
    expect(getBarbarianUnarmoredAC(14, 16)).toBe(15); // 10 + 2 + 3
    expect(getBarbarianUnarmoredAC(10, 10)).toBe(10); // 10 + 0 + 0
    expect(getBarbarianUnarmoredAC(20, 20)).toBe(20); // 10 + 5 + 5
  });

  it('adds +2 for shield', () => {
    expect(getBarbarianUnarmoredAC(14, 16, true)).toBe(17); // 10 + 2 + 3 + 2
  });
});

describe('getMonkUnarmoredAC', () => {
  it('calculates 10 + DEX + WIS', () => {
    expect(getMonkUnarmoredAC(16, 14)).toBe(15); // 10 + 3 + 2
    expect(getMonkUnarmoredAC(10, 10)).toBe(10); // 10 + 0 + 0
    expect(getMonkUnarmoredAC(20, 20)).toBe(20); // 10 + 5 + 5
  });
});

describe('getArmoredAC', () => {
  it('calculates light armor with full DEX', () => {
    expect(getArmoredAC('light', 11, 16)).toBe(14); // 11 + 3
    expect(getArmoredAC('light', 12, 20)).toBe(17); // 12 + 5
  });

  it('calculates medium armor with max +2 DEX', () => {
    expect(getArmoredAC('medium', 14, 16)).toBe(16); // 14 + 2 (capped)
    expect(getArmoredAC('medium', 14, 20)).toBe(16); // 14 + 2 (capped at 2)
    expect(getArmoredAC('medium', 14, 12)).toBe(15); // 14 + 1
  });

  it('calculates heavy armor with no DEX', () => {
    expect(getArmoredAC('heavy', 18, 20)).toBe(18); // Just base AC
    expect(getArmoredAC('heavy', 16, 8)).toBe(16); // No DEX penalty either
  });

  it('adds +2 for shield', () => {
    expect(getArmoredAC('light', 11, 16, true)).toBe(16); // 11 + 3 + 2
    expect(getArmoredAC('heavy', 18, 10, true)).toBe(20); // 18 + 2
  });
});

describe('getLevel1HP', () => {
  it('calculates max hit die + CON mod', () => {
    expect(getLevel1HP(10, 14)).toBe(12); // d10 + 2
    expect(getLevel1HP(12, 16)).toBe(15); // d12 + 3
    expect(getLevel1HP(6, 10)).toBe(6); // d6 + 0
    expect(getLevel1HP(8, 8)).toBe(7); // d8 - 1
  });
});

describe('getLevelUpHP', () => {
  it('calculates average roll + CON mod (minimum 1)', () => {
    expect(getLevelUpHP(10, 14)).toBe(8); // (10/2 + 1) + 2 = 6 + 2
    expect(getLevelUpHP(12, 16)).toBe(10); // (12/2 + 1) + 3 = 7 + 3
    expect(getLevelUpHP(6, 10)).toBe(4); // (6/2 + 1) + 0 = 4
  });

  it('returns minimum 1 HP per level', () => {
    expect(getLevelUpHP(6, 1)).toBe(1); // (4) + (-5) would be -1, but min is 1
  });
});

describe('getTotalHP', () => {
  it('calculates HP for single-class character', () => {
    // Level 1 Fighter (d10) with 14 CON: 10 + 2 = 12
    expect(getTotalHP(10, 1, 14)).toBe(12);

    // Level 5 Fighter (d10) with 14 CON: 12 + (4 * 8) = 12 + 32 = 44
    expect(getTotalHP(10, 5, 14)).toBe(44);

    // Level 1 Wizard (d6) with 14 CON: 6 + 2 = 8
    expect(getTotalHP(6, 1, 14)).toBe(8);
  });

  it('returns 0 for level 0 or negative', () => {
    expect(getTotalHP(10, 0, 14)).toBe(0);
    expect(getTotalHP(10, -1, 14)).toBe(0);
  });
});

describe('getMulticlassHP', () => {
  it('calculates HP for multiclass character', () => {
    // Fighter 3 / Wizard 2 with 14 CON (+2 mod)
    // Fighter L1: 10 + 2 = 12
    // Fighter L2-3: (10/2 + 1 + 2) * 2 = 8 * 2 = 16
    // Fighter total: 28
    // Wizard L1-2: (6/2 + 1 + 2) * 2 = 6 * 2 = 12
    // Total: 28 + 12 = 40
    const classes = [
      { hitDie: 10, level: 3 },
      { hitDie: 6, level: 2 }
    ];
    expect(getMulticlassHP(classes, 14)).toBe(40);
  });

  it('returns 0 for empty classes array', () => {
    expect(getMulticlassHP([], 14)).toBe(0);
    expect(getMulticlassHP(null, 14)).toBe(0);
  });

  it('handles single class in array format', () => {
    const classes = [{ hitDie: 10, level: 5 }];
    expect(getMulticlassHP(classes, 14)).toBe(44);
  });
});

describe('getExhaustionPenalty (2024 PHB rules)', () => {
  it('returns 0 for no exhaustion', () => {
    expect(getExhaustionPenalty(0)).toBe(0);
  });

  it('returns -2 per level of exhaustion', () => {
    expect(getExhaustionPenalty(1)).toBe(-2);
    expect(getExhaustionPenalty(2)).toBe(-4);
    expect(getExhaustionPenalty(3)).toBe(-6);
    expect(getExhaustionPenalty(4)).toBe(-8);
    expect(getExhaustionPenalty(5)).toBe(-10);
  });

  it('returns null for level 6 (dead)', () => {
    expect(getExhaustionPenalty(6)).toBeNull();
  });

  it('handles invalid input', () => {
    expect(getExhaustionPenalty(-1)).toBe(0); // Clamped to 0
    expect(getExhaustionPenalty(null)).toBe(0);
    expect(getExhaustionPenalty(undefined)).toBe(0);
    expect(getExhaustionPenalty('invalid')).toBe(0);
  });

  it('clamps values above 6 to dead', () => {
    expect(getExhaustionPenalty(7)).toBeNull();
    expect(getExhaustionPenalty(10)).toBeNull();
  });
});

describe('isDeadFromExhaustion', () => {
  it('returns false for levels 0-5', () => {
    expect(isDeadFromExhaustion(0)).toBe(false);
    expect(isDeadFromExhaustion(1)).toBe(false);
    expect(isDeadFromExhaustion(5)).toBe(false);
  });

  it('returns true for level 6+', () => {
    expect(isDeadFromExhaustion(6)).toBe(true);
    expect(isDeadFromExhaustion(7)).toBe(true);
    expect(isDeadFromExhaustion(10)).toBe(true);
  });

  it('handles invalid input', () => {
    expect(isDeadFromExhaustion(null)).toBe(false);
    expect(isDeadFromExhaustion(undefined)).toBe(false);
    expect(isDeadFromExhaustion('invalid')).toBe(false);
  });
});

describe('calculateEncumbrance', () => {
  it('empty items => totalWeight 0, status normal', () => {
    const r = calculateEncumbrance([], 10);
    expect(r.totalWeight).toBe(0);
    expect(r.status).toBe('normal');
  });

  it('null items treated as empty', () => {
    expect(calculateEncumbrance(null, 10).totalWeight).toBe(0);
  });

  it('carrying capacity = STR x 15', () => {
    expect(calculateEncumbrance([], 10).carryingCapacity).toBe(150);
    expect(calculateEncumbrance([], 15).carryingCapacity).toBe(225);
    expect(calculateEncumbrance([], 20).carryingCapacity).toBe(300);
  });

  it('heavy load threshold = STR x 10', () => {
    expect(calculateEncumbrance([], 10).heavyLoad).toBe(100);
  });

  it('calculates total weight from quantity x item weight', () => {
    const items = [{ quantity: 2, weight: 5 }, { quantity: 1, weight: 3 }];
    expect(calculateEncumbrance(items, 10).totalWeight).toBe(13);
  });

  it('quantity defaults to 1 when missing', () => {
    const items = [{ weight: 7 }];
    expect(calculateEncumbrance(items, 10).totalWeight).toBe(7);
  });

  it('status normal when weight within encumbered threshold', () => {
    const items = [{ quantity: 1, weight: 1 }]; // 1 lb, STR 10 encumbered@66lb
    expect(calculateEncumbrance(items, 10).status).toBe('normal');
  });

  it('status encumbered when weight > heavyLoad x 0.66', () => {
    // STR 10: heavyLoad=100, encumberedThreshold=66
    const items = [{ quantity: 1, weight: 70 }];
    expect(calculateEncumbrance(items, 10).status).toBe('encumbered');
  });

  it('status heavily_encumbered when weight > heavyLoad', () => {
    const items = [{ quantity: 1, weight: 110 }]; // STR 10: heavyLoad=100
    expect(calculateEncumbrance(items, 10).status).toBe('heavily_encumbered');
  });

  it('status over_capacity when weight > carryingCapacity', () => {
    const items = [{ quantity: 1, weight: 160 }]; // STR 10: capacity=150
    expect(calculateEncumbrance(items, 10).status).toBe('over_capacity');
  });

  it('uses default STR 10 for invalid input', () => {
    expect(calculateEncumbrance([], null).carryingCapacity).toBe(150);
    expect(calculateEncumbrance([], undefined).carryingCapacity).toBe(150);
  });
});
describe('recalcDerivedStats', () => {
  const SKILLS = [
    { key: 'athletics', ability: 'str' },
    { key: 'perception', ability: 'wis' },
    { key: 'stealth', ability: 'dex' },
  ];

  function makeChar(overrides = {}) {
    return {
      level: 5,
      stats: { str: 16, dex: 14, con: 12, int: 10, wis: 14, cha: 8 },
      savingThrows: {
        str: { prof: true,  bonus: 0 },
        dex: { prof: false, bonus: 0 },
        con: { prof: false, bonus: 0 },
        int: { prof: false, bonus: 0 },
        wis: { prof: true,  bonus: 0 },
        cha: { prof: false, bonus: 0 },
      },
      skills: {
        athletics:  { prof: true,  exp: false, bonus: 0 },
        perception: { prof: true,  exp: false, bonus: 0 },
        stealth:    { prof: false, exp: false, bonus: 0 },
      },
      ...overrides,
    };
  }

  it('returns null for null char', () => {
    expect(recalcDerivedStats(null)).toBeNull();
  });

  it('calculates statMods from scores', () => {
    const char = makeChar();
    recalcDerivedStats(char, SKILLS);
    expect(char.statMods.str).toBe(3);  // 16 => +3
    expect(char.statMods.dex).toBe(2);  // 14 => +2
    expect(char.statMods.wis).toBe(2);  // 14 => +2
    expect(char.statMods.cha).toBe(-1); // 8 => -1
  });

  it('calculates proficiencyBonus from level', () => {
    const char = makeChar({ level: 5 });
    recalcDerivedStats(char, SKILLS);
    expect(char.proficiencyBonus).toBe(3);
  });

  it('save bonus = mod + pb for proficient saves', () => {
    const char = makeChar({ level: 5 }); // pb=3, str=+3, wis=+2
    recalcDerivedStats(char, SKILLS);
    expect(char.savingThrows.str.bonus).toBe(6); // 3+3
    expect(char.savingThrows.wis.bonus).toBe(5); // 2+3
  });

  it('save bonus = mod only for non-proficient saves', () => {
    const char = makeChar({ level: 5 }); // dex=+2
    recalcDerivedStats(char, SKILLS);
    expect(char.savingThrows.dex.bonus).toBe(2);
    expect(char.savingThrows.cha.bonus).toBe(-1);
  });

  it('skill bonus = mod + pb for proficient skill', () => {
    const char = makeChar({ level: 5 }); // pb=3, athletics=str+3
    recalcDerivedStats(char, SKILLS);
    expect(char.skills.athletics.bonus).toBe(6); // 3+3
  });

  it('skill bonus = mod only for non-proficient skill', () => {
    const char = makeChar({ level: 5 }); // dex=+2
    recalcDerivedStats(char, SKILLS);
    expect(char.skills.stealth.bonus).toBe(2);
  });

  it('expertise doubles proficiency bonus', () => {
    const char = makeChar({ level: 5 });
    char.skills.perception.exp = true; // expertise on perception
    recalcDerivedStats(char, SKILLS);
    // wis=+2, pb=3, expertise: 2 + 3 + 3 = 8
    expect(char.skills.perception.bonus).toBe(8);
  });

  it('expertise without proficiency does not double (no exp without prof)', () => {
    const char = makeChar();
    char.skills.stealth.exp = true; // exp set but not proficient
    recalcDerivedStats(char, SKILLS);
    expect(char.skills.stealth.bonus).toBe(2); // just dex mod
  });

  it('passive perception = 10 + perception bonus', () => {
    const char = makeChar({ level: 5 });
    recalcDerivedStats(char, SKILLS);
    // perception: wis(+2) + pb(3) = +5 => passive 15
    expect(char.passivePerception).toBe(15);
    expect(char.senses.passivePerception).toBe(15);
  });

  it('passive perception = 10 + WIS mod when no skills', () => {
    const char = makeChar();
    delete char.skills;
    recalcDerivedStats(char, []);
    expect(char.passivePerception).toBe(12); // 10 + 2
  });

  it('mutates and returns the same char object', () => {
    const char = makeChar();
    const result = recalcDerivedStats(char, SKILLS);
    expect(result).toBe(char);
  });
});
describe('calculateConcentrationCheckDC', () => {
  it('damage 1 => DC 10 (minimum)', () => {
    expect(calculateConcentrationCheckDC(1)).toBe(10);
  });

  it('damage 10 => DC 10 (half is exactly 5, minimum wins)', () => {
    expect(calculateConcentrationCheckDC(10)).toBe(10);
  });

  it('damage 20 => DC 10 (half is 10)', () => {
    expect(calculateConcentrationCheckDC(20)).toBe(10);
  });

  it('damage 22 => DC 11', () => {
    expect(calculateConcentrationCheckDC(22)).toBe(11);
  });

  it('damage 50 => DC 25', () => {
    expect(calculateConcentrationCheckDC(50)).toBe(25);
  });

  it('damage 0 => DC 10', () => {
    expect(calculateConcentrationCheckDC(0)).toBe(10);
  });

  it('negative damage treated as 0 => DC 10', () => {
    expect(calculateConcentrationCheckDC(-5)).toBe(10);
  });

  it('null/undefined => DC 10', () => {
    expect(calculateConcentrationCheckDC(null)).toBe(10);
    expect(calculateConcentrationCheckDC(undefined)).toBe(10);
  });
});

describe('calculateSpellDC', () => {
  it('level 1, ability 16 => 8 + 2 + 3 = 13', () => {
    expect(calculateSpellDC(1, 16)).toBe(13);
  });

  it('level 5, ability 18 => 8 + 3 + 4 = 15', () => {
    expect(calculateSpellDC(5, 18)).toBe(15);
  });

  it('level 17, ability 20 => 8 + 6 + 5 = 19', () => {
    expect(calculateSpellDC(17, 20)).toBe(19);
  });

  it('level 1, ability 10 => 8 + 2 + 0 = 10', () => {
    expect(calculateSpellDC(1, 10)).toBe(10);
  });

  it('low ability score produces negative mod', () => {
    expect(calculateSpellDC(1, 8)).toBe(9); // 8 + 2 + (-1)
  });
});

describe('calculateSpellAttackBonus', () => {
  it('level 1, ability 16 => 2 + 3 = 5', () => {
    expect(calculateSpellAttackBonus(1, 16)).toBe(5);
  });

  it('level 5, ability 18 => 3 + 4 = 7', () => {
    expect(calculateSpellAttackBonus(5, 18)).toBe(7);
  });

  it('level 17, ability 20 => 6 + 5 = 11', () => {
    expect(calculateSpellAttackBonus(17, 20)).toBe(11);
  });

  it('level 1, ability 10 => 2 + 0 = 2', () => {
    expect(calculateSpellAttackBonus(1, 10)).toBe(2);
  });

  it('is always 5 less than the corresponding spell DC', () => {
    for (const [lvl, ab] of [[1,16],[5,14],[9,18],[17,20]]) {
      expect(calculateSpellDC(lvl, ab) - calculateSpellAttackBonus(lvl, ab)).toBe(8);
    }
  });
});
