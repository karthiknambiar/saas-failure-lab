import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import globalCss from '../../design/global.css?raw'
import type { ProgressSummary } from '../../progress/progress-model'
import { ProgressPage, ProgressRoute } from './ProgressPage'

const emptySummary: ProgressSummary = {
  completedScenarioCount: 0,
  averageTotalScore: 0,
  bestTotalScore: 0,
  recentRuns: [],
  scenarioCards: [
    {
      scenarioId: 'fnd-001',
      title: 'One user cannot access a feature',
      completed: false,
    },
  ],
  achievements: [
    {
      id: 'first-completion',
      title: 'First completion',
      criteria: 'Complete at least one scenario.',
      unlocked: false,
    },
    {
      id: 'perfect-diagnosis',
      title: 'Perfect diagnosis',
      criteria: 'Earn a total score of 100 on a completed run.',
      unlocked: false,
    },
    {
      id: 'scenario-explorer',
      title: 'Scenario explorer',
      criteria: 'Complete runs in at least two distinct scenarios.',
      unlocked: false,
    },
  ],
}

const populatedSummary: ProgressSummary = {
  ...emptySummary,
  completedScenarioCount: 2,
  averageTotalScore: 88,
  bestTotalScore: 100,
  recentRuns: [
    {
      scenarioId: 'fnd-001',
      completedAt: 1_726_000_000_000,
      submittedHypothesisId: 'forecasting-entitlement-missing',
      score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
    },
  ],
  scenarioCards: [
    {
      scenarioId: 'fnd-001',
      title: 'One user cannot access a feature',
      completed: true,
      bestTotalScore: 100,
    },
    {
      scenarioId: 'iam-001',
      title: 'Login works, feature does not',
      completed: true,
      bestTotalScore: 76,
    },
  ],
  achievements: [
    { ...emptySummary.achievements[0], unlocked: true },
    { ...emptySummary.achievements[1], unlocked: true },
    { ...emptySummary.achievements[2], unlocked: true },
  ],
}

function renderPage(
  props: Partial<React.ComponentProps<typeof ProgressPage>> = {},
) {
  return render(
    <MemoryRouter>
      <ProgressPage
        summary={emptySummary}
        onReset={() => ({ ok: true })}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('ProgressPage', () => {
  it('shows a meaningful empty state and every locked achievement', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your progress' }),
    ).toHaveAttribute('tabindex', '-1')
    expect(screen.getByText('No completed scenarios yet')).toBeInTheDocument()
    expect(screen.queryByText('Average score')).not.toBeInTheDocument()
    expect(screen.queryByText('Best score')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Browse scenarios' }),
    ).toHaveAttribute('href', '/scenarios')
    for (const achievement of emptySummary.achievements) {
      const achievementCard = screen
        .getByRole('heading', { level: 3, name: achievement.title })
        .closest('li')
      expect(achievementCard).toHaveTextContent(achievement.title)
      expect(screen.getByText(achievement.criteria)).toBeInTheDocument()
      expect(achievementCard).toHaveTextContent(achievement.criteria)
      expect(achievementCard).toHaveTextContent('Locked')
    }
    expect(screen.getAllByText('Locked')).toHaveLength(3)
  })

  it('renders a semantic populated summary, recent runs, scenario progress, and achievements', () => {
    renderPage({ summary: populatedSummary })

    expect(screen.getByText('Completed scenarios')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Average score')).toBeInTheDocument()
    expect(screen.getByText('88')).toBeInTheDocument()
    expect(screen.getByText('Best score')).toBeInTheDocument()
    expect(screen.getAllByText('100')).not.toHaveLength(0)
    expect(
      screen.getByRole('list', { name: 'Recent completed runs' }),
    ).toHaveTextContent('One user cannot access a feature')
    expect(
      screen.getByRole('list', { name: 'Scenario progress' }),
    ).toHaveTextContent('Completed')
    expect(screen.getAllByText('Unlocked')).toHaveLength(3)
  })

  it('shows a nonblocking storage notice', () => {
    renderPage({ notice: 'recovered' })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Progress was recovered',
    )
  })

  it('confirms reset inline and cancellation keeps the current view', () => {
    const onReset = vi.fn(() => ({ ok: true }) as const)
    renderPage({ summary: populatedSummary, onReset })

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    expect(
      screen.getByText('This removes saved progress from this browser only.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onReset).not.toHaveBeenCalled()
    expect(
      screen.getAllByText('One user cannot access a feature'),
    ).not.toHaveLength(0)
    expect(
      screen.queryByRole('button', { name: 'Confirm reset' }),
    ).not.toBeInTheDocument()
  })

  it('announces and focuses successful reset', () => {
    const onReset = vi.fn(() => ({ ok: true }) as const)
    renderPage({ onReset })

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }))

    const status = screen.getByRole('status')
    expect(onReset).toHaveBeenCalledOnce()
    expect(status).toHaveTextContent('Progress reset')
    expect(status).toHaveFocus()
  })

  it('keeps visible progress and reports unavailable when reset fails', () => {
    renderPage({
      summary: populatedSummary,
      onReset: () => ({ ok: false, notice: 'unavailable' }),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Progress is unavailable',
    )
    expect(screen.getByRole('status')).toHaveFocus()
    expect(
      screen.getAllByText('One user cannot access a feature'),
    ).not.toHaveLength(0)
  })

  it('loads the route once through an injected adapter', () => {
    const adapter = {
      load: vi.fn(() => ({
        progress: { version: 1 as const, completedRuns: [] },
      })),
      clear: vi.fn(() => ({ ok: true }) as const),
    }

    render(
      <MemoryRouter>
        <ProgressRoute adapter={adapter} />
      </MemoryRouter>,
    )

    expect(adapter.load).toHaveBeenCalledOnce()
    expect(screen.getByText('No completed scenarios yet')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your progress' }),
    ).toHaveFocus()
  })

  it('clears the injected route state only after a successful reset', () => {
    const adapter = {
      load: vi.fn(() => ({
        progress: {
          version: 1 as const,
          completedRuns: [
            {
              scenarioId: 'fnd-001',
              completedAt: 1_726_000_000_000,
              submittedHypothesisId: 'forecasting-entitlement-missing',
              score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
            },
          ],
        },
      })),
      clear: vi.fn(() => ({ ok: true }) as const),
    }

    render(
      <MemoryRouter>
        <ProgressRoute adapter={adapter} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Average score')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }))

    expect(adapter.clear).toHaveBeenCalledOnce()
    expect(screen.getByText('No completed scenarios yet')).toBeInTheDocument()
    expect(screen.queryByText('Average score')).not.toBeInTheDocument()
  })

  it('uses an auto-fit progress summary that can reflow at a 320px viewport', () => {
    expect(globalCss).toMatch(
      /\.progress-summary\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,/s,
    )
    expect(globalCss).not.toMatch(
      /\.progress-summary\s*,\s*\.progress-list\s*\{[^}]*repeat\(3,/s,
    )
  })
})
