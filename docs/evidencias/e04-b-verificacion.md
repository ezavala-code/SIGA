# Evidencia de verificación E04-B: estudiantes y docentes

Fecha: 2026-10-10. E04 completa; E05 queda como siguiente etapa.

## Alcance comprobado

- API protegida por rol ADMINISTRADOR, CSRF y origen globales; pantallas web para alta, consulta, búsqueda, paginación y edición de estudiantes/docentes.
- Correo normalizado a minúsculas; matrícula y número de empleado recortados y normalizados a mayúsculas; restricciones únicas verificadas en PostgreSQL y traducidas a conflicto legible.
- Las altas de personas y cuentas correspondientes se realizan en una misma transacción y registran auditoría. La cuenta inicia inactiva y no se devuelve contraseña ni hash. Se almacena solamente un hash de valor aleatorio que se descarta; no se puede iniciar sesión con la cuenta recién creada.
- La baja lógica desactiva el acceso y revoca sesiones. Reactivar al estudiante/docente no reactiva la cuenta. Las inscripciones, certificados y grupos históricos se conservan.
- Cambiar el plan de un estudiante con inscripciones o certificados se rechaza. La fecha de ingreso se valida como fecha calendario y los planes de alta deben estar activos.
- No se requirió migración: se reutilizaron las entidades E02.

## Verificaciones ejecutadas

| Verificación | Resultado observado |
| --- | --- |
| `npm run check` | Correcto: lint, TypeScript, 13 pruebas API unitarias, 7 pruebas web y builds API/web. |
| `npm run test:integration` | 53 pruebas correctas en 5 suites contra PostgreSQL de prueba; incluye acceso por rol/CSRF, altas de ambos perfiles, normalización, duplicados, búsqueda/paginación, baja, revocación de sesión, plan con historial y grupos conservados. Los fixtures se revierten. |
| `npm run test:e2e` con API/web nativas | 10/10 correctas en escritorio/móvil. El administrador abre catálogos y personas; el estudiante es redirigido fuera de ambas rutas administrativas. |
| `docker compose up --build -d --wait` | Correcto. API y base saludables; web activa en `http://localhost:8080`. |
| `GET http://localhost:8080/api/health` | `status: ok`; base `up`. |
| `SIGA_E2E_BASE_URL=http://localhost:8080 npm run test:e2e` (PowerShell) | 10/10 correctas contra Docker, escritorio/móvil. |
| `npm run format:check`, `git diff --check` | Correctos al cerrar E04-B. |

Las pruebas de integración utilizan un namespace aleatorio y revierten sus fixtures; no dejan personas persistentes. Las E2E consultan únicamente los datos ficticios ya cargados. No se borraron volúmenes, no se hizo reset y no hubo migración nueva.

## Límites

Las cuentas nuevas quedan inactivas hasta que exista un proceso seguro separado para asignar credenciales; E04-B no genera contraseñas recuperables ni permite activar acceso implícito. Matrícula, grupos, matrícula académica, notas, certificados, pruebas de carga, CI remoto y despliegue corresponden a E05–E11.
