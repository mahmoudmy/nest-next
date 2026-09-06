import { Controller,Get,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { DirectoryService } from '../common/directory.service';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('sites') @Controller('sites')
export class SitesController {
  constructor(private readonly directory:DirectoryService) {}
  @Get() @Permission('site','read') list(@Req() r:AuthenticatedRequest) { return this.directory.sites(r.context); }
}
