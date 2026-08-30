# AGENTS.md — project context

> **DAW template.** Fill in the `[...]` with what is true of YOUR project and delete what does not
> apply. This file describes **the project**; **the process** is DAW's job (phases, gates, when to
> test, when to commit). Do not mix the two: process rules written here compete with the pipeline's.
>
> It is **tool-agnostic on purpose**: Claude Code reads it through the import in `CLAUDE.md`, Codex
> CLI, Copilot CLI, Cursor and OpenCode read it directly, and Gemini CLI gets it through
> `GEMINI.md`. The same file serves whichever tool you open the repo with — which is the point:
> porting the pipeline to another tool must not mean rewriting what your project is.

---

## Language

**Always respond in the language the user writes in.** Write every artifact you produce — PRDs,
specs, ADRs, reports, commit messages, status lines — in that same language, regardless of the
language these instructions are written in.

If this project has a fixed working language, state it here and use it instead:

> Working language: `[e.g. Spanish — write all artifacts in Spanish]`

---

## What this project is

[QuestIt es una app web que centraliza tareas y hábitos, gamificando el progreso del usuario mediante experiencia (XP), niveles y estadísticas.]

**Reference PRD:** `docs/daw/prd/[PRD].md`

---

## Stack

**This is the only place the stack lives.** DAW reads it from here and generates no derived file.
Fill it in even if the repo is empty: without a stack there is nothing to plan or implement against.

If the repo already has code and this section is empty, DAW will detect the stack from your config
files and **propose the text for you to paste here**. You always confirm it.

| Field              | Value                      |
| ------------------ | -------------------------- |
| Language           | [TypeScript]               |
| Runtime            | [Node 18]                  |
| Framework          | [Next.js 15 (Node 18 LTS)] |
| Database           | [PostgreSQL + Prisma]      |
| Linter / formatter | [Prettier]                 |
| Package manager    | [pnpm]                     |
| Install            | pnpm install                |
| Test               | pnpm test                   |
| Typecheck          | npx tsc --noEmit             |

---

## Architecture conventions

**DAW validates your code against this section** during the CODE phase, via `daw-validate-arch`.
Leave it empty and that validation has nothing to compare against, so it stops being worth running.

- **Folder structure:** `src/features/<feature>/` (p. ej. `tasks`, `habits`, `users`) con subcarpetas `ui`, `domain`, `data`. Las rutas de Next.js en `src/app/` solo orquestan (route handlers/páginas finas) y delegan a `src/features/<feature>/`.
- **Layer separation:** la UI y los route handlers nunca llaman a Prisma directamente; siempre pasan por una capa de servicio (`domain/`) con las reglas de negocio (p. ej. cálculo de XP), que a su vez usa un repositorio (`data/`) para la persistencia con Prisma.
- **Error handling:** typed errors; never a silent catch.
- **Naming:** files in kebab-case, components in PascalCase.
- **Dependencies:** no new libraries without justifying them in the spec and justifying them on a the Readme.md file.

---

## Code conventions

- [No `any`. If it is unavoidable, it comes with a comment explaining why.]
- [minimize comments in the code]

---

## What NOT to do in this project

This section is worth its weight in gold: it is where the scars go, the things that already went
wrong once.

- [No implementar nada listado como Fuera de Alcance en el PRD: logros, calendarios externos, app móvil nativa, sincronización con terceros, funcionalidades colaborativas, recomendaciones por IA, notificaciones automáticas.]
- [No cambiar los valores de XP por dificultad (Fácil 5, Media 10, Difícil 20) ni la fórmula de nivel (`Nivel = ⌊XP / 100⌋ + 1`) sin actualizar el PRD.]
- [No exponer tareas, hábitos ni estadísticas de un usuario a otro usuario (cada consulta debe filtrar por el usuario autenticado).]

---

## Domain glossary

The terms specific to your product, so the agent uses them correctly instead of inventing synonyms.

---

> ℹ️ **What does NOT belong in this file, because DAW provides it:** the order work happens in, when
> the spec gets written, when tests run, when to commit, what it takes to move between phases. All
> of that lives in `.daw/` and applies on its own.

<!-- BEGIN DAW (managed by DAW — do not edit by hand) -->

# DAW — Dilux Agentic Workflow

This repo uses **DAW**: an agent-driven development pipeline with the phases
`CLASSIFY → DEFINE → PLAN → CODE → VERIFY → RELEASE`.

Before answering, read `.daw/orchestrator.md` and run its Boot Sequence. It is a strict state
machine: it decides what you are allowed to do based on the phase recorded in `.daw-state.json`.

The project's own context — stack, architecture, domain — is elsewhere in this file. It lives here,
in `AGENTS.md`, and not in any one tool's file, on purpose: it is tool-agnostic and comes along
unchanged when the pipeline is ported to another agent.

<!-- END DAW -->
