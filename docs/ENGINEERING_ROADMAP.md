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

---

## Phase 1: Codebase Inventory & Standards

**Goal:** Get a clean, documented view of the current codebase and set enforcement standards that match reality.

### 1.1 File & Responsibility Inventory

* [ ] Create `docs/CODEBASE_OVERVIEW.md` summarizing major JS entry points:

  * [ ] `character.js` – character sheet logic
  * [ ] `character-creation-wizard.js` – wizard flow
  * [ ] `level-up-system.js` – level-up flow
  * [ ] `initiative.js` – initiative tracker
  * [ ] `battlemap.js` – battle map logic
  * [ ] `journal.js` – journal + Quill integration
  * [ ] `loot.js`, `shop.js`, `tavern.js`, `npc.js`, `names.js` – generators
  * [ ] `site.js` – shared navigation / global helpers
* [ ] For each file, note:

  * [ ] Main responsibilities
  * [ ] Key globals it touches
  * [ ] Which `js/modules/` files it depends on

### 1.2 Coding Standards & Conventions

* [ ] Create `docs/CODING_STANDARDS.md`:

  * [ ] Naming conventions for:

    * [ ] Modules: `something-utils.js`, `*-calculations.js`, etc.
    * [ ] Functions: `verbNoun` (`calculateAC`, `renderSpellList`)
    * [ ] Constants: `UPPER_SNAKE_CASE`
    * [ ] Data tables: `RACIAL_SPELLS`, `CLASS_RESOURCES`, etc.
  * [ ] File naming for DOM-facing scripts vs module scripts:

    * [ ] Page scripts: `initiative.js`, `character.js`
    * [ ] Modules: `js/modules/{domain}.js`
  * [ ] Comments policy:

    * [ ] JSDoc for exported functions and core data types
    * [ ] Inline comments only for non-obvious logic
* [ ] Decide and document:

  * [ ] Preferred array methods: map/filter/reduce vs loops
  * [ ] Error handling pattern: `try/catch` vs guard returns
  * [ ] `console.log` usage: what’s allowed, what’s “debug only”

### 1.3 Linting & Formatting

* [ ] Add ESLint (minimal ruleset tailored to existing code):

  * [ ] `npm install --save-dev eslint`
  * [ ] Create `.eslintrc.cjs` with relaxed but helpful rules:

    * [ ] No unused vars
    * [ ] No implicit globals
    * [ ] No re-declaration
    * [ ] Prefer `const`/`let` over `var`
* [ ] Add Prettier (optional, but useful for consistency):

  * [ ] `npm install --save-dev prettier`
  * [ ] `.prettierrc` with agreed style (2 spaces, semicolons, etc.)
* [ ] Hook into existing Husky pre-commit:

  * [ ] Run ESLint on staged `.js` files
  * [ ] Fail commits on syntax errors

---

## Phase 2: Module Architecture & Boundaries

**Goal:** Make the separation between “pure logic”, “integration glue”, and “DOM/UI” explicit and consistent.

### 2.1 Module Categorization

* [ ] Create `docs/MODULE_STRUCTURE.md` describing:

  * [ ] **Core logic modules** (pure-ish):

    * `dice.js`, `character-calculations.js`, `initiative-calculations.js`, `spell-utils.js`, `level-up-calculations.js`, `storage.js`, `validation.js`, `generators.js`, `export-utils.js`, etc.
  * [ ] **Integration modules** (glue):

    * Modules that coordinate between features (e.g., battlemap → initiative)
  * [ ] **UI scripts**:

    * Page-level scripts that touch DOM directly

### 2.2 Enforce One-Way Dependencies

* [ ] For each module under `js/modules/`:

  * [ ] Ensure it does **not** import from page-level scripts
  * [ ] Ensure it does **not** touch `document`/`window` except via explicit hooks
* [ ] Add a section to `MODULE_STRUCTURE.md`:

  * [ ] “Core modules cannot depend on UI scripts”
  * [ ] “UI scripts may depend on core modules, not vice versa”

### 2.3 Extract Remaining Logic Pockets

* [ ] Identify “fat” page scripts with logic that should be modular:

  * [ ] `character.js` – any calculations not tightly coupled to DOM
  * [ ] `initiative.js` – death save logic, concentration DC, HP adjustment
  * [ ] `battlemap.js` – geometry/math used by measurement/fog tools
* [ ] For each:

  * [ ] Extract reusable logic to appropriate module under `js/modules/`
  * [ ] Add unit tests if not already covered
  * [ ] Keep page script focused on:

    * [ ] DOM querying/binding
    * [ ] Event handling
    * [ ] Passing data to/from modules

---

## Phase 3: Type Hygiene with JSDoc

**Goal:** Introduce “soft typing” via JSDoc for critical data structures to catch mistakes early and improve IntelliSense.

### 3.1 Core Data Types

* [ ] Create `js/types.js` (or `js/modules/types.d.js`) with JSDoc typedefs:

  * [ ] `@typedef {Object} Character`
  * [ ] `@typedef {Object} ClassLevel`
  * [ ] `@typedef {Object} Spell`
  * [ ] `@typedef {Object} Attack`
  * [ ] `@typedef {Object} InventoryItem`
  * [ ] `@typedef {Object} InitiativeEntry`
  * [ ] `@typedef {Object} JournalEntry`
  * [ ] `@typedef {Object} BattlemapToken`
  * [ ] `@typedef {Object} MeasurementShape`

### 3.2 Function Annotations

* [ ] Annotate exported functions in core modules:

  * [ ] `character-calculations.js`

    * [ ] `getAbilityModifier(score)`
    * [ ] `getProficiencyBonus(level)`
    * [ ] `calculateAC(character, equipment)` etc.
  * [ ] `level-up-calculations.js`

    * [ ] `getCasterLevel(classes)`
    * [ ] `getSpellSlots(classes)`
  * [ ] `initiative-calculations.js`

    * [ ] `sortByInitiative(combatants)`
  * [ ] `storage.js`

    * [ ] save/load functions with clear input/output types

### 3.3 Editor & Tooling Support

* [ ] Configure VS Code (or your editor) to:

  * [ ] Use JS type checking with `// @ts-check` in key modules, or
  * [ ] A `jsconfig.json` with `"checkJs": true` for `js/modules/` only
* [ ] Gradually adopt `@ts-check` on:

  * [ ] `js/modules/*.js`
  * [ ] Later: high-value page scripts (`character.js`, `initiative.js`)

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

* [ ] Add a minimal global error handler:

  * [ ] `window.addEventListener('error', ...)`
  * [ ] `window.addEventListener('unhandledrejection', ...)`
* [ ] On error:

  * [ ] Log a clear message to console:

    * Page name
    * Version (`DM_TOOLBOX_BUILD`)
    * Stack trace

### 6.2 Contextual Error Messages

* [ ] Standardize user-visible error messages:

  * [ ] Storage failures (IndexedDB/localStorage quota issues)
  * [ ] Import/export failures
  * [ ] Battle map save/load failures
* [ ] Use:

  * [ ] A small helper util: `showUserError(message, { details })`
  * [ ] Non-technical message to user, technical details in console

### 6.3 Dev Diagnostics Panel (Optional, for You)

* [ ] Add a hidden “diagnostic panel” toggle:

  * [ ] Activated with a keyboard shortcut (e.g., `Ctrl+Alt+D`)
  * [ ] Displays:

    * [ ] Current page
    * [ ] Build version
    * [ ] Key storage stats (count of characters, maps, journal entries)
    * [ ] Last error (if any)
* [ ] Ensure:

  * [ ] This panel is local-only, no network calls, respects privacy

---

## Phase 7: Data & Schema Stability

**Goal:** Keep save data durable across future versions and reduce risk when refactoring.

### 7.1 Schema Versioning

* [ ] Define a version field in core saved objects:

  * [ ] Character data: `schemaVersion`
  * [ ] Battle map save data: `schemaVersion`
  * [ ] Journal entries (if needed): `schemaVersion`
* [ ] Document versions in `docs/DATA_SCHEMAS.md`:

  * [ ] Current schema for each type
  * [ ] History of changes

### 7.2 Migration Helpers

* [ ] Create `js/modules/migrations.js`:

  * [ ] `migrateCharacter(character)`
  * [ ] `migrateBattlemapState(state)`
  * [ ] Each function:

    * [ ] Reads `schemaVersion`
    * [ ] Applies incremental transforms up to `CURRENT_SCHEMA_VERSION`
* [ ] Call migrations:

  * [ ] On load from storage before data is used
  * [ ] Not on every render

### 7.3 Backwards Compatibility Policy

* [ ] Decide and document:

  * [ ] How many versions back you intend to support (e.g., last 3 months / last major version)
* [ ] Add a user-facing warning if:

  * [ ] Data is older than supported
  * [ ] Migration fails

---

## Phase 8: Developer Experience & Internal Docs

**Goal:** Make “future you” grateful you did the boring documentation now.

### 8.1 High-Level Architecture Diagram

* [ ] Add a simple diagram (even ASCII or PNG) in `docs/ARCHITECTURE.md`:

  * [ ] Pages ↔ Core Modules ↔ Storage
  * [ ] Key flows:

    * [ ] Character creation → character sheet → initiative tracker → battle map
    * [ ] Journal flow
    * [ ] Generator flows (shop → inventory, battle map → initiative, etc.)

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

* [ ] Add a “Release Checklist” to `docs/RELEASE_CHECKLIST.md`:

  * [ ] Bump version in build stamp
  * [ ] Update CHANGELOG
  * [ ] Run full test suite
  * [ ] Sanity check on key pages (character, initiative, battle map, journal)
* [ ] Add a “Refactor Checklist”:

  * [ ] Migration added if data shape changes
  * [ ] Tests updated
  * [ ] PERFORMANCE notes reviewed if touching hot code

---

## Progress Tracking

| Phase                          | Tasks  | Completed | Percentage |
| ------------------------------ | ------ | --------- | ---------- |
| Phase 1: Inventory & Standards | 9      | 0         | 0%         |
| Phase 2: Module Architecture   | 8      | 0         | 0%         |
| Phase 3: JSDoc & Types         | 7      | 0         | 0%         |
| Phase 4: Build & Assets        | 6      | 0         | 0%         |
| Phase 5: Performance           | 10     | 0         | 0%         |
| Phase 6: Error Handling        | 7      | 0         | 0%         |
| Phase 7: Data & Schemas        | 7      | 0         | 0%         |
| Phase 8: Dev Experience        | 7      | 0         | 0%         |
| **Total**                      | **61** | **0**     | **0%**     |

*(Adjust counts once you start checking things off.)*

---

## Revision History

| Date       | Version | Changes                           |
| ---------- | ------- | --------------------------------- |
| 2026-01-23 | 1.0     | Initial engineering roadmap added |

---

If you want, next step we can take one phase (e.g., Phase 1 or Phase 3) and actually fill in concrete examples directly from your current files (`character.js`, `initiative.js`, etc.) so it’s not just abstract—it’s “here’s exactly how you’d JSDoc this function” or “here’s how to carve this function into a module.”
