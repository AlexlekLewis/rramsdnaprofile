/**
 * RRAM DNA Profile — E2E Test Constants & Selectors
 * 
 * Central place for all test credentials, URLs, selectors, and timeouts.
 * Keep selectors here so tests don't break silently when UI changes.
 */

// ── URLs ──
export const BASE_URL = process.env.TEST_BASE_URL || 'https://rramsdnaprofile.vercel.app';
export const PLAYER_JOIN_URL = `${BASE_URL}/?join=player`;
export const COACH_JOIN_URL = `${BASE_URL}/?join=coach`;

// ── Test credentials (from env vars or defaults for CI) ──
export const ADMIN_USER = process.env.TEST_ADMIN_USER || 'alex.lewis';
export const ADMIN_PASS = process.env.TEST_ADMIN_PASS || '';

export const TEST_PLAYER_USER = process.env.TEST_PLAYER_USER || '';
export const TEST_PLAYER_PASS = process.env.TEST_PLAYER_PASS || '';

// ── Registration codes ──
export const PLAYER_REG_CODE = 'RRAM-ELITE-2026';
export const COACH_REG_CODE = 'RR9X-STF-4KQ7';

// ── Timeouts ──
export const LOAD_TIMEOUT = 45_000;
export const AUTH_TIMEOUT = 15_000;
export const SAVE_TIMEOUT = 10_000;
export const TRANSITION_DELAY = 500;

// ── Selectors (text-based for resilience) ──
export const SEL = {
  // Auth screens
  logo: 'img[alt=""]',
  appTitle: 'text=Player DNA Profile',
  appSubtitle: 'text=Onboarding & Assessment System',

  // Login form
  loginUsernameInput: 'input[placeholder="Username"]',
  loginPasswordInput: 'input[placeholder="Password"]',
  signInButton: 'button:has-text("SIGN IN")',
  signingInText: 'text=Signing in...',
  registerLink: 'text=New player? Register here',
  loginInstructionsLink: 'text=Login Instructions',
  forgotPasswordText: 'text=Forgot your password?',

  // Registration form
  regCodeInput: 'input[placeholder="Registration Code"]',
  regNameInput: 'input[placeholder="Full Name"]',
  regUsernameInput: 'input[placeholder="Username"]',
  regPasswordInput: 'input[placeholder="Password"]',
  regConfirmInput: 'input[placeholder="Confirm Password"]',
  createAccountButton: 'button:has-text("CREATE ACCOUNT")',
  creatingAccountText: 'text=Creating your account...',
  alreadyHaveAccountLink: 'text=Already have an account? Sign in',

  // Loading states
  loadingText: 'text=Loading...',
  loadingPortalText: 'text=Loading portal...',

  // Coach portal
  signOutButton: 'button:has-text("Sign Out")',
  rosterNav: 'button:has-text("Roster")',
  dashboardNav: 'button:has-text("Dashboard")',
  profilesNav: 'button:has-text("Profiles")',
  squadsNav: 'button:has-text("Squads")',

  // Player portal
  welcomeBack: 'text=/Welcome back/',
  journalTile: 'text=Journal',
  idpTile: 'text=My IDP',

  // Error display
  errorPrefix: '⚠',
};

// ── Password rules for registration ──
export const PW_RULES = [
  'At least 8 characters',
  'One uppercase letter (A–Z)',
  'One lowercase letter (a–z)',
  'One number (0–9)',
  'One special character (!@#$…)',
];

// ── Onboarding step labels ──
export const ONBOARDING_STEPS = [
  'Player Profile',
  'Competition History',
  'T20 Identity',
  'Self-Assessment',
  'Player Voice',
  'Medical & Goals',
  'Review & Submit',
];

// ── Role options ──
export const ROLES = ['Specialist Batter', 'Pace Bowler', 'Spin Bowler', 'WK-Batter', 'All-Rounder'];
