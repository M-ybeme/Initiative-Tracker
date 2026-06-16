// ---------- Race Syllable Tables ----------
// `let` so importTables() can extend TABLES.Styles at runtime
let TABLES = {
  Styles: {
    "Human (Latin)": { start:["mar","luc","val","cass","dom","jul","oct","aur","fel","max"], mid:["a","e","i","o","u","an","or","us","ian","ell"], end:["a","us","ius","ian","ella","ina","or","io","ius","um"] },
    "Human (Norse)": { start:["al","bir","ein","har","ing","jor","kar","leif","sig","thor","ulf"], mid:["a","e","i","ar","ir","or","un","vald","bjorn","frid"], end:["ar","en","ir","or","ulf","vald","son","hild","brand","rid"] },
    "Human (Arabic)": { start:["al","has","kal","ras","sal"], mid:["a","i","im","ad"], end:["id","im","an","een"] },
    "Human (Asian)": { start:["li","mei","yan","jin","ming"], mid:["an","ing","ao","ei"], end:["li","ying","feng","long"] },
    "Dwarf":      { start:["br","dr","gr","kr","th","kh","st","sk","dur","bal","kor"], mid:["a","o","u","an","or","un","grim","gar","dr","brom"], end:["ar","orn","dur","mir","grin","gar","rak","dun","rik","stone"] },
    "Elf":        { start:["ae","e","i","lia","fae","sha","thi","yla","ari","ela"], mid:["ri","na","la","th","si","el","ia","lith","mir","vya"], end:["el","iel","ith","ien","a","ara","ielle","wyn","ion","ria"] },
    "Halfling":   { start:["al","ben","cor","dav","eli","fil","jon","mer","pip","sam"], mid:["a","e","i","o","u","on","an","el","er","il"], end:["o","y","ie","in","er","o","an","wick","foot","hill"] },
    "Gnome":      { start:["bod","cor","dim","fiz","gar","ned","pil","quin","ros","tim"], mid:["a","e","i","o","u","al","el","il","on","um"], end:["bin","dle","wick","ock","bit","er","um","win","ick","bur"] },
    "Dragonborn": { start:["arj","bal","drax","fen","gal","kry","mor","rax","thal","vor"], mid:["a","e","i","o","u","ar","ir","or","ul","an"], end:["thor","rax","ion","ys","dor","drim","thas","var","mir","zor"] },
    "Half-Orc":   { start:["gr","thr","kar","dur","gor"], mid:["a","o","u","ar","ok"], end:["ak","og","ush","gak","rim"] },
    "Tiefling":   { start:["az","bal","mal","xan","vor","zar","oth","vel","sama","bel"], mid:["a","e","i","o","u","az","ath","ir","or","ul","z"], end:["zor","oth","iel","ion","ius","ith","zel","rax","mon","eon"] },
    "Drow":       { start:["zae","xil","drae","vyr","zil","nyx","ssra","il","shi","ria"], mid:["ri","z","ss","yl","dra","vyr","il","ae","ith","yr"], end:["th","z","rin","thrae","ith","ria","zra","lyn","ithra","zz"] },
    "Goliath":    { start:["kav","kul","mav","thu","vok"], mid:["a","o","u","ak"], end:["aak","oth","nak","kar"] },
    "Firbolg":    { start:["adh","bru","car","dun","eir"], mid:["al","ir","an","or"], end:["an","ach","ion","os"] },
    "Genasi":     { start:["aer","ign","ter","hyd","zel","cal","phyr","pyra","thal","lum"], mid:["a","e","i","o","u","ra","ri","el","or","um"], end:["os","on","ius","ara","eth","or","as","ion","ir","al"] },
    "Triton":     { start:["cor","del","mar","nal","por"], mid:["a","i","an","or"], end:["is","os","ian","us"] },
    "Aarakocra":  { start:["kee","aak","quil","aar","kaa"], mid:["ka","ra","ki","ak"], end:["kra","aar","kek","rill"] },
    "Tabaxi":     { start:["cloud","rain","mist","storm","wind"], mid:["on","in"], end:["mountains","water","forest","leaves","sky"] },
    "Kenku":      { start:["kik","kak","krek","chik","kaw"], mid:["i","a","e","ee"], end:["kaw","eek","awk","ik"] },
    "Orc":        { start:["gr","br","dr","kr","mok","gar","zug","tok","urk","rag"], mid:["a","o","u","ag","og","uk","ur","ar","ok","ug"], end:["th","g","k","z","gor","nak","ruk","dok","zug","tar"] },
    "Goblin":     { start:["sk","sn","gr","kr","zik","rag","nib","skr","blit","krik"], mid:["a","e","i","o","u","ak","ik","ok","zz","g"], end:["it","ik","ak","ug","azz","nix","gob","git","grit","zag"] },
    "Hobgoblin":  { start:["kor","mag","drak","ghor","zar"], mid:["a","o","u","ag"], end:["gan","thul","ruk","dak"] },
    "Kobold":     { start:["kik","mik","tik","drix","zix"], mid:["i","a","ix","ak"], end:["ix","ak","ik","zik"] },
    "Lizardfolk": { start:["sli","dra","kra","iss","thi","ska","tro","laz","ss","vrak"], mid:["s","ss","az","iz","or","ur","ar","ra","ri","ko"], end:["th","ss","k","zz","g","sith","gash","kriss","zith","gor"] },
    "Bugbear":    { start:["gru","hru","kru","skar","thag"], mid:["u","oo","ag","ur"], end:["ub","ash","ug","urz"] },
    "Yuan-ti":    { start:["sss","sess","iss","zss","rass"], mid:["i","e","ss","eth"], end:["ith","eth","iss","ra"] },
    "Fey":        { start:["ly","fae","tia","ari","elo","vio","nyx","syl","zea","aur"], mid:["li","ra","ri","si","na","ve","ya","ie","el","mi"], end:["wyn","elle","ria","ith","ara","ien","iel","is","ora","yse"] },
    "Changeling": { start:["bin","jin","sin","ven","wyn"], mid:["a","e","i","ar"], end:["ak","et","ix","yn"] },
    "Warforged":  { start:["bul","cog","iron","steel","war"], mid:["wark","guard","mark"], end:["ed","er","on","ium"] }
  },
  GenderSuffix: {
    feminine:  ["a","ia","elle","ine","yra","wyn","issa"],
    masculine: ["ar","or","ric","dan","ion","mir","ath"],
    neutral:   []
  }
};

// ---------- Race Presets ----------
const RACE_PRESETS = {
  "Human (Latin)": { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.00, diaProb:0.02, harsh:15, exotic:5,  raceSuffix:["us","ius","ian","a"],        allowRaceSuffix:true },
  "Human (Norse)": { minSyl:2,maxSyl:3, gender:"masculine", aposProb:0.00, diaProb:0.00, harsh:25, exotic:0,  raceSuffix:["ulf","son","brand"],          allowRaceSuffix:true },
  "Human (Arabic)":{ minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.00, diaProb:0.00, harsh:20, exotic:5,  raceSuffix:["id","im","an","een"],         allowRaceSuffix:true },
  "Human (Asian)": { minSyl:2,maxSyl:2, gender:"neutral",   aposProb:0.00, diaProb:0.00, harsh:10, exotic:5,  raceSuffix:["li","ying","feng"],           allowRaceSuffix:true },
  "Dwarf":         { minSyl:2,maxSyl:3, gender:"masculine", aposProb:0.02, diaProb:0.00, harsh:60, exotic:5,  raceSuffix:["gar","grim","dun","rik"],     allowRaceSuffix:true },
  "Elf":           { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.06, diaProb:0.10, harsh:10, exotic:25, raceSuffix:["ion","iel","ith","iel"],      allowRaceSuffix:true },
  "Halfling":      { minSyl:2,maxSyl:2, gender:"neutral",   aposProb:0.01, diaProb:0.00, harsh:5,  exotic:5,  raceSuffix:["o","y","ie"],                 allowRaceSuffix:true },
  "Gnome":         { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.02, diaProb:0.00, harsh:15, exotic:10, raceSuffix:["bin","dle","wick"],           allowRaceSuffix:true },
  "Dragonborn":    { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.08, diaProb:0.08, harsh:55, exotic:35, raceSuffix:["thas","rax","dor","var"],     allowRaceSuffix:true },
  "Half-Orc":      { minSyl:2,maxSyl:2, gender:"masculine", aposProb:0.04, diaProb:0.00, harsh:65, exotic:10, raceSuffix:["ak","og","ush"],              allowRaceSuffix:true },
  "Tiefling":      { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.12, diaProb:0.15, harsh:40, exotic:45, raceSuffix:["iel","ius","eon","ith"],      allowRaceSuffix:true },
  "Drow":          { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.15, diaProb:0.20, harsh:35, exotic:55, raceSuffix:["zr","ith","rae","lyn"],       allowRaceSuffix:true },
  "Goliath":       { minSyl:2,maxSyl:3, gender:"masculine", aposProb:0.03, diaProb:0.00, harsh:50, exotic:10, raceSuffix:["aak","oth","nak"],            allowRaceSuffix:true },
  "Firbolg":       { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.02, diaProb:0.05, harsh:25, exotic:20, raceSuffix:["an","ach","ion"],             allowRaceSuffix:true },
  "Genasi":        { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.05, diaProb:0.10, harsh:30, exotic:35, raceSuffix:["eth","ion","ir"],             allowRaceSuffix:true },
  "Triton":        { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.02, diaProb:0.05, harsh:20, exotic:25, raceSuffix:["is","os","ian"],              allowRaceSuffix:true },
  "Aarakocra":     { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.08, diaProb:0.00, harsh:45, exotic:30, raceSuffix:["kra","aar","kek"],            allowRaceSuffix:true },
  "Tabaxi":        { minSyl:3,maxSyl:5, gender:"neutral",   aposProb:0.00, diaProb:0.00, harsh:5,  exotic:5,  raceSuffix:[],                            allowRaceSuffix:false },
  "Kenku":         { minSyl:2,maxSyl:2, gender:"neutral",   aposProb:0.05, diaProb:0.00, harsh:50, exotic:15, raceSuffix:["kaw","eek","awk"],            allowRaceSuffix:true },
  "Orc":           { minSyl:2,maxSyl:2, gender:"masculine", aposProb:0.04, diaProb:0.00, harsh:75, exotic:10, raceSuffix:["g","th","zug","nak"],         allowRaceSuffix:true },
  "Goblin":        { minSyl:2,maxSyl:2, gender:"neutral",   aposProb:0.03, diaProb:0.00, harsh:55, exotic:10, raceSuffix:["gob","git","grit","zag"],     allowRaceSuffix:true },
  "Hobgoblin":     { minSyl:2,maxSyl:3, gender:"masculine", aposProb:0.03, diaProb:0.00, harsh:60, exotic:10, raceSuffix:["gan","thul","ruk"],           allowRaceSuffix:true },
  "Kobold":        { minSyl:2,maxSyl:2, gender:"neutral",   aposProb:0.05, diaProb:0.00, harsh:55, exotic:15, raceSuffix:["ix","ak","ik"],               allowRaceSuffix:true },
  "Lizardfolk":    { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.07, diaProb:0.00, harsh:65, exotic:20, raceSuffix:["ss","th","zz"],               allowRaceSuffix:true },
  "Bugbear":       { minSyl:2,maxSyl:2, gender:"masculine", aposProb:0.02, diaProb:0.00, harsh:70, exotic:5,  raceSuffix:["ub","ash","ug"],              allowRaceSuffix:true },
  "Yuan-ti":       { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.08, diaProb:0.00, harsh:55, exotic:30, raceSuffix:["ith","eth","iss"],            allowRaceSuffix:true },
  "Fey":           { minSyl:2,maxSyl:3, gender:"feminine",  aposProb:0.05, diaProb:0.18, harsh:10, exotic:40, raceSuffix:["wyn","elle","yse"],           allowRaceSuffix:true },
  "Changeling":    { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.05, diaProb:0.05, harsh:20, exotic:25, raceSuffix:["ak","et","ix"],               allowRaceSuffix:true },
  "Warforged":     { minSyl:2,maxSyl:3, gender:"neutral",   aposProb:0.00, diaProb:0.00, harsh:65, exotic:5,  raceSuffix:["ed","er","on"],               allowRaceSuffix:true }
};

// ---------- Consonant clusters for harshness ----------
const HARSH_CLUSTERS = ["kr","gr","dr","br","zz","rk","sk","st","thr","zg"];
