const DM_TOOLBOX_BUILD = {
  name: "The DM's Toolbox",
  version: "2.0.3",
  recentChanges: [
    "Added a point buy system toggle for character creation",
    "Added animation on roll button for better UX on Character Sheet",
    "Made Spell Selection more informative for new players"
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