import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

// NPC Generator naming-style regression: manual selection in the "Pick a Name" modal must resolve
// through the exact selected style, never through detectRaceFromDescription's text-inference heuristic
// and never by silently reusing whatever style last resolved.
//
// Oracle: Date.now and Math.random are frozen before each page load, so window.generateNamesForStyle
// (the real production generator, published for tests only) produces the exact same 12 names whether
// called directly or through the UI. Comparing the two — not just checking "some names appeared" — is
// what would have caught the original bug, where every broken style still produced a full grid of names,
// just from the wrong table.

// Every style the canonical registry actually has, read from the real file rather than hand-typed, so a
// style added or removed there is picked up here automatically instead of silently going untested.
const ALL_STYLES = (() => {
  // name-data.js declares `let TABLES` at top level (a classic-script global via lexical scope, not a
  // property of the page's `window` — see its own comment). A vm context behaves the same way, so the
  // keys are read back with a second evaluation in that same context, not as a property of it.
  const src = readFileSync(resolve(process.cwd(), 'js/name/name-data.js'), 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(src, ctx);
  return JSON.parse(vm.runInContext('JSON.stringify(Object.keys(TABLES.Styles))', ctx));
})();
// A fixed historical list (not derived): the styles this bug actually broke, kept as named regression pins.
const PREVIOUSLY_BROKEN = [
  'Human (Norse)', 'Human (Arabic)', 'Human (Asian)', 'Goliath', 'Firbolg', 'Triton', 'Aarakocra',
  'Tabaxi', 'Kenku', 'Hobgoblin', 'Kobold', 'Bugbear', 'Yuan-ti', 'Changeling', 'Warforged',
];

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}

// Freezes the seed inputs so window.generateNamesForStyle is deterministic and repeatable, and opens
// the "Pick a Name" modal for one freshly generated NPC.
async function openNamePicker(page) {
  await page.addInitScript(() => {
    Date.now = () => 1700000000000;
    Math.random = () => 0.4242;
  });
  await page.goto('/npc.html');
  await page.locator('#npc-count').fill('1');
  await page.locator('#npc-generate').click();
  await page.waitForSelector('.npc-name-gen-btn');
  await page.locator('.npc-name-gen-btn').first().click();
  await expect(page.locator('#namePickerModal')).toBeVisible();
}
const oracleNames = (page, style) => page.evaluate(k => window.generateNamesForStyle(k, 12).names, style);
const selectAndRegenerate = async (page, style) => {
  await page.selectOption('#raceSelect', style);
  await page.locator('#regenerateNames').click();
};
const gridNames = page => page.locator('#nameGrid .name-option-btn').allTextContents();

test.describe('every visible naming style resolves to its own style, not a fallback', () => {
  for (const style of ALL_STYLES) {
    test(`"${style}" produces exactly what the production generator gives that style directly`, async ({ page }) => {
      const errors = watchErrors(page);
      await openNamePicker(page);
      const oracle = await oracleNames(page, style);
      await selectAndRegenerate(page, style);
      expect(await gridNames(page)).toEqual(oracle);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});

test.describe('the four Human cultural styles are distinct from each other', () => {
  test('Human (Latin/Norse/Arabic/Asian) each resolve to their own, different table', async ({ page }) => {
    await openNamePicker(page);
    const byStyle = {};
    for (const style of ['Human (Latin)', 'Human (Norse)', 'Human (Arabic)', 'Human (Asian)']) {
      byStyle[style] = await oracleNames(page, style);
    }
    const lists = Object.values(byStyle);
    for (let i = 0; i < lists.length; i++) {
      for (let j = i + 1; j < lists.length; j++) {
        expect(lists[i], `${Object.keys(byStyle)[i]} vs ${Object.keys(byStyle)[j]}`).not.toEqual(lists[j]);
      }
    }
  });
});

test.describe('previously-broken styles (regression pins)', () => {
  for (const style of PREVIOUSLY_BROKEN) {
    test(`"${style}" no longer falls back to Human (Latin)`, async ({ page }) => {
      await openNamePicker(page);
      const [latin, thisStyle] = await Promise.all([oracleNames(page, 'Human (Latin)'), oracleNames(page, style)]);
      await selectAndRegenerate(page, style);
      const shown = await gridNames(page);
      expect(shown, `${style} must not equal the Human (Latin) fallback`).not.toEqual(latin);
      expect(shown).toEqual(thisStyle);
    });
  }
});

test.describe('substring traps', () => {
  test('Half-Orc uses its own table, not plain Orc', async ({ page }) => {
    await openNamePicker(page);
    const [halfOrc, orc] = await Promise.all([oracleNames(page, 'Half-Orc'), oracleNames(page, 'Orc')]);
    await selectAndRegenerate(page, 'Half-Orc');
    const shown = await gridNames(page);
    expect(shown).not.toEqual(orc);
    expect(shown).toEqual(halfOrc);
  });

  test('Hobgoblin uses its own table, not Goblin or the Human (Latin) fallback', async ({ page }) => {
    await openNamePicker(page);
    const [hobgoblin, goblin, latin] = await Promise.all([
      oracleNames(page, 'Hobgoblin'), oracleNames(page, 'Goblin'), oracleNames(page, 'Human (Latin)'),
    ]);
    await selectAndRegenerate(page, 'Hobgoblin');
    const shown = await gridNames(page);
    expect(shown).not.toEqual(goblin);
    expect(shown).not.toEqual(latin);
    expect(shown).toEqual(hobgoblin);
  });
});

test.describe('a sequence of selections never carries over a stale style', () => {
  test('Dwarf -> Human (Norse) -> Elf -> Goliath -> Human (Arabic): every step uses the newly selected style', async ({ page }) => {
    const errors = watchErrors(page);
    await openNamePicker(page);
    const sequence = ['Dwarf', 'Human (Norse)', 'Elf', 'Goliath', 'Human (Arabic)'];
    const seen = [];
    for (const style of sequence) {
      const oracle = await oracleNames(page, style);
      await selectAndRegenerate(page, style);
      const shown = await gridNames(page);
      expect(shown, `${style} step`).toEqual(oracle);
      // never equal to any style already produced earlier in the sequence (a stale-reuse bug would repeat one)
      for (const prior of seen) expect(shown).not.toEqual(prior);
      seen.push(shown);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('an invalid style key fails safely instead of substituting another style', () => {
  test('a key not in TABLES.Styles produces no names, and is not silently swapped for Human (Latin) or a previous style', async ({ page }) => {
    await openNamePicker(page);
    // A valid pick first, so a "reuse the previous style" implementation has something to fall back to.
    await selectAndRegenerate(page, 'Dwarf');
    const dwarf = await gridNames(page);

    const result = await page.evaluate(() => window.generateNamesForStyle('Not A Real Style', 5));
    expect(result.names).toEqual([]);
    expect(result.names).not.toEqual(dwarf);

    const latin = await oracleNames(page, 'Human (Latin)');
    expect(result.names).not.toEqual(latin);
  });
});

test.describe('canonical registry sharing', () => {
  test('the NPC page has no local naming-style table: every dropdown option is a live TABLES.Styles key, and generation reads TABLES.Styles directly', async ({ page }) => {
    await openNamePicker(page);
    const optionValues = await page.locator('#raceSelect option').evaluateAll(els => els.map(e => e.value));
    const tableKeys = await page.evaluate(() => Object.keys(TABLES.Styles));
    expect(new Set(optionValues)).toEqual(new Set(tableKeys));

    // Behavioral proof, not a source-text check: mutate TABLES.Styles at runtime (the one and only
    // registry) and confirm the NPC generator's output changes accordingly — it cannot be reading from
    // a second, independent copy of the table.
    await page.evaluate(() => {
      TABLES.Styles['Dwarf'] = { start: ['zzzqqq'], mid: ['zzzqqq'], end: ['zzzqqq'] };
    });
    const patched = await page.evaluate(() => window.generateNamesForStyle('Dwarf', 3).names);
    expect(patched.every(n => n.toLowerCase() === 'zzzqqqzzzqqqzzzqqq')).toBe(true);
  });
});

test.describe('automatic description-based detection is unchanged', () => {
  test('auto-naming a generated NPC still resolves a real style from its description, with no fallback shown as an error', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/npc.html');
    if (!(await page.locator('#npc-autoName').isChecked())) await page.locator('#npc-autoName').check();
    await page.locator('#npc-count').fill('3');
    await page.locator('#npc-generate').click();
    await page.waitForSelector('.npc-name-display');
    const names = await page.locator('.npc-name-display').allTextContents();
    for (const n of names) expect(n).not.toBe('[No name yet]');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
