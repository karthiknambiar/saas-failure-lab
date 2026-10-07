import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { loadInvestigationScenario } from './load-investigation'
import { InvestigationPage, PlayableInvestigation } from './InvestigationPage'
import { IncidentIntro } from './IncidentIntro'
import { evidenceLabel, sentenceCase } from './investigation-labels'
import type { StorageLike } from '../../progress/browser-progress-storage'
import { PROGRESS_STORAGE_KEY } from '../../progress/browser-progress-storage'

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()
  setCalls = 0

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.setCalls += 1
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function iamInstance() {
  const loaded = loadInvestigationScenario('iam-001')
  if (!loaded.available) throw new Error('Expected IAM-001 to be available')
  return loaded.instance
}

function renderPlayable(storage: StorageLike, now = () => 1_700_000_000_000) {
  return render(
    <PlayableInvestigation
      instance={iamInstance()}
      storage={storage}
      now={now}
    />,
  )
}

function submitIamDiagnosis() {
  fireEvent.click(screen.getByRole('button', { name: 'Begin investigation' }))
  fireEvent.click(
    screen.getByRole('radio', {
      name: /recent role change removed the affected users/i,
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Ready to diagnose' }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit diagnosis' }))
}

function renderInvestigation(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/scenarios/:scenarioId" element={<InvestigationPage />} />
        <Route path="/scenarios" element={<h1>Browse scenarios</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

function RouteSwitcher() {
  const navigate = useNavigate()

  return (
    <>
      <button type="button" onClick={() => navigate('/scenarios/iam-001')}>
        Open IAM
      </button>
      <Routes>
        <Route path="/scenarios/:scenarioId" element={<InvestigationPage />} />
      </Routes>
    </>
  )
}

describe('InvestigationPage', () => {
  it('persists the terminal IAM diagnosis exactly once across result navigation and rerenders', () => {
    const storage = new MemoryStorage()
    const view = renderPlayable(storage)

    submitIamDiagnosis()

    expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? '')).toEqual({
      version: 1,
      completedRuns: [
        {
          scenarioId: 'iam-001',
          completedAt: 1_700_000_000_000,
          submittedHypothesisId: 'reporting-role-removed',
          score: { total: 70, diagnosisPoints: 70, evidencePoints: 0 },
        },
      ],
    })
    expect(storage.setCalls).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Review debrief' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to result' }))
    view.rerender(
      <PlayableInvestigation
        instance={iamInstance()}
        storage={storage}
        now={() => 1_700_000_000_000}
      />,
    )

    expect(storage.setCalls).toBe(1)
  })

  it('does not save unfinished work or duplicate a saved completion on start over', () => {
    const storage = new MemoryStorage()
    renderPlayable(storage)

    fireEvent.click(screen.getByRole('button', { name: 'Begin investigation' }))
    expect(storage.setCalls).toBe(0)
    expect(
      screen.queryByRole('button', { name: 'Submit diagnosis' }),
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('radio', {
        name: /recent role change removed the affected users/i,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ready to diagnose' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit diagnosis' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))

    expect(storage.setCalls).toBe(1)
  })

  it('resets a completed run when the playable scenario changes', () => {
    const storage = new MemoryStorage()
    const view = renderPlayable(storage)

    submitIamDiagnosis()
    const nextInstance = structuredClone(iamInstance())
    nextInstance.scenario.id = 'another-scenario'

    view.rerender(
      <PlayableInvestigation
        instance={nextInstance}
        storage={storage}
        now={() => 1_700_000_000_001}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Begin investigation' }),
    ).toBeVisible()
    expect(storage.setCalls).toBe(1)
  })

  it('keeps the completed result visible when progress saving fails', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('storage blocked')
      },
      removeItem: () => undefined,
    }

    renderPlayable(storage)
    submitIamDiagnosis()

    expect(
      screen.getByRole('heading', { name: 'Diagnosis submitted' }),
    ).toBeVisible()
  })

  it('introduces IAM-001 with only safe incident information and begins work', () => {
    renderInvestigation('/scenarios/iam-001')

    expect(
      screen.getByRole('heading', { name: 'Login works, feature does not' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Two finance users cannot complete month-end reporting while their reporting access is unavailable.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Service status')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('bulk cleanup removed')
    expect(document.body).not.toHaveTextContent(/relevance|debrief|root cause/i)
    expect(document.body).not.toHaveTextContent(
      /critical|supporting|red herring/i,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Begin investigation' }))

    expect(
      screen.getByRole('heading', { name: 'Login works, feature does not' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['/scenarios/fnd-001', 'This scenario is not playable yet.'],
    ['/scenarios/missing-001', 'This scenario could not be found.'],
  ])('recovers unavailable routes at %s', (path, message) => {
    renderInvestigation(path)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Browse scenarios' }),
    ).toHaveAttribute('href', '/scenarios')
  })

  it('can navigate from an unavailable scenario to IAM-001', () => {
    render(
      <MemoryRouter initialEntries={['/scenarios/fnd-001']}>
        <RouteSwitcher />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open IAM' }))

    expect(
      screen.getByRole('heading', { name: 'Login works, feature does not' }),
    ).toBeInTheDocument()
  })

  it('navigates between a submitted result and its debrief, then starts a fresh run', () => {
    renderInvestigation('/scenarios/iam-001')
    fireEvent.click(screen.getByRole('button', { name: 'Begin investigation' }))
    fireEvent.click(
      screen.getByRole('radio', {
        name: /recent role change removed the affected users/i,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ready to diagnose' }))

    expect(
      screen.getByRole('heading', { name: 'Ready to diagnose' }),
    ).toHaveFocus()
    fireEvent.click(
      screen.getByRole('button', { name: 'Return to investigation' }),
    )
    expect(
      screen.getByRole('button', { name: 'Ready to diagnose' }),
    ).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Case notebook' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Ready to diagnose' }))
    const submit = screen.getByRole('button', { name: 'Submit diagnosis' })
    submit.focus()
    fireEvent.keyDown(submit, { key: 'Enter' })

    expect(
      screen.getByRole('heading', { name: 'Diagnosis submitted' }),
    ).toHaveFocus()
    expect(screen.getByText('Strong evidence-backed diagnosis')).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Investigation tools' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ready to diagnose' }),
    ).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(2)
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(document.body).not.toHaveTextContent(
      /root cause|critical|supporting|red herring|remediation|communication/i,
    )

    const review = screen.getByRole('button', { name: 'Review debrief' })
    review.focus()
    fireEvent.click(review)

    expect(screen.getByRole('heading', { name: 'Debrief' })).toHaveFocus()
    expect(
      screen.queryByRole('heading', { name: 'Diagnosis submitted' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Investigation tools' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ready to diagnose' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to result' }))
    expect(
      screen.getByRole('heading', { name: 'Diagnosis submitted' }),
    ).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Review debrief' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(
      screen.getByRole('heading', { name: 'Login works, feature does not' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Debrief' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Begin investigation' }))
    fireEvent.click(
      screen.getByRole('radio', {
        name: /reporting service is experiencing an outage/i,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ready to diagnose' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit diagnosis' }))

    expect(
      screen.getByText('The reporting service is experiencing an outage.'),
    ).toBeVisible()
    expect(
      screen.queryByText(
        "A recent role change removed the affected users' reporting authorization.",
      ),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review debrief' }))
    expect(screen.getByRole('heading', { name: 'Debrief' })).toHaveFocus()
    expect(
      screen.getByText('The reporting service is experiencing an outage.'),
    ).toBeVisible()
    expect(
      screen.queryByText(
        "A recent role change removed the affected users' reporting authorization.",
      ),
    ).not.toBeInTheDocument()
  })
})

describe('IncidentIntro', () => {
  it('shows a supplied starting budget', () => {
    const scenario = loadInvestigationScenario('iam-001')
    if (!scenario.available) throw new Error('Expected IAM-001 to be available')
    const instance = structuredClone(scenario.instance)
    instance.scenario.investigation_budget = 7

    render(<IncidentIntro instance={instance} onBegin={() => undefined} />)

    expect(screen.getByText('Starting budget: 7')).toBeInTheDocument()
  })
})

describe('investigation labels', () => {
  it('renders known evidence labels and sentence-cases an unmapped tool', () => {
    expect(sentenceCase('role-configuration')).toBe('Role configuration')
    expect(sentenceCase('authentication_events')).toBe('Authentication events')
    expect(evidenceLabel('affected-user-scope')).toBe('Affected user scope')
    expect(evidenceLabel('authentication-events')).toBe('Authentication events')
    expect(evidenceLabel('role-audit-history')).toBe('Role audit history')
    expect(evidenceLabel('role-configuration')).toBe('Role configuration')
    expect(evidenceLabel('service-status')).toBe('Service status')
    expect(evidenceLabel('unmapped-id', 'identity_events')).toBe(
      'Identity events',
    )
  })
})
