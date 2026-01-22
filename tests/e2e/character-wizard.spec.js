/**
 * Character Creation Wizard E2E Tests
 * Tests for character wizard UI elements
 * Note: Full wizard flow tests require a web server due to JS module limitations with file:// protocol
 */

import { test, expect } from '@playwright/test';

test.describe('Character Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('characters.html');
  });

  test.describe('Wizard Trigger', () => {
    test('new character button is clickable', async ({ page }) => {
      const newCharBtn = page.locator('#newCharacterBtn');
      await expect(newCharBtn).toBeVisible();
      await expect(newCharBtn).toBeEnabled();
    });

    test('new character button has correct text', async ({ page }) => {
      const newCharBtn = page.locator('#newCharacterBtn');
      await expect(newCharBtn).toContainText('New');
    });
  });

  test.describe('Page Elements for Character Creation', () => {
    test('character select exists for managing characters', async ({ page }) => {
      await expect(page.locator('#characterSelect')).toBeVisible();
    });

    test('import button allows importing character JSON', async ({ page }) => {
      await expect(page.locator('#importCharacterBtn')).toBeVisible();
    });

    test('hidden file input exists for import', async ({ page }) => {
      // The file input is hidden but should exist in the DOM
      const fileInput = page.locator('#importFileInput');
      await expect(fileInput).toBeAttached();
      await expect(fileInput).toHaveAttribute('accept', 'application/json');
    });
  });
});
