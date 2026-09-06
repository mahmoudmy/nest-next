import { Body,Controller,Delete,Get,Param,ParseUUIDPipe,Post,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { PlatformApplication } from '../common/platform';
import { WorkflowDto,StepDto,TransitionDto,StartWorkflowDto } from '../common/dtos';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('workflows') @Controller('workflows')
export class WorkflowsController {
  constructor(private readonly app:PlatformApplication) {}
  @Get() @Permission('workflow','read') list(@Req() r:AuthenticatedRequest) { return this.app.workflows(r.context); }
  @Get(':id') @Permission('workflow','read') get(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.workflow(r.context,id); }
  @Post() @Permission('workflow','create') create(@Req() r:AuthenticatedRequest,@Body() body:WorkflowDto) { return this.app.createWorkflow(r.context,body); }
  @Delete(':id') @Permission('workflow','delete') archive(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.archiveWorkflow(r.context,id); }
  @Post(':id/versions') @Permission('workflow','update') version(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.version(r.context,id); }
  @Post('versions/:id/steps') @Permission('workflow','update') step(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:StepDto) { return this.app.step(r.context,id,body); }
  @Post('versions/:id/transitions') @Permission('workflow','update') transition(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:TransitionDto) { return this.app.transition(r.context,id,body); }
  @Post('versions/:id/publish') @Permission('workflow','publish') publish(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.publish(r.context,id); }
}
@ApiTags('workflow-instances') @Controller('workflow-instances')
export class WorkflowInstancesController {
  constructor(private readonly app:PlatformApplication) {}
  @Get() @Permission('workflow-instance','read') list(@Req() r:AuthenticatedRequest) { return this.app.instances(r.context); }
  @Post() @Permission('workflow-instance','start') start(@Req() r:AuthenticatedRequest,@Body() body:StartWorkflowDto) { return this.app.startWorkflow(r.context,body); }
  @Get(':id') @Permission('workflow-instance','read') get(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.instance(r.context,id); }
  @Get(':id/steps/current') @Permission('workflow-instance','read') current(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.currentSteps(r.context,id); }
  @Post(':id/cancel') @Permission('workflow-instance','cancel') cancel(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.cancelWorkflow(r.context,id); }
  @Post(':id/reject') @Permission('workflow-instance','cancel') reject(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.cancelWorkflow(r.context,id,true); }
}
