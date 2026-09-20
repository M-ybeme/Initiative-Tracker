import { describe, it, expect } from 'vitest';
import * as HD from '../../js/modules/hit-dice.js';
import { applyShortRest, applyLongRest } from '../../js/character/character-rest.js';

describe('hit-dice pool: reading and printing', () => {
  it('reads a single die size, as before', () => {
    expect(HD.parse('5d8')).toEqual([{ size: 8, count: 5 }]);
    expect(HD.format(HD.parse('5d8'))).toBe('5d8');
  });
  it('reads a mixed pool, largest die first, and prints it the same way', () => {
    expect(HD.parse('4d6 + 3d8')).toEqual([{ size: 8, count: 3 }, { size: 6, count: 4 }]);
    expect(HD.format(HD.parse('3d8+4d6'))).toBe('3d8 + 4d6');
  });
  it('adds a repeated size together and ignores trailing text', () => {
    expect(HD.parse('2d8 + 1d8 + 3d6')).toEqual([{ size: 8, count: 3 }, { size: 6, count: 3 }]);
    expect(HD.parse('5d10 (Fighter)')).toEqual([{ size: 10, count: 5 }]);
  });
  it('returns null when there are no dice, and keeps a size that has run out', () => {
    expect(HD.parse('')).toBeNull();
    expect(HD.parse('none')).toBeNull();
    expect(HD.parse(undefined)).toBeNull();
    expect(HD.format(HD.parse('0d8 + 2d6'))).toBe('0d8 + 2d6');
  });
});

describe('hit-dice pool: spending and adding', () => {
  const pool = HD.parse('3d8 + 4d6');
  it('spends from one size only', () => {
    expect(HD.format(HD.spend(pool, 6, 2))).toBe('3d8 + 2d6');
    expect(HD.format(HD.spend(pool, 8, 1))).toBe('2d8 + 4d6');
  });
  it('never goes below zero, and a single pool keeps its zero', () => {
    expect(HD.format(HD.spend(HD.parse('1d10'), 10, 3))).toBe('0d10');
  });
  it('adds to an existing size or starts a new one', () => {
    expect(HD.format(HD.add(pool, 6, 1))).toBe('3d8 + 5d6');
    expect(HD.format(HD.add(pool, 10, 1))).toBe('1d10 + 3d8 + 4d6');
  });
  it('picks the largest size that still has dice', () => {
    expect(HD.defaultSize(HD.parse('0d8 + 2d6'))).toBe(6);
    expect(HD.defaultSize(HD.parse('0d8'))).toBeNull();
  });
});

describe('hit-dice pool: remaining read against the total', () => {
  const total = HD.parse('2d8 + 4d6');
  it('keeps a remaining pool that already fits, and shows every size in the total', () => {
    expect(HD.format(HD.resolveRemaining(total, '1d8 + 2d6'))).toBe('1d8 + 2d6');
    expect(HD.format(HD.resolveRemaining(total, '2d8'))).toBe('2d8 + 0d6');
  });
  it('counts, not discards, an older single value that does not fit a mixed total', () => {
    expect(HD.format(HD.resolveRemaining(total, '6d6'))).toBe('2d8 + 4d6');
    expect(HD.format(HD.resolveRemaining(total, '3d10'))).toBe('2d8 + 1d6');
  });
  it('reads a single-size total as it always did', () => {
    expect(HD.format(HD.resolveRemaining(HD.parse('5d6'), '3d6'))).toBe('3d6');
    expect(HD.format(HD.resolveRemaining(HD.parse('5d6'), '3d8'))).toBe('3d6'); // die was never tracked: the dice are kept
  });
  it('is not a pool when the text holds no dice notation at all', () => {
    expect(HD.resolveRemaining(total, 'none')).toBeNull();
    expect(HD.resolveRemaining(total, 'lots')).toBeNull();
  });
});

describe('hit-dice pool: malformed remaining values', () => {
  const total = HD.parse('3d8 + 4d6');
  const shown = text => HD.format(HD.resolveRemaining(total, text));
  it('cuts a count above the total back to the total', () => {
    expect(shown('2d8 + 9d6')).toBe('2d8 + 4d6');
    expect(shown('7d8 + 4d6')).toBe('3d8 + 4d6');
  });
  it('removes a die size the total does not have, and never creates one', () => {
    expect(shown('2d8 + 1d10')).toBe('2d8 + 0d6');
    expect(shown('2d8 + 1d10')).not.toContain('d10');
    expect(HD.format(HD.resolveRemaining(HD.parse('5d8'), '2d8 + 1d6'))).toBe('2d8');
  });
  it('reads blank remaining as no dice left, with every size in the total at 0', () => {
    expect(shown('')).toBe('0d8 + 0d6');
    expect(shown('   ')).toBe('0d8 + 0d6');
    expect(HD.defaultSize(HD.resolveRemaining(total, ''))).toBeNull();
  });
  it('reads 0d0 as no dice left, not as invalid', () => {
    expect(shown('0d0')).toBe('0d8 + 0d6');
    expect(HD.resolveRemaining(null, '0d0')).toEqual([]);
    expect(HD.resolveRemaining(null, '')).toEqual([]);
    expect(HD.defaultSize(HD.resolveRemaining(null, '0d0'))).toBeNull();
  });
  it('never yields a count outside 0..total for any size', () => {
    for (const text of ['99d8 + 99d6', '0d8 + 0d6', '1d8', '4d6', '9d6', '2d8 + 1d10 + 5d6']) {
      for (const p of HD.resolveRemaining(total, text)) {
        const cap = total.find(t => t.size === p.size).count;
        expect(p.count).toBeGreaterThanOrEqual(0);
        expect(p.count).toBeLessThanOrEqual(cap);
      }
    }
  });
});

describe('hit-dice pool: input safety', () => {
  const pool = HD.parse('3d8 + 4d6');
  const bad = [NaN, Infinity, -Infinity, -2, 0, 1.5, 'abc', '', null, undefined, {}];
  it('spend with a count that is not a whole number of at least 1 changes nothing', () => {
    for (const n of bad) expect(HD.format(HD.spend(pool, 6, n))).toBe('3d8 + 4d6');
  });
  it('spend with a bad die size changes nothing', () => {
    for (const size of [NaN, 'd8', 0, -6, 6.5, undefined]) expect(HD.format(HD.spend(pool, size, 1))).toBe('3d8 + 4d6');
  });
  it('add with a bad count or size changes nothing', () => {
    for (const n of bad.filter(v => v !== undefined)) expect(HD.format(HD.add(pool, 6, n))).toBe('3d8 + 4d6'); // undefined is the default of 1
    for (const size of [NaN, 'd8', 0, -6, 6.5]) expect(HD.format(HD.add(pool, size, 1))).toBe('3d8 + 4d6');
  });
  it('numeric text is accepted as a number', () => {
    expect(HD.format(HD.spend(pool, '6', '2'))).toBe('3d8 + 2d6');
    expect(HD.format(HD.add(pool, '10', '1'))).toBe('1d10 + 3d8 + 4d6');
  });
  it('spend and add never print malformed notation', () => {
    const outputs = [];
    for (const n of bad) for (const size of [6, 8, 'd8', NaN, 4.5]) {
      outputs.push(HD.format(HD.spend(pool, size, n)), HD.format(HD.add(pool, size, n)));
    }
    for (const text of outputs) expect(text).toMatch(/^(\d+d\d+)( \+ \d+d\d+)*$/);
    expect(outputs.join('|')).not.toMatch(/NaN|Infinity|dd/);
  });
  it('format skips an entry that is not a real die', () => {
    expect(HD.format([{ size: 8, count: 2 }, { size: NaN, count: 1 }, { size: 6, count: -1 }, { size: 6, count: 1.5 }])).toBe('2d8');
  });
});

describe('hit-dice pool: long rest', () => {
  it('for one size is min(total, remaining + max(1, floor(total / 2)))', () => {
    expect(HD.format(HD.restoreLong(HD.parse('5d10'), HD.parse('1d10')))).toBe('3d10');
    expect(HD.format(HD.restoreLong(HD.parse('5d10'), HD.parse('4d10')))).toBe('5d10');
    expect(HD.format(HD.restoreLong(HD.parse('1d8'), HD.parse('0d8')))).toBe('1d8');
  });
  it('rounds down at odd totals and gives back at least 1', () => {
    expect(HD.format(HD.restoreLong(HD.parse('7d8'), HD.parse('0d8')))).toBe('3d8'); // floor(7 / 2)
    expect(HD.format(HD.restoreLong(HD.parse('5d8'), HD.parse('0d8')))).toBe('2d8');
    expect(HD.format(HD.restoreLong(HD.parse('1d8'), HD.parse('1d8')))).toBe('1d8');
  });
  it('restores half the total number of dice, largest die first, never above the total', () => {
    const total = HD.parse('3d8 + 4d6');
    expect(HD.format(HD.restoreLong(total, HD.parse('0d8 + 0d6')))).toBe('3d8 + 0d6');
    expect(HD.format(HD.restoreLong(total, HD.parse('2d8 + 0d6')))).toBe('3d8 + 2d6');
    expect(HD.format(HD.restoreLong(total, HD.parse('3d8 + 4d6')))).toBe('3d8 + 4d6');
  });
});

describe('rest module with a mixed pool', () => {
  const make = (over = {}) => ({ maxHP: 40, currentHP: 10, hitDice: '3d8 + 4d6', hitDiceRemaining: '3d8 + 4d6', ...over });
  it('a short rest spends from the die named, and the other pool is untouched', () => {
    expect(applyShortRest(make(), 5, 2, 6).hitDiceRemaining).toBe('3d8 + 2d6');
    expect(applyShortRest(make(), 5, 1, 8).hitDiceRemaining).toBe('2d8 + 4d6');
  });
  it('a short rest with no die named spends the largest that has dice, and a single pool is as before', () => {
    expect(applyShortRest(make({ hitDiceRemaining: '0d8 + 4d6' }), 0, 1).hitDiceRemaining).toBe('0d8 + 3d6');
    expect(applyShortRest(make({ hitDice: '5d10', hitDiceRemaining: '3d10' }), 0, 2).hitDiceRemaining).toBe('1d10');
  });
  it('a long rest restores half the total number of dice, largest die first', () => {
    expect(applyLongRest(make({ hitDiceRemaining: '0d8 + 0d6' })).hitDiceRemaining).toBe('3d8 + 0d6');
    expect(applyLongRest(make({ hitDice: '5d10', hitDiceRemaining: '1d10' })).hitDiceRemaining).toBe('3d10');
  });
  it('an older single remaining value is counted against a mixed total, not dropped', () => {
    expect(applyLongRest(make({ hitDice: '2d8 + 4d6', hitDiceRemaining: '2d6' })).hitDiceRemaining).toBe('2d8 + 3d6');
  });
});
