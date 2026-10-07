import type {
  CompletedRun,
  DecodeProgressResult,
  Progress,
  ProgressScore,
} from './progress-types'

type JsonObject = Record<string, unknown>
type VersionDecoder = (document: JsonObject) => Progress | undefined

export function emptyProgress(): Progress {
  return { version: 1, completedRuns: [] }
}

export function encodeProgress(progress: Progress): string {
  return JSON.stringify(progress)
}

export function decodeProgress(raw?: string | null): DecodeProgressResult {
  if (raw === undefined || raw === null) {
    return { progress: emptyProgress(), recovered: false }
  }

  if (raw.length === 0) {
    return recoveredProgress()
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    const progress = decodeVersionedProgress(parsed)

    return progress === undefined
      ? recoveredProgress()
      : { progress, recovered: false }
  } catch {
    return recoveredProgress()
  }
}

function recoveredProgress(): DecodeProgressResult {
  return { progress: emptyProgress(), recovered: true }
}

function decodeVersionedProgress(value: unknown): Progress | undefined {
  if (!isObject(value) || typeof value.version !== 'number') {
    return undefined
  }

  const decoder = versionDecoders[value.version]
  return decoder?.(value)
}

// Each historical decoder returns the current Progress shape. Add a decoder here
// when a persisted version needs an explicit migration to the current model.
const versionDecoders: Record<number, VersionDecoder | undefined> = {
  1: decodeV1,
}

function decodeV1(document: JsonObject): Progress | undefined {
  if (!Array.isArray(document.completedRuns)) {
    return undefined
  }

  const completedRuns = document.completedRuns.map(decodeCompletedRun)
  if (completedRuns.some((run) => run === undefined)) {
    return undefined
  }

  return { version: 1, completedRuns: completedRuns as CompletedRun[] }
}

function decodeCompletedRun(value: unknown): CompletedRun | undefined {
  if (
    !isObject(value) ||
    !isNonEmptyString(value.scenarioId) ||
    !isNonNegativeFiniteNumber(value.completedAt) ||
    !isNonEmptyString(value.submittedHypothesisId)
  ) {
    return undefined
  }

  const score = decodeScore(value.score)
  if (score === undefined) {
    return undefined
  }

  return {
    scenarioId: value.scenarioId,
    completedAt: value.completedAt,
    submittedHypothesisId: value.submittedHypothesisId,
    score,
  }
}

function decodeScore(value: unknown): ProgressScore | undefined {
  if (!isObject(value)) {
    return undefined
  }

  const { total, diagnosisPoints, evidencePoints } = value
  if (
    !isNumberInRange(total, 0, 100) ||
    !isNumberInRange(diagnosisPoints, 0, 70) ||
    !isNumberInRange(evidencePoints, 0, 30) ||
    total !== diagnosisPoints + evidencePoints
  ) {
    return undefined
  }

  return { total, diagnosisPoints, evidencePoints }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  )
}
