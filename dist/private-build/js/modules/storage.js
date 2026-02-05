// @ts-check
/// <reference path="../types.js" />

/**
 * Storage Module
 * Pure functions for character data storage operations
 * Designed with dependency injection for testability
 */

/**
 * Serialize character data for storage
 * @param {import('../types.js').Character} character - Character object
 * @returns {string|null} - JSON string or null if invalid
 */
export function serializeCharacter(character) {
  if (!character) return null;
  return JSON.stringify(character);
}

/**
 * Deserialize character data from storage
 * @param {string} jsonString - JSON string
 * @returns {import('../types.js').Character|null} - Character object or null if invalid
 */
export function deserializeCharacter(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') return null;
  try {
    const parsed = JSON.parse(jsonString);
    return typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
}

/**
 * Serialize character list for storage
 * @param {import('../types.js').Character[]} characters - Array of character objects
 * @returns {string} - JSON string
 */
export function serializeCharacterList(characters) {
  if (!Array.isArray(characters)) return '[]';
  return JSON.stringify(characters);
}

/**
 * Deserialize character list from storage
 * @param {string} jsonString - JSON string
 * @returns {import('../types.js').Character[]} - Array of character objects (empty if invalid)
 */
export function deserializeCharacterList(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Generate a unique character ID
 * @param {function} randomFn - Random function (for testing)
 * @returns {string} - Unique ID
 */
export function generateCharacterId(randomFn = Math.random) {
  const timestamp = Date.now().toString(36);
  const randomPart = randomFn().toString(36).substring(2, 9);
  return `char_${timestamp}_${randomPart}`;
}

/**
 * Validate character has required fields
 * @param {import('../types.js').Character} character - Character to validate
 * @returns {import('../types.js').ValidationResult} - Validation result
 */
export function validateCharacterForStorage(character) {
  const errors = [];

  if (!character || typeof character !== 'object') {
    return { valid: false, errors: ['Character must be an object'] };
  }

  if (!character.id) {
    errors.push('Character must have an id');
  }

  if (!character.name || typeof character.name !== 'string' || character.name.trim() === '') {
    errors.push('Character must have a name');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a storage adapter for localStorage (dependency injection pattern)
 * @param {Object} storage - Storage interface (localStorage-like)
 * @param {string} key - Storage key
 * @returns {Object} - Adapter with save/load/delete methods
 */
export function createLocalStorageAdapter(storage, key) {
  return {
    save(characters) {
      const json = serializeCharacterList(characters);
      storage.setItem(key, json);
      return true;
    },

    load() {
      const json = storage.getItem(key);
      return deserializeCharacterList(json);
    },

    saveOne(character) {
      const characters = this.load();
      const index = characters.findIndex(c => c.id === character.id);
      if (index >= 0) {
        characters[index] = character;
      } else {
        characters.push(character);
      }
      return this.save(characters);
    },

    deleteOne(characterId) {
      const characters = this.load();
      const filtered = characters.filter(c => c.id !== characterId);
      return this.save(filtered);
    },

    getOne(characterId) {
      const characters = this.load();
      return characters.find(c => c.id === characterId) || null;
    },

    clear() {
      storage.removeItem(key);
      return true;
    }
  };
}

/**
 * Migrate old format character data to new format
 * @param {Partial<import('../types.js').Character>} oldCharacter - Character in old format
 * @returns {import('../types.js').Character|null} - Character in new format
 */
export function migrateCharacterData(oldCharacter) {
  if (!oldCharacter) return null;

  const migrated = { ...oldCharacter };

  // Ensure ID exists
  if (!migrated.id) {
    migrated.id = generateCharacterId();
  }

  // Migrate old stat format to new format
  if (!migrated.stats && (migrated.str || migrated.strength)) {
    migrated.stats = {
      str: migrated.str || migrated.strength || 10,
      dex: migrated.dex || migrated.dexterity || 10,
      con: migrated.con || migrated.constitution || 10,
      int: migrated.int || migrated.intelligence || 10,
      wis: migrated.wis || migrated.wisdom || 10,
      cha: migrated.cha || migrated.charisma || 10
    };
  }

  // Ensure level is a number
  if (typeof migrated.level === 'string') {
    migrated.level = parseInt(migrated.level, 10) || 1;
  }

  // Add lastUpdated timestamp if missing
  if (!migrated.lastUpdated) {
    migrated.lastUpdated = new Date().toISOString();
  }

  return migrated;
}

/**
 * Check if character data appears corrupted
 * @param {import('../types.js').Character} character - Character to check
 * @returns {import('../types.js').CorruptionCheckResult} - Corruption check result
 */
export function checkCharacterCorruption(character) {
  const issues = [];

  if (!character || typeof character !== 'object') {
    return { corrupted: true, issues: ['Not a valid object'] };
  }

  // Check for circular references or too-deep nesting
  try {
    JSON.stringify(character);
  } catch (e) {
    issues.push('Contains circular references or is not serializable');
  }

  // Check for excessively large portrait data
  if (character.portrait && typeof character.portrait === 'string') {
    const sizeInMB = (character.portrait.length * 2) / (1024 * 1024);
    if (sizeInMB > 5) {
      issues.push(`Portrait data is very large (${sizeInMB.toFixed(2)} MB)`);
    }
  }

  // Check for undefined values that shouldn't be there
  if (character.name === undefined) {
    issues.push('Name is undefined');
  }

  return {
    corrupted: issues.length > 0,
    issues
  };
}
