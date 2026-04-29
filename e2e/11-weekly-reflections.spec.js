/**
 * MODULE 11 — WEEKLY REVIEW (Phase 2)
 * Admin authoring tab + Player tile + reflection view (text + multiple choice).
 */
import { test, expect } from '@playwright/test';
import { devLoginCoach, devLoginPlayer, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

// ═══════════════════════════════════════════════════════════════
// ADMIN SIDE
// ═══════════════════════════════════════════════════════════════

test.describe('11.1 — Admin Reflections Tab', () => {
  test.beforeEach(async ({ page }) => {
    await devLoginCoach(page);
    await page.click(SEL.dashboardNav);
    await page.waitForTimeout(1500);
  });

  test('Reflections tab button is visible in Admin Dashboard', async ({ page }) => {
    const tab = page.locator('button:has-text("Reflections")').first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test('clicking Reflections tab navigates without console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const tab = page.locator('button:has-text("Reflections")').first();
    await tab.click();
    await page.waitForTimeout(2500);
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('Reflections page shows title or New Week button', async ({ page }) => {
    const tab = page.locator('button:has-text("Reflections")').first();
    await tab.click();
    await page.waitForTimeout(2500);
    const has = await page.locator('text=/Weekly Review|New Week/i').count() > 0;
    expect(has).toBe(true);
  });

  test('Reflections page renders empty or populated state', async ({ page }) => {
    const tab = page.locator('button:has-text("Reflections")').first();
    await tab.click();
    await page.waitForTimeout(2500);
    // Either empty-state copy OR a list/week card — both valid.
    const empty = await page.locator('text=/No reflections yet|Create Week/i').count();
    const populated = await page.locator('text=/Week \\d+|Published|Draft|Edit/i').count();
    expect(empty + populated).toBeGreaterThan(0);
  });

  test('admin can open the New Week form (text + multiple choice buttons present)', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const tab = page.locator('button:has-text("Reflections")').first();
    await tab.click();
    await page.waitForTimeout(2000);
    const newBtn = page.locator('button:has-text("New Week")').first();
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(1500);
      // The two question-type buttons should appear in the editor.
      const writtenBtn = page.locator('button:has-text("Written Answer")');
      const choiceBtn = page.locator('button:has-text("Multiple Choice")');
      await expect(writtenBtn).toBeVisible({ timeout: 5000 });
      await expect(choiceBtn).toBeVisible({ timeout: 5000 });
    }
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('no fatal console errors after tab interaction', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const tab = page.locator('button:has-text("Reflections")').first();
    await tab.click();
    await page.waitForTimeout(3000);
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// PLAYER SIDE
// ═══════════════════════════════════════════════════════════════

test.describe('11.2 — Player Weekly Review Tile', () => {
  test.beforeEach(async ({ page }) => { await devLoginPlayer(page); });

  test('player home shows Weekly Review tile with 📋 emoji', async ({ page }) => {
    await expect(page.locator('text=/Weekly Review/i').first()).toBeVisible({ timeout: 5000 });
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('📋');
  });

  test('player home still shows My DNA, Journal, My IDP tiles (regression)', async ({ page }) => {
    await expect(page.locator('text=/My DNA/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Journal/i').first()).toBeVisible();
    await expect(page.locator('text=/My IDP|IDP/i').first()).toBeVisible();
  });

  test('clicking Weekly Review tile navigates without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const tile = page.locator('text=/Weekly Review/i').first();
    await tile.click();
    await page.waitForTimeout(2500);
    // Tabs should appear: This Week / Past Weeks. Or the empty state placeholder.
    const has = await page.locator('text=/This Week|Past Weeks|No Reflection Available/i').count() > 0;
    expect(has).toBe(true);
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('reflection view back button returns to player home', async ({ page }) => {
    const tile = page.locator('text=/Weekly Review/i').first();
    await tile.click();
    await page.waitForTimeout(1500);
    const back = page.locator('path[d*="M19 12H5"]').locator('..').locator('..').first();
    if (await back.isVisible({ timeout: 3000 }).catch(() => false)) {
      await back.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/Welcome/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Past Weeks tab is reachable and renders', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const tile = page.locator('text=/Weekly Review/i').first();
    await tile.click();
    await page.waitForTimeout(1500);
    const pastTab = page.locator('button:has-text("Past Weeks")').first();
    if (await pastTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pastTab.click();
      await page.waitForTimeout(1500);
      // Either empty state or at least one details card.
      const has = await page.locator('text=/No past reflections|Week \\d+/i').count() > 0;
      expect(has).toBe(true);
    }
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('no fatal console errors on reflection view', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const tile = page.locator('text=/Weekly Review/i').first();
    await tile.click();
    await page.waitForTimeout(3000);
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });
});
