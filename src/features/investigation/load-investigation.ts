import type { ScenarioSource } from '../../content/scenario-schema'
import { scenarioCatalog } from '../../generated/scenario-catalog'
import { composeScenario } from '../../engine/compose-scenario'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { parseChallengeSeed } from '../../sharing/share-link'
import type { DailyPlayableScenario } from '../../sharing/daily-incident'

const playableScenarioIds = new Set(scenarioCatalog.map(({ id }) => id))

export const dailyPlayableScenarios: readonly DailyPlayableScenario[] =
  scenarioCatalog
    .filter(({ id }) => playableScenarioIds.has(id))
    .map(({ id, version, title }) => ({ id, version, title }))

export type InvestigationRouteResult =
  | { available: true; instance: ScenarioInstance }
  | {
      available: false
      scenarioId: string
      reason: 'unknown' | 'unavailable' | 'invalid_seed'
    }

export function canonicalScenarioSeed(scenario: ScenarioSource): string {
  return `${scenario.id}:v${scenario.version}:canonical`
}

export function loadInvestigationScenario(
  scenarioId: string,
  catalog: readonly ScenarioSource[] = scenarioCatalog,
  suppliedSeed?: string,
): InvestigationRouteResult {
  const scenario = catalog.find(({ id }) => id === scenarioId)

  if (!scenario) {
    return { available: false, scenarioId, reason: 'unknown' }
  }

  if (!playableScenarioIds.has(scenario.id)) {
    return { available: false, scenarioId, reason: 'unavailable' }
  }

  const parsedSeed = parseChallengeSeed(suppliedSeed ?? null)
  if ('error' in parsedSeed) {
    return { available: false, scenarioId, reason: 'invalid_seed' }
  }

  return {
    available: true,
    instance: composeScenario(
      scenario,
      parsedSeed.seed ?? canonicalScenarioSeed(scenario),
    ),
  }
}
