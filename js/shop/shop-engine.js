// ---------- Seeded RNG ----------
function hashString(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return (h>>>0)>>>0}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function prand(seedStr){const s = seedStr? hashString(seedStr) : Math.floor(Math.random()*2**32); return mulberry32(s) }

function getRestockLabel(type, settlement){
  const rt = RESTOCK_BASE[type] || { days:[7,14], note:"supplier dependent" };
  const mod = settlement === 'village' ? 3 : settlement === 'capital' ? -1 : 0;
  let [a, b] = rt.days.map(d => Math.max(1, d + mod));
  if(type === 'Pawn Shop') return "constantly (walk-in stock)";
  if(type === 'Mercenary/Bounty') return "as contracts come in";
  if(type === 'Black Market') return settlement === 'village' ? "every 5–8 days (unpredictable)" : settlement === 'capital' ? "every 2–4 days (unpredictable)" : "every 2–5 days (unpredictable)";
  if(a === 1 && b === 1) return settlement === 'village' ? "every 1–2 days" : "daily";
  if(b >= 14){ const wA=Math.ceil(a/7), wB=Math.round(b/7); return wA===wB?`every ${wA} week${wA>1?'s':''}`:`every ${wA}–${wB} weeks`; }
  if(a === b) return `every ${a} day${a>1?'s':''}`;
  return `every ${a}–${b} days`;
}


// ---------- Stock Depletion (localStorage keyed to seed) ----------
function soldKey(seed){ return `dmtools.shopSold.${seed}`; }
function getSoldSet(seed){
  if(!seed) return new Set();
  try{ const r=localStorage.getItem(soldKey(seed)); return r ? new Set(JSON.parse(r)) : new Set(); }
  catch{ return new Set(); }
}
function saveSoldSet(seed, s){
  if(!seed) return;
  try{ localStorage.setItem(soldKey(seed), JSON.stringify([...s])); }
  catch(e){ console.warn('sold-save failed',e); }
}
function markSold(seed, k){ const s=getSoldSet(seed); s.add(k); saveSoldSet(seed,s); }
function markUnsold(seed, k){ const s=getSoldSet(seed); s.delete(k); saveSoldSet(seed,s); }
function clearShopSold(seed, anchorId){ const s=getSoldSet(seed); for(const k of [...s]) if(k.startsWith(anchorId+'::')) s.delete(k); saveSoldSet(seed,s); }
function itemSoldKey(anchorId, name){ return `${anchorId}::${name}`; }


// ---------- Helpers ----------
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)] }
function within(rng, [a,b]){ return a + rng()*(b-a) }
function choiceByRarity(rng, items, weights, allowRare){
  // Map gating to a per-pick chance for 'rare' entering the pool
  const rareGate = (allowRare==='no') ? 0
                 : (allowRare==='auto') ? 0.02
                 : (allowRare==='low') ? 0.03
                 : (allowRare==='mid') ? 0.08
                 : (allowRare==='high') ? 0.15
                 : 0.05; // sane fallback

  const pool = items.filter(it => it.r !== 'rare' || rng() < rareGate);
  // Fallback if we accidentally eliminated all items
  const safePool = pool.length ? pool : items.filter(it => it.r !== 'rare');
  const usePool  = safePool.length ? safePool : items;

  const w = usePool.map(it => it.r==='common' ? weights.common
                             : it.r==='uncommon' ? weights.uncommon
                             : weights.rare);
  const total = w.reduce((a,b)=>a+b,0);
  let r = rng()*total;
  for(let i=0;i<usePool.length;i++){ if((r-=w[i])<=0) return usePool[i]; }
  return usePool[usePool.length-1];
}

function formatPrice(sp){
  if(sp>=10){ const gp = sp/10; return (gp%1? gp.toFixed(1): gp.toFixed(0))+" gp"; }
  return sp+" sp";
}
function priceWithSettlement(rng, baseSp, settle){
  const mul = within(rng, SETTLEMENT[settle].price);
  return Math.max(1, Math.round(baseSp*mul));
}
function uniqueLine(rng){
  const adj = pick(rng, FLAV_ADJ), mat = pick(rng, FLAV_MAT), dec = pick(rng, FLAV_DEC), uq = pick(rng, FLAV_UNIQUE);
  return `${adj} ${mat}, ${dec} pattern; ${uq}.`;
}
function decorateDesc(rng, d){
  if(rng()<0.6) d += ` ${pick(rng, FLAV_ADJ)} finish.`;
  if(rng()<0.35) d += ` ${pick(rng, FLAV_DEC)} detail.`;
  return d;
}

function slugifyShop(type, idx){
  const base = type.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return `shop-${base||'entry'}-${idx+1}`;
}


// ---------- Shopkeeper Generation ----------
function makeShopkeeper(rng, shopType, settlement){
  const roll = rng();
  let pType, namePool;
  if(roll < 0.70){ pType='fitting';    namePool=pick(rng,[SHOPKEEPER_NAMES.generic,SHOPKEEPER_NAMES.generic,SHOPKEEPER_NAMES.humble]); }
  else if(roll < 0.90){ pType='ironic'; namePool=pick(rng,[SHOPKEEPER_NAMES.generic,SHOPKEEPER_NAMES.exotic]); }
  else { pType='wrongField'; namePool=pick(rng,[SHOPKEEPER_NAMES.exotic,SHOPKEEPER_NAMES.scholarly,SHOPKEEPER_NAMES.generic]); }

  const name = pick(rng, namePool);
  const personalitySet = SHOPKEEPER_PERSONALITY[pType][shopType] || SHOPKEEPER_PERSONALITY[pType].default;
  const personality = pick(rng, personalitySet);

  // RP notes from SHOPKEEPER_RP
  const rp = SHOPKEEPER_RP[shopType];
  const want   = rp ? pick(rng, rp.wants) : 'something to make the shop run better';
  const hook   = rp ? pick(rng, rp.hooks) : 'has a story if you ask the right question';
  const settl  = (settlement === 'village' || settlement === 'town' || settlement === 'capital') ? settlement : 'town';
  const rumorPool = rp ? (rp.rumors[settl] || rp.rumors.town) : ["heard something interesting lately"];
  const rumor  = pick(rng, rumorPool);

  return { name, personality, type: pType, want, hook, rumor };
}

