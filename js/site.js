const DM_TOOLBOX_BUILD = {
  name: "The DM's Toolbox",
  version: "2.1.1",
  recentChanges: [
    "Interactive Combat View: Cast buttons, dice roller, HP controls, death saves, hit dice",
    "Death Save Rolling: Auto-tracks successes/failures, handles nat 1 and nat 20",
    "Hit Dice Healing: Roll hit dice to heal, auto-applies CON modifier",
    "Concentration Tracking: Auto-set on cast, clickable badge to end, damage DC checks",
    "Dice History Modal: View last 50 rolls with crit/fumble highlighting",
    "Clickable Saves & Initiative: Roll saving throws and initiative from combat view",
    "Cast Buttons: Quick casting on both combat view and main character sheet",
    "NPC Initiative Fix: NPCs from generator now default to NPC type"
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