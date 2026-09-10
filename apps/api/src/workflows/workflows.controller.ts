import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentSession } from "../auth/current-session.decorator";
import type { AuthSession } from "../auth/auth-session";
import { DemoAuthGuard } from "../auth/demo-auth.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { ExecuteWorkflowDto } from "./dto/execute-workflow.dto";
import { UpdateWorkflowStatusDto } from "./dto/update-workflow-status.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";
import { ExecutionEngineService } from "../executions/execution-engine.service";
import { WorkflowsService } from "./workflows.service";

@Controller("workflows")
@UseGuards(DemoAuthGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionEngine: ExecutionEngineService,
  ) {}

  @Get()
  @RequirePermissions("workflows:read")
  listWorkflows(@CurrentSession() session: AuthSession) {
    return this.workflowsService.listWorkflows(session.organizationId);
  }

  @Get("stats")
  @RequirePermissions("workflows:read")
  getStats(@CurrentSession() session: AuthSession) {
    return this.workflowsService.getDashboardStats(session.organizationId);
  }

  @Post()
  @RequirePermissions("workflows:write")
  createWorkflow(
    @Body() dto: CreateWorkflowDto,
    @CurrentSession() session: AuthSession,
  ) {
    return this.workflowsService.createWorkflow(dto, session);
  }

  @Patch(":slug")
  @RequirePermissions("workflows:write")
  updateWorkflow(
    @Param("slug") slug: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentSession() session: AuthSession,
  ) {
    return this.workflowsService.updateWorkflow(slug, dto, session);
  }

  @Patch(":slug/status")
  @RequirePermissions("workflows:write")
  updateWorkflowStatus(
    @Param("slug") slug: string,
    @Body() dto: UpdateWorkflowStatusDto,
    @CurrentSession() session: AuthSession,
  ) {
    return this.workflowsService.updateWorkflowStatus(
      slug,
      dto.status,
      session,
    );
  }

  @Get(":slug")
  @RequirePermissions("workflows:read")
  getWorkflow(
    @Param("slug") slug: string,
    @CurrentSession() session: AuthSession,
  ) {
    return this.workflowsService.getWorkflowBySlug(
      slug,
      session.organizationId,
    );
  }

  @Post(":slug/execute")
  @RequirePermissions("workflows:execute")
  executeWorkflow(
    @Param("slug") slug: string,
    @Body() dto: ExecuteWorkflowDto,
    @CurrentSession() session: AuthSession,
  ) {
    return this.executionEngine.executeBySlug(slug, dto.input ?? {}, session);
  }
}
