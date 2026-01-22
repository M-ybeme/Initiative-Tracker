# The DM's Toolbox

**A comprehensive, browser-based suite of tools for tabletop RPG Game Masters**

**Live Site:** [https://dnddmtoolbox.netlify.app/](https://dnddmtoolbox.netlify.app/)

---

## 🎯 TL;DR

Free DM toolkit for improvisation at the table. No login, no tracking, works offline.

* **[Initiative Tracker](docs/INITIATIVE_TRACKER.md)** – Combat management with damage history and automation
* **[Battle Map](docs/BATTLEMAP.md)** – Lightweight VTT with fog of war and tokens
* **[Character Manager](docs/CHARACTER_MANAGER.md)** – Complete character sheets with no paywalls
* **[Encounter Builder](docs/ENCOUNTER_BUILDER.md)** – Quick combat assembly and monster stat blocks
* **[Journal](docs/JOURNAL.md)** – Rich text editor with persistent storage
* **[Generators](docs/GENERATORS.md)** – Shops, Taverns, Loot, NPCs, and Names

**Built by a DM who was tired of paywalls and subscriptions.**

All data stored locally in your browser using LocalStorage and IndexedDB. No accounts, no tracking, complete privacy, full offline capability after first load.

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

> *"I wanted to play a Tabaxi Ranger, but Volo's Guide costs $30 on my preferred manager. This tool gave me every race, every spell, completely free."*
> — Player from my campaign

### Problems with most tools:

* $400+ cost to unlock races/classes/spells
* Subscriptions for basic features
* Online-only tools with no offline mode
* Tracking and analytics on gameplay

### The DM's Toolbox fixes all of that:

* **All rules content accessible for free**
* **No logins or accounts**
* **Offline after first load**
* **Tools built for improvisation**

This started as a personal combat tool and grew into a full GM toolkit used by thousands.

---

## 🎲 Philosophy

The DM's Toolbox is designed with three principles:

* **Assist, don’t dictate** — Generators help you improvise, not railroad players.
* **Privacy first** — All data stays in the browser.
* **Frictionless gameplay** — Built for actual tables, not theoretical workflows.

---

## 🧪 Technical Overview (for Developers)

* 100% front-end, no backend
* Vanilla JavaScript (no frameworks)
* HTML + Bootstrap UI
* LocalStorage + IndexedDB persistence
* Modularized logic under `js/modules/`
* **614 tests** (342 unit, 202 integration, 70 E2E)
* Vitest + happy-dom for unit & integration tests
* Playwright for end-to-end tests
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

# E2E tests (headless)
npm run test:e2e

# E2E tests (with browser UI)
npm run test:e2e:headed

# E2E tests (interactive Playwright UI)
npm run test:e2e:ui
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for test patterns and requirements.

---

## 📚 Documentation

Full documentation lives in the `/docs` directory:

* [Battle Map](docs/BATTLEMAP.md)
* [Character Manager](docs/CHARACTER_MANAGER.md)
* [Encounter Builder](docs/ENCOUNTER_BUILDER.md)
* [Generators](docs/GENERATORS.md)
* [Initiative Tracker](docs/INITIATIVE_TRACKER.md)
* [Journal](docs/JOURNAL.md)
* [Integration Guide](docs/INTEGRATION.md)

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

## 📝 License

MIT License — free to use, modify, fork, or extend.