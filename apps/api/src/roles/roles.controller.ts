import { Controller,Get,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { DirectoryService } from '../common/directory.service';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('roles') @Controller('roles')
export class RolesController {
  constructor(private readonly directory:DirectoryService) {}
  @Get() @Permission('role','read') list(@Req() r:AuthenticatedRequest) { return this.directory.roles(r.context); }
}
