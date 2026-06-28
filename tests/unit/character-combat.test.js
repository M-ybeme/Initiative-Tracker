import { describe, it, expect } from 'vitest';
import {
  applyDamageToHP,
  applyHealingToHP,
  setTempHP,
  getDeathSaveOutcome,
  getDeathSaveState,
  getCriticalHitNotation,
  parseAttackBonus,
} from '../../js/character/character-combat.js';

describe('applyDamageToHP', () => {
  it('reduces current HP by damage when no temp HP', () => {
    const r = applyDamageToHP(30, 0, 40, 10);
    expect(r.newCurrentHP).toBe(20);
    expect(r.newTempHP).toBe(0);
    expect(r.damageToHP).toBe(10);
  });

  it('absorbs damage fully through temp HP', () => {
    const r = applyDamageToHP(30, 5, 40, 3);
    expect(r.newCurrentHP).toBe(30); // no HP damage
    expect(r.newTempHP).toBe(2);     // 5 - 3 remaining
    expect(r.damageToHP).toBe(0);
  });

  it('absorbs damage partially through temp HP then continues to HP', () => {
    const r = applyDamageToHP(30, 5, 40, 8);
    expect(r.newTempHP).toBe(0);     // all temp HP used
    expect(r.newCurrentHP).toBe(27); // 30 - (8-5) = 27
    expect(r.damageToHP).toBe(3);
  });

  it('cannot reduce HP below 0', () => {
    const r = applyDamageToHP(5, 0, 40, 100);
    expect(r.newCurrentHP).toBe(0);
  });

  it('treats negative damage as 0', () => {
    const r = applyDamageToHP(30, 5, 40, -10);
    expect(r.newCurrentHP).toBe(30);
    expect(r.newTempHP).toBe(5);
  });

  it('treats null/undefined as 0', () => {
    const r = applyDamageToHP(null, undefined, null, null);
    expect(r.newCurrentHP).toBe(0);
    expect(r.newTempHP).toBe(0);
  });
});

describe('applyHealingToHP', () => {
  it('restores HP up to max', () => {
    expect(applyHealingToHP(20, 40, 10)).toBe(30);
  });

  it('cannot exceed max HP', () => {
    expect(applyHealingToHP(35, 40, 20)).toBe(40);
  });

  it('healing from 0 HP', () => {
    expect(applyHealingToHP(0, 40, 5)).toBe(5);
  });

  it('healing of 0 returns current HP unchanged', () => {
    expect(applyHealingToHP(25, 40, 0)).toBe(25);
  });

  it('treats negative healing as 0', () => {
    expect(applyHealingToHP(25, 40, -5)).toBe(25);
  });

  it('handles null/undefined as 0', () => {
    expect(applyHealingToHP(null, null, null)).toBe(0);
  });
});

describe('setTempHP', () => {
  it('returns the higher of current and new temp HP', () => {
    expect(setTempHP(5, 10)).toBe(10);
    expect(setTempHP(15, 8)).toBe(15);
  });

  it('returns the same value when equal', () => {
    expect(setTempHP(7, 7)).toBe(7);
  });

  it('returns 0 when both are 0', () => {
    expect(setTempHP(0, 0)).toBe(0);
  });

  it('treats negative values as 0', () => {
    expect(setTempHP(-5, 3)).toBe(3);
    expect(setTempHP(3, -5)).toBe(3);
  });

  it('handles null/undefined as 0', () => {
    expect(setTempHP(null, 5)).toBe(5);
    expect(setTempHP(3, undefined)).toBe(3);
  });
});

describe('getDeathSaveOutcome', () => {
  it('returns critical_success for a natural 20', () => {
    expect(getDeathSaveOutcome(20)).toBe('critical_success');
  });

  it('returns double_failure for a natural 1', () => {
    expect(getDeathSaveOutcome(1)).toBe('double_failure');
  });

  it('returns success for rolls 10-19', () => {
    expect(getDeathSaveOutcome(10)).toBe('success');
    expect(getDeathSaveOutcome(15)).toBe('success');
    expect(getDeathSaveOutcome(19)).toBe('success');
  });

  it('returns failure for rolls 2-9', () => {
    expect(getDeathSaveOutcome(2)).toBe('failure');
    expect(getDeathSaveOutcome(5)).toBe('failure');
    expect(getDeathSaveOutcome(9)).toBe('failure');
  });
});

describe('getDeathSaveState', () => {
  it('returns dying when below thresholds', () => {
    expect(getDeathSaveState(0, 0)).toBe('dying');
    expect(getDeathSaveState(2, 2)).toBe('dying');
    expect(getDeathSaveState(1, 0)).toBe('dying');
  });

  it('returns stable with 3 successes', () => {
    expect(getDeathSaveState(3, 0)).toBe('stable');
    expect(getDeathSaveState(3, 2)).toBe('stable');
  });

  it('returns dead with 3 failures', () => {
    expect(getDeathSaveState(0, 3)).toBe('dead');
    expect(getDeathSaveState(2, 3)).toBe('dead');
  });

  it('dead takes precedence over stable at 3+3', () => {
    // Extremely edge case: if somehow both are 3, dead wins
    expect(getDeathSaveState(3, 3)).toBe('dead');
  });

  it('handles null/undefined as 0', () => {
    expect(getDeathSaveState(null, null)).toBe('dying');
    expect(getDeathSaveState(undefined, 3)).toBe('dead');
  });
});

describe('getCriticalHitNotation', () => {
  it('doubles dice count for simple notation', () => {
    expect(getCriticalHitNotation('2d6')).toBe('4d6');
    expect(getCriticalHitNotation('1d8')).toBe('2d8');
    expect(getCriticalHitNotation('3d10')).toBe('6d10');
  });

  it('preserves positive modifier', () => {
    expect(getCriticalHitNotation('2d6+3')).toBe('4d6+3');
    expect(getCriticalHitNotation('1d8+5')).toBe('2d8+5');
  });

  it('preserves negative modifier', () => {
    expect(getCriticalHitNotation('2d6-2')).toBe('4d6-2');
  });

  it('omits modifier when it is 0', () => {
    expect(getCriticalHitNotation('2d6')).toBe('4d6');
  });

  it('returns null for invalid notation', () => {
    expect(getCriticalHitNotation('invalid')).toBeNull();
    expect(getCriticalHitNotation('')).toBeNull();
    expect(getCriticalHitNotation(null)).toBeNull();
  });
});

describe('parseAttackBonus', () => {
  it('parses a positive bonus string', () => {
    expect(parseAttackBonus('+5')).toBe(5);
    expect(parseAttackBonus('5')).toBe(5);
  });

  it('parses a negative bonus string', () => {
    expect(parseAttackBonus('-2')).toBe(-2);
  });

  it('parses bonus embedded in text', () => {
    expect(parseAttackBonus('+7 to hit')).toBe(7);
  });

  it('returns 0 for empty or non-numeric string', () => {
    expect(parseAttackBonus('')).toBe(0);
    expect(parseAttackBonus('no bonus')).toBe(0);
    expect(parseAttackBonus(null)).toBe(0);
    expect(parseAttackBonus(undefined)).toBe(0);
  });
});
