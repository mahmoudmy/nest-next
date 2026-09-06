import { describe,it,expect } from 'vitest';
import { assertDraft,assertRunning,validateGraph,nextStep } from '../src/domain';
const steps=[{id:'a',initial:true,terminal:false},{id:'b',initial:false,terminal:false},{id:'c',initial:false,terminal:true}];
const edges=[{fromStepId:'a',toStepId:'b',outcome:'complete'},{fromStepId:'b',toStepId:'c',outcome:'complete'}];
describe('workflow domain',()=>{
  it('protects published definitions',()=>{expect(()=>assertDraft('PUBLISHED')).toThrow('immutable');expect(()=>assertDraft('DRAFT')).not.toThrow();});
  it('rejects transitions on completed or cancelled instances',()=>{for(const s of ['PENDING','COMPLETED','CANCELLED','REJECTED'])expect(()=>assertRunning(s)).toThrow();});
  it('executes deterministically through explicit transitions',()=>{validateGraph(steps,edges);expect(nextStep(steps[0]!,edges,'complete')).toBe('b');expect(nextStep(steps[1]!,edges,'complete')).toBe('c');expect(nextStep(steps[2]!,edges,'complete')).toBeNull();});
  it('rejects invalid outcomes and ambiguous transitions',()=>{expect(()=>nextStep(steps[0]!,edges,'skip')).toThrow();expect(()=>validateGraph(steps,[...edges,edges[0]!])).toThrow('Ambiguous');});
  it('supports explicit outcome branching without hardcoded paths',()=>{const branch=[{id:'a',initial:true,terminal:false},{id:'b',initial:false,terminal:true},{id:'c',initial:false,terminal:true}];const routes=[{fromStepId:'a',toStepId:'b',outcome:'approve'},{fromStepId:'a',toStepId:'c',outcome:'return'}];validateGraph(branch,routes);expect(nextStep(branch[0]!,routes,'return')).toBe('c');});
  it('rejects cycles, unreachable steps, cross-version edges, dead ends, and multiple roots',()=>{expect(()=>validateGraph(steps,[edges[0]!,{fromStepId:'b',toStepId:'a',outcome:'complete'}])).toThrow();expect(()=>validateGraph([...steps,{id:'x',initial:false,terminal:true}],edges)).toThrow('Unreachable');expect(()=>validateGraph(steps,[{fromStepId:'a',toStepId:'x',outcome:'complete'}])).toThrow();expect(()=>validateGraph(steps,[])).toThrow();expect(()=>validateGraph(steps.map(s=>({...s,initial:true})),edges)).toThrow();});
});
