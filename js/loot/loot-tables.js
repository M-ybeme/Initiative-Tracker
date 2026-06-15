// ---------- Flavor Pools ----------
const COLORS=["umber","sable","ash","ivory","verdant","ochre","crimson","indigo","cobalt","pearl","smoke","rust","teal","brass"];
const ADJS=["plain","neatly made","well-used","serviceable","careworn","sturdy","dainty","homespun","faded","scuffed","polished","patched","clean","oiled","balanced"];
const COND=["mint","good","used","worn","weathered","patched","chipped","tarnished","dented","frayed","scuffed","stained"];
const PATTERNS=["herringbone","chevron","crosshatch","spiral","flecked","ringed","braided","stitched","knotted","grooved"];
const MARKS=["simple maker's mark","initials (illegible)","tiny circle stamp","plain triangle stamp","short tally mark","simple hash","basic starburst","three dots"];
const MATERIALS={ cloth:["linen","wool","cotton","canvas","burlap","felt","silk"], leather:["leather","boiled leather","suede","rawhide"], wood:["oak","ashwood","birch","maple","yew","pine","walnut"], metal:["iron","bronze","copper","pewter","brass","tin","steel","silver"], stone:["riverstone","slate","granite","marble chip","soapstone","basalt"], clay:["terracotta","earthenware","stoneware"], glass:["clear glass","green glass","smoked glass"], paper:["rag paper","vellum","parchment"] };
const SIZES=["miniature","small","hand-sized","broad","long","wide","narrow","compact","thin","thick"];
const SCENTS=["oiled","soap-scented","smoky","spice-dusted","fresh","musty","earthy","herbal","neutral"];
const ANIMALS=["stag","fox","herring","sparrow","boar","ram","hare","owl","wolf","bee"];
const SIMPLE_ICONS=["leaf","sun","moon","key","wheel","hammer","anvil","cup","sheaf","river"];

// ---------- Item arrays (build functions declared below are hoisted) ----------
const COIN_ITEMS=buildCoinEntries();
const FOOD_ITEMS=buildFoodEntries();
const TOOL_ITEMS=buildToolEntries();
const MUNDANE_ITEMS=buildMundaneEntries();
const WEAPON_ARMOR_ITEMS=buildWeaponArmorEntries();
const POTION_ITEMS=buildPotionEntries();
const SCROLL_ITEMS=buildScrollEntries();
const GEM_ITEMS=buildGemEntries();
const ADV_GEAR_ITEMS=buildAdventuringGearEntries();
const TOOLKIT_ITEMS=buildToolkitEntries();
const BAG_ITEMS=buildBagEntries();
const CLOTHING_ITEMS=buildClothingEntries();

// ---------- Build functions ----------

function buildCoinEntries(){
  const forms=[
    {root:'coin purse',mat:'leather',weight:0.2,sp:[20,180]},
    {root:'drawstring pouch',mat:'cloth',weight:0.15,sp:[10,140]},
    {root:'belt wallet',mat:'leather',weight:0.18,sp:[30,200]},
    {root:'hidden ankle purse',mat:'cloth',weight:0.12,sp:[15,160]},
    {root:'lockable strong-purse',mat:'leather',weight:0.3,sp:[60,260]},
    {root:'token tube',mat:'metal',weight:0.22,sp:[40,250]},
    {root:'ledger wallet',mat:'leather',weight:0.28,sp:[55,280]},
    {root:'sailor scrip',mat:'cloth',weight:0.2,sp:[18,180]}
  ];
  const textures=['stitched','embroidered','reinforced','paneled','beaded','oiled','patched','polished','quilted','riveted'];
  const closures=['with brass clasp','with copper buttons','with bone toggles','with braided cord','with hidden buckle','sealed with wax disc','with rune laces','with tiny padlock','with silver chain'];
  const flourishes=['lined in velvet','lined in felt','lined in suede','lined in canvas','bearing tally marks','with secret pocket','with coin dividers','scented with lavender','smelling of smoke','reinforced mouth'];
  const variants=[];
  let capReached=false;
  for(const form of forms){
    if(capReached) break;
    for(let i=0;i<textures.length;i++){
      if(capReached) break;
      for(let j=0;j<closures.length;j++){
        const flourish=flourishes[(i+j)%flourishes.length];
        const min=form.sp[0]+i*5+j*3;
        const max=form.sp[1]+i*5+j*3+20;
        variants.push({
          n:`${textures[i]} ${form.root} ${closures[j]} (${flourish})`,
          mat:form.mat,
          w:form.weight,
          sp:[min,max],
          valuable:j>=5||i>=5
        });
        if(variants.length>=90){ capReached=true; break; }
      }
    }
  }
  if(variants.length<120){
    const humble=[
      {root:'threadbare purse',mat:'cloth',weight:0.1,sp:[5,40]},
      {root:'patched pouch',mat:'cloth',weight:0.12,sp:[8,55]},
      {root:'simple belt satchel',mat:'leather',weight:0.15,sp:[10,70]},
      {root:'plain cord roll',mat:'cloth',weight:0.08,sp:[6,45]},
      {root:'worn travel purse',mat:'leather',weight:0.14,sp:[12,80]},
      {root:'market coin wrap',mat:'cloth',weight:0.09,sp:[9,60]},
      {root:'sailcloth pouch',mat:'cloth',weight:0.11,sp:[7,65]},
      {root:'linen bankroll',mat:'cloth',weight:0.1,sp:[8,70]},
      {root:'simple lockbox',mat:'metal',weight:0.4,sp:[20,120]},
      {root:'twine-bound purse',mat:'cloth',weight:0.09,sp:[5,55]}
    ];
    const trims=['frayed drawstring','patched base','plain stitching','waxed mouth','reinforced lip','spare loop','button clasp','ribbon tie','tucked flap','braided cinch'];
    for(const base of humble){
      for(let k=0;k<trims.length;k++){
        variants.push({
          n:`${base.root} (${trims[k]})`,
          mat:base.mat,
          w:base.weight,
          sp:[base.sp[0],base.sp[1]+k*2],
          valuable:false
        });
        if(variants.length>=120)break;
      }
      if(variants.length>=120)break;
    }
  }
  return variants;
}

function buildFoodEntries(){
  const bases=[
    {item:'dried fruit packet',mat:'cloth',w:0.2,sp:[8,120]},
    {item:'hardtack stack',mat:'paper',w:0.3,sp:[6,80]},
    {item:'smoked nuts pouch',mat:'cloth',w:0.2,sp:[10,140]},
    {item:'cheese wedge',mat:'paper',w:0.3,sp:[10,160]},
    {item:'pickled vegetable jar',mat:'glass',w:0.5,sp:[12,170]},
    {item:'salted fish filet',mat:'cloth',w:0.4,sp:[14,180]},
    {item:'jerky strip bundle',mat:'cloth',w:0.3,sp:[16,190]},
    {item:'travel stew concentrate',mat:'metal',w:0.35,sp:[18,210]},
    {item:'honey cake tin',mat:'metal',w:0.4,sp:[15,200]},
    {item:'herbal tea sachet set',mat:'paper',w:0.2,sp:[12,160]}
  ];
  const flavors=['spiced','peppered','smoked','candied','herbed','maple-glazed','citrus-dusted','garlic-roasted','berry-infused','savory'];
  const wrappings=['wrapped in waxed cloth','sealed in oilskin','bundled with twine','packed in tin','tucked into parchment','bound with reed cord'];
  const entries=[];
  for(const base of bases){
    for(let i=0;i<flavors.length;i++){
      const wrap=wrappings[i%wrappings.length];
      const min=base.sp[0]+i*2;
      const max=base.sp[1]+i*4;
      entries.push({
        n:`${flavors[i]} ${base.item} (${wrap})`,
        mat:base.mat,
        w:base.w,
        sp:[min,max]
      });
    }
  }
  const rustic=[
    {item:'simple trail bread',mat:'cloth',w:0.2,sp:[4,30]},
    {item:'barley biscuit pack',mat:'cloth',w:0.25,sp:[5,35]},
    {item:'root vegetable chips',mat:'paper',w:0.2,sp:[6,40]},
    {item:'dried berry satchel',mat:'cloth',w:0.2,sp:[7,45]},
    {item:'bean mash pouch',mat:'cloth',w:0.3,sp:[6,38]},
    {item:'lentil wafers',mat:'paper',w:0.2,sp:[5,32]},
    {item:'honeyed oat bar',mat:'paper',w:0.15,sp:[8,42]},
    {item:'mineral water flask',mat:'glass',w:0.4,sp:[10,50]},
    {item:'lemon pepper jerky',mat:'cloth',w:0.25,sp:[12,60]},
    {item:'camp stew jar',mat:'glass',w:0.5,sp:[15,70]}
  ];
  const prep=['lightly salted','pepper dusted','garlic brushed','with rosemary','with thyme','with sesame','with fig glaze'];
  for(const base of rustic){
    for(const tag of prep){
      entries.push({
        n:`${tag} ${base.item}`,
        mat:base.mat,
        w:base.w,
        sp:[base.sp[0],base.sp[1]],
        valuable:false
      });
      if(entries.length>=150)break;
    }
    if(entries.length>=150)break;
  }
  return entries;
}

function buildToolEntries(){
  const bases=[
    {item:'folding knife',mat:'metal',w:0.2,sp:[60,300]},
    {item:'small hammer',mat:'metal',w:0.8,sp:[40,260]},
    {item:'awl',mat:'metal',w:0.1,sp:[10,120]},
    {item:'whetstone',mat:'stone',w:0.7,sp:[12,90]},
    {item:'needle kit',mat:'metal',w:0.05,sp:[20,160]},
    {item:'hand drill',mat:'metal',w:0.6,sp:[45,220]},
    {item:'carver chisel',mat:'metal',w:0.4,sp:[30,210]},
    {item:'rasp file',mat:'metal',w:0.5,sp:[30,200]},
    {item:'pliers set',mat:'metal',w:0.4,sp:[35,210]},
    {item:'measuring cord',mat:'cloth',w:0.1,sp:[15,120]}
  ];
  const finishes=['balanced','well-oiled','field-repaired','polished','well-used','reinforced','rubber-gripped','twin-handled','sturdy','lightweight'];
  const engravings=['etched grid','guiding arrow','sunburst','gear motif','wave pattern','ivy scroll','starline','maker mark'];
  const entries=[];
  for(const base of bases){
    for(let i=0;i<finishes.length;i++){
      const engraving=engravings[i%engravings.length];
      const min=base.sp[0]+i*3;
      const max=base.sp[1]+i*3+20;
      entries.push({
        n:`${finishes[i]} ${base.item} (${engraving})`,
        mat:base.mat,
        w:base.w,
        sp:[min,max]
      });
    }
  }
  const handy=[
    {item:'basic awl',mat:'metal',w:0.08,sp:[5,25]},
    {item:'tin snips',mat:'metal',w:0.3,sp:[8,35]},
    {item:'leather punch',mat:'metal',w:0.2,sp:[7,28]},
    {item:'mini saw',mat:'metal',w:0.35,sp:[10,40]},
    {item:'chalk line kit',mat:'cloth',w:0.25,sp:[6,24]},
    {item:'simple calipers',mat:'metal',w:0.3,sp:[12,38]},
    {item:'wax sticks',mat:'cloth',w:0.15,sp:[4,18]},
    {item:'hand ceramic scraper',mat:'metal',w:0.25,sp:[9,32]},
    {item:'needle bundle',mat:'metal',w:0.05,sp:[3,16]},
    {item:'braiding comb',mat:'wood',w:0.05,sp:[4,20]}
  ];
  for(const base of handy){
    entries.push({
      n:`${base.item} (well-used)`,
      mat:base.mat,
      w:base.w,
      sp:[base.sp[0],base.sp[1]],
      valuable:false
    });
    entries.push({
      n:`${base.item} (refurbished)`,
      mat:base.mat,
      w:base.w,
      sp:[base.sp[0]+3,base.sp[1]+6],
      valuable:false
    });
    if(entries.length>=140)break;
  }
  return entries;
}

function buildMundaneEntries(){
  const bases=[
    {item:'50 ft hempen rope',mat:'cloth',w:10,sp:[10,30]},
    {item:'silk rope',mat:'cloth',w:5,sp:[50,120]},
    {item:'torch bundle',mat:'wood',w:5,sp:[5,15]},
    {item:'bedroll',mat:'cloth',w:7,sp:[10,30]},
    {item:'travel rations',mat:'cloth',w:10,sp:[35,70]},
    {item:'candle pack',mat:'cloth',w:0.5,sp:[1,5]},
    {item:'tinderbox',mat:'metal',w:1,sp:[5,15]},
    {item:'grappling hook',mat:'metal',w:4,sp:[20,60]},
    {item:'crowbar',mat:'metal',w:5,sp:[20,60]},
    {item:'10 ft pole',mat:'wood',w:7,sp:[5,15]},
    {item:'chalk bundle',mat:'stone',w:0.2,sp:[1,5]},
    {item:'iron spikes',mat:'metal',w:5,sp:[10,30]},
    {item:'hooded lantern',mat:'metal',w:2,sp:[50,150]},
    {item:'oil flask',mat:'glass',w:1,sp:[1,10]},
    {item:'shovel',mat:'metal',w:5,sp:[20,60]},
    {item:'two-person tent',mat:'cloth',w:20,sp:[20,60]},
    {item:'backpack',mat:'cloth',w:5,sp:[20,60]},
    {item:'caltrops bag',mat:'metal',w:2,sp:[10,30]},
    {item:'10 ft chain',mat:'metal',w:10,sp:[50,150]},
    {item:'fishing tackle',mat:'cloth',w:4,sp:[10,30]},
    {item:'signal whistle',mat:'metal',w:0.1,sp:[5,15]},
    {item:'piton set',mat:'metal',w:4,sp:[20,60]},
    {item:'waterskin',mat:'leather',w:2,sp:[12,40]},
    {item:'mess kit',mat:'metal',w:1,sp:[10,40]},
    {item:'hand saw',mat:'metal',w:3,sp:[25,70]}
  ];
  const descriptors=['standard','reinforced','waxed','oiled','well-worn','newly issued','patched','canvas-bound','iron-banded','field-tested'];
  const entries=[];
  for(const base of bases){
    for(let i=0;i<descriptors.length;i++){
      const min=base.sp[0]+i;
      const max=base.sp[1]+i*2;
      entries.push({
        n:`${descriptors[i]} ${base.item}`,
        mat:base.mat,
        w:base.w,
        sp:[min,max]
      });
    }
  }
  if(entries.length<150){
    const filler=[
      {item:'wooden spoon set',mat:'wood',w:0.3,sp:[2,12]},
      {item:'camp mug pair',mat:'metal',w:0.4,sp:[3,15]},
      {item:'patch kit',mat:'cloth',w:0.2,sp:[4,18]},
      {item:'tin of buttons',mat:'metal',w:0.3,sp:[5,22]},
      {item:'simple cordage roll',mat:'cloth',w:0.4,sp:[6,26]},
      {item:'chalkboard slate',mat:'stone',w:0.6,sp:[8,30]},
      {item:'hand broom',mat:'wood',w:0.5,sp:[4,20]},
      {item:'mess tin lid',mat:'metal',w:0.3,sp:[3,16]},
      {item:'camp skillet',mat:'metal',w:1.5,sp:[9,32]},
      {item:'simple tarp squares',mat:'cloth',w:0.8,sp:[7,28]}
    ];
    const states=['basic','patched','camp-used','market-ready','waxed'];
    for(const base of filler){
      for(const state of states){
        entries.push({
          n:`${state} ${base.item}`,
          mat:base.mat,
          w:base.w,
          sp:[base.sp[0],base.sp[1]],
          valuable:false
        });
        if(entries.length>=150)break;
      }
      if(entries.length>=150)break;
    }
  }
  return entries;
}

function buildWeaponArmorEntries(){
  const weapons=[
    {n:'dagger',mat:'metal',w:1,sp:[10,55]},
    {n:'handaxe',mat:'metal',w:2,sp:[40,120]},
    {n:'shortsword',mat:'metal',w:2,sp:[80,220]},
    {n:'longsword',mat:'metal',w:3,sp:[100,320]},
    {n:'mace',mat:'metal',w:4,sp:[40,130]},
    {n:'quarterstaff',mat:'wood',w:4,sp:[2,30]},
    {n:'spear',mat:'metal',w:3,sp:[8,50]},
    {n:'javelin',mat:'metal',w:2,sp:[4,30]},
    {n:'hand crossbow',mat:'wood',w:3,sp:[600,1100]},
    {n:'light crossbow',mat:'wood',w:5,sp:[200,460]},
    {n:'shortbow',mat:'wood',w:2,sp:[200,460]},
    {n:'longbow',mat:'wood',w:2,sp:[400,750]},
    {n:'warhammer',mat:'metal',w:2,sp:[120,280]},
    {n:'battleaxe',mat:'metal',w:4,sp:[80,220]},
    {n:'greataxe',mat:'metal',w:7,sp:[240,480]},
    {n:'greatsword',mat:'metal',w:6,sp:[400,780]},
    {n:'flail',mat:'metal',w:2,sp:[80,220]},
    {n:'rapier',mat:'metal',w:2,sp:[200,460]},
    {n:'scimitar',mat:'metal',w:3,sp:[200,460]},
    {n:'war pick',mat:'metal',w:2,sp:[40,150]},
    {n:'glaive',mat:'metal',w:6,sp:[140,380]},
    {n:'halberd',mat:'metal',w:6,sp:[140,380]},
    {n:'whip',mat:'leather',w:3,sp:[18,80]},
    {n:'trident',mat:'metal',w:4,sp:[40,150]},
    {n:'sickle',mat:'metal',w:2,sp:[10,50]},
    {n:'club',mat:'wood',w:2,sp:[1,20]},
    {n:'net',mat:'cloth',w:3,sp:[10,50]},
    {n:'greatclub',mat:'wood',w:10,sp:[1,20]}
  ];
  const armors=[
    {n:'leather armor',mat:'leather',w:10,sp:[75,220]},
    {n:'padded armor',mat:'cloth',w:8,sp:[35,130]},
    {n:'studded leather armor',mat:'leather',w:13,sp:[340,650]},
    {n:'chain shirt',mat:'metal',w:20,sp:[380,700]},
    {n:'scale mail',mat:'metal',w:45,sp:[380,700]},
    {n:'chain mail',mat:'metal',w:55,sp:[580,940]},
    {n:'ring mail',mat:'metal',w:40,sp:[280,580]},
    {n:'hide armor',mat:'leather',w:12,sp:[80,200]},
    {n:'gambeson',mat:'cloth',w:12,sp:[90,260]},
    {n:'shield',mat:'metal',w:6,sp:[80,200]},
    {n:'wooden shield',mat:'wood',w:6,sp:[15,80]},
    {n:'buckler',mat:'metal',w:3,sp:[35,130]},
    {n:'breastplate',mat:'metal',w:20,sp:[3500,4500]},
    {n:'half plate',mat:'metal',w:40,sp:[6800,8000]}
  ];
  const conditions=['battered','rusty','dented','battle-worn','field-repaired','well-maintained','polished','quality','notched','scarred'];
  const entries=[];
  for(const w of weapons){
    for(let i=0;i<conditions.length;i++){
      const delta=i<3?-0.15:(i>5?0.15:0);
      entries.push({n:`${conditions[i]} ${w.n}`,mat:w.mat,w:w.w,sp:[Math.max(2,Math.round(w.sp[0]*(1+delta))),Math.round(w.sp[1]*(1+delta))],valuable:w.sp[1]>=200});
      if(entries.length>=200)break;
    }
    if(entries.length>=200)break;
  }
  for(const a of armors){
    for(let i=0;i<conditions.length;i++){
      const delta=i<3?-0.15:(i>5?0.15:0);
      entries.push({n:`${conditions[i]} ${a.n}`,mat:a.mat,w:a.w,sp:[Math.max(5,Math.round(a.sp[0]*(1+delta))),Math.round(a.sp[1]*(1+delta))],valuable:a.sp[1]>=400});
      if(entries.length>=340)break;
    }
    if(entries.length>=340)break;
  }
  return entries;
}

function buildPotionEntries(){
  const baseList=[
    {name:'potion of healing',range:[500,700],effect:'restores 2d4+2 HP'},
    {name:'potion of greater healing',range:[1500,2200],effect:'restores 4d4+4 HP'},
    {name:'potion of superior healing',range:[4500,5200],effect:'restores 8d4+8 HP'},
    {name:'potion of supreme healing',range:[9000,11000],effect:'restores 10d4+20 HP'},
    {name:'potion of climbing',range:[750,1100],effect:'gain climb speed for 1 hour'},
    {name:'potion of water breathing',range:[1000,1500],effect:'breathe underwater for 1 hour'},
    {name:'potion of heroism',range:[3000,3800],effect:'gain bless + 10 temp HP'},
    {name:'potion of mind reading',range:[3500,4200],effect:'detect thoughts for 1 hour'},
    {name:'potion of invisibility',range:[4000,5200],effect:'become invisible for 1 minute'},
    {name:'potion of speed',range:[4200,5200],effect:'haste effect for 1 minute'},
    {name:'potion of flying',range:[4800,5600],effect:'fly speed 60 ft for 1 hour'},
    {name:'potion of gaseous form',range:[3600,4400],effect:'become mist for 1 hour'},
    {name:'potion of growth',range:[3100,3900],effect:'enlarge spell for 1 hour'},
    {name:'potion of diminution',range:[3100,3900],effect:'reduce spell for 1 hour'},
    {name:'potion of vitality',range:[4600,5400],effect:'remove exhaustion and poison'},
    {name:'potion of longevity',range:[9000,12000],effect:'reduces physical age'},
    {name:'potion of invulnerability',range:[5000,6200],effect:'resist all damage for 1 minute'},
    {name:'potion of resistance (acid)',range:[1500,2200],effect:'resist acid for 1 hour'},
    {name:'potion of resistance (cold)',range:[1500,2200],effect:'resist cold for 1 hour'},
    {name:'potion of resistance (fire)',range:[1500,2200],effect:'resist fire for 1 hour'},
    {name:'potion of resistance (lightning)',range:[1500,2200],effect:'resist lightning for 1 hour'},
    {name:'potion of resistance (poison)',range:[1500,2200],effect:'resist poison for 1 hour'},
    {name:'potion of fire breath',range:[1800,2400],effect:'exhale flames 3 times'},
    {name:'potion of frost giant strength',range:[3200,4200],effect:'STR becomes 23 for 1 hour'},
    {name:'potion of hill giant strength',range:[2100,2800],effect:'STR becomes 21 for 1 hour'},
    {name:'potion of stone giant strength',range:[3600,4500],effect:'STR becomes 23 for 1 hour'},
    {name:'potion of fire giant strength',range:[4200,5200],effect:'STR becomes 25 for 1 hour'},
    {name:'potion of cloud giant strength',range:[5200,6200],effect:'STR becomes 27 for 1 hour'},
    {name:'potion of storm giant strength',range:[7200,8200],effect:'STR becomes 29 for 1 hour'},
    {name:'potion of animal friendship',range:[900,1400],effect:'cast animal friendship'},
    {name:'potion of clairvoyance',range:[3600,4200],effect:'sense location for 1 hour'},
    {name:'potion of darkvision',range:[2100,2800],effect:'see in dark for 8 hours'},
    {name:'potion of spider climb',range:[1800,2400],effect:'spider climb for 1 hour'},
    {name:'potion of etherealness',range:[7200,9000],effect:'enter the Ethereal Plane'},
    {name:'philter of love',range:[1700,2300],effect:'charms first creature seen'},
    {name:'oil of slipperiness',range:[1800,2400],effect:'freedom of movement'},
    {name:'elixir of health',range:[3000,3800],effect:'cures disease and blindness'},
    {name:'elixir of swiftness',range:[2600,3200],effect:'+10 ft speed for 1 hour'},
    {name:'elixir of acumen',range:[2600,3200],effect:'+2 bonus to spell attack for 1 hour'},
    {name:'draught of keen sight',range:[2000,2800],effect:'advantage on Perception checks'},
    {name:'elixir of silent step',range:[2000,2600],effect:'advantage on Stealth for 1 hour'},
    {name:'elixir of sea stride',range:[2200,2800],effect:'walk on water for 10 minutes'},
    {name:'elixir of ember shield',range:[2400,3200],effect:'resist fire and shed light'},
    {name:'potion of stormstride',range:[3600,4400],effect:'bonus action teleport 15 ft'},
    {name:'draught of earthen vigor',range:[2800,3400],effect:'+2 AC while standing for 1 hour'},
    {name:'elixir of mental clarity',range:[2500,3200],effect:'advantage on INT checks for 1 hour'},
    {name:'potion of tongues',range:[2400,3200],effect:'understand any language for 1 hour'},
    {name:'elixir of lucid dreaming',range:[2600,3200],effect:'gain inspiration after short rest'},
    {name:'draught of mirror skin',range:[3500,4200],effect:'first critical hit becomes normal'},
    {name:'elixir of starfall',range:[3800,4600],effect:'cast feather fall once'},
    {name:'elixir of verdant breath',range:[2600,3300],effect:'ignore plant difficult terrain'},
    {name:'elixir of crystal focus',range:[2800,3600],effect:'advantage on concentration saves'}
  ];
  const tonics=[
    {name:'tonic of restful sleep',range:[900,1400],effect:'long rest grants +1 hit die'},
    {name:'draught of steady hands',range:[1100,1600],effect:'advantage on Sleight of Hand'},
    {name:'sailor storm cordial',range:[1000,1500],effect:'advantage on CON saves vs weather'},
    {name:'glowcap infusion',range:[950,1400],effect:'shed soft light for 8 hours'},
    {name:'hunter focus tonic',range:[1200,1700],effect:'advantage on Survival checks'},
    {name:'iron stomach cordial',range:[1000,1500],effect:'resist ingested poison for 8 hours'},
    {name:'stonefoot draught',range:[1100,1600],effect:'cannot be knocked prone for 1 minute'},
    {name:'tumbler tonic',range:[1150,1700],effect:'reduce falling damage by 1d6'},
    {name:'lanternheart cordial',range:[1200,1800],effect:'immune to fright for 10 minutes'},
    {name:'emberline booster',range:[1300,1900],effect:'+5 ft speed for 1 hour'}
  ];
  const suspensions=[
    {name:'silverweed suspension',range:[1600,2200],effect:'detect poison/disease for 10 minutes'},
    {name:'bluevine renewal draught',range:[1500,2100],effect:'remove 1 level of exhaustion'},
    {name:'marshlight philter',range:[1400,2000],effect:'advantage on Stealth in dim light'},
    {name:'skyward tonic',range:[1800,2400],effect:'feather fall once'},
    {name:'echo veil elixir',range:[1900,2400],effect:'advantage on deception for 1 hour'},
    {name:'stonebark tonic',range:[1700,2300],effect:'+1 AC for 10 minutes'},
    {name:'whisperwind elixir',range:[1800,2400],effect:'double jump distance for 1 hour'},
    {name:'glaciermint draught',range:[1700,2300],effect:'resist cold for 1 hour'},
    {name:'iron bloom cordial',range:[1900,2500],effect:'add +2 to next saving throw'},
    {name:'sunwake suspension',range:[1500,2100],effect:'advantage vs sleep effects'}
  ];
  const remedies=[
    {name:'soother salve vial',range:[600,900],effect:'heal 1d4 HP'},
    {name:'herbal vigor draught',range:[700,1000],effect:'gain 5 temp HP'},
    {name:'calming petals infusion',range:[800,1100],effect:'remove frightened condition'},
    {name:'sparkseed cordial',range:[900,1200],effect:'advantage on initiative once'},
    {name:'bardsong tincture',range:[950,1300],effect:'advantage on Performance checks'},
    {name:'sentry wake tonic',range:[850,1200],effect:'stay alert, immune to magical sleep'},
    {name:'scout eye elixir',range:[900,1250],effect:'darkvision 30 ft for 1 hour'},
    {name:'gleamwater draught',range:[800,1150],effect:'cleanse grime, grant pleasant scent'},
    {name:'mender smoke vial',range:[700,1050],effect:'stabilize a bleeding creature'},
    {name:'pilgrim ember brew',range:[750,1100],effect:'resist cold weather for 8 hours'}
  ];
  const expanded=baseList.concat(tonics,suspensions,remedies);
  return expanded.map(entry=>({
    n:entry.name,
    mat:'glass',
    w:0.4,
    sp:entry.range,
    effect:entry.effect
  }));
}

function buildScrollEntries(){
  const spells=[
    {name:'Alarm',level:1,school:'Abjuration'},
    {name:'Bless',level:1,school:'Enchantment'},
    {name:'Bane',level:1,school:'Enchantment'},
    {name:'Burning Hands',level:1,school:'Evocation'},
    {name:'Chromatic Orb',level:1,school:'Evocation'},
    {name:'Cure Wounds',level:1,school:'Evocation'},
    {name:'Detect Magic',level:1,school:'Divination'},
    {name:'Disguise Self',level:1,school:'Illusion'},
    {name:'Faerie Fire',level:1,school:'Evocation'},
    {name:'Guiding Bolt',level:1,school:'Evocation'},
    {name:'Magic Missile',level:1,school:'Evocation'},
    {name:'Shield',level:1,school:'Abjuration'},
    {name:'Thunderwave',level:1,school:'Evocation'},
    {name:'Witch Bolt',level:1,school:'Evocation'},
    {name:'Silent Image',level:1,school:'Illusion'},
    {name:'Command',level:1,school:'Enchantment'},
    {name:'Aid',level:2,school:'Abjuration'},
    {name:'Alter Self',level:2,school:'Transmutation'},
    {name:'Blur',level:2,school:'Illusion'},
    {name:'Darkvision',level:2,school:'Transmutation'},
    {name:'Flaming Sphere',level:2,school:'Evocation'},
    {name:'Hold Person',level:2,school:'Enchantment'},
    {name:'Invisibility',level:2,school:'Illusion'},
    {name:'Knock',level:2,school:'Transmutation'},
    {name:'Mirror Image',level:2,school:'Illusion'},
    {name:'Misty Step',level:2,school:'Conjuration'},
    {name:'Scorching Ray',level:2,school:'Evocation'},
    {name:'Shatter',level:2,school:'Evocation'},
    {name:'Spiritual Weapon',level:2,school:'Evocation'},
    {name:'Suggestion',level:2,school:'Enchantment'},
    {name:'Web',level:2,school:'Conjuration'},
    {name:'Animate Dead',level:3,school:'Necromancy'},
    {name:'Beacon of Hope',level:3,school:'Abjuration'},
    {name:'Counterspell',level:3,school:'Abjuration'},
    {name:'Dispel Magic',level:3,school:'Abjuration'},
    {name:'Fireball',level:3,school:'Evocation'},
    {name:'Fly',level:3,school:'Transmutation'},
    {name:'Haste',level:3,school:'Transmutation'},
    {name:'Hypnotic Pattern',level:3,school:'Illusion'},
    {name:'Lightning Bolt',level:3,school:'Evocation'},
    {name:'Major Image',level:3,school:'Illusion'},
    {name:'Revivify',level:3,school:'Necromancy'},
    {name:'Spirit Guardians',level:3,school:'Conjuration'},
    {name:'Tiny Hut',level:3,school:'Evocation'},
    {name:'Water Breathing',level:3,school:'Transmutation'},
    {name:'Banishment',level:4,school:'Abjuration'},
    {name:'Dimension Door',level:4,school:'Conjuration'},
    {name:'Greater Invisibility',level:4,school:'Illusion'},
    {name:'Guardian of Faith',level:4,school:'Conjuration'},
    {name:'Ice Storm',level:4,school:'Evocation'},
    {name:'Polymorph',level:4,school:'Transmutation'},
    {name:'Stoneskin',level:4,school:'Abjuration'},
    {name:'Vitriolic Sphere',level:4,school:'Evocation'},
    {name:'Cone of Cold',level:5,school:'Evocation'},
    {name:'Cloudkill',level:5,school:'Conjuration'},
    {name:'Wall of Force',level:5,school:'Evocation'},
    {name:'Telekinesis',level:5,school:'Transmutation'},
    {name:'Commune',level:5,school:'Divination'},
    {name:'Legend Lore',level:5,school:'Divination'},
    {name:'Passwall',level:5,school:'Transmutation'},
    {name:"Rary's Telepathic Bond",level:5,school:'Divination'},
    {name:'Blade Barrier',level:6,school:'Evocation'},
    {name:'Chain Lightning',level:6,school:'Evocation'},
    {name:'Circle of Death',level:6,school:'Necromancy'},
    {name:'Disintegrate',level:6,school:'Transmutation'},
    {name:'Eyebite',level:6,school:'Necromancy'},
    {name:'Globe of Invulnerability',level:6,school:'Abjuration'},
    {name:'Heal',level:6,school:'Evocation'},
    {name:"Heroes' Feast",level:6,school:'Conjuration'},
    {name:'Mass Suggestion',level:6,school:'Enchantment'},
    {name:'Sunbeam',level:6,school:'Evocation'},
    {name:'Wall of Ice',level:6,school:'Evocation'},
    {name:'Wall of Thorns',level:6,school:'Conjuration'},
    {name:'Word of Recall',level:6,school:'Conjuration'},
    {name:'Etherealness',level:7,school:'Transmutation'},
    {name:'Finger of Death',level:7,school:'Necromancy'},
    {name:'Forcecage',level:7,school:'Evocation'},
    {name:'Mirage Arcane',level:7,school:'Illusion'},
    {name:'Plane Shift',level:7,school:'Conjuration'},
    {name:'Prismatic Spray',level:7,school:'Evocation'},
    {name:'Project Image',level:7,school:'Illusion'},
    {name:'Regenerate',level:7,school:'Transmutation'},
    {name:'Resurrection',level:7,school:'Necromancy'},
    {name:'Reverse Gravity',level:7,school:'Transmutation'},
    {name:'Symbol',level:7,school:'Abjuration'},
    {name:'Teleport',level:7,school:'Conjuration'},
    {name:'Antimagic Field',level:8,school:'Abjuration'},
    {name:'Clone',level:8,school:'Necromancy'},
    {name:'Earthquake',level:8,school:'Evocation'},
    {name:'Feeblemind',level:8,school:'Enchantment'},
    {name:'Mind Blank',level:8,school:'Abjuration'},
    {name:'Power Word Stun',level:8,school:'Enchantment'},
    {name:'Sunburst',level:8,school:'Evocation'},
    {name:'Tsunami',level:8,school:'Conjuration'}
  ];
  return spells.map(spell=>({
    n:spell.name,
    mat:'paper',
    w:0.12+spell.level*0.01,
    sp:[600+spell.level*400,1100+spell.level*600],
    school:spell.school,
    level:spell.level
  }));
}

function buildGemEntries(){
  const materials=[
    {name:'ruby',range:[1500,3200]},
    {name:'sapphire',range:[1400,3000]},
    {name:'emerald',range:[1400,3000]},
    {name:'diamond',range:[2200,4800]},
    {name:'opal',range:[900,2200]},
    {name:'amethyst',range:[800,2000]},
    {name:'topaz',range:[900,2100]},
    {name:'garnet',range:[700,1800]},
    {name:'onyx',range:[800,1900]},
    {name:'pearl',range:[900,2300]},
    {name:'jade',range:[1000,2400]},
    {name:'lapis',range:[800,2000]},
    {name:'amber',range:[700,1800]},
    {name:'moonstone',range:[900,2100]}
  ];
  const forms=[
    {name:'cameo',delta:[100,300]},
    {name:'signet ring',delta:[200,400]},
    {name:'bracelet',delta:[250,500]},
    {name:'necklace',delta:[300,600]},
    {name:'tiara',delta:[400,800]},
    {name:'brooch',delta:[220,460]},
    {name:'chalice',delta:[350,700]},
    {name:'goblet',delta:[300,640]},
    {name:'statuette',delta:[380,760]},
    {name:'idol',delta:[420,840]},
    {name:'music box',delta:[360,720]},
    {name:'mosaic tile',delta:[250,520]},
    {name:'mask',delta:[400,820]},
    {name:'pendant',delta:[260,520]}
  ];
  const motifs=['dragon','phoenix','lion','ivy','wave','starburst','labyrinth','spiral','feather','sunburst','thornvine','constellation'];
  const entries=[];
  let idx=0;
  for(const mat of materials){
    for(const form of forms){
      const motif=motifs[idx%motifs.length];
      const min=mat.range[0]+form.delta[0];
      const max=mat.range[1]+form.delta[1];
      entries.push({
        n:`${toTitle(mat.name)} ${form.name} engraved with ${motif}`,
        mat:mat.name==='diamond'?'stone':'metal',
        w:form.name.includes('statuette')?1.2:0.4,
        sp:[min,max],
        valuable:true
      });
      idx++;
    }
  }
  if(entries.length<150){
    const chips=[
      {name:'polished riverstone charm',range:[120,260]},
      {name:'glass bead string',range:[100,220]},
      {name:'agate worry stone',range:[140,280]},
      {name:'carved bone pendant',range:[130,260]},
      {name:'shell cameo',range:[110,230]},
      {name:'quartz shard talisman',range:[150,300]},
      {name:'obsidian bead bracelet',range:[160,320]},
      {name:'hematite ring',range:[130,260]},
      {name:'lapis cabochon pin',range:[170,330]},
      {name:'amber droplet earring',range:[140,290]}
    ];
    const trims=['wrapped in copper wire','set on leather thong','bound with twine','mounted on brass pin'];
    for(const chip of chips){
      for(const trim of trims){
        entries.push({
          n:`${chip.name} (${trim})`,
          mat:'stone',
          w:0.15,
          sp:[chip.range[0],chip.range[1]],
          valuable:false
        });
        if(entries.length>=150)break;
      }
      if(entries.length>=150)break;
    }
  }
  return entries;
}

function buildAdventuringGearEntries(){
  const bases=[
    {n:'healer kit satchel',mat:'cloth',w:3,sp:[500,1400],valuable:true},
    {n:'reinforced climbing harness',mat:'leather',w:4,sp:[550,1500],valuable:true},
    {n:'collapsible ten-foot pole',mat:'metal',w:3,sp:[400,900],valuable:true},
    {n:'grappling launcher',mat:'metal',w:5,sp:[650,1600],valuable:true},
    {n:'hidden-sheath dagger',mat:'metal',w:0.7,sp:[600,1600],valuable:true},
    {n:'scout signal mirror',mat:'metal',w:0.3,sp:[350,900],valuable:false},
    {n:'field alchemy burner',mat:'metal',w:2,sp:[520,1400],valuable:true},
    {n:'quick-deploy barricade stakes',mat:'wood',w:6,sp:[480,1200],valuable:true},
    {n:'enchanted chalk reel',mat:'stone',w:0.3,sp:[420,1100],valuable:true},
    {n:'waterskin with filter core',mat:'leather',w:2.2,sp:[460,1200],valuable:true},
    {n:'signal flare tube',mat:'metal',w:1,sp:[380,900],valuable:false},
    {n:'portable ram with grips',mat:'metal',w:10,sp:[520,1400],valuable:true},
    {n:'hunter snare kit',mat:'cloth',w:4,sp:[480,1100],valuable:true},
    {n:'silent boot spikes',mat:'metal',w:1,sp:[500,1200],valuable:true},
    {n:'weatherproof map case',mat:'metal',w:1,sp:[450,1000],valuable:true},
    {n:'messenger signal wand',mat:'wood',w:0.5,sp:[400,900],valuable:true},
    {n:'collapsible shield frame',mat:'metal',w:6,sp:[650,1500],valuable:true},
    {n:'arcanist component caddy',mat:'wood',w:1.5,sp:[520,1400],valuable:true},
    {n:'beast caltrop net',mat:'cloth',w:5,sp:[500,1300],valuable:true},
    {n:'smuggler false-bottom crate',mat:'wood',w:8,sp:[600,1500],valuable:true}
  ];
  const descriptors=['dwarven-crafted','elven-made','battle-ready','clockwork-enhanced','storm-forged'];
  const entries=[];
  for(const base of bases){
    for(const desc of descriptors){
      const delta=descriptors.indexOf(desc)*40;
      entries.push({
        n:`${desc} ${base.n}`,
        mat:base.mat,
        w:base.w,
        sp:[base.sp[0]+delta,base.sp[1]+delta],
        valuable:base.valuable
      });
    }
  }
  if(entries.length<140){
    const lightGear=[
      {n:'camp repair kit',mat:'cloth',w:2,sp:[180,420]},
      {n:'rope ladder bundle',mat:'cloth',w:4,sp:[160,400]},
      {n:'signal flag roll',mat:'cloth',w:1,sp:[140,360]},
      {n:'emergency splint set',mat:'wood',w:2,sp:[150,380]},
      {n:'travel shrine kit',mat:'wood',w:2.5,sp:[200,420]},
      {n:'folding cook rack',mat:'metal',w:3,sp:[170,380]},
      {n:'camouflage netting',mat:'cloth',w:3,sp:[190,420]},
      {n:'weather hood extender',mat:'cloth',w:1,sp:[130,320]},
      {n:'belt hook assortment',mat:'metal',w:0.8,sp:[120,300]},
      {n:'simple climbing spikes',mat:'metal',w:1.5,sp:[160,360]}
    ];
    const tags=['backup','field','patched','spare','travel'];
    for(const base of lightGear){
      for(const tag of tags){
        entries.push({
          n:`${tag} ${base.n}`,
          mat:base.mat,
          w:base.w,
          sp:[base.sp[0],base.sp[1]],
          valuable:false
        });
        if(entries.length>=140)break;
      }
      if(entries.length>=140)break;
    }
  }
  return entries;
}

function buildToolkitEntries(){
  const bases=[
    {n:"alchemist's supplies",mat:'wood',w:5,sp:[800,2000],valuable:true},
    {n:"brewer's supplies",mat:'wood',w:8,sp:[600,1500],valuable:true},
    {n:"calligrapher's supplies",mat:'wood',w:4,sp:[700,1600],valuable:true},
    {n:"carpenter's tools",mat:'wood',w:6,sp:[700,1700],valuable:true},
    {n:"cartographer's tools",mat:'wood',w:4,sp:[650,1600],valuable:true},
    {n:"cobbler's tools",mat:'leather',w:5,sp:[600,1500],valuable:true},
    {n:"cook's utensils",mat:'metal',w:6,sp:[500,1400],valuable:false},
    {n:"glassblower's tools",mat:'wood',w:5,sp:[750,1700],valuable:true},
    {n:"jeweler's tools",mat:'metal',w:3,sp:[900,2100],valuable:true},
    {n:"leatherworker's tools",mat:'leather',w:5,sp:[650,1500],valuable:true},
    {n:"mason's tools",mat:'metal',w:8,sp:[700,1700],valuable:true},
    {n:"navigator's tools",mat:'wood',w:4,sp:[800,2000],valuable:true},
    {n:"painter's supplies",mat:'wood',w:5,sp:[650,1500],valuable:true},
    {n:"potter's tools",mat:'clay',w:6,sp:[600,1400],valuable:false},
    {n:"smith's tools",mat:'metal',w:8,sp:[800,1900],valuable:true},
    {n:"tinker's tools",mat:'metal',w:10,sp:[900,2100],valuable:true},
    {n:"weaver's tools",mat:'wood',w:4,sp:[600,1400],valuable:false},
    {n:"woodcarver's tools",mat:'wood',w:4,sp:[620,1500],valuable:true},
    {n:'poisoner kit',mat:'metal',w:3,sp:[900,2000],valuable:true},
    {n:'herbalism kit',mat:'wood',w:3,sp:[650,1400],valuable:true},
    {n:'disguise kit',mat:'cloth',w:4,sp:[620,1500],valuable:true},
    {n:'forgery kit',mat:'wood',w:3,sp:[750,1600],valuable:true},
    {n:'gaming set (dragonchess)',mat:'wood',w:2,sp:[550,1200],valuable:false},
    {n:'gaming set (three-dragon ante)',mat:'wood',w:1.5,sp:[500,1100],valuable:false}
  ];
  const descriptors=['masterwork','well-loved','guild-issue','arcane-trimmed','traveler'];
  const entries=[];
  for(const base of bases){
    for(const desc of descriptors){
      const delta=descriptors.indexOf(desc)*30;
      entries.push({
        n:`${desc} ${base.n}`,
        mat:base.mat,
        w:base.w,
        sp:[base.sp[0]+delta,base.sp[1]+delta],
        valuable:base.valuable
      });
    }
  }
  if(entries.length<160){
    const pocketKits=[
      {n:'mini stitch kit',mat:'cloth',w:1,sp:[220,420]},
      {n:'field sketch roll',mat:'paper',w:0.8,sp:[200,380]},
      {n:'basic tinkering tin',mat:'metal',w:1.2,sp:[240,420]},
      {n:'camp spice kit',mat:'wood',w:1.5,sp:[180,360]},
      {n:'travel ink pack',mat:'wood',w:1,sp:[210,380]},
      {n:'stringed instrument care set',mat:'wood',w:1.2,sp:[230,410]},
      {n:'simple appraisal loupe',mat:'metal',w:0.3,sp:[260,420]},
      {n:'basic rune etcher',mat:'metal',w:0.9,sp:[240,430]},
      {n:'gardener starter bundle',mat:'wood',w:2,sp:[190,360]},
      {n:'portable dye kit',mat:'cloth',w:1.4,sp:[200,370]}
    ];
    const states=['pocket','travel','practice','guild-marked'];
    for(const kit of pocketKits){
      for(const state of states){
        entries.push({
          n:`${state} ${kit.n}`,
          mat:kit.mat,
          w:kit.w,
          sp:[kit.sp[0],kit.sp[1]],
          valuable:false
        });
        if(entries.length>=160)break;
      }
      if(entries.length>=160)break;
    }
  }
  return entries;
}

function buildBagEntries(){
  const bases=[
    {n:'satchel',mat:'cloth',w:0.4,sp:[20,200]},
    {n:'messenger bag',mat:'cloth',w:0.5,sp:[25,220]},
    {n:'scroll tube',mat:'metal',w:0.4,sp:[40,260]},
    {n:'strongbox',mat:'metal',w:2,sp:[80,320]},
    {n:'stash box',mat:'wood',w:1.2,sp:[50,260]},
    {n:'specimen jar',mat:'glass',w:0.4,sp:[40,260]},
    {n:'map case',mat:'leather',w:0.6,sp:[30,220]},
    {n:'lockable coffer',mat:'metal',w:2.5,sp:[90,360]},
    {n:'bandolier',mat:'leather',w:0.5,sp:[35,200]},
    {n:'ammo case',mat:'wood',w:0.8,sp:[45,240]},
    {n:'sample crate',mat:'wood',w:3,sp:[70,260]},
    {n:'potion carrier',mat:'leather',w:0.6,sp:[60,260]}
  ];
  const descriptors=['waxed','tar-coated','embroidered','runed','steel-rimmed','double-stitched','featherweight','ironclad','canvas-lined','brocade'];
  const entries=[];
  for(const base of bases){
    for(let i=0;i<descriptors.length;i++){
      const color=COLORS[i%COLORS.length];
      const min=base.sp[0]+i*2;
      const max=base.sp[1]+i*3+20;
      entries.push({
        n:`${descriptors[i]} ${color} ${base.n}`,
        mat:base.mat,
        w:base.w,
        sp:[min,max]
      });
    }
  }
  if(entries.length<150){
    const humbleCarry=[
      {n:'rolled canvas wrap',mat:'cloth',w:0.3,sp:[12,80]},
      {n:'waxed paper parcel',mat:'paper',w:0.2,sp:[10,70]},
      {n:'cord-tied bundle',mat:'cloth',w:0.25,sp:[8,60]},
      {n:'braided reed basket',mat:'wood',w:0.5,sp:[15,90]},
      {n:'threadbare tote',mat:'cloth',w:0.35,sp:[9,65]},
      {n:'simple sling satchel',mat:'cloth',w:0.4,sp:[14,85]},
      {n:'patched courier roll',mat:'cloth',w:0.45,sp:[16,95]},
      {n:'hardshell pot case',mat:'metal',w:0.6,sp:[18,110]},
      {n:'plain belt pouch',mat:'leather',w:0.2,sp:[11,70]},
      {n:'stackable crate half',mat:'wood',w:0.8,sp:[20,120]}
    ];
    const flags=['frayed edge','fresh lining','button clasp','rope cinch','reinforced base'];
    for(const carry of humbleCarry){
      for(const flag of flags){
        entries.push({
          n:`${carry.n} (${flag})`,
          mat:carry.mat,
          w:carry.w,
          sp:[carry.sp[0],carry.sp[1]],
          valuable:false
        });
        if(entries.length>=150)break;
      }
      if(entries.length>=150)break;
    }
  }
  return entries;
}

function buildClothingEntries(){
  const bases=[
    {n:'cloak',mat:'cloth',w:1,sp:[50,260]},
    {n:'scarf',mat:'cloth',w:0.2,sp:[8,160]},
    {n:'gloves',mat:'leather',w:0.3,sp:[15,180]},
    {n:'hat',mat:'cloth',w:0.2,sp:[12,160]},
    {n:'belt',mat:'leather',w:0.3,sp:[10,180]},
    {n:'boots',mat:'leather',w:2,sp:[60,260]},
    {n:'tunic',mat:'cloth',w:1.2,sp:[40,220]},
    {n:'tabard',mat:'cloth',w:1.5,sp:[45,230]},
    {n:'sash',mat:'cloth',w:0.2,sp:[12,150]},
    {n:'vest',mat:'cloth',w:0.8,sp:[30,200]}
  ];
  const styles=['winter-weight','travel-stained','embroidered','festival','merchant-grade','scout-cut','courtly','battle-ready','trimmed','layered'];
  const accents=['with brass pins','with silver piping','with leather edging','with quilted lining','with hidden pocket','with tassel fringe','with fur collar','with rune stitching'];
  const entries=[];
  for(const base of bases){
    for(let i=0;i<styles.length;i++){
      const accent=accents[i%accents.length];
      const min=base.sp[0]+i*3;
      const max=base.sp[1]+i*4;
      entries.push({
        n:`${styles[i]} ${base.n} ${accent}`,
        mat:base.mat,
        w:base.w,
        sp:[min,max]
      });
    }
  }
  if(entries.length<150){
    const basics=[
      {n:'linen wraps',mat:'cloth',w:0.3,sp:[6,40]},
      {n:'wool cap',mat:'cloth',w:0.2,sp:[8,50]},
      {n:'fingerless gloves',mat:'cloth',w:0.15,sp:[7,45]},
      {n:'simple sandals',mat:'leather',w:0.6,sp:[10,55]},
      {n:'patchwork sash',mat:'cloth',w:0.1,sp:[5,35]},
      {n:'canvas apron',mat:'cloth',w:0.7,sp:[12,60]},
      {n:'simple shawl',mat:'cloth',w:0.4,sp:[9,48]},
      {n:'cotton kerchief',mat:'cloth',w:0.05,sp:[4,30]},
      {n:'travel leggings',mat:'cloth',w:0.8,sp:[15,70]},
      {n:'plain doublet',mat:'cloth',w:1,sp:[18,80]}
    ];
    const looks=['patched','fresh-dyed','sun-faded','hearth-warm','oiled'];
    for(const base of basics){
      for(const look of looks){
        entries.push({
          n:`${look} ${base.n}`,
          mat:base.mat,
          w:base.w,
          sp:[base.sp[0],base.sp[1]],
          valuable:false
        });
        if(entries.length>=150)break;
      }
      if(entries.length>=150)break;
    }
  }
  return entries;
}
