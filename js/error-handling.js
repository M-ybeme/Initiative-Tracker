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
    error: { bg: '#dc3545', border: '#c82333' },
    warning: { bg: '#ffc107', border: '#e0a800', text: '#212529' },
    info: { bg: '#17a2b8', border: '#138496' }
  };
  const color = colors[severity];

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
  const error = getLastError();

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
        <div style="color: #888; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Actions</div>
        <button id="dm-diag-clear-error" style="background: #333; color: #fff; border: 1px solid #555; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;">Clear Error</button>
        <button id="dm-diag-copy" style="background: #333; color: #fff; border: 1px solid #555; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Copy Info</button>
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

    navigator.clipboard.writeText(info).then(() => {
      showUserError('Diagnostic info copied to clipboard', { severity: 'info', duration: 2000 });
    });
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
}

/**
 * Manually toggle the diagnostics panel
 */
export function toggleDiagnosticsPanel() {
  if (diagnosticsPanelToggle) {
    diagnosticsPanelToggle();
  }
}
