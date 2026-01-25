# Character Manager Documentation

This document provides comprehensive information about the DM's Toolbox Character Manager feature evolution and capabilities.

## Overview

The Character Manager is a complete D&D 5e character sheet system integrated into The DM's Toolbox. It supports full character creation, leveling (1-20), multiclassing, spell management, inventory tracking, and export functionality.

## SRD Scope

- The public build only surfaces races, subclasses, feats, and spells that appear in the System Reference Document 5.1.
- UI elements tied to non-SRD data now carry `data-srd-block` annotations so players understand why an option is unavailable.
- Historical data for additional sources (Volo's, Xanathar's, Eberron, etc.) remains in the data files for tables that load a private content pack; nothing outside the SRD ships in the default experience.
- Diagnostics in `js/site.js` expose the currently active allowlist so you can verify whether a given option originates from SRD data or from a private pack.

## Table of Contents

- [Character Creation](#character-creation)
- [Leveling System](#leveling-system)
- [Combat Features](#combat-features)
- [Spell Management](#spell-management)
- [Inventory System](#inventory-system)
- [Export & Sharing](#export--sharing)
- [Mobile Support](#mobile-support)
- [Implementation Files](#implementation-files)

---

## Character Creation

### Character Creation Wizard (v1.8.7, v1.5.7)

**8-Step Guided Process:**

1. **Basic Information** - Name, player, alignment
2. **Ability Scores** - Interactive 4d6-drop-lowest roller with visual dice display
3. **Race Selection** - SRD races/subraces with clear lock states for anything outside the SRD
4. **Class Selection** - 12 PHB classes included in SRD; Artificer and other expansions unlock only through a private content pack
5. **Background** - 13 official D&D backgrounds with skill proficiencies
6. **Skills** - Interactive proficiency selection (2-4 based on class)
7. **HP & Combat Stats** - Automatic AC/HP/Speed calculation
8. **Review & Summary** - Complete character preview

### Race Support

**SRD Playable Races:** Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, and Tiefling. These appear by default with their SRD subraces (e.g., Hill/Mountain Dwarves, High/Wood Elves, Lightfoot/Stout Halflings, Forest/Rock Gnomes, and the SRD dragonborn ancestry options).

**Subrace System:**
- Dynamic dropdowns surface only the SRD-legal subraces, and each option carries summary text for speed.
- Locked subraces display a tooltip explaining that they require a private pack; selecting them is blocked until the pack is loaded.

**Private Content Packs:**
- Legacy races from Volo's, Ravnica, Theros, Eberron, etc. stay in the data model so users can merge them locally.
- When a pack registers additional races, the UI automatically removes the lock badge and enables the normal workflow without needing to fork the repo.

### Racial Features (v1.10.3)

- SRD races automatically populate their traits (speed, size, languages, darkvision, resistances) during creation.
- Level-gated features (e.g., Dragonborn breath weapon scaling) track the character's level so features stay accurate after leveling.
- When a private pack adds more races, the same pipeline processes them—`gatherRacialFeatures()` simply receives a larger dataset while the SRD allowlist keeps the default build compliant.

---

## Leveling System

### Level-Up Wizard (v1.10.0)

**Complete 1-20 Progression:**
- Step-by-step wizard for all 12 PHB classes
- HP management (roll or take average)
- Automatic spell slot updates
- Class feature displays
- Proficiency bonus tracking

### Ability Score Improvements (v1.10.0)

**ASI System:**
- Standard ASI: +2 to one ability or +1 to two abilities
- Ability score cap enforcement (max 20)
- Available at class-appropriate levels
- Validation ensures exactly +2 total

### Feat System (v1.10.0)

**SRD-Compliant Feat Library:**
- The default build exposes only the feats that appear in SRD 5.1 as well as any original utility feats authored for the app.
- Each feat includes prerequisite validation, optional ability score bumps, and structured rules text for exports.
- Additional PHB/Tasha's/Xanathar's feats stay in the data files but are hidden until a private content pack whitelists them.

### Subclass System (v1.10.1)

- SRD archetypes (e.g., Champion Fighter, Life Domain Cleric, Thief Rogue) are available out of the box.
- Each subclass step appears at the SRD-prescribed level with descriptive text, feature previews, and validation.
- Non-SRD archetypes remain defined in `data/srd/level-up-data.js`, but the SRD allowlist marks them as locked until a private content pack enables them.
- Once a pack is loaded, the existing UI simply unhides the entries—no additional code paths are required.

### Multiclassing System (v1.10.1)

**PHB-Accurate Multiclass Rules:**

**Spell Slot Calculation:**
- Full casters (Wizard, Sorcerer, Bard, Cleric, Druid): count all levels
- Half casters (Paladin, Ranger): floor(level / 2)
	- Artificer (private pack only): ceil(level / 2)
- Third casters (Eldritch Knight, Arcane Trickster): floor(level / 3)
- Warlock: Pact Magic calculated separately

**Multiclass Management Modal:**
- Level allocation UI across multiple classes
- Progress bar showing class distribution
- Inline prerequisite warnings
- Spell slot preview (shared + Pact slots)
- Add/remove class entries with validation

**Level-Up Integration:**
- Choose to continue existing class or multiclass
- Prerequisite checks before multiclass
- Class levels tracked as `{ className, subclass, level, subclassLevel }`

### Spell Learning System (v1.10.1)

**Class-Specific Rules:**

**Prepared Casters:**
- Cleric, Druid: No "learn spell" UI, fully prepared

**Known-Spell Casters:**
- Wizard: 2 spells/level, no swaps
- Bard, Sorcerer, Warlock: 1 spell/level, can swap 1 existing

**Half Casters:**
- Paladin, Ranger: Start at level 2, 1 spell with swap support

**Smart Filtering:**
- Filter by spell level, name, school, tags
- Only class-appropriate spells shown
- Excludes already-known spells
- Real-time selection tracking

---

## Combat Features

### Dice Roller System (v1.5.6)

**Comprehensive Rolling:**
- Full dice notation (d20, d4-d12, d100)
- Advantage/disadvantage with visual display
- Critical hit/fumble detection (nat 20/1)
- Roll history (last 50 rolls with timestamps)

### Interactive Roll Buttons (v1.5.6, v1.6.1)

**Three-Button Layout:**
- Green (Advantage/Crit)
- White (Normal)
- Red (Disadvantage/Half)

**Roll Types:**
- Skill rolls: All 18 skills
- Saving throws: All 6 saves
- Attack rolls: To-hit and damage
- Death saves: Automatic tracking

### Combat Snapshot (v1.5.6)

**Features:**
- HP adjustment (Heal, Damage, Temp HP, Max HP)
- Inspiration checkbox
- Concentration tracker with DC calculation
- Death save automation
- Exhaustion tracker (levels 0-6)
- Condition toggle buttons

### Combat/DM View (v1.10.4)

**Compact Combat Card:**
- Max 400px centered card
- Quick stat boxes: AC, HP, Speed
- Essential combat info
- All six saving throws
- Conditions/status display

**Actions & Attacks:**
- Attack type, to-hit bonus, save DC
- Range and damage with types
- Attack notes

**Spells in Combat View:**
- Organized by level
- Casting time, range, school
- Concentration requirements
- Prepared spell badges

---

## Spell Management

### Spell Slot Tracking (v1.5.5)

**Features:**
- Levels 1-9 plus Pact Magic slots
- Long rest reset behavior
- Auto-expand based on highest available level
- Spellcasting ability tracking (INT/WIS/CHA)

### Spell List Management (v1.5.5)

**Normalized Spell Objects:**
- Name, level, school, tags, classes
- Complete spell description
- Prepared status tracking
- Ritual flag

**Spell Search:**
- Global SRD spell library pulled from the allowlisted dataset
- Search by name, school, body text, tags
- Top 25 results
- Class filtering

See [SPELLS.md](SPELLS.md) for complete spell database details.

---

## Inventory System

### Structured Inventory (v1.8.5)

**Inventory Table:**
- Item name, quantity, weight per item
- Equipped status
- Attunement tracking
- Notes field
- Edit and delete buttons

### Encumbrance Calculation (v1.8.5)

**D&D 5e Rules:**
- Carrying capacity: STR × 15
- Status indicators: Normal, Encumbered, Heavily Encumbered, Over Capacity
- Color-coded badges (green/info/warning/danger)
- Real-time weight tracking
- Auto-updates with STR changes

---

## Export & Sharing

### Character Sheet Export (v1.10.7)

**Export Formats:**
1. **Print**: Browser print dialog
2. **PDF**: jsPDF + html2canvas rendering
3. **PNG**: High-quality image
4. **Word (.docx)**: Full Word document

**Complete Data Export (95+ Fields):**
- Basic info, combat stats, death saves
- Exhaustion, currency, custom resources
- Ability scores, saves, skills, senses
- Features & traits, inventory, notes
- Complete attack details
- Full spell system with all levels

**Professional Formatting:**
- Maroon headers (#800020)
- Clean grid layouts
- D&D-themed styling
- Export-optimized (no interactive elements)

**File Naming:** `CharacterName_sheet.pdf/png/docx`

**Libraries Used:**
- jsPDF 2.5.1
- html2canvas 1.4.1
- docx 7.8.2

### Send to Initiative Tracker (v1.5.4)

**One-Click Export:**
- Uses `mode: "append"` to preserve existing combat
- Stages `dmtools.pendingImport` payload
- Seamless integration with Initiative Tracker

---

## Mobile Support

### Mobile Optimization (v1.8.6, v1.5.7)

**Responsive Design:**
- Phones (<768px), tablets (768-991px), desktop
- Collapsible card sections
- Horizontal scrolling tabs
- Touch-optimized buttons (38x38px minimum)
- Adaptive font sizes and spacing

### Collapsible Sections (v1.8.6)

**All Major Sections:**
- Tap/click headers to expand/collapse
- Animated chevron icons
- Intelligent defaults (frequently-used expanded)
- Mobile hint text: "(tap to expand/collapse)"

### Mobile Toast Notifications (v1.8.6)

**Roll Results:**
- Toast notifications at top of screen
- Color-coded: green (crit), red (fumble), gray (normal)
- Auto-dismiss after 3 seconds
- Eliminates scrolling to roll history

---

## Help System

### Comprehensive Help Modal (v1.10.3)

**6 Tabbed Sections:**
1. **Getting Started**: Creating characters, saving/loading, page layout
2. **Character Info**: Basic info, backstory, portrait, multiclass
3. **Stats & Combat**: Ability scores, skills, HP/AC, attacks, death saves
4. **Spells**: Spell slots, known spells, spell DC/attack bonus
5. **Leveling Up**: Level-up wizard, multiclassing, ASI/feats, racial features
6. **Features**: Inventory, features & traits, tips & tricks

**Features:**
- Large, scrollable modal
- Multiple accordion sections per tab
- Page layout mapping
- Tips, warnings, and usage examples

---

## Implementation Files

### Core Files

- **[characters.html](../characters.html)** - Character sheet interface
- **[js/character.js](../js/character.js)** - Main character management
- **[js/character-creation-wizard.js](../js/character-creation-wizard.js)** - Creation wizard
- **[js/level-up-system.js](../js/level-up-system.js)** - Level-up wizard
- **[data/srd/level-up-data.js](../data/srd/level-up-data.js)** - Class progression data
- **[js/character-sheet-export.js](../js/character-sheet-export.js)** - Export module
- **[js/multiclass-ui.js](../js/multiclass-ui.js)** - Multiclass management
- **[js/indexed-db-storage.js](../js/indexed-db-storage.js)** - Storage system

### Data Structure

**Character Object Fields:**
- Basic: name, player, race, subrace, class, subclass, background, level, alignment
- Multiclass: classes array, multiclass flag
- Abilities: 6 ability scores with modifiers
- Combat: HP (current/max/temp), AC, speed, initiative, hit dice
- Skills: 18 skills with proficiency/expertise/bonus
- Saves: 6 saving throws with proficiency/bonus
- Spells: spell slots, pact slots, spell list, spellcasting ability
- Inventory: inventory items array
- Features: features & traits, notes
- DM Fields: party role, story hooks, reminders, secrets
- Portrait: type, data, zoom/pan settings

---

## Version History Summary

1. **v1.5.4** - Initial full integration with basic character sheet
2. **v1.5.5** - Spell/attack systems with slot tracking
3. **v1.5.6** - Interactive dice roller and combat features
4. **v1.5.7** - Character creation wizard and mobile optimization
5. **v1.8.5** - Structured inventory system
6. **v1.8.6** - Mobile collapsible sections and toast notifications
7. **v1.8.7** - Expanded character creation dataset (now SRD-gated in default builds)
8. **v1.10.0** - Complete level-up system (1-20)
9. **v1.10.1** - Subclasses, spell learning, and multiclassing
10. **v1.10.3** - Racial features and comprehensive help system
11. **v1.10.4** - Combat/DM view toggle
12. **v1.10.7** - Character sheet export (PDF/PNG/Word/Print)

## Use Cases

### For DMs
Track the party with quick reference for passive Perception, spell lists, and story hooks. Export all 4 PCs to Initiative Tracker before combat. Use Combat View for at-a-glance stats during encounters.

### For Players
Use as your SRD-compliant character sheet during a one-shot or campaign. Click dice buttons to roll skills/saves/attacks, track HP/resources, manage spell slots. Load a private content pack locally if you want to re-enable additional sources you own—nothing leaves your device.

### For New Players
Character Creation Wizard guides you through every SRD step with explanations. Creates a 95%+ complete character with equipment, attacks, features, and spells.

## Why Use This Instead of another tool?

**Common pain points elsewhere:**
- Paywalls for basic SRD data
- Online-only tools that can't be used at the table with bad Wi-Fi
- Vendors that require you to re-purchase digital books to unlock features

**The DM's Toolbox approach:**
- ✅ **SRD rules content bundled for free** with attribution handled automatically
- ✅ **Private content packs** keep any non-SRD material local to your browser
- ✅ **Complete level-up system (1-20)** with ASI, feats, subclasses, spell learning
- ✅ **Multiclassing** with correct spell slot math (full/half/third + pact magic)
- ✅ **Offline-first architecture** — once cached, it works without the internet
- ✅ **No tracking** — characters live entirely in IndexedDB/LocalStorage

