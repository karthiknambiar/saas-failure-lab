import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from '../content/scenario-schema'
import { createScenarioFixture } from '../content/test-fixtures'
import { composeScenario } from './compose-scenario'
import {
  applyInvestigationCommand,
  createInvestigation,
} from './investigation-engine'

function sourceFixture(): ScenarioSource {
  return createScenarioFixture() as ScenarioSource
}

function instanceFixture(source = sourceFixture()) {
  return composeScenario(source, 'investigation-seed')
}

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
