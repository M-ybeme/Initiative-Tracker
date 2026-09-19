import { describe, it, expect } from 'vitest';
import {
  CONCENTRATION_ATTACK_BONUSES,
  getConcentrationAttackBonus,
  getAttackFeatureBonuses,
  addFlatBonusToNotation,
} from '../../Attack-rolls.js';

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
