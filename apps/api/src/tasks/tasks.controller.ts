import { Body,Controller,Get,Param,ParseUUIDPipe,Post,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { PlatformApplication } from '../common/platform';
import { TaskDto,AssignTaskDto,CompleteTaskDto } from '../common/dtos';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('tasks') @Controller('tasks')
export class TasksController {
  constructor(private readonly app:PlatformApplication) {}
  @Get() @Permission('task','read') list(@Req() r:AuthenticatedRequest) { return this.app.tasks(r.context); }
  @Get(':id') @Permission('task','read') get(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.task(r.context,id); }
  @Post() @Permission('task','create') create(@Req() r:AuthenticatedRequest,@Body() body:TaskDto) { return this.app.createTask(r.context,body); }
  @Post(':id/assign') @Permission('task','assign') assign(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:AssignTaskDto) { return this.app.assignTask(r.context,id,body.assignedToUserId); }
  @Post(':id/start') @Permission('task','start') start(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.startTask(r.context,id); }
  @Post(':id/complete') @Permission('task','complete') complete(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:CompleteTaskDto) { return this.app.completeTask(r.context,id,body.outcome); }
  @Post(':id/cancel') @Permission('task','cancel') cancel(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.app.cancelTask(r.context,id); }
}
