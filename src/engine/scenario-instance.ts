import type { ScenarioSource } from '../content/scenario-schema'

type ScenarioSourceEvidence = ScenarioSource['evidence'][number]
type ScenarioSourceEvidenceContent = ScenarioSourceEvidence['content']
type ScenarioNonTimelineContent = Exclude<
  ScenarioSourceEvidenceContent,
  { kind: 'timeline' }
>

export interface ScenarioTimelineContent {
  kind: 'timeline'
  events: { time: string; event: string }[]
}

export type ScenarioInstanceEvidence = Omit<
  ScenarioSourceEvidence,
  'content'
> & {
  content: ScenarioNonTimelineContent | ScenarioTimelineContent
}

export type ResolvedScenario = Omit<
  ScenarioSource,
  'variations' | 'customer_context' | 'brief' | 'evidence' | 'red_herrings'
> & {
  customer_context: string[]
  brief: Omit<ScenarioSource['brief'], 'symptom_variants'> & {
    symptom: string
  }
  evidence: ScenarioInstanceEvidence[]
  red_herrings: ScenarioSource['red_herrings']['pool']
}

export interface ScenarioInstance {
  composition: {
    seed: string
    customerName: string
    timestampOffsetMinutes: number
    selectedRedHerringIds: string[]
  }
  scenario: ResolvedScenario
}
