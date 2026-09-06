# Central polymorphic workflow engine

## Definitions and versions

A Workflow is a tenant-scoped reusable definition with name, description, stable resourceType, status and currentVersion number. WorkflowVersion holds a monotonically allocated version number and DRAFT/PUBLISHED status. Steps and transitions belong to a specific version. Creating a new version creates a fresh draft; it does not silently clone or mutate previous versions.

Published versions are immutable in both service validation and PostgreSQL triggers. Step/transition edits lock their parent version to prevent publication/edit races. Version status cannot be reverted. Every instance references a specific workflowVersionId; later publication changes only what new instances select. An execution-binding trigger rejects changes to an instance's workflow, version, tenant or polymorphic target.

## Steps and transitions

A step has key, name, USER_TASK type, extensible configuration, position, initial and terminal markers. Configuration currently supports `{assignment:{strategy:"USER",userId:"uuid"}}`. Unsupported assignment strategies fail validation rather than appearing to work.

Transitions explicitly link from/to step IDs in the same version and name an outcome. Definition validation requires one initial step, at least one terminal step, no unreachable steps, no cycles, no terminal outgoing edges and no non-terminal dead ends. Each `(version, fromStep, outcome)` is unique, making exclusive branching deterministic.

The schema is graph-shaped, not an array of hardcoded next steps. Initial execution has one active path. Exclusive branches can converge because only one path executes. Parallel forks, joins, repeated visits, conditional scripts and timers are deliberately rejected/not implemented; adding them requires an execution-token/join model and corresponding concurrency tests.

## Polymorphic targets and registry

Instances bind `targetType` + `targetId`, not a CAPA/document/audit foreign key. Stable types are registered once through ResourceRegistry. Registration requires an adapter that verifies target existence, organization/site scope, and module-specific access. Unknown types and foreign resources fail. Initially only PLATFORM_SANDBOX is registered and resolves real infrastructure organizations/sites.

Future modules register their own adapter from application composition. They do not import module-specific database logic into this package. An authorized module facade can call:

```ts
await atomic(async tx => {
  const resource = await moduleRepository.create(tx, validatedContext, input);
  return workflowEngine.startWorkflow(tx, validatedContext, {
    workflowId,
    targetType: moduleResourceType,
    targetId: resource.id,
  });
});
```

`validatedContext.userId` is the actor. Do not accept a browser actorId as an engine credential. The calling application must enforce the appropriate Casbin permission before invoking the engine.

## Instance execution

`startWorkflow` resolves an active workflow and published current version, verifies target type/scope, creates an IN_PROGRESS instance and activates its initial step. The schema supports PENDING, IN_PROGRESS, COMPLETED, CANCELLED and REJECTED. Initial starts activate immediately, rather than exposing a fake queue.

Each activated WorkflowInstanceStep references a definition step, tracks activation/completion/outcome and owns a unique associated WORKFLOW task. The task service owns assignment and task lifecycle. Completing that task invokes `completeWorkflowStep` inside the same serializable transaction. The engine verifies the active instance and step, evaluates the named transition, completes the execution step and either activates the next step/task or completes the instance.

Invalid outcomes roll back task completion. Concurrent completions cannot create duplicate downstream work: a serializable conflict retries the whole command and the terminal task then rejects another completion. Composite constraints and one task per instance step reinforce the application invariant. Terminal transitions record timestamps and completion actors. Cancellation/rejection cancels remaining tasks and closes active execution steps atomically.

## Service surface and REST

WorkflowEngine exposes createWorkflow, createWorkflowVersion, addStep, addTransition, publishWorkflow, startWorkflow, getWorkflowInstance, getCurrentStep, completeWorkflowStep and cancelWorkflow. Transition evaluation is intentionally internal to task completion; there is no public endpoint that skips the assigned task.

REST:

```text
GET/POST    /api/workflows
GET/DELETE  /api/workflows/:id
POST        /api/workflows/:id/versions
POST        /api/workflows/versions/:id/steps
POST        /api/workflows/versions/:id/transitions
POST        /api/workflows/versions/:id/publish
GET/POST    /api/workflow-instances
GET         /api/workflow-instances/:id
GET         /api/workflow-instances/:id/steps/current
POST        /api/workflow-instances/:id/cancel
POST        /api/workflow-instances/:id/reject
```

DELETE performs documented soft deletion of the workflow header; historical versions and executions remain. A deleted definition cannot start new work. Historical instances retain their bound version and can finish.
