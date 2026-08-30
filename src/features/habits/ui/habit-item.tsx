"use client";

import type { Habit } from "@prisma/client";

export interface HabitItemProps {
  habit: Habit;
  onComplete: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onEdit?: (habit: Habit) => void;
}

export function HabitItem({
  habit,
  onComplete,
  onDelete,
  onEdit,
}: HabitItemProps) {
  return (
    <li>
      <span>{habit.name}</span>
      <span>{habit.difficulty}</span>
      <button type="button" onClick={() => onComplete(habit.id)}>
        Marcar cumplido hoy
      </button>
      {onEdit !== undefined && (
        <button type="button" onClick={() => onEdit(habit)}>
          Editar
        </button>
      )}
      <button type="button" onClick={() => onDelete(habit.id)}>
        Eliminar
      </button>
    </li>
  );
}
