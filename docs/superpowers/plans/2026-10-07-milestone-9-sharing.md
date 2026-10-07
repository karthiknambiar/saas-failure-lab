# Milestone 9 — Sharing and Daily Incident Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let learners share a completed scenario's exact variation using a
browser-generated card and provide a deterministic global-UTC Daily Incident.

**Architecture:** Pure share and daily modules build safe public payloads,
parse seed inputs, and derive deterministic daily challenges. A browser adapter
owns optional native share, clipboard, Canvas, Blob, and download APIs. React
renders safe views, routes seeded challenges, and invokes the adapter only
after terminal completion.

**Tech Stack:** React 19, TypeScript, React Router, Vite static assets,
Canvas/Blob/browser sharing APIs, Vitest, React Testing Library, Playwright.

---

## File structure

- Create: `src/sharing/share-types.ts` — safe challenge payload and browser
  action result types.
- Create: `src/sharing/share-link.ts` — pure base-path-aware URL build/parse
  helpers.
- Create: `src/sharing/share-link.test.ts` — URL normalization and safe-payload
  tests.
- Create: `src/sharing/daily-incident.ts` — pure UTC date and eligible-scenario
  selection.
- Create: `src/sharing/daily-incident.test.ts` — deterministic daily tests.
- Create: `src/sharing/browser-share.ts` — browser-only native share, clipboard,
  Canvas PNG, object-URL, and download adapter.
- Create: `src/sharing/browser-share.test.ts` — fake browser API and cleanup
  tests.
- Create: `src/features/sharing/ShareChallengePanel.tsx` — completion-only
  accessible preview and actions.
- Create: `src/features/sharing/ShareChallengePanel.test.tsx` — interaction and
  safe-rendering tests.
- Create: `src/features/daily/DailyIncidentPage.tsx` — accessible daily route.
- Create: `src/features/daily/DailyIncidentPage.test.tsx` — UTC/daily-page
  tests.
- Modify: `src/features/investigation/load-investigation.ts` and `.test.ts` —
  optional supplied seed and invalid-seed recovery.
- Modify: `src/features/investigation/InvestigationPage.tsx` and `.test.tsx` —
  read search seed and provide completed-run data to sharing UI.
- Modify: `src/features/investigation/DiagnosisResult.tsx` and `DebriefPage.tsx`
  with tests — mount only the completed share panel.
- Modify: `src/app/AppRoutes.tsx`, `src/app/AppRoutes.test.tsx`, `src/app/AppShell.tsx`,
  and `src/app/AppShell.test.tsx` — Daily route and primary navigation.
- Modify: `src/design/global.css` — scoped responsive share/daily styles.
- Create: `tests/e2e/sharing.spec.ts` — production-preview seeded share/daily
  browser coverage.
- Modify: `README.md` and `docs/architecture.md` — document local-only sharing.

### Task 1: Build pure share links and Daily Incident selection

**Files:**

- Create: `src/sharing/share-types.ts`
- Create: `src/sharing/share-link.ts`
- Create: `src/sharing/share-link.test.ts`
- Create: `src/sharing/daily-incident.ts`
- Create: `src/sharing/daily-incident.test.ts`

- [ ] **Step 1: Write failing share-link and daily tests**

```ts
import { describe, expect, it } from 'vitest'

import { buildChallengeLink, parseChallengeSeed } from './share-link'
import { getDailyIncident } from './daily-incident'

describe('challenge links', () => {
  it('builds a base-path-aware same-variation URL', () => {
    expect(
      buildChallengeLink({
        baseUrl: '/failure-lab/',
        scenarioId: 'iam-001',
        seed: 'shared variation',
      }),
    ).toBe('/failure-lab/scenarios/iam-001?seed=shared+variation')
  })

  it('normalizes a valid seed and rejects invalid input', () => {
    expect(parseChallengeSeed('  shared  ')).toEqual({ seed: 'shared' })
    expect(parseChallengeSeed('   ')).toEqual({ error: 'invalid_seed' })
  })
})

describe('daily incident', () => {
  it('selects reproducibly from UTC date and playable scenarios', () => {
    const playable = [{ id: 'iam-001' }, { id: 'fnd-001' }]
    expect(getDailyIncident('2026-10-07', playable)).toEqual(
      getDailyIncident('2026-10-07', playable),
    )
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run src/sharing/share-link.test.ts src/sharing/daily-incident.test.ts`

Expected: FAIL because the sharing modules do not exist.

- [ ] **Step 3: Define safe domain types and link helpers**

```ts
export interface ChallengeLinkInput {
  baseUrl: string
  scenarioId: string
  seed: string
}

export interface ShareChallengePayload {
  scenarioId: string
  scenarioVersion: number
  seed: string
  title: string
  score: { total: number; diagnosisPoints: number; evidencePoints: number }
  challengeUrl: string
}

export interface CompletedShareSource {
  score: { total: number; diagnosisPoints: number; evidencePoints: number }
}
```

`buildChallengeLink` must normalize the seed with `normalizeSeed`, strip the
trailing slash from the Vite base URL except root, encode it through
`URLSearchParams`, and return a relative app URL. `parseChallengeSeed` accepts
`string | null`, returns `{ seed }` for a normalized valid value, `{ seed:
undefined }` for missing, and `{ error: 'invalid_seed' }` for any
`InvalidSeedError`. Do not parse scenario content or expose solution data.

Add `createShareChallengePayload(instance, completed: CompletedShareSource, baseUrl)` which
copies only public instance ID/version/composition seed/title and the existing
completed score values. Assert the returned object has no root cause, evidence,
debrief, bookmark, action-history, or full scenario fields.

- [ ] **Step 4: Implement deterministic Daily Incident**

```ts
export interface DailyPlayableScenario {
  id: string
  version: number
  title: string
}

export interface DailyIncident {
  utcDate: string
  scenarioId: string
  seed: string
}

export function getDailyIncident(
  utcDate: string,
  scenarios: readonly DailyPlayableScenario[],
): DailyIncident | undefined
```

Require exactly `YYYY-MM-DD`, reject invalid calendar dates with a clear plain
`Error`, and return `undefined` for no eligible scenarios. Reuse the existing
stable seed/hash behavior by calling `deriveSeed` or an explicitly exported
stable wrapper with fixed documented dimensions. Select index in supplied
eligible order; derive a printable variation seed from date and selected ID.
Expose `getUtcCalendarDate(date: Date): string` using UTC getters only.

- [ ] **Step 5: Add invariant coverage**

Test root and `/failure-lab/` base paths, URL escaping, 128-character and
overlong seeds, missing/invalid seed distinction, payload defensive copies,
no-hidden-key serialization, repeated daily calls, date rollover across UTC
midnight, eligible-list order, invalid date, and empty eligibility.

- [ ] **Step 6: Run focused checks**

Run: `npx vitest run src/sharing/share-link.test.ts src/sharing/daily-incident.test.ts && npx tsc -b`

Expected: PASS.

- [ ] **Step 7: Commit pure sharing behavior**

```bash
git add src/sharing/share-types.ts src/sharing/share-link.ts src/sharing/share-link.test.ts src/sharing/daily-incident.ts src/sharing/daily-incident.test.ts
git commit -m "feat(sharing): add seeded links and daily selection"
```

### Task 2: Add the isolated browser sharing and PNG adapter

**Files:**

- Create: `src/sharing/browser-share.ts`
- Create: `src/sharing/browser-share.test.ts`

- [ ] **Step 1: Write failing browser-adapter tests**

```ts
it('falls back as unavailable when native sharing is absent', async () => {
  await expect(shareChallenge(payload, { navigator: {} })).resolves.toEqual({
    ok: false,
    reason: 'unavailable',
  })
})

it('revokes the object URL after downloading a PNG', async () => {
  const environment = createFakeShareEnvironment()
  await expect(downloadShareCard(payload, environment)).resolves.toEqual({
    ok: true,
  })
  expect(environment.url.revokeObjectURL).toHaveBeenCalledWith('blob:card')
})
```

- [ ] **Step 2: Run adapter tests to verify they fail**

Run: `npx vitest run src/sharing/browser-share.test.ts`

Expected: FAIL because the adapter module does not exist.

- [ ] **Step 3: Implement browser capability injection and actions**

Define structural interfaces for navigator share, clipboard, Canvas 2D context,
document anchor creation, Blob, and object URLs. Do not access browser globals
at module evaluation; resolve defaults only inside action functions. Export:

```ts
export async function shareChallenge(
  payload: ShareChallengePayload,
  environment?: ShareEnvironment,
): Promise<ShareActionResult>

export async function copyChallengeLink(
  payload: ShareChallengePayload,
  environment?: ShareEnvironment,
): Promise<ShareActionResult>

export async function downloadShareCard(
  payload: ShareChallengePayload,
  environment?: ShareEnvironment,
): Promise<ShareActionResult>
```

`shareChallenge` invokes `navigator.share({ title, text, url })` with public
payload text only. `copyChallengeLink` calls clipboard `writeText` with the
exact URL. Both catch rejection and return `{ ok:false, reason:'failed' }`;
missing capability returns `unavailable`.

Canvas rendering uses fixed dimensions, system font strings, wrapped public
title, completion wording, safe score text, and same-variation prompt. Export
pure `getShareCardInstructions(payload)` so rendering can be tested without a
real canvas. Convert canvas to PNG Blob, create an object URL, click a detached
anchor with deterministic filename `saas-failure-lab-<scenarioId>.png`, remove
it, and revoke the URL in `finally`.

- [ ] **Step 4: Add adapter test matrix**

Cover native share success/rejection/absence, clipboard success/rejection/
absence, fixed instruction content with no hidden keys, canvas/context/blob
failure, download click/remove, URL revocation on success and failure, and
non-mutation of payload. Assert no network APIs are called.

- [ ] **Step 5: Run focused checks**

Run: `npx vitest run src/sharing/browser-share.test.ts && npx tsc -b`

Expected: PASS.

- [ ] **Step 6: Commit adapter**

```bash
git add src/sharing/browser-share.ts src/sharing/browser-share.test.ts
git commit -m "feat(sharing): add browser share-card adapter"
```

### Task 3: Support seeded investigation routes and Daily navigation

**Files:**

- Modify: `src/features/investigation/load-investigation.ts`
- Modify: `src/features/investigation/load-investigation.test.ts`
- Modify: `src/features/investigation/InvestigationPage.tsx`
- Modify: `src/features/investigation/InvestigationPage.test.tsx`
- Create: `src/features/daily/DailyIncidentPage.tsx`
- Create: `src/features/daily/DailyIncidentPage.test.tsx`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/app/AppRoutes.test.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`

- [ ] **Step 1: Write failing route tests**

```tsx
it('composes the exact supplied seeded variation', () => {
  const result = loadInvestigationScenario(
    'iam-001',
    scenarioCatalog,
    ' shared ',
  )
  expect(result).toMatchObject({ available: true })
  if (result.available) expect(result.instance.composition.seed).toBe('shared')
})

it('renders a safe recovery for an invalid seed query', () => {
  renderRoute('/scenarios/iam-001?seed=%20%20')
  expect(
    screen.getByRole('heading', { name: 'Invalid challenge link' }),
  ).toBeVisible()
})
```

- [ ] **Step 2: Run route tests to verify failure**

Run: `npx vitest run src/features/investigation/load-investigation.test.ts src/features/investigation/InvestigationPage.test.tsx src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx`

Expected: FAIL because seeded query and Daily route are not implemented.

- [ ] **Step 3: Thread validated search seed into the loader**

Extend `loadInvestigationScenario(scenarioId, catalog?, suppliedSeed?)` without
breaking existing canonical callers. It must use canonical seed when supplied
seed is undefined, compose a normalized valid supplied seed, and return a new
`reason: 'invalid_seed'` unavailable result when normalization fails.

In `InvestigationPage`, read only `useSearchParams().get('seed')`, pass it to
the loader, and render a safe `ScenarioRecovery` heading “Invalid challenge
link” with Browse scenarios link for `invalid_seed`. No seed is persisted or
added to active engine state beyond normal `ScenarioInstance.composition.seed`.

- [ ] **Step 4: Implement Daily Incident page and app routes**

`DailyIncidentPage` receives injectable date/eligible-scenarios dependencies
for tests; production defaults derive UTC date from `new Date()` at route render
and use the same playable allowlist as investigations. Render focusable `h1`
“Daily Incident”, visible UTC date text, “Everyone receives the same daily
incident worldwide.”, selected public title, and a normal `ActionLink` to the
seeded scenario URL. Render an unavailable state when no eligible scenario
exists.

Add `/daily` under `AppShell` and `{ label: 'Daily', to: '/daily' }` to primary
navigation. Test `aria-current="page"`, direct route rendering, focus, UTC
copy, exact seeded href, and no eligible state.

- [ ] **Step 5: Run focused checks**

Run: `npx vitest run src/features/investigation/load-investigation.test.ts src/features/investigation/InvestigationPage.test.tsx src/features/daily/DailyIncidentPage.test.tsx src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx && npx tsc -b`

Expected: PASS.

- [ ] **Step 6: Commit seeded routes and Daily Incident**

```bash
git add src/features/investigation/load-investigation.ts src/features/investigation/load-investigation.test.ts src/features/investigation/InvestigationPage.tsx src/features/investigation/InvestigationPage.test.tsx src/features/daily src/app/AppRoutes.tsx src/app/AppRoutes.test.tsx src/app/AppShell.tsx src/app/AppShell.test.tsx
git commit -m "feat(sharing): add seeded challenges and daily route"
```

### Task 4: Render completed-only sharing actions and preview

**Files:**

- Create: `src/features/sharing/ShareChallengePanel.tsx`
- Create: `src/features/sharing/ShareChallengePanel.test.tsx`
- Modify: `src/features/investigation/DiagnosisResult.tsx`
- Modify: `src/features/investigation/DiagnosisResult.test.tsx`
- Modify: `src/features/investigation/DebriefPage.tsx`
- Modify: `src/features/investigation/DebriefPage.test.tsx`
- Modify: `src/features/investigation/InvestigationPage.tsx`
- Modify: `src/features/investigation/InvestigationPage.test.tsx`
- Modify: `src/design/global.css`

- [ ] **Step 1: Write failing completed-only panel tests**

```tsx
it('renders only safe preview data and copies the exact challenge URL', async () => {
  const copy = vi.fn().mockResolvedValue({ ok: true })
  render(<ShareChallengePanel payload={payload} actions={{ copy }} />)
  expect(
    screen.getByText(
      'This link lets others attempt the same scenario variation.',
    ),
  ).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: 'Copy challenge link' }),
  )
  expect(copy).toHaveBeenCalledWith(payload)
  expect(screen.getByRole('status')).toHaveTextContent('Challenge link copied.')
})
```

- [ ] **Step 2: Run component tests to verify failure**

Run: `npx vitest run src/features/sharing/ShareChallengePanel.test.tsx src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/DebriefPage.test.tsx`

Expected: FAIL because no panel is rendered.

- [ ] **Step 3: Implement presentation-only panel**

`ShareChallengePanel` accepts `ShareChallengePayload` and injected action
functions. Render heading “Share this challenge”, public title, “Completed
challenge”, text-readable total/100 and component scores, exact same-variation
statement, and native buttons: “Share challenge”, “Copy challenge link”, and
“Download share card”. Each action awaits its adapter result and updates a
`role="status"` message using a finite copy table for success/unavailable/
failed states. The panel receives no `ScenarioInstance`, debrief, evidence,
root cause, or storage data.

In `PlayableInvestigation`, create payload only in terminal completed rendering
using the existing completed-only `getDebriefView(instance, state).score`,
`instance`, `import.meta.env.BASE_URL`, and share domain helper. Immediately
pass only the resulting payload to the result and debrief views; do not pass a
debrief model to the share panel. Pass the same payload to the result and debrief views;
do not compute it during intro/active/ready states. Mount the panel from result
and debrief so users can share after completion from either view. Do not alter
existing completion controls.

- [ ] **Step 4: Add accessibility and boundary tests**

Assert no panel exists before submit or on recovery routes; result/debrief show
the panel; all three controls are native buttons; every browser outcome has
clear status text; safe preview serialization excludes prohibited key names;
the card wraps/stacks at 320px; and debrief/result navigation retains the same
payload URL.

- [ ] **Step 5: Add scoped CSS**

Use `.share-challenge`, `.share-challenge__preview`, and
`.share-challenge__actions` with existing tokens. Actions wrap; long seeded
URLs never force overflow; mobile uses one column. Do not style Canvas or fetch
external assets.

- [ ] **Step 6: Run focused checks**

Run: `npx vitest run src/features/sharing/ShareChallengePanel.test.tsx src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/DebriefPage.test.tsx src/features/investigation/InvestigationPage.test.tsx && npx tsc -b`

Expected: PASS.

- [ ] **Step 7: Commit completed sharing UI**

```bash
git add src/features/sharing src/features/investigation/DiagnosisResult.tsx src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/DebriefPage.tsx src/features/investigation/DebriefPage.test.tsx src/features/investigation/InvestigationPage.tsx src/features/investigation/InvestigationPage.test.tsx src/design/global.css
git commit -m "feat(sharing): add completed challenge sharing"
```

### Task 5: Verify static-browser behavior and document the boundary

**Files:**

- Create: `tests/e2e/sharing.spec.ts`
- Modify: `README.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: Write failing production-preview E2E coverage**

```ts
test('shares the completed exact challenge variation without answer data', async ({
  page,
}) => {
  await completeIamScenario(page)
  await page.getByRole('button', { name: 'Copy challenge link' }).click()
  await expect(page.getByRole('status')).toHaveText(/copied/i)
  await expect(page.getByText(/same scenario variation/i)).toBeVisible()
})

test('loads the Daily Incident under the GitHub Pages base path', async ({
  page,
}) => {
  await page.goto('/failure-lab/daily')
  await expect(
    page.getByRole('heading', { name: 'Daily Incident' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /start daily incident/i }),
  ).toHaveAttribute('href', /seed=/)
})
```

Stub `navigator.clipboard`, `navigator.share`, Canvas, Blob/object URLs, and
anchor click through `page.addInitScript` so tests prove browser-action status
without a real platform sheet/download. Add a direct seeded `/failure-lab/
scenarios/iam-001?seed=...` request and assert its composed introductory
customer/timestamp variation differs deterministically from canonical when
appropriate, while invalid seed yields recovery. Add 320px share/daily
overflow and no-workspace assertion.

- [ ] **Step 2: Run E2E to verify failure before completed implementation**

Run: `npx playwright test tests/e2e/sharing.spec.ts`

Expected: FAIL before the new share and Daily UI are available. If port 4173 is
occupied, create an untracked temporary port-4174 Playwright config with
`apply_patch`, use it for the test, then remove it with `apply_patch` before
committing.

- [ ] **Step 3: Update user-facing documentation**

Document that sharing is generated entirely in the browser after completion;
links reproduce exact scenario variation but contain no solutions; Daily uses
one global UTC challenge; and no server, account, tracking, or social API is
used. State that Canvas PNG generation is local and browser-dependent actions
fall back safely.

- [ ] **Step 4: Run release gates**

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

Expected: all commands pass. Run Chromium with escalation if sandbox launch
returns `spawn EPERM`; retain no temporary config or generated artifact.

- [ ] **Step 5: Commit browser proof and docs**

```bash
git add tests/e2e/sharing.spec.ts README.md docs/architecture.md
git commit -m "test(docs): verify milestone 9 sharing"
```

## Plan self-review

- **Spec coverage:** Tasks 1–2 implement pure public links, safe payloads,
  deterministic UTC daily selection, and browser-only image/share actions.
  Task 3 implements seeded and Daily routes. Task 4 restricts sharing to
  terminal UI with accessible feedback. Task 5 proves static base-path/mobile
  behavior and records the delivered boundary.
- **Placeholder scan:** Every implementation and test step includes concrete
  files, functions, data shapes, or commands. Browser fakes are explicit
  injected APIs, not test-only product paths.
- **Type consistency:** `ShareChallengePayload` originates in Task 1 and is
  the only payload consumed by Tasks 2 and 4. `DailyPlayableScenario` and
  `DailyIncident` are defined by Task 1 before Task 3 consumes them.
