import { describe, expect, it } from 'vitest'

import type { ScenarioSource } from './scenario-schema'
import { createScenarioFixture } from './test-fixtures'
import {
  type ScenarioDocument,
  validateScenarioDocuments,
} from './validate-scenarios'

function document(
  scenario: ScenarioSource = createScenarioFixture() as ScenarioSource,
  filePath = 'content/scenarios/iam-001.yaml',
  sourceName = scenario.id,
): ScenarioDocument {
  return { filePath, sourceName, scenario: scenario as ScenarioSource }
}

describe('validateScenarioDocuments', () => {
  it('reports collection duplicate scenario IDs case-insensitively', () => {
    const first = createScenarioFixture() as ScenarioSource
    const second = createScenarioFixture() as ScenarioSource
    second.id = 'IAM-001'

    expect(
      validateScenarioDocuments([
        document(first, 'z.yaml'),
        document(second, 'a.yaml', 'IAM-001'),
      ]),
    ).toEqual([
      {
        filePath: 'a.yaml',
        path: 'id',
        message: 'Duplicate scenario ID "IAM-001" (case-insensitive).',
      },
      {
        filePath: 'z.yaml',
        path: 'id',
        message: 'Duplicate scenario ID "iam-001" (case-insensitive).',
      },
    ])
  })

  it('reports a source filename that does not match the scenario ID', () => {
    expect(
      validateScenarioDocuments([document(undefined, 'wrong.yaml', 'wrong')]),
    ).toEqual([
      {
        filePath: 'wrong.yaml',
        path: 'id',
        message: 'Scenario ID "iam-001" must match source name "wrong".',
      },
    ])
  })

  it.each([
    {
      name: 'hypothesis',
      path: 'hypotheses[2].id',
      message: 'Duplicate hypothesis ID "reporting-role-removed".',
      mutate(scenario: ScenarioSource) {
        scenario.hypotheses[2].id = scenario.hypotheses[0].id
      },
    },
    {
      name: 'evidence',
      path: 'evidence[1].id',
      message: 'Duplicate evidence ID "service-status".',
      mutate(scenario: ScenarioSource) {
        scenario.evidence.push({ ...scenario.evidence[0] })
      },
    },
    {
      name: 'remediation choice',
      path: 'remediation.choices[1].id',
      message: 'Duplicate remediation choice ID "restore-reporting-role".',
      mutate(scenario: ScenarioSource) {
        scenario.remediation.choices.push({
          ...scenario.remediation.choices[0],
        })
      },
    },
    {
      name: 'communication choice',
      path: 'communication.choices[1].id',
      message:
        'Duplicate communication choice ID "share-impact-and-next-step".',
      mutate(scenario: ScenarioSource) {
        scenario.communication.choices[1].id =
          scenario.communication.choices[0].id
      },
    },
    {
      name: 'red-herring',
      path: 'red_herrings.pool[1].id',
      message: 'Duplicate red-herring ID "distractor".',
      mutate(scenario: ScenarioSource) {
        scenario.red_herrings.pool.push(
          {
            id: 'distractor',
            label: 'First distraction',
            explanation: 'Not causal.',
          },
          {
            id: 'distractor',
            label: 'Second distraction',
            explanation: 'Also not causal.',
          },
        )
      },
    },
  ])('reports duplicate $name IDs', ({ mutate, path, message }) => {
    const scenario = createScenarioFixture() as ScenarioSource
    mutate(scenario)

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path,
      message,
    })
  })

  it('reports a root cause absent from the hypotheses', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.root_cause.id = 'missing-cause'

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'root_cause.id',
      message: 'Root cause "missing-cause" must reference a hypothesis ID.',
    })
  })

  it('reports an unlock reference to unknown evidence', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.evidence[0].unlock_after = ['unknown-evidence']

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'evidence[0].unlock_after[0]',
      message: 'Unknown evidence reference "unknown-evidence".',
    })
  })

  it('reports a self-dependency', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.evidence[0].unlock_after = ['service-status']

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'evidence[0].unlock_after[0]',
      message: 'Evidence "service-status" cannot depend on itself.',
    })
  })

  it('reports a dependency cycle once without duplicate rotations', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    const template = scenario.evidence[0]
    scenario.evidence = [
      { ...template, id: 'alpha', unlock_after: ['beta'] },
      { ...template, id: 'beta', unlock_after: ['gamma'] },
      { ...template, id: 'gamma', unlock_after: ['alpha'] },
    ]
    scenario.debrief.evidence_chain = ['alpha']
    scenario.debrief.efficient_path = [{ kind: 'evidence', ref: 'alpha' }]

    expect(validateScenarioDocuments([document(scenario)])).toEqual([
      {
        filePath: 'content/scenarios/iam-001.yaml',
        path: 'evidence',
        message: 'Evidence dependency cycle: alpha -> beta -> gamma -> alpha.',
      },
    ])
  })

  it('reports identical cycles for reordered evidence and dependencies', () => {
    const first = createScenarioFixture() as ScenarioSource
    const second = createScenarioFixture() as ScenarioSource
    const firstTemplate = first.evidence[0]
    const secondTemplate = second.evidence[0]
    first.evidence = [
      { ...firstTemplate, id: 'alpha', unlock_after: ['beta', 'gamma'] },
      { ...firstTemplate, id: 'beta', unlock_after: ['gamma'] },
      { ...firstTemplate, id: 'gamma', unlock_after: ['alpha'] },
    ]
    second.evidence = [
      { ...secondTemplate, id: 'gamma', unlock_after: ['alpha'] },
      { ...secondTemplate, id: 'beta', unlock_after: ['gamma'] },
      { ...secondTemplate, id: 'alpha', unlock_after: ['gamma', 'beta'] },
    ]
    first.debrief.evidence_chain = ['alpha']
    second.debrief.evidence_chain = ['alpha']
    first.debrief.efficient_path = [{ kind: 'evidence', ref: 'alpha' }]
    second.debrief.efficient_path = [{ kind: 'evidence', ref: 'alpha' }]

    expect(validateScenarioDocuments([document(second)])).toEqual(
      validateScenarioDocuments([document(first)]),
    )
  })

  it('reports when red-herring selection exceeds the pool', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.red_herrings.choose = 1

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'red_herrings.choose',
      message: 'Cannot choose 1 red herrings from a pool of 0.',
    })
  })

  it('requires a correct immediate remediation choice', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.remediation.choices[0].phase = 'prevention'

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'remediation.choices',
      message: 'At least one correct immediate remediation choice is required.',
    })
  })

  it('requires an excellent communication choice', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.communication.choices[0].quality = 'acceptable'

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'communication.choices',
      message: 'At least one excellent communication choice is required.',
    })
  })

  it('reports an unknown debrief evidence-chain reference', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.debrief.evidence_chain = ['unknown-evidence']

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'debrief.evidence_chain[0]',
      message: 'Unknown evidence reference "unknown-evidence".',
    })
  })

  it('reports an unknown efficient-path evidence reference', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.debrief.efficient_path = [
      { kind: 'evidence', ref: 'unknown-evidence' },
    ]

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'debrief.efficient_path[0].ref',
      message: 'Unknown evidence reference "unknown-evidence".',
    })
  })

  it('reports a symptom that directly contains the root-cause ID', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.brief.symptom_variants = [
      'The REPORTING-ROLE-REMOVED condition affects two users.',
    ]

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'brief.symptom_variants[0]',
      message: 'Public symptom reveals root-cause ID "reporting-role-removed".',
    })
  })

  it('reports a symptom that directly contains the full correct hypothesis label', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.brief.symptom_variants = [
      'Observed: THE AFFECTED USERS LOST THEIR REPORTING ROLE. Please help.',
    ]

    expect(validateScenarioDocuments([document(scenario)])).toContainEqual({
      filePath: 'content/scenarios/iam-001.yaml',
      path: 'brief.symptom_variants[0]',
      message:
        'Public symptom reveals correct hypothesis label "The affected users lost their reporting role.".',
    })
  })

  it('sorts issues deterministically without mutating the documents', () => {
    const first = createScenarioFixture() as ScenarioSource
    first.root_cause.id = 'missing-first'
    const second = createScenarioFixture() as ScenarioSource
    second.id = 'api-002'
    second.root_cause.id = 'missing-second'
    const documents = [
      document(first, 'z.yaml'),
      document(second, 'a.yaml', 'api-002'),
    ]
    const before = structuredClone(documents)

    const issues = validateScenarioDocuments(documents)

    expect(issues.map((issue) => issue.filePath)).toEqual(['a.yaml', 'z.yaml'])
    expect(documents).toEqual(before)
  })

  it('sorts issues by path and then message within a file', () => {
    const scenario = createScenarioFixture() as ScenarioSource
    scenario.evidence[0].unlock_after = ['service-status']
    scenario.brief.symptom_variants = [
      `${scenario.root_cause.id}: ${scenario.hypotheses[0].label}`,
    ]

    expect(
      validateScenarioDocuments([
        document(scenario, 'scenario.yaml', 'wrong-name'),
      ]).map(({ path, message }) => ({ path, message })),
    ).toEqual([
      {
        path: 'brief.symptom_variants[0]',
        message:
          'Public symptom reveals correct hypothesis label "The affected users lost their reporting role.".',
      },
      {
        path: 'brief.symptom_variants[0]',
        message:
          'Public symptom reveals root-cause ID "reporting-role-removed".',
      },
      {
        path: 'evidence[0].unlock_after[0]',
        message: 'Evidence "service-status" cannot depend on itself.',
      },
      {
        path: 'id',
        message: 'Scenario ID "iam-001" must match source name "wrong-name".',
      },
    ])
  })
})
