/**
 * Dice semantics the rest of the app relies on: exact totals (the numeric bound), a specific reason
 * for every refusal, critical hits on keep/drop groups, and roll metadata that reconstructs the total
 * for signed and keep/drop expressions.
 */
import { describe, it, expect } from 'vitest';
import {
  MAX_DICE_COUNT,
  parseDiceNotation,
  parseDiceExpression,
  rollDiceNotation,
  rollDiceExpression,
  describeDiceProblem,
  summarizeExpression,
  normalizeLegacyDamageNotation,
  describeFeatureRoll,
  createSeededRandom
} from '../../js/modules/dice.js';

const SAFE = Number.MAX_SAFE_INTEGER; // 9007199254740991
const sum = a => a.reduce((x, y) => x + y, 0);
// Scripted dice: each value is the face the next die shows.
function faces(sides, ...values) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('ran out of scripted dice');
    return (values[i++] - 0.5) / sides;
  };
}

describe('numbers stay exact: the safe-integer bound', () => {
  it('a modifier past Number.MAX_SAFE_INTEGER is refused, not rounded (it used to parse "...993" as "...992")', () => {
    expect(parseDiceNotation(`1d6+${SAFE + 2}`)).toBeNull();
    expect(parseDiceExpression(`1d6+${SAFE + 2}`)).toBeNull();
    expect(parseDiceNotation('1d6+99999999999999999999')).toBeNull();
    expect(rollDiceExpression('1d6+99999999999999999999')).toBeNull();
  });

  it('the largest total a roll could reach must be safe: modifier plus every die at its highest', () => {
    expect(parseDiceNotation(`1d1+${SAFE - 1}`)).not.toBeNull(); // at most exactly MAX_SAFE_INTEGER
    expect(rollDiceNotation(`1d1+${SAFE - 1}`).total).toBe(SAFE);
    expect(parseDiceNotation(`1d1+${SAFE}`)).toBeNull();
    expect(parseDiceNotation(`1d6-${SAFE - 6}`)).not.toBeNull(); // the size counts, whatever the sign
    expect(parseDiceNotation(`1d6-${SAFE - 5}`)).toBeNull();
  });

  it('several safe modifiers cannot add up past the bound', () => {
    expect(parseDiceExpression(`1d6+${SAFE}+${SAFE}`)).toBeNull();
    expect(parseDiceExpression(`${SAFE}-${SAFE}`)).toBeNull(); // magnitude, not the net: each term is added exactly
    expect(parseDiceExpression(`${Math.floor(SAFE / 2)}+${Math.floor(SAFE / 2)}`)).not.toBeNull();
  });

  it('a critical hit counts both groups', () => {
    const mod = SAFE - 2 * 6 + 1; // fine once, one over when the group is rolled twice
    expect(parseDiceNotation(`1d6+${mod - 6}`)).not.toBeNull();
    expect(rollDiceNotation(`1d6+${mod - 6}`, undefined, { critical: true })).not.toBeNull();
    expect(rollDiceNotation(`1d6+${mod}`)).not.toBeNull();
    expect(rollDiceNotation(`1d6+${mod}`, undefined, { critical: true })).toBeNull();
    // the dice are fine (2d6); it is the numbers that are too large, and the reason says so
    expect(describeDiceProblem(`1d6+${mod}`, { critical: true }).code).toBe('number-too-large');
    expect(rollDiceExpression(`1d6+1d4+${mod}`, undefined, { critical: true })).toBeNull();
    expect(describeDiceProblem(`1d6+1d4+${mod}`, { critical: true }).code).toBe('number-too-large');
  });

  it('every accepted roll has an exact total, at the limits', () => {
    const r = rollDiceNotation(`${MAX_DICE_COUNT}d1000000+${SAFE - 1e9}`, () => 0.9999999);
    expect(Number.isSafeInteger(r.total)).toBe(true);
    expect(r.total).toBe(SAFE);
  });
});

describe('describeDiceProblem: a specific reason for every refusal', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['hello', 'malformed'],
    ['2d6+ fire', 'malformed'],
    ['4d6kh', 'malformed'],
    ['2d6 3', 'malformed'], // whitespace never joins numbers: this used to roll a d63
    ['1 0d6', 'malformed'],
    ['1d6 + 1 0', 'malformed'],
    ['x'.repeat(201), 'too-long'],
    ['0d6', 'no-dice'],
    ['1d0', 'no-dice'],
    [`${MAX_DICE_COUNT + 1}d6`, 'dice-count'],
    ['99999999999999999999d6', 'dice-count'],
    ['1d1000001', 'die-sides'],
    ['4d6kh5', 'keep-count'],
    ['4d6kl0', 'keep-count'],
    [`1d6+${SAFE}`, 'number-too-large'],
    ['2d6+1d4-99999999999999999999', 'number-too-large']
  ])('%j is refused as %s', (notation, code) => {
    const problem = describeDiceProblem(notation);
    expect(problem?.code).toBe(code);
    expect(problem.message).toMatch(/\S/);
    expect(problem.message).not.toMatch(/Error|undefined|null|NaN|\bat\s+\w+\s*\(/); // no internals
  });

  it('the limits are named with their values', () => {
    expect(describeDiceProblem('1001d6').message).toBe('Too many dice: at most 1000 in one group.');
    expect(describeDiceProblem('1d1000001').message).toBe('Dice can have at most 1,000,000 sides.');
    expect(describeDiceProblem('x'.repeat(201)).message).toBe('Dice notation is too long (at most 200 characters).');
    expect(describeDiceProblem('600d6', { critical: true }).message).toBe('Critical roll exceeds the maximum dice limit.');
  });

  it('a critical limit applies to every dice group, single or not', () => {
    expect(describeDiceProblem('600d6', { critical: true }).code).toBe('critical-limit');
    expect(describeDiceProblem('600d6')).toBeNull(); // fine as a normal roll
    expect(describeDiceProblem('2d6+600d6', { critical: true }).code).toBe('critical-limit');
    expect(describeDiceProblem('2d6-600d6+3', { critical: true }).code).toBe('critical-limit');
    expect(describeDiceProblem('500d6+500d6', { critical: true })).toBeNull(); // each group doubled stays at 1000
    expect(describeDiceProblem('1001d6', { critical: true }).code).toBe('dice-count'); // its own limit first
    expect(describeDiceProblem('5', { critical: true })).toBeNull(); // no dice: nothing to double
  });

  it('agrees with both rollers on a critical, too', () => {
    const corpus = ['1d8+3', '2d6+1d4+3', '2d6-1d4+3', '600d6', '2d6+600d6', '500d6+500d6', '4d6kh3', '2d20kl1+1d4',
      '5', `1d6+${SAFE - 11}`, `1d6+1d4+${SAFE - 20}`, '1001d6', 'hello'];
    for (const n of corpus) {
      const rolls = !!(rollDiceNotation(n, Math.random, { critical: true })
        || (!parseDiceNotation(n) && rollDiceExpression(n, Math.random, { critical: true })));
      expect(describeDiceProblem(n, { critical: true }) === null, n).toBe(rolls);
    }
  });

  // The explanation must never disagree with the rollers: null exactly when something rolls it.
  it('reports a problem exactly when neither roller accepts the notation', () => {
    const corpus = [
      '2d6+3', 'd8', '4d6kh3', '2d20kl1-1', '2d6 - 1d4 + 3', '5', '-3', '+2d6', '1d6+-2', '2d6++3', '1d6+',
      '3d', 'd', 'kh3', '1d6kh1kh1', '1D6', ' 1 d 6 ', '1d6*2', '1d6/2', '(1d6)', '1d6+3 fire', '0', '00d6',
      '1000d6', '1001d6', '2d6 3', '1 d 6 + 3', '1d8 + 3', '1d1000000', '1d1000001', `1d1+${SAFE - 1}`, `1d1+${SAFE}`, '1d6-1d6-1d6', '10-1d6'
    ];
    const rand = createSeededRandom(3);
    for (const n of corpus) {
      const accepted = !!(parseDiceNotation(n) || parseDiceExpression(n));
      expect(describeDiceProblem(n) === null, JSON.stringify(n)).toBe(accepted);
      if (accepted) expect(rollDiceNotation(n, rand) || rollDiceExpression(n, rand), n).toBeTruthy();
    }
  });
});

// A crit rolls the original group twice, independently, and adds the modifier once: "4d6kh3" is two
// separate keep-3-of-4 rolls. That is exact 5e (roll the damage dice twice); "8d6kh6" (the 2.3.14
// approximation) keeps the best 6 of 8 and so has different odds. Pinned here as the rule.
describe('critical keep/drop semantics', () => {
  it('kh: each group keeps its own best dice, not the best of the pooled dice', () => {
    // group 1: 6 6 6 6 -> keeps 6 6 6; group 2: 1 1 1 1 -> keeps 1 1 1. Pooled kh6 would keep 6 6 6 6 1 1.
    const r = rollDiceNotation('4d6kh3+2', faces(6, 6, 6, 6, 6, 1, 1, 1, 1), { critical: true });
    expect(r.groups.map(g => g.kept)).toEqual([[6, 6, 6], [1, 1, 1]]);
    expect(r.total).toBe(18 + 3 + 2); // modifier once
    expect(r.total).not.toBe(6 + 6 + 6 + 6 + 1 + 1 + 2); // what 8d6kh6 would give (28)
    expect(r.kept).toHaveLength(6);
    expect(r.dropped).toEqual([6, 1]);
    expect(r.isCritical).toBe(true);
  });

  it('kl: the same, keeping each group\'s lowest', () => {
    const r = rollDiceNotation('2d20kl1', faces(20, 20, 19, 3, 18), { critical: true });
    expect(r.groups.map(g => g.kept)).toEqual([[19], [3]]);
    expect(r.total).toBe(22);
  });

  it('a negative modifier is added once too', () => {
    const r = rollDiceNotation('2d6-3', faces(6, 1, 1, 1, 1), { critical: true });
    expect(r.total).toBe(4 - 3);
  });

  it('a normal roll is unchanged: one group, no crit', () => {
    const r = rollDiceNotation('4d6kh3', faces(6, 6, 5, 1, 2));
    expect(r.groups).toHaveLength(1);
    expect(r.total).toBe(13);
    expect(r.isCritical).toBe(false);
  });
});

// A critical hit on several dice groups: every group is rolled twice, independently, keeping its sign and
// keep rule; flat terms are added once. ("2d6+1d4+3" -> 4d6 + 2d4 + 3; "2d6-1d4+3" -> 4d6 - 2d4 + 3.)
describe('critical hits on expressions (rollDiceExpression with critical: true)', () => {
  const crit = { critical: true };
  const diceParts = r => r.parts.filter(p => p.type === 'dice');

  it('2d6+1d4+3: both groups doubled, +3 once', () => {
    const r = rollDiceExpression('2d6+1d4+3', () => 0.5, crit);
    expect(diceParts(r).map(p => [p.sign, p.count, p.sides])).toEqual([[1, 2, 6], [1, 2, 6], [1, 1, 4], [1, 1, 4]]);
    expect(r.critical).toBe(true);
    const max = rollDiceExpression('2d6+1d4+3', () => 0.9999, crit);
    expect(max.total).toBe(4 * 6 + 2 * 4 + 3);
    const min = rollDiceExpression('2d6+1d4+3', () => 0, crit);
    expect(min.total).toBe(4 + 2 + 3);
  });

  it('2d6-1d4+3: the subtracted group is subtracted twice, +3 once', () => {
    const max = rollDiceExpression('2d6-1d4+3', () => 0.9999, crit);
    expect(max.total).toBe(24 - 8 + 3);
    expect(diceParts(max).map(p => p.sign)).toEqual([1, 1, -1, -1]);
    const min = rollDiceExpression('2d6-1d4+3', () => 0, crit);
    expect(min.total).toBe(4 - 2 + 3);
  });

  it('1d8+3 is unchanged from the single-group rule (dice doubled, +3 once)', () => {
    expect(rollDiceNotation('1d8+3', () => 0.9999, crit).total).toBe(16 + 3);
    expect(rollDiceExpression('1d8+3', () => 0.9999, crit).total).toBe(16 + 3);
  });

  it('keep/drop groups are each rolled twice independently, never pooled', () => {
    // 4d6kh3 + 2d20kl1: roll A (6 6 6 6 -> 18), roll B (1 1 1 1 -> 3), then kl1 (20 19 -> 19) and (3 18 -> 3)
    const script = (...pairs) => { let i = 0; return () => { const [sides, face] = pairs[i++]; return (face - 0.5) / sides; }; };
    const r = rollDiceExpression('4d6kh3+2d20kl1', script(
      [6, 6], [6, 6], [6, 6], [6, 6], [6, 1], [6, 1], [6, 1], [6, 1], [20, 20], [20, 19], [20, 3], [20, 18]), crit);
    expect(diceParts(r).map(p => p.kept)).toEqual([[6, 6, 6], [1, 1, 1], [19], [3]]);
    expect(r.total).toBe(18 + 3 + 19 + 3); // pooled 8d6kh6 + 4d20kl2 would give 26 + 6
  });

  it('the parts add up to the total, and a normal roll is unchanged', () => {
    const rand = createSeededRandom(5);
    for (let i = 0; i < 500; i++) {
      const r = rollDiceExpression('3d6kl2-1d4kh1+2d8-7', rand, crit);
      expect(summarizeExpression(r).total).toBe(r.total);
      const s = summarizeExpression(r);
      const rebuilt = (s.groups ? sum(s.groups.map(g => g.sign * sum(g.kept))) : sum(s.kept)) + s.modifier;
      expect(rebuilt).toBe(r.total);
    }
    const normal = rollDiceExpression('2d6+1d4+3', () => 0.9999);
    expect(normal.total).toBe(12 + 4 + 3);
    expect(normal.critical).toBe(false);
  });

  it('refuses a crit past a limit instead of rolling normal damage', () => {
    expect(rollDiceExpression('2d6+600d6', () => 0.5, crit)).toBeNull();
    expect(rollDiceExpression('2d6+600d6', () => 0.5)).not.toBeNull(); // fine as a normal roll
  });
});

// Great Weapon Fighting and Savage Attacker on expressions follow the app's existing rules (each die showing
// 1 or 2 rerolled once; all the dice rolled twice, higher total kept) when every group is added. Those rules
// do not cover a subtracted group, so there they are not applied, and the result says so.
describe('GWF and Savage Attacker on expressions', () => {
  it('GWF rerolls every 1 or 2, in every added group', () => {
    const script = (...faces) => { let i = 0; return () => faces[i++]; };
    // 2d6: 1 -> reroll 5, 4; 1d4: 2 -> reroll 3
    const r = rollDiceExpression('2d6+1d4', script(0.01, 4.5 / 6, 3.5 / 6, 1.5 / 4, 2.5 / 4), { rerollLowDice: true });
    expect(r.parts.map(p => p.rolls)).toEqual([[5, 4], [3]]);
    expect(r.rerollLowDice).toBe(true);
    expect(r.total).toBe(12);
  });

  it('Savage Attacker rolls every dice group twice and keeps the higher set', () => {
    const script = (...faces) => { let i = 0; return () => faces[i++]; };
    const r = rollDiceExpression('1d6+1d4+2', script(0.5 / 6, 0.5 / 4, 5.5 / 6, 3.5 / 4), { rollTwiceTakeBest: true });
    expect(r.twiceRoll).toEqual({ taken: 10, discarded: 2 });
    expect(r.total).toBe(12);
    expect(r.parts.filter(p => p.type === 'dice').map(p => p.rolls)).toEqual([[6], [4]]);
  });

  it('with a crit, the whole critical set is what Savage Attacker rolls twice', () => {
    const r = rollDiceExpression('1d6+1d4', () => 0.9999, { critical: true, rollTwiceTakeBest: true });
    expect(r.parts.filter(p => p.type === 'dice')).toHaveLength(4);
    expect(r.twiceRoll).toEqual({ taken: 20, discarded: 20 });
  });

  it('on damage that subtracts a group, neither is applied and the note says so', () => {
    const r = rollDiceExpression('2d6-1d4', () => 0.01, { rerollLowDice: true, rollTwiceTakeBest: true });
    expect(r.rerollLowDice).toBe(false);
    expect(r.rollTwiceTakeBest).toBe(false);
    expect(r.twiceRoll).toBeNull();
    expect(r.featuresNotApplied).toEqual(['rerollLowDice', 'rollTwiceTakeBest']);
    expect(r.parts.filter(p => p.type === 'dice').map(p => p.rolls)).toEqual([[1, 1], [1]]); // no rerolls
    expect(describeFeatureRoll(r)).toBe(' [GWF, SA not applied: subtracted dice]');
  });

  it('a normal roll with no features requested reports nothing', () => {
    const r = rollDiceExpression('2d6-1d4', () => 0.5);
    expect(r.featuresNotApplied).toEqual([]);
    expect(describeFeatureRoll(r)).toBe('');
  });
});

// The metadata recorded for a roll must add up to its total, whatever the signs and keep rules.
describe('signed and keep/drop metadata reconstructs the total', () => {
  const rebuilt = summary => summary.groups
    ? sum(summary.groups.map(g => g.sign * sum(g.kept))) + summary.modifier
    : sum(summary.kept) + summary.modifier;

  it.each([
    '2d6 - 1d4 + 3', '1d20 - 4d6kh3 + 2', '-2d8+5', '3d6kl2 - 1d4kh1 - 7', '10 - 1d6', '2d6+1d4',
    '4d6kh3', '-4d6kl1', '1d6-1d6-1d6+0', '2d20kh1 - 2d20kl1'
  ])('%s: sign x kept of each group, plus the modifier, is the total (2000 seeded rolls)', expression => {
    const rand = createSeededRandom(expression.length * 7919);
    for (let i = 0; i < 2000; i++) {
      const summary = summarizeExpression(rollDiceExpression(expression, rand));
      expect(rebuilt(summary)).toBe(summary.total);
      expect(summary.kept.length + summary.dropped.length).toBe(summary.rolls.length);
    }
  });

  it('a subtracted keep-highest group records every die, which counted, and that it was subtracted', () => {
    const s = summarizeExpression(rollDiceExpression('2d6 - 4d6kh3 + 2', faces(6, 3, 4, 6, 1, 5, 2)));
    expect(s.groups).toEqual([
      { sign: 1, rolls: [3, 4], kept: [3, 4], dropped: [] },
      { sign: -1, rolls: [6, 1, 5, 2], kept: [2, 5, 6], dropped: [1] }
    ]);
    expect(s.modifier).toBe(2);
    expect(s.total).toBe(7 - 13 + 2);
    expect(s.rolls).toEqual([3, 4, 6, 1, 5, 2]); // dice are never negated; the group carries the sign
  });

  it('a subtracted keep-lowest group, the same', () => {
    const s = summarizeExpression(rollDiceExpression('10 - 3d6kl1', faces(6, 5, 2, 4)));
    expect(s.groups).toEqual([{ sign: -1, rolls: [5, 2, 4], kept: [2], dropped: [5, 4] }]);
    expect(s.total).toBe(8);
  });

  it('plain additive groups need no signed groups: the flat lists already add up', () => {
    const s = summarizeExpression(rollDiceExpression('2d6+1d4+3', faces(6, 2, 3, 4)));
    expect(s.groups).toBeUndefined();
    expect(sum(s.kept) + s.modifier).toBe(s.total);
  });

  it('a critical group roll: the kept dice of both groups plus the modifier (once) is the total', () => {
    const rand = createSeededRandom(11);
    for (let i = 0; i < 500; i++) {
      const r = rollDiceNotation('4d6kh3+2', rand, { critical: true });
      expect(sum(r.groups.flatMap(g => g.kept)) + r.modifier).toBe(r.total);
    }
  });
});

// Saved damage text with words is cleaned only when the words trail the dice. Anything else is refused
// whole (with a reason), never partly rolled: no term is dropped silently.
describe('legacy damage text is cleaned or refused, never partly rolled', () => {
  it.each([
    ['1d8+3 slashing', '1d8+3'],
    ['1d8 + 3 fire', '1d8 + 3'],
    ['1d8 piercing, magical', '1d8'],
    ['1d6 fire/cold', '1d6'],
    ['1d10 force damage bonus', '1d10'],
    ['1d8+3 Slashing ', '1d8+3'],
    ['5 fire', '5']
  ])('%j is rolled as %j', (saved, cleaned) => {
    expect(normalizeLegacyDamageNotation(saved)).toBe(cleaned);
    expect(describeDiceProblem(cleaned)).toBeNull();
  });

  it.each([
    '2d6 fire and 1d6 cold', // words between terms: the second group must not be lost
    '1d8+2 plus 1d6 radiant',
    '2d6 bludgeoning + 1d4',
    '1d8+3 slashing (versatile 1d10)',
    '1d8+3 slash', // not a recognised word
    'fire'
  ])('%j is refused as a whole, with a reason', saved => {
    const cleaned = normalizeLegacyDamageNotation(saved);
    expect(parseDiceNotation(cleaned)).toBeNull();
    expect(parseDiceExpression(cleaned)).toBeNull();
    expect(describeDiceProblem(cleaned).code).toBe('malformed');
  });
});
