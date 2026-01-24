# Architecture Overview

This document provides a high-level view of **The DM's Toolbox** architecture, showing how pages, modules, and storage interact.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HTML PAGES (UI Layer)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Characters  │  │  Initiative  │  │  Battle Map  │  │   Journal    │    │
│  │  characters  │  │  initiative  │  │  battlemap   │  │   journal    │    │
│  │    .html     │  │    .html     │  │    .html     │  │    .html     │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐    │
│  │ character.js │  │initiative.js │  │ battlemap.js │  │ (inline JS)  │    │
│  │ creation-    │  │              │  │              │  │              │    │
│  │ wizard.js    │  │              │  │              │  │              │    │
│  │ level-up.js  │  │              │  │              │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
├─────────┴─────────────────┴─────────────────┴─────────────────┴────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Loot     │  │    Shop     │  │     NPC     │  │   Tavern    │        │
│  │  loot.html  │  │  shop.html  │  │  npc.html   │  │  tav.html   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                              GENERATORS                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE MODULES (js/modules/)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │   CALCULATIONS      │  │      STORAGE        │  │     UTILITIES       │ │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤ │
│  │ character-          │  │ storage.js          │  │ dice.js             │ │
│  │   calculations.js   │  │ - serialize/        │  │ - roll parsing      │ │
│  │ - AC, HP, saves     │  │   deserialize       │  │ - dice rolling      │ │
│  │ - skill bonuses     │  │ - validation        │  │                     │ │
│  │                     │  │                     │  │ generators.js       │ │
│  │ initiative-         │  │ migrations.js       │  │ - random tables     │ │
│  │   calculations.js   │  │ - schema versions   │  │ - name generation   │ │
│  │ - death saves       │  │ - data migration    │  │                     │ │
│  │ - concentration DC  │  │                     │  │ export-utils.js     │ │
│  │                     │  │ validation.js       │  │ - PDF/Word export   │ │
│  │ level-up-           │  │ - D&D 5e rules      │  │                     │ │
│  │   calculations.js   │  │                     │  │ spell-utils.js      │ │
│  │ - multiclass rules  │  │                     │  │ - slot calculation  │ │
│  │ - spell slots       │  │                     │  │                     │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
│  RULE: Modules are PURE - no DOM access, no window/document references      │
│        Enforced by ESLint no-restricted-globals rule                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │     IndexedDB       │  │    localStorage     │  │    Static Data      │ │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤ │
│  │ DMToolboxDB         │  │ Initiative state    │  │ spells-data.js      │ │
│  │ - characters store  │  │ Session notes       │  │ - 500+ spells       │ │
│  │ - battlemaps store  │  │ Templates           │  │                     │ │
│  │                     │  │ UI preferences      │  │ level-up-data.js    │ │
│  │ JournalDB           │  │                     │  │ - class features    │ │
│  │ - entries store     │  │                     │  │ - subclasses        │ │
│  │                     │  │                     │  │ - feats             │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Data Flows

### 1. Character Creation Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Character      │     │   Character     │     │   Character     │
│  Creation       │────▶│   Sheet         │────▶│   Export        │
│  Wizard         │     │   (Edit/View)   │     │   (PDF/Word)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │ "Send to Initiative"
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   IndexedDB     │     │   Initiative    │
│   (save)        │     │   Tracker       │
└─────────────────┘     └─────────────────┘
```

**Steps:**
1. User opens Character Creation Wizard
2. Wizard guides through race → class → abilities → background → equipment
3. Character saved to IndexedDB with `schemaVersion: 2`
4. Character sheet displays full editable view
5. Can export to PDF/Word or send to Initiative Tracker

---

### 2. Combat Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Encounter     │     │   Initiative    │     │   Battle Map    │
│   Builder       │────▶│   Tracker       │◀───▶│   (VTT)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │ Import characters
        │                       ▼
        │               ┌─────────────────┐
        │               │   Characters    │
        │               │   (IndexedDB)   │
        │               └─────────────────┘
        │
        ▼
┌─────────────────┐
│ localStorage    │
│ (pending import)│
└─────────────────┘
```

**Steps:**
1. Build encounter in Encounter Builder OR Battle Map
2. Send to Initiative Tracker via `localStorage.pendingInitiativeImport`
3. Initiative Tracker can also import player characters from IndexedDB
4. Run combat: track turns, HP, conditions, death saves
5. Two-way sync with Battle Map for token positions

---

### 3. Generator to Inventory Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Loot          │     │   localStorage  │     │   Character     │
│   Generator     │────▶│   (pending      │────▶│   Sheet         │
└─────────────────┘     │    import)      │     │   (inventory)   │
                        └─────────────────┘     └─────────────────┘

┌─────────────────┐            │
│   Shop          │────────────┘
│   Generator     │
└─────────────────┘
```

**Steps:**
1. Generate loot or shop inventory
2. Click "Send to Character"
3. Data stored in `localStorage.dmtools.pendingImport`
4. Character sheet detects pending import on load
5. Items added to character's inventory

---

### 4. Journal Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Journal       │     │   JournalDB     │     │   Export        │
│   Editor        │◀───▶│   (IndexedDB)   │────▶│   (PDF/Word/    │
│   (Quill)       │     │                 │     │    Markdown)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Steps:**
1. Create/edit journal entries with rich text (Quill editor)
2. Auto-save to JournalDB IndexedDB
3. Search and filter entries
4. Export individual or bulk to various formats

---

## Cross-Tool Integration Points

| From | To | Mechanism | Data |
|------|-----|-----------|------|
| Character Sheet | Initiative Tracker | `localStorage.dmtools.pendingImport` | Character combat stats |
| Encounter Builder | Initiative Tracker | `localStorage.dmtools.pendingInitiativeImport` | Encounter with monsters |
| Battle Map | Initiative Tracker | `localStorage.dmtools.pendingInitiativeImport` | Tokens as combatants |
| Loot Generator | Character Sheet | `localStorage.dmtools.pendingImport` | Generated items |
| Shop Generator | Character Sheet | `localStorage.dmtools.pendingImport` | Purchased items |
| NPC Generator | Initiative Tracker | `localStorage.dmtools.pendingImport` | NPC as combatant |

---

## Storage Schema Versions

All persistent data includes `schemaVersion` for migration support:

| Data Type | Current Version | Storage Location |
|-----------|-----------------|------------------|
| Character | 2 | IndexedDB (DMToolboxDB.characters) |
| Battlemap | 1 | IndexedDB (DMToolboxDB.battlemaps) |
| Journal | 1 | IndexedDB (JournalDB.entries) |

See [DATA_SCHEMAS.md](./DATA_SCHEMAS.md) for complete schema documentation.

---

## Module Dependency Rules

1. **Core modules** (`js/modules/`) must be pure:
   - No DOM access (`document`, `window`)
   - No side effects
   - Enforced by ESLint

2. **Page scripts** may import from:
   - Core modules ✓
   - Data files ✓
   - Other page scripts ✗

3. **Data flows one direction**:
   - Pages → Modules → Storage
   - Never: Modules → Pages

---

## Error Handling

Global error handling is initialized in `site.js`:

```
site.js
   └── import('./error-handling.js')
          ├── initGlobalErrorHandlers()  → catches uncaught errors
          ├── initDiagnosticsPanel()     → Ctrl+Alt+D to toggle
          └── showUserError()            → user-friendly messages
```

See [CODING_STANDARDS.md](./CODING_STANDARDS.md) for error handling patterns.
