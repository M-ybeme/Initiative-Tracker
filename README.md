# The DM's Toolbox

**A comprehensive, browser-based suite of tools for tabletop RPG Game Masters**

**Live Site:** [https://dnddmtoolbox.netlify.app/](https://dnddmtoolbox.netlify.app/)

---

## 🎯 TL;DR

Free D&D 5e toolkit using **2024 PHB rules (SRD 5.2)**. No login, no tracking, works offline.

### Core Tools

* **[Initiative Tracker](docs/INITIATIVE_TRACKER.md)** – Combat management with HP tracking, damage history, conditions, and turn automation
* **[Battle Map](docs/BATTLEMAP.md)** – Lightweight VTT with fog of war, tokens, and grid overlay
* **[Character Manager](docs/CHARACTER_MANAGER.md)** – Full character sheets with guided creation wizard and level-up system
* **[Encounter Builder](docs/ENCOUNTER_BUILDER.md)** – CR budgeting, monster stat blocks, and one-click initiative export
* **[Compendium](reference.html)** – Mid-session spell, monster, and rules reference with full-text search, filters, and pinnable stat-block cards
* **[Journal](docs/JOURNAL.md)** – Rich text campaign notes with persistent storage
* **[Generators](docs/GENERATORS.md)** – Random shops, taverns, loot tables, NPCs, and names

### Out of the Box

* **9 SRD species** (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling) with subspecies
* **12 classes** with full progression tables, spell slots, and class features
* **4 backgrounds** with 2024 PHB ability score increases (+2/+1) and origin feats
* **437 SRD spells** searchable by class, level, school, concentration, ritual, and free text
* **400+ monsters** with full stat blocks for encounter building
* **88 rules entries** across 16 categories (combat, spellcasting, conditions, resting, and more)
* **2024 PHB exhaustion rules** (−2 per level to all d20 rolls)

All data stored locally via LocalStorage and IndexedDB. No accounts, no server, complete privacy, full offline capability after first load.

Press **Ctrl+Alt+D** or click the gear icon in the footer to open the diagnostics panel with version info, storage stats, and data backup options.

---

## ⚡ Quick Start (30 Seconds)

### Option 1: Run Combat

1. Visit [https://dnddmtoolbox.netlify.app/](https://dnddmtoolbox.netlify.app/)
2. Click "Encounter Builder" in nav
3. Search "goblin" → Add 6 to roster
4. Click "Send to Initiative Tracker"
5. Roll initiative — combat ready

### Option 2: Create a Character

1. Click "Character Manager" in nav
2. Click "New Character" → "Character Creation Wizard"
3. Follow the guided setup
4. Done — ready to play

### Option 3: Improvise a Shop

1. Click "Shop Generator"
2. Select settlement and shop type
3. Generate
4. Read inventory + NPC to players

**No login. No tutorial. Just works.**

---

## 💬 What You Get

### Character Creation & Management

* **13-step character wizard** – Guided creation from species selection through equipment, with info icons on equipment packs showing full contents
* **Species selection** with SRD subspecies (High Elf, Hill Dwarf, etc.) — senses auto-populated from race traits
* **Background bonuses** – 2024 PHB system with flexible +2/+1 ability increases
* **Origin feats** – Automatic feat from background (Magic Initiate, Alert, etc.)
* **Level-up system** – HP rolls, ASI/feat choices, interactive class feature selection (Fighting Style, Pact Boon, Eldritch Invocations, Metamagic), spell slot progression
* **Structured senses** – Dedicated fields for Darkvision, Blindsight, Tremorsense, and Truesight (in feet) on the character sheet and in exports
* **Inventory equip toggle** – One-click equipped/unequipped button per item, saves instantly
* **Exportable sheets** – PDF and JSON export for backup or sharing

### Combat & Encounters

* **Initiative tracking** with automatic turn order and round counter
* **HP management** – Damage, healing, temp HP, and death saves
* **Condition tracking** – All 2024 PHB conditions with exhaustion penalties
* **Ability check rolls** – Roll raw ability checks (advantage/normal/disadvantage) from the character sheet and combat view
* **Encounter balancing** – CR calculator with difficulty ratings
* **Monster stat blocks** – Full SRD bestiary with searchable filters
* **Custom monster creator** – Simple/Full mode builder with all 5e stat block fields (legendary, mythic, lair actions, spellcasting, and more)

### Campaign Reference

* **Compendium** – Mid-session lookup tool under the Campaign nav with three tabs:
  * **Spells** – Search 437 spells by name, school, class, level, concentration, and ritual; click any row to pin a full spell card
  * **Bestiary** – Browse the full D&D 5e monster list (Open5e API); infinite scroll + debounced look-ahead search; pin full stat-block cards
  * **Rules** – Search 88 SRD rules entries (title, body, category, tags); pin any rule as an expandable accordion card
* **Journal** – Rich text campaign notes with persistent storage and export

### Improvisation Tools

* **Shop generator** – Inventory based on settlement size and shop type
* **Tavern generator** – Names, menus, rumors, and NPCs
* **Loot tables** – Treasure by CR with magic item rolls
* **NPC generator** – Personality traits, bonds, flaws, and appearance
* **Name generator** – Fantasy names by culture and gender

### Privacy & Offline

* **Zero accounts** – No login, no email, no signup
* **Local storage only** – All data stays in your browser
* **Offline capable** – Works without internet after first load
* **No tracking** – Only anonymous page counts via GoatCounter

---

## 📘 SRD Scope & Content Packs

The public site and repository only bundle rules text released in the System Reference Document 5.2 (2024 PHB) under CC-BY 4.0. Historical data for other WotC books stays gated behind the SRD allowlist in `js/site.js`, so anything outside the SRD (Xanathar's, Tasha's, Eberron, etc.) never renders unless you opt in locally.

Private content packs load through IndexedDB/localStorage so you can re-enable your licensed material without redistributing it. Import JSON packs via the Content Pack Manager (Ctrl+Alt+D or footer gear icon → "Open Content Pack Manager") to unlock non-SRD species, subclasses, spells, and more. UI elements marked with `data-srd-block` indicate options that require a content pack.

Want the doc-by-doc status of that scrub? Start with [docs/README.md](docs/README.md) for a compliance summary, links to every guide, and references to the SRD licensing notes. Ready to build your own data? Use the user-facing [Content Pack Authoring Guide](docs/CONTENT_PACK_AUTHORING.md) and dive deeper into schemas/lifecycle details in [docs/CONTENT_PACKS.md](docs/CONTENT_PACKS.md). Need a private bundle with your own packs? Follow [docs/PRIVATE_BUILD.md](docs/PRIVATE_BUILD.md).

---

## 🎲 Design Principles

* **Ready at the table** – Every tool is designed for mid-session use. Generate a shop in 2 clicks, roll initiative instantly, look up a spell without leaving the page.
* **Your data, your device** – Characters, maps, and notes never leave your browser. No cloud sync means no vendor lock-in.
* **Extend privately** – Own books you want to use? Import them as content packs without redistributing copyrighted material.
* **SRD-first** – The public build uses only freely licensed content. Everything else stays gated until you opt in.

## 🔒 Privacy & Analytics

The DM’s Toolbox does not collect personal data and does not use cookies, accounts, or trackers.

To understand how many people use the tool, the site uses GoatCounter, a privacy-focused, cookie-free analytics service.
It records anonymous page visit counts only — no IP addresses, no fingerprints, no user identifiers, no telemetry.

All characters, maps, journals, encounter data, and preferences remain stored entirely in your browser via LocalStorage and IndexedDB. Nothing is ever uploaded or shared.

---

## 🧪 Technical Overview (for Developers)

* 100% front-end, no backend
* Vanilla JavaScript (no frameworks)
* HTML + Bootstrap UI
* LocalStorage + IndexedDB persistence
* Modularized logic under `js/modules/`
* **630+ automated tests** (unit + integration via Vitest, Playwright suites for E2E)
* Vitest + happy-dom for unit & integration tests
* Playwright for end-to-end tests
* ESLint + Prettier enforce the documented coding standards
* GitHub Actions CI/CD with coverage enforcement
* Fully static deployment via Netlify

---

## 🛠 Development Setup

```bash
# Clone the repo
git clone https://github.com/M-ybeme/Initiative-Tracker.git
cd Initiative-Tracker

# Install dev dependencies
npm install

# Run locally (static server)
npx serve .
```

**No build step required.** Open `index.html` directly or use any static file server.

### Running Tests

```bash
# Unit + integration tests (watch mode)
npm test

# Unit + integration tests (single run)
npm run test:run

# Unit + integration tests with coverage report
npm run test:coverage

# Linting (ESLint via flat config)
npm run lint

# E2E tests (headless)
npm run test:e2e

# E2E tests (with browser UI)
npm run test:e2e:headed

# E2E tests (interactive Playwright UI)
npm run test:e2e:ui
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for test patterns and requirements.

## 🚀 SRD Deployments

- `.github/workflows/srd-build.yml` runs lint/tests on every push to `main` and, on success, deploys the SRD-only bundle to Netlify using `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` secrets.
- The existing `test.yml` workflow continues to guard pull requests with the full suite (unit, integration, E2E).
- For private/local bundles with your own packs, run `npm run build:pack -- --packs path/to/file.json` and follow [docs/PRIVATE_BUILD.md](docs/PRIVATE_BUILD.md).

---

## 📚 Documentation

Every guide under `/docs` reflects the SRD-only build. Start with the index for scope notes and quick summaries, then hop straight to the system you need:

* [Documentation Index](docs/README.md) – SRD scope overview plus pointers to every guide.
* [Battle Map](docs/BATTLEMAP.md) – Lightweight VTT usage with SRD-safe assets.
* [Character Manager](docs/CHARACTER_MANAGER.md) – Wizard flows, level-up rules, and export coverage.
* [Compendium](reference.html) – Spell, monster, and rules reference with search and pinnable cards.
* [Encounter Builder](docs/ENCOUNTER_BUILDER.md) – Encounter math, CR budgeting, and SRD stat sources.
* [Generators](docs/GENERATORS.md) – Loot, tavern, shop, NPC, and name coverage after the data scrub.
* [Initiative Tracker](docs/INITIATIVE_TRACKER.md) – Turn automation, damage logging, and gating behavior.
* [Journal](docs/JOURNAL.md) – Rich text tips plus how exports embed the license block.
* [Integration Guide](docs/INTEGRATION.md) – Embed or extend modules without breaking the SRD boundary.
* [Private Build Workflow](docs/PRIVATE_BUILD.md) – Generate a local bundle plus your own packs without committing private data.
* [Content Pack Authoring](docs/CONTENT_PACK_AUTHORING.md) – Create your own JSON content packs.
* [Content Pack Testing](docs/CONTENT_PACK_TESTING.md) – Verify pack toggle/removal behavior.
* [Architecture Overview](docs/ARCHITECTURE.md)
* [Codebase Overview](docs/CODEBASE_OVERVIEW.md)
* [Coding Standards](docs/CODING_STANDARDS.md)
* [Data Schemas](docs/DATA_SCHEMAS.md)
* [Level-Up System](docs/LEVEL_UP_SYSTEM.md) – Character progression mechanics.
* [Release Checklist](docs/RELEASE_CHECKLIST.md)

---

## ♿ Accessibility & Lighthouse Scores

The DM's Toolbox includes accessibility features:

* Semantic HTML structure throughout
* ARIA attributes for interactive components (300+ instances across pages)
* Keyboard-navigable forms and controls
* Bootstrap's built-in accessibility patterns

### Lighthouse Audit (January 2026)

| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| Homepage | 73 | 96 | 100 | 91 |
| Initiative Tracker | 82 | 83 | 100 | 91 |
| Battle Map | 100 | 90 | 100 | 91 |
| Encounter Builder | 83 | 86 | 100 | 91 |
| Character Manager | 81 | 82 | 100 | 91 |
| Journal | 82 | 88 | 100 | 82 |
| Name Generator | 83 | 91 | 100 | 91 |
| Loot Generator | 83 | 89 | 100 | 91 |
| Shop Generator | 60 | 96 | 100 | 91 |
| NPC Generator | 83 | 96 | 100 | 91 |
| Tavern Generator | 83 | 95 | 100 | 91 |

**Averages:** Performance 81, Accessibility 90, Best Practices 100, SEO 90

---

## 📌 Roadmap (High-Level)

* Accessibility audit and WCAG improvements
* Expanded generator options
* Mobile layout refinements
* Optional import/export enhancements

---

## 📝 License & Attribution

- **Code & original assets:** MIT License — free to use, modify, fork, or extend.
- **SRD-derived rules text:** Creative Commons Attribution 4.0 International (see [docs/licensing/](docs/licensing/)). The application uses SRD 5.2 (2024 PHB) rules. Exported PDFs/printouts still embed the compliance block automatically, but the live pages now link here instead of repeating the full copy.
- **Product identity disclaimer:** Wizards of the Coast, Dungeons & Dragons, Forgotten Realms, Ravenloft, Eberron, the dragon ampersand, beholders, githyanki, githzerai, mind flayers, yuan-ti, and all other Wizards of the Coast product identity are trademarks of Wizards of the Coast LLC in the U.S.A. and other countries. The DM’s Toolbox is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.

### SRD Attribution Text

This work includes material from the System Reference Document 5.2 by Wizards of the Coast LLC and is licensed for our use under the Creative Commons Attribution 4.0 International License.

### Reference Materials

- [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/)
- [D&D 5.2 System Reference Document (2024)](https://www.dndbeyond.com/resources/1781-systems-reference-document-52)