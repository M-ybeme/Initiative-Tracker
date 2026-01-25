# Codebase Overview

This document provides a comprehensive inventory of **The DM's Toolbox** codebase, documenting each major file, its responsibilities, globals it touches, and module dependencies.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Page-Level Scripts](#page-level-scripts)
- [Core Modules](#core-modules)
- [Data Files](#data-files)
- [Utility Files](#utility-files)
- [HTML Pages](#html-pages)
- [External Dependencies](#external-dependencies)
- [Dependency Graph](#dependency-graph)

---

## Project Structure

```
/
├── index.html              # Landing page
├── initiative.html         # Initiative Tracker
├── battlemap.html          # Battle Map (VTT)
├── characters.html         # Character Manager
├── journal.html            # Journal/Notes
├── encounterbuilder.html   # Encounter Builder
├── loot.html               # Loot Generator
├── tav.html                # Tavern Generator
├── npc.html                # NPC Generator
├── name.html               # Name Generator
├── shop.html               # Shop Generator
├── new.html                # Encounter Builder (alternate)
├── js/
│   ├── site.js                        # Global initialization
│   ├── initiative.js                  # Initiative Tracker UI
│   ├── character.js                   # Character Manager UI
│   ├── character-creation-wizard.js   # Character creation flow
│   ├── level-up-system.js             # Level-up UI and logic
│   ├── multiclass-ui.js               # Multiclass management modal
│   ├── character-sheet-export.js      # Export to PDF/PNG/Word
│   ├── journal-export.js              # Journal export utilities
│   ├── indexed-db-storage.js          # IndexedDB storage layer
│   ├── rules-data.js                  # Rules reference data
│   └── modules/
│       ├── dice.js                    # Dice rolling engine
│       ├── storage.js                 # Character serialization
│       ├── validation.js              # D&D 5e data validation
│       ├── character-calculations.js  # Character mechanics
│       ├── initiative-calculations.js # Combat calculations
│       ├── level-up-calculations.js   # Multiclass/leveling math
│       ├── spell-utils.js             # Spell slot management
│       ├── generators.js              # Random generation utilities
│       └── export-utils.js            # Export formatting
├── data/
│   ├── README.md                      # Data bundle conventions
│   ├── srd/
│   │   ├── spells-data.js             # SRD spell database
│   │   └── level-up-data.js           # SRD classes/feats/backgrounds
│   └── packs/
│       └── experimental/              # Placeholder for non-SRD packs
├── tests/                  # Test suites (unit, integration, E2E)
└── docs/                   # Documentation
```

---

## Page-Level Scripts

These scripts are loaded directly by HTML pages and contain UI logic.

### site.js

**Location:** `/js/site.js`
**Loaded by:** All pages (first script loaded)

**Responsibilities:**
- Defines `DM_TOOLBOX_BUILD` global with version info
- Initializes IndexedDB connection
- Sets up cross-tab synchronization
- Provides shared utilities for all pages
- Bootstraps `window.SRDContentFilter` (allowlist enforcement + `data-srd-block` observers)

**Globals:**
- `DM_TOOLBOX_BUILD` (version, build time, recent changes)
- `window.dmToolboxDB` (IndexedDB reference)

**Dependencies:** None (foundational script)

---

### initiative.js

**Location:** `/js/initiative.js`
**Loaded by:** `initiative.html`

**Responsibilities:**
- Combat tracking UI (add/remove combatants)
- Initiative order management and sorting
- Turn tracking and round counting
- Status effect management (conditions)
- Death save tracking and concentration checks
- HP adjustment with temporary HP support
- Lair action and legendary action tracking
- Rules/spells reference modal integration
- Import from Battle Map and Encounter Builder

**Globals:**
- `statusEffects` (condition definitions with icons)
- Uses localStorage keys: `dmtools.pendingInitiativeImport`

**Dependencies:**
- `js/modules/initiative-calculations.js` - Combat math
- `js/modules/dice.js` - Dice rolling
- `js/modules/validation.js` - Input validation
- `js/rules-data.js` - Rules reference data
- `data/srd/spells-data.js` - Spell database

---

### character.js

**Location:** `/js/character.js`
**Loaded by:** `characters.html`

**Responsibilities:**
- Character Manager UI (list, create, edit, delete)
- Character sheet rendering and editing
- Spell management (known spells, spell slots)
- Equipment and inventory management
- Ability scores and skill proficiencies
- Attack and damage calculations
- Character import/export coordination
- Integration with level-up and multiclass systems

**Globals:**
- Uses localStorage keys: `dmtoolboxCharactersV1`
- Uses IndexedDB for portrait storage

**Dependencies:**
- `js/modules/storage.js` - Serialization
- `js/modules/validation.js` - Data validation
- `js/modules/character-calculations.js` - D&D mechanics
- `js/modules/export-utils.js` - Export formatting
- `js/indexed-db-storage.js` - Portrait storage
- `data/srd/spells-data.js` - Spell database
- `data/srd/level-up-data.js` - Class/feat data

---

### character-creation-wizard.js

**Location:** `/js/character-creation-wizard.js`
**Loaded by:** `characters.html`

**Responsibilities:**
- Step-by-step character creation flow for new players
- Race and class selection with descriptions
- Ability score generation (standard array, point buy, roll)
- Background selection
- Starting equipment choices
- Guided spell selection for casters

**Globals:** None (self-contained module)

**Dependencies:**
- `data/srd/level-up-data.js` - Class and race data
- `js/modules/validation.js` - Input validation
- `js/modules/character-calculations.js` - Modifier calculations

---

### level-up-system.js

**Location:** `/js/level-up-system.js`
**Loaded by:** `characters.html`

**Responsibilities:**
- Level-up flow UI
- Feat selection interface
- Ability Score Improvement handling
- Class feature selection (subclass, etc.)
- Hit point increases (roll or average)
- New spell selection for casters

**Globals:** None

**Dependencies:**
- `js/modules/character-calculations.js` - Mechanics
- `js/modules/level-up-calculations.js` - Leveling math
- `data/srd/level-up-data.js` - Feat/class data

---

### multiclass-ui.js

**Location:** `/js/multiclass-ui.js`
**Loaded by:** `characters.html`

**Responsibilities:**
- Multiclass management modal
- Level allocation between classes
- Multiclass prerequisite validation
- Spell slot recalculation for multiclass

**Globals:** None

**Dependencies:**
- `js/modules/level-up-calculations.js` - Multiclass math

---

### character-sheet-export.js

**Location:** `/js/character-sheet-export.js`
**Loaded by:** `characters.html`

**Responsibilities:**
- Export character sheet to PDF format
- Export character sheet to PNG image
- Export character sheet to Word document
- Portrait embedding in exports
- Layout formatting for print

**Globals:** None

**Dependencies:**
- `js/modules/export-utils.js` - Formatting helpers
- External: jsPDF, html2canvas, docx

---

### journal-export.js

**Location:** `/js/journal-export.js`
**Loaded by:** `journal.html`

**Responsibilities:**
- Export Quill editor content to various formats
- PDF export with formatting
- Word document export
- Markdown export
- Plain text export

**Globals:** None

**Dependencies:**
- External: jsPDF, docx, Quill

---

### indexed-db-storage.js

**Location:** `/js/indexed-db-storage.js`
**Loaded by:** `characters.html`, `shop.html`, `battlemap.html`

**Responsibilities:**
- IndexedDB database management
- Character storage with large portrait support
- Battle map state persistence
- Shop preset storage
- Fallback to localStorage when needed
- Database versioning and migrations

**Globals:**
- `window.dmToolboxDB` (database reference)

**Dependencies:** None (foundational storage layer)

---

## Core Modules

Pure logic modules under `js/modules/`. These do not touch the DOM.

### dice.js

**Location:** `/js/modules/dice.js`

**Responsibilities:**
- Dice rolling with cryptographic randomness
- Dice notation parsing (e.g., "2d6+3")
- Multiple dice roll aggregation
- Advantage/disadvantage support

**Exports:**
- `rollDie(sides, randomFn)` - Roll a single die
- `parseDiceNotation(notation)` - Parse "XdY+Z" strings
- `rollMultipleDice(count, sides, randomFn)` - Roll multiple dice
- `rollDiceNotation(notation, randomFn)` - Parse and roll

**Dependencies:** None

---

### storage.js

**Location:** `/js/modules/storage.js`

**Responsibilities:**
- Character data serialization for storage
- Character data deserialization from storage
- Unique ID generation for characters
- Data validation before storage

**Exports:**
- `serializeCharacter(character)` - Prepare for storage
- `deserializeCharacter(data)` - Restore from storage
- `generateCharacterId()` - Create unique ID
- `validateCharacterForStorage(character)` - Validate structure

**Dependencies:** None

---

### validation.js

**Location:** `/js/modules/validation.js`

**Responsibilities:**
- D&D 5e data validation rules
- Character name validation
- Ability score range validation
- Level validation
- Input sanitization

**Exports:**
- `validateCharacterName(name)` - Name rules
- `validateAbilityScore(score)` - Score bounds (1-30)
- `validateAllAbilities(abilities)` - All six scores
- `validateLevel(level)` - Level bounds (1-20)
- `sanitizeString(str)` - XSS prevention

**Dependencies:** None

---

### character-calculations.js

**Location:** `/js/modules/character-calculations.js`

**Responsibilities:**
- D&D 5e character mechanics calculations
- Ability modifiers from scores
- Proficiency bonus from level
- Skill bonuses with proficiency
- Armor Class calculation
- Initiative bonus calculation
- Passive perception and other passives

**Exports:**
- `getAbilityModifier(score)` - (score - 10) / 2
- `getProficiencyBonus(level)` - Proficiency by total level
- `getSkillBonus(character, skill)` - Skill modifier
- `getPassivePerception(character)` - 10 + perception
- `calculateAC(character, equipment)` - AC from armor/DEX
- `calculateInitiative(character)` - Initiative modifier

**Dependencies:** None

---

### initiative-calculations.js

**Location:** `/js/modules/initiative-calculations.js`

**Responsibilities:**
- Combat-specific calculations
- Initiative sorting with tiebreakers
- Death save processing
- Concentration DC calculation
- HP adjustment with bounds checking
- Instant death detection

**Exports:**
- `sortByInitiative(combatants)` - Sort by initiative, DEX tiebreaker
- `processDeathSave(combatant, roll)` - Handle death save result
- `getConcentrationDC(damage)` - DC = max(10, damage/2)
- `adjustHP(combatant, amount)` - HP change with temp HP
- `checkInstantDeath(combatant, damage)` - Massive damage check

**Dependencies:** None

---

### level-up-calculations.js

**Location:** `/js/modules/level-up-calculations.js`

**Responsibilities:**
- Multiclass mechanics calculations
- Caster level for multiclass spell slots
- Spell slot calculation (multiclass rules)
- ASI count across classes
- Total level calculation
- Multiclass prerequisite checking

**Exports:**
- `canMulticlass(character, newClass)` - Check prerequisites
- `getCasterLevel(classes)` - Combined caster level
- `getSpellSlots(classes)` - Slot array by level
- `getASICount(classes)` - Total ASIs earned
- `getTotalLevel(classes)` - Sum of all class levels

**Dependencies:** None

---

### spell-utils.js

**Location:** `/js/modules/spell-utils.js`

**Responsibilities:**
- Spell slot management
- Slot usage and restoration
- Spell filtering by class/level
- Pact magic slot handling

**Exports:**
- `FULL_CASTER_SLOTS` - Slot table for full casters
- `PACT_MAGIC_SLOTS` - Warlock slot table
- `useSpellSlot(slots, level)` - Consume a slot
- `restoreSpellSlots(character, restType)` - Short/long rest
- `filterSpells(spells, criteria)` - Filter spell list

**Dependencies:** None

---

### generators.js

**Location:** `/js/modules/generators.js`

**Responsibilities:**
- Seeded random number generation
- Random selection from arrays
- Weighted table rolling
- Multiple unique random selections

**Exports:**
- `createSeededRandom(seed)` - Deterministic RNG
- `pickRandom(array, randomFn)` - Pick one item
- `pickMultipleRandom(array, count, randomFn)` - Pick N unique
- `randomInt(min, max, randomFn)` - Random integer in range
- `rollOnWeightedTable(table, randomFn)` - Weighted selection

**Dependencies:** None

---

### export-utils.js

**Location:** `/js/modules/export-utils.js`

**Responsibilities:**
- Character data formatting for export
- Text representation generation
- HTML representation generation
- JSON export formatting
- Modifier formatting (+/-)

**Exports:**
- `formatModifier(mod)` - "+2" or "-1" format
- `generateCharacterText(character)` - Plain text sheet
- `generateCharacterHTML(character)` - HTML sheet
- `generateCharacterJSON(character)` - JSON export

**Dependencies:**
- `js/modules/character-calculations.js` - For derived values

---

## Data Files

Large data tables loaded as separate scripts. The public repo only ships SRD 5.1 data under `/data/srd/`; non-SRD payloads are expected to live in private packs (untracked) and register themselves at runtime via `SRDContentFilter`.

### spells-data.js

**Location:** `/data/srd/spells-data.js`
**Loaded by:** `initiative.html`, `characters.html`

**Contents:**
- `SPELLS_DATA` - SRD 5.1 spell database (public build)
- Each spell: title, level, school, casting time, range, components, duration, concentration, classes, description, tags
- Private content packs can register additional spells, but they never ship in this directory

**Size:** ~400 SRD spells

---

### rules-data.js

**Location:** `/js/rules-data.js`
**Loaded by:** `initiative.html`

**Contents:**
- `RULES_DATA` - Quick reference rules
- Categories: Vision, Travel, Combat, Conditions, Actions
- Each rule: title, body, tags

---

### level-up-data.js

**Location:** `/data/srd/level-up-data.js`
**Loaded by:** `characters.html`

**Contents:**
- `FEATS` - SRD feat subset with prerequisites (private packs extend this set)
- `CLASS_DATA` - Class progression tables for SRD classes
- `MULTICLASS_PREREQUISITES` - Ability requirements
- `CASTER_TYPES` - Full/half/third caster classification
- `MULTICLASS_SPELL_SLOTS` - Multiclass slot rules

---

## Utility Files

### Embedded Scripts (in HTML)

Several generators have their logic embedded directly in HTML files:

| File | Lines | Description |
|------|-------|-------------|
| `loot.html` | ~1625 | Loot generation tables and logic |
| `tav.html` | ~2288 | Tavern/inn generation |
| `npc.html` | ~1391 | NPC generation |
| `name.html` | ~800 | Name generation by culture |
| `shop.html` | ~1200 | Shop inventory generation |
| `battlemap.html` | ~3000 | Battle map canvas, tokens, fog |
| `encounterbuilder.html` | ~800 | Encounter assembly |

These could be candidates for extraction to modules in future refactoring.

---

## HTML Pages

| Page | URL | Purpose |
|------|-----|---------|
| Landing | `index.html` | Home page with tool links |
| Initiative | `initiative.html` | Combat/initiative tracking |
| Battle Map | `battlemap.html` | Virtual tabletop |
| Characters | `characters.html` | Character management |
| Journal | `journal.html` | Campaign notes |
| Encounter Builder | `encounterbuilder.html` | Build encounters |
| Loot Generator | `loot.html` | Random loot tables |
| Tavern Generator | `tav.html` | Random taverns/inns |
| NPC Generator | `npc.html` | Random NPCs |
| Name Generator | `name.html` | Random names |
| Shop Generator | `shop.html` | Random shop inventory |

---

## External Dependencies

### CDN Libraries

| Library | Version | Used By | Purpose |
|---------|---------|---------|---------|
| Bootstrap | 5.3.3 | All pages | UI framework |
| Bootstrap Icons | 1.11.3 | All pages | Icon set |
| Sortable.js | 1.15.0 | Initiative, Battle Map | Drag-and-drop |
| Quill | 1.3.7 | Journal | Rich text editor |
| jsPDF | 2.5.1 | Character, Journal | PDF generation |
| html2canvas | 1.4.1 | Character | Image capture |
| docx | 8.5.0 | Character, Journal | Word export |

### NPM Dev Dependencies

| Package | Purpose |
|---------|---------|
| vitest | Unit/integration testing |
| @playwright/test | E2E testing |
| @testing-library/dom | DOM testing utilities |
| happy-dom | DOM simulation for tests |
| husky | Git hooks |
| lint-staged | Run tasks on staged files |

---

## Dependency Graph

```
Pages (UI Layer)
├── characters.html
│   ├── site.js
│   ├── indexed-db-storage.js
│   ├── data/srd/spells-data.js
│   ├── data/srd/level-up-data.js
│   ├── character-creation-wizard.js
│   │   └── modules/validation.js
│   │   └── modules/character-calculations.js
│   ├── level-up-system.js
│   │   └── modules/character-calculations.js
│   │   └── modules/level-up-calculations.js
│   ├── multiclass-ui.js
│   │   └── modules/level-up-calculations.js
│   ├── character.js
│   │   └── modules/storage.js
│   │   └── modules/validation.js
│   │   └── modules/character-calculations.js
│   │   └── modules/export-utils.js
│   └── character-sheet-export.js
│       └── modules/export-utils.js
│
├── initiative.html
│   ├── site.js
│   ├── rules-data.js
│   ├── data/srd/spells-data.js
│   └── initiative.js
│       └── modules/initiative-calculations.js
│       └── modules/dice.js
│       └── modules/validation.js
│
├── journal.html
│   ├── site.js
│   └── journal-export.js
│
├── battlemap.html
│   ├── site.js
│   ├── indexed-db-storage.js
│   └── [embedded logic]
│
└── generators (loot, tav, npc, name, shop)
    ├── site.js
    └── [embedded logic using modules/generators.js]

Core Modules (Logic Layer) - No DOM access
├── dice.js
├── storage.js
├── validation.js
├── character-calculations.js
├── initiative-calculations.js
├── level-up-calculations.js
├── spell-utils.js
├── generators.js
└── export-utils.js
    └── character-calculations.js

Storage Layer
├── indexed-db-storage.js (IndexedDB)
└── localStorage (via modules/storage.js)
```

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0 | Initial codebase overview |
