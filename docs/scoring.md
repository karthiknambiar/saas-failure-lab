# Scoring and completed-run debrief

Milestone 7 scores a submitted diagnosis deterministically in the browser:

- **70 points:** the submitted diagnosis matches the scenario's authored diagnosis.
- **30 points:** the share of unique critical evidence items the learner bookmarked,
  rounded to the nearest whole point.

The result is a safe summary: submitted diagnosis, total score, and a broad
outcome. After a completed submission, learners may open a debrief with the
70-point diagnosis and 30-point evidence components plus authored explanations
for that completed incident: root cause, evidence chain, seed-selected red
herrings, efficient investigation path, and transferable lesson. This is a
safe engine projection rather than UI-owned scoring logic. Scores and the
transient result/debrief view are in-memory only and reset when the
investigation restarts or the page refreshes.

Remediation, communication, and efficiency are not yet scored; no backend or
persistence is part of this milestone.
