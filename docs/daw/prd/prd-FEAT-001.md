# PRD FEAT-001: Gestión de Tareas y Hábitos

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Tracker | none |
| Date | 2026-08-29 |
| PRD loops | 0 |

## Context and Problem

QuestIt centraliza tareas y hábitos, gamificando el progreso mediante XP y niveles (ver PRD maestro
`docs/daw/prd/PRD.md`). Esta es la primera feature ejecutable del proyecto: permitir a un usuario
registrar, editar, completar y eliminar tareas y hábitos, con la XP asociada calculándose en el
momento de completar cada uno.

Quedan fuera de este ticket (se implementan en tickets futuros, según el PRD maestro):
- Registro/login/logout (RF-01 a RF-03). Se usa un usuario existente en base de datos (seed) como
  dueño de las tareas/hábitos creados, sin flujo de autenticación todavía.
- Cálculo/visualización de nivel y estadísticas agregadas del panel principal (RF-13 a RF-17).
- Historial cronológico de actividad (RF-24).
- "Objetivos" y "logros": explícitamente fuera de alcance del producto (ver PRD maestro, sección
  "Fuera de Alcance").

Sí entra en este ticket: el cálculo y almacenamiento de la XP otorgada al completar una tarea o
registrar el cumplimiento de un hábito (RN-03, RN-04, RF-12), aunque su visualización en un panel
quede para después — así se evita reprocesar registros históricos cuando se implemente esa vista.

## Goals

- Permitir crear, editar, eliminar y marcar como completada una tarea, con persistencia en base de
  datos.
- Permitir crear, editar, eliminar un hábito y registrar su cumplimiento diario, con persistencia en
  base de datos.
- Calcular y almacenar automáticamente la XP otorgada al completar una tarea o registrar el
  cumplimiento de un hábito, según su dificultad.
- Garantizar que cada usuario solo pueda ver y modificar sus propias tareas y hábitos.

## Functional Requirements

- FR-01: El sistema debe permitir crear una tarea indicando título, descripción y nivel de
  dificultad (Fácil, Media, Difícil), asociada al usuario autenticado. *(RF-04)*
- FR-02: El sistema debe permitir editar el título, la descripción y la dificultad de una tarea
  existente, siempre que pertenezca al usuario autenticado. *(RF-05)*
- FR-03: El sistema debe permitir eliminar una tarea existente, siempre que pertenezca al usuario
  autenticado. *(RF-06)*
- FR-04: El sistema debe permitir marcar una tarea pendiente como completada. *(RF-07)*
- FR-05: Al completar una tarea, el sistema debe otorgar exactamente una vez la XP correspondiente
  a su dificultad (Fácil: 5, Media: 10, Difícil: 20) y sumarla a la XP acumulada del usuario.
  *(RN-03, RN-04, RF-12)*
- FR-06: Un intento de completar una tarea que ya está en estado "completada" no debe otorgar XP
  adicional ni modificar el registro existente (operación idempotente). *(RN-07, AC-27)*
- FR-07: El sistema debe permitir crear un hábito indicando nombre y nivel de dificultad, asociado
  al usuario autenticado. *(RF-08)*
- FR-08: El sistema debe permitir editar el nombre y la dificultad de un hábito existente, siempre
  que pertenezca al usuario autenticado. *(RF-09)*
- FR-09: El sistema debe permitir eliminar un hábito existente, siempre que pertenezca al usuario
  autenticado. *(RF-10)*
- FR-10: El sistema debe permitir registrar el cumplimiento diario de un hábito para la fecha
  actual. *(RF-11)*
- FR-11: Al registrar el cumplimiento diario de un hábito, el sistema debe otorgar la XP
  correspondiente a su dificultad y sumarla a la XP acumulada del usuario. *(RN-03, RN-04, RF-12)*
- FR-12: Un hábito solo puede tener un registro de cumplimiento por día calendario para un mismo
  usuario y hábito; un intento repetido el mismo día no debe crear un nuevo registro ni otorgar XP
  adicional. *(RN-06, AC-26)*
- FR-13: El sistema debe mostrar únicamente las tareas y hábitos pertenecientes al usuario
  autenticado. *(RF-18)*
- FR-14: El sistema debe rechazar sin realizar cambios cualquier intento de editar, completar o
  eliminar una tarea o hábito perteneciente a otro usuario. *(AC-24)*
- FR-15: El sistema debe almacenar de forma persistente las tareas y hábitos creados, sus ediciones,
  su estado de completado/cumplimiento y su eliminación. *(RF-20, RF-21)*

## Non-Functional Requirements

- NFR-01: La creación, edición, eliminación, completado de tareas y registro de cumplimiento de
  hábitos debe completarse en menos de 2 segundos (p95). *(RNF-01)*
- NFR-02: La interfaz debe ser usable en dispositivos con un ancho de pantalla entre 360px y
  1920px. *(RNF-04)*
- NFR-03: El sistema debe persistir el 100% de los cambios confirmados por el usuario sobre tareas
  y hábitos. *(RNF-03)*

## Acceptance Criteria

- AC-01 (FR-01): WHEN un usuario autenticado crea una tarea indicando título, descripción y
  dificultad válidos, THE sistema SHALL guardarla de forma persistente y mostrarla en su lista de
  tareas.
- AC-02 (FR-01): IF el título de la tarea está vacío o la dificultad no es una de las tres válidas
  (Fácil/Media/Difícil), THEN THE sistema SHALL rechazar la creación sin guardar la tarea.
- AC-03 (FR-02): WHEN un usuario autenticado edita una tarea propia y guarda los cambios, THE
  sistema SHALL reflejar los datos actualizados de forma persistente.
- AC-04 (FR-03): WHEN un usuario autenticado elimina una tarea propia, THE sistema SHALL dejar de
  mostrarla en su lista.
- AC-05 (FR-04, FR-05): WHEN un usuario autenticado marca como completada una tarea propia en
  estado pendiente, THE sistema SHALL cambiar su estado a "completada" y sumar la XP de su
  dificultad a la XP acumulada del usuario.
- AC-06 (FR-06): IF una tarea ya está en estado "completada" y el usuario intenta completarla
  nuevamente, THEN THE sistema SHALL rechazar la operación sin otorgar XP adicional ni modificar
  el registro.
- AC-07 (FR-07): WHEN un usuario autenticado crea un hábito indicando nombre y dificultad válidos,
  THE sistema SHALL guardarlo de forma persistente y mostrarlo en su lista de hábitos.
- AC-08 (FR-07): IF el nombre del hábito está vacío o la dificultad no es una de las tres válidas
  (Fácil/Media/Difícil), THEN THE sistema SHALL rechazar la creación sin guardar el hábito.
- AC-09 (FR-08): WHEN un usuario autenticado edita un hábito propio y guarda los cambios, THE
  sistema SHALL reflejar los datos actualizados de forma persistente.
- AC-10 (FR-09): WHEN un usuario autenticado elimina un hábito propio, THE sistema SHALL dejar de
  mostrarlo en su lista.
- AC-11 (FR-10, FR-11): WHEN un usuario autenticado registra el cumplimiento de un hábito propio
  por primera vez en el día actual, THE sistema SHALL almacenar el registro con la fecha actual y
  sumar la XP de su dificultad a la XP acumulada del usuario.
- AC-12 (FR-12): IF un hábito ya tiene un registro de cumplimiento para la fecha actual y el
  usuario intenta registrarlo nuevamente ese mismo día, THEN THE sistema SHALL rechazar la
  operación sin crear un nuevo registro ni sumar XP adicional.
- AC-13 (FR-14): IF un usuario autenticado intenta editar, completar o eliminar una tarea o hábito
  perteneciente a otro usuario, THEN THE sistema SHALL rechazar la operación sin realizar ningún
  cambio.
- AC-14 (FR-13): WHEN un usuario autenticado consulta su lista de tareas o hábitos, THE sistema
  SHALL mostrar únicamente los que le pertenecen (FR-15).

## Out of Scope

- Registro, login y logout de usuarios (RF-01 a RF-03) — se usa un usuario existente en base de
  datos (seed) mientras no exista autenticación.
- Cálculo y visualización del nivel del usuario, panel de estadísticas agregadas (tareas
  completadas totales, cumplimientos de hábito totales) — RF-13 a RF-17.
- Historial cronológico de actividad — RF-24.
- Objetivos personales y sistema de logros (explícitamente fuera de alcance del producto).
- Calendarios externos, app móvil nativa, sincronización con terceros, funcionalidades
  colaborativas, recomendaciones por IA, notificaciones automáticas.
- Políticas de seguridad de sesión/contraseña más allá de lo ya definido (heredado del PRD maestro).

## Risks and Mitigations

- **Riesgo:** operar sobre un usuario "seed" sin autenticación real puede generar trabajo de
  migración cuando se implemente el login.
  **Mitigación:** modelar `User` como entidad real desde el inicio (no un valor hardcodeado fuera
  de la base de datos), de modo que agregar autenticación después solo agregue el flujo de login,
  no cambie el esquema de datos.
- **Riesgo:** calcular XP en este ticket sin tener aún el panel de nivel/estadísticas puede generar
  inconsistencias si la fórmula de nivel cambia antes de implementarse esa vista.
  **Mitigación:** la fórmula de XP por dificultad (RN-03) es fija según el PRD maestro y no se
  modifica en este ticket; el cálculo de nivel (RN-05) no se implementa aquí, solo el acumulado de
  XP.

## Dependencies

- Base de datos relacional (PostgreSQL) disponible, con Prisma como ORM (ver AGENTS.md → Stack).
- Entidad `User` en el esquema (mínima, sin flujo de autenticación) para asociar tareas y hábitos.
