import { randomUUID } from 'node:crypto'
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
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
import { serializeScenarioCatalog } from '../src/content/serialize-scenario-catalog'
import {
  type ScenarioDocument,
  validateScenarioDocuments,
} from '../src/content/validate-scenarios'

export type ScenarioCommand = 'validate' | 'generate'

export interface ScenarioCommandPaths {
  contentDirectory: string
  outputFile: string
  catalogOutputFile: string
}

export interface ScenarioCommandResult {
  success: boolean
  output: string
}

export interface ScenarioCommandOperations {
  writeFile(filePath: string, content: string): Promise<void>
  renameFile(sourceFile: string, destinationFile: string): Promise<void>
  removeFile(filePath: string): Promise<void>
}

interface GeneratedArtifact {
  outputFile: string
  content: string
}

const defaultOperations: ScenarioCommandOperations = {
  async writeFile(filePath, content) {
    await writeFile(filePath, content)
  },
  async renameFile(sourceFile, destinationFile) {
    await rename(sourceFile, destinationFile)
  },
  async removeFile(filePath) {
    await rm(filePath, { force: true })
  },
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function normalizeLineEndings(value: string): string {
  return value.replaceAll('\r\n', '\n')
}

async function loadScenarioDocuments(contentDirectory: string): Promise<{
  documents: ScenarioDocument[]
  issues: ScenarioIssue[]
}> {
  const fileNames = (await readdir(contentDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => entry.name)
    .sort(compareCodeUnits)
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

async function writeArtifactsIfChanged(
  artifacts: readonly GeneratedArtifact[],
  operations: ScenarioCommandOperations,
): Promise<void> {
  const stagedArtifacts: Array<{
    destinationExisted: boolean
    outputFile: string
    temporaryFile: string
  }> = []
  const disposableBackupFiles = new Set<string>()
  const commitRecords: Array<{
    backupFile?: string
    outputFile: string
  }> = []
  let activeFailure: unknown
  let hasActiveFailure = false

  try {
    for (const artifact of artifacts) {
      let existingContent: string | undefined

      try {
        existingContent = await readFile(artifact.outputFile, 'utf8')
      } catch (error) {
        if (!(
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )) {
          throw error
        }
      }

      if (
        existingContent !== undefined &&
        normalizeLineEndings(existingContent) ===
          normalizeLineEndings(artifact.content)
      ) {
        continue
      }

      const outputDirectory = path.dirname(artifact.outputFile)
      const temporaryFile = path.join(
        outputDirectory,
        `.${path.basename(artifact.outputFile)}.${process.pid}.${randomUUID()}.tmp`,
      )
      stagedArtifacts.push({
        destinationExisted: existingContent !== undefined,
        outputFile: artifact.outputFile,
        temporaryFile,
      })
      await mkdir(outputDirectory, { recursive: true })
      await operations.writeFile(temporaryFile, artifact.content)
    }

    for (const artifact of stagedArtifacts) {
      let backupFile: string | undefined
      if (artifact.destinationExisted) {
        backupFile = path.join(
          path.dirname(artifact.outputFile),
          `.${path.basename(artifact.outputFile)}.${process.pid}.${randomUUID()}.bak`,
        )
        disposableBackupFiles.add(backupFile)
        await operations.renameFile(artifact.outputFile, backupFile)
      }

      commitRecords.push({ backupFile, outputFile: artifact.outputFile })
      await operations.renameFile(artifact.temporaryFile, artifact.outputFile)
    }
  } catch (error) {
    const rollbackFailures: Array<{
      backupFile?: string
      error: unknown
    }> = []

    for (const record of commitRecords.toReversed()) {
      try {
        await operations.removeFile(record.outputFile)
        if (record.backupFile) {
          await operations.renameFile(record.backupFile, record.outputFile)
        }
      } catch (rollbackError) {
        if (record.backupFile) {
          disposableBackupFiles.delete(record.backupFile)
        }
        rollbackFailures.push({
          backupFile: record.backupFile,
          error: rollbackError,
        })
      }
    }

    if (rollbackFailures.length > 0) {
      const rollbackDetails = rollbackFailures
        .map(({ error: rollbackError }) => errorMessage(rollbackError))
        .join('; ')
      const retainedBackups = rollbackFailures
        .flatMap(({ backupFile }) => (backupFile ? [backupFile] : []))
        .join(', ')
      activeFailure = new AggregateError(
        [
          error,
          ...rollbackFailures.map(({ error: rollbackError }) => rollbackError),
        ],
        `Failed to write generated artifacts: ${errorMessage(error)}. Rollback failed: ${rollbackDetails}.${retainedBackups ? ` Recovery backups retained: ${retainedBackups}.` : ''}`,
        { cause: error },
      )
    } else {
      activeFailure = error
    }
    hasActiveFailure = true
  } finally {
    const cleanupResults = await Promise.allSettled(
      [
        ...stagedArtifacts.map(({ temporaryFile }) => temporaryFile),
        ...disposableBackupFiles,
      ].map((filePath) => operations.removeFile(filePath)),
    )
    const cleanupErrors = cleanupResults.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    )

    if (cleanupErrors.length > 0) {
      const cleanupDetails = cleanupErrors.map(errorMessage).join('; ')
      if (hasActiveFailure) {
        const activeErrors =
          activeFailure instanceof AggregateError
            ? activeFailure.errors
            : [activeFailure]
        activeFailure = new AggregateError(
          [...activeErrors, ...cleanupErrors],
          `${errorMessage(activeFailure)} Cleanup failed: ${cleanupDetails}.`,
          { cause: activeFailure },
        )
      } else {
        activeFailure = new AggregateError(
          cleanupErrors,
          `Failed to clean generated artifacts: ${cleanupDetails}.`,
          { cause: cleanupErrors[0] },
        )
        hasActiveFailure = true
      }
    }
  }

  if (hasActiveFailure) throw activeFailure
}

export async function runScenarioCommand(
  command: ScenarioCommand,
  paths: ScenarioCommandPaths,
  operations: ScenarioCommandOperations = defaultOperations,
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
      await writeArtifactsIfChanged(
        [
          {
            outputFile: paths.outputFile,
            content: serializeScenarioIndex(index),
          },
          {
            outputFile: paths.catalogOutputFile,
            content: await serializeScenarioCatalog(documents),
          },
        ],
        operations,
      )
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
    catalogOutputFile: 'src/generated/scenario-catalog.ts',
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
