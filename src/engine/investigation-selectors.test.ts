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
