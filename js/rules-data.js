// eslint-disable-next-line no-unused-vars
const RULES_DATA = window.RULES_DATA = [
  {
    cat: "Combat: Initiative & Setup",
    items: [
      {
        title: "Starting Combat",
        body: `When a hostile encounter begins, everyone involved rolls Initiative: d20 + DEX modifier. Higher results act first each round. Ties are broken by comparing DEX scores, or by mutual agreement at the table.
A round represents roughly 6 seconds of in-world time. Everyone gets one turn per round.
The DM rolls for monster groups — either one roll for a group or individually for notable enemies.`,
        tags: ["initiative","dex","turn order","round","combat start"]
      },
      {
        title: "Surprise",
        body: `If one side is caught completely unaware, those creatures are Surprised for the first round.
A Surprised creature still rolls Initiative and can move on its turn, but cannot take an Action, Bonus Action, or Reaction until the start of its second turn.
Surprise is determined before Initiative is rolled. A stealthy party that wins a Stealth vs. Passive Perception contest surprises the enemies; the reverse is also true.`,
        tags: ["surprise","stealth","initiative","ambush","passive perception"]
      },
      {
        title: "Initiative: Swapping Order (2024)",
        body: `In the 2024 rules, on your first turn you may swap your Initiative position with one willing creature — ally or enemy — as a free action.
This lets the party optimize the order after seeing where monsters landed, without requiring a house rule.`,
        tags: ["initiative","swap","turn order","2024"]
      },
      {
        title: "Heroic Inspiration (2024)",
        body: `Renamed from Inspiration in the 2024 rules. The DM awards it for good roleplay, clever thinking, or memorable moments.
When you have Heroic Inspiration, you can spend it before making a d20 roll to roll twice and take the higher result. Similar to Advantage, but stored as a resource.
You can only hold one at a time. Some class features also generate it automatically.`,
        tags: ["inspiration","heroic inspiration","advantage","d20","2024"]
      }
    ]
  },
  {
    cat: "Combat: Action Economy",
    items: [
      {
        title: "What You Get Each Turn",
        body: `Every turn you have:
• 1 Action — your main activity.
• 1 Move — up to your full Speed, split freely before/during/after your Action.
• 1 Bonus Action — only when a feature specifically grants one.
• 1 Reaction — used on any creature's turn; resets at the start of your turn.
• 1 Free Object Interaction — draw/sheathe a weapon, open an unlocked door, pick up a dropped item, etc.
You don't get a Bonus Action just because it's your turn — something must grant it.`,
        tags: ["action","bonus action","reaction","move","speed","action economy","free object"]
      },
      {
        title: "Common Actions in Combat",
        body: `Attack: Make one or more weapon or unarmed attacks (Extra Attack grants more).
Cast a Spell: Spells with a 1-action casting time.
Dash: Gain extra movement equal to your speed this turn (doubles effective range).
Disengage: Your movement doesn't provoke Opportunity Attacks for the rest of this turn.
Dodge: Until your next turn, attacks against you have disadvantage, and you have advantage on DEX saves, provided you can see the attacker and aren't Incapacitated.
Help: Give an ally advantage on one ability check, or advantage on their next attack roll against one creature you're within 5 ft of.
Hide: Make a Stealth check to become hidden (must have concealment and not be directly observed).
Ready: Prepare to act when a specific trigger occurs (uses your Reaction when triggered).
Search: Make a Perception or Investigation check to find something hidden.
Use an Object: Interact with a second object on the same turn (first is free).`,
        tags: ["attack","dash","disengage","dodge","help","hide","ready","search","use object","cast spell","extra attack"]
      },
      {
        title: "Bonus Actions",
        body: `You can only take a Bonus Action when a specific ability, spell, or feature grants one. You cannot freely invent them.
Common sources: off-hand attack (two-weapon fighting), Healing Word, Misty Step, Cunning Action (Rogue), Wild Shape (Druid), Rage (Barbarian), certain weapon masteries.
If multiple features grant a Bonus Action, you still only get one Bonus Action per turn — choose which to use.`,
        tags: ["bonus action","off-hand","cunning action","wild shape","rage","healing word","misty step"]
      },
      {
        title: "Reactions",
        body: `A Reaction happens instantly in response to a trigger — on your turn or anyone else's. You have one Reaction per round; it resets at the start of your turn.
Common Reactions: Opportunity Attack, Shield spell, Counterspell, Feather Fall, Hellish Rebuke, Sentinel feat.
Casting a reaction spell uses your Reaction for the round. You can't also take a Reaction on the same trigger.`,
        tags: ["reaction","opportunity attack","shield","counterspell","feather fall","trigger","per round"]
      },
      {
        title: "Readying an Action",
        body: `Take the Ready action on your turn to hold your Action for a later trigger.
Declare: (1) what you're doing, and (2) the specific trigger ("when the orc steps into the doorway…").
When the trigger happens, use your Reaction to perform it.
If the trigger never occurs, the held action is lost.
Readying a Spell: the slot is spent when you ready it, not when you release it. Concentration begins when you cast it. If your concentration is broken before release, the spell fizzles.`,
        tags: ["ready","reaction","trigger","hold action","concentration","spell"]
      }
    ]
  },
  {
    cat: "Combat: Movement & Position",
    items: [
      {
        title: "Movement Rules",
        body: `You can split your movement freely — before, during, and after your Action. You can move between individual attacks if you have Extra Attack.
Difficult Terrain: costs 2 feet of movement per 1 foot traveled (rubble, brush, shallow water, ice, steep stairs, etc.).
Standing from Prone: costs half your Speed. You can't stand if your Speed is 0.
Dropping Prone: free — no movement cost.
Crawling: costs 2 feet per foot moved.`,
        tags: ["movement","speed","difficult terrain","prone","stand","crawl","extra attack","split"]
      },
      {
        title: "Squeezing",
        body: `A creature can squeeze through a space one size category smaller than itself.
While squeezing: Speed is halved, attack rolls against you have advantage, your attack rolls and DEX saves have disadvantage.
Creatures can't squeeze through a space two sizes smaller than themselves.`,
        tags: ["squeeze","size","movement","tight","disadvantage","advantage"]
      },
      {
        title: "Forced Movement",
        body: `Being pushed, pulled, or thrown by a spell or effect doesn't trigger Opportunity Attacks and isn't blocked by Disengage.
Examples: Thunderwave, Gust of Wind, a Shove, Telekinesis.
Forced movement can push creatures off ledges, into hazards, or through walls of force depending on the effect.`,
        tags: ["forced movement","push","pull","shove","thunderwave","opportunity attack","telekinesis"]
      },
      {
        title: "Moving Through Spaces",
        body: `You can move through an ally's space freely (they're not an obstacle).
You can move through an enemy's space only if that enemy is at least two sizes larger or smaller than you.
You can't end your turn in another creature's space.
Prone creatures are still occupying their space — you can move through but not without hazard.`,
        tags: ["space","ally","enemy","size","prone","move through"]
      }
    ]
  },
  {
    cat: "Combat: Attacks & Damage",
    items: [
      {
        title: "Making an Attack Roll",
        body: `Roll: d20 + ability modifier + proficiency bonus (if proficient with the weapon or spell).
Ability modifier: STR for most melee weapons; DEX for ranged weapons and Finesse weapons (your choice); spellcasting ability for spell attacks.
Hit if: result equals or exceeds the target's AC.
Natural 20: always hits and is a critical hit regardless of AC.
Natural 1: always misses regardless of modifiers.`,
        tags: ["attack roll","ac","d20","hit","miss","natural 20","natural 1","proficiency","str","dex"]
      },
      {
        title: "Critical Hits",
        body: `A natural 20 on the attack die is a critical hit.
Roll all damage dice twice, then add modifiers once.
Example: a greatsword (2d6+4) becomes 4d6+4 on a crit.
Some features expand the crit range (e.g., Champion Fighter: crits on 19–20).
Crits vs. a creature at 0 HP: each crit counts as two failed death saving throws.`,
        tags: ["critical hit","natural 20","damage","champion","crit range","death saves","dice"]
      },
      {
        title: "Damage Types",
        body: `Physical: Bludgeoning, Piercing, Slashing.
Elemental: Acid, Cold, Fire, Lightning, Thunder.
Energy: Force, Necrotic, Radiant, Psychic.
Special: Poison.
Resistance: halve damage from that type.
Immunity: take 0 damage from that type.
Vulnerability: take double damage from that type (rare).
If a creature is both resistant and vulnerable to the same type, they cancel — roll normally.`,
        tags: ["damage type","resistance","immunity","vulnerability","bludgeoning","fire","necrotic","radiant","psychic","poison"]
      },
      {
        title: "Advantage & Disadvantage",
        body: `Advantage: roll 2d20, use the higher. Disadvantage: roll 2d20, use the lower.
Multiple sources of either don't stack — it's always a binary on/off.
Having both advantage and disadvantage simultaneously: they cancel; roll 1d20 regardless of how many sources of each you have.
Applies to the full d20 roll (attack, save, ability check), not just a bonus.`,
        tags: ["advantage","disadvantage","d20","roll","cancel","stack"]
      },
      {
        title: "Unseen Attackers & Hidden Creatures",
        body: `Attacking a target you can't see: disadvantage on the attack. You must guess the creature's location — a wrong guess auto-misses even if you'd have hit.
Attacking while hidden: advantage on the attack. Regardless of whether you hit or miss, you're no longer hidden after the attack.
A creature that can't see you can't make Opportunity Attacks against you.`,
        tags: ["unseen","hidden","stealth","attack","invisible","disadvantage","advantage","opportunity attack"]
      },
      {
        title: "Two-Weapon Fighting (2024)",
        body: `When you attack with a melee weapon that doesn't have the Two-Handed property, you can use your Bonus Action to make one additional attack with a different one-handed melee weapon you're holding.
In the 2024 rules, both weapons no longer need the Light property — any one-handed melee weapons qualify.
Neither attack adds your ability modifier to damage by default. The Two-Weapon Fighting Style (and some features) changes this.`,
        tags: ["two-weapon","dual wielding","bonus action","one-handed","light","fighting style","2024"]
      },
      {
        title: "Ranged Attacks",
        body: `Weapons list two ranges (e.g., 80/320 ft for a longbow): normal range / maximum range.
Beyond normal range (up to maximum): disadvantage on the attack.
Hostile creature within 5 ft of you: disadvantage on ranged attack rolls.
Ammunition: half of expended ammo can be recovered after the fight (searching the area).
Thrown weapons: use STR modifier (unless Finesse). Range is much shorter than bows.`,
        tags: ["ranged","bow","crossbow","long range","disadvantage","ammunition","thrown","5 ft","melee"]
      },
      {
        title: "Weapon Properties Quick Reference",
        body: `Two-Handed: requires both hands.
Versatile: one- or two-handed (higher die two-handed, e.g., 1d8 / 1d10).
Finesse: use STR or DEX — your choice.
Light: qualifies for two-weapon fighting.
Reach: melee range extends to 10 ft instead of 5 ft.
Heavy: Small/Tiny creatures have disadvantage with it.
Thrown: can be used as a ranged attack.
Loading: can fire only once per action (crossbows without Crossbow Expert).`,
        tags: ["weapon property","two-handed","versatile","finesse","light","reach","heavy","thrown","loading"]
      }
    ]
  },
  {
    cat: "Combat: Special Situations",
    items: [
      {
        title: "Opportunity Attacks",
        body: `When a creature you can see willingly moves out of your melee reach, use your Reaction to make one melee attack before it leaves.
No Opportunity Attack if the creature: used Disengage, was moved by a forced effect (not willingly), or teleported.
Creatures with reach (10 ft) trigger OAs when leaving that extended range, not just 5 ft.`,
        tags: ["opportunity attack","reaction","reach","disengage","melee","willingly","forced"]
      },
      {
        title: "Grappling",
        body: `Requires a free hand. Replaces one of your attacks (use during the Attack action).
Contest: your Athletics vs. target's Athletics or Acrobatics (their choice).
Win: target gets the Grappled condition (speed = 0).
Escape: grappled creature uses its Action to make the same contest to break free.
Dragging: you can drag a grappled creature with you at half speed.
Size limit: you can grapple targets up to one size larger than yourself.`,
        tags: ["grapple","athletics","acrobatics","contest","speed","grappled","escape","size","drag"]
      },
      {
        title: "Shoving",
        body: `Replaces one of your attacks (use during the Attack action).
Contest: your Athletics vs. target's Athletics or Acrobatics.
Win: choose to knock the target Prone, or push it 5 ft in a straight line.
Size limit: same as Grapple — target can be no more than one size larger than you.
Knocking prone in melee is a powerful setup for allies.`,
        tags: ["shove","push","prone","athletics","acrobatics","contest","size","setup"]
      },
      {
        title: "Cover",
        body: `Half Cover (+2 to AC and DEX saves): a low wall, another creature, a large barrel.
Three-Quarters Cover (+5 to AC and DEX saves): arrow slit, portcullis, mostly behind a wall.
Total Cover: can't be directly targeted by attacks or most spells.
Explosions and AoE effects (e.g., Fireball, Shatter) bypass total cover if they can enter the space from another angle.`,
        tags: ["cover","ac","dex save","half","three-quarters","total","fireball","aoe"]
      },
      {
        title: "Flanking (Optional Rule)",
        body: `Not in the standard rules — it's an optional rule the DM enables.
If active: two allies on opposite sides of a creature (each within 5 ft of it) both gain advantage on melee attacks against it.
Caution: this rule trivially generates advantage and can slow play. Many experienced tables skip it.`,
        tags: ["flanking","optional","advantage","position","melee","house rule"]
      },
      {
        title: "Mounted Combat",
        body: `Controlled mount: acts on your turn; you direct its movement. It can Dash, Disengage, or Dodge only unless specially trained.
Independent mount: acts on its own Initiative, moves and attacks on its own.
If the mount is knocked prone while you're on it, you must succeed on a DC 10 DEX save or fall off (landing prone adjacent). You can also voluntarily dismount into an adjacent space.
Targeting while mounted: you can be targeted and the mount can be targeted separately.`,
        tags: ["mount","horse","mounted combat","prone","disengage","dodge","dash","dismount","initiative"]
      },
      {
        title: "Underwater Combat",
        body: `Without a swim speed: melee attacks have disadvantage except with daggers, javelins, shortswords, spears, and tridents.
Ranged attacks automatically miss beyond their normal range.
Fire damage: creatures and objects in water are resistant to fire.
Breath holding: a creature can hold its breath for 1 + CON modifier minutes (minimum 30 seconds). When that runs out it falls to 0 HP.`,
        tags: ["underwater","swim","ranged","fire","resistance","breath","con","disadvantage","melee"]
      }
    ]
  },
  {
    cat: "Combat: HP, Death & Recovery",
    items: [
      {
        title: "Dropping to 0 HP & Death Saves",
        body: `At 0 HP you fall Unconscious and start making Death Saving Throws at the start of each of your turns.
Roll a d20 (no modifiers):
• 10 or higher: 1 success.
• 9 or lower: 1 failure.
• Natural 20: immediately regain 1 HP and become conscious.
• Natural 1: counts as 2 failures.
3 successes: you're stabilized.
3 failures: you die.
Taking damage at 0 HP: +1 failure. A crit (including any melee hit, since you're Unconscious): +2 failures.
Any healing above 0 clears all death save counts and wakes you.`,
        tags: ["death saves","0 hp","dying","stabilize","healing","crit","unconscious","natural 20","natural 1"]
      },
      {
        title: "Stabilizing a Dying Creature",
        body: `A DC 10 Wisdom (Medicine) check stabilizes a creature at 0 HP (no check required if using a Healer's Kit).
Stable creatures are unconscious at 0 HP but no longer rolling death saves.
After 1d4 hours, a stable creature regains 1 HP and wakes up on its own.
Any healing at all (even 1 HP from Healing Word) immediately stabilizes and wakes the creature.`,
        tags: ["stabilize","medicine check","healer kit","healing","0 hp","cure words","healing word"]
      },
      {
        title: "Instant Death",
        body: `If damage drops you to 0 HP and the leftover damage is greater than or equal to your HP maximum, you die instantly with no death saves.
Example: a character with 20 max HP at 5 HP takes 60 damage — they go to 0 HP with 55 leftover, which exceeds their 20 max HP. Instant death.
High-level monsters can one-shot lower-level characters this way. Be aware of it.`,
        tags: ["instant death","massive damage","max hp","0 hp","death","one shot"]
      },
      {
        title: "Temporary Hit Points",
        body: `Temp HP is a separate buffer that absorbs damage before your real HP.
Damage hits Temp HP first; leftover damage carries into your HP.
Temp HP don't stack: gaining new Temp HP when you already have some means you take the higher value — they don't add together.
Healing doesn't restore Temp HP. They last until depleted or until your next long rest (check the source for specifics).`,
        tags: ["temp hp","temporary hit points","buffer","stack","healing","long rest"]
      },
      {
        title: "Resistance & Immunity to Damage",
        body: `Resistance: halve the damage after all other modifiers.
Immunity: take 0 damage of that type.
Vulnerability: take double damage.
If multiple resistances apply to the same source, it still halves only once — resistances don't stack to quarter or eliminate damage.
Order: apply all flat bonuses and reductions first, then halve (or double) at the end.`,
        tags: ["resistance","immunity","vulnerability","damage reduction","halve","double"]
      }
    ]
  },
  {
    cat: "Spellcasting",
    items: [
      {
        title: "Spell Slots",
        body: `Spellcasters have a limited pool of spell slots by level (1st–9th). Casting a leveled spell expends a slot of that spell's level or higher.
Cantrips cost no slot and can be cast freely any number of times.
Most classes regain all spell slots on a long rest. Warlocks are the exception — they regain their limited slots on a short rest.
A higher-level slot doesn't always change the spell's effect unless the spell specifically says "At Higher Levels."`,
        tags: ["spell slot","cantrip","long rest","short rest","warlock","cast","recover"]
      },
      {
        title: "Spell Components",
        body: `V (Verbal): requires speaking — blocked by the Silence spell or a hand over the mouth.
S (Somatic): requires hand gestures — blocked if both hands are occupied (grappling, holding two objects).
M (Material): requires specific components. A spell focus (arcane focus, holy symbol, druidic focus) or component pouch substitutes for components with no listed gold cost.
Components with a gold cost (e.g., Revivify's 300 gp diamond) must be the real item and are consumed if the spell says so.
Subtle Spell (Sorcerer Metamagic) removes V and S requirements.`,
        tags: ["verbal","somatic","material","component","focus","silence","subtle spell","metamagic","gold cost"]
      },
      {
        title: "Concentration",
        body: `Concentration spells last as long as you actively maintain them (up to the listed duration).
Rules:
• You can only concentrate on one spell at a time. Casting a new concentration spell ends the old one immediately.
• Taking damage forces a CON save: DC = max(10, half the damage taken). Fail = lose concentration.
• Being Incapacitated or killed ends concentration.
Helpful features: War Caster feat (advantage on concentration saves); Resilient (CON) feat (add proficiency to CON saves).`,
        tags: ["concentration","con save","war caster","resilient","damage","maintain","one at a time","constitution"]
      },
      {
        title: "Cantrips",
        body: `Cantrips are the baseline spells — no slot required, castable every turn.
Damage cantrips scale up at character levels 5, 11, and 17 (not class level — total character level matters for multiclassing).
Attack cantrips (Firebolt, Eldritch Blast, Sacred Flame) use the caster's Spell Attack Bonus.
Damage cantrips compare favorably to weapon attacks at lower levels; weapons tend to scale better at higher levels.`,
        tags: ["cantrip","scaling","level 5","level 11","firebolt","eldritch blast","sacred flame","character level","multiclass"]
      },
      {
        title: "Upcasting Spells",
        body: `Casting a spell using a slot higher than its minimum is called upcasting. Many spells improve.
Examples: Cure Wounds heals +1d8 per slot level above 1st; Magic Missile adds +1 dart per slot above 1st; Burning Hands adds +1d6 per slot; Hold Person targets +1 creature per slot above 2nd.
Not all spells benefit — check the "At Higher Levels" entry.`,
        tags: ["upcast","higher levels","magic missile","cure wounds","burning hands","slot","improve"]
      },
      {
        title: "Ritual Casting",
        body: `Spells with the Ritual tag can be cast without a spell slot by adding 10 extra minutes to the casting time.
Wizards: can ritual-cast any ritual in their spellbook, no preparation needed.
Clerics, Druids: can ritual-cast any ritual they have prepared (or know, for Druid).
Bards: must have the spell prepared.
Ritual Caster feat: lets non-casters do this for two chosen spells from a class list.
Ritual casting is never used in combat (10+ minute cast time).`,
        tags: ["ritual","no slot","casting time","wizard","cleric","druid","bard","ritual caster","10 minutes"]
      },
      {
        title: "Bonus Action Spells",
        body: `Spells with a Bonus Action casting time (Healing Word, Misty Step, Thunderous Smite, etc.) use your Bonus Action.
If you cast a Bonus Action spell, your Action spell that same turn can only be a cantrip.
If you cast a leveled spell as your Action, you can't also cast a Bonus Action spell.
This rule exists to prevent double-casting in one turn. Cantrips are always allowed as the Action alongside a Bonus Action spell.`,
        tags: ["bonus action","healing word","misty step","cantrip","action","leveled spell","restriction"]
      },
      {
        title: "Reaction Spells",
        body: `Shield, Counterspell, Feather Fall, Hellish Rebuke, and others have a Reaction casting time.
The specific trigger is written in the spell (e.g., Shield triggers when you're hit by an attack; Counterspell when a creature within 60 ft casts a spell).
Using a reaction spell expends your Reaction for the round. You must have your Reaction available.`,
        tags: ["reaction","shield","counterspell","feather fall","hellish rebuke","trigger","reaction spell"]
      },
      {
        title: "Spell Save DC & Spell Attack Bonus",
        body: `Spell Save DC = 8 + proficiency bonus + spellcasting ability modifier.
Spell Attack Bonus = proficiency bonus + spellcasting ability modifier.
Spellcasting abilities by class:
INT: Wizard, Artificer.
WIS: Cleric, Druid, Ranger.
CHA: Bard, Paladin, Sorcerer, Warlock.`,
        tags: ["spell save dc","spell attack","proficiency","int","wis","cha","wizard","cleric","druid","sorcerer","warlock"]
      },
      {
        title: "Areas of Effect",
        body: `Cone: a wedge from a point you choose at range.
Sphere: radiates outward from a center point (e.g., Fireball).
Line: a narrow path in a direction (e.g., Lightning Bolt).
Cylinder: a vertical column centered on a point (e.g., Flame Strike).
Cube: a box originating from a point (e.g., Thunderwave).
Most saving throw spells deal half damage on a successful save unless the spell says "no effect on success."`,
        tags: ["aoe","area of effect","cone","sphere","line","cylinder","cube","fireball","lightning bolt","saving throw","half damage"]
      },
      {
        title: "Counterspell",
        body: `Cast as a Reaction when a creature within 60 ft starts casting a spell.
3rd level or lower: automatically countered, no roll.
4th level or higher: make a spellcasting ability check (DC = 10 + the spell's level). Success = countered.
You can upcast Counterspell to auto-counter higher-level spells (cast at 4th level = auto-counter 4th level or lower, etc.).
Counterspell can be countered by another Counterspell.`,
        tags: ["counterspell","reaction","spell level","ability check","60 ft","upcast","counter"]
      },
      {
        title: "Spellcasting in Armor",
        body: `Arcane spellcasters (Wizard, Sorcerer, Bard, Warlock, Artificer) cannot cast spells while wearing armor they are not proficient with.
Clerics, Druids, Paladins, and Rangers are proficient in at least some armor and can cast in it.
The War Caster feat and some class features (e.g., Valor Bard, Hexblade Warlock) allow casting in heavier armor than normal.`,
        tags: ["armor","spellcasting","proficiency","wizard","sorcerer","bard","cleric","war caster","hexblade"]
      }
    ]
  },
  {
    cat: "Conditions",
    items: [
      {
        title: "Blinded",
        body: `• Your attack rolls: disadvantage.
• Attack rolls against you: advantage.
• Auto-fail any check that requires sight.
Sources: Blindness/Deafness spell, sand in the eyes, magical Darkness (for creatures without Darkvision), Flash of light effects.`,
        tags: ["condition","blinded","vision","attack","disadvantage","advantage","darkness"]
      },
      {
        title: "Charmed",
        body: `• Can't attack the charmer or target them with harmful spells or abilities.
• The charmer has advantage on social checks against you.
Charm ends if the charmer or their allies harm you. Duration varies by source — many end at the end of the encounter or on a successful save.`,
        tags: ["condition","charmed","social","attack","target","advantage"]
      },
      {
        title: "Deafened",
        body: `• Can't hear.
• Auto-fail checks that rely on hearing.
Note: you can still cast spells with Verbal components (you're making the sounds — you just can't hear them yourself). The Silence spell, however, blocks V-component spells by eliminating all sound.`,
        tags: ["condition","deafened","hearing","check","verbal","silence"]
      },
      {
        title: "Exhaustion (2024 rules)",
        body: `Each level of Exhaustion applies a cumulative −2 to all d20 rolls (attack rolls, saving throws, and ability checks).
Level 1: −2 | Level 2: −4 | Level 3: −6 | Level 4: −8 | Level 5: −10 | Level 6: Death.
Long rest with adequate food and water removes 1 level.
Common sources: forced marching, extreme heat/cold, starvation, dehydration, some monster abilities (e.g., Shadow's Strength drain), and certain spells.`,
        tags: ["condition","exhaustion","d20","penalty","long rest","forced march","heat","cold","2024"]
      },
      {
        title: "Frightened",
        body: `• While the source of fear is in sight:
  – Your attack rolls: disadvantage.
  – Your ability checks: disadvantage.
• Can't willingly move closer to the source.
Many Frightened effects allow a saving throw repeat at the end of each turn. The condition ends if the creature can no longer see the source.`,
        tags: ["condition","frightened","fear","attack","check","disadvantage","movement","saving throw"]
      },
      {
        title: "Grappled",
        body: `• Speed becomes 0 (no bonuses to speed apply).
• Ends if: the grappler becomes Incapacitated, or something removes the grappled creature from the grappler's reach.
Escape: on your turn, use your Action to repeat the Athletics vs. Athletics/Acrobatics contest.`,
        tags: ["condition","grappled","speed","incapacitated","escape","action"]
      },
      {
        title: "Incapacitated",
        body: `• Can't take Actions or Reactions.
• Movement and speech are not directly prevented by this condition alone.
Incapacitated is the foundation of several worse conditions — Paralyzed, Stunned, and Unconscious all include it.`,
        tags: ["condition","incapacitated","action","reaction","base condition"]
      },
      {
        title: "Invisible",
        body: `• Can't be seen through normal means.
• Attacks against you: disadvantage (attacker must guess your location; wrong guess auto-misses).
• Your attacks: advantage.
You still make noise, leave tracks, and can be smelled. Invisible is not incorporeal — you can still be Grappled if your location is detected.`,
        tags: ["condition","invisible","attack","advantage","disadvantage","guess","location","stealth"]
      },
      {
        title: "Paralyzed",
        body: `• Incapacitated; can't move or speak.
• Auto-fail STR and DEX saves.
• Attacks against you: advantage.
• Any attack that hits you from within 5 ft is a critical hit.
Very dangerous — a paralyzed character can be slain quickly in melee. Priority #1: break the effect fast.`,
        tags: ["condition","paralyzed","incapacitated","save","critical hit","advantage","deadly"]
      },
      {
        title: "Petrified",
        body: `• Transformed into a solid inanimate object; Incapacitated; can't move or speak; unaware of surroundings.
• Resistance to all damage.
• Auto-fail STR and DEX saves.
• Attacks against you: advantage.
• Immune to poison and disease.
• Weight ×10; age doesn't progress.`,
        tags: ["condition","petrified","incapacitated","resistance","immunity","save","advantage","stone"]
      },
      {
        title: "Poisoned",
        body: `• Your attack rolls: disadvantage.
• Your ability checks: disadvantage.
Common sources: poisoned weapon, spider bite, ingested poison, Poisoned condition spells. CON saves typically resist or end the effect.`,
        tags: ["condition","poisoned","attack","check","disadvantage","con save","weapon","spider"]
      },
      {
        title: "Prone",
        body: `• Your attack rolls: disadvantage.
• Melee attacks against you (attacker within 5 ft): advantage.
• Ranged attacks against you: disadvantage.
• Standing costs half your Speed. Can't stand if Speed is 0.
• Dropping prone is free.
Strategic use: going prone vs. ranged attackers makes you harder to hit; enemy melee attackers love you prone.`,
        tags: ["condition","prone","attack","movement","advantage","disadvantage","stand","ranged","melee"]
      },
      {
        title: "Restrained",
        body: `• Speed becomes 0.
• Your attack rolls: disadvantage.
• Attacks against you: advantage.
• DEX saves: disadvantage.
Common sources: Entangle, Web, Hold Person (effectively), Evard's Black Tentacles, nets.`,
        tags: ["condition","restrained","speed","attack","save","advantage","disadvantage","web","entangle"]
      },
      {
        title: "Stunned",
        body: `• Incapacitated; can't move; can speak only falteringly.
• Auto-fail STR and DEX saves.
• Attacks against you: advantage.
Most common source: Monk's Stunning Strike. Stun is one of the most powerful conditions — it effectively removes the target from the fight for a full round.`,
        tags: ["condition","stunned","incapacitated","save","advantage","monk","stunning strike"]
      },
      {
        title: "Unconscious",
        body: `• Incapacitated; can't move or speak; unaware of surroundings.
• Drops held items and falls Prone.
• Auto-fail STR and DEX saves.
• Attacks against you: advantage.
• Any hit from within 5 ft is a critical hit.
A player at 0 HP is Unconscious — any melee hit on them counts as a crit, adding 2 failed death saves.`,
        tags: ["condition","unconscious","incapacitated","prone","save","critical hit","0 hp","death saves"]
      }
    ]
  },
  {
    cat: "Resting & Recovery",
    items: [
      {
        title: "Short Rest",
        body: `At least 1 hour of light activity (talking, eating, reading, tending wounds).
During a short rest, you can spend any number of your Hit Dice to recover HP.
Spending a Hit Die: roll it + CON modifier → regain that many HP.
Short rest features that recharge: Warlock spell slots, Monk Ki points, Fighter Action Surge and Second Wind, Bardic Inspiration (most subclasses), Channel Divinity (some classes), and more.`,
        tags: ["short rest","hit dice","hp","recovery","warlock","monk","fighter","ki","action surge","bardic inspiration"]
      },
      {
        title: "Long Rest",
        body: `At least 8 hours (minimum 6 hours sleep + 2 hours light activity).
Benefits:
• Regain all HP.
• Regain spent Hit Dice equal to half your total (minimum 1).
• Regain all expended spell slots (most classes).
• Reset long-rest features (Channel Divinity, Wild Shape, etc.).
• Remove 1 Exhaustion level (if food and water were adequate).
Interruption: more than 1 hour of strenuous activity (combat, casting, traveling) during the rest invalidates it.
Limit: only one long rest per 24 hours.`,
        tags: ["long rest","hp","hit dice","spell slots","exhaustion","reset","recharge","sleep","8 hours","24 hours"]
      },
      {
        title: "Hit Dice",
        body: `One Hit Die per class level. The die type depends on class: d12 (Barbarian), d10 (Fighter, Paladin, Ranger), d8 (Bard, Cleric, Druid, Monk, Rogue, Warlock), d6 (Sorcerer, Wizard).
Used during short rests: roll the die + CON modifier, add to current HP (up to max).
Long rest restores half your total Hit Dice (round up, minimum 1).
Multiclassed characters track separate Hit Dice per class but they're all in one pool.`,
        tags: ["hit dice","short rest","long rest","class","barbarian","fighter","wizard","con","multiclass"]
      },
      {
        title: "Healing Spells: Quick Reference",
        body: `Healing Word (Bonus Action, 60 ft range): heals 1d4 + WIS modifier. Great for bringing allies back from 0 HP without closing in.
Cure Wounds (Action, touch): heals 1d8 + WIS modifier. Scales well when upcast.
Mass Cure Wounds (Action, 60 ft burst): heals up to 6 creatures; 3d8 + WIS modifier each. 5th-level slot.
Prayer of Healing (10-minute cast): not usable in combat; good post-combat recovery.
Potions of Healing: Standard = 2d4+2; Greater = 4d4+4; Superior = 8d4+8; Supreme = 10d4+20. A character can use their action (or another's action) to administer one.`,
        tags: ["healing word","cure wounds","mass cure wounds","prayer of healing","potion","bonus action","action","healing","wis"]
      }
    ]
  },
  {
    cat: "Vision & Light",
    items: [
      {
        title: "Light Levels",
        body: `Bright light: full visibility, no penalties.
Dim light (shadows, candles, dusk): lightly obscured — Wisdom (Perception) checks relying on sight are harder.
Darkness: heavily obscured — creatures within treat the area as if they have the Blinded condition.
Common Sources: Candle (~5 ft bright / 1 hr), Torch (~20 ft bright + 20 ft dim / 1 hr), Hooded Lantern (~30 ft bright + 30 ft dim / 6 hrs), Bullseye Lantern (60 ft cone bright / 6 hrs), Continual Flame (20 ft / permanent).`,
        tags: ["light","bright","dim","darkness","torch","lantern","candle","perception","vision","continual flame"]
      },
      {
        title: "Special Senses",
        body: `Darkvision: see in darkness as though it were dim light (limited color), within a listed range. Doesn't help in magical Darkness.
Blindsight: perceive surroundings without sight up to a listed range — detects invisible creatures, works in any darkness. Can't be deceived by illusions.
Truesight: see in all darkness (including magical), detect invisible things, see through illusions and their true forms, see into the Ethereal Plane — all within listed range.
Tremorsense: sense vibrations through ground contact — detects prone creatures or those moving on the same surface.`,
        tags: ["darkvision","blindsight","truesight","tremorsense","invisible","darkness","illusion","ethereal"]
      },
      {
        title: "Cover",
        body: `Half Cover (+2 AC and DEX saves): low wall, large furniture, a creature between you and the attacker.
Three-Quarters Cover (+5 AC and DEX saves): arrow slit, mostly behind a wall, portcullis.
Total Cover: can't be directly targeted by attacks or most spells.
AoE spells bypass total cover if the origin point can reach the target's space by another route.`,
        tags: ["cover","ac","dex save","half","three-quarters","total","aoe","fireball"]
      }
    ]
  },
  {
    cat: "Travel",
    items: [
      {
        title: "Overland Travel Pace",
        body: `Slow pace: stealthy travel, −0 to Passive Perception. Normal pace: standard. Fast pace: −5 to passive Perception (miss things).
A travel day is ~8 hours of movement.
Difficult terrain (swamp, mountain, dense jungle): halves travel speed.
Forced march: every hour beyond 8, each traveler makes a CON save (DC 10 + 1 per hour past 8) or gains 1 Exhaustion level.`,
        tags: ["travel","pace","fast","slow","passive perception","forced march","exhaustion","con save","overland"]
      },
      {
        title: "Climbing, Swimming & Crawling",
        body: `All cost 2 feet of movement per 1 foot traveled — effectively halving speed.
Exception: a creature with a Climb Speed or Swim Speed ignores this penalty for that mode.
Athletics checks may be required for tricky surfaces (slippery walls, strong currents, wet rope).
Drowning: hold breath for 1 + CON modifier minutes (min 30 seconds). After that, the creature drops to 0 HP at the start of each turn.`,
        tags: ["climb","swim","crawl","movement","athletics","swim speed","climb speed","drowning","con"]
      },
      {
        title: "Jumping",
        body: `Long jump (with 10-ft run): up to STR score in feet. Standing start: half.
High jump (with 10-ft run): 3 + STR modifier in feet. Standing start: half.
An Athletics check may be required for uncertain footing, extra distance, or landing safely.`,
        tags: ["jump","long jump","high jump","strength","str","run","athletics","movement"]
      }
    ]
  },
  {
    cat: "Survival",
    items: [
      {
        title: "Food & Water Needs",
        body: `Daily needs: ~1 lb of food and ~1 gallon of water (½ gallon in cool conditions, more in extreme heat).
Half rations for a day: +½ Exhaustion (tracked; reaching a full level applies the penalty).
No food for a day: 1 Exhaustion level.
Not enough water: 1 Exhaustion level (or 2 levels in extreme heat).
Foraging: Survival check (DC set by terrain) can supplement rations on the road.`,
        tags: ["food","water","rations","exhaustion","survival","foraging","dehydration"]
      },
      {
        title: "Extreme Environments",
        body: `Extreme Cold: CON save (DC 10) each hour or gain 1 Exhaustion. Resistance to cold bypasses this.
Extreme Heat: CON save (DC 5 + 1 per prior save that day) each hour without water or cooling — Exhaustion on failure.
Heavy precipitation: lightly obscures the area; disadvantage on Perception checks; extinguishes open flames.
High Altitude (10,000+ ft): unacclimatized creatures have disadvantage on attacks and CON saves.`,
        tags: ["cold","heat","weather","exhaustion","con save","altitude","rain","precipitation","environment"]
      },
      {
        title: "Diseases & Poisons (General)",
        body: `Poisons: usually require a CON save to resist damage and the Poisoned condition. Effects range from minor disadvantage to multi-day ability damage.
Diseases: longer-lasting effects from infected bites, tainted water, or environmental exposure. Usually require repeated CON saves to shake.
Lesser Restoration ends the Poisoned condition and most diseases. Greater Restoration can remove more severe ongoing effects.
A Healer's Kit doesn't cure poison or disease — only magical healing or time (and more saves) does.`,
        tags: ["poison","disease","con save","lesser restoration","greater restoration","healer kit","condition","poisoned"]
      }
    ]
  },
  {
    cat: "Encounters & DM Tools",
    items: [
      {
        title: "Difficulty Check (DC) Benchmarks",
        body: `Very Easy: DC 5. Easy: DC 10. Medium: DC 15. Hard: DC 20. Very Hard: DC 25. Nearly Impossible: DC 30.
Only call for a check when: the outcome is genuinely uncertain, there are meaningful consequences for both success and failure, and the task is actually possible.
Don't ask for checks on things a character should trivially succeed at given their background, tools, or abilities.`,
        tags: ["dc","difficulty","benchmarks","check","dm","skill"]
      },
      {
        title: "Creature Size & Space",
        body: `Tiny: 2½×2½ ft. Small/Medium: 5×5 ft. Large: 10×10 ft. Huge: 15×15 ft. Gargantuan: 20×20 ft or larger.
A creature controls its space; you can move through an ally's space freely, but you cannot move through an enemy's space unless it's two size categories different from you.
Reach: most Medium/Small creatures have 5 ft melee reach. Large or Huge creatures often have 10 ft. Reach weapons extend melee range to 10 ft.`,
        tags: ["size","tiny","small","medium","large","huge","gargantuan","space","reach","ally","enemy"]
      },
      {
        title: "Improvised Damage Reference",
        body: `Environmental benchmarks for DMs:
Open flame contact: 1d4–1d6 fire. Torch attack: 1 fire. Campfire: 2d6. Bonfire: 3d6+.
Falling: 1d6 bludgeoning per 10 ft fallen (max 20d6), land Prone.
Acid (small splash): 1d6–2d6. Full immersion: 5d6+ per round.
Electricity (lightning strike): 8d6–10d6 to 1 target (20 ft nearby: 3d6).
Magma contact: 10d10 fire per round. Smoke inhalation: 1d6 per minute.
Scale freely to level and pacing — the feeling of danger matters more than exact numbers.`,
        tags: ["improvised damage","hazard","fall","fire","acid","electricity","magma","environment","dm"]
      },
      {
        title: "Encounter Difficulty",
        body: `Encounters are rated Easy, Medium, Hard, or Deadly based on total monster XP vs. party thresholds.
Easy: no significant resource drain. Medium: noticeable resource use. Hard: party risks losing a member. Deadly: potentially lethal.
The number of monsters matters: facing many enemies is harder than the XP suggests — use a multiplier (×1.5 for 2, ×2 for 3–6, ×2.5 for 7–10, etc.).
These are guidelines. Terrain, surprise, and creativity can swing any encounter dramatically.`,
        tags: ["encounter","difficulty","xp","easy","medium","hard","deadly","balance","monster","multiplier"]
      },
      {
        title: "Adventuring Day Pacing",
        body: `The typical "adventuring day" assumes 6–8 medium-to-hard encounters between long rests.
If players long-rest after every fight: spell slots and class resources trivialize encounters; the game feels unchallenging.
Key tension: Barbarian, Monk, Fighter, and Warlock favor short-rest-based resources; Wizards and Clerics prefer fewer, harder fights.
DM tools to control pacing: time pressure, hostile territory, enemies who retreat and regroup, mechanical consequences for resting in dangerous areas.`,
        tags: ["adventuring day","pacing","long rest","short rest","resources","spell slots","balance","dm","warlock","wizard"]
      }
    ]
  },
  {
    cat: "Objects & Gear",
    items: [
      {
        title: "Object AC & HP",
        body: `Objects automatically fail STR and DEX saves. They're immune to Poison and Psychic damage.
Fragile (glass, paper, thin wood): AC 5–8, HP 3–10.
Wood (doors, furniture): AC 13, HP 15–27.
Stone (dungeon walls, statue): AC 15, HP 27–80.
Iron/Steel: AC 17–19, HP 30–90+.
Adamantine objects: immune to damage from non-magical bludgeoning, piercing, and slashing.`,
        tags: ["object","ac","hp","wood","stone","iron","adamantine","immunity","save"]
      },
      {
        title: "Donning & Doffing Armor",
        body: `Light armor: 1 minute to don, 1 minute to doff.
Medium armor: 5 minutes to don, 1 minute to doff.
Heavy armor: 10 minutes to don, 5 minutes to doff.
Shield: 1 action to equip or stow.
If you don armor hastily (less than the required time), DM's discretion — typically no AC benefit until fully on.`,
        tags: ["armor","don","doff","time","light","medium","heavy","shield"]
      },
      {
        title: "Useful Adventuring Gear",
        body: `Healer's Kit (5 gp): 10 uses; stabilize without a Medicine check.
Ball Bearings (1 gp/1000): pour on ground; creatures crossing make DC 10 DEX save or fall Prone.
Caltrops (1 gp/bag): 5-ft square; DC 15 DEX save or stop + 1 piercing + −10 speed until healed.
Rope, Hempen (50 ft): Athletics DC 17 to break. Rope, Silk: DC 20.
Holy Water (flask): ranged attack (improvised); 2d6 radiant to undead/fiends.
Oil (flask): thrown to coat a surface (slippery) or ignite for 5 fire damage per round for 2 rounds.
Crowbar: advantage on STR checks where leverage applies.
Tinderbox: light open flame in 1 action; light a torch in 1 action.`,
        tags: ["gear","healer kit","ball bearings","caltrops","rope","holy water","oil","crowbar","tinderbox","flask"]
      }
    ]
  },
  {
    cat: "Abilities & Skills",
    items: [
      {
        title: "Ability Scores & Associated Skills",
        body: `STR: Athletics.
DEX: Acrobatics, Sleight of Hand, Stealth.
CON: no associated skills — used for HP, CON saves, and concentration.
INT: Arcana, History, Investigation, Nature, Religion.
WIS: Animal Handling, Insight, Medicine, Perception, Survival.
CHA: Deception, Intimidation, Performance, Persuasion.
Roll: d20 + ability modifier (+ proficiency if proficient in the relevant skill).`,
        tags: ["ability","str","dex","con","int","wis","cha","skills","check","athletics","perception","stealth"]
      },
      {
        title: "Proficiency Bonus by Level",
        body: `Levels 1–4: +2. Levels 5–8: +3. Levels 9–12: +4. Levels 13–16: +5. Levels 17–20: +6.
Applied to: weapon attack rolls (if proficient), spell attacks, skill checks (if proficient), saving throws (proficient saves depend on class), and tool checks.
Expertise (Bard, Rogue, some backgrounds): doubles proficiency on a specific skill or tool.`,
        tags: ["proficiency","bonus","level","expertise","attack","skill","save","bard","rogue"]
      },
      {
        title: "Passive Scores",
        body: `Passive Score = 10 + ability modifier (+ proficiency if applicable).
Most common: Passive Perception (used by DMs to detect hidden creatures/traps without rolling).
Having Advantage on the check adds +5 to the passive. Disadvantage subtracts −5.
DMs use passive scores secretly — no player roll required. Always note your party's Passive Perception scores.`,
        tags: ["passive","passive perception","investigation","detect","trap","hidden","wisdom","perception"]
      },
      {
        title: "Carrying Capacity",
        body: `Basic carrying capacity: STR score × 15 lbs.
Push, Drag, Lift limit: STR score × 30 lbs (speed halves, may require Athletics checks over long distances).
Encumbrance variant (optional): over STR×5 lbs = penalties to physical rolls; over STR×10 lbs = also halved speed.
Most tables track weight only when dramatically relevant (looting a dragon's hoard, crossing a rope bridge, etc.).`,
        tags: ["carry","encumbrance","strength","weight","push","drag","lift","optional"]
      }
    ]
  },
  {
    cat: "Money & Downtime",
    items: [
      {
        title: "Currency",
        body: `10 copper (cp) = 1 silver (sp).
10 silver (sp) = 1 gold (gp).
10 gold (gp) = 1 platinum (pp).
Electrum (ep) = ½ gp (used in some settings, often excluded).
Rough value: 1 gp = a skilled laborer's daily wage. 1 sp = an unskilled worker's wage. 100 gp fits in a small pouch.`,
        tags: ["gold","silver","copper","platinum","electrum","currency","exchange","gp","wage"]
      },
      {
        title: "Lifestyle Expenses (per day)",
        body: `Wretched: free (squatting, begging). Squalid: 1 sp. Poor: 2 sp. Modest: 1 gp. Comfortable: 2 gp. Wealthy: 4 gp. Aristocratic: 10+ gp.
Lifestyle affects NPC attitudes, social access, and narrative flavor. Track during downtime or abstract it for adventuring parties.`,
        tags: ["lifestyle","expenses","downtime","gp","sp","social","lodging"]
      },
      {
        title: "Common Downtime Activities",
        body: `Crafting: create items using tools and time. Material cost = half market price. Most items: 5 gp of progress per workday.
Practicing a Profession: earn enough to cover modest lifestyle.
Researching: learn about a topic via libraries or sages (1 gp/day + time).
Training: learn a language or tool proficiency — typically 250 workdays and 1 gp/day.
Carousing: spend money, make contacts, risk trouble.
Recovering: long recovery periods for curses, severe injuries, or powerful conditions (DM discretion).`,
        tags: ["downtime","craft","research","train","carousing","language","tool proficiency","workday"]
      }
    ]
  }
];
