# Changelog

All notable changes to **The DM’s Toolbox** are documented here.
This project follows **Semantic Versioning**.

---

## **1.5.2 — 2025-11-29**

### **Character Sheet Page + Initiative Integration**

This release adds the new **Characters** utility and completes end-to-end integration with the Initiative Tracker.

#### **New Features**

* Added full **Character Sheet Manager** (`characters.html`):

  * Create, edit, and delete stored characters.
  * Portrait upload, URL portraits, and drag-to-reposition + zoom controls.
  * Full spell list support with tag/class filtering and custom spell creation.
  * LocalStorage-based persistence with automatic field normalization.

* Added **Send to Initiative Tracker**:

  * Characters now export directly into the running combat.
  * Export uses `mode: "append"` and does **not** overwrite existing combat state.
  * Includes validation for Name / AC / HP before export.
  * Supports portrait settings, notes, and stat fields.

#### **Quality of Life**

* Updated top-level toolbar to include a consistent “Send to Tracker” button style.
* Added error handling for malformed portraits and corrupted JSON imports.
* Improved spell normalization to align with global spell library.
* Ensured character IDs remain unique across imports/exports.

#### **Internal**

* Added shared build metadata to Characters page.
* Updated localStorage schema guards to avoid legacy data crashes.
* Minor UI alignment corrections across the Characters page.

---

## **1.5.0 — 2025-11-25**

### Refactor, Stability, Licensing, and Version Tracking

* Refactored `initiative.js` and extracted rules/spells into dedicated data files.
* Added load guards to improve page stability and avoid null reference failures.
* Implemented unique character ID generation to prevent accidental cross-updates between duplicated characters.
* Improved Player View security:

  * AC column now reliably hidden.
  * Sensitive data properly suppressed across all modes.
* Overhauled active-turn behavior so the active creature persists through sorting, reordering, and manual list updates.
* Updated active turn styling for improved clarity on both DM and Player View.
* Fixed cross-page sync issues for Player View toggle and shared state.
* Added console build stamp to all pages for version tracking.
* Added project licensing and repository metadata.
* Multiple minor fixes and UI polish across initiative and battlemap pages.

---

## **1.4.0 — 2025-11-03 → 2025-11-21**

### Battle Map MVP, Encounter Builder, Mobile Improvements

* Added **Battle Map MVP**:

  * Token placement system.
  * Fog, scale, and map state saving to LocalStorage.
  * Pinch-zoom and mobile interaction fixes.
* Added **Encounter Builder** with export-to-initiative support.
* Added Ko-fi footer link and UI integration.
* Updated navigation bar and improved consistency across pages.
* Multiple upgrades to initiative and battle map pages.
* Improved mobile layout and fixed nav button logic.
* Addressed 0 HP / AC / Initiative logic edge cases.
* Editable names and improved duplicate naming (`Goblin`, `Goblin 2`, etc.).
* Updated footer and global UI elements.

---

## **1.3.0 — 2025-10-22 → 2025-10-30**

### Rules & Spells Integration, Saved Characters Modal, UI Polish

* Added `site.js` and centralized shared page logic.
* Integrated **Spells** and **Rules** into the Initiative Tracker.
* Added Saved Characters modal for better storage management.
* Improved character type color-coding and styling.
* Removed old accordion layout and polished initiative UI.
* Centered control buttons and refined layout flow.
* Fixed name generator button issues.
* Minor bug fixes across Shop Generator and name generator pages.

---

## **1.2.0 — 2025-10-10 → 2025-10-16**

### Major Initiative Tracker Overhaul

* Added:

  * Temp HP Undo
  * Death Saves logic
  * Improved Concentration checks (now triggers correctly during the turn, not end of round)
* Added dice roller upgrades and help menu refinements.
* Improved mobile nav behavior and fixed hamburger menu bugs.
* Continued updates to name generator and initiative features.

---

## **1.1.0 — 2025-09-03 → 2025-10-09**

### Generators Expansion + Initiative Upgrades

* Added generator tools globally across multiple pages.
* Improved name generator inputs and outputs for clarity and consistency.
* Added loot updates including bundles and preset controls.
* Continued initiative tracker evolution:

  * Editable fields
  * Mobile-friendly improvements
  * Ongoing layout corrections
* Updated footer and global styling.

---

## **1.0.0 — 2025-08-27 → 2025-09-02**

### Initial Public Release

* Project created and deployed.
* Added first wave of pages:

  * Name generator
  * Basic loot generator
  * Early shop generator
* Initial global layout and navbar.
* Set foundation for initiative tracker integration.
* Established file structure and Netlify auto-deploy pipeline.

---

## **0.9.0 — (Legacy Project) — 2025-02 → 2025-10**

### Original Initiative Tracker + Wiki Project (Pre-Toolbox)

* Added early Initiative Tracker prototype.
* Added Session Notes with save/load support.
* Import/export features and mobile card sorting fixes.
* Added saved characters and mobile-friendly character management.
* Added concentration logic, dice rolls, and UI improvements.
* Bug fixes (delete character, hamburger menu, turn progression).
* Navbar unification across pages.
* Served as foundation for Toolbox 1.0 rewrite.

---

## **Unreleased**

Reserved for future development.
