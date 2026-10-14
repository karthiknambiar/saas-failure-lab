import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ScoringSimulatorPage } from './ScoringSimulatorPage'

function renderSimulator(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="developer/scoring/:scenarioId"
          element={<ScoringSimulatorPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

function TransitioningSimulatorRoute() {
  const navigate = useNavigate()

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/developer/scoring/api-001')}
      >
        Load API scenario
      </button>
      <ScoringSimulatorPage />
    </>
  )
}

describe('ScoringSimulatorPage', () => {
  it('scores an authored IAM hypothesis and selected evidence', () => {
    renderSimulator('/developer/scoring/iam-001')

    expect(screen.getByLabelText('Hypothesis')).toBeInTheDocument()
    const evidence = screen.getAllByRole('checkbox')
    expect(evidence.length).toBeGreaterThan(0)
    fireEvent.click(evidence[0])
    fireEvent.click(screen.getByRole('button', { name: 'Simulate score' }))

    expect(
      screen.getByRole('heading', { name: 'Score simulation' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Diagnosis points')).toBeInTheDocument()
    expect(screen.getByText('Evidence points')).toBeInTheDocument()
  })

  it('renders a recovery status for an unknown scenario', () => {
    renderSimulator('/developer/scoring/missing-001')

    expect(screen.getByRole('status')).toHaveTextContent('unavailable')
    expect(
      screen.getByRole('link', { name: 'Browse scenarios' }),
    ).toHaveAttribute('href', '/scenarios')
  })

  it('resets scenario-specific controls and results after a route transition', () => {
    render(
      <MemoryRouter initialEntries={['/developer/scoring/iam-001']}>
        <Routes>
          <Route
            path="developer/scoring/:scenarioId"
            element={<TransitioningSimulatorRoute />}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Simulate score' }))
    expect(
      screen.getByRole('heading', { name: 'Score simulation' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Load API scenario' }))

    expect(screen.getByRole('option', { selected: true })).toHaveTextContent(
      'The scheduled job uses a revoked rotated credential.',
    )
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked()
    expect(
      screen.queryByRole('heading', { name: 'Score simulation' }),
    ).not.toBeInTheDocument()
  })
})
