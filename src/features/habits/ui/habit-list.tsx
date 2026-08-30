"use client";

import type { Habit } from "@prisma/client";
import { HabitItem } from "./habit-item";

export interface HabitListProps {
  habits: Habit[];
  onComplete: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onEdit?: (habit: Habit) => void;
}

export function HabitList({
  habits,
  onComplete,
  onDelete,
  onEdit,
}: HabitListProps) {
  if (habits.length === 0) {
    return <p>No hay habitos todavia.</p>;
  }

  return (
    <ul>
      {habits.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          onComplete={onComplete}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}
