(function () {
      const STORAGE_KEY = 'dmtoolboxCharactersV1';
      const USE_INDEXED_DB = IndexedDBStorage && IndexedDBStorage.isSupported();
      const $ = (id) => document.getElementById(id);

      function getNumber(id, fallback = 0) {
        const el = $(id);
        if (!el) return fallback;
        const value = parseInt(el.value, 10);
        return Number.isFinite(value) ? value : fallback;
      }

      // ---------- Dice Roller Utility ----------
      const rollHistory = [];
      const MAX_ROLL_HISTORY = 50;

      function rollDie(sides) {
        return Math.floor(Math.random() * sides) + 1;
      }

      function parseDiceNotation(notation) {
        // Parse notation like "2d6+3", "1d20", "d8+2", or with spaces/parentheses like "(1d6 + 6)"
        const match = notation.trim().match(/^\s*\(?\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*\)?\s*$/i);
        if (!match) return null;

        const count = match[1] ? parseInt(match[1], 10) : 1;
        const sides = parseInt(match[2], 10);
        let modifier = 0;
        if (match[3]) {
          const modStr = match[3].replace(/\s+/g, '');
          modifier = parseInt(modStr, 10) || 0;
        }

        return { count, sides, modifier };
      }

      function rollDice(notation, description = '') {
        const parsed = parseDiceNotation(notation);
        if (!parsed) {
          console.error('Invalid dice notation:', notation);
          return null;
        }

        const { count, sides, modifier } = parsed;
        const rolls = [];
        let total = 0;

        for (let i = 0; i < count; i++) {
          const roll = rollDie(sides);
          rolls.push(roll);
          total += roll;
        }

        total += modifier;

        const result = {
          notation,
          description,
          rolls,
          modifier,
          total,
          timestamp: new Date().toISOString(),
          isCritical: sides === 20 && rolls.includes(20),
          isFumble: sides === 20 && rolls.includes(1)
        };

        addToRollHistory(result);
        return result;
      }

      function rollWithAdvantage(bonus = 0, description = '') {
        const roll1 = rollDie(20);
        const roll2 = rollDie(20);
        const chosen = Math.max(roll1, roll2);
        const total = chosen + bonus;

        const result = {
          notation: '2d20 (advantage)',
          description,
          rolls: [roll1, roll2],
          chosen,
          modifier: bonus,
          total,
          timestamp: new Date().toISOString(),
          isCritical: chosen === 20,
          isFumble: chosen === 1,
          isAdvantage: true
        };

        addToRollHistory(result);
        return result;
      }

      function rollWithDisadvantage(bonus = 0, description = '') {
        const roll1 = rollDie(20);
        const roll2 = rollDie(20);
        const chosen = Math.min(roll1, roll2);
        const total = chosen + bonus;

        const result = {
          notation: '2d20 (disadvantage)',
          description,
          rolls: [roll1, roll2],
          chosen,
          modifier: bonus,
          total,
          timestamp: new Date().toISOString(),
          isCritical: chosen === 20,
          isFumble: chosen === 1,
          isDisadvantage: true
        };

        addToRollHistory(result);
        return result;
      }

      function addToRollHistory(result) {
        rollHistory.unshift(result);
        // Trim array in place to maintain reference
        while (rollHistory.length > MAX_ROLL_HISTORY) {
          rollHistory.pop();
        }
        renderRollHistory();

        // Show toast on mobile (screen width < 768px)
        if (window.innerWidth < 768) {
          showRollToast(result);
        }
      }

      // showRollToast can be called two ways:
      // 1. showRollToast(resultObject) - from internal dice functions
      // 2. showRollToast(label, total, extra) - simple call from combat view
      function showRollToast(labelOrResult, total, extra) {
        const toastElement = document.getElementById('rollToast');
        const toastBody = document.getElementById('rollToastBody');
        if (!toastElement || !toastBody) return;

        let resultClass = '';
        let bgClass = 'bg-secondary';
        let description = '';
        let details = '';
        let displayTotal = 0;

        // Check if called with result object or simple parameters
        if (typeof labelOrResult === 'object' && labelOrResult !== null) {
          // Called with result object (internal dice functions)
          const result = labelOrResult;
          if (result.isCritical) {
            resultClass = 'text-success fw-bold';
            bgClass = 'bg-success';
          } else if (result.isFumble) {
            resultClass = 'text-danger fw-bold';
            bgClass = 'bg-danger';
          }

          let rollDisplay = '';
          if (result.isAdvantage || result.isDisadvantage) {
            rollDisplay = `[${result.rolls[0]}, ${result.rolls[1]}] → ${result.chosen}`;
          } else {
            rollDisplay = result.rolls.length > 1
              ? `[${result.rolls.join(', ')}]`
              : `${result.rolls[0]}`;
          }

          const modDisplay = result.modifier !== 0
            ? ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}`
            : '';

          description = result.description || '';
          details = `${rollDisplay}${modDisplay} = <span class="${resultClass}">${result.total}</span>`;
          displayTotal = result.total;
        } else {
          // Called with simple parameters (combat view)
          description = labelOrResult || '';
          displayTotal = total || 0;
          details = extra || '';

          // Check for crit/fumble in extra text
          if (extra && (extra.includes('20') || extra.includes('Crit'))) {
            resultClass = 'text-success fw-bold';
            bgClass = 'bg-success';
          } else if (extra && (extra.includes('1') || extra.includes('Fumble'))) {
            resultClass = 'text-danger fw-bold';
            bgClass = 'bg-danger';
          }
        }

        toastBody.innerHTML = `
          <div class="d-flex align-items-center justify-content-between gap-2">
            <div class="flex-grow-1">
              ${description ? `<div class="fw-bold">${description}</div>` : ''}
              ${details ? `<div class="small ${resultClass}">${details}</div>` : ''}
            </div>
            <div class="badge ${bgClass} fs-5">${displayTotal}</div>
          </div>
        `;

        // Update toast background based on result
        toastElement.className = `toast align-items-center border-0 ${bgClass}`;

        // Show the toast
        const toast = new bootstrap.Toast(toastElement, {
          autohide: true,
          delay: 3000
        });
        toast.show();
      }

      function renderRollHistory() {
        const container = $('rollHistoryList');
        if (!container) return;

        container.innerHTML = '';

        if (!rollHistory.length) {
          const empty = document.createElement('div');
          empty.className = 'text-muted small text-center py-2';
          empty.textContent = 'No rolls yet';
          container.appendChild(empty);
          return;
        }

        rollHistory.forEach((roll, _index) => {
          const div = document.createElement('div');
          div.className = 'roll-history-item p-2 border-bottom border-secondary';

          let resultClass = '';
          if (roll.isCritical) resultClass = 'text-success fw-bold';
          else if (roll.isFumble) resultClass = 'text-danger fw-bold';

          let rollDisplay = '';
          if (roll.isAdvantage || roll.isDisadvantage) {
            const _unchosen = roll.rolls.find(r => r !== roll.chosen);
            rollDisplay = `[${roll.rolls[0]}, ${roll.rolls[1]}] → <span class="${resultClass}">${roll.chosen}</span>`;
          } else {
            rollDisplay = roll.rolls.length > 1
              ? `[${roll.rolls.join(', ')}]`
              : `<span class="${resultClass}">${roll.rolls[0]}</span>`;
          }

          const modDisplay = roll.modifier !== 0
            ? ` ${roll.modifier >= 0 ? '+' : ''}${roll.modifier}`
            : '';

          div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                ${roll.description ? `<div class="small fw-bold">${roll.description}</div>` : ''}
                <div class="small text-muted">${roll.notation}${modDisplay}</div>
                <div class="small">${rollDisplay}${modDisplay ? ` = <span class="${resultClass}">${roll.total}</span>` : ''}</div>
              </div>
              <div class="text-end">
                <div class="badge ${roll.isCritical ? 'bg-success' : roll.isFumble ? 'bg-danger' : 'bg-secondary'}">${roll.total}</div>
                <div class="text-muted" style="font-size: 0.65rem;">${new Date(roll.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          `;

          container.appendChild(div);
        });
      }

      function clearRollHistory() {
        rollHistory.length = 0; // Clear array without reassigning
        renderRollHistory();
      }

      // Expose dice rolling functions globally for combat view
      window.rollHistory = rollHistory;
      window.addToRollHistory = addToRollHistory;
      window.showRollToast = showRollToast;
      window.renderRollHistory = renderRollHistory;

      // ---------- Player Action Functions ----------

      function rollSkillCheck(skillKey, rollType = 'normal') {
        const skill = SKILL_CONFIGS.find(s => s.key === skillKey);
        if (!skill) return;

        const bonusEl = $(skill.bonusId);
        const bonus = bonusEl ? (Number(bonusEl.value) || 0) : 0;

        let result;
        if (rollType === 'advantage') {
          result = rollWithAdvantage(bonus, `${skill.name} Check`);
        } else if (rollType === 'disadvantage') {
          result = rollWithDisadvantage(bonus, `${skill.name} Check`);
        } else {
          result = rollDice(`1d20${bonus >= 0 ? '+' : ''}${bonus}`, `${skill.name} Check`);
        }

        return result;
      }

      function rollSavingThrow(ability, rollType = 'normal') {
        const abilityNames = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
        const save = SAVE_CONFIGS.find(s => s.ability === ability);
        if (!save) return;

        const bonusEl = $(save.bonusId);
        const bonus = bonusEl ? (Number(bonusEl.value) || 0) : 0;

        let result;
        if (rollType === 'advantage') {
          result = rollWithAdvantage(bonus, `${abilityNames[ability]} Save`);
        } else if (rollType === 'disadvantage') {
          result = rollWithDisadvantage(bonus, `${abilityNames[ability]} Save`);
        } else {
          result = rollDice(`1d20${bonus >= 0 ? '+' : ''}${bonus}`, `${abilityNames[ability]} Save`);
        }

        return result;
      }

      function rollAbilityCheck(ability, rollType = 'normal') {
        const abilityNames = { Str: 'Strength', Dex: 'Dexterity', Con: 'Constitution', Int: 'Intelligence', Wis: 'Wisdom', Cha: 'Charisma' };
        const abilityName = abilityNames[ability] || ability;

        // Get the modifier from the modStr, modDex, etc. input
        const modEl = $(`mod${ability}`);
        const modifier = modEl ? (Number(modEl.value) || 0) : 0;

        let result;
        if (rollType === 'advantage') {
          result = rollWithAdvantage(modifier, `${abilityName} Check`);
        } else if (rollType === 'disadvantage') {
          result = rollWithDisadvantage(modifier, `${abilityName} Check`);
        } else {
          result = rollDice(`1d20${modifier >= 0 ? '+' : ''}${modifier}`, `${abilityName} Check`);
        }

        return result;
      }

      function rollAttack(attackIndex, rollType = 'normal') {
        if (attackIndex < 0 || attackIndex >= currentAttackList.length) return;
        const attack = currentAttackList[attackIndex];

        // Roll to hit
        const bonusMatch = (attack.bonus || '').match(/([+-]?\d+)/);
        const toHitBonus = bonusMatch ? parseInt(bonusMatch[1], 10) : 0;

        let hitResult;
        if (rollType === 'advantage') {
          hitResult = rollWithAdvantage(toHitBonus, `${attack.name} - To Hit`);
        } else if (rollType === 'disadvantage') {
          hitResult = rollWithDisadvantage(toHitBonus, `${attack.name} - To Hit`);
        } else {
          hitResult = rollDice(`1d20${toHitBonus >= 0 ? '+' : ''}${toHitBonus}`, `${attack.name} - To Hit`);
        }

        return hitResult;
      }

      function rollAttackDamage(attackIndex, rollType = 'normal') {
        if (attackIndex < 0 || attackIndex >= currentAttackList.length) return;
        const attack = currentAttackList[attackIndex];
        if (!attack.damage) return;

        const damageType = attack.damageType || 'Damage';
        const description = `${attack.name} - ${damageType}`;

        if (rollType === 'critical') {
          // Critical hit: double the dice (not the modifier)
          const parsed = parseDiceNotation(attack.damage);
          if (!parsed) {
            console.error('Invalid dice notation:', attack.damage);
            return null;
          }

          const { count, sides, modifier } = parsed;
          const critCount = count * 2;
          const critNotation = `${critCount}d${sides}${modifier >= 0 ? '+' : ''}${modifier}`;
          return rollDice(critNotation, `${description} (CRIT!)`);
        } else if (rollType === 'half') {
          // Half damage (resistance)
          const result = rollDice(attack.damage, description);
          if (result) {
            const halfTotal = Math.floor(result.total / 2);
            addToRollHistory({
              notation: 'Resistance',
              description: `${description} (Halved)`,
              rolls: [],
              modifier: 0,
              total: halfTotal,
              timestamp: new Date().toISOString()
            });
          }
          return result;
        } else {
          // Normal damage
          return rollDice(attack.damage, description);
        }
      }

      function rollAttackDamage2(attackIndex, rollType = 'normal') {
        if (attackIndex < 0 || attackIndex >= currentAttackList.length) return;
        const attack = currentAttackList[attackIndex];
        if (!attack.damage2) return;

        const damageType = attack.damageType2 || 'Extra Damage';
        const description = `${attack.name} - ${damageType}`;

        if (rollType === 'critical') {
          // Critical hit: double the dice (not the modifier)
          const parsed = parseDiceNotation(attack.damage2);
          if (!parsed) {
            console.error('Invalid dice notation:', attack.damage2);
            return null;
          }

          const { count, sides, modifier } = parsed;
          const critCount = count * 2;
          const critNotation = `${critCount}d${sides}${modifier >= 0 ? '+' : ''}${modifier}`;
          return rollDice(critNotation, `${description} (CRIT!)`);
        } else if (rollType === 'half') {
          // Half damage (resistance)
          const result = rollDice(attack.damage2, description);
          if (result) {
            const halfTotal = Math.floor(result.total / 2);
            addToRollHistory({
              notation: 'Resistance',
              description: `${description} (Halved)`,
              rolls: [],
              modifier: 0,
              total: halfTotal,
              timestamp: new Date().toISOString()
            });
          }
          return result;
        } else {
          // Normal damage
          return rollDice(attack.damage2, description);
        }
      }

      function rollDeathSave() {
        const result = rollDice('1d20', 'Death Save');

        // Automatically update death saves based on roll
        const roll = result.rolls[0];

        if (roll === 20) {
          // Natural 20: regain 1 HP and stabilize
          const currentHPEl = $('charCurrentHP');
          if (currentHPEl) currentHPEl.value = 1;

          // Clear death saves
          ['deathSaveSuccess1', 'deathSaveSuccess2', 'deathSaveSuccess3',
           'deathSaveFailure1', 'deathSaveFailure2', 'deathSaveFailure3'].forEach(id => {
            const el = $(id);
            if (el) el.checked = false;
          });
          $('deathSaveStable').checked = true;

          addToRollHistory({
            notation: 'Auto',
            description: 'Critical Success! Regained 1 HP',
            rolls: [],
            modifier: 0,
            total: 0,
            timestamp: new Date().toISOString()
          });
        } else if (roll === 1) {
          // Natural 1: two failures
          addDeathSaveFailures(2);
        } else if (roll >= 10) {
          // Success
          addDeathSaveSuccess();
        } else {
          // Failure
          addDeathSaveFailures(1);
        }

        return result;
      }

      function addDeathSaveSuccess() {
        const checkboxes = ['deathSaveSuccess1', 'deathSaveSuccess2', 'deathSaveSuccess3'];
        for (const id of checkboxes) {
          const el = $(id);
          if (el && !el.checked) {
            el.checked = true;
            break;
          }
        }
      }

      function addDeathSaveFailures(count = 1) {
        const checkboxes = ['deathSaveFailure1', 'deathSaveFailure2', 'deathSaveFailure3'];
        let added = 0;
        for (const id of checkboxes) {
          if (added >= count) break;
          const el = $(id);
          if (el && !el.checked) {
            el.checked = true;
            added++;
          }
        }
      }

      function adjustHP(type) {
        const currentHPEl = $('charCurrentHP');
        const maxHPEl = $('charMaxHP');
        const tempHPEl = $('charTempHP');

        if (!currentHPEl) return;

        const currentHP = Number(currentHPEl.value) || 0;
        const maxHP = Number(maxHPEl?.value) || 0;
        const tempHP = Number(tempHPEl?.value) || 0;

        if (type === 'heal') {
          const amount = prompt('Heal how many HP?', '');
          if (amount === null) return;
          const healAmount = Number(amount) || 0;
          currentHPEl.value = Math.min(currentHP + healAmount, maxHP);
        } else if (type === 'damage') {
          const amount = prompt('Take how much damage?', '');
          if (amount === null) return;
          const originalDamage = Number(amount) || 0;
          let damageAmount = originalDamage;

          // Apply temp HP first
          if (tempHP > 0) {
            if (damageAmount <= tempHP) {
              tempHPEl.value = tempHP - damageAmount;
              damageAmount = 0;
            } else {
              damageAmount -= tempHP;
              tempHPEl.value = 0;
            }
          }

          // Apply remaining damage to current HP
          if (damageAmount > 0) {
            currentHPEl.value = Math.max(0, currentHP - damageAmount);
          }

          // Check concentration using the new system
          if (originalDamage > 0 && isConcentrating()) {
            handleConcentrationCheck(originalDamage);
          }
        } else if (type === 'temp') {
          const amount = prompt('Set temporary HP to:', '');
          if (amount === null) return;
          const tempAmount = Number(amount) || 0;
          // Temp HP doesn't stack, you take the higher
          tempHPEl.value = Math.max(tempAmount, tempHP);
        } else if (type === 'max') {
          currentHPEl.value = maxHP;
        }

        // Reset death saves if HP is now above 0
        const newHP = Number(currentHPEl.value) || 0;
        if (newHP > 0) {
          resetDeathSaves();
        }
      }

      // Reset all death save checkboxes
      function resetDeathSaves() {
        for (let i = 1; i <= 3; i++) {
          const successEl = $(`deathSaveSuccess${i}`);
          const failureEl = $(`deathSaveFailure${i}`);
          if (successEl) successEl.checked = false;
          if (failureEl) failureEl.checked = false;
        }
        const stableEl = $('deathSaveStable');
        if (stableEl) stableEl.checked = false;
      }

      // Expose globally for combat view
      window.resetDeathSaves = resetDeathSaves;

      function rollInitiative() {
        const char = getCurrentCharacter();
        const charName = char?.name || 'Character';

        const initModEl = $('charInitMod');
        const initMod = initModEl ? (Number(initModEl.value) || 0) : 0;

        const result = rollDice(`1d20${initMod >= 0 ? '+' : ''}${initMod}`, `${charName} - Initiative`);
        return result;
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
          bonusEl.value = total;
        });
      }

      const SKILL_CONFIGS = [
        { ability: 'dex', profId: 'skillAcrobaticsProf',     expId: 'skillAcrobaticsExp',     bonusId: 'skillAcrobaticsBonus',     name: 'Acrobatics', key: 'acrobatics' },
        { ability: 'wis', profId: 'skillAnimalHandlingProf', expId: 'skillAnimalHandlingExp', bonusId: 'skillAnimalHandlingBonus', name: 'Animal Handling', key: 'animalHandling' },
        { ability: 'int', profId: 'skillArcanaProf',         expId: 'skillArcanaExp',         bonusId: 'skillArcanaBonus',         name: 'Arcana', key: 'arcana' },
        { ability: 'str', profId: 'skillAthleticsProf',      expId: 'skillAthleticsExp',      bonusId: 'skillAthleticsBonus',      name: 'Athletics', key: 'athletics' },
        { ability: 'cha', profId: 'skillDeceptionProf',      expId: 'skillDeceptionExp',      bonusId: 'skillDeceptionBonus',      name: 'Deception', key: 'deception' },
        { ability: 'int', profId: 'skillHistoryProf',        expId: 'skillHistoryExp',        bonusId: 'skillHistoryBonus',        name: 'History', key: 'history' },
        { ability: 'wis', profId: 'skillInsightProf',        expId: 'skillInsightExp',        bonusId: 'skillInsightBonus',        name: 'Insight', key: 'insight' },
        { ability: 'cha', profId: 'skillIntimidationProf',   expId: 'skillIntimidationExp',   bonusId: 'skillIntimidationBonus',   name: 'Intimidation', key: 'intimidation' },
        { ability: 'int', profId: 'skillInvestigationProf',  expId: 'skillInvestigationExp',  bonusId: 'skillInvestigationBonus',  name: 'Investigation', key: 'investigation' },
        { ability: 'wis', profId: 'skillMedicineProf',       expId: 'skillMedicineExp',       bonusId: 'skillMedicineBonus',       name: 'Medicine', key: 'medicine' },
        { ability: 'int', profId: 'skillNatureProf',         expId: 'skillNatureExp',         bonusId: 'skillNatureBonus',         name: 'Nature', key: 'nature' },
        { ability: 'wis', profId: 'skillPerceptionProf',     expId: 'skillPerceptionExp',     bonusId: 'skillPerceptionBonus',     name: 'Perception', key: 'perception' },
        { ability: 'cha', profId: 'skillPerformanceProf',    expId: 'skillPerformanceExp',    bonusId: 'skillPerformanceBonus',    name: 'Performance', key: 'performance' },
        { ability: 'cha', profId: 'skillPersuasionProf',     expId: 'skillPersuasionExp',     bonusId: 'skillPersuasionBonus',     name: 'Persuasion', key: 'persuasion' },
        { ability: 'int', profId: 'skillReligionProf',       expId: 'skillReligionExp',       bonusId: 'skillReligionBonus',       name: 'Religion', key: 'religion' },
        { ability: 'dex', profId: 'skillSleightOfHandProf',  expId: 'skillSleightOfHandExp',  bonusId: 'skillSleightOfHandBonus',  name: 'Sleight of Hand', key: 'sleightOfHand' },
        { ability: 'dex', profId: 'skillStealthProf',        expId: 'skillStealthExp',        bonusId: 'skillStealthBonus',        name: 'Stealth', key: 'stealth' },
        { ability: 'wis', profId: 'skillSurvivalProf',       expId: 'skillSurvivalExp',       bonusId: 'skillSurvivalBonus',       name: 'Survival', key: 'survival' }
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
          const expEl = $(cfg.expId);
          const bonusEl = $(cfg.bonusId);
          if (!bonusEl) return;

          if (autoOnlyWhenEmpty && bonusEl.value.trim() !== '') return;

          const abilMod = mods[cfg.ability] || 0;
          const isProf = profEl && profEl.checked;
          const isExp = expEl && expEl.checked;

          // Expertise = double proficiency, but only if proficient
          let prof = 0;
          if (isProf) {
            prof = isExp ? (pb * 2) : pb;
          }

          const total = abilMod + prof;
          bonusEl.value = total;
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
      let isLoadingCharacter = false; // Flag to prevent saves during character load

      // Expose spell and attack lists globally for combat view
      window.currentSpellList = currentSpellList;
      window.currentAttackList = currentAttackList;

      // ---------- Spells data + helpers ----------
      // Lazy-load spell data to ensure SRD filtering has occurred before we read it.
      // The old approach captured window.SPELLS_DATA at module load time, before
      // site.js pruneSpells() ran on window.load, causing unfiltered spells to appear.
      let _cachedSpells = null;

      function getAllSpells() {
        if (_cachedSpells !== null) return _cachedSpells;

        const raw = (window.SPELLS_DATA || window.SPELLS || []);
        _cachedSpells = raw
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

        return _cachedSpells;
      }

      // Allow cache invalidation when content packs are applied
      window.addEventListener('dmtoolbox:packs-applied', () => {
        _cachedSpells = null;
      });

      // Also invalidate after pack content is fully applied (after SRD filtering)
      window.addEventListener('dmtoolbox:packs-ready', () => {
        _cachedSpells = null;
      });

      // Also invalidate cache after window.load to ensure we pick up SRD-filtered data
      // (site.js pruneSpells runs on load, so any cache before that is stale)
      window.addEventListener('load', () => {
        _cachedSpells = null;
      });

      function searchSpells(term) {
        const q = (term || '').trim().toLowerCase();
        if (!q) return [];

        return getAllSpells().filter(spell => {
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
      async function loadCharactersFromStorage() {
        // Use IndexedDB if available
        if (USE_INDEXED_DB) {
          try {
            // Try to load from IndexedDB first
            let characters = await IndexedDBStorage.loadCharacters();

            // If empty, try migrating from localStorage
            if (characters.length === 0) {
              characters = await IndexedDBStorage.migrateFromLocalStorage(STORAGE_KEY);
            }

            return characters;
          } catch (error) {
            console.error('❌ IndexedDB failed, falling back to localStorage:', error);
            return loadFromLocalStorageFallback();
          }
        }

        // Fallback to localStorage
        return loadFromLocalStorageFallback();
      }

      function loadFromLocalStorageFallback() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) {
            console.log('ℹ No saved characters found in localStorage');
            return [];
          }
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            console.warn('⚠ Invalid character data in localStorage (not an array)');
            return [];
          }
          console.log('✓ Loaded', parsed.length, 'character(s) from localStorage');
          return parsed;
        } catch (error) {
          console.error('❌ Failed to load characters from localStorage:', error);
          return [];
        }
      }

      async function saveCharactersToStorage() {
        // Use IndexedDB if available
        if (USE_INDEXED_DB) {
          try {
            const sizeInBytes = new Blob([JSON.stringify(characters)]).size;
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            console.log(`Saving ${characters.length} character(s) to IndexedDB - Size: ${sizeInMB} MB`);

            await IndexedDBStorage.saveCharacters(characters);
            console.log('✓ Characters saved to IndexedDB successfully');

            // NO localStorage backup - images are too large for localStorage
            // IndexedDB is the primary and only storage for character data with portraits

            return;
          } catch (error) {
            console.error('❌ IndexedDB save failed:', error);

            // Check if it's a quota error
            if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
              const sizeInBytes = new Blob([JSON.stringify(characters)]).size;
              const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

              alert(
                '⚠️ Storage Quota Exceeded!\n\n' +
                `Your character data (${sizeInMB} MB) exceeds browser storage limits.\n\n` +
                'This is usually caused by portrait images.\n\n' +
                'Solutions:\n' +
                '1. Remove portrait images from some characters\n' +
                '2. Use smaller portrait images (compress them first)\n' +
                '3. Export your characters as backup\n' +
                '4. Delete unused characters\n\n' +
                'Your changes were NOT saved!'
              );
            } else {
              alert(
                '⚠️ Failed to save characters!\n\n' +
                'Error: ' + (error.message || 'Unknown error') + '\n\n' +
                'Possible causes:\n' +
                '- Private browsing mode\n' +
                '- Browser storage disabled\n' +
                '- Storage quota exceeded\n\n' +
                'Export your characters as backup!'
              );
            }

            throw error; // Re-throw to prevent silent failures
          }
        }

        // If IndexedDB is not available, we can't store characters with images
        console.error('❌ IndexedDB not available - cannot save characters');
        alert(
          '⚠️ IndexedDB Not Available!\n\n' +
          'Your browser does not support IndexedDB or it is disabled.\n\n' +
          'Character data with images cannot be saved.\n\n' +
          'Please:\n' +
          '- Enable IndexedDB in browser settings\n' +
          '- Exit private browsing mode\n' +
          '- Use a modern browser (Chrome, Firefox, Edge, Safari)'
        );
        throw new Error('IndexedDB not available');
      }

      // ---------- Storage Diagnostics ----------
      function getCharacterStorageSize(char) {
        const sizeInBytes = new Blob([JSON.stringify(char)]).size;
        return sizeInBytes;
      }

      function diagnoseStorageUsage() {
        console.log('\n📊 Character Storage Diagnostics:');
        console.log('═'.repeat(60));

        let totalSize = 0;
        characters.forEach((char, index) => {
          const size = getCharacterStorageSize(char);
          const sizeKB = (size / 1024).toFixed(2);
          const hasPortrait = char.portraitData ? '🖼️' : '  ';
          totalSize += size;

          console.log(`${index + 1}. ${hasPortrait} ${char.name || 'Unnamed'}: ${sizeKB} KB`);
        });

        const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.log('═'.repeat(60));
        console.log(`Total: ${totalMB} MB (stored in IndexedDB)`);

        // Find largest characters
        const sorted = characters
          .map((char, index) => ({ char, index, size: getCharacterStorageSize(char) }))
          .sort((a, b) => b.size - a.size);

        console.log('\n🔝 Top 3 Largest Characters:');
        sorted.slice(0, 3).forEach((item, rank) => {
          const sizeKB = (item.size / 1024).toFixed(2);
          console.log(`${rank + 1}. ${item.char.name || 'Unnamed'}: ${sizeKB} KB`);
        });

        console.log('\n💡 Tip: Remove portraits from large characters to free up space.\n');
      }

      // Make diagnostic function available globally for manual testing
      window.diagnoseCharacterStorage = diagnoseStorageUsage;

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

      async function updateStorageUsageDisplay() {
        const el = $('storageUsageValue');
        if (!el) return;

        const totalSize = characters.reduce((sum, char) => sum + getCharacterStorageSize(char), 0);
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

        // Try to get real quota info from IndexedDB
        if (USE_INDEXED_DB) {
          try {
            const storageInfo = await IndexedDBStorage.getStorageInfo();
            if (storageInfo) {
              const percentUsed = parseFloat(storageInfo.percentUsed);
              let colorClass = 'text-success';
              if (percentUsed > 80) colorClass = 'text-danger';
              else if (percentUsed > 60) colorClass = 'text-warning';

              el.innerHTML = `Storage (IndexedDB): <span class="${colorClass}">${sizeInMB} MB / ${storageInfo.quotaMB} MB (${percentUsed}%)</span>`;

              if (percentUsed > 80) {
                el.innerHTML += ` <a href="#" onclick="diagnoseCharacterStorage(); return false;" class="text-warning" title="Click to see which characters are using the most space">⚠️ Near Limit</a>`;
              }
              return;
            }
          } catch (error) {
            console.warn('Could not get storage estimate:', error);
          }
        }

        // Fallback if quota API not available
        // Just show the size without percentage since we don't know the limit
        el.innerHTML = `Storage (IndexedDB): <span class="text-info">${sizeInMB} MB</span>`;
        el.innerHTML += ` <a href="#" onclick="diagnoseCharacterStorage(); return false;" class="text-muted small" title="Click to see storage breakdown">(details)</a>`;
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
          const fromLib = getAllSpells().find(s =>
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

        const fromLib = getAllSpells().find(s =>
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
        window.currentSpellList = currentSpellList;
        renderCharacterSpellList();
        updatePreparedSpellCount();
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

        currentSpellList.forEach((spell, index) => {
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
          const isCantrip = spell.level === 0;
          const showCastButton = prepared || isCantrip;

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
                <div class="spell-cast-feedback mt-1" data-spell-index="${index}"></div>
              </div>
              <div class="ms-2 d-flex flex-column align-items-end gap-1">
                ${showCastButton ? `
                  <button type="button"
                          class="btn btn-sm btn-outline-warning spell-cast-btn"
                          data-spell-index="${index}"
                          data-spell-level="${spell.level ?? 0}"
                          data-spell-name="${(spell.name || title).replace(/"/g, '&quot;')}"
                          title="${isCantrip ? 'Cast cantrip' : 'Cast using spell slot'}">
                    <i class="bi bi-magic"></i> Cast
                  </button>
                ` : ''}
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
        window.currentSpellList = currentSpellList;
        renderCharacterSpellList();
        updatePreparedSpellCount();
      }

      function removeSpellFromCurrentList(name) {
        if (!name) return;
        const key = name.toLowerCase();
        currentSpellList = currentSpellList.filter(spell =>
          (spell.name || '').toLowerCase() !== key
        );
        window.currentSpellList = currentSpellList;
        renderCharacterSpellList();
        updatePreparedSpellCount();
      }

      function clearAllSpellsForCurrentCharacter() {
        currentSpellList = [];
        window.currentSpellList = currentSpellList;
        renderCharacterSpellList();
        updatePreparedSpellCount();
        clearSpellSearchResults();
      }

      // Cast spell from the main character sheet
      function castSpellFromSheet(spellIndex, spellLevel, spellName) {
        const level = spellLevel;
        const isCantrip = level === 0;

        // Get the spell from the list to check if it requires concentration
        const spell = currentSpellList[spellIndex];
        const requiresConcentration = spell?.concentration || false;

        // Show feedback in the spell item
        const showFeedback = (message, type) => {
          const feedbackEl = document.querySelector(`.spell-cast-feedback[data-spell-index="${spellIndex}"]`);
          if (feedbackEl) {
            feedbackEl.innerHTML = `<span class="badge bg-${type === 'success' ? 'success' : 'warning'} bg-opacity-75"><i class="bi bi-check-circle me-1"></i>${message}</span>`;
            setTimeout(() => { feedbackEl.innerHTML = ''; }, 3000);
          }
        };

        // Check if already concentrating on a different spell
        if (requiresConcentration && isConcentrating()) {
          const currentSpell = window.currentConcentrationSpell || 'another spell';
          const proceed = confirm(
            `You are currently concentrating on ${currentSpell}.\n\n` +
            `Casting ${spellName} will end your concentration on ${currentSpell}.\n\n` +
            `Continue?`
          );
          if (!proceed) return;
          // Will set new concentration below
        }

        // Cantrip - just show feedback (cantrips don't require concentration checks)
        if (isCantrip) {
          showFeedback(`Cast ${spellName}!`, 'success');
          if (typeof showRollToast === 'function') {
            showRollToast('Spell Cast', spellName, 'Cantrip');
          }
          return;
        }

        // Get slot status
        const maxEl = $(`slots${level}Max`);
        const usedEl = $(`slots${level}Used`);
        if (!maxEl || !usedEl) {
          alert(`No spell slot tracking for level ${level}.`);
          return;
        }

        const max = parseInt(maxEl.value, 10) || 0;
        const used = parseInt(usedEl.value, 10) || 0;
        const remaining = Math.max(0, max - used);

        // No slots available
        if (remaining === 0) {
          alert(`No level ${level} spell slots remaining!\n\nYou have used all ${max} slots.`);
          return;
        }

        // Last slot warning
        if (remaining === 1) {
          const proceed = confirm(`This is your last level ${level} spell slot!\n\nCast ${spellName}?`);
          if (!proceed) return;
        }

        // Use the slot
        usedEl.value = used + 1;
        usedEl.dispatchEvent(new Event('input', { bubbles: true }));

        const newRemaining = remaining - 1;
        let feedbackMsg = `Cast ${spellName}! (${newRemaining}/${max} slots left)`;

        // Handle concentration
        if (requiresConcentration) {
          setConcentration(true, spellName);
          feedbackMsg += ' [Concentrating]';
        }

        showFeedback(feedbackMsg, 'success');

        if (typeof showRollToast === 'function') {
          const extra = requiresConcentration ? `Level ${level} - Concentrating` : `Level ${level} (${newRemaining}/${max} slots)`;
          showRollToast('Spell Cast', spellName, extra);
        }

        // Save character
        saveCurrentCharacter();
      }

      // ---------- Attack management ----------

      function syncAttackListFromCharacter(char) {
        currentAttackList = Array.isArray(char?.attacks) ? [...char.attacks] : [];
        window.currentAttackList = currentAttackList;
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
            const dmgType = attack.damageType ? ` ${attack.damageType}` : '';
            damageInfo += `<span class="text-info">${attack.damage}${dmgType}</span>`;
          }
          if (attack.damage2) {
            const dmgType2 = attack.damageType2 ? ` ${attack.damageType2}` : '';
            damageInfo += ` + <span class="text-info">${attack.damage2}${dmgType2}</span>`;
          }

          // Build roll buttons
          let rollButtons = '';

          // To Hit buttons (if attack has a bonus)
          if (attack.bonus) {
            rollButtons += `
              <div class="mb-1">
                <span class="text-muted small me-1">To Hit:</span>
                <div class="btn-group btn-group-sm" role="group">
                  <button type="button" class="btn btn-success" data-attack-roll="${index}" data-roll-type="advantage" title="Attack with Advantage">
                    <i class="bi bi-dice-5"></i>
                  </button>
                  <button type="button" class="btn btn-outline-light" data-attack-roll="${index}" data-roll-type="normal" title="Normal Attack">
                    <i class="bi bi-dice-5"></i>
                  </button>
                  <button type="button" class="btn btn-danger" data-attack-roll="${index}" data-roll-type="disadvantage" title="Attack with Disadvantage">
                    <i class="bi bi-dice-5"></i>
                  </button>
                </div>
              </div>
            `;
          }

          // Primary Damage buttons
          if (attack.damage) {
            const damageLabel = attack.damageType ? attack.damageType : 'Damage';
            rollButtons += `
              <div class="mb-1">
                <span class="text-muted small me-1">${damageLabel}:</span>
                <div class="btn-group btn-group-sm" role="group">
                  <button type="button" class="btn btn-success" data-damage-roll="${index}" data-roll-type="critical" title="Critical Hit (double dice)">
                    <i class="bi bi-heart-fill"></i>
                  </button>
                  <button type="button" class="btn btn-outline-light" data-damage-roll="${index}" data-roll-type="normal" title="Normal Damage">
                    <i class="bi bi-heart-fill"></i>
                  </button>
                  <button type="button" class="btn btn-danger" data-damage-roll="${index}" data-roll-type="half" title="Half Damage (resistance)">
                    <i class="bi bi-heart-fill"></i>
                  </button>
                </div>
              </div>
            `;
          }

          // Additional Damage buttons
          if (attack.damage2) {
            const damage2Label = attack.damageType2 ? attack.damageType2 : 'Extra';
            rollButtons += `
              <div class="mb-1">
                <span class="text-muted small me-1">${damage2Label}:</span>
                <div class="btn-group btn-group-sm" role="group">
                  <button type="button" class="btn btn-success" data-damage2-roll="${index}" data-roll-type="critical" title="Critical Hit (double dice)">
                    <i class="bi bi-heart-fill"></i>
                  </button>
                  <button type="button" class="btn btn-outline-light" data-damage2-roll="${index}" data-roll-type="normal" title="Normal Damage">
                    <i class="bi bi-heart-fill"></i>
                  </button>
                  <button type="button" class="btn btn-danger" data-damage2-roll="${index}" data-roll-type="half" title="Half Damage (resistance)">
                    <i class="bi bi-heart-fill"></i>
                  </button>
                </div>
              </div>
            `;
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
                ${rollButtons}
                ${attack.properties ? `<div class="small text-muted mt-1">${attack.properties}</div>` : ''}
              </div>
              <div class="d-flex flex-column gap-1 ms-2">
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
        $('attackDamageType').value = '';
        $('attackDamage2').value = '';
        $('attackDamageType2').value = '';
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
          $('attackDamageType').value = attack.damageType || '';
          $('attackDamage2').value = attack.damage2 || '';
          $('attackDamageType2').value = attack.damageType2 || '';
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
          damageType: ($('attackDamageType').value || '').trim(),
          damage2: ($('attackDamage2').value || '').trim(),
          damageType2: ($('attackDamageType2').value || '').trim(),
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

        window.currentAttackList = currentAttackList;
        renderAttackList();
        bootstrap.Modal.getOrCreateInstance($('attackModal')).hide();
      }

      function deleteAttack(index) {
        if (index < 0 || index >= currentAttackList.length) return;
        const attack = currentAttackList[index];
        if (!confirm(`Delete attack "${attack.name || 'Unnamed Attack'}"?`)) return;
        currentAttackList.splice(index, 1);
        window.currentAttackList = currentAttackList;
        renderAttackList();
      }

      // ---------- Inventory management ----------
      let currentInventoryList = [];

      function syncInventoryFromCharacter(char) {
        // Support both old string format and new structured format
        if (Array.isArray(char?.inventoryItems)) {
          currentInventoryList = [...char.inventoryItems];
        } else {
          currentInventoryList = [];
        }
        renderInventoryTable();
        updateEncumbrance();
      }

      function renderInventoryTable() {
        const tbody = $('inventoryTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!currentInventoryList.length) {
          const tr = document.createElement('tr');
          tr.className = 'text-muted';
          tr.innerHTML = `<td colspan="7" class="text-center py-3"><small>No items yet. Click "Add Item" to start building your inventory.</small></td>`;
          tbody.appendChild(tr);
          return;
        }

        currentInventoryList.forEach((item, index) => {
          const tr = document.createElement('tr');
          tr.className = 'align-middle';

          const quantity = parseInt(item.quantity) || 1;
          const weight = parseFloat(item.weight) || 0;
          const totalWeight = quantity * weight;

          tr.innerHTML = `
            <td>
              <strong>${item.name || 'Unnamed Item'}</strong>
              ${item.notes ? `<br><small class="text-muted">${item.notes}</small>` : ''}
            </td>
            <td class="text-center">${quantity}</td>
            <td class="text-center">${weight.toFixed(1)}</td>
            <td class="text-center">
              <button type="button" class="btn btn-sm ${item.equipped ? 'btn-success' : 'btn-outline-secondary'}" data-inventory-equip="${index}" title="${item.equipped ? 'Unequip' : 'Equip'}">
                <i class="bi ${item.equipped ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
              </button>
            </td>
            <td class="text-center">
              ${item.attuned ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-star text-muted"></i>'}
            </td>
            <td class="text-center"><strong>${totalWeight.toFixed(1)} lb</strong></td>
            <td class="text-center">
              <button type="button" class="btn btn-sm btn-outline-primary" data-inventory-edit="${index}" title="Edit Item">
                <i class="bi bi-pencil"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger" data-inventory-delete="${index}" title="Delete Item">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          `;

          tbody.appendChild(tr);
        });
      }

      function updateEncumbrance() {
        // Calculate total weight
        let totalWeight = 0;
        currentInventoryList.forEach(item => {
          const quantity = parseInt(item.quantity) || 1;
          const weight = parseFloat(item.weight) || 0;
          totalWeight += quantity * weight;
        });

        // Get strength score for carrying capacity
        const char = getCurrentCharacter();
        const strScore = char ? (parseInt(char.str) || 10) : 10;
        const carryingCapacity = strScore * 15; // Standard D&D 5e rule
        const heavyLoad = strScore * 10;
        const _pushDragLift = carryingCapacity * 2;

        // Update display
        const totalWeightEl = $('totalWeight');
        const carryingCapacityEl = $('carryingCapacity');
        const encumbranceStatusEl = $('encumbranceStatus');

        if (totalWeightEl) {
          totalWeightEl.textContent = `${totalWeight.toFixed(1)} lb`;
        }

        if (carryingCapacityEl) {
          carryingCapacityEl.textContent = `${carryingCapacity} lb`;
        }

        if (encumbranceStatusEl) {
          let statusBadge = '';
          if (totalWeight > carryingCapacity) {
            statusBadge = '<span class="badge bg-danger">Over Capacity!</span>';
          } else if (totalWeight > heavyLoad) {
            statusBadge = '<span class="badge bg-warning">Heavily Encumbered</span>';
          } else if (totalWeight > heavyLoad * 0.66) {
            statusBadge = '<span class="badge bg-info">Encumbered</span>';
          } else {
            statusBadge = '<span class="badge bg-success">Normal</span>';
          }
          encumbranceStatusEl.innerHTML = statusBadge;
        }
      }

      function openInventoryItemModal(index = null) {
        const modal = new bootstrap.Modal($('inventoryItemModal'));
        const editIndexInput = $('inventoryItemEditIndex');

        // Clear or populate form
        if (index !== null && currentInventoryList[index]) {
          const item = currentInventoryList[index];
          editIndexInput.value = index;
          $('inventoryItemName').value = item.name || '';
          $('inventoryItemQuantity').value = item.quantity || 1;
          $('inventoryItemWeight').value = item.weight || 0;
          $('inventoryItemEquipped').checked = !!item.equipped;
          $('inventoryItemAttuned').checked = !!item.attuned;
          $('inventoryItemNotes').value = item.notes || '';
          $('inventoryItemModalLabel').textContent = 'Edit Item';
        } else {
          editIndexInput.value = '';
          $('inventoryItemName').value = '';
          $('inventoryItemQuantity').value = 1;
          $('inventoryItemWeight').value = 0;
          $('inventoryItemEquipped').checked = false;
          $('inventoryItemAttuned').checked = false;
          $('inventoryItemNotes').value = '';
          $('inventoryItemModalLabel').textContent = 'Add Item';
        }

        modal.show();
      }

      function saveInventoryItem() {
        const editIndex = $('inventoryItemEditIndex').value;
        const name = $('inventoryItemName').value.trim();
        const quantity = parseInt($('inventoryItemQuantity').value) || 1;
        const weight = parseFloat($('inventoryItemWeight').value) || 0;
        const equipped = $('inventoryItemEquipped').checked;
        const attuned = $('inventoryItemAttuned').checked;
        const notes = $('inventoryItemNotes').value.trim();

        if (!name) {
          alert('Please enter an item name.');
          return;
        }

        const item = {
          name,
          quantity,
          weight,
          equipped,
          attuned,
          notes
        };

        if (editIndex !== '') {
          // Edit existing item
          const idx = parseInt(editIndex);
          if (idx >= 0 && idx < currentInventoryList.length) {
            currentInventoryList[idx] = item;
          }
        } else {
          // Add new item
          currentInventoryList.push(item);
        }

        renderInventoryTable();
        updateEncumbrance();
        bootstrap.Modal.getInstance($('inventoryItemModal')).hide();
      }

      function deleteInventoryItem(index) {
        if (index < 0 || index >= currentInventoryList.length) return;
        const item = currentInventoryList[index];
        if (!confirm(`Delete "${item.name || 'Unnamed Item'}"?`)) return;
        currentInventoryList.splice(index, 1);
        renderInventoryTable();
        updateEncumbrance();
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

        // 2024 PHB exhaustion: -2 penalty to d20 rolls per level
        if (level === 0) {
          desc.textContent = '0 = No exhaustion';
        } else if (level >= 1 && level <= 5) {
          const penalty = level * 2;
          desc.textContent = `${level} = −${penalty} to all d20 rolls`;
        } else if (level === 6) {
          desc.textContent = '6 = Dead';
        } else if (level > 6 && level <= 10) {
          desc.textContent = `${level} = Dead (level 6+)`;
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

      // ---------- Concentration Management ----------

      // Track currently concentrating spell
      window.currentConcentrationSpell = null;

      // Check if currently concentrating
      function isConcentrating() {
        const btn = document.querySelector('.condition-btn[data-condition="Concentrating"]');
        return btn?.classList.contains('active') || false;
      }

      // Set concentration state
      function setConcentration(active, spellName = null) {
        const btn = document.querySelector('.condition-btn[data-condition="Concentrating"]');
        const spellInput = $('charConcentrationSpell');

        if (active) {
          if (btn) btn.classList.add('active');
          window.currentConcentrationSpell = spellName;
          // Update the spell name input and button tooltip
          if (spellInput && spellName) {
            spellInput.value = spellName;
          }
          if (btn && spellName) {
            btn.title = `Concentrating on: ${spellName}`;
          }
        } else {
          if (btn) {
            btn.classList.remove('active');
            btn.title = '';
          }
          window.currentConcentrationSpell = null;
          if (spellInput) {
            spellInput.value = '';
          }
        }
        syncConditionsToField();
        saveCurrentCharacter();

        // Dispatch event for combat view to update
        document.dispatchEvent(new CustomEvent('concentrationChanged', {
          detail: { active, spellName }
        }));
      }

      // Expose functions globally
      window.isConcentrating = isConcentrating;
      window.setConcentration = setConcentration;

      // Handle concentration check when taking damage
      function handleConcentrationCheck(damage) {
        if (!isConcentrating()) return true; // Not concentrating, no check needed

        const dc = Math.max(10, Math.floor(damage / 2));
        const conSaveBonus = parseInt($('saveConBonus')?.value, 10) || 0;

        const spellName = window.currentConcentrationSpell || 'a spell';
        const message = `Concentration Check Required!\n\n` +
          `You took ${damage} damage while concentrating on ${spellName}.\n` +
          `DC: ${dc} (10 or half damage, whichever is higher)\n` +
          `Your CON save bonus: ${conSaveBonus >= 0 ? '+' : ''}${conSaveBonus}\n\n` +
          `Click "Pass" if you succeeded, or "Fail" if you failed.`;

        // Use a custom prompt approach - prompt returns null on cancel, string on OK
        const result = prompt(message, 'Pass');

        // User typed something starting with 'p' (pass) or clicked OK with default
        const passed = result !== null && result.toLowerCase().startsWith('p');

        if (!passed) {
          setConcentration(false);
          if (typeof showRollToast === 'function') {
            showRollToast('Concentration', 'Lost!', `Failed DC ${dc}`);
          }
          alert(`Concentration on ${spellName} has been lost!`);
          return false;
        } else {
          if (typeof showRollToast === 'function') {
            showRollToast('Concentration', 'Maintained', `Passed DC ${dc}`);
          }
          return true;
        }
      }

      // Expose globally
      window.handleConcentrationCheck = handleConcentrationCheck;

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

      // ---------- Prepared Spell Count ----------
      function updatePreparedSpellCount() {
        const alertEl = $('preparedSpellsAlert');
        const countEl = $('preparedSpellCount');
        const maxEl = $('maxPreparedSpells');
        const statusEl = $('preparedSpellStatus');

        if (!alertEl || !countEl || !maxEl || !statusEl) return;

        // Get the current character's class
        const char = getCurrentCharacter();
        if (!char) {
          alertEl.classList.add('d-none');
          return;
        }

        // Extract base class name (without subclass in parentheses)
        const fullClass = $('charClass')?.value || char.charClass || '';
        const classMatch = fullClass.match(/^([^(]+)/);
        const className = classMatch ? classMatch[1].trim() : fullClass.trim();

        // Check if this class prepares spells
        if (!window.LevelUpData || !window.LevelUpData.classPreparesSpells(className)) {
          alertEl.classList.add('d-none');
          return;
        }

        // Show the alert for preparing casters
        alertEl.classList.remove('d-none');

        // Get the spellcasting ability and modifier
        const spellAbility = $('spellcastingAbility')?.value;
        if (!spellAbility) {
          maxEl.textContent = '?';
          countEl.textContent = '0';
          statusEl.textContent = 'Select Ability';
          statusEl.className = 'badge bg-warning';
          return;
        }

        const abilityScoreEl = $(`stat${spellAbility.charAt(0).toUpperCase() + spellAbility.slice(1)}`);
        const abilityScore = parseInt(abilityScoreEl?.value) || 10;
        const abilityMod = Math.floor((abilityScore - 10) / 2);

        // Get character level
        const level = parseInt($('charLevel')?.value) || 1;

        // Calculate max prepared spells
        const maxPrepared = window.LevelUpData.getMaxPreparedSpells(className, level, abilityMod);

        // Count currently prepared spells (excluding "alwaysPrepared" subclass spells)
        const preparedCount = currentSpellList.filter(spell => {
          // Only count spells that are prepared AND not always prepared (subclass spells)
          return spell.prepared && !spell.alwaysPrepared && spell.level > 0; // Cantrips don't count
        }).length;

        // Update UI
        countEl.textContent = preparedCount;
        maxEl.textContent = maxPrepared;

        // Update status badge
        if (preparedCount > maxPrepared) {
          statusEl.textContent = 'Over Limit!';
          statusEl.className = 'badge bg-danger';
          alertEl.classList.remove('alert-info');
          alertEl.classList.add('alert-warning');
        } else if (preparedCount === maxPrepared) {
          statusEl.textContent = 'Full';
          statusEl.className = 'badge bg-success';
          alertEl.classList.remove('alert-warning');
          alertEl.classList.add('alert-info');
        } else {
          statusEl.textContent = 'OK';
          statusEl.className = 'badge bg-secondary';
          alertEl.classList.remove('alert-warning');
          alertEl.classList.add('alert-info');
        }
      }

      // ---------- Fill form ----------
      function fillFormFromCharacter(char) {
          if (!char) return;

          // Set flag to prevent auto-saves while loading
          isLoadingCharacter = true;

          // Ensure derived values are in sync with stored scores/skills
          recalcDerivedOnCharacter(char);
            
          $('charName').value = char.name || '';
          $('playerName').value = char.playerName || '';
          $('charRace').value = char.race || '';
          // Display class with subclass if available
          if (char.subclass) {
            $('charClass').value = `${char.charClass} (${char.subclass})`;
          } else {
            $('charClass').value = char.charClass || '';
          }
          $('charBackground').value = char.background || '';
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
          $('charInspiration').checked = !!char.inspiration;
          $('charConcentrating').checked = !!char.concentrating;
          $('charConcentrationSpell').value = char.concentrationSpell || '';

          // Restore concentration spell to global state and update button tooltip
          if (char.concentrating && char.concentrationSpell) {
            window.currentConcentrationSpell = char.concentrationSpell;
            const concBtn = document.querySelector('.condition-btn[data-condition="Concentrating"]');
            if (concBtn) {
              concBtn.title = `Concentrating on: ${char.concentrationSpell}`;
            }
          } else {
            window.currentConcentrationSpell = null;
            const concBtn = document.querySelector('.condition-btn[data-condition="Concentrating"]');
            if (concBtn) {
              concBtn.title = '';
            }
          }

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
            const expEl = $(idBase + 'Exp');
            const bonusEl = $(idBase + 'Bonus');
            if (profEl) profEl.checked = !!s.prof;
            if (expEl) expEl.checked = !!s.exp;
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

          // Senses (passive perception, investigation, insight)
          const senses = char.senses || {};
          $('charPassivePerception').value = senses.passivePerception ?? '';
          $('charPassiveInvestigation').value = senses.passiveInvestigation ?? '';
          $('charPassiveInsight').value = senses.passiveInsight ?? '';
          if ($('senseDarkvision')) $('senseDarkvision').value = senses.darkvision || '';
          if ($('senseBlindsight')) $('senseBlindsight').value = senses.blindsight || '';
          if ($('senseTremorsense')) $('senseTremorsense').value = senses.tremorsense || '';
          if ($('senseTruesight')) $('senseTruesight').value = senses.truesight || '';
          $('sensesNotes').value = senses.notes || '';

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
          // Legacy inventory field (may not exist if using new structured inventory)
          const charInventoryEl = $('charInventory');
          if (charInventoryEl) charInventoryEl.value = char.inventory || '';
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
          syncInventoryFromCharacter(char);
          syncConditionsFromField();
          updatePortraitPreview(char);
          setLastUpdatedText(char);
          updateSpellSlotsDisplay();
          updateStorageUsageDisplay();

          // Clear loading flag after a small delay to allow all event handlers to settle
          setTimeout(() => {
            isLoadingCharacter = false;
            // Dispatch event to notify other parts of the app that character data is ready
            document.dispatchEvent(new CustomEvent('characterLoaded', { detail: { character: char } }));
          }, 100);
        }

      function getSpellSlotsForClassLevel(className, level) {
        // First try to use LevelUpData if available
        if (window.LevelUpData && typeof window.LevelUpData.getClassData === 'function') {
          const classData = window.LevelUpData.getClassData(className);
          if (classData && classData.spellSlots && classData.spellSlots[level]) {
            return classData.spellSlots[level];
          }
        }

        // Fallback: Use hardcoded spell slot tables (PHB standard progression)
        // Format: [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
        const spellSlotTables = {
          'Wizard': { 1: [2,0,0,0,0,0,0,0,0], 2: [3,0,0,0,0,0,0,0,0], 3: [4,2,0,0,0,0,0,0,0], 4: [4,3,0,0,0,0,0,0,0], 5: [4,3,2,0,0,0,0,0,0], 6: [4,3,3,0,0,0,0,0,0], 7: [4,3,3,1,0,0,0,0,0], 8: [4,3,3,2,0,0,0,0,0], 9: [4,3,3,3,1,0,0,0,0], 10: [4,3,3,3,2,0,0,0,0], 11: [4,3,3,3,2,1,0,0,0], 12: [4,3,3,3,2,1,0,0,0], 13: [4,3,3,3,2,1,1,0,0], 14: [4,3,3,3,2,1,1,0,0], 15: [4,3,3,3,2,1,1,1,0], 16: [4,3,3,3,2,1,1,1,0], 17: [4,3,3,3,2,1,1,1,1], 18: [4,3,3,3,3,1,1,1,1], 19: [4,3,3,3,3,2,1,1,1], 20: [4,3,3,3,3,2,2,1,1] },
          'Sorcerer': { 1: [2,0,0,0,0,0,0,0,0], 2: [3,0,0,0,0,0,0,0,0], 3: [4,2,0,0,0,0,0,0,0], 4: [4,3,0,0,0,0,0,0,0], 5: [4,3,2,0,0,0,0,0,0], 6: [4,3,3,0,0,0,0,0,0], 7: [4,3,3,1,0,0,0,0,0], 8: [4,3,3,2,0,0,0,0,0], 9: [4,3,3,3,1,0,0,0,0], 10: [4,3,3,3,2,0,0,0,0], 11: [4,3,3,3,2,1,0,0,0], 12: [4,3,3,3,2,1,0,0,0], 13: [4,3,3,3,2,1,1,0,0], 14: [4,3,3,3,2,1,1,0,0], 15: [4,3,3,3,2,1,1,1,0], 16: [4,3,3,3,2,1,1,1,0], 17: [4,3,3,3,2,1,1,1,1], 18: [4,3,3,3,3,1,1,1,1], 19: [4,3,3,3,3,2,1,1,1], 20: [4,3,3,3,3,2,2,1,1] },
          'Bard': { 1: [2,0,0,0,0,0,0,0,0], 2: [3,0,0,0,0,0,0,0,0], 3: [4,2,0,0,0,0,0,0,0], 4: [4,3,0,0,0,0,0,0,0], 5: [4,3,2,0,0,0,0,0,0], 6: [4,3,3,0,0,0,0,0,0], 7: [4,3,3,1,0,0,0,0,0], 8: [4,3,3,2,0,0,0,0,0], 9: [4,3,3,3,1,0,0,0,0], 10: [4,3,3,3,2,0,0,0,0], 11: [4,3,3,3,2,1,0,0,0], 12: [4,3,3,3,2,1,0,0,0], 13: [4,3,3,3,2,1,1,0,0], 14: [4,3,3,3,2,1,1,0,0], 15: [4,3,3,3,2,1,1,1,0], 16: [4,3,3,3,2,1,1,1,0], 17: [4,3,3,3,2,1,1,1,1], 18: [4,3,3,3,3,1,1,1,1], 19: [4,3,3,3,3,2,1,1,1], 20: [4,3,3,3,3,2,2,1,1] },
          'Cleric': { 1: [2,0,0,0,0,0,0,0,0], 2: [3,0,0,0,0,0,0,0,0], 3: [4,2,0,0,0,0,0,0,0], 4: [4,3,0,0,0,0,0,0,0], 5: [4,3,2,0,0,0,0,0,0], 6: [4,3,3,0,0,0,0,0,0], 7: [4,3,3,1,0,0,0,0,0], 8: [4,3,3,2,0,0,0,0,0], 9: [4,3,3,3,1,0,0,0,0], 10: [4,3,3,3,2,0,0,0,0], 11: [4,3,3,3,2,1,0,0,0], 12: [4,3,3,3,2,1,0,0,0], 13: [4,3,3,3,2,1,1,0,0], 14: [4,3,3,3,2,1,1,0,0], 15: [4,3,3,3,2,1,1,1,0], 16: [4,3,3,3,2,1,1,1,0], 17: [4,3,3,3,2,1,1,1,1], 18: [4,3,3,3,3,1,1,1,1], 19: [4,3,3,3,3,2,1,1,1], 20: [4,3,3,3,3,2,2,1,1] },
          'Druid': { 1: [2,0,0,0,0,0,0,0,0], 2: [3,0,0,0,0,0,0,0,0], 3: [4,2,0,0,0,0,0,0,0], 4: [4,3,0,0,0,0,0,0,0], 5: [4,3,2,0,0,0,0,0,0], 6: [4,3,3,0,0,0,0,0,0], 7: [4,3,3,1,0,0,0,0,0], 8: [4,3,3,2,0,0,0,0,0], 9: [4,3,3,3,1,0,0,0,0], 10: [4,3,3,3,2,0,0,0,0], 11: [4,3,3,3,2,1,0,0,0], 12: [4,3,3,3,2,1,0,0,0], 13: [4,3,3,3,2,1,1,0,0], 14: [4,3,3,3,2,1,1,0,0], 15: [4,3,3,3,2,1,1,1,0], 16: [4,3,3,3,2,1,1,1,0], 17: [4,3,3,3,2,1,1,1,1], 18: [4,3,3,3,3,1,1,1,1], 19: [4,3,3,3,3,2,1,1,1], 20: [4,3,3,3,3,2,2,1,1] },
          'Paladin': { 1: [0,0,0,0,0,0,0,0,0], 2: [2,0,0,0,0,0,0,0,0], 3: [3,0,0,0,0,0,0,0,0], 4: [3,0,0,0,0,0,0,0,0], 5: [4,2,0,0,0,0,0,0,0], 6: [4,2,0,0,0,0,0,0,0], 7: [4,3,0,0,0,0,0,0,0], 8: [4,3,0,0,0,0,0,0,0], 9: [4,3,2,0,0,0,0,0,0], 10: [4,3,2,0,0,0,0,0,0], 11: [4,3,3,0,0,0,0,0,0], 12: [4,3,3,0,0,0,0,0,0], 13: [4,3,3,1,0,0,0,0,0], 14: [4,3,3,1,0,0,0,0,0], 15: [4,3,3,2,0,0,0,0,0], 16: [4,3,3,2,0,0,0,0,0], 17: [4,3,3,3,1,0,0,0,0], 18: [4,3,3,3,1,0,0,0,0], 19: [4,3,3,3,2,0,0,0,0], 20: [4,3,3,3,2,0,0,0,0] },
          'Ranger': { 1: [0,0,0,0,0,0,0,0,0], 2: [2,0,0,0,0,0,0,0,0], 3: [3,0,0,0,0,0,0,0,0], 4: [3,0,0,0,0,0,0,0,0], 5: [4,2,0,0,0,0,0,0,0], 6: [4,2,0,0,0,0,0,0,0], 7: [4,3,0,0,0,0,0,0,0], 8: [4,3,0,0,0,0,0,0,0], 9: [4,3,2,0,0,0,0,0,0], 10: [4,3,2,0,0,0,0,0,0], 11: [4,3,3,0,0,0,0,0,0], 12: [4,3,3,0,0,0,0,0,0], 13: [4,3,3,1,0,0,0,0,0], 14: [4,3,3,1,0,0,0,0,0], 15: [4,3,3,2,0,0,0,0,0], 16: [4,3,3,2,0,0,0,0,0], 17: [4,3,3,3,1,0,0,0,0], 18: [4,3,3,3,1,0,0,0,0], 19: [4,3,3,3,2,0,0,0,0], 20: [4,3,3,3,2,0,0,0,0] },
          'Artificer': { 1: [0,0,0,0,0,0,0,0,0], 2: [2,0,0,0,0,0,0,0,0], 3: [3,0,0,0,0,0,0,0,0], 4: [3,0,0,0,0,0,0,0,0], 5: [4,2,0,0,0,0,0,0,0], 6: [4,2,0,0,0,0,0,0,0], 7: [4,3,0,0,0,0,0,0,0], 8: [4,3,0,0,0,0,0,0,0], 9: [4,3,2,0,0,0,0,0,0], 10: [4,3,2,0,0,0,0,0,0], 11: [4,3,3,0,0,0,0,0,0], 12: [4,3,3,0,0,0,0,0,0], 13: [4,3,3,1,0,0,0,0,0], 14: [4,3,3,1,0,0,0,0,0], 15: [4,3,3,2,0,0,0,0,0], 16: [4,3,3,2,0,0,0,0,0], 17: [4,3,3,3,1,0,0,0,0], 18: [4,3,3,3,1,0,0,0,0], 19: [4,3,3,3,2,0,0,0,0], 20: [4,3,3,3,2,0,0,0,0] }
        };

        // Warlock uses Pact Magic (handled separately)
        if (className === 'Warlock') {
          return null;
        }

        // Return spell slots for the class and level
        if (spellSlotTables[className] && spellSlotTables[className][level]) {
          return spellSlotTables[className][level];
        }

        return null;
      }

      function getPactMagicSlots(level) {
        // Warlock pact magic progression
        const pactMagic = {
          1: { slots: 1, level: 1 },
          2: { slots: 2, level: 1 },
          3: { slots: 2, level: 2 },
          4: { slots: 2, level: 2 },
          5: { slots: 2, level: 3 },
          6: { slots: 2, level: 3 },
          7: { slots: 2, level: 4 },
          8: { slots: 2, level: 4 },
          9: { slots: 2, level: 5 },
          10: { slots: 2, level: 5 },
          11: { slots: 3, level: 5 },
          12: { slots: 3, level: 5 },
          13: { slots: 3, level: 5 },
          14: { slots: 3, level: 5 },
          15: { slots: 3, level: 5 },
          16: { slots: 3, level: 5 },
          17: { slots: 4, level: 5 },
          18: { slots: 4, level: 5 },
          19: { slots: 4, level: 5 },
          20: { slots: 4, level: 5 }
        };
        return pactMagic[level] || null;
      }

      function fillFormFromWizardData(wizardData) {
        console.log('📝 fillFormFromWizardData called with data:', wizardData);

        // Set loading flag to prevent auto-saves during form population
        isLoadingCharacter = true;

        // Fill in basic info
        console.log('Setting character name to:', wizardData.name);
        if (wizardData.name) $('charName').value = wizardData.name;
        if (wizardData.playerName) $('playerName').value = wizardData.playerName;
        if (wizardData.race) {
          const raceText = wizardData.subrace ? `${wizardData.race} (${wizardData.subrace})` : wizardData.race;
          $('charRace').value = raceText;
        }
        if (wizardData.class) {
          const classText = wizardData.subclass ? `${wizardData.class} (${wizardData.subclass})` : wizardData.class;
          $('charClass').value = classText;
        }
        if (wizardData.background) $('charBackground').value = wizardData.background;
        if (wizardData.level) $('charLevel').value = wizardData.level;
        if (wizardData.alignment) $('charAlignment').value = wizardData.alignment;

        // Fill in ability scores (with racial bonuses already applied)
        if (wizardData.str) $('statStr').value = wizardData.str;
        if (wizardData.dex) $('statDex').value = wizardData.dex;
        if (wizardData.con) $('statCon').value = wizardData.con;
        if (wizardData.int) $('statInt').value = wizardData.int;
        if (wizardData.wis) $('statWis').value = wizardData.wis;
        if (wizardData.cha) $('statCha').value = wizardData.cha;

        // Fill in combat stats
        if (wizardData.maxHP) {
          $('charMaxHP').value = wizardData.maxHP;
          $('charCurrentHP').value = wizardData.currentHP || wizardData.maxHP;
        }
        if (wizardData.ac) $('charAC').value = wizardData.ac;
        if (wizardData.speed) $('charSpeed').value = wizardData.speed;
        if (wizardData.hitDie) {
          $('charHitDice').value = wizardData.hitDie;
          if ($('charHitDiceRemaining')) $('charHitDiceRemaining').value = wizardData.hitDie;
        }

        // Fill in proficiency bonus
        if (wizardData.proficiencyBonus && $('charProfBonus')) {
          $('charProfBonus').value = wizardData.proficiencyBonus;
        }

        // Trigger recalculation of derived values
        recalcDerivedFromForm();

        // Set saving throw proficiencies
        if (wizardData.savingThrows && wizardData.savingThrows.length > 0) {
          const saveCheckboxes = {
            'Strength': $('saveStrProf'),
            'Dexterity': $('saveDexProf'),
            'Constitution': $('saveConProf'),
            'Intelligence': $('saveIntProf'),
            'Wisdom': $('saveWisProf'),
            'Charisma': $('saveChaProf')
          };

          // Uncheck all first
          Object.values(saveCheckboxes).forEach(cb => {
            if (cb) cb.checked = false;
          });

          // Check the class proficiencies
          wizardData.savingThrows.forEach(save => {
            if (saveCheckboxes[save]) {
              saveCheckboxes[save].checked = true;
            }
          });
        }

        recalcSavesFromForm(false);

        // Set skill proficiencies
        if (wizardData.allSkills && wizardData.allSkills.length > 0) {
          const skillCheckboxes = {
            'Acrobatics': $('skillAcrobaticsProf'),
            'Animal Handling': $('skillAnimalHandlingProf'),
            'Arcana': $('skillArcanaProf'),
            'Athletics': $('skillAthleticsProf'),
            'Deception': $('skillDeceptionProf'),
            'History': $('skillHistoryProf'),
            'Insight': $('skillInsightProf'),
            'Intimidation': $('skillIntimidationProf'),
            'Investigation': $('skillInvestigationProf'),
            'Medicine': $('skillMedicineProf'),
            'Nature': $('skillNatureProf'),
            'Perception': $('skillPerceptionProf'),
            'Performance': $('skillPerformanceProf'),
            'Persuasion': $('skillPersuasionProf'),
            'Religion': $('skillReligionProf'),
            'Sleight of Hand': $('skillSleightOfHandProf'),
            'Stealth': $('skillStealthProf'),
            'Survival': $('skillSurvivalProf')
          };

          // Uncheck all first
          Object.values(skillCheckboxes).forEach(cb => {
            if (cb) cb.checked = false;
          });

          // Check the selected skills
          wizardData.allSkills.forEach(skill => {
            if (skillCheckboxes[skill]) {
              skillCheckboxes[skill].checked = true;
            }
          });
        }

        recalcSkillsFromForm(false);
        recalcPassivesFromForm();

        // Populate sense types from wizard data
        if (wizardData.speciesSenses) {
          const ss = wizardData.speciesSenses;
          if (ss.darkvision && $('senseDarkvision')) $('senseDarkvision').value = ss.darkvision;
          if (ss.blindsight && $('senseBlindsight')) $('senseBlindsight').value = ss.blindsight;
          if (ss.tremorsense && $('senseTremorsense')) $('senseTremorsense').value = ss.tremorsense;
          if (ss.truesight && $('senseTruesight')) $('senseTruesight').value = ss.truesight;
        }

        // Add wizard-selected spells to the spell list
        // Use normalizeSpellEntry so field names (casting_time, body, etc.) are always consistent
        // and window.currentSpellList is kept in sync with the closure variable.
        if (wizardData.selectedSpells && wizardData.selectedSpells.length > 0) {
          currentSpellList = wizardData.selectedSpells
            .map(spell => normalizeSpellEntry(spell))
            .filter(Boolean);
        }

        // Add cantrips
        if (wizardData.selectedCantrips && wizardData.selectedCantrips.length > 0) {
          const cantrips = wizardData.selectedCantrips
            .map(spell => normalizeSpellEntry(spell))
            .filter(Boolean);
          currentSpellList = [...(currentSpellList || []), ...cantrips];
        }

        // Add subclass spells (always prepared)
        if (wizardData.subclassSpells && wizardData.subclassSpells.length > 0) {
          const subclassSpells = wizardData.subclassSpells.map(spell => {
            const n = normalizeSpellEntry(spell);
            if (n) { n.prepared = true; n.alwaysPrepared = true; }
            return n;
          }).filter(Boolean);
          currentSpellList = [...(currentSpellList || []), ...subclassSpells];
          console.log(`✨ Added ${subclassSpells.length} subclass spells (always prepared)`);
        }

        // Add subclass bonus cantrips (e.g., Light Domain's Light, Celestial Warlock's Light + Sacred Flame)
        if (wizardData.subclassBonusCantrips && wizardData.subclassBonusCantrips.length > 0) {
          const bonusCantrips = wizardData.subclassBonusCantrips.map(spell => {
            const n = normalizeSpellEntry(spell);
            if (n) {
              n.prepared = true;
              n.alwaysPrepared = true;
              n.subclassCantrip = true;
              n.subclassNote = `(Bonus from ${spell.subclassSource || wizardData.subclass})`;
            }
            return n;
          }).filter(Boolean);
          currentSpellList = [...(currentSpellList || []), ...bonusCantrips];
          console.log(`🌟 Added ${bonusCantrips.length} subclass bonus cantrip(s)`);
        }

        // Add racial spells (innate spellcasting from race)
        if (wizardData.racialSpells && wizardData.racialSpells.length > 0) {
          const racialSpells = wizardData.racialSpells.map(spell => {
            let racialNote = '';
            if (spell.racialType === 'cantrip') {
              racialNote = '(Racial cantrip)';
            } else if (spell.racialType === 'once_per_long_rest') {
              racialNote = spell.racialNote ? `(Racial: ${spell.racialNote}, 1/long rest)` : '(Racial: 1/long rest)';
            } else if (spell.racialType === 'once_per_short_rest') {
              racialNote = spell.racialNote ? `(Racial: ${spell.racialNote}, 1/short rest)` : '(Racial: 1/short rest)';
            } else if (spell.racialType === 'at_will') {
              racialNote = '(Racial: at will)';
            }
            const n = normalizeSpellEntry(spell);
            if (n) {
              n.prepared = true;
              n.alwaysPrepared = true;
              n.racialSpell = true;
              n.racialNote = racialNote;
            }
            return n;
          }).filter(Boolean);
          currentSpellList = [...(currentSpellList || []), ...racialSpells];
          console.log(`🧬 Added ${racialSpells.length} racial spells (innate spellcasting)`);
        }

        // Sync global reference so combat view can read the updated spell list immediately
        window.currentSpellList = currentSpellList;

        // Render the spell list if spells were added
        if (currentSpellList && currentSpellList.length > 0) {
          renderCharacterSpellList();
          updatePreparedSpellCount();
        }

        // Set spellcasting ability based on class
        if (wizardData.class) {
          const spellcastingAbilities = {
            'Wizard': 'int',
            'Sorcerer': 'cha',
            'Bard': 'cha',
            'Warlock': 'cha',
            'Cleric': 'wis',
            'Druid': 'wis',
            'Paladin': 'cha',
            'Ranger': 'wis',
            'Artificer': 'int'
          };

          const ability = spellcastingAbilities[wizardData.class];
          if (ability && $('spellcastingAbility')) {
            $('spellcastingAbility').value = ability;

            // Calculate and set Spell Save DC and Spell Attack Bonus
            const abilityScore = wizardData[ability] || 10; // Get the ability score (e.g., wizardData.int)
            const abilityMod = Math.floor((abilityScore - 10) / 2);
            const profBonus = wizardData.proficiencyBonus || 2;

            const spellSaveDC = 8 + profBonus + abilityMod;
            const spellAttackBonus = profBonus + abilityMod;

            if ($('spellSaveDC')) {
              $('spellSaveDC').textContent = spellSaveDC;
            }
            if ($('spellAttackBonus')) {
              $('spellAttackBonus').textContent = spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus;
            }
          }
        }

        // Set spell slots based on class and level
        if (wizardData.class && wizardData.level) {
          const spellSlots = getSpellSlotsForClassLevel(wizardData.class, wizardData.level);
          console.log(`Setting spell slots for ${wizardData.class} level ${wizardData.level}:`, spellSlots);
          if (spellSlots) {
            // Find the highest spell level with slots
            let highestSlotLevel = 0;
            for (let i = 0; i < spellSlots.length; i++) {
              if (spellSlots[i] > 0) {
                highestSlotLevel = i + 1;
              }
            }

            // Populate all spell levels up to and including one beyond the highest
            // This makes the next spell level visible on the UI (with 0 slots)
            const maxLevelToPopulate = Math.min(highestSlotLevel + 1, 9);

            for (let i = 1; i <= maxLevelToPopulate; i++) {
              const maxEl = $(`slots${i}Max`);
              const usedEl = $(`slots${i}Used`);
              if (maxEl) {
                const slotValue = spellSlots[i - 1] || 0;
                maxEl.value = slotValue;
                if (usedEl) usedEl.value = 0; // Start with all slots available
                console.log(`  Slot level ${i}: Max=${slotValue}, Used=0`);
              }
            }
          }

          // Handle Warlock pact magic — moved outside if(spellSlots) because
          // getSpellSlotsForClassLevel returns null for Warlocks intentionally
          if (wizardData.class === 'Warlock' && wizardData.level >= 1) {
            const pactSlots = getPactMagicSlots(wizardData.level);
            if (pactSlots) {
              if ($('pactMax'))   $('pactMax').value   = pactSlots.slots;
              if ($('pactLevel')) $('pactLevel').value = pactSlots.level;
              if ($('pactUsed'))  $('pactUsed').value  = 0;
              updateSpellSlotsDisplay();
              console.log(`🔮 Set Warlock pact slots: ${pactSlots.slots} × level ${pactSlots.level}`);

              // Add pact slots to the tracked resource area (first empty slot)
              for (let i = 1; i <= 3; i++) {
                const nameEl = $(`res${i}Name`);
                if (nameEl && !nameEl.value) {
                  nameEl.value = `Pact Slots (Lvl ${pactSlots.level})`;
                  if ($(`res${i}Current`)) $(`res${i}Current`).value = pactSlots.slots;
                  if ($(`res${i}Max`))     $(`res${i}Max`).value     = pactSlots.slots;
                  break;
                }
              }
            }
          }
        }

        // Populate racial and class features if provided
        if ($('charFeatures')) {
          // Use allFeatures if available (includes racial + class), fallback to classFeatures only
          const featuresText = wizardData.allFeatures || wizardData.classFeatures || '';
          $('charFeatures').value = featuresText;
        }

        // Generate default attacks based on class and stats
        if (wizardData.class && window.LevelUpData && typeof window.LevelUpData.generateDefaultAttacks === 'function') {
          const stats = {
            str: wizardData.str || 10,
            dex: wizardData.dex || 10,
            con: wizardData.con || 10,
            int: wizardData.int || 10,
            wis: wizardData.wis || 10,
            cha: wizardData.cha || 10
          };
          const level = wizardData.level || 1;
          const attacks = window.LevelUpData.generateDefaultAttacks(wizardData.class, level, stats);

          if (attacks && attacks.length > 0) {
            currentAttackList = attacks;
            window.currentAttackList = currentAttackList;
            renderAttackList();
            console.log(`⚔️ Generated ${attacks.length} default attacks for ${wizardData.class}`);
          }
        }

        // Generate class resources based on class and stats
        if (wizardData.class && window.LevelUpData && typeof window.LevelUpData.getClassResources === 'function') {
          const stats = {
            str: wizardData.str || 10,
            dex: wizardData.dex || 10,
            con: wizardData.con || 10,
            int: wizardData.int || 10,
            wis: wizardData.wis || 10,
            cha: wizardData.cha || 10
          };
          const level = wizardData.level || 1;
          const resources = window.LevelUpData.getClassResources(wizardData.class, level, stats);

          if (resources && resources.length > 0) {
            // Populate up to 3 resource slots
            for (let i = 0; i < Math.min(resources.length, 3); i++) {
              const res = resources[i];
              const idx = i + 1;
              if ($(`res${idx}Name`)) $(`res${idx}Name`).value = res.name;
              if ($(`res${idx}Current`)) $(`res${idx}Current`).value = res.current;
              if ($(`res${idx}Max`)) $(`res${idx}Max`).value = res.max;
            }
            console.log(`🎯 Generated ${resources.length} class resources for ${wizardData.class}`);
          }
        }

        // Populate starting equipment (class + background)
        if (wizardData.startingEquipment && wizardData.startingEquipment.length > 0) {
          // Set the inventory list
          currentInventoryList = [...wizardData.startingEquipment];

          // Render the inventory table
          if (typeof renderInventoryTable === 'function') {
            renderInventoryTable({ inventoryItems: currentInventoryList });
          }

          console.log(`🎒 Populated ${currentInventoryList.length} starting equipment items`);
        }

        // Handle starting currency (if player took gold instead of equipment)
        if (wizardData.startingCurrency) {
          const currencyInputs = {
            cp: $('currencyCP'),
            sp: $('currencySP'),
            ep: $('currencyEP'),
            gp: $('currencyGP'),
            pp: $('currencyPP')
          };

          Object.entries(wizardData.startingCurrency).forEach(([type, amount]) => {
            if (currencyInputs[type] && amount > 0) {
              currencyInputs[type].value = amount;
            }
          });

          console.log(`💰 Set starting currency: ${wizardData.startingCurrency.gp || 0} gp`);
        }

        // Handle custom attacks from equipment choices
        if (wizardData.customAttacks && wizardData.customAttacks.length > 0) {
          // Merge with any generated attacks, avoiding duplicates by name
          const existingNames = new Set(currentAttackList.map(a => a.name));
          wizardData.customAttacks.forEach(attack => {
            if (!existingNames.has(attack.name)) {
              currentAttackList.push(attack);
              existingNames.add(attack.name);
            }
          });

          window.currentAttackList = currentAttackList;
          if (typeof renderAttackList === 'function') {
            renderAttackList();
          }

          console.log(`⚔️ Added ${wizardData.customAttacks.length} attacks from equipment choices`);
        }

        console.log('✅ Form population complete, scheduling save...');

        // Clear loading flag after a short delay
        setTimeout(() => {
          isLoadingCharacter = false;
          console.log('💾 Saving character from wizard...');
          // NOW save the character once
          saveCurrentCharacter();
          console.log('✅ Character saved!');
        }, 100);
      }

      // Make the function globally accessible for the wizard
      window.fillFormFromWizardData = fillFormFromWizardData;

      // ---------- Create / Save / Delete ----------
      function newCharacterTemplate() {
        return {
          id: 'char-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
          name: 'New Character',
          playerName: '',
          race: '',
          charClass: '',
          subclass: '',
          subclassLevel: 0,
          background: '',
          level: '',
          alignment: '',
          roleNotes: '',

          // Multiclassing support
          multiclass: false,
          classes: [], // Array of {className, subclass, level, subclassLevel}

          // Combat snapshot
          ac: '',
          maxHP: '',
          currentHP: '',
          tempHP: '',
          speed: '',
          initMod: '',
          passivePerception: '',
          conditions: '',
          inspiration: false,
          concentrating: false,
          concentrationSpell: '',

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
            acrobatics: { prof: false, exp: false, bonus: '' },
            animalHandling: { prof: false, exp: false, bonus: '' },
            arcana: { prof: false, exp: false, bonus: '' },
            athletics: { prof: false, exp: false, bonus: '' },
            deception: { prof: false, exp: false, bonus: '' },
            history: { prof: false, exp: false, bonus: '' },
            insight: { prof: false, exp: false, bonus: '' },
            intimidation: { prof: false, exp: false, bonus: '' },
            investigation: { prof: false, exp: false, bonus: '' },
            medicine: { prof: false, exp: false, bonus: '' },
            nature: { prof: false, exp: false, bonus: '' },
            perception: { prof: false, exp: false, bonus: '' },
            performance: { prof: false, exp: false, bonus: '' },
            persuasion: { prof: false, exp: false, bonus: '' },
            religion: { prof: false, exp: false, bonus: '' },
            sleightOfHand: { prof: false, exp: false, bonus: '' },
            stealth: { prof: false, exp: false, bonus: '' },
            survival: { prof: false, exp: false, bonus: '' }
          },
          skillsNotes: '',

          // Senses
          senses: {
            passivePerception: '',
            passiveInvestigation: '',
            passiveInsight: '',
            darkvision: '',
            blindsight: '',
            tremorsense: '',
            truesight: '',
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
          inventory: '', // Legacy text field (kept for backward compatibility)
          inventoryItems: [], // New structured inventory
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
        // Ask user if they want to use the wizard
        const useWizard = confirm(
          "Would you like to use the Character Creation Wizard?\n\n" +
          "The wizard will guide you step-by-step through creating a new D&D character.\n\n" +
          "Click OK to use the wizard, or Cancel to create a blank character sheet."
        );

        if (useWizard && typeof CharacterCreationWizard !== 'undefined') {
          // Create new character first, then open wizard
          const newChar = newCharacterTemplate();
          characters.push(newChar);
          currentCharacterId = newChar.id;
          renderCharacterSelect();
          fillFormFromCharacter(newChar);
          saveCharactersToStorage();

          // Open the wizard
          CharacterCreationWizard.open();
        } else {
          // Create blank character normally
          const newChar = newCharacterTemplate();
          characters.push(newChar);
          currentCharacterId = newChar.id;
          renderCharacterSelect();
          fillFormFromCharacter(newChar);
          saveCharactersToStorage();
        }
      }
      function saveCurrentCharacter() {
          // Don't save if we're in the middle of loading a character
          if (isLoadingCharacter) {
            return;
          }

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

          // Parse class field to extract class(es) and subclass(es)
          // Supports both single-class: "Wizard (School of Evocation)"
          // and multiclass: "Paladin (Oath of Devotion) / Fighter (Champion)"
          const fullClass = getVal('charClass');
          const classes = fullClass.split('/').map(c => c.trim());

          if (classes.length > 1) {
            // Multiclass character
            char.multiclass = true;
            char.classes = [];

            let totalLevel = 0;
            for (const classStr of classes) {
              const match = classStr.match(/^([^(]+)(?:\(([^)]+)\))?\s*(\d+)?/);
              if (match) {
                const className = match[1].trim();
                const subclass = match[2] ? match[2].trim() : '';
                const classLevel = match[3] ? parseInt(match[3], 10) : 1; // Default to 1 if not specified

                char.classes.push({
                  className,
                  subclass,
                  level: classLevel,
                  subclassLevel: subclass ? classLevel : 0
                });

                totalLevel += classLevel;
              }
            }

            // For backward compatibility, set primary class as first class
            if (char.classes.length > 0) {
              char.charClass = char.classes[0].className;
              char.subclass = char.classes[0].subclass;
              char.subclassLevel = char.classes[0].subclassLevel;
            }

            // Update total level if it differs
            if (totalLevel > 0 && totalLevel !== getNum('charLevel')) {
              console.warn(`Total multiclass levels (${totalLevel}) differs from character level (${getNum('charLevel')}). Using character level.`);
            }

          } else {
            // Single class character
            char.multiclass = false;
            char.classes = [];

            const match = fullClass.match(/^([^(]+)(?:\(([^)]+)\))?/);
            if (match) {
              char.charClass = match[1].trim();
              if (match[2]) {
                char.subclass = match[2].trim();
                // Set subclassLevel if not already set
                if (!char.subclassLevel || char.subclassLevel === 0) {
                  const currentLevel = getNum('charLevel');
                  if (window.LevelUpData && typeof window.LevelUpData.getSubclassSelectionLevel === 'function') {
                    const selectionLevel = window.LevelUpData.getSubclassSelectionLevel(char.charClass);
                    char.subclassLevel = selectionLevel || currentLevel;
                  } else {
                    char.subclassLevel = currentLevel;
                  }
                }
              } else {
                char.subclass = '';
                char.subclassLevel = 0;
              }
            } else {
              char.charClass = fullClass;
              char.subclass = '';
              char.subclassLevel = 0;
            }
          }

          char.background = getVal('charBackground');
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
          char.inspiration = !!$('charInspiration')?.checked;
          char.concentrating = !!$('charConcentrating')?.checked;
          char.concentrationSpell = getVal('charConcentrationSpell');

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
            const expEl = $(idBase + 'Exp');
            const bonusEl = $(idBase + 'Bonus');
            const prof = profEl ? !!profEl.checked : false;
            const exp = expEl ? !!expEl.checked : false;
            const bonusVal = bonusEl?.value.trim() || '';
            const bonus = bonusVal === '' ? '' : (isNaN(Number(bonusVal)) ? '' : Number(bonusVal));
            char.skills[key] = { prof, exp, bonus };
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
          char.senses.passivePerception = getNum('charPassivePerception');
          char.senses.passiveInvestigation = getNum('charPassiveInvestigation');
          char.senses.passiveInsight = getNum('charPassiveInsight');
          char.senses.darkvision = getNum('senseDarkvision');
          char.senses.blindsight = getNum('senseBlindsight');
          char.senses.tremorsense = getNum('senseTremorsense');
          char.senses.truesight = getNum('senseTruesight');
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
          char.inventoryItems = Array.isArray(currentInventoryList) ? [...currentInventoryList] : [];
          char.inventory = getVal('charInventory'); // Keep legacy field for backward compatibility
          char.notes = getVal('charNotes');
          char.tableNotes = getVal('charTableNotes');
          char.extraNotes = getVal('charExtraNotes');

          // Portrait data - preserve existing portrait data (don't overwrite with form fields)
          // The portrait is managed through the portrait modal, not the main form
          // So we just ensure the fields exist, but don't overwrite them here
          if (!char.portraitType) char.portraitType = null;
          if (!char.portraitData) char.portraitData = null;
          if (!char.portraitSettings) char.portraitSettings = { scale: 1, offsetX: 0, offsetY: 0 };

          // Recalculate derived fields (mods, PB, passivePerception) based on the updated data
          recalcDerivedOnCharacter(char);

          char.lastUpdated = new Date().toISOString();

          saveCharactersToStorage();
          renderCharacterSelect();
          setLastUpdatedText(char);
          updateStorageUsageDisplay();
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
      async function importCharactersFromFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function (e) {
          try {
            const text = e.target.result;
            const parsed = JSON.parse(text);
            const imported = Array.isArray(parsed) ? parsed : [parsed];
            if (!imported.length) return;

            const tempCharacters = [];

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

              tempCharacters.push(c);
            });

            // Try to save with portraits first
            const originalCharacters = [...characters];
            tempCharacters.forEach(c => characters.push(c));

            try {
              await saveCharactersToStorage();
              // Success! Update UI
              currentCharacterId = tempCharacters[tempCharacters.length - 1].id;
              renderCharacterSelect();
              fillFormFromCharacter(getCurrentCharacter());
              alert(`Successfully imported ${tempCharacters.length} character(s)!`);
            } catch (error) {
              // Check if it's a quota error
              if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                // Restore original characters
                characters = originalCharacters;

                const choice = confirm(
                  '⚠️ Storage Quota Exceeded!\n\n' +
                  'The imported character(s) have large portrait images that exceed storage capacity.\n\n' +
                  'Would you like to import WITHOUT the portraits?\n\n' +
                  'Click OK to import without portraits, or Cancel to abort.'
                );

                if (choice) {
                  // Remove portraits and try again
                  tempCharacters.forEach(c => {
                    c.portraitType = null;
                    c.portraitData = null;
                    c.portraitSettings = { scale: 1, offsetX: 0, offsetY: 0 };
                    characters.push(c);
                  });

                  try {
                    await saveCharactersToStorage();
                    currentCharacterId = tempCharacters[tempCharacters.length - 1].id;
                    renderCharacterSelect();
                    fillFormFromCharacter(getCurrentCharacter());
                    alert(`Successfully imported ${tempCharacters.length} character(s) without portraits!`);
                  } catch (retryError) {
                    characters = originalCharacters;
                    alert('Import failed even without portraits. Your storage may be full.\n\nTry deleting some characters first.');
                  }
                } else {
                  alert('Import cancelled.');
                }
              } else {
                characters = originalCharacters;
                throw error;
              }
            }
          } catch (error) {
            console.error('Import error:', error);
            alert('Import failed: ' + (error.message || 'invalid JSON format'));
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

            // ---------- Token Generation ----------
      /**
       * Generates a circular token image for the character
       * @param {Object} char - Character object with portraitData and portraitSettings
       * @returns {Promise<string>} - Base64 data URL of the generated token
       */
      async function generateCharacterToken(char) {
        return new Promise((resolve, reject) => {
          const canvas = document.createElement('canvas');
          const size = 200; // Token size
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          // Helper to load an image
          const loadImage = (src, isPortrait = false) => {
            return new Promise((res, rej) => {
              const img = new Image();
              // Set crossOrigin for URL-based images to avoid canvas tainting
              if (isPortrait && src.startsWith('http')) {
                img.crossOrigin = 'anonymous';
              }
              img.onload = () => res(img);
              img.onerror = () => rej(new Error(`Failed to load image: ${src}`));
              img.src = src;
            });
          };

          // Main token generation logic
          const generateToken = async () => {
            try {
              // Draw circular clipping path - slightly smaller to fit within the frame border
              const clipRadius = (size / 2) * 0.88; // 88% of full radius to account for frame border
              ctx.save();
              ctx.beginPath();
              ctx.arc(size / 2, size / 2, clipRadius, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();

              if (char.portraitData) {
                // Character has a portrait - use it with their positioning
                const portraitImg = await loadImage(char.portraitData, true);
                const settings = char.portraitSettings || { scale: 1, offsetX: 0, offsetY: 0 };

                // Apply the character's portrait settings
                ctx.save();
                ctx.translate(size / 2, size / 2);
                ctx.translate(settings.offsetX || 0, settings.offsetY || 0);
                ctx.scale(settings.scale || 1, settings.scale || 1);

                // Draw portrait centered
                const imgWidth = portraitImg.width;
                const imgHeight = portraitImg.height;
                ctx.drawImage(portraitImg, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
                ctx.restore();

                // Load and draw the frame overlay
                try {
                  const frameImg = await loadImage('images/tokens/CharacterTokenFrame.png');
                  ctx.restore(); // Remove circular clip for frame
                  ctx.drawImage(frameImg, 0, 0, size, size);
                } catch (frameErr) {
                  console.warn('Could not load character token frame, using simple circle:', frameErr);
                  ctx.restore(); // Just remove clip, portrait already drawn
                }
              } else {
                // No portrait - use base token with character name
                try {
                  const baseImg = await loadImage('images/tokens/BaseToken.png');
                  ctx.drawImage(baseImg, 0, 0, size, size);
                  ctx.restore(); // Remove circular clip

                  // Add character name/initials as text
                  const name = (char.name || '').trim();
                  if (name) {
                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Use first letter or first two letters if available
                    const initials = name.length > 1 ? name.substring(0, 2).toUpperCase() : name.substring(0, 1).toUpperCase();
                    ctx.fillText(initials, size / 2, size / 2 + 10);
                  }
                } catch (baseErr) {
                  console.warn('Could not load base token, using colored circle:', baseErr);
                  ctx.restore(); // Remove circular clip

                  // Fallback: draw a simple colored circle with initials
                  ctx.fillStyle = '#8B7355'; // Brown/tan color
                  ctx.beginPath();
                  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                  ctx.fill();

                  const name = (char.name || '').trim();
                  if (name) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const initials = name.length > 1 ? name.substring(0, 2).toUpperCase() : name.substring(0, 1).toUpperCase();
                    ctx.fillText(initials, size / 2, size / 2);
                  }
                }
              }

              // Convert canvas to base64
              resolve(canvas.toDataURL('image/png'));
            } catch (error) {
              reject(error);
            }
          };

          generateToken();
        });
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
        // Make sure we're sending the latest form values
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
        window.location.href = 'initiative.html#autoinput';
      }

      // Token preview modal state
      const tokenPreviewState = {
        char: null,
        image: null,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        lastX: 0,
        lastY: 0
      };

      function openTokenPreviewModal(char) {
        const modal = bootstrap.Modal.getOrCreateInstance($('tokenPreviewModal'));

        // Check for URL-based portrait CORS issue
        if (char.portraitData && char.portraitData.startsWith('http')) {
          alert(
            'Cannot generate token with URL-based portrait images due to browser security restrictions (CORS).\n\n' +
            'To use custom character portraits on the battle map:\n' +
            '1. Upload an image file instead of using a URL\n' +
            '2. Or use the base token by removing your portrait URL\n\n' +
            'The character will NOT be sent to the battle map.'
          );
          return;
        }

        tokenPreviewState.char = char;
        tokenPreviewState.zoom = 1;
        tokenPreviewState.offsetX = 0;
        tokenPreviewState.offsetY = 0;

        // Load the image
        if (char.portraitData) {
          const img = new Image();
          img.onload = () => {
            tokenPreviewState.image = img;
            updateTokenPreview();
            modal.show();
          };
          img.onerror = () => {
            alert('Failed to load character portrait image.');
          };
          img.src = char.portraitData;
        } else {
          // No portrait - show base token
          tokenPreviewState.image = null;
          updateTokenPreview();
          modal.show();
        }

        // Reset zoom slider
        const zoomSlider = $('tokenZoom');
        if (zoomSlider) zoomSlider.value = 1;
      }

      function updateTokenPreview() {
        const canvas = $('tokenPreviewCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = canvas.width;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Draw circular clipping path - match the final token clip radius
        const clipRadius = (size / 2) * 0.88; // Same as generateCharacterToken
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, clipRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (tokenPreviewState.image) {
          // Draw portrait with current settings
          ctx.save();
          ctx.translate(size / 2, size / 2);
          ctx.translate(tokenPreviewState.offsetX, tokenPreviewState.offsetY);
          ctx.scale(tokenPreviewState.zoom, tokenPreviewState.zoom);

          const img = tokenPreviewState.image;
          ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
          ctx.restore();
        } else {
          // Draw base token placeholder
          ctx.fillStyle = '#8B7355';
          ctx.fillRect(0, 0, size, size);

          const name = (tokenPreviewState.char?.name || '').trim();
          if (name) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const initials = name.length > 1 ? name.substring(0, 2).toUpperCase() : name.substring(0, 1).toUpperCase();
            ctx.fillText(initials, size / 2, size / 2);
          }
        }

        ctx.restore();

        // Draw frame overlay (optional - you can add this if you want to show the frame in preview)
        // For now, just showing the circular clip
      }

      async function confirmSendToBattleMap() {
        const char = tokenPreviewState.char;
        if (!char) return;

        const name = (char.name || '').trim();
        if (!name) {
          alert('Character must have a name before sending to the battle map.');
          return;
        }

        // Close the modal
        const modal = bootstrap.Modal.getInstance($('tokenPreviewModal'));
        if (modal) modal.hide();

        // Generate token with current preview settings
        let tokenData;
        try {
          const customChar = {
            ...char,
            portraitSettings: {
              scale: tokenPreviewState.zoom,
              offsetX: tokenPreviewState.offsetX,
              offsetY: tokenPreviewState.offsetY
            }
          };
          tokenData = await generateCharacterToken(customChar);
        } catch (error) {
          console.error('Failed to generate character token:', error);
          alert('Failed to generate character token. Please try again.');
          return;
        }

        // Create battle map character object
        const battleMapChar = {
          name,
          tokenImage: tokenData,
          type: 'PC'
        };

        const data = {
          __dmtoolsVersion: 1,
          mode: 'append',
          tokens: [battleMapChar]
        };

        try {
          localStorage.setItem('dmtools.pendingBattleMapImport', JSON.stringify(data));
        } catch (e) {
          console.error('localStorage error:', e);
          alert('Could not stage data for the battle map (localStorage error).');
          return;
        }

        // Navigate to the battle map page
        window.location.href = 'battlemap.html#autoinput';
      }

      function sendCurrentCharacterToBattleMap() {
        // Make sure we're sending the latest form values
        saveCurrentCharacter();
        const char = getCurrentCharacter();
        if (!char) {
          alert('No character selected.');
          return;
        }

        const name = (char.name || '').trim();
        if (!name) {
          alert('Character must have a name before sending to the battle map.');
          return;
        }

        // If character has no portrait, skip modal and send directly with base token
        if (!char.portraitData) {
          // Set up state with default values for base token
          tokenPreviewState.char = char;
          tokenPreviewState.image = null;
          tokenPreviewState.zoom = 1;
          tokenPreviewState.offsetX = 0;
          tokenPreviewState.offsetY = 0;
          confirmSendToBattleMap();
          return;
        }

        // Open the token preview modal for portrait adjustment
        openTokenPreviewModal(char);
      }

      // ---------- Rest handlers ----------

      let hitDiceModalData = null;

      function openHitDiceModal() {
        // Get current character data
        const curHP = getNumber('charCurrentHP', 0);
        const maxHP = getNumber('charMaxHP', 0);
        const hdRemaining = $('charHitDiceRemaining')?.value.trim() || '0d0';
        const conMod = getNumber('charConMod', 0);

        // Parse hit dice (e.g., "5d10" -> {count: 5, die: 10})
        const hdMatch = hdRemaining.match(/^(\d+)d(\d+)/);
        if (!hdMatch) {
          alert('Invalid hit dice format. Expected format: XdY (e.g., 5d10)');
          return;
        }

        const availableCount = parseInt(hdMatch[1], 10);
        const dieSize = parseInt(hdMatch[2], 10);

        if (availableCount === 0) {
          alert('No hit dice remaining! You must take a long rest to restore hit dice.');
          return;
        }

        // Store modal data
        hitDiceModalData = {
          curHP,
          maxHP,
          availableCount,
          dieSize,
          conMod,
          spentCount: 0,
          rolledHealing: 0
        };

        // Update modal UI
        $('hdModalCurrentHP').textContent = `${curHP} / ${maxHP}`;
        $('hdModalAvailable').textContent = hdRemaining;
        $('hdConMod').textContent = conMod >= 0 ? `+${conMod}` : `${conMod}`;
        $('hdSpendCount').value = Math.min(1, availableCount);
        $('hdSpendCount').max = availableCount;
        $('hdRollResults').style.display = 'none';
        $('hdRollBtn').style.display = '';
        $('hdApplyBtn').style.display = 'none';

        // Show modal
        const modal = new bootstrap.Modal($('hitDiceModal'));
        modal.show();
      }

      function rollHitDice() {
        if (!hitDiceModalData) return;

        const count = parseInt($('hdSpendCount').value, 10);
        if (count <= 0 || count > hitDiceModalData.availableCount) {
          alert('Invalid number of hit dice to spend.');
          return;
        }

        const { dieSize, conMod } = hitDiceModalData;
        const rolls = [];
        let total = 0;

        // Roll each hit die
        for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * dieSize) + 1;
          rolls.push(roll);
          total += roll + conMod; // Add CON mod to each roll
        }

        // Store results
        hitDiceModalData.spentCount = count;
        hitDiceModalData.rolledHealing = Math.max(total, count); // Minimum 1 HP per hit die spent

        // Display results
        const rollDetails = rolls.map((r, _i) => `${r}+${conMod >= 0 ? conMod : `(${conMod})`}`).join(', ');
        $('hdRollDetails').textContent = `[${rollDetails}]`;
        $('hdTotalHealing').textContent = `+${hitDiceModalData.rolledHealing} HP`;
        $('hdRollResults').style.display = '';
        $('hdRollBtn').style.display = 'none';
        $('hdApplyBtn').style.display = '';
      }

      function applyHitDiceHealing() {
        if (!hitDiceModalData) return;

        const { curHP, maxHP, spentCount, dieSize, rolledHealing, availableCount } = hitDiceModalData;

        // Apply healing (can't exceed max HP)
        const newHP = Math.min(maxHP, curHP + rolledHealing);
        $('charCurrentHP').value = newHP;

        // Reduce remaining hit dice
        const newRemaining = availableCount - spentCount;
        $('charHitDiceRemaining').value = `${newRemaining}d${dieSize}`;

        // Close modal
        const modal = bootstrap.Modal.getInstance($('hitDiceModal'));
        if (modal) modal.hide();

        // Clear data
        hitDiceModalData = null;

        // Show success message
        alert(`Healed for ${rolledHealing} HP!\n\nNew HP: ${newHP} / ${maxHP}\nRemaining Hit Dice: ${newRemaining}d${dieSize}\n\nRemember to click Save!`);
      }

      function handleShortRest() {
        // D&D 5e Short Rest (typically 1 hour):
        // - Regain HP by spending hit dice (opens modal)
        // - Warlock pact slots reset
        // - Short rest abilities/resources reset

        // Reset pact slots (Warlock feature - resets on short rest)
        const pactUsedEl = $('pactUsed');
        if (pactUsedEl) pactUsedEl.value = 0;

        // Reset generic resources that are marked for short rest
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

        // Open hit dice healing modal
        openHitDiceModal();
      }

      function handleLongRest() {
        // D&D 5e Long Rest (typically 8 hours):
        // - Restore all HP to maximum
        // - Clear temporary HP
        // - Restore hit dice (minimum half of total, rounded down)
        // - Restore all spell slots
        // - Restore pact slots
        // - Restore all abilities/resources

        // HP: full heal, clear temp
        const maxHp = getNumber('charMaxHP', 0);
        const curHpEl = $('charCurrentHP');
        const tempHpEl = $('charTempHP');
        if (curHpEl) curHpEl.value = maxHp || 0;
        if (tempHpEl) tempHpEl.value = 0;

        // Hit dice: Restore at least half (RAW: regain hit dice equal to half your total, minimum 1)
        const hdTotalEl = $('charHitDice');
        const hdRemainEl = $('charHitDiceRemaining');
        if (hdTotalEl && hdRemainEl) {
          const totalHD = hdTotalEl.value.trim();
          if (totalHD !== '') {
            // Parse hit dice (e.g., "5d10" -> 5)
            const match = totalHD.match(/^(\d+)d/);
            if (match) {
              const total = parseInt(match[1], 10);
              const currentRemaining = hdRemainEl.value.trim();
              const currentNum = currentRemaining.match(/^(\d+)d/) ? parseInt(currentRemaining.match(/^(\d+)d/)[1], 10) : 0;

              // Restore at least half, minimum 1
              const restored = Math.max(1, Math.floor(total / 2));
              const newRemaining = Math.min(total, currentNum + restored);
              hdRemainEl.value = totalHD.replace(/^\d+/, newRemaining);
            } else {
              // If format is unclear, just restore to full
              hdRemainEl.value = totalHD;
            }
          }
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

        // Reset spell slots (used -> 0)
        for (let lvl = 1; lvl <= 9; lvl++) {
          const usedEl = $(`slots${lvl}Used`);
          if (usedEl) usedEl.value = 0;
        }

        // Reset pact slots
        const pactUsedEl = $('pactUsed');
        if (pactUsedEl) pactUsedEl.value = 0;

        alert('Long Rest complete!\n\n✓ HP restored to maximum\n✓ Temp HP cleared\n✓ Hit dice restored (at least half)\n✓ All spell slots restored\n✓ Pact slots restored\n✓ All abilities/resources restored\n\nRemember to click Save!');
      }

      // ---------- Events ----------
      function attachEventHandlers() {
        const characterSelect = $('characterSelect');
        if (characterSelect) {
          characterSelect.addEventListener('change', e => {
            const newId = e.target.value;

            // Only switch if actually changing to a different character
            if (newId && newId !== currentCharacterId) {
              console.log(`Switching from character ${currentCharacterId} to ${newId}`);

              // Save current character before switching (if not loading)
              if (!isLoadingCharacter) {
                saveCurrentCharacter();
              }

              // Switch to new character
              currentCharacterId = newId;
              fillFormFromCharacter(getCurrentCharacter());
              renderCharacterSelect(); // Update dropdown to reflect the new selection
            }
          });
        } else {
          console.error('❌ Character select dropdown not found!');
        }
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

        // Print/Export Character Sheet buttons
        $('printSheetBtn').addEventListener('click', (e) => {
          e.preventDefault();
          const char = getCurrentCharacter();
          if (char) {
            window.characterSheetExporter.printSheet(char);
          } else {
            alert('Please select a character first.');
          }
        });
        $('exportPdfBtn').addEventListener('click', (e) => {
          e.preventDefault();
          const char = getCurrentCharacter();
          if (char) {
            window.characterSheetExporter.exportToPDF(char);
          } else {
            alert('Please select a character first.');
          }
        });
        $('exportPngBtn').addEventListener('click', (e) => {
          e.preventDefault();
          const char = getCurrentCharacter();
          if (char) {
            window.characterSheetExporter.exportToPNG(char);
          } else {
            alert('Please select a character first.');
          }
        });
        $('exportWordBtn').addEventListener('click', (e) => {
          e.preventDefault();
          const char = getCurrentCharacter();
          if (char) {
            window.characterSheetExporter.exportToWord(char);
          } else {
            alert('Please select a character first.');
          }
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

        // Spell slot management buttons (use, regain, reset)
        document.querySelectorAll('[data-action="use-slot"]').forEach(btn => {
          btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            const usedEl = $(`slots${level}Used`);
            const maxEl = $(`slots${level}Max`);
            if (usedEl && maxEl) {
              const used = parseInt(usedEl.value || 0, 10);
              const max = parseInt(maxEl.value || 0, 10);
              if (used < max) {
                usedEl.value = used + 1;
                saveCurrentCharacter();
              }
            }
          });
        });

        document.querySelectorAll('[data-action="regain-slot"]').forEach(btn => {
          btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            const usedEl = $(`slots${level}Used`);
            if (usedEl) {
              const used = parseInt(usedEl.value || 0, 10);
              if (used > 0) {
                usedEl.value = used - 1;
                saveCurrentCharacter();
              }
            }
          });
        });

        document.querySelectorAll('[data-action="reset-slot"]').forEach(btn => {
          btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            const usedEl = $(`slots${level}Used`);
            if (usedEl) {
              usedEl.value = 0;
              saveCurrentCharacter();
            }
          });
        });

        // Pact magic slot buttons (Warlock)
        const pactUseBtn = document.querySelector('[data-action="use-pact-slot"]');
        const pactRegainBtn = document.querySelector('[data-action="regain-pact-slot"]');
        const pactResetBtn = document.querySelector('[data-action="reset-pact-slot"]');

        if (pactUseBtn) {
          pactUseBtn.addEventListener('click', () => {
            const usedEl = $('pactUsed');
            const maxEl = $('pactMax');
            if (usedEl && maxEl) {
              const used = parseInt(usedEl.value || 0, 10);
              const max = parseInt(maxEl.value || 0, 10);
              if (used < max) {
                usedEl.value = used + 1;
                saveCurrentCharacter();
              }
            }
          });
        }

        if (pactRegainBtn) {
          pactRegainBtn.addEventListener('click', () => {
            const usedEl = $('pactUsed');
            if (usedEl) {
              const used = parseInt(usedEl.value || 0, 10);
              if (used > 0) {
                usedEl.value = used - 1;
                saveCurrentCharacter();
              }
            }
          });
        }

        if (pactResetBtn) {
          pactResetBtn.addEventListener('click', () => {
            const usedEl = $('pactUsed');
            if (usedEl) {
              usedEl.value = 0;
              saveCurrentCharacter();
            }
          });
        }

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

        // Hit dice modal buttons
        const hdDecrementBtn = $('hdDecrement');
        const hdIncrementBtn = $('hdIncrement');
        const hdRollBtn = $('hdRollBtn');
        const hdApplyBtn = $('hdApplyBtn');

        if (hdDecrementBtn) {
          hdDecrementBtn.addEventListener('click', () => {
            const input = $('hdSpendCount');
            if (input && parseInt(input.value) > 0) {
              input.value = parseInt(input.value) - 1;
            }
          });
        }

        if (hdIncrementBtn) {
          hdIncrementBtn.addEventListener('click', () => {
            const input = $('hdSpendCount');
            if (input && parseInt(input.value) < parseInt(input.max)) {
              input.value = parseInt(input.value) + 1;
            }
          });
        }

        if (hdRollBtn) {
          hdRollBtn.addEventListener('click', rollHitDice);
        }

        if (hdApplyBtn) {
          hdApplyBtn.addEventListener('click', applyHitDiceHealing);
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

        const sendToBattleMapBtn = $('sendToBattleMapBtn');
        if (sendToBattleMapBtn) {
          sendToBattleMapBtn.addEventListener('click', sendCurrentCharacterToBattleMap);
        }

        // Token preview modal events
        const tokenZoomSlider = $('tokenZoom');
        if (tokenZoomSlider) {
          tokenZoomSlider.addEventListener('input', (e) => {
            tokenPreviewState.zoom = parseFloat(e.target.value);
            updateTokenPreview();
          });
        }

        const tokenPreviewCanvas = $('tokenPreviewCanvas');
        if (tokenPreviewCanvas) {
          tokenPreviewCanvas.addEventListener('pointerdown', (e) => {
            tokenPreviewState.isDragging = true;
            tokenPreviewState.lastX = e.clientX;
            tokenPreviewState.lastY = e.clientY;
            tokenPreviewCanvas.style.cursor = 'grabbing';
          });

          tokenPreviewCanvas.addEventListener('pointermove', (e) => {
            if (!tokenPreviewState.isDragging) return;

            const dx = e.clientX - tokenPreviewState.lastX;
            const dy = e.clientY - tokenPreviewState.lastY;

            tokenPreviewState.offsetX += dx;
            tokenPreviewState.offsetY += dy;

            tokenPreviewState.lastX = e.clientX;
            tokenPreviewState.lastY = e.clientY;

            updateTokenPreview();
          });

          tokenPreviewCanvas.addEventListener('pointerup', () => {
            tokenPreviewState.isDragging = false;
            tokenPreviewCanvas.style.cursor = 'grab';
          });

          tokenPreviewCanvas.addEventListener('pointercancel', () => {
            tokenPreviewState.isDragging = false;
            tokenPreviewCanvas.style.cursor = 'grab';
          });
        }

        const resetTokenPositionBtn = $('resetTokenPosition');
        if (resetTokenPositionBtn) {
          resetTokenPositionBtn.addEventListener('click', () => {
            tokenPreviewState.zoom = 1;
            tokenPreviewState.offsetX = 0;
            tokenPreviewState.offsetY = 0;
            const zoomSlider = $('tokenZoom');
            if (zoomSlider) zoomSlider.value = 1;
            updateTokenPreview();
          });
        }

        const confirmSendToMapBtn = $('confirmSendToMapBtn');
        if (confirmSendToMapBtn) {
          confirmSendToMapBtn.addEventListener('click', confirmSendToBattleMap);
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
            // Cast spell button
            const castBtn = e.target.closest('.spell-cast-btn');
            if (castBtn) {
              e.preventDefault();
              const spellIndex = parseInt(castBtn.dataset.spellIndex, 10);
              const spellLevel = parseInt(castBtn.dataset.spellLevel, 10);
              const spellName = castBtn.dataset.spellName;
              castSpellFromSheet(spellIndex, spellLevel, spellName);
              return;
            }

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
              updatePreparedSpellCount();
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

        // Inventory management handlers
        const addInventoryItemBtn = $('addInventoryItemBtn');
        const saveInventoryItemBtn = $('saveInventoryItemBtn');
        const inventoryTableBody = $('inventoryTableBody');

        if (addInventoryItemBtn) {
          addInventoryItemBtn.addEventListener('click', () => openInventoryItemModal());
        }

        if (saveInventoryItemBtn) {
          saveInventoryItemBtn.addEventListener('click', saveInventoryItem);
        }

        if (inventoryTableBody) {
          inventoryTableBody.addEventListener('click', e => {
            // Edit inventory item
            const editBtn = e.target.closest('button[data-inventory-edit]');
            if (editBtn) {
              const index = parseInt(editBtn.getAttribute('data-inventory-edit'), 10);
              openInventoryItemModal(index);
              return;
            }

            // Toggle equipped
            const equipBtn = e.target.closest('button[data-inventory-equip]');
            if (equipBtn) {
              const index = parseInt(equipBtn.getAttribute('data-inventory-equip'), 10);
              if (index >= 0 && index < currentInventoryList.length) {
                currentInventoryList[index].equipped = !currentInventoryList[index].equipped;
                renderInventoryTable();
                saveCurrentCharacter();
              }
              return;
            }

            // Delete inventory item
            const deleteBtn = e.target.closest('button[data-inventory-delete]');
            if (deleteBtn) {
              const index = parseInt(deleteBtn.getAttribute('data-inventory-delete'), 10);
              deleteInventoryItem(index);
            }
          });
        }

        // Update encumbrance when strength changes
        const statStrEl = $('statStr');
        if (statStrEl) {
          statStrEl.addEventListener('input', () => {
            updateEncumbrance();
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

            // Special handling for Concentrating button
            if (btn.dataset.condition === 'Concentrating') {
              if (btn.classList.contains('active')) {
                // When manually turning on concentration, check if spell name is set
                const spellName = $('charConcentrationSpell')?.value || null;
                window.currentConcentrationSpell = spellName;
                if (spellName) {
                  btn.title = `Concentrating on: ${spellName}`;
                }
              } else {
                // When turning off concentration, clear spell name
                window.currentConcentrationSpell = null;
                btn.title = '';
                const spellInput = $('charConcentrationSpell');
                if (spellInput) spellInput.value = '';
              }
              // Dispatch event for combat view
              document.dispatchEvent(new CustomEvent('concentrationChanged', {
                detail: { active: btn.classList.contains('active'), spellName: window.currentConcentrationSpell }
              }));
            }

            syncConditionsToField();
          });
        });

        // Sync concentration spell input changes to global state
        const concSpellInput = $('charConcentrationSpell');
        if (concSpellInput) {
          concSpellInput.addEventListener('input', () => {
            const spellName = concSpellInput.value || null;
            window.currentConcentrationSpell = spellName;
            const concBtn = document.querySelector('.condition-btn[data-condition="Concentrating"]');
            if (concBtn && spellName) {
              concBtn.title = `Concentrating on: ${spellName}`;
            } else if (concBtn) {
              concBtn.title = '';
            }
            // Dispatch event for combat view
            document.dispatchEvent(new CustomEvent('concentrationChanged', {
              detail: { active: concBtn?.classList.contains('active') || false, spellName }
            }));
          });
        }

        // Sync conditions field back to toggles when manually edited
        const conditionsField = $('charConditions');
        if (conditionsField) {
          conditionsField.addEventListener('blur', syncConditionsFromField);
        }

        // Spellcasting ability & derived stats
        const spellAbilitySelect = $('spellcastingAbility');
        if (spellAbilitySelect) {
          spellAbilitySelect.addEventListener('change', () => {
            updateSpellDCAndAttack();
            updatePreparedSpellCount();
          });
        }

        // Update spell DC/attack and prepared count when stats or level change
        ['statInt', 'statWis', 'statCha', 'charLevel'].forEach(id => {
          const el = $(id);
          if (el) {
            el.addEventListener('input', () => {
              updateSpellDCAndAttack();
              updatePreparedSpellCount();
            });
          }
        });

        // ---------- NEW: Interactive roll & action handlers ----------

        // Roll history clear button
        const clearHistoryBtn = $('clearHistoryBtn');
        if (clearHistoryBtn) {
          clearHistoryBtn.addEventListener('click', clearRollHistory);
        }

        // HP adjustment buttons
        document.addEventListener('click', e => {
          const hpBtn = e.target.closest('[data-hp-adjust]');
          if (hpBtn) {
            const type = hpBtn.getAttribute('data-hp-adjust');
            adjustHP(type);
          }

          // Skill roll buttons
          const skillBtn = e.target.closest('[data-skill-roll]');
          if (skillBtn) {
            const skillKey = skillBtn.getAttribute('data-skill-roll');
            // Use data-roll-type attribute if present, otherwise fall back to keyboard modifiers
            let rollType = skillBtn.getAttribute('data-roll-type');
            if (!rollType) {
              rollType = e.shiftKey ? 'advantage' : (e.ctrlKey ? 'disadvantage' : 'normal');
            }
            rollSkillCheck(skillKey, rollType);
          }

          // Save roll buttons
          const saveBtn = e.target.closest('[data-save-roll]');
          if (saveBtn) {
            const ability = saveBtn.getAttribute('data-save-roll');
            // Use data-roll-type attribute if present, otherwise fall back to keyboard modifiers
            let rollType = saveBtn.getAttribute('data-roll-type');
            if (!rollType) {
              rollType = e.shiftKey ? 'advantage' : (e.ctrlKey ? 'disadvantage' : 'normal');
            }
            rollSavingThrow(ability, rollType);
          }

          // Ability check buttons (raw ability modifier rolls)
          const abilityCheckBtn = e.target.closest('.ability-check-btn');
          if (abilityCheckBtn) {
            const ability = abilityCheckBtn.getAttribute('data-ability');
            // Use data-roll-type attribute if present, otherwise fall back to keyboard modifiers
            let rollType = abilityCheckBtn.getAttribute('data-roll-type');
            if (!rollType) {
              rollType = e.shiftKey ? 'advantage' : (e.ctrlKey ? 'disadvantage' : 'normal');
            }
            rollAbilityCheck(ability, rollType);
          }

          // Attack roll buttons (to hit)
          const attackBtn = e.target.closest('[data-attack-roll]');
          if (attackBtn) {
            const index = parseInt(attackBtn.getAttribute('data-attack-roll'), 10);
            const rollType = attackBtn.getAttribute('data-roll-type') || 'normal';
            rollAttack(index, rollType);
          }

          // Primary damage roll buttons
          const damageBtn = e.target.closest('[data-damage-roll]');
          if (damageBtn) {
            const index = parseInt(damageBtn.getAttribute('data-damage-roll'), 10);
            const rollType = damageBtn.getAttribute('data-roll-type') || 'normal';
            rollAttackDamage(index, rollType);
          }

          // Secondary damage roll buttons
          const damage2Btn = e.target.closest('[data-damage2-roll]');
          if (damage2Btn) {
            const index = parseInt(damage2Btn.getAttribute('data-damage2-roll'), 10);
            const rollType = damage2Btn.getAttribute('data-roll-type') || 'normal';
            rollAttackDamage2(index, rollType);
          }

          // Death save roll button
          const deathSaveBtn = e.target.closest('#rollDeathSaveBtn');
          if (deathSaveBtn) {
            rollDeathSave();
          }

          // Initiative roll button
          const initiativeBtn = e.target.closest('#rollInitiativeBtn');
          if (initiativeBtn) {
            rollInitiative();
          }
        });

        // Expertise checkbox auto-enables proficiency
        SKILL_CONFIGS.forEach(cfg => {
          const expEl = $(cfg.expId);
          const profEl = $(cfg.profId);
          if (expEl && profEl) {
            expEl.addEventListener('change', () => {
              if (expEl.checked && !profEl.checked) {
                profEl.checked = true;
              }
              recalcSkillsFromForm(false);
              recalcPassivesFromForm();
            });
          }
        });

        // Auto-save when leaving the page or navigating away
        // Use pagehide as it's more reliable than beforeunload (especially on mobile)
        window.addEventListener('pagehide', () => {
          saveCurrentCharacter();
        });

        // Intercept all internal navigation links to save before navigating
        document.addEventListener('click', (e) => {
          const link = e.target.closest('a[href]');
          if (link && link.href && !link.href.startsWith('javascript:') && !link.target) {
            // Save before navigating to internal links
            const currentUrl = new URL(window.location.href);
            const linkUrl = new URL(link.href, window.location.href);

            // Only intercept same-origin links
            if (currentUrl.origin === linkUrl.origin) {
              saveCurrentCharacter();
            }
          }
        }, true); // Use capture phase to ensure we run before navigation

        // Periodic auto-save every 30 seconds as a backup
        setInterval(() => {
          if (currentCharacterId) {
            saveCurrentCharacter();
          }
        }, 30000); // 30 seconds
      }

      // ---------- Init ----------
      async function init() {
        characters = await loadCharactersFromStorage();
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
          initMobileFeatures();

          // Initialize Level Up System
          if (typeof LevelUpSystem !== 'undefined' && LevelUpSystem.init) {
            LevelUpSystem.init();
          }
        }

      // ---------- Mobile Features ----------
      function initMobileFeatures() {
        // Make roll history collapsible on mobile by tapping header
        const rollHistoryHeader = document.getElementById('rollHistoryHeader');
        const rollHistoryPanel = document.getElementById('rollHistoryPanel');

        if (rollHistoryHeader && rollHistoryPanel) {
          rollHistoryHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking the clear button
            if (e.target.closest('#clearHistoryBtn')) {
              return;
            }

            // Only collapse on mobile screens
            if (window.innerWidth < 768) {
              rollHistoryPanel.classList.toggle('collapsed');
            }
          });

          // Start collapsed on mobile if screen is small
          if (window.innerWidth < 768) {
            rollHistoryPanel.classList.add('collapsed');
          }

          // Re-check on window resize
          window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
              // Remove collapsed class on larger screens
              rollHistoryPanel.classList.remove('collapsed');
            }
          });
        }

        // Handle collapse icon rotation for all collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(header => {
          const target = header.getAttribute('data-bs-target');
          if (!target) return;

          const collapseElement = document.querySelector(target);
          if (!collapseElement) return;

          collapseElement.addEventListener('show.bs.collapse', () => {
            const icon = header.querySelector('.collapse-icon');
            if (icon) {
              icon.classList.remove('bi-chevron-right');
              icon.classList.add('bi-chevron-down');
            }
          });

          collapseElement.addEventListener('hide.bs.collapse', () => {
            const icon = header.querySelector('.collapse-icon');
            if (icon) {
              icon.classList.remove('bi-chevron-down');
              icon.classList.add('bi-chevron-right');
            }
          });

          // Set initial icon state
          const icon = header.querySelector('.collapse-icon');
          if (icon) {
            if (collapseElement.classList.contains('show')) {
              icon.classList.add('bi-chevron-down');
            } else {
              icon.classList.add('bi-chevron-right');
            }
          }
        });
      }

      // ---------- Global API for Level-Up System ----------
      window.getCurrentCharacter = getCurrentCharacter;
      window.saveCurrentCharacter = saveCurrentCharacter;
      window.loadCharacterIntoForm = fillFormFromCharacter;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  