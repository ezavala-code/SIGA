# Evidencia de verificación E04-A: catálogos y planes

Fecha: 2026-10-10. Subetapa local; E04-B (estudiantes y docentes) sigue pendiente.

## Alcance comprobado

- API y pantalla de administración de programas, asignaturas y planes, restringidas al rol ADMINISTRADOR.
- Búsqueda y paginación; validación y normalización de claves; rechazo de duplicados; baja lógica y registro de auditoría.
- Composición de planes con créditos decimales, semestre sugerido y prerrequisitos dentro del mismo plan. Se rechazan autorrelaciones y ciclos sin guardar una modificación parcial.
- Revisión optimista del contenido. El contenido de planes con estudiantes, grupos u ofertas/inscripciones se preserva; la nueva versión copia las asignaturas y el grafo de prerrequisitos.
- No se requirió migración: E04-A utiliza las tablas y restricciones SQL existentes de E02.

## Verificaciones ejecutadas

| Verificación | Resultado observado |
| --- | --- |
| `npm run check` | Correcto: lint, TypeScript, 13 pruebas API unitarias, 7 pruebas web y builds API/web. |
| `npm run test:integration` | 49 pruebas correctas en 4 suites contra PostgreSQL de prueba. Los 4 escenarios E04 incluyen autorización/CSRF, claves/duplicados/paginación/baja/auditoría, créditos y ciclos, e historial/versionado del plan. Los fixtures revierten su transacción. |
| `npm run test:e2e` con API/web nativas | 10/10 correctas en escritorio y móvil. |
| `docker compose up --build -d --wait` | Correcto. La base y API quedaron saludables; la web inició correctamente. |
| `GET http://localhost:8080/api/health` | `status: ok`; comprobación de base `up`. |
| `SIGA_E2E_BASE_URL=http://localhost:8080 npm run test:e2e` (entorno PowerShell) | 10/10 correctas contra Docker: portal adaptable, sesión por rol, administrador y catálogos, y estudiante sin acceso a administración. |
| `npm run format:check`, `git diff --check` | Correctos al cerrar la subetapa. |

Las E2E contra Docker reutilizan cuentas ficticias de demostración locales; no se muestran aquí sus credenciales. Las pruebas de integración revierten las modificaciones y no dejan datos de prueba persistentes. No se borraron volúmenes ni se reinició la base.

## Límites

Esta evidencia no acredita la gestión de estudiantes/docentes, la entrega de credenciales, matrícula, reglas académicas aprobadas, CI remoto, despliegue ni pruebas de carga. E04-A no cambia las propuestas D09–D13. E04 permanece en curso hasta completar E04-B.
