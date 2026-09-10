import { Module } from "@nestjs/common";
import { ExecutionsModule } from "../executions/executions.module";
import { WebhooksController } from "./webhooks.controller";

@Module({
  imports: [ExecutionsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
