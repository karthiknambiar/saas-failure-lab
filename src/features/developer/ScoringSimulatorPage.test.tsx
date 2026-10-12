import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
})
