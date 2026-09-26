# Milestone 4 Investigation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure deterministic investigation state machine with evidence unlocking, optional budgets, bookmarks, hypothesis history, action history, and UI-safe evidence selectors.

**Architecture:** A typed command reducer accepts a composed `ScenarioInstance` and immutable `InvestigationState`, validates identity and command preconditions, then returns a new state atomically. Evidence availability and safe active-investigation views are derived from authored dependencies and opened IDs rather than stored redundantly.

**Tech Stack:** TypeScript 6, Zod 4, Vitest 5, existing YAML/tsx content pipeline, ESLint, Prettier, Vite 8

---

## File map

### New files

- `src/engine/investigation-state.ts` — investigation state, command, action, and error-code types.
- `src/engine/investigation-engine.ts` — initialization, identity checks, command transitions, unlocking, and typed errors.
- `src/engine/investigation-engine.test.ts` — state, evidence, budget, bookmark, hypothesis, history, and atomicity tests.
- `src/engine/investigation-selectors.ts` — safe evidence availability and opened-content projections.
- `src/engine/investigation-selectors.test.ts` — selector ordering, safety, identity, and isolation tests.

### Modified files

- `src/content/scenario-schema.ts` — optional positive integer investigation budget.
- `src/content/scenario-schema.test.ts` — budget schema boundaries.
- `src/content/scenario-content.test.ts` — real authored efficient paths can be opened by the engine.
- `docs/scenario-authoring.md` — optional budget and investigation semantics.
- `docs/architecture.md` — implemented investigation boundary and later exclusions.

The shared fixture remains budget-free, and the two beginner YAML scenarios remain unchanged.

---

### Task 1: Add the optional authored budget contract

**Files:**

- Modify: `src/content/scenario-schema.test.ts`
- Modify: `src/content/scenario-schema.ts`

- [ ] **Step 1: Write failing budget-schema tests**

Append to `src/content/scenario-schema.test.ts`:

```ts
it('accepts an optional positive investigation budget', () => {
  expect(
    scenarioSourceSchema.safeParse({
      ...createScenarioFixture(),
      investigation_budget: 100,
    }).success,
  ).toBe(true)
})

it.each([0, -1, 1.5])(
  'rejects invalid investigation budget %s',
  (investigationBudget) => {
    expect(
      scenarioSourceSchema.safeParse({
        ...createScenarioFixture(),
        investigation_budget: investigationBudget,
      }).success,
    ).toBe(false)
  },
)
```

- [ ] **Step 2: Run the schema test and verify RED**

Run:

```sh
npx vitest run src/content/scenario-schema.test.ts
```

Expected: the positive-budget test fails because the strict source schema does
not accept `investigation_budget`.

- [ ] **Step 3: Add the optional source field**

Add after `estimated_minutes` in `scenarioSourceSchema`:

```ts
investigation_budget: z.number().int().positive().optional(),
```

Do not add a default and do not update either scenario YAML file.

- [ ] **Step 4: Verify schema and real content**

Run:

```sh
npx vitest run src/content/scenario-schema.test.ts src/content/scenario-content.test.ts src/engine/compose-scenario.test.ts
npm run validate:scenarios
npm run lint
```

Expected: focused tests pass, exactly two scenarios validate, and lint passes.

- [ ] **Step 5: Commit the budget contract**

```sh
git add src/content/scenario-schema.ts src/content/scenario-schema.test.ts
git commit -m "feat(content): add optional investigation budget"
```

---

### Task 2: Create investigation state and begin transition

**Files:**

- Create: `src/engine/investigation-state.ts`
- Create: `src/engine/investigation-engine.test.ts`
- Create: `src/engine/investigation-engine.ts`

- [ ] **Step 1: Define the initial state and begin-command types**

Create `src/engine/investigation-state.ts`:

```ts
export type InvestigationStatus = 'intro' | 'investigating'

export type InvestigationErrorCode =
  | 'INVALID_STARTED_AT'
  | 'SCENARIO_STATE_MISMATCH'
  | 'INVALID_STATUS'
  | 'UNKNOWN_EVIDENCE'
  | 'EVIDENCE_LOCKED'
  | 'INSUFFICIENT_BUDGET'
  | 'EVIDENCE_NOT_OPENED'
  | 'UNKNOWN_HYPOTHESIS'

export interface BeginInvestigationAction {
  sequence: number
  type: 'begin_investigation'
}

export type InvestigationAction = BeginInvestigationAction

export type InvestigationCommand = { type: 'begin_investigation' }

export interface InvestigationState {
  scenarioId: string
  scenarioVersion: number
  seed: string
  startedAt: number
  status: InvestigationStatus
  openedEvidenceIds: string[]
  bookmarkedEvidenceIds: string[]
  selectedHypothesisId?: string
  hypothesisHistory: Array<{
    hypothesisId: string
    atAction: number
  }>
  actions: InvestigationAction[]
  budgetRemaining?: number
}
```

Later tasks extend the two unions without changing the state shape.

- [ ] **Step 2: Write failing initialization and begin tests**

Create `src/engine/investigation-engine.test.ts` with this setup and tests:

```ts
import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from '../content/scenario-schema'
import { createScenarioFixture } from '../content/test-fixtures'
import { composeScenario } from './compose-scenario'
import {
  InvestigationTransitionError,
  applyInvestigationCommand,
  createInvestigation,
} from './investigation-engine'

function sourceFixture(): ScenarioSource {
  return createScenarioFixture() as ScenarioSource
}

function instanceFixture(source = sourceFixture()) {
  return composeScenario(source, 'investigation-seed')
}

describe('createInvestigation', () => {
  it('creates deterministic intro state from explicit inputs', () => {
    const instance = instanceFixture()

    expect(createInvestigation(instance, 1_000)).toEqual({
      scenarioId: 'iam-001',
      scenarioVersion: 1,
      seed: 'investigation-seed',
      startedAt: 1_000,
      status: 'intro',
      openedEvidenceIds: [],
      bookmarkedEvidenceIds: [],
      selectedHypothesisId: undefined,
      hypothesisHistory: [],
      actions: [],
      budgetRemaining: undefined,
    })
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid start time %s',
    (startedAt) => {
      expect(() => createInvestigation(instanceFixture(), startedAt)).toThrow(
        expect.objectContaining({
          name: 'InvestigationTransitionError',
          code: 'INVALID_STARTED_AT',
        }),
      )
    },
  )

  it('starts with the authored optional budget', () => {
    const source = sourceFixture()
    source.investigation_budget = 10

    expect(
      createInvestigation(instanceFixture(source), 1_000).budgetRemaining,
    ).toBe(10)
  })
})

describe('begin investigation', () => {
  it('returns a new investigating state and first action', () => {
    const instance = instanceFixture()
    const intro = createInvestigation(instance, 1_000)

    const investigating = applyInvestigationCommand(instance, intro, {
      type: 'begin_investigation',
    })

    expect(investigating).not.toBe(intro)
    expect(investigating.status).toBe('investigating')
    expect(investigating.actions).toEqual([
      { sequence: 1, type: 'begin_investigation' },
    ])
    expect(intro.status).toBe('intro')
    expect(intro.actions).toEqual([])
  })

  it('rejects beginning twice without changing state', () => {
    const instance = instanceFixture()
    const investigating = applyInvestigationCommand(
      instance,
      createInvestigation(instance, 1_000),
      { type: 'begin_investigation' },
    )
    const before = structuredClone(investigating)

    expect(() =>
      applyInvestigationCommand(instance, investigating, {
        type: 'begin_investigation',
      }),
    ).toThrow(
      expect.objectContaining({
        name: 'InvestigationTransitionError',
        code: 'INVALID_STATUS',
      }),
    )
    expect(investigating).toEqual(before)
  })

  it('rejects state from another scenario instance', () => {
    const instance = instanceFixture()
    const state = createInvestigation(instance, 1_000)
    const mismatched = { ...state, seed: 'another-seed' }

    expect(() =>
      applyInvestigationCommand(instance, mismatched, {
        type: 'begin_investigation',
      }),
    ).toThrow(
      expect.objectContaining({
        name: 'InvestigationTransitionError',
        code: 'SCENARIO_STATE_MISMATCH',
      }),
    )
  })
})
```

- [ ] **Step 3: Run the investigation test and verify RED**

Run:

```sh
npx vitest run src/engine/investigation-engine.test.ts
```

Expected: FAIL because `investigation-engine.ts` does not exist.

- [ ] **Step 4: Implement initialization, identity, error, and begin behavior**

Create `src/engine/investigation-engine.ts`:

```ts
import type { ScenarioInstance } from './scenario-instance'
import type {
  InvestigationCommand,
  InvestigationErrorCode,
  InvestigationState,
} from './investigation-state'

export class InvestigationTransitionError extends Error {
  constructor(
    readonly code: InvestigationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'InvestigationTransitionError'
  }
}

function fail(code: InvestigationErrorCode, message: string): never {
  throw new InvestigationTransitionError(code, message)
}

export function assertInvestigationIdentity(
  instance: ScenarioInstance,
  state: InvestigationState,
): void {
  if (
    state.scenarioId !== instance.scenario.id ||
    state.scenarioVersion !== instance.scenario.version ||
    state.seed !== instance.composition.seed
  ) {
    fail(
      'SCENARIO_STATE_MISMATCH',
      `Investigation state does not belong to scenario "${instance.scenario.id}" version ${instance.scenario.version} and seed "${instance.composition.seed}".`,
    )
  }
}

export function createInvestigation(
  instance: ScenarioInstance,
  startedAt: number,
): InvestigationState {
  if (!Number.isInteger(startedAt) || startedAt < 0) {
    fail(
      'INVALID_STARTED_AT',
      'Investigation start time must be a finite, non-negative integer.',
    )
  }

  return {
    scenarioId: instance.scenario.id,
    scenarioVersion: instance.scenario.version,
    seed: instance.composition.seed,
    startedAt,
    status: 'intro',
    openedEvidenceIds: [],
    bookmarkedEvidenceIds: [],
    selectedHypothesisId: undefined,
    hypothesisHistory: [],
    actions: [],
    budgetRemaining: instance.scenario.investigation_budget,
  }
}

export function applyInvestigationCommand(
  instance: ScenarioInstance,
  state: InvestigationState,
  command: InvestigationCommand,
): InvestigationState {
  assertInvestigationIdentity(instance, state)

  if (command.type === 'begin_investigation') {
    if (state.status !== 'intro') {
      fail(
        'INVALID_STATUS',
        `Cannot begin investigation while status is "${state.status}".`,
      )
    }

    return {
      ...state,
      status: 'investigating',
      actions: [
        ...state.actions,
        { sequence: state.actions.length + 1, type: command.type },
      ],
    }
  }

  const exhaustive: never = command
  return exhaustive
}
```

- [ ] **Step 5: Verify the state foundation**

Run:

```sh
npx vitest run src/engine/investigation-engine.test.ts
npx tsc -b
npm run lint
```

Expected: all initialization/begin tests, TypeScript, and lint pass.

- [ ] **Step 6: Commit the state foundation**

```sh
git add src/engine/investigation-state.ts src/engine/investigation-engine.ts src/engine/investigation-engine.test.ts
git commit -m "feat(engine): initialize investigations"
```

---

### Task 3: Add evidence unlocking, opening, and budgets

**Files:**

- Modify: `src/engine/investigation-state.ts`
- Modify: `src/engine/investigation-engine.test.ts`
- Modify: `src/engine/investigation-engine.ts`

- [ ] **Step 1: Extend state types for opening evidence**

Add to `investigation-state.ts`:

```ts
export interface OpenEvidenceAction {
  sequence: number
  type: 'open_evidence'
  evidenceId: string
  cost: number
}
```

Change the unions to:

```ts
export type InvestigationAction = BeginInvestigationAction | OpenEvidenceAction

export type InvestigationCommand =
  | { type: 'begin_investigation' }
  | { type: 'open_evidence'; evidenceId: string }
```

- [ ] **Step 2: Add an authored evidence-chain test helper**

Add inside `investigation-engine.test.ts`:

```ts
function evidenceChainSource(): ScenarioSource {
  const source = sourceFixture()
  const template = source.evidence[0]

  source.evidence = [
    { ...structuredClone(template), id: 'scope', cost: 2, unlock_after: [] },
    {
      ...structuredClone(template),
      id: 'configuration',
      cost: 3,
      unlock_after: ['scope'],
    },
    {
      ...structuredClone(template),
      id: 'audit',
      cost: 4,
      unlock_after: ['scope', 'configuration'],
    },
  ]

  return source
}

function startedInvestigation(source = evidenceChainSource()) {
  const instance = instanceFixture(source)
  const intro = createInvestigation(instance, 1_000)
  const state = applyInvestigationCommand(instance, intro, {
    type: 'begin_investigation',
  })
  return { instance, state }
}
```

- [ ] **Step 3: Write failing evidence and unlocking tests**

Append:

```ts
describe('open evidence', () => {
  it('opens immediately available evidence and records its cost', () => {
    const { instance, state } = startedInvestigation()
    const instanceBefore = structuredClone(instance)

    const next = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })

    expect(next.openedEvidenceIds).toEqual(['scope'])
    expect(next.actions.at(-1)).toEqual({
      sequence: 2,
      type: 'open_evidence',
      evidenceId: 'scope',
      cost: 2,
    })
    expect(next.budgetRemaining).toBeUndefined()
    expect(state.openedEvidenceIds).toEqual([])
    expect(instance).toEqual(instanceBefore)
  })

  it('requires every authored dependency before opening evidence', () => {
    const { instance, state } = startedInvestigation()

    expect(() =>
      applyInvestigationCommand(instance, state, {
        type: 'open_evidence',
        evidenceId: 'audit',
      }),
    ).toThrow(expect.objectContaining({ code: 'EVIDENCE_LOCKED' }))

    const afterScope = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    expect(() =>
      applyInvestigationCommand(instance, afterScope, {
        type: 'open_evidence',
        evidenceId: 'audit',
      }),
    ).toThrow(expect.objectContaining({ code: 'EVIDENCE_LOCKED' }))

    const afterConfiguration = applyInvestigationCommand(instance, afterScope, {
      type: 'open_evidence',
      evidenceId: 'configuration',
    })
    expect(
      applyInvestigationCommand(instance, afterConfiguration, {
        type: 'open_evidence',
        evidenceId: 'audit',
      }).openedEvidenceIds,
    ).toEqual(['scope', 'configuration', 'audit'])
  })

  it('rejects unknown evidence and opening evidence before investigation', () => {
    const instance = instanceFixture(evidenceChainSource())
    const intro = createInvestigation(instance, 1_000)

    expect(() =>
      applyInvestigationCommand(instance, intro, {
        type: 'open_evidence',
        evidenceId: 'scope',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATUS' }))

    const investigating = applyInvestigationCommand(instance, intro, {
      type: 'begin_investigation',
    })
    expect(() =>
      applyInvestigationCommand(instance, investigating, {
        type: 'open_evidence',
        evidenceId: 'missing',
      }),
    ).toThrow(expect.objectContaining({ code: 'UNKNOWN_EVIDENCE' }))
  })

  it('treats reopening evidence as an idempotent view operation', () => {
    const { instance, state } = startedInvestigation()
    const opened = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })

    expect(
      applyInvestigationCommand(instance, opened, {
        type: 'open_evidence',
        evidenceId: 'scope',
      }),
    ).toBe(opened)
  })
})
```

- [ ] **Step 4: Write failing optional-budget tests**

Append:

```ts
describe('investigation budget', () => {
  it('deducts first-open costs and allows exact exhaustion', () => {
    const source = evidenceChainSource()
    source.investigation_budget = 5
    const { instance, state } = startedInvestigation(source)

    const afterScope = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    const exhausted = applyInvestigationCommand(instance, afterScope, {
      type: 'open_evidence',
      evidenceId: 'configuration',
    })

    expect(afterScope.budgetRemaining).toBe(3)
    expect(exhausted.budgetRemaining).toBe(0)
  })

  it('rejects insufficient budget atomically', () => {
    const source = evidenceChainSource()
    source.investigation_budget = 2
    const { instance, state } = startedInvestigation(source)
    const afterScope = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    const before = structuredClone(afterScope)

    expect(() =>
      applyInvestigationCommand(instance, afterScope, {
        type: 'open_evidence',
        evidenceId: 'configuration',
      }),
    ).toThrow(expect.objectContaining({ code: 'INSUFFICIENT_BUDGET' }))
    expect(afterScope).toEqual(before)
  })
})
```

- [ ] **Step 5: Run focused tests and verify RED**

Run:

```sh
npx vitest run src/engine/investigation-engine.test.ts
```

Expected: new evidence commands fail because the reducer implements only begin.

- [ ] **Step 6: Implement evidence helpers and transition**

Add these helpers to `investigation-engine.ts`:

```ts
import type { ScenarioInstanceEvidence } from './scenario-instance'

function requireInvestigating(state: InvestigationState): void {
  if (state.status !== 'investigating') {
    fail(
      'INVALID_STATUS',
      `Investigation command requires "investigating" status, received "${state.status}".`,
    )
  }
}

function findEvidence(
  instance: ScenarioInstance,
  evidenceId: string,
): ScenarioInstanceEvidence {
  const evidence = instance.scenario.evidence.find(
    ({ id }) => id === evidenceId,
  )
  if (!evidence) {
    fail(
      'UNKNOWN_EVIDENCE',
      `Scenario "${instance.scenario.id}" has no evidence "${evidenceId}".`,
    )
  }
  return evidence
}

export function isEvidenceUnlocked(
  evidence: ScenarioInstanceEvidence,
  state: InvestigationState,
): boolean {
  const opened = new Set(state.openedEvidenceIds)
  return evidence.unlock_after.every((id) => opened.has(id))
}
```

Add this handler:

```ts
function openEvidence(
  instance: ScenarioInstance,
  state: InvestigationState,
  evidenceId: string,
): InvestigationState {
  requireInvestigating(state)
  const evidence = findEvidence(instance, evidenceId)
  if (state.openedEvidenceIds.includes(evidenceId)) return state
  if (!isEvidenceUnlocked(evidence, state)) {
    fail('EVIDENCE_LOCKED', `Evidence "${evidenceId}" is still locked.`)
  }
  if (
    state.budgetRemaining !== undefined &&
    state.budgetRemaining < evidence.cost
  ) {
    fail(
      'INSUFFICIENT_BUDGET',
      `Evidence "${evidenceId}" costs ${evidence.cost}, but only ${state.budgetRemaining} remains.`,
    )
  }

  const sequence = state.actions.length + 1
  return {
    ...state,
    openedEvidenceIds: [...state.openedEvidenceIds, evidenceId],
    actions: [
      ...state.actions,
      {
        sequence,
        type: 'open_evidence',
        evidenceId,
        cost: evidence.cost,
      },
    ],
    budgetRemaining:
      state.budgetRemaining === undefined
        ? undefined
        : state.budgetRemaining - evidence.cost,
  }
}
```

Add the reducer case after the begin case:

```ts
if (command.type === 'open_evidence') {
  return openEvidence(instance, state, command.evidenceId)
}

const exhaustive: never = command
return exhaustive
```

Move the exhaustive guard to the end of the reducer whenever a later task adds
another command case.

- [ ] **Step 7: Verify evidence and budget behavior**

Run:

```sh
npx vitest run src/engine/investigation-engine.test.ts
npx tsc -b
npm run lint
```

Expected: all investigation tests, TypeScript, and lint pass.

- [ ] **Step 8: Commit evidence investigation behavior**

```sh
git add src/engine/investigation-state.ts src/engine/investigation-engine.ts src/engine/investigation-engine.test.ts
git commit -m "feat(engine): open gated evidence"
```

---

### Task 4: Add bookmarks, hypotheses, and complete action history

**Files:**

- Modify: `src/engine/investigation-state.ts`
- Modify: `src/engine/investigation-engine.test.ts`
- Modify: `src/engine/investigation-engine.ts`

- [ ] **Step 1: Extend command and action unions**

Add these action interfaces:

```ts
export interface BookmarkEvidenceAction {
  sequence: number
  type: 'bookmark_evidence' | 'unbookmark_evidence'
  evidenceId: string
}

export interface SelectHypothesisAction {
  sequence: number
  type: 'select_hypothesis'
  hypothesisId: string
}
```

Use the final unions:

```ts
export type InvestigationAction =
  | BeginInvestigationAction
  | OpenEvidenceAction
  | BookmarkEvidenceAction
  | SelectHypothesisAction

export type InvestigationCommand =
  | { type: 'begin_investigation' }
  | { type: 'open_evidence'; evidenceId: string }
  | { type: 'bookmark_evidence'; evidenceId: string }
  | { type: 'unbookmark_evidence'; evidenceId: string }
  | { type: 'select_hypothesis'; hypothesisId: string }
```

- [ ] **Step 2: Write failing bookmark tests**

Append:

```ts
describe('evidence bookmarks', () => {
  it('bookmarks and unbookmarks opened evidence in action order', () => {
    const { instance, state } = startedInvestigation()
    const opened = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    const bookmarked = applyInvestigationCommand(instance, opened, {
      type: 'bookmark_evidence',
      evidenceId: 'scope',
    })
    const unbookmarked = applyInvestigationCommand(instance, bookmarked, {
      type: 'unbookmark_evidence',
      evidenceId: 'scope',
    })
    const rebookmarked = applyInvestigationCommand(instance, unbookmarked, {
      type: 'bookmark_evidence',
      evidenceId: 'scope',
    })

    expect(bookmarked.bookmarkedEvidenceIds).toEqual(['scope'])
    expect(bookmarked.actions.at(-1)).toEqual({
      sequence: 3,
      type: 'bookmark_evidence',
      evidenceId: 'scope',
    })
    expect(unbookmarked.bookmarkedEvidenceIds).toEqual([])
    expect(unbookmarked.actions.at(-1)).toEqual({
      sequence: 4,
      type: 'unbookmark_evidence',
      evidenceId: 'scope',
    })
    expect(rebookmarked.bookmarkedEvidenceIds).toEqual(['scope'])
    expect(rebookmarked.actions.at(-1)).toEqual({
      sequence: 5,
      type: 'bookmark_evidence',
      evidenceId: 'scope',
    })
  })

  it('requires opened evidence and rejects unknown evidence', () => {
    const { instance, state } = startedInvestigation()

    expect(() =>
      applyInvestigationCommand(instance, state, {
        type: 'bookmark_evidence',
        evidenceId: 'scope',
      }),
    ).toThrow(expect.objectContaining({ code: 'EVIDENCE_NOT_OPENED' }))
    expect(() =>
      applyInvestigationCommand(instance, state, {
        type: 'bookmark_evidence',
        evidenceId: 'missing',
      }),
    ).toThrow(expect.objectContaining({ code: 'UNKNOWN_EVIDENCE' }))
  })

  it('treats duplicate bookmark changes as idempotent', () => {
    const { instance, state } = startedInvestigation()
    expect(
      applyInvestigationCommand(instance, state, {
        type: 'unbookmark_evidence',
        evidenceId: 'scope',
      }),
    ).toBe(state)

    const opened = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    const bookmarked = applyInvestigationCommand(instance, opened, {
      type: 'bookmark_evidence',
      evidenceId: 'scope',
    })

    expect(
      applyInvestigationCommand(instance, bookmarked, {
        type: 'bookmark_evidence',
        evidenceId: 'scope',
      }),
    ).toBe(bookmarked)
    expect(
      applyInvestigationCommand(instance, opened, {
        type: 'unbookmark_evidence',
        evidenceId: 'scope',
      }),
    ).toBe(opened)
  })
})
```

- [ ] **Step 3: Write failing hypothesis-history tests**

Append:

```ts
describe('hypothesis selection', () => {
  it('records selection changes with their action sequence', () => {
    const { instance, state } = startedInvestigation()
    const first = applyInvestigationCommand(instance, state, {
      type: 'select_hypothesis',
      hypothesisId: 'reporting-service-outage',
    })
    const second = applyInvestigationCommand(instance, first, {
      type: 'select_hypothesis',
      hypothesisId: 'reporting-role-removed',
    })

    expect(second.selectedHypothesisId).toBe('reporting-role-removed')
    expect(second.hypothesisHistory).toEqual([
      { hypothesisId: 'reporting-service-outage', atAction: 2 },
      { hypothesisId: 'reporting-role-removed', atAction: 3 },
    ])
    expect(second.actions.slice(-2)).toEqual([
      {
        sequence: 2,
        type: 'select_hypothesis',
        hypothesisId: 'reporting-service-outage',
      },
      {
        sequence: 3,
        type: 'select_hypothesis',
        hypothesisId: 'reporting-role-removed',
      },
    ])
  })

  it('rejects unknown hypotheses and ignores the current selection', () => {
    const { instance, state } = startedInvestigation()

    expect(() =>
      applyInvestigationCommand(instance, state, {
        type: 'select_hypothesis',
        hypothesisId: 'missing',
      }),
    ).toThrow(expect.objectContaining({ code: 'UNKNOWN_HYPOTHESIS' }))

    const selected = applyInvestigationCommand(instance, state, {
      type: 'select_hypothesis',
      hypothesisId: 'reporting-role-removed',
    })
    expect(
      applyInvestigationCommand(instance, selected, {
        type: 'select_hypothesis',
        hypothesisId: 'reporting-role-removed',
      }),
    ).toBe(selected)
  })

  it('requires investigating status for notebook commands', () => {
    const instance = instanceFixture()
    const intro = createInvestigation(instance, 1_000)

    expect(() =>
      applyInvestigationCommand(instance, intro, {
        type: 'select_hypothesis',
        hypothesisId: 'reporting-role-removed',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATUS' }))
  })
})
```

- [ ] **Step 4: Run the investigation tests and verify RED**

Run:

```sh
npx vitest run src/engine/investigation-engine.test.ts
```

Expected: new command cases fail because the reducer does not implement them.

- [ ] **Step 5: Implement bookmark transitions**

Add:

```ts
function updateBookmark(
  instance: ScenarioInstance,
  state: InvestigationState,
  evidenceId: string,
  bookmark: boolean,
): InvestigationState {
  requireInvestigating(state)
  findEvidence(instance, evidenceId)
  const isBookmarked = state.bookmarkedEvidenceIds.includes(evidenceId)
  if (bookmark === isBookmarked) return state
  if (bookmark && !state.openedEvidenceIds.includes(evidenceId)) {
    fail(
      'EVIDENCE_NOT_OPENED',
      `Evidence "${evidenceId}" must be opened before bookmarking.`,
    )
  }
  const type = bookmark ? 'bookmark_evidence' : 'unbookmark_evidence'
  return {
    ...state,
    bookmarkedEvidenceIds: bookmark
      ? [...state.bookmarkedEvidenceIds, evidenceId]
      : state.bookmarkedEvidenceIds.filter((id) => id !== evidenceId),
    actions: [
      ...state.actions,
      {
        sequence: state.actions.length + 1,
        type,
        evidenceId,
      },
    ],
  }
}
```

Add reducer cases:

```ts
if (command.type === 'bookmark_evidence') {
  return updateBookmark(instance, state, command.evidenceId, true)
}
if (command.type === 'unbookmark_evidence') {
  return updateBookmark(instance, state, command.evidenceId, false)
}
```

- [ ] **Step 6: Implement hypothesis selection**

Add:

```ts
function selectHypothesis(
  instance: ScenarioInstance,
  state: InvestigationState,
  hypothesisId: string,
): InvestigationState {
  requireInvestigating(state)
  if (!instance.scenario.hypotheses.some(({ id }) => id === hypothesisId)) {
    fail(
      'UNKNOWN_HYPOTHESIS',
      `Scenario "${instance.scenario.id}" has no hypothesis "${hypothesisId}".`,
    )
  }
  if (state.selectedHypothesisId === hypothesisId) return state

  const sequence = state.actions.length + 1
  return {
    ...state,
    selectedHypothesisId: hypothesisId,
    hypothesisHistory: [
      ...state.hypothesisHistory,
      { hypothesisId, atAction: sequence },
    ],
    actions: [
      ...state.actions,
      { sequence, type: 'select_hypothesis', hypothesisId },
    ],
  }
}
```

Add the final reducer case:

```ts
if (command.type === 'select_hypothesis') {
  return selectHypothesis(instance, state, command.hypothesisId)
}

const exhaustive: never = command
return exhaustive
```

- [ ] **Step 7: Verify complete transition behavior**

Run:

```sh
npx vitest run src/engine/investigation-engine.test.ts
npm test
npx tsc -b
npm run lint
```

Expected: investigation and full tests, TypeScript, and lint pass.

- [ ] **Step 8: Commit notebook transitions**

```sh
git add src/engine/investigation-state.ts src/engine/investigation-engine.ts src/engine/investigation-engine.test.ts
git commit -m "feat(engine): track investigation notebook"
```

---

### Task 5: Add safe evidence selectors

**Files:**

- Create: `src/engine/investigation-selectors.test.ts`
- Create: `src/engine/investigation-selectors.ts`

- [ ] **Step 1: Write failing selector tests**

Create `src/engine/investigation-selectors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from '../content/scenario-schema'
import { createScenarioFixture } from '../content/test-fixtures'
import { composeScenario } from './compose-scenario'
import {
  applyInvestigationCommand,
  createInvestigation,
} from './investigation-engine'
import {
  getAvailableEvidenceIds,
  getInvestigationEvidenceViews,
} from './investigation-selectors'

function selectorFixture() {
  const source = createScenarioFixture() as ScenarioSource
  const template = source.evidence[0]
  source.evidence = [
    { ...structuredClone(template), id: 'scope', unlock_after: [] },
    {
      ...structuredClone(template),
      id: 'configuration',
      unlock_after: ['scope'],
    },
  ]
  const instance = composeScenario(source, 'selector-seed')
  const intro = createInvestigation(instance, 1_000)
  const state = applyInvestigationCommand(instance, intro, {
    type: 'begin_investigation',
  })
  return { instance, state }
}

describe('investigation evidence selectors', () => {
  it('derives available evidence in authored order', () => {
    const { instance, state } = selectorFixture()

    expect(getAvailableEvidenceIds(instance, state)).toEqual(['scope'])
    const opened = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    expect(getAvailableEvidenceIds(instance, opened)).toEqual(['configuration'])
  })

  it('exposes content only after opening evidence', () => {
    const { instance, state } = selectorFixture()

    expect(getInvestigationEvidenceViews(instance, state)).toEqual([
      {
        id: 'scope',
        tool: 'service_status',
        cost: 1,
        state: 'available',
      },
      {
        id: 'configuration',
        tool: 'service_status',
        cost: 1,
        state: 'locked',
      },
    ])

    const opened = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    const views = getInvestigationEvidenceViews(instance, opened)
    expect(views[0]).toEqual({
      id: 'scope',
      tool: 'service_status',
      cost: 1,
      state: 'opened',
      content: instance.scenario.evidence[0].content,
    })
    expect(views[1]).toEqual({
      id: 'configuration',
      tool: 'service_status',
      cost: 1,
      state: 'available',
    })
  })

  it('never exposes hidden evidence metadata or solution data', () => {
    const { instance, state } = selectorFixture()
    const opened = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    const serialized = JSON.stringify(
      getInvestigationEvidenceViews(instance, opened),
    )

    expect(serialized).not.toContain('relevance')
    expect(serialized).not.toContain('explanation')
    expect(serialized).not.toContain('unlock_after')
    expect(serialized).not.toContain('root_cause')
    expect(serialized).not.toContain('debrief')
  })

  it('returns fresh content that cannot mutate the scenario instance', () => {
    const { instance, state } = selectorFixture()
    const opened = applyInvestigationCommand(instance, state, {
      type: 'open_evidence',
      evidenceId: 'scope',
    })
    const views = getInvestigationEvidenceViews(instance, opened)
    const before = structuredClone(instance)
    const content = views[0].content
    if (content?.kind !== 'timeline') throw new Error('Expected timeline')

    content.events[0].event = 'Consumer mutation'

    expect(instance).toEqual(before)
  })

  it('rejects state from a different scenario instance', () => {
    const { instance, state } = selectorFixture()

    expect(() =>
      getInvestigationEvidenceViews(instance, {
        ...state,
        scenarioVersion: state.scenarioVersion + 1,
      }),
    ).toThrow(expect.objectContaining({ code: 'SCENARIO_STATE_MISMATCH' }))
  })
})
```

- [ ] **Step 2: Run selector tests and verify RED**

Run:

```sh
npx vitest run src/engine/investigation-selectors.test.ts
```

Expected: FAIL because `investigation-selectors.ts` does not exist.

- [ ] **Step 3: Implement the safe selector boundary**

Create `src/engine/investigation-selectors.ts`:

```ts
import {
  assertInvestigationIdentity,
  isEvidenceUnlocked,
} from './investigation-engine'
import type { InvestigationState } from './investigation-state'
import type {
  ScenarioInstance,
  ScenarioInstanceEvidence,
} from './scenario-instance'

export type InvestigationEvidenceState = 'locked' | 'available' | 'opened'

export interface InvestigationEvidenceView {
  id: string
  tool: ScenarioInstanceEvidence['tool']
  cost: number
  state: InvestigationEvidenceState
  content?: ScenarioInstanceEvidence['content']
}

export function getAvailableEvidenceIds(
  instance: ScenarioInstance,
  state: InvestigationState,
): string[] {
  assertInvestigationIdentity(instance, state)
  const opened = new Set(state.openedEvidenceIds)
  return instance.scenario.evidence
    .filter(
      (evidence) =>
        !opened.has(evidence.id) && isEvidenceUnlocked(evidence, state),
    )
    .map(({ id }) => id)
}

export function getInvestigationEvidenceViews(
  instance: ScenarioInstance,
  state: InvestigationState,
): InvestigationEvidenceView[] {
  assertInvestigationIdentity(instance, state)
  const opened = new Set(state.openedEvidenceIds)

  return instance.scenario.evidence.map((evidence) => {
    if (opened.has(evidence.id)) {
      return {
        id: evidence.id,
        tool: evidence.tool,
        cost: evidence.cost,
        state: 'opened',
        content: structuredClone(evidence.content),
      }
    }

    return {
      id: evidence.id,
      tool: evidence.tool,
      cost: evidence.cost,
      state: isEvidenceUnlocked(evidence, state) ? 'available' : 'locked',
    }
  })
}
```

- [ ] **Step 4: Verify selector safety and full engine behavior**

Run:

```sh
npx vitest run src/engine/investigation-selectors.test.ts src/engine/investigation-engine.test.ts
npm test
npx tsc -b
npm run lint
```

Expected: selector, engine, and full tests pass; TypeScript and lint pass.

- [ ] **Step 5: Commit safe selectors**

```sh
git add src/engine/investigation-selectors.ts src/engine/investigation-selectors.test.ts
git commit -m "feat(engine): expose safe evidence views"
```

---

### Task 6: Prove real scenario paths and document the boundary

**Files:**

- Modify: `src/content/scenario-content.test.ts`
- Modify: `docs/scenario-authoring.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: Add a real authored-path integration test**

Import these functions in `src/content/scenario-content.test.ts`:

```ts
import {
  applyInvestigationCommand,
  createInvestigation,
} from '../engine/investigation-engine'
```

After the existing composition matrix, add this complete loop:

```ts
for (const { scenario } of documents) {
  const instance = composeScenario(scenario, 'investigation-path')
  let investigation = applyInvestigationCommand(
    instance,
    createInvestigation(instance, 1_000),
    { type: 'begin_investigation' },
  )

  for (const entry of scenario.debrief.efficient_path) {
    if (entry.kind !== 'evidence') continue
    investigation = applyInvestigationCommand(instance, investigation, {
      type: 'open_evidence',
      evidenceId: entry.ref,
    })
  }

  expect(investigation.openedEvidenceIds).toEqual(
    scenario.debrief.efficient_path.flatMap((entry) =>
      entry.kind === 'evidence' ? [entry.ref] : [],
    ),
  )
  expect(scenario.investigation_budget).toBeUndefined()
  expect(investigation.budgetRemaining).toBeUndefined()
}
```

This test may initially expose authored ordering mistakes. Fix scenario content
only if the test demonstrates that an efficient path violates its validated
dependencies; do not weaken engine unlocking.

- [ ] **Step 2: Run the authored-content integration test**

Run:

```sh
npx vitest run src/content/scenario-content.test.ts
```

Expected: both real scenarios compose, begin, and open their authored efficient
evidence paths without budget pressure.

- [ ] **Step 3: Document optional budgets and investigation rules**

Update the top-level contract list in `docs/scenario-authoring.md` with:

```markdown
- `investigation_budget` (optional): a positive integer starting balance.
  Omit it for scenarios, especially beginner scenarios, that should not create
  budget pressure.
```

Add an “Investigation flow” subsection describing:

```markdown
Evidence with an empty `unlock_after` list is initially available. Other
evidence unlocks only after every referenced dependency has been opened. The
first opening records its authored cost; an enabled budget deducts that cost
once. Reopening evidence is free. Bookmarks require opened evidence, and
hypothesis choices must reference an authored hypothesis ID.
```

State explicitly that evidence `relevance` and `explanation` remain hidden
during investigation.

- [ ] **Step 4: Document the implemented investigation boundary**

Update the architecture flow in `docs/architecture.md`:

```text
validated ScenarioSource + seed
    ↓ deterministic composer
source-isolated ScenarioInstance
    ↓ pure investigation command reducer + safe selectors
InvestigationState + active-investigation evidence views
    ↓ future React investigation workspace
static HTML, CSS, and JavaScript in dist/
```

Add an architecture decision:

```markdown
### Pure investigation transitions

Milestone 4 stores durable investigation facts and derives availability from
authored dependencies. Commands are atomic and framework-independent. Time is
an explicit initialization input, budgets are optional, and active selectors
omit hidden relevance, explanations, root-cause, and debrief data.
```

Replace the current milestone boundary with Milestone 4 deliverables. Retain
investigation UI, diagnosis submission, scoring, remediation, communication,
debrief, persistence, sharing, and daily challenges as later work.

- [ ] **Step 5: Format only Milestone 4 files**

Run:

```sh
npx prettier --write src/content/scenario-schema.ts src/content/scenario-schema.test.ts src/content/scenario-content.test.ts src/engine/investigation-state.ts src/engine/investigation-engine.ts src/engine/investigation-engine.test.ts src/engine/investigation-selectors.ts src/engine/investigation-selectors.test.ts docs/scenario-authoring.md docs/architecture.md docs/superpowers/specs/2026-09-25-milestone-4-investigation-engine-design.md docs/superpowers/plans/2026-09-26-milestone-4-investigation-engine.md
```

Expected: listed files are formatted or unchanged; no unrelated file is
rewritten.

- [ ] **Step 6: Run the complete Milestone 4 gate**

Run each command separately:

```sh
npm run lint
npm run format:check
npm test
npm run validate:scenarios
npm run build
npm run test:e2e
git diff --check
git diff --exit-code -- src/generated/scenario-index.json
git status --short
```

Expected:

- lint and formatting pass with no warnings;
- all Node and Vitest tests pass;
- exactly two scenarios validate;
- TypeScript and the production Vite build succeed;
- all existing Chromium regression tests pass;
- generated public index has no drift because no browse-safe field changed;
- `git diff --check` prints nothing; and
- status lists only the three semantic Task 6 files plus any formatting-only
  changes to the M4 spec and plan before commit.

- [ ] **Step 7: Commit documentation and real-content proof**

```sh
git add src/content/scenario-content.test.ts docs/scenario-authoring.md docs/architecture.md docs/superpowers/specs/2026-09-25-milestone-4-investigation-engine-design.md docs/superpowers/plans/2026-09-26-milestone-4-investigation-engine.md
git commit -m "docs: record investigation engine contract"
```

Include the spec/plan only if Prettier changed them; otherwise Git ignores the
unchanged paths.

- [ ] **Step 8: Verify the committed branch is clean**

Run:

```sh
git status --short
git log -8 --oneline
```

Expected: status is empty and the latest commits are the six Milestone 4
checkpoints following the approved design commit.

## Stop condition

Stop when the committed branch passes the complete gate and both authored
scenarios can traverse their efficient evidence paths through the pure engine.
Do not begin Milestone 5, activate browser controls, add submission/scoring, or
persist investigation state.
