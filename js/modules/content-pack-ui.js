const MODAL_ID = 'contentPackManagerModal';

const state = {
  manager: null,
  modalInstance: null,
  elements: {},
  packs: [],
  summary: null,
  isImporting: false
};

const hasWindow = typeof window !== 'undefined';
const globalWindow = hasWindow ? /** @type {any} */ (window) : undefined;

function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

function ensureManager(manager) {
  const candidate = manager || globalWindow?.ContentPackManager;
  if (!candidate) {
    console.warn('ContentPackUI: ContentPackManager is not available.');
    return null;
  }
  return candidate;
}

function ensureModal() {
  if (state.elements.modal) {
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal fade content-pack-modal';
  modal.id = MODAL_ID;
  modal.tabIndex = -1;
  modal.setAttribute('aria-labelledby', `${MODAL_ID}Label`);
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h5 class="modal-title mb-0 d-flex align-items-center gap-2" id="${MODAL_ID}Label">
              Manage Content Packs
              <button type="button" class="btn btn-sm btn-outline-info" data-bs-toggle="tooltip" title="Press Ctrl + Alt + D to open the diagnostics panel, then use 'Open Content Pack Manager'.">
                <i class="bi bi-question-circle"></i>
              </button>
            </h5>
            <p class="mb-0 small text-muted">Import private data you own. Packs stay on this device and can be disabled at any time.</p>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-warning d-flex align-items-start gap-2" role="alert">
            <i class="bi bi-shield-lock"></i>
            <div>
              Packs never ship with the public build. Keep them private and cite the sources you own.
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-lg-6">
              <label class="form-label fw-semibold">Paste JSON</label>
              <textarea class="form-control" rows="6" placeholder="{\n  \"metadata\": { ... }\n}" data-pack-input></textarea>
              <div class="d-flex gap-2 mt-2 flex-wrap">
                <button class="btn btn-success btn-sm" data-pack-import>Import JSON</button>
                <button class="btn btn-outline-secondary btn-sm" data-pack-clear-input>Clear</button>
              </div>
            </div>
            <div class="col-12 col-lg-6">
              <label class="form-label fw-semibold">Upload File</label>
              <div class="border rounded p-3 bg-body-secondary">
                <p class="small text-muted mb-2">Drop a .json file or use the picker below.</p>
                <input class="form-control" type="file" accept="application/json,.json" data-pack-file />
                <div class="form-text">Files never leave this browser.</div>
              </div>
              <div class="mt-3">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-semibold">Summary</span>
                  <button class="btn btn-link btn-sm p-0" data-pack-refresh type="button">Refresh</button>
                </div>
                <ul class="list-unstyled mb-0 small" data-pack-summary>
                  <li>Loading…</li>
                </ul>
              </div>
            </div>
          </div>

          <div data-pack-status class="mb-3" aria-live="polite"></div>

          <div>
            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
              <h6 class="mb-0">Installed Packs</h6>
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-outline-danger btn-sm" data-pack-clear-all>Remove All</button>
                <button class="btn btn-outline-secondary btn-sm" data-pack-export-summary>Export Summary</button>
              </div>
            </div>
            <div data-pack-list>
              <p class="text-muted">No packs installed yet. Import your first JSON to get started.</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);

  state.elements.modal = modal;
  state.elements.packList = modal.querySelector('[data-pack-list]');
  state.elements.summary = modal.querySelector('[data-pack-summary]');
  state.elements.status = modal.querySelector('[data-pack-status]');
  state.elements.textarea = modal.querySelector('[data-pack-input]');
  state.elements.importButton = modal.querySelector('[data-pack-import]');
  state.elements.clearInputButton = modal.querySelector('[data-pack-clear-input]');
  state.elements.fileInput = modal.querySelector('[data-pack-file]');
  state.elements.refreshButton = modal.querySelector('[data-pack-refresh]');
  state.elements.clearAllButton = modal.querySelector('[data-pack-clear-all]');
  state.elements.exportSummaryButton = modal.querySelector('[data-pack-export-summary]');
}

function getModalInstance() {
  if (!state.elements.modal || !globalWindow?.bootstrap?.Modal) {
    return null;
  }
  if (!state.modalInstance) {
    state.modalInstance = new globalWindow.bootstrap.Modal(state.elements.modal, {
      backdrop: 'static',
      keyboard: true,
      focus: true
    });
  }
  return state.modalInstance;
}

function openModal() {
  const instance = getModalInstance();
  if (instance) {
    instance.show();
  }
}

function showStatus(type, message, details) {
  if (!state.elements.status) {
    return;
  }
  if (!type) {
    state.elements.status.innerHTML = '';
    return;
  }
  const extra = Array.isArray(details) && details.length
    ? `<ul class="mb-0 mt-2 small">${details.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}</ul>`
    : '';
  state.elements.status.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      ${escapeHtml(message)}
      ${extra}
    </div>`;
}

function escapeHtml(text = '') {
  const safe = typeof text === 'string' ? text : String(text ?? '');
  return safe.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
}

async function handleTextImport() {
  if (state.isImporting) {
    return;
  }
  const text = state.elements.textarea.value.trim();
  if (!text) {
    showStatus('warning', 'Paste JSON into the field before importing.');
    return;
  }
  state.isImporting = true;
  state.elements.importButton.disabled = true;
  showStatus('info', 'Importing content pack…');
  try {
    const result = await state.manager.importPack(text, { sourceName: 'Manual JSON' });
    if (!result.success) {
      showStatus('danger', 'Import failed.', result.errors || []);
      return;
    }
    state.elements.textarea.value = '';
    showStatus('success', `Imported '${result.pack.pack.metadata.name}' successfully.`, result.warnings);
  } catch (err) {
    showStatus('danger', 'Unexpected error during import.', [err.message]);
  } finally {
    state.isImporting = false;
    state.elements.importButton.disabled = false;
  }
}

function handleClearInput() {
  if (state.elements.textarea) {
    state.elements.textarea.value = '';
  }
  showStatus(null);
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  showStatus('info', `Reading ${file.name}…`);
  reader.onload = async () => {
    try {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (!text.trim()) {
        showStatus('warning', 'File is empty.');
        return;
      }
      const result = await state.manager.importPack(text, { sourceName: file.name });
      if (!result.success) {
        showStatus('danger', `Import failed for ${file.name}.`, result.errors || []);
        return;
      }
      showStatus('success', `Imported '${result.pack.pack.metadata.name}' from ${file.name}.`, result.warnings);
    } catch (err) {
      showStatus('danger', 'Unexpected error during file import.', [err.message]);
    } finally {
      event.target.value = '';
    }
  };
  reader.onerror = () => {
    showStatus('danger', `Failed to read ${file.name}.`, [reader.error?.message || 'Unknown error']);
    event.target.value = '';
  };
  reader.readAsText(file);
}

function handleListEvents(event) {
  const target = /** @type {HTMLElement | null} */ (event.target);
  if (!target) return;

  const toggle = target.closest('[data-pack-toggle]');
  if (toggle instanceof HTMLInputElement) {
    const id = toggle.getAttribute('data-pack-toggle');
    const enabled = toggle.checked;
    toggle.disabled = true;
    state.manager.togglePack(id, enabled)
      .then((result) => {
        if (!result.success) {
          showStatus('danger', result.error || 'Failed to update pack');
          toggle.checked = !enabled;
        } else {
          showStatus('success', `${result.pack.pack.metadata.name} is now ${enabled ? 'enabled' : 'disabled'}.`);
        }
      })
      .catch((err) => {
        showStatus('danger', 'Unexpected error while toggling pack.', [err.message]);
        toggle.checked = !enabled;
      })
      .finally(() => {
        toggle.disabled = false;
      });
    return;
  }

  const exportButton = target.closest('[data-pack-export]');
  if (exportButton) {
    const id = exportButton.getAttribute('data-pack-export');
    exportPack(id);
    return;
  }

  const removeButton = target.closest('[data-pack-remove]');
  if (removeButton) {
    const id = removeButton.getAttribute('data-pack-remove');
    removePack(id);
    return;
  }
}

async function exportPack(id) {
  try {
    const result = await state.manager.exportPack(id, { pretty: true });
    if (!result.success) {
      showStatus('danger', result.error || 'Export failed.');
      return;
    }
    const filename = `${result.metadata?.id || 'content-pack'}.json`;
    const blob = new Blob([result.text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showStatus('success', `Exported ${result.metadata?.name || filename}.`);
  } catch (err) {
    showStatus('danger', 'Unexpected error during export.', [err.message]);
  }
}

async function removePack(id) {
  const pack = state.packs.find((entry) => entry.id === id);
  const name = pack?.pack?.metadata?.name || id;
  const confirmed = window.confirm(`Remove '${name}' from this device?`);
  if (!confirmed) {
    return;
  }
  try {
    const result = await state.manager.removePack(id);
    if (!result.success) {
      showStatus('danger', result.error || 'Failed to remove pack.');
      return;
    }
    showStatus('success', `Removed '${name}'.`);
  } catch (err) {
    showStatus('danger', 'Unexpected error while removing pack.', [err.message]);
  }
}

function handleSummaryExport() {
  if (!state.summary) {
    return;
  }
  const payload = {
    generated: new Date().toISOString(),
    summary: state.summary,
    packs: state.packs.map((pack) => ({
      id: pack.id,
      name: pack.pack?.metadata?.name,
      version: pack.pack?.metadata?.version,
      enabled: pack.enabled,
      records: pack.pack?.records?.length || 0,
      sha256: pack.sha256
    }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'content-pack-summary.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showStatus('success', 'Exported pack summary.');
}

async function handleClearAll() {
  if (!state.packs.length) {
    showStatus('info', 'No packs to remove.');
    return;
  }
  const confirmed = window.confirm('Remove all content packs from this browser? This cannot be undone.');
  if (!confirmed) {
    return;
  }
  try {
    await state.manager.clearAll();
    showStatus('success', 'All packs removed.');
  } catch (err) {
    showStatus('danger', 'Unexpected error while clearing packs.', [err.message]);
  }
}

function handleRefresh() {
  if (state.manager?.initialize) {
    state.manager.initialize().then(() => {
      showStatus('info', 'Refreshed pack state.');
    });
  }
}

function renderSummary(summary) {
  state.summary = summary;
  if (!state.elements.summary) {
    return;
  }
  if (!summary) {
    state.elements.summary.innerHTML = '<li>Loading…</li>';
    return;
  }
  state.elements.summary.innerHTML = `
    <li><strong>${summary.totalPacks}</strong> pack${summary.totalPacks === 1 ? '' : 's'} installed</li>
    <li><strong>${summary.enabledPacks}</strong> enabled (${summary.enabledRecords} records active)</li>
    <li>Storage: ${summary.storageDriver}</li>`;
}

function renderPacks(packs) {
  state.packs = packs;
  if (!state.elements.packList) {
    return;
  }
  if (!packs.length) {
    state.elements.packList.innerHTML = '<p class="text-muted">No packs installed yet. Import a JSON file to get started.</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  packs.forEach((entry) => {
    const metadata = entry.pack?.metadata || {};
    const warnings = entry.warnings || [];
    const card = document.createElement('div');
    card.className = 'content-pack-card card mb-3';
    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between flex-wrap gap-3 mb-2">
          <div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <h6 class="mb-0">${escapeHtml(metadata.name || entry.id)}</h6>
              <span class="badge bg-secondary">v${escapeHtml(metadata.version || '1.0.0')}</span>
            </div>
            <div class="small text-muted">${escapeHtml(entry.id)}${entry.sha256 ? ` · ${entry.sha256.slice(0, 12)}…` : ''}</div>
          </div>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" data-pack-toggle="${entry.id}" ${entry.enabled ? 'checked' : ''} />
            <label class="form-check-label small">Enabled</label>
          </div>
        </div>
        <div class="small text-muted mb-2">
          <span class="me-3"><i class="bi bi-collection me-1"></i>${entry.recordCount || entry.pack?.records?.length || 0} records</span>
          ${metadata.source ? `<span><i class="bi bi-bookmark me-1"></i>${escapeHtml(metadata.source)}</span>` : ''}
        </div>
        ${warnings.length ? `<div class="alert alert-warning py-2 px-3 mb-2 small"><i class="bi bi-exclamation-triangle me-1"></i>${warnings.map((w) => escapeHtml(w)).join('<br>')}</div>` : ''}
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-outline-secondary btn-sm" data-pack-export="${entry.id}"><i class="bi bi-download me-1"></i>Export</button>
          <button class="btn btn-outline-danger btn-sm" data-pack-remove="${entry.id}"><i class="bi bi-trash me-1"></i>Remove</button>
        </div>
      </div>`;
    fragment.appendChild(card);
  });
  state.elements.packList.innerHTML = '';
  state.elements.packList.appendChild(fragment);
}

function subscribeToManager() {
  if (!state.manager?.subscribe) {
    console.warn('ContentPackUI: manager does not support subscribe.');
    return;
  }
  state.manager.subscribe((payload) => {
    renderSummary(payload.summary);
    renderPacks(payload.packs);
  }, { immediate: true });
}

function wireEvents() {
  // Lazily initialize tooltip for any diagnostic hint buttons each time modal opens
  state.elements.modal?.addEventListener('shown.bs.modal', () => {
    if (globalWindow?.bootstrap?.Tooltip) {
      state.elements.modal.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((node) => {
        if (!node._tooltipInstance) {
          node._tooltipInstance = new globalWindow.bootstrap.Tooltip(node);
        }
      });
    }
  });

  state.elements.importButton?.addEventListener('click', handleTextImport);
  state.elements.clearInputButton?.addEventListener('click', handleClearInput);
  state.elements.fileInput?.addEventListener('change', handleFileChange);
  state.elements.packList?.addEventListener('click', handleListEvents);
  state.elements.packList?.addEventListener('change', handleListEvents);
  state.elements.clearAllButton?.addEventListener('click', handleClearAll);
  state.elements.exportSummaryButton?.addEventListener('click', handleSummaryExport);
  state.elements.refreshButton?.addEventListener('click', handleRefresh);

  document.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement | null} */ (event.target);
    const trigger = target?.closest('[data-content-pack-open]');
    if (trigger) {
      openModal();
    }
  });
}

export function initContentPackUi(manager) {
  state.manager = ensureManager(manager);
  if (!state.manager) {
    return;
  }
  ready(() => {
    ensureModal();
    wireEvents();
    subscribeToManager();
    if (globalWindow) {
      globalWindow.dmToolboxOpenContentPackManager = openModal;
    }
  });
}

export default initContentPackUi;
