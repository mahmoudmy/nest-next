import { Module } from '@nestjs/common';
import { WorkflowsController,WorkflowInstancesController } from './workflows.controller';
@Module({controllers:[WorkflowsController,WorkflowInstancesController]}) export class WorkflowsModule {}
