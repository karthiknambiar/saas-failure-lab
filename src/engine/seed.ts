const MAX_SEED_LENGTH = 128
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
const NONZERO_FALLBACK = 0x9e3779b9

export class InvalidSeedError extends Error {
  readonly code = 'INVALID_SEED'

  constructor(message: string) {
    super(message)
    this.name = 'InvalidSeedError'
  }
}

export interface SeedScope {
  scenarioId: string
  scenarioVersion: number
  seed: string
  dimension: string
}

export function normalizeSeed(seed: string): string {
  const normalized = seed.trim()

  if (normalized.length === 0) {
    throw new InvalidSeedError('Seed must not be empty.')
  }

  if (normalized.length > MAX_SEED_LENGTH) {
    throw new InvalidSeedError(
      `Seed must be at most ${MAX_SEED_LENGTH} UTF-16 code units long.`,
    )
  }

  return normalized
}

function hashFnv1a(value: string): number {
  let hash = FNV_OFFSET_BASIS

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, FNV_PRIME)
  }

  return hash >>> 0
}

export function deriveSeed(scope: SeedScope): number {
  const material = [
    scope.scenarioId,
    String(scope.scenarioVersion),
    normalizeSeed(scope.seed),
    scope.dimension,
  ].join('|')

  return hashFnv1a(material)
}

function createXorshift32(seed: number): () => number {
  let state = seed || NONZERO_FALLBACK

  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state
  }
}

export function selectIndex(scope: SeedScope, optionCount: number): number {
  if (!Number.isInteger(optionCount) || optionCount <= 0) {
    throw new RangeError('Option count must be a positive integer.')
  }

  return deriveSeed(scope) % optionCount
}

export function selectIndices(
  scope: SeedScope,
  optionCount: number,
  selectionCount: number,
): number[] {
  if (!Number.isInteger(optionCount) || optionCount < 0) {
    throw new RangeError('Option count must be a nonnegative integer.')
  }

  if (!Number.isInteger(selectionCount) || selectionCount < 0) {
    throw new RangeError('Selection count must be a nonnegative integer.')
  }

  if (selectionCount > optionCount) {
    throw new RangeError('Selection count must not exceed option count.')
  }

  const indices = Array.from({ length: optionCount }, (_, index) => index)
  const next = createXorshift32(deriveSeed(scope))

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = next() % (index + 1)
    ;[indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]]
  }

  return indices.slice(0, selectionCount).sort((left, right) => left - right)
}
