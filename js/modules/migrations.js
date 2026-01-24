// @ts-check
/// <reference path="../types.js" />

/**
 * Data Migrations Module
 * Handles schema versioning and data migrations for saved data
 * Ensures backwards compatibility as data structures evolve
 */

// ============================================================
// SCHEMA VERSIONS
// ============================================================

/**
 * Current schema versions for each data type
 * Increment these when making breaking changes to data structures
 */
export const CURRENT_SCHEMA_VERSIONS = {
  character: 2,
  battlemap: 1,
  journal: 1
};

/**
 * Minimum supported schema versions
 * Data older than this will show a warning
 */
export const MIN_SUPPORTED_VERSIONS = {
  character: 1,
  battlemap: 1,
  journal: 1
};

// ============================================================
// CHARACTER MIGRATIONS
// ============================================================

/**
 * Migration functions for character data
 * Each key is the version TO migrate to
 * @type {Record<number, (char: any) => any>}
 */
const CHARACTER_MIGRATIONS = {
  /**
   * Version 1: Initial schema version
   * - Adds schemaVersion field
   * - Ensures id exists
   * - Adds lastUpdated timestamp
   */
  1: (char) => {
    const migrated = { ...char };

    // Ensure ID exists
    if (!migrated.id) {
      migrated.id = `char_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Add lastUpdated if missing
    if (!migrated.lastUpdated) {
      migrated.lastUpdated = new Date().toISOString();
    }

    // Migrate old stat format (str/strength) to new format (stats.str)
    if (!migrated.stats && (migrated.str !== undefined || migrated.strength !== undefined)) {
      migrated.stats = {
        str: migrated.str ?? migrated.strength ?? 10,
        dex: migrated.dex ?? migrated.dexterity ?? 10,
        con: migrated.con ?? migrated.constitution ?? 10,
        int: migrated.int ?? migrated.intelligence ?? 10,
        wis: migrated.wis ?? migrated.wisdom ?? 10,
        cha: migrated.cha ?? migrated.charisma ?? 10
      };
      // Clean up old fields
      delete migrated.str;
      delete migrated.dex;
      delete migrated.con;
      delete migrated.int;
      delete migrated.wis;
      delete migrated.cha;
      delete migrated.strength;
      delete migrated.dexterity;
      delete migrated.constitution;
      delete migrated.intelligence;
      delete migrated.wisdom;
      delete migrated.charisma;
    }

    // Ensure level is a number
    if (typeof migrated.level === 'string') {
      migrated.level = parseInt(migrated.level, 10) || 1;
    }

    migrated.schemaVersion = 1;
    return migrated;
  },

  /**
   * Version 2: Structured classes array
   * - Ensures classes array exists for multiclass support
   * - Normalizes spell slots structure
   * - Adds deathSaves if missing
   */
  2: (char) => {
    const migrated = { ...char };

    // Ensure classes array exists
    if (!migrated.classes || !Array.isArray(migrated.classes)) {
      migrated.classes = [];
      if (migrated.charClass) {
        migrated.classes.push({
          className: migrated.charClass,
          subclass: migrated.subclass || '',
          level: migrated.level || 1,
          subclassLevel: migrated.subclassLevel || 0
        });
      }
    }

    // Ensure deathSaves structure exists
    if (!migrated.deathSaves) {
      migrated.deathSaves = { successes: 0, failures: 0, stable: false };
    }

    // Ensure pactSlots structure exists (for Warlocks)
    if (!migrated.pactSlots) {
      migrated.pactSlots = { level: 0, max: 0, used: 0 };
    }

    // Ensure currency structure exists
    if (!migrated.currency) {
      migrated.currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    }

    // Ensure inventoryItems array exists
    if (!migrated.inventoryItems) {
      migrated.inventoryItems = [];
    }

    // Ensure resources array exists
    if (!migrated.resources) {
      migrated.resources = [];
    }

    // Ensure spellList array exists
    if (!migrated.spellList) {
      migrated.spellList = [];
    }

    migrated.schemaVersion = 2;
    return migrated;
  }
};

/**
 * Migrate a character to the current schema version
 * @param {any} character - Character data (possibly old format)
 * @returns {{data: import('../types.js').Character|null, migrated: boolean, fromVersion: number, warnings: string[]}}
 */
export function migrateCharacter(character) {
  const warnings = [];

  if (!character || typeof character !== 'object') {
    return { data: null, migrated: false, fromVersion: 0, warnings: ['Invalid character data'] };
  }

  // Determine current version (0 if no schemaVersion field)
  const fromVersion = character.schemaVersion || 0;
  const targetVersion = CURRENT_SCHEMA_VERSIONS.character;

  // Check if migration is needed
  if (fromVersion >= targetVersion) {
    return { data: character, migrated: false, fromVersion, warnings };
  }

  // Check if data is too old
  if (fromVersion < MIN_SUPPORTED_VERSIONS.character) {
    warnings.push(`Character data is from schema version ${fromVersion}, which is older than the minimum supported version ${MIN_SUPPORTED_VERSIONS.character}. Some data may not migrate correctly.`);
  }

  // Apply migrations incrementally
  let migrated = { ...character };
  for (let version = fromVersion + 1; version <= targetVersion; version++) {
    const migrationFn = CHARACTER_MIGRATIONS[version];
    if (migrationFn) {
      try {
        migrated = migrationFn(migrated);
      } catch (err) {
        warnings.push(`Migration to version ${version} failed: ${err instanceof Error ? err.message : String(err)}`);
        // Continue with partially migrated data
      }
    }
  }

  return {
    data: migrated,
    migrated: true,
    fromVersion,
    warnings
  };
}

// ============================================================
// BATTLEMAP MIGRATIONS
// ============================================================

/**
 * Migration functions for battlemap data
 * @type {Record<number, (state: any) => any>}
 */
const BATTLEMAP_MIGRATIONS = {
  /**
   * Version 1: Initial schema
   * - Adds schemaVersion field
   * - Ensures required arrays exist
   */
  1: (state) => {
    const migrated = { ...state };

    // Ensure tokens array exists
    if (!migrated.tokens) {
      migrated.tokens = [];
    }

    // Ensure measurements array exists
    if (!migrated.measurements) {
      migrated.measurements = [];
    }

    // Ensure fog array exists
    if (!migrated.fog) {
      migrated.fog = [];
    }

    // Add default grid settings if missing
    if (migrated.gridSize === undefined) {
      migrated.gridSize = 50;
    }
    if (migrated.showGrid === undefined) {
      migrated.showGrid = true;
    }

    // Add default pan/zoom if missing
    if (migrated.zoom === undefined) {
      migrated.zoom = 1;
    }
    if (migrated.panX === undefined) {
      migrated.panX = 0;
    }
    if (migrated.panY === undefined) {
      migrated.panY = 0;
    }

    migrated.schemaVersion = 1;
    return migrated;
  }
};

/**
 * Migrate battlemap state to the current schema version
 * @param {any} state - Battlemap state (possibly old format)
 * @returns {{data: import('../types.js').BattlemapState|null, migrated: boolean, fromVersion: number, warnings: string[]}}
 */
export function migrateBattlemap(state) {
  const warnings = [];

  if (!state || typeof state !== 'object') {
    return { data: null, migrated: false, fromVersion: 0, warnings: ['Invalid battlemap data'] };
  }

  const fromVersion = state.schemaVersion || 0;
  const targetVersion = CURRENT_SCHEMA_VERSIONS.battlemap;

  if (fromVersion >= targetVersion) {
    return { data: state, migrated: false, fromVersion, warnings };
  }

  if (fromVersion < MIN_SUPPORTED_VERSIONS.battlemap) {
    warnings.push(`Battlemap data is from schema version ${fromVersion}, which is older than minimum supported.`);
  }

  let migrated = { ...state };
  for (let version = fromVersion + 1; version <= targetVersion; version++) {
    const migrationFn = BATTLEMAP_MIGRATIONS[version];
    if (migrationFn) {
      try {
        migrated = migrationFn(migrated);
      } catch (err) {
        warnings.push(`Migration to version ${version} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return {
    data: migrated,
    migrated: true,
    fromVersion,
    warnings
  };
}

// ============================================================
// JOURNAL MIGRATIONS
// ============================================================

/**
 * Migration functions for journal entries
 * @type {Record<number, (entry: any) => any>}
 */
const JOURNAL_MIGRATIONS = {
  /**
   * Version 1: Initial schema
   * - Adds schemaVersion field
   * - Ensures timestamps exist
   */
  1: (entry) => {
    const migrated = { ...entry };

    // Ensure ID exists
    if (!migrated.id) {
      migrated.id = `journal_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Ensure timestamps exist
    if (!migrated.created) {
      migrated.created = new Date().toISOString();
    }
    if (!migrated.updated) {
      migrated.updated = migrated.created;
    }

    // Ensure title exists
    if (!migrated.title) {
      migrated.title = 'Untitled Entry';
    }

    // Ensure content exists
    if (migrated.content === undefined) {
      migrated.content = '';
    }

    migrated.schemaVersion = 1;
    return migrated;
  }
};

/**
 * Migrate journal entry to the current schema version
 * @param {any} entry - Journal entry (possibly old format)
 * @returns {{data: import('../types.js').JournalEntry|null, migrated: boolean, fromVersion: number, warnings: string[]}}
 */
export function migrateJournalEntry(entry) {
  const warnings = [];

  if (!entry || typeof entry !== 'object') {
    return { data: null, migrated: false, fromVersion: 0, warnings: ['Invalid journal entry'] };
  }

  const fromVersion = entry.schemaVersion || 0;
  const targetVersion = CURRENT_SCHEMA_VERSIONS.journal;

  if (fromVersion >= targetVersion) {
    return { data: entry, migrated: false, fromVersion, warnings };
  }

  if (fromVersion < MIN_SUPPORTED_VERSIONS.journal) {
    warnings.push(`Journal entry is from schema version ${fromVersion}, which is older than minimum supported.`);
  }

  let migrated = { ...entry };
  for (let version = fromVersion + 1; version <= targetVersion; version++) {
    const migrationFn = JOURNAL_MIGRATIONS[version];
    if (migrationFn) {
      try {
        migrated = migrationFn(migrated);
      } catch (err) {
        warnings.push(`Migration to version ${version} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return {
    data: migrated,
    migrated: true,
    fromVersion,
    warnings
  };
}

// ============================================================
// BULK MIGRATION HELPERS
// ============================================================

/**
 * Migrate an array of characters
 * @param {any[]} characters
 * @returns {{data: import('../types.js').Character[], migratedCount: number, warnings: string[]}}
 */
export function migrateCharacterList(characters) {
  if (!Array.isArray(characters)) {
    return { data: [], migratedCount: 0, warnings: ['Invalid character list'] };
  }

  const allWarnings = [];
  let migratedCount = 0;

  const migratedData = characters
    .map((char, index) => {
      const result = migrateCharacter(char);
      if (result.migrated) {
        migratedCount++;
      }
      if (result.warnings.length > 0) {
        allWarnings.push(`Character ${index + 1} (${char.name || 'unnamed'}): ${result.warnings.join(', ')}`);
      }
      return result.data;
    })
    .filter((char) => char !== null);

  return {
    data: migratedData,
    migratedCount,
    warnings: allWarnings
  };
}

/**
 * Check if data needs migration
 * @param {any} data
 * @param {'character'|'battlemap'|'journal'} type
 * @returns {boolean}
 */
export function needsMigration(data, type) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const currentVersion = data.schemaVersion || 0;
  const targetVersion = CURRENT_SCHEMA_VERSIONS[type];
  return currentVersion < targetVersion;
}

/**
 * Get migration info for data
 * @param {any} data
 * @param {'character'|'battlemap'|'journal'} type
 * @returns {{needsMigration: boolean, currentVersion: number, targetVersion: number, isSupported: boolean}}
 */
export function getMigrationInfo(data, type) {
  const currentVersion = data?.schemaVersion || 0;
  const targetVersion = CURRENT_SCHEMA_VERSIONS[type];
  const minVersion = MIN_SUPPORTED_VERSIONS[type];

  return {
    needsMigration: currentVersion < targetVersion,
    currentVersion,
    targetVersion,
    isSupported: currentVersion >= minVersion
  };
}
