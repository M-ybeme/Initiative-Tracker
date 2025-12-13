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
    SUBCLASS_DATA,

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
      changes.spellRules = this.getSpellLearningRules(className, toLevel);

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

    /**
     * Get spell learning rules for a class at a specific level
     * @param {string} className - The class name
     * @param {number} newLevel - The level being achieved
     * @returns {Object|null} - { type, newSpells, canSwap, maxSpellLevel } or null if no spell learning
     */
    getSpellLearningRules(className, newLevel) {
      const classData = CLASS_DATA[className];
      if (!classData || !classData.spellcaster) return null;

      // Prepared casters (Cleric, Druid) don't "learn" spells on level-up
      if (className === 'Cleric' || className === 'Druid') {
        return null;
      }

      // Half-casters start at level 2
      const isHalfCaster = className === 'Ranger' || className === 'Paladin';
      if (isHalfCaster && newLevel < 2) {
        return null;
      }

      // Calculate max spell level they can cast
      const maxSpellLevel = this.getMaxSpellLevel(classData, newLevel);
      if (maxSpellLevel === 0 && newLevel > 1) {
        // Can only cast cantrips, no spell learning needed
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

      // Sorcerers, Bards, Warlocks, Rangers, Paladins learn 1 spell and can swap
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
    }
  };
})();
