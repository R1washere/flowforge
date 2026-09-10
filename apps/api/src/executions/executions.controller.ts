import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentSession } from "../auth/current-session.decorator";
import type { AuthSession } from "../auth/auth-session";
import { DemoAuthGuard } from "../auth/demo-auth.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { ExecutionsService } from "./executions.service";

@Controller("executions")
@UseGuards(DemoAuthGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @RequirePermissions("workflows:read")
  listExecutions(@CurrentSession() session: AuthSession) {
    return this.executionsService.listExecutions(session.organizationId);
  }
}
