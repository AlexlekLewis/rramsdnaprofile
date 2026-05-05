/**
 * MODULE 13 — COACH SCHEDULER + COACH AVAILABILITY (admin scheduling, coach self-service)
 *
 * Feature flag: VITE_ENABLE_COACH_SCHEDULER. The e2e build (vite.config.e2e.js) sets it
 * to "true" so these tests can exercise the screens. In production it stays OFF until
 * Alex flips it in Vercel env.
 *
 * The dev bypass (?devRole=coach) logs in as super_admin, so it sees the admin Schedule
 * tab but NOT the coach-only "My Availability" tab. We verify routing for both, and
 * exercise the admin scheduler thoroughly. The coach-only availability page will be
 * smoke-tested by Alex via the tester account on Vercel preview.
 */
import { test, expect } from '@playwright/test';
import { devLoginCoach, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('13.1 — Schedule tab visible behind feature flag', () => {
  test('admin sees Schedule tab in bottom nav', async ({ page }) => {
    await devLoginCoach(page);
    await expect(page.locator(SEL.scheduleNav)).toBeVisible();
  });

  test('admin does NOT see "My Availability" in nav (coach-only by design)', async ({ page }) => {
    await devLoginCoach(page);
    await expect(page.locator(SEL.availabilityNav)).toHaveCount(0);
  });
});

test.describe('13.2 — Coach Scheduler renders', () => {
  test.beforeEach(async ({ page }) => {
    await devLoginCoach(page);
    await page.click(SEL.scheduleNav);
    await page.waitForSelector(SEL.schedulerRoot, { timeout: 15_000 });
  });

  test('scheduler root mounts', async ({ page }) => {
    await expect(page.locator(SEL.schedulerRoot)).toBeVisible();
  });

  test('header shows scheduler heading', async ({ page }) => {
    await expect(page.locator('text=COACH SCHEDULER').first()).toBeVisible();
  });

  test('today button is present and clickable', async ({ page }) => {
    const today = page.locator(SEL.scheduleTodayBtn).first();
    await expect(today).toBeVisible();
    await today.click();
    await expect(page.locator(SEL.schedulerRoot)).toBeVisible();
  });

  test('gap counter banner renders some status text', async ({ page }) => {
    // Banner contains either "All sessions are fully staffed" or a "⚠ N unfilled" message.
    await page.waitForTimeout(2000); // let the RPC resolve
    const text = await page.locator(SEL.schedulerRoot).innerText();
    const hasGapText = /unfilled|fully staffed|coach slot|Loading schedule/i.test(text);
    expect(hasGapText).toBe(true);
  });

  test('list / grid view toggle works without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const toggle = page.locator(SEL.schedulerRoot).locator('button').filter({ hasText: /Grid|List/i }).first();
    if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(400);
      await toggle.click();
      await page.waitForTimeout(400);
    }
    await expect(page.locator(SEL.schedulerRoot)).toBeVisible();
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('rules editor opens and closes', async ({ page }) => {
    const rulesBtn = page.locator(SEL.schedulerRoot).getByRole('button', { name: /Rules/i }).first();
    if (await rulesBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rulesBtn.click();
      await expect(page.getByRole('dialog', { name: /Staffing rules editor/i })).toBeVisible({ timeout: 5_000 });
      await page.getByRole('dialog').locator('button[aria-label="Close"]').first().click();
    }
  });
});

test.describe('13.3 — Console health (Scheduler)', () => {
  test('scheduler page loads with zero fatal errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await page.click(SEL.scheduleNav);
    await page.waitForSelector(SEL.schedulerRoot, { timeout: 15_000 });
    await page.waitForTimeout(2500);
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });
});
