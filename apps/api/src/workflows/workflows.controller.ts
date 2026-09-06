import { Body,Controller,Delete,Get,Param,ParseUUIDPipe,Post,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { PlatformApplication } from '../common/platform';
import { WorkflowDto,StepDto,TransitionDto,StartWorkflowDto } from '../common/dtos';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('workflows') @Controller('workflows')
export class WorkflowsController {
  constructor(private readonly app:PlatformApplication) {}
  @Get() @Permission('workflow','read') list(@Req() r:AuthenticatedRequest):ReturnType<PlatformApplication['workflows']>{return this.app.workflows(r.context);}
  @Get(':id') @Permission('workflow','read') get(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string):ReturnType<PlatformApplication['workflow']>{return this.app.workflow(r.context,id);}
  @Post() @Permission('workflow','create') create(@Req() r:AuthenticatedRequest,@Body() body:WorkflowDto):ReturnType<PlatformApplication['createWorkflow']>{return this.app.createWorkflow(r.context,body);}
  @Delete(':id') @Permission('workflow','delete') archive(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string):ReturnType<PlatformApplication['archiveWorkflow']>{return this.app.archiveWorkflow(r.context,id);}
  @Post(':id/versions') @Permission('workflow','update') version(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string):ReturnType<PlatformApplication['version']>{return this.app.version(r.context,id);}
  @Post('versions/:id/steps') @Permission('workflow','update') step(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:StepDto):ReturnType<PlatformApplication['step']>{return this.app.step(r.context,id,body);}
  @Post('versions/:id/transitions') @Permission('workflow','update') transition(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:TransitionDto):ReturnType<PlatformApplication['transition']>{return this.app.transition(r.context,id,body);}
  @Post('versions/:id/publish') @Permission('workflow','publish') publish(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string):ReturnType<PlatformApplication['publish']>{return this.app.publish(r.context,id);}
}
@ApiTags('workflow-instances') @Controller('workflow-instances')
export class WorkflowInstancesController {
  constructor(private readonly app:PlatformApplication) {}
  @Get() @Permission('workflow-instance','read') list(@Req() r:AuthenticatedRequest):ReturnType<PlatformApplication['instances']>{return this.app.instances(r.context);}
  @Post() @Permission('workflow-instance','start') start(@Req() r:AuthenticatedRequest,@Body() body:StartWorkflowDto):ReturnType<PlatformApplication['startWorkflow']>{return this.app.startWorkflow(r.context,body);}
  @Get(':id') @Permission('workflow-instance','read') get(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string):ReturnType<PlatformApplication['instance']>{return this.app.instance(r.context,id);}
  @Get(':id/steps/current') @Permission('workflow-instance','read') current(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string):ReturnType<PlatformApplication['currentSteps']>{return this.app.currentSteps(r.context,id);}
  @Post(':id/cancel') @Permission('workflow-instance','cancel') cancel(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string):ReturnType<PlatformApplication['cancelWorkflow']>{return this.app.cancelWorkflow(r.context,id);}
  @Post(':id/reject') @Permission('workflow-instance','cancel') reject(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string):ReturnType<PlatformApplication['cancelWorkflow']>{return this.app.cancelWorkflow(r.context,id,true);}
}
