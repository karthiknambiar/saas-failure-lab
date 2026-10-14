import type { ScenarioSource } from '../content/scenario-schema'

export const scenarioCatalog: ScenarioSource[] = [
  {
    id: 'api-001',
    version: 1,
    title: 'Nightly connection stops authenticating',
    domain: 'api',
    difficulty: 'intermediate',
    estimated_minutes: 9,
    learning: {
      concepts: ['connectivity', 'authentication'],
      objectives: ['Separate connectivity from authentication.'],
    },
    variations: {
      customer_names: ['Redwood Ledger', 'Quartz Harbor', 'Mossline Retail'],
      timestamp_offsets_minutes: [0, 22],
    },
    customer_context: [
      '{{customerName}} is a fictional retailer.',
      'A nightly reconciliation job is delayed.',
    ],
    brief: {
      severity: 'high',
      business_impact:
        'Nightly reconciliation cannot finish before finance opens.',
      symptom_variants: [
        'The nightly job reaches its destination but is rejected.',
        'A scheduled integration stopped after a recent maintenance window.',
      ],
    },
    root_cause: {
      id: 'rotated-credential-revoked',
      category: 'credential',
      explanation:
        'The job continued using a credential revoked during rotation.',
    },
    hypotheses: [
      {
        id: 'rotated-credential-revoked',
        label: 'The scheduled job uses a revoked rotated credential.',
      },
      {
        id: 'network-route-blocked',
        label: 'Network connectivity is blocked.',
      },
      {
        id: 'destination-outage',
        label: 'The destination service is unavailable.',
      },
    ],
    evidence: [
      {
        id: 'http-response',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: {
          kind: 'key_value',
          values: { result: '401 unauthorized', response_time: 'normal' },
        },
        explanation: 'A response proves the network path works.',
      },
      {
        id: 'network-connectivity',
        tool: 'service_status',
        cost: 1,
        relevance: 'supporting',
        unlock_after: ['http-response'],
        content: {
          kind: 'status',
          state: 'operational',
          detail: 'Scheduled connectivity is healthy.',
        },
        explanation: 'Shared connectivity is healthy.',
      },
      {
        id: 'credential-audit',
        tool: 'audit_log',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['network-connectivity'],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: -1, clock: '18:00' },
              event: 'Previous job credential was revoked during rotation.',
            },
          ],
        },
        explanation:
          'The active job identifier matches the revoked credential.',
      },
      {
        id: 'previous-success',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['credential-audit'],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: -2, clock: '02:00' },
              event: 'Job succeeded before credential rotation.',
            },
          ],
        },
        explanation: 'The timing aligns with rotation.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'update-credential',
          label: 'Update the job with the approved active credential',
          phase: 'immediate',
          quality: 'correct',
          explanation:
            'It restores authentication without changing network settings.',
        },
        {
          id: 'rotation-validation',
          label: 'Validate scheduled jobs after credential rotation',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It catches stale credentials.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'auth-update',
          message:
            'We confirmed the job can reach the service and are replacing a rotated credential; the next update is in 20 minutes.',
          quality: 'excellent',
          explanation: 'It separates connectivity from authentication.',
        },
        {
          id: 'finance-update',
          message:
            'The issue is limited to the nightly reconciliation job and recovery is in progress.',
          quality: 'excellent',
          explanation: 'It gives verified scope.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'A revoked credential caused authentication rejection while connectivity stayed healthy.',
      evidence_chain: [
        'http-response',
        'network-connectivity',
        'credential-audit',
        'previous-success',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'http-response' },
        { kind: 'evidence', ref: 'network-connectivity' },
        { kind: 'evidence', ref: 'credential-audit' },
        { kind: 'evidence', ref: 'previous-success' },
      ],
      transferable_lesson: 'Separate connectivity from authentication.',
    },
  },
  {
    id: 'api-002',
    version: 1,
    title: 'Read succeeds but write is refused',
    domain: 'api',
    difficulty: 'intermediate',
    estimated_minutes: 9,
    learning: {
      concepts: ['permissions', 'scopes'],
      objectives: [
        'Distinguish a valid credential from sufficient permission.',
      ],
    },
    variations: {
      customer_names: ['Atlas Orchard', 'Sable Works', 'Fernbridge'],
      timestamp_offsets_minutes: [0, 18],
    },
    customer_context: [
      '{{customerName}} is a fictional billing platform.',
      'Its staff need to create invoices.',
    ],
    brief: {
      severity: 'high',
      business_impact: 'Staff can review invoices but cannot create new ones.',
      symptom_variants: [
        'Invoice viewing works while creation is refused.',
        'A recent integration can read data but cannot submit updates.',
      ],
    },
    root_cause: {
      id: 'invoice-write-scope-missing',
      category: 'authorization',
      explanation:
        'The credential is valid but lacks the invoice write permission.',
    },
    hypotheses: [
      {
        id: 'invoice-write-scope-missing',
        label: 'The credential lacks invoice write permission.',
      },
      { id: 'expired-credential', label: 'The credential is expired.' },
      {
        id: 'invoice-service-outage',
        label: 'Invoice processing is unavailable.',
      },
    ],
    evidence: [
      {
        id: 'read-request-success',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: { kind: 'key_value', values: { read_result: '200 success' } },
        explanation: 'Successful reads establish a valid credential.',
      },
      {
        id: 'write-request-forbidden',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['read-request-success'],
        content: {
          kind: 'key_value',
          values: { write_result: '403 forbidden' },
        },
        explanation: 'The failure is permission-specific.',
      },
      {
        id: 'token-scopes',
        tool: 'role_configuration',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['write-request-forbidden'],
        content: {
          kind: 'key_value',
          values: {
            scopes: 'invoice.read, customer.read',
            invoice_write: 'missing',
          },
        },
        explanation: 'The required write scope is absent.',
      },
      {
        id: 'endpoint-permission',
        tool: 'role_configuration',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['token-scopes'],
        content: {
          kind: 'text',
          text: 'Invoice creation requires invoice.write permission.',
        },
        explanation: 'The endpoint requirement confirms the diagnosis.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'grant-write-scope',
          label: 'Grant the approved invoice write permission',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It adds only required access.',
        },
        {
          id: 'scope-review',
          label: 'Validate requested endpoint permissions during setup',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It prevents under-scoped credentials.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'permission-update',
          message:
            'We confirmed reading is healthy and are correcting a missing invoice permission for the write action.',
          quality: 'excellent',
          explanation: 'It accurately narrows the fault.',
        },
        {
          id: 'billing-update',
          message:
            'Invoice creation is the only affected operation; we will update you within 20 minutes.',
          quality: 'excellent',
          explanation: 'It provides scope and timing.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'The valid credential could read but lacked the write permission.',
      evidence_chain: [
        'read-request-success',
        'write-request-forbidden',
        'token-scopes',
        'endpoint-permission',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'read-request-success' },
        { kind: 'evidence', ref: 'write-request-forbidden' },
        { kind: 'evidence', ref: 'token-scopes' },
        { kind: 'evidence', ref: 'endpoint-permission' },
      ],
      transferable_lesson: 'A valid credential can still lack permission.',
    },
  },
  {
    id: 'api-004',
    version: 1,
    title: 'Retry loop grows the backlog',
    domain: 'api',
    difficulty: 'advanced',
    estimated_minutes: 10,
    learning: {
      concepts: ['rate-limits', 'retries'],
      objectives: ['Recognize when retries amplify a failure.'],
    },
    variations: {
      customer_names: ['Ivory Junction', 'Blue Heron', 'Copperline'],
      timestamp_offsets_minutes: [0, 31],
    },
    customer_context: [
      '{{customerName}} is a fictional operations service.',
      'A scheduled sync is falling behind.',
    ],
    brief: {
      severity: 'high',
      business_impact: 'New work is delayed while the sync backlog grows.',
      symptom_variants: [
        'A sync receives repeated capacity responses and falls further behind.',
        'Operators report more attempts but less completed work.',
      ],
    },
    root_cause: {
      id: 'immediate-429-retries',
      category: 'retry-policy',
      explanation:
        'Immediate retries repeatedly hit a rate limit and create more load.',
    },
    hypotheses: [
      {
        id: 'immediate-429-retries',
        label: 'Immediate retries are amplifying the rate limit.',
      },
      { id: 'provider-outage', label: 'The provider is unavailable.' },
      { id: 'worker-failure', label: 'Workers are offline.' },
    ],
    evidence: [
      {
        id: 'rate-limit-response',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: {
          kind: 'key_value',
          values: { result: '429', completed: '0' },
        },
        explanation: 'The service is rate limiting requests.',
      },
      {
        id: 'retry-after',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['rate-limit-response'],
        content: {
          kind: 'key_value',
          values: { retry_after: '60 seconds', observed_retry: 'immediate' },
        },
        explanation: 'The client ignores the requested wait.',
      },
      {
        id: 'request-frequency',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['retry-after'],
        content: {
          kind: 'table',
          columns: ['minute', 'attempts'],
          rows: [
            { minute: '09:00', attempts: '12' },
            { minute: '09:01', attempts: '240' },
          ],
        },
        explanation: 'Attempts spike after retries begin.',
      },
      {
        id: 'backlog-trend',
        tool: 'service_status',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['request-frequency'],
        content: {
          kind: 'table',
          columns: ['minute', 'backlog'],
          rows: [
            { minute: '09:00', backlog: '40' },
            { minute: '09:10', backlog: '690' },
          ],
        },
        explanation: 'The retry loop grows backlog.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'backoff-retries',
          label: 'Honor Retry-After with bounded backoff',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It reduces pressure and permits recovery.',
        },
        {
          id: 'retry-guardrails',
          label: 'Add retry rate and backlog guardrails',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It detects amplification early.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'retry-update',
          message:
            'We found the sync is retrying too quickly against a capacity limit and are applying backoff now.',
          quality: 'excellent',
          explanation: 'It explains verified behavior and action.',
        },
        {
          id: 'backlog-update',
          message:
            'The backlog is limited to this sync and we will report recovery progress within 20 minutes.',
          quality: 'excellent',
          explanation: 'It gives scope and a checkpoint.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'Immediate retries turned a capacity response into a growing backlog.',
      evidence_chain: [
        'rate-limit-response',
        'retry-after',
        'request-frequency',
        'backlog-trend',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'rate-limit-response' },
        { kind: 'evidence', ref: 'retry-after' },
        { kind: 'evidence', ref: 'request-frequency' },
        { kind: 'evidence', ref: 'backlog-trend' },
      ],
      transferable_lesson: 'Retries can amplify failure.',
    },
  },
  {
    id: 'dat-003',
    version: 1,
    title: 'Pipeline counts do not match',
    domain: 'data',
    difficulty: 'intermediate',
    estimated_minutes: 10,
    learning: {
      concepts: ['pipeline-counts', 'validation'],
      objectives: ['Trace counts across pipeline stages.'],
    },
    variations: {
      customer_names: ['Tidal Books', 'Ashford Goods', 'Indigo Grove'],
      timestamp_offsets_minutes: [0, 33],
    },
    customer_context: [
      '{{customerName}} is a fictional distributor.',
      'Its team is reconciling a destination import.',
    ],
    brief: {
      severity: 'high',
      business_impact:
        'Reconciliation is delayed because destination records are fewer than source records.',
      symptom_variants: [
        'The destination count is lower after an otherwise completed import.',
        'The import reports completion but records are missing downstream.',
      ],
    },
    root_cause: {
      id: 'destination-required-field-missing',
      category: 'validation',
      explanation:
        'Records without a required destination field were rejected during validation.',
    },
    hypotheses: [
      {
        id: 'destination-required-field-missing',
        label: 'A required destination field is missing.',
      },
      {
        id: 'source-extract-loss',
        label: 'The source extract omitted records.',
      },
      { id: 'processing-capacity', label: 'The processor stopped early.' },
    ],
    evidence: [
      {
        id: 'source-count',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: { kind: 'key_value', values: { source_records: '1000' } },
        explanation: 'Source contains the expected count.',
      },
      {
        id: 'ingestion-count',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['source-count'],
        content: { kind: 'key_value', values: { ingested_records: '1000' } },
        explanation: 'Ingestion preserved all source records.',
      },
      {
        id: 'processing-count',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['ingestion-count'],
        content: { kind: 'key_value', values: { processed_records: '1000' } },
        explanation: 'Processing did not lose records.',
      },
      {
        id: 'validation-failures',
        tool: 'audit_log',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['processing-count'],
        content: {
          kind: 'table',
          columns: ['reason', 'count'],
          rows: [{ reason: 'destination_region missing', count: '37' }],
        },
        explanation: 'Validation accounts for the discrepancy.',
      },
      {
        id: 'destination-count',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['validation-failures'],
        content: { kind: 'key_value', values: { destination_records: '963' } },
        explanation: 'Destination count matches accepted records.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'supply-field',
          label:
            'Supply the required destination field and replay rejected records',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It restores the missing valid records.',
        },
        {
          id: 'stage-count-monitor',
          label: 'Monitor stage counts and validation reasons',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It exposes future discrepancies.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'data-update',
          message:
            'We traced all source records through processing and identified a required destination field rejecting a limited set; we are replaying them safely.',
          quality: 'excellent',
          explanation: 'It provides evidence-based scope and action.',
        },
        {
          id: 'reconcile-update',
          message:
            'The count difference is accounted for by validation and we will confirm reconciliation within 20 minutes.',
          quality: 'excellent',
          explanation: 'It sets a concrete expectation.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'Thirty-seven records failed destination validation because a required field was absent.',
      evidence_chain: [
        'source-count',
        'ingestion-count',
        'processing-count',
        'validation-failures',
        'destination-count',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'source-count' },
        { kind: 'evidence', ref: 'ingestion-count' },
        { kind: 'evidence', ref: 'processing-count' },
        { kind: 'evidence', ref: 'validation-failures' },
        { kind: 'evidence', ref: 'destination-count' },
      ],
      transferable_lesson: 'Trace counts across pipeline stages.',
    },
  },
  {
    id: 'fnd-001',
    version: 1,
    title: 'One user cannot access a feature',
    domain: 'fundamentals',
    difficulty: 'beginner',
    estimated_minutes: 7,
    learning: {
      concepts: [
        'scope-comparison',
        'entitlement-verification',
        'evidence-driven-troubleshooting',
      ],
      objectives: [
        'Use affected-versus-working comparisons to narrow the failing layer.',
        'Verify entitlement state before changing shared infrastructure.',
      ],
    },
    variations: {
      customer_names: ['Alder & Finch', 'Harbor & Pine', 'Juniper Row'],
      timestamp_offsets_minutes: [0, 19, 41],
    },
    customer_context: [
      '{{customerName}} is a fictional retailer whose finance team uses a forecasting workspace.',
      'A newly assigned analyst needs forecasting access for the weekly planning cycle.',
    ],
    brief: {
      severity: 'medium',
      business_impact:
        'One analyst cannot contribute to the weekly forecast, while the rest of the finance team remains productive.',
      symptom_variants: [
        'One finance analyst cannot open forecasting, although teammates can use it normally.',
        'The analyst reaches the workspace but sees an access message when selecting forecasting.',
      ],
    },
    root_cause: {
      id: 'forecasting-entitlement-missing',
      category: 'provisioning',
      explanation:
        "The analyst's onboarding request did not include the forecasting entitlement, so the account was created without feature access.",
    },
    hypotheses: [
      {
        id: 'forecasting-entitlement-missing',
        label: 'The analyst was never assigned the forecasting entitlement.',
      },
      {
        id: 'forecasting-service-degradation',
        label: 'The forecasting service is degraded for the finance workspace.',
      },
      {
        id: 'analyst-session-stale',
        label:
          'The analyst has a stale session that has not loaded current access.',
      },
      {
        id: 'network-path-blocked',
        label: "The analyst's network path blocks the forecasting feature.",
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
          kind: 'status',
          state: 'operational',
          detail:
            'Forecasting is healthy, with normal availability and latency.',
        },
        explanation:
          'Healthy service telemetry makes a broad forecasting incident unlikely.',
      },
      {
        id: 'peer-user-scope',
        tool: 'user_scope',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: {
          kind: 'table',
          columns: ['subject', 'workspace_access', 'forecasting_access'],
          rows: [
            {
              subject: 'Affected analyst',
              workspace_access: 'Available',
              forecasting_access: 'Denied',
            },
            {
              subject: 'Three finance peers',
              workspace_access: 'Available',
              forecasting_access: 'Available',
            },
          ],
        },
        explanation:
          "A working peer comparison localizes the problem to the analyst's feature access rather than shared service or workspace layers.",
      },
      {
        id: 'entitlement-configuration',
        tool: 'role_configuration',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['peer-user-scope'],
        content: {
          kind: 'key_value',
          values: {
            analyst_account: 'Active',
            finance_workspace: 'Assigned',
            forecasting_entitlement: 'Not assigned',
            peer_forecasting_entitlement: 'Assigned',
          },
        },
        explanation:
          'The configuration comparison shows the exact access difference between the analyst and working peers.',
      },
      {
        id: 'entitlement-audit-history',
        tool: 'audit_log',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['entitlement-configuration'],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: -5, clock: '10:15' },
              event:
                "The analyst's account and finance workspace membership were created.",
            },
            {
              time: { day_offset: -5, clock: '10:16' },
              event:
                'Onboarding completed without a forecasting entitlement assignment.',
            },
            {
              time: { day_offset: 0, clock: '09:20' },
              event:
                "The analyst's first forecasting access attempt was denied.",
            },
          ],
        },
        explanation:
          'The audit history confirms the entitlement was omitted during onboarding rather than removed by a later change.',
      },
      {
        id: 'earlier-cpu-signal',
        tool: 'service_status',
        cost: 1,
        relevance: 'red_herring',
        unlock_after: [],
        content: {
          kind: 'status',
          state: 'recovered',
          detail:
            "Forecasting CPU was elevated for six minutes earlier in the morning and returned to normal before the analyst's access attempt.",
        },
        explanation:
          'The earlier signal is a fair lead to check, but its recovered timing and the healthy experience of peers do not match the current user-specific denial.',
      },
    ],
    red_herrings: {
      pool: [
        {
          id: 'elevated-cpu-earlier',
          label: 'Forecasting CPU was briefly elevated earlier in the morning.',
          explanation:
            'The spike ended before the failure and cannot explain why peers retain access while one analyst receives a permission denial.',
        },
      ],
      choose: 1,
    },
    remediation: {
      choices: [
        {
          id: 'assign-forecasting-entitlement',
          label:
            "Confirm the analyst's approved job access and assign the forecasting entitlement.",
          phase: 'immediate',
          quality: 'correct',
          explanation:
            "This repairs the missing user-level permission while preserving the service and other users' access.",
        },
        {
          id: 'grant-finance-admin',
          label:
            'Grant the analyst the finance administrator role to ensure access.',
          phase: 'immediate',
          quality: 'partial',
          explanation:
            'It may enable forecasting but grants substantially more privilege than the analyst needs.',
        },
        {
          id: 'restart-forecasting',
          label: 'Restart forecasting for the entire finance team.',
          phase: 'immediate',
          quality: 'incorrect',
          explanation:
            'A restart disrupts working users and does not assign the missing entitlement.',
        },
        {
          id: 'add-onboarding-entitlement-review',
          label:
            'Add a role-based entitlement checklist and post-provisioning review to finance onboarding.',
          phase: 'prevention',
          quality: 'correct',
          explanation:
            'A checklist plus verification catches missing feature assignments before a new user needs them.',
        },
        {
          id: 'copy-peer-permissions',
          label:
            'Automatically copy every permission from a selected peer during onboarding.',
          phase: 'prevention',
          quality: 'incorrect',
          explanation:
            'Blind copying can overprovision access and bypass role-specific approval.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'share-user-scoped-update',
          message:
            "Forecasting is healthy and other finance users remain able to work. We isolated the issue to this analyst's feature access and are validating the approved entitlement before assigning it; we will update you within 20 minutes.",
          quality: 'excellent',
          explanation:
            'It gives verified scope, protects least privilege, describes the action, and sets an update expectation.',
        },
        {
          id: 'share-access-review',
          message:
            'We found a user-specific access difference and are reviewing it now.',
          quality: 'acceptable',
          explanation:
            'It is accurate but lacks the known business context and next update time.',
        },
        {
          id: 'announce-outage',
          message:
            'Forecasting is down for the finance team because CPU was high earlier.',
          quality: 'poor',
          explanation:
            'It contradicts current service health and peer evidence while overstating customer impact.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        "The analyst's account and workspace membership were healthy, but onboarding omitted the forecasting entitlement. A narrowly scoped entitlement assignment restores access without disturbing working peers.",
      evidence_chain: [
        'service-status',
        'peer-user-scope',
        'entitlement-configuration',
        'entitlement-audit-history',
      ],
      efficient_path: [
        { kind: 'framework_step', ref: 'establish-impact' },
        { kind: 'evidence', ref: 'service-status' },
        { kind: 'framework_step', ref: 'determine-scope' },
        { kind: 'evidence', ref: 'peer-user-scope' },
        { kind: 'framework_step', ref: 'test-hypothesis' },
        { kind: 'evidence', ref: 'entitlement-configuration' },
        { kind: 'framework_step', ref: 'check-recent-changes' },
        { kind: 'evidence', ref: 'entitlement-audit-history' },
      ],
      transferable_lesson:
        "Scope narrows the failing layer. When one user fails while peers succeed, inspect that user's configuration and provisioning history before changing a healthy shared service.",
    },
  },
  {
    id: 'fnd-002',
    version: 1,
    title: 'Did the deployment cause the failure?',
    domain: 'fundamentals',
    difficulty: 'intermediate',
    estimated_minutes: 9,
    learning: {
      concepts: ['timeline-analysis', 'causal-reasoning'],
      objectives: ['Build a timeline before accepting a causal claim.'],
    },
    variations: {
      customer_names: ['Maple Harbor', 'Silver Lantern', 'Orchard Vale'],
      timestamp_offsets_minutes: [0, 27],
    },
    customer_context: [
      '{{customerName}} is a fictional planning company.',
      'Its operations team is preparing a regional planning run.',
    ],
    brief: {
      severity: 'high',
      business_impact:
        'Regional planners cannot complete the morning run on schedule.',
      symptom_variants: [
        'A workflow began failing after a deployment was announced.',
        'Teams want the deployment rolled back because failures appeared that morning.',
      ],
    },
    root_cause: {
      id: 'approval-policy-changed',
      category: 'configuration',
      explanation:
        'An approval policy change rejected runs before the later deployment began.',
    },
    hypotheses: [
      {
        id: 'approval-policy-changed',
        label: 'A policy change rejected the new runs.',
      },
      {
        id: 'deployment-defect',
        label: 'The deployment introduced a processing defect.',
      },
      { id: 'service-outage', label: 'A shared service is unavailable.' },
    ],
    evidence: [
      {
        id: 'release-timeline',
        tool: 'audit_log',
        cost: 1,
        relevance: 'supporting',
        unlock_after: [],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: 0, clock: '09:40' },
              event: 'Deployment started after failures were reported.',
            },
          ],
        },
        explanation: 'The deployment occurred after the first failure.',
      },
      {
        id: 'failure-timeline',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['release-timeline'],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: 0, clock: '09:12' },
              event: 'First run was rejected by an approval check.',
            },
          ],
        },
        explanation: 'The failure predates the release.',
      },
      {
        id: 'policy-audit',
        tool: 'role_configuration',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['failure-timeline'],
        content: {
          kind: 'key_value',
          values: {
            prior_policy: 'Regional plans accepted',
            current_policy: 'Director approval required',
            changed_at: '09:05',
          },
        },
        explanation: 'The policy changed shortly before the failures.',
      },
      {
        id: 'tenant-comparison',
        tool: 'user_scope',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['policy-audit'],
        content: {
          kind: 'table',
          columns: ['cohort', 'policy', 'result'],
          rows: [
            {
              cohort: 'Affected region',
              policy: 'Director approval',
              result: 'Rejected',
            },
            {
              cohort: 'Other region',
              policy: 'Standard approval',
              result: 'Accepted',
            },
          ],
        },
        explanation: 'Only the changed policy cohort fails.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'restore-policy',
          label: 'Restore the approved regional policy',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It restores the prior validated approval path.',
        },
        {
          id: 'add-policy-review',
          label: 'Require approval-policy review and validation',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It catches future policy changes before impact.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'scoped-update',
          message:
            'We confirmed the failures began before the deployment and are correcting a regional approval policy; the next update is in 20 minutes.',
          quality: 'excellent',
          explanation: 'It states verified timing and a clear next step.',
        },
        {
          id: 'impact-update',
          message:
            'The issue is limited to one regional planning path and we are restoring its approved configuration.',
          quality: 'excellent',
          explanation: 'It communicates scope without speculation.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'A policy change preceded both the failures and the deployment.',
      evidence_chain: [
        'release-timeline',
        'failure-timeline',
        'policy-audit',
        'tenant-comparison',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'release-timeline' },
        { kind: 'evidence', ref: 'failure-timeline' },
        { kind: 'evidence', ref: 'policy-audit' },
        { kind: 'evidence', ref: 'tenant-comparison' },
      ],
      transferable_lesson: 'Build a timeline before accepting a causal claim.',
    },
  },
  {
    id: 'fnd-003',
    version: 1,
    title: 'Export appears to be missing',
    domain: 'fundamentals',
    difficulty: 'beginner',
    estimated_minutes: 8,
    learning: {
      concepts: ['expected-behavior', 'time-boundaries'],
      objectives: ['Verify expected behavior and time boundaries.'],
    },
    variations: {
      customer_names: ['Cobalt Grove', 'Brightfield Supply', 'Willow Metric'],
      timestamp_offsets_minutes: [0, 35],
    },
    customer_context: [
      '{{customerName}} is a fictional analytics firm.',
      'Its finance team requested a daily export.',
    ],
    brief: {
      severity: 'medium',
      business_impact:
        'Finance cannot locate the expected export before reconciliation.',
      symptom_variants: [
        'A requested daily export looks empty in the local morning.',
        'A team reports that records from the prior evening are missing.',
      ],
    },
    root_cause: {
      id: 'utc-range-interpretation',
      category: 'expectation',
      explanation:
        'The request used local dates while export boundaries are UTC.',
    },
    hypotheses: [
      {
        id: 'utc-range-interpretation',
        label: 'The date range was interpreted with UTC boundaries.',
      },
      { id: 'export-job-failure', label: 'The export job omitted records.' },
      { id: 'storage-delay', label: 'Export storage is delayed.' },
    ],
    evidence: [
      {
        id: 'requested-range',
        tool: 'audit_log',
        cost: 1,
        relevance: 'supporting',
        unlock_after: [],
        content: {
          kind: 'key_value',
          values: {
            requested_dates: 'October 10 local',
            request_time: 'October 11 08:10 local',
          },
        },
        explanation: 'The request names a local calendar date.',
      },
      {
        id: 'exported-timestamps',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['requested-range'],
        content: {
          kind: 'table',
          columns: ['record', 'exported_at'],
          rows: [
            { record: 'Late transaction', exported_at: 'October 10 19:05 UTC' },
          ],
        },
        explanation:
          'The supposedly missing record is inside the UTC export range.',
      },
      {
        id: 'user-timezone',
        tool: 'user_scope',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['exported-timestamps'],
        content: {
          kind: 'key_value',
          values: {
            requester_timezone: 'UTC+05:30',
            late_transaction_local: 'October 11 00:35',
          },
        },
        explanation: 'Local midnight differs from the export boundary.',
      },
      {
        id: 'date-filter-help',
        tool: 'role_configuration',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['user-timezone'],
        content: {
          kind: 'text',
          text: 'Export date filters use UTC from 00:00 through 23:59.',
        },
        explanation: 'Documented behavior matches the observed result.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'clarify-range',
          label: 'Re-run using the needed UTC range',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It selects the intended records.',
        },
        {
          id: 'show-timezone-help',
          label: 'Show timezone boundaries in export requests',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It makes behavior explicit.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'explain-boundary',
          message:
            'We verified the export completed; the apparent gap is a local-versus-UTC date boundary, and we are preparing the requested local range now.',
          quality: 'excellent',
          explanation: 'It distinguishes behavior from failure.',
        },
        {
          id: 'update-finance',
          message:
            'Finance records are available and we will confirm the corrected range within 20 minutes.',
          quality: 'excellent',
          explanation: 'It gives scope and a checkpoint.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'UTC export boundaries placed the late local record in a different date range.',
      evidence_chain: [
        'requested-range',
        'exported-timestamps',
        'user-timezone',
        'date-filter-help',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'requested-range' },
        { kind: 'evidence', ref: 'exported-timestamps' },
        { kind: 'evidence', ref: 'user-timezone' },
        { kind: 'evidence', ref: 'date-filter-help' },
      ],
      transferable_lesson: 'Verify expected behavior and time boundaries.',
    },
  },
  {
    id: 'iam-001',
    version: 1,
    title: 'Login works, feature does not',
    domain: 'identity',
    difficulty: 'beginner',
    estimated_minutes: 8,
    learning: {
      concepts: [
        'authentication-vs-authorization',
        'role-based-access-control',
        'evidence-driven-troubleshooting',
      ],
      objectives: [
        'Distinguish successful authentication from failed authorization.',
        'Use scope and audit evidence to identify an access regression.',
      ],
    },
    variations: {
      customer_names: [
        'Northstar Components',
        'Meridian Fabrication',
        'Cedar Ridge Works',
      ],
      timestamp_offsets_minutes: [0, 17, 43],
    },
    customer_context: [
      '{{customerName}} is a fictional manufacturer using role-based access for its finance workspace.',
      'The finance team is completing its month-end reporting cycle.',
    ],
    brief: {
      severity: 'high',
      business_impact:
        'Two finance users cannot complete month-end reporting while their reporting access is unavailable.',
      symptom_variants: [
        'Two finance users can sign in, but reporting shows an access-denied message.',
        'Reporting works for other finance teammates while two recently affected users cannot open it.',
      ],
    },
    root_cause: {
      id: 'reporting-role-removed',
      category: 'authorization',
      explanation:
        'A recent access change removed the reporting role from both affected users while leaving their accounts and authentication intact.',
    },
    hypotheses: [
      {
        id: 'reporting-role-removed',
        label:
          "A recent role change removed the affected users' reporting authorization.",
      },
      {
        id: 'reporting-service-outage',
        label: 'The reporting service is experiencing an outage.',
      },
      {
        id: 'authentication-session-failure',
        label: "The affected users' authentication sessions are invalid.",
      },
      {
        id: 'browser-compatibility-change',
        label:
          'A browser update is preventing the reporting interface from loading.',
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
          kind: 'status',
          state: 'operational',
          detail:
            'Reporting and identity services are healthy with no active incidents.',
        },
        explanation:
          'Healthy services make a platform-wide outage less likely but do not explain the user-specific failure.',
      },
      {
        id: 'affected-user-scope',
        tool: 'user_scope',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: {
          kind: 'table',
          columns: ['cohort', 'sign_in', 'reporting_access'],
          rows: [
            {
              cohort: 'Two affected finance users',
              sign_in: 'Successful',
              reporting_access: 'Denied',
            },
            {
              cohort: 'Other finance users',
              sign_in: 'Successful',
              reporting_access: 'Available',
            },
          ],
        },
        explanation:
          'The comparison confines the problem to two user access profiles rather than the shared reporting service.',
      },
      {
        id: 'authentication-events',
        tool: 'identity_events',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['affected-user-scope'],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: 0, clock: '09:02' },
              event: 'First affected user completed sign-in successfully.',
            },
            {
              time: { day_offset: 0, clock: '09:05' },
              event: 'Second affected user completed sign-in successfully.',
            },
            {
              time: { day_offset: 0, clock: '09:06' },
              event: 'Reporting authorization checks returned access denied.',
            },
          ],
        },
        explanation:
          'Successful sign-ins rule out an authentication failure and direct the investigation toward authorization.',
      },
      {
        id: 'role-configuration',
        tool: 'role_configuration',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['authentication-events'],
        content: {
          kind: 'key_value',
          values: {
            affected_users_reporting_role: 'Not assigned',
            peer_users_reporting_role: 'Assigned',
            account_status: 'Active',
          },
        },
        explanation:
          'The affected users are active but lack the role that grants reporting access.',
      },
      {
        id: 'role-audit-history',
        tool: 'audit_log',
        cost: 3,
        relevance: 'critical',
        unlock_after: ['role-configuration'],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: -1, clock: '16:40' },
              event: 'An approved finance-group cleanup began.',
            },
            {
              time: { day_offset: -1, clock: '16:43' },
              event:
                'The reporting role was removed from both affected users during the cleanup.',
            },
            {
              time: { day_offset: -1, clock: '16:45' },
              event:
                'The cleanup completed without a post-change access review.',
            },
          ],
        },
        explanation:
          'The audit trail identifies the change that caused the authorization regression and the missing verification step.',
      },
    ],
    red_herrings: {
      pool: [
        {
          id: 'browser-update',
          label:
            "A browser update was installed on one affected user's laptop.",
          explanation:
            'The timing is plausible, but the server-side access denial and missing roles show that the browser change is not causal.',
        },
      ],
      choose: 1,
    },
    remediation: {
      choices: [
        {
          id: 'restore-reporting-role',
          label:
            'Restore the reporting role to the two affected users after confirming the approved access baseline.',
          phase: 'immediate',
          quality: 'correct',
          explanation:
            'This safely restores the authorization required for month-end work without changing authentication controls.',
        },
        {
          id: 'restart-reporting-service',
          label: 'Restart the reporting service for all customers.',
          phase: 'immediate',
          quality: 'incorrect',
          explanation:
            'The service is healthy, and a restart would add risk without correcting user permissions.',
        },
        {
          id: 'clear-browser-data',
          label: 'Ask both users to clear browser data and retry.',
          phase: 'immediate',
          quality: 'partial',
          explanation:
            'A retry may be harmless, but it does not repair the missing server-side role.',
        },
        {
          id: 'require-role-change-review',
          label:
            'Require peer review and post-change access verification for bulk role changes.',
          phase: 'prevention',
          quality: 'correct',
          explanation:
            'Review and verification reduce the chance that future cleanup work silently removes required access.',
        },
        {
          id: 'disable-role-cleanups',
          label: 'Permanently stop all role cleanup work.',
          phase: 'prevention',
          quality: 'incorrect',
          explanation:
            'Avoiding maintenance leaves stale access in place instead of making changes safer.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'share-scoped-update',
          message:
            'We confirmed reporting is healthy and the issue is limited to two finance users. Their sign-ins succeed, and we are reviewing their reporting permissions now; the next update will follow within 30 minutes.',
          quality: 'excellent',
          explanation:
            'It states verified scope, separates sign-in from permissions, describes the next action, and gives a clear update window.',
        },
        {
          id: 'share-generic-investigation',
          message:
            'We are investigating the reporting issue and will share more information when available.',
          quality: 'acceptable',
          explanation:
            'It acknowledges the issue but omits the known scope, impact, and next checkpoint.',
        },
        {
          id: 'blame-browser-update',
          message:
            'A browser update caused this, so please reinstall the browser while we close the case.',
          quality: 'poor',
          explanation:
            'It presents an unproven distractor as fact and recommends disruptive work before reviewing stronger evidence.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'Both users authenticated successfully, but a bulk cleanup removed the role that authorized reporting. Restoring that role resolves the immediate impact; reviewing future role changes addresses recurrence.',
      evidence_chain: [
        'service-status',
        'affected-user-scope',
        'authentication-events',
        'role-configuration',
        'role-audit-history',
      ],
      efficient_path: [
        { kind: 'framework_step', ref: 'establish-impact' },
        { kind: 'evidence', ref: 'service-status' },
        { kind: 'framework_step', ref: 'determine-scope' },
        { kind: 'evidence', ref: 'affected-user-scope' },
        { kind: 'evidence', ref: 'authentication-events' },
        { kind: 'framework_step', ref: 'test-hypothesis' },
        { kind: 'evidence', ref: 'role-configuration' },
        { kind: 'framework_step', ref: 'check-recent-changes' },
        { kind: 'evidence', ref: 'role-audit-history' },
      ],
      transferable_lesson:
        'A successful login proves authentication, not authorization. When a feature fails for only some users, compare their access configuration with working peers and confirm recent changes in the audit trail.',
    },
  },
  {
    id: 'iam-004',
    version: 1,
    title: 'New users are not provisioned',
    domain: 'identity',
    difficulty: 'intermediate',
    estimated_minutes: 9,
    learning: {
      concepts: ['provisioning', 'authentication'],
      objectives: ['Separate SSO health from provisioning health.'],
    },
    variations: {
      customer_names: ['Pine Harbor', 'Golden Thread', 'Lakefront Tools'],
      timestamp_offsets_minutes: [0, 24],
    },
    customer_context: [
      '{{customerName}} is a fictional manufacturer.',
      'New starters need access before a shift change.',
    ],
    brief: {
      severity: 'high',
      business_impact:
        'New employees cannot begin work while existing staff continue to sign in.',
      symptom_variants: [
        'New accounts are not appearing while existing sign-in remains normal.',
        'Onboarding requests are rejected even though SSO works.',
      ],
    },
    root_cause: {
      id: 'required-provisioning-attribute-unmapped',
      category: 'provisioning',
      explanation:
        'A required employee attribute was not mapped into provisioning.',
    },
    hypotheses: [
      {
        id: 'required-provisioning-attribute-unmapped',
        label: 'A required provisioning attribute is unmapped.',
      },
      { id: 'sso-outage', label: 'SSO is unavailable.' },
      { id: 'directory-delay', label: 'The directory is delayed.' },
    ],
    evidence: [
      {
        id: 'authentication-health',
        tool: 'identity_events',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: {
          kind: 'status',
          state: 'operational',
          detail: 'Existing users complete SSO successfully.',
        },
        explanation: 'Authentication is healthy.',
      },
      {
        id: 'provisioning-response',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['authentication-health'],
        content: {
          kind: 'key_value',
          values: {
            response: 'validation rejected',
            affected: 'new users only',
          },
        },
        explanation: 'The failure is in provisioning.',
      },
      {
        id: 'validation-error',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['provisioning-response'],
        content: {
          kind: 'text',
          text: 'Required field costCenter was not supplied.',
        },
        explanation: 'The validation identifies the missing field.',
      },
      {
        id: 'attribute-map',
        tool: 'role_configuration',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['validation-error'],
        content: {
          kind: 'key_value',
          values: { employee_id: 'mapped', cost_center: 'unmapped' },
        },
        explanation: 'The required attribute mapping is absent.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'map-cost-center',
          label: 'Map the approved required attribute and retry affected users',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It repairs provisioning input.',
        },
        {
          id: 'mapping-validation',
          label: 'Validate required mappings after identity changes',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It prevents silent onboarding failures.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'provision-update',
          message:
            'Existing SSO is healthy; the issue affects new-user provisioning and we are restoring a required attribute mapping.',
          quality: 'excellent',
          explanation: 'It separates the two systems.',
        },
        {
          id: 'starter-update',
          message:
            'The impact is limited to new starters and we will confirm restored provisioning within 20 minutes.',
          quality: 'excellent',
          explanation: 'It provides scope and timing.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'SSO remained healthy, but provisioning lacked a required attribute mapping.',
      evidence_chain: [
        'authentication-health',
        'provisioning-response',
        'validation-error',
        'attribute-map',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'authentication-health' },
        { kind: 'evidence', ref: 'provisioning-response' },
        { kind: 'evidence', ref: 'validation-error' },
        { kind: 'evidence', ref: 'attribute-map' },
      ],
      transferable_lesson: 'SSO and provisioning are separate.',
    },
  },
  {
    id: 'int-001',
    version: 1,
    title: 'Duplicate customer records arrive',
    domain: 'integrations',
    difficulty: 'intermediate',
    estimated_minutes: 9,
    learning: {
      concepts: ['idempotency', 'delivery'],
      objectives: ['Apply idempotency to at-least-once delivery.'],
    },
    variations: {
      customer_names: ['Morrow Cart', 'Fieldstone Market', 'Nova Pantry'],
      timestamp_offsets_minutes: [0, 29],
    },
    customer_context: [
      '{{customerName}} is a fictional commerce company.',
      'Its support team sees duplicate customer records.',
    ],
    brief: {
      severity: 'medium',
      business_impact:
        'Support must pause customer updates while duplicates are reviewed.',
      symptom_variants: [
        'Customer records appear twice after delayed deliveries.',
        'A downstream record is created more than once for the same event.',
      ],
    },
    root_cause: {
      id: 'webhook-duplicate-not-idempotent',
      category: 'integration',
      explanation:
        'Repeated delivery was processed without an idempotency check.',
    },
    hypotheses: [
      {
        id: 'webhook-duplicate-not-idempotent',
        label: 'Repeated delivery lacks idempotent handling.',
      },
      {
        id: 'source-duplicate-event',
        label: 'The source created duplicate events.',
      },
      {
        id: 'database-corruption',
        label: 'Storage corrupted customer records.',
      },
    ],
    evidence: [
      {
        id: 'delivery-identifiers',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: {
          kind: 'table',
          columns: ['delivery_id', 'event_id'],
          rows: [
            { delivery_id: 'd-100', event_id: 'e-42' },
            { delivery_id: 'd-101', event_id: 'e-42' },
          ],
        },
        explanation: 'Two deliveries reference one event.',
      },
      {
        id: 'first-delivery-timeout',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['delivery-identifiers'],
        content: {
          kind: 'timeline',
          events: [
            {
              time: { day_offset: 0, clock: '10:01' },
              event: 'First delivery timed out before acknowledgement.',
            },
          ],
        },
        explanation: 'A timeout reasonably triggered redelivery.',
      },
      {
        id: 'duplicate-records',
        tool: 'user_scope',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['first-delivery-timeout'],
        content: {
          kind: 'table',
          columns: ['event_id', 'records_created'],
          rows: [{ event_id: 'e-42', records_created: '2' }],
        },
        explanation: 'Both deliveries created records.',
      },
      {
        id: 'idempotency-store',
        tool: 'role_configuration',
        cost: 2,
        relevance: 'critical',
        unlock_after: ['duplicate-records'],
        content: {
          kind: 'key_value',
          values: {
            processed_event_store: 'absent',
            duplicate_check: 'disabled',
          },
        },
        explanation: 'No idempotency guard exists.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'deduplicate-event',
          label:
            'Deduplicate affected records and store processed event identifiers',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It repairs current data and prevents repeats.',
        },
        {
          id: 'idempotency-test',
          label: 'Test redelivery behavior before releases',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It proves safe retries.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'delivery-update',
          message:
            'We confirmed repeat delivery of the same event created duplicates and are reconciling only the affected records.',
          quality: 'excellent',
          explanation: 'It states cause and scope.',
        },
        {
          id: 'support-update',
          message:
            'Customer updates are paused for the impacted records while we complete a safe reconciliation.',
          quality: 'excellent',
          explanation: 'It gives operational guidance.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'A timeout caused a normal redelivery, which created another record because processing was not idempotent.',
      evidence_chain: [
        'delivery-identifiers',
        'first-delivery-timeout',
        'duplicate-records',
        'idempotency-store',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'delivery-identifiers' },
        { kind: 'evidence', ref: 'first-delivery-timeout' },
        { kind: 'evidence', ref: 'duplicate-records' },
        { kind: 'evidence', ref: 'idempotency-store' },
      ],
      transferable_lesson: 'At-least-once delivery requires idempotency.',
    },
  },
  {
    id: 'int-004',
    version: 1,
    title: 'Retry storm overwhelms the queue',
    domain: 'integrations',
    difficulty: 'advanced',
    estimated_minutes: 10,
    learning: {
      concepts: ['queues', 'backoff'],
      objectives: ['Recognize how healthy workers can be overwhelmed.'],
    },
    variations: {
      customer_names: ['Hearthline', 'Umber Coast', 'Meridian Cart'],
      timestamp_offsets_minutes: [0, 26],
    },
    customer_context: [
      '{{customerName}} is a fictional fulfillment company.',
      'Its order updates are delayed.',
    ],
    brief: {
      severity: 'high',
      business_impact:
        'Order updates are delayed while the processing queue grows.',
      symptom_variants: [
        'A provider capacity response is followed by a rapidly growing queue.',
        'Workers stay online but completed updates fall behind.',
      ],
    },
    root_cause: {
      id: 'retry-storm-queue-backlog',
      category: 'retry-policy',
      explanation:
        'A retry storm overloaded the queue despite healthy workers.',
    },
    hypotheses: [
      {
        id: 'retry-storm-queue-backlog',
        label: 'Fast retries are flooding the queue.',
      },
      { id: 'worker-outage', label: 'Workers are unavailable.' },
      {
        id: 'provider-permanent-failure',
        label: 'The provider has permanently failed.',
      },
    ],
    evidence: [
      {
        id: 'rate-limit-responses',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: {
          kind: 'key_value',
          values: { response: '429 rate limited' },
        },
        explanation: 'Provider capacity is temporarily constrained.',
      },
      {
        id: 'retry-intervals',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['rate-limit-responses'],
        content: {
          kind: 'key_value',
          values: {
            configured_interval: '1 second',
            provider_wait: '60 seconds',
          },
        },
        explanation: 'Retries are too frequent.',
      },
      {
        id: 'queue-depth',
        tool: 'service_status',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['retry-intervals'],
        content: {
          kind: 'table',
          columns: ['time', 'queued'],
          rows: [
            { time: '09:00', queued: '80' },
            { time: '09:10', queued: '1400' },
          ],
        },
        explanation: 'Queue depth grows with retries.',
      },
      {
        id: 'worker-throughput',
        tool: 'service_status',
        cost: 1,
        relevance: 'supporting',
        unlock_after: ['queue-depth'],
        content: {
          kind: 'status',
          state: 'operational',
          detail: 'Workers are healthy and processing their capacity.',
        },
        explanation: 'Healthy workers cannot absorb retry amplification.',
      },
      {
        id: 'provider-recovery',
        tool: 'service_status',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['worker-throughput'],
        content: {
          kind: 'status',
          state: 'recovered',
          detail: 'Provider accepts paced requests after recovery.',
        },
        explanation: 'Backoff allows recovery.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'pause-and-backoff',
          label: 'Pause rapid retries and honor paced backoff',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It drains the queue safely.',
        },
        {
          id: 'queue-guardrail',
          label: 'Add retry and queue-depth circuit breakers',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It prevents another storm.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'queue-update',
          message:
            'Workers are healthy; rapid retries after a provider capacity response are growing the queue, and we are applying paced recovery.',
          quality: 'excellent',
          explanation: 'It correctly states scope and action.',
        },
        {
          id: 'fulfillment-update',
          message:
            'Order updates are delayed but preserved in the queue; we will report recovery progress within 20 minutes.',
          quality: 'excellent',
          explanation: 'It gives customer-relevant status.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'Healthy workers were overwhelmed by retry volume after a temporary rate limit.',
      evidence_chain: [
        'rate-limit-responses',
        'retry-intervals',
        'queue-depth',
        'worker-throughput',
        'provider-recovery',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'rate-limit-responses' },
        { kind: 'evidence', ref: 'retry-intervals' },
        { kind: 'evidence', ref: 'queue-depth' },
        { kind: 'evidence', ref: 'worker-throughput' },
        { kind: 'evidence', ref: 'provider-recovery' },
      ],
      transferable_lesson: 'Healthy workers can still be overwhelmed.',
    },
  },
  {
    id: 'web-001',
    version: 1,
    title: 'One browser profile cannot load settings',
    domain: 'browser',
    difficulty: 'beginner',
    estimated_minutes: 8,
    learning: {
      concepts: ['client-comparison', 'local-state'],
      objectives: [
        'Compare client environments before changing a healthy service.',
      ],
    },
    variations: {
      customer_names: ['Frostline Studio', 'Amber Desk', 'Clover Point'],
      timestamp_offsets_minutes: [0, 21],
    },
    customer_context: [
      '{{customerName}} is a fictional design agency.',
      'One administrator cannot open workspace settings.',
    ],
    brief: {
      severity: 'medium',
      business_impact:
        'One administrator is delayed while other administrators continue configuration work.',
      symptom_variants: [
        'Settings fail in one browser profile while another profile succeeds.',
        'One administrator sees an outdated settings screen after a recent change.',
      ],
    },
    root_cause: {
      id: 'stale-local-configuration',
      category: 'client-state',
      explanation:
        'A browser profile retained an obsolete local configuration.',
    },
    hypotheses: [
      {
        id: 'stale-local-configuration',
        label: 'The affected browser profile has stale local configuration.',
      },
      {
        id: 'server-settings-outage',
        label: 'The settings service is unavailable.',
      },
      {
        id: 'account-permission-loss',
        label: 'The administrator lost permission.',
      },
    ],
    evidence: [
      {
        id: 'server-request-result',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: [],
        content: {
          kind: 'key_value',
          values: {
            server_result: '200 success',
            affected_account: 'authorized',
          },
        },
        explanation: 'The server accepts the request.',
      },
      {
        id: 'clean-profile-comparison',
        tool: 'user_scope',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['server-request-result'],
        content: {
          kind: 'table',
          columns: ['profile', 'result'],
          rows: [
            { profile: 'Affected browser profile', result: 'fails' },
            { profile: 'Clean browser profile', result: 'loads' },
          ],
        },
        explanation: 'The failure is profile-specific.',
      },
      {
        id: 'local-state-timestamp',
        tool: 'audit_log',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['clean-profile-comparison'],
        content: {
          kind: 'key_value',
          values: {
            local_state_saved: '30 days ago',
            latest_release: '2 days ago',
          },
        },
        explanation: 'Local state predates the release.',
      },
      {
        id: 'cached-config-version',
        tool: 'role_configuration',
        cost: 1,
        relevance: 'critical',
        unlock_after: ['local-state-timestamp'],
        content: {
          kind: 'key_value',
          values: {
            affected_profile: 'config v4',
            current_service: 'config v5',
          },
        },
        explanation: 'The profile uses an obsolete cached configuration.',
      },
    ],
    red_herrings: { pool: [], choose: 0 },
    remediation: {
      choices: [
        {
          id: 'refresh-local-state',
          label: 'Clear the obsolete local configuration and reload settings',
          phase: 'immediate',
          quality: 'correct',
          explanation: 'It refreshes only the affected client state.',
        },
        {
          id: 'cache-versioning',
          label: 'Version and expire client configuration safely',
          phase: 'prevention',
          quality: 'correct',
          explanation: 'It prevents stale settings from persisting.',
        },
      ],
    },
    communication: {
      choices: [
        {
          id: 'browser-update',
          message:
            'The service and account are healthy; the issue is isolated to one browser profile and we are refreshing its local configuration.',
          quality: 'excellent',
          explanation: 'It states verified scope and action.',
        },
        {
          id: 'admin-update',
          message:
            'Other administrators remain able to work, and we will confirm the affected profile recovery within 20 minutes.',
          quality: 'excellent',
          explanation: 'It communicates impact and timing.',
        },
      ],
    },
    debrief: {
      root_cause_explanation:
        'A stale browser configuration conflicted with the current service configuration.',
      evidence_chain: [
        'server-request-result',
        'clean-profile-comparison',
        'local-state-timestamp',
        'cached-config-version',
      ],
      efficient_path: [
        { kind: 'evidence', ref: 'server-request-result' },
        { kind: 'evidence', ref: 'clean-profile-comparison' },
        { kind: 'evidence', ref: 'local-state-timestamp' },
        { kind: 'evidence', ref: 'cached-config-version' },
      ],
      transferable_lesson: 'Compare client environments.',
    },
  },
]
