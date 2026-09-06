import { loginSchema,contextSchema,activationSchema,workflowSchema,stepSchema,transitionSchema,startWorkflowSchema,taskSchema,assignTaskSchema,completeTaskSchema,uploadSchema } from '@qms/contracts';
import type { z } from 'zod';
export class LoginDto { email!: string; password!: string; static readonly schema=loginSchema; }
export class ContextDto { membershipId!: string; static readonly schema=contextSchema; }
export class ActivationDto { active!: boolean; static readonly schema=activationSchema; }
export class WorkflowDto { name!: string; description?: string; resourceType!: string; static readonly schema=workflowSchema; }
export class StepDto { key!: string; name!: string; type!: 'USER_TASK'; configuration!: z.infer<typeof stepSchema>['configuration']; position?: number; initial?: boolean; terminal?: boolean; static readonly schema=stepSchema; }
export class TransitionDto { fromStepId!: string; toStepId!: string; outcome?: string; static readonly schema=transitionSchema; }
export class StartWorkflowDto { workflowId!: string; targetType!: string; targetId!: string; static readonly schema=startWorkflowSchema; }
export class TaskDto { targetType!: string; targetId!: string; title!: string; description?: string; assignedToUserId!: string; dueAt?: string; static readonly schema=taskSchema; }
export class AssignTaskDto { assignedToUserId!: string; static readonly schema=assignTaskSchema; }
export class CompleteTaskDto { outcome?: string; static readonly schema=completeTaskSchema; }
export class UploadDto { targetType!: string; targetId!: string; originalFilename!: string; contentType!: string; size!: number; checksum!: string; static readonly schema=uploadSchema; }
