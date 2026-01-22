# Contributing to The DM's Toolbox

Thank you for your interest in contributing to The DM's Toolbox! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Initiative-Tracker.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm 9 or higher

### Installing Dependencies

```bash
npm install
```

This will also set up Husky pre-commit hooks automatically.

## Running Tests

### Unit & Integration Tests

```bash
# Run tests in watch mode (during development)
npm test

# Run tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with Playwright UI
npm run test:e2e:ui

# Run E2E tests in headed browser (visible)
npm run test:e2e:headed
```

## Test Requirements

### Before Submitting a PR

1. **All tests must pass**: Run `npm run test:run` and `npm run test:e2e` to verify
2. **Coverage thresholds must be met**:
   - Statements: 70%
   - Branches: 60%
   - Functions: 70%
   - Lines: 70%
3. **Pre-commit hooks**: Husky will automatically run related tests on staged files

### Writing Tests

#### Unit Tests

Unit tests go in `tests/unit/` and test individual functions in isolation.

```javascript
// tests/unit/example.test.js
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../js/modules/my-module.js';

describe('myFunction', () => {
  it('should do something specific', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

#### Integration Tests

Integration tests go in `tests/integration/` and test how modules work together.

```javascript
// tests/integration/example.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { moduleA } from '../../js/modules/module-a.js';
import { moduleB } from '../../js/modules/module-b.js';

describe('Module A and B integration', () => {
  beforeEach(() => {
    // Setup code
  });

  it('should work together correctly', () => {
    const resultA = moduleA.process(data);
    const resultB = moduleB.transform(resultA);
    expect(resultB).toMatchObject(expected);
  });
});
```

#### E2E Tests

E2E tests go in `tests/e2e/` and test real user workflows in a browser.

```javascript
// tests/e2e/example.spec.js
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should allow user to do something', async ({ page }) => {
    await page.goto('page.html');
    await page.locator('#button').click();
    await expect(page.locator('#result')).toBeVisible();
  });
});
```

### Test File Naming Conventions

- Unit tests: `tests/unit/{module-name}.test.js`
- Integration tests: `tests/integration/{feature-name}.test.js`
- E2E tests: `tests/e2e/{page-name}.spec.js`

## Code Style

### JavaScript

- Use ES modules for testable code in `js/modules/`
- Use dependency injection for external dependencies (localStorage, random, etc.)
- Keep functions pure when possible for easier testing
- Add JSDoc comments for public functions

### Commits

- Use clear, descriptive commit messages
- Reference issue numbers when applicable: `Fix #123: Add validation for...`

## Pull Request Process

1. Ensure all tests pass locally
2. Update documentation if needed
3. Fill out the PR template completely
4. Request review from maintainers
5. Address any feedback

## Project Structure

```
Initiative-Tracker/
├── js/
│   ├── modules/          # Testable ES modules
│   └── *.js              # Main application code
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   ├── helpers/          # Test utilities
│   └── mocks/            # Mock data
├── .github/
│   └── workflows/        # CI/CD configuration
├── .husky/               # Git hooks
├── docs/                 # Documentation
└── coverage/             # Generated coverage reports
```

## Questions?

If you have questions, please open an issue or reach out to the maintainers.
