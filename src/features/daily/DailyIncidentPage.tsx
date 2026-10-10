import { useEffect, useRef } from 'react'

import { ActionLink } from '../../components/ActionLink'
import {
  getDailyIncident,
  getUtcCalendarDate,
  type DailyPlayableScenario,
} from '../../sharing/daily-incident'
import { buildChallengeLink } from '../../sharing/share-link'
import { dailyPlayableScenarios } from '../investigation/load-investigation'

export interface DailyIncidentPageProps {
  now?: () => Date
  scenarios?: readonly DailyPlayableScenario[]
  baseUrl?: string
}

function toRouterChallengePath(challengeUrl: string, baseUrl: string): string {
  const basePath = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '')

  return basePath && challengeUrl.startsWith(`${basePath}/`)
    ? challengeUrl.slice(basePath.length)
    : challengeUrl
}

export function DailyIncidentPage({
  now = () => new Date(),
  scenarios = dailyPlayableScenarios,
  baseUrl = import.meta.env.BASE_URL,
}: DailyIncidentPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const utcDate = getUtcCalendarDate(now())
  const incident = getDailyIncident(utcDate, scenarios)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  if (!incident) {
    return (
      <section className="page container" aria-labelledby="daily-title">
        <h1 id="daily-title" ref={headingRef} tabIndex={-1}>
          Daily Incident unavailable
        </h1>
        <ActionLink to="/scenarios" variant="primary">
          Browse scenarios
        </ActionLink>
      </section>
    )
  }

  const scenario = scenarios.find(({ id }) => id === incident.scenarioId)
  if (!scenario) return null
  const challengeUrl = buildChallengeLink({
    baseUrl,
    scenarioId: incident.scenarioId,
    seed: incident.seed,
  })

  return (
    <section className="page container" aria-labelledby="daily-title">
      <header className="page-header">
        <p className="eyebrow">{incident.utcDate} UTC</p>
        <h1 id="daily-title" ref={headingRef} tabIndex={-1}>
          Daily Incident
        </h1>
        <p>Everyone receives the same daily incident worldwide.</p>
      </header>
      <h2>{scenario.title}</h2>
      <ActionLink
        to={toRouterChallengePath(challengeUrl, baseUrl)}
        variant="primary"
      >
        Start daily incident
      </ActionLink>
    </section>
  )
}
