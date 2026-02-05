# The DM's Toolbox

**A comprehensive, browser-based suite of tools for tabletop RPG Game Masters**

**Live Site:** [https://dnddmtoolbox.netlify.app/](https://dnddmtoolbox.netlify.app/)

---

## 🎯 TL;DR

Free DM toolkit for improvisation at the table. No login, no personal tracking, works offline.

* **[Initiative Tracker](docs/INITIATIVE_TRACKER.md)** – Combat management with damage history and automation
* **[Battle Map](docs/BATTLEMAP.md)** – Lightweight VTT with fog of war and tokens
* **[Character Manager](docs/CHARACTER_MANAGER.md)** – Complete character sheets with no paywalls
* **[Encounter Builder](docs/ENCOUNTER_BUILDER.md)** – Quick combat assembly and monster stat blocks
* **[Journal](docs/JOURNAL.md)** – Rich text editor with persistent storage
* **[Generators](docs/GENERATORS.md)** – Shops, Taverns, Loot, NPCs, and Names

**Built by a DM who was tired of paywalls and subscriptions.**

All data stored locally in your browser using LocalStorage and IndexedDB. No accounts, no tracking, complete privacy, full offline capability after first load.

Press **Ctrl+Alt+D** anywhere in the app to open the local diagnostics panel with version info, storage stats, and last error details—no telemetry, entirely client-side.

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

## 💬 Why This Exists

> *"I needed an SRD-safe toolkit I could run offline and extend privately without leaking my books."*
> — Tabletop DM feedback

### Problems with most tools:

* $400+ cost to unlock races/classes/spells
* Subscriptions for basic features
* Online-only tools with no offline mode
* Tracking and analytics on gameplay

### The DM's Toolbox fixes all of that:

* **All SRD rules content accessible for free**
* **Private content packs keep any non-SRD options on your device**
* **No logins or accounts**
* **Offline after first load**
* **Tools built for improvisation**

This started as a personal combat tool and grew into a full GM toolkit used by thousands.

---

## 📘 SRD Scope & Content Packs

The public site and repository only bundle rules text released in the System Reference Document 5.1 under CC-BY 4.0. Historical data for other WotC books now stays gated behind the SRD allowlist in `js/site.js`, so anything outside the SRD (Xanathar's, Tasha's, Eberron, etc.) never renders unless you opt in locally.

Planned private content packs load through IndexedDB/localStorage so you can re-enable your licensed material without redistributing it. Until that workflow lands, UI elements marked with `data-srd-block` explain that the option requires a private pack.

Want the doc-by-doc status of that scrub? Start with [docs/README.md](docs/README.md) for a compliance summary, links to every guide, and references to the SRD licensing notes. Ready to build your own data? Use the user-facing [Content Pack Authoring Guide](docs/CONTENT_PACK_AUTHORING.md) and dive deeper into schemas/lifecycle details in [docs/CONTENT_PACKS.md](docs/CONTENT_PACKS.md). Need a private bundle with your own packs? Follow [docs/PRIVATE_BUILD.md](docs/PRIVATE_BUILD.md).

---

## 🎲 Philosophy

The DM's Toolbox is designed with three principles:

* **Assist, don’t dictate** — Generators help you improvise, not railroad players.
* **Privacy first** — All data stays in the browser.
* **Frictionless gameplay** — Built for actual tables, not theoretical workflows.

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
* **550+ automated tests** (unit + integration via Vitest, Playwright suites for E2E)
* Vitest + happy-dom for unit & integration tests
* Playwright for end-to-end tests
* ESLint + Prettier enforce the documented coding standards
* GitHub Actions CI/CD with coverage enforcement
* Fully static deployment via Netlify

---

## 🛠 Development Setup

```bash
# Clone the repo
git clone https://github.com/Maybeme/dms-toolbox.git
cd dms-toolbox

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
* [Encounter Builder](docs/ENCOUNTER_BUILDER.md) – Encounter math, CR budgeting, and SRD stat sources.
* [Generators](docs/GENERATORS.md) – Loot, tavern, shop, NPC, and name coverage after the data scrub.
* [Initiative Tracker](docs/INITIATIVE_TRACKER.md) – Turn automation, damage logging, and gating behavior.
* [Journal](docs/JOURNAL.md) – Rich text tips plus how exports embed the license block.
* [Integration Guide](docs/INTEGRATION.md) – Embed or extend modules without breaking the SRD boundary.
* [Private Build Workflow](docs/PRIVATE_BUILD.md) – Generate a local bundle plus your own packs without committing private data.
* [Architecture Overview](docs/ARCHITECTURE.md)
* [Codebase Overview](docs/CODEBASE_OVERVIEW.md)
* [Coding Standards](docs/CODING_STANDARDS.md)
* [Data Schemas](docs/DATA_SCHEMAS.md)
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
- **SRD-derived rules text:** Creative Commons Attribution 4.0 International (see [docs/licensing/SRD-5.2-CC-BY-4.0.md](docs/licensing/SRD-5.2-CC-BY-4.0.md)). The app footer and exports include the required attribution: "This work includes material from the System Reference Document 5.2 by Wizards of the Coast LLC and is licensed for our use under the Creative Commons Attribution 4.0 International License."
- **Product identity disclaimer:** Wizards of the Coast, Dungeons & Dragons, Forgotten Realms, Ravenloft, Eberron, the dragon ampersand, beholders, githyanki, githzerai, mind flayers, yuan-ti, and all other Wizards of the Coast product identity are trademarks of Wizards of the Coast LLC in the U.S.A. and other countries. The DM’s Toolbox is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.