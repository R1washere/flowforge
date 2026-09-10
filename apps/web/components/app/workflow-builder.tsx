"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateWorkflowInput,
  ExecutionSummary,
  StepType,
  TriggerType,
  WorkflowDetail,
  WorkflowStepInput,
  WorkflowSummary,
  WorkflowStatus,
} from "@flowforge/shared";
import { getApiErrorMessage } from "../../lib/api-error";
import { getDemoAuthHeaders } from "../../lib/demo-auth";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4200/api";

type EditableStep = WorkflowStepInput & {
  localId: string;
  configText: string;
};

const starterSteps: EditableStep[] = [
  createEditableStep(
    "trigger",
    "Receive webhook",
    {
      event: "customer.created",
      source: "demo-app",
    },
    "starter-trigger",
  ),
  createEditableStep(
    "condition",
    "Check customer plan",
    {
      field: "plan",
      operator: "in",
      value: ["pro", "business"],
    },
    "starter-condition",
  ),
  createEditableStep(
    "action",
    "Send team notification",
    {
      channel: "#customer-success",
    },
    "starter-action",
  ),
];

export function WorkflowBuilder({
  initialWorkflow,
  workflows,
}: {
  initialWorkflow: WorkflowDetail;
  workflows: WorkflowSummary[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [name, setName] = useState(initialWorkflow.name);
  const [slug, setSlug] = useState(initialWorkflow.slug);
  const [description, setDescription] = useState(initialWorkflow.description);
  const [status, setStatus] = useState<WorkflowStatus>(initialWorkflow.status);
  const [triggerType, setTriggerType] = useState<TriggerType>(
    initialWorkflow.triggerType,
  );
  const [retryLimit, setRetryLimit] = useState(initialWorkflow.retryLimit);
  const [timeoutSeconds, setTimeoutSeconds] = useState(
    initialWorkflow.timeoutSeconds,
  );
  const [steps, setSteps] = useState<EditableStep[]>(
    toEditableSteps(initialWorkflow.steps),
  );
  const [selectedSlug, setSelectedSlug] = useState(initialWorkflow.slug);
  const [savedWorkflow, setSavedWorkflow] =
    useState<WorkflowDetail>(initialWorkflow);
  const [execution, setExecution] = useState<ExecutionSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSavedWorkflow(initialWorkflow);
    setSelectedSlug(initialWorkflow.slug);
    setMode("edit");
    loadWorkflowIntoForm(initialWorkflow);
  }, [initialWorkflow]);

  const payload = useMemo<CreateWorkflowInput>(() => {
    return {
      name,
      slug,
      description,
      status,
      triggerType,
      retryLimit,
      timeoutSeconds,
      steps: steps.map((step) => ({
        type: step.type,
        name: step.name,
        config: parseConfig(step.configText),
      })),
    };
  }, [
    description,
    name,
    retryLimit,
    slug,
    status,
    steps,
    timeoutSeconds,
    triggerType,
  ]);

  async function saveWorkflow() {
    setError(null);
    setExecution(null);
    setIsSaving(true);

    try {
      const invalidConfig = steps.find(
        (step) => !isValidJsonObject(step.configText),
      );
      if (invalidConfig) {
        throw new Error(`Invalid JSON config in "${invalidConfig.name}"`);
      }

      const url =
        mode === "edit"
          ? `${apiBaseUrl}/workflows/${selectedSlug}`
          : `${apiBaseUrl}/workflows`;
      const response = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: getDemoAuthHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            `Save failed with ${response.status}`,
          ),
        );
      }

      const workflow = (await response.json()) as WorkflowDetail;
      setMode("edit");
      setSavedWorkflow(workflow);
      setSelectedSlug(workflow.slug);
      router.replace(`/builder?workflow=${workflow.slug}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save workflow",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function runWorkflow(slug = selectedSlug) {
    setError(null);
    setIsRunning(true);

    try {
      const response = await fetch(`${apiBaseUrl}/workflows/${slug}/execute`, {
        method: "POST",
        headers: getDemoAuthHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          input: {
            source: "builder-preview",
            plan: "business",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            `Run failed with ${response.status}`,
          ),
        );
      }

      setExecution((await response.json()) as ExecutionSummary);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not run workflow",
      );
    } finally {
      setIsRunning(false);
    }
  }

  function addStep(type: StepType) {
    const nameByType: Record<StepType, string> = {
      trigger: "New trigger",
      condition: "New condition",
      action: "New action",
    };
    const configByType: Record<StepType, Record<string, unknown>> = {
      trigger: { event: "event.name" },
      condition: { field: "fieldName", operator: "equals", value: "value" },
      action: { provider: "internal", operation: "do_something" },
    };

    setSteps((current) => [
      ...current,
      createEditableStep(type, nameByType[type], configByType[type]),
    ]);
  }

  function updateStep(localId: string, patch: Partial<EditableStep>) {
    setSteps((current) =>
      current.map((step) =>
        step.localId === localId ? { ...step, ...patch } : step,
      ),
    );
  }

  function moveStep(localId: string, direction: -1 | 1) {
    setSteps((current) => {
      const index = current.findIndex((step) => step.localId === localId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [step] = next.splice(index, 1);
      next.splice(nextIndex, 0, step!);
      return next;
    });
  }

  function removeStep(localId: string) {
    setSteps((current) => current.filter((step) => step.localId !== localId));
  }

  function loadWorkflowIntoForm(workflow: WorkflowDetail) {
    setName(workflow.name);
    setSlug(workflow.slug);
    setDescription(workflow.description);
    setStatus(workflow.status);
    setTriggerType(workflow.triggerType);
    setRetryLimit(workflow.retryLimit);
    setTimeoutSeconds(workflow.timeoutSeconds);
    setSteps(toEditableSteps(workflow.steps));
  }

  function startNewWorkflow() {
    setMode("create");
    setName("Expansion lead routing");
    setSlug("");
    setDescription(
      "Routes expansion-ready customers to the right sales owner and logs the handoff.",
    );
    setStatus("draft");
    setTriggerType("webhook");
    setRetryLimit(3);
    setTimeoutSeconds(90);
    setSteps(cloneStarterSteps());
    setExecution(null);
    setError(null);
  }

  return (
    <div className="builder-layout">
      <section className="builder-form panel">
        <div className="panel-header">
          <h2>{mode === "edit" ? "Edit workflow" : "Create workflow"}</h2>
          <button
            className="text-action"
            type="button"
            onClick={startNewWorkflow}
          >
            New workflow
          </button>
        </div>

        <div className="form-grid">
          <label>
            Workflow name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Slug
            <input
              placeholder="generated-from-name"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            />
          </label>
          <label>
            Trigger type
            <select
              value={triggerType}
              onChange={(event) =>
                setTriggerType(event.target.value as TriggerType)
              }
            >
              <option value="webhook">Webhook</option>
              <option value="schedule">Schedule</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label className="span-2">
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as WorkflowStatus)
              }
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label>
            Retry limit
            <input
              min={0}
              max={10}
              type="number"
              value={retryLimit}
              onChange={(event) => setRetryLimit(Number(event.target.value))}
            />
          </label>
          <label>
            Timeout seconds
            <input
              min={5}
              max={3600}
              type="number"
              value={timeoutSeconds}
              onChange={(event) =>
                setTimeoutSeconds(Number(event.target.value))
              }
            />
          </label>
        </div>

        <div className="builder-toolbar">
          <button type="button" onClick={() => addStep("trigger")}>
            + Trigger
          </button>
          <button type="button" onClick={() => addStep("condition")}>
            + Condition
          </button>
          <button type="button" onClick={() => addStep("action")}>
            + Action
          </button>
        </div>

        <div className="editable-node-list">
          {steps.map((step, index) => (
            <article
              className={`editable-node ${step.type}`}
              key={step.localId}
            >
              <div className="editable-node-header">
                <span className="node-type">
                  {index + 1}. {step.type}
                </span>
                <div className="icon-actions">
                  <button
                    aria-label={`Move ${step.name} up`}
                    disabled={index === 0}
                    type="button"
                    onClick={() => moveStep(step.localId, -1)}
                  >
                    Up
                  </button>
                  <button
                    aria-label={`Move ${step.name} down`}
                    disabled={index === steps.length - 1}
                    type="button"
                    onClick={() => moveStep(step.localId, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(step.localId)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <label>
                Step name
                <input
                  value={step.name}
                  onChange={(event) =>
                    updateStep(step.localId, { name: event.target.value })
                  }
                />
              </label>
              <label>
                Config JSON
                <textarea
                  rows={4}
                  value={step.configText}
                  onChange={(event) =>
                    updateStep(step.localId, {
                      configText: event.target.value,
                    })
                  }
                />
              </label>
            </article>
          ))}
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="form-actions">
          <button
            className="primary-action button-reset"
            disabled={isSaving}
            onClick={saveWorkflow}
          >
            {isSaving
              ? "Saving..."
              : mode === "edit"
                ? "Update workflow"
                : "Create workflow"}
          </button>
          <button
            className="secondary-action"
            disabled={isRunning}
            onClick={() => runWorkflow()}
          >
            {isRunning ? "Running..." : "Run selected workflow"}
          </button>
        </div>
      </section>

      <section className="builder-preview">
        <div className="panel">
          <div className="panel-header">
            <h2>Saved workflows</h2>
            <span className="muted">{workflows.length}</span>
          </div>
          <div className="saved-workflows">
            {workflows.map((workflow) => (
              <button
                className={
                  workflow.slug === selectedSlug
                    ? "saved-workflow active"
                    : "saved-workflow"
                }
                key={workflow.id}
                type="button"
                onClick={() => {
                  setSelectedSlug(workflow.slug);
                  router.replace(`/builder?workflow=${workflow.slug}`);
                  router.refresh();
                }}
              >
                <strong>{workflow.name}</strong>
                <span>
                  {workflow.triggerType} · {workflow.stepsCount} nodes ·{" "}
                  {workflow.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="builder-canvas compact">
          {savedWorkflow.steps.map((step, index) => (
            <div className="node-chain" key={step.id}>
              <article className={`workflow-node ${step.type}`}>
                <span className="node-type">{step.type}</span>
                <strong>{step.name}</strong>
                <code>{JSON.stringify(step.config)}</code>
              </article>
              {index < savedWorkflow.steps.length - 1 ? (
                <span className="connector">then</span>
              ) : null}
            </div>
          ))}
        </div>

        <article className="panel integration-panel">
          <div>
            <h2>Webhook trigger</h2>
            <p>
              {savedWorkflow.webhookUrl
                ? "External systems can trigger this workflow through the public webhook endpoint."
                : "This workflow does not use a webhook trigger."}
            </p>
          </div>
          {savedWorkflow.webhookUrl ? (
            <code>
              {`curl -X POST ${apiBaseUrl.replace("/api", "")}${savedWorkflow.webhookUrl} \\
  -H "content-type: application/json" \\
  -H "x-flowforge-secret: whsec_demo_${savedWorkflow.slug.replaceAll("-", "_")}" \\
  -d '{"customerId":"cus_demo","plan":"business"}'`}
            </code>
          ) : null}
        </article>

        {execution ? (
          <article className="execution-card">
            <div className="execution-card-header">
              <div>
                <strong>Latest run: {execution.workflowName}</strong>
                <span>
                  {execution.status} · attempt {execution.attempt} ·{" "}
                  {execution.durationMs ?? 0}ms
                </span>
              </div>
              <span className={`status-pill ${execution.status}`}>
                {execution.status}
              </span>
            </div>
            <div className="log-list">
              {execution.stepExecutions.map((step) => (
                <div className="log-row" key={step.id}>
                  <span
                    className={`dot ${step.status === "failed" ? "failed" : "success"}`}
                  />
                  <div>
                    <strong>
                      {step.position}. {step.stepName}
                    </strong>
                    <span>
                      {step.status} · {step.stepType} · {step.durationMs ?? 0}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </section>
    </div>
  );
}

function createEditableStep(
  type: StepType,
  name: string,
  config: Record<string, unknown>,
  localId = crypto.randomUUID(),
): EditableStep {
  return {
    localId,
    type,
    name,
    config,
    configText: JSON.stringify(config, null, 2),
  };
}

function cloneStarterSteps() {
  return starterSteps.map((step) =>
    createEditableStep(step.type, step.name, step.config),
  );
}

function toEditableSteps(steps: WorkflowDetail["steps"]): EditableStep[] {
  return steps.map((step) =>
    createEditableStep(step.type, step.name, step.config, step.id),
  );
}

function parseConfig(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function isValidJsonObject(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}
