# Investigation UX Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make evidence effort labels and the diagnosis checkpoint accurately communicate the investigation rules without changing scoring or engine behavior.

**Architecture:** The evidence-tool view receives a boolean derived from the authored scenario budget and formats its label accordingly. The workspace retains the engine's hypothesis requirement, while the notebook supplies a visible, screen-reader-associated explanation whenever its primary action is disabled.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, CSS.

---

## File structure

- Modify: `src/features/investigation/EvidenceToolList.tsx` — select Cost or Effort labels from budget enforcement.
- Modify: `src/features/investigation/InvestigationWorkspace.tsx` — derive budget presence and present the disabled-action guidance.
- Modify: `src/design/global.css` — give disabled buttons a visible non-actionable treatment.
- Modify: `src/features/investigation/InvestigationWorkspace.test.tsx` — cover both evidence labels and the diagnosis guidance.

### Task 1: Make tool labels match budget enforcement

**Files:**

- Modify: `src/features/investigation/EvidenceToolList.tsx`
- Modify: `src/features/investigation/InvestigationWorkspace.tsx`
- Test: `src/features/investigation/InvestigationWorkspace.test.tsx`

- [ ] **Step 1: Write failing component expectations for a budget-free scenario.**

  In the existing workspace test that opens `service-status`, assert the available
  tool has accessible name `Open Service status, effort 1` and visible text
  `Effort 1` before it is opened.

- [ ] **Step 2: Run the focused test and verify it fails.**

  Run: `npx vitest run src/features/investigation/InvestigationWorkspace.test.tsx`

  Expected: FAIL because the rendered label is `Cost 1`.

- [ ] **Step 3: Add an explicit budget mode input to the evidence list.**

  Extend `EvidenceToolListProps` with `hasBudget: boolean`. For available,
  unlocked tools, compute `const costLabel = hasBudget ? 'Cost' : 'Effort'` and
  use it in both the visible small text and `aria-label`. Keep locked and opened
  labels unchanged. Pass `instance.scenario.investigation_budget !== undefined`
  from `InvestigationWorkspace`.

- [ ] **Step 4: Run the focused test and verify it passes.**

  Run: `npx vitest run src/features/investigation/InvestigationWorkspace.test.tsx`

  Expected: PASS.

- [ ] **Step 5: Add a budgeted-label regression test.**

  Extend the local scenario instance in a dedicated test with
  `instance.scenario.investigation_budget = 5`, render the workspace with that
  instance, and assert `Open Service status, cost 1` plus visible `Cost 1`.

- [ ] **Step 6: Run the test to verify the budgeted label passes.**

  Run: `npx vitest run src/features/investigation/InvestigationWorkspace.test.tsx`

  Expected: PASS.

### Task 2: Explain and style the blocked diagnosis action

**Files:**

- Modify: `src/features/investigation/InvestigationWorkspace.tsx`
- Modify: `src/design/global.css`
- Test: `src/features/investigation/InvestigationWorkspace.test.tsx`

- [ ] **Step 1: Write a failing test for the disabled-action explanation.**

  In the initial workspace render, assert the disabled `Ready to diagnose`
  button has `aria-describedby="diagnosis-requirement"` and the referenced text
  says `Select a hypothesis to continue.` After selecting a radio hypothesis,
  assert the button is enabled and the explanatory text is absent.

- [ ] **Step 2: Run the focused test and verify it fails.**

  Run: `npx vitest run src/features/investigation/InvestigationWorkspace.test.tsx`

  Expected: FAIL because the explanatory element and ARIA association do not
  exist.

- [ ] **Step 3: Render the requirement only while no hypothesis is selected.**

  In `InvestigationWorkspace`, derive
  `const requiresHypothesis = !controller.state.selectedHypothesisId`. Before
  the button, render `<p id="diagnosis-requirement" className="diagnosis-requirement">Select a hypothesis to continue.</p>` only when that value is true. Give the button `disabled={requiresHypothesis}` and set `aria-describedby` to `diagnosis-requirement` only while disabled.

- [ ] **Step 4: Add restrained disabled and guidance styles.**

  In `src/design/global.css`, add `.button:disabled` with
  `cursor: not-allowed`, reduced opacity, and no hover color change. Add
  `.diagnosis-requirement` using the existing soft-text color and compact
  spacing so the requirement reads as guidance rather than an error.

- [ ] **Step 5: Run the focused test and verify it passes.**

  Run: `npx vitest run src/features/investigation/InvestigationWorkspace.test.tsx`

  Expected: PASS.

- [ ] **Step 6: Commit the scoped UX correction.**

  ```sh
  git add src/features/investigation/EvidenceToolList.tsx src/features/investigation/InvestigationWorkspace.tsx src/features/investigation/InvestigationWorkspace.test.tsx src/design/global.css
  git commit -m "fix: clarify investigation effort and diagnosis readiness"
  ```

### Task 3: Verify the static application and release it

**Files:**

- Test: existing quality, build, and browser suites.

- [ ] **Step 1: Run the complete local quality gate.**

  Run:

  ```sh
  npm run format:check
  npm run lint
  npm test
  npm run build
  npm run test:e2e
  git diff --check
  ```

  Expected: every command passes with no generated-content drift.

- [ ] **Step 2: Push the verified `main` branch.**

  ```sh
  git push origin main
  ```

- [ ] **Step 3: Verify the GitHub Pages deployment workflow completes.**

  Run:

  ```sh
  gh run list --repo karthiknambiar/saas-failure-lab --limit 5
  ```

  Expected: the newest `Deploy static site` workflow completes successfully.

## Plan self-review

- Scope coverage: Task 1 implements truthful labels, Task 2 makes the existing
  requirement understandable and accessible, and Task 3 verifies and deploys
  the resulting static application.
- Boundaries: no scoring, engine, scenario YAML, backend, or deployment-workflow
  behavior changes are introduced.
