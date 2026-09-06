import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule,ThrottlerGuard } from '@nestjs/throttler';
import { CoreModule } from './common/core.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SitesModule } from './sites/sites.module';
import { MembershipsModule } from './memberships/memberships.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { FilesModule } from './files/files.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { HealthModule } from './health/health.module';
@Module({imports:[CoreModule,ThrottlerModule.forRoot([{ttl:60000,limit:120}]),AuthorizationModule,AuthModule,UsersModule,OrganizationsModule,SitesModule,MembershipsModule,RolesModule,PermissionsModule,WorkflowsModule,TasksModule,FilesModule,AuditLogModule,HealthModule],providers:[{provide:APP_GUARD,useClass:ThrottlerGuard}]})
export class AppModule {}
