# D&D 5e Level-Up System

## Overview

The Level-Up System provides a comprehensive, guided leveling experience for D&D 5e characters in The DM's Toolbox. It handles:

- ✅ **Hit Point increases** (roll or average)
- ✅ **Ability Score Improvements** (ASI)
- ✅ **Feat selection** (40+ PHB feats)
- ✅ **Spell slot progression** (automatic)
- ✅ **Class features** (informative display)
- ✅ **Proficiency bonus** (automatic)

## Phase 1: Core Implementation (Current)

### Included Classes
- **All 12 PHB Classes**:
  - Barbarian, Bard, Cleric, Druid, Fighter, Monk
  - Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard

### What Works
1. **Level 1-20 progression** for all core classes
2. **HP increase** with choice between:
   - Rolling hit die + CON modifier
   - Taking average (recommended)
3. **ASI/Feat selection** at appropriate levels:
   - Standard ASI: +2 to one score, or +1 to two scores
   - OR choose from 40+ feats with prerequisites checking
4. **Spell slot auto-update** for all casters
5. **Pact Magic support** for Warlocks
6. **Class features display** at each level

### Feats Included
Over 40 official feats from the Player's Handbook:
- **Combat**: Alert, Great Weapon Master, Sharpshooter, Sentinel, Polearm Master, etc.
- **Defensive**: Tough, Heavy Armor Master, Shield Master, Defensive Duelist, etc.
- **Utility**: Lucky, Skilled, Observant, Keen Mind, Linguist, etc.
- **Magic**: Magic Initiate, Spell Sniper, War Caster, Ritual Caster, etc.
- **Mobility**: Mobile, Charger, Mounted Combatant, etc.

## How to Use

### For Players

1. **Load your character** in the Character Manager
2. Click the **"Level Up"** button (appears next to Save/Delete)
3. Follow the step-by-step wizard:
   - **Step 1: Hit Points** - Choose roll or average
   - **Step 2: ASI/Feat** - Increase ability scores or take a feat (if applicable)
   - **Step 3: Spell Slots** - Auto-updated (review only)
   - **Step 4: Class Features** - Review new features
   - **Step 5: Summary** - Confirm your choices
4. Click **"Complete Level Up"**

### For DMs

- The button appears for all characters
- You can level up player characters or NPCs
- All changes are saved automatically
- Full undo is available (just reload the character's save)

## File Structure

```
/js/
  ├── level-up-data.js       # Class progression tables, feats, proficiency bonuses
  ├── level-up-system.js     # UI and level-up flow logic
  ├── character.js           # Main character manager (exports API for level-up)
  └── ...
```

## Technical Details

### Data Structure

**`level-up-data.js`** contains:
- `FEATS`: Object with all feat data including prerequisites, benefits, descriptions
- `PROFICIENCY_BONUS`: Level → proficiency bonus lookup
- `CLASS_DATA`: Comprehensive class progression:
  - Hit die size
  - Saving throws
  - Proficiencies
  - Spell slots by level (for casters)
  - Pact magic slots (Warlock)
  - Features gained at each level

**`level-up-system.js`** handles:
- Modal UI creation
- Step-by-step wizard flow
- Data validation (ASI limits, feat prerequisites)
- Applying changes to character object
- Integration with character.js save system

### Integration Points

The system integrates with `character.js` through three global functions:
```javascript
window.getCurrentCharacter()    // Get active character object
window.saveCurrentCharacter()   // Save changes to storage
window.loadCharacterIntoForm()  // Refresh UI after level-up
```

## Future Enhancements (Phase 2+)

### Planned Features
- [ ] **Subclass selection** at appropriate levels
  - Each class has 3-5+ official subclasses
  - Custom subclass support
- [ ] **Multiclassing**
  - Prerequisites checking
  - Spell slot calculations
  - Proficiency restrictions
- [ ] **Spell learning** for casters
  - Automatic prompts for new spells
  - Integration with spell database
- [ ] **Custom feats** creation
- [ ] **Racial level features** (e.g., Aasimar transformations)
- [ ] **Homebrew class support**
- [ ] **Level-down** (for corrections)
- [ ] **Level-up history** tracking

### Additional Feat Sources
- Tasha's Cauldron of Everything
- Xanathar's Guide to Everything
- Other official supplements

## Implementation Notes

### Class Feature Display
Currently, class features are **displayed but not automated**. For example:
- "Rage (3/day)" is shown at level 3 Barbarian
- The DM/player must manually update their resources or notes
- Future versions may auto-populate resource trackers

### Spell Slot Philosophy
- Spell slots are **auto-updated** based on class tables
- Players still choose which spells to learn/prepare manually
- This keeps flexibility while automating the tedious math

### Validation
The system validates:
- ✅ Character is below level 20
- ✅ Class is recognized
- ✅ ASI totals exactly +2 (if chosen)
- ✅ Ability scores don't exceed 20
- ✅ Feat selected (if feat option chosen)
- ✅ HP method selected

## Troubleshooting

### "Unable to determine character class"
- Ensure the Class field has a recognized class name
- Supported format: "Wizard" or "Wizard (Evocation)"
- Base class name must match one of the 12 PHB classes

### "Level Up button doesn't appear"
- Check that `level-up-data.js` and `level-up-system.js` are loaded
- Refresh the page
- Check browser console for errors

### Changes not saving
- The system uses the same storage as the character manager
- Ensure you have storage space available
- Check browser console for quota errors

## Example Workflows

### Leveling a Wizard 4 → 5

1. **HP**: Player chooses "Take Average" = 4 (d6 avg) + 2 (CON) = **6 HP**
2. **Spell Slots**: Auto-updated to include 2× 3rd-level slots
3. **Features**: "None" (no class features at Wizard 5)
4. **Result**: Level 5 Wizard with 6 more HP and access to 3rd-level spells

### Leveling a Fighter 3 → 4

1. **HP**: Player rolls 1d10 = 7, + 3 (CON) = **10 HP**
2. **ASI**: Player chooses +2 STR (16 → 18)
3. **Features**: "Ability Score Improvement" (already handled)
4. **Result**: Level 4 Fighter with 10 more HP and 18 STR

### Taking a Feat (Rogue 3 → 4)

1. **HP**: Take average 5 (d8 avg) + 1 (CON) = **6 HP**
2. **Feat**: Player selects "Alert"
   - +5 to initiative
   - Can't be surprised while conscious
   - No advantage from unseen attackers
3. **Features**: "Ability Score Improvement (taken as feat)"
4. **Result**: Level 4 Rogue with Alert feat

## Developer Guide

### Adding a New Feat

Edit `level-up-data.js`:

```javascript
'Your Feat Name': {
  name: 'Your Feat Name',
  description: 'Full feat text from PHB...',
  prerequisites: { str: 13 }, // or null
  abilityIncrease: { // optional
    choice: ['str', 'con'],
    amount: 1
  },
  benefits: { // optional, for auto-application
    ac: 1,
    speed: 10,
    initiative: 5
  }
}
```

### Adding a New Class

Edit `level-up-data.js` in the `CLASS_DATA` object:

```javascript
'YourClass': {
  hitDie: 8,
  primaryAbility: ['int'],
  savingThrows: ['int', 'wis'],
  armorProficiencies: [...],
  weaponProficiencies: [...],
  skillChoices: { count: 2, from: [...] },
  spellcaster: true, // or false
  spellcastingAbility: 'int', // if caster
  spellSlots: { /* level: [1st, 2nd, ...9th] */ },
  features: {
    1: ['Feature A', 'Feature B'],
    2: ['Feature C'],
    // ...
  }
}
```

### Testing

1. Create a test character at various levels
2. Level up through each tier (1-4, 5-10, 11-16, 17-20)
3. Test both ASI and feat paths
4. Test HP rolling vs average
5. Verify spell slots for casters
6. Check that saves persist correctly

## Credits

- **Data Source**: D&D 5e System Reference Document (SRD)
- **Implementation**: The DM's Toolbox (2025)
- **License**: For personal use in D&D campaigns

## Support

For issues, feature requests, or questions:
- GitHub: [Your Repository]
- Discord: [Your Server]
- Email: [Your Contact]

---

**Version**: 1.0.0 (Phase 1 - Core Classes)
**Last Updated**: January 2025
