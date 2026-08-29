# Threat Model FEAT-001: Gestión de Tareas y Hábitos

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Spec | docs/daw/specs/spec-FEAT-001.md |
| Date | 2026-08-29 |

## Componentes analizados

1. Route handlers HTTP (`src/app/api/tasks/*`, `src/app/api/habits/*`)
2. `getCurrentUserId()` (stub de identidad, `src/features/users/data/current-user.ts`)
3. `task-service.ts` / `habit-service.ts` (dominio: reglas de negocio, idempotencia, ownership)
4. `task-repository.ts` / `habit-repository.ts` / `user-repository.ts` (acceso a datos vía Prisma)
5. PostgreSQL (persistencia)

## Trust boundaries (F-TM-02)

| Boundary | Entre | Trust levels |
|---|---|---|
| TB-1 | Cliente (browser) → Route handlers | No confiable → Confiable (borde de entrada de la app) |
| TB-2 | `getCurrentUserId()` → resto de la app | Hoy: **falso boundary** — no hay verificación de identidad real, todo el tráfico entrante se trata como el usuario seed. Se documenta como riesgo aceptado (ver abajo). |
| TB-3 | `task-service`/`habit-service` → Prisma/PostgreSQL | Confiable (app) → Confiable (datos), pero cruza red hacia el proceso de base de datos |

## Análisis STRIDE por componente (F-TM-01)

### Route handlers HTTP

| Categoría | Análisis |
|---|---|
| Spoofing | Sin autenticación real (ver Riesgo Aceptado RA-01). Mitigación parcial: `userId` nunca se toma del body/params — siempre server-side vía `getCurrentUserId()`, así un request no puede *elegir* actuar como otro usuario aunque no pruebe quién es. |
| Tampering | Body validado (título/nombre no vacío, longitud máxima, `difficulty` como enum estricto) antes de tocar la base — spec §Input validation, Bloques 2 y 3. |
| Repudiation | `createdAt`/`updatedAt`/`completedAt` quedan registrados; no hay un log de auditoría de accesos — aceptable para este ticket (no hay multi-usuario real todavía). |
| Information Disclosure | `TaskNotFoundError` y `TaskForbiddenError` (ídem hábitos) se colapsan ambos a 404 en el route handler — evita que un atacante distinga "no existe" de "existe pero no es tuya" (enumeración de recursos ajenos). |
| Denial of Service | Sin rate limiting (W-TM-02: aceptable, app interna/de bajo tráfico en esta etapa). No se otorga XP indefinidamente por request: cada operación de completar es acotada por la idempotencia. |
| Elevation of Privilege | `userId` nunca viene del cliente (ver Tampering) → un usuario no puede operar sobre recursos de otro cambiando un parámetro. |

### `task-service` / `habit-service`

| Categoría | Análisis |
|---|---|
| Spoofing | N/A (interno, recibe `userId` ya resuelto). |
| Tampering | **Riesgo real identificado (RT-01):** el diseño original de `completeTask` era "leer estado → decidir → escribir", vulnerable a una condición de carrera con dos requests concurrentes sobre la misma tarea, cada uno otorgando XP. **Mitigación aplicada:** se cambió a un `UPDATE` condicional atómico (`WHERE status='PENDING'`), de forma que solo una de dos escrituras concurrentes afecta una fila. Ya incorporado en la spec (Bloque 2) con un test de concurrencia dedicado. `registerCompletion` (hábitos) ya usaba el patrón correcto desde el diseño original: se apoya en la constraint única `(habitId, date)` de la base y captura `P2002`, que es atómico por construcción. |
| Repudiation | N/A. |
| Information Disclosure | Toda consulta filtra o verifica `userId` antes de devolver datos. |
| Denial of Service | N/A. |
| Elevation of Privilege | Ownership verificado antes de cualquier mutación (`TaskForbiddenError`/`HabitForbiddenError`). |

### Repositorios (`task-repository`, `habit-repository`, `user-repository`)

| Categoría | Análisis |
|---|---|
| Tampering | Uso de Prisma (queries parametrizadas) — sin SQL crudo, sin concatenación de input de usuario en queries (cumple `.daw/rules/security.instructions.md` §SQL Injection). |
| Information Disclosure | `user-repository.incrementXp` no expone ni recibe más que `userId` y `amount` — no hay lectura de otros campos sensibles de `User` en este camino. |
| Elevation of Privilege | `incrementXp` no es invocable con un `userId` arbitrario desde el cliente — solo se llama internamente desde `task-service`/`habit-service`, con el `userId` ya validado. |

### PostgreSQL

| Categoría | Análisis |
|---|---|
| Information Disclosure | Contiene `User.email` (PII). Ver clasificación de datos sensibles abajo. |
| Tampering | Constraints de integridad (`@@unique([habitId, date])`, FKs) protegen contra estados inconsistentes a nivel de base, no solo de aplicación. |

## Clasificación de datos sensibles (F-TM-05) y cifrado (F-TM-07)

| Dato | Clasificación | Cifrado en tránsito | Cifrado en reposo |
|---|---|---|---|
| `User.email` | PII | **Requerido:** `DATABASE_URL` con `sslmode=require` (agregado a `.env.example` en la spec) | A cargo del proveedor de hosting de PostgreSQL (dependencia declarada en el PRD maestro); no gestionado por el código de este ticket |
| `Task.title` / `Task.description` / `Habit.name` | Datos personales del usuario (contenido que el usuario elige compartir sobre sus propias tareas/hábitos), no PII crítica | Mismo canal TLS que el resto de la conexión a base | Mismo mecanismo del proveedor |
| `User.xp` | No sensible (dato de gamificación, visible al propio usuario) | N/A | N/A |

No hay credenciales (contraseñas, tokens) en el alcance de este ticket — la autenticación está
fuera de alcance (RF-01 a RF-03).

## Riesgos identificados

| ID | Riesgo | STRIDE | Likelihood | Impact | Mitigación |
|---|---|---|---|---|---|
| RT-01 | Condición de carrera en `completeTask` otorga XP duplicado con dos requests concurrentes | Tampering | Medium | Medium | **Aplicada:** `UPDATE` condicional atómico (`WHERE status='PENDING'`) en vez de leer-luego-escribir. Ya en la spec, Bloque 2. |
| RT-02 | Un cliente podría intentar enviar `userId` en el body para operar como otro usuario | Elevation of Privilege | Low (requiere que el código lo lea, cosa que el diseño ya prohíbe) | High si ocurriera | **Aplicada:** contrato explícito en la spec — `userId` nunca se lee del body/params, siempre `getCurrentUserId()` server-side. |
| RA-01 | Sin autenticación real: cualquier request a la API actúa como el usuario seed (no hay forma de distinguir "usuarios" reales todavía) | Spoofing | High (es el comportamiento actual, no una posibilidad) | Low en este ticket (no hay datos de terceros reales expuestos: es un único usuario seed en desarrollo) | **Riesgo aceptado formalmente** — ver abajo (RA-01) |

## Riesgo Aceptado RA-01 (F-TM-04)

- **Riesgo:** no existe autenticación real en FEAT-001; toda request entrante se trata como el
  usuario seed devuelto por `getCurrentUserId()`. Si este código se expusiera tal cual a múltiples
  usuarios reales sin autenticación, cualquiera podría leer/modificar los datos del usuario seed
  sin verificación de identidad.
- **Quién lo acepta:** el usuario del proyecto (etiradani@fepsa.com.ar), como dueño del producto,
  al aprobar el PRD FEAT-001 que explícitamente deja RF-01 a RF-03 (registro/login/logout) fuera de
  alcance de este ticket.
- **Justificación:** el PRD maestro (`docs/daw/prd/PRD.md`) y el PRD de este ticket
  (`docs/daw/prd/prd-FEAT-001.md`) planifican la autenticación como trabajo futuro independiente;
  construirla aquí duplicaría esfuerzo y ampliaría el alcance del ticket más allá de lo acordado.
  Mientras el desarrollo ocurre contra un único usuario seed en un entorno no productivo, el
  impacto real es bajo.
- **Condiciones de revisión:** este riesgo **debe** resolverse (implementando autenticación real)
  **antes de que la aplicación se exponga a más de un usuario o a un entorno accesible
  públicamente/productivo.** El ticket de autenticación es un prerrequisito de RELEASE para
  cualquier despliegue fuera de desarrollo local. Se revisita explícitamente al clasificar el
  ticket de autenticación (CLASSIFY de ese ticket debe referenciar esta aceptación de riesgo).

## Dependencias nuevas (W-TM-01)

Prisma, Next.js y Vitest son las únicas dependencias nuevas del ticket (justificadas en la spec).
Son librerías de mantenimiento activo y amplio uso; no se identifican CVEs conocidos relevantes al
momento de este análisis. El lockfile (`pnpm-lock.yaml`) se commitea (Bloque 1), cumpliendo
`.daw/rules/security.instructions.md` §Dependency Security.

## Disponibilidad (W-TM-02)

No se implementa rate limiting en este ticket. Riesgo bajo: es una app en desarrollo temprano, sin
tráfico público, sin datos de terceros reales expuestos todavía (ver RA-01). Se recomienda
revisitarlo junto con el ticket de autenticación.

---

## Resumen

```
┌─────────────────────────────────────────────────────────┐
│  /daw-threat-modeling — PASSED                            │
├─────────────────────────────────────────────────────────┤
│                                                            │
│  Attack surfaces identified: 5 (route handlers, stub de    │
│    identidad, servicios de dominio, repositorios, DB)      │
│  Trust boundaries declared: 3 (TB-1, TB-2, TB-3)            │
│                                                            │
│  Risks:                                                     │
│    🟠 RT-01 (Tampering, race condition XP duplicado)         │
│        — Mitigación aplicada en la spec                      │
│    🟠 RT-02 (Elevation of Privilege, userId spoofing)         │
│        — Mitigación aplicada en la spec                      │
│    🟡 RA-01 (Spoofing, sin auth real)                          │
│        — Riesgo aceptado formalmente (3 campos completos)      │
│                                                            │
│  Mitigations folded into the spec:                          │
│    1. `completeTask` usa UPDATE condicional atómico            │
│       (evita XP duplicado por concurrencia)                    │
│    2. `userId` nunca se lee del cliente, siempre server-side    │
│    3. `DATABASE_URL` con `sslmode=require` (PII en tránsito)    │
│                                                            │
│  ─────────────────────────────────────────────────────      │
│  Risks: C:0 H:0 M:2(mitigados) L:1(aceptado)                  │
│  Report: docs/daw/security/threat-FEAT-001.md                  │
└─────────────────────────────────────────────────────────┘
```
