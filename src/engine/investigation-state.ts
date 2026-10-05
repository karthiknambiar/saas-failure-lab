import type { DiagnosisScore } from './diagnosis-scoring'

export type InvestigationStatus = 'intro' | 'investigating' | 'completed'

export type InvestigationErrorCode =
  | 'INVALID_STARTED_AT'
  | 'SCENARIO_STATE_MISMATCH'
  | 'INVALID_STATUS'
  | 'UNKNOWN_EVIDENCE'
  | 'EVIDENCE_LOCKED'
  | 'INSUFFICIENT_BUDGET'
  | 'EVIDENCE_NOT_OPENED'
  | 'UNKNOWN_HYPOTHESIS'
  | 'MISSING_HYPOTHESIS'

export interface BeginInvestigationAction {
  sequence: number
  type: 'begin_investigation'
}

export interface OpenEvidenceAction {
  sequence: number
  type: 'open_evidence'
  evidenceId: string
  cost: number
}

export interface BookmarkEvidenceAction {
  sequence: number
  type: 'bookmark_evidence' | 'unbookmark_evidence'
  evidenceId: string
}

export interface SelectHypothesisAction {
  sequence: number
  type: 'select_hypothesis'
  hypothesisId: string
}

export interface SubmitDiagnosisAction {
  sequence: number
  type: 'submit_diagnosis'
}

export interface DiagnosisSubmission {
  selectedHypothesisId: string
  score: DiagnosisScore
}

export type InvestigationAction =
  | BeginInvestigationAction
  | OpenEvidenceAction
  | BookmarkEvidenceAction
  | SelectHypothesisAction
  | SubmitDiagnosisAction

export type InvestigationCommand =
  | { type: 'begin_investigation' }
  | { type: 'open_evidence'; evidenceId: string }
  | { type: 'bookmark_evidence'; evidenceId: string }
  | { type: 'unbookmark_evidence'; evidenceId: string }
  | { type: 'select_hypothesis'; hypothesisId: string }
  | { type: 'submit_diagnosis' }

export interface InvestigationState {
  scenarioId: string
  scenarioVersion: number
  seed: string
  startedAt: number
  status: InvestigationStatus
  openedEvidenceIds: string[]
  bookmarkedEvidenceIds: string[]
  selectedHypothesisId?: string
  submission?: DiagnosisSubmission
  hypothesisHistory: Array<{
    hypothesisId: string
    atAction: number
  }>
  actions: InvestigationAction[]
  budgetRemaining?: number
}
