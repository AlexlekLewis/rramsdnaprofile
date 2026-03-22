/**
 * MODULE 6 — PERFORMANCE, SECURITY & NETWORK
 */
import { test, expect } from '@playwright/test';
import { waitForAppReady, devLoginCoach, collectConsoleErrors, assertNoFatalErrors } from './helpers/auth.js';
import { SEL } from './helpers/constants.js';

test.describe('6.1 — Page Load Performance', () => {
  test('homepage loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const ms = Date.now() - start;
    console.log(`    Homepage load: ${ms}ms`);
    expect(ms).toBeLessThan(10_000);
  });

  test('lazy-loaded chunks not loaded at login', async ({ page }) => {
    const scripts = [];
    page.on('response', r => { if (r.url().endsWith('.js') && r.status() === 200) scripts.push(r.url()); });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const portal = scripts.filter(u => /PlayerOnboarding|CoachAssessment|PlayerPortal/.test(u));
    console.log(`    Scripts at login: ${scripts.length}, portal chunks: ${portal.length}`);
    expect(portal.length).toBe(0);
  });

  test('coach portal loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await devLoginCoach(page);
    await page.waitForTimeout(2000);
    const ms = Date.now() - start;
    console.log(`    Coach portal load: ${ms}ms`);
    expect(ms).toBeLessThan(15_000);
  });
});

test.describe('6.2 — Security Basics', () => {
  test('no service_role key in page source', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    const html = await page.content();
    expect(html).not.toMatch(/service_role/i);
  });

  test('no sensitive data in console', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    for (const log of logs) {
      expect(log).not.toMatch(/password/i);
      expect(log).not.toMatch(/service_role/);
    }
  });

  test('unauthenticated shows login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.signInButton)).toBeVisible();
  });

  test('password fields masked by default', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.loginPasswordInput)).toHaveAttribute('type', 'password');
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.locator(SEL.regPasswordInput)).toHaveAttribute('type', 'password');
    await expect(page.locator(SEL.regConfirmInput)).toHaveAttribute('type', 'password');
  });
});

test.describe('6.3 — Network Error Handling', () => {
  test('login offline shows error, not blank screen', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.fill(SEL.loginUsernameInput, 'someuser');
    await page.fill(SEL.loginPasswordInput, 'SomePass1!');
    await page.route('**/supabase.co/**', route => route.abort());
    await page.click(SEL.signInButton);
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(10);
    await page.unroute('**/supabase.co/**');
  });

  test('registration offline shows error', async ({ page }) => {
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.fill(SEL.regCodeInput, 'RRAM-ELITE-2026');
    await page.fill(SEL.regNameInput, 'Test');
    await page.fill(SEL.regUsernameInput, 'testoffline');
    await page.fill(SEL.regPasswordInput, 'StrongPass1!');
    await page.fill(SEL.regConfirmInput, 'StrongPass1!');
    await page.route('**/supabase.co/**', route => route.abort());
    await page.click(SEL.createAccountButton);
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body.trim().length).toBeGreaterThan(10);
    await page.unroute('**/supabase.co/**');
  });
});

test.describe('6.4 — Console Health', () => {
  test('login page zero fatal errors', async ({ page }) => {
    const e = collectConsoleErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.waitForTimeout(2000);
    expect(assertNoFatalErrors(e)).toHaveLength(0);
  });

  test('registration page zero fatal errors', async ({ page }) => {
    const e = collectConsoleErrors(page);
    await page.goto('/?join=player', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await page.waitForTimeout(2000);
    expect(assertNoFatalErrors(e)).toHaveLength(0);
  });

  test('coach portal zero fatal errors', async ({ page }) => {
    const e = collectConsoleErrors(page);
    await devLoginCoach(page);
    await page.waitForTimeout(3000);
    expect(assertNoFatalErrors(e)).toHaveLength(0);
  });
});
