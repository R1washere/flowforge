import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { ExecutionsModule } from "./executions/executions.module";
import { HealthModule } from "./health/health.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { TeamModule } from "./team/team.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { WorkflowsModule } from "./workflows/workflows.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AuditModule,
    IntegrationsModule,
    WorkflowsModule,
    ExecutionsModule,
    WebhooksModule,
    SchedulesModule,
    TeamModule,
  ],
})
export class AppModule {}
