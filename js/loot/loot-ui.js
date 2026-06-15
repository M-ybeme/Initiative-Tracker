// ---------- DOM shorthand ----------
const $=id=>document.getElementById(id);

// ---------- State ----------
let customLootTables = {};
let currentList=[];
let currentRenderOpts={wantWeight:true,wantTags:true};
let currentGenOpts={templateKey:'none',magicOn:false,cursedOn:false,curseSeverity:3,minSp:0,maxSp:250,selectedCats:[]};
let activeQuickBundle = null;

// ---------- Category checkboxes ----------
// Called from DOMContentLoaded; CATS resolved at call time from loot-catalogs.js
function buildCategoryCheckboxes(){
  const wrap=$("lg-cats"); wrap.innerHTML="";
  const order = Object.keys(CATS).filter(k=>k!=="Minor Magic"); // magic is gated by toggle
  for(const k of order){
    const id="cat-"+k.replace(/[^a-z0-9]/gi,'');
    const checked = !["Curios & Charms","Household & Table"].includes(k);
    const div=document.createElement("div");div.className="col";
    div.innerHTML=`<div class="form-check">
      <input class="form-check-input" type="checkbox" id="${id}" data-cat="${k}" ${checked?"checked":""}>
      <label class="form-check-label" for="${id}">${k}</label>
    </div>`;
    wrap.appendChild(div);
  }
}

// ---------- Render & meta ----------
function renderList(list, wantWeight, wantTags){
  const out=$("lg-out"); out.innerHTML="";
  let totalSp=0, totalWt=0, valCount=0, cursedCount=0;
  for(let idx=0;idx<list.length;idx++){
    const it=list[idx];
    totalSp+=it.value; totalWt+=it.weight; if(it.isValuable) valCount++;
    const isCursed = it.cat === "Cursed Items";
    if(isCursed) cursedCount++;
    const col=document.createElement("div"); col.className="col";
    const div=document.createElement("div"); div.className="loot-tile";

    if(isCursed){
      div.style.borderColor = "#dc3545";
      div.style.backgroundColor = "rgba(220, 53, 69, 0.1)";
    }

    const gp=spToGp(it.value);
    const cursedMarker = isCursed ? ' • <span class="text-danger"><i class="bi bi-exclamation-triangle-fill"></i> CURSED</span>' : '';
    div.innerHTML=`
      <button class="reroll-btn" data-idx="${idx}" title="Reroll this item"><i class="bi bi-dice-5"></i></button>
      <div class="loot-title">${it.title}</div>
      <div class="loot-sub">${it.cat}${it.isValuable?' • <span class="text-warning">valuable</span>':''}${cursedMarker}</div>
      <div class="loot-meta">${(gp%1?gp.toFixed(2):gp)} gp (${it.value} sp)${wantWeight?` • ${it.weight} lb`:``}${wantTags?` • ${it.tags.join(", ")}`:``}</div>
    `;
    col.appendChild(div); out.appendChild(col);
  }
  const meta=$("lg-meta"); meta.innerHTML="";
  const pills = [
    ["Items", list.length],
    ["Total value", `${spToGp(totalSp)} gp (${totalSp} sp)`],
    ["Total weight", `${totalWt.toFixed(2)} lb`],
    ["Valuable", `${valCount} (${Math.round((valCount/(list.length||1))*100)}%)`]
  ];
  if(cursedCount > 0){
    pills.push(["Cursed", `${cursedCount} (${Math.round((cursedCount/(list.length||1))*100)}%)`]);
  }
  for(const [k,v] of pills){ const s=document.createElement("span"); s.className="pill"; s.textContent=`${k}: ${v}`; meta.appendChild(s); }
}

// ---------- Clipboard / download ----------
function copyOut(){
  const rows=[...document.querySelectorAll("#lg-out .loot-tile")].map(tile=>{
    const t=tile.querySelector(".loot-title").textContent;
    const m=tile.querySelector(".loot-meta").textContent;
    return `${t} — ${m}`;
  });
  if(!rows.length) return;
  navigator.clipboard.writeText(rows.join("\n"));
}
function downloadOut(){
  const rows=[...document.querySelectorAll("#lg-out .loot-tile")].map(tile=>{
    const t=tile.querySelector(".loot-title").textContent;
    const s=tile.querySelector(".loot-sub").textContent;
    const m=tile.querySelector(".loot-meta").textContent;
    return `${t}\n${s}\n${m}\n`;
  });
  if(!rows.length) return;
  const blob=new Blob([rows.join("\n")],{type:"text/plain"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="loot.txt"; a.click(); URL.revokeObjectURL(url);
}

// ---------- Per-item reroll ----------
function rerollItem(idx){
  if(!currentList.length||idx<0||idx>=currentList.length)return;
  const old=currentList[idx];
  const cat=old.cat;
  const seen=new Set(currentList.map(it=>it.k));
  seen.delete(old.k);
  const rng=prand('');
  const {templateKey,magicOn,cursedOn,curseSeverity,minSp,maxSp}=currentGenOpts;
  let newItem=null;
  for(let i=0;i<60;i++){
    const candidate=makeOne(rng,cat,false,templateKey,magicOn,cursedOn,curseSeverity);
    if(candidate.value<minSp||candidate.value>maxSp)continue;
    if(seen.has(candidate.k))continue;
    newItem=candidate;break;
  }
  if(!newItem)return;
  currentList[idx]=newItem;
  renderList(currentList,currentRenderOpts.wantWeight,currentRenderOpts.wantTags);
}

// ---------- Markdown export ----------
function downloadMarkdown(){
  if(!currentList.length)return;
  const date=new Date().toLocaleDateString();
  const totalGp=spToGp(currentList.reduce((t,it)=>t+it.value,0));
  const totalWt=currentList.reduce((t,it)=>t+it.weight,0).toFixed(2);
  const byCat={};
  for(const it of currentList){if(!byCat[it.cat])byCat[it.cat]=[];byCat[it.cat].push(it);}
  let md=`# Loot — ${date}\n\n**Items:** ${currentList.length} | **Total Value:** ${totalGp} gp | **Total Weight:** ${totalWt} lb\n\n`;
  for(const [cat,items] of Object.entries(byCat)){
    md+=`## ${cat}\n\n`;
    for(const it of items){
      const gp=spToGp(it.value);
      const val=gp%1?gp.toFixed(2):gp;
      const cursedNote=it.cat==='Cursed Items'?' ⚠️ CURSED':'';
      md+=`- **${it.title}**${cursedNote} — ${val} gp`;
      if(currentRenderOpts.wantWeight)md+=` • ${it.weight} lb`;
      md+='\n';
    }
    md+='\n';
  }
  const blob=new Blob([md],{type:'text/markdown'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='loot.md';a.click();URL.revokeObjectURL(url);
}

// ---------- Wire up ----------
function currentSelectedCats(){
  return [...document.querySelectorAll("#lg-cats input:checked")].map(x=>x.dataset.cat);
}

function setActiveQuickBundle(bundleKey) {
  const bundle = QUICK_BUNDLES[bundleKey];
  if (!bundle) {
    activeQuickBundle = null;
    return;
  }
  const override = (bundle.overrideCategories && bundle.overrideCategories.length)
    ? bundle.overrideCategories
    : (bundle.categories || []);
  const filtered = override.filter(cat => !!CATS[cat]);
  activeQuickBundle = {
    key: bundleKey,
    categories: filtered.length ? Array.from(new Set(filtered)) : null,
    allowImplicitMinorMagic: bundle.allowImplicitMinorMagic !== false,
    allowImplicitCursed: bundle.allowImplicitCursed !== false
  };
}

function clearActiveQuickBundle() {
  activeQuickBundle = null;
}

function applyQuickBundle(bundleKey) {
  const bundle = QUICK_BUNDLES[bundleKey];
  if (!bundle) return;

  setActiveQuickBundle(bundleKey);

  if (bundle.mode === "budget") {
    $("lg-mode-budget").checked = true;
  } else {
    $("lg-mode-count").checked = true;
  }

  if (bundle.lootType === "individual") {
    $("lg-loot-individual").checked = true;
  } else {
    $("lg-loot-hoard").checked = true;
  }

  $("lg-count").value = bundle.count;
  $("lg-min").value = bundle.min;
  $("lg-max").value = bundle.max;
  $("lg-budget").value = bundle.budget;
  $("lg-use").value = bundle.usefulness;
  $("lg-template").value = bundle.template;
  $("lg-monster").value = bundle.monster;
  $("lg-magic").checked = bundle.magic;
  $("lg-cursed").checked = bundle.cursed || false;
  $("lg-curse-severity").value = bundle.curseSeverity || 3;

  $("lg-curse-severity-wrap").style.display = bundle.cursed ? "block" : "none";

  document.querySelectorAll("#lg-cats input[type='checkbox']").forEach(cb => {
    cb.checked = bundle.categories.includes(cb.dataset.cat);
  });

  doGenerate();
}

function doGenerate(){
  const seed=$("lg-seed").value.trim(); const rng=prand(seed);
  const mode=document.querySelector('input[name="lg-mode"]:checked').value;
  const lootType=document.querySelector('input[name="lg-loot-type"]:checked').value;
  const count=clamp(+$("lg-count").value||50,1,5000);
  const minSp=Math.max(0,+$("lg-min").value||0);
  const maxGp=Math.max(1,+$("lg-max").value||25); const maxSp=maxGp*10;
  const targetGp=Math.max(1,+$("lg-budget").value||150); const targetSp=gpToSp(targetGp);
  const usefulness01 = Math.max(0,Math.min(1,(+$("lg-use").value||50)/100));
  const monsterType = $("lg-monster").value || "none";
  let templateKey = $("lg-template").value || "none";
  const customTableKey = $("lg-custom-table").value || "";
  const magicOn = $("lg-magic").checked;
  const cursedOn = $("lg-cursed").checked;
  const curseSeverity = cursedOn ? (+$("lg-curse-severity").value || 3) : 3;
  const bundleCtx = activeQuickBundle;

  // Monster type overrides template
  if(monsterType !== "none"){
    templateKey = monsterType;
    if(MONSTER_TEMPLATES[monsterType] && !TEMPLATE[monsterType]){
      TEMPLATE[monsterType] = MONSTER_TEMPLATES[monsterType];
    }
  }

  // Apply individual loot type adjustments
  let adjustedCount = count;
  let adjustedBudget = targetSp;
  if(lootType === "individual"){
    adjustedCount = Math.max(1, Math.floor(count / 10));
    adjustedBudget = Math.floor(targetSp / 10);
  }

  let selectedCats=currentSelectedCats();
  if(bundleCtx?.categories?.length){
    selectedCats = bundleCtx.categories;
  }

  // Use custom loot table if selected
  if(customTableKey && customLootTables[customTableKey]){
    const customTable = customLootTables[customTableKey];
    if(customTable.categories){
      selectedCats = customTable.categories;
    }
    if(customTable.template){
      TEMPLATE[customTableKey] = customTable.template;
      templateKey = customTableKey;
    }
    clearActiveQuickBundle();
  }

  if(!selectedCats.length){ alert("Select at least one category."); return; }

  const wantWeight=$("lg-weight").checked, wantTags=$("lg-tags").checked;
  const allowMinorMagicPool = magicOn && (bundleCtx ? bundleCtx.allowImplicitMinorMagic : true);
  const allowCursedPool = cursedOn && (bundleCtx ? bundleCtx.allowImplicitCursed : true);

  let list=[];
  if(mode==="budget"){
    list=generateToBudget(rng,selectedCats,{
      targetSp: adjustedBudget, softCount: adjustedCount, minSp, maxSp, usefulness01, templateKey, magicOn, cursedOn, curseSeverity, allowMinorMagicPool, allowCursedPool
    });
  }else{
    list=generateCount(rng,selectedCats,{
      count: adjustedCount, minSp, maxSp, usefulness01, templateKey, magicOn, cursedOn, curseSeverity, allowMinorMagicPool, allowCursedPool
    });
  }
  currentList=list;
  currentRenderOpts={wantWeight,wantTags};
  currentGenOpts={templateKey,magicOn,cursedOn,curseSeverity,minSp,maxSp,selectedCats};
  renderList(list,wantWeight,wantTags);
}

// ---------- Save/Load Presets ----------
function savePreset(){
  const name = $("lg-preset-name").value.trim();
  if(!name){ alert("Enter a preset name."); return; }

  const preset = {
    mode: document.querySelector('input[name="lg-mode"]:checked').value,
    lootType: document.querySelector('input[name="lg-loot-type"]:checked').value,
    count: $("lg-count").value,
    seed: $("lg-seed").value,
    min: $("lg-min").value,
    max: $("lg-max").value,
    budget: $("lg-budget").value,
    usefulness: $("lg-use").value,
    monster: $("lg-monster").value,
    template: $("lg-template").value,
    magic: $("lg-magic").checked,
    cursed: $("lg-cursed").checked,
    curseSeverity: $("lg-curse-severity").value,
    weight: $("lg-weight").checked,
    tags: $("lg-tags").checked,
    categories: currentSelectedCats()
  };

  const presets = JSON.parse(localStorage.getItem("lootPresets") || "{}");
  presets[name] = preset;
  localStorage.setItem("lootPresets", JSON.stringify(presets));
  loadPresetList();
  alert(`Preset "${name}" saved!`);
}

function loadPreset(){
  clearActiveQuickBundle();
  const name = $("lg-saved-presets").value;
  if(!name){ alert("Select a preset to load."); return; }

  const presets = JSON.parse(localStorage.getItem("lootPresets") || "{}");
  const preset = presets[name];
  if(!preset){ alert("Preset not found."); return; }

  if(preset.mode === "count") $("lg-mode-count").checked = true;
  else $("lg-mode-budget").checked = true;

  if(preset.lootType === "hoard") $("lg-loot-hoard").checked = true;
  else $("lg-loot-individual").checked = true;

  $("lg-count").value = preset.count || 50;
  $("lg-seed").value = preset.seed || "";
  $("lg-min").value = preset.min || 1;
  $("lg-max").value = preset.max || 25;
  $("lg-budget").value = preset.budget || 150;
  $("lg-use").value = preset.usefulness || 50;
  $("lg-monster").value = preset.monster || "none";
  $("lg-template").value = preset.template || "none";
  $("lg-magic").checked = preset.magic || false;
  $("lg-cursed").checked = preset.cursed || false;
  $("lg-curse-severity").value = preset.curseSeverity || 3;
  $("lg-weight").checked = preset.weight !== false;
  $("lg-tags").checked = preset.tags !== false;

  $("lg-curse-severity-wrap").style.display = preset.cursed ? "block" : "none";

  document.querySelectorAll("#lg-cats input").forEach(cb => {
    cb.checked = preset.categories?.includes(cb.dataset.cat) || false;
  });

  alert(`Preset "${name}" loaded!`);
}

function loadPresetList(){
  const presets = JSON.parse(localStorage.getItem("lootPresets") || "{}");
  const select = $("lg-saved-presets");
  select.innerHTML = '<option value="">-- Select a saved preset --</option>';
  for(const name in presets){
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
}

// ---------- Import custom loot table ----------
function importCustomTable(){
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try{
        const data = JSON.parse(evt.target.result);
        if(!data.name){ alert("Custom loot table must have a 'name' field."); return; }

        customLootTables[data.name] = data;

        const select = $("lg-custom-table");
        const opt = document.createElement("option");
        opt.value = data.name;
        opt.textContent = data.name;
        select.appendChild(opt);
        select.value = data.name;

        alert(`Custom loot table "${data.name}" imported!`);
      }catch(err){
        alert("Invalid JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ---------- DOMContentLoaded ----------
document.addEventListener("DOMContentLoaded",()=>{
  // Build category checkboxes now that CATS is loaded
  buildCategoryCheckboxes();

  // Simple/Advanced mode toggle
  const advancedKey = 'dmtools.advancedMode.loot';
  const advancedToggle = $('advancedModeToggle');
  const settingsBody = $('lootSettingsBody');

  const isAdvanced = localStorage.getItem(advancedKey) === 'true';
  advancedToggle.checked = isAdvanced;
  if (isAdvanced) settingsBody.classList.add('advanced-mode');

  advancedToggle.addEventListener('change', () => {
    if (advancedToggle.checked) {
      settingsBody.classList.add('advanced-mode');
      localStorage.setItem(advancedKey, 'true');
    } else {
      settingsBody.classList.remove('advanced-mode');
      localStorage.setItem(advancedKey, 'false');
    }
  });

  $("lg-generate").addEventListener("click",doGenerate);
  $("lg-copy").addEventListener("click",copyOut);
  $("lg-download").addEventListener("click",downloadOut);
  $("lg-download-md").addEventListener("click",downloadMarkdown);

  // Reroll individual items via event delegation
  $("lg-out").addEventListener("click",(e)=>{
    const btn=e.target.closest(".reroll-btn");
    if(!btn)return;
    rerollItem(+btn.dataset.idx);
  });
  $("lg-clear").addEventListener("click",()=>{ $("lg-out").innerHTML=""; $("lg-meta").innerHTML=""; });

  $("lg-preset").addEventListener("change",(e)=>{
    clearActiveQuickBundle();
    const v=e.target.value; (PRESETS[v]||PRESETS.custom)();
  });

  // Cursed items toggle - show/hide severity slider
  $("lg-cursed").addEventListener("change",(e)=>{
    const wrap = $("lg-curse-severity-wrap");
    wrap.style.display = e.target.checked ? "block" : "none";
  });

  // Quick Bundle buttons
  document.querySelectorAll(".quick-bundle-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const bundleKey = btn.dataset.bundle;
      applyQuickBundle(bundleKey);
    });
  });

  document.querySelectorAll("#lg-cats input").forEach(cb => {
    cb.addEventListener("change", clearActiveQuickBundle);
  });

  $("lg-save-preset").addEventListener("click",savePreset);
  $("lg-load-preset").addEventListener("click",loadPreset);
  $("lg-import-custom").addEventListener("click",importCustomTable);

  // Load saved presets on startup
  loadPresetList();

  // First run
  doGenerate();
});
