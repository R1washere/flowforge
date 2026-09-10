import { AppShell } from "../../components/app/app-shell";
import { EmptyState } from "../../components/app/empty-state";
import { IntegrationsPanel } from "../../components/app/integrations-panel";
import { getAuditEvents, getIntegrations } from "../../lib/api-client";

export const dynamic = "force-dynamic";

export default async function GovernancePage() {
  const [integrations, auditEvents] = await Promise.all([
    getIntegrations(),
    getAuditEvents(),
  ]);

  return (
    <AppShell activePath="/governance">
      <section className="page-header">
        <div>
          <span className="eyebrow">Enterprise controls</span>
          <h1>Governance</h1>
          <p>
            Monitor integration credentials, simulated provider health checks,
            and the audit trail behind workflow changes and executions.
          </p>
        </div>
      </section>

      <section className="governance-layout">
        <IntegrationsPanel initialIntegrations={integrations} />

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Audit trail</h2>
              <span className="panel-kicker">Recent operational events</span>
            </div>
          </div>

          <div className="audit-list">
            {auditEvents.length === 0 ? (
              <EmptyState
                title="No audit events yet"
                description="Workflow, scheduler, integration, and team actions will appear here."
              />
            ) : (
              auditEvents.map((event) => (
                <article className="audit-row" key={event.id}>
                  <span className={`entity-dot ${event.entityType}`} />
                  <div>
                    <strong>{event.summary}</strong>
                    <span>
                      {event.action} · {event.actorName ?? "System"} ·{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
