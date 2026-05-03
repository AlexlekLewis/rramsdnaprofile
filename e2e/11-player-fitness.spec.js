/**
 * MODULE 11 — PLAYER FITNESS (Phase 3 + 4 + 5)
 *
 * Verifies the player-side fitness module: tile on home, three-tab fitness
 * view, session logging screen, past sessions catch-up, and badge panel.
 *
 * Uses devLoginPlayer (?devRole=player → submitted=true player).
 */
import { test, expect } from '@playwright/test';
import { devLoginPlayer, devLoginCoach, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('11.1 — Fitness tile on player home', () => {
    test('Fitness tile is visible on home with launch copy', async ({ page }) => {
        await devLoginPlayer(page);
        await page.waitForTimeout(2000);
        // Tile should show "Fitness" + descriptive copy
        await expect(page.locator('text=/Fitness/i').first()).toBeVisible();
        await expect(page.locator('text=/10-week|sessions\\/week|log your sets/i').first()).toBeVisible();
    });

    test('Tapping Fitness tile opens the Fitness page without fatal errors', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await devLoginPlayer(page);
        await page.waitForTimeout(2000);

        // Click the Fitness tile (the prominent gradient one)
        await page.locator('text=/^Fitness$/').first().click();
        await page.waitForTimeout(3000);

        // Header should now read "Fitness"
        await expect(page.locator('text=/Fitness/i').first()).toBeVisible();
        // Tabs visible
        await expect(page.locator('text=/This Week/i')).toBeVisible();
        await expect(page.locator('text=/Past Sessions/i')).toBeVisible();
        await expect(page.locator('text=/Badges/i')).toBeVisible();

        const fatal = assertNoFatalErrors(errors);
        expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
    });
});

test.describe('11.2 — This Week tab', () => {
    test('Day 1 and Day 2 cards show current week + prescription summary', async ({ page }) => {
        await devLoginPlayer(page);
        await page.waitForTimeout(2000);
        await page.locator('text=/^Fitness$/').first().click();
        await page.waitForTimeout(3000);

        // The seeded labels: Full Body 1 + Full Body 2
        await expect(page.locator('text=/Full Body 1/i')).toBeVisible();
        await expect(page.locator('text=/Full Body 2/i')).toBeVisible();
        // 6 exercises per session is in the summary line
        await expect(page.locator('text=/6 exercises/i').first()).toBeVisible();
    });

    test('Opening Day 1 reveals activation block + exercises', async ({ page }) => {
        await devLoginPlayer(page);
        await page.waitForTimeout(2000);
        await page.locator('text=/^Fitness$/').first().click();
        await page.waitForTimeout(3000);

        // Open Day 1 (Full Body 1 card)
        await page.locator('text=/Full Body 1/i').first().click();
        await page.waitForTimeout(2500);

        // Activation block items from seed
        await expect(page.locator('text=/Hip Bridges/i')).toBeVisible();
        await expect(page.locator('text=/Banded Pull Apart/i')).toBeVisible();
        await expect(page.locator('text=/Star Jumps/i')).toBeVisible();
        // Day 1 seeded exercises
        await expect(page.locator('text=/Jumping Squats/i')).toBeVisible();
        await expect(page.locator('text=/Bulgarian Split Squat/i')).toBeVisible();
        // Save button visible
        await expect(page.locator('button:has-text("Save session")')).toBeVisible();
    });

    test('Save with zero sets ticked shows error toast (validation)', async ({ page }) => {
        await devLoginPlayer(page);
        await page.waitForTimeout(2000);
        await page.locator('text=/^Fitness$/').first().click();
        await page.waitForTimeout(3000);
        await page.locator('text=/Full Body 1/i').first().click();
        await page.waitForTimeout(2500);

        // Click Save without ticking anything
        await page.locator('button:has-text("Save session")').click();
        await page.waitForTimeout(1000);

        // Error toast should appear
        await expect(page.locator('text=/Tick at least one set/i')).toBeVisible();
    });
});

test.describe('11.3 — Badges tab', () => {
    test('Badge ladder shows all 8 badges', async ({ page }) => {
        await devLoginPlayer(page);
        await page.waitForTimeout(2000);
        await page.locator('text=/^Fitness$/').first().click();
        await page.waitForTimeout(3000);
        await page.locator('button:has-text("Badges"), text=/^Badges$/').first().click();
        await page.waitForTimeout(1000);

        // All 8 badge names
        const expected = ['First Step', 'Week One Down', 'Halfway', 'Perfect Week', 'Catch-up', 'Power Player', 'Core Strong', 'Iron Cricketer'];
        for (const name of expected) {
            await expect(page.locator(`text=/${name.replace('-', '\\-')}/i`).first()).toBeVisible();
        }
    });
});

test.describe('11.4 — Past Sessions tab (catch-up)', () => {
    test('Past Sessions tab loads (may be empty in week 1)', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await devLoginPlayer(page);
        await page.waitForTimeout(2000);
        await page.locator('text=/^Fitness$/').first().click();
        await page.waitForTimeout(3000);
        await page.locator('button:has-text("Past Sessions"), text=/^Past Sessions$/').first().click();
        await page.waitForTimeout(1500);

        // Either past weeks render OR the "in week 1" empty state
        const bodyText = await page.textContent('body');
        expect(bodyText).toMatch(/Week \d+|in week 1|past sessions yet/i);

        const fatal = assertNoFatalErrors(errors);
        expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
    });
});

test.describe('11.5 — Coach side unaffected', () => {
    test('Coach Roster + admin Fitness tab still load (regression)', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await devLoginCoach(page);
        await page.waitForTimeout(2000);
        // Roster nav still works
        await expect(page.locator(SEL.rosterNav)).toBeVisible();
        // Phase 2 Fitness tab still works
        await expect(page.locator(SEL.fitnessNav)).toBeVisible();
        await page.click(SEL.fitnessNav);
        await page.waitForTimeout(2500);
        await expect(page.locator('text=/Royals Academy Home Program/i')).toBeVisible();

        const fatal = assertNoFatalErrors(errors);
        expect(fatal, `Errors: ${fatal.join('; ')}`).toHaveLength(0);
    });
});
