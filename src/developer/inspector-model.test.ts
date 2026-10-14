import { describe, expect, it } from 'vitest'

import { scenarioCatalog } from '../generated/scenario-catalog'
import { composeScenario } from '../engine/compose-scenario'
import { inspectScenario } from './inspector-model'

describe('inspectScenario', () => {
  it('resolves an authored scenario with a supplied seed', () => {
    const result = inspectScenario('api-001', 'author-seed')

    expect(result.available).toBe(true)
    if (!result.available) throw new Error('Expected API-001 to be available')

    expect(result.instance.scenario.id).toBe('api-001')
    expect(result.instance.composition.seed).toBe('author-seed')
  })

  it('composes the same supplied seed deterministically', () => {
    expect(inspectScenario('api-001', 'author-seed')).toEqual(
      inspectScenario('api-001', 'author-seed'),
    )
  })

  it('projects dependencies in authored evidence order without sharing unlock arrays', () => {
    const result = inspectScenario('api-001', 'author-seed')
    if (!result.available) throw new Error('Expected API-001 to be available')

    expect(result.dependencies).toEqual([
      { evidenceId: 'http-response', unlockAfter: [] },
      { evidenceId: 'network-connectivity', unlockAfter: ['http-response'] },
      {
        evidenceId: 'credential-audit',
        unlockAfter: ['network-connectivity'],
      },
      { evidenceId: 'previous-success', unlockAfter: ['credential-audit'] },
    ])

    result.dependencies[1].unlockAfter.push('mutated')
    expect(
      scenarioCatalog.find(({ id }) => id === 'api-001')?.evidence[1]
        .unlock_after,
    ).toEqual(['http-response'])
  })

  it('reports an unknown scenario ID', () => {
    expect(inspectScenario('missing-001', 'author-seed')).toEqual({
      available: false,
      reason: 'unknown',
    })
  })

  it.each(['   ', 'x'.repeat(129)])('reports invalid seed %j', (seed) => {
    expect(inspectScenario('api-001', seed)).toEqual({
      available: false,
      reason: 'invalid_seed',
    })
  })

  it('uses the canonical composition seed when omitted', () => {
    const scenario = scenarioCatalog.find(({ id }) => id === 'api-001')
    if (!scenario) throw new Error('Expected API-001 fixture')

    expect(inspectScenario('api-001')).toEqual({
      available: true,
      instance: composeScenario(scenario, 'api-001:v1:canonical'),
      dependencies: scenario.evidence.map(({ id, unlock_after }) => ({
        evidenceId: id,
        unlockAfter: [...unlock_after],
      })),
    })
  })
})
