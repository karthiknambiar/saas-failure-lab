import { useEffect, useRef } from 'react'

import { Button } from '../../components/Button'
import type { DiagnosisResultView } from '../../engine/investigation-selectors'

const outcomeLabels = {
  strong: 'Strong evidence-backed diagnosis',
  partial: 'Partial diagnosis',
  needs_revision: 'Diagnosis needs revision',
} as const

export function DiagnosisResult({
  result,
  onReviewDebrief,
  onStartOver,
}: {
  result: DiagnosisResultView
  onReviewDebrief: () => void
  onStartOver: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => heading.current?.focus(), [])

  return (
    <section
      className="diagnosis-result container"
      aria-labelledby="diagnosis-result-title"
    >
      <p className="eyebrow">Investigation complete</p>
      <h1 id="diagnosis-result-title" ref={heading} tabIndex={-1}>
        Diagnosis submitted
      </h1>
      <dl>
        <div>
          <dt>Submitted diagnosis</dt>
          <dd>{result.selectedHypothesisLabel}</dd>
        </div>
        <div>
          <dt>Total score</dt>
          <dd>{result.total}</dd>
        </div>
      </dl>
      <p className="diagnosis-result__outcome">
        {outcomeLabels[result.outcome]}
      </p>
      <div className="action-row">
        <Button onClick={onReviewDebrief}>Review debrief</Button>
        <Button variant="primary" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </section>
  )
}
