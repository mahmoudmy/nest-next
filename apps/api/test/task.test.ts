import { describe,it,expect,vi } from 'vitest';
import { assertTaskTransition,assertAssignee } from '../src/tasks/task.domain';
import { TaskService } from '../src/tasks/task.service';
import { TaskRepository } from '../src/tasks/task.repository';
import { ResourceRegistry } from '@qms/workflow';
import type { Transaction } from '@qms/database';
describe('task lifecycle',()=>{
  it('permits independent actions to start and finish',()=>{expect(()=>assertTaskTransition('PENDING','IN_PROGRESS')).not.toThrow();expect(()=>assertTaskTransition('IN_PROGRESS','COMPLETED')).not.toThrow();expect(()=>assertTaskTransition('PENDING','COMPLETED')).not.toThrow();});
  it('never silently reopens a terminal task',()=>{for(const from of ['COMPLETED','CANCELLED'])for(const to of ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'])expect(()=>assertTaskTransition(from,to)).toThrow();});
  it('rejects another user completing a task even if they have the complete permission',()=>{expect(()=>assertAssignee('user-a','user-b')).toThrow('assigned user');});
  it('validates assignment against active tenant membership instead of trusting a user ID',async()=>{const findFirst=vi.fn().mockResolvedValue(null);const tx={membership:{findFirst}} as unknown as Transaction;const service=new TaskService(new TaskRepository(),new ResourceRegistry());await expect(service.eligible(tx,{organizationId:'a',siteId:'a1'},'foreign')).rejects.toThrow('not eligible');expect(findFirst.mock.calls[0]?.[0]).toMatchObject({where:{userId:'foreign',organizationId:'a',active:true,user:{active:true,deletedAt:null}}});findFirst.mockResolvedValue({id:'eligible'});await expect(service.eligible(tx,{organizationId:'a',siteId:null},'local')).resolves.toBeUndefined();});
});
