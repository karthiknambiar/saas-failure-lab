/// <reference types="node" />

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { composeScenario } from '../engine/compose-scenario'
import {
  applyInvestigationCommand,
  createInvestigation,
} from '../engine/investigation-engine'
import { normalizeScenarioIndex } from './normalize-scenario'
import { parseScenario } from './parse-scenario'
import {
  type ScenarioDocument,
  validateScenarioDocuments,
} from './validate-scenarios'

const scenarioPaths = [
  'content/scenarios/api-001.yaml',
  'content/scenarios/api-002.yaml',
  'content/scenarios/api-004.yaml',
  'content/scenarios/dat-003.yaml',
  'content/scenarios/fnd-001.yaml',
  'content/scenarios/fnd-002.yaml',
  'content/scenarios/fnd-003.yaml',
  'content/scenarios/iam-001.yaml',
  'content/scenarios/iam-004.yaml',
  'content/scenarios/int-001.yaml',
  'content/scenarios/int-004.yaml',
  'content/scenarios/web-001.yaml',
] as const

describe('authored scenario content', () => {
  it('parses and validates the beta catalog', async () => {
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
      'api-001',
      'api-002',
      'api-004',
      'dat-003',
      'fnd-001',
      'fnd-002',
      'fnd-003',
      'iam-001',
      'iam-004',
      'int-001',
      'int-004',
      'web-001',
    ])

    expect(new Set(documents.map(({ scenario }) => scenario.domain))).toEqual(
      new Set([
        'fundamentals',
        'api',
        'identity',
        'integrations',
        'data',
        'browser',
      ]),
    )

    for (const { scenario } of documents) {
      expect(scenario.hypotheses.length).toBeGreaterThanOrEqual(3)
      expect(scenario.evidence.length).toBeGreaterThanOrEqual(3)
    }

    const seeds = ['alpha', 'seed-1', 'demo-seed', 'catalog-contract'] as const
    for (const { scenario } of documents) {
      for (const seed of seeds) {
        const first = composeScenario(scenario, seed)
        const second = composeScenario(scenario, seed)

        expect(first).toEqual(second)
        expect(first.composition.seed).toBe(seed)
        expect(first.scenario.customer_context.join(' ')).not.toContain('{{')
        expect(first.scenario.red_herrings).toHaveLength(
          scenario.red_herrings.choose,
        )
      }
    }

    for (const { scenario } of documents) {
      const instance = composeScenario(scenario, 'investigation-path')
      let investigation = applyInvestigationCommand(
        instance,
        createInvestigation(instance, 1_000),
        { type: 'begin_investigation' },
      )

      for (const entry of scenario.debrief.efficient_path) {
        if (entry.kind !== 'evidence') continue
        investigation = applyInvestigationCommand(instance, investigation, {
          type: 'open_evidence',
          evidenceId: entry.ref,
        })
      }

      expect(investigation.openedEvidenceIds).toEqual(
        scenario.debrief.efficient_path.flatMap((entry) =>
          entry.kind === 'evidence' ? [entry.ref] : [],
        ),
      )
      expect(scenario.investigation_budget).toBeUndefined()
      expect(investigation.budgetRemaining).toBeUndefined()
    }
  })
})
