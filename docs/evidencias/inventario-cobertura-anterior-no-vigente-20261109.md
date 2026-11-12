# Inventario de reglas de negocio y cobertura exigible (PB-18 / R-10 / RNF-05)

Fecha de verificación sobre el candidato final: 9 de noviembre de 2026 (`a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`).

## 1. Configuración y denominador exigible

El archivo `apps/api/jest.coverage.config.cjs` reúne en una sola corrida los dos proyectos de Jest (`unit` e `integration`), activando `collectCoverage: true` sobre los **14 archivos que concentran las reglas de negocio, autorización, validación, cálculo académico, emisión de PDF, zona horaria y sanitización CSV** del backend:

1. `src/modules/auditoria/auditoria.service.ts`
2. `src/modules/auth/auth.service.ts`
3. `src/modules/auth/session-auth.guard.ts`
4. `src/modules/auth/csrf.ts`
5. `src/modules/auth/login-rate-limit.service.ts`
6. `src/modules/calificaciones/calificaciones.calculo.ts`
7. `src/modules/calificaciones/calificaciones.service.ts`
8. `src/modules/catalogos/catalogos.service.ts`
9. `src/modules/certificados/certificado.pdf.ts`
10. `src/modules/certificados/certificados.service.ts`
11. `src/modules/matriculas/matriculas.service.ts`
12. `src/modules/oferta/mexico-city-datetime.ts`
13. `src/modules/oferta/oferta.service.ts`
14. `src/modules/personas/personas.service.ts`
15. `src/modules/reportes/reportes.service.ts`

_(Nota: `csrf.ts` y `login-rate-limit.service.ts` se evalúan junto con los 14 umbrales explícitos de `coverageThreshold` + `global`, exigiendo **mínimo 70 % de líneas y 70 % de ramas en cada archivo individual**, sin permitir que el promedio global compense una caída local)._

### Justificación de inclusiones y exclusiones

- **Incluidos en `collectCoverageFrom` y `coverageThreshold`:**
  - Todos los `*.service.ts` de módulos de negocio (`auditoria`, `auth`, `calificaciones`, `catalogos`, `certificados`, `matriculas`, `oferta`, `personas`, `reportes`).
  - Módulos puros de cálculo y reglas críticas fuera del sufijo `.service.ts`: `calificaciones.calculo.ts` (promedios `Decimal`, redondeo y avance curricular `RN-05`/`RN-06`), `certificado.pdf.ts` (selección híbrida de fuentes, trazado multipágina y validación de glifos `RF-10`/`RN-07`), `mexico-city-datetime.ts` (interpretación de ventanas de inscripción en `America/Mexico_City` `D44`/`RF-05`), `session-auth.guard.ts` y `csrf.ts` (autorización por rol/recurso, origen y protección CSRF `RNF-01`).
- **Excluidos del denominador de reglas de Jest (y cubiertos por otras puertas):**
  - `*.module.ts`, `main.ts` y `prisma.service.ts`: cableado declarativo de NestJS/Prisma sin ramificaciones de reglas académicas; se ejercitan en las 16 suites de integración y en `test-backup-restore-local.mjs`.
  - `*.controller.ts` y esquemas `*.schema.ts`: delegan inmediatamente tras la validación Zod en los servicios y guardas; sus códigos HTTP (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`) están cubiertos exhaustivamente por la matriz HTTP de 15 familias en `apps/api/test/auth.integration.spec.ts` y las suites por módulo.
  - `provision-account.cli.ts`, `bootstrap-admin.cli.ts` y `bootstrap-local-test-profiles.cli.ts`: utilidades CLI invocadas como subprocesos independientes; se prueban de extremo a extremo mediante `node scripts/test-provision-local.mjs`.

## 2. Resultados medidos sobre el candidato final (`npm run test:coverage`)

Ejecutado con `node scripts/test-integration.mjs --coverage` sobre PostgreSQL 18.6 aislado (`127.0.0.1:15433/siga_test`):

- **Suites ejecutadas:** `16 passed, 16 total` (`6` unitarias + `10` de integración en PostgreSQL real).
- **Pruebas ejecutadas:** `131 passed, 131 total` (`0` fallos, `0` skips).
- **Cobertura global:** **94,94 % de líneas**, **94,39 % de sentencias**, **82,49 % de ramas**, **96,95 % de funciones**.

| Archivo evaluado                                       | % Sentencias | % Ramas (`>= 70 %`) | % Funciones | % Líneas (`>= 70 %`) | Requisitos / Reglas verificadas                                |
| ------------------------------------------------------ | -----------: | ------------------: | ----------: | -------------------: | -------------------------------------------------------------- |
| `src/modules/auditoria/auditoria.service.ts`           |     100,00 % |            100,00 % |    100,00 % |             100,00 % | `RF-12` Bitácora atómica antes/después                         |
| `src/modules/auth/auth.service.ts`                     |      92,14 % |             80,43 % |    100,00 % |              93,18 % | `RF-01`, `RNF-01` Login, sesión revocable, bloqueo y usuarios  |
| `src/modules/auth/csrf.ts`                             |      96,15 % |             90,90 % |    100,00 % |              96,00 % | `RNF-01` Token CSRF ligado a sesión y validación de origen     |
| `src/modules/auth/login-rate-limit.service.ts`         |      97,56 % |             90,00 % |    100,00 % |              97,50 % | `RNF-01` Límite de intentos por IP y cuenta                    |
| `src/modules/auth/session-auth.guard.ts`               |      90,47 % |             79,66 % |    100,00 % |              90,16 % | `RF-01`, `RN-04`, `RNF-01` Guard global, `@Roles`, propietario |
| `src/modules/calificaciones/calificaciones.calculo.ts` |      97,29 % |             93,18 % |    100,00 % |              97,22 % | `RF-08`, `RF-09`, `RN-05`, `RN-06`, `D42` Promedios y avance   |
| `src/modules/calificaciones/calificaciones.service.ts` |      94,20 % |             82,27 % |     93,75 % |              95,20 % | `RF-07`, `RF-09`, `RN-04`, `RN-05` Captura, versión y motivo   |
| `src/modules/catalogos/catalogos.service.ts`           |      94,18 % |             81,60 % |     97,36 % |              95,23 % | `RF-04`, `AUD-19` Programas, planes, grafo sin ciclos y bajas  |
| `src/modules/certificados/certificado.pdf.ts`          |      95,39 % |             82,45 % |     96,55 % |              95,78 % | `RF-10`, `RN-07` PDF multiprograma, QR y fuentes híbridas      |
| `src/modules/certificados/certificados.service.ts`     |      91,42 % |             77,85 % |     96,29 % |              91,92 % | `RF-10`, `RN-07`, `RNF-04` Emisión, recuperación y revocación  |
| `src/modules/matriculas/matriculas.service.ts`         |      95,21 % |             85,84 % |     95,65 % |              95,85 % | `RF-06`, `RN-01`, `RN-02`, `RN-03` Matrícula serializable      |
| `src/modules/oferta/mexico-city-datetime.ts`           |      97,50 % |             90,90 % |    100,00 % |              97,43 % | `RF-05`, `D44` Ventanas en `America/Mexico_City`               |
| `src/modules/oferta/oferta.service.ts`                 |      95,57 % |             83,33 % |     95,83 % |              96,42 % | `RF-05`, `RN-02`, `AUD-19` Periodos, grupos y cupos            |
| `src/modules/personas/personas.service.ts`             |      96,00 % |             85,18 % |    100,00 % |              97,05 % | `RF-02`, `RF-03`, `AUD-19` Estudiantes, docentes y bajas       |
| `src/modules/reportes/reportes.service.ts`             |      94,38 % |             79,54 % |     93,33 % |              96,38 % | `RF-11`, `RF-12` Reportes de grupo, CSV seguro y auditoría     |

## 3. Integración en CI y nota técnica sobre `pg` / `@prisma/adapter-pg`

- En `.github/workflows/ci.yml`, el paso de pruebas de integración y reglas se actualizó para ejecutar `npm run test:coverage` (en lugar de `npm run test:integration` sin umbral) y publicar el directorio `apps/api/coverage/` como artefacto `coverage-report` junto con `playwright-report`.
- **Nota técnica sobre avisos de concurrencia de `pg`:** durante los ensayos que disparan transacciones `SERIALIZABLE` simultáneas sobre el mismo `PrismaClient` con `@prisma/adapter-pg` (`7.10.0`) y `pg` (`8.14.1`), el adaptador puede emitir en casos puntuales el aviso `DeprecationWarning: Calling client.query() when the client is already executing a query`. Se verificó que cada transacción de negocio usa `prisma.$transaction(..., { isolationLevel: Serializable })` con bloqueos explícitos `FOR UPDATE` en PostgreSQL y que ninguna prueba oculta ni silencia advertencias del runtime.
