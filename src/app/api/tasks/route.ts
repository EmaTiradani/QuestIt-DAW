import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/features/users/data/current-user";
import {
  createTask,
  listTasksForUser,
} from "@/features/tasks/domain/task-service";
import { TaskValidationError } from "@/features/tasks/domain/errors";

export async function GET() {
  const userId = await getCurrentUserId();
  const tasks = await listTasksForUser(userId);
  return NextResponse.json(tasks, { status: 200 });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await request.json();

  // `userId` is deliberately never read from the request body (RT-02): it
  // always comes from getCurrentUserId() above.
  try {
    const task = await createTask(userId, {
      title: body.title,
      description: body.description,
      difficulty: body.difficulty,
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof TaskValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
