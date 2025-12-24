const DM_TOOLBOX_BUILD = {
    name: "The DM's Toolbox",
    version: "1.11.1",
    recentChanges: [
      "Navigation: Reorganized tools into dropdown menus (Combat, Generators, Campaign) for better organization and mobile support",
      "Battle Map: Reveal fog shapes now cut through cover fog using compositing for dynamic fog of war",
      "Battle Map: Circle fog shapes can be resized by dragging edge handle - perfect for spell areas",
      "Battle Map: Removed status text to eliminate layout-based flickering",
      "Battle Map: Updated help documentation with fog compositing and circle resize features"
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