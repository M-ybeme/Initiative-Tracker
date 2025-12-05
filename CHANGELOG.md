Changelog
All notable changes to The DM's Toolbox are documented here.
The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.



1.9.0 - 2025-12-05
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