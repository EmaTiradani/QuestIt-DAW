import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/features/users/data/current-user";
import { registerCompletion } from "@/features/habits/domain/habit-service";
import {
  HabitForbiddenError,
  HabitNotFoundError,
} from "@/features/habits/domain/errors";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();

  try {
    const completion = await registerCompletion(userId, params.id);
    return NextResponse.json(
      {
        habitId: completion.habitId,
        date: completion.date,
        xpAwarded: completion.xpAwarded,
      },
      { status: 200 },
    );
  } catch (error) {
    if (
      error instanceof HabitNotFoundError ||
      error instanceof HabitForbiddenError
    ) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }
    throw error;
  }
}
