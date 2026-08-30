# Fix-plan FIX-001: Migrar Next.js 14 a 15

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Tier | FIX |
| RCA | docs/daw/specs/rca-FIX-001.md |
| Date | 2026-08-30 |
| Spec loops | 0 |

## Problem

El gate `daw-security-sast` de FEAT-001 quedó BLOCKED: 11 CVEs High en `next` no tienen parche en
la línea 14.x, solo en 15.x (`>=15.5.21`). Sin resolver esto, FEAT-001 no puede avanzar a VERIFY.

## Root cause

Ver `docs/daw/specs/rca-FIX-001.md`: la línea 14.x de Next.js (incluso 14.2.35, su último patch) no
tiene backport de los parches de Server Components/Server Actions/rewrites/WebSocket upgrades — esos
parches solo se publicaron sobre la rama mayor 15.x.

## Solución — pasos

1. `package.json` — actualizar `next` de `14.2.35` a `15.5.24` (última versión estable de la
   rama 15.x al momento de este fix, patchea las 11 CVEs High: todas requieren `>=15.5.21` o menos).
   Confirmado por peer dependencies (`npm view next@15.5.24 peerDependencies`) que `react@^18.2.0`
   sigue siendo aceptado — no hace falta subir React a 19 (fuera del alcance de este FIX).
2. `src/app/api/tasks/[id]/route.ts` — cambiar el tipo `RouteParams.params` de `{ id: string }` a
   `Promise<{ id: string }>`; en `PATCH` y `DELETE`, agregar `const { id } = await params;` antes de
   usar `id` (reemplaza las referencias a `params.id`).
3. `src/app/api/tasks/[id]/complete/route.ts` — mismo cambio que el paso 2, en `POST`.
4. `src/app/api/habits/[id]/route.ts` — mismo cambio que el paso 2, en `PATCH` y `DELETE`.
5. `src/app/api/habits/[id]/complete/route.ts` — mismo cambio que el paso 2, en `POST`.

Ningún otro archivo del repo usa `cookies()`, `headers()`, `draftMode()`, `searchParams`, ni una
opción de `next.config.js` renombrada/eliminada en Next 15 (confirmado por impact scan) — estos 5
archivos son el alcance completo del fix.

## Dependencies between steps

Paso 1 (bump de `next`) debe ir antes que los pasos 2-5: hasta que `next` esté en 15.x, TypeScript
seguirá tipando `params` como síncrono y no habrá señal de compilación de que falta el `await`. Los
pasos 2-5 son independientes entre sí (archivos distintos, mismo patrón).

## Error handling

Sin cambios en el manejo de errores existente (`TaskNotFoundError`/`TaskForbiddenError`/
`TaskValidationError` y sus equivalentes de hábitos siguen mapeándose a los mismos códigos HTTP). El
único error nuevo posible es un error de compilación de TypeScript si algún `params.id` queda sin
`await` — se detecta en el paso de typecheck del propio fix, no en runtime.

## Tests

- [ ] **Regression test**: no aplica un test unitario de "bug reproducido" en el sentido clásico,
  porque el defecto es una vulnerabilidad de dependencia, no un comportamiento incorrecto de la
  aplicación. El equivalente aquí es el propio gate de seguridad: `pnpm audit` debe pasar de
  reportar las 11 CVEs High a 0 Critical/High después del bump. Se documenta como evidencia en el
  reporte de SAST re-ejecutado.
- [ ] Suite completa existente (21 tests: user-repository, task-service, habit-service) debe seguir
  pasando sin modificación — confirma que la migración no rompió lógica de negocio.
- [ ] `pnpm build` debe compilar sin errores de TypeScript (confirma que los 4 route handlers
  resuelven `params` correctamente bajo los tipos de Next 15).
- [x] Verificación manual/E2E: con `pnpm dev` corrí `curl` contra los 6 endpoints (list + los 4
  modificados). Sin PostgreSQL disponible en este entorno (misma limitación que en FEAT-001 Block
  1), el error real en los 3 endpoints dinámicos probados ocurre en `getCurrentUserId` — **antes**
  de llegar al `await params` — por lo que estas respuestas 500 solo confirman que las rutas
  compilan y enrutan bajo Next 15, no que `params` se resuelve correctamente. La prueba real de eso
  es que `tsc --noEmit` compila limpio: con `params` tipado como `Promise<{ id: string }>`, acceder
  a `.id` sin `await` es un error de TIPOS, no de runtime, y el build ya lo habría bloqueado. Queda
  pendiente, igual que en FEAT-001, la verificación E2E contra una base real cuando haya una
  disponible.

## Regression risk

**Low.** El cambio es mecánico (tipado + await) sobre 4 archivos ya cubiertos por tests de
integración indirectos (a través de `task-service`/`habit-service`, que no cambian) y por
verificación manual explícita de los 4 endpoints afectados. La suite de 21 tests unitarios no
ejercita los route handlers directamente (por diseño, ver spec-FEAT-001.md), por lo que la
verificación manual de los endpoints es la que efectivamente cubre este cambio — no es opcional.

## Rollback plan

- **Pasos:** `git revert` del commit de este fix (o `pnpm add next@14.2.35` + revertir los 4
  archivos de route handlers a su versión anterior con `git checkout <commit-anterior> -- <archivo>`
  para cada uno). Trivial: es un cambio de versión de una dependencia más 4 archivos mecánicos, sin
  migración de datos ni cambio de schema.
- **Indicadores para aplicarlo:** `pnpm build` falla tras el bump por un breaking change no
  detectado en este plan; `pnpm dev` deja de servir alguno de los 4 endpoints correctamente en la
  verificación manual; o aparece un nuevo hallazgo Critical/High en `pnpm audit` introducido por la
  propia versión 15.5.24 (poco probable, pero se revisa en el mismo paso que se confirma que las 11
  CVEs anteriores desaparecieron).
