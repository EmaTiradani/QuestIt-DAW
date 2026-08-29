import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/features/users/data/current-user";
import { deleteTask, updateTask } from "@/features/tasks/domain/task-service";
import {
  TaskForbiddenError,
  TaskNotFoundError,
  TaskValidationError,
} from "@/features/tasks/domain/errors";

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  const body = await request.json();

  try {
    const task = await updateTask(userId, params.id, {
      title: body.title,
      description: body.description,
      difficulty: body.difficulty,
    });
    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    if (error instanceof TaskValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // TaskNotFoundError and TaskForbiddenError both collapse to 404 so a
    // client cannot distinguish "does not exist" from "exists but is not
    // yours" (threat model RT-02 / information disclosure).
    if (
      error instanceof TaskNotFoundError ||
      error instanceof TaskForbiddenError
    ) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();

  try {
    await deleteTask(userId, params.id);
    return new NextResponse(null, { status: 204 });
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
