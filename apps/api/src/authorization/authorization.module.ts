import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SessionGuard,AuthorizationGuard } from './guards';
@Module({providers:[{provide:APP_GUARD,useClass:SessionGuard},{provide:APP_GUARD,useClass:AuthorizationGuard}]}) export class AuthorizationModule {}
