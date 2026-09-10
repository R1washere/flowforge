import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  stepTypes,
  triggerTypes,
  workflowStatuses,
  type StepType,
  type TriggerType,
  type WorkflowStatus,
} from "@flowforge/shared";

export class CreateWorkflowStepDto {
  @IsIn(stepTypes)
  type!: StepType;

  @IsString()
  name!: string;

  @IsObject()
  config!: Record<string, unknown>;
}

export class CreateWorkflowDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  description!: string;

  @IsIn(workflowStatuses)
  status!: WorkflowStatus;

  @IsIn(triggerTypes)
  triggerType!: TriggerType;

  @IsInt()
  @Min(0)
  @Max(10)
  retryLimit!: number;

  @IsInt()
  @Min(5)
  @Max(3600)
  timeoutSeconds!: number;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps!: CreateWorkflowStepDto[];
}
