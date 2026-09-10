# FlowForge Portfolio Demo Guide

## One-Line Pitch

FlowForge is a B2B workflow automation platform for operations teams that need
to build, run, monitor, and govern internal automations.

## What To Show First

1. Open `http://localhost:3200`.
2. Show the dashboard metrics, retrying execution, and due schedule.
3. Click `Run due` to create a scheduled workflow execution.
4. Open `Executions` and show step-level logs.
5. Open `Builder` and explain triggers, conditions, actions, retries, and
   webhook configuration.
6. Open `Governance`, run an integration health check, and show audit events.
7. Open `Team`, switch a role, then show the audit trail update.
8. Open `Login`, choose `Nina Finance`, try to pause a workflow, and show the
   backend `403` permission error.

## Engineering Talking Points

- Monorepo structure with shared TypeScript contracts.
- NestJS modules separated by domain: workflows, executions, schedules,
  integrations, audit, auth, and team.
- Prisma schema models a realistic SaaS domain on SQLite for local demo speed.
- Execution engine records workflow runs, step runs, output payloads, errors,
  logs, retry state, and counters.
- Webhook endpoint validates a secret before running the same engine.
- Scheduler simulator finds due jobs, creates executions, recalculates
  `nextRunAt`, and records audit events.
- RBAC guard resolves the current demo user, maps role policies, and blocks
  forbidden actions on the backend.
- UI includes operational dashboards, empty/loading/error states, and
  role-aware demo flows.

## Demo Users

```txt
demo@flowforge.dev                  owner
maria.ops@northstar.dev             admin
alex.automation@northstar.dev       operator
nina.finance@northstar.dev          viewer
```

## Verification Script

```bash
pnpm verify
```

The verification script rebuilds the SQLite database, generates Prisma Client,
runs TypeScript checks, builds both apps, runs API smoke tests, and resets seed
data again.
