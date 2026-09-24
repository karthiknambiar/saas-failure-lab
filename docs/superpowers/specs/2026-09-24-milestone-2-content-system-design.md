# Milestone 2 — Content System Design

**Status:** Approved for implementation planning  
**Date:** 2026-09-24  
**Scope:** Scenario schema, YAML parsing, semantic validation, normalization, build integration, and the first two scenario definitions

## Goal

Create a contributor-friendly scenario content pipeline that validates authored YAML at build and CI time, produces a deterministic browser-safe scenario index, and preserves the application's static deployment model.

Milestone 2 ends when `iam-001` and `fnd-001` pass the content contract and invalid content reliably blocks validation, CI, and production builds. It does not add scenario browsing integration, composition, gameplay, scoring, or evidence rendering.

## Chosen approach

Use a standalone build-time content pipeline:

```text
content/scenarios/*.yaml
          │
          ▼
 YAML parser → Zod schema → semantic validator
                              │
                              ├─ duplicate-ID checks
                              ├─ reference checks
                              ├─ dependency-cycle checks
                              └─ answer/content safeguards
                                          │
                                          ▼
                      src/generated/scenario-index.json
                                          │
                                          ▼
                               static Vite application
```

This approach keeps scenario content separate from React, provides a clear contributor command, and fails before invalid content reaches the browser. A Vite virtual-module plugin would couple validation to the bundler, while runtime YAML parsing would increase the client bundle and defer authoring errors until runtime.

## Architecture and boundaries

The content system has five responsibilities:

1. **Source schema:** Zod validates the structure and primitive constraints of one parsed YAML document.
2. **Parsing:** A filesystem-free parser converts YAML text into a validated source document and preserves useful error context.
3. **Semantic validation:** Pure collection-level functions validate identifiers, references, dependency graphs, and cross-field invariants.
4. **Normalization:** Pure functions convert contributor-facing `snake_case` source data into stable `camelCase` application data.
5. **CLI boundary:** A small Node script discovers files, reads source text, aggregates developer errors, and writes generated output.

React does not own or import validation behavior. Filesystem access remains outside the reusable schema and validation modules.

### Static deployment

The production build generates scenario data before TypeScript and Vite compile the application. Vite continues to emit only static assets. No server, database, API endpoint, authentication layer, or runtime YAML parser is introduced.

## Scenario identity

Canonical scenario IDs and filenames are lowercase and URL-safe, such as `iam-001` and `fnd-001`. The filename must match the scenario ID. Product surfaces may display IDs in uppercase without changing their canonical value.

Scenario IDs are compared case-insensitively when checking duplicates.

## Authored scenario contract

Each scenario contains:

- identity and metadata;
- learning concepts and objectives;
- fictional customer context;
- a public incident brief and symptom variants;
- a hidden root cause;
- plausible hypotheses;
- evidence records and unlock dependencies;
- explicitly tagged red herrings;
- structured remediation choices;
- structured customer-communication choices;
- debrief content and an efficient investigation path.

The first two authored scenarios are:

- `iam-001` — Login works, feature does not;
- `fnd-001` — One user cannot access a feature.

`iam-001` is the required first vertical-slice scenario. `fnd-001` provides a simpler scenario in a second domain and exercises the contract without adding a second complex gameplay design.

### Evidence

Evidence content uses a discriminated union. Milestone 2 defines only the evidence kinds required by the first two scenarios:

- text note;
- status;
- key/value configuration;
- table;
- timeline.

Each evidence item contains an ID, supported tool ID, cost, internal relevance, optional unlock dependencies, typed content, and a post-completion explanation.

The supported-tool registry is a single content-layer constant shared by schema and semantic validation. New evidence kinds and tools are added when a scenario or renderer requires them, not speculatively.

### Correctness data

The content contract identifies:

- the hypothesis corresponding to the root cause;
- remediation choices and their correctness quality;
- communication choices and their quality;
- the recommended evidence/action path.

Efficient-path entries are explicit references shaped as either a standard troubleshooting-framework step or an evidence ID. This avoids ambiguous free-form strings and lets validation distinguish an intentionally generic step such as `establish-scope` from a missing evidence record.

Milestone 2 stores these authored facts but does not define score weights, partial-credit formulas, engine state, or submission behavior.

## Validation

Zod validates document shape, required fields, enums, patterns, non-empty collections, and primitive ranges. Semantic validation handles relationships that are awkward or impossible to express clearly in a structural schema.

Semantic validation enforces:

- unique scenario IDs across the collection, case-insensitively;
- unique hypothesis, evidence, choice, and red-herring IDs within a scenario;
- a root cause that corresponds to a selectable hypothesis;
- evidence tools from the supported-tool registry;
- unlock references to known evidence;
- no self-reference or circular evidence dependency;
- a red-herring selection count no greater than its pool;
- at least one correct immediate remediation;
- at least one excellent communication choice;
- efficient-path references to known actions or evidence;
- populated learning objectives and debrief content;
- matching source filename and scenario ID;
- no direct repetition of the root-cause ID or full hypothesis label in public symptom text.

The public-answer check is intentionally narrow. It detects explicit answer disclosure without attempting speculative natural-language analysis.

### Developer errors

Validation collects all actionable errors in one run rather than stopping after the first file. Errors include the source filename and a field path or relationship description:

```text
content/scenarios/iam-001.yaml
  evidence[3].unlock_after[0]: unknown evidence "auth-event"
  evidence: dependency cycle detected: role-config → audit-log → role-config
```

YAML syntax failures, Zod issues, semantic issues, and collection-level duplicate errors share the same formatted reporting path. Any error produces a nonzero CLI exit status.

## Normalized output

Normalization produces stable `camelCase` application records. Scenario files and all nested records are sorted deterministically where source order is not meaningful.

The generated `src/generated/scenario-index.json` contains only browse-safe fields:

- ID;
- title;
- domain;
- difficulty;
- estimated minutes;
- concepts;
- public symptom summary.

It excludes root causes, correctness keys, evidence content and relevance, remediation answers, communication quality, and debrief content. This keeps browser-listing code from accidentally exposing answers before gameplay.

The generated index is committed. Generation writes only when serialized output changes, enabling review and drift detection. CI verifies that regeneration leaves the working tree unchanged.

Full validated scenario definitions remain available through the parser and normalizer for future engine work but are not added to the browser index in this milestone.

## Commands and build flow

- `npm run validate:scenarios` parses and validates without writing.
- `npm run generate:scenarios` validates and writes the deterministic index.
- `npm run build` generates the index before TypeScript and Vite.
- CI runs scenario validation as an explicit named gate.
- Deployment continues to upload only the static `dist` directory.

Dependencies are limited to:

- `zod` for the scenario contract;
- `yaml` for build-time parsing;
- `tsx` as a development-only TypeScript script runner.

## Planned files

```text
content/
  scenarios/
    iam-001.yaml
    fnd-001.yaml

src/
  content/
    scenario-schema.ts
    scenario-types.ts
    scenario-tools.ts
    parse-scenario.ts
    validate-scenarios.ts
    normalize-scenario.ts
    scenario-content.test.ts
  generated/
    scenario-index.json

scripts/
  scenario-cli.ts

docs/
  scenario-authoring.md
  superpowers/specs/2026-09-24-milestone-2-content-system-design.md
```

Expected existing-file updates:

```text
package.json
package-lock.json
.github/workflows/ci.yml
docs/architecture.md
README.md
```

The implementation plan may split tests by responsibility when that makes failures clearer; the module boundaries above remain authoritative.

## Testing strategy

Tests cover:

- valid YAML parsing;
- YAML syntax failures with filenames;
- Zod failures with readable field paths;
- source-to-application naming normalization;
- deterministic index ordering;
- duplicate scenario and nested IDs;
- unknown tools and evidence dependencies;
- self-references and multi-node dependency cycles;
- missing correct hypotheses, remediations, or communication choices;
- invalid red-herring selection;
- narrow public answer-leak checks;
- both real scenario files passing the complete contract;
- generated index omission of all hidden answer data;
- CLI failure status for invalid content.

Milestone completion runs:

```text
npm run format:check
npm run lint
npm test
npm run validate:scenarios
npm run build
npm run test:e2e
```

The implementation also demonstrates that temporarily invalid content fails validation and that clean regeneration produces no Git diff.

## Explicit non-goals

Milestone 2 does not implement:

- seeded variation or random composition;
- investigation state or runtime evidence unlocking;
- scoring formulas;
- evidence renderer components;
- scenario browsing integration;
- development inspector routes;
- schema migration machinery;
- plugin/provider abstractions;
- all evidence kinds in the long-term product design;
- any backend, database, authentication, or hosted AI dependency.

## Stop condition

Stop when the content pipeline is deterministic, both initial scenarios pass, invalid content blocks CI and builds with actionable errors, the committed public index is current, documentation explains the contributor workflow, and all existing quality gates pass. Do not begin Milestone 3 or expose scenario content through new UI routes.
