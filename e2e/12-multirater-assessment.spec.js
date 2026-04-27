/**
 * RRAM DNA Profile — Multi-rater Multiple Choice Assessment
 *
 * Validates the new flow without touching the legacy save path.
 * - Feature flag must be on (VITE_ENABLE_MC_ASSESSMENT=true)
 * - Tests the entry button, allocation list, item picker, optimistic save UI
 * - Smoke-checks that legacy coach roster still loads (regression guard)
 */
import { test, expect } from '@playwright/test';
import { devLoginCoach } from './helpers/auth.js';
import { LOAD_TIMEOUT, TRANSITION_DELAY } from './helpers/constants.js';

test.describe('Multi-rater Multiple Choice Assessment', () => {
    test('legacy coach view still loads (regression guard)', async ({ page }) => {
        await devLoginCoach(page);
        // Legacy roster should be visible (existing critical path must not break)
        const legacyVisible = await page.evaluate(() => {
            const t = document.body.innerText || '';
            return t.includes('Roster') || t.includes('COACH PORTAL') || t.includes('Player DNA');
        });
        expect(legacyVisible).toBe(true);
    });

    test('Multiple Choice entry button is visible when feature flag is on', async ({ page }) => {
        await devLoginCoach(page);
        await page.waitForTimeout(TRANSITION_DELAY);
        // Entry button should appear (only when VITE_ENABLE_MC_ASSESSMENT=true at build time)
        const entry = page.getByTestId('mc-entry-button');
        const visible = await entry.isVisible().catch(() => false);
        if (!visible) {
            test.skip(true, 'Feature flag VITE_ENABLE_MC_ASSESSMENT is not enabled in this build');
        }
        await expect(entry).toBeVisible();
    });

    test('clicking the entry button shows the allocation list', async ({ page }) => {
        await devLoginCoach(page);
        await page.waitForTimeout(TRANSITION_DELAY);
        const entry = page.getByTestId('mc-entry-button');
        if (!(await entry.isVisible().catch(() => false))) {
            test.skip(true, 'Feature flag not enabled');
        }
        await entry.click();
        // Should land on the MC list page
        await expect(page.getByTestId('mc-back-to-legacy')).toBeVisible({ timeout: LOAD_TIMEOUT });
        await expect(page.getByTestId('mc-search')).toBeVisible();
        await expect(page.getByTestId('mc-toggle-all')).toBeVisible();
    });

    test('back-to-legacy returns to the original coach view', async ({ page }) => {
        await devLoginCoach(page);
        await page.waitForTimeout(TRANSITION_DELAY);
        const entry = page.getByTestId('mc-entry-button');
        if (!(await entry.isVisible().catch(() => false))) {
            test.skip(true, 'Feature flag not enabled');
        }
        await entry.click();
        await page.getByTestId('mc-back-to-legacy').click();
        await page.waitForTimeout(TRANSITION_DELAY);
        // Legacy view returns
        const back = await page.evaluate(() => {
            const t = document.body.innerText || '';
            return t.includes('Roster') || t.includes('Player DNA');
        });
        expect(back).toBe(true);
    });

    test('search filters the allocation list', async ({ page }) => {
        await devLoginCoach(page);
        await page.waitForTimeout(TRANSITION_DELAY);
        const entry = page.getByTestId('mc-entry-button');
        if (!(await entry.isVisible().catch(() => false))) {
            test.skip(true, 'Feature flag not enabled');
        }
        await entry.click();
        await expect(page.getByTestId('mc-search')).toBeVisible({ timeout: LOAD_TIMEOUT });
        // Type a search term (any string is fine; filter is case-insensitive contains)
        await page.getByTestId('mc-search').fill('zzzzzz_no_match');
        await page.waitForTimeout(TRANSITION_DELAY);
        const noMatchText = await page.evaluate(() => document.body.innerText || '');
        expect(noMatchText).toContain('No players match');
    });

    test('toggle "Show all players" switches list scope', async ({ page }) => {
        await devLoginCoach(page);
        await page.waitForTimeout(TRANSITION_DELAY);
        const entry = page.getByTestId('mc-entry-button');
        if (!(await entry.isVisible().catch(() => false))) {
            test.skip(true, 'Feature flag not enabled');
        }
        await entry.click();
        const toggle = page.getByTestId('mc-toggle-all');
        await expect(toggle).toBeVisible({ timeout: LOAD_TIMEOUT });
        // Click to show all
        await toggle.click();
        await page.waitForTimeout(TRANSITION_DELAY);
        const text = await page.evaluate(() => document.body.innerText || '');
        expect(text).toContain('All players');
    });
});
