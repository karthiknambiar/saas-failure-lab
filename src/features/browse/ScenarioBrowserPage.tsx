import { ActionLink } from '../../components/ActionLink'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import type { ScenarioIndexEntry } from '../../content/normalize-scenario'
import scenarioIndex from '../../generated/scenario-index.json'
import { sentenceCase } from '../investigation/investigation-labels'

const scenarios = scenarioIndex as ScenarioIndexEntry[]
const iamScenario = scenarios.find(({ id }) => id === 'iam-001')

export function ScenarioBrowserPage() {
  return (
    <div className="page container">
      <header className="page-header page-header--split">
        <div>
          <p className="eyebrow">Scenario library</p>
          <h1>Browse troubleshooting scenarios</h1>
        </div>
        <p>Start with a safe, guided identity and access incident.</p>
      </header>
      {iamScenario ? (
        <Card as="article" className="scenario-card">
          <div className="scenario-card__metadata">
            <Badge tone="accent">{sentenceCase(iamScenario.domain)}</Badge>
            <Badge>{sentenceCase(iamScenario.difficulty)}</Badge>
            <span>{iamScenario.estimatedMinutes} minutes</span>
          </div>
          <h2>{iamScenario.title}</h2>
          <p>{iamScenario.symptomSummary}</p>
          <ul className="scenario-card__concepts" aria-label="Concepts">
            {iamScenario.concepts.map((concept) => (
              <li key={concept}>{sentenceCase(concept)}</li>
            ))}
          </ul>
          <ActionLink to="/scenarios/iam-001" variant="primary">
            Open Login works, feature does not
          </ActionLink>
        </Card>
      ) : (
        <p role="status">The available scenario could not be loaded.</p>
      )}
    </div>
  )
}
