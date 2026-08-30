import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Difficulty, Habit, HabitCompletion } from "@prisma/client";

// The Prisma singleton is mocked with an in-memory fake, mirroring
// task-service.test.ts's approach (no live database connection). The fake
// implements just enough of the Prisma Client surface (`habit.*`,
// `habitCompletion.*`, `user.update`, `$transaction`) for habit-service and
// habit-repository to run against it unmodified, including a genuine
// enforcement of the `@@unique([habitId, date])` constraint: a second
// `habitCompletion.create` for the same (habitId, date) rejects with a
// Prisma-shaped error carrying `code: "P2002"`, the same way task-service's
// fake enforced the `updateMany` WHERE-clause semantics for its concurrency
// test. This exercises the actual P2002-catch path in registerCompletion,
// not just its idempotent outcome.
class FakePrismaKnownRequestError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
  }
}

function createFakePrisma() {
  let habits: Habit[] = [];
  let completions: HabitCompletion[] = [];
  let habitIdSeq = 0;
  let completionIdSeq = 0;
  const xpByUser = new Map<string, number>();

  function findHabit(id: string): Habit | undefined {
    return habits.find((h) => h.id === id);
  }

  function findCompletion(
    habitId: string,
    date: Date,
  ): HabitCompletion | undefined {
    return completions.find(
      (c) => c.habitId === habitId && c.date.getTime() === date.getTime(),
    );
  }

  interface FakePrismaClient {
    habit: {
      findUnique: (args: { where: { id: string } }) => Promise<Habit | null>;
      findMany: (args: {
        where: { userId: string };
      }) => Promise<Habit[]>;
      create: (args: {
        data: { userId: string; name: string; difficulty: Difficulty };
      }) => Promise<Habit>;
      update: (args: {
        where: { id: string };
        data: Partial<Habit>;
      }) => Promise<Habit>;
      delete: (args: { where: { id: string } }) => Promise<void>;
    };
    habitCompletion: {
      findFirst: (args: {
        where: { habitId: string; date: Date };
      }) => Promise<HabitCompletion | null>;
      create: (args: {
        data: {
          habitId: string;
          date: Date;
          xpAwarded: number;
        };
      }) => Promise<HabitCompletion>;
    };
    user: {
      update: (args: {
        where: { id: string };
        data: { xp: { increment: number } };
      }) => Promise<{ id: string; xp: number }>;
    };
    $transaction: <T>(fn: (tx: FakePrismaClient) => Promise<T>) => Promise<T>;
  }

  const client: FakePrismaClient = {
    habit: {
      findUnique: async ({ where: { id } }) => findHabit(id) ?? null,
      findMany: async ({ where: { userId } }) =>
        habits.filter((h) => h.userId === userId),
      create: async ({ data }) => {
        habitIdSeq += 1;
        const habit: Habit = {
          id: `habit-${habitIdSeq}`,
          userId: data.userId,
          name: data.name,
          difficulty: data.difficulty,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        habits.push(habit);
        return habit;
      },
      update: async ({ where: { id }, data }) => {
        const idx = habits.findIndex((h) => h.id === id);
        if (idx === -1) throw new Error(`Habit ${id} not found`);
        habits[idx] = { ...habits[idx], ...data, updatedAt: new Date() };
        return habits[idx];
      },
      delete: async ({ where: { id } }) => {
        habits = habits.filter((h) => h.id !== id);
      },
    },
    habitCompletion: {
      findFirst: async ({ where: { habitId, date } }) =>
        findCompletion(habitId, date) ?? null,
      create: async ({ data }) => {
        if (findCompletion(data.habitId, data.date) !== undefined) {
          throw new FakePrismaKnownRequestError(
            "Unique constraint failed on the fields: (`habitId`,`date`)",
            "P2002",
          );
        }
        completionIdSeq += 1;
        const completion: HabitCompletion = {
          id: `completion-${completionIdSeq}`,
          habitId: data.habitId,
          date: data.date,
          xpAwarded: data.xpAwarded,
          createdAt: new Date(),
        };
        completions.push(completion);
        return completion;
      },
    },
    user: {
      update: async ({ where: { id }, data }) => {
        const current = xpByUser.get(id) ?? 0;
        const next = current + data.xp.increment;
        xpByUser.set(id, next);
        return { id, xp: next };
      },
    },
    $transaction: async (fn) => fn(client),
  };

  return {
    client,
    getXp: (userId: string) => xpByUser.get(userId) ?? 0,
    getCompletionsCount: () => completions.length,
    seedHabit: (habit: Partial<Habit> & { userId: string }) => {
      habitIdSeq += 1;
      const full: Habit = {
        id: habit.id ?? `habit-${habitIdSeq}`,
        userId: habit.userId,
        name: habit.name ?? "Seed habit",
        difficulty: habit.difficulty ?? "EASY",
        createdAt: habit.createdAt ?? new Date(),
        updatedAt: habit.updatedAt ?? new Date(),
      };
      habits.push(full);
      return full;
    },
  };
}

let fakePrisma = createFakePrisma();

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return fakePrisma.client;
  },
}));

beforeEach(() => {
  fakePrisma = createFakePrisma();
});

const USER_A = "user-a";
const USER_B = "user-b";

describe("habit-service", () => {
  it("createHabit guarda el habito y aparece en listHabitsForUser (AC-07)", async () => {
    const { createHabit, listHabitsForUser } = await import("./habit-service");

    const created = await createHabit(USER_A, {
      name: "Leer 20 minutos",
      difficulty: "EASY",
    });

    const list = await listHabitsForUser(USER_A);

    expect(created.name).toBe("Leer 20 minutos");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it("createHabit rechaza name vacio o difficulty invalida (AC-08)", async () => {
    const { createHabit } = await import("./habit-service");

    await expect(
      createHabit(USER_A, { name: "", difficulty: "EASY" }),
    ).rejects.toThrow();

    await expect(
      createHabit(USER_A, {
        name: "Valido",
        // @ts-expect-error -- intentionally invalid difficulty for the test
        difficulty: "IMPOSSIBLE",
      }),
    ).rejects.toThrow();
  });

  it("updateHabit refleja los campos actualizados (AC-09)", async () => {
    const { createHabit, updateHabit } = await import("./habit-service");

    const created = await createHabit(USER_A, {
      name: "Original",
      difficulty: "EASY",
    });

    const updated = await updateHabit(USER_A, created.id, {
      name: "Actualizado",
      difficulty: "HARD",
    });

    expect(updated.name).toBe("Actualizado");
    expect(updated.difficulty).toBe("HARD");
  });

  it("deleteHabit hace que el habito deje de aparecer en listHabitsForUser (AC-10)", async () => {
    const { createHabit, deleteHabit, listHabitsForUser } = await import(
      "./habit-service"
    );

    const created = await createHabit(USER_A, {
      name: "Borrame",
      difficulty: "EASY",
    });

    await deleteHabit(USER_A, created.id);

    const list = await listHabitsForUser(USER_A);
    expect(list).toHaveLength(0);
  });

  it("registerCompletion crea el registro y suma XP la primera vez del dia (AC-11)", async () => {
    const { createHabit, registerCompletion } = await import(
      "./habit-service"
    );

    const created = await createHabit(USER_A, {
      name: "Habito dificil",
      difficulty: "HARD",
    });

    const completion = await registerCompletion(USER_A, created.id);

    expect(completion.habitId).toBe(created.id);
    expect(fakePrisma.getXp(USER_A)).toBe(20);
    expect(fakePrisma.getCompletionsCount()).toBe(1);
  });

  it("registerCompletion repetido el mismo dia no crea otro registro ni suma XP (AC-12)", async () => {
    const { createHabit, registerCompletion } = await import(
      "./habit-service"
    );

    const created = await createHabit(USER_A, {
      name: "Habito medio",
      difficulty: "MEDIUM",
    });

    const first = await registerCompletion(USER_A, created.id);
    const second = await registerCompletion(USER_A, created.id);

    expect(fakePrisma.getXp(USER_A)).toBe(10);
    expect(fakePrisma.getCompletionsCount()).toBe(1);
    expect(second.id).toBe(first.id);
  });

  it("registerCompletion/updateHabit/deleteHabit sobre un habito de otro usuario lanzan HabitForbiddenError sin modificar nada (AC-13)", async () => {
    const { registerCompletion, updateHabit, deleteHabit, listHabitsForUser } =
      await import("./habit-service");
    const { HabitForbiddenError } = await import("./errors");

    const othersHabit = fakePrisma.seedHabit({
      userId: USER_B,
      name: "Habito de B",
      difficulty: "EASY",
    });

    await expect(
      registerCompletion(USER_A, othersHabit.id),
    ).rejects.toThrow(HabitForbiddenError);
    await expect(
      updateHabit(USER_A, othersHabit.id, { name: "Hackeado" }),
    ).rejects.toThrow(HabitForbiddenError);
    await expect(deleteHabit(USER_A, othersHabit.id)).rejects.toThrow(
      HabitForbiddenError,
    );

    const bList = await listHabitsForUser(USER_B);
    expect(bList).toHaveLength(1);
    expect(bList[0].name).toBe("Habito de B");
    expect(fakePrisma.getXp(USER_A)).toBe(0);
    expect(fakePrisma.getCompletionsCount()).toBe(0);
  });

  it("registerCompletion/updateHabit/deleteHabit sobre un habito inexistente lanzan HabitNotFoundError (AC-13)", async () => {
    const { registerCompletion, updateHabit, deleteHabit } = await import(
      "./habit-service"
    );
    const { HabitNotFoundError } = await import("./errors");

    await expect(registerCompletion(USER_A, "no-existe")).rejects.toThrow(
      HabitNotFoundError,
    );
    await expect(
      updateHabit(USER_A, "no-existe", { name: "x" }),
    ).rejects.toThrow(HabitNotFoundError);
    await expect(deleteHabit(USER_A, "no-existe")).rejects.toThrow(
      HabitNotFoundError,
    );
  });

  it("listHabitsForUser solo devuelve habitos del usuario dado", async () => {
    const { createHabit, listHabitsForUser } = await import(
      "./habit-service"
    );

    await createHabit(USER_A, { name: "De A", difficulty: "EASY" });
    fakePrisma.seedHabit({ userId: USER_B, name: "De B", difficulty: "EASY" });

    const listA = await listHabitsForUser(USER_A);
    const listB = await listHabitsForUser(USER_B);

    expect(listA).toHaveLength(1);
    expect(listA[0].name).toBe("De A");
    expect(listB).toHaveLength(1);
    expect(listB[0].name).toBe("De B");
  });
});
