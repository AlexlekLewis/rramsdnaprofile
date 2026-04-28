/**
 * MODULE 12 — PASSWORD & USERNAME RECOVERY
 *
 * Tests the public (no-auth) flows of the password recovery system:
 *   • Forgot password modal — open, validate, submit, success state
 *   • Forgot username modal — open, validate, submit, success state
 *   • Reset password page (deep link) — bad token rejected, password rules visible
 *   • Verify recovery email page (deep link) — error state for bad token
 *   • Mobile viewport rendering
 *   • Email enumeration prevention (same response for known + unknown email)
 *
 * Authenticated flows (set-recovery-email banner, full reset round-trip)
 * require Resend configuration and a known tester password — covered separately.
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, devLoginCoach, devLoginPlayer, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

const FORGOT_PASSWORD_BTN = 'button:has-text("Forgot password?")';
const FORGOT_USERNAME_BTN = 'button:has-text("Forgot username?")';
const MODAL_EMAIL_INPUT = 'input[placeholder="Email address"]';
const MODAL_CLOSE_BTN = 'button[aria-label="Close"]';

test.describe('12.1 — Forgot password modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('opens when "Forgot password?" link is clicked', async ({ page }) => {
    await expect(page.locator(FORGOT_PASSWORD_BTN)).toBeVisible();
    await page.click(FORGOT_PASSWORD_BTN);
    await expect(page.locator('text=Forgot password').first()).toBeVisible();
    await expect(page.locator(MODAL_EMAIL_INPUT)).toBeVisible();
    await expect(page.locator('button:has-text("Send reset link")')).toBeVisible();
  });

  test('rejects an invalid email format inline', async ({ page }) => {
    await page.click(FORGOT_PASSWORD_BTN);
    await page.fill(MODAL_EMAIL_INPUT, 'notanemail');
    await page.click('button:has-text("Send reset link")');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('shows generic success for an unknown email (no enumeration leak)', async ({ page }) => {
    await page.click(FORGOT_PASSWORD_BTN);
    await page.fill(MODAL_EMAIL_INPUT, 'no-such-account-99999@example.com');
    await page.click('button:has-text("Send reset link")');
    // The success copy must be the generic "If an account exists for X..." form,
    // identical regardless of whether the email matches.
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=If an account exists for')).toBeVisible();
  });

  test('shows the same success copy for a real-looking email', async ({ page }) => {
    await page.click(FORGOT_PASSWORD_BTN);
    await page.fill(MODAL_EMAIL_INPUT, 'someone-might-exist@example.com');
    await page.click('button:has-text("Send reset link")');
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=If an account exists for')).toBeVisible();
  });

  test('closes when the X button is clicked', async ({ page }) => {
    await page.click(FORGOT_PASSWORD_BTN);
    await expect(page.locator(MODAL_EMAIL_INPUT)).toBeVisible();
    await page.click(MODAL_CLOSE_BTN);
    await expect(page.locator(MODAL_EMAIL_INPUT)).not.toBeVisible();
    // Login form should still be there
    await expect(page.locator(SEL.signInButton)).toBeVisible();
  });

  test('closes when backdrop is clicked', async ({ page }) => {
    await page.click(FORGOT_PASSWORD_BTN);
    await expect(page.locator(MODAL_EMAIL_INPUT)).toBeVisible();
    // Click backdrop (the dialog overlay, outside the inner panel)
    const dialog = page.locator('[role="dialog"]');
    const box = await dialog.boundingBox();
    await page.mouse.click(box.x + 10, box.y + 10);
    await expect(page.locator(MODAL_EMAIL_INPUT)).not.toBeVisible();
  });
});

test.describe('12.2 — Forgot username modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('opens when "Forgot username?" link is clicked', async ({ page }) => {
    await page.click(FORGOT_USERNAME_BTN);
    await expect(page.locator('text=Forgot username').first()).toBeVisible();
    await expect(page.locator(MODAL_EMAIL_INPUT)).toBeVisible();
    await expect(page.locator('button:has-text("Send my username")')).toBeVisible();
  });

  test('rejects invalid email inline', async ({ page }) => {
    await page.click(FORGOT_USERNAME_BTN);
    await page.fill(MODAL_EMAIL_INPUT, 'bad-input');
    await page.click('button:has-text("Send my username")');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('shows generic success for unknown email', async ({ page }) => {
    await page.click(FORGOT_USERNAME_BTN);
    await page.fill(MODAL_EMAIL_INPUT, 'no-such-account-77777@example.com');
    await page.click('button:has-text("Send my username")');
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=we\'ve sent your username').or(page.locator('text=If an account exists for'))).toBeVisible();
  });
});

test.describe('12.3 — Reset password deep-link page', () => {
  test('renders the set-new-password form when ?reset_token=… is present', async ({ page }) => {
    await page.goto('/?reset_token=fake_token_for_e2e', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page.locator('text=Set a new password')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[placeholder="New password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Confirm password"]')).toBeVisible();
  });

  test('shows password strength rules as user types', async ({ page }) => {
    await page.goto('/?reset_token=fake_token_for_e2e', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="New password"]', 'weak');
    // 4 of 5 should be unmet
    await expect(page.locator('text=At least 8 characters').first()).toBeVisible();
    await page.fill('input[placeholder="New password"]', 'StrongPass1!');
    // All 5 rules satisfied — green ticks
    const ticks = page.locator('text=/^✓$/');
    await expect(ticks).toHaveCount(5);
  });

  test('blocks submission with mismatched confirm', async ({ page }) => {
    await page.goto('/?reset_token=fake_token_for_e2e', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="New password"]', 'StrongPass1!');
    await page.fill('input[placeholder="Confirm password"]', 'Different1!');
    await page.click('button:has-text("Save new password")');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('rejects an invalid/fake token from the server', async ({ page }) => {
    await page.goto('/?reset_token=fake_token_for_e2e', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="New password"]', 'StrongPass1!');
    await page.fill('input[placeholder="Confirm password"]', 'StrongPass1!');
    await page.click('button:has-text("Save new password")');
    // Edge function returns 400 with a friendly message
    await expect(page.locator('text=/reset link is no longer valid|reset link has expired|already been used/i')).toBeVisible({ timeout: 10_000 });
  });

  test('Cancel returns to login screen', async ({ page }) => {
    await page.goto('/?reset_token=fake_token_for_e2e', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page.locator('text=Set a new password')).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.locator(SEL.signInButton)).toBeVisible({ timeout: 10_000 });
    expect(page.url()).not.toContain('reset_token');
  });
});

test.describe('12.4 — Verify recovery email deep-link', () => {
  test('shows error state for an unknown verify token', async ({ page }) => {
    await page.goto('/?verify_recovery_token=fake_verify_e2e', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Confirming your email').or(page.locator('text=Couldn\'t confirm'))).toBeVisible({ timeout: 10_000 });
    // Eventually settles into error state
    await expect(page.locator('text=Couldn\'t confirm')).toBeVisible({ timeout: 10_000 });
  });

  test('Continue button returns to login', async ({ page }) => {
    await page.goto('/?verify_recovery_token=fake_verify_e2e', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Couldn\'t confirm')).toBeVisible({ timeout: 10_000 });
    await page.click('button:has-text("Continue")');
    await expect(page.locator(SEL.signInButton)).toBeVisible();
    expect(page.url()).not.toContain('verify_recovery_token');
  });
});

test.describe('12.5 — Mobile viewport', () => {
  const sizes = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 14', width: 390, height: 844 },
  ];

  for (const sz of sizes) {
    test(`forgot-password modal fits ${sz.name}`, async ({ page }) => {
      await page.setViewportSize(sz);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await page.click(FORGOT_PASSWORD_BTN);
      await expect(page.locator(MODAL_EMAIL_INPUT)).toBeVisible();
      const dialog = page.locator('[role="dialog"]');
      const box = await dialog.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(sz.width + 2);
    });
  }

  test(`reset-password page fits iPhone SE`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/?reset_token=fake_token_for_e2e', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(377);
    await expect(page.locator('button:has-text("Save new password")')).toBeVisible();
  });
});

test.describe('12.6 — Recovery email banner (post-login)', () => {
  test('banner appears for a logged-in player without a recovery email', async ({ page }) => {
    await devLoginPlayer(page);
    await expect(page.locator('text=/Add a recovery email|Confirm your recovery email/').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button:has-text("Add now")').or(page.locator('button:has-text("Resend email")'))).toBeVisible();
  });

  test('banner appears for a logged-in coach without a recovery email', async ({ page }) => {
    await devLoginCoach(page);
    await expect(page.locator('text=/Add a recovery email|Confirm your recovery email/').first()).toBeVisible({ timeout: 10_000 });
  });

  test('banner can be dismissed for the session', async ({ page }) => {
    await devLoginPlayer(page);
    const banner = page.locator('text=/Add a recovery email|Confirm your recovery email/').first();
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await page.click('button[aria-label="Dismiss"]');
    await expect(banner).not.toBeVisible();
  });

  test('"Add now" opens the set-recovery-email modal', async ({ page }) => {
    await devLoginPlayer(page);
    await expect(page.locator('button:has-text("Add now")')).toBeVisible({ timeout: 10_000 });
    await page.click('button:has-text("Add now")');
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button:has-text("Send confirmation")')).toBeVisible();
    await expect(page.locator('input[placeholder="Email address"]')).toBeVisible();
  });
});

test.describe('12.7 — No fatal console errors', () => {
  test('opening + submitting forgot password produces no fatal errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.click(FORGOT_PASSWORD_BTN);
    await page.fill(MODAL_EMAIL_INPUT, 'someone@example.com');
    await page.click('button:has-text("Send reset link")');
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10_000 });
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Console errors:\n${fatal.join('\n')}`).toEqual([]);
  });
});
