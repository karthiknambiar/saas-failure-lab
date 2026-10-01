import { useEffect, useRef, type RefObject } from 'react'

import type { ScenarioInstance } from '../../engine/scenario-instance'
import { CaseNotebook } from './CaseNotebook'
import { EvidenceToolList } from './EvidenceToolList'
import { EvidenceViewer } from './EvidenceViewer'
import type { useInvestigationController } from './useInvestigationController'
import type { WorkspaceTab } from './useInvestigationController'
import { useMediaQuery } from './useMediaQuery'
import { WorkspaceTabs } from './WorkspaceTabs'

type Controller = ReturnType<typeof useInvestigationController>

export function InvestigationWorkspace({
  instance,
  controller,
  readyButtonRef,
}: {
  instance: ScenarioInstance
  controller: Controller
  readyButtonRef: RefObject<HTMLButtonElement | null>
}) {
  const evidenceHeading = useRef<HTMLHeadingElement>(null)
  const isMobile = useMediaQuery('(max-width: 820px)')
  const selectedEvidence = controller.evidenceViews.find(
    ({ id }) => id === controller.selectedEvidenceId,
  )

  useEffect(() => {
    if (controller.selectedEvidenceId) evidenceHeading.current?.focus()
  }, [controller.selectedEvidenceId])

  function tabPanelProps(tab: WorkspaceTab) {
    return isMobile
      ? {
          role: 'tabpanel' as const,
          'aria-labelledby': `workspace-tab-${tab}`,
          hidden: controller.activeTab !== tab,
        }
      : {}
  }

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

      {isMobile ? (
        <WorkspaceTabs
          active={controller.activeTab}
          onChange={controller.setActiveTab}
        />
      ) : null}

      <div className="workspace-grid">
        <section
          id="workspace-panel-tools"
          className="workspace-panel"
          aria-labelledby={isMobile ? undefined : 'tools-title'}
          {...tabPanelProps('tools')}
        >
          <h2 id="tools-title">Investigation tools</h2>
          <EvidenceToolList
            evidence={controller.evidenceViews}
            selectedEvidenceId={controller.selectedEvidenceId}
            onOpen={controller.openEvidence}
            onSelect={controller.selectEvidence}
          />
        </section>
        <section
          id="workspace-panel-evidence"
          className="workspace-panel workspace-panel--evidence"
          aria-label={isMobile ? undefined : 'Evidence'}
          {...tabPanelProps('evidence')}
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
        <section
          id="workspace-panel-notebook"
          className="workspace-panel"
          aria-labelledby={isMobile ? undefined : 'notebook-title'}
          {...tabPanelProps('notebook')}
        >
          <h2 id="notebook-title">Case notebook</h2>
          <CaseNotebook
            instance={instance}
            bookmarkedEvidenceIds={controller.state.bookmarkedEvidenceIds}
            selectedHypothesisId={controller.state.selectedHypothesisId}
            actions={controller.state.actions}
            onSelectEvidence={controller.selectEvidence}
            onSelectHypothesis={controller.selectHypothesis}
          />
          <button
            ref={readyButtonRef}
            type="button"
            className="button button--primary"
            disabled={!controller.state.selectedHypothesisId}
            onClick={() => controller.setReady(true)}
          >
            Ready to diagnose
          </button>
        </section>
      </div>
    </article>
  )
}
