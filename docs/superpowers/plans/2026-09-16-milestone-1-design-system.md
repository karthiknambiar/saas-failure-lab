# Milestone 1 Design System and Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an accessible, responsive SaaS Failure Lab application shell with clean static routes, reusable UI primitives, a polished landing page, and an intentionally inactive scenario-browser shell.

**Architecture:** React Router owns clean client-side routes beneath a Vite-provided deployment basename. Pages compose small semantic UI primitives, while design tokens and global CSS own the approved calm operational/encouraging learning direction. A tested post-build script creates the GitHub Pages SPA fallback without adding a runtime server.

**Tech Stack:** React 19, TypeScript, Vite, React Router, Vitest, React Testing Library, Playwright, CSS custom properties, GitHub Pages.

---

### Task 1: Add static-safe routing infrastructure

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `vite.config.ts`
- Create: `scripts/create-spa-fallback.mjs`
- Create: `scripts/create-spa-fallback.test.mjs`
- Create: `src/app/routing.ts`
- Create: `src/app/routing.test.ts`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Install React Router**

Run: `npm install react-router-dom`

Expected: exit 0; `react-router-dom` appears under runtime dependencies and the lockfile changes.

- [ ] **Step 2: Write failing tests for deployment-path normalization**

```ts
import { describe, expect, it } from 'vitest'
import { getRouterBasename } from './routing'

describe('getRouterBasename', () => {
  it('uses no basename for a root deployment', () => {
    expect(getRouterBasename('/')).toBeUndefined()
  })

  it('removes the trailing slash from a repository deployment path', () => {
    expect(getRouterBasename('/saas-failure-lab/')).toBe('/saas-failure-lab')
  })
})
```

Run: `npm test -- --run src/app/routing.test.ts`

Expected: FAIL because `src/app/routing.ts` does not exist.

- [ ] **Step 3: Implement deployment-path normalization**

```ts
export function getRouterBasename(baseUrl: string): string | undefined {
  return baseUrl === '/' ? undefined : baseUrl.replace(/\/$/, '')
}
```

Run: `npm test -- --run src/app/routing.test.ts`

Expected: two passing tests.

- [ ] **Step 4: Write the failing fallback-copy test**

```js
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createSpaFallback } from './create-spa-fallback.mjs'

test('copies index.html to 404.html', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'failure-lab-'))
  try {
    await writeFile(path.join(directory, 'index.html'), '<main>app</main>')
    await createSpaFallback(directory)
    assert.equal(
      await readFile(path.join(directory, '404.html'), 'utf8'),
      '<main>app</main>',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
```

Run: `node --test scripts/create-spa-fallback.test.mjs`

Expected: FAIL because the implementation module does not exist.

- [ ] **Step 5: Implement and wire the fallback builder**

```js
import { copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export async function createSpaFallback(outputDirectory) {
  await copyFile(
    path.join(outputDirectory, 'index.html'),
    path.join(outputDirectory, '404.html'),
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await createSpaFallback(path.resolve(process.argv[2] ?? 'dist'))
}
```

Update scripts:

```json
{
  "build": "tsc -b && vite build && node scripts/create-spa-fallback.mjs",
  "test": "node --test scripts/*.test.mjs && vitest run"
}
```

Update Vite:

```ts
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  // retain existing plugins and test settings
})
```

Add `.superpowers/` to `.gitignore`. In deployment, set `VITE_BASE_PATH: /${{ github.event.repository.name }}/` on the build step.

Run: `node --test scripts/create-spa-fallback.test.mjs && npm run build`

Expected: the Node test passes and `dist/index.html` equals `dist/404.html`.

- [ ] **Step 6: Commit routing infrastructure**

```sh
git add package.json package-lock.json .gitignore vite.config.ts scripts src/app/routing.ts src/app/routing.test.ts .github/workflows/deploy.yml
git commit -m "feat: add static-safe routing foundation"
```

### Task 2: Create semantic design-system primitives

**Files:**

- Create: `src/components/ActionLink.tsx`
- Create: `src/components/Badge.tsx`
- Create: `src/components/Button.tsx`
- Create: `src/components/Card.tsx`
- Create: `src/components/EvidencePanel.tsx`
- Create: `src/components/components.test.tsx`
- Create: `src/design/tokens.css`
- Create: `src/design/global.css`

- [ ] **Step 1: Write failing primitive tests**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ActionLink } from './ActionLink'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'
import { EvidencePanel } from './EvidencePanel'

describe('design-system primitives', () => {
  it('preserves native button and link semantics', () => {
    render(
      <MemoryRouter>
        <Button variant="primary">Begin</Button>
        <ActionLink to="/scenarios">Browse</ActionLink>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Begin' })).toHaveClass(
      'button--primary',
    )
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute(
      'href',
      '/scenarios',
    )
  })

  it('renders display and content surfaces without hidden controls', () => {
    render(
      <>
        <Badge>Beginner</Badge>
        <Card as="section">Card content</Card>
        <EvidencePanel title="Authentication events">
          Evidence content
        </EvidencePanel>
      </>,
    )
    expect(screen.getByText('Beginner')).not.toHaveAttribute('role', 'button')
    expect(
      screen.getByRole('region', { name: 'Authentication events' }),
    ).toBeInTheDocument()
  })
})
```

Run: `npm test -- --run src/components/components.test.tsx`

Expected: FAIL because the component modules do not exist.

- [ ] **Step 2: Implement the primitive APIs**

Implement:

```tsx
export type Emphasis = 'primary' | 'secondary'

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button--${variant} ${className}`.trim()}
      {...props}
    />
  )
}

export function ActionLink({
  variant = 'secondary',
  className = '',
  ...props
}: ActionLinkProps) {
  return (
    <Link
      className={`button button--${variant} ${className}`.trim()}
      {...props}
    />
  )
}
```

`Badge` renders a styled `span`; `Card` accepts `as: 'article' | 'section' | 'div'`; `EvidencePanel` uses `useId()` to connect its heading to a `role="region"` container.

Run: `npm test -- --run src/components/components.test.tsx`

Expected: two passing tests.

- [ ] **Step 3: Add approved visual tokens and global behavior**

Define tokens for background, raised surface, muted surface, strong/soft text, teal accent, warm learning accent, borders, focus ring, spacing, radii, shadows, and readable content widths. `global.css` must provide the reset, typography, button/link/card/badge/evidence styles, skip-link behavior, `:focus-visible`, responsive containers, coarse-pointer target sizing, and `prefers-reduced-motion` rules.

Use CSS custom properties exclusively for shared colors and dimensions. Do not add a theme switch or icon dependency.

Run: `npm run lint && npm run format:check`

Expected: both commands pass.

- [ ] **Step 4: Commit primitives**

```sh
git add src/components src/design
git commit -m "feat: add accessible design primitives"
```

### Task 3: Build the shell, routes, and pages test-first

**Files:**

- Create: `src/app/AppShell.tsx`
- Create: `src/app/AppRoutes.tsx`
- Create: `src/app/AppRouter.tsx`
- Create: `src/app/AppRoutes.test.tsx`
- Create: `src/pages/LandingPage.tsx`
- Create: `src/pages/HowItWorksPage.tsx`
- Create: `src/pages/NotFoundPage.tsx`
- Create: `src/features/browse/ScenarioBrowserPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/main.tsx`
- Delete: `src/styles.css`

- [ ] **Step 1: Write failing route and shell tests**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('application routes', () => {
  it.each([
    ['/', 'Practice the investigation before it is urgent.'],
    ['/scenarios', 'Browse troubleshooting scenarios'],
    ['/how-it-works', 'How an investigation works'],
  ])('renders %s', (path, heading) => {
    renderRoute(path)
    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it('renders recovery actions for unknown routes', () => {
    renderRoute('/missing')
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('renders labeled inactive scenario filters', () => {
    renderRoute('/scenarios')
    expect(
      screen.getByRole('searchbox', { name: 'Search scenarios' }),
    ).toBeDisabled()
    expect(screen.getByLabelText('Domain')).toBeDisabled()
    expect(screen.getByLabelText('Difficulty')).toBeDisabled()
    expect(screen.getByText(/filters become available/i)).toBeInTheDocument()
  })
})
```

Run: `npm test -- --run src/app/AppRoutes.test.tsx`

Expected: FAIL because `AppRoutes` does not exist.

- [ ] **Step 2: Implement the shell and route table**

`AppShell` contains the skip link, branded header, desktop `NavLink` list, native `details` mobile navigation, `<main id="main-content" tabIndex={-1}>`, `Outlet`, and footer.

```tsx
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="scenarios" element={<ScenarioBrowserPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter basename={getRouterBasename(import.meta.env.BASE_URL)}>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

`App` returns `<AppRouter />`; `main.tsx` imports `tokens.css` followed by `global.css`.

- [ ] **Step 3: Implement the landing and informational pages**

The landing page composes:

- hero kicker, approved H1, product promise, primary `/scenarios` action, secondary `/how-it-works` action
- four trust statements
- three-step investigation loop
- six domain cards using catalog-level names only
- contribution text pointing readers to repository documentation without a guessed remote URL

The how-it-works page presents the investigation loop and a fictional evidence-panel example that contains no scenario root cause. The not-found page provides home and scenario-browser links.

- [ ] **Step 4: Implement the inactive browser shell**

Render a page heading, description, disabled search input, disabled domain and difficulty selects, visible explanation linked with `aria-describedby`, and an empty state linking to `/how-it-works`.

Run: `npm test -- --run src/app/AppRoutes.test.tsx src/App.test.tsx`

Expected: all route and top-level application tests pass.

- [ ] **Step 5: Commit pages and routing**

```sh
git add src/app src/pages src/features src/App.tsx src/App.test.tsx src/main.tsx src/styles.css
git commit -m "feat: build responsive product shell"
```

### Task 4: Verify keyboard, mobile, and clean-route behavior in Chromium

**Files:**

- Modify: `tests/e2e/home.spec.ts`

- [ ] **Step 1: Replace the M0 smoke test with failing M1 journeys**

```ts
import { expect, test } from '@playwright/test'

test('navigates from the landing page to the scenario browser', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', {
      name: 'Practice the investigation before it is urgent.',
    }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Browse scenarios' }).first().click()
  await expect(page).toHaveURL(/\/scenarios$/)
  await expect(
    page.getByRole('heading', { name: 'Browse troubleshooting scenarios' }),
  ).toBeVisible()
})

test('supports skip navigation by keyboard', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to main content' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})

test('uses the mobile navigation disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByText('Menu', { exact: true }).click()
  await page.getByRole('link', { name: 'How it works' }).last().click()
  await expect(page).toHaveURL(/\/how-it-works$/)
})

test('renders a clean route directly', async ({ page }) => {
  await page.goto('/scenarios')
  await expect(
    page.getByRole('heading', { name: 'Browse troubleshooting scenarios' }),
  ).toBeVisible()
})
```

Run: `npm run test:e2e`

Expected: FAIL before the M1 shell exists; after Task 3, all four journeys pass.

- [ ] **Step 2: Inspect responsive behavior**

Use Playwright at 1280×800, 768×1024, and 320×700. Confirm no horizontal document overflow, both navigation modes switch at the intended breakpoint, focus remains visible, cards reflow, and disabled filters remain labeled.

- [ ] **Step 3: Commit browser coverage**

```sh
git add tests/e2e/home.spec.ts
git commit -m "test: cover shell navigation journeys"
```

### Task 5: Update documentation and run all acceptance gates

**Files:**

- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/superpowers/plans/2026-09-16-milestone-1-design-system.md`

- [ ] **Step 1: Document Milestone 1**

Update the README status, route list, static fallback behavior, and current limitations. Update architecture documentation with the React Router boundary, compiled basename, design-system ownership, and GitHub Pages fallback.

- [ ] **Step 2: Mark completed plan steps and format**

Change completed checkboxes to `[x]`, then run `npm run format`.

Expected: exit 0.

- [ ] **Step 3: Run clean-install and full verification**

Run in order:

```sh
npm ci
npm run format:check
npm run lint
npm test
npm run build
npm run test:e2e
```

Expected: every command exits 0; all Node, Vitest, and Playwright tests pass; `dist/index.html` and `dist/404.html` are identical.

- [ ] **Step 4: Audit milestone scope**

Inspect `git diff`, `git status`, dependency lists, and generated `dist`. Confirm no scenario YAML, Zod, gameplay state, scoring logic, localStorage, backend, authentication, database, AI integration, or secret keys were added.

- [ ] **Step 5: Commit documentation and final plan state**

```sh
git add README.md docs/architecture.md docs/superpowers/plans/2026-09-16-milestone-1-design-system.md
git commit -m "docs: record milestone one architecture"
```
