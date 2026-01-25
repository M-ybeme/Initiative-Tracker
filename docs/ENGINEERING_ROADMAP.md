# Engineering Improvements Roadmap

This document outlines a step-by-step roadmap for improving the internal engineering quality of **The DM’s Toolbox** without rewriting it in a new framework or language.

Each phase is broken into actionable tasks with checkboxes for tracking progress.

---

## Table of Contents

* [Overview](#overview)
* [Phase 1: Codebase Inventory & Standards](#phase-1-codebase-inventory--standards)
* [Phase 2: Module Architecture & Boundaries](#phase-2-module-architecture--boundaries)
* [Phase 3: Type Hygiene with JSDoc](#phase-3-type-hygiene-with-jsdoc)
* [Phase 4: Build & Asset Pipeline (Optional, Lightweight)](#phase-4-build--asset-pipeline-optional-lightweight)
* [Phase 5: Performance & Load Optimization](#phase-5-performance--load-optimization)
* [Phase 6: Error Handling & Diagnostic Tooling](#phase-6-error-handling--diagnostic-tooling)
* [Phase 7: Data & Schema Stability](#phase-7-data--schema-stability)
* [Phase 8: Developer Experience & Internal Docs](#phase-8-developer-experience--internal-docs)
* [Progress Tracking](#progress-tracking)
* [Revision History](#revision-history)

---

## Overview

### Current State

* **App Size:** ~45k lines of JavaScript across multiple tools (Character Manager, Initiative Tracker, Battle Map, Generators, Journal, etc.)
* **Architecture:**

  * Vanilla JS, HTML, and CSS (no framework)
  * Logic progressively extracted into ES modules under `js/modules/`
  * UI code still primarily page-specific (`character.js`, `initiative.js`, `battlemap.js`, etc.)
* **Testing:**

  * Comprehensive test suite (unit, integration, E2E) using Vitest + Playwright
  * Coverage targets enforced via CI
* **Build/Delivery:**

  * Static files, no bundler
  * Multi-page app hosted on Netlify
  * No backend, no user accounts, no telemetry

### Target State

* Clear, documented module boundaries (logic vs UI vs integration)
* Consistent coding standards and naming patterns
* JSDoc-based “soft typing” on all major data structures
* Optional lightweight bundling for script organisation and load performance
* Performance optimizations where they matter (initial load, heavy tools)
* Local-only error diagnostics to make debugging production issues easier
* Stable save formats with versioning and migration helpers
* Minimal friction for future you to maintain and extend features

### SRD Compliance Guardrails

Every phase assumes the shipped build only contains SRD-allowed data and copy. When scoping tasks, verify that:

* New modules read from the shared SRD allowlist (see `site.js` bootstrapping notes) and never embed protected lore or stat blocks.
* Documentation, comments, and UX strings stay generic or cite SRD entities exclusively.
* Private content packs live in downstream builds or user imports; their tooling (migration steps, bundling, QA) should be documented separately and kept out of the public repo.
* Any automation (linters, CI, generators) enforces or tests the SRD gating rules so future phases do not regress compliance.

---

## Phase 1: Codebase Inventory & Standards

**Goal:** Get a clean, documented view of the current codebase and set enforcement standards that match reality.

### 1.1 File & Responsibility Inventory

* [x] Create `docs/CODEBASE_OVERVIEW.md` summarizing major JS entry points:

  * [x] `character.js` – character sheet logic
  * [x] `character-creation-wizard.js` – wizard flow
  * [x] `level-up-system.js` – level-up flow
  * [x] `initiative.js` – initiative tracker
  * [x] `battlemap.js` – battle map logic
  * [x] `journal.js` – journal + Quill integration
  * [x] `loot.js`, `shop.js`, `tavern.js`, `npc.js`, `names.js` – generators
  * [x] `site.js` – shared navigation / global helpers
* [x] For each file, note:

  * [x] Main responsibilities
  * [x] Key globals it touches
  * [x] Which `js/modules/` files it depends on

### 1.2 Coding Standards & Conventions

* [x] Create `docs/CODING_STANDARDS.md`:

  * [x] Naming conventions for:

    * [x] Modules: `something-utils.js`, `*-calculations.js`, etc.
    * [x] Functions: `verbNoun` (`calculateAC`, `renderSpellList`)
    * [x] Constants: `UPPER_SNAKE_CASE`
    * [x] Data tables: `RACIAL_SPELLS`, `CLASS_RESOURCES`, etc.
  * [x] File naming for DOM-facing scripts vs module scripts:

    * [x] Page scripts: `initiative.js`, `character.js`
    * [x] Modules: `js/modules/{domain}.js`
  * [x] Comments policy:

    * [x] JSDoc for exported functions and core data types
    * [x] Inline comments only for non-obvious logic
* [x] Decide and document:

  * [x] Preferred array methods: map/filter/reduce vs loops
  * [x] Error handling pattern: `try/catch` vs guard returns
  * [x] `console.log` usage: what's allowed, what's "debug only"

### 1.3 Linting & Formatting

* [x] Add ESLint (minimal ruleset tailored to existing code):

  * [x] `npm install --save-dev eslint`
  * [x] Create `eslint.config.mjs` with relaxed but helpful rules:

    * [x] No unused vars (warning)
    * [x] No implicit globals (error)
    * [x] No re-declaration (error)
    * [x] Prefer `const`/`let` over `var` (error for var, warning for const)
* [x] Add Prettier (optional, but useful for consistency):

  * [x] `npm install --save-dev prettier`
  * [x] `.prettierrc` with agreed style (2 spaces, semicolons, etc.)
* [x] Hook into existing Husky pre-commit:

  * [x] Run ESLint on staged `.js` files
  * [x] Fail commits on errors (warnings allowed)

---

## Phase 2: Module Architecture & Boundaries

**Goal:** Make the separation between "pure logic", "integration glue", and "DOM/UI" explicit and consistent.

**Status:** Largely complete - architecture already exists, documented in Phase 1.

### 2.1 Module Categorization

* [x] ~~Create `docs/MODULE_STRUCTURE.md`~~ Documented in `docs/CODEBASE_OVERVIEW.md`:

  * [x] **Core logic modules** (pure-ish):

    * `dice.js`, `character-calculations.js`, `initiative-calculations.js`, `spell-utils.js`, `level-up-calculations.js`, `storage.js`, `validation.js`, `generators.js`, `export-utils.js`
  * [x] **Integration modules** (glue):

    * Cross-page data transfer via localStorage (documented in CODEBASE_OVERVIEW)
  * [x] **UI scripts**:

    * Page-level scripts documented with dependencies in CODEBASE_OVERVIEW

### 2.2 Enforce One-Way Dependencies

* [x] For each module under `js/modules/`:

  * [x] Ensure it does **not** import from page-level scripts - enforced via ESLint
  * [x] Ensure it does **not** touch `document`/`window` - enforced via ESLint `no-restricted-globals`
* [x] ~~Add a section to `MODULE_STRUCTURE.md`~~ Documented in `docs/CODING_STANDARDS.md`:

  * [x] "Core modules cannot depend on UI scripts"
  * [x] "UI scripts may depend on core modules, not vice versa"

### 2.3 Extract Remaining Logic Pockets

* [x] Identify "fat" page scripts with logic that should be modular:

  * [x] `character.js` – calculations already in `character-calculations.js`
  * [x] `initiative.js` – death saves, concentration DC, HP in `initiative-calculations.js`
  * [ ] `battlemap.js` – geometry/math still embedded (future candidate)
* [x] Existing extractions verified:

  * [x] Reusable logic already in `js/modules/`
  * [x] Unit tests exist (550 tests, 342 unit tests for modules)
  * [x] Page scripts focus on DOM/events, delegate to modules

---

## Phase 3: Type Hygiene with JSDoc

**Goal:** Introduce "soft typing" via JSDoc for critical data structures to catch mistakes early and improve IntelliSense.

### 3.1 Core Data Types

* [x] Create `js/types.js` with JSDoc typedefs:

  * [x] `@typedef {Object} Character` - Full character with abilities, classes, spells, inventory
  * [x] `@typedef {Object} ClassLevel` - Single class entry for multiclass
  * [x] `@typedef {Object} Spell` - Spell data structure
  * [x] `@typedef {Object} Attack` - Attack entry
  * [x] `@typedef {Object} InventoryItem` - Inventory item
  * [x] `@typedef {Object} InitiativeEntry` - Combatant in initiative tracker
  * [x] `@typedef {Object} JournalEntry` - Journal entry
  * [x] `@typedef {Object} BattlemapToken` - Battle map token
  * [x] `@typedef {Object} MeasurementShape` - Measurement shape
  * [x] Additional types: AbilityScores, Skills, DeathSaves, ParsedDice, DiceRollResult, etc.

### 3.2 Function Annotations

* [x] Annotate exported functions in core modules:

  * [x] `character-calculations.js` - Already had JSDoc, verified
  * [x] `level-up-calculations.js` - Already had JSDoc, verified
  * [x] `initiative-calculations.js` - Updated with typed annotations
  * [x] `storage.js` - Updated with Character, ValidationResult types
  * [x] `dice.js` - Updated with ParsedDice, DiceRollResult types

### 3.3 Editor & Tooling Support

* [x] Configure VS Code:

  * [x] Created `jsconfig.json` with `"checkJs": true` for `js/modules/`
  * [x] Type checking enabled for all modules
* [x] Adopted `@ts-check` on key modules:

  * [x] `js/modules/storage.js`
  * [x] `js/modules/dice.js`
  * [x] `js/modules/initiative-calculations.js`
  * [ ] Future: Add to remaining modules and high-value page scripts

---

## Phase 4: Build & Asset Pipeline (Optional, Lightweight)

**Goal:** Introduce a minimal build step that keeps development simple but lets you structure JS cleanly and improve load performance.

*(If you decide you don’t want this yet, you can leave this phase as “future enhancement.”)*

### 4.1 Select Minimal Bundler

* [ ] Choose **one**:

  * [ ] Vite
  * [ ] ESBuild
  * [ ] Rollup
* [ ] Create basic configuration:

  * [ ] Inputs: multiple entry points (one per page)
  * [ ] Outputs: `dist/js/{page}.js`

### 4.2 Script Loading Cleanup

* [ ] Replace multiple `<script>` tags per page with:

  * [ ] One built bundle per page, OR
  * [ ] A shared `core.js` + page-specific bundle
* [ ] Ensure:

  * [ ] Load order no longer depends on `<script>` tag order
  * [ ] Add `defer` where appropriate

### 4.3 Development Workflow

* [ ] Add npm scripts:

  * [ ] `"build": "vite build"` (or equivalent)
  * [ ] `"dev": "vite"`
* [ ] Ensure tests run against built output where appropriate, or:

  * [ ] Keep tests pointing at source but confirm build doesn’t break imports

---

## Phase 5: Performance & Load Optimization

**Goal:** Make sure the app remains fast and responsive on mid-range hardware and slower networks, especially for large character sheets and battle map sessions.

### 5.1 Performance Profiling

* [ ] Identify key flows to profile:

  * [ ] Initial character sheet load
  * [ ] Large character export
  * [ ] Battle map with many tokens, fog shapes, and measurements
  * [ ] Initiative tracker with many combatants
* [ ] Use browser DevTools Performance tab to:

  * [ ] Record each scenario
  * [ ] Note long tasks (>50ms)
  * [ ] Identify hot functions / render loops

### 5.2 Static Data Optimizations

* [ ] Audit large data structures:

  * [ ] `SPELLS`, `RACIAL_FEATURES`, `BEAST_FORMS`, `SUBCLASS_SPELLS`, etc.
* [ ] Consider:

  * [ ] Lazy loading rarely used data sets (if and when needed)
  * [ ] Splitting huge modules by domain (e.g., spells-by-class)
  * [ ] Ensuring they don’t get cloned unnecessarily in loops

### 5.3 Rendering Optimizations (Battle Map & Character Sheet)

* [ ] Battle Map:

  * [ ] Confirm dirty-flag system is working as intended
  * [ ] Avoid re-rendering all layers if only UI layer changes
* [ ] Character Sheet:

  * [ ] Debounce expensive recalculations on input (already partially done)
  * [ ] Avoid repeated DOM queries in hot paths (cache selectors)
* [ ] Initiative Tracker:

  * [ ] Avoid re-sorting or re-rendering entire list when only one value changes, where feasible

### 5.4 Asset Optimizations

* [ ] Check:

  * [ ] Image asset sizes (splash, icons, logos)
  * [ ] External libraries loaded (Quill, jsPDF, docx.js, etc.)
* [ ] Where possible:

  * [ ] Use minified CDN builds
  * [ ] Load heavy libraries lazily (only on pages that need them)

---

## Phase 6: Error Handling & Diagnostic Tooling

**Goal:** Make it easy for you to debug user-reported issues without any tracking or backend.

### 6.1 Error Boundary Layer (Global)

* [x] Add a minimal global error handler in `js/error-handling.js`:

  * [x] `window.addEventListener('error', ...)` - catches uncaught errors
  * [x] `window.addEventListener('unhandledrejection', ...)` - catches promise rejections
* [x] On error:

  * [x] Log a clear message to console with:
    * [x] Page name
    * [x] Version (`DM_TOOLBOX_BUILD`)
    * [x] Stack trace
    * [x] Timestamp

### 6.2 Contextual Error Messages

* [x] Standardized user-visible error messages via `showUserError()`:

  * [x] `handleStorageError()` - Storage failures (quota, corruption)
  * [x] `handleExportError()` - Import/export failures
  * [x] Generic `showUserError()` for other errors
* [x] Implementation:

  * [x] `showUserError(message, { details })` - User-friendly + technical console logging
  * [x] Toast notifications with severity levels (error/warning/info)
  * [x] Exposed globally via `window.showUserError` for non-module scripts

### 6.3 Dev Diagnostics Panel

* [x] Add a hidden "diagnostic panel" toggle:

  * [x] Activated with keyboard shortcut: **Ctrl+Alt+D**
  * [x] Displays:
    * [x] Current page
    * [x] Build version and build time
    * [x] Storage stats (character count, localStorage usage)
    * [x] Last error (if any) with timestamp
  * [x] Actions: Clear error, Copy info to clipboard
* [x] Privacy:

  * [x] Local-only, no network calls
  * [x] No tracking or telemetry

---

## Phase 7: Data & Schema Stability

**Goal:** Keep save data durable across future versions and reduce risk when refactoring.

### 7.1 Schema Versioning

* [x] Define a version field in core saved objects:

  * [x] Character data: `schemaVersion` (current: 2)
  * [x] Battle map save data: `schemaVersion` (current: 1)
  * [x] Journal entries: `schemaVersion` (current: 1)
* [x] Document versions in `docs/DATA_SCHEMAS.md`:

  * [x] Current schema for each type (Character, Battlemap, Journal)
  * [x] History of changes with dates

### 7.2 Migration Helpers

* [x] Create `js/modules/migrations.js`:

  * [x] `migrateCharacter(character)` - migrates v0/v1 → v2
  * [x] `migrateBattlemap(state)` - migrates v0 → v1
  * [x] `migrateJournalEntry(entry)` - migrates v0 → v1
  * [x] Each function:

    * [x] Reads `schemaVersion`
    * [x] Applies incremental transforms up to `CURRENT_SCHEMA_VERSION`
    * [x] Returns `{ data, migrated, fromVersion, warnings }`
* [x] Helper functions:

  * [x] `migrateCharacterList(characters)` - bulk migration
  * [x] `needsMigration(data, type)` - check if migration needed
  * [x] `getMigrationInfo(data, type)` - get migration details

### 7.3 Backwards Compatibility Policy

* [x] Decided and documented in `docs/DATA_SCHEMAS.md`:

  * [x] Minimum supported versions defined (Character: 1, Battlemap: 1, Journal: 1)
  * [x] Automatic migration on load/import
  * [x] Non-destructive (original data not modified until saved)
* [x] Warning system:

  * [x] Warnings returned if data is older than minimum supported
  * [x] Warnings returned if migration fails (continues with partial data)

---

## Phase 8: Developer Experience & Internal Docs

**Goal:** Make “future you” grateful you did the boring documentation now.

### 8.1 High-Level Architecture Diagram

* [x] Add a simple diagram (even ASCII or PNG) in `docs/ARCHITECTURE.md`:

  * [x] Pages ↔ Core Modules ↔ Storage
  * [x] Key flows:

    * [x] Character creation → character sheet → initiative tracker → battle map
    * [x] Journal flow
    * [x] Generator flows (shop → inventory, battle map → initiative, etc.)

### 8.2 “How to Add a Feature” Guides

* [ ] In `CONTRIBUTING.md` or `docs/ADDING_FEATURES.md`, write short guides:

  * [ ] “How to add a new generator”
  * [ ] “How to add a new field to character data”
  * [ ] “How to add a new cross-tool integration”
* [ ] For each:

  * [ ] Where to put data
  * [ ] Which modules to touch
  * [ ] Which tests to update/add

### 8.3 Maintenance Checklists

* [x] Add a "Release Checklist" to `docs/RELEASE_CHECKLIST.md`:

  * [x] Bump version in build stamp
  * [x] Update recent changes
  * [x] Run full test suite
  * [x] Sanity check on key pages (character, initiative, battle map, journal)
  * [x] Cross-browser testing checklist
* [x] Add a "Refactor Checklist":

  * [x] Migration added if data shape changes
  * [x] Tests updated
  * [x] Performance notes for hot code paths
  * [x] Module change guidelines

---

## Progress Tracking

| Phase                          | Tasks  | Completed | Percentage |
| ------------------------------ | ------ | --------- | ---------- |
| Phase 1: Inventory & Standards | 9      | 9         | 100%       |
| Phase 2: Module Architecture   | 8      | 7         | 88%        |
| Phase 3: JSDoc & Types         | 7      | 7         | 100%       |
| Phase 4: Build & Assets        | 6      | 0         | 0%         |
| Phase 5: Performance           | 10     | 0         | 0%         |
| Phase 6: Error Handling        | 7      | 7         | 100%       |
| Phase 7: Data & Schemas        | 7      | 7         | 100%       |
| Phase 8: Dev Experience        | 7      | 4         | 57%        |
| **Total**                      | **61** | **41**    | **67%**    |

---

## Revision History

| Date       | Version | Changes                           |
| ---------- | ------- | --------------------------------- |
| 2026-01-23 | 1.0     | Initial engineering roadmap added |
| 2026-01-23 | 1.1     | Phase 1 completed: CODEBASE_OVERVIEW.md, CODING_STANDARDS.md, ESLint, Prettier |
| 2026-01-23 | 1.2     | Phase 2 marked mostly complete (architecture exists), Phase 3 completed: js/types.js, jsconfig.json, @ts-check on key modules |
| 2026-01-23 | 1.3     | Phase 6 completed: js/error-handling.js with global handlers, showUserError(), diagnostics panel (Ctrl+Alt+D) |
| 2026-01-23 | 1.4     | Phase 7 completed: js/modules/migrations.js with schema versioning, migration functions for Character/Battlemap/Journal, docs/DATA_SCHEMAS.md |
| 2026-01-23 | 1.5     | Phase 8 partial: docs/ARCHITECTURE.md with system diagram and data flows, docs/RELEASE_CHECKLIST.md with release and refactor checklists |

---

If you want, next step we can take one phase (e.g., Phase 1 or Phase 3) and actually fill in concrete examples directly from your current files (`character.js`, `initiative.js`, etc.) so it’s not just abstract—it’s “here’s exactly how you’d JSDoc this function” or “here’s how to carve this function into a module.”
