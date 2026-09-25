# Milestone 3 Deterministic Scenario Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure deterministic engine that composes a validated scenario and seed into a source-isolated instance with only explicitly authored customer, symptom, timestamp, and red-herring variation.

**Architecture:** Extend the build-time scenario contract with explicit variation pools and structured timeline times, then use fixed local seed algorithms with independent named streams. The framework-independent composer clones its validated input, resolves only declared dimensions, and returns an engine-owned instance without adding UI, persistence, services, or runtime YAML parsing.

**Tech Stack:** TypeScript 6, Zod 4, YAML, Vitest 5, existing Node/tsx validation CLI, ESLint, Prettier, Vite 8

---

## File map

### New files

- `src/engine/seed.ts` — seed normalization, fixed FNV-1a derivation, deterministic index selection, and deterministic sampling without replacement.
- `src/engine/seed.test.ts` — pinned algorithm outputs, invalid-seed behavior, dimension isolation, and sampling guarantees.
- `src/engine/scenario-instance.ts` — resolved timeline, evidence, scenario-instance, and composition-metadata types.
- `src/engine/compose-scenario.ts` — pure customer, symptom, timestamp, and red-herring composition.
- `src/engine/compose-scenario.test.ts` — repeatability, permitted variation, rollover, input isolation, and red-herring tests.

### Modified files

- `src/content/scenario-schema.ts` — required variation pools and structured timeline source times.
- `src/content/scenario-schema.test.ts` — schema boundaries for pools, offsets, day offsets, and clocks.
- `src/content/validate-scenarios.ts` — semantic rejection of unsupported customer-context template tokens.
- `src/content/validate-scenarios.test.ts` — supported and unsupported token behavior.
- `src/content/test-fixtures.ts` — valid variation defaults and a structured timeline fixture.
- `src/content/scenario-content.test.ts` — real authored scenarios compose for a fixed seed matrix.
- `content/scenarios/iam-001.yaml` — explicit customer choices, offsets, tokenized context, and structured times.
- `content/scenarios/fnd-001.yaml` — explicit customer choices, offsets, tokenized context, and structured times.
- `docs/scenario-authoring.md` — exact variation and timeline authoring contract.
- `docs/architecture.md` — mark the deterministic composer boundary implemented and retain later-milestone exclusions.

No package, route, component, generated browser bundle, storage adapter, or deployment file changes.

---

### Task 1: Extend and migrate the authored scenario contract

**Files:**

- Modify: `src/content/scenario-schema.test.ts`
- Modify: `src/content/validate-scenarios.test.ts`
- Modify: `src/content/test-fixtures.ts`
- Modify: `src/content/scenario-schema.ts`
- Modify: `src/content/validate-scenarios.ts`
- Modify: `content/scenarios/iam-001.yaml`
- Modify: `content/scenarios/fnd-001.yaml`

- [ ] **Step 1: Add valid variation and timeline data to the shared fixture**

Add this required block after `learning` in `createScenarioFixture()`:

```ts
variations: {
  customer_names: ['Northstar Components', 'Meridian Fabrication'],
  timestamp_offsets_minutes: [0, 17, 43],
},
```

Replace the fixture's single status evidence item with a timeline so schema and
composer tests share a realistic structured timestamp:

```ts
evidence: [
  {
    id: 'service-status',
    tool: 'service_status',
    cost: 1,
    relevance: 'supporting',
    unlock_after: [],
    content: {
      kind: 'timeline',
      events: [
        {
          time: { day_offset: 0, clock: '09:02' },
          event: 'All systems reported normal.',
        },
      ],
    },
    explanation: 'A broad outage is unlikely.',
  },
],
```

Change its context to exercise the one supported token:

```ts
customer_context: [
  '{{customerName}} uses role-based access for reporting.',
],
```

- [ ] **Step 2: Write failing schema boundary tests**

Append these tests to `src/content/scenario-schema.test.ts`:

```ts
it('requires non-empty customer-name and timestamp-offset pools', () => {
  const noCustomers = createScenarioFixture()
  noCustomers.variations.customer_names = []
  const noOffsets = createScenarioFixture()
  noOffsets.variations.timestamp_offsets_minutes = []

  expect(scenarioSourceSchema.safeParse(noCustomers).success).toBe(false)
  expect(scenarioSourceSchema.safeParse(noOffsets).success).toBe(false)
})

it.each([-181, 181])(
  'rejects timestamp offset %i outside the safe bound',
  (offset) => {
    const scenario = createScenarioFixture()
    scenario.variations.timestamp_offsets_minutes = [offset]

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  },
)

it.each([-366, 366])(
  'rejects timeline day offset %i outside the safe bound',
  (dayOffset) => {
    const scenario = createScenarioFixture()
    const content = scenario.evidence[0].content
    if (content.kind !== 'timeline')
      throw new Error('Expected timeline fixture')
    content.events[0].time.day_offset = dayOffset

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  },
)

it.each(['9:02', '24:00', '09:60'])(
  'rejects malformed timeline clock %s',
  (clock) => {
    const scenario = createScenarioFixture()
    const content = scenario.evidence[0].content
    if (content.kind !== 'timeline')
      throw new Error('Expected timeline fixture')
    content.events[0].time.clock = clock

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  },
)
```

- [ ] **Step 3: Write failing semantic token tests**

Append these tests to `src/content/validate-scenarios.test.ts`:

```ts
it('accepts the exact customer-name template token', () => {
  const scenario = createScenarioFixture() as ScenarioSource

  expect(validateScenarioDocuments([document(scenario)])).toEqual([])
})

it.each(['{{companyName}}', '{{ customerName }}', '{{customer_name}}'])(
  'reports unsupported customer-context token %s',
  (token) => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.customer_context = [`${token} uses reporting.`]

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'customer_context[0]',
      message: `Unsupported template token "${token}". Use "{{customerName}}".`,
    })
  },
)
```

- [ ] **Step 4: Run the focused tests and verify the new contract fails**

Run:

```sh
npx vitest run src/content/scenario-schema.test.ts src/content/validate-scenarios.test.ts
```

Expected: FAIL because `variations` is not in the strict source schema and
timeline `time` still requires a string.

- [ ] **Step 5: Implement the Zod source contract**

Add these schemas near the top of `src/content/scenario-schema.ts`:

```ts
const timelineTimeSchema = z
  .object({
    day_offset: z.number().int().min(-365).max(365),
    clock: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict()

const variationsSchema = z
  .object({
    customer_names: z.array(nonemptyString).min(1),
    timestamp_offsets_minutes: z
      .array(z.number().int().min(-180).max(180))
      .min(1),
  })
  .strict()
```

Change the timeline event field from `time: nonemptyString` to:

```ts
time: timelineTimeSchema,
```

Add this required property after `learning` in `scenarioSourceSchema`:

```ts
variations: variationsSchema,
```

- [ ] **Step 6: Implement semantic template-token validation**

Add this helper to `src/content/validate-scenarios.ts`:

```ts
function reportUnsupportedTemplateTokens(
  issues: ScenarioIssue[],
  filePath: string,
  values: readonly string[],
): void {
  values.forEach((value, index) => {
    for (const match of value.matchAll(/{{[^{}]*}}/g)) {
      const token = match[0]
      if (token !== '{{customerName}}') {
        addIssue(
          issues,
          filePath,
          `customer_context[${index}]`,
          `Unsupported template token "${token}". Use "{{customerName}}".`,
        )
      }
    }
  })
}
```

Call it in `validateDocument()` immediately after the source-name check:

```ts
reportUnsupportedTemplateTokens(issues, filePath, scenario.customer_context)
```

- [ ] **Step 7: Migrate IAM-001 to the explicit contract**

Add after `learning` in `content/scenarios/iam-001.yaml`:

```yaml
variations:
  customer_names:
    - Northstar Components
    - Meridian Fabrication
    - Cedar Ridge Works
  timestamp_offsets_minutes:
    - 0
    - 17
    - 43
```

Change its first context line to:

```yaml
- '{{customerName}} is a fictional manufacturer using role-based access for its finance workspace.'
```

Replace its six timeline `time` values, preserving the authored order:

```yaml
time: { day_offset: 0, clock: '09:02' }
time: { day_offset: 0, clock: '09:05' }
time: { day_offset: 0, clock: '09:06' }
time: { day_offset: -1, clock: '16:40' }
time: { day_offset: -1, clock: '16:43' }
time: { day_offset: -1, clock: '16:45' }
```

- [ ] **Step 8: Migrate FND-001 to the explicit contract**

Add after `learning` in `content/scenarios/fnd-001.yaml`:

```yaml
variations:
  customer_names:
    - Alder & Finch
    - Harbor & Pine
    - Juniper Row
  timestamp_offsets_minutes:
    - 0
    - 19
    - 41
```

Change its first context line to:

```yaml
- '{{customerName}} is a fictional retailer whose finance team uses a forecasting workspace.'
```

Replace its three timeline `time` values:

```yaml
time: { day_offset: -5, clock: '10:15' }
time: { day_offset: -5, clock: '10:16' }
time: { day_offset: 0, clock: '09:20' }
```

- [ ] **Step 9: Verify the migrated contract**

Run:

```sh
npx vitest run src/content/scenario-schema.test.ts src/content/validate-scenarios.test.ts src/content/scenario-content.test.ts
npm run validate:scenarios
```

Expected: all focused tests pass and the CLI prints `Validated 2 scenarios.`

- [ ] **Step 10: Commit the contract migration**

```sh
git add src/content/scenario-schema.ts src/content/scenario-schema.test.ts src/content/validate-scenarios.ts src/content/validate-scenarios.test.ts src/content/test-fixtures.ts content/scenarios/iam-001.yaml content/scenarios/fnd-001.yaml
git commit -m "feat(content): declare safe scenario variations"
```

---

### Task 2: Add the fixed deterministic seed primitive

**Files:**

- Create: `src/engine/seed.test.ts`
- Create: `src/engine/seed.ts`

- [ ] **Step 1: Write failing seed tests**

Create `src/engine/seed.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  InvalidSeedError,
  deriveSeed,
  normalizeSeed,
  selectIndex,
  selectIndices,
} from './seed'

const scope = {
  scenarioId: 'iam-001',
  scenarioVersion: 1,
  seed: 'demo-seed',
}

describe('normalizeSeed', () => {
  it('trims and returns a valid seed', () => {
    expect(normalizeSeed('  demo-seed  ')).toBe('demo-seed')
  })

  it.each(['', '   ', 'x'.repeat(129)])(
    'rejects invalid seed input',
    (seed) => {
      expect(() => normalizeSeed(seed)).toThrow(InvalidSeedError)
    },
  )
})

describe('deterministic selection', () => {
  it('pins the derivation algorithm', () => {
    expect(deriveSeed({ ...scope, dimension: 'customer-name' })).toBe(
      1095030276,
    )
  })

  it('selects the same index for the same named stream', () => {
    expect(selectIndex({ ...scope, dimension: 'customer-name' }, 3)).toBe(0)
    expect(selectIndex({ ...scope, dimension: 'customer-name' }, 3)).toBe(0)
  })

  it('samples unique indices without replacement in source order', () => {
    expect(
      selectIndices({ ...scope, dimension: 'red-herrings' }, 5, 2),
    ).toEqual([1, 3])
  })

  it('accepts an empty sample but rejects impossible selections', () => {
    expect(
      selectIndices({ ...scope, dimension: 'red-herrings' }, 0, 0),
    ).toEqual([])
    expect(() =>
      selectIndex({ ...scope, dimension: 'customer-name' }, 0),
    ).toThrow(RangeError)
    expect(() =>
      selectIndices({ ...scope, dimension: 'red-herrings' }, 2, 3),
    ).toThrow(RangeError)
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```sh
npx vitest run src/engine/seed.test.ts
```

Expected: FAIL because `src/engine/seed.ts` does not exist.

- [ ] **Step 3: Implement the fixed seed utility**

Create `src/engine/seed.ts`:

```ts
const MAX_SEED_LENGTH = 128
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
const NONZERO_FALLBACK = 0x9e3779b9

export class InvalidSeedError extends Error {
  readonly code = 'INVALID_SEED'

  constructor(message: string) {
    super(message)
    this.name = 'InvalidSeedError'
  }
}

export interface SeedScope {
  scenarioId: string
  scenarioVersion: number
  seed: string
  dimension: string
}

export function normalizeSeed(seed: string): string {
  const normalized = seed.trim()
  if (normalized.length === 0) {
    throw new InvalidSeedError('Seed must not be empty.')
  }
  if (normalized.length > MAX_SEED_LENGTH) {
    throw new InvalidSeedError(
      `Seed must contain at most ${MAX_SEED_LENGTH} characters.`,
    )
  }
  return normalized
}

function hashFnv1a(value: string): number {
  let hash = FNV_OFFSET_BASIS
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), FNV_PRIME)
  }
  return hash >>> 0
}

function seedMaterial(scope: SeedScope): string {
  return [
    scope.scenarioId,
    String(scope.scenarioVersion),
    normalizeSeed(scope.seed),
    scope.dimension,
  ].join('|')
}

export function deriveSeed(scope: SeedScope): number {
  return hashFnv1a(seedMaterial(scope))
}

function createUint32Stream(seed: number): () => number {
  let state = seed || NONZERO_FALLBACK
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return state >>> 0
  }
}

export function selectIndex(scope: SeedScope, optionCount: number): number {
  if (!Number.isInteger(optionCount) || optionCount < 1) {
    throw new RangeError('Option count must be a positive integer.')
  }
  return deriveSeed(scope) % optionCount
}

export function selectIndices(
  scope: SeedScope,
  optionCount: number,
  selectionCount: number,
): number[] {
  if (
    !Number.isInteger(optionCount) ||
    !Number.isInteger(selectionCount) ||
    optionCount < 0 ||
    selectionCount < 0 ||
    selectionCount > optionCount
  ) {
    throw new RangeError('Selection count must fit within the option count.')
  }

  const indices = Array.from({ length: optionCount }, (_, index) => index)
  const nextUint32 = createUint32Stream(deriveSeed(scope))
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = nextUint32() % (index + 1)
    ;[indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]]
  }

  return indices.slice(0, selectionCount).sort((left, right) => left - right)
}
```

The leading semicolon before the tuple assignment prevents automatic semicolon
insertion from treating it as a continuation of the previous declaration.

- [ ] **Step 4: Run the seed tests and quality checks**

Run:

```sh
npx vitest run src/engine/seed.test.ts
npm run lint
npm run format:check
```

Expected: all commands pass with the pinned outputs above.

- [ ] **Step 5: Commit the deterministic primitive**

```sh
git add src/engine/seed.ts src/engine/seed.test.ts
git commit -m "feat(engine): add deterministic seed selection"
```

---

### Task 3: Compose source-isolated scenario instances

**Files:**

- Create: `src/engine/scenario-instance.ts`
- Create: `src/engine/compose-scenario.test.ts`
- Create: `src/engine/compose-scenario.ts`

- [ ] **Step 1: Define the resolved instance types**

Create `src/engine/scenario-instance.ts`:

```ts
import type { ScenarioSource } from '../content/scenario-schema'

type SourceEvidence = ScenarioSource['evidence'][number]
type SourceContent = SourceEvidence['content']
type SourceTimelineContent = Extract<SourceContent, { kind: 'timeline' }>
type NonTimelineContent = Exclude<SourceContent, SourceTimelineContent>

export interface ScenarioTimelineContent {
  kind: 'timeline'
  events: Array<{
    time: string
    event: string
  }>
}

export type ScenarioInstanceEvidence = Omit<SourceEvidence, 'content'> & {
  content: NonTimelineContent | ScenarioTimelineContent
}

type SourceBrief = ScenarioSource['brief']
type RedHerring = ScenarioSource['red_herrings']['pool'][number]

export type ResolvedScenario = Omit<
  ScenarioSource,
  'variations' | 'customer_context' | 'brief' | 'evidence' | 'red_herrings'
> & {
  customer_context: string[]
  brief: Omit<SourceBrief, 'symptom_variants'> & { symptom: string }
  evidence: ScenarioInstanceEvidence[]
  red_herrings: RedHerring[]
}

export interface ScenarioInstance {
  composition: {
    seed: string
    customerName: string
    timestampOffsetMinutes: number
    selectedRedHerringIds: string[]
  }
  scenario: ResolvedScenario
}
```

- [ ] **Step 2: Write failing composer tests**

Create `src/engine/compose-scenario.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from '../content/scenario-schema'
import { createScenarioFixture } from '../content/test-fixtures'
import { composeScenario } from './compose-scenario'
import type { ScenarioInstance } from './scenario-instance'

function fixture(): ScenarioSource {
  const scenario = createScenarioFixture() as ScenarioSource
  scenario.brief.symptom_variants = [
    'Two users can sign in but cannot open reporting.',
    'Reporting shows access denied after a successful sign-in.',
  ]
  scenario.red_herrings = {
    pool: [
      { id: 'alpha', label: 'Alpha', explanation: 'Not causal.' },
      { id: 'bravo', label: 'Bravo', explanation: 'Not causal.' },
      { id: 'charlie', label: 'Charlie', explanation: 'Not causal.' },
      { id: 'delta', label: 'Delta', explanation: 'Not causal.' },
      { id: 'echo', label: 'Echo', explanation: 'Not causal.' },
    ],
    choose: 2,
  }
  return scenario
}

function invariantProjection(instance: ScenarioInstance) {
  return {
    id: instance.scenario.id,
    version: instance.scenario.version,
    title: instance.scenario.title,
    domain: instance.scenario.domain,
    difficulty: instance.scenario.difficulty,
    estimated_minutes: instance.scenario.estimated_minutes,
    learning: instance.scenario.learning,
    root_cause: instance.scenario.root_cause,
    hypotheses: instance.scenario.hypotheses,
    remediation: instance.scenario.remediation,
    communication: instance.scenario.communication,
    debrief: instance.scenario.debrief,
    evidenceWithoutTimes: instance.scenario.evidence.map((item) => ({
      ...item,
      content:
        item.content.kind === 'timeline'
          ? {
              ...item.content,
              events: item.content.events.map(({ event }) => ({ event })),
            }
          : item.content,
    })),
  }
}

describe('composeScenario', () => {
  it('returns an exactly repeatable instance for the same seed', () => {
    expect(composeScenario(fixture(), ' demo-seed ')).toEqual(
      composeScenario(fixture(), 'demo-seed'),
    )
  })

  it('changes only explicitly permitted fields across known seeds', () => {
    const first = composeScenario(fixture(), 'alpha')
    const second = composeScenario(fixture(), 'charlie')

    expect(first).not.toEqual(second)
    expect(invariantProjection(first)).toEqual(invariantProjection(second))
  })

  it('renders the chosen customer and one chosen symptom', () => {
    const instance = composeScenario(fixture(), 'demo-seed')

    expect(instance.composition.customerName).toBe('Northstar Components')
    expect(instance.scenario.customer_context).toEqual([
      'Northstar Components uses role-based access for reporting.',
    ])
    expect(instance.scenario.brief.symptom).toBe(
      'Reporting shows access denied after a successful sign-in.',
    )
    expect(JSON.stringify(instance)).not.toContain('{{customerName}}')
  })

  it('selects symptom variants from an independent named stream', () => {
    expect(composeScenario(fixture(), 'seed-0').scenario.brief.symptom).toBe(
      'Two users can sign in but cannot open reporting.',
    )
    expect(composeScenario(fixture(), 'seed-1').scenario.brief.symptom).toBe(
      'Reporting shows access denied after a successful sign-in.',
    )
  })

  it('shifts structured times together and handles day rollover', () => {
    const scenario = fixture()
    scenario.variations.timestamp_offsets_minutes = [120]
    const content = scenario.evidence[0].content
    if (content.kind !== 'timeline')
      throw new Error('Expected timeline fixture')
    content.events = [
      { time: { day_offset: -1, clock: '23:30' }, event: 'Earlier event' },
      { time: { day_offset: 0, clock: '23:30' }, event: 'Later event' },
    ]

    const instance = composeScenario(scenario, 'rollover')
    const resolved = instance.scenario.evidence[0].content
    if (resolved.kind !== 'timeline')
      throw new Error('Expected timeline result')

    expect(resolved.events.map(({ time }) => time)).toEqual([
      'Today 01:30',
      '1 day later 01:30',
    ])
  })

  it('selects unique red herrings in source order', () => {
    const instance = composeScenario(fixture(), 'demo-seed')

    expect(instance.composition.selectedRedHerringIds).toEqual([
      'bravo',
      'delta',
    ])
    expect(instance.scenario.red_herrings.map(({ id }) => id)).toEqual([
      'bravo',
      'delta',
    ])
  })

  it('supports choosing zero red herrings', () => {
    const scenario = fixture()
    scenario.red_herrings.choose = 0

    expect(composeScenario(scenario, 'none').scenario.red_herrings).toEqual([])
  })

  it('does not mutate or share nested data with its source', () => {
    const source = fixture()
    const before = structuredClone(source)
    const instance = composeScenario(source, 'isolation')

    instance.scenario.learning.concepts.push('mutated-instance')
    expect(source).toEqual(before)
    expect(source.learning.concepts).not.toContain('mutated-instance')
  })
})
```

- [ ] **Step 3: Run the composer test and verify it fails**

Run:

```sh
npx vitest run src/engine/compose-scenario.test.ts
```

Expected: FAIL because `compose-scenario.ts` does not exist.

- [ ] **Step 4: Implement pure composition and timestamp formatting**

Create `src/engine/compose-scenario.ts`:

```ts
import type { ScenarioSource } from '../content/scenario-schema'
import { normalizeSeed, selectIndex, selectIndices } from './seed'
import type {
  ResolvedScenario,
  ScenarioInstance,
  ScenarioInstanceEvidence,
} from './scenario-instance'

const MINUTES_PER_DAY = 24 * 60

function scope(source: ScenarioSource, seed: string, dimension: string) {
  return {
    scenarioId: source.id,
    scenarioVersion: source.version,
    seed,
    dimension,
  }
}

function selectOne<T>(
  values: readonly T[],
  source: ScenarioSource,
  seed: string,
  dimension: string,
): T {
  return values[selectIndex(scope(source, seed, dimension), values.length)]
}

function renderCustomerContext(
  values: readonly string[],
  customerName: string,
): string[] {
  return values.map((value) =>
    value.replaceAll('{{customerName}}', customerName),
  )
}

function parseClock(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number)
  return hours * 60 + minutes
}

function formatDay(dayOffset: number): string {
  if (dayOffset === 0) return 'Today'
  if (dayOffset === -1) return 'Previous day'
  if (dayOffset < -1) return `${Math.abs(dayOffset)} days ago`
  if (dayOffset === 1) return '1 day later'
  return `${dayOffset} days later`
}

function formatShiftedTime(
  time: { day_offset: number; clock: string },
  offsetMinutes: number,
): string {
  const totalMinutes =
    time.day_offset * MINUTES_PER_DAY + parseClock(time.clock) + offsetMinutes
  const dayOffset = Math.floor(totalMinutes / MINUTES_PER_DAY)
  const minuteOfDay =
    ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = minuteOfDay % 60
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  return `${formatDay(dayOffset)} ${clock}`
}

function resolveEvidence(
  evidence: ScenarioSource['evidence'],
  timestampOffsetMinutes: number,
): ScenarioInstanceEvidence[] {
  return evidence.map((item) => ({
    ...item,
    unlock_after: [...item.unlock_after],
    content:
      item.content.kind === 'timeline'
        ? {
            kind: 'timeline',
            events: item.content.events.map(({ time, event }) => ({
              time: formatShiftedTime(time, timestampOffsetMinutes),
              event,
            })),
          }
        : structuredClone(item.content),
  }))
}

export function composeScenario(
  source: ScenarioSource,
  seedInput: string,
): ScenarioInstance {
  const seed = normalizeSeed(seedInput)
  const customerName = selectOne(
    source.variations.customer_names,
    source,
    seed,
    'customer-name',
  )
  const symptom = selectOne(
    source.brief.symptom_variants,
    source,
    seed,
    'symptom',
  )
  const timestampOffsetMinutes = selectOne(
    source.variations.timestamp_offsets_minutes,
    source,
    seed,
    'timestamp',
  )
  const redHerringIndices = selectIndices(
    scope(source, seed, 'red-herrings'),
    source.red_herrings.pool.length,
    source.red_herrings.choose,
  )
  const selectedRedHerrings = redHerringIndices.map(
    (index) => source.red_herrings.pool[index],
  )

  const cloned = structuredClone(source)
  const {
    variations: _variations,
    customer_context: _customerContext,
    brief: _brief,
    evidence: _evidence,
    red_herrings: _redHerrings,
    ...unchanged
  } = cloned
  void _variations
  void _customerContext
  void _brief
  void _evidence
  void _redHerrings

  const scenario: ResolvedScenario = {
    ...unchanged,
    customer_context: renderCustomerContext(
      source.customer_context,
      customerName,
    ),
    brief: {
      severity: source.brief.severity,
      business_impact: source.brief.business_impact,
      symptom,
    },
    evidence: resolveEvidence(source.evidence, timestampOffsetMinutes),
    red_herrings: structuredClone(selectedRedHerrings),
  }

  return {
    composition: {
      seed,
      customerName,
      timestampOffsetMinutes,
      selectedRedHerringIds: scenario.red_herrings.map(({ id }) => id),
    },
    scenario,
  }
}
```

- [ ] **Step 5: Run composer and full unit tests**

Run:

```sh
npx vitest run src/engine/compose-scenario.test.ts src/engine/seed.test.ts
npm test
```

Expected: 8 composer tests pass, seed tests pass, and the complete existing test
suite remains green.

- [ ] **Step 6: Run static checks**

Run:

```sh
npm run lint
npm run format:check
```

Expected: both commands pass. If Prettier reports only the newly added files,
run `npx prettier --write` on those exact files and rerun both commands.

- [ ] **Step 7: Commit the composer**

```sh
git add src/engine/scenario-instance.ts src/engine/compose-scenario.ts src/engine/compose-scenario.test.ts
git commit -m "feat(engine): compose deterministic scenarios"
```

---

### Task 4: Prove authored scenarios compose and document the boundary

**Files:**

- Modify: `src/content/scenario-content.test.ts`
- Modify: `docs/scenario-authoring.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: Add a fixed-seed composition matrix for real content**

Import the composer in `src/content/scenario-content.test.ts`:

```ts
import { composeScenario } from '../engine/compose-scenario'
```

After the existing assertions inside the test, add:

```ts
const seeds = ['alpha', 'seed-1', 'demo-seed'] as const
for (const { scenario } of documents) {
  for (const seed of seeds) {
    const first = composeScenario(scenario, seed)
    const second = composeScenario(scenario, seed)

    expect(first).toEqual(second)
    expect(first.composition.seed).toBe(seed)
    expect(first.scenario.customer_context.join(' ')).not.toContain('{{')
    expect(first.scenario.red_herrings).toHaveLength(
      scenario.red_herrings.choose,
    )
  }
}
```

- [ ] **Step 2: Run the authored-content test**

Run:

```sh
npx vitest run src/content/scenario-content.test.ts
```

Expected: PASS for both YAML scenarios across all three fixed seeds.

- [ ] **Step 3: Document the exact authoring contract**

Update `docs/scenario-authoring.md` so the top-level section list includes:

```markdown
- `variations`: non-empty fictional `customer_names` and bounded
  `timestamp_offsets_minutes` pools used by deterministic composition.
```

Replace the timeline sentence in “Supported values” with:

```markdown
`timeline` has `events`, each with an `event` string and structured `time`:
`day_offset` is an integer from `-365` through `365`, and `clock` uses strict
24-hour `HH:mm`. The composer selects one integer timestamp offset from `-180`
through `180` minutes and applies it consistently to every timeline event.
```

Add this subsection before “Relationships and safeguards”:

```markdown
## Deterministic variation

Every scenario declares at least one fictional customer name and timestamp
offset. Use the exact `{{customerName}}` token where the chosen customer should
appear in `customer_context`; other template tokens are rejected. Customer,
symptom, timestamp, and red-herring choices are independently derived from the
scenario ID, version, and seed. Do not encode root-cause or evidence changes as
variations.
```

Update the compact example with:

```yaml
variations:
  customer_names: [Lumen Harbor, Summit Vale]
  timestamp_offsets_minutes: [0, 20]
customer_context:
  - '{{customerName}} is a fictional analytics company using scheduled exports.'
```

- [ ] **Step 4: Document the implemented engine boundary**

Update the architecture flow in `docs/architecture.md` to:

```text
content/scenarios/*.yaml
    ↓ YAML parse + Zod source schema + semantic validation
validated ScenarioSource + seed
    ↓ pure deterministic composer
source-isolated ScenarioInstance
    ↓ future investigation engine and React presentation
static HTML, CSS, and JavaScript in dist/
```

Add an architecture decision recording:

```markdown
### Deterministic scenario composition

Milestone 3 uses explicit variation pools, structured timeline values, and
fixed named seed streams. The composer is pure TypeScript and does not depend
on React, browser APIs, the current clock, or runtime randomness. Independent
dimension streams prevent a later permitted variation from reshuffling existing
choices for the same scenario version and seed.
```

Replace the current milestone boundary with a Milestone 3 boundary that lists
the seed utility, customer/symptom/timestamp composition, red-herring selection,
source isolation, and deterministic tests. Explicitly retain investigation
state, evidence unlocking, scoring, persistence, seeded routes, daily
challenges, and UI integration as later work.

- [ ] **Step 5: Format only the files touched by Milestone 3**

Run:

```sh
npx prettier --write src/content/scenario-schema.ts src/content/scenario-schema.test.ts src/content/validate-scenarios.ts src/content/validate-scenarios.test.ts src/content/test-fixtures.ts src/content/scenario-content.test.ts src/engine/seed.ts src/engine/seed.test.ts src/engine/scenario-instance.ts src/engine/compose-scenario.ts src/engine/compose-scenario.test.ts content/scenarios/iam-001.yaml content/scenarios/fnd-001.yaml docs/scenario-authoring.md docs/architecture.md
```

Expected: Prettier reports the listed files as formatted or unchanged. Do not
format unrelated files.

- [ ] **Step 6: Run the complete Milestone 3 verification gate**

Run each command separately:

```sh
npm run lint
npm run format:check
npm test
npm run validate:scenarios
npm run build
git diff --check
git status --short
```

Expected:

- lint and formatting pass with no warnings;
- all Node and Vitest tests pass;
- exactly two scenarios validate;
- TypeScript and the production Vite build succeed;
- `dist/index.html` and `dist/404.html` are emitted by the existing build;
- `git diff --check` prints nothing; and
- status lists only the intended uncommitted Task 4 files before commit.

If `src/generated/scenario-index.json` changes, inspect it before staging. It may
change only if a browse-safe field changed; this plan intentionally keeps those
fields stable, so unexpected drift is a failure to investigate rather than
commit automatically.

- [ ] **Step 7: Commit documentation and real-content proof**

```sh
git add src/content/scenario-content.test.ts docs/scenario-authoring.md docs/architecture.md
git commit -m "docs: record deterministic composition contract"
```

- [ ] **Step 8: Verify the committed branch is clean**

Run:

```sh
git status --short
git log -5 --oneline
```

Expected: status is empty and the latest commits are the four Milestone 3
checkpoints following the approved design commit.

## Stop condition

Stop when the committed branch passes the complete gate and can deterministically
compose both authored scenarios. Do not begin Milestone 4, activate browser
controls, add gameplay state, or expose the composer through a route.
