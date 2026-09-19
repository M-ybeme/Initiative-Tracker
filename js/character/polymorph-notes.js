/**
 * Polymorph / True Polymorph reference notes.
 *
 * Pure text: given the current Spells tab notes, a spell name, a character level and the beast-form data,
 * work out the notes with the reference block added. No DOM, no character state, no globals.
 *
 * The beast data (LevelUpData.BEAST_FORMS) is passed in rather than imported because it is live data:
 * site.js rewrites it when SRD filtering or homebrew packs apply, so callers hand over the current
 * value at call time.
 */

const normalizeSpellName = (spellName) => (spellName || '').toLowerCase().trim();

/**
 * Generates a formatted reference block for Polymorph or True Polymorph,
 * including 2024 PHB rules and a beast-form list from BEAST_FORMS data.
 * @param {string} spellName  - 'Polymorph' or 'True Polymorph' (case-insensitive)
 * @param {number} charLevel  - Character level (used as CR cap for beast list)
 * @param {Object} [beastForms] - LevelUpData.BEAST_FORMS (CR key -> beast list); the beast list is omitted if absent
 * @returns {string|null}     - Formatted text, or null if not a polymorph spell
 */
function generatePolymorphNotes(spellName, charLevel, beastForms) {
  const name = normalizeSpellName(spellName);
  const isTruePolymorph = name === 'true polymorph';
  const isPolymorph = name === 'polymorph';
  if (!isPolymorph && !isTruePolymorph) return null;

  const level = Math.max(1, parseInt(charLevel) || 1);
  const lines = [];

  if (isPolymorph) {
    lines.push('=== POLYMORPH (4th Level) ===');
    lines.push('Range: 60 ft | Duration: Concentration, up to 1 hour | Save: WIS (unwilling)');
    lines.push('');
    lines.push('2024 PHB Rules:');
    lines.push("- CR Limit: Target's CR (or character level, if the target has no CR)");
    lines.push("- Target assumes the Beast's full stat block (HP, AC, attacks, speed)");
    lines.push("- Target retains alignment, personality, and memories; cannot cast spells");
    lines.push("- If the Beast form drops to 0 HP, target reverts with original HP intact");
    lines.push("- No fly or swim speed restrictions (unlike Wild Shape)");
  } else {
    lines.push('=== TRUE POLYMORPH (9th Level) ===');
    lines.push('Range: 30 ft | Duration: Concentration, up to 1 hour (can become permanent) | Save: WIS (unwilling)');
    lines.push('');
    lines.push('2024 PHB Rules:');
    lines.push("- CR Limit: Target's CR (or character level, if no CR)");
    lines.push("- Can transform into ANY creature type — not just Beasts!");
    lines.push("- Can transform a creature into an object, or an object into a creature");
    lines.push("- PERMANENT: Maintain concentration for the full 1 hour to make it permanent");
    lines.push("- Permanent transformation persists through unconsciousness and rests");
    lines.push("- Dispel Magic (DC 10 + caster's original spell level) can end a permanent transformation");
    lines.push("- If creature drops to 0 HP in new form, reverts (unless transformation is permanent)");
  }

  // Build beast forms list
  if (beastForms) {
    lines.push('');
    lines.push('--- Available Beast Forms (CR \u2264 ' + level + ') ---');
    if (isPolymorph) lines.push('(No fly or swim restrictions for Polymorph)');
    lines.push('');

    const CR_ORDER = ['CR0', 'CR1/8', 'CR1/4', 'CR1/2', 'CR1', 'CR2'];
    const CR_NUM   = { 'CR0': 0, 'CR1/8': 0.125, 'CR1/4': 0.25, 'CR1/2': 0.5, 'CR1': 1, 'CR2': 2 };
    let listed = false;

    for (const crKey of CR_ORDER) {
      if (CR_NUM[crKey] > level) break;
      const beasts = beastForms[crKey] || [];
      if (!beasts.length) continue;

      lines.push('-- CR ' + crKey.replace('CR', '') + ' --');
      for (const beast of beasts) {
        lines.push(beast.name + ' | AC ' + beast.ac + ' | HP ' + beast.hp + ' | Speed: ' + beast.speed);
        lines.push('  Attacks: ' + beast.attacks);
        if (beast.traits) lines.push('  Traits: ' + beast.traits);
      }
      lines.push('');
      listed = true;
    }

    if (!listed) {
      lines.push('No beast forms in our database at your current level.');
    } else if (level >= 3) {
      lines.push('Note: Higher CR beasts (CR 3+) exist in the Monster Manual.');
      lines.push("Any Beast with CR \u2264 the target's CR or level is valid.");
    }
  }

  return lines.join('\n');
}

/**
 * The Spells tab notes after adding the reference block for 'Polymorph' or 'True Polymorph' (case-insensitive,
 * surrounding whitespace ignored), or null when there is nothing to add: the spell is neither of those, or
 * its block is already in the notes (matched by its "=== POLYMORPH" / "=== TRUE POLYMORPH" heading).
 * The block is joined to any existing notes with a blank line.
 * @param {string} currentNotes - The notes as they are now ('' when empty)
 * @param {string} spellName
 * @param {number} charLevel
 * @param {Object} [beastForms] - LevelUpData.BEAST_FORMS
 * @returns {string|null}
 */
export function addPolymorphNotes(currentNotes, spellName, charLevel, beastForms) {
  const name = normalizeSpellName(spellName);
  if (name !== 'polymorph' && name !== 'true polymorph') return null;

  const marker = name === 'true polymorph' ? '=== TRUE POLYMORPH' : '=== POLYMORPH';
  if (currentNotes.includes(marker)) return null; // Already present

  const notes = generatePolymorphNotes(spellName, charLevel, beastForms);
  return currentNotes ? currentNotes + '\n\n' + notes : notes;
}
