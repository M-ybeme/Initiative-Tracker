# Encounter Builder Documentation

**Quick encounter assembly with export to Initiative Tracker**

## Features

### Monster Search
- **Searchable D&D 5e SRD monster database** from API
- **Hover tooltips** with rich stat block previews:
  - AC, HP, Speed, CR
  - All special abilities with full descriptions
  - All actions with attack bonuses (+X to hit), save DCs, damage dice
  - Reactions and legendary actions
  - Smart positioning prevents tooltips from going off-screen
- Search by name, CR, type, size

### Custom Monster Creation
- Build custom monsters from scratch
- **Automatic CR calculation** based on stats (offensive/defensive CR)
- Custom stat blocks with full action/ability support
- Save custom monsters to roster

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
