import { describe, it, expect } from 'vitest';
import {
  rollDie,
  parseDiceNotation,
  rollMultipleDice,
  rollDiceNotation,
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

// ---------------------------------------------------------------------------------------------
// The dice engine (js/modules/dice-engine.js) as the app's single implementation of dice rules.
// Everything below scripts the dice: dice(sides, ...faces) makes a randomFn that produces exactly
// those faces in order, and mixed([sides, face], ...) does the same for dice of different sizes.
// ---------------------------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { vi } from 'vitest';
import {
  parseDiceExpression,
  rollDiceExpression,
  rollD20,
  describeFeatureRoll,
  normalizeLegacyDamageNotation,
  rollHitDice,
  rollDie as engineRollDie
} from '../../js/modules/dice.js';

const scripted = (faceCenters) => {
  const queue = faceCenters.slice();
  return () => {
    if (!queue.length) throw new Error('more dice were rolled than scripted');
    return queue.shift();
  };
};
const dice = (sides, ...faces) => scripted(faces.map(f => (f - 0.5) / sides));
const mixed = (...pairs) => scripted(pairs.map(([sides, face]) => (face - 0.5) / sides));

describe('the engine is one implementation reachable two ways', () => {
  const source = readFileSync(resolve(process.cwd(), 'js/modules/dice-engine.js'), 'utf8');

  it('runs as a plain classic script (no import/export) and publishes DiceEngine', () => {
    const context = {};
    runInNewContext(source, context);
    expect(Object.keys(context.DiceEngine).sort()).toEqual(
      ['MAX_DICE_COUNT', 'MAX_DICE_NOTATION_LENGTH', 'MAX_DIE_SIDES', 'createSeededRandom', 'describeFeatureRoll',
        'normalizeLegacyDamageNotation', 'parseDiceExpression', 'parseDiceNotation', 'rollAbilityScore',
        'rollAbilityScoreSet', 'rollD20', 'rollDiceExpression', 'rollDiceNotation', 'rollDie',
        'rollHitDice', 'rollMultipleDice'].sort());
    expect(context.DiceEngine.rollDie(6, () => 0.5)).toBe(4);
  });

  it('loading it a second time keeps the first instance', () => {
    const context = {};
    runInNewContext(source, context);
    const first = context.DiceEngine;
    runInNewContext(source, context);
    expect(context.DiceEngine).toBe(first);
  });

  it('the ES facade exports exactly the functions of the global', async () => {
    const facade = await import('../../js/modules/dice.js');
    expect(Object.keys(facade).sort()).toEqual(Object.keys(globalThis.DiceEngine).sort());
    for (const [name, fn] of Object.entries(globalThis.DiceEngine)) {
      expect(facade[name], name).toBe(fn);
    }
  });

  it('reads Math.random when no randomFn is passed', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      expect(engineRollDie(20)).toBe(20);
    } finally { spy.mockRestore(); }
  });
});

describe('rollDie boundaries', () => {
  it('a random value of 0 is 1 and just under 1 is the top face', () => {
    expect(rollDie(20, () => 0)).toBe(1);
    expect(rollDie(20, () => 0.9999999999)).toBe(20);
    expect(rollDie(1, () => 0.7)).toBe(1);
  });
});

describe('rollDiceNotation: kept dice and result shape', () => {
  it('keep highest keeps the highest dice, in ascending order', () => {
    const r = rollDiceNotation('4d6kh3', dice(6, 3, 5, 2, 6));
    expect(r.rolls).toEqual([3, 5, 2, 6]);
    expect(r.kept).toEqual([3, 5, 6]);
    expect(r.total).toBe(14);
  });

  it('keep lowest keeps the lowest dice, in ascending order', () => {
    const r = rollDiceNotation('3d20kl2+1', dice(20, 9, 4, 15));
    expect(r.kept).toEqual([4, 9]);
    expect(r.total).toBe(14);
  });

  it('keeping every die leaves the rolled order alone', () => {
    expect(rollDiceNotation('3d6kh3', dice(6, 5, 1, 4)).kept).toEqual([5, 1, 4]);
  });

  it('reports the dice count and sides it rolled', () => {
    const r = rollDiceNotation('3d8-2', dice(8, 1, 1, 1));
    expect(r).toMatchObject({ count: 3, sides: 8, modifier: -2, total: 1, twiceRoll: null });
  });

  it('a natural 20 counts only if the 20 was kept', () => {
    expect(rollDiceNotation('2d20kl1', dice(20, 20, 7)).isCritical).toBe(false);
    expect(rollDiceNotation('2d20kh1', dice(20, 20, 7)).isCritical).toBe(true);
  });
});

describe('rollDiceNotation: Great Weapon Fighting', () => {
  it('rerolls a 1 and uses the new roll even if it is lower', () => {
    const r = rollDiceNotation('1d6', dice(6, 1, 1), { rerollLowDice: true });
    expect(r.rolls).toEqual([1]);
  });

  it('rerolls a 2 but not a 3', () => {
    const r = rollDiceNotation('2d6', dice(6, 2, 5, 3), { rerollLowDice: true });
    expect(r.rolls).toEqual([5, 3]);
    expect(r.total).toBe(8);
  });

  it('rerolls each die once, in order (dice used: die 1, its reroll, die 2)', () => {
    const script = vi.fn(dice(6, 1, 6, 4));
    const r = rollDiceNotation('2d6', script, { rerollLowDice: true });
    expect(script).toHaveBeenCalledTimes(3);
    expect(r.rolls).toEqual([6, 4]);
  });
});

describe('rollDiceNotation: Savage Attacker', () => {
  it('keeps the set with the higher total and reports both totals', () => {
    const r = rollDiceNotation('2d6+1', dice(6, 1, 2, 6, 5), { rollTwiceTakeBest: true });
    expect(r.rolls).toEqual([6, 5]);
    expect(r.total).toBe(12);
    expect(r.twiceRoll).toEqual({ taken: 11, discarded: 3 });
  });

  it('keeps the first set when the totals tie', () => {
    const r = rollDiceNotation('2d6', dice(6, 3, 4, 2, 5), { rollTwiceTakeBest: true });
    expect(r.rolls).toEqual([3, 4]);
    expect(r.twiceRoll).toEqual({ taken: 7, discarded: 7 });
  });

  it('with Great Weapon Fighting, rerolls happen inside each set before they are compared', () => {
    // set 1: die 1 -> rerolled to 6; set 2: die 5  => 6 vs 5
    const r = rollDiceNotation('1d6', dice(6, 1, 6, 5), { rerollLowDice: true, rollTwiceTakeBest: true });
    expect(r.rolls).toEqual([6]);
    expect(r.twiceRoll).toEqual({ taken: 6, discarded: 5 });
  });

  it('rolls once and reports no comparison when the feature is off', () => {
    const script = vi.fn(dice(6, 3, 4));
    const r = rollDiceNotation('2d6', script);
    expect(script).toHaveBeenCalledTimes(2);
    expect(r.twiceRoll).toBeNull();
  });
});

describe('describeFeatureRoll', () => {
  it('is empty with no feature', () => {
    expect(describeFeatureRoll(rollDiceNotation('1d6', dice(6, 3)))).toBe('');
  });
  it('notes Great Weapon Fighting', () => {
    expect(describeFeatureRoll(rollDiceNotation('1d6', dice(6, 4), { rerollLowDice: true }))).toBe(' [GWF]');
  });
  it('notes Savage Attacker with the two totals', () => {
    expect(describeFeatureRoll(rollDiceNotation('1d6', dice(6, 2, 5), { rollTwiceTakeBest: true }))).toBe(' [SA: 5 vs 2]');
  });
  it('lists Savage Attacker before Great Weapon Fighting', () => {
    const r = rollDiceNotation('1d6', dice(6, 4, 3), { rerollLowDice: true, rollTwiceTakeBest: true });
    expect(describeFeatureRoll(r)).toBe(' [SA: 4 vs 3] [GWF]');
  });
});

describe('parseDiceExpression', () => {
  const group = (count, sides, sign = 1, keepDir = null, keepN = null) => ({ type: 'dice', sign, count, sides, keepDir, keepN });
  it.each([
    ['2d6+3', [group(2, 6), { type: 'mod', n: 3 }]],
    ['d20', [group(1, 20)]],
    ['1d8-2', [group(1, 8), { type: 'mod', n: -2 }]],
    ['-1d4+3', [group(1, 4, -1), { type: 'mod', n: 3 }]],
    ['4d6kh3', [group(4, 6, 1, 'h', 3)]],
    ['2d20KL1', [group(2, 20, 1, 'l', 1)]],
    [' 2D6 + 1d4 +3 ', [group(2, 6), group(1, 4), { type: 'mod', n: 3 }]],
    ['7', [{ type: 'mod', n: 7 }]],
    ['-7', [{ type: 'mod', n: -7 }]]
  ])('reads %j', (text, terms) => {
    expect(parseDiceExpression(text)).toEqual(terms);
  });

  it.each([
    [''], ['   '], [null], [undefined], [42], ['hello'], ['2d6+'], ['+'], ['++3'],
    ['2d6 2d4'], ['1d0'], ['0d6'], ['4d6kh0'], ['4d6kh5'], ['2d'], ['d'], ['2d6+x'], ['2d6kx1']
  ])('rejects %j', (text) => {
    expect(parseDiceExpression(text)).toBeNull();
  });
});

describe('rollDiceExpression', () => {
  it('adds every group and the flat modifier', () => {
    const r = rollDiceExpression('2d6+1d4+3', mixed([6, 3], [6, 5], [4, 2]));
    expect(r.total).toBe(13);
    expect(r.parts.map(p => p.type)).toEqual(['dice', 'dice', 'mod']);
    expect(r.parts[0]).toMatchObject({ rolls: [3, 5], kept: [3, 5], subtotal: 8 });
  });

  it('subtracts a negative dice group', () => {
    const r = rollDiceExpression('1d6-1d4', mixed([6, 6], [4, 4]));
    expect(r.total).toBe(2);
    expect(r.parts[1]).toMatchObject({ sign: -1, rolls: [4], subtotal: -4 });
  });

  it('honors keep highest and keep lowest', () => {
    const kh = rollDiceExpression('4d6kh3', dice(6, 3, 5, 2, 6));
    expect(kh.total).toBe(14);
    expect(kh.parts[0]).toMatchObject({ rolls: [3, 5, 2, 6], kept: [3, 5, 6] });
    const kl = rollDiceExpression('2d20kl1+1', dice(20, 12, 4));
    expect(kl.total).toBe(5);
  });

  it('a flat number rolls no dice', () => {
    const script = vi.fn();
    expect(rollDiceExpression('7', script)).toEqual({ total: 7, parts: [{ type: 'mod', n: 7 }] });
    expect(script).not.toHaveBeenCalled();
  });

  it('returns null for invalid input without rolling anything', () => {
    const script = vi.fn(() => 0.5);
    expect(rollDiceExpression('2d6+', script)).toBeNull();
    expect(rollDiceExpression('nonsense', script)).toBeNull();
    expect(script).not.toHaveBeenCalled();
  });

  it('agrees with rollDiceNotation for one group', () => {
    const a = rollDiceExpression('3d8+2', createSeededRandom(31));
    const b = rollDiceNotation('3d8+2', createSeededRandom(31));
    expect(a.total).toBe(b.total);
    expect(a.parts[0].rolls).toEqual(b.rolls);
  });
});

describe('rollD20', () => {
  it('a normal roll is one die plus the bonus', () => {
    const script = vi.fn(dice(20, 14));
    const r = rollD20('normal', 3, script);
    expect(script).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ rolls: [14], chosen: 14, bonus: 3, total: 17, isAdvantage: false, isDisadvantage: false });
  });

  it('defaults to a normal roll with no bonus', () => {
    expect(rollD20(undefined, undefined, dice(20, 9)).total).toBe(9);
  });

  it('advantage rolls two and keeps the higher, in roll order', () => {
    const r = rollD20('advantage', 2, dice(20, 7, 15));
    expect(r).toMatchObject({ rolls: [7, 15], chosen: 15, total: 17, isAdvantage: true, isDisadvantage: false });
  });

  it('disadvantage rolls two and keeps the lower', () => {
    const r = rollD20('disadvantage', -1, dice(20, 7, 15));
    expect(r).toMatchObject({ rolls: [7, 15], chosen: 7, total: 6, isDisadvantage: true });
  });

  it('flags a natural 20 and a natural 1 on the chosen die', () => {
    expect(rollD20('normal', 0, dice(20, 20))).toMatchObject({ isCritical: true, isFumble: false });
    expect(rollD20('normal', 0, dice(20, 1))).toMatchObject({ isCritical: false, isFumble: true });
    expect(rollD20('disadvantage', 0, dice(20, 20, 3)).isCritical).toBe(false);
  });

  it('advantage and disadvantage add the bonus to the chosen die', () => {
    expect(rollD20('advantage', 1, dice(20, 5, 9))).toMatchObject({ chosen: 9, total: 10 });
    expect(rollD20('disadvantage', 1, dice(20, 5, 9))).toMatchObject({ chosen: 5, total: 6 });
  });

  it('a natural 20 shows through advantage and a natural 1 through disadvantage', () => {
    expect(rollD20('advantage', 0, dice(20, 3, 20)).isCritical).toBe(true);
    expect(rollD20('disadvantage', 0, dice(20, 1, 12)).isFumble).toBe(true);
  });

  it('the engine no longer exports separate advantage/disadvantage helpers', () => {
    expect(globalThis.DiceEngine.rollWithAdvantage).toBeUndefined();
    expect(globalThis.DiceEngine.rollWithDisadvantage).toBeUndefined();
  });
});

// Critical hits: the original dice group is rolled twice, independently, and both results are added; the flat
// modifier is added once. So "4d6kh3" is two separate keep-3-of-4 rolls, never "8d6kh6".
describe('critical hits (rollDiceNotation with critical: true)', () => {
  const crit = { critical: true };
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);

  it('1d8 rolls the die twice and adds both', () => {
    const r = rollDiceNotation('1d8', dice(8, 3, 6), crit);
    expect(r).toMatchObject({ rolls: [3, 6], kept: [3, 6], dropped: [], total: 9, modifier: 0, isCritical: true });
    expect(r.groups).toHaveLength(2);
  });

  it('2d6+3 rolls 2d6 twice and adds the flat +3 once', () => {
    const r = rollDiceNotation('2d6+3', dice(6, 1, 2, 3, 4), crit);
    expect(r.rolls).toEqual([1, 2, 3, 4]);
    expect(r.modifier).toBe(3);
    expect(r.total).toBe(1 + 2 + 3 + 4 + 3); // one +3, not two
  });

  it('a negative modifier is applied once', () => {
    expect(rollDiceNotation('2d6-1', dice(6, 4, 4, 5, 5), crit).total).toBe(4 + 4 + 5 + 5 - 1);
  });

  it('4d6kh3 is two independent keep-3-of-4 rolls: 27, not the 30 that 8d6kh6 would give', () => {
    // group 1: 6,6,1,1 keeps 6,6,1 = 13; group 2: 5,5,4,4 keeps 5,5,4 = 14
    const r = rollDiceNotation('4d6kh3', dice(6, 6, 6, 1, 1, 5, 5, 4, 4), crit);
    expect(r.total).toBe(27);
    expect(r.groups.map((g) => sum(g.kept))).toEqual([13, 14]);
    expect(r.rolls).toEqual([6, 6, 1, 1, 5, 5, 4, 4]);
    expect(r.kept.slice().sort()).toEqual([1, 4, 5, 5, 6, 6]);
    expect(r.dropped.slice().sort()).toEqual([1, 4]); // one die dropped from EACH group
    // what the old approximation produced on the same dice
    expect(rollDiceNotation('8d6kh6', dice(6, 6, 6, 1, 1, 5, 5, 4, 4)).total).toBe(30);
  });

  it('4d6kl2 is two independent keep-lowest-2 rolls: 14, not the 4 that 8d6kl4 would give', () => {
    // group 1: 6,6,6,6 keeps 6,6 = 12; group 2: 1,1,1,1 keeps 1,1 = 2
    const r = rollDiceNotation('4d6kl2', dice(6, 6, 6, 6, 6, 1, 1, 1, 1), crit);
    expect(r.total).toBe(14);
    expect(r.groups.map((g) => sum(g.kept))).toEqual([12, 2]);
    expect(rollDiceNotation('8d6kl4', dice(6, 6, 6, 6, 6, 1, 1, 1, 1)).total).toBe(4);
  });

  it('the flat modifier of a keep group is added once', () => {
    const r = rollDiceNotation('4d6kh3+2', dice(6, 6, 6, 1, 1, 5, 5, 4, 4), crit);
    expect(r.total).toBe(13 + 14 + 2);
  });

  it('non-crit rolls are unchanged: one group, no doubling', () => {
    const r = rollDiceNotation('4d6kh3+2', dice(6, 6, 6, 1, 1));
    expect(r).toMatchObject({ rolls: [6, 6, 1, 1], kept: [1, 6, 6], dropped: [1], total: 15, isCritical: false });
    expect(r.groups).toHaveLength(1);
    expect(rollDiceNotation('1d8', dice(8, 5), { critical: false }).total).toBe(5);
  });

  it('a natural 20 on a d20 group still reports isCritical without critical: true', () => {
    expect(rollDiceNotation('1d20', dice(20, 20)).isCritical).toBe(true);
    expect(rollDiceNotation('1d20', dice(20, 7)).isCritical).toBe(false);
  });

  it('applies Great Weapon Fighting to each group', () => {
    // group 1 rolls a 1 (rerolled to 4); group 2 rolls an 8
    const r = rollDiceNotation('1d8', mixed([8, 1], [8, 4], [8, 8]), { critical: true, rerollLowDice: true });
    expect(r.rolls).toEqual([4, 8]);
    expect(r.total).toBe(12);
  });

  it('Savage Attacker rolls the whole critical set twice and takes the higher', () => {
    const r = rollDiceNotation('1d6', dice(6, 1, 2, 5, 6), { critical: true, rollTwiceTakeBest: true });
    expect(r.total).toBe(11);
    expect(r.twiceRoll).toEqual({ taken: 11, discarded: 3 });
    expect(r.groups).toHaveLength(2);
  });

  it('Great Weapon Fighting rerolls inside each keep group before the keep rule is applied', () => {
    // 4d6kh3 twice with GWF: group 1 rolls 1,6,6,6 (the 1 is rerolled to 2) keeps 6,6,6; group 2 rolls 5,5,5,5 keeps three 5s
    const r = rollDiceNotation('4d6kh3', mixed([6, 1], [6, 2], [6, 6], [6, 6], [6, 6], [6, 5], [6, 5], [6, 5], [6, 5]), { critical: true, rerollLowDice: true });
    expect(r.groups.map((g) => g.rolls)).toEqual([[2, 6, 6, 6], [5, 5, 5, 5]]);
    expect(r.total).toBe(18 + 15);
  });

  it('Savage Attacker rolls the whole two-group keep set twice and takes the higher set', () => {
    // set 1: 6,6,1,1 -> 13 and 5,5,4,4 -> 14 = 27; set 2: 1,1,1,1 -> 3 and 2,2,2,2 -> 6 = 9
    const r = rollDiceNotation('4d6kh3', dice(6, 6, 6, 1, 1, 5, 5, 4, 4, 1, 1, 1, 1, 2, 2, 2, 2), { critical: true, rollTwiceTakeBest: true });
    expect(r.total).toBe(27);
    expect(r.twiceRoll).toEqual({ taken: 27, discarded: 9 });
    expect(r.dropped).toHaveLength(2);
  });

  it('is null when rolling the group twice would pass the dice limit; 500d6 twice is fine', () => {
    expect(rollDiceNotation('600d6', () => 0.5, crit)).toBeNull();
    expect(rollDiceNotation('500d6', () => 0.5, crit).rolls).toHaveLength(1000);
  });

  it('a crit needs a single valid dice group', () => {
    expect(rollDiceNotation('2d6+1d4', () => 0.5, crit)).toBeNull();
    expect(rollDiceNotation('nope', () => 0.5, crit)).toBeNull();
  });
});

describe('kept and dropped dice on every roll', () => {
  it('kept and dropped together are the dice rolled, for keep-highest and keep-lowest; none dropped otherwise', () => {
    expect(rollDiceNotation('4d6kh3', dice(6, 2, 5, 3, 5))).toMatchObject({ kept: [3, 5, 5], dropped: [2] });
    expect(rollDiceNotation('4d6kl3', dice(6, 2, 5, 3, 5))).toMatchObject({ kept: [2, 3, 5], dropped: [5] });
    expect(rollDiceNotation('2d6', dice(6, 2, 5))).toMatchObject({ kept: [2, 5], dropped: [] });
  });
  it('a repeated die is dropped once per copy, not once per value', () => {
    expect(rollDiceNotation('4d6kh2', dice(6, 4, 4, 4, 4))).toMatchObject({ kept: [4, 4], dropped: [4, 4] });
  });
  it('expression parts report dropped dice too', () => {
    const r = rollDiceExpression('4d6kh3+2', dice(6, 1, 2, 3, 4));
    expect(r.parts[0]).toMatchObject({ kept: [2, 3, 4], dropped: [1] });
  });
});

describe('rollHitDice', () => {
  it('adds the CON modifier to each die', () => {
    const r = rollHitDice(8, 2, 3, dice(8, 4, 6));
    expect(r).toEqual({ rolls: [4, 6], rawTotal: 16, healing: 16 });
  });

  it('heals at least 1 HP per die spent', () => {
    const r = rollHitDice(6, 3, -3, dice(6, 1, 1, 2));
    expect(r.rawTotal).toBe(-5);
    expect(r.healing).toBe(3);
  });

  it('rolls exactly the dice it is told to spend', () => {
    const script = vi.fn(dice(10, 5, 5, 5, 5));
    expect(rollHitDice(10, 4, 0, script).rolls).toHaveLength(4);
    expect(script).toHaveBeenCalledTimes(4);
  });
});

describe('parser safety limits', () => {
  const { MAX_DICE_COUNT, MAX_DIE_SIDES } = globalThis.DiceEngine;

  it('are 1000 dice and 1,000,000 sides', () => {
    expect(MAX_DICE_COUNT).toBe(1000);
    expect(MAX_DIE_SIDES).toBe(1000000);
  });

  it('accept the maximum count and the maximum sides in one notation', () => {
    expect(parseDiceNotation('1000d6')).toMatchObject({ count: 1000, sides: 6 });
    expect(parseDiceNotation('1d1000000')).toMatchObject({ count: 1, sides: 1000000 });
    expect(parseDiceNotation('1000d1000000+5')).toMatchObject({ count: 1000, sides: 1000000, modifier: 5 });
  });

  it('reject a count above the maximum (never clamped to it)', () => {
    expect(parseDiceNotation('1001d6')).toBeNull();
    expect(rollDiceNotation('1001d6', () => 0.5)).toBeNull();
  });

  it('reject sides above the maximum (never clamped to it)', () => {
    expect(parseDiceNotation('1d1000001')).toBeNull();
    expect(rollDiceNotation('1d1000001', () => 0.5)).toBeNull();
  });

  it('accept and reject the same values in a multi-term expression, in any term', () => {
    expect(parseDiceExpression('1000d6+1d1000000+3')).not.toBeNull();
    expect(parseDiceExpression('1001d6')).toBeNull();
    expect(parseDiceExpression('1d6+1001d6')).toBeNull();
    expect(parseDiceExpression('1d6-1d1000001')).toBeNull();
    expect(rollDiceExpression('2d6+1001d6', () => 0.5)).toBeNull();
  });

  it('reject absurd sizes and keep counts against them', () => {
    expect(parseDiceNotation('99999999d6')).toBeNull();
    expect(parseDiceNotation('999999999999999999999d6')).toBeNull();
    expect(parseDiceExpression('1d99999999999999999999')).toBeNull();
    expect(parseDiceNotation('1001d6kh3')).toBeNull();
  });

  it('a huge expression is rejected before any die is rolled, and quickly', () => {
    const script = vi.fn(() => 0.5);
    const started = performance.now();
    expect(rollDiceExpression('99999999d6', script)).toBeNull();
    expect(rollDiceNotation('999999999d6', script)).toBeNull();
    expect(script).not.toHaveBeenCalled();
    expect(performance.now() - started).toBeLessThan(200);
  });

  it('the helpers that take counts directly refuse too', () => {
    expect(() => rollMultipleDice(1001, 6)).toThrow(RangeError);
    expect(() => rollMultipleDice(6, 1000001)).toThrow(RangeError);
    expect(rollMultipleDice(1000, 6, () => 0.5)).toHaveLength(1000);
    expect(rollHitDice(8, 1001, 2, () => 0.5)).toBeNull();
    expect(rollHitDice(1000001, 2, 2, () => 0.5)).toBeNull();
    expect(rollHitDice(NaN, 2, 0, () => 0.5)).toBeNull();
    expect(rollHitDice(8, 1000, 0, () => 0.5)).toMatchObject({ rolls: expect.any(Array) });
  });

  it('a critical hit is refused when rolling the group twice would pass the maximum', () => {
    expect(rollDiceNotation('600d6', () => 0.5, { critical: true })).toBeNull();
    expect(rollDiceNotation('500d6', () => 0.5, { critical: true })).not.toBeNull();
  });
});

describe('the engine stays strict about text around the dice', () => {
  // Legacy damage strings with a trailing damage type are cleaned up by their caller (Combat Mode),
  // never accepted here.
  it.each([
    ['1d8+3 slashing'], ['2d6 fire'], ['1d8+3slashing'], ['slashing 1d8'], ['1d8 +3 piercing damage']
  ])('rejects %j in both parsers', (text) => {
    expect(parseDiceNotation(text)).toBeNull();
    expect(parseDiceExpression(text)).toBeNull();
    expect(rollDiceNotation(text, () => 0.5)).toBeNull();
    expect(rollDiceExpression(text, () => 0.5)).toBeNull();
  });

  it('still accepts the same dice without the extra text', () => {
    expect(parseDiceNotation('1d8+3')).toMatchObject({ count: 1, sides: 8, modifier: 3 });
  });
});

describe('maximum notation length', () => {
  const { MAX_DICE_NOTATION_LENGTH } = globalThis.DiceEngine;
  // "1d6" followed by "+1" pairs and one final digit: a valid expression of exactly the given length
  const expressionOfLength = (n) => '1d6' + '+1'.repeat(Math.floor((n - 3) / 2)) + ((n - 3) % 2 ? '1' : '');

  it('is 200 characters', () => {
    expect(MAX_DICE_NOTATION_LENGTH).toBe(200);
  });

  it('accepts an expression of exactly the maximum length', () => {
    const text = expressionOfLength(200);
    expect(text).toHaveLength(200);
    expect(parseDiceExpression(text)).not.toBeNull();
    expect(rollDiceExpression(text, () => 0.5)).not.toBeNull();
  });

  it('rejects one character more (never truncated)', () => {
    const text = expressionOfLength(201);
    expect(text).toHaveLength(201);
    expect(parseDiceExpression(text)).toBeNull();
    expect(rollDiceExpression(text, () => 0.5)).toBeNull();
  });

  it('counts the raw text, padding included, for the single-group parser too', () => {
    expect(parseDiceNotation('1d6' + ' '.repeat(197))).toMatchObject({ count: 1, sides: 6 }); // 200
    expect(parseDiceNotation('1d6' + ' '.repeat(198))).toBeNull(); // 201
    expect(rollDiceNotation('1d6' + ' '.repeat(198), () => 0.5)).toBeNull();
  });

  it('rejects an extremely long multi-group expression before rolling a single die', () => {
    const script = vi.fn(() => 0.5);
    const many = Array(20000).fill('1000d6').join('+'); // 139,999 characters, ~20 million dice
    expect(rollDiceExpression(many, script)).toBeNull();
    expect(rollDiceNotation('1d6' + ' '.repeat(100000), script)).toBeNull();
    expect(script).not.toHaveBeenCalled();
  });

  it('total work is bounded: the longest accepted expression is at most ~30 full groups', () => {
    // "1000d6+" is 7 characters, so 200 characters hold at most 29 of them
    const text = Array(29).fill('1000d6').join('+'); // 202 characters: too long
    expect(text.length).toBeGreaterThan(200);
    expect(parseDiceExpression(text)).toBeNull();
    const within = Array(28).fill('1000d6').join('+'); // 195 characters
    const terms = parseDiceExpression(within);
    expect(terms).toHaveLength(28);
    expect(terms.reduce((n, t) => n + t.count, 0)).toBeLessThanOrEqual(28000);
  });

  it('is checked before any parsing: an overlong string is never scanned', () => {
    const replace = vi.spyOn(String.prototype, 'replace');
    const match = vi.spyOn(String.prototype, 'match');
    try {
      parseDiceNotation('1d6' + ' '.repeat(500));
      parseDiceExpression('1d6+' + '1+'.repeat(500));
      expect(replace).not.toHaveBeenCalled();
      expect(match).not.toHaveBeenCalled();
      // control: the same spies do see a normal parse
      parseDiceNotation('1d6+1');
      expect(replace.mock.calls.length + match.mock.calls.length).toBeGreaterThan(0);
    } finally {
      replace.mockRestore();
      match.mockRestore();
    }
  });
});

describe('one shared validity rule for dice counts and sides', () => {
  const { MAX_DICE_COUNT, MAX_DIE_SIDES } = globalThis.DiceEngine;
  const good = () => 0.5;

  describe('rollMultipleDice (low level: throws on invalid arguments)', () => {
    it.each([
      ['zero count', 0, 6], ['negative count', -1, 6], ['fractional count', 2.5, 6],
      ['zero sides', 2, 0], ['negative sides', 2, -6], ['fractional sides', 2, 6.5],
      ['NaN count', NaN, 6], ['NaN sides', 2, NaN], ['Infinity count', Infinity, 6],
      ['string count', '3', 6],
      ['count above the maximum', MAX_DICE_COUNT + 1, 6], ['sides above the maximum', 2, MAX_DIE_SIDES + 1]
    ])('%s throws RangeError', (_label, count, sides) => {
      const script = vi.fn(good);
      expect(() => rollMultipleDice(count, sides, script)).toThrow(RangeError);
      expect(script).not.toHaveBeenCalled();
    });

    it('rolls the first valid values and the maximum valid values', () => {
      expect(rollMultipleDice(1, 1, good)).toEqual([1]);
      expect(rollMultipleDice(MAX_DICE_COUNT, 6, good)).toHaveLength(MAX_DICE_COUNT);
      expect(rollMultipleDice(1, MAX_DIE_SIDES, good)).toHaveLength(1);
    });
  });

  describe('rollHitDice (returns null on invalid dimensions)', () => {
    it.each([
      ['zero count', 8, 0], ['negative count', 8, -3], ['fractional count', 8, 2.5],
      ['zero die', 0, 2], ['negative die', -8, 2], ['fractional die', 8.5, 2],
      ['NaN count', 8, NaN], ['NaN die', NaN, 2], ['string count', 8, '3'],
      ['count above the maximum', 8, MAX_DICE_COUNT + 1], ['die above the maximum', MAX_DIE_SIDES + 1, 2]
    ])('%s is refused without rolling', (_label, dieSize, count) => {
      const script = vi.fn(good);
      expect(rollHitDice(dieSize, count, 2, script)).toBeNull();
      expect(script).not.toHaveBeenCalled();
    });

    it('never reports negative healing for a bad count', () => {
      expect(rollHitDice(8, -3, 2, good)).toBeNull();
    });

    it('rolls the first valid values and the maximum valid values', () => {
      expect(rollHitDice(1, 1, 0, good)).toMatchObject({ rolls: [1], healing: 1 });
      expect(rollHitDice(8, MAX_DICE_COUNT, 0, good).rolls).toHaveLength(MAX_DICE_COUNT);
      expect(rollHitDice(MAX_DIE_SIDES, 1, 0, good).rolls).toHaveLength(1);
    });
  });

  describe('the notation parsers use the same rule', () => {
    it.each([['0d6'], ['1d0'], ['1.5d6'], ['1d6.5']])('reject %j', (text) => {
      expect(parseDiceNotation(text)).toBeNull();
      expect(parseDiceExpression(text)).toBeNull();
    });

    it('a leading minus is a negative group in an expression, but not a valid single group', () => {
      expect(parseDiceNotation('-1d6')).toBeNull();
      expect(parseDiceExpression('-1d6')).toEqual([{ type: 'dice', sign: -1, count: 1, sides: 6, keepDir: null, keepN: null }]);
    });

    it('accept the first valid and the maximum valid dimensions', () => {
      expect(parseDiceNotation('1d1')).toMatchObject({ count: 1, sides: 1 });
      expect(parseDiceNotation('1000d1000000')).toMatchObject({ count: 1000, sides: 1000000 });
      expect(parseDiceExpression('1d1+1000d1000000')).toHaveLength(2);
    });

    it('reject one past the maximum on either dimension', () => {
      expect(parseDiceNotation('1001d1')).toBeNull();
      expect(parseDiceNotation('1d1000001')).toBeNull();
      expect(parseDiceExpression('1d1+1001d1')).toBeNull();
      expect(parseDiceExpression('1d1+1d1000001')).toBeNull();
    });
  });
});

describe('critical hits at the dice limit', () => {
  const { MAX_DICE_COUNT } = globalThis.DiceEngine;
  const largestSafe = MAX_DICE_COUNT / 2;
  const crit = { critical: true };

  it('rolls the largest group whose two rolls still fit', () => {
    const r = rollDiceNotation(largestSafe + 'd6+3', () => 0.5, crit);
    expect(r).not.toBeNull();
    expect(r.rolls).toHaveLength(MAX_DICE_COUNT);
    expect(r.modifier).toBe(3);
  });

  it('returns null for the first count whose two rolls pass the limit', () => {
    expect(rollDiceNotation(largestSafe + 1 + 'd6+3', () => 0.5, crit)).toBeNull();
    expect(rollDiceNotation(MAX_DICE_COUNT + 'd6', () => 0.5, crit)).toBeNull();
  });

  it('a normal roll of that count is still fine, so only the crit is refused', () => {
    expect(rollDiceNotation(largestSafe + 1 + 'd6', () => 0.5)).not.toBeNull();
  });
});

describe('negative zero', () => {
  it('a "-0" modifier is 0, not -0, in single notation and in expressions', () => {
    expect(Object.is(parseDiceNotation('1d6-0').modifier, 0)).toBe(true);
    const rolled = rollDiceNotation('1d6-0', () => 0.5);
    expect(Object.is(rolled.modifier, 0)).toBe(true);
    const expr = rollDiceExpression('1d6-0', () => 0.5);
    expect(expr.parts.filter(p => p.type === 'mod').every(p => Object.is(p.n, 0))).toBe(true);
    expect(Object.is(rollDiceExpression('-0').total, 0)).toBe(true);
  });
});

describe('normalizeLegacyDamageNotation', () => {
  it('drops trailing damage-type words and nothing else', () => {
    expect(normalizeLegacyDamageNotation('1d8+3 slashing')).toBe('1d8+3');
    expect(normalizeLegacyDamageNotation('2d6 fire and cold')).toBe('2d6');
    expect(normalizeLegacyDamageNotation('2d6+3')).toBe('2d6+3');
    expect(normalizeLegacyDamageNotation('2d6+ fire')).toBe('2d6+'); // still invalid for the parsers
    expect(normalizeLegacyDamageNotation('hello world')).toBe('hello world');
  });
  it('leaves an over-long string alone', () => {
    const long = '1d6 ' + 'fire '.repeat(80);
    expect(normalizeLegacyDamageNotation(long)).toBe(long);
  });
});
