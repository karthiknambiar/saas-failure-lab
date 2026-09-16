import { ActionLink } from '../components/ActionLink'
import { Badge } from '../components/Badge'
import { EvidencePanel } from '../components/EvidencePanel'

const phases = [
  ['Frame the problem', 'Establish impact, scope, timing, and recent changes.'],
  [
    'Investigate deliberately',
    'Open useful evidence and refine a working hypothesis.',
  ],
  [
    'Decide and communicate',
    'Choose a safe response and explain what the evidence supports.',
  ],
  [
    'Learn from the debrief',
    'See the efficient path, red herrings, and transferable lesson.',
  ],
]

export function HowItWorksPage() {
  return (
    <div className="page container">
      <header className="page-header">
        <p className="eyebrow">The learning loop</p>
        <h1>How an investigation works</h1>
        <p>
          A scenario starts with an incomplete customer report. You narrow it by
          deciding which evidence matters before choosing a diagnosis.
        </p>
      </header>
      <div className="how-grid">
        <ol className="phase-list">
          {phases.map(([title, description], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
        <EvidencePanel
          title="Service status"
          metadata={<Badge tone="accent">Example evidence</Badge>}
        >
          <dl className="evidence-values">
            <div>
              <dt>Reporting service</dt>
              <dd>Operational</dd>
            </div>
            <div>
              <dt>Affected users</dt>
              <dd>2 of 84</dd>
            </div>
            <div>
              <dt>First reported</dt>
              <dd>09:18</dd>
            </div>
          </dl>
          <p className="evidence-note">
            Evidence narrows the search. It does not label the correct answer
            for you.
          </p>
        </EvidencePanel>
      </div>
      <ActionLink to="/scenarios" variant="primary">
        Browse scenarios
      </ActionLink>
    </div>
  )
}
