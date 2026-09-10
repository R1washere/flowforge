import { Injectable } from "@nestjs/common";
import type {
  ExecutionSummary,
  ScheduleRunResult,
  ScheduleSummary,
} from "@flowforge/shared";
import { AuditService } from "../audit/audit.service";
import type { AuthSession } from "../auth/auth-session";
import { ExecutionEngineService } from "../executions/execution-engine.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executionEngine: ExecutionEngineService,
    private readonly auditService: AuditService,
  ) {}

  async listDueSchedules(organizationId: string): Promise<ScheduleSummary[]> {
    const now = new Date();
    const schedules = await this.prisma.workflowSchedule.findMany({
      where: {
        enabled: true,
        workflow: {
          organizationId,
          status: "active",
        },
        OR: [
          {
            nextRunAt: null,
          },
          {
            nextRunAt: {
              lte: now,
            },
          },
        ],
      },
      include: {
        workflow: true,
      },
      orderBy: {
        nextRunAt: "asc",
      },
    });

    return schedules.map((schedule) => toScheduleSummary(schedule, now));
  }

  async runDueSchedules(session: AuthSession): Promise<ScheduleRunResult> {
    const dueSchedules = await this.listDueSchedules(session.organizationId);
    const now = new Date();
    const executions: ExecutionSummary[] = [];
    const schedules: ScheduleSummary[] = [];

    for (const schedule of dueSchedules) {
      const execution = await this.executionEngine.executeBySchedule(
        schedule.id,
        session.userId,
      );
      const updatedSchedule = await this.prisma.workflowSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          lastTriggeredAt: now,
          nextRunAt: getNextRunAt(schedule.cron, now),
        },
        include: {
          workflow: true,
        },
      });

      await this.auditService.recordEvent({
        organizationId: updatedSchedule.workflow.organizationId,
        actorId: session.userId,
        entityType: "schedule",
        entityId: updatedSchedule.id,
        action: "schedule.due_run_processed",
        summary: `${updatedSchedule.workflow.name} schedule was processed`,
        metadata: {
          workflowSlug: updatedSchedule.workflow.slug,
          executionId: execution.id,
          nextRunAt: updatedSchedule.nextRunAt?.toISOString() ?? null,
        },
      });

      executions.push(execution);
      schedules.push(toScheduleSummary(updatedSchedule, now));
    }

    return {
      dueCount: dueSchedules.length,
      executions,
      schedules,
    };
  }
}

type ScheduleWithWorkflow = Awaited<
  ReturnType<typeof createScheduleTypeHelper>
>;

function createScheduleTypeHelper() {
  const prisma = new PrismaService();
  return prisma.workflowSchedule.findFirstOrThrow({
    include: {
      workflow: true,
    },
  });
}

function toScheduleSummary(
  schedule: ScheduleWithWorkflow,
  now = new Date(),
): ScheduleSummary {
  return {
    id: schedule.id,
    workflowId: schedule.workflowId,
    workflowName: schedule.workflow.name,
    workflowSlug: schedule.workflow.slug,
    cron: schedule.cron,
    timezone: schedule.timezone,
    enabled: schedule.enabled,
    nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
    lastTriggeredAt: schedule.lastTriggeredAt?.toISOString() ?? null,
    isDue:
      schedule.enabled && (!schedule.nextRunAt || schedule.nextRunAt <= now),
  };
}

function getNextRunAt(cron: string, from: Date) {
  const next = new Date(from);
  const hourMatch = /^0\s+(\d{1,2})\s+/.exec(cron);
  const hour = hourMatch ? Number(hourMatch[1]) : 9;

  next.setDate(next.getDate() + 1);
  next.setHours(Number.isFinite(hour) ? hour : 9, 0, 0, 0);

  if (cron.includes("1-5")) {
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}
