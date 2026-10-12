import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  simulateScore,
  type ScoreSimulationResult,
} from '../../developer/scoring-simulator-model'
import { scenarioCatalog } from '../../generated/scenario-catalog'

export function ScoringSimulatorPage() {
  const { scenarioId = '' } = useParams()
  const scenario = scenarioCatalog.find(
    (candidate) => candidate.id === scenarioId,
  )
  const [hypothesisId, setHypothesisId] = useState(
    scenario?.hypotheses[0]?.id ?? '',
  )
  const [evidenceIds, setEvidenceIds] = useState<readonly string[]>([])
  const [result, setResult] = useState<ScoreSimulationResult | undefined>()

  if (!scenario) {
    return (
      <section
        className="page container developer-page"
        aria-labelledby="simulator-recovery-title"
      >
        <h1 id="simulator-recovery-title">Scoring Simulator unavailable</h1>
        <p role="status">This scenario is unavailable.</p>
        <Link to="/scenarios">Browse scenarios</Link>
      </section>
    )
  }

  const toggleEvidence = (evidenceId: string) => {
    setEvidenceIds((current) =>
      current.includes(evidenceId)
        ? current.filter((id) => id !== evidenceId)
        : [...current, evidenceId],
    )
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResult(
      simulateScore({
        scenarioId: scenario.id,
        selectedHypothesisId: hypothesisId,
        bookmarkedEvidenceIds: evidenceIds,
      }),
    )
  }

  return (
    <section
      className="page container developer-page"
      aria-labelledby="simulator-title"
    >
      <header className="page-header">
        <p className="eyebrow">Developer tool</p>
        <h1 id="simulator-title">Scoring Simulator</h1>
        <p>{scenario.title}</p>
      </header>
      <form className="developer-controls" onSubmit={submit}>
        <label htmlFor="hypothesis">Hypothesis</label>
        <select
          id="hypothesis"
          value={hypothesisId}
          onChange={(event) => setHypothesisId(event.target.value)}
        >
          {scenario.hypotheses.map((hypothesis) => (
            <option key={hypothesis.id} value={hypothesis.id}>
              {hypothesis.label}
            </option>
          ))}
        </select>
        <fieldset>
          <legend>Bookmarked evidence</legend>
          {scenario.evidence.map((evidence) => (
            <label key={evidence.id}>
              <input
                type="checkbox"
                checked={evidenceIds.includes(evidence.id)}
                onChange={() => toggleEvidence(evidence.id)}
              />
              {evidence.id}: {evidence.explanation}
            </label>
          ))}
        </fieldset>
        <button className="button button--primary" type="submit">
          Simulate score
        </button>
      </form>
      {result?.available && (
        <section className="developer-score" aria-labelledby="score-title">
          <h2 id="score-title">Score simulation</h2>
          <dl>
            <dt>Total</dt>
            <dd>{result.score.total}</dd>
            <dt>Diagnosis points</dt>
            <dd>{result.score.diagnosisPoints}</dd>
            <dt>Evidence points</dt>
            <dd>{result.score.evidencePoints}</dd>
          </dl>
        </section>
      )}
      {result && !result.available && (
        <p role="status">The submitted selection is unavailable.</p>
      )}
    </section>
  )
}
