import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/features/users/data/current-user";
import { completeTask } from "@/features/tasks/domain/task-service";
import {
  TaskForbiddenError,
  TaskNotFoundError,
} from "@/features/tasks/domain/errors";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();

  try {
    const task = await completeTask(userId, params.id);
    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    if (
      error instanceof TaskNotFoundError ||
      error instanceof TaskForbiddenError
    ) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    throw error;
  }
}
