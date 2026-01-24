/**
 * Type Definitions for The DM's Toolbox
 * JSDoc typedefs for core data structures
 *
 * Usage: Import this file to get type hints in your editor
 * @example
 * // At top of your module:
 * // @ts-check
 * /// <reference path="./types.js" />
 */

// ============================================================
// ABILITY SCORES & SKILLS
// ============================================================

/**
 * Six ability scores
 * @typedef {Object} AbilityScores
 * @property {number} str - Strength (1-30)
 * @property {number} dex - Dexterity (1-30)
 * @property {number} con - Constitution (1-30)
 * @property {number} int - Intelligence (1-30)
 * @property {number} wis - Wisdom (1-30)
 * @property {number} cha - Charisma (1-30)
 */

/**
 * Ability modifiers (derived from scores)
 * @typedef {Object} AbilityModifiers
 * @property {number} str - Strength modifier
 * @property {number} dex - Dexterity modifier
 * @property {number} con - Constitution modifier
 * @property {number} int - Intelligence modifier
 * @property {number} wis - Wisdom modifier
 * @property {number} cha - Charisma modifier
 */

/**
 * Single skill entry
 * @typedef {Object} SkillEntry
 * @property {boolean} prof - Is proficient
 * @property {boolean} exp - Has expertise (double proficiency)
 * @property {number} bonus - Total skill bonus
 */

/**
 * All skills
 * @typedef {Object} Skills
 * @property {SkillEntry} [acrobatics]
 * @property {SkillEntry} [animalHandling]
 * @property {SkillEntry} [arcana]
 * @property {SkillEntry} [athletics]
 * @property {SkillEntry} [deception]
 * @property {SkillEntry} [history]
 * @property {SkillEntry} [insight]
 * @property {SkillEntry} [intimidation]
 * @property {SkillEntry} [investigation]
 * @property {SkillEntry} [medicine]
 * @property {SkillEntry} [nature]
 * @property {SkillEntry} [perception]
 * @property {SkillEntry} [performance]
 * @property {SkillEntry} [persuasion]
 * @property {SkillEntry} [religion]
 * @property {SkillEntry} [sleightOfHand]
 * @property {SkillEntry} [stealth]
 * @property {SkillEntry} [survival]
 */

/**
 * Saving throw entry
 * @typedef {Object} SaveEntry
 * @property {boolean} prof - Is proficient
 * @property {number} bonus - Total save bonus
 */

/**
 * All saving throws
 * @typedef {Object} SavingThrows
 * @property {SaveEntry} str
 * @property {SaveEntry} dex
 * @property {SaveEntry} con
 * @property {SaveEntry} int
 * @property {SaveEntry} wis
 * @property {SaveEntry} cha
 */

// ============================================================
// CLASS & LEVEL
// ============================================================

/**
 * Single class level entry (for multiclass tracking)
 * @typedef {Object} ClassLevel
 * @property {string} className - Class name (e.g., "Fighter", "Wizard")
 * @property {string} [subclass] - Subclass name (e.g., "Champion", "Evocation")
 * @property {number} level - Levels in this class (1-20)
 * @property {number} [subclassLevel] - Level at which subclass was chosen
 * @property {number} [hitDie] - Hit die size (e.g., 10 for d10)
 */

/**
 * Caster type for spell slot calculation
 * @typedef {'full' | 'half' | 'third' | 'pact' | 'artificer' | 'none'} CasterType
 */

// ============================================================
// SPELLS
// ============================================================

/**
 * Spell data structure
 * @typedef {Object} Spell
 * @property {string} title - Spell name
 * @property {number} level - Spell level (0 for cantrip, 1-9 for leveled)
 * @property {string} school - School of magic (e.g., "Evocation", "Necromancy")
 * @property {string} casting_time - Casting time (e.g., "1 action", "1 bonus action")
 * @property {string} range - Range (e.g., "60 ft", "Self", "Touch")
 * @property {string} components - Components (e.g., "V,S,M")
 * @property {string} duration - Duration (e.g., "Instantaneous", "1 hour")
 * @property {boolean} concentration - Requires concentration
 * @property {string[]} classes - Classes that can cast this spell
 * @property {string} body - Spell description
 * @property {string[]} [tags] - Tags for filtering (e.g., "damage", "healing")
 */

/**
 * Character's known/prepared spell
 * @typedef {Object} CharacterSpell
 * @property {string} name - Spell name
 * @property {number} level - Spell level
 * @property {boolean} [prepared] - Is prepared (for prepared casters)
 * @property {boolean} [alwaysPrepared] - Always prepared (domain/oath spells)
 * @property {string} [source] - Source (e.g., "Cleric", "Domain: Life")
 */

/**
 * Spell slots tracking
 * @typedef {Object} SpellSlots
 * @property {number} [1] - 1st level slots (max/current)
 * @property {number} [2] - 2nd level slots
 * @property {number} [3] - 3rd level slots
 * @property {number} [4] - 4th level slots
 * @property {number} [5] - 5th level slots
 * @property {number} [6] - 6th level slots
 * @property {number} [7] - 7th level slots
 * @property {number} [8] - 8th level slots
 * @property {number} [9] - 9th level slots
 */

/**
 * Pact magic slots (Warlock)
 * @typedef {Object} PactSlots
 * @property {number} level - Pact slot level
 * @property {number} max - Maximum pact slots
 * @property {number} used - Used pact slots
 */

// ============================================================
// ATTACKS & INVENTORY
// ============================================================

/**
 * Attack entry
 * @typedef {Object} Attack
 * @property {string} name - Attack name (e.g., "Longsword")
 * @property {string} [attackBonus] - Attack bonus (e.g., "+5")
 * @property {string} damage - Damage (e.g., "1d8+3 slashing")
 * @property {string} [damageType] - Damage type (e.g., "slashing")
 * @property {string} [range] - Range (e.g., "5 ft", "60/120 ft")
 * @property {string} [properties] - Properties (e.g., "versatile, finesse")
 * @property {string} [notes] - Additional notes
 */

/**
 * Inventory item
 * @typedef {Object} InventoryItem
 * @property {string} name - Item name
 * @property {number} [quantity] - Quantity (default 1)
 * @property {number} [weight] - Weight in pounds
 * @property {string} [notes] - Item notes
 * @property {boolean} [equipped] - Is equipped
 * @property {boolean} [attuned] - Is attuned (magic items)
 */

/**
 * Currency
 * @typedef {Object} Currency
 * @property {number} cp - Copper pieces
 * @property {number} sp - Silver pieces
 * @property {number} ep - Electrum pieces
 * @property {number} gp - Gold pieces
 * @property {number} pp - Platinum pieces
 */

// ============================================================
// RESOURCES & CONDITIONS
// ============================================================

/**
 * Class resource (e.g., Rage, Ki, Sorcery Points)
 * @typedef {Object} Resource
 * @property {string} name - Resource name
 * @property {number} current - Current uses
 * @property {number} max - Maximum uses
 * @property {string} [recharge] - Recharge timing (e.g., "short rest", "long rest")
 */

/**
 * Death saves tracking
 * @typedef {Object} DeathSaves
 * @property {number} successes - Number of successes (0-3)
 * @property {number} failures - Number of failures (0-3)
 * @property {boolean} [stable] - Is stable (3 successes)
 */

// ============================================================
// CHARACTER
// ============================================================

/**
 * Complete character data structure
 * @typedef {Object} Character
 * @property {number} schemaVersion - Schema version (current: 2)
 * @property {string} id - Unique character ID
 * @property {string} name - Character name
 * @property {string} [playerName] - Player's name
 * @property {string} [race] - Character race
 * @property {string} [charClass] - Primary class (for display)
 * @property {string} [subclass] - Primary subclass
 * @property {number} [subclassLevel] - Level subclass was chosen
 * @property {string} [background] - Background
 * @property {number} level - Total character level (1-20)
 * @property {string} [alignment] - Alignment
 * @property {boolean} [multiclass] - Is multiclassed
 * @property {ClassLevel[]} [classes] - All class levels
 *
 * @property {number} ac - Armor class
 * @property {number} maxHP - Maximum hit points
 * @property {number} currentHP - Current hit points
 * @property {number} [tempHP] - Temporary hit points
 * @property {number} [speed] - Walking speed in feet
 * @property {number} [initMod] - Initiative modifier
 *
 * @property {AbilityScores} stats - Ability scores
 * @property {AbilityModifiers} [statMods] - Ability modifiers (derived)
 * @property {Skills} [skills] - Skill proficiencies and bonuses
 * @property {SavingThrows} [savingThrows] - Saving throw proficiencies
 *
 * @property {string} [spellcastingAbility] - Spellcasting ability (e.g., "int", "wis", "cha")
 * @property {SpellSlots} [spellSlots] - Spell slots per level
 * @property {PactSlots} [pactSlots] - Pact magic slots
 * @property {CharacterSpell[]} [spellList] - Known/prepared spells
 *
 * @property {string} [conditions] - Current conditions
 * @property {boolean} [inspiration] - Has inspiration
 * @property {boolean} [concentrating] - Is concentrating
 * @property {string} [concentrationSpell] - Concentration spell name
 *
 * @property {Currency} [currency] - Currency
 * @property {string} [hitDice] - Hit dice notation (e.g., "5d10")
 * @property {number} [hitDiceRemaining] - Remaining hit dice
 * @property {Resource[]} [resources] - Class resources
 * @property {DeathSaves} [deathSaves] - Death save tracking
 * @property {number} [exhaustion] - Exhaustion level (0-6)
 *
 * @property {InventoryItem[]} [inventoryItems] - Inventory items
 * @property {string} [inventory] - Legacy inventory text
 * @property {Attack[]} [attacks] - Attacks
 * @property {string} [features] - Features and traits text
 * @property {string} [notes] - Character notes
 * @property {string} [portrait] - Portrait image (base64 or URL)
 * @property {string} [lastUpdated] - ISO timestamp of last update
 */

// ============================================================
// INITIATIVE TRACKER
// ============================================================

/**
 * Status effect/condition
 * @typedef {Object} StatusEffect
 * @property {string} name - Condition name (e.g., "Blinded", "Prone")
 * @property {string} [icon] - Emoji or icon
 * @property {number} [duration] - Duration in rounds (if tracked)
 */

/**
 * Initiative entry / combatant
 * @typedef {Object} InitiativeEntry
 * @property {string} id - Unique combatant ID
 * @property {string} name - Combatant name
 * @property {number} initiative - Initiative roll result
 * @property {number} [dexMod] - Dexterity modifier (for tiebreakers)
 * @property {number} ac - Armor class
 * @property {number} maxHp - Maximum hit points
 * @property {number} currentHp - Current hit points
 * @property {number} [tempHp] - Temporary hit points
 * @property {'player' | 'enemy' | 'ally' | 'neutral'} [type] - Combatant type
 * @property {StatusEffect[]} [status] - Active status effects
 * @property {string} [notes] - Combat notes
 * @property {DeathSaves} [deathSaves] - Death save tracking
 * @property {boolean} [concentrating] - Is concentrating
 * @property {string} [concentrationSpell] - Concentration spell name
 * @property {number} [exhaustion] - Exhaustion level
 * @property {number} [legendaryActions] - Legendary actions remaining
 * @property {number} [legendaryActionsMax] - Maximum legendary actions
 * @property {boolean} [hasLairAction] - Has lair action
 */

/**
 * Combat/encounter state
 * @typedef {Object} CombatState
 * @property {InitiativeEntry[]} combatants - All combatants
 * @property {number} currentTurn - Index of current combatant
 * @property {number} round - Current round number
 * @property {boolean} inCombat - Is combat active
 */

// ============================================================
// BATTLE MAP
// ============================================================

/**
 * Battle map token
 * @typedef {Object} BattlemapToken
 * @property {string} id - Token ID
 * @property {string} name - Token name/label
 * @property {number} x - X position (grid or pixels)
 * @property {number} y - Y position
 * @property {number} [size] - Token size in grid squares
 * @property {string} [color] - Token color
 * @property {string} [image] - Token image URL/base64
 * @property {'player' | 'enemy' | 'ally' | 'neutral'} [type] - Token type
 * @property {boolean} [hidden] - Hidden from players
 * @property {string} [notes] - Token notes
 * @property {number} [hp] - Current HP (if tracking)
 * @property {number} [maxHp] - Max HP
 * @property {StatusEffect[]} [conditions] - Active conditions
 */

/**
 * Measurement shape
 * @typedef {Object} MeasurementShape
 * @property {string} id - Shape ID
 * @property {'circle' | 'cone' | 'line' | 'square' | 'cube'} type - Shape type
 * @property {number} x - Origin X
 * @property {number} y - Origin Y
 * @property {number} [radius] - Radius (circle)
 * @property {number} [length] - Length (cone, line)
 * @property {number} [width] - Width (line, square)
 * @property {number} [angle] - Direction angle (cone)
 * @property {string} [color] - Shape color
 * @property {number} [opacity] - Opacity (0-1)
 */

/**
 * Fog of war shape
 * @typedef {Object} FogShape
 * @property {string} id - Shape ID
 * @property {'polygon' | 'rectangle' | 'circle'} type - Shape type
 * @property {Array<{x: number, y: number}>} [points] - Polygon points
 * @property {number} [x] - X position (rect/circle)
 * @property {number} [y] - Y position
 * @property {number} [width] - Width (rect)
 * @property {number} [height] - Height (rect)
 * @property {number} [radius] - Radius (circle)
 * @property {boolean} [revealed] - Is revealed
 */

/**
 * Battle map state
 * @typedef {Object} BattlemapState
 * @property {number} schemaVersion - Schema version (current: 1)
 * @property {string} [id] - Map ID
 * @property {string} [name] - Map name
 * @property {string} [backgroundImage] - Background image
 * @property {number} [gridSize] - Grid square size in pixels
 * @property {boolean} [showGrid] - Show grid
 * @property {BattlemapToken[]} tokens - All tokens
 * @property {MeasurementShape[]} [measurements] - Measurement shapes
 * @property {FogShape[]} [fog] - Fog of war shapes
 * @property {number} [zoom] - Zoom level
 * @property {number} [panX] - Pan X offset
 * @property {number} [panY] - Pan Y offset
 */

// ============================================================
// JOURNAL
// ============================================================

/**
 * Journal entry
 * @typedef {Object} JournalEntry
 * @property {number} schemaVersion - Schema version (current: 1)
 * @property {string} id - Entry ID
 * @property {string} title - Entry title
 * @property {string} content - Entry content (HTML from Quill)
 * @property {string} [plainText] - Plain text version
 * @property {string} [category] - Category/folder
 * @property {string[]} [tags] - Tags for filtering
 * @property {string} created - ISO timestamp of creation
 * @property {string} updated - ISO timestamp of last update
 * @property {boolean} [pinned] - Is pinned
 */

// ============================================================
// VALIDATION RESULTS
// ============================================================

/**
 * Validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Is valid
 * @property {string[]} errors - Error messages
 */

/**
 * Corruption check result
 * @typedef {Object} CorruptionCheckResult
 * @property {boolean} corrupted - Is corrupted
 * @property {string[]} issues - Issue descriptions
 */

// ============================================================
// DICE
// ============================================================

/**
 * Parsed dice notation
 * @typedef {Object} ParsedDice
 * @property {number} count - Number of dice
 * @property {number} sides - Sides per die
 * @property {number} modifier - Modifier to add
 * @property {number|null} keepHighest - Keep highest N dice
 * @property {number|null} keepLowest - Keep lowest N dice
 */

/**
 * Dice roll result
 * @typedef {Object} DiceRollResult
 * @property {string} notation - Original notation
 * @property {number[]} rolls - Individual die results
 * @property {number[]} kept - Kept dice (after keep highest/lowest)
 * @property {number} modifier - Modifier applied
 * @property {number} total - Final total
 * @property {boolean} [isCritical] - Rolled a 20 (d20 only)
 * @property {boolean} [isFumble] - Rolled a 1 (d20 only)
 */

// Export nothing - this file is just for type definitions
// The types are available via JSDoc references
