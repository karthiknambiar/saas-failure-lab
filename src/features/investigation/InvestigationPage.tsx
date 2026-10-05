import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ActionLink } from '../../components/ActionLink'
import { getDiagnosisResultView } from '../../engine/investigation-selectors'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { IncidentIntro } from './IncidentIntro'
import { DiagnosisResult } from './DiagnosisResult'
import { InvestigationWorkspace } from './InvestigationWorkspace'
import { loadInvestigationScenario } from './load-investigation'
import { ReadyToDiagnose } from './ReadyToDiagnose'
import { useInvestigationController } from './useInvestigationController'

function ScenarioRecovery({ unavailable }: { unavailable: boolean }) {
  return (
    <section
      className="page container scenario-recovery"
      aria-labelledby="recovery-title"
    >
      <p className="eyebrow">Scenario unavailable</p>
      <h1 id="recovery-title">
        {unavailable
          ? 'This scenario is not playable yet.'
          : 'This scenario could not be found.'}
      </h1>
      <ActionLink to="/scenarios" variant="primary">
        Browse scenarios
      </ActionLink>
    </section>
  )
}

export function InvestigationPage() {
  const { scenarioId = '' } = useParams()
  const loadedScenario = loadInvestigationScenario(scenarioId)

  if (!loadedScenario.available) {
    return (
      <ScenarioRecovery unavailable={loadedScenario.reason === 'unavailable'} />
    )
  }

  return <PlayableInvestigation instance={loadedScenario.instance} />
}

function PlayableInvestigation({ instance }: { instance: ScenarioInstance }) {
  const [startedAt] = useState(Date.now)
  const readyButtonRef = useRef<HTMLButtonElement>(null)
  const restoreReadyFocus = useRef(false)
  const controller = useInvestigationController(instance, startedAt)

  useEffect(() => {
    if (!controller.ready && restoreReadyFocus.current) {
      readyButtonRef.current?.focus()
      restoreReadyFocus.current = false
    }
  }, [controller.ready])

  if (controller.state.status === 'intro') {
    return <IncidentIntro instance={instance} onBegin={controller.begin} />
  }

  if (controller.state.status === 'completed') {
    return (
      <DiagnosisResult
        result={getDiagnosisResultView(instance, controller.state)}
        onStartOver={controller.startOver}
      />
    )
  }

  if (controller.ready && controller.state.selectedHypothesisId) {
    return (
      <ReadyToDiagnose
        instance={instance}
        selectedHypothesisId={controller.state.selectedHypothesisId}
        bookmarkedEvidenceIds={controller.state.bookmarkedEvidenceIds}
        onReturn={() => {
          restoreReadyFocus.current = true
          controller.setReady(false)
        }}
        onSubmit={controller.submitDiagnosis}
      />
    )
  }

  return (
    <InvestigationWorkspace
      instance={instance}
      controller={controller}
      readyButtonRef={readyButtonRef}
    />
  )
}
