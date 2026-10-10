# Milestone 10 — Content Expansion Design

## Status

Approved for specification review on 2026-10-10.

## Scope

Milestone 10 expands SaaS Failure Lab from its existing IAM-001 playable
scenario to the recommended 12-scenario beta catalog. It also adds two
developer-only, deterministic authoring aids: a Scenario Inspector and a
Scoring Simulator.

The milestone includes these additional YAML scenarios:

- FND-001, FND-002, FND-003;
- API-001, API-002, API-004;
- IAM-004;
- INT-001, INT-004;
- DAT-003; and
- WEB-001.

Together with IAM-001, this provides twelve playable scenarios across
fundamentals, APIs, identity, integrations, data, and browser domains.

## Content architecture

Each scenario remains a standalone YAML file in `content/scenarios/`. YAML is
the only authored content source. The existing parsing, semantic validation,
and deterministic generation pipeline remains authoritative and continues to
produce both the public browse-safe index and typed playable catalog.

The new scenarios must use the current schema and existing evidence renderers:
text, status, key-value, table, and timeline. A scenario may combine those
shapes, but the milestone does not introduce a second content format or widen
the schema merely to make an individual case more ornate. All names, systems,
data, and incident records remain fictional.

Every scenario contains a realistic report, business impact, at least three
plausible hypotheses, evidence sufficient to establish the root cause, safe
remediation choices, communication choices, a debrief, and a transferable
lesson. Hidden answer material stays out of the public browse index and is not
shown in active gameplay before completion.

## Developer-only tools

Two static routes provide local authoring aids. They are deliberately absent
from public navigation, the landing page, and the scenario browser.

### Scenario Inspector

The inspector selects a validated generated scenario and presents its authored
metadata, variation pools, evidence dependency graph, hidden answer/debrief
structure, and composition preview. It is a local review tool; it does not
edit YAML, write browser storage, use a backend, or make network requests.

Unknown or unavailable scenario IDs produce a clear recovery state instead of
throwing. Inspector output may include hidden material because it is explicitly
developer-only, but no public route links to it.

### Scoring Simulator

The simulator selects an authored scenario and deterministic answer inputs,
then displays the existing scoring engine's breakdown. It delegates to the
same pure engine functions used by completed gameplay; React contains no
parallel scoring logic.

Invalid IDs or impossible selections produce explanatory validation states.
The simulator is read-only, has no persistence, and sends no network traffic.

## Public-product behavior

The public scenario browser, seeded scenario routes, Daily Incident, progress,
and sharing stay architecturally unchanged. They automatically receive the
expanded playable catalog through the generated artifacts. Daily selection
continues to operate only on currently playable scenarios, and share links
continue to recreate the precise scenario/seed combination without revealing
answers.

GitHub Pages deployment remains static: the new tools, catalog, validation,
and generation all run from committed browser assets and repository scripts.
No backend, authentication, database, hosted AI, telemetry, API key, or new
infrastructure is added.

## Validation and testing

The expanded catalog is covered by the existing schema and semantic validation
rules: valid IDs and filenames, unique nested identifiers, safe templates,
valid evidence dependencies, no cycles, valid debrief references, required
remediation/communication quality options, and direct public-answer-leak
checks. Additional validation will be added only for concrete, repeatable
authoring errors found while implementing the catalog.

Tests must establish:

- all twelve scenario documents validate and generate deterministically;
- catalog/domain counts reflect the beta set;
- generated artifacts stay synchronized with YAML sources;
- each scenario composes deterministically for a fixed seed;
- Inspector rendering, unavailable recovery, and semantic navigation work;
- Simulator validation and score output match the pure gameplay scoring
  engine; and
- the expanded public browser and relevant direct routes continue to work on
  the GitHub Pages subpath.

Final verification includes unit tests, linting, formatting, scenario
validation, generation-drift checks, production build, and browser end-to-end
tests. The tools and public UI must remain keyboard usable and reflow without
horizontal overflow at 320 CSS pixels.

## Deferred scope

Milestone 10 does not add a content-management system, visual YAML editor,
cloud storage, collaborative authoring, user accounts, import/export, AI
generation, API integrations, new scoring rules, leaderboard behavior, or
publicly promoted authoring screens. A richer authoring environment can be
considered later if manual YAML authoring becomes a demonstrated constraint.

## Important decisions

- Build the recommended 12-scenario beta catalog, not the entire 24-scenario
  v1 catalog, to retain focused review and verification.
- Keep Inspector and Simulator developer-only and unlinked from public
  navigation.
- Reuse current schema, renderers, generation, and pure scoring rather than
  introducing speculative generalized infrastructure.
- Preserve static deployment and the boundary between public browse content
  and hidden scenario truth.
