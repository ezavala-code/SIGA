# Evidencia de verificación E05: periodos y grupos

Fecha: 2026-10-10. E05 completada; E06 queda como siguiente etapa.

## Alcance

- Periodos administrables por ADMINISTRADOR: alta, búsqueda/paginación, edición, fechas, ventana de inscripción, estado explícito y asociación de política.
- Políticas mostradas con `esPropuesta`; no se modifican ni se presentan como reglas aprobadas. D09–D13 siguen pendientes.
- Grupos administrables por ADMINISTRADOR: relación plan/asignatura/periodo/docente, capacidad positiva, ocupación no cancelada y baja lógica.
- Docente consulta exclusivamente sus grupos mediante la identidad derivada de la sesión.
- Auditoría de periodos y grupos en la misma transacción, con valores anteriores y posteriores para cambios.
- No se agregó migración. Se reutiliza el esquema E02; no se modificó ni eliminó el volumen de Docker.

## Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| `npm run check` | Correcto: lint, TypeScript, 13 pruebas API, 7 pruebas web y builds API/web. |
| `npm run test:integration` | 57/57 en 6 suites contra PostgreSQL `siga_test`; 4 casos nuevos RF-05. Fixtures aleatorios revertidos, sin filas persistentes. |
| `npm run test:e2e` | 10/10 con API/web nativas, escritorio y móvil. Incluye acceso admin a oferta y consulta de grupos del docente. |
| `docker compose up --build -d --wait` | Correcto: imágenes API/web/migrate compiladas; `migrate` terminó con código 0; base, API y web saludables. |
| `GET http://localhost:8080/api/health` | `status: ok`; `checks.database: up`. |
| `SIGA_E2E_BASE_URL=http://localhost:8080 npm run test:e2e` (PowerShell) | 10/10 contra Docker, escritorio y móvil. |
| `npm run format:check`; `git diff --check` | Correctos al cerrar E05. |

## Reglas verificadas

- Claves de periodo/grupo normalizadas; duplicados y fechas/ventanas invertidas rechazados.
- No se crea un grupo en periodo cerrado; no se mueve un grupo activo a periodo cerrado.
- El grupo debe relacionar asignatura de su plan y docente activo. El grupo hereda la política del periodo.
- El cupo no se reduce por debajo de inscripciones activas; se permite bajarlo exactamente a la ocupación. Actualización con bloqueo de fila y transacción serializable.
- Si hay inscripciones, no se cambia la identidad académica del grupo. La desactivación lógica conserva sus inscripciones.
- Un docente no obtiene grupos de otro docente modificando parámetros; la ruta no admite ID de propietario.

## Límites y continuación

CP-08 queda parcial: E05 comprueba periodo cerrado y capacidad; ventana vigente y elegibilidad del estudiante corresponden a E06 y no se declaran aprobadas por esta etapa. La base no impone por sí sola el cupo al insertar inscripciones. E06 debe tomar el mismo bloqueo de fila antes de crear la matrícula y revalidar periodo abierto, ventana actual, capacidad, prerrequisitos y unicidad en la transacción. La zona institucional no se ha decidido; el formulario captura la hora local del navegador y guarda el instante en UTC. CI remoto, carga, despliegue y aceptación final siguen pendientes.
