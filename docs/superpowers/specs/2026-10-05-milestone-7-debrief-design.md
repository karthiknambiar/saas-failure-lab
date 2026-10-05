# Milestone 7 — Debrief Design

## Status

Approved for planning on 2026-10-05.

## Scope

Milestone 7 adds the IAM-001 post-completion debrief. It is accessible only
after the existing deterministic diagnosis submission reaches terminal
`completed` state. The debrief explains the completed run using authored
scenario content and exposes the scoring breakdown deferred from Milestone 6.

It includes:

- submitted diagnosis, total, and the diagnosis/evidence score components;
- canonical root-cause explanation;
- ordered evidence chain with labels and explanations;
- explanations for red herrings selected by the composed seed;
- authored efficient investigation path;
- transferable lesson;
- transient result/debrief navigation and a fresh-run action.

## Deferred scope

Milestone 7 does not add:

- remediation selection or scoring;
- customer communication selection or scoring;
- action-efficiency or elapsed-time scoring;
- persistence, progress, achievements, sharing, or backend services;
- routes dedicated to debriefs;
- hosted AI or secret API keys.

## Architecture and safety boundary

The engine remains the only layer that reads hidden scenario truth. A pure
`getDebriefView(instance, state)` selector will first assert scenario identity,
then require a completed state with a submission. It rejects intro and active
investigation state using `InvestigationTransitionError('INVALID_STATUS')`.

Its output is a player-facing debrief model. It contains only the material
needed to render this completed-run explanation: submitted diagnosis details,
total and component score values, root-cause explanation, evidence-chain
entries, selected red-herring entries, efficient-path entries, and transferable
lesson. React must render this selector output rather than reading hidden
scenario fields directly.

The selector does not introduce a new engine command or durable state. The
page keeps a transient `showDebrief` view flag. Selecting “Review debrief”
changes that flag only after completion. Returning to the result changes it
back. “Start over” uses the existing controller reset, returning to incident
introduction with a new in-memory run.

## Debrief model

The safe model includes:

- `submittedDiagnosis`: public label of the learner’s selected hypothesis;
- `score`: total, diagnosis points, and evidence points;
- `rootCauseExplanation`: authored explanation shown only after completion;
- `evidenceChain`: authored `debrief.evidence_chain` order, each entry with a
  player-safe evidence label and its authored explanation;
- `redHerrings`: only authored red herrings whose IDs occur in
  `instance.composition.selectedRedHerringIds`, each with public label and
  authored explanation;
- `efficientPath`: authored order, mapped to either evidence labels or a
  finite set of friendly framework-step labels;
- `transferableLesson`: authored debrief lesson.

The selector preserves authored ordering. It must treat an unknown debrief
reference or unsupported framework-step as a content/engine invariant error;
schema validation already prevents ordinary authored documents from reaching
this state.

## UI and accessibility

`DiagnosisResult` gains a native “Review debrief” button. It is a completion
view action—not a new route or submission command.

`DebriefPage` is a dedicated semantic section that replaces the result view.
It contains an `h1` focus target, a text-labelled score breakdown, meaningful
headings for each debrief section, ordered lists for the evidence chain and
efficient path, and an unordered list for red herrings when selected. It has
native “Back to result” and “Start over” buttons.

No visual treatment is the sole carrier of score or correctness information.
On mobile, the debrief replaces rather than coexists with workspace tabs. The
screen is responsive and must not horizontally overflow at 320px.

## Validation

Engine tests must prove:

- intro and investigating state cannot obtain a debrief;
- completed selection is deterministic, immutable, and includes exact score
  components;
- evidence chain preserves authored order and explanation mapping;
- only seed-selected red herrings appear;
- efficient-path evidence and framework steps map safely;
- no unplanned hidden scenario fields are exposed by the debrief model.

Component tests must prove:

- result-to-debrief and back navigation is keyboard accessible;
- initial focus lands on the debrief heading;
- score breakdown is text-readable;
- no active workspace controls render during debrief;
- start over returns to the incident introduction.

End-to-end coverage must prove the debrief is absent before submission and
appears only after completed submission, including narrow-mobile layout and
static-route compatibility. Full formatting, lint, tests, scenario validation,
generated-artifact, static build, and Playwright gates remain required.

## Important decisions

- Completion, not a correct score, unlocks the debrief. Incorrect answers are
  learning opportunities and receive the same explanation after final submit.
- Score components are disclosed only after completion and only as the existing
  diagnosis/evidence values; no remediation, communication, or efficiency
  categories are implied.
- Seed-selected red herrings are explained, while unselected pool entries are
  omitted so the debrief remains faithful to the actual run.
- The selector boundary permits explanatory content after completion without
  making that content available to active gameplay components.
