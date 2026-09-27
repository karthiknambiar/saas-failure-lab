import {
  assertInvestigationIdentity,
  isEvidenceUnlocked,
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
