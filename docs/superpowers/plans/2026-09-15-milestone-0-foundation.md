# Milestone 0 Repository Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a clean, statically deployable Vite/React/TypeScript repository with formatting, linting, unit/component tests, browser smoke tests, CI, deployment, and architectural documentation.

**Architecture:** Vite compiles a minimal accessible React entry point to static assets. Tooling remains development-only, while future content, engine, storage, and UI boundaries are documented without adding premature runtime abstractions.

**Tech Stack:** React, TypeScript, Vite, ESLint, Prettier, Vitest, React Testing Library, Playwright, GitHub Actions, npm.

---

### Task 1: Establish the toolchain

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `eslint.config.js`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/vite-env.d.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Add the npm manifest and configuration files**

  Define scripts for `dev`, `build`, `preview`, `lint`, `format`, `format:check`, `test`, `test:watch`, and `test:e2e`. Use React and React DOM as the only runtime dependencies. Configure Vite with `base: './'`, React, and a jsdom Vitest environment. Configure ESLint for browser TypeScript and React hooks/refresh rules, and load `@testing-library/jest-dom/vitest` from the test setup file.

- [ ] **Step 2: Install dependencies and create the lockfile**

  Run: `npm install`

  Expected: exit 0 and a generated `package-lock.json`.

- [ ] **Step 3: Verify the empty test harness starts**

  Run: `npm test -- --run`

  Expected: exit 1 because no test files exist yet, proving the configured test runner is active.

### Task 2: Build the accessible placeholder using TDD

**Files:**
- Create: `src/App.test.tsx`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Write the failing component test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('introduces the lab and identifies the current milestone', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'SaaS Failure Lab' })).toBeInTheDocument()
    expect(screen.getByText('Repository foundation is ready.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

  Run: `npm test -- --run src/App.test.tsx`

  Expected: FAIL because `src/App.tsx` does not exist.

- [ ] **Step 3: Add the minimal application**

  Create an exported `App` component with a semantic `main`, the product heading and tagline, the exact milestone status asserted above, the four trust statements from the product design, and a link to the repository README. Mount it from `main.tsx`. Add responsive CSS with visible focus treatment and reduced-motion-safe global behavior.

- [ ] **Step 4: Run the component test and verify GREEN**

  Run: `npm test -- --run src/App.test.tsx`

  Expected: one passing test and no warnings.

### Task 3: Add the browser-level smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/home.spec.ts`

- [ ] **Step 1: Write the smoke test**

```ts
import { expect, test } from '@playwright/test'

test('renders the repository foundation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'SaaS Failure Lab' })).toBeVisible()
  await expect(page.getByText('Repository foundation is ready.')).toBeVisible()
})
```

- [ ] **Step 2: Configure Playwright against the production preview**

  Use Chromium, `http://127.0.0.1:4173`, and a web server command of `npm run preview -- --host 127.0.0.1`. CI must forbid focused tests and retain traces only on the first retry.

- [ ] **Step 3: Build, install Chromium, and run the smoke test**

  Run: `npm run build`, then `npx playwright install chromium`, then `npm run test:e2e`.

  Expected: production build exits 0 and the single browser test passes.

### Task 4: Add continuous integration and static deployment

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Add the CI workflow**

  On pushes and pull requests, use Node 22 with npm caching, run `npm ci`, install Playwright Chromium with dependencies, and run `format:check`, `lint`, `test`, `build`, and `test:e2e` in that order.

- [ ] **Step 2: Add the GitHub Pages workflow**

  On pushes to `main` and manual dispatch, grant only Pages/id-token permissions, run `npm ci` and `npm run build`, upload `dist`, and deploy it through the official Pages actions.

- [ ] **Step 3: Validate workflow syntax by inspection**

  Confirm action versions, permissions, branch trigger, working-directory assumptions, and that only `dist` is published.

### Task 5: Document the repository and verify all gates

**Files:**
- Create: `README.md`
- Create: `docs/architecture.md`

- [ ] **Step 1: Write the architectural README**

  Document product purpose, current M0 scope, prerequisites, exact local commands, static-build output, constraints, test layers, milestone boundary, and links to architecture/design/plan documentation.

- [ ] **Step 2: Record architecture decisions**

  Explain the static-client-only architecture, framework-independent future engine, build-time future scenario pipeline, minimal dependency policy, test strategy, static routing caveat deferred to M1, and why scenario validation is deferred to M2.

- [ ] **Step 3: Run formatting and repair generated files**

  Run: `npm run format`

  Expected: exit 0.

- [ ] **Step 4: Run every fresh acceptance gate**

  Run: `npm run format:check`, `npm run lint`, `npm test -- --run`, `npm run build`, and `npm run test:e2e`.

  Expected: every command exits 0 with no test failures or lint errors.

- [ ] **Step 5: Confirm static output and scope**

  Inspect `dist` and `git status --short`. Confirm `dist` contains only static assets and no Milestone 1+ implementation, backend, authentication, database, hosted AI, provider keys, scenario content, or scoring behavior was added.
