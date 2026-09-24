import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  formatScenarioIssues,
  type ScenarioIssue,
} from '../src/content/scenario-errors'
import {
  normalizeScenarioIndex,
  serializeScenarioIndex,
} from '../src/content/normalize-scenario'
import { parseScenario } from '../src/content/parse-scenario'
import {
  type ScenarioDocument,
  validateScenarioDocuments,
} from '../src/content/validate-scenarios'

export type ScenarioCommand = 'validate' | 'generate'

export interface ScenarioCommandPaths {
  contentDirectory: string
  outputFile: string
}

export interface ScenarioCommandResult {
  success: boolean
  output: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function loadScenarioDocuments(contentDirectory: string): Promise<{
  documents: ScenarioDocument[]
  issues: ScenarioIssue[]
}> {
  const fileNames = (await readdir(contentDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
  const documents: ScenarioDocument[] = []
  const issues: ScenarioIssue[] = []

  for (const fileName of fileNames) {
    const filePath = path.join(contentDirectory, fileName)
    const result = parseScenario(await readFile(filePath, 'utf8'), filePath)
    if (result.success) {
      documents.push({
        filePath,
        sourceName: path.basename(fileName, '.yaml'),
        scenario: result.scenario,
      })
    } else {
      issues.push(...result.issues)
    }
  }

  issues.push(...validateScenarioDocuments(documents))
  return { documents, issues }
}

async function writeIndexIfChanged(
  outputFile: string,
  serializedIndex: string,
): Promise<void> {
  let existingIndex: string | undefined

  try {
    existingIndex = await readFile(outputFile, 'utf8')
  } catch (error) {
    if (!(
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    )) {
      throw error
    }
  }

  if (existingIndex === serializedIndex) return

  await mkdir(path.dirname(outputFile), { recursive: true })
  await writeFile(outputFile, serializedIndex)
}

export async function runScenarioCommand(
  command: ScenarioCommand,
  paths: ScenarioCommandPaths,
): Promise<ScenarioCommandResult> {
  try {
    const { documents, issues } = await loadScenarioDocuments(
      paths.contentDirectory,
    )
    if (issues.length > 0) {
      return { success: false, output: formatScenarioIssues(issues) }
    }

    if (command === 'generate') {
      const index = normalizeScenarioIndex(documents)
      await writeIndexIfChanged(paths.outputFile, serializeScenarioIndex(index))
      return {
        success: true,
        output: `Generated ${documents.length} scenarios.`,
      }
    }

    return {
      success: true,
      output: `Validated ${documents.length} scenarios.`,
    }
  } catch (error) {
    return { success: false, output: errorMessage(error) }
  }
}

async function main(): Promise<void> {
  const command = process.argv[2]
  if (command !== 'validate' && command !== 'generate') {
    console.error('Usage: scenario-cli <validate|generate>')
    process.exitCode = 1
    return
  }

  const result = await runScenarioCommand(command, {
    contentDirectory: 'content/scenarios',
    outputFile: 'src/generated/scenario-index.json',
  })
  const print = result.success ? console.log : console.error
  print(result.output)
  if (!result.success) process.exitCode = 1
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  void main()
}
