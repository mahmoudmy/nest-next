import { DomainError } from '@qms/types';
export function assertTaskTransition(from:string,to:string) {
  const valid:Record<string,readonly string[]>={PENDING:['IN_PROGRESS','COMPLETED','CANCELLED'],IN_PROGRESS:['COMPLETED','CANCELLED'],COMPLETED:[],CANCELLED:[]};
  if (!valid[from]?.includes(to)) throw new DomainError('CONFLICT',`Invalid task transition: ${from} to ${to}`);
}
export function assertAssignee(assignedToUserId:string,actorId:string) { if (assignedToUserId!==actorId) throw new DomainError('FORBIDDEN','Only the assigned user can perform this task'); }
