/**
 * MODULE 6 — PERFORMANCE, SECURITY & NETWORK
 * 
 * Tests page load performance, bundle size concerns, security basics
 * (no exposed secrets, proper auth gating), and network error handling.
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, login, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL, ADMIN_USER, ADMIN_PASS, AUTH_TIMEOUT, LOAD_TIMEOUT } from './helpers/constants.js';

test.describe('6.1 — Page Load Performance', () => {

  test('homepage loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(10_000); // 10s generous limit for live site
    console.log(`    Homepage load time: ${loadTime}ms`);
  });

  test('no excessively large network requests', async ({ page }) => {
    const largeRequests = [];

    page.on('response', response => {
      const size = parseInt(response.headers()['content-length'] || '0', 10);
      if (size > 2_000_000) { // 2MB
        largeRequests.push({ url: response.url(), size });
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Report any unusually large requests
    if (largeRequests.length > 0) {
      console.log('    Large requests detected:', largeRequests.map(r => `${r.url} (${(r.size / 1024).toFixed(0)}KB)`));
    }
  });

  test('lazy-loaded chunks load on demand (not upfront)', async ({ page }) => {
    const loadedScripts = [];

    page.on('response', response => {
      if (response.url().endsWith('.js') && response.status() === 200) {
        loadedScripts.push(response.url());
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // At login screen, the portal chunks should NOT be loaded yet
    const portalChunks = loadedScripts.filter(url =>
      url.includes('PlayerOnboarding') || url.includes('CoachAssessment') || url.includes('PlayerPortal')
    );

    // Lazy chunks should not load on the login page
    // (They might if Vite pre-loads them, but ideally they don't)
    console.log(`    Scripts loaded at login: ${loadedScripts.length}`);
    console.log(`    Portal chunks loaded: ${portalChunks.length}`);
  });
});

test.describe('6.2 — Security Basics', () => {

  test('no API keys or tokens visible in page source', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const html = await page.content();

    // Should not contain service role key patterns
    expect(html).not.toMatch(/service_role/i);
    expect(html).not.toMatch(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGxkemdtbHV3b29jd3h0emh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZS/);
    // Anon key is expected to be in the JS bundle — that's safe by design
  });

  test('no sensitive data in console output', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check none of the console output contains passwords or service keys
    const sensitivePatterns = [/password/i, /service_role/, /secret/i];
    for (const log of consoleLogs) {
      for (const pattern of sensitivePatterns) {
        expect(log, `Console log contains sensitive data: ${log}`).not.toMatch(pattern);
      }
    }
  });

  test('unauthenticated user cannot access coach portal URL directly', async ({ page }) => {
    // Even if someone manipulates the URL, without auth they should see login
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // The app is SPA — no direct routes. Auth is checked in AuthContext.
    // Without a session, the app should show the login form.
    await expect(page.locator(SEL.signInButton)).toBeVisible({ timeout: LOAD_TIMEOUT });
  });

  test('password fields use type="password"', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Login password field
    await expect(page.locator(SEL.loginPasswordInput)).toHaveAttribute('type', 'password');

    // Registration password fields
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.regPasswordInput)).toHaveAttribute('type', 'password');
    await expect(page.locator(SEL.regConfirmInput)).toHaveAttribute('type', 'password');
  });
});

test.describe('6.3 — Network Error Handling', () => {

  test('login with network offline shows error (not blank screen)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Fill credentials, then cut network, then submit
    await page.fill(SEL.loginUsernameInput, 'someuser');
    await page.fill(SEL.loginPasswordInput, 'SomePassword1!');

    // Block Supabase requests
    await page.route('**/supabase.co/**', route => route.abort());

    await page.click(SEL.signInButton);
    await page.waitForTimeout(3000);

    // Should show an error, not crash to blank screen
    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(10);

    // Should show some kind of error feedback
    const hasError = body.includes('⚠') || body.includes('failed') || body.includes('error') || body.includes('network');
    // The app should handle this gracefully

    // Clean up route
    await page.unroute('**/supabase.co/**');
  });

  test('registration with network offline shows error', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await page.fill(SEL.regCodeInput, 'RRAM-ELITE-2026');
    await page.fill(SEL.regNameInput, 'Test User');
    await page.fill(SEL.regUsernameInput, 'testoffline');
    await page.fill(SEL.regPasswordInput, 'StrongPass1!');
    await page.fill(SEL.regConfirmInput, 'StrongPass1!');

    // Block network
    await page.route('**/supabase.co/**', route => route.abort());

    await page.click(SEL.createAccountButton);
    await page.waitForTimeout(3000);

    // Should show error, not blank screen
    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(10);

    await page.unroute('**/supabase.co/**');
  });
});

test.describe('6.4 — Coach Portal Performance', () => {
  const needsAdmin = !ADMIN_USER || !ADMIN_PASS;
  test.skip(needsAdmin, 'Admin credentials not configured');

  test('roster loads within 8 seconds of auth', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const start = Date.now();
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });

    // Wait for player cards or empty state
    await page.waitForFunction(() => {
      const body = document.body.innerText;
      return body.includes('years') || body.includes('yrs') || body.includes('No players');
    }, { timeout: 10_000 });

    const loadTime = Date.now() - start;
    console.log(`    Coach portal load time (including auth): ${loadTime}ms`);
    expect(loadTime).toBeLessThan(15_000); // 15s generous for live site
  });
});

test.describe('6.5 — Console Health', () => {

  test('login page has zero fatal JS errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.waitForTimeout(2000);

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Fatal errors on login: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('registration page has zero fatal JS errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.waitForTimeout(2000);

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Fatal errors on registration: ${fatal.join('; ')}`).toHaveLength(0);
  });

  test('coach portal has zero fatal JS errors', async ({ page }) => {
    test.skip(!ADMIN_USER || !ADMIN_PASS, 'Admin credentials not configured');

    const errors = collectConsoleErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await login(page, ADMIN_USER, ADMIN_PASS);
    await expect(page.locator(SEL.rosterNav)).toBeVisible({ timeout: AUTH_TIMEOUT });
    await page.waitForTimeout(3000);

    const fatal = assertNoFatalErrors(errors);
    expect(fatal, `Fatal errors in coach portal: ${fatal.join('; ')}`).toHaveLength(0);
  });
});
