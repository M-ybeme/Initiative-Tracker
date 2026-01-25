# Data Schemas

This document describes the data schemas used by **The DM's Toolbox** for persistent storage. All saved data includes a `schemaVersion` field that enables automatic migration when structures change.

---

## Table of Contents

- [Overview](#overview)
- [Character Schema](#character-schema)
- [Battlemap Schema](#battlemap-schema)
- [Journal Schema](#journal-schema)
- [Migration Policy](#migration-policy)
- [Schema History](#schema-history)

---

## Overview

### SRD Content Scope

Saved objects only capture SRD-legal identifiers (class names, spells, stat blocks) alongside user-authored text. Do not add proprietary fields or preload restricted compendium entries into these schema definitions. If you maintain a private content pack, keep its migrations, schema deltas, and seed data outside of this repository and load them via import at runtime. When extending schemas, verify every default value, enum, and comment references SRD entities or generic placeholders.

### Schema Versioning

All persistent data structures include a `schemaVersion` field:

```javascript
{
  schemaVersion: 2,  // Current version of the data structure
  // ... rest of data
}
```

When data is loaded from storage, the migrations module checks the `schemaVersion` and automatically upgrades the data if needed.

### Current Versions

| Data Type   | Current Version | Minimum Supported |
|-------------|-----------------|-------------------|
| Character   | 2               | 1                 |
| Battlemap   | 1               | 1                 |
| Journal     | 1               | 1                 |

---

## Character Schema

**Current Version: 2**

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | number | Yes | Schema version (current: 2) |
| `id` | string | Yes | Unique identifier (e.g., `char_abc123_xyz789`) |
| `name` | string | Yes | Character name |
| `playerName` | string | No | Player's name |
| `lastUpdated` | string | Yes | ISO 8601 timestamp |

### Character Info

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `race` | string | `''` | Character race |
| `charClass` | string | `''` | Primary class (display) |
| `subclass` | string | `''` | Primary subclass |
| `subclassLevel` | number | `0` | Level subclass was chosen |
| `background` | string | `''` | Background |
| `level` | number | `1` | Total character level (1-20) |
| `alignment` | string | `''` | Alignment |
| `multiclass` | boolean | `false` | Is multiclassed |

### Classes Array (v2+)

| Field | Type | Description |
|-------|------|-------------|
| `classes` | ClassLevel[] | Array of class entries |

**ClassLevel Structure:**
```javascript
{
  className: "Fighter",      // Class name
  subclass: "Champion",      // Subclass name
  level: 5,                  // Levels in this class
  subclassLevel: 3           // Level subclass was chosen
}
```

### Combat Stats

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `ac` | number | `10` | Armor class |
| `maxHP` | number | `0` | Maximum hit points |
| `currentHP` | number | `0` | Current hit points |
| `tempHP` | number | `0` | Temporary hit points |
| `speed` | number | `30` | Walking speed (feet) |
| `initMod` | number | `0` | Initiative modifier |
| `hitDice` | string | `''` | Hit dice notation (e.g., "5d10") |
| `hitDiceRemaining` | number | `0` | Remaining hit dice |

### Ability Scores

| Field | Type | Description |
|-------|------|-------------|
| `stats` | AbilityScores | Ability scores object |
| `statMods` | AbilityModifiers | Computed modifiers (optional) |

**AbilityScores Structure:**
```javascript
{
  str: 16,  // Strength (1-30)
  dex: 14,  // Dexterity
  con: 14,  // Constitution
  int: 10,  // Intelligence
  wis: 12,  // Wisdom
  cha: 8    // Charisma
}
```

### Skills & Saves

| Field | Type | Description |
|-------|------|-------------|
| `skills` | Skills | Skill proficiencies and bonuses |
| `savingThrows` | SavingThrows | Save proficiencies and bonuses |

**Skill Entry Structure:**
```javascript
{
  athletics: { prof: true, exp: false, bonus: 6 },
  perception: { prof: false, exp: false, bonus: 1 }
}
```

### Spellcasting

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `spellcastingAbility` | string | `''` | Spellcasting ability (int/wis/cha) |
| `spellSlots` | SpellSlots | `{}` | Spell slots by level |
| `pactSlots` | PactSlots | see below | Warlock pact magic |
| `spellList` | CharacterSpell[] | `[]` | Known/prepared spells |
| `concentrating` | boolean | `false` | Currently concentrating |
| `concentrationSpell` | string | `''` | Concentration spell name |

**PactSlots Structure (v2+):**
```javascript
{
  level: 3,   // Pact slot level
  max: 2,     // Maximum slots
  used: 1     // Used slots
}
```

### Resources & Conditions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `resources` | Resource[] | `[]` | Class resources (Rage, Ki, etc.) |
| `deathSaves` | DeathSaves | see below | Death save tracking |
| `exhaustion` | number | `0` | Exhaustion level (0-6) |
| `conditions` | string | `''` | Current conditions |
| `inspiration` | boolean | `false` | Has inspiration |

**DeathSaves Structure (v2+):**
```javascript
{
  successes: 0,  // 0-3
  failures: 0,   // 0-3
  stable: false
}
```

**Resource Structure:**
```javascript
{
  name: "Second Wind",
  current: 1,
  max: 1
}
```

### Inventory & Currency

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `inventoryItems` | InventoryItem[] | `[]` | Structured inventory |
| `inventory` | string | `''` | Legacy text inventory |
| `currency` | Currency | see below | Currency amounts |
| `attacks` | Attack[] | `[]` | Attack entries |

**Currency Structure (v2+):**
```javascript
{
  cp: 0,   // Copper
  sp: 0,   // Silver
  ep: 0,   // Electrum
  gp: 100, // Gold
  pp: 0    // Platinum
}
```

**InventoryItem Structure:**
```javascript
{
  name: "Longsword",
  quantity: 1,
  weight: 3,
  notes: "",
  equipped: true
}
```

### Notes & Features

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `features` | string | `''` | Features and traits |
| `notes` | string | `''` | Character notes |
| `portrait` | string | `''` | Base64 image or URL |

---

## Battlemap Schema

**Current Version: 1**

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | number | Yes | Schema version (current: 1) |
| `id` | string | No | Map identifier |
| `name` | string | No | Map name |
| `backgroundImage` | string | No | Background image URL/base64 |

### Grid Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `gridSize` | number | `50` | Grid square size (pixels) |
| `showGrid` | boolean | `true` | Show grid overlay |

### View State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `zoom` | number | `1` | Zoom level |
| `panX` | number | `0` | Pan X offset |
| `panY` | number | `0` | Pan Y offset |

### Tokens

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tokens` | BattlemapToken[] | `[]` | All tokens on map |

**Token Structure:**
```javascript
{
  id: "token_abc123",
  name: "Goblin 1",
  x: 150,           // X position
  y: 200,           // Y position
  size: 1,          // Size in grid squares
  color: "#ff0000", // Token color
  type: "enemy",    // player/enemy/ally/neutral
  hidden: false,    // Hidden from players
  hp: 7,            // Current HP (optional)
  maxHp: 7,         // Max HP (optional)
  conditions: []    // Active conditions
}
```

### Measurements & Fog

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `measurements` | MeasurementShape[] | `[]` | Measurement shapes |
| `fog` | FogShape[] | `[]` | Fog of war shapes |

---

## Journal Schema

**Current Version: 1**

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | number | Yes | Schema version (current: 1) |
| `id` | string | Yes | Unique identifier |
| `title` | string | Yes | Entry title |
| `content` | string | Yes | HTML content (from Quill) |
| `created` | string | Yes | ISO 8601 creation timestamp |
| `updated` | string | Yes | ISO 8601 update timestamp |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `plainText` | string | `''` | Plain text version |
| `category` | string | `''` | Category/folder |
| `tags` | string[] | `[]` | Tags for filtering |
| `pinned` | boolean | `false` | Is pinned |

---

## Migration Policy

### Backwards Compatibility

- **Minimum Supported Version**: Data older than the minimum supported version will still be migrated, but with warnings about potential data loss.
- **Automatic Migration**: All migrations are automatic and happen on load.
- **Non-Destructive**: Original data is not modified until explicitly saved after migration.

### When Migrations Run

1. **On Load**: When data is loaded from localStorage or IndexedDB
2. **On Import**: When data is imported from a file
3. **Never on Render**: Migrations happen once, not on every render

### Adding New Migrations

When changing a data structure:

1. Increment the version in `CURRENT_SCHEMA_VERSIONS`
2. Add a new migration function for that version number
3. Update this documentation
4. Add tests for the new migration

Example migration:
```javascript
const CHARACTER_MIGRATIONS = {
  // ... existing migrations

  3: (char) => {
    const migrated = { ...char };
    // Make your changes
    migrated.newField = migrated.oldField || defaultValue;
    delete migrated.oldField;
    migrated.schemaVersion = 3;
    return migrated;
  }
};
```

---

## Schema History

### Character Schema

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-01-23 | Initial versioned schema. Added `schemaVersion`, `id`, `lastUpdated`. Migrated old stat format to `stats` object. |
| 2 | 2026-01-23 | Added `classes` array for multiclass support. Added structured `deathSaves`, `pactSlots`, `currency`, `inventoryItems`, `resources`, `spellList`. |

### Battlemap Schema

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-01-23 | Initial versioned schema. Added `schemaVersion`. Ensured `tokens`, `measurements`, `fog` arrays exist. Added default grid and view settings. |

### Journal Schema

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-01-23 | Initial versioned schema. Added `schemaVersion`, `id`, `created`, `updated`. |

---

## Usage Examples

### Migrating Character Data

```javascript
import { migrateCharacter } from './js/modules/migrations.js';

// Load from storage
const rawData = JSON.parse(localStorage.getItem('character'));

// Migrate to current version
const { data, migrated, fromVersion, warnings } = migrateCharacter(rawData);

if (migrated) {
  console.log(`Migrated from v${fromVersion} to current`);
}

if (warnings.length > 0) {
  console.warn('Migration warnings:', warnings);
}

// Use migrated data
displayCharacter(data);
```

### Checking If Migration Is Needed

```javascript
import { needsMigration, getMigrationInfo } from './js/modules/migrations.js';

if (needsMigration(characterData, 'character')) {
  const info = getMigrationInfo(characterData, 'character');
  console.log(`Needs migration: v${info.currentVersion} → v${info.targetVersion}`);
}
```
