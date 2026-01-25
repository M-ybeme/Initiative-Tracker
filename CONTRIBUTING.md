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

## SRD Content Compliance

We only ship SRD 5.1 rules plus original homebrew that you author yourself. Every contribution must prove it stays inside that boundary, otherwise it will be rejected or redirected to the future content-pack workflow.

### Required Checklist (copy into your PR description)

- [ ] **Source tagging** – Every new race, class, spell, feat, background, monster, or rules blurb includes `source`, `srdCitation`, and (if applicable) `nonSrdReason` metadata inside `internal-roadmaps/manifests/srd-audit.json` or related data modules. Cite the SRD section/page or mark it as "Homebrew".
- [ ] **Text review** – No verbatim excerpts from non-SRD books. Summaries are rewritten in original language unless the wording is straight from the SRD PDF.
- [ ] **Data surfaces** – Check dropdowns, tooltips, docs, exports, diagnostics, and screenshots to ensure they only reference SRD-allowlisted IDs by default. If you add a new dataset, wire it through the runtime filter in `js/site.js`.
- [ ] **Automation hooks** – Updated the SRD allowlist manifest and ran the relevant tests/lint scripts (e.g., `npm run test:run`, targeted unit suites) so CI will catch non-SRD IDs.
- [ ] **Product identity guardrails** – Do not use Wizards of the Coast trademarks, logos, or product-identity-only monsters (beholders, mind flayers, etc.). When in doubt, treat it as disallowed.
- [ ] **Attribution & exports** – Confirm UI surfaces (footer, diagnostics, modals) still display the CC-BY notice and that any new export format reuses the attribution/disclaimer helpers (see `js/modules/export-utils.js`, `js/journal-export.js`, and `js/character-sheet-export.js`).

### Escalation Path

Stop immediately and escalate if you cannot positively identify the source of a contribution or you suspect an SRD violation:

1. Convert your PR to "Draft" (or do not open one yet) and open an issue titled `[Content Audit] <feature>` describing the question. Link to offending files/lines and include screenshots if UI text is involved.
2. Tag `@Maybeme` (project owner) and add the `content-audit` label so it stays on the SRD review queue.
3. Provide the citation you were expecting (book/page) and clearly state whether you believe it is SRD or non-SRD. The maintainer will update the manifest, reject the change, or move it into the private content-pack backlog.

Never merge a PR with an unchecked compliance box. If automation or review later finds a violation, the change will be reverted and the contributor may lose review privileges.

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
