// ---------- Seeded RNG ----------
function hashString(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return (h>>>0)>>>0}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function prand(seedStr){const s=seedStr?hashString(seedStr):Math.floor(Math.random()*2**32);return mulberry32(s)}

// ---------- Utils ----------
function pick(rng,arr){return arr[Math.floor(rng()*arr.length)]}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function tags(...xs){return xs}
function toTitle(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function spToGp(sp){return +(sp/10).toFixed(2)}
function gpToSp(gp){return Math.round(gp*10)}

// Mixed coin bundle
function coinBundle(rng,minSp,maxSp){
  let total=Math.max(minSp,Math.floor(minSp+rng()*(maxSp-minSp+1)));
  let gp=0,sp=0,cp=0;
  if(total>=100){gp=Math.floor((total/10)*(0.15+rng()*0.35)); total-=gp*10;}
  sp=Math.floor(total*(0.5+rng()*0.4)); total-=sp;
  cp=total*10;
  const tokens=rng()<0.12?Math.max(1,Math.floor(rng()*6)):0;
  return {gp,sp,cp,tokens};
}
function formatCoinBundle(b){
  const parts=[]; if(b.gp) parts.push(`${b.gp} gold`); if(b.sp) parts.push(`${b.sp} silver`); if(b.cp) parts.push(`${b.cp} copper`); if(b.tokens) parts.push(`${b.tokens} brass trade tokens`);
  return parts.join(", ");
}

// ---------- Value & Weight ----------
function estimateValue(rng,b){const baseSp=b.sp[0]+Math.floor(rng()*(b.sp[1]-b.sp[0]+1));return Math.max(1,baseSp)}
function estimateWeight(rng,b){const jitter=(rng()-0.5)*0.1*b.w;return Math.max(0.01, +(b.w + jitter).toFixed(2))}

// Masterwork upgrade
function tryUpgrade(rng,item){
  if(rng()<0.08){
    item.title=item.title.replace(/^(?:plain|used|well-used|sturdy|serviceable)\s/i,"");
    item.title=item.title.replace(/^(.*)$/i,"masterwork $1");
    item.value=Math.floor(item.value*(1.5+rng()*0.8));
  }
}

// Themed bundles (TEMPLATE resolved at call time from loot-catalogs.js)
function themedBundle(rng, templateKey){
  const mkContainer=(titleBase)=>({cat:"Bags & Containers",title:titleBase,value:0,weight:0.4,tags:["bundle","container"],isValuable:true});
  const coin=(sp)=>({cat:"Coins & Purses",title:`Pouch of ${spToGp(sp)} gp (${sp} sp)`,value:sp,weight:0.05,tags:["currency"],isValuable:true});

  const choice = (()=> {
    const bias = TEMPLATE[templateKey]?.bundleBias || {};
    const r = rng();
    const pS = bias.smuggler||0, pH = (pS + (bias.hunter||0)), pM = (pH + (bias.merchant||0));
    if(r < pS) return "smuggler";
    if(r < pH) return "hunter";
    if(r < pM) return "merchant";
    return pick(rng,["smuggler","hunter","merchant"]);
  })();

  if(choice==="smuggler"){
    const base = mkContainer("Smuggler's tin");
    const picks = [
      {cat:"Toolkits & Supplies",title:"Lockpicks (quality set)",value:estimateValue(rng,{sp:[900,2400]}),weight:0.2,tags:["tools","specialty"],isValuable:true},
      {cat:"Toolkits & Supplies",title:"Forged papers (traveler's marks)",value:estimateValue(rng,{sp:[700,1500]}),weight:0.1,tags:["tools","paper"],isValuable:true},
      coin(70)
    ];
    base.title += ` containing ${picks.map(p=>p.title).join("; ")}`;
    base.value = picks.reduce((t,p)=>t+p.value,0);
    base.weight = +(base.weight + picks.reduce((t,p)=>t+p.weight,0)).toFixed(2);
    return base;
  }
  if(choice==="hunter"){
    const base = mkContainer("Hunter's roll");
    const picks = [
      {cat:"Adventuring Gear of Note",title:"Snares (3)",value:estimateValue(rng,{sp:[120,300]}),weight:0.6,tags:["gear"],isValuable:false},
      {cat:"Adventuring Gear of Note",title:"Pitons (10)",value:estimateValue(rng,{sp:[300,900]}),weight:5.0,tags:["gear"],isValuable:true},
      {cat:"Adventuring Gear of Note",title:"Rope, hempen 50′",value:estimateValue(rng,{sp:[100,300]}),weight:10.0,tags:["gear"],isValuable:false}
    ];
    base.title += ` containing ${picks.map(p=>p.title).join("; ")}`;
    base.value = picks.reduce((t,p)=>t+p.value,0);
    base.weight = +(base.weight + picks.reduce((t,p)=>t+p.weight,0)).toFixed(2);
    return base;
  }
  // merchant
  const base = mkContainer("Merchant parcel");
  const picks = [
    {cat:"Trade Goods",title:"Spices (sealed pouch)",value:estimateValue(rng,{sp:[400,1200]}),weight:1.0,tags:["trade"],isValuable:true},
    {cat:"Trade Goods",title:"Fine cloth (rolled)",value:estimateValue(rng,{sp:[300,1000]}),weight:2.0,tags:["trade"],isValuable:true},
    {cat:"Writing & Games",title:"Tally slate with chalk",value:estimateValue(rng,{sp:[80,220]}),weight:0.6,tags:["stationery"],isValuable:false}
  ];
  base.title += ` containing ${picks.map(p=>p.title).join("; ")}`;
  base.value = picks.reduce((t,p)=>t+p.value,0);
  base.weight = +(base.weight + picks.reduce((t,p)=>t+p.weight,0)).toFixed(2);
  return base;
}

// Maybe bundle contents inside containers; inject themed bundles sometimes
// CATS and TEMPLATE resolved at call time from loot-catalogs.js
function maybeBundle(rng,item,templateKey){
  if(item.cat==="Bags & Containers" && rng()<0.18){
    return themedBundle(rng, templateKey||"none");
  }
  if(item.cat!=="Bags & Containers"||rng()>=0.18) return item;

  const howMany=1+Math.floor(rng()*3);
  let catsForFill=["Coins & Purses","Writing & Games","Tools & Utensils","Adventuring Gear of Note","Gems & Art"];
  if(templateKey==="wizard") catsForFill=["Writing & Games","Toolkits & Supplies","Adventuring Gear of Note","Coins & Purses"];
  if(templateKey==="ship") catsForFill=["Trade Goods","Bags & Containers","Coins & Purses","Toolkits & Supplies"];
  if(templateKey==="goblin") catsForFill=["Food & Provisions","Tools & Utensils","Coins & Purses","Bags & Containers"];

  const picks=[];
  for(let i=0;i<howMany;i++){
    const c=pick(rng,catsForFill);
    const inner=makeOne(rng,c,true,templateKey);
    picks.push(inner);
  }
  const innerText=picks.map(p=>p.title).join("; ");
  item.title+=` containing ${innerText}`;
  item.value+=picks.reduce((t,p)=>t+p.value,0);
  item.weight=+(item.weight+picks.reduce((t,p)=>t+p.weight,0)).toFixed(2);
  item.tags=Array.from(new Set([...item.tags,"bundle","container"]));
  item.isValuable=item.isValuable||picks.some(p=>p.isValuable);
  return item;
}

// Compose one item (CATS and TEMPLATE resolved at call time from loot-catalogs.js)
function makeOne(rng,catKey,noBundle=false,templateKey="none",magicOn=false,cursedOn=false,curseSeverity=3){
  const cat=CATS[catKey];

  let basePool = cat.base;
  if(catKey === "Cursed Items" && cursedOn){
    basePool = cat.base.filter(b => b.severity <= curseSeverity);
    if(basePool.length === 0) basePool = cat.base;
  }

  const base=pick(rng,basePool);
  let [desc,taglist,forceVal]=cat.make(rng,base);

  const fl=TEMPLATE[templateKey]?.flavor||[];
  if(fl.length && rng()<0.35) desc += `, ${pick(rng,fl)}`;

  let sp=estimateValue(rng,base), wt=estimateWeight(rng,base);
  let title=toTitle(desc);
  const item={k:`${catKey}:${title}`,cat:catKey,title,value:sp,weight:wt,tags:taglist,isValuable:!!forceVal};

  if(catKey!=="Minor Magic" && catKey!=="Cursed Items") tryUpgrade(rng,item);

  return noBundle?item:maybeBundle(rng,item,templateKey);
}

// Weighted category pick from usefulness slider + template multipliers
// TEMPLATE resolved at call time from loot-catalogs.js
function categoryWeights(selectedCats,usefulness01,templateKey,magicOn,cursedOn,allowMinorMagicPool=true,allowCursedPool=true){
  const base = {
    "Trade Goods": 0.8, "Gems & Art": 0.9, "Adventuring Gear of Note": 0.85, "Toolkits & Supplies": 0.8,
    "Coins & Purses": 0.6,
    "Clothing & Wearables": 0.4, "Tools & Utensils": 0.5, "Household & Table": 0.35,
    "Writing & Games": 0.45, "Food & Provisions": 0.35, "Curios & Charms": 0.3, "Bags & Containers": 0.5,
    "Potions & Elixirs": 0.7, "Arcane Scrolls": 0.7,
    "Mundane Adventuring Items": 0.6,
    "Weapons & Armor": 0.65,
    "Minor Magic": magicOn ? 0.35 : 0.0,
    "Cursed Items": cursedOn ? 0.25 : 0.0
  };
  const flavorBoost = 1 - usefulness01;
  const usefulBoost = usefulness01;
  const mult = TEMPLATE[templateKey]?.catMult || {};

  const weights = {};
  for(const c of selectedCats){
    let w = base[c] ?? 0.5;
    if(["Curios & Charms","Household & Table","Food & Provisions","Clothing & Wearables","Writing & Games"].includes(c)) {
      w = w*(0.6 + 0.8*flavorBoost);
    } else {
      w = w*(0.6 + 0.8*usefulBoost);
    }
    if(mult[c]) w *= mult[c];
    weights[c]=Math.max(0.0001,w);
  }
  if(magicOn && allowMinorMagicPool){
    let w = base["Minor Magic"];
    if(templateKey==="wizard") w *= 1.35;
    weights["Minor Magic"] = (weights["Minor Magic"]||0) + w;
  }
  if(cursedOn && allowCursedPool){
    let w = base["Cursed Items"];
    if(templateKey==="lich") w *= 1.5;
    if(templateKey==="demon") w *= 1.4;
    if(templateKey==="undead") w *= 1.3;
    weights["Cursed Items"] = (weights["Cursed Items"]||0) + w;
  }

  const sum = Object.values(weights).reduce((a,b)=>a+b,0) || 1;
  for(const k in weights) weights[k]/=sum;
  return weights;
}

function weightedPick(rng, cats, weights){
  const r=rng(); let acc=0;
  for(const c of cats){ acc+=weights[c]??0; if(r<=acc) return c; }
  return cats[cats.length-1];
}

// ---------- Generation core (Count mode) ----------
function generateCount(rng, selectedCats, opts){
  const {count,minSp,maxSp,usefulness01,templateKey,magicOn,cursedOn,curseSeverity,allowMinorMagicPool=true,allowCursedPool=true} = opts;
  const weights=categoryWeights(selectedCats,usefulness01,templateKey,magicOn,cursedOn,allowMinorMagicPool,allowCursedPool);
  const seen=new Set(), list=[];
  let guard=0, maxGuard=count*100;

  let pickableCats = [...new Set(selectedCats)];
  if(magicOn && allowMinorMagicPool && !pickableCats.includes("Minor Magic")) pickableCats.push("Minor Magic");
  if(cursedOn && allowCursedPool && !pickableCats.includes("Cursed Items")) pickableCats.push("Cursed Items");

  while(list.length<count && guard++<maxGuard){
    const cat=weightedPick(rng,pickableCats,weights);
    const item=makeOne(rng,cat,false,templateKey,magicOn,cursedOn,curseSeverity);
    if(item.value<minSp || item.value>maxSp) continue;
    if(seen.has(item.k)) continue;
    seen.add(item.k);
    list.push(item);
  }
  return list;
}

// ---------- Generation to budget (Budget mode) ----------
function generateToBudget(rng, selectedCats, opts){
  const {targetSp, softCount, minSp, maxSp, usefulness01, templateKey, magicOn, cursedOn, curseSeverity, allowMinorMagicPool=true, allowCursedPool=true} = opts;
  const weights=categoryWeights(selectedCats,usefulness01,templateKey,magicOn,cursedOn,allowMinorMagicPool,allowCursedPool);
  let pickableCats = [...new Set(selectedCats)];
  if(magicOn && allowMinorMagicPool && !pickableCats.includes("Minor Magic")) pickableCats.push("Minor Magic");
  if(cursedOn && allowCursedPool && !pickableCats.includes("Cursed Items")) pickableCats.push("Cursed Items");
  const list=[]; let total=0; let guard=0;

  // Greedy fill
  while(total<targetSp*0.9 && guard++<6000){
    const cat=weightedPick(rng,pickableCats,weights);
    const it=makeOne(rng,cat,false,templateKey,magicOn,cursedOn,curseSeverity);
    if(it.value>maxSp || it.value<minSp) continue;
    if(softCount && list.length>=softCount && total+it.value>targetSp*1.1) break;
    if(total+it.value>targetSp*1.15 && rng()<0.7) continue;
    list.push(it); total+=it.value;
  }

  // Improvement pass to aim ±10%
  let tries=250;
  while(tries-- && (total<targetSp*0.9 || total>targetSp*1.1) && list.length){
    const i=Math.floor(rng()*list.length);
    const old=list[i];
    const cat=weightedPick(rng,pickableCats,weights);
    const cand=makeOne(rng,cat,false,templateKey,magicOn,cursedOn,curseSeverity);
    if(cand.value>maxSp || cand.value<minSp) continue;
    const newTotal=total-old.value+cand.value;
    if(Math.abs(newTotal-targetSp) < Math.abs(total-targetSp)){
      list[i]=cand; total=newTotal;
    }
  }
  return list;
}
