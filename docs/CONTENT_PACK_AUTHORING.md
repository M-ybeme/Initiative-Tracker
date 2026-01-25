# Content Pack Authoring Guide

This is the player-facing cookbook for building private content packs that re-enable material you personally own. Packs never leave your browser: the JSON file lives on your machine, the toolbox stores it in IndexedDB/localStorage, and you can clear everything to return to the SRD baseline at any time.

Use this guide if you want to:
- Load additional classes, spells, feats, tables, or items that are not part of the SRD 5.1 release.
- Keep those records private to your table while staying in line with the repository's licensing rules.
- Share a structured reminder of where each option came from without copying proprietary prose.

---

## Prerequisites

1. 📚 You legally own every book or PDF you are referencing.
2. 📝 A text editor that can save UTF-8 JSON (VS Code, Notepad++, etc.).
3. 🌐 A local copy of The DM's Toolbox (either the public site or a private bundle).
4. 🔒 Agreement that packs stay on your devices—do not submit them via PRs or public uploads.

---

## Step 1 — Copy the Starter Template

Download or duplicate [docs/examples/content-pack-template.json](examples/content-pack-template.json). Rename it to something meaningful (for example, `eberron-pack.json`). The template already contains every top-level section the loader understands:

```text
metadata      → Who owns this pack?
dependencies  → Other packs you rely on (optional)
allowlist     → IDs that should become visible in the UI
records       → The actual classes/spells/items you add
notes         → Freeform reminders for your future self
```

> Tip: Keep one pack per book/source. Smaller files are easier to audit and share with a trusted co-DM.

---

## Step 2 — Fill Out Metadata

Populate the `metadata` object so diagnostics can identify the pack:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Use a reverse-domain or slugged id (`com.marlo.eberron`). Must be unique across all packs you import. |
| `name` | ✅ | Friendly name shown in the modal. |
| `version` | ✅ | Semver-style string so you can track revisions. |
| `authors` | ✅ | Array of names or initials of the people who prepared the pack. |
| `source` | ✅ | Cite the book/PDF you own (“Eberron: Rising from the Last War”). |
| `license` | ✅ | Reminder that this is for personal use only. |
| `toolVersion` | ⛔ | Optional reference to the app version that exported/imported the pack. |
| `createdAt` / `updatedAt` | ⛔ | ISO-8601 timestamps for your own audit trail. |
| `homepage` | ⛔ | Personal URL or campaign wiki entry if you want to point collaborators to context. |

Keep this section short—no rules text belongs here.

---

## Step 3 — Declare What Should Unlock

`allowlist` tells the SRD gatekeeper which IDs become visible once the pack is enabled. Each property is an array of string identifiers. Common buckets:

| Type | Example ID | Notes |
|------|------------|-------|
| `class` | `Artificer` | Matches `LevelUpData.CLASS_DATA` keys. |
| `subclass` | `Wizard:Bladesinging` | `${ClassName}:${SubclassName}`. |
| `spell` | `Tashas Caustic Brew` | Use the spell title as displayed in the SRD data. |
| `feat` | `Fey Touched` | Exact feat names. |
| `background` | `Investigator` | Aligns with `LevelUpData.BACKGROUND_DATA`. |
| `generator-table` | `loot:ravnica-artifacts` | Custom table identifiers from generators. |

Only list the IDs you actually include in `records`. The UI will warn you if an allowlisted id lacks a matching record.

---

## Step 4 — Add Records

Each entry inside `records` represents data the runtime merges into its registries. Required fields:

```json
{
  "type": "spell",
  "id": "Tashas Caustic Brew",
  "operation": "add",
  "payload": {
    "title": "Tasha's Caustic Brew",
    "level": 1,
    "school": "Conjuration",
    "casting": "1 action",
    "range": "60 feet",
    "components": "V, S, M (a bit of spoiled food)",
    "duration": "Concentration, up to 1 minute",
    "description": "Describe the effect in your own words."
  }
}
```

- `type`: Must appear in the schema enum (`class`, `subclass`, `spell`, `feat`, `background`, `generator-table`, etc.).
- `id`: Unique identifier for that record.
- `operation`: `add`, `replace`, or `remove`. Use `replace` only when you intentionally override an SRD entry and include that rationale in `notes`.
- `payload`: Matches the structure from the built-in data files (for example, `data/srd/spells-data.js`).

### Writing Safe Descriptions

- Summarize rules in your own words. Do not copy paragraphs verbatim.
- Reference page numbers or chapter names inside the `notes` array instead of embedding excerpts.
- If you need the original wording at the table, keep the physical/digital book open alongside the app.

### Beyond Spells

| `type` | Payload reference |
|--------|-------------------|
| `class` / `subclass` | Mirrors the shapes inside `data/srd/level-up-data.js` (`featuresByLevel`, `spellcastingProgression`, etc.). |
| `feat` | `LevelUpData.FEATS` entries (`name`, `description`, `prerequisites`). |
| `background` | `LevelUpData.BACKGROUND_DATA`. |
| `generator-table` | Objects with `table`, `entries`, and optional `weight` arrays, just like the existing loot/shop/tavern generators. |

Use the [schemas/content-pack.schema.json](../schemas/content-pack.schema.json) file as the authoritative source for field requirements. Most editors can validate JSON against a schema automatically.

---

## Step 5 — Validate and Import

1. Open The DM's Toolbox.
2. Press `Ctrl + Alt + D` to open the diagnostics panel, then click **Open Content Pack Manager**.
3. Choose either **Paste JSON** or **Upload File** and import your pack.
4. Fix any validation errors reported in the status banner (missing metadata, unknown types, duplicate IDs, etc.).
5. Toggle the pack on. Locked UI sections will refresh automatically; re-open the diagnostics panel to confirm record counts and fingerprints.
6. When you are done with a campaign, use **Remove All** to snap back to the SRD-only baseline.

> Need an offline bundle with your pack pre-copied? Run `npm run build:pack -- --packs path/to/your-pack.json` and follow [docs/PRIVATE_BUILD.md](PRIVATE_BUILD.md) for hosting instructions.

---

## Cite Your Sources

To respect Wizards of the Coast's license and any third-party authors:

- Include the book or document title in `metadata.source` and reiterate detailed citations inside `notes`.
- Keep `metadata.license` set to something like "Private use only" or the publisher's stated terms.
- Never include scans, images, or verbatim chapters. The toolbox only needs structured data plus personal reminders.
- If you collaborate with other DMs, share packs directly (email, private repo, USB drive) rather than publishing them.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Unsupported type" error | Check the `type` value matches the schema enum exactly. |
| "Duplicate id" warning | Another pack or the SRD baseline already defines that id. Use `replace` only when intentional. |
| Pack imports but nothing unlocks | Ensure `allowlist` entries match the IDs you added in `records`. |
| Need to quickly disable everything | Click **Remove All** inside the modal or clear browser storage for the site. |

Have an idea for additional record types? Open an issue describing the data shape you need. As long as it stays data-only, we can usually extend the schema in a backward-compatible way.
