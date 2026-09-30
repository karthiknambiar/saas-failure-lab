# Milestone 5 Investigation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a statically deployable, accessible IAM-001 investigation from incident introduction through a reversible ready-to-diagnose checkpoint.

**Architecture:** The existing scenario CLI generates a typed playable catalog beside the browse-safe index. A feature-local React controller composes IAM-001 with a canonical seed, sends commands to the pure Milestone 4 engine, and exposes evidence only through safe selectors. Desktop uses a three-region workspace; mobile uses controlled accessible tabs without persistence, scoring, or backend services.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Vite 8, Vitest 5, Testing Library, Playwright, existing YAML/Zod content pipeline and deterministic investigation engine

---

## File map

### New files

- `src/content/serialize-scenario-catalog.ts` — deterministic generated TypeScript catalog serialization.
- `src/content/serialize-scenario-catalog.test.ts` — catalog ordering, typing wrapper, immutability, and newline tests.
- `src/generated/scenario-catalog.ts` — generated validated scenario sources used by the static investigation route.
- `src/features/investigation/load-investigation.ts` — IAM-001 allow-list, canonical seed, route loading, and composition.
- `src/features/investigation/load-investigation.test.ts` — playable, unavailable, unknown, and deterministic loader tests.
- `src/features/investigation/investigation-labels.ts` — human-readable tool, evidence, severity, and action labels.
- `src/features/investigation/IncidentIntro.tsx` — solution-safe incident introduction.
- `src/features/investigation/InvestigationPage.tsx` — route boundary, controller lifecycle, recovery view, and ready checkpoint switching.
- `src/features/investigation/InvestigationPage.test.tsx` — intro, route recovery, hidden-data, begin, and command-error tests.
- `src/features/investigation/EvidenceContent.tsx` — exhaustive reusable content-kind renderers.
- `src/features/investigation/EvidenceContent.test.tsx` — semantic tests for all five evidence kinds.
- `src/features/investigation/useInvestigationController.ts` — local engine state and transient workspace state.
- `src/features/investigation/useInvestigationController.test.ts` — command delegation, selection, tab, ready, and error-preservation tests.
- `src/features/investigation/EvidenceToolList.tsx` — locked, available, and opened evidence controls.
- `src/features/investigation/EvidenceViewer.tsx` — opened evidence surface and bookmark control.
- `src/features/investigation/InvestigationWorkspace.tsx` — incident header and desktop/mobile region composition.
- `src/features/investigation/InvestigationWorkspace.test.tsx` — evidence opening, unlocking, selection, budget, and focus tests.
- `src/features/investigation/CaseNotebook.tsx` — observations, hypothesis selector, and action trail.
- `src/features/investigation/ReadyToDiagnose.tsx` — reversible Milestone 5 endpoint.
- `src/features/investigation/CaseNotebook.test.tsx` — bookmark, hypothesis, and trail tests.
- `src/features/investigation/ReadyToDiagnose.test.tsx` — summary, focus, exclusion, and return tests.
- `src/features/investigation/useMediaQuery.ts` — small reactive mobile-query adapter.
- `src/features/investigation/useMediaQuery.test.tsx` — initial and change-event tests.
- `src/features/investigation/WorkspaceTabs.tsx` — controlled WAI-ARIA tab list.
- `src/features/investigation/WorkspaceTabs.test.tsx` — click, arrow, Home, and End keyboard behavior.
- `tests/e2e/investigation.spec.ts` — desktop, browser-entry, mobile-tab, direct-route, and overflow coverage.

### Modified files

- `scripts/scenario-cli.ts` — generate both artifacts after one validation pass.
- `scripts/scenario-cli.test.ts` — two-artifact generation, no-rewrite, validation, and write-failure tests.
- `src/app/AppRoutes.tsx` — add `/scenarios/:scenarioId`.
- `src/app/AppRoutes.test.tsx` — route and recovery assertions.
- `src/pages/LandingPage.tsx` — route the primary CTA directly to IAM-001 with accurate copy.
- `src/features/browse/ScenarioBrowserPage.tsx` — replace inactive filters and empty state with the IAM-001 safe-index card.
- `src/design/global.css` — browser card, intro, workspace, evidence, notebook, tab, checkpoint, and responsive styles.
- `src/test/setup.ts` — deterministic `matchMedia` test support.
- `tests/e2e/home.spec.ts` — update the landing CTA expectation without weakening existing navigation checks.
- `docs/architecture.md` — generated catalog and Milestone 5 browser boundary.
- `docs/scenario-authoring.md` — static playable-catalog generation note.

Existing scenario YAML, engine files, engine state, and safe selectors remain unchanged unless a failing UI test demonstrates a narrow contract defect. Do not broaden Milestone 5 to FND-001 gameplay.

---

### Task 1: Generate the typed playable scenario catalog

**Files:**

- Create: `src/content/serialize-scenario-catalog.test.ts`
- Create: `src/content/serialize-scenario-catalog.ts`
- Modify: `scripts/scenario-cli.test.ts`
- Modify: `scripts/scenario-cli.ts`
- Generate: `src/generated/scenario-catalog.ts`

- [ ] **Step 1: Write failing catalog serializer tests**

Create `src/content/serialize-scenario-catalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from './scenario-schema'
import { createScenarioFixture } from './test-fixtures'
import type { ScenarioDocument } from './validate-scenarios'
import { serializeScenarioCatalog } from './serialize-scenario-catalog'

function document(id: string): ScenarioDocument {
  return {
    filePath: `content/scenarios/${id}.yaml`,
    sourceName: id,
    scenario: { ...createScenarioFixture(), id } as ScenarioSource,
  }
}

describe('serializeScenarioCatalog', () => {
  it('preserves validated source order in a formatted typed generated module', async () => {
    const documents = [document('iam-002'), document('iam-001')]
    const before = structuredClone(documents)

    const serialized = await serializeScenarioCatalog(documents)

    expect(serialized).toContain(
      "import type { ScenarioSource } from '../content/scenario-schema'",
    )
    expect(serialized.indexOf('iam-002')).toBeLessThan(
      serialized.indexOf('iam-001'),
    )
    expect(serialized).toContain(
      'export const scenarioCatalog: ScenarioSource[] =',
    )
    expect(serialized.endsWith('\n')).toBe(true)
    expect(serialized.endsWith('\n\n')).toBe(false)
    expect(documents).toEqual(before)
  })
})
```

- [ ] **Step 2: Run the serializer test and verify RED**

Run:

```sh
npx vitest run src/content/serialize-scenario-catalog.test.ts
```

Expected: FAIL because `serialize-scenario-catalog.ts` does not exist.

- [ ] **Step 3: Implement deterministic catalog serialization**

Create `src/content/serialize-scenario-catalog.ts`:

```ts
import { format } from 'prettier'

import type { ScenarioDocument } from './validate-scenarios'

export function serializeScenarioCatalog(
  documents: readonly ScenarioDocument[],
): Promise<string> {
  const scenarios = documents.map(({ scenario }) => scenario)
  const source = [
    "import type { ScenarioSource } from '../content/scenario-schema'",
    '',
    `export const scenarioCatalog: ScenarioSource[] = ${JSON.stringify(scenarios, null, 2)}`,
  ].join('\n')

  return format(source, {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    endOfLine: 'lf',
  })
}
```

- [ ] **Step 4: Extend the CLI tests for two generated artifacts**

In `scripts/scenario-cli.test.ts`, change `createPaths` to return both output paths:

```ts
async function createPaths() {
  const root = await mkdtemp(path.join(tmpdir(), 'scenario-cli-'))
  const contentDirectory = path.join(root, 'content')
  const outputFile = path.join(root, 'generated', 'scenario-index.json')
  const catalogOutputFile = path.join(root, 'generated', 'scenario-catalog.ts')
  temporaryDirectories.push(root)
  await mkdir(contentDirectory)

  return { root, contentDirectory, outputFile, catalogOutputFile }
}
```

Replace the index-only generation test with:

```ts
it('generates an ID-sorted index and source-ordered typed catalog', async () => {
  const paths = await createPaths()
  await writeScenario(paths.contentDirectory, 'iam-002.yaml', {
    id: 'iam-002',
    title: 'Second scenario',
  })
  await writeScenario(paths.contentDirectory, 'iam-001.yaml')

  await expect(runScenarioCommand('generate', paths)).resolves.toEqual({
    success: true,
    output: 'Generated 2 scenarios.',
  })
  const index = JSON.parse(await readFile(paths.outputFile, 'utf8')) as Array<{
    id: string
  }>
  const catalog = await readFile(paths.catalogOutputFile, 'utf8')

  expect(index.map(({ id }) => id)).toEqual(['iam-001', 'iam-002'])
  expect(catalog.indexOf('iam-001')).toBeLessThan(catalog.indexOf('iam-002'))
  expect(catalog).toContain('root_cause')
})
```

Update the unchanged-output test to set and compare both timestamps:

```ts
it('does not rewrite identical generated artifacts', async () => {
  const paths = await createPaths()
  await writeScenario(paths.contentDirectory, 'iam-001.yaml')
  await runScenarioCommand('generate', paths)
  const oldTimestamp = new Date('2020-01-01T00:00:00.000Z')
  await Promise.all([
    utimes(paths.outputFile, oldTimestamp, oldTimestamp),
    utimes(paths.catalogOutputFile, oldTimestamp, oldTimestamp),
  ])

  const result = await runScenarioCommand('generate', paths)

  expect(result).toEqual({
    success: true,
    output: 'Generated 1 scenarios.',
  })
  expect((await stat(paths.outputFile)).mtimeMs).toBe(oldTimestamp.getTime())
  expect((await stat(paths.catalogOutputFile)).mtimeMs).toBe(
    oldTimestamp.getTime(),
  )
})
```

Change the validation-failure test to create and assert two sentinels:

```ts
it('keeps generated artifacts unchanged when validation fails', async () => {
  const paths = await createPaths()
  await writeFile(path.join(paths.contentDirectory, 'broken.yaml'), 'brief: [')
  await mkdir(path.dirname(paths.outputFile), { recursive: true })
  await writeFile(paths.outputFile, 'sentinel index')
  await writeFile(paths.catalogOutputFile, 'sentinel catalog')

  const result = await runScenarioCommand('generate', paths)

  expect(result.success).toBe(false)
  await expect(readFile(paths.outputFile, 'utf8')).resolves.toBe(
    'sentinel index',
  )
  await expect(readFile(paths.catalogOutputFile, 'utf8')).resolves.toBe(
    'sentinel catalog',
  )
})
```

Replace the write-failure test with a second-staged-write failure so neither
artifact is renamed:

```ts
it('keeps both artifacts and cleans staged files when writing fails', async () => {
  const paths = await createPaths()
  await writeScenario(paths.contentDirectory, 'iam-001.yaml')
  await mkdir(path.dirname(paths.outputFile), { recursive: true })
  await writeFile(paths.outputFile, 'sentinel index')
  await writeFile(paths.catalogOutputFile, 'sentinel catalog')
  let writeCount = 0

  const result = await runScenarioCommand('generate', paths, {
    async writeFile(filePath: string, content: string) {
      writeCount += 1
      await writeFile(filePath, content.slice(0, 10))
      if (writeCount === 2) {
        throw Object.assign(new Error('disk full'), { code: 'ENOSPC' })
      }
    },
  })

  expect(result.success).toBe(false)
  expect(result.output).toContain('disk full')
  await expect(readFile(paths.outputFile, 'utf8')).resolves.toBe(
    'sentinel index',
  )
  await expect(readFile(paths.catalogOutputFile, 'utf8')).resolves.toBe(
    'sentinel catalog',
  )
  expect((await readdir(path.dirname(paths.outputFile))).sort()).toEqual([
    path.basename(paths.catalogOutputFile),
    path.basename(paths.outputFile),
  ])
})
```

Keep the CRLF index test and add the catalog path to every `ScenarioCommandPaths`
fixture through the updated `createPaths` return value.

- [ ] **Step 5: Run serializer and CLI tests and verify RED**

Run:

```sh
npx vitest run src/content/serialize-scenario-catalog.test.ts scripts/scenario-cli.test.ts
```

Expected: serializer passes; CLI tests fail because `catalogOutputFile` is not
part of the command contract and no catalog is generated.

- [ ] **Step 6: Stage all changed artifact contents before renaming**

In `scripts/scenario-cli.ts`:

1. Import `serializeScenarioCatalog`.
2. Add `catalogOutputFile: string` to `ScenarioCommandPaths`.
3. Replace `writeIndexIfChanged` with this multi-artifact writer:

```ts
interface GeneratedArtifact {
  outputFile: string
  content: string
}

async function writeArtifactsIfChanged(
  artifacts: readonly GeneratedArtifact[],
  operations: ScenarioCommandOperations,
): Promise<void> {
  const staged: Array<{ outputFile: string; temporaryFile: string }> = []

  try {
    for (const artifact of artifacts) {
      let existing: string | undefined
      try {
        existing = await readFile(artifact.outputFile, 'utf8')
      } catch (error) {
        if (!(
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )) {
          throw error
        }
      }

      if (
        existing !== undefined &&
        normalizeLineEndings(existing) ===
          normalizeLineEndings(artifact.content)
      ) {
        continue
      }

      const outputDirectory = path.dirname(artifact.outputFile)
      const temporaryFile = path.join(
        outputDirectory,
        `.${path.basename(artifact.outputFile)}.${process.pid}.${randomUUID()}.tmp`,
      )
      staged.push({ outputFile: artifact.outputFile, temporaryFile })
      await mkdir(outputDirectory, { recursive: true })
      await operations.writeFile(temporaryFile, artifact.content)
    }

    for (const artifact of staged) {
      await rename(artifact.temporaryFile, artifact.outputFile)
    }
  } finally {
    await Promise.all(
      staged.map(({ temporaryFile }) => rm(temporaryFile, { force: true })),
    )
  }
}
```

In the generate branch, replace the index-only write with:

```ts
const index = normalizeScenarioIndex(documents)
await writeArtifactsIfChanged(
  [
    {
      outputFile: paths.outputFile,
      content: serializeScenarioIndex(index),
    },
    {
      outputFile: paths.catalogOutputFile,
      content: await serializeScenarioCatalog(documents),
    },
  ],
  operations,
)
```

Update `main` paths:

```ts
const result = await runScenarioCommand(command, {
  contentDirectory: 'content/scenarios',
  outputFile: 'src/generated/scenario-index.json',
  catalogOutputFile: 'src/generated/scenario-catalog.ts',
})
```

- [ ] **Step 7: Generate and verify the catalog**

Run:

```sh
npm run generate:scenarios
npx vitest run src/content/serialize-scenario-catalog.test.ts scripts/scenario-cli.test.ts
npx tsc -b
npm run lint
git diff --check
```

Expected: two scenarios generate; serializer and CLI tests, TypeScript, and
lint pass; `src/generated/scenario-catalog.ts` is created.

- [ ] **Step 8: Commit the playable catalog**

```sh
git add scripts/scenario-cli.ts scripts/scenario-cli.test.ts src/content/serialize-scenario-catalog.ts src/content/serialize-scenario-catalog.test.ts src/generated/scenario-catalog.ts
git commit -m "feat(content): generate playable scenario catalog"
```

---

### Task 2: Add the IAM-001 investigation loader

**Files:**

- Create: `src/features/investigation/load-investigation.test.ts`
- Create: `src/features/investigation/load-investigation.ts`

- [ ] **Step 1: Write failing loader tests**

Create `src/features/investigation/load-investigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { loadInvestigationScenario } from './load-investigation'

describe('loadInvestigationScenario', () => {
  it('loads IAM-001 with a stable canonical seed', () => {
    const first = loadInvestigationScenario('iam-001')
    const second = loadInvestigationScenario('iam-001')

    expect(first.available).toBe(true)
    expect(second).toEqual(first)
    if (!first.available) return
    expect(first.instance.scenario.id).toBe('iam-001')
    expect(first.instance.composition.seed).toBe('iam-001:v1:canonical')
  })

  it('distinguishes authored but unavailable scenarios from unknown IDs', () => {
    expect(loadInvestigationScenario('fnd-001')).toEqual({
      available: false,
      scenarioId: 'fnd-001',
      reason: 'unavailable',
    })
    expect(loadInvestigationScenario('missing-001')).toEqual({
      available: false,
      scenarioId: 'missing-001',
      reason: 'unknown',
    })
  })
})
```

- [ ] **Step 2: Run the loader test and verify RED**

Run:

```sh
npx vitest run src/features/investigation/load-investigation.test.ts
```

Expected: FAIL because the loader does not exist.

- [ ] **Step 3: Implement the allow-listed loader**

Create `src/features/investigation/load-investigation.ts`:

```ts
import type { ScenarioSource } from '../../content/scenario-schema'
import { composeScenario } from '../../engine/compose-scenario'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { scenarioCatalog } from '../../generated/scenario-catalog'

const playableScenarioIds = new Set(['iam-001'])

export type InvestigationRouteResult =
  | { available: true; instance: ScenarioInstance }
  | {
      available: false
      scenarioId: string
      reason: 'unknown' | 'unavailable'
    }

export function canonicalScenarioSeed(scenario: ScenarioSource): string {
  return `${scenario.id}:v${scenario.version}:canonical`
}

export function loadInvestigationScenario(
  scenarioId: string,
  catalog: readonly ScenarioSource[] = scenarioCatalog,
): InvestigationRouteResult {
  const scenario = catalog.find(({ id }) => id === scenarioId)
  if (!scenario) return { available: false, scenarioId, reason: 'unknown' }
  if (!playableScenarioIds.has(scenarioId)) {
    return { available: false, scenarioId, reason: 'unavailable' }
  }

  return {
    available: true,
    instance: composeScenario(scenario, canonicalScenarioSeed(scenario)),
  }
}
```

- [ ] **Step 4: Verify the loader**

Run:

```sh
npx vitest run src/features/investigation/load-investigation.test.ts src/engine/compose-scenario.test.ts
npx tsc -b
npm run lint
```

Expected: loader and composition tests pass; TypeScript and lint pass.

- [ ] **Step 5: Commit the route loader**

```sh
git add src/features/investigation/load-investigation.ts src/features/investigation/load-investigation.test.ts
git commit -m "feat(investigation): load canonical IAM scenario"
```

---

### Task 3: Activate entry points and the incident introduction

**Files:**

- Create: `src/features/investigation/investigation-labels.ts`
- Create: `src/features/investigation/IncidentIntro.tsx`
- Create: `src/features/investigation/InvestigationPage.tsx`
- Create: `src/features/investigation/InvestigationPage.test.tsx`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/app/AppRoutes.test.tsx`
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/features/browse/ScenarioBrowserPage.tsx`
- Modify: `src/design/global.css`

- [ ] **Step 1: Write failing entry and intro tests**

Create `src/features/investigation/InvestigationPage.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IncidentIntro } from './IncidentIntro'
import { InvestigationPage } from './InvestigationPage'
import { loadInvestigationScenario } from './load-investigation'

function renderPage(path = '/scenarios/iam-001') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="scenarios/:scenarioId" element={<InvestigationPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InvestigationPage intro', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders a solution-safe IAM-001 introduction and begins investigation', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    renderPage()

    expect(
      screen.getByRole('heading', {
        name: 'Login works, feature does not',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/two finance users cannot complete/i)).toBeVisible()
    expect(screen.getByText('Service status')).toBeVisible()
    expect(screen.queryByText(/bulk cleanup removed/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/critical|supporting|red herring/i),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Begin investigation' }))

    expect(
      screen.getByRole('heading', { name: 'Investigation workspace' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['/scenarios/fnd-001', 'is not playable yet'],
    ['/scenarios/missing-001', 'could not be found'],
  ])('renders route recovery for %s', (path, message) => {
    renderPage(path)

    expect(screen.getByText(new RegExp(message, 'i'))).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Browse scenarios' }),
    ).toHaveAttribute('href', '/scenarios')
  })

  it('shows an authored optional budget', () => {
    const loaded = loadInvestigationScenario('iam-001')
    if (!loaded.available) throw new Error('Expected IAM-001')
    const instance = structuredClone(loaded.instance)
    instance.scenario.investigation_budget = 7

    render(<IncidentIntro instance={instance} onBegin={vi.fn()} />)

    expect(screen.getByText('Starting budget: 7')).toBeVisible()
  })
})
```

In `src/app/AppRoutes.test.tsx`, add `/scenarios/iam-001` to the route table and
replace the inactive-filter test with:

```tsx
it('offers the playable IAM-001 scenario without inactive filters', () => {
  renderRoute('/scenarios')

  expect(
    screen.getByRole('link', { name: /open login works, feature does not/i }),
  ).toHaveAttribute('href', '/scenarios/iam-001')
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
})
```

Add this route case to the parameterized test:

```ts
['/scenarios/iam-001', 'Login works, feature does not'],
```

- [ ] **Step 2: Run the route and intro tests and verify RED**

Run:

```sh
npx vitest run src/features/investigation/InvestigationPage.test.tsx src/app/AppRoutes.test.tsx
```

Expected: FAIL because the route, page, and playable browser card do not exist.

- [ ] **Step 3: Add label helpers**

Create `src/features/investigation/investigation-labels.ts`:

```ts
export function sentenceCase(value: string): string {
  const spaced = value.replaceAll('_', ' ').replaceAll('-', ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function evidenceLabel(evidenceId: string, tool: string): string {
  const explicit: Record<string, string> = {
    'affected-user-scope': 'Affected user scope',
    'authentication-events': 'Authentication events',
    'role-audit-history': 'Role audit history',
    'role-configuration': 'Role configuration',
    'service-status': 'Service status',
  }
  return explicit[evidenceId] ?? sentenceCase(tool)
}
```

- [ ] **Step 4: Implement the solution-safe incident intro**

Create `src/features/investigation/IncidentIntro.tsx`:

```tsx
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { sentenceCase } from './investigation-labels'

interface IncidentIntroProps {
  instance: ScenarioInstance
  onBegin: () => void
}

export function IncidentIntro({ instance, onBegin }: IncidentIntroProps) {
  const { scenario } = instance
  const tools = [...new Set(scenario.evidence.map(({ tool }) => tool))]

  return (
    <article
      className="incident-intro container"
      aria-labelledby="incident-title"
    >
      <header className="incident-intro__header">
        <div>
          <p className="eyebrow">Incident #{scenario.id.toUpperCase()}</p>
          <h1 id="incident-title">{scenario.title}</h1>
          <p className="incident-intro__customer">
            Customer: {instance.composition.customerName}
          </p>
        </div>
        <div className="incident-intro__badges" aria-label="Incident details">
          <Badge tone="accent">{sentenceCase(scenario.brief.severity)}</Badge>
          <Badge>{scenario.estimated_minutes} minutes</Badge>
        </div>
      </header>

      <div className="incident-intro__grid">
        <Card as="section" aria-labelledby="customer-report-title">
          <h2 id="customer-report-title">Customer report</h2>
          <blockquote>{scenario.brief.symptom}</blockquote>
          <h3>Business impact</h3>
          <p>{scenario.brief.business_impact}</p>
        </Card>
        <Card as="section" aria-labelledby="known-context-title">
          <h2 id="known-context-title">Known context</h2>
          <ul>
            {scenario.customer_context.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card as="section" aria-labelledby="available-tools-title">
          <h2 id="available-tools-title">Available tools</h2>
          <ul>
            {tools.map((tool) => (
              <li key={tool}>{sentenceCase(tool)}</li>
            ))}
          </ul>
          {scenario.investigation_budget === undefined ? null : (
            <p>Starting budget: {scenario.investigation_budget}</p>
          )}
        </Card>
      </div>

      <div className="incident-intro__action">
        <Button variant="primary" onClick={onBegin}>
          Begin investigation
        </Button>
      </div>
    </article>
  )
}
```

- [ ] **Step 5: Implement the route boundary and begin transition**

Create `src/features/investigation/InvestigationPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  InvestigationTransitionError,
  applyInvestigationCommand,
  createInvestigation,
} from '../../engine/investigation-engine'
import type { InvestigationState } from '../../engine/investigation-state'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { IncidentIntro } from './IncidentIntro'
import { loadInvestigationScenario } from './load-investigation'

export function InvestigationPage() {
  const { scenarioId = '' } = useParams()
  const loaded = useMemo(
    () => loadInvestigationScenario(scenarioId),
    [scenarioId],
  )

  if (!loaded.available) {
    return (
      <div className="page container not-found">
        <p className="eyebrow">Scenario unavailable</p>
        <h1>Investigation unavailable</h1>
        <p>
          {loaded.reason === 'unknown'
            ? `Scenario ${loaded.scenarioId || 'requested'} could not be found.`
            : `Scenario ${loaded.scenarioId} is not playable yet.`}
        </p>
        <Link className="button button--primary" to="/scenarios">
          Browse scenarios
        </Link>
      </div>
    )
  }

  return <AvailableInvestigation instance={loaded.instance} />
}

function AvailableInvestigation({ instance }: { instance: ScenarioInstance }) {
  const [state, setState] = useState<InvestigationState>(() =>
    createInvestigation(instance, Date.now()),
  )
  const [error, setError] = useState<string>()

  function begin() {
    try {
      setState(
        applyInvestigationCommand(instance, state, {
          type: 'begin_investigation',
        }),
      )
      setError(undefined)
    } catch (cause) {
      if (!(cause instanceof InvestigationTransitionError)) throw cause
      setError('Unable to begin the investigation. Try again.')
    }
  }

  return (
    <>
      <p className="visually-hidden" role="alert">
        {error}
      </p>
      {state.status === 'intro' ? (
        <IncidentIntro instance={instance} onBegin={begin} />
      ) : (
        <section className="page container" aria-labelledby="workspace-title">
          <h1 id="workspace-title">Investigation workspace</h1>
          <p>{instance.scenario.title}</p>
        </section>
      )}
    </>
  )
}
```

- [ ] **Step 6: Activate routing, landing, and the safe-index browser card**

In `src/app/AppRoutes.tsx`, import `InvestigationPage` and add after the browser
route:

```tsx
<Route path="scenarios/:scenarioId" element={<InvestigationPage />} />
```

In `src/pages/LandingPage.tsx`, change the primary CTA to:

```tsx
<ActionLink to="/scenarios/iam-001" variant="primary">
  Start an incident
</ActionLink>
```

Replace `src/features/browse/ScenarioBrowserPage.tsx` with:

```tsx
import { ActionLink } from '../../components/ActionLink'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import type { ScenarioIndexEntry } from '../../content/normalize-scenario'
import scenarioIndex from '../../generated/scenario-index.json'
import { sentenceCase } from '../investigation/investigation-labels'

const playable = (scenarioIndex as ScenarioIndexEntry[]).find(
  ({ id }) => id === 'iam-001',
)

export function ScenarioBrowserPage() {
  return (
    <div className="page container">
      <header className="page-header page-header--split">
        <div>
          <p className="eyebrow">Scenario library</p>
          <h1>Browse troubleshooting scenarios</h1>
        </div>
        <p>Start with the first complete identity and access investigation.</p>
      </header>
      {playable ? (
        <div className="scenario-grid">
          <Card className="scenario-card">
            <div className="scenario-card__badges">
              <Badge tone="accent">{sentenceCase(playable.difficulty)}</Badge>
              <Badge>{playable.estimatedMinutes} minutes</Badge>
            </div>
            <p className="eyebrow">{sentenceCase(playable.domain)}</p>
            <h2>{playable.title}</h2>
            <p>{playable.symptomSummary}</p>
            <ul aria-label="Concepts practised">
              {playable.concepts.map((concept) => (
                <li key={concept}>{sentenceCase(concept)}</li>
              ))}
            </ul>
            <ActionLink to={`/scenarios/${playable.id}`} variant="primary">
              Open {playable.title}
            </ActionLink>
          </Card>
        </div>
      ) : (
        <p role="status">The playable scenario is unavailable.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Add intro and browser-card styles**

Append to `src/design/global.css`:

```css
.scenario-grid {
  display: grid;
  grid-template-columns: minmax(0, 38rem);
}

.scenario-card {
  display: grid;
  gap: var(--space-4);
  box-shadow: var(--shadow-raised);
}

.scenario-card h2,
.scenario-card p,
.scenario-card ul {
  margin: 0;
}

.scenario-card__badges,
.incident-intro__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.incident-intro {
  padding-block: clamp(3rem, 8vw, 6rem);
}

.incident-intro__header {
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-7);
}

.incident-intro__header h1 {
  max-width: 14ch;
  margin-bottom: var(--space-3);
}

.incident-intro__customer {
  color: var(--color-text-soft);
}

.incident-intro__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.incident-intro__grid h2 {
  font-size: 1.25rem;
}

.incident-intro__grid blockquote {
  margin: 0 0 var(--space-5);
  color: var(--color-text-soft);
  font-size: 1.08rem;
}

.incident-intro__action {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-6);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 820px) {
  .incident-intro__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .incident-intro__header {
    flex-direction: column;
  }

  .incident-intro__action .button {
    width: 100%;
  }
}
```

- [ ] **Step 8: Verify entry and intro behavior**

Run:

```sh
npx vitest run src/features/investigation/InvestigationPage.test.tsx src/app/AppRoutes.test.tsx src/App.test.tsx
npx tsc -b
npm run lint
```

Expected: entry, intro, routing, and existing app tests pass.

- [ ] **Step 9: Commit the first UI entry**

```sh
git add src/features/investigation/investigation-labels.ts src/features/investigation/IncidentIntro.tsx src/features/investigation/InvestigationPage.tsx src/features/investigation/InvestigationPage.test.tsx src/app/AppRoutes.tsx src/app/AppRoutes.test.tsx src/pages/LandingPage.tsx src/features/browse/ScenarioBrowserPage.tsx src/design/global.css
git commit -m "feat(ui): add IAM incident introduction"
```

---

### Task 4: Render every evidence content kind safely

**Files:**

- Create: `src/features/investigation/EvidenceContent.test.tsx`
- Create: `src/features/investigation/EvidenceContent.tsx`

- [ ] **Step 1: Write failing semantic renderer tests**

Create `src/features/investigation/EvidenceContent.test.tsx` with one test per
content discriminant:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EvidenceContent } from './EvidenceContent'

describe('EvidenceContent', () => {
  it('renders text evidence', () => {
    render(
      <EvidenceContent content={{ kind: 'text', text: 'Customer note' }} />,
    )
    expect(screen.getByText('Customer note')).toBeVisible()
  })

  it('renders status evidence', () => {
    render(
      <EvidenceContent
        content={{ kind: 'status', state: 'operational', detail: 'Healthy' }}
      />,
    )
    expect(screen.getByText('Operational')).toBeVisible()
    expect(screen.getByText('Healthy')).toBeVisible()
  })

  it('renders key/value evidence as a description list', () => {
    render(
      <EvidenceContent
        content={{
          kind: 'key_value',
          values: { account_status: 'Active', reporting_role: 'Missing' },
        }}
      />,
    )
    expect(screen.getByText('Account status')).toBeVisible()
    expect(screen.getByText('Missing')).toBeVisible()
  })

  it('renders table evidence with column headers', () => {
    render(
      <EvidenceContent
        content={{
          kind: 'table',
          columns: ['cohort', 'access'],
          rows: [{ cohort: 'Affected', access: 'Denied' }],
        }}
      />,
    )
    const table = screen.getByRole('table')
    expect(
      within(table).getByRole('columnheader', { name: 'Cohort' }),
    ).toBeVisible()
    expect(within(table).getByRole('cell', { name: 'Denied' })).toBeVisible()
  })

  it('renders timeline evidence as an ordered list', () => {
    render(
      <EvidenceContent
        content={{
          kind: 'timeline',
          events: [{ time: 'Day 0 09:02', event: 'Sign-in succeeded.' }],
        }}
      />,
    )
    expect(screen.getByRole('list')).toHaveClass('evidence-timeline')
    expect(screen.getByText('Day 0 09:02')).toBeVisible()
    expect(screen.getByText('Sign-in succeeded.')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the renderer tests and verify RED**

Run:

```sh
npx vitest run src/features/investigation/EvidenceContent.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the exhaustive renderers**

Create `src/features/investigation/EvidenceContent.tsx`:

```tsx
import type { ScenarioInstanceEvidence } from '../../engine/scenario-instance'
import { sentenceCase } from './investigation-labels'

export function EvidenceContent({
  content,
}: {
  content: ScenarioInstanceEvidence['content']
}) {
  if (content.kind === 'text') return <p>{content.text}</p>

  if (content.kind === 'status') {
    return (
      <div className="evidence-status">
        <strong>{sentenceCase(content.state)}</strong>
        <p>{content.detail}</p>
      </div>
    )
  }

  if (content.kind === 'key_value') {
    return (
      <dl className="evidence-values">
        {Object.entries(content.values).map(([key, value]) => (
          <div key={key}>
            <dt>{sentenceCase(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    )
  }

  if (content.kind === 'table') {
    return (
      <div className="evidence-table-scroll">
        <table>
          <thead>
            <tr>
              {content.columns.map((column) => (
                <th key={column} scope="col">
                  {sentenceCase(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, index) => (
              <tr key={index}>
                {content.columns.map((column) => (
                  <td key={column}>{row[column] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (content.kind === 'timeline') {
    return (
      <ol className="evidence-timeline">
        {content.events.map((event, index) => (
          <li key={`${event.time}-${index}`}>
            <time>{event.time}</time>
            <p>{event.event}</p>
          </li>
        ))}
      </ol>
    )
  }

  const exhaustive: never = content
  return exhaustive
}
```

- [ ] **Step 4: Verify renderer coverage**

Run:

```sh
npx vitest run src/features/investigation/EvidenceContent.test.tsx
npx tsc -b
npm run lint
```

Expected: all five renderer tests, TypeScript, and lint pass.

- [ ] **Step 5: Commit the content renderers**

```sh
git add src/features/investigation/EvidenceContent.tsx src/features/investigation/EvidenceContent.test.tsx
git commit -m "feat(ui): render investigation evidence"
```

---

### Task 5: Connect the workspace to the pure engine

**Files:**

- Create: `src/features/investigation/useInvestigationController.test.ts`
- Create: `src/features/investigation/useInvestigationController.ts`
- Create: `src/features/investigation/EvidenceToolList.tsx`
- Create: `src/features/investigation/EvidenceViewer.tsx`
- Create: `src/features/investigation/InvestigationWorkspace.tsx`
- Create: `src/features/investigation/InvestigationWorkspace.test.tsx`
- Modify: `src/features/investigation/InvestigationPage.tsx`
- Modify: `src/design/global.css`

- [ ] **Step 1: Write failing controller tests**

Create `src/features/investigation/useInvestigationController.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InvestigationTransitionError } from '../../engine/investigation-engine'
import { loadInvestigationScenario } from './load-investigation'
import { useInvestigationController } from './useInvestigationController'

function iamInstance() {
  const loaded = loadInvestigationScenario('iam-001')
  if (!loaded.available) throw new Error('Expected IAM-001')
  return loaded.instance
}

describe('useInvestigationController', () => {
  it('delegates begin and evidence opening to the engine', () => {
    const { result } = renderHook(() =>
      useInvestigationController(iamInstance(), 1_000),
    )

    act(() => result.current.begin())
    act(() => result.current.openEvidence('service-status'))

    expect(result.current.state.status).toBe('investigating')
    expect(result.current.state.openedEvidenceIds).toEqual(['service-status'])
    expect(result.current.selectedEvidenceId).toBe('service-status')
    expect(result.current.activeTab).toBe('evidence')
  })

  it('selects opened evidence without adding an engine action', () => {
    const { result } = renderHook(() =>
      useInvestigationController(iamInstance(), 1_000),
    )
    act(() => result.current.begin())
    act(() => result.current.openEvidence('service-status'))
    const actionCount = result.current.state.actions.length

    act(() => result.current.selectEvidence('service-status'))

    expect(result.current.state.actions).toHaveLength(actionCount)
  })

  it('preserves the last valid state and announces transition errors', () => {
    const instance = iamInstance()
    const transition = () => {
      throw new InvestigationTransitionError('EVIDENCE_LOCKED', 'locked')
    }
    const { result } = renderHook(() =>
      useInvestigationController(instance, 1_000, transition),
    )
    const before = result.current.state

    act(() => result.current.begin())

    expect(result.current.state).toBe(before)
    expect(result.current.error).toBe(
      'Unable to update the investigation. Try again.',
    )
  })

  it('does not swallow non-domain programming errors', () => {
    const transition = () => {
      throw new TypeError('programming defect')
    }
    const { result } = renderHook(() =>
      useInvestigationController(iamInstance(), 1_000, transition),
    )

    expect(() => act(() => result.current.begin())).toThrow(
      'programming defect',
    )
  })
})
```

- [ ] **Step 2: Run the controller tests and verify RED**

Run:

```sh
npx vitest run src/features/investigation/useInvestigationController.test.ts
```

Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement local engine and view state ownership**

Create `src/features/investigation/useInvestigationController.ts`:

```ts
import { useMemo, useState } from 'react'

import {
  InvestigationTransitionError,
  applyInvestigationCommand,
  createInvestigation,
} from '../../engine/investigation-engine'
import { getInvestigationEvidenceViews } from '../../engine/investigation-selectors'
import type {
  InvestigationCommand,
  InvestigationState,
} from '../../engine/investigation-state'
import type { ScenarioInstance } from '../../engine/scenario-instance'

export type WorkspaceTab = 'tools' | 'evidence' | 'notebook'
type Transition = typeof applyInvestigationCommand

export function useInvestigationController(
  instance: ScenarioInstance,
  startedAt: number,
  transition: Transition = applyInvestigationCommand,
) {
  const [state, setState] = useState<InvestigationState>(() =>
    createInvestigation(instance, startedAt),
  )
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>()
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tools')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()

  const evidenceViews = useMemo(
    () => getInvestigationEvidenceViews(instance, state),
    [instance, state],
  )

  function send(command: InvestigationCommand): boolean {
    try {
      const next = transition(instance, state, command)
      setState(next)
      setError(undefined)
      return true
    } catch (cause) {
      if (!(cause instanceof InvestigationTransitionError)) throw cause
      setError('Unable to update the investigation. Try again.')
      return false
    }
  }

  function begin() {
    send({ type: 'begin_investigation' })
  }

  function openEvidence(evidenceId: string) {
    if (!send({ type: 'open_evidence', evidenceId })) return
    setSelectedEvidenceId(evidenceId)
    setActiveTab('evidence')
  }

  function selectEvidence(evidenceId: string) {
    if (!state.openedEvidenceIds.includes(evidenceId)) return
    setSelectedEvidenceId(evidenceId)
    setActiveTab('evidence')
  }

  function toggleBookmark(evidenceId: string) {
    send({
      type: state.bookmarkedEvidenceIds.includes(evidenceId)
        ? 'unbookmark_evidence'
        : 'bookmark_evidence',
      evidenceId,
    })
  }

  function selectHypothesis(hypothesisId: string) {
    send({ type: 'select_hypothesis', hypothesisId })
  }

  return {
    state,
    evidenceViews,
    selectedEvidenceId,
    activeTab,
    ready,
    error,
    begin,
    openEvidence,
    selectEvidence,
    toggleBookmark,
    selectHypothesis,
    setActiveTab,
    setReady,
  }
}
```

- [ ] **Step 4: Write failing workspace interaction tests**

Create `src/features/investigation/InvestigationWorkspace.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { InvestigationPage } from './InvestigationPage'

function renderWorkspace() {
  const rendered = render(
    <MemoryRouter initialEntries={['/scenarios/iam-001']}>
      <Routes>
        <Route path="scenarios/:scenarioId" element={<InvestigationPage />} />
      </Routes>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Begin investigation' }))
  return rendered
}

describe('InvestigationWorkspace', () => {
  it('opens available evidence and unlocks dependencies', () => {
    renderWorkspace()

    expect(
      screen.getByRole('button', { name: /authentication events.*locked/i }),
    ).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: /open affected user scope.*cost 1/i }),
    )

    expect(
      screen.getByRole('heading', { name: 'Affected user scope' }),
    ).toHaveFocus()
    expect(
      screen.getByRole('button', {
        name: /open authentication events.*cost 2/i,
      }),
    ).toBeEnabled()
    expect(screen.getByRole('table')).toBeVisible()
  })

  it('selects opened evidence without charging twice', () => {
    renderWorkspace()
    const service = screen.getByRole('button', {
      name: /open service status.*cost 1/i,
    })
    fireEvent.click(service)

    expect(
      screen.getByRole('button', { name: /view service status.*opened/i }),
    ).toBeEnabled()
    expect(
      screen.getByText(/reporting and identity services are healthy/i),
    ).toBeVisible()
  })

  it('does not render hidden evidence or solution metadata', () => {
    const { container } = renderWorkspace()
    fireEvent.click(
      screen.getByRole('button', { name: /open service status.*cost 1/i }),
    )
    const serialized = container.textContent ?? ''

    expect(serialized).not.toMatch(/supporting|critical|red_herring/i)
    expect(serialized).not.toContain(
      'Healthy services make a platform-wide outage less likely',
    )
    expect(serialized).not.toContain('bulk cleanup removed')
  })
})
```

- [ ] **Step 5: Implement evidence tools and viewer**

Create `src/features/investigation/EvidenceToolList.tsx`:

```tsx
import type { InvestigationEvidenceView } from '../../engine/investigation-selectors'
import { evidenceLabel } from './investigation-labels'

interface EvidenceToolListProps {
  evidence: InvestigationEvidenceView[]
  selectedEvidenceId?: string
  onOpen: (evidenceId: string) => void
  onSelect: (evidenceId: string) => void
}

export function EvidenceToolList({
  evidence,
  selectedEvidenceId,
  onOpen,
  onSelect,
}: EvidenceToolListProps) {
  return (
    <div className="tool-list">
      {evidence.map((item) => {
        const label = evidenceLabel(item.id, item.tool)
        const opened = item.state === 'opened'
        const locked = item.state === 'locked'
        return (
          <button
            key={item.id}
            type="button"
            className="tool-list__item"
            aria-current={selectedEvidenceId === item.id ? 'true' : undefined}
            aria-label={
              locked
                ? `${label}, locked`
                : opened
                  ? `View ${label}, opened`
                  : `Open ${label}, cost ${item.cost}`
            }
            disabled={locked}
            onClick={() => (opened ? onSelect(item.id) : onOpen(item.id))}
          >
            <span>{label}</span>
            <small>
              {locked ? 'Locked' : opened ? 'Opened' : `Cost ${item.cost}`}
            </small>
          </button>
        )
      })}
    </div>
  )
}
```

Create `src/features/investigation/EvidenceViewer.tsx`:

```tsx
import { forwardRef } from 'react'

import { Button } from '../../components/Button'
import type { InvestigationEvidenceView } from '../../engine/investigation-selectors'
import { EvidenceContent } from './EvidenceContent'
import { evidenceLabel } from './investigation-labels'

interface EvidenceViewerProps {
  evidence?: InvestigationEvidenceView
  bookmarked: boolean
  onToggleBookmark: (evidenceId: string) => void
}

export const EvidenceViewer = forwardRef<
  HTMLHeadingElement,
  EvidenceViewerProps
>(function EvidenceViewer({ evidence, bookmarked, onToggleBookmark }, ref) {
  if (!evidence || evidence.state !== 'opened' || !evidence.content) {
    return (
      <div className="evidence-empty">
        <h2 ref={ref} tabIndex={-1}>
          Evidence viewer
        </h2>
        <p>Open an available investigation tool to inspect its evidence.</p>
      </div>
    )
  }

  const label = evidenceLabel(evidence.id, evidence.tool)
  return (
    <article className="evidence-viewer">
      <header className="evidence-viewer__header">
        <div>
          <p className="eyebrow">Opened evidence</p>
          <h2 ref={ref} tabIndex={-1}>
            {label}
          </h2>
        </div>
        <Button onClick={() => onToggleBookmark(evidence.id)}>
          {bookmarked ? `Remove ${label} bookmark` : `Bookmark ${label}`}
        </Button>
      </header>
      <EvidenceContent content={evidence.content} />
    </article>
  )
})
```

- [ ] **Step 6: Implement the desktop workspace and focus behavior**

Create `src/features/investigation/InvestigationWorkspace.tsx`:

```tsx
import { useEffect, useRef } from 'react'

import type { ScenarioInstance } from '../../engine/scenario-instance'
import { EvidenceToolList } from './EvidenceToolList'
import { EvidenceViewer } from './EvidenceViewer'
import type { useInvestigationController } from './useInvestigationController'

type Controller = ReturnType<typeof useInvestigationController>

export function InvestigationWorkspace({
  instance,
  controller,
}: {
  instance: ScenarioInstance
  controller: Controller
}) {
  const evidenceHeading = useRef<HTMLHeadingElement>(null)
  const selected = controller.evidenceViews.find(
    ({ id }) => id === controller.selectedEvidenceId,
  )

  useEffect(() => {
    if (controller.selectedEvidenceId) evidenceHeading.current?.focus()
  }, [controller.selectedEvidenceId])

  return (
    <article className="investigation" aria-labelledby="investigation-title">
      <header className="investigation__header">
        <div>
          <p className="eyebrow">
            Incident #{instance.scenario.id.toUpperCase()}
          </p>
          <h1 id="investigation-title">{instance.scenario.title}</h1>
          <p>{instance.composition.customerName}</p>
        </div>
        <dl className="investigation__metrics">
          <div>
            <dt>Opened</dt>
            <dd>
              {controller.state.openedEvidenceIds.length}/
              {controller.evidenceViews.length}
            </dd>
          </div>
          {controller.state.budgetRemaining === undefined ? null : (
            <div>
              <dt>Budget</dt>
              <dd>{controller.state.budgetRemaining}</dd>
            </div>
          )}
        </dl>
      </header>
      <p className="investigation__impact">
        {instance.scenario.brief.business_impact}
      </p>
      <p className="visually-hidden" role="alert">
        {controller.error}
      </p>

      <div className="workspace-grid">
        <section className="workspace-panel" aria-labelledby="tools-title">
          <h2 id="tools-title">Investigation tools</h2>
          <EvidenceToolList
            evidence={controller.evidenceViews}
            selectedEvidenceId={controller.selectedEvidenceId}
            onOpen={controller.openEvidence}
            onSelect={controller.selectEvidence}
          />
        </section>
        <section
          className="workspace-panel workspace-panel--evidence"
          aria-label="Evidence"
        >
          <EvidenceViewer
            ref={evidenceHeading}
            evidence={selected}
            bookmarked={
              selected
                ? controller.state.bookmarkedEvidenceIds.includes(selected.id)
                : false
            }
            onToggleBookmark={controller.toggleBookmark}
          />
        </section>
        <section className="workspace-panel" aria-labelledby="notebook-title">
          <h2 id="notebook-title">Case notebook</h2>
          <p>
            Bookmark observations and select a hypothesis as you investigate.
          </p>
        </section>
      </div>
    </article>
  )
}
```

- [ ] **Step 7: Replace the page’s inline state with the controller**

In `InvestigationPage.tsx`, make `AvailableInvestigation` create one controller:

```tsx
const [startedAt] = useState(Date.now)
const controller = useInvestigationController(instance, startedAt)
```

Render:

```tsx
return controller.state.status === 'intro' ? (
  <IncidentIntro instance={instance} onBegin={controller.begin} />
) : (
  <InvestigationWorkspace instance={instance} controller={controller} />
)
```

Remove the direct engine imports and inline state/error implementation.

- [ ] **Step 8: Add desktop workspace and evidence styles**

Append to `src/design/global.css`:

```css
.investigation {
  width: min(92rem, calc(100% - 2rem));
  margin-inline: auto;
  padding-block: var(--space-6);
}

.investigation__header {
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
  justify-content: space-between;
}

.investigation__header h1 {
  margin-bottom: var(--space-2);
  font-size: clamp(2rem, 5vw, 3.5rem);
}

.investigation__metrics {
  display: flex;
  gap: var(--space-5);
  margin: 0;
}

.investigation__metrics div {
  min-width: 5rem;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
}

.investigation__metrics dt {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
}

.investigation__metrics dd {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.investigation__impact {
  max-width: var(--reading-width);
  color: var(--color-text-soft);
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(15rem, 0.7fr) minmax(24rem, 1.5fr) minmax(
      17rem,
      0.8fr
    );
  gap: var(--space-4);
  align-items: start;
}

.workspace-panel {
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  background: var(--color-surface-glass);
}

.workspace-panel > h2,
.evidence-empty h2,
.evidence-viewer h2 {
  font-size: 1.25rem;
  letter-spacing: 0;
}

.tool-list {
  display: grid;
  gap: var(--space-2);
}

.tool-list__item {
  display: flex;
  width: 100%;
  min-height: 3.5rem;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.tool-list__item[aria-current='true'] {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.tool-list__item:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.tool-list__item small {
  color: var(--color-text-muted);
}

.evidence-viewer__header {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}

.evidence-viewer__header h2 {
  margin-bottom: 0;
}

.evidence-status {
  padding: var(--space-5);
  border-left: 3px solid var(--color-accent);
  background: var(--color-surface);
}

.evidence-status p {
  margin: var(--space-2) 0 0;
}

.evidence-table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.evidence-table-scroll table {
  width: 100%;
  border-collapse: collapse;
}

.evidence-table-scroll th,
.evidence-table-scroll td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.evidence-timeline {
  display: grid;
  gap: var(--space-4);
  padding-left: var(--space-5);
}

.evidence-timeline time {
  color: var(--color-learning);
  font-size: 0.85rem;
  font-weight: 750;
}

.evidence-timeline p {
  margin: var(--space-1) 0 0;
}
```

- [ ] **Step 9: Verify the connected workspace**

Run:

```sh
npx vitest run src/features/investigation/useInvestigationController.test.ts src/features/investigation/InvestigationWorkspace.test.tsx src/features/investigation/InvestigationPage.test.tsx
npx tsc -b
npm run lint
```

Expected: controller, workspace, page, TypeScript, and lint pass.

- [ ] **Step 10: Commit the engine-connected workspace**

```sh
git add src/features/investigation/useInvestigationController.ts src/features/investigation/useInvestigationController.test.ts src/features/investigation/EvidenceToolList.tsx src/features/investigation/EvidenceViewer.tsx src/features/investigation/InvestigationWorkspace.tsx src/features/investigation/InvestigationWorkspace.test.tsx src/features/investigation/InvestigationPage.tsx src/design/global.css
git commit -m "feat(ui): connect investigation workspace"
```

---

### Task 6: Add the notebook and ready-to-diagnose checkpoint

**Files:**

- Create: `src/features/investigation/CaseNotebook.test.tsx`
- Create: `src/features/investigation/CaseNotebook.tsx`
- Create: `src/features/investigation/ReadyToDiagnose.test.tsx`
- Create: `src/features/investigation/ReadyToDiagnose.tsx`
- Modify: `src/features/investigation/InvestigationWorkspace.tsx`
- Modify: `src/features/investigation/InvestigationPage.tsx`
- Modify: `src/design/global.css`

- [ ] **Step 1: Write failing notebook tests**

Create `src/features/investigation/CaseNotebook.test.tsx` using IAM-001’s
composed instance and controlled callbacks:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { InvestigationAction } from '../../engine/investigation-state'
import { loadInvestigationScenario } from './load-investigation'
import { CaseNotebook } from './CaseNotebook'

function instance() {
  const loaded = loadInvestigationScenario('iam-001')
  if (!loaded.available) throw new Error('Expected IAM-001')
  return loaded.instance
}

describe('CaseNotebook', () => {
  it('selects bookmarked observations and authored hypotheses', () => {
    const onSelectEvidence = vi.fn()
    const onSelectHypothesis = vi.fn()
    render(
      <CaseNotebook
        instance={instance()}
        bookmarkedEvidenceIds={['service-status']}
        selectedHypothesisId={undefined}
        actions={[]}
        onSelectEvidence={onSelectEvidence}
        onSelectHypothesis={onSelectHypothesis}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View Service status' }))
    fireEvent.click(
      screen.getByRole('radio', {
        name: /recent role change removed/i,
      }),
    )

    expect(onSelectEvidence).toHaveBeenCalledWith('service-status')
    expect(onSelectHypothesis).toHaveBeenCalledWith('reporting-role-removed')
  })

  it('renders a concise successful action trail', () => {
    const actions: InvestigationAction[] = [
      { sequence: 1, type: 'begin_investigation' },
      {
        sequence: 2,
        type: 'open_evidence',
        evidenceId: 'service-status',
        cost: 1,
      },
      { sequence: 3, type: 'bookmark_evidence', evidenceId: 'service-status' },
      {
        sequence: 4,
        type: 'select_hypothesis',
        hypothesisId: 'reporting-service-outage',
      },
    ]
    render(
      <CaseNotebook
        instance={instance()}
        bookmarkedEvidenceIds={['service-status']}
        selectedHypothesisId="reporting-service-outage"
        actions={actions}
        onSelectEvidence={vi.fn()}
        onSelectHypothesis={vi.fn()}
      />,
    )

    expect(screen.getByText('Opened Service status')).toBeVisible()
    expect(screen.getByText('Bookmarked Service status')).toBeVisible()
    expect(
      screen.getByText(/selected hypothesis.*service outage/i),
    ).toBeVisible()
  })
})
```

- [ ] **Step 2: Run notebook tests and verify RED**

Run:

```sh
npx vitest run src/features/investigation/CaseNotebook.test.tsx
```

Expected: FAIL because `CaseNotebook` does not exist.

- [ ] **Step 3: Implement observations, hypotheses, and action trail**

Create `src/features/investigation/CaseNotebook.tsx`:

```tsx
import type { InvestigationAction } from '../../engine/investigation-state'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { evidenceLabel } from './investigation-labels'

interface CaseNotebookProps {
  instance: ScenarioInstance
  bookmarkedEvidenceIds: string[]
  selectedHypothesisId?: string
  actions: InvestigationAction[]
  onSelectEvidence: (evidenceId: string) => void
  onSelectHypothesis: (hypothesisId: string) => void
}

export function CaseNotebook({
  instance,
  bookmarkedEvidenceIds,
  selectedHypothesisId,
  actions,
  onSelectEvidence,
  onSelectHypothesis,
}: CaseNotebookProps) {
  function evidenceName(id: string) {
    const evidence = instance.scenario.evidence.find((item) => item.id === id)
    return evidence ? evidenceLabel(evidence.id, evidence.tool) : id
  }

  function actionLabel(action: InvestigationAction): string {
    if (action.type === 'begin_investigation') return 'Began investigation'
    if (action.type === 'open_evidence')
      return `Opened ${evidenceName(action.evidenceId)}`
    if (action.type === 'bookmark_evidence')
      return `Bookmarked ${evidenceName(action.evidenceId)}`
    if (action.type === 'unbookmark_evidence')
      return `Removed ${evidenceName(action.evidenceId)} bookmark`
    const hypothesis = instance.scenario.hypotheses.find(
      ({ id }) => id === action.hypothesisId,
    )
    return `Selected hypothesis: ${hypothesis?.label ?? action.hypothesisId}`
  }

  return (
    <div className="case-notebook">
      <section aria-labelledby="observations-title">
        <h3 id="observations-title">Observations</h3>
        {bookmarkedEvidenceIds.length === 0 ? (
          <p>No evidence bookmarked yet.</p>
        ) : (
          <ul>
            {bookmarkedEvidenceIds.map((id) => (
              <li key={id}>
                <button type="button" onClick={() => onSelectEvidence(id)}>
                  View {evidenceName(id)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <fieldset>
        <legend>Current hypothesis</legend>
        {instance.scenario.hypotheses.map((hypothesis) => (
          <label key={hypothesis.id}>
            <input
              type="radio"
              name="current-hypothesis"
              value={hypothesis.id}
              checked={selectedHypothesisId === hypothesis.id}
              onChange={() => onSelectHypothesis(hypothesis.id)}
            />
            <span>{hypothesis.label}</span>
          </label>
        ))}
      </fieldset>

      <section aria-labelledby="trail-title">
        <h3 id="trail-title">Investigation trail</h3>
        <ol className="investigation-trail">
          {actions.map((action) => (
            <li key={action.sequence}>{actionLabel(action)}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Write failing checkpoint tests**

Create `src/features/investigation/ReadyToDiagnose.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { loadInvestigationScenario } from './load-investigation'
import { ReadyToDiagnose } from './ReadyToDiagnose'

function instance() {
  const loaded = loadInvestigationScenario('iam-001')
  if (!loaded.available) throw new Error('Expected IAM-001')
  return loaded.instance
}

describe('ReadyToDiagnose', () => {
  it('focuses and summarizes without exposing correctness or scoring', () => {
    render(
      <ReadyToDiagnose
        instance={instance()}
        selectedHypothesisId="reporting-service-outage"
        bookmarkedEvidenceIds={['service-status']}
        openedCount={2}
        totalEvidence={5}
        onReturn={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Ready to diagnose' }),
    ).toHaveFocus()
    expect(
      screen.getByText(/reporting service is experiencing an outage/i),
    ).toBeVisible()
    expect(screen.getByText('Service status')).toBeVisible()
    expect(screen.getByText('2 of 5 evidence sources opened')).toBeVisible()
    expect(
      screen.queryByText(/correct|score|root cause/i),
    ).not.toBeInTheDocument()
  })

  it('returns to the investigation', () => {
    const onReturn = vi.fn()
    render(
      <ReadyToDiagnose
        instance={instance()}
        selectedHypothesisId="reporting-service-outage"
        bookmarkedEvidenceIds={[]}
        openedCount={1}
        totalEvidence={5}
        onReturn={onReturn}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Return to investigation' }),
    )
    expect(onReturn).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 5: Implement the ready checkpoint**

Create `src/features/investigation/ReadyToDiagnose.tsx`:

```tsx
import { useEffect, useRef } from 'react'

import { Button } from '../../components/Button'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { evidenceLabel } from './investigation-labels'

interface ReadyToDiagnoseProps {
  instance: ScenarioInstance
  selectedHypothesisId: string
  bookmarkedEvidenceIds: string[]
  openedCount: number
  totalEvidence: number
  onReturn: () => void
}

export function ReadyToDiagnose({
  instance,
  selectedHypothesisId,
  bookmarkedEvidenceIds,
  openedCount,
  totalEvidence,
  onReturn,
}: ReadyToDiagnoseProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const hypothesis = instance.scenario.hypotheses.find(
    ({ id }) => id === selectedHypothesisId,
  )

  useEffect(() => heading.current?.focus(), [])

  return (
    <section
      className="ready-checkpoint container"
      aria-labelledby="ready-title"
    >
      <p className="eyebrow">Investigation checkpoint</p>
      <h1 id="ready-title" ref={heading} tabIndex={-1}>
        Ready to diagnose
      </h1>
      <p>
        You have formed a hypothesis and can review your evidence before
        submission.
      </p>
      <dl>
        <div>
          <dt>Current hypothesis</dt>
          <dd>{hypothesis?.label ?? selectedHypothesisId}</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>
            {openedCount} of {totalEvidence} evidence sources opened
          </dd>
        </div>
      </dl>
      <h2>Bookmarked evidence</h2>
      {bookmarkedEvidenceIds.length === 0 ? (
        <p>No evidence bookmarked.</p>
      ) : (
        <ul>
          {bookmarkedEvidenceIds.map((id) => {
            const evidence = instance.scenario.evidence.find(
              (item) => item.id === id,
            )
            return (
              <li key={id}>
                {evidence ? evidenceLabel(id, evidence.tool) : id}
              </li>
            )
          })}
        </ul>
      )}
      <p className="ready-checkpoint__boundary">
        Diagnosis submission begins in the next product milestone.
      </p>
      <Button variant="primary" onClick={onReturn}>
        Return to investigation
      </Button>
    </section>
  )
}
```

- [ ] **Step 6: Connect notebook and checkpoint to workspace/page**

In `InvestigationWorkspace.tsx`, replace the notebook prose with:

```tsx
<CaseNotebook
  instance={instance}
  bookmarkedEvidenceIds={controller.state.bookmarkedEvidenceIds}
  selectedHypothesisId={controller.state.selectedHypothesisId}
  actions={controller.state.actions}
  onSelectEvidence={controller.selectEvidence}
  onSelectHypothesis={controller.selectHypothesis}
/>
<button
  ref={readyButtonRef}
  type="button"
  className="button button--primary"
  disabled={!controller.state.selectedHypothesisId}
  onClick={() => controller.setReady(true)}
>
  Ready to diagnose
</button>
```

Add `readyButtonRef: RefObject<HTMLButtonElement | null>` to the workspace
props and import `Button`, `CaseNotebook`, and `RefObject`.

In `InvestigationPage.tsx`, add a ready button ref and restoration flag:

```tsx
const readyButtonRef = useRef<HTMLButtonElement>(null)
const [restoreReadyFocus, setRestoreReadyFocus] = useState(false)

useEffect(() => {
  if (!controller.ready && restoreReadyFocus) {
    readyButtonRef.current?.focus()
    setRestoreReadyFocus(false)
  }
}, [controller.ready, restoreReadyFocus])
```

When `controller.ready` and `selectedHypothesisId` are set, render
`ReadyToDiagnose`. Its return callback must call:

```tsx
controller.setReady(false)
setRestoreReadyFocus(true)
```

Otherwise render `InvestigationWorkspace` with `readyButtonRef`.

- [ ] **Step 7: Add notebook and checkpoint styles**

Append to `src/design/global.css`:

```css
.case-notebook {
  display: grid;
  gap: var(--space-5);
}

.case-notebook h3,
.case-notebook legend {
  margin-bottom: var(--space-3);
  font-size: 1rem;
  font-weight: 800;
}

.case-notebook ul,
.investigation-trail {
  margin: 0;
  padding-left: var(--space-5);
}

.case-notebook fieldset {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  border: 0;
}

.case-notebook label {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2);
  align-items: start;
}

.case-notebook button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent-strong);
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.ready-checkpoint {
  max-width: 52rem;
  padding-block: clamp(3rem, 8vw, 6rem);
}

.ready-checkpoint h1 {
  margin-bottom: var(--space-4);
}

.ready-checkpoint dl {
  display: grid;
  gap: var(--space-3);
  margin-block: var(--space-6);
}

.ready-checkpoint dl div {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
}

.ready-checkpoint dt {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
}

.ready-checkpoint dd {
  margin: var(--space-2) 0 0;
  font-weight: 750;
}

.ready-checkpoint__boundary {
  margin-block: var(--space-6);
  color: var(--color-text-soft);
}
```

- [ ] **Step 8: Verify notebook and checkpoint**

Run:

```sh
npx vitest run src/features/investigation/CaseNotebook.test.tsx src/features/investigation/ReadyToDiagnose.test.tsx src/features/investigation/InvestigationWorkspace.test.tsx src/features/investigation/InvestigationPage.test.tsx
npx tsc -b
npm run lint
```

Expected: notebook, checkpoint, workspace, page, TypeScript, and lint pass.

- [ ] **Step 9: Commit the reasoning checkpoint**

```sh
git add src/features/investigation/CaseNotebook.tsx src/features/investigation/CaseNotebook.test.tsx src/features/investigation/ReadyToDiagnose.tsx src/features/investigation/ReadyToDiagnose.test.tsx src/features/investigation/InvestigationWorkspace.tsx src/features/investigation/InvestigationPage.tsx src/design/global.css
git commit -m "feat(ui): add investigation notebook"
```

---

### Task 7: Add responsive accessible workspace tabs

**Files:**

- Create: `src/features/investigation/useMediaQuery.test.tsx`
- Create: `src/features/investigation/useMediaQuery.ts`
- Create: `src/features/investigation/WorkspaceTabs.test.tsx`
- Create: `src/features/investigation/WorkspaceTabs.tsx`
- Modify: `src/features/investigation/InvestigationWorkspace.tsx`
- Modify: `src/test/setup.ts`
- Modify: `src/design/global.css`

- [ ] **Step 1: Add a controllable `matchMedia` test shim**

Append to `src/test/setup.ts`:

```ts
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})
```

Add `import { vi } from 'vitest'` after the jest-dom import.

- [ ] **Step 2: Write failing media-query tests**

Create `src/features/investigation/useMediaQuery.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useMediaQuery } from './useMediaQuery'

afterEach(() => vi.restoreAllMocks())

it('tracks media query changes', () => {
  let listener: ((event: MediaQueryListEvent) => void) | undefined
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
    media: '(max-width: 820px)',
    onchange: null,
    addEventListener: (_type, next) => {
      listener = next as (event: MediaQueryListEvent) => void
    },
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })

  const { result } = renderHook(() => useMediaQuery('(max-width: 820px)'))
  expect(result.current).toBe(true)

  act(() => listener?.({ matches: false } as MediaQueryListEvent))
  expect(result.current).toBe(false)
})
```

- [ ] **Step 3: Implement the reactive media query hook**

Create `src/features/investigation/useMediaQuery.ts`:

```ts
import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = (event: MediaQueryListEvent) => setMatches(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}
```

- [ ] **Step 4: Write failing controlled-tab tests**

Create `src/features/investigation/WorkspaceTabs.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorkspaceTabs } from './WorkspaceTabs'

describe('WorkspaceTabs', () => {
  it('changes tabs by click and standard keyboard commands', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <WorkspaceTabs active="tools" onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    expect(onChange).toHaveBeenCalledWith('evidence')

    rerender(<WorkspaceTabs active="evidence" onChange={onChange} />)
    const evidence = screen.getByRole('tab', { name: 'Evidence' })
    evidence.focus()
    fireEvent.keyDown(evidence, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('notebook')
    fireEvent.keyDown(evidence, { key: 'Home' })
    expect(onChange).toHaveBeenCalledWith('tools')
    fireEvent.keyDown(evidence, { key: 'End' })
    expect(onChange).toHaveBeenCalledWith('notebook')
  })
})
```

- [ ] **Step 5: Implement the controlled tab list**

Create `src/features/investigation/WorkspaceTabs.tsx`:

```tsx
import { useRef } from 'react'

import type { WorkspaceTab } from './useInvestigationController'

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'tools', label: 'Tools' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'notebook', label: 'Notebook' },
]

export function WorkspaceTabs({
  active,
  onChange,
}: {
  active: WorkspaceTab
  onChange: (tab: WorkspaceTab) => void
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function activate(index: number) {
    const next = tabs[index]
    if (!next) return
    onChange(next.id)
    refs.current[index]?.focus()
  }

  return (
    <div
      className="workspace-tabs"
      role="tablist"
      aria-label="Investigation workspace"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(node) => {
            refs.current[index] = node
          }}
          type="button"
          role="tab"
          id={`workspace-tab-${tab.id}`}
          aria-controls={`workspace-panel-${tab.id}`}
          aria-selected={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              activate((index + 1) % tabs.length)
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault()
              activate((index - 1 + tabs.length) % tabs.length)
            } else if (event.key === 'Home') {
              event.preventDefault()
              activate(0)
            } else if (event.key === 'End') {
              event.preventDefault()
              activate(tabs.length - 1)
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Make the workspace panels responsive and semantic**

In `InvestigationWorkspace.tsx`:

1. Call `useMediaQuery('(max-width: 820px)')`.
2. Render `WorkspaceTabs` only when it returns true.
3. Give the three panels IDs `workspace-panel-tools`,
   `workspace-panel-evidence`, and `workspace-panel-notebook`.
4. When mobile, set each panel’s `role="tabpanel"`, corresponding
   `aria-labelledby`, and `hidden={controller.activeTab !== panelId}`.
5. When desktop, omit tab roles/relationships and leave every panel visible.

Use this helper inside the component so the attributes stay consistent:

```ts
function tabPanelProps(tab: WorkspaceTab) {
  return isMobile
    ? {
        role: 'tabpanel' as const,
        'aria-labelledby': `workspace-tab-${tab}`,
        hidden: controller.activeTab !== tab,
      }
    : {}
}
```

Apply it as:

```tsx
<section
  id="workspace-panel-tools"
  className="workspace-panel"
  aria-labelledby={isMobile ? undefined : 'tools-title'}
  {...tabPanelProps('tools')}
>
```

Repeat for Evidence and Notebook. Ensure each desktop panel still has an
accessible heading or label after the conditional attributes are applied.

- [ ] **Step 7: Add tab and responsive workspace styles**

Append to `src/design/global.css`:

```css
.workspace-tabs {
  display: none;
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: minmax(13rem, 0.7fr) minmax(22rem, 1.3fr) minmax(
        15rem,
        0.8fr
      );
  }
}

@media (max-width: 820px) {
  .investigation__header {
    flex-direction: column;
  }

  .workspace-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-1);
    margin-bottom: var(--space-3);
    padding: var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-small);
    background: var(--color-surface);
  }

  .workspace-tabs button {
    min-height: 2.75rem;
    border: 0;
    border-radius: var(--radius-small);
    background: transparent;
    color: var(--color-text-soft);
    cursor: pointer;
    font-weight: 750;
  }

  .workspace-tabs button[aria-selected='true'] {
    background: var(--color-accent-subtle);
    color: var(--color-accent-strong);
  }

  .workspace-grid {
    display: block;
  }
}

@media (max-width: 520px) {
  .investigation__metrics,
  .evidence-viewer__header {
    align-items: stretch;
    flex-direction: column;
  }

  .investigation__metrics div {
    flex: 1;
  }
}
```

- [ ] **Step 8: Verify mobile accessibility and regressions**

Run:

```sh
npx vitest run src/features/investigation/useMediaQuery.test.tsx src/features/investigation/WorkspaceTabs.test.tsx src/features/investigation/InvestigationWorkspace.test.tsx
npm test
npx tsc -b
npm run lint
```

Expected: media, tabs, workspace, full tests, TypeScript, and lint pass.

- [ ] **Step 9: Commit responsive tabs**

```sh
git add src/features/investigation/useMediaQuery.ts src/features/investigation/useMediaQuery.test.tsx src/features/investigation/WorkspaceTabs.tsx src/features/investigation/WorkspaceTabs.test.tsx src/features/investigation/InvestigationWorkspace.tsx src/test/setup.ts src/design/global.css
git commit -m "feat(ui): add responsive workspace tabs"
```

---

### Task 8: Prove the complete IAM-001 vertical slice and document the boundary

**Files:**

- Create: `tests/e2e/investigation.spec.ts`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/scenario-authoring.md`
- Modify if formatting changes: `docs/superpowers/specs/2026-09-28-milestone-5-investigation-ui-design.md`
- Modify if formatting changes: `docs/superpowers/plans/2026-09-30-milestone-5-investigation-ui.md`

- [ ] **Step 1: Add the desktop vertical-slice E2E test**

Create `tests/e2e/investigation.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

async function beginIamInvestigation(page: import('@playwright/test').Page) {
  await page.goto('/failure-lab/scenarios/iam-001')
  await expect(
    page.getByRole('heading', { name: 'Login works, feature does not' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Begin investigation' }).click()
}

test('investigates IAM-001 through the ready checkpoint', async ({ page }) => {
  await beginIamInvestigation(page)

  await page
    .getByRole('button', { name: /open affected user scope.*cost 1/i })
    .click()
  await page
    .getByRole('button', { name: /open authentication events.*cost 2/i })
    .click()
  await page
    .getByRole('button', { name: /open role configuration.*cost 2/i })
    .click()
  await page
    .getByRole('button', { name: /open role audit history.*cost 3/i })
    .click()
  await page
    .getByRole('button', { name: 'Bookmark Role audit history' })
    .click()
  await page.getByRole('radio', { name: /recent role change removed/i }).check()
  await page.getByRole('button', { name: 'Ready to diagnose' }).click()

  await expect(
    page.getByRole('heading', { name: 'Ready to diagnose' }),
  ).toBeFocused()
  await expect(page.getByText('Role audit history')).toBeVisible()
  await expect(page.getByText('4 of 5 evidence sources opened')).toBeVisible()
  await expect(page.getByText(/diagnosis submission begins/i)).toBeVisible()
  await expect(page.getByText(/score|correct answer/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Return to investigation' }).click()
  await expect(
    page.getByRole('button', { name: 'Ready to diagnose' }),
  ).toBeFocused()
})
```

- [ ] **Step 2: Add entry, direct-route, and mobile tests**

Append to `tests/e2e/investigation.spec.ts`:

```ts
test('enters IAM-001 from the landing CTA and browser card', async ({
  page,
}) => {
  await page.goto('/failure-lab/')
  await page.getByRole('link', { name: 'Start an incident' }).click()
  await expect(page).toHaveURL(/\/scenarios\/iam-001$/)

  await page.goto('/failure-lab/scenarios')
  await page
    .getByRole('link', { name: /open login works, feature does not/i })
    .click()
  await expect(page).toHaveURL(/\/scenarios\/iam-001$/)
})

test('loads the static investigation route directly', async ({ page }) => {
  const response = await page.goto('/failure-lab/scenarios/iam-001')

  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: 'Login works, feature does not' }),
  ).toBeVisible()
})

test('uses mobile workspace tabs without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await beginIamInvestigation(page)

  const tools = page.getByRole('tab', { name: 'Tools' })
  await expect(tools).toHaveAttribute('aria-selected', 'true')
  await page
    .getByRole('button', { name: /open service status.*cost 1/i })
    .click()
  await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'Evidence' }).press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Notebook' })).toBeFocused()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
```

Update any landing-page CTA name in `tests/e2e/home.spec.ts` from “Start a random
incident” to “Start an incident”; do not remove its existing navigation,
keyboard, direct-route, or viewport checks.

- [ ] **Step 3: Document the generated catalog and Milestone 5 boundary**

Add this flow to `docs/architecture.md`:

```text
validated scenario YAML
    ↓ deterministic build-time generator
browse-safe index + typed playable catalog
    ↓ canonical composer + pure investigation engine
React investigation controller
    ↓ safe evidence selectors
accessible desktop/mobile investigation UI
    ↓
static HTML, CSS, and JavaScript in dist/
```

Add an architecture decision:

```markdown
### Generated playable catalog

Milestone 5 generates a typed scenario catalog after the same collection-wide
validation used by the public index. The browser does not parse YAML or fetch
scenario data at runtime. The scenario browser reads only the safe index; the
investigation feature uses the full catalog but renders evidence exclusively
through active-investigation selectors.

### Feature-local investigation controller

React owns only transient selection, tab, error, and ready-checkpoint state.
Investigation facts remain in the framework-independent engine. IAM-001 uses a
canonical seed, refresh starts a new session, and no state is persisted.
```

Replace the current milestone boundary with Milestone 5 deliverables. State
explicitly that diagnosis submission, scoring, remediation, communication,
debrief, progress persistence, sharing, daily challenges, multi-scenario
randomization, and full filtering remain later work.

Add to `docs/scenario-authoring.md`:

```markdown
`npm run generate:scenarios` writes both the browse-safe JSON index and the
typed playable scenario catalog. Both come from the same validated YAML
documents. React components must not render solution fields directly; active
evidence is projected through the investigation selectors.
```

- [ ] **Step 4: Format only Milestone 5 files**

Run:

```sh
npx prettier --write scripts/scenario-cli.ts scripts/scenario-cli.test.ts src/content/serialize-scenario-catalog.ts src/content/serialize-scenario-catalog.test.ts src/generated/scenario-catalog.ts src/features/investigation src/app/AppRoutes.tsx src/app/AppRoutes.test.tsx src/pages/LandingPage.tsx src/features/browse/ScenarioBrowserPage.tsx src/design/global.css src/test/setup.ts tests/e2e/home.spec.ts tests/e2e/investigation.spec.ts docs/architecture.md docs/scenario-authoring.md docs/superpowers/specs/2026-09-28-milestone-5-investigation-ui-design.md docs/superpowers/plans/2026-09-30-milestone-5-investigation-ui.md
```

Expected: only listed Milestone 5 files are formatted.

- [ ] **Step 5: Run the complete Milestone 5 gate**

Run each command separately:

```sh
npm run lint
npm run format:check
npm test
npm run validate:scenarios
npm run generate:scenarios
npm run build
npm run test:e2e
git diff --check
git diff --exit-code -- src/generated/scenario-index.json src/generated/scenario-catalog.ts
git status --short
```

Expected:

- lint and formatting pass with no warnings;
- all Node and Vitest tests pass;
- exactly two scenarios validate and generate;
- TypeScript and the production Vite build pass;
- all existing and new Chromium tests pass;
- generated index and catalog have no drift after regeneration;
- `git diff --check` prints nothing; and
- status contains only the Task 8 test/documentation changes plus any
  formatting-only changes to the Milestone 5 design and plan before commit.

- [ ] **Step 6: Commit the vertical-slice proof and documentation**

```sh
git add tests/e2e/investigation.spec.ts tests/e2e/home.spec.ts docs/architecture.md docs/scenario-authoring.md docs/superpowers/specs/2026-09-28-milestone-5-investigation-ui-design.md docs/superpowers/plans/2026-09-30-milestone-5-investigation-ui.md
git commit -m "docs: record investigation UI contract"
```

Git will ignore unchanged spec/plan paths.

- [ ] **Step 7: Verify the committed branch is clean**

Run:

```sh
git status --short
git log -10 --oneline
```

Expected: status is empty and the latest commits are the eight Milestone 5
checkpoints following the approved design commit.

## Stop condition

Stop when IAM-001 is playable from the landing page and scenario browser through
the reversible ready-to-diagnose checkpoint; desktop and mobile accessibility
checks pass; generated artifacts are current; and the complete gate is green.
Do not begin Milestone 6, add submission or scoring, expose solution metadata,
persist investigation state, or activate FND-001 gameplay.
