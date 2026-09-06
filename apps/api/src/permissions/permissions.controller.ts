import { Controller,Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { DirectoryService } from '../common/directory.service';
@ApiTags('permissions') @Controller('permissions')
export class PermissionsController {
  constructor(private readonly directory:DirectoryService) {}
  @Get() @Permission('permission','read') list() { return this.directory.permissions(); }
}
