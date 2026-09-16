import { ActionLink } from '../../components/ActionLink'
import { Card } from '../../components/Card'

export function ScenarioBrowserPage() {
  return (
    <div className="page container">
      <header className="page-header page-header--split">
        <div>
          <p className="eyebrow">Scenario library</p>
          <h1>Browse troubleshooting scenarios</h1>
        </div>
        <p>
          Explore incidents by domain and difficulty after validated scenario
          content arrives in Milestone 2.
        </p>
      </header>
      <Card
        as="section"
        className="filter-panel"
        aria-labelledby="filter-title"
      >
        <div className="filter-panel__heading">
          <h2 id="filter-title">Find an incident</h2>
          <p id="filter-help" role="status">
            Filters become available when validated scenarios are added.
          </p>
        </div>
        <div className="filter-grid" aria-describedby="filter-help">
          <label>
            <span>Search scenarios</span>
            <input
              type="search"
              disabled
              placeholder="Search by title or concept"
            />
          </label>
          <label>
            <span>Domain</span>
            <select disabled defaultValue="all">
              <option value="all">All domains</option>
            </select>
          </label>
          <label>
            <span>Difficulty</span>
            <select disabled defaultValue="all">
              <option value="all">All difficulties</option>
            </select>
          </label>
        </div>
      </Card>
      <section className="empty-state" aria-labelledby="empty-state-title">
        <p className="empty-state__number" aria-hidden="true">
          00
        </p>
        <div>
          <h2 id="empty-state-title">The scenario shelf is being prepared.</h2>
          <p>
            Milestone 1 establishes the accessible browsing experience. The YAML
            content pipeline and first validated scenarios belong to Milestone
            2.
          </p>
          <ActionLink to="/how-it-works">
            Learn how investigations work
          </ActionLink>
        </div>
      </section>
    </div>
  )
}
