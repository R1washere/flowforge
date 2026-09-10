import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  OrganizationRole,
  Permission,
  PermissionCheckResult,
  RolePolicySummary,
  TeamMemberSummary,
} from "@flowforge/shared";
import { AuditService } from "../audit/audit.service";
import type { AuthSession } from "../auth/auth-session";
import { rolePolicies } from "../auth/role-policies";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listMembers(organizationId: string): Promise<TeamMemberSummary[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
      },
      include: {
        user: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    return members.map(toTeamMemberSummary);
  }

  listRolePolicies(): RolePolicySummary[] {
    return Object.entries(rolePolicies).map(([role, policy]) => ({
      role: role as OrganizationRole,
      description: policy.description,
      permissions: policy.permissions,
    }));
  }

  checkPermission(
    role: OrganizationRole,
    permission: Permission,
  ): PermissionCheckResult {
    const policy = rolePolicies[role];
    const allowed = Boolean(policy?.permissions.includes(permission));

    return {
      role,
      permission,
      allowed,
      reason: allowed
        ? `${role} can ${permission}`
        : `${role} does not have ${permission}`,
    };
  }

  async updateMemberRole(
    memberId: string,
    role: OrganizationRole,
    session: AuthSession,
  ): Promise<TeamMemberSummary> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        id: memberId,
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Team member ${memberId} was not found`);
    }

    if (member.organizationId !== session.organizationId) {
      throw new NotFoundException(`Team member ${memberId} was not found`);
    }

    if (member.role === "owner" && role !== "owner") {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId: member.organizationId,
          role: "owner",
          status: "active",
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException("Workspace must keep at least one owner");
      }
    }

    const updatedMember = await this.prisma.organizationMember.update({
      where: {
        id: memberId,
      },
      data: {
        role,
      },
      include: {
        user: true,
      },
    });

    await this.auditService.recordEvent({
      organizationId: member.organizationId,
      actorId: session.userId,
      entityType: "team_member",
      entityId: member.id,
      action: "team.role_changed",
      summary: `${member.user.name ?? member.user.email} role changed from ${member.role} to ${role}`,
      metadata: {
        previousRole: member.role,
        nextRole: role,
        userEmail: member.user.email,
      },
    });

    return toTeamMemberSummary(updatedMember);
  }
}

type TeamMemberWithUser = Awaited<
  ReturnType<typeof createTeamMemberTypeHelper>
>;

function createTeamMemberTypeHelper() {
  const prisma = new PrismaService();
  return prisma.organizationMember.findFirstOrThrow({
    include: {
      user: true,
    },
  });
}

function toTeamMemberSummary(member: TeamMemberWithUser): TeamMemberSummary {
  const role = member.role as OrganizationRole;

  return {
    id: member.id,
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    role,
    status: member.status,
    permissions: rolePolicies[role]?.permissions ?? [],
    lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString(),
  };
}
