const DM_TOOLBOX_BUILD = {
    name: "The DM's Toolbox",
    version: "1.11.7",
    recentChanges: [
      "Character MAanger: Fixed Character Creator not working above level 1",
      "Character Manager: Fixed hit dice not updating on level-up (now properly tracks total and remaining)",
      "Character Manager: Fixed spell slots not replenishing on level-up (current slots now reset to full)"
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