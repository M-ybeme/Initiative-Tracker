import { test, expect } from '@playwright/test';

// Initiative Tracker correctness pass, in real Chromium: numeric editor parsing (type=number fields hand
// exponent text such as "1e3" to the script), the status modal refreshing itself, concentration prompts resolving
// once, and dynamic rendering of hostile names.

const char = (id, name, initiative, extra = {}) => ({
  id, name, type: 'Enemy', initiative,
  currentHP: 20, maxHP: 20, tempHP: 0, ac: 12, notes: '',
  concentration: false, deathSaves: { s: 0, f: 0, stable: false },
  status: [], concDamagePending: 0,
  ...extra
});

async function seed(page, characters, extraStorage = {}) {
  await page.addInitScript(([chars, extra]) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.clear();
    localStorage.setItem('initiativeHelpSeen', '1');
    localStorage.setItem('initiativeTrackerData', JSON.stringify({ characters: chars, currentTurn: 0, combatRound: 1 }));
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, [characters, extraStorage]);
  await page.goto('/initiative.html');
}
const savedState = page => page.evaluate(() => JSON.parse(localStorage.getItem('initiativeTrackerData')));
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}
const desktop = { viewport: { width: 1280, height: 800 } };

test.describe('numeric editors reject what parseInt would reinterpret', () => {
  test.use(desktop);

  const attempts = [
    { typed: '1e3', kept: '20' },   // parseInt: 1
    { typed: '2E2', kept: '20' },
    { typed: '30.5', kept: '20' },  // parseInt: 30
  ];
  for (const field of [{ name: 'HP', sel: '.health-input' }, { name: 'initiative', sel: '.init-input' }]) {
    for (const a of attempts) {
      test(`${field.name} field: "${a.typed}" is rejected and the stored value is put back`, async ({ page }) => {
        const errors = watchErrors(page);
        await seed(page, [char('a', 'Alpha', 20)]);
        const input = page.locator(`#initiative-order ${field.sel}`).first();
        await input.fill(a.typed);
        await input.blur();
        await expect(input).toHaveValue(a.kept);
        const st = await savedState(page);
        expect(st.characters[0].currentHP).toBe(20);
        expect(st.characters[0].initiative).toBe(20);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }
    test(`${field.name} field: plain integers, including leading zeros, still commit`, async ({ page }) => {
      await seed(page, [char('a', 'Alpha', 20)]);
      const input = page.locator(`#initiative-order ${field.sel}`).first();
      await input.fill('015');
      await input.blur();
      await expect(page.locator(`#initiative-order ${field.sel}`).first()).toHaveValue('15');
      const st = await savedState(page);
      expect(field.name === 'HP' ? st.characters[0].currentHP : st.characters[0].initiative).toBe(15);
    });
  }

  test('a precision amount of "1e3" is refused, not applied as 1', async ({ page }) => {
    const alerts = [];
    page.on('dialog', d => { alerts.push(d.message()); d.accept(); });
    await seed(page, [char('a', 'Alpha', 20)]);
    const amount = page.locator('#initiative-order .precision-amount').first();
    await amount.fill('1e3');
    await page.locator('#initiative-order [data-action="precision-damage"], #initiative-order [data-action="precision-heal"]').first().click();
    expect(alerts.join()).toContain('positive amount');
    expect((await savedState(page)).characters[0].currentHP).toBe(20);
  });
});

test.describe('add-combatant form', () => {
  test.use(desktop);
  test('a decimal or exponent HP is refused with a message, not added as 0 HP', async ({ page }) => {
    const alerts = [];
    page.on('dialog', d => { alerts.push(d.message()); d.accept(); });
    await seed(page, []);
    await page.fill('#character-name', 'Goblin');
    await page.fill('#character-health', '1e2');
    await page.locator('#initiative-form button[type="submit"]').click();
    expect(alerts.join()).toContain('whole numbers');
    expect((await savedState(page)).characters).toHaveLength(0);
    await page.fill('#character-health', '12');
    await page.locator('#initiative-form button[type="submit"]').click();
    await expect.poll(async () => (await savedState(page)).characters.map(c => c.maxHP)).toEqual([12]);
  });
});

test.describe('status modal', () => {
  test.use(desktop);

  const badgeTexts = page => page.locator('#status-badges .badge').allInnerTexts();
  const openModal = async page => {
    await page.locator('#initiative-order [data-action="status"]').first().click();
    await expect(page.locator('#statusModal')).toBeVisible();
  };
  const addEffect = async (page, name) => {
    await page.locator('#statusModal .dropdown-toggle').click();
    await page.locator(`#status-dropdown-list a[data-eff="${name}"]`).click();
    await page.locator('#add-status-btn').click();
  };

  test('adding shows the new badge at once; removing works; the effect cannot be added twice', async ({ page }) => {
    const errors = watchErrors(page);
    await seed(page, [char('a', 'Alpha', 20)]);
    await openModal(page);
    expect(await badgeTexts(page)).toEqual([]);

    await addEffect(page, 'Prone');
    await expect(page.locator('#status-badges .badge')).toHaveCount(1); // without closing and reopening
    expect((await badgeTexts(page))[0]).toContain('Prone');
    await expect(page.locator('#status-dropdown-list a[data-eff="Prone"]')).toHaveClass(/disabled/);
    await expect(page.locator('#statusModal')).toBeVisible(); // still open

    await page.locator('#status-duration').fill('3');
    await addEffect(page, 'Blinded');
    await expect(page.locator('#status-badges .badge')).toHaveCount(2);
    expect((await badgeTexts(page)).join('|')).toContain('Blinded (3)');

    await page.locator('#status-badges .remove-status').first().click();
    await expect(page.locator('#status-badges .badge')).toHaveCount(1);
    expect((await savedState(page)).characters[0].status.map(s => s.name)).toEqual(['Blinded']);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a change made in another tab while the modal is open is shown in the modal', async ({ page }) => {
    await seed(page, [char('a', 'Alpha', 20)]);
    await openModal(page);
    expect(await badgeTexts(page)).toEqual([]);

    // Another tab's write reaches this one as a `storage` event.
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('initiativeTrackerData'));
      data.characters[0].status = [{ name: 'Charmed', icon: '🔮' }];
      const value = JSON.stringify(data);
      localStorage.setItem('initiativeTrackerData', value);
      window.dispatchEvent(new StorageEvent('storage', { key: 'initiativeTrackerData', newValue: value }));
    });
    await expect(page.locator('#status-badges .badge')).toHaveCount(1);
    expect((await badgeTexts(page))[0]).toContain('Charmed');
  });
});

test.describe('concentration prompts', () => {
  test.use(desktop);

  const three = () => [
    char('a', 'Alpha', 30, { concentration: true, concDamagePending: 10 }),
    char('b', 'Bravo', 20, { concentration: true, concDamagePending: 12 }),
    char('c', 'Charlie', 10, { concentration: true, concDamagePending: 14 }),
  ];

  test('rapid repeated Pass/Fail on the first prompt resolves it once; the next prompts still appear', async ({ page }) => {
    const errors = watchErrors(page);
    await seed(page, three());
    await page.locator('#next-turn').click();
    await expect(page.locator('#concToast')).toBeVisible();
    const shown = () => page.locator('#concToastName').innerText();
    expect(await shown()).toBe('Alpha');

    // five activations inside one task: the double click, plus a Fail on the same prompt
    await page.evaluate(() => {
      const pass = document.getElementById('concPassBtn');
      const fail = document.getElementById('concFailBtn');
      pass.click(); pass.click(); pass.click(); fail.click(); fail.click();
    });
    await expect(page.locator('#concToastName')).toHaveText('Bravo');
    await expect(page.locator('#concToast')).toBeVisible();
    // let any stray delayed drain from the extra clicks run before asserting the second prompt is still up
    await page.waitForTimeout(400);
    expect(await shown()).toBe('Bravo');
    await expect(page.locator('#concPassBtn')).toBeEnabled();

    await page.locator('#concPassBtn').click();
    await expect(page.locator('#concToastName')).toHaveText('Charlie');
    await page.locator('#concFailBtn').click();
    await expect.poll(async () => (await savedState(page)).characters.find(c => c.id === 'c').concentration).toBe(false);

    const st = await savedState(page);
    expect(st.characters.find(c => c.id === 'a').concentration, 'the first prompt was a Pass; the extra Fail was inert').toBe(true);
    const checks = (st.combatLog || []).filter(e => e.type === 'concentration');
    expect(checks.map(e => [e.targetName, e.summary])).toEqual([
      ['Alpha', 'Concentration Check Passed'],
      ['Bravo', 'Concentration Check Passed'],
      ['Charlie', 'Concentration Check Failed'],
    ]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('dismissing the active prompt with X logs nothing, shows the next prompt once, and never blocks later checks', async ({ page }) => {
    const errors = watchErrors(page);
    await seed(page, three());
    await page.locator('#next-turn').click();
    await expect(page.locator('#concToastName')).toHaveText('Alpha');
    await expect(page.locator('#concToast')).toBeVisible();

    // rapid X: several clicks in one task must dismiss only the first prompt. The button is re-enabled between
    // clicks so the prompt guard itself is exercised, not just the disabled attribute.
    await page.evaluate(() => {
      const x = document.getElementById('concCloseBtn');
      x.click();
      for (let i = 0; i < 2; i++) { x.disabled = false; x.click(); }
    });
    await expect(page.locator('#concToastName')).toHaveText('Bravo');
    await expect(page.locator('#concToast')).toBeVisible();
    await page.waitForTimeout(500); // a stray second dismissal would have moved on to Charlie or hidden Bravo
    await expect(page.locator('#concToastName')).toHaveText('Bravo');
    await expect(page.locator('#concToast')).toBeVisible();
    expect((await savedState(page)).combatLog?.filter(e => e.type === 'concentration') ?? [], 'a dismissal is neither Pass nor Fail').toEqual([]);

    await page.locator('#concPassBtn').click();
    await expect(page.locator('#concToastName')).toHaveText('Charlie');
    await page.locator('#concFailBtn').click();
    await expect(page.locator('#concToast')).toBeHidden();
    let st = await savedState(page);
    expect(st.characters.find(c => c.id === 'a').concentration, 'the dismissed check changed nothing').toBe(true);
    expect(st.characters.find(c => c.id === 'c').concentration).toBe(false);
    expect(st.combatLog.filter(e => e.type === 'concentration').map(e => [e.targetName, e.summary])).toEqual([
      ['Bravo', 'Concentration Check Passed'],
      ['Charlie', 'Concentration Check Failed'],
    ]);

    // the queue is idle again: a later check still appears
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('initiativeTrackerData'));
      d.characters.find(c => c.id === 'a').concDamagePending = 8;
      localStorage.setItem('initiativeTrackerData', JSON.stringify(d));
      window.dispatchEvent(new StorageEvent('storage', { key: 'initiativeTrackerData', newValue: JSON.stringify(d) }));
    });
    await page.locator('#next-turn').click();
    await expect(page.locator('#concToast')).toBeVisible();
    await expect(page.locator('#concToastName')).toHaveText('Alpha');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('both controls are disabled the moment a prompt is answered', async ({ page }) => {
    await seed(page, [char('a', 'Alpha', 30, { concentration: true, concDamagePending: 10 })]);
    await page.locator('#next-turn').click();
    await expect(page.locator('#concToast')).toBeVisible();
    const state = await page.evaluate(() => {
      document.getElementById('concPassBtn').click();
      return [document.getElementById('concPassBtn').disabled, document.getElementById('concFailBtn').disabled];
    });
    expect(state).toEqual([true, true]);
  });
});

test.describe('hostile names in dynamic rendering', () => {
  test.use(desktop);
  const NAMES = ['He said "hi"', "It's 'quoted'", '<b>bold</b> & <i>it</i>', '"><img src=x onerror="window.__pwned=1">', "' data-act='del' x='"];

  test('saved-character list renders names literally and each button acts on its own template', async ({ page }) => {
    const errors = watchErrors(page);
    const saved = NAMES.map((n, i) => ({ name: n, type: 'Enemy', maxHP: 10 + i, ac: 11, initiative: 0 }));
    // the saved-template key is TKEY in initiative.js
    const tkey = await (async () => {
      await seed(page, []);
      return page.evaluate(() => {
        const src = [...document.scripts].map(s => s.src).find(s => s.includes('initiative.js'));
        return src;
      });
    })();
    expect(tkey).toBeTruthy();
    const key = await page.evaluate(async src => {
      const text = await (await fetch(src)).text();
      return /TKEY\s*=\s*['"]([^'"]+)['"]/.exec(text)[1];
    }, tkey);
    await page.evaluate(([k, v]) => { localStorage.setItem(k, JSON.stringify(v)); }, [key, saved]);
    await page.reload();

    const rows = page.locator('#saved-characters-list li');
    await expect(rows).toHaveCount(NAMES.length);
    for (let i = 0; i < NAMES.length; i++) {
      await expect(rows.nth(i).locator('strong')).toHaveText(NAMES[i]);
      expect(await rows.nth(i).locator('button').count()).toBe(3);
      expect(await rows.nth(i).locator('img, script, b, i:not(.bi)').count(), 'no element built from the name').toBe(0);
    }
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();

    // Add on the 4th and Delete on the 5th target exactly those templates
    await rows.nth(3).locator('[data-act="add"]').evaluate(b => b.click()); // the list sits in a collapsed panel
    await expect.poll(async () => (await savedState(page)).characters.map(c => c.name)).toEqual([NAMES[3]]);
    await rows.nth(4).locator('[data-act="del"]').evaluate(b => b.click());
    await expect.poll(async () => (await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key)).map(t => t.name)).toEqual(NAMES.slice(0, 4));
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('dice history text is literal', async ({ page }) => {
    const errors = watchErrors(page);
    const entry = { text: '<img src=x onerror="window.__pwned=1"> & "q"', timestamp: '<b>12:00</b>' };
    await page.addInitScript(e => {
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      localStorage.clear();
      localStorage.setItem('initiativeHelpSeen', '1');
      localStorage.setItem('initiativeTrackerData', JSON.stringify({ characters: [], currentTurn: 0, combatRound: 1, diceHistory: [e] }));
    }, entry);
    await page.goto('/initiative.html');
    const log = page.locator('#dice-history-log');
    await expect(log).toContainText('<img src=x onerror="window.__pwned=1"> & "q"');
    expect(await log.locator('img, b').count()).toBe(0);
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('status modal badges render names and icons literally, and remove targets the right effect', async ({ page }) => {
    const errors = watchErrors(page);
    const status = [
      { name: '"><img src=x onerror="window.__pwned=1">', icon: '<b>X</b>' },
      { name: "It's <i>odd</i>", icon: '&amp;' },
    ];
    await seed(page, [char('a', 'Alpha', 20, { status })]);
    await page.locator('#initiative-order [data-action="status"]').first().click();
    const badges = page.locator('#status-badges .badge');
    await expect(badges).toHaveCount(2);
    await expect(badges.nth(0)).toContainText('<b>X</b> "><img src=x onerror="window.__pwned=1">');
    await expect(badges.nth(1)).toContainText("&amp; It's <i>odd</i>");
    expect(await page.locator('#status-badges').locator('img, b, i:not(.bi)').count()).toBe(0);
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();

    await badges.nth(1).locator('.remove-status').click();
    await expect(badges).toHaveCount(1);
    expect((await savedState(page)).characters[0].status.map(s => s.name)).toEqual([status[0].name]);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
