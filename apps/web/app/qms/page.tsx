'use client';
import { useEffect,useState,type FormEvent } from 'react';
import { sessionSchema,taskResponseSchema,workflowResponseSchema,type CurrentSession } from '@qms/contracts';
interface TaskRow {id:string;title:string;type:'ACTION'|'WORKFLOW';status:string;assignedToUserId:string}
interface WorkflowRow {id:string;name:string;resourceType:string;currentVersion:number|null}
async function request(path:string,body?:unknown) {
  const response=await fetch(`/api/${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  if (!response.ok) throw new Error(response.status===401?'Sign in to inspect the platform.':`Request rejected (${response.status}). Check permissions and current state.`);
  return response.json() as Promise<unknown>;
}
export default function Console(){
  const [session,setSession]=useState<CurrentSession|null>(null);
  const [tasks,setTasks]=useState<TaskRow[]>([]);const [workflows,setWorkflows]=useState<WorkflowRow[]>([]);
  const [status,setStatus]=useState('Checking API connectivity…');const [error,setError]=useState('');const [busy,setBusy]=useState(true);
  async function refresh(){
    const current=sessionSchema.parse(await request('auth/session'));setSession(current);
    if(current.permissions.includes('task:read'))setTasks(taskResponseSchema.array().parse(await request('tasks')));else setTasks([]);
    if(current.permissions.includes('workflow:read'))setWorkflows(workflowResponseSchema.array().parse(await request('workflows')));else setWorkflows([]);
  }
  useEffect(()=>{void request('health/ready').then(()=>setStatus('API connected · Database ready')).catch(()=>setStatus('API unavailable · Check the API and database')).then(()=>refresh()).catch(e=>setError(e instanceof Error?e.message:'Unable to load session')).finally(()=>setBusy(false));},[]);
  async function perform(operation:()=>Promise<unknown>){setBusy(true);setError('');try{await operation();await refresh();}catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}}
  async function login(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;const data=new FormData(form);await perform(()=>request('auth/login',{email:data.get('email'),password:data.get('password')}));form.reset();}
  const can=(permission:string)=>session?.permissions.includes(permission)??false;
  return <main aria-busy={busy}>
    <header><a className="brand" href="/qms">QMS <span>platform kernel</span></a><a href="/api/docs" target="_blank" rel="noreferrer">API reference ↗</a></header>
    <div className="intro"><p className="eyebrow">Foundation / 01</p><h1>A working foundation.<br/><span>Nothing extra.</span></h1><p className="lede">Verify identity, permissions and generic execution before building business modules.</p><p className="connection" role="status">{status}</p></div>
    {error&&<p className="notice" role="alert">{error}</p>}
    {!session?<section className="login"><div><h2>Start with identity</h2><p>Use your development seed account. Credentials stay in an HTTP-only session, never browser storage.</p></div><form onSubmit={login}><label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label><button disabled={busy}>{busy?'Checking…':'Sign in'}</button></form></section>:<>
      <section><div className="section-heading"><h2>Current context</h2><button className="secondary" disabled={busy} onClick={()=>{setBusy(true);void request('auth/logout',{}).then(()=>{setSession(null);setTasks([]);setWorkflows([]);setError('');}).catch(e=>setError(e instanceof Error?e.message:'Logout failed')).finally(()=>setBusy(false));}}>Sign out</button></div><dl><div><dt>Signed in as</dt><dd>{session.user.name}<small>{session.user.email}</small></dd></div><div><dt>Organization</dt><dd><code>{session.context.organizationId}</code></dd></div><div><dt>Site scope</dt><dd>{session.context.siteId??'Organization-wide'}</dd></div></dl><label className="context-select">Membership<select value={session.context.membershipId} disabled={busy} onChange={e=>void perform(()=>request('auth/context',{membershipId:e.target.value}))}>{session.memberships.map(m=><option key={m.id} value={m.id}>{m.organizationId} / {m.siteId??'Organization'}</option>)}</select></label><details><summary>{session.permissions.length} granted permissions</summary><p className="permissions">{session.permissions.join(' · ')}</p></details></section>
      <section><div className="section-heading"><h2>Workflow definitions</h2><span>Generic infrastructure only</span></div>{workflows.length===0?<p className="empty">No visible workflows. Run the development seed or create a definition through the API.</p>:workflows.map(w=><div className="row" key={w.id}><div><strong>{w.name}</strong><small>{w.resourceType} · {w.currentVersion?`Published v${w.currentVersion}`:'Unpublished'}</small></div><button className="secondary" disabled={busy||!can('workflow-instance:start')||!w.currentVersion||w.resourceType!=='PLATFORM_SANDBOX'} onClick={()=>void perform(()=>request('workflow-instances',{workflowId:w.id,targetType:w.resourceType,targetId:session.context.siteId??session.context.organizationId}))}>Start workflow</button></div>)}</section>
      <section><div className="section-heading"><h2>Assigned work</h2><button className="secondary" disabled={busy||!can('task:create')} onClick={()=>void perform(()=>request('tasks',{title:'Verify platform connectivity',assignedToUserId:session.user.id,targetType:'PLATFORM_SANDBOX',targetId:session.context.siteId??session.context.organizationId}))}>Create action task</button></div>{tasks.length===0?<p className="empty">No visible tasks. Start a workflow or create an independent action task.</p>:tasks.map(task=><div className="row" key={task.id}><div><strong>{task.title}</strong><small>{task.type} · {task.status}</small></div><button disabled={busy||!can('task:complete')||task.assignedToUserId!==session.user.id||!['PENDING','IN_PROGRESS'].includes(task.status)} onClick={()=>void perform(()=>request(`tasks/${task.id}/complete`,{outcome:'complete'}))}>Complete</button></div>)}</section>
    </>}
    <footer>Platform verification console <span>No CAPA, documents, audits or other QMS modules.</span></footer>
  </main>;
}
