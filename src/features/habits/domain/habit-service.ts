import type { Difficulty, Habit, HabitCompletion } from "@prisma/client";
import { incrementXp } from "@/features/users/data/user-repository";
import {
  createHabitCompletion,
  createHabitRecord,
  deleteHabitRecord,
  findHabitById,
  findHabitCompletion,
  findHabitsByUserId,
  runTransaction,
  updateHabitRecord,
} from "../data/habit-repository";
import {
  HabitForbiddenError,
  HabitNotFoundError,
  HabitValidationError,
} from "./errors";

// Duplicated literally from task-service.ts on purpose: both are three-line
// constants with two usages each; a shared abstraction is premature — see
// spec §Block 2 Logic / §Block 3 Logic. If a third place needs it, extract to
// src/features/shared/difficulty.ts.
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 5,
  MEDIUM: 10,
  HARD: 20,
};

const NAME_MAX_LENGTH = 100;
const VALID_DIFFICULTIES: readonly Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export interface CreateHabitInput {
  name: string;
  difficulty: Difficulty;
}

export interface UpdateHabitInput {
  name?: string;
  difficulty?: Difficulty;
}

function validateName(name: string): void {
  if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
    throw new HabitValidationError(
      `name must be between 1 and ${NAME_MAX_LENGTH} characters`,
    );
  }
}

function validateDifficulty(difficulty: Difficulty): void {
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new HabitValidationError(
      `difficulty must be one of ${VALID_DIFFICULTIES.join(", ")}`,
    );
  }
}

async function getOwnedHabitOrThrow(
  userId: string,
  habitId: string,
): Promise<Habit> {
  const habit = await findHabitById(habitId);
  if (!habit) {
    throw new HabitNotFoundError(habitId);
  }
  if (habit.userId !== userId) {
    throw new HabitForbiddenError(habitId);
  }
  return habit;
}

/**
 * Today's calendar date, date-only (no time), in UTC — matches the `@db.Date`
 * column and the `@@unique([habitId, date])` constraint the DB enforces (see
 * spec §Block 3 Logic).
 */
function todayUtcDateOnly(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * True if `error` is a Prisma "unique constraint violation" (code P2002).
 * Duck-typed on `.code` rather than `instanceof Prisma.PrismaClientKnownRequestError`
 * so the same check works against the real Prisma error and the lightweight
 * fake used by habit-service.test.ts (see spec §Block 3 Error handling: this
 * must be a specific check, not a generic catch).
 */
function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export async function createHabit(
  userId: string,
  input: CreateHabitInput,
): Promise<Habit> {
  validateName(input.name);
  validateDifficulty(input.difficulty);

  return createHabitRecord({
    userId,
    name: input.name,
    difficulty: input.difficulty,
  });
}

export async function updateHabit(
  userId: string,
  habitId: string,
  input: UpdateHabitInput,
): Promise<Habit> {
  await getOwnedHabitOrThrow(userId, habitId);

  if (input.name !== undefined) {
    validateName(input.name);
  }
  if (input.difficulty !== undefined) {
    validateDifficulty(input.difficulty);
  }

  return updateHabitRecord(habitId, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.difficulty !== undefined
      ? { difficulty: input.difficulty }
      : {}),
  });
}

export async function deleteHabit(
  userId: string,
  habitId: string,
): Promise<void> {
  await getOwnedHabitOrThrow(userId, habitId);
  await deleteHabitRecord(habitId);
}

/**
 * Registers today's completion, awarding XP exactly once per calendar day.
 *
 * Unlike `completeTask` (which needs an atomic conditional UPDATE to avoid a
 * race — RT-01), this relies on the DB's `@@unique([habitId, date])`
 * constraint as the source of truth: it attempts a plain `create` inside the
 * transaction and catches the P2002 violation as an idempotent no-op,
 * returning the existing row without calling `incrementXp` again.
 */
export async function registerCompletion(
  userId: string,
  habitId: string,
): Promise<HabitCompletion> {
  const habit = await getOwnedHabitOrThrow(userId, habitId);
  const today = todayUtcDateOnly();
  const xpAwarded = XP_BY_DIFFICULTY[habit.difficulty];

  return runTransaction(async (tx) => {
    try {
      const completion = await createHabitCompletion(
        tx,
        habitId,
        today,
        xpAwarded,
      );
      await incrementXp(tx, userId, xpAwarded);
      return completion;
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }
      const existing = await findHabitCompletion(tx, habitId, today);
      if (existing === null) {
        // The constraint fired but the row cannot be re-read: something
        // else is wrong (not a P2002-shaped race we know how to recover
        // from), so surface the original error rather than swallowing it.
        throw error;
      }
      return existing;
    }
  });
}

export async function listHabitsForUser(userId: string): Promise<Habit[]> {
  return findHabitsByUserId(userId);
}
