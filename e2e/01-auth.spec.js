/**
 * MODULE 1 — AUTHENTICATION & REGISTRATION
 * 
 * Tests login validation, registration validation, error handling,
 * auth flow switching, and session behavior.
 * 
 * NOTE: We do NOT create real accounts in production tests.
 * Registration tests verify form validation and UI behavior only.
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, login, loginExpectError, signOut, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL, AUTH_TIMEOUT, ADMIN_USER, ADMIN_PASS, PW_RULES, PLAYER_REG_CODE } from './helpers/constants.js';

test.describe('1.1 — Login Form Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('empty fields → shows error', async ({ page }) => {
    await page.click(SEL.signInButton);
    await expect(page.locator('text=Please enter your username and password')).toBeVisible();
  });

  test('empty username only → shows error', async ({ page }) => {
    await page.fill(SEL.loginPasswordInput, 'somepassword');
    await page.click(SEL.signInButton);
    await expect(page.locator('text=Please enter your username and password')).toBeVisible();
  });

  test('empty password only → shows error', async ({ page }) => {
    await page.fill(SEL.loginUsernameInput, 'someuser');
    await page.click(SEL.signInButton);
    await expect(page.locator('text=Please enter your username and password')).toBeVisible();
  });

  test('nonexistent username → "Username not found"', async ({ page }) => {
    await loginExpectError(page, 'xyznonexistentuser99', 'Password1!', 'Username not found');
  });

  test('wrong password → "Invalid password"', async ({ page }) => {
    // Use admin username with wrong password
    test.skip(!ADMIN_USER, 'No admin username configured');
    await loginExpectError(page, ADMIN_USER, 'WrongPassword123!', 'Invalid password');
  });

  test('error clears when user types', async ({ page }) => {
    // Trigger an error
    await page.click(SEL.signInButton);
    await expect(page.locator('text=Please enter your username and password')).toBeVisible();

    // Start typing — error should clear
    await page.fill(SEL.loginUsernameInput, 'a');
    await expect(page.locator('text=Please enter your username and password')).not.toBeVisible();
  });

  test('Enter key in password field triggers login', async ({ page }) => {
    await page.fill(SEL.loginUsernameInput, 'xyznonexistentuser99');
    await page.fill(SEL.loginPasswordInput, 'Password1!');
    await page.press(SEL.loginPasswordInput, 'Enter');

    // Should attempt login and show error (not just sit there)
    await expect(page.locator('text=/Username not found|Signing in/')).toBeVisible({ timeout: AUTH_TIMEOUT });
  });
});

test.describe('1.2 — Registration Form Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('registration form shows all required fields', async ({ page }) => {
    await expect(page.locator(SEL.regCodeInput)).toBeVisible();
    await expect(page.locator(SEL.regNameInput)).toBeVisible();
    await expect(page.locator(SEL.regUsernameInput)).toBeVisible();
    await expect(page.locator(SEL.regPasswordInput)).toBeVisible();
    await expect(page.locator(SEL.regConfirmInput)).toBeVisible();
    await expect(page.locator(SEL.createAccountButton)).toBeVisible();
  });

  test('empty code → shows error on submit', async ({ page }) => {
    await page.fill(SEL.regNameInput, 'Test User');
    await page.fill(SEL.regUsernameInput, 'testuser');
    await page.fill(SEL.regPasswordInput, 'Password1!');
    await page.fill(SEL.regConfirmInput, 'Password1!');
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=Please enter your registration code')).toBeVisible();
  });

  test('empty fields → shows error on submit', async ({ page }) => {
    await page.fill(SEL.regCodeInput, PLAYER_REG_CODE);
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=Please fill in all fields')).toBeVisible();
  });

  test('mismatched passwords → shows error', async ({ page }) => {
    await page.fill(SEL.regCodeInput, PLAYER_REG_CODE);
    await page.fill(SEL.regNameInput, 'Test User');
    await page.fill(SEL.regUsernameInput, 'testuser');
    await page.fill(SEL.regPasswordInput, 'Password1!');
    await page.fill(SEL.regConfirmInput, 'Password2!');
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('weak password → shows password requirements', async ({ page }) => {
    await page.fill(SEL.regPasswordInput, 'abc');

    // Password rules should appear
    for (const rule of PW_RULES) {
      await expect(page.locator(`text=${rule}`)).toBeVisible();
    }
  });

  test('strong password → all rules pass (green checkmarks)', async ({ page }) => {
    await page.fill(SEL.regPasswordInput, 'StrongPass1!');

    // Wait for rules to render, then check they all show ✓
    await page.waitForTimeout(300);
    const checks = await page.locator('text=✓').count();
    expect(checks).toBe(5); // All 5 rules pass
  });

  test('password that fails requirements → blocks submit', async ({ page }) => {
    await page.fill(SEL.regCodeInput, PLAYER_REG_CODE);
    await page.fill(SEL.regNameInput, 'Test User');
    await page.fill(SEL.regUsernameInput, 'testuser');
    await page.fill(SEL.regPasswordInput, 'weak');
    await page.fill(SEL.regConfirmInput, 'weak');
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=Please meet all password requirements')).toBeVisible();
  });

  test('username auto-lowercases and strips invalid chars', async ({ page }) => {
    await page.fill(SEL.regUsernameInput, 'Test User 123!');
    const value = await page.inputValue(SEL.regUsernameInput);
    expect(value).toBe('testuser123');  // Spaces, uppercase, ! stripped
  });

  test('username validation shows character count needed', async ({ page }) => {
    await page.fill(SEL.regUsernameInput, 'ab');
    await expect(page.locator('text=1 more character needed')).toBeVisible();
  });

  test('valid username shows ✓ Valid username', async ({ page }) => {
    await page.fill(SEL.regUsernameInput, 'validuser');
    await expect(page.locator('text=✓ Valid username')).toBeVisible();
  });

  test('registration code auto-uppercases', async ({ page }) => {
    await page.fill(SEL.regCodeInput, 'rram-elite-2026');
    const value = await page.inputValue(SEL.regCodeInput);
    expect(value).toBe('RRAM-ELITE-2026');
  });
});

test.describe('1.3 — Auth Screen Switching', () => {

  test('login → register → login toggle works', async ({ page }) => {
    // Start on login
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.signInButton)).toBeVisible();

    // Switch to register
    await page.click(SEL.registerLink);
    await expect(page.locator(SEL.createAccountButton)).toBeVisible();
    await expect(page.locator('text=Create your player account')).toBeVisible();

    // Switch back to login
    await page.click(SEL.alreadyHaveAccountLink);
    await expect(page.locator(SEL.signInButton)).toBeVisible();
  });

  test('?join=coach sets correct role label', async ({ page }) => {
    await page.goto('/?join=coach', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator('text=Create your coach account')).toBeVisible();
  });

  test('switching to login from registration clears errors', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Trigger an error
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=/Please enter|Please fill/')).toBeVisible();

    // Switch to login — error should be gone
    await page.click(SEL.alreadyHaveAccountLink);
    await expect(page.locator('text=/Please enter your registration|Please fill/')).not.toBeVisible();
  });
});

test.describe('1.4 — Admin Login (requires credentials)', () => {

  test.skip(!ADMIN_USER || !ADMIN_PASS, 'Admin credentials not configured — set TEST_ADMIN_USER and TEST_ADMIN_PASS');

  test('admin can login and reaches coach portal', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await login(page, ADMIN_USER, ADMIN_PASS);

    // Should land in coach/admin portal — look for roster or nav
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // Admin should see Dashboard, Profiles, Squads nav items
    await expect(page.locator(SEL.dashboardNav)).toBeVisible();
    await expect(page.locator(SEL.profilesNav)).toBeVisible();
    await expect(page.locator(SEL.squadsNav)).toBeVisible();

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Fatal errors: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('admin can sign out and return to login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    await signOut(page);
    await expect(page.locator(SEL.signInButton)).toBeVisible({ timeout: AUTH_TIMEOUT });
  });

  test('session persists on page refresh', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // Refresh
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Should still be in the portal, not back at login
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });
  });

  test('sign out clears storage keys', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    await signOut(page);

    // Check localStorage and sessionStorage are cleared
    const pendingRole = await page.evaluate(() => localStorage.getItem('rra_pending_role'));
    const pStep = await page.evaluate(() => sessionStorage.getItem('rra_pStep'));
    const selP = await page.evaluate(() => sessionStorage.getItem('rra_selP'));
    expect(pendingRole).toBeNull();
    expect(pStep).toBeNull();
    expect(selP).toBeNull();
  });
});

test.describe('1.5 — Eye Toggle (Show/Hide Password)', () => {

  test('login password toggle works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const pwInput = page.locator(SEL.loginPasswordInput);
    await expect(pwInput).toHaveAttribute('type', 'password');

    // Click eye toggle (the button near the password field)
    const toggle = page.locator('button[aria-label="Show password"]');
    await toggle.click();

    await expect(pwInput).toHaveAttribute('type', 'text');

    // Toggle back
    const hideToggle = page.locator('button[aria-label="Hide password"]');
    await hideToggle.click();
    await expect(pwInput).toHaveAttribute('type', 'password');
  });

  test('registration password toggles work', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const pwInputs = page.locator('input[placeholder="Password"], input[placeholder="Confirm Password"]');
    await expect(pwInputs.first()).toHaveAttribute('type', 'password');
    await expect(pwInputs.last()).toHaveAttribute('type', 'password');

    // Toggle first password field
    const toggles = page.locator('button[aria-label="Show password"]');
    await toggles.first().click();
    await expect(pwInputs.first()).toHaveAttribute('type', 'text');
  });
});
