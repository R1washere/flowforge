"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ScheduleRunResult, ScheduleSummary } from "@flowforge/shared";
import { getApiErrorMessage } from "../../lib/api-error";
import { getDemoAuthHeaders } from "../../lib/demo-auth";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4200/api";

export function SchedulesPanel({
  initialSchedules,
}: {
  initialSchedules: ScheduleSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [result, setResult] = useState<ScheduleRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasDueSchedules = schedules.some((schedule) => schedule.isDue);

  async function runDueSchedules() {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/schedules/run-due`, {
          method: "POST",
          headers: getDemoAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(
              response,
              `Scheduler returned ${response.status}`,
            ),
          );
        }

        const data = (await response.json()) as ScheduleRunResult;
        setResult(data);
        setSchedules(data.schedules);
        router.refresh();
      } catch (runError) {
        setError(
          runError instanceof Error
            ? runError.message
            : "Scheduler simulation failed",
        );
      }
    });
  }

  return (
    <div className="panel schedule-panel">
      <div className="panel-header">
        <div>
          <h2>Due schedules</h2>
          <span className="panel-kicker">Scheduler simulation</span>
        </div>
        <button
          className="text-action"
          disabled={isPending || !hasDueSchedules}
          onClick={runDueSchedules}
          type="button"
        >
          {isPending ? "Running..." : "Run due"}
        </button>
      </div>

      <div className="schedule-list">
        {schedules.length === 0 ? (
          <p>No due schedules right now.</p>
        ) : (
          schedules.map((schedule) => (
            <article className="schedule-row" key={schedule.id}>
              <div>
                <strong>{schedule.workflowName}</strong>
                <span>
                  {schedule.cron} · {schedule.timezone}
                </span>
              </div>
              <span
                className={`status-pill ${schedule.isDue ? "retrying" : "success"}`}
              >
                {schedule.isDue ? "due" : "planned"}
              </span>
            </article>
          ))
        )}
      </div>

      {result ? (
        <div className="scheduler-result">
          <strong>{result.dueCount} schedule(s) processed</strong>
          <span>
            {result.executions.length} execution(s) created and next run
            recalculated.
          </span>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
