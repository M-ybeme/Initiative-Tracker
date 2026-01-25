/**
 * Export Utilities Module
 * Pure functions for formatting character data for export
 * Does not handle actual file I/O (that's browser-specific)
 */

import { getAbilityModifier, getProficiencyBonus } from './character-calculations.js';

const EXPORT_LICENSE_PHRASE = 'Creative Commons Attribution 4.0 International License';
const SRD_PDF_URL = 'https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf';
const EXPORT_LICENSE_DEFAULTS = {
  attributionText: 'This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC and is licensed for our use under the Creative Commons Attribution 4.0 International License.',
  productIdentityDisclaimer: 'The DM\'s Toolbox references rules and mechanics from the Dungeons & Dragons 5e System Reference Document 5.1. Wizards of the Coast, Dungeons & Dragons, Forgotten Realms, Ravenloft, Eberron, the dragon ampersand, beholders, githyanki, githzerai, mind flayers, yuan-ti, and all other Wizards of the Coast product identity are trademarks of Wizards of the Coast LLC in the U.S.A. and other countries. The DM\'s Toolbox is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  srdUrl: SRD_PDF_URL
};

function getExportLicenseInfo() {
  const globalScope = typeof globalThis !== 'undefined' ? globalThis : {};
  if (typeof globalScope.getSrdLicenseNotices === 'function') {
    return globalScope.getSrdLicenseNotices();
  }
  if (globalScope.SRDLicensing) {
    return {
      attributionText: globalScope.SRDLicensing.attributionText || EXPORT_LICENSE_DEFAULTS.attributionText,
      productIdentityDisclaimer: globalScope.SRDLicensing.productIdentityDisclaimer || EXPORT_LICENSE_DEFAULTS.productIdentityDisclaimer,
      licenseUrl: globalScope.SRDLicensing.licenseUrl || EXPORT_LICENSE_DEFAULTS.licenseUrl,
      srdUrl: globalScope.SRDLicensing.srdUrl || EXPORT_LICENSE_DEFAULTS.srdUrl
    };
  }
  return { ...EXPORT_LICENSE_DEFAULTS };
}

function buildPlainTextLicenseBlock() {
  const info = getExportLicenseInfo();
  const lines = ['LICENSE & ATTRIBUTION', '---------------------', info.attributionText];
  if (info.licenseUrl) {
    lines.push(`License: ${info.licenseUrl}`);
  }
  if (info.srdUrl) {
    lines.push(`SRD 5.1 PDF: ${info.srdUrl}`);
  }
  lines.push(info.productIdentityDisclaimer);
  return lines.join('\n');
}

function buildMarkdownLicenseBlock() {
  const info = getExportLicenseInfo();
  const lines = ['---', '## License & Attribution', formatMarkdownAttribution(info)];
  if (info.srdUrl) {
    lines.push('', `[SRD 5.1 Reference PDF](${info.srdUrl})`);
  }
  lines.push('', info.productIdentityDisclaimer);
  return lines.join('\n');
}

function formatMarkdownAttribution(info) {
  if (!info.licenseUrl) {
    return info.attributionText;
  }
  const phrase = EXPORT_LICENSE_PHRASE;
  if (!info.attributionText.includes(phrase)) {
    return `${info.attributionText} (${info.licenseUrl})`;
  }
  return info.attributionText.replace(phrase, `[${phrase}](${info.licenseUrl})`);
}

/**
 * Format ability modifier for display
 * @param {number} score - Ability score
 * @returns {string} - Formatted modifier (e.g., "+2" or "-1")
 */
export function formatModifier(score) {
  const mod = getAbilityModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Generate plain text character summary
 * @param {Object} character - Character data
 * @returns {string} - Plain text summary
 */
export function generateCharacterText(character) {
  if (!character) return '';

  const lines = [];

  // Header
  lines.push(character.name || 'Unnamed Character');
  lines.push('='.repeat((character.name || 'Unnamed Character').length));
  lines.push('');

  // Basic info
  if (character.race) lines.push(`Race: ${character.race}`);
  if (character.charClass || character.class) {
    lines.push(`Class: ${character.charClass || character.class}`);
  }
  if (character.level) lines.push(`Level: ${character.level}`);
  if (character.background) lines.push(`Background: ${character.background}`);
  if (character.alignment) lines.push(`Alignment: ${character.alignment}`);
  lines.push('');

  // Ability Scores
  if (character.stats) {
    lines.push('ABILITY SCORES');
    lines.push('--------------');
    const stats = character.stats;
    lines.push(`STR: ${stats.str || 10} (${formatModifier(stats.str || 10)})`);
    lines.push(`DEX: ${stats.dex || 10} (${formatModifier(stats.dex || 10)})`);
    lines.push(`CON: ${stats.con || 10} (${formatModifier(stats.con || 10)})`);
    lines.push(`INT: ${stats.int || 10} (${formatModifier(stats.int || 10)})`);
    lines.push(`WIS: ${stats.wis || 10} (${formatModifier(stats.wis || 10)})`);
    lines.push(`CHA: ${stats.cha || 10} (${formatModifier(stats.cha || 10)})`);
    lines.push('');
  }

  // Combat stats
  lines.push('COMBAT');
  lines.push('------');
  if (character.ac) lines.push(`AC: ${character.ac}`);
  if (character.maxHP) lines.push(`HP: ${character.currentHP || character.maxHP}/${character.maxHP}`);
  if (character.speed) lines.push(`Speed: ${character.speed} ft`);
  if (character.level) {
    lines.push(`Proficiency Bonus: +${getProficiencyBonus(character.level)}`);
  }
  lines.push('');

  // Features (if any)
  if (character.features && character.features.length > 0) {
    lines.push('FEATURES');
    lines.push('--------');
    character.features.forEach(f => {
      lines.push(`• ${f.name || f}`);
    });
    lines.push('');
  }

  // Equipment (if any)
  if (character.equipment && character.equipment.length > 0) {
    lines.push('EQUIPMENT');
    lines.push('---------');
    character.equipment.forEach(e => {
      lines.push(`• ${e.name || e}`);
    });
    lines.push('');
  }

  lines.push('');
  lines.push(buildPlainTextLicenseBlock());

  return lines.join('\n');
}

/**
 * Generate markdown character sheet
 * @param {Object} character - Character data
 * @returns {string} - Markdown formatted sheet
 */
export function generateCharacterMarkdown(character) {
  if (!character) return '';

  const lines = [];

  // Header
  lines.push(`# ${character.name || 'Unnamed Character'}`);
  lines.push('');

  // Basic info table
  lines.push('## Basic Information');
  lines.push('| Attribute | Value |');
  lines.push('|-----------|-------|');
  if (character.race) lines.push(`| Race | ${character.race} |`);
  if (character.charClass || character.class) {
    lines.push(`| Class | ${character.charClass || character.class} |`);
  }
  if (character.level) lines.push(`| Level | ${character.level} |`);
  if (character.background) lines.push(`| Background | ${character.background} |`);
  if (character.alignment) lines.push(`| Alignment | ${character.alignment} |`);
  lines.push('');

  // Ability Scores
  if (character.stats) {
    lines.push('## Ability Scores');
    lines.push('| Ability | Score | Modifier |');
    lines.push('|---------|-------|----------|');
    const stats = character.stats;
    lines.push(`| Strength | ${stats.str || 10} | ${formatModifier(stats.str || 10)} |`);
    lines.push(`| Dexterity | ${stats.dex || 10} | ${formatModifier(stats.dex || 10)} |`);
    lines.push(`| Constitution | ${stats.con || 10} | ${formatModifier(stats.con || 10)} |`);
    lines.push(`| Intelligence | ${stats.int || 10} | ${formatModifier(stats.int || 10)} |`);
    lines.push(`| Wisdom | ${stats.wis || 10} | ${formatModifier(stats.wis || 10)} |`);
    lines.push(`| Charisma | ${stats.cha || 10} | ${formatModifier(stats.cha || 10)} |`);
    lines.push('');
  }

  // Combat
  lines.push('## Combat');
  lines.push('| Stat | Value |');
  lines.push('|------|-------|');
  if (character.ac) lines.push(`| Armor Class | ${character.ac} |`);
  if (character.maxHP) lines.push(`| Hit Points | ${character.currentHP || character.maxHP}/${character.maxHP} |`);
  if (character.speed) lines.push(`| Speed | ${character.speed} ft |`);
  if (character.level) {
    lines.push(`| Proficiency Bonus | +${getProficiencyBonus(character.level)} |`);
  }
  lines.push('');

  // Features
  if (character.features && character.features.length > 0) {
    lines.push('## Features & Traits');
    character.features.forEach(f => {
      const name = f.name || f;
      const desc = f.description || '';
      lines.push(`- **${name}**${desc ? `: ${desc}` : ''}`);
    });
    lines.push('');
  }

  // Equipment
  if (character.equipment && character.equipment.length > 0) {
    lines.push('## Equipment');
    character.equipment.forEach(e => {
      lines.push(`- ${e.name || e}`);
    });
    lines.push('');
  }

  lines.push(buildMarkdownLicenseBlock());

  return lines.join('\n');
}

/**
 * Generate JSON export data
 * @param {Object} character - Character data
 * @param {boolean} prettyPrint - Whether to format JSON
 * @returns {string} - JSON string
 */
export function generateCharacterJSON(character, prettyPrint = true) {
  if (!character) return '{}';

  // Create a clean export object
  const exportData = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    character: {
      name: character.name,
      race: character.race,
      class: character.charClass || character.class,
      level: character.level,
      background: character.background,
      alignment: character.alignment,
      stats: character.stats,
      hp: {
        current: character.currentHP,
        max: character.maxHP,
        temp: character.tempHP || 0
      },
      ac: character.ac,
      speed: character.speed,
      proficiencyBonus: character.level ? getProficiencyBonus(character.level) : 2,
      features: character.features || [],
      equipment: character.equipment || [],
      spells: character.spells || [],
      notes: character.notes || ''
    }
  };

  return prettyPrint
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);
}

/**
 * Generate stat block text (monster/NPC format)
 * @param {Object} creature - Creature data
 * @returns {string} - Stat block text
 */
export function generateStatBlock(creature) {
  if (!creature) return '';

  const lines = [];

  // Name and type
  lines.push(creature.name || 'Unnamed Creature');
  lines.push(`${creature.size || 'Medium'} ${creature.type || 'humanoid'}, ${creature.alignment || 'unaligned'}`);
  lines.push('');

  // AC, HP, Speed
  lines.push(`Armor Class ${creature.ac || 10}`);
  lines.push(`Hit Points ${creature.hp || creature.maxHP || 10}`);
  lines.push(`Speed ${creature.speed || 30} ft.`);
  lines.push('');

  // Ability scores line
  if (creature.stats) {
    const s = creature.stats;
    lines.push('STR     DEX     CON     INT     WIS     CHA');
    const scores = [s.str, s.dex, s.con, s.int, s.wis, s.cha].map(v => v || 10);
    const formatted = scores.map(v => {
      const mod = getAbilityModifier(v);
      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
      return `${v} (${modStr})`.padEnd(8);
    });
    lines.push(formatted.join(''));
    lines.push('');
  }

  // Traits
  if (creature.traits && creature.traits.length > 0) {
    creature.traits.forEach(trait => {
      lines.push(`${trait.name}. ${trait.description}`);
    });
    lines.push('');
  }

  // Actions
  if (creature.actions && creature.actions.length > 0) {
    lines.push('ACTIONS');
    lines.push('-------');
    creature.actions.forEach(action => {
      lines.push(`${action.name}. ${action.description}`);
    });
  }

  return lines.join('\n');
}

/**
 * Generate initiative tracker export format
 * @param {Object} character - Character data
 * @returns {Object} - Initiative tracker compatible object
 */
export function generateInitiativeExport(character) {
  if (!character) return null;

  return {
    name: character.name || 'Unknown',
    type: 'PC',
    hp: character.currentHP || character.maxHP || 10,
    maxHp: character.maxHP || 10,
    ac: character.ac || 10,
    initiativeBonus: character.stats
      ? getAbilityModifier(character.stats.dex || 10)
      : 0,
    conditions: [],
    notes: ''
  };
}

/**
 * Parse imported character JSON
 * @param {string} jsonString - JSON string to parse
 * @returns {Object} - {success: boolean, character: Object|null, error: string|null}
 */
export function parseCharacterImport(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return { success: false, character: null, error: 'Invalid input' };
  }

  try {
    const data = JSON.parse(jsonString);

    // Handle our export format
    if (data.exportVersion && data.character) {
      return { success: true, character: data.character, error: null };
    }

    // Handle raw character object
    if (data.name || data.stats) {
      return { success: true, character: data, error: null };
    }

    return { success: false, character: null, error: 'Unrecognized format' };
  } catch (e) {
    return { success: false, character: null, error: `Parse error: ${e.message}` };
  }
}
