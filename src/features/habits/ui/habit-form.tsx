"use client";

import { useState } from "react";
import type { Difficulty } from "@prisma/client";

export interface HabitFormValues {
  name: string;
  difficulty: Difficulty;
}

export interface HabitFormProps {
  initialValues?: HabitFormValues;
  onSubmit: (values: HabitFormValues) => void;
  submitLabel?: string;
}

const DIFFICULTY_OPTIONS: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export function HabitForm({
  initialValues,
  onSubmit,
  submitLabel = "Guardar",
}: HabitFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialValues?.difficulty ?? "EASY",
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ name, difficulty });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Nombre
        <input
          type="text"
          value={name}
          maxLength={100}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Dificultad
        <select
          value={difficulty}
          onChange={(event) =>
            setDifficulty(event.target.value as Difficulty)
          }
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
