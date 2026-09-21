/**
 * Combat Mode: the card view of the character sheet (characters.html): the mode toggle, the live card,
 * interactive HP, rolls from the card (attack, damage, saves, ability and skill checks, initiative,
 * death saves, hit dice), conditions, action economy, spell casting and the dice-history modal.
 *
 * LOAD ORDER (load-bearing). This is a CLASSIC script, included by a plain parser-blocking
 * <script src="/js/character/combat-mode.js"> that sits after the sheet markup and after the other
 * character scripts. Do NOT add `defer`, `async` or `type="module"`:
 *   - Startup runs once, when the file executes. It looks up the toggle, the card and the roll grids,
 *     binds every listener, and restores the saved mode (localStorage "dmCombatMode") while
 *     `document.readyState` is still 'loading'. Deferring it would run all of that after DOMContentLoaded
 *     and after character.js.
 *   - It runs before character.js (type="module") and the deferred scripts, which start only after parsing
 *     finishes. So nothing owned by character.js exists yet at startup; every use of it below happens
 *     later, at event time, behind a guarded `window.x?.()` or typeof check.
 *   - It needs DiceEngine (js/modules/dice-engine.js, loaded in <head>) for every dice rule.
 * The file runs as sloppy-mode script code, although ESLint parses js/** as modules.
 *
 * DEPENDENCIES
 *   Browser/DOM   the sheet and card elements by id, localStorage, alert/prompt/confirm, bootstrap.Modal.
 *   character.js  (published on window, all optional at event time) getCurrentCharacter,
 *                 saveCurrentCharacter, addToRollHistory, rollHistory, showRollToast, showAppToast,
 *                 resetDeathSaves, currentAttackList, currentSpellList, currentConcentrationSpell,
 *                 getAttackFeatureBonuses, addFlatBonusToNotation, getConcentrationAttackBonus,
 *                 getInitiativeAdvantageReason, isConcentrating, setConcentration,
 *                 handleConcentrationCheck, syncConditionsToField, updateSpellSlotsDisplay,
 *                 rollDice, renderRollHistory. (Short and Long Rest are not called directly: the
 *                 card's rest buttons click the sheet's own #shortRestBtn / #longRestBtn.)
 *   Events        the document events "characterLoaded" and "concentrationChanged" that character.js
 *                 dispatches, plus DOMContentLoaded.
 *
 * PUBLIC SURFACE: everything is private to the IIFE below except what it writes to window.
 *   Called by character.js:  triggerActionEconomy, updateActionTracker, rollSpellDice, executeCast,
 *                            showUpcastModal, getAvailableSlotLevels, parseSpellRollInfo,
 *                            detectSpellActionType.
 *   Only used inside this file:  handleCombatHP, combatViewUpdateTimer.
 */

    (function() {
      const dmCombatModeToggle = document.getElementById('dmCombatModeToggle');

      // Function to update combat card view with current character data
      function updateCombatCardView() {
        // Get character data from the form fields
        const charName = document.getElementById('charName')?.value || 'Character Name';
        const charRace = document.getElementById('charRace')?.value || '-';
        const charClass = document.getElementById('charClass')?.value || '-';
        const charLevel = document.getElementById('charLevel')?.value || '1';

        // Basic stats (using correct field IDs)
        const ac = document.getElementById('charAC')?.value || '10';
        const currentHp = document.getElementById('charCurrentHP')?.value || '10';
        const maxHp = document.getElementById('charMaxHP')?.value || '10';
        const speed = document.getElementById('charSpeed')?.value || '30';
        const profBonus = document.getElementById('charProfBonusAbilsDisplay')?.textContent || '+2';
        const passivePerception = document.getElementById('passivePerception')?.value || '10';

        // Initiative — prefer charInitMod if set (Alert feat, custom bonus, etc.), else DEX mod
        const initModField = document.getElementById('charInitMod')?.value;
        const dexMod = document.getElementById('modDex')?.value || '0';
        const initModDisplay = (initModField !== undefined && initModField !== null && initModField !== '')
          ? initModField
          : dexMod;

        // Hit dice (show remaining, not total)
        const hitDiceRemaining = document.getElementById('charHitDiceRemaining')?.value || '0d8';
        const hitDice = hitDiceRemaining;

        // Format with + sign for positive values
        const formatMod = (val) => {
          const num = parseInt(val, 10);
          if (isNaN(num)) return '+0';
          return num >= 0 ? `+${num}` : `${num}`;
        };

        // Ability Scores and Modifiers
        const abilities = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
        abilities.forEach(ability => {
          const score = document.getElementById(`stat${ability}`)?.value || '10';
          const mod = document.getElementById(`mod${ability}`)?.value || '0';
          const scoreEl = document.getElementById(`combatScore${ability}`);
          const modEl = document.getElementById(`combatMod${ability}`);
          if (scoreEl) scoreEl.textContent = score;
          if (modEl) modEl.textContent = formatMod(mod);
        });

        // Saving throws - read from the correct input IDs (saveStrBonus, saveDexBonus, etc.)
        const saveAbilities = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
        saveAbilities.forEach(ability => {
          const saveVal = document.getElementById(`save${ability}Bonus`)?.value;
          const saveEl = document.getElementById(`combatSave${ability}`);
          const saveBox = document.getElementById(`combatSave${ability}Box`);
          const profCheck = document.getElementById(`save${ability}Prof`)?.checked;

          if (saveEl) saveEl.textContent = formatMod(saveVal);
          if (saveBox) {
            if (profCheck) {
              saveBox.classList.add('proficient');
            } else {
              saveBox.classList.remove('proficient');
            }
          }
        });

        // Get portrait data
        const portraitPreview = document.getElementById('portraitPreview');
        const combatPortraitImage = document.getElementById('combatPortraitImage');
        const combatPortraitPlaceholder = document.getElementById('combatPortraitPlaceholder');

        // Update portrait
        if (portraitPreview && !portraitPreview.classList.contains('d-none')) {
          combatPortraitImage.src = portraitPreview.src;
          combatPortraitImage.style.transform = portraitPreview.style.transform || 'translate(-50%, -50%) scale(1)';
          combatPortraitImage.classList.remove('d-none');
          combatPortraitPlaceholder.classList.add('d-none');
        } else {
          combatPortraitImage.classList.add('d-none');
          combatPortraitPlaceholder.classList.remove('d-none');
        }

        // Update all combat card fields
        document.getElementById('combatCharName').textContent = charName;
        document.getElementById('combatClass').textContent = charClass;
        document.getElementById('combatRace').textContent = charRace;
        document.getElementById('combatLevel').textContent = charLevel;
        document.getElementById('combatAC').textContent = ac;
        // HP is now updated via updateCombatHP() for interactive display
        document.getElementById('combatSpeed').textContent = `${speed} ft`;
        document.getElementById('combatInitiative').textContent = formatMod(initModDisplay);
        document.getElementById('combatHitDice').textContent = hitDice;
        document.getElementById('combatProfBonus').textContent = profBonus;
        document.getElementById('combatPassivePerception').textContent = passivePerception;

        // Spellcasting stats
        const spellDC = document.getElementById('spellSaveDC')?.textContent || '--';
        const spellAttack = document.getElementById('spellAttackBonus')?.textContent || '--';
        const combatSpellStatsSection = document.getElementById('combatSpellStatsSection');
        const combatSpellDC = document.getElementById('combatSpellDC');
        const combatSpellAttack = document.getElementById('combatSpellAttack');

        if (spellDC && spellDC !== '—' && spellDC !== '--') {
          if (combatSpellStatsSection) combatSpellStatsSection.classList.remove('d-none');
          if (combatSpellDC) combatSpellDC.textContent = spellDC;
          if (combatSpellAttack) combatSpellAttack.textContent = spellAttack;
        } else {
          if (combatSpellStatsSection) combatSpellStatsSection.classList.add('d-none');
        }

        // Update interactive HP display
        updateCombatHP();

        // Update conditions display
        updateCombatConditions();

        // Update spell slots
        updateCombatSpellSlots();

        // Death saves
        let successCount = 0;
        let failureCount = 0;
        for (let i = 1; i <= 3; i++) {
          if (document.getElementById(`deathSaveSuccess${i}`)?.checked) successCount++;
          if (document.getElementById(`deathSaveFailure${i}`)?.checked) failureCount++;
        }
        const combatDeathSuccess = document.getElementById('combatDeathSuccess');
        const combatDeathFailure = document.getElementById('combatDeathFailure');
        if (combatDeathSuccess) combatDeathSuccess.textContent = successCount;
        if (combatDeathFailure) combatDeathFailure.textContent = failureCount;

        // Exhaustion
        const exhaustion = document.getElementById('exhaustionLevel')?.value || '0';
        const combatExhaustion = document.getElementById('combatExhaustion');
        if (combatExhaustion) combatExhaustion.textContent = exhaustion;

        // Update Actions/Attacks
        updateCombatActions();

        // Update Spells
        updateCombatSpells();

        // Update class resources (Ki, Rage, Bardic Inspiration, etc.)
        updateCombatResources();

        // Update skills grid
        updateCombatSkills();

        // Sync HP last-change log from main sheet
        const lastChangeEl = document.getElementById('hpLastChangeLog');
        const combatLastChange = document.getElementById('combatHPLastChange');
        if (combatLastChange && lastChangeEl) {
          combatLastChange.textContent = lastChangeEl.textContent || '';
        }
      }

      // ---- Turn Action Tracker ----
      const ACTION_SLOTS = [
        { btnIds: ['btn-actionSlot',      'btn-combat-actionSlot'],      key: 'actionUsed',      label: 'Action',   availableClass: 'btn-outline-success',   usedClass: 'btn-secondary' },
        { btnIds: ['btn-bonusActionSlot', 'btn-combat-bonusActionSlot'], key: 'bonusActionUsed', label: 'Bonus',    availableClass: 'btn-outline-warning',   usedClass: 'btn-secondary' },
        { btnIds: ['btn-reactionSlot',    'btn-combat-reactionSlot'],    key: 'reactionUsed',    label: 'Reaction', availableClass: 'btn-outline-info',      usedClass: 'btn-secondary' },
        { btnIds: ['btn-moveSlot',        'btn-combat-moveSlot'],        key: 'moveUsed',        label: 'Move',     availableClass: 'btn-outline-secondary', usedClass: 'btn-secondary' }
      ];

      function updateActionTracker(char) {
        if (!char) return;
        ACTION_SLOTS.forEach(slot => {
          const used = !!char[slot.key];
          const iconClass = used ? 'bi-x-circle-fill' : 'bi-circle';
          const labelHtml = used ? `<s>${slot.label}</s>` : slot.label;
          const title = used
            ? `${slot.label} already used — click to start a new turn`
            : `Use ${slot.label}`;
          slot.btnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.classList.remove('btn-outline-success', 'btn-outline-warning', 'btn-outline-info', 'btn-secondary');
            btn.classList.add(used ? slot.usedClass : slot.availableClass);
            btn.innerHTML = `<i class="bi ${iconClass} me-1"></i>${labelHtml}`;
            btn.title = title;
          });
        });
      }

      window.updateActionTracker = updateActionTracker;

      /**
       * Detect which action economy slot a spell uses from its casting_time string.
       * Very permissive: lowercases and checks for keywords.
       * Returns the character key string: 'reactionUsed', 'bonusActionUsed', 'actionUsed', or null.
       */
      function detectSpellActionType(castingTime) {
        if (!castingTime) return null;
        const t = castingTime.toLowerCase();
        // "reaction" must come before "action" since "reaction" contains "action"
        if (t.includes('reaction')) return 'reactionUsed';
        if (t.includes('bonus')) return 'bonusActionUsed';
        // Long casts (ritual, minute, hour, day) are not tracked
        if (t.includes('minute') || t.includes('hour') || t.includes('day')) return null;
        if (t.includes('action')) return 'actionUsed';
        return null;
      }
      window.detectSpellActionType = detectSpellActionType;

      /**
       * Mark an action economy slot as used for the current character.
       * If the slot is already used and silent=false, prompts the user to start a new turn.
       * Returns true if the triggering action should proceed, false if the user cancelled.
       */
      function triggerActionEconomy(actionType, silent = false) {
        if (!actionType) return true;
        const char = typeof window.getCurrentCharacter === 'function' ? window.getCurrentCharacter() : null;
        if (!char) return true;
        const slot = ACTION_SLOTS.find(s => s.key === actionType);
        if (!slot) return true;

        if (char[actionType]) {
          // Already used this turn
          if (silent) return true; // Extra Attack etc. — just proceed
          _showActionAlreadyUsedModal(slot.label, () => { resetAllActions(char); });
          return false; // Async — caller aborts; modal callback handles reset + re-trigger
        }

        // Not yet used — mark it
        char[actionType] = true;
        updateActionTracker(char);
        if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
        return true;
      }
      window.triggerActionEconomy = triggerActionEconomy;

      // ---- Spell Dice Rolling ----

      /**
       * Extract dice info from a spell object.
       * Prefers structured fields (damage_dice, heal_dice) added to spells-data.js;
       * falls back to regex-parsing body text for content-pack spells that lack them.
       * Returns { dice: string[], rollType: 'attack'|'damage'|'heal'|null, saveAbility: string|null }
       */
      // ======================================
      // Skills Grid in Combat View
      // ======================================
      const COMBAT_SKILLS = [
        { name: 'Acrobatics',     bonusId: 'skillAcrobaticsBonus',     profId: 'skillAcrobaticsProf',     expId: 'skillAcrobaticsExp',     key: 'acrobatics' },
        { name: 'Animal Hand.',   bonusId: 'skillAnimalHandlingBonus', profId: 'skillAnimalHandlingProf', expId: 'skillAnimalHandlingExp', key: 'animalHandling' },
        { name: 'Arcana',         bonusId: 'skillArcanaBonus',         profId: 'skillArcanaProf',         expId: 'skillArcanaExp',         key: 'arcana' },
        { name: 'Athletics',      bonusId: 'skillAthleticsBonus',      profId: 'skillAthleticsProf',      expId: 'skillAthleticsExp',      key: 'athletics' },
        { name: 'Deception',      bonusId: 'skillDeceptionBonus',      profId: 'skillDeceptionProf',      expId: 'skillDeceptionExp',      key: 'deception' },
        { name: 'History',        bonusId: 'skillHistoryBonus',        profId: 'skillHistoryProf',        expId: 'skillHistoryExp',        key: 'history' },
        { name: 'Insight',        bonusId: 'skillInsightBonus',        profId: 'skillInsightProf',        expId: 'skillInsightExp',        key: 'insight' },
        { name: 'Intimidation',   bonusId: 'skillIntimidationBonus',   profId: 'skillIntimidationProf',   expId: 'skillIntimidationExp',   key: 'intimidation' },
        { name: 'Investigation',  bonusId: 'skillInvestigationBonus',  profId: 'skillInvestigationProf',  expId: 'skillInvestigationExp',  key: 'investigation' },
        { name: 'Medicine',       bonusId: 'skillMedicineBonus',       profId: 'skillMedicineProf',       expId: 'skillMedicineExp',       key: 'medicine' },
        { name: 'Nature',         bonusId: 'skillNatureBonus',         profId: 'skillNatureProf',         expId: 'skillNatureExp',         key: 'nature' },
        { name: 'Perception',     bonusId: 'skillPerceptionBonus',     profId: 'skillPerceptionProf',     expId: 'skillPerceptionExp',     key: 'perception' },
        { name: 'Performance',    bonusId: 'skillPerformanceBonus',    profId: 'skillPerformanceProf',    expId: 'skillPerformanceExp',    key: 'performance' },
        { name: 'Persuasion',     bonusId: 'skillPersuasionBonus',     profId: 'skillPersuasionProf',     expId: 'skillPersuasionExp',     key: 'persuasion' },
        { name: 'Religion',       bonusId: 'skillReligionBonus',       profId: 'skillReligionProf',       expId: 'skillReligionExp',       key: 'religion' },
        { name: 'Sleight of H.',  bonusId: 'skillSleightOfHandBonus',  profId: 'skillSleightOfHandProf',  expId: 'skillSleightOfHandExp',  key: 'sleightOfHand' },
        { name: 'Stealth',        bonusId: 'skillStealthBonus',        profId: 'skillStealthProf',        expId: 'skillStealthExp',        key: 'stealth' },
        { name: 'Survival',       bonusId: 'skillSurvivalBonus',       profId: 'skillSurvivalProf',       expId: 'skillSurvivalExp',       key: 'survival' }
      ];

      function updateCombatSkills() {
        const grid = document.getElementById('combatSkillsGrid');
        if (!grid) return;
        const fmtB = v => { const n = parseInt(v, 10); return isNaN(n) ? '+0' : (n >= 0 ? `+${n}` : `${n}`); };
        grid.innerHTML = COMBAT_SKILLS.map(s => {
          const bonus = document.getElementById(s.bonusId)?.value ?? '0';
          const isExp = document.getElementById(s.expId)?.checked;
          const isProf = !isExp && document.getElementById(s.profId)?.checked;
          const cls = isExp ? 'expertise' : isProf ? 'proficient' : '';
          return `<button class="combat-skill-btn ${cls}" data-skill-key="${s.key}" title="${s.name} check (Shift=Adv, Ctrl=Disadv)">
            <span class="skill-bonus">${fmtB(bonus)}</span>
            <span>${s.name}</span>
          </button>`;
        }).join('');
      }

      // Skill check roll from combat view (Shift=adv, Ctrl=disadv)
      function rollCombatSkillCheck(skillKey, rollType) {
        const skill = COMBAT_SKILLS.find(s => s.key === skillKey);
        if (!skill) return;
        const bonusVal = parseInt(document.getElementById(skill.bonusId)?.value, 10) || 0;
        const bonusStr = bonusVal >= 0 ? `+${bonusVal}` : String(bonusVal);

        const d20 = DiceEngine.rollD20(rollType);
        const [roll1, roll2] = d20.rolls;
        const chosen = d20.chosen, isAdv = d20.isAdvantage, isDisadv = d20.isDisadvantage;
        const total = chosen + bonusVal;
        const isCrit = chosen === 20, isFumble = chosen === 1;

        try {
          if (typeof window.addToRollHistory === 'function') {
            window.addToRollHistory({
              notation: '1d20', description: `${skill.name} Check`,
              rolls: isAdv || isDisadv ? [roll1, roll2] : [chosen],
              modifier: bonusVal, total, chosen,
              isAdvantage: isAdv, isDisadvantage: isDisadv,
              timestamp: new Date().toISOString(), isCritical: isCrit, isFumble
            });
          }
        } catch(e) {}

        const label = isAdv ? ` (Adv)` : isDisadv ? ` (Disadv)` : '';
        const extra = isCrit ? 'Natural 20!' : isFumble ? 'Natural 1!' : null;
        if (typeof window.showRollToast === 'function') {
          window.showRollToast(`${skill.name}${label}`, total, extra);
        } else {
          alert(`${skill.name}${label}: ${total}`);
        }
      }

      // Delegate skill clicks from the skills grid
      const _combatSkillsGrid = document.getElementById('combatSkillsGrid');
      if (_combatSkillsGrid) {
        _combatSkillsGrid.addEventListener('click', function(e) {
          const btn = e.target.closest('.combat-skill-btn');
          if (!btn) return;
          const key = btn.dataset.skillKey;
          const rollType = e.shiftKey ? 'advantage' : (e.ctrlKey || e.metaKey) ? 'disadvantage' : 'normal';
          rollCombatSkillCheck(key, rollType);
        });
        _combatSkillsGrid.addEventListener('contextmenu', function(e) {
          const btn = e.target.closest('.combat-skill-btn');
          if (!btn) return;
          const key = btn.dataset.skillKey;
          if (!key) return;
          e.preventDefault();
          _showRollPopupAtEl(btn, type => rollCombatSkillCheck(key, type));
        });
        _addLongPressPopup(_combatSkillsGrid, '.combat-skill-btn', el => type => rollCombatSkillCheck(el.dataset.skillKey, type));
      }

      function parseSpellRollInfo(spell) {
        if (!spell) return { dice: [], rollType: null, saveAbility: null };
        const tags = Array.isArray(spell.tags) ? spell.tags.map(t => t.toLowerCase()) : [];

        const hasDamage = tags.includes('damage');
        const hasHeal   = tags.some(t => t.includes('heal'));
        const hasAttack = tags.includes('attack');
        const rollType  = hasAttack ? 'attack' : (hasHeal && !hasDamage) ? 'heal' : (hasDamage ? 'damage' : null);
        const saveAbility = spell.save_dc_ability ? spell.save_dc_ability.toUpperCase() : null;

        if (!rollType) return { dice: [], rollType: null, saveAbility: null };

        // Prefer structured fields (set in spells-data.js or content-pack payload)
        if (spell.damage_dice || spell.heal_dice) {
          const raw = (spell.damage_dice || spell.heal_dice || '');
          // Field may be a single notation string or comma-separated list
          const dice = raw.split(',').map(d => d.trim().replace(/\s+/g, '')).filter(Boolean);
          return { dice, rollType, saveAbility };
        }

        // Fallback: extract dice expressions from body text
        const body = spell.body || '';
        const matches = [...body.matchAll(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/gi)];
        const dice = [...new Set(matches.map(m => m[1].replace(/\s+/g, '')))];
        return { dice, rollType, saveAbility };
      }

      /** Read the numeric spell attack bonus from whichever DOM element is currently visible. */
      function getSpellAttackBonus() {
        const sources = ['combatSpellAttack', 'spellAttackBonus'];
        for (const id of sources) {
          const text = (document.getElementById(id)?.textContent || '').trim();
          const match = text.match(/([+-]?\d+)/);
          if (match) return parseInt(match[1], 10);
        }
        return 0;
      }

      /**
       * Roll attack/damage/healing dice for a spell by index in window.currentSpellList.
       * castLevel (optional) — the slot level actually used; enables upcast damage scaling.
       * Called from both the sheet and combat view Roll buttons.
       */
      function rollSpellDice(spellIndex, castLevel) {
        const spellList = window.currentSpellList || [];
        const spell = spellList[spellIndex];
        if (!spell) return;

        const { rollType, saveAbility } = parseSpellRollInfo(spell);
        const spellName = spell.title || spell.name || 'Spell';
        const rollFn = window.rollDice;

        if (!rollFn) { alert('Dice roller not available.'); return; }

        // Determine dice to roll — cantrip scaling, upcast scaling, or base
        let dice;
        if ((spell.level || 0) === 0 && (spell.damage_dice || spell.heal_dice)) {
          // Cantrip: scale number of dice by character level (PHB table)
          const charLevel = parseInt(document.getElementById('charLevel')?.value, 10) || 1;
          const extraDice = charLevel >= 17 ? 3 : charLevel >= 11 ? 2 : charLevel >= 5 ? 1 : 0;
          if (extraDice > 0) {
            // Scale each dice expression: "1d10" → "2d10" at level 5, etc.
            const raw = spell.damage_dice || spell.heal_dice || '';
            dice = raw.split(',').map(d => {
              d = d.trim().replace(/\s+/g, '');
              const m = d.match(/^(\d+)(d\d+(?:[+-]\d+)?)$/i);
              if (m) return `${parseInt(m[1], 10) + extraDice}${m[2]}`;
              return d; // can't parse shape — return as-is
            }).filter(Boolean);
          } else {
            dice = parseSpellRollInfo(spell).dice;
          }
        } else if (castLevel && castLevel > (spell.level || 0) && (spell.damage_dice || spell.heal_dice)) {
          // Leveled spell upcast
          dice = computeUpcastDice(spell, castLevel);
        } else {
          dice = parseSpellRollInfo(spell).dice;
        }

        // Agonizing Blast: add CHA modifier × beam count to Eldritch Blast damage
        const spellTitle = (spell.title || spell.name || '').toLowerCase();
        if ((spell.level || 0) === 0 && spellTitle.includes('eldritch blast') && dice.length) {
          const char = window.getCurrentCharacter?.();
          if (char?.eldritchInvocations?.includes('Agonizing Blast')) {
            const chaMod = Math.floor(((char.stats?.cha || 10) - 10) / 2);
            if (chaMod !== 0) {
              const beamCount = parseInt(dice[0].match(/^(\d+)/)?.[1] || '1', 10);
              const totalBonus = beamCount * chaMod;
              dice = dice.map((d, i) => {
                if (i !== 0) return d;
                const m = d.match(/^(\d+d\d+)([+-]\d+)?$/i);
                if (!m) return d;
                const newMod = parseInt(m[2] || '0', 10) + totalBonus;
                return `${m[1]}${newMod > 0 ? '+' + newMod : newMod < 0 ? String(newMod) : ''}`;
              });
            }
          }
        }

        // Collect all results then show one combined toast
        const allResults = [];

        if (rollType === 'attack') {
          // Spell attack roll (1d20 + spell attack bonus), then damage
          const bonus = getSpellAttackBonus();
          const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
          const hit = rollFn(`1d20${bonusStr}`, `${spellName} - Spell Attack`);
          if (hit) allResults.push(hit);
        }

        if (!dice.length) {
          if (rollType !== 'attack') alert(`${spellName}: no dice found. Add damage_dice to the spell data.`);
          if (allResults.length && window.showRollToast) window.showRollToast(allResults);
          return;
        }

        // For attack-type spells, ask about concentration bonus before rolling damage
        // (Hex applies to each beam that hits, Hunter's Mark to marked target, etc.)
        let concBonus = null;
        let applyConc = false;
        if (rollType === 'attack') {
          concBonus = window.getConcentrationAttackBonus?.();
          applyConc = concBonus ? confirm(concBonus.prompt) : false;
        }

        // Build damage/heal label, appending save type when relevant
        const saveSuffix = saveAbility && rollType !== 'attack' ? ` (${saveAbility} Save)` : '';
        dice.forEach((notation, i) => {
          const baseLabel = rollType === 'heal'
            ? `${spellName} - Healing`
            : i === 0 ? `${spellName} - Damage${saveSuffix}` : `${spellName} - Damage ${i + 1}${saveSuffix}`;
          const result = rollFn(notation, baseLabel);
          if (result) allResults.push(result);
        });

        if (applyConc) {
          const r = rollFn(concBonus.notation, `${spellName} - ${concBonus.label}`);
          if (r) allResults.push(r);
        }

        if (allResults.length && window.showRollToast) window.showRollToast(allResults);
      }
      window.rollSpellDice = rollSpellDice;
      window.parseSpellRollInfo = parseSpellRollInfo;

      // Exposed so character.js (regular page) can share slot-picker + cast logic
      // Function declarations are hoisted so these assignments are valid even though
      // the function bodies appear later in source order.
      window.getAvailableSlotLevels = getAvailableSlotLevels;
      window.showUpcastModal        = showUpcastModal;
      window.executeCast            = executeCast;

      // ---- Class Resources in Combat View ----
      function updateCombatResources() {
        const container = document.getElementById('combatClassResources');
        if (!container) return;

        const rows = Array.from(document.querySelectorAll('#resourcesList .resource-row'));
        const active = rows
          .map((row, idx) => ({
            name:  row.querySelector('.res-name')?.value?.trim() || '',
            cur:   parseInt(row.querySelector('.res-current')?.value, 10) || 0,
            max:   parseInt(row.querySelector('.res-max')?.value,     10) || 0,
            idx,
          }))
          .filter(r => r.name && r.max > 0);

        if (!active.length) { container.innerHTML = ''; return; }

        container.innerHTML = `
          <div class="combat-resources-row mt-2 border-top border-secondary pt-2">
            ${active.map(r => `
              <div class="combat-resource-group">
                <div class="small text-muted mb-1">${r.name}</div>
                <div class="d-flex align-items-center gap-1">
                  <button class="btn btn-sm btn-outline-secondary px-2 py-0"
                    data-resource-idx="${r.idx}" data-resource-action="use"
                    title="Use 1 ${r.name}">−</button>
                  <span class="small fw-bold px-1" id="combatResVal-${r.idx}">${r.cur}/${r.max}</span>
                  <button class="btn btn-sm btn-outline-secondary px-2 py-0"
                    data-resource-idx="${r.idx}" data-resource-action="restore"
                    title="Restore 1 ${r.name}">+</button>
                </div>
              </div>
            `).join('')}
          </div>`;
      }

      // Modal-based replacement for confirm() in action economy
      let _actionAlreadyUsedCallback = null;
      function _showActionAlreadyUsedModal(slotLabel, onConfirm) {
        const msgEl = document.getElementById('actionAlreadyUsedMsg');
        if (msgEl) msgEl.textContent = `Your ${slotLabel} has already been used this turn. Start a new turn and reset all actions?`;
        _actionAlreadyUsedCallback = onConfirm;
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('actionAlreadyUsedModal'));
        modal.show();
      }
      document.addEventListener('click', function(e) {
        if (e.target.closest('#actionAlreadyUsedConfirmBtn')) {
          const modal = bootstrap.Modal.getInstance(document.getElementById('actionAlreadyUsedModal'));
          if (modal) modal.hide();
          if (typeof _actionAlreadyUsedCallback === 'function') {
            const cb = _actionAlreadyUsedCallback;
            _actionAlreadyUsedCallback = null;
            cb();
          }
        }
        if (e.target.closest('#actionAlreadyUsedCancelBtn')) {
          _actionAlreadyUsedCallback = null;
        }
      });

      function resetAllActions(char) {
        if (!char) return;
        char.actionUsed = false;
        char.bonusActionUsed = false;
        char.reactionUsed = false;
        char.moveUsed = false;
        updateActionTracker(char);
        if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
      }

      // Action slot button clicks
      document.addEventListener('click', function(e) {
        const actionBtn = e.target.closest('[data-action-slot]');
        if (actionBtn) {
          const char = typeof window.getCurrentCharacter === 'function' ? window.getCurrentCharacter() : null;
          if (!char) return;
          const key = actionBtn.dataset.actionSlot;
          const slot = ACTION_SLOTS.find(s => s.key === key);
          if (!slot) return;

          if (char[key]) {
            // Already used — offer to start a new turn
            _showActionAlreadyUsedModal(slot.label, () => { resetAllActions(char); });
          } else {
            char[key] = true;
            updateActionTracker(char);
            if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
          }
          return;
        }

        if (e.target.closest('#btn-newTurn') || e.target.closest('#btn-combat-newTurn')) {
          const char = typeof window.getCurrentCharacter === 'function' ? window.getCurrentCharacter() : null;
          resetAllActions(char);
        }
      });

      // Function to update conditions display
      function updateCombatConditions() {
        const conditionsEl = document.getElementById('combatConditions');
        if (!conditionsEl) return;

        const activeConditions = [];
        document.querySelectorAll('.condition-btn.active').forEach(btn => {
          activeConditions.push(btn.dataset.condition);
        });
        const conditionsInput = document.getElementById('charConditions')?.value;
        if (conditionsInput && conditionsInput.trim()) {
          conditionsInput.split(',').forEach(c => {
            const t = c.trim();
            if (t && !activeConditions.includes(t)) activeConditions.push(t);
          });
        }

        if (activeConditions.length === 0) {
          conditionsEl.innerHTML = '<span class="text-muted fst-italic small">None</span>';
          return;
        }

        const positiveConditions = ['Blessed', 'Inspired', 'Hasted', 'Raging', 'Concentrating'];
        let html = '';
        activeConditions.forEach(condition => {
          const isPositive = positiveConditions.includes(condition);
          const isConc = condition === 'Concentrating';
          let extraClasses = isConc ? ' clickable-concentration' : '';
          let displayText = condition;
          if (isConc && window.currentConcentrationSpell) {
            displayText = `Conc: ${window.currentConcentrationSpell}`;
          }
          html += `<span class="combat-condition-badge ${isPositive ? 'positive' : ''}${extraClasses}" data-condition="${condition}">
            ${displayText}
            <button class="cond-remove" data-remove-condition="${condition}" title="Remove ${condition}">×</button>
          </span>`;
        });
        conditionsEl.innerHTML = html;
      }

      // Remove condition from combat view badge ×
      document.getElementById('combatConditions')?.addEventListener('click', function(e) {
        const removeBtn = e.target.closest('[data-remove-condition]');
        if (removeBtn) {
          e.stopPropagation();
          const condName = removeBtn.dataset.removeCondition;
          // Deactivate on the full sheet condition button
          const condBtn = document.querySelector(`.condition-btn[data-condition="${condName}"]`);
          if (condBtn && condBtn.classList.contains('active')) {
            condBtn.classList.remove('active');
            if (typeof window.syncConditionsToField === 'function') window.syncConditionsToField();
            if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
          } else {
            // It's from the text field — remove it
            const field = document.getElementById('charConditions');
            if (field) {
              field.value = field.value.split(',').map(c=>c.trim()).filter(c=>c && c !== condName).join(', ');
              if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
            }
          }
          updateCombatConditions();
          return;
        }
        // Clicking the Concentrating badge (not the × button) opens the modal
        const concBadge = e.target.closest('.clickable-concentration');
        if (concBadge) {
          const spellName = window.currentConcentrationSpell || '—';
          const modal = document.getElementById('concentrationCheckModal');
          if (modal) {
            document.getElementById('concModalSpellName').textContent = spellName;
            document.getElementById('concModalDamage').value = '';
            document.getElementById('concModalDC').textContent = '10';
            document.getElementById('concModalBonus').textContent =
              `+${parseInt(document.getElementById('saveConBonus')?.value, 10) || 0}`;
            new bootstrap.Modal(modal).show();
          }
        }
      });

      // Add condition from combat view dropdown
      document.getElementById('combatAddConditionMenu')?.addEventListener('click', function(e) {
        const item = e.target.closest('[data-add-condition]');
        if (!item) return;
        e.preventDefault();
        const condName = item.dataset.addCondition;
        const condBtn = document.querySelector(`.condition-btn[data-condition="${condName}"]`);
        if (condBtn && !condBtn.classList.contains('active')) {
          condBtn.classList.add('active');
          if (typeof window.syncConditionsToField === 'function') window.syncConditionsToField();
          if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
        } else if (!condBtn) {
          // Condition not in the full-sheet buttons — add to the text field
          const field = document.getElementById('charConditions');
          if (field) {
            const existing = field.value.split(',').map(c=>c.trim()).filter(Boolean);
            if (!existing.includes(condName)) {
              existing.push(condName);
              field.value = existing.join(', ');
              if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
            }
          }
        }
        updateCombatConditions();
      });

      // Function to update spell slots display
      function updateCombatSpellSlots() {
        const slotsContainer = document.getElementById('combatSpellSlots');
        const slotsSection = document.getElementById('combatSpellSlotsSection');
        const pactContainer = document.getElementById('combatPactSlots');
        const pactSection = document.getElementById('combatPactSlotsSection');

        if (!slotsContainer) return;

        let hasAnySlots = false;
        let slotsHtml = '';

        // Regular spell slots (levels 1-9)
        for (let level = 1; level <= 9; level++) {
          const maxEl = document.getElementById(`slots${level}Max`);
          const usedEl = document.getElementById(`slots${level}Used`);
          const max = parseInt(maxEl?.value, 10) || 0;
          const used = parseInt(usedEl?.value, 10) || 0;

          if (max > 0) {
            hasAnySlots = true;
            const remaining = Math.max(0, max - used);
            const percentage = (remaining / max) * 100;

            // Color class based on remaining percentage
            let colorClass = 'slots-full';
            if (remaining === 0) colorClass = 'slots-empty';
            else if (percentage <= 25) colorClass = 'slots-low';
            else if (percentage <= 50) colorClass = 'slots-mid';

            slotsHtml += `
              <div class="combat-slot-item" data-level="${level}">
                <div class="combat-slot-level">${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'}</div>
                <div class="combat-slot-count ${colorClass}">${remaining}/${max}</div>
              </div>
            `;
          }
        }

        if (hasAnySlots) {
          slotsContainer.innerHTML = slotsHtml;
          if (slotsSection) slotsSection.classList.remove('d-none');
        } else {
          if (slotsSection) slotsSection.classList.add('d-none');
        }

        // Pact slots (Warlock)
        const pactMax = parseInt(document.getElementById('pactMax')?.value, 10) || 0;
        const pactUsed = parseInt(document.getElementById('pactUsed')?.value, 10) || 0;
        const pactLevel = parseInt(document.getElementById('pactLevel')?.value, 10) || 1;

        if (pactMax > 0 && pactContainer && pactSection) {
          const pactRemaining = Math.max(0, pactMax - pactUsed);
          const pactPercentage = (pactRemaining / pactMax) * 100;

          // Color class based on remaining percentage
          let pactColorClass = 'slots-full';
          if (pactRemaining === 0) pactColorClass = 'slots-empty';
          else if (pactPercentage <= 25) pactColorClass = 'slots-low';
          else if (pactPercentage <= 50) pactColorClass = 'slots-mid';

          pactContainer.innerHTML = `
            <div class="combat-slot-item" data-level="pact">
              <div class="combat-slot-level">Lvl ${pactLevel}</div>
              <div class="combat-slot-count ${pactColorClass}">${pactRemaining}/${pactMax}</div>
            </div>
          `;
          pactSection.classList.remove('d-none');
        } else if (pactSection) {
          pactSection.classList.add('d-none');
        }
      }

      // Function to render actions/attacks in combat view
      function updateCombatActions() {
        const combatActionsEl = document.getElementById('combatActions');
        if (!combatActionsEl) return;

        // Access the global currentAttackList from character.js
        const attackList = window.currentAttackList || [];

        if (!attackList.length) {
          combatActionsEl.innerHTML = '<div class="text-muted fst-italic">No attacks or actions added.</div>';
          return;
        }

        let html = '';
        attackList.forEach((attack, index) => {
          const attackTypeLabel = {
            'melee-weapon': 'Melee Weapon',
            'ranged-weapon': 'Ranged Weapon',
            'melee-spell': 'Melee Spell',
            'ranged-spell': 'Ranged Spell',
            'save': 'Save DC',
            'other': 'Other'
          }[attack.type] || attack.type;

          html += `<div class="combat-action-item" data-attack-index="${index}">`;
          html += '<div class="d-flex justify-content-between align-items-start">';
          html += '<div class="flex-grow-1">';
          html += `<div class="combat-action-name">${attack.name || 'Unnamed Attack'}</div>`;
          html += `<div class="combat-action-detail">${attackTypeLabel}`;

          if (attack.range) {
            html += ` · ${attack.range}`;
          }

          if (attack.bonus) {
            html += ` · <span class="badge bg-primary bg-opacity-75">${attack.bonus} to hit</span>`;
          }

          if (attack.saveDC) {
            html += ` · <span class="badge bg-warning bg-opacity-75 text-dark">DC ${attack.saveDC}</span>`;
          }

          html += '</div>';

          if (attack.damage) {
            const dmgType = attack.damageType ? ` ${attack.damageType}` : '';
            html += `<div class="combat-action-detail"><strong>Damage:</strong> ${attack.damage}${dmgType}`;

            if (attack.damage2) {
              const dmgType2 = attack.damageType2 ? ` ${attack.damageType2}` : '';
              html += ` + ${attack.damage2}${dmgType2}`;
            }

            html += '</div>';
          }

          if (attack.notes) {
            html += `<div class="combat-action-detail small"><em>${attack.notes}</em></div>`;
          }

          html += '</div>'; // end flex-grow-1

          // Roll buttons - only show if there's a bonus (attack roll) or damage
          if (attack.bonus || attack.damage) {
            html += '<div class="combat-roll-buttons ms-2">';
            if (attack.bonus && attack.type !== 'save') {
              html += `<div class="btn-group btn-group-sm mb-1">
                <button type="button" class="btn btn-outline-primary combat-roll-hit" data-index="${index}" data-type="normal" title="Roll to hit">
                  <i class="bi bi-dice-5"></i> Hit
                </button>
                <button type="button" class="btn btn-outline-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                  <span class="visually-hidden">Toggle Dropdown</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end">
                  <li><a class="dropdown-item combat-roll-hit" href="#" data-index="${index}" data-type="advantage"><i class="bi bi-caret-up-fill text-success me-1"></i>Advantage</a></li>
                  <li><a class="dropdown-item combat-roll-hit" href="#" data-index="${index}" data-type="disadvantage"><i class="bi bi-caret-down-fill text-danger me-1"></i>Disadvantage</a></li>
                </ul>
              </div>`;
            }
            if (attack.damage) {
              html += `<div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-outline-danger combat-roll-damage" data-index="${index}" data-type="normal" title="Roll damage">
                  <i class="bi bi-fire"></i> Dmg
                </button>
                <button type="button" class="btn btn-outline-danger dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                  <span class="visually-hidden">Toggle Dropdown</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end">
                  <li><a class="dropdown-item combat-roll-damage" href="#" data-index="${index}" data-type="critical"><i class="bi bi-star-fill text-warning me-1"></i>Critical Hit</a></li>
                </ul>
              </div>`;
            }
            html += '</div>';
          }

          html += '</div>'; // end d-flex

          // Inline roll result area
          html += `<div class="combat-roll-result d-none" id="combatRollResult${index}"></div>`;

          html += '</div>'; // end combat-action-item
        });

        combatActionsEl.innerHTML = html;
      }

      // Function to render spells in combat view
      function updateCombatSpells() {
        const combatSpellsEl = document.getElementById('combatSpells');
        const combatSpellsSection = document.getElementById('combatSpellsSection');
        if (!combatSpellsEl || !combatSpellsSection) return;

        // Access the global currentSpellList from character.js
        const spellList = window.currentSpellList || [];

        if (!spellList.length) {
          combatSpellsSection.classList.add('d-none');
          return;
        }

        combatSpellsSection.classList.remove('d-none');

        // Determine if this character uses pact slots instead of regular slots
        const hasPactMagic = (parseInt(document.getElementById('pactMax')?.value, 10) || 0) > 0;

        // Group spells by level, preserving original array index for castSpell/rollSpellDice lookups
        const spellsByLevel = {};
        spellList.forEach((spell, originalIdx) => {
          const level = spell.level ?? 0;
          if (!spellsByLevel[level]) {
            spellsByLevel[level] = [];
          }
          spellsByLevel[level].push({ spell, originalIdx });
        });

        let html = '';

        // Sort levels (cantrips first, then 1-9)
        const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);

        levels.forEach(level => {
          const levelLabel = level === 0 ? 'Cantrips' : `Level ${level}`;
          const spells = spellsByLevel[level];

          html += `<div class="mb-2"><strong class="text-light">${levelLabel}</strong></div>`;

          spells.forEach(({ spell, originalIdx }) => {
            const title = spell.title || spell.name || 'Unknown';
            const prepared = spell.prepared ? '<span class="badge bg-success bg-opacity-75 ms-1" style="font-size: 0.7rem;">Prep</span>' : '';
            const isCantrip = level === 0;
            const sTags = Array.isArray(spell.tags) ? spell.tags.map(t => t.toLowerCase()) : [];
            const _sDmgTag = sTags.includes('damage') || sTags.some(t => t.includes('heal'));
            const _sHasDice = !!(spell.damage_dice || spell.heal_dice) || /\d+d\d+/.test(spell.body || '');
            const hasRoll = _sDmgTag && _sHasDice;
            const isSpellAttack = sTags.includes('attack');
            const rollLabel = isSpellAttack ? 'Atk' : (sTags.some(t => t.includes('heal')) && !sTags.includes('damage') ? 'Heal' : 'Dmg');
            const rollTitle = isSpellAttack ? 'Roll spell attack + damage' : 'Roll damage/healing dice';

            html += `<div class="combat-spell-item d-flex justify-content-between align-items-start" data-spell-index="${originalIdx}" data-spell-level="${level}">`;
            html += '<div class="flex-grow-1">';
            html += `<div class="combat-spell-name">${title} ${prepared}</div>`;

            const meta = [];
            if (spell.school) meta.push(spell.school);
            if (spell.casting_time) meta.push(`Cast: ${spell.casting_time}`);
            if (spell.range) meta.push(`Range: ${spell.range}`);
            if (spell.concentration) meta.push('Concentration');

            if (meta.length) {
              html += `<div class="combat-spell-meta">${meta.join(' · ')}</div>`;
            }

            html += '</div>';

            // Button column: Cast + optional Roll
            html += '<div class="d-flex flex-column gap-1 ms-2">';
            html += `<button type="button" class="btn btn-outline-warning combat-cast-btn"
              data-spell-index="${originalIdx}"
              data-spell-level="${level}"
              data-spell-name="${title.replace(/"/g, '&quot;')}"
              title="${isCantrip ? 'Cast cantrip' : hasPactMagic ? 'Cast using pact slot' : 'Cast using spell slot'}">
              <i class="bi bi-magic"></i> Cast
            </button>`;
            if (hasRoll) {
              html += `<button type="button" class="btn btn-outline-info combat-roll-btn"
                data-spell-index="${originalIdx}"
                title="${rollTitle}">
                <i class="bi bi-dice-6"></i> ${rollLabel}
              </button>`;
            }
            html += '</div>';

            html += '</div>';
          });
        });

        combatSpellsEl.innerHTML = html;
      }

      // ========================================
      // Interactive HP Functions
      // ========================================

      // Update the combat HP display (called by updateCombatCardView and after HP changes)
      function updateCombatHP() {
        const currentHp = parseInt(document.getElementById('charCurrentHP')?.value, 10) || 0;
        const maxHp = parseInt(document.getElementById('charMaxHP')?.value, 10) || 1;
        const tempHp = parseInt(document.getElementById('charTempHP')?.value, 10) || 0;

        // Update HP values
        const currentEl = document.getElementById('combatCurrentHP');
        const maxEl = document.getElementById('combatMaxHP');
        const tempEl = document.getElementById('combatTempHP');
        const tempDisplay = document.getElementById('combatTempHPDisplay');
        const hpBarFill = document.getElementById('combatHPBarFill');

        if (currentEl) currentEl.textContent = currentHp;
        if (maxEl) maxEl.textContent = maxHp;

        // Show/hide temp HP
        if (tempHp > 0) {
          if (tempEl) tempEl.textContent = tempHp;
          if (tempDisplay) tempDisplay.classList.remove('d-none');
        } else {
          if (tempDisplay) tempDisplay.classList.add('d-none');
        }

        // Update HP bar
        if (hpBarFill) {
          const percentage = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
          hpBarFill.style.width = percentage + '%';

          // Update color class
          hpBarFill.classList.remove('hp-full', 'hp-mid', 'hp-low');
          if (percentage > 50) {
            hpBarFill.classList.add('hp-full');
          } else if (percentage > 25) {
            hpBarFill.classList.add('hp-mid');
          } else {
            hpBarFill.classList.add('hp-low');
          }
        }
      }

      // Toggle HP controls visibility
      function toggleCombatHPControls(event) {
        event.stopPropagation();
        const controls = document.getElementById('combatHPControls');
        if (!controls) return;
        // Clicks inside the controls (input/buttons) should not close the panel
        if (controls.contains(event.target)) return;
        controls.classList.toggle('d-none');
        // Focus the amount input when opening
        if (!controls.classList.contains('d-none')) {
          controls.querySelector('#combatHPAdjAmount')?.focus();
        }
      }

      // Close HP controls when clicking outside
      document.addEventListener('click', function(e) {
        const hpBox = document.getElementById('combatHPBox');
        const controls = document.getElementById('combatHPControls');
        if (controls && hpBox && !hpBox.contains(e.target)) {
          controls.classList.add('d-none');
        }
      });

      // Handle HP actions (damage, heal, temp)
      window.handleCombatHP = function(action) {

        const currentHpInput = document.getElementById('charCurrentHP');
        const maxHpInput = document.getElementById('charMaxHP');
        const tempHpInput = document.getElementById('charTempHP');

        if (!currentHpInput || !maxHpInput) return;

        const currentHp = parseInt(currentHpInput.value, 10) || 0;
        const maxHp = parseInt(maxHpInput.value, 10) || 1;
        const tempHp = parseInt(tempHpInput?.value, 10) || 0;

        let amount;

        if (action === 'max') {
          // Max restore — no amount needed
        } else {
          // Read from the combat amount input, fall back to the sheet input
          const combatAmtEl = document.getElementById('combatHPAdjAmount');
          const sheetAmtEl  = document.getElementById('hpAdjustAmount');
          const raw = combatAmtEl?.value || sheetAmtEl?.value || '';
          amount = parseInt(raw, 10);
          if (isNaN(amount) || amount <= 0) {
            combatAmtEl?.focus();
            return;
          }
        }

        let newCurrentHp = currentHp;
        let newTempHp = tempHp;
        let damageToConcentration = 0;

        if (action === 'damage') {
          damageToConcentration = amount;
          // Temp HP absorbs damage first
          if (newTempHp > 0) {
            if (amount <= newTempHp) {
              newTempHp -= amount;
              amount = 0;
            } else {
              amount -= newTempHp;
              newTempHp = 0;
            }
          }
          newCurrentHp = Math.max(0, newCurrentHp - amount);
        } else if (action === 'heal') {
          newCurrentHp = Math.min(maxHp, newCurrentHp + amount);
          if (newCurrentHp > 0 && typeof window.resetDeathSaves === 'function') {
            window.resetDeathSaves();
          }
        } else if (action === 'temp') {
          newTempHp = Math.max(newTempHp, amount);
        } else if (action === 'max') {
          newCurrentHp = maxHp;
          newTempHp = 0;
        }

        // Update the main form inputs
        currentHpInput.value = newCurrentHp;
        if (tempHpInput) tempHpInput.value = newTempHp;

        // Clear amount inputs after applying
        const _combatAmt = document.getElementById('combatHPAdjAmount');
        const _sheetAmt  = document.getElementById('hpAdjustAmount');
        if (_combatAmt) _combatAmt.value = '';
        if (_sheetAmt)  _sheetAmt.value  = '';

        // Trigger change event to sync and save
        currentHpInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Update combat HP display
        updateCombatHP();

        // Check for concentration if damaged
        if (action === 'damage' && damageToConcentration > 0) {
          if (typeof window.handleConcentrationCheck === 'function') {
            window.handleConcentrationCheck(damageToConcentration);
            // Update combat conditions display after potential concentration loss
            updateCombatConditions();
          }
        }

        // Save character if the function exists
        if (typeof window.saveCurrentCharacter === 'function') {
          window.saveCurrentCharacter();
        }
      };

      // HP box click handler (toggle panel open/close)
      const combatHPBox = document.getElementById('combatHPBox');
      if (combatHPBox) {
        combatHPBox.addEventListener('click', toggleCombatHPControls);
      }

      // Combat HP action buttons (delegation — stops propagation so panel stays open)
      const combatHPControls = document.getElementById('combatHPControls');
      if (combatHPControls) {
        combatHPControls.addEventListener('click', function(e) {
          e.stopPropagation();
          const btn = e.target.closest('[data-combat-hp]');
          if (btn) window.handleCombatHP(btn.dataset.combatHp);
        });
        // Enter key on the amount input triggers Heal
        combatHPControls.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.stopPropagation(); window.handleCombatHP('heal'); }
        });
      }

      // ========================================
      // Combat Dice Rolling Functions
      // ========================================

      // The dice rules (parsing, critical doubling, Great Weapon Fighting rerolls, Savage Attacker,
      // d20 advantage) live in the shared engine, js/modules/dice-engine.js, loaded in <head> as
      // window.DiceEngine. This section only turns its results into the breakdown text shown here.

      // Older saved attacks sometimes carry the damage type inside the notation ("1d8+3 slashing").
      // The engine (DiceEngine.normalizeLegacyDamageNotation) drops the trailing words; this wrapper
      // also warns so the saved data can be found and fixed. Whatever the engine still rejects
      // ("2d6+ fire", "4d6kh", "hello world") rolls 0.
      // Diagnostics name the saved string, but never echo a huge one.
      function describeSavedText(text) {
        const s = String(text);
        return s.length > 80 ? `${s.slice(0, 80)}... (${s.length} characters)` : s;
      }
      function normalizeLegacyDamageNotation(notation) {
        const text = String(notation);
        const cleaned = DiceEngine.normalizeLegacyDamageNotation(text); // the same cleanup the sheet's damage rolls use
        if (cleaned.trimEnd() !== text.trimEnd()) { // trailing spaces alone are not "dropped text"
          console.warn(`Combat Mode: dropped trailing text from saved dice notation "${describeSavedText(text)}"; rolling "${cleaned}"`);
        }
        return cleaned;
      }

      // Roll dice notation such as "2d6+3". `doubleDice` doubles the dice for a critical hit;
      // `features` is { rerollLowDice, rollTwiceTakeBest }. A bare number ("5") or a multi-group
      // expression ("2d6+1d4") is rolled by the engine's expression roller; anything unreadable is 0.
      // `savedText` is the string as it was saved (for diagnostics), when `notation` was already
      // cleaned or adjusted by the caller.
      function parseDiceAndRoll(notation, doubleDice = false, features = {}, savedText = notation) {
        if (!notation) return { total: 0, breakdown: '0', rolls: [] };
        notation = normalizeLegacyDamageNotation(notation);

        // A critical hit on a single dice group doubles it. If doubling would pass the engine's dice
        // limit the crit is refused; it must not quietly roll normal damage instead.
        let critNotation = null;
        if (doubleDice && DiceEngine.parseDiceNotation(notation)) {
          critNotation = DiceEngine.getCriticalHitNotation(notation);
          if (!critNotation) {
            console.warn(`Combat Mode: a critical hit on "${describeSavedText(savedText)}" would pass the ${DiceEngine.MAX_DICE_COUNT}-dice limit; rolling 0`);
            return { total: 0, breakdown: '0', rolls: [] };
          }
        } // (a bare number or several groups have no single group to double and are rolled as written)
        const rolled = DiceEngine.rollDiceNotation(critNotation || notation, undefined, features);
        if (rolled) {
          const modStr = rolled.modifier >= 0 ? `+${rolled.modifier}` : String(rolled.modifier);
          const breakdown = `${rolled.count}d${rolled.sides}${modStr} = [${rolled.rolls.join(', ')}]${modStr} = ${rolled.total}${DiceEngine.describeFeatureRoll(rolled)}`;
          return { total: rolled.total, breakdown, rolls: rolled.rolls, sides: rolled.sides, modifier: rolled.modifier };
        }

        const expr = DiceEngine.rollDiceExpression(notation);
        if (!expr) {
          const cleanedNote = notation !== savedText ? ` (as rolled: "${describeSavedText(notation)}")` : '';
          console.warn(`Combat Mode: could not read dice notation "${describeSavedText(savedText)}"${cleanedNote}; rolling 0`);
          return { total: 0, breakdown: '0', rolls: [] };
        }
        const rolls = expr.parts.flatMap(part => part.rolls || []);
        const modifier = expr.parts.reduce((n, part) => n + (part.type === 'mod' ? part.n : 0), 0);
        const breakdown = rolls.length ? `${notation} = [${rolls.join(', ')}] = ${expr.total}` : String(expr.total);
        return { total: expr.total, breakdown, rolls, modifier };
      }

      // Roll attack (d20 + bonus)
      function rollCombatAttack(attackIndex, rollType) {
        try {
          const attackList = window.currentAttackList || [];
          const attack = attackList[attackIndex];
          if (!attack || !attack.bonus) return;

          // Auto-mark the Action slot (silent=true so Extra Attack doesn't pop dialogs)
          if (typeof window.triggerActionEconomy === 'function') {
            window.triggerActionEconomy('actionUsed', true);
          }

          const bonus = parseInt(attack.bonus, 10) || 0;
          const d20 = DiceEngine.rollD20(rollType);
          const roll1 = d20.rolls[0];
          const roll2 = d20.rolls[1] ?? null;
          const finalRoll = d20.chosen;
          const advantage = d20.isAdvantage ? 'Advantage' : d20.isDisadvantage ? 'Disadvantage' : null;

          const total = finalRoll + bonus;
          const isCrit = finalRoll === 20;
          const isFumble = finalRoll === 1;

          // Build result display
          let html = '<div class="d-flex align-items-center gap-2">';
          html += `<span class="roll-total ${isCrit ? 'roll-crit' : ''} ${isFumble ? 'roll-fumble' : ''}">${total}</span>`;
          html += '<span class="small text-muted">';
          if (advantage) {
            html += `${advantage}: [${roll1}, ${roll2}] → ${finalRoll}`;
          } else {
            html += `d20: ${finalRoll}`;
          }
          const bonusStr = bonus >= 0 ? `+${bonus}` : String(bonus);
          html += ` ${bonusStr}`;
          if (isCrit) html += ' <span class="badge bg-success">CRIT!</span>';
          if (isFumble) html += ' <span class="badge bg-danger">FUMBLE!</span>';
          html += '</span></div>';

          showInlineRollResult(attackIndex, html);

          // Add to roll history if available
          try {
            if (typeof window.addToRollHistory === 'function') {
              const rollsArray = advantage ? [roll1, roll2] : [finalRoll];
              window.addToRollHistory({
                notation: advantage ? '2d20' : '1d20',
                description: `${attack.name} (${rollType === 'normal' ? 'Attack' : advantage})`,
                rolls: rollsArray,
                chosen: finalRoll,
                modifier: bonus,
                total: total,
                timestamp: new Date().toISOString(),
                isCritical: isCrit,
                isFumble: isFumble,
                isAdvantage: rollType === 'advantage',
                isDisadvantage: rollType === 'disadvantage'
              });
            }
          } catch (e) { /* ignore history errors */ }

          // Show toast
          try {
            if (typeof window.showRollToast === 'function') {
              window.showRollToast(`${attack.name} Attack`, total, isCrit ? 'Critical!' : isFumble ? 'Fumble!' : null);
            }
          } catch (e) { /* ignore toast errors */ }
        } catch (err) {
          console.error('Error rolling attack:', err);
        }
      }

      // Roll damage
      function rollCombatDamage(attackIndex, rollType) {
        try {
          const attackList = window.currentAttackList || [];
          const attack = attackList[attackIndex];
          if (!attack || !attack.damage) return;

          const isCrit = rollType === 'critical';

          // Apply always-on feature bonuses (Dueling +2, Improved Divine Smite, GWF, SA, etc.)
          const char = window.getCurrentCharacter?.();
          const { flatBonus, extraRolls, rerollLowDice, rollTwiceTakeBest } =
            window.getAttackFeatureBonuses?.(char, attack) || { flatBonus: 0, extraRolls: [], rerollLowDice: false, rollTwiceTakeBest: false };
          // Clean legacy trailing text first, so a flat bonus (Dueling, ...) is applied to real dice
          // notation. The engine still validates the result when it rolls.
          const damageNotation = normalizeLegacyDamageNotation(attack.damage);
          const mainNotation = (flatBonus && window.addFlatBonusToNotation)
            ? window.addFlatBonusToNotation(damageNotation, flatBonus)
            : damageNotation;
          const diceFeatures = { rerollLowDice, rollTwiceTakeBest };

          // Ask about concentration bonus before any dice are rolled so the answer
          // is included in the same result display (Hex, Hunter's Mark, Spirit Shroud)
          const concBonus = window.getConcentrationAttackBonus?.();
          const applyConc = concBonus ? confirm(concBonus.prompt) : false;

          const result1 = parseDiceAndRoll(mainNotation, isCrit, diceFeatures, attack.damage);
          let total = result1.total;
          let breakdown = result1.breakdown;
          if (flatBonus) breakdown += ` <span class="text-info-emphasis">(+${flatBonus})</span>`;

          // The attack's own damage (main + secondary) is one roll-history entry; feature and
          // concentration extras below are logged separately, so they are not part of these numbers.
          const allRolls = [...(result1.rolls || [])];
          let mod = result1.modifier || 0;
          let attackDamage = result1.total;
          let historyNotation = mainNotation;

          // Handle secondary damage
          if (attack.damage2) {
            const result2 = parseDiceAndRoll(attack.damage2, isCrit);
            total += result2.total;
            breakdown += ` + ${result2.breakdown}`;
            allRolls.push(...(result2.rolls || []));
            mod += result2.modifier || 0;
            attackDamage += result2.total;
            historyNotation += ` + ${attack.damage2}`;
          }

          // Extra feature rolls (e.g. Improved Divine Smite 1d8 radiant)
          extraRolls.forEach(({ notation: en, label }) => {
            const rx = parseDiceAndRoll(en, isCrit);
            total += rx.total;
            breakdown += ` + ${rx.breakdown} <span class="text-warning-emphasis">${label}</span>`;
            if (typeof window.addToRollHistory === 'function') {
              window.addToRollHistory({
                notation: en + (isCrit ? ' (crit)' : ''),
                description: `${attack.name} - ${label}${isCrit ? ' (Crit)' : ''}`,
                rolls: rx.rolls, modifier: rx.modifier || 0,
                total: rx.total, timestamp: new Date().toISOString()
              });
            }
          });

          // Concentration bonus (Hex, Hunter's Mark, Spirit Shroud — crits don't double these)
          if (applyConc) {
            const cr = parseDiceAndRoll(concBonus.notation, false);
            total += cr.total;
            breakdown += ` + ${cr.breakdown} <span class="text-info-emphasis">${concBonus.label}</span>`;
            if (typeof window.addToRollHistory === 'function') {
              window.addToRollHistory({
                notation: concBonus.notation,
                description: `${attack.name} - ${concBonus.label}`,
                rolls: cr.rolls, modifier: cr.modifier || 0,
                total: cr.total, timestamp: new Date().toISOString()
              });
            }
          }

          // Build result display
          const dmgType = attack.damageType || '';
          let html = '<div class="d-flex align-items-center gap-2">';
          html += `<span class="roll-total text-danger">${total}</span>`;
          html += `<span class="small text-muted">${breakdown}`;
          if (dmgType) html += ` ${dmgType}`;
          if (isCrit) html += ' <span class="badge bg-warning text-dark">CRIT!</span>';
          html += '</span></div>';

          showInlineRollResult(attackIndex, html);

          // Add to roll history
          try {
            if (typeof window.addToRollHistory === 'function') {
              window.addToRollHistory({
                notation: historyNotation + (isCrit ? ' (crit)' : ''),
                description: `${attack.name} Damage${isCrit ? ' (Crit)' : ''}`,
                rolls: allRolls,
                modifier: mod,
                total: attackDamage,
                timestamp: new Date().toISOString(),
                isCritical: false,
                isFumble: false
              });
            }
          } catch (e) { /* ignore history errors */ }

          // Show toast
          try {
            if (typeof window.showRollToast === 'function') {
              window.showRollToast(`${attack.name} Damage`, total, isCrit ? 'Critical!' : null);
            }
          } catch (e) { /* ignore toast errors */ }
        } catch (err) {
          console.error('Error rolling damage:', err);
        }
      }

      // Show inline roll result
      function showInlineRollResult(attackIndex, html) {
        const resultEl = document.getElementById(`combatRollResult${attackIndex}`);
        if (resultEl) {
          resultEl.innerHTML = html;
          resultEl.classList.remove('d-none');

          // Auto-hide after 10 seconds
          setTimeout(() => {
            resultEl.classList.add('d-none');
          }, 10000);
        }
      }

      // Roll saving throw from combat view
      function _combatD20Roll(rollType) {
        const d20 = DiceEngine.rollD20(rollType);
        return { chosen: d20.chosen, rolls: d20.rolls, isAdv: d20.isAdvantage, isDisadv: d20.isDisadvantage };
      }

      function _combatRollAndShow(label, bonusVal, rollType, flashSelector, flashValueSelector) {
        try {
          const { chosen, rolls, isAdv, isDisadv } = _combatD20Roll(rollType);
          const total = chosen + bonusVal;
          const isCrit = chosen === 20, isFumble = chosen === 1;
          const typeLabel = isAdv ? ' (Adv)' : isDisadv ? ' (Disadv)' : '';
          try {
            if (typeof window.addToRollHistory === 'function') {
              window.addToRollHistory({
                notation: isAdv||isDisadv ? '2d20' : '1d20', description: label+typeLabel,
                rolls, chosen, modifier: bonusVal, total,
                timestamp: new Date().toISOString(), isCritical: isCrit, isFumble,
                isAdvantage: isAdv, isDisadvantage: isDisadv
              });
            }
          } catch(e) {}
          const extra = isCrit ? 'Natural 20!' : isFumble ? 'Natural 1!' : null;
          if (typeof window.showRollToast === 'function') {
            window.showRollToast(label+typeLabel, total, extra);
          }
          // Flash the box value briefly
          if (flashSelector) {
            const box = typeof flashSelector === 'string' ? document.querySelector(flashSelector) : flashSelector;
            const el  = flashValueSelector ? box?.querySelector(flashValueSelector) : box;
            if (el) {
              const orig = el.textContent;
              el.innerHTML = `<span class="${isCrit?'text-success':isFumble?'text-danger':''}">${total}</span>`;
              setTimeout(() => { el.textContent = orig; }, 2000);
            }
          }
        } catch(err) { console.error(err); }
      }

      function rollCombatSave(ability, rollType = 'normal') {
        const bonus = parseInt(document.getElementById(`save${ability}Bonus`)?.value, 10) || 0;
        const names = { Str:'Strength', Dex:'Dexterity', Con:'Constitution', Int:'Intelligence', Wis:'Wisdom', Cha:'Charisma' };
        _combatRollAndShow(`${names[ability]||ability} Save`, bonus, rollType,
          `#combatSave${ability}Box`, '.combat-save-value');
      }

      function rollCombatAbilityCheck(ability, rollType = 'normal') {
        const modifier = parseInt(document.getElementById(`mod${ability}`)?.value, 10) || 0;
        const names = { Str:'Strength', Dex:'Dexterity', Con:'Constitution', Int:'Intelligence', Wis:'Wisdom', Cha:'Charisma' };
        _combatRollAndShow(`${names[ability]||ability} Check`, modifier, rollType,
          `.combat-ability-box[data-ability="${ability}"]`, '.combat-ability-mod');
      }

      // Roll initiative from combat view
      function rollCombatInitiative() {
        try {
          // Get initiative modifier (usually DEX mod, but could have other bonuses)
          const initModEl = document.getElementById('charInitMod');
          const dexModEl = document.getElementById('modDex');

          // Use charInitMod if available, otherwise use DEX mod
          let bonus = 0;
          if (initModEl && initModEl.value) {
            bonus = parseInt(initModEl.value, 10) || 0;
          } else if (dexModEl) {
            bonus = parseInt(dexModEl.value, 10) || 0;
          }

          // Check for initiative advantage features and notify before rolling
          try {
            const _char = window.getCurrentCharacter?.();
            const _advantages = window.getInitiativeAdvantageReason?.(_char);
            if (_advantages) {
              const _tips = _advantages.map(a => a.tip).join(' · ');
              window.showAppToast?.(`Initiative reminder: ${_tips}`, 'info', 5000); // (message, type, delay ms)
            }
          } catch (e) { /* non-fatal */ }

          const roll = DiceEngine.rollDie(20);
          const total = roll + bonus;
          const isCrit = roll === 20;
          const isFumble = roll === 1;

          const bonusStr = bonus >= 0 ? `+${bonus}` : String(bonus);

          // Try to add to roll history (optional)
          try {
            if (typeof window.addToRollHistory === 'function') {
              window.addToRollHistory({
                notation: '1d20',
                description: 'Initiative',
                rolls: [roll],
                modifier: bonus,
                total: total,
                timestamp: new Date().toISOString(),
                isCritical: isCrit,
                isFumble: isFumble
              });
            }
          } catch (e) { /* ignore history errors */ }

          // Try to show toast, fallback to alert
          let toastShown = false;
          try {
            if (typeof window.showRollToast === 'function') {
              let extra = null;
              if (isCrit) extra = 'Natural 20!';
              if (isFumble) extra = 'Natural 1!';
              window.showRollToast('Initiative', total, extra);
              toastShown = true;
            }
          } catch (e) { /* ignore toast errors */ }

          if (!toastShown) {
            let result = `Initiative: ${total}\n(d20: ${roll} ${bonusStr})`;
            if (isCrit) result += '\nNatural 20!';
            if (isFumble) result += '\nNatural 1!';
            alert(result);
          }

          // Update the initiative box to show the result briefly
          const initBox = document.getElementById('combatInitiativeBox');
          if (initBox) {
            const valueEl = initBox.querySelector('.combat-stat-value');
            const originalText = valueEl?.textContent;
            if (valueEl) {
              valueEl.innerHTML = `<span class="${isCrit ? 'text-success' : isFumble ? 'text-danger' : 'text-warning'}">${total}</span>`;
              setTimeout(() => {
                valueEl.textContent = originalText;
              }, 3000);
            }
          }
        } catch (err) {
          console.error('Error rolling initiative:', err);
          alert('Error rolling initiative. Check console for details.');
        }
      }

      // Initiative box click handler
      const combatInitBox = document.getElementById('combatInitiativeBox');
      if (combatInitBox) {
        combatInitBox.addEventListener('click', rollCombatInitiative);
      }

      // Event delegation for combat roll buttons
      const combatActionsEl = document.getElementById('combatActions');
      if (combatActionsEl) {
        combatActionsEl.addEventListener('click', function(e) {
          const hitBtn = e.target.closest('.combat-roll-hit');
          const dmgBtn = e.target.closest('.combat-roll-damage');

          if (hitBtn) {
            e.preventDefault();
            const index = parseInt(hitBtn.dataset.index, 10);
            const type = hitBtn.dataset.type || 'normal';
            rollCombatAttack(index, type);
          }

          if (dmgBtn) {
            e.preventDefault();
            const index = parseInt(dmgBtn.dataset.index, 10);
            const type = dmgBtn.dataset.type || 'normal';
            rollCombatDamage(index, type);
          }
        });
      }

      // ── shared adv/disadv popup helper ─────────────────────────────────────
      let _openPopup = null;

      function _showRollPopupAtEl(el, rollFn) {
        if (_openPopup) { _openPopup.remove(); _openPopup = null; }
        const popup = document.createElement('div');
        popup.className = 'combat-roll-popup';
        popup.innerHTML = `
          <button class="btn btn-sm btn-outline-success"  data-rtype="advantage">▲ Advantage</button>
          <button class="btn btn-sm btn-outline-secondary" data-rtype="normal">● Normal</button>
          <button class="btn btn-sm btn-outline-danger"   data-rtype="disadvantage">▼ Disadvantage</button>`;
        const rect = el.getBoundingClientRect();
        popup.style.position = 'absolute';
        popup.style.top  = `${rect.bottom + window.scrollY + 4}px`;
        popup.style.left = `${rect.left  + window.scrollX}px`;
        document.body.appendChild(popup);
        _openPopup = popup;
        popup.addEventListener('click', ev => {
          const btn = ev.target.closest('[data-rtype]');
          if (btn) { rollFn(btn.dataset.rtype); popup.remove(); _openPopup = null; }
          ev.stopPropagation();
        });
        const dismiss = () => {
          popup.remove(); _openPopup = null;
          document.removeEventListener('click', dismiss);
          document.removeEventListener('touchstart', dismiss);
        };
        setTimeout(() => {
          document.addEventListener('click', dismiss);
          document.addEventListener('touchstart', dismiss);
        }, 0);
      }

      // Long-press (mobile) popup support — wires to any grid with roll buttons
      function _addLongPressPopup(grid, selector, rollFnFromEl) {
        let _lpTimer = null;
        grid.addEventListener('touchstart', function(e) {
          const el = e.target.closest(selector);
          if (!el) return;
          _lpTimer = setTimeout(() => {
            _lpTimer = null;
            _showRollPopupAtEl(el, rollFnFromEl(el));
          }, 500);
        }, { passive: true });
        const cancelLp = () => { clearTimeout(_lpTimer); _lpTimer = null; };
        grid.addEventListener('touchend',   cancelLp);
        grid.addEventListener('touchmove',  cancelLp);
        grid.addEventListener('touchcancel', cancelLp);
      }

      // Event delegation for save boxes
      const combatSavesGrid = document.getElementById('combatSavesGrid');
      if (combatSavesGrid) {
        combatSavesGrid.addEventListener('click', function(e) {
          const saveBox = e.target.closest('.combat-save-box');
          if (!saveBox) return;
          const ability = saveBox.dataset.ability;
          if (!ability) return;
          const rollType = e.shiftKey ? 'advantage' : (e.ctrlKey||e.metaKey) ? 'disadvantage' : 'normal';
          rollCombatSave(ability, rollType);
        });
        combatSavesGrid.addEventListener('contextmenu', function(e) {
          const saveBox = e.target.closest('.combat-save-box');
          if (!saveBox) return;
          const ability = saveBox.dataset.ability;
          if (!ability) return;
          e.preventDefault();
          _showRollPopupAtEl(saveBox, type => rollCombatSave(ability, type));
        });
        _addLongPressPopup(combatSavesGrid, '.combat-save-box', el => type => rollCombatSave(el.dataset.ability, type));
      }

      // Event delegation for ability check boxes
      const combatAbilityGrid = document.getElementById('combatAbilityGrid');
      if (combatAbilityGrid) {
        combatAbilityGrid.addEventListener('click', function(e) {
          const abilityBox = e.target.closest('.combat-ability-box');
          if (!abilityBox) return;
          const ability = abilityBox.dataset.ability;
          if (!ability) return;
          const rollType = e.shiftKey ? 'advantage' : (e.ctrlKey||e.metaKey) ? 'disadvantage' : 'normal';
          rollCombatAbilityCheck(ability, rollType);
        });
        combatAbilityGrid.addEventListener('contextmenu', function(e) {
          const abilityBox = e.target.closest('.combat-ability-box');
          if (!abilityBox) return;
          const ability = abilityBox.dataset.ability;
          if (!ability) return;
          e.preventDefault();
          _showRollPopupAtEl(abilityBox, type => rollCombatAbilityCheck(ability, type));
        });
        _addLongPressPopup(combatAbilityGrid, '.combat-ability-box', el => type => rollCombatAbilityCheck(el.dataset.ability, type));
      }

      // ========================================
      // Dice History Modal Functions
      // ========================================

      // Render dice history in modal
      function renderDiceHistoryModal() {
        const listEl = document.getElementById('diceHistoryModalList');
        if (!listEl) return;

        // Access the global roll history from character.js
        const history = window.rollHistory || [];

        if (!history.length) {
          listEl.innerHTML = '<div class="p-4 text-center text-muted"><i class="bi bi-dice-5 fs-1 mb-2 d-block opacity-50"></i>No dice rolls yet.<br>Roll some dice to see history here!</div>';
          return;
        }

        let html = '';
        history.forEach((roll) => {
          const isCrit   = roll.isCritical || false;
          const isFumble = roll.isFumble   || false;

          let resultClass = '';
          let badgeClass  = 'bg-secondary';
          if (isCrit)   { resultClass = 'text-success fw-bold'; badgeClass = 'bg-success'; }
          if (isFumble) { resultClass = 'text-danger fw-bold';  badgeClass = 'bg-danger'; }

          // Format timestamp
          let timeStr = '';
          if (roll.timestamp) {
            timeStr = new Date(roll.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          // Icon inferred from description
          const desc = (roll.description || '').toLowerCase();
          let icon = 'bi-dice-5';
          if (desc.includes('attack'))    icon = 'bi-crosshair';
          else if (desc.includes('damage') || desc.includes('healing')) icon = 'bi-fire';
          else if (desc.includes('save'))  icon = 'bi-shield-check';
          else if (desc.includes('check') || desc.includes('initiative')) icon = 'bi-person-check';

          // Format individual rolls
          let rollDisplay = '';
          if (Array.isArray(roll.rolls)) {
            if (roll.isAdvantage || roll.isDisadvantage) {
              rollDisplay = `[${roll.rolls[0]}, ${roll.rolls[1]}] → <span class="${resultClass}">${roll.chosen ?? roll.total}</span>`;
            } else {
              rollDisplay = roll.rolls.length > 1
                ? `[${roll.rolls.join(', ')}]`
                : `<span class="${resultClass}">${roll.rolls[0]}</span>`;
            }
          }

          const modDisplay = (roll.modifier && roll.modifier !== 0)
            ? ` ${roll.modifier >= 0 ? '+' : ''}${roll.modifier}`
            : '';

          html += `
            <div class="dice-history-item d-flex align-items-center gap-3 p-2 border-bottom border-secondary">
              <div class="badge ${badgeClass} fs-5 flex-shrink-0">${roll.total ?? '?'}</div>
              <div class="flex-grow-1">
                <div class="fw-bold small"><i class="bi ${icon} me-1 text-muted"></i>${roll.description || 'Roll'}</div>
                <div class="small text-muted">${roll.notation || ''}${modDisplay}</div>
                ${rollDisplay ? `<div class="small">${rollDisplay}${modDisplay ? ` = <span class="${resultClass}">${roll.total}</span>` : ''}</div>` : ''}
              </div>
              <div class="small text-muted text-end flex-shrink-0">${timeStr}</div>
            </div>
          `;
        });

        listEl.innerHTML = html;
      }

      // Render on modal open
      const diceHistoryModal = document.getElementById('diceHistoryModal');
      if (diceHistoryModal) {
        diceHistoryModal.addEventListener('show.bs.modal', renderDiceHistoryModal);
      }

      // Clear history button
      const clearHistoryBtn = document.getElementById('clearDiceHistoryModalBtn');
      if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function() {
          if (confirm('Clear all dice roll history?')) {
            if (window.rollHistory) {
              window.rollHistory.length = 0;
            }
            // Also clear the existing roll history display if it exists
            if (typeof window.renderRollHistory === 'function') {
              window.renderRollHistory();
            }
            renderDiceHistoryModal();
          }
        });
      }

      // ========================================
      // Spell Casting Functions
      // ========================================

      /**
       * Returns sorted array of available slot options for casting a spell of spellBaseLevel or higher.
       * Each entry: { level, remaining, max, isPact }
       */
      function getAvailableSlotLevels(spellBaseLevel) {
        const options = [];
        for (let lvl = spellBaseLevel; lvl <= 9; lvl++) {
          const max  = parseInt(document.getElementById(`slots${lvl}Max`)?.value, 10) || 0;
          const used = parseInt(document.getElementById(`slots${lvl}Used`)?.value, 10) || 0;
          const rem  = Math.max(0, max - used);
          if (max > 0 && rem > 0) options.push({ level: lvl, remaining: rem, max, isPact: false });
        }
        const pMax  = parseInt(document.getElementById('pactMax')?.value,   10) || 0;
        const pUsed = parseInt(document.getElementById('pactUsed')?.value,  10) || 0;
        const pLvl  = parseInt(document.getElementById('pactLevel')?.value, 10) || 1;
        const pRem  = Math.max(0, pMax - pUsed);
        if (pMax > 0 && pRem > 0 && pLvl >= spellBaseLevel) {
          options.push({ level: pLvl, remaining: pRem, max: pMax, isPact: true });
        }
        options.sort((a, b) => a.level - b.level || (a.isPact ? 1 : -1));
        return options;
      }

      /**
       * Computes upcast dice for a spell cast at castLevel.
       * Returns array of notation strings. Merges dice when die types match.
       * Requires spell.higher_level_dice (e.g. "1d6") to be present for scaling.
       */
      function computeUpcastDice(spell, castLevel) {
        const levelsAbove = castLevel - (spell.level || 1);
        const baseDice    = spell.damage_dice || spell.heal_dice || '';
        const higherDice  = spell.higher_level_dice || '';

        if (levelsAbove <= 0 || !higherDice || !baseDice) {
          return baseDice ? baseDice.split(',').map(d => d.trim()) : [];
        }

        const baseM   = baseDice.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
        const higherM = higherDice.match(/^(\d+)d(\d+)([+-]\d+)?$/i);

        if (baseM && higherM && baseM[2] === higherM[2]) {
          // Same die type — merge counts and scale modifier (e.g. Magic Missile 1d4+1 per extra dart)
          const newCount = parseInt(baseM[1]) + levelsAbove * parseInt(higherM[1]);
          const baseMod  = parseInt(baseM[3]   || '0');
          const extraMod = parseInt(higherM[3] || '0');
          const newMod   = baseMod + levelsAbove * extraMod;
          const modStr   = newMod > 0 ? `+${newMod}` : newMod < 0 ? `${newMod}` : '';
          return [`${newCount}d${baseM[2]}${modStr}`];
        }

        // Different die types — append extra dice as a second entry
        const extraCount = levelsAbove * parseInt(higherM?.[1] || '1');
        const extraDie   = higherM?.[2] || '6';
        return [...baseDice.split(',').map(d => d.trim()), `${extraCount}d${extraDie}`];
      }

      // Get spell slot status for a level
      function getPactSlotStatus() {
        const pactMax  = parseInt(document.getElementById('pactMax')?.value,  10) || 0;
        const pactUsed = parseInt(document.getElementById('pactUsed')?.value, 10) || 0;
        const pactLevel = parseInt(document.getElementById('pactLevel')?.value, 10) || 1;
        const remaining = Math.max(0, pactMax - pactUsed);
        const percentage = pactMax > 0 ? (remaining / pactMax) * 100 : 0;
        return { max: pactMax, used: pactUsed, remaining, percentage, pactLevel, isCantrip: false, isPact: true };
      }

      function getSpellSlotStatus(level) {
        if (level === 0) return { max: 0, used: 0, remaining: Infinity, percentage: 100, isCantrip: true };

        const maxEl = document.getElementById(`slots${level}Max`);
        const usedEl = document.getElementById(`slots${level}Used`);
        const max = parseInt(maxEl?.value, 10) || 0;
        const used = parseInt(usedEl?.value, 10) || 0;
        const remaining = Math.max(0, max - used);
        const percentage = max > 0 ? (remaining / max) * 100 : 0;

        // Fall back to pact slots when: no regular slots at this level (max === 0),
        // OR regular slots are exhausted (remaining === 0) and pact can cover this level.
        // This ensures Warlocks who have stale regular slot values never see a
        // "No level X slots" alert when pact slots are available.
        if (max === 0 || remaining === 0) {
          const pact = getPactSlotStatus();
          if (pact.max > 0 && pact.pactLevel >= level) return pact;
        }

        return { max, used, remaining, percentage, isCantrip: false, isPact: false };
      }

      // Use a spell slot from combat view
      function useSpellSlotFromCombat(level) {
        if (level === 0) return true; // Cantrips don't use slots

        const maxEl  = document.getElementById(`slots${level}Max`);
        const usedEl = document.getElementById(`slots${level}Used`);
        const max  = parseInt(maxEl?.value,  10) || 0;
        const used = parseInt(usedEl?.value, 10) || 0;

        // Determine whether to route through pact slots:
        //   - No regular slots at this level (max === 0), OR
        //   - Regular slots are fully exhausted (used >= max) and pact can cover this level.
        // This prevents Warlocks from seeing a "No level X slots" alert when pact is available.
        const pactMaxEl   = document.getElementById('pactMax');
        const pactUsedEl  = document.getElementById('pactUsed');
        const pactLevelEl = document.getElementById('pactLevel');
        const pactMax     = parseInt(pactMaxEl?.value,   10) || 0;
        const pactUsed    = parseInt(pactUsedEl?.value,  10) || 0;
        const pactLevel   = parseInt(pactLevelEl?.value, 10) || 1;
        const pactCanCover = pactMax > 0 && pactLevel >= level;

        const usePact = max === 0 || (used >= max && pactCanCover);

        if (usePact) {
          if (!pactMaxEl || !pactUsedEl || pactMax === 0) {
            alert(`No spell slots or pact slots remaining!`);
            return false;
          }
          if (pactUsed >= pactMax) {
            alert(`No pact slots remaining!`);
            return false;
          }

          pactUsedEl.value = pactUsed + 1;
          pactUsedEl.dispatchEvent(new Event('input', { bubbles: true }));
          updateCombatSpellSlots();
          if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
          return true;
        }

        // Regular slot
        if (used >= max) {
          alert(`No level ${level} spell slots remaining!`);
          return false;
        }

        usedEl.value = used + 1;
        usedEl.dispatchEvent(new Event('input', { bubbles: true }));
        updateCombatSpellSlots();
        if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
        return true;
      }

      /** Ordinal suffix for a slot level number (1 → "1st", 3 → "3rd", etc.) */
      function slotOrdinal(n) {
        const s = ['','1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];
        return s[n] || `${n}th`;
      }

      /**
       * Show the upcast level picker modal.
       * slotOptions = array of { level, remaining, max, isPact } from getAvailableSlotLevels().
       */
      function showUpcastModal(spellIndex, spell, slotOptions) {
        const spellName = spell.title || spell.name || 'Spell';
        const baseDice  = spell.damage_dice || spell.heal_dice || '';

        document.getElementById('upcastModalSpellName').textContent = spellName;
        const baseLine = baseDice
          ? `Base (level ${spell.level}): ${baseDice}`
          : `Level ${spell.level} spell`;
        document.getElementById('upcastModalBaseLine').textContent = baseLine;

        const optEl = document.getElementById('upcastModalOptions');
        optEl.innerHTML = slotOptions.map(opt => {
          const label = opt.isPact
            ? `Pact Slot (Level ${opt.level})`
            : `${slotOrdinal(opt.level)} Level Slot`;

          let dicePreview = '';
          if (baseDice && spell.higher_level_dice && opt.level > (spell.level || 1)) {
            const upcastArr = computeUpcastDice(spell, opt.level);
            const upcastStr = upcastArr.join(' + ');
            if (upcastStr && upcastStr !== baseDice) {
              dicePreview = `<small class="text-warning ms-2">→ ${upcastStr}</small>`;
            }
          }

          const badge = `<span class="badge bg-secondary ms-auto">${opt.remaining}/${opt.max} left</span>`;

          return `<button type="button"
            class="btn btn-outline-warning text-start d-flex align-items-center w-100"
            data-upcast-level="${opt.level}"
            data-upcast-pact="${opt.isPact ? '1' : '0'}"
            data-upcast-remaining="${opt.remaining}"
            data-upcast-max="${opt.max}">
            <span>${label}${dicePreview}</span>${badge}
          </button>`;
        }).join('');

        // Store spell context for click handler
        optEl.dataset.spellIndex = spellIndex;
        optEl.dataset.spellLevel = spell.level || 1;
        optEl.dataset.spellName  = spellName;

        new bootstrap.Modal(document.getElementById('upcastModal')).show();
      }

      /**
       * Consume a slot and fire post-cast effects.
       * slotOption = { level, remaining, max, isPact }
       */
      function executeCast(spellIndex, originalLevel, spellName, slotOption) {
        const { level: castLevel, isPact, remaining } = slotOption;
        const slotLabel = isPact ? `pact slot (lvl ${castLevel})` : `level ${castLevel} slot`;
        const spell = (window.currentSpellList || [])[spellIndex];

        // Last-slot warning (before committing action)
        if (remaining === 1) {
          const proceed = confirm(`This is your last ${slotLabel}!\n\nCast ${spellName}?`);
          if (!proceed) return;
        }

        // Action economy — only committed here, so failed slot checks never consume an action
        const castingTime = spell?.casting_time || '';
        const actionType = detectSpellActionType(castingTime);
        if (!triggerActionEconomy(actionType)) return;

        // Consume the slot directly
        if (isPact) {
          const pactUsedEl = document.getElementById('pactUsed');
          if (pactUsedEl) {
            pactUsedEl.value = (parseInt(pactUsedEl.value, 10) || 0) + 1;
            pactUsedEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else {
          const usedEl = document.getElementById(`slots${castLevel}Used`);
          if (usedEl) {
            usedEl.value = (parseInt(usedEl.value, 10) || 0) + 1;
            usedEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        updateCombatSpellSlots();
        if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();

        window.updateSpellSlotsDisplay?.();

        // Post-cast status for feedback message
        const newRemaining = remaining - 1;
        const newMax       = slotOption.max;
        const slotPoolLabel = isPact ? 'pact slots' : `level ${castLevel} slots`;
        const castLevelLabel = castLevel !== originalLevel ? ` at level ${castLevel}` : '';
        let feedbackMsg = `Cast ${spellName}${castLevelLabel}! (${newRemaining}/${newMax} ${slotPoolLabel} left)`;

        // Handle concentration
        const requiresConcentration = spell?.concentration || false;
        if (requiresConcentration && typeof window.isConcentrating === 'function' && window.isConcentrating()) {
          // Already checked and confirmed above castSpell — just update
        }
        if (requiresConcentration && typeof window.setConcentration === 'function') {
          window.setConcentration(true, spellName);
          feedbackMsg += ' [Concentrating]';
          updateCombatConditions();
        }

        showCastFeedback(spellIndex, feedbackMsg, 'success');

        // Roll dice (upcast-aware)
        if (parseSpellRollInfo(spell).rollType) {
          rollSpellDice(parseInt(spellIndex, 10), castLevel);
        } else {
          window.showRollToast?.('Spell Cast', spellName,
            isPact ? `Pact Slot Level ${castLevel}` : `Level ${castLevel} Slot`);
        }
      }

      // Cast spell handler
      function castSpell(spellIndex, spellLevel, spellName) {
        const level = parseInt(spellLevel, 10);
        const spellList = window.currentSpellList || [];
        const spell = spellList[spellIndex];
        const requiresConcentration = spell?.concentration || false;

        // Check if already concentrating on a different spell
        if (requiresConcentration && typeof window.isConcentrating === 'function' && window.isConcentrating()) {
          const currentSpell = window.currentConcentrationSpell || 'another spell';
          const proceed = confirm(
            `You are currently concentrating on ${currentSpell}.\n\n` +
            `Casting ${spellName} will end your concentration on ${currentSpell}.\n\n` +
            `Continue?`
          );
          if (!proceed) return;
        }

        // Cantrip — no slot needed, just roll (action economy checked here since executeCast isn't called)
        if (level === 0) {
          const castingTime = spell?.casting_time || '';
          const actionType = detectSpellActionType(castingTime);
          if (!triggerActionEconomy(actionType)) return;
          showCastFeedback(spellIndex, `Cast ${spellName}!`, 'success');
          if (parseSpellRollInfo(spell).rollType) {
            rollSpellDice(parseInt(spellIndex, 10));
          } else {
            window.showRollToast?.('Spell Cast', spellName, 'Cantrip');
          }
          return;
        }

        // Get available slot options (this covers regular + pact slots)
        const slotOptions = getAvailableSlotLevels(level);

        if (slotOptions.length === 0) {
          alert(`No spell slots available for a level ${level}+ spell!`);
          return;
        }

        if (slotOptions.length === 1) {
          // Only one option — cast directly (executeCast handles last-slot warning)
          executeCast(spellIndex, level, spellName, slotOptions[0]);
        } else {
          // Multiple options — show upcast level picker
          showUpcastModal(spellIndex, spell, slotOptions);
        }
      }

      // Show visual feedback for casting
      function showCastFeedback(spellIndex, message, type) {
        // Find the spell item
        const spellItem = document.querySelector(`[data-spell-index="${spellIndex}"]`);
        if (!spellItem) return;

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `combat-cast-feedback alert alert-${type === 'success' ? 'success' : 'warning'} py-1 px-2 mb-0 mt-1`;
        feedback.style.fontSize = '0.75rem';
        feedback.innerHTML = `<i class="bi bi-check-circle me-1"></i>${message}`;

        // Remove any existing feedback
        const existing = spellItem.querySelector('.combat-cast-feedback');
        if (existing) existing.remove();

        spellItem.appendChild(feedback);

        // Auto-remove after 3 seconds
        setTimeout(() => {
          feedback.remove();
        }, 3000);
      }

      // Event delegation for spell casting and spell dice rolling
      const combatSpellsEl = document.getElementById('combatSpells');
      if (combatSpellsEl) {
        combatSpellsEl.addEventListener('click', function(e) {
          const castBtn = e.target.closest('.combat-cast-btn');
          if (castBtn) {
            e.preventDefault();
            const spellIndex = castBtn.dataset.spellIndex;
            const spellLevel = castBtn.dataset.spellLevel;
            const spellName = castBtn.dataset.spellName;
            castSpell(spellIndex, spellLevel, spellName);
            return;
          }
          const rollBtn = e.target.closest('.combat-roll-btn');
          if (rollBtn) {
            e.preventDefault();
            const spellIndex = parseInt(rollBtn.dataset.spellIndex, 10);
            if (typeof window.rollSpellDice === 'function') window.rollSpellDice(spellIndex);
          }
        });
      }

      // Event delegation for clicking Concentrating badge — opens check modal
      const combatConditionsEl = document.getElementById('combatConditions');
      if (combatConditionsEl) {
        combatConditionsEl.addEventListener('click', function(e) {
          const badge = e.target.closest('.clickable-concentration');
          if (!badge) return;
          e.preventDefault();

          const spellName    = window.currentConcentrationSpell || 'your spell';
          const conSaveBonus = parseInt(document.getElementById('saveConBonus')?.value, 10) || 0;

          document.getElementById('concModalSpellName').textContent = spellName;
          document.getElementById('concModalDamage').value = '';
          document.getElementById('concModalDC').textContent = '10';
          document.getElementById('concModalBonus').textContent =
            conSaveBonus >= 0 ? `+${conSaveBonus}` : `${conSaveBonus}`;

          new bootstrap.Modal(document.getElementById('concentrationCheckModal')).show();
        });
      }

      // Concentration modal: live DC update as damage is typed
      document.getElementById('concModalDamage')?.addEventListener('input', function() {
        const dc = Math.max(10, Math.floor((parseInt(this.value, 10) || 0) / 2));
        document.getElementById('concModalDC').textContent = dc;
      });

      // Concentration modal: End Concentration button
      document.getElementById('concModalEndBtn')?.addEventListener('click', function() {
        bootstrap.Modal.getInstance(document.getElementById('concentrationCheckModal'))?.hide();
        if (typeof window.setConcentration === 'function') window.setConcentration(false);
        updateCombatConditions();
      });

      // Concentration modal: Roll Concentration Save button
      document.getElementById('concModalRollBtn')?.addEventListener('click', function() {
        const damage       = parseInt(document.getElementById('concModalDamage')?.value, 10) || 0;
        const dc           = Math.max(10, Math.floor(damage / 2));
        const conSaveBonus = parseInt(document.getElementById('saveConBonus')?.value, 10) || 0;
        const bonusStr     = conSaveBonus >= 0 ? `+${conSaveBonus}` : `${conSaveBonus}`;

        const result = window.rollDice?.(`1d20${bonusStr}`, `CON Save (DC ${dc})`);
        if (!result) return;

        bootstrap.Modal.getInstance(document.getElementById('concentrationCheckModal'))?.hide();

        const maintained = result.total >= dc;
        window.showRollToast?.(
          maintained ? 'Concentration Maintained' : 'Concentration Check Failed',
          result.total,
          `DC ${dc} — ${maintained ? 'Passed!' : 'Failed!'}`
        );
      });

      // Upcast modal: click on a slot-level option button
      document.getElementById('upcastModalOptions')?.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-upcast-level]');
        if (!btn) return;

        // Dismiss modal before casting
        bootstrap.Modal.getInstance(document.getElementById('upcastModal'))?.hide();

        const castLevel  = parseInt(btn.dataset.upcastLevel, 10);
        const isPact     = btn.dataset.upcastPact === '1';
        const remaining  = parseInt(btn.dataset.upcastRemaining, 10);
        const max        = parseInt(btn.dataset.upcastMax, 10);
        const spellIndex = parseInt(this.dataset.spellIndex, 10);
        const originalLevel = parseInt(this.dataset.spellLevel, 10);
        const spellName  = this.dataset.spellName || 'Spell';

        executeCast(spellIndex, originalLevel, spellName, { level: castLevel, isPact, remaining, max });
      });

      // Roll death save from combat view
      function rollCombatDeathSave() {
        try {
          const roll = DiceEngine.rollDie(20);
          let resultType = '';
          let resultMsg = '';

          // Get current counts
          let successCount = 0;
          let failureCount = 0;
          for (let i = 1; i <= 3; i++) {
            if (document.getElementById(`deathSaveSuccess${i}`)?.checked) successCount++;
            if (document.getElementById(`deathSaveFailure${i}`)?.checked) failureCount++;
          }

          if (roll === 20) {
            // Critical success: regain 1 HP and become conscious
            resultType = 'crit-success';
            resultMsg = `Natural 20! You regain 1 HP and become conscious!`;
            // Clear all death saves
            for (let i = 1; i <= 3; i++) {
              const successEl = document.getElementById(`deathSaveSuccess${i}`);
              const failureEl = document.getElementById(`deathSaveFailure${i}`);
              if (successEl) successEl.checked = false;
              if (failureEl) failureEl.checked = false;
            }
            // Set HP to 1
            const currentHPEl = document.getElementById('charCurrentHP');
            if (currentHPEl && (parseInt(currentHPEl.value) || 0) <= 0) {
              currentHPEl.value = 1;
              currentHPEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } else if (roll === 1) {
            // Critical failure: 2 failures
            resultType = 'crit-fail';
            const newFailures = Math.min(failureCount + 2, 3);
            for (let i = 1; i <= newFailures; i++) {
              const el = document.getElementById(`deathSaveFailure${i}`);
              if (el) el.checked = true;
            }
            if (newFailures >= 3) {
              resultMsg = `Natural 1! Two failures - you have died!`;
            } else {
              resultMsg = `Natural 1! Two failures marked (${newFailures}/3)`;
            }
          } else if (roll >= 10) {
            // Success
            resultType = 'success';
            const newSuccesses = Math.min(successCount + 1, 3);
            for (let i = 1; i <= newSuccesses; i++) {
              const el = document.getElementById(`deathSaveSuccess${i}`);
              if (el) el.checked = true;
            }
            if (newSuccesses >= 3) {
              resultMsg = `Rolled ${roll} - Success! You are now stable!`;
              const stableEl = document.getElementById('deathSaveStable');
              if (stableEl) stableEl.checked = true;
            } else {
              resultMsg = `Rolled ${roll} - Success (${newSuccesses}/3)`;
            }
          } else {
            // Failure
            resultType = 'fail';
            const newFailures = Math.min(failureCount + 1, 3);
            for (let i = 1; i <= newFailures; i++) {
              const el = document.getElementById(`deathSaveFailure${i}`);
              if (el) el.checked = true;
            }
            if (newFailures >= 3) {
              resultMsg = `Rolled ${roll} - Failure. You have died!`;
            } else {
              resultMsg = `Rolled ${roll} - Failure (${newFailures}/3)`;
            }
          }

          // Show toast and add to history
          if (typeof window.addToRollHistory === 'function') {
            window.addToRollHistory({
              notation: '1d20',
              description: 'Death Save',
              rolls: [roll],
              modifier: 0,
              total: roll,
              timestamp: new Date().toISOString(),
              isCritical: roll === 20,
              isFumble: roll === 1
            });
          }
          if (typeof window.showRollToast === 'function') {
            window.showRollToast('Death Save', roll, resultMsg);
          }

          // Alert with result
          alert(`Death Saving Throw: ${roll}\n\n${resultMsg}`);

          // Trigger input events on checkboxes to ensure change is detected
          for (let i = 1; i <= 3; i++) {
            const successEl = document.getElementById(`deathSaveSuccess${i}`);
            const failureEl = document.getElementById(`deathSaveFailure${i}`);
            if (successEl) successEl.dispatchEvent(new Event('change', { bubbles: true }));
            if (failureEl) failureEl.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Update combat view display
          updateCombatCardView();

          // Save character
          if (typeof window.saveCurrentCharacter === 'function') { // published on window by character.js; the bare name is undeclared in this file
            window.saveCurrentCharacter();
          }
        } catch (err) {
          console.error('Error rolling death save:', err);
          const roll = DiceEngine.rollDie(20);
          alert(`Death Save: ${roll}\n${roll >= 10 ? 'Success!' : 'Failure!'}`);
        }
      }

      // Roll hit dice from combat view
      function rollCombatHitDice() {
        try {
          const hdRemaining = document.getElementById('charHitDiceRemaining')?.value.trim() || '0d0';
          // One size ("5d10") or several ("3d8 + 4d6"), read against the total; dice are spent from one size
          const pool = HitDicePool.resolveRemaining(HitDicePool.parse(document.getElementById('charHitDice')?.value || ''), hdRemaining);

          if (!pool) {
            alert('No hit dice remaining information found.');
            return;
          }

          let dieSize = HitDicePool.defaultSize(pool);
          if (dieSize === null) {
            alert('No hit dice remaining! Take a long rest to recover hit dice.');
            return;
          }

          const sizesLeft = pool.filter(p => p.count > 0);
          if (sizesLeft.length > 1) {
            const choices = sizesLeft.map(p => `d${p.size} (${p.count} left)`).join(', ');
            const sizeStr = prompt(`Which hit die do you want to spend?

${choices}`, String(dieSize));
            if (sizeStr === null) return;
            const chosen = parseInt(String(sizeStr).replace(/^d/i, ''), 10);
            if (!sizesLeft.some(p => p.size === chosen)) {
              alert(`Please choose one of: ${sizesLeft.map(p => 'd' + p.size).join(', ')}.`);
              return;
            }
            dieSize = chosen;
          }
          const availableCount = HitDicePool.countOf(pool, dieSize);

          // Ask how many to roll
          const countStr = prompt(`You have ${availableCount}d${dieSize} hit dice remaining.\n\nHow many hit dice do you want to spend? (1-${availableCount})`, '1');
          if (countStr === null) return;

          const count = parseInt(countStr, 10);
          if (isNaN(count) || count < 1 || count > availableCount) {
            alert(`Please enter a number between 1 and ${availableCount}.`);
            return;
          }

          // Get CON modifier
          const conScore = parseInt(document.getElementById('statCon')?.value, 10) || 10;
          const conMod = Math.floor((conScore - 10) / 2);

          // Roll the dice (CON modifier per die, at least 1 HP per die spent: the engine's rule)
          // (null when the count or die size, read from the saved hit-dice text, is beyond the limits)
          const healed = DiceEngine.rollHitDice(dieSize, count, conMod);
          if (!healed) {
            alert('Too many hit dice, or too large a die, to roll.');
            return;
          }
          const { rolls, healing: total } = healed;

          // Apply healing
          const currentHPEl = document.getElementById('charCurrentHP');
          const maxHPEl = document.getElementById('charMaxHP');
          const curHP = parseInt(currentHPEl?.value, 10) || 0;
          const maxHP = parseInt(maxHPEl?.value, 10) || 1;

          const newHP = Math.min(curHP + total, maxHP);
          const actualHealing = newHP - curHP;

          if (currentHPEl) {
            currentHPEl.value = newHP;
            currentHPEl.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // Reset death saves if HP is now above 0
          if (newHP > 0 && typeof window.resetDeathSaves === 'function') {
            window.resetDeathSaves();
          }

          // Update hit dice remaining
          const newPool = HitDicePool.spend(pool, dieSize, count);
          const newRemaining = HitDicePool.format(newPool);
          const hdRemainingEl = document.getElementById('charHitDiceRemaining');
          if (hdRemainingEl) {
            hdRemainingEl.value = newRemaining;
            hdRemainingEl.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // Build result message
          const rollsStr = rolls.join(' + ');
          const conModStr = conMod >= 0 ? `+${conMod}` : conMod;
          const resultMsg = `Rolled ${count}d${dieSize}: [${rollsStr}] ${conModStr}/die = ${total} HP\nHealed ${actualHealing} HP (${curHP} → ${newHP})`;

          // Show toast and add to history
          if (typeof window.addToRollHistory === 'function') {
            window.addToRollHistory({
              notation: `${count}d${dieSize}+${conMod * count}`,
              description: `Hit Dice (Healed ${actualHealing} HP)`,
              rolls: rolls,
              modifier: conMod * count,
              total: total,
              timestamp: new Date().toISOString(),
              isCritical: false,
              isFumble: false
            });
          }
          if (typeof window.showRollToast === 'function') {
            window.showRollToast(`Hit Dice`, total, `+${actualHealing} HP`);
          }

          alert(`Hit Dice Roll:\n\n${resultMsg}\n\nHit dice remaining: ${newRemaining}`);

          // Update combat view
          updateCombatCardView();

          // Save character
          if (typeof window.saveCurrentCharacter === 'function') { // published on window by character.js; the bare name is undeclared in this file
            window.saveCurrentCharacter();
          }
        } catch (err) {
          console.error('Error rolling hit dice:', err);
          alert('Error rolling hit dice. Please try from the main character sheet.');
        }
      }

      // Event listeners for death save and hit dice buttons
      const deathSaveBtn = document.getElementById('combatDeathSaveBtn');
      if (deathSaveBtn) {
        deathSaveBtn.addEventListener('click', rollCombatDeathSave);
      }

      const hitDiceBtn = document.getElementById('combatHitDiceBtn');
      if (hitDiceBtn) {
        hitDiceBtn.addEventListener('click', rollCombatHitDice);
      }

      // Class resource +/- buttons
      document.getElementById('combatClassResources')?.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-resource-idx]');
        if (!btn) return;

        const idx    = parseInt(btn.dataset.resourceIdx, 10);
        const action = btn.dataset.resourceAction;
        const rows   = document.querySelectorAll('#resourcesList .resource-row');
        const row    = rows[idx];
        if (!row) return;

        const curEl = row.querySelector('.res-current');
        const maxEl = row.querySelector('.res-max');
        if (!curEl) return;

        const max    = parseInt(maxEl?.value, 10) || 0;
        const oldVal = parseInt(curEl.value,   10) || 0;
        const newVal = action === 'use'
          ? Math.max(0, oldVal - 1)
          : Math.min(max, oldVal + 1);

        if (newVal === oldVal) {
          const flashCls = action === 'use' ? 'btn-danger' : 'btn-success';
          btn.classList.add(flashCls);
          setTimeout(() => btn.classList.remove(flashCls), 600);
          return;
        }

        curEl.value = newVal;
        if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
        updateCombatResources();
      });

      // ── Exhaustion controls in combat view ──────────────────────────────────
      document.getElementById('combatExhaustUp')?.addEventListener('click', () => {
        const el = document.getElementById('exhaustionLevel');
        if (!el) return;
        const cur = parseInt(el.value, 10) || 0;
        if (cur < 10) {
          el.value = cur + 1;
          el.dispatchEvent(new Event('input'));
          if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
          document.getElementById('combatExhaustion').textContent = el.value;
        }
      });
      document.getElementById('combatExhaustDown')?.addEventListener('click', () => {
        const el = document.getElementById('exhaustionLevel');
        if (!el) return;
        const cur = parseInt(el.value, 10) || 0;
        if (cur > 0) {
          el.value = cur - 1;
          el.dispatchEvent(new Event('input'));
          if (typeof window.saveCurrentCharacter === 'function') window.saveCurrentCharacter();
          document.getElementById('combatExhaustion').textContent = el.value;
        }
      });

      // ── Short Rest / Long Rest from combat view ──────────────────────────────
      document.getElementById('combatShortRestBtn')?.addEventListener('click', () => {
        document.getElementById('shortRestBtn')?.click(); // the sheet's own button runs the rest
      });
      document.getElementById('combatLongRestBtn')?.addEventListener('click', () => {
        document.getElementById('longRestBtn')?.click(); // the sheet's own button runs the rest
      });

      // Toggle combat mode
      function toggleCombatMode() {
        const isChecked = dmCombatModeToggle.checked;

        if (isChecked) {
          // Update the combat card with latest data before showing
          updateCombatCardView();
          document.body.classList.add('combat-mode');
          localStorage.setItem('dmCombatMode', 'true');
        } else {
          document.body.classList.remove('combat-mode');
          localStorage.setItem('dmCombatMode', 'false');
        }
      }

      // Event listener for toggle
      if (dmCombatModeToggle) {
        dmCombatModeToggle.addEventListener('change', toggleCombatMode);

        // Restore saved state on page load - but wait for character data to load first
        const savedMode = localStorage.getItem('dmCombatMode');
        if (savedMode === 'true') {
          dmCombatModeToggle.checked = true;
          // Add the combat-mode class immediately for visual state
          document.body.classList.add('combat-mode');
          // But delay the data update until character data is ready
          // Wait for DOMContentLoaded + a bit more for character.js to load data
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              setTimeout(updateCombatCardView, 500);
            });
          } else {
            // DOM already loaded, just wait for character data
            setTimeout(updateCombatCardView, 500);
          }
        }
      }

      // Also update combat view when character is changed/loaded
      // We'll hook into the existing character select change event
      const characterSelect = document.getElementById('characterSelect');
      if (characterSelect) {
        characterSelect.addEventListener('change', function() {
          // Wait a bit for the character data to load
          setTimeout(function() {
            if (dmCombatModeToggle && dmCombatModeToggle.checked) {
              updateCombatCardView();
            }
          }, 200);
        });
      }

      // Listen for custom event from character.js when character is loaded
      document.addEventListener('characterLoaded', function() {
        if (dmCombatModeToggle && dmCombatModeToggle.checked) {
          updateCombatCardView();
        }
      });

      // Listen for concentration changes to update combat view conditions
      document.addEventListener('concentrationChanged', function() {
        if (dmCombatModeToggle && dmCombatModeToggle.checked) {
          updateCombatConditions();
        }
      });

      // Update combat view when any input changes (if in combat mode)
      document.addEventListener('input', function(e) {
        if (dmCombatModeToggle && dmCombatModeToggle.checked) {
          // Debounce updates
          clearTimeout(window.combatViewUpdateTimer);
          window.combatViewUpdateTimer = setTimeout(updateCombatCardView, 300);
        }
      });
    })();
