import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FileRepository } from './file.repository';
import { FileService } from './file.service';
@Module({controllers:[FilesController],providers:[FileRepository,FileService]}) export class FilesModule {}
