/**
 * Character Attack Rolls Module
 *
 * Pure functions for weapon attack feature bonuses (Dueling, GWF, Savage Attacker, smite dice).
 * No DOM access, no side effects, no global state.
 *
 * character.js imports these directly. Rolling the dice is not done here: it lives in the shared
 * dice engine (js/modules/dice-engine.js), which character.js reaches through js/modules/dice.js.
 */

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
