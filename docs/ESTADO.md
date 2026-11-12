# Estado del SIGA

## Demostración local independiente (2026-11-10)

Se creó `./demo.sh` con Docker Compose y semilla exclusivamente ficticia en un proyecto y volúmenes propios. Prepara dos programas, docentes, estudiantes, grupos e historial, con contraseñas generadas en `.local/demo/config.env`; conserva datos en ejecuciones posteriores. La [guía técnica](DEMO_LOCAL.md) y la [explicación paso a paso](EXPLICACION_DEMO_LOCAL.md) describen el uso y las limitaciones. Se verificó el arranque local, los siete accesos y la disponibilidad de dos grupos sin inscribir estudiantes, además de la conservación de la semilla al repetir el script y detener/reanudar los servicios. La demostración no acredita el cierre del plan maestro ni sustituye una operación real.

> **Actualización técnica 10 de noviembre de 2026:** se corrigió el simulacro de recuperación para comprobar escrituras recuperadas/perdidas y se reconcilió la cobertura con archivos reales. El detalle y sus límites se registran en [avance de cierre](AVANCE_CIERRE_20261110.md); la [explicación sencilla](EXPLICACION_AVANCE_CIERRE_20261110.md) acompaña esta actualización. Los resultados históricos siguientes no sustituyen la evidencia vigente ni acreditan aceptación humana.

> **Estado vigente de auditoría (9 de noviembre de 2026):** la [revisión actual](AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md) identifica reservas técnicas y aceptación humana pendientes. Las declaraciones anteriores de cierre completo y los diagnósticos iniciales se conservan como históricos; no prueban por sí solos cierre F/A. Los módulos principales existen; quedan AC-01–17 y su evidencia.

## Edición conforme a estructura y presentación académicas (2026-11-09)

Se recompuso por completo el informe revisado (83 páginas PDF), con PDF y DOCX editable integral, tres índices automáticos, preliminares romanos, cuerpo arábigo, cinco capítulos, 44b tablas, tres gráficos y anexos con equipos y manuales. Se adaptó la tecnología del índice modelo al stack real y se omitió la hoja de instrucciones/ensayo de ejemplo. La edición anterior de 63 páginas se conserva como antecedente privado; su paginación ya no aplica.

El DOCX declara Arial 12, interlineado 1,5, justificado, títulos 14 centrados/negrita, subtítulos 12 a la izquierda/negrita y márgenes de sección 2,54 cm. Arial no está instalada en este entorno; el PDF emplea Liberation Sans como sustitución declarada. Ver [guía sencilla](EXPLICACION_FORMATO_ACADEMICO.md) y [archivos actuales](entrega-revisada/README.md). No se modificó la aplicación ni se cerraron reservas técnicas o aceptación humana mediante esta edición.

## Informe PDF integrado y terminado documentalmente (2026-11-09)

Se corrigió directamente `EntregablesPI-Ing-Software-revisado.pdf`: 63 páginas, capítulo V de conclusiones en 35–36, bibliografía en 37, anexos A–I desde 38, manual de usuario en 42–49 y manual técnico en 50–58. El índice de la página 3 ya contiene las ubicaciones reales, enlaces internos y marcadores; se aplicó numeración continua. La integración anterior de 65 páginas se conserva como copia privada de respaldo. El PDF original de 35 páginas no se modificó. Esta actualización documental no elimina reservas técnicas ni suplanta aceptación humana. Guía: [cómo localizar las secciones](EXPLICACION_DOCUMENTO_INTEGRADO.md).

## Auditoría y entrega documental revisada (2026-11-09)

Se completó auditoría especializada de implementación, operación y PDF. `npm run check` pasó con lint, tipos, 6 suites/38 pruebas API y 13 archivos/40 pruebas web y builds. No se reejecutaron integración/E2E/carga/restauración. Se documentaron correcciones pendientes del instrumento RPO, cobertura/CI, zoom real y fortalecimiento de evidencias; no se alteró código funcional.

Se prepararon [conclusiones, anexos y manuales revisados](entrega-revisada/COMPLEMENTO_INFORME_SIGA.md), fuentes editables, DOCX/PDF y [guía sencilla](EXPLICACION_AUDITORIA_Y_ENTREGA.md). Los manuales 2.0 se conservan; los revisados 3.0 corrigen comandos y amplían contenido. El PDF original permanece intacto y el integrado añade actualización posterior a sus 35 páginas. Puertas F/A sin ratificación de cierre integral por esta auditoría.

## Cierre técnico completo sobre el candidato final congelado (`R-01` a `R-18` — 2026-11-09)

- **Candidato final congelado (huella SHA-256 de 147 archivos de código, contratos, scripts y configuración):**
  `a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`
- **Imágenes Docker empaquetadas verificadas desde el candidato final:**
  - `siga-candidato-api:local`: `sha256:f76daa3abd3c9d46ddfb22fe5f46a268c61c4065e149179aa4eb390e997c90f2`
  - `siga-candidato-web:local`: `sha256:1833bbefadd85a35ced6d4183f7f6080ea0e89a710d444fa4c56ca5face8cc7e`
  - `siga-candidato-migrate:local`: `sha256:8e05743050a9c55d5298b5fa903f25324f872473b675957e9654518ad66987c8`
- **Estado de Puertas ([`docs/TRAZABILIDAD_ENTREGA.md`](TRAZABILIDAD_ENTREGA.md) y [`docs/evidencias/CIERRE_LOCAL.md`](evidencias/CIERRE_LOCAL.md)):**
  - **Puerta F (Funcionalidad técnica local verificada): 26/26 filas técnicas en `PASO` en la columna `V` (`100 %` de verificación técnica)** y **21/21 hallazgos (`AUD-01` a `AUD-21`) cerrados con evidencia sobre el candidato final**.
  - **Puerta A (Aceptación académica y cierre humano): 28/31 filas verificadas técnicamente (`26` técnicas + `ENT-TGS` + `ENT-DOC`); `3/31` filas transversales humanas (`ENT-SCRUM`, `ENT-XP`, `ENT-ACE`) y `0/31` firmas humanas en `A` pendientes** de ejecución del piloto con participantes reales y firma del Responsable Académico (`RA`). No se inventan participantes, ceremonias ni firmas.
- **Verificaciones ejecutadas sobre el candidato final congelado (`a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`):**
  1. `npm run format:check` y `npm run check`: **PASO** (`0` errores ESLint, `typecheck` en `@siga/contracts`, `@siga/api` y `@siga/web`, `6` suites / `37` pruebas unitarias API, `13` suites / `40` pruebas unitarias Web, compilación de producción API + Web).
  2. `npm run test:coverage` (`node scripts/test-integration.mjs --coverage`): **PASO** (**`16` suites, `131` pruebas aprobadas, `0` fallos, `0` skips**; cobertura global **`94,94 %` líneas** y **`82,49 %` ramas**; los 14 archivos con umbral individual superaron `>= 70 %` líneas y `>= 70 %` ramas). Detalle en [`docs/INVENTARIO_COBERTURA_REGLAS.md`](INVENTARIO_COBERTURA_REGLAS.md).
  3. `npm run test:e2e -- --workers=1`: **PASO** (**`34/34` pruebas aprobadas** en `desktop` `1366x900` y `mobile` `360x800`, `0` fallos, `0` skips). Se corrigieron durante la estabilización previa al congelamiento: contenedor CSS `@container (max-width: 760px)` y `flex-wrap: wrap` para eliminar desbordamiento horizontal al `200 %` de zoom (`apps/web/src/styles.css`), selectores `{ exact: true }` en `paginacion.spec.ts`, `search_path` explícito en el `Pool` de `recorrido-academico.spec.ts` para el trigger `siga_inscripcion_validar()` y colapso del menú lateral móvil en `acceso.spec.ts`.
  4. `node scripts/test-load.mjs --unicode` (60 s calentamiento + 300 s medición, 20 usuarios concurrentes): **PASO** (`780` solicitudes medidas, `0 %` errores inesperados, **`p95 = 670,84 ms`** `< 2.000 ms` `D45`, `máximo = 856,41 ms`). Evidencia en [`docs/evidencias/carga-unicode-candidato.json`](evidencias/carga-unicode-candidato.json) y [`docs/RENDIMIENTO_DEMOSTRACION.md`](RENDIMIENTO_DEMOSTRACION.md).
  5. `node scripts/test-load.mjs --smoke` (5 operaciones): **PASO** (`reporte` p95 `155,84 ms`, `oferta` p95 `302,96 ms`, `matricula` p95 `552,39 ms`, `pdf` latino p95 `687,83 ms`, `pdf_unicode` p95 `656,70 ms`; `0 %` errores en las cinco). Evidencia en [`docs/evidencias/carga-smoke-candidato.json`](evidencias/carga-smoke-candidato.json).
  6. `node scripts/test-proxy-local.mjs`: **PASO** (`health: 200`, `rutaInexistente: 404`, `login: 200`, `sesion: 200`, `logout: 204`, `sesionRevocada: 401`, `nosniff: true`, cookie `HttpOnly; SameSite=Strict; Path=/`). Evidencia en [`docs/evidencias/proxy-candidato.json`](evidencias/proxy-candidato.json).
  7. `node scripts/test-backup-restore-local.mjs --packaged`: **PASO** (`4` migraciones, `16` tablas, `2` PDFs — latino `5.105 B` SHA-256 `98fb28a9734eee77bbca63c662f13f81da8e0fde3925a2d1d2ad2800bc82d99a` y Unicode `20.267 B` SHA-256 `3009412bc7c9de7958ed588aa64c17a9e3f3ef4fd94e2b5e0f01f7e8f560e1e0` — rechazo de alteración deliberada y simulacro de pérdida total tras `docker compose down --volumes --remove-orphans` con **`RTO = 9,47 s` (`<= 4 h`)**, **`RPO = 1,18 s` (`<= 24 h`)** y respaldo retenido en `.local/backups/retenido-candidato` con permisos `0700`/`0600`). Evidencia en [`docs/evidencias/restauracion-candidato.json`](evidencias/restauracion-candidato.json) y [`docs/OPERACION_RESPALDO_RESTAURACION.md`](OPERACION_RESPALDO_RESTAURACION.md).
  8. Instalación desde copia limpia (`R-11` / `CP-15`): **PASO** (`Node v24.19.0`, `npm 12.2.0`, `.env` y archivos de credenciales con permisos `0600`, `4` migraciones, programa `ICO-F19` y `3` usuarios activos por rol). Evidencia en [`docs/evidencias/instalacion-limpia-candidato.json`](evidencias/instalacion-limpia-candidato.json).
  9. `node scripts/test-provision-local.mjs`, `node scripts/test-certificados-crash.mjs` y `npm audit --omit=dev` (`0` vulnerabilidades): **PASO**.
  10. Documentación, manuales `.docx` (`docs/manuales/*.docx`), ejemplo TGS en [`docs/arquitectura.md`](arquitectura.md) y manifiesto final [`docs/evidencias/manifiesto-candidato-final.sha256`](evidencias/manifiesto-candidato-final.sha256): **COMPLETADOS**.

## Ejecución del plan restante de cierre maestro (2026-11-09 — detalle por subagente)

- **Tanda 0 (`R-01` — Conciliación de línea base):** completada. Se sincronizaron [`docs/TRAZABILIDAD_ENTREGA.md`](TRAZABILIDAD_ENTREGA.md) y [`docs/EXPLICACION_TRAZABILIDAD_ACTUAL.md`](EXPLICACION_TRAZABILIDAD_ACTUAL.md) con el estado real previo al cierre: manifiesto base [`docs/evidencias/revision-plan-20261109-manifiesto.sha256`](evidencias/revision-plan-20261109-manifiesto.sha256), referencias actualizadas a las corridas históricas de 30/30 E2E y 16 suites / 117 pruebas de cobertura, distinción explícita entre la carga larga latina aprobada (780 solicitudes/op, 0 errores) y el fallo del escenario PDF Unicode en calentamiento (4 respuestas `503`), y registro de las exclusiones de demostración `PB-07`/`PB-10` bajo `D42`/`D43`. Se levantó el contenedor temporal aislado `siga-pg-test-15433` (`postgres:18.6-alpine` en `127.0.0.1:15433` con `tmpfs`) sin tocar contenedores ni volúmenes de otros proyectos.
- **Subagente `persistencia_unicode` (`R-02` y `R-06` — PDF Unicode, `scripts/test-load.mjs` y recuperación ante respuesta HTTP perdida):** completado en archivos disjuntos:
  - En [`apps/api/src/modules/certificados/certificado.pdf.ts`](../apps/api/src/modules/certificados/certificado.pdf.ts) se cachearon a nivel de módulo las instancias `fontkit` y los conjuntos `Set<number>` de glifos (`regular`, `bold`, `fallback` y `Helvetica`), y se implementó trazado híbrido que conserva `StandardFonts.Helvetica`/`HelveticaBold` para el texto compatible e incrusta `NotoSans` o `DroidSansFallbackFull` únicamente en los segmentos que contienen puntos de código fuera de `Helvetica`.
  - En [`apps/api/src/modules/certificados/certificados.service.ts`](../apps/api/src/modules/certificados/certificados.service.ts) se precalientan las fuentes antes de abrir la transacción interactiva y se fijó `maxWait: 20000` junto con `timeout: 20000` en `emitir`, `finalizarEmision` y `revocar`.
  - Se promovió el escenario `pdf_unicode` a [`scripts/test-load.mjs`](../scripts/test-load.mjs) y se retiró `scripts/.tmp-load-pb20-unicode-20261106.mjs`. En comprobación corta (`node scripts/test-load.mjs --smoke --only=pdf,pdf_unicode`), `pdf` obtuvo 40/40 con 0 errores y p95 `890,68 ms`, y `pdf_unicode` obtuvo 40/40 con 0 errores y p95 `828,05 ms` (la medición larga de 5 minutos se ejecutará en `R-15` con candado exclusivo).
  - En [`apps/api/test/certificados.integration.spec.ts`](../apps/api/test/certificados.integration.spec.ts) y [`apps/api/test/certificados-concurrencia.integration.spec.ts`](../apps/api/test/certificados-concurrencia.integration.spec.ts) pasaron 2 suites / 10 pruebas, incluyendo respuesta HTTP perdida tras commit (`CP-12`), ambos programas sintéticos (`D41`) y conciliación con `scripts/conciliar-certificados.mjs`. Se actualizaron [`docs/OPERACION_CONCILIACION_CONSTANCIAS.md`](OPERACION_CONCILIACION_CONSTANCIAS.md) y [`docs/EXPLICACION_CONCILIACION_CONSTANCIAS.md`](EXPLICACION_CONCILIACION_CONSTANCIAS.md).
- **Subagente `backend_academico` (`R-03`, `R-04`, `R-05` y `R-07` — Catálogos, bajas padre/hijo `AUD-19`, provisión local, fronteras `America/Mexico_City`, conflicto concurrente de notas, referencias `D42` y matriz HTTP/CSV/auditoría):** completado en 15 archivos disjuntos:
  - En [`catalogos.service.ts`](../apps/api/src/modules/catalogos/catalogos.service.ts), [`oferta.service.ts`](../apps/api/src/modules/oferta/oferta.service.ts), [`matriculas.service.ts`](../apps/api/src/modules/matriculas/matriculas.service.ts) y [`personas.service.ts`](../apps/api/src/modules/personas/personas.service.ts) se alineó la semántica de bajas padre/hijo (`AUD-19`): un `Programa` o `PlanEstudio` inactivo impide crear nuevas versiones/grupos/altas o inscribir estudiantes (`409 Conflict` y exclusión en `GET /matriculas/oferta`), conservando intacta la consulta de kárdex, calificaciones, constancias y reportes históricos.
  - En [`calificaciones.controller.ts`](../apps/api/src/modules/calificaciones/calificaciones.controller.ts) y [`calificaciones.service.ts`](../apps/api/src/modules/calificaciones/calificaciones.service.ts) se expusieron los endpoints `PATCH`/`PUT` de corrección individual y se normalizó la traducción de conflictos de serialización (`40001`/`40P01`/`P2034`) a `409 Conflict` (`CONFLICTO_VERSION_CALIFICACION`). En [`reportes.service.ts`](../apps/api/src/modules/reportes/reportes.service.ts) se amplió la sanitización CSV contra prefijos `\t` y `\r` además de `=`, `+`, `-`, `@`.
  - Verificación focalizada ejecutada: `npm run test:unit -w @siga/api` (**PASO**, 6 suites / 37 pruebas), `node scripts/test-integration.mjs --runTestsByPath ...` (**PASO**, 10 suites / 92 pruebas) y `npx eslint apps/api/src apps/api/test` (**PASO**, 0 errores).
- **Subagente `frontend_accesibilidad` (`R-08` y `R-09` — Aislamiento A->B, paginación y opciones históricas, borradores de notas y navegación por teclado `Tab` real sin `.focus()`):** completado en 21 archivos disjuntos:
  - En [`privateFetch.ts`](../apps/web/src/services/privateFetch.ts) y [`App.tsx`](../apps/web/src/app/App.tsx) se incorporaron generación de sesión, cancelación de `AbortController` en vuelo al cambiar o cerrar sesión y descarte de respuestas `200`/`401` tardías de sesiones anteriores (`CP-16` / `PB-25`).
  - En [`CatalogManagement.tsx`](../apps/web/src/app/CatalogManagement.tsx), [`PersonManagement.tsx`](../apps/web/src/app/PersonManagement.tsx), [`OfertaManagement.tsx`](../apps/web/src/app/OfertaManagement.tsx), [`StudentCalificaciones.tsx`](../apps/web/src/app/StudentCalificaciones.tsx) y [`CertificadosManagement.tsx`](../apps/web/src/app/CertificadosManagement.tsx) se completaron búsqueda/paginación por encima de límites previos, preservación de opciones históricas inactivas al editar (`CP-17` / `PB-26`) y semántica completa de pestañas (`role="tablist"`, `role="tab"`, `role="tabpanel"`, flechas/`Home`/`End` y `Escape`) (`PB-16`).
  - En [`TeacherCalificaciones.tsx`](../apps/web/src/app/TeacherCalificaciones.tsx) se completaron preservación de borradores por fila ante fallo parcial o conflicto `409`, opción de descartar o reintentar, aviso al navegar con borradores pendientes y limpieza al cerrar sesión (`CP-18` / `PB-27`).
  - En [`teclado-zoom.spec.ts`](../tests/e2e/teclado-zoom.spec.ts) y [`accesibilidad.spec.ts`](../tests/e2e/accesibilidad.spec.ts) se reemplazó `.focus()` programático por recorrido real con `Tab` (`tabUntilFocused`) y se añadieron validaciones para los 3 roles en escritorio (`1366x768`), móvil (`360x640`) y zoom `200 %`.
  - Verificación rápida ejecutada: `npm run typecheck -w @siga/web` (**PASO**), `npm run test:unit -w @siga/web` (**PASO**, 13 archivos / 40 pruebas), `npx eslint apps/web/src tests/e2e` (**PASO**, 0 errores) y `npm run build -w @siga/web` (**PASO**).

## Revisión documental del cierre (2026-11-09)

Se contrastaron plan maestro, código, pruebas y evidencias mediante tres auditorías especializadas de solo lectura. El [plan restante detallado](../PLAN_RESTANTE_CIERRE_MAESTRO.md) cubre los 30 bloques PB con 18 tareas, criterios verificables, responsables, dependencias y configuración operativa de subagentes. Incluye una [explicación paso a paso para principiantes](EXPLICACION_PLAN_RESTANTE.md).

La última carga Unicode registró cuatro respuestas 503 durante el calentamiento y se interrumpió antes de completar la medición; no acredita D45 para ese escenario. Las corridas anteriores de 30 E2E y 117 pruebas de cobertura son evidencia histórica, no ejecuciones nuevas de esta revisión. Siguen pendientes comprobaciones técnicas, recuperación operativa y actividades humanas de aceptación. Se creó un manifiesto técnico de 160 archivos; no se modificó el producto ni se abrieron las puertas F/A.

## Continuacion del plan (2026-11-06)

La imagen web empaquetada `siga-codex-candidato-web:local`, basada en Nginx 1.30.5, se ejecuto en un contenedor propio temporal. La cabecera `X-Content-Type-Options: nosniff` estuvo presente en la pagina inicial (200), un recurso inexistente (404) y una ruta de la aplicacion (200). La prueba no verifica la ruta proxy a la API. La optimizacion de texto PDF posterior al ultimo registro redujo el p95 en prueba corta a 2772,8 ms sin errores, aun por encima de D45; regresion y rendimiento siguen en curso.

PB-26: las cuentas activas de administrador y los grupos asignados al docente tienen busqueda y paginacion, con contratos anteriores preservados al omitir parametros. Pasaron 13 pruebas de integracion y 16 web focalizadas, incluidas listas mayores a los limites anteriores; falta inspeccion visual. Cobertura posterior: 15 suites y 112 pruebas pasaron, 93,46 % de lineas y 78,45 % de ramas globales, y umbral de 70 % por archivo cumplido. Los avisos de pg se rastrearon al adaptador de Prisma; MaxListeners no se reprodujo en esta corrida. Cualquier cambio posterior exige repetir las pruebas aplicables.

PB-12: `scripts/test-certificados-crash.mjs` paso con cortes reales `SIGKILL` controlados antes y despues del commit, en base y directorio aislados. El pendiente se recupero con una sola emision y se identifico el huerfano; tras el commit se comprobaron hash, descarga y rechazo de reintento duplicado. No reproduce una respuesta HTTP perdida ni un corte electrico. Detalles en [operacion de conciliacion](OPERACION_CONCILIACION_CONSTANCIAS.md) y [explicacion sencilla](EXPLICACION_CONCILIACION_CONSTANCIAS.md).

La matricula incorpora una cola local acotada por grupo para reducir contencion, sin sustituir los bloqueos ni el aislamiento de la base. Un smoke registro 40/40 operaciones y p95 de 588,32 ms; no acredita la prueba larga. Despues de ese cambio pasaron cobertura (16 suites, 115 pruebas; 93,47 % lineas y 78,45 % ramas globales, umbrales por archivo cumplidos) y E2E completo (20/20, un trabajador, escritorio y movil). Si cambia el candidato se repetiran las pruebas afectadas. PDF sigue por encima de la meta en ensayos cortos.

Se optimizo el PDF de texto compatible con fuentes estandar, conservando fuentes Unicode para los demas textos. Smoke posterior: 40/40 por operacion sin errores, p95 reporte 180,90 ms, oferta 316,92 ms, matricula 559,38 ms y PDF latino 653,74 ms; el fallback Unicode no esta acreditado en rendimiento. El E2E completo paso 24/24 en una sola corrida. Cobertura posterior paso 16 suites/116 pruebas, 93,36 % lineas y 78,33 % ramas globales, con umbrales individuales. La medicion larga PB-20 se reporta a continuacion.

La medicion larga termino para la fixture latina: 780 solicitudes por operacion, 0 errores y p95 de 204 ms reporte, 421,24 ms oferta, 581,41 ms matricula y 627,80 ms PDF. Fueron tandas de 20 usuarios cada 7,69 s, con 1000 estudiantes y 50 grupos; no representa carga continua ni acredita el rendimiento Unicode alternativo. Ver [resultados y metodo](RENDIMIENTO_DEMOSTRACION.md) y [explicacion sencilla](EXPLICACION_RENDIMIENTO.md).

La matriz HTTP de 15 familias con sesion ausente y tres roles paso en la suite auth (9/9). La bateria E2E ampliada paso 30/30 en una corrida e incluye seis casos de Enter con zoom CSS simulado al 200 %, tras enfocar el enlace mediante el test. Esto no sustituye zoom real ni una prueba completa de las tareas de cada rol solo con Tab.

Con la matriz HTTP integrada, cobertura paso 16 suites y 117 pruebas, 93,36 % lineas y 79,07 % ramas globales, con umbrales individuales cumplidos. El proxy de la imagen final paso salud, login, sesion, logout y revocacion; se corrigio la duplicacion de `nosniff`. La restauracion empaquetada se repitio despues de corregir Nginx: cuatro migraciones, 16 tablas, PDF con hash igual y rechazo de alteracion. La recuperacion completa de una instalacion perdida y los tiempos D46 siguen sin demostrarse.

## Ejecucion activa del plan maestro (2026-11-05)

Actualizacion: la prueba `node scripts/test-provision-local.mjs` paso nuevamente con PostgreSQL temporal en tmpfs y limpieza del contenedor propio. Comprueba activacion y restablecimiento de estudiante/docente, permisos de archivos, revocacion de sesiones, auditoria y conservacion del historial. El comando sigue limitado a POSIX. La bateria E2E completa y la correccion de zona horaria estan en curso; D45 fija la meta de rendimiento provisional aprobada para demostracion. La conciliacion y las pruebas de interrupcion/concurrencia de constancias siguen pendientes.

La integracion tras la migracion de hora de Ciudad de Mexico paso: 9 suites y 75 pruebas en un esquema aislado. La bateria E2E anterior obtuvo 18/20; dos pruebas moviles agotaron el limite de 30 segundos con dos trabajadores. Al repetir esos dos casos con un trabajador y el mismo limite pasaron 2/2. Esto no sustituye una corrida completa con el candidato final; las trazas del fallo se conservaron en `/tmp/siga-e2e-evidence-20261105/` mientras exista el directorio temporal.

Una prueba real de constancias simulo una reversion despues de escribir el PDF y dos recuperaciones simultaneas: una emision, un conflicto, una auditoria y descarga integra. El diagnostico de solo lectura [`OPERACION_CONCILIACION_CONSTANCIAS.md`](OPERACION_CONCILIACION_CONSTANCIAS.md) identifica posibles huerfanos; queda pendiente probar corte real y respuesta perdida tras commit. En la carga preliminar de matricula, 10 de 20 solicitudes concurrentes al mismo grupo obtuvieron 409 pese a quedar cupos: investigar antes de aceptar rendimiento. Formato general: PASO en la revision efectuada.

Cobertura aislada: 15 suites y 107 pruebas pasaron; 88,24 % lineas y 72,52 % ramas globales. El comando fallo porque el patron del umbral no encontro datos; ademas, catalogos (58,62 %) y personas (66,32 %) quedaron por debajo del 70 % de ramas por archivo. PB-18 permanece abierta hasta corregir la configuracion y cubrir las brechas sin bajar el umbral.

Repeticion posterior: PASO, 15 suites y 110 pruebas, con 70 % de lineas y ramas exigido individualmente en 10 archivos; global 93,31 % de lineas y 77,79 % de ramas. Hubo avisos de pg y MaxListeners que requieren revision. Esta medicion no incluye cobertura del frontend ni sustituye las demas puertas de PB-18.

`npm run check` posterior: PASO lint, tipos, 31 unitarias API, 28 unitarias web y compilacion. La prueba corta de carga supero reportes, oferta y matricula (40/40 en cada operacion), pero PDF devolvio 503 en 10/20 solicitudes de calentamiento; el fallo esta en investigacion y la medicion larga no se considera ejecutada.

El diagnostico identifico P2028 al iniciar transacciones bajo carga. Una correccion que prepara el PDF antes de adquirir el bloqueo y vuelve a validar bajo este logro 40/40 emisiones en una prueba corta, pero su p95 de 3544,54 ms excede D45. Se investiga optimizacion conservando integridad y recuperacion; no se declara aprobado PB-20.

PB-21: la restauracion aislada comparo 16 tablas y recupero un PDF con hash identico, inicio de sesion, consulta y descarga; tambien rechazo un PDF alterado. Procedimiento y limites en [operacion de respaldo](OPERACION_RESPALDO_RESTAURACION.md) y su [explicacion para principiantes](EXPLICACION_RESPALDO_RESTAURACION.md). D46 establece responsable y frecuencia de respaldos y objetivos provisionales; falta medir cumplimiento y acordar custodia, retencion y responsable de restauracion. La prueba focalizada de matricula paso 9/9, incluyendo 20 inscripciones simultaneas en 20 plazas y rechazo de duplicados; falta regresion completa.

Posteriormente paso el ensayo con imagenes empaquetadas de API, web y migraciones: cuatro migraciones, HTML/JS, login, consulta y descarga, 16 tablas y PDF con hash identico; tambien rechazo un PDF alterado. Identificadores de imagen API `sha256:10aba99cf165cc7316d4722ecfd4cb6d0aa23bbb61c9ff722c7581a88954f22a`, web `sha256:10907c5cacb813f3cc23145e225377b877dab36ab4f90e096c91c0eb2708fd7a` y migracion `sha256:e857167d7d1ffba3916f50edc5aadee1a31772a3097fbc8dad99c29766a3cf8d`. Un cambio posterior del candidato exigira repetir la comprobacion aplicable. Los tiempos reales de recuperacion y la aceptacion humana siguen pendientes.

El usuario solicito continuar y reiniciar los subagentes tras una interrupcion. Hay cambios de codigo en curso y el objetivo de entrega sigue abierto. Se reiniciaron `backend_recovery` (PB-11/PB-12), `e2e_qa` (PB-18/PB-19) y `frontend_ux` (PB-16/PB-26); el coordinador integra y verifica. D41–D44 registran las decisiones aceptadas por el usuario para la demo, sin atribuirles validez institucional.

- `npm run check`, Node 24.19.0/npm 12.2.0: PASO, lint, tipos, build, 29 unitarias API y 17 web. Este resultado es anterior a los ultimos cambios de la pantalla de constancias; repetir tras integrarlos.
- `npm run test:integration` en PostgreSQL 18.6 temporal aislado: PASO, 9 suites y 71 pruebas. Se corrigieron fixtures con ventanas vencidas, una asercion que dependia de cuentas de otros casos y el registro de la revision efectiva del plan; las pruebas de reemision pendiente/fallida pasaron despues de corregir la fecha del fixture. Los avisos de consultas concurrentes de `pg` se deben investigar. La suite es anterior a cualquier cambio posterior de backend.
- PB-25/PB-27: se implementaron limpieza de datos entre sesiones y conservacion de borradores; falta verificar E2E y navegacion real. PB-26 incluye paginacion de reportes en proceso de pruebas, pero otras listas siguen pendientes.
- PB-04: comando local de provision implementado y probado con base aislada; falta resolver/documentar compatibilidad Windows. PB-11/PB-12: cambios de PDF y recuperacion en revision; faltan concurrencia/interrupcion, conciliacion y respaldo/restauracion completos.
- PB-28: catalogos registran valores anteriores y posteriores transaccionales; el test de integracion paso. Falta completar y verificar el resto del criterio de reportes.
- Las puertas F y A siguen cerradas; E2E, cobertura aplicable, carga, restauracion, piloto y aceptacion estan pendientes. El catalogo sintetico y reglas D41–D44 estan autorizados para demo; el catalogo oficial E12 sigue pendiente para uso institucional.

El entorno incluye un PostgreSQL temporal propio, no bases de otros proyectos. Si se interrumpe otra vez, revisar procesos antes de iniciar pruebas y conservar los cambios no integrados; no borrar volumenes ajenos.

## Avances integrados de acceso, pruebas y dependencias (2026-11-05)

- PB-04: `scripts/test-provision-local.mjs` ejercito el CLI real con PostgreSQL y directorio propios; paso despues del ajuste para usar tmpfs y retirar volumenes propios. Comprueba activacion de estudiante/docente, restablecimiento, sesiones, auditoria, preservacion del historial, permisos y rechazos. El codigo de produccion permanece restringido a sistemas POSIX; compatibilidad Windows sigue pendiente.
- PB-19: el subagente `e2e_qa` reporto PASO 2/2 para recorrido real de matricula, captura de nota y consulta en escritorio y movil, con PostgreSQL y datos separados por proyecto. La bateria completa previa logro 15/16; una correccion posterior al fallo movil no se ha vuelto a verificar. Faltan constancias/reportes y reejecutar con el frontend final.
- PB-26: el subagente `frontend_ux` implemento busqueda/paginacion en selectores de programas, asignaturas, planes, docentes y periodos, conservando seleccion historica; reporto 23/23 pruebas web, typecheck y ESLint. Continuan paginacion de oferta/historial y verificaciones E2E.
- Dependencias: se actualizaron `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` a 12.3.3 y `zod` a 4.6.7; se actualizo `fast-uri` en el lockfile. `npm audit --omit=dev --json`: cero vulnerabilidades de produccion en la consulta realizada; la auditoria completa reporto 30, una alta de desarrollo. Deben repetirse checks y auditoria tras integrar la fuente Unicode/PDF y demas cambios; no se uso `audit fix` automatico.
- PB-18: el comando de cobertura se amplio para reunir unitarias e integracion e incluir `*.calculo.ts` junto a servicios, con umbral de 70 % de lineas y ramas por archivo. Se verifico que Jest interpreta los proyectos y umbral; falta ejecutar la cobertura y resolver brechas, no se declara aprobada.

## Avances frontend PB-16/PB-26 (2026-11-05)

- El mapa curricular implementa foco, flechas izquierda/derecha, Inicio/Fin y asociacion de pestanas con su panel. `npm run test:unit -w @siga/web -- src/app/CurriculumOverview.spec.tsx`: PASO 1/1; ESLint focalizado: PASO. Falta inspeccion visual y comprobar los demas controles de pestanas, por lo que PB-16 sigue abierta.
- El subagente `frontend_ux` probo recuperacion de constancia y paginacion independiente de reportes, incluido reinicio al buscar: Vitest 3/3, typecheck web y ESLint focalizado reportados como PASO. Otras listas/selectores de PB-26 siguen pendientes; falta E2E y revision visual.

## Auditoria previa y plan de cierre local (2026-11-05)

Solicitud vigente: conservar el alcance academico local, auditar backend/frontend antes de reformular el plan y definir condiciones para declarar 100 % funcional dentro de ese alcance. No incluye implementar todas las correcciones en esta subetapa ni publicar el sistema.

**Resultado actual:** auditoria estatica completada y documentacion reformulada; funcionalidad local (Puerta F) y entrega academica aceptada (Puerta A) siguen PENDIENTES. No se convierten resultados historicos E00-E10 en aprobacion del candidato actual.

Documentos de continuidad:

- [Plan maestro reformulado](../PLAN_MAESTRO_ENTREGA.md): PB-01 a PB-30, responsables por rol, dependencias, criterios de cierre y secuencia.
- [Auditoria tecnica](AUDITORIA_CIERRE_LOCAL.md): AUD-01 a AUD-21, evidencia de codigo y limites. Prioridades P1/P2 a resolver o hipotesis a descartar con pruebas; P3 solo si hay beneficio medido.
- [Trazabilidad de entrega](TRAZABILIDAD_ENTREGA.md): 26 filas tecnicas para F y 31 filas totales para A, todas sin evidencia vigente de cierre; responsables nominales y aprobaciones pendientes.
- [Explicacion paso a paso para principiantes](EXPLICACION_CIERRE_PASO_A_PASO.md): sistema, hallazgos, ejecucion del plan y pruebas en lenguaje sencillo.

Verificaciones efectivas de esta revision:

- Node v24.21.0 / npm 11.19.0 frente a engines 24.19.x / 12.2.x; sin `node_modules` ni `.git`.
- Docker cliente/motor 29.8.2 disponible; no se identificaron contenedores SIGA activos. No se levantaron servicios ni se tocaron contenedores ajenos.
- `npm run check`: FALLO, codigo 127 al invocar ESLint ausente. Tipos/unitarias/build no llegaron a ejecutarse.
- Lectura JSON de cuatro manifiestos y `node --check` de los 11 scripts MJS: PASO (solo sintaxis).
- Integracion, cobertura, E2E, render visual, carga, migracion y restauracion: NO EJECUTADAS; requieren dependencias y entorno aislado SIGA preparado.
- Huella tecnica previa: `feea1bdc42012943ba2c00bde4ac81488e7b8267875c0ec6458b4328519c11e9` (119 archivos; algoritmo en auditoria).
- Validacion documental mediante Python: PASO en 7 documentos, 54 enlaces locales existentes, estructura de tablas, IDs PB-01 a PB-30/AUD-01 a AUD-21 y 31 filas incluidas sin duplicados. Huella de los 119 archivos tecnicos identica despues de editar documentos. No equivale a lint/formato del proyecto ni a pruebas funcionales.

Hallazgos principales: acceso de personas nuevas no completado por un procedimiento general; cache privada sin limpiar al cambiar/cerrar sesion; reemision fallida y pendientes sin recuperacion; listados/selectores truncados; perdida de drafts de notas; pruebas E2E omitidas/desactualizadas; cobertura sin enforcement ni todas las reglas; carga limitada a un reporte; PDF con identidad fija; valores pertinentes ausentes en auditoria de catalogos. Detalles y riesgos por verificar en el informe tecnico.

Cambios realizados: documentos exclusivamente. Sin modificaciones a codigo, contratos, configuracion runtime, esquema/migraciones, secretos o datos; sin instalaciones, commits ni despliegues.

Proximo paso: PB-01 responsables/decisiones y candidato; PB-02 entorno reproducible; preparar fixtures PB-19 y completar acceso/cache PB-04/25 antes de confiar en la aceptacion E2E. Mantener fuente E12 y aprobaciones de politica pendientes hasta resolucion real.

## Inicio de ejecucion del plan (2026-11-05)

El usuario ordeno proceder y acepto expresamente para la demo dos programas sinteticos rotulados (D41), y provisionalmente escala 0–10, minima 6, dos decimales y promedio ponderado con todos los intentos calificados (D42). Se registraron en `DECISIONES.md`; no implican aprobacion institucional ni deciden politicas adicionales.

Se asignaron tareas a los subagentes `frontend` (PB-25/PB-27), `certificados` (PB-11 y revision PB-12; despues PB-04) y `entorno` (PB-02/PB-19). El coordinador trabaja en PB-28/PB-13. Cambios y resultados se detallaran tras la revision integrada; ninguna puerta se considera abierta por esta asignacion.

## Avance PB-02: entorno de pruebas aislado (2026-11-05)

El subagente `entorno` instalo Node 24.19.0 y npm 12.2.0 en nvm, ejecuto `npm ci` y genero Prisma 7.10.0. Hay PostgreSQL 18.6 temporal en puerto 15433 con base `siga_test` y almacenamiento temporal; los puertos 5432/5433 estaban ocupados por otros proyectos y no se tocaron. La instalacion reporto 36 avisos de dependencias; `npm audit --omit=dev --json` reporto 6 afectaciones de produccion (4 altas y 2 moderadas). No se aplico `audit fix` automaticamente; revisar actualizaciones y repetir pruebas sin degradar el lockfile. Los datos previos de entorno de esta pagina son historicos.

La primera comprobacion de tipos de API se lanzo mientras el subagente `certificados` modificaba ese servicio y fallo por un metodo aun incompleto. No cuenta como verificacion del candidato integrado; repetir al concluir la integracion. El entorno aislado no equivale aun a una instalacion y demostracion completas desde copia limpia, por lo que PB-02 permanece en curso.

## Avance PB-13: cabecera web (2026-11-05)

Se explicito `X-Content-Type-Options: nosniff` en las ubicaciones de archivos y de rutas web de `apps/web/nginx.conf`, donde las cabeceras de cache impedían heredar la definida a nivel de servidor. Una comprobacion HTTP en contenedor temporal propio con `nginx:1.27-alpine` obtuvo la cabecera en pagina inicial (200), recurso (200) y recurso inexistente (404). El contenedor temporal se detuvo sin afectar servicios ajenos. La descarga de la imagen objetivo `nginx:1.30.5-alpine` fallo por EOF; repetir la verificacion con esa version al disponer de ella. PB-13 continua abierta por proxy y tiempos pendientes.

## Directriz de ejecucion con subagentes (2026-11-05)

Por solicitud del usuario, el plan incorpora la seccion 7.1: delegar a subagentes especializados todo trabajo del alcance que permita division util y verificable, con un coordinador responsable de contratos, archivos, dependencias, revision, integracion y regresion conjunta. Se documentan perfiles de backend, frontend/accesibilidad, persistencia/constancias, QA/seguridad, entorno/rendimiento y documentacion, reutilizables segun el limite simultaneo disponible. Los motivos para mantener tareas secuenciales se registran.

Se actualizo tambien la explicacion para principiantes. Esta subetapa solo modifica tres documentos: no inicia la implementacion del backlog ni afirma que ya se ejecutaron tareas con subagentes. Las puertas F/A y las decisiones humanas pendientes se conservan.

## Registro historico anterior a esta revision

Lo que sigue se conserva como antecedente de versiones/entornos previos. Sus afirmaciones de servicios levantados, pruebas aprobadas y etapas completas no describen una nueva ejecucion el 2026-11-05. El estado actual y el trabajo restante estan arriba y en el plan reformulado.

Fecha y hora: 2026-10-19, preparación de publicación, perfiles locales solicitados y limpieza visual de registros archivados.
Etapa/subetapa actual: cierre local y preparación de despliegue; E12 y publicación remota siguen pendientes.
Estado: E00–E10 verificadas localmente; E11 tiene materiales preparados y piloto/sesiones pendientes. Docker sirve la web en `http://localhost:8080`; no hay servidor ni dominio remoto configurados.
Objetivo actual: preparar los tres perfiles locales pedidos, ocultar los registros archivados por defecto y dejar explícitos los bloqueos externos de publicación. El catálogo oficial requiere completar E12 con fuente institucional.
Último commit: no se creó uno en esta sesión.
Cambios locales sin commit: se conservaron los cambios previos; se generalizó la portada, se quitaron cuatro tarjetas repetidas, el menú quedó a la izquierda, se agregaron herramientas locales para sesiones simultáneas y una guía de publicación. No hubo reset ni eliminación de volúmenes.

## Mejora posterior a E11: ICO-F19 y datos demo archivados

- El usuario confirmó el plan **ICO-F19**, Licenciatura en Ingeniería en Computación, generación 2022B. La vista presenta 10 periodos, 55 unidades de aprendizaje obligatorias, 2 actividades académicas, 3 optativas por acreditar, 24 opciones optativas y 410 créditos del plan. Incluye los núcleos básico, sustantivo e integral, y enlaza el mapa curricular de UAEMex.
- La clasificación visible se cotejó con la captura: Tecnologías Computacionales I y II son obligatorias; Reconocimiento de Patrones es optativa. La captura también contiene avance y calificaciones personales; esos valores no se copiaron al portal público ni a todas las cuentas.
- El inicio de la aplicación ya no carga el dataset `siga-demo-v1`. La semilla normal solo registra el programa y el plan ICO-F19. En ambas bases locales se desactivaron las 7 cuentas, perfiles y catálogos demo; se revocaron 6 sesiones nativas y 10 de Docker. Se retiraron los archivos locales de acceso de demostración. En Docker se revocó 1 constancia emitida; en nativo no había constancias emitidas vigentes.
- La eliminación física de inscripciones, constancias y auditoría está impedida por las restricciones de historial inmutable de la base (`inscripcion_no_borrar`, `certificado_no_borrar`, `auditoria_inmutable` y referencias restrictivas). Se conservaron 183 eventos previos de auditoría nativa y 166 de Docker; se agregaron un evento de archivado en cada base y otro de revocación en Docker. Totales actuales: 184 y 168, respectivamente. No se borró ni reinició ningún volumen.
- Se creó el administrador local `abezav12@gmail.com` en ambas bases independientes. El acceso nativo está en `.local/admin-acceso.txt` y el de Docker en `.local/admin-acceso-5432.txt`; ambos archivos están ignorados por Git y no se copió la contraseña a la documentación. El inicio de sesión, lectura del perfil ADMINISTRADOR y cierre de sesión respondieron correctamente en ambos servicios.
- Los comandos reproducibles del archivado son `npm run db:archive:demo:check` / `npm run db:archive:demo` y sus variantes `:docker`.
- La semilla agregó en ambas bases `Licenciatura en Ingeniería en Computación`, versión 2019, plan F19, generación 2022B. Aún no carga unidades, claves institucionales, créditos por materia ni seriación al catálogo transaccional: esos datos deben venir de una fuente curricular completa. La vista pública sí muestra los nombres del mapa confirmado.
- Límite de privacidad: no se cargaron las calificaciones/avance de la captura porque son datos personales y el repositorio no identifica la cuenta estudiantil a la que pertenecen. Deben incorporarse solo al perfil correcto y con autorización del titular.

## Preparación local y publicación

- Docker sigue activo y saludable en `http://localhost:8080`. Se crearon tres cuentas activas para la base local de Docker: el administrador existente `abezav12@gmail.com`, el docente `jon@gmail.com` y el alumno `prueba123@gmail.com`. Sus contraseñas se generan aleatoriamente y están reunidas en `.local/credenciales-siga.txt`; ese archivo está ignorado por Git.
- Los perfiles genéricos de prueba de Docker se desactivaron y se revocaron sus sesiones. Los listados de personas y catálogos ahora excluyen registros inactivos de forma predeterminada; Administración puede mostrarlos con **Mostrar archivados**. Los registros con inscripciones, constancias, grupos o auditoría se conservan por las restricciones de historial; no se reinició ni vació el volumen.
- El único programa y plan curricular activos en la base Docker son ICO-F19 y su plan F19 2022B. Las filas de demostración previamente archivadas siguen inactivas por el historial y no se muestran en los listados iniciales.
- Se agregó un bootstrap exclusivo para el primer administrador de una base de producción. Requiere confirmación explícita del nombre de base, `NODE_ENV=production`, origen HTTPS y cookie segura; guarda una contraseña nueva en `.local/admin-produccion-acceso.txt` en el servidor. No se ejecutó porque no hay dominio ni alojamiento configurados.
- `docs/publicacion-web.md` ahora documenta el bootstrap de producción y las condiciones pendientes: servidor/dominio, provisión segura de usuarios finales, privacidad/retención institucional y catálogo E12 oficial. No se publicó información en Internet.
- Verificación: `npm run check` aprobó lint, tipos, 18 pruebas unitarias API, 12 web y builds; `npm run test:integration` aprobó 69/69 en nueve suites; `npm run test:e2e` contra Docker aprobó 12 pruebas escritorio/móvil y dejó 6 escenarios de la antigua fixture demo en skip. El E2E de perfiles confirmó los tres accesos simultáneos y que los registros demo quedan ocultos hasta activar **Mostrar archivados**.
- `npm run format:check` y `git diff --check` pasaron. `docker compose up -d --build --no-deps --wait api web` actualizó solo API/web; `http://localhost:8080` respondió 200 y `/api/health` confirmó la base disponible. La configuración de Compose público validó con un dominio de ejemplo y el bootstrap de producción rechazó correctamente la ejecución en el entorno local.
- El manifiesto local `.local/credenciales-siga.txt` se confirmó ignorado por Git y con ACL privada para la cuenta Windows actual. No se comprobó ninguna publicación externa.

## Portada general y estado de documentación web

- La portada se generalizó para SIGA como sistema multi-programa y ya no presenta el carrusel de perfiles ni un mapa curricular específico. El mapa ICO-F19 permanece en la trayectoria estudiantil.
- La documentación E11 todavía no está integrada dentro de la web. Los manuales y el plan continúan como DOCX en `docs/manuales/`; la aplicación no tiene una sección ni una ruta para leerlos o descargarlos. La capacitación con participantes sigue pendiente.

## Menú lateral de perfiles y trayectoria del estudiante

- Cada ruta protegida de estudiante, docente o administración muestra un menú vertical propio. La barra se expande/contrae, sus secciones se abren/cierran y su lista tiene desplazamiento vertical cuando rebasa el alto disponible. En pantallas angostas el menú pasa encima del contenido y evita desbordamiento horizontal.
- El menú usa tonos verdes claros y queda fijo a la izquierda, a altura completa de la ventana, sin margen contra ese borde. En móvil comienza plegado como una franja compacta y se expande sobre el contenido.
- Estudiante puede abrir su mapa curricular ICO-F19, calificaciones y avance, matrícula e historial, constancias y datos de cuenta. Se añadió la ruta protegida `/estudiante/trayectoria`; el mapa describe el plan y sus materias, mientras que calificaciones/avance siguen consultándose desde los servicios asociados al estudiante de la sesión. No se copiaron al mapa público las notas de la captura.
- La ruta consulta el programa/plan real del estudiante antes de dibujar el mapa estático: solo lo muestra cuando el programa asignado es ICO-F19. Para otros programas informa que no hay mapa digital cargado y deja disponible el avance real de esa cuenta.
- Docente accede a grupos, calificaciones y exportación CSV. Administración tiene accesos a catálogos/planes, personas, periodos/grupos y reportes/auditoría. Las etiquetas apuntan a pantallas existentes; el menú no autoriza operaciones, porque las rutas y la API continúan verificando sesión, rol y propietario.
- Administración ya no repite tarjetas de Catálogos académicos, Personas, Periodos y grupos ni Reportes e historial en el inicio; conserva enlaces equivalentes dentro del menú.
- `npm run profiles:open` abre Edge con cookies separadas en tres perfiles locales persistentes; en los contextos E2E las tres sesiones se mantuvieron activas en el mismo host y un rol no accedió al espacio de otro.
- El localhost Docker se levantó y reconstruyó con `docker compose up -d --build --wait`; base y certificado continúan en sus volúmenes existentes. `/api/health` queda disponible por `http://localhost:8080/api/health`.
- `docs/publicacion-web.md` y `docker-compose.public.yml` documentan servidor, dominio, Caddy/HTTPS, origen exacto y cookies seguras. No hay hosting remoto. La preparación local no equivale a publicación: siguen pendientes alojamiento, dominio, provisión de usuarios finales y catálogo E12.
- La documentación E11 continúa sin integración dentro del sitio: los manuales DOCX siguen en `docs/manuales/`; no hay página ni descarga web para ellos. Esta subetapa integra navegación de funciones, no documentación.
- Verificación: `npm run check` pasó con 18 pruebas unitarias API, 11 pruebas web y compilaciones; `npm run format:check` y `git diff --check` pasaron. Playwright validó la sesión estudiantil ficticia en escritorio y móvil (2/2) contra la web Docker. `docker compose up -d --build --no-deps web` reconstruyó únicamente la web; la base y la API se conservaron.

- Verificación de esta subetapa: `npm run check` aprobó lint, tipos, 18 pruebas de API, 12 de web y builds. Playwright comprobó el inicio simultáneo de los tres roles en escritorio/móvil (2/2), el menú izquierdo en ambos tamaños (2/2) y portada/escritorio móvil (2/2). El mapa ICO-F19 solo aparece cuando el endpoint del estudiante reporta ese programa. El generador de perfiles probó su alcance local y guardó credenciales bajo `.local`. El servicio Docker contestó; no se publicó una página remota.

## Funciones comprobadas

- WSL 3.0.1 y Docker Engine 29.8.2 operativos después del reinicio. `docker compose up --build -d --wait` inició PostgreSQL, migración, API y web; `/api/health` respondió con base disponible.
- E00 y E02 permanecen verificadas. E01 funciona tanto con PostgreSQL nativo como con Docker; la ejecución remota del workflow CI sigue pendiente.
- E03: login/logout, contraseña bcrypt, JWT de 30 minutos en cookie HttpOnly/SameSite Strict, sesión persistida y revocable, consulta de usuario activo/rol actual en cada petición, CSRF en operaciones de cambio, control de origen y límite de intentos. Las rutas no públicas se protegen por defecto; `@Roles` y `@SelfOrAdmin` verifican rol y propietario en servidor.
- Portal con acceso y áreas protegidas para estudiante, docente y administrador; el administrador lista cuentas sin hashes. La interfaz conserva sesión al recargar y permite cerrarla.
- Histórico E03–E10: se activaron cuentas ficticias separadas en ambas bases para las verificaciones de esas etapas. El 2026-10-18 se archivaron y deshabilitaron; los archivos de acceso de demostración se retiraron.
- E04-A: administración API/UI de programas, asignaturas y planes limitada a ADMINISTRADOR; búsqueda/paginación, validaciones, claves normalizadas, bajas lógicas, auditoría, composición curricular y grafo de prerrequisitos sin ciclos.
- El contenido de los planes usa revisión optimista y transacción serializable. Si el plan tiene estudiantes, grupos o inscripciones se conserva el historial y el cambio se hace en una nueva versión que copia asignaturas y prerrequisitos. Se aprovechan las tablas y restricciones existentes; no hubo migración nueva.
- E04-B: altas, consultas paginadas/búsqueda, edición y bajas lógicas de estudiantes/docentes. Correo, matrícula y número de empleado se normalizan y los duplicados se rechazan. La API solo permite estas operaciones a ADMINISTRADOR y registra auditoría.
- La baja desactiva la cuenta vinculada y revoca sus sesiones sin borrar inscripciones, certificados ni grupos. No se puede cambiar el plan de un estudiante con inscripciones/certificados. Las altas crean cuentas inactivas con hashes de valores aleatorios descartados; no se muestran contraseñas ni se habilita acceso implícitamente. Reactivar a la persona no activa su cuenta.
- E05: API/pantalla ADMINISTRADOR para periodos, estados explícitos, políticas y ventanas; el estado no se deduce de fechas. La política muestra `esPropuesta`; E05 no aprueba D09–D13.
- E05: administración de grupos vinculados a plan, asignatura del plan, periodo y docente activo. Valida fechas, clave única por periodo y cupo entero positivo; rechaza cupo menor a inscripciones no canceladas. Con historial conserva la identidad del grupo; bajas lógicas y cambios auditados.
- E05: actualización de cupo serializable con bloqueo de fila. E06 debe tomar el mismo bloqueo al matricular para evitar sobrecupo concurrente.
- E05: el docente consulta `/docentes/me/grupos`; el propietario se deriva de la sesión. Instantes con offset explícito se guardan en UTC; la zona institucional sigue pendiente.
- E05 no requirió migración; reutiliza el modelo E02.
- E06: `GET /matriculas/oferta` y `GET /matriculas/me` muestran solo la oferta del plan e historial del estudiante autenticado; `POST /matriculas` acepta únicamente `grupoId`, deriva al estudiante de la sesión y verifica el rol/CSRF en API.
- E06: la transacción serializable bloquea primero estudiante/cuenta y después grupo (mismo `FOR UPDATE` que E05), vuelve a verificar reglas/ocupación, crea estado PENDIENTE con créditos de plan y auditoría en una sola confirmación. Los conflictos transitorios se reintentan hasta 3 veces; la unicidad PostgreSQL detiene intentos concurrentes entre grupos.
- E06: prerrequisitos son exigidos por defecto y se configuran con `EXIGIR_PRERREQUISITOS`; una acreditación se evalúa con la política ligada al intento. La reinscripción aprobada usa la política del periodo. D09–D13 siguen como propuestas, no aprobadas.
- E06: la pantalla «Mi matrícula» permite consultar grupos/lugares/motivos, inscribirse y consultar historial propio. No ofrece cancelación de autoservicio.
- La integración ahora ejecuta todas las pruebas en un esquema aleatorio creado dentro de `siga_test`, migra allí y elimina solo ese esquema al cerrar. Las carreras E06 usan solicitudes/tx PostgreSQL independientes, sin conservar sus inscripciones ni auditorías en la base compartida.
- E07-A: el docente autenticado consulta únicamente las inscripciones de sus grupos y captura la nota final directa dentro de la escala y precisión versionadas del periodo. La API exige la versión actual de la inscripción; al corregir una nota existente requiere motivo. La inscripción, incremento de versión y auditoría antes/después se confirman juntos. Solo se acepta rol DOCENTE y se comprueba la asignación en servidor.
- E07-A: `GET /docentes/me/grupos/:grupoId/calificaciones` devuelve lista paginada, escala, mínima y marca de propuesta; `PUT /calificaciones/:inscripcionId` no admite nota parcial ni permite cambios sobre inscripciones canceladas. No se añadió migración; `Inscripcion.notaFinal`, `version`, el trigger de rango/precisión y `Auditoria` de E02 sostienen la operación.
- E07-A verificada: tres pruebas nuevas de integración cubren propiedad del grupo, rechazo de administrador/estudiante/docente ajeno, límites y decimales, cero válido, 5.99 frente a mínima 6, corrección con motivo, conflicto de versión y persistencia de auditoría. El total del conjunto pasó de 63 a 66 pruebas; las cuatro pruebas unitarias nuevas de cálculos también pasan (18 unitarias API en total).
- E07-B: `GET /estudiantes/me/calificaciones` y `GET /estudiantes/me/progreso` derivan siempre al titular de la sesión. El historial devuelve cada intento, incluida la reprobación, y no expone ID de estudiante aceptado desde el cliente. La pantalla «Calificaciones y avance» muestra promedio general, promedios por periodo, notas y créditos aprobados del plan.
- E07-B: promedios usan `Prisma.Decimal`, excluyen pendientes/canceladas, incluyen el cero y ponderan por snapshot de créditos. El promedio general interpreta los recursamientos con TODOS/ULTIMO/MEJOR según la política del intento calificado más reciente de la asignatura (D35, criterio técnico aún sujeto a aprobación académica). El avance cuenta créditos una sola vez por asignatura aprobada y evita división por cero.
- E07: `npm run check` pasó lint, tipos, 18 pruebas API unitarias, 7 de web y builds. `npm run test:integration` pasó 66 pruebas en ocho suites PostgreSQL (incluye CP-06/07/09/10/11). `npm run test:e2e` pasó 10/10 nativas y 10/10 contra Docker, escritorio/móvil; no modificó datos demo.
- E07: Docker reconstruido; `docker compose up --build -d --wait` completó sin migraciones pendientes y la API/base/web quedaron sanas. `/api/health` respondió `status: ok`, base `up`. `npm run format:check` y `git diff --check` también pasaron. No se cambió ni se borró el volumen existente. Evidencia: `docs/evidencias/e07-verificacion.md`.

## E08-A - Certificados (completada)

- El estudiante puede emitir constancia propia; el administrador puede emitir para un perfil existente. Se exige al menos una nota final y el documento incluye todos los intentos calificados, incluidas reprobaciones. No representa conclusión del programa ni cambia D09–D13, aún propuestas.
- La emisión registra una instantánea JSON, código aleatorio único, PDF con QR dirigido a `/verificar/:codigo`, archivo en `CERTIFICATES_DIR`, SHA-256 y auditoría. Reemisiones exigen constancia previa revocada del mismo estudiante y conservan `reemplazaId`; revocar exige motivo de administrador. No se modificó esquema ni migraciones.
- La descarga acepta estudiante titular o administrador; compara el hash con comparación segura y audita el archivo ausente o alterado. Verificación pública responde solo código, tipo, fecha, programa, estado y nombre abreviado; oculta matrícula, correo y calificaciones.
- Persistencia: el entorno nativo usa `.local/certificados`; Docker monta el nuevo volumen nombrado `siga_certificados` en `/data/certificados`. El volumen DB existente no se modificó.
- Integración verificada: `npm run test:integration` pasó 69 pruebas en nueve suites PostgreSQL con esquema temporal; cubre PDF/imagen QR embebida, instantánea ante corrección posterior, no acceso ajeno, integridad, revocación/reemisión, código inexistente, notas finales ausentes, CSV y auditoría.
- Control visual: muestra de prueba ficticia de dos páginas renderizada con PyMuPDF; corregido el encabezado de continuación para que no se encime con la tabla. Los archivos de muestra se mantienen temporales y se eliminan tras la revisión.

## E08-B - Reportes y auditoría (completada localmente)

- API: administrador consulta grupos, certificados y bitácora filtrable; administrador o docente asignado exporta el historial completo del grupo a CSV. CSV incluye encabezado UTF-8 BOM, celdas escapadas y protección contra fórmulas.
- UI: estudiante consulta/descarga/reemite sus constancias; verificación pública presenta datos mínimos; administrador consulta reportes y revoca con motivo; docente dispone del enlace CSV de sus propios grupos. La vista administrativa se puede imprimir.
- Verificación local al cierre: `npm run check` pasó (18 API unitarias, 7 web y builds); `npm run test:integration` pasó 69/69 en nueve suites; `npm run test:e2e` pasó 10/10 en escritorio/móvil; `npm run format:check`, `git diff --check` y `npm audit --omit=dev` pasaron. `docker compose config --quiet` pasó.
- E09 verificó Docker: `docker compose up --build -d --wait` quedó saludable sin migraciones nuevas. Se detectó que el volumen PDF se creaba `root:root` y la API no podía escribir. Se agregó inicialización de propietario/permisos sin tocar bytes; la emisión y verificación pública funcionaron.
- En E09 se emitió un PDF ficticio de 5,209 bytes con QR. Se recreó `siga-api-1` con `docker compose up -d --force-recreate --wait api`, se descargó el mismo documento y se comparó SHA-256 idéntico (`1f0fed…5b8e8d`). `siga_certificados` conserva el archivo como `node:node`, modo `600`; la carpeta usa `700`. No se eliminó ni reinició el volumen de base.
- El primer intento fallido quedó registrado como FALLIDO en la cuenta ficticia por los permisos originales; se conservó ese rastro de auditoría. Una emisión posterior terminó correctamente. En el archivado del 2026-10-18 la constancia emitida se revocó; el estado público ahora es `REVOCADO` y su evidencia inmutable permanece.
- Para ejecutar E08 quedaron activas las dos instancias PostgreSQL privadas del proyecto: desarrollo en 55432 y pruebas en 55433. `siga_dev` está al corriente de sus tres migraciones; las integraciones eliminaron solo sus esquemas temporales.
- Evidencia y escenarios: `docs/evidencias/e08-verificacion.md`. RF-13 correo no se implementó; continúa pospuesto. No se creó migración: se reutilizan `Certificado` y `Auditoria`.

## E09-A - Regresión y seguridad (completada)

- Cobertura PostgreSQL aislada: `npm run test:coverage` pasó 69/69 en nueve suites. Reporte Jest de servicios API: 85.9 % líneas y 71.06 % ramas; supera el 70 % agregado propuesto. `reportes.service.ts` quedó en 97.14 % líneas/82.97 % ramas. Las suites ejercitan autorización por recurso, CSV, manejo de archivos PDF ausentes/alterados, revocación y reemisión.
- La cobertura agregada no implica que cada módulo alcance 70 % de ramas: `catalogos.service.ts` 60.49 %, `certificados.service.ts` 66.34 % y `personas.service.ts` 67.02 %. Las ramas pendientes aparecen en `.local/e09-coverage` para una revisión posterior.

## E09-B - Carga, accesibilidad y aceptación (completada)

- `npm run test:load` midió 46,425 solicitudes durante 300 segundos con 20 solicitudes concurrentes y un conjunto ficticio de 1,000 estudiantes y 50 grupos. Resultado: 0 errores, 154.71 solicitudes/segundo, promedio 129.26 ms, p95 201.74 ms y máximo 624.47 ms; cumple los umbrales propuestos D15 (p95 <2 s y error <1 %). La API de carga corrió como proceso Node local conectado al PostgreSQL de Docker; no representa una prueba de producción ni de API dentro de contenedor.
- E2E final: `npm run test:e2e` pasó 12/12 contra PostgreSQL nativo y 12/12 contra Docker. Incluye acceso de los tres roles, sesión, autorización para reportes, portal y comprobaciones de etiquetas, orden/foco de teclado, foco visible y desbordamiento móvil/escritorio.
- Verificación final E10: `npm run check` (lint, tipos, 18 pruebas API unitarias, 7 web y builds) pasó; `npm run test:integration` pasó 69/69 en nueve suites y esquema temporal; `npm run format:check`, `git diff --check`, `npm audit --omit=dev` (0 vulnerabilidades productivas) y `docker compose config --quiet` pasaron. Una corrida de integración ejecutada en paralelo con la verificación completa tuvo un fallo de conteo en un fixture; la repetición aislada terminó 69/69. En ese cierre E10 no se retiraron cuentas ni datos de demostración; el archivado posterior quedó registrado arriba.
- Docker quedó con `db` y `api` saludables y `web` activo. La corrección E08 del propietario/modo del volumen PDF se verificó tras recrear la API: el certificado ficticio conservó su SHA-256 y siguió validando como VIGENTE. No se reinició ni eliminó el volumen de base de datos.
- CP-14 queda verificado para la demo local. CP-15 (instalación aislada, restauración, conteos y archivos iguales) quedó verificado en E10. D15 sigue siendo una propuesta de aceptación, no una aprobación académica institucional.
- Evidencia consolidada: `docs/evidencias/e09-verificacion.md`.

## E10 - Despliegue y recuperación (completada localmente)

- Compose genera imágenes API/web etiquetadas con `SIGA_VERSION`, acepta puertos configurables y conserva sus volúmenes. `npm run setup` genera en `.env` una clave exclusiva para `POSTGRES_APP_USER=siga_app`; migraciones/respaldo usan el propietario PostgreSQL y la API solo tiene DML, sin privilegios administrativos ni `CREATE` en `public`. No puede actualizar ni borrar filas de `Auditoria`.
- `npm run docker:deploy` pasó preflight y `npm run check`, 69/69 integraciones; creó respaldo antes de desplegar `0.1.0-e10-20261011055740`. La lista de tres migraciones no cambió; API/base sanas y web HTTP 200. El manifiesto local está en `.local/releases/release-0.1.0-e10-20261011055740.json`; `SIGA_VERSION` queda persistida en el `.env` ignorado por Git.
- CP-15: una copia Compose aislada (`sigae10roleclean20261011`, puertos 55444/18081) se construyó con volúmenes nuevos, aplicó tres migraciones y quedó sana con rol restringido. La web devolvió 200. Se detuvo sin borrar sus volúmenes. Los servicios y volúmenes originales `siga_siga_db` y `siga_siga_certificados` se conservaron.
- Respaldo final: `.local/backups/e10-2026-10-11T060044-364Z-908a7deb`; incluye dump PostgreSQL y PDFs con tamaño/hash. `npm run docker:restore:verify` restauró a `siga_restore_e10_83a7bc7785b14c3c8eeb3d11423e1856`, comparó 16 conteos y 1 PDF, y arrancó API de prueba con `siga_app`. Health ok; login 200, logout 204; constancia VIGENTE, SHA-256 idéntico, 5,209 bytes. La base y carpeta temporales se eliminaron; el respaldo se conservó.
- Revisión posterior solicitada de `scripts/backup-docker.mjs`: el archivo no presentaba marcadores ni entradas de conflicto en Git y ya contiene el arreglo que reinicia por ID el contenedor API detenido. `node --check`, Prettier y `git diff --check` pasaron. `npm run docker:backup` generó `.local/backups/e10-2026-10-11T063705-634Z-5d27f957` con dump PostgreSQL, conteos de 16 tablas y hash del PDF; el contenedor quedó saludable y `/api/health` respondió 200 a través del portal en `localhost:8080`.
- E2E Docker final: `SIGA_E2E_BASE_URL=http://localhost:8080 npm run test:e2e`, 12/12 entre móvil/escritorio y tres roles. Se probó la reversión de la primera versión E10: la anterior volvió a API/base sanas y web 200. La reversión se bloquea si cambia el conjunto de migraciones.
- Límites: el despliegue y recuperación verificados son locales, HTTP/loopback; no hubo publicación externa. Vite mantiene una advertencia no bloqueante de bundle JavaScript web mayor a 500 kB. D09–D13 y D15 siguen siendo propuestas académicas.
- Evidencia detallada: `docs/evidencias/e10-verificacion.md`.

## E11 - Capacitación y entrega documental (materiales preparados)

- Manual de usuario por rol, manual técnico y plan de capacitación con dos sesiones de 150 minutos, alternativa en línea, prácticas con datos ficticios, evaluación, criterios de aprobación y formatos de asistencia/entrega: `docs/manuales/manual-usuario-siga.docx`, `docs/manuales/manual-tecnico-siga.docx` y `docs/manuales/plan-capacitacion-e11.docx`.
- Los materiales describen la versión local verificada `0.1.0-e10-20261011055740`. Se contrastaron con el README, la interfaz y la evidencia E10; incluyen preparación del entorno, seguridad, operación, respaldo/restauración y rutas de soporte. Las reglas académicas propuestas se identifican como pendientes de aprobación.
- Revisión visual de los 14 folios (3 de usuario, 4 técnicos y 7 del plan) completada mediante exportación de Microsoft Word a PDF y rasterización con pypdfium2. El renderizador indicado por la skill no pudo ejecutarse porque LibreOffice no está instalado; se empleó Word como alternativa y se inspeccionaron todas las páginas.
- E11 no se declara cerrada: todavía no se realizó piloto independiente ni sesión presencial/en línea con participantes. No existen asistencias, calificaciones de evaluación, video grabado ni aceptación de entrega; los documentos dejan esos registros en blanco. La aceptación requiere un participante que siga el manual, resultado mínimo de 80/100 y 100 % en tareas críticas, además de registrar la sesión y la entrega.
- E11 es documental; no se cambió código de aplicación, esquema ni datos. No se ejecutaron pruebas de software en esta subetapa. La evidencia de revisión y pendientes está en `docs/evidencias/e11-verificacion.md`.

## Archivos y decisiones

Archivos principales: `apps/api/src/modules/{auth,catalogos,personas,oferta,matriculas,calificaciones,certificados,reportes}/`, `apps/api/src/config/{environment,origin}.ts`, `apps/api/src/app.ts`, `apps/web/src/app/{App,CatalogManagement,PersonManagement,OfertaManagement,StudentMatriculas,StudentCalificaciones,TeacherCalificaciones,CertificadosManagement}.tsx`, `apps/web/src/services/{auth,catalogos,personas,oferta,matriculas,calificaciones,e08}.ts`, `packages/contracts/src/index.ts`, `scripts/{test-integration,test-load,verify-docker-certificates,e10-docker-common,deploy-docker,backup-docker,verify-docker-restore,rollback-docker}.mjs`, `tests/e2e/{acceso,accesibilidad}.spec.ts`, `apps/api/test/{auth,catalogos,personas,oferta,matriculas,calificaciones,certificados}.integration.spec.ts`, `README.md`, evidencias E03–E11 y documentos de continuidad. E05–E08 reutilizan las entidades E02 y no añaden migraciones.

Decisiones: D23–D38 en `docs/DECISIONES.md`. D09–D13 continúan como propuestas académicas no aprobadas. La protección por rol y recurso debe aplicarse a cada nueva ruta, no solo a la interfaz.

## Comandos y resultados

Ver detalles en `docs/evidencias/e03-verificacion.md` y las evidencias E04-A/E04-B.

- `npm run check`: lint, tipos, unitarias/componentes y build correctos; 13 pruebas API y 7 web.
- `npm run test:integration`: 45 correctas (38 previas y 7 de E03) contra `siga_test` nativa; rollback de fixtures.
- `npm run test:e2e`: 10 correctas en web nativa y 10 en Docker (escritorio y móvil, tres roles).
- `docker compose up --build -d --wait`: correcto; `migrate` salió con código 0 y servicios sanos.
- Histórico de ejecución: `auth:bootstrap:demo` y `docker:demo:bootstrap` activaron cuentas ficticias en sesiones anteriores. Esos comandos se retiraron y las cuentas quedaron archivadas el 2026-10-18.
- `npm run format:check`: correcto; `npm audit --omit=dev`: 0 vulnerabilidades de producción; `git diff --check`: sin errores de whitespace.
- E04-A: `npm run check` correcto (lint, tipos, 13 pruebas API, 7 web y builds); `npm run test:integration` pasó 49 pruebas en cuatro suites, incluidos cuatro escenarios PostgreSQL de catálogos y planes.
- E04-A: `npm run test:e2e` pasó 10/10 en web nativa y 10/10 contra Docker, en escritorio y móvil. `docker compose up --build -d --wait` finalizó correctamente; PostgreSQL y API quedaron saludables, la web inició y `GET /api/health` respondió `status: ok`, base `up`.
- E04-A: `npm run format` y `npm run format:check`, más `git diff --check`, verificados al cerrar esta subetapa. Detalle de cobertura en `docs/evidencias/e04-a-verificacion.md`.
- E04-B: `npm run check` correcto (lint, tipos, 13 API unitarias, 7 web y builds); `npm run test:integration` pasó 53 pruebas en cinco suites, incluidas cuatro de personas con PostgreSQL real y fixtures rollback.
- E04-B: `npm run test:e2e` pasó 10/10 en nativo y 10/10 contra Docker, en escritorio/móvil. Incluye lista de estudiantes y docentes, navegación de ADMINISTRADOR y rechazo de acceso para ESTUDIANTE.
- E04-B: `docker compose up --build -d --wait`, `/api/health`, `npm run format:check` y `git diff --check` correctos. Evidencia detallada: `docs/evidencias/e04-b-verificacion.md`.
- E05: `npm run check` correcto: lint, TypeScript, 13 pruebas API unitarias, 7 pruebas web y builds API/web.
- E05: `npm run test:integration` pasó 57 pruebas en 6 suites contra PostgreSQL de prueba; incluye 4 E05 sobre permisos/CSRF, fechas/claves, referencias de grupo, cupo/historial/auditoría y propietario docente. Los fixtures se revierten.
- E05: `npm run test:e2e` pasó 10/10 en API/web nativas y 10/10 contra Docker, en escritorio/móvil. Incluye pantalla administrativa de oferta y «Mis grupos» docente.
- E05: `docker compose up --build -d --wait` correcto; migración con código 0 y API/base/web saludables. `GET http://localhost:8080/api/health` devolvió `status: ok`, base `up`. No se cambió el esquema ni se eliminó el volumen.
- E05: `npm run format:check` y `git diff --check` correctos tras editar la documentación; evidencia detallada: `docs/evidencias/e05-verificacion.md`.
- E06: `npm run check` correcto: lint, TypeScript, 14 pruebas API unitarias, 7 web y builds API/web. `npm run format:check` y `git diff --check` correctos.
- E06: `npm run test:integration` pasó 63 pruebas en 7 suites contra PostgreSQL nativo. Incluye seis casos RF-06: rol/CSRF y sesión propia, prerrequisito rechazado/aprobado sin filas parciales, duplicidad entre grupos, política de reinscripción, periodo/ventana/perfil inactivo, dos estudiantes por el último lugar y mismo estudiante en grupos paralelos. El runner migró y retiró un esquema temporal propio.
- E06: `npm run test:e2e` pasó 10/10 nativo y 10/10 Docker; el estudiante abrió «Mi matrícula», oferta e historial en escritorio y móvil sin modificar datos demo.
- E06: `docker compose up --build -d --wait` correcto; los tres servicios quedaron sanos, `/api/health` reportó PostgreSQL disponible y el volumen existente se conservó. No hubo migración nueva. Evidencia: `docs/evidencias/e06-verificacion.md`.
- E07: `npm run check` correcto: 18 pruebas API unitarias, 7 web, lint, tipos y compilaciones.
- E07: `npm run test:integration` pasó 66 pruebas en ocho suites y esquema temporal. Tres pruebas cubren captura/corrección, propiedad del docente, escala, precisión, cero, auditoría/versionado, promedio ponderado y progreso sin duplicar créditos.
- E07: `npm run test:e2e` pasó 10/10 nativo y 10/10 Docker; se navegaron la captura docente y el historial/avance estudiantil en móvil y escritorio sin guardar cambios en cuentas demo.
- E07: Docker API/base/web saludables, health `/api/health` correcto y tres migraciones existentes sin pendientes. `npm run format:check` y `git diff --check` correctos. Evidencia: `docs/evidencias/e07-verificacion.md`.

Migraciones: tres aplicadas a `siga_dev` nativa (55432), `siga_test` nativa (55433) y `siga_dev` de Docker (5432). Las corridas actuales de integración migran y eliminan un esquema temporal propio. Durante los primeros intentos de probar concurrencia antes de habilitar ese aislamiento quedaron fixtures ficticias en el esquema `public` de `siga_test`; se conservaron por las restricciones de historial inmutable y no se hizo reset. No se tocaron `siga_dev` ni el volumen Docker.

## Límites y continuación

CI remoto no ejecutado: no hay remoto/push. No se configuró despliegue público ni HTTPS; `COOKIE_SECURE=false` es solo para HTTP local. Para producción se requiere `COOKIE_SECURE=true`, `WEB_ORIGIN` correspondiente y gestión externa de secretos. La API Docker usa rol PostgreSQL restringido; el propietario local se reserva a migraciones y respaldos. El limitador de login reside en memoria de una sola API, suficiente para la demo local; escalarlo requiere almacén compartido. Las sesiones duran 30 minutos, sin renovación automática. CP-01 quedó comprobado en E03; CP-02 de E04; CP-03/04/05/08 de matrícula; CP-06/07/09/10/11 de calificaciones y avance; CP-12/13 de E08; CP-14 de E09 y CP-15 de E10. D09–D13 siguen propuestas.

E10 está cerrada localmente. Para terminar E11, ejecutar el piloto con una persona distinta de quien elaboró los materiales, impartir y documentar la sesión, conservar las hojas de asistencia/evaluación completadas y registrar la entrega/aceptación; grabar el video si se exige como evidencia institucional. Las cuentas nuevas creadas en E04 quedan desactivadas y requieren un flujo de provisión separado. Las cuentas demo anteriores ya no pueden iniciar sesión. El administrador local solicitado se verificó en las bases nativa y Docker; sus accesos están separados en `.local/admin-acceso.txt` y `.local/admin-acceso-5432.txt`.

Reproducir: `npm run db:local:start`, `npm run dev` para web 5173/API 3000, o `docker compose up -d --wait` para web 8080. Las bases nativas son 55432/55433. Consultar `README.md` para instalación limpia y pruebas. No hay commits. Cuando se generan, credenciales quedan en `.local` y secretos en `.env`, ignorados por Git.

Modelo recomendado: Codex Luna para ajustes editoriales de los materiales y Codex Sol para comprobarlos contra las funciones verificadas, según disponibilidad del selector. La recomendación no cambia el modelo automáticamente.

## Ampliación integrada de diez funciones (2026-11-12)

Se agregaron las diez capacidades descritas en [`AMPLIACION_FUNCIONAL_20261112.md`](AMPLIACION_FUNCIONAL_20261112.md): horarios, mapa dinámico, notas parciales ponderadas, notificaciones, cancelación/lista de espera, estadísticas, certificado de conclusión, alertas, asistencia y perfil/recuperación. Implementación de aplicación y migración aditiva en código. Validación Prisma, tipado, lint, compilación NestJS y React, 48 pruebas unitarias API y 40 pruebas frontend correctas. **No se ejecutaron aún integración PostgreSQL ni E2E de los flujos nuevos**; los estados de cierre de E00–E11 anteriores no deben interpretarse como verificación de esta ampliación. Revisar límites y políticas en la guía.
