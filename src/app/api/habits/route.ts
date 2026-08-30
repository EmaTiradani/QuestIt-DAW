import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/features/users/data/current-user";
import {
  createHabit,
  listHabitsForUser,
} from "@/features/habits/domain/habit-service";
import { HabitValidationError } from "@/features/habits/domain/errors";

export async function GET() {
  const userId = await getCurrentUserId();
  const habits = await listHabitsForUser(userId);
  return NextResponse.json(habits, { status: 200 });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await request.json();

  // `userId` is deliberately never read from the request body (RT-02): it
  // always comes from getCurrentUserId() above.
  try {
    const habit = await createHabit(userId, {
      name: body.name,
      difficulty: body.difficulty,
    });
    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    if (error instanceof HabitValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
