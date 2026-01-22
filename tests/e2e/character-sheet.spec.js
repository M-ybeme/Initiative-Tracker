/**
 * Character Sheet E2E Tests
 * Tests for the character manager page structure
 */

import { test, expect } from '@playwright/test';

test.describe('Character Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('characters.html');
  });

  test.describe('Page Load', () => {
    test('displays character manager page correctly', async ({ page }) => {
      await expect(page).toHaveTitle(/Characters/);
      // Use more specific selector for the h2 in the header
      await expect(page.locator('h2.mb-0')).toContainText('Character Manager');
    });

    test('shows character selector', async ({ page }) => {
      await expect(page.locator('#characterSelect')).toBeVisible();
    });

    test('shows new character button', async ({ page }) => {
      await expect(page.locator('#newCharacterBtn')).toBeVisible();
    });

    test('shows save character button', async ({ page }) => {
      await expect(page.locator('#saveCharacterBtn')).toBeVisible();
    });

    test('shows delete character button', async ({ page }) => {
      await expect(page.locator('#deleteCharacterBtn')).toBeVisible();
    });

    test('shows export buttons', async ({ page }) => {
      await expect(page.locator('#exportCharacterBtn')).toBeVisible();
      await expect(page.locator('#exportAllCharactersBtn')).toBeVisible();
    });

    test('shows import button', async ({ page }) => {
      await expect(page.locator('#importCharacterBtn')).toBeVisible();
    });

    test('shows help button', async ({ page }) => {
      await expect(page.locator('#helpBtn')).toBeVisible();
    });
  });

  test.describe('Page Structure', () => {
    test('navbar is present', async ({ page }) => {
      await expect(page.locator('#mainNav')).toBeVisible();
    });

    test('character select dropdown exists', async ({ page }) => {
      const select = page.locator('#characterSelect');
      await expect(select).toBeVisible();
      await expect(select).toHaveAttribute('aria-label', 'Select Character');
    });

    test('print/export dropdown exists', async ({ page }) => {
      await expect(page.locator('#printExportDropdown')).toBeVisible();
    });

    test('send to initiative tracker button exists', async ({ page }) => {
      await expect(page.locator('#sendToTrackerBtn')).toBeVisible();
    });

    test('send to battle map button exists', async ({ page }) => {
      await expect(page.locator('#sendToBattleMapBtn')).toBeVisible();
    });

    test('combat view toggle exists', async ({ page }) => {
      await expect(page.locator('#dmCombatModeToggle')).toBeVisible();
    });

    test('storage usage display exists', async ({ page }) => {
      await expect(page.locator('#storageUsageText')).toBeVisible();
    });

    test('full character sheet container exists', async ({ page }) => {
      await expect(page.locator('#fullCharacterSheet')).toBeVisible();
    });
  });

  test.describe('Dropdown Interactions', () => {
    test('clicking print/export dropdown shows options', async ({ page }) => {
      await page.locator('#printExportDropdown').click();
      await expect(page.locator('#printSheetBtn')).toBeVisible();
      await expect(page.locator('#exportPdfBtn')).toBeVisible();
    });
  });
});
