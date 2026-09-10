import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { OrganizationRole, Permission } from "@flowforge/shared";
import type { AuthenticatedRequest } from "./auth-session";
import { getPermissionsForRole } from "./role-policies";
import { REQUIRED_PERMISSIONS_KEY } from "./require-permissions.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DemoAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const email = getRequestedUserEmail(request);

    const member = await this.prisma.organizationMember.findFirst({
      where: {
        status: "active",
        user: {
          email,
        },
      },
      include: {
        organization: true,
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!member) {
      throw new UnauthorizedException(`Demo user ${email} was not found`);
    }

    const role = member.role as OrganizationRole;
    const permissions = getPermissionsForRole(role);
    request.authSession = {
      userId: member.userId,
      email: member.user.email,
      name: member.user.name,
      organizationId: member.organizationId,
      organizationSlug: member.organization.slug,
      role,
      permissions,
    };

    if (
      requiredPermissions.some(
        (permission) => !permissions.includes(permission),
      )
    ) {
      throw new ForbiddenException(
        `${role} does not have required permissions: ${requiredPermissions.join(", ")}`,
      );
    }

    return true;
  }
}

function getRequestedUserEmail(request: AuthenticatedRequest) {
  const header = request.headers["x-flowforge-user-email"];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim() || "demo@flowforge.dev";
}
