import 'dotenv/config';
import { database,atomic } from '../src/index';
import { hashPassword,foundationPermissions } from '../../auth/src/index';
import { workflowEngine,taskEngine } from '../../../apps/api/dist/common/platform';
import type { TenantContext } from '../../types/src/index';
const ORG='11111111-1111-4111-8111-111111111111';
const SITE='22222222-2222-4222-8222-222222222222';
const ADMIN='33333333-3333-4333-8333-333333333333';
const MEMBERSHIP='44444444-4444-4444-8444-444444444444';
async function seed(){
  if(process.env.NODE_ENV==='production')throw new Error('Development seed is forbidden in production');
  const password=process.env.SEED_ADMIN_PASSWORD;
  if(!password||password.length<14)throw new Error('Set SEED_ADMIN_PASSWORD to a unique value of at least 14 characters');
  const email=(process.env.SEED_ADMIN_EMAIL??'admin@example.test').toLowerCase();
  const hash=await hashPassword(password);
  await atomic(async tx=>{
    await tx.organization.upsert({where:{id:ORG},create:{id:ORG,name:'Platform Sandbox'},update:{}});
    await tx.site.upsert({where:{id:SITE},create:{id:SITE,organizationId:ORG,name:'Development Site'},update:{}});
    await tx.user.upsert({where:{id:ADMIN},create:{id:ADMIN,email,name:'Platform Administrator',passwordHash:hash},update:{}});
    await tx.membership.upsert({where:{id:MEMBERSHIP},create:{id:MEMBERSHIP,userId:ADMIN,organizationId:ORG},update:{}});
    const role=await tx.role.upsert({where:{organizationId_key:{organizationId:ORG,key:'platform-admin'}},create:{organizationId:ORG,key:'platform-admin',name:'Platform Administrator'},update:{}});
    for(const [resource,actions] of Object.entries(foundationPermissions))for(const action of actions){
      const permission=await tx.permission.upsert({where:{resource_action:{resource,action}},create:{resource,action},update:{}});
      await tx.rolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:permission.id}},create:{roleId:role.id,permissionId:permission.id},update:{}});
    }
    await tx.membershipRole.upsert({where:{membershipId_roleId:{membershipId:MEMBERSHIP,roleId:role.id}},create:{membershipId:MEMBERSHIP,roleId:role.id,organizationId:ORG},update:{}});
  });
  const ctx:TenantContext={organizationId:ORG,siteId:null,userId:ADMIN,membershipId:MEMBERSHIP,sessionId:MEMBERSHIP};
  await atomic(async tx=>{
    if(await tx.workflow.findFirst({where:{organizationId:ORG,name:'Platform verification'}}))return;
    const workflow=await workflowEngine.createWorkflow(tx,ctx,{name:'Platform verification',description:'Infrastructure-only two-step execution demonstration',resourceType:'PLATFORM_SANDBOX'});
    const version=await workflowEngine.createWorkflowVersion(tx,ctx,workflow.id);
    const configuration={assignment:{strategy:'USER' as const,userId:ADMIN}};
    const first=await workflowEngine.addStep(tx,ctx,version.id,{key:'verify',name:'Verify platform connection',type:'USER_TASK',configuration,position:0,initial:true,terminal:false});
    const last=await workflowEngine.addStep(tx,ctx,version.id,{key:'confirm',name:'Confirm platform execution',type:'USER_TASK',configuration,position:1,initial:false,terminal:true});
    await workflowEngine.addTransition(tx,ctx,version.id,{fromStepId:first.id,toStepId:last.id,outcome:'complete'});
    await workflowEngine.publishWorkflow(tx,ctx,version.id);
    await workflowEngine.startWorkflow(tx,ctx,{workflowId:workflow.id,targetType:'PLATFORM_SANDBOX',targetId:ORG});
    await taskEngine.create(tx,ctx,{title:'Independent infrastructure action',targetType:'PLATFORM_SANDBOX',targetId:ORG,assignedToUserId:ADMIN});
  });
  process.stdout.write('Development foundation seeded. Existing credentials are not overwritten.\n');
}
void seed().catch(()=>{process.stderr.write('Seed failed. Check environment, schema and seed credentials.\n');process.exitCode=1;}).finally(()=>database.$disconnect());
