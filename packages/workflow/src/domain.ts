import { DomainError } from '@qms/types';
export interface GraphStep { id:string; initial:boolean; terminal:boolean }
export interface GraphEdge { fromStepId:string; toStepId:string; outcome:string }
export function assertDraft(status:string) { if (status !== 'DRAFT') throw new DomainError('CONFLICT','Published workflow versions are immutable'); }
export function assertRunning(status:string) { if (status !== 'IN_PROGRESS') throw new DomainError('CONFLICT','Workflow is not in progress'); }
/** Initial execution supports acyclic, exclusive outcome branches, not parallel forks or joins. */
export function validateGraph(steps:ReadonlyArray<GraphStep>,edges:ReadonlyArray<GraphEdge>) {
  const roots = steps.filter(s=>s.initial);
  if (roots.length !== 1 || !steps.some(s=>s.terminal)) throw new DomainError('INVALID','Exactly one initial step and at least one terminal step required');
  const ids = new Set(steps.map(s=>s.id));
  const routes = new Set<string>();
  for (const edge of edges) {
    if (!ids.has(edge.fromStepId) || !ids.has(edge.toStepId)) throw new DomainError('INVALID','Transition leaves this version');
    const key = `${edge.fromStepId}:${edge.outcome}`;
    if (routes.has(key)) throw new DomainError('INVALID','Ambiguous transition');
    routes.add(key);
  }
  for (const step of steps) {
    const outgoing = edges.filter(e=>e.fromStepId===step.id);
    if ((step.terminal && outgoing.length > 0) || (!step.terminal && outgoing.length === 0)) throw new DomainError('INVALID','Terminal steps must end; other steps require transitions');
  }
  const visited = new Set<string>(); const stack = new Set<string>();
  function visit(id:string) {
    if (stack.has(id)) throw new DomainError('INVALID','Cycles are not supported by this executor');
    if (visited.has(id)) return;
    stack.add(id);
    for (const edge of edges.filter(e=>e.fromStepId===id)) visit(edge.toStepId);
    stack.delete(id); visited.add(id);
  }
  visit(roots[0]!.id);
  if (visited.size !== steps.length) throw new DomainError('INVALID','Unreachable workflow step');
}
export function nextStep(step:GraphStep,edges:ReadonlyArray<GraphEdge>,outcome:string): string|null {
  if (step.terminal) { if (outcome !== 'complete') throw new DomainError('INVALID','Terminal step requires complete outcome'); return null; }
  const choices = edges.filter(e=>e.fromStepId===step.id && e.outcome===outcome);
  if (choices.length !== 1) throw new DomainError('INVALID','No unambiguous transition for outcome');
  return choices[0]!.toStepId;
}
