# Auditoria tecnica previa al cierre local de SIGA

Fecha: 2026-11-05 (America/Mexico_City).
Estado: auditoria realizada; correcciones y validacion funcional pendientes.
Alcance: backend, frontend, persistencia, pruebas y operacion de la entrega academica local con datos ficticios.

## 1. Dictamen y limites

La estructura existente permite continuar sin reescribir: monolito modular NestJS, React/Vite, Prisma/PostgreSQL y contratos compartidos. Existen controles valiosos de concurrencia, precision y permisos. Sin embargo, hay defectos y brechas verificables en acceso operativo, recuperacion, manejo de estado del frontend y cobertura de la validacion. No se puede declarar 100 % funcional la copia revisada.

Esta auditoria precede a la reformulacion de `../PLAN_MAESTRO_ENTREGA.md`. La autorizacion actual cubre auditar y mejorar el plan; este trabajo no implementa las correcciones propuestas. Los documentos del proyecto se usaron como fuentes de requisitos y evidencia historica, no como nuevas solicitudes de ejecucion o publicacion.

**Hechos:** se inspeccionaron manifiestos, workflow, esquema y migraciones, configuracion, servicios/controladores de autenticacion, personas, catalogos, oferta, matriculas, calificaciones, certificados y reportes; pantallas y clientes HTTP web; suites de integracion/E2E y scripts de carga/recuperacion. Se contrastaron guia, backlog, decisiones, estado, evidencia E11 y secciones finales del PDF academico.

**Supuestos:** el objetivo sigue siendo una entrega academica local, con una instancia de API y datos ficticios. No se presupone capacidad del equipo, aprobacion institucional, catalogo oficial completo ni acceso a un repositorio remoto.

**Limites:** revision estatica y comprobaciones locales de sintaxis/entorno. No se renderizo la aplicacion, no se midio latencia ni se reprodujeron fallos contra PostgreSQL. Los hallazgos de flujo derivan del codigo y deben recibir una prueba de regresion antes de cerrarse. No se realizo escaneo de dependencias ni auditoria exhaustiva de seguridad.

## 2. Candidato y verificaciones efectivas

No existe `.git` en esta copia. Identificacion de la instantanea tecnica previa a los cambios documentales:

- SHA-256: `feea1bdc42012943ba2c00bde4ac81488e7b8267875c0ec6458b4328519c11e9`.
- 119 archivos: todos los archivos de `apps/`, `packages/`, `scripts/`, `tests/`, `.github/`, mas `package.json`, `package-lock.json`, `.node-version`, `.npmrc`, `playwright.config.ts` y los tres Compose raiz.
- Algoritmo: ordenar las rutas relativas; alimentar SHA-256 con ruta UTF-8, byte NUL, contenido binario y byte NUL por archivo. La huella identifica contenido inspeccionado; no demuestra funcionalidad.

| Comprobacion                                                    | Resultado observado                      | Consecuencia                                                                              |
| --------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `node --version`, `npm --version`                               | v24.21.0 / 11.19.0                       | Difieren de engines 24.19.x / 12.2.x y `.node-version` 24.19.0.                           |
| Presencia de dependencias/Git                                   | Sin `node_modules` ni `.git`             | No hay herramientas del proyecto instaladas ni commit para identificar el candidato.      |
| `docker --version`, `docker info --format '{{.ServerVersion}}'` | Cliente y motor 29.8.2 disponibles       | La antigua ausencia de Docker no describe este entorno.                                   |
| Inventario de contenedores                                      | Ningun contenedor identificado como SIGA | No se probo un servicio SIGA en ejecucion; no se alteraron otros servicios.               |
| Lectura JSON de los cuatro manifiestos                          | PASO                                     | Sintaxis JSON valida; no valida resolucion de paquetes.                                   |
| `node --check scripts/<archivo>.mjs`, los 11 scripts MJS        | PASO, 11/11                              | Solo sintaxis; no ejecuta imports, migraciones ni logica de los scripts.                  |
| `npm run check`                                                 | FALLO, codigo 127: `eslint: not found`   | No llegaron a ejecutarse tipos, unitarias ni build.                                       |
| Integracion, cobertura, E2E, carga y restauracion               | NO EJECUTADO                             | Faltan dependencias y entorno SIGA aislado preparado.                                     |
| Linter/formateador Markdown del proyecto                        | BLOQUEADO por dependencias ausentes      | La entrega documental requiere comprobacion estructural local y posterior `format:check`. |

No se instalaron dependencias, no se levantaron servicios, no se cambiaron datos, secretos, migraciones ni codigo de aplicacion. No se atribuyen a esta sesion los resultados historicos de `ESTADO.md`.

## 3. Bases que conviene conservar

- `matriculas.service.ts`, `crear`: bloqueo de persona/cuenta y grupo, aislamiento serializable, reintentos acotados, auditoria atomica y validacion del servidor. `schema.prisma` protege duplicidad por estudiante/asignatura/periodo.
- `calificaciones.service.ts`, `actualizar`: version esperada, motivo de correccion, transaccion y auditoria. `calificaciones.calculo.ts` usa Decimal, distingue NULL/cero y cuenta creditos aprobados unicos.
- `auth.guard.ts` y `auth.service.ts`: roles, sesion revocable consultada en BD, CSRF, origen, cookie HttpOnly y hash de contrasenas. El cliente no sustituye la autorizacion del servidor.
- `certificados.service.ts`: instantanea, escritura temporal y renombrado, comprobacion de hash al descargar, propiedad y verificacion publica limitada. El PDF se genera fuera de la transaccion inicial.
- Restricciones SQL, historia inmutable, pool con limites/timeout, healthchecks y scripts existentes de respaldo/restauracion. Se revalidan; no se sustituyen por infraestructura nueva.

## 4. Hallazgos obligatorios para cerrar

Prioridades: **P1** impide completar o demostrar correctamente una tarea/requisito del alcance; **P2** requiere corregir o verificar comportamiento, usabilidad o configuracion del alcance; **P3** mejora opcional condicionada a medicion. No se asigna P0 sin evidencia de una interrupcion general o perdida critica reproducida. Todos los hallazgos parten ABIERTOS; la severidad no equivale a explotacion demostrada.

### AUD-01 — P1 — Entorno no reproducido (confirmado)

**Evidencia:** `.node-version`, `.npmrc`, engines en `package.json` y verificaciones de la seccion 2. La descripcion anterior del entorno en el plan quedo desactualizada.

**Impacto:** no se pueden usar conteos historicos para aprobar el candidato actual.

**Accion:** PB-02. Preparar runtime compatible e instalacion desde lockfile en copia aislada; registrar comandos/versiones. No desactivar `engine-strict` para ocultar la diferencia. Si se decide cambiar versiones, justificar compatibilidad, actualizar conjuntamente engines/lockfile/contenedores y volver a verificar.

**Cierre:** instalacion limpia, generacion Prisma, formato, lint, tipos, unitarias y build ejecutados; base de prueba y demo separadas.

### AUD-02 — P1 — Alta de persona sin acceso operativo general (confirmado por lectura)

**Evidencia:** `personas.service.ts:170-177` y `291-295` crean cuentas inactivas con hash aleatorio descartado. README, Personas, explica la separacion. Los bootstrap locales crean perfiles prefijados; no completan el acceso de una persona arbitraria creada desde la administracion. No se encontro flujo general de recuperacion.

**Impacto:** dar de alta un estudiante o docente no basta para completar su recorrido real.

**Accion:** PB-04. Completar el mecanismo minimo de provision/restablecimiento local para una cuenta existente, autorizado, auditable y documentado; puede ser un comando operativo si no se exige autoservicio. No agregar correo ni registro publico. Separar estado academico y acceso.

**Cierre:** alta de persona nueva -> provision -> login -> baja/revocacion -> rechazo de sesion previa -> reactivacion controlada; restablecimiento sin exponer secretos en logs/capturas. Probar ambos roles sin depender de cuentas hardcodeadas.

### AUD-03 — P1 — Consultas personales conservadas entre sesiones (confirmado por lectura; efecto visual por reproducir)

**Evidencia:** `App.tsx:280-285` solo elimina `admin-users` al cerrar sesion. `StudentCalificaciones.tsx` usa claves `['calificaciones','propias']` y `['progreso','propio']`; matriculas y certificados tambien usan claves sin identidad. `main.tsx` mantiene un QueryClient de la aplicacion.

**Impacto:** riesgo de mostrar datos antiguos de otra cuenta en el mismo navegador mientras se actualizan las consultas; el permiso API no borra la memoria del cliente.

**Accion:** PB-25. Cancelar y retirar consultas privadas al cambiar/cerrar/expirar sesion; asociar consultas personales a la identidad. Tratar respuestas tardias y 401, sin reintentar escrituras automaticamente.

**Cierre:** cuentas A/B del mismo rol usadas sucesivamente en un contexto de navegador, red lenta, expiracion y respuestas pendientes; ningun dato de A aparece para B, tampoco durante la carga. Verificar que la API sigue aislando recursos.

### AUD-04 — P1 — Reemision fallida bloquea el siguiente intento (confirmado por lectura)

**Evidencia:** `certificados.service.ts:110-122` rechaza cualquier `previous.reemplazo`; `384-394` crea el vinculo antes del PDF; `457-479` conserva la fila al fallar. `schema.prisma`, Certificado, define `reemplazaId @unique`. El trigger `siga_certificado_conservar` conserva ese vinculo y prohibe borrar historial.

**Impacto:** un reemplazo FALLIDO o PENDIENTE sigue ocupando la relacion y no permite una nueva reemision del original.

**Accion:** PB-12. Disenar reintento de la misma solicitud o estrategia equivalente compatible con unicidad, instantanea e historial. No borrar filas ni modificar migraciones ya aplicadas para liberar el vinculo.

**Cierre:** fallo controlado y posterior recuperacion exitosa, tambien en dos peticiones concurrentes, con un solo reemplazo valido y auditoria consistente.

### AUD-05 — P1 — Pendientes sin conciliacion y fallos secundarios silenciados (confirmado por lectura)

**Evidencia:** `certificados.service.ts:410-486`; eliminaciones capturan y descartan errores; si falla el registro de FALLIDO queda PENDIENTE. No se encontro proceso de conciliacion. Nginx y Vite tienen timeout de proxy de 5 s mientras la emision contempla una transaccion de hasta 20 s ademas de generar el PDF.

**Impacto:** una interrupcion puede dejar solicitudes o archivos sin resolucion clara. Un timeout de cliente no demuestra que la emision no termino.

**Accion:** PB-12/PB-13. Recuperacion explicita y repetible al reiniciar/reintentar, diagnostico sin secretos, limpieza segura de temporales propios y estado consultable. Verificar plazos del recorrido completo antes de decidir cambios de timeout; no hace falta introducir colas distribuidas.

**Cierre:** interrupciones antes/despues de escritura/renombrado/confirmacion, BD temporalmente indisponible, posterior conciliacion y reintentos sin duplicar; ningun pendiente antiguo sin resultado o accion operativa definida.

### AUD-06 — P1 — Datos inaccesibles al superar la primera pagina (confirmado por lectura)

**Evidencia:** `CertificadosManagement.tsx:221-234` solicita pagina 1 de 100 para grupos, constancias y bitacora sin controles de pagina. `CatalogManagement.tsx:57-65`, `PersonManagement.tsx:130-133` y `OfertaManagement.tsx:198-211` cargan solo pagina 1 para selectores. `matriculas.service.ts`, `propias/oferta`, corta a 200/100; `oferta.service.ts:492-504` corta grupos docentes a 100; `auth.service.ts`, `users`, corta a 50.

**Impacto:** existen registros validos que no pueden consultarse o seleccionarse. No es una optimizacion estetica.

**Accion:** PB-26. Paginacion o busqueda paginada de extremo a extremo, con total y orden estable; preservar seleccion al editar. No resolver con `take` enorme ni eliminando limites sin control.

**Cierre:** consultar y operar sobre los registros 101 y 201 segun el limite, cuentas >50, paginas finales/vacias y busqueda; todos los registros del conjunto deben ser alcanzables. Actualizar contratos y clientes juntos.

### AUD-07 — P1 — Error de nota borra borradores de todas las filas (confirmado)

**Evidencia:** `TeacherCalificaciones.tsx`, `mutation.onError`, ejecuta `setDrafts({})` y `setReasons({})` ante cualquier error.

**Impacto:** falla una fila y se pierde trabajo sin guardar de otras; no hay recuperacion util de conflicto.

**Accion:** PB-27. Conservar borradores/motivos, identificar la fila afectada y comparar la version actual cuando haya conflicto. Guardar correctamente borra solo el borrador confirmado. Revisar cambio de grupo/pagina y navegacion con cambios pendientes.

**Cierre:** editar dos filas, fallar una por desconexion/validacion/conflicto y recuperar sin perder la otra ni sobrescribir silenciosamente una nota nueva.

### AUD-08 — P1 — E2E omitidas y expectativas desactualizadas (confirmado)

**Evidencia:** `tests/e2e/acceso.spec.ts` deshabilita credenciales cuando `CI` es verdadero y espera `Cuentas registradas`, mientras `App.tsx` muestra `Cuentas activas`. La suite tambien presupone datos de demo visibles que actualmente se archivan. `perfiles-locales.spec.ts` depende de archivos `.local` y conteos/nombres fijos. El workflow no prepara esos archivos/fixtures. La prueba de accesibilidad del menu intercepta endpoints: sirve para UI, no acredita integracion real.

**Impacto:** un workflow verde puede omitir autenticacion por rol; las pruebas antiguas no acreditan la UI actual. No hay recorrido E2E completo que cree oferta, matricule, califique, emita y recupere documentos.

**Accion:** PB-19/PB-18. Fixtures sinteticas aisladas, cuentas de tres roles y dos titulares, expectativas actuales basadas en comportamiento; fallo explicito si falta un prerrequisito de una prueba critica. Separar pruebas con mocks y pruebas contra API/BD real.

**Cierre:** recorrido completo y regresiones de auditoria realmente ejecutados, cero skips criticos y reporte de pasadas/fallidas/omitidas; CI remoto solo si hay repositorio autorizado, con alternativa local equivalente documentada.

### AUD-09 — P1 — Cobertura no impone el criterio declarado (confirmado)

**Evidencia:** `jest.config.cjs` sin `coverageThreshold`; `scripts/test-integration.mjs:51-59` recoge solo `src/modules/**/*.service.ts` y no incluye `calificaciones.calculo.ts`. El workflow no ejecuta cobertura. `docs/ESTADO.md` documenta ramas historicas inferiores a 70 % en catalogos, certificados y personas.

**Impacto:** calcular y publicar cobertura no evita regresiones ni acredita cobertura de las reglas puras.

**Accion:** PB-18/PB-19. Incluir ejecuciones unitarias e integracion con las reglas de negocio, definir denominador y aplicar >=70 % lineas y ramas a cada archivo de reglas incluido. Incluir reglas puras, servicios y validaciones relevantes; excluir generados/arranque con justificacion. Reportar funciones/sentencias sin sustituir lineas/ramas. No mezclar porcentajes por promedio simple ni fabricar tests triviales.

**Cierre:** inventario explicito de archivos de reglas, informe vigente y comando que devuelve error cuando incumple el umbral; casos criticos presentes aunque el porcentaje ya pase.

### AUD-10 — P1 — La carga existente mide un unico reporte (confirmado)

**Evidencia:** `scripts/test-load.mjs`, `loadPhase`, consulta solamente `/reportes/grupos`. Usa 20 workers con una sesion y fuerza puerto 5432 aun cuando admite 55432 al validar. Las metricas historicas no representan oferta, matricula ni PDF.

**Impacto:** no hay medicion suficiente de las operaciones centrales ni equivalencia entre concurrencia de solicitudes y usuarios distintos.

**Accion:** PB-20. Reutilizar el harness, parametrizar destino aislado y ampliar escenarios: oferta, matricula autorizada con datos reiniciables y emision/descarga. Acordar D15 antes de aprobar; distinguir rechazos de negocio esperados, errores inesperados y timeout. No optimizar SQL o pool sin observar el problema.

**Cierre:** escenario, hardware, datos, usuarios, calentamiento, duracion, p95 y errores por operacion; objetivo inicial de guia p95 <2 s y errores inesperados <1 %, 20 usuarios concurrentes, 1 min de calentamiento y 5 min medidos, 1000 estudiantes/50 grupos. Si PDF necesita otra meta, decision explicita previa, nunca cambiarla despues de medir para aparentar exito.

### AUD-11 — P2 — Pestanas con semantica incompleta (confirmado por lectura)

**Evidencia:** `CurriculumOverview.tsx:66-120` usa tablist/tab/tabpanel sin relacion por ID ni control de foco/flechas. Existen patrones similares en catalogos, personas y oferta.

**Impacto:** controles anunciados como pestanas no tienen todo el comportamiento esperado de ese patron.

**Accion:** PB-16. Completar el patron o usar botones nativos con seleccion clara. Revisar teclado, foco, errores asociados y menu movil en tareas privadas, no solo login.

**Cierre:** tareas criticas sin raton, 360/1366 px, zoom y contenido largo; comprobar visualmente. Sin afirmar conformidad integral de accesibilidad a partir de esta revision parcial.

### AUD-12 — P2 — Estado pendiente global confunde la fila activa (confirmado)

**Evidencia:** `StudentMatriculas.tsx` usa `mutation.isPending` para el texto de todos los botones de grupo; `TeacherCalificaciones.tsx` tiene texto global equivalente por fila.

**Accion:** PB-05/PB-27. Identificar la operacion/fila solicitada. Se puede mantener bloqueo global para evitar doble envio, pero el mensaje debe corresponder al objeto activo.

**Cierre:** guardar una fila/grupo anuncia solo esa operacion y muestra resultado o recuperacion claros, tambien con teclado.

### AUD-13 — P1 — PDF con identidad ICO-F19 fija para cualquier programa (confirmado)

**Evidencia:** `certificado.pdf.ts:81-82,102` fija asunto, creador y encabezado a ICO-F19/Ingenieria en Computacion, aunque la instantanea incluye el programa real.

**Impacto:** el sistema exige multiples programas; una constancia de otro programa contiene informacion contradictoria.

**Accion:** PB-11. Usar identidad SIGA/emisor acordado y programa de la instantanea, conservando alcance de constancia de estudios ficticia.

**Cierre:** PDFs de dos programas distintos coherentes en texto, metadatos y verificador; QR y descarga correctos.

### AUD-14 — P2 — Limites de texto/fuentes PDF por verificar (riesgo)

**Evidencia:** `personas.service.ts`, `nombreSchema`, acepta texto de hasta 160 caracteres; `certificado.pdf.ts:84-85` usa Helvetica estandar y `112,130-138` dibuja nombre/plan sin ajuste como el aplicado a las filas.

**Hipotesis:** nombres largos pueden desbordarse y caracteres fuera de la fuente pueden impedir emitir. No se renderizo ni ejecuto pdf-lib en esta sesion.

**Accion:** PB-11. Probar longitudes maximas, acentos, caracteres admitidos y varias paginas; resolver con ajuste de texto y soporte de fuente o validacion explicita coherente en UI/API. No alterar silenciosamente nombres.

**Cierre:** fixtures limite producen documento legible y correcto o rechazo anticipado accionable; nunca fallo tardio irrecuperable.

### AUD-15 — P2 — Cabecera web no garantizada en todas las ubicaciones (riesgo de configuracion)

**Evidencia:** `apps/web/nginx.conf` define `X-Content-Type-Options` en server y otros `add_header` dentro de `/` y `/assets/`.

**Accion:** PB-13. Revisar herencia en la imagen Nginx realmente usada y hacer explicita la cabecera en las respuestas pertinentes; comprobar HTML, assets y errores. No se probo la respuesta renderizada/servida.

**Cierre:** cabeceras efectivas verificadas en el contenedor local, sin romper cache de assets o rutas SPA.

### AUD-16 — P2 — Confianza en proxy fija (confirmado; efecto depende de topologia)

**Evidencia:** `apps/api/src/app.ts` fija `trust proxy` a 1; `auth.controller.ts` usa `request.ip` para el limitador. Hay acceso nativo y via Nginx.

**Accion:** PB-13/PB-14. Hacer coherente la confianza con la ruta local realmente habilitada; revisar configuracion de acceso directo y proxy, mantener limite por cuenta/IP. No introducir Redis para una sola instancia ni hacer pruebas contra terceros.

**Cierre:** configuraciones nativa/proxy permitidas y limitador comprobados de forma local; sin atribuir cobertura a topologias no ensayadas.

### AUD-17 — P1 — Cambios de catalogo sin valores anteriores/posteriores (confirmado)

**Evidencia:** `catalogos.service.ts:474-484`, `audit`, registra actor/accion/recurso/motivo; `actualizarPrograma`, `actualizarAsignatura`, `actualizarPlan` y contenido no suministran valores anteriores/posteriores. RF-12 en la guia pide valores pertinentes. El visor web ofrece Antes/Despues pero recibe vacios para estos cambios.

**Accion:** PB-28. Registrar los campos pertinentes en la misma transaccion, minimizando datos y sin secretos. No inventar datos retrospectivos para las entradas existentes.

**Cierre:** crear/modificar/versionar/baja generan evidencia suficiente para comprender el cambio y no dejan auditoria huerfana si revierte la operacion; historial antiguo identificado como tal.

### AUD-18 — P1 — Trazabilidad afirmada pero ausente y estados mezclados (confirmado)

**Evidencia:** el antiguo plan afirmaba trazabilidad creada, pero no existia archivo dedicado; `docs/ESTADO.md` conserva resultados de otro entorno/version y el backlog conserva etapas historicamente cerradas pese a brechas actuales.

**Accion:** PB-01/PB-23. Crear matriz RF/RN/RNF, vincular hallazgos/PB/CP/evidencias; identificar candidato y separar HISTORICO, ESTATICO, PENDIENTE, PASO, FALLO, BLOQUEADO y ACEPTADO.

**Cierre:** ningun requisito incluido sin caso ni evidencia vigente; pendiente obligatorio impide declarar 100 %. Companion para principiantes y acta humana reales.

### AUD-19 — P2 — Efecto de baja de programa sobre oferta por resolver (hipotesis de regla)

**Evidencia:** `actualizarPrograma` solo cambia Programa; `matriculas.service.ts`, `offerInclude/assertGroupEligibility`, comprueba plan/asignatura/docente, pero no `programa.activo`. `oferta.service.ts`, `assertGroupReferences`, comprueba plan activo sin programa.

**Riesgo:** si la baja del programa debe impedir nueva oferta o matricula, el comportamiento actual no aplica esa regla. No se presume esa politica a partir del nombre del campo.

**Accion:** PB-03/PB-05. Registrar semantica de bajas y combinaciones padre/hijo, conservar historia y alinear UI/API con la decision. No imponer cascadas destructivas.

**Cierre:** matriz activa/inactiva con resultado acordado y pruebas; regla visible, sin discrepancia entre oferta y validacion al inscribir.

## 5. Optimizaciones opcionales y mantenibilidad

### AUD-20 — P3 — Lecturas repetidas y trabajo en memoria

`StudentCalificaciones.tsx` consulta notas y progreso; ambos endpoints leen el historial completo mediante `registrosEstudiante`. El resumen por periodo hace `records.filter` por cada periodo y la oferta hace `samePeriod.some` por grupo. `CatalogManagement.tsx` mantiene consultas de listas activas fuera de la pestana seleccionada; reportes busca simultaneamente en tres conjuntos por cada cambio de texto.

**Propuesta condicionada:** medir numero/duracion de consultas, solicitudes y payload; usar mapas/sets para agregacion, habilitar solo consultas necesarias y reutilizar datos comunes si reduce trabajo sin volver incoherentes promedio/progreso. Considerar busqueda con envio explicito o espera breve reutilizando lo existente. Evitar cache global compartida de datos personales y endpoints nuevos sin beneficio probado.

**Cierre opcional:** comparacion antes/despues con datos identicos, menos trabajo medido y contratos/resultados intactos. Sin cuello de botella, conservar y registrar decision. PB-29.

### AUD-21 — P3 — Copia del plan hace escrituras por asignatura

`catalogos.service.ts:341-350` ejecuta un `createMany` por asignatura con prerrequisitos. Puede aplanarse el conjunto y usar una escritura por lote, respetando grafo, transaccion y auditoria.

**Cierre opcional:** medir antes/despues con plan representativo, mismos nodos/aristas/historia y errores; simplificar solo si aporta. No es razon para reescribir el modulo ni obliga a optimizar sin evidencia. PB-29.

No se justifica agregar microservicios, colas distribuidas, cache distribuida, virtualizacion generalizada o una nueva biblioteca visual. Tampoco se afirma que falten indices sin ejecutar planes de consulta: el esquema ya contiene indices compuestos relevantes.

## 6. Orden recomendado y tratamiento de riesgos

1. Entorno y trazabilidad: AUD-01/18. Resolver decisiones de catalogo, politica y aceptacion mientras se prepara el entorno.
2. Acceso y aislamiento de sesion: AUD-02/03; fixtures reales AUD-08.
3. Catalogos, navegacion de conjuntos y reportes: AUD-06/17/19.
4. Calificaciones y feedback: AUD-07/12; confirmar reglas y ejemplos manuales.
5. Constancias: AUD-04/05/13/14; evitar declarar recuperacion sin pruebas de interrupcion.
6. Seguridad/configuracion y accesibilidad: AUD-11/15/16, iniciando permisos desde las primeras correcciones.
7. Regresion, cobertura y medicion: AUD-08/09/10. AUD-20/21 solo si las mediciones lo justifican.
8. Restauracion, manuales, piloto, capacitacion y aceptacion.

P1 y P2 deben resolverse o, en riesgos/hipotesis, descartarse con evidencia pertinente antes del cierre. Una nota de 'riesgo aceptado' no sustituye una funcion obligatoria que no opera. Las P3 pueden quedar diferidas con motivo porque no amplian el producto funcional requerido.

## 7. Entrega de esta auditoria

Cambios: informe tecnico previo y, despues de completarlo, plan reformulado, matriz inicial, explicacion para principiantes y referencias/estado/backlog sincronizados. No se corrigio codigo. Las verificaciones de software/entorno son las detalladas en la seccion 2.

Validacion posterior de documentacion mediante Python: PASO en 7 documentos, 54 enlaces locales existentes, tablas consistentes, 30 PB, 21 AUD trazados y 31 requisitos/entregables incluidos sin duplicados. La huella de los 119 archivos tecnicos permanecio identica. Esta comprobacion no sustituye `format:check` ni pruebas del sistema.

Siguiente trabajo: PB-01/02 para responsables, decisiones y entorno; fixtures y acceso/cache segun el plan. Todos los resultados funcionales finales siguen pendientes de ejecucion. La reversibilidad documental no implica revertir bases ni migraciones.
