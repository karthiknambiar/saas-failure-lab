import { stringify } from 'yaml'
import { describe, expect, it } from 'vitest'

import { formatScenarioIssues } from './scenario-errors'
import { parseScenario, type ParseScenarioResult } from './parse-scenario'
import type { ScenarioSource } from './scenario-schema'
import { createScenarioFixture } from './test-fixtures'

describe('parseScenario', () => {
  it('parses valid scenario YAML into a typed success result', () => {
    const scenario = createScenarioFixture()

    const result: ParseScenarioResult = parseScenario(
      stringify(scenario),
      'scenarios/iam-001.yaml',
    )

    expect(result).toEqual({
      success: true,
      scenario: scenario as ScenarioSource,
      issues: [],
    })
  })

  it('returns the filename and parser message for malformed YAML', () => {
    const result = parseScenario('learning: [', 'scenarios/broken.yaml')

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toEqual({
      filePath: 'scenarios/broken.yaml',
      path: 'document',
      message: expect.stringMatching(/flow sequence|end of the stream/i),
    })
  })

  it('returns schema issue paths for invalid scenario YAML', () => {
    const scenario = createScenarioFixture()
    scenario.learning.objectives = []

    const result = parseScenario(stringify(scenario), 'scenarios/invalid.yaml')

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: 'scenarios/invalid.yaml',
          path: 'learning.objectives',
        }),
      ]),
    )
  })
})

describe('formatScenarioIssues', () => {
  it('groups by filename and sorts groups and issues deterministically', () => {
    expect(
      formatScenarioIssues([
        { filePath: 'z.yaml', path: 'title', message: 'Required' },
        { filePath: 'a.yaml', path: 'version', message: 'Too small' },
        { filePath: 'a.yaml', path: '', message: 'Malformed YAML' },
        { filePath: 'a.yaml', path: 'version', message: 'Expected number' },
      ]),
    ).toBe(
      [
        'a.yaml',
        '  document: Malformed YAML',
        '  version: Expected number',
        '  version: Too small',
        'z.yaml',
        '  title: Required',
      ].join('\n'),
    )
  })
})
