/**
 * MODULE 7 — END-TO-END JOURNEYS & REGRESSION
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, devLoginCoach, devLoginPlayer, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('7.1 — Admin Full Journey', () => {
  test('coach: roster → player → assess → tabs → back', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await page.waitForTimeout(2000);

    const cards = page.locator('[style*="cursor: pointer"]').filter({ hasText: /\dyo/ });
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(2000);
      const btn = page.locator('text=/BEGIN ASSESSMENT/i');
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1500);
        for (const tab of ['Technical', 'Tactical', 'Summary']) {
          const el = page.locator(`text=/${tab}/i`).first();
          if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
            await el.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('coach: cycle through all nav sections', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    for (const nav of [SEL.dashboardNav, SEL.profilesNav, SEL.squadsNav, SEL.rosterNav]) {
      await page.click(nav);
      await page.waitForTimeout(1500);
      const body = await page.textContent('body');
      expect(body.trim().length).toBeGreaterThan(20);
    }
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('player: portal home → journal → back → IDP', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginPlayer(page);

    // Navigate to Journal if tile exists
    const journal = page.locator('text=/Journal/i').first();
    if (await journal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await journal.click();
      await page.waitForTimeout(1500);
      // Go back
      const back = page.locator('path[d*="M19 12H5"]').locator('..').locator('..').first();
      if (await back.isVisible({ timeout: 2000 }).catch(() => false)) {
        await back.click();
        await page.waitForTimeout(1000);
      }
    }

    // Navigate to IDP if tile exists
    const idp = page.locator('text=/IDP|Development|DNA/i').first();
    if (await idp.isVisible({ timeout: 2000 }).catch(() => false)) {
      await idp.click();
      await page.waitForTimeout(1500);
    }

    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });
});

test.describe('7.2 — Input Attributes', () => {
  test('login inputs have correct types', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.loginUsernameInput)).toHaveAttribute('type', 'text');
    await expect(page.locator(SEL.loginPasswordInput)).toHaveAttribute('type', 'password');
  });

  test('registration inputs have correct attributes', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.regUsernameInput)).toHaveAttribute('autocapitalize', 'off');
    await expect(page.locator(SEL.regUsernameInput)).toHaveAttribute('autocorrect', 'off');
    await expect(page.locator(SEL.regNameInput)).toHaveAttribute('autocapitalize', 'words');
  });
});

test.describe('7.3 — Regression Checks', () => {
  test('no "undefined" visible on login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    expect(await page.textContent('body')).not.toMatch(/\bundefined\b/);
  });

  test('no "NaN" visible on login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    expect(await page.textContent('body')).not.toContain('NaN');
  });

  test('no "[object Object]" visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    expect(await page.textContent('body')).not.toContain('[object Object]');
  });

  test('no "undefined"/"NaN" in coach portal', async ({ page }) => {
    await devLoginCoach(page);
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).not.toMatch(/\bundefined\b/);
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('[object Object]');
  });

  test('no "undefined"/"NaN" in player portal', async ({ page }) => {
    await devLoginPlayer(page);
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).not.toMatch(/\bundefined\b/);
    expect(body).not.toContain('NaN');
    expect(body).not.toContain('[object Object]');
  });

  test('login instructions page loads', async ({ page }) => {
    const resp = await page.goto('/login-instructions.html', { waitUntil: 'domcontentloaded' });
    expect(resp.status()).toBe(200);
    expect((await page.textContent('body')).length).toBeGreaterThan(50);
  });

  test('error boundary not visible on normal load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    expect(await page.textContent('body')).not.toContain('Something went wrong');
  });
});
