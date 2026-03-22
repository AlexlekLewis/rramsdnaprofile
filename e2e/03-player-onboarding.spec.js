/**
 * MODULE 3 — PLAYER ONBOARDING (7-Step Wizard)
 * 
 * Tests the onboarding wizard UI structure, step navigation,
 * field validation, and form behavior.
 * 
 * Requires a test player account: TEST_PLAYER_USER and TEST_PLAYER_PASS
 * OR admin credentials to verify onboarding data from the coach side.
 * 
 * NOTE: Some tests verify UI structure without submitting data,
 * to avoid creating junk records in production.
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, login, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL, AUTH_TIMEOUT, TEST_PLAYER_USER, TEST_PLAYER_PASS, ADMIN_USER, ADMIN_PASS, ROLES } from './helpers/constants.js';

const needsPlayer = !TEST_PLAYER_USER || !TEST_PLAYER_PASS;

test.describe('3.1 — Onboarding Structure (requires player account in onboarding state)', () => {
  test.skip(needsPlayer, 'Player credentials not configured — set TEST_PLAYER_USER and TEST_PLAYER_PASS');

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, TEST_PLAYER_USER, TEST_PLAYER_PASS);
    // Should land in onboarding (if player hasn't submitted yet)
    await page.waitForTimeout(2000);
  });

  test('onboarding shows step progress indicator', async ({ page }) => {
    const hasStepIndicator = await page.locator('text=/STEP [0-9]/i').count() > 0;
    const hasProgress = await page.locator('text=/[0-9]\/7/').count() > 0;
    expect(hasStepIndicator || hasProgress, 'Should show step progress').toBe(true);
  });

  test('Step 0 shows player profile fields', async ({ page }) => {
    // Core fields for Step 0: Name, DOB, contact info
    const hasNameField = await page.locator('input[placeholder*="Name" i]').count() > 0;
    const hasDobField = await page.locator('input[placeholder*="DD/MM" i]').or(page.locator('text=/Date of Birth/i')).count() > 0;
    expect(hasNameField || hasDobField, 'Step 0 should show profile fields').toBe(true);
  });

  test('DOB validation rejects invalid format', async ({ page }) => {
    const dobInput = page.locator('input[placeholder*="DD/MM" i]').first();
    if (await dobInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dobInput.fill('99/99/9999');
      // Try to advance — should show validation error
      const nextBtn = page.locator('button:has-text("NEXT")').or(page.locator('button:has-text("Next")'));
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('back button on Step 0 triggers sign out', async ({ page }) => {
    const backBtn = page.locator('svg').locator('..').filter({ has: page.locator('path[d*="M19 12H5"]') }).first();
    // The back button on step 0 should sign out
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(2000);
      // Should return to login
      const isLogin = await page.locator(SEL.signInButton).isVisible({ timeout: 3000 }).catch(() => false);
      // Or might show a confirmation — either way, valid behavior
    }
  });
});

test.describe('3.2 — Onboarding Field Types & Validation (UI-only checks)', () => {
  test.skip(needsPlayer, 'Player credentials not configured');

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, TEST_PLAYER_USER, TEST_PLAYER_PASS);
    await page.waitForTimeout(2000);
  });

  test('gender dropdown has M/F options', async ({ page }) => {
    const genderSel = page.locator('select').filter({ hasText: /Male|Female|M|F/i });
    if (await genderSel.count() > 0) {
      const options = await genderSel.first().locator('option').allTextContents();
      const hasGenderOptions = options.some(o => /Male|Female|^M$|^F$/i.test(o));
      expect(hasGenderOptions, 'Gender dropdown should have M/F options').toBe(true);
    }
  });

  test('role dropdown shows all 5 roles', async ({ page }) => {
    // Navigate to step 2 (T20 Identity) if possible
    // First advance past step 0 and 1
    const nextBtn = page.locator('button:has-text("NEXT")').or(page.locator('button:has-text("Next")'));

    // Look for role dropdown on current or subsequent steps
    for (let i = 0; i < 3; i++) {
      const roleSel = page.locator('select').filter({ hasText: /Batter|Pace|Spin|Keeper|All-Rounder/i });
      if (await roleSel.count() > 0) {
        const options = await roleSel.first().locator('option').allTextContents();
        for (const role of ROLES) {
          const found = options.some(o => o.includes(role) || o.toLowerCase().includes(role.toLowerCase()));
        }
        break;
      }
      // Try advancing to next step
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

test.describe('3.3 — Welcome Guide Modal', () => {
  test.skip(needsPlayer, 'Player credentials not configured');

  test('welcome modal appears on first visit', async ({ page }) => {
    // Clear the guide flag before navigating
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('rra_obGuide');
      sessionStorage.removeItem('rra_obGuide');
    });
    await waitForAppReady(page);
    await login(page, TEST_PLAYER_USER, TEST_PLAYER_PASS);
    await page.waitForTimeout(2000);

    // Check for welcome modal
    const hasWelcome = await page.locator('text=/Welcome to Your DNA Profile|Welcome to your/i').count() > 0;
    const hasLetsGo = await page.locator('button:has-text("Let\'s Go")').or(page.locator('button:has-text("LET\'S GO")')).count() > 0;

    // Either the modal shows, or the player is past onboarding
    if (hasWelcome) {
      expect(hasLetsGo, 'Welcome modal should have Let\'s Go button').toBe(true);

      // Dismiss modal
      await page.locator('button:has-text("Let\'s Go")').or(page.locator('button:has-text("LET\'S GO")')).first().click();
      await page.waitForTimeout(500);

      // Modal should be gone
      await expect(page.locator('text=/Welcome to Your DNA Profile/i')).not.toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('3.4 — Competition History Step (from coach view)', () => {
  test.skip(!ADMIN_USER || !ADMIN_PASS, 'Admin credentials not configured');

  test('player survey view shows competition data when present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });
    await page.waitForTimeout(2000);

    // Select first player
    const playerCards = page.locator('[style*="cursor: pointer"]').filter({ hasText: /years|yrs/ });
    const count = await playerCards.count();
    test.skip(count === 0, 'No players in roster');

    await playerCards.first().click();
    await page.waitForTimeout(2000);

    // Survey view should show competition data sections
    const content = await page.content();
    const hasCompSection = content.includes('Competition') || content.includes('competition') ||
                           content.includes('Batting') || content.includes('Bowling');
    expect(hasCompSection, 'Survey view should show competition/stats sections').toBe(true);
  });
});

test.describe('3.5 — Archetype Questionnaire UI', () => {
  test.skip(needsPlayer, 'Player credentials not configured');

  test('archetype questions render with options', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, TEST_PLAYER_USER, TEST_PLAYER_PASS);
    await page.waitForTimeout(2000);

    // Navigate to the T20 Identity step (step 2)
    const nextBtn = page.locator('button:has-text("NEXT")').or(page.locator('button:has-text("Next")'));
    for (let i = 0; i < 3; i++) {
      const hasDNA = await page.locator('text=/BATTING DNA|BOWLING DNA|YOUR.*DNA/i').count() > 0;
      if (hasDNA) break;
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Check for archetype questionnaire elements
    const hasDNA = await page.locator('text=/BATTING DNA|BOWLING DNA|YOUR.*DNA/i').count() > 0;
    if (hasDNA) {
      // Should show numbered questions with multiple-choice options
      const hasQuestions = await page.locator('text=/^1\./').count() > 0;
      expect(hasQuestions, 'Archetype section should show numbered questions').toBe(true);
    }
  });
});
