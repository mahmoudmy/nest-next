# Central polymorphic task engine

Task is one table with exactly two initial types: ACTION and WORKFLOW. Both carry organization/site scope, title/description, targetType/targetId, assignee, status, dueAt, completion actor/time and timestamps.

## ACTION

An independent user action. It has no workflow instance or instance-step link. Completing it does not invent or advance a workflow. Business semantics remain in the future module that created the action. The infrastructure only validates the registered target, tenancy, eligible assignment and lifecycle.

## WORKFLOW

Represents an assigned execution step. Both workflowInstanceId and workflowInstanceStepId are required. Database checks reject malformed type/link combinations, foreign-organization instances and mismatched instance-step links. A unique constraint permits one task per execution step in the initial acyclic executor.

Only the workflow engine activates these tasks through the TaskService port. The public task-create contract creates ACTION tasks and rejects type/instance overrides. Completion delegates workflow state changes back to the workflow engine in the same transaction; the task does not duplicate workflow status.

## Assignment and lifecycle

Assignments require an active, non-deleted user in an eligible membership. Organization-wide tasks require organization-wide membership. Site tasks accept an organization-wide membership or membership in that site. Assignment does not trust a frontend user ID, even when the user has task:assign.

```text
PENDING -> IN_PROGRESS -> COMPLETED
PENDING ----------------> COMPLETED
PENDING or IN_PROGRESS -> CANCELLED
```

COMPLETED and CANCELLED are terminal. There is no implicit reopen. Completion records completedAt and completedById. Starting/completing work additionally requires the authenticated actor to be the assignee; an administrator with task:complete cannot bypass ownership. Authorized reassignment is explicit and auditable.

ACTION cancellation is independent. A WORKFLOW task cannot be cancelled in isolation; cancel/reject the workflow instance so execution and outstanding work terminate consistently. Only supported outcomes in the active definition can complete a workflow task. A failed outcome leaves both the task and workflow unchanged.

Task audit events include TASK_CREATED, TASK_ASSIGNED, TASK_STARTED, TASK_COMPLETED and TASK_CANCELLED. Successful state mutations and audit writes commit together.

## REST

```text
GET/POST /api/tasks
GET      /api/tasks/:id
POST     /api/tasks/:id/assign
POST     /api/tasks/:id/start
POST     /api/tasks/:id/complete  {"outcome":"complete"}
POST     /api/tasks/:id/cancel
```

Collection responses are bounded to the most recent 100 visible tasks. Future pagination must retain tenant predicates. Role-based assignment, queues, delegation and reopening require explicit extensions, not permissive fallbacks.
