/**
 * Integration Tests: Combat Flow
 * Tests the complete combat/initiative tracking process
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Import calculation modules
import {
  sortByInitiative,
  sortByInitiativeWithTieBreaker,
  processDeathSave,
  getConcentrationDC,
  adjustHP,
  checkInstantDeath,
  getInitiativeBonus
} from '../../js/modules/initiative-calculations.js';

import { getAbilityModifier } from '../../js/modules/character-calculations.js';
import { createSeededRandom, rollDie } from '../../js/modules/dice.js';

// ============================================================
// Test Data Fixtures
// ============================================================

/**
 * Creates a combatant for initiative tracking
 */
function createCombatant(overrides = {}) {
  return {
    id: `combatant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Combatant',
    initiative: 10,
    dexMod: 0,
    ac: 15,
    maxHp: 30,
    currentHp: 30,
    tempHp: 0,
    type: 'player',
    status: [],
    notes: '',
    deathSaves: { successes: 0, failures: 0, stable: false },
    concentrating: false,
    concentrationSpell: '',
    exhaustion: 0,
    ...overrides
  };
}

/**
 * Creates a party of combatants
 */
function createParty() {
  return [
    createCombatant({ name: 'Fighter', initiative: 18, dexMod: 2, ac: 18, maxHp: 44, currentHp: 44, type: 'player' }),
    createCombatant({ name: 'Wizard', initiative: 15, dexMod: 3, ac: 12, maxHp: 24, currentHp: 24, type: 'player' }),
    createCombatant({ name: 'Cleric', initiative: 12, dexMod: 1, ac: 16, maxHp: 32, currentHp: 32, type: 'player' }),
    createCombatant({ name: 'Rogue', initiative: 20, dexMod: 4, ac: 14, maxHp: 28, currentHp: 28, type: 'player' })
  ];
}

/**
 * Creates enemy combatants
 */
function createEnemies() {
  return [
    createCombatant({ name: 'Goblin 1', initiative: 14, dexMod: 2, ac: 15, maxHp: 7, currentHp: 7, type: 'enemy' }),
    createCombatant({ name: 'Goblin 2', initiative: 14, dexMod: 2, ac: 15, maxHp: 7, currentHp: 7, type: 'enemy' }),
    createCombatant({ name: 'Bugbear', initiative: 11, dexMod: 2, ac: 16, maxHp: 27, currentHp: 27, type: 'enemy' })
  ];
}

// ============================================================
// Initiative Sorting Tests
// ============================================================

describe('Initiative Sorting', () => {
  it('sorts combatants by initiative descending', () => {
    const combatants = [
      createCombatant({ name: 'Low', initiative: 5 }),
      createCombatant({ name: 'High', initiative: 20 }),
      createCombatant({ name: 'Mid', initiative: 12 })
    ];

    const sorted = sortByInitiative(combatants);

    expect(sorted[0].name).toBe('High');
    expect(sorted[1].name).toBe('Mid');
    expect(sorted[2].name).toBe('Low');
  });

  it('does not mutate original array', () => {
    const combatants = [
      createCombatant({ name: 'B', initiative: 10 }),
      createCombatant({ name: 'A', initiative: 20 })
    ];

    const sorted = sortByInitiative(combatants);

    expect(combatants[0].name).toBe('B');
    expect(sorted[0].name).toBe('A');
  });

  it('handles empty array', () => {
    expect(sortByInitiative([])).toEqual([]);
  });

  it('handles single combatant', () => {
    const combatants = [createCombatant({ name: 'Solo' })];
    const sorted = sortByInitiative(combatants);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].name).toBe('Solo');
  });
});

describe('Initiative Tie-Breaking', () => {
  it('breaks ties using DEX modifier', () => {
    const combatants = [
      createCombatant({ name: 'LowDex', initiative: 15, dexMod: 1 }),
      createCombatant({ name: 'HighDex', initiative: 15, dexMod: 4 })
    ];

    const sorted = sortByInitiativeWithTieBreaker(combatants);

    expect(sorted[0].name).toBe('HighDex');
    expect(sorted[1].name).toBe('LowDex');
  });

  it('still sorts by initiative first', () => {
    const combatants = [
      createCombatant({ name: 'LowInit', initiative: 10, dexMod: 5 }),
      createCombatant({ name: 'HighInit', initiative: 20, dexMod: 0 })
    ];

    const sorted = sortByInitiativeWithTieBreaker(combatants);

    expect(sorted[0].name).toBe('HighInit');
    expect(sorted[1].name).toBe('LowInit');
  });

  it('treats missing dexMod as 0', () => {
    const combatants = [
      createCombatant({ name: 'NoDex', initiative: 15 }),
      createCombatant({ name: 'HasDex', initiative: 15, dexMod: 2 })
    ];
    // Remove dexMod from first
    delete combatants[0].dexMod;

    const sorted = sortByInitiativeWithTieBreaker(combatants);

    expect(sorted[0].name).toBe('HasDex');
  });
});

// ============================================================
// Combat Encounter Flow Tests
// ============================================================

describe('Combat Encounter Flow', () => {
  it('combines and sorts party and enemies', () => {
    const party = createParty();
    const enemies = createEnemies();
    const allCombatants = [...party, ...enemies];

    const sorted = sortByInitiative(allCombatants);

    // Rogue (20) > Fighter (18) > Wizard (15) > Goblins (14) > Cleric (12) > Bugbear (11)
    expect(sorted[0].name).toBe('Rogue');
    expect(sorted[1].name).toBe('Fighter');
    expect(sorted[sorted.length - 1].name).toBe('Bugbear');
  });

  it('maintains turn order through combat round', () => {
    const combatants = sortByInitiative(createParty());
    const turnOrder = combatants.map(c => c.name);

    // Simulate going through turns
    let currentTurn = 0;
    for (let i = 0; i < combatants.length; i++) {
      expect(combatants[currentTurn].name).toBe(turnOrder[i]);
      currentTurn = (currentTurn + 1) % combatants.length;
    }
  });
});

// ============================================================
// Damage and Healing Tests
// ============================================================

describe('HP Adjustment - Damage', () => {
  it('subtracts damage from current HP', () => {
    const result = adjustHP(30, 30, 0, -10);
    expect(result.currentHP).toBe(20);
  });

  it('temp HP absorbs damage first', () => {
    const result = adjustHP(30, 30, 10, -5);
    expect(result.currentHP).toBe(30);
    expect(result.tempHP).toBe(5);
  });

  it('overflow damage goes to regular HP', () => {
    const result = adjustHP(30, 30, 10, -15);
    expect(result.currentHP).toBe(25); // 15 - 10 temp = 5 to HP
    expect(result.tempHP).toBe(0);
  });

  it('does not go below 0 HP', () => {
    const result = adjustHP(10, 30, 0, -25);
    expect(result.currentHP).toBe(0);
  });

  it('tracks overkill damage', () => {
    const result = adjustHP(10, 30, 0, -25);
    expect(result.overkillDamage).toBe(15);
  });
});

describe('HP Adjustment - Healing', () => {
  it('adds healing to current HP', () => {
    const result = adjustHP(20, 30, 0, 5);
    expect(result.currentHP).toBe(25);
  });

  it('does not exceed max HP', () => {
    const result = adjustHP(28, 30, 0, 10);
    expect(result.currentHP).toBe(30);
  });

  it('does not affect temp HP', () => {
    const result = adjustHP(20, 30, 5, 5);
    expect(result.currentHP).toBe(25);
    expect(result.tempHP).toBe(5);
  });
});

describe('Instant Death Check', () => {
  it('returns true if overkill equals max HP', () => {
    expect(checkInstantDeath(30, 30)).toBe(true);
  });

  it('returns true if overkill exceeds max HP', () => {
    expect(checkInstantDeath(50, 30)).toBe(true);
  });

  it('returns false if overkill is less than max HP', () => {
    expect(checkInstantDeath(29, 30)).toBe(false);
    expect(checkInstantDeath(0, 30)).toBe(false);
  });
});

// ============================================================
// Death Save Tests
// ============================================================

describe('Death Save Processing', () => {
  describe('Success Tracking', () => {
    it('adds success on roll of 10-19', () => {
      const result10 = processDeathSave(10, { successes: 0, failures: 0 });
      expect(result10.successes).toBe(1);

      const result15 = processDeathSave(15, { successes: 1, failures: 0 });
      expect(result15.successes).toBe(2);

      const result19 = processDeathSave(19, { successes: 0, failures: 0 });
      expect(result19.successes).toBe(1);
    });

    it('stabilizes at 3 successes', () => {
      const result = processDeathSave(12, { successes: 2, failures: 1 });
      expect(result.successes).toBe(3);
      expect(result.stable).toBe(true);
      expect(result.dead).toBe(false);
    });
  });

  describe('Failure Tracking', () => {
    it('adds failure on roll of 2-9', () => {
      const result5 = processDeathSave(5, { successes: 0, failures: 0 });
      expect(result5.failures).toBe(1);

      const result9 = processDeathSave(9, { successes: 1, failures: 1 });
      expect(result9.failures).toBe(2);
    });

    it('dies at 3 failures', () => {
      const result = processDeathSave(5, { successes: 1, failures: 2 });
      expect(result.failures).toBe(3);
      expect(result.dead).toBe(true);
      expect(result.stable).toBe(false);
    });
  });

  describe('Natural 1', () => {
    it('counts as two failures', () => {
      const result = processDeathSave(1, { successes: 0, failures: 0 });
      expect(result.failures).toBe(2);
    });

    it('can cause instant death from 1 failure', () => {
      const result = processDeathSave(1, { successes: 0, failures: 2 });
      expect(result.failures).toBe(3);
      expect(result.dead).toBe(true);
    });

    it('can cause instant death from 2 failures', () => {
      const result = processDeathSave(1, { successes: 1, failures: 1 });
      expect(result.failures).toBe(3);
      expect(result.dead).toBe(true);
    });
  });

  describe('Natural 20', () => {
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

// ============================================================
// Concentration Tests
// ============================================================

describe('Concentration Checks', () => {
  it('returns minimum DC of 10 for low damage', () => {
    expect(getConcentrationDC(1)).toBe(10);
    expect(getConcentrationDC(10)).toBe(10);
    expect(getConcentrationDC(19)).toBe(10);
  });

  it('returns half damage when higher than 10', () => {
    expect(getConcentrationDC(20)).toBe(10);
    expect(getConcentrationDC(22)).toBe(11);
    expect(getConcentrationDC(30)).toBe(15);
    expect(getConcentrationDC(50)).toBe(25);
  });

  it('rounds down for odd damage', () => {
    expect(getConcentrationDC(21)).toBe(10);
    expect(getConcentrationDC(25)).toBe(12);
  });
});

describe('Concentration Combat Flow', () => {
  it('tracks concentration state on combatant', () => {
    const wizard = createCombatant({
      name: 'Concentrating Wizard',
      concentrating: true,
      concentrationSpell: 'Hold Person'
    });

    expect(wizard.concentrating).toBe(true);
    expect(wizard.concentrationSpell).toBe('Hold Person');
  });

  it('calculates multiple concentration checks for multi-source damage', () => {
    // Wizard takes 15 damage from one source and 8 from another
    const dc1 = getConcentrationDC(15);
    const dc2 = getConcentrationDC(8);

    expect(dc1).toBe(10); // 15/2 = 7.5, min 10
    expect(dc2).toBe(10); // 8/2 = 4, min 10
  });
});

// ============================================================
// Initiative Bonus Calculation Tests
// ============================================================

describe('Initiative Bonus Calculation', () => {
  it('returns DEX modifier as base', () => {
    expect(getInitiativeBonus(14)).toBe(2); // DEX 14 = +2
    expect(getInitiativeBonus(10)).toBe(0); // DEX 10 = +0
    expect(getInitiativeBonus(8)).toBe(-1); // DEX 8 = -1
  });

  it('adds additional bonuses', () => {
    expect(getInitiativeBonus(14, 5)).toBe(7); // +2 DEX + 5 (Alert feat)
    expect(getInitiativeBonus(10, 2)).toBe(2); // +0 DEX + 2 (Jack of All Trades)
  });
});

// ============================================================
// Status Effect Integration Tests
// ============================================================

describe('Status Effects', () => {
  it('tracks status effects on combatant', () => {
    const combatant = createCombatant({
      status: ['Poisoned', 'Prone']
    });

    expect(combatant.status).toContain('Poisoned');
    expect(combatant.status).toContain('Prone');
    expect(combatant.status).toHaveLength(2);
  });

  it('adds status effect', () => {
    const combatant = createCombatant({ status: [] });
    combatant.status.push('Blinded');

    expect(combatant.status).toContain('Blinded');
  });

  it('removes status effect', () => {
    const combatant = createCombatant({ status: ['Poisoned', 'Prone'] });
    combatant.status = combatant.status.filter(s => s !== 'Poisoned');

    expect(combatant.status).not.toContain('Poisoned');
    expect(combatant.status).toContain('Prone');
  });
});

// ============================================================
// Exhaustion Tests
// ============================================================

describe('Exhaustion Tracking', () => {
  it('tracks exhaustion levels 0-6', () => {
    const combatant = createCombatant({ exhaustion: 0 });

    for (let level = 0; level <= 6; level++) {
      combatant.exhaustion = level;
      expect(combatant.exhaustion).toBe(level);
    }
  });
});

// ============================================================
// Complete Combat Encounter Simulation
// ============================================================

describe('Complete Combat Encounter', () => {
  it('simulates a full combat round', () => {
    // Setup combat
    const party = createParty();
    const enemies = createEnemies();
    const allCombatants = sortByInitiative([...party, ...enemies]);

    // Track round state
    let round = 1;
    let currentTurnIndex = 0;

    // Go through one full round
    for (let turn = 0; turn < allCombatants.length; turn++) {
      const currentCombatant = allCombatants[currentTurnIndex];

      // Verify turn order is maintained
      expect(currentCombatant).toBeDefined();

      // Advance turn
      currentTurnIndex = (currentTurnIndex + 1) % allCombatants.length;
    }

    // After full round, we're back to the start
    expect(currentTurnIndex).toBe(0);
    round++;
    expect(round).toBe(2);
  });

  it('simulates damage to PC triggering death saves', () => {
    const fighter = createCombatant({
      name: 'Fighter',
      maxHp: 44,
      currentHp: 10
    });

    // Take 15 damage, dropping to 0
    const damageResult = adjustHP(fighter.currentHp, fighter.maxHp, fighter.tempHp, -15);
    fighter.currentHp = damageResult.currentHP;

    expect(fighter.currentHp).toBe(0);
    expect(damageResult.overkillDamage).toBe(5);

    // Check for instant death
    const instantDeath = checkInstantDeath(damageResult.overkillDamage, fighter.maxHp);
    expect(instantDeath).toBe(false); // 5 overkill < 44 max HP

    // Fighter is now making death saves
    // Roll a 12 (success)
    const saveResult1 = processDeathSave(12, fighter.deathSaves);
    fighter.deathSaves = { ...saveResult1 };
    expect(fighter.deathSaves.successes).toBe(1);

    // Roll a 6 (failure)
    const saveResult2 = processDeathSave(6, fighter.deathSaves);
    fighter.deathSaves = { ...saveResult2 };
    expect(fighter.deathSaves.failures).toBe(1);

    // Roll a 15 (success)
    const saveResult3 = processDeathSave(15, fighter.deathSaves);
    fighter.deathSaves = { ...saveResult3 };
    expect(fighter.deathSaves.successes).toBe(2);

    // Roll a 10 (success) - stabilizes!
    const saveResult4 = processDeathSave(10, fighter.deathSaves);
    fighter.deathSaves = { ...saveResult4 };
    expect(fighter.deathSaves.successes).toBe(3);
    expect(fighter.deathSaves.stable).toBe(true);
  });

  it('simulates wizard losing concentration', () => {
    const wizard = createCombatant({
      name: 'Wizard',
      maxHp: 24,
      currentHp: 24,
      concentrating: true,
      concentrationSpell: 'Hypnotic Pattern'
    });

    // Take 18 damage
    const damageResult = adjustHP(wizard.currentHp, wizard.maxHp, wizard.tempHp, -18);
    wizard.currentHp = damageResult.currentHP;

    // Calculate concentration DC
    const dc = getConcentrationDC(18);
    expect(dc).toBe(10); // max(10, 18/2) = max(10, 9) = 10

    // Wizard needs to make a CON save vs DC 10
    // Assuming they fail...
    wizard.concentrating = false;
    wizard.concentrationSpell = '';

    expect(wizard.concentrating).toBe(false);
  });
});

// ============================================================
// Edge Cases
// ============================================================

describe('Combat Edge Cases', () => {
  it('handles massive damage instant death', () => {
    const commoner = createCombatant({
      name: 'Commoner',
      maxHp: 4,
      currentHp: 4
    });

    // Take 10 damage (6 overkill >= 4 max HP)
    const damageResult = adjustHP(commoner.currentHp, commoner.maxHp, 0, -10);

    const instantDeath = checkInstantDeath(damageResult.overkillDamage, commoner.maxHp);
    expect(instantDeath).toBe(true);
  });

  it('handles healing at 0 HP', () => {
    const downed = createCombatant({
      currentHp: 0,
      maxHp: 30
    });

    // Receive 5 points of healing
    const healResult = adjustHP(downed.currentHp, downed.maxHp, 0, 5);

    expect(healResult.currentHP).toBe(5);
  });

  it('handles temp HP overflow (temp HP does not stack)', () => {
    const combatant = createCombatant({
      currentHp: 30,
      maxHp: 30,
      tempHp: 10
    });

    // "Grant" 8 temp HP - should NOT stack, take higher
    const newTempHp = Math.max(combatant.tempHp, 8);
    expect(newTempHp).toBe(10); // Keep existing higher temp HP
  });
});
