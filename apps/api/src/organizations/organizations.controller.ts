import { Controller,Get,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { DirectoryService } from '../common/directory.service';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('organizations') @Controller('organizations')
export class OrganizationsController {
  constructor(private readonly directory:DirectoryService) {}
  @Get() @Permission('organization','read') list(@Req() r:AuthenticatedRequest) { return this.directory.organizations(r.context); }
}
