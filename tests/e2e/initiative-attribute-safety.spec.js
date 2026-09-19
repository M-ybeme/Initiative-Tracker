import { test, expect } from '@playwright/test';

// Real-Chromium checks for the initiative tracker's inline editors and attribute handling.
// The happy-dom integration tests cover the same logic, but happy-dom only decodes &amp; and &quot;
// inside attribute values, and it neither fires focusout on a removed input nor delivers real
// cross-tab `storage` events. These do.

const char = (id, name, initiative, extra = {}) => ({
  id, name, type: 'Enemy', initiative,
  currentHP: 20, maxHP: 20, tempHP: 0, ac: 12, notes: '',
  concentration: false, deathSaves: { s: 0, f: 0, stable: false },
  status: [], concDamagePending: 0,
  ...extra
});

// Seeds localStorage before any page script runs, once per tab (the guard survives reloads). Writing
// it after load and then reloading would lose the data: the tracker autosaves its in-memory state
// from a beforeunload handler.
async function seed(page, characters) {
  await page.addInitScript(chars => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.clear();
    localStorage.setItem('initiativeHelpSeen', '1');
    localStorage.setItem('initiativeTrackerData', JSON.stringify({ characters: chars, currentTurn: 0, combatRound: 1 }));
  }, characters);
  await page.goto('/initiative.html');
}
// Waits for two animation frames, which lets already-queued events (such as a storage event) run.
const nextFrames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const savedState = page => page.evaluate(() => JSON.parse(localStorage.getItem('initiativeTrackerData')));

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}

const HOSTILE = [
  'He said "hi"',
  "It's 'quoted'",
  '<b>bold</b> & <i>it</i>',
  'Tom &amp; Jerry &lt;3 &quot; &#39;',
  '" data-action="delete" x="',
  "' data-action='delete' onfocus='window.__pwned=1' x='",
  '"><img src=x onerror="window.__pwned=1">',
  '</textarea><script>window.__pwned=1</script>',
  'plain'
];

for (const view of [
  { name: 'desktop', viewport: { width: 1280, height: 800 }, row: '#initiative-order tr' },
  { name: 'mobile', viewport: { width: 390, height: 844 }, row: '#mobile-initiative-order .card' }
]) {
  test.describe(`hostile combatant data (${view.name})`, () => {
    test.use({ viewport: view.viewport });

    test('every name renders literally and inert, and touching the field runs nothing', async ({ page }) => {
      const errors = watchErrors(page);
      const combatants = HOSTILE.map((name, i) => char(`id-${i}`, name, 100 - i));
      await seed(page, combatants);

      const report = await page.evaluate(sel => {
        const rows = [...document.querySelectorAll(sel)];
        return rows.map(r => {
          const input = r.querySelector('.name-input');
          const all = [r, ...r.querySelectorAll('*')];
          const actions = [...r.querySelectorAll('[data-action]')];
          return {
            id: r.dataset.characterId,
            value: input.value,
            inputAttrs: input.getAttributeNames().sort(),
            inputActions: r.querySelectorAll('input[data-action]').length,
            injected: r.querySelectorAll('img, script, iframe').length,
            handlers: all.flatMap(e => e.getAttributeNames().filter(a => a.startsWith('on'))),
            actionTags: [...new Set(actions.map(e => e.tagName))],
            foreign: actions.filter(e => e.dataset.characterId !== r.dataset.characterId).length,
            actionCount: actions.length
          };
        });
      }, view.row);

      expect(report).toHaveLength(HOSTILE.length);
      const plain = report[report.length - 1];
      report.forEach((r, i) => {
        expect(r.value, `name ${JSON.stringify(HOSTILE[i])}`).toBe(HOSTILE[i]);
        expect(r.inputAttrs).toEqual(plain.inputAttrs);
        expect(r.inputActions).toBe(0);
        expect(r.injected).toBe(0);
        expect(r.handlers).toEqual([]);
        expect(r.actionTags).toEqual(['BUTTON']);
        expect(r.foreign).toBe(0);
        expect(r.actionCount).toBe(plain.actionCount);
      });
      expect(await page.evaluate(() => window.__pwned)).toBeUndefined();

      // clicking into and out of every name field changes nothing
      const before = JSON.stringify((await savedState(page)).characters);
      const inputs = page.locator(`${view.row} .name-input`);
      for (let i = 0; i < HOSTILE.length; i++) {
        await inputs.nth(i).click();
        await page.keyboard.press('Tab');
      }
      expect(JSON.stringify((await savedState(page)).characters)).toBe(before);
      expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('a name with every special character can be typed, saved, and survives re-renders unchanged', async ({ page }) => {
      const errors = watchErrors(page);
      await seed(page, [char('id-A', 'Alpha', 5), char('id-B', 'Bravo', 20)]);
      const typed = `Tom & "Jerry" <3 'x' &amp; &lt;done&gt;`;
      const input = page.locator(`${view.row}[data-character-id="id-B"] .name-input`);

      await input.fill(typed);
      await input.press('Tab');
      expect((await savedState(page)).characters.find(c => c.id === 'id-B').name).toBe(typed);
      await expect(input).toHaveValue(typed);

      for (let i = 0; i < 3; i++) {
        await page.locator(`${view.row}[data-character-id="id-A"] .react-btn`).click(); // re-render
      }
      await expect(input).toHaveValue(typed);
      expect((await savedState(page)).characters.find(c => c.id === 'id-B').name).toBe(typed);
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('an id with quotes and markup is one attribute value and its controls still work', async ({ page }) => {
      const errors = watchErrors(page);
      const id = 'x" data-action="delete" y="<b>&amp;';
      await seed(page, [char(id, 'Odd id', 30), char('id-A', 'Alpha', 5)]);

      const ok = await page.evaluate(({ sel, id }) => {
        const r = [...document.querySelectorAll(sel)].find(el => el.dataset.characterId === id);
        if (r) r.setAttribute('data-test-target', '1'); // an unambiguous handle: the id itself is not selector-safe
        return !!r && [...r.querySelectorAll('[data-character-id]')].every(e => e.dataset.characterId === id)
          && r.querySelectorAll('input[data-action]').length === 0;
      }, { sel: view.row, id });
      expect(ok).toBe(true);

      await page.locator(`${view.row}[data-test-target="1"] .hit-btn[data-delta="-5"]`).click();
      const state = await savedState(page);
      expect(state.characters.find(c => c.id === id).currentHP).toBe(15);
      expect(state.characters).toHaveLength(2);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  });
}

test.describe('inline editors and another tab (real storage events)', () => {
  // Two tabs on the same origin share localStorage, so a change in tab B reaches tab A as a real
  // `storage` event. Tab A re-renders while one of its editors is focused but not edited; Chromium
  // then fires focusout on the removed input, which used to write its stale text back over the
  // newer state (and, for HP, log a phantom "Heal" and bounce the change back to tab B).
  const scenarios = [
    { field: 'HP', sel: '.health-input',
      change: async b => b.locator('tr[data-character-id="id-B"] .hit-btn[data-delta="-5"]').click(),
      expectInput: '15', logEntries: 1, // the other tab's own Damage 5, and nothing else
      check: s => { const c = s.characters.find(x => x.id === 'id-B'); expect(c.currentHP).toBe(15); } },
    { field: 'name', sel: '.name-input',
      change: async b => { const i = b.locator('tr[data-character-id="id-B"] .name-input'); await i.fill('Bruno'); await i.press('Enter'); },
      expectInput: 'Bruno', logEntries: 0,
      check: s => expect(s.characters.find(x => x.id === 'id-B').name).toBe('Bruno') },
    { field: 'initiative', sel: '.init-input',
      change: async b => { const i = b.locator('tr[data-character-id="id-B"] .init-input'); await i.fill('30'); await i.press('Enter'); },
      expectInput: '30', logEntries: 0,
      check: s => expect(s.characters.find(x => x.id === 'id-B').initiative).toBe(30) }
  ];

  for (const sc of scenarios) {
    test(`a focused, unedited ${sc.field} field does not overwrite what the other tab saved`, async ({ context, page }) => {
      const errors = watchErrors(page);
      await page.addInitScript(() => { window.__storageEvents = 0; addEventListener('storage', () => { window.__storageEvents++; }); });
      await seed(page, [char('id-A', 'Alpha', 5), char('id-B', 'Bravo', 20), char('id-C', 'Charlie', 10)]);
      const other = await context.newPage();
      await other.goto('/initiative.html');
      await expect(other.locator('tr[data-character-id="id-B"]')).toBeVisible(); // second tab booted
      await nextFrames(page); // let anything its boot-time save sent us be delivered before we focus

      const mine = page.locator(`tr[data-character-id="id-B"] ${sc.sel}`);
      await mine.click(); // focused, not edited
      await expect(mine).toBeFocused();
      const before = await page.evaluate(() => window.__storageEvents);
      const focusedInput = await mine.elementHandle(); // proves below that this exact input was replaced

      await sc.change(other); // the other tab changes Bravo

      await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before); // it reached us
      await expect(mine).toHaveValue(sc.expectInput); // this tab re-rendered with the newer value
      expect(await focusedInput.evaluate(el => el.isConnected)).toBe(false); // the focused input was removed
      // A stale write-back would follow the removal immediately. There is no event for "nothing
      // happened", so this is a short bounded wait; the assertions after it fail if something did.
      await page.waitForTimeout(200);
      await expect(mine).toHaveValue(sc.expectInput); // the newer value survived
      const state = await savedState(page);
      sc.check(state);
      const log = state.combatLog ?? [];
      expect(log.filter(e => String(e.summary).startsWith('Heal'))).toHaveLength(0);
      expect(log).toHaveLength(sc.logEntries); // no phantom history/log entry
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('a deliberate edit commits, Escape cancels (even after a refocus), and Enter commits once', async ({ page }) => {
    const errors = watchErrors(page);
    await seed(page, [char('id-A', 'Alpha', 5), char('id-B', 'Bravo', 20)]);
    const name = page.locator('tr[data-character-id="id-B"] .name-input');
    const init = page.locator('tr[data-character-id="id-B"] .init-input');
    const hp = page.locator('tr[data-character-id="id-B"] .health-input');
    const bravo = async () => (await savedState(page)).characters.find(c => c.id === 'id-B');

    // Escape cancels: the value goes back, the model is untouched, and nothing re-rendered
    const rowHandle = await page.locator('tr[data-character-id="id-B"]').elementHandle();
    await name.click();
    await expect(name).toBeFocused();
    await name.fill('Nope');
    await name.press('Escape');
    await expect(name).not.toBeFocused(); // Escape blurred it, so a real focusout followed
    await expect(name).toHaveValue('Bravo');
    expect((await bravo()).name).toBe('Bravo');
    expect(await rowHandle.evaluate(el => el.isConnected)).toBe(true);

    // focus comes back before the edit is committed: the baseline must not become the edit
    await name.click();
    await name.fill('Nope');
    await name.evaluate(el => el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));
    await name.press('Escape');
    await expect(name).toHaveValue('Bravo');
    expect((await bravo()).name).toBe('Bravo');
    expect(await rowHandle.evaluate(el => el.isConnected)).toBe(true);
    await init.click();
    await init.fill('99');
    await init.press('Escape');
    await expect(init).toHaveValue('20');
    expect((await bravo()).initiative).toBe(20);
    expect(await rowHandle.evaluate(el => el.isConnected)).toBe(true);

    // Enter commits once (one undo brings the old name back)
    await name.fill('Brutus');
    await name.press('Enter');
    expect((await bravo()).name).toBe('Brutus');
    await page.click('#undo-btn');
    expect((await bravo()).name).toBe('Bravo');

    // leaving a changed field commits it
    await hp.fill('7');
    await hp.press('Tab');
    expect((await bravo()).currentHP).toBe(7);
    await init.fill('99');
    await init.press('Tab');
    expect((await bravo()).initiative).toBe(99);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('focusing the HP field and then pressing a button does not lose the click', async ({ page }) => {
    const errors = watchErrors(page);
    await seed(page, [char('id-A', 'Alpha', 5), char('id-B', 'Bravo', 20)]);
    await page.locator('tr[data-character-id="id-B"] .health-input').click(); // focus, no edit
    await page.locator('tr[data-character-id="id-B"] .hit-btn[data-delta="-5"]').click();
    expect((await savedState(page)).characters.find(c => c.id === 'id-B').currentHP).toBe(15);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('re-render while a mobile editor holds an uncommitted edit (real storage events)', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  // The commit that removing the focused input triggers used to render inside the running render,
  // and the outer render then appended its rows again: 6 desktop rows for 3 combatants.
  const cases = [
    { field: 'name', sel: '.name-input', typed: 'Brutus', logEntries: 1, // only the other tab's Damage 5
      check: b => expect(b.name).toBe('Brutus') },
    { field: 'HP', sel: '.health-input', typed: '7', logEntries: 2, // the other tab's Damage 5, and this edit
      check: b => expect(b.currentHP).toBe(7) }
  ];
  for (const c of cases) {
    test(`an uncommitted ${c.field} edit survives another tab's update without duplicating the list`, async ({ context, page }) => {
      const errors = watchErrors(page);
      await page.addInitScript(() => { window.__storageEvents = 0; addEventListener('storage', () => { window.__storageEvents++; }); });
      await seed(page, [char('id-A', 'Alpha', 5), char('id-B', 'Bravo', 20), char('id-C', 'Charlie', 10)]);
      const other = await context.newPage();
      await other.setViewportSize({ width: 390, height: 844 });
      await other.goto('/initiative.html');
      await expect(other.locator('#mobile-initiative-order .card[data-character-id="id-A"]')).toBeVisible();
      await nextFrames(page);

      const input = page.locator(`#mobile-initiative-order .card[data-character-id="id-B"] ${c.sel}`);
      await input.click();
      await input.fill(c.typed); // typed, not committed
      await expect(input).toBeFocused();
      const before = await page.evaluate(() => window.__storageEvents);

      await other.locator('#mobile-initiative-order .card[data-character-id="id-A"] .hit-btn[data-delta="-5"]').click();

      await expect.poll(() => page.evaluate(() => window.__storageEvents)).toBeGreaterThan(before);
      await expect.poll(async () => (await savedState(page)).characters.find(x => x.id === 'id-B')[c.field === 'name' ? 'name' : 'currentHP'])
        .toBe(c.field === 'name' ? c.typed : 7); // the deliberate edit was committed by the re-render
      const counts = () => page.evaluate(() => ({
        rows: [...document.querySelectorAll('#initiative-order tr')].map(r => r.dataset.characterId),
        cards: [...document.querySelectorAll('#mobile-initiative-order .card')].map(r => r.dataset.characterId)
      }));
      await expect.poll(async () => (await counts()).rows.length).toBe(3);
      const { rows, cards } = await counts();
      expect(new Set(rows).size).toBe(3);
      expect(cards).toHaveLength(3);
      expect(new Set(cards).size).toBe(3);
      const state = await savedState(page);
      expect(state.characters).toHaveLength(3);
      c.check(state.characters.find(x => x.id === 'id-B'));
      expect(state.characters.find(x => x.id === 'id-A').currentHP).toBe(15); // the other tab's change kept
      expect(state.combatLog ?? []).toHaveLength(c.logEntries);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});

test.describe('numeric inline editors: empty entries and normalization', () => {
  const bravo = async page => (await savedState(page)).characters.find(c => c.id === 'id-B');
  const start = async page => {
    const errors = watchErrors(page);
    await seed(page, [char('id-A', 'Alpha', 5), char('id-B', 'Bravo', 20), char('id-C', 'Charlie', 10)]);
    return errors;
  };

  for (const f of [
    { name: 'HP', sel: '.health-input', prop: 'currentHP' },
    { name: 'initiative', sel: '.init-input', prop: 'initiative' }
  ]) {
    test(`emptying the ${f.name} field and leaving it restores the value and changes nothing`, async ({ page }) => {
      const errors = await start(page);
      const input = page.locator(`tr[data-character-id="id-B"] ${f.sel}`);
      const rowHandle = await page.locator('tr[data-character-id="id-B"]').elementHandle();
      const orderBefore = (await savedState(page)).characters.map(c => c.id);
      await input.click();
      await input.fill('');
      await expect(input).toHaveValue('');
      await input.press('Tab');

      await expect(input).toHaveValue('20');
      expect((await bravo(page))[f.prop]).toBe(20);
      const state = await savedState(page);
      expect(state.combatLog ?? []).toHaveLength(0);
      expect(state.characters.map(c => c.id)).toEqual(orderBefore); // list order stable
      expect(await rowHandle.evaluate(el => el.isConnected)).toBe(true); // no re-render
      await page.click('#undo-btn'); // nothing was pushed
      expect((await bravo(page))[f.prop]).toBe(20);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('initiative typed as 020 shows and stores 20, and 0030 commits as 30', async ({ page }) => {
    const errors = await start(page);
    const init = page.locator('tr[data-character-id="id-B"] .init-input');
    await init.click();
    await init.fill('020');
    await init.press('Tab');
    await expect(init).toHaveValue('20');
    expect((await bravo(page)).initiative).toBe(20);
    expect((await savedState(page)).combatLog ?? []).toHaveLength(0);

    const again = page.locator('tr[data-character-id="id-B"] .init-input');
    await again.fill('0030');
    await again.press('Enter');
    await expect(page.locator('tr[data-character-id="id-B"] .init-input')).toHaveValue('30');
    expect((await bravo(page)).initiative).toBe(30);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
