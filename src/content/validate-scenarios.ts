import type { ScenarioIssue } from './scenario-errors'
import type { ScenarioSource } from './scenario-schema'

export interface ScenarioDocument {
  filePath: string
  sourceName: string
  scenario: ScenarioSource
}

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function canonicalizeDirectText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\p{P}+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function addIssue(
  issues: ScenarioIssue[],
  filePath: string,
  path: string,
  message: string,
): void {
  issues.push({ filePath, path, message })
}

function reportDuplicateIds(
  issues: ScenarioIssue[],
  filePath: string,
  entries: readonly { id: string }[],
  path: string,
  description: string,
): void {
  const seen = new Set<string>()

  entries.forEach((entry, index) => {
    if (seen.has(entry.id)) {
      addIssue(
        issues,
        filePath,
        `${path}[${index}].id`,
        `Duplicate ${description} ID "${entry.id}".`,
      )
    }
    seen.add(entry.id)
  })
}

function canonicalCycle(cycle: readonly string[]): string {
  const nodes = cycle.slice(0, -1)
  const rotations = nodes.map((_, index) => [
    ...nodes.slice(index),
    ...nodes.slice(0, index),
  ])
  rotations.sort((left, right) =>
    compareText(left.join('\u0000'), right.join('\u0000')),
  )
  return rotations[0].join(' -> ')
}

function reportDependencyCycles(
  issues: ScenarioIssue[],
  document: ScenarioDocument,
): void {
  const evidenceIds = new Set(document.scenario.evidence.map(({ id }) => id))
  const graph = new Map(
    document.scenario.evidence.map((item) => [
      item.id,
      item.unlock_after
        .filter(
          (dependency) => dependency !== item.id && evidenceIds.has(dependency),
        )
        .sort(compareText),
    ]),
  )
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const currentPath: string[] = []
  const reportedCycles = new Set<string>()

  function visit(id: string): void {
    if (visited.has(id)) return

    visiting.add(id)
    currentPath.push(id)

    for (const dependency of graph.get(id) ?? []) {
      if (visiting.has(dependency)) {
        const cycleStart = currentPath.indexOf(dependency)
        const cycle = [...currentPath.slice(cycleStart), dependency]
        const canonical = canonicalCycle(cycle)
        if (!reportedCycles.has(canonical)) {
          reportedCycles.add(canonical)
          addIssue(
            issues,
            document.filePath,
            'evidence',
            `Evidence dependency cycle: ${canonical} -> ${canonical.split(' -> ')[0]}.`,
          )
        }
      } else {
        visit(dependency)
      }
    }

    currentPath.pop()
    visiting.delete(id)
    visited.add(id)
  }

  for (const id of [...graph.keys()].sort(compareText)) visit(id)
}

function validateDocument(
  document: ScenarioDocument,
  issues: ScenarioIssue[],
): void {
  const { filePath, scenario, sourceName } = document

  if (sourceName !== scenario.id) {
    addIssue(
      issues,
      filePath,
      'id',
      `Scenario ID "${scenario.id}" must match source name "${sourceName}".`,
    )
  }

  reportDuplicateIds(
    issues,
    filePath,
    scenario.hypotheses,
    'hypotheses',
    'hypothesis',
  )
  reportDuplicateIds(
    issues,
    filePath,
    scenario.evidence,
    'evidence',
    'evidence',
  )
  reportDuplicateIds(
    issues,
    filePath,
    scenario.remediation.choices,
    'remediation.choices',
    'remediation choice',
  )
  reportDuplicateIds(
    issues,
    filePath,
    scenario.communication.choices,
    'communication.choices',
    'communication choice',
  )
  reportDuplicateIds(
    issues,
    filePath,
    scenario.red_herrings.pool,
    'red_herrings.pool',
    'red-herring',
  )

  if (
    !scenario.hypotheses.some(
      ({ id }) => id.toLowerCase() === scenario.root_cause.id.toLowerCase(),
    )
  ) {
    addIssue(
      issues,
      filePath,
      'root_cause.id',
      `Root cause "${scenario.root_cause.id}" must reference a hypothesis ID.`,
    )
  }

  const evidenceIds = new Set(scenario.evidence.map(({ id }) => id))
  scenario.evidence.forEach((evidence, evidenceIndex) => {
    evidence.unlock_after.forEach((dependency, dependencyIndex) => {
      const path = `evidence[${evidenceIndex}].unlock_after[${dependencyIndex}]`
      if (!evidenceIds.has(dependency)) {
        addIssue(
          issues,
          filePath,
          path,
          `Unknown evidence reference "${dependency}".`,
        )
      } else if (dependency === evidence.id) {
        addIssue(
          issues,
          filePath,
          path,
          `Evidence "${evidence.id}" cannot depend on itself.`,
        )
      }
    })
  })
  reportDependencyCycles(issues, document)

  if (scenario.red_herrings.choose > scenario.red_herrings.pool.length) {
    addIssue(
      issues,
      filePath,
      'red_herrings.choose',
      `Cannot choose ${scenario.red_herrings.choose} red herrings from a pool of ${scenario.red_herrings.pool.length}.`,
    )
  }

  if (
    !scenario.remediation.choices.some(
      ({ phase, quality }) => phase === 'immediate' && quality === 'correct',
    )
  ) {
    addIssue(
      issues,
      filePath,
      'remediation.choices',
      'At least one correct immediate remediation choice is required.',
    )
  }

  if (
    !scenario.communication.choices.some(
      ({ quality }) => quality === 'excellent',
    )
  ) {
    addIssue(
      issues,
      filePath,
      'communication.choices',
      'At least one excellent communication choice is required.',
    )
  }

  scenario.debrief.evidence_chain.forEach((reference, index) => {
    if (!evidenceIds.has(reference)) {
      addIssue(
        issues,
        filePath,
        `debrief.evidence_chain[${index}]`,
        `Unknown evidence reference "${reference}".`,
      )
    }
  })

  scenario.debrief.efficient_path.forEach((entry, index) => {
    if (entry.kind === 'evidence' && !evidenceIds.has(entry.ref)) {
      addIssue(
        issues,
        filePath,
        `debrief.efficient_path[${index}].ref`,
        `Unknown evidence reference "${entry.ref}".`,
      )
    }
  })

  const correctHypothesis = scenario.hypotheses.find(
    ({ id }) => id.toLowerCase() === scenario.root_cause.id.toLowerCase(),
  )
  const rootCauseId = canonicalizeDirectText(scenario.root_cause.id)
  const correctLabel = correctHypothesis
    ? canonicalizeDirectText(correctHypothesis.label)
    : undefined

  scenario.brief.symptom_variants.forEach((symptom, index) => {
    const normalizedSymptom = canonicalizeDirectText(symptom)
    const path = `brief.symptom_variants[${index}]`
    if (rootCauseId && normalizedSymptom.includes(rootCauseId)) {
      addIssue(
        issues,
        filePath,
        path,
        `Public symptom reveals root-cause ID "${scenario.root_cause.id}".`,
      )
    }
    if (
      correctHypothesis &&
      correctLabel &&
      normalizedSymptom.includes(correctLabel)
    ) {
      addIssue(
        issues,
        filePath,
        path,
        `Public symptom reveals correct hypothesis label "${correctHypothesis.label}".`,
      )
    }
  })
}

export function validateScenarioDocuments(
  documents: readonly ScenarioDocument[],
): ScenarioIssue[] {
  const issues: ScenarioIssue[] = []
  const documentsById = new Map<string, ScenarioDocument[]>()

  for (const document of documents) {
    const normalizedId = document.scenario.id.toLowerCase()
    const matches = documentsById.get(normalizedId)
    if (matches) matches.push(document)
    else documentsById.set(normalizedId, [document])

    validateDocument(document, issues)
  }

  for (const duplicates of documentsById.values()) {
    if (duplicates.length < 2) continue
    for (const duplicate of duplicates) {
      addIssue(
        issues,
        duplicate.filePath,
        'id',
        `Duplicate scenario ID "${duplicate.scenario.id}" (case-insensitive).`,
      )
    }
  }

  return issues.sort(
    (left, right) =>
      compareText(left.filePath, right.filePath) ||
      compareText(left.path, right.path) ||
      compareText(left.message, right.message),
  )
}
