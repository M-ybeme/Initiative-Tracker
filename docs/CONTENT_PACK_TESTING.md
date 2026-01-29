# Content Pack Testing Guide

## Testing Pack Toggle/Removal Reverts to SRD State

This guide helps verify that toggling off or removing content packs properly reverts the application to SRD 5.2 state.

### Expected Behavior

When a content pack is:
- **Toggled OFF** - Non-SRD content from that pack should be hidden/removed
- **Removed** - All content from that pack should be permanently removed
- **All packs disabled/removed** - Application should return to pure SRD 5.2 state

### Manual Test Procedure

#### Setup
1. Open the application in a browser
2. Open DevTools Console (F12)
3. Open Content Pack Manager (Ctrl + Alt + D, then "Open Content Pack Manager")

#### Test Case 1: Toggle Pack Off
1. Import a content pack with non-SRD content (e.g., `srd-regression-pack.json`)
2. Verify non-SRD content appears (e.g., non-SRD subraces, spells, subclasses)
3. **Toggle the pack OFF** using the switch in the Content Pack Manager
4. **Expected Result:**
   - Non-SRD content should disappear from dropdowns
   - Character creation wizard should show only SRD options
   - Spell lists should show only SRD spells
   - Console should log: "SRD gating refresh" events

#### Test Case 2: Remove Pack
1. Import a content pack with non-SRD content
2. Verify non-SRD content appears
3. **Click "Remove" button** for the pack
4. Confirm the removal dialog
5. **Expected Result:**
   - Pack should be completely removed from installed packs list
   - Non-SRD content should disappear
   - Application should return to SRD 5.2 state

#### Test Case 3: Remove All Packs
1. Import multiple content packs
2. Verify content from all packs appears
3. **Click "Remove All" button**
4. Confirm the removal dialog
5. **Expected Result:**
   - All packs removed
   - Application returns to pure SRD 5.2 state
   - Only SRD content visible everywhere

### Technical Details

The fix ensures that when the `dmtoolbox:packs-applied` event fires:

1. **Spell filtering** - `pruneSpells(filter)` removes non-SRD spells from `window.SPELLS_DATA`
2. **Level-up data filtering** - `pruneLevelUpData(filter)` removes:
   - Non-SRD feats from `LevelUpData.FEATS`
   - Non-SRD classes from `LevelUpData.CLASS_DATA`
   - Non-SRD subclasses from `LevelUpData.SUBCLASS_DATA`
   - Non-SRD backgrounds from `LevelUpData.BACKGROUND_DATA`
   - Non-SRD class equipment from equipment structures
3. **DOM refresh** - `refreshSrdNodes(filter)` updates all `[data-srd-block]` elements

### Code Location

The fix is in [js/site.js](../js/site.js#L373-L379):

```javascript
window.addEventListener('dmtoolbox:packs-applied', () => {
  try {
    // Re-filter all data structures when packs are applied/removed
    pruneSpells(filter);
    pruneLevelUpData(filter);
    // Refresh DOM elements with updated filter state
    refreshSrdNodes(filter);
  } catch (err) {
    console.warn('SRD gating refresh failed:', err);
  }
});
```

### Debugging

If content doesn't disappear after toggling/removing a pack:

1. Check console for errors during `dmtoolbox:packs-applied` event
2. Verify `window.SRD_CONTENT_ALLOWLIST` reflects current state
3. Check `window.SPELLS_DATA.length` before/after toggle
4. Verify `SRDContentFilter.allowlist` contains correct sets
5. Check if DOM elements have `data-srd-block` attributes correctly set

### Related Files

- [js/modules/content-pack-runtime.js](../js/modules/content-pack-runtime.js) - Applies pack data
- [js/modules/content-pack-manager.js](../js/modules/content-pack-manager.js) - Manages pack storage
- [js/modules/content-pack-ui.js](../js/modules/content-pack-ui.js) - UI for pack management
- [js/site.js](../js/site.js) - SRD filtering and DOM gating
