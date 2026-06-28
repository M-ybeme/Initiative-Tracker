/**
 * Character Attack Rolls Module
 *
 * Pure functions for weapon attack feature bonuses and feature-aware damage rolling.
 * No DOM access, no side effects, no global state.
 *
 * character.js contains a browser-side copy of this logic inside its IIFE.
 * This module exists so the logic can be unit-tested with Vitest.
 * Phase 5 will wire character.js to consume this module directly.
 */

import { parseDiceNotation, rollDie } from '../modules/dice.js';

export const CONCENTRATION_ATTACK_BONUSES = {
  'hex': { notation: '1d6', label: 'Necrotic (Hex)', prompt: 'Concentrating on Hex — add +1d6 Necrotic to this attack?' },
  "hunter's mark": { notation: '1d6', label: "Weapon (Hunter's Mark)", prompt: "Concentrating on Hunter's Mark — add +1d6 to this attack?" },
  'spirit shroud': { notation: '1d8', label: 'Spirit Shroud', prompt: 'Concentrating on Spirit Shroud — add +1d8 to this attack?' },
};

export function getConcentrationAttackBonus(spellName) {
  if (!spellName) return null;
  return CONCENTRATION_ATTACK_BONUSES[spellName.toLowerCase().trim()] || null;
}

export function getAttackFeatureBonuses(char, attack) {
  const out = { flatBonus: 0, extraRolls: [], rerollLowDice: false, rollTwiceTakeBest: false };
  if (!char || !attack) return out;
  const charClass = (char.charClass || '').replace(/\s+\d+$/, '').trim();
  const levelMatch = (char.charClass || '').match(/(\d+)$/);
  const charLevel = parseInt(levelMatch?.[1] || String(char.level || 1), 10);
  const isMelee = attack.type === 'melee-weapon';
  const styles = char.fightingStyles || [];
  const feats = char.feats || [];
  if (isMelee && styles.includes('Dueling')) out.flatBonus += 2;
  if (isMelee && styles.includes('Great Weapon Fighting')) out.rerollLowDice = true;
  if (isMelee && feats.includes('Savage Attacker')) out.rollTwiceTakeBest = true;
  if (isMelee && charClass === 'Paladin' && charLevel >= 11)
    out.extraRolls.push({ notation: '1d8', label: 'Radiant (Improved Divine Smite)' });
  return out;
}

export function addFlatBonusToNotation(notation, bonus) {
  if (!bonus) return notation;
  const m = (notation || '').trim().match(/^(\d*d\d+)([+-]\d+)?$/i);
  if (!m) return notation;
  const newMod = parseInt(m[2] || '0', 10) + bonus;
  if (newMod > 0) return m[1] + "+" + newMod;
  if (newMod < 0) return m[1] + String(newMod);
  return m[1];
}

export function rollDiceSimple(notation, description = '', randomFn = Math.random) {
  const parsed = parseDiceNotation(notation);
  if (!parsed) return null;
  const { count, sides, modifier } = parsed;
  const rolls = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides, randomFn));
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { notation, description, rolls, modifier, total,
    isCritical: sides === 20 && rolls.includes(20),
    isFumble: sides === 20 && rolls.includes(1) };
}

export function rollDiceWithFeatures(notation, description = '', features = {}, randomFn = Math.random) {
  const { rerollLowDice = false, rollTwiceTakeBest = false } = features;
  if (!rerollLowDice && !rollTwiceTakeBest) return rollDiceSimple(notation, description, randomFn);
  const parsed = parseDiceNotation(notation);
  if (!parsed) return rollDiceSimple(notation, description, randomFn);
  const { count, sides, modifier } = parsed;
  function rollOnce() {
    return Array.from({ length: count }, () => {
      const r = rollDie(sides, randomFn);
      return (rerollLowDice && r <= 2) ? rollDie(sides, randomFn) : r;
    });
  }
  const rolls1 = rollOnce();
  let finalRolls, descSuffix = '';
  if (rollTwiceTakeBest) {
    const rolls2 = rollOnce();
    const t1 = rolls1.reduce((a, b) => a + b, 0);
    const t2 = rolls2.reduce((a, b) => a + b, 0);
    if (t1 >= t2) { finalRolls = rolls1; descSuffix = " [SA: " + t1 + " vs " + t2 + "]"; }
    else { finalRolls = rolls2; descSuffix = " [SA: " + t2 + " vs " + t1 + "]"; }
  } else { finalRolls = rolls1; }
  if (rerollLowDice) descSuffix += ' [GWF]';
  const total = finalRolls.reduce((a, b) => a + b, 0) + modifier;
  return { notation, description: description + descSuffix, rolls: finalRolls, modifier, total };
}