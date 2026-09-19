/**
 * Character portrait: the picture on the sheet and the dialog that edits it (file or URL, zoom, drag).
 *
 * The portrait itself (portraitType, portraitData, portraitSettings) lives on the character and is saved with it.
 * This module owns only the dialog's working copy (editingPortrait) and the DOM handling around it. What it needs
 * from character.js comes in as `host`: getCurrentCharacter, saveCharactersToStorage, showAppToast.
 */

const $ = (id) => document.getElementById(id);

let editingPortrait = null; // { type, data, settings }

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
export function updatePortraitPreview(char) {
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

export function wirePortraitControlEvents(host) {
  $('portraitFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      host.showAppToast('Please select a valid image file.', 'warning');
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
    if (!url) { host.showAppToast('Enter an image URL first.', 'warning'); return; }
    openPortraitModalFor('url', url, { scale: 1, offsetX: 0, offsetY: 0 });
  });
  $('editPortraitBtn').addEventListener('click', () => {
    const char = host.getCurrentCharacter();
    if (!char || !char.portraitData) {
      host.showAppToast('No portrait to edit — upload an image or set a URL first.', 'warning');
      return;
    }
    openPortraitModalFor(char.portraitType || 'data', char.portraitData, ensurePortraitSettings(char));
  });
  $('clearPortraitBtn').addEventListener('click', () => {
    const char = host.getCurrentCharacter();
    if (!char) return;
    char.portraitType = null;
    char.portraitData = null;
    char.portraitSettings = { scale: 1, offsetX: 0, offsetY: 0 };
    $('portraitUrl').value = '';
    updatePortraitPreview(char);
    host.saveCharactersToStorage();
  });
  $('portraitZoomModal').addEventListener('input', e => {
    if (!editingPortrait) return;
    const val = parseFloat(e.target.value);
    editingPortrait.settings.scale = isNaN(val) ? 1 : val;
    applyModalPortraitTransform();
  });
}

export function wirePortraitEditorEvents(host) {
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
    const char = host.getCurrentCharacter();
    if (!char) return;
    char.portraitType = editingPortrait.type;
    char.portraitData = editingPortrait.data;
    char.portraitSettings = Object.assign(
      { scale: 1, offsetX: 0, offsetY: 0 },
      editingPortrait.settings || {}
    );
    host.saveCharactersToStorage();
    updatePortraitPreview(char);
    bootstrap.Modal.getOrCreateInstance($('portraitModal')).hide();
    editingPortrait = null;
  });
  $('portraitModal').addEventListener('hidden.bs.modal', () => { editingPortrait = null; });
}
