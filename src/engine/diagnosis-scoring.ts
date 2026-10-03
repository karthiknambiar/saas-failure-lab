export interface DiagnosisScoreInput {
  canonicalHypothesisId: string
  selectedHypothesisId: string
  criticalEvidenceIds: readonly string[]
  bookmarkedEvidenceIds: readonly string[]
}

export interface DiagnosisScore {
  total: number
  diagnosisPoints: number
  evidencePoints: number
}

/**
 * Scores a submitted diagnosis. Evidence points use Math.round, so a partial
 * score is the nearest whole number to (selected critical evidence * 30) /
 * unique critical evidence.
 */
export function scoreDiagnosis(input: DiagnosisScoreInput): DiagnosisScore {
  const criticalEvidence = new Set(input.criticalEvidenceIds)
  const bookmarkedEvidence = new Set(input.bookmarkedEvidenceIds)
  const diagnosisPoints =
    input.selectedHypothesisId === input.canonicalHypothesisId ? 70 : 0
  const selectedCriticalEvidence = [...criticalEvidence].filter((evidenceId) =>
    bookmarkedEvidence.has(evidenceId),
  ).length
  const evidencePoints =
    criticalEvidence.size === 0
      ? 0
      : Math.round((selectedCriticalEvidence * 30) / criticalEvidence.size)

  return {
    total: diagnosisPoints + evidencePoints,
    diagnosisPoints,
    evidencePoints,
  }
}
