# PRD-001: QuestIt — Aplicación web para gestionar tareas y hábitos mediante gamificación

## Contexto y Problema

Actualmente muchas personas utilizan distintas herramientas para registrar tareas y hábitos, lo que dificulta visualizar su progreso personal y mantener la motivación a largo plazo.

QuestIt busca centralizar estas actividades en una única aplicación web, permitiendo registrar tareas, hábitos y visualizar el progreso mediante un sistema de experiencia (XP), niveles y estadísticas.

**Personas**

- **Estudiante:** necesita organizar tareas académicas y desarrollar hábitos de estudio.
- **Profesional:** necesita gestionar tareas personales y mantener hábitos diarios.
- **Usuario orientado al crecimiento personal:** necesita medir su progreso y mantenerse motivado.

---

## Objetivos

- Permitir registrar y gestionar tareas y hábitos desde una única aplicación.
- Mostrar el progreso del usuario mediante experiencia, niveles y estadísticas.
- Mantener un historial persistente de la actividad del usuario.

---

## Requerimientos Funcionales

- **RF-01:** El sistema debe permitir registrar un usuario.
- **RF-02:** El sistema debe permitir iniciar sesión.
- **RF-03:** El sistema debe permitir cerrar sesión.
- **RF-04:** El sistema debe permitir crear una tarea indicando título, descripción y nivel de dificultad.
- **RF-05:** El sistema debe permitir editar una tarea.
- **RF-06:** El sistema debe permitir eliminar una tarea.
- **RF-07:** El sistema debe permitir marcar una tarea como completada.
- **RF-08:** El sistema debe permitir crear un hábito indicando nombre y nivel de dificultad.
- **RF-09:** El sistema debe permitir editar un hábito.
- **RF-10:** El sistema debe permitir eliminar un hábito.
- **RF-11:** El sistema debe permitir registrar el cumplimiento diario de un hábito.
- **RF-12:** El sistema debe asignar automáticamente la experiencia correspondiente a la dificultad de una tarea o hábito completado.
- **RF-13:** El sistema debe calcular el nivel del usuario según la experiencia acumulada.
- **RF-14:** El sistema debe mostrar la experiencia acumulada del usuario.
- **RF-15:** El sistema debe mostrar el nivel actual del usuario.
- **RF-16:** El sistema debe mostrar la cantidad de tareas completadas por el usuario.
- **RF-17:** El sistema debe mostrar la cantidad total de registros de cumplimiento diario de hábitos del usuario.
- **RF-18:** El sistema debe mostrar únicamente la información perteneciente al usuario autenticado.
- **RF-19:** El sistema debe almacenar de forma persistente la información de las cuentas de usuario.
- **RF-20:** El sistema debe almacenar de forma persistente las tareas creadas por los usuarios.
- **RF-21:** El sistema debe almacenar de forma persistente los hábitos creados por los usuarios.
- **RF-22:** El sistema debe almacenar de forma persistente la experiencia acumulada de cada usuario.
- **RF-23:** El sistema debe almacenar de forma persistente el nivel actual de cada usuario.
- **RF-24:** El sistema debe permitir visualizar un historial cronológico de las tareas completadas y los hábitos cumplidos por el usuario autenticado.

---

## Reglas de Negocio

- **RN-01:** Cada tarea debe tener asociado un nivel de dificultad.
- **RN-02:** Cada hábito debe tener asociado un nivel de dificultad.
- **RN-03:** La experiencia otorgada depende del nivel de dificultad:
  - Fácil: **5 XP**
  - Media: **10 XP**
  - Difícil: **20 XP**

- **RN-04:** La experiencia acumulada del usuario corresponde a la suma de la experiencia obtenida por cada tarea completada (una sola vez por tarea) y por cada registro de cumplimiento diario de hábito (uno por hábito y por día calendario).
- **RN-05:** El nivel del usuario se calcula mediante la fórmula:

> **Nivel = ⌊XP acumulada / 100⌋ + 1**

- **RN-06:** Un hábito solo puede tener un registro de cumplimiento por día calendario, para un mismo usuario y hábito. Un intento de registrar el cumplimiento cuando ya existe un registro para esa fecha no crea un nuevo registro ni otorga XP adicional.
- **RN-07:** Completar una tarea es una operación idempotente: si la tarea ya se encuentra en estado "completada", un nuevo intento de completarla no otorga XP adicional ni modifica el registro existente.

---

## Requerimientos No Funcionales

- **RNF-01:** La creación, edición o eliminación de tareas y hábitos debe completarse en menos de **2 segundos (p95)**.
- **RNF-02:** La carga de la página principal debe completarse en menos de **3 segundos (p95)**.
- **RNF-03:** El sistema debe persistir el **100 %** de los cambios confirmados por el usuario.
- **RNF-04:** La interfaz debe ser usable en dispositivos con un ancho de pantalla comprendido entre **360 px y 1920 px**.

---

## Criterios de Aceptación

- **AC-01 (RF-01):** Dado un visitante, cuando completa el formulario de registro con un email con formato válido no registrado previamente y una contraseña de al menos 8 caracteres, entonces el sistema crea una nueva cuenta.
- **AC-02 (RF-02):** Dado un usuario registrado, cuando ingresa credenciales válidas, entonces el sistema inicia su sesión.
- **AC-03 (RF-03):** Dado un usuario autenticado, cuando cierra sesión, entonces el sistema finaliza su sesión y exige volver a autenticarse para acceder a sus datos.
- **AC-04 (RF-04):** Dado un usuario autenticado, cuando crea una tarea indicando título, descripción y dificultad, entonces la tarea aparece en su lista.
- **AC-05 (RF-05):** Dado una tarea existente, cuando el usuario modifica su información y guarda los cambios, entonces la tarea refleja los datos actualizados.
- **AC-06 (RF-06):** Dado una tarea existente, cuando el usuario la elimina, entonces deja de aparecer en su lista.
- **AC-07 (RF-07):** Dado una tarea pendiente, cuando el usuario la marca como completada, entonces la tarea cambia al estado "completada".
- **AC-08 (RF-08):** Dado un usuario autenticado, cuando crea un hábito indicando nombre y dificultad, entonces el hábito aparece en su lista.
- **AC-09 (RF-09):** Dado un hábito existente, cuando el usuario modifica su información y guarda los cambios, entonces el hábito refleja los datos actualizados.
- **AC-10 (RF-10):** Dado un hábito existente, cuando el usuario lo elimina, entonces deja de aparecer en su lista.
- **AC-11 (RF-11):** Dado un hábito existente, cuando el usuario registra su cumplimiento diario por primera vez ese día, entonces el sistema almacena un registro asociado a la fecha actual y suma la XP correspondiente.
- **AC-12 (RF-12):** Dado una tarea con dificultad **Media**, cuando el usuario la completa, entonces el sistema suma exactamente **10 XP** a la experiencia acumulada del usuario.
- **AC-13 (RF-13):** Dado un usuario con **205 XP** acumulados, cuando el sistema recalcula su progreso, entonces muestra el **Nivel 3**.
- **AC-14 (RF-14):** Dado un usuario autenticado, cuando accede al panel principal, entonces visualiza su experiencia acumulada.
- **AC-15 (RF-15):** Dado un usuario autenticado, cuando accede al panel principal, entonces visualiza su nivel actual.
- **AC-16 (RF-16):** Dado un usuario con tareas completadas, cuando accede al panel principal, entonces visualiza la cantidad total de tareas completadas.
- **AC-17 (RF-17):** Dado un usuario con registros de cumplimiento diario de hábitos, cuando accede al panel principal, entonces visualiza la cantidad total de registros de cumplimiento diario de hábitos.
- **AC-18 (RF-18):** Dado un usuario autenticado, cuando consulta sus datos, entonces el sistema muestra únicamente sus tareas, hábitos y estadísticas.
- **AC-19 (RF-19):** Dado un usuario con una cuenta registrada, cuando vuelve a iniciar sesión, entonces el sistema recupera su información de cuenta previamente almacenada.
- **AC-20 (RF-20):** Dado un usuario con tareas creadas, cuando vuelve a iniciar sesión, entonces el sistema recupera todas sus tareas previamente almacenadas.
- **AC-21 (RF-21):** Dado un usuario con hábitos creados, cuando vuelve a iniciar sesión, entonces el sistema recupera todos sus hábitos previamente almacenados.
- **AC-22 (RF-22):** Dado un usuario con experiencia acumulada, cuando vuelve a iniciar sesión, entonces el sistema recupera su experiencia acumulada previamente almacenada.
- **AC-23 (RF-23):** Dado un usuario con un nivel calculado, cuando vuelve a iniciar sesión, entonces el sistema recupera su nivel previamente almacenado.
- **AC-24 (RF-05, RF-06, RF-09, RF-10):** Dado un usuario autenticado, cuando intenta editar o eliminar una tarea o hábito perteneciente a otro usuario, entonces el sistema rechaza la operación y no realiza ningún cambio.
- **AC-25 (RF-24):** Dado un usuario autenticado, cuando accede a su historial de actividad, entonces visualiza en orden cronológico descendente las tareas completadas y los hábitos cumplidos, incluyendo fecha y XP obtenida en cada uno.
- **AC-26 (RF-11, RN-06):** Dado un hábito con un registro de cumplimiento ya almacenado para la fecha actual, cuando el usuario intenta registrar el cumplimiento nuevamente ese mismo día, entonces el sistema rechaza la operación sin crear un nuevo registro ni sumar XP adicional.
- **AC-27 (RF-07, RN-07):** Dado una tarea en estado "completada", cuando el usuario intenta completarla nuevamente, entonces el sistema rechaza la operación sin otorgar XP adicional ni modificar el registro existente.

---

## Fuera de Alcance

- Gestión de objetivos personales.
- Sistema de logros.
- Integración con calendarios externos.
- Aplicación móvil nativa.
- Sincronización con aplicaciones de terceros.
- Funcionalidades colaborativas entre múltiples usuarios.
- Recomendaciones o clasificaciones mediante inteligencia artificial.
- Notificaciones automáticas.
- Políticas específicas de seguridad de contraseñas (algoritmo de hashing, requisitos de complejidad más allá del largo mínimo) y de expiración/renovación de sesión: no definidas en esta versión del PRD.

---

## Riesgos y Dependencias

- **Riesgo:** El crecimiento del historial puede afectar el rendimiento de las consultas.
  **Mitigación:** Diseñar correctamente el modelo de datos e indexar las tablas más consultadas.

- **Riesgo:** La pérdida de información por errores de persistencia.
  **Mitigación:** Utilizar una base de datos relacional con restricciones de integridad y validar las operaciones de escritura.

- **Dependencia:** Disponibilidad de una base de datos relacional para almacenar la información de la aplicación.

- **Dependencia:** Disponibilidad de un servicio de hosting para desplegar la aplicación web.
