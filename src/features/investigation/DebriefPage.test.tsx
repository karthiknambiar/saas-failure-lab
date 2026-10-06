import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DebriefView } from '../../engine/investigation-selectors'
import { DebriefPage } from './DebriefPage'

const debrief: DebriefView = {
  submittedDiagnosis: 'A recent role change removed access',
  score: {
    total: 100,
    diagnosisPoints: 70,
    evidencePoints: 30,
  },
  rootCauseExplanation:
    'The user retained the expected group membership, but a role change removed the required permission.',
  evidenceChain: [
    {
      id: 'service-status',
      label: 'Service status',
      explanation:
        'The service status remained healthy throughout the incident.',
    },
    {
      id: 'audit-log',
      label: 'Audit log',
      explanation: 'The audit log records the permission change.',
    },
  ],
  redHerrings: [
    {
      id: 'vpn-event',
      label: 'VPN event',
      explanation: 'The VPN event did not affect the application permission.',
    },
  ],
  efficientPath: [
    { kind: 'framework_step', label: 'Establish impact' },
    { kind: 'evidence', label: 'Audit log' },
  ],
  transferableLesson:
    'Verify effective permissions after role changes instead of relying on group membership alone.',
}

function renderDebrief(overrides: Partial<DebriefView> = {}) {
  const onBackToResult = vi.fn()
  const onStartOver = vi.fn()
  render(
    <DebriefPage
      debrief={{ ...debrief, ...overrides }}
      onBackToResult={onBackToResult}
      onStartOver={onStartOver}
    />,
  )
  return { onBackToResult, onStartOver }
}

describe('DebriefPage', () => {
  it('renders the completed debrief with semantic sections and ordered content', () => {
    renderDebrief()

    const heading = screen.getByRole('heading', { name: 'Debrief', level: 1 })
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(heading).toHaveFocus()
    expect(screen.getByText(debrief.submittedDiagnosis)).toBeVisible()
    expect(screen.getByText('100 / 100')).toBeVisible()
    expect(screen.getByText('70 / 70')).toBeVisible()
    expect(screen.getByText('30 / 30')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Root cause explanation' }),
    ).toBeVisible()
    expect(screen.getByText(debrief.rootCauseExplanation)).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Evidence chain' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Red herrings' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Efficient investigation path' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Transferable lesson' }),
    ).toBeVisible()
    expect(screen.getByText(debrief.transferableLesson)).toBeVisible()

    const orderedLists = screen
      .getAllByRole('list')
      .filter((list) => list.tagName === 'OL')
    expect(orderedLists).toHaveLength(2)
    expect(orderedLists[0]).toHaveTextContent(
      'Service statusThe service status remained healthy throughout the incident.Audit logThe audit log records the permission change.',
    )
    expect(orderedLists[1]).toHaveTextContent('Establish impactAudit log')

    const unorderedList = screen
      .getAllByRole('list')
      .find((list) => list.tagName === 'UL')
    expect(unorderedList).toHaveTextContent(
      'VPN eventThe VPN event did not affect the application permission.',
    )
  })

  it('uses native buttons for the result and reset actions', () => {
    const { onBackToResult, onStartOver } = renderDebrief()
    const back = screen.getByRole('button', { name: 'Back to result' })
    const startOver = screen.getByRole('button', { name: 'Start over' })

    fireEvent.click(back)
    fireEvent.click(startOver)

    expect(onBackToResult).toHaveBeenCalledOnce()
    expect(onStartOver).toHaveBeenCalledOnce()
  })

  it('explains when the incident had no selected red herrings', () => {
    renderDebrief({ redHerrings: [] })

    const redHerringsSection = screen
      .getByRole('heading', { name: 'Red herrings' })
      .closest('section')
    if (!redHerringsSection) throw new Error('Expected red herrings section')

    expect(
      screen.getByText('No red herrings were selected for this incident.'),
    ).toBeVisible()
    expect(within(redHerringsSection).queryByRole('list')).toBeNull()
  })
})
