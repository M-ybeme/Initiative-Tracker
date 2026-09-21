import { test, expect } from '@playwright/test';
import fs from 'fs';

// SRD licensing notices: js/site.js defines them once (window.getSrdLicenseNotices) and every exporter reads them
// from there. The version label, the reference link and the attribution text must agree everywhere they are printed.
// Before this was centralised, the shared notices said SRD 5.1 (media.wizards.com) while four formatters printed a
// hard-coded "SRD 5.2" label beside them.

const OLD_51 = /5\.1|media\.wizards\.com|SRD-OGL/;

// The attribution statement exactly as published in the legal section of the official SRD 5.2.1
// (https://www.dndbeyond.com/srd). It is required wording: it must not be paraphrased.
const OFFICIAL_ATTRIBUTION = 'This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';

// How many times `needle` occurs in `haystack`
const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

// The official statement carries the only Creative Commons link an export needs: it must appear exactly as published,
// once, with nothing added to it (no second CC URL, no link markup around its words).
function expectVerbatim(output, label) {
  expect(occurrences(output, OFFICIAL_ATTRIBUTION), `${label}: the official statement appears once, unchanged`).toBe(1);
  expect(occurrences(output, 'creativecommons.org'), `${label}: no Creative Commons URL besides the one inside the statement`).toBe(1);
  expect(output, `${label}: no link markup around the license name`).not.toContain('[Creative Commons');
  expect(output, `${label}: no "(https://creativecommons.org/licenses/by/4.0/)" suffix`).not.toContain('by/4.0/)');
}

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}

const notices = page => page.evaluate(() => window.getSrdLicenseNotices());

async function openJournal(page) {
  await page.goto('/journal.html');
  await page.waitForFunction(() => typeof window.JournalExport === 'object' && document.querySelector('.ProseMirror'));
}

async function writeEntry(page, name, text) {
  await page.locator('#fileName').fill(name);
  await page.locator('.ProseMirror').first().click();
  await page.keyboard.type(text);
}

async function exportViaUi(page, format) {
  await page.locator('#exportBtn').click();
  await expect(page.locator('#exportModal')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(`#exportModal [data-export-format="${format}"]`).click(),
  ]);
  return download;
}
const readDownload = async download => fs.readFileSync(await download.path(), 'utf8');

test.describe('the shared notices (site.js)', () => {
  for (const pageName of ['journal.html', 'characters.html', 'index.html']) {
    test(`${pageName}: the notices are SRD 5.2.1, with one label and reference link`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('/' + pageName);
      await page.waitForFunction(() => typeof window.getSrdLicenseNotices === 'function');
      const info = await notices(page);

      expect(info.referenceLabel).toBe('SRD 5.2.1 Reference PDF');
      expect(info.srdUrl, 'the official SRD 5.2.1 PDF').toBe('https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf');
      expect(info.attributionText, 'the official SRD 5.2.1 statement, word for word').toBe(OFFICIAL_ATTRIBUTION);
      expect(info.attributionText).not.toMatch(OLD_51);
      expect(info.productIdentityDisclaimer).toContain('System Reference Document 5.2');
      expect(info.productIdentityDisclaimer).not.toMatch(OLD_51);
      expect(Object.keys(info).sort(), 'only what is printed').toEqual(
        ['attributionText', 'productIdentityDisclaimer', 'referenceLabel', 'srdUrl']);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('an override in window.SRDLicensing is honoured field by field, and blanks are ignored', async ({ page }) => {
    await page.addInitScript(() => { window.SRDLicensing = { referenceLabel: 'Custom label', srdUrl: '  ', attributionText: 42 }; });
    await page.goto('/journal.html');
    await page.waitForFunction(() => typeof window.getSrdLicenseNotices === 'function');
    const info = await notices(page);
    expect(info.referenceLabel).toBe('Custom label');
    expect(info.srdUrl, 'a blank override does not replace the default').toContain('dndbeyond.com');
    expect(info.attributionText, 'a non-string override is ignored').toBe(OFFICIAL_ATTRIBUTION);
  });
});

test.describe('Journal exports print the shared notices', () => {
  test('Plain Text and Markdown use the canonical label and link', async ({ page }) => {
    await openJournal(page);
    const info = await notices(page);
    await writeEntry(page, 'Licensing Check', 'Goblins on the road');

    const txt = await readDownload(await exportViaUi(page, 'txt'));
    expect(txt).toContain(`${info.referenceLabel}: ${info.srdUrl}`);
    expect(txt).toContain(info.attributionText);
    expect(txt).not.toMatch(OLD_51);
    expectVerbatim(txt, 'Journal TXT');
    expect(txt, 'the statement is not followed by a separate license line').not.toContain('License: ');

    const md = await readDownload(await exportViaUi(page, 'markdown'));
    expect(md).toContain(`[${info.referenceLabel}](${info.srdUrl})`);
    expect(md).not.toMatch(OLD_51);
    expectVerbatim(md, 'Journal Markdown');
  });

  test('PDF prints the canonical label and link', async ({ page }) => {
    await openJournal(page);
    const info = await notices(page);
    // record every string the export draws, through the library's public text() call
    await page.evaluate(() => {
      const Base = window.jspdf.jsPDF;
      window.__pdfText = [];
      window.jspdf.jsPDF = class extends Base {
        constructor(...args) {
          super(...args);
          const draw = this.text; // jsPDF sets text() on each instance, so it is wrapped here, not on the prototype
          this.text = (t, ...rest) => { window.__pdfText.push(...[].concat(t)); return draw.call(this, t, ...rest); };
        }
      };
    });
    await writeEntry(page, 'Licensing Check', 'Goblins on the road');
    const download = await exportViaUi(page, 'pdf');
    expect(download.suggestedFilename()).toBe('licensing_check.pdf');
    // long lines wrap in the PDF, so compare with whitespace collapsed
    const drawn = (await page.evaluate(() => window.__pdfText)).join(' ').replace(/\s+/g, ' ');
    expect(drawn).toContain(`${info.referenceLabel}: ${info.srdUrl}`);
    expect(drawn).not.toMatch(OLD_51);
    expectVerbatim(drawn, 'Journal PDF');
  });

  test('Word prints the canonical label and link', async ({ page }) => {
    await openJournal(page);
    const info = await notices(page);
    // record the text of every paragraph the export creates, through the library's public Paragraph class
    await page.evaluate(() => {
      const Base = window.docx.Paragraph;
      window.__docxText = [];
      window.docx.Paragraph = class extends Base {
        constructor(options) { super(options); if (options && typeof options.text === 'string') window.__docxText.push(options.text); }
      };
    });
    await writeEntry(page, 'Licensing Check', 'Goblins on the road');
    const download = await exportViaUi(page, 'word');
    expect(download.suggestedFilename()).toBe('licensing_check.docx');
    const drawn = (await page.evaluate(() => window.__docxText)).join('\n');
    expect(drawn).toContain(`${info.referenceLabel}: ${info.srdUrl}`);
    expect(drawn).toContain(info.attributionText);
    expect(drawn).not.toMatch(OLD_51);
    expectVerbatim(drawn, 'Journal Word');
    const paragraphs = await page.evaluate(() => window.__docxText);
    expect(paragraphs, 'the statement is a paragraph of its own, exactly').toContain(OFFICIAL_ATTRIBUTION);
  });
});

test.describe('other consumers use the same notices', () => {
  test('the character-sheet export footer and Word notices come from the shared accessor', async ({ page }) => {
    await page.goto('/characters.html');
    await page.waitForFunction(() => window.characterSheetExporter && typeof window.getSrdLicenseNotices === 'function');
    const result = await page.evaluate(() => ({
      shared: window.getSrdLicenseNotices(),
      viaExporter: window.characterSheetExporter.getLicenseNotices(),
      footer: window.characterSheetExporter.generateLicenseSectionHTML(),
    }));
    expect(result.viaExporter).toEqual(result.shared);
    expect(result.footer).toContain(`${result.shared.referenceLabel}:`);
    expect(result.footer).toContain(result.shared.srdUrl);
    expect(result.footer).not.toMatch(OLD_51);
    expectVerbatim(result.footer, 'character-sheet footer');
    expect(result.footer, 'the statement is plain text, not a link').not.toContain('<a href="https://creativecommons');
  });

  test('the diagnostics panel prints the shared label and link', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof window.getSrdLicenseNotices === 'function');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Control+Alt+d');
    const panel = page.locator('#dm-toolbox-diagnostics');
    await expect(panel).toBeVisible();
    const info = await notices(page);
    await expect(panel).toContainText(`${info.referenceLabel}:`);
    expect(await panel.locator(`a[href="${info.srdUrl}"]`).count()).toBe(1);
    const panelText = await panel.innerText();
    expect(panelText).not.toMatch(OLD_51);
    expect(panelText, 'the statement appears once, unchanged').toContain(OFFICIAL_ATTRIBUTION);
    expect(occurrences(panelText, OFFICIAL_ATTRIBUTION)).toBe(1);
    expect(await panel.locator('a[href*="creativecommons"]').count(), 'no link added to the statement').toBe(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('the licensing dependency is required, and says so', () => {
  test('a Journal export without the shared notices fails with a clear message, not a TypeError', async ({ page }) => {
    const dialogs = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    await openJournal(page);
    await writeEntry(page, 'Licensing Check', 'Goblins on the road');
    await page.evaluate(() => { delete window.getSrdLicenseNotices; });
    await page.locator('#exportBtn').click();
    await expect(page.locator('#exportModal')).toBeVisible();
    await page.locator('#exportModal [data-export-format="txt"]').click();
    await expect.poll(() => dialogs.join('|')).toContain('SRD licensing information is unavailable.');
    expect(dialogs.join('|')).not.toContain('is not a function');
  });

  test('the notices are read from the shared accessor at export time, with no local fallback', async ({ page }) => {
    await openJournal(page);
    const threw = await page.evaluate(() => {
      delete window.getSrdLicenseNotices;
      try { window.JournalExport.getLicenseNotices(); return 'no error'; } catch (e) { return e.message; }
    });
    expect(threw).toBe('SRD licensing information is unavailable.');
  });

  test('the character-sheet exporter fails the same way', async ({ page }) => {
    await page.goto('/characters.html');
    await page.waitForFunction(() => window.characterSheetExporter);
    const threw = await page.evaluate(() => {
      delete window.getSrdLicenseNotices;
      try { window.characterSheetExporter.getLicenseNotices(); return 'no error'; } catch (e) { return e.message; }
    });
    expect(threw).toBe('SRD licensing information is unavailable.');
  });
});
