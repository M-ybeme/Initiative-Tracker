// ---------- Meta pills ----------
function renderMeta(meta){
  const el = document.getElementById('ng-meta');
  el.innerHTML = '';
  const pills = [
    `Style: ${meta.style}`,
    `Count: ${meta.count}`,
    meta.seedStr ? `Seed: ${meta.seedStr}` : 'Seed: (random)',
    `Syllables: ${meta.minSyl}-${meta.maxSyl}`,
    `Gender: ${meta.gender}`,
    meta.allit ? `Alliteration: ${meta.allit.toUpperCase()}` : '',
    `Harsh: ${meta.harsh}`,
    `Exotic: ${meta.exotic}`,
    meta.raceSuffixOn ? `Race suffix: on` : `Race suffix: off`,
    meta.withSurname ? `Surname: ${meta.surnameStyle} (${meta.joiner||' '})` : ''
  ].filter(Boolean);
  for(const p of pills){
    const span = document.createElement('span');
    span.className = 'ng-pill';
    span.textContent = p;
    el.appendChild(span);
  }
}

// ---------- Favorites ----------
const FAV_KEY = 'ng-favs';
function getFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY)||'[]'); }catch{ return []; } }
function setFavs(arr){ localStorage.setItem(FAV_KEY, JSON.stringify(arr)); }
function addFav(n){ const arr = getFavs(); if(!arr.includes(n)){ arr.push(n); setFavs(arr); } renderFavs(); }
function removeFav(n){ const arr = getFavs().filter(x=>x!==n); setFavs(arr); renderFavs(); }
function renderFavs(){
  const box = document.getElementById('favList');
  const favs = getFavs();
  box.innerHTML = '';
  if(!favs.length){
    box.innerHTML = '<div class="text-secondary">No favorites yet. Click ⭐ on a name.</div>';
    return;
  }
  favs.forEach(n=>{
    const row = document.createElement('div');
    row.className = 'd-flex align-items-center justify-content-between border rounded px-2 py-1';
    row.innerHTML = `
      <span class="me-2 text-truncate">${n}</span>
      <div class="d-flex gap-1">
        <button class="btn btn-sm btn-outline-light" title="Copy"><i class="bi bi-clipboard"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Remove"><i class="bi bi-x-lg"></i></button>
      </div>`;
    row.querySelector('.btn-outline-light').onclick = ()=> navigator.clipboard.writeText(n);
    row.querySelector('.btn-outline-danger').onclick = ()=> removeFav(n);
    box.appendChild(row);
  });
}

// ---------- URL state + session autosave ----------
function snapshot($d){
  return {
    style:        $d('ng-style').value,
    count:        +$d('ng-count').value || 20,
    seedStr:      $d('ng-seed').value.trim(),
    minSyl:       +$d('ng-minSyl').value || 2,
    maxSyl:       +$d('ng-maxSyl').value || 3,
    gender:       $d('ng-gender').value,
    allit:        ($d('ng-allit').value||'').slice(0,1),
    harsh:        +$d('ng-harsh').value || 0,
    exotic:       +$d('ng-exotic').value || 0,
    allowApos:    $d('ng-apos').checked,
    allowDia:     $d('ng-diacritics').checked,
    raceSuffixOn: $d('ng-raceSuffix').checked,
    withSurname:  $d('ng-surname').checked,
    surnameStyle: $d('ng-surnameStyle').value,
    joiner:       $d('ng-joiner').value
  };
}

function applySnapshot($d, s){
  if(!s) return;
  const set = (id, val)=>{ const el=$d(id); if(!el) return; if(el.type==='checkbox') el.checked=!!val; else el.value=(val??el.value); };
  set('ng-style', s.style);
  set('ng-count', s.count);
  set('ng-seed', s.seedStr);
  set('ng-minSyl', s.minSyl);
  set('ng-maxSyl', s.maxSyl);
  set('ng-gender', s.gender);
  set('ng-allit', s.allit);
  set('ng-harsh', s.harsh); set('ng-exotic', s.exotic);
  set('ng-apos', s.allowApos); set('ng-diacritics', s.allowDia);
  set('ng-raceSuffix', s.raceSuffixOn);
  set('ng-surname', s.withSurname);
  set('ng-surnameStyle', s.surnameStyle || s.style);
  set('ng-joiner', s.joiner || ' ');
  const h=$d('ng-harsh-val'), x=$d('ng-exotic-val');
  if(h) h.textContent=$d('ng-harsh').value;
  if(x) x.textContent=$d('ng-exotic').value;
  toggleSurnameRow($d('ng-surname').checked);
}

function settingsToQS(s){
  const p = new URLSearchParams({
    s: s.style, c: s.count, seed: s.seedStr, min: s.minSyl, max: s.maxSyl, g: s.gender, a: s.allit,
    h: s.harsh, x: s.exotic, apos: +s.allowApos, dia: +s.allowDia, rs: +s.raceSuffixOn,
    sn: +s.withSurname, ss: s.surnameStyle || '', j: s.joiner || ' '
  });
  history.replaceState(null, '', '?'+p.toString());
}

function qsToSettings(){
  const p = new URLSearchParams(location.search);
  if(!p.has('s')) return null;
  return {
    style:        p.get('s') || 'Elf',
    count:        +(p.get('c')||20),
    seedStr:      p.get('seed')||'',
    minSyl:       +(p.get('min')||2),
    maxSyl:       +(p.get('max')||3),
    gender:       p.get('g')||'neutral',
    allit:        (p.get('a')||'').slice(0,1),
    harsh:        +(p.get('h')||0),
    exotic:       +(p.get('x')||0),
    allowApos:    !!+p.get('apos'),
    allowDia:     !!+p.get('dia'),
    raceSuffixOn: !!+p.get('rs'),
    withSurname:  !!+p.get('sn'),
    surnameStyle: p.get('ss')||'',
    joiner:       p.get('j')||' '
  };
}

const SESSION_SETTINGS_KEY = 'ng-settings';
const SESSION_RESULTS_KEY  = 'ng-results';
function saveSession(s, list){
  localStorage.setItem(SESSION_SETTINGS_KEY, JSON.stringify(s));
  if(list) localStorage.setItem(SESSION_RESULTS_KEY, JSON.stringify(list));
}
function loadSession(){
  try{
    const s = JSON.parse(localStorage.getItem(SESSION_SETTINGS_KEY)||'null');
    const r = JSON.parse(localStorage.getItem(SESSION_RESULTS_KEY)||'null');
    return { s, r };
  }catch{ return { s:null, r:null }; }
}

// ---------- Settings form HTML (single source-of-truth for desktop + mobile) ----------
const settingsFormHTML = String.raw`
  <!-- Quick Race Selector -->
  <div class="mb-3">
    <div class="settings-section-title">Quick Select</div>
    <div class="d-flex flex-wrap gap-2">
      <button type="button" class="quick-race-btn" data-race="Elf">🏹 Elf</button>
      <button type="button" class="quick-race-btn" data-race="Dwarf">⛏️ Dwarf</button>
      <button type="button" class="quick-race-btn" data-race="Human (Latin)">👤 Human</button>
      <button type="button" class="quick-race-btn" data-race="Orc">🗡️ Orc</button>
      <button type="button" class="quick-race-btn" data-race="Dragonborn">🐉 Dragon</button>
      <button type="button" class="quick-race-btn" data-race="Tiefling">😈 Tiefling</button>
    </div>
  </div>

  <!-- Race Selection & Preset -->
  <div class="settings-section">
    <div class="settings-section-title">Race Style</div>
    <div class="mb-2">
      <label for="ng-style" class="form-label small">Race / Culture
        <i class="bi bi-question-circle help-badge" data-bs-toggle="tooltip" title="Choose the race/culture flavor."></i>
      </label>
      <select id="ng-style" class="form-select"></select>
    </div>
    <button class="btn btn-outline-info btn-sm w-100" id="ng-applyPreset" type="button">
      <i class="bi bi-magic me-1"></i>Apply Race Preset
    </button>
  </div>

  <!-- Generation Settings -->
  <div class="settings-section">
    <div class="settings-section-title">Generation</div>
    <div class="row g-2">
      <div class="col-6">
        <label for="ng-count" class="form-label small">Count</label>
        <input id="ng-count" type="number" inputmode="numeric" min="1" max="500" value="20" class="form-control form-control-sm" />
        <div class="d-flex gap-1 mt-1">
          <button type="button" class="btn btn-outline-secondary btn-xs quick-count-btn" data-count="5">5</button>
          <button type="button" class="btn btn-outline-secondary btn-xs quick-count-btn" data-count="10">10</button>
          <button type="button" class="btn btn-outline-secondary btn-xs quick-count-btn" data-count="20">20</button>
          <button type="button" class="btn btn-outline-secondary btn-xs quick-count-btn" data-count="50">50</button>
        </div>
      </div>
      <div class="col-6 advanced-setting">
        <label for="ng-seed" class="form-label small">Seed</label>
        <input id="ng-seed" type="text" placeholder="optional" class="form-control form-control-sm" />
      </div>
    </div>

    <div class="row g-2 mt-2 advanced-setting">
      <div class="col-6">
        <label for="ng-minSyl" class="form-label small">Min syllables</label>
        <input id="ng-minSyl" type="number" inputmode="numeric" min="1" max="6" value="2" class="form-control form-control-sm" />
      </div>
      <div class="col-6">
        <label for="ng-maxSyl" class="form-label small">Max syllables</label>
        <input id="ng-maxSyl" type="number" inputmode="numeric" min="1" max="8" value="3" class="form-control form-control-sm" />
      </div>
    </div>

    <div class="row g-2 mt-2">
      <div class="col-6">
        <label for="ng-gender" class="form-label small">Gender</label>
        <select id="ng-gender" class="form-select form-select-sm">
          <option value="neutral" selected>Neutral</option>
          <option value="feminine">Feminine</option>
          <option value="masculine">Masculine</option>
        </select>
      </div>
      <div class="col-6 advanced-setting">
        <label for="ng-allit" class="form-label small">Alliteration</label>
        <input id="ng-allit" type="text" maxlength="1" placeholder="e.g. R" class="form-control form-control-sm" />
      </div>
    </div>
  </div>

  <!-- Flavor Settings -->
  <div class="settings-section advanced-setting">
    <div class="settings-section-title">Flavor</div>
    <div class="mb-2">
      <label for="ng-harsh" class="form-label small d-flex justify-content-between">
        <span>Harshness</span><span class="text-secondary"><span id="ng-harsh-val">25</span></span>
      </label>
      <input id="ng-harsh" type="range" class="form-range" min="0" max="100" value="25">
    </div>
    <div class="mb-2">
      <label for="ng-exotic" class="form-label small d-flex justify-content-between">
        <span>Exoticness</span><span class="text-secondary"><span id="ng-exotic-val">20</span></span>
      </label>
      <input id="ng-exotic" type="range" class="form-range" min="0" max="100" value="20">
    </div>
    <div class="form-check small">
      <input class="form-check-input" type="checkbox" id="ng-raceSuffix" checked />
      <label class="form-check-label" for="ng-raceSuffix">Race suffix</label>
    </div>
    <div class="form-check small">
      <input class="form-check-input" type="checkbox" id="ng-apos" checked />
      <label class="form-check-label" for="ng-apos">Apostrophes</label>
    </div>
    <div class="form-check small">
      <input class="form-check-input" type="checkbox" id="ng-diacritics" />
      <label class="form-check-label" for="ng-diacritics">Diacritics</label>
    </div>
  </div>

  <!-- Surname Options -->
  <div class="settings-section advanced-setting">
    <div class="settings-section-title">Surnames</div>
    <div class="form-check small mb-2">
      <input class="form-check-input" type="checkbox" id="ng-surname" />
      <label class="form-check-label" for="ng-surname">Generate two-part names</label>
    </div>
    <div id="surnameRow" style="display:none;">
      <div class="mb-2">
        <label for="ng-surnameStyle" class="form-label small">Surname style</label>
        <select id="ng-surnameStyle" class="form-select form-select-sm"></select>
      </div>
      <div>
        <label for="ng-joiner" class="form-label small">Joiner</label>
        <input id="ng-joiner" type="text" class="form-control form-control-sm" value=" " placeholder=" , -, &#39; , of ">
      </div>
    </div>
  </div>

  <!-- Actions -->
  <hr class="my-3 opacity-25">
  <div class="d-grid gap-2">
    <button class="btn btn-success" id="ng-generate"><i class="bi bi-stars me-1"></i>Generate Names</button>
    <div class="d-flex gap-2">
      <button class="btn btn-outline-light flex-fill" id="ng-copy"><i class="bi bi-clipboard me-1"></i>Copy</button>
      <button class="btn btn-outline-warning flex-fill" id="ng-download"><i class="bi bi-download me-1"></i>Download</button>
    </div>
    <button class="btn btn-outline-danger btn-sm" id="ng-clear"><i class="bi bi-trash me-1"></i>Clear Results</button>
  </div>

  <!-- Advanced tables -->
  <details class="mt-3 advanced-setting">
    <summary class="text-secondary">Custom Tables (advanced)
      <span class="badge rounded-pill text-bg-secondary ms-2">JSON</span>
    </summary>
    <div class="mt-2">
      <div id="ng-adv-alert"></div>
      <div class="code-block mb-2"><pre id="advExample"></pre></div>
      <label class="form-label">Import JSON (styles)</label>
      <textarea id="ng-import" class="form-control form-control-sm font-monospace" rows="6"
        placeholder='{"Styles":{"Elf":{"start":["ae","lia"],"mid":["ri","na"],"end":["el","ith"]}}}'></textarea>
      <div class="d-flex flex-wrap gap-2 mt-2">
        <button class="btn btn-outline-light btn-sm" id="ng-validateBtn"><i class="bi bi-check2-circle me-1"></i>Validate</button>
        <button class="btn btn-outline-light btn-sm" id="ng-importBtn"><i class="bi bi-upload me-1"></i>Import</button>
        <button class="btn btn-outline-light btn-sm" id="ng-exportBtn"><i class="bi bi-download me-1"></i>Export current</button>
      </div>
    </div>
  </details>
`;

// ---------- Style dropdowns ----------
function populateStyles($d, mobileRoot){
  const sel = $d('ng-style');
  const cur = sel?.value;
  sel.innerHTML = '';

  const raceGroups = {
    "Common Races":   ["Human (Latin)", "Human (Norse)", "Human (Arabic)", "Human (Asian)", "Dwarf", "Elf", "Halfling", "Gnome"],
    "Uncommon Races": ["Dragonborn", "Half-Orc", "Tiefling", "Drow", "Goliath", "Firbolg", "Genasi", "Triton", "Aarakocra", "Tabaxi", "Kenku"],
    "Monstrous Races":["Orc", "Goblin", "Hobgoblin", "Kobold", "Lizardfolk", "Bugbear", "Yuan-ti"],
    "Special Races":  ["Fey", "Changeling", "Warforged"]
  };

  for(const [groupLabel, races] of Object.entries(raceGroups)){
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupLabel;
    races.forEach(raceName => {
      if(TABLES.Styles[raceName]){
        const opt = document.createElement('option');
        opt.value = raceName;
        opt.textContent = raceName;
        optgroup.appendChild(opt);
      }
    });
    sel.appendChild(optgroup);
  }

  sel.value = (cur && TABLES.Styles[cur]) ? cur : 'Elf';

  const sSel = $d('ng-surnameStyle');
  sSel.innerHTML = sel.innerHTML;
  sSel.value = sel.value;

  const mobileSel = mobileRoot.querySelector('#ng-style');
  if(mobileSel){ mobileSel.innerHTML = sel.innerHTML; mobileSel.value = sel.value; }
  const mobileSSel = mobileRoot.querySelector('#ng-surnameStyle');
  if(mobileSSel){ mobileSSel.innerHTML = sSel.innerHTML; mobileSSel.value = sSel.value; }
}

// ---------- Custom table validators ----------
function validateTablesObject(obj){
  const errors = [];
  if(!obj || typeof obj !== 'object'){ errors.push('Root is not an object.'); return errors; }
  if(!obj.Styles || typeof obj.Styles !== 'object') errors.push('Missing "Styles" object.');
  const styles = obj.Styles || {};
  for(const [name, spec] of Object.entries(styles)){
    if(!spec || typeof spec !== 'object'){ errors.push(`Style "${name}" must be an object.`); continue; }
    ['start','mid','end'].forEach(k=>{
      if(!Array.isArray(spec[k]) || spec[k].length===0) errors.push(`Style "${name}" missing non-empty array "${k}".`);
      else if(!spec[k].every(x=>typeof x==='string')) errors.push(`Style "${name}" "${k}" must be strings only.`);
    });
  }
  return errors;
}

function importTables($d, mobileRoot){
  const raw = $d('ng-import').value.trim();
  const alertBox = $d('ng-adv-alert'); alertBox.innerHTML='';
  if(!raw){ alertBox.innerHTML = `<div class="alert alert-warning py-2 mb-2">Paste JSON first.</div>`; return; }
  try{
    const data = JSON.parse(raw);
    const errs = validateTablesObject(data);
    if(errs.length){
      alertBox.innerHTML = `<div class="alert alert-danger mb-2"><strong>Invalid JSON:</strong><ul class="mb-0">${errs.map(e=>`<li>${e}</li>`).join('')}</ul></div>`;
      return;
    }
    TABLES.Styles = { ...TABLES.Styles, ...data.Styles };
    populateStyles($d, mobileRoot);
    alertBox.innerHTML = `<div class="alert alert-success py-2 mb-2">Imported. New styles are available.</div>`;
  }catch(e){
    alertBox.innerHTML = `<div class="alert alert-danger py-2 mb-2">Parse error: ${e.message}</div>`;
  }
}

function validateOnly($d){
  const raw = $d('ng-import').value.trim();
  const alertBox = $d('ng-adv-alert'); alertBox.innerHTML='';
  if(!raw){ alertBox.innerHTML = `<div class="alert alert-warning py-2 mb-2">Paste JSON first.</div>`; return; }
  try{
    const data = JSON.parse(raw);
    const errs = validateTablesObject(data);
    alertBox.innerHTML = errs.length
      ? `<div class="alert alert-danger mb-2"><strong>Issues:</strong><ul class="mb-0">${errs.map(e=>`<li>${e}</li>`).join('')}</ul></div>`
      : `<div class="alert alert-success py-2 mb-2">Looks good.</div>`;
  }catch(e){
    alertBox.innerHTML = `<div class="alert alert-danger py-2 mb-2">Parse error: ${e.message}</div>`;
  }
}

function exportCurrent(){
  const payload = JSON.stringify({Styles: TABLES.Styles}, null, 2);
  const blob = new Blob([payload], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='name-tables.json'; a.click();
  URL.revokeObjectURL(url);
}

// ---------- Render ----------
function renderList(list, lockedSet = new Set()){
  const out = document.getElementById('ng-out');
  out.innerHTML = '';
  list.forEach(n=>{
    const isLocked = lockedSet.has(n);
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `
      <div class="ng-tile${isLocked ? ' locked' : ''}" tabindex="0">
        <button class="ng-lock ng-lock-overlay" title="${isLocked ? 'Unlock name' : 'Lock name'}" aria-label="${isLocked ? 'Unlock name' : 'Lock name'}"><i class="bi bi-lock${isLocked ? '-fill' : ''}"></i></button>
        <span class="ng-name">${n}</span>
        <div class="ng-actions d-flex gap-1">
          <button class="btn btn-sm btn-outline-light" title="Copy" aria-label="Copy name"><i class="bi bi-clipboard"></i></button>
          <button class="btn btn-sm btn-outline-warning" title="Favorite" aria-label="Favorite name"><i class="bi bi-star"></i></button>
          <button class="btn btn-sm btn-outline-info" title="Re-roll" aria-label="Reroll name"><i class="bi bi-arrow-repeat"></i></button>
        </div>
      </div>
    `;
    out.appendChild(col);
  });
  const fw = document.getElementById('ng-filter-wrap');
  if(fw) fw.style.display = list.length ? '' : 'none';
}

// ---------- Generate ----------
function generate($d){
  const style        = $d('ng-style').value;
  const count        = +$d('ng-count').value || 20;
  const seedStr      = $d('ng-seed').value.trim();
  const minSyl       = +$d('ng-minSyl').value || 2;
  const maxSyl       = +$d('ng-maxSyl').value || 3;
  const gender       = $d('ng-gender').value;
  const allit        = ($d('ng-allit').value||'').slice(0,1);
  const harsh        = +$d('ng-harsh').value || 0;
  const exotic       = +$d('ng-exotic').value || 0;
  const allowApos    = $d('ng-apos').checked;
  const allowDia     = $d('ng-diacritics').checked;
  const raceSuffixOn = $d('ng-raceSuffix').checked;
  const withSurname  = $d('ng-surname').checked;
  const surnameStyle = $d('ng-surnameStyle').value || style;
  const joiner       = $d('ng-joiner').value || ' ';

  const preset = RACE_PRESETS[style] || null;
  const raceSuffixList = preset ? (preset.raceSuffix || []) : [];

  // Preserve any locked names from the current results
  const lockedNames = [...document.querySelectorAll('#ng-out .ng-tile.locked .ng-name')].map(el => el.textContent);
  const lockedSet = new Set(lockedNames);

  const rng = prand(seedStr);
  const cfg = { style, minSyl, maxSyl, gender, allit, harsh, exotic, allowApos, allowDia, raceSuffixOn, raceSuffixList, withSurname, surnameStyle, joiner };
  CURRENT_CFG  = cfg;
  CURRENT_SEED = seedStr || 'random';

  const totalSlots = Math.max(Math.min(count, 500), lockedNames.length);
  const list = [...lockedNames];
  for(let i = 0; i < totalSlots - lockedNames.length; i++){
    list.push(makeFullName(rng, cfg));
  }
  renderList(list, lockedSet);
  renderMeta({style, count, seedStr, minSyl, maxSyl, gender, allit, harsh, exotic, raceSuffixOn, withSurname, surnameStyle, joiner});
  const snap = snapshot($d);
  saveSession(snap, list); settingsToQS(snap);
  return list;
}

// ---------- Copy / download ----------
function copyNames(){
  const items = [...document.querySelectorAll('#ng-out .ng-name')].map(n=>n.textContent);
  if(!items.length) return;
  navigator.clipboard.writeText(items.join('\n'));
}
function downloadNames(){
  const items = [...document.querySelectorAll('#ng-out .ng-name')].map(n=>n.textContent);
  if(!items.length) return;
  const meta = new Date().toISOString();
  const blob = new Blob([items.join('\n') + '\n'], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`names-${meta}.txt`; a.click();
  URL.revokeObjectURL(url);
}

// ---------- Preset ----------
function applyRacePreset($d){
  const style = $d('ng-style').value;
  const preset = RACE_PRESETS[style];
  if(!preset) return;
  $d('ng-minSyl').value = preset.minSyl;
  $d('ng-maxSyl').value = preset.maxSyl;
  $d('ng-gender').value = preset.gender;
  $d('ng-harsh').value  = preset.harsh;  $d('ng-harsh-val').textContent  = preset.harsh;
  $d('ng-exotic').value = preset.exotic; $d('ng-exotic-val').textContent = preset.exotic;
  $d('ng-apos').checked       = preset.aposProb > 0;
  $d('ng-diacritics').checked = preset.diaProb  > 0;
  $d('ng-raceSuffix').checked = !!preset.allowRaceSuffix;
  $d('ng-surnameStyle').value = style;
}

// ---------- Toggle surname sub-row ----------
function toggleSurnameRow(show){
  const row = document.getElementById('surnameRow');
  if(row) row.style.display = show ? '' : 'none';
}

// ---------- Mount & wire both settings panels ----------
function mountSettingsForms(){
  const desktopRoot = document.getElementById('settingsCardBody');
  const mobileRoot  = document.getElementById('settingsOffcanvasBody');
  desktopRoot.innerHTML = settingsFormHTML;
  mobileRoot.innerHTML  = settingsFormHTML;

  // Fill JSON example
  const example = {
    "Styles": {
      "Wizard's Study": {
        "start": ["ar","el","io","ka","the","vor","xan","zea"],
        "mid":   ["ca","el","io","ith","or","ul","ym","ez"],
        "end":   ["ion","iel","oth","eus","ar","is","or","em"]
      }
    }
  };
  const ex1 = desktopRoot.querySelector('#advExample');
  if(ex1) ex1.textContent = JSON.stringify(example, null, 2);
  const ex2 = mobileRoot.querySelector('#advExample');
  if(ex2) ex2.textContent = JSON.stringify(example, null, 2);

  const q  = (root, sel)=> root.querySelector(sel);
  const $d = (id)=> q(desktopRoot, '#' + id);
  const $m = (id)=> q(mobileRoot,  '#' + id);

  populateStyles($d, mobileRoot);

  // Mirror desktop → mobile on init
  ['ng-style','ng-count','ng-seed','ng-minSyl','ng-maxSyl','ng-gender','ng-allit',
   'ng-harsh','ng-exotic','ng-apos','ng-diacritics','ng-raceSuffix',
   'ng-surname','ng-surnameStyle','ng-joiner'].forEach(id=>{
    const d=$d(id), m=$m(id); if(!d||!m) return;
    if(d.type==='checkbox'){ m.checked=d.checked; } else { m.value=d.value; }
  });
  if($d('ng-harsh-val')) $d('ng-harsh-val').textContent = $d('ng-harsh').value;
  if($d('ng-exotic-val')) $d('ng-exotic-val').textContent = $d('ng-exotic').value;

  // NPC integration — race preset from URL
  const urlParams = new URLSearchParams(location.search);
  const fromNPC   = urlParams.get('from') === 'npc';
  const raceParam = urlParams.get('race');

  if(fromNPC && raceParam){
    const validRaces  = Object.keys(RACE_PRESETS);
    const matchedRace = validRaces.find(r => r.toLowerCase() === raceParam.toLowerCase()) || raceParam;
    if(TABLES.Styles[matchedRace]){
      $d('ng-style').value = matchedRace;
      applyRacePreset($d);
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-success alert-dismissible fade show mt-3';
      alertDiv.innerHTML = `
        <i class="bi bi-check-circle me-2"></i>
        <strong>Race preset applied!</strong> Generating names for: <strong>${matchedRace}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
      setTimeout(()=> alertDiv.remove(), 5000);
    }
  }

  // Restore from URL or session
  const urlState = qsToSettings();
  if(urlState && !fromNPC){
    applySnapshot($d, urlState);
  } else if(!fromNPC){
    const { s, r } = loadSession();
    if(s) applySnapshot($d, s);
    if(r && Array.isArray(r) && r.length){
      renderList(r);
      CURRENT_CFG  = snapshot($d);
      CURRENT_SEED = (CURRENT_CFG && CURRENT_CFG.seedStr) ? CURRENT_CFG.seedStr : 'random';
    }
  }

  // Sync mobile → desktop
  function syncToDesktop(){
    ['ng-style','ng-count','ng-seed','ng-minSyl','ng-maxSyl','ng-gender','ng-allit',
     'ng-harsh','ng-exotic','ng-apos','ng-diacritics','ng-raceSuffix',
     'ng-surname','ng-surnameStyle','ng-joiner'].forEach(id=>{
      const m=$m(id), d=$d(id); if(!m||!d) return;
      if(m.type==='checkbox'){ d.checked=m.checked; } else { d.value=m.value; }
    });
    if($d('ng-harsh-val')) $d('ng-harsh-val').textContent = $d('ng-harsh').value;
    if($d('ng-exotic-val')) $d('ng-exotic-val').textContent = $d('ng-exotic').value;
    toggleSurnameRow($d('ng-surname').checked);
  }

  function connect(root, isMobile){
    const $ = (id)=> q(root, '#'+id);

    $('ng-generate').addEventListener('click', (e)=>{ e.preventDefault(); if(isMobile) syncToDesktop(); generate($d); });
    $('ng-copy').addEventListener('click',     (e)=>{ e.preventDefault(); copyNames(); });
    $('ng-download').addEventListener('click', (e)=>{ e.preventDefault(); downloadNames(); });
    $('ng-clear').addEventListener('click',    (e)=>{ e.preventDefault(); document.getElementById('ng-out').innerHTML=''; document.getElementById('ng-meta').innerHTML=''; });

    $('ng-validateBtn').addEventListener('click', (e)=>{ e.preventDefault(); if(isMobile) syncToDesktop(); validateOnly($d); });
    $('ng-importBtn').addEventListener('click',   (e)=>{ e.preventDefault(); if(isMobile) syncToDesktop(); importTables($d, mobileRoot); settingsToQS(snapshot($d)); });
    $('ng-exportBtn').addEventListener('click',   (e)=>{ e.preventDefault(); exportCurrent(); });

    $('ng-applyPreset').addEventListener('click', (e)=>{ e.preventDefault(); if(isMobile) syncToDesktop(); applyRacePreset($d); settingsToQS(snapshot($d)); });

    const harsh = $('ng-harsh'), exotic = $('ng-exotic');
    if(harsh)  harsh.addEventListener('input',  ()=>{ const lab=q(desktopRoot,'#ng-harsh-val');  if(lab) lab.textContent=harsh.value; });
    if(exotic) exotic.addEventListener('input', ()=>{ const lab=q(desktopRoot,'#ng-exotic-val'); if(lab) lab.textContent=exotic.value; });

    $('ng-surname').addEventListener('change', ()=> toggleSurnameRow($('ng-surname').checked));

    root.querySelectorAll('.quick-count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = btn.dataset.count;
        $d('ng-count').value = c;
        $m('ng-count').value = c;
      });
    });
  }

  connect(desktopRoot, false);
  connect(mobileRoot,  true);

  // Quick race buttons
  const quickRaceBtns = [...desktopRoot.querySelectorAll('.quick-race-btn'), ...mobileRoot.querySelectorAll('.quick-race-btn')];
  quickRaceBtns.forEach(btn => {
    btn.addEventListener('click', function(){
      const race = this.dataset.race;
      if(!race) return;
      const desktopSelect = $d('ng-style');
      const mobileSelect  = $m('ng-style');
      if(desktopSelect) desktopSelect.value = race;
      if(mobileSelect)  mobileSelect.value  = race;
      applyRacePreset($d);
      quickRaceBtns.forEach(b => b.classList.remove('active'));
      desktopRoot.querySelector(`.quick-race-btn[data-race="${race}"]`)?.classList.add('active');
      mobileRoot.querySelector(`.quick-race-btn[data-race="${race}"]`)?.classList.add('active');
      settingsToQS(snapshot($d));
    });
  });

  // XS generate / copy buttons (inside Results card header on mobile)
  const genXs  = document.getElementById('ng-generate-xs');
  const copyXs = document.getElementById('ng-copy-xs');
  if(genXs)  genXs.addEventListener('click',  ()=> generate($d));
  if(copyXs) copyXs.addEventListener('click', ()=> copyNames());

  // Mirror desktop → mobile when offcanvas opens
  const offcanvasEl = document.getElementById('settingsOffcanvas');
  if(offcanvasEl){
    offcanvasEl.addEventListener('show.bs.offcanvas', () => {
      ['ng-style','ng-count','ng-seed','ng-minSyl','ng-maxSyl','ng-gender','ng-allit',
       'ng-harsh','ng-exotic','ng-apos','ng-diacritics','ng-raceSuffix',
       'ng-surname','ng-surnameStyle','ng-joiner'].forEach(id=>{
        const d=$d(id), m=$m(id); if(!d||!m) return;
        if(d.type==='checkbox'){ m.checked=d.checked; } else { m.value=d.value; }
      });
      if($m('ng-harsh-val'))  $m('ng-harsh-val').textContent  = $m('ng-harsh').value;
      if($m('ng-exotic-val')) $m('ng-exotic-val').textContent = $m('ng-exotic').value;
      toggleSurnameRow($d('ng-surname').checked);
    });
  }

  // Tooltips
  [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]')).forEach(el => new bootstrap.Tooltip(el));

  // Favorites drawer
  renderFavs();
  const favCopyAll = document.getElementById('favCopyAll');
  const favClear   = document.getElementById('favClear');
  if(favCopyAll) favCopyAll.onclick = ()=>{ const favs=getFavs(); if(favs.length) navigator.clipboard.writeText(favs.join('\n')); };
  if(favClear)   favClear.onclick   = ()=>{ setFavs([]); renderFavs(); };

  // Share buttons
  const doShare = ()=>{ const s=snapshot($d); settingsToQS(s); navigator.clipboard.writeText(location.href); };
  document.getElementById('btnShare')?.addEventListener('click',   doShare);
  document.getElementById('btnShareXS')?.addEventListener('click', doShare);

  // Auto-generate if no results were restored
  if(!document.querySelector('#ng-out .ng-name')) generate($d);
}

// ---------- DOMContentLoaded wiring ----------
document.addEventListener('DOMContentLoaded', mountSettingsForms);

// Tile click delegation: copy, favorite, re-roll, lock
document.addEventListener('DOMContentLoaded', () => {
  const out = document.getElementById('ng-out');
  if(!out) return;

  out.addEventListener('click', (e) => {
    const btn  = e.target.closest('button');
    const tile = e.target.closest('.ng-tile');
    if(!btn || !tile) return;

    const nameEl = tile.querySelector('.ng-name');
    if(!nameEl) return;

    if(btn.classList.contains('ng-lock')){
      const locked = !tile.classList.contains('locked');
      tile.classList.toggle('locked', locked);
      const icon = btn.querySelector('i');
      if(icon) icon.className = locked ? 'bi bi-lock-fill' : 'bi bi-lock';
      btn.title = locked ? 'Unlock name' : 'Lock name';
      btn.setAttribute('aria-label', locked ? 'Unlock name' : 'Lock name');
      return;
    }
    if(btn.classList.contains('btn-outline-light')){
      navigator.clipboard?.writeText(nameEl.textContent).catch(()=>{});
      return;
    }
    if(btn.classList.contains('btn-outline-warning')){
      addFav(nameEl.textContent);
      return;
    }
    if(btn.classList.contains('btn-outline-info')){
      if(!CURRENT_CFG) return;
      if(tile.classList.contains('locked')) return;
      const r = prand(String(CURRENT_SEED) + ':' + Math.random().toString(36).slice(2));
      nameEl.textContent = makeFullName(r, CURRENT_CFG);
      return;
    }
  });

  out.addEventListener('dblclick', (e)=>{
    if(e.target.closest('.ng-lock')) return;
    const tile = e.target.closest('.ng-tile');
    if(!tile || tile.classList.contains('locked')) return;
    tile.querySelector('.btn-outline-info')?.click();
  });
});

// Simple / Advanced mode toggle
document.addEventListener('DOMContentLoaded', () => {
  const advancedKey    = 'dmtools.advancedMode.name';
  const desktopToggle  = document.getElementById('advancedModeToggleDesktop');
  const mobileToggle   = document.getElementById('advancedModeToggleMobile');
  const desktopBody    = document.getElementById('settingsCardBody');
  const mobileBody     = document.getElementById('settingsOffcanvasBody');

  const isAdvanced = localStorage.getItem(advancedKey) === 'true';

  function setAdvancedMode(enabled){
    desktopToggle.checked = enabled;
    mobileToggle.checked  = enabled;
    desktopBody.classList.toggle('advanced-mode', enabled);
    mobileBody.classList.toggle('advanced-mode',  enabled);
    localStorage.setItem(advancedKey, enabled ? 'true' : 'false');
  }

  setAdvancedMode(isAdvanced);
  desktopToggle.addEventListener('change', () => setAdvancedMode(desktopToggle.checked));
  mobileToggle.addEventListener('change',  () => setAdvancedMode(mobileToggle.checked));
});

// Enter key → generate
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter') return;
    const tag = document.activeElement?.tagName;
    if(['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return;
    document.querySelector('#settingsCardBody #ng-generate')?.click();
  });
});

// In-results text filter
document.addEventListener('DOMContentLoaded', () => {
  const filterEl = document.getElementById('ng-filter');
  const clearEl  = document.getElementById('ng-filter-clear');
  if(!filterEl) return;

  filterEl.addEventListener('input', () => {
    const q = filterEl.value.toLowerCase();
    document.querySelectorAll('#ng-out .col').forEach(col => {
      const name = col.querySelector('.ng-name')?.textContent.toLowerCase() || '';
      col.style.display = (!q || name.includes(q)) ? '' : 'none';
    });
  });

  clearEl?.addEventListener('click', () => {
    filterEl.value = '';
    filterEl.dispatchEvent(new Event('input'));
    filterEl.focus();
  });
});
