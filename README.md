# QuestIt

QuestIt centraliza tareas y hábitos, gamificando el progreso del usuario mediante experiencia
(XP), niveles y estadísticas. Ver `docs/daw/prd/PRD.md` para el contexto de producto y
`docs/daw/prd/prd-FEAT-001.md` / `docs/daw/specs/spec-FEAT-001.md` para el alcance de esta feature.

## Stack

- TypeScript, Node 18
- Next.js 14 (App Router)
- PostgreSQL + Prisma
- pnpm

## Setup

1. Instalar dependencias:

   ```bash
   pnpm install
   ```

2. Copiar `.env.example` a `.env` y completar `DATABASE_URL` (una base PostgreSQL accesible; se
   requiere `sslmode=require` porque `User.email` es PII y la conexión debe ir cifrada en
   tránsito):

   ```bash
   cp .env.example .env
   ```

3. Aplicar las migraciones y sembrar el usuario seed (no hay autenticación todavía; toda
   tarea/hábito creado en este ticket queda asociado a este usuario — ver
   `src/features/users/data/current-user.ts`):

   ```bash
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

4. Levantar el entorno de desarrollo:

   ```bash
   pnpm dev
   ```

## Tests

```bash
pnpm test
```

### Por qué Vitest y no Jest

Se introduce **Vitest** como dependencia nueva de testing, en lugar de Jest, por:

- Integración nativa con el toolchain de Vite/Next.js, sin necesidad de configurar transformadores
  adicionales para TypeScript/ESM (Jest sí los requiere en este stack).
- Soporte de ESM out-of-the-box, evitando la configuración manual que Jest necesita para módulos
  ESM en un proyecto `"type": "module"`.
- Modo watch más rápido, al reutilizar el mismo pipeline de transformación que el resto del
  proyecto en lugar de uno propio.

## Estructura

```
src/
  app/                    # Rutas de Next.js (App Router) — finas, delegan a features/
  features/
    <feature>/
      ui/                 # Componentes React
      domain/             # Reglas de negocio (servicios)
      data/                # Acceso a datos (Prisma)
  lib/
    prisma.ts             # Prisma Client singleton
prisma/
  schema.prisma
  seed.ts
```

`src/features/users/` es una excepción intencional a `ui/domain/data`: solo contiene
`data/current-user.ts`, un stub temporal que identifica al usuario seed hasta que exista un ticket
de autenticación real.
