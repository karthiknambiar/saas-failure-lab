import { useEffect, useRef } from 'react'

import { Button } from '../../components/Button'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { evidenceLabel } from './investigation-labels'

interface ReadyToDiagnoseProps {
  instance: ScenarioInstance
  selectedHypothesisId: string
  bookmarkedEvidenceIds: string[]
  onReturn: () => void
  onSubmit: () => void
}

export function ReadyToDiagnose({
  instance,
  selectedHypothesisId,
  bookmarkedEvidenceIds,
  onReturn,
  onSubmit,
}: ReadyToDiagnoseProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const hypothesis = instance.scenario.hypotheses.find(
    ({ id }) => id === selectedHypothesisId,
  )

  useEffect(() => heading.current?.focus(), [])

  return (
    <section
      className="ready-checkpoint container"
      aria-labelledby="ready-title"
    >
      <p className="eyebrow">Investigation checkpoint</p>
      <h1 id="ready-title" ref={heading} tabIndex={-1}>
        Ready to diagnose
      </h1>
      <p>
        Review your selected hypothesis and bookmarked evidence before
        submitting.
      </p>
      <dl>
        <div>
          <dt>Current hypothesis</dt>
          <dd>{hypothesis?.label ?? selectedHypothesisId}</dd>
        </div>
      </dl>
      <h2>Bookmarked evidence</h2>
      {bookmarkedEvidenceIds.length === 0 ? (
        <p>No evidence bookmarked.</p>
      ) : (
        <ul>
          {bookmarkedEvidenceIds.map((id) => {
            const evidence = instance.scenario.evidence.find(
              (item) => item.id === id,
            )
            return (
              <li key={id}>
                {evidence
                  ? evidenceLabel(id, evidence.tool)
                  : evidenceLabel(id)}
              </li>
            )
          })}
        </ul>
      )}
      <div className="action-row ready-checkpoint__actions">
        <Button
          variant="primary"
          onClick={onSubmit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
          }}
        >
          Submit diagnosis
        </Button>
        <Button onClick={onReturn}>Return to investigation</Button>
      </div>
    </section>
  )
}
