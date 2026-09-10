import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { ExecutionEngineService } from "../executions/execution-engine.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly executionEngine: ExecutionEngineService) {}

  @Post(":publicPath")
  executeWebhook(
    @Param("publicPath") publicPath: string,
    @Body() body: Record<string, unknown>,
    @Headers("x-flowforge-secret") secret?: string,
  ) {
    return this.executionEngine.executeByWebhook(
      publicPath,
      body ?? {},
      secret,
    );
  }
}
