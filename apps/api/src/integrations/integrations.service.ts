import { Injectable } from "@nestjs/common";
import type {
  IntegrationCredentialSummary,
  IntegrationHealthResult,
  IntegrationStatus,
} from "@flowforge/shared";
import { AuditService } from "../audit/audit.service";
import type { AuthSession } from "../auth/auth-session";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listIntegrations(
    organizationId: string,
  ): Promise<IntegrationCredentialSummary[]> {
    const integrations = await this.prisma.integrationCredential.findMany({
      where: {
        organizationId,
      },
      orderBy: [{ status: "asc" }, { provider: "asc" }],
    });

    return integrations.map(toIntegrationSummary);
  }

  async runHealthCheck(session: AuthSession): Promise<IntegrationHealthResult> {
    const checkedAt = new Date();
    const integrations = await this.prisma.integrationCredential.findMany({
      where: {
        organizationId: session.organizationId,
      },
      include: {
        organization: true,
      },
      orderBy: {
        provider: "asc",
      },
    });

    const checkedIntegrations = [];

    for (const integration of integrations) {
      const nextStatus = getSimulatedStatus(integration.provider);
      const updatedIntegration = await this.prisma.integrationCredential.update(
        {
          where: {
            id: integration.id,
          },
          data: {
            status: nextStatus,
            lastCheckedAt: checkedAt,
          },
        },
      );

      await this.auditService.recordEvent({
        organizationId: integration.organizationId,
        actorId: session.userId,
        entityType: "integration",
        entityId: integration.id,
        action: "integration.health_checked",
        summary: `${integration.displayName} health check finished as ${nextStatus}`,
        metadata: {
          provider: integration.provider,
          previousStatus: integration.status,
          nextStatus,
          checkedAt: checkedAt.toISOString(),
        },
      });

      checkedIntegrations.push(toIntegrationSummary(updatedIntegration));
    }

    return {
      checkedAt: checkedAt.toISOString(),
      integrations: checkedIntegrations,
    };
  }
}

type IntegrationEntity = Awaited<
  ReturnType<typeof createIntegrationTypeHelper>
>;

function createIntegrationTypeHelper() {
  const prisma = new PrismaService();
  return prisma.integrationCredential.findFirstOrThrow();
}

function toIntegrationSummary(
  integration: IntegrationEntity,
): IntegrationCredentialSummary {
  return {
    id: integration.id,
    provider: integration.provider,
    displayName: integration.displayName,
    status: integration.status as IntegrationStatus,
    environment: integration.environment,
    scopes: parseStringArray(integration.scopes),
    maskedSecret: integration.maskedSecret,
    lastCheckedAt: integration.lastCheckedAt?.toISOString() ?? null,
    expiresAt: integration.expiresAt?.toISOString() ?? null,
  };
}

function getSimulatedStatus(provider: string): IntegrationStatus {
  if (provider === "crm") {
    return "connected";
  }

  if (provider === "billing") {
    return "degraded";
  }

  return "connected";
}

function parseStringArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
