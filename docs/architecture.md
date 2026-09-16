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

The routing and presentation boundaries now exist. Content, engine, and storage remain planned boundaries rather than empty speculative interfaces.

## Architecture decisions

### Static client-only deployment

The current product requires no shared mutable state, identity, private dataset, server-authoritative competition, or hosted inference. A backend would add cost, security surface, operational failure modes, and privacy concerns without supporting the core learning loop. Vite therefore emits the complete application as static assets.

### Clean routes on static hosting

Vite uses `/` locally and accepts a deployment base path through `VITE_BASE_PATH`. The GitHub Pages workflow supplies the repository path, and React Router derives its `basename` from Vite's compiled `BASE_URL`.

The deployment also supplies `VITE_REPOSITORY_URL` from GitHub's repository context. This keeps the contribution link accurate without hard-coding or guessing a remote URL; local builds without that value show a plain repository-documentation note instead.

End-to-end tests build with a repository subpath and use a small GitHub Pages preview server. Direct clean-route requests intentionally return the generated `404.html` with a 404 status while still booting the client router, proving the static fallback rather than relying on Vite's development fallback.

The build copies `dist/index.html` to `dist/404.html`. GitHub Pages can therefore return the application document for a direct clean-route request, after which React Router resolves the requested path. Hosts with native SPA rewrites may use those instead. No routing server is required.

### Minimal dependencies

React, React DOM, and React Router are the only runtime packages. Tooling packages are development-only. State management, Zod, YAML parsing, and persistence libraries will be added only when their milestone requires them.

### Presentation ownership

The application shell owns skip navigation, global navigation, the main landmark, and the footer. Pages own product-specific composition. Small primitives own native button/link semantics, cards, badges, and evidence-panel structure. CSS tokens and global styles own shared visual decisions, responsive behavior, focus treatment, and reduced-motion handling.

The scenario browser is intentionally inactive: its controls are disabled and explained until validated content exists. This prevents Milestone 1 presentation from becoming hidden scenario behavior.

### Framework-independent domain behavior

Future composition, state transitions, and scoring will be plain TypeScript wherever practical. React will consume public engine results rather than own hidden business rules. This permits deterministic unit tests without rendering UI.

### Scenario validation starts with the content system

Milestone 0 does not provide a placeholder `validate:scenarios` command. A no-op check would provide false confidence, while implementing the real validator would pull Milestone 2 into the foundation. The genuine YAML/Zod/semantic validation gate will be introduced with scenario content in Milestone 2 and then added to CI.

### Accessibility as behavior

The shell uses semantic landmarks, a skip link, active-route semantics, a native mobile navigation disclosure, labeled disabled controls, visible focus treatment, responsive reflow down to 320 CSS pixels, and reduced-motion handling. Browser tests verify keyboard navigation and mobile route access.

## Test strategy

- **Vitest:** fast TypeScript and component behavior tests
- **React Testing Library:** user-facing queries and accessible semantics
- **Playwright:** keyboard, routing, mobile-navigation, clean-route, and responsive-width verification against a fresh production preview
- **GitHub Actions:** repeatable clean-install quality gates

Engine and scenario contract suites will be added with the behavior they verify, following test-first development.

## Deployment

The deployment workflow builds on GitHub-hosted runners and publishes only `dist` through GitHub Pages. It uses narrowly scoped Pages and identity-token permissions. No application secrets are required or embedded into browser assets.

## Current milestone boundary

Milestone 1 includes clean routing, the application shell, accessible UI primitives, the landing page, the how-it-works page, not-found recovery, and the inactive scenario-browser shell. It explicitly excludes gameplay, IAM-001, scenario schemas/content, working filters, randomization, investigation state, scoring, debriefs, and progress persistence.
