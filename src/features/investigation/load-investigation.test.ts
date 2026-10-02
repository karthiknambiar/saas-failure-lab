import { describe, expect, it } from 'vitest'

import { scenarioCatalog } from '../../generated/scenario-catalog'
import {
  canonicalScenarioSeed,
  loadInvestigationScenario,
} from './load-investigation'

describe('loadInvestigationScenario', () => {
  it('loads IAM-001 with its deterministic canonical seed', () => {
    const first = loadInvestigationScenario('iam-001')
    const second = loadInvestigationScenario('iam-001')

    expect(first.available).toBe(true)
    if (!first.available) throw new Error('Expected IAM-001 to be available')

    expect(first.instance.scenario.id).toBe('iam-001')
    expect(first.instance.composition.seed).toBe('iam-001:v1:canonical')
    expect(second).toEqual(first)
  })

  it('reports catalogued but non-playable scenarios as unavailable', () => {
    expect(loadInvestigationScenario('fnd-001')).toEqual({
      available: false,
      scenarioId: 'fnd-001',
      reason: 'unavailable',
    })
  })

  it('reports missing scenarios as unknown', () => {
    expect(loadInvestigationScenario('missing-001')).toEqual({
      available: false,
      scenarioId: 'missing-001',
      reason: 'unknown',
    })
  })

  it('uses the catalogued version in the canonical seed without mutating input', () => {
    const catalog = structuredClone(scenarioCatalog)
    const scenario = catalog.find(({ id }) => id === 'iam-001')
    if (!scenario) throw new Error('Expected IAM-001 fixture')
    scenario.version = 3
    const before = structuredClone(catalog)

    const result = loadInvestigationScenario('iam-001', catalog)

    expect(canonicalScenarioSeed(scenario)).toBe('iam-001:v3:canonical')
    expect(result.available).toBe(true)
    if (!result.available) throw new Error('Expected IAM-001 to be available')
    expect(result.instance.composition.seed).toBe('iam-001:v3:canonical')
    expect(catalog).toEqual(before)
  })
})
