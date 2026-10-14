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
  const [conduct, security, issueConfig, bugTemplate, scenarioTemplate] =
    await Promise.all([
      readRepositoryFile('CODE_OF_CONDUCT.md'),
      readRepositoryFile('SECURITY.md'),
      readRepositoryFile('.github/ISSUE_TEMPLATE/config.yml'),
      readRepositoryFile('.github/ISSUE_TEMPLATE/bug_report.yml'),
      readRepositoryFile('.github/ISSUE_TEMPLATE/scenario_proposal.yml'),
    ])

  assert.match(conduct, /private GitHub security advisory/i)
  assert.match(conduct, /may remove content or participation/i)
  assert.match(conduct, /Report conduct concerns/i)
  assert.match(security, /private GitHub security advisory/i)
  assert.match(security, /do not open a public issue/i)
  assert.match(security, /do not\s+publish a response-time or remediation SLA/i)
  assert.match(issueConfig, /blank_issues_enabled: false/)
  assert.match(issueConfig, /private GitHub security advisory/i)
  assert.match(issueConfig, /Do not include credentials/)
  assert.match(
    bugTemplate,
    /id: sensitive-data[\s\S]*?I confirm this report contains no credentials[\s\S]*?required: true/,
  )
  assert.match(bugTemplate, /Sensitive-data confirmation/)
  assert.match(bugTemplate, /Do not include credentials/)
  assert.match(
    scenarioTemplate,
    /id: fictional-sanitized[\s\S]*?I confirm this proposal is fictional, sanitized[\s\S]*?required: true/,
  )
  assert.match(scenarioTemplate, /Fictional and sanitized confirmation/)
  assert.match(scenarioTemplate, /Do not include credentials/)
  assert.match(scenarioTemplate, /fictional and sanitized/i)
})

test('documents contributor checks, review expectations, and roadmap scope', async () => {
  const [contributing, pullRequestTemplate, roadmap] = await Promise.all([
    readRepositoryFile('CONTRIBUTING.md'),
    readRepositoryFile('.github/pull_request_template.md'),
    readRepositoryFile('ROADMAP.md'),
  ])

  assert.match(contributing, /npm install/)
  assert.match(contributing, /npm test/)
  assert.match(contributing, /npm run lint/)
  assert.match(contributing, /npm run format:check/)
  assert.match(contributing, /YAML/)
  assert.match(contributing, /npm run validate:scenarios/)
  assert.match(contributing, /npm run generate:scenarios/)
  assert.match(contributing, /Review expectations/)
  assert.match(pullRequestTemplate, /npm test/)
  assert.match(pullRequestTemplate, /npm run validate:scenarios/)
  assert.match(pullRequestTemplate, /updated relevant documentation/i)
  assert.match(pullRequestTemplate, /Do not include credentials/)
  assert.match(roadmap, /M0–M10[\s\S]*complete/i)
  assert.match(roadmap, /M11: community release preparation/i)
  assert.match(roadmap, /optional AI extension contract/i)
  assert.match(roadmap, /provider-agnostic/i)
  assert.match(roadmap, /AI\s+adapter\/relay design/i)
  assert.match(
    roadmap,
    /without making AI\s+functionality or an adapter a requirement/i,
  )
  assert.match(roadmap, /not an\s+integration promise/i)
  assert.match(roadmap, /noncommitments/i)
})
