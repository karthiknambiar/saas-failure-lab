export type InvestigationStatus = 'intro' | 'investigating'

export type InvestigationErrorCode =
  | 'INVALID_STARTED_AT'
  | 'SCENARIO_STATE_MISMATCH'
  | 'INVALID_STATUS'
  | 'UNKNOWN_EVIDENCE'
  | 'EVIDENCE_LOCKED'
  | 'INSUFFICIENT_BUDGET'
  | 'EVIDENCE_NOT_OPENED'
  | 'UNKNOWN_HYPOTHESIS'

export interface BeginInvestigationAction {
  sequence: number
  type: 'begin_investigation'
}

export type InvestigationAction = BeginInvestigationAction

export type InvestigationCommand = { type: 'begin_investigation' }

export interface InvestigationState {
  scenarioId: string
  scenarioVersion: number
  seed: string
  startedAt: number
  status: InvestigationStatus
  openedEvidenceIds: string[]
  bookmarkedEvidenceIds: string[]
  selectedHypothesisId?: string
  hypothesisHistory: Array<{
    hypothesisId: string
    atAction: number
  }>
  actions: InvestigationAction[]
  budgetRemaining?: number
}
