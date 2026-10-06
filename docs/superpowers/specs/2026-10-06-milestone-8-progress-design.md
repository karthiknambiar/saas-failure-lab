# Milestone 8 — Progress and Achievements Design

## Status

Approved for planning on 2026-10-06.

## Scope

Milestone 8 adds durable, browser-local learning progress to the static
application. It records accepted completed diagnosis runs, exposes a progress
dashboard and deterministic achievements, and lets learners reset their saved
progress.

It includes:

- versioned browser-local persistence with recovery from malformed data;
- a progress dashboard at `/progress`;
- per-scenario completion and best-score summaries;
- deterministic achievements derived from saved completion records;
- an accessible reset flow; and
- migrations structured for future persisted versions.

## Deferred scope

Milestone 8 does not add:

- export or import of learner data;
- in-progress investigation resume;
- server synchronization, authentication, accounts, or a database;
- sharing, leaderboards, analytics, or daily incidents;
- remediation, communication, or efficiency scoring;
- hosted AI, secret API keys, or a new persistence dependency.

## Storage boundary

A new framework-independent progress domain owns the persisted representation,
validation, migration, and progress derivations. The browser adapter is the
only layer permitted to access `localStorage` and uses one application-owned
storage key.

The versioned envelope begins at version 1. Decoder input is untrusted: it
must parse, validate, and migrate known historical versions into the current
typed state. Missing data yields an empty valid state. Malformed JSON, invalid
shape, unsupported future version, or browser storage failure must not crash
the application; each recovers to empty in-memory progress. Storage writes are
best-effort, so an accepted diagnosis remains complete even when persistence is
unavailable.

The storage domain must remain independently testable without React or browser
APIs. It receives raw strings and typed values; the small adapter owns browser
I/O and translates failures into safe results.

## Persisted learner data

Each accepted completed run stores only player-owned, completion-safe facts:

- scenario ID;
- completion timestamp;
- submitted hypothesis ID;
- total, diagnosis, and evidence score components.

It does not store active investigation state, selected evidence, bookmarks,
action history, UI/tab state, root-cause IDs, authored scenario content, or
debrief explanations. A reload never resumes an in-progress run.

The completion integration happens only after the existing engine accepts a
terminal diagnosis submission. It must not duplicate an already-recorded
submission through React re-rendering. A completed run may add history while
the dashboard derives per-scenario best scores from that history.

## Dashboard and achievements

`/progress` is linked through the existing application navigation. It renders:

- completed-scenario count;
- average score and best score when records exist;
- recent completed runs;
- an explicit card for every browser-playable scenario with completion state
  and best score where available; and
- a visible achievements section.

The initial deterministic achievements are:

- **First completion** — at least one stored completion;
- **Perfect diagnosis** — at least one score of 100; and
- **Scenario explorer** — completions across more than one distinct scenario.

Achievements are derived on every read from stored records, rather than saved
as independently mutable flags. Locked achievements remain visible with
plain-language criteria. The empty state explains that no completed scenarios
are saved and offers a route to the scenario browser.

## Reset and error behavior

The dashboard offers a native reset action with an inline confirmation step.
Confirming removes only this application's progress key, replaces progress with
the empty state, restores the empty dashboard, and moves focus to a meaningful
confirmation or page heading. Cancelling leaves progress unchanged.

When storage cannot be read or written, the dashboard remains usable with
in-memory empty progress. A concise non-blocking notice may explain that saved
progress is unavailable; it must not disclose raw stored values or prevent
play.

## UI and accessibility

The progress page uses semantic headings, text-readable scores, native buttons,
and labelled status rather than color alone. Summary values and achievement
state must remain understandable to screen-reader users. The layout reflows to
320 CSS pixels without horizontal overflow. Route changes and reset feedback
have intentional focus management consistent with the existing app shell.

React renders typed progress views and invokes the adapter; it contains no
migration, achievement, scoring, or storage-parsing rules. Engine scoring
remains unchanged and framework-independent.

## Validation

Domain tests must cover:

- serialization, decoding, and migration into the current envelope;
- missing, corrupt, unsupported, and storage-failure recovery;
- immutable progress updates and duplicate-submission protection;
- summary and achievement derivation, including multiple completions and
  multiple scenarios; and
- reset behavior without touching unrelated storage.

Component tests must cover the empty and populated dashboard, visible locked
and unlocked achievements, reset confirmation/cancellation, storage notices,
and accessible semantics. Integration tests must cover an accepted diagnosis
being available after a reload and then visible on `/progress`.

Browser tests must cover navigation, reload persistence, reset, and narrow
mobile layout. Formatting, lint, unit tests, scenario validation, generated
artifact checks, production static build, and browser tests remain required.

## Important decisions

- Progress is local to a browser profile; no account or cross-device promise is
  implied.
- Only accepted completed submissions become durable records; work in progress
  stays ephemeral.
- Corrupt or unknown stored data favors safe recovery over preservation of
  unverifiable data.
- Export/import is intentionally deferred, but the versioned envelope makes a
  later validated file format possible without changing gameplay state.
