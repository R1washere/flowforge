# Reviewer Guide

FlowForge is a portfolio demo meant to show end-to-end ownership of a full-stack
SaaS-style feature set: UI flows, API boundaries, data modeling, permissions,
and operational visibility.

## Fast Path

1. Start with `README.md` for the product overview and local setup.
2. Review `docs/architecture.md` for the app boundaries and data flow.
3. Open `apps/web/app` and `apps/web/components/app` for the Next.js UI.
4. Open `apps/api/src/workflows`, `apps/api/src/executions`, and
   `apps/api/src/webhooks` for the main backend flows.
5. Open `prisma/schema.prisma` to review the workflow, execution, team, and
   audit models.

## What To Look For

- Full-stack feature slices instead of isolated UI mockups.
- Clear separation between controllers, services, DTOs, and shared contracts.
- Role-aware actions in both the API and the interface.
- Demo data and verification scripts that make the project easy to review.
- Audit and execution logs that show how the system behaves after release.

## Local Verification

```bash
pnpm install
cp .env.example .env
pnpm db:setup
pnpm verify
```

The verification script prepares the local SQLite database, runs checks, builds
the workspaces, starts the apps, and runs smoke tests.
