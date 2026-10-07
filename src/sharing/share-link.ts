import type { ScenarioInstance } from '../engine/scenario-instance'
import { InvalidSeedError, normalizeSeed } from '../engine/seed'
import type {
  ChallengeLinkInput,
  CompletedShareSource,
  ShareChallengePayload,
} from './share-types'

export type ParsedChallengeSeed =
  { seed: string } | { seed: undefined } | { error: 'invalid_seed' }

export function buildChallengeLink({
  baseUrl,
  scenarioId,
  seed,
}: ChallengeLinkInput): string {
  const normalizedSeed = normalizeSeed(seed)
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const query = new URLSearchParams({ seed: normalizedSeed })

  return `${normalizedBase}scenarios/${encodeURIComponent(scenarioId)}?${query}`
}

export function parseChallengeSeed(raw: string | null): ParsedChallengeSeed {
  if (raw === null) {
    return { seed: undefined }
  }

  try {
    return { seed: normalizeSeed(raw) }
  } catch (error) {
    if (error instanceof InvalidSeedError) {
      return { error: 'invalid_seed' }
    }

    throw error
  }
}

export function createShareChallengePayload(
  instance: ScenarioInstance,
  completed: CompletedShareSource,
  baseUrl: string,
): ShareChallengePayload {
  const scenarioId = instance.scenario.id
  const seed = normalizeSeed(instance.composition.seed)

  return {
    scenarioId,
    scenarioVersion: instance.scenario.version,
    seed,
    title: instance.scenario.title,
    score: {
      total: completed.score.total,
      diagnosisPoints: completed.score.diagnosisPoints,
      evidencePoints: completed.score.evidencePoints,
    },
    challengeUrl: buildChallengeLink({ baseUrl, scenarioId, seed }),
  }
}
