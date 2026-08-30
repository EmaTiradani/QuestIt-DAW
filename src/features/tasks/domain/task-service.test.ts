import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Difficulty, Task } from "@prisma/client";

// The Prisma singleton is mocked with an in-memory fake: this block's tests
// do not require a live database connection. The fake implements just enough
// of the Prisma Client surface (`task.*`, `user.update`, `$transaction`) for
// task-service and task-repository to run against it unmodified, including
// the atomic `updateMany({ where: { status: 'PENDING' } })` semantics that
// `completeTask` relies on to avoid the RT-01 race condition.
function createFakePrisma() {
  let tasks: Task[] = [];
  let idSeq = 0;
  const xpByUser = new Map<string, number>();

  type TaskRow = Task;

  function findTask(id: string): TaskRow | undefined {
    return tasks.find((t) => t.id === id);
  }

  interface FakePrismaClient {
    task: {
      findUnique: (args: { where: { id: string } }) => Promise<TaskRow | null>;
      findUniqueOrThrow: (args: { where: { id: string } }) => Promise<TaskRow>;
      findMany: (args: { where: { userId: string } }) => Promise<TaskRow[]>;
      create: (args: {
        data: {
          userId: string;
          title: string;
          description: string | null;
          difficulty: Difficulty;
        };
      }) => Promise<TaskRow>;
      update: (args: {
        where: { id: string };
        data: Partial<TaskRow>;
      }) => Promise<TaskRow>;
      delete: (args: { where: { id: string } }) => Promise<void>;
      updateMany: (args: {
        where: { id: string; status: string };
        data: Partial<TaskRow>;
      }) => Promise<{ count: number }>;
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
    task: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        findTask(id) ?? null,
      findUniqueOrThrow: async ({
        where: { id },
      }: {
        where: { id: string };
      }) => {
        const task = findTask(id);
        if (!task) throw new Error(`Task ${id} not found`);
        return task;
      },
      findMany: async ({ where: { userId } }: { where: { userId: string } }) =>
        tasks.filter((t) => t.userId === userId),
      create: async ({
        data,
      }: {
        data: {
          userId: string;
          title: string;
          description: string | null;
          difficulty: Difficulty;
        };
      }) => {
        idSeq += 1;
        const task: TaskRow = {
          id: `task-${idSeq}`,
          userId: data.userId,
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          status: "PENDING",
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        tasks.push(task);
        return task;
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Partial<TaskRow>;
      }) => {
        const idx = tasks.findIndex((t) => t.id === id);
        if (idx === -1) throw new Error(`Task ${id} not found`);
        tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date() };
        return tasks[idx];
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        tasks = tasks.filter((t) => t.id !== id);
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; status: string };
        data: Partial<TaskRow>;
      }) => {
        const idx = tasks.findIndex(
          (t) => t.id === where.id && t.status === where.status,
        );
        if (idx === -1) return { count: 0 };
        tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date() };
        return { count: 1 };
      },
    },
    user: {
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: { xp: { increment: number } };
      }) => {
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
    seedTask: (task: Partial<TaskRow> & { userId: string }) => {
      idSeq += 1;
      const full: TaskRow = {
        id: task.id ?? `task-${idSeq}`,
        userId: task.userId,
        title: task.title ?? "Seed task",
        description: task.description ?? null,
        difficulty: task.difficulty ?? "EASY",
        status: task.status ?? "PENDING",
        completedAt: task.completedAt ?? null,
        createdAt: task.createdAt ?? new Date(),
        updatedAt: task.updatedAt ?? new Date(),
      };
      tasks.push(full);
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

describe("task-service", () => {
  it("createTask guarda la tarea y aparece en listTasksForUser (AC-01)", async () => {
    const { createTask, listTasksForUser } = await import("./task-service");

    const created = await createTask(USER_A, {
      title: "Comprar leche",
      description: "2 litros",
      difficulty: "EASY",
    });

    const list = await listTasksForUser(USER_A);

    expect(created.title).toBe("Comprar leche");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it("createTask rechaza title vacio o difficulty invalida (AC-02)", async () => {
    const { createTask } = await import("./task-service");

    await expect(
      createTask(USER_A, { title: "", difficulty: "EASY" }),
    ).rejects.toThrow();

    await expect(
      createTask(USER_A, {
        title: "Valida",
        // @ts-expect-error -- intentionally invalid difficulty for the test
        difficulty: "IMPOSSIBLE",
      }),
    ).rejects.toThrow();
  });

  it("updateTask refleja los campos actualizados (AC-03)", async () => {
    const { createTask, updateTask } = await import("./task-service");

    const created = await createTask(USER_A, {
      title: "Original",
      difficulty: "EASY",
    });

    const updated = await updateTask(USER_A, created.id, {
      title: "Actualizada",
      difficulty: "HARD",
    });

    expect(updated.title).toBe("Actualizada");
    expect(updated.difficulty).toBe("HARD");
  });

  it("deleteTask hace que la tarea deje de aparecer en listTasksForUser (AC-04)", async () => {
    const { createTask, deleteTask, listTasksForUser } =
      await import("./task-service");

    const created = await createTask(USER_A, {
      title: "Borrame",
      difficulty: "EASY",
    });

    await deleteTask(USER_A, created.id);

    const list = await listTasksForUser(USER_A);
    expect(list).toHaveLength(0);
  });

  it("completeTask marca completada y suma XP correcta segun dificultad (AC-05)", async () => {
    const { createTask, completeTask } = await import("./task-service");

    const created = await createTask(USER_A, {
      title: "Tarea dificil",
      difficulty: "HARD",
    });

    const completed = await completeTask(USER_A, created.id);

    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
    expect(fakePrisma.getXp(USER_A)).toBe(20);
  });

  it("completeTask sobre una tarea ya completada no suma XP ni cambia el registro (AC-06)", async () => {
    const { createTask, completeTask } = await import("./task-service");

    const created = await createTask(USER_A, {
      title: "Tarea media",
      difficulty: "MEDIUM",
    });

    const firstCompletion = await completeTask(USER_A, created.id);
    const secondCompletion = await completeTask(USER_A, created.id);

    expect(fakePrisma.getXp(USER_A)).toBe(10);
    expect(secondCompletion.status).toBe("COMPLETED");
    expect(secondCompletion.completedAt?.getTime()).toBe(
      firstCompletion.completedAt?.getTime(),
    );
  });

  it("completeTask llamado dos veces concurrentemente sobre la misma tarea PENDING otorga XP exactamente una vez (RT-01)", async () => {
    const { createTask, completeTask } = await import("./task-service");

    const created = await createTask(USER_A, {
      title: "Tarea concurrente",
      difficulty: "MEDIUM",
    });

    const [resultA, resultB] = await Promise.all([
      completeTask(USER_A, created.id),
      completeTask(USER_A, created.id),
    ]);

    expect(fakePrisma.getXp(USER_A)).toBe(10);
    expect(resultA.status).toBe("COMPLETED");
    expect(resultB.status).toBe("COMPLETED");
  });

  it("completeTask/updateTask/deleteTask sobre una tarea de otro usuario lanzan TaskForbiddenError sin modificar nada (AC-13)", async () => {
    const { completeTask, updateTask, deleteTask, listTasksForUser } =
      await import("./task-service");
    const { TaskForbiddenError } = await import("./errors");

    const othersTask = fakePrisma.seedTask({
      userId: USER_B,
      title: "Tarea de B",
      difficulty: "EASY",
    });

    await expect(completeTask(USER_A, othersTask.id)).rejects.toThrow(
      TaskForbiddenError,
    );
    await expect(
      updateTask(USER_A, othersTask.id, { title: "Hackeada" }),
    ).rejects.toThrow(TaskForbiddenError);
    await expect(deleteTask(USER_A, othersTask.id)).rejects.toThrow(
      TaskForbiddenError,
    );

    const bList = await listTasksForUser(USER_B);
    expect(bList).toHaveLength(1);
    expect(bList[0].title).toBe("Tarea de B");
    expect(bList[0].status).toBe("PENDING");
    expect(fakePrisma.getXp(USER_A)).toBe(0);
  });

  it("completeTask/updateTask/deleteTask sobre una tarea inexistente lanzan TaskNotFoundError (AC-13)", async () => {
    const { completeTask, updateTask, deleteTask } =
      await import("./task-service");
    const { TaskNotFoundError } = await import("./errors");

    await expect(completeTask(USER_A, "no-existe")).rejects.toThrow(
      TaskNotFoundError,
    );
    await expect(
      updateTask(USER_A, "no-existe", { title: "x" }),
    ).rejects.toThrow(TaskNotFoundError);
    await expect(deleteTask(USER_A, "no-existe")).rejects.toThrow(
      TaskNotFoundError,
    );
  });

  it("listTasksForUser solo devuelve tareas del usuario dado (AC-14)", async () => {
    const { createTask, listTasksForUser } = await import("./task-service");

    await createTask(USER_A, { title: "De A", difficulty: "EASY" });
    fakePrisma.seedTask({ userId: USER_B, title: "De B", difficulty: "EASY" });

    const listA = await listTasksForUser(USER_A);
    const listB = await listTasksForUser(USER_B);

    expect(listA).toHaveLength(1);
    expect(listA[0].title).toBe("De A");
    expect(listB).toHaveLength(1);
    expect(listB[0].title).toBe("De B");
  });
});
