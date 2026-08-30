# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- [FEAT-001] Gestión de tareas y hábitos: crear, editar, eliminar y marcar tareas como
  completadas; crear, editar, eliminar hábitos y registrar su cumplimiento diario. Completar una
  tarea o registrar el cumplimiento de un hábito otorga XP automáticamente según la dificultad
  (Fácil 5, Media 10, Difícil 20), acumulado en `User.xp`. Aislamiento estricto por usuario:
  ninguna operación expone o modifica datos de otro usuario. Idempotente ante reintentos
  (completar dos veces, registrar cumplimiento dos veces el mismo día no otorgan XP adicional).
  Autenticación real, nivel/estadísticas y objetivos/logros quedan fuera de alcance de este
  ticket (ver `docs/daw/prd/prd-FEAT-001.md`).

### Fixed

- [FIX-001] Migrar Next.js 14 a 15 (14.2.35 → 15.5.24): resuelve 11 CVEs High sin parche en la
  línea 14.x (Server Components, Server Actions, rewrites, WebSocket upgrades). Adapta los route
  handlers dinámicos de tareas y hábitos al nuevo `params` asíncrono de Next 15. Fuerza además
  las versiones parcheadas de `postcss` y `vite` (dependencias transitivas). `pnpm audit` pasa de
  2 Critical + 13 High a 0 vulnerabilidades.
