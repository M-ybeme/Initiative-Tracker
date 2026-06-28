import { describe, it, expect } from 'vitest';
import {
  XP_THRESHOLDS,
  getXPForLevel,
  getLevelFromXP,
  getXPProgressInfo,
} from '../../js/character/character-xp.js';

describe('XP_THRESHOLDS', () => {
  it('has exactly 20 entries', () => {
    expect(XP_THRESHOLDS).toHaveLength(20);
  });

  it('level 1 threshold is 0', () => {
    expect(XP_THRESHOLDS[0]).toBe(0);
  });

  it('level 20 threshold is 355000', () => {
    expect(XP_THRESHOLDS[19]).toBe(355000);
  });

  it('thresholds are strictly increasing', () => {
    for (let i = 1; i < XP_THRESHOLDS.length; i++) {
      expect(XP_THRESHOLDS[i]).toBeGreaterThan(XP_THRESHOLDS[i - 1]);
    }
  });

  it('level 2 requires 300 XP', () => {
    expect(XP_THRESHOLDS[1]).toBe(300);
  });

  it('level 5 requires 6500 XP', () => {
    expect(XP_THRESHOLDS[4]).toBe(6500);
  });
});

describe('getXPForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(getXPForLevel(1)).toBe(0);
  });

  it('returns 300 for level 2', () => {
    expect(getXPForLevel(2)).toBe(300);
  });

  it('returns correct values for mid-levels', () => {
    expect(getXPForLevel(5)).toBe(6500);
    expect(getXPForLevel(10)).toBe(64000);
    expect(getXPForLevel(15)).toBe(165000);
  });

  it('returns 355000 for level 20', () => {
    expect(getXPForLevel(20)).toBe(355000);
  });

  it('clamps below 1 to level 1 (0 XP)', () => {
    expect(getXPForLevel(0)).toBe(0);
    expect(getXPForLevel(-5)).toBe(0);
  });

  it('clamps above 20 to level 20 (355000 XP)', () => {
    expect(getXPForLevel(21)).toBe(355000);
    expect(getXPForLevel(100)).toBe(355000);
  });

  it('handles null/undefined/NaN by defaulting to level 1', () => {
    expect(getXPForLevel(null)).toBe(0);
    expect(getXPForLevel(undefined)).toBe(0);
    expect(getXPForLevel(NaN)).toBe(0);
  });
});

describe('getLevelFromXP', () => {
  it('returns 1 for 0 XP', () => {
    expect(getLevelFromXP(0)).toBe(1);
  });

  it('returns 1 for XP below level 2 threshold', () => {
    expect(getLevelFromXP(299)).toBe(1);
  });

  it('returns 2 at exactly the level 2 threshold', () => {
    expect(getLevelFromXP(300)).toBe(2);
  });

  it('returns correct level for mid-game XP', () => {
    expect(getLevelFromXP(6500)).toBe(5);
    expect(getLevelFromXP(6499)).toBe(4);
    expect(getLevelFromXP(64000)).toBe(10);
  });

  it('returns 20 at exactly the level 20 threshold', () => {
    expect(getLevelFromXP(355000)).toBe(20);
  });

  it('returns 20 for XP beyond the level 20 threshold', () => {
    expect(getLevelFromXP(500000)).toBe(20);
  });

  it('returns 1 for negative or null XP', () => {
    expect(getLevelFromXP(-100)).toBe(1);
    expect(getLevelFromXP(null)).toBe(1);
    expect(getLevelFromXP(undefined)).toBe(1);
  });

  it('handles fractional XP by flooring', () => {
    expect(getLevelFromXP(299.9)).toBe(1);
    expect(getLevelFromXP(300.1)).toBe(2);
  });
});

describe('getXPProgressInfo', () => {
  it('returns correct structure', () => {
    const info = getXPProgressInfo(500, 1);
    expect(info).toHaveProperty('currentLvlXP');
    expect(info).toHaveProperty('nextLvlXP');
    expect(info).toHaveProperty('xpToNext');
    expect(info).toHaveProperty('pct');
    expect(info).toHaveProperty('canLevelUp');
    expect(info).toHaveProperty('atMax');
  });

  it('calculates correct xpToNext at level 1 with 0 XP', () => {
    const info = getXPProgressInfo(0, 1);
    expect(info.currentLvlXP).toBe(0);
    expect(info.nextLvlXP).toBe(300);
    expect(info.xpToNext).toBe(300);
    expect(info.pct).toBe(0);
    expect(info.canLevelUp).toBe(false);
    expect(info.atMax).toBe(false);
  });

  it('calculates 50% progress at midpoint', () => {
    // Level 1: 0 to 300 XP. Midpoint = 150
    const info = getXPProgressInfo(150, 1);
    expect(info.pct).toBe(50);
    expect(info.xpToNext).toBe(150);
  });

  it('canLevelUp is true when XP meets the next threshold', () => {
    const info = getXPProgressInfo(300, 1);
    expect(info.canLevelUp).toBe(true);
    expect(info.pct).toBe(100);
    expect(info.xpToNext).toBe(0);
  });

  it('canLevelUp is true when XP exceeds the next threshold', () => {
    const info = getXPProgressInfo(500, 1);
    expect(info.canLevelUp).toBe(true);
  });

  it('pct is capped at 100 when XP exceeds next threshold', () => {
    const info = getXPProgressInfo(1000, 1);
    expect(info.pct).toBe(100);
  });

  it('returns atMax=true and nextLvlXP=null at level 20', () => {
    const info = getXPProgressInfo(355000, 20);
    expect(info.atMax).toBe(true);
    expect(info.nextLvlXP).toBeNull();
    expect(info.pct).toBe(100);
    expect(info.canLevelUp).toBe(false);
  });

  it('xpToNext is 0 at max level', () => {
    const info = getXPProgressInfo(355000, 20);
    expect(info.xpToNext).toBe(0);
  });

  it('handles XP below current level threshold gracefully', () => {
    // Character claims level 5 but has only 100 XP
    const info = getXPProgressInfo(100, 5);
    expect(info.currentLvlXP).toBe(6500); // level 5 threshold
    expect(info.pct).toBe(0); // progress = max(0, 100-6500) = 0
    expect(info.canLevelUp).toBe(false);
  });

  it('handles null/undefined XP as 0', () => {
    const info = getXPProgressInfo(null, 1);
    expect(info.pct).toBe(0);
    expect(info.xpToNext).toBe(300);
  });

  it('handles null/undefined level by defaulting to 1', () => {
    const info = getXPProgressInfo(0, null);
    expect(info.currentLvlXP).toBe(0);
    expect(info.nextLvlXP).toBe(300);
  });
});
