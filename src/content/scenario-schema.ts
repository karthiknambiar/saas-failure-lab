import { z } from 'zod'

import { frameworkSteps, scenarioTools } from './scenario-tools'

const nonemptyString = z.string().trim().min(1)
const nestedId = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const timelineTimeSchema = z
  .object({
    day_offset: z.number().int().min(-365).max(365),
    clock: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict()
const variationsSchema = z
  .object({
    customer_names: z.array(nonemptyString).min(1),
    timestamp_offsets_minutes: z
      .array(z.number().int().min(-180).max(180))
      .min(1),
  })
  .strict()

const evidenceContentSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('text'),
      text: nonemptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('status'),
      state: nonemptyString,
      detail: nonemptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('key_value'),
      values: z.record(nonemptyString, nonemptyString),
    })
    .strict(),
  z
    .object({
      kind: z.literal('table'),
      columns: z.array(nonemptyString).min(1),
      rows: z
        .array(
          z
            .record(nonemptyString, nonemptyString)
            .refine(
              (row) => Object.keys(row).length > 0,
              'Table rows must not be empty',
            ),
        )
        .min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('timeline'),
      events: z
        .array(
          z
            .object({
              time: timelineTimeSchema,
              event: nonemptyString,
            })
            .strict(),
        )
        .min(1),
    })
    .strict(),
])

const efficientPathEntrySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('framework_step'),
      ref: z.enum(frameworkSteps),
    })
    .strict(),
  z
    .object({
      kind: z.literal('evidence'),
      ref: nestedId,
    })
    .strict(),
])

export const scenarioSourceSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9]*-\d{3}$/),
    version: z.number().int().positive(),
    title: nonemptyString,
    domain: z.enum([
      'fundamentals',
      'api',
      'identity',
      'integrations',
      'data',
      'browser',
    ]),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimated_minutes: z.number().int().positive(),
    investigation_budget: z.number().int().positive().optional(),
    learning: z
      .object({
        concepts: z.array(nonemptyString).min(1),
        objectives: z.array(nonemptyString).min(1),
      })
      .strict(),
    variations: variationsSchema,
    customer_context: z.array(nonemptyString).min(1),
    brief: z
      .object({
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        business_impact: nonemptyString,
        symptom_variants: z.array(nonemptyString).min(1),
      })
      .strict(),
    root_cause: z
      .object({
        id: nestedId,
        category: nonemptyString,
        explanation: nonemptyString,
      })
      .strict(),
    hypotheses: z
      .array(
        z
          .object({
            id: nestedId,
            label: nonemptyString,
          })
          .strict(),
      )
      .min(3),
    evidence: z
      .array(
        z
          .object({
            id: nestedId,
            tool: z.enum(scenarioTools),
            cost: z.number().int().nonnegative(),
            relevance: z.enum([
              'critical',
              'supporting',
              'neutral',
              'red_herring',
            ]),
            unlock_after: z.array(nestedId),
            content: evidenceContentSchema,
            explanation: nonemptyString,
          })
          .strict(),
      )
      .min(1),
    red_herrings: z
      .object({
        pool: z.array(
          z
            .object({
              id: nestedId,
              label: nonemptyString,
              explanation: nonemptyString,
            })
            .strict(),
        ),
        choose: z.number().int().nonnegative(),
      })
      .strict(),
    remediation: z
      .object({
        choices: z
          .array(
            z
              .object({
                id: nestedId,
                label: nonemptyString,
                phase: z.enum(['immediate', 'prevention']),
                quality: z.enum(['correct', 'partial', 'incorrect']),
                explanation: nonemptyString,
              })
              .strict(),
          )
          .min(1),
      })
      .strict(),
    communication: z
      .object({
        choices: z
          .array(
            z
              .object({
                id: nestedId,
                message: nonemptyString,
                quality: z.enum(['poor', 'acceptable', 'excellent']),
                explanation: nonemptyString,
              })
              .strict(),
          )
          .min(2),
      })
      .strict(),
    debrief: z
      .object({
        root_cause_explanation: nonemptyString,
        evidence_chain: z.array(nestedId).min(1),
        efficient_path: z.array(efficientPathEntrySchema).min(1),
        transferable_lesson: nonemptyString,
      })
      .strict(),
  })
  .strict()

export type ScenarioSource = z.infer<typeof scenarioSourceSchema>
