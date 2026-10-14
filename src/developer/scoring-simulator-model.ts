import {
  scoreDiagnosis,
  type DiagnosisScore,
} from '../engine/diagnosis-scoring'
import { scenarioCatalog } from '../generated/scenario-catalog'

export interface SimulateScoreInput {
  scenarioId: string
  selectedHypothesisId: string
  bookmarkedEvidenceIds: readonly string[]
}

export type ScoreSimulationResult =
  | { available: true; score: DiagnosisScore }
  | {
      available: false
      reason: 'unknown_scenario' | 'unknown_hypothesis' | 'unknown_evidence'
    }

export function simulateScore({
  scenarioId,
  selectedHypothesisId,
  bookmarkedEvidenceIds,
}: SimulateScoreInput): ScoreSimulationResult {
  const scenario = scenarioCatalog.find(
    (candidate) => candidate.id === scenarioId,
  )

  if (!scenario) {
    return { available: false, reason: 'unknown_scenario' }
  }

  if (
    !scenario.hypotheses.some(
      (hypothesis) => hypothesis.id === selectedHypothesisId,
    )
  ) {
    return { available: false, reason: 'unknown_hypothesis' }
  }

  const evidenceIds = new Set(scenario.evidence.map((evidence) => evidence.id))
  const uniqueBookmarkedEvidenceIds = [...new Set(bookmarkedEvidenceIds)]

  if (
    uniqueBookmarkedEvidenceIds.some(
      (evidenceId) => !evidenceIds.has(evidenceId),
    )
  ) {
    return { available: false, reason: 'unknown_evidence' }
  }

  return {
    available: true,
    score: scoreDiagnosis({
      canonicalHypothesisId: scenario.root_cause.id,
      selectedHypothesisId,
      criticalEvidenceIds: scenario.evidence
        .filter((evidence) => evidence.relevance === 'critical')
        .map((evidence) => evidence.id),
      bookmarkedEvidenceIds: uniqueBookmarkedEvidenceIds,
    }),
  }
}
