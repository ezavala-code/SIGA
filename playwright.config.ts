import { defineConfig, devices } from '@playwright/test';

const dockerTarget = process.env.SIGA_E2E_BASE_URL === 'http://localhost:8080';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.SIGA_E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: dockerTarget
    ? undefined
    : [
        {
          command: 'npm run start -w @siga/api',
          url: 'http://127.0.0.1:3000/health/live',
          reuseExistingServer: !process.env.CI && process.env.SIGA_E2E_ISOLATED !== '1',
          timeout: 30000,
        },
        {
          command: 'npm run dev -w @siga/web',
          url: 'http://127.0.0.1:5173',
          reuseExistingServer: !process.env.CI && process.env.SIGA_E2E_ISOLATED !== '1',
          timeout: 30000,
        },
      ],
});
