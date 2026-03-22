// @ts-check
import { defineConfig, devices } from '@playwright/test';

function getProxy() {
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return {
      server: `http://${url.host}`,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      bypass: 'localhost,127.0.0.1',
    };
  } catch { return undefined; }
}

const proxy = getProxy();

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ...(proxy ? { proxy } : {}),
  },

  webServer: {
    command: 'npm run build && node serve-spa.cjs',
    port: 4173,
    reuseExistingServer: true,
    timeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
