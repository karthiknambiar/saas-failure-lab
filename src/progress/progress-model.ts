import type { CompletedRun, Progress } from './progress-types'

export interface PlayableScenario {
  id: string
  title: string
}

export interface ScenarioProgressCard {
  scenarioId: string
  title: string
  completed: boolean
  bestTotalScore?: number
}

export interface ProgressAchievement {
  id: 'first-completion' | 'perfect-diagnosis' | 'scenario-explorer'
  title: string
  criteria: string
  unlocked: boolean
}

export interface ProgressSummary {
  completedScenarioCount: number
  averageTotalScore: number
  bestTotalScore: number
  recentRuns: CompletedRun[]
  scenarioCards: ScenarioProgressCard[]
  achievements: ProgressAchievement[]
}

export function recordCompletedRun(
  progress: Progress,
  run: CompletedRun,
): Progress {
  if (
    progress.completedRuns.some(
      (stored) =>
        stored.scenarioId === run.scenarioId &&
        stored.completedAt === run.completedAt,
    )
  ) {
    return progress
  }

  return {
    ...progress,
    completedRuns: [...progress.completedRuns.map(copyRun), copyRun(run)],
  }
}

export function getProgressSummary(
  progress: Progress,
  playableScenarios: PlayableScenario[],
): ProgressSummary {
  const runs = progress.completedRuns
  const totals = runs.map((run) => run.score.total)
  const completedScenarioIds = new Set(runs.map((run) => run.scenarioId))
  const bestScoreByScenario = getBestScoreByScenario(runs)

  return {
    completedScenarioCount: completedScenarioIds.size,
    averageTotalScore:
      totals.length === 0
        ? 0
        : Math.round(
            totals.reduce((sum, total) => sum + total, 0) / totals.length,
          ),
    bestTotalScore: totals.length === 0 ? 0 : Math.max(...totals),
    recentRuns: [...runs]
      .sort((left, right) => right.completedAt - left.completedAt)
      .map(copyRun),
    scenarioCards: playableScenarios.map((scenario) => {
      const bestTotalScore = bestScoreByScenario.get(scenario.id)

      return bestTotalScore === undefined
        ? {
            scenarioId: scenario.id,
            title: scenario.title,
            completed: false,
          }
        : {
            scenarioId: scenario.id,
            title: scenario.title,
            completed: true,
            bestTotalScore,
          }
    }),
    achievements: [
      {
        id: 'first-completion',
        title: 'First completion',
        criteria: 'Complete at least one scenario.',
        unlocked: runs.length >= 1,
      },
      {
        id: 'perfect-diagnosis',
        title: 'Perfect diagnosis',
        criteria: 'Earn a total score of 100 on a completed run.',
        unlocked: totals.some((total) => total === 100),
      },
      {
        id: 'scenario-explorer',
        title: 'Scenario explorer',
        criteria: 'Complete runs in at least two distinct scenarios.',
        unlocked: completedScenarioIds.size >= 2,
      },
    ],
  }
}

function getBestScoreByScenario(runs: CompletedRun[]): Map<string, number> {
  const scores = new Map<string, number>()

  for (const run of runs) {
    const bestScore = scores.get(run.scenarioId)
    if (bestScore === undefined || run.score.total > bestScore) {
      scores.set(run.scenarioId, run.score.total)
    }
  }

  return scores
}

function copyRun(run: CompletedRun): CompletedRun {
  return {
    ...run,
    score: { ...run.score },
  }
}
