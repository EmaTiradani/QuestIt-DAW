"use client";

import type { Task } from "@prisma/client";

export interface TaskItemProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}

export function TaskItem({
  task,
  onComplete,
  onDelete,
  onEdit,
}: TaskItemProps) {
  const isCompleted = task.status === "COMPLETED";

  return (
    <li>
      <span>{task.title}</span>
      <span>{task.difficulty}</span>
      <span>{task.status}</span>
      <button
        type="button"
        disabled={isCompleted}
        onClick={() => onComplete(task.id)}
      >
        Completar
      </button>
      {onEdit !== undefined && (
        <button type="button" onClick={() => onEdit(task)}>
          Editar
        </button>
      )}
      <button type="button" onClick={() => onDelete(task.id)}>
        Eliminar
      </button>
    </li>
  );
}
