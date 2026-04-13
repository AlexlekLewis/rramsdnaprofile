/**
 * RRAM DNA Profile — E2E Test Constants & Selectors
 */

// ── Dev Bypass URLs (builds with vite.config.e2e.js enable import.meta.env.DEV) ──
export const DEV_COACH_URL = '/?devRole=coach';   // → super_admin portal
export const DEV_PLAYER_URL = '/?devRole=player';  // → player portal (submitted=true)

// ── Timeouts ──
export const LOAD_TIMEOUT = 30_000;
export const AUTH_TIMEOUT = 15_000;
export const TRANSITION_DELAY = 500;

// ── Registration codes ──
export const PLAYER_REG_CODE = 'RRAM-ELITE-2026';
export const COACH_REG_CODE = 'RR9X-STF-4KQ7';

// ── Password rules ──
export const PW_RULES = [
  'At least 8 characters',
  'One uppercase letter (A–Z)',
  'One lowercase letter (a–z)',
  'One number (0–9)',
  'One special character (!@#$…)',
];

// ── Selectors ──
export const SEL = {
  // Auth screens
  logo: 'img[alt=""]',
  appTitle: 'text=Player DNA Profile',

  // Login form
  loginUsernameInput: 'input[placeholder="Username"]',
  loginPasswordInput: 'input[placeholder="Password"]',
  signInButton: 'button:has-text("SIGN IN")',
  registerLink: 'text=New here? Register with your code',
  loginInstructionsLink: 'text=Login Instructions',
  forgotPasswordText: 'text=Forgot your password?',

  // Registration form
  regCodeInput: 'input[placeholder="Registration Code"]',
  regNameInput: 'input[placeholder="Full Name"]',
  regUsernameInput: 'input[placeholder="Username"]',
  regPasswordInput: 'input[placeholder="Password"]',
  regConfirmInput: 'input[placeholder="Confirm Password"]',
  createAccountButton: 'button:has-text("CREATE ACCOUNT")',
  alreadyHaveAccountLink: 'text=Already have an account? Sign in',

  // Coach portal
  signOutButton: 'button:has-text("Sign Out")',
  rosterNav: 'button:has-text("Roster")',
  dashboardNav: 'button:has-text("Dashboard")',
  profilesNav: 'button:has-text("Profiles")',
  squadsNav: 'button:has-text("Squads")',
};

// ── Roles ──
export const ROLES = ['Specialist Batter', 'Pace Bowler', 'Spin Bowler', 'WK-Batter', 'All-Rounder'];
