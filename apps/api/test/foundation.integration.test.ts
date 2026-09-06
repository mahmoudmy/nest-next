import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { randomUUID,createHash } from 'node:crypto';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { database } from '@qms/database';
import { hashPassword,sessionSecret,foundationPermissions } from '@qms/auth';
import { createApplication } from '../dist/bootstrap';
import { workflowResponseSchema,instanceResponseSchema,taskResponseSchema } from '@qms/contracts';
const origin='http://localhost:3000';
const password='integration-password-837462';
interface Actor {organizationId:string;userId:string;membershipId:string;cookie:string;email:string}
let app:INestApplication;let a:Actor;let b:Actor;let peer:Actor;
async function actor(organizationId?:string):Promise<Actor>{
  const organization=organizationId?await database.organization.findUniqueOrThrow({where:{id:organizationId}}):await database.organization.create({data:{name:`Integration ${randomUUID()}`}});
  const email=`test-${randomUUID()}@example.test`;
  const user=await database.user.create({data:{email,name:'Integration User',passwordHash:await hashPassword(password)}});
  const membership=await database.membership.create({data:{userId:user.id,organizationId:organization.id}});
  const role=await database.role.create({data:{organizationId:organization.id,key:randomUUID(),name:'Integration Administrator'}});
  for(const [resource,actions] of Object.entries(foundationPermissions))for(const action of actions){const p=await database.permission.upsert({where:{resource_action:{resource,action}},create:{resource,action},update:{}});await database.rolePermission.create({data:{roleId:role.id,permissionId:p.id}});}
  await database.membershipRole.create({data:{membershipId:membership.id,roleId:role.id,organizationId:organization.id}});
  const secret=sessionSecret();await database.session.create({data:{userId:user.id,membershipId:membership.id,tokenHash:secret.hash,expiresAt:new Date(Date.now()+3600000)}});
  return {organizationId:organization.id,userId:user.id,membershipId:membership.id,email,cookie:`qms_session=${secret.token}`};
}
const api=()=>request(app.getHttpServer());
const target=(who:Actor)=>({targetType:'PLATFORM_SANDBOX',targetId:who.organizationId});
async function action(who=a){const response=await api().post('/api/tasks').set('Origin',origin).set('Cookie',who.cookie).send({...target(who),title:'Independent test action',assignedToUserId:who.userId});expect(response.status).toBe(201);return taskResponseSchema.parse(response.body);}
async function definition(){
  const create=await api().post('/api/workflows').set('Origin',origin).set('Cookie',a.cookie).send({name:'Infrastructure test graph',resourceType:'PLATFORM_SANDBOX'});expect(create.status).toBe(201);const workflow=workflowResponseSchema.parse(create.body);
  const versionResponse=await api().post(`/api/workflows/${workflow.id}/versions`).set('Origin',origin).set('Cookie',a.cookie).send({});expect(versionResponse.status).toBe(201);const version=versionResponse.body as {id:string;number:number};
  const stepIds:string[]=[];
  for(const [index,key] of ['first','last'].entries()){const res=await api().post(`/api/workflows/versions/${version.id}/steps`).set('Origin',origin).set('Cookie',a.cookie).send({key,name:key,initial:index===0,terminal:index===1,configuration:{assignment:{strategy:'USER',userId:a.userId}}});expect(res.status).toBe(201);stepIds.push((res.body as {id:string}).id);}
  await api().post(`/api/workflows/versions/${version.id}/transitions`).set('Origin',origin).set('Cookie',a.cookie).send({fromStepId:stepIds[0],toStepId:stepIds[1],outcome:'complete'}).expect(201);
  await api().post(`/api/workflows/versions/${version.id}/publish`).set('Origin',origin).set('Cookie',a.cookie).send({}).expect(201);
  return {workflow,version,stepIds};
}
beforeAll(async()=>{if(process.env.QMS_INTEGRATION_TESTS!=='1'||process.env.NODE_ENV==='production')throw new Error('Use a disposable database and set QMS_INTEGRATION_TESTS=1');app=await createApplication();await app.init();a=await actor();b=await actor();peer=await actor(a.organizationId);},60000);
afterAll(async()=>{await app?.close();await database.$disconnect();});
describe('real HTTP authentication and authorization',()=>{
  it('requires authentication and rejects forged tenant fields',async()=>{await api().get('/api/tasks').expect(401);await api().post('/api/tasks').set('Origin',origin).set('Cookie',a.cookie).send({...target(a),title:'Forged',assignedToUserId:a.userId,organizationId:b.organizationId}).expect(400);});
  it('requires the configured Origin on writes including login',async()=>{await api().post('/api/auth/login').send({email:a.email,password}).expect(403);await api().post('/api/auth/login').set('Origin','https://attacker.example').send({email:a.email,password}).expect(403);});
  it('issues HTTP-only session cookies, exposes current identity, and revokes on logout',async()=>{const login=await api().post('/api/auth/login').set('Origin',origin).send({email:a.email,password}).expect(200);const cookies=login.headers['set-cookie'] as unknown as string[];const cookie=cookies[0]!;expect(cookie).toContain('HttpOnly');expect(cookie).toContain('SameSite=Lax');expect(cookie).not.toContain('Domain=');await api().get('/api/auth/session').set('Cookie',cookie.split(';')[0]!).expect(200);await api().post('/api/auth/logout').set('Origin',origin).set('Cookie',cookie.split(';')[0]!).send({}).expect(200);await api().get('/api/auth/session').set('Cookie',cookie.split(';')[0]!).expect(401);});
  it('rejects expired sessions and foreign context selection',async()=>{const secret=sessionSecret();await database.session.create({data:{userId:a.userId,membershipId:a.membershipId,tokenHash:secret.hash,expiresAt:new Date(Date.now()-1000)}});await api().get('/api/auth/session').set('Cookie',`qms_session=${secret.token}`).expect(401);await api().post('/api/auth/context').set('Origin',origin).set('Cookie',a.cookie).send({membershipId:b.membershipId}).expect(403);});
  it('enforces Casbin permissions and records denied access',async()=>{const member=await database.membership.findUniqueOrThrow({where:{id:peer.membershipId},include:{roles:true}});await database.membershipRole.deleteMany({where:{membershipId:peer.membershipId}});await api().get('/api/tasks').set('Cookie',peer.cookie).expect(403);expect(await database.auditLog.count({where:{organizationId:a.organizationId,actorId:peer.userId,action:'PERMISSION_DENIED'}})).toBeGreaterThan(0);for(const role of member.roles)await database.membershipRole.create({data:role});});
  it('revokes sessions on account deactivation and allows explicit reactivation',async()=>{await api().patch(`/api/users/${peer.userId}/activation`).set('Origin',origin).set('Cookie',a.cookie).send({active:false}).expect(200);await api().get('/api/auth/session').set('Cookie',peer.cookie).expect(401);await api().patch(`/api/users/${peer.userId}/activation`).set('Origin',origin).set('Cookie',a.cookie).send({active:true}).expect(200);const secret=sessionSecret();await database.session.create({data:{userId:peer.userId,membershipId:peer.membershipId,tokenHash:secret.hash,expiresAt:new Date(Date.now()+3600000)}});peer.cookie=`qms_session=${secret.token}`;});
});
describe('tenant isolation and action tasks',()=>{
  it('organization B cannot read, complete or assign organization A tasks',async()=>{const task=await action();await api().get(`/api/tasks/${task.id}`).set('Cookie',b.cookie).expect(404);await api().post(`/api/tasks/${task.id}/complete`).set('Origin',origin).set('Cookie',b.cookie).send({outcome:'complete'}).expect(404);await api().post(`/api/tasks/${task.id}/assign`).set('Origin',origin).set('Cookie',b.cookie).send({assignedToUserId:b.userId}).expect(404);const rows=await api().get('/api/tasks').set('Cookie',b.cookie).expect(200);expect(taskResponseSchema.array().parse(rows.body).some(t=>t.id===task.id)).toBe(false);});
  it('validates assignees, registered targets, and resource relationships',async()=>{await api().post('/api/tasks').set('Origin',origin).set('Cookie',a.cookie).send({...target(a),title:'Foreign assignee',assignedToUserId:b.userId}).expect(400);await api().post('/api/tasks').set('Origin',origin).set('Cookie',a.cookie).send({...target(b),title:'Foreign target',assignedToUserId:a.userId}).expect(404);await api().post('/api/tasks').set('Origin',origin).set('Cookie',a.cookie).send({targetType:'UNREGISTERED',targetId:a.organizationId,title:'Unknown type',assignedToUserId:a.userId}).expect(400);});
  it('completes ACTION independently, records actor/time, and refuses reopening or another actor',async()=>{const task=await action();await api().post(`/api/tasks/${task.id}/complete`).set('Origin',origin).set('Cookie',peer.cookie).send({outcome:'complete'}).expect(403);const result=await api().post(`/api/tasks/${task.id}/complete`).set('Origin',origin).set('Cookie',a.cookie).send({outcome:'complete'}).expect(201);const done=taskResponseSchema.parse(result.body);expect(done.completedById).toBe(a.userId);expect(done.completedAt).toBeTruthy();expect(done.workflowInstanceId).toBeNull();await api().post(`/api/tasks/${task.id}/start`).set('Origin',origin).set('Cookie',a.cookie).send({}).expect(409);});
  it('keeps site memberships out of organization-wide and sibling-site resources',async()=>{const site=await database.site.create({data:{organizationId:a.organizationId,name:randomUUID()}});const sibling=await database.site.create({data:{organizationId:a.organizationId,name:randomUUID()}});const m=await database.membership.create({data:{userId:peer.userId,organizationId:a.organizationId,siteId:site.id}});const role=await database.role.findFirstOrThrow({where:{organizationId:a.organizationId}});await database.membershipRole.create({data:{membershipId:m.id,roleId:role.id,organizationId:a.organizationId}});const secret=sessionSecret();await database.session.create({data:{userId:peer.userId,membershipId:m.id,tokenHash:secret.hash,expiresAt:new Date(Date.now()+3600000)}});const cookie=`qms_session=${secret.token}`;const task=await action();await api().get(`/api/tasks/${task.id}`).set('Cookie',cookie).expect(404);const rows=await api().get('/api/sites').set('Cookie',cookie).expect(200);expect((rows.body as Array<{id:string}>).map(s=>s.id)).toEqual([site.id]);expect((rows.body as Array<{id:string}>).some(s=>s.id===sibling.id)).toBe(false);});
});
describe('workflow/task atomic integration',()=>{
  it('pins instances to published versions, prevents mutation in SQL and HTTP, and completes deterministically',async()=>{
    const {workflow,version,stepIds}=await definition();
    const start=await api().post('/api/workflow-instances').set('Origin',origin).set('Cookie',a.cookie).send({...target(a),workflowId:workflow.id}).expect(201);const instance=instanceResponseSchema.parse(start.body);
    await api().get(`/api/workflows/${workflow.id}`).set('Cookie',b.cookie).expect(404);await api().get(`/api/workflow-instances/${instance.id}`).set('Cookie',b.cookie).expect(404);
    await api().post(`/api/workflows/versions/${version.id}/steps`).set('Origin',origin).set('Cookie',a.cookie).send({key:'illegal',name:'Illegal',configuration:{assignment:{strategy:'USER',userId:a.userId}}}).expect(409);
    await expect(database.workflowStep.update({where:{id:stepIds[0]},data:{name:'Tampered'}})).rejects.toThrow();
    const v2=await api().post(`/api/workflows/${workflow.id}/versions`).set('Origin',origin).set('Cookie',a.cookie).send({}).expect(201);const version2=v2.body as {id:string};
    await api().post(`/api/workflows/versions/${version2.id}/steps`).set('Origin',origin).set('Cookie',a.cookie).send({key:'new',name:'New version step',initial:true,terminal:true,configuration:{assignment:{strategy:'USER',userId:a.userId}}}).expect(201);
    await api().post(`/api/workflows/versions/${version2.id}/publish`).set('Origin',origin).set('Cookie',a.cookie).send({}).expect(201);
    let tasks=await database.task.findMany({where:{workflowInstanceId:instance.id,status:'PENDING'}});expect(tasks).toHaveLength(1);const first=tasks[0]!;
    await api().post(`/api/tasks/${first.id}/complete`).set('Origin',origin).set('Cookie',a.cookie).send({outcome:'invalid'}).expect(400);expect((await database.task.findUniqueOrThrow({where:{id:first.id}})).status).toBe('PENDING');
    await api().post(`/api/tasks/${first.id}/complete`).set('Origin',origin).set('Cookie',a.cookie).send({outcome:'complete'}).expect(201);
    tasks=await database.task.findMany({where:{workflowInstanceId:instance.id,status:'PENDING'}});expect(tasks).toHaveLength(1);expect(tasks[0]!.workflowInstanceStepId).not.toBe(first.workflowInstanceStepId);
    const responses=await Promise.all([1,2].map(()=>api().post(`/api/tasks/${tasks[0]!.id}/complete`).set('Origin',origin).set('Cookie',a.cookie).send({outcome:'complete'})));expect(responses.map(r=>r.status).sort()).toEqual([201,409]);
    const final=await database.workflowInstance.findUniqueOrThrow({where:{id:instance.id},include:{steps:true}});expect(final.status).toBe('COMPLETED');expect(final.workflowVersionId).toBe(version.id);expect(final.steps.every(s=>s.status==='COMPLETED')).toBe(true);
    expect(await database.auditLog.count({where:{resourceId:instance.id,action:'WORKFLOW_COMPLETED'}})).toBe(1);
    await expect(database.workflowInstance.update({where:{id:instance.id},data:{workflowVersionId:version2.id}})).rejects.toThrow();
  });
  it('cancels pending workflow tasks with the instance instead of stranding execution',async()=>{const {workflow}=await definition();const res=await api().post('/api/workflow-instances').set('Origin',origin).set('Cookie',a.cookie).send({...target(a),workflowId:workflow.id}).expect(201);const instance=instanceResponseSchema.parse(res.body);await api().post(`/api/workflow-instances/${instance.id}/cancel`).set('Origin',origin).set('Cookie',a.cookie).send({}).expect(201);const tasks=await database.task.findMany({where:{workflowInstanceId:instance.id}});expect(tasks.every(t=>t.status==='CANCELLED')).toBe(true);await api().post(`/api/tasks/${tasks[0]!.id}/complete`).set('Origin',origin).set('Cookie',a.cookie).send({outcome:'complete'}).expect(409);});
});
describe('private S3 file infrastructure',()=>{
  it('uploads directly, verifies checksum, prevents overwrite, and denies cross-tenant download',async()=>{
    const body=Buffer.from('Infrastructure integration payload');const checksum=createHash('sha256').update(body).digest('base64');
    const upload=await api().post('/api/files/upload-url').set('Origin',origin).set('Cookie',a.cookie).send({...target(a),originalFilename:'sample.txt',contentType:'text/plain',size:body.length,checksum}).expect(201);
    const signed=upload.body as {id:string;url:string;headers:Record<string,string>};
    await api().get(`/api/files/${signed.id}/download`).set('Cookie',a.cookie).expect(409);
    const put=await fetch(signed.url,{method:'PUT',headers:signed.headers,body});expect(put.status).toBe(200);
    const replay=await fetch(signed.url,{method:'PUT',headers:signed.headers,body});expect(replay.ok).toBe(false);
    await api().post(`/api/files/${signed.id}/finalize`).set('Origin',origin).set('Cookie',b.cookie).send({}).expect(404);
    await api().post(`/api/files/${signed.id}/finalize`).set('Origin',origin).set('Cookie',a.cookie).send({}).expect(201);
    await api().get(`/api/files/${signed.id}/download`).set('Cookie',b.cookie).expect(404);
    const download=await api().get(`/api/files/${signed.id}/download`).set('Cookie',a.cookie).expect(200);const url=(download.body as {url:string}).url;
    const fetched=await fetch(url);expect(fetched.ok).toBe(true);expect(await fetched.text()).toBe(body.toString());
    const object=await database.fileObject.findUniqueOrThrow({where:{id:signed.id}});const anonymous=await fetch(`${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${object.objectKey}`);expect(anonymous.status).toBe(403);
    expect(await database.auditLog.count({where:{resourceId:signed.id,action:'FILE_UPLOADED'}})).toBe(1);
  });
});
