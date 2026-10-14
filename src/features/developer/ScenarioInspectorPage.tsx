import { Link, useParams, useSearchParams } from 'react-router-dom'

import { inspectScenario } from '../../developer/inspector-model'

function InspectorRecovery({ reason }: { reason: 'unknown' | 'invalid_seed' }) {
  const message =
    reason === 'invalid_seed'
      ? 'The supplied scenario seed is invalid.'
      : 'This scenario could not be found.'

  return (
    <section
      className="page container developer-page"
      aria-labelledby="inspector-recovery-title"
    >
      <h1 id="inspector-recovery-title">Scenario unavailable</h1>
      <p role="status">{message}</p>
      <Link to="/scenarios">Browse scenarios</Link>
    </section>
  )
}

export function ScenarioInspectorPage() {
  const { scenarioId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const result = inspectScenario(
    scenarioId,
    searchParams.get('seed') ?? undefined,
  )

  if (!result.available) return <InspectorRecovery reason={result.reason} />

  const { instance, dependencies } = result
  const { scenario, composition } = instance

  return (
    <section
      className="page container developer-page"
      aria-labelledby="inspector-title"
    >
      <header className="page-header">
        <p className="eyebrow">Developer tool</p>
        <h1 id="inspector-title">Scenario Inspector</h1>
        <p>{scenario.title}</p>
      </header>

      <div className="developer-grid">
        <section className="card">
          <h2>Scenario metadata</h2>
          <dl>
            <dt>Scenario ID</dt>
            <dd>{scenario.id}</dd>
            <dt>Domain</dt>
            <dd>{scenario.domain}</dd>
            <dt>Difficulty</dt>
            <dd>{scenario.difficulty}</dd>
            <dt>Estimated minutes</dt>
            <dd>{scenario.estimated_minutes}</dd>
          </dl>
        </section>
        <section className="card">
          <h2>Composition and variation</h2>
          <dl>
            <dt>Seed</dt>
            <dd>{composition.seed}</dd>
            <dt>Customer name</dt>
            <dd>{composition.customerName}</dd>
            <dt>Timestamp offset minutes</dt>
            <dd>{composition.timestampOffsetMinutes}</dd>
            <dt>Selected red herrings</dt>
            <dd>{composition.selectedRedHerringIds.join(', ') || 'None'}</dd>
          </dl>
        </section>
      </div>

      <section className="developer-dependencies">
        <h2>Evidence dependencies</h2>
        <ul>
          {dependencies.map((dependency) => (
            <li key={dependency.evidenceId}>
              <strong>{dependency.evidenceId}</strong>: unlock after{' '}
              {dependency.unlockAfter.join(', ') || 'nothing'}
            </li>
          ))}
        </ul>
      </section>

      <div className="developer-grid">
        <section>
          <h2>Hypotheses</h2>
          <ul>
            {scenario.hypotheses.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Remediation</h2>
          <ul>
            {scenario.remediation.choices.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Communication</h2>
          <ul>
            {scenario.communication.choices.map((item) => (
              <li key={item.id}>{item.message}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Debrief</h2>
          <p>{scenario.debrief.root_cause_explanation}</p>
          <p>{scenario.debrief.transferable_lesson}</p>
        </section>
      </div>
    </section>
  )
}
