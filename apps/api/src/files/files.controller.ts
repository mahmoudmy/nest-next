import { Body,Controller,Get,Param,ParseUUIDPipe,Post,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../authorization/guards';
import { UploadDto } from '../common/dtos';
import type { AuthenticatedRequest } from '../common/request';
import { FileService } from './file.service';
@ApiTags('files') @Controller('files')
export class FilesController {
  constructor(private readonly files:FileService) {}
  @Post('upload-url') @Permission('file','upload') upload(@Req() r:AuthenticatedRequest,@Body() input:UploadDto) { return this.files.upload(r.context,input); }
  @Post(':id/finalize') @Permission('file','upload') finalize(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.files.finalize(r.context,id); }
  @Get(':id/download') @Permission('file','download') download(@Req() r:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string) { return this.files.download(r.context,id); }
}
