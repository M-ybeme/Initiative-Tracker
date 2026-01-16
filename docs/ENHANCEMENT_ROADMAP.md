# Character Creation Enhancement Roadmap

## Completed (v1.11.10) ✅

### Multi-Level Character Support
1. ✅ **HP Scaling** - Roll/average options for levels 2-N
2. ✅ **Hit Dice Scaling** - Properly scales to `{level}d{hitDie}`
3. ✅ **Class Features** - Auto-populated for levels 1-N with subclass features
4. ✅ **Subclass Bonus Spells** - 250+ spells across 4 classes (Cleric, Druid, Paladin, Warlock)
   - Added `SUBCLASS_SPELLS` data structure
   - Helper functions: `getSubclassSpells()`, `getSubclassSpellsByLevel()`
   - Spells marked as "always prepared"

---

## In Progress (Partially Implemented)

### Prepared Spell Validation
**Status:** Data structures added, UI implementation needed

**Completed:**
- ✅ Added `preparesSpells: true` flag to Cleric, Druid, Paladin, Wizard in CLASS_DATA
- ✅ Created `getMaxPreparedSpells(className, level, abilityMod)` helper function
- ✅ Created `classPreparesSpells(className)` helper function
- ✅ Formulas implemented:
  - Cleric/Druid/Wizard: WIS/INT mod + level
  - Paladin: CHA mod + half level (rounded down)
  - Artificer: INT mod + half level (rounded up) - pending Artificer in CLASS_DATA

**TODO:**
1. Add prepared spell counter UI to characters.html (see spec below)
2. Implement `updatePreparedSpellCount()` function in character.js
3. Add validation on spell prep toggle
4. Show warning when over-prepared
5. Exclude "alwaysPrepared" spells from count
6. Update count when level/stats change

**UI Spec:**
```html
<!-- Add above "Known Spells" section -->
<div class="alert alert-info small mt-3 d-none" id="preparedSpellsAlert">
  <div class="d-flex justify-content-between align-items-center">
    <span>
      <i class="bi bi-book me-1"></i>
      <strong>Prepared Spells:</strong>
      <span id="preparedSpellCount">0</span> / <span id="maxPreparedSpells">0</span>
    </span>
    <span class="badge bg-secondary" id="preparedSpellStatus">OK</span>
  </div>
  <small class="text-muted d-block mt-1">
    Subclass spells are always prepared and don't count toward this limit.
  </small>
</div>
```

---

## Planned Enhancements

### 1. Spell Attack & Save DC Auto-Calculation
**Priority:** High
**Complexity:** Low
**Estimated:** 1-2 hours

**Tasks:**
- Already partially implemented in fillFormFromWizardData (character.js:2390-2404)
- Need to make it reactive to stat/level changes
- Add recalculation on ability score changes
- Add recalculation on proficiency bonus changes

**Implementation:**
```javascript
function updateSpellcastingStats() {
  const ability = $('spellcastingAbility').value;
  if (!ability) return;

  const abilityScore = parseInt($(`stat${ability.charAt(0).toUpperCase() + ability.slice(1)}`).value) || 10;
  const abilityMod = Math.floor((abilityScore - 10) / 2);
  const profBonus = parseInt($('charProfBonus').value) || 2;

  const spellSaveDC = 8 + profBonus + abilityMod;
  const spellAttackBonus = profBonus + abilityMod;

  $('spellSaveDC').textContent = spellSaveDC;
  $('spellAttackBonus').textContent = spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus;
}

// Call on: ability score change, level change, spellcasting ability change
```

---

### 2. Racial Features Auto-Population
**Priority:** Medium
**Complexity:** Medium
**Estimated:** 3-4 hours

**Data Already Exists:**
- `LevelUpData.RACIAL_FEATURES` - level-gated features (e.g., Aasimar Celestial Revelation at level 3)
- `LevelUpData.RACIAL_SCALING_FEATURES` - features that scale with level

**Tasks:**
1. Add `getRacialFeaturesForLevel(race, level)` helper
2. Populate during character creation
3. Format as markdown in Features & Feats section
4. Include both:
   - Level 1 features (Darkvision, Lucky, etc.)
   - Features unlocked at higher levels

**Example Output:**
```
**Halfling Racial Features:**
- Lucky: When you roll a 1 on d20, you can reroll
- Brave: Advantage on saves vs frightened
- Halfling Nimbleness: Move through space of larger creatures
```

---

### 3. Background Features & Equipment
**Priority:** Medium
**Complexity:** Medium
**Estimated:** 4-5 hours

**Data Needed:**
Create `BACKGROUND_DATA` in level-up-data.js or separate file:

```javascript
const BACKGROUND_DATA = {
  'Acolyte': {
    feature: {
      name: 'Shelter of the Faithful',
      description: 'You and your companions can receive free healing and care at temples of your faith...'
    },
    proficiencies: {
      skills: ['Insight', 'Religion'],
      tools: [],
      languages: 2 // choice
    },
    equipment: [
      'Holy symbol',
      'Prayer book or prayer wheel',
      'Stick of incense (5)',
      'Vestments',
      'Common clothes',
      '15 gp'
    ]
  },
  'Hermit': {
    feature: {
      name: 'Discovery',
      description: 'The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery...'
    },
    proficiencies: {
      skills: ['Medicine', 'Religion'],
      tools: ['Herbalism kit'],
      languages: 1
    },
    equipment: [
      'Scroll case with notes',
      'Winter blanket',
      'Common clothes',
      'Herbalism kit',
      '5 gp'
    ]
  }
  // ... 13 PHB backgrounds total
};
```

**Tasks:**
1. Create BACKGROUND_DATA with all PHB backgrounds
2. Add `getBackgroundFeature(background)` helper
3. Add background feature to Features & Feats during creation
4. Add background equipment to inventory during creation

---

### 4. Starting Equipment Auto-Population
**Priority:** Medium
**Complexity:** High
**Estimated:** 6-8 hours

**Challenges:**
- Many classes have equipment *choices*
- Some items need to be selected from a list
- May need UI for equipment choices during character creation

**Data Needed:**
Add to CLASS_DATA:

```javascript
'Fighter': {
  // ... existing data
  startingEquipment: {
    fixed: [
      { item: 'Chain Mail', quantity: 1, type: 'armor' }
    ],
    choices: [
      {
        choose: 1,
        from: [
          [{ item: 'Martial weapon', quantity: 1 }, { item: 'Shield', quantity: 1 }],
          [{ item: 'Martial weapon', quantity: 2 }]
        ]
      },
      {
        choose: 1,
        from: [
          [{ item: 'Light crossbow', quantity: 1 }, { item: 'Crossbow bolts', quantity: 20 }],
          [{ item: 'Handaxe', quantity: 2 }]
        ]
      }
    ],
    pack: {
      choose: 1,
      from: ['Dungeoneer\'s Pack', 'Explorer\'s Pack']
    }
  }
}
```

**Alternative (Simpler):**
Just give default equipment based on class archetype:
- Fighter → Chain mail, longsword, shield, dungeoneer's pack
- Wizard → Quarterstaff, component pouch, scholar's pack, spellbook
- Cleric → Scale mail, mace, shield, holy symbol, priest's pack

---

### 5. Auto-Generate Basic Attacks
**Priority:** High
**Complexity:** Medium
**Estimated:** 5-6 hours

**Attack Types to Generate:**

**Melee Weapons:**
- Based on class proficiencies
- Use highest of STR/DEX for finesse weapons
- Calculate: attack bonus (prof + ability), damage (dice + ability)

**Ranged Weapons:**
- Based on class proficiencies
- Use DEX
- Include range

**Spell Attacks (Cantrips):**
- Fire Bolt, Eldritch Blast, Sacred Flame, etc.
- Use spellcasting ability
- Damage scales with level

**Implementation:**
```javascript
function generateDefaultAttacks(className, level, stats) {
  const attacks = [];
  const profBonus = Math.floor((level - 1) / 4) + 2;

  // Melee weapons by class
  const classWeapons = {
    'Fighter': [
      { name: 'Longsword', damage: '1d8', damageType: 'slashing', ability: 'str', proficient: true }
    ],
    'Wizard': [
      { name: 'Quarterstaff', damage: '1d6', damageType: 'bludgeoning', ability: 'str', proficient: true }
    ],
    'Cleric': [
      { name: 'Mace', damage: '1d6', damageType: 'bludgeoning', ability: 'str', proficient: true }
    ]
    // ... etc
  };

  const weapons = classWeapons[className] || [];
  weapons.forEach(weapon => {
    const abilityMod = Math.floor((stats[weapon.ability] - 10) / 2);
    const attackBonus = abilityMod + (weapon.proficient ? profBonus : 0);

    attacks.push({
      name: weapon.name,
      attackBonus: attackBonus,
      damage: `${weapon.damage} + ${abilityMod}`,
      damageType: weapon.damageType,
      range: weapon.range || 'Melee',
      notes: ''
    });
  });

  return attacks;
}
```

---

### 6. Class Resource Trackers
**Priority:** High
**Complexity:** High
**Estimated:** 8-10 hours

**Resources by Class:**

| Class | Resources |
|-------|-----------|
| Barbarian | Rage (2/day at level 1, scales) |
| Bard | Bardic Inspiration (Cha mod/day) |
| Cleric | Channel Divinity (1/rest, 2 at 6, 3 at 18) |
| Druid | Wild Shape (2/rest) |
| Fighter | Action Surge (1/rest, 2 at 17), Second Wind, Superiority Dice (Battle Master) |
| Monk | Ki Points (= monk level) |
| Paladin | Lay on Hands (5 × level HP pool), Divine Sense |
| Ranger | None (uses spell slots) |
| Rogue | None |
| Sorcerer | Sorcery Points (= sorcerer level) |
| Warlock | (Uses pact slots - already implemented) |
| Wizard | Arcane Recovery (once/day) |

**Implementation Plan:**
1. Add `classResources` to CLASS_DATA
2. Create resource tracker UI component
3. Add to character sheet dynamically based on class
4. Include short rest / long rest reset buttons
5. Handle subclass-specific resources

**Data Structure:**
```javascript
'Barbarian': {
  // ... existing
  resources: [
    {
      name: 'Rage',
      type: 'uses',
      resetOn: 'long rest',
      max: (level) => {
        if (level < 3) return 2;
        if (level < 6) return 3;
        if (level < 12) return 4;
        if (level < 17) return 5;
        if (level < 20) return 6;
        return Infinity; // Level 20: unlimited
      }
    }
  ]
}
```

---

### 7. Wild Shape Logic for Druids
**Priority:** Medium
**Complexity:** Very High
**Estimated:** 10-12 hours

**Wild Shape Rules:**
- 2 uses per short/long rest
- CR limits: 1/4 at level 2, 1/2 at level 4, 1 at level 8
- Movement limits: No fly until level 8, no swim until level 4
- Duration: Hours equal to half druid level
- Subclass modifications:
  - Circle of the Moon: Higher CR, combat wild shape
  - Circle of Stars: Starry Form instead (different mechanic)
  - Circle of Spores: Doesn't use Wild Shape

**Implementation:**
1. Create beast database (at least 20-30 common beasts)
2. Filter beasts by CR and movement type
3. Add Wild Shape UI to druid character sheets
4. Track current form
5. Show beast stat block when transformed
6. Handle HP transformation rules
7. Add "Revert" button
8. Track uses remaining

**Beast Data Structure:**
```javascript
const BEAST_FORMS = {
  'Brown Bear': {
    cr: 1,
    size: 'Large',
    type: 'beast',
    ac: 11,
    hp: 34,
    speed: { walk: 40, climb: 30 },
    str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7,
    skills: ['Perception +3'],
    senses: 'Darkvision 60 ft.',
    languages: '—',
    attacks: [
      { name: 'Bite', bonus: 5, damage: '1d8 + 4', type: 'piercing' },
      { name: 'Claws', bonus: 5, damage: '2d6 + 4', type: 'slashing' }
    ],
    abilities: [
      { name: 'Keen Smell', description: 'Advantage on Wisdom (Perception) checks that rely on smell' }
    ]
  }
  // ... 30+ more beasts
};
```

---

### 8. HP/HD Validation for Imported Characters
**Priority:** Low
**Complexity:** Medium
**Estimated:** 2-3 hours

**Tasks:**
1. Add validation function `validateCharacterHP(char)`
2. Check if HP < (level + CON mod) - minimum possible
3. Check if hit dice matches level
4. Show warning banner if issues detected
5. Add "Fix HP" button that recalculates to average

**UI:**
```html
<div class="alert alert-warning" id="hpValidationWarning" style="display:none;">
  <i class="bi bi-exclamation-triangle me-2"></i>
  <strong>HP Issue Detected:</strong> Your HP (15) is below the minimum for a level 5 character (25).
  <button class="btn btn-sm btn-warning ms-2" id="fixHPBtn">Recalculate HP</button>
</div>
```

---

### 9. Spell Slot Auto-Update on Level Change
**Priority:** Low
**Complexity:** Low
**Estimated:** 1-2 hours

**Implementation:**
- Listen for changes to `charLevel` field
- Check if character has spellcaster class
- Look up spell slots from CLASS_DATA
- Update spell slot max values
- Preserve current "used" values (don't reset)

---

### 10. Feature Grouping & UI Polish
**Priority:** Low
**Complexity:** Medium
**Estimated:** 3-4 hours

**Improvements:**
- Group features by level with collapsible sections
- Add icons for feature types (Action, Bonus Action, Reaction, Passive)
- Add tags: "Combat", "Exploration", "Social", "Utility"
- Search/filter features
- Pin frequently used features to top

---

## Development Priorities

### Phase 1: Core Spellcasting (Next)
1. ✅ Prepared spell validation UI + logic
2. ✅ Spell attack/DC auto-update on stat changes

### Phase 2: Combat Readiness
3. Auto-generate basic attacks
4. Class resource trackers (Rage, Ki, etc.)

### Phase 3: Character Completeness
5. Racial features population
6. Background features & equipment
7. Starting equipment

### Phase 4: Advanced Features
8. Wild Shape logic
9. Feature grouping & polish
10. HP/HD validation for imports

---

## Technical Debt Notes

### Artificer Support
Artificer is referenced in SUBCLASS_DATA but not in CLASS_DATA. Need to add full Artificer class data including:
- Hit die, proficiencies, saves
- Spell progression
- Features by level
- Infusions system

### Multiclass Support
Current implementation assumes single class. For full multiclass support:
- Spell slot calculation needs to combine caster levels
- Resource trackers need to handle multiple classes
- Hit dice need to track separately per class
- Features need class level vs character level distinction

### Cantrip Damage Scaling
Cantrips that deal damage scale at levels 5, 11, 17. Need to:
- Add `damageScaling` property to cantrips in SPELLS_DATA
- Auto-update attack entries when level changes

---

## Files Modified So Far

### v1.11.10 (Completed)
- `js/character-creation-wizard.js` - Multi-level HP, class features, subclass spells
- `js/character.js` - Feature population, subclass spell integration
- `js/level-up-data.js` - SUBCLASS_SPELLS data, helper functions, preparesSpells flags
- `CHANGELOG.md` - Documentation

### Next Files to Modify
- `characters.html` - Prepared spell counter UI, resource tracker UI
- `js/character.js` - Prepared spell validation, attack generation, resource tracking
- `js/level-up-data.js` - BACKGROUND_DATA, BEAST_FORMS, equipment data

---

## Estimated Total Remaining Work
- **High Priority Items:** 20-25 hours
- **Medium Priority Items:** 15-20 hours
- **Low Priority Items:** 6-9 hours
- **Total:** 41-54 hours of development

---

*Last Updated: 2026-01-16*
*Version: 1.11.10*
