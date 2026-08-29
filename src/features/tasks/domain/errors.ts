/**
 * Thrown when a task lookup by id does not resolve to any row.
 */
export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task ${taskId} not found`);
    this.name = "TaskNotFoundError";
  }
}

/**
 * Thrown when the task exists but does not belong to the requesting user.
 *
 * The route handler translates this to the same HTTP 404 as
 * `TaskNotFoundError` (see spec §API contract / threat model RT-02) so a
 * client cannot distinguish "does not exist" from "exists but is not yours".
 */
export class TaskForbiddenError extends Error {
  constructor(taskId: string) {
    super(`Task ${taskId} does not belong to the current user`);
    this.name = "TaskForbiddenError";
  }
}

/**
 * Thrown by createTask/updateTask when the input fails validation
 * (title/description length, difficulty enum). Not named explicitly in the
 * spec's file list for errors.ts, but the spec requires a typed 400 response
 * for validation failures distinct from the 404 cases above — see report.
 */
export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}
