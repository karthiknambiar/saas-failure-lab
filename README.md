# SaaS Failure Lab

SaaS Failure Lab is a free, open-source troubleshooting simulator for people who work between customers and engineering. It will teach evidence-driven investigation across APIs, identity, integrations, data flows, and browser behavior without requiring access to a real production environment.

> Current status: Milestone 2 — Content System

The repository now includes two fictional YAML scenarios, a validated content
contract, and a deterministic generated public scenario index alongside the
responsive application shell. The scenario browser remains intentionally
inactive: the index is not connected to the UI, and there is no gameplay yet.

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
npm run validate:scenarios
npm run generate:scenarios
npm test
npm run build
npm run test:e2e
```

Playwright requires its Chromium browser once per machine:

```sh
npx playwright install chromium
```

Use `npm run format` to format repository files. Scenario generation validates
all YAML first and updates `src/generated/scenario-index.json` only when its
deterministic output changes.

## Static build and deployment

`npm run build` emits portable static assets to `dist/`. The output contains only HTML, CSS, and JavaScript and requires no runtime server beyond ordinary static hosting. It also creates `dist/404.html` so clean React Router paths can recover on GitHub Pages.

GitHub Actions includes:

- CI for formatting, linting, unit tests, production builds, and browser smoke tests
- GitHub Pages deployment from `main`

The current application routes are:

- `/` — product landing page
- `/scenarios` — inactive scenario-browser shell
- `/how-it-works` — investigation-loop explanation
- any unknown path — not-found recovery page

The deployment workflow supplies the repository base path to Vite. React Router uses that compiled base path, preserving clean navigation when the site is deployed below a domain root.

## Test layers

- Vitest verifies scenario schema, parsing, semantic validation, normalization,
  CLI behavior, real content, and component behavior.
- React Testing Library verifies user-visible behavior and accessibility in
  jsdom.
- Playwright verifies the production build in Chromium through Vite's preview server.
- CI runs scenario validation and rejects generated-index drift before building
  the static application.

## Architecture and planning

- [Architecture](docs/architecture.md)
- [Scenario authoring guide](docs/scenario-authoring.md)
- [Milestone 0 design](docs/superpowers/specs/2026-09-15-milestone-0-foundation-design.md)
- [Milestone 0 implementation plan](docs/superpowers/plans/2026-09-15-milestone-0-foundation.md)
- [Milestone 1 design](docs/superpowers/specs/2026-09-15-milestone-1-design-system.md)
- [Milestone 1 implementation plan](docs/superpowers/plans/2026-09-16-milestone-1-design-system.md)
- [Milestone 2 content-system design](docs/superpowers/specs/2026-09-24-milestone-2-content-system-design.md)
- [Milestone 2 implementation plan](docs/superpowers/plans/2026-09-24-milestone-2-content-system.md)

The product design documents define a milestone-based roadmap. Milestone 2
implements the YAML, Zod, semantic-validation, and public-index pipeline while
deliberately leaving the browser shell inactive until gameplay work begins.
