import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { stringify } from 'yaml'

import type { ScenarioSource } from '../src/content/scenario-schema'
import { createScenarioFixture } from '../src/content/test-fixtures'
import { runScenarioCommand } from './scenario-cli'

const temporaryDirectories: string[] = []

async function createPaths() {
  const root = await mkdtemp(path.join(tmpdir(), 'scenario-cli-'))
  const contentDirectory = path.join(root, 'content')
  const outputFile = path.join(root, 'generated', 'scenario-index.json')
  const catalogOutputFile = path.join(root, 'generated', 'scenario-catalog.ts')
  temporaryDirectories.push(root)
  await mkdir(contentDirectory)

  return { root, contentDirectory, outputFile, catalogOutputFile }
}

async function writeScenario(
  contentDirectory: string,
  fileName: string,
  overrides: Record<string, unknown> = {},
) {
  const scenario = { ...createScenarioFixture(), ...overrides }
  await writeFile(path.join(contentDirectory, fileName), stringify(scenario))
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe('runScenarioCommand', () => {
  it('creates paths for the generated index and catalog', async () => {
    const paths = await createPaths()

    expect(paths.outputFile).toBe(
      path.join(paths.root, 'generated', 'scenario-index.json'),
    )
    expect(paths.catalogOutputFile).toBe(
      path.join(paths.root, 'generated', 'scenario-catalog.ts'),
    )
  })

  it('validates one YAML scenario', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')

    await expect(runScenarioCommand('validate', paths)).resolves.toEqual({
      success: true,
      output: 'Validated 1 scenarios.',
    })
  })

  it('reads only YAML files from the content directory', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    await writeFile(path.join(paths.contentDirectory, 'notes.txt'), 'not YAML')
    await mkdir(path.join(paths.contentDirectory, 'nested.yaml'))

    await expect(runScenarioCommand('validate', paths)).resolves.toEqual({
      success: true,
      output: 'Validated 1 scenarios.',
    })
  })

  it('sorts scenario filenames without host locale comparison', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-002.yaml', {
      id: 'iam-002',
    })
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    const localeCompare = vi
      .spyOn(String.prototype, 'localeCompare')
      .mockImplementation(() => {
        throw new Error('locale comparison must not be used')
      })

    let result
    try {
      result = await runScenarioCommand('validate', paths)
    } finally {
      localeCompare.mockRestore()
    }

    expect(result).toEqual({
      success: true,
      output: 'Validated 2 scenarios.',
    })
  })

  it('reports malformed YAML with its filename and document path', async () => {
    const paths = await createPaths()
    await writeFile(
      path.join(paths.contentDirectory, 'broken.yaml'),
      'brief: [',
    )

    const result = await runScenarioCommand('validate', paths)

    expect(result.success).toBe(false)
    expect(result.output).toContain(
      path.join(paths.contentDirectory, 'broken.yaml'),
    )
    expect(result.output).toContain('document:')
  })

  it('aggregates parse and schema issues before semantic validation', async () => {
    const paths = await createPaths()
    await writeFile(
      path.join(paths.contentDirectory, 'broken.yaml'),
      'brief: [',
    )
    await writeFile(
      path.join(paths.contentDirectory, 'invalid.yaml'),
      'id: invalid',
    )
    const semanticScenario = createScenarioFixture() as ScenarioSource
    semanticScenario.id = 'iam-003'
    semanticScenario.evidence[0].unlock_after = ['missing-evidence']
    await writeFile(
      path.join(paths.contentDirectory, 'iam-003.yaml'),
      stringify(semanticScenario),
    )

    const result = await runScenarioCommand('validate', paths)

    expect(result.success).toBe(false)
    expect(result.output).toContain(
      path.join(paths.contentDirectory, 'broken.yaml'),
    )
    expect(result.output).toContain(
      path.join(paths.contentDirectory, 'invalid.yaml'),
    )
    expect(result.output).toContain(
      path.join(paths.contentDirectory, 'iam-003.yaml'),
    )
    expect(result.output).toContain(
      'Unknown evidence reference "missing-evidence".',
    )
  })

  it('reports duplicate IDs across differently named files', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'first.yaml')
    await writeScenario(paths.contentDirectory, 'second.yaml')

    const result = await runScenarioCommand('validate', paths)

    expect(result.success).toBe(false)
    expect(result.output).toContain('first.yaml')
    expect(result.output).toContain('second.yaml')
    expect(result.output).toContain(
      'Duplicate scenario ID "iam-001" (case-insensitive).',
    )
  })

  it('generates an ID-sorted safe index and a source-ordered typed catalog', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-002.yaml', {
      id: 'iam-002',
      title: 'Second scenario',
      root_cause: {
        id: 'reporting-role-removed',
        category: 'authorization',
        explanation: 'Complete catalog field from the source.',
      },
    })
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')

    await expect(runScenarioCommand('generate', paths)).resolves.toEqual({
      success: true,
      output: 'Generated 2 scenarios.',
    })
    const index = JSON.parse(
      await readFile(paths.outputFile, 'utf8'),
    ) as Array<{
      id: string
    }>
    expect(index.map(({ id }) => id)).toEqual(['iam-001', 'iam-002'])
    expect(index[1]).not.toHaveProperty('root_cause')

    const catalog = await readFile(paths.catalogOutputFile, 'utf8')
    expect(catalog).toContain(
      "import type { ScenarioSource } from '../content/scenario-schema'",
    )
    expect(catalog.indexOf("id: 'iam-001'")).toBeLessThan(
      catalog.indexOf("id: 'iam-002'"),
    )
    expect(catalog).toContain('root_cause: {')
    expect(catalog).toContain(
      "explanation: 'Complete catalog field from the source.'",
    )
  })

  it('does not rewrite identical generated artifacts', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    await runScenarioCommand('generate', paths)
    const oldTimestamp = new Date('2020-01-01T00:00:00.000Z')
    await utimes(paths.outputFile, oldTimestamp, oldTimestamp)
    await utimes(paths.catalogOutputFile, oldTimestamp, oldTimestamp)

    const result = await runScenarioCommand('generate', paths)

    expect(result).toEqual({
      success: true,
      output: 'Generated 1 scenarios.',
    })
    expect((await stat(paths.outputFile)).mtimeMs).toBe(oldTimestamp.getTime())
    expect((await stat(paths.catalogOutputFile)).mtimeMs).toBe(
      oldTimestamp.getTime(),
    )
  })

  it('does not rewrite a generated index that differs only by CRLF endings', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    await runScenarioCommand('generate', paths)
    const generatedIndex = await readFile(paths.outputFile, 'utf8')
    await writeFile(paths.outputFile, generatedIndex.replaceAll('\n', '\r\n'))
    const oldTimestamp = new Date('2020-01-01T00:00:00.000Z')
    await utimes(paths.outputFile, oldTimestamp, oldTimestamp)

    const result = await runScenarioCommand('generate', paths)

    expect(result).toEqual({
      success: true,
      output: 'Generated 1 scenarios.',
    })
    expect((await stat(paths.outputFile)).mtimeMs).toBe(oldTimestamp.getTime())
  })

  it('keeps existing generated artifacts unchanged when validation fails', async () => {
    const paths = await createPaths()
    await writeFile(
      path.join(paths.contentDirectory, 'broken.yaml'),
      'brief: [',
    )
    await mkdir(path.dirname(paths.outputFile), { recursive: true })
    await writeFile(paths.outputFile, 'sentinel index')
    await writeFile(paths.catalogOutputFile, 'sentinel catalog')

    const result = await runScenarioCommand('generate', paths)

    expect(result.success).toBe(false)
    await expect(readFile(paths.outputFile, 'utf8')).resolves.toBe(
      'sentinel index',
    )
    await expect(readFile(paths.catalogOutputFile, 'utf8')).resolves.toBe(
      'sentinel catalog',
    )
  })

  it('keeps both destinations unchanged and cleans staged files when the second write fails', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    await mkdir(path.dirname(paths.outputFile), { recursive: true })
    await writeFile(paths.outputFile, 'sentinel index')
    await writeFile(paths.catalogOutputFile, 'sentinel catalog')
    let writeCount = 0

    const result = await runScenarioCommand('generate', paths, {
      async writeFile(filePath: string, content: string) {
        writeCount += 1
        if (writeCount === 2) {
          await writeFile(filePath, content.slice(0, 10))
          throw Object.assign(new Error('disk full'), { code: 'ENOSPC' })
        }
        await writeFile(filePath, content)
      },
      async renameFile(sourceFile: string, destinationFile: string) {
        await rename(sourceFile, destinationFile)
      },
      async removeFile(filePath: string) {
        await rm(filePath, { force: true })
      },
    })

    expect(result.success).toBe(false)
    expect(result.output).toContain('disk full')
    await expect(readFile(paths.outputFile, 'utf8')).resolves.toBe(
      'sentinel index',
    )
    await expect(readFile(paths.catalogOutputFile, 'utf8')).resolves.toBe(
      'sentinel catalog',
    )
    await expect(readdir(path.dirname(paths.outputFile))).resolves.toEqual(
      [
        path.basename(paths.catalogOutputFile),
        path.basename(paths.outputFile),
      ].sort(),
    )
  })

  it('restores both destinations and cleans artifacts when the second replacement fails', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    await mkdir(path.dirname(paths.outputFile), { recursive: true })
    await writeFile(paths.outputFile, 'sentinel index')
    await writeFile(paths.catalogOutputFile, 'sentinel catalog')
    let replacementCount = 0

    const result = await runScenarioCommand('generate', paths, {
      async writeFile(filePath: string, content: string) {
        await writeFile(filePath, content)
      },
      async renameFile(sourceFile: string, destinationFile: string) {
        if (sourceFile.endsWith('.tmp')) {
          replacementCount += 1
          if (replacementCount === 2) {
            throw Object.assign(new Error('destination locked'), {
              code: 'EPERM',
            })
          }
        }
        await rename(sourceFile, destinationFile)
      },
      async removeFile(filePath: string) {
        await rm(filePath, { force: true })
      },
    })

    expect(result.success).toBe(false)
    expect(result.output).toContain('destination locked')
    await expect(readFile(paths.outputFile, 'utf8')).resolves.toBe(
      'sentinel index',
    )
    await expect(readFile(paths.catalogOutputFile, 'utf8')).resolves.toBe(
      'sentinel catalog',
    )
    await expect(readdir(path.dirname(paths.outputFile))).resolves.toEqual(
      [
        path.basename(paths.catalogOutputFile),
        path.basename(paths.outputFile),
      ].sort(),
    )
  })

  it('retains a recoverable backup when rollback restoration fails', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    await mkdir(path.dirname(paths.outputFile), { recursive: true })
    await writeFile(paths.outputFile, 'sentinel index')
    await writeFile(paths.catalogOutputFile, 'sentinel catalog')
    let replacementCount = 0

    const result = await runScenarioCommand('generate', paths, {
      async writeFile(filePath: string, content: string) {
        await writeFile(filePath, content)
      },
      async renameFile(sourceFile: string, destinationFile: string) {
        if (sourceFile.endsWith('.tmp')) {
          replacementCount += 1
          if (replacementCount === 2) {
            throw Object.assign(new Error('catalog destination locked'), {
              code: 'EPERM',
            })
          }
        }
        if (
          sourceFile.endsWith('.bak') &&
          destinationFile === paths.outputFile
        ) {
          throw Object.assign(new Error('index restore locked'), {
            code: 'EPERM',
          })
        }
        await rename(sourceFile, destinationFile)
      },
      async removeFile(filePath: string) {
        await rm(filePath, { force: true })
      },
    })

    expect(result.success).toBe(false)
    expect(result.output).toContain('catalog destination locked')
    expect(result.output).toContain('index restore locked')
    await expect(readFile(paths.catalogOutputFile, 'utf8')).resolves.toBe(
      'sentinel catalog',
    )

    const generatedEntries = await readdir(path.dirname(paths.outputFile))
    const backupEntries = generatedEntries.filter((entry) =>
      entry.endsWith('.bak'),
    )
    expect(generatedEntries).not.toContain(path.basename(paths.outputFile))
    expect(generatedEntries.filter((entry) => entry.endsWith('.tmp'))).toEqual(
      [],
    )
    expect(backupEntries).toHaveLength(1)
    expect(backupEntries[0]).toMatch(
      new RegExp(`^\\.${path.basename(paths.outputFile)}\\..+\\.bak$`),
    )
    await expect(
      readFile(
        path.join(path.dirname(paths.outputFile), backupEntries[0]),
        'utf8',
      ),
    ).resolves.toBe('sentinel index')
  })

  it('reports cleanup failure without hiding publication and recovery failures', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    await mkdir(path.dirname(paths.outputFile), { recursive: true })
    await writeFile(paths.outputFile, 'sentinel index')
    await writeFile(paths.catalogOutputFile, 'sentinel catalog')
    let replacementCount = 0

    const result = await runScenarioCommand('generate', paths, {
      async writeFile(filePath: string, content: string) {
        await writeFile(filePath, content)
      },
      async renameFile(sourceFile: string, destinationFile: string) {
        if (sourceFile.endsWith('.tmp')) {
          replacementCount += 1
          if (replacementCount === 2) {
            throw Object.assign(new Error('catalog destination locked'), {
              code: 'EPERM',
            })
          }
        }
        if (
          sourceFile.endsWith('.bak') &&
          destinationFile === paths.outputFile
        ) {
          throw Object.assign(new Error('index restore locked'), {
            code: 'EPERM',
          })
        }
        await rename(sourceFile, destinationFile)
      },
      async removeFile(filePath: string) {
        if (
          filePath.endsWith('.tmp') &&
          filePath.includes(path.basename(paths.catalogOutputFile))
        ) {
          throw Object.assign(new Error('temporary cleanup denied'), {
            code: 'EPERM',
          })
        }
        await rm(filePath, { force: true })
      },
    })

    expect(result.success).toBe(false)
    expect(result.output).toContain('catalog destination locked')
    expect(result.output).toContain('index restore locked')
    expect(result.output).toContain('Recovery backups retained:')
    expect(result.output).toContain('temporary cleanup denied')
  })
})
