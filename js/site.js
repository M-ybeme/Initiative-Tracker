const DM_TOOLBOX_BUILD = {
    name: "The DM's Toolbox",
    version: "1.11.6",
    recentChanges: [
      "Journal: Comprehensive UX improvements - timestamps, sort options, unsaved changes protection, word count",
      "Journal: Enhanced visual polish - content previews, empty states, improved hover/active states, clipboard copy"
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