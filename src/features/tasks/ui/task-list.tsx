"use client";

import type { Task } from "@prisma/client";
import { TaskItem } from "./task-item";

export interface TaskListProps {
  tasks: Task[];
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}

export function TaskList({ tasks, onComplete, onDelete, onEdit }: TaskListProps) {
  if (tasks.length === 0) {
    return <p>No hay tareas todavia.</p>;
  }

  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onComplete={onComplete}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}
