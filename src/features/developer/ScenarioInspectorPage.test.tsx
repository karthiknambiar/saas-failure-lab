import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ScenarioInspectorPage } from './ScenarioInspectorPage'

function renderInspector(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="developer/inspector/:scenarioId"
          element={<ScenarioInspectorPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ScenarioInspectorPage', () => {
  it('shows the composed scenario and authored dependencies for a valid seed', () => {
    renderInspector('/developer/inspector/api-001?seed=lab-api-001-v1-a1b2c3d4')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Scenario Inspector' }),
    ).toBeInTheDocument()
    expect(screen.getByText('api-001')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Evidence dependencies' }),
    ).toBeInTheDocument()
    expect(screen.getByText('http-response')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Hypotheses' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Remediation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Communication' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Debrief' })).toBeInTheDocument()
  })

  it('offers recovery for unknown scenarios without crashing', () => {
    renderInspector('/developer/inspector/missing-001')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Scenario unavailable' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('could not be found')
    expect(
      screen.getByRole('link', { name: 'Browse scenarios' }),
    ).toHaveAttribute('href', '/scenarios')
  })

  it('offers recovery for an invalid seed', () => {
    renderInspector('/developer/inspector/api-001?seed=+++')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Scenario unavailable' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('seed is invalid')
  })
})
