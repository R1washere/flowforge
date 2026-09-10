import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateWorkflowInput,
  DashboardStats,
  TriggerType,
  UpdateWorkflowInput,
  WorkflowDetail,
  WorkflowStatus,
  WorkflowSummary,
} from "@flowforge/shared";
import type { AuthSession } from "../auth/auth-session";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

type WorkflowWithRelations = Awaited<
  ReturnType<WorkflowsService["findWorkflowBySlug"]>
>;

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listWorkflows(organizationId: string): Promise<WorkflowSummary[]> {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        organizationId,
      },
      include: {
        steps: true,
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return workflows.map((workflow) => ({
      id: workflow.id,
      slug: workflow.slug,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status as WorkflowStatus,
      triggerType: workflow.triggerType as TriggerType,
      retryLimit: workflow.retryLimit,
      timeoutSeconds: workflow.timeoutSeconds,
      runCount: workflow.runCount,
      successCount: workflow.successCount,
      failureCount: workflow.failureCount,
      lastRunAt: workflow.lastRunAt?.toISOString() ?? null,
      stepsCount: workflow.steps.length,
    }));
  }

  async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    const [
      totalWorkflows,
      activeWorkflows,
      failedRuns,
      queuedExecutions,
      runningExecutions,
      retryingExecutions,
      recentExecutions,
    ] = await Promise.all([
      this.prisma.workflow.count({ where: { organizationId } }),
      this.prisma.workflow.count({
        where: { organizationId, status: "active" },
      }),
      this.prisma.workflowExecution.count({
        where: { status: "failed", workflow: { organizationId } },
      }),
      this.prisma.workflowExecution.count({
        where: { status: "queued", workflow: { organizationId } },
      }),
      this.prisma.workflowExecution.count({
        where: { status: "running", workflow: { organizationId } },
      }),
      this.prisma.workflowExecution.count({
        where: { status: "retrying", workflow: { organizationId } },
      }),
      this.prisma.workflowExecution.findMany({
        where: {
          workflow: {
            organizationId,
          },
          startedAt: {
            gte: startOfToday(),
          },
        },
        select: {
          status: true,
        },
      }),
    ]);

    const successfulRuns = recentExecutions.filter(
      (execution) => execution.status === "success",
    ).length;
    const successRate =
      recentExecutions.length === 0
        ? 0
        : Math.round((successfulRuns / recentExecutions.length) * 100);

    return {
      totalWorkflows,
      activeWorkflows,
      runsToday: recentExecutions.length,
      failedRuns,
      queuedExecutions,
      runningExecutions,
      retryingExecutions,
      successRate,
    };
  }

  async getWorkflowBySlug(
    slug: string,
    organizationId: string,
  ): Promise<WorkflowDetail> {
    const workflow = await this.findWorkflowBySlug(slug, organizationId);

    if (!workflow) {
      throw new NotFoundException(`Workflow ${slug} was not found`);
    }

    return this.toWorkflowDetail(workflow);
  }

  async createWorkflow(
    input: CreateWorkflowInput,
    session: AuthSession,
  ): Promise<WorkflowDetail> {
    const slug = toSlug(input.slug || input.name);

    if (!slug) {
      throw new BadRequestException("Workflow slug could not be generated");
    }

    const hasTrigger = input.steps.some((step) => step.type === "trigger");

    if (!hasTrigger) {
      throw new BadRequestException(
        "Workflow must include at least one trigger step",
      );
    }

    const existing = await this.prisma.workflow.findFirst({
      where: {
        organizationId: session.organizationId,
        slug,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(`Workflow slug ${slug} already exists`);
    }

    const workflow = await this.prisma.workflow.create({
      data: {
        organizationId: session.organizationId,
        createdById: session.userId,
        name: input.name.trim(),
        slug,
        description: input.description.trim(),
        status: input.status,
        triggerType: input.triggerType,
        retryLimit: input.retryLimit,
        timeoutSeconds: input.timeoutSeconds,
        webhookEndpoint:
          input.triggerType === "webhook"
            ? {
                create: {
                  publicPath: slug,
                  secret: `whsec_demo_${slug.replaceAll("-", "_")}`,
                },
              }
            : undefined,
        schedule:
          input.triggerType === "schedule"
            ? {
                create: {
                  cron: "0 9 * * 1-5",
                  timezone: "Europe/Prague",
                  enabled: input.status === "active",
                  nextRunAt:
                    input.status === "active" ? getNextBusinessRunAt(9) : null,
                },
              }
            : undefined,
        steps: {
          create: input.steps.map((step, index) => ({
            type: step.type,
            name: step.name.trim(),
            position: index + 1,
            config: JSON.stringify(step.config),
          })),
        },
      },
      include: {
        steps: {
          orderBy: {
            position: "asc",
          },
        },
        webhookEndpoint: true,
        schedule: true,
      },
    });

    await this.auditService.recordEvent({
      organizationId: workflow.organizationId,
      actorId: session.userId,
      entityType: "workflow",
      entityId: workflow.id,
      action: "workflow.created",
      summary: `${workflow.name} workflow was created`,
      metadata: {
        slug: workflow.slug,
        triggerType: workflow.triggerType,
        status: workflow.status,
        stepsCount: workflow.steps.length,
      },
    });

    return this.toWorkflowDetail(workflow);
  }

  async updateWorkflow(
    currentSlug: string,
    input: UpdateWorkflowInput,
    session: AuthSession,
  ): Promise<WorkflowDetail> {
    const existing = await this.findWorkflowBySlug(
      currentSlug,
      session.organizationId,
    );

    if (!existing) {
      throw new NotFoundException(`Workflow ${currentSlug} was not found`);
    }

    const nextSlug = toSlug(input.slug || input.name);

    if (!nextSlug) {
      throw new BadRequestException("Workflow slug could not be generated");
    }

    const hasTrigger = input.steps.some((step) => step.type === "trigger");

    if (!hasTrigger) {
      throw new BadRequestException(
        "Workflow must include at least one trigger step",
      );
    }

    if (nextSlug !== existing.slug) {
      const slugOwner = await this.prisma.workflow.findFirst({
        where: {
          organizationId: existing.organizationId,
          slug: nextSlug,
          NOT: {
            id: existing.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (slugOwner) {
        throw new ConflictException(`Workflow slug ${nextSlug} already exists`);
      }
    }

    const workflow = await this.prisma.$transaction(async (tx) => {
      await tx.workflowStep.deleteMany({
        where: {
          workflowId: existing.id,
        },
      });

      await tx.webhookEndpoint.deleteMany({
        where: {
          workflowId: existing.id,
        },
      });

      await tx.workflowSchedule.deleteMany({
        where: {
          workflowId: existing.id,
        },
      });

      return tx.workflow.update({
        where: {
          id: existing.id,
        },
        data: {
          name: input.name.trim(),
          slug: nextSlug,
          description: input.description.trim(),
          status: input.status,
          triggerType: input.triggerType,
          retryLimit: input.retryLimit,
          timeoutSeconds: input.timeoutSeconds,
          webhookEndpoint:
            input.triggerType === "webhook"
              ? {
                  create: {
                    publicPath: nextSlug,
                    secret: `whsec_demo_${nextSlug.replaceAll("-", "_")}`,
                  },
                }
              : undefined,
          schedule:
            input.triggerType === "schedule"
              ? {
                  create: {
                    cron: "0 9 * * 1-5",
                    timezone: "Europe/Prague",
                    enabled: input.status === "active",
                    nextRunAt:
                      input.status === "active"
                        ? getNextBusinessRunAt(9)
                        : null,
                  },
                }
              : undefined,
          steps: {
            create: input.steps.map((step, index) => ({
              type: step.type,
              name: step.name.trim(),
              position: index + 1,
              config: JSON.stringify(step.config),
            })),
          },
        },
        include: {
          steps: {
            orderBy: {
              position: "asc",
            },
          },
          webhookEndpoint: true,
          schedule: true,
        },
      });
    });

    await this.auditService.recordEvent({
      organizationId: workflow.organizationId,
      actorId: session.userId,
      entityType: "workflow",
      entityId: workflow.id,
      action: "workflow.updated",
      summary: `${workflow.name} workflow definition was updated`,
      metadata: {
        previousSlug: existing.slug,
        nextSlug: workflow.slug,
        triggerType: workflow.triggerType,
        stepsCount: workflow.steps.length,
      },
    });

    return this.toWorkflowDetail(workflow);
  }

  async updateWorkflowStatus(
    slug: string,
    status: WorkflowStatus,
    session: AuthSession,
  ): Promise<WorkflowDetail> {
    const existing = await this.findWorkflowBySlug(
      slug,
      session.organizationId,
    );

    if (!existing) {
      throw new NotFoundException(`Workflow ${slug} was not found`);
    }

    const workflow = await this.prisma.workflow.update({
      where: {
        id: existing.id,
      },
      data: {
        status,
        schedule: existing.schedule
          ? {
              update: {
                enabled: status === "active",
                nextRunAt:
                  status === "active" ? getNextBusinessRunAt(9) : undefined,
              },
            }
          : undefined,
      },
      include: {
        steps: {
          orderBy: {
            position: "asc",
          },
        },
        webhookEndpoint: true,
        schedule: true,
      },
    });

    await this.auditService.recordEvent({
      organizationId: workflow.organizationId,
      actorId: session.userId,
      entityType: "workflow",
      entityId: workflow.id,
      action: "workflow.status_changed",
      summary: `${workflow.name} moved to ${status}`,
      metadata: {
        slug: workflow.slug,
        status,
      },
    });

    return this.toWorkflowDetail(workflow);
  }

  private findWorkflowBySlug(slug: string, organizationId?: string) {
    return this.prisma.workflow.findFirst({
      where: {
        slug,
        organizationId,
      },
      include: {
        steps: {
          orderBy: {
            position: "asc",
          },
        },
        webhookEndpoint: true,
        schedule: true,
      },
    });
  }

  private toWorkflowDetail(
    workflow: NonNullable<WorkflowWithRelations>,
  ): WorkflowDetail {
    return {
      id: workflow.id,
      slug: workflow.slug,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status as WorkflowStatus,
      triggerType: workflow.triggerType as TriggerType,
      retryLimit: workflow.retryLimit,
      timeoutSeconds: workflow.timeoutSeconds,
      runCount: workflow.runCount,
      successCount: workflow.successCount,
      failureCount: workflow.failureCount,
      lastRunAt: workflow.lastRunAt?.toISOString() ?? null,
      stepsCount: workflow.steps.length,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        type: step.type as WorkflowDetail["steps"][number]["type"],
        name: step.name,
        position: step.position,
        config: parseJsonObject(step.config),
      })),
      webhookUrl: workflow.webhookEndpoint
        ? `/api/webhooks/${workflow.webhookEndpoint.publicPath}`
        : null,
      schedule: workflow.schedule
        ? {
            cron: workflow.schedule.cron,
            timezone: workflow.schedule.timezone,
            enabled: workflow.schedule.enabled,
            nextRunAt: workflow.schedule.nextRunAt?.toISOString() ?? null,
            lastTriggeredAt:
              workflow.schedule.lastTriggeredAt?.toISOString() ?? null,
          }
        : null,
    };
  }
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

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getNextBusinessRunAt(hour: number) {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(hour, 0, 0, 0);

  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
