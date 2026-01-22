/**
 * Initiative Calculations Module
 * Pure functions for combat/initiative calculations
 * Extracted for testability
 */

/**
 * Sort combatants by initiative (descending order)
 * @param {Array} combatants - Array of combatant objects with initiative property
 * @returns {Array} - Sorted array (does not mutate original)
 */
export function sortByInitiative(combatants) {
  return [...combatants].sort((a, b) => b.initiative - a.initiative);
}

/**
 * Sort combatants with tie-breaking using DEX modifier
 * @param {Array} combatants - Array with {initiative, dexMod} properties
 * @returns {Array} - Sorted array
 */
export function sortByInitiativeWithTieBreaker(combatants) {
  return [...combatants].sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    // Tie-breaker: higher DEX mod goes first
    return (b.dexMod || 0) - (a.dexMod || 0);
  });
}

/**
 * Process a death saving throw
 * @param {number} roll - The d20 roll result (1-20)
 * @param {Object} currentSaves - {successes: number, failures: number}
 * @returns {Object} - {successes, failures, stable, dead, regainedHP}
 */
export function processDeathSave(roll, currentSaves = { successes: 0, failures: 0 }) {
  let successes = currentSaves.successes || 0;
  let failures = currentSaves.failures || 0;
  let stable = false;
  let dead = false;
  let regainedHP = 0;

  if (roll === 20) {
    // Natural 20: regain 1 HP, reset saves
    regainedHP = 1;
    successes = 0;
    failures = 0;
    stable = true;
  } else if (roll === 1) {
    // Natural 1: two failures
    failures += 2;
  } else if (roll >= 10) {
    // Success
    successes += 1;
  } else {
    // Failure
    failures += 1;
  }

  // Check for stabilization or death
  if (successes >= 3) {
    stable = true;
    successes = 3; // Cap at 3
  }
  if (failures >= 3) {
    dead = true;
    failures = 3; // Cap at 3
  }

  return { successes, failures, stable, dead, regainedHP };
}

/**
 * Calculate concentration check DC
 * DC is half damage taken, minimum 10
 * @param {number} damage - Damage taken
 * @returns {number} - Concentration DC
 */
export function getConcentrationDC(damage) {
  return Math.max(10, Math.floor(damage / 2));
}

/**
 * Adjust HP with temp HP buffer
 * @param {number} currentHP - Current hit points
 * @param {number} maxHP - Maximum hit points
 * @param {number} tempHP - Temporary hit points
 * @param {number} amount - Positive for healing, negative for damage
 * @returns {Object} - {currentHP, tempHP, overkillDamage}
 */
export function adjustHP(currentHP, maxHP, tempHP, amount) {
  let newHP = currentHP;
  let newTempHP = tempHP;
  let overkillDamage = 0;

  if (amount >= 0) {
    // Healing - doesn't affect temp HP
    newHP = Math.min(currentHP + amount, maxHP);
  } else {
    // Damage - temp HP absorbs first
    let damage = Math.abs(amount);

    if (newTempHP > 0) {
      if (damage <= newTempHP) {
        newTempHP -= damage;
        damage = 0;
      } else {
        damage -= newTempHP;
        newTempHP = 0;
      }
    }

    newHP = currentHP - damage;

    // Track overkill damage (for instant death checks)
    if (newHP < 0) {
      overkillDamage = Math.abs(newHP);
      newHP = 0;
    }
  }

  return {
    currentHP: newHP,
    tempHP: newTempHP,
    overkillDamage
  };
}

/**
 * Check for instant death (massive damage)
 * If damage exceeds max HP, character dies instantly
 * @param {number} overkillDamage - Damage beyond 0 HP
 * @param {number} maxHP - Maximum hit points
 * @returns {boolean} - True if instant death
 */
export function checkInstantDeath(overkillDamage, maxHP) {
  return overkillDamage >= maxHP;
}

/**
 * Calculate initiative bonus
 * @param {number} dexScore - Dexterity score
 * @param {number} additionalBonus - Additional bonuses (e.g., Alert feat, Jack of All Trades)
 * @returns {number} - Initiative bonus
 */
export function getInitiativeBonus(dexScore, additionalBonus = 0) {
  const dexMod = Math.floor((dexScore - 10) / 2);
  return dexMod + additionalBonus;
}
