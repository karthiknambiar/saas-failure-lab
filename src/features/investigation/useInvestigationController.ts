import { useMemo, useState } from 'react'

import {
  applyInvestigationCommand,
  createInvestigation,
  InvestigationTransitionError,
} from '../../engine/investigation-engine'
import { getInvestigationEvidenceViews } from '../../engine/investigation-selectors'
import type {
  InvestigationCommand,
  InvestigationState,
} from '../../engine/investigation-state'
import type { ScenarioInstance } from '../../engine/scenario-instance'

type Transition = typeof applyInvestigationCommand

export type WorkspaceTab = 'tools' | 'evidence' | 'notebook'

export function useInvestigationController(
  instance: ScenarioInstance,
  startedAt: number,
  transition: Transition = applyInvestigationCommand,
) {
  const [state, setState] = useState<InvestigationState>(() =>
    createInvestigation(instance, startedAt),
  )
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>()
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tools')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()

  const evidenceViews = useMemo(
    () => getInvestigationEvidenceViews(instance, state),
    [instance, state],
  )

  function send(command: InvestigationCommand): boolean {
    try {
      setState(transition(instance, state, command))
      setError(undefined)
      return true
    } catch (cause) {
      if (!(cause instanceof InvestigationTransitionError)) throw cause
      setError('Unable to update the investigation. Try again.')
      return false
    }
  }

  function begin() {
    send({ type: 'begin_investigation' })
  }

  function openEvidence(evidenceId: string) {
    if (!send({ type: 'open_evidence', evidenceId })) return
    setSelectedEvidenceId(evidenceId)
    setActiveTab('evidence')
  }

  function selectEvidence(evidenceId: string) {
    if (!state.openedEvidenceIds.includes(evidenceId)) return
    setSelectedEvidenceId(evidenceId)
    setActiveTab('evidence')
  }

  function toggleBookmark(evidenceId: string) {
    send({
      type: state.bookmarkedEvidenceIds.includes(evidenceId)
        ? 'unbookmark_evidence'
        : 'bookmark_evidence',
      evidenceId,
    })
  }

  function selectHypothesis(hypothesisId: string) {
    send({ type: 'select_hypothesis', hypothesisId })
  }

  return {
    state,
    evidenceViews,
    selectedEvidenceId,
    activeTab,
    ready,
    error,
    begin,
    openEvidence,
    selectEvidence,
    toggleBookmark,
    selectHypothesis,
    setActiveTab,
    setReady,
  }
}
