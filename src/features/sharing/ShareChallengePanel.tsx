import { useState } from 'react'

import { Button } from '../../components/Button'
import type { ShareActionResult } from '../../sharing/browser-share'
import type { ShareChallengePayload } from '../../sharing/share-types'

type ShareAction = (
  payload: ShareChallengePayload,
) => Promise<ShareActionResult>

export interface ShareChallengeActions {
  share: ShareAction
  copy: ShareAction
  download: ShareAction
}

interface ShareChallengePanelProps {
  payload: ShareChallengePayload
  actions: ShareChallengeActions
}

type ActionName = keyof ShareChallengeActions

const failureLabels: Record<ActionName, string> = {
  share: 'share challenge',
  copy: 'copy challenge link',
  download: 'download share card',
}

function statusMessage(action: ActionName, result: ShareActionResult): string {
  if (result.ok) {
    return {
      share: 'Challenge shared.',
      copy: 'Challenge link copied.',
      download: 'Share card downloaded.',
    }[action]
  }

  if (result.reason === 'unavailable') {
    return {
      share: 'Sharing is unavailable.',
      copy: 'Copying challenge links is unavailable.',
      download: 'Downloading share cards is unavailable.',
    }[action]
  }

  return {
    share: 'Unable to share challenge.',
    copy: 'Unable to copy challenge link.',
    download: 'Unable to download share card.',
  }[action]
}

export function ShareChallengePanel({
  payload,
  actions,
}: ShareChallengePanelProps) {
  const [inFlight, setInFlight] = useState<ActionName | undefined>()
  const [status, setStatus] = useState('')

  const runAction = async (action: ActionName) => {
    if (inFlight) return

    setInFlight(action)
    try {
      const result = await actions[action](payload)
      setStatus(statusMessage(action, result))
    } catch {
      setStatus(`Unable to ${failureLabels[action]}.`)
    } finally {
      setInFlight(undefined)
    }
  }

  return (
    <section
      className="share-challenge"
      aria-labelledby="share-challenge-title"
    >
      <h2 id="share-challenge-title">Share this challenge</h2>
      <div className="share-challenge__preview">
        <p className="share-challenge__title">{payload.title}</p>
        <p className="share-challenge__completed">Completed challenge</p>
        <dl className="share-challenge__scores">
          <div>
            <dt>Total score /100</dt>
            <dd>{payload.score.total} / 100</dd>
          </div>
          <div>
            <dt>Diagnosis</dt>
            <dd>Diagnosis: {payload.score.diagnosisPoints} / 70</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>Evidence: {payload.score.evidencePoints} / 30</dd>
          </div>
        </dl>
        <p>This link lets others attempt the same scenario variation.</p>
      </div>
      <div className="share-challenge__actions">
        <Button
          disabled={Boolean(inFlight)}
          onClick={() => void runAction('share')}
        >
          Share challenge
        </Button>
        <Button
          disabled={Boolean(inFlight)}
          onClick={() => void runAction('copy')}
        >
          Copy challenge link
        </Button>
        <Button
          disabled={Boolean(inFlight)}
          onClick={() => void runAction('download')}
        >
          Download share card
        </Button>
      </div>
      <p className="share-challenge__status" role="status">
        {status}
      </p>
    </section>
  )
}
