/**
 * D&D 5e Level-Up System
 * Handles character leveling with class progression, feats, and ability score improvements
 */

const LevelUpSystem = (function() {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ============================================================
  // STATE
  // ============================================================
  let currentCharacter = null;
  let levelUpInProgress = false;

  // ============================================================
  // LEVEL UP FLOW
  // ============================================================

  /**
   * Initiates the level-up process for the current character
   */
  function startLevelUp(character) {
    if (!character) {
      alert('No character loaded. Please select or create a character first.');
      return;
    }

    // Handle both string and number levels, default to 1
    const currentLevel = parseInt(character.level, 10) || 1;
    if (currentLevel >= 20) {
      alert('This character is already at maximum level (20)!');
      return;
    }

    // Try both character.class and character.charClass (the actual property name)
    const className = extractClassName(character.charClass || character.class);
    if (!className) {
      alert('Unable to determine character class. Please ensure the class field is filled out.');
      return;
    }

    const classData = LevelUpData.getClassData(className);
    if (!classData) {
      alert(`Class "${className}" is not currently supported in the level-up system.`);
      return;
    }

    currentCharacter = character;
    levelUpInProgress = true;

    const newLevel = currentLevel + 1;
    const changes = LevelUpData.getLevelUpChanges(className, currentLevel, newLevel);

    showLevelUpModal(character, className, currentLevel, newLevel, classData, changes);
  }

  /**
   * Extract base class name from class field (e.g., "Wizard (Evocation)" -> "Wizard")
   */
  function extractClassName(classString) {
    if (!classString) return null;

    // Remove subclass info in parentheses
    const match = classString.trim().match(/^([^(]+)/);
    if (!match) return null;

    const baseName = match[1].trim();

    // Match against known classes (case-insensitive)
    const knownClasses = LevelUpData.getClassesForLevel(1);
    const found = knownClasses.find(c => c.toLowerCase() === baseName.toLowerCase());

    return found || baseName;
  }

  /**
   * Show the level-up modal with all options
   */
  function showLevelUpModal(character, className, currentLevel, newLevel, classData, changes) {
    const modal = createLevelUpModal(character, className, currentLevel, newLevel, classData, changes);
    document.body.appendChild(modal);

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Clean up when modal is closed
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
      levelUpInProgress = false;
    });
  }

  /**
   * Create the level-up modal element
   */
  function createLevelUpModal(character, className, currentLevel, newLevel, classData, changes) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'levelUpModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('data-bs-backdrop', 'static');
    modal.setAttribute('data-bs-keyboard', 'false');

    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content bg-dark text-light border-secondary">
          <div class="modal-header border-secondary">
            <div>
              <h5 class="modal-title">
                <i class="bi bi-arrow-up-circle me-2"></i>Level Up: ${character.name || 'Character'}
              </h5>
              <small class="text-muted">${className} ${currentLevel} → ${newLevel}</small>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <div class="modal-body">
            ${renderLevelUpSteps(character, className, classData, changes)}
          </div>

          <div class="modal-footer border-secondary justify-content-between">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-success" id="confirmLevelUpBtn">
              <i class="bi bi-check2-circle me-1"></i>Complete Level Up
            </button>
          </div>
        </div>
      </div>
    `;

    // Set up event listeners
    setupLevelUpModalEvents(modal, character, newLevel, classData, changes);

    return modal;
  }

  /**
   * Render all level-up steps (HP, ASI/Feat, Spell Slots, etc.)
   */
  function renderLevelUpSteps(character, className, classData, changes) {
    let html = '<div class="accordion" id="levelUpAccordion">';

    // Step 1: Hit Points
    html += renderHPStep(character, classData, changes, 1);

    // Step 2: Ability Score Improvement / Feat
    if (changes.hasASI) {
      html += renderASIFeatStep(character, 2);
    }

    // Step 3: Spell Slots (if caster)
    if (changes.spellSlots || changes.pactSlots) {
      html += renderSpellSlotsStep(character, classData, changes, changes.hasASI ? 3 : 2);
    }

    // Step 4: New Features
    html += renderFeaturesStep(character, className, changes, changes.hasASI ? 4 : 3);

    // Step 5: Summary
    html += renderSummaryStep(character, className, changes, changes.hasASI ? 5 : 4);

    html += '</div>';
    return html;
  }

  /**
   * Step 1: Hit Point Increase
   */
  function renderHPStep(character, classData, changes, stepNum) {
    const conMod = calculateAbilityModifier(character.stats?.con || 10);
    const avgRoll = Math.floor(classData.hitDie / 2) + 1;

    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: Hit Points</strong>
            <span class="ms-auto me-3 badge bg-primary" id="hpBadge">Not Set</span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse show" data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            <p class="text-muted mb-3">
              Choose how to increase your maximum HP. Your Constitution modifier (+${conMod}) is added automatically.
            </p>

            <div class="row g-3">
              <div class="col-md-6">
                <div class="card bg-secondary bg-opacity-25 border-secondary h-100">
                  <div class="card-body">
                    <h6 class="card-title">
                      <input type="radio" name="hpMethod" value="roll" id="hpMethodRoll" class="form-check-input me-2" />
                      <label for="hpMethodRoll">Roll Hit Die</label>
                    </h6>
                    <p class="text-muted small mb-2">Roll 1d${classData.hitDie} + ${conMod} (CON modifier)</p>
                    <button type="button" class="btn btn-sm btn-outline-warning" id="rollHPBtn" disabled>
                      <i class="bi bi-dice-5 me-1"></i>Roll 1d${classData.hitDie}
                    </button>
                    <div id="hpRollResult" class="mt-2 d-none">
                      <div class="alert alert-info text-light mb-0">
                        <strong>Rolled:</strong> <span id="hpRollValue"></span> + ${conMod} = <strong><span id="hpRollTotal"></span> HP</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="card bg-secondary bg-opacity-25 border-secondary h-100">
                  <div class="card-body">
                    <h6 class="card-title">
                      <input type="radio" name="hpMethod" value="average" id="hpMethodAverage" class="form-check-input me-2" />
                      <label for="hpMethodAverage">Take Average (Recommended)</label>
                    </h6>
                    <p class="text-muted small mb-2">Guaranteed ${avgRoll} + ${conMod} (CON modifier)</p>
                    <div class="alert alert-success text-light mb-0">
                      <strong>Gain:</strong> ${avgRoll + conMod} HP
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <input type="hidden" id="hpGainValue" value="0" />
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step 2: Ability Score Improvement or Feat
   */
  function renderASIFeatStep(character, stepNum) {
    const allFeats = LevelUpData.getAllFeats();

    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: Ability Score Improvement or Feat</strong>
            <span class="ms-auto me-3 badge bg-primary" id="asiBadge">Not Set</span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse" data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            <p class="text-muted mb-3">
              You can increase your ability scores or take a feat. Your ability scores cannot exceed 20.
            </p>

            <div class="mb-3">
              <div class="form-check mb-2">
                <input class="form-check-input" type="radio" name="asiChoice" id="asiChoiceASI" value="asi" />
                <label class="form-check-label fw-bold" for="asiChoiceASI">
                  Ability Score Improvement
                </label>
              </div>

              <div id="asiOptions" class="ms-4 d-none">
                <p class="text-muted small">Increase one score by +2, or two scores by +1 each.</p>

                <div class="row g-2 mb-2">
                  ${renderAbilityScoreSelectors(character)}
                </div>
              </div>
            </div>

            <div class="mb-3">
              <div class="form-check mb-2">
                <input class="form-check-input" type="radio" name="asiChoice" id="asiChoiceFeat" value="feat" />
                <label class="form-check-label fw-bold" for="asiChoiceFeat">
                  Take a Feat
                </label>
              </div>

              <div id="featOptions" class="ms-4 d-none">
                <div class="mb-2">
                  <label for="featSelect" class="form-label small">Choose Feat:</label>
                  <select id="featSelect" class="form-select form-select-sm">
                    <option value="">-- Select a feat --</option>
                    ${allFeats.map(f => `<option value="${f}">${f}</option>`).join('')}
                  </select>
                </div>
                <div id="featDescription" class="alert alert-info text-light small d-none"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render ability score increase selectors
   */
  function renderAbilityScoreSelectors(character) {
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const stats = character.stats || {};

    return abilities.map(ability => {
      const current = stats[ability] || 10;
      const abilityLabel = ability.toUpperCase();

      return `
        <div class="col-6 col-md-4">
          <div class="d-flex align-items-center gap-2">
            <label class="form-label small mb-0 fw-bold" style="min-width: 40px;">${abilityLabel}</label>
            <span class="badge bg-secondary" style="min-width: 30px;">${current}</span>
            <select class="form-select form-select-sm asi-increase" data-ability="${ability}">
              <option value="0">+0</option>
              <option value="1">+1</option>
              <option value="2">+2</option>
            </select>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Step: Spell Slots (for casters)
   */
  function renderSpellSlotsStep(character, classData, changes, stepNum) {
    let slotsInfo = '';

    if (changes.pactSlots) {
      // Warlock pact magic
      const { level, slots } = changes.pactSlots;
      slotsInfo = `
        <div class="alert alert-success text-light">
          <strong>Pact Magic Slots Updated:</strong> ${slots} × Level ${level} spell slots
        </div>
      `;
    } else if (changes.spellSlots) {
      // Regular spell slots
      slotsInfo = '<div class="table-responsive"><table class="table table-sm table-dark"><thead><tr><th>Level</th>';
      for (let i = 1; i <= 9; i++) {
        slotsInfo += `<th class="text-center">${i}</th>`;
      }
      slotsInfo += '</tr></thead><tbody><tr><td>Slots</td>';

      for (let i = 0; i < 9; i++) {
        const slots = changes.spellSlots[i];
        slotsInfo += `<td class="text-center ${slots > 0 ? 'text-success fw-bold' : 'text-muted'}">${slots || '—'}</td>`;
      }
      slotsInfo += '</tr></tbody></table></div>';
    }

    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: Spell Slots</strong>
            <span class="ms-auto me-3 badge bg-success">Auto-Updated</span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse" data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            <p class="text-muted mb-3">Your spell slots are automatically updated for this level.</p>
            ${slotsInfo}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step: New Features
   */
  function renderFeaturesStep(character, className, changes, stepNum) {
    const features = changes.features || [];
    const hasFeatures = features.length > 0;

    let featuresHtml = '';
    if (hasFeatures) {
      featuresHtml = '<ul class="list-unstyled">';
      features.forEach(f => {
        featuresHtml += `<li class="mb-2"><i class="bi bi-star-fill text-warning me-2"></i>${f}</li>`;
      });
      featuresHtml += '</ul>';
    } else {
      featuresHtml = '<p class="text-muted">No new features at this level.</p>';
    }

    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: New Class Features</strong>
            <span class="ms-auto me-3 badge ${hasFeatures ? 'bg-warning' : 'bg-secondary'}">
              ${hasFeatures ? features.length + ' Feature' + (features.length > 1 ? 's' : '') : 'None'}
            </span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse" data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            <p class="text-muted mb-3">
              Review your new ${className} features. Make sure to update your character notes with details.
            </p>
            ${featuresHtml}
            ${hasFeatures ? '<p class="text-muted small mt-3"><em>Remember to update your Features & Traits tab with the details of these new abilities.</em></p>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step: Summary
   */
  function renderSummaryStep(character, className, changes, stepNum) {
    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: Review & Confirm</strong>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse" data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            <div id="levelUpSummary" class="alert alert-secondary">
              <p class="mb-2"><strong>Please complete all steps above before confirming.</strong></p>
              <ul id="summaryList" class="mb-0">
                <li class="text-muted">Complete HP selection</li>
                ${changes.hasASI ? '<li class="text-muted">Complete ASI/Feat selection</li>' : ''}
              </ul>
            </div>
            <p class="text-muted small">
              Once you confirm, your character will be updated to level ${changes.level}.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Set up event listeners for the level-up modal
   */
  function setupLevelUpModalEvents(modal, character, newLevel, classData, changes) {
    // HP Selection
    const hpMethodRadios = modal.querySelectorAll('input[name="hpMethod"]');
    const rollHPBtn = modal.querySelector('#rollHPBtn');
    const hpRollResult = modal.querySelector('#hpRollResult');
    const hpRollValue = modal.querySelector('#hpRollValue');
    const hpRollTotal = modal.querySelector('#hpRollTotal');
    const hpGainValue = modal.querySelector('#hpGainValue');
    const hpBadge = modal.querySelector('#hpBadge');

    const conMod = calculateAbilityModifier(character.stats?.con || 10);
    const avgRoll = Math.floor(classData.hitDie / 2) + 1;

    hpMethodRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'roll') {
          rollHPBtn.disabled = false;
          hpRollResult.classList.add('d-none');
          hpGainValue.value = '0';
          hpBadge.textContent = 'Roll Required';
          hpBadge.className = 'ms-auto me-3 badge bg-warning';
        } else if (e.target.value === 'average') {
          rollHPBtn.disabled = true;
          hpRollResult.classList.add('d-none');
          const gain = avgRoll + conMod;
          hpGainValue.value = gain;
          hpBadge.textContent = `+${gain} HP`;
          hpBadge.className = 'ms-auto me-3 badge bg-success';
          updateSummary(modal, changes);
        }
      });
    });

    rollHPBtn.addEventListener('click', () => {
      const roll = Math.floor(Math.random() * classData.hitDie) + 1;
      const total = roll + conMod;
      hpRollValue.textContent = roll;
      hpRollTotal.textContent = total;
      hpRollResult.classList.remove('d-none');
      hpGainValue.value = total;
      hpBadge.textContent = `+${total} HP`;
      hpBadge.className = 'ms-auto me-3 badge bg-success';
      updateSummary(modal, changes);
    });

    // ASI/Feat Selection
    if (changes.hasASI) {
      const asiChoiceRadios = modal.querySelectorAll('input[name="asiChoice"]');
      const asiOptions = modal.querySelector('#asiOptions');
      const featOptions = modal.querySelector('#featOptions');
      const featSelect = modal.querySelector('#featSelect');
      const featDescription = modal.querySelector('#featDescription');
      const asiBadge = modal.querySelector('#asiBadge');
      const asiIncreaseSelects = modal.querySelectorAll('.asi-increase');

      asiChoiceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          if (e.target.value === 'asi') {
            asiOptions.classList.remove('d-none');
            featOptions.classList.add('d-none');
            asiBadge.textContent = 'Configure ASI';
            asiBadge.className = 'ms-auto me-3 badge bg-warning';
          } else if (e.target.value === 'feat') {
            asiOptions.classList.add('d-none');
            featOptions.classList.remove('d-none');
            asiBadge.textContent = 'Select Feat';
            asiBadge.className = 'ms-auto me-3 badge bg-warning';
          }
          updateSummary(modal, changes);
        });
      });

      asiIncreaseSelects.forEach(select => {
        select.addEventListener('change', () => {
          const total = Array.from(asiIncreaseSelects).reduce((sum, s) => sum + parseInt(s.value || 0, 10), 0);
          if (total > 2) {
            alert('You can only increase ability scores by a total of +2 (either one score by +2, or two scores by +1 each).');
            select.value = '0';
            return;
          }

          if (total === 2) {
            asiBadge.textContent = 'ASI Selected';
            asiBadge.className = 'ms-auto me-3 badge bg-success';
          } else {
            asiBadge.textContent = 'Configure ASI';
            asiBadge.className = 'ms-auto me-3 badge bg-warning';
          }
          updateSummary(modal, changes);
        });
      });

      featSelect.addEventListener('change', (e) => {
        const featName = e.target.value;
        if (featName) {
          const feat = LevelUpData.getFeatData(featName);
          if (feat) {
            featDescription.innerHTML = `<strong>${feat.name}</strong><p class="mb-0 mt-1">${feat.description}</p>`;
            featDescription.classList.remove('d-none');
            asiBadge.textContent = featName;
            asiBadge.className = 'ms-auto me-3 badge bg-success';
          }
        } else {
          featDescription.classList.add('d-none');
          asiBadge.textContent = 'Select Feat';
          asiBadge.className = 'ms-auto me-3 badge bg-warning';
        }
        updateSummary(modal, changes);
      });
    }

    // Confirm Level Up
    const confirmBtn = modal.querySelector('#confirmLevelUpBtn');
    confirmBtn.addEventListener('click', () => {
      const levelUpData = gatherLevelUpData(modal, character, newLevel, classData, changes);
      if (levelUpData) {
        applyLevelUp(levelUpData);
        bootstrap.Modal.getInstance(modal).hide();
      }
    });
  }

  /**
   * Update the summary section as user makes choices
   */
  function updateSummary(modal, changes) {
    const summaryList = modal.querySelector('#summaryList');
    const confirmBtn = modal.querySelector('#confirmLevelUpBtn');

    const hpSet = parseInt(modal.querySelector('#hpGainValue').value || '0', 10) > 0;
    let asiSet = true;

    if (changes.hasASI) {
      const asiChoice = modal.querySelector('input[name="asiChoice"]:checked');
      if (!asiChoice) {
        asiSet = false;
      } else if (asiChoice.value === 'asi') {
        const total = Array.from(modal.querySelectorAll('.asi-increase')).reduce((sum, s) => sum + parseInt(s.value || 0, 10), 0);
        asiSet = total === 2;
      } else if (asiChoice.value === 'feat') {
        asiSet = !!modal.querySelector('#featSelect').value;
      }
    }

    const allComplete = hpSet && asiSet;

    let html = '';
    if (hpSet) {
      html += `<li class="text-success"><i class="bi bi-check-circle-fill me-1"></i>HP increase selected</li>`;
    } else {
      html += `<li class="text-muted">Complete HP selection</li>`;
    }

    if (changes.hasASI) {
      if (asiSet) {
        html += `<li class="text-success"><i class="bi bi-check-circle-fill me-1"></i>ASI/Feat selected</li>`;
      } else {
        html += `<li class="text-muted">Complete ASI/Feat selection</li>`;
      }
    }

    if (allComplete) {
      html += `<li class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Ready to level up!</li>`;
      confirmBtn.disabled = false;
    } else {
      confirmBtn.disabled = true;
    }

    summaryList.innerHTML = html;
  }

  /**
   * Gather all level-up data from the modal
   */
  function gatherLevelUpData(modal, character, newLevel, classData, changes) {
    const data = {
      newLevel,
      hpGain: parseInt(modal.querySelector('#hpGainValue').value || '0', 10),
      proficiencyBonus: changes.proficiencyBonus,
      features: changes.features || [],
      spellSlots: changes.spellSlots || null,
      pactSlots: changes.pactSlots || null,
      asi: null,
      feat: null
    };

    if (data.hpGain <= 0) {
      alert('Please select a method for increasing HP.');
      return null;
    }

    if (changes.hasASI) {
      const asiChoice = modal.querySelector('input[name="asiChoice"]:checked');
      if (!asiChoice) {
        alert('Please choose between Ability Score Improvement or a Feat.');
        return null;
      }

      if (asiChoice.value === 'asi') {
        const increases = {};
        let total = 0;
        modal.querySelectorAll('.asi-increase').forEach(select => {
          const ability = select.dataset.ability;
          const amount = parseInt(select.value || 0, 10);
          if (amount > 0) {
            increases[ability] = amount;
            total += amount;
          }
        });

        if (total !== 2) {
          alert('Ability score improvements must total exactly +2.');
          return null;
        }

        data.asi = increases;
      } else if (asiChoice.value === 'feat') {
        const featName = modal.querySelector('#featSelect').value;
        if (!featName) {
          alert('Please select a feat.');
          return null;
        }
        data.feat = featName;
      }
    }

    return data;
  }

  /**
   * Apply the level-up changes to the character
   */
  function applyLevelUp(levelUpData) {
    // Get the current character from the form to ensure we're working with the latest data
    const character = window.getCurrentCharacter ? window.getCurrentCharacter() : currentCharacter;

    if (!character) {
      alert('Error: No character loaded.');
      return;
    }

    // Update level
    character.level = levelUpData.newLevel;

    // Update HP
    const currentMaxHP = parseInt(character.maxHP, 10) || 0;
    const currentHP = parseInt(character.currentHP, 10) || currentMaxHP;
    character.maxHP = currentMaxHP + levelUpData.hpGain;

    // Also increase current HP by the same amount gained
    character.currentHP = currentHP + levelUpData.hpGain;

    // Update proficiency bonus (stored for display purposes)
    character.proficiencyBonus = levelUpData.proficiencyBonus;

    // Apply ASI
    if (levelUpData.asi) {
      character.stats = character.stats || {};
      for (const [ability, amount] of Object.entries(levelUpData.asi)) {
        const current = character.stats[ability] || 10;
        character.stats[ability] = Math.min(20, current + amount);
      }
    }

    // Apply Feat
    if (levelUpData.feat) {
      character.feats = character.feats || [];
      character.feats.push(levelUpData.feat);

      // Handle feat bonuses (e.g., ability increases from feats)
      const featData = LevelUpData.getFeatData(levelUpData.feat);
      if (featData && featData.abilityIncrease) {
        character.stats = character.stats || {};
        const { choice, amount } = featData.abilityIncrease;
        // For simplicity, apply to first available choice
        // In a full implementation, you'd prompt the user
        if (choice && choice.length > 0) {
          const ability = choice[0];
          const current = character.stats[ability] || 10;
          character.stats[ability] = Math.min(20, current + amount);
        }
      }
    }

    // Update spell slots
    if (levelUpData.spellSlots) {
      character.spellSlots = character.spellSlots || {};
      for (let i = 1; i <= 9; i++) {
        character.spellSlots[`slots${i}Max`] = levelUpData.spellSlots[i - 1] || 0;
      }
    }

    // Update pact slots
    if (levelUpData.pactSlots) {
      character.pactLevel = levelUpData.pactSlots.level;
      character.pactMax = levelUpData.pactSlots.slots;
    }

    // Add features to notes (optional)
    if (levelUpData.features.length > 0) {
      const featuresText = `\n\n=== Level ${levelUpData.newLevel} Features ===\n${levelUpData.features.join('\n')}`;
      character.features = (character.features || '') + featuresText;
    }

    // CRITICAL: Load the modified character into the form FIRST, then save
    // This ensures the form has the updated data before we save
    if (window.loadCharacterIntoForm) {
      window.loadCharacterIntoForm(character);
    }

    // Now save the character (which reads from the form)
    if (window.saveCurrentCharacter) {
      window.saveCurrentCharacter();
    }

    // Show success message
    showLevelUpSuccess(character, levelUpData);
  }

  /**
   * Show success message after level up
   */
  function showLevelUpSuccess(character, levelUpData) {
    const message = `
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        <h5 class="alert-heading">
          <i class="bi bi-check-circle-fill me-2"></i>Level Up Complete!
        </h5>
        <p class="mb-1"><strong>${character.name || 'Character'}</strong> is now level ${levelUpData.newLevel}!</p>
        <ul class="mb-0">
          <li>Max HP: +${levelUpData.hpGain}</li>
          ${levelUpData.asi ? '<li>Ability scores increased</li>' : ''}
          ${levelUpData.feat ? `<li>Gained feat: ${levelUpData.feat}</li>` : ''}
          ${levelUpData.features.length > 0 ? `<li>${levelUpData.features.length} new feature(s) gained</li>` : ''}
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;

    const container = document.querySelector('.container.backdrop');
    if (container) {
      const alertDiv = document.createElement('div');
      alertDiv.innerHTML = message;
      container.insertBefore(alertDiv.firstElementChild, container.firstChild);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        const alert = container.querySelector('.alert-success');
        if (alert) {
          bootstrap.Alert.getInstance(alert)?.close();
        }
      }, 10000);
    }
  }

  /**
   * Calculate ability modifier from score
   */
  function calculateAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    startLevelUp,

    // For integration with character.js
    init() {
      // Add level-up button to character manager if needed
      addLevelUpButton();
    }
  };

  /**
   * Add a Level Up button to the character manager UI
   */
  function addLevelUpButton() {
    const saveCharacterBtn = document.getElementById('saveCharacterBtn');
    if (!saveCharacterBtn) return;

    const btnGroup = saveCharacterBtn.closest('.btn-group');
    if (!btnGroup) return;

    // Check if button already exists
    if (document.getElementById('levelUpCharacterBtn')) return;

    const levelUpBtn = document.createElement('button');
    levelUpBtn.type = 'button';
    levelUpBtn.className = 'btn btn-sm btn-outline-warning';
    levelUpBtn.id = 'levelUpCharacterBtn';
    levelUpBtn.innerHTML = '<i class="bi bi-arrow-up-circle me-1"></i>Level Up';
    levelUpBtn.title = 'Level up this character';

    btnGroup.appendChild(levelUpBtn);

    levelUpBtn.addEventListener('click', () => {
      // Get current character from character.js
      if (window.getCurrentCharacter) {
        const character = window.getCurrentCharacter();
        LevelUpSystem.startLevelUp(character);
      } else {
        alert('Character system not ready. Please refresh the page.');
      }
    });
  }

})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LevelUpSystem.init());
} else {
  LevelUpSystem.init();
}
