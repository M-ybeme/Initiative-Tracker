// Global test setup
import { beforeEach, afterEach } from 'vitest';
import { createLocalStorageMock } from './localStorage-mock.js';

// Reset localStorage before each test
beforeEach(() => {
  const localStorageMock = createLocalStorageMock();
  global.localStorage = localStorageMock;
  window.localStorage = localStorageMock;
});

// Clean up after each test
afterEach(() => {
  localStorage.clear();
});
