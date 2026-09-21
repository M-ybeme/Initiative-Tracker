import { test, expect } from '@playwright/test';
import {
  watchErrors, installHydrationCounter, loadSheet, readPersisted, seedPersisted, saveViaButton, currentId,
  setSheetFields, readShown,
} from '../helpers/character-sheet.js';

// Character sheet correctness pass: live saving throws, Notes category across loads, last-used character on startup.

const reload = async page => { await page.reload(); await loadSheet(page, { blank: false }); };
const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
const rec = (id, name, extra = {}) => ({ id, name, charClass: 'Fighter', level: 5, stats, ...extra });

test.describe('saving throws follow live ability edits', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  // level 5 => proficiency +3. One ability edit each, nothing else; two abilities, one proficient and one not.
  const cases = [
    { name: 'non-proficient STR', stat: 'statStr', bonus: 'saveStrBonus', prof: 'saveStrProf', isProf: false, score: '16', expected: 3, key: 'str' },
    { name: 'proficient WIS', stat: 'statWis', bonus: 'saveWisBonus', prof: 'saveWisProf', isProf: true, score: '18', expected: 7, key: 'wis' },
    { name: 'proficient DEX lowered', stat: 'statDex', bonus: 'saveDexBonus', prof: 'saveDexProf', isProf: true, score: '8', expected: 2, key: 'dex' },
  ];
  for (const c of cases) {
    test(`${c.name}: shown at once, saved without another edit, and there after a reload`, async ({ page }) => {
      const errors = watchErrors(page);
      await loadSheet(page, { blank: true });
      await setSheetFields(page, {
        charLevel: '5', statStr: '10', statDex: '10', statCon: '10', statInt: '10', statWis: '10', statCha: '10',
        [c.prof]: c.isProf,
      });
      expect(await readShown(page, c.bonus), 'baseline').toBe(String(c.isProf ? 3 : 0));

      await setSheetFields(page, { [c.stat]: c.score }); // the only edit
      expect(await readShown(page, c.bonus), 'visible right after the edit').toBe(String(c.expected));

      const id = await currentId(page);
      const saved = await saveViaButton(page, id); // no other action
      expect(saved.savingThrows[c.key].bonus, 'persisted').toBe(c.expected);
      await reload(page);
      expect(await readShown(page, c.bonus), 'after reload').toBe(String(c.expected));
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('a level edit that raises the proficiency bonus refreshes a proficient save', async ({ page }) => {
    await loadSheet(page, { blank: true });
    await setSheetFields(page, { charLevel: '4', statCon: '14', saveConProf: true });
    expect(await readShown(page, 'saveConBonus')).toBe('4'); // +2 +2
    await setSheetFields(page, { charLevel: '5' });
    expect(await readShown(page, 'saveConBonus')).toBe('5');
  });
});

test.describe('Notes category', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  const pick = (page, cat) => page.evaluate(c => {
    const sel = document.getElementById('notesCategorySelect');
    sel.value = c; sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, cat);
  const notes = page => page.evaluate(() => ({
    cat: document.getElementById('notesCategorySelect').value, text: document.getElementById('charExtraNotes').value,
  }));

  test('the chosen category survives save, character switch and page reload; text stays in its category', async ({ page }) => {
    const errors = watchErrors(page);
    await loadSheet(page, { blank: true });
    await seedPersisted(page, [
      rec('a', 'Alpha', { categorizedNotes: { general: 'A general', sessionNotes: 'A session', lootLeads: '', questHooks: '' } }),
      rec('b', 'Bravo', { categorizedNotes: { general: 'B general', sessionNotes: 'B session', lootLeads: '', questHooks: '' } }),
    ]);
    await page.evaluate(() => localStorage.clear());
    await reload(page);
    expect(await currentId(page)).toBe('a');

    await pick(page, 'sessionNotes');
    expect(await notes(page)).toEqual({ cat: 'sessionNotes', text: 'A session' });
    await setSheetFields(page, { charExtraNotes: 'A session edited' });
    await saveViaButton(page, 'a');

    // switch character: still in Session Notes, showing Bravo's session text
    await page.selectOption('#characterSelect', 'b');
    await page.waitForFunction(() => window.getCurrentCharacter().id === 'b');
    expect(await notes(page)).toEqual({ cat: 'sessionNotes', text: 'B session' });

    // reload: still in Session Notes
    await reload(page);
    expect((await notes(page)).cat).toBe('sessionNotes');

    const persisted = await readPersisted(page);
    expect(persisted.find(c => c.id === 'a').categorizedNotes).toEqual({
      general: 'A general', sessionNotes: 'A session edited', lootLeads: '', questHooks: '',
    });
    expect(persisted.find(c => c.id === 'b').categorizedNotes.general).toBe('B general');
    await pick(page, 'general');
    expect((await notes(page)).text).toBe('B general');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('last-used character on startup', () => {
  test.beforeEach(async ({ page }) => { await installHydrationCounter(page); });

  test('reopens the character last selected; falls back to the first when it was deleted', async ({ page }) => {
    const errors = watchErrors(page);
    page.on('dialog', d => d.accept());
    await loadSheet(page, { blank: true });
    await seedPersisted(page, [rec('a', 'Alpha'), rec('b', 'Bravo'), rec('c', 'Charlie')]);
    await page.evaluate(() => localStorage.clear());
    await reload(page);
    expect(await currentId(page), 'no preference yet: first character').toBe('a');

    await page.selectOption('#characterSelect', 'b');
    await page.waitForFunction(() => window.getCurrentCharacter().id === 'b');
    await reload(page);
    expect(await currentId(page), 'second character reopens').toBe('b');
    expect(await readShown(page, 'charName')).toBe('Bravo');

    // the preference is a UI preference, never part of a character record
    expect(JSON.stringify(await readPersisted(page))).not.toContain('lastCharacter');

    await page.evaluate(() => document.getElementById('deleteCharacterBtn').click());
    await expect.poll(async () => (await readPersisted(page)).map(c => c.id).sort()).toEqual(['a', 'c']);
    await reload(page);
    expect(await currentId(page), 'remembered character is gone: first character').toBe('a');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('creating a character makes it the remembered one, and a stale id is ignored', async ({ page }) => {
    await loadSheet(page, { blank: true });
    await seedPersisted(page, [rec('a', 'Alpha'), rec('b', 'Bravo')]);
    await page.evaluate(() => localStorage.setItem('dmtoolbox.lastCharacterId', 'gone'));
    await reload(page);
    expect(await currentId(page), 'stale id').toBe('a');
    await page.evaluate(() => document.getElementById('newCharacterBtn').click());
    await page.locator('#chooseBlankBtn').click();
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    const newId = await currentId(page);
    expect(await page.evaluate(() => localStorage.getItem('dmtoolbox.lastCharacterId'))).toBe(newId);
  });
});
