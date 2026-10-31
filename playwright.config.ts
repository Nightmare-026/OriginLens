import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end checks run against a real production build and a real Chromium,
 * because the C2PA path depends on WebAssembly, a worker, and a same-origin
 * asset fetch that a dev server or a mock cannot prove.
 */

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env['CI']),
  reporter: [['list']],
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    // E2E must be deterministic and must not contact an external inference
    // provider. The explanation UI is exercised through the local fallback.
    env: {
      MODEL_EXPLANATION_ENABLED: 'false',
      MODEL_API_KEY: '',
      MODEL_API_BASE_URL: '',
      MODEL_NAME: '',
      NEXT_PUBLIC_APP_URL: 'https://originlens.org',
      ALLOW_DEV_SMOKE: '1',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
