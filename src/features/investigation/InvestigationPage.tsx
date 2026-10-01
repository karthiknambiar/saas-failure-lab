import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { ActionLink } from '../../components/ActionLink'
import {
  applyInvestigationCommand,
  createInvestigation,
  InvestigationTransitionError,
} from '../../engine/investigation-engine'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import { IncidentIntro } from './IncidentIntro'
import { loadInvestigationScenario } from './load-investigation'

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
  const [investigation, setInvestigation] = useState(() =>
    createInvestigation(instance, Date.now()),
  )
  const [announcement, setAnnouncement] = useState('')

  function beginInvestigation() {
    try {
      const nextState = applyInvestigationCommand(instance, investigation, {
        type: 'begin_investigation',
      })
      setInvestigation(nextState)
      setAnnouncement('')
    } catch (error) {
      if (error instanceof InvestigationTransitionError) {
        setAnnouncement('Unable to begin the investigation. Try again.')
        return
      }
      throw error
    }
  }

  if (investigation.status === 'investigating') {
    return (
      <section
        className="investigation-workspace page container"
        aria-labelledby="workspace-title"
      >
        <p className="eyebrow">Active incident</p>
        <h1 id="workspace-title">Investigation workspace</h1>
        <p>{instance.scenario.title}</p>
      </section>
    )
  }

  return (
    <>
      <p className="visually-hidden" role="alert" aria-live="assertive">
        {announcement}
      </p>
      <IncidentIntro instance={instance} onBegin={beginInvestigation} />
    </>
  )
}
