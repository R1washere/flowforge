# FlowForge Roadmap

FlowForge is a portfolio-grade workflow automation demo. The current version focuses on a clear reviewer path: create workflows, run them manually or from schedules/webhooks, inspect execution history, and review team/audit controls.

## Done

- Workflow builder with triggers, conditions, actions, status changes and manual execution.
- Execution engine with run logs and failure states.
- Webhook and schedule entry points for automation flows.
- Team roles, permission checks and audit trail surfaces.
- Local SQLite demo setup, seed data, smoke checks and reviewer documentation.
- API examples for creating and running workflows.
- CI checks for linting, type checking and production builds.

## Next

- Add richer workflow test fixtures for branching and failure recovery scenarios.
- Improve mobile layout for the workflow builder and execution details.
- Add end-to-end coverage for webhook-triggered executions.
- Cover retry-state behavior and scheduler invocation with focused tests.

## Later

- Add a durable worker, real retry policies and backoff configuration per workflow action.
- Add idempotency for webhook and schedule-triggered executions.
- Add integration health history and alert states.
- Add import/export for reusable workflow templates.
- Add OpenAPI documentation for the backend API.
