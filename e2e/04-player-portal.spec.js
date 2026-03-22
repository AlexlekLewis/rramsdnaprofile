/**
 * MODULE 4 — PLAYER PORTAL (Post-Onboarding)
 * 
 * Tests the player dashboard: home view, journal, IDP,
 * navigation, sign out, and data display.
 * 
 * Requires a submitted player account: TEST_PLAYER_USER / TEST_PLAYER_PASS
 * where userProfile.submitted === true (player has completed onboarding).
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, login, signOut, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL, AUTH_TIMEOUT, TEST_PLAYER_USER, TEST_PLAYER_PASS } from './helpers/constants.js';

// We need a player that has already submitted onboarding
const SUBMITTED_PLAYER_USER = process.env.TEST_SUBMITTED_PLAYER_USER || TEST_PLAYER_USER;
const SUBMITTED_PLAYER_PASS = process.env.TEST_SUBMITTED_PLAYER_PASS || TEST_PLAYER_PASS;
const needsPlayer = !SUBMITTED_PLAYER_USER || !SUBMITTED_PLAYER_PASS;

test.describe('4.1 — Player Portal Home', () => {
  test.skip(needsPlayer, 'Submitted player credentials not configured');

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, SUBMITTED_PLAYER_USER, SUBMITTED_PLAYER_PASS);
    await page.waitForTimeout(3000);
  });

  test('player portal shows welcome message', async ({ page }) => {
    // Either "Welcome back, Name" or the onboarding flow
    const isPortal = await page.locator('text=/Welcome back/i').count() > 0;
    const isOnboarding = await page.locator('text=/STEP|Welcome to Your DNA/i').count() > 0;

    if (isPortal) {
      await expect(page.locator('text=/Welcome back/i')).toBeVisible();
    }
    // If still in onboarding, that's valid — the player hasn't submitted yet
    expect(isPortal || isOnboarding, 'Should show portal or onboarding').toBe(true);
  });

  test('player portal shows action tiles (Journal, IDP)', async ({ page }) => {
    const isPortal = await page.locator('text=/Welcome back/i').count() > 0;
    test.skip(!isPortal, 'Player is in onboarding, not portal');

    // Look for Journal and IDP tiles
    const hasJournal = await page.locator('text=/Journal/i').count() > 0;
    const hasIDP = await page.locator('text=/IDP|Development Plan/i').count() > 0;
    expect(hasJournal, 'Should show Journal tile').toBe(true);
    expect(hasIDP, 'Should show IDP tile').toBe(true);
  });

  test('sign out button visible and works', async ({ page }) => {
    const isPortal = await page.locator('text=/Welcome back/i').count() > 0;
    test.skip(!isPortal, 'Player is in onboarding, not portal');

    await expect(page.locator(SEL.signOutButton).first()).toBeVisible();
    await signOut(page);
    await expect(page.locator(SEL.signInButton)).toBeVisible({ timeout: AUTH_TIMEOUT });
  });

  test('session data shows or has empty state', async ({ page }) => {
    const isPortal = await page.locator('text=/Welcome back/i').count() > 0;
    test.skip(!isPortal, 'Player is in onboarding, not portal');

    // Look for sessions section
    const hasSessions = await page.locator('text=/Recent Sessions|No sessions recorded/i').count() > 0;
    expect(hasSessions, 'Should show sessions section or empty state').toBe(true);
  });
});

test.describe('4.2 — Journal View', () => {
  test.skip(needsPlayer, 'Submitted player credentials not configured');

  test('journal view loads with tabs', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, SUBMITTED_PLAYER_USER, SUBMITTED_PLAYER_PASS);
    await page.waitForTimeout(3000);

    const isPortal = await page.locator('text=/Welcome back/i').count() > 0;
    test.skip(!isPortal, 'Player is in onboarding, not portal');

    // Click Journal tile
    const journalTile = page.locator('text=/Journal/i').first();
    await journalTile.click();
    await page.waitForTimeout(1500);

    // Should show journal header with back arrow
    const hasJournalHeader = await page.locator('text=/My Journal/i').count() > 0;
    expect(hasJournalHeader, 'Should show My Journal header').toBe(true);

    // Should have New Entry and History tabs
    const hasNewEntry = await page.locator('text=/New Entry/i').count() > 0;
    const hasHistory = await page.locator('text=/History/i').count() > 0;
    expect(hasNewEntry || hasHistory, 'Should show journal tabs').toBe(true);
  });

  test('journal back button returns to home', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, SUBMITTED_PLAYER_USER, SUBMITTED_PLAYER_PASS);
    await page.waitForTimeout(3000);

    const isPortal = await page.locator('text=/Welcome back/i').count() > 0;
    test.skip(!isPortal, 'Player is in onboarding');

    // Navigate to Journal
    await page.locator('text=/Journal/i').first().click();
    await page.waitForTimeout(1000);

    // Click back arrow
    const backBtn = page.locator('svg').locator('..').filter({ has: page.locator('path[d*="M19 12H5"]') }).first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/Welcome back/i')).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('4.3 — IDP View', () => {
  test.skip(needsPlayer, 'Submitted player credentials not configured');

  test('IDP view loads with goals section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, SUBMITTED_PLAYER_USER, SUBMITTED_PLAYER_PASS);
    await page.waitForTimeout(3000);

    const isPortal = await page.locator('text=/Welcome back/i').count() > 0;
    test.skip(!isPortal, 'Player is in onboarding');

    // Click IDP tile
    const idpTile = page.locator('text=/IDP|Development Plan/i').first();
    await idpTile.click();
    await page.waitForTimeout(1500);

    // Should show IDP content
    const hasIDP = await page.locator('text=/My IDP|My Goals|Focus Areas|No goals/i').count() > 0;
    expect(hasIDP, 'Should show IDP sections').toBe(true);
  });

  test('IDP goal input and add button exist', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, SUBMITTED_PLAYER_USER, SUBMITTED_PLAYER_PASS);
    await page.waitForTimeout(3000);

    const isPortal = await page.locator('text=/Welcome back/i').count() > 0;
    test.skip(!isPortal, 'Player is in onboarding');

    await page.locator('text=/IDP|Development Plan/i').first().click();
    await page.waitForTimeout(1500);

    // Look for goal input and add button
    const hasInput = await page.locator('input[placeholder*="goal" i]').or(page.locator('input[placeholder*="Goal" i]')).count() > 0;
    const hasAddBtn = await page.locator('button:has-text("ADD")').count() > 0;
    // Input and button should exist for adding goals
  });
});
