import { ActionLink } from '../../components/ActionLink'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import type { ScenarioIndexEntry } from '../../content/normalize-scenario'
import scenarioIndex from '../../generated/scenario-index.json'
import { sentenceCase } from '../investigation/investigation-labels'

const scenarios = scenarioIndex as ScenarioIndexEntry[]

export function ScenarioBrowserPage() {
  return (
    <div className="page container">
      <header className="page-header page-header--split">
        <div>
          <p className="eyebrow">Scenario library</p>
          <h1>Browse troubleshooting scenarios</h1>
        </div>
        <p>Start with a safe, guided troubleshooting scenario.</p>
      </header>
      {scenarios.length > 0 ? (
        scenarios.map((scenario) => (
          <Card as="article" className="scenario-card" key={scenario.id}>
            <div className="scenario-card__metadata">
              <Badge tone="accent">{sentenceCase(scenario.domain)}</Badge>
              <Badge>{sentenceCase(scenario.difficulty)}</Badge>
              <span>{scenario.estimatedMinutes} minutes</span>
            </div>
            <h2>{scenario.title}</h2>
            <p>{scenario.symptomSummary}</p>
            <ul className="scenario-card__concepts" aria-label="Concepts">
              {scenario.concepts.map((concept) => (
                <li key={concept}>{sentenceCase(concept)}</li>
              ))}
            </ul>
            <ActionLink to={`/scenarios/${scenario.id}`} variant="primary">
              {`Open ${scenario.title}`}
            </ActionLink>
          </Card>
        ))
      ) : (
        <p role="status">No scenarios are available yet.</p>
      )}
    </div>
  )
}
