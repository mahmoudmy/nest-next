import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '@qms/types';
import { Prisma } from '@qms/database';
import { ZodError } from 'zod';
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(error:unknown,host:ArgumentsHost) {
    const response=host.switchToHttp().getResponse<Response>();
    if (error instanceof DomainError) { const status={NOT_FOUND:404,FORBIDDEN:403,CONFLICT:409,INVALID:400,UNAUTHENTICATED:401}[error.code]; response.status(status).json({statusCode:status,code:error.code,message:error.message}); return; }
    if (error instanceof ZodError) { response.status(400).json({statusCode:400,message:'Invalid input'}); return; }
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2003','P2034'].includes(error.code)) { response.status(409).json({statusCode:409,message:'Conflicting change'}); return; }
    if (error instanceof HttpException) { response.status(error.getStatus()).json({statusCode:error.getStatus(),message:error.getStatus()===400?'Invalid input':error.message}); return; }
    // Do not serialize database errors, request bodies, cookies, or storage credentials.
    response.status(500).json({statusCode:500,message:'Internal server error'});
  }
}
