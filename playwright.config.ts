import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  reporter: [['list']],
  // Launching real Chrome is slow on a cold start, and several workers doing it
  // at once regularly blows the default 30s setup budget. Give it room, and
  // retry the launch failures rather than reporting them as test failures.
  timeout: 60_000,
  retries: 2,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    // Use whatever Chromium is already on the machine rather than downloading one.
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  // Tests run against the built demo site, so they exercise the same bundle
  // that gets deployed rather than loose files served off disk.
  webServer: {
    command: 'npm run build:demo && npm run preview --workspace=demo',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
