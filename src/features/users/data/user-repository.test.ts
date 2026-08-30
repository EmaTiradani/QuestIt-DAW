import { describe, expect, it, vi } from "vitest";
import { incrementXp } from "./user-repository";

// The transaction client is a plain mock object, not a real PrismaClient
// instance: this block's tests do not require a live database connection.
// The repository only needs `tx.user.update` to exist and be callable.
function createFakeTx(initialXp: number) {
  let xp = initialXp;

  return {
    user: {
      update: vi.fn(
        async ({
          data,
        }: {
          where: { id: string };
          data: { xp: { increment: number } };
        }) => {
          xp += data.xp.increment;
          return { id: "user-1", xp };
        },
      ),
    },
    getXp: () => xp,
  };
}

describe("user-repository :: incrementXp", () => {
  it("suma correctamente al valor existente de xp", async () => {
    const tx = createFakeTx(50);

    await incrementXp(tx as never, "user-1", 20);

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { xp: { increment: 20 } },
    });
    expect(tx.getXp()).toBe(70);
  });

  it("llamado dos veces en la misma transacción con montos distintos suma ambos, no sobrescribe", async () => {
    const tx = createFakeTx(0);

    await incrementXp(tx as never, "user-1", 5);
    await incrementXp(tx as never, "user-1", 10);

    expect(tx.user.update).toHaveBeenCalledTimes(2);
    expect(tx.getXp()).toBe(15);
  });
});
