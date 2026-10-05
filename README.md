# SaaS Failure Lab

SaaS Failure Lab is a free, open-source troubleshooting simulator for people who work between customers and engineering. It will teach evidence-driven investigation across APIs, identity, integrations, data flows, and browser behavior without requiring access to a real production environment.

> Current status: Milestone 6 — IAM-001 diagnosis scoring

The repository includes two fictional YAML scenarios, a validated content
contract, and deterministic generated browse and playable catalogs. IAM-001 is
playable from the landing page or scenario browser through a diagnosis result.
IAM-001 scoring is deterministic and kept in browser memory only. FND-001 remains
authored but unavailable for play.

## Product constraints

- No backend, authentication, database, Docker, hosted AI, or browser-side secret API keys
- Scenario content will remain separate from React components
- Authoritative scenario and scoring behavior will be deterministic
- Engine behavior will be independently testable where practical
- IAM-001 uses local in-memory state only; no progress or results are persisted
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
all YAML first and updates both `src/generated/scenario-index.json` and
`src/generated/scenario-catalog.ts` only when their deterministic output
changes.

## Static build and deployment

`npm run build` emits portable static assets to `dist/`. The output contains only HTML, CSS, and JavaScript and requires no runtime server beyond ordinary static hosting. It also creates `dist/404.html` so clean React Router paths can recover on GitHub Pages.

GitHub Actions includes:

- CI for formatting, linting, unit tests, production builds, and browser smoke tests
- GitHub Pages deployment from `main`

The current application routes are:

- `/` — product landing page
- `/scenarios` — browse-safe scenario library with the IAM-001 entry
- `/scenarios/iam-001` — playable canonical IAM investigation
- `/how-it-works` — investigation-loop explanation
- any unknown path — not-found recovery page

Milestone 6 includes diagnosis submission and a deterministic 70/30 score: 70
points for the submitted diagnosis and 30 for bookmarked evidence. The result
view intentionally gives only the submitted diagnosis, total, and broad outcome;
it does not reveal answer keys or detailed scoring explanations. Remediation,
communication, efficiency, detailed breakdown, explanation, debrief,
persistence, sharing, and multi-scenario play remain deferred.

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
- [Scoring rubric](docs/scoring.md)
- [Scenario authoring guide](docs/scenario-authoring.md)
- [Milestone 0 design](docs/superpowers/specs/2026-09-15-milestone-0-foundation-design.md)
- [Milestone 0 implementation plan](docs/superpowers/plans/2026-09-15-milestone-0-foundation.md)
- [Milestone 1 design](docs/superpowers/specs/2026-09-15-milestone-1-design-system.md)
- [Milestone 1 implementation plan](docs/superpowers/plans/2026-09-16-milestone-1-design-system.md)
- [Milestone 2 content-system design](docs/superpowers/specs/2026-09-24-milestone-2-content-system-design.md)
- [Milestone 2 implementation plan](docs/superpowers/plans/2026-09-24-milestone-2-content-system.md)
- [Milestone 5 investigation UI design](docs/superpowers/specs/2026-09-28-milestone-5-investigation-ui-design.md)
- [Milestone 5 implementation plan](docs/superpowers/plans/2026-09-30-milestone-5-investigation-ui.md)

The product design documents define a milestone-based roadmap. Milestone 6
connects deterministic diagnosis scoring to IAM-001 only; later milestones add
remediation, communication, debrief, persistence, and more playable scenarios.
