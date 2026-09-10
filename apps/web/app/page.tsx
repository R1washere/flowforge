import Link from "next/link";
import { AppShell } from "../components/app/app-shell";
import { EmptyState } from "../components/app/empty-state";
import { SchedulesPanel } from "../components/app/schedules-panel";
import {
  getDashboardStats,
  getDueSchedules,
  getExecutions,
  getWorkflows,
} from "../lib/api-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, workflows, executions, dueSchedules] = await Promise.all([
    getDashboardStats(),
    getWorkflows(),
    getExecutions(),
    getDueSchedules(),
  ]);

  return (
    <AppShell activePath="/">
      <section className="page-header">
        <div>
          <span className="eyebrow">Workflow operations</span>
          <h1>Automation command center</h1>
          <p>
            Monitor active automations, execution health, retry failures, and
            the operational load behind customer-facing workflows.
          </p>
        </div>
        <Link className="primary-action" href="/builder">
          Open builder
        </Link>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Total workflows" value={stats.totalWorkflows} />
        <MetricCard label="Active workflows" value={stats.activeWorkflows} />
        <MetricCard label="Runs today" value={stats.runsToday} />
        <MetricCard
          label="Success rate"
          value={`${stats.successRate}%`}
          tone="success"
        />
        <MetricCard
          label="Failed runs"
          value={stats.failedRuns}
          tone="danger"
        />
        <MetricCard label="Queued" value={stats.queuedExecutions} />
        <MetricCard label="Running" value={stats.runningExecutions} />
        <MetricCard
          label="Retrying"
          value={stats.retryingExecutions}
          tone="warning"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Workflow health</h2>
            <Link href="/workflows">View all</Link>
          </div>
          <div className="workflow-list">
            {workflows.length === 0 ? (
              <EmptyState
                title="No workflows yet"
                description="Create a workflow to start monitoring automation health."
                actionHref="/builder"
                actionLabel="Open builder"
              />
            ) : (
              workflows.map((workflow) => (
                <article className="workflow-row" key={workflow.id}>
                  <div>
                    <strong>{workflow.name}</strong>
                    <span>{workflow.description}</span>
                  </div>
                  <span className={`status-pill ${workflow.status}`}>
                    {workflow.status}
                  </span>
                </article>
              ))
            )}
          </div>
        </div>

        <SchedulesPanel initialSchedules={dueSchedules} />

        <div className="panel">
          <div className="panel-header">
            <h2>Recent executions</h2>
            <Link href="/executions">Debug logs</Link>
          </div>
          <div className="execution-list">
            {executions.length === 0 ? (
              <EmptyState
                title="No executions yet"
                description="Run a workflow to generate step-level execution logs."
              />
            ) : (
              executions.slice(0, 5).map((execution) => (
                <article className="execution-row" key={execution.id}>
                  <span className={`dot ${execution.status}`} />
                  <div>
                    <strong>{execution.workflowName}</strong>
                    <span>
                      {execution.status} · attempt {execution.attempt} ·{" "}
                      {execution.durationMs ?? 0}ms
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
