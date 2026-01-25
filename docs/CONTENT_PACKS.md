# Content Packs

This guide captures the Phase 2 plan for private content packs: how they are structured, how the browser loads them, and what guarantees we provide to keep the SRD-only baseline intact. The goal is **boring-simple authoring for us** plus **fully featured runtime behavior for outside users who own the material they are reloading**.

---

## Goals & Guardrails

- **Keep the SRD build pristine.** Packs never ship with the public bundle and stay in the user’s browser storage.
- **Make authoring approachable.** One JSON file with a documented schema, copy/paste friendly examples, and optional metadata helpers.
- **Stay data-only.** No executable code, no macros, no scripts. Packs describe data that our runtime already understands.
- **Fail fast.** Invalid packs should be rejected immediately with actionable validation errors.
- **Be reversible.** Clearing packs (or using a private browsing session) must snap the app back to the SRD baseline.

---

## Lifecycle Overview

1. **Authoring** – A DM duplicates the sample JSON, fills out metadata, and lists the records they personally own (classes, spells, feats, items, etc.).
2. **Import** – The user drags the file onto the “Manage Content Packs” dialog or pastes JSON into the text field.
3. **Validation** – We validate against [schemas/content-pack.schema.json](schemas/content-pack.schema.json), check record types, scan for restricted prose, and compute a SHA-256 fingerprint for diagnostics.
4. **Storage** – Valid packs are persisted in IndexedDB (fallback to localStorage) with their metadata, enabled flag, and fingerprint.
5. **Activation (Phase 3.5)** – Enabling a pack should merge its allowlist, inject data into the relevant registries (`LevelUpData`, `SPELLS_DATA`, generators, etc.), and trigger SRD DOM re-evaluation so hidden buttons reappear. This wiring was missed in Phase 3 and is now being implemented as a hotfix.
6. **Diagnostics** – The Ctrl+Alt+D panel lists loaded packs with record counts and hashes to make remote debugging possible without the data itself.
7. **Removal** – Disabling or deleting a pack reverses the merges and re-applies the SRD filters. Clearing browser storage removes every pack.

---

## JSON Schema (Step 1 Deliverable)

The canonical schema lives at [schemas/content-pack.schema.json](schemas/content-pack.schema.json). High-level structure:

| Section | Required | Purpose |
|---------|----------|---------|
| `metadata` | ✅ | Identifies the pack (id, name, version, authorship, license statement, created/updated timestamps, tool version used to export, optional homepage). |
| `dependencies` | ⛔ | Optional references to other pack IDs plus minimum versions to enforce load order. |
| `allowlist` | ⛔ | Type→ID arrays that merge into `SRDContentFilter.allowlist` before DOM gating runs. |
| `records` | ⛔ | Array of content entries. Each record has a `type` (spell, class, subclass, feat, background, item, generator-table, etc.), a unique `id`, an `operation` (`add`, `replace`, `remove`), and a `payload` whose shape matches the in-app registry. |
| `assets` | ⛔ | Optional embedded images/files encoded as data URLs with explicit usage (token, portrait, map overlay). |
| `notes` | ⛔ | Freeform text to remind the table where the pack came from (e.g., “Converted from my Eberron bookmarks”). |

### Record Payload Expectations

- **Class / Subclass:** Must match the structures in `data/srd/level-up-data.js`. We enforce required keys (`hitDice`, `proficiencies`, `featuresByLevel`, etc.) and warn if feature text exceeds the SRD summary length guidelines.
- **Spell:** Mirrors the objects in `data/srd/spells-data.js` (`title`, `level`, `school`, `casting`, `range`, `components`, `duration`, `description`).
- **Generator Tables:** Provide `table`, `entries`, and `weight` fields so we can merge them into loot/shop/tavern pools.
- **Background / Feat / Resource:** Aligns with corresponding `LevelUpData` tables; the schema references these shapes via shared definitions.
- **Custom Buckets:** The schema’s `records[].type` enum is intentionally broad. For any new type, we only need to update the definitions and the pack manager merge table.

### Operations

`operation` controls how we apply the payload:

- `add` – Inserts a new entity; errors if the target ID already exists in the SRD baseline or another enabled pack.
- `replace` – Overwrites an existing ID after the user confirms the conflict (UI will highlight this).
- `remove` – Allows a pack to explicitly remove SRD entries (useful for variant tables); these changes revert once the pack is disabled.

---

## Runtime Responsibilities (Upcoming Steps)

| Roadmap Task | Implementation Notes |
|--------------|----------------------|
| Loader Service | `ContentPackManager` module handles imports, schema validation, hash calculation, and persistence. It exposes `loadPacks()`, `importPack()`, `togglePack(id, enabled)`, and `getMergedContext()` so existing screens can subscribe. |
| UI Surface | Modal reachable from the navbar. Includes drag-and-drop area, JSON textarea, list of installed packs with enable/disable switches, conflict badges, and export/delete buttons. |
| Offline Storage | IndexedDB store `packs` with `id` as key and fields `{ metadata, recordsHash, enabled, lastUpdated, blob }`. LocalStorage fallback uses a single JSON array. |
| Diagnostics | Diagnostics panel gets a “Content Packs” section with count, enabled IDs, and each pack’s fingerprint + total records. |

---

## Authoring Checklist

1. Duplicate the starter template in [data/packs/experimental/README.md](data/packs/experimental/README.md) (to be replaced by a generator once the loader module ships).
2. Fill out metadata. Use reverse-domain IDs to avoid collisions (`com.example.mars-colony`).
3. For each entity you own, create a record with the matching payload shape. Keep descriptions to personal summaries—never paste copyrighted prose.
4. Validate locally: `npm run validate-pack path/to/file.json` (script will land with the loader service) or drop it into the upcoming UI.
5. Import via the “Manage Content Packs” dialog and confirm the SRD notices disappear where expected.

---

## Example Snippet

```json
{
  "metadata": {
    "id": "com.example.eberron",
    "name": "Wayfinder Archive",
    "version": "1.0.0",
    "authors": ["Marlo"],
    "license": "Private use only",
    "source": "Eberron: Rising from the Last War",
    "toolVersion": "2.0.5"
  },
  "allowlist": {
    "class": ["Artificer"],
    "spell": ["Tasha's Caustic Brew"],
    "class-resource": ["class-resource:Artificer:Infused Items"]
  },
  "records": [
    {
      "type": "class",
      "id": "Artificer",
      "operation": "add",
      "payload": {
        "hitDice": "d8",
        "primaryAbility": "int",
        "spellcastingProgression": "half",
        "featuresByLevel": {
          "1": ["Magical Tinkering", "Spellcasting"],
          "2": ["Infuse Item"],
          "3": ["Specialist"],
          "4": ["Ability Score Improvement"]
        }
      }
    }
  ]
}
```

The schema enforces field presence, but your payload can include any additional properties our registries understand (e.g., resource arrays, equipment choices, subclass hooks). The pack manager will skip unknown record types with a warning so advanced users can stage future-facing data without breaking import.

---

## Next Steps

- Wire the schema into a runtime validator (Ajv or a slim custom validator) inside `js/modules/content-pack-manager.js`.
- Build the pack manager storage layer with IndexedDB + localStorage fallback.
- Create the “Manage Content Packs” modal and route conflicts/errors through the diagnostics panel.
- Extend pruning helpers (`pruneLevelUpData`, generators, etc.) to support reversible merges so disabling a pack restores the SRD baseline without reloads.
- **Runtime integration (Phase 3.5):** add `initContentPackRuntime()` to subscribe to `ContentPackManager`, merge allowlists, apply record operations into `LevelUpData`/`SPELLS_DATA`, and fire a `dmtoolbox:packs-applied` event so UI surfaces can refresh when packs change.

Once those pieces ship, outside users can keep a single JSON file per book, import it in a few clicks, and enjoy the same UI the SRD build uses—no forks, no secret branches, just private local data.
