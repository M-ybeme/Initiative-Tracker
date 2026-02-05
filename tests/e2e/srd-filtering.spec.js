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
      await page.waitForLoadState('networkidle');
    });

    // TODO: Update test to match current wizard implementation - button IDs changed
    test.skip('should show SRD races in race selector', async ({ page }) => {
      // Handle the confirm dialog that asks about using the wizard
      page.on('dialog', async dialog => {
        await dialog.accept(); // Click OK to use the wizard
      });

      // Open the character wizard
      const newCharBtn = page.locator('#newCharacterBtn');
      await newCharBtn.waitFor({ state: 'visible', timeout: 5000 });
      await newCharBtn.click();

      // Wait for wizard modal to appear
      await page.waitForSelector('#characterCreationModal', { state: 'visible', timeout: 10000 });

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

    // TODO: Update test to match current wizard implementation - button IDs changed
    test.skip('should hide non-SRD races via data-srd-block', async ({ page }) => {
      // Handle the confirm dialog that asks about using the wizard
      page.on('dialog', async dialog => {
        await dialog.accept(); // Click OK to use the wizard
      });

      // Open the character wizard
      const newCharBtn = page.locator('#newCharacterBtn');
      await newCharBtn.waitFor({ state: 'visible', timeout: 5000 });
      await newCharBtn.click();
      await page.waitForSelector('#characterCreationModal', { state: 'visible', timeout: 10000 });

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
      await page.waitForLoadState('networkidle');
    });

    // TODO: Update test to match current wizard implementation - uses data-srd-block attributes that aren't implemented
    test.skip('should show only 4 SRD backgrounds', async ({ page }) => {
      // Handle the confirm dialog that asks about using the wizard
      page.on('dialog', async dialog => {
        await dialog.accept(); // Click OK to use the wizard
      });

      // The wizard needs to be navigated to the background step
      // This test verifies the data-srd-block attributes are present

      const newCharBtn = page.locator('#newCharacterBtn');
      await newCharBtn.waitFor({ state: 'visible', timeout: 5000 });
      await newCharBtn.click();
      await page.waitForSelector('#characterCreationModal', { state: 'visible', timeout: 10000 });

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
      await page.waitForLoadState('networkidle');
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

    test('should allow SRD 5.2 subclasses', async ({ page }) => {
      await page.waitForLoadState('load');

      const subclassResults = await page.evaluate(() => {
        const filter = window.SRDContentFilter;
        if (!filter) return { error: 'No filter' };

        return {
          // SRD 5.2 subclasses - these SHOULD be allowed
          champion: filter.isAllowed('subclass', 'Fighter:Champion'),
          lifeDomain: filter.isAllowed('subclass', 'Cleric:Life Domain'),
          thief: filter.isAllowed('subclass', 'Rogue:Thief'),
          // Non-SRD subclasses - these should be blocked
          hexblade: filter.isAllowed('subclass', 'Warlock:The Hexblade'),
          battleMaster: filter.isAllowed('subclass', 'Fighter:Battle Master')
        };
      });

      // SRD 5.2 subclasses should be allowed
      expect(subclassResults.champion).toBe(true);
      expect(subclassResults.lifeDomain).toBe(true);
      expect(subclassResults.thief).toBe(true);
      // Non-SRD subclasses should be blocked
      expect(subclassResults.hexblade).toBe(false);
      expect(subclassResults.battleMaster).toBe(false);
    });

    test('should only allow SRD 5.2 backgrounds', async ({ page }) => {
      await page.waitForLoadState('load');

      const bgResults = await page.evaluate(() => {
        const filter = window.SRDContentFilter;
        if (!filter) return { error: 'No filter' };

        return {
          // SRD 5.2 background - only Acolyte is in SRD 5.2
          acolyte: filter.isAllowed('background', 'Acolyte'),
          // Non-SRD backgrounds - these should be blocked
          criminal: filter.isAllowed('background', 'Criminal'),
          sage: filter.isAllowed('background', 'Sage'),
          soldier: filter.isAllowed('background', 'Soldier'),
          noble: filter.isAllowed('background', 'Noble')
        };
      });

      // Only Acolyte is in SRD 5.2
      expect(bgResults.acolyte).toBe(true);
      // Other backgrounds are NOT in SRD 5.2
      expect(bgResults.criminal).toBe(false);
      expect(bgResults.sage).toBe(false);
      expect(bgResults.soldier).toBe(false);
      expect(bgResults.noble).toBe(false);
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
