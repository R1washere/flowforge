# FlowForge Architecture

## Runtime Shape

```txt
Browser
  -> Next.js web app
    -> NestJS API
      -> Prisma
        -> SQLite demo database
```

## Domain Modules

- Auth: demo session resolution through `x-flowforge-user-email`.
- RBAC: permission guards for workflow, integration, audit, and team actions.
- Workflows: automation definitions, status, ownership, and node graph.
- Steps: ordered trigger, condition, and action nodes.
- Executions: one workflow run with duration, status, and retry attempt.
- Step executions: per-node status, duration, output, and failure reason.
- Execution logs: step-by-step debug timeline for every run.
- Webhooks: secret-protected public trigger endpoints for external systems.
- Schedules: cron-like trigger model for recurring workflows.
- Integrations: masked provider credentials, scopes, and health status.
- Audit events: immutable operational history for sensitive actions.
- Team: organization members, roles, and role policy matrix.

## Auth And RBAC Flow

```txt
HTTP request
  -> DemoAuthGuard reads x-flowforge-user-email
  -> loads active OrganizationMember + User + Organization
  -> maps role to permissions
  -> checks @RequirePermissions metadata
  -> stores authSession on the request
```

The demo keeps authentication simple for portfolio review, but the backend still
has the same shape as a production permission system: request-scoped identity,
role policy lookup, route-level permission metadata, and forbidden responses for
unsafe actions.

## Execution Flow

```txt
POST /api/workflows/:slug/execute
  -> ExecutionEngineService loads workflow + ordered steps
  -> creates WorkflowExecution
  -> creates WorkflowStepExecution rows
  -> creates ExecutionLog rows
  -> updates workflow counters and lastRunAt
```

For webhook-triggered workflows:

```txt
POST /api/webhooks/:publicPath
  -> validates x-flowforge-secret
  -> runs the same execution engine
```

For scheduled workflows:

```txt
POST /api/schedules/run-due
  -> finds enabled schedules with nextRunAt <= now
  -> executes each workflow through ExecutionEngineService
  -> updates nextRunAt and lastTriggeredAt
  -> records audit events for the scheduler action
```

## Governance Flow

```txt
POST /api/integrations/health-check
  -> requires integrations:manage
  -> simulates provider health checks
  -> stores provider status and lastCheckedAt
  -> records audit events with previousStatus and nextStatus
```

## Why This Project Is Strong

FlowForge shows engineering problems that appear in real companies:
reliable background processing, idempotency, retries, observability, dynamic
workflow configuration, RBAC, auditability, integration governance, and UI for
debugging operational failures.
