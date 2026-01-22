import { describe, it, expect } from 'vitest';
import {
  rollDie,
  parseDiceNotation,
  rollMultipleDice,
  rollDiceNotation,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollAbilityScore,
  rollAbilityScoreSet,
  createSeededRandom
} from '../../js/modules/dice.js';

describe('parseDiceNotation', () => {
  it('parses simple notation "1d20"', () => {
    const result = parseDiceNotation('1d20');
    expect(result).toEqual({
      count: 1,
      sides: 20,
      modifier: 0,
      keepHighest: null,
      keepLowest: null
    });
  });

  it('parses "d20" as "1d20"', () => {
    const result = parseDiceNotation('d20');
    expect(result.count).toBe(1);
    expect(result.sides).toBe(20);
  });

  it('parses notation with positive modifier "2d6+3"', () => {
    const result = parseDiceNotation('2d6+3');
    expect(result).toEqual({
      count: 2,
      sides: 6,
      modifier: 3,
      keepHighest: null,
      keepLowest: null
    });
  });

  it('parses notation with negative modifier "1d8-1"', () => {
    const result = parseDiceNotation('1d8-1');
    expect(result).toEqual({
      count: 1,
      sides: 8,
      modifier: -1,
      keepHighest: null,
      keepLowest: null
    });
  });

  it('parses keep highest notation "4d6kh3"', () => {
    const result = parseDiceNotation('4d6kh3');
    expect(result).toEqual({
      count: 4,
      sides: 6,
      modifier: 0,
      keepHighest: 3,
      keepLowest: null
    });
  });

  it('parses keep lowest notation "2d20kl1"', () => {
    const result = parseDiceNotation('2d20kl1');
    expect(result).toEqual({
      count: 2,
      sides: 20,
      modifier: 0,
      keepHighest: null,
      keepLowest: 1
    });
  });

  it('handles whitespace', () => {
    const result = parseDiceNotation('  2d6 + 3  ');
    expect(result.count).toBe(2);
    expect(result.sides).toBe(6);
    expect(result.modifier).toBe(3);
  });

  it('is case insensitive', () => {
    const result = parseDiceNotation('2D6KH1');
    expect(result.count).toBe(2);
    expect(result.keepHighest).toBe(1);
  });

  it('returns null for invalid notation', () => {
    expect(parseDiceNotation('')).toBeNull();
    expect(parseDiceNotation('invalid')).toBeNull();
    expect(parseDiceNotation('abc')).toBeNull();
    expect(parseDiceNotation(null)).toBeNull();
    expect(parseDiceNotation(undefined)).toBeNull();
  });

  it('returns null for invalid keep count', () => {
    expect(parseDiceNotation('2d6kh0')).toBeNull(); // Keep 0
    expect(parseDiceNotation('2d6kh5')).toBeNull(); // Keep more than rolled
  });
});

describe('rollDie', () => {
  it('returns values between 1 and sides', () => {
    const seededRandom = createSeededRandom(12345);
    for (let i = 0; i < 100; i++) {
      const result = rollDie(20, seededRandom);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    }
  });

  it('produces deterministic results with seeded random', () => {
    const random1 = createSeededRandom(42);
    const random2 = createSeededRandom(42);

    const results1 = [rollDie(20, random1), rollDie(20, random1), rollDie(20, random1)];
    const results2 = [rollDie(20, random2), rollDie(20, random2), rollDie(20, random2)];

    expect(results1).toEqual(results2);
  });
});

describe('rollMultipleDice', () => {
  it('returns correct number of dice', () => {
    const seededRandom = createSeededRandom(123);
    const rolls = rollMultipleDice(4, 6, seededRandom);
    expect(rolls).toHaveLength(4);
  });

  it('all values are in valid range', () => {
    const seededRandom = createSeededRandom(456);
    const rolls = rollMultipleDice(10, 8, seededRandom);
    rolls.forEach(roll => {
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(8);
    });
  });
});

describe('rollDiceNotation', () => {
  it('returns null for invalid notation', () => {
    expect(rollDiceNotation('invalid')).toBeNull();
  });

  it('returns correct structure', () => {
    const seededRandom = createSeededRandom(789);
    const result = rollDiceNotation('2d6+3', seededRandom);

    expect(result).toHaveProperty('notation', '2d6+3');
    expect(result).toHaveProperty('rolls');
    expect(result).toHaveProperty('kept');
    expect(result).toHaveProperty('modifier', 3);
    expect(result).toHaveProperty('total');
    expect(result.rolls).toHaveLength(2);
  });

  it('calculates total correctly', () => {
    // Use a mock that always returns 3
    const mockRandom = () => 2 / 6; // Will give us 3 on a d6
    const result = rollDiceNotation('2d6+5', mockRandom);

    // 3 + 3 + 5 = 11
    expect(result.total).toBe(11);
  });

  it('handles keep highest correctly', () => {
    // Mock rolls: 1, 2, 3, 4 (we control via seeded random)
    const seededRandom = createSeededRandom(999);
    const result = rollDiceNotation('4d6kh3', seededRandom);

    expect(result.rolls).toHaveLength(4);
    expect(result.kept).toHaveLength(3);

    // Kept should be the 3 highest
    const sortedRolls = [...result.rolls].sort((a, b) => b - a);
    expect(result.kept.sort((a, b) => b - a)).toEqual(sortedRolls.slice(0, 3));
  });

  it('handles keep lowest correctly', () => {
    const seededRandom = createSeededRandom(111);
    const result = rollDiceNotation('2d20kl1', seededRandom);

    expect(result.rolls).toHaveLength(2);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]).toBe(Math.min(...result.rolls));
  });

  it('marks critical on natural 20', () => {
    // Mock that returns 20
    const mockRandom = () => 19 / 20;
    const result = rollDiceNotation('1d20', mockRandom);
    expect(result.isCritical).toBe(true);
    expect(result.isFumble).toBe(false);
  });

  it('marks fumble on natural 1', () => {
    // Mock that returns 1
    const mockRandom = () => 0;
    const result = rollDiceNotation('1d20', mockRandom);
    expect(result.isFumble).toBe(true);
    expect(result.isCritical).toBe(false);
  });
});

describe('rollWithAdvantage', () => {
  it('returns two rolls and keeps highest', () => {
    const seededRandom = createSeededRandom(222);
    const result = rollWithAdvantage(0, seededRandom);

    expect(result.rolls).toHaveLength(2);
    expect(result.chosen).toBe(Math.max(...result.rolls));
  });

  it('adds bonus to total', () => {
    const mockRandom = () => 9 / 20; // Returns 10
    const result = rollWithAdvantage(5, mockRandom);

    expect(result.total).toBe(15); // 10 + 5
  });

  it('detects critical when chosen is 20', () => {
    const mockRandom = () => 19 / 20; // Returns 20
    const result = rollWithAdvantage(0, mockRandom);
    expect(result.isCritical).toBe(true);
  });
});

describe('rollWithDisadvantage', () => {
  it('returns two rolls and keeps lowest', () => {
    const seededRandom = createSeededRandom(333);
    const result = rollWithDisadvantage(0, seededRandom);

    expect(result.rolls).toHaveLength(2);
    expect(result.chosen).toBe(Math.min(...result.rolls));
  });

  it('adds bonus to total', () => {
    const mockRandom = () => 9 / 20; // Returns 10
    const result = rollWithDisadvantage(3, mockRandom);

    expect(result.total).toBe(13); // 10 + 3
  });

  it('detects fumble when chosen is 1', () => {
    const mockRandom = () => 0; // Returns 1
    const result = rollWithDisadvantage(0, mockRandom);
    expect(result.isFumble).toBe(true);
  });
});

describe('rollAbilityScore', () => {
  it('rolls 4d6 and drops lowest', () => {
    const seededRandom = createSeededRandom(444);
    const result = rollAbilityScore(seededRandom);

    expect(result.rolls).toHaveLength(4);
    expect(result.kept).toHaveLength(3);
    expect(result.dropped).toBe(Math.min(...result.rolls));
  });

  it('returns value between 3 and 18', () => {
    const seededRandom = createSeededRandom(555);
    for (let i = 0; i < 100; i++) {
      const result = rollAbilityScore(seededRandom);
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(18);
    }
  });

  it('total equals sum of kept dice', () => {
    const seededRandom = createSeededRandom(666);
    const result = rollAbilityScore(seededRandom);
    const expectedTotal = result.kept.reduce((sum, r) => sum + r, 0);
    expect(result.total).toBe(expectedTotal);
  });
});

describe('rollAbilityScoreSet', () => {
  it('generates 6 ability scores', () => {
    const seededRandom = createSeededRandom(777);
    const scores = rollAbilityScoreSet(seededRandom);
    expect(scores).toHaveLength(6);
  });

  it('all scores are between 3 and 18', () => {
    const seededRandom = createSeededRandom(888);
    const scores = rollAbilityScoreSet(seededRandom);
    scores.forEach(score => {
      expect(score).toBeGreaterThanOrEqual(3);
      expect(score).toBeLessThanOrEqual(18);
    });
  });
});

describe('createSeededRandom', () => {
  it('produces deterministic sequence', () => {
    const random1 = createSeededRandom(12345);
    const random2 = createSeededRandom(12345);

    const sequence1 = [random1(), random1(), random1()];
    const sequence2 = [random2(), random2(), random2()];

    expect(sequence1).toEqual(sequence2);
  });

  it('different seeds produce different sequences', () => {
    const random1 = createSeededRandom(111);
    const random2 = createSeededRandom(222);

    const val1 = random1();
    const val2 = random2();

    expect(val1).not.toBe(val2);
  });

  it('returns values between 0 and 1', () => {
    const random = createSeededRandom(999);
    for (let i = 0; i < 100; i++) {
      const val = random();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});
