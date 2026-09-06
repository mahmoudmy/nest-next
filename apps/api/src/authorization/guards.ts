import { Injectable,SetMetadata,type CanActivate,type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { environment } from '@qms/config';
import { DomainError } from '@qms/types';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedRequest } from '../common/request';
import { AuthorizationService } from './authorization.service';
export const Public=()=>SetMetadata('public',true);
export const Permission=(resource:string,action:string)=>SetMetadata('permission',{resource,action});
export const cookieName=()=>environment().NODE_ENV==='production'?'__Host-qms_session':'qms_session';
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector:Reflector,private readonly auth:AuthService) {}
  async canActivate(execution:ExecutionContext) {
    const request=execution.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!['GET','HEAD','OPTIONS'].includes(request.method) && request.headers.origin!==environment().APP_ORIGIN) throw new DomainError('FORBIDDEN','Untrusted request origin');
    if (this.reflector.getAllAndOverride<boolean>('public',[execution.getHandler(),execution.getClass()])) return true;
    const cookies=request.cookies as Record<string,unknown>|undefined;
    request.context=await this.auth.authenticate(cookies?.[cookieName()]); return true;
  }
}
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector:Reflector,private readonly authorization:AuthorizationService) {}
  async canActivate(execution:ExecutionContext) {
    const permission=this.reflector.getAllAndOverride<{resource:string;action:string}>('permission',[execution.getHandler(),execution.getClass()]);
    if (permission) await this.authorization.require(execution.switchToHttp().getRequest<AuthenticatedRequest>().context,permission.resource,permission.action);
    return true;
  }
}
