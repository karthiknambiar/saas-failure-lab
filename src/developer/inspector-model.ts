import { canonicalScenarioSeed } from '../features/investigation/load-investigation'
import { scenarioCatalog } from '../generated/scenario-catalog'
import { composeScenario } from '../engine/compose-scenario'
import type { ScenarioInstance } from '../engine/scenario-instance'
import { parseChallengeSeed } from '../sharing/share-link'

export interface InspectorDependency {
  evidenceId: string
  unlockAfter: string[]
}

export type InspectorResult =
  | {
      available: true
      instance: ScenarioInstance
      dependencies: InspectorDependency[]
    }
  | { available: false; reason: 'unknown' | 'invalid_seed' }

export function inspectScenario(
  scenarioId: string,
  suppliedSeed?: string,
): InspectorResult {
  const scenario = scenarioCatalog.find(({ id }) => id === scenarioId)

  if (!scenario) {
    return { available: false, reason: 'unknown' }
  }

  const parsedSeed = parseChallengeSeed(suppliedSeed ?? null)
  if ('error' in parsedSeed) {
    return { available: false, reason: 'invalid_seed' }
  }

  return {
    available: true,
    instance: composeScenario(
      scenario,
      parsedSeed.seed ?? canonicalScenarioSeed(scenario),
    ),
    dependencies: scenario.evidence.map(({ id, unlock_after }) => ({
      evidenceId: id,
      unlockAfter: [...unlock_after],
    })),
  }
}
