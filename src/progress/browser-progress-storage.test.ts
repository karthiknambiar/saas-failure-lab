import { describe, expect, it } from 'vitest'

import {
  clearBrowserProgress,
  loadBrowserProgress,
  PROGRESS_STORAGE_KEY,
  saveBrowserProgress,
  type StorageLike,
} from './browser-progress-storage'

function memoryStorage(seed: Record<string, string> = {}): StorageLike {
  const entries = new Map(Object.entries(seed))

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }
}

const savedProgress = {
  version: 1 as const,
  completedRuns: [
    {
      scenarioId: 'iam-001',
      completedAt: 1_700_000_000_000,
      submittedHypothesisId: 'role-change',
      score: { total: 100, diagnosisPoints: 70, evidencePoints: 30 },
    },
  ],
}

describe('browser progress storage', () => {
  it('loads empty progress without a notice when the app key is missing', () => {
    expect(loadBrowserProgress(memoryStorage())).toEqual({
      progress: { version: 1, completedRuns: [] },
    })
  })

  it('recovers from corrupt stored data with a stable notice', () => {
    const result = loadBrowserProgress(
      memoryStorage({ [PROGRESS_STORAGE_KEY]: '{not json' }),
    )

    expect(result).toEqual({
      progress: { version: 1, completedRuns: [] },
      notice: 'recovered',
    })
  })

  it('loads a valid v1 document', () => {
    expect(
      loadBrowserProgress(
        memoryStorage({
          [PROGRESS_STORAGE_KEY]: JSON.stringify(savedProgress),
        }),
      ),
    ).toEqual({ progress: savedProgress })
  })

  it('returns an unavailable notice when reading throws', () => {
    expect(
      loadBrowserProgress({
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => undefined,
        removeItem: () => undefined,
      }),
    ).toEqual({
      progress: { version: 1, completedRuns: [] },
      notice: 'unavailable',
    })
  })

  it('reports unavailable when saving or clearing throws', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }

    expect(saveBrowserProgress(savedProgress, failing)).toEqual({
      ok: false,
      notice: 'unavailable',
    })
    expect(clearBrowserProgress(failing)).toEqual({
      ok: false,
      notice: 'unavailable',
    })
  })

  it('clears only the app progress key', () => {
    const storage = memoryStorage({
      [PROGRESS_STORAGE_KEY]: JSON.stringify(savedProgress),
      unrelated: 'keep',
    })

    expect(clearBrowserProgress(storage)).toEqual({ ok: true })
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull()
    expect(storage.getItem('unrelated')).toBe('keep')
  })
})
