# Spec FEAT-001: Gestión de Tareas y Hábitos

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| PRD | docs/daw/prd/prd-FEAT-001.md |
| Tier | FEATURE |
| Date | 2026-08-29 |
| Spec loops | 0 |

## Summary

Se scaffoldea un proyecto Next.js 14 (App Router) + TypeScript + Prisma/PostgreSQL desde cero. Se
modela `User`, `Task`, `Habit` y `HabitCompletion` en Prisma. Cada feature (`tasks`, `habits`) sigue
`ui/domain/data`: la UI y los route handlers nunca tocan Prisma, siempre pasan por un servicio de
dominio que aplica las reglas de negocio (idempotencia, XP, aislamiento por usuario) y delega la
persistencia a un repositorio. La escritura de `User.xp` tiene un único dueño:
`users/data/user-repository.ts::incrementXp`, invocado dentro de la misma transacción Prisma que
completa la tarea o registra el cumplimiento del hábito — nunca desde `task-repository` ni
`habit-repository` directamente.

No hay autenticación real todavía: `src/features/users/` solo tiene `data/current-user.ts`
(`getCurrentUserId()`), sin `domain/` ni `ui/`. Es una desviación intencional y temporal de la
convención `ui/domain/data`: `users` no es una feature completa en este ticket, es un stub que
identifica al usuario seed hasta que exista un ticket de autenticación (RF-01 a RF-03, fuera de
alcance de FEAT-001 según su PRD).

El cálculo y la visualización del nivel del usuario (`Nivel = ⌊XP / 100⌋ + 1`) y las estadísticas
agregadas del panel (RF-13 a RF-17) están explícitamente fuera de alcance de este ticket: se
almacena el acumulado de XP (`User.xp`), pero ningún bloque calcula ni expone el nivel. Es trabajo
de un ticket futuro sobre el mismo dato ya persistido aquí.

Se introduce **Vitest** como framework de test (nueva dependencia): se justifica por su integración
nativa con Vite/Next.js, soporte ESM sin configuración adicional y velocidad de ejecución en modo
watch, frente a Jest que requiere transformadores adicionales para ESM/TypeScript en este stack. Se
documenta también en el `README.md` del proyecto (creado en el Bloque 1).

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 2 |
| FR-02 | Block 2 |
| FR-03 | Block 2 |
| FR-04 | Block 2 |
| FR-05 | Block 1 (User.xp, incrementXp), Block 2 (completeTask) |
| FR-06 | Block 2 |
| FR-07 | Block 3 |
| FR-08 | Block 3 |
| FR-09 | Block 3 |
| FR-10 | Block 3 |
| FR-11 | Block 1 (User.xp, incrementXp), Block 3 (registerCompletion) |
| FR-12 | Block 3 |
| FR-13 | Block 2, Block 3 (filtrado por userId en cada repositorio) |
| FR-14 | Block 2, Block 3 (ownership check en cada domain service) |
| FR-15 | Block 1 (schema Prisma), Block 2, Block 3 |
| NFR-01 | Strategy: consultas indexadas por `userId` (índice FK implícito) y transacciones cortas; sin operaciones de red adicionales bloqueantes en el camino de completar/crear |
| NFR-02 | Strategy: componentes UI con CSS responsive (flex/grid, unidades relativas), verificado manualmente en Bloques 2 y 3 entre 360px y 1920px |
| NFR-03 | Strategy: toda mutación pasa por una transacción Prisma (ACID); no hay estado en memoria que no se persista antes de responder al cliente |

## Dependencies between blocks

Block 1 → Block 2 → Block 3 (secuencial). Block 2 y Block 3 dependen del schema y del
`user-repository.ts` de Block 1. Block 3 no depende de Block 2 (son features independientes una vez
existe Block 1), pero se implementan en ese orden por ser el orden de las siglas del ticket.

## Block 1 — Scaffolding: proyecto, Prisma, usuario seed

**Files**
- `package.json` (new) — proyecto Next.js 14 + TypeScript, scripts `dev`/`build`/`test`
- `tsconfig.json` (new) — `strict: true`
- `next.config.js` (new)
- `.gitignore` (modified) — agrega `node_modules`, `.next`, `.env`, `.env*.local`,
  `*.tsbuildinfo`, `prisma/generated` (si se usa un output custom de Prisma Client)
- `.env.example` (new) — documenta `DATABASE_URL` (debe incluir `sslmode=require` — `User.email`
  es PII y la conexión a la base debe ir cifrada en tránsito; el cifrado en reposo queda a cargo
  del proveedor de hosting de PostgreSQL, ver modelo de amenazas)
- `prisma/schema.prisma` (new) — modelos `User`, `Task`, `Habit`, `HabitCompletion`
- `prisma/seed.ts` (new) — crea un `User` seed
- `src/lib/prisma.ts` (new) — Prisma Client singleton (evita múltiples instancias en dev/hot-reload)
- `src/features/users/data/current-user.ts` (new) — `getCurrentUserId(): Promise<string>`, devuelve
  el id del usuario seed. Comentario explícito: temporal hasta el ticket de autenticación.
- `src/features/users/data/user-repository.ts` (new) — `incrementXp(tx, userId, amount): Promise<void>`,
  recibe un cliente/transacción Prisma como parámetro (no abre su propia transacción: la abre quien
  orquesta — `task-service`/`habit-service`)
- `README.md` (new) — instrucciones de setup, y la justificación de Vitest como dependencia nueva
- `vitest.config.ts` (new)

**Logic**
El schema define:
- `User { id, email, xp Int @default(0), createdAt }`
- `Task { id, userId, title, description, difficulty TaskDifficulty, status TaskStatus @default(PENDING), completedAt DateTime?, createdAt, updatedAt }` con `enum TaskDifficulty { EASY MEDIUM HARD }` y `enum TaskStatus { PENDING COMPLETED }`
- `Habit { id, userId, name, difficulty HabitDifficulty, createdAt, updatedAt }` (mismo enum de
  dificultad reutilizado o uno propio — se reutiliza `TaskDifficulty` renombrado a `Difficulty`
  para evitar duplicar el enum, ya que los valores son idénticos en ambas entidades)
- `HabitCompletion { id, habitId, date DateTime @db.Date, xpAwarded Int, createdAt, @@unique([habitId, date]) }`

`incrementXp` NO es un servicio de dominio: es un repositorio puro (una sentencia `prisma.user.update`
sobre `xp`, usando `{ increment: amount }`). La regla de negocio ("qué XP corresponde a qué
dificultad") vive en `task-service`/`habit-service` (Bloques 2 y 3), no aquí — este bloque solo
provee el mecanismo de escritura.

**Data model**
- `User.xp`: `Int`, default `0`, nunca negativo (no se decrementa en este ticket).
- `Task.userId`, `Habit.userId`: FK a `User.id`, `onDelete: Cascade` (borrar un usuario borra sus
  tareas/hábitos — no aplica todavía porque no hay borrado de usuario, pero es la restricción de
  integridad correcta).
- `HabitCompletion` único por `(habitId, date)`: la constraint de base de datos es la que garantiza
  RN-06/FR-12, no solo la lógica de aplicación.

**Error handling**
- Este bloque no implementa lógica de negocio propia: no documenta errores de aplicación bajo
  F-SPEC-10. La falta de `DATABASE_URL` es un fallo de arranque de Prisma (fail-fast, sin captura
  ni mensaje custom) — comportamiento de la librería, no una condición que este bloque maneje ni
  que requiera un test dedicado.

**Required tests**
- [ ] `prisma/schema.prisma` migra sin errores (`prisma migrate dev`) — validado manualmente, no es
  un test automatizado
- [ ] `user-repository.test.ts`: `incrementXp` suma correctamente al valor existente de `xp`
- [ ] `user-repository.test.ts`: `incrementXp` no rompe si se llama dos veces en la misma
  transacción con montos distintos (suma ambos, no sobrescribe)

**Rollback / migración inversa**
Esta es la migración inicial de un esquema sin datos en producción todavía: revertirla es
`prisma migrate reset` (o eliminar la migración y la base de desarrollo). No aplica un plan de
rollback de datos porque no hay datos previos que preservar en este ticket.

**Completion criterion**
`pnpm install && pnpm prisma migrate dev && pnpm prisma db seed` corren sin error; existe un
`User` en la base con `xp = 0`; `pnpm test` ejecuta (aunque solo tenga el test de `incrementXp`) y
pasa.

## Block 2 — Feature Tareas

**Files**
- `src/features/tasks/domain/task-service.ts` (new) — `createTask`, `updateTask`, `deleteTask`,
  `completeTask`, `listTasksForUser`
- `src/features/tasks/domain/errors.ts` (new) — `TaskNotFoundError`, `TaskForbiddenError` (typed
  errors, extienden `Error`)
- `src/features/tasks/data/task-repository.ts` (new) — CRUD de `Task` en Prisma, todas las lecturas
  y escrituras filtradas por `userId`
- `src/features/tasks/ui/task-list.tsx` (new) — exporta `TaskList`
- `src/features/tasks/ui/task-form.tsx` (new) — exporta `TaskForm` (crear/editar)
- `src/features/tasks/ui/task-item.tsx` (new) — exporta `TaskItem` (botones completar/eliminar)
- `src/app/api/tasks/route.ts` (new) — `GET` (lista), `POST` (crear)
- `src/app/api/tasks/[id]/route.ts` (new) — `PATCH` (editar), `DELETE`
- `src/app/api/tasks/[id]/complete/route.ts` (new) — `POST` (completar)
- `src/features/tasks/domain/task-service.test.ts` (new)

**Logic**
`XP_BY_DIFFICULTY = { EASY: 5, MEDIUM: 10, HARD: 20 }` vive en `task-service.ts` (se duplica
literalmente en `habit-service.ts` en Block 3 por ahora — ambos son de solo 3 líneas y una
abstracción compartida prematura no se justifica con dos usos; si aparece un tercer lugar, se
extrae a `src/features/shared/difficulty.ts`).

`completeTask(userId, taskId)`:
1. Busca la tarea por `id`. Si no existe → `TaskNotFoundError`.
2. Si `task.userId !== userId` → `TaskForbiddenError` (no se filtra por userId en el `WHERE` para
   poder distinguir "no existe" de "no es tuya" — ambos casos, sin embargo, se traducen al mismo
   código HTTP 404 en el route handler, para no filtrar por respuesta la existencia de tareas
   ajenas).
3. Dentro de una transacción Prisma: ejecuta un `UPDATE` condicional atómico —
   `UPDATE Task SET status='COMPLETED', completedAt=now() WHERE id=:taskId AND status='PENDING'`
   (vía `prisma.task.updateMany({ where: { id, status: 'PENDING' }, data: {...} })`) — **no** un
   "leer estado y luego escribir". Si `count === 0`, la tarea ya estaba completada: no-op, no se
   llama a `incrementXp` (idempotencia, RN-07/FR-06). Si `count === 1`, recién ahí llama a
   `user-repository.incrementXp(tx, userId, XP_BY_DIFFICULTY[difficulty])`.
   **Razón (ver modelo de amenazas):** un patrón "leer → decidir → escribir" permite que dos
   requests concurrentes al mismo `completeTask` lean ambos `PENDING` antes de que cualquiera
   escriba, y ambos otorguen XP — el `UPDATE ... WHERE status='PENDING'` hace que solo uno de los
   dos requests concurrentes afecte una fila, sin necesidad de locks explícitos.

`createTask`/`updateTask` validan: `title` no vacío (máx. 200 caracteres), `description` opcional
(máx. 2000 caracteres), `difficulty` ∈ {EASY, MEDIUM, HARD}. `updateTask`/`deleteTask` aplican el
mismo chequeo de ownership que `completeTask`.

**API contract**

**Auth (aplica a los 5 endpoints de este bloque):** todos resuelven el usuario actual vía
`getCurrentUserId()` (stub, sin credenciales todavía — ver Bloque 1) y todas las operaciones de
lectura/escritura se filtran o verifican contra ese `userId`. No hay capa de autenticación HTTP en
este ticket (RF-01 a RF-03 fuera de alcance); el código 401 se documenta como reservado para cuando
exista. **`userId` nunca se lee del body/params de la request** en ningún endpoint — siempre viene
de `getCurrentUserId()` del lado servidor, para que un cliente no pueda pasar el `userId` de otro
usuario y operar en su nombre (hallazgo del modelo de amenazas).

- `POST /api/tasks`
  - Request: `{ title: string, description?: string, difficulty: "EASY"|"MEDIUM"|"HARD" }`
  - Response 201: `{ id, title, description, difficulty, status, createdAt }`
  - Errores: 400 (validación), 401 (reservado, sin uso todavía)
- `GET /api/tasks` → 200: `Task[]` del usuario actual; Errores: 401 (reservado)
- `PATCH /api/tasks/[id]`
  - Request: `{ title?, description?, difficulty? }`
  - Response 200: tarea actualizada
  - Errores: 400, 404 (no existe o no es tuya), 401 (reservado)
- `DELETE /api/tasks/[id]` → 204; Errores: 404, 401 (reservado)
- `POST /api/tasks/[id]/complete` → 200: tarea con `status="COMPLETED"`; Errores: 404 (no existe/no
  es tuya), 401 (reservado); idempotente (repetir la llamada devuelve 200 sin cambios ni XP
  adicional, nunca error)

**Data model**
Sin cambios sobre Block 1.

**Input validation**
`title`: string, 1–200 caracteres. `description`: string, 0–2000 caracteres. `difficulty`: enum
estricto, rechaza cualquier valor fuera de las tres opciones.

**Error handling**
`TaskNotFoundError`/`TaskForbiddenError` se capturan en el route handler y se traducen a 404 (nunca
403, para no revelar existencia). Ningún `catch` silencioso: todo error no tipado se re-lanza.

**Required tests**
- [ ] `createTask` guarda la tarea y aparece en `listTasksForUser` — valida AC-01
- [ ] `createTask` rechaza `title` vacío o `difficulty` inválida — valida AC-02
- [ ] `updateTask` refleja los campos actualizados — valida AC-03
- [ ] `deleteTask` hace que la tarea deje de aparecer en `listTasksForUser` — valida AC-04
- [ ] `completeTask` marca completada y suma XP correcta según dificultad — valida AC-05
- [ ] `completeTask` sobre una tarea ya completada no suma XP ni cambia el registro — valida AC-06
- [ ] `completeTask` llamado dos veces concurrentemente sobre la misma tarea PENDING otorga XP
  exactamente una vez (usa el `updateMany` condicional, no una condición de carrera) — valida
  AC-06 bajo concurrencia (hallazgo del modelo de amenazas, ver
  `docs/daw/security/threat-FEAT-001.md`)
- [ ] `completeTask`/`updateTask`/`deleteTask` sobre una tarea de otro usuario lanzan
  `TaskForbiddenError`/`TaskNotFoundError` sin modificar nada — valida AC-13
- [ ] `listTasksForUser` solo devuelve tareas del usuario dado — valida AC-14 (parcial)

**Completion criterion**
`pnpm test src/features/tasks` pasa; `pnpm dev` permite crear, editar, completar y eliminar una
tarea desde la UI contra la base local.

## Block 3 — Feature Hábitos

**Files**
- `src/features/habits/domain/habit-service.ts` (new) — `createHabit`, `updateHabit`,
  `deleteHabit`, `registerCompletion`, `listHabitsForUser`
- `src/features/habits/domain/errors.ts` (new) — `HabitNotFoundError`, `HabitForbiddenError`
- `src/features/habits/data/habit-repository.ts` (new) — CRUD de `Habit` y `HabitCompletion`,
  filtrado por `userId`
- `src/features/habits/ui/habit-list.tsx` (new) — exporta `HabitList`
- `src/features/habits/ui/habit-form.tsx` (new) — exporta `HabitForm`
- `src/features/habits/ui/habit-item.tsx` (new) — exporta `HabitItem` (botón "marcar cumplido hoy",
  eliminar)
- `src/app/api/habits/route.ts` (new) — `GET`, `POST`
- `src/app/api/habits/[id]/route.ts` (new) — `PATCH`, `DELETE`
- `src/app/api/habits/[id]/complete/route.ts` (new) — `POST` (registra cumplimiento del día actual)
- `src/features/habits/domain/habit-service.test.ts` (new)

**Logic**
`registerCompletion(userId, habitId)`:
1. Busca el hábito por `id`. Si no existe → `HabitNotFoundError`; si `habit.userId !== userId` →
   `HabitForbiddenError`.
2. Calcula la fecha actual (solo fecha calendario, sin hora, en UTC — ver "Riesgo" abajo).
3. Dentro de una transacción Prisma: intenta `create` en `HabitCompletion` con
   `(habitId, date)`. Si viola la constraint única (ya existe registro para ese día) → captura el
   error específico de Prisma (`P2002`) y devuelve el registro existente sin otorgar XP adicional
   (idempotencia, RN-06/FR-12) — la constraint de base de datos es la fuente de verdad ante
   condiciones de carrera, no un `SELECT` previo.
4. Si el `create` tuvo éxito → llama a `user-repository.incrementXp(tx, userId,
   XP_BY_DIFFICULTY[habit.difficulty])`.

**API contract**

**Auth (aplica a los 5 endpoints de este bloque):** mismo criterio que Bloque 2 —
`getCurrentUserId()`, sin capa de autenticación HTTP en este ticket; 401 reservado; `userId` nunca
se lee del body/params de la request.

- `POST /api/habits`
  - Request: `{ name: string, difficulty: "EASY"|"MEDIUM"|"HARD" }`
  - Response 201: `{ id, name, difficulty, createdAt }`
  - Errores: 400, 401 (reservado)
- `GET /api/habits` → 200: `Habit[]` del usuario actual; Errores: 401 (reservado)
- `PATCH /api/habits/[id]` → 200 / Errores: 400, 404, 401 (reservado)
- `DELETE /api/habits/[id]` → 204 / Errores: 404, 401 (reservado)
- `POST /api/habits/[id]/complete` → 200: `{ habitId, date, xpAwarded }`; idempotente por día;
  Errores: 404, 401 (reservado)

**Data model**
Sin cambios sobre Block 1.

**Input validation**
`name`: string, 1–100 caracteres. `difficulty`: enum estricto.

**Error handling**
Igual criterio que Block 2: `HabitNotFoundError`/`HabitForbiddenError` → 404. El error `P2002` de
Prisma sobre la constraint única se captura específicamente (no es un catch genérico: se verifica el
código de error antes de tratarlo como "ya registrado hoy").

**Required tests**
- [ ] `createHabit` guarda el hábito y aparece en `listHabitsForUser` — valida AC-07
- [ ] `createHabit` rechaza `name` vacío o `difficulty` inválida — valida AC-08
- [ ] `updateHabit` refleja los campos actualizados — valida AC-09
- [ ] `deleteHabit` hace que el hábito deje de aparecer en `listHabitsForUser` — valida AC-10
- [ ] `registerCompletion` crea el registro y suma XP la primera vez del día — valida AC-11
- [ ] `registerCompletion` repetido el mismo día no crea otro registro ni suma XP — valida AC-12
- [ ] `registerCompletion`/`updateHabit`/`deleteHabit` sobre un hábito de otro usuario son
  rechazados — valida AC-13

**Completion criterion**
`pnpm test src/features/habits` pasa; `pnpm dev` permite crear, editar, registrar cumplimiento
diario (una sola vez por día) y eliminar un hábito desde la UI.

## Final verification

- `pnpm build` compila sin errores de tipos (`strict: true`, sin `any`).
- `pnpm test` corre toda la suite (Blocks 1–3) en verde.
- Manualmente: crear dos usuarios en la base (además del seed), crear tareas/hábitos con cada uno,
  confirmar que ninguno ve ni puede modificar los del otro (FR-13, FR-14, AC-13).
- Confirmar que `User.xp` del usuario seed refleja la suma exacta de XP por cada tarea completada y
  cada cumplimiento de hábito registrado, sin duplicados (FR-05, FR-11, RN-04).
- Confirmar que repetir "completar" sobre una tarea ya completada, o "registrar cumplimiento" sobre
  un hábito ya cumplido hoy, no altera `User.xp` (AC-06, AC-12).
