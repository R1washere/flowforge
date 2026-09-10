import { AppShell } from "../components/app/app-shell";

export default function Loading() {
  return (
    <AppShell activePath="/">
      <section className="page-header">
        <div>
          <span className="eyebrow">Loading</span>
          <h1>Preparing FlowForge</h1>
          <p>Loading workflows, executions, and workspace controls.</p>
        </div>
      </section>

      <section className="metrics-grid">
        {Array.from({ length: 5 }).map((_, index) => (
          <article className="metric-card skeleton-card" key={index}>
            <span />
            <strong />
          </article>
        ))}
      </section>
    </AppShell>
  );
}
