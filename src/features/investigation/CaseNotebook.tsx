import type { InvestigationAction } from '../../engine/investigation-state'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { evidenceLabel } from './investigation-labels'

interface CaseNotebookProps {
  instance: ScenarioInstance
  bookmarkedEvidenceIds: string[]
  selectedHypothesisId?: string
  actions: InvestigationAction[]
  onSelectEvidence: (evidenceId: string) => void
  onSelectHypothesis: (hypothesisId: string) => void
}

export function CaseNotebook({
  instance,
  bookmarkedEvidenceIds,
  selectedHypothesisId,
  actions,
  onSelectEvidence,
  onSelectHypothesis,
}: CaseNotebookProps) {
  function evidenceName(id: string) {
    const evidence = instance.scenario.evidence.find((item) => item.id === id)
    return evidence
      ? evidenceLabel(evidence.id, evidence.tool)
      : evidenceLabel(id)
  }

  function actionLabel(action: InvestigationAction): string {
    if (action.type === 'begin_investigation') return 'Began investigation'
    if (action.type === 'open_evidence') {
      return `Opened ${evidenceName(action.evidenceId)}`
    }
    if (action.type === 'bookmark_evidence') {
      return `Bookmarked ${evidenceName(action.evidenceId)}`
    }
    if (action.type === 'unbookmark_evidence') {
      return `Removed ${evidenceName(action.evidenceId)} bookmark`
    }
    if (action.type === 'select_hypothesis') {
      const hypothesis = instance.scenario.hypotheses.find(
        ({ id }) => id === action.hypothesisId,
      )
      return `Selected hypothesis: ${hypothesis?.label ?? action.hypothesisId}`
    }
    return 'Updated investigation'
  }

  return (
    <div className="case-notebook">
      <section aria-labelledby="observations-title">
        <h3 id="observations-title">Observations</h3>
        {bookmarkedEvidenceIds.length === 0 ? (
          <p>No evidence bookmarked yet.</p>
        ) : (
          <ul>
            {bookmarkedEvidenceIds.map((id) => (
              <li key={id}>
                <button type="button" onClick={() => onSelectEvidence(id)}>
                  View {evidenceName(id)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <fieldset>
        <legend>Current hypothesis</legend>
        {instance.scenario.hypotheses.map((hypothesis) => (
          <label key={hypothesis.id}>
            <input
              type="radio"
              name="current-hypothesis"
              value={hypothesis.id}
              checked={selectedHypothesisId === hypothesis.id}
              onChange={() => onSelectHypothesis(hypothesis.id)}
            />
            <span>{hypothesis.label}</span>
          </label>
        ))}
      </fieldset>

      <section aria-labelledby="trail-title">
        <h3 id="trail-title">Investigation trail</h3>
        {actions.length === 0 ? (
          <p>No investigation actions yet.</p>
        ) : (
          <ol className="investigation-trail" aria-label="Investigation trail">
            {actions.map((action) => (
              <li key={action.sequence}>{actionLabel(action)}</li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
