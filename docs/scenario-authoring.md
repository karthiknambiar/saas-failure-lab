# Scenario authoring

Scenario sources live in `content/scenarios/` as YAML files. Use a lowercase,
URL-safe canonical ID such as `api-002`; the filename must be that exact ID plus
`.yaml` (`content/scenarios/api-002.yaml`). Scenario IDs follow
`[a-z][a-z0-9]*-NNN` and must be unique across the collection, ignoring case.

## Authoring contract

Every scenario has these top-level sections:

- `id`, `version`, `title`, `domain`, `difficulty`, and `estimated_minutes`:
  browse metadata. `version` and `estimated_minutes` are positive integers.
- `investigation_budget` (optional): a positive integer starting balance.
  Omit it for scenarios, especially beginner scenarios, that should not create
  budget pressure.
- `learning`: non-empty `concepts` and `objectives` lists.
- `variations`: non-empty fictional `customer_names` and bounded
  `timestamp_offsets_minutes` pools used by deterministic composition.
- `customer_context`: non-empty fictional background details.
- `brief`: the public `severity`, `business_impact`, and one or more
  `symptom_variants`.
- `root_cause`: the hidden answer ID, category, and explanation.
- `hypotheses`: at least three selectable hypotheses, including the root-cause
  ID.
- `evidence`: tool results, costs, relevance, unlock dependencies, typed
  content, and explanations. Evidence and its relevance are hidden from the
  public browse index.
- `red_herrings`: a pool of plausible distractions and how many may be chosen.
- `remediation`: hidden answer choices, phases, quality labels, and
  explanations.
- `communication`: hidden answer choices, quality labels, and explanations;
  provide at least two choices.
- `debrief`: the hidden answer explanation, evidence chain, efficient path, and
  transferable lesson.

The generated public index exposes only seven browse-safe fields: `id`, `title`,
`domain`, `difficulty`, `estimatedMinutes`, `concepts`, and `symptomSummary`
(the first symptom variant). It intentionally omits customer context, objectives,
root causes, hypotheses, evidence and relevance, red herrings, remediation and
communication correctness, and the debrief.

## Supported values

- Domains: `fundamentals`, `api`, `identity`, `integrations`, `data`, `browser`
- Difficulty: `beginner`, `intermediate`, `advanced`
- Severity: `low`, `medium`, `high`, `critical`
- Evidence relevance: `critical`, `supporting`, `neutral`, `red_herring`
- Tools: `service_status`, `user_scope`, `identity_events`,
  `role_configuration`, `audit_log`
- Evidence content kinds: `text`, `status`, `key_value`, `table`, `timeline`
- Remediation phases: `immediate`, `prevention`; qualities: `correct`,
  `partial`, `incorrect`
- Communication qualities: `poor`, `acceptable`, `excellent`
- Framework steps: `establish-impact`, `determine-scope`,
  `check-recent-changes`, `collect-evidence`, `test-hypothesis`

Content shapes depend on `kind`: `text` has `text`; `status` has `state` and
`detail`; `key_value` has a non-empty-string map in `values`; `table` has
non-empty `columns` and `rows`; and `timeline` has `events`, each with an
`event` string and structured `time`: `day_offset` is an integer from `-365`
through `365`, and `clock` uses strict 24-hour `HH:mm`. The composer selects one
integer timestamp offset from `-180` through `180` minutes and applies it
consistently to every timeline event.

## Deterministic variation

Every scenario declares at least one fictional customer name and timestamp
offset. Use the exact `{{customerName}}` token where the chosen customer should
appear in `customer_context`; other template tokens are rejected. Customer,
symptom, timestamp, and red-herring choices are independently derived from the
scenario ID, version, and seed. Do not encode root-cause or evidence changes as
variations.

## Investigation flow

Evidence with an empty `unlock_after` list is initially available. Other
evidence unlocks only after every referenced dependency has been opened. The
first opening records its authored cost; an enabled budget deducts that cost
once. Reopening evidence is free. Bookmarks require opened evidence, and
hypothesis choices must reference an authored hypothesis ID.

Evidence `relevance` and `explanation` remain hidden during investigation.

## Relationships and safeguards

Use lowercase kebab-case nested IDs. IDs must be unique within each hypotheses,
evidence, red-herring, remediation-choice, and communication-choice list. The
`root_cause.id` must reference a hypothesis ID. Include at least one remediation
with `phase: immediate` and `quality: correct`, and at least one communication
with `quality: excellent`.

Each `unlock_after` entry must name another evidence item in the same scenario.
An item cannot unlock after itself, and the dependency graph cannot contain a
cycle. Every `debrief.evidence_chain` evidence ID and every `evidence` entry in
`debrief.efficient_path` must also exist. A `framework_step` entry must use one
of the supported framework steps above.

`red_herrings.choose` may be zero, but it cannot exceed the number of entries in
`red_herrings.pool`.

Public symptom text must not directly contain the root-cause ID or the complete
label of the correct hypothesis. This safeguard catches explicit answer leaks;
authors must still review all public wording for indirect spoilers. Keep every
customer, person, hostname, account, event, and data value fictional. Never copy
confidential customer information, credentials, production logs, or personal
data into the repository.

## Validate and generate

From the repository root, run:

```sh
npm run validate:scenarios
npm run generate:scenarios
git diff -- src/generated/scenario-index.json
```

Validation reads all YAML files and reports all parse, schema, and semantic
problems it can collect in one run. Generation validates first, then updates the
committed deterministic public index only when its content changed. Both CI and
`npm run build` reject invalid scenarios; CI also rejects index drift.

An aggregated failure looks like this:

```text
content/scenarios/api-002.yaml
  evidence[1].unlock_after[0]: Unknown evidence reference "missing-status".
  red_herrings.choose: Cannot choose 2 red herrings from a pool of 1.
content/scenarios/iam-003.yaml
  communication.choices: At least one excellent communication choice is required.
```

## Compact valid example

This fictional example includes every required top-level key. Real scenarios
should contain enough evidence and explanation to teach the intended lesson.

```yaml
id: api-002
version: 1
title: Export requests fail for one workspace
domain: api
difficulty: beginner
estimated_minutes: 6
learning:
  concepts: [request-scope]
  objectives: [Compare a failing workspace with a working workspace.]
variations:
  customer_names: [Lumen Harbor, Summit Vale]
  timestamp_offsets_minutes: [0, 20]
customer_context:
  - '{{customerName}} is a fictional analytics company using scheduled exports.'
brief:
  severity: medium
  business_impact: One workspace cannot finish its daily fictional export.
  symptom_variants:
    - Export requests fail in one workspace while another workspace succeeds.
root_cause:
  id: export-permission-missing
  category: authorization
  explanation: The affected workspace lacks the export permission.
hypotheses:
  - id: export-permission-missing
    label: The affected workspace is missing an export permission.
  - id: export-service-outage
    label: The export service is unavailable.
  - id: malformed-export-request
    label: The client sends an invalid export request.
evidence:
  - id: workspace-scope
    tool: user_scope
    cost: 1
    relevance: critical
    unlock_after: []
    content:
      kind: table
      columns: [workspace, result]
      rows:
        - { workspace: affected, result: denied }
        - { workspace: comparison, result: successful }
    explanation: The comparison confines the failure to one workspace.
red_herrings:
  pool:
    - id: recent-client-update
      label: The client library was updated yesterday.
      explanation: Both workspaces use the same fictional client version.
  choose: 1
remediation:
  choices:
    - id: restore-export-permission
      label: Restore the approved export permission.
      phase: immediate
      quality: correct
      explanation: This repairs the scoped authorization failure.
communication:
  choices:
    - id: share-scoped-update
      message: The service is available; we isolated the failure to one workspace and are reviewing its export access. We will update you in 30 minutes.
      quality: excellent
      explanation: It states verified scope, next action, and timing.
    - id: share-vague-update
      message: We are investigating and will reply later.
      quality: acceptable
      explanation: It acknowledges the issue but omits useful detail.
debrief:
  root_cause_explanation: The workspace lacked the permission required to export.
  evidence_chain: [workspace-scope]
  efficient_path:
    - { kind: framework_step, ref: determine-scope }
    - { kind: evidence, ref: workspace-scope }
  transferable_lesson: Compare affected and working scopes before assuming a shared outage.
```
