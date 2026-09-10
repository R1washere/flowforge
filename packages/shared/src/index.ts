export const workflowStatuses = [
  "draft",
  "active",
  "paused",
  "archived",
] as const;
export const triggerTypes = ["webhook", "schedule", "manual"] as const;
export const stepTypes = ["trigger", "condition", "action"] as const;
export const executionStatuses = [
  "queued",
  "running",
  "success",
  "failed",
  "retrying",
] as const;
export const logLevels = ["info", "warn", "error"] as const;
export const integrationStatuses = [
  "connected",
  "degraded",
  "expired",
  "disabled",
] as const;
export const organizationRoles = [
  "owner",
  "admin",
  "operator",
  "viewer",
] as const;
export const permissions = [
  "workflows:read",
  "workflows:write",
  "workflows:execute",
  "integrations:read",
  "integrations:manage",
  "audit:read",
  "team:read",
  "team:manage",
] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];
export type TriggerType = (typeof triggerTypes)[number];
export type StepType = (typeof stepTypes)[number];
export type ExecutionStatus = (typeof executionStatuses)[number];
export type LogLevel = (typeof logLevels)[number];
export type IntegrationStatus = (typeof integrationStatuses)[number];
export type OrganizationRole = (typeof organizationRoles)[number];
export type Permission = (typeof permissions)[number];

export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  runsToday: number;
  failedRuns: number;
  queuedExecutions: number;
  runningExecutions: number;
  retryingExecutions: number;
  successRate: number;
}

export interface WorkflowStepDto {
  id: string;
  type: StepType;
  name: string;
  position: number;
  config: Record<string, unknown>;
}

export interface WorkflowStepInput {
  type: StepType;
  name: string;
  config: Record<string, unknown>;
}

export interface CreateWorkflowInput {
  name: string;
  slug?: string;
  description: string;
  status: WorkflowStatus;
  triggerType: TriggerType;
  retryLimit: number;
  timeoutSeconds: number;
  steps: WorkflowStepInput[];
}

export interface UpdateWorkflowInput extends CreateWorkflowInput {}

export interface UpdateWorkflowStatusInput {
  status: Extract<WorkflowStatus, "active" | "paused" | "draft" | "archived">;
}

export interface WorkflowSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  triggerType: TriggerType;
  retryLimit: number;
  timeoutSeconds: number;
  runCount: number;
  successCount: number;
  failureCount: number;
  lastRunAt: string | null;
  stepsCount: number;
}

export interface WorkflowDetail extends WorkflowSummary {
  steps: WorkflowStepDto[];
  webhookUrl: string | null;
  schedule: {
    cron: string;
    timezone: string;
    enabled: boolean;
    nextRunAt: string | null;
    lastTriggeredAt: string | null;
  } | null;
}

export interface ScheduleSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowSlug: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  nextRunAt: string | null;
  lastTriggeredAt: string | null;
  isDue: boolean;
}

export interface ExecutionLogDto {
  id: string;
  stepName: string;
  level: LogLevel;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface StepExecutionDto {
  id: string;
  stepId: string | null;
  stepName: string;
  stepType: StepType;
  position: number;
  status: ExecutionStatus;
  durationMs: number | null;
  output: Record<string, unknown>;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowSlug: string;
  status: ExecutionStatus;
  triggerType: TriggerType;
  attempt: number;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  stepExecutions: StepExecutionDto[];
  logs: ExecutionLogDto[];
}

export interface ScheduleRunResult {
  dueCount: number;
  executions: ExecutionSummary[];
  schedules: ScheduleSummary[];
}

export interface IntegrationCredentialSummary {
  id: string;
  provider: string;
  displayName: string;
  status: IntegrationStatus;
  environment: string;
  scopes: string[];
  maskedSecret: string;
  lastCheckedAt: string | null;
  expiresAt: string | null;
}

export interface IntegrationHealthResult {
  checkedAt: string;
  integrations: IntegrationCredentialSummary[];
}

export interface AuditEventSummary {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TeamMemberSummary {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: OrganizationRole;
  status: string;
  permissions: Permission[];
  lastActiveAt: string | null;
  createdAt: string;
}

export interface RolePolicySummary {
  role: OrganizationRole;
  permissions: Permission[];
  description: string;
}

export interface UpdateMemberRoleInput {
  role: OrganizationRole;
}

export interface PermissionCheckResult {
  role: OrganizationRole;
  permission: Permission;
  allowed: boolean;
  reason: string;
}

export interface DemoAuthSession {
  userId: string;
  email: string;
  name: string | null;
  organizationId: string;
  organizationSlug: string;
  role: OrganizationRole;
  permissions: Permission[];
}
