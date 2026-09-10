import { Injectable } from "@nestjs/common";
import type { AuditEventSummary } from "@flowforge/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditEvents(organizationId: string): Promise<AuditEventSummary[]> {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        organizationId,
      },
      include: {
        actor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
    });

    return events.map((event) => ({
      id: event.id,
      actorName: event.actor?.name ?? null,
      actorEmail: event.actor?.email ?? null,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      summary: event.summary,
      metadata: parseJsonObject(event.metadata),
      createdAt: event.createdAt.toISOString(),
    }));
  }

  async recordEvent(input: {
    organizationId: string;
    actorId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    summary: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        summary: input.summary,
        metadata: JSON.stringify(input.metadata ?? {}),
      },
    });
  }
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
