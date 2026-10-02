import { ActionLink } from '../components/ActionLink'
import { Badge } from '../components/Badge'
import { Card } from '../components/Card'
import { getRepositoryDocumentationUrl } from '../config/project'

const promises = [
  'No account required',
  'Free and open source',
  'Runs in your browser',
  'No AI required',
]

const investigationSteps = [
  [
    '01',
    'Establish scope',
    'Clarify impact, blast radius, timing, and what changed.',
  ],
  [
    '02',
    'Collect evidence',
    'Follow the affected workflow and test plausible hypotheses.',
  ],
  [
    '03',
    'Make the call',
    'Choose a diagnosis, safe remediation, and clear customer update.',
  ],
]

const domains = [
  ['Troubleshooting fundamentals', 'Scope, timelines, and recent changes'],
  ['HTTP & APIs', 'Status codes, permissions, and rate limits'],
  ['Identity & access', 'Authentication, authorization, and provisioning'],
  ['Integrations & webhooks', 'Delivery, retries, signatures, and ordering'],
  ['Data & async processing', 'Queues, consistency, and reconciliation'],
  ['Browser & client behavior', 'Cached state, origins, and presentation'],
]

export function LandingPage() {
  const repositoryDocumentationUrl = getRepositoryDocumentationUrl(
    import.meta.env.VITE_REPOSITORY_URL,
  )

  return (
    <>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow">Evidence before assumptions</p>
          <h1 id="hero-title">
            Practice the investigation before it is urgent.
          </h1>
          <p className="hero__summary">
            Diagnose realistic SaaS incidents, make evidence-backed decisions,
            and learn troubleshooting patterns that transfer across products.
          </p>
          <div className="action-row">
            <ActionLink to="/scenarios/iam-001" variant="primary">
              Start an incident
            </ActionLink>
            <ActionLink to="/how-it-works">See how it works</ActionLink>
          </div>
          <ul className="trust-list" aria-label="Product commitments">
            {promises.map((promise) => (
              <li key={promise}>{promise}</li>
            ))}
          </ul>
        </div>
        <Card as="section" className="investigation-preview">
          <p className="eyebrow">Your investigation loop</p>
          <ol>
            {investigationSteps.map(([number, title, description]) => (
              <li key={number}>
                <span className="investigation-preview__number">{number}</span>
                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>
      <section className="section container" aria-labelledby="practice-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Practice across the SaaS stack</p>
            <h2 id="practice-title">Learn where customer symptoms can lead.</h2>
          </div>
          <p>
            Each domain teaches transferable reasoning without depending on one
            vendor's architecture or commands.
          </p>
        </div>
        <div className="domain-grid">
          {domains.map(([title, description], index) => (
            <Card key={title}>
              <Badge tone={index === 0 ? 'accent' : 'neutral'}>
                Domain {String(index + 1).padStart(2, '0')}
              </Badge>
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="section container contribution-panel">
        <div>
          <p className="eyebrow">Built for shared learning</p>
          <h2>Turn real patterns into safe practice.</h2>
          <p>
            Repository documentation explains how shared scenarios will stay
            fictionalized, non-confidential, and safe to learn from.
          </p>
        </div>
        {repositoryDocumentationUrl ? (
          <a
            className="button button--secondary"
            href={repositoryDocumentationUrl}
          >
            Read repository documentation
          </a>
        ) : (
          <p className="contribution-panel__local-note">
            Repository documentation is available in this checkout.
          </p>
        )}
      </section>
    </>
  )
}
