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
  if (entries.length === 0) return '[]\n'

  return `[\n${entries.map(serializeScenarioIndexEntry).join(',\n')}\n]\n`
}

function serializeScenarioIndexEntry(entry: ScenarioIndexEntry): string {
  const concepts = `[${entry.concepts.map((concept) => JSON.stringify(concept)).join(', ')}]`
  const conceptsLine = `    "concepts": ${concepts}`
  const serializedConcepts =
    conceptsLine.length <= 80
      ? [conceptsLine]
      : JSON.stringify(entry.concepts, null, 2)
          .split('\n')
          .map((line, index) =>
            index === 0 ? `    "concepts": ${line}` : `    ${line}`,
          )

  return [
    '  {',
    `    "id": ${JSON.stringify(entry.id)},`,
    `    "title": ${JSON.stringify(entry.title)},`,
    `    "domain": ${JSON.stringify(entry.domain)},`,
    `    "difficulty": ${JSON.stringify(entry.difficulty)},`,
    `    "estimatedMinutes": ${entry.estimatedMinutes},`,
    ...serializedConcepts.map((line, index) =>
      index === serializedConcepts.length - 1 ? `${line},` : line,
    ),
    `    "symptomSummary": ${JSON.stringify(entry.symptomSummary)}`,
    '  }',
  ].join('\n')
}
