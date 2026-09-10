import type {
  AuditEventSummary,
  DashboardStats,
  ExecutionSummary,
  IntegrationCredentialSummary,
  RolePolicySummary,
  ScheduleSummary,
  TeamMemberSummary,
  WorkflowDetail,
  WorkflowSummary,
} from "@flowforge/shared";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4200/api";

const fallbackWorkflows: WorkflowSummary[] = [
  {
    id: "wf_demo_customer_onboarding",
    slug: "customer-onboarding",
    name: "Customer onboarding",
    description:
      "Creates internal follow-up tasks when a new customer signs up.",
    status: "active",
    triggerType: "webhook",
    retryLimit: 3,
    timeoutSeconds: 90,
    runCount: 128,
    successCount: 124,
    failureCount: 4,
    lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    stepsCount: 4,
  },
  {
    id: "wf_demo_payment_failure",
    slug: "payment-failure-alert",
    name: "Payment failure alert",
    description:
      "Escalates failed invoice payments and schedules a retry task.",
    status: "active",
    triggerType: "webhook",
    retryLimit: 5,
    timeoutSeconds: 120,
    runCount: 76,
    successCount: 68,
    failureCount: 8,
    lastRunAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    stepsCount: 4,
  },
  {
    id: "wf_demo_crm_sync",
    slug: "daily-crm-sync",
    name: "Daily CRM sync",
    description:
      "Runs every morning and syncs qualified accounts into CRM segments.",
    status: "active",
    triggerType: "schedule",
    retryLimit: 2,
    timeoutSeconds: 300,
    runCount: 31,
    successCount: 30,
    failureCount: 1,
    lastRunAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    stepsCount: 3,
  },
];

const fallbackSchedules: ScheduleSummary[] = [
  {
    id: "schedule_daily_crm_sync",
    workflowId: "wf_demo_crm_sync",
    workflowName: "Daily CRM sync",
    workflowSlug: "daily-crm-sync",
    cron: "0 8 * * 1-5",
    timezone: "Europe/Prague",
    enabled: true,
    nextRunAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    lastTriggeredAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    isDue: true,
  },
];

const fallbackWorkflowDetail: WorkflowDetail = {
  ...fallbackWorkflows[0]!,
  webhookUrl: "/api/webhooks/customer-onboarding",
  schedule: null,
  steps: [
    {
      id: "step_1",
      type: "trigger",
      name: "Receive signup webhook",
      position: 1,
      config: { event: "customer.created", source: "billing-system" },
    },
    {
      id: "step_2",
      type: "condition",
      name: "Check paid plan",
      position: 2,
      config: {
        field: "plan",
        operator: "in",
        value: ["pro", "business", "enterprise"],
      },
    },
    {
      id: "step_3",
      type: "action",
      name: "Create CRM task",
      position: 3,
      config: { provider: "crm", taskType: "sales-follow-up" },
    },
    {
      id: "step_4",
      type: "action",
      name: "Notify customer success",
      position: 4,
      config: { channel: "#customer-success" },
    },
  ],
};

const fallbackExecutions: ExecutionSummary[] = [
  {
    id: "exec_1",
    workflowId: "wf_demo_customer_onboarding",
    workflowName: "Customer onboarding",
    workflowSlug: "customer-onboarding",
    status: "success",
    triggerType: "webhook",
    attempt: 1,
    durationMs: 760,
    startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 25 * 60 * 1000 + 760).toISOString(),
    error: null,
    stepExecutions: [
      {
        id: "step_exec_1",
        stepId: "step_1",
        stepName: "Receive signup webhook",
        stepType: "trigger",
        position: 1,
        status: "success",
        durationMs: 160,
        output: { ok: true },
        error: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      },
    ],
    logs: [
      {
        id: "log_1",
        stepName: "Receive signup webhook",
        level: "info",
        message: "Incoming payload validated",
        metadata: {},
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

const fallbackIntegrations: IntegrationCredentialSummary[] = [
  {
    id: "integration_crm",
    provider: "crm",
    displayName: "HubSpot CRM",
    status: "connected",
    environment: "production",
    scopes: ["contacts:read", "contacts:write", "tasks:write"],
    maskedSecret: "hs_pat_••••_8f2a",
    lastCheckedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 88 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "integration_billing",
    provider: "billing",
    displayName: "Stripe Billing",
    status: "degraded",
    environment: "production",
    scopes: ["events:read", "invoices:read"],
    maskedSecret: "sk_live_••••_1c9d",
    lastCheckedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const fallbackAuditEvents: AuditEventSummary[] = [
  {
    id: "audit_1",
    actorName: "Demo Operator",
    actorEmail: "demo@flowforge.dev",
    entityType: "integration",
    entityId: "stripe-billing",
    action: "integration.health_checked",
    summary: "Stripe Billing health check finished as degraded",
    metadata: { provider: "billing", nextStatus: "degraded" },
    createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    id: "audit_2",
    actorName: "Demo Operator",
    actorEmail: "demo@flowforge.dev",
    entityType: "workflow",
    entityId: "wf_demo_customer_onboarding",
    action: "workflow.created",
    summary: "Customer onboarding workflow was created",
    metadata: { triggerType: "webhook" },
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
  },
];

const fallbackTeamMembers: TeamMemberSummary[] = [
  {
    id: "member_owner",
    userId: "user_owner",
    name: "Demo Operator",
    email: "demo@flowforge.dev",
    role: "owner",
    status: "active",
    permissions: [
      "workflows:read",
      "workflows:write",
      "workflows:execute",
      "integrations:read",
      "integrations:manage",
      "audit:read",
      "team:read",
      "team:manage",
    ],
    lastActiveAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "member_operator",
    userId: "user_operator",
    name: "Alex Automation",
    email: "alex.automation@northstar.dev",
    role: "operator",
    status: "active",
    permissions: [
      "workflows:read",
      "workflows:execute",
      "integrations:read",
      "audit:read",
      "team:read",
    ],
    lastActiveAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
];

const fallbackRolePolicies: RolePolicySummary[] = [
  {
    role: "owner",
    description:
      "Full workspace control, billing-level governance, and team management.",
    permissions: [
      "workflows:read",
      "workflows:write",
      "workflows:execute",
      "integrations:read",
      "integrations:manage",
      "audit:read",
      "team:read",
      "team:manage",
    ],
  },
  {
    role: "operator",
    description:
      "Can run workflows and debug executions without changing security settings.",
    permissions: [
      "workflows:read",
      "workflows:execute",
      "integrations:read",
      "audit:read",
      "team:read",
    ],
  },
];

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchJson<DashboardStats>("/workflows/stats", {
    totalWorkflows: fallbackWorkflows.length,
    activeWorkflows: fallbackWorkflows.filter(
      (workflow) => workflow.status === "active",
    ).length,
    runsToday: 2,
    failedRuns: 1,
    queuedExecutions: 0,
    runningExecutions: 0,
    retryingExecutions: 1,
    successRate: 67,
  });
}

export async function getWorkflows(): Promise<WorkflowSummary[]> {
  return fetchJson<WorkflowSummary[]>("/workflows", fallbackWorkflows);
}

export async function getWorkflow(
  slug = "customer-onboarding",
): Promise<WorkflowDetail> {
  return fetchJson<WorkflowDetail>(
    `/workflows/${slug}`,
    fallbackWorkflowDetail,
  );
}

export async function getExecutions(): Promise<ExecutionSummary[]> {
  return fetchJson<ExecutionSummary[]>("/executions", fallbackExecutions);
}

export async function getDueSchedules(): Promise<ScheduleSummary[]> {
  return fetchJson<ScheduleSummary[]>("/schedules/due", fallbackSchedules);
}

export async function getIntegrations(): Promise<
  IntegrationCredentialSummary[]
> {
  return fetchJson<IntegrationCredentialSummary[]>(
    "/integrations",
    fallbackIntegrations,
  );
}

export async function getAuditEvents(): Promise<AuditEventSummary[]> {
  return fetchJson<AuditEventSummary[]>("/audit-events", fallbackAuditEvents);
}

export async function getTeamMembers(): Promise<TeamMemberSummary[]> {
  return fetchJson<TeamMemberSummary[]>("/team", fallbackTeamMembers);
}

export async function getRolePolicies(): Promise<RolePolicySummary[]> {
  return fetchJson<RolePolicySummary[]>(
    "/team/role-policies",
    fallbackRolePolicies,
  );
}

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
