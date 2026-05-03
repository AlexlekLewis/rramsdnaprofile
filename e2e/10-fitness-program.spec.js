/**
 * MODULE 10 — FITNESS PROGRAM ADMIN (Phase 2)
 *
 * Verifies the new admin "Fitness" tab loads, the seeded Kneadasoothe
 * program is visible with both day blocks, and the player portal is
 * unchanged (no fitness tile yet — that ships in Phase 3).
 */
import { test, expect } from '@playwright/test';
import { devLoginCoach, devLoginPlayer, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('10.1 — Admin Fitness Program tab', () => {
    test('Fitness tab is visible in admin nav', async ({ page }) => {
        await devLoginCoach(page);
        await expect(page.locator(SEL.fitnessNav)).toBeVisible();
    });

    test('Fitness tab loads without errors', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await devLoginCoach(page);
        await page.click(SEL.fitnessNav);
        await page.waitForTimeout(3000);
        const body = await page.textContent('body');
        expect(body.trim().length).toBeGreaterThan(50);
        expect(assertNoFatalErrors(errors)).toHaveLength(0);
    });

    test('Seeded Kneadasoothe program is visible with both day blocks', async ({ page }) => {
        await devLoginCoach(page);
        await page.click(SEL.fitnessNav);
        await page.waitForTimeout(3000);

        // Program name from seed
        await expect(page.locator('text=/Royals Academy Home Program/i')).toBeVisible();

        // Both seeded session templates
        await expect(page.locator('text=/Day 1/i').first()).toBeVisible();
        await expect(page.locator('text=/Full Body 1/i')).toBeVisible();
        await expect(page.locator('text=/Day 2/i').first()).toBeVisible();
        await expect(page.locator('text=/Full Body 2/i')).toBeVisible();

        // 10 weeks · 2 sessions/week · 3 activation movements
        await expect(page.locator('text=/10 weeks/i')).toBeVisible();
        await expect(page.locator('text=/3 activation movements/i')).toBeVisible();
    });

    test('Edit program button opens program editor with activation block', async ({ page }) => {
        await devLoginCoach(page);
        await page.click(SEL.fitnessNav);
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Edit program")');
        await page.waitForTimeout(1000);

        // Activation block items from seed
        await expect(page.locator('text=/Hip Bridges/i')).toBeVisible();
        await expect(page.locator('text=/Banded Pull Apart/i')).toBeVisible();
        await expect(page.locator('text=/Star Jumps/i')).toBeVisible();
    });

    test('Edit Day 1 button opens block editor with seeded exercises', async ({ page }) => {
        await devLoginCoach(page);
        await page.click(SEL.fitnessNav);
        await page.waitForTimeout(2000);

        // Find the row for Day 1 and click its Edit button
        const day1Row = page.locator('text=/Day 1 — Full Body 1/i').locator('..').locator('..');
        await day1Row.locator('button:has-text("Edit")').click();
        await page.waitForTimeout(1000);

        // Day 1 seeded exercises
        await expect(page.locator('text=/Jumping Squats/i')).toBeVisible();
        await expect(page.locator('text=/Bulgarian Split Squat/i')).toBeVisible();
        await expect(page.locator('text=/Push Ups/i')).toBeVisible();
    });
});

test.describe('10.2 — Player portal unchanged (no fitness UI yet)', () => {
    test('Player home tile grid does NOT include Fitness in Phase 2', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await devLoginPlayer(page);
        await page.waitForTimeout(3000);

        // The player should not see a fitness tile in Phase 2.
        // Existing tiles must still be present (regression check).
        const bodyText = await page.textContent('body');
        expect(bodyText).toMatch(/My DNA|Weekly Review|Journal|My IDP/i);

        // No fitness tile yet
        const fitnessTile = await page.locator('button:has-text("Fitness"), [role="button"]:has-text("Fitness")').count();
        expect(fitnessTile).toBe(0);

        expect(assertNoFatalErrors(errors)).toHaveLength(0);
    });
});
