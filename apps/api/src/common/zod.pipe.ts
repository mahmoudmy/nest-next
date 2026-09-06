import { BadRequestException,Injectable,type ArgumentMetadata,type PipeTransform,type Type } from '@nestjs/common';
import { ZodError,type ZodType } from 'zod';
import { LoginDto,ContextDto,ActivationDto,WorkflowDto,StepDto,TransitionDto,StartWorkflowDto,TaskDto,AssignTaskDto,CompleteTaskDto,UploadDto } from './dtos';
const schemas=new Map<Type<unknown>,ZodType>([
  [LoginDto,LoginDto.schema],[ContextDto,ContextDto.schema],[ActivationDto,ActivationDto.schema],[WorkflowDto,WorkflowDto.schema],[StepDto,StepDto.schema],[TransitionDto,TransitionDto.schema],[StartWorkflowDto,StartWorkflowDto.schema],[TaskDto,TaskDto.schema],[AssignTaskDto,AssignTaskDto.schema],[CompleteTaskDto,CompleteTaskDto.schema],[UploadDto,UploadDto.schema]
]);
@Injectable()
export class ZodValidationPipe implements PipeTransform<unknown>{
  transform(value:unknown,metadata:ArgumentMetadata):unknown{
    const schema=metadata.metatype?schemas.get(metadata.metatype):undefined;
    if(!schema)return value;
    try{return schema.parse(value);}catch(error){if(error instanceof ZodError)throw new BadRequestException({statusCode:400,message:'Invalid input',issues:error.issues.map(issue=>({path:issue.path,code:issue.code}))});throw error;}
  }
}
