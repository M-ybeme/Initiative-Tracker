import { describe, it, expect } from 'vitest';
import {
  calcSpellSaveDC,
  calcSpellAttackBonus,
  getConcentrationCheckDC,
  calcLongRestHitDiceRestored,
  rollHitDiceForHealing,
  applyShortRest,
  applyLongRest,
} from '../../js/character/character-rest.js';
import { createSeededRandom } from '../../js/modules/dice.js';

describe('calcSpellSaveDC', () => {
  it('returns 8 + profBonus + abilMod', () => {
    expect(calcSpellSaveDC(2, 3)).toBe(13);   // 8+2+3
    expect(calcSpellSaveDC(3, 4)).toBe(15);   // 8+3+4
    expect(calcSpellSaveDC(6, 5)).toBe(19);   // 8+6+5
  });

  it('handles zero modifier', () => {
    expect(calcSpellSaveDC(2, 0)).toBe(10);   // 8+2+0
  });

  it('handles negative modifier', () => {
    expect(calcSpellSaveDC(2, -1)).toBe(9);   // 8+2-1
  });

  it('treats null/undefined as 0', () => {
    expect(calcSpellSaveDC(null, null)).toBe(8);
    expect(calcSpellSaveDC(undefined, undefined)).toBe(8);
    expect(calcSpellSaveDC(2, null)).toBe(10);
  });
});

describe('calcSpellAttackBonus', () => {
  it('returns profBonus + abilMod', () => {
    expect(calcSpellAttackBonus(2, 3)).toBe(5);
    expect(calcSpellAttackBonus(4, 2)).toBe(6);
    expect(calcSpellAttackBonus(6, 5)).toBe(11);
  });

  it('handles zero modifier', () => {
    expect(calcSpellAttackBonus(2, 0)).toBe(2);
  });

  it('handles negative modifier', () => {
    expect(calcSpellAttackBonus(2, -1)).toBe(1);
  });

  it('treats null/undefined as 0', () => {
    expect(calcSpellAttackBonus(null, null)).toBe(0);
    expect(calcSpellAttackBonus(3, undefined)).toBe(3);
  });
});

describe('getConcentrationCheckDC', () => {
  it('returns 10 for low damage (10 or less)', () => {
    expect(getConcentrationCheckDC(1)).toBe(10);   // max(10, floor(1/2)=0) = 10
    expect(getConcentrationCheckDC(10)).toBe(10);  // max(10, 5) = 10
    expect(getConcentrationCheckDC(19)).toBe(10);  // max(10, 9) = 10
    expect(getConcentrationCheckDC(20)).toBe(10);  // max(10, 10) = 10
  });

  it('returns half damage when that exceeds 10', () => {
    expect(getConcentrationCheckDC(22)).toBe(11);  // max(10, 11) = 11
    expect(getConcentrationCheckDC(40)).toBe(20);  // max(10, 20) = 20
    expect(getConcentrationCheckDC(100)).toBe(50); // max(10, 50) = 50
  });

  it('floors fractional half-damage', () => {
    expect(getConcentrationCheckDC(21)).toBe(10);  // max(10, floor(21/2)=10) = 10
    expect(getConcentrationCheckDC(23)).toBe(11);  // max(10, floor(23/2)=11) = 11
  });

  it('treats 0 or negative damage as 0 (DC 10)', () => {
    expect(getConcentrationCheckDC(0)).toBe(10);
    expect(getConcentrationCheckDC(-5)).toBe(10);
  });

  it('treats null/undefined/NaN as 0 (DC 10)', () => {
    expect(getConcentrationCheckDC(null)).toBe(10);
    expect(getConcentrationCheckDC(undefined)).toBe(10);
    expect(getConcentrationCheckDC(NaN)).toBe(10);
  });
});

describe('calcLongRestHitDiceRestored', () => {
  it('restores half of total hit dice (rounded down)', () => {
    // Level 10 fighter (10 total): restores floor(10/2) = 5
    expect(calcLongRestHitDiceRestored(10, 0)).toBe(5);
    expect(calcLongRestHitDiceRestored(10, 3)).toBe(8);
    expect(calcLongRestHitDiceRestored(8, 0)).toBe(4);
  });

  it('restores minimum 1 even at level 1', () => {
    // Level 1: floor(1/2) = 0, but minimum is 1
    expect(calcLongRestHitDiceRestored(1, 0)).toBe(1);
    expect(calcLongRestHitDiceRestored(1, 1)).toBe(1); // already at max
  });

  it('does not exceed total hit dice', () => {
    // Level 4 has 4 total, already has 3, restores floor(4/2)=2 => min(4, 3+2) = 4
    expect(calcLongRestHitDiceRestored(4, 3)).toBe(4);
    // Already at max, still can't exceed max
    expect(calcLongRestHitDiceRestored(6, 6)).toBe(6);
  });

  it('rounds down at odd total values', () => {
    // 7 total: floor(7/2) = 3
    expect(calcLongRestHitDiceRestored(7, 0)).toBe(3);
    // 5 total: floor(5/2) = 2
    expect(calcLongRestHitDiceRestored(5, 0)).toBe(2);
  });

  it('returns 0 for 0 total hit dice', () => {
    expect(calcLongRestHitDiceRestored(0, 0)).toBe(0);
  });

  it('handles null/undefined inputs as 0', () => {
    expect(calcLongRestHitDiceRestored(null, null)).toBe(0);
    expect(calcLongRestHitDiceRestored(undefined, 3)).toBe(0);
  });
});

describe('rollHitDiceForHealing', () => {
  it('returns correct structure', () => {
    const seededRandom = createSeededRandom(42);
    const result = rollHitDiceForHealing(10, 2, 2, seededRandom);
    expect(result).toHaveProperty('rolls');
    expect(result).toHaveProperty('rawTotal');
    expect(result).toHaveProperty('healing');
    expect(result.rolls).toHaveLength(2);
  });

  it('all rolls are within valid die range', () => {
    const seededRandom = createSeededRandom(99);
    const result = rollHitDiceForHealing(8, 4, 0, seededRandom);
    result.rolls.forEach(r => {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(8);
    });
  });

  it('adds CON modifier to each roll in rawTotal', () => {
    const mockRandom = () => 4 / 10; // Returns 5 on d10
    const result = rollHitDiceForHealing(10, 3, 2, mockRandom);
    // 3 rolls of 5, each +2 conMod: 7+7+7 = 21
    expect(result.rawTotal).toBe(21);
    expect(result.rolls).toEqual([5, 5, 5]);
  });

  it('healing equals rawTotal when rawTotal >= count', () => {
    const mockRandom = () => 4 / 10; // Returns 5 on d10
    const result = rollHitDiceForHealing(10, 2, 0, mockRandom);
    // 2 rolls of 5: rawTotal = 10, count = 2, healing = max(10, 2) = 10
    expect(result.rawTotal).toBe(10);
    expect(result.healing).toBe(10);
  });

  it('enforces minimum 1 HP per die when rawTotal is low', () => {
    // d6 rolls 1, conMod = -3: each die gives 1-3=-2, 2 dice = -4 rawTotal
    // healing = max(-4, 2) = 2 (minimum 1 per die)
    const mockRandom = () => 0; // Returns 1 on any die
    const result = rollHitDiceForHealing(6, 2, -3, mockRandom);
    expect(result.rawTotal).toBe(-4); // (1-3) + (1-3)
    expect(result.healing).toBe(2);   // min 1 per die
  });

  it('minimum 1 HP for a single die with very negative CON', () => {
    const mockRandom = () => 0; // Returns 1 on d8
    const result = rollHitDiceForHealing(8, 1, -5, mockRandom);
    expect(result.rawTotal).toBe(-4); // 1-5
    expect(result.healing).toBe(1);   // min 1 per die * 1 die
  });

  it('default conMod is 0', () => {
    const mockRandom = () => 4 / 6; // Returns 5 on d6
    const result = rollHitDiceForHealing(6, 2, undefined, mockRandom);
    expect(result.rawTotal).toBe(10);
  });

  it('uses injectable randomFn (seeded = deterministic)', () => {
    const r1 = createSeededRandom(77);
    const r2 = createSeededRandom(77);
    const res1 = rollHitDiceForHealing(10, 3, 1, r1);
    const res2 = rollHitDiceForHealing(10, 3, 1, r2);
    expect(res1.rolls).toEqual(res2.rolls);
    expect(res1.healing).toBe(res2.healing);
  });
});

describe('applyShortRest', () => {
  function makeChar(overrides = {}) {
    return {
      currentHP: 10,
      maxHP: 30,
      hitDiceRemaining: '3d10',
      ...overrides,
    };
  }

  it('heals by given amount', () => {
    const char = makeChar();
    applyShortRest(char, 8, 0);
    expect(char.currentHP).toBe(18);
  });

  it('caps healing at maxHP', () => {
    const char = makeChar({ currentHP: 28 });
    applyShortRest(char, 10, 0);
    expect(char.currentHP).toBe(30);
  });

  it('does not heal below 0', () => {
    const char = makeChar({ currentHP: 5 });
    applyShortRest(char, -10, 0);
    expect(char.currentHP).toBe(5);
  });

  it('decreases hitDiceRemaining by spent count', () => {
    const char = makeChar();
    applyShortRest(char, 0, 2);
    expect(char.hitDiceRemaining).toBe('1d10');
  });

  it('hitDiceRemaining cannot go below 0', () => {
    const char = makeChar({ hitDiceRemaining: '1d10' });
    applyShortRest(char, 0, 5);
    expect(char.hitDiceRemaining).toBe('0d10');
  });

  it('preserves die size when reducing count', () => {
    const char = makeChar({ hitDiceRemaining: '4d8' });
    applyShortRest(char, 0, 1);
    expect(char.hitDiceRemaining).toBe('3d8');
  });

  it('handles missing hitDiceRemaining gracefully', () => {
    const char = makeChar({ hitDiceRemaining: undefined });
    expect(() => applyShortRest(char, 5, 1)).not.toThrow();
  });

  it('returns null for null char', () => {
    expect(applyShortRest(null, 5, 1)).toBeNull();
  });

  it('mutates and returns the same char object', () => {
    const char = makeChar();
    expect(applyShortRest(char, 5, 1)).toBe(char);
  });
});
describe('applyLongRest', () => {
  function makeChar(overrides = {}) {
    return {
      currentHP: 5,
      maxHP: 30,
      tempHP: 10,
      hitDice: '5d10',
      hitDiceRemaining: '2d10',
      spellSlots: {
        1: { max: 4, used: 3 },
        2: { max: 3, used: 2 },
        3: { max: 2, used: 2 },
        4: { max: 0, used: 0 },
      },
      pactSlots: { max: 2, used: 2 },
      ...overrides,
    };
  }

  it('restores currentHP to maxHP', () => {
    const char = makeChar();
    applyLongRest(char);
    expect(char.currentHP).toBe(30);
  });

  it('clears tempHP to 0', () => {
    const char = makeChar();
    applyLongRest(char);
    expect(char.tempHP).toBe(0);
  });

  it('restores hit dice (half of total, rounded down, min 1)', () => {
    // total=5, remaining=2, restore=max(1,floor(5/2))=2, new=min(5,2+2)=4
    const char = makeChar();
    applyLongRest(char);
    expect(char.hitDiceRemaining).toBe('4d10');
  });

  it('does not exceed total hit dice when restoring', () => {
    // total=4, remaining=4, restore=2, new=min(4,6)=4
    const char = makeChar({ hitDice: '4d10', hitDiceRemaining: '4d10' });
    applyLongRest(char);
    expect(char.hitDiceRemaining).toBe('4d10');
  });

  it('restores at least 1 hit die even when total is 1', () => {
    // total=1, remaining=0, restore=max(1,0)=1, new=min(1,1)=1
    const char = makeChar({ hitDice: '1d8', hitDiceRemaining: '0d8' });
    applyLongRest(char);
    expect(char.hitDiceRemaining).toBe('1d8');
  });

  it('preserves die size in hitDiceRemaining string', () => {
    const char = makeChar({ hitDice: '3d8', hitDiceRemaining: '0d8' });
    applyLongRest(char);
    expect(char.hitDiceRemaining).toMatch(/d8$/);
  });

  it('resets all spell slot used counts to 0', () => {
    const char = makeChar();
    applyLongRest(char);
    for (let i = 1; i <= 4; i++) {
      expect(char.spellSlots[i].used).toBe(0);
    }
  });

  it('does not change spell slot max values', () => {
    const char = makeChar();
    applyLongRest(char);
    expect(char.spellSlots[1].max).toBe(4);
    expect(char.spellSlots[2].max).toBe(3);
  });

  it('resets pactSlots used to 0', () => {
    const char = makeChar();
    applyLongRest(char);
    expect(char.pactSlots.used).toBe(0);
  });

  it('handles char with no pactSlots gracefully', () => {
    const char = makeChar({ pactSlots: undefined });
    expect(() => applyLongRest(char)).not.toThrow();
  });

  it('handles char with no spellSlots gracefully', () => {
    const char = makeChar({ spellSlots: undefined });
    expect(() => applyLongRest(char)).not.toThrow();
  });

  it('handles 0 HP character', () => {
    const char = makeChar({ currentHP: 0 });
    applyLongRest(char);
    expect(char.currentHP).toBe(30);
  });

  it('returns null for null char', () => {
    expect(applyLongRest(null)).toBeNull();
  });

  it('mutates and returns the same char object', () => {
    const char = makeChar();
    expect(applyLongRest(char)).toBe(char);
  });
});
