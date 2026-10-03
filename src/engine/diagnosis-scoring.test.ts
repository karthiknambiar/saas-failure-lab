import { describe, expect, it } from 'vitest'

import { scoreDiagnosis } from './diagnosis-scoring'

describe('scoreDiagnosis', () => {
  it('awards diagnosis and proportional evidence points for a correct partial submission', () => {
    expect(
      scoreDiagnosis({
        canonicalHypothesisId: 'cause-a',
        selectedHypothesisId: 'cause-a',
        criticalEvidenceIds: ['one', 'two', 'three'],
        bookmarkedEvidenceIds: ['one', 'two'],
      }),
    ).toEqual({ total: 90, diagnosisPoints: 70, evidencePoints: 20 })
  })

  it('awards evidence points even when the selected hypothesis is incorrect', () => {
    expect(
      scoreDiagnosis({
        canonicalHypothesisId: 'cause-a',
        selectedHypothesisId: 'cause-b',
        criticalEvidenceIds: ['one', 'two'],
        bookmarkedEvidenceIds: ['one', 'two'],
      }),
    ).toEqual({ total: 30, diagnosisPoints: 0, evidencePoints: 30 })
  })

  it('counts unique bookmarked critical evidence only', () => {
    expect(
      scoreDiagnosis({
        canonicalHypothesisId: 'cause-a',
        selectedHypothesisId: 'cause-a',
        criticalEvidenceIds: ['one', 'one', 'two'],
        bookmarkedEvidenceIds: ['one', 'one', 'unrelated'],
      }),
    ).toEqual({ total: 85, diagnosisPoints: 70, evidencePoints: 15 })
  })

  it('awards no evidence points when there is no critical evidence', () => {
    expect(
      scoreDiagnosis({
        canonicalHypothesisId: 'cause-a',
        selectedHypothesisId: 'cause-a',
        criticalEvidenceIds: [],
        bookmarkedEvidenceIds: ['unrelated'],
      }),
    ).toEqual({ total: 70, diagnosisPoints: 70, evidencePoints: 0 })
  })

  it('rounds proportional evidence points to the nearest integer', () => {
    expect(
      scoreDiagnosis({
        canonicalHypothesisId: 'cause-a',
        selectedHypothesisId: 'cause-b',
        criticalEvidenceIds: ['one', 'two', 'three', 'four'],
        bookmarkedEvidenceIds: ['one'],
      }),
    ).toEqual({ total: 8, diagnosisPoints: 0, evidencePoints: 8 })
  })

  it('does not mutate the input arrays', () => {
    const criticalEvidenceIds = ['one', 'two', 'one']
    const bookmarkedEvidenceIds = ['two', 'unrelated', 'two']
    const before = {
      criticalEvidenceIds: [...criticalEvidenceIds],
      bookmarkedEvidenceIds: [...bookmarkedEvidenceIds],
    }

    scoreDiagnosis({
      canonicalHypothesisId: 'cause-a',
      selectedHypothesisId: 'cause-a',
      criticalEvidenceIds,
      bookmarkedEvidenceIds,
    })

    expect({ criticalEvidenceIds, bookmarkedEvidenceIds }).toEqual(before)
  })

  it('always makes the total equal its components', () => {
    const score = scoreDiagnosis({
      canonicalHypothesisId: 'cause-a',
      selectedHypothesisId: 'cause-b',
      criticalEvidenceIds: ['one', 'two', 'three'],
      bookmarkedEvidenceIds: ['one'],
    })

    expect(score.total).toBe(score.diagnosisPoints + score.evidencePoints)
  })
})
