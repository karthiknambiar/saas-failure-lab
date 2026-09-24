import type { ScenarioDocument } from './validate-scenarios'

export interface ScenarioIndexEntry {
  id: string
  title: string
  domain: ScenarioDocument['scenario']['domain']
  difficulty: ScenarioDocument['scenario']['difficulty']
  estimatedMinutes: number
  concepts: string[]
  symptomSummary: string
}

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function normalizeScenarioIndex(
  documents: readonly ScenarioDocument[],
): ScenarioIndexEntry[] {
  return documents
    .map(({ scenario }) => ({
      id: scenario.id,
      title: scenario.title,
      domain: scenario.domain,
      difficulty: scenario.difficulty,
      estimatedMinutes: scenario.estimated_minutes,
      concepts: [...scenario.learning.concepts].sort(compareText),
      symptomSummary: scenario.brief.symptom_variants[0],
    }))
    .sort((left, right) => compareText(left.id, right.id))
}

export function serializeScenarioIndex(
  entries: readonly ScenarioIndexEntry[],
): string {
  return `${JSON.stringify(entries, null, 2)}\n`
}
