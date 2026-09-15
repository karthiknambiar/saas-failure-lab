# Architecture

## Current system

SaaS Failure Lab is a React and TypeScript application compiled by Vite into static browser assets:

```text
index.html
    ↓
React entry point
    ↓
Accessible presentation
    ↓
Static HTML, CSS, and JavaScript in dist/
```

There is no runtime backend, authentication system, database, remote AI dependency, or secret credential path.

## Planned product boundaries

Later milestones will introduce four major boundaries while preserving the static architecture:

```text
YAML scenario definitions
    ↓ build-time validation and normalization
Normalized scenario content
    ↓
Framework-independent deterministic engine
    ↓
React presentation
    ↓
Versioned browser-local progress storage
```

The boundaries have clear responsibilities:

- **Content:** Contributor-readable scenario definitions outside React.
- **Validation:** Build/CI-time parsing, Zod validation, semantic checks, and normalization.
- **Engine:** Pure TypeScript composition, investigation transitions, and explainable scoring.
- **Presentation:** Accessible React views that render engine state without embedding answer keys or scoring rules.
- **Storage:** A versioned adapter for local progress with corruption recovery and migrations.

These are boundaries, not implementations in Milestone 0. Empty interfaces and state libraries have not been added prematurely.

## Architecture decisions

### Static client-only deployment

The current product requires no shared mutable state, identity, private dataset, server-authoritative competition, or hosted inference. A backend would add cost, security surface, operational failure modes, and privacy concerns without supporting the core learning loop. Vite therefore emits the complete application as static assets.

### Portable asset paths

Vite uses a relative asset base. The same `dist` output can be hosted at a domain root or repository subpath. Routing is deferred to Milestone 1; that milestone must adopt a static-host-safe deep-link strategy while retaining the intended user-facing routes.

### Minimal dependencies

React and React DOM are the only runtime packages. Tooling packages are development-only. React Router, state management, Zod, YAML parsing, and persistence libraries will be added only when their milestone requires them.

### Framework-independent domain behavior

Future composition, state transitions, and scoring will be plain TypeScript wherever practical. React will consume public engine results rather than own hidden business rules. This permits deterministic unit tests without rendering UI.

### Scenario validation starts with the content system

Milestone 0 does not provide a placeholder `validate:scenarios` command. A no-op check would provide false confidence, while implementing the real validator would pull Milestone 2 into the foundation. The genuine YAML/Zod/semantic validation gate will be introduced with scenario content in Milestone 2 and then added to CI.

### Accessibility from the first render

The placeholder uses semantic landmarks, labeled sections, keyboard-operable navigation, visible focus treatment, responsive layout, and reduced-motion handling. Later milestones must treat accessibility checks as acceptance criteria rather than final polish.

## Test strategy

- **Vitest:** fast TypeScript and component behavior tests
- **React Testing Library:** user-facing queries and accessible semantics
- **Playwright:** smoke verification against the production preview
- **GitHub Actions:** repeatable clean-install quality gates

Engine and scenario contract suites will be added with the behavior they verify, following test-first development.

## Deployment

The deployment workflow builds on GitHub-hosted runners and publishes only `dist` through GitHub Pages. It uses narrowly scoped Pages and identity-token permissions. No application secrets are required or embedded into browser assets.

## Milestone boundary

Milestone 0 includes repository configuration, placeholder UI, formatting, linting, tests, CI, deployment, and architecture documentation. It explicitly excludes routing, a design system, gameplay, IAM-001, scenario schemas/content, randomization, investigation state, scoring, debriefs, and progress persistence.
