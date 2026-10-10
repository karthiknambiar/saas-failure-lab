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

There is no runtime backend, authentication system, database, tracking,
social API dependency, remote AI dependency, or secret credential path.

## Product boundaries

Milestone 9 implements the IAM-001 investigation, diagnosis result,
completed-only debrief, browser-local completed-run progress, completed-only
sharing, and UTC daily incidents while preserving the
static architecture:

```text
validated scenario YAML
    ↓ deterministic build-time generator
browse-safe index + typed playable catalog
    ↓ canonical composer + pure investigation engine
React investigation controller
    ↓ safe evidence selectors
accessible desktop/mobile investigation UI
    ↓ deterministic diagnosis/evidence scoring
safe completed-result view and completed-only debrief projection
    ↓ versioned browser-local completed-run storage
    ↓ completion-only local share links and Canvas share cards
    ↓
static HTML, CSS, and JavaScript in dist/

React Router static `/daily` route
    ↓ UTC-date daily incident selection
    ↓ seeded playable challenge link
    ↓
static HTML, CSS, and JavaScript in dist/
```

The content pipeline, deterministic composer, investigation engine, accessible
IAM-001 UI, deterministic scoring, completed-only debrief, and versioned
browser-local completed-run progress are implemented. Future milestones will
add remediation, communication, and efficiency feedback.

The boundaries have clear responsibilities:

- **Content:** Contributor-readable scenario definitions outside React.
- **Validation:** Build/CI-time parsing, Zod validation, semantic checks, and normalization.
- **Engine:** Pure TypeScript composition, investigation transitions, and deterministic diagnosis/evidence scoring.
- **Presentation:** Accessible React views that render safe result summaries and
  completed-only debrief and share projections without embedding gameplay rules.
- **Storage:** A versioned browser-local adapter owns completed-run encoding,
  loading, saving, and reset. Malformed or unknown saved values recover safely
  to empty progress; storage failures remain non-blocking.

The routing, presentation, content, validation, composition, investigation,
scoring, and storage boundaries now exist. Storage remains deliberately narrow:
it records completed runs only and has no account, backend, synchronization,
tracking, or social API responsibility.

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
in the browser. The completed-run storage adapter uses browser APIs directly;
no state-management or persistence library is required.

### Generated playable catalog

Milestone 5 generates a typed scenario catalog after the same collection-wide
validation used by the public index. The browser does not parse YAML or fetch
scenario data at runtime. The scenario browser reads only the safe index; the
investigation feature uses the full catalog but renders evidence exclusively
through active-investigation selectors.

### Feature-local investigation controller

React owns transient selection, tab, error, and ready-checkpoint state.
Investigation facts remain in the framework-independent engine. IAM-001 uses a
canonical seed, refresh starts a new session, and in-progress runs are never
persisted or resumed. An accepted terminal diagnosis records only its completed
run in browser-local progress.

### Presentation ownership

The application shell owns skip navigation, global navigation, the main landmark, and the footer. Pages own product-specific composition. Small primitives own native button/link semantics, cards, badges, and evidence-panel structure. CSS tokens and global styles own shared visual decisions, responsive behavior, focus treatment, and reduced-motion handling.

The scenario browser imports the generated browse-safe index and exposes the
IAM-001 card. Its landing-page and browser entry points lead to the playable
IAM-001 investigation; other authored scenarios remain unavailable until their
own UI milestone.

### Framework-independent domain behavior

Scenario composition, investigation transitions, and diagnosis scoring are plain
TypeScript. React consumes safe engine results rather than owning hidden business
rules. This permits
deterministic unit tests without rendering UI. The completed-only debrief is
also a pure safe projection: it exposes authored explanations only after the
engine reaches terminal submission, while active gameplay selectors remain
answer-safe.

### Deterministic scenario composition

Milestone 3 uses explicit variation pools, structured timeline values, and
fixed named seed streams. The composer is pure TypeScript and does not depend
on React, browser APIs, the current clock, or runtime randomness. Independent
dimension streams mean adding a future permitted dimension does not reshuffle
existing dimensions for the same scenario version and seed.

### Completion-only sharing and daily incidents

Only a completed challenge exposes sharing controls. The generated link contains
the scenario identity and seed needed to recreate the same variation; it does
not contain a solution, selected evidence, diagnosis, score breakdown, or
debrief content. Copy and native-share use browser capabilities when available.
The downloaded share card is rendered locally with Canvas and Blob/URL browser
APIs; capability failures remain a local, visible fallback without a remote
image service. A Daily Incident is chosen deterministically from the UTC date,
so the same UTC day resolves to the same seeded playable incident worldwide.
Neither flow introduces an account, backend, tracking, analytics, or social API.

### Pure investigation transitions

Milestone 4 stores durable investigation facts and derives availability from
authored dependencies. Commands are atomic and framework-independent. Time is
an explicit initialization input, budgets are optional, and active selectors
omit hidden relevance, explanations, root-cause, and debrief data.

### Build-time content validation

The content pipeline is implemented as pure schema, parser, semantic-validation,
and normalization modules. Those modules accept data or text and do not own
filesystem access. The Node CLI owns YAML discovery and reads, aggregated error
reporting, and atomic writes for both generated artifacts.

The committed public index contains exactly seven browse fields: ID, title,
domain, difficulty, estimated minutes, concepts, and the first public symptom
summary. It omits customer context, learning objectives, root causes,
hypotheses, evidence and relevance, red herrings, remediation answers,
communication quality, and debrief content. Full validated definitions are
composer inputs and are not emitted into the public browser index. The typed
playable catalog is generated from those same validated documents and is used
only by the IAM-001 route loader; presentation renders active evidence through
safe selectors rather than solution fields.

`npm run validate:scenarios` fails on parsing, schema, or semantic errors.
`npm run generate:scenarios` validates before writing the index and catalog.
Production builds run that command as a pre-build validation gate before
TypeScript and Vite. The application imports the browse-safe index for the
scenario browser and the typed catalog through the allow-listed IAM-001 loader.
CI validates explicitly, regenerates both committed artifacts, and fails when
either drifts from source control.

### Accessibility as behavior

The shell uses semantic landmarks, a skip link, active-route semantics, a native mobile navigation disclosure, labeled disabled controls, visible focus treatment, responsive reflow down to 320 CSS pixels, and reduced-motion handling. Browser tests verify keyboard navigation and mobile route access.

## Test strategy

- **Vitest:** schema, parsing, semantic validation, normalization, CLI, content,
  and component behavior tests
- **React Testing Library:** user-facing queries and accessible semantics
- **Playwright:** keyboard, routing, mobile-navigation, clean-route, and responsive-width verification against a fresh production preview
- **GitHub Actions:** repeatable clean-install quality gates

Engine suites cover deterministic seed selection, scenario composition, source
isolation, investigation transitions, deterministic diagnosis/evidence scoring,
budget behavior, and safe evidence projections. Scenario contract suites cover both valid content and
representative failure modes, including traversal of real authored efficient
paths.

## Deployment

The deployment workflow builds on GitHub-hosted runners and publishes only `dist` through GitHub Pages. It uses narrowly scoped Pages and identity-token permissions. No application secrets are required or embedded into browser assets.

## Current milestone boundary

Milestone 9 makes IAM-001 playable from the landing page and scenario browser
through a diagnosis result and a completed-only debrief. The static UI uses the canonical IAM-001 seed,
engine-controlled evidence gating, safe evidence projections, bookmarks,
hypothesis selection, an action trail, deterministic 70/30 diagnosis/evidence
scoring, and a responsive three-region workspace that changes to accessible
controlled tabs at 820px and below. The result exposes the learner's submitted
diagnosis, total score, and broad outcome. After completion, a transient page
view can replace the result with a safe debrief that explains the completed run
and displays the diagnosis/evidence score components. Accepted completed runs
are stored in a versioned browser-local record and feed the Progress dashboard,
where they survive reloads and can be reset after confirmation. Invalid or
unknown stored values recover to an empty dashboard without crashing. This does
not add accounts, a backend, synchronization, active-run resume, export, or
import; static deployment remains unchanged. FND-001 and every other authored
scenario remain unavailable for play.

Remediation, communication, efficiency feedback, export/import, multi-scenario
randomization, and full scenario-browser filtering remain later work. No backend
state or synchronized persistence is part of this milestone.
