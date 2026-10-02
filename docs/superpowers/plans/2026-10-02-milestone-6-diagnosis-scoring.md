# Milestone 6 Diagnosis Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a final deterministic diagnosis-and-bookmarked-evidence submission flow for IAM-001 without answer-key disclosure, remediation, communication, efficiency, debrief, or persistence behavior.

**Architecture:** The pure engine gains a terminal submission command and private score result. A safe selector converts that result into a minimal React view model. The existing controller dispatches commands and resets the in-memory run; React only renders safe data.

**Tech Stack:** React 19, TypeScript, Vitest, React Testing Library, Playwright, Vite.

---

## File structure

- Modify `src/engine/investigation-state.ts` — completed status, submission command/action, internal submission state.
- Create `src/engine/diagnosis-scoring.ts` and test — pure 70/30 scoring.
- Modify engine and selector modules/tests — terminal transition and safe result projection.
- Modify investigation controller, page, ready checkpoint, and CSS — command wiring and result UI.
- Create `src/features/investigation/DiagnosisResult.tsx` and test.
- Modify E2E and docs — user-flow coverage and documented M6 boundary.

### Task 1: Pure diagnosis scoring

**Files:**
- Create: `src/engine/diagnosis-scoring.ts`
- Create: `src/engine/diagnosis-scoring.test.ts`

- [ ] **Step 1: Write failing score tests**

~~~ts
describe('scoreDiagnosis', () => {
  it('awards 70 diagnosis points and proportional evidence points', () => {
    expect(scoreDiagnosis({
      canonicalHypothesisId: 'cause',
      selectedHypothesisId: 'cause',
      criticalEvidenceIds: ['one', 'two', 'three'],
      bookmarkedEvidenceIds: ['one', 'three'],
    })).toEqual({ total: 90, diagnosisPoints: 70, evidencePoints: 20 })
  })

  it('awards evidence-only partial credit for an incorrect diagnosis', () => {
    expect(scoreDiagnosis({
      canonicalHypothesisId: 'cause',
      selectedHypothesisId: 'other',
      criticalEvidenceIds: ['one', 'two'],
      bookmarkedEvidenceIds: ['one', 'two'],
    })).toEqual({ total: 30, diagnosisPoints: 0, evidencePoints: 30 })
  })
})
~~~

- [ ] **Step 2: Run RED test**

Run: `npx vitest run src/engine/diagnosis-scoring.test.ts`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement a total, deterministic function**

~~~ts
export interface DiagnosisScoreInput {
  canonicalHypothesisId: string
  selectedHypothesisId: string
  criticalEvidenceIds: readonly string[]
  bookmarkedEvidenceIds: readonly string[]
}

export interface DiagnosisScore {
  total: number
  diagnosisPoints: number
  evidencePoints: number
}

export function scoreDiagnosis(input: DiagnosisScoreInput): DiagnosisScore {
  const diagnosisPoints =
    input.selectedHypothesisId === input.canonicalHypothesisId ? 70 : 0
  const critical = new Set(input.criticalEvidenceIds)
  const selected = new Set(input.bookmarkedEvidenceIds)
  const selectedCritical = [...critical].filter((id) => selected.has(id)).length
  const evidencePoints =
    critical.size === 0 ? 0 : Math.round((selectedCritical * 30) / critical.size)

  return { total: diagnosisPoints + evidencePoints, diagnosisPoints, evidencePoints }
}
~~~

Add deduplication, zero-critical, and rounding tests. Do not let UI code calculate any score.

- [ ] **Step 4: Run GREEN test**

Run: `npx vitest run src/engine/diagnosis-scoring.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/engine/diagnosis-scoring.ts src/engine/diagnosis-scoring.test.ts
git commit -m "feat(engine): score diagnosis submissions"
~~~

### Task 2: Terminal engine submission

**Files:**
- Modify: `src/engine/investigation-state.ts`
- Modify: `src/engine/investigation-engine.ts`
- Modify: `src/engine/investigation-engine.test.ts`

- [ ] **Step 1: Write failing transition tests**

Use the existing started-investigation fixture. Open/bookmark evidence, select a hypothesis, submit, and assert:

~~~ts
expect(completed.status).toBe('completed')
expect(completed.submission).toEqual({
  selectedHypothesisId: 'reporting-role-removed',
  score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
})
expect(completed.actions.at(-1)).toEqual({
  sequence: before.actions.length + 1,
  type: 'submit_diagnosis',
})
expect(before.status).toBe('investigating')
~~~

Also assert missing-hypothesis, intro-state, and post-completion commands throw an `InvestigationTransitionError` without input mutation.

- [ ] **Step 2: Run RED test**

Run: `npx vitest run src/engine/investigation-engine.test.ts`

Expected: FAIL because submission types and command are absent.

- [ ] **Step 3: Implement the transition**

In `investigation-state.ts` introduce:

~~~ts
export type InvestigationStatus = 'intro' | 'investigating' | 'completed'

export interface SubmitDiagnosisAction {
  sequence: number
  type: 'submit_diagnosis'
}

export interface DiagnosisSubmission {
  selectedHypothesisId: string
  score: DiagnosisScore
}
~~~

Add `submission?: DiagnosisSubmission` to state, `submit_diagnosis` to commands, `SubmitDiagnosisAction` to actions, and `MISSING_HYPOTHESIS` to error codes.

In the engine, require investigating status and a selected hypothesis. Collect the scenario root-cause ID and critical evidence IDs only inside the engine, call `scoreDiagnosis`, append the action, and return a new `completed` state. Existing `requireInvestigating` must reject every active command after completion.

- [ ] **Step 4: Run GREEN tests**

Run: `npx vitest run src/engine/diagnosis-scoring.test.ts src/engine/investigation-engine.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/engine/investigation-state.ts src/engine/investigation-engine.ts src/engine/investigation-engine.test.ts src/engine/diagnosis-scoring.ts src/engine/diagnosis-scoring.test.ts
git commit -m "feat(engine): finalize diagnosis submissions"
~~~

### Task 3: Safe completion-result selector

**Files:**
- Modify: `src/engine/investigation-selectors.ts`
- Modify: `src/engine/investigation-selectors.test.ts`

- [ ] **Step 1: Write failing selector tests**

~~~ts
const view = getDiagnosisResultView(instance, completed)

expect(view).toEqual({
  selectedHypothesisId: 'reporting-role-removed',
  selectedHypothesisLabel: expect.any(String),
  total: 100,
  outcome: 'strong',
})
expect(JSON.stringify(view)).not.toMatch(
  /root_cause|relevance|critical|explanation|remediation|communication|debrief/i,
)
~~~

Assert non-completed state throws `INVALID_STATUS`, and selector use leaves instance/state unchanged.

- [ ] **Step 2: Run RED test**

Run: `npx vitest run src/engine/investigation-selectors.test.ts`

Expected: FAIL because the selector is absent.

- [ ] **Step 3: Implement only a player-safe projection**

~~~ts
export type DiagnosisOutcome = 'strong' | 'partial' | 'needs_revision'

export interface DiagnosisResultView {
  selectedHypothesisId: string
  selectedHypothesisLabel: string
  total: number
  outcome: DiagnosisOutcome
}
~~~

Validate identity and completed state. Resolve only the submitted hypothesis’s public label. Derive `strong` for 70–100, `partial` for 30–69, otherwise `needs_revision`. Return no score components, relevance, root cause, or explanation.

- [ ] **Step 4: Run GREEN test**

Run: `npx vitest run src/engine/investigation-selectors.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/engine/investigation-selectors.ts src/engine/investigation-selectors.test.ts
git commit -m "feat(engine): expose safe diagnosis results"
~~~

### Task 4: Controller submission and reset

**Files:**
- Modify: `src/features/investigation/useInvestigationController.ts`
- Modify: `src/features/investigation/useInvestigationController.test.ts`

- [ ] **Step 1: Write failing hook tests**

Inject a transition spy, select a hypothesis, then assert `submitDiagnosis()` sends exactly `{ type: 'submit_diagnosis' }`. Assert transition errors set the existing polite live error and non-transition errors rethrow. Assert `startOver()` resets state to intro, clears selected evidence/ready/error, and creates a fresh state object.

- [ ] **Step 2: Run RED test**

Run: `npx vitest run src/features/investigation/useInvestigationController.test.ts`

Expected: FAIL because the methods are absent.

- [ ] **Step 3: Implement controller-only wiring**

~~~ts
function submitDiagnosis() {
  return send({ type: 'submit_diagnosis' })
}

function startOver() {
  setState(createInvestigation(instance, Date.now()))
  setSelectedEvidenceId(undefined)
  setActiveTab('tools')
  setReady(false)
  setError(undefined)
}
~~~

Return both methods. Do not expose hidden scenario data or score calculations to the controller.

- [ ] **Step 4: Run GREEN test**

Run: `npx vitest run src/features/investigation/useInvestigationController.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/features/investigation/useInvestigationController.ts src/features/investigation/useInvestigationController.test.ts
git commit -m "feat(ui): submit and reset diagnosis runs"
~~~

### Task 5: Confirmation and final result UI

**Files:**
- Modify: `src/features/investigation/ReadyToDiagnose.tsx`
- Modify: `src/features/investigation/ReadyToDiagnose.test.tsx`
- Create: `src/features/investigation/DiagnosisResult.tsx`
- Create: `src/features/investigation/DiagnosisResult.test.tsx`
- Modify: `src/features/investigation/InvestigationPage.tsx`
- Modify: `src/features/investigation/InvestigationPage.test.tsx`
- Modify: `src/design/global.css`

- [ ] **Step 1: Write failing UI/page tests**

Test that confirmation uses `Submit diagnosis`, renders only safe hypothesis/bookmark labels, and invokes `onSubmit`. Test a result view renders the submitted diagnosis, numeric total, outcome, accessible heading focus, and `Start over`.

Drive a real page flow using keyboard submission. Assert focus lands on `Diagnosis submitted`, workspace controls are gone, start over returns to intro, and rendered text does not match `root cause|critical|supporting|red herring|remediation|communication|debrief`.

- [ ] **Step 2: Run RED tests**

Run: `npx vitest run src/features/investigation/ReadyToDiagnose.test.tsx src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/InvestigationPage.test.tsx`

Expected: FAIL because submission callback/result UI are absent.

- [ ] **Step 3: Implement safe components and page states**

Replace the checkpoint boundary copy with a native primary `Submit diagnosis` button calling `onSubmit`.

Create `DiagnosisResult` that accepts only `DiagnosisResultView` and `onStartOver`. Use this label map:

~~~ts
const outcomeLabels = {
  strong: 'Strong evidence-backed diagnosis',
  partial: 'Partial diagnosis',
  needs_revision: 'Diagnosis needs revision',
} as const
~~~

Render a semantic `h1` labeled `Diagnosis submitted`, a definition list for submitted diagnosis and score, outcome text, and native start-over button. Focus the heading with `useEffect`. Do not use color as the only score indicator.

In `InvestigationPage`, render the completed result before ready/workspace states using `getDiagnosisResultView(instance, controller.state)`. The checkpoint calls `controller.submitDiagnosis`; result calls `controller.startOver`. Do not add any parallel completed state.

- [ ] **Step 4: Run GREEN tests and type check**

Run: `npx vitest run src/features/investigation/ReadyToDiagnose.test.tsx src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/InvestigationPage.test.tsx && npx tsc -b`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/features/investigation/ReadyToDiagnose.tsx src/features/investigation/ReadyToDiagnose.test.tsx src/features/investigation/DiagnosisResult.tsx src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/InvestigationPage.tsx src/features/investigation/InvestigationPage.test.tsx src/design/global.css
git commit -m "feat(ui): add diagnosis submission result"
~~~

### Task 6: E2E, docs, and release gates

**Files:**
- Modify: `tests/e2e/investigation.spec.ts`
- Modify: `README.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: Write failing E2E cases**

Add a correct IAM path that opens/bookmarks critical evidence, selects the canonical hypothesis, submits via keyboard, and asserts `Diagnosis submitted`, `100`, and `Strong evidence-backed diagnosis`. Assert workspace controls are absent afterward.

Add an incorrect path with evidence bookmarks that asserts deterministic partial score without asserting or revealing the correct answer. Add `Start over` returning to the intro. Run a completion path at 320px and assert no horizontal overflow.

- [ ] **Step 2: Run RED E2E test**

Run: `npx playwright test tests/e2e/investigation.spec.ts`

Expected: FAIL because final result UI is absent.

- [ ] **Step 3: Document the M6 boundary**

Update README and architecture documentation: IAM supports deterministic diagnosis/evidence scoring with no backend or persistence; remediation, communication, efficiency, detailed scoring explanations, and debrief remain deferred. Document 70/30 behavior without embedding IAM answer data in public docs.

- [ ] **Step 4: Run release gates**

~~~bash
npm run lint
npm run format:check
npm test
npm run validate:scenarios
npm run generate:scenarios
git diff --exit-code
npm run build
npx playwright test
git diff --check
~~~

Expected: every command exits 0, scenario generation has no tracked drift, and desktop/mobile E2E passes.

- [ ] **Step 5: Commit**

~~~bash
git add tests/e2e/investigation.spec.ts README.md docs/architecture.md
git commit -m "docs: record milestone 6 scoring contract"
~~~

## Plan self-review

- Spec coverage: Tasks 1–3 implement the pure terminal engine and safe-result boundary; Task 4 connects commands; Task 5 implements accessible confirmation/result views; Task 6 validates browser flows, docs, static build, and generated artifacts.
- Scope: no task introduces remediation, communication, efficiency scoring, debrief, persistence, backend services, authentication, database, or AI.
- Type consistency: `submit_diagnosis`, `completed`, `DiagnosisScore`, and `DiagnosisResultView` are defined before their consumers.
- Completeness check: each task contains concrete files, tests, commands, and
  commit boundaries.

