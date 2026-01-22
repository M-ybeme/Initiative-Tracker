import { describe, it, expect } from 'vitest';
import {
  sortByInitiative,
  sortByInitiativeWithTieBreaker,
  processDeathSave,
  getConcentrationDC,
  adjustHP,
  checkInstantDeath,
  getInitiativeBonus
} from '../../js/modules/initiative-calculations.js';

describe('sortByInitiative', () => {
  it('sorts combatants in descending order by initiative', () => {
    const combatants = [
      { name: 'Goblin', initiative: 12 },
      { name: 'Fighter', initiative: 18 },
      { name: 'Wizard', initiative: 8 }
    ];
    const sorted = sortByInitiative(combatants);
    expect(sorted[0].name).toBe('Fighter');
    expect(sorted[1].name).toBe('Goblin');
    expect(sorted[2].name).toBe('Wizard');
  });

  it('does not mutate the original array', () => {
    const combatants = [
      { name: 'A', initiative: 5 },
      { name: 'B', initiative: 10 }
    ];
    const sorted = sortByInitiative(combatants);
    expect(combatants[0].name).toBe('A');
    expect(sorted[0].name).toBe('B');
  });

  it('handles empty array', () => {
    expect(sortByInitiative([])).toEqual([]);
  });

  it('handles single combatant', () => {
    const combatants = [{ name: 'Solo', initiative: 15 }];
    expect(sortByInitiative(combatants)).toEqual(combatants);
  });
});

describe('sortByInitiativeWithTieBreaker', () => {
  it('uses DEX modifier as tie-breaker', () => {
    const combatants = [
      { name: 'LowDex', initiative: 15, dexMod: 1 },
      { name: 'HighDex', initiative: 15, dexMod: 3 }
    ];
    const sorted = sortByInitiativeWithTieBreaker(combatants);
    expect(sorted[0].name).toBe('HighDex');
    expect(sorted[1].name).toBe('LowDex');
  });

  it('still sorts by initiative first', () => {
    const combatants = [
      { name: 'Low', initiative: 10, dexMod: 5 },
      { name: 'High', initiative: 20, dexMod: 0 }
    ];
    const sorted = sortByInitiativeWithTieBreaker(combatants);
    expect(sorted[0].name).toBe('High');
  });

  it('handles missing dexMod by treating as 0', () => {
    const combatants = [
      { name: 'NoDex', initiative: 15 },
      { name: 'HasDex', initiative: 15, dexMod: 2 }
    ];
    const sorted = sortByInitiativeWithTieBreaker(combatants);
    expect(sorted[0].name).toBe('HasDex');
  });
});

describe('processDeathSave', () => {
  describe('success tracking', () => {
    it('adds success on roll of 10-19', () => {
      const result = processDeathSave(10, { successes: 0, failures: 0 });
      expect(result.successes).toBe(1);
      expect(result.failures).toBe(0);

      const result2 = processDeathSave(15, { successes: 1, failures: 0 });
      expect(result2.successes).toBe(2);
    });

    it('stabilizes at 3 successes', () => {
      const result = processDeathSave(12, { successes: 2, failures: 1 });
      expect(result.successes).toBe(3);
      expect(result.stable).toBe(true);
      expect(result.dead).toBe(false);
    });
  });

  describe('failure tracking', () => {
    it('adds failure on roll of 2-9', () => {
      const result = processDeathSave(5, { successes: 0, failures: 0 });
      expect(result.failures).toBe(1);
      expect(result.successes).toBe(0);
    });

    it('dies at 3 failures', () => {
      const result = processDeathSave(5, { successes: 1, failures: 2 });
      expect(result.failures).toBe(3);
      expect(result.dead).toBe(true);
      expect(result.stable).toBe(false);
    });
  });

  describe('natural 1', () => {
    it('counts as two failures', () => {
      const result = processDeathSave(1, { successes: 0, failures: 0 });
      expect(result.failures).toBe(2);
    });

    it('can cause instant death from 1 failure', () => {
      const result = processDeathSave(1, { successes: 0, failures: 2 });
      expect(result.failures).toBe(3);
      expect(result.dead).toBe(true);
    });
  });

  describe('natural 20', () => {
    it('regains 1 HP and resets saves', () => {
      const result = processDeathSave(20, { successes: 1, failures: 2 });
      expect(result.regainedHP).toBe(1);
      expect(result.successes).toBe(0);
      expect(result.failures).toBe(0);
      expect(result.stable).toBe(true);
    });
  });

  it('handles default empty saves', () => {
    const result = processDeathSave(15);
    expect(result.successes).toBe(1);
    expect(result.failures).toBe(0);
  });
});

describe('getConcentrationDC', () => {
  it('returns minimum DC of 10', () => {
    expect(getConcentrationDC(1)).toBe(10);
    expect(getConcentrationDC(10)).toBe(10);
    expect(getConcentrationDC(19)).toBe(10);
  });

  it('returns half damage when higher than 10', () => {
    expect(getConcentrationDC(20)).toBe(10); // 20/2 = 10
    expect(getConcentrationDC(22)).toBe(11); // 22/2 = 11
    expect(getConcentrationDC(30)).toBe(15); // 30/2 = 15
    expect(getConcentrationDC(50)).toBe(25); // 50/2 = 25
  });

  it('rounds down for odd damage', () => {
    expect(getConcentrationDC(21)).toBe(10); // 21/2 = 10.5 -> 10
    expect(getConcentrationDC(25)).toBe(12); // 25/2 = 12.5 -> 12
  });
});

describe('adjustHP', () => {
  describe('healing', () => {
    it('adds HP up to maximum', () => {
      const result = adjustHP(20, 50, 0, 10);
      expect(result.currentHP).toBe(30);
      expect(result.tempHP).toBe(0);
    });

    it('does not exceed max HP', () => {
      const result = adjustHP(45, 50, 0, 20);
      expect(result.currentHP).toBe(50);
    });

    it('does not affect temp HP', () => {
      const result = adjustHP(20, 50, 10, 15);
      expect(result.currentHP).toBe(35);
      expect(result.tempHP).toBe(10);
    });
  });

  describe('damage', () => {
    it('subtracts HP', () => {
      const result = adjustHP(30, 50, 0, -10);
      expect(result.currentHP).toBe(20);
    });

    it('temp HP absorbs damage first', () => {
      const result = adjustHP(30, 50, 10, -5);
      expect(result.currentHP).toBe(30);
      expect(result.tempHP).toBe(5);
    });

    it('overflow damage goes to regular HP', () => {
      const result = adjustHP(30, 50, 10, -15);
      expect(result.currentHP).toBe(25); // 15 - 10 temp = 5 to HP
      expect(result.tempHP).toBe(0);
    });

    it('does not go below 0 HP', () => {
      const result = adjustHP(10, 50, 0, -20);
      expect(result.currentHP).toBe(0);
    });

    it('tracks overkill damage', () => {
      const result = adjustHP(10, 50, 0, -25);
      expect(result.currentHP).toBe(0);
      expect(result.overkillDamage).toBe(15);
    });
  });
});

describe('checkInstantDeath', () => {
  it('returns true if overkill equals or exceeds max HP', () => {
    expect(checkInstantDeath(50, 50)).toBe(true);
    expect(checkInstantDeath(60, 50)).toBe(true);
  });

  it('returns false if overkill is less than max HP', () => {
    expect(checkInstantDeath(49, 50)).toBe(false);
    expect(checkInstantDeath(0, 50)).toBe(false);
  });
});

describe('getInitiativeBonus', () => {
  it('returns DEX modifier as base', () => {
    expect(getInitiativeBonus(14)).toBe(2);
    expect(getInitiativeBonus(10)).toBe(0);
    expect(getInitiativeBonus(8)).toBe(-1);
  });

  it('adds additional bonus', () => {
    expect(getInitiativeBonus(14, 5)).toBe(7); // Alert feat
    expect(getInitiativeBonus(10, 2)).toBe(2); // Jack of All Trades at level 5
  });
});
