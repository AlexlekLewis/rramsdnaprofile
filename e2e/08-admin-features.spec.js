/**
 * MODULE 8 — ADMIN FEATURES (Dashboard, Profiles, Squads)
 * 
 * Tests admin-only views: dashboard analytics, profile management,
 * squad assignment, and engine guide.
 * 
 * Requires: TEST_ADMIN_USER and TEST_ADMIN_PASS
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, login, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL, AUTH_TIMEOUT, ADMIN_USER, ADMIN_PASS } from './helpers/constants.js';

const needsAdmin = !ADMIN_USER || !ADMIN_PASS;

test.describe('8.1 — Admin Dashboard', () => {
  test.skip(needsAdmin, 'Admin credentials not configured');

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });
  });

  test('dashboard loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.click(SEL.dashboardNav);
    await page.waitForTimeout(3000);

    // Should show dashboard content
    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(50);

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Dashboard errors: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('dashboard shows analytics sections', async ({ page }) => {
    await page.click(SEL.dashboardNav);
    await page.waitForTimeout(3000);

    // Look for typical dashboard content
    const hasAnalytics = await page.locator('text=/Overview|Players|Engagement|Assessment|Squad|Domain|Average/i').count() > 0;
    expect(hasAnalytics, 'Dashboard should show analytics sections').toBe(true);
  });
});

test.describe('8.2 — Admin Profiles', () => {
  test.skip(needsAdmin, 'Admin credentials not configured');

  test('profiles tab loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    await page.click(SEL.profilesNav);
    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(50);

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Profiles errors: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('profiles shows member list or empty state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    await page.click(SEL.profilesNav);
    await page.waitForTimeout(3000);

    const hasMembers = await page.locator('text=/player|coach|admin|Member/i').count() > 0;
    const hasEmpty = await page.locator('text=/No members|No profiles/i').count() > 0;
    expect(hasMembers || hasEmpty, 'Should show members or empty state').toBe(true);
  });
});

test.describe('8.3 — Squad Assignment', () => {
  test.skip(needsAdmin, 'Admin credentials not configured');

  test('squads tab loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    await page.click(SEL.squadsNav);
    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(50);

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Squads errors: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('squads shows squad groups or create option', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    await page.click(SEL.squadsNav);
    await page.waitForTimeout(3000);

    const hasSquads = await page.locator('text=/Squad|Group|Create|Assign|Allocat/i').count() > 0;
    expect(hasSquads, 'Should show squad management UI').toBe(true);
  });
});

test.describe('8.4 — Coach-Only Nav (Non-Admin)', () => {

  test('coach role should only see Roster in nav', async ({ page }) => {
    // This test would need a coach-only account (not admin)
    // Verify by checking the nav structure from the code
    // NAV_ITEMS_COACH = [NAV_ITEMS_ADMIN[0]] — only Roster
    // We can test this with a dedicated coach account if available
    const COACH_USER = process.env.TEST_COACH_USER;
    const COACH_PASS = process.env.TEST_COACH_PASS;
    test.skip(!COACH_USER || !COACH_PASS, 'Coach credentials not configured — set TEST_COACH_USER and TEST_COACH_PASS');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, COACH_USER, COACH_PASS);
    await page.waitForTimeout(3000);

    // Coach should see Roster but NOT Dashboard, Profiles, Squads
    await expect(page.locator(SEL.rosterNav)).toBeVisible();
    await expect(page.locator(SEL.dashboardNav)).not.toBeVisible();
    await expect(page.locator(SEL.profilesNav)).not.toBeVisible();
    await expect(page.locator(SEL.squadsNav)).not.toBeVisible();
  });
});
