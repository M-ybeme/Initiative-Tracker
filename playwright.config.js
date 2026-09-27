import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI retries a failed test to record a trace (see `trace: 'on-first-retry'`), but a test that only
  // passes on a retry still fails the run: retries give evidence, they never turn a flaky test green.
  retries: process.env.CI ? 2 : 0,
  failOnFlakyTests: true,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3100',
    // The app formats numbers with the browser's default locale; the tests expect en-US output (e.g. "7,345").
    locale: 'en-US',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server to serve static files - needed for absolute paths like /js/...
  //
  // --no-etag is required for a full run. serve enables ETags by default, and serve-handler (6.1.6)
  // opens a file's read stream before comparing the ETag; on a match it answers 304 and never closes
  // that stream. Browsers revalidate cached scripts on every reload and second tab (about 8,200 times
  // per full run), so the server leaked one file descriptor per 304 and crashed with EMFILE near the
  // Windows limit of 8,192 open files; every later test then failed with ERR_CONNECTION_REFUSED.
  // Without ETags the handler always sends 200 and closes every file (measured: at most ~20 open).
  //
  // Port 3100 is the test server's own, never the dev server's 3000 (`npx serve .` in the README, which
  // keeps ETags on). Locally Playwright reuses whatever already listens on its port without checking its
  // flags, so sharing 3000 would let a running dev server take the place of this one and bring the leak back.
  webServer: {
    command: 'npx serve -l 3100 --no-etag',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
