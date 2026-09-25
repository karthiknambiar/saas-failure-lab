export function createScenarioFixture() {
  return {
    id: 'iam-001',
    version: 1,
    title: 'Login works, feature does not',
    domain: 'identity',
    difficulty: 'beginner',
    estimated_minutes: 8,
    learning: {
      concepts: ['authentication-vs-authorization'],
      objectives: [
        'Distinguish authentication failures from authorization failures.',
      ],
    },
    variations: {
      customer_names: ['Northstar Components', 'Meridian Fabrication'],
      timestamp_offsets_minutes: [0, 17, 43],
    },
    customer_context: [
      '{{customerName}} uses role-based access for reporting.',
    ],
    brief: {
      severity: 'medium',
      business_impact: 'Month-end reporting is blocked for two users.',
      symptom_variants: ['Two users can sign in but cannot open reporting.'],
    },
    root_cause: {
      id: 'reporting-role-removed',
      category: 'authorization',
      explanation: 'The reporting role was removed from the affected users.',
    },
    hypotheses: [
      {
        id: 'reporting-role-removed',
        label: 'The affected users lost their reporting role.',
      },
      {
        id: 'reporting-service-outage',
        label: 'The reporting service is unavailable.',
      },
      {
        id: 'stale-browser-session',
        label: 'The affected users have stale browser sessions.',
      },
    ],
    evidence: [
      {
        id: 'service-status',
        tool: 'service_status',
        cost: 1,
        relevance: 'supporting',
        unlock_after: [],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: 0, clock: '09:02' },
              event: 'All systems reported normal.',
            },
          ],
        },
        explanation: 'A broad outage is unlikely.',
      },
    ],
    red_herrings: {
      pool: [],
      choose: 0,
    },
    remediation: {
      choices: [
        {
          id: 'restore-reporting-role',
          label: 'Restore the reporting role for the affected users.',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'This restores the missing authorization safely.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'share-impact-and-next-step',
          message:
            'We confirmed the scope and are checking the affected users’ access.',
          quality: 'excellent',
          explanation: 'It is specific, transparent, and action oriented.',
        },
        {
          id: 'promise-immediate-resolution',
          message: 'This will be fixed immediately.',
          quality: 'poor',
          explanation: 'It promises an outcome before the cause is confirmed.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'The users could authenticate but lacked the role required for reporting.',
      evidence_chain: ['service-status'],
      efficient_path: [
        { kind: 'framework_step', ref: 'establish-impact' },
        { kind: 'evidence', ref: 'service-status' },
      ],
      transferable_lesson:
        'Separate authentication from authorization when login succeeds.',
    },
  }
}
