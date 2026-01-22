/**
 * Validation Module
 * Pure functions for validating D&D 5e character data
 * Extracted for testability
 */

/**
 * Validate character name
 * @param {string} name - Character name
 * @returns {Object} - {valid: boolean, error: string|null}
 */
export function validateCharacterName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Name cannot exceed 100 characters' };
  }

  return { valid: true, error: null };
}

/**
 * Validate ability score
 * @param {number} score - Ability score
 * @param {string} abilityName - Name of the ability (for error messages)
 * @returns {Object} - {valid: boolean, error: string|null}
 */
export function validateAbilityScore(score, abilityName = 'Ability') {
  const num = Number(score);

  if (isNaN(num)) {
    return { valid: false, error: `${abilityName} must be a number` };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, error: `${abilityName} must be a whole number` };
  }

  if (num < 1) {
    return { valid: false, error: `${abilityName} cannot be less than 1` };
  }

  if (num > 30) {
    return { valid: false, error: `${abilityName} cannot exceed 30` };
  }

  return { valid: true, error: null };
}

/**
 * Validate all ability scores
 * @param {Object} abilities - {str, dex, con, int, wis, cha}
 * @returns {Object} - {valid: boolean, errors: Object}
 */
export function validateAllAbilityScores(abilities) {
  const abilityNames = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma'
  };

  const errors = {};
  let valid = true;

  for (const [key, name] of Object.entries(abilityNames)) {
    const result = validateAbilityScore(abilities?.[key], name);
    if (!result.valid) {
      errors[key] = result.error;
      valid = false;
    }
  }

  return { valid, errors };
}

/**
 * Validate character level
 * @param {number} level - Character level
 * @returns {Object} - {valid: boolean, error: string|null}
 */
export function validateLevel(level) {
  const num = Number(level);

  if (isNaN(num)) {
    return { valid: false, error: 'Level must be a number' };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Level must be a whole number' };
  }

  if (num < 1) {
    return { valid: false, error: 'Level cannot be less than 1' };
  }

  if (num > 20) {
    return { valid: false, error: 'Level cannot exceed 20' };
  }

  return { valid: true, error: null };
}

/**
 * Validate hit points
 * @param {number} currentHP - Current HP
 * @param {number} maxHP - Maximum HP
 * @returns {Object} - {valid: boolean, errors: string[]}
 */
export function validateHitPoints(currentHP, maxHP) {
  const errors = [];

  const current = Number(currentHP);
  const max = Number(maxHP);

  if (isNaN(max) || max < 1) {
    errors.push('Maximum HP must be at least 1');
  }

  if (isNaN(current)) {
    errors.push('Current HP must be a number');
  } else if (current < 0) {
    errors.push('Current HP cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate armor class
 * @param {number} ac - Armor class
 * @returns {Object} - {valid: boolean, error: string|null}
 */
export function validateArmorClass(ac) {
  const num = Number(ac);

  if (isNaN(num)) {
    return { valid: false, error: 'AC must be a number' };
  }

  if (num < 1) {
    return { valid: false, error: 'AC cannot be less than 1' };
  }

  if (num > 30) {
    return { valid: false, error: 'AC cannot exceed 30 (typical maximum)' };
  }

  return { valid: true, error: null };
}

/**
 * List of valid D&D 5e classes
 */
export const VALID_CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
  'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
  'Warlock', 'Wizard', 'Artificer'
];

/**
 * List of valid D&D 5e races
 */
export const VALID_RACES = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf',
  'Half-Orc', 'Tiefling', 'Dragonborn', 'Aasimar', 'Goliath',
  'Tabaxi', 'Kenku', 'Triton', 'Firbolg', 'Lizardfolk',
  'Goblin', 'Hobgoblin', 'Bugbear', 'Kobold', 'Orc',
  'Yuan-ti', 'Tortle', 'Aarakocra', 'Genasi', 'Warforged',
  'Changeling', 'Shifter', 'Kalashtar', 'Custom'
];

/**
 * Validate class selection
 * @param {string} className - Class name
 * @returns {Object} - {valid: boolean, error: string|null}
 */
export function validateClass(className) {
  if (!className || typeof className !== 'string') {
    return { valid: false, error: 'Class is required' };
  }

  const trimmed = className.trim();

  // Allow subclass notation like "Fighter (Champion)"
  const baseClass = trimmed.split('(')[0].trim();

  if (!VALID_CLASSES.includes(baseClass)) {
    return { valid: false, error: `'${baseClass}' is not a valid class` };
  }

  return { valid: true, error: null };
}

/**
 * Validate race selection
 * @param {string} raceName - Race name
 * @returns {Object} - {valid: boolean, error: string|null}
 */
export function validateRace(raceName) {
  if (!raceName || typeof raceName !== 'string') {
    return { valid: false, error: 'Race is required' };
  }

  const trimmed = raceName.trim();

  // Allow subrace notation like "Elf (High)"
  const baseRace = trimmed.split('(')[0].trim();

  // Be permissive - allow custom races
  if (baseRace.length === 0) {
    return { valid: false, error: 'Race cannot be empty' };
  }

  return { valid: true, error: null };
}

/**
 * Validate complete character object
 * @param {Object} character - Character data
 * @returns {Object} - {valid: boolean, errors: Object}
 */
export function validateCharacter(character) {
  const errors = {};
  let valid = true;

  if (!character || typeof character !== 'object') {
    return { valid: false, errors: { _general: 'Invalid character data' } };
  }

  // Name validation
  const nameResult = validateCharacterName(character.name);
  if (!nameResult.valid) {
    errors.name = nameResult.error;
    valid = false;
  }

  // Level validation
  const levelResult = validateLevel(character.level);
  if (!levelResult.valid) {
    errors.level = levelResult.error;
    valid = false;
  }

  // Class validation (if provided)
  if (character.charClass || character.class) {
    const classResult = validateClass(character.charClass || character.class);
    if (!classResult.valid) {
      errors.class = classResult.error;
      valid = false;
    }
  }

  // Race validation (if provided)
  if (character.race) {
    const raceResult = validateRace(character.race);
    if (!raceResult.valid) {
      errors.race = raceResult.error;
      valid = false;
    }
  }

  // Ability scores validation (if stats object exists)
  if (character.stats) {
    const statsResult = validateAllAbilityScores(character.stats);
    if (!statsResult.valid) {
      errors.stats = statsResult.errors;
      valid = false;
    }
  }

  // HP validation (if provided)
  if (character.maxHP !== undefined) {
    const hpResult = validateHitPoints(character.currentHP, character.maxHP);
    if (!hpResult.valid) {
      errors.hp = hpResult.errors;
      valid = false;
    }
  }

  return { valid, errors };
}

/**
 * Sanitize character name for file exports
 * @param {string} name - Character name
 * @returns {string} - Sanitized name safe for filenames
 */
export function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') return 'character';

  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
    .replace(/\s+/g, '-')         // Replace spaces with dashes
    .substring(0, 50)             // Limit length
    || 'character';
}
