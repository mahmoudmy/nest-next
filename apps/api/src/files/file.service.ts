import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { S3Client,PutObjectCommand,GetObjectCommand,HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { database,atomic } from '@qms/database';
import { audit } from '@qms/database/dist/audit';
import { environment } from '@qms/config';
import { DomainError,type TenantContext } from '@qms/types';
import type { UploadInput } from '@qms/contracts';
import { resourceRegistry } from '../common/platform';
import { FileRepository } from './file.repository';
@Injectable()
export class FileService {
  private readonly env=environment();
  private readonly s3=new S3Client({region:this.env.S3_REGION,endpoint:this.env.S3_ENDPOINT,forcePathStyle:Boolean(this.env.S3_ENDPOINT),credentials:{accessKeyId:this.env.S3_ACCESS_KEY_ID,secretAccessKey:this.env.S3_SECRET_ACCESS_KEY}});
  constructor(private readonly repository:FileRepository) {}
  async upload(ctx:TenantContext,input:UploadInput) {
    const resource=await resourceRegistry.resolve(database,ctx,input,'file');
    const id=randomUUID(); const objectKey=`${resource.organizationId}/${resource.siteId ?? 'organization'}/${id}`;
    const headers={'Content-Type':input.contentType,'x-amz-checksum-sha256':input.checksum,'If-None-Match':'*'};
    const url=await getSignedUrl(this.s3,new PutObjectCommand({Bucket:this.env.S3_BUCKET,Key:objectKey,ContentType:input.contentType,ContentLength:input.size,ChecksumSHA256:input.checksum,IfNoneMatch:'*'}),{expiresIn:120,signableHeaders:new Set(['content-type','content-length','if-none-match']),unhoistableHeaders:new Set(['x-amz-checksum-sha256'])});
    await atomic(async tx=>{ await tx.fileObject.create({data:{id,...resource,...input,objectKey,uploadedBy:ctx.userId}}); await audit(tx,{...ctx,siteId:resource.siteId},'FILE_UPLOAD_REQUESTED','file',id); });
    return {id,url,method:'PUT',headers,expiresIn:120};
  }
  async finalize(ctx:TenantContext,id:string) {
    const file=await this.repository.get(ctx,id); await resourceRegistry.resolve(database,ctx,file,'file');
    if (file.status!=='PENDING') throw new DomainError('CONFLICT','File is not pending');
    const head=await this.s3.send(new HeadObjectCommand({Bucket:this.env.S3_BUCKET,Key:file.objectKey,ChecksumMode:'ENABLED'}));
    const valid=head.ContentLength===file.size && head.ContentType===file.contentType && head.ChecksumSHA256===file.checksum;
    await atomic(async tx=>{
      const changed=await tx.fileObject.updateMany({where:{id,organizationId:ctx.organizationId,status:'PENDING'},data:{status:valid?'AVAILABLE':'REJECTED'}});
      if (changed.count!==1) throw new DomainError('CONFLICT','File already finalized');
      await audit(tx,{...ctx,siteId:file.siteId},valid?'FILE_UPLOADED':'FILE_UPLOAD_REJECTED','file',id,valid?'SUCCESS':'DENIED');
    });
    if (!valid) throw new DomainError('INVALID','Stored object does not match declared size, type or checksum');
    return {id,status:'AVAILABLE'};
  }
  async download(ctx:TenantContext,id:string) {
    const file=await this.repository.get(ctx,id); await resourceRegistry.resolve(database,ctx,file,'file');
    if (file.status!=='AVAILABLE') throw new DomainError('CONFLICT','File is not available');
    const disposition=`attachment; filename*=UTF-8''${encodeURIComponent(file.originalFilename)}`;
    const url=await getSignedUrl(this.s3,new GetObjectCommand({Bucket:this.env.S3_BUCKET,Key:file.objectKey,ResponseContentDisposition:disposition,ResponseContentType:'application/octet-stream'}),{expiresIn:60});
    // This event records authorized URL issuance, not proof of a completed object-store transfer.
    await audit(database,{...ctx,siteId:file.siteId},'FILE_DOWNLOADED','file',id); return {url,expiresIn:60};
  }
}
