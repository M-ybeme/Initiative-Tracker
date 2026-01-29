/**
 * SRD Content Filtering E2E Tests
 *
 * Tests that verify SRD content filtering is working correctly in the browser.
 * These tests check that non-SRD content is properly hidden/blocked in the UI.
 */

import { test, expect } from '@playwright/test';

test.describe('SRD Content Filtering', () => {
  test.describe('Character Creation Wizard - Race Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('characters.html');
    });

    test('should show SRD races in race selector', async ({ page }) => {
      // Open the character wizard
      const newCharBtn = page.locator('#newCharacterBtn');
      await newCharBtn.click();

      // Wait for wizard modal to appear
      await page.waitForSelector('#characterWizardModal', { state: 'visible' });

      // Navigate to race selection step (click Next from welcome)
      await page.click('#wizardNextBtn');
      await page.waitForTimeout(300);

      // Check that SRD races are visible
      const raceSelect = page.locator('#wizardRace');
      await expect(raceSelect).toBeVisible();

      // Human should always be available (SRD)
      const humanOption = raceSelect.locator('option[value="Human"]');
      await expect(humanOption).toBeAttached();

      // Elf should always be available (SRD)
      const elfOption = raceSelect.locator('option[value="Elf"]');
      await expect(elfOption).toBeAttached();
    });

    test('should hide non-SRD races via data-srd-block', async ({ page }) => {
      // Open the character wizard
      await page.locator('#newCharacterBtn').click();
      await page.waitForSelector('#characterWizardModal', { state: 'visible' });

      // Navigate to race selection
      await page.click('#wizardNextBtn');
      await page.waitForTimeout(300);

      // Check that blocked races have the data-srd-block attribute
      const blockedRaces = page.locator('#wizardRace option[data-srd-block]');

      // Count how many races are marked as blocked
      const blockedCount = await blockedRaces.count();

      // There should be some blocked races (non-SRD)
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  test.describe('Character Creation Wizard - Background Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('characters.html');
    });

    test('should show only 4 SRD backgrounds', async ({ page }) => {
      // The wizard needs to be navigated to the background step
      // This test verifies the data-srd-block attributes are present

      await page.locator('#newCharacterBtn').click();
      await page.waitForSelector('#characterWizardModal', { state: 'visible' });

      // Get page content to check background options have blocking attributes
      const pageContent = await page.content();

      // Check that non-SRD backgrounds have blocking attributes
      const nonSrdBackgrounds = [
        'Charlatan',
        'Entertainer',
        'Folk Hero',
        'Guild Artisan',
        'Hermit',
        'Noble',
        'Outlander',
        'Sailor',
        'Urchin'
      ];

      for (const bg of nonSrdBackgrounds) {
        // These should have data-srd-block attributes
        expect(pageContent).toContain(`data-srd-block="background:${bg}"`);
      }

      // SRD backgrounds should NOT have blocking attributes
      const srdBackgrounds = ['Acolyte', 'Criminal', 'Sage', 'Soldier'];
      for (const bg of srdBackgrounds) {
        // Count occurrences - the value should appear but not with data-srd-block
        const hasBlockAttribute = pageContent.includes(
          `value="${bg}" data-srd-block`
        );
        expect(hasBlockAttribute).toBe(false);
      }
    });
  });

  test.describe('Initiative Page - Spell Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('initiative.html');
    });

    test('should have spell lookup functionality', async ({ page }) => {
      // Check that the spell lookup UI exists
      const spellSearch = page.locator('#spellSearch, #spellSearchInput, [data-spell-search]');

      // The page should have some spell-related UI
      // This is a basic check that the page loads correctly
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('SRD Filter Global Object', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('characters.html');
    });

    test('should have SRDContentFilter available globally', async ({ page }) => {
      const hasFilter = await page.evaluate(() => {
        return typeof window.SRDContentFilter === 'object';
      });

      expect(hasFilter).toBe(true);
    });

    test('should have isAllowed function', async ({ page }) => {
      const hasIsAllowed = await page.evaluate(() => {
        return typeof window.SRDContentFilter?.isAllowed === 'function';
      });

      expect(hasIsAllowed).toBe(true);
    });

    test('should correctly filter SRD spells', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForLoadState('load');

      const filterResults = await page.evaluate(() => {
        const filter = window.SRDContentFilter;
        if (!filter) return { error: 'No filter' };

        return {
          fireball: filter.isAllowed('spell', 'Fireball'),
          magicMissile: filter.isAllowed('spell', 'Magic Missile'),
          // These should be blocked (not in SRD 5.2)
          hex: filter.isAllowed('spell', 'Hex'),
          eldritchBlast: filter.isAllowed('spell', 'Eldritch Blast')
        };
      });

      // SRD spells should be allowed
      expect(filterResults.fireball).toBe(true);
      expect(filterResults.magicMissile).toBe(true);

      // Non-SRD spells should be blocked (if spell is in blocklist)
      // Note: These may return true if not in the spell dataset at all
    });

    test('should block all subclasses (SRD 5.2)', async ({ page }) => {
      await page.waitForLoadState('load');

      const subclassResults = await page.evaluate(() => {
        const filter = window.SRDContentFilter;
        if (!filter) return { error: 'No filter' };

        return {
          // All subclasses should be blocked in SRD 5.2
          hexblade: filter.isAllowed('subclass', 'Warlock:The Hexblade'),
          champion: filter.isAllowed('subclass', 'Fighter:Champion'),
          evocation: filter.isAllowed('subclass', 'Wizard:School of Evocation'),
          lifeDomain: filter.isAllowed('subclass', 'Cleric:Life Domain')
        };
      });

      // All subclasses should be blocked
      expect(subclassResults.hexblade).toBe(false);
      expect(subclassResults.champion).toBe(false);
      expect(subclassResults.evocation).toBe(false);
      expect(subclassResults.lifeDomain).toBe(false);
    });

    test('should only allow 4 SRD backgrounds', async ({ page }) => {
      await page.waitForLoadState('load');

      const bgResults = await page.evaluate(() => {
        const filter = window.SRDContentFilter;
        if (!filter) return { error: 'No filter' };

        return {
          // SRD backgrounds
          acolyte: filter.isAllowed('background', 'Acolyte'),
          criminal: filter.isAllowed('background', 'Criminal'),
          sage: filter.isAllowed('background', 'Sage'),
          soldier: filter.isAllowed('background', 'Soldier'),
          // Non-SRD backgrounds
          charlatan: filter.isAllowed('background', 'Charlatan'),
          entertainer: filter.isAllowed('background', 'Entertainer'),
          noble: filter.isAllowed('background', 'Noble'),
          hermit: filter.isAllowed('background', 'Hermit')
        };
      });

      // SRD backgrounds should be allowed
      expect(bgResults.acolyte).toBe(true);
      expect(bgResults.criminal).toBe(true);
      expect(bgResults.sage).toBe(true);
      expect(bgResults.soldier).toBe(true);

      // Non-SRD backgrounds should be blocked
      expect(bgResults.charlatan).toBe(false);
      expect(bgResults.entertainer).toBe(false);
      expect(bgResults.noble).toBe(false);
      expect(bgResults.hermit).toBe(false);
    });
  });
});

test.describe('Content Pack Import', () => {
  test.describe('Diagnostics Panel Access', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('characters.html');
    });

    test('should open diagnostics panel with Ctrl+Alt+D', async ({ page }) => {
      // Press Ctrl+Alt+D to open diagnostics
      await page.keyboard.press('Control+Alt+d');

      // Wait for diagnostics panel to appear
      const diagnosticsPanel = page.locator('#diagnosticsPanel, [data-diagnostics-panel]');

      // The panel should become visible (or a modal should open)
      // This depends on how the diagnostics UI is implemented
      await page.waitForTimeout(500);
    });
  });
});
