# Investigation UX Clarity Design

## Goal

Remove two misleading investigation affordances without changing scenario scoring,
evidence unlocking, or the diagnosis requirement.

## Decisions

1. Evidence in a scenario without `investigation_budget` will be labelled
   **Effort N**, because opening it does not consume a balance. Evidence in a
   budgeted scenario will retain **Cost N**.
2. A player must still select a hypothesis before proceeding to the existing
   ready-to-diagnose checkpoint. The button remains disabled until then.
3. While disabled, the notebook will show an explicit instruction, "Select a
   hypothesis to continue." The button will reference that instruction through
   `aria-describedby`, and shared button styling will visibly communicate its
   disabled state.
4. The existing checkpoint, submit, scoring, and progress-persistence paths
   remain unchanged.

## Implementation boundary

The view layer receives whether the scenario has an authored budget and chooses
the label from that fact. No YAML scenario content changes are required. Tests
will cover both label variants and the disabled/enabled diagnosis affordance.

## Verification

- Component tests demonstrate **Effort** for budget-free and **Cost** for
  budgeted evidence.
- Workspace tests demonstrate the explanatory message and its removal after a
  hypothesis is selected.
- Existing investigation-page tests continue to prove checkpoint and submission
  transitions.
