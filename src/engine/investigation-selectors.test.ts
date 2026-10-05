import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from '../content/scenario-schema'
import { createScenarioFixture } from '../content/test-fixtures'
import { scenarioCatalog } from '../generated/scenario-catalog'
import { composeScenario } from './compose-scenario'
import {
  applyInvestigationCommand,
  createInvestigation,
  InvestigationTransitionError,
} from './investigation-engine'
import {
  getAvailableEvidenceIds,
  getDebriefView,
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

describe('completed debrief selector', () => {
  function completedFullScoreDebrief() {
    const source = structuredClone(
      scenarioCatalog.find(({ id }) => id === 'iam-001')!,
    )
    const instance = composeScenario(source, 'debrief-seed')
    const investigating = applyInvestigationCommand(
      instance,
      createInvestigation(instance, 1_000),
      { type: 'begin_investigation' },
    )
    const bookmarked = instance.scenario.evidence.reduce(
      (current, evidence) => {
        const opened = applyInvestigationCommand(instance, current, {
          type: 'open_evidence',
          evidenceId: evidence.id,
        })
        return applyInvestigationCommand(instance, opened, {
          type: 'bookmark_evidence',
          evidenceId: evidence.id,
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

  it('returns the exact safe completed debrief view with a full score', () => {
    const { instance, state } = completedFullScoreDebrief()

    expect(getDebriefView(instance, state)).toEqual({
      submittedDiagnosis:
        "A recent role change removed the affected users' reporting authorization.",
      score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
      rootCauseExplanation:
        'Both users authenticated successfully, but a bulk cleanup removed the role that authorized reporting. Restoring that role resolves the immediate impact; reviewing future role changes addresses recurrence.',
      evidenceChain: [
        {
          id: 'service-status',
          label: 'Service status',
          explanation:
            'Healthy services make a platform-wide outage less likely but do not explain the user-specific failure.',
        },
        {
          id: 'affected-user-scope',
          label: 'Affected user scope',
          explanation:
            'The comparison confines the problem to two user access profiles rather than the shared reporting service.',
        },
        {
          id: 'authentication-events',
          label: 'Authentication events',
          explanation:
            'Successful sign-ins rule out an authentication failure and direct the investigation toward authorization.',
        },
        {
          id: 'role-configuration',
          label: 'Role configuration',
          explanation:
            'The affected users are active but lack the role that grants reporting access.',
        },
        {
          id: 'role-audit-history',
          label: 'Role audit history',
          explanation:
            'The audit trail identifies the change that caused the authorization regression and the missing verification step.',
        },
      ],
      redHerrings: [
        {
          id: 'browser-update',
          label:
            "A browser update was installed on one affected user's laptop.",
          explanation:
            'The timing is plausible, but the server-side access denial and missing roles show that the browser change is not causal.',
        },
      ],
      efficientPath: [
        { kind: 'framework_step', label: 'Establish impact' },
        { kind: 'evidence', label: 'Service status' },
        { kind: 'framework_step', label: 'Determine scope' },
        { kind: 'evidence', label: 'Affected user scope' },
        { kind: 'evidence', label: 'Authentication events' },
        { kind: 'framework_step', label: 'Test hypothesis' },
        { kind: 'evidence', label: 'Role configuration' },
        { kind: 'framework_step', label: 'Check recent changes' },
        { kind: 'evidence', label: 'Role audit history' },
      ],
      transferableLesson:
        'A successful login proves authentication, not authorization. When a feature fails for only some users, compare their access configuration with working peers and confirm recent changes in the audit trail.',
    })
  })

  it('checks identity before completed status and rejects incomplete states', () => {
    const { instance, state } = completedFullScoreDebrief()

    expect(() =>
      getDebriefView(instance, {
        ...state,
        scenarioVersion: state.scenarioVersion + 1,
        status: 'intro',
      }),
    ).toThrow(expect.objectContaining({ code: 'SCENARIO_STATE_MISMATCH' }))

    for (const status of ['intro', 'investigating'] as const) {
      expect(() => getDebriefView(instance, { ...state, status })).toThrow(
        expect.objectContaining({ code: 'INVALID_STATUS' }),
      )
    }
    expect(() =>
      getDebriefView(instance, { ...state, submission: undefined }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATUS' }))
  })

  it('uses authored evidence and selected red-herring ordering', () => {
    const { instance, state } = completedFullScoreDebrief()
    const second = structuredClone(instance.scenario.red_herrings[0])
    second.id = 'later-herring'
    second.label = 'Later red herring'
    const unselected = structuredClone(instance.scenario.red_herrings[0])
    unselected.id = 'unselected-herring'
    unselected.label = 'Unselected red herring'
    instance.scenario.red_herrings = [
      second,
      unselected,
      instance.scenario.red_herrings[0],
    ]
    instance.composition.selectedRedHerringIds = [
      'browser-update',
      'later-herring',
    ]
    instance.scenario.debrief.evidence_chain = [
      'role-audit-history',
      'service-status',
    ]

    const view = getDebriefView(instance, state)

    expect(view.evidenceChain.map(({ id }) => id)).toEqual([
      'role-audit-history',
      'service-status',
    ])
    expect(view.redHerrings.map(({ id }) => id)).toEqual([
      'later-herring',
      'browser-update',
    ])
    expect(view.redHerrings.map(({ id }) => id)).not.toContain(
      'unselected-herring',
    )
  })

  it('fails clearly for unknown authored references', () => {
    const { instance, state } = completedFullScoreDebrief()
    const cases = [
      [
        'hypothesis',
        (target: typeof state, targetInstance: typeof instance) => {
          void targetInstance
          target.submission = {
            ...target.submission!,
            selectedHypothesisId: 'missing-hypothesis',
          }
        },
      ],
      [
        'evidence chain',
        (_target: typeof state, targetInstance: typeof instance) => {
          targetInstance.scenario.debrief.evidence_chain = ['missing-evidence']
        },
      ],
      [
        'red herring',
        (_target: typeof state, targetInstance: typeof instance) => {
          targetInstance.composition.selectedRedHerringIds = ['missing-herring']
        },
      ],
      [
        'efficient path',
        (_target: typeof state, targetInstance: typeof instance) => {
          targetInstance.scenario.debrief.efficient_path = [
            { kind: 'evidence', ref: 'missing-path-evidence' },
          ]
        },
      ],
      [
        'framework step',
        (_target: typeof state, targetInstance: typeof instance) => {
          targetInstance.scenario.debrief.efficient_path = [
            { kind: 'framework_step', ref: 'missing-framework-step' as never },
          ]
        },
      ],
    ] as const

    for (const [name, corrupt] of cases) {
      const corruptInstance = structuredClone(instance)
      const corruptState = structuredClone(state)
      corrupt(corruptState, corruptInstance)
      try {
        getDebriefView(corruptInstance, corruptState)
        throw new Error('Expected corrupted reference to throw')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error).not.toBeInstanceOf(InvestigationTransitionError)
        expect(error).not.toHaveProperty('code')
        expect((error as Error).message).toMatch(
          /missing-|Submitted hypothesis/,
        )
      }
      expect(name).toBeTruthy()
    }
  })

  it('returns deep-fresh safe data without leaking scenario internals', () => {
    const { instance, state } = completedFullScoreDebrief()
    const beforeInstance = structuredClone(instance)
    const beforeState = structuredClone(state)
    const view = getDebriefView(instance, state)
    view.score.total = 0
    view.evidenceChain[0].label = 'Changed'
    view.redHerrings.pop()
    view.efficientPath.pop()

    expect(instance).toEqual(beforeInstance)
    expect(state).toEqual(beforeState)

    const serialized = JSON.stringify(getDebriefView(instance, state))
    for (const forbidden of [
      'root_cause',
      'relevance',
      'actions',
      'bookmarked',
      'remediation',
      'communication',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
    expect(serialized).toContain('rootCauseExplanation')
    expect(serialized).toContain('evidenceChain')
  })

  it('returns independent nested containers on every call', () => {
    const { instance, state } = completedFullScoreDebrief()
    const first = getDebriefView(instance, state)
    const second = getDebriefView(instance, state)

    first.score.total = 0
    first.evidenceChain[0].label = 'Changed'
    first.redHerrings[0].label = 'Changed red herring'
    first.efficientPath[0].label = 'Changed step'
    first.evidenceChain.pop()
    first.redHerrings.pop()
    first.efficientPath.pop()

    expect(second.score.total).toBe(100)
    expect(second.evidenceChain[0].label).toBe('Service status')
    expect(second.redHerrings[0].label).toBe(
      "A browser update was installed on one affected user's laptop.",
    )
    expect(second.efficientPath[0].label).toBe('Establish impact')
    expect(second.evidenceChain).toHaveLength(5)
    expect(second.redHerrings).toHaveLength(1)
    expect(second.efficientPath).toHaveLength(9)
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
