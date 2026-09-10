import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { OrganizationRole, Permission } from "@flowforge/shared";
import { CurrentSession } from "../auth/current-session.decorator";
import type { AuthSession } from "../auth/auth-session";
import { DemoAuthGuard } from "../auth/demo-auth.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { UpdateTeamMemberRoleDto } from "./update-team-member-role.dto";
import { TeamService } from "./team.service";

@Controller("team")
@UseGuards(DemoAuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @RequirePermissions("team:read")
  listMembers(@CurrentSession() session: AuthSession) {
    return this.teamService.listMembers(session.organizationId);
  }

  @Get("role-policies")
  @RequirePermissions("team:read")
  listRolePolicies() {
    return this.teamService.listRolePolicies();
  }

  @Get("permission-check")
  @RequirePermissions("team:read")
  checkPermission(
    @Query("role") role: OrganizationRole,
    @Query("permission") permission: Permission,
  ) {
    return this.teamService.checkPermission(role, permission);
  }

  @Patch(":memberId/role")
  @RequirePermissions("team:manage")
  updateMemberRole(
    @Param("memberId") memberId: string,
    @Body() dto: UpdateTeamMemberRoleDto,
    @CurrentSession() session: AuthSession,
  ) {
    return this.teamService.updateMemberRole(memberId, dto.role, session);
  }
}
