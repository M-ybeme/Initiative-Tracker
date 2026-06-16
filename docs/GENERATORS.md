# Generators Documentation

This document provides comprehensive information about all generator tools in The DM's Toolbox: Loot, Tavern, NPC, Name, and Shop generators.

## Overview

The DM's Toolbox includes five interconnected generators for creating D&D 5e content: Loot, Tavern, NPC, Name, and Shop generators. These tools feature cross-generator integration, preset systems, and extensive customization options.

### SRD Scope

- Magic items, scrolls, and spell scroll metadata in the Shop/Loot generators reference only SRD 5.2 (2024 PHB) entries by default.
- NPC templates avoid quoting non-SRD lore verbatim; flavorful text is original copy.
- Private content packs can inject additional datasets (e.g., custom spell scrolls) without touching the repository, and the generators will merge them automatically once registered with `SRDContentFilter.registerPrivateContent()`.

## Table of Contents

- [Loot Generator](#loot-generator)
- [Tavern Generator](#tavern-generator)
- [NPC Generator](#npc-generator)
- [Name Generator](#name-generator)
- [Shop Generator](#shop-generator)
- [Cross-Generator Integration](#cross-generator-integration)

---

## Loot Generator

### SRD Scope

The preset tables, magic item blurbs, and scroll payloads all come from SRD 5.2 references or original descriptions. Keep any mention of non-SRD treasure (e.g., named artifacts, adventure-specific loot) in private packs; the default generator should only emit SRD-friendly text and generic flavor.

### Cursed Items System (v1.10.9)

**50 Cursed Items with Risk/Reward Mechanics:**
- Items feature appealing benefits with hidden drawbacks
- Example: Boots of haste (+10 ft movement but 1d4 slip chance)
- All items appear as masterwork quality to tempt players
- Visual distinction: red borders, warning icons, "CURSED" labels

**5 Severity Levels:**
- **Level 1-2**: Flavor/minor annoyances
  - Example: Charming brooch that makes you compliment strangers
- **Level 3**: Balanced trade-offs
  - Example: Keen dagger (+1 hit/damage but killing blow damages self)
- **Level 4-5**: Strong benefits with serious consequences
  - Example: Bloodthirsty blade requires daily use

**Curse Severity Slider:**
- Dynamic difficulty control (1-5 scale)
- Only visible when cursed items toggle enabled
- Filters cursed items by severity level

**Cursed Items Toggle:**
- Enable/disable cursed item generation
- Auto-included when enabled (like Minor Magic)
- Integrated with monster templates:
  - Lich: 1.5x curse rate
  - Demon: 1.4x curse rate
  - Undead: 1.3x curse rate
- Saved/loaded with custom presets

**Results Display:**
- Cursed item counter in metadata pills
- Category hints mention cursed items auto-inclusion

### Quick Bundle Presets (v1.9.2)

**8 One-Click Bundles:**

1. **Pocket Loot** (~50 gp)
   - Individual loot: coins + mundane items
   - 5 items

2. **Coin Pouch** (200-500 gp)
   - Coins only bundle
   - Budget mode

3. **5 Gems** (~500 gp)
   - Gem collection
   - 5 items, 50-200 gp each

4. **Potion Bundle**
   - 3 potions
   - Category: Potions & Elixirs

5. **Scroll Bundle**
   - 3 scrolls
   - Category: Arcane Scrolls

6. **Boss Hoard** (~2000 gp)
   - Full treasure pile
   - 50 items, budget mode
   - Gems, coins, trade goods, magic items

7. **Cursed Items** (v1.10.9)
   - 6 cursed items with balanced severity
   - Broad category base
   - Red button with warning icon

8. **Magic Items** (v1.10.9)
   - 8 minor magic items
   - High usefulness bias
   - Broad category mix

**Features:**
- Auto-configuration (mode, type, count, budget, categories)
- One-click generation without manual settings
- Settings remain visible for customization
- Visual bundle grid (2×4 layout)
- Color-coded buttons with icons
- Value estimates displayed

### Hoard Templates (v2.2.9)

**8 Hoard Templates** (Advanced mode → Hoard Template dropdown):

- **Bandit cache** — Coins heavy, weapons boosted (1.3×), trade goods
- **Cult sanctum** — Writing/books, gems, ritual tools; weapons slightly depressed
- **Noble vault** — Gems (1.4×), fine clothing, coins; weapons rare
- **Goblin den** — Food, crude tools, weapons (1.2×); gems rare
- **Ship cargo** — Trade goods (1.3×), toolkits, weapons (cutlasses, boarding axes)
- **Wizard's study** — Books, toolkits, adventuring gear; weapons minimal
- **Tomb / burial chamber** *(v2.2.9)* — Grave goods: gems, clothing, curios, weapons (1.2×); food almost absent; aged flavor text
- **Barracks / guard post** *(v2.2.9)* — Weapons heavily weighted (2.2×), mundane gear, rations; gems/curios suppressed

### Monster-Specific Loot Templates (v1.8.4)

**9 Monster Types:**

1. **Dragon**
   - Favors: Gems (2.0x), Coins (1.8x), Magic items
   - Flavor: "scorched edges", "melted slightly"

2. **Lich**
   - Favors: Books (1.8x), Gems (1.4x), Magic (1.6x)
   - Flavor: "necromantic runes", "bone-white"

3. **Vampire**
   - Favors: Gems (1.6x), Clothing (1.5x), Coins (1.4x)
   - Flavor: "blood-stained", "aristocratic"

4. **Beholder**
   - Favors: Gems (1.7x), Curios (1.5x), Magic (1.8x)
   - Flavor: "alien geometry", "prismatic"

5. **Giant**
   - Favors: Food (1.5x), Trade Goods (1.4x), Mundane (1.3x)
   - Flavor: "oversized", "massive scale"

6. **Demon/Devil**
   - Favors: Gems (1.5x), Magic (1.7x), Curios (1.4x)
   - Flavor: "sulfurous", "infernal script"

7. **Fey Noble**
   - Favors: Curios (1.8x), Gems (1.5x), Magic (1.6x)
   - Flavor: "rainbow-hued", "moonlit"

8. **Aberration**
   - Favors: Curios (1.6x), Writing (1.4x), Magic (1.5x)
   - Flavor: "otherworldly", "mind-bending"

9. **Undead Horde**
   - Favors: Coins (1.3x), Gems (1.2x), Clothing (1.2x)
   - Flavor: "grave-touched", "centuries-old"

**Template System:**
- Monster selection overrides hoard template
- Thematic consistency
- Category weighting multipliers
- Custom flavor text

### Per-Item Reroll (v2.2.9)

Every generated loot tile has a small **🎲 dice icon** in its top-right corner. Clicking it rerolls only that item from the same category, using the current generation settings, while keeping the rest of the list intact. Useful for swapping out unwanted results without regenerating everything.

### Markdown Export (v2.2.9)

The **Download .md** button exports the current loot list as a structured Markdown file, grouped by category, with bold item names and gp values. Ideal for Obsidian, Notion, Homebrewery, or any Markdown-based session notes tool. Complements the existing plain-text .txt export.

### Loot Categories (v1.8.8, v1.8.4, v2.2.9)

**Full Category List (17 categories):**

1. Coins & Purses
2. Trade Goods
3. Gems & Art
4. Adventuring Gear of Note
5. Toolkits & Supplies
6. Clothing & Wearables
7. Tools & Utensils
8. Household & Table
9. Writing & Games
10. Food & Provisions
11. Curios & Charms
12. Potions & Elixirs
13. Arcane Scrolls
14. Bags & Containers
15. Mundane Adventuring Items
16. **Weapons & Armor** *(v2.2.9 — new)*
17. Minor Magic *(toggle-gated)*
18. Cursed Items *(toggle-gated)*

**Expanded Categories:**

**Weapons & Armor** *(v2.2.9 — 340 entries)*
- **28 weapon types**: dagger, shortsword, longsword, handaxe, battleaxe, greataxe, greatsword, mace, warhammer, war pick, flail, rapier, scimitar, glaive, halberd, spear, javelin, trident, sickle, club, greatclub, shortbow, longbow, light crossbow, hand crossbow, whip, net, quarterstaff
- **14 armor types**: leather, padded, studded leather, chain shirt, chain mail, ring mail, scale mail, hide, gambeson, breastplate, half plate, shield, buckler, wooden shield
- **10 condition variants** each: battered, rusty, dented, battle-worn, field-repaired, well-maintained, polished, quality, notched, scarred
- **Material-aware naming**: generates "Battle-worn iron longsword", "Polished yew longbow", "Quality bronze shield"
- **Template integration**: bandit (1.3×), goblin/ship/tomb (1.1–1.2×), barracks (2.2×), wizard (0.7×)
- **Monster integration**: giant (1.3×), undead (1.1×)

**Trade Goods** (6 → 14 items)
- Original: silk, spices, fine wine, furs, jewels, rare herbs
- Added: barrel of aged wine, exotic tea leaves, coffee beans, fine tobacco, spider silk, rare pigments, exotic incense

**Gems & Art** (5 → 13 items)
- Original: ruby, emerald, sapphire, diamond, pearl
- Added: ornate music box, jeweled hair comb, crystal prism, carved ivory cameo, gilded portrait frame, polished jade figurine, silver filigree locket, painted porcelain vase

**Minor Magic Items** (8 → 47 items)
- **Healing & Recovery** (4): Tonic of Vigor, Salve of Mending, Restorative Tea, Vial of Clarity
- **Combat & Defense** (7): Smoke Charm, Oil of Edge, Warding Ribbon, Shield Charm, Thunderstone, Flash Powder, Tanglefoot Bag
- **Movement & Utility** (5): Feather Token, Boots of Springing, Potion of Water Breathing, Dust of Tracelessness, Feather Fall Token
- **Social & Luck** (4): Lucky Coin, Charm of Persuasion, Vial of Courage, Token of Truth
- **Exploration** (5): Guide's Pin, Wayfinder's Compass, Lens of Detection, Ear Trumpet of Listening, Dowsing Rod
- **Knowledge & Magic** (5): Scribe's Quill, Scholar's Monocle, Candle of Revealing, Chalk of Warding, Crystal of Light
- **Tools & Craft** (4): Hammer of Mending, Rope of Climbing, Thieves' Gloves, Bag of Endless Knots
- **Nature & Animals** (3): Beast Whistle, Druid's Seed, Weatherglass
- **Ongoing Items** (8): Everburning Torch, Self-Heating Mug, Cleaning Cloth, Compass of True North, Tankard of Purity, Prestidigitation Ring, Warming Cloak Clasp, Cooling Hat Pin

**Mundane Adventuring Items** (20 items)
- Essential gear: 50 ft rope, torches, bedroll, rations
- Light sources: candles, tinderbox, hooded lantern, oil flask
- Tools: grappling hook, crowbar, 10 ft pole, chalk, iron spikes
- Camping: tent, backpack, shovel
- Tactical: caltrops, chain, fishing tackle, signal whistle

### Loot Modes (v1.8.4)

**Hoard Mode:**
- Large treasure piles
- Full budget and item count
- Dragon hoards, boss rewards

**Individual Mode:**
- Pocket loot
- ~10% of items/budget
- Single-creature drops
- Automatic scaling adjustments

### Custom Systems (v1.8.4)

**Custom Loot Table Import:**
- Import custom JSON loot tables
- File picker interface
- Define custom categories, templates, rules
- Dropdown selector for active table
- Multiple tables in same session
- JSON format: `{ "name": "...", "categories": {...}, "template": {...} }`

**Save/Load Preset System:**
- Save all settings with custom name
- Browser localStorage persistence
- Saves: mode, type, count, budget, monster/template, toggles, categories
- Dropdown selector
- One-click preset loading

---

## Tavern Generator

### SRD Scope

Even though each cultural profile has tons of detail, every menu item, rumor, and NPC hook uses original text or SRD terminology. If you need setting-specific references (named cities, factions, etc.), layer them in via private packs or local overrides rather than editing this doc or the public data file.

### Cultural Immersion System (v1.10.5)

**7 Cultural Tavern Types:**
- Dwarven Ale Hall
- Elven Wine Garden
- Halfling Hearth House
- Orcish Mead Hall
- Coastal Shanty
- Desert Oasis Inn
- Mountain Lodge

**Cultural Patron Types** (7 per culture, 56 total)
- **Dwarven**: smith, stone mason, mining foreman, gemcutter, brewmaster's apprentice, clan historian, tunnel engineer
- **Elven**: musician, forest warden, scroll keeper, arcane botanist, weaver of moonsilk, star reader, vintner's assistant
- **Halfling**: baker, pipeweed merchant, comfort chef, quilting circle member, family patriarch, storytelling grandmother, pie contest judge
- **Orcish**: war-scarred veteran, beast trainer, tribal emissary, wrestling champion, honor guard, clan armorer, raiding party member
- **Coastal**: weathered sailor, net mender, ship's carpenter, pearl diver, tide caller, fishmonger, lighthouse keeper
- **Desert**: caravan master, spice merchant, sand guide, oasis keeper, nomad trader, water diviner, silk road traveler
- **Mountain**: mountain guide, avalanche survivor, fur trapper, alpine shepherd, lodge keeper, ice climber, ranger from the peaks

**Cultural Events** (3-4 per culture, 28 total)
- **Dwarven**: axe-throwing contests, mining debates, clan disputes, forge technique comparisons
- **Elven**: haunting flute melodies, poetry battles, Feywild tales, portrait sketching
- **Halfling**: pie-eating contests, recipe sharing, pipeweed tastings, children playing
- **Orcish**: wrestling matches, scar comparisons, drinking contests, arm-wrestling
- **Coastal**: sea shanties, unusual catches, crew recruitment, sailing debates
- **Desert**: spice demonstrations, sandstorm stories, ancient tales, caravan trading
- **Mountain**: avalanche warnings, fur trading, blizzard stories, beast encounters

**Cultural Bartender Rumors** (4 per culture, 28 total)
- **Dwarven**: gem veins, brew experiments, deep mines, master smiths
- **Elven**: forest mysteries, ancient groves, rare wines, Feywild lights
- **Halfling**: harvest festivals, legendary recipes, pipeweed blends, special feasts
- **Orcish**: beast hunts, wrestling champions, war party returns, honor missions
- **Coastal**: strange cargo, unusual fishing, underwater lights, missing vessels
- **Desert**: revealed ruins, oasis mysteries, new routes, rare spices
- **Mountain**: snowed passes, unmapped caves, avalanche activity, unique pelts

**Cultural Patron Rumors** (4 per culture, 28 total)
- **Dwarven**: forging secrets, clan disputes, ancient runes, legendary brews
- **Elven**: starlight wines, Feywild encounters, tree warnings, unknown grapes
- **Halfling**: recipe theft, pie secrets, ancient relatives, legendary dishes
- **Orcish**: championship challenges, war drums, cursed weapons, honor debts
- **Coastal**: sea serpents, smuggler caves, mutinies, strange fish
- **Desert**: caravan disappearances, dry oases, exposed treasures, sand witches
- **Mountain**: missing climbers, angry spirits, hermit secrets, strange howls

**Cultural Ambiance Tags** (8 per culture, 56 total)
- **Dwarven**: forge-warmed, stone pillars, ale-soaked tables, carved clan symbols, brass tankards clanging
- **Elven**: moonlight filtering, silver-threaded curtains, living wood furniture, crystal chimes tinkling
- **Halfling**: hearth-fire crackling, pie-scented air, family portraits, children's laughter echoing
- **Orcish**: battle trophies mounted, skull decorations, war drums, combat circle cleared
- **Coastal**: salt air drifting, driftwood furniture, fishing nets hanging, ship bell at bar
- **Desert**: silk drapes flowing, spice-scented air, brass lanterns gleaming, water fountains trickling
- **Mountain**: bear pelts on walls, snowshoes displayed, trophy antlers mounted, frost on windows

**Cultural Staff Descriptors:**
- Custom attire (clan vests, moonsilk, battle leather, salt-stained gear)
- Cultural demeanor (stone-steady, ethereal, honor-bound, superstitious)
- Unique manners (strokes beard, moves with grace, maintains eye contact, checks wind)
- Cultural accents (mountain burr, lyrical, guttural, sailor's drawl)

### Expanded Cultural Menus (v1.10.8)

**4-5x Menu Expansion:**

**Dwarven Ale Hall**
- Food: 4 → 16 items
- Drinks: 5 → 19 options
- Examples: Ironbeard's meat platter, Tunnel rat skewers, Battlehammer beef ribs, Clan mother's dumplings
- Drinks: Ironfoot porter, Granite grey ale, Firebeard brandy, Deepvault red, Mountain honey mead

**Elven Wine Garden**
- Food: 4 → 18 items
- Drinks: 5 → 20 options
- Examples: Twilight venison medallions, Moonlight pasta, Whisperwind quail, Crystalbrook trout
- Drinks: Twilight red, Moonpetal sparkling, Starfall pear cider, Moonflower liqueur, Silverleaf tea

**Halfling Hearth House**
- Food: 4 → 19 items
- Drinks: 5 → 19 options
- Examples: Elevensies tea sandwiches, Grandmother's chicken pot pie, Buttermilk fried chicken, Blackberry cobbler
- Drinks: Sunny day golden ale, Strawberry fields cider, Dandelion wine, Fresh-squeezed lemonade

**Orcish Mead Hall**
- Food: 4 → 19 items
- Drinks: 4 → 17 options
- Examples: Skullcrusher ribs, Warchief's bone soup, Battle-won venison steaks, Victory feast brisket
- Drinks: Skullcrusher stout, Warlord's whiskey, Blood liquor, Honey war mead, Bull's blood (beet juice)

**Coastal Shanty**
- Food: 4 → 20 items
- Drinks: 3 → 18 options
- Examples: Grilled lobster tail, Crab cakes, Seafood paella, Tuna steak rare, Seafarer's sampler
- Drinks: Navy grog, Shipwreck whiskey, Coastal white, Harbor golden ale, Ginger beer

**Desert Oasis Inn**
- Food: 4 → 20 items
- Drinks: 5 → 18 options
- Examples: Merguez sausage, Shakshuka, Bedouin roasted goat, Kofta platter, Maqluba
- Drinks: Tamarind juice, Hibiscus tea, Date milk, Arak, Fig brandy, Oasis lager

**Mountain Lodge**
- Food: 4 → 21 items
- Drinks: 4 → 21 options
- Examples: Roasted wild boar, Venison steaks, Bear meat roast, Raclette platter, Hiker's mixed grill
- Drinks: Alpine whiskey, Glacier vodka, Summit amber, Peak porter, Wildflower mead, Pine needle tea

**Impact:**
- Greater thematic authenticity
- Reduced repetition across generations
- Unique generation results

### Context & Metrics System (v1.10.2)

**UI Controls:**
- Time-of-day selector
- Tavern-type selector
- Context Influence slider (0-100)

**Boosted Pool System:**
- Weight context-specific pools vs base pools
- Slider at 0: omit context entirely
- Guarantees at least one context-specific item when context exists

**Context Pool Expansion:**
- Patron types
- Quirks
- Hooks
- Events
- Bartender/patron rumors

**Metrics Tooling:**
- `simulate_tavern_metrics.py` script
- Extracts literal pools from tav.html
- Monte Carlo trials
- Measures context share and item frequency
- Outputs `sim_metrics.json`

**Technical:**
- Seeded RNG handling
- PRNG parity for deterministic simulations
- Boosted pool growth cap to prevent runaway growth

### Patron System (v1.9.2)

**Random Patron Generation:**
- Generates 3-5 patrons per tavern
- "Patrons in the Common Room" section
- Toggle: "Include patrons (3-5 NPCs)" checkbox

**27 Patron Types:**
- local regular, traveling merchant, off-duty guard, farmer, craftsperson, sellsword, pilgrim, gambler, scholar, miner, sailor, thief, hedge witch, bounty hunter, and more

**22 Visual Quirks:**
- missing finger, scar across cheek, nervous twitch, tattoo, eye patch, gold tooth, limping, polishing coin, chewing pipe, fidgeting with cards, etc.

**27 Activity Hooks:**
- looking for work, celebrating windfall, drowning sorrows, meeting someone secretly, seeking adventurers, playing dice, telling tall tales, eavesdropping, spreading news, etc.

**Compact Card Layout:**
- Type/age/build
- Appearance quirk
- Current activity
- Grid display (3 columns desktop, 2 tablet, 1 mobile)
- Visual activity icon

---

## NPC Generator

### SRD Scope

Ancestries, stat suggestions, and presets are limited to SRD options by default. Additional ancestries or NPC archetypes from other books can be merged through private packs, but keep the shipped presets SRD-compliant.

### Combat Stat Block System (v1.9.2)

**5-Tier Difficulty System:**

1. **Tier 1: Commoner** (CR 0-1/8)
   - Weak, untrained individuals

2. **Tier 2: Trained** (CR 1/4-1)
   - Basic combat training

3. **Tier 3: Veteran** (CR 2-4)
   - Experienced fighters

4. **Tier 4: Elite** (CR 5-8)
   - Skilled warriors

5. **Tier 5: Legendary** (CR 9-15)
   - Master combatants

**17 Combat Specialties:**

**Common Folk:**
- Commoner, Laborer, Farmer, Merchant

**Trained Fighters:**
- Guard, Soldier, Scout, Thug, Bandit

**Skilled Combatants:**
- Veteran, Knight, Monk

**Spellcasters:**
- Mage, Priest

**Elite/Legendary:**
- Assassin, Champion, Archmage

**Complete Stat Block:**
- Auto-calculated HP (randomized within tier range)
- Auto-calculated AC (randomized within tier range)
- Auto-scaled ability scores by tier (+0/+2/+4/+6/+8 for tiers 1-5)
- All ability modifiers (STR, DEX, CON, INT, WIS, CHA)
- Speed (30 ft base, 40 ft Scout/Monk, 25 ft Knight)
- Proficiency bonus by tier (+0 to +4)
- Specialty-specific attacks and traits

**Interactive Modal UI:**
- "Generate Stats" button on each NPC card
- Tier and specialty selection dropdowns
- Live specialty description preview
- One-click stat block generation
- Formatted D&D output

**Copy Functionality:**
- Individual "Copy" button after generation
- Copies full NPC (description + voice + stats)
- Professional stat block formatting

---

## Name Generator

### SRD Scope

The default race lists and syllable banks live entirely in SRD-friendly territory or bespoke wordlists. When distributing new race presets that cite closed content, do it through packs so the public repo stays SRD-only.

### Race Support

**28 distinct race styles across 4 groups:**

| Group | Races |
|-------|-------|
| **Common** | Human (Latin), Human (Norse), Human (Arabic), Human (Asian), Dwarf, Elf, Halfling, Gnome |
| **Uncommon** | Dragonborn, Half-Orc, Tiefling, Drow, Goliath, Firbolg, Genasi, Triton, Aarakocra, Tabaxi, Kenku |
| **Monstrous** | Orc, Goblin, Hobgoblin, Kobold, Lizardfolk, Bugbear, Yuan-ti |
| **Special** | Fey, Changeling, Warforged |

**Per-race preset system:**
- Each race has a preset covering: min/max syllables, gender leaning, harshness, exoticness, apostrophe probability, diacritic probability, and a curated race-suffix list
- Click **Apply Race Preset** after selecting a race to instantly configure all sliders and toggles to match that culture's naming conventions
- Six **quick-select buttons** (Elf, Dwarf, Human, Orc, Dragonborn, Tiefling) apply the preset in one click — no dropdown needed for the most common races

**Special name handling:**
- **Tabaxi**: compound noun-style names (e.g., "Cloud on Mountains")
- **Warforged**: mechanical/alphanumeric names
- **Drow**: high apostrophe and double-consonant frequency

### Generation Settings

**Simple mode** (default — visible immediately):
- Race / Culture selector with 4 optgroups
- Apply Race Preset button
- Count (1–500) with **quick-count chips**: tap 5 / 10 / 20 / 50 to set instantly
- Gender leaning: Neutral / Feminine / Masculine

**Advanced mode** (toggle in the panel header):
- **Seed** — any string produces deterministic output; same seed + same settings = same list, shareable via the Share button
- **Min / Max syllables** — override the race preset's syllable range
- **Alliteration** — enter a letter to force all names to start with it
- **Harshness slider** (0–100) — increases consonant clusters (kr, gr, zz)
- **Exoticness slider** (0–100) — increases apostrophes and diacritics (á, ê, ü)
- **Race suffix** toggle — appends race-specific endings ~35% of the time
- **Apostrophes** toggle — allows mid-name apostrophes
- **Diacritics** toggle — sprinkles accent marks over vowels
- **Surname** toggle — generates two-part names; exposes surname-style dropdown and joiner string (space, hyphen, apostrophe, "of ", etc.)
- **Custom Tables** — paste JSON to import custom syllable banks; validate before importing; export current tables as JSON

### Per-Tile Actions

Each generated name tile has four controls:

| Control | How to trigger | What it does |
|---------|----------------|--------------|
| 🔒 **Lock** | Click the faint lock icon (top-right corner of tile) | Pins this name — it survives the next Generate and re-generate fills only unlocked slots. Gold border indicates locked. Click again to unlock. |
| 📋 **Copy** | Click clipboard icon | Copies this name to clipboard |
| ⭐ **Favorite** | Click star icon | Adds name to the Favorites drawer |
| ↻ **Re-roll** | Click repeat icon, or double-click the tile | Generates a single new name in that slot using the current config. Locked tiles cannot be re-rolled. |

### Lock & Regenerate Workflow

Generate 20 names → lock 3 you like → click Generate again → the 3 locked names stay in place, 17 new names fill the remaining slots. Locked names are never overwritten by re-roll or regenerate. Click the lock icon again to release a name.

### In-Results Filter

A search bar appears above the results grid once names have been generated. Type to filter the current list in real time — tiles whose names don't match are hidden (not removed). Clear the filter to restore all tiles. The filter does not trigger a new generation.

### Favorites

- Click ⭐ on any tile to add its name to the **Favorites drawer** (top-right nav button)
- Favorites persist in `localStorage` across sessions
- Drawer actions: **Copy all** (newline-separated), **Copy individual**, **Remove individual**, **Clear all**

### Keyboard Shortcut

Press **Enter** anywhere on the page (when not focused inside a form field) to instantly trigger Generate. Useful for rapid iteration when you know your settings are right.

### Session Persistence & Sharing

- Settings and current results auto-save to `localStorage` on every generate
- Reloading the page restores your last settings and result list
- **Share** button (top nav) copies a URL with all current settings encoded as query parameters — anyone opening the link sees the same configuration (but not locked state)

### NPC Integration

When the NPC Generator's "Generate Name" button is used, it opens the Name Generator in a new tab with `?from=npc&race=<RaceName>` — the race preset is automatically applied and a success banner confirms which race was loaded.

### Custom Table Import

Advanced users can inject custom syllable tables:

```json
{
  "Styles": {
    "Wizard's Study": {
      "start": ["ar","el","io","ka"],
      "mid":   ["ca","el","ith","or"],
      "end":   ["ion","iel","oth","ar"]
    }
  }
}
```

- **Validate** — checks structure without importing
- **Import** — merges into existing styles; new style appears in the dropdown immediately
- **Export** — downloads the full current tables as `name-tables.json`

---

## Shop Generator

### SRD Scope

Shop inventories pull from SRD magic items, consumables, and adventuring gear plus original descriptions. Leave any non-SRD goods in downstream packs and keep this documentation focused on the SRD subset.

### Settlement Types

Three settlement tiers drive pricing, stock depth, and rarity availability:

| Settlement | Price Range | Stock Range | Rare Chance | Unique Item % |
|------------|-------------|-------------|-------------|---------------|
| Village    | ×1.10–1.35  | 5–8/shop    | Low (2%)    | 15%           |
| Town       | ×0.95–1.15  | 7–12/shop   | Mid (8%)    | 25%           |
| Capital    | ×0.85–1.20  | 10–16/shop  | High (15%)  | 40%           |

Settlement also affects shopkeeper rumors (local gossip in villages vs. guild politics in capitals) and restock timers.

### Presets

Three built-in presets configure which shop types are enabled and set rarity/unique defaults:

- **Core (common town)** — 12 everyday shops: General Goods, Grocer, Inn/Tavern, Tailor, Cobbler, Blacksmith, Stables, Carpenter, Farrier, Fabric Shop, Messenger, Bookshop
- **Adventurer's Hub** — 11 shops with magic focus; forces rare items allowed, 30% unique chance
- **Shady Bazaar** — 7 shops: Black Market, Pawn Shop, Oddities, Fortune Teller, Clockwork Repair, Pet Shop, Adventuring Gear; forces rare items, 35% unique chance

Selecting a preset auto-checks the right shop types and tweaks knobs; everything remains adjustable after.

### Shop Types (35+)

All shop types, their inventory categories, and their keyword buy-affinities (used by Sell to Shop):

General Goods · Bakery · Butcher · Grocer · Inn/Tavern · Tailor · Cobbler · Tanner · Fabric Shop · Blacksmith (Arms/Armor) · Farrier · Carpenter · Wheelwright · Stables · Messenger · Adventuring Gear · Magic Items · Potions & Elixirs · Arcane Scrolls · Divine Scrolls · Bookshop/Library · Cartographer · Alchemist/Apothecary · Jeweler · Painter/Sculptor · Fortune Teller · Black Market · Pawn Shop · Clockwork Repair · Pet Shop · Oddities · Mercenary/Bounty

### Advanced Mode

Toggle the **Advanced** switch to expose:

- **Items per shop** (5–20, default 9)
- **Unique chance %** (0–100, settlement default)
- **Seed** — any string for deterministic/reproducible generation; required for persistent stock depletion across sessions
- **Allow rare items** — Auto (settlement-driven) / Yes / No
- **Shop type checkboxes** — All/None toggles plus individual selection for all 35+ types

Advanced mode state is remembered in localStorage between visits.

### Seeded RNG & Deterministic Shops

When a seed is entered, the same seed + same settings always produces the same shops, same shopkeeper, same prices. Use this to:

- Return to "the same town market" across multiple sessions
- Share a seed with co-DMs for consistent world-state
- Combine with Stock Depletion (below) for persistent sold-out items

### Shopkeeper Generation (v1.8.7)

Each shop gets a procedurally generated shopkeeper with:

- **Name** drawn from generic, exotic, humble, or scholarly pools
- **Personality** — 70% fitting (suits the trade), 20% ironic (contradicts it), 10% wrong field (unexpected backstory)
- Personality traits are shop-type-specific (a fitting blacksmith is "gruff and practical with soot-stained hands"; an ironic one is "delicate and refined, speaks of beauty in brutality")

### Shopkeeper DM Notes (v2.3.0)

Every shopkeeper now includes three DM-facing RP prompts, hidden behind a collapsible **DM Notes** button to keep the screen clean. All three are tailored to both the shop type and the settlement size:

- **Wants** — A personal goal, desire, or problem the shopkeeper is dealing with (e.g., a village blacksmith wants "a decent apprentice who doesn't flinch at the heat"; a capital jeweler wants "to know who keeps sending her anonymous appraisal requests")
- **Rumor** — Something they've heard that scales to settlement scope. Village rumors are local and personal; town rumors involve guilds and commerce; capital rumors touch on politics, noble houses, and city-wide intrigue
- **Hook** — A one-line situation that could become a sidequest, a moral dilemma, or just interesting texture if the players ask the right question

**Content pool sizes (v2.3.0):** All 30 shop types carry **20 wants, 20 hooks, and 20 rumors per settlement tier** (village / town / capital) — 60 unique rumor lines per shop type, 2,000+ total RP entries. The generator draws randomly from these pools, ensuring non-repetitive content across hundreds of sessions even when returning to the same shop type.

These notes are never shown to players. Click **DM Notes** on any shop card to expand or collapse them. They are included in the Copy and Download exports.

### Restock Timer (v2.3.0)

Each shop header shows how often it realistically restocks, calculated from shop type × settlement size:

- **Daily**: Inn/Tavern, Bakery, Messenger
- **1–3 days**: Pawn Shop (walk-in stock), Stables (feed)
- **3–7 days**: Alchemist, Grocer, Cobbler, Farrier
- **5–10 days**: Blacksmith, General Goods, Adventuring Gear
- **1–2 weeks**: Tailor, Fabric Shop, Books, Carpenter, Potions
- **2–3 weeks**: Arcane Scrolls, Jeweler, Clockwork Repair
- **2–4 weeks**: Magic Items, Cartographer, Oddities (unpredictable)

Village adds ~3 days to all timers; Capital subtracts ~1 day. Use this as a narrative guide — there is no real-time clock, just the DM's session calendar.

### Stock Depletion & Restock (v2.3.0)

Persistent sold-out tracking per seeded shop, stored in `localStorage`:

- Each item row has a **bag-x icon** (Mark Sold) button
- Clicking it marks the item as sold: the row dims, the stock badge reads **SOLD**, and the state is saved to `localStorage` keyed to the current seed
- Clicking the same button again (which becomes a ↩ icon) unmarks it
- The **Restock** button in each shop header clears all sold items for that shop only
- On the next session, regenerating with the same seed automatically restores the sold state — sold items appear immediately as SOLD without any player input
- If no seed is set, sold state is session-only (in-memory); a small notice prompts the DM to set a seed in Advanced mode for persistence

**Workflow example**: Set seed `millhaven-market-spring` → generate → players buy a Longsword and two Healing Potions → DM marks those sold → next session, same seed shows exactly what's left in stock.

### Item Search & Filter (v2.3.0)

The floating **Search** button (bottom-right corner) opens the navigator panel, which now includes:

- **Text search** — Filters all item rows across all shops in real time, matching against item name, description, and use case. Shops with no matching items are dimmed rather than hidden, so the DM can still see shop context.
- **Rarity filter** — Four buttons (All / Common / Uncommon / Rare) narrow results by rarity badge. Combines with the text search.
- **Quick jump** — When 2 or more shops are generated, the existing shop-anchor list appears below the search tools so the DM can still scroll directly to a specific shop.

The panel is dismissible and remembers its state for the current session.

### Negotiate Price Mechanic (v1.8.8)

Haggling system per item:

**DC by Rarity:**
- Common: DC 12 (Easy)
- Uncommon: DC 15 (Standard)
- Rare: DC 18 (Hard)

**Price Outcomes:**
- **Critical Success** (Nat 20 or DC+10): 30% discount
- **Success by 5+**: 20% discount
- **Success** (DC met): 10% discount
- **Failure**: No discount
- **Critical Failure** (Nat 1 or DC−10): +10% surcharge (shopkeeper offended)

The same Persuasion DCs apply when a player tries to push a sell offer higher (see below).

### Sell to Shop (v2.3.0)

Each shop card has a **Sell to Shop** button that opens a modal for the inverse transaction — players selling items to the merchant.

**How it works:**
1. DM types the item name and a rough description (the more categorical detail, the better the keyword match)
2. DM enters the player's estimated value in GP
3. DM selects item condition: **Good** (100%), **Worn** (75%), **Damaged** (50%)
4. Click **Calculate Offer**

**Offer calculation:**
- Base affinity by shop type (e.g., Blacksmith = 50% for weapons/armor, Pawn Shop = 25% for anything)
- × Settlement multiplier (Village 70%, Town 85%, Capital 100%)
- × Condition multiplier
- = Final offer as % of stated value

**Keyword matching**: The system checks the item description against each shop's buy-keyword list. A Blacksmith buys anything containing words like "weapon", "sword", "blade", "armor", "shield", "mail", "helm", etc. — broad enough that describing a crossbow as "a ranged weapon" will match. A Pawn Shop has no keyword restrictions and will buy anything at a lower rate. If nothing matches, the shop will still make a lowball offer with an appropriate NPC line explaining their hesitation.

The modal generates a short **in-character NPC response** that fits the offer outcome ("I can move this. 12 gp — that's my offer." vs. "Not really my trade. 3 gp if you need to move it quickly.").

Players can then attempt Persuasion (same DCs as buying) to push the offer higher.

### Shop-to-Character Inventory (v1.9.0)

Each item row has an **Add to Character** button that:
- Selects from characters stored in IndexedDB/localStorage
- Lets the DM set quantity, weight, equipped/attuned status, and notes
- Appends the item (with description and use case) directly to the chosen character's inventory
- Works across sessions without any manual copy-paste

### Copy & Download Export

**Copy (Markdown)**: Copies all generated shop data to clipboard as structured Markdown, including:
- Shop name, settlement, markup, and restock timer
- Shopkeeper name, personality, and all three DM Notes (Want / Rumor / Hook)
- Each item: name, description, use, stock quantity, price, and sold status
- Unique item line if present

**Download .txt**: Exports all shop text as a plain-text file suitable for any VTT notes field, OneNote, or session folder.

### Shop Navigation (v2.2.9)

The **Search** floating button (replaces the old "Shops" toggle) shows the navigator panel. When two or more shops are generated, the panel includes anchor links to jump directly to any shop — useful when running 8+ shops in a single city market session.

---

## Cross-Generator Integration

### NPC ↔ Name Generator (v1.8.8)

**Interactive Name Picker Modal:**
- "Generate Name" button on NPC cards
- Modal displays 12 name options
- Race auto-detection from NPC description
- Manual race override dropdown
- "Regenerate" button for fresh options
- "Open Name Generator" button

**Cross-Communication:**
- URL parameter passing for race presets
- localStorage handoff (bidirectional)
- Selected race auto-applied in Name Generator

### Tavern → NPC Generator (v1.8.8)

**Staff Expansion System:**
- "Generate Full NPC Details" button on staff
- Converts basic staff into complete 8-field NPCs
- Auto-generates: mannerisms, quirks, wants, avoids, secrets
- Modal preview with copy and "Open in NPC Gen"

**Data Flow:**
- localStorage handoff for tavern staff → NPC
- URL parameters preserve context (from=tavern)
- NPC Generator recognizes tavern-sourced NPCs

---

## Version History Summary

1. **v1.8.4** - Loot Generator overhaul (monster templates, hoard/individual modes, mundane items); Shop Generator launched
2. **v1.8.7** - Shop: Shopkeeper NPC generation (names, personality, 70/20/10 archetype split); limited stock quantities
3. **v1.8.8** - Shop: Negotiate Price mechanic (Persuasion DC 12/15/18, 5-tier outcomes); generator integration (Name/NPC/Tavern/Shop); loot expansion (47 magic items)
4. **v1.9.0** - Shop: Add to Character Inventory button; modern card layout
5. **v1.9.2** - NPC combat stats, tavern patrons, loot quick bundles
6. **v1.10.2** - Tavern context & metrics system
7. **v1.10.5** - Tavern cultural immersion (56 patron types, 28 events, cultural systems)
8. **v1.10.8** - Tavern menu expansion (4-5x more variety)
9. **v1.10.9** - Cursed items system (50 items, 5 severity levels)
10. **v2.2.9** - Weapons & Armor loot category (340 entries), per-item reroll, tomb/barracks templates, Markdown export; Shop: floating shop navigator
11. **v2.3.0** - Shop: Shopkeeper DM Notes (want/rumor/hook, settlement-scaled); expanded RP content pool to 20 wants / 20 hooks / 20 rumors per settlement tier across all 30 shop types (2,000+ entries); restock timers; item search & rarity filter in navigator panel; stock depletion (Mark Sold, Restock, localStorage persistence by seed); Sell to Shop (keyword matching, condition modifier, settlement modifier, NPC response lines); updated Copy export to include DM notes and sold status
12. **v2.3.1** - Name Generator: lock tiles (pin names across regenerate), quick-count chips (5/10/20/50), Enter-key shortcut to generate, in-results text filter

## Use Cases

### Shop Generator

**First visit — quick session start:**
Hit Generate with the Core preset on Town. Eight shops appear instantly. Each shopkeeper has a name, personality, and a collapsible DM Notes panel with a personal want, a rumor, and a hook — enough to run them for a full session without any prep. Press "Shops" to open the navigator and jump to any shop by name.

**Returning to the same market:**
Turn on Advanced mode, type a seed like `millhaven-spring-market`, generate. Same shops, same prices, same shopkeeper names. Mark items sold as players buy them. Next session, same seed — sold items show as SOLD immediately. When enough in-game time has passed, click Restock on each shop to clear the sold list.

**Players want to sell loot:**
Click **Sell to Shop** on any card. Type "a well-worn iron shortsword" and set its value to 15 gp. The Blacksmith (Blacksmith keywords match "iron" and "sword") offers 50% base × 85% town rate = 6 gp, with a line from the NPC. Pawn Shop offers 25% of anything with no keyword requirement. The player rolls Persuasion (DC 12) to push it higher.

**Finding a specific item across many shops:**
Generate an Adventurer's Hub preset in a capital. Press **Search**, type "healing" — all non-healing rows dim instantly. Switch to Rare filter to see only the rare potions. The shop nav list still lets you jump between shops without closing the filter.

**Seeded village with realistic context:**
Set settlement to Village, seed to `havenford-mill-road`. The grocer restocks every 3–7 days (displayed in the header). The blacksmith restocks every 8–13 days (village base 5–10 + 3). The innkeeper's rumor is about local gossip; the blacksmith's hook involves an unclaimed sword. The scale of everything — prices, stock, rumors — fits a backwater village automatically.

### Name Generator

**First visit — naming an NPC on the spot:**
Click the Elf quick-select button → preset applies instantly → press Enter (or Generate). Twenty elf names appear. Pick one, click the ⭐ to favorite it, done. The whole flow takes under 10 seconds.

**Power use — finding the right name without re-rolling everything:**
Generate 20 Tiefling names → lock the 4 you like (gold border) → press Enter again → those 4 stay, 16 new names fill the rest. Repeat until the whole list is keepers. Lock one with the perfect feel, unlock the others for more variety.

**Narrowing a big list:**
Set count to 50, generate. Type in the filter bar — e.g., "zar" — to instantly see only names containing that string. Great for finding names with a specific sound without scrolling through 50 tiles.

**Consistent naming across a session:**
Enable Advanced mode, enter seed `thornwall-town-nobles`. Every generate with that seed produces the same names in the same order — useful for generating a pre-planned list before the session and sharing it with a co-DM via the Share link.
