/**
 * Hit-dice module: the ES-module entry point to the hit-dice pool engine.
 *
 * The implementation lives in ./hit-dice-engine.js, a classic script (see its header for why), which publishes
 * globalThis.HitDicePool. This file only republishes it as named exports for ES modules and tests.
 */
import './hit-dice-engine.js';

const engine = globalThis.HitDicePool;

export const { parse, format, totalDice, countOf, defaultSize, spend, add, resolveRemaining, restoreLong } = engine;
