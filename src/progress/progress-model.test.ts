import { describe, expect, it } from 'vitest'

import type { CompletedRun, Progress } from './progress-types'
import { getProgressSummary, recordCompletedRun } from './progress-model'

const catalog = [
  { id: 'access', title: 'Access outage' },
  { id: 'billing', title: 'Billing drift' },
  { id: 'latency', title: 'Latency spike' },
]

function run(
  scenarioId: string,
  completedAt: number,
  total: number,
): CompletedRun {
  const diagnosisPoints = Math.min(total, 70)

  return {
    scenarioId,
    completedAt,
    submittedHypothesisId: `${scenarioId}-hypothesis`,
    score: { total, diagnosisPoints, evidencePoints: total - diagnosisPoints },
  }
}

function progress(...completedRuns: CompletedRun[]): Progress {
  return { version: 1, completedRuns }
}

describe('recordCompletedRun', () => {
  it('appends a defensive copy without changing the supplied progress', () => {
    const current = progress()
    const completed = run('access', 100, 72)

    const result = recordCompletedRun(current, completed)
    completed.score.total = 0

    expect(result).toEqual(progress(run('access', 100, 72)))
    expect(result).not.toBe(current)
    expect(result.completedRuns).not.toBe(current.completedRuns)
    expect(result.completedRuns[0]).not.toBe(completed)
    expect(result.completedRuns[0].score).not.toBe(completed.score)
    expect(current).toEqual(progress())
  })

  it('returns the original progress identity for a duplicate scenario and timestamp', () => {
    const current = progress(run('access', 100, 72))

    expect(recordCompletedRun(current, run('access', 100, 100))).toBe(current)
  })
})

describe('getProgressSummary', () => {
  it('returns an empty, fully locked summary with a card for every playable scenario', () => {
    expect(getProgressSummary(progress(), catalog)).toEqual({
      completedScenarioCount: 0,
      averageTotalScore: 0,
      bestTotalScore: 0,
      recentRuns: [],
      scenarioCards: [
        { scenarioId: 'access', title: 'Access outage', completed: false },
        { scenarioId: 'billing', title: 'Billing drift', completed: false },
        { scenarioId: 'latency', title: 'Latency spike', completed: false },
      ],
      achievements: [
        {
          id: 'first-completion',
          title: 'First completion',
          criteria: 'Complete at least one scenario.',
          unlocked: false,
        },
        {
          id: 'perfect-diagnosis',
          title: 'Perfect diagnosis',
          criteria: 'Earn a total score of 100 on a completed run.',
          unlocked: false,
        },
        {
          id: 'scenario-explorer',
          title: 'Scenario explorer',
          criteria: 'Complete runs in at least two distinct scenarios.',
          unlocked: false,
        },
      ],
    })
  })

  it('derives best card scores, all-run aggregates, and each achievement threshold', () => {
    const result = getProgressSummary(
      progress(
        run('access', 100, 50),
        run('access', 200, 100),
        run('billing', 300, 71),
        run('unknown', 400, 80),
      ),
      catalog,
    )

    expect(result.completedScenarioCount).toBe(3)
    expect(result.averageTotalScore).toBe(75)
    expect(result.bestTotalScore).toBe(100)
    expect(result.scenarioCards).toEqual([
      {
        scenarioId: 'access',
        title: 'Access outage',
        completed: true,
        bestTotalScore: 100,
      },
      {
        scenarioId: 'billing',
        title: 'Billing drift',
        completed: true,
        bestTotalScore: 71,
      },
      { scenarioId: 'latency', title: 'Latency spike', completed: false },
    ])
    expect(
      result.achievements.map(({ id, unlocked }) => ({ id, unlocked })),
    ).toEqual([
      { id: 'first-completion', unlocked: true },
      { id: 'perfect-diagnosis', unlocked: true },
      { id: 'scenario-explorer', unlocked: true },
    ])
  })

  it('unlocks achievements only at their individual thresholds', () => {
    const firstOnly = getProgressSummary(
      progress(run('access', 100, 99)),
      catalog,
    )
    const perfectOnly = getProgressSummary(
      progress(run('access', 100, 100)),
      catalog,
    )
    const sameScenarioTwice = getProgressSummary(
      progress(run('access', 100, 50), run('access', 200, 80)),
      catalog,
    )
    const twoScenarios = getProgressSummary(
      progress(run('access', 100, 50), run('billing', 200, 80)),
      catalog,
    )

    expect(
      firstOnly.achievements.map((achievement) => achievement.unlocked),
    ).toEqual([true, false, false])
    expect(
      perfectOnly.achievements.map((achievement) => achievement.unlocked),
    ).toEqual([true, true, false])
    expect(
      sameScenarioTwice.achievements.map((achievement) => achievement.unlocked),
    ).toEqual([true, false, false])
    expect(
      twoScenarios.achievements.map((achievement) => achievement.unlocked),
    ).toEqual([true, false, true])
  })

  it('rounds averages to the nearest integer and orders recent runs newest first stably', () => {
    const earliest = run('access', 100, 1)
    const tiedFirst = run('billing', 300, 2)
    const tiedSecond = run('latency', 300, 3)
    const newest = run('access', 400, 4)
    const stored = progress(earliest, tiedFirst, tiedSecond, newest)

    const result = getProgressSummary(stored, catalog)

    expect(result.averageTotalScore).toBe(3)
    expect(result.recentRuns).toEqual([newest, tiedFirst, tiedSecond, earliest])
    expect(stored.completedRuns).toEqual([
      earliest,
      tiedFirst,
      tiedSecond,
      newest,
    ])
  })

  it('returns fresh independent view data without exposing stored nested records', () => {
    const stored = progress(run('access', 100, 72))
    const first = getProgressSummary(stored, catalog)
    const second = getProgressSummary(stored, catalog)

    first.recentRuns[0].score.total = 0
    first.scenarioCards[0].title = 'Changed'
    first.achievements[0].unlocked = false

    expect(second.recentRuns[0].score.total).toBe(72)
    expect(second.scenarioCards[0].title).toBe('Access outage')
    expect(second.achievements[0].unlocked).toBe(true)
    expect(stored.completedRuns[0].score.total).toBe(72)
  })

  it('does not mutate supplied playable catalog data through its cards', () => {
    const suppliedCatalog = [{ id: 'access', title: 'Access outage' }]
    const result = getProgressSummary(
      progress(run('access', 100, 72)),
      suppliedCatalog,
    )

    result.scenarioCards[0].title = 'Changed'

    expect(suppliedCatalog).toEqual([{ id: 'access', title: 'Access outage' }])
  })
})
