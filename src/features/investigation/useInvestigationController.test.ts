import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  applyInvestigationCommand,
  InvestigationTransitionError,
} from '../../engine/investigation-engine'
import { loadInvestigationScenario } from './load-investigation'
import { useInvestigationController } from './useInvestigationController'

function iamInstance() {
  const loaded = loadInvestigationScenario('iam-001')
  if (!loaded.available) throw new Error('Expected IAM-001')
  return loaded.instance
}

describe('useInvestigationController', () => {
  it('delegates begin and evidence opening to the engine', () => {
    const { result } = renderHook(() =>
      useInvestigationController(iamInstance(), 1_000),
    )

    act(() => result.current.begin())
    act(() => result.current.openEvidence('service-status'))

    expect(result.current.state.status).toBe('investigating')
    expect(result.current.state.openedEvidenceIds).toEqual(['service-status'])
    expect(result.current.selectedEvidenceId).toBe('service-status')
    expect(result.current.activeTab).toBe('evidence')
  })

  it('selects opened evidence without calling the engine transition', () => {
    const transition = vi.fn(applyInvestigationCommand)
    const { result } = renderHook(() =>
      useInvestigationController(iamInstance(), 1_000, transition),
    )
    act(() => result.current.begin())
    act(() => result.current.openEvidence('service-status'))
    act(() => result.current.openEvidence('affected-user-scope'))
    transition.mockClear()

    act(() => result.current.selectEvidence('service-status'))

    expect(result.current.selectedEvidenceId).toBe('service-status')
    expect(result.current.activeTab).toBe('evidence')
    expect(transition).not.toHaveBeenCalled()
  })

  it('exposes planned workspace state and selects hypotheses through the engine', () => {
    const { result } = renderHook(() =>
      useInvestigationController(iamInstance(), 1_000),
    )

    act(() => result.current.begin())
    act(() => result.current.setActiveTab('notebook'))
    act(() => result.current.setReady(true))
    act(() => result.current.selectHypothesis('reporting-role-removed'))

    expect(result.current.activeTab).toBe('notebook')
    expect(result.current.ready).toBe(true)
    expect(result.current.state.selectedHypothesisId).toBe(
      'reporting-role-removed',
    )
    expect(result.current.state.actions.at(-1)).toMatchObject({
      type: 'select_hypothesis',
      hypothesisId: 'reporting-role-removed',
    })
  })

  it('preserves the last valid state and announces transition errors', () => {
    const instance = iamInstance()
    const transition = () => {
      throw new InvestigationTransitionError('EVIDENCE_LOCKED', 'locked')
    }
    const { result } = renderHook(() =>
      useInvestigationController(instance, 1_000, transition),
    )
    const before = result.current.state

    act(() => result.current.begin())

    expect(result.current.state).toBe(before)
    expect(result.current.error).toBe(
      'Unable to update the investigation. Try again.',
    )
  })

  it('does not swallow non-domain programming errors', () => {
    const transition = () => {
      throw new TypeError('programming defect')
    }
    const { result } = renderHook(() =>
      useInvestigationController(iamInstance(), 1_000, transition),
    )

    expect(() => act(() => result.current.begin())).toThrow(
      'programming defect',
    )
  })
})
