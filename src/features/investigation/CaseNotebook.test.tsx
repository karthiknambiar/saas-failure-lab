import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { InvestigationAction } from '../../engine/investigation-state'
import { CaseNotebook } from './CaseNotebook'
import { loadInvestigationScenario } from './load-investigation'

function instance() {
  const loaded = loadInvestigationScenario('iam-001')
  if (!loaded.available) throw new Error('Expected IAM-001')
  return loaded.instance
}

describe('CaseNotebook', () => {
  it('selects bookmarked observations and authored hypotheses', () => {
    const onSelectEvidence = vi.fn()
    const onSelectHypothesis = vi.fn()

    render(
      <CaseNotebook
        instance={instance()}
        bookmarkedEvidenceIds={['service-status']}
        selectedHypothesisId={undefined}
        actions={[]}
        onSelectEvidence={onSelectEvidence}
        onSelectHypothesis={onSelectHypothesis}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View Service status' }))
    fireEvent.click(
      screen.getByRole('radio', { name: /recent role change removed/i }),
    )

    expect(onSelectEvidence).toHaveBeenCalledWith('service-status')
    expect(onSelectHypothesis).toHaveBeenCalledWith('reporting-role-removed')
  })

  it('renders a safe, semantic action trail', () => {
    const actions: InvestigationAction[] = [
      { sequence: 1, type: 'begin_investigation' },
      {
        sequence: 2,
        type: 'open_evidence',
        evidenceId: 'service-status',
        cost: 1,
      },
      { sequence: 3, type: 'bookmark_evidence', evidenceId: 'service-status' },
      {
        sequence: 4,
        type: 'select_hypothesis',
        hypothesisId: 'reporting-service-outage',
      },
    ]

    render(
      <CaseNotebook
        instance={instance()}
        bookmarkedEvidenceIds={['service-status']}
        selectedHypothesisId="reporting-service-outage"
        actions={actions}
        onSelectEvidence={vi.fn()}
        onSelectHypothesis={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Observations' })).toBeVisible()
    expect(
      screen.getByRole('list', { name: 'Investigation trail' }),
    ).toBeVisible()
    expect(screen.getByText('Opened Service status')).toBeVisible()
    expect(screen.getByText('Bookmarked Service status')).toBeVisible()
    expect(
      screen.getByText(
        /selected hypothesis: the reporting service is experiencing an outage/i,
      ),
    ).toBeVisible()
    expect(document.body).not.toHaveTextContent(
      /critical|supporting|root cause|score/i,
    )
  })
})
