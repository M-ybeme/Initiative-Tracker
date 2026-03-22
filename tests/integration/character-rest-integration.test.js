/**
 * Integration Tests: Character Rest Mechanics
 */
import { describe, it, expect } from 'vitest';
import { applyShortRest, applyLongRest, rollHitDiceForHealing } from '../../js/modules/character-rest.js';
import { getSpellSlots } from '../../js/modules/level-up-calculations.js';
import { createSeededRandom } from '../../js/modules/dice.js';

function makeWizard(ov = {}) {
  return {
    name: 'Elara', charClass: 'Wizard 7', level: 7,
    maxHP: 42, currentHP: 18, tempHP: 5,
    hitDice: '7d6', hitDiceRemaining: '5d6',
    spellSlots: {
      1: { max: 4, used: 3 }, 2: { max: 3, used: 2 }, 3: { max: 3, used: 1 },
      4: { max: 1, used: 1 }, 5: { max: 0, used: 0 }, 6: { max: 0, used: 0 },
      7: { max: 0, used: 0 }, 8: { max: 0, used: 0 }, 9: { max: 0, used: 0 },
    },
    pactSlots: { level: 0, max: 0, used: 0 },
    ...ov,
  };
}

function makeWarlock(ov = {}) {
  return {
    name: 'Vex', charClass: 'Warlock 5', level: 5,
    maxHP: 38, currentHP: 20, tempHP: 0,
    hitDice: '5d8', hitDiceRemaining: '3d8',
    spellSlots: {
      1: { max: 0, used: 0 }, 2: { max: 0, used: 0 }, 3: { max: 0, used: 0 },
      4: { max: 0, used: 0 }, 5: { max: 0, used: 0 }, 6: { max: 0, used: 0 },
      7: { max: 0, used: 0 }, 8: { max: 0, used: 0 }, 9: { max: 0, used: 0 },
    },
    pactSlots: { level: 3, max: 2, used: 2 },
    ...ov,
  };
}

function makeFighter(ov = {}) {
  return {
    name: 'Brynn', charClass: 'Fighter 5', level: 5,
    maxHP: 52, currentHP: 30, tempHP: 0,
    hitDice: '5d10', hitDiceRemaining: '3d10',
    spellSlots: {}, pactSlots: { level: 0, max: 0, used: 0 },
    ...ov,
  };
}
describe('short rest: HP recovery', () => {
  it('heals by the roll amount', () => {
    const c = makeWizard({ currentHP: 20 });
    applyShortRest(c, 10, 2);
    expect(c.currentHP).toBe(30);
  });
  it('cannot exceed max HP', () => {
    const c = makeWizard({ currentHP: 40, maxHP: 42 });
    applyShortRest(c, 10, 1);
    expect(c.currentHP).toBe(42);
  });
  it('zero healing leaves HP unchanged', () => {
    const c = makeWizard({ currentHP: 18 });
    applyShortRest(c, 0, 0);
    expect(c.currentHP).toBe(18);
  });
})

describe('short rest: hit dice expenditure', () => {
  it('reduces hitDiceRemaining by spent count', () => {
    const c = makeWizard();
    applyShortRest(c, 8, 2);
    expect(c.hitDiceRemaining).toBe('3d6');
  });
  it('preserves die size', () => {
    const c = makeFighter();
    applyShortRest(c, 12, 1);
    expect(c.hitDiceRemaining).toBe('2d10');
  });
  it('cannot go below 0 hit dice remaining', () => {
    const c = makeWizard({ hitDiceRemaining: '1d6' });
    applyShortRest(c, 4, 5);
    expect(c.hitDiceRemaining).toBe('0d6');
  });
  it('multiple short rests cumulate hit dice usage', () => {
    const c = makeWizard();
    applyShortRest(c, 5, 1);
    applyShortRest(c, 4, 2);
    expect(c.hitDiceRemaining).toBe('2d6');
  });
})

describe('short rest: spell slots unchanged', () => {
  it('does not restore spell slots', () => {
    const c = makeWizard();
    const usedBefore = {};
    for (let i = 1; i <= 9; i++) usedBefore[i] = c.spellSlots[i].used;
    applyShortRest(c, 6, 1);
    for (let i = 1; i <= 9; i++) expect(c.spellSlots[i].used).toBe(usedBefore[i]);
  });
})

describe('short rest: rollHitDiceForHealing integration', () => {
  it('healing from rolled dice is applied to HP', () => {
    const seeded = createSeededRandom(42);
    const c = makeFighter({ currentHP: 10 });
    const { healing } = rollHitDiceForHealing(10, 2, 3, seeded);
    applyShortRest(c, healing, 2);
    expect(c.currentHP).toBeGreaterThan(10);
    expect(c.currentHP).toBeLessThanOrEqual(c.maxHP);
    expect(c.hitDiceRemaining).toBe('1d10');
  });
  it('minimum healing is count even with negative CON mod', () => {
    const seeded = createSeededRandom(1);
    const { healing, rolls } = rollHitDiceForHealing(6, 3, -3, seeded);
    expect(healing).toBeGreaterThanOrEqual(rolls.length);
  });
})

describe('long rest: HP and temp HP', () => {
  it('restores HP to max', () => {
    const c = makeWizard({ currentHP: 10 });
    applyLongRest(c);
    expect(c.currentHP).toBe(42);
  });
  it('clears temp HP', () => {
    const c = makeWizard({ tempHP: 5 });
    applyLongRest(c);
    expect(c.tempHP).toBe(0);
  });
  it('handles characters with no spell slots gracefully', () => {
    const c = makeFighter();
    expect(() => applyLongRest(c)).not.toThrow();
    expect(c.currentHP).toBe(52);
  });
})

describe('long rest: spell slots', () => {
  it('resets all used spell slots to 0', () => {
    const c = makeWizard();
    applyLongRest(c);
    for (let i = 1; i <= 9; i++) expect(c.spellSlots[i].used).toBe(0);
  });
  it('does not change spell slot max values', () => {
    const c = makeWizard();
    const maxesBefore = {};
    for (let i = 1; i <= 9; i++) maxesBefore[i] = c.spellSlots[i].max;
    applyLongRest(c);
    for (let i = 1; i <= 9; i++) expect(c.spellSlots[i].max).toBe(maxesBefore[i]);
  });
})

describe('long rest: pact slots', () => {
  it('resets Warlock pact slot used to 0', () => {
    const c = makeWarlock();
    applyLongRest(c);
    expect(c.pactSlots.used).toBe(0);
  });
  it('does not change pact slot max or level', () => {
    const c = makeWarlock();
    applyLongRest(c);
    expect(c.pactSlots.max).toBe(2);
    expect(c.pactSlots.level).toBe(3);
  });
})

describe('long rest: hit dice restoration', () => {
  it('restores floor(total/2) hit dice, capped at total', () => {
    const c = makeWizard({ hitDice: '7d6', hitDiceRemaining: '5d6' });
    applyLongRest(c);
    expect(c.hitDiceRemaining).toBe('7d6');
  });
  it('restores minimum 1 when 0 remaining', () => {
    const c = makeWizard({ hitDice: '7d6', hitDiceRemaining: '0d6' });
    applyLongRest(c);
    expect(c.hitDiceRemaining).toBe('3d6');
  });
  it('does not exceed total hit dice', () => {
    const c = makeWizard({ hitDice: '7d6', hitDiceRemaining: '7d6' });
    applyLongRest(c);
    expect(c.hitDiceRemaining).toBe('7d6');
  });
  it('preserves die size for fighters', () => {
    const c = makeFighter({ hitDice: '5d10', hitDiceRemaining: '1d10' });
    applyLongRest(c);
    expect(c.hitDiceRemaining).toBe('3d10');
  });
})

describe('long rest: multiclass slot restoration', () => {
  it('Wizard 5 / Cleric 3 yields caster level 8 slots', () => {
    const classes = [
      { className: 'Wizard', level: 5, subclass: '' },
      { className: 'Cleric', level: 3, subclass: '' },
    ];
    expect(getSpellSlots(classes)).toEqual([4, 3, 3, 2, 0, 0, 0, 0, 0]);
  });
  it('Paladin 4 / Wizard 3 = caster level 5 (half + full)', () => {
    const classes = [
      { className: 'Paladin', level: 4, subclass: '' },
      { className: 'Wizard', level: 3, subclass: '' },
    ];
    expect(getSpellSlots(classes)).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
  });
  it('long rest resets all used slots for a multiclass character', () => {
    const slotsArr = [4, 3, 3, 2, 0, 0, 0, 0, 0];
    const c = {
      charClass: 'Wizard 5', level: 8, maxHP: 52, currentHP: 20, tempHP: 0,
      hitDice: '8d6', hitDiceRemaining: '4d6',
      spellSlots: Object.fromEntries(slotsArr.map((max, i) => [i + 1, { max, used: max }])),
      pactSlots: { level: 0, max: 0, used: 0 },
    };
    applyLongRest(c);
    for (let i = 1; i <= 9; i++) expect(c.spellSlots[i].used).toBe(0);
    expect(c.spellSlots[1].max).toBe(4);
    expect(c.spellSlots[4].max).toBe(2);
  });
})

describe('combat to short rest to long rest sequence', () => {
  it('wizard survives a full adventuring day', () => {
    const c = makeWizard({ currentHP: 42, tempHP: 0 });
    c.currentHP = 12;
    c.spellSlots[1].used = 3;
    c.spellSlots[2].used = 2;
    c.spellSlots[3].used = 1;

    const seeded = createSeededRandom(7);
    const { healing } = rollHitDiceForHealing(6, 2, 2, seeded);
    applyShortRest(c, healing, 2);
    expect(c.currentHP).toBeGreaterThan(12);
    expect(c.hitDiceRemaining).toBe('3d6');

    applyLongRest(c);
    expect(c.currentHP).toBe(42);
    expect(c.tempHP).toBe(0);
    expect(c.spellSlots[1].used).toBe(0);
    expect(c.spellSlots[2].used).toBe(0);
    expect(c.spellSlots[3].used).toBe(0);
    expect(c.hitDiceRemaining).toBe('6d6');
  });
})
