import { test, expect } from '@playwright/test';
import fs from 'fs';

// Journal page: js/journal-export.js must load and publish window.JournalExport.
// It is a classic script loaded after site.js, and site.js already declares a top-level `const SRD_PDF_URL`. When
// journal-export.js declared the same name at its own top level, the browser refused to parse it ("Identifier
// 'SRD_PDF_URL' has already been declared"), window.JournalExport never existed, and every export control failed.
// The file now runs in its own scope and reads the license notices from site.js, where the only copy lives.

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}

async function openJournal(page) {
  await page.goto('/journal.html');
  await page.waitForFunction(() => typeof window.JournalExport === 'object' && document.querySelector('.ProseMirror'));
}

// Names the entry and types its text in the real editor
async function writeEntry(page, name, text) {
  await page.locator('#fileName').fill(name);
  await page.locator('.ProseMirror').first().click();
  await page.keyboard.type(text);
}

// Exports through the real Export button and format choice, and returns the resulting download
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

test.describe('Journal export script', () => {
  test('the page loads with no script errors, and the export module initializes', async ({ page }) => {
    const errors = watchErrors(page);
    await openJournal(page);

    expect(errors.filter(e => /already been declared/.test(e)), 'no redeclaration error').toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);

    const state = await page.evaluate(() => ({
      scripts: [...document.scripts].filter(s => /journal-export\.js/.test(s.src)).length,
      type: typeof window.JournalExport,
      methods: ['handleExport', 'handleBulkExport', 'handleBulkExportCombined', 'exportAsTXT', 'exportAsMarkdown', 'exportAsWord', 'exportAsPDF', 'getLicenseNotices']
        .filter(m => typeof window.JournalExport?.[m] !== 'function'),
    }));
    expect(state.scripts, 'the script is included once').toBe(1);
    expect(state.type).toBe('object');
    expect(state.methods, 'every export method exists').toEqual([]);
  });

  test('evaluating the script a second time (a hot reload, or a duplicate include) is safe', async ({ page }) => {
    const errors = watchErrors(page);
    await openJournal(page);
    const first = await page.evaluate(() => window.JournalExport);
    expect(first).toBeTruthy();
    await page.addScriptTag({ url: '/js/journal-export.js' });
    await page.addScriptTag({ url: '/js/journal-export.js' });
    expect(await page.evaluate(() => typeof window.JournalExport.handleExport)).toBe('function');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('reload and back/forward navigation stay error-free with the module present', async ({ page }) => {
    const errors = watchErrors(page);
    await openJournal(page);
    await page.reload();
    await page.waitForFunction(() => typeof window.JournalExport === 'object');
    await page.goto('/index.html');
    await page.goBack();
    await page.waitForFunction(() => typeof window.JournalExport === 'object');
    await page.goForward();
    await page.goBack();
    await page.waitForFunction(() => typeof window.JournalExport === 'object' && document.querySelector('.ProseMirror'));
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Journal export through the real controls', () => {
  test('Plain Text export downloads the entry', async ({ page }) => {
    const errors = watchErrors(page);
    await openJournal(page);
    await writeEntry(page, 'Export Check', 'Goblins on the road');
    const download = await exportViaUi(page, 'txt');
    expect(download.suggestedFilename()).toBe('export_check.txt');
    expect(await readDownload(download)).toContain('Goblins on the road');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Markdown export downloads the entry with the license notice', async ({ page }) => {
    const errors = watchErrors(page);
    await openJournal(page);
    await writeEntry(page, 'Export Check', 'Goblins on the road');
    const download = await exportViaUi(page, 'markdown');
    expect(download.suggestedFilename()).toBe('export_check.md');
    const text = await readDownload(download);
    expect(text).toContain('Goblins on the road');
    expect(text).toContain('Creative Commons Attribution 4.0 International License');
    // the notices are site.js's, not a copy kept in journal-export.js
    const shared = await page.evaluate(() => window.getSrdLicenseNotices());
    expect(text).toContain(shared.srdUrl);
    expect(text).toContain(shared.productIdentityDisclaimer.slice(0, 60));
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Word export downloads a real .docx', async ({ page }) => {
    const errors = watchErrors(page);
    await openJournal(page);
    // journal.html loads docx 8.5.0's UMD build (build/index.umd.js), which publishes window.docx
    expect(await page.evaluate(() => ['Document', 'Packer', 'Paragraph', 'TextRun', 'HeadingLevel'].every(k => k in (window.docx || {})))).toBe(true);
    await writeEntry(page, 'Export Check', 'Goblins on the road');
    const download = await exportViaUi(page, 'word');
    expect(download.suggestedFilename()).toBe('export_check.docx');
    const bytes = fs.readFileSync(await download.path());
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(0, 2).toString('latin1'), 'a .docx is a ZIP container').toBe('PK');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('PDF export downloads a .pdf', async ({ page }) => {
    await openJournal(page);
    test.skip(!(await page.evaluate(() => !!(window.jspdf && window.jspdf.jsPDF))), 'the jsPDF library did not load (CDN unreachable)');
    await writeEntry(page, 'Export Check', 'Goblins on the road');
    const download = await exportViaUi(page, 'pdf');
    expect(download.suggestedFilename()).toBe('export_check.pdf');
    const header = fs.readFileSync(await download.path()).subarray(0, 5).toString('latin1');
    expect(header).toBe('%PDF-');
  });

  test('bulk export opens and its handler is attached', async ({ page }) => {
    const errors = watchErrors(page);
    await openJournal(page);
    await page.locator('#bulkExportBtn').click();
    await expect(page.locator('#bulkExportModal')).toBeVisible();
    await expect(page.locator('#executeBulkExportBtn')).toBeVisible();
    await expect(page.locator('input[name="bulkExportFormat"]')).toHaveCount(4);
    expect(await page.evaluate(() => [typeof window.JournalExport.handleBulkExport, typeof window.JournalExport.handleBulkExportCombined]))
      .toEqual(['function', 'function']);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
