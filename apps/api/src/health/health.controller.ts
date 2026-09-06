import { Controller,Get,ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { database } from '@qms/database';
import { Public } from '../authorization/guards';
@ApiTags('health') @Controller('health')
export class HealthController {
  @Public() @Get() live() { return {status:'ok',service:'qms-api'}; }
  @Public() @Get('ready') async ready() { try { await database.$queryRaw`SELECT 1`; return {status:'ok',database:'ready'}; } catch { throw new ServiceUnavailableException('Database unavailable'); } }
}
