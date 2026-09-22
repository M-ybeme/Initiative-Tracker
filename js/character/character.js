import { rollDiceNotation, rollD20, describeFeatureRoll, normalizeLegacyDamageNotation } from '../modules/dice.js';
import { getAbilityModifier, getProficiencyBonus, recalcDerivedStats } from './character-calculations.js';
import { getAttackFeatureBonuses as _getAttackFeatureBonuses, addFlatBonusToNotation as _addFlatBonusToNotation, getConcentrationAttackBonus as _getConcentrationAttackBonus } from '../../Attack-rolls.js';
import { getSpellSlotsForClassLevel as _getSpellSlotsForClassLevel, getPactMagicSlots as _getPactMagicSlots, normalizeSpellEntry as _normalizeSpellEntry, searchSpells as _searchSpells } from './character-spell-data.js';
import { applyDamageToHP, applyHealingToHP, setTempHP, getDeathSaveOutcome, parseAttackBonus } from './character-combat.js';
import { calcSpellSaveDC, calcSpellAttackBonus, getConcentrationCheckDC, rollHitDiceForHealing } from './character-rest.js';
import * as HitDice from '../modules/hit-dice.js';
import { getXPForLevel, getXPProgressInfo } from './character-xp.js';
import { validateCharacter } from '../modules/validation.js';
import { addPolymorphNotes } from './polymorph-notes.js';
import { updatePortraitPreview, wirePortraitControlEvents, wirePortraitEditorEvents } from './character-portrait.js';
import { wireSendToEvents, wireTokenPreviewEvents } from './character-send-to.js';

(function () {
      const STORAGE_KEY = 'dmtoolboxCharactersV1';
      const USE_INDEXED_DB = IndexedDBStorage && IndexedDBStorage.isSupported();
      const $ = (id) => document.getElementById(id);

      // ---------- App Toast ----------
      function showAppToast(message, type = 'success', delay = 2500) {
        const toastEl = document.getElementById('appToast');
        const bodyEl  = document.getElementById('appToastBody');
        if (!toastEl || !bodyEl) return;

        const colorMap = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning text-dark', info: 'bg-info text-dark' };
        toastEl.className = `toast align-items-center border-0 mb-2 ${colorMap[type] || 'bg-secondary'}`;
        bodyEl.textContent = message;

        // Bootstrap applies options only when it creates the instance, so recreate it to honour this call's delay
        bootstrap.Toast.getInstance(toastEl)?.dispose();
        const bsToast = new bootstrap.Toast(toastEl, { delay });
        bsToast.show();
      }

      // ---------- Dirty Tracking ----------
      let isDirty = false;
      let wizardIsOpen = false;
      let _manualSave = false; // true only when user clicks the Save button

      let editCount = 0; // every edit bumps it, so a save can tell whether the sheet changed while it was writing

      function markDirty() {
        editCount++;
        if (isDirty) return;
        isDirty = true;
        const btn = document.getElementById('saveCharacterBtn');
        if (btn && !btn.querySelector('.dirty-dot')) {
          const dot = document.createElement('span');
          dot.className = 'dirty-dot ms-1 text-warning';
          dot.textContent = '●';
          dot.title = 'Unsaved changes';
          btn.appendChild(dot);
        }
      }

      function clearDirty() {
        isDirty = false;
        const dot = document.querySelector('#saveCharacterBtn .dirty-dot');
        if (dot) dot.remove();
      }

      function getNumber(id, fallback = 0) {
        const el = $(id);
        if (!el) return fallback;
        const value = parseInt(el.value, 10);
        return Number.isFinite(value) ? value : fallback;
      }

      // ---------- Dice Roller Utility ----------
      const rollHistory = [];
      const MAX_ROLL_HISTORY = 50;

      /** Adds a flat bonus to a dice notation string: "1d8+3" + 2 → "1d8+5" */
      const addFlatBonusToNotation = _addFlatBonusToNotation;

      /**
       * Returns the concentration attack bonus entry if the character is concentrating
       * on a damage-adding spell, otherwise null.
       */
      function getConcentrationAttackBonus() {
        if (!isConcentrating()) return null;
        return _getConcentrationAttackBonus(window.currentConcentrationSpell);
      }

      /**
       * Returns always-on feature-based damage bonuses for a weapon attack.
       * flatBonus  – flat number to add to the damage modifier (e.g. Dueling +2)
       * extraRolls – additional dice to roll after the main damage { notation, label }
       *              (e.g. Improved Divine Smite 1d8 radiant)
       */
      /**
       * Returns always-on feature-based damage modifiers for a weapon attack.
       * flatBonus         – flat bonus added to the damage modifier (e.g. Dueling +2)
       * extraRolls        – extra dice rolled after main damage { notation, label }
       * rerollLowDice     – GWF: reroll any die showing 1 or 2, must use new roll
       * rollTwiceTakeBest – Savage Attacker: roll all dice twice, keep higher total
       */
      const getAttackFeatureBonuses = _getAttackFeatureBonuses;

      // The dice rules (parsing, keep-high/low, Great Weapon Fighting rerolls, Savage Attacker,
      // advantage) live in the shared engine (js/modules/dice.js, backed by dice-engine.js). These
      // wrappers add only what belongs to the sheet: the description, a timestamp and the roll history.
      //   features.rerollLowDice     - GWF: reroll each die showing 1 or 2 (must use the new roll)
      //   features.rollTwiceTakeBest - SA: roll all dice twice, take the higher total
      function rollDice(notation, description = '', features = {}) {
        const rolled = rollDiceNotation(notation, undefined, features);
        if (!rolled) {
          console.error('Invalid dice notation:', notation);
          return null;
        }

        const result = {
          notation: features && features.critical ? `${notation} (crit)` : notation,
          description: description + describeFeatureRoll(rolled),
          rolls: rolled.rolls,
          kept: rolled.kept,       // the dice that counted; dropped ones are in `dropped`
          dropped: rolled.dropped,
          modifier: rolled.modifier,
          total: rolled.total,
          timestamp: new Date().toISOString(),
          isCritical: rolled.isCritical,
          isFumble: rolled.isFumble
        };

        addToRollHistory(result);
        return result;
      }

      function rollD20WithHistory(mode, bonus, description) {
        const rolled = rollD20(mode, bonus);
        const result = {
          notation: `2d20 (${mode})`,
          description,
          rolls: rolled.rolls,
          chosen: rolled.chosen,
          modifier: bonus,
          total: rolled.total,
          timestamp: new Date().toISOString(),
          isCritical: rolled.isCritical,
          isFumble: rolled.isFumble,
          [mode === 'advantage' ? 'isAdvantage' : 'isDisadvantage']: true
        };

        addToRollHistory(result);
        return result;
      }

      function rollWithAdvantage(bonus = 0, description = '') {
        return rollD20WithHistory('advantage', bonus, description);
      }

      function rollWithDisadvantage(bonus = 0, description = '') {
        return rollD20WithHistory('disadvantage', bonus, description);
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
      // showRollToast can be called three ways:
      // 1. showRollToast(resultArray)  - combined multi-roll display (spell attack + damage)
      // 2. showRollToast(resultObject) - single roll result object from rollDice()
      // 3. showRollToast(label, total, extra) - simple string call for non-dice casts
      function showRollToast(labelOrResult, total, extra) {
        const toastElement = document.getElementById('rollToast');
        const toastBody = document.getElementById('rollToastBody');
        if (!toastElement || !toastBody) return;

        let bodyHTML = '';
        let bgClass = 'bg-secondary';

        if (Array.isArray(labelOrResult)) {
          // --- Multiple results (e.g. attack roll + damage roll) ---
          const results = labelOrResult;
          const hasCrit   = results.some(r => r.isCritical);
          const hasFumble = results.some(r => r.isFumble && !r.isCritical);
          if (hasCrit)   bgClass = 'bg-success';
          if (hasFumble) bgClass = 'bg-danger';

          // Derive spell name from first result description (strip " - Label" suffix)
          const spellName = (results[0]?.description || 'Roll').replace(/ - .+$/, '');

          const rows = results.map(r => {
            const rc = r.isCritical ? 'text-success fw-bold' : r.isFumble ? 'text-danger fw-bold' : '';
            const badge = r.isCritical ? 'bg-success' : r.isFumble ? 'bg-danger' : 'bg-dark bg-opacity-50';
            // Short label: everything after " - "
            const label = (r.description || '').replace(/^[^-]+ - /, '') || r.description || 'Roll';
            let rollDisplay = '';
            if (r.isAdvantage || r.isDisadvantage) {
              rollDisplay = `[${r.rolls[0]}, ${r.rolls[1]}] → ${r.chosen}`;
            } else {
              rollDisplay = r.rolls.length > 1 ? `[${r.rolls.join(', ')}]` : `${r.rolls[0]}`;
            }
            const modStr = r.modifier !== 0 ? ` ${r.modifier >= 0 ? '+' : ''}${r.modifier}` : '';
            return `
              <div class="d-flex justify-content-between align-items-center gap-2 mt-1">
                <div class="small">
                  <span class="text-white-50">${label}:</span>
                  <span class="${rc}">${rollDisplay}${modStr} = ${r.total}</span>
                </div>
                <div class="badge ${badge}">${r.total}</div>
              </div>`;
          }).join('');

          bodyHTML = `<div class="fw-bold mb-1">${spellName}</div>${rows}`;

        } else if (typeof labelOrResult === 'object' && labelOrResult !== null) {
          // --- Single result object ---
          const result = labelOrResult;
          let resultClass = '';
          if (result.isCritical) { resultClass = 'text-success fw-bold'; bgClass = 'bg-success'; }
          else if (result.isFumble) { resultClass = 'text-danger fw-bold'; bgClass = 'bg-danger'; }

          let rollDisplay = '';
          if (result.isAdvantage || result.isDisadvantage) {
            rollDisplay = `[${result.rolls[0]}, ${result.rolls[1]}] → ${result.chosen}`;
          } else {
            rollDisplay = result.rolls.length > 1 ? `[${result.rolls.join(', ')}]` : `${result.rolls[0]}`;
          }
          const modDisplay = result.modifier !== 0 ? ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}` : '';
          const details = `${rollDisplay}${modDisplay} = <span class="${resultClass}">${result.total}</span>`;

          bodyHTML = `
            <div class="d-flex align-items-center justify-content-between gap-2">
              <div class="flex-grow-1">
                ${result.description ? `<div class="fw-bold">${result.description}</div>` : ''}
                <div class="small ${resultClass}">${details}</div>
              </div>
              <div class="badge ${bgClass} fs-5">${result.total}</div>
            </div>`;

        } else {
          // --- Simple string call (label, total, extra) ---
          const description = labelOrResult || '';
          const displayTotal = total || 0;
          const details = extra || '';
          if (extra && (extra.includes('20') || extra.toLowerCase().includes('crit'))) bgClass = 'bg-success';
          else if (extra && (extra.includes('Fumble') || extra.includes('fumble'))) bgClass = 'bg-danger';

          bodyHTML = `
            <div class="d-flex align-items-center justify-content-between gap-2">
              <div class="flex-grow-1">
                ${description ? `<div class="fw-bold">${description}</div>` : ''}
                ${details ? `<div class="small">${details}</div>` : ''}
              </div>
              <div class="badge ${bgClass} fs-5">${displayTotal}</div>
            </div>`;
        }

        toastBody.innerHTML = bodyHTML;
        toastElement.className = `toast align-items-center border-0 ${bgClass}`;
        new bootstrap.Toast(toastElement, { autohide: true, delay: 6000 }).show();
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
          } else if (roll.dropped && roll.dropped.length) {
            rollDisplay = `[${roll.rolls.join(', ')}] → kept [${roll.kept.join(', ')}]`;
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
      window.rollDice = rollDice;

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

        // Auto-mark the Action slot. Silent=true so Extra Attack doesn't pop dialogs.
        if (typeof window.triggerActionEconomy === 'function') {
          window.triggerActionEconomy('actionUsed', true);
        }

        // Roll to hit
        const toHitBonus = parseAttackBonus(attack.bonus);

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

        // Apply always-on feature bonuses
        const char = getCurrentCharacter();
        const { flatBonus, extraRolls, rerollLowDice, rollTwiceTakeBest } = getAttackFeatureBonuses(char, attack);
        // Older saved attacks may carry the damage type in the notation ("1d8+3 slashing"); clean it
        // the same way Combat Mode does, so both views roll the same stored attack the same way.
        const damageText = normalizeLegacyDamageNotation(attack.damage);
        const notation = flatBonus ? addFlatBonusToNotation(damageText, flatBonus) : damageText;
        const features = { rerollLowDice, rollTwiceTakeBest };

        const damageType = attack.damageType || 'Damage';
        const bonusSuffix = flatBonus ? ` +${flatBonus}` : '';
        const description = `${attack.name} - ${damageType}${bonusSuffix}`;

        // Ask about concentration bonus before rolling so it's clear which attack it applies to
        const concBonus = getConcentrationAttackBonus();
        const applyConc = concBonus ? confirm(concBonus.prompt) : false;

        if (rollType === 'critical') {
          // The group is rolled twice, independently (keep/drop rules apply to each roll); GWF and SA apply too.
          // A null result (invalid notation, or rolling twice would pass the engine's dice limit) is reported by rollDice.
          const result = rollDice(notation, `${description} (CRIT!)`, { ...features, critical: true });
          if (!result) return null;
          extraRolls.forEach(({ notation: en, label }) => {
            // extraRolls are fixed small dice (e.g. 1d8), so rolling them twice cannot pass the engine's dice limit.
            rollDice(en, `${attack.name} - ${label} (CRIT!)`, { critical: true });
          });
          if (applyConc) rollDice(concBonus.notation, `${attack.name} - ${concBonus.label}`);
          return result;
        } else if (rollType === 'half') {
          const result = rollDice(notation, description, features);
          if (result) {
            addToRollHistory({
              notation: 'Resistance', description: `${description} (Halved)`,
              rolls: [], modifier: 0, total: Math.floor(result.total / 2),
              timestamp: new Date().toISOString()
            });
          }
          extraRolls.forEach(({ notation: en, label }) => {
            const r = rollDice(en, `${attack.name} - ${label}`);
            if (r) addToRollHistory({
              notation: 'Resistance', description: `${attack.name} - ${label} (Halved)`,
              rolls: [], modifier: 0, total: Math.floor(r.total / 2),
              timestamp: new Date().toISOString()
            });
          });
          if (applyConc) rollDice(concBonus.notation, `${attack.name} - ${concBonus.label}`);
          return result;
        } else {
          const result = rollDice(notation, description, features);
          extraRolls.forEach(({ notation: en, label }) => rollDice(en, `${attack.name} - ${label}`));
          if (applyConc) rollDice(concBonus.notation, `${attack.name} - ${concBonus.label}`);
          return result;
        }
      }

      function rollAttackDamage2(attackIndex, rollType = 'normal') {
        if (attackIndex < 0 || attackIndex >= currentAttackList.length) return;
        const attack = currentAttackList[attackIndex];
        if (!attack.damage2) return;

        const damageType = attack.damageType2 || 'Extra Damage';
        const description = `${attack.name} - ${damageType}`;
        const damage2 = normalizeLegacyDamageNotation(attack.damage2);

        if (rollType === 'critical') {
          // Critical hit: the group is rolled twice, independently (the modifier is added once)
          return rollDice(damage2, `${description} (CRIT!)`, { critical: true });
        } else if (rollType === 'half') {
          // Half damage (resistance)
          const result = rollDice(damage2, description);
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
          return rollDice(damage2, description);
        }
      }

      function rollDeathSave() {
        const result = rollDice('1d20', 'Death Save');

        // Automatically update death saves based on roll
        const roll = result.rolls[0];
        const outcome = getDeathSaveOutcome(roll);

        if (outcome === 'critical_success') {
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
        } else if (outcome === 'double_failure') {
          // Natural 1: two failures
          addDeathSaveFailures(2);
        } else if (outcome === 'success') {
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
        const maxHPEl     = $('charMaxHP');
        const tempHPEl    = $('charTempHP');
        const amtEl       = $('hpAdjustAmount');

        if (!currentHPEl) return;

        const currentHP = Number(currentHPEl.value) || 0;
        const maxHP     = Number(maxHPEl?.value)    || 0;
        const tempHP    = Number(tempHPEl?.value)   || 0;
        const prevHP    = currentHP;

        if (type === 'max') {
          currentHPEl.value = maxHP;
          if (tempHPEl) tempHPEl.value = 0;
          setHPLastChange('Restored to max');
        } else {
          const raw = Number(amtEl?.value) || 0;
          if (raw <= 0) {
            amtEl?.focus();
            showAppToast('Enter an amount first.', 'warning');
            return;
          }

          if (type === 'heal') {
            currentHPEl.value = applyHealingToHP(currentHP, maxHP, raw);
            const gained = Number(currentHPEl.value) - prevHP;
            setHPLastChange(`Healed ${raw}${gained < raw ? ' (capped)' : ''}: ${prevHP} → ${currentHPEl.value}`);
          } else if (type === 'damage') {
            const { newCurrentHP, newTempHP, damageToHP } = applyDamageToHP(currentHP, tempHP, maxHP, raw);
            if (tempHPEl) tempHPEl.value = newTempHP;
            currentHPEl.value = newCurrentHP;
            const lost = damageToHP;
            const tempNote = raw > lost ? ` (${raw - lost} absorbed by temp HP)` : '';
            setHPLastChange(`Took ${raw} dmg${tempNote}: ${prevHP} → ${currentHPEl.value}`);
            if (raw > 0 && isConcentrating()) handleConcentrationCheck(raw);
          } else if (type === 'temp') {
            const newTemp = setTempHP(tempHP, raw);
            if (tempHPEl) tempHPEl.value = newTemp;
            setHPLastChange(`Temp HP: ${newTemp}`);
          }

          // Clear the amount input and keep focus for quick re-entry
          if (amtEl) { amtEl.value = ''; amtEl.focus(); }
        }

        const newHP = Number(currentHPEl.value) || 0;
        if (newHP > 0) resetDeathSaves();
        updateHPBar();
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

      function updateHPBar() {
        const cur  = Number($('charCurrentHP')?.value) || 0;
        const max  = Number($('charMaxHP')?.value)     || 1;
        const pct  = max > 0 ? Math.min(100, Math.round((cur / max) * 100)) : 0;
        const fill = $('hpBarSheetFill');
        if (!fill) return;
        fill.style.width = pct + '%';
        fill.className = 'progress-bar ' + (
          pct > 66 ? 'bg-success' :
          pct > 33 ? 'bg-warning' :
          pct >  0 ? 'bg-danger'  : 'bg-danger'
        );
        if (pct <= 10 && pct > 0) fill.classList.add('progress-bar-striped', 'progress-bar-animated');
      }
      window.updateHPBar = updateHPBar;

      function setHPLastChange(msg) {
        const el = $('hpLastChange');
        if (el) el.textContent = msg;
      }

      // -------- Dynamic resource rows --------

      function buildResourceRowHTML(res = {}) {
        const name     = (res.name    || '').replace(/"/g, '&quot;');
        const cur      = res.current  ?? '';
        const max      = res.max      ?? '';
        const resetOn  = res.resetOn  || 'long';
        return `<div class="resource-row row g-1 align-items-center mb-1">
          <div class="col-5">
            <input type="text" class="form-control form-control-sm res-name"
                   placeholder="Name" value="${name}" />
          </div>
          <div class="col-2">
            <input type="number" class="form-control form-control-sm text-center res-current"
                   placeholder="Now" min="0" value="${cur}" />
          </div>
          <div class="col-2">
            <input type="number" class="form-control form-control-sm text-center res-max"
                   placeholder="Max" min="0" value="${max}" />
          </div>
          <div class="col-2">
            <select class="form-select form-select-sm res-reset" title="When this resource resets">
              <option value="short" ${resetOn === 'short'  ? 'selected' : ''}>SR</option>
              <option value="long"  ${resetOn === 'long'   ? 'selected' : ''}>LR</option>
              <option value="manual"${resetOn === 'manual' ? 'selected' : ''}>—</option>
            </select>
          </div>
          <div class="col-1 text-center">
            <button type="button" class="btn btn-sm btn-link text-danger p-0 res-remove"
                    title="Remove this resource">&times;</button>
          </div>
        </div>`;
      }

      function renderResourceRows(resources = []) {
        const list = $('resourcesList');
        if (!list) return;
        list.innerHTML = resources.map(buildResourceRowHTML).join('');
      }
      window.renderResourceRows = renderResourceRows;

      function addResourceRow(res = {}) {
        const list = $('resourcesList');
        if (!list) return;
        list.insertAdjacentHTML('beforeend', buildResourceRowHTML(res));
      }

      function collectResources() {
        const rows = document.querySelectorAll('#resourcesList .resource-row');
        return Array.from(rows).map(row => ({
          name:    row.querySelector('.res-name')?.value?.trim()   || '',
          current: Number(row.querySelector('.res-current')?.value) || 0,
          max:     Number(row.querySelector('.res-max')?.value)     || 0,
          resetOn: row.querySelector('.res-reset')?.value          || 'long',
        })).filter(r => r.name || r.max > 0);
      }

      const INITIATIVE_ADVANTAGE_FEATURES = [
        { name: 'Feral Instinct',  tip: 'roll with advantage (Feral Instinct)' },
        { name: 'Assassinate',     tip: 'roll with advantage against surprised creatures (Assassinate)' },
        { name: 'Rakish Audacity', tip: 'add your CHA modifier to this roll (Rakish Audacity)' },
      ];

      function getInitiativeAdvantageReason(char) {
        if (!char) return null;
        const featuresText = (char.features || '').toLowerCase();
        const featsArr = (char.feats || []).map(f => f.toLowerCase());
        const matches = INITIATIVE_ADVANTAGE_FEATURES.filter(f => {
          const n = f.name.toLowerCase();
          return featuresText.includes(n) || featsArr.includes(n);
        });
        return matches.length > 0 ? matches : null;
      }

      function rollInitiative() {
        const char = getCurrentCharacter();
        const charName = char?.name || 'Character';

        const initModEl = $('charInitMod');
        let initMod;
        if (initModEl && initModEl.value !== '' && initModEl.value !== null) {
          initMod = Number(initModEl.value) || 0;
        } else {
          // Field blank — fall back to DEX modifier (same logic as Combat View display)
          initMod = Number($('modDex')?.value || '') || 0;
        }

        const advantages = getInitiativeAdvantageReason(char);
        if (advantages) {
          const tips = advantages.map(a => a.tip).join(' · ');
          showAppToast(`Initiative reminder: ${tips}`, 'info', 5000);
        }

        const result = rollDice(`1d20${initMod >= 0 ? '+' : ''}${initMod}`, `${charName} - Initiative`);
        return result;
      }

      // ---------- Auto-calculation helpers ----------
      const getAbilityModFromScore = getAbilityModifier;
      const getProficiencyBonusFromLevel = getProficiencyBonus;

      // Update derived values on the *character object*
      function recalcDerivedOnCharacter(char) {
        recalcDerivedStats(char, SKILL_CONFIGS, getSpellSlotsForClassLevel);
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

        // Update proficiency bonus displays
        const pb = getProficiencyBonusFromLevel(level);
        const pbStr = (pb >= 0 ? '+' : '') + pb;
        const pbSpan = $('charProficiencyBonusDisplay');
        if (pbSpan) pbSpan.textContent = pbStr;
        const pbAbils = $('charProfBonusAbilsDisplay');
        if (pbAbils) pbAbils.textContent = pbStr;

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
        const halfPb = Math.floor(pb / 2);
        const joat = !!$('skillJoAT')?.checked;

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
          // Jack of All Trades adds half proficiency to non-proficient skills
          let prof = 0;
          if (isProf) {
            prof = isExp ? (pb * 2) : pb;
          } else if (joat) {
            prof = halfPb;
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

      // UI preference (not part of any character record): which character the user last had open
      const LAST_CHARACTER_KEY = 'dmtoolbox.lastCharacterId';
      function rememberLastCharacter(id) {
        try { if (id) localStorage.setItem(LAST_CHARACTER_KEY, id); } catch (e) { /* preference only */ }
      }
      function pickStartupCharacterId(list) {
        let last = null;
        try { last = localStorage.getItem(LAST_CHARACTER_KEY); } catch (e) { /* preference only */ }
        return list.some(c => c.id === last) ? last : list[0].id;
      }
      let currentSpellList = [];
      let currentAttackList = [];
      let isLoadingCharacter = false; // Flag to prevent saves during character load

      // Categorized notes — keyed by category id
      const NOTE_CATEGORIES = ['general', 'sessionNotes', 'lootLeads', 'questHooks'];
      let currentCategorizedNotes = { general: '', sessionNotes: '', lootLeads: '', questHooks: '' };
      let currentNotesCategory = 'general';
      const NOTES_CATEGORY_KEY = 'dmtoolbox.notesCategory';
      const NOTES_PLACEHOLDERS = {
        general: "Scratch space, prep notes, anything that doesn't fit the other tabs.",
        sessionNotes: 'What happened this session, key decisions, cliffhangers...',
        lootLeads: 'Rumored treasures, reward offers, leads on magic items...',
        questHooks: 'Active quests, leads, rumours, faction asks...'
      };
      try {
        const savedCat = localStorage.getItem(NOTES_CATEGORY_KEY);
        if (NOTE_CATEGORIES.includes(savedCat)) currentNotesCategory = savedCat;
      } catch (e) { /* preference only */ }

      // Point the Notes textarea and category select at one category (its text comes from currentCategorizedNotes)
      function showNotesCategory(cat) {
        currentNotesCategory = NOTE_CATEGORIES.includes(cat) ? cat : 'general';
        const sel = $('notesCategorySelect');
        if (sel) sel.value = currentNotesCategory;
        const ta = $('charExtraNotes');
        ta.placeholder = NOTES_PLACEHOLDERS[currentNotesCategory] || '';
        ta.value = currentCategorizedNotes[currentNotesCategory] ?? '';
      }

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
        return _searchSpells(term, getAllSpells());
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

      // notify: false leaves the failure to the caller (commitCharacter reports it in its own words); the default keeps
      // the alert for callers that rely on it. A failure always throws either way.
      async function saveCharactersToStorage({ notify = true } = {}) {
        const say = (message) => { if (notify) alert(message); };
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

              say(
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
              say(
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
        say(
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

      // ---------- Spells helpers ----------

      function parseCommaList(val) {
        return (val || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      function normalizeSpellEntry(spellLike) {
        const spells = getAllSpells();
        return _normalizeSpellEntry(spellLike, name => spells.find(s =>
          (s.name || '').toLowerCase() === name.toLowerCase() ||
          (s.title || '').toLowerCase() === name.toLowerCase()
        ));
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

      const SPELL_LEVEL_LABELS = [
        'Cantrips', '1st Level', '2nd Level', '3rd Level', '4th Level',
        '5th Level', '6th Level', '7th Level', '8th Level', '9th Level'
      ];

      function isRitualSpell(spell) {
        if (spell.ritual) return true;
        const tags = Array.isArray(spell.tags) ? spell.tags.map(t => t.toLowerCase()) : [];
        if (tags.some(t => t === 'ritual')) return true;
        if ((spell.school || '').toLowerCase().includes('ritual')) return true;
        if ((spell.casting_time || '').toLowerCase().includes('ritual')) return true;
        return false;
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

        // Sort by level (cantrips first), preserving original indices for data-spell-index
        const sorted = currentSpellList
          .map((spell, index) => ({ spell, index }))
          .sort((a, b) => (a.spell.level ?? 0) - (b.spell.level ?? 0));

        // Group into level buckets
        const groups = new Map();
        sorted.forEach(({ spell, index }) => {
          const lvl = spell.level ?? 0;
          if (!groups.has(lvl)) groups.set(lvl, []);
          groups.get(lvl).push({ spell, index });
        });

        groups.forEach((entries, lvl) => {
          // Level section header
          const header = document.createElement('li');
          header.className = 'list-group-item bg-transparent pt-2 pb-1 border-0';
          header.innerHTML = `<small class="text-uppercase fw-bold text-secondary">${SPELL_LEVEL_LABELS[lvl] ?? `${lvl}th Level`}</small>`;
          listEl.appendChild(header);

          entries.forEach(({ spell, index }) => {
            const li = document.createElement('li');
            li.className = 'list-group-item bg-transparent small ps-3';

            const title = spell.title || spell.name || 'Unknown spell';
            // Strip "(ritual)" from school display — the badge handles it
            const schoolText = (spell.school || '').replace(/\s*\(ritual\)/i, '').trim();
            const isRitual = isRitualSpell(spell);
            const isCantrip = lvl === 0;

            const metaLine = [
              schoolText,
              spell.concentration ? 'Concentration' : null
            ].filter(Boolean).join(' · ');

            const bodyText = (spell.body || '').trim();
            const preview = bodyText.length > 160 ? bodyText.slice(0, 160) + '…' : bodyText;
            const prepared = !!spell.prepared;
            const showCastButton = prepared || isCantrip;
            const spellTags = Array.isArray(spell.tags) ? spell.tags.map(t => t.toLowerCase()) : [];
            const _hasDmgTag = spellTags.includes('damage') || spellTags.some(t => t.includes('heal'));
            const _hasStructuredDice = !!(spell.damage_dice || spell.heal_dice);
            const _hasBodyDice = /\d+d\d+/.test(spell.body || '');
            const hasRoll = _hasDmgTag && (_hasStructuredDice || _hasBodyDice);
            const isSpellAttack = spellTags.includes('attack');
            const rollLabel = isSpellAttack ? 'Atk' : (spellTags.some(t => t.includes('heal')) && !spellTags.includes('damage') ? 'Heal' : 'Dmg');
            const rollTitle = isSpellAttack ? 'Roll spell attack + damage' : 'Roll damage/healing dice';

            // Suppress "ritual" from generic tag badges — the Ritual badge above handles it
            const displayTags = Array.isArray(spell.tags)
              ? spell.tags.filter(t => !t.toLowerCase().includes('ritual'))
              : [];

            li.innerHTML = `
              <div class="d-flex justify-content-between align-items-start">
                <div class="me-2">
                  <div>
                    <strong>${title}</strong>
                    ${prepared ? '<span class="badge bg-success bg-opacity-75 ms-1">Prepared</span>' : ''}
                    ${isRitual ? '<span class="badge bg-info bg-opacity-75 ms-1" title="Can be cast as a ritual — no slot used, +10 min casting time">Ritual</span>' : ''}
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
                  ${displayTags.length
                    ? `<div class="mt-1">
                        ${displayTags.map(t => `<span class="badge bg-secondary bg-opacity-50 me-1">${t}</span>`).join('')}
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
                  ${isRitual && !isCantrip ? `
                    <button type="button"
                            class="btn btn-sm btn-outline-info spell-ritual-btn"
                            data-spell-index="${index}"
                            data-spell-name="${(spell.name || title).replace(/"/g, '&quot;')}"
                            title="Cast as ritual — no spell slot used, casting time +10 minutes">
                      <i class="bi bi-hourglass-split"></i> Ritual
                    </button>
                  ` : ''}
                  ${hasRoll ? `
                    <button type="button"
                            class="btn btn-sm btn-outline-info spell-roll-btn"
                            data-spell-index="${index}"
                            title="${rollTitle}">
                      <i class="bi bi-dice-6"></i> ${rollLabel}
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
        // Polymorph / True Polymorph: append form reference to Spells tab Notes
        appendPolymorphNotesToSpellNotes(spell.name, parseInt($('charLevel') && $('charLevel').value) || 1);
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
        const spell = currentSpellList[spellIndex];

        // Check if already concentrating on a different spell
        if (spell?.concentration && isConcentrating()) {
          const currentSpell = window.currentConcentrationSpell || 'another spell';
          const proceed = confirm(
            `You are currently concentrating on ${currentSpell}.\n\n` +
            `Casting ${spellName} will end your concentration on ${currentSpell}.\n\n` +
            `Continue?`
          );
          if (!proceed) return;
        }

        // Cantrip — action economy committed here since executeCast is not used for cantrips
        if (level === 0) {
          if (typeof window.detectSpellActionType === 'function' && typeof window.triggerActionEconomy === 'function') {
            const actionType = window.detectSpellActionType(spell?.casting_time || '');
            if (!window.triggerActionEconomy(actionType)) return;
          }
          const feedbackEl = document.querySelector(`.spell-cast-feedback[data-spell-index="${spellIndex}"]`);
          if (feedbackEl) {
            feedbackEl.innerHTML = `<span class="badge bg-success bg-opacity-75"><i class="bi bi-check-circle me-1"></i>Cast ${spellName}!</span>`;
            setTimeout(() => { feedbackEl.innerHTML = ''; }, 3000);
          }
          if (window.parseSpellRollInfo?.(spell)?.rollType) window.rollSpellDice?.(spellIndex);
          else showRollToast('Spell Cast', spellName, 'Cantrip');
          return;
        }

        // Leveled spell — delegate slot lookup, upcast picker, action economy, and slot
        // consumption to the shared functions exposed from characters.html IIFE.
        const slotOptions = window.getAvailableSlotLevels?.(level);
        if (!slotOptions || slotOptions.length === 0) {
          showAppToast(`No spell slots available for a level ${level}+ spell.`, 'warning');
          return;
        }

        if (slotOptions.length === 1) {
          window.executeCast(spellIndex, level, spellName, slotOptions[0]);
        } else {
          window.showUpcastModal(spellIndex, spell, slotOptions);
        }
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
          if (attack.offhand) attackInfo += ` · <span class="badge bg-info bg-opacity-75 text-dark">off-hand</span>`;

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
                  <button type="button" class="btn btn-success" data-damage-roll="${index}" data-roll-type="critical" title="Critical Hit (roll the dice twice)">
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
                  <button type="button" class="btn btn-success" data-damage2-roll="${index}" data-roll-type="critical" title="Critical Hit (roll the dice twice)">
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
        $('attackOffhand').checked = false;

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
          $('attackOffhand').checked = !!attack.offhand;
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
          properties: ($('attackProperties').value || '').trim(),
          offhand: !!$('attackOffhand').checked
        };

        if (!attack.name) {
          showAppToast('Attack must have a name.', 'warning');
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

          const rarityBadge = (() => {
            if (!item.magical && !item.rarity) return '';
            const rarityColors = {
              common: 'secondary', uncommon: 'success', rare: 'primary',
              'very-rare': 'info', legendary: 'warning', artifact: 'danger'
            };
            const rarityLabel = {
              common: 'Common', uncommon: 'Uncommon', rare: 'Rare',
              'very-rare': 'Very Rare', legendary: 'Legendary', artifact: 'Artifact'
            };
            if (item.rarity) {
              const color = rarityColors[item.rarity] || 'secondary';
              return `<span class="badge bg-${color} ms-1">${rarityLabel[item.rarity]}</span>`;
            }
            return '<span class="badge bg-secondary ms-1"><i class="bi bi-stars"></i> Magical</span>';
          })();

          tr.innerHTML = `
            <td>
              <strong>${item.name || 'Unnamed Item'}</strong>${rarityBadge}
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

        // Optionally include coin weight (50 coins = 1 lb per RAW)
        const coinWeightToggle = $('includeCoinWeight');
        if (coinWeightToggle && coinWeightToggle.checked) {
          const cp = parseInt(($('currencyCP') || {}).value) || 0;
          const sp = parseInt(($('currencySP') || {}).value) || 0;
          const ep = parseInt(($('currencyEP') || {}).value) || 0;
          const gp = parseInt(($('currencyGP') || {}).value) || 0;
          const pp = parseInt(($('currencyPP') || {}).value) || 0;
          totalWeight += (cp + sp + ep + gp + pp) / 50;
        }

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
          $('inventoryItemMagical').checked = !!item.magical;
          $('inventoryItemRarity').value = item.rarity || '';
          $('inventoryItemNotes').value = item.notes || '';
          $('inventoryItemModalLabel').textContent = 'Edit Item';
        } else {
          editIndexInput.value = '';
          $('inventoryItemName').value = '';
          $('inventoryItemQuantity').value = 1;
          $('inventoryItemWeight').value = 0;
          $('inventoryItemEquipped').checked = false;
          $('inventoryItemAttuned').checked = false;
          $('inventoryItemMagical').checked = false;
          $('inventoryItemRarity').value = '';
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
        const magical = $('inventoryItemMagical').checked;
        const rarity = $('inventoryItemRarity').value;
        const notes = $('inventoryItemNotes').value.trim();

        if (!name) {
          showAppToast('Please enter an item name.', 'warning');
          return;
        }

        const item = {
          name,
          quantity,
          weight,
          equipped,
          attuned,
          magical,
          rarity,
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

        // 2024 PHB exhaustion: -2 penalty to d20 tests per level; halved speed at 5; dead at 10
        if (level === 0) {
          desc.textContent = '0 = No exhaustion';
        } else if (level >= 1 && level <= 4) {
          const penalty = level * 2;
          desc.textContent = `${level} = −${penalty} to all d20 tests`;
        } else if (level === 5) {
          desc.textContent = '5 = −10 to all d20 tests, Speed halved';
        } else if (level >= 6 && level <= 9) {
          const penalty = level * 2;
          desc.textContent = `${level} = −${penalty} to all d20 tests, Speed halved`;
        } else if (level === 10) {
          desc.textContent = '10 = Dead';
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

      const CONC_TOOLTIP = 'Maintaining a concentration spell. Takes concentration checks (DC = max(10, \xbd damage taken)) when damaged.';

      // Check if currently concentrating
      function isConcentrating() {
        const btn = document.querySelector('.condition-btn[data-condition="Concentrating"]');
        return btn?.classList.contains('active') || false;
      }

      // Set concentration state — single source of truth for all concentration changes
      function setConcentration(active, spellName = null) {
        const btn        = document.querySelector('.condition-btn[data-condition="Concentrating"]');
        const spellInput = $('charConcentrationSpell');
        const checkbox   = $('charConcentrating');

        if (active) {
          if (btn) {
            btn.classList.add('active');
            btn.title = spellName ? `Concentrating on: ${spellName}` : CONC_TOOLTIP;
          }
          if (checkbox) checkbox.checked = true;
          window.currentConcentrationSpell = spellName;
          if (spellInput && spellName) spellInput.value = spellName;
        } else {
          if (btn) {
            btn.classList.remove('active');
            btn.title = CONC_TOOLTIP; // restore so tooltip still appears on hover
          }
          if (checkbox) checkbox.checked = false;
          window.currentConcentrationSpell = null;
          if (spellInput) spellInput.value = '';
        }
        syncConditionsToField();
        saveCurrentCharacter();

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

        const dc = getConcentrationCheckDC(damage);
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
          showAppToast(`Concentration on ${spellName} has been lost!`, 'warning');
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
        const dc = calcSpellSaveDC(pb, abilMod);
        const attack = calcSpellAttackBonus(pb, abilMod);

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
      // classes[] is the record of a multiclass character (names, subclasses, levels). The class field is a
      // presentation and edit surface derived from it: "Class (Subclass) / Class (Subclass)", with no levels.
      // saveCurrentCharacter keeps classes[] as it is while the field still shows this text.
      function formatClassField(char) {
        const withSubclass = (name, subclass) => (subclass ? `${name} (${subclass})` : name);
        if (char.multiclass && Array.isArray(char.classes) && char.classes.length > 1) {
          return char.classes.map(c => withSubclass(c.className, c.subclass)).join(' / ');
        }
        return withSubclass(char.charClass || '', char.subclass);
      }

      // Reads the class field text back into structure. One segment must be whole: "Class", "Class (Subclass)", and
      // optionally a trailing level ("Class (Subclass) 3"). A multiclass edit is applied only when it reads as a complete
      // class list: every segment valid, every level known (typed, or carried from the same class in classes[]; never
      // guessed), and the levels adding up to the character level. Otherwise the caller keeps the structured data.
      const CLASS_FIELD_SEGMENT = /^([^()/]+?)(?:\s*\(([^()/]+)\))?(?:\s+(\d+))?$/;

      function readClassField(text, char, totalLevel) {
        const segments = text.split('/').map(s => s.trim());
        const wasMulticlass = !!char.multiclass;

        if (segments.length === 1) {
          // One class. Text alone never collapses a stored multiclass character (a class can pass through this state
          // mid-edit); removing a class on purpose is done in the Manage Multiclass dialog.
          if (wasMulticlass && Array.isArray(char.classes) && char.classes.length > 1) return { kind: 'invalid' };
          if (wasMulticlass && !CLASS_FIELD_SEGMENT.test(segments[0])) return { kind: 'invalid' };
          return { kind: 'single' };
        }

        // The text has no levels, so an unchanged field means the structured data is untouched
        if (wasMulticlass && segments.join(' / ') === formatClassField(char)) return { kind: 'unchanged' };

        const previousClasses = Array.isArray(char.classes) ? char.classes : [];
        const classes = [];
        for (const segment of segments) {
          const match = segment.match(CLASS_FIELD_SEGMENT);
          if (!match) return { kind: 'invalid' };
          const className = match[1].trim();
          const subclass = match[2] ? match[2].trim() : '';
          const previous = previousClasses.find(c => (c.className || '').toLowerCase() === className.toLowerCase());
          const level = match[3] ? parseInt(match[3], 10) : (previous ? Number(previous.level) : NaN);
          if (!Number.isFinite(level) || level < 1) return { kind: 'invalid' };
          const previousSubclassLevel = previous && previous.subclass === subclass ? (Number(previous.subclassLevel) || 0) : 0;
          classes.push({
            className,
            subclass,
            level,
            subclassLevel: subclass ? (previousSubclassLevel || level) : 0
          });
        }
        if (classes.reduce((sum, c) => sum + c.level, 0) !== totalLevel) return { kind: 'invalid' };
        return { kind: 'multi', classes };
      }

      let lastRejectedClassText = null;

      function fillFormFromCharacter(char) {
          if (!char) return;
          rememberLastCharacter(char.id);

          // Set flag to prevent auto-saves while loading
          isLoadingCharacter = true;

          // Ensure derived values are in sync with stored scores/skills
          recalcDerivedOnCharacter(char);
            
          $('charName').value = char.name || '';
          $('playerName').value = char.playerName || '';
          $('charRace').value = char.race || '';
          $('charClass').value = formatClassField(char);
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
              concBtn.title = CONC_TOOLTIP;
            }
          }

          // Sync action tracker buttons to loaded character state
          if (typeof window.updateActionTracker === 'function') {
            window.updateActionTracker(char);
          }

          // Currency
          const currency = char.currency || {};
          $('currencyCP').value = currency.cp ?? 0;
          $('currencySP').value = currency.sp ?? 0;
          $('currencyEP').value = currency.ep ?? 0;
          $('currencyGP').value = currency.gp ?? 0;
          $('currencyPP').value = currency.pp ?? 0;

          // Coin weight toggle
          if ($('includeCoinWeight')) $('includeCoinWeight').checked = !!char.includeCoinWeight;

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

          const stats = char.stats || {};
          $('statStr').value = stats.str ?? '';
          $('statDex').value = stats.dex ?? '';
          $('statCon').value = stats.con ?? '';
          $('statInt').value = stats.int ?? '';
          $('statWis').value = stats.wis ?? '';
          $('statCha').value = stats.cha ?? '';
          updateSpellDCAndAttack(); // reads the ability, level and scores filled above
            
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
          if ($('skillJoAT')) $('skillJoAT').checked = !!char.skillJoAT;
          if ($('charLanguages')) $('charLanguages').value = char.languages || '';
          if ($('charArmorWeaponProf')) $('charArmorWeaponProf').value = char.armorWeaponProf || '';
          if ($('charToolProf')) $('charToolProf').value = char.toolProf || '';

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

          // Resources: support both new array format and old { res1, res2, res3 } format
          {
            const raw = char.resources || {};
            let resources = [];
            if (Array.isArray(raw)) {
              resources = raw;
            } else {
              ['res1', 'res2', 'res3'].forEach(key => {
                const r = raw[key];
                if (r && (r.name || r.max)) {
                  resources.push({
                    name:    r.name    || '',
                    current: r.current ?? 0,
                    max:     r.max     ?? 0,
                    resetOn: r.resetOn || 'long',
                  });
                }
              });
            }
            renderResourceRows(resources);
          }
      
          // Proficiency bonus displays
          {
            const pb = typeof char.proficiencyBonus === 'number' && !isNaN(char.proficiencyBonus)
              ? char.proficiencyBonus
              : getProficiencyBonusFromLevel(char.level || 1);
            const pbStr = (pb >= 0 ? '+' : '') + pb;
            const pbSpan = $('charProficiencyBonusDisplay');
            if (pbSpan) pbSpan.textContent = pbStr;
            const pbAbils = $('charProfBonusAbilsDisplay');
            if (pbAbils) pbAbils.textContent = pbStr;
          }
      
          $('charFeatures').value = char.features || '';
          $('charSpells').value = char.spells || '';
          // Legacy inventory field (may not exist if using new structured inventory)
          const charInventoryEl = $('charInventory');
          if (charInventoryEl) charInventoryEl.value = char.inventory || '';
          $('charNotes').value = char.notes || '';
          $('charTableNotes').value = char.tableNotes || '';

          // Categorized notes — migrate old flat extraNotes into general if no structured data yet
          const saved = char.categorizedNotes || {};
          currentCategorizedNotes = {
            general: saved.general ?? char.extraNotes ?? '',
            sessionNotes: saved.sessionNotes ?? '',
            lootLeads: saved.lootLeads ?? '',
            questHooks: saved.questHooks ?? ''
          };
          // The active category is page state, not character state: keep whichever one the user is in.
          showNotesCategory(currentNotesCategory);
          updateXPDisplay(char.xp || 0, parseInt(char.level) || 1);
      
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
          recalcPassivesFromForm();
          updateHPBar();

          // Clear loading flag after a small delay to allow all event handlers to settle
          setTimeout(() => {
            isLoadingCharacter = false;
            // Dispatch event to notify other parts of the app that character data is ready
            document.dispatchEvent(new CustomEvent('characterLoaded', { detail: { character: char } }));
          }, 100);
        }

      function getSpellSlotsForClassLevel(className, level) {
        // First try to use LevelUpData if available (supports homebrew classes via content packs)
        if (window.LevelUpData && typeof window.LevelUpData.getClassData === 'function') {
          const classData = window.LevelUpData.getClassData(className);
          if (classData && classData.spellSlots && classData.spellSlots[level]) {
            return classData.spellSlots[level];
          }
        }
        return _getSpellSlotsForClassLevel(className, level);
      }

      const getPactMagicSlots = _getPactMagicSlots;

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

        // Set starting XP to the floor for the character's starting level
        // (level 1 = 0 XP, level 3 = 900, level 5 = 6,500, etc.)
        const startingLevel = parseInt(wizardData.level) || 1;
        const startingXP = getXPForLevel(startingLevel) || 0;
        const wizardChar = getCurrentCharacter();
        if (wizardChar) wizardChar.xp = startingXP;
        updateXPDisplay(startingXP, startingLevel);

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

        // Pre-fill initiative modifier from DEX if not already set (new character path).
        // We set this AFTER recalcDerivedFromForm so modDex is already populated.
        const initModField = $('charInitMod');
        if (initModField && initModField.value === '') {
          const dexMod = Number($('modDex')?.value || '') || 0;
          initModField.value = dexMod;
        }

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

        // Check if any starting spell is Polymorph / True Polymorph
        (currentSpellList || []).forEach(sp => {
          appendPolymorphNotesToSpellNotes(sp.name, wizardData.level || 1);
        });

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

            const spellSaveDC = calcSpellSaveDC(profBonus, abilityMod);
            const spellAttackBonus = calcSpellAttackBonus(profBonus, abilityMod);

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
            }
          }
        }

        // Populate racial and class features if provided
        if ($('charFeatures')) {
          // Use allFeatures if available (includes racial + class), fallback to classFeatures only
          const featuresText = wizardData.allFeatures || wizardData.classFeatures || '';
          $('charFeatures').value = featuresText;
        }

        // Add class-specific At-the-Table Reminders for Druids (Wild Shape)
        if (wizardData.class === 'Druid' && $('charTableNotes')) {
          const druidLevel = wizardData.level || 1;
          let druidNote = '';
          if (druidLevel < 2) {
            druidNote = '=== WILD SHAPE ===\n' +
              'At level 2, you gain Wild Shape! Transform into a prepared Beast form as a Bonus Action.\n\n' +
              'Wild Shape basics (2024 PHB):\n' +
              '- Uses: 2 (regain 1 on Short Rest, all on Long Rest)\n' +
              '- Duration: half your Druid level in hours (min. 1 hour)\n' +
              '- Temp HP equal to your Druid level (you keep your own HP total)\n' +
              '- Known Forms: 4 at level 2, 6 at level 4, 8 at level 8\n' +
              '- You can speak while transformed\n' +
              '- No need to have previously seen the beast\n\n' +
              'When you level up to level 2, your available beast forms will be listed here.';
          } else if (wizardData.wildShapeReference) {
            druidNote = wizardData.wildShapeReference;
          }
          if (druidNote) {
            const existing = $('charTableNotes').value;
            $('charTableNotes').value = existing ? existing + '\n\n' + druidNote : druidNote;
          }
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
            renderResourceRows(resources);
            console.log(`🎯 Generated ${resources.length} class resources for ${wizardData.class}`);
          }

          // Warlock: pact slots as a trackable short-rest resource row
          // (rendered after renderResourceRows so it isn't overwritten)
          if (wizardData.class === 'Warlock' && wizardData.level >= 1) {
            const pactSlotData = getPactMagicSlots(wizardData.level);
            if (pactSlotData) {
              addResourceRow({
                name: `Pact Slots (Lvl ${pactSlotData.level})`,
                current: pactSlotData.slots,
                max: pactSlotData.slots,
                resetOn: 'short'
              });
            }
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
          xp: 0,
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
          // Turn action tracking (reset each turn)
          actionUsed: false,
          bonusActionUsed: false,
          reactionUsed: false,
          moveUsed: false,

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
          resources: [],

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
        // Show the styled choice modal instead of a raw confirm()
        const choiceModal = document.getElementById('newCharacterChoiceModal');
        if (choiceModal && typeof bootstrap !== 'undefined') {
          const bsModal = bootstrap.Modal.getOrCreateInstance(choiceModal);
          bsModal.show();
        } else {
          // Fallback if modal not present
          _doCreateBlankCharacter();
        }
      }

      function _doCreateBlankCharacter() {
        const newChar = newCharacterTemplate();
        characters.push(newChar);
        currentCharacterId = newChar.id;
        renderCharacterSelect();
        fillFormFromCharacter(newChar);
        clearDirty();
        saveCharactersToStorage();
      }

      function _doCreateWithWizard() {
        if (typeof CharacterCreationWizard === 'undefined') {
          _doCreateBlankCharacter();
          return;
        }
        // Push a placeholder but don't persist yet — wizard abandonment cleanup will remove it if needed
        const newChar = newCharacterTemplate();
        characters.push(newChar);
        currentCharacterId = newChar.id;
        renderCharacterSelect();
        fillFormFromCharacter(newChar);
        clearDirty();
        wizardIsOpen = true;
        CharacterCreationWizard.open();
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
          const classEdit = readClassField(fullClass, char, getNum('charLevel'));

          if (classEdit.kind === 'invalid') {
            // Not a complete class list: keep classes[], the class and the subclass exactly as stored
            if (lastRejectedClassText !== fullClass) {
              lastRejectedClassText = fullClass;
              showAppToast('Class field not applied: use "Class (Subclass) / Class (Subclass)", give new classes a level such as "Rogue 1", and make the levels add up to the character level. Or use Manage Multiclass.', 'warning');
            }
          } else if (classEdit.kind === 'unchanged' || classEdit.kind === 'multi') {
            lastRejectedClassText = null;
            char.multiclass = true;

            // An unchanged field keeps classes[] as it is (the text has no levels)
            if (classEdit.kind === 'multi') char.classes = classEdit.classes;

            // For backward compatibility, set primary class as first class
            const primary = char.classes[0];
            if (primary) {
              char.charClass = primary.className;
              char.subclass = primary.subclass;
              char.subclassLevel = primary.subclassLevel;
            }

            // Legacy records whose class levels do not add up are kept as stored; this only reports the mismatch
            const totalLevel = char.classes.reduce((sum, c) => sum + (Number(c.level) || 0), 0);
            if (totalLevel > 0 && totalLevel !== getNum('charLevel')) {
              console.warn(`Total multiclass levels (${totalLevel}) differs from character level (${getNum('charLevel')}). Using character level.`);
            }

          } else {
            lastRejectedClassText = null;
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
          char.xp = char.xp || 0; // XP is maintained in-memory by adjustXP(); just guard against undefined
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
          char.includeCoinWeight = !!$('includeCoinWeight')?.checked;

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
          char.skillJoAT = !!$('skillJoAT')?.checked;
          char.languages = getVal('charLanguages');
          char.armorWeaponProf = getVal('charArmorWeaponProf');
          char.toolProf = getVal('charToolProf');

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
          char.resources = collectResources();
        
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
          // Flush any unsaved edits to current category before saving
          currentCategorizedNotes[currentNotesCategory] = $('charExtraNotes').value;
          char.categorizedNotes = { ...currentCategorizedNotes };

          // Portrait data - preserve existing portrait data (don't overwrite with form fields)
          // The portrait is managed through the portrait modal, not the main form
          // So we just ensure the fields exist, but don't overwrite them here
          if (!char.portraitType) char.portraitType = null;
          if (!char.portraitData) char.portraitData = null;
          if (!char.portraitSettings) char.portraitSettings = { scale: 1, offsetX: 0, offsetY: 0 };

          // Recalculate derived fields (mods, PB, passivePerception) based on the updated data
          recalcDerivedOnCharacter(char);

          commitCharacter(char);
        }

      // Stamps and writes the characters array, then refreshes the save-related UI. saveCurrentCharacter() ends here
      // after reading the form; persistCurrentCharacter() enters here directly with an already-updated character.
      // The sheet counts as saved, and success is shown, only once the write has actually finished; a failed write
      // leaves it unsaved and says so. Resolves true when the write succeeded.
      //
      // Sheet-specific UI (the unsaved dot, the last-saved text, the success toast) is touched only while `char` is
      // still the character on screen: a save can finish after the user has switched to another one. The write
      // itself is never cancelled, and it stores the whole characters array.
      //
      // One failure message per failing operation: a manual Save always reports; automatic saves report the first
      // failure and then stay quiet until a write succeeds (they keep trying). report:false leaves the message to
      // the caller (level-up shows its own).
      let saveFailureReported = false;
      async function commitCharacter(char, { report = true } = {}) {
          const manual = _manualSave;
          _manualSave = false;
          const editsAtStart = editCount;
          char.lastUpdated = new Date().toISOString();

          try {
            await saveCharactersToStorage({ notify: false });
          } catch (err) {
            console.error('Character save failed:', err);
            if (report && (manual || !saveFailureReported)) {
              const full = err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''));
              showAppToast(full
                ? 'Character NOT saved: browser storage is full. Remove portrait images or export a backup.'
                : 'Character NOT saved: the browser could not write it to storage. Export a backup.', 'danger');
            }
            saveFailureReported = true;
            // the sheet holds changes that are not stored, e.g. a level-up on a clean sheet
            if (getCurrentCharacter() === char) markDirty();
            return false;
          }

          saveFailureReported = false;
          renderCharacterSelect();
          updateStorageUsageDisplay();
          if (getCurrentCharacter() === char) {
            // Edits made while the write was in flight are not in it, so they keep the sheet marked unsaved
            if (editCount === editsAtStart) clearDirty();
            if (manual) showAppToast('Character saved', 'success');
            setLastUpdatedText(char);
          }
          return true;
        }

      // Persists the current character object as it stands, without reading the form and regardless of the
      // form-loading flag. For flows (level-up) that have just updated the object and reloaded the form from it.
      async function persistCurrentCharacter(options) {
          const char = getCurrentCharacter();
          if (!char) return false;
          return commitCharacter(char, options);
        }
      function clearFormToEmptyState() {
        // Blank the visible fields without creating a character object
        isLoadingCharacter = true;
        const blank = newCharacterTemplate();
        fillFormFromCharacter(blank);
        isLoadingCharacter = false;
        clearDirty();
      }

      function deleteCurrentCharacter() {
        const char = getCurrentCharacter();
        if (!char) return;
        if (!confirm(`Delete "${char.name || 'Unnamed Character'}"? This cannot be undone.`)) return;
        characters = characters.filter(c => c.id !== char.id);
        saveCharactersToStorage();

        if (characters.length > 0) {
          currentCharacterId = characters[0].id;
          renderCharacterSelect();
          fillFormFromCharacter(getCurrentCharacter());
          clearDirty();
        } else {
          currentCharacterId = null;
          renderCharacterSelect();
          clearFormToEmptyState();
          showAppToast('All characters deleted. Click New to create one.', 'info');
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

        // Deep-copy characters so we can merge live tracker state without mutating
        const exportData = characters.map(c => JSON.parse(JSON.stringify(c)));

        // Merge live combat state from initiative tracker if a session is active
        try {
          const trackerRaw = localStorage.getItem('initiativeTrackerData');
          if (trackerRaw) {
            const trackerData = JSON.parse(trackerRaw);
            const trackerPCs = (trackerData.characters || []).filter(tc => tc.type === 'PC');
            if (trackerPCs.length) {
              for (const tc of trackerPCs) {
                const match = exportData.find(
                  c => c.name && tc.name && c.name.trim().toLowerCase() === tc.name.trim().toLowerCase()
                );
                if (match) {
                  // Update live combat fields; full character data stays from IndexedDB
                  match.currentHP = tc.currentHP ?? match.currentHP;
                  match.tempHP = tc.tempHP ?? match.tempHP;
                  match.deathSaves = tc.deathSaves ?? match.deathSaves;
                  if (Array.isArray(tc.status) && tc.status.length) {
                    match.combatStatus = tc.status;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('exportAllCharacters: could not merge tracker state', e);
        }

        const dataStr = JSON.stringify(exportData, null, 2);
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
            const importWarnings = [];

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

              // Recalculate all derived values so stale data from old exports doesn't persist.
              // This fixes statMods, proficiencyBonus, save/skill bonuses, passivePerception,
              // and spell slot maxes based on authoritative source fields (stats, level, class).
              recalcDerivedOnCharacter(c);

              // Malformed imports were previously merged in silently (Object.assign
              // doesn't throw on bad shapes). Warn without blocking, so a slightly
              // off import still succeeds like it always has, but it's no longer silent.
              // Pass the live class list so homebrew classes from content packs validate too.
              const knownClasses = (window.LevelUpData && window.LevelUpData.CLASS_DATA)
                ? Object.keys(window.LevelUpData.CLASS_DATA)
                : undefined;
              const validation = validateCharacter(c, { knownClasses });
              if (!validation.valid) {
                console.warn(`[Character Import] "${c.name || 'Unnamed'}" has invalid data:`, validation.errors);
                importWarnings.push(c.name || 'Unnamed');
              }

              tempCharacters.push(c);
            });

            // Duplicate detection: find any imported names that already exist
            const existingNames = new Set(characters.map(c => (c.name || '').trim().toLowerCase()));
            const duplicates = tempCharacters.filter(c => existingNames.has((c.name || '').trim().toLowerCase()));
            if (duplicates.length > 0) {
              const dupeList = duplicates.map(c => `"${c.name}"`).join(', ');
              const skipDupes = !confirm(
                `The following character(s) already exist:\n${dupeList}\n\nClick OK to import anyway (creates a copy), or Cancel to skip duplicates.`
              );
              if (skipDupes) {
                const filteredCount = tempCharacters.length - duplicates.length;
                tempCharacters.splice(0, tempCharacters.length, ...tempCharacters.filter(
                  c => !existingNames.has((c.name || '').trim().toLowerCase())
                ));
                if (tempCharacters.length === 0) {
                  showAppToast('All imported characters already exist — nothing added.', 'info');
                  return;
                }
                showAppToast(`Skipped ${duplicates.length} duplicate(s), importing ${tempCharacters.length} new character(s).`, 'info');
              }
            }

            // Try to save with portraits first
            const originalCharacters = [...characters];
            tempCharacters.forEach(c => characters.push(c));

            try {
              await saveCharactersToStorage();
              // Success! Update UI
              currentCharacterId = tempCharacters[tempCharacters.length - 1].id;
              renderCharacterSelect();
              fillFormFromCharacter(getCurrentCharacter());
              showAppToast(`Imported ${tempCharacters.length} character(s)`, 'success');
              if (importWarnings.length > 0) {
                showAppToast(
                  `${importWarnings.length} imported character(s) had data issues (see console): ${importWarnings.join(', ')}`,
                  'warning'
                );
              }
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
                    showAppToast(`Imported ${tempCharacters.length} character(s) (portraits removed)`, 'warning');
                  } catch (retryError) {
                    characters = originalCharacters;
                    showAppToast('Import failed — storage may be full. Try deleting a character first.', 'danger');
                  }
                } else {
                  showAppToast('Import cancelled.', 'info');
                }
              } else {
                characters = originalCharacters;
                throw error;
              }
            }
          } catch (error) {
            console.error('Import error:', error);
            showAppToast('Import failed: ' + (error.message || 'invalid JSON format'), 'danger');
          }
        };
        reader.readAsText(file);
      }

      // ---------- Rest handlers ----------

      let hitDiceModalData = null;

      function openHitDiceModal() {
        // Get current character data
        const curHP = getNumber('charCurrentHP', 0);
        const maxHP = getNumber('charMaxHP', 0);
        const hdRemaining = $('charHitDiceRemaining')?.value.trim() || '0d0';
        const conMod = getNumber('modCon', 0); // the sheet's Constitution modifier field

        // The remaining pool: one size ("5d10") or several ("3d8 + 4d6"), read against the total
        const pool = HitDice.resolveRemaining(HitDice.parse($('charHitDice')?.value || ''), hdRemaining);
        if (!pool) {
          showAppToast('Invalid hit dice format — expected XdY (e.g., 5d10).', 'warning');
          return;
        }

        const dieSize = HitDice.defaultSize(pool);
        if (dieSize === null) {
          showAppToast('No hit dice remaining — take a long rest to restore them.', 'warning');
          return;
        }
        const availableCount = HitDice.countOf(pool, dieSize);

        // Store modal data
        hitDiceModalData = {
          curHP,
          maxHP,
          pool,
          availableCount,
          dieSize,
          conMod,
          spentCount: 0,
          rolledHealing: 0
        };

        // Update modal UI
        $('hdModalCurrentHP').textContent = `${curHP} / ${maxHP}`;
        $('hdModalAvailable').textContent = HitDice.format(pool);
        $('hdConMod').textContent = conMod >= 0 ? `+${conMod}` : `${conMod}`;
        // With several die sizes still available the player picks which one to spend
        const sizesLeft = pool.filter(p => p.count > 0);
        const sizeRow = $('hdDieSizeRow');
        const sizeSelect = $('hdDieSize');
        if (sizeRow && sizeSelect) {
          sizeSelect.innerHTML = sizesLeft.map(p => `<option value="${p.size}">d${p.size} (${p.count} left)</option>`).join('');
          sizeSelect.value = String(dieSize);
          sizeRow.style.display = sizesLeft.length > 1 ? '' : 'none';
        }
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
        if (Number.isNaN(count) || count <= 0 || count > hitDiceModalData.availableCount) { // blank/non-numeric parses to NaN
          showAppToast('Invalid number of hit dice to spend.', 'warning');
          return;
        }

        const { dieSize, conMod } = hitDiceModalData;
        // Null when the count or die size (from the saved hit-dice text) is beyond the engine's limits.
        const healed = rollHitDiceForHealing(dieSize, count, conMod);
        if (!healed) {
          showAppToast('Too many hit dice, or too large a die, to roll.', 'warning');
          return;
        }
        const { rolls, healing } = healed;

        // Store results
        hitDiceModalData.spentCount = count;
        hitDiceModalData.rolledHealing = healing;

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

        const { curHP, maxHP, spentCount, dieSize, rolledHealing, pool } = hitDiceModalData;

        // Apply healing (can't exceed max HP)
        const newHP = applyHealingToHP(curHP, maxHP, rolledHealing);
        $('charCurrentHP').value = newHP;

        // Reduce remaining hit dice
        const newPool = HitDice.spend(pool, dieSize, spentCount);
        $('charHitDiceRemaining').value = HitDice.format(newPool);

        // Close modal
        const modal = bootstrap.Modal.getInstance($('hitDiceModal'));
        if (modal) modal.hide();

        // Clear data
        hitDiceModalData = null;

        // Show success message
        showAppToast(`Healed ${rolledHealing} HP → ${newHP}/${maxHP} HP. ${HitDice.format(newPool)} remaining. Remember to Save!`, 'success');
      }

      function handleShortRest() {
        // D&D 5e Short Rest (typically 1 hour):
        // - Regain HP by spending hit dice (opens modal)
        // - Warlock pact slots reset
        // - Short rest abilities/resources reset

        // Reset pact slots (Warlock feature - resets on short rest)
        const pactUsedEl = $('pactUsed');
        if (pactUsedEl) pactUsedEl.value = 0;

        // Reset resources that recover on short rest
        document.querySelectorAll('#resourcesList .resource-row').forEach(row => {
          const resetOn = row.querySelector('.res-reset')?.value;
          if (resetOn === 'short') {
            const maxEl = row.querySelector('.res-max');
            const curEl = row.querySelector('.res-current');
            if (maxEl && curEl && maxEl.value !== '') curEl.value = maxEl.value;
          }
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
            // The total may hold several die sizes ("3d8 + 4d6"); the remaining pool is read against it
            const totalPool = HitDice.parse(totalHD);
            if (totalPool) {
              const remaining = HitDice.resolveRemaining(totalPool, hdRemainEl.value) || totalPool.map(t => ({ size: t.size, count: 0 }));
              hdRemainEl.value = HitDice.format(HitDice.restoreLong(totalPool, remaining));
            } else {
              // If format is unclear, just restore to full
              hdRemainEl.value = totalHD;
            }
          }
        }

        // Reset resources that recover on long rest (short + long, not manual)
        document.querySelectorAll('#resourcesList .resource-row').forEach(row => {
          const resetOn = row.querySelector('.res-reset')?.value;
          if (resetOn === 'short' || resetOn === 'long') {
            const maxEl = row.querySelector('.res-max');
            const curEl = row.querySelector('.res-current');
            if (maxEl && curEl && maxEl.value !== '') curEl.value = maxEl.value;
          }
        });

        // Reset spell slots (used -> 0)
        for (let lvl = 1; lvl <= 9; lvl++) {
          const usedEl = $(`slots${lvl}Used`);
          if (usedEl) usedEl.value = 0;
        }

        // Reset pact slots
        const pactUsedEl = $('pactUsed');
        if (pactUsedEl) pactUsedEl.value = 0;

        showAppToast('Long rest complete — HP, spell slots, and resources restored. Remember to Save!', 'success');
      }

      // ---------- Events ----------
      // ---- XP Tracking ----
      // Threshold table lives in character-xp.js (verified 2026-09-18 identical to the
      // canonical window.LevelUpData.XP_THRESHOLDS — standard, essentially-immutable 5e table).

      function updateXPDisplay(xp, currentLevel) {
        const lvl = Math.min(Math.max(parseInt(currentLevel) || 1, 1), 20);
        const { nextLvlXP, xpToNext, pct, canLevelUp, atMax } = getXPProgressInfo(xp, lvl);

        const xpValueEl = $('xpValue');
        const xpNextEl  = $('xpNextDisplay');
        if (xpValueEl) xpValueEl.textContent = xp.toLocaleString();
        if (xpNextEl)  xpNextEl.textContent  = nextLvlXP ? ` / ${nextLvlXP.toLocaleString()}` : ' / Max';

        const bar          = $('xpProgressBar');
        const label        = $('xpProgressLabel');
        const levelUpBadge = $('xpLevelUpBadge');

        if (atMax) {
          if (bar)   { bar.style.width = '100%'; bar.className = 'progress-bar bg-warning'; }
          if (label) label.textContent = 'Max level reached';
          if (levelUpBadge) levelUpBadge.classList.add('d-none');
          return;
        }

        let barClass = 'progress-bar ';
        if (canLevelUp)      barClass += 'bg-info';
        else if (pct >= 67)  barClass += 'bg-success';
        else if (pct >= 34)  barClass += 'bg-warning';
        else if (pct > 0)    barClass += 'bg-danger';
        else                 barClass += 'bg-secondary';

        if (bar) {
          bar.style.width = pct + '%';
          bar.className = barClass;
          bar.setAttribute('aria-valuenow', pct);
        }
        if (label) {
          label.textContent = canLevelUp
            ? `Ready for level ${lvl + 1}!`
            : `${xpToNext.toLocaleString()} XP to level ${lvl + 1}`;
        }
        if (levelUpBadge) {
          levelUpBadge.classList.toggle('d-none', !canLevelUp);
        }
      }
      window.updateXPDisplay = updateXPDisplay;

      function adjustXP(delta) {
        const character = getCurrentCharacter();
        if (!character) return;

        const oldXP = character.xp || 0;
        const newXP = Math.max(0, oldXP + delta);
        character.xp = newXP;

        const currentLevel = parseInt($('charLevel')?.value) || 1;
        const nextLvlXP    = currentLevel < 20 ? getXPForLevel(currentLevel + 1) : null;

        updateXPDisplay(newXP, currentLevel);
        saveCurrentCharacter();

        // Prompt level-up wizard if threshold just crossed
        if (nextLvlXP && newXP >= nextLvlXP && oldXP < nextLvlXP) {
          setTimeout(() => {
            if (confirm(`🎉 ${character.name || 'This character'} has enough XP to reach level ${currentLevel + 1}!\n\nOpen the Level Up wizard now?`)) {
              if (window.LevelUpSystem && window.LevelUpSystem.startLevelUp) {
                window.LevelUpSystem.startLevelUp(character);
              }
            }
          }, 300);
        }
      }

      // ============================================================
      // POLYMORPH / TRUE POLYMORPH SPELL NOTES
      // (the note text is generated in polymorph-notes.js; this appends it to the sheet)
      // ============================================================

      /**
       * Appends Polymorph or True Polymorph reference notes to the Spells tab
       * Notes textarea (#charSpells) if not already present. The text itself comes from polymorph-notes.js.
       * @param {string} spellName          - Spell name to check
       * @param {number} charLevel          - Character level for CR cap
       * @param {Object} [characterOverride] - Pass the character object when the
       *                                       textarea may not be active (e.g. level-up)
       */
      function appendPolymorphNotesToSpellNotes(spellName, charLevel, characterOverride) {
        const character = characterOverride ||
          (typeof getCurrentCharacter === 'function' ? getCurrentCharacter() : window.getCurrentCharacter && window.getCurrentCharacter());
        const notesEl = $('charSpells');

        // Prefer the live textarea value; fall back to the character object
        const currentNotes = notesEl ? notesEl.value : (character ? (character.charSpells || '') : '');

        const beastForms = window.LevelUpData && window.LevelUpData.BEAST_FORMS;
        const updated = addPolymorphNotes(currentNotes, spellName, charLevel, beastForms);
        if (updated === null) return; // not a Polymorph spell, or its notes are already there

        if (notesEl) notesEl.value = updated;
        if (character) character.charSpells = updated;
      }
      // Expose globally so level-up-system.js can call it after spell additions
      window.appendPolymorphNotesToSpellNotes = appendPolymorphNotesToSpellNotes;

      // ============================================================
      // EVENT WIRING
      // ============================================================
      // Each wireXxxEvents() attaches one group of listeners; attachEventHandlers() calls them all, in order.

      function wireCharacterSelectionEvents() {
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
              clearDirty();
            }
          });
        } else {
          console.error('❌ Character select dropdown not found!');
        }
        $('newCharacterBtn').addEventListener('click', createNewCharacter);
        $('saveCharacterBtn').addEventListener('click', () => { _manualSave = true; saveCurrentCharacter(); });
        $('deleteCharacterBtn').addEventListener('click', deleteCurrentCharacter);
      }

      function wireNewCharacterFlowEvents() {
        // New Character choice modal buttons
        const chooseWizardBtn = $('chooseWizardBtn');
        if (chooseWizardBtn) {
          chooseWizardBtn.addEventListener('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('newCharacterChoiceModal'))?.hide();
            _doCreateWithWizard();
          });
        }
        const chooseBlankBtn = $('chooseBlankBtn');
        if (chooseBlankBtn) {
          chooseBlankBtn.addEventListener('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('newCharacterChoiceModal'))?.hide();
            _doCreateBlankCharacter();
          });
        }

        // Wizard completion feedback
        document.addEventListener('dmtoolbox:wizard-complete', (e) => {
          const { name, level, race, charClass } = e.detail || {};
          wizardIsOpen = false;
          saveCurrentCharacter();
          showAppToast(`${name} — Level ${level} ${race} ${charClass} created!`, 'success');
        });
        document.addEventListener('dmtoolbox:wizard-error', () => {
          wizardIsOpen = false;
          showAppToast('Wizard error: could not populate sheet. Refresh and try again.', 'danger');
        });

        // Wizard abandonment cleanup: if wizard modal closes without completing, remove the empty shell
        const wizardModal = document.getElementById('characterCreationModal');
        if (wizardModal) {
          wizardModal.addEventListener('hidden.bs.modal', () => {
            if (!wizardIsOpen) return;
            wizardIsOpen = false;
            const char = getCurrentCharacter();
            // Remove the placeholder if it's still empty (name untouched, no class/race set)
            if (char && !char.name && !char.charClass && !char.race) {
              characters = characters.filter(c => c.id !== char.id);
              if (characters.length > 0) {
                currentCharacterId = characters[0].id;
                fillFormFromCharacter(getCurrentCharacter());
              } else {
                currentCharacterId = null;
                clearFormToEmptyState();
              }
              renderCharacterSelect();
            }
          });
        }
      }

      function wireImportExportEvents() {
        // Overflow dropdown — items are <a> tags, need preventDefault
        const exportCharBtn = $('exportCharacterBtn');
        if (exportCharBtn) {
          exportCharBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const c = getCurrentCharacter();
            if (!c) { showAppToast('No character selected to export.', 'warning'); return; }
            exportCharacter(c);
          });
        }
        const exportAllBtn = $('exportAllCharactersBtn');
        if (exportAllBtn) {
          exportAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!characters.length) { showAppToast('No characters to export.', 'warning'); return; }
            exportAllCharacters();
          });
        }

        // Import — triggered from the overflow menu item
        const importMenuBtn = $('importCharacterMenuBtn');
        if (importMenuBtn) {
          importMenuBtn.addEventListener('click', (e) => { e.preventDefault(); $('importFileInput').click(); });
        }
        $('importFileInput').addEventListener('change', e => {
          const file = e.target.files[0];
          if (file) importCharactersFromFile(file);
          e.target.value = '';
        });
      }

      function wireDirtyTrackingEvents() {
        // Dirty tracking — single delegated listener on the full sheet
        const sheetContainer = document.getElementById('fullCharacterSheet');
        if (sheetContainer) {
          sheetContainer.addEventListener('input', markDirty);
          sheetContainer.addEventListener('change', markDirty);
        }
      }

      function wireSheetExportEvents() {
        // Print/Export Character Sheet buttons
        $('printSheetBtn').addEventListener('click', (e) => {
          e.preventDefault();
          const char = getCurrentCharacter();
          if (char) {
            window.characterSheetExporter.printSheet(char);
          } else {
            showAppToast('Please select a character first.', 'warning');
          }
        });
        $('exportPdfBtn').addEventListener('click', (e) => {
          e.preventDefault();
          const char = getCurrentCharacter();
          if (char) {
            window.characterSheetExporter.exportToPDF(char);
          } else {
            showAppToast('Please select a character first.', 'warning');
          }
        });
        $('exportPngBtn').addEventListener('click', (e) => {
          e.preventDefault();
          const char = getCurrentCharacter();
          if (char) {
            window.characterSheetExporter.exportToPNG(char);
          } else {
            showAppToast('Please select a character first.', 'warning');
          }
        });
        $('exportWordBtn').addEventListener('click', (e) => {
          e.preventDefault();
          const char = getCurrentCharacter();
          if (char) {
            window.characterSheetExporter.exportToWord(char);
          } else {
            showAppToast('Please select a character first.', 'warning');
          }
        });
      }

      function wireSpellSlotEvents() {
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
      }

      function wireAutoCalcEvents() {
        // Auto-calc: an ability score or level edit changes every save and skill bonus, and through them the passive scores.
        // Skills go first so passive Perception (in recalcDerivedFromForm) reads the fresh Perception bonus.
        [
          'statStr','statDex','statCon','statInt','statWis','statCha',
          'charLevel'
        ].forEach(id => {
          const el = $(id);
          if (el) {
            el.addEventListener('input', () => {
              recalcSavesFromForm(false);
              recalcSkillsFromForm(false);
              recalcDerivedFromForm();
              recalcPassivesFromForm();
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

        // Jack of All Trades toggle recalcs all skill bonuses
        const joatEl = $('skillJoAT');
        if (joatEl) {
          joatEl.addEventListener('change', () => {
            recalcSkillsFromForm(false);
            recalcPassivesFromForm();
          });
        }
      }

      function wireRestAndResourceEvents() {
        // Rest buttons
        const shortRestBtn = $('shortRestBtn');
        const longRestBtn = $('longRestBtn');
        if (shortRestBtn) {
          shortRestBtn.addEventListener('click', handleShortRest);
        }
        if (longRestBtn) {
          longRestBtn.addEventListener('click', handleLongRest);
        }

        // Add Resource button
        const addResourceBtn = $('addResourceBtn');
        if (addResourceBtn) {
          addResourceBtn.addEventListener('click', () => addResourceRow());
        }

        // Remove resource row (event delegation on container)
        const resourcesList = $('resourcesList');
        if (resourcesList) {
          resourcesList.addEventListener('click', e => {
            if (e.target.closest('.res-remove')) {
              e.target.closest('.resource-row').remove();
            }
          });
        }
      }

      function wireHitDiceModalEvents() {
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

        // A mixed pool spends from one die size at a time: choosing another size changes how many are available
        const hdDieSizeSelect = $('hdDieSize');
        if (hdDieSizeSelect) {
          hdDieSizeSelect.addEventListener('change', () => {
            if (!hitDiceModalData) return;
            const size = parseInt(hdDieSizeSelect.value, 10);
            const available = HitDice.countOf(hitDiceModalData.pool, size);
            hitDiceModalData.dieSize = size;
            hitDiceModalData.availableCount = available;
            const input = $('hdSpendCount');
            input.max = available;
            input.value = Math.min(Math.max(parseInt(input.value, 10) || 1, 1), available);
          });
        }

        if (hdApplyBtn) {
          hdApplyBtn.addEventListener('click', applyHitDiceHealing);
        }
      }

      function wireSpellEvents() {
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
        const customSpellRitualInput = $('customSpellRitualInput');
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

            // Ritual cast button — no slot consumed, +10 min casting time
            const ritualBtn = e.target.closest('.spell-ritual-btn');
            if (ritualBtn) {
              e.preventDefault();
              const spellIndex = parseInt(ritualBtn.dataset.spellIndex, 10);
              const spellName = ritualBtn.dataset.spellName;
              const spell = currentSpellList[spellIndex];
              if (spell?.concentration && isConcentrating()) {
                const current = window.currentConcentrationSpell || 'another spell';
                if (!confirm(`You are concentrating on ${current}.\n\nCasting ${spellName} as a ritual will end your concentration.\n\nContinue?`)) return;
              }
              if (spell?.concentration && typeof window.setConcentration === 'function') {
                window.setConcentration(true, spellName);
              }
              const feedbackEl = document.querySelector(`.spell-cast-feedback[data-spell-index="${spellIndex}"]`);
              if (feedbackEl) {
                feedbackEl.innerHTML = `<span class="badge bg-info bg-opacity-75"><i class="bi bi-hourglass-split me-1"></i>Ritual cast started (10 min) — no slot used</span>`;
                setTimeout(() => { feedbackEl.innerHTML = ''; }, 4000);
              }
              showRollToast('Ritual Cast', spellName, 'No slot used · +10 min');
              return;
            }

            // Roll spell dice button
            const rollBtn = e.target.closest('.spell-roll-btn');
            if (rollBtn) {
              e.preventDefault();
              const spellIndex = parseInt(rollBtn.dataset.spellIndex, 10);
              if (typeof window.rollSpellDice === 'function') window.rollSpellDice(spellIndex);
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
            ritual: !!(customSpellRitualInput && customSpellRitualInput.checked),
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
          if (customSpellRitualInput) customSpellRitualInput.checked = false;
          if (customSpellClassesInput) customSpellClassesInput.value = '';
          if (customSpellTagsInput) customSpellTagsInput.value = '';
          if (customSpellBodyInput) customSpellBodyInput.value = '';
        }
        if (saveCustomSpellBtn) {
          saveCustomSpellBtn.addEventListener('click', () => {
            const spell = buildCustomSpellFromForm();
            if (!spell) {
              showAppToast('Custom spell needs at least a name.', 'warning');
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
      }

      function wireAttackEvents() {
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
      }

      function wireInventoryEvents() {
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

        // Update encumbrance when coin weight toggle or currency amounts change
        const coinWeightToggleEl = $('includeCoinWeight');
        if (coinWeightToggleEl) {
          coinWeightToggleEl.addEventListener('change', updateEncumbrance);
        }
        ['currencyCP', 'currencySP', 'currencyEP', 'currencyGP', 'currencyPP'].forEach(id => {
          const el = $(id);
          if (el) el.addEventListener('input', () => {
            if ($('includeCoinWeight')?.checked) updateEncumbrance();
          });
        });
      }

      function wireNotesEvents() {
        // Notes category switcher
        const notesCatSelect = $('notesCategorySelect');
        if (notesCatSelect) {
          notesCatSelect.addEventListener('change', () => {
            // Save current category's content before switching
            currentCategorizedNotes[currentNotesCategory] = $('charExtraNotes').value;
            showNotesCategory(notesCatSelect.value);
            try { localStorage.setItem(NOTES_CATEGORY_KEY, currentNotesCategory); } catch (e) { /* preference only */ }
          });
        }
      }

      function wireExhaustionAndHpBarEvents() {
        // Exhaustion description
        const exhaustionInput = $('exhaustionLevel');
        if (exhaustionInput) {
          exhaustionInput.addEventListener('input', updateExhaustionDescription);
        }

        // HP bar — update live as HP fields change
        [$('charCurrentHP'), $('charMaxHP')].forEach(el => {
          if (el) el.addEventListener('input', updateHPBar);
        });
      }

      function initConditionTooltips() {
        // Bootstrap tooltips on condition buttons
        if (window.bootstrap?.Tooltip) {
          document.querySelectorAll('.condition-btn[data-bs-toggle="tooltip"]').forEach(el => {
            new window.bootstrap.Tooltip(el, { trigger: 'hover focus' });
          });
        }
      }

      function wireHpAdjustEvents() {
        // HP adjust amount input: Enter key triggers Heal
        const hpAdjEl = $('hpAdjustAmount');
        if (hpAdjEl) {
          hpAdjEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); adjustHP('heal'); }
          });
        }
      }

      function wireConditionAndConcentrationEvents() {
        // Condition toggles
        const conditionToggles = document.querySelectorAll('.condition-btn');
        conditionToggles.forEach(btn => {
          btn.addEventListener('click', e => {
            e.preventDefault();

            // Concentrating has special prompt-based flow — route through setConcentration()
            if (btn.dataset.condition === 'Concentrating') {
              const turningOn = !btn.classList.contains('active');
              if (turningOn) {
                const existing = $('charConcentrationSpell')?.value || '';
                const spellName = window.prompt('Concentrating on which spell?', existing);
                if (spellName === null) return; // user cancelled
                setConcentration(true, spellName.trim() || null);
              } else {
                setConcentration(false);
              }
              return; // setConcentration() handles sync + save
            }

            btn.classList.toggle('active');
            syncConditionsToField();
            saveCurrentCharacter();
          });
        });

        // Sync concentration spell input changes to global state and tooltip
        const concSpellInput = $('charConcentrationSpell');
        if (concSpellInput) {
          concSpellInput.addEventListener('input', () => {
            const spellName = concSpellInput.value.trim() || null;
            window.currentConcentrationSpell = spellName;
            const concBtn = document.querySelector('.condition-btn[data-condition="Concentrating"]');
            if (concBtn) {
              concBtn.title = spellName ? `Concentrating on: ${spellName}` : CONC_TOOLTIP;
            }
            document.dispatchEvent(new CustomEvent('concentrationChanged', {
              detail: { active: concBtn?.classList.contains('active') || false, spellName }
            }));
          });
        }

        // charConcentrating checkbox ↔ Concentrating condition button two-way sync
        const concCheckbox = $('charConcentrating');
        if (concCheckbox) {
          concCheckbox.addEventListener('change', () => {
            const spellName = $('charConcentrationSpell')?.value.trim() || null;
            if (concCheckbox.checked) {
              const entered = window.prompt('Concentrating on which spell?', spellName || '');
              if (entered === null) { concCheckbox.checked = false; return; } // cancelled
              setConcentration(true, entered.trim() || null);
            } else {
              setConcentration(false);
            }
          });
        }

        // Sync conditions field back to toggles when manually edited
        const conditionsField = $('charConditions');
        if (conditionsField) {
          conditionsField.addEventListener('blur', syncConditionsFromField);
        }
      }

      function wireSpellcastingStatEvents() {
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
      }

      function wireRollAndActionEvents() {
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
      }

      function wireExpertiseEvents() {
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
      }

      function wireXpEvents() {
        // ---- XP UI events ----
        const xpDisplay = $('xpDisplay');
        if (xpDisplay) {
          xpDisplay.addEventListener('click', () => {
            const character = getCurrentCharacter();
            const lvl = parseInt($('charLevel')?.value) || 1;
            const xp  = character?.xp || 0;
            const next = lvl < 20 ? getXPForLevel(lvl + 1) : null;

            const cur      = $('xpModalCurrent');
            const nextLbl  = $('xpModalNextLabel');
            const amtInput = $('xpAdjustAmount');
            if (cur)     cur.textContent    = xp.toLocaleString();
            if (nextLbl) nextLbl.textContent = next
              ? `${(next - xp).toLocaleString()} more XP needed for level ${lvl + 1}`
              : 'Maximum level reached';
            if (amtInput) { amtInput.value = ''; }

            const modal = new bootstrap.Modal($('xpAdjustModal'));
            modal.show();
            // Focus the input after the modal animation finishes
            $('xpAdjustModal').addEventListener('shown.bs.modal', () => {
              if (amtInput) amtInput.focus();
            }, { once: true });
          });
        }

        const xpAddBtn = $('xpAddBtn');
        if (xpAddBtn) {
          xpAddBtn.addEventListener('click', () => {
            const amount = parseInt($('xpAdjustAmount')?.value) || 0;
            if (amount > 0) {
              adjustXP(amount);
              bootstrap.Modal.getInstance($('xpAdjustModal'))?.hide();
            }
          });
        }

        const xpSubtractBtn = $('xpSubtractBtn');
        if (xpSubtractBtn) {
          xpSubtractBtn.addEventListener('click', () => {
            const amount = parseInt($('xpAdjustAmount')?.value) || 0;
            if (amount > 0) {
              adjustXP(-amount);
              bootstrap.Modal.getInstance($('xpAdjustModal'))?.hide();
            }
          });
        }

        const xpLevelUpBadge = $('xpLevelUpBadge');
        if (xpLevelUpBadge) {
          xpLevelUpBadge.addEventListener('click', () => {
            const character = getCurrentCharacter();
            if (character && window.LevelUpSystem && window.LevelUpSystem.startLevelUp) {
              window.LevelUpSystem.startLevelUp(character);
            }
          });
        }

        const manualLevelUpBtn = $('manualLevelUpBtn');
        if (manualLevelUpBtn) {
          manualLevelUpBtn.addEventListener('click', () => {
            const character = getCurrentCharacter();
            if (character && window.LevelUpSystem && window.LevelUpSystem.startLevelUp) {
              window.LevelUpSystem.startLevelUp(character);
            }
          });
        }

        // Re-render XP bar when level is manually changed
        const charLevelEl = $('charLevel');
        if (charLevelEl) {
          charLevelEl.addEventListener('change', () => {
            const character = getCurrentCharacter();
            updateXPDisplay(character?.xp || 0, parseInt(charLevelEl.value) || 1);
          });
        }
      }

      function wireAutosaveEvents() {
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

      // Listener order is behaviour: several blocks bind document-level click and capture handlers, and one
      // runs an immediate recalculation. Don't reorder or dedupe these calls unless a block is shown to be
      // independent of the ones before it.
      // What the portrait and send-to modules need from the sheet.
      const portraitHost = { getCurrentCharacter, saveCharactersToStorage, showAppToast };
      const sendToHost = { getCurrentCharacter, saveCurrentCharacter, showAppToast };

      function attachEventHandlers() {
        wireCharacterSelectionEvents();
        wireNewCharacterFlowEvents();
        wireImportExportEvents();
        wireDirtyTrackingEvents();
        wireSheetExportEvents();
        wirePortraitControlEvents(portraitHost);
        wireSpellSlotEvents();
        wireAutoCalcEvents();
        wireRestAndResourceEvents();
        wireHitDiceModalEvents();
        wirePortraitEditorEvents(portraitHost);
        wireSendToEvents(sendToHost);
        wireTokenPreviewEvents(sendToHost);
        wireSpellEvents();
        wireAttackEvents();
        wireInventoryEvents();
        wireNotesEvents();
        wireExhaustionAndHpBarEvents();
        initConditionTooltips();
        wireHpAdjustEvents();
        wireConditionAndConcentrationEvents();
        wireSpellcastingStatEvents();
        wireRollAndActionEvents();
        wireExpertiseEvents();
        wireXpEvents();
        wireAutosaveEvents();
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
          c.xp = c.xp ?? 0;
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
            currentCharacterId = pickStartupCharacterId(characters);
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
        // Make roll history collapsible on all screen sizes
        const rollHistoryHeader = document.getElementById('rollHistoryHeader');
        const rollHistoryPanel = document.getElementById('rollHistoryPanel');

        if (rollHistoryHeader && rollHistoryPanel) {
          rollHistoryHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking the clear button
            if (e.target.closest('#clearHistoryBtn')) return;
            rollHistoryPanel.classList.toggle('collapsed');
          });

          // Start collapsed on mobile only
          if (window.innerWidth < 768) {
            rollHistoryPanel.classList.add('collapsed');
          }
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
      window.showAppToast = showAppToast;                       // Combat Mode's initiative reminder
      window.syncConditionsToField = syncConditionsToField;     // Combat Mode toggles condition buttons directly
      window.saveCurrentCharacter = saveCurrentCharacter;
      window.persistCurrentCharacter = persistCurrentCharacter;
      window.loadCharacterIntoForm = fillFormFromCharacter;
      window.getInitiativeAdvantageReason = getInitiativeAdvantageReason;
      window.updateSpellSlotsDisplay = updateSpellSlotsDisplay;
      window.getAttackFeatureBonuses    = getAttackFeatureBonuses;
      window.addFlatBonusToNotation     = addFlatBonusToNotation;
      window.getConcentrationAttackBonus = getConcentrationAttackBonus;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  