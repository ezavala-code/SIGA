# Evidencia E07: calificaciones y avance

Fecha de verificación: 2026-10-10. Datos ficticios. No se creó una migración ni se alteró o eliminó el volumen PostgreSQL de Docker.

## Implementación

- El docente consulta por página las inscripciones únicamente de sus grupos y captura una nota final directa.
- La API valida el rol DOCENTE, perfil activo, asignación al grupo, escala y precisión de la política académica del periodo. La nota se envía como texto decimal; el valor cero es válido.
- Una corrección requiere versión esperada y motivo. Actualización de la inscripción, versión SQL y auditoría con valores anterior/posterior ocurren en una sola transacción.
- El estudiante consulta sin enviar identificadores de estudiante: historial propio, nota final, resultado, promedios y créditos aprobados del plan versionado.
- Los cálculos usan Decimal. El promedio por periodo pondera por créditos de la inscripción; el promedio general aplica la política TODOS/ULTIMO/MEJOR del intento calificado más reciente de cada asignatura. El avance cuenta créditos únicos aprobados y retorna NULL si el plan no tiene créditos.
- D09–D11 y las políticas sembradas siguen marcadas como propuestas; E07 no representa su aprobación institucional. La interpretación técnica de recursamientos está descrita en D35.

## Resultados ejecutados

| Verificación | Resultado |
| --- | --- |
| `npm run check` | Correcto: lint, tipos, 18 pruebas API, 7 pruebas web y build de API/web. |
| `npm run test:integration` | 66/66 pruebas en 8 suites contra PostgreSQL real, dentro de un esquema temporal aislado. Incluye 3 escenarios E07. |
| `npm run test:e2e` nativo | 10/10. Navegación de captura docente e historial/avance estudiantil, escritorio y móvil; no envía cambios a las cuentas demo. |
| `SIGA_E2E_BASE_URL=http://localhost:8080 npm run test:e2e` | 10/10 contra Docker, escritorio y móvil. |
| `docker compose up --build -d --wait` | Correcto; PostgreSQL, API y web saludables. La migración informó que no había migraciones pendientes. |
| `GET http://localhost:8080/api/health` | `status: ok`; base de datos `up`. |
| `npm run format:check` y `git diff --check` | Correctos al cerrar la documentación. |

## Cobertura E07

- CP-06: docente asignado captura; otro docente, estudiante y administrador reciben rechazo; la lista se limita al grupo propio.
- CP-07: las consultas académicas usan la identidad de sesión y no reciben ID de alumno del cliente.
- CP-09: 5.99 reprueba, 6.00 acredita con la política ficticia; se validan rango/precisión y cero válido.
- CP-10: promedio ponderado manual 8.40; pendientes fuera del promedio; sin notas devuelve `null`.
- CP-11: recursamiento no duplica créditos aprobados; plan versionado y división entre cero se manejan.
- Correcciones: motivo obligatorio, auditoría verificable y conflicto ante versión obsoleta.

## Límites

No se implementan parciales ni reglas de fecha límite de captura porque las fuentes no las definen. No se ejecutó CI remoto ni pruebas de carga; permanecen en las etapas correspondientes. Los promedios se presentan a dos decimales y conservan la precisión decimal durante las operaciones.
