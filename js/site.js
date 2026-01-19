const DM_TOOLBOX_BUILD = {
  name: "The DM's Toolbox",
  version: "2.0.0",
  recentChanges: [
    "Character Wizard: Starting equipment step with PHB-style packages or starting gold (class-based options, background gear always included)",
    "High Elf: Wizard cantrip selection added with validation and proper spell list integration",
    "Cleric (Nature Domain): Bonus druid cantrip selection wired into subclass flow",
    "Subclass Bonus Cantrips: Central SUBCLASS_BONUS_CANTRIPS table + getSubclassBonusCantrips() helper (Light, Celestial, Circle of Spores support)",
    "Feats: Dropdown replaced with searchable feat list in creation + level-up (tooltips for description, benefits, prerequisites)",
    "Navigation: site.js nav reorganized into clearer Combat / Generators / Campaign groupings",
    "Bugfix: Level 1 subclasses for Cleric/Sorcerer/Warlock now correctly prompt and save subclass choices",
    "Bugfix: High Elf 'racial spell not found' resolved by correctly substituting chosen cantrip in gatherRacialSpellData()"
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