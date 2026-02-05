/**
 * Spell Utilities Module
 * Pure functions for spell slot management and spell filtering
 * Extracted for testability
 */

/**
 * Full caster spell slot progression (Wizard, Cleric, Druid, Bard, Sorcerer)
 * Index is level (1-20), value is array of slots [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
 */
export const FULL_CASTER_SLOTS = {
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
 * Warlock Pact Magic progression
 * {slots: number of slots, level: spell slot level}
 */
export const PACT_MAGIC_SLOTS = {
  1:  { slots: 1, level: 1 },
  2:  { slots: 2, level: 1 },
  3:  { slots: 2, level: 2 },
  4:  { slots: 2, level: 2 },
  5:  { slots: 2, level: 3 },
  6:  { slots: 2, level: 3 },
  7:  { slots: 2, level: 4 },
  8:  { slots: 2, level: 4 },
  9:  { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 }
};

/**
 * Use a spell slot, returning updated slot counts
 * @param {number[]} currentSlots - Current slots [1st, 2nd, ..., 9th]
 * @param {number} level - Spell level to use (1-9)
 * @returns {Object} - {success: boolean, slots: number[], message: string}
 */
export function useSpellSlot(currentSlots, level) {
  if (level < 1 || level > 9) {
    return { success: false, slots: currentSlots, message: 'Invalid spell level' };
  }

  const index = level - 1;
  if (currentSlots[index] <= 0) {
    return { success: false, slots: currentSlots, message: `No ${level}${getOrdinalSuffix(level)} level slots remaining` };
  }

  const newSlots = [...currentSlots];
  newSlots[index] -= 1;
  return { success: true, slots: newSlots, message: `Used ${level}${getOrdinalSuffix(level)} level slot` };
}

/**
 * Restore a spell slot
 * @param {number[]} currentSlots - Current slots
 * @param {number[]} maxSlots - Maximum slots
 * @param {number} level - Spell level to restore (1-9)
 * @returns {Object} - {success: boolean, slots: number[], message: string}
 */
export function restoreSpellSlot(currentSlots, maxSlots, level) {
  if (level < 1 || level > 9) {
    return { success: false, slots: currentSlots, message: 'Invalid spell level' };
  }

  const index = level - 1;
  if (currentSlots[index] >= maxSlots[index]) {
    return { success: false, slots: currentSlots, message: 'Slot already at maximum' };
  }

  const newSlots = [...currentSlots];
  newSlots[index] += 1;
  return { success: true, slots: newSlots, message: `Restored ${level}${getOrdinalSuffix(level)} level slot` };
}

/**
 * Restore all spell slots to maximum
 * @param {number[]} maxSlots - Maximum slots
 * @returns {number[]} - Fully restored slots
 */
export function restoreAllSpellSlots(maxSlots) {
  return [...maxSlots];
}

/**
 * Filter spells by class
 * @param {Object[]} spells - Array of spell objects with 'classes' property
 * @param {string} className - Class to filter by
 * @returns {Object[]} - Filtered spells
 */
export function filterSpellsByClass(spells, className) {
  return spells.filter(spell =>
    spell.classes && spell.classes.includes(className)
  );
}

/**
 * Filter spells by level
 * @param {Object[]} spells - Array of spell objects with 'level' property
 * @param {number} level - Spell level (0 for cantrips, 1-9 for leveled)
 * @returns {Object[]} - Filtered spells
 */
export function filterSpellsByLevel(spells, level) {
  return spells.filter(spell => spell.level === level);
}

/**
 * Filter spells by school
 * @param {Object[]} spells - Array of spell objects with 'school' property
 * @param {string} school - School of magic
 * @returns {Object[]} - Filtered spells
 */
export function filterSpellsBySchool(spells, school) {
  return spells.filter(spell =>
    spell.school && spell.school.toLowerCase() === school.toLowerCase()
  );
}

/**
 * Check if a spell can be cast as a ritual
 * @param {Object} spell - Spell object with 'ritual' property
 * @param {string} casterClass - Class of the caster
 * @returns {boolean} - True if can be cast as ritual
 */
export function canCastAsRitual(spell, casterClass) {
  if (!spell.ritual) return false;

  // Classes that can cast ritual spells without preparation
  const ritualCasters = ['Wizard', 'Bard', 'Cleric', 'Druid'];

  // Wizard can cast any ritual spell in their spellbook
  // Other ritual casters must have the spell prepared
  return ritualCasters.includes(casterClass);
}

/**
 * Check if a spell requires concentration
 * @param {Object} spell - Spell object
 * @returns {boolean} - True if concentration spell
 */
export function isConcentrationSpell(spell) {
  if (spell.concentration === true) return true;
  if (typeof spell.duration === 'string') {
    return spell.duration.toLowerCase().includes('concentration');
  }
  return false;
}

/**
 * Get the highest spell level a class can cast at a given level
 * @param {string} className - Class name
 * @param {number} classLevel - Level in that class
 * @returns {number} - Maximum spell level (0-9)
 */
export function getMaxSpellLevel(className, classLevel) {
  // Non-casters
  if (['Barbarian', 'Fighter', 'Monk', 'Rogue'].includes(className)) {
    return 0;
  }

  // Full casters: gain access at odd levels (1, 3, 5, 7, 9, 11, 13, 15, 17)
  if (['Wizard', 'Cleric', 'Druid', 'Bard', 'Sorcerer'].includes(className)) {
    if (classLevel >= 17) return 9;
    if (classLevel >= 15) return 8;
    if (classLevel >= 13) return 7;
    if (classLevel >= 11) return 6;
    if (classLevel >= 9) return 5;
    if (classLevel >= 7) return 4;
    if (classLevel >= 5) return 3;
    if (classLevel >= 3) return 2;
    if (classLevel >= 1) return 1;
    return 0;
  }

  // Half casters (Paladin, Ranger): start at 2, max at 5th level spells
  if (['Paladin', 'Ranger'].includes(className)) {
    if (classLevel >= 17) return 5;
    if (classLevel >= 13) return 4;
    if (classLevel >= 9) return 3;
    if (classLevel >= 5) return 2;
    if (classLevel >= 2) return 1;
    return 0;
  }

  // Warlock: Pact Magic maxes at 5th level
  if (className === 'Warlock') {
    if (classLevel >= 9) return 5;
    if (classLevel >= 7) return 4;
    if (classLevel >= 5) return 3;
    if (classLevel >= 3) return 2;
    if (classLevel >= 1) return 1;
    return 0;
  }

  // Artificer: half caster but rounds up
  if (className === 'Artificer') {
    if (classLevel >= 17) return 5;
    if (classLevel >= 13) return 4;
    if (classLevel >= 9) return 3;
    if (classLevel >= 5) return 2;
    if (classLevel >= 1) return 1;
    return 0;
  }

  return 0;
}

/**
 * Get ordinal suffix for a number
 * @param {number} n - Number
 * @returns {string} - Ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
