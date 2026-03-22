/**
 * Character Rest & Spell Calculations Module
 *
 * Pure functions for rest mechanics, spell save DC, spell attack bonus,
 * and concentration check DC.
 * No DOM access, no side effects, no global state.
 */

import { rollDie } from './dice.js';

/**
 * Calculate spell save DC.
 * @param {number} profBonus - proficiency bonus
 * @param {number} abilMod   - spellcasting ability modifier
 * @returns {number}
 */
export function calcSpellSaveDC(profBonus, abilMod) {
  return 8 + (profBonus || 0) + (abilMod || 0);
}

/**
 * Calculate spell attack bonus.
 * @param {number} profBonus - proficiency bonus
 * @param {number} abilMod   - spellcasting ability modifier
 * @returns {number}
 */
export function calcSpellAttackBonus(profBonus, abilMod) {
  return (profBonus || 0) + (abilMod || 0);
}

/**
 * Get the DC for a concentration saving throw after taking damage.
 * DC = max(10, floor(damage / 2)).
 * @param {number} damage - damage taken
 * @returns {number}
 */
export function getConcentrationCheckDC(damage) {
  const dmg = Math.max(0, Math.floor(damage) || 0);
  return Math.max(10, Math.floor(dmg / 2));
}

/**
 * Calculate how many hit dice are restored after a long rest.
 * Rules: restore hit dice equal to half total (rounded down), minimum 1.
 * Cannot exceed total hit dice.
 * @param {number} totalCount   - total hit dice the character has
 * @param {number} currentCount - hit dice remaining before the rest
 * @returns {number} new remaining hit dice count
 */
export function calcLongRestHitDiceRestored(totalCount, currentCount) {
  const total = Math.max(0, Math.floor(totalCount) || 0);
  const current = Math.max(0, Math.floor(currentCount) || 0);
  if (total === 0) return 0;
  const restored = Math.max(1, Math.floor(total / 2));
  return Math.min(total, current + restored);
}

/**
 * Roll hit dice for healing during a short rest.
 * Each die roll has CON modifier added; total healing is at least 1 HP per die spent.
 * @param {number} dieSize  - size of each hit die (e.g. 10 for d10)
 * @param {number} count    - number of hit dice to spend
 * @param {number} conMod   - Constitution modifier
 * @param {Function} randomFn - injectable random function (default Math.random)
 * @returns {{ rolls: number[], rawTotal: number, healing: number }}
 */
export function rollHitDiceForHealing(dieSize, count, conMod = 0, randomFn = Math.random) {
  const rolls = [];
  let rawTotal = 0;
  for (let i = 0; i < count; i++) {
    const roll = rollDie(dieSize, randomFn);
    rolls.push(roll);
    rawTotal += roll + conMod;
  }
  // Minimum 1 HP per die spent (from 2024 PHB / widely-used interpretation)
  const healing = Math.max(rawTotal, count);
  return { rolls, rawTotal, healing };
}

function parseHitDiceStr(hdStr) {
  const bs = String.fromCharCode(92);
  const m = (hdStr || "").match(new RegExp("^(" + bs + "d+)d(" + bs + "d+)"));
  if (!m) return { count: 0, size: 0 };
  return { count: parseInt(m[1], 10), size: parseInt(m[2], 10) };
}

export function applyShortRest(char, healAmount, hitDiceSpent) {
  if (!char) return char;
  const maxHP = parseInt(char.maxHP) || 0;
  const currentHP = parseInt(char.currentHP) || 0;
  const heal = Math.max(0, parseInt(healAmount) || 0);
  char.currentHP = Math.min(maxHP, currentHP + heal);
  const spent = Math.max(0, Math.floor(parseInt(hitDiceSpent) || 0));
  if (spent > 0 && char.hitDiceRemaining) {
    const { count, size } = parseHitDiceStr(char.hitDiceRemaining);
    if (size > 0) {
      char.hitDiceRemaining = Math.max(0, count - spent) + "d" + size;
    }
  }
  return char;
}
export function applyLongRest(char) {
  if (!char) return char;

  // Restore HP to max, clear temp HP
  char.currentHP = parseInt(char.maxHP) || 0;
  char.tempHP = 0;

  // Restore hit dice: regain half total (rounded down), minimum 1
  if (char.hitDiceRemaining !== undefined && char.hitDice !== undefined) {
    const { count: total, size } = parseHitDiceStr(char.hitDice);
    const { count: remaining } = parseHitDiceStr(char.hitDiceRemaining);
    if (total > 0 && size > 0) {
      const restored = Math.max(1, Math.floor(total / 2));
      const newCount = Math.min(total, remaining + restored);
      char.hitDiceRemaining = newCount + "d" + size;
    }
  }

  // Reset spell slots (set used to 0 for every level)
  if (char.spellSlots) {
    for (let i = 1; i <= 9; i++) {
      if (char.spellSlots[i]) char.spellSlots[i].used = 0;
    }
  }

  // Reset pact slots
  if (char.pactSlots) char.pactSlots.used = 0;

  return char;
}
