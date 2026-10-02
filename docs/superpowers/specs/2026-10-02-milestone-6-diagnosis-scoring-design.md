# Milestone 6 — Diagnosis Submission and Scoring Design

## Status

Approved for planning on 2026-10-02.

## Scope

Milestone 6 completes the IAM-001 investigation loop through a final,
in-memory diagnosis submission and deterministic, evidence-aware outcome.
It deliberately implements the diagnosis-only subset of the broader product
roadmap:

- select and submit a diagnosis;
- score the selected diagnosis and bookmarked evidence deterministically;
- render a concise, player-safe final result;
- let the player start a new canonical run.

The milestone remains static and client-only. It adds no backend,
authentication, database, hosted AI, provider keys, persistence, or browser
storage.

## Deferred scope

The product roadmap groups remediation, customer communication, efficiency
scoring, and score breakdowns with broader submission work. By explicit
product decision for this increment, they remain deferred, along with:

- remediation selection and scoring;
- communication selection and scoring;
- elapsed-time or action-efficiency scoring;
- debrief, root-cause disclosure, evidence explanations, and transferable
  lesson content;
- progress persistence and completion history;
- editing or resubmitting a completed run.

## Architecture

The framework-independent engine remains the source of truth. It will gain a
`submit_diagnosis` command, a terminal `completed` state, a submission action,
and a result model. The command receives the existing `ScenarioInstance` and
`InvestigationState`; React never evaluates hidden scenario fields.

The command must reject a state that is not investigating, has no selected
hypothesis, or has already been completed. It must keep the input state and
scenario instance immutable. A completed state cannot receive any further
investigation command.

The scenario instance may carry hidden root-cause and evidence-relevance data
inside the engine boundary. The presentation layer receives a dedicated safe
result projection only. It must not receive root-cause IDs, relevance,
explanations, remediation, communication, debrief, or scoring-rubric details.

The existing feature controller dispatches the engine command and preserves
only transient UI concerns such as an error announcement or focus target. A
fresh canonical instance and state are created for “Start over”; refreshing
the page also begins a fresh run because persistence remains out of scope.

## Deterministic scoring

The result is a total out of 100:

- **Diagnosis: 70 points.** Awarded only when the submitted hypothesis matches
  the composed scenario’s canonical root-cause hypothesis.
- **Evidence: up to 30 points.** Awarded in proportion to the scenario’s
  critical evidence that is bookmarked at submission. Evidence must already
  have been opened for it to be bookmarkable.

The engine computes the result from scenario truth and state alone. An
incorrect diagnosis may still receive the earned evidence points, producing
deterministic partial credit. The UI may show only a coarse outcome band based
on the total:

- 70–100: **Strong evidence-backed diagnosis**
- 30–69: **Partial diagnosis**
- 0–29: **Diagnosis needs revision**

The result does not disclose why a score changed, which evidence was critical,
or the correct diagnosis. Detailed explanation and score breakdown belong to
the later debrief milestone.

## UI flow and accessibility

The existing “Ready to diagnose” checkpoint becomes a confirmation view that
summarizes the chosen hypothesis and bookmarked evidence by safe labels. Its
native submit button is enabled only when a hypothesis is selected.

On successful submission, the workspace is replaced by a final result view.
Focus moves to its semantic heading. The view renders the submitted diagnosis,
numeric total, text outcome band, and a native “Start over” button. The score
must never rely on color alone. Start over creates a fresh canonical run and
returns to the incident introduction; the completed run cannot be edited,
returned to, or resubmitted.

The same result view is used at all viewport sizes. It replaces the mobile tab
workspace instead of leaving duplicate focusable controls in the accessibility
tree.

## Validation

Engine tests must prove:

- successful submission is immutable and terminal;
- invalid status, missing hypothesis, and duplicate submission are rejected;
- correct and incorrect diagnoses score deterministically;
- bookmarked critical evidence receives proportional credit;
- hidden scenario fields are absent from safe projections.

UI tests must prove:

- the confirmation shows only safe labels and has an accessible submit action;
- successful submission moves focus to the result heading;
- completed state exposes no active investigation controls;
- start over creates a new in-memory canonical run;
- the result contains no root cause, explanation, relevance classification,
  remediation, communication, or debrief content.

End-to-end coverage must exercise a correct and an incorrect IAM-001 path,
keyboard submission, final-state locking, start-over behavior, and responsive
presentation. Full lint, formatting, unit, scenario validation, static build,
generated-artifact, and Playwright gates remain required.

## Important decisions

- The 70/30 diagnosis/evidence split makes the diagnosis decisive while
  recognizing evidence-led investigation.
- Bookmarking is the explicit evidence-selection action; no new parallel
  selection state or data model is introduced.
- Score explanations are deferred to prevent premature answer-key disclosure.
- The only retry is a fresh run, avoiding complicated mutable completion
  transitions and keeping final submission meaningful.
