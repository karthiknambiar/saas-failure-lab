import type { ScenarioSource } from '../content/scenario-schema'

export const scenarioCatalog: ScenarioSource[] = [
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
]
