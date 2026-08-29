"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task } from "@prisma/client";
import { TaskForm, type TaskFormValues } from "@/features/tasks/ui/task-form";
import { TaskList } from "@/features/tasks/ui/task-list";

// Thin client-side wiring for Block 2's completion criterion ("pnpm dev
// permite crear, editar, completar y eliminar una tarea desde la UI"): fetch
// from /api/tasks and delegate rendering to the feature's own presentational
// components. No design system, no styling framework — NFR-02 only requires
// a usable layout between 360px and 1920px.
export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    const response = await fetch("/api/tasks");
    if (!response.ok) {
      setError("No se pudieron cargar las tareas.");
      return;
    }
    const data = (await response.json()) as Task[];
    setTasks(data);
    setError(null);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleCreate(values: TaskFormValues) {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError("No se pudo crear la tarea.");
      return;
    }
    await loadTasks();
  }

  async function handleUpdate(values: TaskFormValues) {
    if (editingTask === null) {
      return;
    }
    const response = await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError("No se pudo actualizar la tarea.");
      return;
    }
    setEditingTask(null);
    await loadTasks();
  }

  async function handleComplete(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
    });
    if (!response.ok) {
      setError("No se pudo completar la tarea.");
      return;
    }
    await loadTasks();
  }

  async function handleDelete(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("No se pudo eliminar la tarea.");
      return;
    }
    await loadTasks();
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "40rem",
        margin: "0 auto",
        padding: "1rem",
      }}
    >
      <h1>Mis tareas</h1>
      {error !== null && <p role="alert">{error}</p>}
      {editingTask === null ? (
        <TaskForm onSubmit={handleCreate} submitLabel="Crear tarea" />
      ) : (
        <>
          <TaskForm
            key={editingTask.id}
            initialValues={{
              title: editingTask.title,
              description: editingTask.description ?? undefined,
              difficulty: editingTask.difficulty,
            }}
            onSubmit={handleUpdate}
            submitLabel="Guardar cambios"
          />
          <button type="button" onClick={() => setEditingTask(null)}>
            Cancelar edición
          </button>
        </>
      )}
      <TaskList
        tasks={tasks}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onEdit={setEditingTask}
      />
    </main>
  );
}
