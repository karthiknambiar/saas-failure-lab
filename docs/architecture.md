# Architecture

## Current system

SaaS Failure Lab is a React and TypeScript application compiled by Vite into static browser assets:

```text
index.html
    ↓
React entry point
    ↓
React Router + application shell
    ↓
Page composition + design-system primitives
    ↓
Static HTML, CSS, and JavaScript in dist/
```

There is no runtime backend, authentication system, database, remote AI dependency, or secret credential path.

## Product boundaries

Milestone 2 implements the content and validation boundary while preserving the
static architecture:

```text
content/scenarios/*.yaml
    ↓ YAML parse + Zod source schema
semantic validation
    ↓ deterministic normalization
src/generated/scenario-index.json (public browse fields only)
    ↓ build-time generation
static Vite build in dist/
```

Future milestones will feed full validated scenario definitions into a
framework-independent deterministic engine, then React presentation and
versioned browser-local progress storage. Runtime evidence unlocking,
composition, investigation state, scoring, and debrief behavior remain future
engine work.

The boundaries have clear responsibilities:

- **Content:** Contributor-readable scenario definitions outside React.
- **Validation:** Build/CI-time parsing, Zod validation, semantic checks, and normalization.
- **Engine:** Pure TypeScript composition, investigation transitions, and explainable scoring.
- **Presentation:** Accessible React views that render engine state without embedding answer keys or scoring rules.
- **Storage:** A versioned adapter for local progress with corruption recovery and migrations.

The routing, presentation, content, and validation boundaries now exist. The
engine and storage remain planned boundaries rather than empty speculative
interfaces.

## Architecture decisions

### Static client-only deployment

The current product requires no shared mutable state, identity, private dataset, server-authoritative competition, or hosted inference. A backend would add cost, security surface, operational failure modes, and privacy concerns without supporting the core learning loop. Vite therefore emits the complete application as static assets.

### Clean routes on static hosting

Vite uses `/` locally and accepts a deployment base path through `VITE_BASE_PATH`. The GitHub Pages workflow supplies the repository path, and React Router derives its `basename` from Vite's compiled `BASE_URL`.

The deployment also supplies `VITE_REPOSITORY_URL` from GitHub's repository context. This keeps the contribution link accurate without hard-coding or guessing a remote URL; local builds without that value show a plain repository-documentation note instead.

End-to-end tests build with a repository subpath and use a small GitHub Pages preview server. Direct clean-route requests intentionally return the generated `404.html` with a 404 status while still booting the client router, proving the static fallback rather than relying on Vite's development fallback.

The build copies `dist/index.html` to `dist/404.html`. GitHub Pages can therefore return the application document for a direct clean-route request, after which React Router resolves the requested path. Hosts with native SPA rewrites may use those instead. No routing server is required.

### Minimal dependencies

React, React DOM, and React Router are the browser runtime packages. Zod and the
YAML parser support the build-time content pipeline; scenario YAML is not parsed
in the browser. State management and persistence libraries will be added only
when their milestone requires them.

### Presentation ownership

The application shell owns skip navigation, global navigation, the main landmark, and the footer. Pages own product-specific composition. Small primitives own native button/link semantics, cards, badges, and evidence-panel structure. CSS tokens and global styles own shared visual decisions, responsive behavior, focus treatment, and reduced-motion handling.

The scenario browser remains intentionally inactive: Milestone 2 validates and
generates content but does not connect the index to the browser or add gameplay.
Its controls remain disabled and explanatory.

### Framework-independent domain behavior

Future composition, state transitions, and scoring will be plain TypeScript wherever practical. React will consume public engine results rather than own hidden business rules. This permits deterministic unit tests without rendering UI.

### Build-time content validation

The content pipeline is implemented as pure schema, parser, semantic-validation,
and normalization modules. Those modules accept data or text and do not own
filesystem access. The Node CLI owns YAML discovery and reads, aggregated error
reporting, and atomic generated-index writes.

The committed public index contains exactly seven browse fields: ID, title,
domain, difficulty, estimated minutes, concepts, and the first public symptom
summary. It omits customer context, learning objectives, root causes,
hypotheses, evidence and relevance, red herrings, remediation answers,
communication quality, and debrief content. Full validated definitions remain
future engine inputs and are not emitted into the public browser index.

`npm run validate:scenarios` fails on parsing, schema, or semantic errors.
`npm run generate:scenarios` validates before writing, and production builds run
generation before TypeScript and Vite. CI validates explicitly, regenerates the
committed index, and fails when the result drifts from source control.

### Accessibility as behavior

The shell uses semantic landmarks, a skip link, active-route semantics, a native mobile navigation disclosure, labeled disabled controls, visible focus treatment, responsive reflow down to 320 CSS pixels, and reduced-motion handling. Browser tests verify keyboard navigation and mobile route access.

## Test strategy

- **Vitest:** schema, parsing, semantic validation, normalization, CLI, content,
  and component behavior tests
- **React Testing Library:** user-facing queries and accessible semantics
- **Playwright:** keyboard, routing, mobile-navigation, clean-route, and responsive-width verification against a fresh production preview
- **GitHub Actions:** repeatable clean-install quality gates

Engine suites will be added with the behavior they verify. Scenario contract
suites now cover both valid content and representative failure modes.

## Deployment

The deployment workflow builds on GitHub-hosted runners and publishes only `dist` through GitHub Pages. It uses narrowly scoped Pages and identity-token permissions. No application secrets are required or embedded into browser assets.

## Current milestone boundary

Milestone 2 includes the YAML/Zod scenario contract, pure parsing and semantic
validation, deterministic normalization, two fictional scenarios, a committed
public index, CLI/build/CI gates, and contributor documentation. The browser is
still inactive and does not consume the index. This milestone explicitly
excludes working filters, scenario composition, randomization, runtime evidence
unlocking, investigation state, scoring, debrief gameplay, and progress
persistence.
