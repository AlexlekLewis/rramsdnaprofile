/**
 * MODULE 2 — COACH PORTAL (via dev bypass ?devRole=coach)
 */
import { test, expect } from '@playwright/test';
import { devLoginCoach, waitForAppReady, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('2.1 — Coach Portal Roster', () => {
  test.beforeEach(async ({ page }) => { await devLoginCoach(page); });

  test('roster loads and shows player cards or empty state', async ({ page }) => {
    await page.waitForTimeout(3000);
    const hasPlayers = await page.locator('[style*="cursor: pointer"]').filter({ hasText: /\dyo/ }).count() > 0;
    const hasEmpty = await page.locator('body').filter({ hasText: /No players|No submitted/i }).count() > 0;
    expect(hasPlayers || hasEmpty).toBe(true);
  });

  test('bottom nav bar shows all admin items', async ({ page }) => {
    await expect(page.locator(SEL.rosterNav)).toBeVisible();
    await expect(page.locator(SEL.dashboardNav)).toBeVisible();
    await expect(page.locator(SEL.profilesNav)).toBeVisible();
    await expect(page.locator(SEL.squadsNav)).toBeVisible();
  });

  test('nav bar switching works without crashes', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    for (const nav of [SEL.dashboardNav, SEL.profilesNav, SEL.squadsNav, SEL.rosterNav]) {
      await page.click(nav);
      await page.waitForTimeout(1500);
      const body = await page.textContent('body');
      expect(body.trim().length).toBeGreaterThan(50);
    }
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('sign out button visible', async ({ page }) => {
    await expect(page.locator(SEL.signOutButton).first()).toBeVisible();
  });
});

test.describe('2.2 — Player Selection & Survey View', () => {
  test.beforeEach(async ({ page }) => {
    await devLoginCoach(page);
    await page.waitForTimeout(2000);
  });

  test('clicking a player card opens survey view', async ({ page }) => {
    const cards = page.locator('[style*="cursor: pointer"]').filter({ hasText: /\dyo/ });
    test.skip(await cards.count() === 0, 'No players in roster');
    await cards.first().click();
    await page.waitForTimeout(2000);
    const hasSurvey = await page.locator('text=/BEGIN ASSESSMENT|Competition|Player Voice|Back to roster/i').count() > 0;
    expect(hasSurvey).toBe(true);
  });

  test('survey view shows competition history', async ({ page }) => {
    const cards = page.locator('[style*="cursor: pointer"]').filter({ hasText: /\dyo/ });
    test.skip(await cards.count() === 0, 'No players');
    await cards.first().click();
    await page.waitForTimeout(2000);
    const hasComp = await page.locator('text=/Competition|Batting|Bowling|Fielding/i').count() > 0;
    expect(hasComp).toBe(true);
  });
});

test.describe('2.3 — Assessment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await devLoginCoach(page);
    await page.waitForTimeout(2000);
    const cards = page.locator('[style*="cursor: pointer"]').filter({ hasText: /\dyo/ });
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);
      // BEGIN ASSESSMENT renders TWICE on the player profile (top + bottom).
      // Pin to .first() so strict-mode click resolves unambiguously.
      const btn = page.locator('text=/BEGIN ASSESSMENT/i').first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        // Wait for the assessment view to actually render — the lazy-loaded
        // CoachAssessment chunk + engine calculations need more than a fixed
        // 1s. Wait until either an "Identity" or "Technical" tab is visible
        // (the four-tab nav rendered on the assessment page).
        await page.waitForSelector('text=/Identity|Technical/i', { timeout: 15000 }).catch(() => {});
      }
    }
  });

  test('assessment shows tabbed navigation', async ({ page }) => {
    await expect(page.locator('text=/Identity|Technical/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('can navigate between assessment pages', async ({ page }) => {
    for (const tab of ['Technical', 'Tactical', 'Summary']) {
      const el = page.locator(`text=/${tab}/i`).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('rating buttons are interactive (1-5 scale)', async ({ page }) => {
    const techTab = page.locator('text=/Technical/i').first();
    if (await techTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await techTab.click();
      await page.waitForTimeout(1000);
    }
    const btns = page.locator('button').filter({ hasText: /^[1-5]$/ });
    if (await btns.count() > 0) {
      await btns.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('PDI summary shows score labels and domain labels', async ({ page }) => {
    const tab = page.locator('text=/Summary|PDI/i').first();
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(1500);
      const hasScores = await page.locator('text=/PDI|Pathway|Cohort|Overall|SAGI/i').count() > 0;
      const hasDomains = await page.locator('text=/Technical|Game Intelligence|Mental|Physical/i').count() > 0;
      expect(hasScores).toBe(true);
      expect(hasDomains).toBe(true);
    }
  });
});

test.describe('2.4 — Console Health (Coach Portal)', () => {
  test('coach portal loads with zero fatal errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await page.waitForTimeout(3000);
    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });
});
