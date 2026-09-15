# Milestone 0 Repository Foundation Design

## Scope

Milestone 0 establishes the build, quality, testing, deployment, and documentation foundation for SaaS Failure Lab. It intentionally stops before routing, design-system components, scenario schemas, scenario content, deterministic engine behavior, persistence, or gameplay.

## Architecture

The application is a Vite-built React and TypeScript single-page application whose production output consists only of static assets. React owns presentation. Future scenario definitions will be authored outside React, validated and normalized at build time, and consumed by a framework-independent TypeScript engine. Future browser persistence will sit behind a versioned storage boundary.

Milestone 0 creates a minimal accessible placeholder page and the tooling needed to evolve that architecture safely:

- ESLint for TypeScript and React correctness
- Prettier for deterministic formatting
- Vitest and React Testing Library for unit/component tests
- Playwright for a browser smoke test
- GitHub Actions for repeatable CI and static deployment

## Static deployment

Vite emits only HTML, CSS, and JavaScript. Asset URLs use a relative base so the build can be hosted at a domain root or beneath a repository path. The deployment workflow publishes `dist` to GitHub Pages and introduces no server process, backend endpoint, database, authentication, or secret browser credential.

Routing and deep-link fallback behavior are deferred to Milestone 1, when routes actually exist. That milestone must choose a static-host-safe routing strategy rather than weakening static deployability.

## Boundaries preserved for later milestones

- Scenario content will live outside React components.
- Scenario parsing and Zod validation belong to Milestone 2.
- Seeded composition and all authoritative gameplay/scoring rules will be framework-independent TypeScript.
- React will render engine state rather than contain hidden scoring rules.
- Progress will eventually use a versioned localStorage adapter.
- Hosted AI, provider keys, backend services, authentication, and databases are excluded.

These boundaries are documented now but are not represented by empty speculative interfaces or dependencies.

## Quality gates

A clean checkout must support dependency installation, formatting validation, linting, unit tests, a production build, and a Playwright smoke test. CI runs those gates on pushes and pull requests. Scenario validation is not faked in Milestone 0; the real validator and its CI gate arrive with the content system in Milestone 2.

## Accessibility baseline

The placeholder uses semantic landmarks, a single descriptive heading, readable text, and a keyboard-operable link. Accessibility remains a functional acceptance criterion for later UI milestones.

## Deferred complexity

The following are deliberately excluded: React Router, state-management libraries, Zod, YAML tooling, scenario directories, localStorage migrations, AI adapters, analytics, PWA support, Docker, server-side rendering, and full community-governance scaffolding.
