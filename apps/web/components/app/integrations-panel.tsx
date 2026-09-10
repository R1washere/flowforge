"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  IntegrationCredentialSummary,
  IntegrationHealthResult,
} from "@flowforge/shared";
import { getApiErrorMessage } from "../../lib/api-error";
import { getDemoAuthHeaders } from "../../lib/demo-auth";
import { EmptyState } from "./empty-state";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4200/api";

export function IntegrationsPanel({
  initialIntegrations,
}: {
  initialIntegrations: IntegrationCredentialSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [result, setResult] = useState<IntegrationHealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runHealthCheck() {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/integrations/health-check`,
          {
            method: "POST",
            headers: getDemoAuthHeaders(),
          },
        );

        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(
              response,
              `Health check returned ${response.status}`,
            ),
          );
        }

        const data = (await response.json()) as IntegrationHealthResult;
        setResult(data);
        setIntegrations(data.integrations);
        router.refresh();
      } catch (checkError) {
        setError(
          checkError instanceof Error
            ? checkError.message
            : "Integration health check failed",
        );
      }
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Integration credentials</h2>
          <span className="panel-kicker">Masked secrets and scoped access</span>
        </div>
        <button
          className="text-action"
          disabled={isPending}
          onClick={runHealthCheck}
          type="button"
        >
          {isPending ? "Checking..." : "Check health"}
        </button>
      </div>

      <div className="integration-grid">
        {integrations.length === 0 ? (
          <EmptyState
            title="No integrations connected"
            description="Connect provider credentials before running external actions."
          />
        ) : (
          integrations.map((integration) => (
            <article className="integration-card" key={integration.id}>
              <div className="integration-card-header">
                <div>
                  <strong>{integration.displayName}</strong>
                  <span>{integration.environment}</span>
                </div>
                <span className={`status-pill ${integration.status}`}>
                  {integration.status}
                </span>
              </div>

              <code>{integration.maskedSecret}</code>
              <div className="scope-list">
                {integration.scopes.map((scope) => (
                  <span key={scope}>{scope}</span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>

      {result ? (
        <div className="scheduler-result">
          <strong>{result.integrations.length} integration(s) checked</strong>
          <span>Audit events were recorded for the simulated check.</span>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
