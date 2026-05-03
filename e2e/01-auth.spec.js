/**
 * MODULE 1 — AUTHENTICATION & REGISTRATION
 * 
 * Tests login validation, registration validation, error handling,
 * auth flow switching, and session behavior.
 * Uses dev bypass (?devRole=coach) for admin portal tests.
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, loginExpectError, devLoginCoach, signOut, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL, AUTH_TIMEOUT, PW_RULES, PLAYER_REG_CODE } from './helpers/constants.js';

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

  test('error stays visible while user types corrections (does not vanish on keystroke)', async ({ page }) => {
    // The error persists until the next submit attempt. Clearing on keystroke
    // is intentionally NOT the behaviour — users were losing the message while
    // they were still reading it. The error is replaced or cleared on the next
    // submit, not while the user is mid-correction.
    await page.click(SEL.signInButton);
    await expect(page.locator('text=Please enter your username and password')).toBeVisible();
    await page.fill(SEL.loginUsernameInput, 'a');
    // Still visible — user can read it while typing.
    await expect(page.locator('text=Please enter your username and password')).toBeVisible();
  });

  test('Enter key in password field triggers login', async ({ page }) => {
    await page.fill(SEL.loginUsernameInput, 'xyznonexistentuser99');
    await page.fill(SEL.loginPasswordInput, 'Password1!');
    await page.press(SEL.loginPasswordInput, 'Enter');
    await expect(page.locator('text=/Username not found|Signing in/')).toBeVisible({ timeout: AUTH_TIMEOUT });
  });
});

test.describe('1.2 — Registration Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('all fields present', async ({ page }) => {
    await expect(page.locator(SEL.regCodeInput)).toBeVisible();
    await expect(page.locator(SEL.regNameInput)).toBeVisible();
    await expect(page.locator(SEL.regUsernameInput)).toBeVisible();
    await expect(page.locator(SEL.regPasswordInput)).toBeVisible();
    await expect(page.locator(SEL.regConfirmInput)).toBeVisible();
    await expect(page.locator(SEL.createAccountButton)).toBeVisible();
  });

  test('empty code → error', async ({ page }) => {
    await page.fill(SEL.regNameInput, 'Test User');
    await page.fill(SEL.regUsernameInput, 'testuser');
    await page.fill(SEL.regPasswordInput, 'Password1!');
    await page.fill(SEL.regConfirmInput, 'Password1!');
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=Please enter your registration code')).toBeVisible();
  });

  test('empty fields → error', async ({ page }) => {
    await page.fill(SEL.regCodeInput, PLAYER_REG_CODE);
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=Please fill in all fields')).toBeVisible();
  });

  test('mismatched passwords → error', async ({ page }) => {
    await page.fill(SEL.regCodeInput, PLAYER_REG_CODE);
    await page.fill(SEL.regNameInput, 'Test');
    await page.fill(SEL.regUsernameInput, 'testuser');
    await page.fill(SEL.regPasswordInput, 'Password1!');
    await page.fill(SEL.regConfirmInput, 'Password2!');
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('weak password → shows requirements', async ({ page }) => {
    await page.fill(SEL.regPasswordInput, 'abc');
    for (const rule of PW_RULES) {
      await expect(page.locator(`text=${rule}`)).toBeVisible();
    }
  });

  test('strong password → all 5 checkmarks', async ({ page }) => {
    await page.fill(SEL.regPasswordInput, 'StrongPass1!');
    await page.waitForTimeout(300);
    expect(await page.locator('text=✓').count()).toBe(5);
  });

  test('weak password blocks submit', async ({ page }) => {
    await page.fill(SEL.regCodeInput, PLAYER_REG_CODE);
    await page.fill(SEL.regNameInput, 'Test');
    await page.fill(SEL.regUsernameInput, 'testuser');
    await page.fill(SEL.regPasswordInput, 'weak');
    await page.fill(SEL.regConfirmInput, 'weak');
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=Please meet all password requirements')).toBeVisible();
  });

  test('username auto-lowercases and strips invalid chars', async ({ page }) => {
    await page.fill(SEL.regUsernameInput, 'Test User 123!');
    expect(await page.inputValue(SEL.regUsernameInput)).toBe('testuser123');
  });

  test('username < 3 chars shows count needed', async ({ page }) => {
    await page.fill(SEL.regUsernameInput, 'ab');
    await expect(page.locator('text=1 more character needed')).toBeVisible();
  });

  test('valid username shows ✓', async ({ page }) => {
    await page.fill(SEL.regUsernameInput, 'validuser');
    await expect(page.locator('text=✓ Valid username')).toBeVisible();
  });

  test('registration code auto-uppercases', async ({ page }) => {
    await page.fill(SEL.regCodeInput, 'rram-elite-2026');
    expect(await page.inputValue(SEL.regCodeInput)).toBe('RRAM-ELITE-2026');
  });
});

test.describe('1.3 — Auth Screen Switching', () => {
  test('login → register → login toggle', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.signInButton)).toBeVisible();
    await page.click(SEL.registerLink);
    await expect(page.locator(SEL.createAccountButton)).toBeVisible();
    await page.click(SEL.alreadyHaveAccountLink);
    await expect(page.locator(SEL.signInButton)).toBeVisible();
  });

  test('?join=coach shows coach label', async ({ page }) => {
    await page.goto('/?join=coach', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator('text=Create your account')).toBeVisible();
  });

  test('switching to login clears errors', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.click(SEL.createAccountButton);
    await expect(page.locator('text=/Please enter|Please fill/')).toBeVisible();
    await page.click(SEL.alreadyHaveAccountLink);
    await expect(page.locator('text=/Please enter your registration|Please fill/')).not.toBeVisible();
  });
});

test.describe('1.4 — Admin Portal via Dev Bypass', () => {
  test('dev bypass reaches coach portal with admin nav', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await expect(page.locator(SEL.rosterNav)).toBeVisible();
    await expect(page.locator(SEL.dashboardNav)).toBeVisible();
    await expect(page.locator(SEL.profilesNav)).toBeVisible();
    await expect(page.locator(SEL.squadsNav)).toBeVisible();
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });
});

test.describe('1.5 — Eye Toggle', () => {
  test('login password toggle', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.loginPasswordInput)).toHaveAttribute('type', 'password');
    await page.locator('button[aria-label="Show password"]').click();
    await expect(page.locator(SEL.loginPasswordInput)).toHaveAttribute('type', 'text');
    await page.locator('button[aria-label="Hide password"]').click();
    await expect(page.locator(SEL.loginPasswordInput)).toHaveAttribute('type', 'password');
  });

  test('registration password toggles', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.regPasswordInput)).toHaveAttribute('type', 'password');
    await page.locator('button[aria-label="Show password"]').first().click();
    await expect(page.locator(SEL.regPasswordInput)).toHaveAttribute('type', 'text');
  });
});
