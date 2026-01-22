const DM_TOOLBOX_BUILD = {
  name: "The DM's Toolbox",
  version: "2.1.0",
  recentChanges: [
    "Testing Suite: Comprehensive test coverage with 614 tests (342 unit, 202 integration, 70 E2E)",
    "Unit Tests: Pure function modules extracted to js/modules/ for testability (dice, character-calculations, initiative-calculations, spell-utils, storage, validation, generators, export-utils, level-up-calculations)",
    "Integration Tests: Character creation flow, level-up system, combat mechanics, cross-tool communication, storage operations",
    "E2E Tests: Playwright tests for navigation, initiative tracker, character sheet, character wizard",
    "CI/CD: GitHub Actions workflow for automated testing on push/PR",
    "Pre-commit Hooks: Husky + lint-staged runs related tests on staged files",
    "Coverage: 95%+ statement coverage, 82%+ branch coverage with enforced thresholds",
    "Documentation: CONTRIBUTING.md with test requirements and patterns"
  ],
  buildTime: new Date().toISOString(),
  author: "Maybeme"
};

console.log(
  `${DM_TOOLBOX_BUILD.name} v${DM_TOOLBOX_BUILD.version} – built ${DM_TOOLBOX_BUILD.buildTime} by ${DM_TOOLBOX_BUILD.author} recently changed: ${DM_TOOLBOX_BUILD.recentChanges.join('; ')}`
);

// Initialize IndexedDB if available
if (typeof IndexedDBStorage !== 'undefined' && IndexedDBStorage.isSupported()) {
  IndexedDBStorage.init()
    .then(() => console.log('✓ IndexedDB ready'))
    .catch(err => console.warn('⚠ IndexedDB initialization failed:', err));
}