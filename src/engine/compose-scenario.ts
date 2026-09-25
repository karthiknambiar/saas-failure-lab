import type { ScenarioSource } from '../content/scenario-schema'
import { normalizeSeed, selectIndex, selectIndices } from './seed'
import type {
  ScenarioInstance,
  ScenarioInstanceEvidence,
} from './scenario-instance'

const MINUTES_PER_DAY = 1440

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
    value.replaceAll('{{customerName}}', () => customerName),
  )
}

function parseClock(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number)

  return hours * 60 + minutes
}

function formatDay(day: number): string {
  if (day === 0) return 'Today'
  if (day === -1) return 'Previous day'
  if (day < -1) return `${Math.abs(day)} days ago`
  if (day === 1) return '1 day later'
  return `${day} days later`
}

function formatShiftedTime(
  dayOffset: number,
  clock: string,
  timestampOffsetMinutes: number,
): string {
  const totalMinutes =
    dayOffset * MINUTES_PER_DAY + parseClock(clock) + timestampOffsetMinutes
  const day = Math.floor(totalMinutes / MINUTES_PER_DAY)
  const normalizedMinutes =
    ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60
  const shiftedClock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

  return `${formatDay(day)} ${shiftedClock}`
}

function resolveEvidence(
  evidence: ScenarioSource['evidence'],
  timestampOffsetMinutes: number,
): ScenarioInstanceEvidence[] {
  return evidence.map(({ content, unlock_after, ...entry }) => ({
    ...entry,
    unlock_after: [...unlock_after],
    content:
      content.kind === 'timeline'
        ? {
            kind: 'timeline',
            events: content.events.map(({ time, event }) => ({
              time: formatShiftedTime(
                time.day_offset,
                time.clock,
                timestampOffsetMinutes,
              ),
              event,
            })),
          }
        : structuredClone(content),
  }))
}

export function composeScenario(
  source: ScenarioSource,
  seed: string,
): ScenarioInstance {
  const normalizedSeed = normalizeSeed(seed)
  const clonedSource = structuredClone(source)
  const {
    variations,
    customer_context,
    brief,
    evidence,
    red_herrings,
    ...invariants
  } = clonedSource
  const customerName = selectOne(
    variations.customer_names,
    clonedSource,
    normalizedSeed,
    'customer-name',
  )
  const symptom = selectOne(
    brief.symptom_variants,
    clonedSource,
    normalizedSeed,
    'symptom',
  )
  const timestampOffsetMinutes = selectOne(
    variations.timestamp_offsets_minutes,
    clonedSource,
    normalizedSeed,
    'timestamp',
  )
  const selectedRedHerrings = selectIndices(
    scope(clonedSource, normalizedSeed, 'red-herrings'),
    red_herrings.pool.length,
    red_herrings.choose,
  ).map((index) => structuredClone(red_herrings.pool[index]))
  const scenario = {
    ...invariants,
    customer_context: renderCustomerContext(customer_context, customerName),
    brief: {
      severity: brief.severity,
      business_impact: brief.business_impact,
      symptom,
    },
    evidence: resolveEvidence(evidence, timestampOffsetMinutes),
    red_herrings: selectedRedHerrings,
  }

  return {
    composition: {
      seed: normalizedSeed,
      customerName,
      timestampOffsetMinutes,
      selectedRedHerringIds: scenario.red_herrings.map(({ id }) => id),
    },
    scenario,
  }
}
