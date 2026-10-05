import {
  assertInvestigationIdentity,
  isEvidenceUnlocked,
  InvestigationTransitionError,
} from './investigation-engine'
import type { InvestigationState } from './investigation-state'
import type {
  ScenarioInstance,
  ScenarioInstanceEvidence,
} from './scenario-instance'

export type InvestigationEvidenceState = 'locked' | 'available' | 'opened'

export interface InvestigationEvidenceView {
  id: string
  tool: ScenarioInstanceEvidence['tool']
  cost: number
  state: InvestigationEvidenceState
  content?: ScenarioInstanceEvidence['content']
}

export type DiagnosisOutcome = 'strong' | 'partial' | 'needs_revision'

export interface DiagnosisResultView {
  selectedHypothesisId: string
  selectedHypothesisLabel: string
  total: number
  outcome: DiagnosisOutcome
}

function diagnosisOutcome(total: number): DiagnosisOutcome {
  if (total >= 70) return 'strong'
  if (total >= 30) return 'partial'
  return 'needs_revision'
}

export function getDiagnosisResultView(
  instance: ScenarioInstance,
  state: InvestigationState,
): DiagnosisResultView {
  assertInvestigationIdentity(instance, state)

  if (state.status !== 'completed' || !state.submission) {
    throw new InvestigationTransitionError(
      'INVALID_STATUS',
      'Diagnosis results require a completed investigation with a submission.',
    )
  }

  const { selectedHypothesisId, score } = state.submission
  const hypothesis = instance.scenario.hypotheses.find(
    ({ id }) => id === selectedHypothesisId,
  )
  if (!hypothesis) {
    throw new Error(
      `Submitted hypothesis "${selectedHypothesisId}" is not authored by the scenario.`,
    )
  }

  return {
    selectedHypothesisId,
    selectedHypothesisLabel: hypothesis.label,
    total: score.total,
    outcome: diagnosisOutcome(score.total),
  }
}

export function getAvailableEvidenceIds(
  instance: ScenarioInstance,
  state: InvestigationState,
): string[] {
  assertInvestigationIdentity(instance, state)
  const opened = new Set(state.openedEvidenceIds)

  return instance.scenario.evidence
    .filter(
      (evidence) =>
        !opened.has(evidence.id) && isEvidenceUnlocked(evidence, state),
    )
    .map(({ id }) => id)
}

export function getInvestigationEvidenceViews(
  instance: ScenarioInstance,
  state: InvestigationState,
): InvestigationEvidenceView[] {
  assertInvestigationIdentity(instance, state)
  const opened = new Set(state.openedEvidenceIds)

  return instance.scenario.evidence.map((evidence) => {
    if (opened.has(evidence.id)) {
      return {
        id: evidence.id,
        tool: evidence.tool,
        cost: evidence.cost,
        state: 'opened',
        content: structuredClone(evidence.content),
      }
    }

    return {
      id: evidence.id,
      tool: evidence.tool,
      cost: evidence.cost,
      state: isEvidenceUnlocked(evidence, state) ? 'available' : 'locked',
    }
  })
}
