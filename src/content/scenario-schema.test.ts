import { describe, expect, it } from 'vitest'

import { scenarioSourceSchema } from './scenario-schema'
import { createScenarioFixture } from './test-fixtures'

describe('scenarioSourceSchema', () => {
  it('accepts a complete scenario source', () => {
    expect(
      scenarioSourceSchema.safeParse(createScenarioFixture()).success,
    ).toBe(true)
  })

  it('rejects an uppercase scenario ID', () => {
    const scenario = createScenarioFixture()
    scenario.id = 'IAM-001'

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })

  it('rejects empty learning objectives', () => {
    const scenario = createScenarioFixture()
    scenario.learning.objectives = []

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })

  it('rejects empty customer-name variations', () => {
    const scenario = createScenarioFixture()
    scenario.variations.customer_names = []

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })

  it('rejects empty timestamp-offset variations', () => {
    const scenario = createScenarioFixture()
    scenario.variations.timestamp_offsets_minutes = []

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })

  it.each([-181, 181])(
    'rejects an out-of-range timestamp offset: %s',
    (offset) => {
      const scenario = createScenarioFixture()
      scenario.variations.timestamp_offsets_minutes = [offset]

      expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
    },
  )

  it.each([-366, 366])('rejects an out-of-range day offset: %s', (offset) => {
    const scenario = createScenarioFixture()
    const content = scenario.evidence[0].content
    if (content.kind !== 'timeline')
      throw new Error('Expected timeline content')
    content.events[0].time.day_offset = offset

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })

  it.each(['9:02', '24:00', '09:60'])(
    'rejects an invalid timeline clock: %s',
    (clock) => {
      const scenario = createScenarioFixture()
      const content = scenario.evidence[0].content
      if (content.kind !== 'timeline') {
        throw new Error('Expected timeline content')
      }
      content.events[0].time.clock = clock

      expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
    },
  )

  it('rejects an unsupported evidence tool', () => {
    const scenario = createScenarioFixture()
    scenario.evidence[0].tool = 'unsupported_tool'

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })

  it('rejects a negative evidence cost', () => {
    const scenario = createScenarioFixture()
    scenario.evidence[0].cost = -1

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })

  it('rejects fewer than three hypotheses', () => {
    const scenario = createScenarioFixture()
    scenario.hypotheses = scenario.hypotheses.slice(0, 2)

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })

  it('rejects an unknown evidence content kind', () => {
    const scenario = createScenarioFixture()
    scenario.evidence[0].content.kind = 'unknown'

    expect(scenarioSourceSchema.safeParse(scenario).success).toBe(false)
  })
})
