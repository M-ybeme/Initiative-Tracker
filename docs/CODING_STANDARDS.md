# Coding Standards

This document defines the coding conventions for **The DM's Toolbox** codebase. These standards are derived from existing code patterns and serve to maintain consistency as the project grows.

---

## Table of Contents

- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Code Style](#code-style)
- [Comments & Documentation](#comments--documentation)
- [Error Handling](#error-handling)
- [Testing Patterns](#testing-patterns)
- [Logging & Console Usage](#logging--console-usage)

---

## SRD Content Scope

All first-party code, data, fixtures, and documentation must stick to the SRD allowlist. When adding examples, sample data, or inline comments, only reference open SRD entities (e.g., SRD classes, subclasses, monsters, items). Anything from proprietary books must live in a private content pack that stays out of this repo. The same rule applies to tests—fixtures should be either generated data or SRD-friendly stand-ins. If a feature needs optional premium data, gate it behind user-supplied imports and document that flow instead of committing the content here.

---

## File Organization

### File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Page scripts | `kebab-case.js` | `character.js`, `level-up-system.js` |
| Modules | `kebab-case.js` | `character-calculations.js`, `spell-utils.js` |
| Data files | `kebab-case.js` | `data/srd/spells-data.js`, `data/srd/level-up-data.js` |
| Tests | `*.test.js` | `dice.test.js`, `character-calculations.test.js` |

### Directory Structure

```
js/
├── [page].js              # Page-level scripts (touch DOM)
├── modules/
│   └── [domain].js        # Pure logic modules (no DOM)
└── ...

data/
└── srd/
  └── [feature]-data.js  # Large SRD tables loaded via script tags
```

### Module Types

**Core Modules** (`js/modules/`):
- Pure functions only - no DOM access
- Export individual functions (not classes)
- Accept dependencies as parameters for testability
- Example: `character-calculations.js`, `dice.js`

**Page Scripts** (`js/`):
- May access DOM and window
- Import from modules
- Handle event binding and UI updates
- Example: `character.js`, `initiative.js`

**Data Files** (`data/srd/`):
- Export data tables/constants
- Use IIFE with `window` assignment for global access
- Example: `data/srd/spells-data.js`, `data/srd/level-up-data.js`

---

## Naming Conventions

### Functions

Use `verbNoun` camelCase:

```javascript
// Good
getAbilityModifier(score)
calculateAC(character)
rollDie(sides)
parseNotation(str)
validateCharacterName(name)

// Avoid
ability_modifier(score)    // snake_case
ACCalculate(character)     // noun first
getDie(sides)              // unclear verb
```

Common verbs:
- `get` - retrieve/calculate a value
- `calculate` - compute derived value
- `roll` - dice-related
- `parse` - string parsing
- `validate` - input validation
- `serialize`/`deserialize` - storage conversion
- `format` - output formatting
- `filter`/`sort` - collection operations

### Variables

```javascript
// Local variables: camelCase
const dexMod = getAbilityModifier(dexScore);
let totalHP = 0;

// Boolean variables: use is/has/can prefix
const isProficient = true;
const hasShield = false;
const canMulticlass = true;

// Loop counters: single letter ok
for (let i = 0; i < count; i++) { }
```

### Constants

```javascript
// Module-level constants: UPPER_SNAKE_CASE
const FULL_CASTER_SLOTS = [...];
const MAX_ABILITY_SCORE = 30;
const DEFAULT_LEVEL = 1;

// Data tables: UPPER_SNAKE_CASE
const FEATS = { ... };
const CLASS_DATA = { ... };
const SPELLS_DATA = [ ... ];
```

### Parameters

```javascript
// Descriptive names, camelCase
function getSkillBonus(abilityScore, proficient, level, expertise = false) { }

// Dependency injection: suffix with Fn
function rollDie(sides, randomFn = Math.random) { }

// Object parameters: use clear names
function migrateCharacter(character) { }
function sortByInitiative(combatants) { }
```

---

## Code Style

### Variable Declarations

```javascript
// Prefer const for values that don't change
const profBonus = getProficiencyBonus(level);

// Use let only when reassignment is needed
let totalHP = 0;
for (const cls of classes) {
  totalHP += cls.hp;
}

// Never use var
```

### Array Methods vs Loops

Use array methods for transformations:

```javascript
// Good: clear intent
const sorted = rolls.sort((a, b) => b - a);
const kept = rolls.slice(0, keepCount);
const total = kept.reduce((sum, r) => sum + r, 0);

// Good: filtering
const casterClasses = classes.filter(c => c.spellcasting);
const spellNames = spells.map(s => s.name);
```

Use `for...of` for iteration with side effects or early exit:

```javascript
// Good: building up state
let totalHP = 0;
for (const cls of classes) {
  totalHP += calculateClassHP(cls);
}

// Good: early exit
for (const spell of spells) {
  if (spell.name === target) {
    return spell;
  }
}
```

### Guard Clauses

Use early returns to handle edge cases:

```javascript
// Good: guards at top
function getAbilityModifier(score) {
  const n = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.floor((n - 10) / 2);
}

function parseDiceNotation(notation) {
  if (!notation || typeof notation !== 'string') return null;
  // ... rest of logic
}
```

### Ternary Operator

Use for simple conditional values:

```javascript
// Good: simple condition
const count = match[1] ? parseInt(match[1], 10) : 1;
const ac = hasShield ? baseAC + 2 : baseAC;

// Avoid: complex conditions (use if/else)
// const result = a ? (b ? c : d) : (e ? f : g);
```

### String Handling

```javascript
// Template literals for interpolation
const message = `${character.name} rolled ${roll} for initiative`;

// Single quotes for simple strings
const key = 'dmtoolboxCharactersV1';

// Escape apostrophes in text
const description = 'You can\'t be surprised while conscious.';
```

---

## Comments & Documentation

### JSDoc for Exported Functions

All exported functions must have JSDoc:

```javascript
/**
 * Calculate ability modifier from ability score
 * @param {number} score - Ability score (1-30)
 * @returns {number} - Ability modifier
 */
export function getAbilityModifier(score) {
  // ...
}

/**
 * Roll dice from notation string
 * @param {string} notation - Dice notation (e.g., "2d6+3")
 * @param {function} randomFn - Random function (for testing)
 * @returns {Object|null} - {rolls, kept, modifier, total} or null if invalid
 */
export function rollDiceNotation(notation, randomFn = Math.random) {
  // ...
}
```

### File Headers

Each module should have a brief header:

```javascript
/**
 * Character Calculations Module
 * Pure functions for D&D 5e character calculations
 * Extracted for testability
 */
```

### Inline Comments

Use sparingly, only for non-obvious logic:

```javascript
// Good: explains why
const avgRoll = Math.floor(hitDie / 2) + 1; // Average roll rounded up (PHB rule)

// Good: clarifies complex logic
// Pattern: optional count, 'd', sides, optional keep (kh/kl + number), optional modifier
const match = cleanNotation.match(/^(\d*)d(\d+)(?:k(h|l)(\d+))?([+-]\d+)?$/);

// Avoid: stating the obvious
// const total = a + b; // Add a and b
```

### Section Comments

Use for grouping related constants in data files:

```javascript
// ============================================================
// FEATS DATA (PHB + Common Supplements)
// ============================================================
const FEATS = { ... };

// ============================================================
// CLASS PROGRESSION TABLES
// ============================================================
const CLASS_DATA = { ... };
```

---

## Error Handling

### Guard Returns

Prefer returning `null` or default values for invalid input:

```javascript
// Good: return null for invalid input
function parseDiceNotation(notation) {
  if (!notation || typeof notation !== 'string') return null;
  const match = cleanNotation.match(pattern);
  if (!match) return null;
  // ...
}

// Good: return safe default
function getAbilityModifier(score) {
  if (!Number.isFinite(n)) return 0;
  // ...
}
```

### Try/Catch

Use for operations that may throw (storage, parsing external data):

```javascript
// Good: wrap storage operations
function loadCharacter(id) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load character:', e);
    return null;
  }
}
```

### User-Facing Errors

Show user-friendly messages, log technical details:

```javascript
// Technical details to console
console.error('IndexedDB error:', event.target.error);

// User-friendly message to UI
showError('Failed to save character. Please try again.');
```

---

## Testing Patterns

### Dependency Injection for Testability

Accept dependencies as parameters with sensible defaults:

```javascript
// Production code uses Math.random by default
export function rollDie(sides, randomFn = Math.random) {
  return Math.floor(randomFn() * sides) + 1;
}

// Tests can inject deterministic functions
import { createSeededRandom } from './dice.js';
const seededRandom = createSeededRandom(12345);
const result = rollDie(20, seededRandom);
```

### Test File Location

```
js/modules/dice.js           -> tests/unit/dice.test.js
js/modules/storage.js        -> tests/unit/storage.test.js
js/character.js              -> tests/integration/character.test.js
```

### Test Naming

```javascript
describe('getAbilityModifier', () => {
  it('returns 0 for score of 10', () => { });
  it('returns -1 for score of 8', () => { });
  it('returns 0 for non-numeric input', () => { });
});
```

---

## Logging & Console Usage

### Allowed Console Usage

```javascript
// Errors: always log
console.error('Failed to load character:', error);

// Warnings: for recoverable issues
console.warn('Character has deprecated field, migrating...');
```

### Debug-Only Logging

Remove or comment out before committing:

```javascript
// Debug only - remove before commit
// console.log('Parsed notation:', parsed);
```

### Build Information

Use the global `DM_TOOLBOX_BUILD` for version info:

```javascript
// Access version info
console.log(`DM's Toolbox v${DM_TOOLBOX_BUILD.version}`);
```

---

## Summary Checklist

When writing new code:

- [ ] Functions use `verbNoun` camelCase naming
- [ ] Constants use `UPPER_SNAKE_CASE`
- [ ] All exported functions have JSDoc
- [ ] Module code doesn't touch DOM
- [ ] Guard clauses handle invalid input
- [ ] Dependencies are injectable for testing
- [ ] No `var` declarations (use `const`/`let`)
- [ ] No debug `console.log` statements committed

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0 | Initial coding standards |
