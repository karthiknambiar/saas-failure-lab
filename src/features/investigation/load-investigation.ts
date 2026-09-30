import type { ScenarioSource } from '../../content/scenario-schema'
import { scenarioCatalog } from '../../generated/scenario-catalog'
import { composeScenario } from '../../engine/compose-scenario'
import type { ScenarioInstance } from '../../engine/scenario-instance'

const playableScenarioIds = new Set(['iam-001'])

export type InvestigationRouteResult =
  | { available: true; instance: ScenarioInstance }
  | { available: false; scenarioId: string; reason: 'unknown' | 'unavailable' }

export function canonicalScenarioSeed(scenario: ScenarioSource): string {
  return `${scenario.id}:v${scenario.version}:canonical`
}

export function loadInvestigationScenario(
  scenarioId: string,
  catalog: readonly ScenarioSource[] = scenarioCatalog,
): InvestigationRouteResult {
  const scenario = catalog.find(({ id }) => id === scenarioId)

  if (!scenario) {
    return { available: false, scenarioId, reason: 'unknown' }
  }

  if (!playableScenarioIds.has(scenario.id)) {
    return { available: false, scenarioId, reason: 'unavailable' }
  }

  return {
    available: true,
    instance: composeScenario(scenario, canonicalScenarioSeed(scenario)),
  }
}
