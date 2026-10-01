import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReadyToDiagnose } from './ReadyToDiagnose'
import { loadInvestigationScenario } from './load-investigation'

function instance() {
  const loaded = loadInvestigationScenario('iam-001')
  if (!loaded.available) throw new Error('Expected IAM-001')
  return loaded.instance
}

describe('ReadyToDiagnose', () => {
  it('focuses and summarizes only the permitted investigation context', () => {
    render(
      <ReadyToDiagnose
        instance={instance()}
        selectedHypothesisId="reporting-service-outage"
        bookmarkedEvidenceIds={['service-status']}
        openedCount={2}
        totalEvidence={5}
        onReturn={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Ready to diagnose' }),
    ).toHaveFocus()
    expect(
      screen.getByText(/reporting service is experiencing an outage/i),
    ).toBeVisible()
    expect(screen.getByText('Service status')).toBeVisible()
    expect(screen.getByText('2 of 5 evidence sources opened')).toBeVisible()
    expect(document.body).not.toHaveTextContent(
      /correct|score|root cause|submit/i,
    )
  })

  it('returns to the investigation without any submission action', () => {
    const onReturn = vi.fn()
    render(
      <ReadyToDiagnose
        instance={instance()}
        selectedHypothesisId="reporting-service-outage"
        bookmarkedEvidenceIds={[]}
        openedCount={1}
        totalEvidence={5}
        onReturn={onReturn}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Return to investigation' }),
    )
    expect(onReturn).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('button', { name: /submit|diagnose|score/i }),
    ).not.toBeInTheDocument()
  })
})
