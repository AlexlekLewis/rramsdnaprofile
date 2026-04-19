/**
 * MODULE 0 — SMOKE TESTS
 * 
 * Verifies the app loads at all, renders the expected UI structure,
 * and produces no fatal console errors. If these fail, nothing else matters.
 */
import { test, expect } from '@playwright/test';
import { collectConsoleErrors, assertNoFatalErrors, waitForAppReady } from './helpers/auth.js';
import { SEL, LOAD_TIMEOUT } from './helpers/constants.js';

test.describe('Smoke Tests — App Loads', () => {

  test('homepage loads and renders login form', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Core branding elements
    await expect(page.locator(SEL.logo).first()).toBeVisible({ timeout: LOAD_TIMEOUT });
    await expect(page.locator('text=Rajasthan Royals Academy')).toBeVisible();
    await expect(page.locator('text=Player DNA Profile')).toBeVisible();
    await expect(page.locator('text=Onboarding & Assessment System')).toBeVisible();

    // Login form elements
    await expect(page.locator(SEL.loginUsernameInput)).toBeVisible();
    await expect(page.locator(SEL.loginPasswordInput)).toBeVisible();
    await expect(page.locator(SEL.signInButton)).toBeVisible();

    // Helper links
    await expect(page.locator(SEL.registerLink)).toBeVisible();
    await expect(page.locator(SEL.forgotPasswordText)).toBeVisible();

    // No fatal console errors
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Fatal console errors: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('no JavaScript errors on cold load', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    expect(pageErrors, `Page errors: ${pageErrors.join('; ')}`).toHaveLength(0);
  });

  test('?join=player shows registration form (not login)', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await expect(page.locator('text=Create your account')).toBeVisible();
    await expect(page.locator(SEL.regCodeInput)).toBeVisible();
    await expect(page.locator(SEL.regNameInput)).toBeVisible();
    await expect(page.locator(SEL.regUsernameInput)).toBeVisible();
    await expect(page.locator(SEL.createAccountButton)).toBeVisible();
  });

  test('?join=coach shows registration form for coach', async ({ page }) => {
    await page.goto('/?join=coach', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await expect(page.locator('text=Create your account')).toBeVisible();
    await expect(page.locator(SEL.createAccountButton)).toBeVisible();
  });

  test('login instructions link works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click(SEL.loginInstructionsLink),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    const url = newPage.url();
    expect(url).toContain('login-instructions');
    await newPage.close();
  });

  test('page title is set', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const title = await page.title();
    // index.html should have a title set
    expect(title.length).toBeGreaterThan(0);
  });

  test('no horizontal overflow on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone SE
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance
  });
});
