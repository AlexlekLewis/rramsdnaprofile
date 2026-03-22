/**
 * RRAM DNA Profile — E2E Auth Helpers
 * 
 * Reusable login/logout/wait functions used across test suites.
 */
import { expect } from '@playwright/test';
import { SEL, AUTH_TIMEOUT, LOAD_TIMEOUT, TRANSITION_DELAY } from './constants.js';

/**
 * Wait for the app to finish loading (past the splash screen).
 * Resolves when either the login form or a portal is visible.
 */
export async function waitForAppReady(page) {
  // Wait for React to render meaningful content
  await page.waitForFunction(() => {
    const body = document.body?.innerText || '';
    // App is ready when we see login, registration, or portal content
    return body.includes('Sign in') ||
           body.includes('SIGN IN') ||
           body.includes('Create your') ||
           body.includes('CREATE ACCOUNT') ||
           body.includes('Roster') ||
           body.includes('Welcome back') ||
           body.includes('STEP') ||
           body.includes('Welcome to Your DNA Profile') ||
           body.includes('Player DNA Profile');
  }, { timeout: LOAD_TIMEOUT });
  // Small settle time for React hydration
  await page.waitForTimeout(TRANSITION_DELAY);
}

/**
 * Login with username and password via the UI.
 * Waits for the portal to load after successful auth.
 */
export async function login(page, username, password) {
  // Ensure we're on the login form
  await page.waitForSelector(SEL.loginUsernameInput, { timeout: AUTH_TIMEOUT });

  // Fill credentials
  await page.fill(SEL.loginUsernameInput, username);
  await page.fill(SEL.loginPasswordInput, password);

  // Click sign in
  await page.click(SEL.signInButton);

  // Wait for signing-in state, then portal load
  // The app shows "Signing in..." briefly, then loads the portal
  await page.waitForFunction(() => {
    const body = document.body.innerText;
    // Either a portal loaded, or we got an error
    return body.includes('Roster') ||
           body.includes('Welcome back') ||
           body.includes('Welcome to Your DNA Profile') ||
           body.includes('STEP') ||
           body.includes('⚠');
  }, { timeout: AUTH_TIMEOUT });
}

/**
 * Attempt login and expect it to fail with a specific error message.
 */
export async function loginExpectError(page, username, password, expectedError) {
  await page.waitForSelector(SEL.loginUsernameInput, { timeout: AUTH_TIMEOUT });
  await page.fill(SEL.loginUsernameInput, username);
  await page.fill(SEL.loginPasswordInput, password);
  await page.click(SEL.signInButton);

  // Wait for error message
  const errorEl = await page.waitForSelector(`text=${expectedError}`, { timeout: AUTH_TIMEOUT });
  expect(errorEl).toBeTruthy();
}

/**
 * Sign out from any portal.
 */
export async function signOut(page) {
  const signOutBtn = page.locator(SEL.signOutButton).first();
  if (await signOutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signOutBtn.click();
    // Wait for login form to appear
    await page.waitForSelector(SEL.signInButton, { timeout: AUTH_TIMEOUT });
  }
}

/**
 * Navigate to a URL using domcontentloaded (SPA loads JS early, load event fires late).
 */
export async function safeGoto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
}

/**
 * Navigate to login page and ensure the form is ready.
 */
export async function goToLogin(page, baseUrl) {
  await safeGoto(page, baseUrl || '/');
  await waitForAppReady(page);
}

/**
 * Navigate to player registration page.
 */
export async function goToPlayerRegistration(page, baseUrl) {
  await safeGoto(page, `${baseUrl || ''}/?join=player`);
  await waitForAppReady(page);
}

/**
 * Navigate to coach registration page.
 */
export async function goToCoachRegistration(page, baseUrl) {
  await safeGoto(page, `${baseUrl || ''}/?join=coach`);
  await waitForAppReady(page);
}

/**
 * Collect all console errors during a test.
 * Call at the start of a test, check at the end.
 */
export function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  return errors;
}

/**
 * Assert no critical console errors occurred.
 * Filters out known benign warnings (e.g. Supabase realtime, favicon).
 */
export function assertNoFatalErrors(errors) {
  const fatal = errors.filter(e => {
    // Filter out known benign errors
    if (e.includes('favicon')) return false;
    if (e.includes('realtime')) return false;
    if (e.includes('net::ERR_')) return false;  // network transient
    if (e.includes('ResizeObserver')) return false;
    if (e.includes('Slack notify failed')) return false;
    return true;
  });
  return fatal;
}
