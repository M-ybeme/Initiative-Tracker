import { test, expect } from '@playwright/test';

// The New Character choice modal (the sheet's start screen with nothing stored, and the New Character
// button). Bootstrap ignores hide() while a modal is still fading in, so a choice made in that window used
// to create the character and leave the modal and its backdrop open for good (a second click then made a
// second character). The choice's close is now carried out as soon as the modal has finished opening.

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}
const state = page => page.evaluate(() => ({
  backdrops: document.querySelectorAll('.modal-backdrop').length,
  open: [...document.querySelectorAll('.modal.show')].map(m => m.id),
  characters: document.querySelectorAll('#characterSelect option').length,
  loaded: typeof window.getCurrentCharacter === 'function' && window.getCurrentCharacter() !== null
}));

// Clicks "Start blank" a fixed time after the start screen begins to open (from the page's own event, so
// the moment is deterministic, not a race with a test click).
for (const delay of [0, 50, 250]) {
  test(`choosing "blank" ${delay} ms into the start screen's fade-in closes it`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(d => {
      document.addEventListener('show.bs.modal', e => {
        if (e.target.id === 'newCharacterChoiceModal' && !window.__clicked) {
          window.__clicked = true;
          setTimeout(() => document.getElementById('chooseBlankBtn').click(), d);
        }
      }, true);
    }, delay);
    await page.goto('/characters.html');
    await expect.poll(async () => (await state(page)).loaded).toBe(true);
    await expect(page.locator('#newCharacterChoiceModal')).toBeHidden(); // closed once it finished opening
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    expect(await state(page)).toMatchObject({ backdrops: 0, open: [], characters: 1 });
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test('the New Character button: an immediate choice closes the modal, and it opens normally next time', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/characters.html');
  await page.locator('#chooseBlankBtn').click({ timeout: 8000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);

  // open it again and choose in the same task as the open, i.e. mid-fade
  await page.evaluate(() => {
    document.getElementById('newCharacterBtn').click();
    document.getElementById('chooseBlankBtn').click();
  });
  await expect(page.locator('#newCharacterChoiceModal')).toBeHidden();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  expect((await state(page)).characters).toBe(2);

  // A later open is not closed by a leftover request. A pending close runs in the 'shown' handler, and
  // Bootstrap's hide() removes the `show` class at once (the modal then fades out while it still looks visible),
  // so the check is the class, read in the task after 'shown', plus no 'hide' having started.
  const later = await page.evaluate(() => new Promise(resolve => {
    const el = document.getElementById('newCharacterChoiceModal');
    let hideStarted = false;
    el.addEventListener('hide.bs.modal', () => { hideStarted = true; }, { once: true });
    el.addEventListener('shown.bs.modal', () => setTimeout(() => resolve({
      stillShown: el.classList.contains('show'),
      hideStarted
    })), { once: true });
    document.getElementById('newCharacterBtn').click();
  }));
  expect(later).toEqual({ stillShown: true, hideStarted: false });
  await expect(page.locator('#newCharacterChoiceModal')).toHaveClass(/\bshow\b/);
  expect((await state(page)).backdrops).toBe(1);
  await page.locator('#chooseBlankBtn').click();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  expect((await state(page)).characters).toBe(3);
  expect(errors, errors.join('\n')).toEqual([]);
});
