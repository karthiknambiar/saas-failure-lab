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
  getDiagnosisResultView,
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

describe('diagnosis result selector', () => {
  function completedDiagnosis() {
    const { instance, state } = selectorFixture()
    const selected = applyInvestigationCommand(instance, state, {
      type: 'select_hypothesis',
      hypothesisId: 'reporting-role-removed',
    })
    const completed = applyInvestigationCommand(instance, selected, {
      type: 'submit_diagnosis',
    })

    return { instance, state: completed }
  }

  function completedFullScoreDiagnosis() {
    const source = createScenarioFixture() as ScenarioSource
    const template = source.evidence[0]
    source.evidence = [
      {
        ...structuredClone(template),
        id: 'critical-one',
        relevance: 'critical',
        unlock_after: [],
      },
      {
        ...structuredClone(template),
        id: 'critical-two',
        relevance: 'critical',
        unlock_after: [],
      },
    ]
    const instance = composeScenario(source, 'full-score-selector-seed')
    const investigating = applyInvestigationCommand(
      instance,
      createInvestigation(instance, 1_000),
      { type: 'begin_investigation' },
    )
    const bookmarked = ['critical-one', 'critical-two'].reduce(
      (current, evidenceId) => {
        const opened = applyInvestigationCommand(instance, current, {
          type: 'open_evidence',
          evidenceId,
        })
        return applyInvestigationCommand(instance, opened, {
          type: 'bookmark_evidence',
          evidenceId,
        })
      },
      investigating,
    )
    const selected = applyInvestigationCommand(instance, bookmarked, {
      type: 'select_hypothesis',
      hypothesisId: instance.scenario.root_cause.id,
    })

    return {
      instance,
      state: applyInvestigationCommand(instance, selected, {
        type: 'submit_diagnosis',
      }),
    }
  }

  it('returns the exact safe public result view', () => {
    const { instance, state } = completedDiagnosis()

    expect(getDiagnosisResultView(instance, state)).toEqual({
      selectedHypothesisId: 'reporting-role-removed',
      selectedHypothesisLabel: 'The affected users lost their reporting role.',
      total: 70,
      outcome: 'strong',
    })
  })

  it('returns a strong 100-point view after bookmarking every critical item', () => {
    const { instance, state } = completedFullScoreDiagnosis()

    expect(getDiagnosisResultView(instance, state)).toEqual({
      selectedHypothesisId: 'reporting-role-removed',
      selectedHypothesisLabel: 'The affected users lost their reporting role.',
      total: 100,
      outcome: 'strong',
    })
  })

  it.each([
    [70, 'strong'],
    [100, 'strong'],
    [30, 'partial'],
    [69, 'partial'],
    [0, 'needs_revision'],
    [29, 'needs_revision'],
  ] as const)('classifies total %i as %s', (total, outcome) => {
    const { instance, state } = completedDiagnosis()
    const scored = {
      ...state,
      submission: {
        ...state.submission!,
        score: { ...state.submission!.score, total },
      },
    }

    expect(getDiagnosisResultView(instance, scored).outcome).toBe(outcome)
  })

  it('requires matching identity and a completed submission', () => {
    const { instance, state } = completedDiagnosis()

    expect(() =>
      getDiagnosisResultView(instance, {
        ...state,
        seed: 'different-seed',
      }),
    ).toThrow(expect.objectContaining({ code: 'SCENARIO_STATE_MISMATCH' }))
    expect(() =>
      getDiagnosisResultView(instance, { ...state, status: 'investigating' }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATUS' }))
    expect(() =>
      getDiagnosisResultView(instance, { ...state, submission: undefined }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATUS' }))
  })

  it('does not leak diagnosis scoring or scenario solution internals', () => {
    const { instance, state } = completedDiagnosis()
    const serialized = JSON.stringify(getDiagnosisResultView(instance, state))

    for (const sensitiveToken of [
      'diagnosisPoints',
      'evidencePoints',
      'root_cause',
      'critical',
      'relevance',
      'explanation',
      'remediation',
      'communication',
      'debrief',
      'actions',
      'bookmarked',
      'scenario',
    ]) {
      expect(serialized).not.toContain(sensitiveToken)
    }
  })

  it('does not mutate the instance or submitted state', () => {
    const { instance, state } = completedDiagnosis()
    const instanceBefore = structuredClone(instance)
    const stateBefore = structuredClone(state)

    getDiagnosisResultView(instance, state)

    expect(instance).toEqual(instanceBefore)
    expect(state).toEqual(stateBefore)
  })

  it('fails clearly when the submitted hypothesis is no longer authored', () => {
    const { instance, state } = completedDiagnosis()
    const invalid = {
      ...state,
      submission: {
        ...state.submission!,
        selectedHypothesisId: 'missing-hypothesis',
      },
    }

    expect(() => getDiagnosisResultView(instance, invalid)).toThrow(
      'Submitted hypothesis "missing-hypothesis" is not authored by the scenario.',
    )
  })
})
