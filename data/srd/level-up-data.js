/**
 * D&D 5e Level-Up Data
 * Contains class progression tables, feat data, and level-up mechanics
 * Phase 1: Core 12 PHB classes (no subclasses yet)
 */

window.LevelUpData = (function() {
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
    },

    // ============================================================
    // TASHA'S CAULDRON OF EVERYTHING FEATS
    // ============================================================

    'Artificer Initiate': {
      name: 'Artificer Initiate',
      description: 'Learn one cantrip from the Artificer spell list. Learn one 1st-level spell from that list, cast it once per long rest at its lowest level, and you can cast it using any spell slots you have. Choose one type of artisan\'s tools to gain proficiency with. Intelligence is your spellcasting ability for these spells.',
      prerequisites: null,
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Chef': {
      name: 'Chef',
      description: 'Increase CON or WIS by 1. Gain proficiency with cook\'s utensils. As part of a short rest, cook food for up to 6 creatures who regain extra HP equal to your proficiency bonus. With 1 hour and cook\'s utensils, make treats equal to your proficiency bonus; eating one as a bonus action gives temporary HP equal to your proficiency bonus.',
      prerequisites: null,
      abilityIncrease: { choice: ['con', 'wis'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Crusher': {
      name: 'Crusher',
      description: 'Increase STR or CON by 1. Once per turn, when you hit with bludgeoning damage, you can move the creature 5 feet. When you score a critical hit with bludgeoning damage, attack rolls against that creature are made with advantage until the start of your next turn.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'con'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Eldritch Adept': {
      name: 'Eldritch Adept',
      description: 'Learn one Eldritch Invocation of your choice from the warlock class. If the invocation has prerequisites, you can choose it only if you\'re a warlock and meet those prerequisites. When you gain a level, you can replace the invocation.',
      prerequisites: { canCastSpell: true },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Fey Touched': {
      name: 'Fey Touched',
      description: 'Increase INT, WIS, or CHA by 1. Learn Misty Step and one 1st-level spell from the divination or enchantment school. You can cast each spell once per long rest without a spell slot, and you can cast them using spell slots you have of the appropriate level. Choose your spellcasting ability for these spells.',
      prerequisites: null,
      abilityIncrease: { choice: ['int', 'wis', 'cha'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Fighting Initiate': {
      name: 'Fighting Initiate',
      description: 'Learn one Fighting Style option from the fighter class. If you already have a style, the one you choose must be different. When you gain a level, you can replace this feat\'s fighting style with another one that you don\'t have.',
      prerequisites: { proficiency: 'Martial Weapon' },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Gunner': {
      name: 'Gunner',
      description: 'Increase DEX by 1. Gain proficiency with firearms. You ignore the loading property of firearms. Being within 5 feet of a hostile creature doesn\'t impose disadvantage on your ranged attack rolls.',
      prerequisites: null,
      abilityIncrease: { choice: ['dex'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Metamagic Adept': {
      name: 'Metamagic Adept',
      description: 'Learn two Metamagic options from the sorcerer class (can\'t pick one you already know). Gain 2 sorcery points to spend on Metamagic (regain all on long rest). These are in addition to sorcerer sorcery points.',
      prerequisites: { canCastSpell: true },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Piercer': {
      name: 'Piercer',
      description: 'Increase STR or DEX by 1. Once per turn, when you hit with piercing damage, you can reroll one damage die and use either result. When you score a critical hit with piercing damage, roll one additional damage die.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'dex'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Poisoner': {
      name: 'Poisoner',
      description: 'Increase INT or WIS by 1. Gain proficiency with poisoner\'s kit. You can apply poison to a weapon as a bonus action. When you make a damage roll that deals poison damage, ignore resistance to poison damage. You can coat a weapon in basic poison or vial of acid as a bonus action.',
      prerequisites: null,
      abilityIncrease: { choice: ['int', 'wis'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Practiced Expert': {
      name: 'Practiced Expert',
      description: 'Increase one ability score by 1. Gain proficiency in one skill of your choice. Choose one skill in which you have proficiency; you gain expertise with that skill, doubling your proficiency bonus for ability checks you make with it.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'dex', 'con', 'int', 'wis', 'cha'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Shadow Touched': {
      name: 'Shadow Touched',
      description: 'Increase INT, WIS, or CHA by 1. Learn Invisibility and one 1st-level spell from the illusion or necromancy school. You can cast each spell once per long rest without a spell slot, and you can cast them using spell slots you have. Choose your spellcasting ability for these spells.',
      prerequisites: null,
      abilityIncrease: { choice: ['int', 'wis', 'cha'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Skill Expert': {
      name: 'Skill Expert',
      description: 'Increase one ability score by 1. Gain proficiency in one skill of your choice. Choose one skill in which you have proficiency; you gain expertise with that skill.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'dex', 'con', 'int', 'wis', 'cha'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Slasher': {
      name: 'Slasher',
      description: 'Increase STR or DEX by 1. Once per turn when you hit with slashing damage, you can reduce the target\'s speed by 10 feet until the start of your next turn. When you score a critical hit with slashing damage, the target has disadvantage on attack rolls until the start of your next turn.',
      prerequisites: null,
      abilityIncrease: { choice: ['str', 'dex'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Telekinetic': {
      name: 'Telekinetic',
      description: 'Increase INT, WIS, or CHA by 1. Learn the Mage Hand cantrip (invisible). As a bonus action, you can try to shove one creature you can see within 30 feet (opposed Strength check vs. your spellcasting ability).',
      prerequisites: null,
      abilityIncrease: { choice: ['int', 'wis', 'cha'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },
    'Telepathic': {
      name: 'Telepathic',
      description: 'Increase INT, WIS, or CHA by 1. You can speak telepathically to any creature within 60 feet (it understands if you share a language). As an action, you can cast Detect Thoughts without components (save DC 8 + proficiency + spellcasting modifier). Once you cast it, you can\'t do so again until you finish a long rest, or you can cast it using a spell slot.',
      prerequisites: null,
      abilityIncrease: { choice: ['int', 'wis', 'cha'], amount: 1 },
      source: 'Tasha\'s Cauldron of Everything'
    },

    // ============================================================
    // XANATHAR'S GUIDE TO EVERYTHING FEATS
    // ============================================================

    'Bountiful Luck': {
      name: 'Bountiful Luck',
      description: 'When an ally you can see within 30 feet rolls a 1 on the d20 for an attack roll, ability check, or saving throw, you can use your reaction to let the ally reroll the die. The ally must use the new roll. Once you use this ability, you can\'t use it again until you finish a short or long rest.',
      prerequisites: { race: 'Halfling' },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Dragon Fear': {
      name: 'Dragon Fear',
      description: 'Increase STR, CON, or CHA by 1. Instead of exhaling destructive energy, you can expend a use of your Breath Weapon to roar. Each creature within 30 feet must succeed on a Wisdom saving throw or become frightened of you for 1 minute. A creature can repeat the save at the end of each of its turns, ending the effect on itself on a success.',
      prerequisites: { race: 'Dragonborn' },
      abilityIncrease: { choice: ['str', 'con', 'cha'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Dragon Hide': {
      name: 'Dragon Hide',
      description: 'Increase STR, CON, or CHA by 1. Your scales harden. While you aren\'t wearing armor, you can calculate your AC as 13 + your Dexterity modifier. You can use a shield and still gain this benefit. You grow retractable claws. Your unarmed strikes deal 1d4 + STR slashing damage.',
      prerequisites: { race: 'Dragonborn' },
      abilityIncrease: { choice: ['str', 'con', 'cha'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Drow High Magic': {
      name: 'Drow High Magic',
      description: 'You learn more magic from the Underdark. Learn Detect Magic. At 3rd level, learn Levitate. At 5th level, learn Dispel Magic. Each spell can be cast once per long rest without a spell slot. Charisma is your spellcasting ability for these spells.',
      prerequisites: { race: 'Elf (Drow)' },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Dwarven Fortitude': {
      name: 'Dwarven Fortitude',
      description: 'Increase CON by 1. When you take the Dodge action in combat, you can spend one Hit Die to heal yourself. Roll the die, add your Constitution modifier, and regain that many hit points.',
      prerequisites: { race: 'Dwarf' },
      abilityIncrease: { choice: ['con'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Elven Accuracy': {
      name: 'Elven Accuracy',
      description: 'Increase DEX, INT, WIS, or CHA by 1. When you have advantage on an attack roll using DEX, INT, WIS, or CHA, you can reroll one of the dice once.',
      prerequisites: { race: 'Elf' },
      abilityIncrease: { choice: ['dex', 'int', 'wis', 'cha'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Fade Away': {
      name: 'Fade Away',
      description: 'Increase DEX or INT by 1. When you take damage, you can use a reaction to become invisible until the end of your next turn or until you attack, deal damage, or force a save. Once you use this, you can\'t do so again until you finish a short or long rest.',
      prerequisites: { race: 'Gnome' },
      abilityIncrease: { choice: ['dex', 'int'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Fey Teleportation': {
      name: 'Fey Teleportation',
      description: 'Increase INT or CHA by 1. Learn to speak, read, and write Sylvan. Learn Misty Step and can cast it once per short or long rest without a spell slot. Intelligence is your spellcasting ability for this spell.',
      prerequisites: { race: 'Elf (High)' },
      abilityIncrease: { choice: ['int', 'cha'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Flames of Phlegethos': {
      name: 'Flames of Phlegethos',
      description: 'Increase INT or CHA by 1. When you roll fire damage for a spell, you can reroll any 1s, but must use the new roll. When you cast a spell that deals fire damage, you can cause flames to wreathe you until the end of your next turn. The flames shed bright light in 30 feet radius and dim light 30 feet beyond. Creatures within 5 feet that hit you with a melee attack take 1d4 fire damage.',
      prerequisites: { race: 'Tiefling' },
      abilityIncrease: { choice: ['int', 'cha'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Infernal Constitution': {
      name: 'Infernal Constitution',
      description: 'Increase CON by 1. You have resistance to cold and poison damage. You have advantage on saving throws against being poisoned.',
      prerequisites: { race: 'Tiefling' },
      abilityIncrease: { choice: ['con'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Orcish Fury': {
      name: 'Orcish Fury',
      description: 'Increase STR or CON by 1. When you hit with an attack using a simple or martial weapon, you can roll one of the weapon\'s damage dice an additional time and add it to the extra damage of the critical hit. When you use Relentless Endurance, you can use your reaction to make one weapon attack.',
      prerequisites: { race: 'Half-Orc' },
      abilityIncrease: { choice: ['str', 'con'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Prodigy': {
      name: 'Prodigy',
      description: 'Gain one skill proficiency, one tool proficiency, fluency in one language, and expertise in one skill you\'re proficient in.',
      prerequisites: { race: 'Half-Elf, Half-Orc, or Human' },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Second Chance': {
      name: 'Second Chance',
      description: 'Increase DEX, CON, or CHA by 1. When a creature you can see hits you with an attack roll, you can use your reaction to force that creature to reroll. Once you use this, you can\'t do so again until you roll initiative or finish a short or long rest.',
      prerequisites: { race: 'Halfling' },
      abilityIncrease: { choice: ['dex', 'con', 'cha'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Squat Nimbleness': {
      name: 'Squat Nimbleness',
      description: 'Increase STR or DEX by 1. Increase your walking speed by 5 feet. Gain proficiency in Acrobatics or Athletics (your choice). Advantage on checks to escape a grapple.',
      prerequisites: { race: 'Dwarf or Small race' },
      abilityIncrease: { choice: ['str', 'dex'], amount: 1 },
      source: 'Xanathar\'s Guide to Everything'
    },
    'Wood Elf Magic': {
      name: 'Wood Elf Magic',
      description: 'Learn one druid cantrip. Learn Longstrider and Pass Without Trace, each can be cast once per long rest without a spell slot. Wisdom is your spellcasting ability for these spells.',
      prerequisites: { race: 'Elf (Wood)' },
      source: 'Xanathar\'s Guide to Everything'
    },

    // ============================================================
    // ELEMENTAL EVIL PLAYER'S COMPANION FEATS
    // ============================================================

    'Elemental Adept': {
      name: 'Elemental Adept',
      description: 'Choose acid, cold, fire, lightning, or thunder. Spells you cast ignore resistance to that damage type. When you roll damage for a spell dealing that type, treat any 1 on a damage die as a 2. You can select this feat multiple times, choosing a different damage type each time.',
      prerequisites: { canCastSpell: true },
      source: 'Elemental Evil Player\'s Companion'
    },
    'Svirfneblin Magic': {
      name: 'Svirfneblin Magic',
      description: 'Learn the Nondetection spell and can cast it on yourself at will without material components. Learn Blindness/Deafness, Blur, and Disguise Self, each can be cast once per long rest without a spell slot. Intelligence is your spellcasting ability for these spells.',
      prerequisites: { race: 'Gnome (Deep Gnome)' },
      source: 'Elemental Evil Player\'s Companion'
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
  // SUBCLASS DATA (PHASE 2)
  // ============================================================
  const SUBCLASS_DATA = {
    'Fighter': {
      selectionLevel: 3,
      name: 'Martial Archetype',
      options: {
        'Champion': {
          name: 'Champion',
          description: 'Champions focus on the development of raw physical power honed to deadly perfection. Those who model themselves on this archetype combine rigorous training with physical excellence to deal devastating blows.',
          features: {
            3: ['Improved Critical'],
            7: ['Remarkable Athlete'],
            10: ['Additional Fighting Style'],
            15: ['Superior Critical'],
            18: ['Survivor']
          }
        },
        'Battle Master': {
          name: 'Battle Master',
          description: 'Battle Masters employ martial techniques passed down through generations. To a Battle Master, combat is an academic field, sometimes including subjects beyond battle such as weaponsmithing and calligraphy. Not every fighter absorbs the lessons of history, theory, and artistry that are reflected in the Battle Master archetype, but those who do are well-rounded fighters of great skill and knowledge.',
          features: {
            3: ['Combat Superiority', 'Student of War'],
            7: ['Know Your Enemy'],
            10: ['Improved Combat Superiority (d10)'],
            15: ['Relentless'],
            18: ['Improved Combat Superiority (d12)']
          }
        },
        'Eldritch Knight': {
          name: 'Eldritch Knight',
          description: 'Eldritch Knights combine the martial mastery common to all fighters with a careful study of magic. They use magical techniques similar to those practiced by wizards. They focus their study on two of the eight schools of magic: abjuration and evocation.',
          features: {
            3: ['Spellcasting', 'Weapon Bond'],
            7: ['War Magic'],
            10: ['Eldritch Strike'],
            15: ['Arcane Charge'],
            18: ['Improved War Magic']
          }
        },
        'Arcane Archer': {
          name: 'Arcane Archer',
          description: 'An Arcane Archer studies a unique elven method of archery that weaves magic into attacks to produce supernatural effects. Arcane Archers are some of the most elite warriors among the elves. They stand watch over the fringes of elven domains, keeping a keen eye out for trespassers and using magic-infused arrows to defeat monsters and invaders before they can reach elven settlements.',
          features: {
            3: ['Arcane Archer Lore', 'Arcane Shot (2 options)'],
            7: ['Magic Arrow', 'Curving Shot'],
            10: ['Arcane Shot (3 options)'],
            15: ['Ever-Ready Shot'],
            18: ['Arcane Shot (4 options)']
          }
        },
        'Cavalier': {
          name: 'Cavalier',
          description: 'The archetypal Cavalier excels at mounted combat. Usually born among the nobility and raised at court, a Cavalier is equally at home leading a cavalry charge or exchanging repartee at a state dinner. Cavaliers also learn how to guard those in their charge from harm, often serving as the protectors of their superiors and of the weak.',
          features: {
            3: ['Bonus Proficiency', 'Born to the Saddle', 'Unwavering Mark'],
            7: ['Warding Maneuver'],
            10: ['Hold the Line'],
            15: ['Ferocious Charger'],
            18: ['Vigilant Defender']
          }
        },
        'Samurai': {
          name: 'Samurai',
          description: 'The Samurai is a fighter who draws on an implacable fighting spirit to overcome enemies. A Samurai\'s resolve is nearly unbreakable, and the enemies in a Samurai\'s path have two choices: yield or die fighting.',
          features: {
            3: ['Bonus Proficiency', 'Fighting Spirit'],
            7: ['Elegant Courtier'],
            10: ['Tireless Spirit'],
            15: ['Rapid Strike'],
            18: ['Strength Before Death']
          }
        },
        'Psi Warrior': {
          name: 'Psi Warrior',
          description: 'Awake to the psionic power within, a Psi Warrior is a fighter who augments their physical might with psi-infused weapon strikes, telekinetic lashes, and barriers of mental force. Many githyanki train to become such warriors, as do some of the most disciplined high elves.',
          features: {
            3: ['Psionic Power', 'Telekinetic Movement'],
            7: ['Telekinetic Adept', 'Psi-Powered Leap'],
            10: ['Guarded Mind'],
            15: ['Bulwark of Force'],
            18: ['Telekinetic Master']
          }
        },
        'Rune Knight': {
          name: 'Rune Knight',
          description: 'Rune Knights enhance their martial prowess using the supernatural power of runes, an ancient practice that originated with giants. Rune cutters can be found among any family of giants, and you likely learned your methods first or second hand from such a mystical artisan.',
          features: {
            3: ['Bonus Proficiencies', 'Rune Carver', 'Giant\'s Might'],
            7: ['Runic Shield'],
            10: ['Great Stature'],
            15: ['Master of Runes'],
            18: ['Runic Juggernaut']
          }
        },
        'Echo Knight': {
          name: 'Echo Knight',
          description: 'A mysterious and feared frontline warrior of the Kryn Dynasty, the Echo Knight has mastered the art of using dunamis to summon the fading shades of unrealized timelines to aid them in battle. Surrounded by echoes of their own might, they charge into the fray as a cycling swarm of shadows and strikes.',
          features: {
            3: ['Manifest Echo', 'Unleash Incarnation'],
            7: ['Echo Avatar'],
            10: ['Shadow Martyr'],
            15: ['Reclaim Potential'],
            18: ['Legion of One']
          }
        }
      }
    },

    'Wizard': {
      selectionLevel: 2,
      name: 'Arcane Tradition',
      options: {
        'School of Abjuration': {
          name: 'School of Abjuration',
          description: 'The School of Abjuration emphasizes magic that blocks, banishes, or protects. Detractors of this school say that its tradition is about denial, negation rather than positive assertion. You understand, however, that ending harmful effects, protecting the weak, and banishing evil influences is anything but a philosophical void. It is a proud and respected vocation.',
          features: {
            2: ['Abjuration Savant', 'Arcane Ward'],
            6: ['Projected Ward'],
            10: ['Improved Abjuration'],
            14: ['Spell Resistance']
          }
        },
        'School of Conjuration': {
          name: 'School of Conjuration',
          description: 'As a conjurer, you favor spells that produce objects and creatures out of thin air. You can conjure billowing clouds of killing fog or summon creatures from elsewhere to fight on your behalf. As your mastery grows, you learn spells of transportation and can teleport yourself across vast distances, even to other planes of existence, in an instant.',
          features: {
            2: ['Conjuration Savant', 'Minor Conjuration'],
            6: ['Benign Transposition'],
            10: ['Focused Conjuration'],
            14: ['Durable Summons']
          }
        },
        'School of Divination': {
          name: 'School of Divination',
          description: 'The counsel of a diviner is sought by royalty and commoners alike, for all seek a clearer understanding of the past, present, and future. As a diviner, you strive to part the veils of space, time, and consciousness so that you can see clearly. You work to master spells of discernment, remote viewing, supernatural knowledge, and foresight.',
          features: {
            2: ['Divination Savant', 'Portent'],
            6: ['Expert Divination'],
            10: ['The Third Eye'],
            14: ['Greater Portent']
          }
        },
        'School of Enchantment': {
          name: 'School of Enchantment',
          description: 'As a member of the School of Enchantment, you have honed your ability to magically entrance and beguile other people and monsters. Some enchanters are peacemakers who bewitch the violent to lay down their arms and charm the cruel into showing mercy. Others are tyrants who magically bind the unwilling into their service. Most enchanters fall somewhere in between.',
          features: {
            2: ['Enchantment Savant', 'Hypnotic Gaze'],
            6: ['Instinctive Charm'],
            10: ['Split Enchantment'],
            14: ['Alter Memories']
          }
        },
        'School of Evocation': {
          name: 'School of Evocation',
          description: 'You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid. Some evokers find employment in military forces, serving as artillery to blast enemy armies from afar. Others use their spectacular power to protect the weak, while some seek their own gain as bandits, adventurers, or aspiring tyrants.',
          features: {
            2: ['Evocation Savant', 'Sculpt Spells'],
            6: ['Potent Cantrip'],
            10: ['Empowered Evocation'],
            14: ['Overchannel']
          }
        },
        'School of Illusion': {
          name: 'School of Illusion',
          description: 'You focus your studies on magic that dazzles the senses, befuddles the mind, and tricks even the wisest folk. Your magic is subtle, but the illusions crafted by your keen mind make the impossible seem real. Some illusionists are benign tricksters who use their spells to entertain. Others are more sinister masters of deception, using their illusions to frighten and fool others for their personal gain.',
          features: {
            2: ['Illusion Savant', 'Improved Minor Illusion'],
            6: ['Malleable Illusions'],
            10: ['Illusory Self'],
            14: ['Illusory Reality']
          }
        },
        'School of Necromancy': {
          name: 'School of Necromancy',
          description: 'The School of Necromancy explores the cosmic forces of life, death, and undeath. As you focus your studies in this tradition, you learn to manipulate the energy that animates all living things. As you progress, you learn to sap the life force from a creature as your magic destroys its body, transforming that vital energy into magical power you can manipulate.',
          features: {
            2: ['Necromancy Savant', 'Grim Harvest'],
            6: ['Undead Thralls'],
            10: ['Inured to Undeath'],
            14: ['Command Undead']
          }
        },
        'School of Transmutation': {
          name: 'School of Transmutation',
          description: 'You are a student of spells that modify energy and matter. To you, the world is not a fixed thing, but eminently mutable, and you delight in being an agent of change. You wield the raw stuff of creation and learn to alter both physical forms and mental qualities. Your magic gives you the tools to become a smith on reality\'s forge.',
          features: {
            2: ['Transmutation Savant', 'Minor Alchemy'],
            6: ['Transmuter\'s Stone'],
            10: ['Shapechanger'],
            14: ['Master Transmuter']
          }
        },
        'Bladesinging': {
          name: 'Bladesinging',
          description: 'Bladesingers are elves who bravely defend their people and lands. They are elf wizards who master a school of sword fighting grounded in a tradition of arcane magic. In combat, a bladesinger uses a series of intricate, elegant maneuvers that fend off harm and allow the bladesinger to channel magic into devastating attacks and a cunning defense.',
          features: {
            2: ['Training in War and Song', 'Bladesong'],
            6: ['Extra Attack'],
            10: ['Song of Defense'],
            14: ['Song of Victory']
          }
        },
        'War Magic': {
          name: 'War Magic',
          description: 'A variety of arcane colleges specialize in training wizards for war. The tradition of War Magic blends principles of evocation and abjuration, rather than specializing in either of those schools. It teaches techniques that empower a caster\'s spells, while also providing methods for wizards to bolster their own defenses.',
          features: {
            2: ['Arcane Deflection', 'Tactical Wit'],
            6: ['Power Surge'],
            10: ['Durable Magic'],
            14: ['Deflecting Shroud']
          }
        },
        'Order of Scribes': {
          name: 'Order of Scribes',
          description: 'Magic of the book—that\'s what many folk call wizardry. The name is apt, given how much time wizards spend poring over tomes and penning theories about the nature of magic. It\'s rare to see wizards traveling without books and scrolls sprouting from their bags, and a wizard would go to great lengths to plumb an archive of ancient knowledge.',
          features: {
            2: ['Wizardly Quill', 'Awakened Spellbook'],
            6: ['Manifest Mind'],
            10: ['Master Scrivener'],
            14: ['One with the Word']
          }
        }
      }
    },

    'Barbarian': {
      selectionLevel: 3,
      name: 'Primal Path',
      options: {
        'Path of the Berserker': {
          name: 'Path of the Berserker',
          description: 'For some barbarians, rage is a means to an end—that end being violence. The Path of the Berserker is a path of untrammeled fury, slick with blood. As you enter the berserker\'s rage, you thrill in the chaos of battle, heedless of your own health or well-being.',
          features: {
            3: ['Frenzy'],
            6: ['Mindless Rage'],
            10: ['Intimidating Presence'],
            14: ['Retaliation']
          }
        },
        'Path of the Totem Warrior': {
          name: 'Path of the Totem Warrior',
          description: 'The Path of the Totem Warrior is a spiritual journey, as the barbarian accepts a spirit animal as guide, protector, and inspiration. A barbarian who follows this path is taught to seek guidance through visions, signs in nature, and communion with animal spirits.',
          features: {
            3: ['Spirit Seeker', 'Totem Spirit (choose: Bear, Eagle, or Wolf)'],
            6: ['Aspect of the Beast'],
            10: ['Spirit Walker'],
            14: ['Totemic Attunement']
          }
        },
        'Path of the Ancestral Guardian': {
          name: 'Path of the Ancestral Guardian',
          description: 'Some barbarians hail from cultures that revere their ancestors. These tribes teach that the warriors of the past linger in the world as mighty spirits, who can guide and protect the living. When a barbarian who follows this path rages, the barbarian contacts the spirit world and calls on these guardian spirits for aid.',
          features: {
            3: ['Ancestral Protectors'],
            6: ['Spirit Shield'],
            10: ['Consult the Spirits'],
            14: ['Vengeful Ancestors']
          }
        },
        'Path of the Storm Herald': {
          name: 'Path of the Storm Herald',
          description: 'Typical barbarians harbor a fury that dwells within. Their rage grants them superior strength, durability, and speed. Barbarians who follow the Path of the Storm Herald learn instead to transform their rage into a mantle of primal magic that swirls around them. When in a fury, a barbarian of this path taps into nature to create powerful, magical effects.',
          features: {
            3: ['Storm Aura (choose: Desert, Sea, or Tundra)'],
            6: ['Storm Soul'],
            10: ['Shielding Storm'],
            14: ['Raging Storm']
          }
        },
        'Path of the Zealot': {
          name: 'Path of the Zealot',
          description: 'Some deities inspire their followers to pitch themselves into a ferocious battle fury. These barbarians are zealots—warriors who channel their rage into powerful displays of divine power. A variety of gods across many worlds inspire their followers to embrace this path, from Tempus the war god to the Fury and the Mockery of Eberron.',
          features: {
            3: ['Divine Fury', 'Warrior of the Gods'],
            6: ['Fanatical Focus'],
            10: ['Zealous Presence'],
            14: ['Rage Beyond Death']
          }
        },
        'Path of the Beast': {
          name: 'Path of the Beast',
          description: 'Barbarians who walk the Path of the Beast draw their rage from a bestial spark burning within their souls. That beast bursts forth in the throes of rage, physically transforming the barbarian. Such a barbarian might be inhabited by a primal spirit or be descended from shape-shifters. You can choose the origin of your feral might or determine it by rolling on the Origin of the Beast table.',
          features: {
            3: ['Form of the Beast'],
            6: ['Bestial Soul'],
            10: ['Infectious Fury'],
            14: ['Call the Hunt']
          }
        },
        'Path of Wild Magic': {
          name: 'Path of Wild Magic',
          description: 'Many places in the multiverse abound with beauty, intense emotion, and rampant magic; the Feywild, the Upper Planes, and other realms of supernatural power radiate with such forces and can profoundly influence people. As folk of deep feeling, barbarians are especially susceptible to these wild influences, with some barbarians being transformed by the magic. These magic-suffused barbarians walk the Path of Wild Magic.',
          features: {
            3: ['Magic Awareness', 'Wild Surge'],
            6: ['Bolstering Magic'],
            10: ['Unstable Backlash'],
            14: ['Controlled Surge']
          }
        }
      }
    },

    'Bard': {
      selectionLevel: 3,
      name: 'Bard College',
      options: {
        'College of Lore': {
          name: 'College of Lore',
          description: 'Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales. Whether singing folk ballads in taverns or elaborate compositions in royal courts, these bards use their gifts to hold audiences spellbound.',
          features: {
            3: ['Bonus Proficiencies', 'Cutting Words'],
            6: ['Additional Magical Secrets'],
            14: ['Peerless Skill']
          }
        },
        'College of Valor': {
          name: 'College of Valor',
          description: 'Bards of the College of Valor are daring skalds whose tales keep alive the memory of the great heroes of the past, and thereby inspire a new generation of heroes. These bards gather in mead halls or around great bonfires to sing the deeds of the mighty, both past and present.',
          features: {
            3: ['Bonus Proficiencies', 'Combat Inspiration'],
            6: ['Extra Attack'],
            14: ['Battle Magic']
          }
        },
        'College of Glamour': {
          name: 'College of Glamour',
          description: 'The College of Glamour is the home of bards who mastered their craft in the vibrant realm of the Feywild or under the tutelage of someone who dwelled there. Tutored by satyrs, eladrin, and other fey, these bards learn to use their magic to delight and captivate others.',
          features: {
            3: ['Mantle of Inspiration', 'Enthralling Performance'],
            6: ['Mantle of Majesty'],
            14: ['Unbreakable Majesty']
          }
        },
        'College of Swords': {
          name: 'College of Swords',
          description: 'Bards of the College of Swords are called blades, and they entertain through daring feats of weapon prowess. Their talent with weapons inspires many blades to lead double lives. One blade might use a circus troupe as cover for nefarious deeds such as assassination, robbery, and blackmail. Other blades strike at the wicked, bringing justice to bear against the cruel and powerful.',
          features: {
            3: ['Bonus Proficiencies', 'Fighting Style', 'Blade Flourish'],
            6: ['Extra Attack'],
            14: ['Master\'s Flourish']
          }
        },
        'College of Whispers': {
          name: 'College of Whispers',
          description: 'Most folk are happy to welcome a bard into their midst. Bards of the College of Whispers use this to their advantage. They appear to be like other bards, sharing news, singing songs, and telling tales to audiences. In truth, the College of Whispers teaches its students that they are wolves among sheep. These bards use their knowledge and magic to uncover secrets and turn them against others through extortion and threats.',
          features: {
            3: ['Psychic Blades', 'Words of Terror'],
            6: ['Mantle of Whispers'],
            14: ['Shadow Lore']
          }
        },
        'College of Creation': {
          name: 'College of Creation',
          description: 'Bards believe the cosmos is a work of art—the creation of the first dragons and gods. That creative work included harmonies that continue to resound through existence today, a power known as the Song of Creation. The bards of the College of Creation draw on that primeval song through dance, music, and poetry, and their teachers share this lesson: "Before the sun and the moon, there was the Song, and its music awoke the first dawn. Its melodies so delighted the stones and trees that some of them gained a voice of their own. And now they sing too."',
          features: {
            3: ['Mote of Potential', 'Performance of Creation'],
            6: ['Animating Performance'],
            14: ['Creative Crescendo']
          }
        },
        'College of Eloquence': {
          name: 'College of Eloquence',
          description: 'Adherents of the College of Eloquence master the art of oratory. Persuasion is regarded as a high art, and a well-reasoned, well-spoken argument often proves more persuasive than facts. These bards wield a blend of logic and theatrical wordplay, winning over skeptics and detractors with logical arguments and plucking at heartstrings to appeal to the emotions of audiences.',
          features: {
            3: ['Silver Tongue', 'Unsettling Words'],
            6: ['Unfailing Inspiration'],
            14: ['Universal Speech']
          }
        }
      }
    },

    'Cleric': {
      selectionLevel: 1,
      name: 'Divine Domain',
      options: {
        'Knowledge Domain': {
          name: 'Knowledge Domain',
          description: 'The gods of knowledge value learning and understanding above all. Some teach that knowledge is to be gathered and shared in libraries and universities, or promote the practical knowledge of craft and invention.',
          features: {
            1: ['Blessings of Knowledge'],
            2: ['Channel Divinity: Knowledge of the Ages'],
            6: ['Channel Divinity: Read Thoughts'],
            8: ['Potent Spellcasting'],
            17: ['Visions of the Past']
          }
        },
        'Life Domain': {
          name: 'Life Domain',
          description: 'The Life domain focuses on the vibrant positive energy—one of the fundamental forces of the universe—that sustains all life. The gods of life promote vitality and health through healing the sick and wounded, caring for those in need, and driving away the forces of death and undeath.',
          features: {
            1: ['Bonus Proficiency', 'Disciple of Life'],
            2: ['Channel Divinity: Preserve Life'],
            6: ['Blessed Healer'],
            8: ['Divine Strike'],
            17: ['Supreme Healing']
          }
        },
        'Light Domain': {
          name: 'Light Domain',
          description: 'Gods of light promote the ideals of rebirth and renewal, truth, vigilance, and beauty, often using the symbol of the sun. Some of these gods are portrayed as the sun itself or as a charioteer who guides the sun across the sky.',
          features: {
            1: ['Bonus Cantrip', 'Warding Flare'],
            2: ['Channel Divinity: Radiance of the Dawn'],
            6: ['Improved Flare'],
            8: ['Potent Spellcasting'],
            17: ['Corona of Light']
          }
        },
        'Nature Domain': {
          name: 'Nature Domain',
          description: 'Gods of nature are as varied as the natural world itself, from inscrutable gods of the deep forests to friendly deities associated with particular springs and groves. Druids revere nature as a whole and might serve one of these deities, practicing mysterious rites and reciting all-but-forgotten prayers.',
          features: {
            1: ['Acolyte of Nature', 'Bonus Proficiency'],
            2: ['Channel Divinity: Charm Animals and Plants'],
            6: ['Dampen Elements'],
            8: ['Divine Strike'],
            17: ['Master of Nature']
          }
        },
        'Tempest Domain': {
          name: 'Tempest Domain',
          description: 'Gods whose portfolios include the Tempest domain govern storms, sea, and sky. They include gods of lightning and thunder, gods of earthquakes, some fire gods, and certain gods of violence, physical strength, and courage.',
          features: {
            1: ['Bonus Proficiencies', 'Wrath of the Storm'],
            2: ['Channel Divinity: Destructive Wrath'],
            6: ['Thunderbolt Strike'],
            8: ['Divine Strike'],
            17: ['Stormborn']
          }
        },
        'Trickery Domain': {
          name: 'Trickery Domain',
          description: 'Gods of trickery are mischief-makers and instigators who stand as a constant challenge to the accepted order among both gods and mortals. They\'re patrons of thieves, scoundrels, gamblers, rebels, and liberators.',
          features: {
            1: ['Blessing of the Trickster'],
            2: ['Channel Divinity: Invoke Duplicity'],
            6: ['Channel Divinity: Cloak of Shadows'],
            8: ['Divine Strike'],
            17: ['Improved Duplicity']
          }
        },
        'War Domain': {
          name: 'War Domain',
          description: 'War has many manifestations. It can make heroes of ordinary people. It can be desperate and horrific, with acts of cruelty and cowardice eclipsing instances of excellence and courage. Gods of war watch over warriors and reward them for their great deeds.',
          features: {
            1: ['Bonus Proficiencies', 'War Priest'],
            2: ['Channel Divinity: Guided Strike'],
            6: ['Channel Divinity: War God\'s Blessing'],
            8: ['Divine Strike'],
            17: ['Avatar of Battle']
          }
        },
        'Forge Domain': {
          name: 'Forge Domain',
          description: 'The gods of the forge are patrons of artisans who work with metal, from a humble blacksmith who keeps a village in horseshoes and plow blades to the mighty elf artisan whose diamond-tipped arrows of mithral have felled demon lords. The gods of the forge teach that, with patience and hard work, even the most intractable metal can be transformed from a lump of ore to a beautifully wrought object.',
          features: {
            1: ['Bonus Proficiencies', 'Blessing of the Forge'],
            2: ['Channel Divinity: Artisan\'s Blessing'],
            6: ['Soul of the Forge'],
            8: ['Divine Strike'],
            17: ['Saint of Forge and Fire']
          }
        },
        'Grave Domain': {
          name: 'Grave Domain',
          description: 'Gods of the grave watch over the line between life and death. To these deities, death and the afterlife are a foundational part of the multiverse. To desecrate the peace of the dead is an abomination. Deities of the grave include Kelemvor, Wee Jas, the ancestral spirits of the Undying Court, Hades, Anubis, and Osiris. Followers of these deities seek to put wandering spirits to rest, destroy the undead, and ease the suffering of the dying.',
          features: {
            1: ['Circle of Mortality', 'Eyes of the Grave'],
            2: ['Channel Divinity: Path to the Grave'],
            6: ['Sentinel at Death\'s Door'],
            8: ['Potent Spellcasting'],
            17: ['Keeper of Souls']
          }
        },
        'Order Domain': {
          name: 'Order Domain',
          description: 'The Order Domain represents discipline, as well as devotion to the laws that govern a society, an institution, or a philosophy. Clerics of Order meditate on logic and justice as they serve their gods, examples of which appear in the Order Deities table. Clerics of Order believe that well-crafted laws establish legitimate hierarchies, and those selected by law to lead must be obeyed.',
          features: {
            1: ['Bonus Proficiencies', 'Voice of Authority'],
            2: ['Channel Divinity: Order\'s Demand'],
            6: ['Embodiment of the Law'],
            8: ['Divine Strike'],
            17: ['Order\'s Wrath']
          }
        },
        'Peace Domain': {
          name: 'Peace Domain',
          description: 'The balm of peace thrives at the heart of healthy communities, between friendly nations, and in the souls of the kindhearted. The gods of peace inspire people of all sorts to resolve conflict and to stand up against those forces that try to prevent peace from flourishing. Clerics of the Peace Domain preside over the signing of treaties, and they are often asked to arbitrate in disputes.',
          features: {
            1: ['Implement of Peace', 'Emboldening Bond'],
            2: ['Channel Divinity: Balm of Peace'],
            6: ['Protective Bond'],
            8: ['Potent Spellcasting'],
            17: ['Expansive Bond']
          }
        },
        'Twilight Domain': {
          name: 'Twilight Domain',
          description: 'The twilight transition from light into darkness often brings calm and even joy, as the day\'s labors end and the hours of rest begin. The darkness can also bring terrors, but the gods of twilight guard against the horrors of the night. Clerics who serve these deities bring comfort to those who seek rest and protect them by venturing into the encroaching darkness to ensure that the dark is a comfort, not a terror.',
          features: {
            1: ['Bonus Proficiencies', 'Eyes of Night', 'Vigilant Blessing'],
            2: ['Channel Divinity: Twilight Sanctuary'],
            6: ['Steps of Night'],
            8: ['Divine Strike'],
            17: ['Twilight Shroud']
          }
        }
      }
    },

    'Druid': {
      selectionLevel: 2,
      name: 'Druid Circle',
      options: {
        'Circle of the Land': {
          name: 'Circle of the Land',
          description: 'The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition. These druids meet within sacred circles of trees or standing stones to whisper primal secrets in Druidic.',
          features: {
            2: ['Bonus Cantrip', 'Natural Recovery', 'Circle Spells (choose terrain: Arctic, Coast, Desert, Forest, Grassland, Mountain, Swamp, or Underdark)'],
            6: ['Land\'s Stride'],
            10: ['Nature\'s Ward'],
            14: ['Nature\'s Sanctuary']
          }
        },
        'Circle of the Moon': {
          name: 'Circle of the Moon',
          description: 'Druids of the Circle of the Moon are fierce guardians of the wilds. Their order gathers under the full moon to share news and trade warnings. They haunt the deepest parts of the wilderness, where they might go for weeks before crossing paths with another humanoid creature.',
          features: {
            2: ['Combat Wild Shape', 'Circle Forms'],
            6: ['Primal Strike'],
            10: ['Elemental Wild Shape'],
            14: ['Thousand Forms']
          }
        },
        'Circle of Dreams': {
          name: 'Circle of Dreams',
          description: 'Druids who are members of the Circle of Dreams hail from regions that have strong ties to the Feywild and its dreamlike realms. The druids\' guardianship of the natural world makes for a natural alliance between them and good-aligned fey. These druids seek to fill the world with dreamy wonder.',
          features: {
            2: ['Balm of the Summer Court'],
            6: ['Hearth of Moonlight and Shadow'],
            10: ['Hidden Paths'],
            14: ['Walker in Dreams']
          }
        },
        'Circle of the Shepherd': {
          name: 'Circle of the Shepherd',
          description: 'Druids of the Circle of the Shepherd commune with the spirits of nature, especially the spirits of beasts and the fey, and call to those spirits for aid. These druids recognize that all living things play a role in the natural world, yet they focus on protecting animals and fey creatures that have difficulty defending themselves.',
          features: {
            2: ['Speech of the Woods', 'Spirit Totem'],
            6: ['Mighty Summoner'],
            10: ['Guardian Spirit'],
            14: ['Faithful Summons']
          }
        },
        'Circle of Spores': {
          name: 'Circle of Spores',
          description: 'Druids of the Circle of Spores find beauty in decay. They see within mold and other fungi the ability to transform lifeless material into abundant, albeit somewhat strange, life. These druids believe that life and death are parts of a grand cycle, with one leading to the other and then back again.',
          features: {
            2: ['Circle Spells', 'Halo of Spores', 'Symbiotic Entity'],
            6: ['Fungal Infestation'],
            10: ['Spreading Spores'],
            14: ['Fungal Body']
          }
        },
        'Circle of Stars': {
          name: 'Circle of Stars',
          description: 'The Circle of Stars allows druids to draw on the power of starlight. These druids have tracked heavenly patterns since time immemorial, discovering secrets hidden amid the constellations. By revealing and understanding these secrets, the Circle of the Stars seeks to harness the powers of the cosmos.',
          features: {
            2: ['Star Map', 'Starry Form'],
            6: ['Cosmic Omen'],
            10: ['Twinkling Constellations'],
            14: ['Full of Stars']
          }
        },
        'Circle of Wildfire': {
          name: 'Circle of Wildfire',
          description: 'Druids within the Circle of Wildfire understand that destruction is sometimes the precursor of creation, such as when a forest fire promotes later growth. These druids bond with a primal spirit that harbors both destructive and creative power, allowing the druids to create controlled flames that burn away one thing but give life to another.',
          features: {
            2: ['Circle Spells', 'Summon Wildfire Spirit'],
            6: ['Enhanced Bond'],
            10: ['Cauterizing Flames'],
            14: ['Blazing Revival']
          }
        }
      }
    },

    'Monk': {
      selectionLevel: 3,
      name: 'Monastic Tradition',
      options: {
        'Way of the Open Hand': {
          name: 'Way of the Open Hand',
          description: 'Monks of the Way of the Open Hand are the ultimate masters of martial arts combat, whether armed or unarmed. They learn techniques to push and trip their opponents, manipulate ki to heal damage to their bodies, and practice advanced meditation that can protect them from harm.',
          features: {
            3: ['Open Hand Technique'],
            6: ['Wholeness of Body'],
            11: ['Tranquility'],
            17: ['Quivering Palm']
          }
        },
        'Way of Shadow': {
          name: 'Way of Shadow',
          description: 'Monks of the Way of Shadow follow a tradition that values stealth and subterfuge. These monks might be called ninjas or shadowdancers, and they serve as spies and assassins. Sometimes the members of a ninja monastery are family members, forming a clan sworn to secrecy about their arts and missions.',
          features: {
            3: ['Shadow Arts'],
            6: ['Shadow Step'],
            11: ['Cloak of Shadows'],
            17: ['Opportunist']
          }
        },
        'Way of the Four Elements': {
          name: 'Way of the Four Elements',
          description: 'You follow a monastic tradition that teaches you to harness the elements. When you focus your ki, you can align yourself with the forces of creation and bend the four elements to your will, using them as an extension of your body.',
          features: {
            3: ['Disciple of the Elements'],
            6: ['Extra Elemental Disciplines'],
            11: ['Extra Elemental Disciplines'],
            17: ['Extra Elemental Disciplines']
          }
        },
        'Way of the Sun Soul': {
          name: 'Way of the Sun Soul',
          description: 'Monks of the Way of the Sun Soul learn to channel their life energy into searing bolts of light. They teach that meditation can unlock the ability to unleash the indomitable light shed by the soul of every living creature.',
          features: {
            3: ['Radiant Sun Bolt'],
            6: ['Searing Arc Strike'],
            11: ['Searing Sunburst'],
            17: ['Sun Shield']
          }
        },
        'Way of the Long Death': {
          name: 'Way of the Long Death',
          description: 'Monks of the Way of the Long Death are obsessed with the meaning and mechanics of dying. They capture creatures and prepare elaborate experiments to capture, record, and understand the moments of their demise. They then use this knowledge to guide their understanding of martial arts, yielding a deadly fighting style.',
          features: {
            3: ['Touch of Death'],
            6: ['Hour of Reaping'],
            11: ['Mastery of Death'],
            17: ['Touch of the Long Death']
          }
        },
        'Way of the Kensei': {
          name: 'Way of the Kensei',
          description: 'Monks of the Way of the Kensei train relentlessly with their weapons, to the point where the weapon becomes an extension of the body. Founded on a mastery of sword fighting, the tradition has expanded to include many different weapons.',
          features: {
            3: ['Path of the Kensei', 'Kensei Weapons'],
            6: ['One with the Blade'],
            11: ['Sharpen the Blade'],
            17: ['Unerring Accuracy']
          }
        },
        'Way of Mercy': {
          name: 'Way of Mercy',
          description: 'Monks of the Way of Mercy learn to manipulate the life force of others to bring aid to those in need. They are wandering physicians to the poor and hurt. However, to those beyond their help, they bring a swift end as an act of mercy.',
          features: {
            3: ['Implements of Mercy', 'Hand of Healing', 'Hand of Harm'],
            6: ['Physician\'s Touch'],
            11: ['Flurry of Healing and Harm'],
            17: ['Hand of Ultimate Mercy']
          }
        },
        'Way of the Astral Self': {
          name: 'Way of the Astral Self',
          description: 'A monk who follows the Way of the Astral Self believes their body is an illusion. They see their ki as a representation of their true form, an astral self. This astral self has the capacity to be a force of order or disorder, with some monasteries training students to use their power to protect the weak and other instructing aspirants in how to manifest their true selves in service to the mighty.',
          features: {
            3: ['Arms of the Astral Self'],
            6: ['Visage of the Astral Self'],
            11: ['Body of the Astral Self'],
            17: ['Awakening of the Astral Self']
          }
        },
        'Way of the Ascendant Dragon': {
          name: 'Way of the Ascendant Dragon',
          description: 'The fundamental teaching of this tradition holds that by emulating dragons, a monk becomes a more integrated part of the world and its magic. By altering their spirit to resonate with draconic might, monks who follow this tradition augment their prowess in battle, bolster their allies, and can even soar through the air on draconic wings.',
          features: {
            3: ['Draconic Disciple', 'Breath of the Dragon'],
            6: ['Wings Unfurled'],
            11: ['Aspect of the Wyrm'],
            17: ['Ascendant Aspect']
          }
        }
      }
    },

    'Paladin': {
      selectionLevel: 3,
      name: 'Sacred Oath',
      options: {
        'Oath of Devotion': {
          name: 'Oath of Devotion',
          description: 'The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order. Sometimes called cavaliers, white knights, or holy warriors, these paladins meet the ideal of the knight in shining armor, acting with honor in pursuit of justice and the greater good.',
          features: {
            3: ['Oath Spells', 'Channel Divinity: Sacred Weapon', 'Channel Divinity: Turn the Unholy'],
            7: ['Aura of Devotion'],
            15: ['Purity of Spirit'],
            20: ['Holy Nimbus']
          }
        },
        'Oath of the Ancients': {
          name: 'Oath of the Ancients',
          description: 'The Oath of the Ancients is as old as the race of elves and the rituals of the druids. Sometimes called fey knights, green knights, or horned knights, paladins who swear this oath cast their lot with the side of the light in the cosmic struggle against darkness.',
          features: {
            3: ['Oath Spells', 'Channel Divinity: Nature\'s Wrath', 'Channel Divinity: Turn the Faithless'],
            7: ['Aura of Warding'],
            15: ['Undying Sentinel'],
            20: ['Elder Champion']
          }
        },
        'Oath of Vengeance': {
          name: 'Oath of Vengeance',
          description: 'The Oath of Vengeance is a solemn commitment to punish those who have committed a grievous sin. When evil forces slaughter helpless villagers, when an entire people turns against the will of the gods, when a thieves\' guild grows too violent and powerful, paladins swear an Oath of Vengeance to set right that which has gone wrong.',
          features: {
            3: ['Oath Spells', 'Channel Divinity: Abjure Enemy', 'Channel Divinity: Vow of Enmity'],
            7: ['Relentless Avenger'],
            15: ['Soul of Vengeance'],
            20: ['Avenging Angel']
          }
        },
        'Oath of Conquest': {
          name: 'Oath of Conquest',
          description: 'The Oath of Conquest calls to paladins who seek glory in battle and the subjugation of their enemies. It isn\'t enough for these paladins to establish order. They must crush the forces of chaos. Sometimes called knight tyrants or iron mongers, those who swear this oath gather into grim orders that serve gods or philosophies of war and well-ordered might.',
          features: {
            3: ['Oath Spells', 'Channel Divinity: Conquering Presence', 'Channel Divinity: Guided Strike'],
            7: ['Aura of Conquest'],
            15: ['Scornful Rebuke'],
            20: ['Invincible Conqueror']
          }
        },
        'Oath of Redemption': {
          name: 'Oath of Redemption',
          description: 'The Oath of Redemption sets a paladin on a difficult path, one that requires a holy warrior to use violence only as a last resort. Paladins who dedicate themselves to this oath believe that any person can be redeemed and that the path of benevolence and justice is one that anyone can walk. These paladins face evil creatures in the hope of turning their foes to the light, and they slay their enemies only when such a deed will clearly save other lives.',
          features: {
            3: ['Oath Spells', 'Channel Divinity: Emissary of Peace', 'Channel Divinity: Rebuke the Violent'],
            7: ['Aura of the Guardian'],
            15: ['Protective Spirit'],
            20: ['Emissary of Redemption']
          }
        },
        'Oath of Glory': {
          name: 'Oath of Glory',
          description: 'Paladins who take the Oath of Glory believe they and their companions are destined to achieve glory through deeds of heroism. They train diligently and encourage their companions so they\'re all ready when destiny calls.',
          features: {
            3: ['Oath Spells', 'Channel Divinity: Peerless Athlete', 'Channel Divinity: Inspiring Smite'],
            7: ['Aura of Alacrity'],
            15: ['Glorious Defense'],
            20: ['Living Legend']
          }
        },
        'Oath of the Watchers': {
          name: 'Oath of the Watchers',
          description: 'The Oath of the Watchers binds paladins to protect mortal realms from the predations of extraplanar creatures, many of which can lay waste to mortal soldiers. Thus, the Watchers hone their minds, spirits, and bodies to be the ultimate weapons against such threats.',
          features: {
            3: ['Oath Spells', 'Channel Divinity: Watcher\'s Will', 'Channel Divinity: Abjure the Extraplanar'],
            7: ['Aura of the Sentinel'],
            15: ['Vigilant Rebuke'],
            20: ['Mortal Bulwark']
          }
        },
        'Oath of the Crown': {
          name: 'Oath of the Crown',
          description: 'The Oath of the Crown is sworn to the ideals of civilization, be it the spirit of a nation, fealty to a sovereign, or service to a deity of law and rulership. The paladins who swear this oath dedicate themselves to serving society and, in particular, the just laws that hold society together.',
          features: {
            3: ['Oath Spells', 'Channel Divinity: Champion Challenge', 'Channel Divinity: Turn the Tide'],
            7: ['Divine Allegiance'],
            15: ['Unyielding Spirit'],
            20: ['Exalted Champion']
          }
        }
      }
    },

    'Ranger': {
      selectionLevel: 3,
      name: 'Ranger Archetype',
      options: {
        'Hunter': {
          name: 'Hunter',
          description: 'Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness. As you walk the Hunter\'s path, you learn specialized techniques for fighting the threats you face, from rampaging ogres to towering giants and terrifying dragons.',
          features: {
            3: ['Hunter\'s Prey (choose: Colossus Slayer, Giant Killer, or Horde Breaker)'],
            7: ['Defensive Tactics (choose: Escape the Horde, Multiattack Defense, or Steel Will)'],
            11: ['Multiattack (choose: Volley or Whirlwind Attack)'],
            15: ['Superior Hunter\'s Defense (choose: Evasion, Stand Against the Tide, or Uncanny Dodge)']
          }
        },
        'Beast Master': {
          name: 'Beast Master',
          description: 'The Beast Master archetype embodies a friendship between the civilized races and the beasts of the world. United in focus, beast and ranger work as one to fight the monstrous foes that threaten civilization and the wilderness alike.',
          features: {
            3: ['Ranger\'s Companion'],
            7: ['Exceptional Training'],
            11: ['Bestial Fury'],
            15: ['Share Spells']
          }
        },
        'Gloom Stalker': {
          name: 'Gloom Stalker',
          description: 'Gloom Stalkers are at home in the darkest places: deep under the earth, in gloomy alleyways, in primeval forests, and wherever else the light dims. Most folk enter such places with trepidation, but a Gloom Stalker ventures boldly into the darkness, seeking to ambush threats before they can reach the broader world.',
          features: {
            3: ['Dread Ambusher', 'Umbral Sight'],
            7: ['Iron Mind'],
            11: ['Stalker\'s Flurry'],
            15: ['Shadowy Dodge']
          }
        },
        'Horizon Walker': {
          name: 'Horizon Walker',
          description: 'Horizon Walkers guard the world against threats that originate from other planes or that seek to ravage the mortal realm with otherworldly magic. They seek out planar portals and keep watch over them, venturing to the Inner Planes and the Outer Planes as needed to pursue their foes.',
          features: {
            3: ['Detect Portal', 'Planar Warrior'],
            7: ['Ethereal Step'],
            11: ['Distant Strike'],
            15: ['Spectral Defense']
          }
        },
        'Monster Slayer': {
          name: 'Monster Slayer',
          description: 'You have dedicated yourself to hunting down creatures of the night and wielders of grim magic. A Monster Slayer seeks out vampires, dragons, evil fey, fiends, and other magical threats. Trained in supernatural techniques to overcome such monsters, slayers are experts at unearthing and defeating mighty, mystical foes.',
          features: {
            3: ['Hunter\'s Sense', 'Slayer\'s Prey'],
            7: ['Supernatural Defense'],
            11: ['Magic-User\'s Nemesis'],
            15: ['Slayer\'s Counter']
          }
        },
        'Fey Wanderer': {
          name: 'Fey Wanderer',
          description: 'A fey mystique surrounds you, thanks to the boon of an archfey, the shining fruit you ate from a talking tree, the magic spring you swam in, or some other auspicious event. However you acquired your fey magic, you are now a Fey Wanderer, a ranger who represents both the mortal and the fey realms. As you wander the multiverse, your joyful laughter brightens the hearts of the downtrodden, and your martial prowess strikes terror in your foes.',
          features: {
            3: ['Dreadful Strikes', 'Otherworldly Glamour'],
            7: ['Beguiling Twist'],
            11: ['Fey Reinforcements'],
            15: ['Misty Wanderer']
          }
        },
        'Swarmkeeper': {
          name: 'Swarmkeeper',
          description: 'Feeling a deep connection to the environment around them, some rangers reach out through their magical connection to the world and bond with a swarm of nature spirits. The swarm becomes a potent force in battle, as well as helpful company for the ranger. Some Swarmkeepers are outcasts or hermits, keeping to themselves and their attendant swarms rather than dealing with the discomfort of others.',
          features: {
            3: ['Gathered Swarm', 'Swarmkeeper Magic'],
            7: ['Writhing Tide'],
            11: ['Mighty Swarm'],
            15: ['Swarming Dispersal']
          }
        },
        'Drakewarden': {
          name: 'Drakewarden',
          description: 'Your connection to the natural world takes the form of a draconic spirit, which can manifest in physical form as a drake. As your powers grow, your drake grows as well, blossoming from a small four-legged companion to a majestic winged creature large and strong enough for you to ride.',
          features: {
            3: ['Draconic Gift', 'Drake Companion'],
            7: ['Bond of Fang and Scale'],
            11: ['Drake\'s Breath'],
            15: ['Perfected Bond']
          }
        }
      }
    },

    'Rogue': {
      selectionLevel: 3,
      name: 'Roguish Archetype',
      options: {
        'Thief': {
          name: 'Thief',
          description: 'You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype, but so do rogues who prefer to think of themselves as professional treasure seekers, explorers, delvers, and investigators.',
          features: {
            3: ['Fast Hands', 'Second-Story Work'],
            9: ['Supreme Sneak'],
            13: ['Use Magic Device'],
            17: ['Thief\'s Reflexes']
          }
        },
        'Assassin': {
          name: 'Assassin',
          description: 'You focus your training on the grim art of death. Those who adhere to this archetype are diverse: hired killers, spies, bounty hunters, and even specially anointed priests trained to exterminate the enemies of their deity. Stealth, poison, and disguise help you eliminate your foes with deadly efficiency.',
          features: {
            3: ['Bonus Proficiencies', 'Assassinate'],
            9: ['Infiltration Expertise'],
            13: ['Impostor'],
            17: ['Death Strike']
          }
        },
        'Arcane Trickster': {
          name: 'Arcane Trickster',
          description: 'Some rogues enhance their fine-honed skills of stealth and agility with magic, learning tricks of enchantment and illusion. These rogues include pickpockets and burglars, but also pranksters, mischief-makers, and a significant number of adventurers.',
          features: {
            3: ['Spellcasting', 'Mage Hand Legerdemain'],
            9: ['Magical Ambush'],
            13: ['Versatile Trickster'],
            17: ['Spell Thief']
          }
        },
        'Inquisitive': {
          name: 'Inquisitive',
          description: 'As an archetypal Inquisitive, you excel at rooting out secrets and unraveling mysteries. You rely on your sharp eye for detail, but also on your finely honed ability to read the words and deeds of other creatures to determine their true intent. You excel at defeating creatures that hide among and prey upon ordinary folk, and your mastery of lore and your keen deductions make you well equipped to expose and end hidden evils.',
          features: {
            3: ['Ear for Deceit', 'Eye for Detail', 'Insightful Fighting'],
            9: ['Steady Eye'],
            13: ['Unerring Eye'],
            17: ['Eye for Weakness']
          }
        },
        'Mastermind': {
          name: 'Mastermind',
          description: 'Your focus is on people and on the influence and secrets they have. Many spies, courtiers, and schemers follow this archetype, leading lives of intrigue. Words are your weapons as often as knives or poison, and secrets and favors are some of your favorite treasures.',
          features: {
            3: ['Master of Intrigue', 'Master of Tactics'],
            9: ['Insightful Manipulator'],
            13: ['Misdirection'],
            17: ['Soul of Deceit']
          }
        },
        'Scout': {
          name: 'Scout',
          description: 'You are skilled in stealth and surviving far from the streets of a city, allowing you to scout ahead of your companions during expeditions. Rogues who embrace this archetype are at home in the wilderness and among barbarians and rangers, and many Scouts serve as the eyes and ears of war bands.',
          features: {
            3: ['Skirmisher', 'Survivalist'],
            9: ['Superior Mobility'],
            13: ['Ambush Master'],
            17: ['Sudden Strike']
          }
        },
        'Swashbuckler': {
          name: 'Swashbuckler',
          description: 'You focus your training on the art of the blade, relying on speed, elegance, and charm in equal parts. While some warriors are brutes clad in heavy armor, your method of fighting looks almost like a performance. Duelists and pirates typically belong to this archetype.',
          features: {
            3: ['Fancy Footwork', 'Rakish Audacity'],
            9: ['Panache'],
            13: ['Elegant Maneuver'],
            17: ['Master Duelist']
          }
        },
        'Phantom': {
          name: 'Phantom',
          description: 'Many rogues walk a fine line between life and death, risking their own lives and taking the lives of others. While adventuring on that line, some rogues discover a mystical connection to death itself. These rogues take knowledge from the dead and become immersed in negative energy, eventually becoming like ghosts.',
          features: {
            3: ['Whispers of the Dead', 'Wails from the Grave'],
            9: ['Tokens of the Departed'],
            13: ['Ghost Walk'],
            17: ['Death\'s Friend']
          }
        },
        'Soulknife': {
          name: 'Soulknife',
          description: 'Most assassins strike with physical weapons, and many burglars and spies use thieves\' tools to infiltrate secure locations. In contrast, a Soulknife strikes and infiltrates with the mind, cutting through barriers both physical and psychic. These rogues discover psionic power within themselves and channel it to do their roguish work.',
          features: {
            3: ['Psionic Power', 'Psychic Blades'],
            9: ['Soul Blades'],
            13: ['Psychic Veil'],
            17: ['Rend Mind']
          }
        }
      }
    },

    'Sorcerer': {
      selectionLevel: 1,
      name: 'Sorcerous Origin',
      options: {
        'Draconic Bloodline': {
          name: 'Draconic Bloodline',
          description: 'Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors. Most often, sorcerers with this origin trace their descent back to a mighty sorcerer of ancient times who made a bargain with a dragon or who might even have claimed a dragon parent.',
          features: {
            1: ['Dragon Ancestor (choose type)', 'Draconic Resilience'],
            6: ['Elemental Affinity'],
            14: ['Dragon Wings'],
            18: ['Draconic Presence']
          }
        },
        'Wild Magic': {
          name: 'Wild Magic',
          description: 'Your innate magic comes from the wild forces of chaos that underlie the order of creation. You might have endured exposure to some form of raw magic, perhaps through a planar portal leading to Limbo, the Elemental Planes, or the mysterious Far Realm.',
          features: {
            1: ['Wild Magic Surge', 'Tides of Chaos'],
            6: ['Bend Luck'],
            14: ['Controlled Chaos'],
            18: ['Spell Bombardment']
          }
        },
        'Divine Soul': {
          name: 'Divine Soul',
          description: 'Sometimes the spark of magic that fuels a sorcerer comes from a divine source that glimmers within the soul. Having such a blessed soul is a sign that your innate magic might come from a distant but powerful familial connection to a divine being. Perhaps your ancestor was an angel, transformed into a mortal and sent to fight in a god\'s name. Or your birth might align with an ancient prophecy, marking you as a servant of the gods or a chosen vessel of divine magic.',
          features: {
            1: ['Divine Magic', 'Favored by the Gods'],
            6: ['Empowered Healing'],
            14: ['Otherworldly Wings'],
            18: ['Unearthly Recovery']
          }
        },
        'Shadow Magic': {
          name: 'Shadow Magic',
          description: 'You are a creature of shadow, for your innate magic comes from the Shadowfell itself. You might trace your lineage to an entity from that place, or perhaps you were exposed to its fell energy and transformed by it. The power of shadow magic casts a strange pall over your physical presence. The spark of life that sustains you is muffled, as if it struggles to remain viable against the dark energy that imbues your soul.',
          features: {
            1: ['Eyes of the Dark', 'Strength of the Grave'],
            6: ['Hound of Ill Omen'],
            14: ['Shadow Walk'],
            18: ['Umbral Form']
          }
        },
        'Storm Sorcery': {
          name: 'Storm Sorcery',
          description: 'Your innate magic comes from the power of elemental air. Many with this power can trace their magic back to a near-death experience caused by the Great Rain, but perhaps you were born during a howling gale so powerful that folk still tell stories of it, or your lineage might include the influence of potent air creatures such as djinn. Whatever the case, the magic of the storm permeates your being.',
          features: {
            1: ['Wind Speaker', 'Tempestuous Magic'],
            6: ['Heart of the Storm', 'Storm Guide'],
            14: ['Storm\'s Fury'],
            18: ['Wind Soul']
          }
        },
        'Aberrant Mind': {
          name: 'Aberrant Mind',
          description: 'An alien influence has wrapped its tendrils around your mind, giving you psionic power. You can now touch other minds with that power and alter the world around you by using it to control the magical energy of the multiverse. Will this power shine from you as a hopeful beacon to others? Or will you be a source of terror to those who feel the stab of your mind and witness the strange manifestations of your might?',
          features: {
            1: ['Psionic Spells', 'Telepathic Speech'],
            6: ['Psionic Sorcery', 'Psychic Defenses'],
            14: ['Revelation in Flesh'],
            18: ['Warping Implosion']
          }
        },
        'Clockwork Soul': {
          name: 'Clockwork Soul',
          description: 'The cosmic force of order has suffused you with magic. That power arises from Mechanus or a realm like it—a plane of existence shaped entirely by clockwork efficiency. You, or someone from your lineage, might have become entangled in the machinations of modrons, the orderly beings who inhabit Mechanus. Perhaps your ancestor even took part in the Great Modron March. Whatever its origin within you, the power of order can seem strange to others, but for you, it is part of a vast and glorious system.',
          features: {
            1: ['Clockwork Magic', 'Restore Balance'],
            6: ['Bastion of Law'],
            14: ['Trance of Order'],
            18: ['Clockwork Cavalcade']
          }
        }
      }
    },

    'Warlock': {
      selectionLevel: 1,
      name: 'Otherworldly Patron',
      options: {
        'The Archfey': {
          name: 'The Archfey',
          description: 'Your patron is a lord or lady of the fey, a creature of legend who holds secrets that were forgotten before the mortal races were born. This being\'s motivations are often inscrutable, and sometimes whimsical, and might involve a striving for greater magical power or the settling of age-old grudges.',
          features: {
            1: ['Expanded Spell List', 'Fey Presence'],
            6: ['Misty Escape'],
            10: ['Beguiling Defenses'],
            14: ['Dark Delirium']
          }
        },
        'The Fiend': {
          name: 'The Fiend',
          description: 'You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil, even if you strive against those aims. Such beings desire the corruption or destruction of all things, ultimately including you.',
          features: {
            1: ['Expanded Spell List', 'Dark One\'s Blessing'],
            6: ['Dark One\'s Own Luck'],
            10: ['Fiendish Resilience'],
            14: ['Hurl Through Hell']
          }
        },
        'The Great Old One': {
          name: 'The Great Old One',
          description: 'Your patron is a mysterious entity whose nature is utterly foreign to the fabric of reality. It might come from the Far Realm, the space beyond reality, or it could be one of the elder gods known only in legends. Its motives are incomprehensible to mortals.',
          features: {
            1: ['Expanded Spell List', 'Awakened Mind'],
            6: ['Entropic Ward'],
            10: ['Thought Shield'],
            14: ['Create Thrall']
          }
        },
        'The Celestial': {
          name: 'The Celestial',
          description: 'Your patron is a powerful being of the Upper Planes. You have bound yourself to an ancient empyrean, solar, ki-rin, unicorn, or other entity that resides in the planes of everlasting bliss. Your pact with that being allows you to experience the barest touch of the holy light that illuminates the multiverse.',
          features: {
            1: ['Expanded Spell List', 'Bonus Cantrips', 'Healing Light'],
            6: ['Radiant Soul'],
            10: ['Celestial Resilience'],
            14: ['Searing Vengeance']
          }
        },
        'The Hexblade': {
          name: 'The Hexblade',
          description: 'You have made your pact with a mysterious entity from the Shadowfell—a force that manifests in sentient magic weapons carved from the stuff of shadow. The mighty sword Blackrazor is the most notable of these weapons, which have been spread across the multiverse over the ages. The shadowy force behind these weapons can offer power to warlocks who form pacts with it. Many hexblade warlocks create weapons that emulate those formed in the Shadowfell.',
          features: {
            1: ['Expanded Spell List', 'Hexblade\'s Curse', 'Hex Warrior'],
            6: ['Accursed Specter'],
            10: ['Armor of Hexes'],
            14: ['Master of Hexes']
          }
        },
        'The Fathomless': {
          name: 'The Fathomless',
          description: 'You have plunged into a pact with the deeps. An entity of the ocean, the Elemental Plane of Water, or another otherworldly sea now allows you to draw on its thalassic power. Is it merely using you to learn about terrestrial realms, or does it want you to open cosmic floodgates and drown the world?',
          features: {
            1: ['Expanded Spell List', 'Tentacle of the Deeps', 'Gift of the Sea'],
            6: ['Oceanic Soul', 'Guardian Coil'],
            10: ['Grasping Tentacles'],
            14: ['Fathomless Plunge']
          }
        },
        'The Genie': {
          name: 'The Genie',
          description: 'You have made a pact with one of the rarest kinds of genie, a noble genie. Such entities rule vast fiefs on the Elemental Planes and have great influence over lesser genies and elemental creatures. Noble genies are varied in their motivations, but most are arrogant and wield power that rivals that of lesser deities. They delight in turning the table on mortals, who often bind genies into servitude, and readily enter into pacts that expand their reach.',
          features: {
            1: ['Expanded Spell List', 'Genie\'s Vessel', 'Genie\'s Wrath (choose: Dao, Djinni, Efreeti, or Marid)'],
            6: ['Elemental Gift'],
            10: ['Sanctuary Vessel'],
            14: ['Limited Wish']
          }
        },
        'The Undead': {
          name: 'The Undead',
          description: 'The Undead is an entity that resides in the dark corners of the multiverse. Your patron could be Acererak, Azalin, Lord Soth, Strahd, or some other ancient undead being. You may seek to gain knowledge from your patron\'s countless lifetimes of experience, while it, in turn, may desire a dutiful student to emulate and help perpetuate its legacy.',
          features: {
            1: ['Expanded Spell List', 'Form of Dread'],
            6: ['Grave Touched'],
            10: ['Necrotic Husk'],
            14: ['Spirit Projection']
          }
        }
      }
    },

    'Artificer': {
      selectionLevel: 3,
      name: 'Artificer Specialist',
      options: {
        'Alchemist': {
          name: 'Alchemist',
          description: 'An Alchemist is an expert at combining reagents to produce mystical effects. Alchemists use their creations to give life and to leech it away. Alchemy is the oldest of artificer traditions, and its versatility has long been valued during times of war and peace.',
          features: {
            3: ['Tool Proficiency', 'Alchemist Spells', 'Experimental Elixir'],
            5: ['Alchemical Savant'],
            9: ['Restorative Reagents'],
            15: ['Chemical Mastery']
          }
        },
        'Armorer': {
          name: 'Armorer',
          description: 'An artificer who specializes as an Armorer modifies armor to function almost like a second skin. The armor is enhanced to hone the artificer\'s magic, unleash potent attacks, and generate a formidable defense. The artificer bonds with this armor, becoming one with it even as they experiment with it and refine its magical capabilities.',
          features: {
            3: ['Tools of the Trade', 'Armorer Spells', 'Arcane Armor', 'Armor Model'],
            5: ['Extra Attack'],
            9: ['Armor Modifications'],
            15: ['Perfected Armor']
          }
        },
        'Artillerist': {
          name: 'Artillerist',
          description: 'An Artillerist specializes in using magic to hurl energy, projectiles, and explosions on a battlefield. This destructive power was valued by all the armies of the Last War. Now that the war is over, some members of this specialization have sought to build a more peaceful world by using their powers to protect and defend others.',
          features: {
            3: ['Tool Proficiency', 'Artillerist Spells', 'Eldritch Cannon'],
            5: ['Arcane Firearm'],
            9: ['Explosive Cannon'],
            15: ['Fortified Position']
          }
        },
        'Battle Smith': {
          name: 'Battle Smith',
          description: 'Armies require protection, and someone has to put things back together if defenses fail. A combination of protector and medic, a Battle Smith is an expert at defending others and repairing both material and personnel. Among artificers, Battle Smiths are unmatched in their ability to restore life.',
          features: {
            3: ['Tool Proficiency', 'Battle Smith Spells', 'Battle Ready', 'Steel Defender'],
            5: ['Extra Attack'],
            9: ['Arcane Jolt'],
            15: ['Improved Defender']
          }
        }
      }
    }
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
      preparesSpells: true, // Clerics prepare spells (WIS mod + level)
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
      preparesSpells: true, // Druids prepare spells (WIS mod + level)
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
      preparesSpells: true, // Paladins prepare spells (CHA mod + half level)
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
      preparesSpells: true, // Wizards prepare spells (INT mod + level)
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
    },

    'Artificer': {
      hitDie: 8,
      primaryAbility: ['int'],
      savingThrows: ['con', 'int'],
      armorProficiencies: ['Light Armor', 'Medium Armor', 'Shields'],
      weaponProficiencies: ['Simple Weapons', 'Firearms (if available)'],
      toolProficiencies: ['Thieves\' Tools', 'Tinker\'s Tools', 'One type of artisan\'s tools of your choice'],
      skillChoices: { count: 2, from: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'] },
      spellcaster: true,
      spellcastingAbility: 'int',
      preparesSpells: true, // Artificers prepare spells (INT mod + half level, rounded up)
      halfCaster: true, // Spell slots progress at half rate (rounded up)
      cantripsKnown: {
        1: 2, 10: 3, 14: 4
      },
      spellSlots: {
        // Artificers are half-casters with rounded-up progression
        1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
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
      // Infusions known and infused items
      infusionsKnown: {
        2: 4, 6: 6, 10: 8, 14: 10, 18: 12
      },
      infusedItems: {
        2: 2, 6: 3, 10: 4, 14: 5, 18: 6
      },
      features: {
        1: ['Magical Tinkering', 'Spellcasting'],
        2: ['Infuse Item'],
        3: ['Artificer Specialist (Subclass)', 'The Right Tool for the Job'],
        4: ['Ability Score Improvement'],
        5: ['Specialist Feature'],
        6: ['Tool Expertise'],
        7: ['Flash of Genius'],
        8: ['Ability Score Improvement'],
        9: ['Specialist Feature'],
        10: ['Magic Item Adept'],
        11: ['Spell-Storing Item'],
        12: ['Ability Score Improvement'],
        13: [],
        14: ['Magic Item Savant'],
        15: ['Specialist Feature'],
        16: ['Ability Score Improvement'],
        17: [],
        18: ['Magic Item Master'],
        19: ['Ability Score Improvement'],
        20: ['Soul of Artifice']
      }
    }
  };

  // ============================================================
  // FIGHTING STYLES (Fighter, Paladin, Ranger)
  // ============================================================
  const FIGHTING_STYLE_DATA = {
    'Archery': {
      name: 'Archery',
      description: 'You gain a +2 bonus to attack rolls you make with ranged weapons.',
      classes: ['Fighter', 'Ranger'],
      srd: true
    },
    'Blind Fighting': {
      name: 'Blind Fighting',
      description: 'You have blindsight with a range of 10 feet. Within that range, you can effectively see anything that isn\'t behind total cover, even if you\'re blinded or in darkness.',
      classes: ['Fighter', 'Paladin', 'Ranger'],
      srd: false
    },
    'Defense': {
      name: 'Defense',
      description: 'While you are wearing armor, you gain a +1 bonus to AC.',
      classes: ['Fighter', 'Paladin', 'Ranger'],
      srd: true
    },
    'Dueling': {
      name: 'Dueling',
      description: 'When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.',
      classes: ['Fighter', 'Paladin', 'Ranger'],
      srd: true
    },
    'Great Weapon Fighting': {
      name: 'Great Weapon Fighting',
      description: 'When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2.',
      classes: ['Fighter', 'Paladin'],
      srd: true
    },
    'Interception': {
      name: 'Interception',
      description: 'When a creature you can see hits a target, other than you, within 5 feet of you with an attack, you can use your reaction to reduce the damage the target takes by 1d10 + your proficiency bonus.',
      classes: ['Fighter', 'Paladin'],
      srd: false
    },
    'Protection': {
      name: 'Protection',
      description: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.',
      classes: ['Fighter', 'Paladin'],
      srd: true
    },
    'Superior Technique': {
      name: 'Superior Technique',
      description: 'You learn one maneuver of your choice from among those available to the Battle Master archetype. You gain one superiority die (d6). This die is used to fuel your maneuvers.',
      classes: ['Fighter'],
      srd: false
    },
    'Thrown Weapon Fighting': {
      name: 'Thrown Weapon Fighting',
      description: 'You can draw a weapon that has the thrown property as part of the attack you make with the weapon. In addition, when you hit with a ranged attack using a thrown weapon, you gain a +2 bonus to the damage roll.',
      classes: ['Fighter', 'Ranger'],
      srd: false
    },
    'Two-Weapon Fighting': {
      name: 'Two-Weapon Fighting',
      description: 'When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.',
      classes: ['Fighter', 'Ranger'],
      srd: true
    },
    'Unarmed Fighting': {
      name: 'Unarmed Fighting',
      description: 'Your unarmed strikes can deal bludgeoning damage equal to 1d6 + your Strength modifier on a hit. If you aren\'t wielding any weapons or a shield, the d6 becomes a d8.',
      classes: ['Fighter'],
      srd: false
    },
    'Blessed Warrior': {
      name: 'Blessed Warrior',
      description: 'You learn two cantrips of your choice from the cleric spell list. They count as paladin spells for you.',
      classes: ['Paladin'],
      srd: false
    },
    'Druidic Warrior': {
      name: 'Druidic Warrior',
      description: 'You learn two cantrips of your choice from the druid spell list. They count as ranger spells for you.',
      classes: ['Ranger'],
      srd: false
    }
  };

  // ============================================================
  // PACT BOONS (Warlock)
  // ============================================================
  const PACT_BOON_DATA = {
    'Pact of the Blade': {
      name: 'Pact of the Blade',
      description: 'You can use your action to create a pact weapon in your empty hand. You can choose the form that this melee weapon takes each time you create it. You are proficient with it while you wield it.',
      srd: true
    },
    'Pact of the Chain': {
      name: 'Pact of the Chain',
      description: 'You learn the find familiar spell and can cast it as a ritual. When you cast the spell, you can choose one of the normal forms for your familiar or one of the following special forms: imp, pseudodragon, quasit, or sprite.',
      srd: true
    },
    'Pact of the Tome': {
      name: 'Pact of the Tome',
      description: 'Your patron gives you a grimoire called a Book of Shadows. When you gain this feature, choose three cantrips from any class\'s spell list. The cantrips count as warlock spells for you.',
      srd: true
    },
    'Pact of the Talisman': {
      name: 'Pact of the Talisman',
      description: 'Your patron gives you an amulet, a talisman that can aid the wearer when the need is great. When the wearer fails an ability check, they can add a d4 to the roll, potentially turning the roll into a success.',
      srd: false
    }
  };

  // ============================================================
  // ELDRITCH INVOCATIONS (Warlock)
  // ============================================================
  const ELDRITCH_INVOCATION_DATA = {
    'Agonizing Blast': {
      name: 'Agonizing Blast',
      description: 'When you cast eldritch blast, add your Charisma modifier to the damage it deals on a hit.',
      prerequisites: 'eldritch blast cantrip',
      srd: true
    },
    'Armor of Shadows': {
      name: 'Armor of Shadows',
      description: 'You can cast mage armor on yourself at will, without expending a spell slot or material components.',
      prerequisites: null,
      srd: true
    },
    'Beast Speech': {
      name: 'Beast Speech',
      description: 'You can cast speak with animals at will, without expending a spell slot.',
      prerequisites: null,
      srd: true
    },
    'Beguiling Influence': {
      name: 'Beguiling Influence',
      description: 'You gain proficiency in the Deception and Persuasion skills.',
      prerequisites: null,
      srd: true
    },
    'Book of Ancient Secrets': {
      name: 'Book of Ancient Secrets',
      description: 'You can now inscribe magical rituals in your Book of Shadows. Choose two 1st-level spells that have the ritual tag from any class\'s spell list.',
      prerequisites: 'Pact of the Tome',
      srd: true
    },
    'Devil\'s Sight': {
      name: 'Devil\'s Sight',
      description: 'You can see normally in darkness, both magical and nonmagical, to a distance of 120 feet.',
      prerequisites: null,
      srd: true
    },
    'Eldritch Mind': {
      name: 'Eldritch Mind',
      description: 'You have advantage on Constitution saving throws that you make to maintain your concentration on a spell.',
      prerequisites: null,
      srd: false
    },
    'Eldritch Sight': {
      name: 'Eldritch Sight',
      description: 'You can cast detect magic at will, without expending a spell slot.',
      prerequisites: null,
      srd: true
    },
    'Eldritch Spear': {
      name: 'Eldritch Spear',
      description: 'When you cast eldritch blast, its range is 300 feet.',
      prerequisites: 'eldritch blast cantrip',
      srd: true
    },
    'Eyes of the Rune Keeper': {
      name: 'Eyes of the Rune Keeper',
      description: 'You can read all writing.',
      prerequisites: null,
      srd: true
    },
    'Fiendish Vigor': {
      name: 'Fiendish Vigor',
      description: 'You can cast false life on yourself at will as a 1st-level spell, without expending a spell slot or material components.',
      prerequisites: null,
      srd: true
    },
    'Gaze of Two Minds': {
      name: 'Gaze of Two Minds',
      description: 'You can use your action to touch a willing humanoid and perceive through its senses until the end of your next turn.',
      prerequisites: null,
      srd: true
    },
    'Gift of the Ever-Living Ones': {
      name: 'Gift of the Ever-Living Ones',
      description: 'Whenever you regain hit points while your familiar is within 100 feet of you, treat any dice rolled to determine the hit points you regain as having rolled their maximum value for you.',
      prerequisites: 'Pact of the Chain',
      srd: false
    },
    'Grasp of Hadar': {
      name: 'Grasp of Hadar',
      description: 'Once on each of your turns when you hit a creature with your eldritch blast, you can move that creature in a straight line 10 feet closer to you.',
      prerequisites: 'eldritch blast cantrip',
      srd: false
    },
    'Improved Pact Weapon': {
      name: 'Improved Pact Weapon',
      description: 'You can use any weapon you summon with your Pact of the Blade feature as a spellcasting focus. The weapon gains a +1 bonus to attack and damage rolls.',
      prerequisites: 'Pact of the Blade',
      srd: false
    },
    'Investment of the Chain Master': {
      name: 'Investment of the Chain Master',
      description: 'When you cast find familiar, you infuse the summoned familiar with a measure of your eldritch power, granting the creature special benefits.',
      prerequisites: 'Pact of the Chain',
      srd: false
    },
    'Lance of Lethargy': {
      name: 'Lance of Lethargy',
      description: 'Once on each of your turns when you hit a creature with your eldritch blast, you can reduce that creature\'s speed by 10 feet until the end of your next turn.',
      prerequisites: 'eldritch blast cantrip',
      srd: false
    },
    'Mask of Many Faces': {
      name: 'Mask of Many Faces',
      description: 'You can cast disguise self at will, without expending a spell slot.',
      prerequisites: null,
      srd: true
    },
    'Misty Visions': {
      name: 'Misty Visions',
      description: 'You can cast silent image at will, without expending a spell slot or material components.',
      prerequisites: null,
      srd: true
    },
    'One with Shadows': {
      name: 'One with Shadows',
      description: 'When you are in an area of dim light or darkness, you can use your action to become invisible until you move or take an action or a reaction.',
      prerequisites: '5th level',
      srd: true
    },
    'Otherworldly Leap': {
      name: 'Otherworldly Leap',
      description: 'You can cast jump on yourself at will, without expending a spell slot or material components.',
      prerequisites: '9th level',
      srd: true
    },
    'Repelling Blast': {
      name: 'Repelling Blast',
      description: 'When you hit a creature with eldritch blast, you can push the creature up to 10 feet away from you in a straight line.',
      prerequisites: 'eldritch blast cantrip',
      srd: true
    },
    'Sculptor of Flesh': {
      name: 'Sculptor of Flesh',
      description: 'You can cast polymorph once using a warlock spell slot. You can\'t do so again until you finish a long rest.',
      prerequisites: '7th level',
      srd: true
    },
    'Sign of Ill Omen': {
      name: 'Sign of Ill Omen',
      description: 'You can cast bestow curse once using a warlock spell slot. You can\'t do so again until you finish a long rest.',
      prerequisites: '5th level',
      srd: true
    },
    'Thief of Five Fates': {
      name: 'Thief of Five Fates',
      description: 'You can cast bane once using a warlock spell slot. You can\'t do so again until you finish a long rest.',
      prerequisites: null,
      srd: true
    },
    'Thirsting Blade': {
      name: 'Thirsting Blade',
      description: 'You can attack with your pact weapon twice, instead of once, whenever you take the Attack action on your turn.',
      prerequisites: '5th level, Pact of the Blade',
      srd: true
    },
    'Voice of the Chain Master': {
      name: 'Voice of the Chain Master',
      description: 'You can communicate telepathically with your familiar and perceive through your familiar\'s senses as long as you are on the same plane of existence.',
      prerequisites: 'Pact of the Chain',
      srd: true
    },
    'Whispers of the Grave': {
      name: 'Whispers of the Grave',
      description: 'You can cast speak with dead at will, without expending a spell slot.',
      prerequisites: '9th level',
      srd: true
    },
    'Witch Sight': {
      name: 'Witch Sight',
      description: 'You can see the true form of any shapechanger or creature concealed by illusion or transmutation magic while the creature is within 30 feet of you and within line of sight.',
      prerequisites: '15th level',
      srd: true
    }
  };

  // ============================================================
  // METAMAGIC OPTIONS (Sorcerer)
  // ============================================================
  const METAMAGIC_DATA = {
    'Careful Spell': {
      name: 'Careful Spell',
      description: 'When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell\'s full force. Spend 1 sorcery point and choose a number of creatures up to your Charisma modifier. A chosen creature automatically succeeds on its saving throw against the spell.',
      cost: '1 sorcery point',
      srd: true
    },
    'Distant Spell': {
      name: 'Distant Spell',
      description: 'When you cast a spell that has a range of 5 feet or greater, you can spend 1 sorcery point to double the range of the spell. When you cast a spell that has a range of touch, you can spend 1 sorcery point to make the range of the spell 30 feet.',
      cost: '1 sorcery point',
      srd: true
    },
    'Empowered Spell': {
      name: 'Empowered Spell',
      description: 'When you roll damage for a spell, you can spend 1 sorcery point to reroll a number of the damage dice up to your Charisma modifier. You must use the new rolls.',
      cost: '1 sorcery point',
      srd: true
    },
    'Extended Spell': {
      name: 'Extended Spell',
      description: 'When you cast a spell that has a duration of 1 minute or longer, you can spend 1 sorcery point to double its duration, to a maximum duration of 24 hours.',
      cost: '1 sorcery point',
      srd: true
    },
    'Heightened Spell': {
      name: 'Heightened Spell',
      description: 'When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 sorcery points to give one target of the spell disadvantage on its first saving throw made against the spell.',
      cost: '3 sorcery points',
      srd: true
    },
    'Quickened Spell': {
      name: 'Quickened Spell',
      description: 'When you cast a spell that has a casting time of 1 action, you can spend 2 sorcery points to change the casting time to 1 bonus action for this casting.',
      cost: '2 sorcery points',
      srd: true
    },
    'Seeking Spell': {
      name: 'Seeking Spell',
      description: 'If you make an attack roll for a spell and miss, you can spend 2 sorcery points to reroll the d20, and you must use the new roll. You can use Seeking Spell even if you have already used a different Metamagic option during the casting of the spell.',
      cost: '2 sorcery points',
      srd: false
    },
    'Subtle Spell': {
      name: 'Subtle Spell',
      description: 'When you cast a spell, you can spend 1 sorcery point to cast it without any somatic or verbal components.',
      cost: '1 sorcery point',
      srd: true
    },
    'Transmuted Spell': {
      name: 'Transmuted Spell',
      description: 'When you cast a spell that deals a type of damage from the following list, you can spend 1 sorcery point to change that damage type to one of the other listed types: acid, cold, fire, lightning, poison, thunder.',
      cost: '1 sorcery point',
      srd: false
    },
    'Twinned Spell': {
      name: 'Twinned Spell',
      description: 'When you cast a spell that targets only one creature and doesn\'t have a range of self, you can spend a number of sorcery points equal to the spell\'s level to target a second creature in range with the same spell (1 sorcery point if the spell is a cantrip).',
      cost: 'spell level sorcery points',
      srd: true
    }
  };

  // ============================================================
  // RACE DATA (for homebrew/custom races from content packs)
  // Built-in races are hardcoded in character-creation-wizard.js
  // This structure stores races added via content packs
  // ============================================================
  const RACE_DATA = {};

  // ============================================================
  // SUBRACE DATA
  // ============================================================
  const SUBRACE_DATA = {
    // Elf subraces
    'Elf:High Elf': {
      name: 'High Elf',
      race: 'Elf',
      description: 'High elves have keen minds and a mastery of basic magic. You gain weapon training, a wizard cantrip, and an extra language.',
      srd: true
    },
    'Elf:Wood Elf': {
      name: 'Wood Elf',
      race: 'Elf',
      description: 'Wood elves have keen senses and intuition, with swift feet that carry them through their native forests. Increased speed and Mask of the Wild.',
      srd: true
    },
    'Elf:Dark Elf (Drow)': {
      name: 'Dark Elf (Drow)',
      race: 'Elf',
      description: 'Drow have superior darkvision, sunlight sensitivity, and innate spellcasting including Dancing Lights, Faerie Fire, and Darkness.',
      srd: false
    },
    'Elf:Eladrin': {
      name: 'Eladrin',
      race: 'Elf',
      description: 'Eladrin are elves of the Feywild with Fey Step teleportation and shifting seasonal aspects that change the effect of their teleportation.',
      srd: false
    },
    'Elf:Sea Elf': {
      name: 'Sea Elf',
      race: 'Elf',
      description: 'Sea elves are adapted to underwater life with a swimming speed, ability to breathe underwater, and communication with sea creatures.',
      srd: false
    },

    // Dwarf subraces
    'Dwarf:Hill Dwarf': {
      name: 'Hill Dwarf',
      race: 'Dwarf',
      description: 'Hill dwarves have keen senses, deep intuition, and remarkable resilience. Dwarven Toughness grants extra hit points.',
      srd: true
    },
    'Dwarf:Mountain Dwarf': {
      name: 'Mountain Dwarf',
      race: 'Dwarf',
      description: 'Mountain dwarves are strong and hardy, accustomed to life in rugged terrain. You gain proficiency with light and medium armor.',
      srd: true
    },
    'Dwarf:Duergar': {
      name: 'Duergar',
      race: 'Dwarf',
      description: 'Duergar, or gray dwarves, have superior darkvision, sunlight sensitivity, and innate spellcasting including Enlarge and Invisibility.',
      srd: false
    },

    // Halfling subraces
    'Halfling:Lightfoot': {
      name: 'Lightfoot',
      race: 'Halfling',
      description: 'Lightfoot halflings are adept at staying out of sight, able to hide behind creatures larger than themselves.',
      srd: true
    },
    'Halfling:Stout': {
      name: 'Stout',
      race: 'Halfling',
      description: 'Stout halflings are hardier than average, with resistance to poison and advantage on saves against being poisoned.',
      srd: true
    },
    'Halfling:Ghostwise': {
      name: 'Ghostwise',
      race: 'Halfling',
      description: 'Ghostwise halflings can communicate telepathically with creatures within 30 feet that share a language with them.',
      srd: false
    },

    // Gnome subraces
    'Gnome:Forest Gnome': {
      name: 'Forest Gnome',
      race: 'Gnome',
      description: 'Forest gnomes have a natural knack for illusion magic and can communicate with small beasts.',
      srd: true
    },
    'Gnome:Rock Gnome': {
      name: 'Rock Gnome',
      race: 'Gnome',
      description: 'Rock gnomes have a natural inventiveness and hardiness, with expertise in magical item history and tinker abilities.',
      srd: true
    },
    'Gnome:Deep Gnome (Svirfneblin)': {
      name: 'Deep Gnome (Svirfneblin)',
      race: 'Gnome',
      description: 'Deep gnomes, or svirfneblin, live far beneath the surface with superior darkvision and stone camouflage abilities.',
      srd: false
    },

    // Dragonborn ancestries (all SRD)
    'Dragonborn:Black': {
      name: 'Black',
      race: 'Dragonborn',
      description: 'Black dragon ancestry: Acid breath weapon (5×30 ft. line, DEX save) and acid resistance.',
      srd: true
    },
    'Dragonborn:Blue': {
      name: 'Blue',
      race: 'Dragonborn',
      description: 'Blue dragon ancestry: Lightning breath weapon (5×30 ft. line, DEX save) and lightning resistance.',
      srd: true
    },
    'Dragonborn:Brass': {
      name: 'Brass',
      race: 'Dragonborn',
      description: 'Brass dragon ancestry: Fire breath weapon (5×30 ft. line, DEX save) and fire resistance.',
      srd: true
    },
    'Dragonborn:Bronze': {
      name: 'Bronze',
      race: 'Dragonborn',
      description: 'Bronze dragon ancestry: Lightning breath weapon (5×30 ft. line, DEX save) and lightning resistance.',
      srd: true
    },
    'Dragonborn:Copper': {
      name: 'Copper',
      race: 'Dragonborn',
      description: 'Copper dragon ancestry: Acid breath weapon (5×30 ft. line, DEX save) and acid resistance.',
      srd: true
    },
    'Dragonborn:Gold': {
      name: 'Gold',
      race: 'Dragonborn',
      description: 'Gold dragon ancestry: Fire breath weapon (15 ft. cone, DEX save) and fire resistance.',
      srd: true
    },
    'Dragonborn:Green': {
      name: 'Green',
      race: 'Dragonborn',
      description: 'Green dragon ancestry: Poison breath weapon (15 ft. cone, CON save) and poison resistance.',
      srd: true
    },
    'Dragonborn:Red': {
      name: 'Red',
      race: 'Dragonborn',
      description: 'Red dragon ancestry: Fire breath weapon (15 ft. cone, DEX save) and fire resistance.',
      srd: true
    },
    'Dragonborn:Silver': {
      name: 'Silver',
      race: 'Dragonborn',
      description: 'Silver dragon ancestry: Cold breath weapon (15 ft. cone, CON save) and cold resistance.',
      srd: true
    },
    'Dragonborn:White': {
      name: 'White',
      race: 'Dragonborn',
      description: 'White dragon ancestry: Cold breath weapon (15 ft. cone, CON save) and cold resistance.',
      srd: true
    },

    // Tiefling subraces (only Asmodeus/standard is SRD)
    'Tiefling:Asmodeus': {
      name: 'Asmodeus',
      race: 'Tiefling',
      description: 'Standard Infernal Legacy: Thaumaturgy cantrip, Hellish Rebuke at 3rd level, Darkness at 5th level.',
      srd: true
    },
    'Tiefling:Baalzebul': {
      name: 'Baalzebul',
      race: 'Tiefling',
      description: 'Legacy of Maladomini: Thaumaturgy cantrip, Ray of Sickness at 3rd level, Crown of Madness at 5th level.',
      srd: false
    },
    'Tiefling:Dispater': {
      name: 'Dispater',
      race: 'Tiefling',
      description: 'Legacy of Dis: Thaumaturgy cantrip, Disguise Self at 3rd level, Detect Thoughts at 5th level.',
      srd: false
    },
    'Tiefling:Fierna': {
      name: 'Fierna',
      race: 'Tiefling',
      description: 'Legacy of Phlegethos: Friends cantrip, Charm Person at 3rd level, Suggestion at 5th level.',
      srd: false
    },
    'Tiefling:Glasya': {
      name: 'Glasya',
      race: 'Tiefling',
      description: 'Legacy of Malbolge: Minor Illusion cantrip, Disguise Self at 3rd level, Invisibility at 5th level.',
      srd: false
    },
    'Tiefling:Levistus': {
      name: 'Levistus',
      race: 'Tiefling',
      description: 'Legacy of Stygia: Ray of Frost cantrip, Armor of Agathys at 3rd level, Darkness at 5th level.',
      srd: false
    },
    'Tiefling:Mammon': {
      name: 'Mammon',
      race: 'Tiefling',
      description: 'Legacy of Minauros: Mage Hand cantrip, Tenser\'s Floating Disk at 3rd level, Arcane Lock at 5th level.',
      srd: false
    },
    'Tiefling:Mephistopheles': {
      name: 'Mephistopheles',
      race: 'Tiefling',
      description: 'Legacy of Cania: Mage Hand cantrip, Burning Hands at 3rd level, Flame Blade at 5th level.',
      srd: false
    },
    'Tiefling:Zariel': {
      name: 'Zariel',
      race: 'Tiefling',
      description: 'Legacy of Avernus: Thaumaturgy cantrip, Searing Smite at 3rd level, Branding Smite at 5th level.',
      srd: false
    },

    // Aasimar subraces (non-SRD - Volo's Guide)
    'Aasimar:Protector': {
      name: 'Protector',
      race: 'Aasimar',
      description: 'Radiant Soul: At 3rd level, spectral wings grant flying speed. Once per turn, add level as extra radiant damage.',
      srd: false
    },
    'Aasimar:Scourge': {
      name: 'Scourge',
      race: 'Aasimar',
      description: 'Radiant Consumption: At 3rd level, radiate searing light that damages you and nearby creatures. Add level as extra radiant damage.',
      srd: false
    },
    'Aasimar:Fallen': {
      name: 'Fallen',
      race: 'Aasimar',
      description: 'Necrotic Shroud: At 3rd level, skeletal wings frighten nearby creatures. Add level as extra necrotic damage.',
      srd: false
    },

    // Shifter subraces (non-SRD - Eberron)
    'Shifter:Beasthide': {
      name: 'Beasthide',
      race: 'Shifter',
      description: 'Natural Athlete with Athletics proficiency. While shifted, gain extra temporary HP and +1 AC.',
      srd: false
    },
    'Shifter:Longtooth': {
      name: 'Longtooth',
      race: 'Shifter',
      description: 'Fierce with Intimidation proficiency. While shifted, can bite as a bonus action for 1d6+Str piercing damage.',
      srd: false
    },
    'Shifter:Swiftstride': {
      name: 'Swiftstride',
      race: 'Shifter',
      description: 'Graceful with Acrobatics proficiency. While shifted, +10 feet speed and can move 10 feet as reaction.',
      srd: false
    },
    'Shifter:Wildhunt': {
      name: 'Wildhunt',
      race: 'Shifter',
      description: 'Natural Tracker with Survival proficiency. While shifted, advantage on Wisdom checks and enemies can\'t have advantage against you.',
      srd: false
    }
  };

  // ============================================================
  // DEFAULT WEAPONS BY CLASS
  // ============================================================
  const DEFAULT_CLASS_WEAPONS = {
    'Barbarian': [
      { name: 'Greataxe', damage: '1d12', damageType: 'slashing', ability: 'str', type: 'melee-weapon', range: '5 ft', properties: 'Heavy, Two-Handed' },
      { name: 'Handaxe', damage: '1d6', damageType: 'slashing', ability: 'str', type: 'melee-weapon', range: '5 ft', properties: 'Light, Thrown (20/60)' }
    ],
    'Bard': [
      { name: 'Rapier', damage: '1d8', damageType: 'piercing', ability: 'dex', type: 'melee-weapon', range: '5 ft', properties: 'Finesse' },
      { name: 'Dagger', damage: '1d4', damageType: 'piercing', ability: 'dex', type: 'melee-weapon', range: '5 ft', properties: 'Finesse, Light, Thrown (20/60)' }
    ],
    'Cleric': [
      { name: 'Mace', damage: '1d6', damageType: 'bludgeoning', ability: 'str', type: 'melee-weapon', range: '5 ft', properties: '' },
      { name: 'Light Crossbow', damage: '1d8', damageType: 'piercing', ability: 'dex', type: 'ranged-weapon', range: '80/320 ft', properties: 'Ammunition, Loading, Two-Handed' }
    ],
    'Druid': [
      { name: 'Quarterstaff', damage: '1d6', damageType: 'bludgeoning', ability: 'str', type: 'melee-weapon', range: '5 ft', properties: 'Versatile (1d8)' },
      { name: 'Produce Flame', damage: '1d8', damageType: 'fire', ability: 'wis', type: 'ranged-spell', range: '30 ft', properties: 'Cantrip, damage scales at levels 5, 11, 17', isCantrip: true }
    ],
    'Fighter': [
      { name: 'Longsword', damage: '1d8', damageType: 'slashing', ability: 'str', type: 'melee-weapon', range: '5 ft', properties: 'Versatile (1d10)' },
      { name: 'Longbow', damage: '1d8', damageType: 'piercing', ability: 'dex', type: 'ranged-weapon', range: '150/600 ft', properties: 'Ammunition, Heavy, Two-Handed' }
    ],
    'Monk': [
      { name: 'Quarterstaff', damage: '1d6', damageType: 'bludgeoning', ability: 'dex', type: 'melee-weapon', range: '5 ft', properties: 'Versatile (1d8), Monk Weapon' },
      { name: 'Unarmed Strike', damage: '1d4', damageType: 'bludgeoning', ability: 'dex', type: 'melee-weapon', range: '5 ft', properties: 'Martial Arts die scales with level' }
    ],
    'Paladin': [
      { name: 'Longsword', damage: '1d8', damageType: 'slashing', ability: 'str', type: 'melee-weapon', range: '5 ft', properties: 'Versatile (1d10)' },
      { name: 'Javelin', damage: '1d6', damageType: 'piercing', ability: 'str', type: 'melee-weapon', range: '5 ft', properties: 'Thrown (30/120)' }
    ],
    'Ranger': [
      { name: 'Shortsword', damage: '1d6', damageType: 'piercing', ability: 'dex', type: 'melee-weapon', range: '5 ft', properties: 'Finesse, Light' },
      { name: 'Longbow', damage: '1d8', damageType: 'piercing', ability: 'dex', type: 'ranged-weapon', range: '150/600 ft', properties: 'Ammunition, Heavy, Two-Handed' }
    ],
    'Rogue': [
      { name: 'Rapier', damage: '1d8', damageType: 'piercing', ability: 'dex', type: 'melee-weapon', range: '5 ft', properties: 'Finesse' },
      { name: 'Shortbow', damage: '1d6', damageType: 'piercing', ability: 'dex', type: 'ranged-weapon', range: '80/320 ft', properties: 'Ammunition, Two-Handed' }
    ],
    'Sorcerer': [
      { name: 'Dagger', damage: '1d4', damageType: 'piercing', ability: 'dex', type: 'melee-weapon', range: '5 ft', properties: 'Finesse, Light, Thrown (20/60)' },
      { name: 'Fire Bolt', damage: '1d10', damageType: 'fire', ability: 'cha', type: 'ranged-spell', range: '120 ft', properties: 'Cantrip, damage scales at levels 5, 11, 17', isCantrip: true }
    ],
    'Warlock': [
      { name: 'Dagger', damage: '1d4', damageType: 'piercing', ability: 'dex', type: 'melee-weapon', range: '5 ft', properties: 'Finesse, Light, Thrown (20/60)' },
      { name: 'Eldritch Blast', damage: '1d10', damageType: 'force', ability: 'cha', type: 'ranged-spell', range: '120 ft', properties: 'Cantrip, additional beams at levels 5, 11, 17', isCantrip: true }
    ],
    'Wizard': [
      { name: 'Quarterstaff', damage: '1d6', damageType: 'bludgeoning', ability: 'str', type: 'melee-weapon', range: '5 ft', properties: 'Versatile (1d8)' },
      { name: 'Fire Bolt', damage: '1d10', damageType: 'fire', ability: 'int', type: 'ranged-spell', range: '120 ft', properties: 'Cantrip, damage scales at levels 5, 11, 17', isCantrip: true }
    ],
    'Artificer': [
      { name: 'Light Crossbow', damage: '1d8', damageType: 'piercing', ability: 'dex', type: 'ranged-weapon', range: '80/320 ft', properties: 'Ammunition, Loading, Two-Handed' },
      { name: 'Fire Bolt', damage: '1d10', damageType: 'fire', ability: 'int', type: 'ranged-spell', range: '120 ft', properties: 'Cantrip, damage scales at levels 5, 11, 17', isCantrip: true }
    ]
  };

  // Cantrip damage scaling by character level
  const CANTRIP_DAMAGE_SCALING = {
    1: 1,   // Levels 1-4: 1 die
    5: 2,   // Levels 5-10: 2 dice
    11: 3,  // Levels 11-16: 3 dice
    17: 4   // Levels 17+: 4 dice
  };

  /**
   * Get the number of damage dice for a cantrip based on character level
   * @param {number} level - Character level
   * @returns {number} - Number of damage dice
   */
  function getCantripDamageDice(level) {
    if (level >= 17) return 4;
    if (level >= 11) return 3;
    if (level >= 5) return 2;
    return 1;
  }

  /**
   * Generate default attacks for a character based on class and stats
   * @param {string} className - The character's class
   * @param {number} level - The character's level
   * @param {Object} stats - The character's ability scores {str, dex, con, int, wis, cha}
   * @returns {Array} - Array of attack objects
   */
  function generateDefaultAttacks(className, level, stats) {
    const weapons = DEFAULT_CLASS_WEAPONS[className];
    if (!weapons) return [];

    const profBonus = PROFICIENCY_BONUS[level] || 2;
    const attacks = [];

    weapons.forEach(weapon => {
      const abilityScore = stats[weapon.ability] || 10;
      const abilityMod = Math.floor((abilityScore - 10) / 2);
      const attackBonus = profBonus + abilityMod;

      let damage = weapon.damage;

      // Scale cantrip damage
      if (weapon.isCantrip) {
        const numDice = getCantripDamageDice(level);
        const dieMatch = weapon.damage.match(/(\d+)d(\d+)/);
        if (dieMatch) {
          damage = `${numDice}d${dieMatch[2]}`;
        }
      }

      // Format damage string with modifier (only for non-cantrips or if positive)
      let damageStr = damage;
      if (!weapon.isCantrip && abilityMod !== 0) {
        damageStr = abilityMod >= 0 ? `${damage}+${abilityMod}` : `${damage}${abilityMod}`;
      }

      attacks.push({
        name: weapon.name,
        type: weapon.type,
        range: weapon.range,
        bonus: attackBonus >= 0 ? `+${attackBonus}` : `${attackBonus}`,
        damage: damageStr,
        damageType: weapon.damageType,
        damage2: '',
        damageType2: '',
        properties: weapon.properties
      });
    });

    return attacks;
  }

  // ============================================================
  // CLASS RESOURCES
  // ============================================================
  const CLASS_RESOURCES = {
    'Barbarian': [
      {
        name: 'Rage',
        resetOn: 'long',
        getMax: (level) => {
          if (level < 3) return 2;
          if (level < 6) return 3;
          if (level < 12) return 4;
          if (level < 17) return 5;
          if (level < 20) return 6;
          return 999; // Level 20: unlimited
        }
      }
    ],
    'Bard': [
      {
        name: 'Bardic Inspiration',
        resetOn: 'long', // Becomes short rest at level 5 (Font of Inspiration)
        getMax: (level, stats) => Math.max(1, Math.floor((stats.cha - 10) / 2))
      }
    ],
    'Cleric': [
      {
        name: 'Channel Divinity',
        resetOn: 'short',
        getMax: (level) => {
          if (level < 6) return 1;
          if (level < 18) return 2;
          return 3;
        }
      }
    ],
    'Druid': [
      {
        name: 'Wild Shape',
        resetOn: 'short',
        getMax: (level) => 2 // Always 2 uses
      }
    ],
    'Fighter': [
      {
        name: 'Second Wind',
        resetOn: 'short',
        getMax: (level) => 1
      },
      {
        name: 'Action Surge',
        resetOn: 'short',
        getMax: (level) => level >= 17 ? 2 : (level >= 2 ? 1 : 0),
        minLevel: 2
      }
    ],
    'Monk': [
      {
        name: 'Ki Points',
        resetOn: 'short',
        getMax: (level) => level >= 2 ? level : 0,
        minLevel: 2
      }
    ],
    'Paladin': [
      {
        name: 'Lay on Hands',
        resetOn: 'long',
        getMax: (level) => level * 5
      },
      {
        name: 'Divine Sense',
        resetOn: 'long',
        getMax: (level, stats) => 1 + Math.max(0, Math.floor((stats.cha - 10) / 2))
      }
    ],
    'Ranger': [], // Uses spell slots
    'Rogue': [], // No tracked resources
    'Sorcerer': [
      {
        name: 'Sorcery Points',
        resetOn: 'long',
        getMax: (level) => level >= 2 ? level : 0,
        minLevel: 2
      }
    ],
    'Warlock': [], // Uses pact slots (already implemented separately)
    'Wizard': [
      {
        name: 'Arcane Recovery',
        resetOn: 'long',
        getMax: (level) => 1 // Once per day
      }
    ],
    'Artificer': [
      {
        name: 'Flash of Genius',
        resetOn: 'long',
        getMax: (level, stats) => level >= 7 ? Math.max(1, Math.floor((stats.int - 10) / 2)) : 0,
        minLevel: 7
      },
      {
        name: 'Infused Items',
        resetOn: 'long',
        getMax: (level) => {
          if (level < 2) return 0;
          if (level < 6) return 2;
          if (level < 10) return 3;
          if (level < 14) return 4;
          if (level < 18) return 5;
          return 6;
        },
        minLevel: 2
      }
    ]
  };

  /**
   * Get class resources for a character
   * @param {string} className - The character's class
   * @param {number} level - The character's level
   * @param {Object} stats - The character's ability scores {str, dex, con, int, wis, cha}
   * @returns {Array} - Array of resource objects {name, current, max, resetOn}
   */
  function getClassResources(className, level, stats) {
    const resourceDefs = CLASS_RESOURCES[className];
    if (!resourceDefs || resourceDefs.length === 0) return [];

    const resources = [];
    resourceDefs.forEach(def => {
      // Skip if character level is below minimum
      if (def.minLevel && level < def.minLevel) return;

      const max = def.getMax(level, stats || {});
      if (max <= 0) return; // Skip resources with 0 max

      resources.push({
        name: def.name,
        current: max,
        max: max,
        resetOn: def.resetOn
      });
    });

    return resources;
  }

  // ============================================================
  // ARTIFICER INFUSIONS
  // ============================================================

  /**
   * Artificer Infusions available at different levels
   * Level requirement is based on the Artificer's level, not character level
   */
  const ARTIFICER_INFUSIONS = {
    // Level 2 Infusions (Base)
    2: [
      {
        name: 'Armor of Magical Strength',
        description: 'While wearing this armor, a creature can use its Intelligence modifier in place of its Strength modifier when making Strength checks and Strength saving throws. The armor has 6 charges. The wearer can expend 1 charge to negate being knocked prone.',
        requiresAttunement: true,
        itemType: 'armor'
      },
      {
        name: 'Enhanced Arcane Focus',
        description: 'While holding this item, a creature gains +1 bonus to spell attack rolls. Additionally, the creature ignores half cover when making a spell attack. The bonus increases to +2 when you reach 10th level in this class.',
        requiresAttunement: true,
        itemType: 'rod, staff, or wand'
      },
      {
        name: 'Enhanced Defense',
        description: 'A creature gains a +1 bonus to Armor Class while wearing (armor) or wielding (a shield) the infused item. The bonus increases to +2 when you reach 10th level in this class.',
        requiresAttunement: false,
        itemType: 'armor or shield'
      },
      {
        name: 'Enhanced Weapon',
        description: 'This magic weapon grants a +1 bonus to attack and damage rolls made with it. The bonus increases to +2 when you reach 10th level in this class.',
        requiresAttunement: false,
        itemType: 'simple or martial weapon'
      },
      {
        name: 'Homunculus Servant',
        description: 'You learn intricate methods for magically creating a special homunculus that serves you. You determine the homunculus\'s appearance; some artificers create miniature mechanical soldiers, others prefer winged vials or tiny constructs resembling their pets.',
        requiresAttunement: false,
        itemType: 'gem or crystal worth at least 100 gp'
      },
      {
        name: 'Mind Sharpener',
        description: 'The infused item can send a jolt to the wearer to refocus their mind. The item has 4 charges. When the wearer fails a Constitution saving throw to maintain concentration on a spell, the wearer can use its reaction to expend 1 of the item\'s charges to succeed instead.',
        requiresAttunement: true,
        itemType: 'armor or robes'
      },
      {
        name: 'Repeating Shot',
        description: 'This magic weapon grants a +1 bonus to attack and damage rolls made with it when it\'s used to make a ranged attack, and it ignores the loading property if it has it. The weapon requires no ammunition.',
        requiresAttunement: true,
        itemType: 'simple or martial weapon with ammunition property'
      },
      {
        name: 'Replicate Magic Item',
        description: 'Using this infusion, you replicate a particular magic item. See the Replicate Magic Item tables for the items you can make with this infusion, organized by the minimum artificer level you must be to choose the item.',
        requiresAttunement: 'varies',
        itemType: 'varies'
      },
      {
        name: 'Returning Weapon',
        description: 'This magic weapon grants a +1 bonus to attack and damage rolls made with it, and it returns to the wielder\'s hand immediately after it is used to make a ranged attack.',
        requiresAttunement: false,
        itemType: 'simple or martial weapon with thrown property'
      }
    ],

    // Level 6 Infusions
    6: [
      {
        name: 'Boots of the Winding Path',
        description: 'While wearing these boots, a creature can teleport up to 15 feet as a bonus action to an unoccupied space the creature can see. The creature must have occupied that space at some point during the current turn.',
        requiresAttunement: true,
        itemType: 'boots'
      },
      {
        name: 'Radiant Weapon',
        description: 'This magic weapon grants a +1 bonus to attack and damage rolls made with it. While holding it, the wielder can take a bonus action to cause it to shed bright light in a 30-foot radius and dim light for an additional 30 feet. The weapon has 4 charges. As a reaction immediately after being hit by an attack, the wielder can expend 1 charge and cause the attacker to be blinded until the end of the attacker\'s next turn.',
        requiresAttunement: true,
        itemType: 'simple or martial weapon'
      },
      {
        name: 'Repulsion Shield',
        description: 'A creature gains a +1 bonus to AC while wielding this shield. The shield has 4 charges. While holding it, the wielder can use a reaction immediately after being hit by a melee attack to expend 1 of the shield\'s charges and push the attacker up to 15 feet away.',
        requiresAttunement: true,
        itemType: 'shield'
      },
      {
        name: 'Resistant Armor',
        description: 'While wearing this armor, a creature has resistance to one of the following damage types, which you choose when you infuse the item: acid, cold, fire, force, lightning, necrotic, poison, psychic, radiant, or thunder.',
        requiresAttunement: true,
        itemType: 'armor'
      }
    ],

    // Level 10 Infusions
    10: [
      {
        name: 'Helm of Awareness',
        description: 'While wearing this helmet, a creature has advantage on initiative rolls. In addition, the wearer can\'t be surprised, provided it isn\'t incapacitated.',
        requiresAttunement: true,
        itemType: 'helmet'
      },
      {
        name: 'Spell-Refueling Ring',
        description: 'While wearing this ring, the creature can recover one expended spell slot as an action. The recovered slot can be of 3rd level or lower. Once used, the ring can\'t be used again until the next dawn.',
        requiresAttunement: true,
        itemType: 'ring'
      }
    ],

    // Level 14 Infusions
    14: [
      {
        name: 'Arcane Propulsion Armor',
        description: 'The wearer gains a +5 bonus to walking speed. The armor includes gauntlets that deal 1d8 force damage on a hit and have the thrown property (20/60 ft). After being thrown, the gauntlet detaches and flies back to the wearer\'s hand. The armor can\'t be removed against the wearer\'s will, and if missing limbs, the armor replaces them.',
        requiresAttunement: true,
        itemType: 'armor (requires attunement by a creature missing one or more limbs)'
      }
    ]
  };

  /**
   * Get available infusions for an Artificer at a given level
   * @param {number} artificerLevel - The character's Artificer level
   * @returns {Array} - Array of infusion objects
   */
  function getAvailableInfusions(artificerLevel) {
    const infusions = [];
    const levelThresholds = [2, 6, 10, 14];

    for (const threshold of levelThresholds) {
      if (artificerLevel >= threshold && ARTIFICER_INFUSIONS[threshold]) {
        infusions.push(...ARTIFICER_INFUSIONS[threshold]);
      }
    }

    return infusions;
  }

  /**
   * Get the number of infusions known at a given Artificer level
   * @param {number} artificerLevel - The character's Artificer level
   * @returns {number} - Number of infusions known
   */
  function getInfusionsKnown(artificerLevel) {
    if (artificerLevel < 2) return 0;
    if (artificerLevel < 6) return 4;
    if (artificerLevel < 10) return 6;
    if (artificerLevel < 14) return 8;
    if (artificerLevel < 18) return 10;
    return 12;
  }

  /**
   * Get the number of items that can be infused at a given Artificer level
   * @param {number} artificerLevel - The character's Artificer level
   * @returns {number} - Number of infused items allowed
   */
  function getInfusedItemsMax(artificerLevel) {
    if (artificerLevel < 2) return 0;
    if (artificerLevel < 6) return 2;
    if (artificerLevel < 10) return 3;
    if (artificerLevel < 14) return 4;
    if (artificerLevel < 18) return 5;
    return 6;
  }

  /**
   * Format infusions as text for Features & Feats section
   * @param {number} artificerLevel - The character's Artificer level
   * @returns {string} - Markdown-formatted infusions reference
   */
  function formatInfusionsReference(artificerLevel) {
    if (artificerLevel < 2) {
      return '**Infusions:** Not yet available (requires Artificer level 2)';
    }

    const known = getInfusionsKnown(artificerLevel);
    const maxItems = getInfusedItemsMax(artificerLevel);
    const infusions = getAvailableInfusions(artificerLevel);

    const lines = [];
    lines.push(`**Artificer Infusions** (Know ${known}, can infuse ${maxItems} items)`);
    lines.push('');
    lines.push('**Available Infusions:**');

    for (const infusion of infusions) {
      const attune = infusion.requiresAttunement === true ? ' (requires attunement)' :
                     infusion.requiresAttunement === 'varies' ? ' (attunement varies)' : '';
      lines.push(`- **${infusion.name}**${attune}: ${infusion.description.substring(0, 100)}...`);
    }

    return lines.join('\n');
  }

  // ============================================================
  // MULTICLASS HIT DICE HELPERS
  // ============================================================

  /**
   * Calculate hit dice breakdown for a multiclass character
   * @param {Array} classes - Array of {className, level}
   * @returns {Object} - {breakdown: [{className, level, hitDie}], total: number, displayString: string}
   */
  function calculateMulticlassHitDice(classes) {
    const breakdown = [];
    let total = 0;

    for (const classEntry of classes) {
      const className = classEntry.className;
      const level = classEntry.level || 0;
      const classData = CLASS_DATA[className];

      if (!classData || level <= 0) continue;

      const hitDie = classData.hitDie || 8;
      breakdown.push({
        className,
        level,
        hitDie
      });
      total += level;
    }

    // Sort by hit die size (largest first) for display
    breakdown.sort((a, b) => b.hitDie - a.hitDie);

    // Create display string like "3d10 + 2d8"
    const displayString = breakdown
      .map(b => `${b.level}d${b.hitDie}`)
      .join(' + ');

    return { breakdown, total, displayString };
  }

  /**
   * Track remaining hit dice for multiclass characters
   * Allows spending from specific hit die pools
   * @param {Object} hitDiceState - Current state {d6: {total, remaining}, d8: {...}, ...}
   * @param {number} dieSize - The hit die size to spend (6, 8, 10, 12)
   * @param {number} count - Number of dice to spend
   * @returns {Object} - Updated state or null if invalid
   */
  function spendMulticlassHitDice(hitDiceState, dieSize, count) {
    const key = `d${dieSize}`;
    if (!hitDiceState[key] || hitDiceState[key].remaining < count) {
      return null; // Not enough dice
    }

    const newState = JSON.parse(JSON.stringify(hitDiceState));
    newState[key].remaining -= count;
    return newState;
  }

  /**
   * Restore hit dice after long rest for multiclass characters
   * RAW: Regain a number of hit dice equal to half your total level (minimum 1)
   * This distributes restored dice proportionally across pools
   * @param {Object} hitDiceState - Current state {d6: {total, remaining}, d8: {...}, ...}
   * @returns {Object} - Updated state with restored dice
   */
  function restoreMulticlassHitDice(hitDiceState) {
    const newState = JSON.parse(JSON.stringify(hitDiceState));

    // Calculate total level and dice to restore
    let totalLevel = 0;
    let totalSpent = 0;
    for (const key of Object.keys(newState)) {
      totalLevel += newState[key].total;
      totalSpent += (newState[key].total - newState[key].remaining);
    }

    const toRestore = Math.max(1, Math.floor(totalLevel / 2));
    let remaining = Math.min(toRestore, totalSpent);

    // Restore dice, prioritizing larger dice first
    const dieOrder = ['d12', 'd10', 'd8', 'd6'];
    for (const key of dieOrder) {
      if (!newState[key] || remaining <= 0) continue;

      const spent = newState[key].total - newState[key].remaining;
      const restore = Math.min(spent, remaining);
      newState[key].remaining += restore;
      remaining -= restore;
    }

    return newState;
  }

  /**
   * Initialize hit dice state from multiclass array
   * @param {Array} classes - Array of {className, level}
   * @returns {Object} - Hit dice state {d6: {total, remaining}, ...}
   */
  function initMulticlassHitDiceState(classes) {
    const state = {};

    for (const classEntry of classes) {
      const className = classEntry.className;
      const level = classEntry.level || 0;
      const classData = CLASS_DATA[className];

      if (!classData || level <= 0) continue;

      const hitDie = classData.hitDie || 8;
      const key = `d${hitDie}`;

      if (!state[key]) {
        state[key] = { total: 0, remaining: 0 };
      }
      state[key].total += level;
      state[key].remaining += level; // Start fully rested
    }

    return state;
  }

  /**
   * Format hit dice state as display string
   * @param {Object} hitDiceState - State {d6: {total, remaining}, ...}
   * @returns {string} - Display string like "2/3 d10, 1/2 d8"
   */
  function formatMulticlassHitDice(hitDiceState) {
    const dieOrder = ['d12', 'd10', 'd8', 'd6'];
    const parts = [];

    for (const key of dieOrder) {
      if (hitDiceState[key] && hitDiceState[key].total > 0) {
        parts.push(`${hitDiceState[key].remaining}/${hitDiceState[key].total} ${key}`);
      }
    }

    return parts.join(', ') || 'None';
  }

  // ============================================================
  // CLASS LEVEL VS CHARACTER LEVEL HELPERS
  // ============================================================

  /**
   * Get the level in a specific class for a multiclass character
   * @param {Array} classes - Array of {className, level}
   * @param {string} targetClass - The class to find
   * @returns {number} - Level in that class (0 if not found)
   */
  function getClassLevel(classes, targetClass) {
    const classEntry = classes.find(c => c.className === targetClass);
    return classEntry ? (classEntry.level || 0) : 0;
  }

  /**
   * Get total character level from classes array
   * @param {Array} classes - Array of {className, level}
   * @returns {number} - Total character level
   */
  function getTotalCharacterLevel(classes) {
    return classes.reduce((sum, c) => sum + (c.level || 0), 0);
  }

  /**
   * Check if a feature is available based on class level (not character level)
   * @param {Array} classes - Array of {className, level}
   * @param {string} className - The class the feature belongs to
   * @param {number} requiredLevel - The class level required
   * @returns {boolean} - True if feature is available
   */
  function hasClassFeature(classes, className, requiredLevel) {
    return getClassLevel(classes, className) >= requiredLevel;
  }

  /**
   * Get all available features for a multiclass character
   * @param {Array} classes - Array of {className, level, subclass}
   * @returns {Array} - Array of {feature, className, classLevel}
   */
  function getMulticlassFeatures(classes) {
    const features = [];

    for (const classEntry of classes) {
      const className = classEntry.className;
      const classLevel = classEntry.level || 0;
      const classData = CLASS_DATA[className];

      if (!classData) continue;

      // Get all features up to current class level
      for (let level = 1; level <= classLevel; level++) {
        const levelFeatures = classData.features[level] || [];
        for (const feature of levelFeatures) {
          features.push({
            feature,
            className,
            classLevel: level
          });
        }
      }
    }

    return features;
  }

  /**
   * Get proficiency bonus based on total character level
   * @param {Array} classes - Array of {className, level}
   * @returns {number} - Proficiency bonus
   */
  function getMulticlassProficiencyBonus(classes) {
    const totalLevel = getTotalCharacterLevel(classes);
    return PROFICIENCY_BONUS[totalLevel] || 2;
  }

  /**
   * Get Extra Attack status for multiclass (only one instance)
   * Fighter 11 gets 2 extra attacks, Fighter 20 gets 3
   * @param {Array} classes - Array of {className, level}
   * @returns {Object} - {hasExtraAttack: boolean, attacks: number, source: string}
   */
  function getMulticlassExtraAttack(classes) {
    let attacks = 1; // Base attack
    let source = null;

    for (const classEntry of classes) {
      const className = classEntry.className;
      const level = classEntry.level || 0;

      // Fighter gets multiple extra attacks
      if (className === 'Fighter') {
        if (level >= 20) {
          if (attacks < 4) {
            attacks = 4;
            source = 'Fighter 20';
          }
        } else if (level >= 11) {
          if (attacks < 3) {
            attacks = 3;
            source = 'Fighter 11';
          }
        } else if (level >= 5) {
          if (attacks < 2) {
            attacks = 2;
            source = 'Fighter 5';
          }
        }
      }

      // Other martial classes get one Extra Attack at level 5
      if (['Barbarian', 'Monk', 'Paladin', 'Ranger'].includes(className) && level >= 5) {
        if (attacks < 2) {
          attacks = 2;
          source = `${className} 5`;
        }
      }

      // Bladesinger Wizard gets Extra Attack at 6
      if (className === 'Wizard' && classEntry.subclass === 'Bladesinging' && level >= 6) {
        if (attacks < 2) {
          attacks = 2;
          source = 'Bladesinger 6';
        }
      }
    }

    return {
      hasExtraAttack: attacks > 1,
      attacks,
      source
    };
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    FEATS,
    PROFICIENCY_BONUS,
    CLASS_DATA,
    SUBCLASS_DATA,
    FIGHTING_STYLE_DATA,
    PACT_BOON_DATA,
    ELDRITCH_INVOCATION_DATA,
    METAMAGIC_DATA,
    RACE_DATA,
    SUBRACE_DATA,
    DEFAULT_CLASS_WEAPONS,
    CLASS_RESOURCES,
    ARTIFICER_INFUSIONS,

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

    /**
     * Generate default attacks for a character based on class and stats
     * @param {string} className - The character's class
     * @param {number} level - The character's level
     * @param {Object} stats - The character's ability scores {str, dex, con, int, wis, cha}
     * @returns {Array} - Array of attack objects
     */
    generateDefaultAttacks(className, level, stats) {
      return generateDefaultAttacks(className, level, stats);
    },

    /**
     * Get the number of damage dice for a cantrip based on character level
     * @param {number} level - Character level
     * @returns {number} - Number of damage dice
     */
    getCantripDamageDice(level) {
      return getCantripDamageDice(level);
    },

    /**
     * Get class resources for a character
     * @param {string} className - The character's class
     * @param {number} level - The character's level
     * @param {Object} stats - The character's ability scores {str, dex, con, int, wis, cha}
     * @returns {Array} - Array of resource objects {name, current, max, resetOn}
     */
    getClassResources(className, level, stats) {
      return getClassResources(className, level, stats);
    },

    // Artificer Infusion helpers
    getAvailableInfusions(artificerLevel) {
      return getAvailableInfusions(artificerLevel);
    },

    getInfusionsKnown(artificerLevel) {
      return getInfusionsKnown(artificerLevel);
    },

    getInfusedItemsMax(artificerLevel) {
      return getInfusedItemsMax(artificerLevel);
    },

    formatInfusionsReference(artificerLevel) {
      return formatInfusionsReference(artificerLevel);
    },

    // Multiclass Hit Dice helpers
    calculateMulticlassHitDice(classes) {
      return calculateMulticlassHitDice(classes);
    },

    initMulticlassHitDiceState(classes) {
      return initMulticlassHitDiceState(classes);
    },

    spendMulticlassHitDice(hitDiceState, dieSize, count) {
      return spendMulticlassHitDice(hitDiceState, dieSize, count);
    },

    restoreMulticlassHitDice(hitDiceState) {
      return restoreMulticlassHitDice(hitDiceState);
    },

    formatMulticlassHitDice(hitDiceState) {
      return formatMulticlassHitDice(hitDiceState);
    },

    // Class Level vs Character Level helpers
    getClassLevel(classes, targetClass) {
      return getClassLevel(classes, targetClass);
    },

    getTotalCharacterLevel(classes) {
      return getTotalCharacterLevel(classes);
    },

    hasClassFeature(classes, className, requiredLevel) {
      return hasClassFeature(classes, className, requiredLevel);
    },

    getMulticlassFeatures(classes) {
      return getMulticlassFeatures(classes);
    },

    getMulticlassProficiencyBonus(classes) {
      return getMulticlassProficiencyBonus(classes);
    },

    getMulticlassExtraAttack(classes) {
      return getMulticlassExtraAttack(classes);
    },

    getLevelUpChanges(className, fromLevel, toLevel, character) {
      const classData = CLASS_DATA[className];
      if (!classData) return null;

      const changes = {
        level: toLevel,
        hitDieRoll: classData.hitDie,
        proficiencyBonus: PROFICIENCY_BONUS[toLevel],
        features: classData.features[toLevel] || [],
        spellSlots: null,
        pactSlots: null,
        hasASI: (classData.features[toLevel] || []).includes('Ability Score Improvement'),
        spellRules: null
      };

      // Add spell slots if applicable
      if (classData.spellcaster && classData.spellSlots) {
        changes.spellSlots = classData.spellSlots[toLevel];
      }

      // Add pact magic slots if warlock
      if (classData.pactMagic && classData.pactSlots) {
        changes.pactSlots = classData.pactSlots[toLevel];
      }

      // Add spell learning rules if applicable
      changes.spellRules = this.getSpellLearningRules(className, toLevel, character);

      return changes;
    },

    /**
     * Get subclass data for a specific class
     */
    getSubclassData(className) {
      return SUBCLASS_DATA[className] || null;
    },

    /**
     * Get subclass options for a specific class
     */
    getSubclassOptions(className) {
      const data = SUBCLASS_DATA[className];
      return data ? data.options : null;
    },

    /**
     * Get the level at which a class selects their subclass
     */
    getSubclassSelectionLevel(className) {
      const data = SUBCLASS_DATA[className];
      return data ? data.selectionLevel : null;
    },

    /**
     * Check if subclass selection is needed during this level-up
     */
    needsSubclassSelection(className, currentLevel, newLevel, hasSubclass) {
      if (hasSubclass) return false; // Already has subclass
      const selectionLevel = this.getSubclassSelectionLevel(className);
      if (!selectionLevel) return false;
      // Need selection if we're reaching or have passed the selection level
      return newLevel >= selectionLevel;
    },

    // ============================================================
    // FIGHTING STYLE HELPERS
    // ============================================================

    /**
     * Get all fighting styles available to a class
     * @param {string} className - The class name (Fighter, Paladin, Ranger)
     * @returns {Object} - Object of fighting style data keyed by name
     */
    getFightingStylesForClass(className) {
      const result = {};
      for (const [name, data] of Object.entries(FIGHTING_STYLE_DATA)) {
        if (data.classes.includes(className)) {
          result[name] = data;
        }
      }
      return result;
    },

    /**
     * Get a specific fighting style's data
     */
    getFightingStyleData(styleName) {
      return FIGHTING_STYLE_DATA[styleName] || null;
    },

    /**
     * Get all fighting style names
     */
    getAllFightingStyles() {
      return Object.keys(FIGHTING_STYLE_DATA).sort();
    },

    // ============================================================
    // PACT BOON HELPERS (Warlock)
    // ============================================================

    /**
     * Get all pact boon options
     */
    getPactBoonOptions() {
      return PACT_BOON_DATA;
    },

    /**
     * Get a specific pact boon's data
     */
    getPactBoonData(boonName) {
      return PACT_BOON_DATA[boonName] || null;
    },

    /**
     * Get all pact boon names
     */
    getAllPactBoons() {
      return Object.keys(PACT_BOON_DATA).sort();
    },

    // ============================================================
    // ELDRITCH INVOCATION HELPERS (Warlock)
    // ============================================================

    /**
     * Get all eldritch invocations
     */
    getEldritchInvocationOptions() {
      return ELDRITCH_INVOCATION_DATA;
    },

    /**
     * Get a specific eldritch invocation's data
     */
    getEldritchInvocationData(invocationName) {
      return ELDRITCH_INVOCATION_DATA[invocationName] || null;
    },

    /**
     * Get all eldritch invocation names
     */
    getAllEldritchInvocations() {
      return Object.keys(ELDRITCH_INVOCATION_DATA).sort();
    },

    /**
     * Get invocations available at a given warlock level (considering prerequisites)
     * @param {number} warlockLevel - The warlock's level
     * @param {string} pactBoon - The warlock's pact boon (if any)
     * @param {boolean} hasEldritchBlast - Whether the warlock knows eldritch blast
     * @returns {Object} - Available invocations
     */
    getAvailableInvocationsForLevel(warlockLevel, pactBoon = null, hasEldritchBlast = false) {
      const result = {};
      for (const [name, data] of Object.entries(ELDRITCH_INVOCATION_DATA)) {
        let available = true;
        const prereq = data.prerequisites;

        if (prereq) {
          // Check level prerequisites
          const levelMatch = prereq.match(/(\d+)(?:th|st|nd|rd)?\s*level/i);
          if (levelMatch && warlockLevel < parseInt(levelMatch[1])) {
            available = false;
          }

          // Check pact boon prerequisites
          if (prereq.includes('Pact of the Blade') && pactBoon !== 'Pact of the Blade') {
            available = false;
          }
          if (prereq.includes('Pact of the Chain') && pactBoon !== 'Pact of the Chain') {
            available = false;
          }
          if (prereq.includes('Pact of the Tome') && pactBoon !== 'Pact of the Tome') {
            available = false;
          }

          // Check eldritch blast prerequisite
          if (prereq.includes('eldritch blast') && !hasEldritchBlast) {
            available = false;
          }
        }

        if (available) {
          result[name] = data;
        }
      }
      return result;
    },

    // ============================================================
    // METAMAGIC HELPERS (Sorcerer)
    // ============================================================

    /**
     * Get all metamagic options
     */
    getMetamagicOptions() {
      return METAMAGIC_DATA;
    },

    /**
     * Get a specific metamagic option's data
     */
    getMetamagicData(metamagicName) {
      return METAMAGIC_DATA[metamagicName] || null;
    },

    /**
     * Get all metamagic option names
     */
    getAllMetamagic() {
      return Object.keys(METAMAGIC_DATA).sort();
    },

    // ============================================================
    // SUBRACE HELPERS
    // ============================================================

    /**
     * Get all subraces for a given race
     * @param {string} raceName - The race name (Elf, Dwarf, etc.)
     * @returns {Object} - Object of subrace data keyed by subrace name
     */
    getSubracesForRace(raceName) {
      const result = {};
      for (const data of Object.values(SUBRACE_DATA)) {
        if (data.race === raceName) {
          result[data.name] = data;
        }
      }
      return result;
    },

    /**
     * Get a specific subrace's data by its full key (Race:Subrace)
     * @param {string} subraceKey - The subrace key (e.g., 'Elf:High Elf')
     * @returns {Object|null} - Subrace data or null
     */
    getSubraceData(subraceKey) {
      return SUBRACE_DATA[subraceKey] || null;
    },

    /**
     * Get a specific subrace's data by race and subrace name
     * @param {string} raceName - The race name
     * @param {string} subraceName - The subrace name
     * @returns {Object|null} - Subrace data or null
     */
    getSubraceByName(raceName, subraceName) {
      const key = `${raceName}:${subraceName}`;
      return SUBRACE_DATA[key] || null;
    },

    /**
     * Get all subrace keys
     * @returns {string[]} - Array of all subrace keys
     */
    getAllSubraceKeys() {
      return Object.keys(SUBRACE_DATA).sort();
    },

    /**
     * Get all races that have subraces
     * @returns {string[]} - Array of race names that have subraces
     */
    getRacesWithSubraces() {
      const races = new Set();
      for (const data of Object.values(SUBRACE_DATA)) {
        races.add(data.race);
      }
      return Array.from(races).sort();
    },

    /**
     * Get spell learning rules for a class at a specific level
     * @param {string} className - The class name
     * @param {number} newLevel - The level being achieved
     * @returns {Object|null} - { type, newSpells, canSwap, maxSpellLevel } or null if no spell learning
     */
    getSpellLearningRules(className, newLevel, character) {
      const classData = CLASS_DATA[className];
      if (!classData || !classData.spellcaster) return null;

      // Calculate max spell level they can cast
      const maxSpellLevel = this.getMaxSpellLevel(classData, newLevel);
      if (maxSpellLevel === 0 && newLevel > 1) {
        // Can only cast cantrips, no spell learning needed
        return null;
      }

      // Prepared casters (Cleric, Druid, Paladin, Artificer) can re-select their prepared spells
      if (className === 'Cleric' || className === 'Druid') {
        const wisModifier = character ? Math.floor((character.stats?.wis || 10) - 10) / 2 : 0;
        const spellsToPrepare = Math.max(1, Math.floor(wisModifier) + newLevel);

        return {
          type: 'prepared',
          isPreparedCaster: true,
          preparationFormula: 'WIS modifier + level',
          newSpells: spellsToPrepare,
          canSwap: true, // Can change prepared spells daily
          maxSpellLevel: maxSpellLevel,
          className: className,
          cantrips: className === 'Cleric' ? 3 : 2 // Clerics get more cantrips
        };
      }

      if (className === 'Paladin') {
        // Paladins don't get spells until level 2
        if (newLevel < 2) return null;

        const chaModifier = character ? Math.floor((character.stats?.cha || 10) - 10) / 2 : 0;
        const spellsToPrepare = Math.max(1, Math.floor(chaModifier) + Math.floor(newLevel / 2));

        return {
          type: 'prepared',
          isPreparedCaster: true,
          preparationFormula: 'CHA modifier + half level',
          newSpells: spellsToPrepare,
          canSwap: true,
          maxSpellLevel: maxSpellLevel,
          className: className,
          cantrips: 0 // Paladins don't get cantrips
        };
      }

      if (className === 'Artificer') {
        const intModifier = character ? Math.floor((character.stats?.int || 10) - 10) / 2 : 0;
        const spellsToPrepare = Math.max(1, Math.floor(intModifier) + Math.floor(newLevel / 2));

        return {
          type: 'prepared',
          isPreparedCaster: true,
          preparationFormula: 'INT modifier + half level',
          newSpells: spellsToPrepare,
          canSwap: true,
          maxSpellLevel: maxSpellLevel,
          className: className,
          cantrips: 2
        };
      }

      // Half-casters (Ranger) start at level 2
      const isHalfCaster = className === 'Ranger';
      if (isHalfCaster && newLevel < 2) {
        return null;
      }

      // Wizards learn 2 spells per level, cannot swap
      if (className === 'Wizard') {
        return {
          type: 'learned',
          newSpells: 2,
          canSwap: false,
          maxSpellLevel: maxSpellLevel,
          className: className
        };
      }

      // Sorcerers, Bards, Warlocks, Rangers learn 1 spell and can swap
      return {
        type: 'learned',
        newSpells: 1,
        canSwap: true,
        maxSpellLevel: maxSpellLevel,
        className: className
      };
    },

    /**
     * Get the maximum spell level a character can cast at this level
     * @param {Object} classData - The class data object
     * @param {number} level - Character level
     * @returns {number} - Highest spell level (0-9)
     */
    getMaxSpellLevel(classData, level) {
      // Check pact magic first (Warlock)
      if (classData.pactMagic && classData.pactSlots && classData.pactSlots[level]) {
        return classData.pactSlots[level].level || 0;
      }

      // Check regular spell slots
      if (classData.spellSlots && classData.spellSlots[level]) {
        const slots = classData.spellSlots[level];
        // Find the highest slot level with at least 1 slot
        for (let i = slots.length - 1; i >= 0; i--) {
          if (slots[i] > 0) {
            return i + 1; // +1 because array is 0-indexed but spell levels are 1-indexed
          }
        }
      }

      return 0;
    },

    // ============================================================
    // SPECIES BASE FEATURES (Level 1 features all species have)
    // ============================================================

    /**
     * Base racial features that all characters of a race receive at level 1
     * Format: { 'RaceName': { traits: [...], speed, size, languages, subraces? } }
     */
    RACIAL_BASE_FEATURES: {
      // ==================== PHB RACES ====================

      'Human': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'One extra language of your choice'],
        traits: [
          {
            name: 'Ability Score Increase',
            description: 'Your ability scores each increase by 1.'
          },
          {
            name: 'Extra Language',
            description: 'You can speak, read, and write one extra language of your choice.'
          }
        ]
      },

      'Elf': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Elvish'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Keen Senses',
            description: 'You have proficiency in the Perception skill.'
          },
          {
            name: 'Fey Ancestry',
            description: 'You have advantage on saving throws against being charmed, and magic can\'t put you to sleep.'
          },
          {
            name: 'Trance',
            description: 'Elves don\'t need to sleep. Instead, they meditate deeply for 4 hours a day, gaining the same benefit as a human does from 8 hours of sleep.'
          }
        ],
        subraces: {
          'High Elf': {
            traits: [
              {
                name: 'Elf Weapon Training',
                description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.'
              },
              {
                name: 'Cantrip',
                description: 'You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it.'
              },
              {
                name: 'Extra Language',
                description: 'You can speak, read, and write one extra language of your choice.'
              }
            ]
          },
          'Wood Elf': {
            speed: 35,
            traits: [
              {
                name: 'Elf Weapon Training',
                description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.'
              },
              {
                name: 'Fleet of Foot',
                description: 'Your base walking speed increases to 35 feet.'
              },
              {
                name: 'Mask of the Wild',
                description: 'You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.'
              }
            ]
          },
          'Dark Elf (Drow)': {
            traits: [
              {
                name: 'Superior Darkvision',
                description: 'Your darkvision has a radius of 120 feet.'
              },
              {
                name: 'Sunlight Sensitivity',
                description: 'You have disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight when you, the target of your attack, or whatever you are trying to perceive is in direct sunlight.'
              },
              {
                name: 'Drow Magic',
                description: 'You know the Dancing Lights cantrip. At 3rd level, you can cast Faerie Fire once per long rest. At 5th level, you can cast Darkness once per long rest. Charisma is your spellcasting ability.'
              },
              {
                name: 'Drow Weapon Training',
                description: 'You have proficiency with rapiers, shortswords, and hand crossbows.'
              }
            ]
          },
          'Eladrin': {
            traits: [
              {
                name: 'Fey Step',
                description: 'As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. Once you use this trait, you can\'t do so again until you finish a short or long rest. At 3rd level, this gains an additional effect based on your current season.'
              },
              {
                name: 'Shifting Seasons',
                description: 'You can change your season (Autumn, Winter, Spring, Summer) when you finish a long rest. Your season affects the secondary effect of your Fey Step at 3rd level.'
              }
            ]
          },
          'Sea Elf': {
            traits: [
              {
                name: 'Sea Elf Training',
                description: 'You have proficiency with the spear, trident, light crossbow, and net.'
              },
              {
                name: 'Child of the Sea',
                description: 'You have a swimming speed of 30 feet, and you can breathe air and water.'
              },
              {
                name: 'Friend of the Sea',
                description: 'You can communicate simple ideas with any beast that has an innate swimming speed.'
              }
            ]
          }
        }
      },

      'Dwarf': {
        size: 'Medium',
        speed: 25,
        languages: ['Common', 'Dwarvish'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Dwarven Resilience',
            description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.'
          },
          {
            name: 'Dwarven Combat Training',
            description: 'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.'
          },
          {
            name: 'Tool Proficiency',
            description: 'You gain proficiency with the artisan\'s tools of your choice: smith\'s tools, brewer\'s supplies, or mason\'s tools.'
          },
          {
            name: 'Stonecunning',
            description: 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.'
          }
        ],
        subraces: {
          'Hill Dwarf': {
            traits: [
              {
                name: 'Dwarven Toughness',
                description: 'Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.'
              }
            ]
          },
          'Mountain Dwarf': {
            traits: [
              {
                name: 'Dwarven Armor Training',
                description: 'You have proficiency with light and medium armor.'
              }
            ]
          },
          'Duergar': {
            traits: [
              {
                name: 'Superior Darkvision',
                description: 'Your darkvision has a radius of 120 feet.'
              },
              {
                name: 'Duergar Resilience',
                description: 'You have advantage on saving throws against illusions and against being charmed or paralyzed.'
              },
              {
                name: 'Sunlight Sensitivity',
                description: 'You have disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight when you, the target, or what you are perceiving is in direct sunlight.'
              },
              {
                name: 'Duergar Magic',
                description: 'At 3rd level, you can cast Enlarge/Reduce (enlarge only) on yourself once per long rest. At 5th level, you can cast Invisibility on yourself once per long rest.'
              }
            ]
          }
        }
      },

      'Halfling': {
        size: 'Small',
        speed: 25,
        languages: ['Common', 'Halfling'],
        traits: [
          {
            name: 'Lucky',
            description: 'When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.'
          },
          {
            name: 'Brave',
            description: 'You have advantage on saving throws against being frightened.'
          },
          {
            name: 'Halfling Nimbleness',
            description: 'You can move through the space of any creature that is of a size larger than yours.'
          }
        ],
        subraces: {
          'Lightfoot': {
            traits: [
              {
                name: 'Naturally Stealthy',
                description: 'You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.'
              }
            ]
          },
          'Stout': {
            traits: [
              {
                name: 'Stout Resilience',
                description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.'
              }
            ]
          },
          'Ghostwise': {
            traits: [
              {
                name: 'Silent Speech',
                description: 'You can speak telepathically to any creature within 30 feet of you. The creature understands you only if the two of you share a language.'
              }
            ]
          }
        }
      },

      'Dragonborn': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Draconic'],
        traits: [
          {
            name: 'Draconic Ancestry',
            description: 'You have draconic ancestry. Choose one type of dragon from the table. Your breath weapon and damage resistance are determined by the dragon type.'
          },
          {
            name: 'Breath Weapon',
            description: 'You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type. Each creature in the area must make a saving throw (DC = 8 + CON modifier + proficiency bonus). Damage: 2d6 at 1st level, 3d6 at 6th, 4d6 at 11th, 5d6 at 16th. Usable once per short or long rest.'
          },
          {
            name: 'Damage Resistance',
            description: 'You have resistance to the damage type associated with your draconic ancestry.'
          }
        ],
        subraces: {
          'Black': { breathWeapon: 'Acid - 5×30 ft. line (DEX save)', resistance: 'Acid' },
          'Blue': { breathWeapon: 'Lightning - 5×30 ft. line (DEX save)', resistance: 'Lightning' },
          'Brass': { breathWeapon: 'Fire - 5×30 ft. line (DEX save)', resistance: 'Fire' },
          'Bronze': { breathWeapon: 'Lightning - 5×30 ft. line (DEX save)', resistance: 'Lightning' },
          'Copper': { breathWeapon: 'Acid - 5×30 ft. line (DEX save)', resistance: 'Acid' },
          'Gold': { breathWeapon: 'Fire - 15 ft. cone (DEX save)', resistance: 'Fire' },
          'Green': { breathWeapon: 'Poison - 15 ft. cone (CON save)', resistance: 'Poison' },
          'Red': { breathWeapon: 'Fire - 15 ft. cone (DEX save)', resistance: 'Fire' },
          'Silver': { breathWeapon: 'Cold - 15 ft. cone (CON save)', resistance: 'Cold' },
          'White': { breathWeapon: 'Cold - 15 ft. cone (CON save)', resistance: 'Cold' }
        }
      },

      'Gnome': {
        size: 'Small',
        speed: 25,
        languages: ['Common', 'Gnomish'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Gnome Cunning',
            description: 'You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.'
          }
        ],
        subraces: {
          'Forest Gnome': {
            traits: [
              {
                name: 'Natural Illusionist',
                description: 'You know the Minor Illusion cantrip. Intelligence is your spellcasting ability for it.'
              },
              {
                name: 'Speak with Small Beasts',
                description: 'Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts.'
              }
            ]
          },
          'Rock Gnome': {
            traits: [
              {
                name: 'Artificer\'s Lore',
                description: 'Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your proficiency bonus.'
              },
              {
                name: 'Tinker',
                description: 'You have proficiency with artisan\'s tools (tinker\'s tools). Using them, you can spend 1 hour and 10 gp to construct a Tiny clockwork device (AC 5, 1 HP).'
              }
            ]
          },
          'Deep Gnome (Svirfneblin)': {
            traits: [
              {
                name: 'Superior Darkvision',
                description: 'Your darkvision has a radius of 120 feet.'
              },
              {
                name: 'Stone Camouflage',
                description: 'You have advantage on Dexterity (Stealth) checks to hide in rocky terrain.'
              }
            ]
          }
        }
      },

      'Half-Elf': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Elvish', 'One extra language of your choice'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Fey Ancestry',
            description: 'You have advantage on saving throws against being charmed, and magic can\'t put you to sleep.'
          },
          {
            name: 'Skill Versatility',
            description: 'You gain proficiency in two skills of your choice.'
          }
        ]
      },

      'Half-Orc': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Orc'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Menacing',
            description: 'You gain proficiency in the Intimidation skill.'
          },
          {
            name: 'Relentless Endurance',
            description: 'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can\'t use this feature again until you finish a long rest.'
          },
          {
            name: 'Savage Attacks',
            description: 'When you score a critical hit with a melee weapon attack, you can roll one of the weapon\'s damage dice one additional time and add it to the extra damage of the critical hit.'
          }
        ]
      },

      'Tiefling': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Infernal'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Hellish Resistance',
            description: 'You have resistance to fire damage.'
          },
          {
            name: 'Infernal Legacy',
            description: 'You know the Thaumaturgy cantrip. At 3rd level, you can cast Hellish Rebuke as a 2nd-level spell once per long rest. At 5th level, you can cast Darkness once per long rest. Charisma is your spellcasting ability.'
          }
        ],
        subraces: {
          'Asmodeus': {
            note: 'Standard Infernal Legacy (Thaumaturgy, Hellish Rebuke, Darkness)'
          },
          'Baalzebul': {
            traits: [
              {
                name: 'Legacy of Maladomini',
                description: 'You know the Thaumaturgy cantrip. At 3rd level, you can cast Ray of Sickness once per long rest. At 5th level, you can cast Crown of Madness once per long rest. Charisma is your spellcasting ability.'
              }
            ]
          },
          'Dispater': {
            traits: [
              {
                name: 'Legacy of Dis',
                description: 'You know the Thaumaturgy cantrip. At 3rd level, you can cast Disguise Self once per long rest. At 5th level, you can cast Detect Thoughts once per long rest. Charisma is your spellcasting ability.'
              }
            ]
          },
          'Fierna': {
            traits: [
              {
                name: 'Legacy of Phlegethos',
                description: 'You know the Friends cantrip. At 3rd level, you can cast Charm Person once per long rest. At 5th level, you can cast Suggestion once per long rest. Charisma is your spellcasting ability.'
              }
            ]
          },
          'Glasya': {
            traits: [
              {
                name: 'Legacy of Malbolge',
                description: 'You know the Minor Illusion cantrip. At 3rd level, you can cast Disguise Self once per long rest. At 5th level, you can cast Invisibility once per long rest. Charisma is your spellcasting ability.'
              }
            ]
          },
          'Levistus': {
            traits: [
              {
                name: 'Legacy of Stygia',
                description: 'You know the Ray of Frost cantrip. At 3rd level, you can cast Armor of Agathys as a 2nd-level spell once per long rest. At 5th level, you can cast Darkness once per long rest. Charisma is your spellcasting ability.'
              }
            ]
          },
          'Mammon': {
            traits: [
              {
                name: 'Legacy of Minauros',
                description: 'You know the Mage Hand cantrip. At 3rd level, you can cast Tenser\'s Floating Disk once per long rest. At 5th level, you can cast Arcane Lock once per long rest. Charisma is your spellcasting ability.'
              }
            ]
          },
          'Mephistopheles': {
            traits: [
              {
                name: 'Legacy of Cania',
                description: 'You know the Mage Hand cantrip. At 3rd level, you can cast Burning Hands as a 2nd-level spell once per long rest. At 5th level, you can cast Flame Blade once per long rest. Charisma is your spellcasting ability.'
              }
            ]
          },
          'Zariel': {
            traits: [
              {
                name: 'Legacy of Avernus',
                description: 'You know the Thaumaturgy cantrip. At 3rd level, you can cast Searing Smite once per long rest. At 5th level, you can cast Branding Smite once per long rest. Charisma is your spellcasting ability.'
              }
            ]
          }
        }
      },

      // ==================== VOLO'S GUIDE RACES ====================

      'Aarakocra': {
        size: 'Medium',
        speed: 25,
        languages: ['Common', 'Aarakocra', 'Auran'],
        traits: [
          {
            name: 'Flight',
            description: 'You have a flying speed of 50 feet. To use this speed, you can\'t be wearing medium or heavy armor.'
          },
          {
            name: 'Talons',
            description: 'Your talons are natural weapons, which you can use to make unarmed strikes. If you hit with them, you deal slashing damage equal to 1d4 + your Strength modifier.'
          }
        ]
      },

      'Aasimar': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Celestial'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Celestial Resistance',
            description: 'You have resistance to necrotic damage and radiant damage.'
          },
          {
            name: 'Healing Hands',
            description: 'As an action, you can touch a creature and cause it to regain a number of hit points equal to your level. Once you use this trait, you can\'t use it again until you finish a long rest.'
          },
          {
            name: 'Light Bearer',
            description: 'You know the Light cantrip. Charisma is your spellcasting ability for it.'
          },
          {
            name: 'Celestial Revelation (Level 3)',
            description: 'Starting at 3rd level, you can use a bonus action to unleash your celestial nature. Your transformation lasts for 1 minute or until you end it as a bonus action. Once per long rest.'
          }
        ],
        subraces: {
          'Protector': {
            traits: [
              {
                name: 'Radiant Soul',
                description: 'At 3rd level: Spectral wings give you flying speed equal to walking speed. Once per turn, add your level as extra radiant damage to one attack or spell.'
              }
            ]
          },
          'Scourge': {
            traits: [
              {
                name: 'Radiant Consumption',
                description: 'At 3rd level: Searing light radiates from you. At the end of each of your turns, you and each creature within 10 feet take radiant damage equal to half your level. Once per turn, add your level as extra radiant damage to one attack or spell.'
              }
            ]
          },
          'Fallen': {
            traits: [
              {
                name: 'Necrotic Shroud',
                description: 'At 3rd level: Ghostly skeletal wings sprout. Creatures within 10 feet that can see you must succeed on a Charisma save or become frightened until the end of your next turn. Once per turn, add your level as extra necrotic damage to one attack or spell.'
              }
            ]
          }
        }
      },

      'Bugbear': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Goblin'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Long-Limbed',
            description: 'When you make a melee attack on your turn, your reach for it is 5 feet greater than normal.'
          },
          {
            name: 'Powerful Build',
            description: 'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.'
          },
          {
            name: 'Sneaky',
            description: 'You are proficient in the Stealth skill.'
          },
          {
            name: 'Surprise Attack',
            description: 'If you hit a creature that is surprised with an attack on your first turn in combat, the attack deals an extra 2d6 damage.'
          }
        ]
      },

      'Firbolg': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Elvish', 'Giant'],
        traits: [
          {
            name: 'Firbolg Magic',
            description: 'You can cast Detect Magic and Disguise Self with this trait, using Wisdom as your spellcasting ability. When you use Disguise Self, you can appear up to 3 feet shorter. Once you cast either spell, you can\'t cast it again until you finish a short or long rest.'
          },
          {
            name: 'Hidden Step',
            description: 'As a bonus action, you can magically turn invisible until the start of your next turn or until you attack, make a damage roll, or force someone to make a saving throw. Once you use this trait, you can\'t use it again until you finish a short or long rest.'
          },
          {
            name: 'Powerful Build',
            description: 'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.'
          },
          {
            name: 'Speech of Beast and Leaf',
            description: 'You have the ability to communicate in a limited manner with beasts and plants. They can understand the meaning of your words. You have advantage on Charisma checks to influence them.'
          }
        ]
      },

      'Goblin': {
        size: 'Small',
        speed: 30,
        languages: ['Common', 'Goblin'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Fury of the Small',
            description: 'When you damage a creature with an attack or spell and the creature\'s size is larger than yours, you can cause the attack or spell to deal extra damage equal to your level. Once you use this trait, you can\'t use it again until you finish a short or long rest.'
          },
          {
            name: 'Nimble Escape',
            description: 'You can take the Disengage or Hide action as a bonus action on each of your turns.'
          }
        ]
      },

      'Goliath': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Giant'],
        traits: [
          {
            name: 'Natural Athlete',
            description: 'You have proficiency in the Athletics skill.'
          },
          {
            name: 'Stone\'s Endurance',
            description: 'You can focus yourself to occasionally shrug off injury. When you take damage, you can use your reaction to roll a d12. Add your Constitution modifier to the number rolled and reduce the damage by that total. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.'
          },
          {
            name: 'Powerful Build',
            description: 'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.'
          },
          {
            name: 'Mountain Born',
            description: 'You have resistance to cold damage. You\'re also acclimated to high altitude, including elevations above 20,000 feet.'
          }
        ]
      },

      'Hobgoblin': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Goblin'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Martial Training',
            description: 'You are proficient with two martial weapons of your choice and with light armor.'
          },
          {
            name: 'Saving Face',
            description: 'If you miss with an attack roll or fail an ability check or saving throw, you can gain a bonus to the roll equal to the number of allies you can see within 30 feet (max +5). Once you use this trait, you can\'t use it again until you finish a short or long rest.'
          }
        ]
      },

      'Kenku': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Auran'],
        traits: [
          {
            name: 'Expert Forgery',
            description: 'You can duplicate other creatures\' handwriting and craftwork. You have advantage on ability checks to produce forgeries or duplicates of existing objects.'
          },
          {
            name: 'Kenku Training',
            description: 'You are proficient in your choice of two of the following skills: Acrobatics, Deception, Stealth, and Sleight of Hand.'
          },
          {
            name: 'Mimicry',
            description: 'You can mimic sounds you have heard, including voices. A creature that hears the sounds can tell they are imitations with a successful Wisdom (Insight) check opposed by your Charisma (Deception) check.'
          }
        ]
      },

      'Kobold': {
        size: 'Small',
        speed: 30,
        languages: ['Common', 'Draconic'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Draconic Cry',
            description: 'As a bonus action, you let out a cry at your enemies within 10 feet of you. Until the start of your next turn, you and your allies have advantage on attack rolls against any of those enemies who could hear you. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.'
          },
          {
            name: 'Kobold Legacy',
            description: 'Choose one: Craftiness (proficiency in one of Arcana, Investigation, Medicine, Sleight of Hand, or Survival), Defiance (advantage on saves against frightened), or Draconic Sorcery (know one sorcerer cantrip).'
          }
        ]
      },

      'Lizardfolk': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Draconic'],
        traits: [
          {
            name: 'Bite',
            description: 'Your fanged maw is a natural weapon, which you can use to make unarmed strikes. If you hit with it, you deal piercing damage equal to 1d6 + your Strength modifier.'
          },
          {
            name: 'Cunning Artisan',
            description: 'As part of a short rest, you can harvest bone and hide from a creature to create a shield, club, javelin, or 1d4 darts or blowgun needles. This requires a blade.'
          },
          {
            name: 'Hold Breath',
            description: 'You can hold your breath for up to 15 minutes at a time.'
          },
          {
            name: 'Hunter\'s Lore',
            description: 'You gain proficiency with two of the following skills: Animal Handling, Nature, Perception, Stealth, and Survival.'
          },
          {
            name: 'Natural Armor',
            description: 'When you aren\'t wearing armor, your AC equals 13 + your Dexterity modifier. You can use a shield and still gain this benefit.'
          },
          {
            name: 'Hungry Jaws',
            description: 'In battle, you can throw yourself into a vicious feeding frenzy. As a bonus action, you can make a special attack with your Bite. If the attack hits, it deals its normal damage, and you gain temporary hit points equal to your Constitution modifier (minimum of 1). Once you use this trait, you can\'t use it again until you finish a short or long rest.'
          }
        ]
      },

      'Orc': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Orc'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Aggressive',
            description: 'As a bonus action, you can move up to your speed toward an enemy of your choice that you can see or hear. You must end this move closer to the enemy than you started.'
          },
          {
            name: 'Powerful Build',
            description: 'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.'
          },
          {
            name: 'Relentless Endurance',
            description: 'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. Once you use this trait, you can\'t use it again until you finish a long rest.'
          }
        ]
      },

      'Tabaxi': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'One language of your choice'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Feline Agility',
            description: 'Your reflexes and agility allow you to move with a burst of speed. When you move on your turn in combat, you can double your speed until the end of the turn. Once you use this trait, you can\'t use it again until you move 0 feet on one of your turns.'
          },
          {
            name: 'Cat\'s Claws',
            description: 'You have a climbing speed of 20 feet. Additionally, your claws are natural weapons, which you can use to make unarmed strikes dealing 1d4 + Strength modifier slashing damage.'
          },
          {
            name: 'Cat\'s Talent',
            description: 'You have proficiency in the Perception and Stealth skills.'
          }
        ]
      },

      'Triton': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Primordial'],
        traits: [
          {
            name: 'Amphibious',
            description: 'You can breathe air and water.'
          },
          {
            name: 'Control Air and Water',
            description: 'You can cast Fog Cloud with this trait. At 3rd level, you can cast Gust of Wind. At 5th level, you can cast Wall of Water. Each spell can be cast once per long rest. Charisma is your spellcasting ability.'
          },
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Emissary of the Sea',
            description: 'Aquatic beasts have an extraordinary affinity with your people. You can communicate simple ideas with beasts that can breathe water.'
          },
          {
            name: 'Guardian of the Depths',
            description: 'Adapted to the ocean depths, you have resistance to cold damage.'
          },
          {
            name: 'Swim Speed',
            description: 'You have a swimming speed of 30 feet.'
          }
        ]
      },

      'Yuan-ti Pureblood': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Abyssal', 'Draconic'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Innate Spellcasting',
            description: 'You know the Poison Spray cantrip. At 3rd level, you can cast Animal Friendship (snakes only) at will. At 3rd level, you can also cast Suggestion once per long rest. Charisma is your spellcasting ability.'
          },
          {
            name: 'Magic Resistance',
            description: 'You have advantage on saving throws against spells and other magical effects.'
          },
          {
            name: 'Poison Immunity',
            description: 'You are immune to poison damage and the poisoned condition.'
          }
        ]
      },

      // ==================== ELEMENTAL RACES ====================

      'Genasi (Air)': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Primordial'],
        traits: [
          {
            name: 'Unending Breath',
            description: 'You can hold your breath indefinitely while you\'re not incapacitated.'
          },
          {
            name: 'Mingle with the Wind',
            description: 'You can cast the Levitate spell once per long rest, requiring no material components. Constitution is your spellcasting ability. This becomes available at 3rd level.'
          }
        ]
      },

      'Genasi (Earth)': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Primordial'],
        traits: [
          {
            name: 'Earth Walk',
            description: 'You can move across difficult terrain made of earth or stone without expending extra movement.'
          },
          {
            name: 'Merge with Stone',
            description: 'You can cast the Pass Without Trace spell once per long rest, requiring no material components. Constitution is your spellcasting ability. This becomes available at 3rd level.'
          }
        ]
      },

      'Genasi (Fire)': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Primordial'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Fire Resistance',
            description: 'You have resistance to fire damage.'
          },
          {
            name: 'Reach to the Blaze',
            description: 'You know the Produce Flame cantrip. At 3rd level, you can cast Burning Hands once per long rest. Constitution is your spellcasting ability.'
          }
        ]
      },

      'Genasi (Water)': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Primordial'],
        traits: [
          {
            name: 'Amphibious',
            description: 'You can breathe air and water.'
          },
          {
            name: 'Swim Speed',
            description: 'You have a swimming speed of 30 feet.'
          },
          {
            name: 'Acid Resistance',
            description: 'You have resistance to acid damage.'
          },
          {
            name: 'Call to the Wave',
            description: 'You know the Shape Water cantrip. At 3rd level, you can cast Create or Destroy Water as a 2nd-level spell once per long rest. Constitution is your spellcasting ability.'
          }
        ]
      },

      // ==================== RAVNICA RACES ====================

      'Centaur': {
        size: 'Medium',
        speed: 40,
        languages: ['Common', 'Sylvan'],
        traits: [
          {
            name: 'Fey',
            description: 'Your creature type is fey, rather than humanoid.'
          },
          {
            name: 'Charge',
            description: 'If you move at least 30 feet straight toward a target and then hit it with a melee weapon attack on the same turn, you can immediately follow that attack with a bonus action, making one attack against the target with your hooves.'
          },
          {
            name: 'Hooves',
            description: 'Your hooves are natural melee weapons, which you can use to make unarmed strikes. If you hit with them, you deal bludgeoning damage equal to 1d4 + your Strength modifier.'
          },
          {
            name: 'Equine Build',
            description: 'You count as one size larger when determining your carrying capacity. Climbing costs you 4 feet per 1 foot moved. Any mount built for a Medium humanoid creature is unable to carry you.'
          },
          {
            name: 'Survivor',
            description: 'You have proficiency in one of the following skills: Animal Handling, Medicine, Nature, or Survival.'
          }
        ]
      },

      'Loxodon': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Loxodon'],
        traits: [
          {
            name: 'Powerful Build',
            description: 'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.'
          },
          {
            name: 'Loxodon Serenity',
            description: 'You have advantage on saving throws against being charmed or frightened.'
          },
          {
            name: 'Natural Armor',
            description: 'You have thick, leathery skin. When you aren\'t wearing armor, your AC equals 12 + your Constitution modifier. You can use a shield and still gain this benefit.'
          },
          {
            name: 'Trunk',
            description: 'You can grasp things with your trunk, and you can use it as a snorkel. It has a reach of 5 feet, and it can lift a number of pounds equal to five times your Strength score.'
          },
          {
            name: 'Keen Smell',
            description: 'You have advantage on Wisdom (Perception), Wisdom (Survival), and Intelligence (Investigation) checks that involve smell.'
          }
        ]
      },

      'Minotaur': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Minotaur'],
        traits: [
          {
            name: 'Horns',
            description: 'Your horns are natural melee weapons, which you can use to make unarmed strikes. If you hit with them, you deal piercing damage equal to 1d6 + your Strength modifier.'
          },
          {
            name: 'Goring Rush',
            description: 'Immediately after you use the Dash action on your turn and move at least 20 feet, you can make one melee attack with your horns as a bonus action.'
          },
          {
            name: 'Hammering Horns',
            description: 'Immediately after you hit a creature with a melee attack as part of the Attack action on your turn, you can use a bonus action to attempt to shove that target with your horns. The target must be no more than one size larger than you and within 5 feet of you.'
          },
          {
            name: 'Labyrinthine Recall',
            description: 'You can perfectly recall any path you have traveled.'
          }
        ]
      },

      'Simic Hybrid': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Elvish or Vedalken'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Animal Enhancement (1st Level)',
            description: 'Choose one: Manta Glide (falling speed reduced, can glide), Nimble Climber (climbing speed equal to walking speed), or Underwater Adaptation (can breathe water, swimming speed equal to walking speed).'
          },
          {
            name: 'Animal Enhancement (5th Level)',
            description: 'At 5th level, choose one additional enhancement: Grappling Appendages (extra appendages for grappling), Carapace (+1 AC when not in heavy armor), or Acid Spit (ranged acid attack).'
          }
        ]
      },

      'Vedalken': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Vedalken', 'One language of your choice'],
        traits: [
          {
            name: 'Vedalken Dispassion',
            description: 'You have advantage on all Intelligence, Wisdom, and Charisma saving throws.'
          },
          {
            name: 'Tireless Precision',
            description: 'You are proficient in one of the following skills: Arcana, History, Investigation, Medicine, Performance, or Sleight of Hand. You are also proficient with one tool of your choice. Whenever you make an ability check with the chosen skill or tool, roll a d4 and add it to the check\'s total.'
          },
          {
            name: 'Partially Amphibious',
            description: 'By absorbing oxygen through your skin, you can breathe underwater for up to 1 hour. Once you\'ve reached that limit, you can\'t use this trait again until you finish a long rest.'
          }
        ]
      },

      // ==================== THEROS RACES ====================

      'Leonin': {
        size: 'Medium',
        speed: 35,
        languages: ['Common', 'Leonin'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Claws',
            description: 'Your claws are natural weapons, which you can use to make unarmed strikes. If you hit with them, you deal slashing damage equal to 1d4 + your Strength modifier.'
          },
          {
            name: 'Hunter\'s Instincts',
            description: 'You have proficiency in one of the following skills: Athletics, Intimidation, Perception, or Survival.'
          },
          {
            name: 'Daunting Roar',
            description: 'As a bonus action, you can let out an especially menacing roar. Creatures of your choice within 10 feet that can hear you must succeed on a Wisdom saving throw (DC = 8 + proficiency bonus + Constitution modifier) or become frightened of you until the end of your next turn. Once you use this trait, you can\'t use it again until you finish a short or long rest.'
          }
        ]
      },

      'Satyr': {
        size: 'Medium',
        speed: 35,
        languages: ['Common', 'Sylvan'],
        traits: [
          {
            name: 'Fey',
            description: 'Your creature type is fey, rather than humanoid.'
          },
          {
            name: 'Ram',
            description: 'You can use your head and horns to make unarmed strikes. If you hit with them, you deal bludgeoning damage equal to 1d4 + your Strength modifier.'
          },
          {
            name: 'Magic Resistance',
            description: 'You have advantage on saving throws against spells and other magical effects.'
          },
          {
            name: 'Mirthful Leaps',
            description: 'Whenever you make a long or high jump, you can roll a d8 and add the number rolled to the number of feet you cover, even when making a standing jump. This extra distance costs movement as normal.'
          },
          {
            name: 'Reveler',
            description: 'You have proficiency in the Performance and Persuasion skills.'
          }
        ]
      },

      // ==================== EBERRON RACES ====================

      'Changeling': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Two other languages of your choice'],
        traits: [
          {
            name: 'Shapechanger',
            description: 'As an action, you can change your appearance and voice. You determine the specifics of the changes, including your coloration, hair length, sex, height, and weight. You can make yourself appear as a member of another race, though none of your game statistics change.'
          },
          {
            name: 'Changeling Instincts',
            description: 'You gain proficiency with two of the following skills of your choice: Deception, Insight, Intimidation, or Persuasion.'
          }
        ]
      },

      'Kalashtar': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Quori', 'One language of your choice'],
        traits: [
          {
            name: 'Dual Mind',
            description: 'You have advantage on all Wisdom saving throws.'
          },
          {
            name: 'Mental Discipline',
            description: 'You have resistance to psychic damage.'
          },
          {
            name: 'Mind Link',
            description: 'You can speak telepathically to any creature you can see within 10 feet × your level. You don\'t need to share a language, but the creature must understand at least one language to respond telepathically.'
          },
          {
            name: 'Severed from Dreams',
            description: 'Kalashtar sleep but don\'t connect to the plane of dreams. You are immune to spells and effects that require you to dream, like the Dream spell.'
          }
        ]
      },

      'Shifter': {
        size: 'Medium',
        speed: 30,
        languages: ['Common'],
        traits: [
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.'
          },
          {
            name: 'Shifting',
            description: 'As a bonus action, you can assume a more bestial appearance. This transformation lasts for 1 minute, until you die, or until you revert to your normal appearance as a bonus action. When you shift, you gain temporary hit points equal to your level + your Constitution modifier. You can shift a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.'
          }
        ],
        subraces: {
          'Beasthide': {
            traits: [
              {
                name: 'Natural Athlete',
                description: 'You have proficiency in the Athletics skill.'
              },
              {
                name: 'Shifting Feature',
                description: 'Whenever you shift, you gain 1d6 additional temporary hit points. While shifted, you have a +1 bonus to your AC.'
              }
            ]
          },
          'Longtooth': {
            traits: [
              {
                name: 'Fierce',
                description: 'You have proficiency in the Intimidation skill.'
              },
              {
                name: 'Shifting Feature',
                description: 'While shifted, you can use your elongated fangs to make an unarmed strike as a bonus action. If you hit with your fangs, you deal 1d6 + Strength modifier piercing damage.'
              }
            ]
          },
          'Swiftstride': {
            traits: [
              {
                name: 'Graceful',
                description: 'You have proficiency in the Acrobatics skill.'
              },
              {
                name: 'Shifting Feature',
                description: 'While shifted, your walking speed increases by 10 feet. Additionally, you can move up to 10 feet as a reaction when a creature ends its turn within 5 feet of you. This reactive movement doesn\'t provoke opportunity attacks.'
              }
            ]
          },
          'Wildhunt': {
            traits: [
              {
                name: 'Natural Tracker',
                description: 'You have proficiency in the Survival skill.'
              },
              {
                name: 'Shifting Feature',
                description: 'While shifted, you have advantage on Wisdom checks, and no creature within 30 feet of you can make an attack roll with advantage against you, unless you\'re incapacitated.'
              }
            ]
          }
        }
      },

      'Warforged': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'One language of your choice'],
        traits: [
          {
            name: 'Constructed Resilience',
            description: 'You were created to have remarkable fortitude: You have advantage on saving throws against being poisoned, and resistance to poison damage. You don\'t need to eat, drink, or breathe. You are immune to disease. You don\'t need to sleep and don\'t suffer exhaustion from lack of rest. Magic can\'t put you to sleep.'
          },
          {
            name: 'Sentry\'s Rest',
            description: 'When you take a long rest, you must spend at least six hours in an inactive, motionless state, rather than sleeping. In this state, you appear inert, but it doesn\'t render you unconscious, and you can see and hear as normal.'
          },
          {
            name: 'Integrated Protection',
            description: 'Your body has built-in defensive layers. You gain a +1 bonus to Armor Class. You can don only armor with which you have proficiency. To don armor, you must incorporate it into your body over the course of 1 hour. To doff armor, you must spend 1 hour removing it. You can rest while donning or doffing armor in this way. While you live, your armor can\'t be removed from your body against your will.'
          },
          {
            name: 'Specialized Design',
            description: 'You gain one skill proficiency and one tool proficiency of your choice.'
          }
        ]
      },

      // ==================== OTHER RACES ====================

      'Tortle': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Aquan'],
        traits: [
          {
            name: 'Claws',
            description: 'Your claws are natural weapons, which you can use to make unarmed strikes. If you hit with them, you deal slashing damage equal to 1d4 + your Strength modifier.'
          },
          {
            name: 'Hold Breath',
            description: 'You can hold your breath for up to 1 hour at a time.'
          },
          {
            name: 'Natural Armor',
            description: 'Your shell provides you a base AC of 17 (your Dexterity modifier doesn\'t affect this number). You can\'t wear armor, but if you are using a shield, you can add the shield\'s bonus as normal.'
          },
          {
            name: 'Shell Defense',
            description: 'You can withdraw into your shell as an action. Until you emerge, you gain a +4 bonus to AC, and you have advantage on Strength and Constitution saving throws. While in your shell, you are prone, your speed is 0 and can\'t increase, you have disadvantage on Dexterity saving throws, you can\'t take reactions, and the only action you can take is a bonus action to emerge from your shell.'
          },
          {
            name: 'Survival Instinct',
            description: 'You have proficiency in the Survival skill.'
          }
        ]
      },

      'Locathah': {
        size: 'Medium',
        speed: 30,
        languages: ['Common', 'Aquan'],
        traits: [
          {
            name: 'Natural Armor',
            description: 'You have tough, scaly skin. When you aren\'t wearing armor, your AC is 12 + your Dexterity modifier. You can use your natural armor to determine your AC if worn armor would leave you with a lower AC.'
          },
          {
            name: 'Observant & Athletic',
            description: 'You have proficiency in the Athletics and Perception skills.'
          },
          {
            name: 'Leviathan Will',
            description: 'You have advantage on saving throws against being charmed, frightened, paralyzed, poisoned, stunned, or put to sleep.'
          },
          {
            name: 'Limited Amphibiousness',
            description: 'You can breathe air and water, but you need to be submerged at least once every 4 hours to avoid suffocating.'
          },
          {
            name: 'Swim Speed',
            description: 'You have a swimming speed of 30 feet.'
          }
        ]
      },

      'Grung': {
        size: 'Small',
        speed: 25,
        languages: ['Grung'],
        traits: [
          {
            name: 'Arboreal Alertness',
            description: 'You have proficiency in the Perception skill.'
          },
          {
            name: 'Amphibious',
            description: 'You can breathe air and water.'
          },
          {
            name: 'Poison Immunity',
            description: 'You are immune to poison damage and the poisoned condition.'
          },
          {
            name: 'Poisonous Skin',
            description: 'Any creature that grapples you or otherwise comes into direct contact with your skin must succeed on a DC 12 Constitution saving throw or become poisoned for 1 minute. A poisoned creature no longer in direct contact with you can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. You can also apply this poison to any piercing weapon as part of an attack.'
          },
          {
            name: 'Standing Leap',
            description: 'Your long jump is up to 25 feet and your high jump is up to 15 feet, with or without a running start.'
          },
          {
            name: 'Water Dependency',
            description: 'If you fail to immerse yourself in water for at least 1 hour during a day, you suffer one level of exhaustion at the end of that day.'
          }
        ]
      }
    },

    // ============================================================
    // SPECIES SPELLS (Spells granted by species features)
    // ============================================================

    /**
     * Spells granted by racial features at specific levels
     * Format: { 'RaceName': { level: [{ spell, type, note? }] } }
     * type: 'cantrip', 'once_per_long_rest', 'at_will'
     */
    RACIAL_SPELLS: {
      'Tiefling': {
        1: [{ spell: 'Thaumaturgy', type: 'cantrip' }],
        3: [{ spell: 'Hellish Rebuke', type: 'once_per_long_rest', note: '2nd-level' }],
        5: [{ spell: 'Darkness', type: 'once_per_long_rest' }]
      },
      // Tiefling subraces with different spells
      'Baalzebul': {
        1: [{ spell: 'Thaumaturgy', type: 'cantrip' }],
        3: [{ spell: 'Ray of Sickness', type: 'once_per_long_rest' }],
        5: [{ spell: 'Crown of Madness', type: 'once_per_long_rest' }]
      },
      'Dispater': {
        1: [{ spell: 'Thaumaturgy', type: 'cantrip' }],
        3: [{ spell: 'Disguise Self', type: 'once_per_long_rest' }],
        5: [{ spell: 'Detect Thoughts', type: 'once_per_long_rest' }]
      },
      'Fierna': {
        1: [{ spell: 'Friends', type: 'cantrip' }],
        3: [{ spell: 'Charm Person', type: 'once_per_long_rest' }],
        5: [{ spell: 'Suggestion', type: 'once_per_long_rest' }]
      },
      'Glasya': {
        1: [{ spell: 'Minor Illusion', type: 'cantrip' }],
        3: [{ spell: 'Disguise Self', type: 'once_per_long_rest' }],
        5: [{ spell: 'Invisibility', type: 'once_per_long_rest' }]
      },
      'Levistus': {
        1: [{ spell: 'Ray of Frost', type: 'cantrip' }],
        3: [{ spell: 'Armor of Agathys', type: 'once_per_long_rest', note: '2nd-level' }],
        5: [{ spell: 'Darkness', type: 'once_per_long_rest' }]
      },
      'Mammon': {
        1: [{ spell: 'Mage Hand', type: 'cantrip' }],
        3: [{ spell: "Tenser's Floating Disk", type: 'once_per_long_rest' }],
        5: [{ spell: 'Arcane Lock', type: 'once_per_long_rest' }]
      },
      'Mephistopheles': {
        1: [{ spell: 'Mage Hand', type: 'cantrip' }],
        3: [{ spell: 'Burning Hands', type: 'once_per_long_rest', note: '2nd-level' }],
        5: [{ spell: 'Flame Blade', type: 'once_per_long_rest' }]
      },
      'Zariel': {
        1: [{ spell: 'Thaumaturgy', type: 'cantrip' }],
        3: [{ spell: 'Searing Smite', type: 'once_per_long_rest' }],
        5: [{ spell: 'Branding Smite', type: 'once_per_long_rest' }]
      },
      // Drow
      'Dark Elf (Drow)': {
        1: [{ spell: 'Dancing Lights', type: 'cantrip' }],
        3: [{ spell: 'Faerie Fire', type: 'once_per_long_rest' }],
        5: [{ spell: 'Darkness', type: 'once_per_long_rest' }]
      },
      // Duergar
      'Duergar': {
        3: [{ spell: 'Enlarge/Reduce', type: 'once_per_long_rest', note: 'enlarge only, on self' }],
        5: [{ spell: 'Invisibility', type: 'once_per_long_rest', note: 'on self' }]
      },
      // High Elf
      'High Elf': {
        1: [{ spell: 'Wizard Cantrip (choice)', type: 'cantrip', note: 'Choose one wizard cantrip' }]
      },
      // Forest Gnome
      'Forest Gnome': {
        1: [{ spell: 'Minor Illusion', type: 'cantrip' }]
      },
      // Aasimar
      'Aasimar': {
        1: [{ spell: 'Light', type: 'cantrip' }]
      },
      // Triton
      'Triton': {
        1: [{ spell: 'Fog Cloud', type: 'once_per_long_rest' }],
        3: [{ spell: 'Gust of Wind', type: 'once_per_long_rest' }],
        5: [{ spell: 'Wall of Water', type: 'once_per_long_rest' }]
      },
      // Yuan-ti Pureblood
      'Yuan-ti Pureblood': {
        1: [{ spell: 'Poison Spray', type: 'cantrip' }],
        3: [
          { spell: 'Animal Friendship', type: 'at_will', note: 'snakes only' },
          { spell: 'Suggestion', type: 'once_per_long_rest' }
        ]
      },
      // Genasi
      'Genasi (Fire)': {
        1: [{ spell: 'Produce Flame', type: 'cantrip' }],
        3: [{ spell: 'Burning Hands', type: 'once_per_long_rest' }]
      },
      'Genasi (Water)': {
        1: [{ spell: 'Shape Water', type: 'cantrip' }],
        3: [{ spell: 'Create or Destroy Water', type: 'once_per_long_rest', note: '2nd-level' }]
      },
      'Genasi (Air)': {
        3: [{ spell: 'Levitate', type: 'once_per_long_rest' }]
      },
      'Genasi (Earth)': {
        3: [{ spell: 'Pass Without Trace', type: 'once_per_long_rest' }]
      },
      // Firbolg
      'Firbolg': {
        1: [
          { spell: 'Detect Magic', type: 'once_per_short_rest' },
          { spell: 'Disguise Self', type: 'once_per_short_rest', note: 'appear up to 3 feet shorter' }
        ]
      },
      // Githyanki
      'Githyanki': {
        1: [{ spell: 'Mage Hand', type: 'cantrip' }],
        3: [
          { spell: 'Jump', type: 'at_will' },
          { spell: 'Misty Step', type: 'once_per_long_rest' }
        ],
        5: [{ spell: 'Nondetection', type: 'at_will', note: 'on self' }]
      },
      // Githzerai
      'Githzerai': {
        1: [{ spell: 'Mage Hand', type: 'cantrip' }],
        3: [{ spell: 'Shield', type: 'once_per_long_rest' }],
        5: [{ spell: 'Detect Thoughts', type: 'once_per_long_rest' }]
      }
    },

    // ============================================================
    // BACKGROUND DATA
    // ============================================================

    /**
     * Background data including features, proficiencies, and equipment
     * Based on Player's Handbook backgrounds
     */
    BACKGROUND_DATA: {
      'Acolyte': {
        abilityScoreIncreases: {
          // 2024 PHB: Player chooses which abilities get +2 and +1
          flexible: true,
          choices: [
            { ability: 'choice', bonus: 2 },
            { ability: 'choice', bonus: 1 }
          ]
        },
        originFeat: 'Magic Initiate (Cleric)',
        feature: {
          name: 'Shelter of the Faithful',
          description: 'As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle. You might also have ties to a specific temple dedicated to your chosen deity or pantheon, and you have a residence there. This could be the temple where you used to serve, if you remain on good terms with it, or a temple where you have found a new home. While near your temple, you can call upon the priests for assistance, provided the assistance you ask for is not hazardous and you remain in good standing with your temple.'
        },
        proficiencies: {
          skills: ['Insight', 'Religion'],
          tools: [],
          languages: 2
        },
        equipment: [
          { name: 'Holy Symbol', quantity: 1, weight: 1, notes: 'A gift from your temple' },
          { name: 'Prayer Book', quantity: 1, weight: 5, notes: 'Or prayer wheel' },
          { name: 'Incense (sticks)', quantity: 5, weight: 0, notes: '' },
          { name: 'Vestments', quantity: 1, weight: 4, notes: '' },
          { name: 'Common Clothes', quantity: 1, weight: 3, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 15 gp' }
        ],
        startingGold: 15
      },
      'Charlatan': {
        feature: {
          name: 'False Identity',
          description: 'You have created a second identity that includes documentation, established acquaintances, and disguises that allow you to assume that persona. Additionally, you can forge documents including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy.'
        },
        proficiencies: {
          skills: ['Deception', 'Sleight of Hand'],
          tools: ['Disguise Kit', 'Forgery Kit'],
          languages: 0
        },
        equipment: [
          { name: 'Fine Clothes', quantity: 1, weight: 6, notes: '' },
          { name: 'Disguise Kit', quantity: 1, weight: 3, notes: '' },
          { name: 'Con Tools', quantity: 1, weight: 1, notes: 'Ten stoppered bottles filled with colored liquid, weighted dice, deck of marked cards, or signet ring of imaginary duke' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 15 gp' }
        ],
        startingGold: 15
      },
      'Criminal': {
        abilityScoreIncreases: {
          // 2024 PHB: Player chooses which abilities get +2 and +1
          flexible: true,
          choices: [
            { ability: 'choice', bonus: 2 },
            { ability: 'choice', bonus: 1 }
          ]
        },
        originFeat: 'Alert',
        feature: {
          name: 'Criminal Contact',
          description: 'You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.'
        },
        proficiencies: {
          skills: ['Deception', 'Stealth'],
          tools: ['Gaming Set (one of your choice)', 'Thieves\' Tools'],
          languages: 0
        },
        equipment: [
          { name: 'Crowbar', quantity: 1, weight: 5, notes: '' },
          { name: 'Dark Common Clothes', quantity: 1, weight: 3, notes: 'Including a hood' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 15 gp' }
        ],
        startingGold: 15
      },
      'Entertainer': {
        feature: {
          name: 'By Popular Demand',
          description: 'You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble\'s court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.'
        },
        proficiencies: {
          skills: ['Acrobatics', 'Performance'],
          tools: ['Disguise Kit', 'Musical Instrument (one of your choice)'],
          languages: 0
        },
        equipment: [
          { name: 'Musical Instrument', quantity: 1, weight: 3, notes: 'One of your choice' },
          { name: 'Favor of an Admirer', quantity: 1, weight: 0, notes: 'Love letter, lock of hair, or trinket' },
          { name: 'Costume', quantity: 1, weight: 4, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 15 gp' }
        ],
        startingGold: 15
      },
      'Folk Hero': {
        feature: {
          name: 'Rustic Hospitality',
          description: 'Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.'
        },
        proficiencies: {
          skills: ['Animal Handling', 'Survival'],
          tools: ['Artisan\'s Tools (one of your choice)', 'Vehicles (land)'],
          languages: 0
        },
        equipment: [
          { name: 'Artisan\'s Tools', quantity: 1, weight: 5, notes: 'One set of your choice' },
          { name: 'Shovel', quantity: 1, weight: 5, notes: '' },
          { name: 'Iron Pot', quantity: 1, weight: 10, notes: '' },
          { name: 'Common Clothes', quantity: 1, weight: 3, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 10 gp' }
        ],
        startingGold: 10
      },
      'Guild Artisan': {
        feature: {
          name: 'Guild Membership',
          description: 'As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession, which can be a good place to meet potential patrons, allies, or hirelings. Guilds often wield tremendous political power. If you are accused of a crime, your guild will support you if a good case can be made for your innocence or the crime is justifiable. You can also gain access to powerful political figures through the guild, if you are a member in good standing. Such connections might require the donation of money or magic items to the guild\'s coffers. You must pay dues of 5 gp per month to the guild. If you miss payments, you must make up back dues to remain in the guild\'s good graces.'
        },
        proficiencies: {
          skills: ['Insight', 'Persuasion'],
          tools: ['Artisan\'s Tools (one of your choice)'],
          languages: 1
        },
        equipment: [
          { name: 'Artisan\'s Tools', quantity: 1, weight: 5, notes: 'One set of your choice' },
          { name: 'Letter of Introduction', quantity: 1, weight: 0, notes: 'From your guild' },
          { name: 'Traveler\'s Clothes', quantity: 1, weight: 4, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 15 gp' }
        ],
        startingGold: 15
      },
      'Hermit': {
        feature: {
          name: 'Discovery',
          description: 'The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature. It could be a site that no one else has ever seen. You might have uncovered a fact that has long been forgotten, or unearthed some relic of the past that could rewrite history. It might be information that would be damaging to the people who consigned you to exile, and hence the reason for your return to society. Work with your DM to determine the details of your discovery and its impact on the campaign.'
        },
        proficiencies: {
          skills: ['Medicine', 'Religion'],
          tools: ['Herbalism Kit'],
          languages: 1
        },
        equipment: [
          { name: 'Scroll Case', quantity: 1, weight: 1, notes: 'Stuffed full of notes from your studies or prayers' },
          { name: 'Winter Blanket', quantity: 1, weight: 3, notes: '' },
          { name: 'Common Clothes', quantity: 1, weight: 3, notes: '' },
          { name: 'Herbalism Kit', quantity: 1, weight: 3, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 5 gp' }
        ],
        startingGold: 5
      },
      'Noble': {
        feature: {
          name: 'Position of Privilege',
          description: 'Thanks to your noble birth, people are inclined to think the best of you. You are welcome in high society, and people assume you have the right to be wherever you are. The common folk make every effort to accommodate you and avoid your displeasure, and other people of high birth treat you as a member of the same social sphere. You can secure an audience with a local noble if you need to.'
        },
        proficiencies: {
          skills: ['History', 'Persuasion'],
          tools: ['Gaming Set (one of your choice)'],
          languages: 1
        },
        equipment: [
          { name: 'Fine Clothes', quantity: 1, weight: 6, notes: '' },
          { name: 'Signet Ring', quantity: 1, weight: 0, notes: '' },
          { name: 'Scroll of Pedigree', quantity: 1, weight: 0, notes: '' },
          { name: 'Purse', quantity: 1, weight: 1, notes: 'Contains 25 gp' }
        ],
        startingGold: 25
      },
      'Outlander': {
        feature: {
          name: 'Wanderer',
          description: 'You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.'
        },
        proficiencies: {
          skills: ['Athletics', 'Survival'],
          tools: ['Musical Instrument (one of your choice)'],
          languages: 1
        },
        equipment: [
          { name: 'Staff', quantity: 1, weight: 4, notes: '' },
          { name: 'Hunting Trap', quantity: 1, weight: 25, notes: '' },
          { name: 'Trophy', quantity: 1, weight: 0, notes: 'From an animal you killed' },
          { name: 'Traveler\'s Clothes', quantity: 1, weight: 4, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 10 gp' }
        ],
        startingGold: 10
      },
      'Sage': {
        abilityScoreIncreases: {
          // 2024 PHB: Player chooses which abilities get +2 and +1
          flexible: true,
          choices: [
            { ability: 'choice', bonus: 2 },
            { ability: 'choice', bonus: 1 }
          ]
        },
        originFeat: 'Magic Initiate (Wizard)',
        feature: {
          name: 'Researcher',
          description: 'When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.'
        },
        proficiencies: {
          skills: ['Arcana', 'History'],
          tools: [],
          languages: 2
        },
        equipment: [
          { name: 'Bottle of Black Ink', quantity: 1, weight: 0, notes: '' },
          { name: 'Quill', quantity: 1, weight: 0, notes: '' },
          { name: 'Small Knife', quantity: 1, weight: 0.5, notes: '' },
          { name: 'Letter from Dead Colleague', quantity: 1, weight: 0, notes: 'With a question you have not yet been able to answer' },
          { name: 'Common Clothes', quantity: 1, weight: 3, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 10 gp' }
        ],
        startingGold: 10
      },
      'Sailor': {
        feature: {
          name: 'Ship\'s Passage',
          description: 'When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with (perhaps one captained by a former crewmate). Because you\'re calling in a favor, you can\'t be certain of a schedule or route that will meet your every need. Your Dungeon Master will determine how long it takes to get where you need to go. In return for your free passage, you and your companions are expected to assist the crew during the voyage.'
        },
        proficiencies: {
          skills: ['Athletics', 'Perception'],
          tools: ['Navigator\'s Tools', 'Vehicles (water)'],
          languages: 0
        },
        equipment: [
          { name: 'Belaying Pin (club)', quantity: 1, weight: 2, notes: '' },
          { name: 'Silk Rope (50 feet)', quantity: 1, weight: 5, notes: '' },
          { name: 'Lucky Charm', quantity: 1, weight: 0, notes: 'Rabbit foot, small stone with hole, etc.' },
          { name: 'Common Clothes', quantity: 1, weight: 3, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 10 gp' }
        ],
        startingGold: 10
      },
      'Soldier': {
        abilityScoreIncreases: {
          // 2024 PHB: Player chooses which abilities get +2 and +1
          flexible: true,
          choices: [
            { ability: 'choice', bonus: 2 },
            { ability: 'choice', bonus: 1 }
          ]
        },
        originFeat: 'Savage Attacker',
        feature: {
          name: 'Military Rank',
          description: 'You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they defer to you if they are of a lower rank. You can invoke your rank to exert influence over other soldiers and requisition simple equipment or horses for temporary use. You can also usually gain access to friendly military encampments and fortresses where your rank is recognized.'
        },
        proficiencies: {
          skills: ['Athletics', 'Intimidation'],
          tools: ['Gaming Set (one of your choice)', 'Vehicles (land)'],
          languages: 0
        },
        equipment: [
          { name: 'Insignia of Rank', quantity: 1, weight: 0, notes: '' },
          { name: 'Trophy from Fallen Enemy', quantity: 1, weight: 1, notes: 'Dagger, broken blade, or piece of a banner' },
          { name: 'Bone Dice Set', quantity: 1, weight: 0, notes: 'Or deck of cards' },
          { name: 'Common Clothes', quantity: 1, weight: 3, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 10 gp' }
        ],
        startingGold: 10
      },
      'Urchin': {
        feature: {
          name: 'City Secrets',
          description: 'You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. When you are not in combat, you (and companions you lead) can travel between any two locations in the city twice as fast as your speed would normally allow.'
        },
        proficiencies: {
          skills: ['Sleight of Hand', 'Stealth'],
          tools: ['Disguise Kit', 'Thieves\' Tools'],
          languages: 0
        },
        equipment: [
          { name: 'Small Knife', quantity: 1, weight: 0.5, notes: '' },
          { name: 'Map of the City', quantity: 1, weight: 0, notes: 'You grew up in' },
          { name: 'Pet Mouse', quantity: 1, weight: 0, notes: '' },
          { name: 'Token of Parents', quantity: 1, weight: 0, notes: 'A locket or token to remember your parents by' },
          { name: 'Common Clothes', quantity: 1, weight: 3, notes: '' },
          { name: 'Belt Pouch', quantity: 1, weight: 1, notes: 'Contains 10 gp' }
        ],
        startingGold: 10
      }
    },

    // ============================================================
    // WEAPON REFERENCE DATA
    // ============================================================

    /**
     * Simple weapons from the PHB
     */
    SIMPLE_WEAPONS: [
      // Melee
      { name: 'Club', damage: '1d4', damageType: 'bludgeoning', weight: 2, properties: 'Light' },
      { name: 'Dagger', damage: '1d4', damageType: 'piercing', weight: 1, properties: 'Finesse, Light, Thrown (20/60)' },
      { name: 'Greatclub', damage: '1d8', damageType: 'bludgeoning', weight: 10, properties: 'Two-Handed' },
      { name: 'Handaxe', damage: '1d6', damageType: 'slashing', weight: 2, properties: 'Light, Thrown (20/60)' },
      { name: 'Javelin', damage: '1d6', damageType: 'piercing', weight: 2, properties: 'Thrown (30/120)' },
      { name: 'Light Hammer', damage: '1d4', damageType: 'bludgeoning', weight: 2, properties: 'Light, Thrown (20/60)' },
      { name: 'Mace', damage: '1d6', damageType: 'bludgeoning', weight: 4, properties: '' },
      { name: 'Quarterstaff', damage: '1d6', damageType: 'bludgeoning', weight: 4, properties: 'Versatile (1d8)' },
      { name: 'Sickle', damage: '1d4', damageType: 'slashing', weight: 2, properties: 'Light' },
      { name: 'Spear', damage: '1d6', damageType: 'piercing', weight: 3, properties: 'Thrown (20/60), Versatile (1d8)' },
      // Ranged
      { name: 'Light Crossbow', damage: '1d8', damageType: 'piercing', weight: 5, properties: 'Ammunition (80/320), Loading, Two-Handed', ranged: true },
      { name: 'Shortbow', damage: '1d6', damageType: 'piercing', weight: 2, properties: 'Ammunition (80/320), Two-Handed', ranged: true },
      { name: 'Dart', damage: '1d4', damageType: 'piercing', weight: 0.25, properties: 'Finesse, Thrown (20/60)', ranged: true },
      { name: 'Sling', damage: '1d4', damageType: 'bludgeoning', weight: 0, properties: 'Ammunition (30/120)', ranged: true }
    ],

    /**
     * Martial weapons from the PHB
     */
    MARTIAL_WEAPONS: [
      // Melee
      { name: 'Battleaxe', damage: '1d8', damageType: 'slashing', weight: 4, properties: 'Versatile (1d10)' },
      { name: 'Flail', damage: '1d8', damageType: 'bludgeoning', weight: 2, properties: '' },
      { name: 'Glaive', damage: '1d10', damageType: 'slashing', weight: 6, properties: 'Heavy, Reach, Two-Handed' },
      { name: 'Greataxe', damage: '1d12', damageType: 'slashing', weight: 7, properties: 'Heavy, Two-Handed' },
      { name: 'Greatsword', damage: '2d6', damageType: 'slashing', weight: 6, properties: 'Heavy, Two-Handed' },
      { name: 'Halberd', damage: '1d10', damageType: 'slashing', weight: 6, properties: 'Heavy, Reach, Two-Handed' },
      { name: 'Lance', damage: '1d12', damageType: 'piercing', weight: 6, properties: 'Reach, Special' },
      { name: 'Longsword', damage: '1d8', damageType: 'slashing', weight: 3, properties: 'Versatile (1d10)' },
      { name: 'Maul', damage: '2d6', damageType: 'bludgeoning', weight: 10, properties: 'Heavy, Two-Handed' },
      { name: 'Morningstar', damage: '1d8', damageType: 'piercing', weight: 4, properties: '' },
      { name: 'Pike', damage: '1d10', damageType: 'piercing', weight: 18, properties: 'Heavy, Reach, Two-Handed' },
      { name: 'Rapier', damage: '1d8', damageType: 'piercing', weight: 2, properties: 'Finesse' },
      { name: 'Scimitar', damage: '1d6', damageType: 'slashing', weight: 3, properties: 'Finesse, Light' },
      { name: 'Shortsword', damage: '1d6', damageType: 'piercing', weight: 2, properties: 'Finesse, Light' },
      { name: 'Trident', damage: '1d6', damageType: 'piercing', weight: 4, properties: 'Thrown (20/60), Versatile (1d8)' },
      { name: 'War Pick', damage: '1d8', damageType: 'piercing', weight: 2, properties: '' },
      { name: 'Warhammer', damage: '1d8', damageType: 'bludgeoning', weight: 2, properties: 'Versatile (1d10)' },
      { name: 'Whip', damage: '1d4', damageType: 'slashing', weight: 3, properties: 'Finesse, Reach' },
      // Ranged
      { name: 'Longbow', damage: '1d8', damageType: 'piercing', weight: 2, properties: 'Ammunition (150/600), Heavy, Two-Handed', ranged: true },
      { name: 'Hand Crossbow', damage: '1d6', damageType: 'piercing', weight: 3, properties: 'Ammunition (30/120), Light, Loading', ranged: true },
      { name: 'Heavy Crossbow', damage: '1d10', damageType: 'piercing', weight: 18, properties: 'Ammunition (100/400), Heavy, Loading, Two-Handed', ranged: true }
    ],

    // ============================================================
    // EQUIPMENT COSTS (PHB prices in gp)
    // ============================================================

    /**
     * Gold piece costs for equipment items
     * Used to calculate gold value when player takes gold instead of item
     */
    EQUIPMENT_COSTS: {
      // Simple Melee Weapons
      'Club': 0.1,
      'Dagger': 2,
      'Greatclub': 0.2,
      'Handaxe': 5,
      'Javelin': 0.5,
      'Light Hammer': 2,
      'Mace': 5,
      'Quarterstaff': 0.2,
      'Sickle': 1,
      'Spear': 1,
      // Simple Ranged Weapons
      'Light Crossbow': 25,
      'Dart': 0.05,
      'Shortbow': 25,
      'Sling': 0.1,
      // Martial Melee Weapons
      'Battleaxe': 10,
      'Flail': 10,
      'Glaive': 20,
      'Greataxe': 30,
      'Greatsword': 50,
      'Halberd': 20,
      'Lance': 10,
      'Longsword': 15,
      'Maul': 10,
      'Morningstar': 15,
      'Pike': 5,
      'Rapier': 25,
      'Scimitar': 25,
      'Shortsword': 10,
      'Trident': 5,
      'War Pick': 5,
      'Warhammer': 15,
      'Whip': 2,
      // Martial Ranged Weapons
      'Longbow': 50,
      'Hand Crossbow': 75,
      'Heavy Crossbow': 50,
      // Armor
      'Padded Armor': 5,
      'Leather Armor': 10,
      'Studded Leather Armor': 45,
      'Hide Armor': 10,
      'Chain Shirt': 50,
      'Scale Mail': 50,
      'Breastplate': 400,
      'Half Plate': 750,
      'Ring Mail': 30,
      'Chain Mail': 75,
      'Splint Armor': 200,
      'Plate Armor': 1500,
      'Shield': 10,
      // Ammunition
      'Arrows (20)': 1,
      'Crossbow Bolts (20)': 1,
      // Packs & Equipment
      "Dungeoneer's Pack": 12,
      "Explorer's Pack": 10,
      "Diplomat's Pack": 39,
      "Entertainer's Pack": 40,
      "Burglar's Pack": 16,
      "Priest's Pack": 19,
      "Scholar's Pack": 40,
      // Instruments & Tools
      'Lute': 35,
      'Musical Instrument': 25,
      // Misc gear
      'Holy Symbol': 5,
      'Component Pouch': 25,
      'Arcane Focus': 10,
      'Druidic Focus': 5,
      "Thieves' Tools": 25,
      'Wooden Shield': 10
    },

    // ============================================================
    // STARTING GOLD BY CLASS
    // ============================================================

    /**
     * Starting gold dice formulas for each class (alternative to equipment)
     */
    CLASS_STARTING_GOLD: {
      'Barbarian': { dice: '2d4', multiplier: 10, average: 50 },
      'Bard': { dice: '5d4', multiplier: 10, average: 125 },
      'Cleric': { dice: '5d4', multiplier: 10, average: 125 },
      'Druid': { dice: '2d4', multiplier: 10, average: 50 },
      'Fighter': { dice: '5d4', multiplier: 10, average: 125 },
      'Monk': { dice: '5d4', multiplier: 10, average: 125 },
      'Paladin': { dice: '5d4', multiplier: 10, average: 125 },
      'Ranger': { dice: '5d4', multiplier: 10, average: 125 },
      'Rogue': { dice: '4d4', multiplier: 10, average: 100 },
      'Sorcerer': { dice: '3d4', multiplier: 10, average: 75 },
      'Warlock': { dice: '4d4', multiplier: 10, average: 100 },
      'Wizard': { dice: '4d4', multiplier: 10, average: 100 },
      'Artificer': { dice: '5d4', multiplier: 10, average: 125 }
    },

    // ============================================================
    // CLASS EQUIPMENT CHOICES (PHB Style)
    // ============================================================

    /**
     * Equipment choices for each class - allows players to pick between options
     * Each choice has multiple options; player picks one per choice group
     * 'items' can be an array of items OR a string like 'any_martial_melee' for weapon selection
     */
    CLASS_EQUIPMENT_CHOICES: {
      'Barbarian': {
        choices: [
          {
            id: 'weapon1',
            label: 'Primary Weapon',
            options: [
              { id: 'greataxe', label: 'Greataxe', items: [{ name: 'Greataxe', quantity: 1, weight: 7, notes: '1d12 slashing, heavy, two-handed' }] },
              { id: 'martial', label: 'Any martial melee weapon', items: 'any_martial_melee' }
            ]
          },
          {
            id: 'weapon2',
            label: 'Secondary Weapons',
            options: [
              { id: 'handaxes', label: 'Two handaxes', items: [{ name: 'Handaxe', quantity: 2, weight: 2, notes: '1d6 slashing, light, thrown (20/60)' }] },
              { id: 'simple', label: 'Any simple weapon', items: 'any_simple' }
            ]
          }
        ],
        fixed: [
          { name: 'Javelin', quantity: 4, weight: 2, notes: '1d6 piercing, thrown (30/120)' },
          { name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      },
      'Bard': {
        choices: [
          {
            id: 'weapon1',
            label: 'Weapon',
            options: [
              { id: 'rapier', label: 'Rapier', items: [{ name: 'Rapier', quantity: 1, weight: 2, notes: '1d8 piercing, finesse' }] },
              { id: 'longsword', label: 'Longsword', items: [{ name: 'Longsword', quantity: 1, weight: 3, notes: '1d8 slashing, versatile (1d10)' }] },
              { id: 'simple', label: 'Any simple weapon', items: 'any_simple' }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'diplomat', label: "Diplomat's Pack", items: [{ name: "Diplomat's Pack", quantity: 1, weight: 36, notes: 'Chest, 2 cases for maps/scrolls, fine clothes, ink, pen, lamp, 2 flasks of oil, 5 sheets of paper, perfume, sealing wax, soap' }] },
              { id: 'entertainer', label: "Entertainer's Pack", items: [{ name: "Entertainer's Pack", quantity: 1, weight: 38, notes: 'Backpack, bedroll, 2 costumes, 5 candles, 5 days of rations, waterskin, disguise kit' }] }
            ]
          },
          {
            id: 'instrument',
            label: 'Musical Instrument',
            options: [
              { id: 'lute', label: 'Lute', items: [{ name: 'Lute', quantity: 1, weight: 2, notes: 'Musical instrument' }] },
              { id: 'other', label: 'Any other musical instrument', items: [{ name: 'Musical Instrument', quantity: 1, weight: 2, notes: 'Your choice of instrument' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true },
          { name: 'Dagger', quantity: 1, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }
        ]
      },
      'Cleric': {
        choices: [
          {
            id: 'weapon1',
            label: 'Primary Weapon',
            options: [
              { id: 'mace', label: 'Mace', items: [{ name: 'Mace', quantity: 1, weight: 4, notes: '1d6 bludgeoning' }] },
              { id: 'warhammer', label: 'Warhammer (if proficient)', items: [{ name: 'Warhammer', quantity: 1, weight: 2, notes: '1d8 bludgeoning, versatile (1d10)' }] }
            ]
          },
          {
            id: 'armor',
            label: 'Armor',
            options: [
              { id: 'scale', label: 'Scale Mail', items: [{ name: 'Scale Mail', quantity: 1, weight: 45, notes: 'AC 14 + Dex modifier (max 2), disadvantage on Stealth', equipped: true }] },
              { id: 'leather', label: 'Leather Armor', items: [{ name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true }] },
              { id: 'chain', label: 'Chain Mail (if proficient)', items: [{ name: 'Chain Mail', quantity: 1, weight: 55, notes: 'AC 16, disadvantage on Stealth', equipped: true }] }
            ]
          },
          {
            id: 'weapon2',
            label: 'Secondary Weapon',
            options: [
              { id: 'crossbow', label: 'Light crossbow and 20 bolts', items: [
                { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
                { name: 'Crossbow Bolts', quantity: 20, weight: 1.5, notes: '' }
              ]},
              { id: 'simple', label: 'Any simple weapon', items: 'any_simple' }
            ]
          }
        ],
        fixed: [
          { name: 'Shield', quantity: 1, weight: 6, notes: '+2 AC', equipped: true },
          { name: 'Holy Symbol', quantity: 1, weight: 1, notes: 'Divine focus' },
          { name: "Priest's Pack", quantity: 1, weight: 24, notes: 'Backpack, blanket, candles (10), tinderbox, alms box, incense (2 blocks), censer, vestments, rations (2 days), waterskin' }
        ]
      },
      'Druid': {
        choices: [
          {
            id: 'shield',
            label: 'Shield or Weapon',
            options: [
              { id: 'wooden_shield', label: 'Wooden Shield', items: [{ name: 'Wooden Shield', quantity: 1, weight: 6, notes: '+2 AC', equipped: true }] },
              { id: 'simple', label: 'Any simple weapon', items: 'any_simple' }
            ]
          },
          {
            id: 'weapon1',
            label: 'Weapon',
            options: [
              { id: 'scimitar', label: 'Scimitar', items: [{ name: 'Scimitar', quantity: 1, weight: 3, notes: '1d6 slashing, finesse, light' }] },
              { id: 'simple_melee', label: 'Any simple melee weapon', items: 'any_simple_melee' }
            ]
          }
        ],
        fixed: [
          { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true },
          { name: 'Druidic Focus', quantity: 1, weight: 0, notes: 'Sprig of mistletoe' },
          { name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      },
      'Fighter': {
        choices: [
          {
            id: 'armor',
            label: 'Armor',
            options: [
              { id: 'chain', label: 'Chain Mail', items: [{ name: 'Chain Mail', quantity: 1, weight: 55, notes: 'AC 16, disadvantage on Stealth', equipped: true }] },
              { id: 'leather', label: 'Leather Armor, Longbow, and 20 Arrows', items: [
                { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true },
                { name: 'Longbow', quantity: 1, weight: 2, notes: '1d8 piercing, ammunition (150/600), heavy, two-handed' },
                { name: 'Arrows', quantity: 20, weight: 1, notes: '' }
              ]}
            ]
          },
          {
            id: 'weapon1',
            label: 'Primary Weapons',
            options: [
              { id: 'martial_shield', label: 'A martial weapon and a shield', items: 'any_martial_and_shield' },
              { id: 'two_martial', label: 'Two martial weapons', items: 'any_two_martial' }
            ]
          },
          {
            id: 'weapon2',
            label: 'Secondary Weapon',
            options: [
              { id: 'crossbow', label: 'Light crossbow and 20 bolts', items: [
                { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
                { name: 'Crossbow Bolts', quantity: 20, weight: 1.5, notes: '' }
              ]},
              { id: 'handaxes', label: 'Two handaxes', items: [{ name: 'Handaxe', quantity: 2, weight: 2, notes: '1d6 slashing, light, thrown (20/60)' }] }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'dungeoneer', label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }] },
              { id: 'explorer', label: "Explorer's Pack", items: [{ name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: []
      },
      'Monk': {
        choices: [
          {
            id: 'weapon1',
            label: 'Weapon',
            options: [
              { id: 'shortsword', label: 'Shortsword', items: [{ name: 'Shortsword', quantity: 1, weight: 2, notes: '1d6 piercing, finesse, light' }] },
              { id: 'simple', label: 'Any simple weapon', items: 'any_simple' }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'dungeoneer', label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }] },
              { id: 'explorer', label: "Explorer's Pack", items: [{ name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Dart', quantity: 10, weight: 2.5, notes: '1d4 piercing, finesse, thrown (20/60)' }
        ]
      },
      'Paladin': {
        choices: [
          {
            id: 'weapon1',
            label: 'Primary Weapons',
            options: [
              { id: 'martial_shield', label: 'A martial weapon and a shield', items: 'any_martial_and_shield' },
              { id: 'two_martial', label: 'Two martial weapons', items: 'any_two_martial' }
            ]
          },
          {
            id: 'weapon2',
            label: 'Secondary Weapon',
            options: [
              { id: 'javelins', label: 'Five javelins', items: [{ name: 'Javelin', quantity: 5, weight: 2, notes: '1d6 piercing, thrown (30/120)' }] },
              { id: 'simple_melee', label: 'Any simple melee weapon', items: 'any_simple_melee' }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'priest', label: "Priest's Pack", items: [{ name: "Priest's Pack", quantity: 1, weight: 24, notes: 'Backpack, blanket, candles (10), tinderbox, alms box, incense (2 blocks), censer, vestments, rations (2 days), waterskin' }] },
              { id: 'explorer', label: "Explorer's Pack", items: [{ name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Chain Mail', quantity: 1, weight: 55, notes: 'AC 16, disadvantage on Stealth', equipped: true },
          { name: 'Holy Symbol', quantity: 1, weight: 1, notes: 'Divine focus' }
        ]
      },
      'Ranger': {
        choices: [
          {
            id: 'armor',
            label: 'Armor',
            options: [
              { id: 'scale', label: 'Scale Mail', items: [{ name: 'Scale Mail', quantity: 1, weight: 45, notes: 'AC 14 + Dex modifier (max 2), disadvantage on Stealth', equipped: true }] },
              { id: 'leather', label: 'Leather Armor', items: [{ name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true }] }
            ]
          },
          {
            id: 'weapon1',
            label: 'Weapons',
            options: [
              { id: 'shortswords', label: 'Two shortswords', items: [{ name: 'Shortsword', quantity: 2, weight: 2, notes: '1d6 piercing, finesse, light' }] },
              { id: 'simple_melee', label: 'Two simple melee weapons', items: 'any_two_simple_melee' }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'dungeoneer', label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }] },
              { id: 'explorer', label: "Explorer's Pack", items: [{ name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Longbow', quantity: 1, weight: 2, notes: '1d8 piercing, ammunition (150/600), heavy, two-handed' },
          { name: 'Arrows', quantity: 20, weight: 1, notes: '' }
        ]
      },
      'Rogue': {
        choices: [
          {
            id: 'weapon1',
            label: 'Weapon',
            options: [
              { id: 'rapier', label: 'Rapier', items: [{ name: 'Rapier', quantity: 1, weight: 2, notes: '1d8 piercing, finesse' }] },
              { id: 'shortsword', label: 'Shortsword', items: [{ name: 'Shortsword', quantity: 1, weight: 2, notes: '1d6 piercing, finesse, light' }] }
            ]
          },
          {
            id: 'weapon2',
            label: 'Ranged Weapon',
            options: [
              { id: 'shortbow', label: 'Shortbow and quiver of 20 arrows', items: [
                { name: 'Shortbow', quantity: 1, weight: 2, notes: '1d6 piercing, ammunition (80/320), two-handed' },
                { name: 'Arrows', quantity: 20, weight: 1, notes: '' }
              ]},
              { id: 'shortsword', label: 'Shortsword', items: [{ name: 'Shortsword', quantity: 1, weight: 2, notes: '1d6 piercing, finesse, light' }] }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'burglar', label: "Burglar's Pack", items: [{ name: "Burglar's Pack", quantity: 1, weight: 44.5, notes: 'Backpack, bag of 1000 ball bearings, 10 feet of string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks of oil, 5 days rations, tinderbox, waterskin, 50 feet of hempen rope' }] },
              { id: 'dungeoneer', label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }] },
              { id: 'explorer', label: "Explorer's Pack", items: [{ name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true },
          { name: 'Dagger', quantity: 2, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' },
          { name: "Thieves' Tools", quantity: 1, weight: 1, notes: '' }
        ]
      },
      'Sorcerer': {
        choices: [
          {
            id: 'weapon1',
            label: 'Weapon',
            options: [
              { id: 'crossbow', label: 'Light crossbow and 20 bolts', items: [
                { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
                { name: 'Crossbow Bolts', quantity: 20, weight: 1.5, notes: '' }
              ]},
              { id: 'simple', label: 'Any simple weapon', items: 'any_simple' }
            ]
          },
          {
            id: 'focus',
            label: 'Arcane Focus',
            options: [
              { id: 'component', label: 'Component pouch', items: [{ name: 'Component Pouch', quantity: 1, weight: 2, notes: 'Arcane focus' }] },
              { id: 'arcane', label: 'Arcane focus', items: [{ name: 'Arcane Focus', quantity: 1, weight: 0, notes: 'Crystal, orb, rod, staff, or wand' }] }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'dungeoneer', label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }] },
              { id: 'explorer', label: "Explorer's Pack", items: [{ name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Dagger', quantity: 2, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }
        ]
      },
      'Warlock': {
        choices: [
          {
            id: 'weapon1',
            label: 'Weapon',
            options: [
              { id: 'crossbow', label: 'Light crossbow and 20 bolts', items: [
                { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
                { name: 'Crossbow Bolts', quantity: 20, weight: 1.5, notes: '' }
              ]},
              { id: 'simple', label: 'Any simple weapon', items: 'any_simple' }
            ]
          },
          {
            id: 'focus',
            label: 'Arcane Focus',
            options: [
              { id: 'component', label: 'Component pouch', items: [{ name: 'Component Pouch', quantity: 1, weight: 2, notes: 'Arcane focus' }] },
              { id: 'arcane', label: 'Arcane focus', items: [{ name: 'Arcane Focus', quantity: 1, weight: 0, notes: 'Pact item or other focus' }] }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'scholar', label: "Scholar's Pack", items: [{ name: "Scholar's Pack", quantity: 1, weight: 10, notes: 'Backpack, book of lore, bottle of ink, ink pen, 10 sheets of parchment, little bag of sand, small knife' }] },
              { id: 'dungeoneer', label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true },
          { name: 'Dagger', quantity: 2, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }
        ]
      },
      'Wizard': {
        choices: [
          {
            id: 'weapon1',
            label: 'Weapon',
            options: [
              { id: 'quarterstaff', label: 'Quarterstaff', items: [{ name: 'Quarterstaff', quantity: 1, weight: 4, notes: '1d6 bludgeoning, versatile (1d8)' }] },
              { id: 'dagger', label: 'Dagger', items: [{ name: 'Dagger', quantity: 1, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }] }
            ]
          },
          {
            id: 'focus',
            label: 'Arcane Focus',
            options: [
              { id: 'component', label: 'Component pouch', items: [{ name: 'Component Pouch', quantity: 1, weight: 2, notes: 'Arcane focus' }] },
              { id: 'arcane', label: 'Arcane focus', items: [{ name: 'Arcane Focus', quantity: 1, weight: 0, notes: 'Crystal, orb, rod, staff, or wand' }] }
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'scholar', label: "Scholar's Pack", items: [{ name: "Scholar's Pack", quantity: 1, weight: 10, notes: 'Backpack, book of lore, bottle of ink, ink pen, 10 sheets of parchment, little bag of sand, small knife' }] },
              { id: 'explorer', label: "Explorer's Pack", items: [{ name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Spellbook', quantity: 1, weight: 3, notes: 'Contains your wizard spells' }
        ]
      },
      'Artificer': {
        choices: [
          {
            id: 'weapon1',
            label: 'Weapon',
            options: [
              { id: 'simple', label: 'Any two simple weapons', items: 'any_two_simple' },
              { id: 'crossbow', label: 'Light crossbow and 20 bolts', items: [
                { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
                { name: 'Crossbow Bolts', quantity: 20, weight: 1.5, notes: '' }
              ]}
            ]
          },
          {
            id: 'pack',
            label: 'Equipment Pack',
            options: [
              { id: 'dungeoneer', label: "Dungeoneer's Pack", items: [{ name: "Dungeoneer's Pack", quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }] },
              { id: 'explorer', label: "Explorer's Pack", items: [{ name: "Explorer's Pack", quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }] }
            ]
          }
        ],
        fixed: [
          { name: 'Scale Mail', quantity: 1, weight: 45, notes: 'AC 14 + Dex modifier (max 2), disadvantage on Stealth', equipped: true },
          { name: "Thieves' Tools", quantity: 1, weight: 1, notes: 'Required for Artificer spellcasting' },
          { name: "Tinker's Tools", quantity: 1, weight: 10, notes: 'Artisan tools' }
        ]
      }
    },

    // ============================================================
    // DEFAULT CLASS STARTING EQUIPMENT
    // ============================================================

    /**
     * Default starting equipment loadouts for each class
     * Simplified from the PHB choices - gives a sensible default for quick character creation
     */
    DEFAULT_CLASS_EQUIPMENT: {
      'Barbarian': {
        weapons: [
          { name: 'Greataxe', quantity: 1, weight: 7, notes: '1d12 slashing, heavy, two-handed' },
          { name: 'Handaxe', quantity: 2, weight: 2, notes: '1d6 slashing, light, thrown (20/60)' },
          { name: 'Javelin', quantity: 4, weight: 2, notes: '1d6 piercing, thrown (30/120)' }
        ],
        armor: [],
        gear: [
          { name: 'Explorer\'s Pack', quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      },
      'Bard': {
        weapons: [
          { name: 'Rapier', quantity: 1, weight: 2, notes: '1d8 piercing, finesse' },
          { name: 'Dagger', quantity: 1, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }
        ],
        armor: [
          { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true }
        ],
        gear: [
          { name: 'Lute', quantity: 1, weight: 2, notes: 'Musical instrument' },
          { name: 'Diplomat\'s Pack', quantity: 1, weight: 36, notes: 'Chest, 2 cases for maps/scrolls, fine clothes, bottle of ink, ink pen, lamp, 2 flasks of oil, 5 sheets of paper, vial of perfume, sealing wax, soap' }
        ]
      },
      'Cleric': {
        weapons: [
          { name: 'Mace', quantity: 1, weight: 4, notes: '1d6 bludgeoning' },
          { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
          { name: 'Crossbow Bolts', quantity: 20, weight: 0.075, notes: '' }
        ],
        armor: [
          { name: 'Scale Mail', quantity: 1, weight: 45, notes: 'AC 14 + Dex modifier (max 2), disadvantage on Stealth', equipped: true },
          { name: 'Shield', quantity: 1, weight: 6, notes: '+2 AC', equipped: true }
        ],
        gear: [
          { name: 'Holy Symbol', quantity: 1, weight: 1, notes: 'Divine focus' },
          { name: 'Priest\'s Pack', quantity: 1, weight: 24, notes: 'Backpack, blanket, candles (10), tinderbox, alms box, incense (2 blocks), censer, vestments, rations (2 days), waterskin' }
        ]
      },
      'Druid': {
        weapons: [
          { name: 'Wooden Shield', quantity: 1, weight: 6, notes: '+2 AC', equipped: true },
          { name: 'Scimitar', quantity: 1, weight: 3, notes: '1d6 slashing, finesse, light' }
        ],
        armor: [
          { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true }
        ],
        gear: [
          { name: 'Druidic Focus', quantity: 1, weight: 0, notes: 'Sprig of mistletoe' },
          { name: 'Explorer\'s Pack', quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      },
      'Fighter': {
        weapons: [
          { name: 'Longsword', quantity: 1, weight: 3, notes: '1d8 slashing, versatile (1d10)' },
          { name: 'Longbow', quantity: 1, weight: 2, notes: '1d8 piercing, ammunition (150/600), heavy, two-handed' },
          { name: 'Arrows', quantity: 20, weight: 0.05, notes: '' }
        ],
        armor: [
          { name: 'Chain Mail', quantity: 1, weight: 55, notes: 'AC 16, disadvantage on Stealth', equipped: true },
          { name: 'Shield', quantity: 1, weight: 6, notes: '+2 AC', equipped: true }
        ],
        gear: [
          { name: 'Dungeoneer\'s Pack', quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      },
      'Monk': {
        weapons: [
          { name: 'Shortsword', quantity: 1, weight: 2, notes: '1d6 piercing, finesse, light' },
          { name: 'Dart', quantity: 10, weight: 0.25, notes: '1d4 piercing, finesse, thrown (20/60)' }
        ],
        armor: [],
        gear: [
          { name: 'Dungeoneer\'s Pack', quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      },
      'Paladin': {
        weapons: [
          { name: 'Longsword', quantity: 1, weight: 3, notes: '1d8 slashing, versatile (1d10)' },
          { name: 'Javelin', quantity: 5, weight: 2, notes: '1d6 piercing, thrown (30/120)' }
        ],
        armor: [
          { name: 'Chain Mail', quantity: 1, weight: 55, notes: 'AC 16, disadvantage on Stealth', equipped: true },
          { name: 'Shield', quantity: 1, weight: 6, notes: '+2 AC', equipped: true }
        ],
        gear: [
          { name: 'Holy Symbol', quantity: 1, weight: 1, notes: 'Divine focus' },
          { name: 'Priest\'s Pack', quantity: 1, weight: 24, notes: 'Backpack, blanket, candles (10), tinderbox, alms box, incense (2 blocks), censer, vestments, rations (2 days), waterskin' }
        ]
      },
      'Ranger': {
        weapons: [
          { name: 'Shortsword', quantity: 2, weight: 2, notes: '1d6 piercing, finesse, light' },
          { name: 'Longbow', quantity: 1, weight: 2, notes: '1d8 piercing, ammunition (150/600), heavy, two-handed' },
          { name: 'Arrows', quantity: 20, weight: 0.05, notes: '' }
        ],
        armor: [
          { name: 'Scale Mail', quantity: 1, weight: 45, notes: 'AC 14 + Dex modifier (max 2), disadvantage on Stealth', equipped: true }
        ],
        gear: [
          { name: 'Explorer\'s Pack', quantity: 1, weight: 59, notes: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      },
      'Rogue': {
        weapons: [
          { name: 'Rapier', quantity: 1, weight: 2, notes: '1d8 piercing, finesse' },
          { name: 'Shortbow', quantity: 1, weight: 2, notes: '1d6 piercing, ammunition (80/320), two-handed' },
          { name: 'Arrows', quantity: 20, weight: 0.05, notes: '' },
          { name: 'Dagger', quantity: 2, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }
        ],
        armor: [
          { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true }
        ],
        gear: [
          { name: 'Thieves\' Tools', quantity: 1, weight: 1, notes: '' },
          { name: 'Burglar\'s Pack', quantity: 1, weight: 44.5, notes: 'Backpack, bag of 1000 ball bearings, 10 feet of string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks of oil, 5 days rations, tinderbox, waterskin, 50 feet of hempen rope' }
        ]
      },
      'Sorcerer': {
        weapons: [
          { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
          { name: 'Crossbow Bolts', quantity: 20, weight: 0.075, notes: '' },
          { name: 'Dagger', quantity: 2, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }
        ],
        armor: [],
        gear: [
          { name: 'Component Pouch', quantity: 1, weight: 2, notes: 'Arcane focus' },
          { name: 'Dungeoneer\'s Pack', quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      },
      'Warlock': {
        weapons: [
          { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
          { name: 'Crossbow Bolts', quantity: 20, weight: 0.075, notes: '' },
          { name: 'Dagger', quantity: 2, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }
        ],
        armor: [
          { name: 'Leather Armor', quantity: 1, weight: 10, notes: 'AC 11 + Dex modifier', equipped: true }
        ],
        gear: [
          { name: 'Arcane Focus', quantity: 1, weight: 0, notes: 'Pact item or component pouch' },
          { name: 'Scholar\'s Pack', quantity: 1, weight: 10, notes: 'Backpack, book of lore, bottle of ink, ink pen, 10 sheets of parchment, little bag of sand, small knife' }
        ]
      },
      'Wizard': {
        weapons: [
          { name: 'Quarterstaff', quantity: 1, weight: 4, notes: '1d6 bludgeoning, versatile (1d8)' },
          { name: 'Dagger', quantity: 1, weight: 1, notes: '1d4 piercing, finesse, light, thrown (20/60)' }
        ],
        armor: [],
        gear: [
          { name: 'Component Pouch', quantity: 1, weight: 2, notes: 'Arcane focus' },
          { name: 'Spellbook', quantity: 1, weight: 3, notes: 'Contains your wizard spells' },
          { name: 'Scholar\'s Pack', quantity: 1, weight: 10, notes: 'Backpack, book of lore, bottle of ink, ink pen, 10 sheets of parchment, little bag of sand, small knife' }
        ]
      },
      'Artificer': {
        weapons: [
          { name: 'Light Crossbow', quantity: 1, weight: 5, notes: '1d8 piercing, ammunition (80/320), loading, two-handed' },
          { name: 'Crossbow Bolts', quantity: 20, weight: 0.075, notes: '' },
          { name: 'Light Hammer', quantity: 1, weight: 2, notes: '1d4 bludgeoning, light, thrown (20/60)' }
        ],
        armor: [
          { name: 'Scale Mail', quantity: 1, weight: 45, notes: 'AC 14 + Dex modifier (max 2), disadvantage on Stealth', equipped: true },
          { name: 'Shield', quantity: 1, weight: 6, notes: '+2 AC', equipped: true }
        ],
        gear: [
          { name: 'Thieves\' Tools', quantity: 1, weight: 1, notes: 'Required for Artificer spellcasting' },
          { name: 'Tinker\'s Tools', quantity: 1, weight: 10, notes: 'Artisan tools' },
          { name: 'Dungeoneer\'s Pack', quantity: 1, weight: 61.5, notes: 'Backpack, crowbar, hammer, pitons (10), torches (10), tinderbox, rations (10 days), waterskin, hempen rope (50 ft)' }
        ]
      }
    },

    // ============================================================
    // SPECIES LEVEL FEATURES
    // ============================================================

    /**
     * Racial features that unlock at specific character levels
     * Format: { 'RaceName': { level: { name, description, options? } } }
     */
    RACIAL_FEATURES: {
      // Aasimar (All variants - Volo's Guide / Mordenkainen's)
      'Aasimar': {
        3: {
          name: 'Celestial Revelation',
          description: 'Choose your celestial transformation: Necrotic Shroud, Radiant Consumption, or Radiant Soul. You can transform as a bonus action once per long rest.',
          options: [
            {
              name: 'Necrotic Shroud',
              description: 'Transform with spectral wings. Creatures within 10 feet that see you must succeed on a Charisma saving throw (DC 8 + proficiency + CHA) or become frightened until the end of your next turn. Once per turn, add extra necrotic damage equal to your proficiency bonus to one target. Lasts 1 minute.'
            },
            {
              name: 'Radiant Consumption',
              description: 'Radiant light emanates from you in a 10-foot radius. You and creatures of your choice shed bright light for 10 feet and dim light for another 10. At the end of each of your turns, you and each creature within 10 feet take radiant damage equal to half your level. Once per turn, add extra radiant damage equal to your proficiency bonus to one target. Lasts 1 minute.'
            },
            {
              name: 'Radiant Soul',
              description: 'Sprout spectral wings. You gain a flying speed equal to your walking speed. Once per turn, add extra radiant damage equal to your proficiency bonus to one target. Lasts 1 minute.'
            }
          ]
        }
      },
      'Protector Aasimar': {
        3: {
          name: 'Radiant Soul',
          description: 'Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing your eyes to glimmer and two luminous, incorporeal wings to sprout from your back. Your transformation lasts for 1 minute or until you end it as a bonus action. During it, you have a flying speed of 30 feet, and once on each of your turns, you can deal extra radiant damage to one target when you deal damage to it with an attack or a spell. The extra radiant damage equals your level. Once you use this trait, you can\'t use it again until you finish a long rest.'
        }
      },
      'Scourge Aasimar': {
        3: {
          name: 'Radiant Consumption',
          description: 'Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing searing light to radiate from you, pour out of your eyes and mouth, and threaten to char you. Your transformation lasts for 1 minute or until you end it as a bonus action. During it, you shed bright light in a 10-foot radius and dim light for an additional 10 feet, and at the end of each of your turns, you and each creature within 10 feet of you take radiant damage equal to half your level (rounded up). In addition, once on each of your turns, you can deal extra radiant damage to one target when you deal damage to it with an attack or a spell. The extra radiant damage equals your level. Once you use this trait, you can\'t use it again until you finish a long rest.'
        }
      },
      'Fallen Aasimar': {
        3: {
          name: 'Necrotic Shroud',
          description: 'Starting at 3rd level, you can use your action to unleash the divine energy within yourself, causing your eyes to turn into pools of darkness and two skeletal, ghostly, flightless wings to sprout from your back. The instant you transform, other creatures within 10 feet of you that can see you must each succeed on a Charisma saving throw (DC 8 + your proficiency bonus + your Charisma modifier) or become frightened of you until the end of your next turn. Your transformation lasts for 1 minute or until you end it as a bonus action. During it, once on each of your turns, you can deal extra necrotic damage to one target when you deal damage to it with an attack or a spell. The extra necrotic damage equals your level. Once you use this trait, you can\'t use it again until you finish a long rest.'
        }
      },

      // Tiefling (PHB)
      'Tiefling': {
        3: {
          name: 'Infernal Legacy',
          description: 'You can cast the Hellish Rebuke spell as a 2nd-level spell once with this trait. You regain the ability to cast it when you finish a long rest.'
        },
        5: {
          name: 'Infernal Legacy',
          description: 'You can cast the Darkness spell once with this trait. You regain the ability to cast it when you finish a long rest.'
        }
      },

      // Genasi (Elemental Evil Player's Companion)
      'Air Genasi': {
        5: {
          name: 'Levitate',
          description: 'You can cast the Levitate spell once with this trait, requiring no material components. You regain the ability to cast this spell when you finish a long rest. Constitution is your spellcasting ability for this spell.'
        }
      },
      'Earth Genasi': {
        5: {
          name: 'Pass Without Trace',
          description: 'You can cast the Pass Without Trace spell once with this trait, requiring no material components. You regain the ability to cast this spell when you finish a long rest. Constitution is your spellcasting ability for this spell.'
        }
      },
      'Fire Genasi': {
        3: {
          name: 'Burning Hands',
          description: 'You can cast the Burning Hands spell once with this trait as a 1st-level spell. You regain the ability to cast this spell when you finish a long rest. Constitution is your spellcasting ability for this spell.'
        }
      },
      'Water Genasi': {
        5: {
          name: 'Create or Destroy Water',
          description: 'You can cast the Create or Destroy Water spell as a 2nd-level spell once with this trait. You regain the ability to cast this spell when you finish a long rest. Constitution is your spellcasting ability for this spell.'
        }
      },

      // Duergar (Mordenkainen's Tome of Foes)
      'Duergar': {
        3: {
          name: 'Duergar Magic',
          description: 'You can cast the Enlarge/Reduce spell on yourself once with this trait, without requiring a material component. You regain the ability to cast this spell when you finish a long rest. Intelligence is your spellcasting ability for this spell.'
        },
        5: {
          name: 'Duergar Magic',
          description: 'You can cast the Invisibility spell on yourself once with this trait, without requiring a material component. You regain the ability to cast this spell when you finish a long rest. Intelligence is your spellcasting ability for this spell.'
        }
      },

      // Triton (Volo's Guide to Monsters)
      'Triton': {
        3: {
          name: 'Emissary of the Sea',
          description: 'You can cast the Fog Cloud spell once with this trait. You regain the ability to cast this spell when you finish a long rest. Charisma is your spellcasting ability for this spell.'
        },
        5: {
          name: 'Emissary of the Sea',
          description: 'You can cast the Gust of Wind spell once with this trait. You regain the ability to cast this spell when you finish a long rest. Charisma is your spellcasting ability for this spell.'
        }
      },

      // Yuan-ti Pureblood (Volo's Guide to Monsters)
      'Yuan-ti Pureblood': {
        3: {
          name: 'Innate Spellcasting',
          description: 'You can cast the Suggestion spell once with this trait. You regain the ability to cast this spell when you finish a long rest. Charisma is your spellcasting ability for this spell.'
        }
      },

      // Eladrin (Mordenkainen's Tome of Foes)
      'Eladrin': {
        3: {
          name: 'Fey Step Enhancement',
          description: 'Your Fey Step ability gains additional effects based on your season. When you use Fey Step, you can now affect creatures near your origin or destination based on your current season (Autumn: frighten, Winter: frighten, Spring: teleport willing creature, Summer: fire damage).'
        }
      },

      // Githyanki (Mordenkainen's Tome of Foes / Monsters of the Multiverse)
      'Githyanki': {
        3: {
          name: 'Githyanki Psionics',
          description: 'You learn the Jump spell and can cast it at will, without expending a spell slot. You also learn the Misty Step spell, which you can cast once with this trait. You regain the ability to cast Misty Step when you finish a long rest. Intelligence is your spellcasting ability for these spells. When you cast them with this trait, they don\'t require components.'
        },
        5: {
          name: 'Githyanki Psionics',
          description: 'You learn the Nondetection spell and can cast it on yourself at will, without expending a spell slot. Intelligence is your spellcasting ability for this spell. When you cast it with this trait, it doesn\'t require components.'
        }
      },

      // Githzerai (Mordenkainen's Tome of Foes / Monsters of the Multiverse)
      'Githzerai': {
        3: {
          name: 'Githzerai Psionics',
          description: 'You learn the Shield spell and can cast it once with this trait. You regain the ability to cast it when you finish a long rest. Wisdom is your spellcasting ability for this spell. When you cast it with this trait, it doesn\'t require components.'
        },
        5: {
          name: 'Githzerai Psionics',
          description: 'You learn the Detect Thoughts spell and can cast it once with this trait. You regain the ability to cast it when you finish a long rest. Wisdom is your spellcasting ability for this spell. When you cast it with this trait, the spell doesn\'t require components, and the target doesn\'t know you\'re using the spell on it unless you probe deeper into its mind.'
        }
      },

      // Shadar-kai (Mordenkainen's Tome of Foes / Monsters of the Multiverse)
      'Shadar-kai': {
        3: {
          name: 'Blessing of the Raven Queen',
          description: 'As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest. Starting at 3rd level, you also gain resistance to all damage when you teleport using this trait. The resistance lasts until the start of your next turn. During that time, you appear ghostly and translucent.'
        }
      },

      // Bugbear (Volo's Guide / Monsters of the Multiverse)
      'Bugbear': {
        5: {
          name: 'Sneaky',
          description: 'You are proficient in the Stealth skill if you aren\'t already. At 5th level, you can move through the space of any creature that is of a size larger than yours.'
        }
      },

      // Hobgoblin (Volo's Guide / Monsters of the Multiverse)
      'Hobgoblin': {
        3: {
          name: 'Fortune from the Many',
          description: 'When you miss with an attack roll or fail an ability check or a saving throw, you can draw on your bonds of reciprocity to gain a bonus to the roll equal to the number of allies you can see within 30 feet of you (maximum bonus of +3). You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.'
        }
      }

      // Note: Most other races (Dragonborn, Dwarf, Elf, Half-Elf, Halfling, Half-Orc, Human, Gnome, Tabaxi, Kenku, etc.)
      // do not have level-based racial features in official D&D 5e
    },

    // ============================================================
    // SPECIES SCALING FEATURES (Level 1 features that scale)
    // ============================================================

    /**
     * Racial features that exist at level 1 but scale with character level
     * These are shown at character creation as reference tables
     */
    RACIAL_SCALING_FEATURES: {
      'Dragonborn': {
        name: 'Breath Weapon',
        description: 'You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation.',
        scaling: [
          { levels: '1-5', value: '2d6 damage' },
          { levels: '6-10', value: '3d6 damage' },
          { levels: '11-15', value: '4d6 damage' },
          { levels: '16-20', value: '5d6 damage' }
        ],
        note: 'Usable once per short or long rest. Save DC = 8 + CON modifier + proficiency bonus.'
      },
      'Goliath': {
        name: 'Stone\'s Endurance',
        description: 'You can focus yourself to occasionally shrug off injury. When you take damage, you can use your reaction to roll a d12. Add your Constitution modifier to the number rolled, and reduce the damage by that total.',
        scaling: [
          { levels: '1-4', value: 'Usable 2 times per long rest (proficiency bonus +2)' },
          { levels: '5-8', value: 'Usable 3 times per long rest (proficiency bonus +3)' },
          { levels: '9-12', value: 'Usable 4 times per long rest (proficiency bonus +4)' },
          { levels: '13-16', value: 'Usable 5 times per long rest (proficiency bonus +5)' },
          { levels: '17-20', value: 'Usable 6 times per long rest (proficiency bonus +6)' }
        ],
        note: 'Damage reduction = 1d12 + CON modifier.'
      },
      'Shifter': {
        name: 'Shifting',
        description: 'As a bonus action, you can assume a more bestial appearance. This transformation lasts for 1 minute, until you die, or until you revert to your normal appearance as a bonus action.',
        scaling: [
          { levels: '1-2', value: '1 + CON modifier temporary HP' },
          { levels: '3-4', value: '3 + CON modifier temporary HP' },
          { levels: '5-6', value: '5 + CON modifier temporary HP' },
          { levels: '7-8', value: '7 + CON modifier temporary HP' },
          { levels: '9-10', value: '9 + CON modifier temporary HP' },
          { levels: '11-12', value: '11 + CON modifier temporary HP' },
          { levels: '13-14', value: '13 + CON modifier temporary HP' },
          { levels: '15-16', value: '15 + CON modifier temporary HP' },
          { levels: '17-18', value: '17 + CON modifier temporary HP' },
          { levels: '19-20', value: '19 + CON modifier temporary HP' }
        ],
        note: 'Usable once per short or long rest. Temporary HP = level + CON modifier (minimum 1).'
      },
      'Lizardfolk': {
        name: 'Hungry Jaws',
        description: 'In battle, you can throw yourself into a vicious feeding frenzy. As a bonus action, you can make a special attack with your bite. If the attack hits, it deals its normal damage, and you gain temporary hit points equal to your Constitution modifier (minimum of 1).',
        scaling: [
          { levels: '1-4', value: 'Usable 2 times per long rest (proficiency bonus +2)' },
          { levels: '5-8', value: 'Usable 3 times per long rest (proficiency bonus +3)' },
          { levels: '9-12', value: 'Usable 4 times per long rest (proficiency bonus +4)' },
          { levels: '13-16', value: 'Usable 5 times per long rest (proficiency bonus +5)' },
          { levels: '17-20', value: 'Usable 6 times per long rest (proficiency bonus +6)' }
        ],
        note: 'Temporary HP = CON modifier (minimum 1).'
      },
      'Goblin': {
        name: 'Fury of the Small',
        description: 'When you damage a creature with an attack or a spell and the creature\'s size is larger than yours, you can cause the attack or spell to deal extra damage to the creature. The extra damage equals your level.',
        scaling: [
          { levels: '1-4', value: 'Usable 2 times per long rest (proficiency bonus +2)' },
          { levels: '5-8', value: 'Usable 3 times per long rest (proficiency bonus +3)' },
          { levels: '9-12', value: 'Usable 4 times per long rest (proficiency bonus +4)' },
          { levels: '13-16', value: 'Usable 5 times per long rest (proficiency bonus +5)' },
          { levels: '17-20', value: 'Usable 6 times per long rest (proficiency bonus +6)' }
        ],
        note: 'Extra damage equals your character level.'
      },
      'Orc': {
        name: 'Adrenaline Rush',
        description: 'You can take the Dash action as a bonus action. When you do so, you gain temporary hit points equal to your proficiency bonus.',
        scaling: [
          { levels: '1-4', value: '2 temporary HP, usable 2 times per long rest' },
          { levels: '5-8', value: '3 temporary HP, usable 3 times per long rest' },
          { levels: '9-12', value: '4 temporary HP, usable 4 times per long rest' },
          { levels: '13-16', value: '5 temporary HP, usable 5 times per long rest' },
          { levels: '17-20', value: '6 temporary HP, usable 6 times per long rest' }
        ],
        note: 'Temporary HP and uses both equal proficiency bonus.'
      },
      'Kobold': {
        name: 'Draconic Cry',
        description: 'As a bonus action, you let out a cry at your enemies within 10 feet of you. Until the start of your next turn, you and your allies have advantage on attack rolls against any of those enemies who could hear you.',
        scaling: [
          { levels: '1-4', value: 'Usable 2 times per long rest (proficiency bonus +2)' },
          { levels: '5-8', value: 'Usable 3 times per long rest (proficiency bonus +3)' },
          { levels: '9-12', value: 'Usable 4 times per long rest (proficiency bonus +4)' },
          { levels: '13-16', value: 'Usable 5 times per long rest (proficiency bonus +5)' },
          { levels: '17-20', value: 'Usable 6 times per long rest (proficiency bonus +6)' }
        ],
        note: 'Uses equal proficiency bonus.'
      }
    },

    // ============================================================
    // MULTICLASSING SUPPORT
    // ============================================================

    /**
     * Multiclass Spellcaster Table (PHB p.165)
     * Maps effective caster level to spell slots [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
     */
    MULTICLASS_SPELL_SLOTS: {
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

    /**
     * Multiclassing prerequisites (PHB p.163)
     */
    MULTICLASS_PREREQUISITES: {
      'Artificer': { int: 13 },
      'Barbarian': { str: 13 },
      'Bard': { cha: 13 },
      'Cleric': { wis: 13 },
      'Druid': { wis: 13 },
      'Fighter': null, // No prerequisite
      'Monk': { dex: 13, wis: 13 },
      'Paladin': { str: 13, cha: 13 },
      'Ranger': { dex: 13, wis: 13 },
      'Rogue': { dex: 13 },
      'Sorcerer': { cha: 13 },
      'Warlock': { cha: 13 },
      'Wizard': { int: 13 }
    },

    /**
     * Calculate effective caster level for multiclassing
     * @param {Array} classes - Array of {className, level}
     * @returns {number} - Effective caster level for shared spell slots
     */
    calculateEffectiveCasterLevel(classes) {
      let effectiveLevel = 0;

      for (const classEntry of classes) {
        const className = classEntry.className;
        const level = classEntry.level;
        const classData = CLASS_DATA[className];

        if (!classData || !classData.spellcaster) {
          continue; // Not a spellcaster, skip
        }

        // Warlock contributes 0 (Pact Magic is separate)
        if (className === 'Warlock') {
          continue;
        }

        // Full casters contribute all levels
        if (['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'].includes(className)) {
          effectiveLevel += level;
          continue;
        }

        // Half casters (Paladin, Ranger) contribute floor(level/2)
        if (['Paladin', 'Ranger'].includes(className)) {
          effectiveLevel += Math.floor(level / 2);
          continue;
        }

        // Artificer contributes ceil(level/2)
        if (className === 'Artificer') {
          effectiveLevel += Math.ceil(level / 2);
          continue;
        }

        // Third casters (Eldritch Knight, Arcane Trickster)
        // These are subclasses, not base classes, so we need to check subclass
        if (classEntry.subclass === 'Eldritch Knight' || classEntry.subclass === 'Arcane Trickster') {
          effectiveLevel += Math.floor(level / 3);
          continue;
        }
      }

      return effectiveLevel;
    },

    /**
     * Get multiclass spell slots based on effective caster level
     * @param {Array} classes - Array of {className, level, subclass}
     * @returns {Array|null} - Spell slots [1st-9th] or null if no spellcasters
     */
    getMulticlassSpellSlots(classes) {
      const effectiveLevel = this.calculateEffectiveCasterLevel(classes);

      if (effectiveLevel === 0) {
        return null; // No spellcasting classes
      }

      return this.MULTICLASS_SPELL_SLOTS[effectiveLevel] || null;
    },

    /**
     * Get Warlock pact magic slots (separate from shared slots)
     * @param {number} warlockLevel - Warlock class level
     * @returns {Object|null} - {slots: number, level: number}
     */
    getWarlockPactSlots(warlockLevel) {
      if (warlockLevel < 1) return null;

      const warlockData = CLASS_DATA['Warlock'];
      if (!warlockData || !warlockData.pactSlots) return null;

      return warlockData.pactSlots[warlockLevel] || null;
    },

    /**
     * Check if a character meets multiclass prerequisites
     * @param {string} className - Class to multiclass into
     * @param {Object} abilityScores - {str, dex, con, int, wis, cha}
     * @returns {Object} - {meetsRequirements: boolean, missing: Array}
     */
    checkMulticlassPrerequisites(className, abilityScores) {
      const prereqs = this.MULTICLASS_PREREQUISITES[className];

      if (!prereqs) {
        return { meetsRequirements: true, missing: [] };
      }

      const missing = [];
      for (const [ability, requiredScore] of Object.entries(prereqs)) {
        if ((abilityScores[ability] || 0) < requiredScore) {
          missing.push(`${ability.toUpperCase()} ${requiredScore}`);
        }
      }

      return {
        meetsRequirements: missing.length === 0,
        missing
      };
    },

    /**
     * Get maximum spell level a character can cast from a specific class
     * Based on class level, NOT effective caster level
     * @param {string} className - The class name
     * @param {number} classLevel - Level in that specific class
     * @returns {number} - Highest spell level (1-9) or 0
     */
    getMaxSpellLevelByClass(className, classLevel) {
      const classData = CLASS_DATA[className];
      if (!classData || !classData.spellcaster) return 0;

      return this.getMaxSpellLevel(classData, classLevel);
    },

    // ============================================================
    // SUBCLASS SPELLS
    // ============================================================
    /**
     * Bonus cantrips granted by subclasses
     * Format: { 'ClassName': { 'SubclassName': { cantrip: 'SpellName' OR 'choice:SpellList', level: number } } }
     * 'choice:Druid' means player chooses from that class's cantrip list
     */
    SUBCLASS_BONUS_CANTRIPS: {
      'Cleric': {
        'Light Domain': { cantrip: 'Light', level: 1 },
        'Nature Domain': { cantrip: 'choice:Druid', level: 1 }
      },
      'Druid': {
        'Circle of Spores': { cantrip: 'Chill Touch', level: 2 }
      },
      'Warlock': {
        'The Celestial': { cantrips: ['Light', 'Sacred Flame'], level: 1 }
      }
    },

    /**
     * Spells that are always prepared for specific subclasses
     * Format: { 'ClassName': { 'SubclassName': { level: [spell names] } } }
     * These spells are automatically prepared and don't count against spells prepared limit
     */
    SUBCLASS_SPELLS: {
      'Cleric': {
        'Knowledge Domain': {
          1: ['Command', 'Identify'],
          3: ['Augury', 'Suggestion'],
          5: ['Nondetection', 'Speak with Dead'],
          7: ['Arcane Eye', 'Confusion'],
          9: ['Legend Lore', 'Scrying']
        },
        'Life Domain': {
          1: ['Bless', 'Cure Wounds'],
          3: ['Lesser Restoration', 'Spiritual Weapon'],
          5: ['Beacon of Hope', 'Revivify'],
          7: ['Death Ward', 'Guardian of Faith'],
          9: ['Mass Cure Wounds', 'Raise Dead']
        },
        'Light Domain': {
          1: ['Burning Hands', 'Faerie Fire'],
          3: ['Flaming Sphere', 'Scorching Ray'],
          5: ['Daylight', 'Fireball'],
          7: ['Guardian of Faith', 'Wall of Fire'],
          9: ['Flame Strike', 'Scrying']
        },
        'Nature Domain': {
          1: ['Animal Friendship', 'Speak with Animals'],
          3: ['Barkskin', 'Spike Growth'],
          5: ['Plant Growth', 'Wind Wall'],
          7: ['Dominate Beast', 'Grasping Vine'],
          9: ['Insect Plague', 'Tree Stride']
        },
        'Tempest Domain': {
          1: ['Fog Cloud', 'Thunderwave'],
          3: ['Gust of Wind', 'Shatter'],
          5: ['Call Lightning', 'Sleet Storm'],
          7: ['Control Water', 'Ice Storm'],
          9: ['Destructive Wave', 'Insect Plague']
        },
        'Trickery Domain': {
          1: ['Charm Person', 'Disguise Self'],
          3: ['Mirror Image', 'Pass without Trace'],
          5: ['Blink', 'Dispel Magic'],
          7: ['Dimension Door', 'Polymorph'],
          9: ['Dominate Person', 'Modify Memory']
        },
        'War Domain': {
          1: ['Divine Favor', 'Shield of Faith'],
          3: ['Magic Weapon', 'Spiritual Weapon'],
          5: ['Crusader\'s Mantle', 'Spirit Guardians'],
          7: ['Freedom of Movement', 'Stoneskin'],
          9: ['Flame Strike', 'Hold Monster']
        },
        'Forge Domain': {
          1: ['Identify', 'Searing Smite'],
          3: ['Heat Metal', 'Magic Weapon'],
          5: ['Elemental Weapon', 'Protection from Energy'],
          7: ['Fabricate', 'Wall of Fire'],
          9: ['Animate Objects', 'Creation']
        },
        'Grave Domain': {
          1: ['Bane', 'False Life'],
          3: ['Gentle Repose', 'Ray of Enfeeblement'],
          5: ['Revivify', 'Vampiric Touch'],
          7: ['Blight', 'Death Ward'],
          9: ['Antilife Shell', 'Raise Dead']
        },
        'Order Domain': {
          1: ['Command', 'Heroism'],
          3: ['Hold Person', 'Zone of Truth'],
          5: ['Mass Healing Word', 'Slow'],
          7: ['Compulsion', 'Locate Creature'],
          9: ['Commune', 'Dominate Person']
        },
        'Peace Domain': {
          1: ['Heroism', 'Sanctuary'],
          3: ['Aid', 'Warding Bond'],
          5: ['Beacon of Hope', 'Sending'],
          7: ['Aura of Purity', 'Otiluke\'s Resilient Sphere'],
          9: ['Greater Restoration', 'Rary\'s Telepathic Bond']
        },
        'Twilight Domain': {
          1: ['Faerie Fire', 'Sleep'],
          3: ['Moonbeam', 'See Invisibility'],
          5: ['Aura of Vitality', 'Leomund\'s Tiny Hut'],
          7: ['Aura of Life', 'Greater Invisibility'],
          9: ['Circle of Power', 'Mislead']
        }
      },
      'Druid': {
        'Circle of the Land (Arctic)': {
          3: ['Hold Person', 'Spike Growth'],
          5: ['Sleet Storm', 'Slow'],
          7: ['Freedom of Movement', 'Ice Storm'],
          9: ['Commune with Nature', 'Cone of Cold']
        },
        'Circle of the Land (Coast)': {
          3: ['Mirror Image', 'Misty Step'],
          5: ['Water Breathing', 'Water Walk'],
          7: ['Control Water', 'Freedom of Movement'],
          9: ['Conjure Elemental', 'Scrying']
        },
        'Circle of the Land (Desert)': {
          3: ['Blur', 'Silence'],
          5: ['Create Food and Water', 'Protection from Energy'],
          7: ['Blight', 'Hallucinatory Terrain'],
          9: ['Insect Plague', 'Wall of Stone']
        },
        'Circle of the Land (Forest)': {
          3: ['Barkskin', 'Spider Climb'],
          5: ['Call Lightning', 'Plant Growth'],
          7: ['Divination', 'Freedom of Movement'],
          9: ['Commune with Nature', 'Tree Stride']
        },
        'Circle of the Land (Grassland)': {
          3: ['Invisibility', 'Pass without Trace'],
          5: ['Daylight', 'Haste'],
          7: ['Divination', 'Freedom of Movement'],
          9: ['Dream', 'Insect Plague']
        },
        'Circle of the Land (Mountain)': {
          3: ['Spider Climb', 'Spike Growth'],
          5: ['Lightning Bolt', 'Meld into Stone'],
          7: ['Stone Shape', 'Stoneskin'],
          9: ['Passwall', 'Wall of Stone']
        },
        'Circle of the Land (Swamp)': {
          3: ['Darkness', 'Melf\'s Acid Arrow'],
          5: ['Water Walk', 'Stinking Cloud'],
          7: ['Freedom of Movement', 'Locate Creature'],
          9: ['Insect Plague', 'Scrying']
        },
        'Circle of the Land (Underdark)': {
          3: ['Spider Climb', 'Web'],
          5: ['Gaseous Form', 'Stinking Cloud'],
          7: ['Greater Invisibility', 'Stone Shape'],
          9: ['Cloudkill', 'Insect Plague']
        },
        'Circle of Spores': {
          2: ['Chill Touch'],
          3: ['Blindness/Deafness', 'Gentle Repose'],
          5: ['Animate Dead', 'Gaseous Form'],
          7: ['Blight', 'Confusion'],
          9: ['Cloudkill', 'Contagion']
        },
        'Circle of Wildfire': {
          2: ['Burning Hands', 'Cure Wounds'],
          3: ['Flaming Sphere', 'Scorching Ray'],
          5: ['Plant Growth', 'Revivify'],
          7: ['Aura of Life', 'Fire Shield'],
          9: ['Flame Strike', 'Mass Cure Wounds']
        }
      },
      'Paladin': {
        'Oath of Devotion': {
          3: ['Protection from Evil and Good', 'Sanctuary'],
          5: ['Lesser Restoration', 'Zone of Truth'],
          9: ['Beacon of Hope', 'Dispel Magic'],
          13: ['Freedom of Movement', 'Guardian of Faith'],
          17: ['Commune', 'Flame Strike']
        },
        'Oath of the Ancients': {
          3: ['Ensnaring Strike', 'Speak with Animals'],
          5: ['Moonbeam', 'Misty Step'],
          9: ['Plant Growth', 'Protection from Energy'],
          13: ['Ice Storm', 'Stoneskin'],
          17: ['Commune with Nature', 'Tree Stride']
        },
        'Oath of Vengeance': {
          3: ['Bane', 'Hunter\'s Mark'],
          5: ['Hold Person', 'Misty Step'],
          9: ['Haste', 'Protection from Energy'],
          13: ['Banishment', 'Dimension Door'],
          17: ['Hold Monster', 'Scrying']
        },
        'Oath of Conquest': {
          3: ['Armor of Agathys', 'Command'],
          5: ['Hold Person', 'Spiritual Weapon'],
          9: ['Bestow Curse', 'Fear'],
          13: ['Dominate Beast', 'Stoneskin'],
          17: ['Cloudkill', 'Dominate Person']
        },
        'Oath of Redemption': {
          3: ['Sanctuary', 'Sleep'],
          5: ['Calm Emotions', 'Hold Person'],
          9: ['Counterspell', 'Hypnotic Pattern'],
          13: ['Otiluke\'s Resilient Sphere', 'Stoneskin'],
          17: ['Hold Monster', 'Wall of Force']
        },
        'Oath of Glory': {
          3: ['Guiding Bolt', 'Heroism'],
          5: ['Enhance Ability', 'Magic Weapon'],
          9: ['Haste', 'Protection from Energy'],
          13: ['Compulsion', 'Freedom of Movement'],
          17: ['Commune', 'Flame Strike']
        },
        'Oath of the Watchers': {
          3: ['Alarm', 'Detect Magic'],
          5: ['Moonbeam', 'See Invisibility'],
          9: ['Counterspell', 'Nondetection'],
          13: ['Aura of Purity', 'Banishment'],
          17: ['Hold Monster', 'Scrying']
        }
      },
      'Warlock': {
        'The Archfey': {
          1: ['Faerie Fire', 'Sleep'],
          3: ['Calm Emotions', 'Phantasmal Force'],
          5: ['Blink', 'Plant Growth'],
          7: ['Dominate Beast', 'Greater Invisibility'],
          9: ['Dominate Person', 'Seeming']
        },
        'The Fiend': {
          1: ['Burning Hands', 'Command'],
          3: ['Blindness/Deafness', 'Scorching Ray'],
          5: ['Fireball', 'Stinking Cloud'],
          7: ['Fire Shield', 'Wall of Fire'],
          9: ['Flame Strike', 'Hallow']
        },
        'The Great Old One': {
          1: ['Dissonant Whispers', 'Tasha\'s Hideous Laughter'],
          3: ['Detect Thoughts', 'Phantasmal Force'],
          5: ['Clairvoyance', 'Sending'],
          7: ['Dominate Beast', 'Evard\'s Black Tentacles'],
          9: ['Dominate Person', 'Telekinesis']
        },
        'The Celestial': {
          1: ['Cure Wounds', 'Guiding Bolt'],
          3: ['Flaming Sphere', 'Lesser Restoration'],
          5: ['Daylight', 'Revivify'],
          7: ['Guardian of Faith', 'Wall of Fire'],
          9: ['Flame Strike', 'Greater Restoration']
        },
        'The Hexblade': {
          1: ['Shield', 'Wrathful Smite'],
          3: ['Blur', 'Branding Smite'],
          5: ['Blink', 'Elemental Weapon'],
          7: ['Phantasmal Killer', 'Staggering Smite'],
          9: ['Banishing Smite', 'Cone of Cold']
        },
        'The Fathomless': {
          1: ['Create or Destroy Water', 'Thunderwave'],
          3: ['Gust of Wind', 'Silence'],
          5: ['Lightning Bolt', 'Sleet Storm'],
          7: ['Control Water', 'Evard\'s Black Tentacles'],
          9: ['Bigby\'s Hand', 'Cone of Cold']
        }
      }
    },

    // ============================================================
    // SPECIES FEATURE HELPERS
    // ============================================================

    /**
     * Get racial features available at a specific level
     * @param {string} race - Character's race
     * @param {number} level - Character's total level
     * @returns {Object|null} - Racial feature object or null
     */
    getRacialFeature(race, level) {
      if (!race || !level) return null;

      const racialData = this.RACIAL_FEATURES[race];
      if (!racialData) return null;

      return racialData[level] || null;
    },

    /**
     * Get all racial features for a race up to a given level
     * @param {string} race - Character's race
     * @param {number} maxLevel - Maximum level to check
     * @returns {Array} - Array of {level, ...feature} objects
     */
    getAllRacialFeatures(race, maxLevel) {
      if (!race || !maxLevel) return [];

      const racialData = this.RACIAL_FEATURES[race];
      if (!racialData) return [];

      const features = [];
      for (let level = 1; level <= maxLevel; level++) {
        if (racialData[level]) {
          features.push({
            level,
            ...racialData[level]
          });
        }
      }

      return features;
    },

    /**
     * Check if a race has a feature at a specific level
     * @param {string} race - Character's race
     * @param {number} level - Level to check
     * @returns {boolean}
     */
    hasRacialFeatureAtLevel(race, level) {
      return this.getRacialFeature(race, level) !== null;
    },

    /**
     * Get scaling feature reference for a race
     * @param {string} race - Character's race
     * @returns {Object|null} - Scaling feature data or null
     */
    getRacialScalingFeature(race) {
      if (!race) return null;
      return this.RACIAL_SCALING_FEATURES[race] || null;
    },

    /**
     * Get species spells for a species up to a given level
     * @param {string} race - Character's species (base species like "Tiefling")
     * @param {string} subrace - Character's subspecies (optional, like "Asmodeus")
     * @param {number} level - Character's current level
     * @returns {Array} - Array of spell objects { spell, type, note?, level }
     */
    getSpeciesSpells(race, subrace, level) {
      const spells = [];

      // Check subrace first (more specific), then base race
      const racesToCheck = [];
      if (subrace) {
        racesToCheck.push(subrace);
      }
      if (race) {
        racesToCheck.push(race);
      }

      // Track which spells we've added to avoid duplicates
      const addedSpells = new Set();

      for (const raceName of racesToCheck) {
        const racialSpellData = this.RACIAL_SPELLS[raceName];
        if (racialSpellData) {
          for (let lvl = 1; lvl <= level; lvl++) {
            const levelSpells = racialSpellData[lvl];
            if (levelSpells) {
              levelSpells.forEach(spellEntry => {
                if (!addedSpells.has(spellEntry.spell)) {
                  spells.push({
                    ...spellEntry,
                    level: lvl,
                    source: raceName
                  });
                  addedSpells.add(spellEntry.spell);
                }
              });
            }
          }
          // If we found spells for the subrace, don't check base race (subrace overrides)
          if (spells.length > 0 && subrace && raceName === subrace) {
            break;
          }
        }
      }

      return spells;
    },

    /**
     * Get species spells gained at a specific level
     * @param {string} race - Character's species
     * @param {string} subrace - Character's subspecies (optional)
     * @param {number} level - The specific level to check
     * @returns {Array} - Array of spell objects gained at that level
     */
    getSpeciesSpellsAtLevel(race, subrace, level) {
      const spells = [];

      // Check subrace first, then base race
      const racesToCheck = [];
      if (subrace) {
        racesToCheck.push(subrace);
      }
      if (race) {
        racesToCheck.push(race);
      }

      for (const raceName of racesToCheck) {
        const racialSpellData = this.RACIAL_SPELLS[raceName];
        if (racialSpellData && racialSpellData[level]) {
          racialSpellData[level].forEach(spellEntry => {
            spells.push({
              ...spellEntry,
              level: level,
              source: raceName
            });
          });
          // If subrace has spells at this level, don't check base race
          if (spells.length > 0 && subrace && raceName === subrace) {
            break;
          }
        }
      }

      return spells;
    },

    /**
     * Get base racial features for a race (level 1 features)
     * @param {string} race - Character's race
     * @returns {Object|null} - Base racial features data or null
     */
    getBaseRacialFeatures(race) {
      if (!race) return null;
      return this.RACIAL_BASE_FEATURES[race] || null;
    },

    /**
     * Get comprehensive species features for a character including base, subspecies, level-gated, and scaling features
     * @param {string} race - Character's species (e.g., "Elf", "Dwarf")
     * @param {string} subrace - Character's subspecies (e.g., "High Elf", "Hill Dwarf") - optional
     * @param {number} level - Character's current level
     * @returns {Object} - Complete species feature data
     */
    getFullSpeciesFeatures(race, subrace, level) {
      const result = {
        race: race,
        subrace: subrace || null,
        size: 'Medium',
        speed: 30,
        languages: [],
        traits: [],
        levelGatedFeatures: [],
        scalingFeature: null
      };

      if (!race) return result;

      // Get base racial features
      const baseData = this.RACIAL_BASE_FEATURES[race];
      if (baseData) {
        result.size = baseData.size || 'Medium';
        result.speed = baseData.speed || 30;
        result.languages = baseData.languages || [];

        // Add base race traits
        if (baseData.traits) {
          baseData.traits.forEach(trait => {
            result.traits.push({
              ...trait,
              source: race
            });
          });
        }

        // Add subrace traits if applicable
        if (subrace && baseData.subraces && baseData.subraces[subrace]) {
          const subraceData = baseData.subraces[subrace];

          // Override speed if subrace specifies different speed
          if (subraceData.speed) {
            result.speed = subraceData.speed;
          }

          // Add subrace traits
          if (subraceData.traits) {
            subraceData.traits.forEach(trait => {
              result.traits.push({
                ...trait,
                source: subrace
              });
            });
          }

          // Handle Dragonborn ancestry (special case)
          if (subraceData.breathWeapon) {
            result.traits.push({
              name: `Draconic Ancestry: ${subrace}`,
              description: `Breath Weapon: ${subraceData.breathWeapon}. Damage Resistance: ${subraceData.resistance}.`,
              source: subrace
            });
          }

          // Handle subrace notes (e.g., Asmodeus Tiefling)
          if (subraceData.note) {
            result.traits.push({
              name: `${subrace} Bloodline`,
              description: subraceData.note,
              source: subrace
            });
          }
        }
      }

      // Get level-gated features
      // Check both the base race and subrace-specific entries in RACIAL_FEATURES
      const racesToCheck = [race];
      if (subrace) {
        // For races like "Protector Aasimar" or "Duergar" that have their own entries
        racesToCheck.push(subrace);
        racesToCheck.push(`${subrace} ${race}`);
        racesToCheck.push(`${race} (${subrace})`);
      }

      racesToCheck.forEach(raceName => {
        const levelFeatures = this.RACIAL_FEATURES[raceName];
        if (levelFeatures) {
          for (let lvl = 1; lvl <= level; lvl++) {
            if (levelFeatures[lvl]) {
              result.levelGatedFeatures.push({
                level: lvl,
                ...levelFeatures[lvl],
                source: raceName
              });
            }
          }
        }
      });

      // Get scaling feature
      const scalingFeature = this.RACIAL_SCALING_FEATURES[race];
      if (scalingFeature) {
        result.scalingFeature = {
          ...scalingFeature,
          currentValue: this.getScalingFeatureValue(race, level)
        };
      }

      return result;
    },

    /**
     * Get the current value of a scaling racial feature based on level
     * @param {string} race - Character's race
     * @param {number} level - Character's current level
     * @returns {string|null} - Current scaling value or null
     */
    getScalingFeatureValue(race, level) {
      const scalingFeature = this.RACIAL_SCALING_FEATURES[race];
      if (!scalingFeature || !scalingFeature.scaling) return null;

      for (const entry of scalingFeature.scaling) {
        const [min, max] = entry.levels.split('-').map(n => parseInt(n, 10));
        if (level >= min && level <= max) {
          return entry.value;
        }
      }

      return null;
    },

    /**
     * Format species features as markdown text for Features & Feats section
     * @param {string} race - Character's species
     * @param {string} subrace - Character's subspecies (optional)
     * @param {number} level - Character's current level
     * @returns {string} - Formatted markdown string
     */
    formatSpeciesFeaturesAsText(race, subrace, level) {
      const features = this.getFullSpeciesFeatures(race, subrace, level);
      const lines = [];

      // Header
      const speciesName = subrace ? `${subrace} (${race})` : race;
      lines.push(`**${speciesName} Species Features:**`);
      lines.push(`- Size: ${features.size}`);
      lines.push(`- Speed: ${features.speed} ft.`);
      lines.push(`- Languages: ${features.languages.join(', ')}`);
      lines.push('');

      // Base traits
      if (features.traits.length > 0) {
        lines.push('**Traits:**');
        features.traits.forEach(trait => {
          lines.push(`- **${trait.name}:** ${trait.description}`);
        });
      }

      // Level-gated features (only show ones the character has unlocked)
      if (features.levelGatedFeatures.length > 0) {
        lines.push('');
        lines.push('**Level-Unlocked Features:**');
        features.levelGatedFeatures.forEach(feat => {
          lines.push(`- **${feat.name} (Level ${feat.level}):** ${feat.description}`);
        });
      }

      // Scaling feature (if any)
      if (features.scalingFeature) {
        lines.push('');
        lines.push('**Scaling Feature:**');
        lines.push(`- **${features.scalingFeature.name}:** ${features.scalingFeature.description}`);
        if (features.scalingFeature.currentValue) {
          lines.push(`  - Current: ${features.scalingFeature.currentValue}`);
        }
        if (features.scalingFeature.note) {
          lines.push(`  - Note: ${features.scalingFeature.note}`);
        }
      }

      return lines.join('\n');
    },

    /**
     * Get the number of ASI/Feat opportunities a character should have at a given level
     * @param {string} className - The character's class
     * @param {number} level - The character's level
     * @returns {number} - Number of ASI/Feat choices earned up to this level
     */
    getASICount(className, level) {
      const classData = CLASS_DATA[className];
      if (!classData || !classData.features) return 0;

      let count = 0;
      for (let lvl = 1; lvl <= level; lvl++) {
        const features = classData.features[lvl] || [];
        if (features.includes('Ability Score Improvement')) {
          count++;
        }
      }
      return count;
    },

    /**
     * Get all levels at which a class receives ASI/Feat
     * @param {string} className - The character's class
     * @returns {Array<number>} - Array of levels where ASI is granted
     */
    getASILevels(className) {
      const classData = CLASS_DATA[className];
      if (!classData || !classData.features) return [];

      const levels = [];
      for (let lvl = 1; lvl <= 20; lvl++) {
        const features = classData.features[lvl] || [];
        if (features.includes('Ability Score Improvement')) {
          levels.push(lvl);
        }
      }
      return levels;
    },

    // ============================================================
    // PREPARED SPELL HELPERS
    // ============================================================

    /**
     * Calculate maximum prepared spells for a class
     * @param {string} className - The character's class
     * @param {number} level - The character's level
     * @param {number} abilityMod - The spellcasting ability modifier
     * @returns {number} - Maximum number of spells that can be prepared (0 if class doesn't prepare spells)
     */
    getMaxPreparedSpells(className, level, abilityMod) {
      const classData = CLASS_DATA[className];
      if (!classData || !classData.preparesSpells) return 0;

      // Paladin uses half level (rounded down)
      if (className === 'Paladin') {
        const halfLevel = Math.floor(level / 2);
        return Math.max(1, abilityMod + halfLevel);
      }

      // Artificer uses half level (rounded up) - but Artificer not in CLASS_DATA yet
      if (className === 'Artificer') {
        const halfLevel = Math.ceil(level / 2);
        return Math.max(1, abilityMod + halfLevel);
      }

      // Cleric, Druid, Wizard use full level
      return Math.max(1, abilityMod + level);
    },

    /**
     * Check if a class prepares spells or knows spells
     * @param {string} className - The character's class
     * @returns {boolean} - True if class prepares spells
     */
    classPreparesSpells(className) {
      const classData = CLASS_DATA[className];
      return classData && classData.preparesSpells === true;
    },

    // ============================================================
    // SUBCLASS SPELL HELPERS
    // ============================================================

    /**
     * Get subclass spells for a character up to a given level
     * @param {string} className - The character's class
     * @param {string} subclassName - The character's subclass
     * @param {number} level - The character's level
     * @returns {Array<string>} - Array of spell names
     */
    getSubclassSpells(className, subclassName, level) {
      if (!className || !subclassName || !level) return [];

      const classSpells = this.SUBCLASS_SPELLS[className];
      if (!classSpells) return [];

      const subclassSpells = classSpells[subclassName];
      if (!subclassSpells) return [];

      const spells = [];
      for (let lvl = 1; lvl <= level; lvl++) {
        const levelSpells = subclassSpells[lvl];
        if (levelSpells && Array.isArray(levelSpells)) {
          spells.push(...levelSpells);
        }
      }

      return spells;
    },

    /**
     * Get bonus cantrips granted by a subclass
     * @param {string} className - The character's class
     * @param {string} subclassName - The character's subclass
     * @param {number} level - The character's level
     * @param {string} chosenCantrip - For 'choice:X' subclasses, the player's chosen cantrip
     * @returns {Array<string>} - Array of bonus cantrip names
     */
    getSubclassBonusCantrips(className, subclassName, level, chosenCantrip = null) {
      if (!className || !subclassName) return [];

      const classData = this.SUBCLASS_BONUS_CANTRIPS[className];
      if (!classData) return [];

      const subclassData = classData[subclassName];
      if (!subclassData) return [];

      // Check if character has reached the level for this bonus
      if (level < subclassData.level) return [];

      const cantrips = [];

      // Handle multiple cantrips (like Celestial Warlock)
      if (subclassData.cantrips && Array.isArray(subclassData.cantrips)) {
        cantrips.push(...subclassData.cantrips);
      }
      // Handle single cantrip
      else if (subclassData.cantrip) {
        if (subclassData.cantrip.startsWith('choice:')) {
          // This is a player choice - use the provided chosenCantrip
          if (chosenCantrip) {
            cantrips.push(chosenCantrip);
          }
        } else {
          // Fixed cantrip
          cantrips.push(subclassData.cantrip);
        }
      }

      return cantrips;
    },

    /**
     * Get subclass spells organized by level
     * @param {string} className - The character's class
     * @param {string} subclassName - The character's subclass
     * @param {number} maxLevel - Maximum character level to include
     * @returns {Object} - Object with level keys and spell arrays
     */
    getSubclassSpellsByLevel(className, subclassName, maxLevel) {
      if (!className || !subclassName || !maxLevel) return {};

      const classSpells = this.SUBCLASS_SPELLS[className];
      if (!classSpells) return {};

      const subclassSpells = classSpells[subclassName];
      if (!subclassSpells) return {};

      const result = {};
      for (let lvl = 1; lvl <= maxLevel; lvl++) {
        const levelSpells = subclassSpells[lvl];
        if (levelSpells && Array.isArray(levelSpells)) {
          result[lvl] = [...levelSpells];
        }
      }

      return result;
    },

    // ============================================================
    // BACKGROUND HELPERS
    // ============================================================

    /**
     * Get background data by name
     * @param {string} backgroundName - The background name
     * @returns {Object|null} - Background data or null if not found
     */
    getBackgroundData(backgroundName) {
      if (!backgroundName) return null;
      return this.BACKGROUND_DATA[backgroundName] || null;
    },

    /**
     * Get background feature
     * @param {string} backgroundName - The background name
     * @returns {Object|null} - Feature object { name, description } or null
     */
    getBackgroundFeature(backgroundName) {
      const data = this.getBackgroundData(backgroundName);
      return data ? data.feature : null;
    },

    /**
     * Get background equipment as inventory-ready items
     * @param {string} backgroundName - The background name
     * @returns {Array} - Array of inventory items { name, quantity, weight, notes, equipped, attuned }
     */
    getBackgroundEquipment(backgroundName) {
      const data = this.getBackgroundData(backgroundName);
      if (!data || !data.equipment) return [];

      return data.equipment.map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        weight: item.weight || 0,
        notes: item.notes || '',
        equipped: false,
        attuned: false
      }));
    },

    /**
     * Get background proficiencies
     * @param {string} backgroundName - The background name
     * @returns {Object} - Proficiencies { skills: [], tools: [], languages: number }
     */
    getBackgroundProficiencies(backgroundName) {
      const data = this.getBackgroundData(backgroundName);
      if (!data || !data.proficiencies) {
        return { skills: [], tools: [], languages: 0 };
      }
      return data.proficiencies;
    },

    /**
     * Get background starting gold
     * @param {string} backgroundName - The background name
     * @returns {number} - Starting gold amount
     */
    getBackgroundStartingGold(backgroundName) {
      const data = this.getBackgroundData(backgroundName);
      return data ? (data.startingGold || 0) : 0;
    },

    /**
     * Format background feature as text for Features & Feats section
     * @param {string} backgroundName - The background name
     * @returns {string} - Markdown-formatted feature text
     */
    formatBackgroundFeatureAsText(backgroundName) {
      const feature = this.getBackgroundFeature(backgroundName);
      if (!feature) return '';

      const lines = [];
      lines.push(`**${backgroundName} Background Feature:**`);
      lines.push(`**${feature.name}:** ${feature.description}`);
      return lines.join('\n');
    },

    /**
     * Get list of all available backgrounds
     * @returns {Array<string>} - Array of background names
     */
    getAvailableBackgrounds() {
      return Object.keys(this.BACKGROUND_DATA);
    },

    // ============================================================
    // STARTING EQUIPMENT HELPERS
    // ============================================================

    /**
     * Get class starting equipment data
     * @param {string} className - The class name
     * @returns {Object|null} - Equipment data { weapons: [], armor: [], gear: [] } or null
     */
    getClassEquipmentData(className) {
      if (!className) return null;
      return this.DEFAULT_CLASS_EQUIPMENT[className] || null;
    },

    /**
     * Get all starting equipment for a class as inventory-ready items
     * @param {string} className - The class name
     * @returns {Array} - Array of inventory items { name, quantity, weight, notes, equipped, attuned }
     */
    getStartingEquipment(className) {
      const data = this.getClassEquipmentData(className);
      if (!data) return [];

      const items = [];

      // Add weapons
      if (data.weapons) {
        data.weapons.forEach(item => {
          items.push({
            name: item.name,
            quantity: item.quantity || 1,
            weight: item.weight || 0,
            notes: item.notes || '',
            equipped: item.equipped || false,
            attuned: false
          });
        });
      }

      // Add armor
      if (data.armor) {
        data.armor.forEach(item => {
          items.push({
            name: item.name,
            quantity: item.quantity || 1,
            weight: item.weight || 0,
            notes: item.notes || '',
            equipped: item.equipped || false,
            attuned: false
          });
        });
      }

      // Add gear
      if (data.gear) {
        data.gear.forEach(item => {
          items.push({
            name: item.name,
            quantity: item.quantity || 1,
            weight: item.weight || 0,
            notes: item.notes || '',
            equipped: false,
            attuned: false
          });
        });
      }

      return items;
    },

    /**
     * Get combined starting equipment from class and background
     * @param {string} className - The class name
     * @param {string} backgroundName - The background name
     * @returns {Array} - Combined array of inventory items
     */
    getAllStartingEquipment(className, backgroundName) {
      const classEquipment = this.getStartingEquipment(className);
      const backgroundEquipment = this.getBackgroundEquipment(backgroundName);

      // Combine both, class equipment first
      return [...classEquipment, ...backgroundEquipment];
    },

    /**
     * Get equipment choices for a class (PHB style selection)
     * @param {string} className - The class name
     * @returns {Object|null} - Object with choices array and fixed items, or null if not found
     */
    getClassEquipmentChoices(className) {
      return this.CLASS_EQUIPMENT_CHOICES[className] || null;
    },

    /**
     * Get starting gold data for a class
     * @param {string} className - The class name
     * @returns {Object} - Object with dice, multiplier, and average
     */
    getClassStartingGold(className) {
      return this.CLASS_STARTING_GOLD[className] || { dice: '3d4', multiplier: 10, average: 75 };
    },

    /**
     * Get a filtered list of weapons based on type
     * @param {string} weaponType - Type like 'any_simple', 'any_martial_melee', etc.
     * @returns {Array} - Array of weapon objects
     */
    getWeaponList(weaponType) {
      switch(weaponType) {
        case 'any_simple':
          return [...this.SIMPLE_WEAPONS];
        case 'any_simple_melee':
          return this.SIMPLE_WEAPONS.filter(w => !w.ranged);
        case 'any_simple_ranged':
          return this.SIMPLE_WEAPONS.filter(w => w.ranged);
        case 'any_martial':
          return [...this.MARTIAL_WEAPONS];
        case 'any_martial_melee':
          return this.MARTIAL_WEAPONS.filter(w => !w.ranged);
        case 'any_martial_ranged':
          return this.MARTIAL_WEAPONS.filter(w => w.ranged);
        case 'any_two_martial':
        case 'any_martial_and_shield':
          return this.MARTIAL_WEAPONS.filter(w => !w.ranged);
        case 'any_two_simple':
        case 'any_two_simple_melee':
          return this.SIMPLE_WEAPONS.filter(w => !w.ranged);
        default:
          return [...this.SIMPLE_WEAPONS, ...this.MARTIAL_WEAPONS];
      }
    },

    /**
     * Get a weapon by name from the weapon lists
     * @param {string} name - Weapon name
     * @returns {Object|null} - Weapon object or null if not found
     */
    getWeaponByName(name) {
      return this.SIMPLE_WEAPONS.find(w => w.name === name) ||
             this.MARTIAL_WEAPONS.find(w => w.name === name) ||
             null;
    },

    /**
     * Get the gold cost of an item by name
     * @param {string} name - Item name
     * @returns {number} - Gold piece cost (0 if not found)
     */
    getItemCost(name) {
      return this.EQUIPMENT_COSTS[name] || 0;
    },

    /**
     * Calculate the total gold value of a choice option
     * @param {Object} option - Equipment option with items array or string
     * @returns {number} - Total gold piece value
     */
    getChoiceGoldValue(option) {
      if (!option) return 0;

      // If it's a weapon selection type (string), estimate based on average weapon cost
      if (typeof option.items === 'string') {
        const weaponType = option.items;
        if (weaponType.includes('martial')) {
          // Average martial weapon is about 15-25 gp
          if (weaponType.includes('two') || weaponType.includes('shield')) {
            return 25; // Two weapons or weapon + shield
          }
          return 15;
        }
        // Simple weapon average
        return 5;
      }

      // Sum up costs of all items in the option
      if (Array.isArray(option.items)) {
        return option.items.reduce((total, item) => {
          const costPerItem = this.getItemCost(item.name);
          const quantity = item.quantity || 1;
          return total + (costPerItem * quantity);
        }, 0);
      }

      return 0;
    },

    // ============================================================
    // WILD SHAPE BEAST FORMS DATA
    // ============================================================

    /**
     * Beast forms available for Wild Shape
     * Organized by Challenge Rating (CR)
     * Druids unlock forms based on level:
     * - Level 2: CR 1/4, no flying/swimming
     * - Level 4: CR 1/2, no flying
     * - Level 8: CR 1
     * Moon Druids get better forms earlier (handled in helper functions)
     */
    BEAST_FORMS: {
      // CR 0 Beasts
      'CR0': [
        {
          name: 'Cat',
          cr: '0',
          ac: 12,
          hp: 2,
          speed: '40 ft., climb 30 ft.',
          str: 3, dex: 15, con: 10, int: 3, wis: 12, cha: 7,
          skills: 'Perception +3, Stealth +4',
          senses: 'Darkvision 30 ft.',
          attacks: 'Claws: +0, 1 slashing',
          traits: 'Keen Smell (advantage on Perception using smell)'
        },
        {
          name: 'Rat',
          cr: '0',
          ac: 10,
          hp: 1,
          speed: '20 ft.',
          str: 2, dex: 11, con: 9, int: 2, wis: 10, cha: 4,
          skills: '',
          senses: 'Darkvision 30 ft.',
          attacks: 'Bite: +0, 1 piercing',
          traits: 'Keen Smell (advantage on Perception using smell)'
        },
        {
          name: 'Spider',
          cr: '0',
          ac: 12,
          hp: 1,
          speed: '20 ft., climb 20 ft.',
          str: 2, dex: 14, con: 8, int: 1, wis: 10, cha: 2,
          skills: 'Stealth +4',
          senses: 'Darkvision 30 ft.',
          attacks: 'Bite: +4, 1 piercing + DC 9 CON or 1d4 poison',
          traits: 'Spider Climb, Web Sense, Web Walker'
        },
        {
          name: 'Frog',
          cr: '0',
          ac: 11,
          hp: 1,
          speed: '20 ft., swim 20 ft.',
          str: 1, dex: 13, con: 8, int: 1, wis: 8, cha: 3,
          skills: 'Perception +1, Stealth +3',
          senses: 'Darkvision 30 ft.',
          attacks: 'None',
          traits: 'Amphibious, Standing Leap (10 ft. long, 5 ft. high)',
          hasSwimSpeed: true
        },
        {
          name: 'Hawk',
          cr: '0',
          ac: 13,
          hp: 1,
          speed: '10 ft., fly 60 ft.',
          str: 5, dex: 16, con: 8, int: 2, wis: 14, cha: 6,
          skills: 'Perception +4',
          senses: '',
          attacks: 'Talons: +5, 1 slashing',
          traits: 'Keen Sight (advantage on Perception using sight)',
          hasFlySpeed: true
        },
        {
          name: 'Owl',
          cr: '0',
          ac: 11,
          hp: 1,
          speed: '5 ft., fly 60 ft.',
          str: 3, dex: 13, con: 8, int: 2, wis: 12, cha: 7,
          skills: 'Perception +3, Stealth +3',
          senses: 'Darkvision 120 ft.',
          attacks: 'Talons: +3, 1 slashing',
          traits: 'Flyby (no opportunity attacks when flying), Keen Hearing/Sight',
          hasFlySpeed: true
        },
        {
          name: 'Raven',
          cr: '0',
          ac: 12,
          hp: 1,
          speed: '10 ft., fly 50 ft.',
          str: 2, dex: 14, con: 8, int: 2, wis: 12, cha: 6,
          skills: 'Perception +3',
          senses: '',
          attacks: 'Beak: +4, 1 piercing',
          traits: 'Mimicry (can mimic simple sounds)',
          hasFlySpeed: true
        }
      ],

      // CR 1/8 Beasts
      'CR1/8': [
        {
          name: 'Blood Hawk',
          cr: '1/8',
          ac: 12,
          hp: 7,
          speed: '10 ft., fly 60 ft.',
          str: 6, dex: 14, con: 10, int: 3, wis: 14, cha: 5,
          skills: 'Perception +4',
          senses: '',
          attacks: 'Beak: +4, 1d4 piercing',
          traits: 'Keen Sight, Pack Tactics',
          hasFlySpeed: true
        },
        {
          name: 'Flying Snake',
          cr: '1/8',
          ac: 14,
          hp: 5,
          speed: '30 ft., fly 60 ft., swim 30 ft.',
          str: 4, dex: 18, con: 11, int: 2, wis: 12, cha: 5,
          skills: '',
          senses: 'Blindsight 10 ft.',
          attacks: 'Bite: +6, 1 piercing + 3d4 poison',
          traits: 'Flyby',
          hasFlySpeed: true,
          hasSwimSpeed: true
        },
        {
          name: 'Giant Rat',
          cr: '1/8',
          ac: 12,
          hp: 7,
          speed: '30 ft.',
          str: 7, dex: 15, con: 11, int: 2, wis: 10, cha: 4,
          skills: '',
          senses: 'Darkvision 60 ft.',
          attacks: 'Bite: +4, 1d4 piercing',
          traits: 'Keen Smell, Pack Tactics'
        },
        {
          name: 'Giant Weasel',
          cr: '1/8',
          ac: 13,
          hp: 9,
          speed: '40 ft.',
          str: 11, dex: 16, con: 10, int: 4, wis: 12, cha: 5,
          skills: 'Perception +3, Stealth +5',
          senses: 'Darkvision 60 ft.',
          attacks: 'Bite: +5, 1d4+3 piercing',
          traits: 'Keen Hearing/Smell'
        },
        {
          name: 'Mastiff',
          cr: '1/8',
          ac: 12,
          hp: 5,
          speed: '40 ft.',
          str: 13, dex: 14, con: 12, int: 3, wis: 12, cha: 7,
          skills: 'Perception +3',
          senses: '',
          attacks: 'Bite: +3, 1d6+1 piercing, DC 11 STR or prone',
          traits: 'Keen Hearing/Smell'
        },
        {
          name: 'Poisonous Snake',
          cr: '1/8',
          ac: 13,
          hp: 2,
          speed: '30 ft., swim 30 ft.',
          str: 2, dex: 16, con: 11, int: 1, wis: 10, cha: 3,
          skills: '',
          senses: 'Blindsight 10 ft.',
          attacks: 'Bite: +5, 1 piercing + DC 10 CON 2d4 poison (half on save)',
          traits: '',
          hasSwimSpeed: true
        },
        {
          name: 'Stirge',
          cr: '1/8',
          ac: 14,
          hp: 2,
          speed: '10 ft., fly 40 ft.',
          str: 4, dex: 16, con: 11, int: 2, wis: 8, cha: 6,
          skills: '',
          senses: 'Darkvision 60 ft.',
          attacks: 'Blood Drain: +5, 1d4+3 piercing + attaches, drains 1d4+3 HP/turn',
          traits: '',
          hasFlySpeed: true
        }
      ],

      // CR 1/4 Beasts
      'CR1/4': [
        {
          name: 'Boar',
          cr: '1/4',
          ac: 11,
          hp: 11,
          speed: '40 ft.',
          str: 13, dex: 11, con: 12, int: 2, wis: 9, cha: 5,
          skills: '',
          senses: '',
          attacks: 'Tusk: +3, 1d6+1 slashing',
          traits: 'Charge (+1d6 if moves 20 ft., DC 11 STR or prone), Relentless (1/short rest: drop to 1 HP instead of 0)'
        },
        {
          name: 'Constrictor Snake',
          cr: '1/4',
          ac: 12,
          hp: 13,
          speed: '30 ft., swim 30 ft.',
          str: 15, dex: 14, con: 12, int: 1, wis: 10, cha: 3,
          skills: '',
          senses: 'Blindsight 10 ft.',
          attacks: 'Bite: +4, 1d6+2 piercing; Constrict: +4, 1d8+2 bludgeoning + grappled (DC 14)',
          traits: '',
          hasSwimSpeed: true
        },
        {
          name: 'Draft Horse',
          cr: '1/4',
          ac: 10,
          hp: 19,
          speed: '40 ft.',
          str: 18, dex: 10, con: 12, int: 2, wis: 11, cha: 7,
          skills: '',
          senses: '',
          attacks: 'Hooves: +6, 2d4+4 bludgeoning',
          traits: ''
        },
        {
          name: 'Elk',
          cr: '1/4',
          ac: 10,
          hp: 13,
          speed: '50 ft.',
          str: 16, dex: 10, con: 12, int: 2, wis: 10, cha: 6,
          skills: '',
          senses: '',
          attacks: 'Ram: +5, 1d6+3 bludgeoning; Hooves: +5, 2d4+3 bludgeoning (prone only)',
          traits: 'Charge (+1d6 if moves 20 ft., DC 13 STR or prone)'
        },
        {
          name: 'Giant Badger',
          cr: '1/4',
          ac: 10,
          hp: 13,
          speed: '30 ft., burrow 10 ft.',
          str: 13, dex: 10, con: 15, int: 2, wis: 12, cha: 5,
          skills: '',
          senses: 'Darkvision 30 ft.',
          attacks: 'Multiattack (bite + claws); Bite: +3, 1d6+1 piercing; Claws: +3, 2d4+1 slashing',
          traits: 'Keen Smell'
        },
        {
          name: 'Giant Centipede',
          cr: '1/4',
          ac: 13,
          hp: 4,
          speed: '30 ft., climb 30 ft.',
          str: 5, dex: 14, con: 12, int: 1, wis: 7, cha: 3,
          skills: '',
          senses: 'Blindsight 30 ft.',
          attacks: 'Bite: +4, 1d4+2 piercing + DC 11 CON 3d6 poison (half on save)',
          traits: ''
        },
        {
          name: 'Giant Frog',
          cr: '1/4',
          ac: 11,
          hp: 18,
          speed: '30 ft., swim 30 ft.',
          str: 12, dex: 13, con: 11, int: 2, wis: 10, cha: 3,
          skills: 'Perception +2, Stealth +3',
          senses: 'Darkvision 30 ft.',
          attacks: 'Bite: +3, 1d6+1 bludgeoning + grappled + restrained, can swallow Small or smaller',
          traits: 'Amphibious, Standing Leap (20 ft. long, 10 ft. high)',
          hasSwimSpeed: true
        },
        {
          name: 'Giant Lizard',
          cr: '1/4',
          ac: 12,
          hp: 19,
          speed: '30 ft., climb 30 ft.',
          str: 15, dex: 12, con: 13, int: 2, wis: 10, cha: 5,
          skills: '',
          senses: 'Darkvision 30 ft.',
          attacks: 'Bite: +4, 1d8+2 piercing',
          traits: ''
        },
        {
          name: 'Giant Owl',
          cr: '1/4',
          ac: 12,
          hp: 19,
          speed: '5 ft., fly 60 ft.',
          str: 13, dex: 15, con: 12, int: 8, wis: 13, cha: 10,
          skills: 'Perception +5, Stealth +4',
          senses: 'Darkvision 120 ft.',
          attacks: 'Talons: +3, 2d6+1 slashing',
          traits: 'Flyby, Keen Hearing/Sight',
          hasFlySpeed: true
        },
        {
          name: 'Giant Poisonous Snake',
          cr: '1/4',
          ac: 14,
          hp: 11,
          speed: '30 ft., swim 30 ft.',
          str: 10, dex: 18, con: 13, int: 2, wis: 10, cha: 3,
          skills: '',
          senses: 'Blindsight 10 ft.',
          attacks: 'Bite: +6, 1d4+4 piercing + DC 11 CON 3d6 poison (half on save)',
          traits: '',
          hasSwimSpeed: true
        },
        {
          name: 'Giant Wolf Spider',
          cr: '1/4',
          ac: 13,
          hp: 11,
          speed: '40 ft., climb 40 ft.',
          str: 12, dex: 16, con: 13, int: 3, wis: 12, cha: 4,
          skills: 'Perception +3, Stealth +7',
          senses: 'Blindsight 10 ft., Darkvision 60 ft.',
          attacks: 'Bite: +3, 1d6+1 piercing + DC 11 CON 2d6 poison (half on save), paralyzed 1 hour if reduced to 0',
          traits: 'Spider Climb, Web Sense, Web Walker'
        },
        {
          name: 'Panther',
          cr: '1/4',
          ac: 12,
          hp: 13,
          speed: '50 ft., climb 40 ft.',
          str: 14, dex: 15, con: 10, int: 3, wis: 14, cha: 7,
          skills: 'Perception +4, Stealth +6',
          senses: '',
          attacks: 'Bite: +4, 1d6+2 piercing; Claw: +4, 1d4+2 slashing',
          traits: 'Keen Smell, Pounce (if moves 20 ft. + bite, DC 12 STR or prone + bonus claw)'
        },
        {
          name: 'Riding Horse',
          cr: '1/4',
          ac: 10,
          hp: 13,
          speed: '60 ft.',
          str: 16, dex: 10, con: 12, int: 2, wis: 11, cha: 7,
          skills: '',
          senses: '',
          attacks: 'Hooves: +5, 2d4+3 bludgeoning',
          traits: ''
        },
        {
          name: 'Wolf',
          cr: '1/4',
          ac: 13,
          hp: 11,
          speed: '40 ft.',
          str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6,
          skills: 'Perception +3, Stealth +4',
          senses: '',
          attacks: 'Bite: +4, 2d4+2 piercing, DC 11 STR or prone',
          traits: 'Keen Hearing/Smell, Pack Tactics'
        }
      ],

      // CR 1/2 Beasts
      'CR1/2': [
        {
          name: 'Ape',
          cr: '1/2',
          ac: 12,
          hp: 19,
          speed: '30 ft., climb 30 ft.',
          str: 16, dex: 14, con: 14, int: 6, wis: 12, cha: 7,
          skills: 'Athletics +5, Perception +3',
          senses: '',
          attacks: 'Multiattack (2 fists); Fist: +5, 1d6+3 bludgeoning; Rock: +5, 1d6+3 bludgeoning (25/50 ft.)',
          traits: ''
        },
        {
          name: 'Black Bear',
          cr: '1/2',
          ac: 11,
          hp: 19,
          speed: '40 ft., climb 30 ft.',
          str: 15, dex: 10, con: 14, int: 2, wis: 12, cha: 7,
          skills: 'Perception +3',
          senses: '',
          attacks: 'Multiattack (bite + claws); Bite: +4, 1d6+2 piercing; Claws: +4, 2d4+2 slashing',
          traits: 'Keen Smell'
        },
        {
          name: 'Crocodile',
          cr: '1/2',
          ac: 12,
          hp: 19,
          speed: '20 ft., swim 30 ft.',
          str: 15, dex: 10, con: 13, int: 2, wis: 10, cha: 5,
          skills: 'Stealth +2',
          senses: '',
          attacks: 'Bite: +4, 1d10+2 piercing + grappled (DC 12)',
          traits: 'Hold Breath (15 min)',
          hasSwimSpeed: true
        },
        {
          name: 'Giant Goat',
          cr: '1/2',
          ac: 11,
          hp: 19,
          speed: '40 ft.',
          str: 17, dex: 11, con: 12, int: 3, wis: 12, cha: 6,
          skills: '',
          senses: '',
          attacks: 'Ram: +5, 2d4+3 bludgeoning',
          traits: 'Charge (+2d4 if moves 20 ft., DC 13 STR or prone), Sure-Footed (advantage vs prone)'
        },
        {
          name: 'Giant Sea Horse',
          cr: '1/2',
          ac: 13,
          hp: 16,
          speed: '0 ft., swim 40 ft.',
          str: 12, dex: 15, con: 11, int: 2, wis: 12, cha: 5,
          skills: '',
          senses: '',
          attacks: 'Ram: +3, 1d6+1 bludgeoning',
          traits: 'Charge (+1d6 if moves 20 ft., DC 11 STR or prone), Water Breathing',
          hasSwimSpeed: true
        },
        {
          name: 'Giant Wasp',
          cr: '1/2',
          ac: 12,
          hp: 13,
          speed: '10 ft., fly 50 ft.',
          str: 10, dex: 14, con: 10, int: 1, wis: 10, cha: 3,
          skills: '',
          senses: '',
          attacks: 'Sting: +4, 1d6+2 piercing + DC 11 CON 3d6 poison (half on save)',
          traits: '',
          hasFlySpeed: true
        },
        {
          name: 'Reef Shark',
          cr: '1/2',
          ac: 12,
          hp: 22,
          speed: '0 ft., swim 40 ft.',
          str: 14, dex: 13, con: 13, int: 1, wis: 10, cha: 4,
          skills: 'Perception +2',
          senses: 'Blindsight 30 ft.',
          attacks: 'Bite: +4, 1d8+2 piercing',
          traits: 'Pack Tactics, Water Breathing',
          hasSwimSpeed: true
        },
        {
          name: 'Warhorse',
          cr: '1/2',
          ac: 11,
          hp: 19,
          speed: '60 ft.',
          str: 18, dex: 12, con: 13, int: 2, wis: 12, cha: 7,
          skills: '',
          senses: '',
          attacks: 'Hooves: +6, 2d6+4 bludgeoning',
          traits: 'Trampling Charge (if moves 20 ft. + hooves, DC 14 STR or prone + bonus hooves)'
        }
      ],

      // CR 1 Beasts
      'CR1': [
        {
          name: 'Brown Bear',
          cr: '1',
          ac: 11,
          hp: 34,
          speed: '40 ft., climb 30 ft.',
          str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7,
          skills: 'Perception +3',
          senses: '',
          attacks: 'Multiattack (bite + claws); Bite: +6, 1d8+4 piercing; Claws: +6, 2d6+4 slashing',
          traits: 'Keen Smell'
        },
        {
          name: 'Dire Wolf',
          cr: '1',
          ac: 14,
          hp: 37,
          speed: '50 ft.',
          str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7,
          skills: 'Perception +3, Stealth +4',
          senses: '',
          attacks: 'Bite: +5, 2d6+3 piercing, DC 13 STR or prone',
          traits: 'Keen Hearing/Smell, Pack Tactics'
        },
        {
          name: 'Giant Eagle',
          cr: '1',
          ac: 13,
          hp: 26,
          speed: '10 ft., fly 80 ft.',
          str: 16, dex: 17, con: 13, int: 8, wis: 14, cha: 10,
          skills: 'Perception +4',
          senses: '',
          attacks: 'Multiattack (beak + talons); Beak: +5, 1d6+3 piercing; Talons: +5, 2d6+3 slashing',
          traits: 'Keen Sight',
          hasFlySpeed: true
        },
        {
          name: 'Giant Hyena',
          cr: '1',
          ac: 12,
          hp: 45,
          speed: '50 ft.',
          str: 16, dex: 14, con: 14, int: 2, wis: 12, cha: 7,
          skills: 'Perception +3',
          senses: '',
          attacks: 'Bite: +5, 2d6+3 piercing',
          traits: 'Rampage (when reduces creature to 0 HP, bonus action move + bite)'
        },
        {
          name: 'Giant Octopus',
          cr: '1',
          ac: 11,
          hp: 52,
          speed: '10 ft., swim 60 ft.',
          str: 17, dex: 13, con: 13, int: 4, wis: 10, cha: 4,
          skills: 'Perception +4, Stealth +5',
          senses: 'Darkvision 60 ft.',
          attacks: 'Tentacles: +5, 2d6+3 bludgeoning + grappled (DC 16), restrained until grapple ends',
          traits: 'Hold Breath (1 hour), Underwater Camouflage, Water Breathing, Ink Cloud (1/short rest)',
          hasSwimSpeed: true
        },
        {
          name: 'Giant Spider',
          cr: '1',
          ac: 14,
          hp: 26,
          speed: '30 ft., climb 30 ft.',
          str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4,
          skills: 'Stealth +7',
          senses: 'Blindsight 10 ft., Darkvision 60 ft.',
          attacks: 'Bite: +5, 1d8+3 piercing + DC 11 CON 2d8 poison (half on save); Web (recharge 5-6): +5, restrained (DC 12 STR)',
          traits: 'Spider Climb, Web Sense, Web Walker'
        },
        {
          name: 'Giant Toad',
          cr: '1',
          ac: 11,
          hp: 39,
          speed: '20 ft., swim 40 ft.',
          str: 15, dex: 13, con: 13, int: 2, wis: 10, cha: 3,
          skills: '',
          senses: 'Darkvision 30 ft.',
          attacks: 'Bite: +4, 1d10+2 bludgeoning + 1d10 poison + grappled + restrained, swallow on hit vs grappled',
          traits: 'Amphibious, Standing Leap (20 ft. long, 10 ft. high)',
          hasSwimSpeed: true
        },
        {
          name: 'Giant Vulture',
          cr: '1',
          ac: 10,
          hp: 22,
          speed: '10 ft., fly 60 ft.',
          str: 15, dex: 10, con: 15, int: 6, wis: 12, cha: 7,
          skills: 'Perception +3',
          senses: '',
          attacks: 'Multiattack (beak + talons); Beak: +4, 2d4+2 piercing; Talons: +4, 2d6+2 slashing',
          traits: 'Keen Sight/Smell, Pack Tactics',
          hasFlySpeed: true
        },
        {
          name: 'Lion',
          cr: '1',
          ac: 12,
          hp: 26,
          speed: '50 ft.',
          str: 17, dex: 15, con: 13, int: 3, wis: 12, cha: 8,
          skills: 'Perception +3, Stealth +6',
          senses: '',
          attacks: 'Bite: +5, 1d8+3 piercing; Claw: +5, 1d6+3 slashing',
          traits: 'Keen Smell, Pack Tactics, Pounce (if moves 20 ft. + claw, DC 13 STR or prone + bonus bite), Running Leap (25 ft. long with 10 ft. running start)'
        },
        {
          name: 'Tiger',
          cr: '1',
          ac: 12,
          hp: 37,
          speed: '40 ft.',
          str: 17, dex: 15, con: 14, int: 3, wis: 12, cha: 8,
          skills: 'Perception +3, Stealth +6',
          senses: 'Darkvision 60 ft.',
          attacks: 'Bite: +5, 1d10+3 piercing; Claw: +5, 1d8+3 slashing',
          traits: 'Keen Smell, Pounce (if moves 20 ft. + claw, DC 13 STR or prone + bonus bite)'
        }
      ],

      // CR 2 Beasts (Moon Druid level 2+)
      'CR2': [
        {
          name: 'Giant Boar',
          cr: '2',
          ac: 12,
          hp: 42,
          speed: '40 ft.',
          str: 17, dex: 10, con: 16, int: 2, wis: 9, cha: 5,
          skills: '',
          senses: '',
          attacks: 'Tusk: +5, 2d6+3 slashing',
          traits: 'Charge (+2d6 if moves 20 ft., DC 13 STR or prone), Relentless (1/short rest: drop to 1 HP instead of 0)'
        },
        {
          name: 'Giant Constrictor Snake',
          cr: '2',
          ac: 12,
          hp: 60,
          speed: '30 ft., swim 30 ft.',
          str: 19, dex: 14, con: 12, int: 1, wis: 10, cha: 3,
          skills: 'Perception +2',
          senses: 'Blindsight 10 ft.',
          attacks: 'Bite: +6, 2d6+4 piercing; Constrict: +6, 2d8+4 bludgeoning + grappled (DC 16) + restrained',
          traits: '',
          hasSwimSpeed: true
        },
        {
          name: 'Giant Elk',
          cr: '2',
          ac: 14,
          hp: 42,
          speed: '60 ft.',
          str: 19, dex: 16, con: 14, int: 7, wis: 14, cha: 10,
          skills: 'Perception +4',
          senses: '',
          attacks: 'Ram: +6, 2d6+4 bludgeoning; Hooves: +6, 4d8+4 bludgeoning (prone only)',
          traits: 'Charge (+2d6 if moves 20 ft., DC 14 STR or prone)'
        },
        {
          name: 'Hunter Shark',
          cr: '2',
          ac: 12,
          hp: 45,
          speed: '0 ft., swim 40 ft.',
          str: 18, dex: 13, con: 15, int: 1, wis: 10, cha: 4,
          skills: 'Perception +2',
          senses: 'Blindsight 30 ft.',
          attacks: 'Bite: +6, 2d8+4 piercing',
          traits: 'Blood Frenzy (advantage on bloodied creatures), Water Breathing',
          hasSwimSpeed: true
        },
        {
          name: 'Plesiosaurus',
          cr: '2',
          ac: 13,
          hp: 68,
          speed: '20 ft., swim 40 ft.',
          str: 18, dex: 15, con: 16, int: 2, wis: 12, cha: 5,
          skills: 'Perception +3, Stealth +4',
          senses: '',
          attacks: 'Bite: +6, 3d6+4 piercing',
          traits: 'Hold Breath (1 hour)',
          hasSwimSpeed: true
        },
        {
          name: 'Polar Bear',
          cr: '2',
          ac: 12,
          hp: 42,
          speed: '40 ft., swim 30 ft.',
          str: 20, dex: 10, con: 16, int: 2, wis: 13, cha: 7,
          skills: 'Perception +3',
          senses: '',
          attacks: 'Multiattack (bite + claws); Bite: +7, 1d8+5 piercing; Claws: +7, 2d6+5 slashing',
          traits: 'Keen Smell',
          hasSwimSpeed: true
        },
        {
          name: 'Rhinoceros',
          cr: '2',
          ac: 11,
          hp: 45,
          speed: '40 ft.',
          str: 21, dex: 8, con: 15, int: 2, wis: 12, cha: 6,
          skills: '',
          senses: '',
          attacks: 'Gore: +7, 2d8+5 bludgeoning',
          traits: 'Charge (+2d8 if moves 20 ft., DC 15 STR or prone)'
        },
        {
          name: 'Saber-Toothed Tiger',
          cr: '2',
          ac: 12,
          hp: 52,
          speed: '40 ft.',
          str: 18, dex: 14, con: 15, int: 3, wis: 12, cha: 8,
          skills: 'Perception +3, Stealth +6',
          senses: '',
          attacks: 'Bite: +6, 1d10+4 piercing; Claw: +6, 2d6+4 slashing',
          traits: 'Keen Smell, Pounce (if moves 20 ft. + claw, DC 14 STR or prone + bonus bite)'
        }
      ],

      // CR 3 Beasts (Moon Druid level 9+)
      'CR3': [
        {
          name: 'Giant Scorpion',
          cr: '3',
          ac: 15,
          hp: 52,
          speed: '40 ft.',
          str: 15, dex: 13, con: 15, int: 1, wis: 9, cha: 3,
          skills: '',
          senses: 'Blindsight 60 ft.',
          attacks: 'Multiattack (2 claws + sting); Claw: +4, 1d8+2 bludgeoning + grappled (DC 12); Sting: +4, 1d10+2 piercing + DC 12 CON 4d10 poison (half on save)',
          traits: ''
        },
        {
          name: 'Killer Whale',
          cr: '3',
          ac: 12,
          hp: 90,
          speed: '0 ft., swim 60 ft.',
          str: 19, dex: 10, con: 13, int: 3, wis: 12, cha: 7,
          skills: 'Perception +3',
          senses: 'Blindsight 120 ft.',
          attacks: 'Bite: +6, 5d6+4 piercing',
          traits: 'Echolocation, Hold Breath (30 min), Keen Hearing',
          hasSwimSpeed: true
        }
      ],

      // CR 4 Beasts (Moon Druid level 12+)
      'CR4': [
        {
          name: 'Elephant',
          cr: '4',
          ac: 12,
          hp: 76,
          speed: '40 ft.',
          str: 22, dex: 9, con: 17, int: 3, wis: 11, cha: 6,
          skills: '',
          senses: '',
          attacks: 'Gore: +8, 3d8+6 piercing; Stomp: +8, 3d10+6 bludgeoning (prone only)',
          traits: 'Trampling Charge (if moves 20 ft. + gore, DC 12 STR or prone + bonus stomp)'
        }
      ],

      // CR 5 Beasts (Moon Druid level 15+)
      'CR5': [
        {
          name: 'Giant Crocodile',
          cr: '5',
          ac: 14,
          hp: 85,
          speed: '30 ft., swim 50 ft.',
          str: 21, dex: 9, con: 17, int: 2, wis: 10, cha: 7,
          skills: 'Stealth +5',
          senses: '',
          attacks: 'Multiattack (bite + tail); Bite: +8, 3d10+5 piercing + grappled (DC 16) + restrained; Tail: +8, 2d8+5 bludgeoning, DC 16 STR or prone',
          traits: 'Hold Breath (30 min)',
          hasSwimSpeed: true
        },
        {
          name: 'Giant Shark',
          cr: '5',
          ac: 13,
          hp: 126,
          speed: '0 ft., swim 50 ft.',
          str: 23, dex: 11, con: 21, int: 1, wis: 10, cha: 5,
          skills: 'Perception +3',
          senses: 'Blindsight 60 ft.',
          attacks: 'Bite: +9, 3d10+6 piercing',
          traits: 'Blood Frenzy (advantage on bloodied creatures), Water Breathing',
          hasSwimSpeed: true
        },
        {
          name: 'Triceratops',
          cr: '5',
          ac: 13,
          hp: 95,
          speed: '50 ft.',
          str: 22, dex: 9, con: 17, int: 2, wis: 11, cha: 5,
          skills: '',
          senses: '',
          attacks: 'Gore: +9, 4d8+6 piercing; Stomp: +9, 3d10+6 bludgeoning (prone only)',
          traits: 'Trampling Charge (if moves 20 ft. + gore, DC 13 STR or prone + bonus stomp)'
        }
      ],

      // CR 6 Beasts (Moon Druid level 18+)
      'CR6': [
        {
          name: 'Mammoth',
          cr: '6',
          ac: 13,
          hp: 126,
          speed: '40 ft.',
          str: 24, dex: 9, con: 21, int: 3, wis: 11, cha: 6,
          skills: '',
          senses: '',
          attacks: 'Gore: +10, 4d8+7 piercing; Stomp: +10, 4d10+7 bludgeoning (prone only)',
          traits: 'Trampling Charge (if moves 20 ft. + gore, DC 18 STR or prone + bonus stomp)'
        }
      ]
    },

    // ============================================================
    // WILD SHAPE HELPER FUNCTIONS
    // ============================================================

    /**
     * Get maximum CR for Wild Shape based on druid level and circle
     * @param {number} druidLevel - The druid's level
     * @param {string} druidCircle - The druid's circle subclass (optional)
     * @returns {Object} - { maxCR: string, canFly: boolean, canSwim: boolean }
     */
    getWildShapeLimits(druidLevel, druidCircle = '') {
      const isMoonDruid = druidCircle && druidCircle.toLowerCase().includes('moon');

      if (isMoonDruid) {
        // Circle of the Moon progression
        if (druidLevel >= 18) return { maxCR: '6', canFly: true, canSwim: true };
        if (druidLevel >= 15) return { maxCR: '5', canFly: true, canSwim: true };
        if (druidLevel >= 12) return { maxCR: '4', canFly: true, canSwim: true };
        if (druidLevel >= 9) return { maxCR: '3', canFly: true, canSwim: true };
        if (druidLevel >= 6) return { maxCR: '2', canFly: false, canSwim: true };
        if (druidLevel >= 2) return { maxCR: '1', canFly: false, canSwim: true };
        return { maxCR: '0', canFly: false, canSwim: false };
      } else {
        // Standard druid progression
        if (druidLevel >= 8) return { maxCR: '1', canFly: true, canSwim: true };
        if (druidLevel >= 4) return { maxCR: '1/2', canFly: false, canSwim: true };
        if (druidLevel >= 2) return { maxCR: '1/4', canFly: false, canSwim: false };
        return { maxCR: '0', canFly: false, canSwim: false };
      }
    },

    /**
     * Compare two CR values (handles fractions like "1/4", "1/2")
     * @param {string} cr1 - First CR value
     * @param {string} cr2 - Second CR value
     * @returns {number} - -1 if cr1 < cr2, 0 if equal, 1 if cr1 > cr2
     */
    compareCR(cr1, cr2) {
      const crToNumber = (cr) => {
        if (cr === '0') return 0;
        if (cr === '1/8') return 0.125;
        if (cr === '1/4') return 0.25;
        if (cr === '1/2') return 0.5;
        return parseFloat(cr);
      };
      const n1 = crToNumber(cr1);
      const n2 = crToNumber(cr2);
      if (n1 < n2) return -1;
      if (n1 > n2) return 1;
      return 0;
    },

    /**
     * Get all available beast forms for a druid
     * @param {number} druidLevel - The druid's level
     * @param {string} druidCircle - The druid's circle subclass (optional)
     * @returns {Array} - Array of beast objects available for Wild Shape
     */
    getAvailableBeastForms(druidLevel, druidCircle = '') {
      const limits = this.getWildShapeLimits(druidLevel, druidCircle);
      const availableBeasts = [];

      const crOrder = ['CR0', 'CR1/8', 'CR1/4', 'CR1/2', 'CR1', 'CR2', 'CR3', 'CR4', 'CR5', 'CR6'];

      for (const crKey of crOrder) {
        const crValue = crKey.replace('CR', '');
        // Stop if this CR exceeds max
        if (this.compareCR(crValue, limits.maxCR) > 0) break;

        const beasts = this.BEAST_FORMS[crKey] || [];
        for (const beast of beasts) {
          // Check fly/swim restrictions
          if (beast.hasFlySpeed && !limits.canFly) continue;
          if (beast.hasSwimSpeed && !limits.canSwim) continue;

          availableBeasts.push(beast);
        }
      }

      return availableBeasts;
    },

    /**
     * Format a single beast form as text for Features section
     * @param {Object} beast - The beast object
     * @returns {string} - Formatted text block
     */
    formatBeastForm(beast) {
      const lines = [];
      lines.push(`**${beast.name}** (CR ${beast.cr})`);
      lines.push(`AC ${beast.ac} | HP ${beast.hp} | Speed: ${beast.speed}`);
      lines.push(`STR ${beast.str} DEX ${beast.dex} CON ${beast.con} INT ${beast.int} WIS ${beast.wis} CHA ${beast.cha}`);
      if (beast.skills) lines.push(`Skills: ${beast.skills}`);
      if (beast.senses) lines.push(`Senses: ${beast.senses}`);
      lines.push(`Attacks: ${beast.attacks}`);
      if (beast.traits) lines.push(`Traits: ${beast.traits}`);
      return lines.join('\n');
    },

    /**
     * Format all available beast forms as text for Features section
     * @param {number} druidLevel - The druid's level
     * @param {string} druidCircle - The druid's circle subclass (optional)
     * @returns {string} - Markdown-formatted text with all available forms
     */
    formatWildShapeReference(druidLevel, druidCircle = '') {
      const limits = this.getWildShapeLimits(druidLevel, druidCircle);
      const beasts = this.getAvailableBeastForms(druidLevel, druidCircle);

      if (beasts.length === 0) {
        return '**Wild Shape:** Not yet available (requires Druid level 2)';
      }

      const lines = [];
      const isMoon = druidCircle && druidCircle.toLowerCase().includes('moon');

      lines.push(`**Wild Shape Forms** (Max CR: ${limits.maxCR}${limits.canFly ? ', can fly' : ''}${limits.canSwim ? ', can swim' : ''})`);
      lines.push(`Uses: ${Math.max(2, Math.floor(druidLevel / 2))}/short rest | Duration: ${Math.floor(druidLevel / 2)} hours`);
      lines.push('');

      // Group beasts by CR for better organization
      const beastsByCR = {};
      for (const beast of beasts) {
        if (!beastsByCR[beast.cr]) beastsByCR[beast.cr] = [];
        beastsByCR[beast.cr].push(beast);
      }

      for (const cr of Object.keys(beastsByCR).sort((a, b) => this.compareCR(a, b))) {
        lines.push(`--- CR ${cr} ---`);
        for (const beast of beastsByCR[cr]) {
          lines.push(this.formatBeastForm(beast));
          lines.push('');
        }
      }

      return lines.join('\n');
    },

    /**
     * Get a compact summary of Wild Shape forms (for quick reference)
     * @param {number} druidLevel - The druid's level
     * @param {string} druidCircle - The druid's circle subclass (optional)
     * @returns {string} - Compact summary text
     */
    getWildShapeSummary(druidLevel, druidCircle = '') {
      const limits = this.getWildShapeLimits(druidLevel, druidCircle);
      const beasts = this.getAvailableBeastForms(druidLevel, druidCircle);

      if (beasts.length === 0) {
        return 'Wild Shape: Not yet available';
      }

      // Get top 5 beasts by CR
      const topBeasts = beasts
        .sort((a, b) => this.compareCR(b.cr, a.cr))
        .slice(0, 5)
        .map(b => `${b.name} (CR ${b.cr}, HP ${b.hp})`);

      return `Wild Shape (Max CR ${limits.maxCR}): ${topBeasts.join(', ')}${beasts.length > 5 ? ` + ${beasts.length - 5} more` : ''}`;
    }
  };
})();
