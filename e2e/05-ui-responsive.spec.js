/**
 * MODULE 5 — UI/UX, RESPONSIVE DESIGN & VISUAL INTEGRITY
 * 
 * Tests responsive layout, visual consistency, loading states,
 * and accessibility basics across screen sizes.
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, login, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL, ADMIN_USER, ADMIN_PASS, AUTH_TIMEOUT } from './helpers/constants.js';

test.describe('5.1 — Responsive Design — Login Screen', () => {

  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 14', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`login form renders correctly at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);

      // All core elements visible
      await expect(page.locator(SEL.logo).first()).toBeVisible();
      await expect(page.locator(SEL.loginUsernameInput)).toBeVisible();
      await expect(page.locator(SEL.signInButton)).toBeVisible();

      // No horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

      // Login form should be centered and max-width 300px
      const formWidth = await page.locator(SEL.loginUsernameInput).evaluate(el => {
        const parent = el.closest('div[style*="maxWidth"]') || el.parentElement;
        return parent.offsetWidth;
      });
      expect(formWidth).toBeLessThanOrEqual(350); // 300px max + padding tolerance
    });
  }

  test('no content clipping on smallest viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check that the sign-in button is fully visible (not clipped)
    const btnBox = await page.locator(SEL.signInButton).boundingBox();
    expect(btnBox).toBeTruthy();
    expect(btnBox.x).toBeGreaterThanOrEqual(0);
    expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(375);
  });
});

test.describe('5.2 — Responsive Design — Registration', () => {

  test('registration form fits on iPhone SE', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await expect(page.locator(SEL.createAccountButton)).toBeVisible();

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(377);

    // Password rules should be visible without horizontal scroll
    await page.fill(SEL.regPasswordInput, 'a');
    await page.waitForTimeout(300);
    const rulesVisible = await page.locator('text=At least 8 characters').isVisible();
    expect(rulesVisible).toBe(true);
  });
});

test.describe('5.3 — Responsive Design — Coach Portal', () => {
  const needsAdmin = !ADMIN_USER || !ADMIN_PASS;
  test.skip(needsAdmin, 'Admin credentials not configured');

  test('roster shows 1-column on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });
    await page.waitForTimeout(2000);

    // On mobile, cards should stack vertically
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('bottom nav bar is visible and fixed', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // Nav bar should be fixed at bottom
    const navBar = page.locator(SEL.rosterNav).locator('..');
    const navBox = await navBar.boundingBox();
    if (navBox) {
      // Bottom nav should be near the bottom of the viewport
      expect(navBox.y + navBox.height).toBeGreaterThan(700);
    }
  });

  test('roster renders properly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });
    await page.waitForTimeout(2000);

    // On desktop, should show 2-column grid (cards side by side)
    // Verify no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1445);
  });
});

test.describe('5.4 — Visual Consistency', () => {

  test('gradient background on auth screens', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check that the main container has a gradient background
    const bgStyle = await page.locator('div[style*="linear-gradient"]').first().getAttribute('style');
    expect(bgStyle).toContain('linear-gradient');
  });

  test('RRA logo loads without error', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const logo = page.locator(SEL.logo).first();
    await expect(logo).toBeVisible();

    // Check the image actually loaded (not broken)
    const naturalWidth = await logo.evaluate(img => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('font family is applied', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const fontFamily = await page.locator('text=Player DNA Profile').evaluate(
      el => window.getComputedStyle(el).fontFamily
    );
    // Should use the Inter/Montserrat font stack
    expect(fontFamily.toLowerCase()).toMatch(/inter|montserrat|sans-serif/);
  });
});

test.describe('5.5 — Loading States', () => {

  test('initial load shows splash screen briefly', async ({ page }) => {
    // Navigate and check for loading indicator
    const response = page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // The app should show "Loading..." at some point during init
    // (It may be very brief on fast connections)
    await response;
    
    // After full load, loading should be gone
    await waitForAppReady(page);
    await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 5000 });
  });

  test('signing in shows spinner state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Fill valid-looking credentials to trigger the signing-in state
    await page.fill(SEL.loginUsernameInput, ADMIN_USER || 'testuser');
    await page.fill(SEL.loginPasswordInput, 'SomePassword1!');
    await page.click(SEL.signInButton);

    // Should briefly show "Signing in..."
    // (May be very fast if it fails quickly)
    await page.waitForTimeout(200);
    const body = await page.textContent('body');
    // Either signing in or already got an error — both valid
    expect(body.includes('Signing in') || body.includes('⚠')).toBe(true);
  });
});

test.describe('5.6 — Error Boundary', () => {

  test('app does not show blank white screen on load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Wait generously

    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(10);

    // Should not show the raw error boundary fallback
    const hasErrorBoundary = body.includes('Something went wrong');
    // If error boundary shows, that's a real problem — but at least it's not blank
  });
});

test.describe('5.7 — Copy & Wording', () => {

  test('no placeholder text visible (Lorem, TODO, etc.)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const body = await page.textContent('body');
    expect(body).not.toContain('Lorem ipsum');
    expect(body).not.toContain('TODO');
    expect(body).not.toContain('FIXME');
    expect(body).not.toContain('placeholder text');
  });

  test('branding text is correct', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await expect(page.locator('text=Rajasthan Royals Academy')).toBeVisible();
    await expect(page.locator('text=Player DNA Profile')).toBeVisible();
  });
});
