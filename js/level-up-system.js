/**
 * D&D 5e Level-Up System
 * Handles character leveling with class progression, feats, and ability score improvements
 */

const LevelUpSystem = (function() {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Generate tooltip content for a spell
   * @param {Object} spell - The spell object
   * @returns {string} - HTML tooltip content
   */
  function getSpellTooltipContent(spell) {
    const lines = [];
    if (spell.casting_time) lines.push(`<strong>Casting Time:</strong> ${spell.casting_time}`);
    if (spell.range) lines.push(`<strong>Range:</strong> ${spell.range}`);
    if (spell.components) lines.push(`<strong>Components:</strong> ${spell.components}`);
    if (spell.duration) lines.push(`<strong>Duration:</strong> ${spell.duration}${spell.concentration ? ' (C)' : ''}`);
    if (spell.body) {
      lines.push(`<hr class="my-1">${spell.body}`);
    }
    return lines.join('<br>');
  }

  /**
   * Escape HTML for use in attributes
   * @param {string} str - String to escape
   * @returns {string} - Escaped string
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Build a deduped snapshot of the character's known spells.
   * Combines saved data with any unsaved edits currently in the form.
   */
  function getKnownSpellsSnapshot(character) {
    const seen = new Set();
    const snapshot = [];
    const sources = [];

    if (Array.isArray(character?.spellList)) {
      sources.push(character.spellList);
    }
    if (Array.isArray(window.currentSpellList)) {
      sources.push(window.currentSpellList);
    }

    const normalizeSpell = (spell) => {
      if (!spell) return null;
      if (typeof spell === 'string') {
        return { name: spell, title: spell };
      }
      if (typeof spell === 'object') {
        const name = (spell.name || spell.title || '').trim();
        if (!name) return null;
        return Object.assign({}, spell, {
          name,
          title: spell.title || spell.name || name
        });
      }
      return null;
    };

    sources.forEach(list => {
      list.forEach(rawSpell => {
        const spell = normalizeSpell(rawSpell);
        if (!spell) return;
        const key = spell.name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        snapshot.push(spell);
      });
    });

    return snapshot;
  }

  // ============================================================
  // SELECTABLE FEATURE DETECTION
  // ============================================================

  /**
   * Mapping of feature keywords to their data sources and storage keys
   * Used to detect when a feature requires user selection during level-up
   */
  const SELECTABLE_FEATURES = {
    'Fighting Style': {
      type: 'fightingStyle',
      dataGetter: (className) => {
        const allStyles = LevelUpData.getAllFightingStyles ? LevelUpData.getAllFightingStyles() : [];
        // Filter by class
        return allStyles.filter(name => {
          const data = LevelUpData.getFightingStyleData ? LevelUpData.getFightingStyleData(name) : null;
          return data && (!data.classes || data.classes.includes(className));
        });
      },
      dataFetcher: (name) => LevelUpData.getFightingStyleData ? LevelUpData.getFightingStyleData(name) : null,
      storageKey: 'fightingStyles',
      singular: true,
      getExisting: (char) => char.fightingStyles || []
    },
    'Pact Boon': {
      type: 'pactBoon',
      dataGetter: () => LevelUpData.getAllPactBoons ? LevelUpData.getAllPactBoons() : [],
      dataFetcher: (name) => LevelUpData.getPactBoonData ? LevelUpData.getPactBoonData(name) : null,
      storageKey: 'pactBoon',
      singular: true,
      getExisting: (char) => char.pactBoon ? [char.pactBoon] : []
    },
    'Eldritch Invocation': {
      type: 'eldritchInvocation',
      dataGetter: (className, character) => {
        // Use getAvailableInvocationsForLevel if it exists, otherwise get all
        if (LevelUpData.getAvailableInvocationsForLevel) {
          const level = parseInt(character?.level, 10) || 1;
          const pactBoon = character?.pactBoon || null;
          const hasEldritchBlast = (character?.spellList || []).some(s =>
            (s.name || s.title || '').toLowerCase() === 'eldritch blast'
          );
          return LevelUpData.getAvailableInvocationsForLevel(level + 1, pactBoon, hasEldritchBlast);
        }
        return LevelUpData.getAllEldritchInvocations ? LevelUpData.getAllEldritchInvocations() : [];
      },
      dataFetcher: (name) => LevelUpData.getEldritchInvocationData ? LevelUpData.getEldritchInvocationData(name) : null,
      storageKey: 'eldritchInvocations',
      singular: false,
      getExisting: (char) => char.eldritchInvocations || []
    },
    'Metamagic': {
      type: 'metamagic',
      dataGetter: () => LevelUpData.getAllMetamagic ? LevelUpData.getAllMetamagic() : [],
      dataFetcher: (name) => LevelUpData.getMetamagicData ? LevelUpData.getMetamagicData(name) : null,
      storageKey: 'metamagic',
      singular: false,
      getExisting: (char) => char.metamagic || []
    }
  };

  /**
   * Parse a feature name to determine if it requires selection
   * @param {string} featureName - The feature name from CLASS_DATA
   * @returns {Object|null} - Selection info or null if not selectable
   */
  function parseSelectableFeature(featureName) {
    if (!featureName) return null;

    // Check for exact matches first
    for (const [keyword, config] of Object.entries(SELECTABLE_FEATURES)) {
      if (featureName === keyword) {
        return { ...config, count: 1, originalName: featureName };
      }
    }

    // Check for patterns like "Eldritch Invocations (2)" or "Metamagic (2 options)"
    const countMatch = featureName.match(/^(.+?)\s*\((\d+)(?:\s*options?)?\)$/i);
    if (countMatch) {
      const baseName = countMatch[1].trim();
      const count = parseInt(countMatch[2], 10);

      for (const [keyword, config] of Object.entries(SELECTABLE_FEATURES)) {
        // Match "Eldritch Invocations" to "Eldritch Invocation"
        if (baseName === keyword || baseName === keyword + 's' ||
            baseName.replace(/s$/, '') === keyword) {
          return { ...config, count, originalName: featureName };
        }
      }
    }

    // Check for "Additional Fighting Style"
    if (featureName.includes('Additional Fighting Style')) {
      return { ...SELECTABLE_FEATURES['Fighting Style'], count: 1, originalName: featureName };
    }

    return null;
  }

  /**
   * Calculate ability modifier from a score
   */
  function calculateAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
  }

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

    character.spellList = getKnownSpellsSnapshot(character);

    currentCharacter = character;
    levelUpInProgress = true;

    const newLevel = currentLevel + 1;
    const changes = LevelUpData.getLevelUpChanges(className, currentLevel, newLevel, character);

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
   * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
   */
  function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  /**
   * Filter spells for level-up based on class, level, and search criteria
   */
  function filterSpellsForLevelUp(className, maxSpellLevel, searchTerm, levelFilter, knownSpells) {
    if (!window.SPELLS_DATA) return [];

    return window.SPELLS_DATA
      .filter(spell => {
        // Class match
        if (!spell.classes || !spell.classes.includes(className)) return false;

        // Level restriction
        if (spell.level > maxSpellLevel) return false;

        // Not already known
        const spellName = (spell.title || spell.name || '').toLowerCase();
        if (knownSpells.some(s => {
          const knownName = (s.name || s.title || '').toLowerCase();
          return knownName === spellName;
        })) return false;

        // Level filter
        if (levelFilter !== 'all' && spell.level !== parseInt(levelFilter, 10)) return false;

        // Search term
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = spell.title.toLowerCase().includes(term);
          const matchSchool = (spell.school || '').toLowerCase().includes(term);
          const matchTags = (spell.tags || []).some(t => t.toLowerCase().includes(term));
          if (!matchName && !matchSchool && !matchTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by level, then alphabetically
        if (a.level !== b.level) return a.level - b.level;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 50); // Limit display to 50 results
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
    let stepNum = 1;

    // Check if subclass selection is needed
    const currentLevel = parseInt(character.level, 10) || 1;
    const newLevel = currentLevel + 1;

    // Step: Multiclass Choice (optional)
    html += renderMulticlassChoiceStep(character, className, stepNum++);

    const needsSubclass = LevelUpData.needsSubclassSelection(
      className,
      currentLevel,
      newLevel,
      !!character.subclass
    );

    // Step: Subclass Selection (if needed)
    if (needsSubclass) {
      html += renderSubclassStep(character, className, stepNum++);
    }

    // Step: Hit Points
    html += renderHPStep(character, classData, changes, stepNum++);

    // Step: Racial Feature (if applicable)
    const racialFeature = LevelUpData.getRacialFeature(character.race, newLevel);
    if (racialFeature) {
      html += renderRacialFeatureStep(character, racialFeature, newLevel, stepNum++);
    }

    // Step: Spell Learning (if applicable)
    const spellRules = LevelUpData.getSpellLearningRules(className, newLevel);
    if (spellRules) {
      html += renderSpellLearningStep(character, spellRules, stepNum++);
    }

    // Step: Ability Score Improvement / Feat
    if (changes.hasASI) {
      html += renderASIFeatStep(character, stepNum++);
    }

    // Step: Spell Slots (if caster)
    if (changes.spellSlots || changes.pactSlots) {
      html += renderSpellSlotsStep(character, classData, changes, stepNum++);
    }

    // Step: New Features
    html += renderFeaturesStep(character, className, changes, stepNum++);

    // Step: Summary
    html += renderSummaryStep(character, className, changes, stepNum);

    html += '</div>';
    return html;
  }

  /**
   * Step: Multiclass Choice (always shown)
   */
  function renderMulticlassChoiceStep(character, className, stepNum) {
    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button bg-dark text-light" type="button"
                  data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: Choose Level-Up Path</strong>
            <span class="ms-auto me-3 badge bg-info" id="multiclassPathBadge">Continue ${className}</span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse show"
             data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            <p class="text-muted mb-3">
              <i class="bi bi-info-circle me-1"></i>
              Choose whether to level up in your current class or multiclass into a new one.
            </p>

            <div class="list-group">
              <label class="list-group-item list-group-item-action bg-dark border-secondary cursor-pointer">
                <div class="d-flex align-items-start gap-2">
                  <input type="radio" name="multiclassPath" value="continue" checked
                         class="form-check-input mt-1 multiclass-path-radio" />
                  <div class="flex-grow-1">
                    <h6 class="mb-1"><i class="bi bi-arrow-up me-1"></i>Continue as ${className}</h6>
                    <p class="mb-0 small text-muted">Level up normally in your current class</p>
                  </div>
                </div>
              </label>

              <label class="list-group-item list-group-item-action bg-dark border-secondary cursor-pointer">
                <div class="d-flex align-items-start gap-2">
                  <input type="radio" name="multiclassPath" value="multiclass"
                         class="form-check-input mt-1 multiclass-path-radio" />
                  <div class="flex-grow-1">
                    <h6 class="mb-1"><i class="bi bi-diagram-3 me-1"></i>Multiclass into a New Class</h6>
                    <p class="mb-0 small text-muted">Take your first level in a different class (requires meeting prerequisites)</p>
                  </div>
                </div>
              </label>
            </div>

            <div id="multiclassClassSelection" class="mt-3 d-none">
              <label class="form-label">Select New Class:</label>
              <select class="form-select" id="multiclassNewClass">
                <option value="">Choose a class...</option>
                <option value="Artificer">Artificer</option>
                <option value="Barbarian">Barbarian</option>
                <option value="Bard">Bard</option>
                <option value="Cleric">Cleric</option>
                <option value="Druid">Druid</option>
                <option value="Fighter">Fighter</option>
                <option value="Monk">Monk</option>
                <option value="Paladin">Paladin</option>
                <option value="Ranger">Ranger</option>
                <option value="Rogue">Rogue</option>
                <option value="Sorcerer">Sorcerer</option>
                <option value="Warlock">Warlock</option>
                <option value="Wizard">Wizard</option>
              </select>
              <div id="multiclassPrereqWarning" class="alert alert-warning mt-2 d-none">
                <i class="bi bi-exclamation-triangle me-1"></i>
                <strong>Prerequisites not met:</strong>
                <span id="multiclassPrereqText"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step: Subclass Selection (if applicable)
   */
  function renderSubclassStep(character, className, stepNum) {
    const subclassData = LevelUpData.getSubclassData(className);
    if (!subclassData) return '';

    // Filter subclass options by SRD allowlist
    const allOptions = Object.keys(subclassData.options);
    const filter = window.SRDContentFilter;
    const options = filter
      ? allOptions.filter(optionName => filter.isAllowed('subclass', `${className}:${optionName}`))
      : allOptions;
    const hasHiddenOptions = options.length < allOptions.length;

    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button bg-dark text-light" type="button"
                  data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: Choose ${subclassData.name}</strong>
            <span class="ms-auto me-3 badge bg-warning text-dark" id="subclassBadge">Not Selected</span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse show"
             data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            <p class="text-muted mb-3">
              <i class="bi bi-info-circle me-1"></i>
              Choose your <strong>${subclassData.name}</strong>. This choice is permanent and defines
              your character's path going forward.
            </p>

            ${hasHiddenOptions ? `
              <div class="alert alert-info py-2 mb-3">
                <i class="bi bi-info-circle me-2"></i>
                <small>Additional ${subclassData.name.toLowerCase()} options are available via content packs.</small>
              </div>
            ` : ''}

            <div class="list-group">
              ${options.map(optionName => {
                const option = subclassData.options[optionName];
                return `
                  <label class="list-group-item list-group-item-action bg-dark border-secondary cursor-pointer">
                    <div class="d-flex align-items-start gap-2">
                      <input type="radio" name="subclassChoice" value="${optionName}"
                             class="form-check-input mt-1 subclass-radio" />
                      <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold text-primary">${option.name}</h6>
                        <p class="mb-2 small text-light">${option.description}</p>
                        <details class="small">
                          <summary class="text-info fw-semibold" style="cursor: pointer;">
                            <i class="bi bi-list-ul me-1"></i>View Features by Level
                          </summary>
                          <ul class="mt-2 mb-0 ps-3">
                            ${Object.entries(option.features).map(([level, features]) =>
                              `<li class="text-muted"><strong class="text-light">Level ${level}:</strong> ${features.join(', ')}</li>`
                            ).join('')}
                          </ul>
                        </details>
                      </div>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step: Racial Feature (if applicable)
   */
  function renderRacialFeatureStep(character, racialFeature, newLevel, stepNum) {
    const hasOptions = racialFeature.options && racialFeature.options.length > 0;

    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button bg-dark text-light" type="button"
                  data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: ${racialFeature.name}</strong>
            <span class="ms-auto me-3 badge ${hasOptions ? 'bg-warning text-dark' : 'bg-success'}" id="racialFeatureBadge">
              ${hasOptions ? 'Choice Required' : 'Gained'}
            </span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse show"
             data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            <div class="alert alert-info">
              <i class="bi bi-star-fill me-1"></i>
              <strong>Racial Feature Unlocked at Level ${newLevel}!</strong>
            </div>

            <p class="text-light mb-3">${racialFeature.description}</p>

            ${hasOptions ? `
              <h6 class="text-warning mb-3">
                <i class="bi bi-hand-index me-1"></i>Choose Your Option:
              </h6>
              <div class="list-group">
                ${racialFeature.options.map(option => `
                  <label class="list-group-item list-group-item-action bg-dark border-secondary cursor-pointer">
                    <div class="d-flex align-items-start gap-2">
                      <input type="radio" name="racialFeatureChoice" value="${option.name}"
                             class="form-check-input mt-1 racial-feature-radio" />
                      <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold text-primary">${option.name}</h6>
                        <p class="mb-0 small text-light">${option.description}</p>
                      </div>
                    </div>
                  </label>
                `).join('')}
              </div>
            ` : `
              <div class="alert alert-success">
                <i class="bi bi-check-circle me-1"></i>
                This feature is automatically added to your character. Make sure to note it on your character sheet!
              </div>
            `}

            ${racialFeature.note ? `
              <div class="alert alert-warning mt-3">
                <i class="bi bi-exclamation-triangle me-1"></i>
                <strong>Note:</strong> ${racialFeature.note}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step: Spell Learning (if applicable)
   */
  function renderSpellLearningStep(character, spellRules, stepNum) {
    const { type, isPreparedCaster, newSpells, preparationFormula, canSwap, maxSpellLevel, className } = spellRules;

    const spellsToSelect = newSpells; // Already calculated in getSpellLearningRules
    const actionVerb = isPreparedCaster ? 'Prepare' : 'Learn';
    const actionNoun = isPreparedCaster ? 'Preparation' : 'Learning';

    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button bg-dark text-light" type="button"
                  data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: ${actionVerb} Spells</strong>
            <span class="ms-auto me-3 badge bg-warning text-dark" id="spellBadge">Not Selected</span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse show"
             data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            ${isPreparedCaster ? `
              <div class="alert alert-info mb-3">
                <i class="bi bi-info-circle me-1"></i>
                <strong>Prepared Caster:</strong> You have access to the full ${className} spell list!
                You can change your prepared spells after each long rest.
              </div>
            ` : ''}

            <p class="text-muted mb-3">
              <i class="bi bi-book me-1"></i>
              ${isPreparedCaster
                ? `Prepare <strong>${spellsToSelect}</strong> ${className} spell${spellsToSelect > 1 ? 's' : ''} of level <strong>${maxSpellLevel}</strong> or lower.`
                : `Select <strong>${spellsToSelect}</strong> new ${className} spell${spellsToSelect > 1 ? 's' : ''} of level <strong>${maxSpellLevel}</strong> or lower.`
              }
            </p>

            <!-- Filter and Search -->
            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label small">Filter by Spell Level:</label>
                <div class="btn-group btn-group-sm w-100" role="group">
                  <button type="button" class="btn btn-outline-light spell-level-filter" data-filter-level="0">
                    Cantrips
                  </button>
                  ${Array.from({length: maxSpellLevel}, (_, i) => i + 1).map(level => `
                    <button type="button" class="btn btn-outline-light spell-level-filter" data-filter-level="${level}">
                      ${level}${getOrdinalSuffix(level)}
                    </button>
                  `).join('')}
                  <button type="button" class="btn btn-outline-light spell-level-filter active" data-filter-level="all">
                    All
                  </button>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label small">Search Spells:</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text"><i class="bi bi-search"></i></span>
                  <input type="text" id="levelUpSpellSearch" class="form-control"
                         placeholder="Search by name, school, or tag..." />
                </div>
              </div>
            </div>

            <!-- Available Spells List -->
            <div class="mb-3">
              <label class="form-label small">Available Spells:</label>
              <div id="availableSpellsList" class="list-group" style="max-height: 300px; overflow-y: auto;">
                <div class="text-center text-muted py-3">
                  <i class="bi bi-hourglass-split"></i> Loading spells...
                </div>
              </div>
            </div>

            <!-- Selected Spells Display -->
            <div class="alert alert-info mb-0">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <strong><i class="bi bi-check2-square me-1"></i>${isPreparedCaster ? 'Prepared' : 'Selected'} Spells:</strong>
                <span class="badge bg-primary" id="selectedSpellCount">0/${spellsToSelect}</span>
              </div>
              <div id="selectedSpellsList" class="d-flex flex-wrap gap-2">
                <span class="text-muted small">No spells ${isPreparedCaster ? 'prepared' : 'selected'} yet</span>
              </div>
            </div>

            ${canSwap && !isPreparedCaster ? `
              <!-- Optional: Spell Swapping Section -->
              <div class="mt-3 border-top border-secondary pt-3">
                <label class="form-label small">
                  <i class="bi bi-arrow-left-right me-1"></i>
                  Optional: Replace a Known Spell
                </label>
                <select id="spellToSwap" class="form-select form-select-sm">
                  <option value="">-- Don't swap any spell --</option>
                </select>
                <div id="swapReplacementSection" class="mt-2 d-none">
                  <small class="text-muted">Choose a replacement spell:</small>
                  <div id="swapSpellsList" class="list-group mt-2" style="max-height: 200px; overflow-y: auto;">
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Step: Hit Point Increase
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
                  <label class="form-label small">Choose Feat:</label>
                  <div class="input-group input-group-sm mb-2">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" id="featSearch" class="form-control form-control-sm" placeholder="Search feats...">
                  </div>
                  <div id="featList" style="max-height: 200px; overflow-y: auto; border: 1px solid #495057; border-radius: 0.25rem; padding: 0.5rem;">
                    <!-- Feats will be loaded here -->
                  </div>
                  <div class="mt-2">
                    <strong class="small">Selected:</strong> <span id="selectedFeatBadge" class="badge bg-secondary">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the feat list for the level-up ASI step
   */
  function renderLevelUpFeatList(modal, searchTerm = '', selectedFeat = null) {
    const listEl = modal.querySelector('#featList');
    if (!listEl) return;

    const allFeats = LevelUpData.getAllFeats();
    let filteredFeats = allFeats;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredFeats = allFeats.filter(featName => {
        const featData = LevelUpData.getFeatData(featName);
        return featName.toLowerCase().includes(term) ||
               (featData && featData.description && featData.description.toLowerCase().includes(term));
      });
    }

    // Dispose existing tooltips before re-rendering to prevent memory leaks
    listEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
      const tooltip = bootstrap.Tooltip.getInstance(el);
      if (tooltip) tooltip.dispose();
    });

    listEl.innerHTML = filteredFeats.map(featName => {
      const featData = LevelUpData.getFeatData(featName);
      const isSelected = selectedFeat === featName;
      const description = featData?.description || '';
      const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;

      // Escape HTML for tooltip (use proper escapeHtml function like spell tooltips)
      const tooltipContent = escapeHtml(description);

      // Build prerequisites display
      let prereqHtml = '';
      if (featData?.prerequisites) {
        const prereqs = Object.entries(featData.prerequisites)
          .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
          .join(', ');
        prereqHtml = `<small class="text-warning d-block">Prereq: ${prereqs}</small>`;
      }

      return `
        <div class="form-check d-flex align-items-start mb-1 ${isSelected ? 'bg-primary bg-opacity-25 rounded p-1' : ''}">
          <input class="form-check-input feat-radio" type="radio"
                 name="levelUpFeat"
                 id="levelup-feat-${featName.replace(/[^a-zA-Z0-9]/g, '')}"
                 data-feat-name="${featName}"
                 ${isSelected ? 'checked' : ''}>
          <label class="form-check-label small flex-grow-1 ms-1" for="levelup-feat-${featName.replace(/[^a-zA-Z0-9]/g, '')}">
            <strong>${featName}</strong>
            ${prereqHtml}
            <small class="text-muted d-block">${shortDesc}</small>
          </label>
          <i class="bi bi-question-circle text-info ms-2 feat-info-icon"
             data-bs-toggle="tooltip"
             data-bs-placement="left"
             data-bs-html="true"
             title="${tooltipContent}"
             style="cursor: help; font-size: 0.85rem; flex-shrink: 0;"></i>
        </div>
      `;
    }).join('');

    // Initialize tooltips
    listEl.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
      new bootstrap.Tooltip(el, { trigger: 'hover focus', html: true });
    });

    return listEl;
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
    const currentLevel = parseInt(character.level, 10) || 1;
    const newLevel = parseInt(changes.level, 10) || (currentLevel + 1);

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
      const previousSlots = Array.from({ length: 9 }, (_, i) => {
        return character.spellSlots?.[i + 1]?.max ?? 0;
      });
      const newSlots = Array.from({ length: 9 }, (_, i) => changes.spellSlots[i] || 0);

      slotsInfo = `
        <p class="text-muted small mb-1">Columns show spell slot level (1-9).</p>
        <div class="table-responsive">
          <table class="table table-sm table-dark align-middle text-center">
            <thead>
              <tr>
                <th scope="col" class="text-start">Spell Level</th>
                ${Array.from({ length: 9 }, (_, i) => `<th scope="col">${i + 1}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" class="text-start">Before (Level ${currentLevel})</th>
                ${previousSlots.map(value => `<td>${value > 0 ? value : '—'}</td>`).join('')}
              </tr>
              <tr>
                <th scope="row" class="text-start">After (Level ${newLevel})</th>
                ${newSlots.map(value => `<td class="${value > 0 ? 'text-success fw-bold' : 'text-muted'}">${value > 0 ? value : '—'}</td>`).join('')}
              </tr>
              <tr>
                <th scope="row" class="text-start">Change</th>
                ${newSlots.map((value, idx) => {
                  const diff = value - (previousSlots[idx] || 0);
                  if (diff > 0) {
                    return `<td class="text-success">+${diff}</td>`;
                  }
                  if (diff < 0) {
                    return `<td class="text-danger">${diff}</td>`;
                  }
                  return '<td class="text-muted">—</td>';
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      `;
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
   * Now includes interactive selection for features that require choices
   */
  function renderFeaturesStep(character, className, changes, stepNum) {
    const features = changes.features || [];
    const hasFeatures = features.length > 0;

    // Separate static features from selectable ones
    const staticFeatures = [];
    const selectableFeatures = [];

    features.forEach(f => {
      const selectable = parseSelectableFeature(f);
      if (selectable) {
        selectableFeatures.push({ name: f, ...selectable });
      } else {
        staticFeatures.push(f);
      }
    });

    // Track if any selections are required
    const hasSelections = selectableFeatures.length > 0;

    // Build static features HTML
    let staticFeaturesHtml = '';
    if (staticFeatures.length > 0) {
      staticFeaturesHtml = '<div class="mb-3"><h6 class="text-info mb-2">Auto-Granted Features:</h6><ul class="list-unstyled">';
      staticFeatures.forEach(f => {
        staticFeaturesHtml += `<li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i>${f}</li>`;
      });
      staticFeaturesHtml += '</ul></div>';
    }

    // Build selectable features HTML
    let selectableFeaturesHtml = '';
    if (selectableFeatures.length > 0) {
      selectableFeatures.forEach(selectable => {
        selectableFeaturesHtml += renderFeatureSelectionUI(selectable, character, className);
      });
    }

    // Determine badge state
    let badgeClass = 'bg-secondary';
    let badgeText = 'None';
    if (hasFeatures) {
      if (hasSelections) {
        badgeClass = 'bg-warning text-dark';
        badgeText = 'Choices Required';
      } else {
        badgeClass = 'bg-success';
        badgeText = features.length + ' Feature' + (features.length > 1 ? 's' : '');
      }
    }

    return `
      <div class="accordion-item bg-dark border-secondary">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#step${stepNum}">
            <strong>Step ${stepNum}: New Class Features</strong>
            <span class="ms-auto me-3 badge ${badgeClass}" id="featuresBadge">
              ${badgeText}
            </span>
          </button>
        </h2>
        <div id="step${stepNum}" class="accordion-collapse collapse" data-bs-parent="#levelUpAccordion">
          <div class="accordion-body">
            ${hasFeatures ? `
              <p class="text-muted mb-3">
                ${hasSelections ? 'Make your selections below for features that require choices.' : `Review your new ${className} features.`}
              </p>
              ${staticFeaturesHtml}
              ${selectableFeaturesHtml}
            ` : '<p class="text-muted">No new features at this level.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render selection UI for a selectable feature
   * @param {Object} selectable - The selectable feature config from parseSelectableFeature
   * @param {Object} character - The character object
   * @param {string} className - The class name
   * @returns {string} - HTML for the selection UI
   */
  function renderFeatureSelectionUI(selectable, character, className) {
    const { type, dataGetter, dataFetcher, storageKey, singular, count, originalName, getExisting } = selectable;

    // Get available options
    let options = [];
    try {
      options = dataGetter(className, character) || [];
    } catch (e) {
      console.warn(`Could not get options for ${type}:`, e);
    }

    // Get already selected options to exclude
    const existing = getExisting(character);

    // Filter by SRD if filter is active
    const filter = window.SRDContentFilter;
    const filteredOptions = options.filter(optionName => {
      // Exclude already selected
      if (existing.includes(optionName)) return false;

      // Check SRD filter
      if (filter) {
        const data = dataFetcher(optionName);
        if (data && data.srd === false && !filter.isAllowed(type, optionName)) {
          return false;
        }
      }
      return true;
    });

    // Build option items
    const optionItems = filteredOptions.map(optionName => {
      const data = dataFetcher(optionName);
      if (!data) return '';

      const isHomebrew = data.srd === false;
      const prereqText = data.prerequisites ? `<small class="text-warning d-block">Prerequisite: ${data.prerequisites}</small>` : '';
      const costText = data.cost ? `<small class="text-info d-block">Cost: ${data.cost}</small>` : '';
      const homebrewBadge = isHomebrew ? '<span class="badge bg-purple ms-2">Homebrew</span>' : '';
      const inputType = singular ? 'radio' : 'checkbox';
      const inputName = `feature-${type}`;
      const inputId = `feature-${type}-${optionName.replace(/[^a-zA-Z0-9]/g, '')}`;

      return `
        <label class="list-group-item list-group-item-action bg-dark border-secondary cursor-pointer">
          <div class="d-flex align-items-start gap-2">
            <input type="${inputType}" name="${inputName}" value="${escapeHtml(optionName)}"
                   class="form-check-input mt-1 feature-selection-input"
                   data-feature-type="${type}"
                   data-storage-key="${storageKey}"
                   data-singular="${singular}"
                   data-max-count="${count}"
                   id="${inputId}" />
            <div class="flex-grow-1">
              <h6 class="mb-1 fw-bold text-primary">${data.name}${homebrewBadge}</h6>
              ${prereqText}
              ${costText}
              <p class="mb-0 small text-light">${data.description}</p>
            </div>
          </div>
        </label>
      `;
    }).join('');

    // Show message if no options available
    const noOptionsMessage = filteredOptions.length === 0
      ? '<div class="alert alert-info py-2"><i class="bi bi-info-circle me-2"></i>No additional options available (already selected or filtered by content settings).</div>'
      : '';

    // Already selected display
    let existingHtml = '';
    if (existing.length > 0) {
      existingHtml = `
        <div class="mb-2">
          <small class="text-muted">Already selected:</small>
          <div class="d-flex flex-wrap gap-1 mt-1">
            ${existing.map(name => `<span class="badge bg-secondary">${name}</span>`).join('')}
          </div>
        </div>
      `;
    }

    const selectionLabel = singular
      ? 'Choose one option:'
      : `Choose ${count} option${count > 1 ? 's' : ''}:`;

    return `
      <div class="feature-selection-section mb-4" data-feature-type="${type}">
        <h6 class="text-warning mb-2">
          <i class="bi bi-hand-index me-1"></i>${originalName}
        </h6>
        ${existingHtml}
        <p class="text-muted small mb-2">${selectionLabel}</p>
        ${noOptionsMessage}
        <div class="list-group feature-options-list" data-feature-type="${type}" data-max-count="${count}">
          ${optionItems}
        </div>
        <div class="mt-2">
          <small class="text-muted">Selected:</small>
          <span class="badge bg-secondary feature-selection-badge" data-feature-type="${type}">None</span>
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
    // Multiclass Path Selection
    const multiclassPathRadios = modal.querySelectorAll('.multiclass-path-radio');
    const multiclassSelection = modal.querySelector('#multiclassClassSelection');
    const multiclassNewClassSelect = modal.querySelector('#multiclassNewClass');
    const multiclassPrereqWarning = modal.querySelector('#multiclassPrereqWarning');
    const multiclassPrereqText = modal.querySelector('#multiclassPrereqText');
    const multiclassPathBadge = modal.querySelector('#multiclassPathBadge');

    multiclassPathRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'multiclass') {
          multiclassSelection.classList.remove('d-none');
          if (multiclassPathBadge) {
            multiclassPathBadge.textContent = 'Multiclass';
            multiclassPathBadge.className = 'ms-auto me-3 badge bg-warning';
          }
        } else {
          multiclassSelection.classList.add('d-none');
          multiclassPrereqWarning.classList.add('d-none');
          if (multiclassPathBadge) {
            multiclassPathBadge.textContent = `Continue ${extractClassName(character.charClass)}`;
            multiclassPathBadge.className = 'ms-auto me-3 badge bg-info';
          }
        }
      });
    });

    if (multiclassNewClassSelect) {
      multiclassNewClassSelect.addEventListener('change', (e) => {
        const newClass = e.target.value;
        if (!newClass) return;

        // Check prerequisites
        const abilityScores = {
          str: parseInt(character.stats?.str, 10) || 10,
          dex: parseInt(character.stats?.dex, 10) || 10,
          con: parseInt(character.stats?.con, 10) || 10,
          int: parseInt(character.stats?.int, 10) || 10,
          wis: parseInt(character.stats?.wis, 10) || 10,
          cha: parseInt(character.stats?.cha, 10) || 10
        };

        const result = LevelUpData.checkMulticlassPrerequisites(newClass, abilityScores);
        if (!result.meetsRequirements) {
          multiclassPrereqWarning.classList.remove('d-none');
          multiclassPrereqText.textContent = `Requires ${result.missing.join(', ')}`;
        } else {
          multiclassPrereqWarning.classList.add('d-none');
        }

        if (multiclassPathBadge) {
          multiclassPathBadge.textContent = `Multiclass: ${newClass}`;
          multiclassPathBadge.className = 'ms-auto me-3 badge bg-success';
        }
      });
    }

    // Subclass Selection
    const subclassRadios = modal.querySelectorAll('.subclass-radio');
    const subclassBadge = modal.querySelector('#subclassBadge');

    if (subclassRadios.length > 0) {
      subclassRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          const selectedSubclass = e.target.value;
          if (subclassBadge) {
            subclassBadge.textContent = selectedSubclass;
            subclassBadge.className = 'ms-auto me-3 badge bg-success';
          }
          updateSummary(modal, changes);
        });
      });
    }

    // Racial Feature Selection
    const racialFeatureRadios = modal.querySelectorAll('.racial-feature-radio');
    const racialFeatureBadge = modal.querySelector('#racialFeatureBadge');

    if (racialFeatureRadios.length > 0) {
      racialFeatureRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          const selectedOption = e.target.value;
          if (racialFeatureBadge) {
            racialFeatureBadge.textContent = selectedOption;
            racialFeatureBadge.className = 'ms-auto me-3 badge bg-success';
          }
          updateSummary(modal, changes);
        });
      });
    }

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
      const featSearch = modal.querySelector('#featSearch');
      const featList = modal.querySelector('#featList');
      const selectedFeatBadge = modal.querySelector('#selectedFeatBadge');
      const asiBadge = modal.querySelector('#asiBadge');
      const asiIncreaseSelects = modal.querySelectorAll('.asi-increase');

      // Track selected feat
      let currentSelectedFeat = null;

      // Initial render of feat list
      renderLevelUpFeatList(modal, '', null);

      // Set up feat radio button listeners
      function setupFeatRadioListeners() {
        const featRadios = modal.querySelectorAll('.feat-radio');
        featRadios.forEach(radio => {
          radio.addEventListener('change', (e) => {
            const featName = e.target.dataset.featName;
            currentSelectedFeat = featName;

            // Update badge displays
            if (selectedFeatBadge) {
              selectedFeatBadge.textContent = featName;
              selectedFeatBadge.className = 'badge bg-success';
            }
            asiBadge.textContent = featName;
            asiBadge.className = 'ms-auto me-3 badge bg-success';

            // Re-render to show selection highlight
            renderLevelUpFeatList(modal, featSearch?.value || '', featName);
            setupFeatRadioListeners(); // Re-attach listeners after re-render

            updateSummary(modal, changes);
          });
        });
      }

      setupFeatRadioListeners();

      // Feat search listener
      if (featSearch) {
        featSearch.addEventListener('input', (e) => {
          renderLevelUpFeatList(modal, e.target.value, currentSelectedFeat);
          setupFeatRadioListeners();
        });
      }

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
            if (currentSelectedFeat) {
              asiBadge.textContent = currentSelectedFeat;
              asiBadge.className = 'ms-auto me-3 badge bg-success';
            } else {
              asiBadge.textContent = 'Select Feat';
              asiBadge.className = 'ms-auto me-3 badge bg-warning';
            }
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
    }

    // Spell Learning Event Handlers
    const spellBadge = modal.querySelector('#spellBadge');
    const availableSpellsList = modal.querySelector('#availableSpellsList');
    const selectedSpellsList = modal.querySelector('#selectedSpellsList');
    const selectedSpellCount = modal.querySelector('#selectedSpellCount');
    const spellSearch = modal.querySelector('#levelUpSpellSearch');
    const spellLevelFilters = modal.querySelectorAll('.spell-level-filter');
    const spellToSwap = modal.querySelector('#spellToSwap');

    console.log('Spell Learning Setup:', {
      availableSpellsList: !!availableSpellsList,
      spellRules: changes.spellRules,
      spellsDataAvailable: !!window.SPELLS_DATA,
      spellsDataLength: window.SPELLS_DATA ? window.SPELLS_DATA.length : 0
    });

    if (availableSpellsList && changes.spellRules) {
      const spellState = {
        selectedSpells: [],
        currentFilter: 'all',
        searchTerm: '',
        swapOldSpell: null,
        swapNewSpell: null
      };

      // Populate swap dropdown with current spells
      if (spellToSwap && character.spellList && character.spellList.length > 0) {
        character.spellList.forEach(spell => {
          const option = document.createElement('option');
          option.value = spell.name || spell.title || '';
          option.textContent = spell.name || spell.title || '';
          spellToSwap.appendChild(option);
        });
      }

      // Render available spells
      function renderAvailableSpells() {
        // Check if SPELLS_DATA is loaded
        if (!window.SPELLS_DATA || !Array.isArray(window.SPELLS_DATA)) {
          availableSpellsList.innerHTML = `
            <div class="text-center text-danger py-3">
              <i class="bi bi-exclamation-triangle"></i> Error: Spell database not loaded.
              <br><small>Ensure <code>/data/srd/spells-data.js</code> loads before using level-up.</small>
            </div>
          `;
          console.error('SPELLS_DATA not available:', window.SPELLS_DATA);
          return;
        }

        const knownSpells = character.spellList || [];
        const filteredSpells = filterSpellsForLevelUp(
          changes.spellRules.className,
          changes.spellRules.maxSpellLevel,
          spellState.searchTerm,
          spellState.currentFilter,
          knownSpells
        );

        if (filteredSpells.length === 0) {
          availableSpellsList.innerHTML = `
            <div class="text-center text-muted py-3">
              <i class="bi bi-exclamation-circle"></i> No spells found matching your criteria.
              <br><small>Class: ${changes.spellRules.className}, Max Level: ${changes.spellRules.maxSpellLevel}, Filter: ${spellState.currentFilter}</small>
            </div>
          `;
          console.log('No spells found:', {
            className: changes.spellRules.className,
            maxSpellLevel: changes.spellRules.maxSpellLevel,
            filter: spellState.currentFilter,
            searchTerm: spellState.searchTerm,
            totalSpells: window.SPELLS_DATA.length
          });
          return;
        }

        availableSpellsList.innerHTML = filteredSpells.map(spell => {
          const isSelected = spellState.selectedSpells.some(s => s.title === spell.title);
          const tooltipContent = escapeHtml(getSpellTooltipContent(spell));
          return `
            <div class="list-group-item ${isSelected ? 'active' : ''} p-0">
              <div class="d-flex align-items-stretch">
                <button type="button"
                        class="flex-grow-1 btn btn-link text-start text-decoration-none p-2 ${isSelected ? 'text-white' : 'text-body'}"
                        data-spell-name="${spell.title}"
                        data-spell-level="${spell.level}"
                        style="border: none;">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>${spell.title}</strong>
                      <small class="${isSelected ? 'text-white-50' : 'text-muted'} ms-2">${spell.school}</small>
                    </div>
                    <span class="badge ${isSelected ? 'bg-light text-dark' : 'bg-primary'}">
                      ${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
                    </span>
                  </div>
                  ${spell.concentration ? `<small class="${isSelected ? 'text-warning-emphasis' : 'text-warning'}"><i class="bi bi-circle-fill"></i> Concentration</small>` : ''}
                </button>
                <span class="d-flex align-items-center px-2 ${isSelected ? 'bg-primary' : 'bg-dark bg-opacity-25'}"
                      data-bs-toggle="tooltip"
                      data-bs-placement="left"
                      data-bs-html="true"
                      title="${tooltipContent}"
                      style="cursor: help;">
                  <i class="bi bi-question-circle ${isSelected ? 'text-white-50' : 'text-secondary'}" style="opacity: 0.7;"></i>
                </span>
              </div>
            </div>
          `;
        }).join('');

        // Initialize tooltips for spell info icons
        availableSpellsList.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
          new bootstrap.Tooltip(el, { trigger: 'hover focus', html: true });
        });

        // Add click handlers to spell buttons
        availableSpellsList.querySelectorAll('[data-spell-name]').forEach(btn => {
          btn.addEventListener('click', () => {
            const spellName = btn.dataset.spellName;
            const spell = filteredSpells.find(s => s.title === spellName);
            if (!spell) return;

            const isSelected = spellState.selectedSpells.some(s => s.title === spell.title);
            if (isSelected) {
              // Deselect
              spellState.selectedSpells = spellState.selectedSpells.filter(s => s.title !== spell.title);
            } else {
              // Select
              if (spellState.selectedSpells.length < changes.spellRules.newSpells) {
                spellState.selectedSpells.push(spell);
              } else {
                alert(`You can only select ${changes.spellRules.newSpells} spell${changes.spellRules.newSpells > 1 ? 's' : ''}.`);
                return;
              }
            }
            renderAvailableSpells();
            updateSelectedSpellsDisplay();
          });
        });
      }

      // Update selected spells display
      function updateSelectedSpellsDisplay() {
        const count = spellState.selectedSpells.length;
        const max = changes.spellRules.newSpells;

        selectedSpellCount.textContent = `${count}/${max}`;

        if (count === 0) {
          selectedSpellsList.innerHTML = '<span class="text-muted small">No spells selected yet</span>';
          spellBadge.textContent = 'Not Selected';
          spellBadge.className = 'ms-auto me-3 badge bg-warning text-dark';
        } else {
          selectedSpellsList.innerHTML = spellState.selectedSpells.map(spell => `
            <span class="badge bg-primary">
              ${spell.title}
              <button type="button" class="btn-close btn-close-white btn-sm ms-1"
                      data-remove-spell="${spell.title}"
                      style="font-size: 0.5rem; padding: 0.15rem;"></button>
            </span>
          `).join('');

          // Add remove handlers
          selectedSpellsList.querySelectorAll('[data-remove-spell]').forEach(btn => {
            btn.addEventListener('click', () => {
              const spellName = btn.dataset.removeSpell;
              spellState.selectedSpells = spellState.selectedSpells.filter(s => s.title !== spellName);
              renderAvailableSpells();
              updateSelectedSpellsDisplay();
            });
          });

          if (count === max) {
            spellBadge.textContent = `${count} Selected`;
            spellBadge.className = 'ms-auto me-3 badge bg-success';
          } else {
            spellBadge.textContent = `${count}/${max} Selected`;
            spellBadge.className = 'ms-auto me-3 badge bg-warning text-dark';
          }
        }

        updateSummary(modal, changes);
      }

      // Level filter buttons
      if (spellLevelFilters) {
        spellLevelFilters.forEach(btn => {
          btn.addEventListener('click', () => {
            spellLevelFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            spellState.currentFilter = btn.dataset.filterLevel;
            renderAvailableSpells();
          });
        });
      }

      // Search input
      if (spellSearch) {
        spellSearch.addEventListener('input', (e) => {
          spellState.searchTerm = e.target.value.trim();
          renderAvailableSpells();
        });
      }

      // Spell swapping
      if (spellToSwap && changes.spellRules.canSwap) {
        const swapReplacementSection = modal.querySelector('#swapReplacementSection');
        const swapSpellsList = modal.querySelector('#swapSpellsList');

        spellToSwap.addEventListener('change', (e) => {
          spellState.swapOldSpell = e.target.value || null;

          if (spellState.swapOldSpell) {
            swapReplacementSection.classList.remove('d-none');

            // Show spell selection for replacement
            const knownSpells = character.spellList || [];
            const replacementSpells = filterSpellsForLevelUp(
              changes.spellRules.className,
              changes.spellRules.maxSpellLevel,
              '',
              'all',
              knownSpells
            );

            swapSpellsList.innerHTML = replacementSpells.slice(0, 20).map(spell => `
              <button type="button"
                      class="list-group-item list-group-item-action ${spellState.swapNewSpell === spell.title ? 'active' : ''}"
                      data-swap-spell="${spell.title}">
                <strong>${spell.title}</strong>
                <span class="badge bg-primary ms-2">
                  ${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
                </span>
              </button>
            `).join('');

            // Add swap spell handlers
            swapSpellsList.querySelectorAll('[data-swap-spell]').forEach(btn => {
              btn.addEventListener('click', () => {
                spellState.swapNewSpell = btn.dataset.swapSpell;
                swapSpellsList.querySelectorAll('[data-swap-spell]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateSummary(modal, changes);
              });
            });
          } else {
            swapReplacementSection.classList.add('d-none');
            spellState.swapNewSpell = null;
            updateSummary(modal, changes);
          }
        });
      }

      // Store spell state in changes object for later retrieval
      changes.spellState = spellState;

      // Initial render
      renderAvailableSpells();
    }

    // Feature Selection Event Handlers (Fighting Style, Metamagic, etc.)
    setupFeatureSelectionHandlers(modal, character, changes);

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
   * Set up event handlers for feature selection UI (Fighting Style, Metamagic, etc.)
   * @param {Element} modal - The modal element
   * @param {Object} character - The character object
   * @param {Object} changes - The level-up changes object
   */
  function setupFeatureSelectionHandlers(modal, character, changes) {
    // Initialize feature selections state
    changes.featureSelections = changes.featureSelections || {};

    // Find all feature selection inputs
    const featureInputs = modal.querySelectorAll('.feature-selection-input');
    if (featureInputs.length === 0) return;

    featureInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const featureType = input.dataset.featureType;
        const storageKey = input.dataset.storageKey;
        const singular = input.dataset.singular === 'true';
        const maxCount = parseInt(input.dataset.maxCount, 10) || 1;
        const optionsList = input.closest('.feature-options-list');
        const badge = modal.querySelector(`.feature-selection-badge[data-feature-type="${featureType}"]`);
        const featuresBadge = modal.querySelector('#featuresBadge');

        // Initialize storage for this feature type
        if (!changes.featureSelections[storageKey]) {
          changes.featureSelections[storageKey] = [];
        }

        if (singular) {
          // Radio button - single selection
          if (input.checked) {
            changes.featureSelections[storageKey] = [input.value];
          }
        } else {
          // Checkbox - multiple selection
          if (input.checked) {
            // Check if we've reached max
            if (changes.featureSelections[storageKey].length >= maxCount) {
              input.checked = false;
              alert(`You can only select ${maxCount} option${maxCount > 1 ? 's' : ''} for this feature.`);
              return;
            }
            changes.featureSelections[storageKey].push(input.value);
          } else {
            // Remove from selection
            changes.featureSelections[storageKey] = changes.featureSelections[storageKey].filter(v => v !== input.value);
          }
        }

        // Update badge for this feature
        if (badge) {
          const selected = changes.featureSelections[storageKey];
          if (selected.length === 0) {
            badge.textContent = 'None';
            badge.className = 'badge bg-secondary feature-selection-badge';
          } else if (singular || selected.length === maxCount) {
            badge.textContent = selected.join(', ');
            badge.className = 'badge bg-success feature-selection-badge';
          } else {
            badge.textContent = `${selected.length}/${maxCount}: ${selected.join(', ')}`;
            badge.className = 'badge bg-warning text-dark feature-selection-badge';
          }
          badge.dataset.featureType = featureType;
        }

        // Update main features badge
        updateFeaturesBadgeState(modal, changes);

        // Update summary
        updateSummary(modal, changes);
      });
    });
  }

  /**
   * Update the main features badge based on all feature selection states
   */
  function updateFeaturesBadgeState(modal, changes) {
    const featuresBadge = modal.querySelector('#featuresBadge');
    if (!featuresBadge) return;

    // Check all feature selection sections
    const sections = modal.querySelectorAll('.feature-selection-section');
    let allComplete = true;
    let anyStarted = false;

    sections.forEach(section => {
      const featureType = section.dataset.featureType;
      const optionsList = section.querySelector('.feature-options-list');
      if (!optionsList) return;

      const maxCount = parseInt(optionsList.dataset.maxCount, 10) || 1;
      const storageKey = section.querySelector('.feature-selection-input')?.dataset.storageKey;
      if (!storageKey) return;

      const selected = changes.featureSelections?.[storageKey] || [];
      if (selected.length > 0) anyStarted = true;
      if (selected.length < maxCount) allComplete = false;
    });

    // If no selection sections, consider complete
    if (sections.length === 0) {
      const features = changes.features || [];
      featuresBadge.textContent = features.length > 0 ? `${features.length} Feature${features.length > 1 ? 's' : ''}` : 'None';
      featuresBadge.className = 'ms-auto me-3 badge bg-success';
      return;
    }

    if (allComplete) {
      featuresBadge.textContent = 'All Selected';
      featuresBadge.className = 'ms-auto me-3 badge bg-success';
    } else if (anyStarted) {
      featuresBadge.textContent = 'In Progress';
      featuresBadge.className = 'ms-auto me-3 badge bg-warning text-dark';
    } else {
      featuresBadge.textContent = 'Choices Required';
      featuresBadge.className = 'ms-auto me-3 badge bg-warning text-dark';
    }
  }

  /**
   * Update the summary section as user makes choices
   */
  function updateSummary(modal, changes) {
    const summaryList = modal.querySelector('#summaryList');
    const confirmBtn = modal.querySelector('#confirmLevelUpBtn');

    // Check subclass selection
    const subclassRadios = modal.querySelectorAll('input[name="subclassChoice"]');
    let subclassSet = true;
    if (subclassRadios.length > 0) {
      subclassSet = !!modal.querySelector('input[name="subclassChoice"]:checked');
    }

    // Check racial feature selection
    const racialFeatureRadios = modal.querySelectorAll('input[name="racialFeatureChoice"]');
    let racialFeatureSet = true;
    if (racialFeatureRadios.length > 0) {
      racialFeatureSet = !!modal.querySelector('input[name="racialFeatureChoice"]:checked');
    }

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
        // Check if a feat radio is selected
        const selectedFeatRadio = modal.querySelector('input[name="levelUpFeat"]:checked');
        asiSet = !!selectedFeatRadio;
      }
    }

    // Check spell learning
    let spellsSet = true;
    if (changes.spellRules && changes.spellState) {
      spellsSet = changes.spellState.selectedSpells.length === changes.spellRules.newSpells;
    }

    // Check feature selections (Fighting Style, Metamagic, etc.)
    let featuresSet = true;
    const featureSections = modal.querySelectorAll('.feature-selection-section');
    const featureStatus = [];
    featureSections.forEach(section => {
      const featureType = section.dataset.featureType;
      const optionsList = section.querySelector('.feature-options-list');
      if (!optionsList) return;

      const maxCount = parseInt(optionsList.dataset.maxCount, 10) || 1;
      const storageKey = section.querySelector('.feature-selection-input')?.dataset.storageKey;
      if (!storageKey) return;

      const selected = changes.featureSelections?.[storageKey] || [];
      const isComplete = selected.length >= maxCount;
      if (!isComplete) featuresSet = false;

      // Get the original feature name from the section header
      const featureHeader = section.querySelector('h6')?.textContent?.trim() || featureType;
      featureStatus.push({
        name: featureHeader,
        isComplete,
        selected: selected.length,
        required: maxCount
      });
    });

    const allComplete = subclassSet && racialFeatureSet && hpSet && asiSet && spellsSet && featuresSet;

    let html = '';

    if (subclassRadios.length > 0) {
      if (subclassSet) {
        html += `<li class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Subclass selected</li>`;
      } else {
        html += `<li class="text-muted">Select your subclass</li>`;
      }
    }

    if (racialFeatureRadios.length > 0) {
      if (racialFeatureSet) {
        html += `<li class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Racial feature selected</li>`;
      } else {
        html += `<li class="text-muted">Select your racial feature option</li>`;
      }
    }

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

    if (changes.spellRules) {
      if (spellsSet) {
        html += `<li class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Spells selected</li>`;
      } else {
        const count = changes.spellState ? changes.spellState.selectedSpells.length : 0;
        html += `<li class="text-muted">Select ${changes.spellRules.newSpells - count} more spell${changes.spellRules.newSpells - count > 1 ? 's' : ''}</li>`;
      }
    }

    // Feature selections status
    featureStatus.forEach(status => {
      if (status.isComplete) {
        html += `<li class="text-success"><i class="bi bi-check-circle-fill me-1"></i>${status.name} selected</li>`;
      } else {
        const remaining = status.required - status.selected;
        html += `<li class="text-muted">Select ${remaining} more ${status.name.toLowerCase()} option${remaining > 1 ? 's' : ''}</li>`;
      }
    });

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
      feat: null,
      subclass: null,
      racialFeatureChoice: null,
      spellsLearned: [],
      spellSwapped: null,
      multiclassPath: 'continue',
      multiclassNewClass: null,
      featureSelections: changes.featureSelections || {}
    };

    // Check multiclass path
    const multiclassPathRadio = modal.querySelector('input[name="multiclassPath"]:checked');
    if (multiclassPathRadio && multiclassPathRadio.value === 'multiclass') {
      data.multiclassPath = 'multiclass';
      const newClassSelect = modal.querySelector('#multiclassNewClass');
      if (newClassSelect && newClassSelect.value) {
        data.multiclassNewClass = newClassSelect.value;
      } else {
        alert('Please select a class to multiclass into.');
        return null;
      }

      // Check prerequisites
      const abilityScores = {
        str: parseInt(character.stats?.str, 10) || 10,
        dex: parseInt(character.stats?.dex, 10) || 10,
        con: parseInt(character.stats?.con, 10) || 10,
        int: parseInt(character.stats?.int, 10) || 10,
        wis: parseInt(character.stats?.wis, 10) || 10,
        cha: parseInt(character.stats?.cha, 10) || 10
      };

      const result = LevelUpData.checkMulticlassPrerequisites(data.multiclassNewClass, abilityScores);
      if (!result.meetsRequirements) {
        alert(`Cannot multiclass into ${data.multiclassNewClass}. Prerequisites not met: ${result.missing.join(', ')}`);
        return null;
      }
    }

    // Check for subclass selection if needed
    const subclassRadio = modal.querySelector('input[name="subclassChoice"]:checked');
    if (subclassRadio) {
      data.subclass = subclassRadio.value;
    } else {
      // Check if subclass selection was required
      const subclassRadios = modal.querySelectorAll('input[name="subclassChoice"]');
      if (subclassRadios.length > 0) {
        alert('Please select your subclass.');
        return null;
      }
    }

    // Check for racial feature choice if needed
    const racialFeatureRadio = modal.querySelector('input[name="racialFeatureChoice"]:checked');
    if (racialFeatureRadio) {
      data.racialFeatureChoice = racialFeatureRadio.value;
    } else {
      // Check if racial feature choice was required
      const racialFeatureRadios = modal.querySelectorAll('input[name="racialFeatureChoice"]');
      if (racialFeatureRadios.length > 0) {
        alert('Please select your racial feature option.');
        return null;
      }
    }

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
        const selectedFeatRadio = modal.querySelector('input[name="levelUpFeat"]:checked');
        if (!selectedFeatRadio) {
          alert('Please select a feat.');
          return null;
        }
        data.feat = selectedFeatRadio.dataset.featName;
      }
    }

    // Gather spell learning data
    if (changes.spellRules && changes.spellState) {
      if (changes.spellState.selectedSpells.length !== changes.spellRules.newSpells) {
        alert(`Please select exactly ${changes.spellRules.newSpells} spell${changes.spellRules.newSpells > 1 ? 's' : ''}.`);
        return null;
      }

      data.spellsLearned = changes.spellState.selectedSpells.map(spell => ({
        name: spell.title,
        level: spell.level,
        school: spell.school,
        castingTime: spell.casting_time,
        range: spell.range,
        components: spell.components,
        duration: spell.duration,
        concentration: spell.concentration || false,
        ritual: spell.ritual || false,
        description: spell.body || ''
      }));

      // Check for spell swapping
      if (changes.spellState.swapOldSpell && changes.spellState.swapNewSpell) {
        data.spellSwapped = {
          oldSpell: changes.spellState.swapOldSpell,
          newSpell: changes.spellState.swapNewSpell
        };
      }
    }

    // Validate feature selections (Fighting Style, Metamagic, etc.)
    const featureSections = modal.querySelectorAll('.feature-selection-section');
    for (const section of featureSections) {
      const featureType = section.dataset.featureType;
      const optionsList = section.querySelector('.feature-options-list');
      if (!optionsList) continue;

      const maxCount = parseInt(optionsList.dataset.maxCount, 10) || 1;
      const storageKey = section.querySelector('.feature-selection-input')?.dataset.storageKey;
      if (!storageKey) continue;

      const selected = data.featureSelections[storageKey] || [];
      if (selected.length < maxCount) {
        const featureHeader = section.querySelector('h6')?.textContent?.trim() || featureType;
        alert(`Please complete your ${featureHeader} selection (${selected.length}/${maxCount} selected).`);
        return null;
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

    // Handle multiclassing
    if (levelUpData.multiclassPath === 'multiclass' && levelUpData.multiclassNewClass) {
      // Initialize or update multiclass array
      character.multiclass = true;
      character.classes = character.classes || [];

      // Check if this is the first multiclass
      if (character.classes.length === 0) {
        // Add the original class first
        const originalClass = extractClassName(character.charClass);
        const originalLevel = levelUpData.newLevel - 1; // Previous level
        character.classes.push({
          className: originalClass,
          subclass: character.subclass || '',
          level: originalLevel,
          subclassLevel: character.subclassLevel || 0
        });
      }

      // Add the new class
      character.classes.push({
        className: levelUpData.multiclassNewClass,
        subclass: '',
        level: 1, // Starting at level 1 in the new class
        subclassLevel: 0
      });

      // Update the class field
      const classString = character.classes.map(c =>
        c.subclass ? `${c.className} (${c.subclass})` : c.className
      ).join(' / ');

      character.charClass = classString.split(' / ')[0]; // Primary class
      character.fullClassString = classString;

    } else if (character.multiclass && character.classes && character.classes.length > 0) {
      // Continue leveling in an existing class (multiclassed character)
      // Find the primary class and increase its level
      const primaryClass = character.classes[0];
      if (primaryClass) {
        primaryClass.level += 1;

        // Update the class field
        const classString = character.classes.map(c =>
          c.subclass ? `${c.className} (${c.subclass})` : c.className
        ).join(' / ');

        character.fullClassString = classString;
      }
    }

    // Apply subclass selection if provided
    if (levelUpData.subclass) {
      character.subclass = levelUpData.subclass;
      character.subclassLevel = levelUpData.newLevel;

      // If multiclassed, update the appropriate class in the classes array
      if (character.multiclass && character.classes && character.classes.length > 0) {
        const currentClass = extractClassName(character.charClass);
        const classEntry = character.classes.find(c => c.className === currentClass);
        if (classEntry) {
          classEntry.subclass = levelUpData.subclass;
          classEntry.subclassLevel = classEntry.level;
        }
      }
    }

    // Apply racial feature choice if provided
    if (levelUpData.racialFeatureChoice) {
      character.racialFeatures = character.racialFeatures || [];
      character.racialFeatures.push({
        level: levelUpData.newLevel,
        choice: levelUpData.racialFeatureChoice
      });
    }

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

      // Get feat data for description
      const featData = LevelUpData.getFeatData(levelUpData.feat);

      // Add feat to features field with description
      if (featData) {
        const featText = `\n\n=== FEAT: ${featData.name} (Level ${levelUpData.newLevel}) ===\n${featData.description}`;
        character.features = (character.features || '') + featText;

        // Handle feat bonuses (e.g., ability increases from feats)
        if (featData.abilityIncrease) {
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
    }

    // Update spell slots
    if (levelUpData.spellSlots) {
      character.spellSlots = character.spellSlots || {};
      for (let i = 1; i <= 9; i++) {
        const newMax = levelUpData.spellSlots[i - 1] || 0;
        character.spellSlots[i] = character.spellSlots[i] || { max: 0, used: 0 };
        character.spellSlots[i].max = newMax;
        // Reset used slots to 0 (fully replenish spell slots on level up)
        character.spellSlots[i].used = 0;
      }
    }

    // Update pact slots
    if (levelUpData.pactSlots) {
      character.pactLevel = levelUpData.pactSlots.level;
      character.pactMax = levelUpData.pactSlots.slots;
      // Reset pact slots used to 0 (fully replenish on level up)
      character.pactUsed = 0;
    }

    // Update class resources based on new level
    let resourceUpdateStatus = { updated: 0, expected: 0, needsManualUpdate: false };
    try {
      const resourceClassName = extractClassName(character.charClass || character.class);
      if (resourceClassName && LevelUpData.getClassResources) {
        const stats = character.stats || {
          str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
        };
        const updatedResources = LevelUpData.getClassResources(resourceClassName, levelUpData.newLevel, stats);

        if (updatedResources && updatedResources.length > 0) {
          resourceUpdateStatus.expected = updatedResources.length;
          // Initialize resources object if it doesn't exist
          character.resources = character.resources || {};

          // Try to match existing resources by name and update their max values
          for (let i = 0; i < updatedResources.length; i++) {
            const newRes = updatedResources[i];
            const slotKey = `res${i + 1}`;
            const existingRes = character.resources[slotKey];

            // Check if existing resource matches by name (case-insensitive)
            if (existingRes && existingRes.name &&
                existingRes.name.toLowerCase() === newRes.name.toLowerCase()) {
              // Update the max value, keep current value but cap it at new max
              const oldMax = existingRes.max || 0;
              existingRes.max = newRes.max;
              // If current exceeds new max, cap it
              if (existingRes.current > newRes.max) {
                existingRes.current = newRes.max;
              }
              // On level up, replenish resources to new max (like a long rest)
              existingRes.current = newRes.max;
              resourceUpdateStatus.updated++;
              console.log(`📈 Updated ${newRes.name}: max ${oldMax} → ${newRes.max}`);
            } else if (!existingRes || !existingRes.name) {
              // Slot is empty, add the resource
              character.resources[slotKey] = {
                name: newRes.name,
                current: newRes.max,
                max: newRes.max
              };
              resourceUpdateStatus.updated++;
              console.log(`➕ Added ${newRes.name} to ${slotKey}`);
            } else {
              // Slot has a different resource name - user customization
              resourceUpdateStatus.needsManualUpdate = true;
            }
          }

          if (resourceUpdateStatus.updated > 0) {
            console.log(`🎯 Updated ${resourceUpdateStatus.updated} class resource(s) for level ${levelUpData.newLevel}`);
          }
          if (resourceUpdateStatus.needsManualUpdate) {
            console.warn('⚠️ Some class resources could not be auto-updated. User may need to manually update resource max values.');
          }
        }
      }
    } catch (e) {
      console.warn('Could not auto-update class resources:', e);
      resourceUpdateStatus.needsManualUpdate = true;
      // Non-critical error - continue with level up
    }
    levelUpData.resourceUpdateStatus = resourceUpdateStatus;

    // Update hit dice
    // Get the class data to determine hit die size
    const className = extractClassName(character.charClass || character.class);
    if (className) {
      const classData = LevelUpData.getClassData(className);
      if (classData && classData.hitDie) {
        const hitDieSize = classData.hitDie;
        const newLevel = levelUpData.newLevel;

        // Total hit dice equals character level
        character.hitDice = `${newLevel}d${hitDieSize}`;

        // On level up, add one hit die to the remaining pool
        // Parse current remaining hit dice
        const currentRemaining = character.hitDiceRemaining || character.hitDice || `${newLevel - 1}d${hitDieSize}`;
        const match = currentRemaining.match(/(\d+)d(\d+)/);
        if (match) {
          const remainingCount = parseInt(match[1], 10);
          // Add 1 to remaining (gained from leveling up)
          character.hitDiceRemaining = `${remainingCount + 1}d${hitDieSize}`;
        } else {
          // If parsing failed, set to total
          character.hitDiceRemaining = character.hitDice;
        }
      }
    }

    // Apply spell learning
    if (levelUpData.spellsLearned && levelUpData.spellsLearned.length > 0) {
      character.spellList = character.spellList || [];

      // Handle spell swapping first (remove old spell)
      if (levelUpData.spellSwapped && levelUpData.spellSwapped.oldSpell) {
        const oldSpellName = levelUpData.spellSwapped.oldSpell.toLowerCase();
        character.spellList = character.spellList.filter(spell =>
          (spell.name || '').toLowerCase() !== oldSpellName
        );

        // Find the new spell in SPELLS_DATA and add it
        if (window.SPELLS_DATA && levelUpData.spellSwapped.newSpell) {
          const newSpellData = window.SPELLS_DATA.find(s =>
            s.title === levelUpData.spellSwapped.newSpell
          );
          if (newSpellData) {
            character.spellList.push({
              name: newSpellData.title,
              level: newSpellData.level,
              school: newSpellData.school,
              castingTime: newSpellData.casting_time,
              range: newSpellData.range,
              components: newSpellData.components,
              duration: newSpellData.duration,
              concentration: newSpellData.concentration || false,
              ritual: newSpellData.ritual || false,
              description: newSpellData.body || ''
            });
          }
        }
      }

      // Add newly learned spells
      levelUpData.spellsLearned.forEach(spell => {
        // Check if spell already exists (shouldn't happen, but safety check)
        const exists = character.spellList.some(s =>
          (s.name || '').toLowerCase() === spell.name.toLowerCase()
        );
        if (!exists) {
          character.spellList.push(spell);
        }
      });
    }

    // Check for new racial features at this level
    let racialFeaturesGained = [];
    try {
      let race = character.race;
      let subrace = character.subrace;

      // Parse race string - handle formats like "Tiefling (Asmodeus)" or "High Elf"
      if (race && race.includes('(')) {
        // Format: "Tiefling (Asmodeus)" -> race: "Tiefling", subrace: "Asmodeus"
        const match = race.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          race = match[1].trim();
          subrace = subrace || match[2].trim();
        }
      }

      if (race && LevelUpData.getRacialFeature) {
        // Check both race and subrace for level-gated features
        const racesToCheck = [race];
        if (subrace) {
          racesToCheck.push(subrace);
          racesToCheck.push(`${subrace} ${race}`);
          // Also check for specific subrace entries like "Protector Aasimar"
          racesToCheck.push(`${subrace}`);
        }

        // Remove duplicates
        const uniqueRaces = [...new Set(racesToCheck)];

        uniqueRaces.forEach(raceName => {
          const racialFeature = LevelUpData.getRacialFeature(raceName, levelUpData.newLevel);
          if (racialFeature) {
            racialFeaturesGained.push({
              race: raceName,
              ...racialFeature
            });
          }
        });

        if (racialFeaturesGained.length > 0) {
          levelUpData.racialFeaturesGained = racialFeaturesGained;
          console.log(`🧬 Gained racial feature(s) at level ${levelUpData.newLevel}:`, racialFeaturesGained);
        }
      }
    } catch (e) {
      console.warn('Could not check for racial features:', e);
    }

    // Check for new racial spells at this level
    let racialSpellsGained = [];
    try {
      let race = character.race;
      let subrace = character.subrace;

      // Parse race string - handle formats like "Tiefling (Asmodeus)"
      if (race && race.includes('(')) {
        const match = race.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          race = match[1].trim();
          subrace = subrace || match[2].trim();
        }
      }

      if (race && LevelUpData.getSpeciesSpellsAtLevel) {
        const newSpeciesSpells = LevelUpData.getSpeciesSpellsAtLevel(race, subrace, levelUpData.newLevel);
        if (newSpeciesSpells && newSpeciesSpells.length > 0) {
          // Convert to spell list format and add to character
          newSpeciesSpells.forEach(spellEntry => {
            // Find the spell in SPELLS_DATA
            const spellData = window.SPELLS_DATA?.find(s => s.title === spellEntry.spell);
            if (spellData) {
              // Check if spell already exists in character's spell list
              const exists = (character.spellList || []).some(s =>
                (s.name || '').toLowerCase() === spellEntry.spell.toLowerCase()
              );

              if (!exists) {
                // Build note for racial spell
                let racialNote = '';
                if (spellEntry.type === 'cantrip') {
                  racialNote = '(Racial cantrip)';
                } else if (spellEntry.type === 'once_per_long_rest') {
                  racialNote = spellEntry.note ? `(Racial: ${spellEntry.note}, 1/long rest)` : '(Racial: 1/long rest)';
                } else if (spellEntry.type === 'once_per_short_rest') {
                  racialNote = spellEntry.note ? `(Racial: ${spellEntry.note}, 1/short rest)` : '(Racial: 1/short rest)';
                } else if (spellEntry.type === 'at_will') {
                  racialNote = '(Racial: at will)';
                }

                const newSpell = {
                  name: spellData.title,
                  level: spellData.level,
                  school: spellData.school,
                  castingTime: spellData.casting_time,
                  range: spellData.range,
                  components: spellData.components,
                  duration: spellData.duration,
                  concentration: spellData.concentration || false,
                  ritual: spellData.ritual || false,
                  description: spellData.body || '',
                  prepared: true,
                  alwaysPrepared: true,
                  racialSpell: true,
                  racialNote: racialNote
                };

                // Add to character's spell list
                if (!character.spellList) {
                  character.spellList = [];
                }
                character.spellList.push(newSpell);
                racialSpellsGained.push(spellEntry.spell);
              }
            } else {
              console.warn(`Racial spell not found in SPELLS_DATA: ${spellEntry.spell}`);
            }
          });

          if (racialSpellsGained.length > 0) {
            levelUpData.racialSpellsGained = racialSpellsGained;
            console.log(`🧬 Gained racial spell(s) at level ${levelUpData.newLevel}:`, racialSpellsGained);
          }
        }
      }
    } catch (e) {
      console.warn('Could not check for racial spells:', e);
    }

    // Update Wild Shape reference for Druids (check if new forms are available)
    let wildShapeUpdated = false;
    try {
      const className = extractClassName(character.charClass || character.class);
      if (className === 'Druid' && levelUpData.newLevel >= 2 && LevelUpData.formatWildShapeReference) {
        const subclass = character.subclass || '';
        const newWildShapeRef = LevelUpData.formatWildShapeReference(levelUpData.newLevel, subclass);

        if (newWildShapeRef) {
          // Find and replace existing Wild Shape reference in features
          const features = character.features || '';
          const wildShapePattern = /\*\*Wild Shape Forms\*\*[\s\S]*?(?=\n\n===|\n\n\*\*[^W]|$)/;
          const wildShapeBasicPattern = /\*\*Wild Shape:\*\*[^\n]*\n?/;

          if (wildShapePattern.test(features)) {
            // Replace existing Wild Shape Forms block
            character.features = features.replace(wildShapePattern, newWildShapeRef);
            wildShapeUpdated = true;
            console.log(`🐻 Updated Wild Shape reference for level ${levelUpData.newLevel} Druid`);
          } else if (wildShapeBasicPattern.test(features)) {
            // Replace basic Wild Shape text
            character.features = features.replace(wildShapeBasicPattern, newWildShapeRef + '\n\n');
            wildShapeUpdated = true;
            console.log(`🐻 Updated Wild Shape reference for level ${levelUpData.newLevel} Druid`);
          } else if (levelUpData.newLevel === 2) {
            // First time getting Wild Shape at level 2 - append to features
            character.features = features + '\n\n' + newWildShapeRef;
            wildShapeUpdated = true;
            console.log(`🐻 Added Wild Shape reference for level 2 Druid`);
          }

          if (wildShapeUpdated) {
            levelUpData.wildShapeUpdated = true;
          }
        }
      }
    } catch (e) {
      console.warn('Could not update Wild Shape reference:', e);
    }

    // Process feature selections (Fighting Style, Metamagic, Eldritch Invocations, Pact Boon)
    const featureSelections = levelUpData.featureSelections || {};
    let selectedFeaturesText = '';

    // Fighting Style
    if (featureSelections.fightingStyles && featureSelections.fightingStyles.length > 0) {
      character.fightingStyles = character.fightingStyles || [];
      featureSelections.fightingStyles.forEach(styleName => {
        if (!character.fightingStyles.includes(styleName)) {
          character.fightingStyles.push(styleName);
        }
        const styleData = LevelUpData.getFightingStyleData ? LevelUpData.getFightingStyleData(styleName) : null;
        if (styleData) {
          selectedFeaturesText += `\n\n**Fighting Style: ${styleData.name}**\n${styleData.description}`;
        }
      });
    }

    // Pact Boon
    if (featureSelections.pactBoon && featureSelections.pactBoon.length > 0) {
      character.pactBoon = featureSelections.pactBoon[0];
      const boonData = LevelUpData.getPactBoonData ? LevelUpData.getPactBoonData(character.pactBoon) : null;
      if (boonData) {
        selectedFeaturesText += `\n\n**Pact Boon: ${boonData.name}**\n${boonData.description}`;
      }
    }

    // Eldritch Invocations
    if (featureSelections.eldritchInvocations && featureSelections.eldritchInvocations.length > 0) {
      character.eldritchInvocations = character.eldritchInvocations || [];
      featureSelections.eldritchInvocations.forEach(invocationName => {
        if (!character.eldritchInvocations.includes(invocationName)) {
          character.eldritchInvocations.push(invocationName);
        }
        const invocationData = LevelUpData.getEldritchInvocationData ? LevelUpData.getEldritchInvocationData(invocationName) : null;
        if (invocationData) {
          const prereqText = invocationData.prerequisites ? ` (Prerequisite: ${invocationData.prerequisites})` : '';
          selectedFeaturesText += `\n\n**Eldritch Invocation: ${invocationData.name}**${prereqText}\n${invocationData.description}`;
        }
      });
    }

    // Metamagic
    if (featureSelections.metamagic && featureSelections.metamagic.length > 0) {
      character.metamagic = character.metamagic || [];
      featureSelections.metamagic.forEach(metamagicName => {
        if (!character.metamagic.includes(metamagicName)) {
          character.metamagic.push(metamagicName);
        }
        const metamagicData = LevelUpData.getMetamagicData ? LevelUpData.getMetamagicData(metamagicName) : null;
        if (metamagicData) {
          const costText = metamagicData.cost ? ` (${metamagicData.cost})` : '';
          selectedFeaturesText += `\n\n**Metamagic: ${metamagicData.name}**${costText}\n${metamagicData.description}`;
        }
      });
    }

    // Add features to notes
    const hasFeatures = levelUpData.features.length > 0 || racialFeaturesGained.length > 0 || selectedFeaturesText;
    if (hasFeatures) {
      let featuresText = '';

      // Add racial features first
      if (racialFeaturesGained.length > 0) {
        featuresText += `\n\n=== Level ${levelUpData.newLevel} Racial Features ===`;
        racialFeaturesGained.forEach(feat => {
          featuresText += `\n- **${feat.name}:** ${feat.description}`;
        });
      }

      // Add class features header
      if (levelUpData.features.length > 0 || selectedFeaturesText) {
        featuresText += `\n\n=== Level ${levelUpData.newLevel} Class Features ===`;

        // Add static (auto-granted) features as bullet points
        const staticFeatures = levelUpData.features.filter(f => !parseSelectableFeature(f));
        if (staticFeatures.length > 0) {
          featuresText += '\n' + staticFeatures.join('\n');
        }

        // Add selected features with full descriptions
        if (selectedFeaturesText) {
          featuresText += selectedFeaturesText;
        }
      }

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
    // Build resource update message
    let resourceMessage = '';
    const resStatus = levelUpData.resourceUpdateStatus;
    if (resStatus && resStatus.updated > 0) {
      resourceMessage = `<li>Class resources updated and replenished</li>`;
    }

    // Build racial feature message
    let racialFeatureMessage = '';
    if (levelUpData.racialFeaturesGained && levelUpData.racialFeaturesGained.length > 0) {
      const featureNames = levelUpData.racialFeaturesGained.map(f => f.name).join(', ');
      racialFeatureMessage = `<li>Racial feature unlocked: ${featureNames}</li>`;
    }

    // Build racial spells message
    let racialSpellsMessage = '';
    if (levelUpData.racialSpellsGained && levelUpData.racialSpellsGained.length > 0) {
      const spellNames = levelUpData.racialSpellsGained.join(', ');
      racialSpellsMessage = `<li>Racial spell${levelUpData.racialSpellsGained.length > 1 ? 's' : ''} gained: ${spellNames}</li>`;
    }

    // Build Wild Shape update message
    let wildShapeMessage = '';
    if (levelUpData.wildShapeUpdated) {
      wildShapeMessage = `<li>Wild Shape forms updated for level ${levelUpData.newLevel}</li>`;
    }

    // Build feature selections message
    let featureSelectionsMessage = '';
    const featureSelections = levelUpData.featureSelections || {};
    if (featureSelections.fightingStyles && featureSelections.fightingStyles.length > 0) {
      featureSelectionsMessage += `<li>Fighting Style: ${featureSelections.fightingStyles.join(', ')}</li>`;
    }
    if (featureSelections.pactBoon && featureSelections.pactBoon.length > 0) {
      featureSelectionsMessage += `<li>Pact Boon: ${featureSelections.pactBoon[0]}</li>`;
    }
    if (featureSelections.eldritchInvocations && featureSelections.eldritchInvocations.length > 0) {
      featureSelectionsMessage += `<li>Eldritch Invocations: ${featureSelections.eldritchInvocations.join(', ')}</li>`;
    }
    if (featureSelections.metamagic && featureSelections.metamagic.length > 0) {
      featureSelectionsMessage += `<li>Metamagic: ${featureSelections.metamagic.join(', ')}</li>`;
    }

    // Build warning message for resources that couldn't be auto-updated
    let warningMessage = '';
    if (resStatus && resStatus.needsManualUpdate) {
      warningMessage = `
        <div class="alert alert-warning mt-2 mb-0 py-2 small">
          <i class="bi bi-exclamation-triangle me-1"></i>
          <strong>Note:</strong> Some class resources could not be auto-updated (resource names may have been customized).
          Please check the <strong>Resources &amp; Rests</strong> section and manually update max values if needed.
        </div>
      `;
    }

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
          ${levelUpData.features.length > 0 ? `<li>${levelUpData.features.length} new class feature(s) gained</li>` : ''}
          ${featureSelectionsMessage}
          ${racialFeatureMessage}
          ${racialSpellsMessage}
          ${wildShapeMessage}
          ${resourceMessage}
        </ul>
        ${warningMessage}
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
