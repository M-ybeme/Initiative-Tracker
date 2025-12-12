# Level-Up System - Testing Guide

## Quick Fix Applied ✅

**Issue**: `loadCharacterIntoForm is not defined`
**Solution**: Updated to use the correct function name `fillFormFromCharacter`

**Additional Fixes**:
- ✅ Handle both `character.class` and `character.charClass` properties
- ✅ Parse level as integer (handles both string and number values)
- ✅ Use correct character property names from character.js

## Testing Checklist

### 1. Basic Functionality Test

1. **Open characters.html** in your browser
2. **Create or select a test character** with:
   - Name: Test Wizard
   - Class: Wizard
   - Level: 4
   - CON: 14 (for +2 modifier)
   - At least one other stat filled in

3. **Click the "Level Up" button**
   - Should appear next to Save/Delete buttons
   - Opens a modal with level-up wizard

4. **Complete the wizard**:
   - ✅ Step 1: Choose HP method (roll or average)
   - ✅ Step 2: Choose ASI or Feat
   - ✅ Step 3: Review spell slots
   - ✅ Step 4: Review features
   - ✅ Step 5: Confirm changes

5. **Verify results**:
   - Character is now level 5
   - Max HP increased
   - Ability scores updated (if ASI chosen)
   - Spell slots show 2× 3rd-level slots

### 2. Edge Cases to Test

#### Test Case: Max Level Character
1. Create character at level 20
2. Click "Level Up"
3. **Expected**: Alert saying "already at maximum level (20)!"

#### Test Case: No Class Set
1. Create new character
2. Leave class field empty
3. Click "Level Up"
4. **Expected**: Alert saying "Unable to determine character class"

#### Test Case: ASI Validation
1. Level up a character to level 4 (ASI level)
2. Try to select +3 total in ability scores
3. **Expected**: Alert preventing this

#### Test Case: Warlock Pact Magic
1. Create Warlock at level 2
2. Level up to 3
3. **Expected**: Pact slots update to 2× 2nd-level slots

### 3. Browser Console Checks

Open DevTools (F12) and check:

```javascript
// Verify global functions exist
console.log(typeof window.getCurrentCharacter); // Should be "function"
console.log(typeof window.saveCurrentCharacter); // Should be "function"
console.log(typeof window.loadCharacterIntoForm); // Should be "function"

// Verify LevelUpData loaded
console.log(typeof LevelUpData); // Should be "object"
console.log(LevelUpData.getClassData('Wizard')); // Should show wizard data

// Verify LevelUpSystem loaded
console.log(typeof LevelUpSystem); // Should be "object"

// Get current character
const char = window.getCurrentCharacter();
console.log(char); // Should show your character object
console.log('Level:', char.level);
console.log('Class:', char.charClass);
console.log('Stats:', char.stats);
```

### 4. Common Issues & Solutions

#### "Level Up button doesn't appear"
**Check**:
- Are all scripts loaded? (Check Network tab in DevTools)
- Is there a JavaScript error? (Check Console tab)
- Try hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

**Fix**: Clear browser cache and reload

#### "Unable to determine character class"
**Check**:
- Is the class field filled in?
- Does it match a PHB class name?

**Supported classes**:
- Barbarian, Bard, Cleric, Druid
- Fighter, Monk, Paladin, Ranger
- Rogue, Sorcerer, Warlock, Wizard

**Fix**: Ensure class name matches exactly (case-insensitive)

#### "Changes not saving"
**Check**:
- Browser console for storage errors
- Storage quota (shown in character manager)

**Fix**:
```javascript
// In console, check storage
IndexedDBStorage.getStorageInfo().then(console.log);
```

#### "HP calculation seems wrong"
**Formula**:
- **Roll**: 1d[hit die] + CON modifier
- **Average**: floor([hit die] / 2) + 1 + CON modifier

**Example for Wizard (d6 hit die, +2 CON)**:
- Roll: 1d6 + 2 = 3-8 HP
- Average: 3 + 1 + 2 = 6 HP

### 5. Test Different Classes

Try leveling each class type to verify different mechanics:

| Class | Test Level | What to Check |
|-------|------------|---------------|
| **Wizard** | 4→5 | Spell slots (gains 3rd level) |
| **Fighter** | 3→4 | ASI available |
| **Warlock** | 2→3 | Pact Magic (2nd-level slots) |
| **Barbarian** | 3→4 | Rage uses increase |
| **Rogue** | 2→3 | Sneak Attack dice |
| **Cleric** | 1→2 | Channel Divinity |

### 6. Data Verification

After leveling up, verify character object updated correctly:

```javascript
const char = window.getCurrentCharacter();

// Check level increased
console.log('Level:', char.level); // Should be +1

// Check HP increased
console.log('Max HP:', char.maxHP); // Should have increased

// If ASI taken, check stats
console.log('Stats:', char.stats); // Should show updated scores

// If feat taken, check feats array
console.log('Feats:', char.feats); // Should include new feat

// For casters, check spell slots
console.log('Spell Slots:', char.spellSlots);
```

### 7. Manual Verification

After level-up:
1. **Save character** (should auto-save, but click Save to be sure)
2. **Refresh page** (F5)
3. **Load character** again
4. **Verify** all changes persisted:
   - Level
   - Max HP
   - Ability scores
   - Feats
   - Spell slots

## Expected Behavior Summary

### When Leveling from 4→5 as Wizard with 14 CON:

**HP Options**:
- Roll 1d6 + 2 = 3-8 HP
- Average = 4 + 2 = 6 HP

**ASI/Feat**: NONE (Wizard ASI at 4, 8, 12, etc.)

**Spell Slots**:
- Before: [4, 3, 0, 0, 0, 0, 0, 0, 0]
- After: [4, 3, 2, 0, 0, 0, 0, 0, 0]

**Features**: None at level 5

### When Leveling from 3→4 as Fighter with 16 STR, 14 CON:

**HP Options**:
- Roll 1d10 + 2 = 3-12 HP
- Average = 6 + 2 = 8 HP

**ASI/Feat**: REQUIRED
- Option A: +2 STR (16→18) OR +2 to any ability
- Option B: +1 to two abilities (e.g., STR 16→17, DEX 14→15)
- Option C: Take a feat (e.g., Great Weapon Master)

**Spell Slots**: None (Fighter not a caster)

**Features**: Ability Score Improvement (handled in step 2)

## Success Criteria

✅ Modal opens when clicking "Level Up"
✅ All steps display correctly
✅ HP gain calculated properly
✅ ASI limits enforced (max +2 total)
✅ Ability scores cap at 20
✅ Spell slots auto-update for casters
✅ Changes save to character
✅ Changes persist after page reload
✅ Character select dropdown still works
✅ No JavaScript errors in console

## Report Issues

If you encounter any bugs:

1. **Check browser console** for errors
2. **Note the character**: level, class, stats
3. **Note the step** where it failed
4. **Export the character** (for debugging)
5. **Take a screenshot** if UI issue

---

**Version**: 1.0.0
**Last Updated**: January 2025
