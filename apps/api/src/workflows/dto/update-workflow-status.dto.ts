import { IsIn } from "class-validator";
import { workflowStatuses, type WorkflowStatus } from "@flowforge/shared";

export class UpdateWorkflowStatusDto {
  @IsIn(workflowStatuses)
  status!: WorkflowStatus;
}
