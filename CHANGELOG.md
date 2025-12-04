Changelog
All notable changes to The DM's Toolbox are documented here.
The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.

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