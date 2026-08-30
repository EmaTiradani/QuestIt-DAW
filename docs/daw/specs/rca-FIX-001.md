# RCA FIX-001: Migrar Next.js 14 a 15 por CVEs High sin mitigación

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Date | 2026-08-30 |
| Related ticket | FEAT-001 (bloqueado en CODE por este defecto) |

## Síntoma

Al correr el gate `daw-security-sast` en el cierre de CODE de FEAT-001, `pnpm audit` reportó 2
vulnerabilidades Critical y 13 High. Tras actualizar `next` (14.2.15→14.2.35) y `vitest`
(2.1.9→3.2.7) dentro de la línea 14.x/3.x, las 2 Critical y varias High quedaron resueltas, pero
**11 CVEs High persisten** porque sus parches solo existen en Next.js **15.x** (`>=15.5.21` para
la mayoría) — no hay versión de la línea 14.x que las resuelva.

## Causa raíz

El scaffolding inicial del proyecto (FEAT-001, Bloque 1) fijó `next` en `14.2.15` — la versión
resuelta por `pnpm add next` al momento de crear el proyecto para satisfacer el requisito de
`AGENTS.md` ("Next.js 14"). Esa versión (y toda la línea 14.x, incluso su último patch 14.2.35)
tiene fallas de seguridad en Server Components, Server Actions, rewrites y el manejo de upgrades
de WebSocket que el propio proyecto Next.js **solo backporteó a partir de la rama mayor 15.x**, no
a la 14.x. No es un error de configuración ni de uso indebido del framework: es que el framework
fijado en el Stack del proyecto quedó, en su versión declarada, sin parche posible para estas
fallas.

**Cadena de eventos:**
1. `AGENTS.md` declaró "Next.js 14 (Node 18 LTS)" como parte del stack (decisión de producto, no
   cuestionada aquí).
2. El scaffolding de FEAT-001 instaló la última 14.x disponible en ese momento (14.2.15).
3. El ecosistema de Next.js siguió publicando CVEs sobre funcionalidades del framework
   (Server Components, Server Actions, rewrites, WebSocket upgrades) cuyos parches solo se
   publicaron sobre la rama 15.x.
4. El gate de SAST (obligatorio, no supresible para Critical/High) detectó esto recién al cerrar
   CODE de FEAT-001, bloqueando la transición a VERIFY.

## Componente afectado

- `package.json` (dependencia `next`)
- `AGENTS.md` → Stack (declara la versión mayor del framework)
- Potencialmente cualquier archivo que dependa de comportamiento específico de Next 14 que cambie
  en Next 15 (a determinar durante la migración — ver Impact Check en PLAN si este fix escala a
  spec, o directamente en la implementación dado que es tier FIX).

## ¿Hay un gap en el PRD?

No. Ni `docs/daw/prd/PRD.md` ni `docs/daw/prd/prd-FEAT-001.md` mencionan versiones de framework —
eso vive exclusivamente en `AGENTS.md` → Stack, que no es un PRD. No hay contradicción de producto:
el usuario sigue queriendo Next.js (el "14" era la versión concreta al momento de escribir el
Stack, no un requisito de negocio). Se actualizará `AGENTS.md` → Stack de "Next.js 14" a "Next.js
15" como parte de este fix, con aprobación explícita del usuario (ver abajo).

## Confirmación

¿Confirmás este análisis de causa raíz?
