const DM_TOOLBOX_BUILD = {
    name: "The DM's Toolbox",
    version: "1.11.8",
    recentChanges: [
      "Character Sheet Export: PDFs now span multiple pages with full page width",
      "Character Sheet Export: Added structured inventory with weight tracking and equipped/attuned status",
      "Character Sheet Export: Added conditions, concentration status, and all notes fields",
      "Character Sheet Export: Added write-in spaces for handwritten notes on printed sheets"
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