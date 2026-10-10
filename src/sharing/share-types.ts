export interface ShareScore {
  total: number
  diagnosisPoints: number
  evidencePoints: number
}

export interface ShareChallengePayload {
  scenarioId: string
  scenarioVersion: number
  seed: string
  title: string
  score: ShareScore
  challengeUrl: string
}

export interface CompletedShareSource {
  score: ShareScore
}

export interface ChallengeLinkInput {
  baseUrl: string
  scenarioId: string
  seed: string
}

export interface ChallengeUrlLocation {
  origin: string
  baseUrl: string
}

export interface ChallengeUrlInput
  extends ChallengeLinkInput, ChallengeUrlLocation {}
