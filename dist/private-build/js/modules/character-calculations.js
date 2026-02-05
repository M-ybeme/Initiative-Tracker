/**
 * Character Calculations Module
 * Pure functions for D&D 5e character calculations
 * Extracted for testability
 */

/**
 * Calculate ability modifier from ability score
 * @param {number} score - Ability score (1-30)
 * @returns {number} - Ability modifier
 */
export function getAbilityModifier(score) {
  const n = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.floor((n - 10) / 2);
}

/**
 * Calculate proficiency bonus from character level
 * @param {number} level - Character level (1-20)
 * @returns {number} - Proficiency bonus (2-6)
 */
export function getProficiencyBonus(level) {
  const lv = Number(level) || 1;
  if (lv >= 17) return 6;
  if (lv >= 13) return 5;
  if (lv >= 9) return 4;
  if (lv >= 5) return 3;
  return 2;
}

/**
 * Calculate skill bonus
 * @param {number} abilityScore - The relevant ability score
 * @param {boolean} proficient - Whether proficient in the skill
 * @param {number} level - Character level
 * @param {boolean} expertise - Whether has expertise (double proficiency)
 * @returns {number} - Total skill bonus
 */
export function getSkillBonus(abilityScore, proficient, level, expertise = false) {
  const abilityMod = getAbilityModifier(abilityScore);
  if (!proficient) return abilityMod;

  const profBonus = getProficiencyBonus(level);
  return abilityMod + (expertise ? profBonus * 2 : profBonus);
}

/**
 * Calculate passive perception
 * @param {number} wisdomScore - Wisdom ability score
 * @param {boolean} proficient - Whether proficient in Perception
 * @param {number} level - Character level
 * @param {boolean} expertise - Whether has expertise
 * @returns {number} - Passive perception value
 */
export function getPassivePerception(wisdomScore, proficient, level, expertise = false) {
  return 10 + getSkillBonus(wisdomScore, proficient, level, expertise);
}

/**
 * Calculate AC for unarmored defense (Barbarian)
 * @param {number} dexScore - Dexterity score
 * @param {number} conScore - Constitution score
 * @param {boolean} hasShield - Whether using a shield (+2)
 * @returns {number} - Armor class
 */
export function getBarbarianUnarmoredAC(dexScore, conScore, hasShield = false) {
  const dexMod = getAbilityModifier(dexScore);
  const conMod = getAbilityModifier(conScore);
  return 10 + dexMod + conMod + (hasShield ? 2 : 0);
}

/**
 * Calculate AC for unarmored defense (Monk)
 * @param {number} dexScore - Dexterity score
 * @param {number} wisScore - Wisdom score
 * @returns {number} - Armor class
 */
export function getMonkUnarmoredAC(dexScore, wisScore) {
  const dexMod = getAbilityModifier(dexScore);
  const wisMod = getAbilityModifier(wisScore);
  return 10 + dexMod + wisMod;
}

/**
 * Calculate AC with armor
 * @param {string} armorType - 'light', 'medium', 'heavy'
 * @param {number} baseAC - Base AC of the armor
 * @param {number} dexScore - Dexterity score
 * @param {boolean} hasShield - Whether using a shield (+2)
 * @returns {number} - Armor class
 */
export function getArmoredAC(armorType, baseAC, dexScore, hasShield = false) {
  const dexMod = getAbilityModifier(dexScore);
  let ac = baseAC;

  if (armorType === 'light') {
    ac += dexMod;
  } else if (armorType === 'medium') {
    ac += Math.min(dexMod, 2); // Max +2 DEX for medium armor
  }
  // Heavy armor gets no DEX bonus

  return ac + (hasShield ? 2 : 0);
}

/**
 * Calculate HP at level 1
 * @param {number} hitDie - Hit die size (e.g., 10 for d10)
 * @param {number} conScore - Constitution score
 * @returns {number} - Maximum HP at level 1
 */
export function getLevel1HP(hitDie, conScore) {
  const conMod = getAbilityModifier(conScore);
  return hitDie + conMod;
}

/**
 * Calculate HP gained on level up (using average)
 * @param {number} hitDie - Hit die size
 * @param {number} conScore - Constitution score
 * @returns {number} - HP gained on level up
 */
export function getLevelUpHP(hitDie, conScore) {
  const conMod = getAbilityModifier(conScore);
  const avgRoll = Math.floor(hitDie / 2) + 1; // Average roll rounded up
  return Math.max(1, avgRoll + conMod); // Minimum 1 HP per level
}

/**
 * Calculate total HP for a single-class character
 * @param {number} hitDie - Hit die size
 * @param {number} level - Character level
 * @param {number} conScore - Constitution score
 * @returns {number} - Total maximum HP
 */
export function getTotalHP(hitDie, level, conScore) {
  if (level <= 0) return 0;
  const level1HP = getLevel1HP(hitDie, conScore);
  const levelUpHP = getLevelUpHP(hitDie, conScore);
  return level1HP + (levelUpHP * (level - 1));
}

/**
 * Calculate total HP for a multiclass character
 * @param {Array} classes - Array of {hitDie, level} objects
 * @param {number} conScore - Constitution score
 * @returns {number} - Total maximum HP
 */
export function getMulticlassHP(classes, conScore) {
  if (!classes || classes.length === 0) return 0;

  const conMod = getAbilityModifier(conScore);
  let totalHP = 0;
  let isFirstClass = true;

  for (const cls of classes) {
    const { hitDie, level } = cls;
    if (level <= 0) continue;

    if (isFirstClass) {
      // First class, first level gets max hit die
      totalHP += hitDie + conMod;
      // Remaining levels of first class
      const avgRoll = Math.floor(hitDie / 2) + 1;
      totalHP += Math.max(1, avgRoll + conMod) * (level - 1);
      isFirstClass = false;
    } else {
      // Subsequent classes use average for all levels
      const avgRoll = Math.floor(hitDie / 2) + 1;
      totalHP += Math.max(1, avgRoll + conMod) * level;
    }
  }

  return totalHP;
}
