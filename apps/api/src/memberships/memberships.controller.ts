import { Controller,Get,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { DirectoryService } from '../common/directory.service';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('memberships') @Controller('memberships')
export class MembershipsController {
  constructor(private readonly directory:DirectoryService) {}
  @Get() @Permission('membership','read') list(@Req() r:AuthenticatedRequest) { return this.directory.memberships(r.context); }
}
