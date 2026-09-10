import { AppShell } from "../../components/app/app-shell";
import { WorkflowBuilder } from "../../components/app/workflow-builder";
import { getWorkflow, getWorkflows } from "../../lib/api-client";

export const dynamic = "force-dynamic";

export default async function BuilderPage({
  searchParams,
}: {
  searchParams?: Promise<{ workflow?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedWorkflowSlug = params.workflow ?? "customer-onboarding";
  const [workflow, workflows] = await Promise.all([
    getWorkflow(selectedWorkflowSlug),
    getWorkflows(),
  ]);

  return (
    <AppShell activePath="/builder">
      <section className="page-header">
        <div>
          <span className="eyebrow">Visual builder</span>
          <h1>{workflow.name}</h1>
          <p>{workflow.description}</p>
        </div>
        <div className="header-stack">
          <span className={`status-pill ${workflow.status}`}>
            {workflow.status}
          </span>
          <span className="muted">
            retries {workflow.retryLimit} · timeout {workflow.timeoutSeconds}s
          </span>
        </div>
      </section>

      <WorkflowBuilder initialWorkflow={workflow} workflows={workflows} />
    </AppShell>
  );
}
