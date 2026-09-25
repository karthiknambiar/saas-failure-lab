import { describe, expect, it } from 'vitest'

import {
  InvalidSeedError,
  deriveSeed,
  normalizeSeed,
  selectIndex,
  selectIndices,
} from './seed'

const scope = {
  scenarioId: 'iam-001',
  scenarioVersion: 1,
  seed: 'demo-seed',
}

describe('normalizeSeed', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeSeed('  demo-seed  ')).toBe('demo-seed')
  })

  it('accepts a seed at the 128 UTF-16 code-unit limit', () => {
    const seed = 'x'.repeat(128)

    expect(normalizeSeed(seed)).toBe(seed)
  })

  it.each(['', '   ', 'x'.repeat(129)])('rejects invalid seed %j', (seed) => {
    expect(() => normalizeSeed(seed)).toThrow(InvalidSeedError)
  })

  it('describes the maximum in UTF-16 code units', () => {
    expect(() => normalizeSeed('x'.repeat(129))).toThrow(
      'Seed must be at most 128 UTF-16 code units long.',
    )
  })
})

describe('deriveSeed', () => {
  it('derives the fixed hash for a scope and dimension', () => {
    expect(deriveSeed({ ...scope, dimension: 'customer-name' })).toBe(
      1095030276,
    )
  })

  it('hashes Unicode seeds by UTF-16 code unit', () => {
    expect(
      deriveSeed({
        ...scope,
        seed: 'démo-😀',
        dimension: 'customer-name',
      }),
    ).toBe(3669991420)
  })
})

describe('selectIndex', () => {
  it('returns the same index on repeated calls', () => {
    const selectionScope = { ...scope, dimension: 'customer-name' }

    expect(selectIndex(selectionScope, 3)).toBe(0)
    expect(selectIndex(selectionScope, 3)).toBe(0)
  })

  it('rejects an empty option pool', () => {
    expect(() =>
      selectIndex({ ...scope, dimension: 'customer-name' }, 0),
    ).toThrow(RangeError)
  })
})

describe('selectIndices', () => {
  it('selects deterministic indices in source order', () => {
    expect(
      selectIndices({ ...scope, dimension: 'red-herrings' }, 5, 2),
    ).toEqual([1, 3])
  })

  it('returns an empty selection for an empty option pool', () => {
    expect(
      selectIndices({ ...scope, dimension: 'red-herrings' }, 0, 0),
    ).toEqual([])
  })

  it('rejects a selection larger than the option pool', () => {
    expect(() =>
      selectIndices({ ...scope, dimension: 'red-herrings' }, 2, 3),
    ).toThrow(RangeError)
  })
})
