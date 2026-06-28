# Documentation Index

This folder is the canonical reference for every system that powers The DM's Toolbox. Each guide covers the public, SRD-only build shipped from this repository. All data tables and examples align with the SRD 5.2 (2024 PHB) Creative Commons release.

---

## Where to Start

**Using the app and want to add content from books you own?**
Start with the [Content Pack Authoring Guide](CONTENT_PACK_AUTHORING.md) — it walks you through building a private JSON pack step by step, from the starter template to importing in the app.

**Setting up or contributing to the codebase?**
Start with [Architecture](ARCHITECTURE.md) for the big picture, then [Codebase Overview](CODEBASE_OVERVIEW.md) for the file layout, and [Coding Standards](CODING_STANDARDS.md) for what the linter enforces.

**Looking for a specific feature?**
Jump straight to the feature guide in the Product Guides section below.

---

## SRD Scope & Content Packs

- **Baseline data**: Only SRD 5.2 (2024 PHB) content ships with the app. The allowlist and DOM gating runtime in `js/site.js` prevent anything outside that license from rendering by default. UI elements marked with `data-srd-block` are hidden until a content pack unlocks them.
- **Adding your own content**: Private content packs let you import licensed material back into your browser without redistributing it. See the [Content Pack Authoring Guide](CONTENT_PACK_AUTHORING.md) to get started, or [CONTENT_PACKS.md](CONTENT_PACKS.md) for the full technical reference (lifecycle, validation, event system, public API).
- **Legal text**: The complete license copy, attribution snippet, and placement checklist live in [docs/licensing](licensing/README.md).
- **Private bundles**: To host a local copy of the site with your packs pre-loaded, follow the [Private Build Workflow](PRIVATE_BUILD.md).

---

## For DMs & Players

These guides cover how to use the app's features at the table.

- [Battle Map](BATTLEMAP.md) — Fog of war, token management, measurements, and SRD-safe map assets
- [Character Manager](CHARACTER_MANAGER.md) — Character creation wizard, level-up rules, and export formats
- [Compendium](COMPENDIUM.md) — Mid-session reference hub: Spells (437 entries, 6 filters), Bestiary (Open5e API, infinite scroll), Rules (88 SRD entries), Conditions (all 15 SRD conditions with severity tags); pins persist across refreshes; `/` focuses search, `Esc` clears
- [Encounter Builder](ENCOUNTER_BUILDER.md) — CR budgeting, stat blocks, SRD monster data, save/load encounters
- [Generators](GENERATORS.md) — Shop, tavern, loot, NPC, and name generators
- [Initiative Tracker](INITIATIVE_TRACKER.md) — Turn order automation, HP tracking, reaction tracking, legendary actions, combat log
- [Journal](JOURNAL.md) — Rich text notes with slash commands, `[[wikilinks]]`, backlinks, collapsible sections, drag-to-reorder, tags, templates, and multi-format export
- [Content Pack Authoring](CONTENT_PACK_AUTHORING.md) — Build your own JSON packs to add classes, spells, feats, and more
- [Private Build Workflow](PRIVATE_BUILD.md) — Host a local copy of the site with your packs pre-installed

---

## For Developers

Technical references for contributors and anyone extending the toolbox.

- [Architecture](ARCHITECTURE.md) — Module layout, storage layers, and the SRD content gating runtime
- [Codebase Overview](CODEBASE_OVERVIEW.md) — Repository file structure with links to key scripts
- [Content Packs (technical)](CONTENT_PACKS.md) — Full content pack system: lifecycle, JSON schema, record types, validation rules, event system, storage drivers, and public API
- [Content Pack Testing](CONTENT_PACK_TESTING.md) — Manual test cases for pack toggle and removal behavior
- [Data Schemas](DATA_SCHEMAS.md) — JSON shapes for characters, encounters, tokens, and SRD datasets
- [Integration Guide](INTEGRATION.md) — How to embed toolbox modules elsewhere without violating SRD scope
- [Level-Up System](LEVEL_UP_SYSTEM.md) — Character progression mechanics and spell slot tables
- [Spells](SPELLS.md) — Spell data format, tags, and dice fields
- [Coding Standards](CODING_STANDARDS.md) — Lint rules, testing requirements, and SRD review checkpoints

---

## Process & Engineering

- [Release Checklist](RELEASE_CHECKLIST.md) — Pre-release steps to ensure the shipped build stays SRD-only
- [Testing Roadmap](TESTING_ROADMAP.md) — Automation backlog and coverage strategy
- [Engineering Roadmap](ENGINEERING_ROADMAP.md) — Cross-team initiatives and planned improvements

---

## Need Something Else?

If a document references material outside the SRD, it should describe the missing piece and point to the content pack workflow rather than reproducing restricted text. Open an issue if you find stale wording that slips through.
