/**
 * Character Attack Rolls Module
 *
 * Pure functions for weapon attack feature bonuses (Dueling, GWF, Savage Attacker, smite dice).
 * No DOM access, no side effects, no global state.
 *
 * character.js imports these directly. Rolling the dice is not done here: it lives in the shared
 * dice engine (js/modules/dice-engine.js), which character.js reaches through js/modules/dice.js.
 * addFlatBonusToNotation reads notation with that engine's parsers.
 */
import { parseDiceNotation, parseDiceExpression } from './js/modules/dice.js';

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

/**
 * The notation with a flat bonus (Dueling +2, ...) added, read by the dice engine's own parsers, so a
 * bonus is never silently lost on notation the engine can roll:
 *   one dice group  "1d8 + 3", "4d6kh3+1"  -> the modifier is merged: "1d8+5", "4d6kh3+3" (still one
 *                                             group, so a critical hit can still double it)
 *   an expression   "2d6+1d4", "5"         -> the bonus is appended as a term: "2d6+1d4+2", "5+2"
 * Notation the engine cannot roll is returned unchanged; rolling it is refused with a message.
 * Call it on text already cleaned by normalizeLegacyDamageNotation (the trailing words would make
 * "1d8+3 slashing" unreadable here).
 */
export function addFlatBonusToNotation(notation, bonus) {
  if (!bonus) return notation;
  const text = String(notation ?? '').trim();
  const group = parseDiceNotation(text);
  if (group) {
    const keep = group.keepHighest ? `kh${group.keepHighest}` : group.keepLowest ? `kl${group.keepLowest}` : '';
    const mod = group.modifier + bonus;
    return `${group.count}d${group.sides}${keep}${mod > 0 ? `+${mod}` : mod < 0 ? String(mod) : ''}`;
  }
  if (parseDiceExpression(text)) return `${text}${bonus > 0 ? '+' : ''}${bonus}`;
  return notation;
}
