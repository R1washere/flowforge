import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentSession } from "../auth/current-session.decorator";
import type { AuthSession } from "../auth/auth-session";
import { DemoAuthGuard } from "../auth/demo-auth.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { SchedulesService } from "./schedules.service";

@Controller("schedules")
@UseGuards(DemoAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get("due")
  @RequirePermissions("workflows:read")
  listDueSchedules(@CurrentSession() session: AuthSession) {
    return this.schedulesService.listDueSchedules(session.organizationId);
  }

  @Post("run-due")
  @RequirePermissions("workflows:execute")
  runDueSchedules(@CurrentSession() session: AuthSession) {
    return this.schedulesService.runDueSchedules(session);
  }
}
