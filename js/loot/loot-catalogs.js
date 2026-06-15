// ---------- Catalog (including Minor Magic and Cursed Items, gated by toggles) ----------
// Depends on loot-tables.js (item arrays, flavor pools) and loot-engine.js (pick, toTitle, etc.)
const CATS={
  "Coins & Purses":{
    base:COIN_ITEMS,
    make:(rng,b)=>{
      const c=coinBundle(rng,b.sp[0],b.sp[1]);
      const note=rng()<0.4?`, ${pick(rng,ADJS)}`:"";
      const spVal=c.gp*10 + c.sp + Math.floor(c.cp/10) + (c.tokens*5);
      return [`Pouch of ${formatCoinBundle(c)}${note}`, tags("currency","common"), spVal>=50]
    }
  },
  "Trade Goods":{
    base:[
      {n:"bolt of fine cloth",mat:"cloth",w:2.0,sp:[300,1200],valuable:true},
      {n:"small keg of dyed thread",mat:"cloth",w:6.0,sp:[200,800],valuable:true},
      {n:"crate of dried spices",mat:"paper",w:8.0,sp:[400,1500],valuable:true},
      {n:"bundle of cured furs",mat:"leather",w:5.0,sp:[250,900],valuable:true},
      {n:"ingot of refined copper",mat:"metal",w:10.0,sp:[300,900],valuable:true},
      {n:"ingot of worked silver",mat:"metal",w:5.0,sp:[1200,2600],valuable:true},
      {n:"barrel of aged wine",mat:"wood",w:40.0,sp:[500,1800],valuable:true},
      {n:"crate of exotic tea leaves",mat:"paper",w:4.0,sp:[350,1400],valuable:true},
      {n:"bundle of rare herbs",mat:"cloth",w:2.0,sp:[300,1100],valuable:true},
      {n:"sack of quality coffee beans",mat:"cloth",w:8.0,sp:[250,900],valuable:true},
      {n:"case of fine tobacco",mat:"wood",w:3.0,sp:[400,1300],valuable:true},
      {n:"bolt of spider silk",mat:"cloth",w:1.0,sp:[800,2400],valuable:true},
      {n:"jar of rare pigments",mat:"glass",w:2.0,sp:[600,1800],valuable:true},
      {n:"bundle of exotic incense",mat:"paper",w:1.0,sp:[300,1000],valuable:true}
    ],
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const detail=rng()<0.4?` (${pick(rng,PATTERNS)} marks)`:``;
      return [`${toTitle(m)} ${b.n}${detail}`, tags("trade","valuable"), true]
    }
  },
  "Gems & Art":{
    base:GEM_ITEMS,
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const col=rng()<0.4?`, ${pick(rng,COLORS)}`:""; const icon=rng()<0.35?` bearing a ${pick(rng,SIMPLE_ICONS)}`:"";
      return [`${toTitle(m)} ${b.n}${col}${icon}`, tags("art","gem","valuable"), true]
    }
  },
  "Adventuring Gear of Note":{
    base:ADV_GEAR_ITEMS,
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const q=rng()<0.5?pick(rng,["good","excellent","serviceable"]):null; const note=q?` (${q})`:"";
      return [`${toTitle(m)} ${b.n}${note}`, tags("gear","useful"), !!b.valuable]
    }
  },
  "Toolkits & Supplies":{
    base:TOOLKIT_ITEMS,
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const mark=rng()<0.35?`, ${pick(rng,MARKS)}`:"";
      return [`${toTitle(m)} ${b.n}${mark}`, tags("tools","specialty","valuable"), true]
    }
  },
  "Clothing & Wearables":{
    base:CLOTHING_ITEMS,
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const pat=rng()<0.35?`, ${pick(rng,PATTERNS)} pattern`:""; const col=rng()<0.45?`, ${pick(rng,COLORS)}`:"";
      return [`${pick(rng,ADJS)} ${m} ${b.n}${pat}${col}`, tags("apparel","civilian"), false]
    }
  },
  "Tools & Utensils":{
    base:TOOL_ITEMS,
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const cond=pick(rng,COND); const scent=rng()<0.2?`, ${pick(rng,SCENTS)}`:"";
      return [`${cond} ${m} ${b.n}${scent}`, tags("tool","common"), false]
    }
  },
  "Household & Table":{
    base:[
      {n:"clay cup",mat:"clay",w:0.4,sp:[3,60]},
      {n:"wooden bowl",mat:"wood",w:0.4,sp:[3,60]},
      {n:"glass vial (empty)",mat:"glass",w:0.1,sp:[40,300]},
      {n:"tin plate",mat:"metal",w:0.5,sp:[10,160]}
    ],
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const pat=rng()<0.35?` with ${pick(rng,PATTERNS)} motif`:""; const mark=rng()<0.3?`, ${pick(rng,MARKS)}`:"";
      return [`${m} ${b.n}${pat}${mark}`, tags("household","mundane"), false]
    }
  },
  "Writing & Games":{
    base:[
      {n:"rag-paper booklet (blank)",mat:"paper",w:0.2,sp:[40,240]},
      {n:"graphite stick",mat:"stone",w:0.05,sp:[6,80]},
      {n:"dice pair (bone)",mat:"stone",w:0.1,sp:[40,280]},
      {n:"simple playing cards",mat:"paper",w:0.1,sp:[50,250]}
    ],
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const add=rng()<0.45?`, edged in ${pick(rng,COLORS)}`:"";
      return [`${m} ${b.n}${add}`, tags("leisure","stationery"), false]
    }
  },
  "Food & Provisions":{
    base:FOOD_ITEMS,
    make:(rng,b)=>{
      const scent=rng()<0.6?`, ${pick(rng,SCENTS)}`:"";
      return [`${pick(rng,ADJS)} ${b.n}${scent}`, tags("provisions","edible"), false]
    }
  },
  "Curios & Charms":{
    base:[
      {n:"carved token",mat:"wood",w:0.05,sp:[20,240]},
      {n:"braided cord bracelet",mat:"cloth",w:0.02,sp:[10,140]},
      {n:"pressed flower in paper",mat:"paper",w:0.01,sp:[10,120]},
      {n:"simple pendant",mat:"metal",w:0.04,sp:[30,300]}
    ],
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const icon=rng()<0.6?` bearing a ${pick(rng,SIMPLE_ICONS)}`:""; const animal=rng()<0.25?` and a tiny ${pick(rng,ANIMALS)}`:"";
      return [`${pick(rng,ADJS)} ${m} ${b.n}${icon}${animal}`, tags("curio","keepsake"), false]
    }
  },
  "Potions & Elixirs":{
    base:POTION_ITEMS,
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]);
      const hue=pick(rng,["ruby","sapphire","emerald","amber","opalescent","violet","smoky","golden"]);
      const swirl=rng()<0.4?` with ${pick(rng,PATTERNS)} swirls`:"";
      const scent=rng()<0.3?` smelling of ${pick(rng,SCENTS)}`:"";
      const effect=b.effect?` (${b.effect})`:"";
      return [`${toTitle(m)} vial of ${b.n} (${hue})${swirl}${scent}${effect}`, tags("potion","consumable","magical"), true]
    }
  },
  "Arcane Scrolls":{
    base:SCROLL_ITEMS,
    make:(rng,b)=>{
      const material=pick(rng,MATERIALS[b.mat]);
      const ribbon=pick(rng,["crimson","midnight","cerulean","gold-threaded","indigo","emerald"]);
      const glyph=rng()<0.4?` sealed with a ${pick(rng,SIMPLE_ICONS)} sigil`:"";
      const script=rng()<0.5?` inked in ${pick(rng,COLORS)} script`:"";
      const tier=`${b.school} spell (level ${b.level})`;
      return [`Scroll of ${b.n}, ${material} tied with ${ribbon} cord${glyph}${script} (${tier})`, tags("scroll","spell","magical","consumable"), true]
    }
  },
  "Bags & Containers":{
    base:BAG_ITEMS,
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const size=rng()<0.35?` (${pick(rng,SIZES)})`:""; const col=rng()<0.3?`, ${pick(rng,COLORS)}`:"";
      return [`${m} ${b.n}${size}${col}`, tags("container","storage"), false]
    }
  },
  "Mundane Adventuring Items":{
    base:MUNDANE_ITEMS,
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]); const cond=rng()<0.5?pick(rng,COND):"standard";
      return [`${cond} ${m} ${b.n}`, tags("mundane","gear","common"), false]
    }
  },
  "Weapons & Armor":{
    base:WEAPON_ARMOR_ITEMS,
    make:(rng,b)=>{
      const metalMats=['iron','steel','bronze','copper'];
      const m=b.mat==='metal'?pick(rng,metalMats):pick(rng,MATERIALS[b.mat]);
      const mark=rng()<0.2?` (${pick(rng,MARKS)})`:``;
      const parts=b.n.split(' ');
      const cond=toTitle(parts[0]);
      const item=parts.slice(1).join(' ');
      return [`${cond} ${m} ${item}${mark}`, tags("weapon","gear","equipment"), !!b.valuable]
    }
  },

  // --- Cursed Items (gated by toggle) ---
  "Cursed Items":{
    base:[
      // Severity 1: Minor trade-offs (appealing benefit, subtle drawback)
      {n:"lucky coin (+1 to initiative, but you sneeze loudly at the start of combat)",mat:"metal",w:0.05,sp:[150,350],severity:1},
      {n:"charming brooch (+1 to Charisma checks, but you compulsively compliment strangers)",mat:"metal",w:0.1,sp:[180,380],severity:1},
      {n:"keen quill (advantage on Investigation to decipher text, but it occasionally writes your secrets)",mat:"wood",w:0.02,sp:[160,340],severity:1},
      {n:"flask of warmth (keeps drinks perfect temperature, but you become mildly chatty when drinking)",mat:"metal",w:0.5,sp:[140,320],severity:1},
      {n:"weatherproof cloak (advantage vs rain/wind discomfort, but always smells faintly of wet dog)",mat:"cloth",w:1.5,sp:[200,400],severity:1},
      {n:"gloves of grip (+1 to climbing checks, but your hands feel uncomfortably warm)",mat:"leather",w:0.2,sp:[170,360],severity:1},
      {n:"mirror of confidence (+1 to Performance checks, but shows you slightly more attractive than reality)",mat:"glass",w:0.5,sp:[190,390],severity:1},
      {n:"dice of fortune (reroll 1s once per day, but must make DC 10 wisdom save to stop gambling when desired)",mat:"stone",w:0.1,sp:[220,420],severity:1},
      {n:"bag of organization (find items 50% faster, but they occasionally rearrange themselves noisily)",mat:"cloth",w:0.5,sp:[210,410],severity:1},
      {n:"hat of shade (advantage vs sun glare, but your hair is always messy when removed)",mat:"cloth",w:0.3,sp:[150,350],severity:1},

      // Severity 2: Noticeable trade-offs (good benefit, annoying drawback)
      {n:"boots of sure footing (+1 AC vs being knocked prone, but squeak when sneaking - disadvantage on Stealth)",mat:"leather",w:2.0,sp:[300,600],severity:2},
      {n:"ring of arcane memory (recall one forgotten spell slot 1/day, but finger itches intensely for 1 hour after)",mat:"metal",w:0.05,sp:[350,650],severity:2},
      {n:"cloak of many pockets (+10 lbs carry capacity, but attracts small insects that crawl out occasionally)",mat:"cloth",w:1.5,sp:[320,620],severity:2},
      {n:"honest pendant (+2 to Insight checks, but you sneeze when you lie)",mat:"metal",w:0.1,sp:[280,580],severity:2},
      {n:"bracelet of dexterity (+1 to Sleight of Hand, but causes harmless static shocks to allies)",mat:"metal",w:0.1,sp:[340,640],severity:2},
      {n:"belt of strength (carry +15 lbs, but loosens during strenuous activity - DC 10 DEX save or drop items)",mat:"leather",w:0.5,sp:[310,610],severity:2},
      {n:"spoon of sustenance (food is 25% more filling, but tastes completely bland)",mat:"metal",w:0.2,sp:[260,560],severity:2},
      {n:"lantern of clarity (bright light radius +5 ft, but goes out in the face of danger)",mat:"metal",w:2.0,sp:[380,680],severity:2},
      {n:"scarf of comfort (advantage vs cold weather, but occasionally tightens causing brief discomfort)",mat:"cloth",w:0.3,sp:[290,590],severity:2},
      {n:"coin pouch of plenty (holds 50 extra coins, but 1d4 copper falls out per hour, pc might notice or not)",mat:"leather",w:0.3,sp:[270,570],severity:2},

      // Severity 3: Meaningful trade-offs (strong benefit, notable drawback)
      {n:"keen dagger (+1 to hit and damage, but on killing blow deal 1d4 damage to self and victim's name scrawls on your skin)",mat:"metal",w:1.0,sp:[500,900],severity:3},
      {n:"amulet of preservation (food lasts twice as long, but fresh food tastes 'off' to you, causing mild nausea on 1d4 you throw up)",mat:"metal",w:0.2,sp:[450,850],severity:3},
      {n:"rope of escape (advantage on escape artist checks, but 10%(1d10) chance to untie itself during use)",mat:"cloth",w:5.0,sp:[520,920],severity:3},
      {n:"endless waterskin (refills with clean water at dawn, but water is always lukewarm and slightly metallic)",mat:"leather",w:2.0,sp:[480,880],severity:3},
      {n:"torch of revealing (bright light reveals invisible creatures within 10 ft, but casts disturbing shadow-faces 5% chance(1d20) to gain fear)",mat:"wood",w:1.0,sp:[540,940],severity:3},
      {n:"pack of holding (capacity +20 lbs, but feels 10 lbs heavier than contents)",mat:"cloth",w:6.0,sp:[600,1000],severity:3},
      {n:"resonant shield (+1 AC, but hums audibly in combat - disadvantage on Stealth during fights)",mat:"metal",w:6.0,sp:[650,1050],severity:3},
      {n:"helm of awareness (+2 to Perception, but causes mild headaches after 1 hour - disadvantage on CON saves)",mat:"metal",w:3.0,sp:[580,980],severity:3},
      {n:"beast pendant (advantage on Animal Handling, but wild animals detect you from 2x distance)",mat:"metal",w:0.1,sp:[530,930],severity:3},
      {n:"gloves of precision (+1 to ranged attacks, but everything you touch becomes slightly sticky)",mat:"leather",w:0.3,sp:[560,960],severity:3},

      // Severity 4: Strong benefit with risky drawback
      {n:"boots of haste (+10 ft movement, but on full speed movement roll 1d4: on 1 you slip and fall prone)",mat:"leather",w:3.0,sp:[800,1300],severity:4},
      {n:"ring of vigor (ignore first level of exhaustion, but disadvantage on first ability check each day)",mat:"metal",w:0.05,sp:[750,1250],severity:4},
      {n:"shadow cloak (+2 to Stealth in dim light, but you're more visible in shadows to darkvision)",mat:"cloth",w:2.0,sp:[850,1350],severity:4},
      {n:"gauntlets of power (+2 to Athletics, but roll 1d20 daily: on 1 you fumble and drop held items)",mat:"metal",w:2.0,sp:[900,1400],severity:4},
      {n:"adaptive armor (+1 AC and resist 3 cold OR fire damage, but constantly uncomfortable opposite temperature)",mat:"metal",w:20.0,sp:[1000,1500],severity:4},
      {n:"earring of keen hearing (+3 to Perception for sounds, but disadvantage on saves vs thunder damage)",mat:"metal",w:0.05,sp:[780,1280],severity:4},
      {n:"lucky brooch (reroll one failed save per day, but attract minor misfortune - DM adds 1 random complication)",mat:"metal",w:0.1,sp:[820,1320],severity:4},
      {n:"bag of retrieval (retrieve specific item as bonus action, but 5% chance it swaps with random item)",mat:"cloth",w:1.0,sp:[770,1270],severity:4},
      {n:"quenching canteen (water restores +2 HP once per day, but you require 50% more water to avoid dehydration)",mat:"metal",w:1.5,sp:[740,1240],severity:4},
      {n:"bracers of the grave (+2 to hit vs undead, but undead sense you from 2x distance)",mat:"leather",w:1.0,sp:[810,1310],severity:4},

      // Severity 5: Powerful benefit with serious consequence
      {n:"bloodthirsty blade (+2 to hit and damage, but if not used to damage a creature daily take 2d4 psychic damage at dawn)",mat:"metal",w:3.0,sp:[1400,2000],severity:5},
      {n:"armor of false security (+2 AC, but critical hits against you occur on 19-20)",mat:"metal",w:25.0,sp:[1600,2200],severity:5},
      {n:"ring of triumph (turn two failed saves into success per day, but natural 20s reroll - if lower use lower result)",mat:"metal",w:0.05,sp:[1300,1900],severity:5},
      {n:"cloak of shadows (+3 to Stealth checks, but disadvantage on all Stealth in bright light)",mat:"cloth",w:2.5,sp:[1450,2050],severity:5},
      {n:"boots of the endless road (+15 ft movement, but must walk 5+ miles daily or gain 1 exhaustion at dawn)",mat:"leather",w:3.0,sp:[1550,2150],severity:5},
      {n:"helm of iron mind (+2 to WIS saves, but 1/week suffer nightmares - no long rest benefits that night)",mat:"metal",w:4.0,sp:[1700,2300],severity:5},
      {n:"amulet of destiny (advantage on death saves, but divination magic and scrying vs you has advantage)",mat:"metal",w:0.3,sp:[1500,2100],severity:5},
      {n:"gloves of the duelist (+1 to attack rolls, but on natural 1 you fumble and fling your weapon 1d20 feet)",mat:"leather",w:0.4,sp:[1400,2000],severity:5},
      {n:"belt of the titan (carry capacity +100 lbs, but base capacity reduced by 50 lbs - net +50)",mat:"leather",w:1.0,sp:[1350,1950],severity:5},
      {n:"pendant of primal fury (+2 damage vs beasts and monstrosities, but they detect and prioritize you from 3x distance)",mat:"metal",w:0.2,sp:[1600,2200],severity:5}
    ],
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]);
      const allure=pick(rng,["beautifully crafted","masterwork quality","elegantly designed","finely made","exquisitely detailed"]);
      const severityTag = `curse-${b.severity}`;
      return [`${toTitle(m)} ${b.n}, ${allure}`, tags("cursed",severityTag,"magical"), true]
    }
  },

  // --- Minor Magic (gated by toggle) ---
  "Minor Magic":{
    base:[
      // Consumables - Healing & Recovery
      {n:"tonic of vigor (one use)",mat:"glass",w:0.3,sp:[400,900],kind:"consumable"},
      {n:"salve of mending (heals minor wounds)",mat:"glass",w:0.2,sp:[350,850],kind:"consumable"},
      {n:"restorative tea (removes fatigue)",mat:"paper",w:0.1,sp:[300,750],kind:"consumable"},
      {n:"vial of clarity (advantage on next save vs mind effects)",mat:"glass",w:0.2,sp:[450,950],kind:"consumable"},

      // Consumables - Combat & Defense
      {n:"smoke charm (one stealth test advantage)",mat:"cloth",w:0.1,sp:[350,800],kind:"consumable"},
      {n:"oil of edge (sharpen once, +1 damage one attack)",mat:"glass",w:0.2,sp:[450,1000],kind:"consumable"},
      {n:"warding ribbon (one save bolster)",mat:"cloth",w:0.05,sp:[350,900],kind:"consumable"},
      {n:"shield charm (one automatic hit becomes miss)",mat:"metal",w:0.1,sp:[550,1100],kind:"consumable"},
      {n:"thunderstone (thrown, loud bang, disorient)",mat:"stone",w:0.5,sp:[400,900],kind:"consumable"},
      {n:"flash powder (thrown, bright light, blind)",mat:"paper",w:0.1,sp:[400,900],kind:"consumable"},
      {n:"tanglefoot bag (thrown, restrain briefly)",mat:"cloth",w:1.0,sp:[450,950],kind:"consumable"},

      // Consumables - Movement & Utility
      {n:"feather token (negate a short fall once)",mat:"paper",w:0.05,sp:[500,1100],kind:"consumable"},
      {n:"boots of springing (one enhanced jump)",mat:"leather",w:0.5,sp:[500,1100],kind:"consumable"},
      {n:"potion of water breathing (10 minutes)",mat:"glass",w:0.3,sp:[600,1200],kind:"consumable"},
      {n:"dust of tracelessness (erase tracks for 1 hour)",mat:"paper",w:0.1,sp:[450,1000],kind:"consumable"},
      {n:"feather fall token (slow fall for 1 minute)",mat:"paper",w:0.05,sp:[550,1150],kind:"consumable"},

      // Consumables - Social & Luck
      {n:"lucky coin (one d20 reroll, once)",mat:"metal",w:0.05,sp:[600,1200],kind:"consumable"},
      {n:"charm of persuasion (advantage on one charisma check)",mat:"metal",w:0.05,sp:[400,900],kind:"consumable"},
      {n:"vial of courage (advantage vs one fear effect)",mat:"glass",w:0.2,sp:[350,850],kind:"consumable"},
      {n:"token of truth (know if next statement is lie)",mat:"metal",w:0.05,sp:[500,1000],kind:"consumable"},

      // Situational Gear - Exploration
      {n:"guide's pin (advantage on one navigation check)",mat:"metal",w:0.05,sp:[500,1200],kind:"gear"},
      {n:"wayfinder's compass (points to nearest settlement)",mat:"metal",w:0.3,sp:[700,1400],kind:"gear"},
      {n:"lens of detection (advantage on one search check)",mat:"glass",w:0.1,sp:[550,1150],kind:"gear"},
      {n:"ear trumpet of listening (advantage on one perception check)",mat:"metal",w:0.4,sp:[500,1100],kind:"gear"},
      {n:"dowsing rod (detect water within 100 ft)",mat:"wood",w:0.5,sp:[450,1000],kind:"gear"},

      // Situational Gear - Knowledge & Magic
      {n:"scribe's quill (advantage on one recall/decipher check)",mat:"wood",w:0.02,sp:[500,1200],kind:"gear"},
      {n:"scholar's monocle (read one language you don't know)",mat:"glass",w:0.1,sp:[650,1300],kind:"gear"},
      {n:"candle of revealing (detect invisible within 10 ft)",mat:"cloth",w:0.2,sp:[700,1400],kind:"gear"},
      {n:"chalk of warding (draw protective circle, 1 hour)",mat:"stone",w:0.1,sp:[550,1150],kind:"gear"},
      {n:"crystal of light (bright light 30 ft, 1 hour)",mat:"stone",w:0.3,sp:[400,900],kind:"gear"},

      // Situational Gear - Tools & Craft
      {n:"hammer of mending (repair one broken mundane item)",mat:"metal",w:1.0,sp:[600,1250],kind:"gear"},
      {n:"rope of climbing (advantage on climbing with this rope)",mat:"cloth",w:5.0,sp:[800,1600],kind:"gear"},
      {n:"thieves' gloves (advantage on one lockpicking attempt)",mat:"leather",w:0.2,sp:[650,1300],kind:"gear"},
      {n:"bag of endless knots (never runs out of rope, 50ft max)",mat:"cloth",w:0.5,sp:[750,1500],kind:"gear"},

      // Situational Gear - Nature & Animals
      {n:"beast whistle (calm one animal)",mat:"wood",w:0.1,sp:[450,950],kind:"gear"},
      {n:"druid's seed (grow edible fruit instantly, once)",mat:"wood",w:0.05,sp:[400,900],kind:"gear"},
      {n:"weatherglass (predict weather 24 hours ahead)",mat:"glass",w:0.4,sp:[550,1150],kind:"gear"},

      // Ongoing Minor Items (very limited power)
      {n:"everburning torch (sheds light, never consumed)",mat:"wood",w:1.0,sp:[1200,2400],kind:"ongoing"},
      {n:"self-heating mug (keeps beverages warm)",mat:"metal",w:0.5,sp:[500,1100],kind:"ongoing"},
      {n:"cleaning cloth (removes dirt/stains with a wipe)",mat:"cloth",w:0.1,sp:[400,900],kind:"ongoing"},
      {n:"compass of true north (always points north)",mat:"metal",w:0.2,sp:[600,1200],kind:"ongoing"},
      {n:"tankard of purity (detects poison in drink)",mat:"metal",w:0.6,sp:[750,1500],kind:"ongoing"},
      {n:"prestidigitation ring (create minor sensory effects)",mat:"metal",w:0.05,sp:[800,1600],kind:"ongoing"},
      {n:"warming cloak clasp (wearer comfortable in cold)",mat:"metal",w:0.1,sp:[700,1400],kind:"ongoing"},
      {n:"cooling hat pin (wearer comfortable in heat)",mat:"metal",w:0.05,sp:[700,1400],kind:"ongoing"},
      // Baldur's Gate inspired curios
      {n:"smoldercoil circlet (spark a torch on command)",mat:"metal",w:0.15,sp:[700,1400],kind:"gear"},
      {n:"umbrawhisper boots (muffle footsteps for 1 minute)",mat:"leather",w:1.1,sp:[720,1450],kind:"gear"},
      {n:"silverstrike ring (add +1 to one weapon attack per rest)",mat:"metal",w:0.05,sp:[720,1500],kind:"gear"},
      {n:"glimmerfen cloak clasp (advantage on one Stealth check)",mat:"metal",w:0.08,sp:[700,1400],kind:"gear"},
      {n:"astral attunement charm (reroll a failed Arcana check once)",mat:"stone",w:0.1,sp:[750,1500],kind:"gear"},
      {n:"harper signal chord (emit a soft note audible to allies)",mat:"cloth",w:0.05,sp:[680,1300],kind:"gear"},
      {n:"redrook courier sash (dash as bonus action once)",mat:"cloth",w:0.2,sp:[760,1500],kind:"gear"},
      {n:"illuminator's quill (scribe glowing text for 1 hour)",mat:"wood",w:0.05,sp:[680,1350],kind:"gear"},
      {n:"duskward rosary (advantage on one Wisdom save vs charm)",mat:"stone",w:0.12,sp:[780,1550],kind:"gear"},
      {n:"hellspark vial (burst of harmless fireworks distraction)",mat:"glass",w:0.3,sp:[700,1300],kind:"consumable"},
      {n:"forgehand wraps (steady grip in freezing temps)",mat:"cloth",w:0.25,sp:[720,1400],kind:"ongoing"},
      {n:"wyrm-etched brooch (sense nearest dragon for 1 minute)",mat:"metal",w:0.1,sp:[780,1500],kind:"gear"},
      {n:"songsteel tuning fork (advantage on next Performance check)",mat:"metal",w:0.2,sp:[680,1350],kind:"gear"},
      {n:"moorbound lantern shard (emit dim blue light on command)",mat:"glass",w:0.35,sp:[650,1200],kind:"ongoing"},
      {n:"emerald veil visor (ignore bright light penalties briefly)",mat:"metal",w:0.3,sp:[720,1400],kind:"gear"},
      {n:"archfey whisperleaf (understand Sylvan for 10 minutes)",mat:"cloth",w:0.05,sp:[760,1500],kind:"consumable"},
      {n:"gauntlet of steady aim (once add +2 to a ranged attack)",mat:"metal",w:0.6,sp:[780,1500],kind:"gear"},
      {n:"psalm-toned bell (calm frightened allies within 10 ft)",mat:"metal",w:0.4,sp:[700,1300],kind:"gear"},
      {n:"miststep sandals (reduce fall damage by 1d6 once per day)",mat:"cloth",w:0.9,sp:[780,1500],kind:"gear"},
      {n:"ebonroot charm (advantage on one Nature check)",mat:"wood",w:0.08,sp:[650,1200],kind:"gear"}
    ],
    make:(rng,b)=>{
      const m=pick(rng,MATERIALS[b.mat]);
      const glimmer=rng()<0.6?` faintly glimmering`:"";
      const note=b.kind==="consumable"?"consumable":(b.kind==="ongoing"?"ongoing":"situational");
      return [`${toTitle(m)} ${b.n}${glimmer}`, tags("minor-magic",note), true]
    }
  }
};

// ---------- Hoard Template biases ----------
const TEMPLATE = {
  none:{ catMult:{}, bundleBias:{}, flavor:[] },
  bandit:{
    catMult:{ "Coins & Purses":1.2,"Trade Goods":1.1,"Toolkits & Supplies":1.0,"Adventuring Gear of Note":1.0,"Curios & Charms":0.9,"Gems & Art":0.8,"Weapons & Armor":1.3 },
    bundleBias:{ smuggler:0.35, hunter:0.15, merchant:0.2 },
    flavor:["smoke-stained","hastily wrapped","mud-spattered","with crude tally marks"]
  },
  cult:{
    catMult:{ "Writing & Games":1.15,"Toolkits & Supplies":1.1,"Gems & Art":1.1,"Household & Table":0.9,"Trade Goods":0.9,"Weapons & Armor":0.9 },
    bundleBias:{ smuggler:0.15, hunter:0.05, merchant:0.1 },
    flavor:["daubed with chalk sigils","faint incense scent","bound in dark ribbon","scribed margins"]
  },
  noble:{
    catMult:{ "Gems & Art":1.4,"Trade Goods":1.2,"Coins & Purses":1.1,"Clothing & Wearables":1.1,"Curios & Charms":0.8,"Weapons & Armor":0.8 },
    bundleBias:{ merchant:0.35, smuggler:0.1, hunter:0.05 },
    flavor:["wax seal stamped","finely chased","embroidered crest","wrapped in silk"]
  },
  goblin:{
    catMult:{ "Food & Provisions":1.2,"Bags & Containers":1.1,"Tools & Utensils":1.1,"Coins & Purses":0.9,"Gems & Art":0.7,"Weapons & Armor":1.2 },
    bundleBias:{ hunter:0.4, smuggler:0.1, merchant:0.05 },
    flavor:["sticky resin smell","crudely knotted","patchwork repairs","scratched with tally cuts"]
  },
  ship:{
    catMult:{ "Trade Goods":1.3,"Toolkits & Supplies":1.2,"Bags & Containers":1.1,"Coins & Purses":1.0,"Weapons & Armor":1.1 },
    bundleBias:{ merchant:0.45, smuggler:0.3, hunter:0.05 },
    flavor:["tarred twine","salt-stained","stenciled crate marks","sealed with pitch"]
  },
  wizard:{
    catMult:{ "Writing & Games":1.25,"Toolkits & Supplies":1.2,"Adventuring Gear of Note":1.1,"Gems & Art":1.05,"Weapons & Armor":0.7 },
    bundleBias:{ smuggler:0.15, merchant:0.2, hunter:0.05 },
    flavor:["ink-splattered","annotated margin","arcane diagram stamps","scent of ozone"]
  },
  tomb:{
    catMult:{"Gems & Art":1.4,"Clothing & Wearables":1.3,"Curios & Charms":1.5,"Writing & Games":1.2,"Coins & Purses":1.1,"Weapons & Armor":1.2,"Mundane Adventuring Items":0.7,"Food & Provisions":0.3},
    bundleBias:{merchant:0.1,smuggler:0.05,hunter:0.1},
    flavor:["dust-covered","etched with funerary marks","centuries-preserved","grave-touched","stone-cold"]
  },
  barracks:{
    catMult:{"Weapons & Armor":2.2,"Mundane Adventuring Items":1.5,"Toolkits & Supplies":1.2,"Food & Provisions":1.1,"Coins & Purses":0.9,"Clothing & Wearables":1.1,"Gems & Art":0.7,"Curios & Charms":0.5},
    bundleBias:{hunter:0.35,merchant:0.1,smuggler:0.05},
    flavor:["standard-issue","military-stamped","campaign-worn","field-tested","battle-ready"]
  }
};

// ---------- Monster-specific loot templates ----------
const MONSTER_TEMPLATES = {
  dragon:{
    catMult:{ "Gems & Art":2.0,"Coins & Purses":1.8,"Trade Goods":1.3,"Adventuring Gear of Note":1.2,"Minor Magic":1.5 },
    bundleBias:{ merchant:0.3, smuggler:0.05, hunter:0.05 },
    flavor:["scorched edges","melted slightly","gleaming","ancient","partially fused"]
  },
  lich:{
    catMult:{ "Writing & Games":1.8,"Toolkits & Supplies":1.5,"Gems & Art":1.4,"Minor Magic":1.6,"Curios & Charms":1.3 },
    bundleBias:{ smuggler:0.2, merchant:0.15, hunter:0.05 },
    flavor:["necromantic runes","bone-white","desiccated","ancient parchment","death-touched"]
  },
  vampire:{
    catMult:{ "Gems & Art":1.6,"Clothing & Wearables":1.5,"Coins & Purses":1.4,"Trade Goods":1.3,"Minor Magic":1.2 },
    bundleBias:{ merchant:0.35, smuggler:0.15, hunter:0.05 },
    flavor:["blood-stained","velvet-lined","aristocratic","night-black","crimson accents"]
  },
  beholder:{
    catMult:{ "Gems & Art":1.7,"Curios & Charms":1.5,"Minor Magic":1.8,"Writing & Games":1.2,"Toolkits & Supplies":1.3 },
    bundleBias:{ smuggler:0.25, merchant:0.2, hunter:0.1 },
    flavor:["alien geometry","faintly humming","prismatic","eye-shaped motif","arcane resonance"]
  },
  giant:{
    catMult:{ "Food & Provisions":1.5,"Bags & Containers":1.3,"Trade Goods":1.4,"Coins & Purses":1.2,"Mundane Adventuring Items":1.3,"Weapons & Armor":1.3 },
    bundleBias:{ hunter:0.4, merchant:0.25, smuggler:0.1 },
    flavor:["oversized","crudely fashioned","massive scale","boulder-sized","primitive"]
  },
  demon:{
    catMult:{ "Gems & Art":1.5,"Minor Magic":1.7,"Curios & Charms":1.4,"Coins & Purses":1.3 },
    bundleBias:{ smuggler:0.3, merchant:0.15, hunter:0.1 },
    flavor:["sulfurous","infernal script","smoldering","cursed-looking","abyssal"]
  },
  fey:{
    catMult:{ "Curios & Charms":1.8,"Gems & Art":1.5,"Clothing & Wearables":1.4,"Minor Magic":1.6,"Food & Provisions":1.3 },
    bundleBias:{ merchant:0.2, smuggler:0.15, hunter:0.2 },
    flavor:["rainbow-hued","gossamer","moonlit","star-kissed","enchanted shimmer"]
  },
  aberration:{
    catMult:{ "Curios & Charms":1.6,"Writing & Games":1.4,"Minor Magic":1.5,"Gems & Art":1.2 },
    bundleBias:{ smuggler:0.3, merchant:0.1, hunter:0.15 },
    flavor:["otherworldly","non-euclidean","pulsating","mind-bending","eldritch"]
  },
  undead:{
    catMult:{ "Coins & Purses":1.3,"Gems & Art":1.2,"Clothing & Wearables":1.2,"Mundane Adventuring Items":1.1,"Weapons & Armor":1.1 },
    bundleBias:{ merchant:0.2, hunter:0.15, smuggler:0.15 },
    flavor:["grave-touched","musty","decayed","tomb-sealed","centuries-old"]
  }
};
