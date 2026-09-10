"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  ExecutionSummary,
  WorkflowStatus,
  WorkflowSummary,
} from "@flowforge/shared";
import { getApiErrorMessage } from "../../lib/api-error";
import { getDemoAuthHeaders } from "../../lib/demo-auth";
import { EmptyState } from "./empty-state";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4200/api";

export function WorkflowsTable({
  initialWorkflows,
}: {
  initialWorkflows: WorkflowSummary[];
}) {
  const router = useRouter();
  const [workflows, setWorkflows] =
    useState<WorkflowSummary[]>(initialWorkflows);
  const [runningSlug, setRunningSlug] = useState<string | null>(null);
  const [statusSlug, setStatusSlug] = useState<string | null>(null);
  const [latestExecution, setLatestExecution] =
    useState<ExecutionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(slug: string, status: WorkflowStatus) {
    setError(null);
    setStatusSlug(slug);

    try {
      const response = await fetch(`${apiBaseUrl}/workflows/${slug}/status`, {
        method: "PATCH",
        headers: getDemoAuthHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            `Status update failed with ${response.status}`,
          ),
        );
      }

      const updated = (await response.json()) as WorkflowSummary;
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.slug === slug ? { ...workflow, ...updated } : workflow,
        ),
      );
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update workflow status",
      );
    } finally {
      setStatusSlug(null);
    }
  }

  async function runWorkflow(slug: string) {
    setError(null);
    setRunningSlug(slug);

    try {
      const response = await fetch(`${apiBaseUrl}/workflows/${slug}/execute`, {
        method: "POST",
        headers: getDemoAuthHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          input: {
            source: "workflow-list",
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

      const execution = (await response.json()) as ExecutionSummary;
      setLatestExecution(execution);
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.slug === slug
            ? {
                ...workflow,
                runCount: workflow.runCount + 1,
                successCount:
                  execution.status === "success"
                    ? workflow.successCount + 1
                    : workflow.successCount,
                failureCount:
                  execution.status === "failed"
                    ? workflow.failureCount + 1
                    : workflow.failureCount,
                lastRunAt: execution.startedAt,
              }
            : workflow,
        ),
      );
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not run workflow",
      );
    } finally {
      setRunningSlug(null);
    }
  }

  return (
    <section className="workflows-manager">
      {error ? <p className="error-text">{error}</p> : null}

      {latestExecution ? (
        <article className="inline-result">
          <div>
            <strong>Latest run: {latestExecution.workflowName}</strong>
            <span>
              {latestExecution.status} · attempt {latestExecution.attempt} ·{" "}
              {latestExecution.durationMs ?? 0}ms
            </span>
          </div>
          <span className={`status-pill ${latestExecution.status}`}>
            {latestExecution.status}
          </span>
        </article>
      ) : null}

      <div className="table-panel">
        {workflows.length === 0 ? (
          <EmptyState
            title="No workflows found"
            description="Create the first automation to populate this operations catalog."
            actionHref="/builder"
            actionLabel="Create workflow"
          />
        ) : (
          <>
            <div className="table-header workflow-table-header">
              <span>Name</span>
              <span>Trigger</span>
              <span>Runs</span>
              <span>Reliability</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {workflows.map((workflow) => {
              const reliability =
                workflow.runCount === 0
                  ? 0
                  : Math.round(
                      (workflow.successCount / workflow.runCount) * 100,
                    );
              const nextStatus =
                workflow.status === "active" ? "paused" : "active";

              return (
                <article
                  className="table-row workflow-table-row"
                  key={workflow.id}
                >
                  <span>
                    <strong>{workflow.name}</strong>
                    <small>{workflow.description}</small>
                  </span>
                  <span>{workflow.triggerType}</span>
                  <span>{workflow.runCount}</span>
                  <span>{reliability}%</span>
                  <span className={`status-pill ${workflow.status}`}>
                    {workflow.status}
                  </span>
                  <span className="row-actions">
                    <button
                      disabled={runningSlug === workflow.slug}
                      type="button"
                      onClick={() => runWorkflow(workflow.slug)}
                    >
                      {runningSlug === workflow.slug ? "Running" : "Run"}
                    </button>
                    <button
                      disabled={statusSlug === workflow.slug}
                      type="button"
                      onClick={() => updateStatus(workflow.slug, nextStatus)}
                    >
                      {nextStatus === "active" ? "Activate" : "Pause"}
                    </button>
                    <Link href={`/builder?workflow=${workflow.slug}`}>
                      Edit
                    </Link>
                  </span>
                </article>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
