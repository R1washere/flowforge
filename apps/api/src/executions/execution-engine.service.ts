import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ExecutionSummary, TriggerType } from "@flowforge/shared";
import { AuditService } from "../audit/audit.service";
import type { AuthSession } from "../auth/auth-session";
import { PrismaService } from "../prisma/prisma.service";

type ExecutableWorkflow = NonNullable<
  Awaited<ReturnType<ExecutionEngineService["findExecutableWorkflow"]>>
>;

@Injectable()
export class ExecutionEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async executeBySlug(
    slug: string,
    input: Record<string, unknown>,
    session: AuthSession,
  ): Promise<ExecutionSummary> {
    const workflow = await this.findExecutableWorkflow({
      slug,
      organizationId: session.organizationId,
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${slug} was not found`);
    }

    return this.executeWorkflow(
      workflow,
      input,
      workflow.triggerType,
      session.userId,
    );
  }

  async executeByWebhook(
    publicPath: string,
    input: Record<string, unknown>,
    secret?: string,
  ): Promise<ExecutionSummary> {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: {
        publicPath,
      },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: {
                position: "asc",
              },
            },
          },
        },
      },
    });

    if (!endpoint) {
      throw new NotFoundException(`Webhook ${publicPath} was not found`);
    }

    if (endpoint.secret !== secret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }

    return this.executeWorkflow(endpoint.workflow, input, "webhook");
  }

  async executeBySchedule(
    scheduleId: string,
    actorId?: string | null,
  ): Promise<ExecutionSummary> {
    const schedule = await this.prisma.workflowSchedule.findUnique({
      where: {
        id: scheduleId,
      },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: {
                position: "asc",
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule ${scheduleId} was not found`);
    }

    if (!schedule.enabled || schedule.workflow.status !== "active") {
      throw new BadRequestException("Schedule is not enabled for execution");
    }

    return this.executeWorkflow(
      schedule.workflow,
      {
        source: "scheduler",
        scheduleId: schedule.id,
        cron: schedule.cron,
        timezone: schedule.timezone,
        scheduledAt: new Date().toISOString(),
      },
      "schedule",
      actorId,
    );
  }

  private async executeWorkflow(
    workflow: ExecutableWorkflow,
    input: Record<string, unknown>,
    triggerType: string,
    actorId?: string | null,
  ): Promise<ExecutionSummary> {
    const startedAt = new Date();
    const stepPlans = workflow.steps.map((step, index) =>
      evaluateStep(workflow.slug, step, index, workflow.steps.length, input),
    );
    const failedStep = stepPlans.find((step) => step.status === "failed");
    const shouldRetry = Boolean(failedStep && workflow.retryLimit > 0);
    const status = failedStep
      ? shouldRetry
        ? "retrying"
        : "failed"
      : "success";
    const durationMs = stepPlans.reduce(
      (total, step) => total + step.durationMs,
      0,
    );
    const finishedAt = new Date(startedAt.getTime() + durationMs);

    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        status,
        triggerType,
        attempt: shouldRetry ? 1 : failedStep ? workflow.retryLimit + 1 : 1,
        input: JSON.stringify(input),
        output: JSON.stringify(
          failedStep
            ? {
                failedStep: failedStep.stepName,
                retryScheduled: shouldRetry,
                nextAttemptInSeconds: shouldRetry ? 60 : null,
              }
            : {
                completedSteps: workflow.steps.length,
              },
        ),
        error: failedStep?.error ?? null,
        durationMs,
        startedAt,
        finishedAt,
        steps: {
          create: stepPlans.map((step) => ({
            stepId: step.stepId,
            stepName: step.stepName,
            stepType: step.stepType,
            position: step.position,
            status: step.status,
            durationMs: step.durationMs,
            output: JSON.stringify(step.output),
            error: step.error,
            startedAt: new Date(startedAt.getTime() + step.offsetMs),
            finishedAt: new Date(
              startedAt.getTime() + step.offsetMs + step.durationMs,
            ),
          })),
        },
        logs: {
          create: stepPlans.map((step) => ({
            stepName: step.stepName,
            level: step.status === "failed" ? "error" : "info",
            message:
              step.status === "failed"
                ? `${step.stepType} failed: ${step.error}`
                : `${step.stepType} completed in ${step.durationMs}ms`,
            metadata: JSON.stringify({
              position: step.position,
              retryScheduled: shouldRetry && step.status === "failed",
            }),
          })),
        },
      },
      include: executionInclude,
    });

    await this.prisma.workflow.update({
      where: {
        id: workflow.id,
      },
      data: {
        runCount: { increment: 1 },
        successCount: status === "success" ? { increment: 1 } : undefined,
        failureCount: status !== "success" ? { increment: 1 } : undefined,
        lastRunAt: startedAt,
      },
    });

    await this.auditService.recordEvent({
      organizationId: workflow.organizationId,
      actorId: actorId ?? workflow.createdById,
      entityType: "workflow",
      entityId: workflow.id,
      action: "workflow.executed",
      summary: `${workflow.name} executed via ${triggerType} with ${status} status`,
      metadata: {
        workflowSlug: workflow.slug,
        triggerType,
        status,
        durationMs,
        failedStep: failedStep?.stepName ?? null,
      },
    });

    return toExecutionSummary(execution);
  }

  private findExecutableWorkflow(where: {
    slug: string;
    organizationId: string;
  }) {
    return this.prisma.workflow.findFirst({
      where,
      include: {
        steps: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });
  }
}

const executionInclude = {
  workflow: true,
  steps: {
    orderBy: {
      position: "asc",
    },
  },
  logs: {
    orderBy: {
      createdAt: "asc",
    },
  },
} as const;

type ExecutionWithRelations = Awaited<
  ReturnType<typeof createExecutionTypeHelper>
>;

function createExecutionTypeHelper() {
  const prisma = new PrismaService();
  return prisma.workflowExecution.findFirstOrThrow({
    include: executionInclude,
  });
}

function evaluateStep(
  workflowSlug: string,
  step: ExecutableWorkflow["steps"][number],
  index: number,
  stepCount: number,
  input: Record<string, unknown>,
) {
  const isLastStep = index === stepCount - 1;
  const shouldFail =
    input.forceFailure === true ||
    (workflowSlug === "payment-failure-alert" && isLastStep);
  const durationMs = 120 + index * 70 + (step.type === "action" ? 180 : 40);
  const offsetMs =
    index === 0 ? 0 : index * 220 + (step.type === "action" ? 90 : 0);

  return {
    stepId: step.id,
    stepName: step.name,
    stepType: step.type,
    position: step.position,
    status: shouldFail ? "failed" : "success",
    durationMs,
    offsetMs,
    output: shouldFail
      ? {
          providerStatus: 429,
          retryable: true,
        }
      : {
          ok: true,
          type: step.type,
        },
    error: shouldFail ? "Remote action returned HTTP 429" : null,
  };
}

export function toExecutionSummary(
  execution: NonNullable<ExecutionWithRelations>,
): ExecutionSummary {
  return {
    id: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflow.name,
    workflowSlug: execution.workflow.slug,
    status: execution.status as ExecutionSummary["status"],
    triggerType: execution.triggerType as TriggerType,
    attempt: execution.attempt,
    durationMs: execution.durationMs,
    startedAt: execution.startedAt.toISOString(),
    finishedAt: execution.finishedAt?.toISOString() ?? null,
    error: execution.error,
    stepExecutions: execution.steps.map((step) => ({
      id: step.id,
      stepId: step.stepId,
      stepName: step.stepName,
      stepType:
        step.stepType as ExecutionSummary["stepExecutions"][number]["stepType"],
      position: step.position,
      status:
        step.status as ExecutionSummary["stepExecutions"][number]["status"],
      durationMs: step.durationMs,
      output: parseJsonObject(step.output),
      error: step.error,
      startedAt: step.startedAt.toISOString(),
      finishedAt: step.finishedAt?.toISOString() ?? null,
    })),
    logs: execution.logs.map((log) => ({
      id: log.id,
      stepName: log.stepName,
      level: log.level as ExecutionSummary["logs"][number]["level"],
      message: log.message,
      metadata: parseJsonObject(log.metadata),
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
