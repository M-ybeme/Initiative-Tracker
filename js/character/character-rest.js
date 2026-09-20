/**
 * Character Rest & Spell Calculations Module
 *
 * Pure functions for rest mechanics, spell save DC, spell attack bonus,
 * and concentration check DC.
 * No DOM access, no side effects, no global state.
 */


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
 * Roll hit dice for healing during a short rest: each die adds the CON modifier and the total heals
 * at least 1 HP per die spent. The rule itself lives in the dice engine (rollHitDice); this is its
 * name in the rest module. Returns { rolls, rawTotal, healing }.
 */
export { rollHitDice as rollHitDiceForHealing } from '../modules/dice.js';
import * as HitDice from '../modules/hit-dice.js';

export function applyShortRest(char, healAmount, hitDiceSpent, dieSize) {
  if (!char) return char;
  const maxHP = parseInt(char.maxHP) || 0;
  const currentHP = parseInt(char.currentHP) || 0;
  const heal = Math.max(0, parseInt(healAmount) || 0);
  char.currentHP = Math.min(maxHP, currentHP + heal);
  const spent = Math.max(0, Math.floor(parseInt(hitDiceSpent) || 0));
  if (spent > 0 && char.hitDiceRemaining) {
    // Dice are spent from one size: the one given, else the largest that still has dice
    const pool = HitDice.resolveRemaining(HitDice.parse(char.hitDice), char.hitDiceRemaining);
    if (pool) {
      const size = dieSize || HitDice.defaultSize(pool) || pool[0].size;
      char.hitDiceRemaining = HitDice.format(HitDice.spend(pool, size, spent));
    }
  }
  return char;
}
export function applyLongRest(char) {
  if (!char) return char;

  // Restore HP to max, clear temp HP
  char.currentHP = parseInt(char.maxHP) || 0;
  char.tempHP = 0;

  // Restore hit dice: regain half the total number (rounded down, minimum 1), largest die first
  if (char.hitDiceRemaining !== undefined && char.hitDice !== undefined) {
    const total = HitDice.parse(char.hitDice);
    if (total && HitDice.totalDice(total) > 0) {
      const remaining = HitDice.resolveRemaining(total, char.hitDiceRemaining) || total.map(t => ({ size: t.size, count: 0 }));
      char.hitDiceRemaining = HitDice.format(HitDice.restoreLong(total, remaining));
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
