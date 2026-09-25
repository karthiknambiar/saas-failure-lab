import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from '../content/scenario-schema'
import { createScenarioFixture } from '../content/test-fixtures'
import { composeScenario } from './compose-scenario'
import type { ScenarioInstance } from './scenario-instance'

function scenarioFixture(): ScenarioSource {
  const scenario = createScenarioFixture() as ScenarioSource

  scenario.brief.symptom_variants = [
    'Two users can sign in but cannot open reporting.',
    'Reporting shows access denied after a successful sign-in.',
  ]
  scenario.red_herrings = {
    pool: ['alpha', 'bravo', 'charlie', 'delta', 'echo'].map((id) => ({
      id,
      label: `${id[0].toUpperCase()}${id.slice(1)}`,
      explanation: 'Not causal.',
    })),
    choose: 2,
  }

  return scenario
}

function invariantProjection(instance: ScenarioInstance) {
  const { composition, scenario } = instance
  const { customer_context, brief, evidence, red_herrings, ...invariants } =
    scenario
  void red_herrings

  return {
    ...invariants,
    customer_context: customer_context.map((value) =>
      value.replaceAll(composition.customerName, '{{customerName}}'),
    ),
    brief: {
      severity: brief.severity,
      business_impact: brief.business_impact,
    },
    evidence: evidence.map(({ content, ...entry }) => ({
      ...entry,
      content:
        content.kind === 'timeline'
          ? {
              kind: content.kind,
              events: content.events.map(({ event }) => ({ event })),
            }
          : content,
    })),
  }
}

describe('composeScenario', () => {
  it('normalizes the seed before composing', () => {
    const source = scenarioFixture()

    expect(composeScenario(source, ' demo-seed ')).toEqual(
      composeScenario(source, 'demo-seed'),
    )
  })

  it('varies only the source-declared composition dimensions', () => {
    const alpha = composeScenario(scenarioFixture(), 'alpha')
    const charlie = composeScenario(scenarioFixture(), 'charlie')

    expect(alpha).not.toEqual(charlie)
    expect(invariantProjection(alpha)).toEqual(invariantProjection(charlie))
  })

  it('selects and renders the demo customer and symptom', () => {
    const instance = composeScenario(scenarioFixture(), 'demo-seed')

    expect(instance.composition.customerName).toBe('Northstar Components')
    expect(instance.scenario.customer_context).toEqual([
      'Northstar Components uses role-based access for reporting.',
    ])
    expect(instance.scenario.brief.symptom).toBe(
      'Reporting shows access denied after a successful sign-in.',
    )
    expect(JSON.stringify(instance)).not.toContain('{{customerName}}')
  })

  it('renders customer names containing replacement tokens literally', () => {
    const source = scenarioFixture()
    source.variations.customer_names = ['North $& South']

    const instance = composeScenario(source, 'demo-seed')

    expect(instance.scenario.customer_context).toEqual([
      'North $& South uses role-based access for reporting.',
    ])
    expect(JSON.stringify(instance)).not.toContain('{{customerName}}')
  })

  it('returns the exact resolved scenario shape', () => {
    const scenario = composeScenario(scenarioFixture(), 'demo-seed').scenario

    expect(scenario).not.toHaveProperty('variations')
    expect(scenario.brief).not.toHaveProperty('symptom_variants')
    expect(Object.keys(scenario).sort()).toEqual(
      [
        'brief',
        'communication',
        'customer_context',
        'debrief',
        'difficulty',
        'domain',
        'estimated_minutes',
        'evidence',
        'hypotheses',
        'id',
        'learning',
        'red_herrings',
        'remediation',
        'root_cause',
        'title',
        'version',
      ].sort(),
    )
    expect(Object.keys(scenario.brief).sort()).toEqual(
      ['business_impact', 'severity', 'symptom'].sort(),
    )
  })

  it('selects symptoms from an independent seed stream', () => {
    expect(
      composeScenario(scenarioFixture(), 'seed-0').scenario.brief.symptom,
    ).toBe('Two users can sign in but cannot open reporting.')
    expect(
      composeScenario(scenarioFixture(), 'seed-1').scenario.brief.symptom,
    ).toBe('Reporting shows access denied after a successful sign-in.')
  })

  it('shifts timeline timestamps across positive day boundaries', () => {
    const source = scenarioFixture()
    source.variations.timestamp_offsets_minutes = [120]
    source.evidence[0].content = {
      kind: 'timeline',
      events: [
        {
          time: { day_offset: -1, clock: '23:30' },
          event: 'Previous event.',
        },
        {
          time: { day_offset: 0, clock: '23:30' },
          event: 'Current event.',
        },
      ],
    }

    expect(
      composeScenario(source, 'demo-seed').scenario.evidence[0].content,
    ).toEqual({
      kind: 'timeline',
      events: [
        { time: 'Today 01:30', event: 'Previous event.' },
        { time: '1 day later 01:30', event: 'Current event.' },
      ],
    })
  })

  it('shifts timeline timestamps across negative day boundaries', () => {
    const source = scenarioFixture()
    source.variations.timestamp_offsets_minutes = [-120]
    source.evidence[0].content = {
      kind: 'timeline',
      events: [
        {
          time: { day_offset: 0, clock: '00:30' },
          event: 'Early event.',
        },
      ],
    }

    expect(
      composeScenario(source, 'demo-seed').scenario.evidence[0].content,
    ).toEqual({
      kind: 'timeline',
      events: [{ time: 'Previous day 22:30', event: 'Early event.' }],
    })
  })

  it('selects deterministic red herrings in source order', () => {
    const instance = composeScenario(scenarioFixture(), 'demo-seed')

    expect(instance.composition.selectedRedHerringIds).toEqual([
      'bravo',
      'delta',
    ])
    expect(instance.scenario.red_herrings).toEqual([
      { id: 'bravo', label: 'Bravo', explanation: 'Not causal.' },
      { id: 'delta', label: 'Delta', explanation: 'Not causal.' },
    ])
  })

  it('returns no red herrings when the source chooses zero', () => {
    const source = scenarioFixture()
    source.red_herrings.choose = 0

    expect(composeScenario(source, 'demo-seed').scenario.red_herrings).toEqual(
      [],
    )
  })

  it('does not mutate or share nested data with the source', () => {
    const source = scenarioFixture()
    const before = structuredClone(source)
    const instance = composeScenario(source, 'demo-seed')

    instance.scenario.learning.concepts.push('returned-instance-mutation')

    expect(source).toEqual(before)
    expect(source.learning.concepts).not.toContain('returned-instance-mutation')
  })
})
