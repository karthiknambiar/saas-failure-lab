# Milestone 9 — Sharing and Daily Incident Design

## Status

Approved for planning on 2026-10-07.

## Scope

Milestone 9 adds browser-only sharing for completed scenario runs, seeded
challenge links that recreate an exact scenario variation, a locally generated
PNG share card, and a global UTC Daily Incident.

It includes:

- completion-only challenge sharing;
- base-path-aware seeded scenario URLs;
- native sharing, copy-link, and PNG-download browser actions;
- an HTML share-card preview plus local Canvas image generation; and
- a deterministic `/daily` route using the global UTC date.

## Deferred scope

Milestone 9 does not add:

- accounts, authentication, synchronization, remote storage, or a backend;
- export/import of progress;
- social-network APIs, tracking, leaderboards, or daily-completion history;
- remediation, communication, or efficiency scoring;
- remote image, font, or Canvas assets;
- hosted AI, API keys, or any hidden-answer content in a shared payload.

## Share payload and safety boundary

A pure share domain builds and parses the public seeded-challenge contract. A
completion-only share payload contains only:

- scenario ID and authored scenario version;
- the exact composed seed;
- public scenario title;
- total, diagnosis, and evidence score components; and
- a base-path-aware challenge URL.

The challenge URL uses the existing scenario path and a `seed` query parameter:

```text
/failure-lab/scenarios/iam-001?seed=<normalized seed>
```

Opening that route validates the supplied seed using the existing seed rules and
composes the same scenario variation. Invalid, missing, or overlong seed input
does not crash the route: a missing value uses the canonical scenario seed and
an invalid supplied value produces a clear route recovery state with a link
back to scenarios.

Shared payloads, URLs, card text, browser adapter arguments, and accessible
HTML previews must never contain root-cause IDs or explanations, evidence
relevance or explanations, red-herring explanations, hidden scenario content,
action history, bookmarks, storage values, or credentials. The completion
selector remains the source for score values; React does not calculate scores.

## Browser-only sharing

The browser adapter is the sole boundary for `location`, `navigator.share`,
clipboard, Canvas, Blob/object URLs, and download behavior. It has typed
success/failure results and catches browser API exceptions. Browser failures
never affect a completed run, debrief, or challenge route.

After completion, the UI offers a preview card and three native actions:

- **Share challenge** invokes the native share sheet when available;
- **Copy challenge link** writes the exact seeded URL to the clipboard; and
- **Download share card** renders a PNG with Canvas and triggers a local
  download.

The UI makes the contract explicit: “This link lets others attempt the same
scenario variation.” A `role="status"` message reports copied, downloaded,
unsupported, blocked, or failed actions. Canvas is only a downloadable-image
implementation; the preview remains ordinary text-readable HTML.

The PNG contains only public title, completion wording, score values, and the
same-variation prompt. It uses embedded colors and system fonts—no remote
assets. The Canvas layout is deterministic from the safe payload, including
fixed dimensions, wrapped text behavior, and filename.

## Seeded investigation routes

The existing investigation loader accepts an optional normalized seed. It
continues to use the canonical seed for ordinary scenario-browser links. The
route reads only the `seed` search parameter and does not persist it. Same
scenario ID, version, and normalized seed must produce the same composed
instance as before.

Share actions are available only from terminal completed result/debrief views.
They receive the current `ScenarioInstance`, so the exact seed used by that
run is carried into the share URL. Starting over begins a new in-memory run and
does not alter an already created link.

## Daily Incident

`/daily` is a primary-navigation route. A pure daily module receives a UTC
calendar date and eligible playable scenario metadata, then returns the daily
scenario ID and variation seed.

```text
date = YYYY-MM-DD in UTC
scenarioIndex = stableHash(date) % eligibleScenarioCount
variantSeed = stableHash(date + selectedScenarioId)
```

The implementation reuses the project's deterministic hashing rules or exposes
an explicitly tested stable helper; it never calls the current clock inside the
pure selector. The route owns UTC clock access and passes the date into the
domain. It displays the UTC date, explains that everyone receives the same
daily incident, and links to the chosen seeded scenario route.

Only currently playable scenarios are eligible. With IAM-001 alone, the daily
scenario remains IAM-001 while its seed varies by date. When future playable
scenarios are added, selection rotates over that eligible list without a route,
storage, or API change. An empty eligible list is a safe unavailable state.

## Accessibility and responsive behavior

Share actions use native buttons with visible text labels. The preview uses a
meaningful heading and text-readable score. Status feedback is announced and
receives focus only when an action removes the prior focus target. The share
panel appears only after completion and does not render active investigation
tools or hidden scenario fields.

The daily page uses a focusable `h1`, describes its UTC basis in text, and
uses a normal link to begin the selected incident. Share and daily layouts
reflow at 320 CSS pixels without horizontal overflow.

## Validation

Pure tests must cover:

- URL generation/parsing under `/` and a GitHub Pages subpath;
- invalid, missing, and normalized seed handling;
- exact same-variation composition from a shared URL;
- safe payload serialization without hidden scenario fields;
- deterministic daily selection, UTC date rollover, and empty eligibility;
- Canvas instruction/image generation from safe payload only; and
- browser adapter success, unavailable, rejected, and download-cleanup paths.

Component and route tests must cover completion-only share visibility, safe
preview text, every share action/status, seeded route recovery, daily
navigation, UTC wording, focus, and responsive semantics. Production-preview
browser tests must cover a subpath seeded challenge, completed-share flow,
copy/download stubs, daily route, and a 320px layout.

All existing lint, formatting, unit, scenario-validation, generated-artifact,
static-build, and browser-test gates remain required.

## Important decisions

- The card is available only after completion so it represents a completed
  learning attempt, not a pre-play answer artifact.
- A shared URL reproduces the exact variation and says so clearly; it does not
  carry any solution content.
- Daily Incident uses UTC, not the viewer's local date, so all users receive
  the same challenge at the same global moment.
- Browser APIs are optional conveniences with typed fallbacks; the static app
  remains fully usable when sharing APIs are unavailable.
