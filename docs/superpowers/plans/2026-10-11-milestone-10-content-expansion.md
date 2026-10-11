# Milestone 10 Content Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the recommended twelve-scenario beta catalog and unlinked static developer tools for inspecting authored scenarios and simulating existing deterministic diagnosis scores.

**Architecture:** YAML stays the only authored content source; the existing parser, semantic validator, generator, composer, and scoring engine remain authoritative. The public browser renders the generated browse-safe index for all scenarios. Two unlinked `/developer/*` routes use local generated catalog data and pure helpers: one resolves inspector data and one normalizes simulator selections before delegating to `scoreDiagnosis`.

**Tech Stack:** React 19, React Router 7, TypeScript, Vite, Vitest, Testing Library, Playwright, Zod, YAML.

---

## File structure

- Modify: `content/scenarios/fnd-001.yaml` only if validation reveals an existing-content issue; preserve its authored incident.
- Create: `content/scenarios/fnd-002.yaml`, `fnd-003.yaml`, `api-001.yaml`, `api-002.yaml`, `api-004.yaml`, `iam-004.yaml`, `int-001.yaml`, `int-004.yaml`, `dat-003.yaml`, `web-001.yaml` — the ten missing recommended catalog cases.
- Modify: `src/content/scenario-content.test.ts` — assert the complete beta catalog validates, composes, and supports its authored efficient paths.
- Modify: `src/features/browse/ScenarioBrowserPage.tsx` and `src/app/AppRoutes.test.tsx` — render all public index entries instead of a hard-coded IAM card.
- Create: `src/developer/inspector-model.ts` and `.test.ts` — pure scenario lookup/composition and dependency-graph projection.
- Create: `src/developer/scoring-simulator-model.ts` and `.test.ts` — pure authored-ID validation and score delegation.
- Create: `src/features/developer/ScenarioInspectorPage.tsx` and `.test.tsx` — unlinked inspector route UI.
- Create: `src/features/developer/ScoringSimulatorPage.tsx` and `.test.tsx` — unlinked simulator route UI.
- Modify: `src/app/AppRoutes.tsx`, `src/app/AppRoutes.test.tsx`, and `src/design/global.css` — developer route registration, route coverage, and responsive styles; do not modify `AppShell` navigation.
- Modify: `tests/e2e/*` only if the expanded browser or developer-route coverage cannot be expressed in an existing spec.
- Modify generated: `src/generated/scenario-index.json`, `src/generated/scenario-catalog.ts` — produced exclusively by the generator.
- Modify: `docs/scenario-authoring.md`, `docs/architecture.md`, and `README.md` — catalog count, authoring-validation workflow, and developer route documentation.

## Task 1: Establish the twelve-scenario catalog contract and public browser behavior

**Files:**
- Modify: `src/content/scenario-content.test.ts`
- Modify: `src/features/browse/ScenarioBrowserPage.tsx`
- Modify: `src/app/AppRoutes.test.tsx`

- [ ] **Step 1: Write failing catalog and browser tests.**

  Replace the two-file fixture list with the exact expected catalog and assert its IDs, domain coverage, and deterministic composition. Add route assertions for representative generated cards instead of a hard-coded IAM-only card.

  ```ts
  const expectedScenarioIds = [
    'api-001', 'api-002', 'api-004', 'dat-003', 'fnd-001', 'fnd-002',
    'fnd-003', 'iam-001', 'iam-004', 'int-001', 'int-004', 'web-001',
  ] as const

  expect(normalizeScenarioIndex(documents).map(({ id }) => id)).toEqual(
    expectedScenarioIds,
  )
  expect(new Set(documents.map(({ scenario }) => scenario.domain))).toEqual(
    new Set(['fundamentals', 'api', 'identity', 'integrations', 'data', 'browser']),
  )
  ```

  ```tsx
  expect(screen.getByRole('link', { name: /open api suddenly returns 401/i }))
    .toHaveAttribute('href', '/scenarios/api-001')
  expect(screen.getByRole('link', { name: /open one browser profile fails/i }))
    .toHaveAttribute('href', '/scenarios/web-001')
  ```

- [ ] **Step 2: Run the focused tests and verify they fail because the ten YAML files and generalized browser rendering do not exist.**

  Run: `npx vitest run src/content/scenario-content.test.ts src/app/AppRoutes.test.tsx`

  Expected: FAIL with missing scenario files and absent scenario-card links.

- [ ] **Step 3: Generalize `ScenarioBrowserPage` over the public generated index.**

  Remove `iamScenario`; map every `scenarioIndex` entry to one semantic `Card`. Retain public index fields only, use the existing `sentenceCase`, and make the link label deterministic:

  ```tsx
  {scenarios.map((scenario) => (
    <Card as="article" className="scenario-card" key={scenario.id}>
      <div className="scenario-card__metadata">...</div>
      <h2>{scenario.title}</h2>
      <p>{scenario.symptomSummary}</p>
      <ActionLink to={`/scenarios/${scenario.id}`} variant="primary">
        Open {scenario.title}
      </ActionLink>
    </Card>
  ))}
  ```

  Show the existing unavailable status only when the generated array is empty. Do not add filtering, random mode, or public answer content.

- [ ] **Step 4: Run the focused tests and commit the contract/UI preparation.**

  Run: `npx vitest run src/content/scenario-content.test.ts src/app/AppRoutes.test.tsx`

  Expected: browser assertions still fail until Tasks 2–3 supply the catalog; do not commit a knowingly failing intermediate change. Continue directly to Task 2, then return here to run the green command and commit all Task 1–3 catalog work together.

## Task 2: Author the fundamentals and API cases

**Files:**
- Create: `content/scenarios/fnd-002.yaml`
- Create: `content/scenarios/fnd-003.yaml`
- Create: `content/scenarios/api-001.yaml`
- Create: `content/scenarios/api-002.yaml`
- Create: `content/scenarios/api-004.yaml`

- [ ] **Step 1: Add the five complete YAML documents using the existing schema.**

  Author exactly these incident contracts, each with three customer names, at least two timestamp offsets, three-or-more hypotheses, safe immediate/prevention remediation choices, two-or-more communication choices including one excellent option, a valid evidence chain, and a complete efficient path:

  | File | Root-cause ID | Critical evidence chain | Transferable lesson |
  |---|---|---|---|
  | `fnd-002.yaml` | `approval-policy-changed` | `release-timeline`, `failure-timeline`, `policy-audit`, `tenant-comparison` | Build a timeline before accepting a causal claim. |
  | `fnd-003.yaml` | `utc-range-interpretation` | `requested-range`, `exported-timestamps`, `user-timezone`, `date-filter-help` | Verify expected behavior and time boundaries before treating a surprising result as a defect. |
  | `api-001.yaml` | `rotated-credential-revoked` | `http-response`, `network-connectivity`, `credential-audit`, `previous-success` | Separate connectivity from authentication. |
  | `api-002.yaml` | `invoice-write-scope-missing` | `read-request-success`, `write-request-forbidden`, `token-scopes`, `endpoint-permission` | A valid credential can still lack permission for a specific action. |
  | `api-004.yaml` | `immediate-429-retries` | `rate-limit-response`, `retry-after`, `request-frequency`, `backlog-trend` | Retries can amplify a failure. |

  Use only the supported tools (`service_status`, `user_scope`, `identity_events`, `role_configuration`, `audit_log`) and evidence content kinds. Map the catalog concepts to those generic tools without vendor naming: for example, API HTTP response and rate-limit data can be a `status`, request comparisons a `table`, configuration/audit facts a `key_value` or `timeline`.

- [ ] **Step 2: Validate the five files.**

  Run: `npm run validate:scenarios`

  Expected: PASS and print `Validated 7 scenarios.` The full twelve-scenario
  contract remains red until Task 3 adds the remaining five files.

- [ ] **Step 3: Add deterministic composition assertions for each new case.**

  Extend the Task 1 loop so every expected scenario is composed twice using `catalog-contract`, verifies equal instances, no unreplaced `{{customerName}}` token, selected red-herring count equal to `choose`, and can open evidence in efficient-path order.

  ```ts
  const first = composeScenario(scenario, 'catalog-contract')
  expect(composeScenario(scenario, 'catalog-contract')).toEqual(first)
  expect(first.scenario.customer_context.join(' ')).not.toContain('{{')
  ```

## Task 3: Author the identity, integration, data, and browser cases; generate artifacts

**Files:**
- Create: `content/scenarios/iam-004.yaml`
- Create: `content/scenarios/int-001.yaml`
- Create: `content/scenarios/int-004.yaml`
- Create: `content/scenarios/dat-003.yaml`
- Create: `content/scenarios/web-001.yaml`
- Modify generated: `src/generated/scenario-index.json`
- Modify generated: `src/generated/scenario-catalog.ts`

- [ ] **Step 1: Add the five complete YAML documents using the existing schema.**

  Use these exact instructional contracts and the same authoring minimums from Task 2:

  | File | Root-cause ID | Critical evidence chain | Transferable lesson |
  |---|---|---|---|
  | `iam-004.yaml` | `required-provisioning-attribute-unmapped` | `authentication-health`, `provisioning-response`, `validation-error`, `attribute-map` | SSO and provisioning are separate flows. |
  | `int-001.yaml` | `webhook-duplicate-not-idempotent` | `delivery-identifiers`, `first-delivery-timeout`, `duplicate-records`, `idempotency-store` | Event delivery is often at-least-once, so consumers must tolerate duplicates. |
  | `int-004.yaml` | `retry-storm-queue-backlog` | `rate-limit-responses`, `retry-intervals`, `queue-depth`, `worker-throughput`, `provider-recovery` | Healthy workers can still be overwhelmed by bad retry behavior. |
  | `dat-003.yaml` | `destination-required-field-missing` | `source-count`, `ingestion-count`, `processing-count`, `validation-failures`, `destination-count` | Trace counts across every pipeline stage rather than checking only endpoints. |
  | `web-001.yaml` | `stale-local-configuration` | `server-request-result`, `clean-profile-comparison`, `local-state-timestamp`, `cached-config-version` | Compare client environments before escalating a platform issue. |

  Give each case a fair red herring where the catalog calls for one; use `choose: 0` only when no fair distractor is authored. Do not put a root-cause ID or correct hypothesis label in public symptom variants.

- [ ] **Step 2: Run the complete content test and validation gates.**

  Run: `npx vitest run src/content/scenario-content.test.ts && npm run validate:scenarios`

  Expected: PASS; validation prints `Validated 12 scenarios.`

- [ ] **Step 3: Generate committed artifacts and prove idempotence.**

  Run:

  ```sh
  npm run generate:scenarios
  npm run generate:scenarios
  git diff --check
  ```

  Expected: first run writes `src/generated/scenario-index.json` and `src/generated/scenario-catalog.ts`; second run leaves them unchanged and reports `Generated 12 scenarios.`

- [ ] **Step 4: Run the focused content/browser tests and commit the catalog.**

  Run: `npx vitest run src/content/scenario-content.test.ts src/app/AppRoutes.test.tsx`

  Expected: PASS with all twelve IDs and representative public cards.

  ```sh
  git add content/scenarios src/content/scenario-content.test.ts src/features/browse/ScenarioBrowserPage.tsx src/app/AppRoutes.test.tsx src/generated
  git commit -m "feat(content): expand beta scenario catalog"
  ```

## Task 4: Create the pure Scenario Inspector model

**Files:**
- Create: `src/developer/inspector-model.ts`
- Create: `src/developer/inspector-model.test.ts`

- [ ] **Step 1: Write failing model tests for known, unknown, and seeded inspections.**

  Define the public model contract before React:

  ```ts
  export type InspectorResult =
    | { available: true; instance: ScenarioInstance; dependencies: InspectorDependency[] }
    | { available: false; reason: 'unknown' | 'invalid_seed' }

  expect(inspectScenario('api-001', 'author-seed').available).toBe(true)
  expect(inspectScenario('not-real', 'author-seed')).toEqual({ available: false, reason: 'unknown' })
  expect(inspectScenario('api-001', '   ')).toEqual({ available: false, reason: 'invalid_seed' })
  ```

- [ ] **Step 2: Run the model test and verify it fails because the module does not exist.**

  Run: `npx vitest run src/developer/inspector-model.test.ts`

  Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement a generated-catalog lookup and dependency projection.**

  Import `scenarioCatalog`, reuse `parseChallengeSeed`/seed normalization semantics, compose a matching scenario through `composeScenario`, and map authored evidence into an inspector-only dependency view:

  ```ts
  export interface InspectorDependency {
    evidenceId: string
    unlockAfter: string[]
  }

  dependencies: instance.scenario.evidence.map(({ id, unlock_after }) => ({
    evidenceId: id,
    unlockAfter: [...unlock_after],
  }))
  ```

  Do not duplicate parser/validator logic, mutate catalog content, expose browser APIs, or create a fallback that fabricates an unknown scenario.

- [ ] **Step 4: Run the model test and commit.**

  Run: `npx vitest run src/developer/inspector-model.test.ts`

  Expected: PASS.

  ```sh
  git add src/developer/inspector-model.ts src/developer/inspector-model.test.ts
  git commit -m "feat(developer): add scenario inspector model"
  ```

## Task 5: Create the pure Scoring Simulator model

**Files:**
- Create: `src/developer/scoring-simulator-model.ts`
- Create: `src/developer/scoring-simulator-model.test.ts`

- [ ] **Step 1: Write failing tests for valid score parity and invalid authored IDs.**

  The model accepts a scenario ID, selected hypothesis ID, and bookmarked evidence IDs; it must use `scoreDiagnosis` rather than reproduce points:

  ```ts
  expect(simulateScore({
    scenarioId: 'iam-001',
    selectedHypothesisId: 'reporting-role-removed',
    bookmarkedEvidenceIds: ['affected-user-scope', 'authentication-events', 'role-configuration', 'role-audit-history'],
  })).toEqual({ available: true, score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 } })

  expect(simulateScore({ scenarioId: 'not-real', selectedHypothesisId: 'x', bookmarkedEvidenceIds: [] }))
    .toEqual({ available: false, reason: 'unknown_scenario' })
  ```

- [ ] **Step 2: Run the test and verify it fails because the module does not exist.**

  Run: `npx vitest run src/developer/scoring-simulator-model.test.ts`

  Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement validation and delegation.**

  Resolve scenarios only from `scenarioCatalog`. Return `unknown_scenario`, `unknown_hypothesis`, or `unknown_evidence` for invalid IDs. De-duplicate bookmarked IDs, derive critical IDs from evidence relevance, then call the existing engine:

  ```ts
  const score = scoreDiagnosis({
    canonicalHypothesisId: scenario.root_cause.id,
    selectedHypothesisId: input.selectedHypothesisId,
    criticalEvidenceIds: scenario.evidence
      .filter(({ relevance }) => relevance === 'critical')
      .map(({ id }) => id),
    bookmarkedEvidenceIds: [...new Set(input.bookmarkedEvidenceIds)],
  })
  ```

- [ ] **Step 4: Run the model test and commit.**

  Run: `npx vitest run src/developer/scoring-simulator-model.test.ts`

  Expected: PASS.

  ```sh
  git add src/developer/scoring-simulator-model.ts src/developer/scoring-simulator-model.test.ts
  git commit -m "feat(developer): add scoring simulator model"
  ```

## Task 6: Add unlinked, accessible Inspector and Simulator routes

**Files:**
- Create: `src/features/developer/ScenarioInspectorPage.tsx`
- Create: `src/features/developer/ScenarioInspectorPage.test.tsx`
- Create: `src/features/developer/ScoringSimulatorPage.tsx`
- Create: `src/features/developer/ScoringSimulatorPage.test.tsx`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/app/AppRoutes.test.tsx`
- Modify: `src/design/global.css`

- [ ] **Step 1: Write failing component and route tests.**

  Require explicit labels, semantic headings, an unknown recovery state, a score `dl`, no hidden navigation link, and 320px-safe semantic controls:

  ```tsx
  renderRoute('/developer/inspector/api-001?seed=author-seed')
  expect(screen.getByRole('heading', { name: 'Scenario Inspector' })).toBeInTheDocument()
  expect(screen.getByText('api-001')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Evidence dependencies' })).toBeInTheDocument()

  renderRoute('/developer/scoring/iam-001')
  await user.selectOptions(screen.getByLabelText('Hypothesis'), 'reporting-role-removed')
  await user.click(screen.getByLabelText(/affected user scope/i))
  expect(screen.getByText('Score simulation')).toBeInTheDocument()
  ```

  Add route tests that `/developer/*` is renderable but `AppShell` does not expose an Inspector or Simulator navigation link.

- [ ] **Step 2: Run the component tests and verify they fail because the routes/pages do not exist.**

  Run: `npx vitest run src/features/developer/ScenarioInspectorPage.test.tsx src/features/developer/ScoringSimulatorPage.test.tsx src/app/AppRoutes.test.tsx`

  Expected: FAIL with unresolved imports/routes.

- [ ] **Step 3: Implement the pages as thin adapters over the pure models.**

  Register exactly these routes inside the existing `AppShell` route tree; do not add them to `navigationItems`:

  ```tsx
  <Route path="developer/inspector/:scenarioId" element={<ScenarioInspectorPage />} />
  <Route path="developer/scoring/:scenarioId" element={<ScoringSimulatorPage />} />
  ```

  The Inspector reads `scenarioId` plus optional `seed`; its complete view includes metadata, variation/composition values, a semantic evidence-dependency list, hypotheses, remediation, communication, and debrief headings. Its unavailable state names the invalid/unknown condition and links back to `/scenarios`.

  The Simulator initializes scenario-specific hypothesis/evidence controls, uses checkboxes only for authored evidence, calls `simulateScore` on input changes or a visible `Simulate score` button, and renders total/diagnosis/evidence points in a `dl`. It must announce invalid selection state with `role="status"`; it must not save state or reveal an unrelated scenario's data.

- [ ] **Step 4: Add scoped responsive styles.**

  Add `.developer-page`, `.developer-grid`, `.developer-controls`, `.developer-score`, and `.developer-dependencies` rules that use `minmax(0, ...)`, wrap long IDs, preserve native control labels, and collapse to one column at the existing `820px` breakpoint. At 320px, controls and score blocks must be `min-width: 0` with no horizontal overflow.

- [ ] **Step 5: Run focused tests and commit the developer tools.**

  Run: `npx vitest run src/features/developer src/app/AppRoutes.test.tsx`

  Expected: PASS; public shell test confirms no Developer navigation item.

  ```sh
  git add src/developer src/features/developer src/app/AppRoutes.tsx src/app/AppRoutes.test.tsx src/design/global.css
  git commit -m "feat(developer): add inspector and score simulator"
  ```

## Task 7: Document, verify generated artifacts, and protect the static release

**Files:**
- Modify: `docs/scenario-authoring.md`
- Modify: `docs/architecture.md`
- Modify: `README.md`
- Modify: `tests/e2e/investigation.spec.ts` or create `tests/e2e/developer-tools.spec.ts`
- Modify generated: `src/generated/scenario-index.json`
- Modify generated: `src/generated/scenario-catalog.ts`

- [ ] **Step 1: Add documentation and a failing browser regression test.**

  Document the twelve-scenario count, the exact local validation/generation commands, and unlinked developer routes:

  ```text
  /developer/inspector/<scenario-id>?seed=<seed>
  /developer/scoring/<scenario-id>
  ```

  State plainly that these are static local authoring aids, not public navigation or an access-control boundary. In Playwright, open representative public scenario cards and direct developer routes under `/failure-lab/`; verify each heading, inspector dependency content, simulator controls, and `document.documentElement.scrollWidth <= window.innerWidth` at 320px.

- [ ] **Step 2: Run the test first and verify the new browser assertions fail until the route implementation is present.**

  Run: `npx playwright test tests/e2e/developer-tools.spec.ts`

  Expected: FAIL before Task 6; after Task 6, PASS.

- [ ] **Step 3: Run all required quality gates.**

  Run:

  ```sh
  npm run format:check
  npm run lint
  npm run validate:scenarios
  npm run generate:scenarios -- --check
  npm test
  npm run build
  npm run test:e2e
  git diff --check
  ```

  Expected: formatting/lint pass; validation reports 12 scenarios; generation leaves only intended committed artifacts; unit and browser tests pass; Vite produces a static build with SPA fallback; no whitespace errors.

- [ ] **Step 4: Review generated output and commit the release evidence.**

  Confirm the public index has exactly twelve entries and only browse-safe fields; confirm the generated catalog contains all twelve playable sources. Confirm `.github/workflows/ci.yml` already performs validation, generation-drift detection for both generated artifacts, unit testing, production build, and browser checks; do not add redundant CI infrastructure.

  ```sh
  git add README.md docs tests/e2e src/generated
  git commit -m "test(docs): verify milestone 10 content expansion"
  ```

## Plan self-review

- Spec coverage: Tasks 1–3 deliver and validate the twelve-scenario catalog; Tasks 4–6 deliver unlinked deterministic Inspector and Simulator routes; Task 7 documents and verifies static deployment, CI gates, accessibility, responsive behavior, and generated artifacts.
- Scope: no backend, authentication, database, AI, editor, persistence, new scoring rules, filters, random mode, or CI service is introduced.
- Consistency: Inspector uses `inspectScenario`; Simulator uses `simulateScore`; both resolve only `scenarioCatalog`; scoring delegates exclusively to `scoreDiagnosis`.
