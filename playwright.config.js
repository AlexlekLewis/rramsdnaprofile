// @ts-check
import { defineConfig, devices } from '@playwright/test';

function getProxy() {
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return { server: `http://${u.host}`, username: decodeURIComponent(u.username), password: decodeURIComponent(u.password), bypass: 'localhost,127.0.0.1' };
  } catch { return undefined; }
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ...(getProxy() ? { proxy: getProxy() } : {}),
    launchOptions: { args: ['--no-proxy-server'] },
  },

  webServer: {
    command: 'npx vite build --config vite.config.e2e.js && node serve-spa.cjs',
    port: 4173,
    reuseExistingServer: true,
    timeout: 30_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
