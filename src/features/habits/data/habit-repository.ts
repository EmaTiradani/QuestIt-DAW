import type {
  Difficulty,
  Habit,
  HabitCompletion,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreateHabitData {
  userId: string;
  name: string;
  difficulty: Difficulty;
}

export interface UpdateHabitData {
  name?: string;
  difficulty?: Difficulty;
}

/**
 * Finds a habit by id, unscoped by `userId` on purpose: the caller
 * (habit-service) needs to distinguish "does not exist" from "exists but
 * belongs to someone else" before deciding which typed error to throw.
 */
export async function findHabitById(id: string): Promise<Habit | null> {
  return prisma.habit.findUnique({ where: { id } });
}

export async function findHabitsByUserId(userId: string): Promise<Habit[]> {
  return prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createHabitRecord(data: CreateHabitData): Promise<Habit> {
  return prisma.habit.create({ data });
}

export async function updateHabitRecord(
  id: string,
  data: UpdateHabitData,
): Promise<Habit> {
  return prisma.habit.update({ where: { id }, data });
}

export async function deleteHabitRecord(id: string): Promise<void> {
  await prisma.habit.delete({ where: { id } });
}

/**
 * Attempts to create today's completion row. Relies on the DB's
 * `@@unique([habitId, date])` constraint as the source of truth for
 * concurrency safety: if a row for (habitId, date) already exists, Prisma
 * rejects with a `PrismaClientKnownRequestError` carrying `code: "P2002"`.
 * `habit-service.registerCompletion` catches that specific code to treat it
 * as an idempotent no-op — this function does not swallow anything itself.
 */
export async function createHabitCompletion(
  tx: Prisma.TransactionClient,
  habitId: string,
  date: Date,
  xpAwarded: number,
): Promise<HabitCompletion> {
  return tx.habitCompletion.create({
    data: { habitId, date, xpAwarded },
  });
}

export async function findHabitCompletion(
  tx: Prisma.TransactionClient,
  habitId: string,
  date: Date,
): Promise<HabitCompletion | null> {
  return tx.habitCompletion.findFirst({ where: { habitId, date } });
}

/**
 * Opens a Prisma transaction on behalf of the domain layer. Mirrors
 * task-repository.ts's `runTransaction`: `habit-service` needs an atomic
 * block for `registerCompletion` (create completion + `incrementXp`), but
 * the domain layer must never import `prisma` directly (AGENTS.md layer
 * separation) — this is the one place in this feature that legitimately
 * talks to Prisma, so the wrapper lives here.
 */
export async function runTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}
