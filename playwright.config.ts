import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'America/New_York',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter backend exec tsx test/e2e-server.ts',
      url: 'http://127.0.0.1:3101/api/health',
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: 'pnpm --filter frontend dev --host 127.0.0.1 --port 5174 --strictPort',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
  ],
})
