import { describe, it, expect } from 'vitest';
import {
  CONCENTRATION_ATTACK_BONUSES,
  getConcentrationAttackBonus,
  getAttackFeatureBonuses,
  addFlatBonusToNotation,
  rollDiceSimple,
  rollDiceWithFeatures,
} from '../../Attack-rolls.js';
import { createSeededRandom } from '../../js/modules/dice.js';

describe('CONCENTRATION_ATTACK_BONUSES', () => {
  it('contains hex entry with 1d6', () => {
    expect(CONCENTRATION_ATTACK_BONUSES['hex']).toMatchObject({ notation: '1d6' });
  });

  it("contains hunter's mark entry with 1d6", () => {
    expect(CONCENTRATION_ATTACK_BONUSES["hunter's mark"]).toMatchObject({ notation: '1d6' });
  });

  it('contains spirit shroud entry with 1d8', () => {
    expect(CONCENTRATION_ATTACK_BONUSES['spirit shroud']).toMatchObject({ notation: '1d8' });
  });

  it('each entry has notation, label, and prompt', () => {
    for (const entry of Object.values(CONCENTRATION_ATTACK_BONUSES)) {
      expect(entry).toHaveProperty('notation');
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('prompt');
    }
  });
});

describe('getConcentrationAttackBonus', () => {
  it('returns entry for hex', () => {
    const result = getConcentrationAttackBonus('hex');
    expect(result).not.toBeNull();
    expect(result.notation).toBe('1d6');
  });

  it("returns entry for hunter's mark", () => {
    const result = getConcentrationAttackBonus("hunter's mark");
    expect(result).not.toBeNull();
    expect(result.notation).toBe('1d6');
  });

  it('returns entry for spirit shroud', () => {
    const result = getConcentrationAttackBonus('spirit shroud');
    expect(result).not.toBeNull();
    expect(result.notation).toBe('1d8');
  });

  it('is case-insensitive', () => {
    expect(getConcentrationAttackBonus('HEX')).not.toBeNull();
    expect(getConcentrationAttackBonus('Hex')).not.toBeNull();
    expect(getConcentrationAttackBonus('SPIRIT SHROUD')).not.toBeNull();
  });

  it('trims whitespace', () => {
    expect(getConcentrationAttackBonus('  hex  ')).not.toBeNull();
  });

  it('returns null for unknown spell', () => {
    expect(getConcentrationAttackBonus('bless')).toBeNull();
    expect(getConcentrationAttackBonus('haste')).toBeNull();
  });

  it('returns null for null/undefined/empty', () => {
    expect(getConcentrationAttackBonus(null)).toBeNull();
    expect(getConcentrationAttackBonus(undefined)).toBeNull();
    expect(getConcentrationAttackBonus('')).toBeNull();
  });
});

describe('getAttackFeatureBonuses', () => {
  const meleeAttack = { type: 'melee-weapon' };
  const rangedAttack = { type: 'ranged-weapon' };

  it('returns default structure with no bonuses', () => {
    const char = { charClass: 'Fighter 5', fightingStyles: [], feats: [] };
    const result = getAttackFeatureBonuses(char, meleeAttack);
    expect(result).toEqual({ flatBonus: 0, extraRolls: [], rerollLowDice: false, rollTwiceTakeBest: false });
  });

  it('returns default structure for null char', () => {
    const result = getAttackFeatureBonuses(null, meleeAttack);
    expect(result).toEqual({ flatBonus: 0, extraRolls: [], rerollLowDice: false, rollTwiceTakeBest: false });
  });

  it('returns default structure for null attack', () => {
    const char = { charClass: 'Fighter 5', fightingStyles: ['Dueling'], feats: [] };
    expect(getAttackFeatureBonuses(char, null).flatBonus).toBe(0);
  });

  it('adds +2 flatBonus for Dueling on melee attack', () => {
    const char = { charClass: 'Fighter 5', fightingStyles: ['Dueling'], feats: [] };
    expect(getAttackFeatureBonuses(char, meleeAttack).flatBonus).toBe(2);
  });

  it('does NOT add Dueling bonus for ranged attack', () => {
    const char = { charClass: 'Fighter 5', fightingStyles: ['Dueling'], feats: [] };
    expect(getAttackFeatureBonuses(char, rangedAttack).flatBonus).toBe(0);
  });

  it('sets rerollLowDice for Great Weapon Fighting on melee', () => {
    const char = { charClass: 'Fighter 5', fightingStyles: ['Great Weapon Fighting'], feats: [] };
    expect(getAttackFeatureBonuses(char, meleeAttack).rerollLowDice).toBe(true);
  });

  it('does NOT set rerollLowDice for Great Weapon Fighting on ranged', () => {
    const char = { charClass: 'Fighter 5', fightingStyles: ['Great Weapon Fighting'], feats: [] };
    expect(getAttackFeatureBonuses(char, rangedAttack).rerollLowDice).toBe(false);
  });

  it('sets rollTwiceTakeBest for Savage Attacker feat on melee', () => {
    const char = { charClass: 'Fighter 5', fightingStyles: [], feats: ['Savage Attacker'] };
    expect(getAttackFeatureBonuses(char, meleeAttack).rollTwiceTakeBest).toBe(true);
  });

  it('does NOT set rollTwiceTakeBest for Savage Attacker on ranged', () => {
    const char = { charClass: 'Fighter 5', fightingStyles: [], feats: ['Savage Attacker'] };
    expect(getAttackFeatureBonuses(char, rangedAttack).rollTwiceTakeBest).toBe(false);
  });

  it('adds Improved Divine Smite for Paladin level 11+ on melee', () => {
    const char = { charClass: 'Paladin 11', fightingStyles: [], feats: [] };
    const result = getAttackFeatureBonuses(char, meleeAttack);
    expect(result.extraRolls).toHaveLength(1);
    expect(result.extraRolls[0]).toMatchObject({ notation: '1d8', label: expect.stringContaining('Smite') });
  });

  it('does NOT add IDS for Paladin level 10', () => {
    const char = { charClass: 'Paladin 10', fightingStyles: [], feats: [] };
    expect(getAttackFeatureBonuses(char, meleeAttack).extraRolls).toHaveLength(0);
  });

  it('does NOT add IDS for Paladin on ranged attack', () => {
    const char = { charClass: 'Paladin 11', fightingStyles: [], feats: [] };
    expect(getAttackFeatureBonuses(char, rangedAttack).extraRolls).toHaveLength(0);
  });

  it('does NOT add IDS for non-Paladin level 11', () => {
    const char = { charClass: 'Fighter 11', fightingStyles: [], feats: [] };
    expect(getAttackFeatureBonuses(char, meleeAttack).extraRolls).toHaveLength(0);
  });

  it('parses level from charClass string format', () => {
    const char = { charClass: 'Paladin 15', fightingStyles: [], feats: [] };
    expect(getAttackFeatureBonuses(char, meleeAttack).extraRolls).toHaveLength(1);
  });

  it('falls back to char.level when charClass has no level suffix', () => {
    const char = { charClass: 'Paladin', level: 12, fightingStyles: [], feats: [] };
    expect(getAttackFeatureBonuses(char, meleeAttack).extraRolls).toHaveLength(1);
  });

  it('accumulates multiple bonuses simultaneously', () => {
    const char = { charClass: 'Paladin 11', fightingStyles: ['Dueling', 'Great Weapon Fighting'], feats: ['Savage Attacker'] };
    const result = getAttackFeatureBonuses(char, meleeAttack);
    expect(result.flatBonus).toBe(2);
    expect(result.rerollLowDice).toBe(true);
    expect(result.rollTwiceTakeBest).toBe(true);
    expect(result.extraRolls).toHaveLength(1);
  });
});

describe('addFlatBonusToNotation', () => {
  it('adds positive bonus to notation with no modifier', () => {
    expect(addFlatBonusToNotation('2d6', 2)).toBe('2d6+2');
  });

  it('adds positive bonus with existing positive modifier', () => {
    expect(addFlatBonusToNotation('2d6+3', 2)).toBe('2d6+5');
  });

  it('adds positive bonus with existing negative modifier', () => {
    expect(addFlatBonusToNotation('1d8-1', 3)).toBe('1d8+2');
  });

  it('adds negative bonus resulting in negative modifier', () => {
    expect(addFlatBonusToNotation('1d8+1', -3)).toBe('1d8-2');
  });

  it('cancels modifier to zero, omits modifier from result', () => {
    expect(addFlatBonusToNotation('1d6+2', -2)).toBe('1d6');
  });

  it('returns notation unchanged for zero bonus', () => {
    expect(addFlatBonusToNotation('2d6+3', 0)).toBe('2d6+3');
  });

  it('returns notation unchanged for falsy bonus', () => {
    expect(addFlatBonusToNotation('1d8', null)).toBe('1d8');
    expect(addFlatBonusToNotation('1d8', undefined)).toBe('1d8');
  });

  it('returns notation unchanged for invalid notation', () => {
    expect(addFlatBonusToNotation('invalid', 2)).toBe('invalid');
    expect(addFlatBonusToNotation('', 2)).toBe('');
  });

  it('handles d-notation without count prefix', () => {
    expect(addFlatBonusToNotation('d6', 2)).toBe('d6+2');
  });
});

describe('rollDiceSimple', () => {
  it('returns correct result structure', () => {
    const seededRandom = createSeededRandom(42);
    const result = rollDiceSimple('2d6+3', 'Fire damage', seededRandom);
    expect(result).toHaveProperty('notation', '2d6+3');
    expect(result).toHaveProperty('description', 'Fire damage');
    expect(result).toHaveProperty('rolls');
    expect(result).toHaveProperty('modifier', 3);
    expect(result).toHaveProperty('total');
    expect(result.rolls).toHaveLength(2);
  });

  it('calculates total correctly', () => {
    const mockRandom = () => 2 / 6;
    const result = rollDiceSimple('2d6+3', '', mockRandom);
    expect(result.total).toBe(9);
  });

  it('calculates total with negative modifier', () => {
    const mockRandom = () => 4 / 8;
    const result = rollDiceSimple('1d8-1', '', mockRandom);
    expect(result.total).toBe(4);
  });

  it('returns null for invalid notation', () => {
    expect(rollDiceSimple('invalid')).toBeNull();
    expect(rollDiceSimple('')).toBeNull();
  });

  it('marks isCritical on natural 20 for d20', () => {
    const mockRandom = () => 19 / 20;
    const result = rollDiceSimple('1d20', '', mockRandom);
    expect(result.isCritical).toBe(true);
    expect(result.isFumble).toBe(false);
  });

  it('marks isFumble on natural 1 for d20', () => {
    const mockRandom = () => 0;
    const result = rollDiceSimple('1d20', '', mockRandom);
    expect(result.isFumble).toBe(true);
    expect(result.isCritical).toBe(false);
  });

  it('does NOT mark isCritical/isFumble for non-d20 dice', () => {
    const mockMax = () => 5 / 6;
    const result = rollDiceSimple('1d6', '', mockMax);
    expect(result.isCritical).toBe(false);
    expect(result.isFumble).toBe(false);
  });

  it('rolls correct number of dice', () => {
    const seededRandom = createSeededRandom(123);
    const result = rollDiceSimple('4d6', '', seededRandom);
    expect(result.rolls).toHaveLength(4);
  });
});

describe('rollDiceWithFeatures', () => {
  it('delegates to rollDiceSimple when no features set', () => {
    const mockRandom = () => 2 / 6;
    const result = rollDiceWithFeatures('2d6+3', 'damage', {}, mockRandom);
    expect(result.total).toBe(9);
    expect(result.description).toBe('damage');
  });

  it('delegates to rollDiceSimple when both features false', () => {
    const seededRandom = createSeededRandom(42);
    const result = rollDiceWithFeatures('2d6', '', { rerollLowDice: false, rollTwiceTakeBest: false }, seededRandom);
    expect(result).not.toBeNull();
    expect(result.rolls).toHaveLength(2);
  });

  it('returns null for invalid notation regardless of features', () => {
    expect(rollDiceWithFeatures('invalid', '', { rerollLowDice: true })).toBeNull();
  });

  it('GWF: rerolls dice showing 1 or 2', () => {
    let callCount = 0;
    const mockRandom = () => {
      callCount++;
      return callCount % 2 === 1 ? 0 : 4 / 6;
    };
    const result = rollDiceWithFeatures('1d6', '', { rerollLowDice: true }, mockRandom);
    expect(result.rolls[0]).toBe(5);
    expect(result.description).toContain('[GWF]');
  });

  it('GWF: does not reroll dice showing 3+', () => {
    const mockRandom = () => 3 / 6;
    const result = rollDiceWithFeatures('2d6', '', { rerollLowDice: true }, mockRandom);
    result.rolls.forEach(r => expect(r).toBeGreaterThan(2));
    expect(result.description).toContain('[GWF]');
  });

  it('SA: picks the higher of two roll sets', () => {
    let rollSetCount = 0;
    const mockRandom = () => {
      rollSetCount++;
      return rollSetCount <= 2 ? 0 : 5 / 6;
    };
    const result = rollDiceWithFeatures('2d6', 'damage', { rollTwiceTakeBest: true }, mockRandom);
    expect(result.rolls).toEqual([6, 6]);
    expect(result.total).toBe(12);
    expect(result.description).toContain('[SA:');
  });

  it('SA: description includes both totals', () => {
    const seededRandom = createSeededRandom(55);
    const result = rollDiceWithFeatures('1d6', 'test', { rollTwiceTakeBest: true }, seededRandom);
    expect(result.description).toMatch(/[SA: d+ vs d+]/);
  });

  it('SA + GWF: both suffixes appear', () => {
    const seededRandom = createSeededRandom(99);
    const result = rollDiceWithFeatures('2d6', 'damage', { rerollLowDice: true, rollTwiceTakeBest: true }, seededRandom);
    expect(result.description).toContain('[SA:');
    expect(result.description).toContain('[GWF]');
  });

  it('SA + GWF: [SA:] appears before [GWF] in description', () => {
    const seededRandom = createSeededRandom(77);
    const result = rollDiceWithFeatures('1d6', '', { rerollLowDice: true, rollTwiceTakeBest: true }, seededRandom);
    const saIdx = result.description.indexOf('[SA:');
    const gwfIdx = result.description.indexOf('[GWF]');
    expect(saIdx).toBeLessThan(gwfIdx);
  });
});
