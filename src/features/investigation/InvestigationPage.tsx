import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { ActionLink } from '../../components/ActionLink'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { IncidentIntro } from './IncidentIntro'
import { InvestigationWorkspace } from './InvestigationWorkspace'
import { loadInvestigationScenario } from './load-investigation'
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
  const controller = useInvestigationController(instance, startedAt)

  return controller.state.status === 'intro' ? (
    <IncidentIntro instance={instance} onBegin={controller.begin} />
  ) : (
    <InvestigationWorkspace instance={instance} controller={controller} />
  )
}
