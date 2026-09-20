/**
 * Hit-dice pool engine: the one implementation of how the app reads, spends, restores and prints hit dice.
 *
 * A pool is written as text on the sheet: "5d8" for one die size, "3d8 + 4d6" for a multiclass character. In
 * code it is an array of { size, count }, largest die first, one entry per size (a size with no dice left stays
 * as a zero entry, so it prints as "0d6"). The stored fields `hitDice` (the whole pool) and `hitDiceRemaining`
 * are both this text, so a single-class value such as "5d8" is unchanged and older saves load as they are.
 *
 * Like dice-engine.js this is a classic script that publishes a global (`HitDicePool`) for the classic pages
 * (characters.html scripts, combat-mode.js), and ./hit-dice.js re-exports it for ES modules and tests. It knows
 * nothing about the DOM or characters.
 */
(function (root) {
  'use strict';
  if (root.HitDicePool) return;

  const sortPool = (pool) => pool.slice().sort((a, b) => b.size - a.size);

  /**
   * Text to pool, or null when it holds no NdM. Repeated sizes are added together and anything else in the text
   * is ignored, as the old single-die reader ignored trailing text.
   */
  function parse(text) {
    if (typeof text !== 'string') return null;
    const bySize = new Map();
    for (const match of text.matchAll(/(\d+)\s*d\s*(\d+)/gi)) {
      const count = parseInt(match[1], 10);
      const size = parseInt(match[2], 10);
      if (size > 0) bySize.set(size, (bySize.get(size) || 0) + count);
    }
    if (bySize.size === 0) return null;
    return sortPool([...bySize].map(([size, count]) => ({ size, count })));
  }

  // A whole number of at least `min`, from a number or numeric text; otherwise null. Nothing else gets into a pool.
  function wholeNumber(value, min) {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return Number.isInteger(n) && n >= min ? n : null;
  }

  function format(pool) {
    return sortPool(pool || []).filter(p => wholeNumber(p.size, 1) !== null && wholeNumber(p.count, 0) !== null)
      .map(p => `${p.count}d${p.size}`).join(' + ');
  }

  const totalDice = (pool) => (pool || []).reduce((sum, p) => sum + p.count, 0);
  const countOf = (pool, size) => ((pool || []).find(p => p.size === size) || { count: 0 }).count;

  /** The largest die size that still has dice, or null when none is left */
  function defaultSize(pool) {
    const left = sortPool(pool || []).find(p => p.count > 0);
    return left ? left.size : null;
  }

  /**
   * Spends up to n dice of one size (never below zero); other sizes are untouched. A count that is not a whole
   * number of at least 1 (NaN, Infinity, fractions, negatives, text) spends nothing: the pool comes back as it was.
   */
  function spend(pool, size, n) {
    const count = wholeNumber(n, 1);
    const sides = wholeNumber(size, 1);
    if (count === null || sides === null) return sortPool((pool || []).map(p => ({ ...p })));
    return sortPool((pool || []).map(p => (p.size === sides ? { size: sides, count: Math.max(0, p.count - count) } : { ...p })));
  }

  /** Adds n dice of a size, starting that size if the pool has none. Invalid input adds nothing. */
  function add(pool, size, n = 1) {
    const count = wholeNumber(n, 1);
    const sides = wholeNumber(size, 1);
    if (count === null || sides === null) return sortPool((pool || []).map(p => ({ ...p })));
    return addChecked(pool, sides, count);
  }

  function addChecked(pool, size, n) {
    const next = (pool || []).map(p => ({ ...p }));
    const entry = next.find(p => p.size === size);
    if (entry) entry.count += n; else next.push({ size, count: n });
    return sortPool(next);
  }

  // Spreads count dice over the pool's sizes, largest first, never more than each size holds
  function distribute(total, count) {
    let left = count;
    return sortPool(total.map(p => {
      const take = Math.min(p.count, left);
      left -= take;
      return { size: p.size, count: take };
    }));
  }

  // True for text that says "no dice": blank, or only size-0 dice such as "0d0"
  function saysNone(text) {
    if (typeof text !== 'string') return false;
    if (text.trim() === '') return true;
    const tokens = [...text.matchAll(/(\d+)\s*d\s*(\d+)/gi)];
    return tokens.length > 0 && tokens.every(m => parseInt(m[2], 10) === 0);
  }

  /**
   * The remaining pool, read against the total pool. Blank text and "0d0" mean no dice are left (an empty pool,
   * or every size at 0 when there is a total); text with no dice in it at all is not a pool (null).
   *
   * Against a total, the result always has exactly the total's sizes, each count between 0 and the total's: a
   * count above the total is cut back, and a size the total does not have is dropped, never carried into the
   * result. One exception: a single "NdM" that does not fit the total as it stands (written before mixed pools
   * existed, when its die was not tracked) has its dice counted, not discarded, and placed largest die first.
   */
  function resolveRemaining(total, remainingText) {
    const hasTotal = Array.isArray(total) && total.length > 0;
    if (saysNone(remainingText)) return hasTotal ? sortPool(total.map(t => ({ size: t.size, count: 0 }))) : [];
    const remaining = parse(remainingText);
    if (!remaining) return null;
    if (!hasTotal) return remaining;

    let pool = remaining;
    if (remaining.length === 1) {
      const only = remaining[0];
      const fits = total.some(t => t.size === only.size && only.count <= t.count);
      if (!fits) pool = distribute(total, only.count);
    }
    return sortPool(total.map(t => ({ size: t.size, count: Math.min(t.count, countOf(pool, t.size)) })));
  }

  /**
   * After a long rest: half the total number of dice come back (at least 1), largest die first, none above what
   * the total holds. For one die size this is the familiar min(total, remaining + max(1, floor(total / 2))).
   */
  function restoreLong(total, remaining) {
    const current = sortPool(total.map(t => ({ size: t.size, count: Math.min(t.count, countOf(remaining, t.size)) })));
    let toRestore = Math.max(1, Math.floor(totalDice(total) / 2));
    return current.map(p => {
      const room = (total.find(t => t.size === p.size) || { count: 0 }).count - p.count;
      const give = Math.min(room, toRestore);
      toRestore -= give;
      return { size: p.size, count: p.count + give };
    });
  }

  root.HitDicePool = Object.freeze({ parse, format, totalDice, countOf, defaultSize, spend, add, resolveRemaining, restoreLong });
})(globalThis);
