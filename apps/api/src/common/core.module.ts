import { Global,Module } from '@nestjs/common';
import { AuthRepository } from '../auth/auth.repository';
import { AuthService,LocalIdentityProvider } from '../auth/auth.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { DirectoryService } from './directory.service';
import { PlatformApplication } from './platform';
const providers=[AuthRepository,LocalIdentityProvider,AuthService,AuthorizationService,AuditLogService,DirectoryService,PlatformApplication];
@Global() @Module({providers,exports:providers})
export class CoreModule {}
