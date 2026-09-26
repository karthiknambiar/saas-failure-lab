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
