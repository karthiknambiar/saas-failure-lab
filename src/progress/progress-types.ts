export interface ProgressScore {
  total: number
  diagnosisPoints: number
  evidencePoints: number
}

export interface CompletedRun {
  scenarioId: string
  completedAt: number
  submittedHypothesisId: string
  score: ProgressScore
}

export interface ProgressV1 {
  version: 1
  completedRuns: CompletedRun[]
}

export type Progress = ProgressV1

export interface DecodeProgressResult {
  progress: Progress
  recovered: boolean
}
