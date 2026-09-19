/**
 * Character "Send to": hand the current character to the Initiative Tracker or the Battle Map.
 *
 * Both hand-offs stage a payload in localStorage (dmtools.pendingImport / dmtools.pendingBattleMapImport) and then
 * navigate; the destination page reads and clears the key. The Battle Map send builds a token image on a canvas from
 * the character's portrait, after a preview dialog where the portrait can be zoomed and dragged for the token.
 * What it needs from character.js comes in as `host`: getCurrentCharacter, saveCurrentCharacter, showAppToast.
 */

const $ = (id) => document.getElementById(id);

// ---------- Token Generation ----------
/**
 * Generates a circular token image for the character
 * @param {Object} char - Character object with portraitData and portraitSettings
 * @returns {Promise<string>} - Base64 data URL of the generated token
 */
async function generateCharacterToken(char) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const size = 200; // Token size
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Helper to load an image
    const loadImage = (src, isPortrait = false) => {
      return new Promise((res, rej) => {
        const img = new Image();
        // Set crossOrigin for URL-based images to avoid canvas tainting
        if (isPortrait && src.startsWith('http')) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => res(img);
        img.onerror = () => rej(new Error(`Failed to load image: ${src}`));
        img.src = src;
      });
    };

    // Main token generation logic
    const generateToken = async () => {
      try {
        // Draw circular clipping path - slightly smaller to fit within the frame border
        const clipRadius = (size / 2) * 0.88; // 88% of full radius to account for frame border
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, clipRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (char.portraitData) {
          // Character has a portrait - use it with their positioning
          const portraitImg = await loadImage(char.portraitData, true);
          const settings = char.portraitSettings || { scale: 1, offsetX: 0, offsetY: 0 };

          // Apply the character's portrait settings
          ctx.save();
          ctx.translate(size / 2, size / 2);
          ctx.translate(settings.offsetX || 0, settings.offsetY || 0);
          ctx.scale(settings.scale || 1, settings.scale || 1);

          // Draw portrait centered
          const imgWidth = portraitImg.width;
          const imgHeight = portraitImg.height;
          ctx.drawImage(portraitImg, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
          ctx.restore();

          // Load and draw the frame overlay
          try {
            const frameImg = await loadImage('images/tokens/CharacterTokenFrame.png');
            ctx.restore(); // Remove circular clip for frame
            ctx.drawImage(frameImg, 0, 0, size, size);
          } catch (frameErr) {
            console.warn('Could not load character token frame, using simple circle:', frameErr);
            ctx.restore(); // Just remove clip, portrait already drawn
          }
        } else {
          // No portrait - use base token with character name
          try {
            const baseImg = await loadImage('images/tokens/BaseToken.png');
            ctx.drawImage(baseImg, 0, 0, size, size);
            ctx.restore(); // Remove circular clip

            // Add character name/initials as text
            const name = (char.name || '').trim();
            if (name) {
              ctx.fillStyle = '#000000';
              ctx.font = 'bold 48px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              // Use first letter or first two letters if available
              const initials = name.length > 1 ? name.substring(0, 2).toUpperCase() : name.substring(0, 1).toUpperCase();
              ctx.fillText(initials, size / 2, size / 2 + 10);
            }
          } catch (baseErr) {
            console.warn('Could not load base token, using colored circle:', baseErr);
            ctx.restore(); // Remove circular clip

            // Fallback: draw a simple colored circle with initials
            ctx.fillStyle = '#8B7355'; // Brown/tan color
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();

            const name = (char.name || '').trim();
            if (name) {
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 48px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const initials = name.length > 1 ? name.substring(0, 2).toUpperCase() : name.substring(0, 1).toUpperCase();
              ctx.fillText(initials, size / 2, size / 2);
            }
          }
        }

        // Convert canvas to base64
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };

    generateToken();
  });
}

// ---------- Send current character to Initiative Tracker ----------
// Exported so the payload builder can be unit-tested; nothing else imports it.
export function buildTrackerCharacterFromCurrent(host) {
  const char = host.getCurrentCharacter();
  if (!char) {
    host.showAppToast('No character selected.', 'warning');
    return null;
  }

  const name = (char.name || '').trim();
  if (!name) {
    host.showAppToast('Character needs a name before sending to the tracker.', 'warning');
    return null;
  }

  // Prefer maxHP, fall back to currentHP
  const maxHP = Number(char.maxHP);
  const curHP = Number(char.currentHP);
  const hpBase = Number.isFinite(maxHP) && maxHP > 0
    ? maxHP
    : (Number.isFinite(curHP) && curHP > 0 ? curHP : 0);

  if (!hpBase) {
    host.showAppToast('Set a Max HP before sending to the tracker.', 'warning');
    return null;
  }

  const acVal = Number(char.ac);
  if (!Number.isFinite(acVal) || acVal <= 0) {
    host.showAppToast('Set a valid AC before sending to the tracker.', 'warning');
    return null;
  }

  return {
    // no id needed; tracker’s normalizeChar() will assign one
    name,
    type: 'PC',              // default: treat as player character
    initiative: 0,           // default as requested
    currentHP: hpBase,
    maxHP: hpBase,
    tempHP: 0,
    ac: acVal,
    notes: '',
    concentration: false,
    deathSaves: { s: 0, f: 0, stable: false },
    status: [],
    concDamagePending: 0
  };
}

function sendCurrentCharacterToTracker(host) {
  // Make sure we're sending the latest form values
  host.saveCurrentCharacter();
  const trackerChar = buildTrackerCharacterFromCurrent(host);
  if (!trackerChar) return;

  const session = {
    __dmtoolsVersion: 1,
    mode: 'append',          // IMPORTANT: do not wipe existing tracker list
    characters: [trackerChar],
    currentTurn: 0,
    combatRound: 1,
    diceHistory: []
  };

  try {
    localStorage.setItem('dmtools.pendingImport', JSON.stringify(session));
  } catch (e) {
    console.error('localStorage error:', e);
    host.showAppToast('Could not stage data for the tracker (localStorage error).', 'danger');
    return;
  }

  // Navigate to the initiative tracker page
  window.location.href = 'initiative.html#autoinput';
}

// Token preview modal state
const tokenPreviewState = {
  char: null,
  image: null,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  lastX: 0,
  lastY: 0
};

function openTokenPreviewModal(char, host) {
  const modal = bootstrap.Modal.getOrCreateInstance($('tokenPreviewModal'));

  // Check for URL-based portrait CORS issue
  if (char.portraitData && char.portraitData.startsWith('http')) {
    host.showAppToast('Portrait URLs cannot be used for battle map tokens (CORS restriction). Upload an image file instead.', 'warning');
    return;
  }

  tokenPreviewState.char = char;
  tokenPreviewState.zoom = 1;
  tokenPreviewState.offsetX = 0;
  tokenPreviewState.offsetY = 0;

  // Load the image
  if (char.portraitData) {
    const img = new Image();
    img.onload = () => {
      tokenPreviewState.image = img;
      updateTokenPreview();
      modal.show();
    };
    img.onerror = () => {
      host.showAppToast('Failed to load portrait image.', 'danger');
    };
    img.src = char.portraitData;
  } else {
    // No portrait - show base token
    tokenPreviewState.image = null;
    updateTokenPreview();
    modal.show();
  }

  // Reset zoom slider
  const zoomSlider = $('tokenZoom');
  if (zoomSlider) zoomSlider.value = 1;
}

function updateTokenPreview() {
  const canvas = $('tokenPreviewCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  // Draw circular clipping path - match the final token clip radius
  const clipRadius = (size / 2) * 0.88; // Same as generateCharacterToken
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, clipRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (tokenPreviewState.image) {
    // Draw portrait with current settings
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.translate(tokenPreviewState.offsetX, tokenPreviewState.offsetY);
    ctx.scale(tokenPreviewState.zoom, tokenPreviewState.zoom);

    const img = tokenPreviewState.image;
    ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
    ctx.restore();
  } else {
    // Draw base token placeholder
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 0, size, size);

    const name = (tokenPreviewState.char?.name || '').trim();
    if (name) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initials = name.length > 1 ? name.substring(0, 2).toUpperCase() : name.substring(0, 1).toUpperCase();
      ctx.fillText(initials, size / 2, size / 2);
    }
  }

  ctx.restore();
}

async function confirmSendToBattleMap(host) {
  const char = tokenPreviewState.char;
  if (!char) return;

  const name = (char.name || '').trim();
  if (!name) {
    host.showAppToast('Character needs a name before sending to the battle map.', 'warning');
    return;
  }

  // Close the modal
  const modal = bootstrap.Modal.getInstance($('tokenPreviewModal'));
  if (modal) modal.hide();

  // Generate token with current preview settings
  let tokenData;
  try {
    const customChar = {
      ...char,
      portraitSettings: {
        scale: tokenPreviewState.zoom,
        offsetX: tokenPreviewState.offsetX,
        offsetY: tokenPreviewState.offsetY
      }
    };
    tokenData = await generateCharacterToken(customChar);
  } catch (error) {
    console.error('Failed to generate character token:', error);
    host.showAppToast('Failed to generate character token. Please try again.', 'danger');
    return;
  }

  // Create battle map character object
  const battleMapChar = {
    name,
    tokenImage: tokenData,
    type: 'PC'
  };

  const data = {
    __dmtoolsVersion: 1,
    mode: 'append',
    tokens: [battleMapChar]
  };

  try {
    localStorage.setItem('dmtools.pendingBattleMapImport', JSON.stringify(data));
  } catch (e) {
    console.error('localStorage error:', e);
    host.showAppToast('Could not stage data for the battle map (localStorage error).', 'danger');
    return;
  }

  // Navigate to the battle map page
  window.location.href = 'battlemap.html#autoinput';
}

function sendCurrentCharacterToBattleMap(host) {
  // Make sure we're sending the latest form values
  host.saveCurrentCharacter();
  const char = host.getCurrentCharacter();
  if (!char) {
    host.showAppToast('No character selected.', 'warning');
    return;
  }

  const name = (char.name || '').trim();
  if (!name) {
    host.showAppToast('Character needs a name before sending to the battle map.', 'warning');
    return;
  }

  // If character has no portrait, skip modal and send directly with base token
  if (!char.portraitData) {
    // Set up state with default values for base token
    tokenPreviewState.char = char;
    tokenPreviewState.image = null;
    tokenPreviewState.zoom = 1;
    tokenPreviewState.offsetX = 0;
    tokenPreviewState.offsetY = 0;
    confirmSendToBattleMap(host);
    return;
  }

  // Open the token preview modal for portrait adjustment
  openTokenPreviewModal(char, host);
}

export function wireSendToEvents(host) {
  const sendToTrackerBtn = $('sendToTrackerBtn');
  if (sendToTrackerBtn) {
    sendToTrackerBtn.addEventListener('click', () => sendCurrentCharacterToTracker(host));
  }

  const sendToBattleMapBtn = $('sendToBattleMapBtn');
  if (sendToBattleMapBtn) {
    sendToBattleMapBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendCurrentCharacterToBattleMap(host);
    });
  }
}

export function wireTokenPreviewEvents(host) {
  // Token preview modal events
  const tokenZoomSlider = $('tokenZoom');
  if (tokenZoomSlider) {
    tokenZoomSlider.addEventListener('input', (e) => {
      tokenPreviewState.zoom = parseFloat(e.target.value);
      updateTokenPreview();
    });
  }

  const tokenPreviewCanvas = $('tokenPreviewCanvas');
  if (tokenPreviewCanvas) {
    tokenPreviewCanvas.addEventListener('pointerdown', (e) => {
      tokenPreviewState.isDragging = true;
      tokenPreviewState.lastX = e.clientX;
      tokenPreviewState.lastY = e.clientY;
      tokenPreviewCanvas.style.cursor = 'grabbing';
    });

    tokenPreviewCanvas.addEventListener('pointermove', (e) => {
      if (!tokenPreviewState.isDragging) return;

      const dx = e.clientX - tokenPreviewState.lastX;
      const dy = e.clientY - tokenPreviewState.lastY;

      tokenPreviewState.offsetX += dx;
      tokenPreviewState.offsetY += dy;

      tokenPreviewState.lastX = e.clientX;
      tokenPreviewState.lastY = e.clientY;

      updateTokenPreview();
    });

    tokenPreviewCanvas.addEventListener('pointerup', () => {
      tokenPreviewState.isDragging = false;
      tokenPreviewCanvas.style.cursor = 'grab';
    });

    tokenPreviewCanvas.addEventListener('pointercancel', () => {
      tokenPreviewState.isDragging = false;
      tokenPreviewCanvas.style.cursor = 'grab';
    });
  }

  const resetTokenPositionBtn = $('resetTokenPosition');
  if (resetTokenPositionBtn) {
    resetTokenPositionBtn.addEventListener('click', () => {
      tokenPreviewState.zoom = 1;
      tokenPreviewState.offsetX = 0;
      tokenPreviewState.offsetY = 0;
      const zoomSlider = $('tokenZoom');
      if (zoomSlider) zoomSlider.value = 1;
      updateTokenPreview();
    });
  }

  const confirmSendToMapBtn = $('confirmSendToMapBtn');
  if (confirmSendToMapBtn) {
    confirmSendToMapBtn.addEventListener('click', () => confirmSendToBattleMap(host));
  }
}
