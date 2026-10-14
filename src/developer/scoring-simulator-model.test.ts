import { describe, expect, it } from 'vitest'

import { scenarioCatalog } from '../generated/scenario-catalog'
import { scoreDiagnosis } from '../engine/diagnosis-scoring'
import { simulateScore } from './scoring-simulator-model'

const iamScenario = scenarioCatalog.find(
  (scenario) => scenario.id === 'iam-001',
)

if (!iamScenario) {
  throw new Error('Expected iam-001 in the generated scenario catalog')
}

describe('simulateScore', () => {
  it('scores the iam canonical selection with its four critical evidence items', () => {
    expect(
      simulateScore({
        scenarioId: iamScenario.id,
        selectedHypothesisId: iamScenario.root_cause.id,
        bookmarkedEvidenceIds: [
          'affected-user-scope',
          'authentication-events',
          'role-configuration',
          'role-audit-history',
        ],
      }),
    ).toEqual({
      available: true,
      score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
    })
  })

  it('matches the diagnosis scorer for a partial wrong submission', () => {
    const bookmarkedEvidenceIds = ['affected-user-scope', 'role-configuration']
    const wrongHypothesisId = iamScenario.hypotheses.find(
      (hypothesis) => hypothesis.id !== iamScenario.root_cause.id,
    )?.id

    if (!wrongHypothesisId) {
      throw new Error('Expected an alternative hypothesis for iam-001')
    }

    expect(
      simulateScore({
        scenarioId: iamScenario.id,
        selectedHypothesisId: wrongHypothesisId,
        bookmarkedEvidenceIds,
      }),
    ).toEqual({
      available: true,
      score: scoreDiagnosis({
        canonicalHypothesisId: iamScenario.root_cause.id,
        selectedHypothesisId: wrongHypothesisId,
        criticalEvidenceIds: iamScenario.evidence
          .filter((evidence) => evidence.relevance === 'critical')
          .map((evidence) => evidence.id),
        bookmarkedEvidenceIds,
      }),
    })
  })

  it('reports an unknown scenario', () => {
    expect(
      simulateScore({
        scenarioId: 'missing-001',
        selectedHypothesisId: iamScenario.root_cause.id,
        bookmarkedEvidenceIds: [],
      }),
    ).toEqual({ available: false, reason: 'unknown_scenario' })
  })

  it('reports an unknown hypothesis for an authored scenario', () => {
    expect(
      simulateScore({
        scenarioId: iamScenario.id,
        selectedHypothesisId: 'missing-hypothesis',
        bookmarkedEvidenceIds: [],
      }),
    ).toEqual({ available: false, reason: 'unknown_hypothesis' })
  })

  it('reports unknown evidence for an authored scenario', () => {
    expect(
      simulateScore({
        scenarioId: iamScenario.id,
        selectedHypothesisId: iamScenario.root_cause.id,
        bookmarkedEvidenceIds: ['missing-evidence'],
      }),
    ).toEqual({ available: false, reason: 'unknown_evidence' })
  })

  it('does not inflate a score when bookmarked evidence is duplicated', () => {
    const input = {
      scenarioId: iamScenario.id,
      selectedHypothesisId: iamScenario.root_cause.id,
      bookmarkedEvidenceIds: [
        'affected-user-scope',
        'affected-user-scope',
        'authentication-events',
      ],
    }

    expect(simulateScore(input)).toEqual(
      simulateScore({
        ...input,
        bookmarkedEvidenceIds: [...new Set(input.bookmarkedEvidenceIds)],
      }),
    )
  })

  it('accepts a non-iam authored scenario', () => {
    const apiScenario = scenarioCatalog.find(
      (scenario) => scenario.id === 'api-001',
    )

    if (!apiScenario) {
      throw new Error('Expected api-001 in the generated scenario catalog')
    }

    expect(
      simulateScore({
        scenarioId: apiScenario.id,
        selectedHypothesisId: apiScenario.root_cause.id,
        bookmarkedEvidenceIds: apiScenario.evidence
          .filter((evidence) => evidence.relevance === 'critical')
          .map((evidence) => evidence.id),
      }),
    ).toMatchObject({ available: true, score: { total: 100 } })
  })
})
