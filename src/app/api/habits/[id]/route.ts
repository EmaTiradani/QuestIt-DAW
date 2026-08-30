import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/features/users/data/current-user";
import {
  deleteHabit,
  updateHabit,
} from "@/features/habits/domain/habit-service";
import {
  HabitForbiddenError,
  HabitNotFoundError,
  HabitValidationError,
} from "@/features/habits/domain/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await request.json();

  try {
    const habit = await updateHabit(userId, id, {
      name: body.name,
      difficulty: body.difficulty,
    });
    return NextResponse.json(habit, { status: 200 });
  } catch (error) {
    if (error instanceof HabitValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // HabitNotFoundError and HabitForbiddenError both collapse to 404 so a
    // client cannot distinguish "does not exist" from "exists but is not
    // yours" (threat model RT-02 / information disclosure).
    if (
      error instanceof HabitNotFoundError ||
      error instanceof HabitForbiddenError
    ) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  try {
    await deleteHabit(userId, id);
    return new NextResponse(null, { status: 204 });
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
