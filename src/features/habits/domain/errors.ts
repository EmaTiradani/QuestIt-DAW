/**
 * Thrown when a habit lookup by id does not resolve to any row.
 */
export class HabitNotFoundError extends Error {
  constructor(habitId: string) {
    super(`Habit ${habitId} not found`);
    this.name = "HabitNotFoundError";
  }
}

/**
 * Thrown when the habit exists but does not belong to the requesting user.
 *
 * The route handler translates this to the same HTTP 404 as
 * `HabitNotFoundError` (see spec §API contract / threat model RT-02) so a
 * client cannot distinguish "does not exist" from "exists but is not yours".
 */
export class HabitForbiddenError extends Error {
  constructor(habitId: string) {
    super(`Habit ${habitId} does not belong to the current user`);
    this.name = "HabitForbiddenError";
  }
}

/**
 * Thrown by createHabit/updateHabit when the input fails validation
 * (name length, difficulty enum). Mirrors task-service's TaskValidationError
 * for the same reason: input validation needs a typed error distinct from
 * the ownership errors above so route handlers can map it to 400 vs 404.
 */
export class HabitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HabitValidationError";
  }
}
