# Release & Maintenance Checklists

Checklists to ensure consistent releases and safe refactoring.

---

## Release Checklist

Use this checklist before deploying a new version.

### Pre-Release

- [ ] **Version bump** - Update `DM_TOOLBOX_BUILD.version` in `js/site.js`
- [ ] **Update recent changes** - Add release highlights to `DM_TOOLBOX_BUILD.recentChanges`
- [ ] **Run full test suite** - `npm test` (all 550+ tests should pass)
- [ ] **Run linter** - `npm run lint` (no errors, warnings acceptable)
- [ ] **SRD audit** - Spot check new copy/data for SRD-only content and confirm private content packs stay excluded from the public build
- [ ] **Check for console errors** - Open each major page in browser DevTools

### Functional Testing

Test each major feature manually:

- [ ] **Character Manager**
  - [ ] Create new character via wizard
  - [ ] Edit existing character
  - [ ] Delete character
  - [ ] Export to PDF
  - [ ] Send to Initiative Tracker

- [ ] **Initiative Tracker**
  - [ ] Add combatants manually
  - [ ] Import from Character Manager
  - [ ] Run a few rounds of combat
  - [ ] Track HP, conditions, death saves
  - [ ] Save and load encounter

- [ ] **Battle Map**
  - [ ] Add tokens
  - [ ] Upload background image
  - [ ] Draw measurements
  - [ ] Export to Initiative Tracker

- [ ] **Journal**
  - [ ] Create new entry
  - [ ] Edit with rich text
  - [ ] Search entries
  - [ ] Export to PDF/Word

- [ ] **Generators** (spot check 2-3)
  - [ ] Generate output
  - [ ] Send to character (if applicable)

### Cross-Browser Testing

- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile browser (responsive check)

### Post-Release

- [ ] **Verify deployment** - Check live site loads correctly
- [ ] **Check diagnostics panel** - Ctrl+Alt+D shows correct version
- [ ] **Monitor for errors** - Check browser console on live site

---

## Refactor Checklist

Use this checklist when making structural changes to the codebase.

### Before Refactoring

- [ ] **Identify affected files** - List all files that will change
- [ ] **Check test coverage** - Ensure tests exist for affected code
- [ ] **Review data shapes** - Note any changes to stored data structure

### During Refactoring

- [ ] **Run tests frequently** - After each significant change
- [ ] **Keep commits small** - One logical change per commit
- [ ] **Update JSDoc** - Keep type annotations current

### Data Changes

If changing the shape of stored data (Character, Battlemap, Journal):

- [ ] **Increment schema version** in `js/modules/migrations.js`
  ```javascript
  CURRENT_SCHEMA_VERSIONS.character = X  // increment
  ```

- [ ] **Add migration function** for the new version
  ```javascript
  X: (data) => {
    const migrated = { ...data };
    // Apply changes
    migrated.schemaVersion = X;
    return migrated;
  }
  ```

- [ ] **Update DATA_SCHEMAS.md** - Document new fields/changes

- [ ] **Update js/types.js** - Update JSDoc type definitions

- [ ] **Test migration** - Ensure old data loads correctly

### Module Changes

If adding/modifying modules in `js/modules/`:

- [ ] **No DOM access** - Modules must not use `document` or `window`
- [ ] **Add tests** - Unit tests for new functions
- [ ] **Update CODEBASE_OVERVIEW.md** - If adding new module
- [ ] **Export properly** - Use ES module exports

### Performance-Sensitive Changes

If touching code in hot paths (render loops, large data processing):

- [ ] **Profile before and after** - Use DevTools Performance tab
- [ ] **Watch for unnecessary re-renders**
- [ ] **Avoid cloning large objects in loops**
- [ ] **Consider debouncing for frequent events**

### After Refactoring

- [ ] **Run full test suite** - `npm test`
- [ ] **Run linter** - `npm run lint`
- [ ] **Manual smoke test** - Open affected pages in browser
- [ ] **Check for console warnings** - DevTools console should be clean
- [ ] **Update documentation** if behavior changed

---

## Quick Reference: Common Tasks

### Bump Version
```javascript
// js/site.js
const DM_TOOLBOX_BUILD = {
  version: "2.0.4",  // ← increment this
  recentChanges: [
    "Your new feature here",  // ← add at top
    ...
  ]
};
```

### Add Migration
```javascript
// js/modules/migrations.js
const CHARACTER_MIGRATIONS = {
  // ... existing migrations

  3: (char) => {  // ← new version number
    const migrated = { ...char };
    migrated.newField = migrated.oldField || defaultValue;
    migrated.schemaVersion = 3;
    return migrated;
  }
};

// Also update:
CURRENT_SCHEMA_VERSIONS.character = 3;
```

### Add New Module
1. Create `js/modules/your-module.js`
2. Add `// @ts-check` and `/// <reference path="../types.js" />`
3. Export functions with JSDoc
4. Create `tests/unit/your-module.test.js`
5. Document in `docs/CODEBASE_OVERVIEW.md`
