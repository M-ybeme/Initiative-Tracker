// ---------- Seeded RNG ----------
function hashString(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return (h>>>0)>>>0}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function prand(seedStr){const s = seedStr? hashString(seedStr) : Math.floor(Math.random()*2**32); return mulberry32(s) }

function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)] }
function pickN(rng, arr, n){ const a=[...arr]; const out=[]; for(let i=0;i<n&&a.length;i++){ out.push(a.splice(Math.floor(rng()*a.length),1)[0]); } return out; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)) }

// ---------- Helpers ----------
function within(rng,[a,b]){ return a + rng()*(b-a) }
function repeatArray(arr, times){ if(!arr||!arr.length) return []; const out=[]; for(let i=0;i<times;i++) out.push(...arr); return out; }
function boostedPool(base, contexts, boost){
  // If no explicit boost provided, read the UI slider `tv-contextInfluence` if present
  let b = boost;
  try{ if(typeof b==='undefined' && typeof document!=='undefined'){ const el = document.getElementById('tv-contextInfluence'); if(el) b = Math.max(0, Math.min(10, +el.value||0)); } }catch(e){ b = (typeof b==='number'? b : 3); }
  b = (typeof b==='number' && !isNaN(b)) ? Math.round(b) : 3;
  const pool = [...(base||[])];
  if(!contexts||!contexts.length) return pool;
  // If slider is 0, omit context entries entirely
  let totalCtx = 0;
  contexts.forEach(c=>{ if(Array.isArray(c)) totalCtx += c.length||0; });
  if(b === 0 || totalCtx === 0) return pool;
  // Scale context repetition relative to base pool size so small context arrays aren't drowned out
  const baseLen = Math.max(1, pool.length);
  const ctxLen = Math.max(1, totalCtx);
  let repeat = Math.max(1, Math.round(b * (baseLen / ctxLen)));
  // tighter cap to avoid runaway growth while still allowing influence
  repeat = Math.min(repeat, 6);
  for(let r=0;r<repeat;r++){
    contexts.forEach(ctx=>{ if(ctx && ctx.length) pool.push(...ctx); });
  }
  return pool;
}
function money(sp){ if(sp>=10){const gp=sp/10; return (gp%1?gp.toFixed(1):gp.toFixed(0))+" gp"; } return sp+" sp"; }
function priceScale(rng, settlement, quality){
  const s = within(rng, SETTLEMENT[settlement].price);
  const q = QUALITY[quality].mult;
  return s*q;
}
function roomCapacity(size){
  return size==="small"? [1,3] : size==="large"? [4,10] : [2,6];
}


function pluralize(word){
  if(/(s|x|z|ch|sh)$/i.test(word)) return word+"es";
  if(/y$/i.test(word) && !/[aeiou]y$/i.test(word)) return word.slice(0,-1)+"ies";
  return word+"s";
}
// Returns { name, motif }
function buildInnName(rng){
  const pattern = Math.floor(rng()*7);
  switch(pattern){
    case 0: { const color = pick(rng,SIGN_COLORS), animal = pick(rng,SIGN_ANIMALS);
      return { name: `The ${color} ${animal}`, motif: `a ${color.toLowerCase()} ${animal.toLowerCase()}` }; }
    case 1: { const trait = pick(rng,SIGN_TRAITS), animal = pick(rng,SIGN_ANIMALS);
      return { name: `The ${trait} ${animal}`, motif: `a ${animal.toLowerCase()} showing ${trait.toLowerCase()}` }; }
    case 2: { const color = pick(rng,SIGN_COLORS), obj = pick(rng,SIGN_OBJECTS);
      return { name: `The ${color} ${obj}`, motif: `a ${color.toLowerCase()} ${obj.toLowerCase()}` }; }
    case 3: { const num = pick(rng,SIGN_NUMS), obj = pick(rng,SIGN_OBJECTS);
      return { name: `The ${num} ${pluralize(obj)}`, motif: `${num.toLowerCase()} ${pluralize(obj.toLowerCase())}` }; }
    case 4: { const animal = pick(rng,SIGN_ANIMALS), obj = pick(rng,SIGN_OBJECTS);
      return { name: `${animal} & ${obj}`, motif: `two icons: a ${animal.toLowerCase()} and a ${obj.toLowerCase()}` }; }
    case 5: { const color = pick(rng,SIGN_COLORS), title = pick(rng,SIGN_TITLES);
      return { name: `The ${color} ${title}`, motif: `a ${color.toLowerCase()} ${title.toLowerCase()}` }; }
    default: { const title = pick(rng,SIGN_TITLES), obj = pick(rng,SIGN_OBJECTS);
      return { name: `${title} & ${obj}`, motif: `two icons: a ${title.toLowerCase()} and a ${obj.toLowerCase()}` }; }
  }
}

// ---------- Builders ----------
function buildAmbience(rng, settlement, quality, tavernType){
  const tags = new Set();
  QUALITY[quality].tags.forEach(t=>tags.add(t));

  // Add cultural ambiance if available
  const culturalAmbiance = AMBIENCE_BY_TYPE[tavernType];
  if(culturalAmbiance && culturalAmbiance.length > 0){
    // For cultural taverns, pick 3 cultural tags and 2 generic tags
    pickN(rng, culturalAmbiance, 3).forEach(t=>tags.add(t));
    pickN(rng, AMBIENCE, 2).forEach(t=>tags.add(t));
  } else {
    // For non-cultural taverns, use 4 generic tags
    pickN(rng, AMBIENCE, 4).forEach(t=>tags.add(t));
  }

  return [...tags];
}
function buildMeals(rng, count, mult, tavernType){
  // Check if this is a cultural tavern type with custom menu
  const cultural = CULTURAL_MENU[tavernType];
  const foodSource = cultural && cultural.food ? cultural.food : MEAL_BASE;

  const rows=[]; const seen=new Set();
  let guard=0;
  while(rows.length<count && guard++<200){
    const b = pick(rng, foodSource);
    const sides = pick(rng, b.side);
    const bits = pickN(rng, b.dBits, Math.max(1, Math.floor(rng()*b.dBits.length)));
    const name = b.n;
    const desc = `${bits.join(", ")}; ${sides}`;
    if(seen.has(name+desc)) continue; seen.add(name+desc);
    const sp = Math.round(within(rng,b.p)*mult);
    rows.push({name, desc, price: money(Math.max(3,sp))});
  }
  if(rows.length) rows[0].desc += ` — ${pick(rng, HOUSE_TWISTS)}`;
  return rows;
}
function flattenDrinkList(rng, tavernType){
  const all=[];
  // Check if this is a cultural tavern type with custom drinks
  const cultural = CULTURAL_MENU[tavernType];
  const drinkSource = cultural && cultural.drinks ? cultural.drinks : DRINKS;

  for(const [type,arr] of Object.entries(drinkSource)){ arr.forEach(x=>all.push({...x,type})); }
  // Also add some standard drinks for variety (50% chance per type)
  if(cultural && cultural.drinks){
    for(const [type,arr] of Object.entries(DRINKS)){
      if(rng() > 0.5){ // Mix in some standard options
        arr.slice(0, Math.ceil(arr.length/2)).forEach(x=>all.push({...x,type}));
      }
    }
  }
  return all;
}
function buildDrinks(rng, count, mult, tavernType){
  const list = flattenDrinkList(rng, tavernType);
  const rows=[]; const seen=new Set();
  let guard=0;
  while(rows.length<count && guard++<200){
    const d = pick(rng, list);
    const notes = pickN(rng, d.notes, 2).join(", ");
    const name = d.n;
    const key = name+"|"+notes;
    if(seen.has(key)) continue; seen.add(key);
    const sp = Math.round(within(rng,d.p)*mult);
    rows.push({name, type:d.type, notes, price: money(Math.max(2,sp))});
  }
  rows.unshift({name:"House specialty", type:"special", notes:pick(rng, HOUSE_SPECIAL_DRINK), price: money(Math.max(3, Math.round(6*mult)))});
  return rows;
}
function buildRooms(rng, settlement, quality, size, mult){
  const [minCap,maxCap]=roomCapacity(size);
  const base = [
    {type:"Common-room cot", p:[8,12], am:["blanket","shared hearth"], baseQty:[4,12]},
    {type:"Bunk room bed", p:[12,20], am:["shared washbasin","trunk space"], baseQty:[2,10]},
    {type:"Small private", p:[18,30], am:["lockable door","washbasin"], baseQty:[1,6]},
    {type:"Standard private", p:[25,40], am:["window","washbasin","writing desk"], baseQty:[1,6]},
    {type:"Comfort room", p:[35,60], am:["thicker mattress","hearth or hot brick"], baseQty:[0,4]},
    {type:"Suite", p:[60,120], am:["sitting area","good fireplace"], baseQty:[0,2]}
  ];
  const rows=[];
  base.forEach(row=>{
    const range = row.baseQty;
    const cap = Math.max(0, Math.floor(minCap + rng()*(maxCap-minCap+1)));
    const avail = Math.max(0, Math.min(range[1], Math.floor(rng()*(range[0]+cap))));
    let sp = Math.round(within(rng,row.p)*mult);
    if(quality==="rough") sp = Math.round(sp*0.9);
    if(quality==="cozy") sp = Math.round(sp*1.15);
    if(quality==="fine") sp = Math.round(sp*1.4);
    rows.push({type:row.type, am:row.am.join(", "), price: money(Math.max(8,sp)), avail});
  });
  return rows;
}
function buildStaff(rng, count, tavernType){
  const staff=[];
  const cultural = STAFF_BY_TYPE[tavernType];

  for(let i=0;i<count;i++){
    const role = STAFF_ROLES[i] || "Server";
    const age = pick(rng, AGE), build=pick(rng, BUILD), hair=`${pick(rng,HAIR_STYLE)} ${pick(rng,HAIR_COLOR)}`, eyes=pick(rng,EYES);

    // Use cultural attire/demeanor if available, otherwise use generic
    const attire = cultural && cultural.attire ? pick(rng, cultural.attire) : pick(rng, ATTIRE);
    const dem = cultural && cultural.demeanor ? pick(rng, cultural.demeanor) : pick(rng, DEMEANOR);

    // Use cultural accent if available, otherwise use generic
    const accent = cultural && cultural.accent ? pick(rng, cultural.accent) : pick(rng, VOICE_ACCENT);
    const voice = `${pick(rng,VOICE_TIMBRE)}, ${pick(rng,VOICE_PITCH)}; ${accent}`;

    // Use cultural manner if available (50% chance), otherwise generic
    const manner = (cultural && cultural.manner && rng() > 0.5) ? pick(rng, cultural.manner) : pick(rng, MANNER);

    const desc = `A ${age}, ${build} ${role.toLowerCase()} with ${hair} and ${eyes} eyes, wearing a ${attire}. ${dem} manner.`;
    staff.push({role, desc, voice, manner});
  }
  return staff;
}

// Build patrons using context to bias pools
function buildPatrons(rng, count, settlement, quality, size, timeOfDay, tavernType){
  const patrons = [];

  // Compose type/quirk/hook pools but boost context entries so they matter
  const typePool = boostedPool(PATRON_TYPES, [PATRON_TYPES_BY_SETTLEMENT[settlement], PATRON_TYPES_BY_QUALITY[quality], PATRON_TYPES_BY_SIZE[size], PATRON_TYPES_BY_TIME[timeOfDay], PATRON_TYPES_BY_TYPE[tavernType]]);
  const quirkPool = boostedPool(PATRON_QUIRKS, [PATRON_QUIRKS_BY_CONTEXT[settlement], PATRON_QUIRKS_BY_CONTEXT[quality], PATRON_QUIRKS_BY_CONTEXT[tavernType], PATRON_QUIRKS_BY_CONTEXT[timeOfDay]]);
  const hookPool = boostedPool(PATRON_HOOKS, [PATRON_HOOKS_BY_CONTEXT[settlement], PATRON_HOOKS_BY_CONTEXT[quality], PATRON_HOOKS_BY_CONTEXT[tavernType], PATRON_HOOKS_BY_CONTEXT[size], PATRON_HOOKS_BY_CONTEXT[timeOfDay]]);

  // Guarantee at least one context-specific patron type if available
  const ctxTypes = [].concat(PATRON_TYPES_BY_SETTLEMENT[settlement]||[], PATRON_TYPES_BY_QUALITY[quality]||[], PATRON_TYPES_BY_SIZE[size]||[], PATRON_TYPES_BY_TIME[timeOfDay]||[], PATRON_TYPES_BY_TYPE[tavernType]||[]).filter(Boolean);
  const usedTypes = new Set();
  if(ctxTypes.length){
    const t = pick(rng, ctxTypes);
    usedTypes.add(t);
    const age = pick(rng, AGE);
    const build = pick(rng, BUILD);
    const attire = pick(rng, ATTIRE);
    const quirk = pick(rng, quirkPool);
    const hook = pick(rng, hookPool);
    const desc = `${age}, ${build} ${t}`;
    const appearance = `${quirk}, wearing ${attire}`;
    patrons.push({desc, appearance, hook});
  }
  for(let i=patrons.length;i<count;i++){
    let type;
    let guard=0;
    do{ type = pick(rng, typePool); guard++; }while(usedTypes.has(type) && guard<10);
    usedTypes.add(type);
    const age = pick(rng, AGE);
    const build = pick(rng, BUILD);
    const attire = pick(rng, ATTIRE);
    const quirk = pick(rng, quirkPool);
    const hook = pick(rng, hookPool);
    const desc = `${age}, ${build} ${type}`;
    const appearance = `${quirk}, wearing ${attire}`;
    patrons.push({desc, appearance, hook});
  }
  return patrons;
}

function buildEventsOnly(rng, settlement, quality, size, timeOfDay, tavernType){
  const eventCount = Math.floor(rng() * 2) + 1; // 1 or 2 events
  const eventPool = boostedPool(TAVERN_EVENTS, [EVENTS_BY_TIME[timeOfDay], EVENTS_BY_TYPE[tavernType], EVENTS_BY_SETTLEMENT[settlement], EVENTS_BY_QUALITY[quality], EVENTS_BY_SIZE[size]]);
  const ctxEvents = [].concat(EVENTS_BY_TIME[timeOfDay]||[], EVENTS_BY_TYPE[tavernType]||[], EVENTS_BY_SETTLEMENT[settlement]||[], EVENTS_BY_QUALITY[quality]||[], EVENTS_BY_SIZE[size]||[]).filter(Boolean);
  const events = [];
  if(ctxEvents.length) events.push(pick(rng, ctxEvents));
  pickN(rng, eventPool, Math.max(0, eventCount - events.length)).forEach(e=>events.push(e));
  return events;
}

function buildBartenderRumors(rng, settlement, quality, size, timeOfDay, tavernType){
  const bartenderCount = Math.floor(rng() * 2) + 2; // 2 or 3 rumors
  const bartenderPool = boostedPool(BARTENDER_RUMORS, [BARTENDER_RUMORS_BY_TIME[timeOfDay], BARTENDER_RUMORS_BY_TYPE[tavernType], BARTENDER_RUMORS_BY_SETTLEMENT[settlement], BARTENDER_RUMORS_BY_QUALITY[quality]]);
  const ctxBart = [].concat(BARTENDER_RUMORS_BY_TIME[timeOfDay]||[], BARTENDER_RUMORS_BY_TYPE[tavernType]||[], BARTENDER_RUMORS_BY_SETTLEMENT[settlement]||[], BARTENDER_RUMORS_BY_QUALITY[quality]||[]).filter(Boolean);
  const bartenderRumors = [];
  if(ctxBart.length) bartenderRumors.push(pick(rng, ctxBart));
  pickN(rng, bartenderPool, Math.max(0, bartenderCount - bartenderRumors.length)).forEach(b=>bartenderRumors.push(b));
  return bartenderRumors;
}

function buildPatronRumors(rng, settlement, quality, size, timeOfDay, tavernType){
  const patronCount = Math.floor(rng() * 3) + 2; // 2-4 rumors
  const patronPool = boostedPool(PATRON_RUMORS, [PATRON_RUMORS_BY_TIME[timeOfDay], PATRON_RUMORS_BY_TYPE[tavernType], PATRON_RUMORS_BY_SETTLEMENT[settlement], PATRON_RUMORS_BY_QUALITY[quality], PATRON_RUMORS_BY_SIZE[size]]);
  const ctxPatRum = [].concat(PATRON_RUMORS_BY_TIME[timeOfDay]||[], PATRON_RUMORS_BY_TYPE[tavernType]||[], PATRON_RUMORS_BY_SETTLEMENT[settlement]||[], PATRON_RUMORS_BY_QUALITY[quality]||[], PATRON_RUMORS_BY_SIZE[size]||[]).filter(Boolean);
  const patronRumors = [];
  if(ctxPatRum.length) patronRumors.push(pick(rng, ctxPatRum));
  pickN(rng, patronPool, Math.max(0, patronCount - patronRumors.length)).forEach(p=>patronRumors.push(p));
  return patronRumors;
}

// ---------- State + per-section seeded RNG ----------
function prandSection(numericSeed, section){
  return mulberry32(((numericSeed >>> 0) ^ (hashString(section) >>> 0)) >>> 0);
}

// ---------- NPC Integration (Staff/Patron → Full NPC) ----------
function generateFullNPCFromStaff(role, desc, voice, manner){
  // Parse description to extract details
  const seed = $("tv-seed").value.trim() + "-" + role + "-" + Date.now();
  const rng = prand(seed);

  // Build full NPC details using existing tavern staff data
  const npc = {
    role,
    desc,
    voice: voice || `${pick(rng,VOICE_TIMBRE)}, ${pick(rng,VOICE_PITCH)}; ${pick(rng,VOICE_ACCENT)}`,
    mannerisms: (manner ? manner + "; " : "") + pick(rng, MANNER),
    quirk: pick(rng, ["collects buttons","keeps a neat ledger of tiny favors","names their tools","insists on exact change","carries a smooth lucky pebble","takes dawn walks daily","brews a personal tea blend","never swears","wears mismatched socks","polishes gear at the same hour"]),
    wants: [
      pick(rng, ["to make a fair sale","a quiet day of steady work","better tools","news from the road","to impress a supervisor","to trade for supplies","to hire short-term help","to clear a small debt","to finish on time"]),
      pick(rng, ["to maintain a good reputation","to teach an apprentice","repeat customers","to avoid shortages","a day off soon","a fair hearing","more storage space","to learn a new skill"])
    ].join("; "),
    avoids: [
      pick(rng, ["attention from officials","long haggling","rowdy crowds","credit purchases","wasting materials","lateness","broken promises","public arguments"]),
      pick(rng, ["being overheard","theft","refund disputes","wet weather","idle gossip about them","mud tracked indoors","smoldering coals near stock"])
    ].join("; "),
    secret: pick(rng, ["owes money to a local merchant guild","once witnessed a crime but never reported it","has a hidden stash of silver coins","secretly practices minor magic","keeps a journal of overheard conversations","is related to minor nobility","fled from another town years ago","knows the location of a smuggler's cache","has a false identity","once worked for a thieves' guild","is being blackmailed over a past indiscretion","sends anonymous donations to the local temple","saved a noble's life once","has a hidden family in another city","knows a secret passage under the town","once served in a war under a false name"])
  };

  return npc;
}
