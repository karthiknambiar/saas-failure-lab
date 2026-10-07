import { decodeProgress, emptyProgress, encodeProgress } from './progress-codec'
import type { Progress } from './progress-types'

export const PROGRESS_STORAGE_KEY = 'saas-failure-lab.progress'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type BrowserProgressNotice = 'recovered' | 'unavailable'

export type LoadBrowserProgressResult =
  | { progress: Progress; notice?: undefined }
  | { progress: Progress; notice: BrowserProgressNotice }

export type BrowserProgressWriteResult =
  { ok: true } | { ok: false; notice: 'unavailable' }

export function loadBrowserProgress(
  storage?: StorageLike,
): LoadBrowserProgressResult {
  try {
    const decoded = decodeProgress(
      resolveStorage(storage).getItem(PROGRESS_STORAGE_KEY),
    )
    return decoded.recovered
      ? { progress: decoded.progress, notice: 'recovered' }
      : { progress: decoded.progress }
  } catch {
    return { progress: emptyProgress(), notice: 'unavailable' }
  }
}

export function saveBrowserProgress(
  progress: Progress,
  storage?: StorageLike,
): BrowserProgressWriteResult {
  try {
    resolveStorage(storage).setItem(
      PROGRESS_STORAGE_KEY,
      encodeProgress(progress),
    )
    return { ok: true }
  } catch {
    return { ok: false, notice: 'unavailable' }
  }
}

export function clearBrowserProgress(
  storage?: StorageLike,
): BrowserProgressWriteResult {
  try {
    resolveStorage(storage).removeItem(PROGRESS_STORAGE_KEY)
    return { ok: true }
  } catch {
    return { ok: false, notice: 'unavailable' }
  }
}

function resolveStorage(storage?: StorageLike): StorageLike {
  return storage ?? globalThis.localStorage
}
