# SaaS Failure Lab

SaaS Failure Lab is a free, open-source troubleshooting simulator for people who work between customers and engineering. It will teach evidence-driven investigation across APIs, identity, integrations, data flows, and browser behavior without requiring access to a real production environment.

> Current status: Milestone 0 — Repository Foundation

The repository currently provides a statically deployable placeholder application and the quality gates needed for later milestones. It does not contain gameplay or scenario content yet.

## Product constraints

- No backend, authentication, database, Docker, hosted AI, or browser-side secret API keys
- Scenario content will remain separate from React components
- Authoritative scenario and scoring behavior will be deterministic
- Engine behavior will be independently testable where practical
- Progress will remain local for v1
- Accessibility is a functional requirement

## Local development

Requirements:

- Node.js 22.12 or newer
- npm 10 or newer

Install and start the development server:

```sh
npm ci
npm run dev
```

The development server prints the local URL when it starts.

## Quality commands

```sh
npm run format:check
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright requires its Chromium browser once per machine:

```sh
npx playwright install chromium
```

Use `npm run format` to format repository files.

## Static build and deployment

`npm run build` emits portable static assets to `dist/`. The output contains only HTML, CSS, and JavaScript and requires no runtime server beyond ordinary static hosting.

GitHub Actions includes:

- CI for formatting, linting, unit tests, production builds, and browser smoke tests
- GitHub Pages deployment from `main`

Routing and deep-link fallback behavior will be selected in Milestone 1, when routes are introduced.

## Test layers

- Vitest and React Testing Library verify component behavior in jsdom.
- Playwright verifies the production build in Chromium through Vite's preview server.
- Scenario contract validation begins in Milestone 2, alongside the real YAML and Zod content system.

## Architecture and planning

- [Architecture](docs/architecture.md)
- [Milestone 0 design](docs/superpowers/specs/2026-09-15-milestone-0-foundation-design.md)
- [Milestone 0 implementation plan](docs/superpowers/plans/2026-09-15-milestone-0-foundation.md)

The product design documents define a milestone-based roadmap. Milestone 1 must not begin until this foundation satisfies all of its quality gates.
