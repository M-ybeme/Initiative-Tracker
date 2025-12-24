# Changelog

All notable changes to The DM's Toolbox are documented here.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## Version Series Overview

The DM's Toolbox has evolved through focused feature releases:

- **1.11.x**: Journal system with rich text editor and IndexedDB persistence
- **1.10.x**: Full character manager with multiclass support, spell learning, subclass selection, and character sheet export
- **1.9.x**: Battle map measurement tools, persistent fog shapes, and generator integration across NPC/Tavern/Shop systems
- **1.8.x**: Spell database expansion to 432+ spells, inventory management, loot generator overhaul, and character token generation

---

## [1.11.2] - 2025-12-24
**Battle Map: Persistent Measurements System**

### Added
- **Persistent Measurements** - Create permanent spell areas and ranges that stay on the map across sessions
- **Flicker-Free Rendering** - Measurements display as colored shapes without text by default, preventing expensive text rendering during pan/zoom
- **Interactive Selection** - Click any measurement to select and see distance details, text, and resize handles
- **Drag & Resize** - Selected measurements can be moved by dragging or resized by dragging start/end handles
- **Color Coding** - Color picker for measurements enables visual identification of different spell effects and zones
- **Persistent Toggle** - New "Persistent" button to enable/disable persistent measurement mode
- **Auto Token Adjustment** - Circle measurements automatically add +0.5 cells (like aura) to account for token size

### Enhanced
- **Save/Load Support** - Persistent measurements saved to IndexedDB and localStorage with battle map state
- **Shape Types** - All three measurement types (line, cone, circle) supported as persistent measurements
- **Performance** - Shape-only rendering (like fog shapes) provides smooth 60fps during pan/zoom/rotate operations
- **Delete Functionality** - Press Delete key to remove selected measurements

### Technical
- **Rendering Architecture** - Combines fog shape rendering speed with measure tool's text-on-demand approach
- **Hit Detection** - Smart click detection for lines (point-to-line distance), cones (angle/distance), and circles (edge/radius)
- **State Management** - Measurements tracked separately from fog shapes with independent selection state

---

## [1.11.1] - 2025-12-24
**Navigation & Battle Map Improvements**

### Added
- **Navigation Dropdowns** - All 10 pages now use Bootstrap dropdown menus organizing tools into Combat, Generators, and Campaign categories
- **Fog Compositing** - Reveal fog shapes now cut through cover fog using `destination-out` compositing for dynamic fog of war
- **Circle Resize** - Circle fog shapes can be resized by dragging the blue edge handle (perfect for spell areas and vision ranges)
- **Help Documentation** - Updated battlemap help with fog compositing, circle resize, and practical fog of war tips

### Fixed
- **Flicker Elimination** - Removed status text element that caused layout shifts and canvas flickering during token movement
- **Mobile Navigation** - Dropdown menus automatically collapse on mobile for better responsive design
- **Persistence Measurement Removed** - Recent measure system caused flicker. Attempted fixes using SVG, and fabric.js implimentation. Feature removed until perminent solution can be found

### Enhanced
- **Fog Workflow** - Three-pass rendering (cover → reveal → outlines) ensures reveal shapes always cut through cover
- **Use Cases** - Fog shapes now excellent for spell areas (Fireball, Darkness), line-of-sight windows, and persistent measurements

---

## [1.11.0] - 2025-12-22
**Journal: Rich Text Editor with Persistent Storage**

### Added
- **Rich Text Editor** - Full-featured journal powered by Quill with formatting (headers, bold, italic, lists), text/background colors, alignment, links, and local image insertion
- **Image Management** - Drag-to-resize images with 8 handles, text wrapping (float left/right), and visual resize indicators
- **File Management** - Sidebar with all saved entries, timestamp-based default names, custom naming, sort by newest first
- **Persistent Storage** - IndexedDB storage with auto-save on Ctrl+S, cross-session persistence, and toast notifications
- **User Interface** - Toolbar tooltips, active file highlighting, dark theme, responsive layout with file list and editor side-by-side

---

## [1.10.9] - 2025-12-22
**Loot Generator: Cursed Items System**

### Added
- **Cursed Items Category** - 50 new cursed items with risk/reward mechanics, 5 severity levels, visually distinguished with red borders and warning icons
- **Curse Severity Slider** - Dynamic difficulty control (1-5 scale) from minor flavor curses to serious mechanical penalties
- **Cursed Items Toggle** - Enable/disable cursed item generation, integrated with monster templates
- **Quick Bundles** - Pre-configured cursed items bundle (6 items) and magic items bundle (8 items)

### Fixed
- **Potion/Scroll Bundles** - Fixed category validation errors by changing from invalid "Minor Magic" category to proper categories

### Enhanced
- **Results Display** - Added cursed item counter to metadata pills
- **Preset System** - Cursed toggle and severity now saved/loaded with presets
- **Template Integration** - Cursed items weighted higher for lich (1.5x), demon (1.4x), undead (1.3x)

---

## [1.10.8] - 2025-12-18
**Tavern Generator: Expanded Cultural Menus**

### Enhanced
- **Cultural Tavern Menus** - Expanded all 7 cultural tavern types (Dwarven, Elven, Halfling, Orcish, Coastal, Desert, Mountain) with 4-5x more food and drink options per type
- **Menu Variety** - Each tavern type now has 16-21 food items and 17-21 drink options for unique generation results
- **Thematic Authenticity** - Culturally-appropriate food and drink names reduce repetition across multiple generations

---

## [1.10.7] - 2025-12-18
**Character Manager: Character Sheet Export System**

See [CHARACTER_MANAGER.md](docs/CHARACTER_MANAGER.md) for complete character manager feature documentation.

### Added
- **Multi-Format Export** - Print, PDF (jsPDF), PNG (html2canvas), and Word (.docx) export options
- **Complete D&D 5e Data** - All ~95 character fields exported including combat stats, abilities, skills, spells, attacks, inventory
- **Professional Formatting** - D&D-themed styling with maroon headers, clean layouts, section separators

### Technical
- New file: `js/character-sheet-export.js` with CharacterSheetExporter class
- Export methods: exportToPDF, exportToPNG, exportToWord, printSheet, generateSheetHTML

---

## [1.10.6] - 2025-12-18
**Battle Map: Performance Optimization & Persistent Measurements**

See [BATTLEMAP.md](docs/BATTLEMAP.md) for detailed battle map features.

### Added
- **Layered Canvas Architecture** - 4 separate layers (map, fog, token, UI) with dirty flag system eliminates flickering and improves performance
- **Persistent Measurement System** - Save and manipulate measurements with three shapes (Line, Cone 90°, Circle), color picker, move/resize/rename/delete functionality
- **Interactive Measurement Editing** - Drag measurements, resize with endpoint handles, right-click to rename or delete

### Changed
- Canvas rendering switched from continuous redraw to event-driven dirty flags
- All layers transform synchronously during pan/zoom operations

---

## [1.10.5] - 2025-12-18
**Tavern Generator: Full Cultural Immersion System**

See [GENERATORS.md](docs/GENERATORS.md) for generator system documentation.

### Added
- **Cultural Patron Types** - 7 patron types per culture (56 new types total) with thematic professions
- **Cultural Events** - 3-4 unique events per tavern type (28 new events)
- **Cultural Rumors** - 4 themed bartender rumors and 4 themed patron rumors per culture
- **Cultural Ambiance** - 8 atmospheric descriptors per culture for immersive generation
- **Cultural Staff Descriptors** - Complete character traits (attire, demeanor, manner, accent) per culture

### Changed
- Cultural tavern type now influences all generation aspects (menus, patrons, events, rumors, ambiance, staff)
- Patron generation heavily weighted toward cultural types for authentic atmosphere

---

## [1.10.4] - 2025-12-18
**Character Manager: Combat/DM View Toggle**

### Added
- **Combat View Toggle** - New display mode for quick combat reference with localStorage persistence
- **Compact Combat Card** - Essential stats (AC, HP, Speed, Initiative), saving throws, conditions, attacks, and spells in clean read-only format
- **Auto-Updates** - Combat card refreshes automatically when character data changes (debounced 300ms)

---

## [1.10.3] - 2025-12-17
**Character Manager: Racial Features & Help System**

### Added
- **Missing Racial Features** - Added 5 races with level-based features (Githyanki, Githzerai, Shadar-kai, Bugbear, Hobgoblin)
- **Racial Scaling Features** - Reference tables for level 1 features that scale (Dragonborn breath weapon, Goliath Stone's Endurance, Shifter temporary HP, etc.)
- **Comprehensive Help Modal** - 6 tabbed sections covering getting started, character info, stats/combat, spells, leveling up, and features with accordion subsections

---

## [1.10.2] - 2025-12-15
**Tavern Generator: Context & Metrics Update**

### Added
- **Context Influence System** - Time-of-day and tavern-type selectors with Context Influence slider to control bias strength
- **Boosted Pool Strategy** - Weight context-specific pools against base pools with optional omission at slider value 0
- **Metrics Tooling** - `simulate_tavern_metrics.py` for Monte Carlo trials measuring context share and item frequency

### Changed
- Improved seeded RNG handling for deterministic simulations
- Tightened boostedPool growth cap to prevent runaway pool sizes

---

## [1.10.1] - 2025-12-13
**Character Manager: Subclasses, Spells, and Multiclassing**

See [CHARACTER_MANAGER.md](docs/CHARACTER_MANAGER.md) for full feature documentation.

### Added
- **Complete Subclass System** - All 12 PHB classes with full subclass data in level-up-data.js
- **Spell Learning System** - Automatic spell learning UI during level-up with class-specific rules, filters, and swap support
- **Multiclassing System** - PHB-accurate multiclass calculations, prerequisite checking, spell slot preview, level allocation UI

### Changed
- Character data structure updated with multiclass fields and classes array
- Spell slot calculation detects multiclass rules and returns shared/pact slots
- Character creation wizard includes subclass selection step

### Fixed
- Character creation failure resolved with reliable character object building
- Spell slot controls now have proper event handlers
- Subclass integration edge cases resolved

---

## [1.10.0] - 2025-12-12
**Character Manager: Level-Up System**

### Added
- **Complete Level-Up Wizard** - Step-by-step wizard for leveling characters 1-20 with all 12 PHB classes
- **HP Management** - Roll or take average with automatic CON modifier calculation
- **Ability Score Improvements** - ASI options at class-appropriate levels with +2 total enforcement
- **Feat System** - 40+ official feats with prerequisite checking and automatic ability increases
- **Spell Slot Progression** - Automatic updates for all caster classes with Pact Magic tracking
- **Class Features Display** - New features shown at each level with descriptions

### Technical
- New files: `js/level-up-data.js`, `js/level-up-system.js`
- Documentation: `LEVEL_UP_SYSTEM.md`, `LEVEL_UP_TESTING.md`

---

## [1.9.3.1] - 2025-12-12
**Battle Map: Canvas Flicker Revert**

### Fixed
- Reverted rendering behavior to pre-1.9.2 implementation to fix black canvas flicker during token dragging

---

## [1.9.3] - 2025-12-12
**Encounter Builder: DM Reference Export System**

### Added
- **Stat Block Text Export** - Generates comprehensive DM reference file with all enemy stat blocks from D&D 5e API
- **Export Prompt** - Optional download on "Send to Initiative Tracker" with timestamp-based filenames
- **Complete Details** - All actions, reactions, special abilities, legendary actions with attack bonuses and damage dice

---

## [1.9.2] - 2025-12-12
**Quality-of-Life Enhancements**

### Added
- **NPC Combat Stats** - 5-tier difficulty system (CR 0-15) with 17 specialties, auto-calculated HP/AC/abilities, copy functionality
- **Tavern Patron System** - Random 3-5 patrons with 27 types, 22 visual quirks, 27 activity hooks
- **Loot Quick Bundles** - 6 one-click presets (Pocket Loot, Coin Pouch, 5 Gems, Potion Bundle, Scroll Bundle, Boss Hoard)
- **Battle Map Token Stats** - AC/Initiative fields with "Add to Initiative" button that auto-populates Initiative Tracker via localStorage
- **Name Generator Favorites** - Persistence already implemented (no changes needed)

---

## [1.9.1] - 2025-12-12
**Tavern Events & Rumors**

### Added
- **Events System** - 1-2 random events per generation from 65+ unique tavern events
- **Bartender Rumors** - 2-3 rumors from trusted keeper perspective (63+ unique rumors)
- **Patron Rumors** - 2-4 overheard rumors with varying reliability (62+ unique rumors)
- **Unsaved Changes Indicator** - Visual badge with pulsing animation, comprehensive change detection, browser navigation guard

### Changed
- README version reference replaced with dynamic link to CHANGELOG.md

---

## [1.9.0] - 2025-12-11
**Shop-to-Character Integration & Battle Map Enhancements**

### Added
- **Shop to Character Inventory** - "Add to Character" button on shop items with modal interface, automatic data transfer, IndexedDB/localStorage compatibility
- **Battle Map Multi-Shape Measurements** - Line, Cone (90°), Circle shapes with semi-transparent fills, shape-specific labels
- **Aura Radius Auto-Adjustment** - Auras automatically add 0.5 cells to account for token's own space
- **Right-Click Exit** - Exit measurement mode with right-click anywhere on canvas
- **Shop UI Overhaul** - Modern card design, enhanced headers, improved tables, responsive design enhancements

---

## [1.8.9] - 2025-12-10
**Character Token Generation for Battle Map**

### Added
- **Token Generation System** - "Send to Battle Map" button generates circular tokens with portraits or initials
- **Interactive Preview Modal** - Zoom slider (0.5x-3x), drag-to-pan, reset button, real-time preview
- **Battle Map Integration** - Auto-import at center of view, preserves existing tokens, non-disruptive append mode
- **CORS Protection** - Upfront detection of URL-based portraits with clear error messages

---

## [1.8.8] - 2025-12-10
**Generator Integration & Loot Expansion**

See [GENERATORS.md](docs/GENERATORS.md) for complete generator documentation.

### Added
- **Name Generator Expansion** - 16 new races (30+ total) with culturally appropriate syllable patterns, organized dropdown with optgroups
- **NPC to Name Generator Integration** - Interactive name picker modal with 12 options, race auto-detection, regenerate button
- **Tavern to NPC Integration** - "Generate Full NPC Details" button expands staff into complete 8-field NPCs
- **Shop Negotiate Mechanic** - Haggling system with Persuasion DC based on rarity, price outcomes table
- **Initiative Bulk HP Adjust** - Mass healing/damage system with filter options (PCs/Enemies/All)
- **Loot Category Expansion** - Trade Goods (6→14), Gems & Art (5→13), Minor Magic Items (8→47)

---

## [1.8.7] - 2025-12-09
**Character Creation Wizard: Comprehensive Expansion**

### Added
- **Expanded Race Selection** - 9→33+ races including PHB, Volo's, Elemental, Ravnica, Theros, Eberron races
- **Subrace Support** - Dynamic subrace dropdown for Elf, Dwarf, Halfling, Gnome, Dragonborn, Tiefling, Aasimar, Shifter
- **Class Expansion** - Added Artificer (13 classes total) organized into Martial/Full Spellcasters/Half-Casters
- **Background Selection** - 13 official backgrounds with skill proficiencies
- **Interactive Skill Selection** - Dynamic picker based on class with proper selection enforcement
- **Auto HP/AC Calculation** - Class-appropriate armor options with accurate AC calculations including Unarmored Defense
- **Racial Ability Bonuses** - All 33+ races with correct modifiers and subrace bonuses
- **Auto Saving Throws** - Class-based proficiencies automatically set

---

## [1.8.6] - 2025-12-09
**Character Manager: Mobile Optimization**

### Added
- **Mobile Toast Notifications** - Roll results as toasts on mobile (<768px) with color-coding (green/red/gray)
- **Collapsible Card Sections** - All major sections collapsible with animated chevron icons, mobile hint text
- **Mobile-Specific Enhancements** - Smooth transitions, scroll offset for fixed navbar, intelligent defaults

### Changed
- Resources & Rests buttons moved from header to body for proper collapse functionality

---

## [1.8.5] - 2025-12-09
**Character Manager: Structured Inventory System**

### Added
- **Structured Inventory Management** - Full table system tracking name, quantity, weight, equipped status, attunement
- **Automatic Encumbrance** - Real-time weight tracking with D&D 5e rules (STR × 15), color-coded status indicators
- **NPC Secrets System** - 42 unique secrets automatically generated per NPC
- **NPC Height Field** - 12 height variations integrated into descriptions
- **Shopkeeper NPCs** - Auto-generated names and personalities (Fitting 70%, Ironic 20%, Wrong Field 10%)
- **Limited Stock Quantities** - Stock varies by rarity and settlement size

---

## [1.8.4] - 2025-12-08
**Loot Generator: Complete Feature Overhaul**

See [GENERATORS.md](docs/GENERATORS.md) for complete loot generator documentation.

### Added
- **Hoard vs Individual Loot** - Toggle between large treasure piles and pocket loot (10% scaling)
- **Mundane Items Category** - 20 essential adventuring items (rope, torches, rations, tools)
- **Monster-Specific Templates** - 9 monster types (Dragon, Lich, Vampire, Beholder, Giant, Demon/Devil, Fey Noble, Aberration, Undead) with category weights and flavor text
- **Custom Loot Table Import** - Import custom JSON loot tables with dropdown selector
- **Save/Load Preset System** - Save settings with custom names, localStorage persistence

---

## [1.8.3] - 2025-12-08
**Battle Map Enhancement: Persistent Measurement Tools & Token Features**

### Added
- **Token Enhancement Features** - Labels, HP tracking, status conditions, aura effects, vision cones, compact context menu
- **Full Persistence** - All token features save/load with map

### Changed
- Context menu uses fixed positioning with overflow detection
- Token rendering optimized with three-pass system (auras → tokens → overlays)

---

## [1.8.1] - 2025-12-05
**Complete D&D 5e Spell Database Expansion**

See [SPELLS.md](docs/SPELLS.md) for complete spell database details.

### Added
- **Comprehensive Spell Expansion** - 120+ missing spells from PHB, Xanathar's, Tasha's (312→432 spells)
- **Complete Class Coverage** - All Paladin Smites (6/6), all Tasha's Summons (10/10), all Xanathar's Cantrips (17)
- **Modern D&D Content** - Post-PHB spells including popular summoning systems and elemental cantrips

### Changed
- Database completeness improved from ~70% to ~95% for PHB/Xanathar's/Tasha's content

### Database Statistics
- **By Source**: PHB 100%, Xanathar's ~90%, Tasha's ~85%
- **By Level**: 41 Cantrips, 60+ Level 1, 65+ Level 2, 57+ Level 3, 42+ Level 4, 45+ Level 5, 38+ Level 6, 25+ Level 7, 19+ Level 8, 16+ Level 9
- **By Class**: Wizard 240+, Sorcerer 145+, Bard 120+, Cleric 118+, Druid 115+, Warlock 84+, Paladin 49+, Ranger 50+, Artificer 42+

---

## [1.8.0] - 2025-12-05
**Battle Map Fog Shapes Enhancement**

### Added
- **Interactive Resize Handles** - Rectangles/squares have 8 drag handles (4 corners + 4 edges) with minimum size constraints
- **Improved Fog Rendering** - Shapes render on top of tokens with filled display in world-space
- **Manual Save System** - "Save Session" button with Ctrl+S shortcut replaces auto-save to prevent performance issues

### Fixed
- Fog shapes visibility issue resolved by rendering directly on main canvas in world-space
- Performance during grid adjustments improved by removing excessive save() calls

---

## [1.7.1] - 2025-12-04
**Character Wizard Memory Leak Fix**

### Fixed
- Event listeners no longer accumulate on repeated wizard navigation by storing references and removing old listeners

---

## [1.7.0] - 2025-12-04
**IndexedDB Storage Implementation**

### Added
- **IndexedDB Storage System** - Replaced localStorage with IndexedDB (50MB-1GB+ capacity vs 5-10MB limit)
- **Automatic Migration** - From localStorage to IndexedDB on first load with dual storage redundancy
- **Import Fallback Logic** - Smart error handling when quota exceeded with option to import without portraits
- **Battle Map IndexedDB** - Sessions use IndexedDB with backward compatibility

### Fixed
- Storage quota exceeded errors resolved with IndexedDB capacity
- Large portraits and fog-of-war data no longer risk quota errors

---

## [1.6.3] - 2025-12-04
**Initiative Roller Addition**

### Added
- Initiative Roll Button next to Initiative Modifier in Combat Snapshot (rolls 1d20 + modifier)

---

## [1.6.2] - 2025-12-04
**Character Save Bug Fixes**

### Fixed
- Portrait data now properly saves when clicking "Save Character" button
- Wizard integration fixed with correct function name `recalcDerivedFromForm()`
- Save Throws pill spacing fixed for column visibility

---

## [1.6.1] - 2025-12-04
**Advantage/Disadvantage Button Improvements**

### Added
- **Explicit A/D Buttons** - Three-button layout for skill rolls and saving throws (Green/White/Red for Advantage/Normal/Disadvantage)
- **Mobile Optimization** - Touch-friendly sizing, responsive font sizes, compact button groups

---

## [1.6.0] - 2025-12-04
**Enhanced Attack & Damage Roll System**

### Added
- **Separate Damage Controls** - Independent buttons for to-hit and damage (no auto-roll)
- **Damage Type Labels** - Separate fields for primary and secondary damage types
- **Advanced Damage Options** - Critical hit button doubles dice, half damage button for resistance
- **Attack Roll Enhancements** - Three-button system with visual feedback (Green/White/Red)

### Changed
- Attack rolls no longer auto-roll damage, must be triggered separately
- Roll history displays damage type labels

---

## [1.5.7] - 2025-12-03
**Character Creation Wizard & Mobile Optimization**

### Added
- **Character Creation Wizard** - 7-step guided walkthrough with 4d6-drop-lowest roller, race/class selection, skill guidance
- **Mobile-Responsive Design** - Comprehensive mobile CSS for phones/tablets/desktop with collapsible roll history, horizontal scrolling tabs, touch-optimized buttons

---

## [1.5.6] - 2025-12-03
**Player-Facing Features & Interactive Character Sheets**

### Added
- **Comprehensive Dice Roller** - Full dice notation parsing with advantage/disadvantage, critical hit/fumble detection, roll history panel
- **Interactive Roll Buttons** - Skill rolls, save rolls, attack rolls, death save rolls with automatic tracking
- **Combat Features** - HP adjustment buttons, inspiration checkbox, concentration tracker, death save automation
- **Skill System Enhancements** - Expertise support with auto-enable proficiency

---

## [1.5.5] - 2025-12-03
**Character Sheet Refinements & Spell/Attack Systems**

### Added
- Full spell slot tracking (1-9 plus pact slots) with long rest reset
- Attack list management with modal editor for various attack types
- Short/Long Rest helpers restoring HP, resources, spell slots
- Exhaustion tracker with rules text for each level
- Condition toggle buttons with synced text field

### Changed
- Character spell lists persist normalized spell objects instead of plain strings
- Spell search upgraded to global library with top 25 results
- "Send to Initiative Tracker" uses mode: "append" to preserve existing list

---

## [1.5.4] - 2025-11-29
**Character Manager + Full Integration**

### Added
- Character Manager (characters.html) with full character sheet system
- Portrait system with upload, URL input, zoom/pan framing
- Spell list support with filtering and custom builder
- Send to Initiative Tracker with one-click export
- DM-specific fields, tabbed interface, passive scores
- Multi-character management with import/export

---

## [1.5.0] - 2025-11-25
**Stability & Version Tracking**

### Added
- Unique character ID generation
- Console build stamps for version tracking
- MIT License and repository metadata
- Load guards for improved stability

### Changed
- Refactored initiative.js with extracted rules/spells
- Improved active-turn behavior persistence

### Fixed
- Player View security with properly hidden AC column
- Cross-page sync issues for Player View toggle

---

## [1.4.0] - 2025-11-03 to 2025-11-21
**Battle Map & Encounter Builder**

### Added
- **Battle Map MVP** - Token placement, fog-of-war, scale controls, LocalStorage saving, pinch-zoom
- **Encounter Builder** - Quick assembly with export to Initiative Tracker
- Ko-fi footer link
- Editable character names with smart duplicate numbering

---

## [1.3.0] - 2025-10-22 to 2025-10-30
**Spells & Rules Integration**

### Added
- Spells and Rules reference integrated into Initiative Tracker
- Saved Characters modal
- Character type color-coding
- site.js for centralized page logic

---

## [1.2.0] - 2025-10-10 to 2025-10-16
**Death Saves & Temp HP**

### Added
- Death Saves tracking system
- Temp HP Undo support
- Dice roller upgrades
- Help menu refinements

### Changed
- Improved Concentration checks timing

---

## [1.1.0] - 2025-09-03 to 2025-10-09
**Generators Expansion**

### Added
- Generator tools across multiple pages
- Loot bundles and preset controls
- Improved name generator

### Changed
- Enhanced initiative tracker with editable fields
- Mobile-friendly improvements

---

## [1.0.0] - 2025-08-27 to 2025-09-02
**Initial Release**

### Added
- Name Generator (name.html)
- Loot Generator (loot.html)
- Shop Generator (shop.html)
- Initial global layout and navbar
- Initiative tracker integration foundation
- Netlify auto-deploy pipeline

---

## [0.9.0] - 2025-02 to 2025-10
**Legacy Project (Pre-Toolbox)**

Note: This represents the original Initiative Tracker + Wiki project that served as the foundation for The DM's Toolbox 1.0 rewrite.

### Added
- Early Initiative Tracker prototype
- Session Notes with save/load
- Import/export features
- Saved characters and mobile-friendly management
- Concentration logic and dice rolls

### Fixed
- Delete character bugs
- Hamburger menu issues
- Turn progression bugs
- Navbar unification

---

## Legend

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
