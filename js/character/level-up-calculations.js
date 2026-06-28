/**
 * Level-Up Calculations Module
 * Pure functions for level-up and multiclass calculations
 * Extracted for testability
 */

/**
 * Multiclass ability score prerequisites
 */
export const MULTICLASS_PREREQUISITES = {
  Barbarian: { str: 13 },
  Bard: { cha: 13 },
  Cleric: { wis: 13 },
  Druid: { wis: 13 },
  Fighter: { str: 13, dex: 13 }, // Either STR or DEX 13
  Monk: { dex: 13, wis: 13 },
  Paladin: { str: 13, cha: 13 },
  Ranger: { dex: 13, wis: 13 },
  Rogue: { dex: 13 },
  Sorcerer: { cha: 13 },
  Warlock: { cha: 13 },
  Wizard: { int: 13 },
  Artificer: { int: 13 }
};

/**
 * Caster type for each class (for multiclass spell slot calculation)
 */
export const CASTER_TYPES = {
  // Full casters (level = caster level)
  Bard: 'full',
  Cleric: 'full',
  Druid: 'full',
  Sorcerer: 'full',
  Wizard: 'full',
  // Half casters (level / 2, rounded down)
  Paladin: 'half',
  Ranger: 'half',
  // Third casters (level / 3, rounded down) - handled via subclass
  Fighter: 'none', // Eldritch Knight is third
  Rogue: 'none',   // Arcane Trickster is third
  // Special
  Artificer: 'artificer', // Rounds up
  Warlock: 'pact'         // Separate pact magic
};

/**
 * Multiclass spell slot table (PHB)
 */
export const MULTICLASS_SPELL_SLOTS = {
  1:  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  2:  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  3:  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  4:  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  5:  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  6:  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  7:  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  8:  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  9:  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
};

/**
 * Check if a character can multiclass into a new class
 * @param {Object} currentAbilities - {str, dex, con, int, wis, cha}
 * @param {string} newClass - Class name to multiclass into
 * @param {Array} currentClasses - Array of current class names
 * @returns {Object} - {canMulticlass: boolean, missingRequirements: string[]}
 */
export function canMulticlass(currentAbilities, newClass, currentClasses = []) {
  const prereqs = MULTICLASS_PREREQUISITES[newClass];
  if (!prereqs) {
    return { canMulticlass: true, missingRequirements: [] };
  }

  const missing = [];

  // Fighter has OR requirement (STR 13 OR DEX 13)
  if (newClass === 'Fighter') {
    if ((currentAbilities.str || 0) < 13 && (currentAbilities.dex || 0) < 13) {
      missing.push('STR 13 or DEX 13');
    }
  } else {
    for (const [ability, required] of Object.entries(prereqs)) {
      if ((currentAbilities[ability] || 0) < required) {
        missing.push(`${ability.toUpperCase()} ${required}`);
      }
    }
  }

  // Also need to meet requirements of current class to multiclass OUT
  for (const currentClass of currentClasses) {
    const currentPrereqs = MULTICLASS_PREREQUISITES[currentClass];
    if (!currentPrereqs) continue;

    if (currentClass === 'Fighter') {
      if ((currentAbilities.str || 0) < 13 && (currentAbilities.dex || 0) < 13) {
        missing.push(`STR 13 or DEX 13 (to leave ${currentClass})`);
      }
    } else {
      for (const [ability, required] of Object.entries(currentPrereqs)) {
        if ((currentAbilities[ability] || 0) < required) {
          missing.push(`${ability.toUpperCase()} ${required} (to leave ${currentClass})`);
        }
      }
    }
  }

  return {
    canMulticlass: missing.length === 0,
    missingRequirements: missing
  };
}

/**
 * Calculate effective caster level for multiclass spell slots
 * @param {Array} classes - Array of {className, level, subclass}
 * @returns {number} - Effective caster level
 */
export function getCasterLevel(classes) {
  let effectiveLevel = 0;

  for (const cls of classes) {
    const { className, level, subclass } = cls;

    // Skip non-casters and Warlock (uses Pact Magic)
    if (className === 'Warlock') continue;

    // Full casters
    if (['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'].includes(className)) {
      effectiveLevel += level;
      continue;
    }

    // Half casters (round down)
    if (['Paladin', 'Ranger'].includes(className)) {
      effectiveLevel += Math.floor(level / 2);
      continue;
    }

    // Artificer (rounds up)
    if (className === 'Artificer') {
      effectiveLevel += Math.ceil(level / 2);
      continue;
    }

    // Third casters via subclass
    if (subclass === 'Eldritch Knight' || subclass === 'Arcane Trickster') {
      effectiveLevel += Math.floor(level / 3);
      continue;
    }
  }

  return effectiveLevel;
}

/**
 * Get spell slots for a multiclass character
 * @param {Array} classes - Array of {className, level, subclass}
 * @returns {Array|null} - Array of spell slots [1st-9th] or null
 */
export function getSpellSlots(classes) {
  const casterLevel = getCasterLevel(classes);
  if (casterLevel === 0) return null;
  return MULTICLASS_SPELL_SLOTS[casterLevel] || null;
}

/**
 * Get number of ASIs a character has earned
 * @param {Array} classes - Array of {className, level}
 * @returns {number} - Total ASI count
 */
export function getASICount(classes) {
  let asiCount = 0;

  for (const cls of classes) {
    const { className, level } = cls;

    // Standard ASI levels: 4, 8, 12, 16, 19
    const standardASIs = [4, 8, 12, 16, 19].filter(l => level >= l).length;

    // Fighter gets extra ASIs at 6 and 14
    if (className === 'Fighter') {
      const extraASIs = [6, 14].filter(l => level >= l).length;
      asiCount += standardASIs + extraASIs;
    }
    // Rogue gets extra ASI at 10
    else if (className === 'Rogue') {
      const extraASIs = level >= 10 ? 1 : 0;
      asiCount += standardASIs + extraASIs;
    }
    else {
      asiCount += standardASIs;
    }
  }

  return asiCount;
}

/**
 * Get total character level from multiclass array
 * @param {Array} classes - Array of {className, level}
 * @returns {number} - Total level
 */
export function getTotalLevel(classes) {
  return classes.reduce((sum, cls) => sum + (cls.level || 0), 0);
}

/**
 * Get proficiency bonus from total character level
 * @param {number} totalLevel - Total character level (1-20)
 * @returns {number} - Proficiency bonus
 */
export function getProficiencyBonusFromLevel(totalLevel) {
  if (totalLevel >= 17) return 6;
  if (totalLevel >= 13) return 5;
  if (totalLevel >= 9) return 4;
  if (totalLevel >= 5) return 3;
  return 2;
}
