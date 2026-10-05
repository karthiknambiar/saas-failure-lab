import { useEffect, useRef } from 'react'

import { Button } from '../../components/Button'
import type { DebriefView } from '../../engine/investigation-selectors'

interface DebriefPageProps {
  debrief: DebriefView
  onBackToResult: () => void
  onStartOver: () => void
}

export function DebriefPage({
  debrief,
  onBackToResult,
  onStartOver,
}: DebriefPageProps) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => heading.current?.focus(), [])

  return (
    <section
      className="diagnosis-result container"
      aria-labelledby="debrief-title"
    >
      <p className="eyebrow">Investigation complete</p>
      <h1 id="debrief-title" ref={heading} tabIndex={-1}>
        Debrief
      </h1>

      <section aria-labelledby="debrief-summary-title">
        <h2 id="debrief-summary-title">Your diagnosis</h2>
        <dl>
          <div>
            <dt>Submitted diagnosis</dt>
            <dd>{debrief.submittedDiagnosis}</dd>
          </div>
          <div>
            <dt>Total score</dt>
            <dd>{debrief.score.total} / 100</dd>
          </div>
          <div>
            <dt>Diagnosis</dt>
            <dd>{debrief.score.diagnosisPoints} / 70</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>{debrief.score.evidencePoints} / 30</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="root-cause-title">
        <h2 id="root-cause-title">Root cause explanation</h2>
        <p>{debrief.rootCauseExplanation}</p>
      </section>

      <section aria-labelledby="evidence-chain-title">
        <h2 id="evidence-chain-title">Evidence chain</h2>
        <ol>
          {debrief.evidenceChain.map((evidence) => (
            <li key={evidence.id}>
              <strong>{evidence.label}</strong>
              <p>{evidence.explanation}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="red-herrings-title">
        <h2 id="red-herrings-title">Red herrings</h2>
        {debrief.redHerrings.length === 0 ? (
          <p>No red herrings were selected for this incident.</p>
        ) : (
          <ul>
            {debrief.redHerrings.map((redHerring) => (
              <li key={redHerring.id}>
                <strong>{redHerring.label}</strong>
                <p>{redHerring.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="efficient-path-title">
        <h2 id="efficient-path-title">Efficient investigation path</h2>
        <ol>
          {debrief.efficientPath.map((entry, index) => (
            <li key={`${entry.kind}-${entry.label}-${index}`}>{entry.label}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="transferable-lesson-title">
        <h2 id="transferable-lesson-title">Transferable lesson</h2>
        <p>{debrief.transferableLesson}</p>
      </section>

      <div className="action-row">
        <Button onClick={onBackToResult}>Back to result</Button>
        <Button variant="primary" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </section>
  )
}
