"use client";

import { useState } from "react";
import type { Difficulty } from "@prisma/client";

export interface TaskFormValues {
  title: string;
  description?: string;
  difficulty: Difficulty;
}

export interface TaskFormProps {
  initialValues?: TaskFormValues;
  onSubmit: (values: TaskFormValues) => void;
  submitLabel?: string;
}

const DIFFICULTY_OPTIONS: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export function TaskForm({
  initialValues,
  onSubmit,
  submitLabel = "Guardar",
}: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialValues?.difficulty ?? "EASY",
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      title,
      description: description.length > 0 ? description : undefined,
      difficulty,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Titulo
        <input
          type="text"
          value={title}
          maxLength={200}
          required
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label>
        Descripcion
        <textarea
          value={description}
          maxLength={2000}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label>
        Dificultad
        <select
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value as Difficulty)}
        >
          {DIFFICULTY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
