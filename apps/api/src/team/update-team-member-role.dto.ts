import { IsIn } from "class-validator";
import { organizationRoles, type OrganizationRole } from "@flowforge/shared";

export class UpdateTeamMemberRoleDto {
  @IsIn(organizationRoles)
  role!: OrganizationRole;
}
