# Milestone 5 Investigation UI Design

Date: 2026-09-28

## Purpose

Milestone 5 turns the existing deterministic scenario and investigation engines
into the first playable browser experience. The vertical slice is
`IAM-001 — Login works, feature does not`.

The milestone includes:

- an incident introduction;
- a responsive investigation workspace;
- evidence-tool discovery and evidence viewing;
- bookmarks and hypothesis selection;
- a case notebook and investigation trail;
- an optional budget display; and
- a reversible “Ready to diagnose” checkpoint.

The milestone stops before diagnosis submission and scoring. Those remain
Milestone 6 work.

## Constraints

- The application remains a statically deployable React, TypeScript, and Vite
  application.
- Scenario YAML remains separate from React components.
- The UI uses the Milestone 4 engine for all investigation facts and commands.
- The UI never renders evidence relevance, evidence explanations, root cause,
  remediation quality, communication quality, or debrief content during an
  investigation.
- IAM-001 is the only playable scenario guaranteed by this milestone.
- There is no backend, authentication, database, hosted AI dependency, API key,
  persistence, timer, or global state library.
- Refreshing or revisiting the route creates a fresh investigation. Versioned
  local persistence remains Milestone 8 work.
- Accessibility and responsive behavior are acceptance requirements.

## Architecture

The playable route uses a generated scenario catalog and the existing pure
engine boundary:

```text
/scenarios/iam-001
        ↓
load generated scenario → compose with canonical seed
        ↓
incident intro → Begin investigation
        ↓
React controller sends commands to the pure investigation engine
        ↓
safe selectors produce active-investigation evidence views
```

React owns transient presentation state only:

- the selected evidence ID;
- the active mobile workspace tab;
- the latest accessible interaction error; and
- whether the user is viewing the reversible ready-to-diagnose checkpoint.

The investigation engine remains the sole owner of status, opened evidence,
bookmarks, hypothesis selection and history, action history, and optional
budget balance.

## Generated playable catalog

The scenario command will continue to validate all YAML documents before
generation. A successful `generate` command will atomically produce two
deterministic artifacts:

1. the existing browse-safe scenario index; and
2. a typed generated TypeScript catalog containing validated scenario source
   data for static application use.

The generated catalog avoids browser-side YAML parsing and does not add a
runtime fetch. Its output order follows the existing deterministic source-file
order. The generator will avoid rewriting unchanged artifacts.

The scenario browser continues to consume only the browse-safe index. The
investigation feature imports the playable catalog through a small loader.
Although a static application cannot make bundled solution data secret, the
active UI boundary must expose only the safe Milestone 4 selector projections.

## Route and scenario loading

The application adds `/scenarios/:scenarioId` beneath the existing shell.

The feature loader accepts a route ID and returns a typed available or
unavailable result. For Milestone 5, only `iam-001` is playable. Unknown or
unavailable IDs render a recovery view with a link back to the scenario
browser; they do not throw into React.

IAM-001 is composed with a stable canonical seed derived from its ID and
version. This makes the vertical slice reproducible without adding seeded URL
behavior, which remains later work. The session start timestamp is supplied by
the UI boundary when it initializes the engine; the engine never reads the
clock itself.

The landing-page primary CTA routes directly to IAM-001 for this milestone. It
does not claim to randomize across unfinished playable scenarios. The scenario
browser replaces its empty placeholder with one IAM-001 card sourced from the
safe generated index. Non-functional filters are removed until multiple
playable scenarios make filtering useful.

## Incident introduction

Before investigation begins, the route presents an incident introduction with:

- incident ID and title;
- fictional customer name;
- severity and estimated time;
- symptom and business impact;
- customer context;
- the unique investigation tools available in the scenario;
- the starting budget when one is authored; and
- a “Begin investigation” button.

The introduction must not reveal solution data or evidence content. Beginning
the incident dispatches `begin_investigation` and replaces the introduction
with the workspace on the same route.

## Investigation workspace

### Desktop

Desktop uses the product design’s three-region layout:

1. Investigation tools
2. Evidence viewer
3. Case notebook

The persistent incident header shows the title, customer, business impact,
opened-evidence progress, and optional remaining budget. It does not show a
score because scoring does not exist until Milestone 6.

### Mobile

Mobile presents Tools, Evidence, and Notebook as an accessible tab set. The
tabs retain the same investigation and selected-evidence state. Opening
evidence moves the active tab to Evidence. Tab controls support click/touch,
Tab navigation, Home/End, and horizontal arrow keys. Panels use the required
tab and tabpanel relationships.

The layout must not overflow horizontally at 320px. No essential command may
be available only through hover.

## Investigation tools

The tool list is derived from `getInvestigationEvidenceViews` in authored
order. Every item displays a human-readable tool name and one of these states:

- **Locked:** disabled and content-free. Dependencies are not disclosed.
- **Available:** can be opened and shows its authored investigation cost.
- **Opened:** can be selected again without another engine command or cost.

Opening available evidence dispatches `open_evidence`. A successful first open
selects that evidence and moves mobile users to the Evidence tab. Selecting an
already-open item changes only transient view state and therefore preserves the
engine’s idempotent reopen behavior.

## Evidence viewer and renderers

The viewer shows an instructional empty state until evidence is opened. Opened
content is rendered from the safe selector result, never from the complete
scenario source record.

Milestone 5 provides reusable renderers for every currently valid evidence
content kind:

- text;
- status;
- key/value configuration;
- table; and
- timeline.

Renderers are selected by the content discriminant. They contain no
scenario-specific conditions or custom IAM-001 markup. Tables use semantic
headers and a scroll container that does not force page-level overflow.
Timelines use an ordered list with human-readable resolved timestamps.

The opened-evidence header includes a bookmark toggle. Bookmark changes are
sent through `bookmark_evidence` and `unbookmark_evidence` commands.

## Case notebook

The notebook encourages structured reasoning without inventing conclusions.
It contains:

- **Observations:** bookmarked evidence links that select the corresponding
  opened item;
- **Current hypothesis:** an accessible single-choice control built from the
  scenario’s authored hypotheses; and
- **Investigation trail:** a concise presentation of successful opened,
  bookmarked, unbookmarked, and hypothesis-selection actions.

Hypothesis changes dispatch `select_hypothesis`. The UI does not infer a
“questions answered” section because the current authored content and engine
do not define such findings.

## Ready-to-diagnose boundary

The workspace enables “Ready to diagnose” after the user selects a hypothesis.
Activating it opens an accessible checkpoint that summarizes:

- the selected hypothesis;
- bookmarked evidence; and
- investigation progress.

The checkpoint offers “Return to investigation.” It does not collect a root
cause, evidence submission, remediation, or customer message; change engine
status; calculate a score; expose correctness; or persist completion.

The checkpoint is the explicit Milestone 5 endpoint and the handoff to the
future Milestone 6 diagnosis flow.

## Error handling

Route loading returns an unavailable result for unsupported or missing
scenarios. The page renders recovery content rather than crashing.

Controls prevent known invalid commands by reflecting selector and engine
state. If a command unexpectedly raises `InvestigationTransitionError`, the
controller keeps the last valid state, displays a concise message, and
announces it through an assertive live region. Unexpected programming errors
are not silently converted into domain errors.

## Accessibility

- The incident, tools, evidence, and notebook areas use semantic landmarks or
  labelled regions.
- Locked, available, opened, and bookmarked states have textual labels and are
  not communicated by color alone.
- Mobile tabs implement standard keyboard behavior and focus management.
- After evidence is first opened, focus moves to the evidence heading.
- Tables have column headers; timelines use ordered lists.
- Buttons and hypothesis controls have explicit accessible names.
- Existing skip navigation, visible focus, contrast, and reduced-motion
  behavior remain intact.
- The ready checkpoint receives programmatic focus and can return focus to the
  triggering control.

## Testing

### Generator and loader tests

- generation emits deterministic safe-index and playable-catalog artifacts;
- unchanged outputs are not rewritten;
- validation failures write neither artifact;
- IAM-001 loads and composes with the canonical seed; and
- unknown or unsupported IDs return an unavailable result.

### Component and interaction tests

- the incident intro renders without hidden solution data;
- beginning creates the workspace;
- dependency unlocking and budget display follow the engine;
- all five evidence content kinds render through reusable renderers;
- opening and selecting evidence behave differently as designed;
- bookmarks and hypotheses update the notebook;
- hidden evidence metadata and solution data never render;
- mobile tabs support mouse/touch and keyboard interaction;
- unexpected transition errors preserve the previous state and are announced;
  and
- the ready checkpoint is reachable, summarizes the investigation, and can be
  left without submission or scoring.

### End-to-end checks

- the landing CTA reaches IAM-001;
- the browser card reaches IAM-001;
- IAM-001 can be investigated from intro to the ready checkpoint on desktop;
- the mobile tab flow works without horizontal overflow;
- the investigation route loads directly under the static deployment base;
  and
- existing landing, navigation, accessibility, and responsive tests continue
  to pass.

The completion gate includes linting, formatting, all unit and Node tests,
scenario validation, the production build, Playwright, generated-artifact
drift checks, and a clean working tree.

## Important complexity controls

- Generate one catalog through the existing CLI; do not add a content service
  or second validation implementation.
- Keep controller state local to the feature; do not add a global state
  library.
- Render by evidence content kind; do not create scenario-specific components.
- Do not infer findings, dependencies, or correctness in React.
- Do not add animation systems, timers, undo/redo, free-form notes, budget
  configuration, persistence, or seeded-route infrastructure.
- Preserve the existing engine API unless a demonstrated UI requirement
  exposes a narrow missing selector.

## Explicit exclusions

- diagnosis submission and evidence selection for scoring;
- remediation and customer communication choices;
- scoring, partial credit, and efficiency grades;
- debrief and explanation disclosure;
- persistence, progress, achievements, and migrations;
- seeded/shareable routes and daily challenges;
- random selection across multiple playable scenarios;
- full scenario-browser filtering;
- gameplay for FND-001 or other scenarios; and
- Milestone 6 or later behavior.
