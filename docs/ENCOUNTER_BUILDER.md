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
- Search by name, CR, type, size

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
- Drag-to-reorder encounter roster
- Edit monster names with smart duplicate numbering
- Delete monsters from roster

### Encounter Difficulty
- Party level configuration (4-8 players, levels 1-20)
- XP budget calculator
- Difficulty rating (Easy, Medium, Hard, Deadly) based on DMG thresholds
- Adjusted XP for encounter balancing

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
- Opens Initiative Tracker in new tab with roster pre-loaded

## Use Case

Build an encounter with 6 Goblins + 1 Bugbear, review stat blocks in roster, download stat block reference file for combat, click "Send to Tracker"—combat ready in 30 seconds. Keep stat block file open on second screen for quick reference during battle.
