# Evidencia E02 — 2026-10-09

Entorno real Windows, Node 24.19.0/npm 12.2.0, PostgreSQL 18.6 privado en 55432 (siga_dev) y 55433 (siga_test). Prisma/client/adapter 7.10.0. No se usaron datos personales reales.

| Verificación | Resultado |
| --- | --- |
| prisma validate/generate | Esquema válido; cliente ESM generado. |
| db:test:migrate | Inicial e integridad aplicadas en base vacía, después identidad/historial; todas correctas. |
| db:migrate | Tres migraciones aplicadas en siga_dev vacía; repetición sin pendientes. |
| db:status | Esquema al día, tres migraciones. |
| db:seed dos veces | Mismo dataset; 7 usuarios, 4 estudiantes, 2 docentes, 2 programas, 5 grupos, 4 inscripciones. |
| migrate diff | Sin diferencias con schema; checks/triggers fuera del alcance del diff, comprobados con integración. |
| check | Lint/typecheck/build correctos; 12 unitarias API + 4 componentes. |
| test:integration | 38 aprobadas: 34 de datos y 4 de infraestructura. |
| test:e2e | 4 aprobadas: disponibilidad, ruta 404 y adaptación escritorio/móvil. |
| npm audit --omit=dev | Cero hallazgos tras overrides de dependencias transitivas. |
| npm ci --no-audit --no-fund | 850 paquetes instalados; se detuvieron servidores propios para liberar archivo nativo bloqueado. |
| docker compose config --quiet | Correcto, también compose de pruebas. Build/ejecución pendientes del reinicio y motor. |

Las pruebas verifican duplicados de correo/matrícula/empleado, roles, sesiones, créditos, prerrequisitos y ciclos, cupos positivos, periodos, política inmutable, notas fuera de escala/precisión, cero frente a NULL, FK compuestas y duplicados entre grupos, preservación de historial/auditoría, certificados sin archivo, unicidad de códigos y revocación/reemisión.

No acreditan aún control concurrente de cupo, reglas de elegibilidad ni PDFs reales. Las fixtures de certificados son metadatos temporales que se revierten. Cada fixture hace rollback; la consulta real posterior se guardó en e02-datos.json: 15 tablas/3 migraciones en ambas bases, cero usuarios/estudiantes/inscripciones/certificados en pruebas.

Semillas idempotentes verificadas también dentro de integración: se modifica un nombre, se repite seed y se conserva el cambio. Cuentas demo deshabilitadas con contraseñas aleatorias descartadas. No se truncó ni reseteó ninguna base.

La primera ronda de tests detectó un formato distinto de errores en adapter-pg: se ajustó la aserción para verificar el SQLSTATE original, sin relajar restricciones. Prisma diff detectó solo la representación textual del default del código; se alineó schema con la forma canónica de PostgreSQL, sin modificar migraciones aplicadas.

Avisos: VM modules experimental esperado; scripts opcionales de npm bloqueados sin impedir generación/build. Avisos moderados de dependencias de desarrollo no resueltos con actualizaciones mayores automáticas. Ejecución remota CI y construcción Docker no acreditadas.
