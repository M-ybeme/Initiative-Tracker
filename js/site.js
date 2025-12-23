const DM_TOOLBOX_BUILD = {
    name: "The DM's Toolbox",
    version: "1.10.9",
    recentChanges: [
      "Loot Generator: Added 50 cursed items with risk/reward mechanics, curse severity slider, and 2 new quick bundles (Magic Items, Cursed Items)",
      "Loot Generator: Fixed potion and scroll bundle category validation errors"
    ],
    buildTime: new Date().toISOString(),
    author: "Maybeme"
};

console.log(
  `${DM_TOOLBOX_BUILD.name} v${DM_TOOLBOX_BUILD.version} – built ${DM_TOOLBOX_BUILD.buildTime}`
);

// Initialize IndexedDB if available
if (typeof IndexedDBStorage !== 'undefined' && IndexedDBStorage.isSupported()) {
  IndexedDBStorage.init()
    .then(() => console.log('✓ IndexedDB ready'))
    .catch(err => console.warn('⚠ IndexedDB initialization failed:', err));
}