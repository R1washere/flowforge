import { IsObject, IsOptional } from "class-validator";

export class ExecuteWorkflowDto {
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
