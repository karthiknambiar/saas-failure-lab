import { describe, expect, it } from 'vitest'

import { decodeProgress, emptyProgress, encodeProgress } from './progress-codec'
import type { Progress } from './progress-types'

const validProgress: Progress = {
  version: 1,
  completedRuns: [
    {
      scenarioId: 'onboarding-dropoff',
      completedAt: 1_700_000_000_000,
      submittedHypothesisId: 'activation-gap',
      score: { total: 85, diagnosisPoints: 70, evidencePoints: 15 },
    },
  ],
}

describe('progress codec', () => {
  it('roundtrips an exact valid v1 progress document', () => {
    expect(decodeProgress(encodeProgress(validProgress))).toEqual({
      progress: validProgress,
      recovered: false,
    })
  })

  it.each([undefined, null])(
    'returns a fresh empty v1 document for absent storage',
    (raw) => {
      expect(decodeProgress(raw)).toEqual({
        progress: { version: 1, completedRuns: [] },
        recovered: false,
      })
    },
  )

  it.each(['', '{not json'])(
    'recovers from empty or malformed storage',
    (raw) => {
      expect(decodeProgress(raw)).toEqual({
        progress: { version: 1, completedRuns: [] },
        recovered: true,
      })
    },
  )

  it.each([
    { version: 0, completedRuns: [] },
    { version: 2, completedRuns: [] },
    { version: 99, completedRuns: [] },
  ])(
    'recovers through the version dispatcher for unsupported version %s',
    (value) => {
      expect(decodeProgress(JSON.stringify(value))).toEqual({
        progress: { version: 1, completedRuns: [] },
        recovered: true,
      })
    },
  )

  it.each([
    { version: 1 },
    { version: 1, completedRuns: {} },
    { version: 1, completedRuns: null },
  ])('recovers when v1 completedRuns is missing or not an array', (value) => {
    expect(decodeProgress(JSON.stringify(value))).toEqual({
      progress: { version: 1, completedRuns: [] },
      recovered: true,
    })
  })

  it.each([
    { ...validProgress.completedRuns[0], scenarioId: '' },
    { ...validProgress.completedRuns[0], submittedHypothesisId: '' },
    { ...validProgress.completedRuns[0], completedAt: -1 },
    { ...validProgress.completedRuns[0], completedAt: 'today' },
  ])('recovers when a run has invalid identifiers or timestamp', (run) => {
    expect(
      decodeProgress(JSON.stringify({ version: 1, completedRuns: [run] })),
    ).toEqual({
      progress: { version: 1, completedRuns: [] },
      recovered: true,
    })
  })

  it('recovers from a persisted non-finite timestamp', () => {
    const raw = `{"version":1,"completedRuns":[{"scenarioId":"onboarding-dropoff","completedAt":1e400,"submittedHypothesisId":"activation-gap","score":{"total":85,"diagnosisPoints":70,"evidencePoints":15}}]}`

    expect(decodeProgress(raw)).toEqual({
      progress: { version: 1, completedRuns: [] },
      recovered: true,
    })
  })

  it('atomically recovers when any completed run is invalid', () => {
    const invalidRun = { ...validProgress.completedRuns[0], scenarioId: '' }

    expect(
      decodeProgress(
        JSON.stringify({
          version: 1,
          completedRuns: [validProgress.completedRuns[0], invalidRun],
        }),
      ),
    ).toEqual({
      progress: { version: 1, completedRuns: [] },
      recovered: true,
    })
  })

  it.each([
    { total: 101, diagnosisPoints: 70, evidencePoints: 31 },
    { total: 70, diagnosisPoints: 71, evidencePoints: 0 },
    { total: 30, diagnosisPoints: 0, evidencePoints: -1 },
    { total: 99, diagnosisPoints: 70, evidencePoints: 30 },
  ])(
    'recovers when a run score is out of range or does not add up',
    (score) => {
      const run = { ...validProgress.completedRuns[0], score }

      expect(
        decodeProgress(JSON.stringify({ version: 1, completedRuns: [run] })),
      ).toEqual({
        progress: { version: 1, completedRuns: [] },
        recovered: true,
      })
    },
  )

  it('returns defensive fresh objects without mutating the supplied source', () => {
    const raw = encodeProgress(validProgress)
    const first = decodeProgress(raw)
    first.progress.completedRuns[0].score.total = 0
    first.progress.completedRuns.push({
      ...validProgress.completedRuns[0],
      scenarioId: 'later-run',
    })

    expect(decodeProgress(raw)).toEqual({
      progress: validProgress,
      recovered: false,
    })
    expect(validProgress).toEqual({
      version: 1,
      completedRuns: [
        {
          scenarioId: 'onboarding-dropoff',
          completedAt: 1_700_000_000_000,
          submittedHypothesisId: 'activation-gap',
          score: { total: 85, diagnosisPoints: 70, evidencePoints: 15 },
        },
      ],
    })

    const emptyFirst = emptyProgress()
    emptyFirst.completedRuns.push(validProgress.completedRuns[0])
    expect(emptyProgress()).toEqual({ version: 1, completedRuns: [] })
  })
})
