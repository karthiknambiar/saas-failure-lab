import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import type { ShareChallengePayload } from '../../sharing/share-types'
import { ShareChallengePanel } from './ShareChallengePanel'

const payload: ShareChallengePayload = {
  scenarioId: 'iam-001',
  scenarioVersion: 1,
  seed: 'seed-123',
  title: 'Login works, feature does not',
  score: { total: 70, diagnosisPoints: 70, evidencePoints: 0 },
  challengeUrl: '/scenarios/iam-001?seed=seed-123',
}

function renderPanel(actions = {}) {
  const share = vi.fn().mockResolvedValue({ ok: true })
  const copy = vi.fn().mockResolvedValue({ ok: true })
  const download = vi.fn().mockResolvedValue({ ok: true })
  render(
    <ShareChallengePanel
      payload={payload}
      actions={{ share, copy, download, ...actions }}
    />,
  )
  return { share, copy, download }
}

describe('ShareChallengePanel', () => {
  it('renders only the safe completed challenge preview and native actions', () => {
    renderPanel()

    expect(
      screen.getByRole('heading', { name: 'Share this challenge' }),
    ).toBeVisible()
    expect(screen.getByText(payload.title)).toBeVisible()
    expect(screen.getByText('Completed challenge')).toBeVisible()
    expect(screen.getByText('Total score /100')).toBeVisible()
    expect(screen.getByText('70 / 100')).toBeVisible()
    expect(screen.getByText('Diagnosis: 70 / 70')).toBeVisible()
    expect(screen.getByText('Evidence: 0 / 30')).toBeVisible()
    expect(
      screen.getByText(
        'This link lets others attempt the same scenario variation.',
      ),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Share challenge' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Copy challenge link' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Download share card' }),
    ).toBeVisible()
    expect(
      screen.getByText(payload.title).closest('.share-challenge__preview'),
    ).not.toBeNull()
    expect(document.body).not.toHaveTextContent(payload.challengeUrl)
    expect(JSON.stringify(payload)).not.toMatch(
      /rootCause|evidenceChain|debrief|relevance|actions|bookmark|remediation|communication/i,
    )
  })

  it.each([
    ['Share challenge', 'share', { ok: true }, 'Challenge shared.'],
    ['Copy challenge link', 'copy', { ok: true }, 'Challenge link copied.'],
    ['Download share card', 'download', { ok: true }, 'Share card downloaded.'],
    [
      'Share challenge',
      'share',
      { ok: false, reason: 'unavailable' },
      'Sharing is unavailable.',
    ],
    [
      'Copy challenge link',
      'copy',
      { ok: false, reason: 'unavailable' },
      'Copying challenge links is unavailable.',
    ],
    [
      'Download share card',
      'download',
      { ok: false, reason: 'unavailable' },
      'Downloading share cards is unavailable.',
    ],
    [
      'Share challenge',
      'share',
      { ok: false, reason: 'failed' },
      'Unable to share challenge.',
    ],
    [
      'Copy challenge link',
      'copy',
      { ok: false, reason: 'failed' },
      'Unable to copy challenge link.',
    ],
    [
      'Download share card',
      'download',
      { ok: false, reason: 'failed' },
      'Unable to download share card.',
    ],
  ] as const)(
    '%s maps action results to a status',
    async (button, action, result, message) => {
      const actions = {
        share: vi.fn().mockResolvedValue(result),
        copy: vi.fn().mockResolvedValue(result),
        download: vi.fn().mockResolvedValue(result),
      }
      render(<ShareChallengePanel payload={payload} actions={actions} />)

      fireEvent.click(screen.getByRole('button', { name: button }))

      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(message),
      )
      expect(actions[action]).toHaveBeenCalledWith(payload)
    },
  )

  it('disables an in-flight action and prevents duplicate clicks', async () => {
    let resolve!: (value: { ok: true }) => void
    const share = vi.fn(
      () =>
        new Promise<{ ok: true }>((done) => {
          resolve = done
        }),
    )
    renderPanel({ share })

    const button = screen.getByRole('button', { name: 'Share challenge' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(button).toBeDisabled()
    expect(share).toHaveBeenCalledOnce()
    resolve({ ok: true })
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it('keeps the panel mounted when an injected action throws', async () => {
    const copy = vi.fn().mockRejectedValue(new Error('clipboard blocked'))
    renderPanel({ copy })

    fireEvent.click(screen.getByRole('button', { name: 'Copy challenge link' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Unable to copy challenge link.',
      ),
    )
    expect(
      screen.getByRole('heading', { name: 'Share this challenge' }),
    ).toBeVisible()
  })

  it('keeps the panel content within the 320px responsive layout contract', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/design/global.css'),
      'utf8',
    )

    expect(css).toContain('@media (max-width: 320px)')
    expect(css).toMatch(/\.share-challenge__preview\s*\{[^}]*min-width:\s*0/s)
    expect(css).toMatch(/\.share-challenge__actions\s*\{[^}]*min-width:\s*0/s)
  })
})
