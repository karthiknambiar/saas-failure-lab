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
        onReturn={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Ready to diagnose' }),
    ).toHaveFocus()
    expect(
      screen.getByText(/reporting service is experiencing an outage/i),
    ).toBeVisible()
    expect(screen.getByText('Service status')).toBeVisible()
    expect(document.body).not.toHaveTextContent(/correct|score|root cause/i)
    expect(document.body).not.toHaveTextContent(/evidence sources opened/i)
    expect(document.body).not.toHaveTextContent(/next product milestone/i)
  })

  it('submits the safe confirmation and can return to the investigation', () => {
    const onReturn = vi.fn()
    const onSubmit = vi.fn()
    render(
      <ReadyToDiagnose
        instance={instance()}
        selectedHypothesisId="reporting-service-outage"
        bookmarkedEvidenceIds={[]}
        onReturn={onReturn}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Return to investigation' }),
    )
    expect(onReturn).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Submit diagnosis' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
