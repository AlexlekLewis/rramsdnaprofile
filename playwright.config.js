// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * RRAM DNA Profile — Playwright E2E Configuration
 * 
 * Default: runs against the live Vercel deployment.
 * Local:   set TEST_LOCAL=1 to target http://localhost:4173 (run `npm run preview` first)
 *          Or set TEST_BASE_URL=http://localhost:5173 for dev server.
 *
 * Auth credentials via environment variables:
 *   TEST_ADMIN_USER, TEST_ADMIN_PASS   — admin/coach portal tests
 *   TEST_PLAYER_USER, TEST_PLAYER_PASS — player portal tests (onboarding state)
 *   TEST_SUBMITTED_PLAYER_USER/PASS    — player portal tests (post-onboarding)
 *   TEST_COACH_USER, TEST_COACH_PASS   — coach-only (non-admin) tests
 */

const isLocal = !!process.env.TEST_LOCAL;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,              // 60s per test — live site can be slow
  fullyParallel: false,         // Sequential — shared live DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                   // Single worker against live site
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL || (isLocal ? 'http://localhost:4173' : 'https://rramsdnaprofile.vercel.app'),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },

  projects: [
    // ── Desktop Chrome (primary) ──
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // ── Mobile Safari (secondary — responsive checks) ──
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone SE'] },
    },
  ],

  /* Uncomment to auto-start local preview server for tests:
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  */
});
