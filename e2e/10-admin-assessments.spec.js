/**
 * MODULE 10 — ADMIN DASHBOARD · PART 2 "ASSESSMENTS" TAB
 *
 * Verifies the coach-assessment progress view nested inside the Admin
 * Dashboard. Uses devLoginCoach for super_admin access and then clicks the
 * Dashboard bottom-nav button, exactly like module 08.
 *
 * NOTE: the e2e build uses the live Supabase project with the dev-bypass
 * user — the database may legitimately contain zero coach/session
 * assignments. Every assertion must tolerate an empty roster and still
 * verify that the *UI* renders correctly.
 */
import { test, expect } from '@playwright/test';
import { devLoginCoach, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

/** Navigate from anywhere in the coach portal to the Assessments sub-tab. */
async function openAssessmentsTab(page) {
  await page.click(SEL.dashboardNav);
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Assessments")').first().click();
  // Assessment progress is React.lazy + an async DB fetch; let it settle.
  await page.waitForTimeout(2500);
}

test.describe('10.1 — Admin Dashboard Tabs', () => {
  test('dashboard shows all expected tab buttons including Assessments', async ({ page }) => {
    await devLoginCoach(page);
    await page.click(SEL.dashboardNav);
    await page.waitForTimeout(2000);
    for (const label of ['Overview', 'Assessments', 'Rankings']) {
      const count = await page.locator(`button:has-text("${label}")`).count();
      expect(count, `tab button "${label}" should exist`).toBeGreaterThan(0);
    }
  });

  test('clicking Assessments tab navigates without fatal console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });
});

test.describe('10.2 — Overall Progress Banner', () => {
  test('shows "Assessment Progress" banner text', async ({ page }) => {
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    await expect(page.locator('text=/Assessment Progress/i').first()).toBeVisible();
  });

  test('banner shows a progress fraction ("N / M" with percentage)', async ({ page }) => {
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    // Banner reads "done / total (pct%)". Accept any digits on each side.
    const hit = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').count();
    expect(hit, 'expected a "N / M" fraction in the banner').toBeGreaterThan(0);
    const pct = await page.locator('text=/\\(\\d+%\\)/').count();
    expect(pct, 'expected a (N%) percentage in the banner').toBeGreaterThan(0);
  });
});

test.describe('10.3 — Lens Toggle', () => {
  test('both By Coach and By Session toggles are present', async ({ page }) => {
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    await expect(page.locator('button:has-text("By Coach")').first()).toBeVisible();
    await expect(page.locator('button:has-text("By Session")').first()).toBeVisible();
  });

  test('default lens is By Coach (styled as selected)', async ({ page }) => {
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    const byCoach = page.locator('button:has-text("By Coach")').first();
    const bg = await byCoach.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Selected has a white/solid bg; unselected is transparent (rgba(0,0,0,0)).
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe('transparent');
  });

  test('switching to By Session shows Skill Week/Game Sense heading OR empty-state', async ({ page }) => {
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    await page.locator('button:has-text("By Session")').first().click();
    await page.waitForTimeout(600);
    // If there are squads we see the headings; otherwise the view is empty
    // but the lens button must still be selected.
    const headingHits = await page.locator('text=/Skill Week|Game Sense/i').count();
    const byCoachBg = await page
      .locator('button:has-text("By Coach")')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const bySessionBg = await page
      .locator('button:has-text("By Session")')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // Either we see the session headings, OR the lens toggle successfully
    // flipped (By Session selected, By Coach now transparent).
    const lensFlipped =
      (bySessionBg !== 'rgba(0, 0, 0, 0)' && bySessionBg !== 'transparent') &&
      (byCoachBg === 'rgba(0, 0, 0, 0)' || byCoachBg === 'transparent');
    expect(headingHits > 0 || lensFlipped,
      'expected a session heading or a successful lens switch').toBe(true);
  });

  test('switching back to By Coach renders coach cards or an empty-state', async ({ page }) => {
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    await page.locator('button:has-text("By Session")').first().click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("By Coach")').first().click();
    await page.waitForTimeout(600);
    // Either a named coach row, the Drinkwell example, or the empty-state.
    const hits = await page
      .locator('text=/Drinkwell|Adam|COACH|ADMIN|No coaches assigned/i')
      .count();
    expect(hits, 'expected coach names or empty-state copy').toBeGreaterThan(0);
  });
});

test.describe('10.4 — Interactions & Drill-down', () => {
  test('clicking a coach row (if present) does not throw console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    // Look for an expand chevron (▾). If none exist (empty roster), this is a
    // no-op and we simply verify no errors happened on tab open.
    const chev = page.locator('text=/^▾$/').first();
    if ((await chev.count()) > 0) {
      await chev.click({ force: true }).catch(() => { /* non-fatal */ });
      await page.waitForTimeout(500);
    }
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('no fatal console errors across tab + lens switches', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    await page.locator('button:has-text("By Session")').first().click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("By Coach")').first().click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Overview")').first().click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Assessments")').first().click();
    await page.waitForTimeout(800);
    expect(assertNoFatalErrors(errors)).toHaveLength(0);
  });

  test('drill-down surface shows roster content or a clear empty-state', async ({ page }) => {
    await devLoginCoach(page);
    await openAssessmentsTab(page);
    // Try to expand the first coach row, if any.
    const chev = page.locator('text=/^▾$/').first();
    if ((await chev.count()) > 0) {
      await chev.click({ force: true }).catch(() => { /* non-fatal */ });
      await page.waitForTimeout(500);
    }
    // Either we see per-player pills / Assessed / Pending, OR an empty-state
    // message, OR the "Each player gets 2 assessments" banner subtitle.
    const hits = await page
      .locator(
        'text=/Assessed|Pending|No squad assignments|No coaches assigned|Each player gets 2 assessments/i'
      )
      .count();
    expect(hits, 'expected drill-down content or an empty-state').toBeGreaterThan(0);
  });
});
