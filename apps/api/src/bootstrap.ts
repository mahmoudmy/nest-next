import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule,DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json } from 'express';
import { environment } from '@qms/config';
import { database } from '@qms/database';
import { AppModule } from './app.module';
import { SafeExceptionFilter } from './common/errors';
import { ZodValidationPipe } from './common/zod.pipe';
export async function createApplication(){
  const env=environment();
  const app=await NestFactory.create(AppModule,{bodyParser:false,logger:['error','warn']});
  app.setGlobalPrefix('api');
  app.use(helmet());app.use(json({limit:'256kb'}));app.use(cookieParser());
  app.use((_req:unknown,res:{setHeader:(key:string,value:string)=>void},next:()=>void)=>{res.setHeader('Cache-Control','no-store');next();});
  app.enableCors({origin:env.APP_ORIGIN,credentials:true,methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type']});
  app.useGlobalPipes(new ZodValidationPipe());app.useGlobalFilters(new SafeExceptionFilter());app.enableShutdownHooks();
  const config=new DocumentBuilder().setTitle('QMS Platform Kernel').setDescription('Infrastructure APIs only. Browser writes require the configured Origin header. Use the Next.js proxy for cookie authentication.').setVersion('0.1.0').addCookieAuth(env.NODE_ENV==='production'?'__Host-qms_session':'qms_session').build();
  const document=SwaggerModule.createDocument(app,config);
  if(env.NODE_ENV!=='production')SwaggerModule.setup('api/docs',app,document,{jsonDocumentUrl:'api/openapi.json',swaggerOptions:{withCredentials:true}});
  await database.$connect();return app;
}
