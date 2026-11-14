// End-to-end tests for /replica-test. They run against the web build on the
// in-memory fake data layer (every page load starts from the same seed, signed
// in as Ana), so tests are independent and never touch the real Supabase project.
//
//   npx playwright test            (starts the server if it is not running)
//   npx playwright test --ui       (watch it click)
import { defineConfig, devices } from '@playwright/test';

const PORT = 8082;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // Metro serves one bundle; more than two browsers at once only slows it down
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  outputDir: 'e2e/results',
  use: {
    ...devices['Pixel 7'],
    // the installed Microsoft Edge, so no browser download is needed
    browserName: 'chromium',
    channel: 'msedge',
    viewport: { width: 390, height: 844 },
    locale: 'es-ES',
    timezoneId: 'Europe/Warsaw',
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // fake data, signed in as Ana; EXPO_NO_DOTENV keeps .env.local (the real project) out
    command: `npx expo start --web --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { CI: '1', BROWSER: 'none', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_DEMO_USER: 'ana@padelpiwo.test' },
  },
});
