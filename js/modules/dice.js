/**
 * Dice module: the ES-module entry point to the dice engine.
 *
 * The implementation lives in ./dice-engine.js, written as a classic script so pages that cannot
 * `import` (initiative.html, the classic scripts on characters.html) share it. This file only
 * republishes it as named exports for ES modules and tests. It contains no dice logic.
 * See dice-engine.js for what each function does.
 */
import './dice-engine.js';

const engine = globalThis.DiceEngine;

export const {
  MAX_DICE_COUNT,
  MAX_DIE_SIDES,
  MAX_DICE_NOTATION_LENGTH,
  rollDie,
  rollMultipleDice,
  parseDiceNotation,
  rollDiceNotation,
  parseDiceExpression,
  rollDiceExpression,
  rollD20,
  describeFeatureRoll,
  getCriticalHitNotation,
  rollHitDice,
  rollAbilityScore,
  rollAbilityScoreSet,
  createSeededRandom
} = engine;
