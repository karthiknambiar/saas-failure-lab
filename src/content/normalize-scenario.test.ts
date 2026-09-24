import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from './scenario-schema'
import { createScenarioFixture } from './test-fixtures'
import type { ScenarioDocument } from './validate-scenarios'
import {
  normalizeScenarioIndex,
  serializeScenarioIndex,
} from './normalize-scenario'

function document(
  id: string,
  overrides: Partial<ScenarioSource> = {},
): ScenarioDocument {
  const scenario = {
    ...createScenarioFixture(),
    id,
    ...overrides,
  } as ScenarioSource

  return {
    filePath: `content/scenarios/${id}.yaml`,
    sourceName: id,
    scenario,
  }
}

describe('normalizeScenarioIndex', () => {
  it('sorts entries by ID and exposes only public index fields', () => {
    const documents = [
      document('iam-002', { title: 'Second IAM scenario' }),
      document('iam-001', {
        title: 'Login works, feature does not',
        learning: {
          concepts: ['roles', 'authentication'],
          objectives: ['Separate identity from access.'],
        },
        brief: {
          severity: 'medium',
          business_impact: 'Reporting is blocked.',
          symptom_variants: [
            'Two users can sign in but cannot open reporting.',
            'A later symptom must not be selected.',
          ],
        },
      }),
    ]

    expect(normalizeScenarioIndex(documents)).toEqual([
      {
        id: 'iam-001',
        title: 'Login works, feature does not',
        domain: 'identity',
        difficulty: 'beginner',
        estimatedMinutes: 8,
        concepts: ['authentication', 'roles'],
        symptomSummary: 'Two users can sign in but cannot open reporting.',
      },
      {
        id: 'iam-002',
        title: 'Second IAM scenario',
        domain: 'identity',
        difficulty: 'beginner',
        estimatedMinutes: 8,
        concepts: ['authentication-vs-authorization'],
        symptomSummary: 'Two users can sign in but cannot open reporting.',
      },
    ])
  })

  it('sorts copied concepts without mutating source documents', () => {
    const documents = [
      document('iam-001', {
        learning: {
          concepts: ['roles', 'authentication'],
          objectives: ['Separate identity from access.'],
        },
      }),
    ]
    const before = structuredClone(documents)

    const entries = normalizeScenarioIndex(documents)

    expect(entries[0].concepts).toEqual(['authentication', 'roles'])
    expect(documents).toEqual(before)
  })
})

describe('serializeScenarioIndex', () => {
  it('emits stable two-space JSON with one trailing newline and no hidden fields', () => {
    const entries = normalizeScenarioIndex([document('iam-001')])

    const serialized = serializeScenarioIndex(entries)

    expect(serialized).toBe(`${JSON.stringify(entries, null, 2)}\n`)
    expect(serialized.endsWith('\n')).toBe(true)
    expect(serialized.endsWith('\n\n')).toBe(false)
    for (const hidden of [
      'rootCause',
      'root_cause',
      'evidence',
      'relevance',
      'remediation',
      'communication',
      'debrief',
    ]) {
      expect(serialized).not.toContain(hidden)
    }
  })
})
