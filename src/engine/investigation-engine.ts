import type {
  ScenarioInstance,
  ScenarioInstanceEvidence,
} from './scenario-instance'
import type {
  InvestigationCommand,
  InvestigationErrorCode,
  InvestigationState,
} from './investigation-state'
import { scoreDiagnosis } from './diagnosis-scoring'

export class InvestigationTransitionError extends Error {
  constructor(
    readonly code: InvestigationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'InvestigationTransitionError'
  }
}

function fail(code: InvestigationErrorCode, message: string): never {
  throw new InvestigationTransitionError(code, message)
}

export function assertInvestigationIdentity(
  instance: ScenarioInstance,
  state: InvestigationState,
): void {
  if (
    state.scenarioId !== instance.scenario.id ||
    state.scenarioVersion !== instance.scenario.version ||
    state.seed !== instance.composition.seed
  ) {
    fail(
      'SCENARIO_STATE_MISMATCH',
      `Investigation state does not belong to scenario "${instance.scenario.id}" version ${instance.scenario.version} and seed "${instance.composition.seed}".`,
    )
  }
}

export function createInvestigation(
  instance: ScenarioInstance,
  startedAt: number,
): InvestigationState {
  if (!Number.isInteger(startedAt) || startedAt < 0) {
    fail(
      'INVALID_STARTED_AT',
      'Investigation start time must be a finite, non-negative integer.',
    )
  }

  return {
    scenarioId: instance.scenario.id,
    scenarioVersion: instance.scenario.version,
    seed: instance.composition.seed,
    startedAt,
    status: 'intro',
    openedEvidenceIds: [],
    bookmarkedEvidenceIds: [],
    selectedHypothesisId: undefined,
    hypothesisHistory: [],
    actions: [],
    budgetRemaining: instance.scenario.investigation_budget,
  }
}

function requireInvestigating(state: InvestigationState): void {
  if (state.status !== 'investigating') {
    fail(
      'INVALID_STATUS',
      `Investigation command requires "investigating" status, received "${state.status}".`,
    )
  }
}

function findEvidence(
  instance: ScenarioInstance,
  evidenceId: string,
): ScenarioInstanceEvidence {
  const evidence = instance.scenario.evidence.find(
    ({ id }) => id === evidenceId,
  )
  if (!evidence) {
    fail(
      'UNKNOWN_EVIDENCE',
      `Scenario "${instance.scenario.id}" has no evidence "${evidenceId}".`,
    )
  }
  return evidence
}

export function isEvidenceUnlocked(
  evidence: ScenarioInstanceEvidence,
  state: InvestigationState,
): boolean {
  const opened = new Set(state.openedEvidenceIds)
  return evidence.unlock_after.every((id) => opened.has(id))
}

function openEvidence(
  instance: ScenarioInstance,
  state: InvestigationState,
  evidenceId: string,
): InvestigationState {
  requireInvestigating(state)
  const evidence = findEvidence(instance, evidenceId)
  if (state.openedEvidenceIds.includes(evidenceId)) return state
  if (!isEvidenceUnlocked(evidence, state)) {
    fail('EVIDENCE_LOCKED', `Evidence "${evidenceId}" is still locked.`)
  }
  if (
    state.budgetRemaining !== undefined &&
    state.budgetRemaining < evidence.cost
  ) {
    fail(
      'INSUFFICIENT_BUDGET',
      `Evidence "${evidenceId}" costs ${evidence.cost}, but only ${state.budgetRemaining} remains.`,
    )
  }

  const sequence = state.actions.length + 1
  return {
    ...state,
    openedEvidenceIds: [...state.openedEvidenceIds, evidenceId],
    actions: [
      ...state.actions,
      {
        sequence,
        type: 'open_evidence',
        evidenceId,
        cost: evidence.cost,
      },
    ],
    budgetRemaining:
      state.budgetRemaining === undefined
        ? undefined
        : state.budgetRemaining - evidence.cost,
  }
}

function updateBookmark(
  instance: ScenarioInstance,
  state: InvestigationState,
  evidenceId: string,
  bookmark: boolean,
): InvestigationState {
  requireInvestigating(state)
  findEvidence(instance, evidenceId)
  const isBookmarked = state.bookmarkedEvidenceIds.includes(evidenceId)
  if (bookmark === isBookmarked) return state
  if (bookmark && !state.openedEvidenceIds.includes(evidenceId)) {
    fail(
      'EVIDENCE_NOT_OPENED',
      `Evidence "${evidenceId}" must be opened before bookmarking.`,
    )
  }

  const type = bookmark ? 'bookmark_evidence' : 'unbookmark_evidence'
  return {
    ...state,
    bookmarkedEvidenceIds: bookmark
      ? [...state.bookmarkedEvidenceIds, evidenceId]
      : state.bookmarkedEvidenceIds.filter((id) => id !== evidenceId),
    actions: [
      ...state.actions,
      {
        sequence: state.actions.length + 1,
        type,
        evidenceId,
      },
    ],
  }
}

function selectHypothesis(
  instance: ScenarioInstance,
  state: InvestigationState,
  hypothesisId: string,
): InvestigationState {
  requireInvestigating(state)
  if (!instance.scenario.hypotheses.some(({ id }) => id === hypothesisId)) {
    fail(
      'UNKNOWN_HYPOTHESIS',
      `Scenario "${instance.scenario.id}" has no hypothesis "${hypothesisId}".`,
    )
  }
  if (state.selectedHypothesisId === hypothesisId) return state

  const sequence = state.actions.length + 1
  return {
    ...state,
    selectedHypothesisId: hypothesisId,
    hypothesisHistory: [
      ...state.hypothesisHistory,
      { hypothesisId, atAction: sequence },
    ],
    actions: [
      ...state.actions,
      { sequence, type: 'select_hypothesis', hypothesisId },
    ],
  }
}

function submitDiagnosis(
  instance: ScenarioInstance,
  state: InvestigationState,
): InvestigationState {
  requireInvestigating(state)
  if (!state.selectedHypothesisId) {
    fail(
      'MISSING_HYPOTHESIS',
      'A hypothesis must be selected before submitting a diagnosis.',
    )
  }

  const score = scoreDiagnosis({
    canonicalHypothesisId: instance.scenario.root_cause.id,
    selectedHypothesisId: state.selectedHypothesisId,
    criticalEvidenceIds: instance.scenario.evidence
      .filter(({ relevance }) => relevance === 'critical')
      .map(({ id }) => id),
    bookmarkedEvidenceIds: state.bookmarkedEvidenceIds,
  })

  return {
    ...state,
    status: 'completed',
    submission: {
      selectedHypothesisId: state.selectedHypothesisId,
      score,
    },
    actions: [
      ...state.actions,
      { sequence: state.actions.length + 1, type: 'submit_diagnosis' },
    ],
  }
}

export function applyInvestigationCommand(
  instance: ScenarioInstance,
  state: InvestigationState,
  command: InvestigationCommand,
): InvestigationState {
  assertInvestigationIdentity(instance, state)

  if (command.type === 'begin_investigation') {
    if (state.status !== 'intro') {
      fail(
        'INVALID_STATUS',
        `Cannot begin investigation while status is "${state.status}".`,
      )
    }

    return {
      ...state,
      status: 'investigating',
      actions: [
        ...state.actions,
        { sequence: state.actions.length + 1, type: command.type },
      ],
    }
  }

  if (command.type === 'open_evidence') {
    return openEvidence(instance, state, command.evidenceId)
  }

  if (command.type === 'bookmark_evidence') {
    return updateBookmark(instance, state, command.evidenceId, true)
  }

  if (command.type === 'unbookmark_evidence') {
    return updateBookmark(instance, state, command.evidenceId, false)
  }

  if (command.type === 'select_hypothesis') {
    return selectHypothesis(instance, state, command.hypothesisId)
  }

  if (command.type === 'submit_diagnosis') {
    return submitDiagnosis(instance, state)
  }

  const exhaustive: never = command
  return exhaustive
}
