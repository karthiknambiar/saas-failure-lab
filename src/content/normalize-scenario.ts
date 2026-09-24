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
      concepts: [...scenario.learning.concepts].sort((left, right) =>
        left.localeCompare(right),
      ),
      symptomSummary: scenario.brief.symptom_variants[0],
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function serializeScenarioIndex(
  entries: readonly ScenarioIndexEntry[],
): string {
  return `${JSON.stringify(entries, null, 2)}\n`
}
