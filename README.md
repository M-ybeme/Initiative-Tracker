The DM's Toolbox
A comprehensive, browser-based suite of tools for tabletop RPG Game Masters
Built entirely with HTML, CSS, and JavaScript—no frameworks, no accounts, no tracking. All data stored locally in your browser using LocalStorage for instant access, complete privacy, and full offline capability after first load.
Live Site: https://dnddmtoolbox.netlify.app/

🎯 Philosophy
The DM's Toolbox respects your table, your time, and your creativity.

Tools that assist, never railroad — Generate content, don't dictate story
No accounts or tracking — Your data stays in your browser
Free and complete — No paywalls, feature locks, or subscriptions
Table-ready workflow — Built for real sessions, not prep spreadsheets
Cross-tool integration — Encounter Builder → Initiative Tracker with one click

This is a personal hobby project created for GMs who want practical utility without overhead. A Ko‑fi link is available on the site for optional support, but all features are completely free.

✨ Core Tools
🎲 Initiative Tracker
Combat management built for clarity and speed

HP/AC tracking with damage history and undo
Temporary HP with undo support
Concentration tracking with automatic checks
Death saves tracking
Status effects and condition tracking
Turn highlighting with round counter
Player View mode (TV/tablet display with hidden AC)
Import/export encounters (JSON)
Persistent saved characters with unique IDs
Drag-to-reorder initiative
One-click integration with Encounter Builder and Character Manager
Editable names with smart duplicate numbering

Use case: Run combat without juggling notebooks. Track 6 PCs + 12 enemies with damage history, death saves, and concentration—all visible at a glance.

🗺️ Battle Map
Lightweight VTT for maps, tokens, and fog of war

Upload custom maps or use grid overlay
Token management (upload or use 28 built-in presets)
Token labels with persistent name display above tokens
HP tracking with visual HP bars (set/damage/heal/clear)
Status conditions tracking (Poisoned, Stunned, etc.) displayed above tokens
Aura effects with customizable radius circles and colors
Vision cones with adjustable angle and range
Fog of War (reveal/cover with brush tool)
Fog shapes (rectangles/squares) with interactive resize handles
Grid calibration (two-click distance measurement)
Map transform controls (scale, offset, rotation)
Zoom, pan, measure distance
Mobile-friendly (pinch-zoom, touch controls)
Session export/import (preserves fog state and token features)
Manual save system (Ctrl+S) to prevent performance issues
Token placement with snap-to-grid
Drag-and-drop tokens with rotation support

Use case: Upload a dungeon map, calibrate the grid in two clicks, add tokens, reveal rooms as players explore. Works on desktop or tablet at the table.

⚔️ Encounter Builder
Quick encounter assembly with export to Initiative

Searchable monster database with hover tooltips
Rich stat block previews (AC, HP, Speed, CR, abilities, actions)
Expandable stat blocks in encounter roster with "Show Details" button
Special abilities, legendary actions, and reactions display
Attack information with to-hit bonuses, save DCs, and damage
Custom monster support
Drag-to-reorder encounter roster
Direct export to Initiative Tracker
Encounter difficulty estimation
Party level configuration

Use case: Build an encounter with 6 Goblins + 1 Bugbear, click "Send to Tracker"—combat ready in 30 seconds.

👤 Character Manager
Full-featured character sheets for both DM prep and player use

**Character Sheet Features:**
- Full character sheet (stats, saves, skills, HP, AC)
- Portrait system with zoom/pan framing editor
- Spell management with tag/class filtering and custom spell builder (432 spells from PHB/Xanathar's/Tasha's)
- Attack list with modal editor (weapon/spell attacks, damage rolls)
- Spell slot tracking (levels 1-9 + pact slots) with long rest reset
- Expertise support (double proficiency for skills)
- Structured inventory system with encumbrance tracking
- Initiative roller integrated into combat snapshot

**Player-Facing Features:**
- **Character Creation Wizard** - 7-step guided walkthrough for new players
- Interactive dice roller with advantage/disadvantage support
- Explicit advantage/disadvantage buttons (Green/Normal/Red) for all rolls
- Roll buttons for all skills, saves, and attacks with visual color coding
- Separate damage roll controls (to-hit, primary damage, secondary damage)
- Critical hit and half damage buttons for accurate 5e damage calculation
- Roll history panel (last 50 rolls with timestamps, collapsible on mobile)
- HP adjustment buttons (Heal, Damage, Temp HP, Max HP)
- Inspiration and Concentration tracking
- Death save automation (nat 20/1 special handling)
- Automatic concentration DC calculation on damage
- **Mobile-Responsive** - Optimized for phones, tablets, and desktop

**DM-Specific Fields:**
- Party role / table notes
- Story hooks & secrets
- At-the-table reminders

**Additional Features:**
- Tabbed interface (Actions, Spells, Inventory, Features, Background)
- Passive scores (Perception, Investigation, Insight)
- Structured inventory with automatic encumbrance tracking (D&D 5e rules)
- Visual encumbrance status (Normal/Encumbered/Heavily Encumbered/Over Capacity)
- Equipment and attunement tracking
- One-click export to Initiative Tracker
- Import/export JSON (backup or share)
- Multi-character management with dropdown selector
- IndexedDB storage for large portraits (50MB-1GB+ capacity)

**Use cases:**
- **DM Mode:** Track the party—quick reference for passive Perception, spell lists, and story hooks. Export all 4 PCs to Initiative Tracker before combat.
- **Player Mode:** Use as your character sheet during a one-shot or campaign. Click dice buttons to roll skills/saves/attacks, track HP/resources, manage spell slots.

🏪 Shop Generator
Settlement-based economy with comprehensive inventories

Auto-generated shopkeeper NPCs with names and personalities
Personality system with fitting (70%), ironic (20%), and wrong-field (10%) traits
10+ shop types with unique personality variations
Organized item categories (Weapons, Armor, Tools, Adventuring Gear, Magic Items, Consumables)
Settlement economy (Village/Town/Capital pricing)
Rarity gating (Villages don't sell legendary items)
Quality tiers (Rough/Standard/Premium/Masterwork)
Limited stock quantities varying by rarity and settlement size
Settlement-based stock ranges (Village: 5-8, Town: 7-12, Capital: 10-16)
Seeded RNG for reproducible shops
Export/copy/download inventory lists with shopkeeper info

Use case: Players walk into a village blacksmith. Generate inventory (Village, Standard quality, seed: "ironforge-blacksmith"). Shop has mundane weapons, no magic items, village pricing. Return next session—same shop, same inventory.

🍺 Tavern/Inn Generator
Complete establishments in one click

Procedural names (The Prancing Fox, The Golden Anchor)
Menu system (meals + drinks with pricing)
Room listings (6 tiers from common-room cot to suite)
Staff NPCs (proprietor, barkeep, cook, servers with personalities)
Ambience tags (crackling hearth, lamplit, busy at supper)
Settlement/quality scaling (Village rough inn vs Capital fine establishment)
Seeded RNG for return visits

Use case: Players want to stay at an inn. Generate (Town, Cozy, seed: "riverside-inn"). Get name, sign, menu, room prices, staff descriptions. Export as text for notes.

🧙 NPC Generator
Memorable characters without overwhelming detail

Physical description (age, height, build, hair, eyes, attire)
12 height variations (very short to statuesque)
Voice system (tempo, timbre, pitch, accent, delivery, 2 mannerisms per NPC)
Personality (demeanor, ideals, flaws, bonds)
Wants/Avoids (actionable motivations)
NPC secrets system (42 unique secrets across multiple categories)
Secret categories: financial, criminal, hidden knowledge, identity, dark past
Settlement roles (guards, merchants, nobles, clergy)
Seeded RNG for consistency
No forced backstories—just tools for improvisation

Use case: Players ask the bartender a question. Generate NPC (Town, Merchant class). Get: "Middle-aged, sturdy, courteous. Warm voice with local lilt. Wants: news from the road. Mannerism: rubs thumb and forefinger." Run the scene.

💰 Loot Generator
Treasure with flexible generation modes

Hoard vs. Individual loot distinction (large treasure vs pocket loot)
Monster-specific loot templates (9 types: Dragon, Lich, Vampire, Beholder, Giant, Demon/Devil, Fey Noble, Aberration, Undead Horde)
Thematic flavor text and category weighting per monster type
Mundane adventuring items category (20 items: rope, torches, camping gear, tools)
Custom loot table import system (JSON format)
Save/load preset system for common loot configurations
Budget mode (set GP/SP total, auto-generate items)
Preset controls for common loot bundles
Item bundling (3× Potion of Healing)
Settlement/quality scaling for pricing
Magic item rarity (Common → Legendary)
Export/copy lists

Use case: Party defeats a monster. Generate loot bundle. Get: 350 gp, 6 gems (50 gp each), +1 Longsword, Potion of Greater Healing ×2.

📛 Name Generator
Fantasy names with linguistic patterns

Race presets (Human, Elf, Dwarf, Halfling, Orc, etc.)
Surname support (clan names, epithets)
Gender options (masculine, feminine, neutral)
Seeded RNG (reproducible results)
Bulk generation (10 names at once)
Improved input/output clarity

Use case: Need a dwarf NPC name. Generate (Dwarf, masculine, seed: "ironforge"). Get: "Thorin Ironforge". Same seed always gives same name.

🔗 Cross-Tool Integration
The toolkit is designed as interconnected modules, not isolated tools:
┌─────────────────────┐
│ Encounter Builder   │──┐
└─────────────────────┘  │
                         │  One-click
┌─────────────────────┐  │  handoff via
│ Character Manager   │──┼─→ localStorage
└─────────────────────┘  │
                         │
┌─────────────────────┐  │  ┌──────────────────┐
│  Any JSON Import    │──┘──→│ Initiative       │
└─────────────────────┘     │ Tracker          │
                            └──────────────────┘
Example workflow:

Encounter Builder: Design encounter (6 goblins, 1 bugbear)
Click "Send to Tracker" (uses mode: "append" to preserve existing combat)
Character Manager: Export 4 PCs
Click "Send to Initiative Tracker"
Initiative Tracker opens with 11 combatants pre-loaded
Roll initiative, start combat

No copy/paste. No manual entry. Just clicks.

🎨 Design Principles
1. DM-Focused, Not Player-Facing
Tools include fields like "Party Role", "Story Hooks & Secrets", "At-the-Table Reminders"—things DMs need, not what players see on their sheets.
2. Quick Reference Over Deep Simulation
Generate enough detail to be useful, not so much it's overwhelming. An NPC has a voice and motivation, not a 20-page backstory.
3. Seeded RNG for Consistency
Use seeds (e.g., "session-5-blacksmith") to regenerate the same shop, NPC, or tavern across sessions.
4. Settlement Economy Consistency
Village rough inn charges different prices than Capital fine inn. Shop Generator, Tavern Generator, and Loot Generator all use the same economic model.
5. No Forced Narrative
The Encounter Builder builds encounters, but doesn't tell you why these monsters are here. The NPC Generator gives you personality, not plot.

🚀 Tech Stack
TechnologyPurposeHTML5 / CSS3 / JavaScriptPure vanilla JS, no frameworksBootstrap 5.3Responsive layout and componentsLocalStorage APIAll persistence (no backend)Canvas APIBattle Map renderingPointer Events APITouch + mouse supportSortableJSDrag-and-drop functionalityNetlifyHosting and continuous deploymentGitHubVersion control
Why no frameworks?

Faster load times (no build step)
Easier to audit (view-source to see everything)
Educational (demonstrates vanilla JS patterns)
Smaller bundle size


📁 Project Structure
The-DMs-Toolbox/
├── index.html              # Initiative Tracker
├── battlemap.html          # Battle Map VTT
├── encounterbuilder.html   # Encounter Builder
├── characters.html         # Character Manager
├── shop.html               # Shop Generator
├── tav.html                # Tavern/Inn Generator
├── npc.html                # NPC Generator
├── loot.html               # Loot Generator
├── name.html               # Name Generator
│
├── css/
│   ├── site.css            # Global styles
│   └── initiative.css      # Tracker-specific styles
│
├── js/
│   ├── site.js             # Shared utilities
│   ├── initiative.js       # Initiative Tracker logic
│   ├── character.js        # Character Manager logic
│   ├── spells-data.js      # Spell database (432 spells from PHB/Xanathar's/Tasha's)
│   ├── rules-data.js       # Rules reference data
│   └── indexed-db-storage.js  # IndexedDB storage system
│
├── images/
│   ├── playerTokens/       # 14 class tokens
│   ├── enemyTokens/        # 14 creature type tokens
│   ├── BGMap.png           # Background texture
│   ├── dndFavicon.png      # Site favicon
│   └── White logo.png      # Footer logo
│
├── LICENSE.md              # MIT License
├── CHANGELOG.md            # Version history
└── README.md               # This file

🎯 Use Cases
Pre-Session Prep
1. Encounter Builder: Design 3 encounters for dungeon
2. Shop Generator: Create village merchant inventory
3. Tavern Generator: Build the inn where players will stay
4. NPC Generator: Create 5 NPCs (guards, innkeeper, quest giver)
5. Character Manager: Update PC stats and story hooks
6. Export everything to JSON for backup
At the Table (Improvisation)
Players: "We go to a tavern"
DM: [Generate tavern, Town, Cozy] → Read name, ambience, menu

Players: "We ask the bartender about the missing caravan"
DM: [Generate NPC, Town, Merchant] → Voice: warm, mid-range, local lilt
                                    → Wants: news from the road

Players: "We buy supplies"
DM: [Generate shop, Village, Standard, seed: "ironforge"] → Read inventory

Players: "We attack the goblins!"
DM: [Encounter Builder already has 6 goblins ready]
    → Click "Send to Tracker" → Roll initiative
Mid-Combat
Initiative Tracker:
- PC takes 15 damage → Update HP (auto-saves)
- Enemy dies → Right-click → Remove
- PC casts Concentration spell → Toggle concentration (auto-checks on damage)
- PC drops to 0 HP → Automatic death save tracking
- Player asks "What's my AC?" → Check Player View on tablet

🔒 Privacy & Data
Your data never leaves your browser.

LocalStorage & IndexedDB only — No server uploads, no cloud sync
No analytics — No Google Analytics, no tracking pixels
No cookies — Except functional LocalStorage and IndexedDB
No accounts — No email, no password, no profile

Export/Import for backups:

All tools support JSON export
Save exports to your own storage (Google Drive, Dropbox, etc.)
Import anytime to restore

Data persistence:

Initiative Tracker: Auto-saves every action
Character Manager: Auto-saves on change with field normalization (IndexedDB for portraits)
Battle Map: Manual save system (Ctrl+S) with session state and fog preservation (IndexedDB for map images)
Generators: Use seeded RNG for reproducibility


🛠️ Development
Local Setup
bash# Clone repository
git clone https://github.com/M-ybeme/The-DMs-Toolbox.git
cd The-DMs-Toolbox

# Open in browser (no build step needed)
open index.html

# Or use a local server (optional)
python -m http.server 8000
# Navigate to http://localhost:8000
```

### **Browser Requirements**
- **Modern browser** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **LocalStorage enabled** (required for persistence)
- **JavaScript enabled** (required for all functionality)
- **~50MB LocalStorage available** (for portraits and session data)

### **Known Limitations**
- **IndexedDB storage** (50MB-1GB+ capacity depending on browser)
  - Character portraits and battle map data stored in IndexedDB
  - Automatic migration from legacy localStorage on first load
  - Import fallback prompts when storage quota exceeded
- **No cloud sync** (by design)
  - Workaround: Export JSON backups manually
- **Single-user** (no collaboration features)
  - Player View is read-only display, not collaborative editing

---

## 🤝 Contributing

**This is a personal hobby project**, but feedback is welcome!

### **Bug Reports**
Open an issue with:
- Tool name (e.g., "Initiative Tracker")
- Browser and version (e.g., "Chrome 120")
- Steps to reproduce
- Expected vs actual behavior

### **Feature Requests**
Open an issue describing:
- Problem you're solving
- How it fits the "DM-focused, no overhead" philosophy
- Example use case

### **Pull Requests**
Currently **not accepting code PRs**, but appreciate the interest! If you want to fork and modify for your own table, go for it (MIT License).

---

## 🙏 Acknowledgments

**Inspired by real tables:**
- Every DM who's juggled 12 initiative scores on scratch paper
- Every player who forgot their spell save DC mid-combat
- Every group that derailed the session asking "what's for sale at the blacksmith?"

**Built with:**
- [Bootstrap 5](https://getbootstrap.com/) — UI framework
- [Bootstrap Icons](https://icons.getbootstrap.com/) — Icon library
- [SortableJS](https://sortablejs.github.io/Sortable/) — Drag-and-drop
- [Netlify](https://www.netlify.com/) — Hosting

**Tested by:**
- My long-suffering players who endured every buggy alpha build

---

## ☕ Support

**This project is free and always will be.**

If you find it useful and want to support continued development:
- ☕ [Ko-fi link on the site](https://ko-fi.com/maybemestoolbox)
- ⭐ Star the repo
- 🗣️ Tell your DM friends

**No pressure.** Seriously. Just glad it's useful.

---

## 📄 License

**MIT License** — See [`LICENSE.md`](./LICENSE.md)
```
Copyright (c) 2025 Maybeme (M-ybeme)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies, provided this notice is included in all copies.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
TL;DR: Use it, modify it, share it. Just keep the license notice.

🔗 Links

Live Site: https://dnddmtoolbox.netlify.app/
GitHub: https://github.com/M-ybeme/The-DMs-Toolbox
Ko-fi: https://ko-fi.com/maybemestoolbox
Changelog: CHANGELOG.md


Built with ❤️ for DMs who wing it.
Last updated: 2025-12-09 (v1.8.5)