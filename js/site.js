const DM_TOOLBOX_BUILD = {
    name: "The DM's Toolbox",
    version: "1.11.12",
    recentChanges: [
      "Artificer: Full class support in CLASS_DATA with spell progression, features 1-20, and infusions system",
      "Artificer: 16 infusions with helper functions (getAvailableInfusions, getInfusionsKnown, formatInfusionsReference)",
      "Multiclass: Hit dice tracking per class with spend/restore functions for short/long rests",
      "Multiclass: Class level vs character level helpers (getClassLevel, hasClassFeature, getMulticlassFeatures)",
      "Multiclass: Extra Attack stacking rules (Fighter gets up to 4 attacks at level 20)",
      "Multiclass: Proficiency bonus calculation based on total character level"
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