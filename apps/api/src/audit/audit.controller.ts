import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentSession } from "../auth/current-session.decorator";
import type { AuthSession } from "../auth/auth-session";
import { DemoAuthGuard } from "../auth/demo-auth.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { AuditService } from "./audit.service";

@Controller("audit-events")
@UseGuards(DemoAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions("audit:read")
  listAuditEvents(@CurrentSession() session: AuthSession) {
    return this.auditService.listAuditEvents(session.organizationId);
  }
}
