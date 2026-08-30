# SAST FEAT-001: Gestión de Tareas y Hábitos

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Date | 2026-08-30 (bloqueado) / 2026-08-30 (resuelto tras FIX-001) |
| Result | **PASSED** (ver "Resolución" al final) |

## Resumen

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — BLOCKED                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Secrets:                                                    │
│    ✅ F-SAST-01: sin secretos hardcodeados (grep sobre        │
│       src/ y prisma/, sin coincidencias)                      │
│    ✅ .env / .env*.local en .gitignore                        │
│                                                              │
│  Injection:                                                  │
│    ✅ F-SAST-02: sin SQL/NoSQL crudo, todo vía Prisma          │
│       parametrizado (sin $queryRaw/$executeRaw)                │
│    ✅ F-SAST-03: sin exec()/child_process                      │
│                                                              │
│  XSS y funciones inseguras:                                   │
│    ✅ F-SAST-06: sin dangerouslySetInnerHTML/innerHTML          │
│    ✅ F-SAST-04/17: sin eval()                                 │
│                                                              │
│  Dependencias (pnpm audit):                                   │
│    ❌ F-SAST-13: 2 Critical + 13 High al iniciar el scan        │
│       → Corregido en el momento: next 14.2.15→14.2.35,          │
│         vitest 2.1.9→3.2.7 (resuelve ambos Critical y la         │
│         mayoría de los High)                                      │
│    ❌ F-SAST-13: 11 High remanentes tras la corrección            │
│       (requieren Next.js 15.x, mayor no contemplado en el          │
│       Stack declarado de AGENTS.md) — ver detalle abajo             │
│                                                              │
│  Suppressions: 0 (Critical/High no son supresibles)            │
│                                                              │
│  ────────────────────────────────────────────────────────────│
│  Total: 8 checks limpios, 11 vulnerabilidades High sin        │
│  resolver (0 Critical)                                          │
│  Next: BLOQUEADO — no se puede avanzar a VERIFY hasta que       │
│  las 11 CVEs High se resuelvan (regla no supresible)             │
└─────────────────────────────────────────────────────────────┘
```

## Detalle: 11 CVEs High remanentes

Todas requieren actualizar `next` a `>=15.5.21` (mayor, fuera del Stack declarado — "Next.js 14
(Node 18 LTS)" en `AGENTS.md`) o son dependencias transitivas de la toolchain de build de Next
(`vite`, `postcss`) no invocadas directamente por este proyecto.

| # | CVE | Paquete | Versión requerida |
|---|---|---|---|
| 1 | HTTP request deserialization DoS (Server Components) | next | >=15.0.8 |
| 2 | DoS con Server Components | next | >=15.5.15 |
| 3 | DoS con Server Components (variante) | next | >=15.5.16 |
| 4 | SSRF vía WebSocket upgrades | next | >=15.5.16 |
| 5 | Middleware/Proxy bypass (Pages Router + i18n) | next | >=15.5.16 |
| 6 | `server.fs.deny` bypass en Windows | vite (transitivo) | >=6.4.3 |
| 7 | DoS en App Router con Server Actions | next | >=15.5.21 |
| 8 | SSRF en Server Actions con servidor custom | next | >=15.5.21 |
| 9 | SSRF en rewrites vía hostname controlado por atacante | next | >=15.5.21 |
| 10 | Lectura arbitraria de archivos vía sourceMappingURL | postcss (transitivo) | >=8.5.12 |
| 11 | Path traversal vía sourceMappingURL | postcss (transitivo) | >=8.5.18 |

## Triage (`daw-sec-auditor`)

Se verificó contra el código real de este proyecto (no genérico): **ninguna de las 11 tiene un
camino de explotación hoy**, porque esta app no usa ninguna de las superficies que estas CVEs
afectan:

- Sin `middleware.ts`/`middleware.js` en ningún lado del repo.
- `next.config.js` no define `rewrites()` ni configuración de `i18n`.
- Sin directivas `"use server"` (no se usan Server Actions).
- Sin servidor custom, sin manejo de WebSocket/upgrades.
- `vite`/`postcss` no son dependencias directas del proyecto — solo forman parte de la toolchain
  interna de build de Next, nunca expuestas al tráfico HTTP de la app en producción.

**Sin embargo**, la regla del proyecto (`.daw/rules/security.instructions.md` §SAST Gate,
`.daw/rules/validation-rules.instructions.md` §4) es explícita: **Critical/High → FAIL, siempre
bloquea, no es supresible.** No hay una excepción por "no aplica hoy" — a diferencia de Medium, que
sí admite una supresión documentada con 7 campos.

## Decisión (aprobada por el usuario)

Ante la disyuntiva de (a) subir a Next.js 15 dentro de este mismo ticket o (b) abrir un ticket de
seguimiento y detener CODE de FEAT-001 hasta resolverlo, el usuario eligió **(b)**.

**FEAT-001 queda BLOQUEADO en la fase CODE** — no se puede transicionar a VERIFY mientras estas 11
CVEs High sigan sin resolver. El desbloqueo requiere completar primero un ticket dedicado a migrar
el proyecto de Next.js 14 a 15.x (>=15.5.21), incluyendo:

- Revisar el changelog de breaking changes de Next 14→15 (App Router, `next/font`, `next/image`,
  cambios en caching por defecto, etc.).
- Re-ejecutar toda la suite de tests y `pnpm build` tras la migración.
- Actualizar `AGENTS.md` → Stack ("Next.js 14" → "Next.js 15").
- Advertencia importante: si antes de esa migración este proyecto agrega middleware, rutas i18n,
  Server Actions, un servidor custom o `rewrites()`, los hallazgos #4, #5, #7, #8 y #9 pasan a ser
  explotables de inmediato y la migración deja de ser diferible — cualquier ticket que toque esas
  áreas debe re-evaluar este bloqueo antes de avanzar.

## Resolución

**FIX-001** (`docs/daw/specs/fix-FIX-001.md`) migró `next` a `15.5.24`, resolviendo las 11 CVEs
High. Su PR (#1) fue mergeado en `feat/FEAT-001-tareas-habitos`. Al retomar FEAT-001, se re-corrió
`pnpm audit` sobre el código ya mergeado: **0 vulnerabilidades**. `pnpm test` (21/21) y el resto de
checks de esta sección siguen limpios sin cambios.

## Estado de gates

- `gates.tests` = `true` (21/21 tests, suite completa)
- `gates.sast` = **`true`** (resuelto vía FIX-001, 0 vulnerabilidades)
