# Milestone 7 Debrief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add an accessible, deterministic post-completion IAM-001 debrief without leaking explanatory content during active play.

**Architecture:** A pure engine selector transforms a completed instance/state into one safe debrief view. Page-local React state switches between the existing result and new debrief views. Components consume only the safe view; the current controller retains reset ownership.

**Tech Stack:** TypeScript, React 19, Vitest, React Testing Library, Playwright, Vite.

---

## File structure

- Modify src/engine/investigation-selectors.ts and test: completed-only debrief projection.
- Create src/features/investigation/DebriefPage.tsx and test: semantic debrief UI.
- Modify DiagnosisResult, InvestigationPage, their tests, and global.css: transient navigation/focus.
- Modify E2E and docs: browser proof and milestone contract.

### Task 1: Pure completed-only debrief selector

**Files:**

- Modify: src/engine/investigation-selectors.ts
- Modify: src/engine/investigation-selectors.test.ts

- [ ] **Step 1: Write failing selector tests**

Use the existing compose/start/open/bookmark/select/submit helpers. Assert a completed full-score IAM run projects:

```ts
expect(getDebriefView(instance, completed)).toEqual({
  submittedDiagnosis: expect.any(String),
  score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
  rootCauseExplanation: expect.any(String),
  evidenceChain: expect.arrayContaining([
    {
      id: 'service-status',
      label: 'Service status',
      explanation: expect.any(String),
    },
  ]),
  redHerrings: expect.any(Array),
  efficientPath: expect.any(Array),
  transferableLesson: expect.any(String),
})
```

Add test cases for intro/investigating INVALID_STATUS, exact authored evidence-chain ordering, only composition.selectedRedHerringIds, friendly framework-step labels, immutable inputs, and clear ordinary errors for invalid authored evidence/red-herring/path references.

- [ ] **Step 2: Run RED test**

Run: npx vitest run src/engine/investigation-selectors.test.ts

Expected: FAIL because getDebriefView is absent.

- [ ] **Step 3: Implement safe model and selector**

Add these exported types:

```ts
export interface DebriefEvidenceView {
  id: string
  label: string
  explanation: string
}
export interface DebriefRedHerringView {
  id: string
  label: string
  explanation: string
}
export interface DebriefPathEntryView {
  kind: 'framework_step' | 'evidence'
  label: string
}
export interface DebriefView {
  submittedDiagnosis: string
  score: { total: number; diagnosisPoints: number; evidencePoints: number }
  rootCauseExplanation: string
  evidenceChain: DebriefEvidenceView[]
  redHerrings: DebriefRedHerringView[]
  efficientPath: DebriefPathEntryView[]
  transferableLesson: string
}
```

First assert identity, then require completed state plus submission or throw InvestigationTransitionError with INVALID_STATUS. Resolve evidence/red-herring data from the scenario in authored order. Use this exact framework-label map:

```ts
const frameworkStepLabels = {
  'establish-impact': 'Establish impact',
  'determine-scope': 'Determine scope',
  'check-recent-changes': 'Check recent changes',
  'collect-evidence': 'Collect evidence',
  'test-hypothesis': 'Test hypothesis',
} as const
```

Copy only score numbers. Do not expose root-cause ID, relevance, action trail, bookmark IDs, remediation, communication, or complete scenario objects.

- [ ] **Step 4: Run GREEN tests**

Run: npx vitest run src/engine/investigation-selectors.test.ts src/engine/investigation-engine.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/investigation-selectors.ts src/engine/investigation-selectors.test.ts
git commit -m "feat(engine): expose completed debrief"
```

### Task 2: Render semantic debrief

**Files:**

- Create: src/features/investigation/DebriefPage.tsx
- Create: src/features/investigation/DebriefPage.test.tsx
- Modify: src/design/global.css

- [ ] **Step 1: Write failing component tests**

Pass a complete DebriefView literal. Assert focusable h1 named Debrief; definition-list values for Total score, Diagnosis, Evidence; semantic root-cause/evidence/red-herring/path/lesson sections; ordered lists for chain/path; unordered list for red herrings; native Back to result and Start over buttons.

Test an empty red-herring list yields “No red herrings were selected for this incident.”. Assert callbacks work through keyboard activation and raw scenario/state props are not accepted.

- [ ] **Step 2: Run RED test**

Run: npx vitest run src/features/investigation/DebriefPage.test.tsx

Expected: FAIL because DebriefPage is absent.

- [ ] **Step 3: Implement component**

Accept only this prop shape:

```ts
{
  debrief: DebriefView
  onBackToResult: () => void
  onStartOver: () => void
}
```

Focus the heading in useEffect. Use section, dl, ol, and ul structures. Render explanation only from debrief data. Do not import ScenarioInstance, InvestigationState, schema, or hidden selectors. Add scoped debrief styles, text labels for every score component, and responsive wrapping that prevents 320px overflow.

- [ ] **Step 4: Run GREEN test and type check**

Run: npx vitest run src/features/investigation/DebriefPage.test.tsx && npx tsc -b

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/investigation/DebriefPage.tsx src/features/investigation/DebriefPage.test.tsx src/design/global.css
git commit -m "feat(ui): render completed debrief"
```

### Task 3: Result/debrief navigation

**Files:**

- Modify: src/features/investigation/DiagnosisResult.tsx
- Modify: src/features/investigation/DiagnosisResult.test.tsx
- Modify: src/features/investigation/InvestigationPage.tsx
- Modify: src/features/investigation/InvestigationPage.test.tsx

- [ ] **Step 1: Write failing page tests**

Drive a completed real run. Assert Review debrief appears; keyboard activation opens Debrief; focus lands on debrief h1; workspace/ready controls remain absent; Back to result restores Diagnosis submitted; Start over returns intro. Assert intro/investigating/ready renders lack root-cause explanation, transferable lesson, evidence explanations, and component-score labels.

- [ ] **Step 2: Run RED tests**

Run: npx vitest run src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/InvestigationPage.test.tsx

Expected: FAIL because Review debrief and debrief navigation are absent.

- [ ] **Step 3: Implement transient navigation**

DiagnosisResult gains onReviewDebrief and native secondary Review debrief button.

PlayableInvestigation adds page-local state:

```ts
const [showDebrief, setShowDebrief] = useState(false)
```

Within the completed branch only, if showDebrief render DebriefPage with getDebriefView(instance, controller.state). Back sets false. Start over sets false then invokes controller.startOver. Otherwise render existing result plus review callback. No route, engine command, persistence, or duplicate completed state.

- [ ] **Step 4: Run GREEN UI tests**

Run: npx vitest run src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/DebriefPage.test.tsx src/features/investigation/InvestigationPage.test.tsx && npx tsc -b

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/investigation/DiagnosisResult.tsx src/features/investigation/DiagnosisResult.test.tsx src/features/investigation/InvestigationPage.tsx src/features/investigation/InvestigationPage.test.tsx
git commit -m "feat(ui): navigate completed debrief"
```

### Task 4: E2E, docs, and release gates

**Files:**

- Modify: tests/e2e/investigation.spec.ts
- Modify: README.md
- Modify: docs/architecture.md
- Modify: docs/scoring.md

- [ ] **Step 1: Write failing E2E cases**

Extend completed correct IAM flow: Review debrief, assert root-cause explanation, ordered evidence chain, selected red-herring explanation only, efficient labels, lesson, 70/30/100 values; then Back to result and Start over. Assert pre-submission route has no debrief-specific text. Add 320px completed-debrief no-overflow/no-tablist/workspace-control case.

- [ ] **Step 2: Run RED E2E**

Run: npx playwright test tests/e2e/investigation.spec.ts

Expected: FAIL because debrief UI is absent.

- [ ] **Step 3: Document completed-only disclosure**

Update README, architecture, and scoring docs: explanations plus component score values appear only after completed submission; M7 explains root cause/evidence/red herrings/path/lesson; remediation, communication, efficiency, persistence, and backend stay deferred. Do not put IAM answer text in README or scoring docs.

- [ ] **Step 4: Run release gates**

```bash
npm run lint
npm run format:check
npm test
npm run validate:scenarios
npm run generate:scenarios
git diff --exit-code
npm run build
npx playwright test
git diff --check
```

Expected: every command exits 0 and generated files have no tracked drift.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/investigation.spec.ts README.md docs/architecture.md docs/scoring.md
git commit -m "docs: record milestone 7 debrief contract"
```

## Plan self-review

- Spec coverage: Task 1 creates completed-only safe data; Task 2 renders semantic content; Task 3 provides transient navigation; Task 4 proves browser behavior and records scope.
- Scope: no remediation, communication, efficiency scoring, persistence, routes, backend, authentication, database, or hosted AI.
- Type consistency: DebriefView is defined before its component/page consumers.
- Completeness check: each task names files, tests, commands, and commit boundaries.
