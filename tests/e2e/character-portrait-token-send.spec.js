import { test, expect } from '@playwright/test';
import {
  watchErrors, installHydrationCounter, loadSheet, readPersisted, saveViaButton, currentId, setSheetFields, readShown,
} from '../helpers/character-sheet.js';

// Portrait editing, the battle map token preview, and "Send to" (Initiative Tracker / Battle Map) on characters.html,
// in a real browser. Send-to hands data to the next page through localStorage keys and then navigates; the tests record
// what is staged and stub the destination pages, so the exact payload can be compared without loading them.

const domClick = (page, id) => page.evaluate(i => document.getElementById(i).click(), id);

async function stageRecorder(page) {
  const staged = [];
  await page.exposeFunction('__staged', (key, value) => { staged.push({ key, value: JSON.parse(value) }); });
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('dmtools.pending')) window.__staged(key, value);
      return original.call(this, key, value);
    };
  });
  await page.route(/\/(initiative|battlemap)\.html/, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
  return staged;
}

const SHEET = { charName: 'Tokena Sendwell', charAC: '17', charMaxHP: '44', charCurrentHP: '31', charTempHP: '5', charInitMod: '3', charConditions: 'Poisoned' };

// A solid red 100x100 PNG as a data URL, made in the page.
const redPortrait = page => page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 100; c.height = 100;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 100, 100);
  return c.toDataURL('image/png');
});

// Decodes a token data URL and reports its size and the colour at a point.
const probeImage = (page, dataUrl, x, y) => page.evaluate(([url, px, py]) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    resolve({ width: img.width, height: img.height, pixel: Array.from(ctx.getImageData(px, py, 1, 1).data) });
  };
  img.onerror = () => reject(new Error('token image did not decode'));
  img.src = url;
}), [dataUrl, x, y]);

const canvasPixel = (page, x, y) => page.evaluate(([px, py]) => {
  const c = document.getElementById('tokenPreviewCanvas');
  return Array.from(c.getContext('2d').getImageData(px, py, 1, 1).data);
}, [x, y]);

async function openSheet(page) {
  await installHydrationCounter(page);
  await loadSheet(page, { blank: true });
}

// Applies a portrait from a URL through the portrait dialog; zoom/pan are optional.
async function applyPortraitFromUrl(page, url, { zoom, pan } = {}) {
  await setSheetFields(page, { portraitUrl: url });
  await page.evaluate(() => new Promise(resolve => {
    document.getElementById('portraitModal').addEventListener('shown.bs.modal', () => resolve(), { once: true });
    document.getElementById('applyPortraitUrlBtn').click();
  }));
  if (zoom !== undefined) await setSheetFields(page, { portraitZoomModal: zoom });
  if (pan) {
    const box = await page.locator('#portraitContainerModal').boundingBox();
    const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + pan.dx, cy + pan.dy, { steps: 4 });
    await page.mouse.up();
  }
  await page.locator('#savePortraitModalBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
}

test.describe('Portrait', () => {
  test('applying a portrait from a URL saves its type, data and settings, and it survives a reload', async ({ page }) => {
    const errors = watchErrors(page);
    await openSheet(page);
    const red = await redPortrait(page);
    await applyPortraitFromUrl(page, red, { zoom: 1.5, pan: { dx: 12, dy: -8 } });
    const saved = await saveViaButton(page, await currentId(page));
    expect(saved.portraitType).toBe('url');
    expect(saved.portraitData).toBe(red);
    expect(saved.portraitSettings.scale).toBe(1.5);
    expect(saved.portraitSettings.offsetX, 'dragging the image in the dialog moves it right').toBe(12);
    expect(saved.portraitSettings.offsetY, 'and up').toBe(-8);

    await page.reload();
    await loadSheet(page, { blank: false });
    const shown = await page.evaluate(() => {
      const img = document.getElementById('portraitPreview');
      return { visible: !img.classList.contains('d-none'), src: img.getAttribute('src'), transform: img.style.transform, url: document.getElementById('portraitUrl').value };
    });
    expect(shown.visible).toBe(true);
    expect(shown.src).toBe(red);
    expect(shown.transform).toBe('translate(-50%, -50%) translate(12px, -8px) scale(1.5)');
    expect(shown.url, 'the URL box shows a URL portrait').toBe(red);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a portrait picked from a file is saved as image data', async ({ page }) => {
    await openSheet(page);
    const red = await redPortrait(page);
    const buffer = Buffer.from(red.split(',')[1], 'base64');
    const opened = page.evaluate(() => new Promise(resolve => {
      document.getElementById('portraitModal').addEventListener('shown.bs.modal', () => resolve(), { once: true });
    }));
    await page.locator('#portraitFile').setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer });
    await opened;
    await page.locator('#savePortraitModalBtn').click();
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    const saved = await saveViaButton(page, await currentId(page));
    expect(saved.portraitType).toBe('data');
    expect(saved.portraitData).toBe(red);
    expect(saved.portraitSettings).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });

  test('a non-image file is refused and nothing opens', async ({ page }) => {
    await openSheet(page);
    await page.locator('#portraitFile').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(page.locator('#appToastBody')).toHaveText('Please select a valid image file.');
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    expect((await page.evaluate(() => window.getCurrentCharacter().portraitData)) || null).toBeNull();
  });

  test('editing reopens the dialog with the saved zoom, and clearing removes the portrait', async ({ page }) => {
    await openSheet(page);
    const red = await redPortrait(page);
    await applyPortraitFromUrl(page, red, { zoom: 2 });
    const id = await currentId(page);
    await saveViaButton(page, id);

    await page.evaluate(() => new Promise(resolve => {
      document.getElementById('portraitModal').addEventListener('shown.bs.modal', () => resolve(), { once: true });
      document.getElementById('editPortraitBtn').click();
    }));
    expect(await readShown(page, 'portraitZoomModal'), 'zoom slider starts at the saved zoom').toBe('2');
    await page.locator('#savePortraitModalBtn').click();
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);

    await domClick(page, 'clearPortraitBtn');
    const cleared = await saveViaButton(page, id);
    expect(cleared.portraitType).toBeNull();
    expect(cleared.portraitData).toBeNull();
    expect(cleared.portraitSettings).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
    expect(await page.evaluate(() => [document.getElementById('portraitPreview').classList.contains('d-none'), document.getElementById('portraitUrl').value])).toEqual([true, '']);
  });

  test('edit with no portrait, and apply with an empty URL, only warn', async ({ page }) => {
    await openSheet(page);
    await domClick(page, 'editPortraitBtn');
    await expect(page.locator('#appToastBody')).toHaveText('No portrait to edit — upload an image or set a URL first.');
    await domClick(page, 'applyPortraitUrlBtn');
    await expect(page.locator('#appToastBody')).toHaveText('Enter an image URL first.');
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  });
});

test.describe('Send to the Initiative Tracker', () => {
  test('stages exactly this payload and goes to the tracker', async ({ page }) => {
    const errors = watchErrors(page);
    const staged = await stageRecorder(page);
    await openSheet(page);
    await setSheetFields(page, SHEET);
    await domClick(page, 'sendToTrackerBtn');
    await page.waitForURL(/initiative\.html#autoinput$/);

    expect(staged).toEqual([{
      key: 'dmtools.pendingImport',
      value: {
        __dmtoolsVersion: 1,
        mode: 'append',
        characters: [{
          name: 'Tokena Sendwell', type: 'PC', initiative: 0, currentHP: 44, maxHP: 44, tempHP: 0, ac: 17,
          notes: '', concentration: false, deathSaves: { s: 0, f: 0, stable: false }, status: [], concDamagePending: 0,
        }],
        currentTurn: 0, combatRound: 1, diceHistory: [],
      },
    }]);
    // the sheet was saved first, so the stored character has the values that were just typed
    expect((await readPersisted(page))[0].name).toBe('Tokena Sendwell');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('falls back to current HP when there is no max HP', async ({ page }) => {
    const staged = await stageRecorder(page);
    await openSheet(page);
    await setSheetFields(page, { ...SHEET, charMaxHP: '', charCurrentHP: '23' });
    await domClick(page, 'sendToTrackerBtn');
    await page.waitForURL(/initiative\.html#autoinput$/);
    expect([staged[0].value.characters[0].currentHP, staged[0].value.characters[0].maxHP]).toEqual([23, 23]);
  });

  for (const [label, fields, message] of [
    ['an HP value', { charMaxHP: '', charCurrentHP: '' }, 'Set a Max HP before sending to the tracker.'],
    ['a valid AC', { charAC: '0' }, 'Set a valid AC before sending to the tracker.'],
  ]) {
    test(`needs ${label}: warns, stages nothing, stays on the sheet`, async ({ page }) => {
      const staged = await stageRecorder(page);
      await openSheet(page);
      await setSheetFields(page, { ...SHEET, ...fields });
      await domClick(page, 'sendToTrackerBtn');
      await expect(page.locator('#appToastBody')).toHaveText(message);
      expect(staged).toEqual([]);
      expect(page.url()).not.toContain('initiative');
    });
  }
});

test.describe('Send to the Battle Map and the token preview', () => {
  test('with no portrait it goes straight to the map with a generated base token', async ({ page }) => {
    const errors = watchErrors(page);
    const staged = await stageRecorder(page);
    await openSheet(page);
    await setSheetFields(page, SHEET);
    await domClick(page, 'sendToBattleMapBtn');
    await page.waitForURL(/battlemap\.html#autoinput$/);

    expect(staged).toHaveLength(1);
    const { key, value } = staged[0];
    expect(key).toBe('dmtools.pendingBattleMapImport');
    expect(Object.keys(value)).toEqual(['__dmtoolsVersion', 'mode', 'tokens']);
    expect([value.__dmtoolsVersion, value.mode, value.tokens.length]).toEqual([1, 'append', 1]);
    expect(Object.keys(value.tokens[0])).toEqual(['name', 'tokenImage', 'type']);
    expect([value.tokens[0].name, value.tokens[0].type]).toEqual(['Tokena Sendwell', 'PC']);
    expect(value.tokens[0].tokenImage.startsWith('data:image/png;base64,')).toBe(true);
    const probe = await probeImage(page, value.tokens[0].tokenImage, 100, 100);
    expect([probe.width, probe.height]).toEqual([200, 200]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('with a portrait the preview opens, zoom and reset work, and confirming sends the adjusted token', async ({ page }) => {
    const errors = watchErrors(page);
    const staged = await stageRecorder(page);
    await openSheet(page);
    await setSheetFields(page, SHEET);
    const red = await redPortrait(page);
    await applyPortraitFromUrl(page, red);

    await domClick(page, 'sendToBattleMapBtn');
    await expect(page.locator('#tokenPreviewModal')).toBeVisible();
    await expect(page.locator('#tokenPreviewModal')).toHaveClass(/show/);
    expect(await readShown(page, 'tokenZoom'), 'preview opens at zoom 1').toBe('1');
    const small = await canvasPixel(page, 125, 60); // above the 100px image at zoom 1
    expect(small[3], 'nothing drawn away from the small image').toBe(0);
    expect(await canvasPixel(page, 125, 125), 'the image is at the centre').toEqual([255, 0, 0, 255]);

    await setSheetFields(page, { tokenZoom: 3 }); // 100px * 3 fills the token
    const zoomed = await canvasPixel(page, 125, 60);
    expect(zoomed).toEqual([255, 0, 0, 255]);

    // drag the image off the top-left, then reset
    const box = await page.locator('#tokenPreviewCanvas').boundingBox();
    await page.mouse.move(box.x + 125, box.y + 125);
    await page.mouse.down();
    await page.mouse.move(box.x + 125 + 240, box.y + 125 + 240, { steps: 4 });
    await page.mouse.up();
    const dragged = await canvasPixel(page, 5, 125);
    expect(dragged[3], 'the zoomed image was moved away from the left edge').toBe(0);
    await domClick(page, 'resetTokenPosition');
    expect(await readShown(page, 'tokenZoom'), 'reset puts the slider back to 1').toBe('1');
    expect(await canvasPixel(page, 125, 125), 'and the image back at the centre').toEqual([255, 0, 0, 255]);
    expect((await canvasPixel(page, 125, 60))[3], 'at zoom 1').toBe(0);

    await setSheetFields(page, { tokenZoom: 3 });
    await page.locator('#confirmSendToMapBtn').click();
    await page.waitForURL(/battlemap\.html#autoinput$/);
    expect(staged).toHaveLength(1);
    const token = staged[0].value.tokens[0];
    const probe = await probeImage(page, token.tokenImage, 100, 40);
    expect([token.name, token.type]).toEqual(['Tokena Sendwell', 'PC']);
    expect([probe.width, probe.height]).toEqual([200, 200]);
    expect(probe.pixel, 'the token carries the zoom chosen in the preview').toEqual([255, 0, 0, 255]);
    // the portrait itself was not changed by adjusting the token
    expect((await readPersisted(page))[0].portraitSettings).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a portrait URL cannot be used for a token', async ({ page }) => {
    const staged = await stageRecorder(page);
    await openSheet(page);
    await setSheetFields(page, SHEET);
    await applyPortraitFromUrl(page, 'https://example.invalid/portrait.png');
    await domClick(page, 'sendToBattleMapBtn');
    await expect(page.locator('#appToastBody')).toContainText('Portrait URLs cannot be used for battle map tokens');
    await expect(page.locator('#tokenPreviewModal')).not.toBeVisible();
    expect(staged).toEqual([]);
  });
});
