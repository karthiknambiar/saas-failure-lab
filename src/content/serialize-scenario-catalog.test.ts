import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from './scenario-schema'
import { createScenarioFixture } from './test-fixtures'
import type { ScenarioDocument } from './validate-scenarios'
import { serializeScenarioCatalog } from './serialize-scenario-catalog'

function document(id: string, title: string): ScenarioDocument {
  const scenario = createScenarioFixture() as ScenarioSource

  return {
    filePath: `${id}.yaml`,
    sourceName: id,
    scenario: { ...scenario, id, title },
  }
}

describe('serializeScenarioCatalog', () => {
  it('formats a typed catalog module with one trailing newline', async () => {
    const serialized = await serializeScenarioCatalog([
      document('iam-001', "Customer's access fails"),
    ])

    expect(serialized).toContain(
      "import type { ScenarioSource } from '../content/scenario-schema'",
    )
    expect(serialized).toContain(
      'export const scenarioCatalog: ScenarioSource[] = [',
    )
    expect(serialized).toContain('title: "Customer\'s access fails"')
    expect(serialized).not.toContain(';')
    expect(serialized).not.toContain('\r')
    expect(serialized).toMatch(/[^\n]\n$/)
  })

  it('preserves document order without mutating the documents', async () => {
    const documents = [
      document('iam-002', 'Second by ID, first by source'),
      document('iam-001', 'First by ID, second by source'),
    ]
    const before = structuredClone(documents)

    const serialized = await serializeScenarioCatalog(documents)

    expect(serialized.indexOf("id: 'iam-002'")).toBeLessThan(
      serialized.indexOf("id: 'iam-001'"),
    )
    expect(documents).toEqual(before)
  })
})
