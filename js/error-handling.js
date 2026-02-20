// @ts-check

/**
 * Error Handling Module
 * Global error handlers and user-friendly error utilities
 * No external dependencies, no network calls
 */

/**
 * @typedef {Object} ErrorContext
 * @property {string} [page] - Current page name
 * @property {string} [action] - Action being performed when error occurred
 * @property {string} [component] - Component that threw the error
 */

/**
 * @typedef {Object} LastError
 * @property {string} message - Error message
 * @property {string} [stack] - Stack trace
 * @property {string} timestamp - ISO timestamp
 * @property {string} page - Page where error occurred
 * @property {string} type - 'error' | 'unhandledrejection'
 */

/** @type {LastError|null} */
let lastError = null;

/** @type {(() => void)|null} */
let diagnosticsPanelToggle = null;

/**
 * Get the current page name from URL
 * @returns {string}
 */
function getCurrentPage() {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || 'index.html';
  return filename.replace('.html', '');
}

/**
 * Get build version info
 * @returns {{name: string, version: string, buildTime: string}}
 */
function getBuildInfo() {
  // @ts-ignore - DM_TOOLBOX_BUILD is defined in site.js
  if (typeof DM_TOOLBOX_BUILD !== 'undefined') {
    return {
      // @ts-ignore
      name: DM_TOOLBOX_BUILD.name,
      // @ts-ignore
      version: DM_TOOLBOX_BUILD.version,
      // @ts-ignore
      buildTime: DM_TOOLBOX_BUILD.buildTime
    };
  }
  return { name: 'Unknown', version: '0.0.0', buildTime: 'Unknown' };
}

/**
 * Format error for console output
 * @param {Error|string} error
 * @param {string} type
 * @returns {string}
 */
function formatErrorForConsole(error, type) {
  const build = getBuildInfo();
  const page = getCurrentPage();
  const timestamp = new Date().toISOString();

  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';

  return [
    `\n========== ${build.name} Error Report ==========`,
    `Type: ${type}`,
    `Page: ${page}`,
    `Version: ${build.version}`,
    `Time: ${timestamp}`,
    `Message: ${errorMessage}`,
    stack ? `\nStack Trace:\n${stack}` : '',
    `================================================\n`
  ].filter(Boolean).join('\n');
}

/**
 * Store the last error for diagnostics
 * @param {Error|string} error
 * @param {string} type
 */
function storeLastError(error, type) {
  lastError = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    page: getCurrentPage(),
    type
  };
}

/**
 * Initialize global error handlers
 * Call this once on page load (in site.js)
 */
export function initGlobalErrorHandlers() {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    console.error(formatErrorForConsole(error, 'Uncaught Error'));
    storeLastError(error, 'error');

    // Don't prevent default - let browser show error in console too
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    console.error(formatErrorForConsole(error, 'Unhandled Promise Rejection'));
    storeLastError(error, 'unhandledrejection');
  });

  console.log('Global error handlers initialized');
}

/**
 * Show a user-friendly error message
 * Displays a non-technical message to the user and logs technical details to console
 *
 * @param {string} userMessage - User-friendly message to display
 * @param {Object} [options]
 * @param {string} [options.technicalDetails] - Technical details for console
 * @param {Error} [options.error] - Original error object
 * @param {ErrorContext} [options.context] - Additional context
 * @param {'error'|'warning'|'info'} [options.severity='error'] - Severity level
 * @param {number} [options.duration=5000] - How long to show toast (ms), 0 for persistent
 */
export function showUserError(userMessage, options = {}) {
  const { technicalDetails, error, context, severity = 'error' } = options;

  // Log technical details to console
  if (technicalDetails || error) {
    const consoleMethod = severity === 'error' ? 'error' : severity === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${severity.toUpperCase()}] ${userMessage}`);
    if (technicalDetails) {
      console[consoleMethod]('Technical details:', technicalDetails);
    }
    if (error) {
      console[consoleMethod]('Error:', error);
    }
    if (context) {
      console[consoleMethod]('Context:', context);
    }
  }

  // Store as last error if it's an actual error
  if (error) {
    storeLastError(error, 'user-reported');
  }

  // Try to show toast if showToast is available (defined in some pages)
  // @ts-ignore
  if (typeof showToast === 'function') {
    // @ts-ignore
    showToast(userMessage, severity);
    return;
  }

  // Fallback: create a simple toast notification
  showFallbackToast(userMessage, severity, options.duration);
}

/**
 * Fallback toast notification when showToast isn't available
 * @param {string} message
 * @param {'error'|'warning'|'info'} severity
 * @param {number} [duration=5000]
 */
function showFallbackToast(message, severity, duration = 5000) {
  // Remove existing toast if any
  const existing = document.getElementById('dm-toolbox-error-toast');
  if (existing) {
    existing.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'dm-toolbox-error-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  // Style based on severity
  const colors = {
    error: { bg: '#1b1b1b', border: '#ff6b6b', text: '#fff' },
    warning: { bg: '#302400', border: '#ffcc66', text: '#fff' },
    info: { bg: '#001f3f', border: '#66c2ff', text: '#fff' }
  };
  const color = colors[severity] || colors.error;

  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    max-width: 400px;
    padding: 12px 20px;
    background: ${color.bg};
    color: ${color.text || '#fff'};
    border: 1px solid ${color.border};
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;

  // Add animation keyframes if not present
  if (!document.getElementById('dm-toolbox-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'dm-toolbox-toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove after duration (unless duration is 0)
  if (duration > 0) {
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Click to dismiss
  toast.addEventListener('click', () => {
    toast.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  });
}

/**
 * Get the last recorded error
 * @returns {LastError|null}
 */
export function getLastError() {
  return lastError;
}

/**
 * Clear the last recorded error
 */
export function clearLastError() {
  lastError = null;
}

// ============================================================
// COMMON ERROR HANDLERS
// ============================================================

/**
 * Handle storage errors (localStorage/IndexedDB)
 * @param {Error} error
 * @param {'save'|'load'|'delete'} operation
 * @param {string} [itemType='data']
 */
export function handleStorageError(error, operation, itemType = 'data') {
  const isQuotaError = error.name === 'QuotaExceededError' ||
                       error.message.includes('quota') ||
                       error.message.includes('storage');

  let userMessage;
  if (isQuotaError) {
    userMessage = `Storage is full. Try removing some ${itemType} to free up space.`;
  } else if (operation === 'save') {
    userMessage = `Failed to save ${itemType}. Please try again.`;
  } else if (operation === 'load') {
    userMessage = `Failed to load ${itemType}. The data may be corrupted.`;
  } else {
    userMessage = `Failed to delete ${itemType}. Please try again.`;
  }

  showUserError(userMessage, {
    error,
    technicalDetails: `Storage ${operation} failed for ${itemType}`,
    context: { action: operation, component: 'storage' }
  });
}

/**
 * Handle import/export errors
 * @param {Error} error
 * @param {'import'|'export'} operation
 * @param {string} [format='file']
 */
export function handleExportError(error, operation, format = 'file') {
  const userMessage = operation === 'import'
    ? `Failed to import ${format}. The file may be corrupted or in an unsupported format.`
    : `Failed to export ${format}. Please try again.`;

  showUserError(userMessage, {
    error,
    technicalDetails: `${operation} failed for format: ${format}`,
    context: { action: operation, component: 'export' }
  });
}

// ============================================================
// DIAGNOSTICS PANEL
// ============================================================

const DIAGNOSTICS_LICENSE_PHRASE = 'Creative Commons Attribution 4.0 International License';
const SRD_PDF_URL = 'https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf';
const DIAGNOSTICS_LICENSE_DEFAULTS = {
  attributionText: 'This work includes material from the System Reference Document 5.1 by Wizards of the Coast LLC and is licensed for our use under the Creative Commons Attribution 4.0 International License.',
  productIdentityDisclaimer: 'The DM\'s Toolbox references rules and mechanics from the Dungeons & Dragons 5e System Reference Document 5.1. Wizards of the Coast, Dungeons & Dragons, Forgotten Realms, Ravenloft, Eberron, the dragon ampersand, beholders, githyanki, githzerai, mind flayers, yuan-ti, and all other Wizards of the Coast product identity are trademarks of Wizards of the Coast LLC in the U.S.A. and other countries. The DM\'s Toolbox is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  srdUrl: SRD_PDF_URL
};

function resolveDiagnosticsLicenseInfo() {
  if (typeof window !== 'undefined') {
    if (typeof window.getSrdLicenseNotices === 'function') {
      return window.getSrdLicenseNotices();
    }
    if (window.SRDLicensing) {
      return {
        attributionText: window.SRDLicensing.attributionText || DIAGNOSTICS_LICENSE_DEFAULTS.attributionText,
        productIdentityDisclaimer: window.SRDLicensing.productIdentityDisclaimer || DIAGNOSTICS_LICENSE_DEFAULTS.productIdentityDisclaimer,
        licenseUrl: window.SRDLicensing.licenseUrl || DIAGNOSTICS_LICENSE_DEFAULTS.licenseUrl,
        srdUrl: window.SRDLicensing.srdUrl || DIAGNOSTICS_LICENSE_DEFAULTS.srdUrl
      };
    }
  }
  return { ...DIAGNOSTICS_LICENSE_DEFAULTS };
}

function diagnosticsEscapeHtml(text = '') {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, (char) => entities[char] || char);
}

function formatDiagnosticsAttribution(text, url) {
  const safeText = diagnosticsEscapeHtml(text);
  if (!url) {
    return safeText;
  }
  const encodedPhrase = diagnosticsEscapeHtml(DIAGNOSTICS_LICENSE_PHRASE);
  if (!safeText.includes(encodedPhrase)) {
    return `${safeText} <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#6fe7d2;">${encodedPhrase}</a>`;
  }
  return safeText.replace(
    encodedPhrase,
    `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#6fe7d2;">${encodedPhrase}</a>`
  );
}

function formatDiagnosticsTimestamp(value) {
  if (!value) {
    return 'unknown';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  return date.toLocaleString();
}

async function getContentPackDiagnostics() {
  if (typeof window === 'undefined') {
    return { available: false, summary: null, packs: [], error: 'Window is unavailable' };
  }

  const manager = window.ContentPackManager;
  if (!manager) {
    return { available: false, summary: null, packs: [], error: 'ContentPackManager not initialized' };
  }

  try {
    if (typeof manager.initialize === 'function') {
      await manager.initialize();
    }
    const summary = typeof manager.getSummary === 'function' ? manager.getSummary() : null;
    const packs = typeof manager.getPacks === 'function' ? manager.getPacks() : [];
    return { available: true, summary, packs, error: null };
  } catch (err) {
    return {
      available: false,
      summary: null,
      packs: [],
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Get storage statistics
 * @returns {Promise<{characters: number, journals: number, localStorage: string, indexedDB: string}>}
 */
async function getStorageStats() {
  let characterCount = 0;
  let journalCount = 0;
  let localStorageSize = '0 KB';
  let indexedDBStatus = 'Not available';

  // Check if IndexedDB is supported
  if ('indexedDB' in window) {
    indexedDBStatus = 'Available';
  }

  // Count characters from DMToolboxDB (direct IndexedDB query)
  try {
    characterCount = await countCharacters();
  } catch (e) {
    // Ignore errors - DB may not exist
  }

  // If no characters from IndexedDB, try localStorage as fallback
  if (characterCount === 0) {
    try {
      const key = 'dmtoolboxCharactersV1';
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        characterCount = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Count journal entries from JournalDB (separate IndexedDB)
  try {
    journalCount = await countJournalEntries();
  } catch (e) {
    // Ignore errors - journal DB may not exist
  }

  // Calculate localStorage usage
  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        totalSize += (localStorage.getItem(k) || '').length * 2; // UTF-16
      }
    }
    localStorageSize = (totalSize / 1024).toFixed(2) + ' KB';
  } catch (e) {
    // Ignore errors
  }

  return {
    characters: characterCount,
    journals: journalCount,
    localStorage: localStorageSize,
    indexedDB: indexedDBStatus
  };
}

/**
 * Count characters from DMToolboxDB IndexedDB
 * @returns {Promise<number>}
 */
function countCharacters() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('DMToolboxDB', 1);

      request.onerror = () => resolve(0);

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('characters')) {
          db.close();
          resolve(0);
          return;
        }

        const transaction = db.transaction(['characters'], 'readonly');
        const store = transaction.objectStore('characters');
        const countRequest = store.count();

        countRequest.onsuccess = () => {
          db.close();
          resolve(countRequest.result);
        };

        countRequest.onerror = () => {
          db.close();
          resolve(0);
        };
      };

      // If DB doesn't exist yet, this will be called
      request.onupgradeneeded = () => {
        // Don't create the store, just abort
        request.transaction?.abort();
      };
    } catch (e) {
      resolve(0);
    }
  });
}

/**
 * Count journal entries from JournalDB IndexedDB
 * @returns {Promise<number>}
 */
function countJournalEntries() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('JournalDB', 1);

      request.onerror = () => resolve(0);

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('entries')) {
          db.close();
          resolve(0);
          return;
        }

        const transaction = db.transaction(['entries'], 'readonly');
        const store = transaction.objectStore('entries');
        const countRequest = store.count();

        countRequest.onsuccess = () => {
          db.close();
          resolve(countRequest.result);
        };

        countRequest.onerror = () => {
          db.close();
          resolve(0);
        };
      };

      // If DB doesn't exist yet, this will be called
      request.onupgradeneeded = () => {
        // Don't create the store, just close and return 0
        request.transaction?.abort();
      };
    } catch (e) {
      resolve(0);
    }
  });
}

/**
 * Create and show the diagnostics panel
 */
async function showDiagnosticsPanel() {
  // Remove existing panel
  const existing = document.getElementById('dm-toolbox-diagnostics');
  if (existing) {
    existing.remove();
    return; // Toggle off
  }

  const build = getBuildInfo();
  const page = getCurrentPage();
  const stats = await getStorageStats();
  const packDiagnostics = await getContentPackDiagnostics();
  const error = getLastError();
  const licenseInfo = resolveDiagnosticsLicenseInfo();
  const licenseAttributionHtml = formatDiagnosticsAttribution(licenseInfo.attributionText, licenseInfo.licenseUrl);
  const licenseDisclaimerHtml = diagnosticsEscapeHtml(licenseInfo.productIdentityDisclaimer);
  const srdPdfLinkHtml = licenseInfo.srdUrl
    ? `<div style="font-size: 11px; line-height: 1.5; margin-top: 6px;">SRD 5.2 Reference PDF: <a href="${diagnosticsEscapeHtml(licenseInfo.srdUrl)}" target="_blank" rel="noopener noreferrer" style="color:#6fe7d2;">Download from Wizards</a></div>`
    : '';

  const packSectionHtml = (() => {
    if (!packDiagnostics.available) {
      const detail = packDiagnostics.error ? ` (${diagnosticsEscapeHtml(packDiagnostics.error)})` : '';
      return `<div style="color: #888;">Unavailable${detail}</div>`;
    }
    const summary = packDiagnostics.summary;
    if (!summary) {
      return '<div style="color: #888;">No content pack data yet.</div>';
    }
    const summaryHtml = `
      <div>Total: ${summary.totalPacks}</div>
      <div>Enabled: ${summary.enabledPacks} (${summary.enabledRecords} records)</div>
      <div>Storage: ${diagnosticsEscapeHtml(summary.storageDriver || 'unknown')}</div>`;
    if (!packDiagnostics.packs.length) {
      return summaryHtml + '<div style="color: #888; margin-top: 4px;">No packs installed.</div>';
    }
    const listItems = packDiagnostics.packs
      .map((entry) => {
        const metadata = entry.pack?.metadata || {};
        const name = diagnosticsEscapeHtml(metadata.name || entry.id);
        const version = metadata.version ? ` v${diagnosticsEscapeHtml(metadata.version)}` : '';
        const status = entry.enabled ? 'Enabled' : 'Disabled';
        const recordCount = entry.recordCount ?? (entry.pack?.records?.length || 0);
        const hash = entry.sha256 ? `${diagnosticsEscapeHtml(entry.sha256.slice(0, 12))}…` : 'n/a';
        const importedAt = formatDiagnosticsTimestamp(entry.importedAt);
        const updatedAt = formatDiagnosticsTimestamp(entry.updatedAt);
        const timelineBits = [];
        if (importedAt !== 'unknown') {
          timelineBits.push(`Imported ${importedAt}`);
        }
        if (updatedAt !== 'unknown' && updatedAt !== importedAt) {
          timelineBits.push(`Updated ${updatedAt}`);
        }
        if (entry.sourceName) {
          timelineBits.push(`Source file: ${diagnosticsEscapeHtml(entry.sourceName)}`);
        }
        const metadataBits = [];
        if (metadata.source) {
          metadataBits.push(`Source: ${diagnosticsEscapeHtml(metadata.source)}`);
        }
        if (Array.isArray(metadata.authors) && metadata.authors.length) {
          metadataBits.push(`Authors: ${metadata.authors.map((author) => diagnosticsEscapeHtml(author)).join(', ')}`);
        }
        if (metadata.license) {
          metadataBits.push(`License: ${diagnosticsEscapeHtml(metadata.license)}`);
        }
        return `<li style="margin-bottom: 10px;">
            <div>${name}${version ? `<span style="color:#888;">${version}</span>` : ''}</div>
            <div style="color:#ccc; font-size: 11px;">${status} · ${recordCount} records · hash ${hash}</div>
            ${timelineBits.length ? `<div style="color:#888; font-size: 11px; margin-top: 2px;">${timelineBits.join(' · ')}</div>` : ''}
            ${metadataBits.length ? `<div style="color:#777; font-size: 11px; margin-top: 2px;">${metadataBits.join(' · ')}</div>` : ''}
          </li>`;
      })
      .join('');
    return `${summaryHtml}<ul style="list-style:none; padding-left: 0; margin: 6px 0 0;">${listItems}</ul>`;
  })();

  const panel = document.createElement('div');
  panel.id = 'dm-toolbox-diagnostics';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 350px;
    max-height: 80vh;
    overflow-y: auto;
    background: #1a1a2e;
    color: #eee;
    border: 1px solid #4a4a6a;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    z-index: 99999;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
  `;

  panel.innerHTML = `
    <div style="padding: 12px; border-bottom: 1px solid #4a4a6a; display: flex; justify-content: space-between; align-items: center;">
      <strong style="font-size: 14px;">Diagnostics Panel</strong>
      <button id="dm-diag-close" style="background: none; border: none; color: #aaa; cursor: pointer; font-size: 18px;">&times;</button>
    </div>
    <div style="padding: 12px;">
      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Application</div>
        <div><strong>${build.name}</strong></div>
        <div>Version: ${build.version}</div>
        <div>Built: ${new Date(build.buildTime).toLocaleString()}</div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Current Page</div>
        <div>${page}</div>
        <div style="color: #888; font-size: 10px; word-break: break-all;">${window.location.href}</div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Storage</div>
        <div>Characters: ${stats.characters}</div>
        <div>Journal Entries: ${stats.journals}</div>
        <div>localStorage: ${stats.localStorage}</div>
        <div>IndexedDB: ${stats.indexedDB}</div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Last Error</div>
        ${error ? `
          <div style="background: #2a1a1a; padding: 8px; border-radius: 4px; border-left: 3px solid #dc3545;">
            <div style="color: #dc3545;">${error.type}</div>
            <div style="margin: 4px 0; word-break: break-word;">${error.message}</div>
            <div style="color: #888; font-size: 10px;">${error.page} @ ${new Date(error.timestamp).toLocaleTimeString()}</div>
          </div>
        ` : `<div style="color: #6c6;">No errors recorded</div>`}
      </div>

      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Content Packs</div>
        ${packSectionHtml}
        <div style="margin-top: 8px;">
          <button data-content-pack-open type="button" style="background: #0f3d5c; color: #fff; border: 1px solid #1fa4d1; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
            Open Content Pack Manager
          </button>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Actions</div>
        <button id="dm-diag-clear-error" style="background: #333; color: #fff; border: 1px solid #555; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;">Clear Error</button>
        <button id="dm-diag-copy" style="background: #333; color: #fff; border: 1px solid #555; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Copy Info</button>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Data Backup</div>
        <button id="dm-diag-export-all" style="background: #1d4d1d; color: #fff; border: 1px solid #2d7d2d; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;">Export All Data</button>
        <button id="dm-diag-import-all" style="background: #4d3d1d; color: #fff; border: 1px solid #7d6d2d; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Import All Data</button>
        <div style="color: #888; font-size: 10px; margin-top: 6px;">Export/import all characters, journal entries, and settings as a single backup file.</div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Licensing</div>
        <div style="font-size: 11px; line-height: 1.5;">${licenseAttributionHtml}</div>
        <div style="font-size: 11px; line-height: 1.5; margin-top: 6px;">${licenseDisclaimerHtml}</div>
        ${srdPdfLinkHtml}
      </div>

      <div style="color: #666; font-size: 10px; text-align: center; margin-top: 8px;">
        Press Ctrl+Alt+D to toggle
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Event handlers
  document.getElementById('dm-diag-close')?.addEventListener('click', () => panel.remove());

  document.getElementById('dm-diag-clear-error')?.addEventListener('click', () => {
    clearLastError();
    showDiagnosticsPanel(); // Refresh
    showDiagnosticsPanel();
  });

  document.getElementById('dm-diag-copy')?.addEventListener('click', () => {
    const info = [
      `${build.name} v${build.version}`,
      `Page: ${page}`,
      `URL: ${window.location.href}`,
      `Characters: ${stats.characters}`,
      `Journal Entries: ${stats.journals}`,
      `localStorage: ${stats.localStorage}`,
      error ? `Last Error: ${error.message} (${error.type})` : 'No errors'
    ].join('\n');

    const infoLines = [info];
    if (packDiagnostics.available && packDiagnostics.summary) {
      infoLines.push(`Content Packs: ${packDiagnostics.summary.totalPacks} installed, ${packDiagnostics.summary.enabledPacks} enabled`);
      packDiagnostics.packs.forEach((entry) => {
        const name = entry.pack?.metadata?.name || entry.id;
        const recordCount = entry.recordCount ?? (entry.pack?.records?.length || 0);
        infoLines.push(` - ${name}: ${entry.enabled ? 'enabled' : 'disabled'}, ${recordCount} records, hash ${entry.sha256 || 'n/a'}`);
      });
    } else {
      infoLines.push('Content Packs: unavailable');
    }

    navigator.clipboard.writeText(infoLines.join('\n')).then(() => {
      showUserError('Diagnostic info copied to clipboard', { severity: 'info', duration: 2000 });
    });
  });

  // Export All Data handler
  document.getElementById('dm-diag-export-all')?.addEventListener('click', async () => {
    try {
      const allData = await gatherAllData();
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dm-toolbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showUserError('Backup exported successfully!', { severity: 'info', duration: 3000 });
    } catch (err) {
      showUserError('Failed to export data. See console for details.', {
        error: err instanceof Error ? err : new Error(String(err)),
        severity: 'error'
      });
    }
  });

  // Import All Data handler
  document.getElementById('dm-diag-import-all')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await restoreAllData(data);
        showUserError('Backup restored successfully! Refreshing page...', { severity: 'info', duration: 2000 });
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        showUserError('Failed to import data. The file may be corrupted or invalid.', {
          error: err instanceof Error ? err : new Error(String(err)),
          severity: 'error'
        });
      }
    };
    input.click();
  });
}

// ============================================================
// EXPORT/IMPORT ALL DATA HELPERS
// ============================================================

/**
 * Gather all user data from IndexedDB and localStorage
 * @returns {Promise<Object>}
 */
async function gatherAllData() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: getBuildInfo().version,
    characters: [],
    journalEntries: [],
    localStorage: {},
    initiativeData: null,
    battlemapData: null
  };

  // Gather characters from DMToolboxDB
  try {
    backup.characters = await getAllCharacters();
  } catch (e) {
    console.warn('Could not export characters:', e);
  }

  // Gather journal entries from JournalDB
  try {
    backup.journalEntries = await getAllJournalEntries();
  } catch (e) {
    console.warn('Could not export journal entries:', e);
  }

  // Gather relevant localStorage items
  const lsKeys = [
    'dmtoolboxCharactersV1',
    'initiativeRoster',
    'initiativeCurrentTurn',
    'initiativeRound',
    'initiativeHistory',
    'battlemapState',
    'encounterRoster',
    'srdFilterSettings'
  ];

  for (const key of lsKeys) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        backup.localStorage[key] = value;
      }
    } catch (e) {
      console.warn(`Could not export localStorage key ${key}:`, e);
    }
  }

  return backup;
}

/**
 * Get all characters from DMToolboxDB
 * @returns {Promise<Array>}
 */
function getAllCharacters() {
  return new Promise((resolve, _reject) => {
    try {
      const request = indexedDB.open('DMToolboxDB', 1);

      request.onerror = () => resolve([]);

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('characters')) {
          db.close();
          resolve([]);
          return;
        }

        const transaction = db.transaction(['characters'], 'readonly');
        const store = transaction.objectStore('characters');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          db.close();
          resolve(getAllRequest.result || []);
        };

        getAllRequest.onerror = () => {
          db.close();
          resolve([]);
        };
      };

      request.onupgradeneeded = () => {
        request.transaction?.abort();
      };
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Get all journal entries from JournalDB
 * @returns {Promise<Array>}
 */
function getAllJournalEntries() {
  return new Promise((resolve, _reject) => {
    try {
      const request = indexedDB.open('JournalDB', 1);

      request.onerror = () => resolve([]);

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('entries')) {
          db.close();
          resolve([]);
          return;
        }

        const transaction = db.transaction(['entries'], 'readonly');
        const store = transaction.objectStore('entries');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          db.close();
          resolve(getAllRequest.result || []);
        };

        getAllRequest.onerror = () => {
          db.close();
          resolve([]);
        };
      };

      request.onupgradeneeded = () => {
        request.transaction?.abort();
      };
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Restore all user data from a backup
 * @param {Object} backup
 */
async function restoreAllData(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup data');
  }

  // Validate backup version
  if (backup.version !== 1) {
    throw new Error('Unsupported backup version');
  }

  // Restore characters to DMToolboxDB
  if (Array.isArray(backup.characters) && backup.characters.length > 0) {
    await restoreCharacters(backup.characters);
  }

  // Restore journal entries to JournalDB
  if (Array.isArray(backup.journalEntries) && backup.journalEntries.length > 0) {
    await restoreJournalEntries(backup.journalEntries);
  }

  // Restore localStorage items
  if (backup.localStorage && typeof backup.localStorage === 'object') {
    for (const [key, value] of Object.entries(backup.localStorage)) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn(`Could not restore localStorage key ${key}:`, e);
      }
    }
  }
}

/**
 * Restore characters to DMToolboxDB
 * @param {Array} characters
 */
function restoreCharacters(characters) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DMToolboxDB', 1);

    request.onerror = () => reject(new Error('Could not open DMToolboxDB'));

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('characters')) {
        db.createObjectStore('characters', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['characters'], 'readwrite');
      const store = transaction.objectStore('characters');

      let completed = 0;
      for (const char of characters) {
        const putRequest = store.put(char);
        putRequest.onsuccess = () => {
          completed++;
          if (completed === characters.length) {
            db.close();
            resolve();
          }
        };
        putRequest.onerror = () => {
          completed++;
          if (completed === characters.length) {
            db.close();
            resolve();
          }
        };
      }

      if (characters.length === 0) {
        db.close();
        resolve();
      }
    };
  });
}

/**
 * Restore journal entries to JournalDB
 * @param {Array} entries
 */
function restoreJournalEntries(entries) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('JournalDB', 1);

    request.onerror = () => reject(new Error('Could not open JournalDB'));

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');

      let completed = 0;
      for (const entry of entries) {
        const putRequest = store.put(entry);
        putRequest.onsuccess = () => {
          completed++;
          if (completed === entries.length) {
            db.close();
            resolve();
          }
        };
        putRequest.onerror = () => {
          completed++;
          if (completed === entries.length) {
            db.close();
            resolve();
          }
        };
      }

      if (entries.length === 0) {
        db.close();
        resolve();
      }
    };
  });
}

/**
 * Initialize diagnostics panel keyboard shortcut
 * Call this once on page load
 */
export function initDiagnosticsPanel() {
  // Listen for Ctrl+Alt+D
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      showDiagnosticsPanel();
    }
  });

  // Store toggle function for external access
  diagnosticsPanelToggle = showDiagnosticsPanel;

  // Expose toggle function globally for footer settings button
  window.toggleDiagnosticsPanel = showDiagnosticsPanel;
}

/**
 * Manually toggle the diagnostics panel
 */
export function toggleDiagnosticsPanel() {
  if (diagnosticsPanelToggle) {
    diagnosticsPanelToggle();
  }
}
