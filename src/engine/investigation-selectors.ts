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

export interface DebriefEvidenceView {
  id: string
  label: string
  explanation: string
}

export interface DebriefRedHerringView {
  id: string
  label: string
  explanation: string
}

export interface DebriefPathEntryView {
  kind: 'framework_step' | 'evidence'
  label: string
}

export interface DebriefView {
  submittedDiagnosis: string
  score: {
    total: number
    diagnosisPoints: number
    evidencePoints: number
  }
  rootCauseExplanation: string
  evidenceChain: DebriefEvidenceView[]
  redHerrings: DebriefRedHerringView[]
  efficientPath: DebriefPathEntryView[]
  transferableLesson: string
}

const frameworkStepLabels: Record<string, string> = {
  'establish-impact': 'Establish impact',
  'determine-scope': 'Determine scope',
  'check-recent-changes': 'Check recent changes',
  'collect-evidence': 'Collect evidence',
  'test-hypothesis': 'Test hypothesis',
}

function formatEvidenceLabel(id: string): string {
  const label = id.replaceAll('-', ' ')
  return `${label[0].toUpperCase()}${label.slice(1)}`
}

function resolveDebriefEvidence(
  instance: ScenarioInstance,
  id: string,
): ScenarioInstanceEvidence {
  const evidence = instance.scenario.evidence.find((entry) => entry.id === id)
  if (!evidence) {
    throw new Error(`Unknown debrief evidence reference "${id}".`)
  }
  return evidence
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

export function getDebriefView(
  instance: ScenarioInstance,
  state: InvestigationState,
): DebriefView {
  assertInvestigationIdentity(instance, state)

  if (state.status !== 'completed' || !state.submission) {
    throw new InvestigationTransitionError(
      'INVALID_STATUS',
      'Debrief requires a completed investigation with a submission.',
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

  const evidenceChain = instance.scenario.debrief.evidence_chain.map((id) => {
    const evidence = resolveDebriefEvidence(instance, id)
    return {
      id: evidence.id,
      label: formatEvidenceLabel(evidence.id),
      explanation: evidence.explanation,
    }
  })

  const selectedRedHerringIds = new Set(
    instance.composition.selectedRedHerringIds,
  )
  for (const id of selectedRedHerringIds) {
    if (!instance.scenario.red_herrings.some((entry) => entry.id === id)) {
      throw new Error(`Unknown selected red herring reference "${id}".`)
    }
  }
  const redHerrings = instance.scenario.red_herrings
    .filter(({ id }) => selectedRedHerringIds.has(id))
    .map(({ id, label, explanation }) => ({ id, label, explanation }))

  const efficientPath = instance.scenario.debrief.efficient_path.map(
    (entry): DebriefPathEntryView => {
      if (entry.kind === 'evidence') {
        const evidence = resolveDebriefEvidence(instance, entry.ref)
        return { kind: 'evidence', label: formatEvidenceLabel(evidence.id) }
      }

      const label = frameworkStepLabels[entry.ref]
      if (!label) {
        throw new Error(
          `Unknown debrief framework-step reference "${entry.ref}".`,
        )
      }
      return { kind: 'framework_step', label }
    },
  )

  return {
    submittedDiagnosis: hypothesis.label,
    score: {
      total: score.total,
      diagnosisPoints: score.diagnosisPoints,
      evidencePoints: score.evidencePoints,
    },
    rootCauseExplanation: instance.scenario.debrief.root_cause_explanation,
    evidenceChain,
    redHerrings,
    efficientPath,
    transferableLesson: instance.scenario.debrief.transferable_lesson,
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
