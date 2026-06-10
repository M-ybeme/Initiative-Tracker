# Encounter Builder Documentation

**Quick encounter assembly with export to Initiative Tracker**

## Features

### SRD Scope

- The monster search, roster previews, and stat-block exports all read from the SRD subset of the 5e API mirror.
- Non-SRD monsters stay hidden in the default build; private content packs can register additional stat blocks which the Encounter Builder will then include in search results and exports.
- When a private pack is active, the UI labels those entries so it is clear which monsters came from user-supplied data.

### Monster Search
- **Searchable D&D 5e SRD monster database** from API
- **Hover tooltips** with rich stat block previews:
  - AC, HP, Speed, CR
  - All special abilities with full descriptions
  - All actions with attack bonuses (+X to hit), save DCs, damage dice
  - Reactions and legendary actions
  - Smart positioning prevents tooltips from going off-screen
  - **Two-column layout** kicks in automatically when a stat block is taller than ~82% of the viewport — no scrolling needed even for massive boss stat blocks
- Search by name, CR (0–30), and creature type

### Custom Monster Creation (v2.0.8.1)

A fully rebuilt custom monster creator with **Simple** and **Full** mode toggle.

**Simple Mode** – Quick entry for basic monsters: name, size, type, CR, AC, HP, speed, ability scores, and a freeform actions field. Ideal for on-the-fly improvisation.

**Full Mode** – Complete D&D 5e stat block authoring, organized into accordion sections:

| Section | Fields |
|---|---|
| **Basic Info** | Name, size, type, subtype, alignment, CR override, proficiency bonus |
| **Combat Stats** | AC (with armor type), HP (with hit dice formula), multi-mode speed (walk/fly/swim/climb/burrow/hover flag) |
| **Ability Scores** | All six abilities with auto-calculated modifiers |
| **Defenses** | Saving throw proficiencies, damage vulnerabilities, resistances, immunities, condition immunities |
| **Skills & Senses** | Skill proficiencies, passive Perception, senses (darkvision, blindsight, etc.), languages |
| **Special Abilities** | Name/description pairs |
| **Spellcasting** | Innate or standard; spell save DC, attack bonus; at-will, per-day (1×/2×/3×), and slot-based spells |
| **Actions** | Name, to-hit bonus, save DC, damage dice + type, description |
| **Bonus Actions** | Name/description pairs |
| **Reactions** | Name/description pairs |
| **Legendary Actions** | Action count per round, name/description pairs |
| **Mythic Actions** | Mythic trait description, name/description pairs |
| **Lair Actions** | Name/description pairs for lair phase |
| **Regional Effects** | Description of regional effects |
| **Notes** | Freeform DM notes |

**CR Calculation:** Automatic offensive/defensive CR estimation updates as you fill in stats.

**Help Example:** A collapsible "Example Monster" panel in Full mode shows a complete homebrew stat block ("Crystalwing Marauder") demonstrating all available fields.

**Text Export Enhancement:** The stat block `.txt` export includes all new fields — subtype, alignment, AC type, hit dice, proficiency bonus, languages, damage/condition modifiers, spellcasting details, bonus actions, mythic actions, lair actions, regional effects, and legendary action count.

### Encounter Roster
- Add monsters with quantity selector (bulk add: 1 monster × 5 = 5 in roster)
- **Expandable stat blocks** in roster:
  - "Show Details" button for each monster
  - Quick action preview (first 3 actions: "⚡ Multiattack, Bite, Claw")
  - Full stat block with organized sections (Special Abilities, Actions, Reactions, Legendary Actions)
  - Attack information highlighted: to-hit bonus, save DC, damage with type
  - Speed and movement details
- **Edit button (pencil icon)** on each roster entry — pre-populates the Full Mode custom monster editor with that monster's data so you can tweak HP, add abilities, or reskin an SRD creature without starting from scratch
- **Monster breakdown** in the summary line (e.g. "3× Goblin, 1× Bugbear") instead of just a raw count
- Drag-to-reorder encounter roster
- When monsters are sent to the tracker, duplicates are auto-numbered ("Goblin", "Goblin 2", "Goblin 3")
- Delete monsters from roster

### Encounter Difficulty
- Party level configuration (any number of players, levels 1-20)
- XP budget calculator
- Difficulty rating (Trivial/Easy/Medium/Hard/Deadly) based on DMG thresholds
- Adjusted XP for encounter balancing with party-size modifier noted when active

### Encounter Name & Save/Load
- **Encounter Name** field — used as the prefix for all exported filenames and the header of the stat-block `.txt` file
- **Save** — prompts for a name and stores the full roster + party levels to browser localStorage; prompts before overwriting an existing slot
- **Load** — restores a saved encounter from the dropdown (prompts before replacing the current roster)
- **Delete** — removes the selected saved slot
- Saved slots persist across browser sessions; each slot stores roster, party levels, resist mode, and encounter name

### Initiative Pre-Roll
- **Roll Init checkbox** next to "Send to Tracker" — when checked, each monster gets a pre-rolled initiative value of `d20 + DEX modifier` instead of the default placeholder
- Applies to both the Send to Tracker flow and file exports

### Stat Block Export
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

### Direct Integration
- **"Send to Initiative Tracker"** button
- Auto-exports encounter to Initiative Tracker with one click
- Uses `mode: "append"` to preserve existing combat state
- All monster data (HP, AC, actions) transfers automatically
- Opens Initiative Tracker with roster pre-loaded

## Use Cases

**Quick encounter:** Search for Goblin, add 6, search for Bugbear, add 1, type party levels, check difficulty. Click "Send to Tracker" — combat ready in 30 seconds.

**Repeat encounters:** Save the encounter with a name. Load it next session in two clicks; roster, party levels, and resist mode all restore together.

**Boss customization:** Add an Ancient Dragon from SRD search, click the pencil icon on its roster row, boost its HP and add a homebrew ability in Full Mode, recalc CR, then send to tracker — no need to rebuild the whole stat block.

**Fast initiative:** Check "Roll Init" before clicking "Send to Tracker" — every enemy arrives in the tracker with a pre-rolled d20 + DEX initiative value.
