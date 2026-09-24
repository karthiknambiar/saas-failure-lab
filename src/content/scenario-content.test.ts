/// <reference types="node" />

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { normalizeScenarioIndex } from './normalize-scenario'
import { parseScenario } from './parse-scenario'
import {
  type ScenarioDocument,
  validateScenarioDocuments,
} from './validate-scenarios'

const scenarioPaths = [
  'content/scenarios/iam-001.yaml',
  'content/scenarios/fnd-001.yaml',
] as const

describe('authored scenario content', () => {
  it('parses and validates the first two scenario files', async () => {
    const documents: ScenarioDocument[] = []

    for (const filePath of scenarioPaths) {
      const result = parseScenario(await readFile(filePath, 'utf8'), filePath)

      expect(result.success, JSON.stringify(result.issues, null, 2)).toBe(true)
      if (!result.success) continue

      documents.push({
        filePath,
        sourceName: path.basename(filePath, '.yaml'),
        scenario: result.scenario,
      })
    }

    expect(validateScenarioDocuments(documents)).toEqual([])
    expect(normalizeScenarioIndex(documents).map(({ id }) => id)).toEqual([
      'fnd-001',
      'iam-001',
    ])

    for (const { scenario } of documents) {
      expect(scenario.hypotheses.length).toBeGreaterThanOrEqual(3)
      expect(scenario.evidence.length).toBeGreaterThanOrEqual(3)
    }
  })
})
