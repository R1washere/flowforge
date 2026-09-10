import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { ExecutionEngineService } from "./execution-engine.service";
import { ExecutionsController } from "./executions.controller";
import { ExecutionsService } from "./executions.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [ExecutionsController],
  providers: [ExecutionEngineService, ExecutionsService],
  exports: [ExecutionEngineService],
})
export class ExecutionsModule {}
