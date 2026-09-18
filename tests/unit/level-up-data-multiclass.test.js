import { describe, it, expect, beforeAll } from 'vitest';

// data/srd/level-up-data.js is a classic script (window.LevelUpData = (function(){...})()),
// not an ES module, so it's loaded for its side effect rather than via named imports.
// This covers the live multiclass math (calculateEffectiveCasterLevel, getMulticlassSpellSlots,
// checkMulticlassPrerequisites, getWarlockPactSlots) that previously had zero unit coverage —
// the module these tests used to target (js/character/level-up-calculations.js) was never
// wired into the app; this file replaces that coverage with the functions actually in use.
let LevelUpData;

beforeAll(async () => {
  await import('../../data/srd/level-up-data.js');
  LevelUpData = window.LevelUpData;
});

describe('checkMulticlassPrerequisites', () => {
  it('allows multiclass when requirements are met', () => {
    const abilities = { str: 13, dex: 14, con: 12, int: 10, wis: 15, cha: 8 };
    const result = LevelUpData.checkMulticlassPrerequisites('Cleric', abilities);
    expect(result.meetsRequirements).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('prevents multiclass when requirements are not met', () => {
    const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const result = LevelUpData.checkMulticlassPrerequisites('Paladin', abilities);
    expect(result.meetsRequirements).toBe(false);
    expect(result.missing).toContain('STR 13');
    expect(result.missing).toContain('CHA 13');
  });

  it('handles Fighter OR requirement (STR 13 OR DEX 13)', () => {
    const strFighter = { str: 13, dex: 8, con: 10, int: 10, wis: 10, cha: 10 };
    expect(LevelUpData.checkMulticlassPrerequisites('Fighter', strFighter).meetsRequirements).toBe(true);

    const dexFighter = { str: 8, dex: 13, con: 10, int: 10, wis: 10, cha: 10 };
    expect(LevelUpData.checkMulticlassPrerequisites('Fighter', dexFighter).meetsRequirements).toBe(true);

    const neither = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const result = LevelUpData.checkMulticlassPrerequisites('Fighter', neither);
    expect(result.meetsRequirements).toBe(false);
    expect(result.missing).toContain('STR 13 or DEX 13');
  });

  it('allows any class if no prerequisites defined', () => {
    const abilities = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
    const result = LevelUpData.checkMulticlassPrerequisites('UnknownClass', abilities);
    expect(result.meetsRequirements).toBe(true);
  });

  it('normalizes a level-suffixed or subclass-annotated class name before comparing, so the Fighter OR-check and other prerequisites cannot be silently bypassed', () => {
    const neither = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

    // "Fighter 5" must still hit the Fighter OR-branch, not fall through to the
    // no-prerequisites-defined fail-open path.
    expect(LevelUpData.checkMulticlassPrerequisites('Fighter 5', neither).meetsRequirements).toBe(false);
    expect(LevelUpData.checkMulticlassPrerequisites('Fighter (Champion) 5', neither).meetsRequirements).toBe(false);
    const strFighter = { str: 13, dex: 8, con: 10, int: 10, wis: 10, cha: 10 };
    expect(LevelUpData.checkMulticlassPrerequisites('Fighter 5', strFighter).meetsRequirements).toBe(true);

    // Same normalization must apply to every other class's AND-of-all-entries lookup too —
    // "Paladin 5" must still require STR 13 + CHA 13, not fail open like an unknown class.
    expect(LevelUpData.checkMulticlassPrerequisites('Paladin 5', neither).meetsRequirements).toBe(false);
  });
});

describe('calculateEffectiveCasterLevel', () => {
  it('returns 0 for non-casters', () => {
    expect(LevelUpData.calculateEffectiveCasterLevel([{ className: 'Fighter', level: 10 }])).toBe(0);
  });

  it('returns full level for full casters', () => {
    expect(LevelUpData.calculateEffectiveCasterLevel([{ className: 'Wizard', level: 10 }])).toBe(10);
  });

  it('returns half level (rounded down) for half casters', () => {
    expect(LevelUpData.calculateEffectiveCasterLevel([{ className: 'Paladin', level: 5 }])).toBe(2);
    expect(LevelUpData.calculateEffectiveCasterLevel([{ className: 'Ranger', level: 10 }])).toBe(5);
  });

  it('returns ceiling for Artificer', () => {
    expect(LevelUpData.calculateEffectiveCasterLevel([{ className: 'Artificer', level: 3 }])).toBe(2);
  });

  it('ignores Warlock (Pact Magic is separate)', () => {
    const classes = [
      { className: 'Wizard', level: 5 },
      { className: 'Warlock', level: 5 }
    ];
    expect(LevelUpData.calculateEffectiveCasterLevel(classes)).toBe(5);
  });

  it('calculates multiclass caster level correctly', () => {
    // Wizard 5 / Paladin 6 (floor(6/2)=3) / Cleric 3 = 5 + 3 + 3 = 11
    const classes = [
      { className: 'Wizard', level: 5 },
      { className: 'Paladin', level: 6 },
      { className: 'Cleric', level: 3 }
    ];
    expect(LevelUpData.calculateEffectiveCasterLevel(classes)).toBe(11);
  });
});

describe('getMulticlassSpellSlots', () => {
  it('returns null for non-casters', () => {
    expect(LevelUpData.getMulticlassSpellSlots([{ className: 'Barbarian', level: 10 }])).toBeNull();
  });

  it('returns correct slots for caster level', () => {
    const slots = LevelUpData.getMulticlassSpellSlots([{ className: 'Wizard', level: 5 }]);
    expect(slots).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
  });

  it('uses the multiclass spell slot table for combined caster levels', () => {
    // Wizard 3 / Cleric 2 = caster level 5
    const classes = [
      { className: 'Wizard', level: 3 },
      { className: 'Cleric', level: 2 }
    ];
    expect(LevelUpData.getMulticlassSpellSlots(classes)).toEqual(LevelUpData.MULTICLASS_SPELL_SLOTS[5]);
  });
});

describe('getWarlockPactSlots', () => {
  it('returns null for level 0', () => {
    expect(LevelUpData.getWarlockPactSlots(0)).toBeNull();
  });

  it('returns pact slot info for a valid Warlock level', () => {
    const result = LevelUpData.getWarlockPactSlots(1);
    expect(result).toBeTruthy();
    expect(result.slots).toBeGreaterThan(0);
  });
});
