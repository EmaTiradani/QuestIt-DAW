import type { Difficulty, Prisma, Task } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreateTaskData {
  userId: string;
  title: string;
  description: string | null;
  difficulty: Difficulty;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  difficulty?: Difficulty;
}

/**
 * Finds a task by id, unscoped by `userId` on purpose: the caller
 * (task-service) needs to distinguish "does not exist" from "exists but
 * belongs to someone else" before deciding which typed error to throw.
 */
export async function findTaskById(id: string): Promise<Task | null> {
  return prisma.task.findUnique({ where: { id } });
}

export async function findTasksByUserId(userId: string): Promise<Task[]> {
  return prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTaskRecord(data: CreateTaskData): Promise<Task> {
  return prisma.task.create({ data });
}

export async function updateTaskRecord(
  id: string,
  data: UpdateTaskData,
): Promise<Task> {
  return prisma.task.update({ where: { id }, data });
}

export async function deleteTaskRecord(id: string): Promise<void> {
  await prisma.task.delete({ where: { id } });
}

/**
 * Atomic conditional update used by `completeTask` (RT-01 mitigation): only
 * affects the row if it is still `PENDING`, so two concurrent calls can
 * never both report `count === 1`. Must run inside the same transaction
 * (`tx`) that also calls `user-repository.incrementXp`.
 */
export async function completePendingTask(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<number> {
  const result = await tx.task.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  return result.count;
}

export async function findTaskByIdOrThrow(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<Task> {
  return tx.task.findUniqueOrThrow({ where: { id } });
}

/**
 * Opens a Prisma transaction on behalf of the domain layer. `task-service`
 * needs an atomic block for `completeTask` (conditional update +
 * `incrementXp`), but the domain layer must never import `prisma` directly
 * (AGENTS.md layer separation) — this is the one place in this feature that
 * legitimately talks to Prisma, so the wrapper lives here.
 */
export async function runTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}
