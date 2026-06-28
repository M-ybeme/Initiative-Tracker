/**
 * Character Combat Module
 *
 * Pure functions for HP management, death save outcomes, and critical hit
 * dice notation. No DOM access, no side effects, no global state.
 */

import { parseDiceNotation } from '../modules/dice.js';

/**
 * Apply damage to a character, absorbing through temporary HP first.
 * @param {number} currentHP - current hit points
 * @param {number} tempHP    - temporary hit points
 * @param {number} maxHP     - maximum hit points
 * @param {number} damage    - damage to apply (negative values treated as 0)
 * @returns {{ newCurrentHP: number, newTempHP: number, damageToHP: number }}
 */
export function applyDamageToHP(currentHP, tempHP, maxHP, damage) {
  const cur = Math.max(0, Math.floor(currentHP) || 0);
  const tmp = Math.max(0, Math.floor(tempHP) || 0);
  const _mx  = Math.max(0, Math.floor(maxHP) || 0); // maxHP accepted for API consistency; not needed for damage calc
  const dmg = Math.max(0, Math.floor(damage) || 0);

  let remaining = dmg;
  let newTempHP = tmp;

  // Temp HP absorbs first
  if (tmp > 0) {
    if (remaining <= tmp) {
      newTempHP = tmp - remaining;
      remaining = 0;
    } else {
      remaining -= tmp;
      newTempHP = 0;
    }
  }

  const newCurrentHP = Math.max(0, cur - remaining);
  const damageToHP = cur - newCurrentHP;

  return { newCurrentHP, newTempHP, damageToHP };
}

/**
 * Apply healing to a character, capped at max HP.
 * @param {number} currentHP - current hit points
 * @param {number} maxHP     - maximum hit points
 * @param {number} healing   - HP to restore (negative values treated as 0)
 * @returns {number} new current HP
 */
export function applyHealingToHP(currentHP, maxHP, healing) {
  const cur = Math.max(0, Math.floor(currentHP) || 0);
  const mx  = Math.max(0, Math.floor(maxHP) || 0);
  const heal = Math.max(0, Math.floor(healing) || 0);
  return Math.min(cur + heal, mx);
}

/**
 * Set temporary HP (does not stack — always takes the higher value).
 * @param {number} currentTemp - existing temporary HP
 * @param {number} newTemp     - incoming temporary HP
 * @returns {number}
 */
export function setTempHP(currentTemp, newTemp) {
  const cur  = Math.max(0, Math.floor(currentTemp) || 0);
  const next = Math.max(0, Math.floor(newTemp) || 0);
  return Math.max(cur, next);
}

/**
 * Determine the outcome of a d20 death saving throw.
 * Per 2024 PHB rules:
 *   - Natural 20: critical success (regain 1 HP)
 *   - Natural  1: double failure
 *   - 10-19    : success
 *   - 2-9      : failure
 *
 * @param {number} roll - the raw d20 roll (1-20)
 * @returns {'critical_success'|'double_failure'|'success'|'failure'}
 */
export function getDeathSaveOutcome(roll) {
  const r = Math.round(roll);
  if (r === 20) return 'critical_success';
  if (r === 1)  return 'double_failure';
  if (r >= 10)  return 'success';
  return 'failure';
}

/**
 * Determine overall death save state from accumulated results.
 * @param {number} successes - number of successful death saves (0-3)
 * @param {number} failures  - number of failed death saves (0-3)
 * @returns {'stable'|'dead'|'dying'}
 */
export function getDeathSaveState(successes, failures) {
  const s = Math.max(0, successes || 0);
  const f = Math.max(0, failures || 0);
  if (f >= 3) return 'dead';
  if (s >= 3) return 'stable';
  return 'dying';
}

/**
 * Build the critical hit dice notation by doubling the die count.
 * Modifier is preserved unchanged (only dice are doubled, per 5e RAW).
 * Returns null if the notation is invalid.
 * @param {string} notation - e.g. '2d6+3'
 * @returns {string|null}
 */
export function getCriticalHitNotation(notation) {
  const parsed = parseDiceNotation(notation);
  if (!parsed) return null;
  const { count, sides, modifier } = parsed;
  const critCount = count * 2;
  const modStr = modifier > 0 ? '+' + modifier : modifier < 0 ? String(modifier) : '';
  return critCount + 'd' + sides + modStr;
}

/**
 * Parse a to-hit bonus string (e.g. '+5', '-2', '3') into a number.
 * Returns 0 if the string contains no recognizable number.
 * @param {string} bonusStr
 * @returns {number}
 */
export function parseAttackBonus(bonusStr) {
  const m = (bonusStr || '').match(/([+-]?\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}
