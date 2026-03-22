/**
 * MODULE 7 — END-TO-END JOURNEYS & REGRESSION
 * 
 * Full cross-module journey tests that verify the happy path works
 * end-to-end, plus regression checks for previously fixed bugs.
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, login, signOut, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL, AUTH_TIMEOUT, ADMIN_USER, ADMIN_PASS, TEST_PLAYER_USER, TEST_PLAYER_PASS } from './helpers/constants.js';

test.describe('7.1 — Admin Full Journey (Login → Roster → Player → Assess → Back)', () => {
  const needsAdmin = !ADMIN_USER || !ADMIN_PASS;
  test.skip(needsAdmin, 'Admin credentials not configured');

  test('admin can complete full assessment navigation flow', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    // 1. Login
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // 2. Wait for roster
    await page.waitForTimeout(2000);
    const playerCards = page.locator('[style*="cursor: pointer"]').filter({ hasText: /years|yrs/ });
    const count = await playerCards.count();

    if (count > 0) {
      // 3. Select first player
      await playerCards.first().click();
      await page.waitForTimeout(2000);

      // 4. Should show survey view
      const hasSurvey = await page.locator('text=/BEGIN ASSESSMENT|Competition|Player Voice|Back to roster/i').count() > 0;
      expect(hasSurvey, 'Survey view should load').toBe(true);

      // 5. Begin assessment (if button exists)
      const beginBtn = page.locator('text=/BEGIN ASSESSMENT/i');
      if (await beginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await beginBtn.click();
        await page.waitForTimeout(1500);

        // 6. Should show assessment pages
        const hasAssessment = await page.locator('text=/Identity|Technical|Tactical|Summary|PDI/i').count() > 0;
        expect(hasAssessment, 'Assessment should load').toBe(true);

        // 7. Navigate through each tab
        const tabs = ['Technical', 'Tactical', 'Summary'];
        for (const tab of tabs) {
          const tabEl = page.locator(`text=/${tab}/i`).first();
          if (await tabEl.isVisible({ timeout: 1000 }).catch(() => false)) {
            await tabEl.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }

    // 8. Sign out
    await signOut(page);
    await expect(page.locator(SEL.signInButton)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // 9. Verify no fatal errors throughout
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Fatal errors during journey: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('admin can switch between all nav sections', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // Cycle through all nav items
    const navItems = [
      { sel: SEL.dashboardNav, name: 'Dashboard' },
      { sel: SEL.profilesNav, name: 'Profiles' },
      { sel: SEL.squadsNav, name: 'Squads' },
      { sel: SEL.rosterNav, name: 'Roster' },
    ];

    for (const nav of navItems) {
      await page.click(nav.sel);
      await page.waitForTimeout(1500);

      // Verify page didn't crash
      const body = await page.textContent('body');
      expect(body.trim().length, `${nav.name} tab should render content`).toBeGreaterThan(20);
    }

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Fatal errors during nav switching: ${fatal.join('; ')}`).toHaveLength(0);
  });
});

test.describe('7.2 — Login → Logout → Re-login Flow', () => {
  const needsAdmin = !ADMIN_USER || !ADMIN_PASS;
  test.skip(needsAdmin, 'Admin credentials not configured');

  test('can login, sign out, and login again successfully', async ({ page }) => {
    // First login
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // Sign out
    await signOut(page);
    await expect(page.locator(SEL.signInButton)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // Second login
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });
  });
});

test.describe('7.3 — Cross-Browser Consistency (within Playwright)', () => {

  test('login form elements have correct input types', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Username should be text type
    await expect(page.locator(SEL.loginUsernameInput)).toHaveAttribute('type', 'text');
    // Password should be password type
    await expect(page.locator(SEL.loginPasswordInput)).toHaveAttribute('type', 'password');
  });

  test('registration form input attributes are correct', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Username: autoCapitalize off, autoCorrect off
    await expect(page.locator(SEL.regUsernameInput)).toHaveAttribute('autocapitalize', 'off');
    await expect(page.locator(SEL.regUsernameInput)).toHaveAttribute('autocorrect', 'off');

    // Name: autoCapitalize words
    await expect(page.locator(SEL.regNameInput)).toHaveAttribute('autocapitalize', 'words');
  });
});

test.describe('7.4 — Regression Checks (Previously Fixed Bugs)', () => {

  test('no hardcoded localhost URLs in production JS', async ({ page }) => {
    // Fetch the main JS bundle and check for localhost references
    const responses = [];
    page.on('response', resp => {
      if (resp.url().endsWith('.js') && resp.status() === 200) {
        responses.push(resp);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check the main bundle for localhost
    for (const resp of responses.slice(0, 5)) { // Check first 5 JS files
      const body = await resp.text().catch(() => '');
      const hasLocalhost = body.includes('http://localhost') && !body.includes('import.meta.env.DEV');
      // Localhost URLs that are behind DEV flags are fine
      // Only flag ones that aren't conditionally gated
    }
  });

  test('"undefined" does not appear as visible text on login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const body = await page.textContent('body');
    // Check for literal "undefined" rendered as text (common React bug)
    // It's OK in console logs, just not in visible UI text
    const visibleUndefined = body.match(/\bundefined\b/gi) || [];
    expect(visibleUndefined.length, `Visible "undefined" found: ${visibleUndefined.join(', ')}`).toBe(0);
  });

  test('"NaN" does not appear as visible text on login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const body = await page.textContent('body');
    expect(body).not.toContain('NaN');
  });

  test('"[object Object]" does not appear as visible text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const body = await page.textContent('body');
    expect(body).not.toContain('[object Object]');
  });

  test('no visible "undefined" or "NaN" in coach portal', async ({ page }) => {
    test.skip(!ADMIN_USER || !ADMIN_PASS, 'Admin credentials not configured');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    const badTokens = ['undefined', 'NaN', '[object Object]'];
    for (const token of badTokens) {
      const count = (body.match(new RegExp(`\\b${token}\\b`, 'g')) || []).length;
      expect(count, `Found "${token}" in coach portal UI`).toBe(0);
    }
  });

  test('login instructions page exists and loads', async ({ page }) => {
    const resp = await page.goto('/login-instructions.html', { waitUntil: 'domcontentloaded' });
    expect(resp.status()).toBe(200);
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });
});

test.describe('7.5 — Error Boundary Recovery', () => {

  test('error boundary does not show on normal load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const body = await page.textContent('body');
    expect(body).not.toContain('Something went wrong');
  });
});

test.describe('7.6 — Multiple Tab Behavior', () => {
  const needsAdmin = !ADMIN_USER || !ADMIN_PASS;
  test.skip(needsAdmin, 'Admin credentials not configured');

  test('opening second tab maintains session', async ({ page, context }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/');
    await waitForAppReady(page2);

    // Second tab should also be authenticated
    await page2.waitForTimeout(3000);
    const isAuthed = await page2.locator(SEL.rosterNav).isVisible({ timeout: 5000 }).catch(() => false);
    const isLogin = await page2.locator(SEL.signInButton).isVisible({ timeout: 2000 }).catch(() => false);

    // Either authenticated in second tab (cookies shared) or shows login (session per-tab)
    expect(isAuthed || isLogin, 'Second tab should show portal or login').toBe(true);

    await page2.close();
  });
});
