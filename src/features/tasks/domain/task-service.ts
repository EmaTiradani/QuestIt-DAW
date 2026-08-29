import type { Difficulty, Task } from "@prisma/client";
import { incrementXp } from "@/features/users/data/user-repository";
import {
  completePendingTask,
  createTaskRecord,
  deleteTaskRecord,
  findTaskById,
  findTaskByIdOrThrow,
  findTasksByUserId,
  runTransaction,
  updateTaskRecord,
} from "../data/task-repository";
import { TaskForbiddenError, TaskNotFoundError, TaskValidationError } from "./errors";

// Not extracted to a shared module: only two consumers exist today
// (task-service, and habit-service in Block 3). A shared abstraction is
// premature with two three-line usages — see spec §Block 2 Logic.
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 5,
  MEDIUM: 10,
  HARD: 20,
};

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const VALID_DIFFICULTIES: readonly Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export interface CreateTaskInput {
  title: string;
  description?: string;
  difficulty: Difficulty;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  difficulty?: Difficulty;
}

function validateTitle(title: string): void {
  if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
    throw new TaskValidationError(
      `title must be between 1 and ${TITLE_MAX_LENGTH} characters`,
    );
  }
}

function validateDescription(description: string): void {
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new TaskValidationError(
      `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
    );
  }
}

function validateDifficulty(difficulty: Difficulty): void {
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new TaskValidationError(
      `difficulty must be one of ${VALID_DIFFICULTIES.join(", ")}`,
    );
  }
}

async function getOwnedTaskOrThrow(
  userId: string,
  taskId: string,
): Promise<Task> {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }
  if (task.userId !== userId) {
    throw new TaskForbiddenError(taskId);
  }
  return task;
}

export async function createTask(
  userId: string,
  input: CreateTaskInput,
): Promise<Task> {
  validateTitle(input.title);
  if (input.description !== undefined) {
    validateDescription(input.description);
  }
  validateDifficulty(input.difficulty);

  return createTaskRecord({
    userId,
    title: input.title,
    description: input.description ?? null,
    difficulty: input.difficulty,
  });
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  await getOwnedTaskOrThrow(userId, taskId);

  if (input.title !== undefined) {
    validateTitle(input.title);
  }
  if (input.description !== undefined) {
    validateDescription(input.description);
  }
  if (input.difficulty !== undefined) {
    validateDifficulty(input.difficulty);
  }

  return updateTaskRecord(taskId, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.difficulty !== undefined
      ? { difficulty: input.difficulty }
      : {}),
  });
}

export async function deleteTask(
  userId: string,
  taskId: string,
): Promise<void> {
  await getOwnedTaskOrThrow(userId, taskId);
  await deleteTaskRecord(taskId);
}

/**
 * Completes a task, awarding XP exactly once even under concurrent calls.
 *
 * Ownership is checked against a plain read (`getOwnedTaskOrThrow`), but the
 * state transition itself is NOT decided from that read — it uses an atomic
 * conditional `updateMany({ where: { status: 'PENDING' } })` inside the
 * transaction. This is the RT-01 mitigation from the threat model: a
 * read-then-write pattern would let two concurrent requests both observe
 * `PENDING` and both award XP; the conditional update guarantees only one
 * concurrent call can ever affect the row.
 */
export async function completeTask(
  userId: string,
  taskId: string,
): Promise<Task> {
  const task = await getOwnedTaskOrThrow(userId, taskId);

  return runTransaction(async (tx) => {
    const affectedCount = await completePendingTask(tx, taskId);

    if (affectedCount === 1) {
      await incrementXp(tx, userId, XP_BY_DIFFICULTY[task.difficulty]);
    }

    return findTaskByIdOrThrow(tx, taskId);
  });
}

export async function listTasksForUser(userId: string): Promise<Task[]> {
  return findTasksByUserId(userId);
}
