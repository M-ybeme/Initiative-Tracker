# Testing Implementation Roadmap

This document provides a step-by-step roadmap for implementing a comprehensive testing suite for The DM's Toolbox. Each phase is broken into actionable tasks with checkboxes for tracking progress.

## Table of Contents

- [Overview](#overview)
- [Phase 1: Foundation Setup](#phase-1-foundation-setup)
- [Phase 2: Code Refactoring for Testability](#phase-2-code-refactoring-for-testability)
- [Phase 3: Unit Tests - Core Systems](#phase-3-unit-tests---core-systems)
- [Phase 4: Unit Tests - Secondary Systems](#phase-4-unit-tests---secondary-systems)
- [Phase 5: Integration Tests](#phase-5-integration-tests)
- [Phase 6: End-to-End Tests](#phase-6-end-to-end-tests)
- [Phase 7: CI/CD & Automation](#phase-7-cicd--automation)
- [Testing Cheat Sheet](#testing-cheat-sheet)

---

## Overview

### Current State
- **Lines of Code:** ~28,000+ lines of JavaScript
- **Test Coverage:** 0%
- **Test Infrastructure:** None
- **Module System:** IIFEs with global functions

### Target State
- Unit test coverage for all core logic
- Integration tests for cross-tool communication
- E2E tests for critical user flows
- Automated test runs on commit

### Technology Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit & integration test runner |
| **happy-dom** | Browser API simulation |
| **@testing-library/dom** | DOM interaction testing |
| **Playwright** | End-to-end browser testing |
| **c8** | Code coverage reporting |

---

## Phase 1: Foundation Setup

**Goal:** Set up the testing infrastructure and tooling.

### 1.1 Initialize npm Project
- [ ] Create `package.json` with `npm init -y`
- [ ] Add `.gitignore` entries for `node_modules/` and `coverage/`
- [ ] Update README with testing instructions

### 1.2 Install Testing Dependencies
- [ ] Install Vitest: `npm install --save-dev vitest`
- [ ] Install happy-dom: `npm install --save-dev happy-dom`
- [ ] Install Testing Library: `npm install --save-dev @testing-library/dom`
- [ ] Install coverage tool: `npm install --save-dev @vitest/coverage-v8`

### 1.3 Configure Vitest
- [ ] Create `vitest.config.js` with happy-dom environment
- [ ] Add test scripts to `package.json`:
  - `"test": "vitest"`
  - `"test:run": "vitest run"`
  - `"test:coverage": "vitest run --coverage"`

### 1.4 Create Test Directory Structure
- [ ] Create `tests/` directory
- [ ] Create `tests/unit/` subdirectory
- [ ] Create `tests/integration/` subdirectory
- [ ] Create `tests/e2e/` subdirectory
- [ ] Create `tests/helpers/` for shared test utilities
- [ ] Create `tests/mocks/` for mock data and stubs

### 1.5 Create Test Helpers
- [ ] Create `tests/helpers/setup.js` for global test setup
- [ ] Create `tests/helpers/localStorage-mock.js`
- [ ] Create `tests/helpers/indexedDB-mock.js`
- [ ] Create `tests/helpers/sample-data.js` with test fixtures

### 1.6 Verify Setup
- [ ] Create a simple `tests/unit/sanity.test.js` to verify Vitest works
- [ ] Run `npm test` and confirm it passes
- [ ] Run `npm run test:coverage` and confirm report generates

---

## Phase 2: Code Refactoring for Testability

**Goal:** Refactor existing code to enable unit testing without breaking functionality.

### 2.1 Create Module Export Layer
- [ ] Create `js/modules/` directory for testable modules
- [ ] Document the module extraction pattern in this file

### 2.2 Extract Character Calculation Logic
- [ ] Create `js/modules/character-calculations.js`
- [ ] Extract ability modifier calculation: `getAbilityModifier(score)`
- [ ] Extract proficiency bonus calculation: `getProficiencyBonus(level)`
- [ ] Extract skill bonus calculation: `getSkillBonus(ability, proficient, level)`
- [ ] Extract AC calculation logic
- [ ] Extract HP calculation logic
- [ ] Add ES module exports
- [ ] Import into `character.js` and verify functionality

### 2.3 Extract Initiative Logic
- [ ] Create `js/modules/initiative-calculations.js`
- [ ] Extract initiative sorting: `sortByInitiative(combatants)`
- [ ] Extract death save logic: `processDeathSave(roll, currentSaves)`
- [ ] Extract concentration check DC: `getConcentrationDC(damage)`
- [ ] Extract HP adjustment logic: `adjustHP(current, max, temp, amount)`
- [ ] Add ES module exports
- [ ] Import into `initiative.js` and verify functionality

### 2.4 Extract Level-Up Logic
- [ ] Create `js/modules/level-up-calculations.js`
- [ ] Extract multiclass validation: `canMulticlass(currentClasses, newClass, abilities)`
- [ ] Extract spell slot calculation: `getSpellSlots(classes)`
- [ ] Extract caster level calculation: `getCasterLevel(classes)`
- [ ] Extract ASI availability: `getASICount(classes)`
- [ ] Add ES module exports
- [ ] Import into `level-up-system.js` and verify functionality

### 2.5 Extract Dice Logic
- [ ] Create `js/modules/dice.js`
- [ ] Extract dice parsing: `parseDiceNotation(notation)` (e.g., "2d6+3")
- [ ] Extract dice rolling: `rollDice(count, sides)`
- [ ] Extract advantage/disadvantage: `rollWithAdvantage(sides, mode)`
- [ ] Extract 4d6-drop-lowest: `rollAbilityScore()`
- [ ] Add ES module exports

### 2.6 Extract Spell Logic
- [ ] Create `js/modules/spell-utils.js`
- [ ] Extract spell slot management: `useSpellSlot(slots, level)`
- [ ] Extract spell filtering: `filterSpellsByClass(spells, className)`
- [ ] Extract ritual check: `canCastAsRitual(spell, casterClass)`
- [ ] Add ES module exports

### 2.7 Extract Storage Logic
- [ ] Create `js/modules/storage.js`
- [ ] Extract character save/load with dependency injection
- [ ] Extract initiative save/load with dependency injection
- [ ] Allow injecting mock localStorage/IndexedDB for testing
- [ ] Add ES module exports

---

## Phase 3: Unit Tests - Core Systems

**Goal:** Achieve test coverage for the most critical game mechanics.

### 3.1 Character Calculations (`tests/unit/character-calculations.test.js`)
- [ ] Test `getAbilityModifier()` for scores 1-30
- [ ] Test `getProficiencyBonus()` for levels 1-20
- [ ] Test `getSkillBonus()` with proficiency combinations
- [ ] Test `getSkillBonus()` with expertise
- [ ] Test AC calculation for various armor types
- [ ] Test AC calculation with shields
- [ ] Test AC calculation for Unarmored Defense (Barbarian)
- [ ] Test AC calculation for Unarmored Defense (Monk)
- [ ] Test HP calculation at level 1
- [ ] Test HP calculation for multiclass

### 3.2 Initiative Calculations (`tests/unit/initiative-calculations.test.js`)
- [ ] Test initiative sorting (descending order)
- [ ] Test initiative tie-breaking
- [ ] Test death save success tracking
- [ ] Test death save failure tracking
- [ ] Test death save nat 20 (regain 1 HP)
- [ ] Test death save nat 1 (2 failures)
- [ ] Test stabilization at 3 successes
- [ ] Test death at 3 failures
- [ ] Test concentration DC calculation (minimum 10)
- [ ] Test concentration DC for high damage
- [ ] Test HP adjustment with temp HP buffer
- [ ] Test HP adjustment clamping (0 to max)
- [ ] Test healing with temp HP preservation

### 3.3 Level-Up Calculations (`tests/unit/level-up-calculations.test.js`)
- [ ] Test single-class spell slot progression
- [ ] Test multiclass spell slot calculation (rounded down)
- [ ] Test Warlock pact magic separate tracking
- [ ] Test multiclass ability score requirements
- [ ] Test multiclass proficiency gains
- [ ] Test ASI count for single class
- [ ] Test ASI count for Fighter (extra ASIs)
- [ ] Test ASI count for Rogue (extra ASIs)
- [ ] Test ASI count for multiclass splits
- [ ] Test caster level for full casters
- [ ] Test caster level for half casters (rounded down)
- [ ] Test caster level for third casters (rounded down)

### 3.4 Dice Module (`tests/unit/dice.test.js`)
- [ ] Test `parseDiceNotation("1d20")`
- [ ] Test `parseDiceNotation("2d6+3")`
- [ ] Test `parseDiceNotation("1d8-1")`
- [ ] Test `parseDiceNotation("4d6kh3")` (keep highest 3)
- [ ] Test `rollDice()` returns values in valid range
- [ ] Test `rollDice()` with seeded random for deterministic tests
- [ ] Test `rollAbilityScore()` drops lowest die
- [ ] Test `rollAbilityScore()` returns value between 3-18

### 3.5 Spell Utilities (`tests/unit/spell-utils.test.js`)
- [ ] Test spell slot usage decrements correctly
- [ ] Test spell slot usage prevents negative slots
- [ ] Test spell filtering by class
- [ ] Test spell filtering by level
- [ ] Test ritual casting eligibility
- [ ] Test concentration spell tracking

---

## Phase 4: Unit Tests - Secondary Systems

**Goal:** Extend coverage to generators and utility functions.

### 4.1 Storage Module (`tests/unit/storage.test.js`)
- [ ] Test character save to localStorage
- [ ] Test character load from localStorage
- [ ] Test character list retrieval
- [ ] Test character deletion
- [ ] Test initiative state save
- [ ] Test initiative state load
- [ ] Test data migration from old format
- [ ] Test handling of corrupted data
- [ ] Test IndexedDB fallback for portraits

### 4.2 Data Validation (`tests/unit/validation.test.js`)
- [ ] Test character name validation
- [ ] Test ability score range validation (1-30)
- [ ] Test level range validation (1-20)
- [ ] Test HP validation (non-negative)
- [ ] Test required field validation
- [ ] Test class/race combination validation

### 4.3 Generator Logic (`tests/unit/generators.test.js`)
- [ ] Test seeded random produces consistent results
- [ ] Test NPC generation structure
- [ ] Test shop inventory generation
- [ ] Test loot table roll outcomes
- [ ] Test name generation by race
- [ ] Test tavern generation structure

### 4.4 Export Utilities (`tests/unit/export.test.js`)
- [ ] Test character data serialization for export
- [ ] Test journal export format
- [ ] Test stat block text generation

---

## Phase 5: Integration Tests

**Goal:** Test that modules work together correctly.

### 5.1 Character Creation Flow (`tests/integration/character-creation.test.js`)
- [ ] Test complete character creation from step 1-8
- [ ] Test ability score assignment updates modifiers
- [ ] Test race selection grants correct traits
- [ ] Test class selection grants correct proficiencies
- [ ] Test background selection grants correct skills
- [ ] Test starting equipment assignment
- [ ] Test character saves to storage after creation
- [ ] Test validation prevents incomplete characters

### 5.2 Level-Up Flow (`tests/integration/level-up.test.js`)
- [ ] Test leveling from 1 to 2
- [ ] Test subclass selection at appropriate level
- [ ] Test HP increase on level up
- [ ] Test spell slot increase on level up
- [ ] Test feature unlocks at milestone levels
- [ ] Test multiclass level up
- [ ] Test character saves after level up

### 5.3 Combat Flow (`tests/integration/combat.test.js`)
- [ ] Test adding combatant to tracker
- [ ] Test initiative roll and sorting
- [ ] Test damage application and HP update
- [ ] Test healing application
- [ ] Test status effect toggle
- [ ] Test turn advancement
- [ ] Test round counter increment
- [ ] Test death save workflow
- [ ] Test combat state persistence

### 5.4 Cross-Tool Integration (`tests/integration/cross-tool.test.js`)
- [ ] Test character export to initiative tracker
- [ ] Test character export to battle map
- [ ] Test encounter builder export to initiative
- [ ] Test NPC generator to name generator preset
- [ ] Test shop purchase to character inventory
- [ ] Test localStorage payload format correctness

### 5.5 Storage Integration (`tests/integration/storage.test.js`)
- [ ] Test localStorage and IndexedDB sync
- [ ] Test portrait storage in IndexedDB
- [ ] Test data recovery after simulated crash
- [ ] Test multiple character management
- [ ] Test character update preserves other data

---

## Phase 6: End-to-End Tests

**Goal:** Test real user workflows in actual browsers.

### 6.1 Setup Playwright
- [ ] Install Playwright: `npm install --save-dev @playwright/test`
- [ ] Run `npx playwright install` to get browsers
- [ ] Create `playwright.config.js`
- [ ] Add E2E test script: `"test:e2e": "playwright test"`
- [ ] Configure base URL for local server

### 6.2 Character Wizard E2E (`tests/e2e/character-wizard.spec.js`)
- [ ] Test full character creation happy path
- [ ] Test navigation between wizard steps
- [ ] Test ability score roller interaction
- [ ] Test race selection with subrace
- [ ] Test class selection with subclass
- [ ] Test feat selection (searchable UI)
- [ ] Test starting equipment selection
- [ ] Test character appears in character list after creation

### 6.3 Initiative Tracker E2E (`tests/e2e/initiative-tracker.spec.js`)
- [ ] Test adding PC manually
- [ ] Test adding enemy from stat block
- [ ] Test rolling initiative for all
- [ ] Test damage/healing workflow
- [ ] Test status effect application
- [ ] Test death save button clicks
- [ ] Test next turn button
- [ ] Test player view mode toggle

### 6.4 Character Sheet E2E (`tests/e2e/character-sheet.spec.js`)
- [ ] Test opening existing character
- [ ] Test editing character fields
- [ ] Test dice roller interaction
- [ ] Test spell slot tracking
- [ ] Test inventory management
- [ ] Test exporting to initiative tracker

### 6.5 Battle Map E2E (`tests/e2e/battle-map.spec.js`)
- [ ] Test canvas loads correctly
- [ ] Test token placement
- [ ] Test token movement
- [ ] Test fog of war toggle
- [ ] Test measurement tool
- [ ] Test grid snap functionality

### 6.6 Cross-Page Navigation E2E (`tests/e2e/navigation.spec.js`)
- [ ] Test character to initiative export flow
- [ ] Test character to battle map export flow
- [ ] Test encounter builder to initiative flow
- [ ] Test generator inter-linking

---

## Phase 7: CI/CD & Automation

**Goal:** Automate testing on every commit.

### 7.1 GitHub Actions Setup
- [ ] Create `.github/workflows/test.yml`
- [ ] Configure Node.js setup
- [ ] Run unit tests on push
- [ ] Run integration tests on push
- [ ] Run E2E tests on pull request
- [ ] Upload coverage reports

### 7.2 Pre-Commit Hooks
- [ ] Install husky: `npm install --save-dev husky`
- [ ] Configure pre-commit hook to run tests
- [ ] Configure lint-staged for changed files only

### 7.3 Coverage Requirements
- [ ] Set minimum coverage threshold (e.g., 70%)
- [ ] Configure coverage badges for README
- [ ] Block merge if coverage drops

### 7.4 Test Documentation
- [ ] Document how to run tests locally
- [ ] Document how to add new tests
- [ ] Document mocking patterns
- [ ] Update CONTRIBUTING.md with test requirements

---

## Testing Cheat Sheet

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/dice.test.js

# Run tests matching pattern
npm test -- -t "ability modifier"

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e -- --ui
```

### Writing a Unit Test

```javascript
// tests/unit/example.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { getAbilityModifier } from '../../js/modules/character-calculations.js';

describe('getAbilityModifier', () => {
  it('returns -5 for score of 1', () => {
    expect(getAbilityModifier(1)).toBe(-5);
  });

  it('returns 0 for score of 10', () => {
    expect(getAbilityModifier(10)).toBe(0);
  });

  it('returns +5 for score of 20', () => {
    expect(getAbilityModifier(20)).toBe(5);
  });
});
```

### Mocking localStorage

```javascript
// tests/helpers/localStorage-mock.js
export function createLocalStorageMock() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
}
```

### Sample Test Data

```javascript
// tests/helpers/sample-data.js
export const sampleCharacter = {
  id: 'test-char-1',
  name: 'Test Hero',
  level: 5,
  race: 'Human',
  class: 'Fighter',
  abilities: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
  maxHP: 44,
  currentHP: 44,
  ac: 18,
  proficiencyBonus: 3,
};

export const sampleCombatant = {
  id: 'test-combatant-1',
  name: 'Goblin',
  type: 'Enemy',
  initiative: 15,
  currentHP: 7,
  maxHP: 7,
  ac: 15,
};
```

---

## Progress Tracking

| Phase | Tasks | Completed | Percentage |
|-------|-------|-----------|------------|
| Phase 1: Foundation | 19 | 0 | 0% |
| Phase 2: Refactoring | 28 | 0 | 0% |
| Phase 3: Core Unit Tests | 42 | 0 | 0% |
| Phase 4: Secondary Unit Tests | 22 | 0 | 0% |
| Phase 5: Integration Tests | 31 | 0 | 0% |
| Phase 6: E2E Tests | 26 | 0 | 0% |
| Phase 7: CI/CD | 12 | 0 | 0% |
| **Total** | **180** | **0** | **0%** |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-19 | 1.0 | Initial roadmap created |
