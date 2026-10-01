import { useEffect, useRef } from 'react'

import type { ScenarioInstance } from '../../engine/scenario-instance'
import { EvidenceToolList } from './EvidenceToolList'
import { EvidenceViewer } from './EvidenceViewer'
import type { useInvestigationController } from './useInvestigationController'

type Controller = ReturnType<typeof useInvestigationController>

export function InvestigationWorkspace({
  instance,
  controller,
}: {
  instance: ScenarioInstance
  controller: Controller
}) {
  const evidenceHeading = useRef<HTMLHeadingElement>(null)
  const selectedEvidence = controller.evidenceViews.find(
    ({ id }) => id === controller.selectedEvidenceId,
  )

  useEffect(() => {
    if (controller.selectedEvidenceId) evidenceHeading.current?.focus()
  }, [controller.selectedEvidenceId])

  return (
    <article className="investigation" aria-labelledby="investigation-title">
      <header className="investigation__header">
        <div>
          <p className="eyebrow">
            Incident #{instance.scenario.id.toUpperCase()}
          </p>
          <h1 id="investigation-title">{instance.scenario.title}</h1>
          <p>{instance.composition.customerName}</p>
        </div>
        <dl className="investigation__metrics">
          <div>
            <dt>Opened</dt>
            <dd>
              {controller.state.openedEvidenceIds.length}/
              {controller.evidenceViews.length}
            </dd>
          </div>
          {controller.state.budgetRemaining === undefined ? null : (
            <div>
              <dt>Budget</dt>
              <dd>{controller.state.budgetRemaining}</dd>
            </div>
          )}
        </dl>
      </header>
      <p className="investigation__impact">
        {instance.scenario.brief.business_impact}
      </p>
      <p className="visually-hidden" role="alert">
        {controller.error}
      </p>

      <div className="workspace-grid">
        <section className="workspace-panel" aria-labelledby="tools-title">
          <h2 id="tools-title">Investigation tools</h2>
          <EvidenceToolList
            evidence={controller.evidenceViews}
            selectedEvidenceId={controller.selectedEvidenceId}
            onOpen={controller.openEvidence}
            onSelect={controller.selectEvidence}
          />
        </section>
        <section
          className="workspace-panel workspace-panel--evidence"
          aria-label="Evidence"
        >
          <EvidenceViewer
            ref={evidenceHeading}
            evidence={selectedEvidence}
            bookmarked={
              selectedEvidence
                ? controller.state.bookmarkedEvidenceIds.includes(
                    selectedEvidence.id,
                  )
                : false
            }
            onToggleBookmark={controller.toggleBookmark}
          />
        </section>
        <section className="workspace-panel" aria-labelledby="notebook-title">
          <h2 id="notebook-title">Case notebook</h2>
          <p>
            Bookmark observations and select a hypothesis as you investigate.
          </p>
          <fieldset className="notebook-hypothesis">
            <legend>Current hypothesis</legend>
            {instance.scenario.hypotheses.map((hypothesis) => (
              <label key={hypothesis.id}>
                <input
                  type="radio"
                  name="current-hypothesis"
                  value={hypothesis.id}
                  checked={
                    controller.state.selectedHypothesisId === hypothesis.id
                  }
                  onChange={() => controller.selectHypothesis(hypothesis.id)}
                />
                <span>{hypothesis.label}</span>
              </label>
            ))}
          </fieldset>
        </section>
      </div>
    </article>
  )
}
