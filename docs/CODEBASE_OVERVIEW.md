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
│   ├── combat-mode.js                 # Combat Mode card view (classic script)
│   ├── polymorph-notes.js             # Polymorph / True Polymorph note text (pure, ES module)
│   ├── character-portrait.js          # Portrait picture + edit dialog (ES module)
│   ├── character-send-to.js           # Send to Initiative Tracker / Battle Map + token preview (ES module)
│   ├── journal-export.js              # Journal export utilities
│   ├── indexed-db-storage.js          # IndexedDB storage layer
│   ├── rules-data.js                  # Rules reference data
│   └── modules/
│       ├── dice-engine.js             # THE dice implementation (classic script -> window.DiceEngine)
│       ├── dice.js                    # ES-module facade over dice-engine.js (named exports)
│       ├── validation.js              # D&D 5e data validation (wired into character.js
│       │                              #   import path as of 2026-09-18)
│       ├── character-calculations.js  # Character mechanics + derived-stat recalc
│       ├── Attack-rolls.js  # Attack feature bonuses, notation helpers
│       ├── character-spell-data.js    # Spell slot tables, normalization, search
│       ├── character-rest.js          # Short/long rest mechanics (wired into character.js)
│       ├── character-combat.js        # HP/death-save helpers (wired into character.js)
│       ├── character-xp.js            # XP tracking and thresholds (wired into character.js)
│       ├── initiative-calculations.js # Combat calculations — mostly NOT wired into
│       │                              #   initiative.js (classic script, can't import ES
│       │                              #   modules without breaking file:// support); see
│       │                              #   the module's own header comment for what is/isn't
│       ├── spell-utils.js             # Spell slot management
│       ├── content-pack-manager.js    # Content pack loading/merging
│       ├── content-pack-runtime.js    # Applies pack records to window data
│       ├── srd-content-filter.js      # SRD allowlist enforcement
│       └── export-utils.js            # Export formatting
│   # `storage.js`, `migrations.js`, `generators.js`, and `character/level-up-calculations.js`
│   # (below) were removed 2026-09-18 as dead code — created and unit-tested, but never
│   # imported by any live page or script. See ENGINEERING_ROADMAP.md Phase 2.3/2.4/3.2/7
│   # for what each was superseded by (indexed-db-storage.js, inline character.js
│   # normalization, the js/shop|loot|name|tavern subsystems, and data/srd/level-up-data.js
│   # respectively).
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
- `js/rules-data.js` - Rules reference data
- `data/srd/spells-data.js` - Spell database
- **Not actually imported** (verified 2026-09-18): `initiative.js` is a classic `<script>`,
  not `type="module"` — kept that way so `initiative.html` still works when opened via
  `file://`. It can't import `js/modules/initiative-calculations.js` (ES `export` syntax) or
  `js/modules/validation.js` without converting to a module and losing that. It has its own
  inline death-save/concentration-DC logic instead (its dice rolling is no longer inline: it uses
  the shared dice engine, `js/modules/dice-engine.js`, loaded by a plain <script> tag); see
  `js/modules/initiative-calculations.js`'s header comment for exactly what is/isn't
  verified-identical between the two.

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
- `js/modules/dice.js` - Dice rolling (ES-module facade over `dice-engine.js`)
- `js/modules/character-calculations.js` - D&D mechanics, `recalcDerivedStats`
- `js/modules/Attack-rolls.js` - Attack feature bonuses, notation helpers
- `js/modules/character-spell-data.js` - Spell slot tables, normalization, search
- `js/modules/character-rest.js` - Rest math (`calcSpellSaveDC`, `calcSpellAttackBonus`,
  `getConcentrationCheckDC`, `calcLongRestHitDiceRestored`, `rollHitDiceForHealing`)
- `js/modules/character-combat.js` - HP/death-save helpers (`applyDamageToHP`,
  `applyHealingToHP`, `setTempHP`, `getDeathSaveOutcome`, `parseAttackBonus`)
- `js/modules/character-xp.js` - XP threshold/progress math (`getXPForLevel`,
  `getXPProgressInfo`)
- `js/character/polymorph-notes.js` - Polymorph / True Polymorph note text (pure). `character.js` keeps the
  textarea and character handling and the `window.appendPolymorphNotesToSpellNotes` bridge for classic scripts
- `js/character/character-portrait.js` - the portrait on the sheet and its edit dialog (file/URL, zoom, drag); owns the
  dialog's working copy, the portrait itself stays on the character
- `js/character/character-send-to.js` - Send to the Initiative Tracker / Battle Map (stages
  `dmtools.pendingImport` / `dmtools.pendingBattleMapImport` in localStorage, then navigates) and the token preview
  dialog; `character.js` passes each module the few sheet functions it needs and calls their `wire*Events`
- `js/modules/validation.js` - `validateCharacter` on import (warns, doesn't block)
- `js/modules/export-utils.js` - Export formatting
- `js/indexed-db-storage.js` - Portrait storage
- `data/srd/spells-data.js` - Spell database
- `data/srd/level-up-data.js` - Class/feat data
- **Not a dependency** (removed 2026-09-18): `js/modules/storage.js` was listed here but was
  never actually imported — `character.js` reads/writes `localStorage`/IndexedDB directly.

**Note:** `character.js` is loaded as `type="module"` and imports from the modules above directly. `multiclass-ui.js` and `character-sheet-export.js` use `defer` to ensure correct load order.

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
- `js/modules/character-calculations.js` - Modifier calculations
- **Not a dependency** (corrected 2026-09-18): `js/modules/validation.js` was listed here but
  isn't imported — this file validates each creation step with its own inline `validate()`
  closures instead. `validation.js` is only actually used by `character.js`'s import path.

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
- `data/srd/level-up-data.js` - Feat/class data, and (`window.LevelUpData`) the live
  `calculateEffectiveCasterLevel`/`getMulticlassSpellSlots`/`checkMulticlassPrerequisites`
  multiclass math
- **Not a dependency**: `js/modules/level-up-calculations.js` was listed here but was never
  actually imported (it duplicated the `LevelUpData` math above with no live caller) — the
  module was removed 2026-09-18.

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
- `data/srd/level-up-data.js` (`window.LevelUpData`) - `checkMulticlassPrerequisites`,
  `getMulticlassSpellSlots`, `getWarlockPactSlots` (the genuinely-live multiclass math)
- **Not a dependency**: `js/modules/level-up-calculations.js`, removed 2026-09-18 — see
  `level-up-system.js` note above.

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

### combat-mode.js

**Location:** `/js/character/combat-mode.js`
**Loaded by:** `characters.html`

**Responsibilities:** the Combat Mode card view of the character sheet: the mode toggle (remembered in localStorage `dmCombatMode`), the live card, interactive HP, rolls from the card (dice rules come from `DiceEngine`), conditions, action economy, spell casting and the dice-history modal.

**Why it is a classic script:** its startup binds listeners and restores the saved mode while the page is still parsing, so it is included by a plain parser-blocking `<script src>` after the sheet markup and runs before `character.js` (a module) and the deferred scripts. Anything owned by `character.js` is used later, at event time, through guarded `window.*` lookups.

**Load order, dependencies and the globals it publishes:** see the header comment of `js/character/combat-mode.js`, which is the single reference for them. Do not duplicate that list here.

**Tests:** `tests/e2e/combat-mode.spec.js` (flows) and the Combat Mode block of `tests/e2e/dice-callers.spec.js` (dice results)

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

### dice-engine.js and dice.js

**Location:** `/js/modules/dice-engine.js` (the implementation) and `/js/modules/dice.js` (facade)

The one implementation of the app's dice rules. It owns dice semantics only (parsing, rolling,
modifiers, keep-highest/lowest, multi-term expressions, d20 advantage, Great Weapon Fighting
rerolls, Savage Attacker, critical-hit doubling, hit-dice healing). It knows nothing about the DOM,
logs, labels or characters; callers format the plain results.

**How each kind of caller reaches it:**
- Classic pages and scripts (`initiative.js`, `combat-mode.js` and the wizard /
  level-up scripts on `characters.html`, `encounterbuilder.html`) load
  `<script src="/js/modules/dice-engine.js">` before their own scripts and use `window.DiceEngine`.
  `dice-engine.js` is itself a classic script (an IIFE, no `export`), which is why `initiative.js`
  can stay a classic script.
- ES modules and tests (`character.js`, `character-rest.js`, `character-combat.js`) import the named
  exports of `dice.js`, which only re-exports `globalThis.DiceEngine`. It has no logic of its own.

**Exports (both routes):**
- `rollDie(sides, randomFn)`, `rollMultipleDice(count, sides, randomFn)`
- `parseDiceNotation(notation)` - one group: "2d6+3", "d8", "4d6kh3", "2d20kl1-1"
- `rollDiceNotation(notation, randomFn, { rerollLowDice, rollTwiceTakeBest })` - roll one group; returns `rolls`, `kept`, `total`, `twiceRoll`, crit/fumble flags
- `describeFeatureRoll(result)` - the " [SA: 11 vs 5] [GWF]" note for a feature roll
- `parseDiceExpression(expr)` / `rollDiceExpression(expr, randomFn)` - several terms: "2d6+1d4+3", "1d6-1d4", "4d6kh3", "5"
- `rollD20(mode, bonus, randomFn)` - the one entry point for normal / advantage / disadvantage d20 rolls
- Limits: `MAX_DICE_COUNT` (1000), `MAX_DIE_SIDES` (1,000,000) and `MAX_DICE_NOTATION_LENGTH` (200 characters of raw text, checked before any parsing so a long string is never scanned and many groups cannot add up to the same problem). Anything beyond a limit is invalid (rejected, never truncated or clamped).
- One validity rule for dice dimensions (whole numbers from 1 up to the limits) is shared by both parsers, `rollHitDice` and `rollMultipleDice`. The parsers and `rollHitDice` return null; `rollMultipleDice` is the low-level call and throws `RangeError`. `getCriticalHitNotation` returns null when doubling the dice would pass `MAX_DICE_COUNT`.
- `getCriticalHitNotation(notation)` - doubles the dice, keeps the modifier
- `rollHitDice(dieSize, count, conMod, randomFn)` - CON per die, minimum 1 HP per die
- `rollAbilityScore`, `rollAbilityScoreSet`, `createSeededRandom`

**Strict on purpose:** the engine accepts no text around the dice (`"1d8+3 slashing"` is invalid). Combat Mode alone drops recognized trailing damage words from older saved attacks before rolling and `console.warn`s when it does.

**Stays with the callers:** result text and history entries (`formatParts` in `initiative.js`, the
Combat Mode breakdown, the sheet's roll history), attack labels, prompts, feature lookup
(`Attack-rolls.js`). Not in the engine: `encounterbuilder.html`'s `avgDice()`, an average-damage
estimate rather than a roll.

**Dependencies:** None

---

### storage.js — REMOVED 2026-09-18

`/js/modules/storage.js` was created and unit-tested but never imported by any live page or
script — verified via exhaustive grep across `js/**/*.js` and every `.html` page's `<script>`
tags. The real, live storage layer for characters is `js/indexed-db-storage.js` (a separate,
unrelated implementation) plus direct `localStorage` reads/writes in `js/character/character.js`.
Deleted along with its dedicated unit and integration tests; no live behavior changed.

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
- `validateAllAbilityScores(abilities)` - All six scores
- `validateLevel(level)` - Level bounds (1-20)
- `validateClass(className, knownClasses?)` - Class allowlist check; `knownClasses` is
  injectable (see Dependencies) so homebrew classes from content packs validate too
- `validateRace(raceName)` - Permissive; just checks non-empty (custom races allowed)
- `validateHitPoints(currentHP, maxHP)`, `validateArmorClass(ac)`
- `validateCharacter(character, options?)` - Runs all of the above over a full character
- `sanitizeFilename(name)` - Filesystem-safe export filenames

**Dependencies:** None directly (this module must not touch `window`/`document` — enforced by
ESLint `no-restricted-globals` on `js/modules/**`). `validateClass`'s live-class-list check is
dependency-injected by its caller instead: `character.js` passes
`Object.keys(window.LevelUpData.CLASS_DATA)` when calling `validateCharacter` on import, so a
hardcoded fallback list doesn't reject homebrew content-pack classes.

**Wired in (as of 2026-09-18):** `character.js`'s `importCharactersFromFile` calls
`validateCharacter` on each imported character and warns (console + toast) on invalid data
without blocking the import — previously, malformed imports merged in completely silently.
`character-creation-wizard.js` does NOT use this module; it validates each step with its own
inline `validate()` closures, which already covers creation-time choices adequately.

---

### character-calculations.js

**Location:** `/js/modules/character-calculations.js`

**Responsibilities:**
- D&D 5e character mechanics calculations
- Ability modifiers from scores
- Proficiency bonus from level
- Skill bonuses with proficiency
- Armor Class calculation
- Passive perception and other passives
- Full derived-stat recalculation on a character object
- Concentration check DC, spell DC/attack bonus, encumbrance

**Exports:**
- `getAbilityModifier(score)` - (score - 10) / 2
- `getProficiencyBonus(level)` - Proficiency by total level
- `getSkillBonus(abilityScore, proficient, level, expertise)` - Skill modifier
- `getPassivePerception(wisdomScore, proficient, level, expertise)` - 10 + perception
- `recalcDerivedStats(char, skillConfigs, spellSlotsFn)` - Recalculates all derived fields on a plain character object (stat mods, prof bonus, save/skill bonuses, spell slot maxes, passive perception)
- `calculateConcentrationCheckDC(damage)` - max(10, floor(damage/2))
- `calculateEncumbrance(items, strScore)` - Carrying capacity and status
- `calculateSpellDC(level, abilityScore)` - 8 + profBonus + mod
- `calculateSpellAttackBonus(level, abilityScore)` - profBonus + mod
- `getBarbarianUnarmoredAC`, `getMonkUnarmoredAC`, `getArmoredAC` - AC variants
- `getLevel1HP`, `getLevelUpHP`, `getTotalHP`, `getMulticlassHP` - HP calculations

**Dependencies:** None

---

### Attack-rolls.js

**Location:** `/js/modules/Attack-rolls.js`

**Responsibilities:**
- Weapon attack feature bonuses (always-on)
- Dice notation manipulation
- Feature-aware damage rolling (GWF, Savage Attacker)
- Concentration spell bonus lookup data

**Exports:**
- `CONCENTRATION_ATTACK_BONUSES` - Data constant for Hex, Hunter's Mark, Spirit Shroud
- `getConcentrationAttackBonus(spellName)` - Returns bonus entry for a concentration spell
- `getAttackFeatureBonuses(char, attack)` - Dueling (+2 melee), GWF (reroll 1s/2s), Savage Attacker (roll twice), Improved Divine Smite (Paladin 11+)
- `addFlatBonusToNotation(notation, bonus)` - Bakes a flat bonus into a dice notation string

Rolling is not done here: `character.js` rolls through `dice.js` (the dice engine).

**Dependencies:** None

---

### character-spell-data.js

**Location:** `/js/modules/character-spell-data.js`

**Responsibilities:**
- Spell slot tables for all standard 5e classes
- Pact magic (Warlock) slot tables
- Spell entry normalization and enrichment
- Spell search/filtering

**Exports:**
- `getSpellSlotsForClassLevel(className, level)` - Returns slot array `[1st..9th]` for a class at a given level; null for non-casters/Warlocks
- `getPactMagicSlots(level)` - Returns `{ count, level }` for Warlock pact slots
- `normalizeSpellEntry(spellLike, lookupFn)` - Enriches a raw spell entry from the library; preserves `prepared`, `alwaysPrepared`, `higher_level_dice`
- `searchSpells(term, spellList)` - Filters by name, school, body, tags, class; caps at 25 results

**Dependencies:** None

---

### character-rest.js

**Location:** `/js/modules/character-rest.js`

**Responsibilities:**
- Short rest HP recovery and hit dice tracking
- Long rest full reset (HP, spell slots, pact slots, hit dice)
- Hit dice rolling for short rest healing

**Exports:**
- `applyShortRest(char, healAmount, diceSpent)` - Applies healing (capped at maxHP) and decrements hit dice remaining
- `applyLongRest(char)` - Restores HP to max, clears temp HP, resets all spell slot `used` to 0, resets pact slot `used` to 0, restores `floor(total/2)` hit dice (minimum 1)
- `rollHitDiceForHealing(sides, count, conMod, randomFn)` - The dice engine's `rollHitDice`, re-exported. Rolls hit dice with CON modifier; minimum 1 per die; injectable random function for tests
- `calcSpellSaveDC(profBonus, abilMod)`, `calcSpellAttackBonus(profBonus, abilMod)`,
  `getConcentrationCheckDC(damage)`, `calcLongRestHitDiceRestored(total, current)` - small
  pure math helpers

**Dependencies:** None

**Wired in (as of 2026-09-18):** `character.js` calls `rollHitDiceForHealing`,
`calcSpellSaveDC`, `calcSpellAttackBonus`, `getConcentrationCheckDC`, and
`calcLongRestHitDiceRestored` (see below) directly. `applyShortRest`/`applyLongRest`
themselves are NOT called — they take a plain character object, while `character.js`'s rest
handlers read/write DOM inputs directly, so they're not a drop-in fit for that call site.

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
- `sortByInitiative(combatants)`, `sortByInitiativeWithTieBreaker(combatants)` - Sort by initiative, optional DEX tiebreaker
- `processDeathSave(roll, currentSaves)` - Handle a rolled death save (nat 20/1 rules) — no live equivalent, see below
- `getConcentrationDC(damage)` - DC = max(10, floor(damage/2))
- `adjustHP(currentHP, maxHP, tempHP, amount)` - HP change with temp HP (heal capped at maxHP)
- `checkInstantDeath(overkillDamage, maxHP)` - Massive damage check — no live equivalent, see below

**Dependencies:** None

**Mostly NOT wired into `js/initiative.js`** (verified 2026-09-18, see the module's own header
comment): `initiative.js` is a classic `<script>` (not `type="module"`) so `initiative.html`
still works when opened via `file://`; this module's `export` syntax can't be parsed there.
- `getConcentrationDC` and `sortByInitiative` ARE verified byte-identical to `initiative.js`'s
  own inline logic (cross-referenced in comments on both sides), but manually kept in sync
  rather than imported.
- `processDeathSave` models a rolled d20 death save; the live UI uses manual +success/+failure
  pip buttons with no roll — not equivalent, not wired.
- `adjustHP`'s healing branch caps at maxHP; the live app intentionally lets healing exceed
  maxHP and raises maxHP to match (an "overheal raises max" house rule) — not equivalent.
- `checkInstantDeath`, `getInitiativeBonus`, and `sortByInitiativeWithTieBreaker` have no live
  counterpart at all — they model 5e rules (massive-damage instant death, DEX-mod initiative,
  tie-breaking) the app doesn't currently implement, not bugs to fix.

---

### level-up-calculations.js — REMOVED 2026-09-18

`/js/character/level-up-calculations.js` was created and unit-tested but never imported by any
live page or script — verified via exhaustive grep. The live multiclass math
(`canMulticlass`/`getCasterLevel`/`getSpellSlots` here) was independently reimplemented as
`checkMulticlassPrerequisites`/`calculateEffectiveCasterLevel`/`getMulticlassSpellSlots` in
`data/srd/level-up-data.js` (`window.LevelUpData`), which IS genuinely wired into
`level-up-system.js` and `multiclass-ui.js`. Before deletion: this module's one correctness
advantage — Fighter's OR-prerequisite (STR 13 **or** DEX 13) — was ported into
`LevelUpData.checkMulticlassPrerequisites` (the live version previously had no Fighter
prerequisite check at all), and test coverage was retargeted to the live `LevelUpData`
functions (`tests/unit/level-up-data-multiclass.test.js`). `getASICount`/`getTotalLevel` had
no live equivalent and were dropped entirely — multiclass ASI counting still isn't
implemented anywhere live, a minor pre-existing gap this change doesn't address.

Also found during retargeting: `LevelUpData.calculateEffectiveCasterLevel` has a live bug —
it skips any class whose `CLASS_DATA` entry has `spellcaster: false` (e.g. Fighter, Rogue)
*before* checking the Eldritch Knight/Arcane Trickster third-caster subclass condition, so
third-caster multiclass spell slots currently always compute as 0 instead of `floor(level/3)`.
Documented in `tests/integration/level-up.test.js`; not fixed as part of this change (out of
scope — a bug fix, not a duplicate-source-of-truth issue).

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

### generators.js — REMOVED 2026-09-18

`/js/modules/generators.js` was a small prototype (seeded RNG + pick/weighted-table helpers +
tiny hardcoded NPC/shop/loot/name/tavern tables) that predates the real per-domain generator
subsystems (`js/shop/`, `js/loot/`, `js/name/`, `js/tavern/`, and `npc.html`'s inline logic),
which are 10-1000x larger and were never actually superseded by it — verified via exhaustive
grep, it was never imported by any live page or script, and no content/algorithm in it was
missing from the live subsystems. Deleted along with its dedicated unit test; the fabricated
"cross-tool pipeline" test in `tests/integration/cross-tool.test.js` that chained this module
with the also-removed `storage.js`/`validation.js` was removed too (it tested a pipeline the
real app never wires together, not real cross-tool behavior).

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

Large data tables loaded as separate scripts. The public repo only ships SRD 5.2 (2024 PHB) data under `/data/srd/`; non-SRD payloads are expected to live in private packs (untracked) and register themselves at runtime via `SRDContentFilter`.

### spells-data.js

**Location:** `/data/srd/spells-data.js`
**Loaded by:** `initiative.html`, `characters.html`

**Contents:**
- `SPELLS_DATA` - SRD 5.2 spell database (public build)
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
│   ├── data/srd/level-up-data.js  (window.LevelUpData: also the live multiclass math —
│   │                                calculateEffectiveCasterLevel/getMulticlassSpellSlots/
│   │                                checkMulticlassPrerequisites/getWarlockPactSlots)
│   ├── character-creation-wizard.js
│   │   └── modules/character-calculations.js
│   │   (does NOT import modules/validation.js — has its own inline per-step validation)
│   ├── level-up-system.js
│   │   └── modules/character-calculations.js
│   │   └── data/srd/level-up-data.js (window.LevelUpData multiclass math, see above)
│   ├── multiclass-ui.js
│   │   └── data/srd/level-up-data.js (window.LevelUpData multiclass math, see above)
│   ├── character.js  [type="module"]
│   │   └── modules/dice.js  (facade over modules/dice-engine.js)
│   │   └── modules/character-calculations.js
│   │   └── modules/Attack-rolls.js
│   │   └── modules/character-spell-data.js
│   │   └── modules/character-rest.js       (rest/spell-DC math only, see module doc)
│   │   └── modules/character-combat.js     (HP/death-save helpers)
│   │   └── modules/character-xp.js         (XP threshold/progress math)
│   │   └── character/polymorph-notes.js    (Polymorph note text; pure)
│   │   └── character/character-portrait.js (portrait picture + edit dialog)
│   │   └── character/character-send-to.js  (send to tracker / battle map, token preview)
│   │   └── modules/validation.js           (import-time validation only)
│   │   └── modules/export-utils.js
│   │   (does NOT import modules/storage.js — reads/writes localStorage/IndexedDB directly)
│   └── character-sheet-export.js  [defer]
│       └── modules/export-utils.js
│
├── initiative.html
│   ├── site.js
│   ├── rules-data.js
│   ├── data/srd/spells-data.js
│   └── initiative.js  (classic <script>, NOT type="module" — kept that way so this page
│       │                still works via file://; can't import ES modules below without
│       │                losing that)
│       └── modules/dice-engine.js  (classic script, loaded by <script src> before initiative.js;
│                                    initiative.js uses window.DiceEngine, no inline dice logic)
│       └── modules/initiative-calculations.js  (mostly NOT imported — see module doc;
│                                                  getConcentrationDC/sortByInitiative are
│                                                  manually kept in sync, not imported)
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
    └── js/shop/, js/loot/, js/name/, js/tavern/ (each split data/engine/ui), npc.html's
        own inline logic — NOT modules/generators.js, which was removed 2026-09-18 as an
        unused prototype that predated these and was never wired to any of them

Core Modules (Logic Layer) - No DOM access
├── dice.js
├── validation.js
├── character-calculations.js
├── Attack-rolls.js
│   └── dice.js
├── character-spell-data.js
├── character-rest.js
├── character-combat.js
├── character-xp.js
├── initiative-calculations.js  (see note above: mostly unwired)
├── spell-utils.js
└── export-utils.js
    └── character-calculations.js

# Removed 2026-09-18 as dead code (created and unit-tested, never imported by live code):
#   storage.js, migrations.js, generators.js, character/level-up-calculations.js

Storage Layer
├── indexed-db-storage.js (IndexedDB — the real live storage layer)
└── localStorage (read/written directly by character.js; NOT via modules/storage.js,
    which never existed as a live dependency)
```

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0 | Initial codebase overview |
| 2026-03-07 | 1.1 | Added Attack-rolls.js, character-spell-data.js, character-rest.js; updated character.js dependencies and dependency graph to reflect 2.1.5 modularization; added character-combat.js, character-xp.js, migrations.js, content-pack modules to project structure |
