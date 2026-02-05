# SRD Compliance + Content Pack Roadmap (Internal)

> Goal: ship a public-facing build that contains only SRD 5.1 (plus original homebrew) while preserving a path for privately loading expanded datasets through bring-your-own "content packs".

## Phase 0 — Discovery & Policy (1 week)
1. **Content inventory:** tag every race, subclass, spell, item, background, feat, monster, and rules blurb with an SRD citation or "non-SRD" flag. Deliverable: spreadsheet/JSON manifest.
2. **License posture:** add SRD 5.1 CC-BY 4.0 text, attribution notice, and Product Identity disclaimer draft. Decide final placement (README, app footer, exports) before coding.
3. **Contributor rules:** update CONTRIBUTING.md draft with "SRD-only" guardrails, review checklist, and escalation path for ambiguous content.

### Phase 0 Tracker (target complete: Feb 7, 2026)

| # | Workstream | Owner | Deliverable | Status | Immediate next action |
|---|------------|-------|-------------|--------|------------------------|
| 0.1 | Content inventory | Marlo | `internal-roadmaps/manifests/srd-audit.json` + `internal-roadmaps/manifests/narrative-audit.json` listing every entity and doc/tooltip block with `source`, `srdCitation`, `nonSrdReason` | ✅ Completed (Jan 24) | Allowlist generator + runtime filters now hide non-SRD ids by default. |
| 0.2 | License posture | Marlo | `docs/licensing/README.md` describing MIT vs CC-BY separation + attribution text block for UI | ✅ Completed (Jan 24) | Attribution + disclaimer now render in app footers, diagnostics panel, and every export surface. Next: roll directly into contributor guardrails (0.3). |
| 0.3 | Contributor rules | Marlo | Updated `CONTRIBUTING.md` section "Content Compliance" with checklist + escalation steps | ✅ Completed (Jan 24) | Checklist + escalation path published in CONTRIBUTING; future work: mirror checklist into PR template + CI guardrails during Phase 1. |

**Risks/notes**
- Inventory must include docs and tooltips, not just JSON data. Add columns for `file`, `lineRange`, and `notes` to make later scrubs easier.
- License placement decision should consider exports (PDF/PNG/etc.). Capture each surface in the licensing doc before we touch UI.
- Contributor policy needs to integrate with CI later (Phase 1 automation). Capture required scripts/tests so wording stays accurate.

## Phase 1 — SRD-Safe Baseline (2-3 weeks)
1. ✅ **Data segregation:** split current datasets into `/data/srd/` vs `/data/packs/experimental/`. Replace imports so default bundle only references SRD modules. *Completed Jan 24 — spells/level-up payloads relocated and all HTML/JS/doc references updated to the new SRD paths.*
2. ✅ **UI trimming:** conditionally hide/gate non-SRD options (dropdown choices, help text, docs nav). Provide friendly tooltip explaining that extended content requires a private pack. *Completed Jan 24 — character wizard/class selectors now hide non-SRD entries, surface lock tooltips, and level-up help text calls out the SRD-only scope.*
3. ✅ **Text scrub:** rewrite descriptive copy so anything remaining is either SRD wording or original summary. Remove verbatim reproductions of non-SRD text. *In progress (Jan 24) — README, SPELLS, CHARACTER_MANAGER, LEVEL_UP_SYSTEM, INITIATIVE_TRACKER, ENCOUNTER_BUILDER, GENERATORS, BATTLEMAP, ARCHITECTURE, CODEBASE_OVERVIEW, ROADMAP, CHANGELOG, CODING_STANDARDS, DATA_SCHEMAS, JOURNAL, RELEASE_CHECKLIST, TESTING_ROADMAP, INTEGRATION, plus on-page SRD notices across Characters, Initiative, Encounter Builder, Battle Map, Journal, Loot, Shop, Tavern, and NPC are now updated. Remaining docs (e.g., loot/shop/tavern write-ups, npc-specific guides) continue to be scrubbed.*
4. ~~**Automation:** add lint/test steps that fail if a non-allowlisted id/slug appears in the SRD build (e.g., regex scan + manifest comparison).~~ *De-scoped per Jan 24 decision: we will rely on contributor checklist + manual reviews for Phase 1, with automation reconsidered only if compliance issues reappear.*
5. ✅ **Licensing UI:** surface CC-BY attribution + link to SRD PDF in footer and exports. Confirm MIT vs CC-BY separation in repo. *Completed Jan 24 — every footer, the diagnostics panel, and all export surfaces now include the CC-BY attribution paired with the official SRD 5.1 PDF link, and docs/licensing tracks MIT vs CC-BY ownership boundaries.*
6. ✅ **Docs update:** revise README/docs to reflect SRD scope (no promises of Volo's/Xanathar's, etc.). Point readers to the forthcoming content-pack workflow instead. *Completed Jan 24 — root README now highlights the SRD-only build, links to the new docs/README index, and the documentation landing page centralizes compliance notes plus pointers to the content-pack roadmap.*

## Phase 2 — Content Pack Architecture (2 weeks)
1. ✅ **Schema design:** define JSON schema for packs (metadata, version, content arrays). Include explicit `source` fields but no copyrighted prose—packs should be user-generated. *Completed Jan 24 — see docs/CONTENT_PACKS.md plus schemas/content-pack.schema.json for the canonical spec and authoring guide.*
2. ✅ **Loader service:** add pack manager module that can import/export packs from LocalStorage/IndexedDB, validate schema, and merge into existing data registries at runtime. *Completed Jan 24 — content-pack-manager.js now handles import/validation/persistence and initializes from site.js.*
3. ✅ **UI surface:** create "Manage Content Packs" dialog with import (file picker + paste JSON), enable/disable toggles, and conflict warning (e.g., duplicate race ids). *Completed Jan 24 — modal hooked into content-pack-ui.js with paste/file import, enable toggles, export/delete, warning badges, and now launched via the diagnostics panel's "Open Content Pack Manager" button (removed from general nav to keep it a super-user flow).* 
4. ✅ **Offline storage:** persist enabled pack manifest locally; ensure clearing data reverts to SRD baseline. *Completed Jan 24 — content-pack-manager.js stores packs in IndexedDB with localStorage/memory fallback and `clearAll()` snaps the app back to SRD-only.*
5. ✅ **Diagnostics:** extend Ctrl+Alt+D panel to show loaded packs, record counts, and hash for quick debugging. *Completed Jan 24 — diagnostics panel now queries ContentPackManager for totals, enabled status, and SHA-256 fingerprints.*

## Phase 3 — Distribution & Access Controls (1-2 weeks)
1. ✅ **Public build:** CI job that lints, tests, and deploys SRD-only bundle to Netlify. *Completed Jan 24 — see .github/workflows/srd-build.yml, which runs lint/tests and calls Netlify CLI (requires NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID secrets).* 
2. ✅ **Private workflow:** document instructions for generating a "full" bundle locally (e.g., `npm run build:pack --packs my-pack.json`). Never commit pack files to the main repo. *Completed Jan 24 — `npm run build:pack` (scripts/build-private-bundle.mjs) plus docs/PRIVATE_BUILD.md cover the workflow and safety checks.*
3. ✅ **Access gating (optional):** if a private hosted version is needed, deploy to an authenticated environment (e.g., password-protected Netlify site or internal server) with clear warning that it contains non-SRD data for personal table use only. *Completed Jan 24 — docs/PRIVATE_BUILD.md now includes hosting guidance (Netlify password protection, HTTP basic auth templates, and safety warnings).* 
4. ✅ **Support docs:** write user-facing guide on creating their own packs (template file, schema reference, how to cite sources they personally own). *Completed Jan 24 — `docs/CONTENT_PACK_AUTHORING.md` walks players through authoring, validation, and responsible citations, while `docs/examples/content-pack-template.json` gives them a copy/paste starter that plugs into the existing schema.*

## Phase 3.5 — Runtime Pack Integration (ASAP hotfix)
> Phase 3 unintentionally stopped short of wiring imported data into the live ruleset. Packs can be imported and stored, but nothing consumes their records yet. This phase closes that gap before we call SRD compliance "done".

1. ✅ **Allowlist sync:** Completed Jan 24 — `js/modules/content-pack-runtime.js` now clones the SRD baseline allowlist, merges pack additions, and pushes the merged set into `window.SRDContentFilter` so gating updates instantly when packs toggle on/off.
2. ✅ **Content hydrator:** Completed Jan 24 — the new runtime helper subscribes to `ContentPackManager`, applies `recordsByType` deltas to `LevelUpData`, `SPELLS_DATA`, and other registries, and safely replays the SRD baseline each cycle before layering pack data.
3. ✅ **UI refresh contract:** Completed Jan 24 — every merge now dispatches `dmtoolbox:packs-applied`, and `docs/CONTENT_PACKS.md` documents the event so feature teams can re-render their dropdowns or diagnostics listeners.
4. ⏳ **Regression pack validation:** Pending — need to re-import the SRD regression pack in-browser, capture screenshots, and land an integration test that enables a mock pack and asserts the new ids surface.

## Phase 3.9 — SRD 5.2 Allowlist Overhaul & Spell Lookup Fixes

> **Why this phase?** External audit against SRD 5.2 revealed significant discrepancies in the allowlist generated from `srd-audit.json`. Additionally, a timing bug in `character.js` causes unfiltered spells to appear in spell lookups. This phase corrects both issues before Phase 4 compliance audits.

### 3.9.1 — Manifest Corrections (srd-audit.json)

| Category | Current Issues | Required Changes |
|----------|---------------|------------------|
| **Races/Species** | Missing Dwarf, Gnome, Goliath, Orc | Add 4 SRD 5.2 species to allowlist; unblock from blocklist |
| **Backgrounds** | 11 allowed, only 4 are SRD | Remove Charlatan, Entertainer, Folk Hero, Guild Artisan, Hermit, Sailor, Urchin; keep only Acolyte, Criminal, Sage, Soldier |
| **Feats** | ~14 non-SRD allowed, ~12 SRD blocked | Remove: Ability Score Improvement, Athlete, Charger, Resilient, Ritual Caster, Savage Attacker, Sentinel, Sharpshooter, Shield Master, Skulker, Spell Sniper, Tavern Brawler, Weapon Master. Add: Crafter, Durable, Martial Adept, Magic Initiate, fighting style feats (6), epic boons (7) |
| **Spells** | Dozens incorrectly blocked; some incorrectly allowed | Unblock: Conjure Animals, Conjure Celestial, Conjure Elemental, Conjure Fey, Grasping Vine, Ice Knife, Shape Water, many others. Add missing: Blade Ward, Dancing Lights, Toll the Dead, etc. Remove: Control Flames (check exact name) |
| **Beasts** | Many non-SRD in allowlist | Remove: Giant Elk, Saber-Toothed Tiger, Triceratops, Killer Whale, Reef Shark, Giant Crocodile, Giant Shark, Giant Eagle, Giant Wasp, Stirge. Add: Axe Beak, Giant Badger, Panther, Mastiff |
| **Equipment** | Several SRD items blocked | Unblock: Club, Component Pouch, Wooden Shield, Crossbow Bolts (20). Add: Blowgun, Morningstar, Pike, Net |
| **Classes** | Missing Monk, Paladin | Add both to class allowlist |
| **Subclasses** | All 32 in allowlist are non-SRD | Remove ALL subclasses from allowlist (SRD 5.2 contains no subclass text) |
| **Racial Features** | Based on 2014 PHB | Replace with SRD 2024 species traits only |

**Deliverables:**
- [ ] Create `internal-roadmaps/manifests/srd-5.2-diff.json` documenting every change
- [ ] Update `internal-roadmaps/manifests/srd-audit.json` with corrected status values
- [ ] Run `npm run generate-srd-allowlist` to regenerate `js/generated/srd-allowlist.js`
- [ ] Run `npm run generate-srd-regression-pack` to regenerate test pack
- [ ] Validate regenerated files contain expected changes

### 3.9.2 — Spell Lookup Timing Bug Fix

**Root Cause:** In `js/character.js`, the constants `RAW_SPELLS` and `ALL_SPELLS` are captured at module initialization (lines 842-868), before the `window.load` event triggers `pruneSpells()` in `site.js`. This creates a permanent unfiltered snapshot.

**Timeline of current bug:**
1. `srd-allowlist.js` loads → defines `window.SRD_CONTENT_ALLOWLIST`
2. `srd-content-filter.js` loads → creates `window.SRDContentFilter`
3. **`character.js` loads → captures `ALL_SPELLS` from unfiltered `SPELLS_DATA`** ← BUG
4. `spells-data.js` loads → populates `window.SPELLS_DATA`
5. `window.load` event → `pruneSpells()` filters `window.SPELLS_DATA`
6. But `ALL_SPELLS` in character.js still has unfiltered reference

**Fix Options:**
1. **Option A (Recommended):** Convert `ALL_SPELLS` to a lazy-loaded getter that reads from `window.SPELLS_DATA` at access time, after filtering has occurred
2. **Option B:** Move spell capture to a function called after `window.load`
3. **Option C:** Use `DOMContentLoaded` + `setTimeout` to defer capture

**Deliverables:**
- [ ] Refactor `js/character.js` spell loading to use lazy evaluation
- [ ] Add `getAllSpells()` function that reads from filtered `window.SPELLS_DATA`
- [ ] Update all references from `ALL_SPELLS` to `getAllSpells()`
- [ ] Verify initiative page spell lookup still works (uses live reference, should be fine)

### 3.9.3 — Validation & Testing

**Manual QA Checklist:**
- [ ] Character creation wizard: verify non-SRD races hidden
- [ ] Character page spell search: verify blocked spells don't appear
- [ ] Initiative page spell modal: verify blocked spells don't appear
- [ ] Level-up spell learning: verify only SRD spells available for SRD classes
- [ ] Console: no errors about missing spells or undefined lookups

**Automated Tests:**
- [ ] Unit test: `SRDContentFilter.isAllowed('spell', 'Fireball')` returns true
- [ ] Unit test: `SRDContentFilter.isAllowed('spell', 'Hex')` returns false (non-SRD)
- [ ] Integration test: Character spell search returns filtered results
- [ ] Integration test: Import SRD regression pack, verify new IDs surface

### 3.9.4 — Script Updates (generate-srd-regression-pack.mjs)

The regression pack generator may need updates to:
- [ ] Handle new SRD 5.2 feat categories (fighting styles, epic boons)
- [ ] Remove subclass record generation (no subclasses in SRD 5.2)
- [ ] Update `QA_ALLOWLIST_OVERRIDES` to reflect corrected race list
- [ ] Ensure toolVersion metadata matches current app version

### Phase 3.9 Tracker

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.9.1a | Create srd-5.2-diff.json | Claude | ✅ Completed (Jan 27) | 302 changes documented |
| 3.9.1b | Update srd-audit.json | Claude | ✅ Completed (Jan 27) | 41 added, 261 removed from allowlist |
| 3.9.1c | Regenerate allowlist | Claude | ✅ Completed (Jan 27) | `node scripts/generate-srd-allowlist.mjs` |
| 3.9.1d | Regenerate regression pack | Claude | ✅ Completed (Jan 27) | 535 records (no subclasses) |
| 3.9.2a | Fix character.js spell timing | Claude | ✅ Completed (Jan 27) | Lazy-load via `getAllSpells()` |
| 3.9.2b | Verify initiative.js spells | Claude | ✅ Completed (Jan 27) | Uses live reference, no fix needed |
| 3.9.3a | Manual QA pass | | ⏳ Pending | See [test-plans/phase-3.9-srd-filtering-tests.md](test-plans/phase-3.9-srd-filtering-tests.md) |
| 3.9.3b | Add unit tests | | ⏳ Pending | See [test-plans/phase-3.9-srd-filtering-tests.md](test-plans/phase-3.9-srd-filtering-tests.md) |
| 3.9.4 | Update regression pack script | Claude | ✅ Completed (Jan 27) | Subclasses skipped, metadata updated to SRD 5.2 |

**Risks/Notes:**
- SRD 5.2 is significantly different from SRD 5.1; some users may notice missing content they assumed was SRD
- The subclass removal is aggressive but correct—consider adding a UI notice explaining that subclass features require content packs
- Spell name matching must be exact; audit any aliases (e.g., "Melf's Acid Arrow" vs "Acid Arrow")

---

## Phase 4 — Ongoing Compliance
1. **Review cadence:** schedule quarterly SRD audits to ensure no regressions.
2. **Issue template:** add GitHub template for content requests that forces users to confirm they own the source and will supply their own pack.
3. **Monitoring:** add CI check that rejects PRs touching `/internal-roadmaps/` or `non-srd` artifacts.
4. **Legal watch:** keep notes on any Wizards policy changes (e.g., new SRD releases) and update roadmap accordingly.

### Open Questions
- Do we want a "starter" community pack (user-supplied) with scripted download instructions, or is that too risky?
- Should packs support executable hooks (e.g., custom rule scripts), or remain data-only for safety?
- What telemetry (if any) is acceptable inside the private build for diagnosing pack issues without collecting user data?

> This document is intentionally untracked in git to keep private plans (and any references to non-SRD sources) out of the public repo.
