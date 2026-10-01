import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { InvestigationPage } from './InvestigationPage'

function renderWorkspace() {
  const rendered = render(
    <MemoryRouter initialEntries={['/scenarios/iam-001']}>
      <Routes>
        <Route path="scenarios/:scenarioId" element={<InvestigationPage />} />
      </Routes>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Begin investigation' }))
  return rendered
}

describe('InvestigationWorkspace', () => {
  it('renders the three labelled desktop regions with a safe empty viewer', () => {
    renderWorkspace()

    expect(
      screen.getByRole('region', { name: 'Investigation tools' }),
    ).toBeVisible()
    expect(screen.getByRole('region', { name: 'Evidence' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Case notebook' })).toBeVisible()
    expect(
      screen.getByText(
        'Open an available investigation tool to inspect its evidence.',
      ),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /bookmark/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Bookmark observations and select a hypothesis as you investigate.',
      ),
    ).toBeVisible()

    fireEvent.click(
      screen.getByRole('radio', {
        name: /recent role change removed the affected users/i,
      }),
    )
    expect(
      screen.getByRole('radio', {
        name: /recent role change removed the affected users/i,
      }),
    ).toBeChecked()
  })

  it('opens available evidence, unlocks dependencies, and marks the selected tool', () => {
    renderWorkspace()

    expect(
      screen.getByRole('button', { name: /authentication events.*locked/i }),
    ).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: /open affected user scope.*cost 1/i }),
    )

    expect(
      screen.getByRole('heading', { name: 'Affected user scope' }),
    ).toHaveFocus()
    expect(
      screen.getByRole('button', {
        name: /open authentication events.*cost 2/i,
      }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /view affected user scope.*opened/i }),
    ).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('table')).toBeVisible()
  })

  it('only renders selected opened evidence and preserves selection across tool switches', () => {
    renderWorkspace()
    fireEvent.click(
      screen.getByRole('button', { name: /open service status.*cost 1/i }),
    )
    expect(
      screen.getByText(/reporting and identity services are healthy/i),
    ).toBeVisible()

    fireEvent.click(
      screen.getByRole('button', { name: /open affected user scope.*cost 1/i }),
    )
    expect(screen.getByRole('table')).toBeVisible()
    expect(
      screen.queryByText(/reporting and identity services are healthy/i),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /view service status.*opened/i }),
    )
    expect(
      screen.getByText(/reporting and identity services are healthy/i),
    ).toBeVisible()
  })

  it('shows a bookmark control only for opened evidence and routes its toggles through the engine', () => {
    renderWorkspace()

    expect(
      screen.queryByRole('button', { name: /bookmark/i }),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: /open service status.*cost 1/i }),
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Bookmark Service status' }),
    )
    expect(
      screen.getByRole('button', { name: 'Remove Service status bookmark' }),
    ).toBeVisible()

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Service status bookmark' }),
    )
    expect(
      screen.getByRole('button', { name: 'Bookmark Service status' }),
    ).toBeVisible()
  })

  it('does not render hidden evidence content or solution metadata', () => {
    const { container } = renderWorkspace()
    fireEvent.click(
      screen.getByRole('button', { name: /open service status.*cost 1/i }),
    )
    const serialized = container.textContent ?? ''

    expect(serialized).not.toMatch(/supporting|critical|red_herring/i)
    expect(serialized).not.toContain(
      'Healthy services make a platform-wide outage less likely',
    )
    expect(serialized).not.toContain('bulk cleanup removed')
    expect(serialized).not.toContain('Two affected finance users')
  })
})
