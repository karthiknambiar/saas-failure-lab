import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ShareChallengePayload } from '../../sharing/share-types'
import { DiagnosisResult } from './DiagnosisResult'

const shareChallenge: ShareChallengePayload = {
  scenarioId: 'iam-001',
  scenarioVersion: 1,
  seed: 'seed-123',
  title: 'Login works, feature does not',
  score: { total: 70, diagnosisPoints: 70, evidencePoints: 0 },
  challengeUrl: '/scenarios/iam-001?seed=seed-123',
}

const shareActions = {
  share: vi.fn().mockResolvedValue({ ok: true }),
  copy: vi.fn().mockResolvedValue({ ok: true }),
  download: vi.fn().mockResolvedValue({ ok: true }),
}

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

  it('integrates a safe completed challenge sharing panel', () => {
    render(
      <DiagnosisResult
        result={{
          selectedHypothesisId: 'role-change',
          selectedHypothesisLabel: 'A recent role change removed access',
          total: 70,
          outcome: 'strong',
        }}
        shareChallenge={shareChallenge}
        shareActions={shareActions}
        onReviewDebrief={vi.fn()}
        onStartOver={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Share this challenge' }),
    ).toBeVisible()
    expect(screen.getByText('70 / 100')).toBeVisible()
    expect(document.body).not.toHaveTextContent(/root cause|correct answer/i)
  })
})
