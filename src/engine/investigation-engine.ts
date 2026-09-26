import type { ScenarioInstance } from './scenario-instance'
import type {
  InvestigationCommand,
  InvestigationErrorCode,
  InvestigationState,
} from './investigation-state'

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

export function applyInvestigationCommand(
  instance: ScenarioInstance,
  state: InvestigationState,
  command: InvestigationCommand,
): InvestigationState {
  assertInvestigationIdentity(instance, state)
  const commandType = command.type

  switch (commandType) {
    case 'begin_investigation': {
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
          { sequence: state.actions.length + 1, type: commandType },
        ],
      }
    }
    default: {
      const exhaustive: never = commandType
      return exhaustive
    }
  }
}
