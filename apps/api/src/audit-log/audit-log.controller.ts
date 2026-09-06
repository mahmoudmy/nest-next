import { Controller,Get,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { AuditLogService } from './audit-log.service';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('audit-logs') @Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly audit:AuditLogService) {}
  @Get() @Permission('audit-log','read') list(@Req() r:AuthenticatedRequest):ReturnType<AuditLogService['list']>{return this.audit.list(r.context);}
}
