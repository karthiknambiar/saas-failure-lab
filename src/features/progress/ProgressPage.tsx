import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { ActionLink } from '../../components/ActionLink'
import { scenarioCatalog } from '../../generated/scenario-catalog'
import {
  clearBrowserProgress,
  loadBrowserProgress,
  type BrowserProgressWriteResult,
  type LoadBrowserProgressResult,
} from '../../progress/browser-progress-storage'
import { emptyProgress } from '../../progress/progress-codec'
import {
  getProgressSummary,
  type ProgressSummary,
} from '../../progress/progress-model'
import type { Progress } from '../../progress/progress-types'

const playableScenarios = scenarioCatalog.map(({ id, title }) => ({
  id,
  title,
}))

export interface ProgressAdapter {
  load(): LoadBrowserProgressResult
  clear(): BrowserProgressWriteResult
}

const browserProgressAdapter: ProgressAdapter = {
  load: loadBrowserProgress,
  clear: clearBrowserProgress,
}

export interface ProgressPageProps {
  summary: ProgressSummary
  notice?: 'recovered' | 'unavailable'
  onReset: () => BrowserProgressWriteResult
  headingRef?: RefObject<HTMLHeadingElement | null>
}

export function ProgressRoute({
  adapter = browserProgressAdapter,
}: {
  adapter?: ProgressAdapter
}) {
  const [loadedProgress] = useState(() => adapter.load())
  const [progress, setProgress] = useState<Progress>(loadedProgress.progress)
  const [notice, setNotice] = useState<'recovered' | 'unavailable' | undefined>(
    loadedProgress.notice,
  )
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const summary = useMemo(
    () => getProgressSummary(progress, playableScenarios),
    [progress],
  )

  return (
    <ProgressPage
      summary={summary}
      notice={notice}
      headingRef={headingRef}
      onReset={() => {
        const result = adapter.clear()
        if (result.ok) {
          setProgress(emptyProgress())
          setNotice(undefined)
        }
        return result
      }}
    />
  )
}

export function ProgressPage({
  summary,
  notice,
  onReset,
  headingRef,
}: ProgressPageProps) {
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetStatus, setResetStatus] = useState<
    'success' | 'unavailable' | undefined
  >()
  const resetStatusRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (resetStatus) {
      resetStatusRef.current?.focus()
    }
  }, [resetStatus])

  const scenarioTitleById = new Map(
    summary.scenarioCards.map((scenario) => [
      scenario.scenarioId,
      scenario.title,
    ]),
  )

  function confirmReset() {
    const result = onReset()
    if (result.ok) {
      setConfirmingReset(false)
      setResetStatus('success')
      return
    }

    setConfirmingReset(false)
    setResetStatus('unavailable')
  }

  return (
    <div className="page container progress-page">
      <header className="page-header progress-page__header">
        <p className="eyebrow">Learning history</p>
        <h1 ref={headingRef} tabIndex={-1}>
          Your progress
        </h1>
        <p>
          Your completed scenarios and diagnostic scores stay in this browser.
        </p>
      </header>

      {notice === 'recovered' ? (
        <p className="progress-notice" role="status">
          Progress was recovered from invalid saved data.
        </p>
      ) : null}
      {notice === 'unavailable' ? (
        <p className="progress-notice" role="status">
          Progress is unavailable in this browser.
        </p>
      ) : null}
      {resetStatus === 'success' ? (
        <p
          className="progress-notice"
          role="status"
          tabIndex={-1}
          ref={resetStatusRef}
        >
          Progress reset.
        </p>
      ) : null}
      {resetStatus === 'unavailable' ? (
        <p
          className="progress-notice"
          ref={resetStatusRef}
          role="status"
          tabIndex={-1}
        >
          Progress is unavailable, so reset could not be completed.
        </p>
      ) : null}

      <section aria-labelledby="progress-summary-heading">
        <h2 id="progress-summary-heading">Summary</h2>
        <dl className="progress-summary">
          <div>
            <dt>Completed scenarios</dt>
            <dd>{summary.completedScenarioCount}</dd>
          </div>
          {summary.completedScenarioCount > 0 ? (
            <>
              <div>
                <dt>Average score</dt>
                <dd>{summary.averageTotalScore}</dd>
              </div>
              <div>
                <dt>Best score</dt>
                <dd>{summary.bestTotalScore}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </section>

      {summary.recentRuns.length === 0 ? (
        <section
          className="progress-empty"
          aria-labelledby="progress-empty-heading"
        >
          <h2 id="progress-empty-heading">No completed scenarios yet</h2>
          <p>
            Complete a scenario to see your learning history and achievements
            here.
          </p>
          <ActionLink to="/scenarios" variant="primary">
            Browse scenarios
          </ActionLink>
        </section>
      ) : (
        <section aria-labelledby="recent-runs-heading">
          <h2 id="recent-runs-heading">Recent completed runs</h2>
          <ol className="progress-list" aria-label="Recent completed runs">
            {summary.recentRuns.map((run) => (
              <li
                key={`${run.scenarioId}-${run.completedAt}`}
                className="card progress-run"
              >
                <h3>
                  {scenarioTitleById.get(run.scenarioId) ?? run.scenarioId}
                </h3>
                <p>Score: {run.score.total}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="scenario-progress-heading">
        <h2 id="scenario-progress-heading">Scenario progress</h2>
        <ul className="progress-list" aria-label="Scenario progress">
          {summary.scenarioCards.map((scenario) => (
            <li key={scenario.scenarioId} className="card progress-scenario">
              <h3>{scenario.title}</h3>
              <p>{scenario.completed ? 'Completed' : 'Not complete'}</p>
              {scenario.bestTotalScore !== undefined ? (
                <p>Best score: {scenario.bestTotalScore}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="achievements-heading">
        <h2 id="achievements-heading">Achievements</h2>
        <ul className="progress-list progress-achievements">
          {summary.achievements.map((achievement) => (
            <li key={achievement.id} className="card">
              <h3>{achievement.title}</h3>
              <p>{achievement.criteria}</p>
              <p>{achievement.unlocked ? 'Unlocked' : 'Locked'}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="progress-reset"
        aria-labelledby="reset-progress-heading"
      >
        <h2 id="reset-progress-heading">Reset saved progress</h2>
        {confirmingReset ? (
          <div className="progress-reset__confirmation">
            <p>This removes saved progress from this browser only.</p>
            <div className="action-row">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                type="button"
                onClick={confirmReset}
              >
                Confirm reset
              </button>
            </div>
          </div>
        ) : (
          <button
            className="button button--secondary"
            type="button"
            onClick={() => setConfirmingReset(true)}
          >
            Reset progress
          </button>
        )}
      </section>
    </div>
  )
}
