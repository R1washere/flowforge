import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.executionLog.deleteMany();
  await prisma.workflowStepExecution.deleteMany();
  await prisma.workflowExecution.deleteMany();
  await prisma.workflowSchedule.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.integrationCredential.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "demo@flowforge.dev",
      name: "Demo Operator",
    },
  });

  const organization = await prisma.organization.create({
    data: {
      name: "Northstar SaaS",
      slug: "northstar-saas",
      members: {
        create: {
          userId: user.id,
          role: "owner",
          status: "active",
          lastActiveAt: minutesAgo(6),
        },
      },
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "maria.ops@northstar.dev",
      name: "Maria Ops",
    },
  });

  const operatorUser = await prisma.user.create({
    data: {
      email: "alex.automation@northstar.dev",
      name: "Alex Automation",
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: "nina.finance@northstar.dev",
      name: "Nina Finance",
    },
  });

  await prisma.organizationMember.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: adminUser.id,
        role: "admin",
        status: "active",
        lastActiveAt: minutesAgo(24),
      },
      {
        organizationId: organization.id,
        userId: operatorUser.id,
        role: "operator",
        status: "active",
        lastActiveAt: minutesAgo(38),
      },
      {
        organizationId: organization.id,
        userId: viewerUser.id,
        role: "viewer",
        status: "active",
        lastActiveAt: hoursAgo(6),
      },
    ],
  });

  await prisma.integrationCredential.createMany({
    data: [
      {
        organizationId: organization.id,
        provider: "crm",
        displayName: "HubSpot CRM",
        status: "connected",
        environment: "production",
        scopes: JSON.stringify([
          "contacts:read",
          "contacts:write",
          "tasks:write",
        ]),
        maskedSecret: "hs_pat_••••_8f2a",
        lastCheckedAt: minutesAgo(18),
        expiresAt: daysFromNow(88),
      },
      {
        organizationId: organization.id,
        provider: "billing",
        displayName: "Stripe Billing",
        status: "degraded",
        environment: "production",
        scopes: JSON.stringify(["events:read", "invoices:read"]),
        maskedSecret: "sk_live_••••_1c9d",
        lastCheckedAt: minutesAgo(42),
        expiresAt: daysFromNow(31),
      },
      {
        organizationId: organization.id,
        provider: "messaging",
        displayName: "Slack Operations",
        status: "connected",
        environment: "sandbox",
        scopes: JSON.stringify(["chat:write", "channels:read"]),
        maskedSecret: "xoxb-••••-ops",
        lastCheckedAt: hoursAgo(3),
        expiresAt: null,
      },
    ],
  });

  const onboarding = await prisma.workflow.create({
    data: {
      organizationId: organization.id,
      createdById: user.id,
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
      lastRunAt: hoursAgo(2),
      webhookEndpoint: {
        create: {
          publicPath: "customer-onboarding",
          secret: "whsec_demo_customer_onboarding",
        },
      },
      steps: {
        create: [
          step("trigger", "Receive signup webhook", 1, {
            event: "customer.created",
            source: "billing-system",
          }),
          step("condition", "Check paid plan", 2, {
            field: "plan",
            operator: "in",
            value: ["pro", "business", "enterprise"],
          }),
          step("action", "Create CRM task", 3, {
            provider: "crm",
            taskType: "sales-follow-up",
          }),
          step("action", "Notify customer success", 4, {
            channel: "#customer-success",
          }),
        ],
      },
    },
  });

  const paymentFailure = await prisma.workflow.create({
    data: {
      organizationId: organization.id,
      createdById: user.id,
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
      lastRunAt: hoursAgo(5),
      webhookEndpoint: {
        create: {
          publicPath: "payment-failure-alert",
          secret: "whsec_demo_payment_failure",
        },
      },
      steps: {
        create: [
          step("trigger", "Receive invoice webhook", 1, {
            event: "invoice.payment_failed",
          }),
          step("condition", "Customer has active contract", 2, {
            field: "contractStatus",
            operator: "equals",
            value: "active",
          }),
          step("action", "Post finance alert", 3, {
            channel: "#finance-ops",
          }),
          step("action", "Schedule retry task", 4, {
            retryInHours: 24,
          }),
        ],
      },
    },
  });

  const crmSync = await prisma.workflow.create({
    data: {
      organizationId: organization.id,
      createdById: user.id,
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
      lastRunAt: hoursAgo(26),
      schedule: {
        create: {
          cron: "0 8 * * 1-5",
          timezone: "Europe/Prague",
          enabled: true,
          nextRunAt: minutesAgo(10),
          lastTriggeredAt: hoursAgo(26),
        },
      },
      steps: {
        create: [
          step("trigger", "Weekday 08:00 schedule", 1, {
            cron: "0 8 * * 1-5",
          }),
          step("action", "Fetch qualified accounts", 2, {
            source: "warehouse",
            segment: "activation-ready",
          }),
          step("action", "Update CRM segment", 3, {
            provider: "crm",
            segment: "Ready for onboarding",
          }),
        ],
      },
    },
  });

  await createExecution(onboarding.id, "success", "webhook", 760, [
    [
      "Receive signup webhook",
      "trigger",
      1,
      "success",
      "Incoming payload validated",
    ],
    [
      "Check paid plan",
      "condition",
      2,
      "success",
      "Condition matched: business",
    ],
    [
      "Create CRM task",
      "action",
      3,
      "success",
      "Task created for account executive",
    ],
    ["Notify customer success", "action", 4, "success", "Message delivered"],
  ]);

  await createExecution(paymentFailure.id, "retrying", "webhook", 1340, [
    [
      "Receive invoice webhook",
      "trigger",
      1,
      "success",
      "Incoming payload validated",
    ],
    [
      "Customer has active contract",
      "condition",
      2,
      "success",
      "Condition matched: active",
    ],
    ["Post finance alert", "action", 3, "success", "Message delivered"],
    [
      "Schedule retry task",
      "action",
      4,
      "failed",
      "Remote API returned HTTP 429",
      "error",
    ],
  ]);

  await createExecution(crmSync.id, "success", "schedule", 2150, [
    ["Weekday 08:00 schedule", "trigger", 1, "success", "Schedule fired"],
    ["Fetch qualified accounts", "action", 2, "success", "42 accounts loaded"],
    ["Update CRM segment", "action", 3, "success", "CRM segment updated"],
  ]);

  await prisma.auditEvent.createMany({
    data: [
      auditEvent(
        organization.id,
        user.id,
        "team_member",
        operatorUser.id,
        "team.member_invited",
        "Alex Automation joined as operator",
        { role: "operator", email: operatorUser.email },
        hoursAgo(36),
      ),
      auditEvent(
        organization.id,
        user.id,
        "workflow",
        onboarding.id,
        "workflow.created",
        "Customer onboarding workflow was created",
        { slug: onboarding.slug, triggerType: "webhook" },
        hoursAgo(28),
      ),
      auditEvent(
        organization.id,
        user.id,
        "workflow",
        paymentFailure.id,
        "workflow.status_changed",
        "Payment failure alert moved to active",
        { slug: paymentFailure.slug, status: "active" },
        hoursAgo(8),
      ),
      auditEvent(
        organization.id,
        user.id,
        "integration",
        "stripe-billing",
        "integration.health_checked",
        "Stripe Billing health check finished as degraded",
        {
          provider: "billing",
          previousStatus: "connected",
          nextStatus: "degraded",
        },
        minutesAgo(42),
      ),
      auditEvent(
        organization.id,
        user.id,
        "schedule",
        crmSync.id,
        "schedule.next_run_calculated",
        "Daily CRM sync next run was calculated",
        { slug: crmSync.slug, nextRunAt: minutesAgo(10).toISOString() },
        minutesAgo(10),
      ),
    ],
  });

  console.log("FlowForge seed data created");
}

function step(
  type: string,
  name: string,
  position: number,
  config: Record<string, unknown>,
) {
  return {
    type,
    name,
    position,
    config: JSON.stringify(config),
  };
}

async function createExecution(
  workflowId: string,
  status: "success" | "failed" | "retrying",
  triggerType: "webhook" | "schedule",
  durationMs: number,
  logs: Array<
    [string, string, number, "success" | "failed", string, "info" | "error"?]
  >,
) {
  const startedAt = minutesAgo(status !== "success" ? 45 : 25);

  await prisma.workflowExecution.create({
    data: {
      workflowId,
      status,
      triggerType,
      attempt: status === "failed" ? 2 : 1,
      input: JSON.stringify({ demo: true }),
      output: JSON.stringify(
        status !== "success" ? { retryScheduled: true } : { ok: true },
      ),
      error:
        status !== "success"
          ? "Remote action returned HTTP 429 after retry attempt"
          : null,
      durationMs,
      startedAt,
      finishedAt: new Date(startedAt.getTime() + durationMs),
      logs: {
        create: logs.map(
          ([stepName, , position, stepStatus, message, level = "info"]) => ({
            stepName,
            message,
            level,
            metadata: JSON.stringify({ seeded: true, position, stepStatus }),
          }),
        ),
      },
      steps: {
        create: logs.map(
          ([stepName, stepType, position, stepStatus], index) => ({
            stepName,
            stepType,
            position,
            status: stepStatus,
            durationMs: 160 + index * 80,
            output: JSON.stringify({
              seeded: true,
              ok: stepStatus === "success",
            }),
            error:
              stepStatus === "failed"
                ? "Remote action returned HTTP 429"
                : null,
            startedAt: new Date(startedAt.getTime() + index * 220),
            finishedAt: new Date(
              startedAt.getTime() + index * 220 + 160 + index * 80,
            ),
          }),
        ),
      },
    },
  });
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function auditEvent(
  organizationId: string,
  actorId: string,
  entityType: string,
  entityId: string,
  action: string,
  summary: string,
  metadata: Record<string, unknown>,
  createdAt: Date,
) {
  return {
    organizationId,
    actorId,
    entityType,
    entityId,
    action,
    summary,
    metadata: JSON.stringify(metadata),
    createdAt,
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
