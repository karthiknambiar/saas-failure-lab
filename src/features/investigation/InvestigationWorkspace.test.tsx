import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
  afterEach(() => vi.restoreAllMocks())

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
    expect(screen.getByRole('heading', { name: 'Observations' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Ready to diagnose' }),
    ).toBeDisabled()

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
    expect(
      screen.getByRole('button', { name: 'Ready to diagnose' }),
    ).toBeEnabled()
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

  it('uses accessible tabs on mobile and follows evidence selection', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(max-width: 820px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
    renderWorkspace()

    expect(screen.getByRole('tablist')).toHaveAccessibleName(
      'Investigation workspace',
    )
    expect(screen.getByRole('tabpanel', { name: 'Tools' })).toBeVisible()
    expect(
      document.getElementById('workspace-panel-evidence'),
    ).not.toBeVisible()

    fireEvent.click(
      screen.getByRole('button', { name: /open service status.*cost 1/i }),
    )
    expect(screen.getByRole('tab', { name: 'Evidence' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel', { name: 'Evidence' })).toBeVisible()
  })
})
