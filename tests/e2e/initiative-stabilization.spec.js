import { test, expect } from '@playwright/test';

// Initiative Tracker stabilization pass, in real Chromium: focus and clicks across re-renders, a
// commit for a combatant that no longer exists, storage-driven re-renders from another tab (the
// tracker's only external source of state today), mobile duplicate-row safety, and the combat log
// rendering untrusted text.

const char = (id, name, initiative, extra = {}) => ({
  id, name, type: 'Enemy', initiative,
  currentHP: 20, maxHP: 20, tempHP: 0, ac: 12, notes: '',
  concentration: false, deathSaves: { s: 0, f: 0, stable: false },
  status: [], concDamagePending: 0,
  ...extra
});
const ABC = () => [char('id-A', 'Alpha', 30), char('id-B', 'Bravo', 20), char('id-C', 'Charlie', 10)];

// Seeds localStorage before any page script runs, once per tab (the guard survives reloads), and
// counts this tab's writes of the tracker's key and the storage events it receives.
async function seed(page, characters, extra = {}) {
  await page.addInitScript(([chars, more]) => {
    window.__writes = 0;
    window.__storageEvents = 0;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'initiativeTrackerData') window.__writes++;
      return setItem.call(this, k, v);
    };
    addEventListener('storage', e => { if (e.key === 'initiativeTrackerData') window.__storageEvents++; });
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.clear();
    localStorage.setItem('initiativeHelpSeen', '1');
    localStorage.setItem('initiativeTrackerData', JSON.stringify({ characters: chars, currentTurn: 0, combatRound: 1, ...more }));
  }, [characters, extra]);
  await page.goto('/initiative.html');
}
// A second tab on the same origin: its saves reach the first tab as real `storage` events.
async function openOtherTab(context, viewport) {
  const other = await context.newPage();
  if (viewport) await other.setViewportSize(viewport);
  await other.goto('/initiative.html');
  await expect(other.locator('#initiative-order tr').first()).toBeAttached();
  return other;
}
const savedState = page => page.evaluate(() => JSON.parse(localStorage.getItem('initiativeTrackerData')));
const savedChar = async (page, id) => (await savedState(page)).characters.find(c => c.id === id);
const nextFrames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

function watch(page) {
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
  page.on('dialog', d => { problems.push(`dialog: ${d.type()} ${d.message()}`); d.dismiss().catch(() => {}); });
  return problems;
}
// What has focus, described by what the tracker's controls are (list, combatant, kind).
const focused = page => page.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return 'body';
  const list = a.closest('#initiative-order') ? 'desktop' : a.closest('#mobile-initiative-order') ? 'mobile' : 'elsewhere';
  return `${list}:${a.dataset.characterId}:${a.dataset.field || a.dataset.action || a.className}`;
});
// The rendered list against the saved model: exact counts in both views, no repeated ids, same order.
// Polls: a redraw held for a press or focus move runs a click or a task after the save, so an immediate
// comparison could see the pre-redraw list; a hold that never releases fails the poll.
async function expectListMatchesModel(page) {
  const snapshot = () => page.evaluate(() => ({
    rows: [...document.querySelectorAll('#initiative-order tr')].map(r => r.dataset.characterId),
    cards: [...document.querySelectorAll('#mobile-initiative-order .card')].map(r => r.dataset.characterId),
    model: JSON.parse(localStorage.getItem('initiativeTrackerData')).characters.map(c => c.id)
  }));
  await expect.poll(async () => {
    const { rows, cards, model } = await snapshot();
    return { rowsMatch: JSON.stringify(rows) === JSON.stringify(model), cardsMatch: JSON.stringify(cards) === JSON.stringify(model) };
  }).toEqual({ rowsMatch: true, cardsMatch: true });
  const { model } = await snapshot();
  expect(new Set(model).size).toBe(model.length);
  return model.length;
}
// No render/save loop: after the tabs go quiet, neither writes again or receives another event.
async function expectQuiet(...pages) {
  await Promise.all(pages.map(nextFrames));
  const before = await Promise.all(pages.map(p => p.evaluate(() => [window.__writes, window.__storageEvents])));
  await pages[0].waitForTimeout(400); // there is no event for "nothing happened"; a loop would show here
  const after = await Promise.all(pages.map(p => p.evaluate(() => [window.__writes, window.__storageEvents])));
  expect(after).toEqual(before);
}

// A held redraw runs a task (or a click) after the action that asked for it. Tests that go on to type
// must wait for the redraw itself, not for focus: focus can already be on the old element, which the
// redraw then replaces (typing into the twin without its selection gave "420" instead of "4").
const handleOf = locator => locator.elementHandle();
const replaced = handle => expect.poll(() => handle.evaluate(el => el.isConnected)).toBe(false);

const desktop = { width: 1280, height: 800 };
const mobile = { width: 390, height: 844 };
const row = (page, id) => page.locator(`#initiative-order tr[data-character-id="${id}"]`);
const card = (page, id) => page.locator(`#mobile-initiative-order .card[data-character-id="${id}"]`);

test.describe('focus and clicks across re-renders (desktop)', () => {
  test.use({ viewport: desktop });

  test('Tab out of an edited field commits it and lands on the next field of the same combatant', async ({ page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const name = row(page, 'id-B').locator('.name-input');
    const oldInit = await handleOf(row(page, 'id-B').locator('.init-input'));
    await name.fill('Brutus');
    await name.press('Tab');
    await replaced(oldInit); // the commit's held redraw has run
    await expect.poll(() => focused(page)).toBe('desktop:id-B:initiative');
    expect((await savedChar(page, 'id-B')).name).toBe('Brutus');
    await expect(row(page, 'id-B').locator('.name-input')).toHaveValue('Brutus');

    // keep typing: the keystrokes go into the re-rendered initiative field
    await page.keyboard.press('Control+A');
    await page.keyboard.type('25');
    const oldName = await handleOf(row(page, 'id-B').locator('.name-input'));
    await page.keyboard.press('Shift+Tab'); // back to the name field; the initiative edit commits
    await replaced(oldName);
    await expect.poll(() => focused(page)).toBe('desktop:id-B:name');
    expect((await savedChar(page, 'id-B')).initiative).toBe(25);
    await expectListMatchesModel(page);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('Enter commits and keeps focus in the same field, following the combatant through a re-sort', async ({ page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const init = row(page, 'id-C').locator('.init-input');
    await init.fill('99');
    await init.press('Enter');
    expect((await savedState(page)).characters.map(c => c.id)).toEqual(['id-C', 'id-A', 'id-B']); // re-sorted
    await expect.poll(() => focused(page)).toBe('desktop:id-C:initiative');
    await expect(row(page, 'id-C').locator('.init-input')).toBeFocused();

    const name = row(page, 'id-A').locator('.name-input');
    await name.fill('Alfred');
    await name.press('Enter');
    await expect.poll(() => focused(page)).toBe('desktop:id-A:name');
    await page.keyboard.press('Escape'); // still a working editor: nothing is edited, so nothing changes
    expect((await savedChar(page, 'id-A')).name).toBe('Alfred');
    await expectListMatchesModel(page);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('editing a field and then clicking a button on another row applies both (the click used to be lost)', async ({ page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    await row(page, 'id-B').locator('.health-input').fill('7');
    await row(page, 'id-A').locator('.hit-btn[data-delta="-5"]').click();
    await expect.poll(async () => (await savedChar(page, 'id-A')).currentHP).toBe(15);
    expect((await savedChar(page, 'id-B')).currentHP).toBe(7);
    await expect(row(page, 'id-A').locator('.health-input')).toHaveValue('15');
    await expect(row(page, 'id-B').locator('.health-input')).toHaveValue('7');

    // a re-sorting edit followed by a click on a row that moves: the click still reaches its combatant
    await row(page, 'id-C').locator('.init-input').fill('50');
    await row(page, 'id-C').locator('.react-btn').click();
    await expect.poll(async () => (await savedChar(page, 'id-C')).reactionUsed).toBe(true);
    expect((await savedChar(page, 'id-C')).initiative).toBe(50);
    expect((await savedState(page)).characters.map(c => c.id)).toEqual(['id-C', 'id-A', 'id-B']);
    const log = (await savedState(page)).combatLog;
    expect(log.map(e => e.summary)).toEqual(['Damage 13', 'Damage 5', 'Reaction Used']); // each once
    await expectListMatchesModel(page);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('editing a field and then clicking into another row\'s field leaves focus there', async ({ page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    await row(page, 'id-B').locator('.name-input').fill('Brutus');
    const oldHp = await handleOf(row(page, 'id-C').locator('.health-input'));
    await row(page, 'id-C').locator('.health-input').click();
    await replaced(oldHp); // the name commit's held redraw has run: typing now goes to the live field
    await expect.poll(() => focused(page)).toBe('desktop:id-C:hp');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('4');
    await page.keyboard.press('Tab');
    expect((await savedChar(page, 'id-B')).name).toBe('Brutus');
    expect((await savedChar(page, 'id-C')).currentHP).toBe(4);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('a button pressed from the keyboard keeps focus, so it can be pressed again', async ({ page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const minusOne = row(page, 'id-B').locator('.hit-btn[data-delta="-1"]');
    await minusOne.focus();
    await page.keyboard.press('Space');
    await expect.poll(() => focused(page)).toBe('desktop:id-B:hit');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await savedChar(page, 'id-B')).currentHP).toBe(17);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('Escape still cancels and leaves the field, and nothing re-renders or refocuses', async ({ page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const name = row(page, 'id-B').locator('.name-input');
    const rowHandle = await row(page, 'id-B').elementHandle();
    await name.fill('Nope');
    await name.press('Escape');
    await expect(name).not.toBeFocused();
    await expect(name).toHaveValue('Bravo');
    expect(await focused(page)).toBe('body');
    expect(await rowHandle.evaluate(el => el.isConnected)).toBe(true);
    expect((await savedChar(page, 'id-B')).name).toBe('Bravo');
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

test.describe('storage-driven re-renders (another tab, real storage events)', () => {
  test.use({ viewport: desktop });

  test('a focused field keeps focus, and shows the other tab\'s value, through every kind of change', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    const otherProblems = watch(other);
    await nextFrames(page);

    const myHp = row(page, 'id-B').locator('.health-input');
    await myHp.click(); // focused, not edited
    const received = () => page.evaluate(() => window.__storageEvents);
    const steps = [
      { what: 'damage to the focused combatant', act: () => row(other, 'id-B').locator('.hit-btn[data-delta="-5"]').click(),
        check: async () => { await expect(myHp).toHaveValue('15'); } },
      { what: 'a rename of the focused combatant', act: async () => {
        const n = row(other, 'id-B').locator('.name-input'); await n.fill('Bruno'); await n.press('Enter'); },
      check: async () => { await expect(row(page, 'id-B').locator('.name-input')).toHaveValue('Bruno'); } },
      { what: 'a new combatant', act: async () => {
        await other.fill('#character-name', 'Delta'); await other.fill('#initiative-roll', '25');
        await other.fill('#character-health', '9'); await other.click('#initiative-form button[type="submit"]'); },
      check: async () => { await expect(page.locator('#initiative-order tr')).toHaveCount(4); } },
      { what: 'another combatant deleted', act: () => row(other, 'id-A').locator('.delete-btn').click(),
        check: async () => { await expect(page.locator('#initiative-order tr')).toHaveCount(3); } },
      { what: 'a re-sort that moves the focused combatant', act: async () => {
        const i = row(other, 'id-B').locator('.init-input'); await i.fill('40'); await i.press('Enter'); },
      check: async () => { await expect(page.locator('#initiative-order tr').first()).toHaveAttribute('data-character-id', 'id-B'); } },
      { what: 'an undo in the other tab', act: () => other.click('#undo-btn'),
        check: async () => { await expect(page.locator('#initiative-order tr').last()).toHaveAttribute('data-character-id', 'id-C'); } }
    ];
    for (const s of steps) {
      const before = await received();
      await s.act();
      await expect.poll(received, s.what).toBeGreaterThan(before);
      await s.check();
      await expect.poll(() => focused(page), `focus after ${s.what}`).toBe('desktop:id-B:hp');
      const n = await expectListMatchesModel(page);
      expect((await savedState(page)).characters).toEqual((await savedState(other)).characters); // same model
      expect(n).toBeGreaterThan(0);
    }
    // the focused field never wrote anything back: every log entry is the other tab's
    const log = (await savedState(page)).combatLog ?? [];
    expect(log.map(e => e.summary)).toEqual(['Damage 5']);
    await expectQuiet(page, other);
    expect(problems, problems.join('\n')).toEqual([]);
    expect(otherProblems, otherProblems.join('\n')).toEqual([]);
  });

  // Rule: another tab's update reaches the model, but must not force-commit an edit the user has not
  // finished. The list redraw waits; the user's finished edit then lands once, on top of that update.
  test('an uncommitted edit is not committed by another tab\'s update, and lands once when finished', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    await nextFrames(page);
    const name = row(page, 'id-B').locator('.name-input');
    await name.click();
    await name.fill('Bru'); // typed, not committed
    const nameHandle = await handleOf(name);
    const [writesBefore, before] = await page.evaluate(() => [window.__writes, window.__storageEvents]);

    await row(other, 'id-C').locator('.hit-btn[data-delta="-1"]').click();

    await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before);
    await expectQuiet(page, other);
    expect((await savedChar(page, 'id-B')).name).toBe('Bravo'); // "Bru" was not committed
    expect((await savedChar(page, 'id-C')).currentHP).toBe(19); // the other tab's change is in storage
    expect(await nameHandle.evaluate(el => el.isConnected)).toBe(true); // the field was not redrawn away
    expect(await focused(page)).toBe('desktop:id-B:name');
    expect(await page.evaluate(() => window.__writes)).toBe(writesBefore); // nothing written by this tab

    await page.keyboard.type('tus'); // the user finishes typing, in the same field
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await savedChar(page, 'id-B')).name).toBe('Brutus');
    expect((await savedChar(page, 'id-C')).currentHP).toBe(19); // the edit did not overwrite the update
    await expect(row(page, 'id-C').locator('.health-input')).toHaveValue('19'); // the held redraw ran
    await expect.poll(() => focused(page)).toBe('desktop:id-B:name');
    await expect.poll(async () => (await savedChar(other, 'id-B')).name).toBe('Brutus'); // reached the other tab
    await expectQuiet(page, other);
    expect(await page.evaluate(() => window.__writes)).toBe(writesBefore + 1); // one write, for the edit
    await expectListMatchesModel(page);
    await expectListMatchesModel(other);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('a half-typed HP is never committed by an update; Escape-free cancel by leaving it unchanged', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    await nextFrames(page);
    const hp = row(page, 'id-B').locator('.health-input');
    await hp.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('1'); // on the way to 15
    const before = await page.evaluate(() => window.__storageEvents);

    await row(other, 'id-A').locator('.hit-btn[data-delta="-5"]').click(); // an update to someone else

    await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before);
    await expectQuiet(page, other);
    expect((await savedChar(page, 'id-B')).currentHP).toBe(20); // no "Damage 19"
    expect(((await savedState(page)).combatLog ?? []).map(e => e.summary)).toEqual(['Damage 5']);
    await expect(hp).toHaveValue('1');

    await page.keyboard.type('5');
    await page.keyboard.press('Tab');
    await expect.poll(async () => (await savedChar(page, 'id-B')).currentHP).toBe(15);
    const state = await savedState(page);
    expect(state.characters.map(c => [c.id, c.currentHP])).toEqual([['id-A', 15], ['id-B', 15], ['id-C', 20]]);
    expect(state.combatLog.map(e => e.summary)).toEqual(['Damage 5', 'Damage 5']);
    await expect(row(page, 'id-A').locator('.health-input')).toHaveValue('15');
    await expectListMatchesModel(page);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('Escape on a held edit cancels it and then shows the update', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    await nextFrames(page);
    const name = row(page, 'id-B').locator('.name-input');
    await name.click();
    await name.fill('Nope');
    const before = await page.evaluate(() => window.__storageEvents);
    await row(other, 'id-B').locator('.hit-btn[data-delta="-1"]').click(); // an update to the same combatant
    await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before);

    await page.keyboard.press('Escape');

    await expect(row(page, 'id-B').locator('.health-input')).toHaveValue('19');
    await expect(row(page, 'id-B').locator('.name-input')).toHaveValue('Bravo');
    expect(await savedChar(page, 'id-B')).toMatchObject({ name: 'Bravo', currentHP: 19 });
    await expectListMatchesModel(page);
    await expectQuiet(page, other);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  // An untouched tab must not write its (possibly older) snapshot back when it closes.
  test('closing a tab that only received updates does not write over the newest save', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    await nextFrames(page);
    await row(other, 'id-B').locator('.hit-btn[data-delta="-5"]').click();
    // A marker the tracker would drop if it wrote its own snapshot: it survives only if nothing is written.
    const before = await page.evaluate(() => window.__storageEvents);
    await other.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('initiativeTrackerData'));
      localStorage.setItem('initiativeTrackerData', JSON.stringify({ ...s, __marker: 'newest' }));
    });
    await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before);

    await page.close({ runBeforeUnload: true });

    const stored = await other.evaluate(() => JSON.parse(localStorage.getItem('initiativeTrackerData')));
    expect(stored.__marker).toBe('newest');
    expect(stored.characters.find(c => c.id === 'id-B').currentHP).toBe(15);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('another tab deleting the combatant being edited: no error, no recreation, nobody else changed', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    await nextFrames(page);
    const hp = row(page, 'id-B').locator('.health-input');
    await hp.click();
    await hp.fill('3'); // typed, not committed
    const before = await page.evaluate(() => window.__storageEvents);

    await row(other, 'id-B').locator('.delete-btn').click();

    await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before);
    await expectQuiet(page, other);
    // The redraw waits for the unfinished edit, so the field is still there; storage no longer has Bravo.
    await expect(hp).toHaveValue('3');
    expect((await savedState(page)).characters.map(c => c.id)).toEqual(['id-A', 'id-C']);
    const writes = await page.evaluate(() => window.__writes);

    await page.keyboard.press('Tab'); // the user finishes the edit: its combatant is gone

    await expect(page.locator('#initiative-order tr')).toHaveCount(2);
    expect(await page.evaluate(() => window.__writes)).toBe(writes); // the revert redraw wrote nothing
    const state = await savedState(page);
    expect(state.characters.map(c => [c.id, c.currentHP])).toEqual([['id-A', 20], ['id-C', 20]]);
    expect(state.combatLog ?? []).toHaveLength(0); // the stranded edit wrote nothing
    expect(await page.evaluate(() => document.querySelector('[data-character-id="id-B"]'))).toBeNull();
    expect(await focused(page)).toBe('body'); // focus is not handed to somebody else's field
    await expectListMatchesModel(page);
    await expectQuiet(page, other);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  // This tab re-renders what the other tab saved and must not write it back: an echo write can land
  // after the other tab's next save and overwrite it (seen as lost -1s before the echo was removed:
  // five clicks, HP 19 instead of 15).
  test('a burst of saves from the other tab is re-rendered here without a single write back', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    await nextFrames(page);
    const init = row(page, 'id-C').locator('.init-input');
    await init.click(); // focused, not edited
    await expectQuiet(page, other);
    const [writesBefore, eventsBefore] = await page.evaluate(() => [window.__writes, window.__storageEvents]);

    // five saves from the other tab in one task: this tab gets their storage events back to back
    await other.evaluate(() => {
      const btn = () => document.querySelector('#initiative-order tr[data-character-id="id-A"] .hit-btn[data-delta="-1"]');
      for (let i = 0; i < 5; i++) btn().click();
    });

    await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThanOrEqual(eventsBefore + 5);
    await expect(row(page, 'id-A').locator('.health-input')).toHaveValue('15');
    await expectQuiet(page, other);
    expect(await page.evaluate(() => window.__writes)).toBe(writesBefore); // no echo, no loop
    expect((await savedChar(page, 'id-A')).currentHP).toBe(15); // every one of the five landed
    expect(((await savedState(page)).combatLog ?? []).map(e => e.summary)).toEqual(Array(5).fill('Damage 1'));
    expect(await focused(page)).toBe('desktop:id-C:initiative');
    expect(await expectListMatchesModel(page)).toBe(3);
    expect(await expectListMatchesModel(other)).toBe(3);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

test.describe('mobile: one logical change never duplicates a row', () => {
  test.use({ viewport: mobile, hasTouch: true });

  const actions = [
    { name: 'move up', sel: '.move-up', on: 'id-C', count: 3, order: ['id-A', 'id-C', 'id-B'] },
    { name: 'move down', sel: '.move-down', on: 'id-A', count: 3, order: ['id-B', 'id-A', 'id-C'] },
    { name: 'duplicate', sel: '.duplicate-btn', on: 'id-C', count: 4 },
    { name: 'delete', sel: '.delete-btn', on: 'id-C', count: 2, order: ['id-A', 'id-B'] },
    { name: '-5', sel: '.hit-btn[data-delta="-5"]', on: 'id-A', count: 3, order: ['id-A', 'id-B', 'id-C'] }
  ];
  for (const a of actions) {
    test(`tapping ${a.name} on another card while a card holds an uncommitted edit`, async ({ page }) => {
      const problems = watch(page);
      await seed(page, ABC());
      const input = card(page, 'id-B').locator('.name-input');
      await input.tap();
      await input.fill('Brutus'); // typed, not committed

      await card(page, a.on).locator(a.sel).tap();

      // both the edit and the tapped action landed, once each. Poll the whole outcome: for a count-preserving
      // action the count alone is already right before the tap has been handled.
      const outcome = async () => {
        const st = await savedState(page);
        return {
          count: st.characters.length,
          name: st.characters.find(c => c.id === 'id-B')?.name,
          order: a.order ? st.characters.map(c => c.id) : undefined,
          hpA: a.name === '-5' ? st.characters.find(c => c.id === 'id-A').currentHP : undefined
        };
      };
      await expect.poll(outcome).toEqual({
        count: a.count, name: 'Brutus', order: a.order, hpA: a.name === '-5' ? 15 : undefined
      });
      await expect(page.locator('#mobile-initiative-order .card')).toHaveCount(a.count);
      await expect(page.locator('#initiative-order tr')).toHaveCount(a.count);
      expect(await expectListMatchesModel(page)).toBe(a.count);
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }

  test('several render requests queued in one task (clicks and a storage event) end in one list', async ({ page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const input = card(page, 'id-B').locator('.health-input');
    await input.tap();
    await input.fill('8'); // typed, not committed

    await page.evaluate(() => {
      const btn = (id, sel) => document.querySelector(`#mobile-initiative-order .card[data-character-id="${id}"] ${sel}`);
      btn('id-A', '.hit-btn[data-delta="-1"]').click();
      btn('id-C', '.move-up').click();
      btn('id-A', '.duplicate-btn').click();
      // what another tab's save delivers, in the same task
      const s = JSON.parse(localStorage.getItem('initiativeTrackerData'));
      s.characters.find(c => c.id === 'id-C').name = 'Chuck';
      localStorage.setItem('initiativeTrackerData', JSON.stringify(s));
      window.dispatchEvent(new StorageEvent('storage', { key: 'initiativeTrackerData' }));
    });

    await nextFrames(page);
    // The card still holds an unfinished edit, so every redraw above is held: the list is untouched
    // (no duplicate, no half-typed commit) while the model and storage already have all four changes.
    await expect(page.locator('#mobile-initiative-order .card')).toHaveCount(3);
    await expect(page.locator('#initiative-order tr')).toHaveCount(3);
    await expect(input).toHaveValue('8');
    let state = await savedState(page);
    expect(state.characters).toHaveLength(4);
    expect(state.characters.find(c => c.id === 'id-B').currentHP).toBe(20);

    await page.evaluate(() => document.activeElement.blur()); // the edit is finished
    await nextFrames(page);
    expect(await expectListMatchesModel(page)).toBe(4); // one redraw, one list
    state = await savedState(page);
    expect(state.characters.find(c => c.id === 'id-B').currentHP).toBe(8);
    expect(state.characters.find(c => c.id === 'id-C').name).toBe('Chuck');
    expect(state.characters.find(c => c.id === 'id-A').currentHP).toBe(19);
    expect(state.characters.filter(c => c.name.startsWith('Alpha'))).toHaveLength(2);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('another tab changing things while a card holds an edit: counts stay exact on both tabs', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context, mobile);
    await nextFrames(page);
    const input = card(page, 'id-A').locator('.name-input');
    await input.tap();
    await input.fill('Alfred');

    await card(other, 'id-C').locator('.duplicate-btn').tap();
    await card(other, 'id-B').locator('.hit-btn[data-delta="-5"]').tap();

    await expect.poll(async () => (await savedState(page)).characters.length).toBe(4);
    await expect.poll(async () => (await savedChar(page, 'id-B')).currentHP).toBe(15);
    await expectQuiet(page, other);
    expect((await savedChar(page, 'id-A')).name).toBe('Alpha'); // not committed by the other tab's updates
    await expect(page.locator('#mobile-initiative-order .card')).toHaveCount(3); // held, not duplicated
    await expect(input).toHaveValue('Alfred');

    await page.evaluate(() => document.activeElement.blur()); // the edit is finished
    await expect.poll(async () => (await savedChar(page, 'id-A')).name).toBe('Alfred');
    await expectQuiet(page, other);
    expect(await expectListMatchesModel(page)).toBe(4);
    expect(await expectListMatchesModel(other)).toBe(4);
    expect((await savedState(other)).characters).toEqual((await savedState(page)).characters);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

// A Sortable drag holds list redraws from the handle press to the drop: a redraw mid-drag removed the
// dragged row, showed it twice, and the drop was lost.
test.describe('dragging a row while a redraw is pending', () => {
  test.use({ viewport: desktop });
  const rowIds = page => page.evaluate(() => [...document.querySelectorAll('#initiative-order tr')].map(r => r.dataset.characterId));
  // A manual native drag: press, move a little (the drag starts), then move over the target row and release.
  // The tests drag one row up past its neighbour (C over B): one Sortable swap, a deterministic final order.
  async function drag(page, fromId, toId, midway) {
    await row(page, fromId).scrollIntoViewIfNeeded(); // bounding boxes are viewport coordinates
    await row(page, toId).scrollIntoViewIfNeeded();
    const from = await row(page, fromId).locator('.drag-handle').boundingBox();
    const to = await row(page, toId).locator('.drag-handle').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 8, { steps: 4 });
    // the drag really started (Sortable marks the dragged row), so midway runs during a live drag
    await expect(row(page, fromId)).toHaveClass(/sortable-chosen/);
    if (midway) await midway();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 4, { steps: 8 });
    await page.mouse.up();
  }

  test('an edit committed by pressing the drag handle is kept, and the drop is applied', async ({ page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    await row(page, 'id-B').locator('.health-input').fill('7'); // commits when the handle takes the press
    await drag(page, 'id-C', 'id-B', async () => {
      const ids = await rowIds(page);
      expect(ids).toHaveLength(3); // mid-drag: no redraw, no duplicate row
      expect(new Set(ids).size).toBe(3);
      expect((await savedChar(page, 'id-B')).currentHP).toBe(7); // already saved
    });
    await expect.poll(async () => (await savedState(page)).characters.map(c => c.id)).toEqual(['id-A', 'id-C', 'id-B']);
    expect((await savedChar(page, 'id-B')).currentHP).toBe(7);
    await expect(row(page, 'id-B').locator('.health-input')).toHaveValue('7');
    expect(await expectListMatchesModel(page)).toBe(3);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('another tab\'s update during a drag waits for the drop, and both apply', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    await nextFrames(page);
    await drag(page, 'id-C', 'id-B', async () => {
      const before = await page.evaluate(() => window.__storageEvents);
      await row(other, 'id-B').locator('.hit-btn[data-delta="-5"]').click();
      await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before);
      const ids = await rowIds(page);
      expect(ids).toHaveLength(3); // mid-drag: the update did not redraw the list under the drag
      expect(new Set(ids).size).toBe(3);
      await expect(row(page, 'id-B').locator('.health-input')).toHaveValue('20'); // shown after the drop
    });
    await expect.poll(async () => (await savedState(page)).characters.map(c => c.id)).toEqual(['id-A', 'id-C', 'id-B']);
    expect((await savedChar(page, 'id-B')).currentHP).toBe(15); // the other tab's change kept
    await expect(row(page, 'id-B').locator('.health-input')).toHaveValue('15');
    expect(await expectListMatchesModel(page)).toBe(3);
    await expect.poll(async () => (await savedState(other)).characters.map(c => c.id)).toEqual(['id-A', 'id-C', 'id-B']);
    await expectQuiet(page, other);
    expect(await expectListMatchesModel(other)).toBe(3);
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('pressing the handle without dragging does not leave redraws held', async ({ context, page }) => {
    const problems = watch(page);
    await seed(page, ABC());
    const other = await openOtherTab(context);
    await nextFrames(page);
    await row(page, 'id-C').locator('.drag-handle').click();
    const before = await page.evaluate(() => window.__storageEvents);
    await row(other, 'id-B').locator('.hit-btn[data-delta="-5"]').click();
    await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before);
    await expect(row(page, 'id-B').locator('.health-input')).toHaveValue('15');
    expect(await expectListMatchesModel(page)).toBe(3);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

test.describe('combat log renders untrusted text as text', () => {
  test.use({ viewport: desktop });
  const HOSTILE_NAME = '"><img src=x onerror="window.__pwned=1">';

  test('a hostile combatant name in a log entry is shown literally', async ({ page }) => {
    const problems = watch(page);
    await seed(page, [char('id-X', HOSTILE_NAME, 10), char('id-A', 'Alpha', 5)]);
    await row(page, 'id-X').locator('.hit-btn[data-delta="-5"]').click();
    const log = page.locator('#combat-log-accordion');
    await expect(log.locator('tbody tr')).toHaveCount(1);
    expect(await log.locator('img, script').count()).toBe(0);
    await expect(log.locator('tbody tr td').nth(2)).toHaveText(HOSTILE_NAME);
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('stored log entries with markup in every field, and a non-numeric round, render inert', async ({ page }) => {
    const problems = watch(page);
    const evil = '<img src=x onerror="window.__pwned=1">';
    const entry = (round, extra = {}) => ({
      id: 'e' + round, timestamp: new Date().toISOString(), round,
      turnName: evil, actorName: evil, targetName: evil, summary: evil, details: evil,
      statusPayload: evil, concentration: evil, sources: [evil, 'quick-adjust'],
      hpBefore: evil, hpAfter: '<b>1</b>', ...extra
    });
    await seed(page, ABC(), { combatLog: [entry(1), entry('" onmouseover="window.__pwned=1'), entry('01'), entry(2)] });
    const log = page.locator('#combat-log-accordion');
    await expect(log.locator('tbody tr')).toHaveCount(4); // one row per entry, none lost to a bad round
    expect(await log.locator('img, script, b').count()).toBe(0);
    expect(await page.evaluate(() =>
      [...document.querySelectorAll('#combat-log-accordion *')].flatMap(el => el.getAttributeNames().filter(a => a.startsWith('on'))))).toEqual([]);
    await expect(log.locator('tbody tr').first().locator('td').nth(3)).toHaveText(evil);
    await expect(log.locator('.accordion-button').first()).toContainText('Round 2');
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    await expectListMatchesModel(page); // and the tracker itself still rendered
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
