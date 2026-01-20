# The DM's Toolbox

**A comprehensive, browser-based suite of tools for tabletop RPG Game Masters**

Free alternative to Character Manager Tools + improvisation toolkit for DMs who wing it.

**Live Site:** https://dnddmtoolbox.netlify.app/

---

## 🎯 TL;DR

Free DM toolkit for improvisation at the table. No login, no tracking, works offline.

- **Initiative Tracker** - Combat management with HP/death saves/concentration/temp HP
- **Battle Map** - Lightweight VTT with fog of war, tokens, measurements, and HP tracking
- **Character Manager** - Full character sheets with 33+ races, 114 subclasses, 432 spells, multiclassing, level-up system, starting equipment selection
- **Encounter Builder** - Quick combat assembly with custom monsters and stat block export
- **Journal** - Rich text editor with image support, text wrapping, and IndexedDB storage
- **8 Generators** - NPCs, shops, taverns, loot, encounters, names (all with seeded RNG)

**Built by a DM who was tired of paywalls and subscriptions.**

All data stored locally in your browser using LocalStorage and IndexedDB. No accounts, no tracking, complete privacy, full offline capability after first load.

---

## ⚡ Quick Start (30 Seconds)

**Option 1: Run Combat**
1. Visit https://dnddmtoolbox.netlify.app/
2. Click "Encounter Builder" in nav
3. Search "goblin" → Add 6 to roster
4. Click "Send to Initiative Tracker"
5. Roll initiative - combat ready

**Option 2: Create a Character**
1. Click "Character Manager" in nav
2. Click "New Character" → Choose "Character Creation Wizard"
3. Follow 10-step guided setup (race, class, subclass, background, abilities, ASI/feats, equipment, skills, HP)
4. Done - 95%+ complete character ready to play (with equipment, attacks, features, and spells)

**Option 3: Improvise a Shop**
1. Click "Shop Generator" in nav
2. Select settlement (Village/Town/Capital) and shop type (Blacksmith, General Store, etc.)
3. Click "Generate Shop"
4. Read shopkeeper personality and inventory to players

**No login. No tutorial. Just works.**

---

## 💬 Why This Exists

> *"I wanted to play a Tabaxi Ranger, but Volo's Guide costs $30 on my perfered character manager. This tool gave me every race, every spell, completely free."*  
> — Player from my campaign

**Built by a DM who was tired of:**
- **$400+ to own all D&D content on some sites** - Races, classes, and spells locked behind paywalls
- **Subscription fatigue** - $2.99/month for "unlimited characters", $5.99/month for campaign tools
- **No offline access** - Can't use most dnd tools without internet
- **Privacy concerns** - Tools that track your gameplay and sell data
- **Improvisation gaps** - No quick NPC/shop/tavern generators for when players go off-script

**The DM's Toolbox solves all of this:**
- ✅ All 33+ races, 13 classes, 432 spells - **FREE**
- ✅ No accounts, no tracking, no data collection
- ✅ Works completely offline after first load
- ✅ Generators for instant improvisation at the table
- ✅ Cross-tool integration (Encounter Builder → Initiative Tracker with one click)

This is a personal hobby project created for GMs and players who want practical utility without overhead. A Ko‑fi link is available on the site for optional support, but **all features are completely free forever.**

---

## 🎲 Philosophy

The DM's Toolbox respects your table, your time, and your creativity.

- **Tools that assist, never railroad** — Generate content, don't dictate story
- **No accounts or tracking** — Your data stays in your browser, period
- **Free and complete** — No paywalls, feature locks, or subscriptions
- **Table-ready workflow** — Built for real sessions, not prep spreadsheets
- **Cross-tool integration** — Encounter Builder → Initiative Tracker → Battle Map with one click

---

## ✨ Core Tools

### 🎲 Initiative Tracker
**Combat management built for clarity and speed**

- **HP/AC tracking** with damage history and unlimited undo
- **Temporary HP** with priority damage consumption and undo support
- **Concentration tracking** with automatic DC calculation (max(10, damage÷2))
- **Death saves automation** - Nat 20 = regain 1 HP, Nat 1 = 2 failures
- **Bulk HP adjustment** - Heal/damage multiple characters at once (AoE spells, long rests)
- **Status effects** and condition tracking with visual indicators
- **Turn highlighting** with round counter and automatic progression
- **Player View mode** - TV/tablet display with hidden AC, notes, and secrets
- **Editable names** with smart duplicate numbering (Goblin, Goblin 2, etc.)
- **Drag-to-reorder** initiative with persistent turn tracking
- **Import/export** encounters as JSON
- **Saved characters** with unique IDs for instant reuse
- **Rules & Spells reference** integrated into interface
- **One-click integration** with Encounter Builder, Character Manager, and Battle Map

**Use case:** Run combat without juggling notebooks. Track 6 PCs + 12 enemies with damage history, death saves, and concentration—all visible at a glance. Display Player View on TV for transparency.

---

### 🗺️ Battle Map
**Lightweight VTT for maps, tokens, and fog of war**

**Map Management:**
- Upload custom maps (JPG/PNG) or use grid overlay on blank canvas
- Grid calibration with two-click distance measurement
- Map transform controls (scale, pan, rotation)
- Zoom and pan (mouse wheel, touch gestures)
- Pinch-zoom support for tablets
- Manual save system (Ctrl+S) to prevent performance issues during continuous operations

**Token System:**
- 24 built-in token presets (12 player class icons + 12 enemy creature types)
- Upload custom tokens (circular format with decorative frame overlay)
- Drag-and-drop placement with snap-to-grid toggle
- Token rotation with visual indicator
- **Persistent name labels** - Toggle labels above tokens
- **HP tracking** - Visual HP bars with set/damage/heal/clear options
- **Status conditions** - Add multiple effects (Poisoned, Stunned, Prone, etc.) displayed above tokens
- **Aura effects** - Customizable radius circles with adjustable color (auto-adjusts +0.5 cells from token edge)
- **Vision cones** - Directional vision arcs with adjustable angle (90°, 120°, etc.) and range
- **AC and Initiative** - Store combat stats directly on tokens
- **Add to Initiative Tracker** - Right-click token → "Add to Initiative" with smart data collection:
  - Detects generic names (goblin, paladin, beast) and prompts for specific names
  - Gathers missing HP, AC, and initiative values through sequential prompts
  - Automatically opens Initiative Tracker and submits character (works even with popup blockers)
  - Visual confirmation with toast notification

**Fog of War:**
- Reveal/cover modes with adjustable brush size
- Fog shapes (rectangles, squares, circles) with interactive resize handles
- Drag fog shapes to reposition, resize via 8 handles (4 corners + 4 edges)
- Cover mode (hide areas) and Reveal mode (transparent overlays)
- All fog state saves with session

**Measurement Tools:**
- **Quick measure** - Alt+drag (or "Measure" toggle) for instant distance measurement
  - Three shapes: Line, Cone (90°), Circle (radius)
  - Live distance display with grid cell count
  - Perfect for checking spell ranges and movement
- **Persistent measurements** - "Persistent" toggle creates permanent measurements that stay on the map
  - **Flicker-free rendering:** Shapes display without text by default for smooth pan/zoom performance
  - **Interactive selection:** Click any measurement to see distance details, text label, and resize handles
  - **Drag to move:** Reposition entire measurement by dragging when selected
  - **Resize by handles:** Drag start/end points to adjust measurement size
  - **Color coding:** Custom color picker enables visual identification (red for Fireball, blue for Spirit Guardians, etc.)
  - **Auto token adjustment:** Circle measurements automatically add +0.5 cells from edge (like aura) to account for token size
  - **Keyboard controls:** Delete key removes selected measurements, Escape deselects
  - **Session persistence:** All measurements save with battle map session to IndexedDB/localStorage
  - **Shape-only rendering:** Combines fog shape speed (no text flicker) with measure tool accuracy

**Performance Optimizations:**
- **Layered canvas architecture** - 4 separate layers (map, fog, tokens, UI) eliminate flickering
- **Dirty flag system** - Only redraws layers when needed (no continuous 60fps redraw)
- **Debounced resize** - Smooth viewport adjustments without lag
- **Event-driven rendering** - Dramatically improved performance vs v1.9.1

**Context Menu:**
- 10-button compact menu: Rotate, Delete, Edit Label, HP, Status, Aura, Vision, AC/Init, Add to Initiative, Edit Token
- Intelligent positioning prevents off-screen menus
- Mobile-friendly with touch support

**Session Persistence:**
- Save/load full session state (map, tokens, fog, measurements) to IndexedDB
- Unsaved changes indicator with browser navigation guard
- Export/import sessions as JSON for backup

**Use case:** Upload a dungeon map, calibrate the grid in two clicks, add tokens. Enable "Persistent" mode and create a red circle measurement for "Fireball AoE" (drag to 4 cells = 20 ft, auto-adjusts to 4.5 cells for token size). Add blue circle for "Spirit Guardians" (3 cells = 15 ft). Click measurements to see exact distances, drag to reposition, resize by handles. Measurements stay visible during pan/zoom without flicker. Reveal rooms as players explore using fog shapes. Right-click enemies to add to Initiative Tracker when combat starts. Works on desktop or tablet at the table.

---

### 📔 Journal
**Rich text editor with persistent storage for campaign notes, session logs, and world-building**

- **Rich Text Formatting** powered by Quill editor
  - Headers (H1, H2, H3), bold, italic, underline, strikethrough
  - Numbered and bulleted lists
  - Text and background colors
  - Text alignment options
  - Insert links with custom display text (hide long URLs)
  - Insert images from local files

- **Image Management**
  - Drag-to-resize images with 8 visual handles (corners and edges)
  - Text wrapping: float left or float right for book-like layouts
  - Images flow naturally with text
  - Alignment toolbar appears on image selection

- **File Management**
  - Sidebar showing all saved journal entries
  - Default file names use timestamp (e.g., "12/22/2025 02:30 PM")
  - Custom file names supported
  - Sort by newest first
  - Click to load any entry
  - Search entries by name or content with highlighting

- **Import System**
  - **Upload Button** - Yellow import button in sidebar for previously exported files
  - **Supported Formats:**
    - **TXT:** Plain text converted to HTML with proper line breaks and paragraphs
    - **Markdown (.md):** Full markdown parsing with headers, bold, italic, links, code blocks, lists
  - **Auto-Processing:**
    - Automatic file type detection and conversion
    - Entry named from filename (extension removed)
    - Imported entry immediately loaded in editor
    - Toast notification confirms successful import
  - **Future Support:** DOCX and PDF import planned (currently shows helpful warning)

- **Export System**
  - **Single Entry Export** - "Export" button with 4 format options:
    - **Word (.docx):** Formatted document with headings and text structure
    - **PDF:** Professional PDF with title and formatted content
    - **Markdown (.md):** Converts HTML to Markdown syntax (headers, bold, italic, links, lists, images)
    - **TXT:** Plain text with clean formatting and title underlines
  - **Bulk Export** - Blue download icon in sidebar opens bulk selection modal:
    - Search and filter entries (same search as main sidebar)
    - Select multiple entries with checkboxes
    - "Select All" / "Deselect All" buttons
    - Selection counter ("N selected")
    - Choose export format (TXT, Markdown, Word, PDF)
    - Export options: Single combined file OR separate files (one per entry)
  - **Format Conversion:**
    - Preserves formatting: headers, bold, italic, strikethrough, lists, links
    - Separate export module (`journal-export.js`) avoids Quill conflicts
    - Libraries: jsPDF for PDF, docx.js for Word documents
  - **Download Handling:**
    - Automatic 300ms delay between downloads prevents browser blocking
    - Success notifications with entry count
    - Sanitized filenames for cross-platform compatibility

- **Persistent Storage**
  - IndexedDB storage - all data saved in browser
  - Entries persist across sessions
  - Auto-save with Ctrl+S (Cmd+S on Mac)
  - Save/Delete with confirmation dialogs
  - Toast notifications for save/delete actions

- **User Interface**
  - Toolbar tooltips describe each formatting option
  - Active file highlighted in sidebar
  - Dark theme matching DM Toolbox aesthetic
  - Responsive layout with file list and editor side-by-side

**Use case:** Keep session notes with embedded maps and NPC portraits. Document world-building details with formatted text and images that flow naturally like in a book. Export individual entries or bulk-export all session notes to Word/PDF/Markdown/TXT for offline sharing. Import previously exported notes to restore or transfer between devices. Search for specific entries by keyword, select multiple, and export as a combined campaign journal. All data stays in your browser with no accounts or cloud sync required.

---

### 👤 Character Manager
**Full-featured character sheets + free alternative to Online Character Managers**

#### **Why Use This Instead of another tool?**

**Most character manager tools locks races and spells behind paywalls:**
- Tabaxi, Genasi, Firbolg? Pay $30 for Volo's Guide
- Artificer class? Pay $30 for Eberron book
- Full spell access? Pay $30 for PHB + $20 for Xanathar's + $20 for Tasha's
- More than 6 characters? Pay $2.99/month subscription
- **Total cost for full access: $400+**

**The DM's Toolbox gives you everything for FREE:**
- ✅ **33+ playable races** (PHB, Volo's, Xanathar's, Eberron, Ravnica, Theros) - **NO PAYWALL**
- ✅ **All 13 official classes** including Artificer - **NO PAYWALL**
- ✅ **432 spells** from PHB, Xanathar's, Tasha's - **NO PAYWALL**
- ✅ **Multiclassing** with automatic spell slot calculation (full/half/third caster rules)
- ✅ **Complete level-up system** (1-20) with ASI, feats, subclasses, spell learning
- ✅ **Works offline** - No internet required after first load
- ✅ **No tracking** - Your characters stay in your browser, not WotC's database

---

#### **Character Creation Wizard**
**Comprehensive 10-step guided character builder for beginners**

**Step 1: Basic Information**
- Name, player name, level (1-20), alignment

**Step 2: Race Selection**
- **33+ playable races:**
  - **Common:** Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
  - **Uncommon:** Aarakocra, Aasimar, Firbolg, Genasi (Air/Earth/Fire/Water), Goliath, Kenku, Tabaxi, Triton
  - **Monstrous:** Bugbear, Goblin, Hobgoblin, Kobold, Lizardfolk, Orc, Yuan-ti Pureblood
  - **Special:** Changeling, Kalashtar, Shifter, Warforged, Centaur, Loxodon, Minotaur, Leonin, Satyr, Tortle, Locathah, Grung
- **Dynamic subrace selection** when applicable:
  - **Elf:** High Elf, Wood Elf, Dark Elf (Drow), Eladrin, Sea Elf
  - **Dwarf:** Hill Dwarf, Mountain Dwarf, Duergar
  - **Halfling:** Lightfoot, Stout, Ghostwise
  - **Gnome:** Forest Gnome, Rock Gnome, Deep Gnome (Svirfneblin)
  - **Dragonborn:** 10 ancestries (Black, Blue, Brass, Bronze, Copper, Gold, Green, Red, Silver, White) with breath weapon details
  - **Tiefling:** 9 bloodlines (Asmodeus, Baalzebul, Dispater, Fierna, Glasya, Levistus, Mammon, Mephistopheles, Zariel)
  - **Aasimar:** Protector, Scourge, Fallen
  - **Shifter:** Beasthide, Longtooth, Swiftstride, Wildhunt
- Full descriptions of traits, abilities, and features for every race
- **High Elf Cantrip Selection** - High Elves choose one wizard cantrip during race selection

**Step 3: Class Selection**
- **All 13 official classes:**
  - **Martial:** Barbarian, Fighter, Monk, Rogue
  - **Full Spellcasters:** Bard, Cleric, Druid, Sorcerer, Warlock, Wizard
  - **Half-Casters:** Paladin, Ranger, Artificer
- Detailed descriptions with hit die, primary abilities, and playstyle

**Step 4: Subclass Selection** *(if applicable)*
- Automatically prompts at correct level for each class:
  - **Level 1:** Cleric (7 domains), Sorcerer (2 origins), Warlock (3 patrons)
  - **Level 2:** Wizard (8 schools), Druid (2 circles)
  - **Level 3:** Barbarian, Bard, Fighter, Monk, Paladin, Ranger, Rogue (2-3 subclasses each)
- Full subclass feature descriptions and previews
- **114 total subclasses** from PHB, Xanathar's Guide, Tasha's Cauldron, and other sources
- **Subclass Bonus Cantrips** - Automatic cantrip grants:
  - Nature Domain Cleric: Choose one druid cantrip
  - Light Domain Cleric: Light cantrip
  - Celestial Warlock: Light and Sacred Flame cantrips
  - Circle of Spores Druid: Chill Touch (at level 2)

**Step 5: Background Selection**
- **13 official backgrounds:** Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin
- Each background grants 2 skill proficiencies automatically
- Background features and abilities described
- Background equipment automatically included

**Step 6: Ability Scores**
- **4d6-drop-lowest roller** with visual dice display
- Manual entry option for point-buy or standard array
- **Automatic racial ability score bonuses** applied (all races + subraces)
- Class-specific tips for ability score priorities

**Step 7: Ability Score Improvements** *(for characters level 4+)*
- ASI calculation based on class and starting level
- Choice between +2 ASI (split +2/+0 or +1/+1) or feat selection
- **Searchable feat list** with 40+ official D&D 5e feats
- Feat tooltips showing description, benefits, and prerequisites
- ASI bonuses automatically applied (respects 20 cap)

**Step 8: Starting Equipment**
- **Choose Equipment** - PHB-style equipment packages
  - Multiple choice options per class (armor, weapons, packs)
  - "Any martial weapon", "Any simple weapon" dropdowns
  - Weapons automatically generate attack entries
- **Take Starting Gold** - Alternative gold-based option
  - Roll for gold based on class (2d4×10 to 5d4×10 gp)
  - Or take guaranteed average amount
- Background equipment always included regardless of choice

**Step 9: Skill Proficiencies**
- **Interactive skill selection** based on class
- Enforces correct number: Rogue (4), Bard/Ranger (3), most classes (2)
- Shows only available skills for selected class
- Real-time selection progress feedback
- Background skills already granted automatically

**Step 10: HP & Combat Stats**
- **Automatic calculations:**
  - **Hit Points:** Class hit die + CON modifier
  - **Armor Class:** Class-appropriate armor with accurate DEX bonuses
    - Light armor: AC + full DEX
    - Medium armor: AC + DEX (max +2)
    - Heavy armor: No DEX bonus
    - Unarmored Defense: Barbarian (10 + DEX + CON), Monk (10 + DEX + WIS)
  - **Speed:** Race-based (25-40 ft, special speeds like Aarakocra flight)
  - **Proficiency Bonus:** Level-based (+2 at level 1-4)
  - **Saving Throw Proficiencies:** Class-based (automatically checked)

**Review & Create**
- Complete character summary before creation
- Shows all choices, calculated stats, and proficiencies
- One-click character creation
- **Creates 95%+ complete character ready for immediate play**

**Automatic Character Population:**
- **Racial Features** - All 30+ races with base and subrace traits
- **Racial Spells** - Innate spellcasting (Tiefling, Aasimar, Drow, Genasi, etc.)
- **Class Features** - All features from level 1 to starting level
- **Subclass Features** - Subclass-specific abilities and spells
- **Class Resources** - Rage, Ki Points, Bardic Inspiration, etc.
- **Default Attacks** - Class-appropriate weapon and cantrip attacks
- **Wild Shape Reference** - Druid beast form compendium (50+ beasts)

---

#### **Complete Character Sheet System**

**Basic Information:**
- Name, player name, race (with subrace), class (with subclass), level, background, alignment
- XP tracking with next level calculator
- Portrait system with upload/URL input and zoom/pan framing editor
- Character notes and backstory

**Ability Scores & Skills:**
- All 6 ability scores with automatic modifier calculation
- **Interactive dice roller** - Click any skill/save to roll with advantage/disadvantage
- **Explicit roll buttons:** Green (Advantage) / White (Normal) / Red (Disadvantage)
- All 18 skills with proficiency and expertise checkboxes
- **Expertise support:** Double proficiency bonus (auto-enables proficiency)
- All 6 saving throws with proficiency tracking
- Passive scores: Perception, Investigation, Insight (auto-calculated)

**Combat System:**
- **HP tracking** with current/max/temporary HP
- **Damage/Heal buttons** with quick presets (5, 10, 15, full heal)
- **Inspiration** checkbox
- **Concentration tracker** with automatic DC calculation on damage
- **Death saves automation:**
  - Click to mark successes/failures
  - Nat 20 = regain 1 HP and reset saves
  - Nat 1 = 2 failures
  - Clear button for recovery
- **Exhaustion tracker** with rules text for each level (includes extended OneD&D levels)
- **Condition toggles:** 14 standard conditions (Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious)
- **Initiative roller** - Roll 1d20 + DEX mod directly from sheet

**Attack System:**
- **Attack list management** with modal editor
- Attack types: Melee Weapon, Ranged Weapon, Spell Attack, Save-based
- **Separate damage controls:**
  - To-hit button (Green = Advantage, White = Normal, Red = Disadvantage)
  - Primary damage button (Green = Crit/Double Dice, White = Normal, Red = Half Damage)
  - Secondary damage button (for Sneak Attack, Divine Smite, etc.)
- Damage type labels (slashing, radiant, fire, etc.)
- Attack notes for special properties
- **Accurate 5e damage calculation:**
  - Critical hits double dice (not modifiers)
  - Half damage for resistance (auto-rounds down)

**Spell System:**
- **432 spells** from PHB, Xanathar's Guide to Everything, Tasha's Cauldron of Everything
- **Spell slot tracking** (levels 1-9 + pact slots)
- **Prepared spell management** - Mark spells as prepared/unprepared
- Spell search with filters:
  - By spell level (cantrips through 9th level)
  - By school (Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation)
  - By tags (ritual, concentration, verbal, somatic, material components)
  - By class (Wizard, Sorcerer, Cleric, Druid, Bard, Warlock, Paladin, Ranger, Artificer)
  - Text search across name, school, body text
- **Custom spell builder** for homebrew spells
- Spell DC and spell attack bonus (auto-calculated from spellcasting ability)
- **Long rest button** restores all spell slots (including pact slots)

**Inventory System:**
- **Structured inventory management** with table view
- Track: Item name, quantity, weight per item, equipped status, attunement
- Edit and delete buttons for each item
- Optional notes field for item descriptions
- **Automatic encumbrance calculation** (D&D 5e rules: STR × 15 carrying capacity)
- **Visual status indicators:**
  - 🟢 **Normal** (under capacity)
  - 🔵 **Encumbered** (over capacity, speed -10 ft)
  - 🟡 **Heavily Encumbered** (over 2× capacity, speed -20 ft, disadvantage)
  - 🔴 **Over Capacity** (over 3× capacity, speed 0)
- Equipped items marked with check icon
- Attuned items marked with star icon
- Total weight calculated per item (quantity × weight per item)

**Currency Tracking:**
- Copper, Silver, Electrum, Gold, Platinum
- Total value calculator in gold pieces
- Quick add/subtract buttons

**Features & Traits:**
- Racial features with level-based scaling
- Class features organized by level
- Feat tracking
- Custom feature builder

**Resources & Rests:**
- **Short Rest button** - Restores hit dice usage, short rest abilities
- **Long Rest button** - Restores HP, spell slots, long rest abilities, resets exhaustion (if resting conditions met)
- Resource tracking for class abilities (Ki points, Rage uses, etc.)

**Roll History:**
- Last 50 rolls with timestamps
- Roll type (skill, save, attack, damage)
- Dice rolled, modifiers, and total result
- Color-coded: Green (nat 20), Red (nat 1), Gray (normal)
- Collapsible panel (starts collapsed on mobile)

**Combat/DM View Toggle:**
- **Combat View:** Compact combat card with essential stats
  - Character portrait in 3:4 aspect ratio
  - Quick stat boxes: AC, HP, Speed
  - Essential info: Class, Race, Level, Initiative modifier
  - Combat stats: Hit Dice, Proficiency Bonus, Passive Perception
  - All six saving throws
  - Conditions/status effects
  - All attacks with to-hit, damage, range
  - All spells organized by level (cantrips through 9th)
- **Full Sheet View:** Complete character sheet with all tabs
- Toggle switch in header with lightning bolt icon
- Preference persists across page reloads

**DM-Specific Fields:**
- Party role / table notes
- Story hooks & secrets
- At-the-table reminders
- Hidden from players, useful for DM prep

**Tabbed Interface:**
- **Actions:** Attack list, bonus actions, reactions
- **Spells:** Spell list with search/filter, prepared tracking
- **Inventory:** Structured inventory with encumbrance
- **Features:** Racial features, class features, feats
- **Background:** Background feature, bonds, ideals, flaws
- **Notes:** Backstory, appearance, personality, allies, enemies

---

#### **Level-Up System (Levels 1-20)**
**Complete D&D 5e progression for all 13 classes**

**Step-by-Step Wizard Interface:**

**Step 1: Choose Level-Up Path**
- Continue in existing class
- Add a new class (multiclass with prerequisite checking)

**Step 2: HP Increase**
- Roll hit die or take average
- Automatic CON modifier calculation
- Updates both max HP and current HP

**Step 3: Subclass Selection** *(if applicable level)*
- **Level 1:** Cleric, Sorcerer, Warlock
- **Level 2:** Wizard, Druid
- **Level 3:** Barbarian, Bard, Fighter, Monk, Paladin, Ranger, Rogue
- Full subclass data with feature descriptions
- Choice saved to character (won't re-prompt on future level-ups)

**Step 4: Ability Score Improvement** *(at ASI levels)*
- ASI available at class-appropriate levels:
  - Fighter: 4, 6, 8, 12, 14, 16, 19
  - Rogue: 4, 8, 10, 12, 16, 19
  - Others: 4, 8, 12, 16, 19
- **Standard ASI options:**
  - +2 to one ability score
  - +1 to two different ability scores
  - Ability score cap enforcement (max 20)
  - Validation ensures exactly +2 total increase
- **Feat selection with searchable list:**
  - 40+ official D&D 5e feats from PHB
  - **Searchable interface** - Filter feats by name in real-time
  - **Feat tooltips** - Hover for full description, benefits, and prerequisites
  - Prerequisite checking (ability scores, proficiencies)
  - Automatic ability score increases from feats (Resilient, Actor, etc.)
  - Organized categories: Combat, Defensive, Utility, Magic, Mobility

**Step 5: Spell Learning** *(for spellcasters)*
- **Class-specific rules:**
  - **Wizard:** Learns 2 spells per level, no swaps
  - **Bard, Sorcerer, Warlock:** Learn 1 spell, can swap 1 existing spell
  - **Paladin, Ranger:** Start at level 2, learn 1 spell with swap support
  - **Cleric, Druid:** Prepared casters (no spell learning step)
- **Spell selection UI:**
  - Filters by spell level (only eligible levels shown based on character level)
  - Text search by name, school, tags
  - Class-based filtering (only shows spells for your class)
  - Already-known spells excluded
  - Real-time "X of Y spells selected" progress indicator
  - Optional "swap spell" section for classes that can trade out known spells
- Smart max spell level calculation (e.g., level 5 Wizard can learn up to 3rd level spells)

**Step 6: New Features**
- Automatic class feature unlocks
- Feature descriptions appended to character notes
- Proficiency bonus updates

**Step 7: Summary**
- Shows all level-up changes before applying:
  - HP gain
  - Ability score improvements or feat selected
  - New spells learned (with swaps if applicable)
  - New features gained
- Confirm to apply changes to character

**Multiclassing:**
- **Prerequisite checking:** STR 13 for Fighter, INT 13 for Wizard, etc.
- **Effective caster level calculation:**
  - Full casters (Wizard, Sorcerer, Bard, Cleric, Druid): All levels count
  - Half casters (Paladin, Ranger): floor(level ÷ 2)
  - Artificer: ceil(level ÷ 2) rounded up
  - Third casters (Eldritch Knight, Arcane Trickster): floor(level ÷ 3)
  - Warlock: 0 (Pact Magic handled separately)
- **Shared spell slot table** for multiclass casters (PHB-accurate)
- **Warlock Pact Magic** calculated and displayed separately
- **Spell slot preview** in multiclass modal shows shared + pact slots
- **Class string display:**
  - Single-class: `Wizard (School of Evocation)`
  - Multiclass: `Wizard (Evocation) / Fighter (Champion)`
- Level allocation UI with progress bar and inline warnings

---

#### **Additional Features**

**Multi-Character Management:**
- Dropdown selector for switching between characters
- Each character has unique ID to prevent cross-updates
- Import/export individual characters as JSON
- Import/export full roster as JSON for backup

**Storage & Performance:**
- **IndexedDB storage** for character portraits (50MB-1GB+ capacity)
- **LocalStorage** for character data with automatic IndexedDB fallback
- Automatic migration from legacy localStorage on first load
- Import fallback prompts when storage quota exceeded (option to import without portraits)
- Real-time storage quota monitoring with color-coded warnings

**One-Click Export to Initiative Tracker:**
- "Send to Initiative Tracker" button
- Auto-populates Initiative Tracker with character data:
  - Name, HP (current/max), AC, Initiative modifier
  - Character type defaults to "PC"
  - Opens Initiative Tracker in new tab with form pre-filled
- Non-destructive append (preserves existing initiative list)

**Mobile Optimization:**
- Responsive design for phones (<768px), tablets (768-991px), desktop
- Collapsible card sections (tap header to expand/collapse)
- Animated chevron icons with smooth transitions
- Mobile hint text: "(tap to expand/collapse)"
- Frequently-used sections start expanded, others collapsed on mobile
- Touch-optimized buttons (38×38px minimum touch targets)
- Compact portrait sizing (200px mobile, 250px tablet, 320px desktop)
- Horizontal scrolling tabs with touch-friendly navigation
- **Toast notifications** for dice rolls on mobile (color-coded: green for nat 20, red for nat 1, gray for normal)
- Print-friendly styles (hides buttons/navigation, clean B&W layout)

**Use cases:**
- **For DMs:** Track the party with quick reference for passive Perception, spell lists, and story hooks. Export all 4 PCs to Initiative Tracker before combat. Use Combat View for at-a-glance stats during encounters.
- **For Players:** Use as your character sheet during a one-shot or campaign. Click dice buttons to roll skills/saves/attacks, track HP/resources, manage spell slots. No need to buy content - all races, classes, and spells are free.
- **For New Players:** Character Creation Wizard guides you through every step with explanations. Creates a 95%+ complete character with equipment, attacks, features, and spells.

---

### ⚔️ Encounter Builder
**Quick encounter assembly with export to Initiative Tracker**

**Monster Search:**
- **Searchable D&D 5e SRD monster database** from API
- **Hover tooltips** with rich stat block previews:
  - AC, HP, Speed, CR
  - All special abilities with full descriptions
  - All actions with attack bonuses (+X to hit), save DCs, damage dice
  - Reactions and legendary actions
  - Smart positioning prevents tooltips from going off-screen
- Search by name, CR, type, size

**Custom Monster Creation:**
- Build custom monsters from scratch
- **Automatic CR calculation** based on stats (offensive/defensive CR)
- Custom stat blocks with full action/ability support
- Save custom monsters to roster

**Encounter Roster:**
- Add monsters with quantity selector (bulk add: 1 monster × 5 = 5 in roster)
- **Expandable stat blocks** in roster:
  - "Show Details" button for each monster
  - Quick action preview (first 3 actions: "⚡ Multiattack, Bite, Claw")
  - Full stat block with organized sections (Special Abilities, Actions, Reactions, Legendary Actions)
  - Attack information highlighted: to-hit bonus, save DC, damage with type
  - Speed and movement details
- Drag-to-reorder encounter roster
- Edit monster names with smart duplicate numbering
- Delete monsters from roster

**Encounter Difficulty:**
- Party level configuration (4-8 players, levels 1-20)
- XP budget calculator
- Difficulty rating (Easy, Medium, Hard, Deadly) based on DMG thresholds
- Adjusted XP for encounter balancing

**Stat Block Export:**
- **"Download Stat Blocks" button** when sending to Initiative Tracker
- Generates comprehensive DM reference file (.txt) with:
  - All enemy stat blocks (name, size, type, CR, AC, HP, speed)
  - CR breakdown with offensive/defensive ratings
  - Special abilities with full descriptions
  - Actions with attack bonuses, save DCs, damage notation
  - Reactions for tactical awareness
  - Legendary actions for boss encounters
  - Encounter summary with XP calculations and difficulty rating
- Filename includes timestamp (e.g., `encounter_statblocks_2025-12-18T14-30-45.txt`)
- Optional download prompt with explanation
- Eliminates need to manually copy stat blocks during combat

**Direct Integration:**
- **"Send to Initiative Tracker"** button
- Auto-exports encounter to Initiative Tracker with one click
- Uses `mode: "append"` to preserve existing combat state
- All monster data (HP, AC, actions) transfers automatically
- Opens Initiative Tracker in new tab with roster pre-loaded

**Use case:** Build an encounter with 6 Goblins + 1 Bugbear, review stat blocks in roster, download stat block reference file for combat, click "Send to Tracker"—combat ready in 30 seconds. Keep stat block file open on second screen for quick reference during battle.

---

### 🏪 Shop Generator
**Settlement-based economy with comprehensive inventories**

**Shopkeeper NPCs:**
- **Auto-generated names** from 4 name pools (generic, exotic, humble, scholarly)
- **Personality system** weighted by probability:
  - **Fitting (70%):** Perfect for role (e.g., blacksmith: "gruff and practical, has burn scars")
  - **Ironic (20%):** Hilariously contradictory (e.g., blacksmith: "squeamish about violence despite making weapons")
  - **Wrong Field (10%):** Clearly in wrong profession (e.g., blacksmith: "wanted to be a baker, makes weapon-shaped bread on the side")
- 10+ shop types with 4 unique personality traits per type per category

**Shop Types:**
- Blacksmith, Armory, General Store, Herbalist, Alchemist, Tavern/Inn, Magic Shop, Bookstore, Jeweler, Leatherworker, Fletcher, Tailor, Stables, Temple, Black Market

**Inventory System:**
- **Organized item categories:**
  - Weapons (Melee, Ranged, Ammunition)
  - Armor (Light, Medium, Heavy, Shields)
  - Tools & Kits (Artisan's Tools, Thieves' Tools, Herbalism Kit, etc.)
  - Adventuring Gear (Rope, Torches, Bedrolls, Camping Supplies)
  - Magic Items (Potions, Scrolls, Wondrous Items, Weapons, Armor)
  - Consumables (Healing Potions, Antitoxin, Holy Water)
- **Settlement economy:**
  - **Village:** 5-8 base stock, higher prices (10-35% markup), scarcer rare items
  - **Town:** 7-12 base stock, balanced prices (−5% to +15%), moderate rare availability
  - **Capital:** 10-16 base stock, lower prices (−15% to +20%), broader rare selection
- **Rarity gating:**
  - Villages: Mostly common items, very few uncommon, no rare
  - Towns: Common + uncommon, occasional rare
  - Capitals: Full range including rare and very rare
- **Quality tiers:**
  - Rough (−20% price, cosmetic flaws)
  - Standard (base price)
  - Premium (+30% price, excellent craftsmanship)
  - Masterwork (+100% price, exceptional quality)
- **Limited stock quantities:**
  - Rare items: 1-3 in stock (always limited)
  - Uncommon items: Settlement stock range (village: 5-8, town: 7-12, capital: 10-16)
  - Common items: Settlement range + 50% bonus for greater availability
  - Stock quantity displayed in dedicated table column

**Negotiation Mechanic:**
- **"Negotiate" button** on each shop item
- **Haggling system** with Persuasion DC based on rarity:
  - Common: DC 12
  - Uncommon: DC 15
  - Rare: DC 18
  - Very Rare/Legendary: DC 20
- **Price outcomes:**
  - **Critical Success** (Nat 20 or DC+10): 30% discount
  - **Success by 5+** (DC+5): 20% discount
  - **Success** (DC): 10% discount
  - **Failure** (< DC): No discount
  - **Critical Failure** (Nat 1 or DC-10): +10% price increase (shopkeeper offended)
- Visual color coding for success/failure tiers

**Character Integration:**
- **"Add to Character" button** on every shop item
- Modal interface for selecting destination character
- Automatic data transfer: item name, description, use, price, rarity
- Customizable fields: quantity, weight per item, equipped status, attuned status
- Optional notes field for player-specific information
- Item details automatically combined into character inventory notes
- Success confirmation after adding

**Seeded RNG:**
- Enter seed (e.g., "ironforge-blacksmith") for reproducible shops
- Return to same shop in future sessions with same inventory
- Perfect for campaign consistency

**Export Options:**
- Copy to clipboard (plain text)
- Download as text file (includes shopkeeper info and stock quantities)
- Export includes shopkeeper personality and full inventory table

**Use case:** Players walk into a village blacksmith. Generate inventory (Village, Standard quality, seed: "ironforge-blacksmith"). Shopkeeper is "gruff and practical with burn scars on his forearms." Shop has mundane weapons (15 gp Longsword, 10 gp Spear), no magic items, village pricing with limited stock. Player wants to haggle - roll Persuasion vs DC 12 for common item. Success = 10% off. Click "Add to Character" to transfer Longsword to player's inventory. Return next session—same shop, same inventory.

---

### 🍺 Tavern/Inn Generator
**Complete establishments with cultural immersion**

**Tavern Basics:**
- **Procedural names** (The Prancing Fox, The Golden Anchor, The Stone Hearth)
- **Tavern types:** Standard (generic fantasy), Dwarven, Elven, Halfling, Orcish, Coastal, Desert, Mountain
- **Settlement/quality scaling:**
  - Village rough inn vs Capital fine establishment
  - Affects pricing, menu quality, room tiers, staff professionalism

**Cultural Immersion System (7 Cultural Types):**
- **Cultural Patron Types** - 7 patron type arrays per culture (49 total):
  - Dwarven: dwarven smith, stone mason, mining foreman, gemcutter, brewmaster's apprentice, clan historian, tunnel engineer
  - Elven: elven musician, forest warden, scroll keeper, arcane botanist, weaver of moonsilk, star reader, vintner's assistant
  - Halfling: halfling baker, pipeweed merchant, comfort chef, quilting circle member, family patriarch, storytelling grandmother, pie contest judge
  - Orcish: war-scarred veteran, beast trainer, tribal emissary, wrestling champion, honor guard, clan armorer, raiding party member
  - Coastal: weathered sailor, net mender, ship's carpenter, pearl diver, tide caller, fishmonger, lighthouse keeper
  - Desert: caravan master, spice merchant, sand guide, oasis keeper, nomad trader, water diviner, silk road traveler
  - Mountain: mountain guide, avalanche survivor, fur trapper, alpine shepherd, lodge keeper, ice climber, ranger from the peaks

- **Cultural Events** - 3-4 unique events per tavern type (28 total):
  - Dwarven: axe-throwing contests, mining debates, clan disputes, forge technique comparisons
  - Elven: haunting flute melodies, poetry battles, Feywild tales, portrait sketching
  - Halfling: pie-eating contests, recipe sharing, pipeweed tastings, children playing
  - Orcish: wrestling matches, scar comparisons, drinking contests, arm-wrestling
  - Coastal: sea shanties, unusual catches, crew recruitment, sailing debates
  - Desert: spice demonstrations, sandstorm stories, ancient tales, caravan trading
  - Mountain: avalanche warnings, fur trading, blizzard stories, beast encounters

- **Cultural Bartender Rumors** - 4 themed rumors per culture (28 total):
  - Dwarven: gem veins, brew experiments, deep mines, master smiths
  - Elven: forest mysteries, ancient groves, rare wines, Feywild lights
  - Halfling: harvest festivals, legendary recipes, pipeweed blends, special feasts
  - Orcish: beast hunts, wrestling champions, war party returns, honor missions
  - Coastal: strange cargo, unusual fishing, underwater lights, missing vessels
  - Desert: revealed ruins, oasis mysteries, new routes, rare spices
  - Mountain: snowed passes, unmapped caves, avalanche activity, unique pelts

- **Cultural Patron Rumors** - 4 themed rumors per culture (28 total):
  - Dwarven: forging secrets, clan disputes, ancient runes, legendary brews
  - Elven: starlight wines, Feywild encounters, tree warnings, unknown grapes
  - Halfling: recipe theft, pie secrets, ancient relatives, legendary dishes
  - Orcish: championship challenges, war drums, cursed weapons, honor debts
  - Coastal: sea serpents, smuggler caves, mutinies, strange fish
  - Desert: caravan disappearances, dry oases, exposed treasures, sand witches
  - Mountain: missing climbers, angry spirits, hermit secrets, strange howls

- **Cultural Ambiance Tags** - 8 atmospheric descriptors per culture (56 total):
  - Dwarven: forge-warmed, stone pillars, ale-soaked tables, carved clan symbols, brass tankards clanging
  - Elven: moonlight filtering, silver-threaded curtains, living wood furniture, crystal chimes tinkling
  - Halfling: hearth-fire crackling, pie-scented air, family portraits, children's laughter echoing
  - Orcish: battle trophies mounted, skull decorations, war drums, combat circle cleared
  - Coastal: salt air drifting, driftwood furniture, fishing nets hanging, ship bell at bar
  - Desert: silk drapes flowing, spice-scented air, brass lanterns gleaming, water fountains trickling
  - Mountain: bear pelts on walls, snowshoes displayed, trophy antlers mounted, frost on windows

- **Cultural Staff Descriptors** - Complete character trait sets per culture:
  - Custom attire (clan vests, moonsilk, battle leather, salt-stained gear)
  - Cultural demeanor (stone-steady, ethereal yet present, honor-bound, sailor's superstitious)
  - Unique manners (strokes beard, moves with grace, maintains eye contact, checks wind)
  - Cultural accents (deep mountain burr, lyrical and musical, guttural and forceful, sailor's drawl)

**Context Influence System:**
- **Context Influence slider** (0-100%) controls how strongly tavern context biases generation
- **Boosted pool merging** strategy weights context-specific pools against base pools
- Slider at 0% = no context influence, 100% = heavy cultural bias
- Guarantees at least one context-specific patron/event/rumor when context entries exist

**Menu System:**
- **Meals:** Breakfast, lunch, dinner with cultural variations
- **Drinks:** Ale, wine, spirits, specialty beverages
- **Pricing:** Village (cheap) → Town (moderate) → Capital (expensive)
- Cultural menu themes (dwarven hearty fare, elven delicate cuisine, halfling comfort food, orcish grilled meats, coastal seafood, desert spiced dishes, mountain game)

**Room Listings (6 tiers):**
1. Common-room cot (2 cp/night)
2. Shared room (5 sp/night)
3. Private room (1 gp/night)
4. Comfortable room (2 gp/night)
5. Fine room (5 gp/night)
6. Suite (10+ gp/night)

**Staff NPCs:**
- Proprietor, barkeep, cook, servers
- Each with: Name, role, description, voice/mannerism
- Cultural traits applied based on tavern type
- **"Generate Full NPC Details" button** - Expands basic staff into complete 8-field NPCs
  - Auto-generates: enhanced mannerisms, quirks, wants, avoids, secrets
  - Modal preview with copy and "Open in NPC Gen" options
  - localStorage handoff for tavern staff → NPC Generator integration

**Patron System:**
- **"Include patrons (3-5 NPCs)" checkbox** in settings
- Generates 3-5 random patrons per tavern
- **"Patrons in the Common Room" section** with individual patron cards
- **27 patron types** (variety: local regular, traveling merchant, off-duty guard, farmer, craftsperson, sellsword, pilgrim, gambler, scholar, miner, sailor, thief, hedge witch, bounty hunter, etc.)
- **22 visual quirks** (missing finger, scar, nervous twitch, tattoo, eye patch, gold tooth, limping, polishing coin, chewing pipe, fidgeting with cards, etc.)
- **27 activity hooks** (looking for work, celebrating windfall, drowning sorrows, meeting secretly, seeking adventurers, playing dice, telling tall tales, eavesdropping, spreading news, etc.)
- **Compact card layout:** Type/age/build, appearance quirk, current activity
- Grid display (3 columns desktop, 2 tablet, 1 mobile)
- Patron generation heavily weighted toward cultural types for immersive atmosphere

**Events & Rumors System:**
- **"What's Happening at the Tavern?" section** - 1-2 random events per generation
  - 65+ unique tavern events: bard performances, arm-wrestling contests, mysterious strangers, burning dinners, dice games, political debates, singing patrons, etc.
  - Events provide immediate atmosphere and interaction opportunities
- **"Rumors from the Bartender" section** - 2-3 rumors per generation
  - 63+ unique bartender rumors: strange lights at old mill, missing caravans, shady mayor meetings, ancient coins, temple donations, vanishing horses, etc.
  - Rumors from trusted tavern keeper perspective
- **"Overheard from Patrons" section** - 2-4 rumors per generation
  - 62+ unique patron rumors: giant creatures in mountains, Baron hiring adventurers, new cave systems, missing families, poaching, secret fighting rings, etc.
  - Rumors from gossip/hearsay perspective with varying reliability
- **"Include events & rumors" checkbox** in generator controls
- 190+ total rumor/event options provide endless side quest inspiration
- Mix of immediate (events) and background (rumors) story hooks

**Ambience Tags:**
- 5-7 atmospheric descriptors (crackling hearth, lamplit, busy at supper, etc.)
- 3 cultural tags + 2 generic tags for cultural taverns
- Creates vivid sensory atmosphere

**Seeded RNG:**
- Events, rumors, patrons, and all other features respect seeded RNG
- Enter seed (e.g., "riverside-inn") for reproducible taverns
- Return to same tavern in future sessions with consistent details

**Export Options:**
- Copy to clipboard (plain text)
- Download as text file
- Export includes all sections: name, sign, menu, rooms, staff, ambience, patrons, events, rumors

**Use case:** Players want to stay at an inn in a dwarven city. Generate (Town, Dwarven, seed: "ironforge-inn"). Get: "The Stone Anvil" with dwarven proprietor, hearty meals (roasted boar, ale), stone pillars and forge-warmed ambiance. Staff have clan vests and deep mountain accents. Patrons include dwarven smith arguing about forge techniques, stone mason drowning sorrows, gemcutter celebrating windfall. Bartender rumor: "Deep mines found ancient rune." Patron rumor: "Clan dispute over legendary brew recipe." Players can interact with patrons for plot hooks, negotiate room prices, order culturally-appropriate meals. Export as text for session notes.

---

### 🧙 NPC Generator
**Memorable characters without overwhelming detail**

**Physical Description:**
- **Age:** Child, young adult, middle-aged, mature, elderly, ancient
- **Height:** 12 variations (very short, short, below average, average, above average, tall, very tall, unusually tall, compact, towering, diminutive, statuesque)
- **Build:** Skeletal, wiry, lean, athletic, sturdy, stocky, heavyset, broad, muscular, towering, barrel-chested, willowy, petite
- **Hair:** Color, style, length descriptors
- **Eyes:** Color, shape, notable features
- **Distinguishing features:** Scars, tattoos, birthmarks, missing digits, etc.
- **Attire:** Clothing style based on settlement and role
- **Demeanor:** Body language and presence (confident, nervous, aloof, warm, etc.)

**Voice System:**
- **Tempo:** Quick/measured/slow/halting/rhythmic
- **Timbre:** Rough/smooth/gravelly/melodious/nasal
- **Pitch:** High/mid-range/low/booming/squeaky
- **Accent:** Local/foreign/noble/rural/scholarly
- **Delivery:** Animated/monotone/passionate/hesitant/commanding
- **Mannerisms (2 per NPC):** Rubs hands, pauses often, laughs nervously, speaks in rhyme, etc.

**Personality:**
- **Demeanor:** Cheerful, gruff, nervous, sarcastic, courteous, etc.
- **Ideals:** Honor, freedom, tradition, knowledge, power, etc.
- **Flaws:** Greedy, cowardly, arrogant, paranoid, gullible, etc.
- **Bonds:** Family, guild, town, secret organization, etc.

**Motivations:**
- **Wants:** Actionable desires (wealth, revenge, knowledge, safety, recognition)
- **Avoids:** Things they fear or refuse (violence, authority, magic, crowds)

**NPC Secrets System (42 unique secrets):**
- **Financial:** Debts, hidden wealth, embezzlement
- **Criminal connections:** Thieves' guild, blackmail, smuggling
- **Hidden knowledge:** Secret passages, conspiracies, cures, treasure locations
- **Identity secrets:** False identity, hidden family, nobility in disguise
- **Dark past:** Witnessed crimes, poisoning, theft, betrayal
- Examples: "knows the location of a smuggler's cache", "is being blackmailed over a past indiscretion", "witnessed a shapeshifter replacing someone"

**Combat Stat Block System (Optional):**
- **"Generate Stats" button** on each NPC card
- **5-tier difficulty system:**
  - **Tier 1: Commoner** (CR 0-1/8) - Weak, untrained individuals
  - **Tier 2: Trained** (CR 1/4-1) - Basic combat training
  - **Tier 3: Veteran** (CR 2-4) - Experienced fighters
  - **Tier 4: Elite** (CR 5-8) - Skilled warriors
  - **Tier 5: Legendary** (CR 9-15) - Master combatants
- **17 combat specialties:**
  - Common Folk: Commoner, Laborer, Farmer, Merchant
  - Trained Fighters: Guard, Soldier, Scout, Thug, Bandit
  - Skilled Combatants: Veteran, Knight, Monk
  - Spellcasters: Mage, Priest
  - Elite/Legendary: Assassin, Champion, Archmage
- **Complete stat block generation:**
  - Auto-calculates HP (randomized within tier range)
  - Auto-calculates AC (randomized within tier range)
  - Auto-scales ability scores based on tier (+0/+2/+4/+6/+8 for tiers 1-5)
  - Calculates all ability modifiers (STR, DEX, CON, INT, WIS, CHA)
  - Includes speed (30 ft base, 40 ft for Scout/Monk, 25 ft for Knight)
  - Proficiency bonus by tier (+0 to +4)
  - Specialty-specific attacks and traits
- **Interactive modal UI:**
  - Tier and specialty selection dropdowns
  - Live specialty description preview
  - One-click stat block generation with formatted D&D output
  - Individual "Copy" button for full NPC (description + voice + stats)

**Settlement Roles:**
- Guards, merchants, nobles, clergy, artisans, laborers, criminals, travelers
- Role affects attire and demeanor

**Name Generation Integration:**
- **"Generate Name" button** on each NPC card
- **Interactive name picker modal:**
  - 12 name options based on detected race
  - Race auto-detection from NPC description using pattern matching
  - Manual race override via dropdown selector (30+ races)
  - "Regenerate" button for fresh name options without closing modal
  - "Open Name Generator" button for advanced customization
- **Seamless cross-tool communication:**
  - URL parameter passing for race presets
  - localStorage handoff for bidirectional data flow
  - Selected race automatically applied when Name Generator opened

**Seeded RNG:**
- Enter seed (e.g., "guard-ironforge") for reproducible NPCs
- Same seed always generates same NPC
- Perfect for recurring NPCs across sessions

**Export Options:**
- Copy to clipboard (plain text with all details)
- Copy includes: description, voice, personality, wants/avoids, secret, and combat stats (if generated)
- Download as text file

**Use case:** Players ask the bartender a question. Generate NPC (Town, Merchant class). Get: "Middle-aged, average height, sturdy build, courteous demeanor. Warm voice with local lilt, mid-range pitch, measured tempo. Wants: news from the road. Avoids: conflict with local authorities. Mannerisms: rubs thumb and forefinger together, pauses often. Secret: knows the location of a smuggler's cache." Run the scene. If combat breaks out, click "Generate Stats" → Select Tier 2 Trained / Guard specialty → Get full stat block with AC 13, HP 11, +3 to hit with spear. Copy full NPC to clipboard for session notes.

---

### 💰 Loot Generator
**Treasure with flexible generation modes and risk/reward mechanics**

**Generation Modes:**
- **Hoard loot:** Large treasure piles for boss encounters, dragon hoards, ancient vaults
- **Individual loot:** Pocket loot for single-creature drops (~10% of items/budget)
- Toggle applies automatic scaling adjustments

**Budget System:**
- **Budget mode:** Set total GP value, auto-generate items to match
- **Item count mode:** Set number of items, randomize values
- Budget ranges: 10 gp (pocket change) → 10,000 gp (king's ransom)

**Loot Categories:**
- **Coins:** CP, SP, EP, GP, PP with weight calculations
- **Gems & Art Objects:** 13 items (rubies, emeralds, ornate music box, jeweled hair comb, crystal prism, carved ivory cameo, gilded portrait frame, polished jade figurine, silver filigree locket, painted porcelain vase, etc.)
- **Trade Goods:** 14 items (silk bolts, spices, furs, barrel of aged wine, exotic tea leaves, rare herbs, coffee beans, fine tobacco, spider silk, rare pigments, exotic incense, etc.)
- **Mundane Adventuring Items:** 20 items (50 ft rope, torches bundle, bedroll, rations 1 week, candles, tinderbox, lantern, oil flask, grappling hook, crowbar, 10 ft pole, chalk, iron spikes, tent, backpack, shovel, caltrops, chain, fishing tackle, signal whistle)
- **Minor Magic Items:** 47 items across 8 categories:
  - **Healing & Recovery (4):** Tonic of Vigor, Salve of Mending, Restorative Tea, Vial of Clarity
  - **Combat & Defense (7):** Smoke Charm, Oil of Edge, Warding Ribbon, Shield Charm, Thunderstone, Flash Powder, Tanglefoot Bag
  - **Movement & Utility (5):** Feather Token, Boots of Springing, Potion of Water Breathing, Dust of Tracelessness, Feather Fall Token
  - **Social & Luck (4):** Lucky Coin, Charm of Persuasion, Vial of Courage, Token of Truth
  - **Exploration (5):** Guide's Pin, Wayfinder's Compass, Lens of Detection, Ear Trumpet of Listening, Dowsing Rod
  - **Knowledge & Magic (5):** Scribe's Quill, Scholar's Monocle, Candle of Revealing, Chalk of Warding, Crystal of Light
  - **Tools & Craft (4):** Hammer of Mending, Rope of Climbing, Thieves' Gloves, Bag of Endless Knots
  - **Nature & Animals (3):** Beast Whistle, Druid's Seed, Weatherglass
  - **Ongoing Items (8):** Everburning Torch, Self-Heating Mug, Cleaning Cloth, Compass of True North, Tankard of Purity, Prestidigitation Ring, Warming Cloak Clasp, Cooling Hat Pin
  - All items include clear mechanical effects, value ranges, and categorization (consumable/situational/ongoing)
- **Cursed Items:** 50 items with risk/reward mechanics across 5 severity levels:
  - **Severity 1-2 (Minor):** Appealing benefits with subtle drawbacks (e.g., lucky coin: +1 initiative but sneeze at combat start; charming brooch: +1 Charisma but compulsively compliment strangers)
  - **Severity 3 (Balanced):** Strong benefits with notable costs (e.g., keen dagger: +1 hit/damage but killing blows damage self; endless waterskin: refills daily but water tastes metallic)
  - **Severity 4-5 (Dangerous):** Powerful benefits with serious consequences (e.g., boots of haste: +10 ft movement but 1d4 slip chance; bloodthirsty blade: +2 hit/damage but requires daily use or take psychic damage)
  - All cursed items appear as masterwork quality to tempt players
  - Curse Severity Slider (1-5) filters items by risk level
  - Cursed items toggle enables/disables category
  - Visual distinction: red borders, warning icons, "CURSED" labels
  - Integrated with monster templates (lich, demon, undead get higher curse rates)

**Monster-Specific Loot Templates (9 types):**
- **Dragon:** Favors gems (2.0×), coins (1.8×), magic items; flavor: "scorched edges", "melted slightly"
- **Lich:** Books (1.8×), gems (1.4×), magic (1.6×); flavor: "necromantic runes", "bone-white"
- **Vampire:** Gems (1.6×), clothing (1.5×), coins (1.4×); flavor: "blood-stained", "aristocratic"
- **Beholder:** Gems (1.7×), curios (1.5×), magic (1.8×); flavor: "alien geometry", "prismatic"
- **Giant:** Food (1.5×), trade goods (1.4×), mundane items (1.3×); flavor: "oversized", "massive scale"
- **Demon/Devil:** Gems (1.5×), magic (1.7×), curios (1.4×); flavor: "sulfurous", "infernal script"
- **Fey Noble:** Curios (1.8×), gems (1.5×), magic (1.6×); flavor: "rainbow-hued", "moonlit"
- **Aberration:** Curios (1.6×), writing (1.4×), magic (1.5×); flavor: "otherworldly", "mind-bending"
- **Undead Horde:** Coins (1.3×), gems (1.2×), clothing (1.2×); flavor: "grave-touched", "centuries-old"
- Monster type selection overrides hoard template for thematic consistency

**Quick Bundle Presets (8 one-click options):**
- **Pocket Loot** (~50 gp): Individual loot, coins + mundane items (5 items)
- **Coin Pouch** (200-500 gp): Coins only bundle (budget mode)
- **5 Gems** (~500 gp): Gem collection (5 items, 50-200 gp each)
- **Potion Bundle** (3 potions): Minor magic consumables
- **Scroll Bundle** (3 scrolls): Minor magic scrolls
- **Boss Hoard** (~2000 gp): Full treasure pile with gems, coins, trade goods, magic items (50 items, budget mode)
- **Magic Items** (8 items): Minor magic items with broad category variety (high usefulness bias)
- **Cursed Items** (6 items): Cursed items with balanced severity (mix of flavor curses and real risks)
- Each bundle has pre-optimized settings (bypasses manual configuration)
- Visual bundle grid with color-coded buttons and value estimates

**Custom Loot Table System:**
- **Import custom JSON loot tables** via file picker
- Tables can define custom categories, templates, generation rules
- JSON format requires `name` field with optional `categories` and `template` objects
- Dropdown selector for active custom table
- Multiple custom tables can be loaded in same session

**Save/Load Preset System:**
- Save all current settings with custom preset name
- Presets stored in browser localStorage for persistence
- Saves: mode, loot type, count, budget, monster/template, all toggles, category selections
- Load presets from dropdown selector with one click
- Preset list auto-populates on page load

**Rarity System:**
- Common, Uncommon, Rare, Very Rare, Legendary
- Rarity affects item types and probabilities
- Magic item rarity distribution configurable

**Quality Tiers:**
- Rough (−20% value, cosmetic flaws)
- Standard (base value)
- Premium (+30% value, excellent craftsmanship)
- Masterwork (+100% value, exceptional quality)

**Item Bundling:**
- Stack similar items (3× Potion of Healing)
- Weight calculations for encumbrance

**Export Options:**
- Copy to clipboard (plain text)
- Download as text file
- Export includes item names, values, weights, descriptions

**Use case:** Party defeats an ancient red dragon. Generate loot (Hoard mode, Dragon template, 2000 gp budget). Get: 850 gp in coins, 6 gems (rubies, emeralds with "scorched edges"), 2 magic items (+1 Flaming Longsword, Ring of Fire Resistance both with "melted slightly" flavor), 3 trade goods (silk bolts, rare pigments). Export to text file for distribution. Alternatively, use "Boss Hoard" quick bundle for instant generation. Or click "Coin Pouch" for simple 350 gp pocket loot after defeating a bandit.

For cursed loot: Enable cursed items toggle, set severity to 3 (balanced), generate. Player finds "boots of haste" with +10 ft movement—seems great! Only after using them do they discover the 1d4 slip chance on full movement. Cursed items appear as masterwork quality to encourage discovery through use. Click "Cursed Items" quick bundle to generate 6 tempting-but-dangerous items instantly.

---

### 📛 Name Generator
**Fantasy names with linguistic patterns**

**Race Presets (30+ races):**
- **Common Races:** Human (Latin, Norse, Arabic, Asian), Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
- **Uncommon Races:** Aarakocra, Tabaxi, Firbolg, Kenku, Triton, Goliath
- **Monstrous Races:** Bugbear, Hobgoblin, Kobold, Yuan-ti
- **Special Races:** Changeling, Warforged
- Each race has culturally appropriate syllable patterns for authentic name generation
- Race-specific suffixes for enhanced authenticity (e.g., Warforged mechanical names, Tabaxi compound names)

**Name Customization:**
- **Gender options:** Masculine, feminine, neutral
- **Syllable count:** 2-5 syllables for name length control
- **Harshness slider:** Softer (elvish, flowing) ↔ Harsher (orcish, guttural)
- **Exoticness slider:** Common (familiar) ↔ Exotic (unusual)
- **Surname toggle:** Enable/disable surnames
- **Title field:** Add custom titles (Sir, Lady, Captain, etc.)

**Organized Race Dropdown:**
- **Races categorized into 4 logical groups:**
  - **Common Races:** Human variants, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
  - **Uncommon Races:** Aarakocra, Tabaxi, Firbolg, Kenku, Triton, Goliath
  - **Monstrous Races:** Bugbear, Hobgoblin, Kobold, Yuan-ti
  - **Special Races:** Changeling, Warforged
- Visual separation with optgroups for improved UX

**Favorites System:**
- Click star icon to favorite a name
- Favorites save to localStorage (`'ng-favs'`)
- Add/remove/copy functionality
- Persists across sessions and page refreshes

**Seeded RNG:**
- Enter seed (e.g., "blacksmith-npc") for reproducible names
- Same seed + race + gender = same name every time
- Perfect for consistency across sessions

**Bulk Generation:**
- Generate 10 names at once
- Quick iteration for finding the perfect name

**Export Options:**
- Copy individual names to clipboard
- Copy all favorites

**Use case:** Need a dwarf NPC name for a recurring blacksmith. Generate (Dwarf, masculine, seed: "ironforge-smith", surname enabled). Get: "Thorin Ironbrew". Same seed always gives same name. Favorite it for future reference. Need 10 elf names for a forest encounter? Generate (Elf, feminine, bulk mode). Get 10 options like "Aelindra", "Sylvari", "Elarion". Pick the best, favorite it, move on.

---

## 🔗 Cross-Tool Integration

The toolkit is designed as **interconnected modules**, not isolated tools. Data flows seamlessly between tools with one-click handoffs:

```
┌─────────────────────┐
│ Encounter Builder   │──┐
└─────────────────────┘  │
                         │  One-click
┌─────────────────────┐  │  handoff via
│ Character Manager   │──┼─→ localStorage
└─────────────────────┘  │  + URL params
                         │
┌─────────────────────┐  │  ┌──────────────────┐
│  Battle Map         │──┼─→│ Initiative       │
└─────────────────────┘  │  │ Tracker          │
                         │  └──────────────────┘
┌─────────────────────┐  │
│ Tavern Generator    │──┼─→ ┌──────────────────┐
└─────────────────────┘  │   │ NPC Generator    │
                         │   └──────────────────┘
┌─────────────────────┐  │
│ Shop Generator      │──┘─→ ┌──────────────────┐
└─────────────────────┘      │ Character        │
                             │ Manager          │
                             │ (Inventory)      │
                             └──────────────────┘

┌─────────────────────┐     ┌──────────────────┐
│ Name Generator      │←───→│ NPC Generator    │
└─────────────────────┘     └──────────────────┘
    Bidirectional flow
```

### **Example Workflows:**

**Combat Prep → Combat Execution:**
1. **Encounter Builder:** Design encounter (6 goblins, 1 bugbear)
2. Click **"Send to Tracker"** (uses `mode: "append"` to preserve existing combat)
3. **Character Manager:** Export 4 PCs
4. Click **"Send to Initiative Tracker"**
5. **Initiative Tracker** opens with 11 combatants pre-loaded
6. Roll initiative, start combat
7. **Battle Map:** Right-click tokens → "Add to Initiative" auto-populates form with HP/AC/initiative

**Tavern Improvisation → NPC Expansion:**
1. **Tavern Generator:** Generate tavern with staff and patrons
2. Players interact with interesting patron
3. Click **"Generate Full NPC Details"** on patron card
4. Modal shows expanded NPC with secrets, wants, avoids
5. Click **"Open in NPC Gen"** → NPC Generator loads with full details
6. Click **"Generate Name"** → Name picker modal with race-specific options
7. Select name → Auto-applies to NPC
8. Click **"Generate Stats"** if combat breaks out
9. Copy full NPC (description + voice + stats) to clipboard for notes

**Shopping Trip → Character Inventory:**
1. **Shop Generator:** Generate blacksmith shop
2. Player buys Longsword +1
3. Click **"Add to Character"** on item
4. Select destination character from dropdown
5. Set quantity, weight, equipped status
6. Confirm → Item appears in **Character Manager** inventory
7. Encumbrance auto-calculates based on STR score

**Battle Map → Initiative Sync:**
1. **Battle Map:** Place 8 enemy tokens on map
2. Set HP, AC, status effects on each token
3. Right-click token → **"Add to Initiative"**
4. **Initiative Tracker** opens with form pre-filled:
   - Name from token label
   - HP (current/max) from token tracking
   - AC from token stats
   - Initiative roll auto-generated (1d20 + initiative bonus)
5. Submit → Character added to initiative list
6. Repeat for all enemies (or use Encounter Builder for bulk)

**No copy/paste. No manual entry. Just clicks.**

---

## 🎨 Design Principles

### **1. DM-Focused, Not Player-Facing**
Tools include fields like **"Party Role"**, **"Story Hooks & Secrets"**, **"At-the-Table Reminders"**—things DMs need, not what players see on their sheets.

**Exception:** Character Manager serves both DMs (party tracking, story hooks) and players (character sheets, dice roller, spell management). This dual-purpose approach addresses the paywall problem for players while maintaining DM utility.

### **2. Quick Reference Over Deep Simulation**
Generate enough detail to be useful, not so much it's overwhelming. An NPC has a voice and motivation, not a 20-page backstory. A shop has inventory and pricing, not a full economic simulation.

### **3. Seeded RNG for Consistency**
Use seeds (e.g., `"session-5-blacksmith"`) to regenerate the same shop, NPC, or tavern across sessions. Perfect for campaign consistency when players return to the same location weeks later.

### **4. Settlement Economy Consistency**
**Village rough inn charges different prices than Capital fine establishment.** Shop Generator, Tavern Generator, and Loot Generator all use the same economic model:
- **Village:** Higher prices (scarcity), limited stock, fewer rare items
- **Town:** Balanced prices, moderate stock, occasional rare items
- **Capital:** Lower prices (competition), abundant stock, full rare item access

### **5. No Forced Narrative**
The Encounter Builder builds encounters, but doesn't tell you *why* these monsters are here. The NPC Generator gives you personality, not plot. The Tavern Generator provides atmosphere and patrons, but you decide their relevance to your story.

**Tools assist, never railroad.**

### **6. Improvisation Over Prep**
These tools are designed for **"Players went off-script, I need help NOW"** moments:
- Players walk into unplanned shop? Generate in 10 seconds.
- Players ask bartender a question? Generate NPC with voice in 5 seconds.
- Combat breaks out unexpectedly? Send encounter to tracker in 15 seconds.

You can use them for prep too, but the primary goal is **table-ready speed**.

### **7. Privacy & Offline First**
- **No accounts** - No email, no password, no profile
- **No tracking** - No Google Analytics, no tracking pixels
- **No cloud** - Data stays in your browser (LocalStorage + IndexedDB)
- **No internet** - Works completely offline after first load
- **No subscriptions** - All features free forever

---

## 🚀 Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5 / CSS3 / JavaScript** | Pure vanilla JS, no frameworks |
| **Bootstrap 5.3** | Responsive layout and components |
| **LocalStorage API** | Character data, settings persistence |
| **IndexedDB API** | Large file storage (portraits, maps) - 50MB-1GB+ capacity |
| **Canvas API** | Battle Map rendering (layered architecture) |
| **Pointer Events API** | Touch + mouse support |
| **SortableJS** | Drag-and-drop functionality |
| **Netlify** | Hosting and continuous deployment |
| **GitHub** | Version control |

### **Why no frameworks?**

- ✅ **Faster load times** - No build step, no webpack bundle
- ✅ **Easier to audit** - View-source to see everything, no obfuscation
- ✅ **Educational** - Demonstrates vanilla JS patterns without abstraction layers
- ✅ **Smaller bundle size** - ~500KB total vs 2-5MB for React/Vue apps
- ✅ **No dependency hell** - No `npm install`, no version conflicts

---

## 📁 Project Structure

```
The-DMs-Toolbox/
├── index.html              # Splash page (landing page with tool overview)
├── initiative.html         # Initiative Tracker
├── battlemap.html          # Battle Map VTT
├── encounterbuilder.html   # Encounter Builder
├── characters.html         # Character Manager
├── shop.html               # Shop Generator
├── tav.html                # Tavern/Inn Generator
├── npc.html                # NPC Generator
├── loot.html               # Loot Generator
├── name.html               # Name Generator
├── journal.html            # Journal / Campaign Notes
│
├── css/
│   ├── site.css            # Global styles (nav, footer, utilities)
│   ├── initiative.css      # Initiative Tracker styles
│   ├── characters.css      # Character Manager styles
│   └── battlemap.css       # Battle Map styles
│
├── js/
│   ├── site.js             # Shared utilities (RNG, localStorage helpers)
│   ├── initiative.js       # Initiative Tracker logic
│   ├── character.js        # Character Manager core logic
│   ├── character-creation-wizard.js  # Character creation wizard
│   ├── level-up-system.js  # Level-up wizard and multiclass logic
│   ├── level-up-data.js    # Class/subclass/feat data for level-up
│   ├── multiclass-ui.js    # Multiclass management modal
│   ├── spells-data.js      # 432 spells from PHB/Xanathar's/Tasha's
│   ├── rules-data.js       # Rules reference data
│   ├── indexed-db-storage.js  # IndexedDB storage system
│   ├── battlemap.js        # Battle Map rendering and interaction
│   ├── encounterbuilder.js # Encounter Builder logic
│   ├── shop.js             # Shop Generator logic
│   ├── tav.js              # Tavern Generator logic
│   ├── npc.js              # NPC Generator logic
│   ├── loot.js             # Loot Generator logic
│   ├── name.js             # Name Generator logic
│   ├── journal-export.js   # Journal export system (Word/PDF/TXT/Markdown)
│   └── character-sheet-export.js  # Character sheet export (PDF/PNG/Word)
│
├── images/
│   ├── playerTokens/       # 12 player class tokens
│   ├── enemyTokens/        # 12 enemy creature type tokens
│   ├── CharacterTokenFrame.png  # Portrait token overlay
│   ├── BaseToken.png       # Base token for initials
│   ├── BGMap.png           # Background texture
│   ├── dndFavicon.png      # Site favicon
│   └── White logo.png      # Footer logo
│
├── LICENSE.md              # MIT License
├── CHANGELOG.md            # Version history (v2.0.0 as of 2026-01-19)
└── README.md               # This file
```

---

## 🎯 Use Cases

### **Pre-Session Prep**
1. **Encounter Builder:** Design 3 encounters for dungeon, download stat block reference files
2. **Shop Generator:** Create village merchant inventory with seeded RNG
3. **Tavern Generator:** Build the inn where players will stay, generate patrons with hooks
4. **NPC Generator:** Create 5 NPCs (guards, innkeeper, quest giver) with secrets
5. **Character Manager:** Update PC stats, story hooks, and level up characters
6. **Battle Map:** Pre-load dungeon map, calibrate grid, place enemy tokens, set fog of war
7. Export everything to JSON for backup

### **At the Table (Improvisation)**

**Scenario 1: Unplanned Tavern Visit**
```
Players: "We go to a tavern"
DM: [Opens Tavern Generator]
    → Select: Town, Dwarven, seed: "ironforge-tavern"
    → Enable: Patrons, Events & Rumors
    → Generate
    → Read: "The Stone Anvil" with dwarven proprietor,
             hearty meals (roasted boar 5 sp, dark ale 2 cp),
             forge-warmed ambiance, stone pillars
    → Event: "Axe-throwing contest in progress"
    → Bartender rumor: "Deep mines found ancient rune"
    → 4 patrons generated (dwarven smith, stone mason, gemcutter, clan historian)

Players: "We ask the bartender about the ancient rune"
DM: [Generate NPC on tavern staff bartender]
    → Click: "Generate Full NPC Details"
    → Get: Enhanced mannerisms, quirks, wants, avoids, secret
    → Click: "Generate Name" → Select "Borin Ironbrew"
    → Roleplay: Deep voice, strokes beard, wants news from surface,
                secret: knows rune location but fears awakening something

Players: "We buy supplies"
DM: [Opens Shop Generator]
    → Select: Village, General Store, seed: "ironforge-general"
    → Generate: Shopkeeper "Greta Stoneheart" (ironic: squeamish about weapons)
    → Show inventory: 50 ft rope (1 gp), rations (5 sp), bedroll (1 gp)
    
Player: "I haggle for the rope"
DM: → Click: "Negotiate" on rope
    → Show: Persuasion DC 12 (common item)
    → Player rolls: 15
    → Result: Success! 10% discount (9 sp instead of 1 gp)
    → Click: "Add to Character"
    → Select: Player's character
    → Set: Quantity 1, Weight 10 lbs, Not equipped
    → Confirm: Item added to character inventory
```

**Scenario 2: Random Combat Encounter**
```
DM: "You hear growling in the forest..."
    [Opens Encounter Builder]
    → Search: "wolf"
    → Add: 4× Wolf to roster
    → Hover: Preview stat block (AC 13, HP 11, Speed 40 ft, +4 to hit, 2d4+2 piercing)
    → Expand: "Show Details" to see Pack Tactics ability
    → Click: "Download Stat Blocks" → Save reference file
    → Click: "Send to Initiative Tracker"
    → Initiative Tracker opens with 4 wolves pre-loaded

DM: [Rolls initiative for wolves, party rolls theirs]
    → Combat starts
    → Wolf attacks PC → Click damage button → PC takes 7 damage
    → PC drops to 0 HP → Death save tracking activates automatically
    → PC casts Concentration spell → Toggle concentration
    → Enemy damages concentrating PC → Auto-prompt for DC check
    → Reference stat block file on second monitor for wolf abilities
```

**Scenario 3: Unexpected Battle Map Need**
```
Players: "We want to see the tactical layout of this room"
DM: [Opens Battle Map]
    → Upload: Dungeon room image
    → Calibrate: Click two points 30 ft apart → Grid set
    → Place: 4 enemy tokens (goblins) from token library
    → Set: HP 7, AC 15 on each token
    → Paint: Fog of war to hide unexplored areas
    → Persist: "Fireball AoE" measurement (20 ft radius circle, red)
    → Save: Ctrl+S to save session

Players: "We attack!"
DM: → Right-click goblin token → "Add to Initiative"
    → Initiative Tracker opens with form pre-filled:
       Name: "Goblin", HP: 7/7, AC: 15, Initiative: 1d20+2 = 14
    → Submit → Goblin added to tracker
    → Repeat for all 4 goblins (or use Encounter Builder for bulk)
    → Combat proceeds in Initiative Tracker
    → Update HP on tokens as damage occurs
    → Mark "Poisoned" status on token when condition applied
    → 10 ft aura around goblin shaman for "Aura of Protection"
```

### **Mid-Combat**

**Initiative Tracker Operations:**
- **PC takes 15 damage** → Click HP field → Enter -15 → Auto-saves
- **Enemy dies** → Right-click → Remove from combat
- **PC casts Concentration spell** → Toggle concentration (glowing indicator)
- **Concentrating PC takes damage** → Auto-prompt: "Roll CON save DC 13" (max(10, 15÷2))
- **PC drops to 0 HP** → Death save tracking activates automatically
- **Player asks "What's my AC?"** → Check Player View on tablet (AC column hidden for suspense)
- **AoE spell hits 6 enemies** → Click "Bulk HP Adjust" → Filter: Enemies only → Damage: 28 → Apply to all 6
- **Long rest after combat** → Click "Bulk HP Adjust" → Filter: All → Action: Full Heal → All characters restored

**Battle Map Operations:**
- **Token moves** → Drag token (snap to grid if enabled)
- **Measure spell range** → Hold Alt → Drag line → 60 ft displayed → Confirm in range
- **Quick check distance** → Alt+drag to any point → Live distance feedback → Release
- **Create persistent AoE** → Enable "Persistent" toggle → Select Circle shape → Pick red color → Drag from center 4 cells → Circle auto-adjusts to 4.5 cells (20 ft + token size) → Release to create
- **Select measurement** → Click red circle → See "25 ft radius" label and handles
- **Move AoE** → Drag selected measurement to new position
- **Resize AoE** → Drag start or end handle to adjust radius
- **Delete measurement** → Select measurement → Press Delete key
- **Multiple spell zones** → Red circle (Fireball), blue circle (Spirit Guardians), yellow cone (Burning Hands) → Color-coded for easy identification
- **Reveal hidden room** → Switch to Reveal mode → Paint to reveal fog
- **Update token HP** → Right-click token → "HP" → Damage: 10 → HP bar updates
- **Mark condition** → Right-click token → "Status" → Check "Poisoned" → Green skull appears above token
- **Show vision cone** → Right-click token → "Vision" → Angle: 90° → Range: 60 ft → Yellow cone displays
- **Rename token** → Right-click → "Edit Label" → Change "Goblin" to "Goblin Scout"

---

## 🔒 Privacy & Data

**Your data never leaves your browser.**

- ✅ **LocalStorage & IndexedDB only** - No server uploads, no cloud sync
- ✅ **No analytics** - No Google Analytics, no tracking pixels, no heat maps
- ✅ **No cookies** - Except functional LocalStorage and IndexedDB
- ✅ **No accounts** - No email, no password, no profile, no OAuth
- ✅ **No third-party scripts** - Only Bootstrap CSS/JS and SortableJS (both open-source)

### **Export/Import for Backups**

All tools support JSON export for manual backup:
- **Initiative Tracker:** Export encounter as JSON
- **Character Manager:** Export individual characters or full roster as JSON
- **Battle Map:** Export session state (map, tokens, fog, measurements) as JSON
- **Generators:** Seeded RNG allows recreation of exact same output

**Recommended backup workflow:**
1. Export characters monthly to Google Drive / Dropbox
2. Export battle map sessions after each game
3. Use seeded RNG for generator content (no export needed)

### **Data Persistence**

- **Initiative Tracker:** Auto-saves every action (HP changes, adding/removing characters, status effects)
- **Character Manager:** Auto-saves on field change with normalization (spell lists, inventory, attacks)
- **Battle Map:** Manual save system (`Ctrl+S`) with session state and fog preservation
  - Unsaved changes indicator with browser navigation guard
  - IndexedDB storage for map images (50MB-1GB+ capacity)
- **Generators:** Use seeded RNG for reproducibility (no save needed - just remember the seed)

### **Storage Limits**

- **LocalStorage:** ~5-10 MB per domain (character data, settings, small images)
- **IndexedDB:** ~50 MB to 1 GB+ per domain (character portraits, battle maps)
- **Automatic migration:** Legacy localStorage data migrates to IndexedDB on first load
- **Quota monitoring:** Character Manager displays real-time storage usage with color-coded warnings
- **Import fallback:** When quota exceeded, prompts to import without portraits

---

## 🛠️ Development

### **Local Setup**

```bash
# Clone repository
git clone https://github.com/M-ybeme/The-DMs-Toolbox.git
cd The-DMs-Toolbox

# Open in browser (no build step needed)
open index.html          # Opens splash page
# or
open initiative.html     # Opens Initiative Tracker directly

# Or use a local server (optional, recommended for CORS)
python -m http.server 8000
# Navigate to http://localhost:8000
```

### **Browser Requirements**
- **Modern browser** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **LocalStorage enabled** (required for persistence)
- **IndexedDB enabled** (required for portraits and maps)
- **JavaScript enabled** (required for all functionality)
- **~50-100 MB storage available** (for portraits, maps, and session data)

### **Known Limitations**

**By Design:**
- ❌ **No cloud sync** (your data stays local)
  - **Workaround:** Export JSON backups manually to Google Drive / Dropbox
- ❌ **No collaboration features** (single-user only)
  - **Workaround:** Player View is read-only display for transparency, not collaborative editing
  - **Workaround:** Export/import JSON files to share characters between DM and players
- ❌ **No server-side features** (no account system, no online matchmaking)
  - **This is intentional** - privacy and offline functionality are core principles

**Technical:**
- ⚠️ **Storage quota varies by browser** (Chrome: ~1GB, Firefox: ~50MB, Safari: ~100MB)
  - **Solution:** Automatic quota monitoring in Character Manager with warnings
  - **Solution:** Import fallback prompts to exclude portraits when quota exceeded
- ⚠️ **Battle Map performance on very large images** (>4K resolution may lag)
  - **Solution:** Layered canvas architecture with dirty flags (v1.10.6) dramatically improves performance
  - **Recommendation:** Resize maps to 2K or 1080p for optimal performance
- ⚠️ **Mobile Safari quirks** (iOS handles touch events differently)
  - **Solution:** Pointer Events API handles both touch and mouse uniformly
  - **Solution:** Mobile-specific CSS and collapsible sections for small screens

---

## 🤝 Contributing

**This is a personal hobby project**, but feedback is welcome!

### **Bug Reports**
Open an issue on GitHub with:
- **Tool name** (e.g., "Initiative Tracker", "Character Manager", "Battle Map")
- **Browser and version** (e.g., "Chrome 120", "Firefox 115", "Safari 16")
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots** (if applicable)

### **Feature Requests**
Open an issue describing:
- **Problem you're solving** ("I need X because Y happens at my table")
- **How it fits the philosophy** ("DM-focused, no overhead, table-ready")
- **Example use case** ("When players do X, I want to do Y in 10 seconds")

**Note:** Features that require accounts, cloud sync, or subscriptions will not be implemented. This is a privacy-first, offline-first toolkit.

### **Pull Requests**
Currently **not accepting code PRs**, but appreciate the interest! If you want to fork and modify for your own table, go for it (**MIT License**).

**Why no PRs?**
- This is a personal learning project and I want to maintain architectural control
- Adding contributors would require code review overhead I don't have time for
- Forking is encouraged - make it your own!

### **Translations**
Not currently planned, but if there's demand, I'll consider adding i18n support. Open an issue if you'd be willing to translate to your language.

---

## 🙏 Acknowledgments

**Inspired by real tables:**
- Every DM who's juggled 12 initiative scores on scratch paper
- Every player who forgot their spell save DC mid-combat
- Every group that derailed the session asking "what's for sale at the blacksmith?"
- My players who complained about existing character manager options and wanted to avoid paywalls and inspired the Character Manager

**Built with:**
- [Bootstrap 5](https://getbootstrap.com/) — UI framework and responsive grid
- [Bootstrap Icons](https://icons.getbootstrap.com/) — Icon library (900+ icons)
- [SortableJS](https://sortablejs.github.io/Sortable/) — Drag-and-drop functionality
- [D&D 5e SRD API](https://www.dnd5eapi.co/) — Monster database for Encounter Builder
- [Netlify](https://www.netlify.com/) — Hosting and continuous deployment
- [GitHub](https://github.com/) — Version control and project management

**Tested by:**
- My long-suffering players who endured every buggy alpha build
- The dice gods who blessed critical hits at the right moments
- Murphy's Law, which should have ensured every edge case was discovered (fingers croossed)

**Special thanks to:**
- **Open-source community** for Bootstrap, SortableJS, and countless Stack Overflow answers
- **D&D community** on Reddit (r/DMAcademy, r/DnD, r/DnDBehindTheScreen) for feedback and bug reports
- **WotC** for creating D&D and the 5e SRD 

---

## ☕ Support

**This project is free and always will be.**

If you find it useful and want to support continued development:
- ☕ **[Ko-fi](https://ko-fi.com/maybemestoolbox)** - Optional tip jar on the site
- ⭐ **Star the repo** on GitHub
- 🗣️ **Tell your DM friends** - Word of mouth is the best support
- 🐛 **Report bugs** - Help make it better for everyone
- 📝 **Share your stories** - Let me know how you use it at your table!

**No pressure. Seriously.** I built this because I needed it, and I'm sharing it because others might too. If it saves you 10 minutes of prep or helps you improvise when players go off-script, that's reward enough.

If you do donate, know that it goes toward:
- ☕ Coffee for late-night coding sessions
- 📚 D&D books for reference (ironically, I buy physical books while trying to offer free alternatives)
- 🖥️ Hosting costs (Netlify is free but I might upgrade for more bandwidth)

---

## 🔗 Links

- 🌐 **Live Site:** https://dnddmtoolbox.netlify.app/
- 💻 **GitHub:** https://github.com/M-ybeme/The-DMs-Toolbox
- ☕ **Ko-fi:** https://ko-fi.com/maybemestoolbox
- 📋 **Changelog:** [CHANGELOG.md](CHANGELOG.md)
- 📜 **License:** MIT License - see [LICENSE.md](LICENSE.md)

---

## 📊 Project Stats

- **Lines of code:** ~45,000+ (HTML + CSS + JS)
- **Files:** 60+ (pages, scripts, styles, assets)
- **Spells in database:** 432 (PHB, Xanathar's, Tasha's)
- **Races supported:** 33+ (PHB, Volo's, Xanathar's, Eberron, Ravnica, Theros)
- **Classes supported:** 13 (all official classes including Artificer)
- **Subclasses supported:** 114 (PHB, Xanathar's, Tasha's, and more)
- **Feats supported:** 40+ (PHB feats with searchable selection)
- **Development time:** 2+ years (since Feb 2024 pre-alpha)
- **Version:** v2.0.0 (as of January 19, 2026)
- **Coffee consumed:** Immeasurable
- **Hours saved for DMs:** Hopefully thousands

---

## 🎲 Final Words

**The DM's Toolbox exists because:**
1. My players couldn't afford his online character sheet tool of choice ($400+ for full access)
2. I needed quick tools for improvisation when players went off-script
3. I wanted privacy-respecting tools without tracking or subscriptions
4. I believe D&D tools should assist, not railroad

**If you're a DM who:**
- Wings it more than you prep
- Needs NPCs/shops/taverns generated in 10 seconds
- Wants character sheets without paywalls
- Values privacy and offline access
- Hates subscription fatigue

**This toolkit is for you.**

---

**Built with ❤️ for DMs who wing it.**

*See [CHANGELOG.md](CHANGELOG.md) for the latest version and feature updates.*