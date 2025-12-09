Changelog
All notable changes to The DM's Toolbox are documented here.
The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.



1.8.5 - 2025-12-09
Character Manager: Structured Inventory System

Added

- **Structured Inventory Management**
  - Replaced simple text field with full inventory table system
  - Track item name, quantity, weight per item, equipped status, and attunement
  - Edit and delete buttons for each inventory item
  - Modal dialog for adding/editing items with validation
  - Optional notes field for item descriptions

- **Automatic Encumbrance Calculation**
  - Real-time weight tracking based on D&D 5e rules (STR × 15 carrying capacity)
  - Visual status indicators: Normal, Encumbered, Heavily Encumbered, Over Capacity
  - Color-coded badges (green/info/warning/danger) for quick reference
  - Displays total weight, carrying capacity, and encumbrance status
  - Auto-updates when strength score changes or inventory is modified

- **Inventory Display Features**
  - Equipped items shown with filled check icon, unequipped with empty circle
  - Attuned items marked with filled star icon, non-attuned with empty star
  - Total weight calculated per item (quantity × weight per item)
  - Responsive table layout with clear column headers

Changed

- Character data structure updated to include `inventoryItems` array (legacy `inventory` text field preserved for backward compatibility)
- Character load/save functions integrated with new inventory system
- Null-safe handling of legacy inventory field for characters without structured inventory

NPC Generator: Enhanced Physical Descriptions & Secrets

Added

- **Height Field to Physical Descriptions**
  - 12 height variations: very short, short, below average, average, above average, tall, very tall, unusually tall, compact, towering, diminutive, statuesque
  - Integrated into NPC description generation
  - Descriptions now include: age, height, build, hair, eyes, distinguishing features, attire, demeanor

- **NPC Secrets System** (42 unique secrets)
  - One secret automatically generated per NPC
  - Categories: Financial (debts, hidden wealth), Criminal connections (thieves' guild, blackmail), Hidden knowledge (secret passages, conspiracies, cures), Identity secrets (false identity, hidden family, nobility), Dark past (witnessed crimes, poisoning, theft)
  - Examples: "knows the location of a smuggler's cache", "is being blackmailed over a past indiscretion", "witnessed a shapeshifter replacing someone"
  - Secrets displayed in NPC cards and included in exports

Changed

- NPC descriptions enhanced from 2-element format (age, build) to 3-element format (age, height, build)
- NPC card structure updated to include Secret field
- Copy/download exports now include secret information

Note

- Voice and mannerism features were already implemented with comprehensive details (tempo, timbre, pitch, accent, delivery, and 2 mannerisms per NPC)

Shop Generator: Shopkeeper NPCs & Stock Management

Added

- **Auto-Generated Shopkeeper NPCs**
  - Name generation with 4 name pools: generic (20 names), exotic (10 names), humble (10 names), scholarly (5 titled names)
  - Personality system with 3 types weighted by probability:
    - **Fitting (70%)**: Perfect for their role (e.g., blacksmith: "gruff and practical", "has burn scars")
    - **Ironic (20%)**: Hilariously contradictory (e.g., blacksmith: "squeamish about violence despite making weapons")
    - **Wrong Field (10%)**: Clearly in wrong profession (e.g., blacksmith: "wanted to be a baker, makes weapon-shaped bread on the side")
  - 10+ shop types with 4 unique personality traits per type per category
  - Shopkeeper name and personality displayed prominently in each shop card

- **Limited Stock Quantities**
  - Stock amounts vary by item rarity and settlement size
  - **Rare items**: 1-3 in stock (always limited regardless of settlement)
  - **Uncommon items**: Settlement stock range (village: 5-8, town: 7-12, capital: 10-16)
  - **Common items**: Settlement range + 50% bonus for greater availability
  - Stock quantity displayed in dedicated table column

- **Settlement Size Affects Inventory**
  - Village: 5-8 base stock, higher prices (10-35% markup), scarcer rare items
  - Town: 7-12 base stock, balanced prices (−5% to +15%), moderate rare availability
  - Capital: 10-16 base stock, lower prices (−15% to +20%), broader rare selection
  - Stock ranges applied based on settlement selection in generator settings

Changed

- Shop card layout reorganized: header, shopkeeper section, then inventory table
- Table columns updated: Item (24%), Description (38%), Use (13%), Stock (12%), Price (13%)
- Copy/download functions updated to include shopkeeper information and stock quantities
- Export format: `Shopkeeper: [Name] - [Personality]` followed by item table with stock

1.8.4 - 2025-12-08
Loot Generator: Complete Feature Overhaul

Added

- **Hoard vs. Individual Loot Distinction**
  - Toggle between "Hoard" (large treasure piles) and "Individual" (pocket loot) modes
  - Individual loot generates ~10% of items/budget for single-creature drops
  - Automatic scaling adjustments based on loot type selection

- **Mundane Adventuring Items Category** (20 new items)
  - Essential gear: 50 ft. rope, torches (bundle of 5), bedroll, rations (1 week)
  - Light sources: candles (10), tinderbox, lantern (hooded), oil flask
  - Tools: grappling hook, crowbar, 10 ft. pole, chalk (10), iron spikes (10)
  - Camping: tent (2-person), backpack, shovel
  - Tactical: caltrops (bag of 20), chain (10 feet), fishing tackle, signal whistle
  - All items include proper weight, cost ranges, and condition descriptors

- **Monster-Specific Loot Templates** (9 monster types)
  - **Dragon**: Favors gems (2.0x), coins (1.8x), magic items; flavor: "scorched edges", "melted slightly"
  - **Lich**: Books (1.8x), gems (1.4x), magic (1.6x); flavor: "necromantic runes", "bone-white"
  - **Vampire**: Gems (1.6x), clothing (1.5x), coins (1.4x); flavor: "blood-stained", "aristocratic"
  - **Beholder**: Gems (1.7x), curios (1.5x), magic (1.8x); flavor: "alien geometry", "prismatic"
  - **Giant**: Food (1.5x), trade goods (1.4x), mundane items (1.3x); flavor: "oversized", "massive scale"
  - **Demon/Devil**: Gems (1.5x), magic (1.7x), curios (1.4x); flavor: "sulfurous", "infernal script"
  - **Fey Noble**: Curios (1.8x), gems (1.5x), magic (1.6x); flavor: "rainbow-hued", "moonlit"
  - **Aberration**: Curios (1.6x), writing (1.4x), magic (1.5x); flavor: "otherworldly", "mind-bending"
  - **Undead Horde**: Coins (1.3x), gems (1.2x), clothing (1.2x); flavor: "grave-touched", "centuries-old"
  - Monster type selection overrides hoard template for thematic consistency

- **Custom Loot Table Import System**
  - Import custom JSON loot tables via file picker
  - Tables can define custom categories, templates, and generation rules
  - Dropdown selector for active custom table
  - JSON format requires `name` field with optional `categories` and `template` objects
  - Multiple custom tables can be loaded in same session

- **Save/Load Preset System**
  - Save all current settings with custom preset name
  - Presets stored in browser localStorage for persistence
  - Saves: mode, loot type, count, budget, monster/template, all toggles, category selections
  - Load presets from dropdown selector with one click
  - Preset list auto-populates on page load

Changed

- Category weights system updated to include "Mundane Adventuring Items" (0.6 base weight)
- Template resolution now prioritizes monster type over hoard template
- Individual loot type applies 90% reduction to item count and budget
- UI reorganized with monster type selector above hoard template
- Custom table selection integrated into main settings panel

Encounter Builder: Stat Block Preview System

Added

- **Hover Tooltips on Monster Search**
  - Rich stat block previews appear when hovering over any monster in search results
  - Shows complete combat information: AC, HP, Speed, CR
  - Displays all special abilities with full descriptions
  - Shows all actions with attack bonuses (+X to hit), save DCs, and damage dice
  - Includes reactions and legendary actions with descriptions
  - Smart positioning prevents tooltips from going off-screen
  - Tooltips styled with dark theme and color-coded sections

- **Expandable Stat Blocks in Encounter Roster**
  - "Show Details" button for each monster in the encounter roster
  - Quick action preview shows first 3 actions (e.g., "⚡ Multiattack, Bite, Claw")
  - Expandable section reveals complete stat block with organized sections
  - Attack information highlighted in blue: attack bonus, save DC, damage
  - All sections color-coded: Special Abilities, Actions, Reactions, Legendary Actions
  - Speed information displayed in expanded view

- **Enhanced SRD API Data Extraction**
  - Now fetches and displays special_abilities (Legendary Resistance, etc.)
  - Extracts legendary_actions for end-of-turn abilities
  - Includes reactions (Shield, Parry, etc.)
  - All data persists when monsters added to roster

Changed

- Monster search results now include preview-trigger class for hover functionality
- Roster display enhanced with action summary line showing top 3 actions
- Attack descriptions now show damage type and dice notation prominently
- Encounter Builder truly useful for combat prep with full stat visibility

1.8.3 - 2025-12-08
Battle Map Enhancement: Persistent Measurement Tools & Token Features

Added
- **Token Enhancement Features**
  - **Token labels** - Toggle persistent name labels above tokens
  - **HP tracking** - Visual HP bars with set/damage/heal/clear options
  - **Status conditions** - Add multiple status effects (Poisoned, Stunned, etc.) displayed above tokens
  - **Aura effects** - Customizable radius circles around tokens with adjustable color
  - **Vision cones** - Directional vision arcs with adjustable angle and range
  - **Compact context menu** - Streamlined 9-item menu with intelligent positioning
  - **Full persistence** - All token features save/load with the map

Changed

- Context menu now uses fixed positioning with overflow detection for better mobile support
- Token rendering optimized with three-pass system (auras → tokens → overlays) to prevent flickering

1.8.1 - 2025-12-05
Complete D&D 5e Spell Database Expansion

Added

- **Comprehensive Spell Database Expansion** - Added 120+ missing spells from PHB, Xanathar's Guide to Everything, and Tasha's Cauldron of Everything
  - **Total Spells: 432** (up from 312) - now one of the most complete D&D 5e spell databases
  - **All Xanathar's Cantrips (17 spells):** Booming Blade, Green-Flame Blade, Toll the Dead, Mind Sliver, Control Flames, Shape Water, Mold Earth, Gust, Create Bonfire, Frostbite, Infestation, Lightning Lure, Magic Stone, Primal Savagery, Sword Burst, Thunderclap, Word of Radiance
  - **All Paladin Smite Spells (6/6 complete):** Searing Smite, Thunderous Smite, Wrathful Smite, Branding Smite, Staggering Smite, Banishing Smite
  - **All Tasha's Summon Spells (10/10 complete):** Summon Beast, Summon Fey, Summon Elemental, Summon Construct, Summon Celestial, Summon Aberration, Summon Fiend, Summon Shadowspawn, Summon Undead, Summon Draconic Spirit
  - **Essential Warlock Spells (22 spells):** Hex, Armor of Agathys, Arms of Hadar, Hunger of Hadar, Witch Bolt, Cause Fear, Crown of Madness, Shadow Blade, Enemies Abound, Synaptic Static, Soul Cage, Blade of Disaster, and more
  - **Critical Ranger Combat Spells (12 spells):** Zephyr Strike, Hail of Thorns, Lightning Arrow, Steel Wind Strike, Swift Quiver, Healing Spirit, Conjure Woodland Beings, Guardian of Nature, and more
  - **Artificer Utility Spells (15 spells):** Identify, Absorb Elements, Catapult, Snare, Tasha's Caustic Brew, Thorn Whip, and more
  - **Popular Xanathar's Spells (28 spells):** Shadow Blade, Dragon's Breath, Ice Knife, Life Transference, Mind Spike, Melf's Minute Meteors, Erupting Earth, Tidal Wave, Storm Sphere, Watery Sphere, Whirlwind, Investiture of Flame/Ice/Stone/Wind (all 4), Vitriolic Sphere, Warding Wind, Temple of the Gods, Bones of the Earth, Primordial Ward, Mighty Fortress, Abi-Dalzim's Horrid Wilting, and more
  - **Tasha's Signature Spells (10 spells):** Spirit Shroud, Tasha's Caustic Brew, Tasha's Mind Whip, Tasha's Otherworldly Guise, Intellect Fortress, Summon Draconic Spirit, Blade of Disaster, Dream of the Blue Veil
  - **Universal Utility Spells:** Invisibility, Identify, Absorb Elements, Snilloc's Snowball Swarm
- **Complete Class Spell Coverage** - All PHB classes now have comprehensive spell lists
  - Paladin: 100% Smite spell coverage (all 6 variants) + oath spells
  - Ranger: Complete combat and nature spell arsenal
  - Warlock: Full signature spell list including patron-specific options
  - Artificer: Complete utility and crafting spell collection
  - Druid/Wizard/Sorcerer/Cleric: Enhanced with Xanathar's elemental and utility spells
- **Modern D&D Content** - Spell database now includes popular post-PHB content
  - All Tasha's Cauldron of Everything summon spells (most popular summoning system)
  - Xanathar's Guide elemental cantrips and melee weapon cantrips
  - Modern damage types and mechanics (psychic, force, etc.)

Changed

- Spell database expanded from 312 to 432 spells (~138% increase)
- Database completeness improved from ~70% to ~95% for PHB/Xanathar's/Tasha's content
- All spells maintain consistent formatting with proper tags, concentration flags, and class lists
- Version bumped to 1.9.0 for major spell database expansion

Database Statistics

- **By Source Book:**
  - Player's Handbook (PHB): 100% complete
  - Xanathar's Guide to Everything: ~90% complete (45+ spells added)
  - Tasha's Cauldron of Everything: ~85% complete (18+ spells added)
- **By Spell Level:**
  - Cantrips (0): 41 spells
  - 1st Level: 60+ spells
  - 2nd Level: 65+ spells
  - 3rd Level: 57+ spells
  - 4th Level: 42+ spells
  - 5th Level: 45+ spells
  - 6th Level: 38+ spells
  - 7th Level: 25+ spells
  - 8th Level: 19+ spells
  - 9th Level: 16+ spells
- **By Class (Primary Coverage):**
  - Wizard: 240+ spells
  - Sorcerer: 145+ spells
  - Bard: 120+ spells
  - Cleric: 118+ spells
  - Druid: 115+ spells
  - Warlock: 84+ spells (up from 62)
  - Paladin: 49+ spells (up from 37)
  - Ranger: 50+ spells (up from 38)
  - Artificer: 42+ spells (up from 27)

1.8.0 - 2025-12-05
Battle Map Fog Shapes Enhancement

Added

- **Interactive Resize Handles for Fog Shapes** - Rectangles and squares now have 8 drag handles (4 corners + 4 edges)
  - Click and drag corner handles to resize diagonally
  - Click and drag edge handles to resize horizontally or vertically
  - Minimum size constraints prevent shapes from becoming too small
  - Visual handles (8px blue squares) appear when shape is selected
- **Improved Fog Shape Rendering** - Shapes now render on top of tokens for better visibility
  - Previously shapes were only visible as outlines
  - New `drawFogShapes()` function renders filled shapes in world-space
  - Cover mode shapes display with selected color
  - Reveal mode shapes show as semi-transparent overlays
- **Manual Save System** - Replaced auto-save with manual saving to prevent performance issues
  - New "Save Session" button in Session accordion
  - Ctrl+S keyboard shortcut for quick saving
  - Saves no longer triggered on every grid adjustment or token movement
  - Prevents slowdown during continuous operations like dragging or fog painting
  - Auto-save retained for major discrete operations (loading maps, importing, etc.)

Changed

- Fog shapes now render after tokens in the draw order
- Help section updated with detailed fog shapes documentation
- Saving & Loading help section updated to reflect manual save system
- Version bumped to 1.8.0 for fog shapes feature enhancements

Fixed

- **Fog Shapes Visibility Issue** - Fog shapes now properly render on top layer instead of only showing outlines
  - Root cause: Shapes rendered to fog canvas (image-space) which drew underneath grid/tokens
  - Solution: Render filled shapes directly on main canvas in world-space after tokens
- **Performance During Grid Adjustments** - Removed excessive save() calls that caused slowdown
  - Eliminated auto-save from grid size, offset, color, and alpha adjustments
  - Removed auto-save from token/shape dragging operations
  - Removed auto-save from continuous fog painting

1.7.1 - 2025-12-04
Character Wizard Memory Leak Fix

Fixed

- **Memory Leak in Character Creation Wizard** - Event listeners no longer accumulate on repeated wizard navigation
  - Root cause: `onShow` callbacks attached new event listeners every time a step was displayed without removing old ones
  - Affected race selection, class selection, and ability score rolling handlers
  - Solution: Store listener references on elements and remove old listeners before attaching new ones
  - Prevents multiple handler executions and memory bloat when navigating back/forward through wizard

1.7.0 - 2025-12-04
IndexedDB Storage Implementation

Added

- **IndexedDB Storage System** - Replaced localStorage with IndexedDB for dramatically increased storage capacity
  - Character portraits and battle map images now use IndexedDB (50MB-1GB+ capacity vs 5-10MB localStorage limit)
  - Automatic migration from localStorage to IndexedDB on first load
  - Maintains localStorage backup when possible for dual storage redundancy
  - New `js/indexed-db-storage.js` module with centralized storage management
  - Real-time storage quota monitoring in character manager UI
- **Import Fallback Logic** - Smart error handling when importing large character files
  - When storage quota exceeded, prompts user to import without portraits
  - User can choose to proceed without images or cancel the import
  - Prevents data loss from quota errors during character import
- **Battle Map IndexedDB Integration** - Battle map sessions now use IndexedDB storage
  - Single session storage with automatic migration from localStorage
  - Supports large fog-of-war canvas images without quota issues
  - Backward compatible with existing localStorage battle map data

Changed

- Character manager now displays IndexedDB quota usage with color-coded warnings
- Storage operations converted to async/await pattern for better error handling
- Version bumped to 1.7.0 to reflect major storage architecture change
- Console logging improved with detailed migration status messages

Fixed

- **Storage Quota Exceeded Errors** - Large portrait images no longer cause "QuotaExceededError"
  - Root cause: Base64-encoded portrait images exceeded localStorage 5-10MB limit
  - Solution: IndexedDB provides 50MB-1GB+ capacity for storing image data
- Characters with large portraits can now be saved and imported successfully
- Battle map fog-of-war data no longer risks quota errors on complex maps

1.6.3 - 2025-12-04
Initiative Roller Addition

Added

- **Initiative Roll Button** - Added dice button next to Initiative Modifier field in Combat Snapshot
  - Rolls 1d20 + Initiative Modifier with character's name in roll description
  - Result appears in Roll History panel for easy reference
  - Button integrated into input group for clean UI layout

1.6.2 - 2025-12-04
Character Save Bug Fixes

Fixed

- **Portrait Data Persistence** - Character portraits now properly save when clicking "Save Character" button
  - Previously, uploaded portraits would be lost on save due to missing preservation logic
  - Portrait data (`portraitType`, `portraitData`, `portraitSettings`) now explicitly preserved during save
- **Wizard Integration** - Fixed undefined function error in Character Creation Wizard
  - Changed `recalcAbilityModsFromForm()` to correct function name `recalcDerivedFromForm()`
  - Wizard now properly calculates ability modifiers and derived stats
- **Save Throws Pill** - Fixed the tight spcing to allow for all items to be vieable in column form

1.6.1 - 2025-12-04
Advantage/Disadvantage Button Improvements

Added

- **Explicit Advantage/Disadvantage Buttons**
  - All skill rolls now have three-button layout: Green (Advantage) / White (Normal) / Red (Disadvantage)
  - All saving throw rolls now have three-button layout with same color scheme
  - No longer need to remember keyboard shortcuts (Shift/Ctrl) to roll with advantage/disadvantage
  - Buttons display dice icons with clear visual distinction
- **Mobile Optimization for Roll Buttons**
  - Button groups stay compact and don't wrap on mobile devices
  - Touch-friendly sizing with appropriate padding for small screens
  - Responsive font sizes (0.75rem on mobile, normal on desktop)
  - Save-pill containers allow flex-wrap for better mobile layout

Changed

- Roll button event handlers now prioritize `data-roll-type` attribute over keyboard modifiers
- Keyboard shortcuts (Shift=advantage, Ctrl=disadvantage) still work as fallback
- Skills table and saving throws UI updated with btn-group containers
- Mobile CSS enhanced to handle new three-button groups elegantly

Fixed

- Roll buttons maintain proper spacing and alignment on all screen sizes
- Button groups in save-pills and skill table cells display correctly on mobile
- Touch targets remain accessible (38x38px minimum) even with three buttons

1.6.0 - 2025-12-04
Enhanced Attack & Damage Roll System

Added

- **Separate Damage Roll Controls**
  - Independent roll buttons for to-hit and damage (no more auto-rolling damage)
  - Primary damage and secondary damage can be rolled separately
  - Color-coded button groups: Green (Advantage/Crit) / White (Normal) / Red (Disadvantage/Half)
- **Damage Type Labels**
  - Attack modal now includes separate fields for damage type (slashing, radiant, fire, etc.)
  - Primary damage type and secondary damage type fields
  - Damage types appear in roll history for clear identification
- **Advanced Damage Options**
  - Critical hit button doubles dice (not modifiers) for accurate 5e crit damage
  - Half damage button for resistance (automatically halves total and adds to roll history)
  - Separate controls for situational damage (Divine Smite, Sneak Attack, etc.)
- **Attack Roll Enhancements**
  - Three-button attack system: Advantage / Normal / Disadvantage
  - Visual feedback with green/white/red color coding
  - Helpful UI hint: "Green = Advantage/Crit · White = Normal · Red = Disadvantage/Half"

Changed

- Attack rolls no longer automatically roll damage - must be triggered separately
- Attack modal UI reorganized with dice notation separated from damage type
- Roll history now displays damage type labels (e.g., "Longsword - slashing (CRIT!)")
- Button layout updated to show three separate action rows per attack (To Hit / Primary Damage / Extra Damage)

Fixed

- Players can now choose when to apply situational damage like smites
- Critical hit damage properly doubles dice count without doubling static modifiers
- Resistance/half damage properly rounds down and tracks in roll history

1.5.7 - 2025-12-03
Character Creation Wizard & Mobile Optimization

Added

- **Character Creation Wizard**
  - 7-step guided walkthrough for creating D&D 5e characters
  - Interactive 4d6-drop-lowest ability score roller with visual dice display
  - Race selection with descriptions and ability bonuses (9 races)
  - Class selection with descriptions and hit die info (12 classes)
  - Beginner-friendly tips for ability score assignment by class
  - Skill proficiency guidance and alignment selection
  - Auto-populates character sheet with all entered data
  - Optional - can skip wizard for blank character sheet
- **Mobile-Responsive Design**
  - Comprehensive mobile CSS for phones (<768px), tablets (768-991px), and desktop
  - Collapsible roll history panel on mobile (tap header to expand/collapse)
  - Horizontal scrolling tabs with touch-friendly navigation
  - Touch-optimized buttons (38x38px minimum for all interactive elements)
  - Compact portrait (200px on mobile, 250px on tablet, 320px on desktop)
  - Landscape mobile optimizations for better horizontal space usage
  - Print-friendly styles (hides buttons/navigation, clean B&W layout)
  - Adaptive font sizes and spacing based on screen size

Changed

- Roll history starts collapsed on mobile screens to save vertical space
- Portrait heights scale responsively (200px/250px/320px by breakpoint)
- Tab navigation uses horizontal scroll on mobile instead of wrapping
- Form inputs and tables use smaller fonts on mobile (0.85rem)
- Touch devices get larger checkboxes (20-26px) for easier tapping
- Button groups automatically compress text and padding on small screens
- New character button now prompts user to choose wizard or blank sheet

Fixed

- Roll history panel no longer interferes with mobile scrolling
- All interactive elements meet minimum 38x38px touch target size
- Wizard modal properly scales to 95% width on small screens
- Window resize correctly toggles roll history collapse state

1.5.6 - 2025-12-03
Player-Facing Features & Interactive Character Sheets

Added

- **Comprehensive Dice Roller System**
  - Full dice notation parsing (d20, d4-d12, d100) with modifier support
  - Advantage/disadvantage rolls with visual display of both dice
  - Critical hit and fumble detection (natural 20s and 1s)
  - Roll history panel showing last 50 rolls with timestamps and descriptions
- **Interactive Roll Buttons**
  - Skill rolls: All 18 skills have roll buttons (Shift=advantage, Ctrl=disadvantage)
  - Save rolls: All 6 saving throws have roll buttons with advantage/disadvantage support
  - Attack rolls: Auto-roll to-hit and damage with one click
  - Death save rolls: Automatic tracking with nat 1/20 special handling
- **Combat Features**
  - HP adjustment buttons (Heal, Damage, Temp HP, Max HP) with quick presets
  - Inspiration checkbox in Combat Snapshot
  - Concentration tracker with automatic DC calculation (max(10, damage/2))
  - Death save automation (nat 20 = regain 1 HP, nat 1 = 2 failures)
- **Skill System Enhancements**
  - Expertise support (double proficiency) for all skills
  - Expertise auto-enables proficiency when checked
  - All passive scores (Perception, Investigation, Insight) now save/load correctly

Changed

- Roll history displays in a sticky panel with timestamps and clear visual formatting
- Concentration DC automatically prompts on damage taken while concentrating
- Expertise checkboxes added to all 18 skill rows in the skills table
- Saving throws UI updated to pill-style layout with integrated roll buttons
- Event handling uses delegation for better performance (single listener for all roll buttons)

Fixed

- Passive Perception, Investigation, and Insight now properly save and restore on character load
- All new fields (inspiration, concentration, expertise) persist correctly in character data
- Character save/load now includes all player-facing combat features

1.5.5 - 2025-12-03
Character Sheet Refinements & Spell/Attack Systems

Added

- Full spell slot tracking for levels 1–9 plus pact slot tracking, including long rest reset behavior.
- Attack list management with a modal editor for weapon attacks, spell attacks, save-based abilities, and custom damage strings.
- Short/Long Rest helpers that restore HP, temp HP, resources, and spell slots (including pact slots) according to rest type.
- Exhaustion tracker with rules text for each level (including extended OneD&D levels).
- Condition toggle buttons backed by a synced text field for quick at-a-glance status management.

Changed

- Character spell lists now persist normalized spell objects (name, level, school, tags, classes, body, prepared) instead of plain strings.
- Spell search upgraded to use the global spell library with matching across name/title, school, body text, tags, and classes, returning the top 25 results.
- Prepared status for spells is now first-class on the spell objects and reflected directly in the character's saved data.
- "Send to Initiative Tracker" from the Characters page now stages a dmtools.pendingImport payload using mode: "append" to preserve the existing initiative list while adding the selected PC.
- Spell slot rows auto-expand based on the highest level with available slots, keeping the UI compact at low levels and revealing higher-level rows as needed.

Fixed

- Legacy character imports now backfill missing structures (spellSlots, pactSlots, attacks, currency, deathSaves, exhaustion, portraitSettings) to align with the new character model.
- Passive scores (Perception, Investigation, Insight) stay in sync with ability scores, proficiency bonus, and skill bonuses when stats or proficiencies change.
- Save and skill bonuses recalculate correctly when fields are cleared, preventing stale or inconsistent modifiers.
- Spell list normalization correctly deduplicates entries by name (case-insensitive) and safely upgrades legacy string-only spell lists.

1.5.4 - 2025-11-29
Character Manager + Full Integration
Added

Character Manager (characters.html) with full character sheet system
Portrait system with upload, URL input, and zoom/pan framing editor
Spell list support with tag/class filtering and custom spell builder
Send to Initiative Tracker button with one-click export
DM-specific fields: party role, story hooks, at-the-table reminders, secrets
Tabbed interface: Action Notes, Spells, Inventory, Features, Background, Notes
Passive scores (Perception, Investigation, Insight) with special senses notes
Multi-character management with dropdown selector
Import/Export individual characters or full roster as JSON
Implemented full auto-calculation for abilities, saves, skills, and passive perception across the character sheet.

Changed

Export mode now uses mode: "append" to preserve existing combat state
Portrait editor modal with improved drag-to-reposition controls
Updated top-level toolbar for consistent "Send to Tracker" button style

Fixed

Error handling for malformed portraits and corrupted JSON imports
Spell normalization to align with global spell library
Character ID uniqueness across imports/exports
UI alignment corrections across Characters page


1.5.0 - 2025-11-25
Stability & Version Tracking
Added

Unique character ID generation to prevent accidental cross-updates
Console build stamps to all pages for version tracking
MIT License and repository metadata
Load guards to improve page stability

Changed

Refactored initiative.js and extracted rules/spells into dedicated data files
Improved active-turn behavior to persist through sorting, reordering, and manual list updates
Updated active turn styling for improved clarity on both DM and Player View

Fixed

Player View security: AC column now reliably hidden
Sensitive data properly suppressed across all modes
Cross-page sync issues for Player View toggle and shared state
Multiple minor UI polish issues across initiative and battlemap pages


1.4.0 - 2025-11-03 to 2025-11-21
Battle Map & Encounter Builder
Added

Battle Map MVP (battlemap.html)

Token placement system with drag-and-drop
Fog-of-war with reveal/cover modes
Scale controls and map state saving to LocalStorage
Pinch-zoom and mobile interaction support


Encounter Builder (encounterbuilder.html)

Quick encounter assembly
Export directly to Initiative Tracker


Ko-fi footer link and UI integration
Editable character names with smart duplicate numbering (Goblin, Goblin 2, etc.)

Changed

Updated navigation bar for consistency across pages
Improved mobile layout and responsiveness
Multiple upgrades to initiative and battle map pages

Fixed

0 HP / AC / Initiative logic edge cases
Mobile nav button logic
Various UI and layout issues


1.3.0 - 2025-10-22 to 2025-10-30
Spells & Rules Integration
Added

Spells and Rules reference integrated into Initiative Tracker
Saved Characters modal for better storage management
Character type color-coding for visual distinction
site.js for centralized shared page logic

Changed

Removed old accordion layout
Polished initiative UI with centered control buttons
Refined overall layout flow

Fixed

Name generator button issues
Minor bugs in Shop Generator and name generator pages


1.2.0 - 2025-10-10 to 2025-10-16
Death Saves & Temp HP
Added

Death Saves tracking system
Temp HP Undo support
Dice roller upgrades
Help menu refinements

Changed

Improved Concentration checks (now triggers correctly during the turn, not end of round)
Enhanced mobile navigation behavior

Fixed

Hamburger menu bugs
Various mobile navigation issues


1.1.0 - 2025-09-03 to 2025-10-09
Generators Expansion
Added

Generator tools globally across multiple pages
Loot bundles and preset controls
Improved name generator inputs and outputs

Changed

Enhanced initiative tracker with editable fields
Mobile-friendly improvements across tools
Updated footer and global styling

Fixed

Ongoing layout corrections across initiative tracker
Various generator consistency issues


1.0.0 - 2025-08-27 to 2025-09-02
Initial Release
Added

Name Generator (name.html)
Loot Generator (loot.html)
Shop Generator (shop.html)
Initial global layout and navbar
Foundation for initiative tracker integration
Netlify auto-deploy pipeline

Changed

Established project file structure


0.9.0 - 2025-02 to 2025-10
Legacy Project (Pre-Toolbox)
Note: This represents the original Initiative Tracker + Wiki project that served as the foundation for The DM's Toolbox 1.0 rewrite.
Added

Early Initiative Tracker prototype
Session Notes with save/load support
Import/export features
Saved characters and mobile-friendly character management
Concentration logic and dice rolls
Mobile card sorting

Fixed

Delete character bugs
Hamburger menu issues
Turn progression bugs
Navbar unification across pages


Legend

Added for new features
Changed for changes in existing functionality
Deprecated for soon-to-be removed features
Removed for now removed features
Fixed for any bug fixes
Security for vulnerability fixes