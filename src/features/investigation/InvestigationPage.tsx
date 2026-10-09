import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { ActionLink } from '../../components/ActionLink'
import {
  getDebriefView,
  getDiagnosisResultView,
} from '../../engine/investigation-selectors'
import type { ScenarioInstance } from '../../engine/scenario-instance'
import {
  loadBrowserProgress,
  saveBrowserProgress,
  type StorageLike,
} from '../../progress/browser-progress-storage'
import { recordCompletedRun } from '../../progress/progress-model'
import {
  copyChallengeLink,
  downloadShareCard,
  shareChallenge,
} from '../../sharing/browser-share'
import { createShareChallengePayload } from '../../sharing/share-link'
import type { ShareChallengeActions } from '../sharing/ShareChallengePanel'
import { IncidentIntro } from './IncidentIntro'
import { DebriefPage } from './DebriefPage'
import { DiagnosisResult } from './DiagnosisResult'
import { InvestigationWorkspace } from './InvestigationWorkspace'
import { loadInvestigationScenario } from './load-investigation'
import { ReadyToDiagnose } from './ReadyToDiagnose'
import { useInvestigationController } from './useInvestigationController'

const shareActions: ShareChallengeActions = {
  share: shareChallenge,
  copy: copyChallengeLink,
  download: downloadShareCard,
}

function ScenarioRecovery({
  reason,
}: {
  reason: 'unknown' | 'unavailable' | 'invalid_seed'
}) {
  const title =
    reason === 'invalid_seed'
      ? 'Invalid challenge link'
      : reason === 'unavailable'
        ? 'This scenario is not playable yet.'
        : 'This scenario could not be found.'

  return (
    <section
      className="page container scenario-recovery"
      aria-labelledby="recovery-title"
    >
      <p className="eyebrow">Scenario unavailable</p>
      <h1 id="recovery-title">{title}</h1>
      <ActionLink to="/scenarios" variant="primary">
        Browse scenarios
      </ActionLink>
    </section>
  )
}

export function InvestigationPage() {
  const { scenarioId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const loadedScenario = loadInvestigationScenario(
    scenarioId,
    undefined,
    searchParams.get('seed') ?? undefined,
  )

  if (!loadedScenario.available) {
    return <ScenarioRecovery reason={loadedScenario.reason} />
  }

  return <PlayableInvestigation instance={loadedScenario.instance} />
}

interface PlayableInvestigationProps {
  instance: ScenarioInstance
  storage?: StorageLike
  now?: () => number
}

export function PlayableInvestigation({
  instance,
  storage,
  now,
}: PlayableInvestigationProps) {
  return (
    <PlayableInvestigationRun
      key={`${instance.scenario.id}:${instance.composition.seed}`}
      instance={instance}
      storage={storage}
      now={now}
    />
  )
}

function PlayableInvestigationRun({
  instance,
  storage,
  now = Date.now,
}: PlayableInvestigationProps) {
  const [startedAt] = useState(now)
  const [showDebrief, setShowDebrief] = useState(false)
  const readyButtonRef = useRef<HTMLButtonElement>(null)
  const restoreReadyFocus = useRef(false)
  const pendingCompletionAt = useRef<number | undefined>(undefined)
  const persistedCompletionKey = useRef<string | undefined>(undefined)
  const controller = useInvestigationController(instance, startedAt)

  useEffect(() => {
    const completedAt = pendingCompletionAt.current
    const submission = controller.state.submission
    if (
      controller.state.status !== 'completed' ||
      !submission ||
      completedAt === undefined
    ) {
      return
    }

    const completionKey = `${instance.scenario.id}:${completedAt}`
    if (persistedCompletionKey.current === completionKey) return
    persistedCompletionKey.current = completionKey

    const progress = loadBrowserProgress(storage).progress
    saveBrowserProgress(
      recordCompletedRun(progress, {
        scenarioId: instance.scenario.id,
        completedAt,
        submittedHypothesisId: submission.selectedHypothesisId,
        score: submission.score,
      }),
      storage,
    )
  }, [controller.state, instance.scenario.id, storage])

  useEffect(() => {
    if (!controller.ready && restoreReadyFocus.current) {
      readyButtonRef.current?.focus()
      restoreReadyFocus.current = false
    }
  }, [controller.ready])

  const startOver = () => {
    setShowDebrief(false)
    pendingCompletionAt.current = undefined
    persistedCompletionKey.current = undefined
    controller.startOver()
  }

  const submitDiagnosis = () => {
    const accepted = controller.submitDiagnosis()
    if (accepted) pendingCompletionAt.current = now()
    return accepted
  }

  if (controller.state.status === 'intro') {
    return <IncidentIntro instance={instance} onBegin={controller.begin} />
  }

  if (controller.state.status === 'completed') {
    const debrief = getDebriefView(instance, controller.state)
    const shareChallengePayload = createShareChallengePayload(
      instance,
      debrief,
      import.meta.env.BASE_URL,
    )

    if (showDebrief) {
      return (
        <DebriefPage
          debrief={debrief}
          shareChallenge={shareChallengePayload}
          shareActions={shareActions}
          onBackToResult={() => setShowDebrief(false)}
          onStartOver={startOver}
        />
      )
    }

    return (
      <DiagnosisResult
        result={getDiagnosisResultView(instance, controller.state)}
        shareChallenge={shareChallengePayload}
        shareActions={shareActions}
        onReviewDebrief={() => setShowDebrief(true)}
        onStartOver={startOver}
      />
    )
  }

  if (controller.ready && controller.state.selectedHypothesisId) {
    return (
      <ReadyToDiagnose
        instance={instance}
        selectedHypothesisId={controller.state.selectedHypothesisId}
        bookmarkedEvidenceIds={controller.state.bookmarkedEvidenceIds}
        onReturn={() => {
          restoreReadyFocus.current = true
          controller.setReady(false)
        }}
        onSubmit={submitDiagnosis}
      />
    )
  }

  return (
    <InvestigationWorkspace
      instance={instance}
      controller={controller}
      readyButtonRef={readyButtonRef}
    />
  )
}
