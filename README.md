# SaaS Failure Lab

SaaS Failure Lab is a free, open-source troubleshooting simulator for people who work between customers and engineering. It will teach evidence-driven investigation across APIs, identity, integrations, data flows, and browser behavior without requiring access to a real production environment.

> Current status: Milestone 10 — expanded authored scenario library and local authoring tools

The repository includes 12 fictional YAML scenarios across six domains, a
validated content contract, and deterministic generated browse and playable
catalogs. IAM-001 is playable from the landing page or scenario browser through
a completed-run debrief. Accepted IAM-001 completions are saved as versioned,
browser-local progress records; other authored scenarios remain unavailable for
play until their own investigation UI is available.

## Product constraints

- No backend, authentication, database, Docker, hosted AI, or browser-side secret API keys
- Scenario content will remain separate from React components
- Authoritative scenario and scoring behavior will be deterministic
- Engine behavior will be independently testable where practical
- Completed runs use versioned browser-local storage; malformed or unknown
  saved data safely recovers to an empty progress view
- No accounts, backend, sync, active-run resume, export, or import
- Sharing begins only after completion and creates a browser-local seeded link
  for the same scenario variation; it never includes a solution or debrief data
- Daily incidents are selected deterministically from the UTC calendar date
- No analytics, tracking, social API, or server-side share-card generation
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

Scenario authors should validate YAML before generating artifacts:

```sh
npm run validate:scenarios
npm run generate:scenarios
git diff -- src/generated/scenario-index.json src/generated/scenario-catalog.ts
```

## Static build and deployment

`npm run build` emits portable static assets to `dist/`. The output contains only HTML, CSS, and JavaScript and requires no runtime server beyond ordinary static hosting. It also creates `dist/404.html` so clean React Router paths can recover on GitHub Pages.

GitHub Actions includes:

- CI for formatting, linting, unit tests, production builds, and browser smoke tests
- GitHub Pages deployment from `main`

The current application routes are:

- `/` — product landing page
- `/scenarios` — browse-safe scenario library with the IAM-001 entry
- `/scenarios/iam-001` — playable canonical IAM investigation
- `/progress` — completed-run dashboard, achievements, and local reset flow
- `/how-it-works` — investigation-loop explanation
- `/daily` — UTC-selected daily incident with a seeded challenge link
- `/developer/inspector/<scenario-id>?seed=<seed>` — local Scenario Inspector
- `/developer/scoring/<scenario-id>` — local Scoring Simulator
- any unknown path — not-found recovery page

The developer routes are deliberately unlinked local authoring aids. They are
absent from the public navigation and are not access-control or security
boundaries; the static application has no server protection for those URLs.

Milestone 9 retains deterministic diagnosis submission and the 70/30 score: 70
points for the submitted diagnosis and 30 for bookmarked evidence. Only after a
completed submission, a learner can replace the result view with a debrief that
shows the diagnosis and evidence score components, the authored root-cause
explanation, evidence chain, seed-selected red herrings, efficient path, and
transferable lesson. Completed-run progress is stored only in the current
browser and can be reset from the Progress dashboard. Active investigations are
not resumed; export/import, sharing, remediation, communication, efficiency
scoring and multi-scenario play remain deferred. After completion, learners can
share a browser-local link to the same generated variation, copy it, or download
a local Canvas-rendered share card. These controls carry no solution, evidence,
or debrief data; unavailable browser capabilities show a safe fallback message.
The Daily Incident route uses the UTC date so everyone receives the same seeded
incident worldwide. There is no backend, account, tracking, social API, or
remote share-card service.

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

The product design documents define a milestone-based roadmap. Milestone 10
expands the authored library to 12 scenarios across API, identity,
integrations, data, browser, and fundamentals domains, and adds unlinked local
authoring aids for inspection and score simulation. Later milestones add
remediation, communication, and more playable scenarios.
