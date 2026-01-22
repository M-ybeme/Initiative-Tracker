/**
 * Dice Module
 * Pure functions for dice rolling and notation parsing
 * Extracted for testability
 */

/**
 * Roll a single die
 * @param {number} sides - Number of sides on the die
 * @param {function} randomFn - Random function (for testing), defaults to Math.random
 * @returns {number} - Roll result (1 to sides)
 */
export function rollDie(sides, randomFn = Math.random) {
  return Math.floor(randomFn() * sides) + 1;
}

/**
 * Parse dice notation string
 * Supports: "2d6+3", "1d20", "d8+2", "4d6kh3" (keep highest 3), "2d20kl1" (keep lowest 1)
 * @param {string} notation - Dice notation string
 * @returns {Object|null} - {count, sides, modifier, keepHighest, keepLowest} or null if invalid
 */
export function parseDiceNotation(notation) {
  if (!notation || typeof notation !== 'string') return null;

  const cleanNotation = notation.trim().replace(/\s+/g, '').toLowerCase();

  // Pattern: optional count, 'd', sides, optional keep (kh/kl + number), optional modifier
  const match = cleanNotation.match(/^(\d*)d(\d+)(?:k(h|l)(\d+))?([+-]\d+)?$/);
  if (!match) return null;

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const keepDirection = match[3]; // 'h' or 'l' or undefined
  const keepCount = match[4] ? parseInt(match[4], 10) : null;
  const modifier = match[5] ? parseInt(match[5], 10) : 0;

  if (count <= 0 || sides <= 0) return null;
  if (keepCount !== null && (keepCount <= 0 || keepCount > count)) return null;

  return {
    count,
    sides,
    modifier,
    keepHighest: keepDirection === 'h' ? keepCount : null,
    keepLowest: keepDirection === 'l' ? keepCount : null
  };
}

/**
 * Roll dice based on parsed notation
 * @param {number} count - Number of dice
 * @param {number} sides - Sides per die
 * @param {function} randomFn - Random function (for testing)
 * @returns {number[]} - Array of roll results
 */
export function rollMultipleDice(count, sides, randomFn = Math.random) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides, randomFn));
  }
  return rolls;
}

/**
 * Roll dice from notation string
 * @param {string} notation - Dice notation (e.g., "2d6+3")
 * @param {function} randomFn - Random function (for testing)
 * @returns {Object|null} - {rolls, kept, modifier, total, notation} or null if invalid
 */
export function rollDiceNotation(notation, randomFn = Math.random) {
  const parsed = parseDiceNotation(notation);
  if (!parsed) return null;

  const { count, sides, modifier, keepHighest, keepLowest } = parsed;
  const rolls = rollMultipleDice(count, sides, randomFn);

  let kept = [...rolls];

  if (keepHighest) {
    kept = [...rolls].sort((a, b) => b - a).slice(0, keepHighest);
  } else if (keepLowest) {
    kept = [...rolls].sort((a, b) => a - b).slice(0, keepLowest);
  }

  const subtotal = kept.reduce((sum, r) => sum + r, 0);
  const total = subtotal + modifier;

  return {
    notation,
    rolls,
    kept,
    modifier,
    total,
    isCritical: sides === 20 && kept.includes(20),
    isFumble: sides === 20 && kept.includes(1)
  };
}

/**
 * Roll with advantage (2d20, keep highest)
 * @param {number} bonus - Modifier to add
 * @param {function} randomFn - Random function (for testing)
 * @returns {Object} - {rolls, chosen, bonus, total}
 */
export function rollWithAdvantage(bonus = 0, randomFn = Math.random) {
  const roll1 = rollDie(20, randomFn);
  const roll2 = rollDie(20, randomFn);
  const chosen = Math.max(roll1, roll2);

  return {
    rolls: [roll1, roll2],
    chosen,
    bonus,
    total: chosen + bonus,
    isCritical: chosen === 20,
    isFumble: chosen === 1
  };
}

/**
 * Roll with disadvantage (2d20, keep lowest)
 * @param {number} bonus - Modifier to add
 * @param {function} randomFn - Random function (for testing)
 * @returns {Object} - {rolls, chosen, bonus, total}
 */
export function rollWithDisadvantage(bonus = 0, randomFn = Math.random) {
  const roll1 = rollDie(20, randomFn);
  const roll2 = rollDie(20, randomFn);
  const chosen = Math.min(roll1, roll2);

  return {
    rolls: [roll1, roll2],
    chosen,
    bonus,
    total: chosen + bonus,
    isCritical: chosen === 20,
    isFumble: chosen === 1
  };
}

/**
 * Roll 4d6 drop lowest (standard ability score generation)
 * @param {function} randomFn - Random function (for testing)
 * @returns {Object} - {rolls, dropped, kept, total}
 */
export function rollAbilityScore(randomFn = Math.random) {
  const rolls = rollMultipleDice(4, 6, randomFn);
  const sorted = [...rolls].sort((a, b) => a - b);
  const dropped = sorted[0];
  const kept = sorted.slice(1);
  const total = kept.reduce((sum, r) => sum + r, 0);

  return {
    rolls,
    dropped,
    kept,
    total
  };
}

/**
 * Generate a full set of ability scores (6 scores using 4d6 drop lowest)
 * @param {function} randomFn - Random function (for testing)
 * @returns {number[]} - Array of 6 ability scores
 */
export function rollAbilityScoreSet(randomFn = Math.random) {
  const scores = [];
  for (let i = 0; i < 6; i++) {
    scores.push(rollAbilityScore(randomFn).total);
  }
  return scores;
}

/**
 * Create a seeded random function for deterministic testing
 * Simple linear congruential generator
 * @param {number} seed - Seed value
 * @returns {function} - Seeded random function
 */
export function createSeededRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}
