# Milestone 2 Content System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic YAML content pipeline that validates and normalizes `iam-001` and `fnd-001` before static production builds.

**Architecture:** Pure TypeScript modules own the Zod contract, parsing, semantic validation, and normalization. A thin Node CLI owns filesystem discovery and generated-file writes; React remains uninvolved and Vite continues to emit static assets only.

**Tech Stack:** TypeScript 6, Zod, YAML, tsx, Vitest, Node.js 22, Vite, GitHub Actions

---

## File map

- `content/scenarios/*.yaml`: contributor-authored scenario sources.
- `src/content/scenario-tools.ts`: supported evidence tools and framework steps.
- `src/content/scenario-schema.ts`: strict Zod source contract and inferred types.
- `src/content/scenario-errors.ts`: shared issue model and formatter.
- `src/content/parse-scenario.ts`: filesystem-free YAML/Zod parsing.
- `src/content/validate-scenarios.ts`: pure relationship and graph validation.
- `src/content/normalize-scenario.ts`: public index types and normalization.
- `src/content/test-fixtures.ts`: fresh valid fixture factory.
- `scripts/scenario-cli.ts`: filesystem discovery, aggregation, and generation.
- `src/generated/scenario-index.json`: committed deterministic public index.
- `docs/scenario-authoring.md`: contributor contract.

### Task 1: Add the strict source schema

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/content/scenario-tools.ts`
- Create: `src/content/scenario-schema.ts`
- Create: `src/content/test-fixtures.ts`
- Create: `src/content/scenario-schema.test.ts`

- [ ] **Step 1: Install only the approved dependencies**

Run `npm install zod yaml` and `npm install --save-dev tsx`.

Expected: `zod` and `yaml` are runtime dependencies, `tsx` is a development dependency, and npm reports zero vulnerabilities.

- [ ] **Step 2: Define the supported registries**

Create `src/content/scenario-tools.ts`:

```ts
export const scenarioTools = [
  'service_status',
  'user_scope',
  'identity_events',
  'role_configuration',
  'audit_log',
] as const

export const frameworkSteps = [
  'establish-impact',
  'determine-scope',
  'check-recent-changes',
  'collect-evidence',
  'test-hypothesis',
] as const
```

- [ ] **Step 3: Create a complete reusable fixture**

Create `src/content/test-fixtures.ts` exporting `createScenarioFixture()`. It must return a fresh object with ID `iam-001`, version/title/domain/difficulty/estimated minutes, non-empty learning and customer-context arrays, a public brief, root cause, three hypotheses, one status evidence item, empty red-herring pool with `choose: 0`, one correct immediate remediation, two communication choices including one excellent choice, and a debrief whose evidence chain references that evidence.

Use these representative nested values so later tests share one vocabulary:

```ts
root_cause: {
  id: 'reporting-role-removed',
  category: 'authorization',
  explanation: 'The reporting role was removed from the affected users.',
},
brief: {
  severity: 'medium',
  business_impact: 'Month-end reporting is blocked for two users.',
  symptom_variants: ['Two users can sign in but cannot open reporting.'],
},
evidence: [{
  id: 'service-status',
  tool: 'service_status',
  cost: 1,
  relevance: 'supporting',
  unlock_after: [],
  content: { kind: 'status', state: 'operational', detail: 'All systems normal.' },
  explanation: 'A broad outage is unlikely.',
}],
```

- [ ] **Step 4: Write failing structural tests**

In `scenario-schema.test.ts`, assert the fixture succeeds. Clone and mutate fresh fixtures to assert failure for uppercase scenario ID, empty objectives, unsupported tool, negative evidence cost, fewer than three hypotheses, and unknown content kind.

- [ ] **Step 5: Verify the red state**

Run `npx vitest run src/content/scenario-schema.test.ts`.

Expected: FAIL because `scenarioSourceSchema` does not exist.

- [ ] **Step 6: Implement `scenarioSourceSchema`**

Use strict Zod objects, trimmed non-empty strings, `/^[a-z][a-z0-9]*-\d{3}$/` scenario IDs, kebab-case nested IDs, positive integer version/time, nonnegative integer costs, and these enums:

- domains: `fundamentals`, `api`, `identity`, `integrations`, `data`, `browser`;
- difficulty: `beginner`, `intermediate`, `advanced`;
- severity: `low`, `medium`, `high`, `critical`;
- relevance: `critical`, `supporting`, `neutral`, `red_herring`;
- remediation phase: `immediate`, `prevention`;
- remediation quality: `correct`, `partial`, `incorrect`;
- communication quality: `poor`, `acceptable`, `excellent`.

Define a discriminated `content.kind` union for these exact shapes:

```ts
{ kind: 'text'; text: string }
{ kind: 'status'; state: string; detail: string }
{ kind: 'key_value'; values: Record<string, string> }
{ kind: 'table'; columns: string[]; rows: Record<string, string>[] }
{ kind: 'timeline'; events: { time: string; event: string }[] }
```

Define efficient-path entries as `{ kind: 'framework_step'; ref: z.enum(frameworkSteps) }` or `{ kind: 'evidence'; ref: nestedId }`. Export `ScenarioSource = z.infer<typeof scenarioSourceSchema>`.

- [ ] **Step 7: Run focused and full tests**

Run `npx vitest run src/content/scenario-schema.test.ts` and `npm test`.

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/content
git commit -m "feat(content): add scenario source schema"
```

### Task 2: Parse YAML and format developer errors

**Files:**

- Create: `src/content/scenario-errors.ts`
- Create: `src/content/parse-scenario.ts`
- Create: `src/content/parse-scenario.test.ts`

- [ ] **Step 1: Write failing parser tests**

Test valid YAML serialized with `yaml.stringify`, malformed YAML that reports the supplied filename, and schema-invalid YAML whose issue path is `learning.objectives`.

Assert this result union:

```ts
type ParseScenarioResult =
  | { success: true; scenario: ScenarioSource; issues: [] }
  | { success: false; issues: ScenarioIssue[] }
```

- [ ] **Step 2: Verify the red state**

Run `npx vitest run src/content/parse-scenario.test.ts`.

Expected: FAIL because parser modules do not exist.

- [ ] **Step 3: Implement the issue contract**

Create `scenario-errors.ts` with `{ filePath, path, message }`. Implement `formatScenarioIssues` by grouping on filename, sorting groups and issues, and formatting each issue as `  path: message`; use `document` when a path is empty.

- [ ] **Step 4: Implement `parseScenario(sourceText, filePath)`**

Call `parse` from `yaml` inside `try/catch`, then `scenarioSourceSchema.safeParse`. Map Zod paths with `issue.path.join('.')`. Return issues instead of throwing and preserve YAML's syntax message.

- [ ] **Step 5: Verify and commit**

Run `npx vitest run src/content/parse-scenario.test.ts` and `npm test`; expect all tests to pass.

```bash
git add src/content/scenario-errors.ts src/content/parse-scenario.ts src/content/parse-scenario.test.ts
git commit -m "feat(content): parse scenario YAML"
```

### Task 3: Validate semantic invariants and dependency graphs

**Files:**

- Create: `src/content/validate-scenarios.ts`
- Create: `src/content/validate-scenarios.test.ts`

- [ ] **Step 1: Write a failing validation matrix**

Define documents as `{ filePath, sourceName, scenario }`. With fresh fixtures, assert issues for duplicate scenario IDs, filename mismatch, duplicate nested IDs in every collection, root cause missing from hypotheses, unknown unlock dependency, self-dependency, a three-node cycle, red-herring selection above pool size, no correct immediate remediation, no excellent communication, unknown debrief evidence, and a public symptom containing the full correct-hypothesis label.

- [ ] **Step 2: Verify the red state**

Run `npx vitest run src/content/validate-scenarios.test.ts`.

Expected: FAIL because `validateScenarioDocuments` does not exist.

- [ ] **Step 3: Implement the pure validator**

Export:

```ts
export interface ScenarioDocument {
  filePath: string
  sourceName: string
  scenario: ScenarioSource
}

export function validateScenarioDocuments(
  documents: ScenarioDocument[],
): ScenarioIssue[]
```

Use small helpers for duplicate IDs, references, and dependency cycles. Detect cycles with `visiting`, `visited`, and the current DFS path; canonicalize cycle messages so one cycle appears once. Validate `evidence_chain` and efficient-path evidence references. Compare lowercase public symptom variants only against the lowercase root-cause ID and full correct-hypothesis label—do not add fuzzy analysis. Sort issues by file, path, and message.

- [ ] **Step 4: Verify and commit**

Run `npx vitest run src/content/validate-scenarios.test.ts` and `npm test`; expect all tests to pass.

```bash
git add src/content/validate-scenarios.ts src/content/validate-scenarios.test.ts
git commit -m "feat(content): validate scenario semantics"
```

### Task 4: Normalize the public-safe index

**Files:**

- Create: `src/content/normalize-scenario.ts`
- Create: `src/content/normalize-scenario.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Supply two documents in reverse order. Assert sorted IDs and this exact entry shape:

```ts
{
  id: 'iam-001',
  title: 'Login works, feature does not',
  domain: 'identity',
  difficulty: 'beginner',
  estimatedMinutes: 8,
  concepts: ['authentication-vs-authorization'],
  symptomSummary: 'Two users can sign in but cannot open reporting.',
}
```

Assert serialized output excludes `rootCause`, `root_cause`, `evidence`, `relevance`, `remediation`, `communication`, and `debrief`.

- [ ] **Step 2: Verify the red state**

Run `npx vitest run src/content/normalize-scenario.test.ts`.

Expected: FAIL because normalization does not exist.

- [ ] **Step 3: Implement deterministic normalization**

Export `ScenarioIndexEntry`, `normalizeScenarioIndex(documents)`, and `serializeScenarioIndex(entries)`. Map only the seven asserted fields, sort concepts and entries with `localeCompare`, choose the first symptom variant, and serialize with two-space JSON plus one trailing newline.

- [ ] **Step 4: Verify and commit**

Run focused tests and `npm test`; expect all tests to pass.

```bash
git add src/content/normalize-scenario.ts src/content/normalize-scenario.test.ts
git commit -m "feat(content): normalize scenario index"
```

### Task 5: Add the filesystem CLI

**Files:**

- Create: `scripts/scenario-cli.ts`
- Create: `scripts/scenario-cli.test.ts`
- Modify: `tsconfig.node.json`
- Modify: `package.json`

- [ ] **Step 1: Write failing CLI integration tests**

Use temporary directories and inject `{ contentDirectory, outputFile }`. Test successful validation, malformed YAML failure, duplicate-ID failure across two files, sorted generated JSON, and identical output across two generation runs.

- [ ] **Step 2: Verify the red state**

Run `npx vitest run scripts/scenario-cli.test.ts`.

Expected: FAIL because `runScenarioCommand` does not exist.

- [ ] **Step 3: Implement `runScenarioCommand`**

Export `runScenarioCommand(command: 'validate' | 'generate', paths)` returning `{ success, output }`. Read only sorted `.yaml` files; parse every file; aggregate parse and semantic issues; set `sourceName` from the basename; normalize/write only after all validation passes; skip writing identical output. Return `Validated N scenarios.` or `Generated N scenarios.`.

At the executable boundary accept only `validate` or `generate`, use repository-relative defaults, print output, and set `process.exitCode = 1` on failure. Guard execution by comparing `pathToFileURL(process.argv[1]).href` with `import.meta.url`.

- [ ] **Step 4: Type-check scripts and add commands**

Add `scripts/**/*.ts` to `tsconfig.node.json`'s include list. Add:

```json
"validate:scenarios": "tsx scripts/scenario-cli.ts validate",
"generate:scenarios": "tsx scripts/scenario-cli.ts generate"
```

- [ ] **Step 5: Verify and commit**

Run `npx vitest run scripts/scenario-cli.test.ts`, `npx tsc -b`, and `npm test`; expect all to pass.

```bash
git add scripts/scenario-cli.ts scripts/scenario-cli.test.ts tsconfig.node.json package.json
git commit -m "feat(content): add scenario validation CLI"
```

### Task 6: Author IAM-001 and FND-001

**Files:**

- Create: `content/scenarios/iam-001.yaml`
- Create: `content/scenarios/fnd-001.yaml`
- Create: `src/content/scenario-content.test.ts`

- [ ] **Step 1: Write the failing real-content contract test**

Read both files, parse them, assert no parse issues, run semantic validation, and expect no issues. Sort and assert IDs `['fnd-001', 'iam-001']`; require at least three hypotheses and three evidence records per scenario.

- [ ] **Step 2: Verify the red state**

Run `npx vitest run src/content/scenario-content.test.ts`.

Expected: FAIL because scenario files do not exist.

- [ ] **Step 3: Author `iam-001.yaml`**

Use the catalog facts: two users can log in but cannot access reporting; authentication succeeds; authorization fails; their reporting role was removed. Include evidence IDs `service-status`, `affected-user-scope`, `authentication-events`, `role-configuration`, and `role-audit-history`, with each deeper record unlocking after the previous relevant record. Add a browser-update red herring, four plausible hypotheses, correct restoration and preventive controls, three communication choices, and an efficient path ending at the audit record. Do not use the full correct-hypothesis label in public symptoms.

- [ ] **Step 4: Author `fnd-001.yaml`**

Use the catalog facts: one analyst cannot open forecasting while peers can; the user never received the forecasting entitlement. Include healthy service status, peer comparison, entitlement configuration, and entitlement audit evidence. Add the earlier elevated-CPU red herring, three plausible hypotheses, safe entitlement assignment, preventive onboarding review, and three communication choices.

- [ ] **Step 5: Verify and commit**

Run the real-content test and `npm test`; expect all tests to pass.

```bash
git add content/scenarios src/content/scenario-content.test.ts
git commit -m "feat(content): add first scenarios"
```

### Task 7: Make scenario validation a build and CI gate

**Files:**

- Create: `src/generated/scenario-index.json`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Validate and generate**

Run `npm run validate:scenarios` and `npm run generate:scenarios`.

Expected: two scenarios validate; the index is ordered `fnd-001`, `iam-001` and has no hidden fields.

- [ ] **Step 2: Add generation before both builds**

Prefix existing `build` and `build:e2e` scripts with `npm run generate:scenarios &&`.

- [ ] **Step 3: Add explicit CI gates after linting**

```yaml
- name: Validate scenarios
  run: npm run validate:scenarios

- name: Verify generated scenario index
  run: |
    npm run generate:scenarios
    git diff --exit-code -- src/generated/scenario-index.json
```

- [ ] **Step 4: Prove invalid content fails**

Copy `iam-001.yaml` to the exact temporary path `content/scenarios/duplicate-validation-check.yaml`. Run validation and expect nonzero status plus duplicate-ID and filename-mismatch errors. Remove only that exact file and rerun successfully.

- [ ] **Step 5: Prove deterministic generation and build**

Run `npm run generate:scenarios`, `git diff --exit-code -- src/generated/scenario-index.json`, `npm test`, and `npm run build`.

Expected: every command exits zero; `index.html` and `404.html` are still generated.

- [ ] **Step 6: Commit**

```bash
git add package.json .github/workflows/ci.yml src/generated/scenario-index.json
git commit -m "build: validate scenarios before bundling"
```

### Task 8: Document authoring and architecture

**Files:**

- Create: `docs/scenario-authoring.md`
- Modify: `docs/architecture.md`
- Modify: `README.md`

- [ ] **Step 1: Write the authoring guide**

Document the lowercase filename/ID rule, required sections, supported domains/difficulties/tools/content kinds, hidden-field policy, dependency references, direct-answer safeguard, both commands, and error format. Include one compact fictional YAML example containing every required top-level key.

- [ ] **Step 2: Update architecture**

Mark the content boundary implemented. Document the build-time flow, pure/domain versus filesystem ownership, and why the public index omits answer data. Keep composition, runtime unlocking, and scoring described as future milestones.

- [ ] **Step 3: Update README**

Set status to Milestone 2, add validation/generation to quality commands, link the authoring guide/design/plan, and keep the browser shell explicitly inactive.

- [ ] **Step 4: Format and commit**

Run `npm run format:check`; format only reported files, then recheck.

```bash
git add README.md docs/architecture.md docs/scenario-authoring.md
git commit -m "docs: explain scenario authoring"
```

### Task 9: Verify, review, and stop

**Files:**

- Modify only files required to fix a demonstrated Milestone 2 failure.

- [ ] **Step 1: Verify from the lockfile**

Run `npm ci`, then:

```powershell
npm run format:check
npm run lint
npm test
npm run validate:scenarios
npm run generate:scenarios
git diff --exit-code -- src/generated/scenario-index.json
npm run build
```

Expected: all commands exit zero and npm reports zero vulnerabilities.

- [ ] **Step 2: Run browser regressions serially**

Run `npx playwright test --workers=1`.

Expected: all existing routing, keyboard, clean-route, and responsive tests pass.

- [ ] **Step 3: Verify the static fallback**

Hash `dist/index.html` and `dist/404.html` with `Get-FileHash -Algorithm SHA256`; throw if hashes differ.

- [ ] **Step 4: Inspect scope**

Run `git diff --check`, `git status --short`, and `git log --oneline -10`.

Expected: no whitespace errors, no generated drift, and no Milestone 3 composition, runtime gameplay, scoring, or UI integration.

- [ ] **Step 5: Request code review**

Use `superpowers:requesting-code-review` against the branch base. Resolve only verified Milestone 2 findings and rerun affected gates.

- [ ] **Step 6: Stop**

Report the two scenarios, schema/validation/normalization boundaries, public index, CI/build gates, documentation, test counts, and final commit. Do not begin Milestone 3.
