/**
 * Navigation E2E Tests
 * Tests for site-wide navigation and page loading
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.describe('Homepage', () => {
    test('loads homepage successfully', async ({ page }) => {
      await page.goto('index.html');
      await expect(page).toHaveTitle(/The DM's Toolbox/);
      await expect(page.locator('h1')).toContainText("The DM's Toolbox");
    });

    test('displays hero section with action buttons', async ({ page }) => {
      await page.goto('index.html');

      // Check hero section exists
      await expect(page.locator('.hero-section')).toBeVisible();

      // Check main action button in hero section (Open Toolbox)
      await expect(page.locator('.hero-section a[href="initiative.html"]')).toBeVisible();
    });

    test('displays feature cards for all tools', async ({ page }) => {
      await page.goto('index.html');

      // Check feature card titles are visible (in the main content area, not dropdown)
      await expect(page.locator('.feature-card-title:has-text("Initiative Tracker")')).toBeVisible();
      await expect(page.locator('.feature-card-title:has-text("Battle Map")')).toBeVisible();
      await expect(page.locator('.feature-card-title:has-text("Encounter Builder")')).toBeVisible();

      // Check character tools
      await expect(page.locator('.feature-card-title:has-text("Character Manager")')).toBeVisible();
      await expect(page.locator('.feature-card-title:has-text("Journal")')).toBeVisible();

      // Check generators (they have simpler feature cards)
      await expect(page.locator('.feature-card-title:has-text("Tavern")')).toBeVisible();
      await expect(page.locator('.feature-card-title:has-text("Loot")')).toBeVisible();
      await expect(page.locator('.feature-card-title:has-text("Names")')).toBeVisible();
      await expect(page.locator('.feature-card-title:has-text("NPCs")')).toBeVisible();
      await expect(page.locator('.feature-card-title:has-text("Shops")')).toBeVisible();
    });
  });

  test.describe('Navbar Navigation', () => {
    test('navbar is present on homepage', async ({ page }) => {
      await page.goto('index.html');
      await expect(page.locator('#mainNav')).toBeVisible();
      await expect(page.locator('.navbar-brand')).toContainText("The DM's Toolbox");
    });

    test('combat dropdown contains correct links', async ({ page }) => {
      await page.goto('index.html');

      // Open combat dropdown
      await page.locator('.nav-link.dropdown-toggle').filter({ hasText: 'Combat' }).click();

      // Check dropdown items
      await expect(page.locator('.dropdown-item[href="initiative.html"]')).toBeVisible();
      await expect(page.locator('.dropdown-item[href="battlemap.html"]')).toBeVisible();
      await expect(page.locator('.dropdown-item[href="encounterbuilder.html"]')).toBeVisible();
    });

    test('generators dropdown contains correct links', async ({ page }) => {
      await page.goto('index.html');

      // Open generators dropdown
      await page.locator('.nav-link.dropdown-toggle').filter({ hasText: 'Generators' }).click();

      // Check dropdown items
      await expect(page.locator('.dropdown-item[href="name.html"]')).toBeVisible();
      await expect(page.locator('.dropdown-item[href="loot.html"]')).toBeVisible();
      await expect(page.locator('.dropdown-item[href="shop.html"]')).toBeVisible();
      await expect(page.locator('.dropdown-item[href="npc.html"]')).toBeVisible();
      await expect(page.locator('.dropdown-item[href="tav.html"]')).toBeVisible();
    });

    test('campaign dropdown contains correct links', async ({ page }) => {
      await page.goto('index.html');

      // Open campaign dropdown
      await page.locator('.nav-link.dropdown-toggle').filter({ hasText: 'Campaign' }).click();

      // Check dropdown items
      await expect(page.locator('.dropdown-item[href="characters.html"]')).toBeVisible();
      await expect(page.locator('.dropdown-item[href="journal.html"]')).toBeVisible();
    });
  });

  test.describe('Page Loading', () => {
    test('initiative tracker page loads', async ({ page }) => {
      await page.goto('initiative.html');
      await expect(page).toHaveTitle(/Initiative Tracker/);
      await expect(page.locator('h1')).toContainText('Initiative Tracker');
    });

    test('characters page loads', async ({ page }) => {
      await page.goto('characters.html');
      await expect(page).toHaveTitle(/Characters/);
    });

    test('journal page loads', async ({ page }) => {
      await page.goto('journal.html');
      await expect(page).toHaveTitle(/DM's Toolbox/);
    });

    test('name generator page loads', async ({ page }) => {
      await page.goto('name.html');
      await expect(page).toHaveTitle(/DM's Toolbox/);
    });

    test('loot generator page loads', async ({ page }) => {
      await page.goto('loot.html');
      await expect(page).toHaveTitle(/DM's Toolbox/);
    });

    test('shop generator page loads', async ({ page }) => {
      await page.goto('shop.html');
      await expect(page).toHaveTitle(/DM's Toolbox/);
    });

    test('npc generator page loads', async ({ page }) => {
      await page.goto('npc.html');
      await expect(page).toHaveTitle(/DM's Toolbox/);
    });

    test('tavern generator page loads', async ({ page }) => {
      await page.goto('tav.html');
      await expect(page).toHaveTitle(/DM's Toolbox/);
    });

    test('encounter builder page loads', async ({ page }) => {
      await page.goto('encounterbuilder.html');
      await expect(page).toHaveTitle(/DM's Toolbox/);
    });

    test('battlemap page loads', async ({ page }) => {
      await page.goto('battlemap.html');
      await expect(page).toHaveTitle(/DM's Toolbox/);
    });
  });

  test.describe('Navigation Between Pages', () => {
    test('can navigate from homepage to initiative tracker', async ({ page }) => {
      await page.goto('index.html');

      // Click on the Initiative Tracker launch button in feature cards
      await page.locator('.feature-card a[href="initiative.html"]').first().click();

      // Wait for navigation - serve strips .html extension, so match with or without it
      await expect(page).toHaveURL(/initiative(\.html)?$/, { timeout: 10000 });
      await expect(page).toHaveTitle(/Initiative Tracker/);
    });

    test('can navigate from homepage to characters', async ({ page }) => {
      await page.goto('index.html');

      // Click on Character Manager launch button in feature cards
      await page.locator('.feature-card a[href="characters.html"]').click();

      // Wait for navigation - serve strips .html extension, so match with or without it
      await expect(page).toHaveURL(/characters(\.html)?$/, { timeout: 10000 });
      await expect(page).toHaveTitle(/Characters/);
    });

    test('can navigate back to homepage via brand link', async ({ page }) => {
      await page.goto('initiative.html');

      // Click navbar brand
      await page.locator('.navbar-brand').click();

      // Wait for navigation - serve may serve index as root /, so match either format
      await expect(page).toHaveURL(/\/(index(\.html)?)?$/, { timeout: 10000 });
      await expect(page).toHaveTitle(/The DM's Toolbox/);
      await expect(page.locator('.hero-section')).toBeVisible();
    });
  });

  test.describe('Footer', () => {
    test('footer is present on homepage', async ({ page }) => {
      await page.goto('index.html');

      await expect(page.locator('footer')).toBeVisible();
      await expect(page.locator('footer')).toContainText('Maybeme');
    });

    test('social links are present in footer', async ({ page }) => {
      await page.goto('index.html');

      // Check for social links
      await expect(page.locator('footer a[href*="linkedin"]')).toBeVisible();
      await expect(page.locator('footer a[href*="github"]')).toBeVisible();
    });
  });
});
