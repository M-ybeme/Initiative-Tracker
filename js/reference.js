'use strict';

// ── STATE ─────────────────────────────────────────────────────
const pinnedSpells      = new Map();   // title → spell object
const pinnedMonsters    = new Map();   // slug  → monster object
const pinnedRules       = new Map();   // "${cat}::${title}" → {cat, item}
let   allMonsters       = [];
let   monstersLoaded    = false;
let   usingFallbackApi  = false;
let   open5eNextUrl     = null;        // next page URL for progressive loading
let   isLoadingMore     = false;       // prevent concurrent load-more fetches
const monsterDetailCache = {};
const queryFetchCache   = new Set();   // exact query strings already fetched via look-ahead
let   searchDebounceTimer = null;      // debounce handle for look-ahead

// ── HELPERS ───────────────────────────────────────────────────
function levelLabel(n) {
  if (n === 0) return 'Cantrip';
  const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${s}-level`;
}

function modStr(score) {
  const m = Math.floor((score - 10) / 2);
  return (m >= 0 ? '+' : '') + m;
}

function crToNum(cr) {
  const s = String(cr);
  if (s === '1/8') return 0.125;
  if (s === '1/4') return 0.25;
  if (s === '1/2') return 0.5;
  return parseFloat(s) || 0;
}

function fetchWithTimeout(url, ms = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

// Keep the most content-rich entry when names collide across sources
function deduplicateMonsters(incoming, existing = []) {
  const byName = new Map();
  for (const m of existing)  byName.set(m.name.toLowerCase(), m);
  for (const m of incoming) {
    const key  = m.name.toLowerCase();
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, m);
    } else {
      const score = x => (x.actions?.length || 0) + (x.special_abilities?.length || 0);
      if (score(m) > score(prev)) byName.set(key, m);
    }
  }
  return [...byName.values()];
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  });
}

// ── SPELL FUNCTIONS ────────────────────────────────────────────
function getFilteredSpells() {
  const q      = (document.getElementById('spellSearch')?.value  || '').toLowerCase();
  const lvl    =  document.getElementById('spellLevel')?.value;
  const cls    =  document.getElementById('spellClass')?.value   || '';
  const school =  document.getElementById('spellSchool')?.value  || '';
  const conc   =  document.getElementById('spellConc')?.value    || '';
  const ritual =  document.getElementById('spellRitual')?.value  || '';

  return (window.SPELLS_DATA || []).filter(s => {
    if (q) {
      const hay = [s.title, s.body, ...(s.classes || []), ...(s.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (lvl !== ''  && s.level !== parseInt(lvl, 10)) return false;
    if (cls         && !(s.classes || []).includes(cls)) return false;
    if (school      && s.school !== school) return false;
    if (conc === 'yes' && !s.concentration) return false;
    if (conc === 'no'  &&  s.concentration) return false;
    if (ritual === 'yes' && !s.ritual) return false;
    if (ritual === 'no'  &&  s.ritual) return false;
    return true;
  });
}

function renderSpellResults() {
  const container = document.getElementById('spellResults');
  if (!container) return;

  const spells = getFilteredSpells();
  if (!spells.length) {
    container.innerHTML = '<div class="results-empty">No spells match the current filters.</div>';
    return;
  }

  container.innerHTML = '';
  spells.forEach(spell => {
    const isPinned = pinnedSpells.has(spell.title);
    const row = document.createElement('div');
    row.className = 'ref-result-row' + (isPinned ? ' is-pinned' : '');

    const lvlBadge = spell.level === 0
      ? '<span class="badge bg-secondary me-1">Cantrip</span>'
      : `<span class="badge bg-dark border border-secondary me-1">Lvl ${spell.level}</span>`;

    const classes = (spell.classes || []).map(c => c.substring(0, 3)).join(', ');

    row.innerHTML = `
      <span class="flex-grow-1 fw-medium">${spell.title}</span>
      ${lvlBadge}
      <span class="text-muted small">${spell.school || ''}</span>
      <span class="text-muted small d-none d-sm-inline">&nbsp;&middot;&nbsp;${classes}</span>
      <i class="bi bi-pin-fill pin-icon" title="Pin / Unpin"></i>
    `;
    row.addEventListener('click', () => togglePinSpell(spell));
    container.appendChild(row);
  });
}

function togglePinSpell(spell) {
  if (pinnedSpells.has(spell.title)) {
    pinnedSpells.delete(spell.title);
  } else {
    pinnedSpells.set(spell.title, spell);
  }
  renderSpellResults();
  renderPinnedSpellCards();
}

function renderPinnedSpellCards() {
  const grid      = document.getElementById('spellCards');
  const container = document.getElementById('spellCardsContainer');
  if (!grid || !container) return;

  grid.innerHTML = '';
  pinnedSpells.forEach(spell => grid.appendChild(buildSpellCard(spell)));
  container.classList.toggle('has-cards', pinnedSpells.size > 0);
}

function buildSpellCard(spell) {
  const card = document.createElement('div');
  card.className = 'ref-card';

  const lvlSchool = spell.level === 0
    ? `Cantrip &middot; ${spell.school}`
    : `${levelLabel(spell.level)} ${spell.school}`;

  const concBadge = spell.concentration
    ? '<span class="badge bg-warning text-dark ms-1">Concentration</span>' : '';
  const ritBadge = spell.ritual
    ? '<span class="badge bg-info text-dark ms-1">Ritual</span>' : '';

  const tags = (spell.tags || [])
    .map(t => `<span class="badge bg-secondary bg-opacity-50 me-1">${t}</span>`)
    .join('');

  const accId = 'spell-acc-' + spell.title.replace(/\W+/g, '-');

  card.innerHTML = `
    <div class="ref-card-header">
      <div class="flex-grow-1">
        <div class="fw-bold">${spell.title}</div>
        <div class="small text-muted">${lvlSchool}</div>
      </div>
      ${concBadge}${ritBadge}
      <button class="btn btn-sm btn-link text-danger p-0 ms-2" title="Dismiss">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="ref-card-body">
      <div class="stat-row">
        <i class="bi bi-clock text-muted me-1"></i>${spell.casting_time || '&mdash;'}
        &nbsp;&middot;&nbsp;
        <i class="bi bi-bullseye text-muted me-1"></i>${spell.range || '&mdash;'}
        &nbsp;&middot;&nbsp;
        <i class="bi bi-hourglass-split text-muted me-1"></i>${spell.duration || '&mdash;'}
      </div>
      <div class="stat-row">
        <span class="text-muted small">Components:</span>
        <span class="small ms-1">${spell.components || '&mdash;'}</span>
      </div>
      <div class="stat-row">
        <span class="text-muted small">Classes:</span>
        <span class="small ms-1">${(spell.classes || []).join(', ')}</span>
      </div>
      <div class="accordion accordion-flush mt-2" id="${accId}">
        <div class="accordion-item bg-transparent border-0">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed px-2 py-1 bg-transparent text-light border-0 small"
              type="button" data-bs-toggle="collapse" data-bs-target="#${accId}-body">
              Description &amp; Tags
            </button>
          </h2>
          <div id="${accId}-body" class="accordion-collapse collapse">
            <div class="accordion-body px-2 pt-0 small text-secondary">
              <p>${spell.body || ''}</p>
              <div>${tags}</div>
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-secondary w-100 mt-2" data-copy-spell>
        <i class="bi bi-clipboard me-1"></i>Copy to Clipboard
      </button>
    </div>
  `;

  card.querySelector('[title="Dismiss"]').addEventListener('click', () => togglePinSpell(spell));
  card.querySelector('[data-copy-spell]').addEventListener('click', e => {
    copySpell(spell);
    const btn = e.currentTarget;
    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard me-1"></i>Copy to Clipboard'; }, 2000);
  });

  return card;
}

function copySpell(spell) {
  const lvlSchool = spell.level === 0
    ? `Cantrip ${spell.school}`
    : `${levelLabel(spell.level)} ${spell.school}`;

  const text = [
    `${spell.title.toUpperCase()} (${lvlSchool})`,
    `Casting Time: ${spell.casting_time || '—'} | Range: ${spell.range || '—'} | Duration: ${spell.duration || '—'}`,
    `Components: ${spell.components || '—'} | Concentration: ${spell.concentration ? 'Yes' : 'No'} | Ritual: ${spell.ritual ? 'Yes' : 'No'}`,
    `Classes: ${(spell.classes || []).join(', ')}`,
    '---',
    spell.body || '',
  ].join('\n');

  copyToClipboard(text);
}

function populateSpellFilters() {
  const spells = window.SPELLS_DATA || [];

  const classEl = document.getElementById('spellClass');
  if (classEl) {
    const saved = classEl.value;
    while (classEl.options.length > 1) classEl.remove(1);
    [...new Set(spells.flatMap(s => s.classes || []))].sort().forEach(c => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = c;
      classEl.appendChild(opt);
    });
    classEl.value = saved;
  }

  const schoolEl = document.getElementById('spellSchool');
  if (schoolEl) {
    const saved = schoolEl.value;
    while (schoolEl.options.length > 1) schoolEl.remove(1);
    [...new Set(spells.map(s => s.school).filter(Boolean))].sort().forEach(s => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = s;
      schoolEl.appendChild(opt);
    });
    schoolEl.value = saved;
  }
}

function wireSpellFilters() {
  ['spellSearch', 'spellLevel', 'spellClass', 'spellSchool', 'spellConc', 'spellRitual'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  renderSpellResults);
    el.addEventListener('change', renderSpellResults);
  });
}

// ── BESTIARY FUNCTIONS ─────────────────────────────────────────
async function loadMonsterList() {
  const resultEl = document.getElementById('monsterResults');
  if (resultEl) {
    resultEl.innerHTML = '<div class="bestiary-loading"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading monsters&hellip;</div>';
  }

  try {
    const open5eUrl = 'https://api.open5e.com/monsters/?limit=500&ordering=name&format=json';
    console.log('[Bestiary] Trying Open5e:', open5eUrl);
    const t0  = performance.now();
    const res = await fetchWithTimeout(open5eUrl);
    if (!res.ok) throw new Error('Open5e responded ' + res.status);
    const data = await res.json();
    const raw      = data.results || [];
    allMonsters    = deduplicateMonsters(raw);
    allMonsters.sort((a, b) => a.name.localeCompare(b.name));
    open5eNextUrl  = data.next ? data.next.replace(/^http:\/\//, 'https://') : null;
    usingFallbackApi = false;
    console.log(`[Bestiary] Open5e OK — ${allMonsters.length} unique monsters in ${Math.round(performance.now() - t0)}ms. More pages: ${!!open5eNextUrl}`);
  } catch (err) {
    console.warn('[Bestiary] Open5e failed:', err.message, '— trying fallback dnd5eapi.co');
    try {
      const fallbackUrl = 'https://www.dnd5eapi.co/api/monsters';
      console.log('[Bestiary] Trying fallback:', fallbackUrl);
      const t0  = performance.now();
      const res = await fetchWithTimeout(fallbackUrl);
      if (!res.ok) throw new Error('Fallback responded ' + res.status);
      const data = await res.json();
      allMonsters = (data.results || []).map(m => ({
        slug: m.index,
        name: m.name,
        _fallback: true,
      }));
      open5eNextUrl  = null;
      usingFallbackApi = true;
      console.log(`[Bestiary] Fallback OK — ${allMonsters.length} monsters in ${Math.round(performance.now() - t0)}ms (CR fetched on pin)`);
    } catch (err2) {
      console.error('[Bestiary] Both APIs failed.', err2.message);
      if (resultEl) {
        resultEl.innerHTML = '<div class="results-empty text-warning"><i class="bi bi-wifi-off me-2"></i>Could not load monster list. Check your connection and try again.</div>';
      }
      return;
    }
  }

  monstersLoaded = true;
  renderMonsterResults();
  setupMonsterScroll();
  console.log(`[Bestiary] Rendered ${allMonsters.length} monsters (usingFallbackApi=${usingFallbackApi})`);
}

function showMonsterLoadingFooter() {
  const el = document.getElementById('monsterResults');
  if (!el) return;
  const footer = document.createElement('div');
  footer.id = 'monsterLoadMore';
  footer.className = 'ref-result-row justify-content-center text-muted small py-2';
  footer.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading more monsters&hellip;';
  el.appendChild(footer);
  el.scrollTop = el.scrollHeight; // keep scroll at bottom
}

function removeMonsterLoadingFooter() {
  document.getElementById('monsterLoadMore')?.remove();
}

async function loadMoreMonsters() {
  if (!open5eNextUrl || isLoadingMore || usingFallbackApi) return;
  isLoadingMore = true;
  showMonsterLoadingFooter();

  console.log('[Bestiary] Loading more:', open5eNextUrl);
  try {
    const res  = await fetchWithTimeout(open5eNextUrl);
    if (!res.ok) throw new Error('Load-more responded ' + res.status);
    const data = await res.json();
    const raw     = data.results || [];
    const before  = allMonsters.length;
    allMonsters   = deduplicateMonsters(raw, allMonsters);
    allMonsters.sort((a, b) => a.name.localeCompare(b.name));
    open5eNextUrl = data.next ? data.next.replace(/^http:\/\//, 'https://') : null;
    console.log(`[Bestiary] Loaded more — ${allMonsters.length - before} new (${allMonsters.length} total). More pages: ${!!open5eNextUrl}`);
    removeMonsterLoadingFooter();
    renderMonsterResults();
  } catch (err) {
    console.warn('[Bestiary] Load-more failed:', err.message);
    removeMonsterLoadingFooter();
  } finally {
    isLoadingMore = false;
  }
}

function setupMonsterScroll() {
  const el = document.getElementById('monsterResults');
  if (!el) return;
  el.addEventListener('scroll', () => {
    if (!open5eNextUrl || isLoadingMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      loadMoreMonsters();
    }
  });
}

async function getMonsterDetail(monster) {
  const slug = monster.slug || monster.index;
  if (monsterDetailCache[slug]) return monsterDetailCache[slug];

  if (usingFallbackApi) {
    const res = await fetch(`https://www.dnd5eapi.co/api/monsters/${slug}`);
    monsterDetailCache[slug] = await res.json();
  } else {
    monsterDetailCache[slug] = monster;
  }
  return monsterDetailCache[slug];
}

function crMatchesBucket(cr, bucket) {
  if (!bucket) return true;
  const num = crToNum(cr);
  if (bucket === '0')     return num === 0;
  if (bucket === '1/8')   return num === 0.125;
  if (bucket === '1/4')   return num === 0.25;
  if (bucket === '1/2')   return num === 0.5;
  if (bucket === '1-5')   return num >= 1  && num <= 5;
  if (bucket === '6-10')  return num >= 6  && num <= 10;
  if (bucket === '11-15') return num >= 11 && num <= 15;
  if (bucket === '16-20') return num >= 16 && num <= 20;
  if (bucket === '21+')   return num >= 21;
  return true;
}

function getFilteredMonsters() {
  const q    = (document.getElementById('monsterSearch')?.value || '').toLowerCase();
  const cr   =  document.getElementById('monsterCR')?.value    || '';
  const type = (document.getElementById('monsterType')?.value  || '').toLowerCase();

  return allMonsters.filter(m => {
    if (q && !m.name.toLowerCase().includes(q)) return false;
    if (cr && !crMatchesBucket(m.challenge_rating ?? m.cr, cr)) return false;
    if (type) {
      const mType = (m.type || m.creature_type || '').toLowerCase();
      if (!mType.includes(type)) return false;
    }
    return true;
  });
}

function renderMonsterResults() {
  const container = document.getElementById('monsterResults');
  if (!container) return;

  if (!monstersLoaded) {
    container.innerHTML = '<div class="bestiary-loading"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading&hellip;</div>';
    return;
  }

  const monsters = getFilteredMonsters();
  if (!monsters.length) {
    container.innerHTML = '<div class="results-empty">No monsters match the current filters.</div>';
    return;
  }

  container.innerHTML = '';
  monsters.forEach(monster => {
    const slug     = monster.slug || monster.index;
    const isPinned = pinnedMonsters.has(slug);
    const row      = document.createElement('div');
    row.className  = 'ref-result-row' + (isPinned ? ' is-pinned' : '');

    const cr   = monster.challenge_rating ?? monster.cr;
    const size = monster.size              || '';
    const mType = monster.type || monster.creature_type || '';
    const crBadge = cr != null
      ? `<span class="badge bg-danger bg-opacity-75 me-1">CR ${cr}</span>`
      : `<span class="badge bg-secondary bg-opacity-50 me-1">CR —</span>`;

    row.innerHTML = `
      <span class="flex-grow-1 fw-medium">${monster.name}</span>
      ${crBadge}
      <span class="text-muted small d-none d-sm-inline">${size} ${mType}</span>
      <i class="bi bi-pin-fill pin-icon" title="Pin / Unpin"></i>
    `;
    row.addEventListener('click', () => togglePinMonster(monster));
    container.appendChild(row);
  });
}

async function togglePinMonster(monster) {
  const slug = monster.slug || monster.index;

  if (pinnedMonsters.has(slug)) {
    pinnedMonsters.delete(slug);
    renderMonsterResults();
    renderPinnedMonsterCards();
    return;
  }

  let detail = monster;
  if (monster._fallback) {
    try {
      detail = await getMonsterDetail(monster);
    } catch {
      detail = monster;
    }
  }

  pinnedMonsters.set(slug, detail);
  renderMonsterResults();
  renderPinnedMonsterCards();
}

function renderPinnedMonsterCards() {
  const grid      = document.getElementById('monsterCards');
  const container = document.getElementById('monsterCardsContainer');
  if (!grid || !container) return;

  grid.innerHTML = '';
  pinnedMonsters.forEach(monster => grid.appendChild(buildMonsterCard(monster)));
  container.classList.toggle('has-cards', pinnedMonsters.size > 0);
}

function buildMonsterCard(monster) {
  const slug      = monster.slug || monster.index || monster.name;
  const card      = document.createElement('div');
  card.className  = 'ref-card';

  const cr        = monster.challenge_rating ?? monster.cr ?? '?';
  const size      = monster.size             || '';
  const mType     = monster.type || monster.creature_type || '';
  const alignment = monster.alignment        || '';

  // AC — Open5e uses armor_class (number) + armor_desc; dnd5eapi uses armor_class (array)
  let acText = '—';
  if (Array.isArray(monster.armor_class)) {
    acText = monster.armor_class
      .map(a => `${a.value}${a.type ? ' (' + a.type + ')' : ''}`)
      .join(', ');
  } else if (monster.armor_class !== undefined) {
    acText = String(monster.armor_class);
    if (monster.armor_desc) acText += ` (${monster.armor_desc})`;
  }

  const hp    = monster.hit_points !== undefined
    ? `${monster.hit_points}${monster.hit_dice ? ' (' + monster.hit_dice + ')' : ''}`
    : '—';

  let speed = '—';
  if (monster.speed) {
    if (typeof monster.speed === 'string') {
      speed = monster.speed;
    } else if (typeof monster.speed === 'object') {
      speed = Object.entries(monster.speed)
        .filter(([, v]) => v)
        .map(([k, v]) => (k === 'walk' ? v : `${k} ${v}`))
        .join(', ');
    }
  }

  const statKeys   = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];
  const statLabels = ['STR','DEX','CON','INT','WIS','CHA'];

  const abilityGrid = `
    <div class="ability-grid">
      ${statKeys.map((s, i) => {
        const val = monster[s];
        const mod = (typeof val === 'number') ? modStr(val) : '';
        return `<div class="ability-cell">
          <div class="ability-label">${statLabels[i]}</div>
          <div class="ability-value">${val ?? '—'}</div>
          ${mod ? `<div class="ability-mod">${mod}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;

  // Build accordions
  const accId = 'mon-acc-' + slug.replace(/\W+/g, '-');
  const sections = [];

  // Saving throws
  const saves = statKeys.map((k, i) => {
    const key = k + '_save';
    if (monster[key] == null) return null;
    return `${statLabels[i]} ${monster[key] >= 0 ? '+' : ''}${monster[key]}`;
  }).filter(Boolean);
  if (saves.length) sections.push({ title: 'Saving Throws', body: saves.join(', ') });

  // Skills — Open5e returns object; dnd5eapi returns proficiencies array
  if (monster.skills && typeof monster.skills === 'object' && !Array.isArray(monster.skills)) {
    const entries = Object.entries(monster.skills);
    if (entries.length) {
      const body = entries.map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', ');
      sections.push({ title: 'Skills', body });
    }
  } else if (Array.isArray(monster.proficiencies)) {
    const skills = monster.proficiencies
      .filter(p => p.proficiency?.name?.startsWith('Skill:'))
      .map(p => `${p.proficiency.name.replace('Skill: ', '')} +${p.value}`);
    if (skills.length) sections.push({ title: 'Skills', body: skills.join(', ') });
  }

  // Damage modifiers & conditions
  const dmgLines = [];
  if (monster.damage_vulnerabilities) dmgLines.push(`<strong>Vulnerabilities:</strong> ${monster.damage_vulnerabilities}`);
  if (monster.damage_resistances)     dmgLines.push(`<strong>Resistances:</strong> ${monster.damage_resistances}`);
  if (monster.damage_immunities)      dmgLines.push(`<strong>Damage Immunities:</strong> ${monster.damage_immunities}`);
  if (monster.condition_immunities) {
    const ci = Array.isArray(monster.condition_immunities)
      ? monster.condition_immunities.map(c => c.name || c).join(', ')
      : String(monster.condition_immunities);
    if (ci) dmgLines.push(`<strong>Condition Immunities:</strong> ${ci}`);
  }
  if (dmgLines.length) sections.push({ title: 'Damage &amp; Conditions', body: dmgLines.join('<br>') });

  // Senses, languages, CR
  const senseLines = [];
  if (monster.senses) {
    const s = typeof monster.senses === 'object'
      ? Object.entries(monster.senses).map(([k, v]) => `${k} ${v}`).join(', ')
      : String(monster.senses);
    senseLines.push(`<strong>Senses:</strong> ${s}`);
  }
  if (monster.languages)  senseLines.push(`<strong>Languages:</strong> ${monster.languages}`);
  senseLines.push(`<strong>Challenge:</strong> CR ${cr}${monster.xp ? ' (' + monster.xp.toLocaleString() + ' XP)' : ''}`);
  sections.push({ title: 'Senses &amp; Languages', body: senseLines.join('<br>') });

  // Special abilities
  if (monster.special_abilities?.length) {
    const body = monster.special_abilities.map(a => `<p class="mb-1"><strong>${a.name}.</strong> ${a.desc}</p>`).join('');
    sections.push({ title: `Special Abilities (${monster.special_abilities.length})`, body });
  }

  // Actions
  const actions = monster.actions || [];
  if (actions.length) {
    const body = actions.map(a => `<p class="mb-1"><strong>${a.name}.</strong> ${a.desc}</p>`).join('');
    sections.push({ title: `Actions (${actions.length})`, body });
  }

  // Legendary actions
  const legendary = monster.legendary_actions || [];
  if (legendary.length) {
    const body = legendary.map(a => `<p class="mb-1"><strong>${a.name}.</strong> ${a.desc}</p>`).join('');
    sections.push({ title: `Legendary Actions (${legendary.length})`, body });
  }

  const accordionHTML = sections.map((sec, i) => {
    const aId = `${accId}-${i}`;
    return `
      <div class="accordion-item bg-transparent border-0">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed px-2 py-1 bg-transparent text-light border-0 small"
            type="button" data-bs-toggle="collapse" data-bs-target="#${aId}">
            ${sec.title}
          </button>
        </h2>
        <div id="${aId}" class="accordion-collapse collapse">
          <div class="accordion-body px-2 pt-0 small text-secondary">${sec.body}</div>
        </div>
      </div>`;
  }).join('');

  card.innerHTML = `
    <div class="ref-card-header">
      <div class="flex-grow-1">
        <div class="fw-bold">${monster.name}</div>
        <div class="small text-muted">${[size, mType, alignment].filter(Boolean).join(', ')}</div>
      </div>
      <span class="badge bg-danger bg-opacity-75">CR ${cr}</span>
      <button class="btn btn-sm btn-link text-danger p-0 ms-2" title="Dismiss">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="ref-card-body">
      <div class="stat-row">
        <strong>AC</strong> ${acText}
        &nbsp;&middot;&nbsp;
        <strong>HP</strong> ${hp}
        &nbsp;&middot;&nbsp;
        <strong>Speed</strong> ${speed}
      </div>
      ${abilityGrid}
      <div class="accordion accordion-flush" id="${accId}">
        ${accordionHTML}
      </div>
      <button class="btn btn-sm btn-outline-secondary w-100 mt-2" data-copy-monster>
        <i class="bi bi-clipboard me-1"></i>Copy to Clipboard
      </button>
    </div>
  `;

  card.querySelector('[title="Dismiss"]').addEventListener('click', () => togglePinMonster(monster));
  card.querySelector('[data-copy-monster]').addEventListener('click', e => {
    copyMonster(monster);
    const btn = e.currentTarget;
    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard me-1"></i>Copy to Clipboard'; }, 2000);
  });

  return card;
}

function copyMonster(monster) {
  const cr        = monster.challenge_rating ?? monster.cr ?? '?';
  const size      = monster.size             || '';
  const mType     = monster.type || monster.creature_type || '';
  const alignment = monster.alignment        || '';

  let acText = '—';
  if (Array.isArray(monster.armor_class)) {
    acText = monster.armor_class.map(a => `${a.value}${a.type ? ' (' + a.type + ')' : ''}`).join(', ');
  } else if (monster.armor_class !== undefined) {
    acText = String(monster.armor_class);
    if (monster.armor_desc) acText += ` (${monster.armor_desc})`;
  }

  const hp = monster.hit_points !== undefined
    ? `${monster.hit_points}${monster.hit_dice ? ' (' + monster.hit_dice + ')' : ''}`
    : '—';

  let speed = '—';
  if (monster.speed) {
    if (typeof monster.speed === 'string') {
      speed = monster.speed;
    } else if (typeof monster.speed === 'object') {
      speed = Object.entries(monster.speed)
        .filter(([, v]) => v)
        .map(([k, v]) => (k === 'walk' ? v : `${k} ${v}`))
        .join(', ');
    }
  }

  const statKeys   = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];
  const statLabels = ['STR','DEX','CON','INT','WIS','CHA'];
  const statLine = statKeys.map((s, i) => {
    const val = monster[s];
    const mod = typeof val === 'number' ? ` (${modStr(val)})` : '';
    return `${statLabels[i]}: ${val ?? '—'}${mod}`;
  }).join(' | ');

  const lines = [
    monster.name.toUpperCase(),
    [size, mType, alignment].filter(Boolean).join(', '),
    `CR: ${cr}${monster.xp ? ' (' + monster.xp.toLocaleString() + ' XP)' : ''}`,
    '---',
    `AC: ${acText} | HP: ${hp} | Speed: ${speed}`,
    statLine,
  ];

  if (monster.damage_resistances)     lines.push(`Resistances: ${monster.damage_resistances}`);
  if (monster.damage_immunities)      lines.push(`Immunities: ${monster.damage_immunities}`);
  if (monster.damage_vulnerabilities) lines.push(`Vulnerabilities: ${monster.damage_vulnerabilities}`);
  if (monster.senses) {
    const s = typeof monster.senses === 'object'
      ? Object.entries(monster.senses).map(([k, v]) => `${k} ${v}`).join(', ')
      : String(monster.senses);
    lines.push(`Senses: ${s}`);
  }
  if (monster.languages) lines.push(`Languages: ${monster.languages}`);

  if (monster.special_abilities?.length) {
    lines.push('--- Special Abilities ---');
    monster.special_abilities.forEach(a => lines.push(`${a.name}: ${a.desc}`));
  }
  if (monster.actions?.length) {
    lines.push('--- Actions ---');
    monster.actions.forEach(a => lines.push(`${a.name}: ${a.desc}`));
  }
  if (monster.legendary_actions?.length) {
    lines.push('--- Legendary Actions ---');
    monster.legendary_actions.forEach(a => lines.push(`${a.name}: ${a.desc}`));
  }

  copyToClipboard(lines.join('\n'));
}

// ── MONSTER SEARCH LOOK-AHEAD ─────────────────────────────────

function setMonsterSearchStatus(html) {
  const el = document.getElementById('monsterSearchStatus');
  if (!el) return;
  if (html) { el.innerHTML = html; el.style.display = ''; }
  else       { el.style.display = 'none'; el.innerHTML = ''; }
}

async function fetchMonstersByQuery(query) {
  const q = query.toLowerCase().trim();
  queryFetchCache.add(q);   // claim the slot immediately so concurrent calls skip
  try {
    const url = `https://api.open5e.com/monsters/?search=${encodeURIComponent(q)}&limit=500&ordering=name&format=json`;
    console.log(`[Bestiary] Look-ahead fetch for "${q}":`, url);
    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) throw new Error('Look-ahead responded ' + res.status);
    const data = await res.json();
    const before = allMonsters.length;
    allMonsters = deduplicateMonsters(data.results || [], allMonsters);
    allMonsters.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`[Bestiary] Look-ahead "${q}" added ${allMonsters.length - before} new monsters`);
  } catch (err) {
    console.warn(`[Bestiary] Look-ahead "${q}" failed:`, err.message);
    queryFetchCache.delete(q);   // allow a retry later
    throw err;
  }
}

async function onMonsterSearchInput() {
  // Render immediately with what we already have (local filter only)
  renderMonsterResults();

  const query = (document.getElementById('monsterSearch')?.value || '').trim();

  // Clear any pending debounce when the query changes
  clearTimeout(searchDebounceTimer);

  // Need at least 2 characters before hitting the API
  if (query.length < 2) return;

  const qLower = query.toLowerCase();
  // If we've already fetched this exact query (or are fetching it), nothing more to do
  if (queryFetchCache.has(qLower)) return;

  // Debounce: wait for user to pause typing before making the API call
  searchDebounceTimer = setTimeout(async () => {
    const currentQuery = (document.getElementById('monsterSearch')?.value || '').trim().toLowerCase();
    // Bail if the user cleared the box or this query is now cached
    if (!currentQuery || currentQuery.length < 2 || queryFetchCache.has(currentQuery)) return;

    setMonsterSearchStatus(
      `<span class="text-info"><div class="spinner-border spinner-border-sm me-1 align-middle" role="status"></div>` +
      `Searching API for <strong>${currentQuery}</strong>&hellip;</span>`
    );
    try {
      await fetchMonstersByQuery(currentQuery);
    } catch { /* warning already logged */ }

    await new Promise(r => setTimeout(r, 50));
    setMonsterSearchStatus('');
    renderMonsterResults();
  }, 300);
}

function wireMonsterFilters() {
  // Search box uses the async look-ahead handler
  const searchEl = document.getElementById('monsterSearch');
  if (searchEl) {
    searchEl.addEventListener('input',  onMonsterSearchInput);
    searchEl.addEventListener('change', onMonsterSearchInput);
  }
  // CR and type dropdowns just filter locally — no API call needed
  ['monsterCR', 'monsterType'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  renderMonsterResults);
    el.addEventListener('change', renderMonsterResults);
  });
}

// ── RULES FUNCTIONS ───────────────────────────────────────────

function getRulesFlat() {
  return (window.RULES_DATA || []).flatMap(group =>
    (group.items || []).map(item => ({ cat: group.cat, item }))
  );
}

function getFilteredRules() {
  const q   = (document.getElementById('ruleSearch')?.value   || '').toLowerCase();
  const cat =  document.getElementById('ruleCategory')?.value || '';

  return getRulesFlat().filter(({ cat: c, item }) => {
    if (cat && c !== cat) return false;
    if (q) {
      const hay = [item.title, item.body, c, ...(item.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderRuleResults() {
  const container = document.getElementById('ruleResults');
  if (!container) return;

  const rules = getFilteredRules();
  if (!rules.length) {
    container.innerHTML = '<div class="results-empty">No rules match the current search.</div>';
    return;
  }

  container.innerHTML = '';
  rules.forEach(({ cat, item }) => {
    const key      = `${cat}::${item.title}`;
    const isPinned = pinnedRules.has(key);
    const row      = document.createElement('div');
    row.className  = 'ref-result-row' + (isPinned ? ' is-pinned' : '');

    row.innerHTML = `
      <span class="flex-grow-1 fw-medium">${item.title}</span>
      <span class="badge bg-secondary bg-opacity-75 text-truncate d-none d-sm-inline" style="max-width:200px">${cat}</span>
      <i class="bi bi-pin-fill pin-icon" title="Pin / Unpin"></i>
    `;
    row.addEventListener('click', () => togglePinRule(cat, item));
    container.appendChild(row);
  });
}

function togglePinRule(cat, item) {
  const key = `${cat}::${item.title}`;
  if (pinnedRules.has(key)) {
    pinnedRules.delete(key);
  } else {
    pinnedRules.set(key, { cat, item });
  }
  renderRuleResults();
  renderPinnedRuleCards();
}

function renderPinnedRuleCards() {
  const accordion = document.getElementById('ruleCards');
  const container = document.getElementById('ruleCardsContainer');
  if (!accordion || !container) return;

  accordion.innerHTML = '';
  pinnedRules.forEach(({ cat, item }) => accordion.appendChild(buildRuleCard(cat, item)));
  container.classList.toggle('has-cards', pinnedRules.size > 0);
}

function buildRuleCard(cat, item) {
  const key   = `${cat}::${item.title}`;
  const accId = 'rule-' + key.replace(/\W+/g, '-');

  const tagBadges = (item.tags || [])
    .map(t => `<span class="badge bg-secondary bg-opacity-50 me-1">${t}</span>`)
    .join('');

  // Convert newlines to <br> for display
  const bodyHtml = (item.body || '').replace(/\n/g, '<br>');

  const el = document.createElement('div');
  el.className = 'accordion-item rule-accordion-item';

  el.innerHTML = `
    <h2 class="accordion-header">
      <button class="accordion-button" type="button"
        data-bs-toggle="collapse" data-bs-target="#${accId}">
        <span class="badge bg-info text-dark me-2 text-truncate" style="max-width:180px">${cat}</span>
        <span class="fw-medium">${item.title}</span>
      </button>
    </h2>
    <div id="${accId}" class="accordion-collapse collapse show">
      <div class="accordion-body small">
        <div class="text-secondary mb-2">${bodyHtml}</div>
        ${tagBadges ? `<div class="mb-3">${tagBadges}</div>` : ''}
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary flex-grow-1" data-copy-rule>
            <i class="bi bi-clipboard me-1"></i>Copy to Clipboard
          </button>
          <button class="btn btn-sm btn-outline-danger" data-dismiss-rule title="Dismiss">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  el.querySelector('[data-dismiss-rule]').addEventListener('click', () => togglePinRule(cat, item));
  el.querySelector('[data-copy-rule]').addEventListener('click', e => {
    copyRule(cat, item);
    const btn = e.currentTarget;
    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard me-1"></i>Copy to Clipboard'; }, 2000);
  });

  return el;
}

function copyRule(cat, item) {
  const tags = (item.tags || []).join(', ');
  const text = [
    `${item.title.toUpperCase()}`,
    `Category: ${cat}`,
    '---',
    item.body || '',
    tags ? `Tags: ${tags}` : '',
  ].filter(Boolean).join('\n');

  copyToClipboard(text);
}

function populateRuleCategories() {
  const el = document.getElementById('ruleCategory');
  if (!el) return;
  const saved = el.value;
  while (el.options.length > 1) el.remove(1);
  (window.RULES_DATA || []).forEach(group => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = group.cat;
    el.appendChild(opt);
  });
  el.value = saved;
}

function wireRuleFilters() {
  ['ruleSearch', 'ruleCategory'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  renderRuleResults);
    el.addEventListener('change', renderRuleResults);
  });
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const spellCount = (window.SPELLS_DATA || []).length;
  const ruleCount  = (window.RULES_DATA  || []).reduce((n, g) => n + (g.items?.length || 0), 0);
  console.log(`[Reference] DOMContentLoaded — SPELLS_DATA: ${spellCount} spells, RULES_DATA: ${ruleCount} rules`);

  populateSpellFilters();
  wireSpellFilters();
  renderSpellResults();
  wireMonsterFilters();

  populateRuleCategories();
  wireRuleFilters();
  renderRuleResults();

  document.getElementById('bestiary-tab')?.addEventListener('shown.bs.tab', () => {
    console.log('[Reference] Bestiary tab opened');
    if (!monstersLoaded) loadMonsterList();
    else console.log('[Reference] Monsters already loaded, skipping fetch');
  });
});

window.addEventListener('dmtoolbox:packs-ready', () => {
  console.log('[Reference] dmtoolbox:packs-ready fired — refreshing spell list');
  populateSpellFilters();
  renderSpellResults();
});

