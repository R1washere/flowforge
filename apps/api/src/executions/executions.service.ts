import { Injectable } from "@nestjs/common";
import type { ExecutionSummary } from "@flowforge/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toExecutionSummary } from "./execution-engine.service";

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listExecutions(organizationId: string): Promise<ExecutionSummary[]> {
    const executions = await this.prisma.workflowExecution.findMany({
      where: {
        workflow: {
          organizationId,
        },
      },
      include: {
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
      },
      orderBy: {
        startedAt: "desc",
      },
      take: 20,
    });

    return executions.map((execution) => toExecutionSummary(execution));
  }
}
