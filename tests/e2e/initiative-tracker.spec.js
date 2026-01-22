/**
 * Initiative Tracker E2E Tests
 * Tests for the initiative tracker page structure and basic interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Initiative Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('initiative.html');
  });

  test.describe('Page Load', () => {
    test('displays initiative tracker page correctly', async ({ page }) => {
      await expect(page).toHaveTitle(/Initiative Tracker/);
      await expect(page.locator('h1')).toContainText('Initiative Tracker');
    });

    test('shows combat round counter', async ({ page }) => {
      await expect(page.locator('#combat-round')).toBeVisible();
    });

    test('displays add combatant form', async ({ page }) => {
      await expect(page.locator('#initiative-form')).toBeVisible();
      await expect(page.locator('#character-name')).toBeVisible();
      await expect(page.locator('#initiative-roll')).toBeVisible();
      await expect(page.locator('#character-health')).toBeVisible();
      await expect(page.locator('#character-ac')).toBeVisible();
      await expect(page.locator('#character-type')).toBeVisible();
    });

    test('displays dice roller section', async ({ page }) => {
      await expect(page.locator('.dice-btn').first()).toBeVisible();
      await expect(page.locator('#custom-dice-input')).toBeVisible();
    });

    test('displays action buttons', async ({ page }) => {
      await expect(page.locator('#next-turn')).toBeVisible();
      await expect(page.locator('#clear-all')).toBeVisible();
      await expect(page.locator('#reset-turns')).toBeVisible();
    });
  });

  test.describe('Page Structure', () => {
    test('initiative table exists', async ({ page }) => {
      // The tbody may be empty/hidden, but the table wrapper should be visible
      await expect(page.locator('.initiative-table')).toBeVisible();
      // And the tbody should at least be attached to the DOM
      await expect(page.locator('#initiative-order')).toBeAttached();
    });

    test('mobile initiative order container exists', async ({ page }) => {
      // On desktop, this may be hidden via d-none d-md-block classes
      const mobileOrder = page.locator('#mobile-initiative-order');
      await expect(mobileOrder).toBeAttached();
    });

    test('auto-save toggle is present', async ({ page }) => {
      await expect(page.locator('#autoSaveToggle')).toBeVisible();
    });

    test('manual save button is present', async ({ page }) => {
      await expect(page.locator('#manualSaveBtn')).toBeVisible();
    });

    test('export session button is present', async ({ page }) => {
      await expect(page.locator('#export-btn')).toBeVisible();
    });

    test('import session button is present', async ({ page }) => {
      await expect(page.locator('#import-btn')).toBeVisible();
    });

    test('lock order toggle is present', async ({ page }) => {
      await expect(page.locator('#lockOrderToggle')).toBeVisible();
    });

    test('player view toggle is present', async ({ page }) => {
      await expect(page.locator('#playerViewToggle')).toBeVisible();
    });
  });

  test.describe('Form Interactions', () => {
    test('can fill in character name', async ({ page }) => {
      await page.locator('#character-name').fill('Test Character');
      await expect(page.locator('#character-name')).toHaveValue('Test Character');
    });

    test('can fill in initiative roll', async ({ page }) => {
      await page.locator('#initiative-roll').fill('15');
      await expect(page.locator('#initiative-roll')).toHaveValue('15');
    });

    test('can fill in max HP', async ({ page }) => {
      await page.locator('#character-health').fill('45');
      await expect(page.locator('#character-health')).toHaveValue('45');
    });

    test('can fill in AC', async ({ page }) => {
      await page.locator('#character-ac').fill('18');
      await expect(page.locator('#character-ac')).toHaveValue('18');
    });

    test('can select PC type', async ({ page }) => {
      await page.locator('#character-type').selectOption('PC');
      await expect(page.locator('#character-type')).toHaveValue('PC');
    });

    test('can select Enemy type', async ({ page }) => {
      await page.locator('#character-type').selectOption('Enemy');
      await expect(page.locator('#character-type')).toHaveValue('Enemy');
    });

    test('can select NPC type', async ({ page }) => {
      await page.locator('#character-type').selectOption('NPC');
      await expect(page.locator('#character-type')).toHaveValue('NPC');
    });

    test('can select Companion type', async ({ page }) => {
      await page.locator('#character-type').selectOption('Companion');
      await expect(page.locator('#character-type')).toHaveValue('Companion');
    });
  });

  test.describe('Dice Roller UI', () => {
    test('all standard dice buttons are present', async ({ page }) => {
      await expect(page.locator('.dice-btn[data-dice="4"]')).toBeVisible();
      await expect(page.locator('.dice-btn[data-dice="6"]')).toBeVisible();
      await expect(page.locator('.dice-btn[data-dice="8"]')).toBeVisible();
      await expect(page.locator('.dice-btn[data-dice="10"]')).toBeVisible();
      await expect(page.locator('.dice-btn[data-dice="12"]')).toBeVisible();
      await expect(page.locator('.dice-btn[data-dice="20"]')).toBeVisible();
      await expect(page.locator('.dice-btn[data-dice="100"]')).toBeVisible();
    });

    test('advantage and disadvantage buttons are present', async ({ page }) => {
      await expect(page.locator('#roll-adv')).toBeVisible();
      await expect(page.locator('#roll-dis')).toBeVisible();
    });

    test('custom dice input is present', async ({ page }) => {
      await expect(page.locator('#custom-dice-input')).toBeVisible();
      await expect(page.locator('#roll-custom-dice')).toBeVisible();
    });

    test('dice result area exists', async ({ page }) => {
      await expect(page.locator('#dice-result')).toBeAttached();
    });
  });

  test.describe('View Options', () => {
    test('quick help button opens offcanvas', async ({ page }) => {
      await page.locator('#helpBtn').click();
      await expect(page.locator('#helpCanvas')).toBeVisible();
    });
  });
});
