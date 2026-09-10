import { AppShell } from "../../components/app/app-shell";
import { EmptyState } from "../../components/app/empty-state";
import { getExecutions } from "../../lib/api-client";

export const dynamic = "force-dynamic";

export default async function ExecutionsPage() {
  const executions = await getExecutions();

  return (
    <AppShell activePath="/executions">
      <section className="page-header">
        <div>
          <span className="eyebrow">Observability</span>
          <h1>Execution logs</h1>
          <p>
            Inspect workflow runs, step logs, duration, retry attempts, and
            failure reasons.
          </p>
        </div>
      </section>

      <section className="execution-timeline">
        {executions.length === 0 ? (
          <EmptyState
            title="No execution history"
            description="Run a workflow from the builder or workflow table to inspect logs here."
            actionHref="/builder"
            actionLabel="Run workflow"
          />
        ) : (
          executions.map((execution) => (
            <article className="execution-card" key={execution.id}>
              <div className="execution-card-header">
                <div>
                  <strong>{execution.workflowName}</strong>
                  <span>
                    {execution.triggerType} · attempt {execution.attempt} ·{" "}
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
                        {step.status} · {step.stepType} · {step.durationMs ?? 0}
                        ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {execution.error ? (
                <p className="error-text">{execution.error}</p>
              ) : null}
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}
