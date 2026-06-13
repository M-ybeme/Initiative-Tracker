# Spell Database Documentation

This document describes how the SRD-only spell database works inside The DM's Toolbox and how it interacts with the SRD gating runtime.

## Overview

The public build now ships exclusively with spells that appear in the System Reference Document 5.1. Non-SRD spells remain in the historical data files for private-pack users, but the runtime only surfaces entries that exist in the SRD allowlist. This keeps the repository compliant while preserving the existing data model for people who legally own other books and choose to load them locally.

## SRD Coverage

- Base catalogue mirrors the SRD spell appendix (cantrips through 9th level).
- Each spell carries standardized metadata: school, casting time, range, components, duration, tags, concentration, `ritual` boolean, and class lists.
- Prepared-caster rules read directly from the SRD subset so Cleric/Druid/Paladin spell counts stay accurate without referencing gated material.
- The Character Manager and Level-Up system both query the SRD allowlist before displaying search results, so non-SRD spells never appear unless a private content pack merges them client-side.

## Filtering Pipeline

1. **Source data** lives in `data/srd/spells-data.js`, formatted as an array of spell objects.
2. **Allowlist generation** happens during the build that produces `js/generated/srd-allowlist.js`. Only spells tagged as `srd: true` (or explicitly enumerated) make it into the array consumed at runtime.
3. **Runtime gating** in `js/site.js` exposes `window.SRDContentFilter`, which removes any non-allowed spell IDs before UI layers render them.
4. **DOM safeguards** mark spell rows with `data-srd-block` so tooltips and selectors show "Requires private content pack" when the allowlist rejects an entry.

This four-step path ensures older data can coexist with the SRD surface while keeping the shipped experience compliant.

## Private Content Packs

Tables can load a private JSON payload that adds back spells they personally licensed. When a pack is loaded:

- The local pack registers additional spell IDs with `SRDContentFilter.registerPrivateContent()`.
- UI controls automatically re-render, revealing the extra spells without any repository edits.
- No non-SRD text ever ships from this repo—the content lives only in the player's browser.

The UI marks gated spells with `data-srd-block` tooltips explaining why an option is unavailable and how to load a private pack to re-enable it.

### Ritual Casting in Content Packs

Set `"ritual": true` on any spell payload to enable the cyan Ritual badge and the Ritual cast button (casts without a slot, +10 min casting time). This is the canonical approach for both new homebrew spells and patches to existing entries. Fallback detection also works for packs that use the school string convention (`"Divination (Ritual)"`) or include `"ritual"` in `casting_time` — but the boolean is cleaner and future-proof.

```json
{
  "type": "spell",
  "id": "My Ritual Spell",
  "operation": "add",
  "payload": {
    "title": "My Ritual Spell",
    "level": 1,
    "school": "Divination",
    "ritual": true,
    "tags": ["ritual", "utility"],
    ...
  }
}
```

## Integration Points

- **Character Manager**: `js/character.js` and `js/character-creation-wizard.js` request spell data through the SRD filter so dropdowns remain compliant.
- **Level-Up System**: `js/level-up-system.js` uses the same helper to show only legal options when learning or preparing spells.
- **Exports**: `js/character-sheet-export.js` prints the filtered spell list and appends the SRD attribution required by CC BY 4.0.

## Testing & Validation

- Vitest unit suites cover spell filtering helpers and ensure the allowlist never returns barred spell IDs.
- Playwright E2E tests for the Character Creation Wizard assert that only SRD spells appear during selection.
- Manual spot checks leverage the diagnostics panel (`Ctrl+Alt+D` or footer gear icon) to confirm the SRD filter status and the count of visible spells.

## File Reference

- `data/srd/spells-data.js` – canonical spell object definitions.
- `js/generated/srd-allowlist.js` – compiled SRD ID list consumed in production.
- `js/site.js` – SRD filtering helpers and DOM gating utilities.
- `js/character-creation-wizard.js`, `js/level-up-system.js` – primary consumers of the filtered spell data.

Keep documentation changes synced with these files whenever the SRD allowlist or private-pack workflow evolves.
