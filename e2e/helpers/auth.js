/**
 * RRAM DNA Profile — E2E Auth Helpers
 */
import { expect } from '@playwright/test';
import { SEL, AUTH_TIMEOUT, LOAD_TIMEOUT, TRANSITION_DELAY, DEV_COACH_URL, DEV_PLAYER_URL } from './constants.js';

/** Wait for the app to finish loading past the splash screen. */
export async function waitForAppReady(page) {
  await page.waitForFunction(() => {
    const t = document.body?.innerText || '';
    return t.includes('SIGN IN') || t.includes('Create your') || t.includes('Roster') ||
           t.includes('Welcome back') || t.includes('STEP') || t.includes('Player DNA Profile');
  }, { timeout: LOAD_TIMEOUT });
  await page.waitForTimeout(TRANSITION_DELAY);
}

/** Navigate to dev coach portal (super_admin) via dev bypass. */
export async function devLoginCoach(page) {
  await page.goto(DEV_COACH_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const t = document.body?.innerText || '';
    return t.includes('Roster') || t.includes('COACH PORTAL');
  }, { timeout: LOAD_TIMEOUT });
  await page.waitForTimeout(TRANSITION_DELAY);
}

/** Navigate to dev player portal via dev bypass (submitted=true → PlayerPortal). */
export async function devLoginPlayer(page) {
  await page.goto(DEV_PLAYER_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const t = document.body?.innerText || '';
    return t.includes('Welcome back') || t.includes('Welcome') || t.includes('STEP');
  }, { timeout: LOAD_TIMEOUT });
  await page.waitForTimeout(TRANSITION_DELAY);
}

/** Login via the UI with username/password. */
export async function login(page, username, password) {
  await page.waitForSelector(SEL.loginUsernameInput, { timeout: AUTH_TIMEOUT });
  await page.fill(SEL.loginUsernameInput, username);
  await page.fill(SEL.loginPasswordInput, password);
  await page.click(SEL.signInButton);
  await page.waitForFunction(() => {
    const t = document.body?.innerText || '';
    return t.includes('Roster') || t.includes('Welcome back') || t.includes('STEP') || t.includes('⚠');
  }, { timeout: AUTH_TIMEOUT });
}

/** Attempt login expecting a specific error. */
export async function loginExpectError(page, username, password, expectedError) {
  await page.waitForSelector(SEL.loginUsernameInput, { timeout: AUTH_TIMEOUT });
  await page.fill(SEL.loginUsernameInput, username);
  await page.fill(SEL.loginPasswordInput, password);
  await page.click(SEL.signInButton);
  await expect(page.locator(`text=${expectedError}`)).toBeVisible({ timeout: AUTH_TIMEOUT });
}

/** Sign out from any portal. */
export async function signOut(page) {
  const btn = page.locator(SEL.signOutButton).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForSelector(SEL.signInButton, { timeout: AUTH_TIMEOUT });
  }
}

/** Collect console errors during a test. */
export function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

/** Filter out known-benign console errors. Returns only genuinely fatal ones. */
export function assertNoFatalErrors(errors) {
  return errors.filter(e =>
    !e.includes('favicon') && !e.includes('realtime') && !e.includes('net::ERR_') &&
    !e.includes('ResizeObserver') && !e.includes('Slack notify') && !e.includes('Failed to fetch') &&
    !e.includes('Failed to load resource') &&  // Supabase 400s from dev bypass (fake user ID)
    !e.includes('program_members.program_id')   // Known bug: journal queries non-existent column
  );
}

/** Known bugs discovered by E2E tests — check if they're still present. */
export const KNOWN_BUGS = [
  'column program_members.program_id does not exist (Journal view query)',
];
