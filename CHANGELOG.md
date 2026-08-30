# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed

- [FIX-001] Migrar Next.js 14 a 15 (14.2.35 → 15.5.24): resuelve 11 CVEs High sin parche en la
  línea 14.x (Server Components, Server Actions, rewrites, WebSocket upgrades). Adapta los route
  handlers dinámicos de tareas y hábitos al nuevo `params` asíncrono de Next 15. Fuerza además
  las versiones parcheadas de `postcss` y `vite` (dependencias transitivas). `pnpm audit` pasa de
  2 Critical + 13 High a 0 vulnerabilidades.
