import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { DailyIncidentPage } from './DailyIncidentPage'
import { dailyPlayableScenarios } from '../investigation/load-investigation'

const scenarios = [
  { id: 'iam-001', version: 1, title: 'Login works, feature does not' },
]

describe('DailyIncidentPage', () => {
  it('renders the UTC incident and its seeded challenge link', () => {
    render(
      <MemoryRouter>
        <DailyIncidentPage
          now={() => new Date('2026-02-03T00:30:00+05:30')}
          scenarios={scenarios}
          baseUrl="/"
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Daily Incident' }),
    ).toHaveFocus()
    expect(screen.getByText('2026-02-02 UTC')).toBeInTheDocument()
    expect(
      screen.getByText('Everyone receives the same daily incident worldwide.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Start daily incident' }),
    ).toHaveAttribute('href', '/scenarios/iam-001?seed=daily-15upv5x')
  })

  it('offers recovery when no playable scenarios are eligible', () => {
    render(
      <MemoryRouter>
        <DailyIncidentPage
          now={() => new Date('2026-02-03T00:00:00Z')}
          scenarios={[]}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Daily Incident unavailable' }),
    ).toHaveFocus()
    expect(
      screen.getByRole('link', { name: 'Browse scenarios' }),
    ).toHaveAttribute('href', '/scenarios')
  })

  it('uses only currently playable scenarios by default', () => {
    expect(dailyPlayableScenarios.map(({ id }) => id)).toEqual(['iam-001'])
    expect(dailyPlayableScenarios.map(({ id }) => id)).not.toContain('fnd-001')
  })

  it('does not duplicate a BrowserRouter basename in the challenge link', () => {
    window.history.pushState({}, '', '/failure-lab/daily')

    render(
      <BrowserRouter basename="/failure-lab">
        <DailyIncidentPage
          now={() => new Date('2026-02-03T00:30:00+05:30')}
          scenarios={scenarios}
          baseUrl="/failure-lab/"
        />
      </BrowserRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Start daily incident' }),
    ).toHaveAttribute(
      'href',
      '/failure-lab/scenarios/iam-001?seed=daily-15upv5x',
    )
  })
})
