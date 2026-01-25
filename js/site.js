const DM_TOOLBOX_BUILD = {
  name: "The DM's Toolbox",
  version: "2.0.6",
  recentChanges: [
    "Expanded loot generator datasets so each quick bundle has a broad mixed-value pool",
    "Added global error handling plus an in-app diagnostics panel (Ctrl+Alt+D)",
    "Implemented versioned save-data migrations for characters, battle maps, and journals",
    "Documented architecture, coding standards, and new JSDoc type definitions"
  ],
  buildTime: new Date().toISOString(),
  author: "Maybeme"
};

console.log(
  `${DM_TOOLBOX_BUILD.name} v${DM_TOOLBOX_BUILD.version} – built ${DM_TOOLBOX_BUILD.buildTime} by ${DM_TOOLBOX_BUILD.author}`
);

const LICENSE_PHRASE = 'Creative Commons Attribution 4.0 International License';
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

function escapeLicenseHtml(text = '') {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, (char) => entities[char] || char);
}

function formatLicenseAttributionHtml(text, url) {
  const safeText = escapeLicenseHtml(text);
  if (!url) {
    return safeText;
  }
  const encodedPhrase = escapeLicenseHtml(LICENSE_PHRASE);
  if (!safeText.includes(encodedPhrase)) {
    return `${safeText} <a href="${url}" target="_blank" rel="noopener noreferrer">${encodedPhrase}</a>`;
  }
  return safeText.replace(
    encodedPhrase,
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${encodedPhrase}</a>`
  );
}

function buildLicenseBlock(doc, info) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'srd-license-block small text-muted mt-3';

  const attribution = doc.createElement('p');
  attribution.className = 'mb-1';
  attribution.innerHTML = formatLicenseAttributionHtml(info.attributionText, info.licenseUrl);

  const disclaimer = doc.createElement('p');
  disclaimer.className = 'mb-0';
  disclaimer.textContent = info.productIdentityDisclaimer;

  wrapper.appendChild(attribution);
  wrapper.appendChild(disclaimer);
  if (info.srdUrl) {
    const srdLink = doc.createElement('p');
    srdLink.className = 'mb-0';
    srdLink.appendChild(doc.createTextNode('SRD 5.1 Reference PDF: '));
    const link = doc.createElement('a');
    link.href = info.srdUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Download from Wizards';
    srdLink.appendChild(link);
    wrapper.appendChild(srdLink);
  }
  return wrapper;
}

function injectLicenseFooters() {
  if (typeof document === 'undefined') {
    return;
  }
  const footers = document.querySelectorAll('.site-footer');
  if (!footers.length) {
    return;
  }
  const info = window.getSrdLicenseNotices();
  footers.forEach((footer) => {
    if (footer.querySelector('.srd-license-block')) {
      return;
    }
    const host = footer.querySelector('.footer-main .container') || footer;
    host.appendChild(buildLicenseBlock(footer.ownerDocument, info));
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectLicenseFooters, { once: true });
  } else {
    injectLicenseFooters();
  }
}

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
        refreshSrdNodes(filter);
      } catch (err) {
        console.warn('SRD gating refresh failed:', err);
      }
    });
  }

  window.addEventListener('load', () => {
    const filter = window.SRDContentFilter;
    if (!filter) return;

    try {
      pruneSpells(filter);
      pruneLevelUpData(filter);
      initSrdDomGating(filter);
    } catch (err) {
      console.warn('SRD gating failed:', err);
    }
  });
})();