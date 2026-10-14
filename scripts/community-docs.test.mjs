import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const communityFiles = [
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'ROADMAP.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/scenario_proposal.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/pull_request_template.md',
]

const readRepositoryFile = (file) =>
  readFile(path.join(repositoryRoot, file), 'utf8')

test('publishes the M11 community documentation files with safe contribution guidance', async () => {
  await Promise.all(
    communityFiles.map((file) => access(path.join(repositoryRoot, file))),
  )

  const [contributing, bugTemplate, scenarioTemplate, pullRequestTemplate] =
    await Promise.all([
      readRepositoryFile('CONTRIBUTING.md'),
      readRepositoryFile('.github/ISSUE_TEMPLATE/bug_report.yml'),
      readRepositoryFile('.github/ISSUE_TEMPLATE/scenario_proposal.yml'),
      readRepositoryFile('.github/pull_request_template.md'),
    ])

  for (const content of [
    contributing,
    bugTemplate,
    scenarioTemplate,
    pullRequestTemplate,
  ]) {
    assert.match(content, /Do not include credentials/)
  }

  assert.match(contributing, /fictional/i)
  assert.match(scenarioTemplate, /fictional/i)
})

test('keeps conduct, security, and issue routing private and safe', async () => {
  const [conduct, security, issueConfig] = await Promise.all([
    readRepositoryFile('CODE_OF_CONDUCT.md'),
    readRepositoryFile('SECURITY.md'),
    readRepositoryFile('.github/ISSUE_TEMPLATE/config.yml'),
  ])

  assert.match(conduct, /private GitHub security advisory/i)
  assert.match(security, /private GitHub security advisory/i)
  assert.match(security, /do not open a public issue/i)
  assert.match(issueConfig, /private GitHub security advisory/i)
  assert.match(issueConfig, /Do not include credentials/)
})
