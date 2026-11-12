# Evidencia E06: matrícula transaccional

Fecha de ejecución: 2026-10-10. Base de verificación: PostgreSQL real; Docker local. No se añadió migración: se reutilizan `Inscripcion`, la restricción única estudiante/asignatura/periodo, las relaciones de grupo/plan/política y `Auditoria` de E02.

## Resultado funcional

- Solo ESTUDIANTE puede consultar `/matriculas/oferta`, `/matriculas/me` o ejecutar `POST /matriculas`; autenticación, rol, sesión propia y CSRF se verifican en API. El cuerpo de alta solo admite `grupoId`; el estudiante se deriva del usuario autenticado.
- La API vuelve a comprobar perfil, plan, asignatura, grupo, docente, periodo y ventana dentro de la transacción. Las fechas se interpretan como `[inscripcionInicio, inscripcionFin)`.
- RN-01 se aplica por defecto mediante `EXIGIR_PRERREQUISITOS=true`; la variable permite desactivarlo expresamente. Un intento calificado acredita según la mínima de su política. La reinscripción aprobada usa `permiteReinscripcionAprobada` de la política del periodo actual. D09–D13 continúan como propuestas académicas.
- La transacción serializable bloquea estudiante/cuenta y luego grupo, usando el mismo bloqueo de cupo que E05. Ocupación y duplicidad se verifican dentro de ese límite; inscripción pendiente, créditos congelados y auditoría se confirman juntas. Conflictos de serialización y deadlock tienen como máximo tres intentos.
- La pantalla del estudiante presenta grupos, lugares, motivos de rechazo e historial propio. No incluye cancelación de autoservicio.

## Pruebas ejecutadas

| Criterio | Evidencia |
| --- | --- |
| CP-03 | Rechaza prerrequisito pendiente; confirma que la fila y auditoría no cambian; al agregar un intento previo aprobado permite la inscripción y conserva `PENDIENTE` y créditos `8.00`. |
| CP-04 | Dos estudiantes envían matrícula simultánea por un grupo de cupo 1: una respuesta 201, una 409; consulta final confirma ocupación 1, no mayor al cupo, y una auditoría nueva. |
| CP-05 | El mismo estudiante solicita la misma asignatura/periodo en dos grupos a la vez: una respuesta 201 y otra 409; queda una sola fila para esa asignatura/periodo y una sola auditoría nueva. |
| CP-08 | Rechaza periodo cerrado, ventana aún no iniciada y perfil académico inactivo. |
| Seguridad | Sin sesión responde 401; otros roles responden 403; falta de CSRF responde 403; campos extra como `estudianteId` responden 400. Historial y oferta no reciben ID de propietario desde cliente. |

Las fixtures de la suite normal se revierten con transacción. El runner crea un esquema aleatorio dentro de la base `siga_test`, aplica allí las migraciones, ejecuta la suite completa (incluidas las dos carreras con transacciones HTTP independientes) y elimina únicamente ese esquema al final. Así las inscripciones y auditorías inmutables de concurrencia no se borran ni se guardan en la base compartida.

## Comandos y resultados

- `npm run check`: correcto; lint, tipos, 14 pruebas API unitarias, 7 pruebas web y build de API/web.
- `npm run test:integration`: 63/63 correctas en 7 suites con PostgreSQL real, incluidas las seis pruebas E06.
- `npm run test:e2e`: 10/10 correctas en API/web nativas, escritorio y móvil.
- `SIGA_E2E_BASE_URL=http://localhost:8080 npm run test:e2e`: 10/10 correctas contra Docker, escritorio y móvil.
- `docker compose up --build -d --wait`: correcto; DB, API y web sanas; `GET http://localhost:8080/api/health` devolvió estado `ok` y base `up`. Se conservó el volumen y no se aplicaron migraciones nuevas.
- `npm run format:check` y `git diff --check`: correctos.

La comprobación E2E consulta la oferta y el historial; no crea matrículas en las cuentas demo. No se publicó el servicio ni se creó un commit. CI remoto sigue pendiente. D09–D13 deben revisarse con la autoridad académica antes de presentarse como reglamento aprobado.
