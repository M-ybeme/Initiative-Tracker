import { defineConfig } from 'vitest/config';

// Normalize root path to use uppercase drive letter on Windows
// This fixes a vitest 4.0.17 bug where lowercase drive letters cause "No test suite found" errors
const normalizeRoot = (dirPath) => {
  if (process.platform === 'win32') {
    // Convert c:/ or c:\ to C:/ or C:\ on Windows
    return dirPath.replace(/^([a-z]):/i, (match, letter) => letter.toUpperCase() + ':');
  }
  return dirPath;
};

export default defineConfig({
  root: normalizeRoot(process.cwd()),
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        'vitest.config.js',
        'playwright.config.js',
        '.husky/',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
