import type { Prisma } from "@prisma/client";

/**
 * Adds `amount` to `User.xp`.
 *
 * This is a pure repository, not a domain service: it does not decide how
 * much XP corresponds to a given difficulty (that rule lives in
 * task-service/habit-service). It also does not open its own transaction —
 * the caller passes a Prisma transaction client (`tx`) so this write lands
 * atomically alongside completing a task or registering a habit completion.
 */
export async function incrementXp(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
  });
}
