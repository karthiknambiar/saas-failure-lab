# Milestone 4: Investigation Engine Design

**Date:** 2026-09-25
**Status:** Approved

## Objective

Milestone 4 adds the framework-independent state machine used to investigate a
composed scenario. It delivers:

- explicit investigation state;
- evidence-tool availability and dependency unlocking;
- evidence opening;
- evidence bookmarks;
- hypothesis selection and changes;
- successful action history; and
- optional investigation budgets.

The milestone does not add the investigation UI, diagnosis submission,
scoring, persistence, or debrief behavior.

## Constraints

- The application remains a statically deployable Vite application.
- Investigation behavior is synchronous, immutable, and deterministic for the
  same scenario instance, initial inputs, and command sequence.
- The engine has no React, DOM, storage, filesystem, network, current-clock, or
  random-number dependency.
- React will consume safe engine projections rather than own transition rules.
- Hidden root-cause, relevance, explanation, and debrief data must not be
  exposed by active-investigation selectors.
- Scenario content remains separate from components.
- No backend, authentication, database, hosted AI, or browser secret is added.

## Selected approach

Use one pure command reducer with derived selectors.

The alternatives considered were:

1. Separate mutation functions for each interaction. This begins simply but
   duplicates status, identity, history, and error handling.
2. A fully event-sourced model that rebuilds state from an event stream. This
   is flexible but introduces replay and event-versioning complexity not needed
   for the local v1 simulator.

The command reducer keeps transition rules centralized while storing only
durable investigation facts. Evidence availability and UI-safe tool views are
derived rather than duplicated in state.

## Architecture

```text
ScenarioInstance + explicit startedAt
               |
               v
createInvestigation()
               |
               v
InvestigationState
               |
               +-- applyInvestigationCommand() --> new InvestigationState
               |
               +-- safe selectors -------------> active-investigation views
```

`createInvestigation()` and `applyInvestigationCommand()` are plain TypeScript
functions. They never mutate the scenario instance, input state, commands, or
nested values owned by callers.

## Optional authored budget

`ScenarioSource` gains one optional top-level property:

```yaml
investigation_budget: 100
```

When present, it is a positive integer. It is intentionally a scalar rather
than a configuration object because Milestone 4 needs only a starting balance.
The property flows through `ResolvedScenario` via its existing source-derived
type.

The two current scenarios are beginner scenarios and omit the property. Their
investigation state therefore has `budgetRemaining: undefined`, and opening
evidence does not create budget pressure. Synthetic tests exercise enabled
budgets.

## State model

```ts
interface InvestigationState {
  scenarioId: string
  scenarioVersion: number
  seed: string
  startedAt: number
  status: 'intro' | 'investigating'
  openedEvidenceIds: string[]
  bookmarkedEvidenceIds: string[]
  selectedHypothesisId?: string
  hypothesisHistory: Array<{
    hypothesisId: string
    atAction: number
  }>
  actions: InvestigationAction[]
  budgetRemaining?: number
}
```

`startedAt` is supplied by the caller so tests and future UI code control the
clock boundary. It must be a finite, non-negative integer. The engine does not
call `Date.now()`.

State begins with status `intro`, empty evidence/bookmark/history collections,
no selected hypothesis, no actions, and the authored budget when one exists.
Submission-related states remain Milestone 6 work.

## Commands

The engine accepts a discriminated command union:

```ts
type InvestigationCommand =
  | { type: 'begin_investigation' }
  | { type: 'open_evidence'; evidenceId: string }
  | { type: 'bookmark_evidence'; evidenceId: string }
  | { type: 'unbookmark_evidence'; evidenceId: string }
  | { type: 'select_hypothesis'; hypothesisId: string }
```

Every state-changing command appends one action. The engine assigns a one-based
`sequence` equal to the resulting action-history length. Callers do not supply
sequence numbers or timestamps.

Action entries use the same discriminants as commands and include their target
ID. An `open_evidence` action also records the evidence cost. This is sufficient
for later efficiency scoring without introducing scoring behavior now.

## Transition rules

### Begin investigation

- Valid only from `intro`.
- Changes status to `investigating`.
- Records one `begin_investigation` action.
- A second begin command fails rather than silently creating duplicate history.

### Open evidence

- Valid only while `investigating`.
- The evidence ID must exist in the composed scenario.
- Evidence with an empty `unlock_after` list is immediately available.
- Evidence with dependencies is available only when every dependency ID is in
  `openedEvidenceIds`.
- Locked evidence cannot be opened and does not reveal its content.
- The first opening appends the evidence ID in investigation order, records one
  action, and deducts its cost when a budget is enabled.
- When no budget is enabled, cost remains authored metadata but no balance is
  tracked or checked.
- If the enabled balance is lower than the evidence cost, the command fails
  without opening evidence, deducting points, or appending history.
- Reopening already-open evidence returns the original state reference. It is a
  view operation, incurs no cost, and records no duplicate action.

### Bookmark evidence

- Valid only while `investigating`.
- Only opened evidence can be bookmarked.
- Bookmarking appends the ID in bookmark order and records one action.
- Bookmarking an already-bookmarked item returns the original state reference.
- Unbookmarking removes the ID and records one action.
- Unbookmarking an item that is not bookmarked returns the original state
  reference.
- Rebookmarking after removal appends the ID at the end of bookmark order.

### Select hypothesis

- Valid only while `investigating`.
- The hypothesis ID must exist in the composed scenario.
- A new selection records one action, updates `selectedHypothesisId`, and
  appends `{ hypothesisId, atAction: sequence }` to hypothesis history.
- Selecting the already-current hypothesis returns the original state reference
  and records nothing.
- The engine does not evaluate correctness in this milestone.

## Identity and atomicity

Every transition and selector verifies that the state identity matches the
scenario instance by ID, version, and normalized seed. A mismatch fails before
reading or changing investigation details.

All transitions are atomic. Validation and budget checks happen before a new
state is constructed. A rejected command never returns a partially updated
state and never mutates inputs.

## Evidence and tool selectors

`getInvestigationEvidenceViews(instance, state)` returns entries in authored
evidence order with this public shape:

```ts
interface InvestigationEvidenceView {
  id: string
  tool: ScenarioTool
  cost: number
  state: 'locked' | 'available' | 'opened'
  content?: ScenarioInstanceEvidence['content']
}
```

Content exists only for opened evidence. The projection never includes:

- `relevance`;
- the hidden evidence explanation;
- `unlock_after` dependencies;
- root-cause data; or
- debrief content.

The selector returns fresh projection objects so consumer mutation cannot alter
the scenario instance or investigation state.

`getAvailableEvidenceIds(instance, state)` exposes the smaller derived ID list
needed by tests and future orchestration. It includes available, not-yet-opened
evidence in authored order. Opened and locked evidence are excluded.

Hypothesis labels are already authored public choices, but Milestone 4 does not
add a general scenario-view projection. The future UI must use deliberate safe
selectors rather than passing the complete `ScenarioInstance` through
presentation components.

## Error model

`InvestigationTransitionError` is engine-owned and has a stable code union:

- `INVALID_STARTED_AT`;
- `SCENARIO_STATE_MISMATCH`;
- `INVALID_STATUS`;
- `UNKNOWN_EVIDENCE`;
- `EVIDENCE_LOCKED`;
- `INSUFFICIENT_BUDGET`;
- `EVIDENCE_NOT_OPENED`;
- `UNKNOWN_HYPOTHESIS`.

Messages include the scenario and offending target where relevant. Idempotent
commands described above are successful no-ops, not errors.

Selectors use the same `SCENARIO_STATE_MISMATCH` error. They do not expose
partial results when identity validation fails.

## File plan

New engine files:

```text
src/engine/
  investigation-state.ts
  investigation-engine.ts
  investigation-engine.test.ts
  investigation-selectors.ts
  investigation-selectors.test.ts
```

Updated content and documentation:

```text
src/content/scenario-schema.ts
src/content/scenario-schema.test.ts
src/content/test-fixtures.ts
docs/scenario-authoring.md
docs/architecture.md
```

The existing scenario YAML files remain unchanged because their beginner
difficulty intentionally has no budget pressure.

## Test strategy

State and transition tests cover:

- deterministic initialization with an explicit start time;
- invalid start times;
- intro-to-investigating transition and status guards;
- state/scenario identity matching;
- immediate evidence availability;
- single- and multi-dependency unlocking;
- unknown and locked evidence errors;
- first-open ordering;
- idempotent reopening by reference;
- budget-disabled opening;
- budget deduction, exact exhaustion, and insufficient-budget atomicity;
- bookmark, duplicate bookmark, unbookmark, and unopened-evidence behavior;
- hypothesis selection, changes, idempotence, unknown IDs, and `atAction`
  sequencing;
- action-history contents and sequence numbering; and
- input state and scenario-instance isolation.

Selector tests cover:

- locked, available, and opened states;
- opened-only content;
- authored output order;
- safe output keys;
- absence of relevance, explanations, dependencies, root cause, and debrief;
- fresh projection/content isolation; and
- scenario/state identity mismatch.

Content tests cover omitted budgets, valid positive integer budgets, and
rejection of zero, negative, and fractional budgets.

The final milestone gate runs linting, formatting, all unit and component tests,
scenario validation, the production build, and existing browser regression
tests. No new browser test is needed because Milestone 4 has no UI behavior.

## Static deployment and dependency impact

The state machine and selectors are ordinary TypeScript compiled by the
existing toolchain. They add no dependency, runtime service, environment
variable, secret, worker, database, or storage mechanism. Static deployment is
unchanged.

## Explicit exclusions

- investigation React views and routes;
- diagnosis submission;
- remediation and communication selection;
- correctness evaluation and scoring;
- debrief and explanation disclosure;
- persistence and migrations;
- timers or elapsed-time scoring;
- undo, redo, and event replay;
- free-form notes or questions;
- tool-specific custom command types;
- budget configuration UI; and
- Milestone 5 or later behavior.

Those remain later milestone work unless the product source of truth changes.
