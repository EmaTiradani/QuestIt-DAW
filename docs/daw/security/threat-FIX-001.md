# Threat Model FIX-001: Migrar Next.js 14 a 15

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Date | 2026-08-30 |

## Alcance del cambio

Bump de `next` (14.2.35 → 15.5.24) y adaptación de 4 route handlers dinámicos
(`src/app/api/tasks/[id]/route.ts`, `.../[id]/complete/route.ts`, y los dos equivalentes de
`habits/`) para que `params` se lea como `Promise<{ id: string }>` (`await params`) en vez de un
objeto síncrono, que es el único breaking change de Next 14→15 relevante para este código (sin uso
de `cookies()`, `headers()`, `draftMode()` ni `searchParams` en Server Components).

No se agregan endpoints, no se agregan roles/permisos nuevos, no cambia ningún flujo de datos. Es
un cambio de versión de dependencia + un ajuste mecánico de tipado/await.

## Componentes analizados (STRIDE)

Los mismos 5 componentes de `docs/daw/security/threat-FEAT-001.md` (route handlers, servicios de
dominio, repositorios, PostgreSQL) — **sin cambios de comportamiento de negocio**, por lo que el
análisis STRIDE de ese documento sigue vigente sin modificaciones. No hay componente nuevo que
analizar.

La única superficie que cambia es el **mecanismo interno de Next.js** para resolver `params`
(síncrono → asíncrono), que es responsabilidad del framework, no de este código de aplicación.

## Trust boundaries

Sin cambios respecto a `threat-FEAT-001.md` (TB-1, TB-2, TB-3). Esta migración no cruza ningún
límite de confianza nuevo.

## Riesgos

| ID | Riesgo | STRIDE | Likelihood | Impact | Mitigación |
|---|---|---|---|---|---|
| RT-03 | Olvidar `await` en `params` en alguno de los 4 handlers causa que Next.js 15 devuelva un `Promise` sin resolver donde se esperaba `{ id: string }`, rompiendo la ruta (error en runtime, no vulnerabilidad de seguridad per se) | Denial of Service (autoinducido, no explotable por un atacante externo — es un bug de disponibilidad, no una superficie de ataque) | Low | Low (se detecta inmediato en tests/build, no en producción silenciosamente) | Cubierto por el propio `pnpm build`/`pnpm test` del fix-plan: TypeScript falla en compilación si `params.id` se usa sin `await` sobre un tipo `Promise<...>`, porque el tipo ya no tiene la propiedad `id` directamente. No requiere mitigación adicional más allá de que el build pase. |

**Sin riesgos Critical/High nuevos.** El propósito mismo del ticket es reducir riesgo (parchea 11
CVEs High existentes). No se introduce superficie de ataque nueva.

## Resumen

```
┌─────────────────────────────────────────────────────────┐
│  /daw-threat-modeling — PASSED                            │
├─────────────────────────────────────────────────────────┤
│  Attack surfaces identified: 0 nuevas (bump de versión +   │
│    ajuste mecánico de tipado)                                │
│  Trust boundaries: sin cambios respecto a threat-FEAT-001.md │
│  Risks: 1 (RT-03, Low/Low, mitigado por el propio build)      │
│  Reduce riesgo neto: parchea 11 CVEs High existentes           │
│  Report: docs/daw/security/threat-FIX-001.md                    │
└─────────────────────────────────────────────────────────┘
```
