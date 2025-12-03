(function () {
      const STORAGE_KEY = 'dmtoolboxCharactersV1';
      const $ = (id) => document.getElementById(id);

      function getNumber(id, fallback = 0) {
        const el = $(id);
        if (!el) return fallback;
        const value = parseInt(el.value, 10);
        return Number.isFinite(value) ? value : fallback;
      }

      // ---------- Auto-calculation helpers ----------
      // Standard 5e modifier from ability score
      function getAbilityModFromScore(score) {
        const n = typeof score === 'number' ? score : Number(score);
        if (!Number.isFinite(n)) return 0;
        return Math.floor((n - 10) / 2);
      }

      // 5e proficiency bonus from level
      function getProficiencyBonusFromLevel(level) {
        const lv = Number(level) || 1;
        if (lv >= 17) return 6;
        if (lv >= 13) return 5;
        if (lv >= 9) return 4;
        if (lv >= 5) return 3;
        return 2;
      }

      // Update derived values on the *character object*
      function recalcDerivedOnCharacter(char) {
        if (!char) return;
      
        const stats = char.stats || {};
        const level = char.level || 1;
      
        const mods = {
          str: getAbilityModFromScore(stats.str),
          dex: getAbilityModFromScore(stats.dex),
          con: getAbilityModFromScore(stats.con),
          int: getAbilityModFromScore(stats.int),
          wis: getAbilityModFromScore(stats.wis),
          cha: getAbilityModFromScore(stats.cha)
        };
        char.statMods = mods;
      
        const pb = getProficiencyBonusFromLevel(level);
        char.proficiencyBonus = pb;
      
        const skills = char.skills || {};
        let perceptionBonus = 0;
        if (skills.perception && typeof skills.perception.bonus === 'number' && !isNaN(skills.perception.bonus)) {
          perceptionBonus = skills.perception.bonus;
        } else {
          perceptionBonus = mods.wis || 0;
        }
      
        char.senses = char.senses || {};
        char.senses.passivePerception = 10 + (perceptionBonus || 0);
        char.passivePerception = char.senses.passivePerception;
      }
      
      // Update derived values based purely on current form inputs (live UI updates)
      function recalcDerivedFromForm() {
        const levelInput = $('charLevel');
        const level = levelInput ? Number(levelInput.value || '') || 1 : 1;

        const scores = {
          str: Number($('statStr')?.value || '') || 0,
          dex: Number($('statDex')?.value || '') || 0,
          con: Number($('statCon')?.value || '') || 0,
          int: Number($('statInt')?.value || '') || 0,
          wis: Number($('statWis')?.value || '') || 0,
          cha: Number($('statCha')?.value || '') || 0
        };

        const mods = {
          str: getAbilityModFromScore(scores.str),
          dex: getAbilityModFromScore(scores.dex),
          con: getAbilityModFromScore(scores.con),
          int: getAbilityModFromScore(scores.int),
          wis: getAbilityModFromScore(scores.wis),
          cha: getAbilityModFromScore(scores.cha)
        };

        if ($('modStr')) $('modStr').value = mods.str;
        if ($('modDex')) $('modDex').value = mods.dex;
        if ($('modCon')) $('modCon').value = mods.con;
        if ($('modInt')) $('modInt').value = mods.int;
        if ($('modWis')) $('modWis').value = mods.wis;
        if ($('modCha')) $('modCha').value = mods.cha;

        // Update proficiency bonus display
        const pb = getProficiencyBonusFromLevel(level);
        const pbSpan = $('charProficiencyBonusDisplay');
        if (pbSpan) pbSpan.textContent = (pb >= 0 ? '+' : '') + pb;

        // Keep Perception in sync with either the skill bonus or WIS mod
        let perceptionBonus = 0;
        const skillPercepEl = $('skillPerceptionBonus');
        if (skillPercepEl && skillPercepEl.value !== '') {
          const n = Number(skillPercepEl.value);
          perceptionBonus = Number.isFinite(n) ? n : 0;
        } else {
          perceptionBonus = mods.wis;
        }
        const passive = 10 + (perceptionBonus || 0);
        if ($('charPassivePerception')) $('charPassivePerception').value = passive;
      }

            // ---------- Auto-calc for saves and skills ----------

      const SAVE_CONFIGS = [
        { ability: 'str', profId: 'saveStrProf', bonusId: 'saveStrBonus' },
        { ability: 'dex', profId: 'saveDexProf', bonusId: 'saveDexBonus' },
        { ability: 'con', profId: 'saveConProf', bonusId: 'saveConBonus' },
        { ability: 'int', profId: 'saveIntProf', bonusId: 'saveIntBonus' },
        { ability: 'wis', profId: 'saveWisProf', bonusId: 'saveWisBonus' },
        { ability: 'cha', profId: 'saveChaProf', bonusId: 'saveChaBonus' }
      ];

      function recalcSavesFromForm(autoOnlyWhenEmpty = true) {
        const levelInput = $('charLevel');
        const level = levelInput ? Number(levelInput.value || '') || 1 : 1;
        const pb = getProficiencyBonusFromLevel(level);

        const scores = {
          str: Number($('statStr')?.value || '') || 0,
          dex: Number($('statDex')?.value || '') || 0,
          con: Number($('statCon')?.value || '') || 0,
          int: Number($('statInt')?.value || '') || 0,
          wis: Number($('statWis')?.value || '') || 0,
          cha: Number($('statCha')?.value || '') || 0
        };

        const mods = {
          str: getAbilityModFromScore(scores.str),
          dex: getAbilityModFromScore(scores.dex),
          con: getAbilityModFromScore(scores.con),
          int: getAbilityModFromScore(scores.int),
          wis: getAbilityModFromScore(scores.wis),
          cha: getAbilityModFromScore(scores.cha)
        };

        SAVE_CONFIGS.forEach(cfg => {
          const profEl = $(cfg.profId);
          const bonusEl = $(cfg.bonusId);
          if (!bonusEl) return;

          if (autoOnlyWhenEmpty && bonusEl.value.trim() !== '') return;

          const abilMod = mods[cfg.ability] || 0;
          const prof = profEl && profEl.checked ? pb : 0;
          const total = abilMod + prof;
          bonusEl.value = total >= 0 ? `+${total}` : `${total}`;
        });
      }

      const SKILL_CONFIGS = [
        { ability: 'dex', profId: 'skillAcrobaticsProf',     bonusId: 'skillAcrobaticsBonus' },
        { ability: 'wis', profId: 'skillAnimalHandlingProf', bonusId: 'skillAnimalHandlingBonus' },
        { ability: 'int', profId: 'skillArcanaProf',         bonusId: 'skillArcanaBonus' },
        { ability: 'str', profId: 'skillAthleticsProf',      bonusId: 'skillAthleticsBonus' },
        { ability: 'cha', profId: 'skillDeceptionProf',      bonusId: 'skillDeceptionBonus' },
        { ability: 'int', profId: 'skillHistoryProf',        bonusId: 'skillHistoryBonus' },
        { ability: 'wis', profId: 'skillInsightProf',        bonusId: 'skillInsightBonus' },
        { ability: 'cha', profId: 'skillIntimidationProf',   bonusId: 'skillIntimidationBonus' },
        { ability: 'int', profId: 'skillInvestigationProf',  bonusId: 'skillInvestigationBonus' },
        { ability: 'wis', profId: 'skillMedicineProf',       bonusId: 'skillMedicineBonus' },
        { ability: 'int', profId: 'skillNatureProf',         bonusId: 'skillNatureBonus' },
        { ability: 'wis', profId: 'skillPerceptionProf',     bonusId: 'skillPerceptionBonus' },
        { ability: 'cha', profId: 'skillPerformanceProf',    bonusId: 'skillPerformanceBonus' },
        { ability: 'cha', profId: 'skillPersuasionProf',     bonusId: 'skillPersuasionBonus' },
        { ability: 'int', profId: 'skillReligionProf',       bonusId: 'skillReligionBonus' },
        { ability: 'dex', profId: 'skillSleightOfHandProf',  bonusId: 'skillSleightOfHandBonus' },
        { ability: 'dex', profId: 'skillStealthProf',        bonusId: 'skillStealthBonus' },
        { ability: 'wis', profId: 'skillSurvivalProf',       bonusId: 'skillSurvivalBonus' }
      ];

      function recalcSkillsFromForm(autoOnlyWhenEmpty = true) {
        const levelInput = $('charLevel');
        const level = levelInput ? Number(levelInput.value || '') || 1 : 1;
        const pb = getProficiencyBonusFromLevel(level);

        const scores = {
          str: Number($('statStr')?.value || '') || 0,
          dex: Number($('statDex')?.value || '') || 0,
          con: Number($('statCon')?.value || '') || 0,
          int: Number($('statInt')?.value || '') || 0,
          wis: Number($('statWis')?.value || '') || 0,
          cha: Number($('statCha')?.value || '') || 0
        };

        const mods = {
          str: getAbilityModFromScore(scores.str),
          dex: getAbilityModFromScore(scores.dex),
          con: getAbilityModFromScore(scores.con),
          int: getAbilityModFromScore(scores.int),
          wis: getAbilityModFromScore(scores.wis),
          cha: getAbilityModFromScore(scores.cha)
        };

        SKILL_CONFIGS.forEach(cfg => {
          const profEl = $(cfg.profId);
          const bonusEl = $(cfg.bonusId);
          if (!bonusEl) return;

          if (autoOnlyWhenEmpty && bonusEl.value.trim() !== '') return;

          const abilMod = mods[cfg.ability] || 0;
          const prof = profEl && profEl.checked ? pb : 0;
          const total = abilMod + prof;
          bonusEl.value = total >= 0 ? `+${total}` : `${total}`;
        });
      }

      function recalcPassivesFromForm() {
        const scores = {
          int: Number($('statInt')?.value || '') || 0,
          wis: Number($('statWis')?.value || '') || 0
        };

        const mods = {
          int: getAbilityModFromScore(scores.int),
          wis: getAbilityModFromScore(scores.wis)
        };

        const invBonusEl = $('skillInvestigationBonus');
        const insBonusEl = $('skillInsightBonus');

        const passiveInvEl = $('charPassiveInvestigation');
        const passiveInsEl = $('charPassiveInsight');
        const passivePercEl = $('charPassivePerception');

        // Investigation
        if (passiveInvEl) {
          let bonus = 0;
          if (invBonusEl && invBonusEl.value.trim() !== '') {
            const n = Number(invBonusEl.value);
            bonus = Number.isFinite(n) ? n : 0;
          } else {
            bonus = mods.int;
          }
          passiveInvEl.value = 10 + (bonus || 0);
        }

        // Insight
        if (passiveInsEl) {
          let bonus = 0;
          if (insBonusEl && insBonusEl.value.trim() !== '') {
            const n = Number(insBonusEl.value);
            bonus = Number.isFinite(n) ? n : 0;
          } else {
            bonus = mods.wis;
          }
          passiveInsEl.value = 10 + (bonus || 0);
        }

        // Perception is already set in recalcDerivedFromForm; leave it alone here
        if (passivePercEl && passivePercEl.value === '') {
          passivePercEl.value = 10 + (mods.wis || 0);
        }
      }

      let characters = [];
      let currentCharacterId = null;
      let editingPortrait = null; // { type, data, settings }
      let currentSpellList = [];
      let currentAttackList = [];

      // ---------- Spells data + helpers ----------
      const RAW_SPELLS = (window.SPELLS_DATA || window.SPELLS || []);

      const ALL_SPELLS = RAW_SPELLS
        .map(s => {
          if (typeof s === 'string') {
            return {
              name: s,
              title: s,
              level: 0,
              school: '',
              casting_time: '',
              range: '',
              components: '',
              duration: '',
              concentration: false,
              classes: [],
              body: '',
              tags: []
            };
          }
          if (!s) return null;
          return {
            ...s,
            name: s.name || s.title || ''
          };
        })
        .filter(s => s && s.name);

      function searchSpells(term) {
        const q = (term || '').trim().toLowerCase();
        if (!q) return [];

        return ALL_SPELLS.filter(spell => {
          const name    = (spell.name || '').toLowerCase();
          const title   = (spell.title || '').toLowerCase();
          const school  = (spell.school || '').toLowerCase();
          const body    = (spell.body || '').toLowerCase();
          const tagsArr = Array.isArray(spell.tags) ? spell.tags : [];
          const clsArr  = Array.isArray(spell.classes) ? spell.classes : [];

          const inName   = name.includes(q);
          const inTitle  = title.includes(q);
          const inSchool = school.includes(q);
          const inBody   = body.includes(q);
          const inTags   = tagsArr.some(t => t.toLowerCase().includes(q));
          const inClass  = clsArr.some(c => c.toLowerCase().includes(q));

          return inName || inTitle || inSchool || inBody || inTags || inClass;
        }).slice(0, 25);
      }

      function renderSpellSearchResults(term) {
        const container = $('spellSearchResults');
        if (!container) return;
        container.innerHTML = '';

        const results = searchSpells(term);
        if (!results.length) {
          if ((term || '').trim()) {
            const div = document.createElement('div');
            div.className = 'list-group-item bg-transparent text-muted small';
            div.textContent = 'No matches';
            container.appendChild(div);
          }
          return;
        }

        results.forEach(spell => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'list-group-item list-group-item-action bg-transparent text-light text-start';

          const title = spell.title || spell.name;
          const bodyText = (spell.body || '').trim();
          const preview = bodyText.length > 120 ? bodyText.slice(0, 120) + '…' : bodyText;

          btn.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div><strong>${title}</strong></div>
                <div class="small text-muted">
                  Level ${spell.level ?? 0}
                  ${spell.school || ''}
                  ${spell.concentration ? ' (Concentration)' : ''}
                </div>
                <div class="small">
                  <span class="text-muted">Cast:</span> ${spell.casting_time || '—'} |
                  <span class="text-muted">Range:</span> ${spell.range || '—'} |
                  <span class="text-muted">Components:</span> ${spell.components || '—'}
                </div>
                ${preview
                  ? `<div class="small text-muted mt-1">${preview}</div>`
                  : ''
                }
              </div>
              <div class="text-end small ms-2">
                ${Array.isArray(spell.tags) && spell.tags.length
                  ? `<div>${spell.tags.map(t => `<span class="badge bg-secondary bg-opacity-50 me-1">${t}</span>`).join('')}</div>`
                  : ''
                }
                ${Array.isArray(spell.classes) && spell.classes.length
                  ? `<div class="mt-1 text-muted">${spell.classes.join(', ')}</div>`
                  : ''
                }
              </div>
            </div>
          `;

          btn.addEventListener('click', () => addSpellToCurrentList(spell));
          container.appendChild(btn);
        });
      }

      // ---------- Storage ----------
      function loadCharactersFromStorage() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return [];
          return parsed;
        } catch {
          return [];
        }
      }
      function saveCharactersToStorage() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
        } catch { }
      }

      // ---------- Helpers ----------
      function renderCharacterSelect() {
        const select = $('characterSelect');
        if (!select) return;
        select.innerHTML = '';

        if (characters.length === 0) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'No characters yet';
          select.appendChild(opt);
          select.disabled = true;
          return;
        }

        select.disabled = false;
        characters.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name || 'Unnamed Character';
          if (c.id === currentCharacterId) opt.selected = true;
          select.appendChild(opt);
        });
      }
      function getCurrentCharacter() {
        if (!currentCharacterId) return null;
        return characters.find(c => c.id === currentCharacterId) || null;
      }
      function setLastUpdatedText(char) {
        const el = $('lastUpdatedText');
        if (!el) return;
        if (!char || !char.lastUpdated) {
          el.textContent = '';
          return;
        }
        const d = new Date(char.lastUpdated);
        if (isNaN(d.getTime())) {
          el.textContent = '';
          return;
        }
        el.textContent = `Last saved: ${d.toLocaleString()}`;
      }
      function ensurePortraitSettings(char) {
        if (!char.portraitSettings) {
          char.portraitSettings = { scale: 1, offsetX: 0, offsetY: 0 };
        }
        return char.portraitSettings;
      }
      function applyMainPortraitTransform(char) {
        const img = $('portraitPreview');
        if (!img || !char || !char.portraitData) return;
        const settings = ensurePortraitSettings(char);
        img.style.transform =
          `translate(-50%, -50%) translate(${settings.offsetX || 0}px, ${settings.offsetY || 0}px) scale(${settings.scale || 1})`;
      }
      function updatePortraitPreview(char) {
        const img = $('portraitPreview');
        const placeholder = $('portraitPlaceholderText');
        if (!img || !placeholder) return;

        if (char && char.portraitData) {
          img.src = char.portraitData;
          img.classList.remove('d-none');
          placeholder.classList.add('d-none');
          ensurePortraitSettings(char);
          applyMainPortraitTransform(char);
        } else {
          img.src = '';
          img.classList.add('d-none');
          placeholder.classList.remove('d-none');
        }
      }

      // ---------- Spells helpers ----------

      function parseCommaList(val) {
        return (val || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      function normalizeSpellEntry(spellLike) {
        if (!spellLike) return null;

        // Legacy: name string only
        if (typeof spellLike === 'string') {
          const fromLib = ALL_SPELLS.find(s =>
            (s.name || '').toLowerCase() === spellLike.toLowerCase() ||
            (s.title || '').toLowerCase() === spellLike.toLowerCase()
          );

          if (fromLib) {
            return {
              name: fromLib.name || fromLib.title || spellLike,
              title: fromLib.title || fromLib.name || spellLike,
              level: fromLib.level ?? 0,
              school: fromLib.school || '',
              casting_time: fromLib.casting_time || '',
              range: fromLib.range || '',
              components: fromLib.components || '',
              duration: fromLib.duration || '',
              concentration: !!fromLib.concentration,
              classes: Array.isArray(fromLib.classes) ? fromLib.classes : [],
              body: fromLib.body || '',
              tags: Array.isArray(fromLib.tags) ? fromLib.tags : [],
              source: 'builtin'
            };
          }

          // Fallback bare custom spell
          return {
            name: spellLike,
            title: spellLike,
            level: 0,
            school: '',
            casting_time: '',
            range: '',
            components: '',
            duration: '',
            concentration: false,
            classes: [],
            body: '',
            tags: [],
            source: 'custom',
            prepared: false
          };
        }

        // Already an object – normalize fields and optionally merge with library
        const baseName = spellLike.name || spellLike.title || '';
        if (!baseName) return null;

        const fromLib = ALL_SPELLS.find(s =>
          (s.name || '').toLowerCase() === baseName.toLowerCase() ||
          (s.title || '').toLowerCase() === baseName.toLowerCase()
        );

        const merged = Object.assign({}, fromLib || {}, spellLike);

        return {
          name: merged.name || merged.title || baseName,
          title: merged.title || merged.name || baseName,
          level: merged.level ?? 0,
          school: merged.school || '',
          casting_time: merged.casting_time || '',
          range: merged.range || '',
          components: merged.components || '',
          duration: merged.duration || '',
          concentration: !!merged.concentration,
          classes: Array.isArray(merged.classes) ? merged.classes : [],
          body: merged.body || '',
          tags: Array.isArray(merged.tags) ? merged.tags : [],
          source: merged.source || (fromLib ? 'builtin' : 'custom'),
          prepared: !!(spellLike.prepared ?? merged.prepared)
        };
      }

      function syncSpellListFromCharacter(char) {
        const raw = Array.isArray(char?.spellList) ? char.spellList : [];

        // Handle both legacy (string[]) and new (object[]) forms
        let normalized = raw.map(entry => normalizeSpellEntry(entry)).filter(Boolean);

        // Dedupe by name (case-insensitive)
        const seen = new Set();
        normalized = normalized.filter(spell => {
          const key = (spell.name || '').toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        currentSpellList = normalized;
        renderCharacterSpellList();
        clearSpellSearchResults();
      }

      function renderCharacterSpellList() {
        const listEl = $('characterSpellList');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!currentSpellList.length) {
          const li = document.createElement('li');
          li.className = 'list-group-item bg-transparent text-muted small';
          li.textContent = 'No spells added yet.';
          listEl.appendChild(li);
          return;
        }

        currentSpellList.forEach(spell => {
          const li = document.createElement('li');
          li.className = 'list-group-item bg-transparent small';
                
          const title = spell.title || spell.name || 'Unknown spell';
          const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level ?? 0}`;
          const schoolText = spell.school || '';
          const metaLine = [
            levelText,
            schoolText,
            spell.concentration ? 'Concentration' : null
          ].filter(Boolean).join(' · ');
        
          const bodyText = (spell.body || '').trim();
          const preview = bodyText.length > 160 ? bodyText.slice(0, 160) + '…' : bodyText;
          const prepared = !!spell.prepared;
        
          li.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
              <div class="me-2">
                <div>
                  <strong>${title}</strong>
                  ${prepared ? '<span class="badge bg-success bg-opacity-75 ms-1">Prepared</span>' : ''}
                </div>
                ${metaLine ? `<div class="text-muted">${metaLine}</div>` : ''}
                <div class="small">
                  <span class="text-muted">Cast:</span> ${spell.casting_time || '—'} |
                  <span class="text-muted">Range:</span> ${spell.range || '—'} |
                  <span class="text-muted">Components:</span> ${spell.components || '—'}
                </div>
                ${spell.duration
                  ? `<div class="small"><span class="text-muted">Duration:</span> ${spell.duration}</div>`
                  : ''
                }
                ${preview
                  ? `<div class="small text-muted mt-1">${preview}</div>`
                  : ''
                }
                ${(Array.isArray(spell.tags) && spell.tags.length)
                  ? `<div class="mt-1">
                      ${spell.tags.map(t => `<span class="badge bg-secondary bg-opacity-50 me-1">${t}</span>`).join('')}
                     </div>`
                  : ''
                }
                ${(Array.isArray(spell.classes) && spell.classes.length)
                  ? `<div class="mt-1 text-muted small">Classes: ${spell.classes.join(', ')}</div>`
                  : ''
                }
              </div>
              <div class="ms-2 d-flex flex-column align-items-end gap-1">
                <div class="form-check form-check-sm">
                  <input class="form-check-input spell-prepared-toggle"
                         type="checkbox"
                         data-spell-name="${spell.name}"
                         ${prepared ? 'checked' : ''} />
                  <label class="form-check-label small">Prep</label>
                </div>
                <button type="button"
                        class="btn btn-sm btn-outline-light"
                        data-spell-remove="${spell.name}">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            </div>
          `;
            
          listEl.appendChild(li);
        });
      }

      function updateSpellSlotsDisplay() {
        // Find the highest level with a max value > 0
        let highestLevel = 0;
        for (let lvl = 1; lvl <= 9; lvl++) {
          const maxEl = $(`slots${lvl}Max`);
          const maxVal = parseInt(maxEl?.value) || 0;
          if (maxVal > 0) {
            highestLevel = lvl;
          }
        }
        
        // Show all rows up to (highestLevel + 1), but always show at least row 1
        const maxVisibleLevel = Math.min(highestLevel + 1, 9);
        const minVisibleLevel = Math.max(maxVisibleLevel, 1);
        
        for (let lvl = 1; lvl <= 9; lvl++) {
          const maxEl = $(`slots${lvl}Max`);
          const row = maxEl?.closest('tr');
          if (row) {
            row.style.display = lvl <= minVisibleLevel ? '' : 'none';
          }
        }
      }

      function clearSpellSearchResults() {
        const container = $('spellSearchResults');
        if (container) container.innerHTML = '';
      }

      function addSpellToCurrentList(spellLike) {
        const spell = normalizeSpellEntry(spellLike);
        if (!spell) return;

        const key = (spell.name || '').toLowerCase();
        if (!key) return;

        const exists = currentSpellList.some(s =>
          (s.name || '').toLowerCase() === key
        );
        if (exists) return;

        currentSpellList.push(spell);
        renderCharacterSpellList();
      }

      function removeSpellFromCurrentList(name) {
        if (!name) return;
        const key = name.toLowerCase();
        currentSpellList = currentSpellList.filter(spell =>
          (spell.name || '').toLowerCase() !== key
        );
        renderCharacterSpellList();
      }

      function clearAllSpellsForCurrentCharacter() {
        currentSpellList = [];
        renderCharacterSpellList();
        clearSpellSearchResults();
      }

      // ---------- Attack management ----------

      function syncAttackListFromCharacter(char) {
        currentAttackList = Array.isArray(char?.attacks) ? [...char.attacks] : [];
        renderAttackList();
      }

      function renderAttackList() {
        const listEl = $('attacksList');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!currentAttackList.length) {
          const li = document.createElement('li');
          li.className = 'list-group-item bg-transparent text-muted small';
          li.textContent = 'No attacks added yet.';
          listEl.appendChild(li);
          return;
        }

        currentAttackList.forEach((attack, index) => {
          const li = document.createElement('li');
          li.className = 'list-group-item bg-transparent small border-secondary';

          const attackTypeLabel = {
            'melee-weapon': 'Melee Weapon Attack',
            'ranged-weapon': 'Ranged Weapon Attack',
            'melee-spell': 'Melee Spell Attack',
            'ranged-spell': 'Ranged Spell Attack',
            'save': 'Saving Throw',
            'other': 'Other'
          }[attack.type] || attack.type;

          // Build the attack info display
          let attackInfo = `<span class="text-muted">${attackTypeLabel}</span>`;
          if (attack.range) attackInfo += ` · <span class="text-muted">${attack.range}</span>`;

          let hitInfo = '';
          if (attack.bonus) {
            hitInfo += `<span class="badge bg-primary bg-opacity-75 me-1">${attack.bonus} to hit</span>`;
          }
          if (attack.saveDC) {
            hitInfo += `<span class="badge bg-warning bg-opacity-75 me-1">${attack.saveDC}</span>`;
          }

          let damageInfo = '';
          if (attack.damage) {
            damageInfo += `<span class="text-info">${attack.damage}</span>`;
          }
          if (attack.damage2) {
            damageInfo += ` + <span class="text-info">${attack.damage2}</span>`;
          }

          li.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="mb-1">
                  <strong>${attack.name || 'Unnamed Attack'}</strong>
                </div>
                <div class="small mb-1">${attackInfo}</div>
                ${hitInfo ? `<div class="mb-1">${hitInfo}</div>` : ''}
                ${damageInfo ? `<div class="mb-1">${damageInfo}</div>` : ''}
                ${attack.properties ? `<div class="small text-muted">${attack.properties}</div>` : ''}
              </div>
              <div class="d-flex gap-1 ms-2">
                <button type="button" class="btn btn-sm btn-outline-light" data-attack-edit="${index}">
                  <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-attack-delete="${index}">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          `;

          listEl.appendChild(li);
        });
      }

      function openAttackModal(editIndex = null) {
        const modal = bootstrap.Modal.getOrCreateInstance($('attackModal'));
        const editIndexEl = $('attackEditIndex');

        // Clear form
        $('attackName').value = '';
        $('attackType').value = 'melee-weapon';
        $('attackRange').value = '';
        $('attackBonus').value = '';
        $('attackSaveDC').value = '';
        $('attackDamage').value = '';
        $('attackDamage2').value = '';
        $('attackProperties').value = '';

        if (editIndex !== null && currentAttackList[editIndex]) {
          // Editing existing attack
          const attack = currentAttackList[editIndex];
          editIndexEl.value = editIndex;
          $('attackName').value = attack.name || '';
          $('attackType').value = attack.type || 'melee-weapon';
          $('attackRange').value = attack.range || '';
          $('attackBonus').value = attack.bonus || '';
          $('attackSaveDC').value = attack.saveDC || '';
          $('attackDamage').value = attack.damage || '';
          $('attackDamage2').value = attack.damage2 || '';
          $('attackProperties').value = attack.properties || '';
          $('attackModalLabel').textContent = 'Edit Attack';
        } else {
          // Adding new attack
          editIndexEl.value = '';
          $('attackModalLabel').textContent = 'Add Attack';
        }

        modal.show();
      }

      function saveAttackFromModal() {
        const editIndex = $('attackEditIndex').value;
        const attack = {
          name: ($('attackName').value || '').trim(),
          type: $('attackType').value || 'melee-weapon',
          range: ($('attackRange').value || '').trim(),
          bonus: ($('attackBonus').value || '').trim(),
          saveDC: ($('attackSaveDC').value || '').trim(),
          damage: ($('attackDamage').value || '').trim(),
          damage2: ($('attackDamage2').value || '').trim(),
          properties: ($('attackProperties').value || '').trim()
        };

        if (!attack.name) {
          alert('Attack must have a name.');
          return;
        }

        if (editIndex !== '' && editIndex !== null) {
          // Edit existing
          const idx = parseInt(editIndex, 10);
          if (idx >= 0 && idx < currentAttackList.length) {
            currentAttackList[idx] = attack;
          }
        } else {
          // Add new
          currentAttackList.push(attack);
        }

        renderAttackList();
        bootstrap.Modal.getOrCreateInstance($('attackModal')).hide();
      }

      function deleteAttack(index) {
        if (index < 0 || index >= currentAttackList.length) return;
        const attack = currentAttackList[index];
        if (!confirm(`Delete attack "${attack.name || 'Unnamed Attack'}"?`)) return;
        currentAttackList.splice(index, 1);
        renderAttackList();
      }

      // ---------- Exhaustion helper ----------
      function updateExhaustionDescription() {
        const input = $('exhaustionLevel');
        const desc = $('exhaustionDescription');
        if (!input || !desc) return;

        let level = parseInt(input.value || '0', 10);

        // Validate and clamp level to 0-10
        if (isNaN(level) || level < 0) {
          level = 0;
          input.value = 0;
        } else if (level > 10) {
          level = 10;
          input.value = 10;
        }

        const descriptions = [
          '0 = No exhaustion',
          '1 = Disadvantage on ability checks',
          '2 = Speed halved',
          '3 = Disadvantage on attacks & saves',
          '4 = HP maximum halved',
          '5 = Speed reduced to 0',
          '6 = Death'
        ];

        // OneD&D extends to 10
        if (level > 6 && level <= 10) {
          desc.textContent = `${level} = Severe exhaustion (OneD&D)`;
        } else if (level >= 0 && level <= 6) {
          desc.textContent = descriptions[level] || '';
        } else {
          desc.textContent = '';
        }
      }

      // ---------- Condition toggles ----------
      function syncConditionsToField() {
        const toggles = document.querySelectorAll('.condition-btn');
        const active = [];
        toggles.forEach(btn => {
          if (btn.classList.contains('active')) {
            active.push(btn.getAttribute('data-condition'));
          }
        });
        const field = $('charConditions');
        if (field) field.value = active.join(', ');
      }

      function syncConditionsFromField() {
        const field = $('charConditions');
        if (!field) return;
        const conditionsStr = (field.value || '').toLowerCase();
        const toggles = document.querySelectorAll('.condition-btn');
        toggles.forEach(btn => {
          const condition = btn.getAttribute('data-condition').toLowerCase();
          if (conditionsStr.includes(condition)) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      // ---------- Spell DC / Attack calculation ----------
      function updateSpellDCAndAttack() {
        const abilitySelect = $('spellcastingAbility');
        const dcEl = $('spellSaveDC');
        const attackEl = $('spellAttackBonus');
        if (!abilitySelect || !dcEl || !attackEl) return;

        const ability = abilitySelect.value;
        if (!ability) {
          dcEl.textContent = '—';
          attackEl.textContent = '—';
          return;
        }

        const levelInput = $('charLevel');
        const level = levelInput ? Number(levelInput.value || '') || 1 : 1;
        const pb = getProficiencyBonusFromLevel(level);

        const scores = {
          int: Number($('statInt')?.value || '') || 0,
          wis: Number($('statWis')?.value || '') || 0,
          cha: Number($('statCha')?.value || '') || 0
        };

        const abilMod = getAbilityModFromScore(scores[ability] || 0);
        const dc = 8 + pb + abilMod;
        const attack = pb + abilMod;

        dcEl.textContent = `DC ${dc}`;
        attackEl.textContent = attack >= 0 ? `+${attack}` : `${attack}`;
      }

      // ---------- Fill form ----------
      function fillFormFromCharacter(char) {
          if (!char) return;
            
          // Ensure derived values are in sync with stored scores/skills
          recalcDerivedOnCharacter(char);
            
          $('charName').value = char.name || '';
          $('playerName').value = char.playerName || '';
          $('charRace').value = char.race || '';
          $('charClass').value = char.charClass || '';
          $('charLevel').value = char.level ?? '';
          $('charAlignment').value = char.alignment || '';
          $('charRoleNotes').value = char.roleNotes || '';
            
          $('charAC').value = char.ac ?? '';
          $('charMaxHP').value = char.maxHP ?? '';
          $('charCurrentHP').value = char.currentHP ?? '';
          $('charTempHP').value = char.tempHP ?? '';
          $('charSpeed').value = char.speed || '';
          $('charInitMod').value = char.initMod ?? '';
          $('charConditions').value = char.conditions || '';

          // Currency
          const currency = char.currency || {};
          $('currencyCP').value = currency.cp ?? 0;
          $('currencySP').value = currency.sp ?? 0;
          $('currencyEP').value = currency.ep ?? 0;
          $('currencyGP').value = currency.gp ?? 0;
          $('currencyPP').value = currency.pp ?? 0;

          // Death saves
          const ds = char.deathSaves || {};
          $('deathSaveSuccess1').checked = (ds.successes >= 1);
          $('deathSaveSuccess2').checked = (ds.successes >= 2);
          $('deathSaveSuccess3').checked = (ds.successes >= 3);
          $('deathSaveFailure1').checked = (ds.failures >= 1);
          $('deathSaveFailure2').checked = (ds.failures >= 2);
          $('deathSaveFailure3').checked = (ds.failures >= 3);
          $('deathSaveStable').checked = !!ds.stable;

          // Exhaustion
          $('exhaustionLevel').value = char.exhaustion ?? '';
          updateExhaustionDescription();

          // Spellcasting ability
          $('spellcastingAbility').value = char.spellcastingAbility || '';
          updateSpellDCAndAttack();

          const stats = char.stats || {};
          $('statStr').value = stats.str ?? '';
          $('statDex').value = stats.dex ?? '';
          $('statCon').value = stats.con ?? '';
          $('statInt').value = stats.int ?? '';
          $('statWis').value = stats.wis ?? '';
          $('statCha').value = stats.cha ?? '';
            
          const statMods = char.statMods || {};
          $('modStr').value = statMods.str ?? '';
          $('modDex').value = statMods.dex ?? '';
          $('modCon').value = statMods.con ?? '';
          $('modInt').value = statMods.int ?? '';
          $('modWis').value = statMods.wis ?? '';
          $('modCha').value = statMods.cha ?? '';
            
          const saves = char.savingThrows || {};
          ['Str','Dex','Con','Int','Wis','Cha'].forEach(abbr => {
            const key = abbr.toLowerCase();
            const obj = saves[key] || {};
            const profEl = $('save' + abbr + 'Prof');
            const bonusEl = $('save' + abbr + 'Bonus');
            if (profEl) profEl.checked = !!obj.prof;
            if (bonusEl) bonusEl.value = obj.bonus ?? '';
          });
          $('saveNotes').value = char.saveNotes || '';
      
          const skills = char.skills || {};
          function setSkill(idBase, key) {
            const s = skills[key] || {};
            const profEl = $(idBase + 'Prof');
            const bonusEl = $(idBase + 'Bonus');
            if (profEl) profEl.checked = !!s.prof;
            if (bonusEl) bonusEl.value = s.bonus ?? '';
          }
          setSkill('skillAcrobatics', 'acrobatics');
          setSkill('skillAnimalHandling', 'animalHandling');
          setSkill('skillArcana', 'arcana');
          setSkill('skillAthletics', 'athletics');
          setSkill('skillDeception', 'deception');
          setSkill('skillHistory', 'history');
          setSkill('skillInsight', 'insight');
          setSkill('skillIntimidation', 'intimidation');
          setSkill('skillInvestigation', 'investigation');
          setSkill('skillMedicine', 'medicine');
          setSkill('skillNature', 'nature');
          setSkill('skillPerception', 'perception');
          setSkill('skillPerformance', 'performance');
          setSkill('skillPersuasion', 'persuasion');
          setSkill('skillReligion', 'religion');
          setSkill('skillSleightOfHand', 'sleightOfHand');
          setSkill('skillStealth', 'stealth');
          setSkill('skillSurvival', 'survival');
      
          $('skillsNotes').value = char.skillsNotes || '';
      
          // Resources & rests
          $('charHitDice').value = char.hitDice || '';
          $('charHitDiceRemaining').value = char.hitDiceRemaining || '';

          const res = char.resources || {};
          const r1 = res.res1 || {};
          const r2 = res.res2 || {};
          const r3 = res.res3 || {};

          $('res1Name').value = r1.name || '';
          $('res1Current').value = r1.current ?? '';
          $('res1Max').value = r1.max ?? '';

          $('res2Name').value = r2.name || '';
          $('res2Current').value = r2.current ?? '';
          $('res2Max').value = r2.max ?? '';

          $('res3Name').value = r3.name || '';
          $('res3Current').value = r3.current ?? '';
          $('res3Max').value = r3.max ?? '';
      
          // Proficiency bonus display
          const pbSpan = $('charProficiencyBonusDisplay');
          if (pbSpan) {
            const pb = typeof char.proficiencyBonus === 'number' && !isNaN(char.proficiencyBonus)
              ? char.proficiencyBonus
              : getProficiencyBonusFromLevel(char.level || 1);
            pbSpan.textContent = (pb >= 0 ? '+' : '') + pb;
          }
      
          $('charFeatures').value = char.features || '';
          $('charSpells').value = char.spells || '';
          $('charInventory').value = char.inventory || '';
          $('charNotes').value = char.notes || '';
          $('charTableNotes').value = char.tableNotes || '';
          $('charExtraNotes').value = char.extraNotes || '';
      
          $('portraitUrl').value = char.portraitType === 'url' ? (char.portraitData || '') : '';

          // Spell slots
          const slots = char.spellSlots || {};
          for (let lvl = 1; lvl <= 9; lvl++) {
            const row = slots[lvl] || {};
            const maxEl  = $(`slots${lvl}Max`);
            const usedEl = $(`slots${lvl}Used`);
            if (maxEl)  maxEl.value  = row.max ?? '';
            if (usedEl) usedEl.value = row.used ?? '';
          }
          
          // Pact slots
          const pact = char.pactSlots || {};
          $('pactLevel').value = pact.level ?? '';
          $('pactMax').value   = pact.max ?? '';
          $('pactUsed').value  = pact.used ?? '';

          syncSpellListFromCharacter(char);
          syncAttackListFromCharacter(char);
          syncConditionsFromField();
          updatePortraitPreview(char);
          setLastUpdatedText(char);
          updateSpellSlotsDisplay();
        }

      // ---------- Create / Save / Delete ----------
      function newCharacterTemplate() {
        return {
          id: 'char-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
          name: 'New Character',
          playerName: '',
          race: '',
          charClass: '',
          level: '',
          alignment: '',
          roleNotes: '',

          // Combat snapshot
          ac: '',
          maxHP: '',
          currentHP: '',
          tempHP: '',
          speed: '',
          initMod: '',
          passivePerception: '',
          conditions: '',

          // Currency
          currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },

          // Death saves & exhaustion
          deathSaves: { successes: 0, failures: 0, stable: false },
          exhaustion: 0,

          // Core stats
          stats: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },
          statMods: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },

          // Saving throws
          savingThrows: {
            str: { prof: false, bonus: '' },
            dex: { prof: false, bonus: '' },
            con: { prof: false, bonus: '' },
            int: { prof: false, bonus: '' },
            wis: { prof: false, bonus: '' },
            cha: { prof: false, bonus: '' }
          },
          saveNotes: '',

          // Skills
          skills: {
            acrobatics: { prof: false, bonus: '' },
            animalHandling: { prof: false, bonus: '' },
            arcana: { prof: false, bonus: '' },
            athletics: { prof: false, bonus: '' },
            deception: { prof: false, bonus: '' },
            history: { prof: false, bonus: '' },
            insight: { prof: false, bonus: '' },
            intimidation: { prof: false, bonus: '' },
            investigation: { prof: false, bonus: '' },
            medicine: { prof: false, bonus: '' },
            nature: { prof: false, bonus: '' },
            perception: { prof: false, bonus: '' },
            performance: { prof: false, bonus: '' },
            persuasion: { prof: false, bonus: '' },
            religion: { prof: false, bonus: '' },
            sleightOfHand: { prof: false, bonus: '' },
            stealth: { prof: false, bonus: '' },
            survival: { prof: false, bonus: '' }
          },
          skillsNotes: '',

          // Senses
          senses: {
            passivePerception: '',
            passiveInvestigation: '',
            passiveInsight: '',
            notes: ''
          },

          // Resources & rests
          hitDice: '',
          hitDiceRemaining: '',
          resources: {
            res1: { name: '', current: '', max: '' },
            res2: { name: '', current: '', max: '' },
            res3: { name: '', current: '', max: '' }
          },

          // Other text blocks
          features: '',
          spells: '',
          spellList: [],
          attacks: [],
          inventory: '',
          notes: '',
          tableNotes: '',
          extraNotes: '',

           // Spellcasting resources
          spellcastingAbility: '',
          spellSlots: {
            1: { max: '', used: '' },
            2: { max: '', used: '' },
            3: { max: '', used: '' },
            4: { max: '', used: '' },
            5: { max: '', used: '' },
            6: { max: '', used: '' },
            7: { max: '', used: '' },
            8: { max: '', used: '' },
            9: { max: '', used: '' }
          },
          pactSlots: {
            level: '',
            max: '',
            used: ''
          },

          // Portrait
          portraitType: null,
          portraitData: null,
          portraitSettings: { scale: 1, offsetX: 0, offsetY: 0 },

          lastUpdated: null
        };
      }
      function createNewCharacter() {
        const newChar = newCharacterTemplate();
        characters.push(newChar);
        currentCharacterId = newChar.id;
        renderCharacterSelect();
        fillFormFromCharacter(newChar);
        saveCharactersToStorage();
      }
      function saveCurrentCharacter() {
          let char = getCurrentCharacter();
          if (!char) {
            createNewCharacter();
            char = getCurrentCharacter();
            if (!char) return;
          }
      
          const getVal = (id) => ($(id)?.value ?? '').trim();
          const getNum = (id) => {
            const v = getVal(id);
            if (v === '') return 0;
            const n = Number(v);
            return isNaN(n) ? 0 : n;
          };
      
          char.name = getVal('charName') || 'Unnamed Character';
          char.playerName = getVal('playerName');
          char.race = getVal('charRace');
          char.charClass = getVal('charClass');
          char.level = getNum('charLevel');
          char.alignment = getVal('charAlignment');
          char.roleNotes = getVal('charRoleNotes');
      
          char.ac = getNum('charAC');
          char.maxHP = getNum('charMaxHP');
          char.currentHP = getNum('charCurrentHP');
          char.tempHP = getNum('charTempHP');
          char.speed = getVal('charSpeed');
          char.initMod = getNum('charInitMod');
          char.conditions = getVal('charConditions');

          // Currency
          char.currency = {
            cp: getNum('currencyCP'),
            sp: getNum('currencySP'),
            ep: getNum('currencyEP'),
            gp: getNum('currencyGP'),
            pp: getNum('currencyPP')
          };

          // Death saves - count checked boxes
          const countChecked = (ids) => ids.reduce((sum, id) => sum + ($(id)?.checked ? 1 : 0), 0);
          char.deathSaves = {
            successes: countChecked(['deathSaveSuccess1', 'deathSaveSuccess2', 'deathSaveSuccess3']),
            failures: countChecked(['deathSaveFailure1', 'deathSaveFailure2', 'deathSaveFailure3']),
            stable: !!$('deathSaveStable')?.checked
          };

          // Exhaustion
          char.exhaustion = getNum('exhaustionLevel');

          // Spellcasting ability
          char.spellcastingAbility = $('spellcastingAbility')?.value || '';

          char.stats = {
            str: getNum('statStr'),
            dex: getNum('statDex'),
            con: getNum('statCon'),
            int: getNum('statInt'),
            wis: getNum('statWis'),
            cha: getNum('statCha')
          };
      
          // Saving throws
          const saveMap = ['Str','Dex','Con','Int','Wis','Cha'];
          char.savingThrows = char.savingThrows || {};
          saveMap.forEach(abbr => {
            const key = abbr.toLowerCase();
            const profEl = $('save' + abbr + 'Prof');
            const bonusEl = $('save' + abbr + 'Bonus');
            const prof = profEl ? !!profEl.checked : false;
            const bonusVal = bonusEl?.value.trim() || '';
            const bonus = bonusVal === '' ? '' : (isNaN(Number(bonusVal)) ? '' : Number(bonusVal));
            if (!char.savingThrows[key]) char.savingThrows[key] = { prof: false, bonus: '' };
            char.savingThrows[key].prof = prof;
            char.savingThrows[key].bonus = bonus;
          });
          char.saveNotes = getVal('saveNotes');

          // Skills
          char.skills = char.skills || {};
          function readSkill(idBase, key) {
            const profEl = $(idBase + 'Prof');
            const bonusEl = $(idBase + 'Bonus');
            const prof = profEl ? !!profEl.checked : false;
            const bonusVal = bonusEl?.value.trim() || '';
            const bonus = bonusVal === '' ? '' : (isNaN(Number(bonusVal)) ? '' : Number(bonusVal));
            char.skills[key] = { prof, bonus };
          }
          readSkill('skillAcrobatics', 'acrobatics');
          readSkill('skillAnimalHandling', 'animalHandling');
          readSkill('skillArcana', 'arcana');
          readSkill('skillAthletics', 'athletics');
          readSkill('skillDeception', 'deception');
          readSkill('skillHistory', 'history');
          readSkill('skillInsight', 'insight');
          readSkill('skillIntimidation', 'intimidation');
          readSkill('skillInvestigation', 'investigation');
          readSkill('skillMedicine', 'medicine');
          readSkill('skillNature', 'nature');
          readSkill('skillPerception', 'perception');
          readSkill('skillPerformance', 'performance');
          readSkill('skillPersuasion', 'persuasion');
          readSkill('skillReligion', 'religion');
          readSkill('skillSleightOfHand', 'sleightOfHand');
          readSkill('skillStealth', 'stealth');
          readSkill('skillSurvival', 'survival');
      
          char.skillsNotes = getVal('skillsNotes');
      
          char.senses = char.senses || {};
          // Passive Perception is derived; do NOT read from DOM here
          char.senses.passiveInvestigation = getNum('charPassiveInvestigation');
          char.senses.passiveInsight = getNum('charPassiveInsight');
          char.senses.notes = getVal('sensesNotes');

          // Resources & rests
          char.hitDice = getVal('charHitDice');
          char.hitDiceRemaining = getVal('charHitDiceRemaining');

          char.resources = {
          res1: {
            name: getVal('res1Name'),
            current: getNum('res1Current'),
            max: getNum('res1Max')
          },
          res2: {
            name: getVal('res2Name'),
            current: getNum('res2Current'),
            max: getNum('res2Max')
          },
          res3: {
            name: getVal('res3Name'),
            current: getNum('res3Current'),
            max: getNum('res3Max')
          }
        };
        
        // NEW: spell slots 1–9
        char.spellSlots = char.spellSlots || {};
        for (let lvl = 1; lvl <= 9; lvl++) {
          const maxId  = `slots${lvl}Max`;
          const usedId = `slots${lvl}Used`;
          char.spellSlots[lvl] = {
            max:  getNum(maxId),
            used: getNum(usedId)
          };
        }
        
        // NEW: pact slots
        char.pactSlots = {
          level: getNum('pactLevel'),
          max:   getNum('pactMax'),
          used:  getNum('pactUsed')
        };
        
        char.features = getVal('charFeatures');
        char.spells = getVal('charSpells');
        char.spellList = Array.isArray(currentSpellList)
          ? currentSpellList
              .map(sp => normalizeSpellEntry(sp))
              .filter(Boolean)
          : [];
          char.attacks = Array.isArray(currentAttackList) ? [...currentAttackList] : [];
          char.inventory = getVal('charInventory');
          char.notes = getVal('charNotes');
          char.tableNotes = getVal('charTableNotes');
          char.extraNotes = getVal('charExtraNotes');
      
          // Recalculate derived fields (mods, PB, passivePerception) based on the updated data
          recalcDerivedOnCharacter(char);
      
          char.lastUpdated = new Date().toISOString();
      
          saveCharactersToStorage();
          renderCharacterSelect();
          setLastUpdatedText(char);
        }
      function deleteCurrentCharacter() {
        const char = getCurrentCharacter();
        if (!char) return;
        if (!confirm(`Delete character "${char.name || 'Unnamed Character'}"? This cannot be undone.`)) return;
        characters = characters.filter(c => c.id !== char.id);
        saveCharactersToStorage();

        if (characters.length > 0) {
          currentCharacterId = characters[0].id;
          renderCharacterSelect();
          fillFormFromCharacter(getCurrentCharacter());
        } else {
          currentCharacterId = null;
          renderCharacterSelect();
          createNewCharacter();
        }
      }

      // ---------- Export / Import ----------
      function exportCharacter(char) {
        if (!char) return;
        const dataStr = JSON.stringify(char, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (char.name || 'character').replace(/[^a-z0-9_\-]+/gi, '_');
        a.href = url;
        a.download = `${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      function exportAllCharacters() {
        if (!characters.length) return;
        const dataStr = JSON.stringify(characters, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dmtoolbox_characters.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      function importCharactersFromFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const text = e.target.result;
            const parsed = JSON.parse(text);
            const imported = Array.isArray(parsed) ? parsed : [parsed];
            if (!imported.length) return;

            imported.forEach(cRaw => {
              if (!cRaw) return;
              const base = newCharacterTemplate();
              const c = Object.assign(base, cRaw);
              if (!c.id) c.id = base.id;

              c.stats = c.stats || base.stats;
              c.statMods = c.statMods || base.statMods;
              c.savingThrows = c.savingThrows || base.savingThrows;
              c.skills = c.skills || base.skills;
              c.senses = c.senses || base.senses;
              c.spellList = Array.isArray(c.spellList)
                ? Array.from(new Set(c.spellList.filter(Boolean)))
                : [];
              c.attacks = Array.isArray(c.attacks) ? c.attacks : [];
              c.currency = c.currency || base.currency;
              c.deathSaves = c.deathSaves || base.deathSaves;
              c.exhaustion = c.exhaustion ?? 0;
              c.spellcastingAbility = c.spellcastingAbility || '';
              c.portraitSettings = c.portraitSettings || base.portraitSettings;
              if (typeof c.extraNotes !== 'string') c.extraNotes = '';

              characters.push(c);
              currentCharacterId = c.id;
            });

            saveCharactersToStorage();
            renderCharacterSelect();
            fillFormFromCharacter(getCurrentCharacter());
          } catch {
            alert('Import failed: invalid JSON format.');
          }
        };
        reader.readAsText(file);
      }

      // ---------- Portrait modal helpers ----------
      function openPortraitModalFor(type, data, baseSettings) {
        editingPortrait = {
          type: type,
          data: data,
          settings: Object.assign({ scale: 1, offsetX: 0, offsetY: 0 }, baseSettings || {})
        };

        const img = $('portraitPreviewModal');
        const placeholder = $('portraitPlaceholderModal');
        const zoomInput = $('portraitZoomModal');

        if (data) {
          img.src = data;
          img.classList.remove('d-none');
          placeholder.classList.add('d-none');
        } else {
          img.src = '';
          img.classList.add('d-none');
          placeholder.classList.remove('d-none');
        }

        if (zoomInput) zoomInput.value = editingPortrait.settings.scale || 1;
        applyModalPortraitTransform();

        const modal = bootstrap.Modal.getOrCreateInstance($('portraitModal'));
        modal.show();
      }
      function applyModalPortraitTransform() {
        const img = $('portraitPreviewModal');
        if (!img || !editingPortrait) return;
        const s = editingPortrait.settings;
        img.style.transform =
          `translate(-50%, -50%) translate(${s.offsetX || 0}px, ${s.offsetY || 0}px) scale(${s.scale || 1})`;
      }

            // ---------- Send current character to Initiative Tracker ----------
      function buildTrackerCharacterFromCurrent() {
        const char = getCurrentCharacter();
        if (!char) {
          alert('No character selected.');
          return null;
        }

        const name = (char.name || '').trim();
        if (!name) {
          alert('Character must have a name before sending to the tracker.');
          return null;
        }

        // Prefer maxHP, fall back to currentHP
        const maxHP = Number(char.maxHP);
        const curHP = Number(char.currentHP);
        const hpBase = Number.isFinite(maxHP) && maxHP > 0
          ? maxHP
          : (Number.isFinite(curHP) && curHP > 0 ? curHP : 0);

        if (!hpBase) {
          alert('Character must have a valid Max HP (or Current HP) before sending to the tracker.');
          return null;
        }

        const acVal = Number(char.ac);
        if (!Number.isFinite(acVal) || acVal <= 0) {
          alert('Character must have a valid AC before sending to the tracker.');
          return null;
        }

        return {
          // no id needed; tracker’s normalizeChar() will assign one
          name,
          type: 'PC',              // default: treat as player character
          initiative: 0,           // default as requested
          currentHP: hpBase,
          maxHP: hpBase,
          tempHP: 0,
          ac: acVal,
          notes: '',
          concentration: false,
          deathSaves: { s: 0, f: 0, stable: false },
          status: [],
          concDamagePending: 0
        };
      }

      function sendCurrentCharacterToTracker() {
        // Make sure we’re sending the latest form values
        saveCurrentCharacter();
        const trackerChar = buildTrackerCharacterFromCurrent();
        if (!trackerChar) return;

        const session = {
          __dmtoolsVersion: 1,
          mode: 'append',          // IMPORTANT: do not wipe existing tracker list
          characters: [trackerChar],
          currentTurn: 0,
          combatRound: 1,
          diceHistory: []
        };

        try {
          localStorage.setItem('dmtools.pendingImport', JSON.stringify(session));
        } catch (e) {
          console.error('localStorage error:', e);
          alert('Could not stage data for the tracker (localStorage error).');
          return;
        }

        // Navigate to the initiative tracker page
        window.location.href = 'index.html#autoinput';
      }

      // ---------- Rest handlers ----------

      function handleShortRest() {
        // Deliberately minimal. You can expand later to prompt for hit-die spending.
        alert('Short Rest: adjust HP and resources manually, then click Save.');
      }

      function handleLongRest() {
        // HP: full heal, clear temp
        const maxHp = getNumber('charMaxHP', 0);
        const curHpEl = $('charCurrentHP');
        const tempHpEl = $('charTempHP');
        if (curHpEl) curHpEl.value = maxHp || 0;
        if (tempHpEl) tempHpEl.value = 0;
          
        // Hit dice: Remaining = Total
        const hdTotalEl = $('charHitDice');
        const hdRemainEl = $('charHitDiceRemaining');
        if (hdTotalEl && hdRemainEl && hdTotalEl.value.trim() !== '') {
          hdRemainEl.value = hdTotalEl.value;
        }
      
        // Generic resources: set current = max where max is present
        const pairs = [
          { cur: 'res1Current', max: 'res1Max' },
          { cur: 'res2Current', max: 'res2Max' },
          { cur: 'res3Current', max: 'res3Max' }
        ];
      
        pairs.forEach(p => {
          const curEl = $(p.cur);
          const maxEl = $(p.max);
          if (!curEl || !maxEl) return;
          const maxVal = maxEl.value.trim();
          if (maxVal !== '') curEl.value = maxVal;
        });
      
        // NEW: reset spell slots (used -> 0)
        for (let lvl = 1; lvl <= 9; lvl++) {
          const usedEl = $(`slots${lvl}Used`);
          if (usedEl) usedEl.value = 0;
        }
      
        // NEW: pact slots – RAW they reset on short rest,
        // but long rest can also safely set used = 0.
        const pactUsedEl = $('pactUsed');
        if (pactUsedEl) pactUsedEl.value = 0;
      }

      // ---------- Events ----------
      function attachEventHandlers() {
        $('characterSelect').addEventListener('change', e => {
          const id = e.target.value;
          currentCharacterId = id || null;
          fillFormFromCharacter(getCurrentCharacter());
        });
        $('newCharacterBtn').addEventListener('click', createNewCharacter);
        $('saveCharacterBtn').addEventListener('click', saveCurrentCharacter);
        $('deleteCharacterBtn').addEventListener('click', deleteCurrentCharacter);
        $('exportCharacterBtn').addEventListener('click', () => {
          const c = getCurrentCharacter();
          if (!c) { alert('No character selected to export.'); return; }
          exportCharacter(c);
        });
        $('exportAllCharactersBtn').addEventListener('click', () => {
          if (!characters.length) { alert('No characters to export.'); return; }
          exportAllCharacters();
        });
        $('importCharacterBtn').addEventListener('click', () => $('importFileInput').click());
        $('importFileInput').addEventListener('change', e => {
          const file = e.target.files[0];
          if (file) importCharactersFromFile(file);
          e.target.value = '';
        });

        $('portraitFile').addEventListener('change', e => {
          const file = e.target.files[0];
          if (!file) return;
          if (!file.type || !file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
          }
          const reader = new FileReader();
          reader.onload = evt => {
            openPortraitModalFor('data', evt.target.result, { scale: 1, offsetX: 0, offsetY: 0 });
          };
          reader.readAsDataURL(file);
        });
        $('applyPortraitUrlBtn').addEventListener('click', () => {
          const url = ($('portraitUrl').value || '').trim();
          if (!url) { alert('Enter an image URL first.'); return; }
          openPortraitModalFor('url', url, { scale: 1, offsetX: 0, offsetY: 0 });
        });
        $('editPortraitBtn').addEventListener('click', () => {
          const char = getCurrentCharacter();
          if (!char || !char.portraitData) {
            alert('No portrait to edit. Upload or set a URL first.');
            return;
          }
          openPortraitModalFor(char.portraitType || 'data', char.portraitData, ensurePortraitSettings(char));
        });
        $('clearPortraitBtn').addEventListener('click', () => {
          const char = getCurrentCharacter();
          if (!char) return;
          char.portraitType = null;
          char.portraitData = null;
          char.portraitSettings = { scale: 1, offsetX: 0, offsetY: 0 };
          $('portraitUrl').value = '';
          updatePortraitPreview(char);
          saveCharactersToStorage();
        });
        $('portraitZoomModal').addEventListener('input', e => {
          if (!editingPortrait) return;
          const val = parseFloat(e.target.value);
          editingPortrait.settings.scale = isNaN(val) ? 1 : val;
          applyModalPortraitTransform();
        });

        // Auto-calc: update mods / PB / passive Perception when key fields change
        [
          'statStr','statDex','statCon','statInt','statWis','statCha',
          'charLevel',
          'skillPerceptionBonus'   // NEW: keep Passive Perception in sync with Perception bonus
        ].forEach(id => {
          const el = $(id);
          if (el) {
            el.addEventListener('input', () => {
              recalcDerivedFromForm();
            });
          }
        });
        
        // Also run once after handlers are attached to sync with initial form values
        recalcDerivedFromForm();
                // Auto-calc: recalc when save prof checkboxes change
        SAVE_CONFIGS.forEach(cfg => {
          const el = $(cfg.profId);
          if (el) {
            el.addEventListener('change', () => {
              recalcSavesFromForm(false);
              recalcPassivesFromForm();
            });
          }
        });

        // Auto-calc: recalc when skill prof checkboxes change
        SKILL_CONFIGS.forEach(cfg => {
          const el = $(cfg.profId);
          if (el) {
            el.addEventListener('change', () => {
              recalcSkillsFromForm(false);
              recalcPassivesFromForm();
            });
          }
        });

        // Auto-calc: if user clears a save/skill bonus and leaves the field, recompute it
        const bonusFieldIds = [
          ...SAVE_CONFIGS.map(c => c.bonusId),
          ...SKILL_CONFIGS.map(c => c.bonusId)
        ];

        bonusFieldIds.forEach(id => {
          const el = $(id);
          if (!el) return;
          el.addEventListener('blur', () => {
            if (el.value.trim() === '') {
              recalcSavesFromForm(true);
              recalcSkillsFromForm(true);
              recalcPassivesFromForm();
            }
          });
        });

        // Rest buttons
        const shortRestBtn = $('shortRestBtn');
        const longRestBtn = $('longRestBtn');
        if (shortRestBtn) {
          shortRestBtn.addEventListener('click', handleShortRest);
        }
        if (longRestBtn) {
          longRestBtn.addEventListener('click', handleLongRest);
        }


        const containerModal = $('portraitContainerModal');
        const imgModal = $('portraitPreviewModal');
        let isDragging = false;
        let lastX = 0, lastY = 0;

        if (containerModal && imgModal) {
          containerModal.addEventListener('mousedown', e => {
            if (!editingPortrait || imgModal.classList.contains('d-none')) return;
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            containerModal.style.cursor = 'grabbing';
            e.preventDefault();
          });
          window.addEventListener('mousemove', e => {
            if (!isDragging || !editingPortrait) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            editingPortrait.settings.offsetX += dx;
            editingPortrait.settings.offsetY += dy;
            applyModalPortraitTransform();
          });
          window.addEventListener('mouseup', () => {
            if (isDragging) {
              isDragging = false;
              containerModal.style.cursor = 'grab';
            }
          });

          containerModal.addEventListener('touchstart', e => {
            if (!editingPortrait || imgModal.classList.contains('d-none')) return;
            if (e.touches.length !== 1) return;
            isDragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
          }, { passive: false });
          containerModal.addEventListener('touchmove', e => {
            if (!isDragging || !editingPortrait || e.touches.length !== 1) return;
            const t = e.touches[0];
            const dx = t.clientX - lastX;
            const dy = t.clientY - lastY;
            lastX = t.clientX;
            lastY = t.clientY;
            editingPortrait.settings.offsetX += dx;
            editingPortrait.settings.offsetY += dy;
            applyModalPortraitTransform();
            e.preventDefault();
          }, { passive: false });
          window.addEventListener('touchend', () => { isDragging = false; });
        }

        $('savePortraitModalBtn').addEventListener('click', () => {
          if (!editingPortrait) {
            bootstrap.Modal.getOrCreateInstance($('portraitModal')).hide();
            return;
          }
          const char = getCurrentCharacter();
          if (!char) return;
          char.portraitType = editingPortrait.type;
          char.portraitData = editingPortrait.data;
          char.portraitSettings = Object.assign(
            { scale: 1, offsetX: 0, offsetY: 0 },
            editingPortrait.settings || {}
          );
          saveCharactersToStorage();
          updatePortraitPreview(char);
          bootstrap.Modal.getOrCreateInstance($('portraitModal')).hide();
          editingPortrait = null;
        });
        $('portraitModal').addEventListener('hidden.bs.modal', () => { editingPortrait = null; });

        const sendToTrackerBtn = $('sendToTrackerBtn');
        if (sendToTrackerBtn) {
          sendToTrackerBtn.addEventListener('click', sendCurrentCharacterToTracker);
        }

        // Spells events
        const spellSearchInput = $('spellSearchInput');
        const clearSpellListBtn = $('clearSpellListBtn');
        const characterSpellListEl = $('characterSpellList');
        const customSpellNameInput = $('customSpellNameInput');
        const customSpellLevelInput = $('customSpellLevelInput');
        const customSpellSchoolInput = $('customSpellSchoolInput');
        const customSpellCastingInput = $('customSpellCastingInput');
        const customSpellRangeInput = $('customSpellRangeInput');
        const customSpellComponentsInput = $('customSpellComponentsInput');
        const customSpellDurationInput = $('customSpellDurationInput');
        const customSpellConcentrationInput = $('customSpellConcentrationInput');
        const customSpellClassesInput = $('customSpellClassesInput');
        const customSpellTagsInput = $('customSpellTagsInput');
        const customSpellBodyInput = $('customSpellBodyInput');
        const saveCustomSpellBtn = $('saveCustomSpellBtn');
        if (spellSearchInput) {
          spellSearchInput.addEventListener('input', e => renderSpellSearchResults(e.target.value));
        }
        if (clearSpellListBtn) {
          clearSpellListBtn.addEventListener('click', () => {
            if (!currentSpellList.length) return;
            if (confirm('Clear all known spells for this character?')) {
              clearAllSpellsForCurrentCharacter();
            }
          });
        }
        if (characterSpellListEl) {
          characterSpellListEl.addEventListener('click', e => {
            // Toggle prepared
            const prepToggle = e.target.closest('.spell-prepared-toggle');
            if (prepToggle) {
              const name = prepToggle.getAttribute('data-spell-name');
              const key = (name || '').toLowerCase();
              currentSpellList = currentSpellList.map(spell => {
                if ((spell.name || '').toLowerCase() === key) {
                  return { ...spell, prepared: prepToggle.checked };
                }
                return spell;
              });
              renderCharacterSpellList();
              return;
            }
        
            // Remove spell
            const removeBtn = e.target.closest('button[data-spell-remove]');
            if (removeBtn) {
              const name = removeBtn.getAttribute('data-spell-remove');
              removeSpellFromCurrentList(name);
            }
          });
        }
        function buildCustomSpellFromForm() {
          const name = (customSpellNameInput?.value || '').trim();
          if (!name) return null;
          const levelVal = (customSpellLevelInput?.value || '').trim();
          const level = levelVal === '' ? 0 : (Number(levelVal) || 0);
          return {
            name,
            title: name,
            level,
            school: (customSpellSchoolInput?.value || '').trim(),
            casting_time: (customSpellCastingInput?.value || '').trim(),
            range: (customSpellRangeInput?.value || '').trim(),
            components: (customSpellComponentsInput?.value || '').trim(),
            duration: (customSpellDurationInput?.value || '').trim(),
            concentration: !!(customSpellConcentrationInput && customSpellConcentrationInput.checked),
            classes: parseCommaList(customSpellClassesInput?.value || ''),
            body: (customSpellBodyInput?.value || '').trim(),
            tags: parseCommaList(customSpellTagsInput?.value || ''),
            source: 'custom'
          };
        }
        function clearCustomSpellForm() {
          if (!customSpellNameInput) return;
          customSpellNameInput.value = '';
          if (customSpellLevelInput) customSpellLevelInput.value = '';
          if (customSpellSchoolInput) customSpellSchoolInput.value = '';
          if (customSpellCastingInput) customSpellCastingInput.value = '';
          if (customSpellRangeInput) customSpellRangeInput.value = '';
          if (customSpellComponentsInput) customSpellComponentsInput.value = '';
          if (customSpellDurationInput) customSpellDurationInput.value = '';
          if (customSpellConcentrationInput) customSpellConcentrationInput.checked = false;
          if (customSpellClassesInput) customSpellClassesInput.value = '';
          if (customSpellTagsInput) customSpellTagsInput.value = '';
          if (customSpellBodyInput) customSpellBodyInput.value = '';
        }
        if (saveCustomSpellBtn) {
          saveCustomSpellBtn.addEventListener('click', () => {
            const spell = buildCustomSpellFromForm();
            if (!spell) {
              alert('Custom spell needs at least a name.');
              return;
            }
            addSpellToCurrentList(spell);
            clearCustomSpellForm();
          });
        }
        for (let lvl = 1; lvl <= 9; lvl++) {
            const maxEl = $(`slots${lvl}Max`);
            if (maxEl){
                maxEl.addEventListener('input', updateSpellSlotsDisplay);
            }
        }

        // Attack events
        const addAttackBtn = $('addAttackBtn');
        const saveAttackBtn = $('saveAttackBtn');
        const attacksListEl = $('attacksList');

        if (addAttackBtn) {
          addAttackBtn.addEventListener('click', () => openAttackModal());
        }

        if (saveAttackBtn) {
          saveAttackBtn.addEventListener('click', saveAttackFromModal);
        }

        if (attacksListEl) {
          attacksListEl.addEventListener('click', e => {
            // Edit attack
            const editBtn = e.target.closest('button[data-attack-edit]');
            if (editBtn) {
              const index = parseInt(editBtn.getAttribute('data-attack-edit'), 10);
              openAttackModal(index);
              return;
            }

            // Delete attack
            const deleteBtn = e.target.closest('button[data-attack-delete]');
            if (deleteBtn) {
              const index = parseInt(deleteBtn.getAttribute('data-attack-delete'), 10);
              deleteAttack(index);
            }
          });
        }

        // Exhaustion description
        const exhaustionInput = $('exhaustionLevel');
        if (exhaustionInput) {
          exhaustionInput.addEventListener('input', updateExhaustionDescription);
        }

        // Condition toggles
        const conditionToggles = document.querySelectorAll('.condition-btn');
        conditionToggles.forEach(btn => {
          btn.addEventListener('click', e => {
            e.preventDefault();
            btn.classList.toggle('active');
            syncConditionsToField();
          });
        });

        // Sync conditions field back to toggles when manually edited
        const conditionsField = $('charConditions');
        if (conditionsField) {
          conditionsField.addEventListener('blur', syncConditionsFromField);
        }

        // Spellcasting ability & derived stats
        const spellAbilitySelect = $('spellcastingAbility');
        if (spellAbilitySelect) {
          spellAbilitySelect.addEventListener('change', updateSpellDCAndAttack);
        }

        // Update spell DC/attack when stats or level change
        ['statInt', 'statWis', 'statCha', 'charLevel'].forEach(id => {
          const el = $(id);
          if (el) {
            el.addEventListener('input', updateSpellDCAndAttack);
          }
        });
      }

      // ---------- Init ----------
      function init() {
        characters = loadCharactersFromStorage();
        characters.forEach(c => {
          const base = newCharacterTemplate();
          c.stats = c.stats || base.stats;
          c.statMods = c.statMods || base.statMods;
          c.savingThrows = c.savingThrows || base.savingThrows;
          c.skills = c.skills || base.skills;
          c.senses = c.senses || base.senses;

          // NEW: ensure spell slots / pact slots exist on old characters
          c.spellSlots = c.spellSlots || base.spellSlots;
          c.pactSlots  = c.pactSlots  || base.pactSlots;

          // NEW: ensure attacks array exists on old characters
          c.attacks = Array.isArray(c.attacks) ? c.attacks : [];

          // NEW: ensure currency/death saves/exhaustion exist
          c.currency = c.currency || base.currency;
          c.deathSaves = c.deathSaves || base.deathSaves;
          c.exhaustion = c.exhaustion ?? 0;
          c.spellcastingAbility = c.spellcastingAbility || '';

          // existing spellList upgrade...
          if (Array.isArray(c.spellList)) {
            let upgraded = c.spellList.map(entry => normalizeSpellEntry(entry)).filter(Boolean);
            const seen = new Set();
            upgraded = upgraded.filter(spell => {
              const key = (spell.name || '').toLowerCase();
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            c.spellList = upgraded;
          } else {
            c.spellList = [];
          }
      
          c.portraitSettings = c.portraitSettings || base.portraitSettings;
          if (typeof c.extraNotes !== 'string') c.extraNotes = '';
      
          recalcDerivedOnCharacter(c);
        });
      
          if (!characters.length) {
            createNewCharacter();
          } else {
            currentCharacterId = characters[0].id;
            renderCharacterSelect();
            fillFormFromCharacter(getCurrentCharacter());
          }
          attachEventHandlers();
          updateSpellSlotsDisplay();
        }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  