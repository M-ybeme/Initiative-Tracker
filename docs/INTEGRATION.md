# Cross-Tool Integration Protocol

This document tracks all cross-tool communication patterns, localStorage keys, payload structures, and integration points in The DM's Toolbox.

## Table of Contents

- [Overview](#overview)
- [Integration Patterns](#integration-patterns)
- [Character Integrations](#character-integrations)
- [Generator Integrations](#generator-integrations)
- [Battle Map Integrations](#battle-map-integrations)
- [Storage Keys Reference](#storage-keys-reference)
- [URL Parameters](#url-parameters)

---

## Overview

The DM's Toolbox uses three primary integration patterns:

1. **localStorage + Navigation** - Store payload, navigate to destination with hash
2. **Direct Storage Modification** - Modify shared storage without navigation
3. **URL Parameters** - Pass data via query string

### Common Conventions

**Version Flag:** All payloads include `__dmtoolsVersion: 1` for future compatibility

**Mode Flag:** Most integrations use `mode: 'append'` to preserve existing data

**URL Hashes:**
- `#autoinput` - Trigger auto-import on page load
- `#autoimport` - Alternative trigger for auto-import

---

## Integration Patterns

### Pattern 1: localStorage + Navigation

**Example Flow:**
```javascript
// Source page
const payload = {
  __dmtoolsVersion: 1,
  mode: 'append',
  data: { /* ... */ }
};
localStorage.setItem('dmtools.pendingImport', JSON.stringify(payload));
window.location.href = 'destination.html#autoinput';

// Destination page (on load)
if (window.location.hash === '#autoinput') {
  const data = localStorage.getItem('dmtools.pendingImport');
  if (data) {
    const payload = JSON.parse(data);
    // Process payload
    localStorage.removeItem('dmtools.pendingImport');
    window.location.hash = ''; // Clear hash
  }
}
```

### Pattern 2: Direct Storage Modification

**Example Flow:**
```javascript
// Load existing data
const characters = JSON.parse(localStorage.getItem('dmtoolboxCharactersV1') || '[]');

// Modify specific character
const targetChar = characters.find(c => c.id === selectedId);
targetChar.inventoryItems.push(newItem);

// Save back
localStorage.setItem('dmtoolboxCharactersV1', JSON.stringify(characters));
```

### Pattern 3: URL Parameters + localStorage

**Example Flow:**
```javascript
// Source page
localStorage.setItem('integration-key', JSON.stringify(data));
window.open('destination.html?from=source&param=value', '_blank');

// Destination page
const urlParams = new URLSearchParams(window.location.search);
const fromSource = urlParams.get('from') === 'source';
if (fromSource) {
  const data = JSON.parse(localStorage.getItem('integration-key'));
  // Process data
  localStorage.removeItem('integration-key');
}
```

---

## Character Integrations

### Character → Initiative Tracker

**localStorage Key:** `dmtools.pendingImport`

**Source:** [js/character.js](../js/character.js) (lines 3238-3263)

**Destination:** [js/initiative.js](../js/initiative.js) (lines 123-181)

**Navigation:** `initiative.html#autoinput`

**Button ID:** `sendToTrackerBtn`

**Payload Structure:**
```javascript
{
  __dmtoolsVersion: 1,
  mode: 'append',           // 'append' or 'replace'
  characters: [
    {
      name: string,
      type: 'PC',
      initiative: 0,
      currentHP: number,
      maxHP: number,
      tempHP: 0,
      ac: number,
      notes: '',
      concentration: false,
      deathSaves: {
        s: 0,               // Successes
        f: 0,               // Failures
        stable: false
      },
      status: [],
      concDamagePending: 0
    }
  ],
  currentTurn: 0,
  combatRound: 1,
  diceHistory: []
}
```

---

### Character → Battle Map (Token Generation)

**localStorage Key:** `dmtools.pendingBattleMapImport`

**Source:** [js/character.js](../js/character.js) (lines 3403-3426)

**Destination:** [battlemap.html](../battlemap.html) (lines 3046-3094)

**Navigation:** `battlemap.html#autoinput`

**Button IDs:**
- `sendToBattleMapBtn` - Opens token preview modal
- `confirmSendToMapBtn` - Confirms and sends

**Payload Structure:**
```javascript
{
  __dmtoolsVersion: 1,
  mode: 'append',
  tokens: [
    {
      name: string,
      tokenImage: string,   // Base64 PNG (data:image/png;base64,...)
      type: 'PC'
    }
  ]
}
```

**Special Features:**
- Token preview modal with zoom/pan controls
- Generates 200x200px circular token from portrait
- CORS warning for URL-based portraits
- Falls back to initials if no portrait

---

### Shop → Character (Inventory)

**Integration Type:** Direct Storage Modification

**Storage Key:** `dmtoolboxCharactersV1`

**Source:** [shop.html](../shop.html) (lines 1634-1693)

**Button Class:** `add-to-character-btn`

**Integration Method:**
1. Modal prompts for character selection
2. Directly modifies `character.inventoryItems` array
3. Saves updated character list to storage
4. No page navigation

**Added to Character:**
```javascript
// Appends to character.inventoryItems array
{
  name: string,
  quantity: number,
  weight: number,           // Per item
  equipped: boolean,
  attuned: boolean,
  notes: string            // Combines description, use, custom notes
}
```

**Storage Systems:**
- Primary: IndexedDB via `indexed-db-storage.js`
- Fallback: localStorage `dmtoolboxCharactersV1`

---

## Generator Integrations

### NPC → Name Generator

**localStorage Key:** `npc-name-request`

**Source:** [npc.html](../npc.html) (lines 956-964)

**Destination:** [name.html](../name.html) (lines 1007-1013)

**Navigation:** `window.open("name.html?from=npc&race=" + race, "_blank")`

**Button ID:** `nameOpenInGen`

**Payload Structure:**
```javascript
{
  race: string,             // Selected race
  timestamp: number         // Date.now()
}
```

**URL Parameters:**
- `from=npc` - Indicates source
- `race=<selectedRace>` - Pre-selects race in name generator

**Integration Flow:**
1. NPC generator detects race from description
2. Opens name generator in new tab with race parameter
3. Name generator reads localStorage and URL params
4. Applies race preset automatically

---

### Tavern → NPC Generator

**localStorage Key:** `tavern-npc-handoff`

**Source:** [tav.html](../tav.html) (lines 2178-2195)

**Destination:** [npc.html](../npc.html)

**Navigation:** `window.open("npc.html?from=tavern", "_blank")`

**Button ID:** `npcOpenInGenBtn`

**Payload Structure:**
```javascript
{
  fromTavern: true,
  role: string,             // "Bartender", "Server", etc.
  desc: string,             // Physical description
  voice: string,            // Voice description
  mannerisms: string,       // Behavioral traits
  quirk: string,            // Character quirk
  wants: string,            // Goals/desires
  avoids: string,           // Things to avoid
  secret: string,           // Hidden secret
  timestamp: number         // Date.now()
}
```

**URL Parameters:**
- `from=tavern` - Indicates tavern source

**Integration Flow:**
1. Tavern generates basic staff (role, description, voice, mannerism)
2. "Generate Full NPC Details" button clicked
3. Expands staff into complete 8-field NPC
4. Opens NPC generator in new tab with pre-filled data

**Status:** Sending implemented, receiving code may need verification

---

## Battle Map Integrations

### Encounter Builder → Initiative Tracker

**localStorage Key:** `dmtools.pendingImport`

**Source:** [encounterbuilder.html](../encounterbuilder.html) (lines 1468-1503)

**Destination:** [js/initiative.js](../js/initiative.js) (lines 123-181)

**Navigation:** `initiative.html#autoinput`

**Button ID:** `eb-send-to-tracker`

**Payload Structure:**
```javascript
{
  __dmtoolsVersion: 1,
  mode: "append",           // Always append
  characters: [
    {
      name: string,         // Auto-numbered: "Goblin", "Goblin 2", etc.
      type: "Enemy",
      initiative: 1,
      currentHP: number,
      maxHP: number,
      tempHP: 0,
      ac: number | null,
      notes: string,        // "CR X"
      concentration: false,
      deathSaves: { s: 0, f: 0, stable: false },
      status: []
    }
  ],
  currentTurn: 0,
  combatRound: 1,
  diceHistory: []
}
```

**Special Features:**
- Prompts to download stat block text file
- Auto-numbers duplicate monsters
- Fetches full stat blocks from D&D 5e API

---

### Battle Map → Initiative Tracker

**localStorage Key:** `dmtools.pendingInitiativeImport`

**Source:** Not yet implemented

**Destination:** [js/initiative.js](../js/initiative.js) (lines 44-85)

**Navigation:** `initiative.html#autoimport`

**Expected Payload:**
```javascript
{
  name: string,
  maxHp: number,
  ac: number,
  initiative: number
}
```

**Status:** ⚠️ Receiving hook exists, but sending implementation not found

---

## Storage Keys Reference

### Cross-Tool Integration Keys

| Key | Purpose | Source | Destination |
|-----|---------|--------|-------------|
| `dmtools.pendingImport` | Character/Encounter → Tracker | character.js, encounterbuilder.html | initiative.js |
| `dmtools.pendingBattleMapImport` | Character → Battle Map | character.js | battlemap.html |
| `dmtools.pendingInitiativeImport` | Battle Map → Tracker | (not implemented) | initiative.js |
| `npc-name-request` | NPC → Name Generator | npc.html | name.html |
| `tavern-npc-handoff` | Tavern → NPC Generator | tav.html | npc.html |

### Shared Storage Keys

| Key | Purpose | Type |
|-----|---------|------|
| `dmtoolboxCharactersV1` | Character data storage | localStorage |
| `initiativeTrackerData` | Initiative tracker state | localStorage |
| `lootPresets` | Loot generator presets | localStorage |
| `ng-favs` | Name generator favorites | localStorage |
| `ng-settings` | Name generator session | localStorage |
| `ng-results` | Name generator results | localStorage |
| `initiativeHelpSeen` | Help modal state | localStorage |
| `dmCombatMode` | Combat view toggle | localStorage |

### IndexedDB Stores

| Database | Object Stores | Purpose |
|----------|---------------|---------|
| `dmtoolbox` | `characters` | Character portraits and data |
| `dmtoolbox` | `battlemap` | Battle map session data |
| `dmtoolbox` | `journal` | Journal entries with images |

---

## URL Parameters

### Common Parameters

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `from` | `npc`, `tavern`, `character` | Indicates source tool |
| `race` | Race name | Pre-select race in name generator |

### Hash Fragments

| Hash | Purpose |
|------|---------|
| `#autoinput` | Trigger import on page load (Character, Encounter) |
| `#autoimport` | Trigger import on page load (Battle Map) |

---

## Integration Checklist

When adding new cross-tool integrations:

- [ ] Choose appropriate integration pattern
- [ ] Add unique localStorage key with `dmtools.*` namespace
- [ ] Include `__dmtoolsVersion: 1` in payload
- [ ] Include `mode: 'append'` if appropriate
- [ ] Use `#autoinput` or `#autoimport` hash
- [ ] Clean up localStorage after consuming data
- [ ] Clear hash fragment after import
- [ ] Add error handling for missing/invalid data
- [ ] Document in this file with:
  - [ ] localStorage key
  - [ ] Source file and line numbers
  - [ ] Destination file and line numbers
  - [ ] Complete payload structure
  - [ ] Button IDs
  - [ ] Special features

---

## Version History

- **v1.0** - Initial documentation
  - Documented 7 cross-tool integrations
  - Catalogued all localStorage keys
  - Defined integration patterns
