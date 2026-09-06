import { Body,Controller,Get,Param,ParseUUIDPipe,Patch,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { DirectoryService } from '../common/directory.service';
import { ActivationDto } from '../common/dtos';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('users') @Controller('users')
export class UsersController {
  constructor(private readonly directory:DirectoryService) {}
  @Get() @Permission('user','read') list(@Req() r:AuthenticatedRequest) { return this.directory.users(r.context); }
  @Patch(':id/activation') @Permission('user','activate') activate(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:ActivationDto) { return this.directory.activate(r.context,id,body.active); }
}
