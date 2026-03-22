/**
 * MODULE 8 — ADMIN FEATURES (Dashboard, Profiles, Squads)
 */
import { test, expect } from '@playwright/test';
import { devLoginCoach, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('8.1 — Admin Dashboard', () => {
  test('dashboard loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await page.click(SEL.dashboardNav);
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(50);
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('dashboard shows analytics content', async ({ page }) => {
    await devLoginCoach(page);
    await page.click(SEL.dashboardNav);
    await page.waitForTimeout(3000);
    const has = await page.locator('text=/Overview|Players|Engagement|Assessment|Squad|Domain|Average/i').count() > 0;
    expect(has).toBe(true);
  });
});

test.describe('8.2 — Admin Profiles', () => {
  test('profiles tab loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await page.click(SEL.profilesNav);
    await page.waitForTimeout(3000);
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('profiles shows members or empty state', async ({ page }) => {
    await devLoginCoach(page);
    await page.click(SEL.profilesNav);
    await page.waitForTimeout(3000);
    const has = await page.locator('text=/player|coach|admin|Member|No members|No profiles/i').count() > 0;
    expect(has).toBe(true);
  });
});

test.describe('8.3 — Squad Assignment', () => {
  test('squads tab loads without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await page.click(SEL.squadsNav);
    await page.waitForTimeout(3000);
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('squads shows management UI', async ({ page }) => {
    await devLoginCoach(page);
    await page.click(SEL.squadsNav);
    await page.waitForTimeout(3000);
    const has = await page.locator('text=/Squad|Group|Create|Assign|Allocat/i').count() > 0;
    expect(has).toBe(true);
  });
});
