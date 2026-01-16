const DM_TOOLBOX_BUILD = {
    name: "The DM's Toolbox",
    version: "1.11.9",
    recentChanges: [
      "Character Creation: Characters created at level 4+ now receive proper ASI/Feat choices",
      "Character Creation: Added comprehensive subclass library with 66 new subclasses",
      "Subclasses: All Xanathar's and Tasha's subclasses now available (114 total, up from 48)",
      "Subclasses: Added Artificer class with all 4 specialists (Alchemist, Armorer, Artillerist, Battle Smith)",
      "Prepared Casters: Cleric, Druid, Paladin, and Artificer now select prepared spells with full spell list access",
      "Spell Preparation: Automatic calculation based on casting stat + level for prepared spellcasters"
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