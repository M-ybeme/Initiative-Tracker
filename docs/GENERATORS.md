# Generators Documentation

This document provides comprehensive information about all generator tools in The DM's Toolbox: Loot, Tavern, NPC, Name, and Shop generators.

## Overview

The DM's Toolbox includes five interconnected generators for creating D&D 5e content: Loot, Tavern, NPC, Name, and Shop generators. These tools feature cross-generator integration, preset systems, and extensive customization options.

## Table of Contents

- [Loot Generator](#loot-generator)
- [Tavern Generator](#tavern-generator)
- [NPC Generator](#npc-generator)
- [Name Generator](#name-generator)
- [Shop Generator](#shop-generator)
- [Cross-Generator Integration](#cross-generator-integration)

---

## Loot Generator

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

**6 One-Click Bundles:**

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
   - 3 potions (minor magic consumables)
   - Category: Adventuring Gear of Note

5. **Scroll Bundle**
   - 3 scrolls (minor magic)
   - Category: Toolkits & Supplies

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
- Visual bundle grid (2x3 layout)
- Color-coded buttons with icons
- Value estimates displayed

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

### Loot Categories (v1.8.8, v1.8.4)

**Expanded Categories:**

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

### Expanded Race Support (v1.8.8)

**30+ Races:**

**Common Races:**
- Human (Latin, Norse, Arabic, Asian), Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling

**Uncommon Races:**
- Aarakocra, Tabaxi, Firbolg, Kenku, Triton, Goliath

**Monstrous Races:**
- Hobgoblin, Kobold, Bugbear, Yuan-ti

**Special Races:**
- Changeling, Warforged

**Features:**
- Culturally appropriate syllable patterns
- Unique naming conventions per race
- Human cultural variants (Latin, Norse, Arabic, Asian)
- 16 new race preset configurations
- Race-specific suffixes
- Special handling:
  - Tabaxi: compound names
  - Warforged: mechanical names

**Organized Race Dropdown:**
- 4 logical optgroups
- Visual separation between race types
- Consistent organization across generators

---

## Shop Generator

### Negotiate Price Mechanic (v1.8.8)

**Haggling System:**
- "Negotiate" button on each shop item
- Modal displays Persuasion DC

**DC by Rarity:**
- Common: DC 12
- Uncommon: DC 15
- Rare: DC 18

**Price Outcomes:**
- **Critical Success** (Nat 20 or DC+10): 30% discount
- **Success by 5+** (DC+5): 20% discount
- **Success** (DC): 10% discount
- **Failure** (< DC): No discount
- **Critical Failure** (Nat 1 or DC-10): +10% price increase

**Visual Features:**
- Color coding for success/failure tiers
- Price outcomes table in modal
- Shopkeeper reaction descriptions

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

1. **v1.8.4** - Loot Generator overhaul (monster templates, hoard/individual modes, mundane items)
2. **v1.8.8** - Generator integration (Name/NPC/Tavern/Shop), loot expansion (47 magic items)
3. **v1.9.2** - NPC combat stats, tavern patrons, loot quick bundles
4. **v1.10.2** - Tavern context & metrics system
5. **v1.10.5** - Tavern cultural immersion (56 patron types, 28 events, cultural systems)
6. **v1.10.8** - Tavern menu expansion (4-5x more variety)
7. **v1.10.9** - Cursed items system (50 items, 5 severity levels)
