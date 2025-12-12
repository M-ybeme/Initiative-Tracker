/**
 * D&D 5e Level-Up Data
 * Contains class progression tables, feat data, and level-up mechanics
 * Phase 1: Core 12 PHB classes (no subclasses yet)
 */

const LevelUpData = (function() {
  'use strict';

  // ============================================================
  // FEATS DATA (PHB + Common Supplements)
  // ============================================================
  const FEATS = {
    // Ability Score Improvement (special case)
    'Ability Score Improvement': {
      name: 'Ability Score Improvement',
      description: 'Increase one ability score by 2, or two ability scores by 1 each. You can\'t increase an ability score above 20 using this feature.',
      prerequisites: null,
      isASI: true
    },

    // Combat Feats
    'Alert': {
      name: 'Alert',
      description: '+5 to initiative. You can\'t be surprised while conscious. Other creatures don\'t gain advantage on attack rolls against you as a result of being unseen by you.',
      prerequisites: null,
      benefits: {
        initiative: 5
      }
    },
    'Athlete': {
      name: 'Athlete',
      description: 'Increase STR or DEX by 1. Climbing doesn\'t cost extra movement. Standing from prone uses only 5 feet. Running jumps require only 5 feet of movement.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'dex'], amount: 1 }
    },
    'Charger': {
      name: 'Charger',
      description: 'When you Dash, you can use a bonus action to make one melee weapon attack or shove, gaining +5 to damage or pushing 10 feet.',
      prerequisites: null
    },
    'Crossbow Expert': {
      name: 'Crossbow Expert',
      description: 'Ignore loading property of crossbows. No disadvantage on ranged attacks within 5 feet. When you use the Attack action with a one-handed weapon, you can attack with a hand crossbow as a bonus action.',
      prerequisites: null
    },
    'Defensive Duelist': {
      name: 'Defensive Duelist',
      description: 'When wielding a finesse weapon and hit by a melee attack, use reaction to add proficiency bonus to AC for that attack.',
      prerequisites: { dex: 13 }
    },
    'Dual Wielder': {
      name: 'Dual Wielder',
      description: '+1 AC when wielding separate melee weapons. Can two-weapon fight with non-light weapons. Can draw/stow two weapons at once.',
      prerequisites: null,
      benefits: {
        ac: 1
      }
    },
    'Dungeon Delver': {
      name: 'Dungeon Delver',
      description: 'Advantage on Perception/Investigation for secret doors. Advantage on saves vs traps. Resistance to trap damage. Searching for traps doesn\'t slow your travel pace.',
      prerequisites: null
    },
    'Durable': {
      name: 'Durable',
      description: 'Increase CON by 1. When you roll Hit Dice to regain HP, minimum amount regained equals 2× your CON modifier (minimum 2).',
      prerequisites: null,
      abilityIncrease: { choice: ['con'], amount: 1 }
    },
    'Great Weapon Master': {
      name: 'Great Weapon Master',
      description: 'When you score a critical hit or reduce a creature to 0 HP with a melee weapon, you can make another attack as a bonus action. Before making a melee attack with a heavy weapon, you can take -5 to hit for +10 damage.',
      prerequisites: null
    },
    'Grappler': {
      name: 'Grappler',
      description: 'Advantage on attacks vs creatures you\'re grappling. Can use action to pin grappled creature (both restrained). Can grapple creatures up to one size larger.',
      prerequisites: { str: 13 }
    },
    'Heavy Armor Master': {
      name: 'Heavy Armor Master',
      description: 'Increase STR by 1. While wearing heavy armor, reduce non-magical bludgeoning/piercing/slashing damage by 3.',
      prerequisites: { proficiency: 'Heavy Armor' },
      abilityIncrease: { choice: ['str'], amount: 1 }
    },
    'Inspiring Leader': {
      name: 'Inspiring Leader',
      description: 'Spend 10 minutes inspiring up to 6 friendly creatures (including yourself). Each gains temporary HP equal to your level + CHA modifier.',
      prerequisites: { cha: 13 }
    },
    'Keen Mind': {
      name: 'Keen Mind',
      description: 'Increase INT by 1. Always know which way is north. Always know hours until sunrise/sunset. Accurately recall anything seen/heard within the past month.',
      prerequisites: null,
      abilityIncrease: { choice: ['int'], amount: 1 }
    },
    'Lightly Armored': {
      name: 'Lightly Armored',
      description: 'Increase STR or DEX by 1. Gain proficiency with light armor.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'dex'], amount: 1 },
      proficiencies: ['Light Armor']
    },
    'Linguist': {
      name: 'Linguist',
      description: 'Increase INT by 1. Learn 3 languages. Create written ciphers (DC = INT score + proficiency to decipher).',
      prerequisites: null,
      abilityIncrease: { choice: ['int'], amount: 1 }
    },
    'Lucky': {
      name: 'Lucky',
      description: 'You have 3 luck points. Spend 1 to roll an extra d20 on attack/ability check/save (yours or enemy\'s), choosing which to use. Regain all on long rest.',
      prerequisites: null
    },
    'Mage Slayer': {
      name: 'Mage Slayer',
      description: 'Reaction to attack a creature within 5 feet that casts a spell. Impose disadvantage on concentration saves from your damage. Advantage on saves vs spells cast within 5 feet.',
      prerequisites: null
    },
    'Magic Initiate': {
      name: 'Magic Initiate',
      description: 'Learn 2 cantrips and one 1st-level spell from one class (Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard). Cast the 1st-level spell once per long rest.',
      prerequisites: null
    },
    'Martial Adept': {
      name: 'Martial Adept',
      description: 'Learn 2 maneuvers from Battle Master. Gain one d6 superiority die (regain on short/long rest).',
      prerequisites: null
    },
    'Medium Armor Master': {
      name: 'Medium Armor Master',
      description: 'Wearing medium armor doesn\'t impose disadvantage on Stealth. Add up to +3 DEX modifier (instead of +2) to AC in medium armor.',
      prerequisites: { proficiency: 'Medium Armor' }
    },
    'Mobile': {
      name: 'Mobile',
      description: 'Speed increases by 10 feet. Dash in difficult terrain doesn\'t cost extra movement. When you make a melee attack, target can\'t make opportunity attacks against you for the rest of your turn.',
      prerequisites: null,
      benefits: {
        speed: 10
      }
    },
    'Moderately Armored': {
      name: 'Moderately Armored',
      description: 'Increase STR or DEX by 1. Gain proficiency with medium armor and shields.',
      prerequisites: { proficiency: 'Light Armor' },
      abilityIncrease: { choice: ['str', 'dex'], amount: 1 },
      proficiencies: ['Medium Armor', 'Shields']
    },
    'Mounted Combatant': {
      name: 'Mounted Combatant',
      description: 'Advantage on melee attacks vs unmounted creatures smaller than your mount. Force attacks vs mount to target you. If mount takes damage, you can use reaction to halve it.',
      prerequisites: null
    },
    'Observant': {
      name: 'Observant',
      description: 'Increase INT or WIS by 1. +5 to passive Perception and Investigation. Can read lips.',
      prerequisites: null,
      abilityIncrease: { choice: ['int', 'wis'], amount: 1 },
      benefits: {
        passivePerception: 5,
        passiveInvestigation: 5
      }
    },
    'Polearm Master': {
      name: 'Polearm Master',
      description: 'When wielding a glaive/halberd/quarterstaff/spear, you can use bonus action to make a melee attack with opposite end (d4 damage). Creatures entering your reach provoke opportunity attacks.',
      prerequisites: null
    },
    'Resilient': {
      name: 'Resilient',
      description: 'Increase one ability score by 1. Gain proficiency in saving throws using that ability.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'dex', 'con', 'int', 'wis', 'cha'], amount: 1 }
    },
    'Ritual Caster': {
      name: 'Ritual Caster',
      description: 'Choose a class (Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard). Gain a ritual book with 2 ritual spells from that class. Can add more ritual spells found.',
      prerequisites: { int: 13, wis: 13 }
    },
    'Savage Attacker': {
      name: 'Savage Attacker',
      description: 'Once per turn when you roll damage for a melee weapon attack, you can reroll the damage dice and use either total.',
      prerequisites: null
    },
    'Sentinel': {
      name: 'Sentinel',
      description: 'When you hit with opportunity attack, creature\'s speed becomes 0. Creatures provoke opportunity attacks even if they Disengage. Reaction to attack creatures within 5 feet that attack someone else.',
      prerequisites: null
    },
    'Sharpshooter': {
      name: 'Sharpshooter',
      description: 'No disadvantage on long range attacks. Ranged attacks ignore half and three-quarters cover. Before making a ranged attack, take -5 to hit for +10 damage.',
      prerequisites: null
    },
    'Shield Master': {
      name: 'Shield Master',
      description: 'If you take the Attack action, bonus action to shove with shield. Add shield\'s AC bonus to DEX saves vs single-target effects. Use reaction to take no damage on successful DEX save (half damage normally).',
      prerequisites: null
    },
    'Skilled': {
      name: 'Skilled',
      description: 'Gain proficiency in any 3 skills or tools of your choice.',
      prerequisites: null
    },
    'Skulker': {
      name: 'Skulker',
      description: 'Hide when lightly obscured. Missing with ranged attack doesn\'t reveal your position. Dim light doesn\'t impose disadvantage on Perception checks.',
      prerequisites: { dex: 13 }
    },
    'Spell Sniper': {
      name: 'Spell Sniper',
      description: 'When you cast a spell requiring an attack roll, double its range. Ranged spell attacks ignore half and three-quarters cover. Learn one attack-roll cantrip.',
      prerequisites: { canCastSpell: true }
    },
    'Tavern Brawler': {
      name: 'Tavern Brawler',
      description: 'Increase STR or CON by 1. Proficient with improvised weapons. Unarmed strike uses d4. When you hit with unarmed/improvised weapon, bonus action to grapple.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'con'], amount: 1 }
    },
    'Tough': {
      name: 'Tough',
      description: 'Your HP maximum increases by 2× your character level (retroactive).',
      prerequisites: null,
      benefits: {
        hpPerLevel: 2
      }
    },
    'War Caster': {
      name: 'War Caster',
      description: 'Advantage on concentration saves. Cast spells as opportunity attacks. Perform somatic components even when holding weapons/shield.',
      prerequisites: { canCastSpell: true }
    },
    'Weapon Master': {
      name: 'Weapon Master',
      description: 'Increase STR or DEX by 1. Gain proficiency with 4 weapons of your choice.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'dex'], amount: 1 }
    }
  };

  // ============================================================
  // PROFICIENCY BONUS BY LEVEL
  // ============================================================
  const PROFICIENCY_BONUS = {
    1: 2, 2: 2, 3: 2, 4: 2,
    5: 3, 6: 3, 7: 3, 8: 3,
    9: 4, 10: 4, 11: 4, 12: 4,
    13: 5, 14: 5, 15: 5, 16: 5,
    17: 6, 18: 6, 19: 6, 20: 6
  };

  // ============================================================
  // CLASS PROGRESSION DATA
  // ============================================================
  const CLASS_DATA = {
    'Barbarian': {
      hitDie: 12,
      primaryAbility: ['str'],
      savingThrows: ['str', 'con'],
      armorProficiencies: ['Light Armor', 'Medium Armor', 'Shields'],
      weaponProficiencies: ['Simple Weapons', 'Martial Weapons'],
      skillChoices: { count: 2, from: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] },
      spellcaster: false,
      features: {
        1: ['Rage (2/day)', 'Unarmored Defense'],
        2: ['Reckless Attack', 'Danger Sense'],
        3: ['Primal Path (Subclass)', 'Rage (3/day)'],
        4: ['Ability Score Improvement'],
        5: ['Extra Attack', 'Fast Movement (+10 ft)'],
        6: ['Path Feature', 'Rage (4/day)'],
        7: ['Feral Instinct'],
        8: ['Ability Score Improvement'],
        9: ['Brutal Critical (1 die)'],
        10: ['Path Feature', 'Rage (5/day)'],
        11: ['Relentless Rage'],
        12: ['Ability Score Improvement', 'Rage (6/day)'],
        13: ['Brutal Critical (2 dice)'],
        14: ['Path Feature'],
        15: ['Persistent Rage'],
        16: ['Ability Score Improvement'],
        17: ['Brutal Critical (3 dice), Rage (Unlimited)'],
        18: ['Indomitable Might'],
        19: ['Ability Score Improvement'],
        20: ['Primal Champion']
      }
    },

    'Bard': {
      hitDie: 8,
      primaryAbility: ['cha'],
      savingThrows: ['dex', 'cha'],
      armorProficiencies: ['Light Armor'],
      weaponProficiencies: ['Simple Weapons', 'Hand Crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
      skillChoices: { count: 3, from: 'any' },
      spellcaster: true,
      spellcastingAbility: 'cha',
      spellSlots: {
        1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
        18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
        19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
        20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
      },
      features: {
        1: ['Spellcasting', 'Bardic Inspiration (d6)'],
        2: ['Jack of All Trades', 'Song of Rest (d6)'],
        3: ['Bard College (Subclass)', 'Expertise'],
        4: ['Ability Score Improvement'],
        5: ['Bardic Inspiration (d8)', 'Font of Inspiration'],
        6: ['Countercharm', 'College Feature'],
        7: [],
        8: ['Ability Score Improvement'],
        9: ['Song of Rest (d8)'],
        10: ['Bardic Inspiration (d10)', 'Expertise', 'Magical Secrets'],
        11: [],
        12: ['Ability Score Improvement'],
        13: ['Song of Rest (d10)'],
        14: ['Magical Secrets', 'College Feature'],
        15: ['Bardic Inspiration (d12)'],
        16: ['Ability Score Improvement'],
        17: ['Song of Rest (d12)'],
        18: ['Magical Secrets'],
        19: ['Ability Score Improvement'],
        20: ['Superior Inspiration']
      }
    },

    'Cleric': {
      hitDie: 8,
      primaryAbility: ['wis'],
      savingThrows: ['wis', 'cha'],
      armorProficiencies: ['Light Armor', 'Medium Armor', 'Shields'],
      weaponProficiencies: ['Simple Weapons'],
      skillChoices: { count: 2, from: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
      spellcaster: true,
      spellcastingAbility: 'wis',
      spellSlots: {
        1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
        18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
        19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
        20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
      },
      features: {
        1: ['Spellcasting', 'Divine Domain (Subclass)'],
        2: ['Channel Divinity (1/rest)', 'Domain Feature'],
        3: [],
        4: ['Ability Score Improvement'],
        5: ['Destroy Undead (CR 1/2)'],
        6: ['Channel Divinity (2/rest)', 'Domain Feature'],
        7: [],
        8: ['Ability Score Improvement', 'Destroy Undead (CR 1)', 'Domain Feature'],
        9: [],
        10: ['Divine Intervention'],
        11: ['Destroy Undead (CR 2)'],
        12: ['Ability Score Improvement'],
        13: [],
        14: ['Destroy Undead (CR 3)'],
        15: [],
        16: ['Ability Score Improvement'],
        17: ['Destroy Undead (CR 4)', 'Domain Feature'],
        18: ['Channel Divinity (3/rest)'],
        19: ['Ability Score Improvement'],
        20: ['Divine Intervention Improvement']
      }
    },

    'Druid': {
      hitDie: 8,
      primaryAbility: ['wis'],
      savingThrows: ['int', 'wis'],
      armorProficiencies: ['Light Armor (nonmetal)', 'Medium Armor (nonmetal)', 'Shields (nonmetal)'],
      weaponProficiencies: ['Clubs', 'Daggers', 'Darts', 'Javelins', 'Maces', 'Quarterstaffs', 'Scimitars', 'Sickles', 'Slings', 'Spears'],
      skillChoices: { count: 2, from: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'] },
      spellcaster: true,
      spellcastingAbility: 'wis',
      spellSlots: {
        1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
        18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
        19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
        20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
      },
      features: {
        1: ['Druidic', 'Spellcasting'],
        2: ['Wild Shape', 'Druid Circle (Subclass)'],
        3: [],
        4: ['Wild Shape Improvement', 'Ability Score Improvement'],
        5: [],
        6: ['Circle Feature'],
        7: [],
        8: ['Wild Shape Improvement', 'Ability Score Improvement'],
        9: [],
        10: ['Circle Feature'],
        11: [],
        12: ['Ability Score Improvement'],
        13: [],
        14: ['Circle Feature'],
        15: [],
        16: ['Ability Score Improvement'],
        17: [],
        18: ['Timeless Body', 'Beast Spells'],
        19: ['Ability Score Improvement'],
        20: ['Archdruid']
      }
    },

    'Fighter': {
      hitDie: 10,
      primaryAbility: ['str', 'dex'],
      savingThrows: ['str', 'con'],
      armorProficiencies: ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shields'],
      weaponProficiencies: ['Simple Weapons', 'Martial Weapons'],
      skillChoices: { count: 2, from: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'] },
      spellcaster: false,
      features: {
        1: ['Fighting Style', 'Second Wind'],
        2: ['Action Surge (1/rest)'],
        3: ['Martial Archetype (Subclass)'],
        4: ['Ability Score Improvement'],
        5: ['Extra Attack'],
        6: ['Ability Score Improvement'],
        7: ['Archetype Feature'],
        8: ['Ability Score Improvement'],
        9: ['Indomitable (1/rest)'],
        10: ['Archetype Feature'],
        11: ['Extra Attack (2)'],
        12: ['Ability Score Improvement'],
        13: ['Indomitable (2/rest)'],
        14: ['Ability Score Improvement'],
        15: ['Archetype Feature'],
        16: ['Ability Score Improvement'],
        17: ['Action Surge (2/rest)', 'Indomitable (3/rest)'],
        18: ['Archetype Feature'],
        19: ['Ability Score Improvement'],
        20: ['Extra Attack (3)']
      }
    },

    'Monk': {
      hitDie: 8,
      primaryAbility: ['dex', 'wis'],
      savingThrows: ['str', 'dex'],
      armorProficiencies: [],
      weaponProficiencies: ['Simple Weapons', 'Shortswords'],
      skillChoices: { count: 2, from: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'] },
      spellcaster: false,
      features: {
        1: ['Unarmored Defense', 'Martial Arts (d4)'],
        2: ['Ki', 'Unarmored Movement (+10 ft)'],
        3: ['Monastic Tradition (Subclass)', 'Deflect Missiles'],
        4: ['Ability Score Improvement', 'Slow Fall'],
        5: ['Extra Attack', 'Stunning Strike', 'Martial Arts (d6)'],
        6: ['Ki-Empowered Strikes', 'Tradition Feature'],
        7: ['Evasion', 'Stillness of Mind'],
        8: ['Ability Score Improvement'],
        9: ['Unarmored Movement Improvement'],
        10: ['Purity of Body'],
        11: ['Tradition Feature', 'Martial Arts (d8)'],
        12: ['Ability Score Improvement'],
        13: ['Tongue of the Sun and Moon'],
        14: ['Diamond Soul'],
        15: ['Timeless Body'],
        16: ['Ability Score Improvement'],
        17: ['Tradition Feature', 'Martial Arts (d10)'],
        18: ['Empty Body'],
        19: ['Ability Score Improvement'],
        20: ['Perfect Self']
      }
    },

    'Paladin': {
      hitDie: 10,
      primaryAbility: ['str', 'cha'],
      savingThrows: ['wis', 'cha'],
      armorProficiencies: ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shields'],
      weaponProficiencies: ['Simple Weapons', 'Martial Weapons'],
      skillChoices: { count: 2, from: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'] },
      spellcaster: true,
      spellcastingAbility: 'cha',
      spellSlots: {
        1: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        4: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        6: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        8: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        9: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        10: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        11: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        12: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        13: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        14: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        15: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        16: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        17: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        18: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        19: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        20: [4, 3, 3, 3, 2, 0, 0, 0, 0]
      },
      features: {
        1: ['Divine Sense', 'Lay on Hands'],
        2: ['Fighting Style', 'Spellcasting', 'Divine Smite'],
        3: ['Divine Health', 'Sacred Oath (Subclass)'],
        4: ['Ability Score Improvement'],
        5: ['Extra Attack'],
        6: ['Aura of Protection'],
        7: ['Oath Feature'],
        8: ['Ability Score Improvement'],
        9: [],
        10: ['Aura of Courage'],
        11: ['Improved Divine Smite'],
        12: ['Ability Score Improvement'],
        13: [],
        14: ['Cleansing Touch'],
        15: ['Oath Feature'],
        16: ['Ability Score Improvement'],
        17: [],
        18: ['Aura Improvements'],
        19: ['Ability Score Improvement'],
        20: ['Oath Feature']
      }
    },

    'Ranger': {
      hitDie: 10,
      primaryAbility: ['dex', 'wis'],
      savingThrows: ['str', 'dex'],
      armorProficiencies: ['Light Armor', 'Medium Armor', 'Shields'],
      weaponProficiencies: ['Simple Weapons', 'Martial Weapons'],
      skillChoices: { count: 3, from: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'] },
      spellcaster: true,
      spellcastingAbility: 'wis',
      spellSlots: {
        1: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        4: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        6: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        8: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        9: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        10: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        11: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        12: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        13: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        14: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        15: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        16: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        17: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        18: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        19: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        20: [4, 3, 3, 3, 2, 0, 0, 0, 0]
      },
      features: {
        1: ['Favored Enemy', 'Natural Explorer'],
        2: ['Fighting Style', 'Spellcasting'],
        3: ['Ranger Archetype (Subclass)', 'Primeval Awareness'],
        4: ['Ability Score Improvement'],
        5: ['Extra Attack'],
        6: ['Favored Enemy Improvement', 'Natural Explorer Improvement'],
        7: ['Archetype Feature'],
        8: ['Ability Score Improvement', 'Land\'s Stride'],
        9: [],
        10: ['Natural Explorer Improvement', 'Hide in Plain Sight'],
        11: ['Archetype Feature'],
        12: ['Ability Score Improvement'],
        13: [],
        14: ['Favored Enemy Improvement', 'Vanish'],
        15: ['Archetype Feature'],
        16: ['Ability Score Improvement'],
        17: [],
        18: ['Feral Senses'],
        19: ['Ability Score Improvement'],
        20: ['Foe Slayer']
      }
    },

    'Rogue': {
      hitDie: 8,
      primaryAbility: ['dex'],
      savingThrows: ['dex', 'int'],
      armorProficiencies: ['Light Armor'],
      weaponProficiencies: ['Simple Weapons', 'Hand Crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
      skillChoices: { count: 4, from: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
      spellcaster: false,
      features: {
        1: ['Expertise', 'Sneak Attack (1d6)', 'Thieves\' Cant'],
        2: ['Cunning Action'],
        3: ['Roguish Archetype (Subclass)', 'Sneak Attack (2d6)'],
        4: ['Ability Score Improvement'],
        5: ['Uncanny Dodge', 'Sneak Attack (3d6)'],
        6: ['Expertise'],
        7: ['Evasion', 'Sneak Attack (4d6)'],
        8: ['Ability Score Improvement'],
        9: ['Archetype Feature', 'Sneak Attack (5d6)'],
        10: ['Ability Score Improvement'],
        11: ['Reliable Talent', 'Sneak Attack (6d6)'],
        12: ['Ability Score Improvement'],
        13: ['Archetype Feature', 'Sneak Attack (7d6)'],
        14: ['Blindsense'],
        15: ['Slippery Mind', 'Sneak Attack (8d6)'],
        16: ['Ability Score Improvement'],
        17: ['Archetype Feature', 'Sneak Attack (9d6)'],
        18: ['Elusive'],
        19: ['Ability Score Improvement', 'Sneak Attack (10d6)'],
        20: ['Stroke of Luck']
      }
    },

    'Sorcerer': {
      hitDie: 6,
      primaryAbility: ['cha'],
      savingThrows: ['con', 'cha'],
      armorProficiencies: [],
      weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light Crossbows'],
      skillChoices: { count: 2, from: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'] },
      spellcaster: true,
      spellcastingAbility: 'cha',
      spellSlots: {
        1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
        18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
        19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
        20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
      },
      features: {
        1: ['Spellcasting', 'Sorcerous Origin (Subclass)'],
        2: ['Font of Magic'],
        3: ['Metamagic (2 options)'],
        4: ['Ability Score Improvement'],
        5: [],
        6: ['Origin Feature'],
        7: [],
        8: ['Ability Score Improvement'],
        9: [],
        10: ['Metamagic (3 options)'],
        11: [],
        12: ['Ability Score Improvement'],
        13: [],
        14: ['Origin Feature'],
        15: [],
        16: ['Ability Score Improvement'],
        17: ['Metamagic (4 options)'],
        18: ['Origin Feature'],
        19: ['Ability Score Improvement'],
        20: ['Sorcerous Restoration']
      }
    },

    'Warlock': {
      hitDie: 8,
      primaryAbility: ['cha'],
      savingThrows: ['wis', 'cha'],
      armorProficiencies: ['Light Armor'],
      weaponProficiencies: ['Simple Weapons'],
      skillChoices: { count: 2, from: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
      spellcaster: true,
      spellcastingAbility: 'cha',
      pactMagic: true, // Special case
      pactSlots: {
        1: { level: 1, slots: 1 },
        2: { level: 1, slots: 2 },
        3: { level: 2, slots: 2 },
        4: { level: 2, slots: 2 },
        5: { level: 3, slots: 2 },
        6: { level: 3, slots: 2 },
        7: { level: 4, slots: 2 },
        8: { level: 4, slots: 2 },
        9: { level: 5, slots: 2 },
        10: { level: 5, slots: 2 },
        11: { level: 5, slots: 3 },
        12: { level: 5, slots: 3 },
        13: { level: 5, slots: 3 },
        14: { level: 5, slots: 3 },
        15: { level: 5, slots: 3 },
        16: { level: 5, slots: 3 },
        17: { level: 5, slots: 4 },
        18: { level: 5, slots: 4 },
        19: { level: 5, slots: 4 },
        20: { level: 5, slots: 4 }
      },
      features: {
        1: ['Otherworldly Patron (Subclass)', 'Pact Magic'],
        2: ['Eldritch Invocations (2)'],
        3: ['Pact Boon'],
        4: ['Ability Score Improvement'],
        5: ['Eldritch Invocations (3)'],
        6: ['Patron Feature'],
        7: ['Eldritch Invocations (4)'],
        8: ['Ability Score Improvement'],
        9: ['Eldritch Invocations (5)'],
        10: ['Patron Feature'],
        11: ['Mystic Arcanum (6th level)'],
        12: ['Ability Score Improvement', 'Eldritch Invocations (6)'],
        13: ['Mystic Arcanum (7th level)'],
        14: ['Patron Feature'],
        15: ['Mystic Arcanum (8th level)', 'Eldritch Invocations (7)'],
        16: ['Ability Score Improvement'],
        17: ['Mystic Arcanum (9th level)'],
        18: ['Eldritch Invocations (8)'],
        19: ['Ability Score Improvement'],
        20: ['Eldritch Master']
      }
    },

    'Wizard': {
      hitDie: 6,
      primaryAbility: ['int'],
      savingThrows: ['int', 'wis'],
      armorProficiencies: [],
      weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light Crossbows'],
      skillChoices: { count: 2, from: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] },
      spellcaster: true,
      spellcastingAbility: 'int',
      spellSlots: {
        1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
        18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
        19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
        20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
      },
      features: {
        1: ['Spellcasting', 'Arcane Recovery'],
        2: ['Arcane Tradition (Subclass)'],
        3: [],
        4: ['Ability Score Improvement'],
        5: [],
        6: ['Tradition Feature'],
        7: [],
        8: ['Ability Score Improvement'],
        9: [],
        10: ['Tradition Feature'],
        11: [],
        12: ['Ability Score Improvement'],
        13: [],
        14: ['Tradition Feature'],
        15: [],
        16: ['Ability Score Improvement'],
        17: [],
        18: ['Spell Mastery'],
        19: ['Ability Score Improvement'],
        20: ['Signature Spell']
      }
    }
  };

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    FEATS,
    PROFICIENCY_BONUS,
    CLASS_DATA,

    getClassData(className) {
      return CLASS_DATA[className] || null;
    },

    getProficiencyBonus(level) {
      return PROFICIENCY_BONUS[level] || 2;
    },

    getFeatData(featName) {
      return FEATS[featName] || null;
    },

    getAllFeats() {
      return Object.keys(FEATS).sort();
    },

    getClassesForLevel(level) {
      return Object.keys(CLASS_DATA);
    },

    getLevelUpChanges(className, fromLevel, toLevel) {
      const classData = CLASS_DATA[className];
      if (!classData) return null;

      const changes = {
        level: toLevel,
        hitDieRoll: classData.hitDie,
        proficiencyBonus: PROFICIENCY_BONUS[toLevel],
        features: classData.features[toLevel] || [],
        spellSlots: null,
        pactSlots: null,
        hasASI: (classData.features[toLevel] || []).includes('Ability Score Improvement')
      };

      // Add spell slots if applicable
      if (classData.spellcaster && classData.spellSlots) {
        changes.spellSlots = classData.spellSlots[toLevel];
      }

      // Add pact magic slots if warlock
      if (classData.pactMagic && classData.pactSlots) {
        changes.pactSlots = classData.pactSlots[toLevel];
      }

      return changes;
    }
  };
})();
