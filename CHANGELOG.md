# Changelog

All notable changes to The DM's Toolbox are documented here.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## Version Series Overview

The DM's Toolbox has evolved through focused feature releases:

- **1.11.x**: Journal system with rich text editor, import/export (Word/PDF/TXT/Markdown), and Battle Map → Initiative Tracker integration
- **1.10.x**: Full character manager with multiclass support, spell learning, subclass selection, and character sheet export
- **1.9.x**: Battle map measurement tools, persistent fog shapes, and generator integration across NPC/Tavern/Shop systems
- **1.8.x**: Spell database expansion to 432+ spells, inventory management, loot generator overhaul, and character token generation

---

## [1.11.12] - 2026-01-17
**Artificer Class Support & Enhanced Multiclass System**

### Added
- **Full Artificer Class** - Complete Artificer implementation in CLASS_DATA
  - Hit die (d8), saving throws (CON, INT), armor/weapon/tool proficiencies
  - Half-caster spell progression (rounded up for multiclass per RAW)
  - All 20 levels of class features
  - Cantrips known progression (2 at level 1, 3 at level 10, 4 at level 14)
  - Spell slots for all levels
  - Infusions known and infused items scaling

- **Artificer Infusions System** - `ARTIFICER_INFUSIONS` data structure with 16 infusions
  - Level 2: Armor of Magical Strength, Enhanced Arcane Focus, Enhanced Defense, Enhanced Weapon, Homunculus Servant, Mind Sharpener, Repeating Shot, Replicate Magic Item, Returning Weapon
  - Level 6: Boots of the Winding Path, Radiant Weapon, Repulsion Shield, Resistant Armor
  - Level 10: Helm of Awareness, Spell-Refueling Ring
  - Level 14: Arcane Propulsion Armor
  - Helper functions: `getAvailableInfusions()`, `getInfusionsKnown()`, `getInfusedItemsMax()`, `formatInfusionsReference()`

- **Artificer Resources & Equipment**
  - Added to `CLASS_RESOURCES`: Flash of Genius (INT mod uses at level 7+), Infused Items tracking
  - Added to `DEFAULT_CLASS_WEAPONS`: Light Crossbow, Fire Bolt cantrip
  - Added to `DEFAULT_CLASS_EQUIPMENT`: Light Crossbow, Light Hammer, Scale Mail, Shield, Thieves' Tools, Tinker's Tools, Dungeoneer's Pack

- **Multiclass Hit Dice Tracking** - Per-class hit dice management for multiclass characters
  - `calculateMulticlassHitDice(classes)` - Returns breakdown like "3d10 + 2d8"
  - `initMulticlassHitDiceState(classes)` - Initialize state object with pools by die size
  - `spendMulticlassHitDice(state, dieSize, count)` - Spend from specific hit die pool
  - `restoreMulticlassHitDice(state)` - Long rest restoration (half total, prioritizes larger dice per RAW)
  - `formatMulticlassHitDice(state)` - Display string like "2/3 d10, 1/2 d8"

- **Class Level vs Character Level Helpers** - Proper multiclass feature tracking
  - `getClassLevel(classes, targetClass)` - Get level in a specific class
  - `getTotalCharacterLevel(classes)` - Sum of all class levels
  - `hasClassFeature(classes, className, requiredLevel)` - Check if feature is available by class level
  - `getMulticlassFeatures(classes)` - Get all features with class attribution
  - `getMulticlassProficiencyBonus(classes)` - Based on total character level
  - `getMulticlassExtraAttack(classes)` - Handles Extra Attack stacking rules (Fighter 5/11/20 gets 2/3/4 attacks)

### Technical
- Added full Artificer class to `CLASS_DATA` in [level-up-data.js](js/level-up-data.js)
- Added `ARTIFICER_INFUSIONS` data structure with 16 infusions across 4 level tiers
- Added 5 multiclass hit dice helper functions
- Added 6 class level vs character level helper functions
- All new functions exported in public API

---

## [1.11.11] - 2026-01-17
**Character Creation & Level-Up: Class Resources, Auto-Attacks, Racial Features & Spells**

### Added
- **Class Resource Trackers** - Auto-populates class-specific resources during character creation
  - `CLASS_RESOURCES` data structure with resources for all 12 classes
  - Resources scale with level and ability scores where applicable (e.g., Bardic Inspiration = CHA mod)
  - Uses existing "Tracked Resources" UI (res1, res2, res3 slots)
  - **Resources by class:** Barbarian (Rage), Bard (Bardic Inspiration), Cleric (Channel Divinity), Druid (Wild Shape), Fighter (Second Wind, Action Surge), Monk (Ki Points at level 2+), Paladin (Lay on Hands, Divine Sense), Sorcerer (Sorcery Points at level 2+), Wizard (Arcane Recovery)

- **Auto-Generate Basic Attacks** - Characters receive class-appropriate weapon/cantrip attacks during creation
  - `DEFAULT_CLASS_WEAPONS` data structure with weapons for all 12 classes
  - `generateDefaultAttacks()` function creates properly formatted attack entries
  - `getCantripDamageDice()` helper for cantrip damage scaling at levels 5, 11, 17
  - **Examples:** Fighter gets Longsword + Longbow, Warlock gets Dagger + Eldritch Blast (with scaling)

- **Spell Tooltip Info Icons** - Question mark icons next to spells in character creation and level-up wizards
  - Shows full spell description, casting time, range, components, duration on hover
  - Dark aesthetic matching site theme (subtle gray icon)
  - Available in both character creation wizard and level-up spell selection

- **Class Resource Auto-Update on Level-Up** - Resources automatically update when leveling up
  - Matches existing resources by name (case-insensitive)
  - Updates max values and replenishes to new max (like a long rest)
  - Graceful failure with warning banner if resources can't be matched (e.g., user renamed them)
  - Success message shows "Class resources updated and replenished"

- **Comprehensive Racial Features** - Automatically populates racial traits in Features & Feats section during character creation
  - `RACIAL_BASE_FEATURES` data structure covering 30+ races from PHB, Volo's Guide, Ravnica, Theros, and Eberron
  - Base racial traits (speed, size, languages, darkvision, etc.) for all races
  - Subrace-specific traits automatically included (e.g., High Elf weapon training, Lightfoot Halfling's Naturally Stealthy)
  - Level-gated features tracked (e.g., Aasimar's Celestial Revelation at level 3)
  - Scaling features with level-appropriate values (e.g., Dragonborn breath weapon damage)
  - Formatted as markdown with clear headers for easy reference

- **Racial Spells (Innate Spellcasting)** - Races with innate spellcasting now have their spells auto-added to spell list
  - `RACIAL_SPELLS` data structure tracking spells granted by racial features
  - **Tiefling**: Thaumaturgy (lvl 1), Hellish Rebuke (lvl 3), Darkness (lvl 5)
  - **Aasimar**: Light (lvl 1)
  - **Drow/High Elf/Forest Gnome**: Dancing Lights, cantrip choices, Minor Illusion
  - **Genasi (Fire/Earth/Water/Air)**: Produce Flame, Pass Without Trace, Shape Water, etc.
  - **Yuan-ti Pureblood**: Poison Spray, Animal Friendship (snakes), Suggestion
  - **Firbolg**: Detect Magic, Disguise Self
  - **Triton**: Fog Cloud, Gust of Wind, Wall of Water
  - Racial spells marked with usage notes (e.g., "Racial: 2nd-level, 1/long rest")
  - Added during both character creation and level-up when unlocked
  - Marked as "always prepared" and excluded from prepared spell count

- **Level-Up Racial Support** - Level-up system now properly handles racial progression
  - Race name parsing fixed for formats like "Tiefling (Asmodeus)"
  - Racial features unlocked at new levels shown in success notification
  - Racial spells gained at new levels automatically added to spell list
  - Success message shows "Racial feature unlocked: X" and "Racial spell gained: Y"

- **Background Features** - Background features now auto-populate in Features & Feats section
  - `BACKGROUND_DATA` structure with all 13 PHB backgrounds (Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin)
  - Full feature descriptions with mechanical benefits
  - Skill and tool proficiencies tracked
  - Background feature formatted as markdown and added alongside racial and class features

- **Starting Equipment Auto-Population** - Characters now receive starting equipment from class and background
  - `DEFAULT_CLASS_EQUIPMENT` structure with sensible default loadouts for all 12 classes
  - Includes weapons, armor, and gear appropriate to each class
  - Background equipment also added (holy symbol, tools, clothing, etc.)
  - All items properly formatted for inventory system with weight, quantity, and notes
  - Equipment with `equipped: true` flag for armor and shields

- **Wild Shape Beast Form Reference** - Druids now get a comprehensive beast form reference in Features & Feats
  - `BEAST_FORMS` data structure with 50+ beasts from CR 0 to CR 6
  - Complete stat blocks: AC, HP, Speed, ability scores, skills, senses, attacks, traits
  - Organized by Challenge Rating for easy reference
  - Automatic filtering based on druid level and Circle of the Moon progression
  - **Standard Druid**: CR 1/4 at level 2, CR 1/2 at level 4, CR 1 at level 8 (no fly until 8, no swim until 4)
  - **Moon Druid**: CR 1 at level 2, up to CR 6 at level 18 (swim at 2, fly at 8)
  - Wild Shape reference automatically updates on level-up when new forms become available
  - Helper functions: `getWildShapeLimits()`, `getAvailableBeastForms()`, `formatWildShapeReference()`, `getWildShapeSummary()`

### Technical
- Added `CLASS_RESOURCES` and `getClassResources()` to [level-up-data.js](js/level-up-data.js)
- Added `DEFAULT_CLASS_WEAPONS`, `generateDefaultAttacks()`, `getCantripDamageDice()` to [level-up-data.js](js/level-up-data.js)
- Added `RACIAL_BASE_FEATURES` data structure (~1300 lines) to [level-up-data.js](js/level-up-data.js)
- Added `RACIAL_SPELLS` data structure with helper functions `getRacialSpells()` and `getRacialSpellsAtLevel()`
- Added `getFullRacialFeatures()`, `formatRacialFeaturesAsText()`, `getScalingFeatureValue()`, `getBaseRacialFeatures()` helpers
- Added `BACKGROUND_DATA` structure with all 13 PHB backgrounds and helper functions:
  - `getBackgroundData()`, `getBackgroundFeature()`, `getBackgroundEquipment()`
  - `getBackgroundProficiencies()`, `getBackgroundStartingGold()`, `formatBackgroundFeatureAsText()`
- Added `DEFAULT_CLASS_EQUIPMENT` structure with default loadouts for all 12 classes and helper functions:
  - `getClassEquipmentData()`, `getStartingEquipment()`, `getAllStartingEquipment()`
- Added `BEAST_FORMS` data structure (~800 lines) with 50+ beasts organized by CR from CR 0 to CR 6
- Added Wild Shape helper functions: `getWildShapeLimits()`, `compareCR()`, `getAvailableBeastForms()`, `formatBeastForm()`, `formatWildShapeReference()`, `getWildShapeSummary()`
- Added `gatherWildShapeReference()` to [character-creation-wizard.js](js/character-creation-wizard.js)
- Wired attack and resource generation into character creation in [character.js](js/character.js)
- Added `gatherRacialFeatures()`, `gatherRacialSpellData()`, `gatherBackgroundFeature()`, `gatherStartingEquipment()` to [character-creation-wizard.js](js/character-creation-wizard.js)
- Added starting equipment population to `fillFormFromWizardData()` in [character.js](js/character.js)
- Added spell tooltip helpers and UI to [character-creation-wizard.js](js/character-creation-wizard.js) and [level-up-system.js](js/level-up-system.js)
- Added resource auto-update logic to `applyLevelUp()` in [level-up-system.js](js/level-up-system.js)
- Added racial spell and feature handling to `applyLevelUp()` in [level-up-system.js](js/level-up-system.js)
- Added Wild Shape reference update logic to `applyLevelUp()` in [level-up-system.js](js/level-up-system.js)
- Fixed race string parsing to handle "Race (Subrace)" format throughout level-up system

---

## [1.11.10] - 2026-01-16
**Character Creation: Multi-Level Character Support Improvements**

### Added
- **Multi-Level HP Calculation** - Characters created above level 1 now properly calculate HP with choice of rolling or taking average
  - New HP method selection UI appears for characters created at level 2+
  - "Roll Hit Dice" option allows rolling for each level 2-N with full breakdown display
  - "Take Average (Recommended)" option calculates guaranteed HP using standard averages
  - Level 1 HP always uses maximum hit die + CON modifier (as per D&D rules)
  - HP rolls are tracked and displayed with per-level breakdown (e.g., "Level 2: 5 + 2 = 7 HP")
  - Validation ensures HP method is selected before proceeding

### Fixed
- **Hit Dice Scaling** - Hit dice now correctly scale with character level (e.g., "3d8" for a level 3 Wizard)
  - Previously all characters had "1d{hitDie}" regardless of starting level
  - Now properly set to "{level}d{hitDie}" for accurate hit dice tracking
- **Class Features Population** - Class features for levels 1-N are now automatically added to Features & Feats section
  - Gathers all class features from level 1 up to starting level from LevelUpData.CLASS_DATA
  - Includes subclass features when subclass is selected
  - Features formatted as markdown with level headers for easy reference
  - Example output: "**Level 1:** - Rage (2/day) - Unarmored Defense"
- **Subclass Bonus Spells** - Subclass-granted spells are now automatically added to spell list
  - Added comprehensive SUBCLASS_SPELLS data structure in level-up-data.js with 250+ subclass spells
  - **Cleric Domains**: All 11 domains with spells at levels 1, 3, 5, 7, 9 (Knowledge, Life, Light, Nature, Tempest, Trickery, War, Forge, Grave, Order, Peace, Twilight)
  - **Druid Circles**: All 10 Land terrains + Circle of Spores + Circle of Wildfire
  - **Paladin Oaths**: All 7 oaths with spells at levels 3, 5, 9, 13, 17 (Devotion, Ancients, Vengeance, Conquest, Redemption, Glory, Watchers)
  - **Warlock Patrons**: All 6 patrons with expanded spell lists at levels 1, 3, 5, 7, 9 (Archfey, Fiend, Great Old One, Celestial, Hexblade, Fathomless)
  - Subclass spells marked as "always prepared" and automatically added during character creation
  - Helper functions: `getSubclassSpells()` and `getSubclassSpellsByLevel()`

### Notes
- See [docs/ENHANCEMENT_ROADMAP.md](docs/ENHANCEMENT_ROADMAP.md) for planned enhancements including prepared spell validation, racial features, background features, equipment, attacks, resource trackers, and Wild Shape logic
- Prepared spell foundation added (CLASS_DATA flags, helper functions) - UI implementation pending

---

## [1.11.9] - 2026-01-15
**Character Creation: ASI/Feat Support, Complete Subclass Library & Prepared Spellcaster Improvements**

### Added
- **ASI/Feat for Higher-Level Characters** - Characters created at level 4+ now properly receive all earned Ability Score Improvements or Feats
  - New "Step 6: Ability Score Improvements" in character creation wizard with interactive UI
  - ASI calculation based on class and starting level (Fighters get extras at 6, 14; Rogues at 10)
  - Choice between +2 ASI (split +2/+0 or +1/+1) or feat selection with live preview
  - Feat descriptions displayed on selection with full 40+ feat library access
  - ASI bonuses automatically applied to ability scores (respects 20 cap)
- **Complete Subclass Library** - Added 66 new subclasses from Xanathar's Guide, Tasha's Cauldron, and other official sources:
  - **Artificer** (NEW CLASS): Alchemist, Armorer, Artillerist, Battle Smith
  - **Barbarian** (+5): Ancestral Guardian, Storm Herald, Zealot, Beast, Wild Magic
  - **Bard** (+4): Glamour, Swords, Whispers, Creation, Eloquence
  - **Cleric** (+5): Forge Domain, Grave Domain, Order Domain, Peace Domain, Twilight Domain
  - **Druid** (+5): Dreams, Shepherd, Spores, **Circle of Stars**, Wildfire
  - **Fighter** (+6): Arcane Archer, Cavalier, Samurai, Psi Warrior, Rune Knight, Echo Knight
  - **Monk** (+6): Sun Soul, Long Death, Kensei, Mercy, Astral Self, Ascendant Dragon
  - **Paladin** (+5): Conquest, Redemption, Glory, Watchers, Crown
  - **Ranger** (+6): Gloom Stalker, Horizon Walker, Monster Slayer, Fey Wanderer, Swarmkeeper, Drakewarden
  - **Rogue** (+6): Inquisitive, Mastermind, Scout, Swashbuckler, Phantom, Soulknife
  - **Sorcerer** (+5): Divine Soul, Shadow Magic, Storm Sorcery, Aberrant Mind, Clockwork Soul
  - **Warlock** (+5): Celestial, Hexblade, Fathomless, Genie, Undead
  - **Wizard** (+3): Bladesinging, War Magic, Order of Scribes
- **Subclass Coverage** - System now includes 114 total subclasses (up from 48), covering ~95% of official D&D 5e content
- **Prepared Spellcaster Spell Selection** - Cleric, Druid, Paladin, and Artificer now receive full spell selection interface in character creation and level-up
  - Automatic calculation of preparable spells based on casting stat + level (WIS for Cleric/Druid, CHA for Paladin, INT for Artificer)
  - Full class spell list access with search and filter capabilities
  - Initial spell preparation during character creation
  - Re-preparation interface during level-up with updated spell counts
  - Helpful reminders that prepared spells can be changed after each long rest
  - Proper cantrip selection for each class (Cleric: 3, Druid: 2, Artificer: 2, Paladin: 0)

### Technical
- Added `getASICount()` and `getASILevels()` helper functions to [level-up-data.js:2243-2280](level-up-data.js#L2243-L2280)
- Created `renderASISelections()`, `setupASIChoiceListeners()`, and related UI functions in [character-creation-wizard.js:1700-1903](character-creation-wizard.js#L1700-L1903)
- Updated `applyRacialBonuses()` to apply ASI choices to stats in [character-creation-wizard.js:2041-2060](character-creation-wizard.js#L2041-L2060)
- Renumbered wizard steps 6-11 (previously 6-10) to accommodate new ASI step
- Added Artificer to SUBCLASS_DATA with all 4 specialist archetypes in [level-up-data.js:1583-1628](level-up-data.js#L1583-L1628)
- Expanded all class subclass options across [level-up-data.js:494-1628](level-up-data.js#L494-L1628)
- Updated prepared caster handling in [character-creation-wizard.js:1272-1339](character-creation-wizard.js#L1272-L1339) to show spell selection UI
- Modified `getSpellLearningRules()` in [level-up-data.js:2335-2408](level-up-data.js#L2335-L2408) to calculate prepared spell counts
- Enhanced `renderSpellLearningStep()` in [level-up-system.js:451-573](level-up-system.js#L451-L573) with prepared caster UI
- Updated `getLevelUpChanges()` to pass character data for spell preparation calculations

---

## [1.11.8] - 2026-01-12
**Character Sheet Export: Multi-Page PDFs & Complete Data**

### Added
- **Multi-Page PDF Export** - PDFs now automatically span multiple pages instead of cramping content onto one page
- **Full Page Width** - Exports now use full A4 page width (210mm) with proper padding for better readability
- **Structured Inventory Export** - Detailed inventory items now export with:
  - Total weight calculation
  - Items grouped by "Equipped" vs "Other Items"
  - Quantity, weight, equipped status, and attunement displayed
  - Individual item notes
- **Additional Data Fields** - Now exports previously missing fields:
  - Conditions & concentration status
  - Table notes
  - Extra notes
  - Roleplay notes
- **Write-In Spaces** - Added blank lined sections for handwritten notes when printing:
  - Additional Equipment Notes (3 lines)
  - Additional Conditions/Status Notes (2 lines)
  - Session Notes / Additional Information (5 lines)

### Changed
- PDF generation now splits content across pages when height exceeds one page
- All three export formats (PDF, Word, PNG) include comprehensive character data

### Technical
- Modified PDF generation in [js/character-sheet-export.js:49-101](js/character-sheet-export.js#L49-L101) to use canvas slicing for multi-page support
- Added `generateInventoryHTML()` helper method at [js/character-sheet-export.js:908-962](js/character-sheet-export.js#L908-L962)
- Added `generateConditionsHTML()` helper method at [js/character-sheet-export.js:980-1008](js/character-sheet-export.js#L980-L1008)
- Changed container width from `max-width: 850px` to `width: 210mm` in [js/character-sheet-export.js:466](js/character-sheet-export.js#L466)

---

## [1.11.7] - 2026-01-12
**Character Manager: Level-Up System Fixes**

### Fixed
- **Character Creation Above Level 1** - Fixed "Level-up data not loaded" error when creating characters at level 3+ through the character creation wizard
- **Hit Dice Update on Level-Up** - Total hit dice now properly updates to match character level (e.g., 5d8 for level 5 Wizard)
- **Hit Dice Remaining** - Remaining hit dice pool now increases by +1 on level-up, correctly tracking available hit dice for short rests
- **Spell Slots Replenishment** - Current spell slots now properly replenish to full when leveling up (previously only max slots were updated)
- **Pact Slots Reset** - Warlock pact magic slots now reset to 0 used when leveling up

### Technical
- Changed `LevelUpData` from local const to `window.LevelUpData` for global accessibility in [js/level-up-data.js:7](js/level-up-data.js#L7)
- Modified `applyLevelUp()` in [js/level-up-system.js:1657-1702](js/level-up-system.js#L1657-L1702)
- Hit dice calculation uses class data to determine proper die size (d6, d8, d10, d12)
- Spell slots now use correct data structure: `spellSlots[level] = { max: X, used: 0 }`

---

## [1.11.6] - 2026-01-07
**Journal: Comprehensive UX Improvements**

### Added
- **Last Edited Timestamp** - File list now displays both "Created" and "Last edited" timestamps, with last edited updating on every save
- **Unsaved Changes Protection** - Confirmation dialog appears when navigating away from entries with unsaved changes
- **Visual Unsaved Indicator** - Save button turns yellow/warning color with asterisk (*) when content has unsaved changes
- **Sort Options** - Dropdown selector with 6 sort modes:
  - Last Modified (Newest/Oldest)
  - Created (Newest/Oldest)
  - Name (A-Z/Z-A)
- **Always-Visible Content Preview** - All entries show first 100 characters of content; search results show context around matches with highlighting
- **Word & Character Count** - Real-time counter at bottom of editor updates as you type
- **Copy to Clipboard** - New export option to quickly copy entry content as plain text
- **Empty State Illustrations** - Visual icons and helpful messages for "no entries" and "no search results" states

### Enhanced
- **Toolbar Visual Separation** - Added border and background color to Quill toolbar for better visual hierarchy
- **Improved Hover States** - File list items have more pronounced hover effects with subtle translation animation
- **Active File Styling** - Active entries now have background color tint and increased font weight (not just border)
- **Image Resize UX** - Images automatically show resize handles immediately after insertion (no click required)
- **Export Modal Flow** - Export buttons trigger download/copy and then close modal (instead of closing first)

### Technical
- **IndexedDB Schema** - Added `lastModified` index to track edit timestamps separately from creation time
- **Change Detection** - Content tracking with `hasUnsavedChanges` flag and `lastSavedContent` comparison
- **Clipboard API** - Native clipboard support for text copy with fallback error handling

---

## [1.11.5] - 2025-12-26
**Battle Map → Initiative Tracker Integration & Journal Import**

### Added
- **Battle Map to Initiative Tracker** - Right-click context menu "Add to Initiative" option on tokens with smart data collection:
  - **Generic Name Detection** - Automatically prompts for specific names when token has generic labels (goblin, paladin, beast, etc.) with 40+ recognized generic creature types
  - **Data Collection Flow** - Sequential prompts gather missing Max HP, Current HP, AC (default 10), and Initiative roll (default 0)
  - **Smart Data Reuse** - Pulls existing name and HP values from token if already set
  - **Auto-Import & Submit** - Automatically opens Initiative Tracker (or navigates if popup blocked), populates form, and submits character
  - **Toast Feedback** - Visual confirmation with "✨ Added [Character Name] from Battle Map!" notification
- **Journal Import System** - Upload button in Journal sidebar imports previously exported files:
  - **TXT Import** - Plain text files converted to HTML with proper paragraph and line break formatting
  - **Markdown Import** - Full markdown parsing supporting headers (H1-H3), bold, italic, links, code blocks, inline code, ordered/unordered lists
  - **Smart Naming** - Imported entries automatically named from filename (extension removed)
  - **Auto-Loading** - Imported entry immediately loads in editor for review/editing
  - **Format Detection** - Automatic file type detection with user-friendly warnings for unsupported formats (DOCX/PDF)

### Enhanced
- **Battle Map Context Menu** - Streamlined integration between battlemap tokens and combat tracker
- **Initiative Tracker Auto-Import** - Works with or without `#autoimport` hash, checks localStorage on every page load for pending imports
- **Cross-Tool Workflow** - Seamless token → initiative tracker flow with automatic form population and submission

### Technical
- **battlemap.html** - Added `addTokenToInitiativeTracker()` function with generic name array and data collection prompts
- **js/initiative.js** - Enhanced `checkBattleMapImport()` to work without hash requirement, auto-submit form with toast notification
- **journal.html** - Added `handleFileImport()`, `readTextFile()`, and `convertMarkdownToHtml()` functions for file import processing
- **Import Support** - File types: .txt, .md, .markdown with plans for .docx and .pdf in future releases

---

## [1.11.4] - 2025-12-25
**Journal: Export System (Word/PDF/TXT/Markdown)**

### Added
- **Multi-Format Export** - Export individual journal entries to Word (.docx), PDF, TXT, or Markdown (.md) formats
- **Bulk Export Modal** - Select multiple entries with checkboxes, search filtering, and select all/none controls
- **Export Options:**
  - **Single Entry Export** - "Export" button on each journal entry with format selection modal
  - **Bulk Export** - Blue download icon in sidebar opens bulk selection interface with 0-N entry selection
  - **Combined File Export** - Option to merge multiple entries into single document (Word, PDF, Markdown, TXT)
  - **Separate Files Export** - Export each selected entry as individual file with 300ms delay to prevent browser blocking
- **Format-Specific Features:**
  - **TXT Export** - Plain text with entry title underlines and clean formatting
  - **Markdown Export** - Converts Quill HTML to Markdown syntax (headers, bold, italic, strikethrough, links, lists, images)
  - **Word Export** - Uses docx.js library to create .docx files with formatted text, headings, and paragraph structure
  - **PDF Export** - Uses jsPDF library to generate PDF documents with title and body text

### Enhanced
- **Search Integration** - Bulk export modal includes same search functionality as main sidebar (filters by entry name and content)
- **Selection Persistence** - Selected entries persist during search filtering for intuitive multi-select workflow
- **Visual Feedback** - Selection counter shows "N selected" with real-time updates

### Technical
- **New file:** `js/journal-export.js` - Separate module to avoid conflicts with Quill editor
- **External libraries:** jsPDF (2.5.1) and docx.js (8.5.0) loaded via CDN
- **Export methods:** `handleExport()` for single entries, `handleBulkExport()` for separate files, `handleBulkExportCombined()` for merged documents

---

## [1.11.3] - 2025-12-25
**Journal: Search Highlighting & Content Preview**

### Added
- **Search Text Highlighting** - Search terms are highlighted in yellow in entry names when they match
- **Content Preview Snippets** - When search terms appear in entry body, displays contextual excerpt (50 characters before and after match) with highlighted search term
- **Visual Search Feedback** - Yellow highlight badges make it easy to spot where search terms appear in titles and content

### Enhanced
- **Search Results Display** - More informative search results show both where the match occurs and surrounding context
- **User Experience** - Search functionality feels more complete with clear visual indicators of matches

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
- **Persistence Measurement Removed** - Recent measure system caused flicker. Attempted fixes using SVG, and fabric.js implementation. Feature removed until permanent solution can be found

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
