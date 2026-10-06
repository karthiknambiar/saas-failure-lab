import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DiagnosisResult } from './DiagnosisResult'

describe('DiagnosisResult', () => {
  it.each([
    ['strong', 'Strong evidence-backed diagnosis'],
    ['partial', 'Partial diagnosis'],
    ['needs_revision', 'Diagnosis needs revision'],
  ] as const)(
    'renders the %s outcome as safe submitted context',
    (outcome, label) => {
      render(
        <DiagnosisResult
          result={{
            selectedHypothesisId: 'role-change',
            selectedHypothesisLabel: 'A recent role change removed access',
            total: 72,
            outcome,
          }}
          onReviewDebrief={vi.fn()}
          onStartOver={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('heading', { name: 'Diagnosis submitted' }),
      ).toHaveFocus()
      expect(
        screen.getByText('A recent role change removed access'),
      ).toBeVisible()
      expect(screen.getByText('72')).toBeVisible()
      expect(screen.getByText(label)).toBeVisible()
      expect(document.body).not.toHaveTextContent(
        /role-change|threshold|breakdown|correct answer|root cause|critical|supporting|red herring|remediation|communication/i,
      )
    },
  )

  it('starts a fresh investigation', () => {
    const onStartOver = vi.fn()
    render(
      <DiagnosisResult
        result={{
          selectedHypothesisId: 'role-change',
          selectedHypothesisLabel: 'A recent role change removed access',
          total: 72,
          outcome: 'strong',
        }}
        onReviewDebrief={vi.fn()}
        onStartOver={onStartOver}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(onStartOver).toHaveBeenCalledOnce()
  })

  it('offers a review-debrief action', () => {
    const onReviewDebrief = vi.fn()
    render(
      <DiagnosisResult
        result={{
          selectedHypothesisId: 'role-change',
          selectedHypothesisLabel: 'A recent role change removed access',
          total: 72,
          outcome: 'strong',
        }}
        onReviewDebrief={onReviewDebrief}
        onStartOver={vi.fn()}
      />,
    )

    const review = screen.getByRole('button', { name: 'Review debrief' })
    review.focus()
    fireEvent.click(review)

    expect(onReviewDebrief).toHaveBeenCalledOnce()
  })
})
