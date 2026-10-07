import { describe, expect, it } from 'vitest'

import {
  getDailyIncident,
  getUtcCalendarDate,
  type DailyPlayableScenario,
} from './daily-incident'

const scenarios: DailyPlayableScenario[] = [
  { id: 'iam-001', version: 1, title: 'Identity' },
  { id: 'billing-002', version: 2, title: 'Billing' },
  { id: 'export-003', version: 1, title: 'Export' },
]

describe('getUtcCalendarDate', () => {
  it('uses the UTC date across a local-calendar boundary', () => {
    expect(getUtcCalendarDate(new Date('2026-01-01T00:30:00+05:30'))).toBe(
      '2025-12-31',
    )
    expect(getUtcCalendarDate(new Date('2025-12-31T23:30:00-05:00'))).toBe(
      '2026-01-01',
    )
  })

  it('formats the supported UTC year boundaries', () => {
    const firstSupportedYear = new Date(0)
    firstSupportedYear.setUTCFullYear(0, 0, 1)
    const lastSupportedYear = new Date(Date.UTC(9999, 11, 31))

    expect(getUtcCalendarDate(firstSupportedYear)).toBe('0000-01-01')
    expect(getUtcCalendarDate(lastSupportedYear)).toBe('9999-12-31')
  })

  it('rejects invalid dates and UTC years outside the supported range', () => {
    expect(() => getUtcCalendarDate(new Date(Number.NaN))).toThrow(
      'valid Date within UTC years 0000 through 9999',
    )
    expect(() => getUtcCalendarDate(new Date(Date.UTC(10000, 0, 1)))).toThrow(
      'valid Date within UTC years 0000 through 9999',
    )
  })
})

describe('getDailyIncident', () => {
  it('selects the same incident repeatedly without mutating source order', () => {
    const before = structuredClone(scenarios)
    const first = getDailyIncident('2026-02-03', scenarios)

    expect(getDailyIncident('2026-02-03', scenarios)).toEqual(first)
    expect(scenarios).toEqual(before)
    expect(first).toEqual({
      utcDate: '2026-02-03',
      scenarioId: 'iam-001',
      seed: 'daily-1thv8gi',
    })
    expect(first?.seed).toMatch(/^daily-[\x21-\x7e]+$/)
  })

  it('uses input order as part of deterministic selection', () => {
    expect(
      getDailyIncident('2026-02-03', [...scenarios].reverse()),
    ).not.toEqual(getDailyIncident('2026-02-03', scenarios))
  })

  it('can select a different incident on the next UTC day', () => {
    expect(getDailyIncident('2026-02-04', scenarios)).not.toEqual(
      getDailyIncident('2026-02-03', scenarios),
    )
  })

  it('returns undefined for an empty scenario list', () => {
    expect(getDailyIncident('2026-02-03', [])).toBeUndefined()
  })

  it.each(['2026-2-03', '2026-02-30', 'not-a-date'])(
    'rejects invalid dates',
    (date) => {
      expect(() => getDailyIncident(date, scenarios)).toThrow(
        'valid UTC calendar date',
      )
    },
  )
})
