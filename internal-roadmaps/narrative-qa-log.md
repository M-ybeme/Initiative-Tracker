# Narrative Manifest QA Log

_Date:_ 2026-01-24

## Sample Review
| Entry | Manifest Status | Evidence |
|-------|-----------------|----------|
| docs/ARCHITECTURE.md | `original` | High-level system prose with zero SRD excerpts, e.g., the intro framing in [Architecture Overview](docs/ARCHITECTURE.md#L1-L4) and module diagrams that only describe proprietary tooling. |
| docs/LEVEL_UP_SYSTEM.md | `non-srd` | References upcoming “Additional Feat Sources” from Tasha's/Xanathar's in [Section 122](docs/LEVEL_UP_SYSTEM.md#L122-L134), confirming non-SRD scope. |
| docs/SPELLS.md | `non-srd` | Declares coverage of Xanathar's/Tasha's spells in [Overview](docs/SPELLS.md#L1-L9) and enumerates Summon spell packages later in the file, so it must stay gated. |
| Tooltip (name.html#L681) | `original` | Copy merely instructs users how to pick a culture ([name.html#L681](name.html#L681)); no SRD verbiage. |

## Follow-Up Actions
1. Mark QA complete for the sampled entries above; continue spot-checking during implementation.
2. Wire `status` field into tooling:
   - Load manifests at build time and export allowlists of `srd-ok`/`original` ids.
   - Update data registries (e.g., `js/level-up-data.js`, `js/spells-data.js`) to reference allowlists before rendering options.
   - Gate UI pickers (Character Wizard, Spell Browser, etc.) by filtering any entry flagged `non-srd` unless a future content-pack toggle is active.
   - Surface a diagnostics panel entry to show when non-SRD content is hidden for easier QA.
3. Track remaining docs flagged `non-srd` (LEVEL_UP_SYSTEM, SPELLS) for textual rewrites in Phase 1's “Text scrub” effort.
