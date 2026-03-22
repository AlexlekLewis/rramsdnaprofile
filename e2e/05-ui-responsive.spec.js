/**
 * MODULE 5 — UI/UX, RESPONSIVE DESIGN & VISUAL INTEGRITY
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, devLoginCoach, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('5.1 — Responsive Login Screen', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 14', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`renders correctly at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);
      await expect(page.locator(SEL.logo).first()).toBeVisible();
      await expect(page.locator(SEL.loginUsernameInput)).toBeVisible();
      await expect(page.locator(SEL.signInButton)).toBeVisible();
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      const cw = await page.evaluate(() => document.documentElement.clientWidth);
      expect(sw).toBeLessThanOrEqual(cw + 2);
    });
  }

  test('no content clipping at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const box = await page.locator(SEL.signInButton).boundingBox();
    expect(box).toBeTruthy();
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });
});

test.describe('5.2 — Responsive Registration', () => {
  test('registration form fits iPhone SE', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.createAccountButton)).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(377);
  });
});

test.describe('5.3 — Responsive Coach Portal', () => {
  test('roster has no overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await devLoginCoach(page);
    await page.waitForTimeout(2000);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
  });

  test('bottom nav bar is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await devLoginCoach(page);
    await expect(page.locator(SEL.rosterNav)).toBeVisible();
    await expect(page.locator(SEL.dashboardNav)).toBeVisible();
  });

  test('roster renders on desktop without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await devLoginCoach(page);
    await page.waitForTimeout(2000);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(1445);
  });
});

test.describe('5.4 — Visual Consistency', () => {
  test('gradient background on auth screens', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const bg = await page.locator('div[style*="linear-gradient"]').first().getAttribute('style');
    expect(bg).toContain('linear-gradient');
  });

  test('RRA logo loads without error', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const logo = page.locator(SEL.logo).first();
    await expect(logo).toBeVisible();
    const nw = await logo.evaluate(img => img.naturalWidth);
    expect(nw).toBeGreaterThan(0);
  });

  test('font family applied', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const ff = await page.locator('text=Player DNA Profile').evaluate(el => getComputedStyle(el).fontFamily);
    expect(ff.toLowerCase()).toMatch(/inter|montserrat|sans-serif/);
  });
});

test.describe('5.5 — Loading & Error States', () => {
  test('signing in shows spinner state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.fill(SEL.loginUsernameInput, 'someuser');
    await page.fill(SEL.loginPasswordInput, 'SomePass1!');
    await page.click(SEL.signInButton);
    await page.waitForTimeout(200);
    const body = await page.textContent('body');
    expect(body.includes('Signing in') || body.includes('⚠')).toBe(true);
  });

  test('app never shows blank white screen', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(10);
  });

  test('no placeholder text (Lorem, TODO)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const body = await page.textContent('body');
    expect(body).not.toContain('Lorem ipsum');
    expect(body).not.toContain('TODO');
  });

  test('branding text correct', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator('text=Rajasthan Royals Academy')).toBeVisible();
    await expect(page.locator('text=Player DNA Profile')).toBeVisible();
  });
});
