// Live Share Milestone 4B: performance profiling of the Battle Map Save -> player-visible path.
// Not part of the normal test run (its own test dir and config). Run:
//   npx playwright test --config playwright.perf.config.js
// Results: perf-results/live-share-profile/*.json (git-ignored), and Markdown tables on stdout.
// It reuses the normal config's web server, local relay and loopback TURN server.
import base from './playwright.config.js';

export default {
  ...base,
  testDir: './tests/perf',
  testMatch: '**/*.perf.js',
  fullyParallel: false,
  workers: 1, // one case at a time: timings must not compete for the CPU
  retries: 0,
  reporter: 'list',
  use: { ...base.use, trace: 'off', screenshot: 'off' },
};
