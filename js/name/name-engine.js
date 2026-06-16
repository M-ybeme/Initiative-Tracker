// ---------- State (shared with name-ui.js for per-tile rerolls) ----------
let CURRENT_CFG  = null;
let CURRENT_SEED = 'random';

// ---------- Seeded RNG (Mulberry32) ----------
function hashString(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return (h>>>0)>>>0}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function prand(seedStr){const s = seedStr ? hashString(seedStr) : Math.floor(Math.random()*2**32); return mulberry32(s)}

// ---------- Utilities ----------
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)] }
function maybe(rng, p){ return rng() < p }

function injectApostrophe(rng, s){
  if(s.length < 4) return s;
  const i = 1 + Math.floor(rng()*(s.length-2));
  return s.slice(0,i) + "'" + s.slice(i);
}

const DIA = { map: { a:['á','â','ä','à'], e:['é','ê','ë','è'], i:['í','î','ï','ì'], o:['ó','ô','ö','ò'], u:['ú','û','ü','ù'], y:['ý','ÿ'] } };

function sprinkleDiacritics(rng, s, p){
  return s.split('').map(ch=>{
    const low = ch.toLowerCase();
    if(DIA.map[low] && maybe(rng, p)){
      const rep = pick(rng, DIA.map[low]);
      return ch === low ? rep : rep.toUpperCase();
    }
    return ch;
  }).join('');
}

function applyAlliteration(letter, s){
  if(!letter) return s;
  const l = letter.toLowerCase();
  return s.replace(/^[a-zA-Z]/, l);
}

// ---------- Core generator ----------
function makeOne(styleKey, minSyl, maxSyl, gender, allit, opts, rng){
  const fallbackStyle = 'Elf';
  const style = TABLES.Styles[styleKey] || TABLES.Styles[fallbackStyle];
  const { aposProb, diaProb, harsh, exotic, useRaceSuffix, raceSuffixList } = opts;

  const lo = Math.max(1, Math.min(minSyl, maxSyl));
  const hi = Math.max(lo, maxSyl);
  const sylCount = lo + Math.floor(rng() * (hi - lo + 1));

  const parts = [];
  for(let i = 0; i < sylCount; i++){
    if(i === 0){
      parts.push(pick(rng, style.start));
    } else if(i === sylCount-1){
      parts.push(pick(rng, style.end));
    } else {
      const useHarsh = maybe(rng, Math.min(1, harsh/100));
      parts.push(useHarsh ? pick(rng, HARSH_CLUSTERS) : pick(rng, style.mid));
    }
  }
  let name = parts.join('');
  name = name.replace(/([aeiou])\1{2,}/gi,'$1$1').replace(/([^aeiou])\1{2,}/gi,'$1$1');

  const gset = TABLES.GenderSuffix[gender] || [];
  if(gset.length && maybe(rng, gender === 'neutral' ? 0.10 : 0.55)) name += pick(rng, gset);

  if(useRaceSuffix && raceSuffixList && raceSuffixList.length && maybe(rng, 0.35)){
    name += pick(rng, raceSuffixList);
  }

  const effectiveApos = Math.min(1, aposProb + (exotic/100)*0.10);
  const effectiveDia  = Math.min(1, diaProb  + (exotic/100)*0.20);

  if(maybe(rng, effectiveApos)) name = injectApostrophe(rng, name);
  if(effectiveDia > 0) name = sprinkleDiacritics(rng, name, effectiveDia);
  name = applyAlliteration(allit, name);

  return name.charAt(0).toUpperCase() + name.slice(1);
}

function makeFullName(rng, cfg){
  const {
    style, minSyl, maxSyl, gender, allit,
    harsh, exotic, allowApos, allowDia,
    raceSuffixOn, raceSuffixList,
    withSurname, surnameStyle, joiner
  } = cfg;

  const opts = {
    aposProb: allowApos ? 0.12 : 0,
    diaProb:  allowDia  ? 0.08 : 0,
    harsh, exotic,
    useRaceSuffix: raceSuffixOn,
    raceSuffixList
  };

  const first = makeOne(style, minSyl, maxSyl, gender, allit, opts, rng);
  if(!withSurname) return first;

  const last = makeOne(surnameStyle || style, 2, 3, "neutral", "", opts, rng);
  const glue = (joiner || ' ').slice(0, 5);
  return (first + glue + last).replace(/\s{2,}/g,' ').trim();
}
