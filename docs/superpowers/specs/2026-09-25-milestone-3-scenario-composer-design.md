# Milestone 3: Deterministic Scenario Composer Design

**Date:** 2026-09-25  
**Status:** Approved

## Objective

Milestone 3 adds a framework-independent composer that turns a validated authored
scenario and a seed into a reproducible scenario instance. It delivers only the
variation foundation required by the milestone contract:

- deterministic seed handling;
- fictional customer-name selection;
- timestamp variation;
- surface-symptom selection;
- red-herring selection; and
- deterministic tests.

The milestone does not add gameplay, investigation state, scoring, persistence,
share links, daily challenges, or React integration.

## Constraints

- The application remains a statically deployable Vite application.
- Composition is local, synchronous, and deterministic.
- The engine has no React, DOM, filesystem, network, clock, or random-number
  runtime dependencies.
- Scenario content remains separate from components.
- Authored root causes, symptoms, and evidence are never combined arbitrarily.
- Only explicitly declared fields may vary.
- The same scenario ID, version, and seed produce exactly the same instance.
- No backend, authentication, database, hosted AI, or browser secret is added.

## Selected approach

Use explicit authored variation fields and a small pure TypeScript composer.
Scenario authors declare valid customer names and timestamp offsets. Customer
context uses a single supported `{{customerName}}` token, while timeline values
use structured day-and-clock data rather than embedded strings that resemble
times.

This is preferred over two alternatives:

1. Generic recursive templating would reduce authoring structure but could
   rewrite unintended text and make permitted variation hard to audit.
2. Fully authored complete variants would be predictable but would duplicate
   content and grow combinations exponentially.

## Composition flow

```text
validated ScenarioSource
        +
normalized seed
        |
        v
dimension-specific deterministic selections
  - customer name
  - symptom variant
  - timestamp offset
  - red-herring subset
        |
        v
source-isolated ScenarioInstance
```

The composer accepts an already validated `ScenarioSource`. Parsing, filesystem
discovery, and schema error aggregation remain owned by the content boundary.

## Source contract changes

Each source scenario gains an explicit variations block:

```yaml
variations:
  customer_names:
    - Northstar Components
    - Meridian Fabrication
  timestamp_offsets_minutes:
    - 0
    - 17
    - 43
```

Both arrays are non-empty. Customer names are non-empty strings. Timestamp
offsets are integer minutes from `-180` through `180`, inclusive, so an author
cannot accidentally shift events by an unreasonable amount. Timeline
`day_offset` values are integers from `-365` through `365`, inclusive. These
bounds are enforced by the schema and documented in the authoring guide.

Customer context may contain the exact token `{{customerName}}`:

```yaml
customer_context:
  - '{{customerName}} is a fictional manufacturer using role-based access.'
```

The content validator rejects unknown `{{...}}` tokens. This intentionally does
not introduce a general-purpose template language.

Timeline events replace display-oriented time strings with structured values:

```yaml
time:
  day_offset: 0
  clock: '09:02'
```

`day_offset` is relative to the incident day and `clock` is strict 24-hour
`HH:mm`. The composer applies one selected offset to all structured timestamps,
including day rollover, which preserves the authored temporal distance and
ordering between events. Formatting is deterministic and independent of locale,
timezone, and the current date:

- `0` becomes `Today HH:mm`;
- `-1` becomes `Previous day HH:mm`;
- other negative offsets become `N days ago HH:mm`;
- positive offsets become `N days later HH:mm`.

The current red-herring source contract remains authoritative: `pool` contains
the valid candidates and `choose` states how many are selected. Milestone 3
selects the subset for the instance; it does not yet decide how investigation
tools expose those selections.

## Seed contract

The public seed input is a string. It is trimmed, must remain non-empty, and may
contain at most 128 JavaScript string code units. The normalized trimmed value
is stored on the instance. Invalid seed input returns a typed composition error
rather than falling back to nondeterministic behavior.

The implementation uses fixed, documented local hash and pseudorandom-selection
algorithms. It never calls `Math.random()` or `Date.now()` and adds no package.

Every variation dimension derives an independent stream from stable input:

```text
scenario ID | scenario version | normalized seed | dimension name
```

For example, customer selection and timestamp selection do not consume values
from a shared mutable generator. Adding a future permitted dimension therefore
does not reshuffle existing dimensions for the same scenario version and seed.

Algorithm choice and constants are part of the reproducibility contract. Tests
pin representative outputs so accidental algorithm changes are visible.

## Scenario instance

`ScenarioInstance` is a domain value returned by the engine. It contains:

- scenario ID and version;
- the normalized seed;
- selected customer name;
- rendered customer context;
- selected symptom;
- timestamp-adjusted evidence;
- selected red herrings; and
- the remaining authored investigation and resolution data unchanged in value.

The source's `variations` configuration is not copied into the instance. The
composer creates fresh arrays and nested objects for values it returns, so
mutating an instance cannot mutate the validated source and composing does not
mutate its input. The returned object is not recursively frozen; isolation is
the guarantee, avoiding a runtime mechanism that the milestone does not need.

Milestone 3 does not add a public browser projection or React consumption. A
later gameplay boundary can expose only the appropriate public portion while
keeping solution and scoring decisions inside engine APIs. Because v1 has no
backend, hidden solution data will ultimately exist in static client assets;
the architectural goal is separation of responsibilities, not secrecy from a
determined browser user.

## Selection behavior

- Single-choice dimensions use a stable index derived from their named stream.
- Red herrings use deterministic selection without replacement.
- The selected red-herring result preserves source order, making rendering and
  snapshots stable independently of the internal sampling order.
- A `choose` value of zero produces an empty selection.
- Existing semantic validation continues to reject `choose` values larger than
  the pool.
- Empty required variation pools fail source validation rather than composition.

Different seeds are not required to produce a unique instance for every value;
finite choice sets necessarily permit collisions. Acceptance tests instead use
known seeds that exercise different selections and prove that only declared
fields change.

## Error handling

Composition can fail only for input that bypassed or no longer satisfies the
validated contract, including an invalid seed or an impossible selection. Such
failures use an engine-owned typed error with a stable code and useful message.
No fallback randomness or partial instance is returned.

Schema and semantic authoring failures remain content-validation errors and
continue to block CI and production builds.

## File plan

New engine files:

```text
src/engine/
  seed.ts
  seed.test.ts
  scenario-instance.ts
  compose-scenario.ts
  compose-scenario.test.ts
```

Updated content and documentation:

```text
src/content/scenario-schema.ts
src/content/scenario-schema.test.ts
src/content/validate-scenarios.ts
src/content/validate-scenarios.test.ts
src/content/test-fixtures.ts
content/scenarios/iam-001.yaml
content/scenarios/fnd-001.yaml
docs/scenario-authoring.md
docs/architecture.md
```

The implementation may update another directly affected existing test when the
schema shape requires it, but it will not create UI, storage, routing, or
deployment infrastructure.

## Test strategy

Seed utility tests cover:

- normalization and invalid inputs;
- fixed representative outputs;
- stable named streams; and
- deterministic bounded selection.

Composer tests cover:

- identical source and seed produce deeply equal instances;
- representative different seeds change one or more permitted fields;
- invariant fields remain deeply equal across seeds;
- source input remains unchanged;
- customer tokens are rendered;
- timestamps shift together and roll across day boundaries correctly;
- red-herring selection is deterministic, unique, correctly sized, and returned
  in source order; and
- zero red herrings is valid.

Content tests cover the new schema, unknown template tokens, malformed clocks,
timestamp bounds, and both real scenarios composing successfully across a small
fixed seed matrix.

The final milestone gate runs linting, all unit/component tests, scenario
validation, and the production build. Existing browser tests are run if the
repository's standard verification command includes them; no new browser test
is needed because this milestone has no UI behavior.

## Static deployment and dependency impact

The engine is ordinary TypeScript compiled by the existing Vite toolchain. YAML
continues to be parsed only by the build/test content pipeline. No server,
runtime service, environment secret, worker, database, state library, time
library, or randomization package is introduced.

## Explicit exclusions

- investigation state and actions;
- evidence unlocking and budgets;
- bookmarks;
- diagnosis submission;
- scoring or partial credit;
- debrief presentation;
- local persistence and migrations;
- seeded routes and share cards;
- Daily Incident behavior;
- scenario browser activation; and
- generalized variation for industries, users, endpoints, regions, severity,
  evidence order, request IDs, or event IDs.

Those remain later milestone work unless the product source of truth is changed.
