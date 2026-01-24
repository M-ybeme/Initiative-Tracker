const DM_TOOLBOX_BUILD = {
  name: "The DM's Toolbox",
  version: "2.0.4",
  recentChanges: [
    "Added global error handling plus an in-app diagnostics panel (Ctrl+Alt+D)",
    "Implemented versioned save-data migrations for characters, battle maps, and journals",
    "Documented architecture, coding standards, and new JSDoc type definitions"
  ],
  buildTime: new Date().toISOString(),
  author: "Maybeme"
};

console.log(
  `${DM_TOOLBOX_BUILD.name} v${DM_TOOLBOX_BUILD.version} – built ${DM_TOOLBOX_BUILD.buildTime} by ${DM_TOOLBOX_BUILD.author}`
);

// Initialize global error handling and diagnostics panel
// Uses dynamic import since site.js is loaded as a regular script
// Diagnostics panel: Press Ctrl+Alt+D to toggle
import('./error-handling.js')
  .then(({ initGlobalErrorHandlers, initDiagnosticsPanel, showUserError }) => {
    initGlobalErrorHandlers();
    initDiagnosticsPanel();
    // Expose showUserError globally for use in non-module scripts
    window.showUserError = showUserError;
  })
  .catch(err => {
    // Silently fail - error handling is optional enhancement
    console.warn('Error handling module not available:', err.message);
  });

// Initialize IndexedDB if available
if (typeof IndexedDBStorage !== 'undefined' && IndexedDBStorage.isSupported()) {
  IndexedDBStorage.init()
    .then(() => console.log('✓ IndexedDB ready'))
    .catch(err => console.warn('⚠ IndexedDB initialization failed:', err));
}