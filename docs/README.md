# Documentation Index

This folder is the canonical reference for every system that powers The DM's Toolbox. Each guide assumes the public, SRD-only build that ships from this repository, so every data table, example, and screenshot aligns with the SRD 5.2 (2024 PHB) Creative Commons release plus original homebrew.

Use this page as the launchpad for deeper dives:

## SRD Scope & Content Packs
- **Baseline:** Only SRD 5.2 (2024 PHB) data ships with the app. The allowlist and DOM gating runtime in `js/site.js` prevent anything outside that license from rendering by default.
- **What if I own other books?** Phase 2 of the roadmap (content packs) will let you import private data back into your browser. Until then, UI elements marked with `data-srd-block` explain why a choice is hidden and where content packs will slot in.
- **Need the legal text?** The complete license copy, attribution snippet, and placement checklist live in [docs/licensing](licensing/README.md). Every surface (README, docs, footers, exports) now links to the official SRD PDF so tables can trace sources quickly.
- **Ready to ship a private bundle?** Follow the [Private Build Workflow](PRIVATE_BUILD.md) to create a password-protected copy of the site plus your own packs.
- **Ready to prep a pack?** Follow the user-focused [Content Pack Authoring Guide](CONTENT_PACK_AUTHORING.md) plus the deeper schema/lifecycle notes in [CONTENT_PACKS.md](CONTENT_PACKS.md).

## Product Guides
- [Battle Map](BATTLEMAP.md) – Fog of war workflow, token management, and SRD-only map assets.
- [Character Manager](CHARACTER_MANAGER.md) – Wizard, level-up rules, and export coverage, all scoped to the SRD allowlist.
- [Encounter Builder](ENCOUNTER_BUILDER.md) – How CR budgets, stat blocks, and SRD monsters are handled.
- [Generators](GENERATORS.md) – Shop, tavern, loot, NPC, and name generators with notes about trimmed datasets.
- [Initiative Tracker](INITIATIVE_TRACKER.md) – Turn order automation plus how SRD stat data feeds damage calculators.
- [Journal](JOURNAL.md) – Rich text persistence, export formats, and attribution placement within logs.

## Systems & Data
- [Architecture](ARCHITECTURE.md) – High-level view of modules, storage layers, and the SRD gating runtime.
- [Codebase Overview](CODEBASE_OVERVIEW.md) – Repository layout with links to scripts that maintain SRD manifests.
- [Data Schemas](DATA_SCHEMAS.md) – JSON shapes for characters, encounters, tokens, and SRD datasets.
- [Integration Guide](INTEGRATION.md) – How to embed toolbox components elsewhere without violating the SRD scope.
- [Private Build Workflow](PRIVATE_BUILD.md) – Step-by-step instructions for bundling your own packs locally.
- [LEVEL_UP_SYSTEM](LEVEL_UP_SYSTEM.md) & [SPELLS](SPELLS.md) – Mechanical detail for the level-up wizard and spell sheets after the content scrub.

## Engineering & Process
- [Coding Standards](CODING_STANDARDS.md) – Lint rules, testing expectations, and SRD review checkpoints for contributors.
- [Release Checklist](RELEASE_CHECKLIST.md) – Preflight steps to ensure the shipped build stays SRD-only.
- [TESTING_ROADMAP](TESTING_ROADMAP.md) – Automation backlog, including future SRD regression tooling.
- [ENGINEERING_ROADMAP](ENGINEERING_ROADMAP.md) – Cross-team initiatives that reference the SRD and content pack phases.

## Need Something Else?
If a document references material outside the SRD, it should describe the missing piece and point to the future content-pack workflow rather than reproducing restricted text. Open an issue if you find legacy wording that slips through.
