/**
 * Dice engine: the one implementation of the app's dice rules.
 *
 * It owns dice semantics only: parsing notation, rolling, modifiers, keep-highest/lowest,
 * multi-term expressions, d20 advantage/disadvantage, Great Weapon Fighting rerolls, Savage
 * Attacker, critical-hit doubling and hit-dice healing. It knows nothing about the DOM, combat
 * logs, labels or characters; callers turn its plain results into text.
 *
 * Runtime constraint: initiative.html and the inline/classic scripts on characters.html are
 * classic scripts, so they cannot `import`. This file is therefore a classic script that
 * publishes `globalThis.DiceEngine`:
 *   - classic pages load it with <script src="/js/modules/dice-engine.js"> before their own scripts;
 *   - ES modules and tests use the named exports of ./dice.js, a thin facade over this global.
 * There is deliberately no second implementation for either side. If the file is loaded twice
 * (a classic <script> and the facade's import) the first instance wins.
 *
 * Every roll takes an optional `randomFn` (default Math.random, read at call time) so tests can
 * script the dice.
 */
(function (root) {
  'use strict';
  if (root.DiceEngine) return;

  const sum = (values) => values.reduce((a, b) => a + b, 0);

  // Safety limits. Notation comes from typed input, saved attacks and content packs, and a rolled
  // group is held in memory, so "99999999d6" would freeze the tab. Values beyond these are invalid
  // (rejected, never clamped) in every parser and in the helpers that take counts directly.
  //   MAX_DICE_COUNT / MAX_DIE_SIDES  bound one group.
  //   MAX_DICE_NOTATION_LENGTH        bounds the whole string, so many groups cannot add up to the
  //                                   same problem, and is checked before any parsing so a huge
  //                                   string is never scanned. Callers with their own text cleanup
  //                                   (Combat Mode) apply the same limit before that too.
  const MAX_DICE_COUNT = 1000;
  const MAX_DIE_SIDES = 1000000;
  const MAX_DICE_NOTATION_LENGTH = 200;

  // The one definition of a usable dice group: whole numbers, at least 1, within the limits.
  const validDice = (count, sides) =>
    Number.isInteger(count) && count >= 1 && count <= MAX_DICE_COUNT &&
    Number.isInteger(sides) && sides >= 1 && sides <= MAX_DIE_SIDES;
  const tooLong = (text) => text.length > MAX_DICE_NOTATION_LENGTH;

  /**
   * Roll one die.
   * @param {number} sides
   * @param {() => number} [randomFn]
   * @returns {number} 1..sides
   */
  function rollDie(sides, randomFn = Math.random) {
    return Math.floor(randomFn() * sides) + 1;
  }

  /**
   * Low-level and fail-loud: throws RangeError unless count and sides are both whole numbers from 1
   * up to the limits (the notation parsers validate first and return null instead).
   * @param {number} count
   * @param {number} sides
   * @param {() => number} [randomFn]
   * @returns {number[]}
   */
  function rollMultipleDice(count, sides, randomFn = Math.random) {
    if (!validDice(count, sides)) {
      throw new RangeError(`Cannot roll ${count}d${sides}: whole numbers from 1, at most ${MAX_DICE_COUNT} dice of ${MAX_DIE_SIDES} sides`);
    }
    const rolls = [];
    for (let i = 0; i < count; i++) rolls.push(rollDie(sides, randomFn));
    return rolls;
  }

  /**
   * Which dice a keep-highest / keep-lowest term keeps. Kept dice come back in ascending order.
   * Keeping all of them (or asking for no keep) leaves the dice in the order they were rolled.
   * @param {number[]} rolls
   * @param {'h'|'l'|null|undefined} direction
   * @param {number|null|undefined} count
   * @returns {number[]}
   */
  function selectKept(rolls, direction, count) {
    if (!direction || !count || count >= rolls.length) return rolls.slice();
    const ascending = rolls.slice().sort((a, b) => a - b);
    return direction === 'h' ? ascending.slice(ascending.length - count) : ascending.slice(0, count);
  }

  // One dice term: optional count, d, sides, optional keep-highest/lowest. Shared by the
  // single-notation and the multi-term parsers so the two cannot drift apart.
  const DICE_TERM = '(\\d*)d(\\d+)(?:k(h|l)(\\d+))?';
  const SINGLE_NOTATION = new RegExp('^' + DICE_TERM + '([+-]\\d+)?$');

  /**
   * Parse one dice group with an optional flat modifier: "2d6+3", "d8+2", "4d6kh3", "2d20kl1-1".
   * Whitespace and letter case are ignored. Text longer than MAX_DICE_NOTATION_LENGTH, zero dice,
   * zero sides, more than MAX_DICE_COUNT dice or MAX_DIE_SIDES sides, or keeping more dice than are
   * rolled, are invalid.
   * @param {string} notation
   * @returns {{count:number, sides:number, modifier:number, keepHighest:number|null, keepLowest:number|null}|null}
   */
  function parseDiceNotation(notation) {
    if (!notation || typeof notation !== 'string' || tooLong(notation)) return null;
    const match = notation.trim().replace(/\s+/g, '').toLowerCase().match(SINGLE_NOTATION);
    if (!match) return null;

    const count = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const keepDirection = match[3];
    const keepCount = match[4] ? parseInt(match[4], 10) : null;
    const modifier = match[5] ? parseInt(match[5], 10) : 0;

    if (!validDice(count, sides)) return null;
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
   * Roll one dice group ("2d6+3", "4d6kh3"), with the two optional weapon-feature mechanics:
   *   rerollLowDice     Great Weapon Fighting: a die showing 1 or 2 is rerolled once and the new
   *                     roll must be used.
   *   rollTwiceTakeBest Savage Attacker: roll all the dice twice and keep the set with the higher
   *                     total (the first set on a tie). Both can apply; GWF is applied to each set.
   * `twiceRoll` reports the two totals compared (without the modifier), or is null.
   * Returns null for invalid notation.
   * @param {string} notation
   * @param {() => number} [randomFn]
   * @param {{rerollLowDice?: boolean, rollTwiceTakeBest?: boolean}} [features]
   */
  function rollDiceNotation(notation, randomFn = Math.random, features = {}) {
    const parsed = parseDiceNotation(notation);
    if (!parsed) return null;
    const { count, sides, modifier, keepHighest, keepLowest } = parsed;
    const { rerollLowDice = false, rollTwiceTakeBest = false } = features || {};

    const rollSet = () => {
      const set = [];
      for (let i = 0; i < count; i++) {
        let r = rollDie(sides, randomFn);
        if (rerollLowDice && r <= 2) r = rollDie(sides, randomFn);
        set.push(r);
      }
      return set;
    };

    let rolls = rollSet();
    let twiceRoll = null;
    if (rollTwiceTakeBest) {
      const second = rollSet();
      const firstTotal = sum(rolls);
      const secondTotal = sum(second);
      if (firstTotal >= secondTotal) {
        twiceRoll = { taken: firstTotal, discarded: secondTotal };
      } else {
        twiceRoll = { taken: secondTotal, discarded: firstTotal };
        rolls = second;
      }
    }

    const kept = selectKept(rolls, keepHighest ? 'h' : keepLowest ? 'l' : null, keepHighest || keepLowest);
    return {
      notation,
      count,
      sides,
      rolls,
      kept,
      modifier,
      total: sum(kept) + modifier,
      isCritical: sides === 20 && kept.includes(20),
      isFumble: sides === 20 && kept.includes(1),
      rerollLowDice,
      rollTwiceTakeBest,
      twiceRoll
    };
  }

  /**
   * Parse an expression of several terms: "2d6+1d4+3", "1d8-1", "4d6kh3", "2d20kl1", "5".
   * Terms after the first need a leading + or -; the first may carry one. Dice terms follow the
   * same rules as parseDiceNotation. Anything else, including leftover text, is invalid.
   * @param {string} expression
   * @returns {Array<{type:'dice', sign:1|-1, count:number, sides:number, keepDir:'h'|'l'|null, keepN:number|null}|{type:'mod', n:number}>|null}
   */
  function parseDiceExpression(expression) {
    if (typeof expression !== 'string' || tooLong(expression)) return null;
    const text = expression.replace(/\s+/g, '').toLowerCase();
    if (!text) return null;

    const termRe = new RegExp('([+-]?)(?:' + DICE_TERM + '|(\\d+))', 'y');
    const terms = [];
    let index = 0;
    while (index < text.length) {
      termRe.lastIndex = index;
      const m = termRe.exec(text);
      if (!m) return null;
      if (terms.length > 0 && !m[1]) return null;
      index = termRe.lastIndex;
      const sign = m[1] === '-' ? -1 : 1;

      if (m[6] !== undefined) { // flat modifier
        terms.push({ type: 'mod', n: sign * parseInt(m[6], 10) });
        continue;
      }
      const count = m[2] ? parseInt(m[2], 10) : 1;
      const sides = parseInt(m[3], 10);
      const keepDir = m[4] || null;
      const keepN = m[5] ? parseInt(m[5], 10) : null;
      if (!validDice(count, sides)) return null;
      if (keepN !== null && (keepN <= 0 || keepN > count)) return null;
      terms.push({ type: 'dice', sign, count, sides, keepDir, keepN });
    }
    return terms;
  }

  /**
   * Roll a multi-term expression. Each dice part reports every die (`rolls`), the dice that counted
   * (`kept`) and its signed `subtotal`; flat parts report `n`. Returns null for invalid input.
   * @param {string} expression
   * @param {() => number} [randomFn]
   * @returns {{total:number, parts:Array<object>}|null}
   */
  function rollDiceExpression(expression, randomFn = Math.random) {
    const terms = parseDiceExpression(expression);
    if (!terms) return null;
    let total = 0;
    const parts = terms.map((term) => {
      if (term.type === 'mod') {
        total += term.n;
        return term;
      }
      const rolls = rollMultipleDice(term.count, term.sides, randomFn);
      const kept = selectKept(rolls, term.keepDir, term.keepN);
      const subtotal = term.sign * sum(kept);
      total += subtotal;
      return { ...term, rolls, kept, subtotal };
    });
    return { total, parts };
  }

  /**
   * The note appended to a feature roll's description or breakdown: " [SA: 12 vs 8]" (Savage
   * Attacker: the total taken vs the total discarded) and " [GWF]" (Great Weapon Fighting), in that
   * order. Empty for a roll with neither feature.
   * @param {{twiceRoll?: {taken:number, discarded:number}|null, rerollLowDice?: boolean}} result a rollDiceNotation result
   * @returns {string}
   */
  function describeFeatureRoll(result) {
    let note = '';
    if (result.twiceRoll) note += ` [SA: ${result.twiceRoll.taken} vs ${result.twiceRoll.discarded}]`;
    if (result.rerollLowDice) note += ' [GWF]';
    return note;
  }

  /**
   * Roll a d20 with optional advantage or disadvantage and add a bonus.
   * @param {'normal'|'advantage'|'disadvantage'} [mode]
   * @param {number} [bonus]
   * @param {() => number} [randomFn]
   */
  function rollD20(mode = 'normal', bonus = 0, randomFn = Math.random) {
    const first = rollDie(20, randomFn);
    let rolls = [first];
    let chosen = first;
    if (mode === 'advantage' || mode === 'disadvantage') {
      const second = rollDie(20, randomFn);
      rolls = [first, second];
      chosen = mode === 'advantage' ? Math.max(first, second) : Math.min(first, second);
    }
    return {
      rolls,
      chosen,
      bonus,
      total: chosen + bonus,
      isCritical: chosen === 20,
      isFumble: chosen === 1,
      isAdvantage: mode === 'advantage',
      isDisadvantage: mode === 'disadvantage'
    };
  }

  /**
   * The notation for a critical hit: the dice count doubles, the modifier does not.
   * "1d8+3" -> "2d8+3". Returns null if the notation is not a single valid dice group, or if
   * doubling the dice would pass MAX_DICE_COUNT (so no caller can fall back to a normal roll
   * without knowing the crit failed).
   * @param {string} notation
   * @returns {string|null}
   */
  function getCriticalHitNotation(notation) {
    const parsed = parseDiceNotation(notation);
    if (!parsed) return null;
    const { count, sides, modifier } = parsed;
    if (!validDice(count * 2, sides)) return null;
    const modStr = modifier > 0 ? '+' + modifier : modifier < 0 ? String(modifier) : '';
    return count * 2 + 'd' + sides + modStr;
  }

  /**
   * Spend hit dice: each die adds the CON modifier, and the total heals at least 1 HP per die spent.
   * @param {number} dieSize
   * @param {number} count
   * @param {number} [conMod]
   * @param {() => number} [randomFn]
   * Returns null unless the count and die size are whole numbers from 1 up to the dice limits.
   * @returns {{rolls:number[], rawTotal:number, healing:number}|null}
   */
  function rollHitDice(dieSize, count, conMod = 0, randomFn = Math.random) {
    if (!validDice(count, dieSize)) return null;
    const rolls = rollMultipleDice(count, dieSize, randomFn);
    const rawTotal = sum(rolls) + conMod * count;
    return { rolls, rawTotal, healing: Math.max(rawTotal, count) };
  }

  /**
   * 4d6 drop lowest. `dropped` is the lowest die, `kept` the other three in ascending order.
   * @param {() => number} [randomFn]
   */
  function rollAbilityScore(randomFn = Math.random) {
    const rolls = rollMultipleDice(4, 6, randomFn);
    const sorted = rolls.slice().sort((a, b) => a - b);
    const kept = sorted.slice(1);
    return { rolls, dropped: sorted[0], kept, total: sum(kept) };
  }

  /** Six ability scores, each 4d6 drop lowest. */
  function rollAbilityScoreSet(randomFn = Math.random) {
    const scores = [];
    for (let i = 0; i < 6; i++) scores.push(rollAbilityScore(randomFn).total);
    return scores;
  }

  /**
   * A deterministic random function for tests (a small linear congruential generator).
   * @param {number} seed
   * @returns {() => number}
   */
  function createSeededRandom(seed) {
    let state = seed;
    return function () {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  root.DiceEngine = Object.freeze({
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
  });
})(globalThis);
