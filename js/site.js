const DM_TOOLBOX_BUILD = {
  name: "The DM's Toolbox",
  version: "2.1.2",
  recentChanges: [
    "XP tracking – optional XP display with color-coded progress bar, level-up badge, and wizard trigger added to Basic Information",
    "Wild Shape notes – Druids get a beast form reference in At-the-Table Reminders on creation; forms expand on level-up",
    "Class resources overhaul – all 12 classes updated to 2024 PHB resource rules (Discipline Points, Channel Divinity, Bardic Inspiration by PB, etc.)",
    "Polymorph / True Polymorph notes – adding either spell auto-populates the Spells tab Notes with 2024 rules and the full beast-form list",
    "Level-up wizard fix – LevelUpSystem now exposed on window so XP threshold trigger and other external callers work correctly",
    "Level-up Warlock fix – Eldritch Invocation options no longer crash the wizard (getAvailableInvocationsForLevel result wrapped in Object.keys)",
    "Class resources restore fix – CLASS_RESOURCES removed from the JSON backup/restore cycle so getMax arrow functions are never stripped"
  ],
  buildTime: new Date().toISOString(),
  author: "Maybeme"
};

console.log(
  `${DM_TOOLBOX_BUILD.name} v${DM_TOOLBOX_BUILD.version} – built ${DM_TOOLBOX_BUILD.buildTime} by ${DM_TOOLBOX_BUILD.author}`
);

const SRD_PDF_URL = 'https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf';
const SRD_LICENSE_DEFAULTS = {
  attributionText: 'This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC and is licensed for our use under the Creative Commons Attribution 4.0 International License.',
  productIdentityDisclaimer: 'The DM\'s Toolbox references rules and mechanics from the Dungeons & Dragons 5e System Reference Document 5.1. Wizards of the Coast, Dungeons & Dragons, Forgotten Realms, Ravenloft, Eberron, the dragon ampersand, beholders, githyanki, githzerai, mind flayers, yuan-ti, and all other Wizards of the Coast product identity are trademarks of Wizards of the Coast LLC in the U.S.A. and other countries. The DM\'s Toolbox is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  srdUrl: SRD_PDF_URL
};

function resolveLicenseInfo(source) {
  const info = { ...SRD_LICENSE_DEFAULTS };
  if (source && typeof source === 'object') {
    if (typeof source.attributionText === 'string' && source.attributionText.trim()) {
      info.attributionText = source.attributionText.trim();
    }
    if (typeof source.productIdentityDisclaimer === 'string' && source.productIdentityDisclaimer.trim()) {
      info.productIdentityDisclaimer = source.productIdentityDisclaimer.trim();
    }
    if (typeof source.licenseUrl === 'string' && source.licenseUrl.trim()) {
      info.licenseUrl = source.licenseUrl.trim();
    }
    if (typeof source.srdUrl === 'string' && source.srdUrl.trim()) {
      info.srdUrl = source.srdUrl.trim();
    }
  }
  return info;
}

window.SRDLicensing = resolveLicenseInfo(window.SRDLicensing);
window.getSrdLicenseNotices = function getSrdLicenseNotices() {
  return resolveLicenseInfo(window.SRDLicensing);
};

// Initialize global error handling and diagnostics panel
// Uses dynamic import since site.js is loaded as a regular script
// Diagnostics panel: Press Ctrl+Alt+D to toggle
import('./error-handling.js')
  .then(({ initGlobalErrorHandlers, initDiagnosticsPanel, showUserError }) => {
    initGlobalErrorHandlers();
    initDiagnosticsPanel();
    // Expose showUserError globally for use in non-module scripts
    window.showUserError = showUserError;
  })
  .catch(err => {
    // Silently fail - error handling is optional enhancement
    console.warn('Error handling module not available:', err.message);
  });

import('./modules/content-pack-manager.js')
  .then(async ({ ContentPackManager }) => {
    const manager = ContentPackManager;
    if (manager?.initialize) {
      try {
        await manager.initialize();
      } catch (err) {
        console.warn('Content pack manager failed to initialize:', err);
      }
    }

    const uiPromise = import('./modules/content-pack-ui.js')
      .then(({ initContentPackUi }) => {
        initContentPackUi(manager);
      })
      .catch((uiErr) => {
        console.warn('Content pack UI module not available:', uiErr.message);
      });

    const runtimePromise = import('./modules/content-pack-runtime.js')
      .then(async ({ initContentPackRuntime }) => {
        if (typeof document !== 'undefined' && document.readyState === 'loading') {
          // Ensure SRD data scripts (spells, level-up data) finish loading before the baseline snapshot
          await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        initContentPackRuntime(manager);
      })
      .catch((runtimeErr) => {
        console.warn('Content pack runtime module not available:', runtimeErr.message);
      });

    await Promise.allSettled([uiPromise, runtimePromise]);
  })
  .catch((err) => {
    console.warn('Content pack manager module not available:', err.message);
  });

// Initialize IndexedDB if available
if (typeof IndexedDBStorage !== 'undefined' && IndexedDBStorage.isSupported()) {
  IndexedDBStorage.init()
    .then(() => console.log('✓ IndexedDB ready'))
    .catch(err => console.warn('⚠ IndexedDB initialization failed:', err));
}

(function initSrdGatingRuntime() {
  // Backup storage for original data - allows restoration when packs change
  let dataBackups = null;

  function createDataBackups() {
    if (dataBackups) return; // Already created

    dataBackups = {
      SPELLS_DATA: window.SPELLS_DATA ? JSON.parse(JSON.stringify(window.SPELLS_DATA)) : null,
      LevelUpData: {}
    };

    const data = window.LevelUpData;
    if (data) {
      // Deep copy all data structures that get pruned
      if (data.FEATS) dataBackups.LevelUpData.FEATS = JSON.parse(JSON.stringify(data.FEATS));
      if (data.CLASS_DATA) dataBackups.LevelUpData.CLASS_DATA = JSON.parse(JSON.stringify(data.CLASS_DATA));
      if (data.SUBCLASS_DATA) dataBackups.LevelUpData.SUBCLASS_DATA = JSON.parse(JSON.stringify(data.SUBCLASS_DATA));
      // CLASS_RESOURCES is intentionally excluded from backup — it contains
      // getMax arrow functions that JSON.stringify strips. Content packs never
      // modify CLASS_RESOURCES, so it needs no backup/restore cycle.
      if (data.DEFAULT_CLASS_WEAPONS) dataBackups.LevelUpData.DEFAULT_CLASS_WEAPONS = JSON.parse(JSON.stringify(data.DEFAULT_CLASS_WEAPONS));
      if (data.CLASS_STARTING_GOLD) dataBackups.LevelUpData.CLASS_STARTING_GOLD = JSON.parse(JSON.stringify(data.CLASS_STARTING_GOLD));
      if (data.CLASS_EQUIPMENT_CHOICES) dataBackups.LevelUpData.CLASS_EQUIPMENT_CHOICES = JSON.parse(JSON.stringify(data.CLASS_EQUIPMENT_CHOICES));
      if (data.DEFAULT_CLASS_EQUIPMENT) dataBackups.LevelUpData.DEFAULT_CLASS_EQUIPMENT = JSON.parse(JSON.stringify(data.DEFAULT_CLASS_EQUIPMENT));
      if (data.BACKGROUND_DATA) dataBackups.LevelUpData.BACKGROUND_DATA = JSON.parse(JSON.stringify(data.BACKGROUND_DATA));
      if (data.FIGHTING_STYLE_DATA) dataBackups.LevelUpData.FIGHTING_STYLE_DATA = JSON.parse(JSON.stringify(data.FIGHTING_STYLE_DATA));
      if (data.PACT_BOON_DATA) dataBackups.LevelUpData.PACT_BOON_DATA = JSON.parse(JSON.stringify(data.PACT_BOON_DATA));
      if (data.ELDRITCH_INVOCATION_DATA) dataBackups.LevelUpData.ELDRITCH_INVOCATION_DATA = JSON.parse(JSON.stringify(data.ELDRITCH_INVOCATION_DATA));
      if (data.METAMAGIC_DATA) dataBackups.LevelUpData.METAMAGIC_DATA = JSON.parse(JSON.stringify(data.METAMAGIC_DATA));
      if (data.RACE_DATA) dataBackups.LevelUpData.RACE_DATA = JSON.parse(JSON.stringify(data.RACE_DATA));
      if (data.SUBRACE_DATA) dataBackups.LevelUpData.SUBRACE_DATA = JSON.parse(JSON.stringify(data.SUBRACE_DATA));
      if (data.BEAST_FORMS) dataBackups.LevelUpData.BEAST_FORMS = JSON.parse(JSON.stringify(data.BEAST_FORMS));
      if (data.ARTIFICER_INFUSIONS) dataBackups.LevelUpData.ARTIFICER_INFUSIONS = JSON.parse(JSON.stringify(data.ARTIFICER_INFUSIONS));
    }
  }

  function restoreFromBackups() {
    if (!dataBackups) return;

    // Restore spells
    if (dataBackups.SPELLS_DATA && window.SPELLS_DATA) {
      window.SPELLS_DATA.length = 0;
      window.SPELLS_DATA.push(...JSON.parse(JSON.stringify(dataBackups.SPELLS_DATA)));
    }

    // Restore LevelUpData structures
    const data = window.LevelUpData;
    const backup = dataBackups.LevelUpData;
    if (data && backup) {
      const keysToRestore = [
        'FEATS', 'CLASS_DATA', 'SUBCLASS_DATA', 'DEFAULT_CLASS_WEAPONS',
        'CLASS_STARTING_GOLD', 'CLASS_EQUIPMENT_CHOICES', 'DEFAULT_CLASS_EQUIPMENT',
        'BACKGROUND_DATA', 'FIGHTING_STYLE_DATA', 'PACT_BOON_DATA', 'ELDRITCH_INVOCATION_DATA',
        'METAMAGIC_DATA', 'RACE_DATA', 'SUBRACE_DATA', 'BEAST_FORMS', 'ARTIFICER_INFUSIONS'
      ];

      keysToRestore.forEach((key) => {
        if (backup[key]) {
          // Clear existing and restore from backup
          if (Array.isArray(data[key])) {
            data[key].length = 0;
            data[key].push(...JSON.parse(JSON.stringify(backup[key])));
          } else if (typeof data[key] === 'object') {
            Object.keys(data[key]).forEach((k) => delete data[key][k]);
            Object.assign(data[key], JSON.parse(JSON.stringify(backup[key])));
          }
        }
      });
    }
  }

  function filterArrayInPlace(filter, type, arr, selector) {
    if (!Array.isArray(arr)) return;
    const filtered = filter.filterArray(type, arr, selector);
    if (!filtered || filtered === arr) return;
    arr.length = 0;
    arr.push(...filtered);
  }

  function stripDisallowedClasses(filter, obj) {
    if (!obj) return;
    Object.keys(obj).forEach((className) => {
      if (!filter.isAllowed('class', className)) {
        delete obj[className];
      }
    });
  }

  function pruneSpells(filter) {
    if (!Array.isArray(window.SPELLS_DATA)) return;
    filterArrayInPlace(filter, 'spell', window.SPELLS_DATA, (spell) => spell?.title?.trim());
  }

  function pruneClassResources(filter, data) {
    const resourceTable = data.CLASS_RESOURCES;
    if (!resourceTable) return;

    Object.keys(resourceTable).forEach((className) => {
      if (!filter.isAllowed('class', className)) {
        delete resourceTable[className];
        return;
      }

      const entries = resourceTable[className] || [];
      const kept = entries.filter((entry) => filter.isAllowed('class-resource', `class-resource:${className}:${entry.name}`));

      if (kept.length) {
        resourceTable[className] = kept;
      } else {
        delete resourceTable[className];
      }
    });
  }

  function pruneSubclassData(filter, data) {
    const subclasses = data.SUBCLASS_DATA;
    if (!subclasses) return;

    Object.keys(subclasses).forEach((className) => {
      if (!filter.isAllowed('class', className)) {
        delete subclasses[className];
        return;
      }

      const options = subclasses[className]?.options;
      if (!options) return;
      filter.filterObject('subclass', options, (subclassName) => `${className}:${subclassName}`);
      if (!Object.keys(options).length) {
        delete subclasses[className];
      }
    });
  }

  function pruneBeasts(filter, data) {
    const beastForms = data.BEAST_FORMS;
    if (!beastForms) return;

    Object.keys(beastForms).forEach((crKey) => {
      filterArrayInPlace(filter, 'beast', beastForms[crKey], (beast) => {
        if (!beast?.name) return null;
        return beast.cr ? `${beast.name} (CR ${beast.cr})` : beast.name;
      });
      if (!beastForms[crKey]?.length) {
        delete beastForms[crKey];
      }
    });
  }

  function pruneArtificerInfusions(filter, data) {
    const tables = data.ARTIFICER_INFUSIONS;
    if (!tables) return;

    Object.keys(tables).forEach((levelKey) => {
      filterArrayInPlace(filter, 'artificer-infusion', tables[levelKey], (infusion) => infusion?.name);
      if (!tables[levelKey]?.length) {
        delete tables[levelKey];
      }
    });
  }

  function pruneLevelUpData(filter) {
    const data = window.LevelUpData;
    if (!data) return;

    if (data.FEATS) {
      filter.filterObject('feat', data.FEATS, (name) => name);
    }

    if (data.CLASS_DATA) {
      filter.filterObject('class', data.CLASS_DATA, (className) => className);
    }

    stripDisallowedClasses(filter, data.DEFAULT_CLASS_WEAPONS);

    pruneSubclassData(filter, data);
    pruneClassResources(filter, data);

    if (data.CLASS_STARTING_GOLD) {
      filter.filterObject('class-starting-gold', data.CLASS_STARTING_GOLD, (className) => `class-starting-gold:${className}`);
    }

    if (data.CLASS_EQUIPMENT_CHOICES) {
      filter.filterObject('class-equipment-choice', data.CLASS_EQUIPMENT_CHOICES, (className) => `class-equip-choice:${className}`);
      stripDisallowedClasses(filter, data.CLASS_EQUIPMENT_CHOICES);
    }

    if (data.DEFAULT_CLASS_EQUIPMENT) {
      filter.filterObject('class-equipment-default', data.DEFAULT_CLASS_EQUIPMENT, (className) => `class-equip-default:${className}`);
      stripDisallowedClasses(filter, data.DEFAULT_CLASS_EQUIPMENT);
    }

    if (data.BACKGROUND_DATA) {
      filter.filterObject('background', data.BACKGROUND_DATA, (name) => name);
    }

    // Filter class feature options by SRD allowlist
    if (data.FIGHTING_STYLE_DATA) {
      filter.filterObject('fighting-style', data.FIGHTING_STYLE_DATA, (name) => name);
    }

    if (data.PACT_BOON_DATA) {
      filter.filterObject('pact-boon', data.PACT_BOON_DATA, (name) => name);
    }

    if (data.ELDRITCH_INVOCATION_DATA) {
      filter.filterObject('eldritch-invocation', data.ELDRITCH_INVOCATION_DATA, (name) => name);
    }

    if (data.METAMAGIC_DATA) {
      filter.filterObject('metamagic', data.METAMAGIC_DATA, (name) => name);
    }

    if (data.SUBRACE_DATA) {
      filter.filterObject('subrace', data.SUBRACE_DATA, (key) => key);
    }

    pruneBeasts(filter, data);
    pruneArtificerInfusions(filter, data);
  }

  function parseSrdRequirements(raw = '') {
    return raw
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => {
        const [type, ...rest] = token.split(':');
        return { type: (type || '').trim(), id: rest.join(':').trim() };
      })
      .filter(({ type, id }) => Boolean(type && id));
  }

  function updateSrdNotices(group) {
    if (!group || typeof document === 'undefined') {
      return;
    }
    const hasHidden = Boolean(document.querySelector(`[data-srd-block-group="${group}"][data-srd-hidden="true"]`));
    document.querySelectorAll(`[data-srd-notice-for="${group}"]`).forEach((node) => {
      node.classList.toggle('d-none', !hasHidden);
      if (hasHidden) {
        const tooltipText = node.getAttribute('data-srd-tooltip');
        if (tooltipText && window.bootstrap?.Tooltip && !node.dataset.srdTooltipInit) {
          new window.bootstrap.Tooltip(node, {
            title: tooltipText,
            placement: node.getAttribute('data-srd-tooltip-placement') || 'top'
          });
          node.dataset.srdTooltipInit = 'true';
        }
      }
    });
  }

  function hideSrdDomNode(node) {
    if (!node) return;
    if (node.tagName === 'OPTION') {
      node.hidden = true;
      node.disabled = true;
      if (node.selected) {
        node.selected = false;
        node.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      node.classList.add('d-none');
      node.setAttribute('aria-hidden', 'true');
    }
    node.setAttribute('data-srd-hidden', 'true');
  }

  function showSrdDomNode(node) {
    if (!node) return;
    if (node.tagName === 'OPTION') {
      node.hidden = false;
      node.disabled = false;
    } else {
      node.classList.remove('d-none');
      node.removeAttribute('aria-hidden');
    }
    node.removeAttribute('data-srd-hidden');
  }

  function syncSrdDomNode(filter, node) {
    if (!filter || !node || node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const raw = node.getAttribute('data-srd-block');
    if (!raw) {
      return;
    }
    const requirements = parseSrdRequirements(raw);
    if (!requirements.length) {
      return;
    }
    const shouldHide = requirements.some(({ type, id }) => !filter.isAllowed(type, id));
    const group = node.getAttribute('data-srd-block-group');
    if (shouldHide) {
      if (node.getAttribute('data-srd-hidden') !== 'true') {
        hideSrdDomNode(node);
        updateSrdNotices(group);
      }
      return;
    }
    if (node.getAttribute('data-srd-hidden') === 'true') {
      showSrdDomNode(node);
      updateSrdNotices(group);
    }
  }

  function refreshSrdNodes(filter) {
    document.querySelectorAll('[data-srd-block]').forEach((node) => syncSrdDomNode(filter, node));
  }

  function initSrdDomGating(filter) {
    if (!filter || typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    refreshSrdNodes(filter);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((added) => {
          if (added.nodeType !== Node.ELEMENT_NODE) {
            return;
          }
          if (added.matches?.('[data-srd-block]')) {
            syncSrdDomNode(filter, added);
          }
          added.querySelectorAll?.('[data-srd-block]').forEach((child) => syncSrdDomNode(filter, child));
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('dmtoolbox:packs-applied', () => {
      try {
        // Reset filter to base SRD allowlist, then merge pack allowlists
        if (filter.resetToBaseAllowlist) {
          filter.resetToBaseAllowlist();
        }

        // Merge content pack allowlists into the filter
        const packManager = window.ContentPackManager;
        if (packManager && filter.mergePackAllowlist) {
          const context = packManager.getMergedContext();
          if (context && context.allowlist) {
            filter.mergePackAllowlist(context.allowlist);
          }
        }

        // Restore original data before re-filtering
        restoreFromBackups();

        // Re-filter all data structures when packs are applied/removed
        pruneSpells(filter);
        pruneLevelUpData(filter);
        // Refresh DOM elements with updated filter state
        refreshSrdNodes(filter);

        // Signal that SRD filtering is complete - content pack runtime can now re-apply records
        window.dispatchEvent(new CustomEvent('dmtoolbox:srd-filtered'));
      } catch (err) {
        console.warn('SRD gating refresh failed:', err);
      }
    });
  }

  window.addEventListener('load', () => {
    const filter = window.SRDContentFilter;
    if (!filter) return;

    try {
      // Create backups before first prune so we can restore when packs change
      createDataBackups();

      pruneSpells(filter);
      pruneLevelUpData(filter);
      initSrdDomGating(filter);
    } catch (err) {
      console.warn('SRD gating failed:', err);
    }
  });
})();