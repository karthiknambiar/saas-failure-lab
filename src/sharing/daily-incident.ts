import { deriveSeed, selectIndex } from '../engine/seed'

export interface DailyPlayableScenario {
  id: string
  version: number
  title: string
}

export interface DailyIncident {
  utcDate: string
  scenarioId: string
  seed: string
}

// This dimension keeps daily ordering independent from all scenario composition.
const DAILY_SELECTION_DIMENSION = 'daily-incident-selection'
// This dimension makes the printable seed depend only on the selected incident.
const DAILY_SEED_DIMENSION = 'daily-incident-seed'
const UTC_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
// The fixed-width YYYY-MM-DD contract supports proleptic UTC years 0000–9999.
const MIN_SUPPORTED_UTC_YEAR = 0
const MAX_SUPPORTED_UTC_YEAR = 9999

export function getUtcCalendarDate(date: Date): string {
  const year = date.getUTCFullYear()

  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_UTC_YEAR ||
    year > MAX_SUPPORTED_UTC_YEAR
  ) {
    throw new Error('Expected a valid Date within UTC years 0000 through 9999.')
  }

  return `${year.toString().padStart(4, '0')}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`
}

function assertUtcCalendarDate(utcDate: string): void {
  const match = UTC_DATE_PATTERN.exec(utcDate)

  if (!match) {
    throw new Error(
      'Daily incident requires a valid UTC calendar date (YYYY-MM-DD).',
    )
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new Error(
      'Daily incident requires a valid UTC calendar date (YYYY-MM-DD).',
    )
  }
}

export function getDailyIncident(
  utcDate: string,
  scenarios: readonly DailyPlayableScenario[],
): DailyIncident | undefined {
  assertUtcCalendarDate(utcDate)

  if (scenarios.length === 0) {
    return undefined
  }

  const index = selectIndex(
    {
      scenarioId: 'daily-incident',
      scenarioVersion: 1,
      seed: utcDate,
      dimension: DAILY_SELECTION_DIMENSION,
    },
    scenarios.length,
  )
  const selected = scenarios[index]
  const printableSeed = `daily-${deriveSeed({
    scenarioId: selected.id,
    scenarioVersion: selected.version,
    seed: utcDate,
    dimension: DAILY_SEED_DIMENSION,
  }).toString(36)}`

  return {
    utcDate,
    scenarioId: selected.id,
    seed: printableSeed,
  }
}
