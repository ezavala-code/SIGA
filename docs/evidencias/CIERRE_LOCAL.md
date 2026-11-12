# Dossier de Cierre Técnico Local y Acta de Entrega Académica (PB-01 a PB-30)

- **Fecha de corte técnico:** 9 de noviembre de 2026 (`America/Mexico_City`).
- **Candidato final congelado (huella SHA-256 de 147 archivos de código, contratos, scripts y configuración):**
  `a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`
- **Manifiesto de entrega empaquetable:** [`docs/evidencias/manifiesto-candidato-final.sha256`](manifiesto-candidato-final.sha256).
- **Imágenes Docker construidas y verificadas desde el candidato final:**
  - `siga-candidato-api:local`: `sha256:f76daa3abd3c9d46ddfb22fe5f46a268c61c4065e149179aa4eb390e997c90f2`
  - `siga-candidato-web:local`: `sha256:1833bbefadd85a35ced6d4183f7f6080ea0e89a710d444fa4c56ca5face8cc7e`
  - `siga-candidato-migrate:local`: `sha256:8e05743050a9c55d5298b5fa903f25324f872473b675957e9654518ad66987c8`
- **Entorno verificado:** Linux x86_64, Node.js `v24.19.0`, npm `12.2.0`, PostgreSQL `18.6-alpine`, Nginx `1.30.5-alpine`, Chromium (Playwright `1.58.2`).

---

## 1. Estado de las Puertas del Plan Maestro (`Puerta F` y `Puerta A`)

| Puerta | Denominador del Plan Maestro | Estado actual | Resumen honesto |
| --- | --- | --- | --- |
| **Puerta F** (Funcionalidad técnica local verificada) | **26 / 26** filas técnicas (`12 RF + 7 RN + 7 RNF`) + condiciones técnicas del plan | **VERIFICADA TÉCNICAMENTE EN VERDE (26/26 `PASO` en `V`)** | Todos los subcasos obligatorios (`CP-01` a `CP-18`), cobertura individual `>= 70 %`, E2E en escritorio/móvil/zoom `200 %` sin skips, carga latina y Unicode (`D45`), recuperación ante crash y pérdida de respuesta HTTP, instalación limpia y recuperación operativa tras desastre (`D46`) pasaron sobre el mismo candidato final congelado. Queda lista para ratificación del Responsable Académico (`RA`). |
| **Puerta A** (Aceptación académica y cierre humano) | **31 / 31** filas totales (`26 técnicas + 5 transversales`: `ENT-TGS`, `ENT-SCRUM`, `ENT-XP`, `ENT-DOC`, `ENT-ACE`) | **PENDIENTE DE EJECUCIÓN HUMANA Y FIRMA DE `RA` (`28/31` verificadas técnicamente: `26` técnicas + `ENT-TGS` + `ENT-DOC`; `0/31` con firma humana en `A`)** | Los entregables técnicos y documentales (`ENT-TGS`, `ENT-DOC`, manuales `.docx`, guiones de piloto, instrumento `>= 80/100` y formatos de acta) están completos y verificados. `ENT-SCRUM`, `ENT-XP`, `ENT-ACE` y la columna `A` (Aceptación humana) permanecen abiertos hasta que personas reales ejecuten el piloto, acrediten la capacitación y firmen esta acta. No se inventan participantes, ceremonias ni firmas. |

---

## 2. Resumen de baterías ejecutadas sobre el candidato final congelado

Todas las comprobaciones siguientes se ejecutaron sin modificar ni un solo byte de los 147 archivos técnicos del candidato (`a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`):

1. **Formato, lint, tipos, pruebas unitarias y compilación (`npm run format:check && npm run check`):**
   - **Resultado:** `PASO` (`0` errores/advertencias de ESLint, `typecheck` en `@siga/contracts`, `@siga/api` y `@siga/web`, `6` suites / `37` pruebas unitarias API, `13` suites / `40` pruebas unitarias Web, compilación de producción API + Web exitosa).
2. **Cobertura exigible de reglas e integración en PostgreSQL real (`npm run test:coverage`):**
   - **Resultado:** `PASO` (**`16` suites, `131` pruebas aprobadas, `0` fallos, `0` skips**).
   - **Cobertura alcanzada:** global **`94,94 %` líneas** y **`82,49 %` ramas**; los 14 archivos del umbral individual superaron el `70 %` de líneas y `70 %` de ramas (mínimo observado en ramas: `77,85 %` en `certificados.service.ts`; mínimo en líneas: `90,16 %` en `session-auth.guard.ts`). Detalle en [`docs/INVENTARIO_COBERTURA_REGLAS.md`](../INVENTARIO_COBERTURA_REGLAS.md).
3. **Batería E2E completa en navegador real (`npm run test:e2e -- --workers=1`):**
   - **Resultado:** `PASO` (**`34/34` pruebas aprobadas** en proyectos `desktop` `1366x900` y `mobile` `360x800`, **`0` skips, `0` fallos**).
   - Cubre acceso y aislamiento de caché `A -> B` con respuestas lentas (`acceso.spec.ts`), recorrido académico completo y borradores docentes (`recorrido-academico.spec.ts`), paginación por encima de límites previos y opciones históricas (`paginacion.spec.ts`), accesibilidad por teclado `Tab` real sin `.focus()` programático (`accesibilidad.spec.ts`) y zoom CSS al `200 %` con `Escape` y cero desbordamiento horizontal (`teclado-zoom.spec.ts`).
4. **Rendimiento bajo carga — escenario PDF Unicode de 5 minutos (`node scripts/test-load.mjs --unicode`):**
   - **Resultado:** `PASO` (`60 s` de calentamiento + `300 s` de medición, `20` usuarios concurrentes, `1.000` estudiantes y `50` grupos ficticios).
   - **Métricas (`pdf_unicode`):** `780` solicitudes medidas, **`0` errores inesperados (`0 %`)**, **`p95 = 670,84 ms`** (`< 2.000 ms` `D45`), `máximo = 856,41 ms`. Artefacto: [`docs/evidencias/carga-unicode-candidato.json`](carga-unicode-candidato.json).
5. **Rendimiento bajo carga — comprobación de las 5 operaciones (`node scripts/test-load.mjs --smoke`):**
   - **Resultado:** `PASO` (`0 %` de errores en las 5 operaciones: `reporte` p95 `155,84 ms`, `oferta` p95 `302,96 ms`, `matricula` p95 `552,39 ms`, `pdf` latino p95 `687,83 ms`, `pdf_unicode` p95 `656,70 ms`), complementando la medición larga de 5 minutos en [`docs/RENDIMIENTO_DEMOSTRACION.md`](../RENDIMIENTO_DEMOSTRACION.md). Artefacto: [`docs/evidencias/carga-smoke-candidato.json`](carga-smoke-candidato.json).
6. **Seguridad y cabeceras del proxy Nginx empaquetado (`node scripts/test-proxy-local.mjs`):**
   - **Resultado:** `PASO` (`health: 200`, `rutaInexistente: 404`, `login: 200`, `sesion: 200`, `logout: 204`, `sesionRevocada: 401`, cabecera única `X-Content-Type-Options: nosniff` en `200`/`404`/SPA, cookie `siga_session` con `HttpOnly; SameSite=Strict; Path=/` y sin `Secure` en HTTP local). Artefacto: [`docs/evidencias/proxy-candidato.json`](proxy-candidato.json).
7. **Respaldo, verificación aislada y simulacro de recuperación operativa tras desastre (`node scripts/test-backup-restore-local.mjs --packaged`):**
   - **Resultado:** `PASO` (`4` migraciones, `16` tablas, `2` constancias PDF — latina `5.105 B` SHA-256 `98fb28a9734eee77bbca63c662f13f81da8e0fde3925a2d1d2ad2800bc82d99a` y Unicode `20.267 B` SHA-256 `3009412bc7c9de7958ed588aa64c17a9e3f3ef4fd94e2b5e0f01f7e8f560e1e0` — detección de alteración deliberada y recuperación operativa completa tras `docker compose down --volumes --remove-orphans` con **`RTO = 9,47 s` (`<= 4 h`)**, **`RPO = 1,18 s` (`<= 24 h`)** y copia retenida en `.local/backups/retenido-candidato` con permisos `0700`/`0600`). Artefacto: [`docs/evidencias/restauracion-candidato.json`](restauracion-candidato.json).
8. **Instalación desde copia limpia sin estado heredado (`R-11` / `CP-15`):**
   - **Resultado:** `PASO` (directorio temporal limpio sin `.env`, `.local`, `dist` ni `generated`; `npm run setup -- --native`, `db:test:migrate`, `db:seed`, `auth:bootstrap:admin` y `auth:bootstrap:local-test-profiles` generaron `.env` y archivos de credenciales con modo `0600`, `4` migraciones aplicadas, programa `ICO-F19` y `3` usuarios activos por rol). Artefacto: [`docs/evidencias/instalacion-limpia-candidato.json`](instalacion-limpia-candidato.json).
9. **Provisión CLI de cuentas arbitrarias y recuperación de constancias ante `SIGKILL` (`node scripts/test-provision-local.mjs` y `node scripts/test-certificados-crash.mjs`):**
   - **Resultado:** `PASO` en ambos scripts sobre contenedores/directorios temporales aislados.
10. **Auditoría de dependencias productivas (`npm audit --omit=dev`):**
    - **Resultado:** `PASO` (`found 0 vulnerabilities`).

---

## 3. Revisión de privacidad, datos sintéticos y reglas del paquete final (`R-14` / `RNF-07` / `ENT-DOC`)

- **Datos exclusivamente sintéticos (`RNF-07`):** todas las semillas, fixtures de pruebas, capturas, reportes CSV y documentos `.md`/`.docx` emplean dominios ficticios (`@siga.local`, `@demo.siga.local`, `EST-2026-*`, `EMP-2026-*`) y los dos programas de demostración autorizados en `D41`. Los datos personales de capturas históricas de referencia permanecen fuera de la semilla y del código.
- **Minimización del verificador público (`RF-10` / `RNF-01`):** `GET /certificados/verificar/:codigo` devuelve únicamente `codigo`, `tipo`, `fechaEmision`, `programa`, `estado` y `nombreAbreviado`, sin exponer matrícula, correo, calificaciones ni historial completo.
- **Regla de inclusión y exclusión del paquete entregable:**
  - **Incluidos (con huella en [`manifiesto-candidato-final.sha256`](manifiesto-candidato-final.sha256)):** `README.md`, `AGENTS.md`, `PLAN_MAESTRO_ENTREGA.md`, `PLAN_RESTANTE_CIERRE_MAESTRO.md`, `EXPLICACION_PLAN_RESTANTE.md`, `package.json`, `package-lock.json`, `.npmrc`, `tsconfig.base.json`, `eslint.config.mjs`, `playwright.config.ts`, `docker-compose.yml`, `docker-compose.public.yml`, `.dockerignore`, `.gitignore`, `.env.example`, `.github/workflows/ci.yml`, `apps/**` (sin `node_modules`/`dist`/`generated`/`coverage`), `packages/**` (sin `dist`), `scripts/**`, `tests/**` y `docs/**` (incluyendo `docs/manuales/*.docx` y `docs/evidencias/**`).
  - **Excluidos estrictamente:** `.env`, `.local/**` (clústeres privados, archivos de contraseñas `admin-acceso*.txt`, `credenciales-siga.txt`, `perfiles-prueba.txt`, respaldos `.local/backups/**`, certificados emitidos `.local/certificados/**`), `node_modules/**`, `dist/**`, `coverage/**`, `playwright-report/**` y `test-results/**`.

---

## 4. Registro de decisiones operativas y asignaciones humanas pendientes (`R-16` / `PB-01`)

Las decisiones `D41` a `D46` fueron aprobadas por el usuario solicitante para el alcance de demostración local (ver [`docs/DECISIONES.md`](../DECISIONES.md)). Para completar la transición hacia operación institucional o cerrar la **Puerta A**, se dejan explícitas las siguientes decisiones y asignaciones que requieren confirmación humana:

| ID / Tema | Estado en demostración local | Pendiente de confirmación por persona responsable (`RA` / Institución) |
| --- | --- | --- |
| **Asignación nominal de roles (`PB-01`)** | Roles funcionales definidos (`RT`, `FE`, `QA`, `RA`). | Registrar nombre completo y cargo real de quien actúa como Responsable Académico (`RA`), Responsable Técnico (`RT`), verificador (`QA`) y participantes del piloto por rol. |
| **Catálogo curricular oficial (`E12` / `D41`)** | Dos programas con datos sintéticos rotulados (`D41`). | Entregar fuente curricular oficial completa de `ICO-F19` (claves, créditos por unidad, seriación obligatoria/optativa) antes de uso institucional. |
| **Reglamento de evaluación y bajas (`D42`–`D44`, `PB-07`, `PB-10`)** | Escala `0–10`, mínima `6.0`, `2` decimales, promedio `TODOS`, zona `America/Mexico_City`; sin notas parciales ni baja de matrícula en autoservicio. | Ratificar si el reglamento definitivo mantiene estas reglas o requiere ponderación de parciales, límite de créditos/horarios o ventana de baja por autoservicio. |
| **Custodia y retención de respaldos (`D46` / `PB-21`)** | Respaldo verificado en `.local/backups/retenido-candidato` (`0700`/`0600`), `RTO = 9,47 s`, `RPO = 1,18 s`. | Designar nombre de la persona administradora encargada de ejecutar `npm run docker:backup` y `npm run docker:restore:verify`, y definir medio externo cifrado fuera del host local. |
| **Evidencia metodológica (`ENT-SCRUM` / `ENT-XP` / `PB-24`)** | Desarrollo y verificación asistidos por agentes con pruebas TDD y trazabilidad completa. | Acordar con `RA` cómo se acredita o adapta el requisito de ceremonias Scrum y programación en parejas humana cuando el encargo se ejecuta de forma individual/asistida. |

---

## 5. Guiones de piloto por rol, evaluación `>= 80/100` y formatos para Puerta A (`R-17` / `R-18` / `PB-17` / `PB-30`)

> **Instrucción de integridad:** Los cuadros siguientes están listos para imprimirse o llenarse durante la sesión real con participantes humanos ajenos a la implementación. **No deben llenarse con nombres ni calificaciones ficticias.**

### 5.1 Tareas críticas del piloto por rol (exigen `100 %` de completitud sin asistencia sobre la solución)

- **Rol 1 — Administración (`ADMINISTRADOR`):**
  1. Iniciar sesión, localizar un programa y crear o consultar un periodo con ventana en `America/Mexico_City`.
  2. Dar de alta un estudiante nuevo, verificar que su cuenta inicia inactiva y provisionar su credencial con el comando local documentado en el manual.
  3. Consultar el reporte de grupos, exportar el CSV de historial y verificar en la bitácora de auditoría los valores `antes`/`después` de un cambio de catálogo.
  4. Revocar con motivo una constancia emitida y comprobar que el verificador público refleja el estado `REVOCADO`.
- **Rol 2 — Docente (`DOCENTE`):**
  1. Iniciar sesión, buscar y paginar sus grupos asignados y abrir el acta de calificaciones de un grupo activo.
  2. Capturar notas finales válidas, intentar guardar una nota fuera de rango (`> 10` o con más de 2 decimales) y verificar el mensaje de validación.
  3. Corregir una calificación previamente guardada indicando motivo y versión, y exportar el CSV de su grupo.
- **Rol 3 — Estudiante (`ESTUDIANTE`):**
  1. Iniciar sesión, revisar la oferta de matrícula de su plan e inscribirse en un grupo elegible.
  2. Consultar su historial de calificaciones, promedio general/por periodo y porcentaje de avance curricular.
  3. Emitir su constancia de estudios en PDF, descargarla y verificar su código en la ruta pública `/verificar/:codigo`.

### 5.2 Padrón de participantes del piloto y capacitación (`PB-17` / `PB-30`)

| Rol representado | Nombre completo del participante (humano real) | Modalidad (`Presencial` / `En línea`) | Estado (`Convocado` / `Capacitado` / `Evaluado` / `Acreditado`) | Puntaje evaluación (`>= 80 / 100`) | Tareas críticas (`100 %`) | Fecha y firma |
| --- | --- | --- | --- | --- | --- | --- |
| `ADMINISTRADOR` | *(Pendiente de ejecución humana)* | | `PENDIENTE` | `/ 100` | `/ 4` | |
| `DOCENTE` | *(Pendiente de ejecución humana)* | | `PENDIENTE` | `/ 100` | `/ 3` | |
| `ESTUDIANTE` | *(Pendiente de ejecución humana)* | | `PENDIENTE` | `/ 100` | `/ 3` | |

### 5.3 Firmas de cierre de Puerta F y Puerta A (`PB-30`)

- **Puerta F (Verificación técnica local — 26/26 filas técnicas en `PASO` sobre el candidato `a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`):**
  - Verificación automatizada e inspección técnica: **COMPLETADA** (9 de noviembre de 2026).
  - Ratificación del Responsable Técnico (`RT`): ________________________ Fecha: ____________
- **Puerta A (Aceptación académica final — 31/31 filas totales):**
  - Estado actual: **PENDIENTE DE FIRMA HUMANA**.
  - Nombre y firma del Responsable Académico (`RA`): ________________________ Fecha: ____________

