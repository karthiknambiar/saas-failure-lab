import { describe, expect, it } from 'vitest'

import type { ScenarioInstance } from '../engine/scenario-instance'
import {
  buildChallengeLink,
  createShareChallengePayload,
  parseChallengeSeed,
} from './share-link'

const instance = {
  composition: { seed: '  café 😀  ' },
  scenario: {
    id: 'incident / one',
    version: 7,
    title: 'A public incident',
    root_cause: 'secret',
    evidence: [{ id: 'private-evidence' }],
    debrief: { answer: 'secret' },
  },
} as unknown as ScenarioInstance

describe('buildChallengeLink', () => {
  it('builds a root-relative seeded challenge link at the site root', () => {
    expect(
      buildChallengeLink({
        baseUrl: '/',
        scenarioId: 'incident / one',
        seed: ' café 😀 ',
      }),
    ).toBe('/scenarios/incident%20%2F%20one?seed=caf%C3%A9+%F0%9F%98%80')
  })

  it('preserves a deployment subpath', () => {
    expect(
      buildChallengeLink({
        baseUrl: '/failure-lab/',
        scenarioId: 'iam-001',
        seed: 'demo seed',
      }),
    ).toBe('/failure-lab/scenarios/iam-001?seed=demo+seed')
  })
})

describe('parseChallengeSeed', () => {
  it('keeps a missing seed distinct from invalid', () => {
    expect(parseChallengeSeed(null)).toEqual({ seed: undefined })
  })

  it('normalizes a valid seed', () => {
    expect(parseChallengeSeed('  demo seed  ')).toEqual({ seed: 'demo seed' })
  })

  it('accepts a seed at the 128-character boundary', () => {
    const seed = 'x'.repeat(128)

    expect(parseChallengeSeed(seed)).toEqual({ seed })
  })

  it.each(['', '  ', 'x'.repeat(129)])('returns invalid_seed for %j', (raw) => {
    expect(parseChallengeSeed(raw)).toEqual({ error: 'invalid_seed' })
  })
})

describe('createShareChallengePayload', () => {
  it('copies only the public challenge fields and score components', () => {
    expect(
      createShareChallengePayload(
        instance,
        {
          score: { total: 9, diagnosisPoints: 4, evidencePoints: 5 },
        },
        '/failure-lab/',
      ),
    ).toEqual({
      scenarioId: 'incident / one',
      scenarioVersion: 7,
      seed: 'café 😀',
      title: 'A public incident',
      score: { total: 9, diagnosisPoints: 4, evidencePoints: 5 },
      challengeUrl:
        '/failure-lab/scenarios/incident%20%2F%20one?seed=caf%C3%A9+%F0%9F%98%80',
    })
  })

  it('isolates nested data and never serializes private scenario fields', () => {
    const completed = {
      score: { total: 9, diagnosisPoints: 4, evidencePoints: 5 },
    }
    const payload = createShareChallengePayload(instance, completed, '/')
    payload.score.total = 0

    expect(completed.score.total).toBe(9)
    completed.score.evidencePoints = 0
    expect(payload.score.evidencePoints).toBe(5)

    const serializedKeys = Object.keys(JSON.parse(JSON.stringify(payload))).map(
      (key) => key.toLowerCase(),
    )
    for (const prohibited of [
      'root',
      'evidence',
      'debrief',
      'relevance',
      'actions',
      'bookmark',
      'remediation',
      'communication',
    ]) {
      expect(serializedKeys).not.toContain(prohibited)
    }
  })
})
