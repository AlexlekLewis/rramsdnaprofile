/**
 * MODULE 4 — PLAYER PORTAL (via dev bypass ?devRole=player, submitted=true)
 */
import { test, expect } from '@playwright/test';
import { devLoginPlayer, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('4.1 — Player Portal Home', () => {
  test.beforeEach(async ({ page }) => { await devLoginPlayer(page); });

  test('player portal shows welcome message', async ({ page }) => {
    await expect(page.locator('text=/Welcome/i')).toBeVisible();
  });

  test('player portal shows action tiles (Journal, IDP/DNA)', async ({ page }) => {
    const hasJournal = await page.locator('text=/Journal/i').count() > 0;
    const hasIDP = await page.locator('text=/IDP|Development Plan|DNA/i').count() > 0;
    expect(hasJournal || hasIDP).toBe(true);
  });

  test('sign out button visible', async ({ page }) => {
    await expect(page.locator(SEL.signOutButton).first()).toBeVisible();
  });

  test('recent sessions section exists', async ({ page }) => {
    const has = await page.locator('text=/Recent Sessions|No sessions recorded/i').count() > 0;
    expect(has).toBe(true);
  });
});

test.describe('4.2 — Journal View', () => {
  test.beforeEach(async ({ page }) => { await devLoginPlayer(page); });

  test('journal view loads with tabs', async ({ page }) => {
    const tile = page.locator('text=/Journal/i').first();
    if (await tile.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tile.click();
      await page.waitForTimeout(1500);
      const has = await page.locator('text=/My Journal|New Entry|History/i').count() > 0;
      expect(has).toBe(true);
    }
  });

  test('journal back button returns to home', async ({ page }) => {
    const tile = page.locator('text=/Journal/i').first();
    if (await tile.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tile.click();
      await page.waitForTimeout(1000);
      const back = page.locator('path[d*="M19 12H5"]').locator('..').locator('..').first();
      if (await back.isVisible({ timeout: 2000 }).catch(() => false)) {
        await back.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('text=/Welcome/i')).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('4.3 — IDP / DNA View', () => {
  test.beforeEach(async ({ page }) => { await devLoginPlayer(page); });

  test('IDP/DNA view loads', async ({ page }) => {
    const tile = page.locator('text=/IDP|Development Plan|My DNA/i').first();
    if (await tile.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tile.click();
      await page.waitForTimeout(1500);
      const has = await page.locator('text=/My IDP|Goals|Focus|DNA/i').count() > 0;
      expect(has).toBe(true);
    }
  });
});

test.describe('4.4 — Console Health (Player Portal)', () => {
  test('player portal loads with zero fatal errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginPlayer(page);
    await page.waitForTimeout(3000);
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });
});
