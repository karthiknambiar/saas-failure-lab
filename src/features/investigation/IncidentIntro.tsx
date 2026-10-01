import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { evidenceLabel, sentenceCase } from './investigation-labels'

interface IncidentIntroProps {
  instance: ScenarioInstance
  onBegin: () => void
}

export function IncidentIntro({ instance, onBegin }: IncidentIntroProps) {
  const { scenario, composition } = instance
  const toolNames = [
    ...new Map(
      scenario.evidence.map(({ id, tool }) => [tool, evidenceLabel(id, tool)]),
    ).entries(),
  ]

  return (
    <section
      className="incident-intro page container"
      aria-labelledby="incident-title"
    >
      <header className="incident-intro__header">
        <div>
          <p className="eyebrow">Incident #{scenario.id.toUpperCase()}</p>
          <h1 id="incident-title">{scenario.title}</h1>
        </div>
        <div className="incident-intro__badges" aria-label="Incident details">
          <Badge tone="accent">{sentenceCase(scenario.brief.severity)}</Badge>
          <Badge>{scenario.estimated_minutes} minutes</Badge>
        </div>
      </header>

      <div className="incident-intro__grid">
        <Card as="section" className="incident-intro__brief">
          <h2>What is happening</h2>
          <dl className="incident-intro__details">
            <div>
              <dt>Customer</dt>
              <dd>{composition.customerName}</dd>
            </div>
            <div>
              <dt>Severity</dt>
              <dd>{sentenceCase(scenario.brief.severity)}</dd>
            </div>
            <div>
              <dt>Estimated time</dt>
              <dd>{scenario.estimated_minutes} minutes</dd>
            </div>
          </dl>
          {scenario.investigation_budget !== undefined ? (
            <p className="incident-intro__budget">
              Starting budget: {scenario.investigation_budget}
            </p>
          ) : null}
          <h3>Symptom</h3>
          <p>{scenario.brief.symptom}</p>
          <h3>Business impact</h3>
          <p>{scenario.brief.business_impact}</p>
        </Card>

        <div className="incident-intro__context">
          <Card as="section">
            <h2>Customer context</h2>
            {scenario.customer_context.map((context) => (
              <p key={context}>{context}</p>
            ))}
          </Card>
          <Card as="section">
            <h2>Available tools</h2>
            <ul className="incident-intro__tools">
              {toolNames.map(([tool, label]) => (
                <li key={tool}>{label}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="incident-intro__action">
        <button
          className="button button--primary"
          type="button"
          onClick={onBegin}
        >
          Begin investigation
        </button>
      </div>
    </section>
  )
}
