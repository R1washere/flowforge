import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentSession } from "../auth/current-session.decorator";
import type { AuthSession } from "../auth/auth-session";
import { DemoAuthGuard } from "../auth/demo-auth.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { IntegrationsService } from "./integrations.service";

@Controller("integrations")
@UseGuards(DemoAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @RequirePermissions("integrations:read")
  listIntegrations(@CurrentSession() session: AuthSession) {
    return this.integrationsService.listIntegrations(session.organizationId);
  }

  @Post("health-check")
  @RequirePermissions("integrations:manage")
  runHealthCheck(@CurrentSession() session: AuthSession) {
    return this.integrationsService.runHealthCheck(session);
  }
}
