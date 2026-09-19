import { test, expect } from '@playwright/test';

// Caller-level checks for the Polymorph reference notes, in a real browser: the sheet's own "add spell" flow, and the
// window.appendPolymorphNotesToSpellNotes bridge that the classic level-up-system.js script calls. The text generation
// itself is unit-tested in tests/unit/polymorph-notes.test.js; this proves the wiring around it.

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}

async function loadSheet(page) {
  await page.goto('/characters.html');
  // Also the guard that polymorph-notes.js loaded and ran: character.js imports it, so if it failed to load,
  // character.js would never execute and this function would never exist.
  await page.waitForFunction(() => typeof window.appendPolymorphNotesToSpellNotes === 'function');
  // With no saved character the page offers "new character" in a modal that blocks clicks: choose a blank sheet.
  await page.locator('#chooseBlankBtn').click({ timeout: 8000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
}
const notes = page => page.evaluate(() => document.getElementById('charSpells').value);
const setLevel = (page, level) => page.evaluate(l => {
  const el = document.getElementById('charLevel');
  el.value = String(l);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, level);

// Searches the spell library and clicks the result whose title is exactly `title`, as a user adding it would.
async function addSpellFromSearch(page, title) {
  await page.evaluate(t => {
    const input = document.getElementById('spellSearchInput');
    input.value = t;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, title);
  await page.waitForFunction(t => [...document.querySelectorAll('#spellSearchResults button strong')].some(s => s.textContent.trim() === t), title);
  await page.evaluate(t => {
    const hit = [...document.querySelectorAll('#spellSearchResults button')].find(b => b.querySelector('strong')?.textContent.trim() === t);
    hit.click();
  }, title);
}

test.describe('Polymorph notes on the character sheet', () => {
  test('adding Polymorph from the spell search writes the reference block into the Spells notes', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page);
    await setLevel(page, 5);
    await addSpellFromSearch(page, 'Polymorph');

    const text = await notes(page);
    expect(text.startsWith('=== POLYMORPH (4th Level) ===\nRange: 60 ft')).toBe(true);
    expect(text).toContain('--- Available Beast Forms (CR ≤ 5) ---');
    expect(text).toContain('(No fly or swim restrictions for Polymorph)');
    expect(text).toContain('-- CR 2 --');
    expect(text).toContain('Note: Higher CR beasts (CR 3+) exist in the Monster Manual.');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('True Polymorph gets its own block, and both can sit together without repeating', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page);
    await setLevel(page, 3);
    await addSpellFromSearch(page, 'Polymorph');
    await addSpellFromSearch(page, 'True Polymorph');

    const text = await notes(page);
    expect(text.match(/=== POLYMORPH \(4th Level\) ===/g)).toHaveLength(1);
    expect(text.match(/=== TRUE POLYMORPH \(9th Level\) ===/g)).toHaveLength(1);
    expect(text.indexOf('=== POLYMORPH')).toBeLessThan(text.indexOf('=== TRUE POLYMORPH'));
    expect(text).toContain('\n\n=== TRUE POLYMORPH (9th Level) ===\nRange: 30 ft'); // joined by a blank line
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a spell that is not Polymorph leaves the notes alone', async ({ page }) => {
    await loadSheet(page);
    await page.evaluate(() => { document.getElementById('charSpells').value = 'my own notes'; });
    await addSpellFromSearch(page, 'Fireball');
    expect(await notes(page)).toBe('my own notes');
  });

  test('existing notes are kept and the block is added after a blank line', async ({ page }) => {
    await loadSheet(page);
    await page.evaluate(() => { document.getElementById('charSpells').value = 'my own notes'; });
    await addSpellFromSearch(page, 'Polymorph');
    const text = await notes(page);
    expect(text.startsWith('my own notes\n\n=== POLYMORPH (4th Level) ===')).toBe(true);
  });
});

test.describe('window.appendPolymorphNotesToSpellNotes (the bridge level-up-system.js uses)', () => {
  test('appends once, writes the same text to the character it is given, and is idempotent', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page);
    const result = await page.evaluate(() => {
      const character = { charSpells: '' };
      window.appendPolymorphNotesToSpellNotes('Polymorph', 8, character);
      const first = { textarea: document.getElementById('charSpells').value, character: character.charSpells };
      window.appendPolymorphNotesToSpellNotes('Polymorph', 8, character);
      return { first, again: document.getElementById('charSpells').value };
    });
    expect(result.first.textarea).toContain('--- Available Beast Forms (CR ≤ 8) ---');
    expect(result.first.character).toBe(result.first.textarea); // the character object gets the same text as the textarea
    expect(result.again).toBe(result.first.textarea); // second call adds nothing
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('ignores other spell names', async ({ page }) => {
    await loadSheet(page);
    const after = await page.evaluate(() => {
      window.appendPolymorphNotesToSpellNotes('Wild Shape', 5, { charSpells: '' });
      window.appendPolymorphNotesToSpellNotes('', 5);
      window.appendPolymorphNotesToSpellNotes(undefined, 5);
      return document.getElementById('charSpells').value;
    });
    expect(after).toBe('');
  });

  test('reads the beast data as it is at call time (site.js rewrites it for SRD and homebrew filtering)', async ({ page }) => {
    await loadSheet(page);
    const text = await page.evaluate(() => {
      const original = window.LevelUpData.BEAST_FORMS;
      window.LevelUpData.BEAST_FORMS = { 'CR0': [{ name: 'Probe Beast', ac: 9, hp: 3, speed: '5 ft.', attacks: 'Nibble: +1, 1 piercing', traits: 'Tiny' }] };
      try {
        window.appendPolymorphNotesToSpellNotes('Polymorph', 1, { charSpells: '' });
        return document.getElementById('charSpells').value;
      } finally { window.LevelUpData.BEAST_FORMS = original; }
    });
    expect(text).toContain('Probe Beast | AC 9 | HP 3 | Speed: 5 ft.\n  Attacks: Nibble: +1, 1 piercing\n  Traits: Tiny');
    expect(text).not.toContain('Cat |'); // the real data was not used
  });

  test('with no beast data at all the rules block is still written', async ({ page }) => {
    await loadSheet(page);
    const text = await page.evaluate(() => {
      const original = window.LevelUpData.BEAST_FORMS;
      window.LevelUpData.BEAST_FORMS = undefined;
      try {
        window.appendPolymorphNotesToSpellNotes('True Polymorph', 4, { charSpells: '' });
        return document.getElementById('charSpells').value;
      } finally { window.LevelUpData.BEAST_FORMS = original; }
    });
    expect(text.startsWith('=== TRUE POLYMORPH (9th Level) ===')).toBe(true);
    expect(text).not.toContain('Available Beast Forms');
  });

  test('falls back to the character object when the notes textarea is missing', async ({ page }) => {
    await loadSheet(page);
    const result = await page.evaluate(() => {
      const el = document.getElementById('charSpells');
      const holder = el.parentElement;
      el.remove(); // as if the tab were not rendered
      const character = { charSpells: 'kept' };
      window.appendPolymorphNotesToSpellNotes('Polymorph', 2, character);
      holder.appendChild(el);
      return character.charSpells;
    });
    expect(result.startsWith('kept\n\n=== POLYMORPH (4th Level) ===')).toBe(true);
  });
});
