import { spawn } from "node:child_process";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4200/api";

const api = spawn("pnpm", ["--filter", "@flowforge/api", "dev"], {
  env: {
    ...process.env,
    API_PORT: "4200",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

api.stdout.on("data", (chunk) => process.stdout.write(chunk));
api.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  await waitForHealth();

  const health = await getJson(`${apiBaseUrl}/health`);
  assert(health.ok === true, "health endpoint failed");

  const stats = await getJson(`${apiBaseUrl}/workflows/stats`);
  assert(stats.totalWorkflows >= 3, "expected seeded workflows");
  assert(typeof stats.retryingExecutions === "number", "stats must include retrying executions");

  const ownerSession = await getJson(`${apiBaseUrl}/auth/session`);
  assert(ownerSession.role === "owner", "default demo session should be owner");
  assert(
    ownerSession.permissions.includes("team:manage"),
    "owner session should include team management",
  );

  const viewerSession = await getJson(`${apiBaseUrl}/auth/session`, {
    "x-flowforge-user-email": "nina.finance@northstar.dev",
  });
  assert(viewerSession.role === "viewer", "viewer demo session should resolve");
  assert(
    !viewerSession.permissions.includes("workflows:write"),
    "viewer should not have workflow write permission",
  );

  const workflows = await getJson(`${apiBaseUrl}/workflows`);
  assert(Array.isArray(workflows), "workflows response must be an array");
  assert(workflows.some((workflow) => workflow.slug === "customer-onboarding"), "missing demo workflow");

  const teamMembers = await getJson(`${apiBaseUrl}/team`);
  assert(Array.isArray(teamMembers), "team response must be an array");
  assert(teamMembers.length >= 4, "expected seeded team members");
  assert(
    teamMembers.some((member) => member.role === "owner"),
    "team should include an owner",
  );

  const rolePolicies = await getJson(`${apiBaseUrl}/team/role-policies`);
  assert(Array.isArray(rolePolicies), "role policies response must be an array");
  assert(rolePolicies.length === 4, "expected four role policies");

  const operatorExecuteCheck = await getJson(
    `${apiBaseUrl}/team/permission-check?role=operator&permission=workflows%3Aexecute`,
  );
  assert(operatorExecuteCheck.allowed === true, "operator should execute workflows");

  const viewerWriteCheck = await getJson(
    `${apiBaseUrl}/team/permission-check?role=viewer&permission=workflows%3Awrite`,
  );
  assert(viewerWriteCheck.allowed === false, "viewer should not write workflows");

  const operatorMember = teamMembers.find((member) => member.role === "operator");
  assert(operatorMember, "expected operator member");
  const promotedMember = await patchJson(`${apiBaseUrl}/team/${operatorMember.id}/role`, {
    role: "admin",
  });
  assert(promotedMember.role === "admin", "team role update did not persist");

  const ownerMember = teamMembers.find((member) => member.role === "owner");
  assert(ownerMember, "expected owner member");
  const demoteLastOwner = await fetch(`${apiBaseUrl}/team/${ownerMember.id}/role`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ role: "admin" }),
  });
  assert(demoteLastOwner.status === 400, "last owner demotion should be blocked");

  const integrations = await getJson(`${apiBaseUrl}/integrations`);
  assert(Array.isArray(integrations), "integrations response must be an array");
  assert(integrations.length >= 3, "expected seeded integrations");
  assert(
    integrations.every((integration) => !integration.maskedSecret.includes("secret")),
    "integrations should expose masked secrets only",
  );

  const integrationHealth = await postJson(`${apiBaseUrl}/integrations/health-check`, {});
  assert(
    integrationHealth.integrations.length >= 3,
    "integration health check should return integrations",
  );
  assert(
    integrationHealth.integrations.some((integration) => integration.status === "degraded"),
    "integration health check should model degraded providers",
  );

  const viewerHealthCheck = await fetch(`${apiBaseUrl}/integrations/health-check`, {
    method: "POST",
    headers: {
      "x-flowforge-user-email": "nina.finance@northstar.dev",
    },
  });
  assert(viewerHealthCheck.status === 403, "viewer should not manage integrations");

  const workflow = await getJson(`${apiBaseUrl}/workflows/customer-onboarding`);
  assert(workflow.steps.length >= 3, "workflow detail must include steps");

  const dueSchedules = await getJson(`${apiBaseUrl}/schedules/due`);
  assert(Array.isArray(dueSchedules), "due schedules response must be an array");
  assert(
    dueSchedules.some((schedule) => schedule.workflowSlug === "daily-crm-sync"),
    "daily CRM sync should be due in seeded data",
  );

  const scheduleRun = await postJson(`${apiBaseUrl}/schedules/run-due`, {});
  assert(scheduleRun.dueCount >= 1, "scheduler should process due schedules");
  assert(scheduleRun.executions.length >= 1, "scheduler should create executions");
  assert(
    scheduleRun.executions.every((execution) => execution.triggerType === "schedule"),
    "scheduler executions should use schedule trigger",
  );
  assert(
    scheduleRun.executions.every((execution) => execution.stepExecutions.length >= 3),
    "scheduler executions should include step executions",
  );

  const schedulesAfterRun = await getJson(`${apiBaseUrl}/schedules/due`);
  assert(
    !schedulesAfterRun.some((schedule) => schedule.workflowSlug === "daily-crm-sync"),
    "daily CRM sync should not remain due after scheduler run",
  );

  const slug = `smoke-workflow-${Date.now()}`;
  const createdWorkflow = await postJson(`${apiBaseUrl}/workflows`, {
    name: "Smoke test workflow",
    slug,
    description: "Created by the API smoke test to verify workflow CRUD.",
    status: "draft",
    triggerType: "manual",
    retryLimit: 1,
    timeoutSeconds: 45,
    steps: [
      {
        type: "trigger",
        name: "Manual run",
        config: {
          source: "smoke-test",
        },
      },
      {
        type: "action",
        name: "Write audit log",
        config: {
          provider: "internal",
        },
      },
    ],
  });
  assert(createdWorkflow.slug === slug, "created workflow returned wrong slug");
  assert(createdWorkflow.steps.length === 2, "created workflow should include saved steps");

  const viewerWorkflowUpdate = await fetch(
    `${apiBaseUrl}/workflows/customer-onboarding/status`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-flowforge-user-email": "nina.finance@northstar.dev",
      },
      body: JSON.stringify({ status: "paused" }),
    },
  );
  assert(viewerWorkflowUpdate.status === 403, "viewer should not update workflows");

  const updatedWorkflow = await patchJson(`${apiBaseUrl}/workflows/${slug}`, {
    name: "Smoke test workflow updated",
    slug,
    description: "Updated by the API smoke test to verify workflow editing.",
    status: "active",
    triggerType: "manual",
    retryLimit: 2,
    timeoutSeconds: 60,
    steps: [
      {
        type: "trigger",
        name: "Manual run",
        config: {
          source: "smoke-test",
        },
      },
      {
        type: "condition",
        name: "Validate payload",
        config: {
          field: "source",
          operator: "equals",
          value: "smoke-test",
        },
      },
      {
        type: "action",
        name: "Write audit log",
        config: {
          provider: "internal",
        },
      },
    ],
  });
  assert(updatedWorkflow.name.endsWith("updated"), "workflow update did not persist name");
  assert(updatedWorkflow.steps.length === 3, "workflow update should replace saved steps");

  const pausedWorkflow = await patchJson(`${apiBaseUrl}/workflows/${slug}/status`, {
    status: "paused",
  });
  assert(pausedWorkflow.status === "paused", "workflow pause did not persist");

  const activeWorkflow = await patchJson(`${apiBaseUrl}/workflows/${slug}/status`, {
    status: "active",
  });
  assert(activeWorkflow.status === "active", "workflow activate did not persist");

  const execution = await postJson(`${apiBaseUrl}/workflows/customer-onboarding/execute`, {
    input: {
      customerId: "cus_demo_123",
      plan: "business",
    },
  });
  assert(execution.status === "success", "demo execution should succeed");
  assert(execution.logs.length >= 3, "execution should include logs");
  assert(execution.stepExecutions.length >= 3, "execution should include step statuses");

  const operatorExecution = await postJson(
    `${apiBaseUrl}/workflows/customer-onboarding/execute`,
    {
      input: {
        customerId: "cus_operator_123",
        plan: "business",
      },
    },
    {
      "x-flowforge-user-email": "alex.automation@northstar.dev",
    },
  );
  assert(operatorExecution.status === "success", "operator should execute workflows");

  const unauthorizedWebhook = await fetch(`${apiBaseUrl}/webhooks/customer-onboarding`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ customerId: "cus_unauthorized" }),
  });
  assert(unauthorizedWebhook.status === 401, "webhook should require secret");

  const webhookExecution = await postJson(
    `${apiBaseUrl}/webhooks/customer-onboarding`,
    {
      customerId: "cus_webhook_123",
      plan: "business",
    },
    {
      "x-flowforge-secret": "whsec_demo_customer_onboarding",
    },
  );
  assert(webhookExecution.status === "success", "webhook execution should succeed");
  assert(webhookExecution.triggerType === "webhook", "webhook execution should use webhook trigger");
  assert(webhookExecution.stepExecutions.length >= 3, "webhook should create step executions");

  const createdExecution = await postJson(`${apiBaseUrl}/workflows/${slug}/execute`, {
    input: {
      source: "smoke-test",
    },
  });
  assert(createdExecution.status === "success", "created workflow execution should succeed");
  assert(createdExecution.logs.length === 3, "created workflow execution should log every step");

  const executions = await getJson(`${apiBaseUrl}/executions`);
  assert(Array.isArray(executions), "executions response must be an array");
  assert(executions.length >= 5, "expected seeded and fresh executions");

  const auditEvents = await getJson(`${apiBaseUrl}/audit-events`);
  assert(Array.isArray(auditEvents), "audit events response must be an array");
  assert(auditEvents.length >= 8, "expected seeded and generated audit events");
  assert(
    auditEvents.some((event) => event.action === "workflow.executed"),
    "execution should record audit event",
  );
  assert(
    auditEvents.some((event) => event.action === "integration.health_checked"),
    "integration health check should record audit event",
  );

  console.log("FlowForge API smoke test passed");
} finally {
  api.kill("SIGTERM");
}

async function waitForHealth() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30000) {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      await delay(500);
    }
  }

  throw new Error("API did not become healthy in time");
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function patchJson(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
