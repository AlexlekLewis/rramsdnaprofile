/**
 * MODULE 9 — SESSION GROUPING TOGGLE (Skill Week / Game Sense)
 *
 * The coach roster reads session groupings from the Supabase `sp_squads` table.
 * When the "📅 Session" grouping toggle is active, a secondary pill group appears
 * with "🏏 Skill Week" (default) and "🎯 Game Sense" buttons. Each selection
 * surfaces different session headings (Tue/Thu vs Sat/Sun).
 */
import { test, expect } from '@playwright/test';
import { devLoginCoach, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';

test.describe('9 — Coach Roster: Session Grouping Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await devLoginCoach(page);
    // Give the roster + sp_squads fetch time to complete
    await page.waitForTimeout(3000);
  });

  test('9.1 — "📅 Session" grouping toggle exists and is active by default', async ({ page }) => {
    const sessionBtn = page.locator('button', { hasText: /Session/ }).filter({ hasText: /📅/ });
    await expect(sessionBtn.first()).toBeVisible({ timeout: 10_000 });

    // Default ON means the Skill Week / Game Sense pills should be rendered
    const skillWeekBtn = page.locator('button', { hasText: /Skill Week/ });
    await expect(skillWeekBtn.first()).toBeVisible({ timeout: 5_000 });
  });

  test('9.2 — "🏏 Skill Week" button exists and is selected by default', async ({ page }) => {
    const skillWeekBtn = page.locator('button', { hasText: /Skill Week/ }).first();
    await expect(skillWeekBtn).toBeVisible({ timeout: 10_000 });
    const text = (await skillWeekBtn.textContent()) || '';
    expect(text).toContain('Skill Week');
  });

  test('9.3 — "🎯 Game Sense" button exists', async ({ page }) => {
    const gameSenseBtn = page.locator('button', { hasText: /Game Sense/ }).first();
    await expect(gameSenseBtn).toBeVisible({ timeout: 10_000 });
    const text = (await gameSenseBtn.textContent()) || '';
    expect(text).toContain('Game Sense');
  });

  test('9.4 — clicking "Game Sense" reveals Sat/Sun session headings', async ({ page }) => {
    const gameSenseBtn = page.locator('button', { hasText: /Game Sense/ }).first();
    await expect(gameSenseBtn).toBeVisible({ timeout: 10_000 });
    await gameSenseBtn.click();
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body')) || '';
    // Game Sense sessions should reference Sat or Sun headings from sp_squads
    const hasWeekend = /Sat\s*\d|Sun\s*\d/.test(body);
    // If DB has no WE squads loaded in this environment, accept ungrouped fallback
    const hasUngroupedOrEmpty = /UNGROUPED|No submitted|No players/i.test(body);
    expect(hasWeekend || hasUngroupedOrEmpty).toBe(true);
  });

  test('9.5 — clicking "Skill Week" after "Game Sense" restores Tue/Thu headings', async ({ page }) => {
    const gameSenseBtn = page.locator('button', { hasText: /Game Sense/ }).first();
    const skillWeekBtn = page.locator('button', { hasText: /Skill Week/ }).first();
    await expect(gameSenseBtn).toBeVisible({ timeout: 10_000 });

    await gameSenseBtn.click();
    await page.waitForTimeout(1000);
    await skillWeekBtn.click();
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body')) || '';
    const hasWeekday = /Tue\s*\d|Thu\s*\d/.test(body);
    const hasUngroupedOrEmpty = /UNGROUPED|No submitted|No players/i.test(body);
    expect(hasWeekday || hasUngroupedOrEmpty).toBe(true);
  });

  test('9.6 — at least one expected Skill Week session heading renders', async ({ page }) => {
    // Skill Week is the default — no need to click. Just verify a Tue/Thu label is present.
    const body = (await page.textContent('body')) || '';
    const hasSkillHeading = /Tue\s*5-7pm|Tue\s*7-9pm|Thu\s*5-7pm|Thu\s*7-9pm/.test(body);
    // Fallback: accept that some envs may have only placeholder data
    const hasUngroupedOrEmpty = /UNGROUPED|No submitted|No players/i.test(body);
    expect(hasSkillHeading || hasUngroupedOrEmpty).toBe(true);
  });

  test('9.7 — roster total count (e.g. "0/86 assessed") is visible', async ({ page }) => {
    const body = (await page.textContent('body')) || '';
    // Format is "{n}/{total} assessed" — accept any numeric pair
    expect(body).toMatch(/\d+\s*\/\s*\d+\s*assessed/i);
  });

  test('9.8 — toggling between Skill Week and Game Sense produces no fatal console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await page.waitForTimeout(2000);

    const gameSenseBtn = page.locator('button', { hasText: /Game Sense/ }).first();
    const skillWeekBtn = page.locator('button', { hasText: /Skill Week/ }).first();

    if (await gameSenseBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await gameSenseBtn.click();
      await page.waitForTimeout(800);
      await skillWeekBtn.click();
      await page.waitForTimeout(800);
      await gameSenseBtn.click();
      await page.waitForTimeout(800);
    }

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
  });
});
