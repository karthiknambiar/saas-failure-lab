# Milestone 8 — Progress and Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist accepted completed diagnosis runs in browser-local storage and
provide an accessible progress dashboard with deterministic achievements and a
safe reset flow.

**Architecture:** A pure `src/progress` domain owns versioned record types,
untrusted-storage decoding, migrations, immutable updates, and all dashboard
derivations. A small browser adapter is the only `localStorage` boundary. React
loads typed progress once, persists an accepted completed submission once, and
renders the derived dashboard without encoding migration, scoring, or
achievement rules.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, React Testing
Library, Playwright, native browser `localStorage`.

---

## File structure

- Create: `src/progress/progress-types.ts` — persisted v1 types and safe
  completion input.
- Create: `src/progress/progress-codec.ts` — pure envelope serialization,
  parsing, version dispatch, and corruption recovery.
- Create: `src/progress/progress-codec.test.ts` — codec/migration/recovery
  tests.
- Create: `src/progress/progress-model.ts` — immutable record updates and pure
  summary/achievement derivations.
- Create: `src/progress/progress-model.test.ts` — update, duplicate, summary,
  and achievement tests.
- Create: `src/progress/browser-progress-storage.ts` — narrow `localStorage`
  adapter and result type.
- Create: `src/progress/browser-progress-storage.test.ts` — adapter failure,
  clear, and unrelated-key tests.
- Create: `src/features/progress/ProgressPage.tsx` — accessible progress
  dashboard and reset-confirmation presentation.
- Create: `src/features/progress/ProgressPage.test.tsx` — dashboard semantics,
  empty/populated states, achievements, notice, and reset interactions.
- Modify: `src/app/AppRoutes.tsx` — add `/progress` route.
- Modify: `src/app/AppShell.tsx` — add primary Progress navigation.
- Modify: `src/app/AppRoutes.test.tsx` and `src/app/AppShell.test.tsx` — route
  and navigation coverage.
- Modify: `src/features/investigation/InvestigationPage.tsx` — record a newly
  accepted terminal submission once, after existing engine submission.
- Modify: `src/features/investigation/InvestigationPage.test.tsx` — prove the
  completion integration is single-write and does not alter result/debrief
  flow.
- Modify: `src/design/global.css` — progress dashboard and reset layout only.
- Modify: `tests/e2e/investigation.spec.ts` or create
  `tests/e2e/progress.spec.ts` — production-preview persistence, reset, and
  narrow-mobile browser coverage.
- Modify: `README.md` and `docs/architecture.md` — document Milestone 8
  boundary and static local-only storage.

### Task 1: Define the pure versioned progress domain

**Files:**

- Create: `src/progress/progress-types.ts`
- Create: `src/progress/progress-codec.ts`
- Create: `src/progress/progress-codec.test.ts`

- [ ] **Step 1: Write failing codec tests**

```ts
import { describe, expect, it } from 'vitest'

import { decodeProgress, encodeProgress, emptyProgress } from './progress-codec'

describe('progress codec', () => {
  it('round-trips the current versioned envelope', () => {
    const progress = {
      version: 1 as const,
      completedRuns: [
        {
          scenarioId: 'iam-001',
          completedAt: 1_700_000_000_000,
          submittedHypothesisId: 'reporting-role-removed',
          score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
        },
      ],
    }

    expect(decodeProgress(encodeProgress(progress))).toEqual({
      progress,
      recovered: false,
    })
  })

  it.each([undefined, '', '{not json}', '{"version":99}'])(
    'recovers safely from %j',
    (raw) => {
      expect(decodeProgress(raw)).toEqual({
        progress: emptyProgress(),
        recovered: raw !== undefined,
      })
    },
  )
})
```

- [ ] **Step 2: Run the codec test to verify it fails**

Run: `npx vitest run src/progress/progress-codec.test.ts`

Expected: FAIL because the progress modules do not exist.

- [ ] **Step 3: Add current persisted types and codec implementation**

```ts
export interface ProgressScore {
  total: number
  diagnosisPoints: number
  evidencePoints: number
}

export interface CompletedRun {
  scenarioId: string
  completedAt: number
  submittedHypothesisId: string
  score: ProgressScore
}

export interface ProgressV1 {
  version: 1
  completedRuns: CompletedRun[]
}

export type Progress = ProgressV1
```

Use explicit object/array/type guards in `decodeProgress(raw?: string)`. Accept
only v1 runs with non-empty string IDs, finite non-negative timestamps, and
finite scores inside `total: 0..100`, `diagnosisPoints: 0..70`, and
`evidencePoints: 0..30`, where total equals the components. Return fresh
objects. `emptyProgress()` returns `{ version: 1, completedRuns: [] }`.
`encodeProgress(progress)` returns `JSON.stringify(progress)`. For an absent
key, return `{ progress: emptyProgress(), recovered: false }`; for malformed,
invalid, or unsupported data return a fresh empty state and `recovered: true`.
Keep a migration dispatcher from `unknown` version to v1, even though version
1 currently returns a validated copy and every other version recovers.

- [ ] **Step 4: Add invariant tests**

Add cases proving a wrong component sum, a non-array run list, a non-finite
timestamp, and a future version recover rather than throw. Assert decoded
objects can be mutated without changing a later `decodeProgress` call.

- [ ] **Step 5: Run focused checks**

Run: `npx vitest run src/progress/progress-codec.test.ts && npx tsc -b`

Expected: PASS.

- [ ] **Step 6: Commit the domain schema and codec**

```bash
git add src/progress/progress-types.ts src/progress/progress-codec.ts src/progress/progress-codec.test.ts
git commit -m "feat(progress): add versioned progress codec"
```

### Task 2: Derive records, summaries, and achievements without React

**Files:**

- Create: `src/progress/progress-model.ts`
- Create: `src/progress/progress-model.test.ts`

- [ ] **Step 1: Write failing model tests**

```ts
import { describe, expect, it } from 'vitest'

import { recordCompletedRun, getProgressSummary } from './progress-model'
import { emptyProgress } from './progress-codec'

describe('progress model', () => {
  it('adds an accepted run immutably and rejects its duplicate key', () => {
    const first = recordCompletedRun(emptyProgress(), {
      scenarioId: 'iam-001',
      completedAt: 10,
      submittedHypothesisId: 'reporting-role-removed',
      score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
    })
    const second = recordCompletedRun(first, first.completedRuns[0])

    expect(first).not.toBe(emptyProgress())
    expect(second).toBe(first)
    expect(first.completedRuns).toHaveLength(1)
  })

  it('derives summaries and achievements from runs', () => {
    const summary = getProgressSummary({
      version: 1,
      completedRuns: [
        {
          scenarioId: 'iam-001',
          completedAt: 1,
          submittedHypothesisId: 'reporting-role-removed',
          score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
        },
        {
          scenarioId: 'fnd-001',
          completedAt: 2,
          submittedHypothesisId: 'forecasting-entitlement-missing',
          score: { total: 70, diagnosisPoints: 70, evidencePoints: 0 },
        },
      ],
    })

    expect(summary.completedScenarioCount).toBe(2)
    expect(summary.averageScore).toBe(85)
    expect(summary.achievements.filter((item) => item.unlocked)).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run the model test to verify it fails**

Run: `npx vitest run src/progress/progress-model.test.ts`

Expected: FAIL because the model module does not exist.

- [ ] **Step 3: Implement immutable update and deterministic views**

```ts
export function recordCompletedRun(
  progress: Progress,
  run: CompletedRun,
): Progress {
  const duplicate = progress.completedRuns.some(
    (existing) =>
      existing.scenarioId === run.scenarioId &&
      existing.completedAt === run.completedAt,
  )
  if (duplicate) return progress
  return {
    ...progress,
    completedRuns: [...progress.completedRuns, copyRun(run)],
  }
}
```

Define `getProgressSummary(progress, playableScenarios)` with a typed view
containing sorted recent runs, completed distinct-scenario count, average score
rounded to the nearest integer, best score, scenario cards, and three
achievement views. Sort recent runs by newest completion first; choose each
scenario card's highest total score. Define the three achievement IDs and
criteria in this module: at least one run, at least one 100 total, and at least
two distinct scenario IDs. Return fresh arrays and nested objects; never
persist achievements independently.

- [ ] **Step 4: Add thorough model tests**

Cover empty summaries, repeated runs for one scenario, tie behavior, newest
first order, immutable input, and each achievement's locked/unlocked boundary.
Pass a small local playable-scenario fixture so the test asserts a not-yet-run
scenario receives `completed: false` and no best score.

- [ ] **Step 5: Run focused checks**

Run: `npx vitest run src/progress/progress-model.test.ts && npx tsc -b`

Expected: PASS.

- [ ] **Step 6: Commit model behavior**

```bash
git add src/progress/progress-model.ts src/progress/progress-model.test.ts
git commit -m "feat(progress): derive summaries and achievements"
```

### Task 3: Isolate browser storage and completion recording

**Files:**

- Create: `src/progress/browser-progress-storage.ts`
- Create: `src/progress/browser-progress-storage.test.ts`
- Modify: `src/features/investigation/InvestigationPage.tsx`
- Modify: `src/features/investigation/InvestigationPage.test.tsx`

- [ ] **Step 1: Write failing adapter and integration tests**

```ts
it('returns empty progress with a recoverable notice when storage throws', () => {
  const storage = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    },
  }
  expect(loadBrowserProgress(storage).progress).toEqual(emptyProgress())
  expect(loadBrowserProgress(storage).notice).toBe('unavailable')
})

it('records the accepted completed diagnosis once', async () => {
  // complete the existing IAM flow, submit once, and assert one saved run
})
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npx vitest run src/progress/browser-progress-storage.test.ts src/features/investigation/InvestigationPage.test.tsx`

Expected: FAIL because the adapter and completion side effect do not exist.

- [ ] **Step 3: Implement the narrow storage adapter**

```ts
export const PROGRESS_STORAGE_KEY = 'saas-failure-lab.progress'

export function loadBrowserProgress(storage: Storage = window.localStorage) {
  try {
    const decoded = decodeProgress(
      storage.getItem(PROGRESS_STORAGE_KEY) ?? undefined,
    )
    return {
      progress: decoded.progress,
      notice: decoded.recovered ? ('recovered' as const) : undefined,
    }
  } catch {
    return { progress: emptyProgress(), notice: 'unavailable' as const }
  }
}
```

Add `saveBrowserProgress(progress, storage)` and `clearBrowserProgress(storage)`.
They return `{ ok: true }` or `{ ok: false, notice: 'unavailable' }`, catch
only storage access/serialization failures, and call no React APIs. Tests must
prove `clear` removes only `PROGRESS_STORAGE_KEY`, preserving an unrelated
key.

- [ ] **Step 4: Connect one accepted submission to storage**

In `InvestigationPage`, keep progress loading/writing behind a feature-local
helper or hook. When `controller.submitDiagnosis()` returns true and the next
state is terminal, build a `CompletedRun` from the completed safe result
selector and current timestamp, merge it with loaded progress, and best-effort
save it. Use a `useRef` keyed by the run's scenario ID and completion timestamp
to prevent a React re-render from recording a duplicate. Do not change the
engine command, score calculation, completed UI, or active-game selectors.

- [ ] **Step 5: Make integration tests deterministic**

Inject the adapter or a typed storage dependency into the smallest feature
boundary needed by tests. Assert a valid terminal completion writes exact safe
score and hypothesis fields once; assert an unsuccessful/invalid submission
writes nothing; assert a failed write leaves the completed result usable.

- [ ] **Step 6: Run focused checks**

Run: `npx vitest run src/progress/browser-progress-storage.test.ts src/features/investigation/InvestigationPage.test.tsx && npx tsc -b`

Expected: PASS.

- [ ] **Step 7: Commit storage integration**

```bash
git add src/progress src/features/investigation/InvestigationPage.tsx src/features/investigation/InvestigationPage.test.tsx
git commit -m "feat(progress): persist completed diagnosis runs"
```

### Task 4: Add dashboard route, accessible presentation, and reset

**Files:**

- Create: `src/features/progress/ProgressPage.tsx`
- Create: `src/features/progress/ProgressPage.test.tsx`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/app/AppRoutes.test.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/design/global.css`

- [ ] **Step 1: Write failing dashboard and route tests**

```tsx
it('renders an accessible empty dashboard with a scenario-browser link', () => {
  render(<ProgressPage progress={emptyProgress()} onReset={vi.fn()} />)
  expect(screen.getByRole('heading', { name: 'Your progress' })).toBeVisible()
  expect(
    screen.getByRole('link', { name: 'Browse scenarios' }),
  ).toHaveAttribute('href', '/scenarios')
})

it('requires confirmation before reset', async () => {
  const reset = vi.fn()
  render(<ProgressPage progress={populatedProgress} onReset={reset} />)
  await userEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
  expect(reset).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Confirm reset' }))
  expect(reset).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run dashboard and route tests to verify failure**

Run: `npx vitest run src/features/progress/ProgressPage.test.tsx src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx`

Expected: FAIL because no page, route, or Progress navigation exists.

- [ ] **Step 3: Implement typed dashboard presentation**

`ProgressPage` receives a typed summary, optional storage notice, and
`onReset`. Render a focusable `h1` named “Your progress”; an empty-state
section; populated summary using a definition list; recent runs using an
ordered list; scenario cards using an unordered list; and achievement cards
where each item exposes plain-text status and criteria. Render `notice` in a
non-blocking `role="status"` region. Use native buttons for reset, cancel, and
confirm. Confirmation replaces the initial reset action inline; cancellation
restores it. After confirmation, the owner clears storage, updates typed state
to `emptyProgress()`, and focuses either the success status or heading.

- [ ] **Step 4: Add route and shell ownership**

Add `<Route path="progress" element={<ProgressPageRoute />} />` beneath the
existing shell and `{ label: 'Progress', to: '/progress' }` to primary
navigation. `ProgressPageRoute` loads browser progress once, derives its view
using generated playable scenario metadata, clears only the app key on reset,
and owns the status/focus transition. Keep all storage parsing and achievement
derivation outside React.

- [ ] **Step 5: Add responsive styling only for the new feature**

Add scoped classes such as `.progress-page`, `.progress-summary`,
`.progress-scenarios`, `.achievement-list`, and `.reset-confirmation`. Reuse
existing token variables and card/button primitives. At 320px, cards stack,
long score labels wrap, and no fixed-width grid or horizontal scroll is added.

- [ ] **Step 6: Complete component coverage**

Assert populated summaries, one completed and one incomplete scenario card,
all locked/unlocked achievement text, recovery/unavailable notice, reset
cancel, reset confirm, and semantic list/definition-list usage. Assert route
rendering and `aria-current="page"` navigation behavior through the existing
router test helpers.

- [ ] **Step 7: Run focused checks**

Run: `npx vitest run src/features/progress/ProgressPage.test.tsx src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx && npx tsc -b`

Expected: PASS.

- [ ] **Step 8: Commit dashboard UI**

```bash
git add src/features/progress src/app/AppRoutes.tsx src/app/AppRoutes.test.tsx src/app/AppShell.tsx src/app/AppShell.test.tsx src/design/global.css
git commit -m "feat(progress): add dashboard and reset flow"
```

### Task 5: Verify persistence in a production preview and document the boundary

**Files:**

- Create: `tests/e2e/progress.spec.ts`
- Modify: `README.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: Write the failing browser test**

```ts
test('persists a completed run, shows it in progress, and resets it', async ({
  page,
}) => {
  await page.goto('/failure-lab/scenarios/iam-001')
  // Use existing semantic helpers to complete and submit IAM-001.
  await page.goto('/failure-lab/progress')
  await expect(
    page.getByRole('heading', { name: 'Your progress' }),
  ).toBeVisible()
  await expect(page.getByText('Completed scenarios')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Login works, feature does not')).toBeVisible()
  await page.getByRole('button', { name: 'Reset progress' }).click()
  await page.getByRole('button', { name: 'Confirm reset' }).click()
  await expect(page.getByText('No completed scenarios yet')).toBeVisible()
})
```

Add a 320px viewport test asserting the progress heading, reset action, and
achievement section are visible, page horizontal scroll width does not exceed
viewport width, and no workspace tabs are present.

- [ ] **Step 2: Run the new browser test to verify failure**

Run: `npx playwright test tests/e2e/progress.spec.ts`

Expected: FAIL before the completed-run persistence and progress route are in
place. If the default port is occupied, use an untracked temporary Playwright
config on port 4174, then remove it before committing.

- [ ] **Step 3: Document delivered and deferred behavior**

Update `README.md` and `docs/architecture.md` to say that Milestone 8 stores
versioned, browser-local completed-run progress; corrupted data safely recovers
to empty; progress does not synchronize or resume active sessions; and
export/import remains deferred. Preserve the no-backend/static-deployment
statement.

- [ ] **Step 4: Run all release gates**

Run:

```bash
npm run lint
npm run format:check
npm test
npm run validate:scenarios
npm run generate:scenarios -- --check
npm run build
npx playwright test
git diff --check
```

Expected: every command succeeds; generation leaves no tracked drift; the
production preview verifies browser-local reload persistence and reset.

- [ ] **Step 5: Commit verification and documentation**

```bash
git add tests/e2e/progress.spec.ts README.md docs/architecture.md
git commit -m "test(docs): verify milestone 8 progress"
```

## Plan self-review

- **Spec coverage:** Tasks 1 and 3 implement versioning, validation,
  migrations, corrupt-data recovery, and browser failures. Task 2 implements
  immutable progress updates and all three deterministic achievements. Task 4
  implements dashboard, navigation, accessibility, and reset. Task 5 proves
  reload persistence/mobile behavior and documents explicit exclusions.
- **Placeholder scan:** The plan contains no open placeholders or undefined
  future work. Browser-test comments point to existing IAM completion helpers;
  implementers must use the concrete current semantic locators rather than add
  hidden test-only product code.
- **Type consistency:** `Progress`, `CompletedRun`, `ProgressScore`,
  `emptyProgress`, `recordCompletedRun`, and `getProgressSummary` are defined
  before every later task that consumes them. The persisted score components
  match the existing completed diagnosis result exactly.
