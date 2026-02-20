    // eslint-disable-next-line no-unused-vars
    const RULES_DATA = window.RULES_DATA = [
    {
      cat: "Vision",
      items: [
        {
          title: "Light Sources (common)",
          body: `
            Bright vs Dim: bright is full visibility; dim is lightly obscured (disadvantage on Perception relying on sight as DM rules).
            Examples: Candle ~ a small pool of light for about an hour; Torch ~ a room-sized glow for about an hour; Hooded/Bullseye lanterns cast farther for several hours.
            Magic lights follow their spell text (continual flame, dancing lights, light, etc.).`,
          tags: ["vision","light","torch","lantern","darkness"]
        },
        {
          title: "Darkvision / Blindsight / Truesight",
          body: `
            Darkvision: see in darkness as if it were dim light; detail and color are limited.
            Blindsight: perceive surroundings without relying on sight within a specific radius (e.g., echolocation, tremorsense).
            Truesight: see in normal and magical darkness, invisibility, illusions, and into the Ethereal as specified by the trait.`,
          tags: ["vision","senses","darkvision","blindsight","truesight"]
        },
        {
          title: "Cover & Obscurement",
          body: `
            Half cover: +2 to AC and DEX saves. 
            Three-quarters cover: +5 to AC and DEX saves. 
            Total cover: can’t be targeted directly.
            Lightly obscured (fog/shadows): sight checks are harder. Heavily obscured (thick fog/darkness): you can’t see the area.`,
          tags: ["cover","obscured","stealth","perception"]
        }
      ]
    },
    {
      cat: "Travel",
      items: [
        {
          title: "Pace & Passive Perception",
          body: `
            Fast pace: you cover more ground but you’re less alert (penalty to passive Perception).
            Normal pace: default overland travel rate.
            Slow pace: move less, but you can travel stealthily.
            Difficult terrain halves travel speed. A travel day assumes ~8 hours of movement.`,
          tags: ["travel","pace","overland","stealth","passive perception"]
        },
        {
          title: "Climb / Swim / Crawl",
          body: `
            Expect about half speed in these modes (and worse if the surface or situation is severe). The DM may call for Athletics or Acrobatics checks in risky conditions.`,
          tags: ["movement","climb","swim","crawl","athletics"]
        },
        {
          title: "Jumping (quick math)",
          body: `
            Long jump (10-ft run-up): up to your STR score (feet). Standing: half that.
            High jump (10-ft run-up): 3 + STR mod (feet). Standing: half that. Obstacles/landings may require checks.`,
          tags: ["jump","strength","movement"]
        }
      ]
    },
    {
      cat: "Combat",
      items: [
        {
          title: "Your Action Economy",
          body: `
            On your turn you typically get: 1 Action, 1 Move (your speed), possibly 1 Bonus Action (if something grants it), and 1 Reaction (between turns).
            Common actions: Attack, Cast a Spell (casting time 1 action), Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object.`,
          tags: ["action","bonus action","reaction","dash","disengage","dodge"]
        },
        {
          title: "Two-Weapon Fighting (simple)",
          body: `
            If you attack with a light melee weapon in one hand, you can use your bonus action to make one off-hand attack with a different light melee weapon you’re holding.
            The off-hand attack does not add your ability modifier to damage unless a feature says otherwise.`,
          tags: ["two-weapon","bonus action","fighting"]
        },
        {
          title: "Opportunity Attacks",
          body: `
            A creature provokes when it leaves your reach. You use your reaction to make one melee attack before it moves out.
            No OA if it teleports, if its movement is forced, or if it took the Disengage action.`,
          tags: ["reaction","opportunity attack","reach"]
        }
      ]
    },
    {
      cat: "Survival",
      items: [
        {
          title: "Exhaustion (2024 rules)",
          body: `
            Each level of exhaustion gives a −2 penalty to all d20 rolls (ability checks, attack rolls, saving throws).
            Penalties stack: level 2 = −4, level 3 = −6, etc.
            At 6 levels of exhaustion, you die.
            A long rest with adequate food and water removes 1 level.`,
          tags: ["exhaustion","rest","survival"]
        },
        {
          title: "Dropping to 0 HP (Death Saves)",
          body: `
            At 0 HP you start making death saves on your turns: three successes stabilize you; three failures drop you closer to death.
            Critical hits against you while at 0 HP count extra. Any healing that brings you above 0 clears the counter.`,
          tags: ["death saves","stabilize","healing"]
        },
        {
          title: "Food & Water (baseline)",
          body: `
            About 1 lb of food and roughly 1 gallon of water per day are expected in normal conditions.
            Too little food or water leads to exhaustion; hot environments or heavy exertion increase needs.`,
          tags: ["rations","water","environment","exhaustion"]
        }
      ]
    },
    {
      cat: "Conditions",
      items: [
        {
          title: "Blinded",
          body: `
    • Your attack rolls: disadvantage.
    • Attack rolls against you: advantage.
    • Checks: automatically fail checks that rely on sight.`,
          tags: ["condition","vision","attacks","checks","advantage","disadvantage"]
        },
        {
          title: "Charmed",
          body: `
    • You can’t attack the charmer or target them with harmful abilities.
    • Social interactions with the charmer are easier (DM advantage).`,
          tags: ["condition","social","targeting"]
        },
        {
          title: "Deafened",
          body: `
    • You can’t hear.
    • Checks that rely on hearing: automatically fail.`,
          tags: ["condition","hearing","checks"]
        },
        {
          title: "Frightened",
          body: `
    • While the source is in sight:
      – Your attack rolls: disadvantage.
      – Your ability checks: disadvantage.
    • Movement: you can’t willingly move closer to the source.`,
          tags: ["condition","fear","attacks","checks","movement","disadvantage"]
        },
        {
          title: "Grappled",
          body: `
    • Speed: 0 (no bonus from speed increases).
    • Ends if the grappler is incapacitated or you’re moved away from reach/effects holding you.`,
          tags: ["condition","grapple","speed"]
        },
        {
          title: "Incapacitated",
          body: `
    • Actions/Reactions: you can’t take them.`,
          tags: ["condition","actions","reactions"]
        },
        {
          title: "Invisible",
          body: `
    • Attack rolls against you: disadvantage.
    • Your attack rolls: advantage.
    • You’re unseen (you still make noise/leave tracks as normal).`,
          tags: ["condition","stealth","attacks","advantage","disadvantage"]
        },
        {
          title: "Paralyzed",
          body: `
    • You are incapacitated; can’t move or speak.
    • Saves: automatically fail STR and DEX saves.
    • Attack rolls against you: advantage; a hit from within 5 ft is a critical hit.`,
          tags: ["condition","incapacitated","saves","attacks","critical"]
        },
        {
          title: "Petrified",
          body: `
    • You are transformed into a solid object; incapacitated; can’t move or speak and are unaware.
    • Attack rolls against you: advantage.
    • (DM: apply resistance/immunity nuances per your table’s standard.)`,
          tags: ["condition","incapacitated","attacks"]
        },
        {
          title: "Poisoned",
          body: `
    • Your attack rolls: disadvantage.
    • Your ability checks: disadvantage.`,
          tags: ["condition","poison","attacks","checks","disadvantage"]
        },
        {
          title: "Prone",
          body: `
    • Your attack rolls: disadvantage.
    • Attack rolls against you: advantage if attacker is within 5 ft; otherwise attacker has disadvantage.
    • Movement: standing up costs half your speed.`,
          tags: ["condition","prone","attacks","movement","advantage","disadvantage"]
        },
        {
          title: "Restrained",
          body: `
    • Speed: 0.
    • Your attack rolls: disadvantage.
    • Attack rolls against you: advantage.
    • Saves: disadvantage on DEX saves.`,
          tags: ["condition","restrained","speed","attacks","saves","disadvantage","advantage"]
        },
        {
          title: "Stunned",
          body: `
    • You are incapacitated; can’t move (can speak only falteringly).
    • Saves: automatically fail STR and DEX saves.
    • Attack rolls against you: advantage.`,
          tags: ["condition","incapacitated","saves","attacks"]
        },
        {
          title: "Unconscious",
          body: `
    • You are incapacitated; can’t move or speak; unaware; you drop what you’re holding and fall prone.
    • Saves: automatically fail STR and DEX saves.
    • Attack rolls against you: advantage; a hit from within 5 ft is a critical hit.`,
          tags: ["condition","incapacitated","prone","saves","attacks","critical"]
        }
      ]
    },
    {
      cat: "Encounters",
      items: [
        {
          title: "Task DC Benchmarks",
          body: `
            Very Easy 5 • Easy 10 • Medium 15 • Hard 20 • Very Hard 25 • Nearly Impossible 30.
            Use tools, help, or time to shift odds.`,
          tags: ["dc","checks","difficulty"]
        },
        {
          title: "Creature Size & Space",
          body: `
            Tiny to Gargantuan increases space occupied (e.g., 2½×2½ ft up to 20×20 ft or larger) and can affect reach, grapples, and squeezing rules.`,
          tags: ["size","space","reach"]
        },
        {
          title: "Improvised Damage (DM aid)",
          body: `
            Minor hazards: a die or two (e.g., 1d10).
            Severe accidents: several dice (e.g., 4d10–10d10).
            Catastrophic: many dice (e.g., 18d10+). Tune to tone and level.`,
          tags: ["improvised","environment","hazard"]
        }
      ]
    },
    {
      cat: "Objects",
      items: [
        {
          title: "Object Armor & Hardness (ballpark)",
          body: `
            Soft materials (cloth, paper) are easy to damage; wood/stone are tougher; metal is hardest. Use higher AC/HP for resilient materials (e.g., adamantine).`,
          tags: ["objects","ac","materials"]
        },
        {
          title: "Donning/Doffing",
          body: `
            Light armor is quick; medium takes longer; heavy is slowest. Shields are a single action to put on or take off.`,
          tags: ["armor","shield","time"]
        },
        {
          title: "Useful Adventuring Gear (highlights)",
          body: `
            Healer’s kit stabilizes without a check (limited uses).
            Ball bearings/caltrops create movement hazards (save/check to avoid).
            Holy water harms undead/fiends; oil boosts fire damage briefly.`,
          tags: ["gear","kit","caltrops","oil","holy water"]
        }
      ]
    },
    {
      cat: "Abilities",
      items: [
        {
          title: "Skills by Ability (quick map)",
          body: `
            STR: Athletics. DEX: Acrobatics, Sleight of Hand, Stealth.
            INT: Arcana, History, Investigation, Nature, Religion.
            WIS: Animal Handling, Insight, Medicine, Perception, Survival.
            CHA: Deception, Intimidation, Performance, Persuasion.`,
          tags: ["skills","abilities"]
        },
        {
          title: "Carrying & Pushing (rulings-first)",
          body: `
            Carry about 15 × STR in pounds as a guideline. Pushing/dragging can reach ~30 × STR but often costs speed.`,
          tags: ["carry","encumbrance","push","drag"]
        },
        {
          title: "Grappling (essentials)",
          body: `
            One free hand required. Contest your Athletics vs target’s Athletics/Acrobatics. On a success, target’s speed becomes 0. Size differences matter.`,
          tags: ["grapple","contest","athletics","acrobatics"]
        }
      ]
    },
    {
      cat: "Money",
      items: [
        {
          title: "Lifestyle Expenses",
          body: `
            From wretched to aristocratic, daily costs scale with comfort. Choose a tier to abstract food, shelter, and social access.`,
          tags: ["lifestyle","expenses","downtime"]
        },
        {
          title: "Coins & Exchange (typical)",
          body: `
            10 cp = 1 sp • 10 sp = 1 gp • 10 gp = 1 pp.
            Electrum exists in some worlds at 2 ep = 1 gp.`,
          tags: ["money","currency","exchange","gp","pp"]
        }
      ]
    }
  ];