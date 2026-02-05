/**
 * Multiclass UI Management
 * Handles the multiclass modal and level allocation
 */

const MulticlassUI = (function() {
  'use strict';

  let currentCharacter = null;
  let multiclassData = [];

  /**
   * Initialize the multiclass UI
   */
  function init() {
    const manageBtn = document.getElementById('manageMulticlassBtn');
    const addBtn = document.getElementById('addMulticlassBtn');
    const applyBtn = document.getElementById('applyMulticlassBtn');

    if (manageBtn) {
      manageBtn.addEventListener('click', openMulticlassModal);
    }

    if (addBtn) {
      addBtn.addEventListener('click', addClassEntry);
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', applyMulticlass);
    }
  }

  /**
   * Open the multiclass management modal
   */
  function openMulticlassModal() {
    // Get current character
    if (typeof window.getCurrentCharacter === 'function') {
      currentCharacter = window.getCurrentCharacter();
    } else {
      alert('Unable to load character data.');
      return;
    }

    // Parse current class string
    parseCurrentClass();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('multiclassModal'));
    modal.show();

    // Update UI
    updateTotalLevel();
    renderClassList();
    updatePreview();
  }

  /**
   * Parse the current class string into multiclass data
   */
  function parseCurrentClass() {
    multiclassData = [];

    if (!currentCharacter) return;

    const fullClass = currentCharacter.charClass || '';
    const classes = fullClass.split('/').map(c => c.trim());

    if (classes.length > 1 && currentCharacter.classes && currentCharacter.classes.length > 0) {
      // Already multiclassed - use existing data
      multiclassData = currentCharacter.classes.map(c => ({...c}));
    } else {
      // Single class - create initial entry
      const match = fullClass.match(/^([^(]+)(?:\(([^)]+)\))?/);
      if (match) {
        multiclassData = [{
          className: match[1].trim(),
          subclass: match[2] ? match[2].trim() : '',
          level: parseInt(currentCharacter.level, 10) || 1,
          subclassLevel: 0
        }];
      } else {
        multiclassData = [{
          className: '',
          subclass: '',
          level: parseInt(currentCharacter.level, 10) || 1,
          subclassLevel: 0
        }];
      }
    }
  }

  /**
   * Add a new class entry
   */
  function addClassEntry() {
    multiclassData.push({
      className: '',
      subclass: '',
      level: 1,
      subclassLevel: 0
    });

    renderClassList();
    updatePreview();
  }

  /**
   * Remove a class entry
   */
  function removeClassEntry(index) {
    if (multiclassData.length <= 1) {
      alert('You must have at least one class.');
      return;
    }

    multiclassData.splice(index, 1);
    renderClassList();
    updatePreview();
  }

  /**
   * Update class data
   */
  function updateClassData(index, field, value) {
    if (!multiclassData[index]) return;

    multiclassData[index][field] = value;

    // Update level as number
    if (field === 'level') {
      multiclassData[index].level = parseInt(value, 10) || 0;
    }

    updateTotalLevel();
    updatePreview();
  }

  /**
   * Render the class list
   */
  function renderClassList() {
    const container = document.getElementById('multiclassClassList');
    if (!container) return;

    container.innerHTML = multiclassData.map((classData, index) => `
      <div class="card bg-secondary border-secondary mb-2">
        <div class="card-body p-3">
          <div class="row g-2 align-items-center">
            <div class="col-md-4">
              <label class="form-label small mb-1">Class</label>
              <select class="form-select form-select-sm" data-index="${index}" data-field="className">
                <option value="">Choose class...</option>
                <option value="Artificer" ${classData.className === 'Artificer' ? 'selected' : ''}>Artificer</option>
                <option value="Barbarian" ${classData.className === 'Barbarian' ? 'selected' : ''}>Barbarian</option>
                <option value="Bard" ${classData.className === 'Bard' ? 'selected' : ''}>Bard</option>
                <option value="Cleric" ${classData.className === 'Cleric' ? 'selected' : ''}>Cleric</option>
                <option value="Druid" ${classData.className === 'Druid' ? 'selected' : ''}>Druid</option>
                <option value="Fighter" ${classData.className === 'Fighter' ? 'selected' : ''}>Fighter</option>
                <option value="Monk" ${classData.className === 'Monk' ? 'selected' : ''}>Monk</option>
                <option value="Paladin" ${classData.className === 'Paladin' ? 'selected' : ''}>Paladin</option>
                <option value="Ranger" ${classData.className === 'Ranger' ? 'selected' : ''}>Ranger</option>
                <option value="Rogue" ${classData.className === 'Rogue' ? 'selected' : ''}>Rogue</option>
                <option value="Sorcerer" ${classData.className === 'Sorcerer' ? 'selected' : ''}>Sorcerer</option>
                <option value="Warlock" ${classData.className === 'Warlock' ? 'selected' : ''}>Warlock</option>
                <option value="Wizard" ${classData.className === 'Wizard' ? 'selected' : ''}>Wizard</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Subclass (optional)</label>
              <input type="text" class="form-control form-control-sm"
                     placeholder="e.g., Evocation, Champion..."
                     value="${classData.subclass || ''}"
                     data-index="${index}" data-field="subclass">
            </div>
            <div class="col-md-3">
              <label class="form-label small mb-1">Level</label>
              <input type="number" min="0" max="20" class="form-control form-control-sm"
                     value="${classData.level}"
                     data-index="${index}" data-field="level">
            </div>
            <div class="col-md-1 text-end">
              <button type="button" class="btn btn-sm btn-outline-danger mt-4"
                      data-index="${index}" data-action="remove"
                      ${multiclassData.length <= 1 ? 'disabled' : ''}>
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        const field = e.target.dataset.field;
        updateClassData(index, field, e.target.value);
      });
    });

    container.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('[data-action="remove"]').dataset.index, 10);
        removeClassEntry(index);
      });
    });
  }

  /**
   * Update total level display
   */
  function updateTotalLevel() {
    const totalLevel = multiclassData.reduce((sum, c) => sum + (c.level || 0), 0);
    const charLevel = currentCharacter ? (parseInt(currentCharacter.level, 10) || 1) : 1;

    const totalEl = document.getElementById('multiclassTotalLevel');
    const barEl = document.getElementById('multiclassLevelBar');
    const textEl = document.getElementById('multiclassLevelText');

    if (totalEl) totalEl.textContent = charLevel;
    if (textEl) textEl.textContent = `${totalLevel} / ${charLevel}`;

    if (barEl) {
      const percentage = Math.min((totalLevel / charLevel) * 100, 100);
      barEl.style.width = percentage + '%';

      // Color code the progress bar
      barEl.className = 'progress-bar';
      if (totalLevel < charLevel) {
        barEl.classList.add('bg-warning');
      } else if (totalLevel > charLevel) {
        barEl.classList.add('bg-danger');
      } else {
        barEl.classList.add('bg-success');
      }
    }
  }

  /**
   * Update preview (spell slots and prerequisites)
   */
  function updatePreview() {
    checkPrerequisites();
    previewSpellSlots();
  }

  /**
   * Check multiclass prerequisites
   */
  function checkPrerequisites() {
    const warningsEl = document.getElementById('multiclassPrereqWarnings');
    const listEl = document.getElementById('multiclassPrereqList');

    if (!window.LevelUpData || !currentCharacter) {
      if (warningsEl) warningsEl.classList.add('d-none');
      return;
    }

    const abilityScores = {
      str: parseInt(currentCharacter.stats?.str, 10) || 10,
      dex: parseInt(currentCharacter.stats?.dex, 10) || 10,
      con: parseInt(currentCharacter.stats?.con, 10) || 10,
      int: parseInt(currentCharacter.stats?.int, 10) || 10,
      wis: parseInt(currentCharacter.stats?.wis, 10) || 10,
      cha: parseInt(currentCharacter.stats?.cha, 10) || 10
    };

    const warnings = [];

    multiclassData.forEach(classData => {
      if (!classData.className) return;

      const result = window.LevelUpData.checkMulticlassPrerequisites(classData.className, abilityScores);
      if (!result.meetsRequirements) {
        warnings.push(`${classData.className}: Requires ${result.missing.join(', ')}`);
      }
    });

    if (warnings.length > 0 && listEl && warningsEl) {
      listEl.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
      warningsEl.classList.remove('d-none');
    } else if (warningsEl) {
      warningsEl.classList.add('d-none');
    }
  }

  /**
   * Preview spell slots
   */
  function previewSpellSlots() {
    const previewEl = document.getElementById('multiclassSpellSlotPreview');
    const sharedEl = document.getElementById('multiclassSharedSlots');
    const pactEl = document.getElementById('multiclassPactSlots');
    const pactSectionEl = document.getElementById('multiclassPactSlotSection');

    if (!window.LevelUpData || multiclassData.length === 0) {
      if (previewEl) previewEl.classList.add('d-none');
      return;
    }

    // Calculate spell slots
    const sharedSlots = window.LevelUpData.getMulticlassSpellSlots(multiclassData);
    const warlockClass = multiclassData.find(c => c.className === 'Warlock');
    const pactSlots = warlockClass ? window.LevelUpData.getWarlockPactSlots(warlockClass.level) : null;

    // Display shared slots
    if (sharedSlots && sharedEl) {
      const slotText = sharedSlots.map((count, i) => count > 0 ? `${i + 1}st: ${count}` : '').filter(Boolean).join(', ');
      sharedEl.textContent = slotText || 'None';
      if (previewEl) previewEl.classList.remove('d-none');
    }

    // Display pact magic
    if (pactSlots && pactEl && pactSectionEl) {
      pactEl.textContent = `${pactSlots.slots}× Level ${pactSlots.level}`;
      pactSectionEl.style.display = 'block';
    } else if (pactSectionEl) {
      pactSectionEl.style.display = 'none';
    }

    if (!sharedSlots && !pactSlots && previewEl) {
      previewEl.classList.add('d-none');
    }
  }

  /**
   * Apply multiclass configuration
   */
  function applyMulticlass() {
    if (!currentCharacter) return;

    const totalLevel = multiclassData.reduce((sum, c) => sum + (c.level || 0), 0);
    const charLevel = parseInt(currentCharacter.level, 10) || 1;

    // Validate total level
    if (totalLevel !== charLevel) {
      alert(`Total class levels (${totalLevel}) must equal character level (${charLevel}).`);
      return;
    }

    // Validate all classes have names
    const invalidClasses = multiclassData.filter(c => !c.className);
    if (invalidClasses.length > 0) {
      alert('All class entries must have a class selected.');
      return;
    }

    // Build class string
    let classString = '';
    if (multiclassData.length > 1) {
      // Multiclass format
      classString = multiclassData.map(c =>
        c.subclass ? `${c.className} (${c.subclass})` : c.className
      ).join(' / ');
    } else {
      // Single class
      const c = multiclassData[0];
      classString = c.subclass ? `${c.className} (${c.subclass})` : c.className;
    }

    // Update character
    const classField = document.getElementById('charClass');
    if (classField) {
      classField.value = classString;

      // Trigger change event to update character
      classField.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('multiclassModal'));
    if (modal) modal.hide();

    // Save character
    if (typeof window.saveCurrentCharacter === 'function') {
      window.saveCurrentCharacter();
    }
  }

  // Public API
  return {
    init
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', MulticlassUI.init);
} else {
  MulticlassUI.init();
}
