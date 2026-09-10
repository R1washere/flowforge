import Link from "next/link";
import { AppShell } from "../../components/app/app-shell";
import { WorkflowsTable } from "../../components/app/workflows-table";
import { getWorkflows } from "../../lib/api-client";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const workflows = await getWorkflows();

  return (
    <AppShell activePath="/workflows">
      <section className="page-header">
        <div>
          <span className="eyebrow">Automation catalog</span>
          <h1>Workflows</h1>
          <p>
            Review activation state, trigger type, retry policy, and execution
            history.
          </p>
        </div>
        <Link className="primary-action" href="/builder">
          Create workflow
        </Link>
      </section>

      <WorkflowsTable initialWorkflows={workflows} />
    </AppShell>
  );
}
