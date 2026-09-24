import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { stringify } from 'yaml'

import { createScenarioFixture } from '../src/content/test-fixtures'
import { runScenarioCommand } from './scenario-cli'

const temporaryDirectories: string[] = []

async function createPaths() {
  const root = await mkdtemp(path.join(tmpdir(), 'scenario-cli-'))
  const contentDirectory = path.join(root, 'content')
  const outputFile = path.join(root, 'generated', 'scenario-index.json')
  temporaryDirectories.push(root)
  await mkdir(contentDirectory)

  return { root, contentDirectory, outputFile }
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

    const result = await runScenarioCommand('validate', paths)

    expect(result.success).toBe(false)
    expect(result.output).toContain(
      path.join(paths.contentDirectory, 'broken.yaml'),
    )
    expect(result.output).toContain(
      path.join(paths.contentDirectory, 'invalid.yaml'),
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

  it('generates an ID-sorted JSON index', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-002.yaml', {
      id: 'iam-002',
      title: 'Second scenario',
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
  })

  it('does not rewrite an identical generated index', async () => {
    const paths = await createPaths()
    await writeScenario(paths.contentDirectory, 'iam-001.yaml')
    await runScenarioCommand('generate', paths)
    const oldTimestamp = new Date('2020-01-01T00:00:00.000Z')
    await utimes(paths.outputFile, oldTimestamp, oldTimestamp)

    const result = await runScenarioCommand('generate', paths)

    expect(result).toEqual({
      success: true,
      output: 'Generated 1 scenarios.',
    })
    expect((await stat(paths.outputFile)).mtimeMs).toBe(oldTimestamp.getTime())
  })
})
