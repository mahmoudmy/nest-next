import { Body,Controller,Get,Post,Req,Res,HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { environment } from '@qms/config';
import { AuthService } from './auth.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Public,cookieName } from '../authorization/guards';
import { LoginDto,ContextDto } from '../common/dtos';
import type { AuthenticatedRequest } from '../common/request';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth:AuthService,private readonly authorization:AuthorizationService) {}
  private cookie(response:Response,session:{token:string;expiresAt:Date}) { response.cookie(cookieName(),session.token,{httpOnly:true,secure:environment().NODE_ENV==='production',sameSite:'lax',path:'/',expires:session.expiresAt}); }
  @Public() @Post('login') @HttpCode(200) @Throttle({default:{limit:5,ttl:60000}})
  async login(@Body() input:LoginDto,@Res({passthrough:true}) response:Response) { this.cookie(response,await this.auth.login(input)); return {authenticated:true}; }
  @Get('session')
  current(@Req() request:AuthenticatedRequest) { return this.authorization.permissions(request.context).then(p=>this.auth.current(request.context,p)); }
  @Post('logout') @HttpCode(200)
  async logout(@Req() request:AuthenticatedRequest,@Res({passthrough:true}) response:Response) { await this.auth.logout(request.context); response.clearCookie(cookieName(),{path:'/',httpOnly:true,secure:environment().NODE_ENV==='production',sameSite:'lax'}); return {authenticated:false}; }
  @Post('context') @HttpCode(200)
  async context(@Req() request:AuthenticatedRequest,@Body() input:ContextDto,@Res({passthrough:true}) response:Response) { this.cookie(response,await this.auth.switchContext(request.context,input.membershipId)); return {authenticated:true}; }
}
