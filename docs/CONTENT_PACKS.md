# Content Packs

Content packs are private JSON files that extend the SRD-only toolbox with licensed material you own — additional classes, spells, feats, races, generator tables, and more. Packs are stored entirely in your browser and never leave your device.

For step-by-step instructions on building a pack, see the [Content Pack Authoring Guide](CONTENT_PACK_AUTHORING.md). This document covers the system's architecture, validation rules, event model, and public API for developers or advanced users who want to understand how the runtime works or extend it.

---

## Design Guarantees

- **SRD build stays pristine.** Packs are never bundled with the public repository. They live in your browser's IndexedDB or localStorage.
- **Data-only.** Packs contain structured JSON. No executable code, no scripts, no macros are evaluated.
- **Reversible.** Toggling a pack off or clearing browser storage snaps the app back to the SRD baseline immediately — no page reload required.
- **Fail fast.** Invalid packs are rejected at import time with specific, actionable error messages before any data is written.

---

## Lifecycle

```
Author → Import → Validate → Store → Activate → Toggle On/Off → Remove
```

1. **Author** — Create a JSON file using the starter template (`docs/examples/content-pack-template.json`). Fill in metadata, an allowlist of IDs to unlock in the UI, and one record per piece of content you want to add.

2. **Import** — Open the Content Pack Manager (`Ctrl+Alt+D` or footer gear icon → "Open Content Pack Manager"). Drag a file onto the dialog or paste JSON into the text area.

3. **Validate** — The manager validates metadata fields, checks every record type against the allowed set, verifies payload shapes, flags duplicate IDs, and rejects anything that fails. A SHA-256 fingerprint of the pack is computed for diagnostics.

4. **Store** — Valid packs are written to IndexedDB (falling back to localStorage, then in-memory). The pack's enabled state, metadata, and fingerprint are all persisted.

5. **Activate** — On enable, the runtime merges the pack's allowlist into `SRDContentFilter` and injects each record into the relevant registry (`LevelUpData`, `SPELLS_DATA`, generator tables, etc.). The `dmtoolbox:packs-applied` event fires, prompting UI surfaces to refresh.

6. **Toggle On/Off** — Packs can be enabled or disabled at any time without removal. Disabling reverses the record merges and re-applies SRD content filtering. The `dmtoolbox:packs-ready` event fires after every state change.

7. **Remove** — Deleting a pack removes it from storage and fully restores the SRD baseline. "Remove All" clears every pack at once.

---

## JSON Structure

A content pack is a single JSON object with six top-level sections:

| Section | Required | Purpose |
|---------|----------|---------|
| `metadata` | ✅ | Identifies the pack — id, name, version, authorship, license |
| `dependencies` | optional | Other pack IDs that must be loaded and enabled first |
| `allowlist` | optional | Type → ID arrays that unlock SRD-gated UI elements |
| `records` | optional | Content entries (classes, spells, feats, etc.) to inject at runtime |
| `assets` | optional | Embedded images (tokens, portraits, maps) encoded as data URLs |
| `notes` | optional | Freeform strings for the author's own reference |

A `_doc` key at the top level is silently ignored by the runtime and can hold inline documentation for the pack file itself.

### `metadata`

All five marked fields must be present or the pack is rejected at import:

| Field | Required | Format | Description |
|-------|----------|--------|-------------|
| `id` | ✅ | reverse-domain slug | Unique across all packs. Lowercase letters, digits, dots, hyphens, underscores. No leading/trailing special chars. Example: `com.yourname.eberron` |
| `name` | ✅ | string | Friendly display name shown in the pack manager |
| `version` | ✅ | X.Y.Z semver | Track revisions. Example: `1.0.0` |
| `license` | ✅ | string | Terms reminder. Usually `"Private use only"` |
| `toolVersion` | ✅ | X.Y.Z semver | App version this pack was authored against |
| `authors` | optional | string[] | Names of pack authors |
| `source` | optional | string | Book, PDF, or campaign the data comes from |
| `createdAt` / `updatedAt` | optional | ISO 8601 | Timestamps for your audit trail |
| `homepage` | optional | https:// URL | Link to documentation or campaign wiki |

### `dependencies`

Array of objects that declare prerequisite packs. The manager checks that all listed packs are installed and enabled before activating a pack with dependencies:

```json
"dependencies": [
  { "id": "com.yourname.base", "minVersion": "1.2.0" }
]
```

### `allowlist`

Controls which IDs become visible through the SRD content gate. Without a matching allowlist entry, a record that targets an SRD-gated slot remains hidden even after the record is injected. Each key is a content type and each value is an array of IDs:

| Key | Example ID | What it unlocks |
|-----|------------|-----------------|
| `class` | `"Artificer"` | Class in character creation |
| `subclass` | `"Wizard:Arcane Geometer"` | `ClassName:SubclassName` format |
| `race` | `"Warforged"` | Species/race option |
| `subrace` | `"Elf:Dark Elf (Drow)"` | `RaceName:SubraceName` format |
| `spell` | `"Tasha's Caustic Brew"` | Spell in all class spell lists |
| `feat` | `"Telekinetic"` | Feat in level-up and creation wizard |
| `background` | `"Haunted One"` | Background option |
| `fighting-style` | `"Blind Fighting"` | Fighter/Paladin/Ranger option |
| `pact-boon` | `"Pact of the Talisman"` | Warlock pact choice |
| `eldritch-invocation` | `"Eldritch Mind"` | Warlock invocation |
| `metamagic` | `"Seeking Spell"` | Sorcerer metamagic |
| `generator-table` | `"loot:custom-artifacts"` | Inclusion in a generator pool |

### `records`

Array of content entries. Each record has four fields:

```json
{
  "type": "spell",
  "id": "Prismatic Pulse",
  "operation": "add",
  "payload": { ... }
}
```

See [Record Types](#record-types) for type-specific payload shapes.

### `assets`

Embedded binary files. Each asset needs `id`, `usage`, and `data` (base64 or data URL). Supported `usage` values: `token`, `portrait`, `map`, `handout`.

```json
"assets": [
  {
    "id": "token-ranger",
    "usage": "token",
    "data": "data:image/png;base64,iVBORw0KGg..."
  }
]
```

Assets are kept in storage alongside the pack record; there is no external hosting. Size limits follow the browser's IndexedDB quota.

### `notes`

Array of freeform strings for human-readable reminders. Not parsed by the runtime.

---

## Record Types

The `type` field on each record must match one of the following:

| Type | What it adds | ID format |
|------|-------------|-----------|
| `class` | A full playable class with progression tables | `ClassName` (e.g., `Artificer`) |
| `subclass` | A subclass nested under a parent class | `ClassName:SubclassName` |
| `race` | A playable species | `RaceName` |
| `subrace` | A subrace nested under a parent race | `RaceName:SubraceName` |
| `spell` | A spell entry | Spell title (e.g., `Tasha's Caustic Brew`) |
| `feat` | A feat available at level-up | Feat name |
| `background` | A background option in character creation | Background name |
| `fighting-style` | A fighting style for Fighter/Paladin/Ranger | Style name |
| `pact-boon` | A Warlock pact boon | Boon name |
| `eldritch-invocation` | A Warlock eldritch invocation | Invocation name |
| `metamagic` | A Sorcerer metamagic option | Option name |
| `generator-table` | A table merged into a generator pool | `generator:table-name` |
| `class-resource` | A named resource tracked in the Resources panel | `class-resource:ClassName:ResourceName` |
| `equipment-choice` | Starting equipment choices for a class | `ClassName` |
| `starting-gold` | Starting gold alternative for a class | `ClassName` |
| `beast` | A beast form for Wild Shape or Polymorph | Creature name |
| `artifact` | A named magic item | Item name |
| `item` | A shop or loot inventory item | Item name |
| `note` | Freeform note attached to a record | Any unique string |

### Payload shapes

Payloads must mirror the corresponding in-app data structures. Key shapes:

- **`class`** — mirrors `LevelUpData.CLASS_DATA` entries: `hitDice`, `primaryAbility`, `proficiencies`, `features` (object keyed by level), `spellcastingProgression`, `spellSlots` (object keyed by level, arrays [1st..9th slot counts])
- **`subclass`** — mirrors `LevelUpData.CLASS_DATA[class].subclasses` entries: `name`, `description`, `features` keyed by level
- **`spell`** — mirrors `SPELLS_DATA` objects: `title`, `level`, `school`, `casting_time`, `range`, `components`, `duration`, `body`, `classes` array, `tags` array, and optional dice fields (`damage_dice`, `heal_dice`, `save_dc_ability`)
- **`feat`** — mirrors `LevelUpData.FEATS`: `name`, `description`, `prerequisites`
- **`background`** — mirrors `LevelUpData.BACKGROUND_DATA`: `name`, `description`, `proficiencies`, `feature`, `equipment`
- **`fighting-style`** — mirrors `LevelUpData.FIGHTING_STYLE_DATA`: `name`, `description`, `classes`
- **`pact-boon`** — mirrors `LevelUpData.PACT_BOON_DATA`: `name`, `description`
- **`eldritch-invocation`** — mirrors `LevelUpData.ELDRITCH_INVOCATION_DATA`: `name`, `description`, `prerequisites`
- **`metamagic`** — mirrors `LevelUpData.METAMAGIC_DATA`: `name`, `description`, `cost`
- **`race`** — mirrors `LevelUpData.RACE_DATA`: `name`, `description`, `traits`, `languages`, `abilityScoreIncrease`
- **`subrace`** — mirrors `LevelUpData.SUBRACE_DATA`: `name`, `race`, `description`, `traits`
- **`generator-table`** — `table` (string name), `entries` (string[]), optional `weight` (number[])

The [JSON Schema](../schemas/content-pack.schema.json) is the authoritative field reference. Most editors (VS Code, JetBrains, etc.) can validate JSON files against a schema automatically — point them at `schemas/content-pack.schema.json`.

---

## Operations

Each record's `operation` controls how the runtime applies it:

| Operation | Behavior |
|-----------|----------|
| `add` | Merges payload into the existing entry if the ID already exists, or inserts a new entry. Fields you omit are preserved from the base data. |
| `replace` | Overwrites the existing entry entirely. Use when you want to explicitly clear fields that exist in the base SRD record. |
| `remove` | Hides the entry from all UI surfaces. Reverses when the pack is toggled off or removed. |

**Merge behavior for `add`:** When your record ID matches an existing SRD entry, only the fields you supply are overridden — fields absent from your payload are preserved from the base data. This lets a pack author patch a single field (e.g., make Fireball a ritual) without copying the entire record. Homebrew records with no base entry must supply all required fields themselves.

---

## Validation

The following is checked at import time. Invalid packs are rejected — nothing is written to storage — and each error includes the field path and reason:

- **Pack ID format**: lowercase letters, digits, dots, hyphens, underscores; no leading/trailing special characters
- **Version fields** (`version`, `toolVersion`): must be `X.Y.Z` semver format
- **URLs** (`homepage`): must start with `http://` or `https://`
- **Required metadata**: all five required fields must be present and non-empty strings
- **Record types**: `type` must appear in the supported set
- **Record IDs**: `id` is required on every record
- **Operations**: must be `add`, `replace`, or `remove`
- **No duplicate type:id pairs**: the same combination cannot appear more than once (except `remove` records, which are always allowed)
- **Payload shape**: required fields are verified per record type
- **Asset structure**: each asset needs `id`, `usage`, and `data`
- **Description length**: `body` or `description` over 4,000 characters triggers a warning (not a rejection)

A SHA-256 fingerprint of the normalized pack contents is computed on import and displayed in the diagnostics panel (`Ctrl+Alt+D`) for remote debugging without exposing the data itself.

---

## Event System

Three custom DOM events coordinate pack state with the rest of the app:

| Event | When it fires | Who listens |
|-------|--------------|-------------|
| `dmtoolbox:packs-applied` | After pack records are injected into `LevelUpData` / `SPELLS_DATA` | Character creation wizard, level-up wizard, spell lists, combat card |
| `dmtoolbox:srd-filtered` | After the SRD content filter runs on page load or reset | `ContentPackRuntime` — triggers re-application of pack data on top of the freshly filtered baseline |
| `dmtoolbox:packs-ready` | After all pack content is fully applied and caches are invalidated | Any surface that needs to re-render after a pack state change |

**Dispatch order on toggle-on:**
`dmtoolbox:packs-applied` → `dmtoolbox:packs-ready`

**Dispatch order on page load with SRD gating active:**
`dmtoolbox:srd-filtered` → *(runtime re-applies all enabled packs)* → `dmtoolbox:packs-applied` → `dmtoolbox:packs-ready`

---

## Storage

Packs are persisted using the first available backend:

1. **IndexedDB** — `packs` object store, keyed by pack ID. Stores the full pack blob, metadata, enabled flag, and last-updated timestamp.
2. **localStorage fallback** — Single JSON array under a fixed key. Used when IndexedDB is unavailable (some private-browsing contexts, storage quota exceeded).
3. **Memory fallback** — Non-persistent in-memory store. Used when both above fail. Data is lost on page refresh.

The active storage driver is reported in the diagnostics panel.

---

## Public API

`ContentPackManager` in `js/modules/content-pack-manager.js` exposes the following methods for use by other modules:

| Method | Returns | Description |
|--------|---------|-------------|
| `importPack(json)` | `{ ok, errors, pack }` | Validates and stores a pack from a JSON string or object |
| `togglePack(id, enabled)` | `Promise<void>` | Enables or disables a pack; fires pack-ready events |
| `removePack(id)` | `Promise<void>` | Removes a pack from storage entirely |
| `exportPack(id)` | `string` | Returns the stored pack as a formatted JSON string |
| `getPacks()` | `Pack[]` | Returns all stored pack metadata objects |
| `getMergedContext()` | `{ allowlist, records }` | Returns the merged allowlist and record summary for all enabled packs |
| `getSummary()` | `object` | Returns diagnostic info: total packs, enabled count, record type counts, storage driver |

---

## Extending the System

To add a new record type:

1. Add the type string to `ALLOWED_RECORD_TYPES` in `js/modules/content-pack-manager.js`
2. Add payload validation logic to `validateRecordPayload()` in the same file
3. Add normalization and injection logic in `js/modules/content-pack-runtime.js`
4. Update the schema at `schemas/content-pack.schema.json`
5. Add an example record to `docs/examples/content-pack-template.json`

To add a new asset usage type, add the string to `ASSET_USAGES` in `content-pack-manager.js`.

To swap the storage backend, implement `{ kind: string, loadAll(): Promise<Pack[]>, saveAll(packs: Pack[]): Promise<void> }` and pass it to the manager constructor.
