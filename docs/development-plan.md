# FlowForge Development Plan

## Phase 1: Foundation

- Create monorepo structure.
- Add Next.js web app.
- Add NestJS API app.
- Add shared contracts package.
- Add Prisma SQLite schema and seed data.
- Add dashboard, workflows, builder, and execution log screens.
- Add API smoke test.

## Phase 2: Workflow CRUD

- Create workflow from UI.
- Edit workflow metadata.
- Add/remove/reorder nodes.
- Validate trigger/condition/action configuration.

## Phase 3: Execution Engine

- Run workflows through a service layer. Done.
- Add retry policy. Done.
- Store per-step status and logs. Done.
- Add webhook trigger endpoint. Done.
- Add scheduled trigger simulation.

## Phase 4: Portfolio Polish

- Add auth and workspace ownership.
- Add test coverage for core execution logic.
- Add architecture diagrams.
- Add README case study section.
- Export clean desktop folder.
