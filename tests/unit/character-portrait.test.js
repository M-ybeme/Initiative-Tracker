import { describe, it, expect, beforeEach } from 'vitest';
import { updatePortraitPreview, wirePortraitControlEvents } from '../../js/character/character-portrait.js';

describe('the portrait on the sheet', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <img id="portraitPreview" class="d-none" />
      <span id="portraitPlaceholderText"></span>
      <input id="portraitUrl" value="https://example.test/a.png" />
      <input type="file" id="portraitFile" />
      <button id="applyPortraitUrlBtn"></button>
      <button id="editPortraitBtn"></button>
      <button id="clearPortraitBtn"></button>
      <input id="portraitZoomModal" />`;
  });

  it('shows the picture with its zoom and offset, and hides it when there is none', () => {
    const char = { portraitData: 'data:image/png;base64,AAAA', portraitSettings: { scale: 1.5, offsetX: 12, offsetY: -8 } };
    updatePortraitPreview(char);
    const img = document.getElementById('portraitPreview');
    expect(img.classList.contains('d-none')).toBe(false);
    expect(document.getElementById('portraitPlaceholderText').classList.contains('d-none')).toBe(true);
    expect(img.style.transform).toBe('translate(-50%, -50%) translate(12px, -8px) scale(1.5)');

    updatePortraitPreview({ portraitData: null });
    expect(img.classList.contains('d-none')).toBe(true);
    expect(document.getElementById('portraitPlaceholderText').classList.contains('d-none')).toBe(false);
  });

  it('a portrait with no settings gets the default ones when it is shown', () => {
    const char = { portraitData: 'data:image/png;base64,AAAA' };
    updatePortraitPreview(char);
    expect(char.portraitSettings).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });

  it('Clear removes the portrait from the character and asks the sheet to store it, once', () => {
    const char = { portraitType: 'url', portraitData: 'x', portraitSettings: { scale: 2, offsetX: 1, offsetY: 1 } };
    let stored = 0;
    wirePortraitControlEvents({ getCurrentCharacter: () => char, saveCharactersToStorage: () => { stored++; }, showAppToast: () => {} });
    document.getElementById('clearPortraitBtn').click();
    expect(char).toEqual({ portraitType: null, portraitData: null, portraitSettings: { scale: 1, offsetX: 0, offsetY: 0 } });
    expect(document.getElementById('portraitUrl').value).toBe('');
    expect(stored).toBe(1);
  });

  it('Edit and Apply URL only warn when there is nothing to edit or no URL', () => {
    const toasts = [];
    wirePortraitControlEvents({ getCurrentCharacter: () => ({}), saveCharactersToStorage: () => {}, showAppToast: m => toasts.push(m) });
    document.getElementById('editPortraitBtn').click();
    document.getElementById('portraitUrl').value = '  ';
    document.getElementById('applyPortraitUrlBtn').click();
    expect(toasts).toEqual(['No portrait to edit — upload an image or set a URL first.', 'Enter an image URL first.']);
  });
});
