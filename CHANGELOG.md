Changelog
All notable changes to The DM's Toolbox are documented here.
The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.


1.10.0 - 2025-12-12
**Character Manager: Level-Up System**

- **Added**

  - **Complete D&D 5e Level-Up System**
    - Step-by-step wizard interface for leveling characters from 1-20
    - Supports all 12 PHB core classes (Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard)
    - Comprehensive data files with class progression tables, spell slots, and features

  - **HP Management**
    - Choice between rolling hit die or taking average HP gain
    - Automatic CON modifier calculation
    - Updates both max HP and current HP on level up

  - **Ability Score Improvements (ASI)**
    - Available at class-appropriate levels (e.g., Fighter at 4, 6, 8, etc.)
    - Standard ASI options: +2 to one ability, or +1 to two abilities
    - Ability score cap enforcement (max 20)
    - Validation to ensure exactly +2 total increase

  - **Feat System**
    - 40+ official D&D 5e feats from Player's Handbook
    - Prerequisite checking (ability scores, proficiencies, etc.)
    - Automatic ability score increases from feats (e.g., Resilient, Actor)
    - Complete feat descriptions and benefits
    - Organized categories: Combat, Defensive, Utility, Magic, and Mobility

  - **Spell Slot Progression**
    - Automatic spell slot updates for all caster classes
    - Separate Pact Magic tracking for Warlocks
    - Proper multiclass spell slot calculations
    - 1st through 9th level spell slot support

  - **Class Features Display**
    - Shows new features gained at each level
    - Automatic proficiency bonus updates
    - Feature descriptions appended to character notes

  - **Character Creation Wizard Integration**
    - Added Background field to Basic Information section
    - Fixed wizard completion to properly populate character sheet
    - Improved save/load synchronization

- **Fixed**

  - Character creation wizard now correctly fills out character sheet on completion
  - Level-up changes now properly save to IndexedDB
  - Fixed save/load order to ensure modified character data persists
  - Removed "+" prefix from number inputs to eliminate browser warnings
  - Background field now integrated throughout character save/load system

- **Technical**

  - New files: `js/level-up-data.js`, `js/level-up-system.js`
  - Documentation: `LEVEL_UP_SYSTEM.md`, `LEVEL_UP_TESTING.md`
  - Global API exports for character management functions
  - Improved getCurrentCharacter() integration with level-up system

1.9.3.1 - 2025-12-12
**Battle Map: Canvas Flicker Revert**

- **Fixed**

  - Battle Map: Reverted Rendering Change Introduced in 1.9.2

  - Reverted the Battle Map rendering behavior to the pre-1.9.2 implementation after 1.9.2 introduced a visual regression.

  - Fixes an issue where the canvas would briefly flash black for a couple      seconds when users moved tokens.

  - Token dragging now renders smoothly again with no black-frame flicker.

1.9.3 - 2025-12-12
Encounter Builder: DM Reference Export System

Added

**Encounter Builder: Enemy Stat Block Text Export**
- **Automatic Text File Generation**
  - Generates comprehensive DM reference file with all enemy stat blocks
  - Includes all data from the D&D 5e API: actions, reactions, special abilities, legendary actions
  - Formatted with clear sections and ASCII dividers for easy reading
  - Professional stat block layout with attack bonuses, save DCs, and damage dice
- **Export Prompt on Send to Tracker**
  - When clicking "Send to Initiative Tracker", user is prompted to download stat blocks
  - Confirm dialog explains the file includes all actions, reactions, and special abilities
  - Optional download - user can decline and proceed to tracker without file
  - Filename includes timestamp for organization (e.g., `encounter_statblocks_2025-12-12T14-30-45.txt`)
- **Complete Stat Block Details**
  - Each enemy shows: Name, Size, Type, CR, AC, HP, Speed
  - CR breakdown with offensive/defensive ratings
  - Special abilities with full descriptions
  - Actions with attack bonuses (+X to hit), save DCs, and damage notation
  - Reactions for tactical awareness
  - Legendary actions for boss encounters
  - Encounter summary with XP calculations and difficulty rating
- **DM Workflow Enhancement**
  - Eliminates need to manually copy stat blocks during combat
  - All enemy information in one text file for quick reference
  - DM can print or keep open on second screen
  - Saves time during session prep and improves combat flow

Changed

- "Send to Initiative Tracker" button now includes optional stat block export prompt
- Text file export function generates formatted plain text with encounter summary

1.9.2 - 2025-12-12
Quality-of-Life Enhancements: NPC Combat Stats, Tavern Patrons, Loot Quick Bundles, and Battle Map Integration

Added

**NPC Generator: Combat Stat Block System**
- **5-Tier Difficulty System**
  - Tier 1: Commoner (CR 0-1/8) - Weak, untrained individuals
  - Tier 2: Trained (CR 1/4-1) - Basic combat training
  - Tier 3: Veteran (CR 2-4) - Experienced fighters
  - Tier 4: Elite (CR 5-8) - Skilled warriors
  - Tier 5: Legendary (CR 9-15) - Master combatants
- **17 Combat Specialties**
  - Common Folk: Commoner, Laborer, Farmer, Merchant
  - Trained Fighters: Guard, Soldier, Scout, Thug, Bandit
  - Skilled Combatants: Veteran, Knight, Monk
  - Spellcasters: Mage, Priest
  - Elite/Legendary: Assassin, Champion, Archmage
- **Complete Stat Block Generation**
  - Auto-calculates HP (randomized within tier range)
  - Auto-calculates AC (randomized within tier range)
  - Auto-scales ability scores based on tier (+0/+2/+4/+6/+8 for tiers 1-5)
  - Calculates all ability modifiers (STR, DEX, CON, INT, WIS, CHA)
  - Includes speed (30 ft base, 40 ft for Scout/Monk, 25 ft for Knight)
  - Proficiency bonus by tier (+0 to +4)
  - Specialty-specific attacks and traits
- **Interactive Modal UI**
  - "Generate Stats" button on each NPC card
  - Modal with tier and specialty selection dropdowns
  - Live specialty description preview
  - One-click stat block generation with formatted D&D output
- **Copy Functionality**
  - Individual "Copy" button appears after stat block generation
  - Copies full NPC (description + voice + stats) to clipboard
  - Professional stat block formatting with ability scores and combat info

**Tavern Generator: Patron System**
- **Random Patron Generation**
  - Generates 3-5 patrons per tavern
  - "Patrons in the Common Room" section with individual patron cards
  - Toggle control: "Include patrons (3-5 NPCs)" checkbox in settings
- **27 Patron Types**
  - Variety includes: local regular, traveling merchant, off-duty guard, farmer, craftsperson, sellsword, pilgrim, gambler, scholar, miner, sailor, thief, hedge witch, bounty hunter, and more
- **22 Visual Quirks**
  - Distinctive features: missing a finger, scar across cheek, nervous twitch, tattoo, eye patch, gold tooth, limping, polishing coin, chewing pipe, fidgeting with cards, etc.
- **27 Activity Hooks**
  - Immediate engagement opportunities: looking for work, celebrating windfall, drowning sorrows, meeting someone secretly, seeking adventurers, playing dice, telling tall tales, eavesdropping, spreading news, etc.
- **Compact Card Layout**
  - Each patron shows: type/age/build, appearance quirk, and current activity
  - Grid display (3 columns on desktop, 2 on tablet, 1 on mobile)
  - Visual activity icon for quick identification

**Loot Generator: Quick Bundle Presets**
- **6 One-Click Loot Bundles**
  - **Pocket Loot** (~50 gp): Individual loot, coins + mundane items (5 items)
  - **Coin Pouch** (200-500 gp): Coins only bundle (budget mode)
  - **5 Gems** (~500 gp): Gem collection (5 items, 50-200 gp each)
  - **Potion Bundle** (3 potions): Minor magic consumables
  - **Scroll Bundle** (3 scrolls): Minor magic scrolls
  - **Boss Hoard** (~2000 gp): Full treasure pile with gems, coins, trade goods, and magic items (50 items, budget mode)
- **Auto-Configuration System**
  - Each bundle has pre-optimized settings (mode, loot type, count, budget, categories)
  - One click instantly generates loot without manual settings adjustment
  - Bypasses all dropdown/slider configuration
  - Settings remain visible for customization after generation
- **Visual Bundle Grid**
  - 2x3 grid layout with color-coded buttons
  - Icons for each bundle type (coin, cash-stack, gem, droplet, file-text, trophy)
  - Value estimates displayed below each button
  - Organized by use case: quick loot, valuables, consumables, boss rewards

**Battle Map: Token Combat Stats & Initiative Integration**
- **AC and Initiative Token Fields**
  - Added `ac` (Armor Class) field to token data structure
  - Added `initiative` (Initiative Bonus) field to token data structure
  - Both fields persist with map save/load
- **Context Menu: Set Stats**
  - New "⚔️ AC / Init" button in token context menu
  - Prompts for Armor Class and Initiative Bonus
  - Values stored on token and saved with session
- **Context Menu: Add to Initiative**
  - New "📊 Add to Initiative" button in token context menu
  - Auto-populates Initiative Tracker form with token data:
    - Name (from token label)
    - Max HP and Current HP (from token HP tracking)
    - AC (from token AC field)
    - Initiative roll (auto-rolled: 1d20 + initiative bonus)
  - Opens Initiative Tracker in new tab with form pre-filled
  - Visual feedback: Button highlights "✨ Add from Battle Map" for 3 seconds
  - Character type defaults to "Enemy" for tokens
- **localStorage Communication**
  - Battle Map stores token data in `dmtools.pendingInitiativeImport`
  - Initiative Tracker detects `#autoimport` hash and loads pending data
  - Non-destructive: Initiative Tracker preserves existing initiative list
  - Data cleared after successful import

**Name Generator: Favorites Persistence**
- **Status**: Already fully implemented (no changes needed)
- Favorites save to localStorage (`'ng-favs'`)
- Add/remove/copy functionality works correctly
- Persists across sessions and page refreshes

Changed

- NPC cards now include "Generate Stats" button and stat block display area
- NPC copy functionality updated to include combat stats when present
- Tavern generator output includes "Patrons in the Common Room" section when enabled
- Tavern settings include patron toggle checkbox
- Loot Generator UI includes Quick Bundles section at top of settings
- Battle Map token typedef expanded to include `ac` and `initiative` fields
- Battle Map save/load functions preserve AC and initiative data
- Initiative Tracker auto-imports tokens from Battle Map via hash navigation
- Context menu in Battle Map expanded with 2 new options (10 total buttons)

1.9.1 - 2025-12-12
Tavern Events & Rumors, Battle Map Data Safety, and Documentation Updates

Added

**Tavern/Inn Generator: Events & Rumors System**
- **Random Event Generator**
  - "What's Happening at the Tavern?" section with 1-2 random events per generation
  - 65+ unique tavern events: bard performances, arm-wrestling contests, mysterious strangers, burning dinners, dice games, political debates, singing patrons, etc.
  - Events provide immediate atmosphere and interaction opportunities
  - Visual presentation with activity icon and success-colored bullet points
- **Bartender Rumors**
  - "Rumors from the Bartender" section with 2-3 rumors per generation
  - 63+ unique bartender rumors: strange lights at old mill, missing caravans, shady mayor meetings, ancient coins, temple donations, vanishing horses, etc.
  - Rumors from trusted tavern keeper perspective
  - Visual presentation with cup icon and info-colored quote styling
- **Patron Rumors**
  - "Overheard from Patrons" section with 2-4 rumors per generation
  - 62+ unique patron rumors: giant creatures in mountains, Baron hiring adventurers, new cave systems, missing families, poaching, secret fighting rings, etc.
  - Rumors from gossip/hearsay perspective with varying reliability
  - Visual presentation with people icon and warning-colored quote styling
- **Integrated UI Controls**
  - "Include events & rumors" checkbox in generator controls
  - Events and rumors respect seeded RNG for reproducible results
  - Export/copy/download includes all events and rumors sections
  - Clear button properly resets events and rumors displays
- **Side Quest & Plot Hook Generation**
  - 190+ total rumor/event options provide endless side quest inspiration
  - Mix of immediate (events) and background (rumors) story hooks
  - Suitable for improvisation and session prep
  - Helps DMs create living, dynamic tavern atmospheres

**Battle Map Unsaved Changes Indicator**
- **Dirty Flag System**
  - Visual "Unsaved Changes" badge with warning icon next to Save Session button
  - Pulsing animation (opacity fade) draws attention to unsaved state
  - Badge automatically appears when map changes are made
  - Badge disappears after successful save operation
- **Comprehensive Change Detection**
  - Tracks fog painting, fog shape drag/resize, fog shape add/delete
  - Tracks token moves, adds, deletes, edits (HP, status, auras, vision cones, rotation, resize)
  - Tracks grid calibration, origin adjustments, size/color/alpha changes
  - Tracks map transform operations (scale, offset)
  - All keyboard shortcuts properly trigger dirty flag
  - All context menu operations properly trigger dirty flag
- **Browser Navigation Guard**
  - `beforeunload` event handler warns when leaving page with unsaved changes
  - Only warns if dirty flag is set (no false alarms)
  - Standard browser confirmation dialog prevents accidental data loss
  - Manual save model preserved (no aggressive autosave)
- **Professional UX Polish**
  - Clear visual feedback for unsaved state
  - Prevents #1 rage-quit scenario (losing hours of battle map setup)
  - Demonstrates data-safety thinking and user-focused design

**Documentation & Version Management**
- **README Version Reference Update**
  - Removed hardcoded version line "Last updated: 2025-12-09 (v1.8.5)"
  - Replaced with dynamic reference: "See CHANGELOG.md for the latest version and feature updates"
  - Eliminates maintenance burden of updating version in multiple places
  - Improves professionalism by providing single source of truth for versions
  - Prevents credibility issues from outdated version information

Changed

- Tavern generator output now includes Events and Rumors sections when checkbox enabled
- Tavern generator serialization includes events and rumors in exported/copied text
- README no longer contains hardcoded version number

1.9.0 - 2025-12-11
Shop-to-Character Inventory Integration & Battle Map Enhancements

Added

**Shop Generator → Character Inventory Integration**
- **Add to Character Inventory System**
  - "Add to Character" button on every shop item
  - Modal interface for selecting destination character from dropdown
  - Automatic data transfer: item name, description, use, price, and rarity
  - Customizable fields: quantity, weight per item, equipped status, attuned status
  - Optional additional notes field for player-specific information
  - Item details (description + use) automatically combined into notes field
  - Success confirmation message after adding item
- **Cross-Page Storage Integration**
  - IndexedDB/localStorage compatibility for character data access
  - Non-destructive append - existing inventory items preserved
  - Automatic inventory array initialization for characters without inventories
  - Supports both IndexedDB and localStorage fallback
- **Smart Item Data Mapping**
  - Shop item properties mapped to character inventory structure
  - Price information preserved but not stored in character inventory
  - Rarity badges transferred to character sheet
  - Stock quantities not transferred (shop-specific data)

**Battle Map Measurement Enhancements**
- **Multi-Shape Measurement Tools**
  - Shape selector dropdown with 3 options: Line, Cone, Circle
  - **Line measurement** (original): Straight-line distance measurement
  - **Cone measurement** (new): 90-degree cone from origin point pointing toward cursor
  - **Circle measurement** (new): Radius/AoE measurement with visual circle fill
  - Semi-transparent fills (20% opacity) with solid borders for all shapes
  - Shape-specific labels: "X ft cone", "X ft radius", "X ft (line)"
- **Aura Radius Auto-Adjustment**
  - Aura circles now automatically add 0.5 cells to user-specified radius
  - Accounts for token's own cell (aura extends from edge of token's cell, not center)
  - Example: 10 ft aura (2 cells) now correctly displays as 2 cells beyond token's space
  - User-facing values remain unchanged - adjustment is visual only
- **Right-Click Exit Functionality**
  - Right-click anywhere on canvas exits measurement mode
  - Clears active measurement and resets measurement toggle button
  - Prevents context menu from appearing during measurement
  - Intuitive cancel action for measurement tools

**Shop Generator UI Overhaul**
- **Modern Shop Card Design**
  - Elevated cards with subtle shadows and depth
  - Hover effects with border highlighting
  - Improved border radius and spacing
  - Better visual separation between shops
- **Enhanced Shop Headers**
  - Larger, bold shop type titles with icons
  - Settlement and markup info styled as metadata badges
  - Location and price icons for visual clarity
  - Cleaner hierarchy with flexbox layout
- **Shopkeeper Section Redesign**
  - Person icon with character info layout
  - Subtle background differentiation
  - Better typography and spacing
  - Enhanced visual interest
- **Table Improvements**
  - Uppercase column headers with cyan accent color
  - Letter-spacing and subtle background on headers
  - Row hover effects for interactivity
  - Stock displayed as badges for visual distinction
  - Item names bold for better scannability
  - Price shown in bold green, more prominent
  - Better cell padding and alignment
- **Action Button Refinements**
  - Icon-only buttons for cleaner appearance (full tooltips on hover)
  - Price displayed prominently next to action buttons
  - Improved button spacing and grouping
  - Column renamed from "Price" to "Actions" for clarity
- **Unique Items Styling**
  - Cyan accent color with left border accent
  - Subtle background highlight
  - Better padding and visual separation from main inventory
- **Responsive Design Enhancements**
  - Tablet breakpoint: Inline buttons with better wrapping
  - Mobile breakpoint: Full-width buttons with card layout
  - Improved spacing and sizing on all devices
  - Better label display on mobile (uppercase, cyan, with spacing)

Changed

- Shop item table columns reordered: Item (22%), Description (32%), Use (12%), Stock (8%), Actions (26%)
- Table header styling unified with cyan theme color (#8bd3ff)
- Stock column now center-aligned with badge styling
- Item names moved to separate line above rarity badge
- Description text muted for better visual hierarchy
- Buttons condensed to icon-only with tooltips
- Measurement shape persistence - shapes display while mouse button held, disappear on release
- Battle map aura visual calculation adjusted (+0.5 cells) without changing user input
- Shop cards now have consistent spacing and elevation

1.8.9 - 2025-12-10
Character Token Generation for Battle Map

Added

**Character to Battle Map Token System**
- **Token Generation & Export**
  - New "Send to Battle Map" button on character sheet
  - Generates circular tokens with character portraits using custom positioning
  - Automatic fallback to base token with character initials when no portrait exists
  - Token generation respects circular clipping (88% radius) to fit within decorative frames
  - Uses CharacterTokenFrame.png overlay for portrait tokens
  - Uses BaseToken.png with initials for characters without portraits

- **Interactive Token Preview Modal**
  - Live circular preview canvas (250x250px) shows exact token appearance
  - Zoom slider (0.5x to 3x) for adjusting portrait scale
  - Drag-to-pan functionality for repositioning portraits within the circle
  - Reset button to restore default zoom and position
  - Real-time preview updates as user adjusts settings
  - "Send to Battle Map" confirmation sends token with user-defined settings

- **Battle Map Integration**
  - Auto-import system detects pending character tokens on battle map load
  - Tokens appear at center of current view without affecting existing tokens
  - Preserves all existing token selections and positions
  - Non-disruptive append mode - existing map state remains unchanged
  - Status message confirms successful import

- **CORS Protection**
  - Upfront detection of URL-based portraits to prevent canvas tainting errors
  - Clear error messages explaining browser security restrictions
  - Recommends uploading image files instead of using URLs
  - Only base64-encoded (uploaded) images supported for token generation

Technical Details
- Canvas-based token generation with HTML5 Canvas API
- localStorage handoff between character sheet and battle map pages
- Token settings stored separately from character portrait settings
- Image loading with crossOrigin support for compatible sources
- Circular clipping optimization for clean frame fit



1.8.8 - 2025-12-10
Generator Integration & Loot Expansion

Added

**Name Generator Enhancements**
- **Expanded Race Support** (30+ races)
  - Added 16 new playable races with unique naming conventions
  - New races: Half-Orc, Hobgoblin, Kobold, Aarakocra, Tabaxi, Firbolg, Kenku, Triton, Goliath, Bugbear, Yuan-ti, Changeling, Warforged
  - Human cultural variants: Arabic, Asian (in addition to Latin and Norse)
  - Each race has culturally appropriate syllable patterns for authentic name generation
- **Organized Race Dropdown with Optgroups**
  - Races categorized into 4 logical groups: Common Races, Uncommon Races, Monstrous Races, Special Races
  - Improved UX with visual separation between race types
  - Consistent organization across Name Generator and NPC Generator
- **Race Presets for All New Races**
  - 16 new race preset configurations with appropriate syllable counts, gender leanings, and harshness/exoticness values
  - Race-specific suffixes for enhanced authenticity
  - Special handling for unique races (e.g., Tabaxi compound names, Warforged mechanical names)

**NPC Generator → Name Generator Integration**
- **Interactive Name Picker Modal**
  - "Generate Name" button on each NPC card
  - Modal displays 12 name options based on detected race
  - Race auto-detection from NPC description using pattern matching
  - Manual race override via dropdown selector
  - "Regenerate" button for fresh name options without closing modal
  - "Open Name Generator" button for advanced customization
- **Seamless Cross-Generator Communication**
  - URL parameter passing for race presets
  - localStorage handoff for bidirectional data flow
  - Selected race automatically applied in Name Generator when opened

**Tavern Generator → NPC Generator Integration**
- **Staff Expansion System**
  - "Generate Full NPC Details" button on each tavern staff member
  - Converts basic staff (role, description, voice, mannerism) into complete 8-field NPCs
  - Auto-generates: enhanced mannerisms, quirks, wants, avoids, and secrets
  - Modal preview with copy and "Open in NPC Gen" options
- **Cross-Generator Data Flow**
  - localStorage handoff system for tavern staff → NPC generator
  - URL parameters preserve context (from=tavern)
  - NPC Generator recognizes and displays tavern-sourced NPCs

**Shop Generator → Negotiate Price Mechanic**
- **Haggling System**
  - "Negotiate" button on each shop item
  - Modal displays Persuasion DC based on item rarity (Common: DC 12, Uncommon: DC 15, Rare: DC 18)
  - Price outcomes table:
    - Critical Success (Nat 20 or DC+10): 30% discount
    - Success by 5+ (DC+5): 20% discount
    - Success (DC): 10% discount
    - Failure (< DC): No discount
    - Critical Failure (Nat 1 or DC-10): +10% price increase (shopkeeper offended)
  - Visual color coding for success/failure tiers

**Initiative Tracker → Bulk HP Adjustment**
- **Mass Healing/Damage System**
  - "Bulk HP Adjust" button in initiative footer
  - Filter options: PCs only, Enemies only, or All characters
  - Action types: Heal, Damage, Full Heal
  - Single undo point for entire bulk operation
  - Use cases: Long rest healing, area-of-effect damage, mass healing spells
- **Smart HP Management**
  - Damage prioritizes temporary HP consumption
  - Healing automatically resets death saves
  - Full heal restores all characters to max HP

**Loot Generator Expansion**
- **Expanded Trade Goods Category** (6 → 14 items)
  - Added 8 new valuable trade items: barrel of aged wine, exotic tea leaves, rare herbs, coffee beans, fine tobacco, spider silk, rare pigments, exotic incense
  - Broader variety for merchant-focused campaigns
- **Expanded Gems & Art Category** (5 → 13 items)
  - Added 8 new art objects: ornate music box, jeweled hair comb, crystal prism, carved ivory cameo, gilded portrait frame, polished jade figurine, silver filigree locket, painted porcelain vase
  - More diverse treasure options for dragon hoards and noble estates
- **Massively Expanded Minor Magic Items** (8 → 47 items)
  - **Healing & Recovery (4 items)**: Tonic of Vigor, Salve of Mending, Restorative Tea, Vial of Clarity
  - **Combat & Defense (7 items)**: Smoke Charm, Oil of Edge, Warding Ribbon, Shield Charm, Thunderstone, Flash Powder, Tanglefoot Bag
  - **Movement & Utility (5 items)**: Feather Token, Boots of Springing, Potion of Water Breathing, Dust of Tracelessness, Feather Fall Token
  - **Social & Luck (4 items)**: Lucky Coin, Charm of Persuasion, Vial of Courage, Token of Truth
  - **Exploration (5 items)**: Guide's Pin, Wayfinder's Compass, Lens of Detection, Ear Trumpet of Listening, Dowsing Rod
  - **Knowledge & Magic (5 items)**: Scribe's Quill, Scholar's Monocle, Candle of Revealing, Chalk of Warding, Crystal of Light
  - **Tools & Craft (4 items)**: Hammer of Mending, Rope of Climbing, Thieves' Gloves, Bag of Endless Knots
  - **Nature & Animals (3 items)**: Beast Whistle, Druid's Seed, Weatherglass
  - **Ongoing Items (8 items)**: Everburning Torch, Self-Heating Mug, Cleaning Cloth, Compass of True North, Tankard of Purity, Prestidigitation Ring, Warming Cloak Clasp, Cooling Hat Pin
  - All items include clear mechanical effects, value ranges, and categorization (consumable/situational/ongoing)

Changed

- Name Generator dropdown structure upgraded from flat list to organized optgroups
- NPC cards now include name field with generation button
- Tavern staff cards include integration button for NPC expansion
- Shop item tables include negotiate button column
- Initiative tracker footer includes bulk HP adjustment controls
- Loot generator Minor Magic category expanded 6x for better variety

1.8.7 - 2025-12-09
Character Creation Wizard: Comprehensive Expansion

Added

- **Expanded Race Selection** (9 → 33+ races)
  - All Player's Handbook races: Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
  - Volo's Guide races (14): Aarakocra, Aasimar, Bugbear, Firbolg, Goblin, Goliath, Hobgoblin, Kenku, Kobold, Lizardfolk, Orc, Tabaxi, Triton, Yuan-ti Pureblood
  - Elemental races (4): Air/Earth/Fire/Water Genasi
  - Ravnica races (5): Centaur, Loxodon, Minotaur, Simic Hybrid, Vedalken
  - Theros races (2): Leonin, Satyr
  - Eberron races (4): Changeling, Kalashtar, Shifter, Warforged
  - Other races (3): Tortle, Locathah, Grung
  - Each race includes detailed description of traits and abilities

- **Subrace Support System**
  - Dynamic subrace dropdown appears when applicable race selected
  - **Elf subraces** (5): High Elf, Wood Elf, Dark Elf (Drow), Eladrin, Sea Elf
  - **Dwarf subraces** (3): Hill Dwarf, Mountain Dwarf, Duergar
  - **Halfling subraces** (3): Lightfoot, Stout, Ghostwise
  - **Gnome subraces** (3): Forest Gnome, Rock Gnome, Deep Gnome (Svirfneblin)
  - **Dragonborn ancestries** (10): All chromatic and metallic dragons with breath weapon details
  - **Tiefling bloodlines** (9): Asmodeus, Baalzebul, Dispater, Fierna, Glasya, Levistus, Mammon, Mephistopheles, Zariel
  - **Aasimar types** (3): Protector, Scourge, Fallen
  - **Shifter types** (4): Beasthide, Longtooth, Swiftstride, Wildhunt

- **Class Expansion** (12 → 13 classes)
  - Added Artificer (Eberron's magical inventor class)
  - Reorganized into logical groups: Martial Classes, Full Spellcasters, Half-Casters
  - Each class shows primary abilities (e.g., "Str/Con" for Barbarian)
  - Enhanced class descriptions with playstyle details

- **Background Selection Step** (Step 5)
  - 13 official D&D backgrounds with descriptions
  - Backgrounds: Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin
  - Each background grants 2 skill proficiencies automatically
  - Background features and special abilities described

- **Interactive Skill Proficiency Selection** (Step 6)
  - Dynamic skill picker based on class choice
  - Shows only available skills for selected class
  - Enforces correct number of selections (2-4 depending on class)
  - Prevents over-selection with smart checkbox limiting
  - Rogue gets 4 skills, Bard/Ranger get 3, most classes get 2
  - Visual feedback for skill selection progress

- **Automatic HP & Combat Stats Calculation** (Step 7)
  - **Hit Points**: Auto-calculated from class hit die + CON modifier
  - **Armor Class**: Class-appropriate armor options with accurate calculations
    - Light armor: AC + full DEX modifier
    - Medium armor: AC + DEX modifier (max +2)
    - Heavy armor: No DEX bonus
    - Unarmored Defense: Special calculations for Barbarian (10 + DEX + CON) and Monk (10 + DEX + WIS)
  - **Speed**: Race-based movement speed (25-40 ft, special speeds like Aarakocra flight)
  - **Proficiency Bonus**: Level-based calculation (+2 at level 1-4)
  - Armor selection based on class starting equipment options

- **Character Review & Summary** (Step 8)
  - Complete character summary before creation
  - Shows all choices: race, class, background, alignment
  - Displays ability scores, HP, AC, speed, proficiency bonus
  - Lists all selected skills (class + background)

- **Automatic Racial Ability Score Bonuses**
  - All 33+ races have correct ability score modifiers
  - Subrace bonuses automatically applied (e.g., High Elf +1 INT, Mountain Dwarf +2 STR)
  - HP recalculated after racial CON bonuses applied
  - Original base scores preserved, racial bonuses added transparently

- **Automatic Saving Throw Proficiencies**
  - Class-based saving throw proficiencies automatically set
  - All 13 classes have correct save proficiencies
  - Checkboxes auto-marked on character sheet

- **Complete Character Sheet Population**
  - **Basic info**: Name, player name, level, race (with subrace), class, background, alignment
  - **Ability scores**: All 6 abilities with racial bonuses applied
  - **Combat stats**: Max HP, current HP, AC, speed, hit dice
  - **Proficiencies**: Proficiency bonus, saving throws, skills (class + background)
  - **90% complete character** ready for immediate play

Changed

- Wizard steps expanded from 6 to 8 steps for comprehensive coverage
- Race descriptions now include all racial features and traits
- Class descriptions enhanced with hit die, primary abilities, and detailed playstyle info
- Ability score tips updated with all 13 classes
- Skills section converted from static recommendations to interactive selection
- Equipment step replaced with automated HP/AC calculation step
- Success message now shows detailed character summary with all calculated stats

1.8.6 - 2025-12-09
Character Manager: Mobile Optimization & Collapsible Sections

Added

- **Mobile Toast Notifications for Dice Rolls**
  - Roll results appear as toast notifications at top of screen on mobile devices (< 768px)
  - Color-coded toasts: green for critical hits (nat 20), red for critical failures (nat 1), gray for normal rolls
  - Auto-dismiss after 3 seconds
  - Displays roll description, dice rolled, modifiers, and total result
  - Eliminates need to scroll to roll history panel on mobile

- **Collapsible Card Sections**
  - All major character sheet sections now collapsible via tap/click on header
  - Animated chevron icons (down = expanded, right = collapsed) rotate smoothly
  - Visual feedback on header hover
  - Mobile hint text: "(tap to expand/collapse)" appears on mobile devices
  - Sections intelligently default: frequently-used sections expanded, others collapsed on mobile
  - Includes: Basic Information, Combat Snapshot, Currency, Death Saves, Resources & Rests, Ability Scores, Saving Throws, Skills, Portrait, Senses, Detailed Notes

- **Mobile-Specific Enhancements**
  - Smooth height transitions (0.25s) when expanding/collapsing sections
  - Scroll offset accounts for fixed navbar (80px scroll margin)
  - Toast container optimized for mobile screen widths
  - Portrait, Death Saves, and Detailed Notes start collapsed on mobile to reduce initial scrolling

Changed

- **Resources & Rests Section Reorganized**
  - Short Rest and Long Rest buttons moved from card header into card body
  - Buttons positioned at top-right of section with moon/moon-stars icons
  - Fixes collapse/expand functionality that was blocked by header buttons
  - Improved mobile layout and accessibility

Fixed

- Resources & Rests section now properly collapses/expands (buttons no longer interfere)
- Collapse icon rotation correctly syncs with section state on page load

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