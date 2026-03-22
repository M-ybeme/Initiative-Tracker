/**
 * Character XP Module
 *
 * Pure functions for XP tracking, level-from-XP lookup, and XP progress
 * calculation. No DOM access, no side effects, no global state.
 */

/** Standard 5e XP thresholds for levels 1-20. Index 0 = level 1. */
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

/**
 * Get the XP required to reach a given level.
 * Clamps to levels 1-20.
 * @param {number} level
 * @returns {number}
 */
export function getXPForLevel(level) {
  const lv = Math.min(Math.max(Math.floor(level) || 1, 1), 20);
  return XP_THRESHOLDS[lv - 1];
}

/**
 * Derive character level from total XP earned.
 * Returns 1-20.
 * @param {number} xp
 * @returns {number}
 */
export function getLevelFromXP(xp) {
  const amount = Math.max(0, Math.floor(xp) || 0);
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (amount >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

/**
 * Get XP progress information for a character at a given level.
 * @param {number} xp           - current total XP
 * @param {number} currentLevel - character's current level (1-20)
 * @returns {{
 *   currentLvlXP: number,
 *   nextLvlXP: number|null,
 *   xpToNext: number,
 *   pct: number,
 *   canLevelUp: boolean,
 *   atMax: boolean
 * }}
 */
export function getXPProgressInfo(xp, currentLevel) {
  const amount = Math.max(0, Math.floor(xp) || 0);
  const lvl = Math.min(Math.max(Math.floor(currentLevel) || 1, 1), 20);
  const currentLvlXP = XP_THRESHOLDS[lvl - 1];
  const nextLvlXP = lvl < 20 ? XP_THRESHOLDS[lvl] : null;

  if (!nextLvlXP) {
    return { currentLvlXP, nextLvlXP: null, xpToNext: 0, pct: 100, canLevelUp: false, atMax: true };
  }

  const range = nextLvlXP - currentLvlXP;
  const progress = Math.max(0, amount - currentLvlXP);
  const pct = Math.min(100, Math.round((progress / range) * 100));
  const canLevelUp = amount >= nextLvlXP;
  const xpToNext = Math.max(0, nextLvlXP - amount);

  return { currentLvlXP, nextLvlXP, xpToNext, pct, canLevelUp, atMax: false };
}
