// ---------- Status palette ----------
const statusEffects = [
  { name:'Blinded', icon:'👁️' }, { name:'Exhaustion', icon:'💤' }, { name:'Incapacitated', icon:'😴' },
  { name:'Petrified', icon:'🪨' }, { name:'Restrained', icon:'🪢' }, { name:'Charmed', icon:'🔮' },
  { name:'Frightened', icon:'😱' }, { name:'Invisible', icon:'🔎' }, { name:'Poisoned', icon:'☠️' },
  { name:'Unconscious', icon:'😪' }, { name:'Deafened', icon:'🔈' }, { name:'Grappled', icon:'🤼‍♂️' },
  { name:'Paralyzed', icon:'🔐' }, { name:'Prone', icon:'🛌' }
];

(() => {
    const $ = id => document.getElementById(id);

  // --- NEW: unique ID generator for characters ---
  let _charIdCounter = 0;
  function createCharId() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    _charIdCounter++;
    return `char-${Date.now()}-${_charIdCounter}`;
  }
  
  let statusModal = null;
  let notesModal = null;
  let sortableInstance = null;
  let concQueue = [];
  let concToast = null;
  let concPromptActive = false;
  let playerView = false;
  function initModals() {
    const statusEl = document.getElementById('statusModal');
    if (statusEl) statusModal = bootstrap.Modal.getOrCreateInstance(statusEl);
    const notesEl = document.getElementById('notesModal');
    if (notesEl) notesModal = bootstrap.Modal.getOrCreateInstance(notesEl);
  }
  const concToastEl = document.getElementById('concToast');
  if (concToastEl) concToast = bootstrap.Toast.getOrCreateInstance(concToastEl, { autohide: false });
  // If DOM already ready, init immediately; else wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModals);
  } else {
    initModals();
  }

  // ---------- Battle Map Auto-Import ----------
  function checkBattleMapImport() {
    console.log('Checking for battle map import, hash:', window.location.hash);

    // Check for pending data in localStorage
    const pendingData = localStorage.getItem('dmtools.pendingInitiativeImport');
    console.log('Pending data found:', pendingData);

    // Auto-import if there's pending data (regardless of hash)
    if (pendingData) {
      // If hash is #autoimport, clear it; otherwise leave hash as-is
      if (window.location.hash === '#autoimport') {
        window.location.hash = '';
      }

      try {
        const data = JSON.parse(pendingData);
        console.log('Parsed data:', data);
        localStorage.removeItem('dmtools.pendingInitiativeImport');

          // Auto-populate form
          $('character-name').value = data.name || '';
          $('character-health').value = data.maxHp || 0;
          $('character-ac').value = data.ac || 10;

          // Handle initiative - if useActualInitiative flag is set, use the value directly
          // Otherwise treat it as a bonus and roll
          if (data.useActualInitiative) {
            $('initiative-roll').value = data.initiative || 0;
          } else {
            const d20Roll = Math.floor(Math.random() * 20) + 1;
            const initBonus = data.initiative || 0;
            $('initiative-roll').value = d20Roll + initBonus;
          }

          // Set type - use provided type or default to 'npc'
          $('character-type').value = data.type || 'npc';

          // Auto-submit the form after a brief delay
          setTimeout(() => {
            const form = document.getElementById('initiative-form');
            if (form) {
              console.log('Auto-submitting form with character:', data.name);
              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

              // Show a toast notification
              const source = data.source || 'Battle Map';
              const toastMsg = `✨ Added "${data.name}" from ${source}!`;
              const toastEl = document.getElementById('rollToast');
              if (toastEl) {
                const toastBody = toastEl.querySelector('.toast-body');
                if (toastBody) {
                  toastBody.textContent = toastMsg;
                  const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 2000 });
                  toast.show();
                }
              }
            }
          }, 100);

      } catch (e) {
        console.error('Failed to import from Battle Map:', e);
      }
    }
  }

  // Check for auto-import on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkBattleMapImport);
  } else {
    checkBattleMapImport();
  }

  // ---------- Session notes ----------
  const notesKey = 'sessionNotes';
  function loadNotes(){ const s = localStorage.getItem(notesKey); if(s) $('session-notes').value = s; }
  function saveNotes(){ localStorage.setItem(notesKey, $('session-notes').value); }
  document.addEventListener('DOMContentLoaded', loadNotes);
  $('session-notes').addEventListener('input', saveNotes);
  $('save-notes').addEventListener('click', ()=>{ saveNotes(); alert('Notes saved.'); });
  $('export-notes').addEventListener('click', ()=>{
    const blob = new Blob([$('session-notes').value], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`session_notes_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  $('import-notes').addEventListener('click', ()=> $('import-notes-file').click());
  $('import-notes-file').addEventListener('change', function(){
    const f=this.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = e => { $('session-notes').value = e.target.result; saveNotes(); alert('Notes imported.'); };
    r.readAsText(f); this.value='';
  });
  // ---------- State ----------
  let characters = [];
  let currentTurn = 0;
  let combatRound = 1;
  let autoSaveEnabled = true;
  let diceHistory = [];
  let modalCharacterIndex = null; 
  let undoStack = [];             
  const UNDO_LIMIT = 50;          
  const COMBAT_LOG_LIMIT = 100;
  let combatLog = [];
  // ----- Cross-page handoff (append or replace) -----
  function tryRehydrateFromBuilder(){
    try {
      const raw = localStorage.getItem('dmtools.pendingImport');
      if (!raw) return;

      const data = JSON.parse(raw);
      localStorage.removeItem('dmtools.pendingImport');

      if (!data || !Array.isArray(data.characters)) return;

      const normalizeFromBuilder = (c) => normalizeChar({
        id: c.id,  
        name: c.name ?? 'Unknown',
        type: c.type ?? 'Enemy',
        initiative: Number(c.initiative || 0),
        currentHP: Number(c.currentHP ?? c.maxHP ?? 1),
        maxHP:     Number(c.maxHP     ?? c.currentHP ?? 1),
        tempHP:    Number(c.tempHP ?? 0),
        ac: (c.ac ?? null),
        notes: c.notes ?? '',
        concentration: !!c.concentration,
        deathSaves: c.deathSaves ?? { s:0, f:0, stable:false },
        status: Array.isArray(c.status) ? c.status : [],
        concDamagePending: 0
      });

      const importedChars = data.characters.map(normalizeFromBuilder);

      if (data.mode === 'replace') {
        // Explicit full replace (only when the sender really wants that)
        characters   = importedChars;
        currentTurn  = Number(data.currentTurn ?? 0);
        combatRound  = Number(data.combatRound ?? 1);
        diceHistory  = Array.isArray(data.diceHistory) ? data.diceHistory : [];
        console.info(`Session replaced from external page (${importedChars.length} characters).`);
      } else {
        // DEFAULT: append into whatever is already in the tracker
        const hadNone = characters.length === 0;

        characters.push(...importedChars);

        // If the tracker was empty, allow sender's turn/round to seed it.
        if (hadNone) {
          if (typeof data.currentTurn === 'number') {
            currentTurn = Number(data.currentTurn);
          }
          if (typeof data.combatRound === 'number') {
            combatRound = Number(data.combatRound);
          }
          if (Array.isArray(data.diceHistory) && !diceHistory.length) {
            diceHistory = data.diceHistory;
          }
        }

        console.info(`Appended ${importedChars.length} characters from external page (mode: ${data.mode || 'append-default'}).`);
      }
    } catch (e) {
      console.error('Auto-import from builder failed:', e);
    }
  }
  // ---------- Persistence ----------
  function elevateMaxHp(c){
    if (Number.isFinite(c.currentHP) && c.currentHP > (c.maxHP || 0)) {
      c.maxHP = c.currentHP;      
    }
  }
    function normalizeChar(c){
    const cur = +c.currentHP || 0;
    const max = +c.maxHP || 0;
    const fixedMax = Math.max(max, cur); 

    return {
      // NEW: ensure every character has a stable unique id
      id: c.id || createCharId(),

      name: c.name,
      type: c.type || 'PC',
      initiative: +c.initiative || 0,
      currentHP: cur,
      maxHP: fixedMax,
      tempHP: +c.tempHP || 0,
      ac: (c.ac ?? null),
      notes: c.notes || '',
      concentration: !!c.concentration,
      deathSaves: {
        s: Math.min(3, Math.max(0, +(c.deathSaves?.s ?? 0))),
        f: Math.min(3, Math.max(0, +(c.deathSaves?.f ?? 0))),
        stable: !!(c.deathSaves?.stable)
      },
      status: (c.status || []).map(s =>
        typeof s === 'string'
          ? { name: s, icon: (statusEffects.find(e => e.name === s)?.icon || '❓') }
          : {
              name: s.name,
              icon: s.icon || (statusEffects.find(e => e.name === s.name)?.icon || '❓'),
              remaining: (typeof s.remaining === 'number' ? s.remaining : undefined)
            }
      ),
      // keep any existing concDamagePending if present
      concDamagePending: +c.concDamagePending || 0
    };
  }
  function saveState(manual=false){
    const key = manual ? `initiativeTrackerData_${new Date().toISOString()}` : 'initiativeTrackerData';
    const payload = { characters, currentTurn, combatRound, diceHistory, combatLog };
    localStorage.setItem(key, JSON.stringify(payload));
    if (manual) updateSaveHistory();
  }
  function loadState(){
    const raw = localStorage.getItem('initiativeTrackerData');
    if(!raw) return;
    try{
      const data = JSON.parse(raw);
      characters = (data.characters||[]).map(normalizeChar);
      currentTurn = data.currentTurn||0;
      combatRound = data.combatRound||1;
      diceHistory = Array.isArray(data.diceHistory) ? data.diceHistory : [];
      combatLog = Array.isArray(data.combatLog) ? data.combatLog.slice(-COMBAT_LOG_LIMIT) : [];
    }catch(e){ console.warn('Load failed', e); }
  }
  // ---------- Undo ----------
  function snapshot() {
    // Deep copy core game state
    return JSON.parse(JSON.stringify({ characters, currentTurn, combatRound, combatLog }));
  }
  function pushHistory(label='') {
    undoStack.push({ state: snapshot(), label, ts: Date.now() });
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  }
  function undoLast() {
    const last = undoStack.pop();
    if (!last) return;
    const { state } = last;
    characters = (state.characters || []).map(normalizeChar);
    currentTurn = state.currentTurn ?? 0;
    combatRound = state.combatRound ?? 1;
    combatLog = Array.isArray(state.combatLog) ? state.combatLog : [];
    buildTable();
  }
  
  // ---------- Saved character templates ----------
  const TKEY='savedCharacters';
  const MAX_SAVED = 200;
  const _lbl1 = document.getElementById('savedMaxLabel');
    if (_lbl1) _lbl1.textContent = MAX_SAVED;
  // optional safety check
  (function ensureMaxLabelSync(){
    const el = document.getElementById('savedMaxLabel');
    if (el && el.textContent !== String(MAX_SAVED)) el.textContent = MAX_SAVED;
  })();  
  function getSaved(){ try{ return JSON.parse(localStorage.getItem(TKEY)||'[]'); }catch{ return []; } }
  function setSaved(list){ localStorage.setItem(TKEY, JSON.stringify(list)); }
  function addSavedTemplate(t){
    const list = getSaved();
    if (list.length >= MAX_SAVED) { 
      alert(`Max ${MAX_SAVED} saved characters.`);
      return false; 
    }
    const idx = list.findIndex(x=>x.name.toLowerCase()===t.name.toLowerCase());
    if (idx>=0) list[idx]=t; else list.push(t);
    setSaved(list);
    buildSavedUI();
    return true;
  }
  function removeSavedByName(name){
    const list = getSaved().filter(x=>x.name!==name);
    setSaved(list); buildSavedUI();
  }
  function clearSavedAll(){ localStorage.removeItem(TKEY); buildSavedUI(); }
  function buildSavedUI(){
    // dropdown
    const select = $('loadCharacterSelect');
    select.innerHTML = '<option disabled selected>Load Saved Character</option>';
    const list = getSaved();
    list.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.name; opt.textContent = `${c.name} (${c.type})`;
      select.appendChild(opt);
    });
    // searchable list
    const ul = $('saved-characters-list'); ul.innerHTML='';
    const q = $('saved-search').value.trim().toLowerCase();
    const typeFilter = $('saved-type-filter').value;
    list
      .filter(c => (!q || c.name.toLowerCase().includes(q)) && (!typeFilter || c.type===typeFilter))
      .forEach(c=>{
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center bg-dark text-light border-light';
        li.innerHTML = `
          <span><strong>${c.name}</strong> — <em>${c.type}</em> • AC: ${c.ac} • HP: ${c.maxHP}</span>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-light" data-act="load" data-name="${c.name}">Load</button>
            <button class="btn btn-sm btn-outline-success" data-act="add" data-name="${c.name}">Add</button>
            <button class="btn btn-sm btn-outline-danger" data-act="del" data-name="${c.name}">Delete</button>
          </div>`;
        ul.appendChild(li);
      });
    ul.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const name = btn.dataset.name;
        const c = getSaved().find(x=>x.name===name);
        if (!c) return;
        if (btn.dataset.act==='load'){
          $('character-name').value = c.name;
          $('initiative-roll').value = c.initiative||0;
          $('character-health').value = c.maxHP||0;
          $('character-ac').value = c.ac||0;
          $('character-type').value = c.type||'PC';
        } else if (btn.dataset.act==='add'){
          const nc = normalizeChar({...c, currentHP:c.maxHP});
          characters.push(nc);
          maybeSortByInitiative();
          buildTable();
        } else if (btn.dataset.act==='del'){
          removeSavedByName(name);
        }
      });
    });
  }
  // Saved template form
  $('save-character-btn').addEventListener('click', ()=>{
    const name = $('save-name').value.trim();
    const maxHP = parseInt($('save-health').value,10);
    const ac = parseInt($('save-ac').value,10);
    const type = $('save-type').value;
    if (!name || isNaN(maxHP) || isNaN(ac)) { alert('Please enter valid Name, Max HP, and AC.'); return; }
    addSavedTemplate({ name, maxHP, ac, type, initiative:0 });
    $('save-name').value=''; $('save-health').value=''; $('save-ac').value='';
  });
  $('saved-search').addEventListener('input', buildSavedUI);
  $('saved-type-filter').addEventListener('change', buildSavedUI);
  $('clear-saved-btn').addEventListener('click', ()=>{
    if(confirm('Delete ALL saved character templates?')) clearSavedAll();
  });
  $('loadCharacterSelect').addEventListener('change', function(){
    const c = getSaved().find(x=>x.name===this.value); if(!c) return;
    $('character-name').value = c.name;
    $('initiative-roll').value = c.initiative||0;
    $('character-health').value = c.maxHP||0;
    $('character-ac').value = c.ac||0;
    $('character-type').value = c.type||'PC';
  });
  $('load-to-form-btn').addEventListener('click', ()=>{
    const sel = $('loadCharacterSelect'); if (!sel.value || sel.selectedIndex===0) return alert('Pick a saved character first.');
    const c = getSaved().find(x=>x.name===sel.value); if(!c) return;
    $('character-name').value = c.name;
    $('initiative-roll').value = c.initiative||0;
    $('character-health').value = c.maxHP||0;
    $('character-ac').value = c.ac||0;
    $('character-type').value = c.type||'PC';
  });
    $('add-to-tracker-btn').addEventListener('click', ()=>{
    const sel = $('loadCharacterSelect');
    if (!sel.value || sel.selectedIndex === 0) return alert('Pick a saved character first.');
    const c = getSaved().find(x => x.name === sel.value);
    if (!c) return;

    const raw = {
      ...c,
      id: createCharId(),   
      currentHP: c.maxHP,
      concDamagePending: 0
    };

    characters.push(normalizeChar(raw));
    maybeSortByInitiative();
    buildTable();
  });
// ---------- Dice ----------
function addToHistory(text){
  diceHistory.unshift({ text, timestamp: new Date().toLocaleTimeString() });
  buildDiceHistory();
  if (autoSaveEnabled) saveState();
}
function buildDiceHistory(){
  const wrap = $('dice-history-log'); wrap.innerHTML='';
  diceHistory.forEach(entry=>{
    const div = document.createElement('div');
    div.className = 'border-bottom pb-1 mb-1';
    div.innerHTML = `<strong>${entry.timestamp}</strong>: ${entry.text}`;
    wrap.appendChild(div);
  });
}
// Parser: supports +/- terms, multi-terms, and keep-high/low
//  - "2d6+1d4+3", "4d6kh3" (keep highest 3), "2d20kl1" (disadv), "2d20kh1" (adv)
//  - Flat modifiers like +3 or -1
const termRe = /([+-]?)\s*(?:(\d*)d(\d+)(?:k(h|l)(\d+))?)|([+-]?\d+)/ig;
function rollDiceExpr(exprRaw) {
  const expr = exprRaw.replace(/\s+/g,'').toLowerCase();
  let total = 0, parts = [], match;
  let any = false;
  // Basic validation – only digits, d, k, h/l, +/-, and letters a/d/v/i/s for "adv/dis" passthrough handling
  if (!/^[0-9dkhl+\-\sadvini]*$/i.test(expr)) {
    throw new Error('Invalid characters.');
  }
  while((match = termRe.exec(expr)) !== null){
    any = true;
    if (match[6]) { // flat mod
      const n = parseInt(match[6],10);
      if (Number.isNaN(n)) continue;
      total += n;
      parts.push({type:'mod', n});
      continue;
    }
    const sign = match[1] === '-' ? -1 : 1;
    const count = parseInt(match[2]||'1',10);
    const sides = parseInt(match[3],10);
    const keepDir = match[4]; // 'h' or 'l'
    const keepN = match[5] ? parseInt(match[5],10) : null;
    if (!sides || count<=0) continue;
    const rolls = Array.from({length:count}, ()=> 1 + Math.floor(Math.random()*sides));
    let used = rolls.slice();
    if (keepN && keepN > 0 && keepN < rolls.length) {
      used = rolls.slice().sort((a,b)=>a-b);
      used = (keepDir === 'h') ? used.slice(-keepN) : used.slice(0, keepN);
    }
    const subtotal = sign * used.reduce((a,b)=>a+b,0);
    total += subtotal;
    parts.push({type:'dice', sign, count, sides, rolls, used, keepDir, keepN, subtotal});
  }
  if (!any) throw new Error('Nothing to roll.');
  return { total, parts };
}
function formatParts(parts){
  return parts.map(p=>{
    if (p.type==='mod') return `${p.n>=0?'+':''}${p.n}`;
    const head = `${p.sign<0?'-':''}${p.count}d${p.sides}${p.keepN?`k${p.keepDir}${p.keepN}`:''}`;
    return `${head} [${p.rolls.join(', ')}]${p.keepN?` → kept [${p.used.join(', ')}]`:''}`;
  }).join(' ');
}
function showRoll(total, detailText){
  const el = document.querySelector('#rollToast .toast-body');
  el.innerHTML = `🎲 ${total}<div class="small opacity-75 mt-1">${detailText||''}</div>`;
  const toastEl = document.getElementById('rollToast');
  // Ensure autohide + short delay every time
  const t = new bootstrap.Toast(toastEl, { autohide: true, delay: 900 });
  t.show();
}
// Quick buttons now use the expression roller too
document.querySelectorAll('.dice-btn').forEach(btn=>{
  btn.addEventListener('click', function(){
    const sides = parseInt(this.dataset.dice,10);
    const r = rollDiceExpr(`1d${sides}`);
    const line = `Rolled 1d${sides}: [${r.parts[0].rolls.join(', ')}] = ${r.total}`;
    $('dice-result').textContent = `🎲 ${line}`;
    showRoll(r.total, `1d${sides}`);
    addToHistory(line);
  });
});
// Advantage / Disadvantage (assume plain d20)
$('roll-adv').addEventListener('click', ()=>{
  const r = rollDiceExpr('2d20kh1');
  const p = r.parts[0];
  const line = `Advantage (2d20kh1): [${p.rolls.join(', ')}] → kept [${p.used.join(', ')}] = ${r.total}`;
  $('dice-result').textContent = `🎲 ${line}`;
  showRoll(r.total, 'Advantage');
  addToHistory(line);
});
$('roll-dis').addEventListener('click', ()=>{
  const r = rollDiceExpr('2d20kl1');
  const p = r.parts[0];
  const line = `Disadvantage (2d20kl1): [${p.rolls.join(', ')}] → kept [${p.used.join(', ')}] = ${r.total}`;
  $('dice-result').textContent = `🎲 ${line}`;
  showRoll(r.total, 'Disadvantage');
  addToHistory(line);
});
// Custom input supports multi-terms & kh/kl
$('roll-custom-dice').addEventListener('click', function(){
  const input = $('custom-dice-input').value.trim();
  if (!input) return;
  // little sugar: allow "adv" / "dis" as shortcuts
  let expr = input.toLowerCase();
  if (expr === 'adv') expr = '2d20kh1';
  if (expr === 'dis') expr = '2d20kl1';
  try{
    const r = rollDiceExpr(expr);
    const details = formatParts(r.parts);
    const line = `Rolled ${expr}: ${details} = ${r.total}`;
    $('dice-result').textContent = `🎲 ${line}`;
    showRoll(r.total, expr);
    addToHistory(line);
  }catch(e){
    alert("Invalid format.\nExamples:\n  2d6+3\n  2d6+1d4+3\n  4d6kh3 (keep highest 3)\n  2d20kl1 (disadvantage)");
  }
});
$('clear-dice-history').addEventListener('click', ()=>{
  if (confirm("Clear all dice history?")) { diceHistory = []; buildDiceHistory(); if (autoSaveEnabled) saveState(); }
});
  // ---------- Helpers ----------
  function hpClass(percent){
    if (percent <= 0) return 'bg-secondary text-light'; 
    if (percent <= 25) return 'bg-danger text-light';
    if (percent <= 50) return 'bg-warning text-dark';
    if (percent <= 75) return 'bg-orange text-dark';
    return 'bg-success text-light';
  }
  function maybeSortByInitiative() {
    if ($('lockOrderToggle')?.checked) return;
    const active = characters[currentTurn] || null;  // remember who is active
    characters.sort((a, b) => b.initiative - a.initiative);
    if (active) {
      const idx = characters.indexOf(active);
      currentTurn = (idx === -1) ? 0 : idx;
    }
  }
  
  function statusTooltipText(c){
    const parts = [];
    if (c.concentration) parts.push('Concentration: ON');
    if (c.status.length){
      parts.push('Effects:');
      c.status.forEach(s=> parts.push(`- ${s.name}${typeof s.remaining==='number' ? ` (${s.remaining})` : ''}`));
    }else{
      parts.push('Effects: none');
    }
    return parts.join('\n');
  }
  function enqueueConcentrationPrompt(idx, dmg, dc) {
    concQueue.push({ idx, dmg, dc });
    if (!concPromptActive) drainConcentrationQueue();
  }
  function drainConcentrationQueue() {
    if (!concQueue.length) { concPromptActive = false; return; }
    concPromptActive = true;
  
    const item = concQueue.shift();
    const c = characters[item.idx];
    if (!c) return drainConcentrationQueue(); // character deleted
  
    // Fill toast contents
    document.getElementById('concToastName').textContent = c.name;
    document.getElementById('concToastMsg').innerHTML =
      `Took <strong>${item.dmg}</strong> damage this turn. DC = <strong>${item.dc}</strong> (max(10, ⌊damage/2⌋)).`;
  
    // Stash the index on buttons for handlers
    const passBtn = document.getElementById('concPassBtn');
    const failBtn = document.getElementById('concFailBtn');
    passBtn.dataset.idx = String(item.idx);
    failBtn.dataset.idx = String(item.idx);
    passBtn.dataset.dmg = String(item.dmg);
    passBtn.dataset.dc = String(item.dc);
    failBtn.dataset.dmg = String(item.dmg);
    failBtn.dataset.dc = String(item.dc);
  
    // Show toast
    concToast.show();
  }
  // Button handlers (bind once)
  document.getElementById('concPassBtn')?.addEventListener('click', (e) => {
    const idx = +e.currentTarget.dataset.idx;
    const c = characters[idx];
    const dmg = parseInt(e.currentTarget.dataset.dmg || '0', 10) || 0;
    const dc = parseInt(e.currentTarget.dataset.dc || '10', 10) || 10;
    if (c) {
      c.concDamagePending = 0;
      logEvent({
        type: 'concentration',
        summary: 'Concentration Check Passed',
        targetId: c.id,
        targetName: c.name,
        source: 'concentration-check',
        details: `Damage ${dmg} • DC ${dc}`,
        concentration: 'Maintained concentration'
      });
    }
    concToast.hide();
    // allow Bootstrap fade-out then continue
    setTimeout(() => { drainConcentrationQueue(); }, 120);
  });
  document.getElementById('concFailBtn')?.addEventListener('click', (e) => {
    const idx = +e.currentTarget.dataset.idx;
    const c = characters[idx];
    if (c) {
      c.concDamagePending = 0;
      c.concentration = false;     // auto-break
      const dmg = parseInt(e.currentTarget.dataset.dmg || '0', 10) || 0;
      const dc = parseInt(e.currentTarget.dataset.dc || '10', 10) || 10;
      logEvent({
        type: 'concentration',
        summary: 'Concentration Check Failed',
        targetId: c.id,
        targetName: c.name,
        source: 'concentration-check',
        details: `Damage ${dmg} • DC ${dc}`,
        concentration: 'Concentration lost'
      });
    }
    buildTable();                  // reflect star-off immediately
    concToast.hide();
    setTimeout(() => { drainConcentrationQueue(); }, 120);
  });
  function safeHpPercent(c){
    // MaxHP can be 0 (e.g., lair actions, traps, narrative tokens)
    if (!Number.isFinite(c.maxHP) || c.maxHP <= 0) return 0;
    const p = Math.round((c.currentHP / c.maxHP) * 100);
    return Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
  }
  function escapeRegExp(str){ return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function baseNameOf(name){
    // strip " (copy)" and a trailing integer like " 2"
    return name.replace(/\s*\(copy\)$/i,'').replace(/\s+\d+$/,'').trim();
  }
  function nextNumberedName(base){
    // Find the max used numeric suffix for this base; next will be max+1 (or 2 if only the base exists)
    let maxNum = 1; // base alone counts as "1"
    const re = new RegExp('^' + escapeRegExp(base) + '\\s+(\\d+)$', 'i');
  
    characters.forEach(c => {
      const nm = (c.name || '').trim();
      if (nm.toLowerCase() === base.toLowerCase()) {
        maxNum = Math.max(maxNum, 1);
        return;
      }
      const m = nm.match(re);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
      }
    });
  
    return `${base} ${maxNum + 1}`;
  }
  function renderStatusHtml(c) {
    const concChip = c.concentration
      ? `<span class="status-chip conc-chip" title="Concentration">
           <i class="bi bi-star-fill"></i>
         </span>`
      : '';
       
    const effectChips = c.status.map(s => {
      const rem = (typeof s.remaining === 'number')
        ? ` data-remaining="${s.remaining}"`
        : '';
      return `<span class="status-chip"${rem} title="${s.name}">${s.icon}</span>`;
    }).join('');
  
    if (!concChip && !effectChips) {
      return '<span class="text-secondary" style="opacity:.6;">—</span>';
    }
  
    return concChip + effectChips;
  }
    // ---------- Combat log utilities ----------
    function getTurnContext() {
      const acting = characters[currentTurn];
      return {
        round: combatRound,
        turnIndex: characters.length ? currentTurn : null,
        turnName: acting?.name || null,
        turnId: acting?.id || null,
        actorName: acting?.name || null
      };
    }

    function formatSourceLabel(src) {
      const map = {
        'quick-adjust': 'Quick Adjust',
        'manual-input': 'Manual Edit',
        'bulk-hp': 'Bulk HP',
        'temp-hp': 'Temp HP',
        'status-modal': 'Status Modal',
        'status-auto': 'Auto Tick',
        'death-save': 'Death Save',
        'concentration': 'Concentration',
        'concentration-check': 'Conc. Check'
      };
      return map[src] || (src ? src.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Manual');
    }

    function logEvent(detail = {}) {
      const ctx = getTurnContext();
      const entry = {
        id: window.crypto?.randomUUID ? crypto.randomUUID() : `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...ctx,
        type: detail.type || 'info',
        summary: detail.summary || detail.type || 'Event',
        targetId: detail.targetId || null,
        targetName: detail.targetName || null,
        actorName: detail.actorName || ctx.actorName || null,
        hpBefore: detail.hpBefore ?? null,
        hpAfter: detail.hpAfter ?? null,
        thpBefore: detail.thpBefore ?? null,
        thpAfter: detail.thpAfter ?? null,
        hpDelta: detail.hpDelta ?? ((detail.hpBefore != null && detail.hpAfter != null) ? detail.hpAfter - detail.hpBefore : null),
        thpDelta: detail.thpDelta ?? ((detail.thpBefore != null && detail.thpAfter != null) ? detail.thpAfter - detail.thpBefore : null),
        details: detail.details || '',
        deathSaves: detail.deathSaves || null,
        statusPayload: detail.statusPayload || null,
        concentration: detail.concentration ?? null,
        sources: Array.isArray(detail.sources)
          ? detail.sources.filter(Boolean)
          : [detail.source || 'manual'].filter(Boolean)
      };

      combatLog.push(entry);
      if (combatLog.length > COMBAT_LOG_LIMIT) combatLog.shift();
      buildCombatLog();
      if (autoSaveEnabled) saveState();
    }

    function logHpChange(target, payload = {}) {
      if (!target) return;
      logEvent({
        type: payload.type || (payload.hpAfter < payload.hpBefore ? 'damage' : 'heal'),
        summary: payload.summary || (payload.type === 'temp' ? 'Temp HP Adjust' : (payload.hpAfter < payload.hpBefore ? 'Damage' : 'Heal')),
        targetId: target.id,
        targetName: target.name,
        hpBefore: payload.hpBefore,
        hpAfter: payload.hpAfter,
        thpBefore: payload.thpBefore,
        thpAfter: payload.thpAfter,
        source: payload.source,
        details: payload.details,
        deathSaves: payload.deathSaves,
        concentration: payload.concentration
      });
    }

    function applyHpDelta(idx, delta, options = {}) {
      if (!Number.isFinite(delta) || delta === 0) return;
      const c = characters[idx];
      if (!c) return;

      if (!options.skipHistory) {
        const histLabel = options.history || `HP ${delta >= 0 ? '+' : ''}${delta} for ${c.name}`;
        pushHistory(histLabel);
      }

      const beforeHP = c.currentHP;
      const beforeTHP = c.tempHP || 0;
      let usedThp = 0;

      if (delta < 0) {
        let dmg = -delta;
        usedThp = Math.min(c.tempHP || 0, dmg);
        c.tempHP = (c.tempHP || 0) - usedThp;
        dmg -= usedThp;
        if (dmg > 0) {
          const prev = c.currentHP;
          c.currentHP = Math.max(0, Math.min(c.maxHP, c.currentHP - dmg));
          const taken = Math.max(0, prev - c.currentHP);
          if (taken > 0) c.concDamagePending = (c.concDamagePending || 0) + taken;
        }
      } else {
        c.currentHP = Math.max(0, c.currentHP + delta);
        if (c.currentHP > 0) c.deathSaves = { s: 0, f: 0, stable: false };
        elevateMaxHp(c);
      }

      const afterHP = c.currentHP;
      const afterTHP = c.tempHP || 0;
      if (beforeHP === afterHP && beforeTHP === afterTHP) {
        buildTable();
        return;
      }

      const hpLoss = Math.max(0, beforeHP - afterHP);
      const hpGain = Math.max(0, afterHP - beforeHP);
      const detailBits = [];
      if (usedThp) detailBits.push(`${usedThp} absorbed by THP`);
      if (beforeHP > 0 && afterHP <= 0) detailBits.push('Dropped to 0 HP');
      if (beforeHP <= 0 && afterHP > 0) detailBits.push('Back above 0 HP (death saves reset)');
      if (options.extraDetails) detailBits.push(options.extraDetails);

      const summary = options.summary || (delta < 0
        ? `Damage ${hpLoss + usedThp}`
        : `Heal ${hpGain}`);

      logHpChange(c, {
        type: delta < 0 ? 'damage' : 'heal',
        summary,
        hpBefore: beforeHP,
        hpAfter: afterHP,
        thpBefore: beforeTHP,
        thpAfter: afterTHP,
        source: options.source || 'quick-adjust',
        details: detailBits.length ? detailBits.join(' • ') : undefined,
        deathSaves: (beforeHP <= 0 && afterHP > 0) ? { ...c.deathSaves } : undefined
      });

      buildTable();
    }

    function buildCombatLog() {
      const accordion = $('combat-log-accordion');
      const emptyState = $('combat-log-empty');
      const countEl = $('combat-log-count');
      if (countEl) countEl.textContent = combatLog.length;
      if (!accordion || !emptyState) return;

      if (!combatLog.length) {
        accordion.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
      }

      emptyState.classList.add('d-none');

      const grouped = combatLog.reduce((acc, entry) => {
        const key = entry.round ?? '—';
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
      }, {});

      const rounds = Object.keys(grouped)
        .map(v => (v === '—' ? v : Number(v)))
        .sort((a, b) => {
          if (a === '—') return 1;
          if (b === '—') return -1;
          return b - a;
        });

      accordion.innerHTML = '';

      rounds.forEach((roundKey, idx) => {
        const entries = grouped[roundKey].slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const collapseId = `combat-log-round-${roundKey}-${idx}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'accordion-item bg-dark border-secondary';
        wrapper.innerHTML = `
          <h2 class="accordion-header" id="${collapseId}-header">
            <button class="accordion-button ${idx === 0 ? '' : 'collapsed'} bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${idx === 0}">
              Round ${roundKey} <span class="badge bg-secondary ms-2">${entries.length} entries</span>
            </button>
          </h2>
          <div id="${collapseId}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}" data-bs-parent="#combat-log-accordion">
            <div class="accordion-body p-0">
              <div class="table-responsive">
                <table class="table table-sm table-dark table-striped mb-0">
                  <thead>
                    <tr>
                      <th style="min-width: 120px;">Turn</th>
                      <th style="min-width: 140px;">Action Owner</th>
                      <th style="min-width: 140px;">Target</th>
                      <th style="min-width: 160px;">Action</th>
                      <th style="min-width: 110px;">HP</th>
                      <th style="min-width: 110px;">THP</th>
                      <th style="min-width: 200px;">Details</th>
                      <th style="min-width: 120px;">Source</th>
                      <th style="min-width: 110px;">Logged</th>
                    </tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>`;

        const tbody = wrapper.querySelector('tbody');
        entries.forEach(entry => {
          const turnLabel = (entry.turnName ?? '—') + (Number.isFinite(entry.turnIndex) ? ` (#${(entry.turnIndex ?? 0) + 1})` : '');
          const hpText = (entry.hpBefore != null && entry.hpAfter != null)
            ? `${entry.hpBefore} → ${entry.hpAfter}${entry.hpDelta != null && entry.hpDelta !== 0 ? ` (${entry.hpDelta > 0 ? '+' : ''}${entry.hpDelta})` : ''}`
            : '—';
          const thpText = (entry.thpBefore != null && entry.thpAfter != null)
            ? `${entry.thpBefore} → ${entry.thpAfter}${entry.thpDelta != null && entry.thpDelta !== 0 ? ` (${entry.thpDelta > 0 ? '+' : ''}${entry.thpDelta})` : ''}`
            : '—';
          const detailText = [entry.details, entry.statusPayload, entry.deathSaves ? `Death Saves — S:${entry.deathSaves.s} F:${entry.deathSaves.f}${entry.deathSaves.stable ? ' (Stable)' : ''}` : '', entry.concentration ?? '']
            .filter(Boolean)
            .join(' • ');
          const sourceBadges = (entry.sources || []).map(flag => `<span class="badge bg-secondary me-1">${formatSourceLabel(flag)}</span>`).join('') || '—';
          let loggedTime = '—';
          if (entry.timestamp) {
            const entryDate = new Date(entry.timestamp);
            const today = new Date();
            const sameDay = entryDate.toDateString() === today.toDateString();
            const timePart = entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (sameDay) {
              loggedTime = timePart;
            } else {
              const datePart = entryDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
              loggedTime = `${datePart} ${timePart}`;
            }
          }

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${turnLabel}</td>
            <td>${entry.actorName || entry.turnName || '—'}</td>
            <td>${entry.targetName || '—'}</td>
            <td>${entry.summary}</td>
            <td>${hpText}</td>
            <td>${thpText}</td>
            <td>${detailText || '—'}</td>
            <td>${sourceBadges}</td>
            <td>${loggedTime}</td>`;
          tbody.appendChild(row);
        });

        accordion.appendChild(wrapper);
      });
    }
  // ---------- Build UI ----------
  function buildTable(){
    $('combat-round').textContent = combatRound;
    const tableBody = $('initiative-order');
    const mobileBody = $('mobile-initiative-order');
    tableBody.innerHTML = '';
    mobileBody.innerHTML = '';
    characters.forEach((c,i)=>{
      // const pct = Math.max(0, Math.round((c.currentHP / c.maxHP) * 100));
      const pct = safeHpPercent(c);
      const isDowned = (c.maxHP > 0 && c.currentHP <= 0);
      // Desktop row
      const tr = document.createElement('tr');
      tr.dataset.type = c.type;
      if (i === currentTurn) tr.classList.add('active-turn');
      tr.innerHTML = `
        <td class="drag-handle col-drag"><i class="bi bi-grip-vertical"></i></td>
        <td class="col-turn">${i===currentTurn ? '<i class="bi bi-caret-right-fill"></i>' : ''}</td>
        <td class="${isDowned ? 'text-decoration-line-through' : ''}">
          <input type="text" class="form-control form-control-sm name-input"
                 value="${c.name}" data-index="${i}" />
        </td>
        <td>${c.type}</td>
        <td><input type="number"class="form-control form-control-sm init-input"value="${c.initiative}"data-id="${c.id}"data-commit="init"></td>
        <td class="col-ac">${c.ac ?? '-'}</td>
        <td class="col-health">
          <div class="d-flex align-items-center">
            <input type="number" class="form-control form-control-sm health-input ${hpClass(pct)}" value="${c.currentHP}" data-index="${i}" style="max-width:6rem">
            <div class="btn-group btn-group-sm ms-1 hp-controls" role="group">
              <button class="btn btn-outline-light hit-btn" data-delta="-5" data-index="${i}">-5</button>
              <button class="btn btn-outline-light hit-btn" data-delta="-1" data-index="${i}">-1</button>
              <button class="btn btn-outline-light hit-btn" data-delta="1" data-index="${i}">+1</button>
              <button class="btn btn-outline-light hit-btn" data-delta="5" data-index="${i}">+5</button>
            </div>
            <div class="input-group input-group-sm ms-2 precision-control" style="max-width:11rem;">
              <input type="number" min="1" class="form-control precision-amount" data-index="${i}" placeholder="Amount">
              <button class="btn btn-outline-danger precision-damage" data-index="${i}" title="Apply damage"><i class="bi bi-dash-circle"></i></button>
              <button class="btn btn-outline-success precision-heal" data-index="${i}" title="Apply healing"><i class="bi bi-plus-circle"></i></button>
            </div>
            <div class="tempHP ms-2 temphp-wrap">
              <span class="temphp-badge">THP: <span class="temphp-val">${c.tempHP||0}</span></span>
              <div class="btn-group btn-group-sm temp-btns" role="group">
                <button class="btn btn-outline-info temphp-btn" data-index="${i}" data-delta="-1">-1</button>
                <button class="btn btn-outline-info temphp-btn" data-index="${i}" data-delta="1">+1</button>
              </div>
            </div>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <div class="status-icon-row" data-bs-toggle="tooltip" data-bs-placement="top" title="${statusTooltipText(c)}">
                ${renderStatusHtml(c)}
              </div>
              ${isDowned ? `
              <div class="death-saves" title="Death Saves">
                ${c.deathSaves.stable ? `<span class="ds-stable">Stable</span>` : `
                  <span class="ds-pill success">S: ${c.deathSaves.s}</span>
                  <span class="ds-pill fail">F: ${c.deathSaves.f}</span>
                  <div class="btn-group btn-group-sm ds-btns" role="group">
                    <button class="btn btn-outline-success ds-add" data-index="${i}" data-kind="s">+S</button>
                    <button class="btn btn-outline-danger ds-add" data-index="${i}" data-kind="f">+F</button>
                    <button class="btn btn-outline-secondary ds-reset" data-index="${i}" title="Reset">↺</button>
                  </div>
                `}
              </div>` : ``}
            </div>
            <div class="notes-actions">
              <button class="btn btn-sm btn-outline-light notes-btn" data-index="${i}" title="Notes"><i class="bi bi-journal-text"></i></button>
              <button class="btn btn-sm conc-btn ${c.concentration?'conc-on':''}" title="Toggle Concentration" data-index="${i}">
                <i class="bi ${c.concentration?'bi-star-fill':'bi-star'}"></i>
              </button>
              <button class="btn btn-sm btn-outline-info status-btn" data-index="${i}" title="Edit Status"><i class="bi bi-emoji-smile"></i></button>
            </div>
          </div>
        </td>
        <td class="d-flex gap-1 col-actions">
          <button class="btn btn-sm btn-outline-success duplicate-btn" data-index="${i}" title="Duplicate"><i class="bi bi-files"></i></button>
          <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${i}" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      `;
      tableBody.appendChild(tr);
      // Mobile card
      const card = document.createElement('div');
      card.className = 'card mb-2 text-start '+(i===currentTurn?'border-success':'');
      card.innerHTML = `
        <div class="card-body">
          <h5 class="card-title mb-1 d-flex align-items-center gap-2 flex-wrap">
            <input type="text" class="form-control form-control-sm name-input"
                   style="max-width: 240px" value="${c.name}" data-index="${i}">
            <small class="text-muted">
              (<span class="meta-type-init">${c.type} • Init ${c.initiative}</span>
               <span class="meta-ac"> • AC ${c.ac ?? '-'}</span>)
            </small>
            ${c.concentration ? '<span class="ms-1 text-warning" title="Concentration"><i class="bi bi-star-fill"></i></span>' : ''}
          </h5>
          <div class="mb-1">HP:
            <input type="number" class="form-control form-control-sm health-input ${hpClass(pct)} d-inline-block" style="max-width:6rem" value="${c.currentHP}" data-index="${i}">
            <div class="btn-group btn-group-sm ms-1 hp-controls">
              <button class="btn btn-outline-light hit-btn" data-delta="-5" data-index="${i}">-5</button>
              <button class="btn btn-outline-light hit-btn" data-delta="-1" data-index="${i}">-1</button>
              <button class="btn btn-outline-light hit-btn" data-delta="1" data-index="${i}">+1</button>
              <button class="btn btn-outline-light hit-btn" data-delta="5" data-index="${i}">+5</button>
            </div>
            <div class="input-group input-group-sm mt-1 precision-control">
              <input type="number" min="1" class="form-control precision-amount" data-index="${i}" placeholder="Amount">
              <button class="btn btn-outline-danger precision-damage" data-index="${i}" title="Apply damage"><i class="bi bi-dash-circle"></i></button>
              <button class="btn btn-outline-success precision-heal" data-index="${i}" title="Apply healing"><i class="bi bi-plus-circle"></i></button>
            </div>
          </div>
          <div class="d-flex align-items-center justify-content-between">
            <div class="status-icon-row" data-bs-toggle="tooltip" title="${statusTooltipText(c)}">
              ${c.status.map(s=>{
                const rem = (typeof s.remaining==='number') ? ` data-remaining="${s.remaining}"` : '';
                return `<span class="status-chip"${rem} title="${s.name}">${s.icon}</span>`;
              }).join('') || '<span class="text-secondary" style="opacity:.6;">—</span>'}
            </div>
            <div class="notes-actions">
              <button class="btn btn-sm btn-outline-light notes-btn" data-index="${i}" title="Notes"><i class="bi bi-journal-text"></i></button>
              <button class="btn btn-sm conc-btn ${c.concentration?'conc-on':''}" title="Toggle Concentration" data-index="${i}">
                <i class="bi ${c.concentration?'bi-star-fill':'bi-star'}"></i>
              </button>
              <button class="btn btn-sm btn-outline-info status-btn" data-index="${i}" title="Edit Status"><i class="bi bi-emoji-smile"></i></button>
            </div>
          </div>
          <div class="d-flex justify-content-end mt-2 gap-1">
            <button class="btn btn-sm btn-outline-light move-up" data-index="${i}"><i class="bi bi-arrow-up"></i></button>
            <button class="btn btn-sm btn-outline-light move-down" data-index="${i}"><i class="bi bi-arrow-down"></i></button>
            <button class="btn btn-sm btn-outline-success duplicate-btn" data-index="${i}"><i class="bi bi-files"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${i}"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      `;
      mobileBody.appendChild(card);
    });
    // Tooltips
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    bootstrap.Tooltip.getOrCreateInstance(el, { trigger: 'hover', html: false });
    });
    // HP adjust
    document.querySelectorAll('.hit-btn').forEach(b => {
      b.addEventListener('click', function() {
        const idx = +this.dataset.index;
        const delta = +this.dataset.delta;
        applyHpDelta(idx, delta, { source: 'quick-adjust' });
      });
    });
    const readPrecisionAmount = (triggerEl) => {
      const wrap = triggerEl.closest('.precision-control');
      const input = wrap ? wrap.querySelector('.precision-amount') : null;
      if (!input) return { amount: 0, input: null };
      const raw = parseInt(input.value, 10);
      return { amount: Math.max(0, Math.abs(raw || 0)), input };
    };
    document.querySelectorAll('.precision-damage').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = +this.dataset.index;
        const { amount, input } = readPrecisionAmount(this);
        if (!amount) { alert('Enter a positive amount to apply.'); return; }
        const name = characters[idx]?.name || 'Target';
        if (input) input.value = '';
        applyHpDelta(idx, -amount, {
          source: 'precision-adjust',
          history: `Damage ${amount} for ${name}`,
          extraDetails: 'Precision damage'
        });
      });
    });
    document.querySelectorAll('.precision-heal').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = +this.dataset.index;
        const { amount, input } = readPrecisionAmount(this);
        if (!amount) { alert('Enter a positive amount to apply.'); return; }
        const name = characters[idx]?.name || 'Target';
        if (input) input.value = '';
        applyHpDelta(idx, amount, {
          source: 'precision-adjust',
          history: `Heal ${amount} for ${name}`,
          extraDetails: 'Precision heal'
        });
      });
    });
    document.querySelectorAll('.temphp-btn').forEach(btn=>{
      btn.addEventListener('click', function(){
        const idx = +this.dataset.index;
        const d  = +this.dataset.delta;
        const c  = characters[idx];
        const beforeTHP = c.tempHP || 0;
        pushHistory(`TempHP ${d>=0?'+':''}${d} for ${c.name}`);
        c.tempHP = Math.max(0, (c.tempHP||0) + d);
        const afterTHP = c.tempHP || 0;
        if (beforeTHP !== afterTHP) {
          logHpChange(c, {
            type: 'temp',
            summary: `Temp HP ${afterTHP - beforeTHP >= 0 ? '+' : ''}${afterTHP - beforeTHP}`,
            hpBefore: c.currentHP,
            hpAfter: c.currentHP,
            thpBefore: beforeTHP,
            thpAfter: afterTHP,
            source: 'temp-hp'
          });
        }
        buildTable();
      });
    });
    function updateDeathState(c) {
      // cap and derive "stable" at 3 successes, no auto-death to keep it GM-controlled
      c.deathSaves.s = Math.min(3, Math.max(0, c.deathSaves.s|0));
      c.deathSaves.f = Math.min(3, Math.max(0, c.deathSaves.f|0));
      if (c.deathSaves.s >= 3) { c.deathSaves.stable = true; }
    }
    document.querySelectorAll('.ds-add').forEach(btn=>{
    btn.addEventListener('click', function(){
    const idx = +this.dataset.index;
    const kind = this.dataset.kind; // 's' or 'f'
    const c = characters[idx];
    const isDowned = (c.maxHP > 0 && c.currentHP <= 0);
      if (!isDowned) return; // only when actually downed
        const prevDS = { ...c.deathSaves };
        pushHistory(`Death Save +${kind.toUpperCase()} for ${c.name}`);
        if (kind === 's') c.deathSaves.s = Math.min(3, (c.deathSaves.s||0) + 1);
        else c.deathSaves.f = Math.min(3, (c.deathSaves.f||0) + 1);
        updateDeathState(c);
        logEvent({
          type: 'death-save',
          summary: kind === 's' ? '+ Success' : '+ Failure',
          targetId: c.id,
          targetName: c.name,
          source: 'death-save',
          details: `S:${c.deathSaves.s} • F:${c.deathSaves.f}${c.deathSaves.stable ? ' • Stable' : ''}`,
          deathSaves: { ...c.deathSaves }
        });
        if (!prevDS.stable && c.deathSaves.stable) {
          logEvent({
            type: 'death-save',
            summary: 'Stabilized',
            targetId: c.id,
            targetName: c.name,
            source: 'death-save',
            details: 'Reached 3 successes (Stable)',
            deathSaves: { ...c.deathSaves }
          });
        }
        buildTable();
      });
    });
    document.querySelectorAll('.ds-reset').forEach(btn=>{
      btn.addEventListener('click', function(){
        const idx = +this.dataset.index;
        const c = characters[idx];
        pushHistory(`Death Saves reset for ${c.name}`);
        c.deathSaves = { s:0, f:0, stable:false };
        logEvent({
          type: 'death-save',
          summary: 'Death Saves Reset',
          targetId: c.id,
          targetName: c.name,
          source: 'death-save',
          details: 'Cleared successes and failures',
          deathSaves: { ...c.deathSaves }
        });
        buildTable();
      });
    });
        // Name inline edit — now re-attached each render
    document.querySelectorAll('.name-input').forEach(inp => {
      const idx = +inp.dataset.index;
      let original = inp.value;
      const commit = () => {
        const v = (inp.value || '').trim();
        if (v && v !== characters[idx].name) {
          pushHistory(`Rename ${characters[idx].name} → ${v}`);
          characters[idx].name = v;
          buildTable();
        } else {
          inp.value = characters[idx].name;
        }
      };
      inp.addEventListener('focus', () => original = inp.value);
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { inp.value = original; inp.blur(); }
      });
      inp.addEventListener('blur', commit);
    });
    document.querySelectorAll('.health-input').forEach(inp=>{
      let pushed = false;
      inp.addEventListener('focus', function(){
        pushed = false;
        this.dataset._orig = this.value;
      });
      inp.addEventListener('blur', function(){
        const idx = +this.dataset.index;
        const newHP = Math.max(0, parseInt(this.value, 10) || 0); 
        const oldHP = characters[idx].currentHP;
        const beforeTHP = characters[idx].tempHP || 0;
        if (!pushed && newHP !== oldHP) pushHistory(`HP set for ${characters[idx].name}`);
        if (newHP < oldHP) {
          characters[idx].concDamagePending = (characters[idx].concDamagePending || 0) + (oldHP - newHP);
        } else if (newHP > 0) {
          // Healing resets DS
          characters[idx].deathSaves = { s:0, f:0, stable:false };
        }
        characters[idx].currentHP = newHP;
        elevateMaxHp(characters[idx]); 
        if (newHP !== oldHP) {
          const details = [];
          if (oldHP > 0 && newHP <= 0) details.push('Dropped to 0 HP');
          if (oldHP <= 0 && newHP > 0) details.push('Back above 0 HP (death saves reset)');
          logHpChange(characters[idx], {
            type: newHP < oldHP ? 'damage' : 'heal',
            summary: newHP < oldHP ? `Damage ${oldHP - newHP}` : `Heal ${newHP - oldHP}`,
            hpBefore: oldHP,
            hpAfter: newHP,
            thpBefore: beforeTHP,
            thpAfter: beforeTHP,
            source: 'manual-input',
            details: details.join(' • ') || undefined,
            deathSaves: (oldHP <= 0 && newHP > 0) ? { ...characters[idx].deathSaves } : undefined
          });
        }
        buildTable();
      });
      inp.addEventListener('input', function(){
        // live typing: do nothing heavy; final commit happens on blur
      });
    });
    // Initiative commit (Enter / blur)
        document.querySelectorAll('.init-input[data-commit="init"]').forEach(inp=>{
      let original = inp.value;

      const commit = ()=>{
        const id = inp.dataset.id;
        const newVal = parseInt(inp.value, 10) || 0;

        const char = characters.find(ch => ch.id === id);
        if (!char) {
          inp.value = original;
          return;
        }

        if (char.initiative !== newVal) {
          pushHistory(`Set initiative for ${char.name}`);
          char.initiative = newVal;
          maybeSortByInitiative();
          buildTable();
        }
      };
      inp.addEventListener('keydown', e=>{
        if (e.key === 'Enter'){ e.preventDefault(); commit(); }
        if (e.key === 'Escape'){ inp.value = original; inp.blur(); }
      });
      inp.addEventListener('focus', ()=> original = inp.value);
      inp.addEventListener('blur', commit);
    });
    // Notes modal open
    document.querySelectorAll('.notes-btn').forEach(btn=>{
      btn.addEventListener('click', function(){
        modalCharacterIndex = +this.dataset.index;
        const c = characters[modalCharacterIndex];
        $('notesModalLabel').textContent = `Notes — ${c.name}`;
        $('notes-text').value = c.notes || '';
        if (notesModal) {
          notesModal.show();
        } else {
          const modalEl = document.getElementById('notesModal');
          const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
          modal.show();
        }
                });
              });
              $('notes-save-btn').onclick = ()=>{
                if (modalCharacterIndex==null) return;
                characters[modalCharacterIndex].notes = $('notes-text').value;
                modalCharacterIndex = null;
                if (notesModal) {
          notesModal.hide();
        } else {
          const modalEl = document.getElementById('notesModal');
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal?.hide();
        }
      if (autoSaveEnabled) saveState();
    };
    // Concentration toggle
    document.querySelectorAll('.conc-btn').forEach(btn=>{
      btn.addEventListener('click', function(){
        const idx = +this.dataset.index;
        pushHistory(`Toggle Concentration for ${characters[idx].name}`);
        characters[idx].concentration = !characters[idx].concentration;
        logEvent({
          type: 'concentration',
          summary: characters[idx].concentration ? 'Concentration On' : 'Concentration Off',
          targetId: characters[idx].id,
          targetName: characters[idx].name,
          source: 'concentration',
          concentration: characters[idx].concentration ? 'Maintaining concentration' : 'Concentration dropped'
        });
        buildTable();
      });
    });
    // Status Modal open
    document.querySelectorAll('.status-btn').forEach(btn=>{
      btn.addEventListener('click', function(){
        modalCharacterIndex = +this.dataset.index;
        openStatusModal(modalCharacterIndex);
      });
    });
        // Duplicate/Delete
    document.querySelectorAll('.duplicate-btn').forEach(btn=>{
      btn.addEventListener('click', function(){
        const idx = +this.dataset.index;
        const src = characters[idx];
        if (!src) return;

        pushHistory(`Duplicate ${src.name}`);

        // Deep clone to avoid shared nested objects
        const copy = JSON.parse(JSON.stringify(src));

        // NEW: give the duplicate a *new* ID so it is never confused with the original
        copy.id = createCharId();

        // NEW: give it a clean name like "Goblin 2", "Goblin 3", etc.
        const base = baseNameOf(src.name || 'Unnamed');
        copy.name = nextNumberedName(base);

        // Optional but sensible: reset per-creature transient stuff
        copy.concDamagePending = 0;
        copy.deathSaves = { s: 0, f: 0, stable: false };

        characters.splice(idx + 1, 0, normalizeChar(copy));
        buildTable();
      });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = +this.dataset.index;
      pushHistory(`Delete ${characters[idx].name}`);
    
      const deletingActive = (idx === currentTurn);
    
      characters.splice(idx, 1);
    
      if (!characters.length) {
        currentTurn = 0;
        combatRound = 1;
      } else if (deletingActive) {
        // keep pointer on "next" creature, or wrap
        if (currentTurn >= characters.length) currentTurn = 0;
      } else if (idx < currentTurn) {
        // list shrank before the active index
        currentTurn = Math.max(0, currentTurn - 1);
      }
    
      buildTable();
    });
  });
    
    // Mobile move
    document.querySelectorAll('.move-up').forEach(btn => {
      btn.addEventListener('click', function () {
        const i = +this.dataset.index;
        if (i <= 0) return;
      
        pushHistory('Reorder (up)');
      
        [characters[i - 1], characters[i]] = [characters[i], characters[i - 1]];
      
        // Adjust active index
        if (currentTurn === i) {
          currentTurn = i - 1;
        } else if (currentTurn === i - 1) {
          currentTurn = i;
        }
      
        buildTable();
      });
    });
    document.querySelectorAll('.move-down').forEach(btn => {
      btn.addEventListener('click', function () {
        const i = +this.dataset.index;
        if (i >= characters.length - 1) return;
      
        pushHistory('Reorder (down)');
      
        [characters[i + 1], characters[i]] = [characters[i], characters[i + 1]];
      
        // Adjust active index
        if (currentTurn === i) {
          currentTurn = i + 1;
        } else if (currentTurn === i + 1) {
          currentTurn = i;
        }
      
        buildTable();
      });
    });
    
    // Sortable (desktop) — init once, reuse
    if (!sortableInstance) {
      const tbodyEl = $('initiative-order');
      if (tbodyEl) {
        sortableInstance = new Sortable(tbodyEl, {
          handle: '.drag-handle',
          animation: 150,
          onEnd: function (evt) {
            pushHistory('Reorder (drag)');
          
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;
          
            const [moved] = characters.splice(oldIndex, 1);
            characters.splice(newIndex, 0, moved);
          
            // Keep active creature with its row
            if (currentTurn === oldIndex) {
              currentTurn = newIndex;
            } else if (oldIndex < newIndex) {
              // moved down; everything between shifts up one
              if (currentTurn > oldIndex && currentTurn <= newIndex) currentTurn--;
            } else if (oldIndex > newIndex) {
              // moved up; everything between shifts down one
              if (currentTurn >= newIndex && currentTurn < oldIndex) currentTurn++;
            }
          
            buildTable();
          }
        });
      }
    } else {
      // keep disabled state in sync with "Lock Order"
      sortableInstance.option('disabled', $('lockOrderToggle')?.checked === true);
    }
    buildDiceHistory();
    buildCombatLog();
    if (autoSaveEnabled) saveState();
  }
  // First-visit helper: show the Help panel once
  if (!localStorage.getItem('initiativeHelpSeen')) {
    const el = $('helpCanvas');
    if (el) bootstrap.Offcanvas.getOrCreateInstance(el).show();
    localStorage.setItem('initiativeHelpSeen', '1');
  }
  // ---------- Status Modal logic ----------
  function openStatusModal(i){
    const c = characters[i];
    // Badges
    const badges = $('status-badges'); badges.innerHTML = '';
    c.status.forEach(s=>{
      const rem = (typeof s.remaining==='number' && s.remaining>=0) ? ` (${s.remaining})` : '';
      const span = document.createElement('span');
      span.className = 'badge bg-secondary px-2 py-1';
      span.innerHTML = `${s.icon} ${s.name}${rem}
        <i class="bi bi-x ms-1 remove-status" data-eff="${s.name}" role="button" title="Remove"></i>`;
      badges.appendChild(span);
    });
    badges.querySelectorAll('.remove-status').forEach(x=>{
    x.addEventListener('click', function(){
      const eff = this.dataset.eff;
      pushHistory(`Remove ${eff} from ${c.name}`);
      c.status = c.status.filter(ss => ss.name !== eff);
      logEvent({
        type: 'status-remove',
        summary: `Removed ${eff}`,
        targetId: c.id,
        targetName: c.name,
        source: 'status-modal',
        statusPayload: `Removed ${eff}`
      });
      buildTable();
      openStatusModal(i);
    });
  });
    // Dropdown
    const list = $('status-dropdown-list'); list.innerHTML = '';
    statusEffects.forEach(effect=>{
      const has = c.status.some(s=> s.name === effect.name);
      const li = document.createElement('li');
      li.innerHTML = `<a class="dropdown-item ${has?'disabled text-muted':''}" href="#" data-eff="${effect.name}">${effect.icon} ${effect.name}</a>`;
      list.appendChild(li);
    });
    let pendingEffect = null;
    list.querySelectorAll('a[data-eff]').forEach(a=>{
      a.addEventListener('click', function(e){
        e.preventDefault();
        if (this.classList.contains('disabled')) return;
        pendingEffect = this.dataset.eff;
      });
    });
    $('add-status-btn').onclick = function(){
      if (!pendingEffect) { alert('Choose an effect first.'); return; }
      const durVal = parseInt($('status-duration').value,10);
      const base = statusEffects.find(x=>x.name===pendingEffect) || {icon:'❓'};
      const eff = { name: pendingEffect, icon: base.icon };
      if (!isNaN(durVal) && durVal >= 0) eff.remaining = durVal;
      pushHistory(`Add ${pendingEffect} to ${c.name}`);
      c.status.push(eff);
      logEvent({
        type: 'status-add',
        summary: `Added ${pendingEffect}`,
        targetId: c.id,
        targetName: c.name,
        source: 'status-modal',
        statusPayload: `Added ${pendingEffect}${typeof eff.remaining === 'number' ? ` (${eff.remaining} rnds)` : ''}`
      });
      $('status-duration').value = '';
      // keep modal open
      statusModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('statusModal'));
      statusModal.show();
      buildTable();
    };
    
    
    const modalEl = document.getElementById('statusModal');
      if (!modalEl) {
        console.error('Status modal element missing');
        return;
      }
      statusModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      statusModal.show();
  }
  // ---------- Round & durations ----------
  function tickStatusDurationsOnNewRound(){
    characters.forEach(c=>{
      const nextStatuses = [];
      (c.status || []).forEach(s => {
        if (typeof s.remaining === 'number') {
          const nextRemaining = s.remaining - 1;
          if (nextRemaining <= 0) {
            logEvent({
              type: 'status-expire',
              summary: `${s.name} expired`,
              targetId: c.id,
              targetName: c.name,
              source: 'status-auto',
              statusPayload: `${s.name} expired`
            });
          } else {
            nextStatuses.push({ ...s, remaining: nextRemaining });
          }
        } else {
          nextStatuses.push(s);
        }
      });
      c.status = nextStatuses;
    });
  }
  function queueConcentrationCheck(idx){
    if (idx == null) return;
    const c = characters[idx];
    if (!c) return;
    const dmg = c.concDamagePending || 0;
    if (!c.concentration || dmg <= 0) return;
    const dc = Math.max(10, Math.floor(dmg / 2));
    enqueueConcentrationPrompt(idx, dmg, dc);
    c.concDamagePending = 0;
  }

  function handleEndOfTurnConcentration(primaryIdx = currentTurn) {
    const seen = new Set();
    const tryQueue = idx => {
      if (idx == null || seen.has(idx)) return;
      seen.add(idx);
      queueConcentrationCheck(idx);
    };
    tryQueue(primaryIdx);
    characters.forEach((_, idx) => tryQueue(idx));
  }
  // ---------- Controls ----------
    $('initiative-form').addEventListener('submit', e=>{
    e.preventDefault();
    const name  = $('character-name').value.trim();
    const safeNum = v => {
      const n = parseInt(String(v).trim(), 10);
      return isNaN(n) ? 0 : n;
    };
  
    const init  = safeNum($('initiative-roll').value);
    const maxHP = safeNum($('character-health').value);
    const ac    = safeNum($('character-ac').value);
    const type  = $('character-type').value;
  
    if (!name) return;
  
    const rawChar = {
      id: createCharId(), 
      name,
      type,
      initiative: init,
      currentHP: maxHP,
      maxHP,
      tempHP: 0,
      notes: '',
      ac,
      status: [],
      concentration: false,
      deathSaves: { s:0, f:0, stable:false },
      concDamagePending: 0
    };
  
    characters.push(normalizeChar(rawChar));
    elevateMaxHp(characters[characters.length - 1]);
  
    maybeSortByInitiative();
    e.target.reset();
    buildTable();
  });
  $('next-turn').addEventListener('click', ()=>{
    if (!characters.length) return;
    const len = characters.length;
    const endingIdx = currentTurn;
    handleEndOfTurnConcentration(endingIdx);
    let attempts = 0;
    do{
      currentTurn = (currentTurn + 1) % len;
      if (currentTurn === 0) {
        combatRound++;
        tickStatusDurationsOnNewRound();
      }
      attempts++;
    } while ((characters[currentTurn].maxHP > 0 && characters[currentTurn].currentHP <= 0) && attempts < len);
  
    buildTable();  
  });
  $('reset-turns').addEventListener('click', ()=>{ currentTurn=0; combatRound=1; buildTable(); });
  $('clear-all').addEventListener('click', ()=>{ characters=[]; currentTurn=0; combatRound=1; combatLog = []; buildTable(); });
  $('clear-storage').addEventListener('click', () => {
    if (!confirm('Clear ALL saved data for the Initiative Tracker (sessions, templates, notes)?')) return;
    // Main auto-save state
    localStorage.removeItem('initiativeTrackerData');
    // Session notes
    localStorage.removeItem('sessionNotes');
    // Saved character templates
    localStorage.removeItem(TKEY); // TKEY === 'savedCharacters'
    // Manual session snapshots
    Object.keys(localStorage)
      .filter(k => k.startsWith('initiativeTrackerData_'))
      .forEach(k => localStorage.removeItem(k));
    // Optional: clear any pending Encounter Builder handoffs
    localStorage.removeItem('dmtools.pendingImport');
    characters = [];
    currentTurn = 0;
    combatRound = 1;
    combatLog = [];
    buildSavedUI();
    buildTable();
    alert('All Initiative Tracker data cleared.');
  });
  $('undo-btn').addEventListener('click', undoLast);

  // ---------- Bulk HP Adjustment ----------
  let bulkHPModal = null;
  const bulkHPModalEl = document.getElementById('bulkHPModal');
  if (bulkHPModalEl) bulkHPModal = bootstrap.Modal.getOrCreateInstance(bulkHPModalEl);

  $('bulk-hp-btn').addEventListener('click', ()=>{
    if (!bulkHPModal) return;

    // Update counts
    const pcCount = characters.filter(c => c.type === 'PC').length;
    const enemyCount = characters.filter(c => c.type === 'Enemy').length;
    const allCount = characters.length;

    $('bulkPCCount').textContent = `(${pcCount})`;
    $('bulkEnemyCount').textContent = `(${enemyCount})`;
    $('bulkAllCount').textContent = `(${allCount})`;

    bulkHPModal.show();
  });

  // Toggle amount input visibility based on action
  document.querySelectorAll('input[name="bulkAction"]').forEach(radio => {
    radio.addEventListener('change', ()=>{
      const amountSection = $('bulkAmountSection');
      const action = document.querySelector('input[name="bulkAction"]:checked').value;
      amountSection.style.display = (action === 'fullheal') ? 'none' : 'block';
    });
  });

  $('bulkHPApply').addEventListener('click', ()=>{
    const targetType = document.querySelector('input[name="bulkTarget"]:checked').value;
    const action = document.querySelector('input[name="bulkAction"]:checked').value;
    const amount = parseInt($('bulkAmount').value, 10) || 0;

    if (action !== 'fullheal' && amount <= 0) {
      alert('Please enter a valid HP amount.');
      return;
    }

    // Filter targets
    let targets = [];
    if (targetType === 'PC') {
      targets = characters.filter(c => c.type === 'PC');
    } else if (targetType === 'Enemy') {
      targets = characters.filter(c => c.type === 'Enemy');
    } else {
      targets = characters;
    }

    if (targets.length === 0) {
      alert('No characters match the selected filter.');
      return;
    }

    // Create single undo point
    const targetNames = targets.map(c => c.name).join(', ');
    const actionDesc = action === 'fullheal' ? 'Full Heal' : action === 'heal' ? `Heal +${amount}` : `Damage -${amount}`;
    pushHistory(`Bulk ${actionDesc} → ${targetNames}`);

    // Apply to all targets
    targets.forEach(c => {
      const beforeHP = c.currentHP;
      const beforeTHP = c.tempHP || 0;
      if (action === 'fullheal') {
        c.currentHP = c.maxHP;
        if (c.currentHP > 0) c.deathSaves = { s:0, f:0, stable:false };
      } else if (action === 'heal') {
        const oldHP = c.currentHP;
        c.currentHP = Math.min(c.maxHP, c.currentHP + amount);
        if (c.currentHP > 0) c.deathSaves = { s:0, f:0, stable:false };
      } else if (action === 'damage') {
        // Damage: consume temp HP first
        let dmg = amount;
        const usedThp = Math.min(c.tempHP || 0, dmg);
        c.tempHP = (c.tempHP || 0) - usedThp;
        dmg -= usedThp;
        if (dmg > 0) {
          const oldHP = c.currentHP;
          c.currentHP = Math.max(0, c.currentHP - dmg);
          const taken = oldHP - c.currentHP;
          c.concDamagePending = (c.concDamagePending || 0) + taken;
        }
      }

      const afterHP = c.currentHP;
      const afterTHP = c.tempHP || 0;
      if (beforeHP !== afterHP || beforeTHP !== afterTHP) {
        const summary = action === 'fullheal'
          ? 'Bulk Full Heal'
          : action === 'heal'
            ? `Bulk Heal +${amount}`
            : `Bulk Damage ${amount}`;
        const detailBits = [`Target filter: ${targetType}`];
        if (beforeHP > 0 && afterHP <= 0) detailBits.push('Dropped to 0 HP');
        if (beforeHP <= 0 && afterHP > 0) detailBits.push('Back above 0 HP (death saves reset)');
        logHpChange(c, {
          type: action === 'damage' ? 'damage' : 'heal',
          summary,
          hpBefore: beforeHP,
          hpAfter: afterHP,
          thpBefore: beforeTHP,
          thpAfter: afterTHP,
          source: 'bulk-hp',
          details: detailBits.join(' • '),
          deathSaves: (beforeHP <= 0 && afterHP > 0) ? { ...c.deathSaves } : undefined
        });
      }
    });

    buildTable();
    bulkHPModal.hide();
  });

  $('manualSaveBtn').addEventListener('click', ()=>{ saveState(true); alert('Manual save complete.'); });
  $('autoSaveToggle').addEventListener('change', e=>{ autoSaveEnabled = e.target.checked; });
  $('lockOrderToggle').addEventListener('change', e=>{
    if (sortableInstance) sortableInstance.option('disabled', e.target.checked);
  });
  $('playerViewToggle').addEventListener('change', e => {
    playerView = e.target.checked;
    document.body.classList.toggle('player-view', playerView);
  });
  $('copyOrderBtn').addEventListener('click', ()=>{
    const out = characters.map((c,i)=> `${i+1}. ${c.name} (${c.type}) — Init ${c.initiative}`).join('\n');
    if (!out) return;
    navigator.clipboard.writeText(out);
  });
  function updateSaveHistory(){
    const sel = $('saveHistorySelect');
    sel.innerHTML = '<option disabled selected>Load Previous Save</option>';
    Object.keys(localStorage)
      .filter(k=>k.startsWith('initiativeTrackerData_'))
      .sort().reverse()
      .forEach(key=>{
        const t = key.replace('initiativeTrackerData_','');
        const opt = document.createElement('option');
        opt.value = key; opt.textContent = new Date(t).toLocaleString();
        sel.appendChild(opt);
      });
  }
  $('saveHistorySelect').addEventListener('change', function(){
    const raw = localStorage.getItem(this.value); if(!raw) return;
    try{
      const data = JSON.parse(raw);
      characters = (data.characters||[]).map(normalizeChar);
      currentTurn = data.currentTurn||0;
      combatRound = data.combatRound||1;
      diceHistory = Array.isArray(data.diceHistory) ? data.diceHistory : [];
      combatLog = Array.isArray(data.combatLog) ? data.combatLog.slice(-COMBAT_LOG_LIMIT) : [];
      buildTable();
    }catch(e){ alert('Failed to load that save.'); }
  });
  // Export/Import session
  $('export-btn').addEventListener('click', ()=>{
    const payload = {
      characters,
      currentTurn,
      combatRound,
      diceHistory,
      combatLog,
      savedTemplates: getSaved()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`initiativeTracker_${new Date().toISOString()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  $('import-btn').addEventListener('click', ()=> $('import-file').click());
  $('import-file').addEventListener('change', function(){
    const f = this.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = e=>{
      try{
        const d = JSON.parse(e.target.result);
        characters = (d.characters||[]).map(normalizeChar);
        currentTurn = d.currentTurn||0;
        combatRound = d.combatRound||1;
        diceHistory = Array.isArray(d.diceHistory) ? d.diceHistory : [];
        combatLog = Array.isArray(d.combatLog) ? d.combatLog.slice(-COMBAT_LOG_LIMIT) : [];
        if (Array.isArray(d.savedTemplates)) {
          setSaved(d.savedTemplates.slice(0, MAX_SAVED));
          buildSavedUI();
        }
        buildTable(); alert('Session imported successfully.');
      }catch(err){ alert('Failed to import session. Invalid file.'); }
    };
    r.readAsText(f); this.value='';
  });
  $('export-log-json')?.addEventListener('click', () => {
    if (!combatLog.length) { alert('Combat log is empty.'); return; }
    const blob = new Blob([JSON.stringify(combatLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combat-log_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  $('export-log-text')?.addEventListener('click', () => {
    if (!combatLog.length) { alert('Combat log is empty.'); return; }
    const lines = combatLog.map(entry => {
      const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '';
      const turnNum = Number.isFinite(entry.turnIndex) ? entry.turnIndex + 1 : '—';
      const hpText = (entry.hpBefore != null && entry.hpAfter != null) ? `HP ${entry.hpBefore}→${entry.hpAfter}` : '';
      const thpText = (entry.thpBefore != null && entry.thpAfter != null) ? `THP ${entry.thpBefore}→${entry.thpAfter}` : '';
      const detailText = [entry.details, entry.statusPayload, entry.deathSaves ? `Deathsaves S:${entry.deathSaves.s}/F:${entry.deathSaves.f}${entry.deathSaves.stable ? ' stable' : ''}` : '', entry.concentration].filter(Boolean).join(' | ');
      const sources = (entry.sources || []).map(formatSourceLabel).join(', ');
      return `[${time}] Round ${entry.round ?? '—'} | Turn ${entry.turnName || '—'} (#${turnNum}) | ${entry.summary} → Target: ${entry.targetName || '—'} | ${hpText} ${thpText} | ${detailText || 'No extra details'} | Source: ${sources || 'Manual'}`.replace(/\s+/g, ' ').trim();
    }).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combat-log_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  // Keyboard shortcuts (not when typing)
  document.addEventListener('keydown', e=>{
    const tag = document.activeElement?.tagName || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key==='n') $('next-turn').click();
    else if (e.key==='r') $('reset-turns').click();
    else if (e.key==='c') $('copyOrderBtn').click();
    else if (e.key==='s') $('manualSaveBtn').click();
    else if (e.key==='l') $('lockOrderToggle').click();
  });
  // Boot
  loadState();               // 1) restore whatever was there
  tryRehydrateFromBuilder(); // 2) append / replace from other pages as needed
  updateSaveHistory();
  buildSavedUI();
  buildTable();
  window.addEventListener('beforeunload', ()=>{ if (autoSaveEnabled) saveState(); });
  // Cross-tab sync: when another tab updates localStorage, reload state here
  window.addEventListener('storage', (e) => {
    // Only care about the main auto-save key
    if (e.key === 'initiativeTrackerData') {
      try {
        loadState();
        buildTable();
      } catch (err) {
        console.error('Failed to sync state from storage event:', err);
      }
    }
  });
})();
/* ---------- RENDERER ---------- */
(function initRulesModal(){
  const catList   = document.getElementById('rulesCategories');
  const container = document.getElementById('rulesContainer');
  const emptyMsg  = document.getElementById('rulesEmpty');
  const searchInp = document.getElementById('rulesSearch');
  if (!catList || !container) return;
    let activeCat = RULES_DATA[0]?.cat ?? null;
    let search    = '';
    function renderCategories(){
      catList.innerHTML = '';
      RULES_DATA.forEach(({cat})=>{
        const a = document.createElement('button');
        a.type = 'button';
        a.className = 'list-group-item list-group-item-action';
        if (cat === activeCat) a.classList.add('active');
        a.textContent = cat;
        a.onclick = () => { activeCat = cat; render(); };
        catList.appendChild(a);
      });
    }

    function render(){
      renderCategories();
      container.innerHTML = '';
      const data = RULES_DATA.find(x => x.cat === activeCat);
      if (!data){ emptyMsg.classList.remove('d-none'); return; }

      let items = data.items;
      if (search.trim()){
        const q = search.trim().toLowerCase();
        items = items.filter(it =>
          it.title.toLowerCase().includes(q) ||
          (it.body && it.body.toLowerCase().includes(q)) ||
          (it.tags && it.tags.join(' ').toLowerCase().includes(q))
        );
      }

      emptyMsg.classList.toggle('d-none', items.length !== 0);

      items.forEach((it, i)=>{
        const item = document.createElement('div');
        item.className = 'accordion-item';
        item.innerHTML = `
          <h2 class="accordion-header" id="rhead-${i}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#rcoll-${i}">
              ${it.title}
            </button>
          </h2>
          <div id="rcoll-${i}" class="accordion-collapse collapse" data-bs-parent="#rulesContainer">
            <div class="accordion-body">
              <div class="mb-2">${(it.body||'').trim().replace(/\n\s*\n/g,'<br><br>')}</div>
              ${it.tags?.length ? `<div class="d-flex gap-1 flex-wrap">${it.tags.map(t=>`<span class="badge bg-secondary">${t}</span>`).join('')}</div>` : ''}
            </div>
          </div>`;
        container.appendChild(item);
      });
    }

    searchInp?.addEventListener('input', e => { search = e.target.value; render(); });

    // Ensure first render whenever the modal is opened
    document.getElementById('rulesModal')?.addEventListener('shown.bs.modal', () => {
      if (!activeCat) activeCat = RULES_DATA[0]?.cat ?? null;
      search = '';
      if (searchInp) searchInp.value = '';
      render();
    });
  })();

  /* ---------- SPELLS UI (grouped by first letter) ---------- */
  (function initSpellsModalGrouped(){
    const pane = document.getElementById('spells-pane');
    if (!pane) return;

    // Build UI shell
    pane.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-md-3">
          <input id="spellsSearch" class="form-control form-control-sm mb-2" placeholder="Search name, class, or text…" />
          <select id="spellsLevel" class="form-select form-select-sm mb-2">
            <option value="">All Levels</option>
            ${[...Array(10).keys()].map(i => `<option value="${i}">${i===0?'Cantrip':i}</option>`).join('')}
          </select>
          <select id="spellsClass" class="form-select form-select-sm mb-2">
            <option value="">All Classes</option>
            ${["Artificer","Bard","Cleric","Druid","Paladin","Ranger","Sorcerer","Warlock","Wizard"].map(c=>`<option>${c}</option>`).join('')}
          </select>
          <select id="spellsSchool" class="form-select form-select-sm mb-2">
            <option value="">All Schools</option>
            ${["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation"].map(s=>`<option>${s}</option>`).join('')}
          </select>
          <select id="spellsConc" class="form-select form-select-sm">
            <option value="">Conc: Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div class="col-12 col-md-9">
          <div id="spellsLetters" class="accordion"></div>
          <div id="spellsEmpty" class="text-secondary small d-none">No spells found.</div>
        </div>
      </div>
    `;

    const searchInp = document.getElementById('spellsSearch');
    const levelSel  = document.getElementById('spellsLevel');
    const classSel  = document.getElementById('spellsClass');
    const schoolSel = document.getElementById('spellsSchool');
    const concSel   = document.getElementById('spellsConc');
    const lettersContainer = document.getElementById('spellsLetters');
    const emptyMsg  = document.getElementById('spellsEmpty');

    function matchesFilters(sp) {
      const q = (searchInp.value||"").trim().toLowerCase();
      const lv = levelSel.value;
      const cc = classSel.value;
      const sc = schoolSel.value;
      const co = concSel.value;

      if (lv && String(sp.level) !== lv) return false;
      if (cc && !(sp.classes||[]).includes(cc)) return false;
      if (sc && sp.school !== sc) return false;
      if (co !== '' && String(sp.concentration) !== co) return false;

      if (q) {
        const hay = [
          sp.title,
          ...(sp.aliases||[]),
          sp.school,
          (sp.classes||[]).join(' '),
          (sp.tags||[]).join(' '),
          sp.body
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }

    function renderGrouped() {
      const filtered = SPELLS_DATA.filter(matchesFilters);
      if (filtered.length === 0) {
        lettersContainer.innerHTML = '';
        emptyMsg.classList.remove('d-none');
        return;
      }
      emptyMsg.classList.add('d-none');

      // group by first letter
      const groups = {};
      filtered.forEach(sp=>{
        const letter = sp.title[0].toUpperCase();
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(sp);
      });

      const letters = Object.keys(groups).sort();
      lettersContainer.innerHTML = '';

      letters.forEach((ltr, idx)=>{
        const innerId = `spellsInner-${idx}`;
        const letterItem = document.createElement('div');
        letterItem.className = 'accordion-item';
        letterItem.innerHTML = `
          <h2 class="accordion-header">
            <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#letter-${idx}">
              ${ltr} Spells (${groups[ltr].length})
            </button>
          </h2>
          <div id="letter-${idx}" class="accordion-collapse collapse" data-bs-parent="#spellsLetters">
            <div class="accordion-body p-0">
              <div class="accordion" id="${innerId}"></div>
            </div>
          </div>
        `;
        lettersContainer.appendChild(letterItem);

        // Nested spells accordions
        const innerAcc = letterItem.querySelector(`#${innerId}`);
        groups[ltr].sort((a,b)=>a.title.localeCompare(b.title)).forEach((sp, si)=>{
          const sid = `${idx}-${si}`;
          const entry = document.createElement('div');
          entry.className = 'accordion-item';
          entry.innerHTML = `
            <h2 class="accordion-header">
              <button class="accordion-button collapsed py-1" type="button" data-bs-toggle="collapse" data-bs-target="#spell-${sid}">
                <span class="me-2"><strong>${sp.title}</strong></span>
                <span class="badge bg-secondary">${sp.level===0?'Cantrip':`Lvl ${sp.level}`} • ${sp.school}</span>
                ${sp.concentration ? `<span class="badge bg-warning text-dark ms-2">Conc.</span>`:''}
              </button>
            </h2>
            <div id="spell-${sid}" class="accordion-collapse collapse" data-bs-parent="#${innerId}">
              <div class="accordion-body small">
                <div class="text-secondary mb-2">
                  <strong>Casting:</strong> ${sp.casting_time} • 
                  <strong>Range:</strong> ${sp.range} • 
                  <strong>Comp:</strong> ${sp.components} • 
                  <strong>Duration:</strong> ${sp.duration}<br>
                  <strong>Classes:</strong> ${(sp.classes||[]).join(', ')||'—'}
                </div>
                <div>${(sp.body||'').trim().replace(/\n\s*\n/g,'<br><br>')}</div>
                ${sp.tags?.length ? `<div class="d-flex gap-1 flex-wrap mt-2">${sp.tags.map(t=>`<span class="badge bg-secondary">${t}</span>`).join('')}</div>`:''}
              </div>
            </div>
          `;
          innerAcc.appendChild(entry);
        });
      });
    }

    // wire filters
    [searchInp, levelSel, classSel, schoolSel, concSel].forEach(el=>el?.addEventListener('input', renderGrouped));
    document.getElementById('spells-tab')?.addEventListener('shown.bs.tab', renderGrouped);
  })();
