import { parse } from 'yaml'

import { type ScenarioIssue } from './scenario-errors'
import { scenarioSourceSchema, type ScenarioSource } from './scenario-schema'

export type ParseScenarioResult =
  | {
      success: true
      scenario: ScenarioSource
      issues: []
    }
  | {
      success: false
      issues: ScenarioIssue[]
    }

export function parseScenario(
  sourceText: string,
  filePath: string,
): ParseScenarioResult {
  let document: unknown

  try {
    document = parse(sourceText)
  } catch (error) {
    return {
      success: false,
      issues: [
        {
          filePath,
          path: 'document',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }

  const result = scenarioSourceSchema.safeParse(document)
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map((issue) => ({
        filePath,
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }
  }

  return { success: true, scenario: result.data, issues: [] }
}
