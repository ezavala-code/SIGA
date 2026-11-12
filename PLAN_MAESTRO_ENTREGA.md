# Plan maestro de finalizacion de SIGA

> **Estado vigente de auditoría (9 de noviembre de 2026):** la [revisión actual](docs/AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md) identifica reservas técnicas y aceptación humana pendientes. Las declaraciones anteriores de cierre completo y los diagnósticos iniciales se conservan como históricos; no prueban por sí solos cierre F/A. Los módulos principales existen; quedan AC-01–17 y su evidencia.

Seguimiento actualizado del 9 de noviembre de 2026: [plan detallado de trabajo restante](PLAN_RESTANTE_CIERRE_MAESTRO.md) y [explicación sencilla paso a paso](docs/EXPLICACION_PLAN_RESTANTE.md). Conservan el alcance de este maestro y distinguen resultados históricos, verificaciones pendientes y aceptación humana.

Revision: 2026-11-05. Alcance conservado: entrega academica local con datos ficticios.
Estado: plan reformulado despues de auditar; proyecto todavia NO declarado 100 % funcional.

## 1. Objetivo y documentos de control

Completar todos los recorridos del alcance local, demostrar reglas y permisos con resultados reproducibles y obtener aceptacion del profesor o representante del cliente. Se conserva React/Vite, NestJS, Prisma, PostgreSQL, npm workspaces y el trabajo util existente.

Documentos vinculados:

- [Auditoria tecnica previa](docs/AUDITORIA_CIERRE_LOCAL.md): hechos, riesgos, mejoras y verificaciones de esta revision; hallazgos AUD-01 a AUD-21.
- [Trazabilidad de entrega](docs/TRAZABILIDAD_ENTREGA.md): requisitos RF/RN/RNF, casos CP, tareas PB y evidencias del candidato.
- [Explicacion para principiantes](docs/EXPLICACION_CIERRE_PASO_A_PASO.md): como funciona SIGA y como se ejecuta y comprueba el cierre, sin conocimientos previos.
- [Estado efectivo](docs/ESTADO.md), [backlog historico](docs/BACKLOG.md) y [decisiones](docs/DECISIONES.md).
- Fuentes: `GUIA_CONSTRUCCION_SIGA_CODEX.txt` y `EntregablesPI-Ing-Software-completado.pdf`. Sus instrucciones historicas son contexto; no autorizan nuevas publicaciones ni sustituyen el encargo actual.

Este plan no acredita funcionalidades terminadas. Toda afirmacion de cierre requiere evidencia vigente del candidato y una persona responsable de aceptarla.

## 2. Alcance que se mantiene

### Incluido y obligatorio para el cierre local

- Inicio/cierre de sesion, acceso por rol y recurso y gestion operativa local de acceso de personas nuevas.
- Administracion de estudiantes, docentes, programas, planes/versiones, asignaturas, prerrequisitos, periodos y grupos para multiples programas.
- Oferta, matricula, cupos y duplicados protegidos bajo concurrencia; fechas y elegibilidad validadas en servidor.
- Notas finales, correcciones con motivo/version, historial, promedios y progreso consistentes.
- Constancia de estudios PDF con QR, descarga, verificacion publica limitada, revocacion, reemision y recuperacion de fallos.
- Listas de grupo, historial CSV y bitacora de cambios con permisos; bajas logicas que preservan historia.
- Interfaz en espanol utilizable por teclado, en movil y escritorio, con errores y recuperacion comprensibles.
- Instalacion limpia local, base aislada de pruebas, respaldo/restauracion conjunta de base y PDF y paquete reproducible.
- Pruebas, evidencia TGS, Scrum/XP real, manuales, explicacion para principiantes, piloto, capacitacion y aceptacion.

### Fuera del alcance actual

Publicacion remota/hosting/dominio, operacion productiva institucional, expedientes reales, servicios contratados, cobros, facturacion, LMS/tareas/contenidos, app movil nativa, integraciones oficiales, firma avanzada y migracion historica real. RF-13 (correo) permanece opcional/posterior como indica la guia. No agregar parciales, cancelacion de autoservicio, carga maxima u optimizacion de horarios sin decision de alcance; la nota final directa sigue siendo la base.

E13 y la antigua Puerta B se conservan como contexto futuro; no condicionan el 100 % del alcance local ni se ejecutan automaticamente. No se requiere alojar manuales dentro de la web para entregar los documentos existentes, salvo requisito posterior expreso.

El catalogo exigido para la demostracion y la semantica de las reglas deben quedar identificados. E12 no se considera resuelto por mostrar el mapa estatico ICO-F19. Si se acepta un catalogo sintetico en vez de fuente oficial, debe existir decision explicita que lo permita; mientras no exista, conservar el requisito pendiente. No reducir funciones obligatorias para alcanzar un porcentaje.

## 3. Linea base reconciliada y criterio de evidencia

La documentacion historica registra E00-E10 y pruebas en otro entorno; E11 conserva materiales preparados y actividades humanas pendientes; E12 conserva catalogo pendiente. Esos resultados no se borran ni se extrapolan al candidato actual.

Auditoria del 2026-11-05: Node v24.21.0, npm 11.19.0; proyecto fija Node 24.19.x/npm 12.2.x con `engine-strict`. Sin `node_modules` ni `.git`. Docker cliente/motor 29.8.2 disponible; SIGA no identificado entre los contenedores en ejecucion. `npm run check` fallo con codigo 127 en lint por `eslint: not found`; no ejecuto tipos, unitarias o build. Sintaxis de los 11 scripts MJS y lectura de cuatro manifiestos JSON correctas. Integracion, cobertura, E2E, carga y restauracion no ejecutadas en esta revision.

La huella de 119 archivos tecnicos y su algoritmo constan en la auditoria. PB-01 debe identificar el candidato final con commit si existe o manifiesto SHA-256 de fuentes/configuracion/lockfile; añadir version del esquema y artefactos. Cualquier cambio funcional posterior invalida las evidencias afectadas y exige repetir esas comprobaciones antes de firmar.

Estados permitidos:

| Estado           | Significado                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------- |
| HISTORICO        | Resultado registrado de otra version/entorno; referencia, no aprobacion vigente.              |
| ESTATICO         | Implementacion leida, sin prueba de su comportamiento en ejecucion.                           |
| PENDIENTE        | Falta trabajo o verificacion.                                                                 |
| BLOQUEADO        | Falta dependencia, decision o entorno identificado; registrar responsable y siguiente accion. |
| PASO / FALLO     | Comprobacion realmente ejecutada sobre candidato identificado.                                |
| ACEPTADO         | Responsable humano aprobo la evidencia y el criterio; no lo deduce el desarrollador.          |
| FUERA DE ALCANCE | Requisito expresamente excluido; conservar motivo/fuente, sin contarlo como aprobado.         |

Cada evidencia debe contener: ID de requisito/caso/hallazgo, candidato, fecha/zona, entorno/versiones, fixtures sinteticas, comando o pasos, esperado/observado, conteos de pasadas/fallidas/omitidas, artefactos, ejecutor y revisor. No almacenar contrasenas, tokens ni expedientes en capturas o logs.

## 4. Que significa 100 % funcional dentro de este alcance

### Puerta F: funcionalidad local verificada

Se abre exclusivamente cuando se cumplen todas las condiciones:

1. La matriz contiene el 100 % de requisitos incluidos RF-01 a RF-12, RN-01 a RN-07, RNF-01 a RNF-07 y recorridos locales acordados; no quedan requisitos obligatorios sin caso o evidencia vigente. Las partes productivas de RNF-01 quedan explicitamente separadas.
2. Un administrador crea desde cero dos programas/planes sinteticos completos acordados o sus catalogos autorizados, asignaturas, prerrequisitos, personas nuevas, periodo y grupos. Las personas creadas obtienen acceso mediante un procedimiento local probado; no dependen de cuentas especiales preexistentes.
3. Un estudiante ve toda la oferta pertinente y puede matricularse cuando corresponde; recibe motivos claros cuando no. Un docente asignado captura/corrige; el titular consulta historial, promedios y avance. Formularios y listados permiten alcanzar todos los registros de prueba, incluidos los que superan sus antiguas primeras paginas.
4. Ningun cambio de usuario reutiliza datos privados de la cuenta anterior; las sesiones expiran/se revocan correctamente y la API comprueba rol, propiedad y asignacion.
5. Calculos coinciden con ejemplos manuales aprobados. Matricula no excede cupo ni duplica asignatura/periodo al competir. Correcciones concurrentes no sobrescriben silenciosamente y fallar no borra borradores ajenos.
6. Constancias de ambos programas tienen contenido/identidad correctos, se descargan/verifican/revocan/reemiten y se recuperan de fallos e interrupciones sin perder trazabilidad ni duplicar reemplazos.
7. Reportes, exportaciones y bitacora reflejan datos completos/autorizados; cambios relevantes registran valores pertinentes, sin fabricar historia anterior.
8. Todos los hallazgos P1/P2 de auditoria estan corregidos y probados o, si eran hipotesis, descartados con evidencia. No queda defecto conocido que impida una tarea o incumpla un criterio incluido. Registrar regresiones nuevas con el mismo rigor.
9. Formato, lint, tipos, unitarias, build, migraciones aisladas, integracion, cobertura, E2E, concurrencia, recuperacion y rendimiento pasan los criterios de la seccion 8. Cero skips de casos criticos; ningun fallo oculto por reintentos o cambios de umbral posteriores.
10. Otra copia limpia puede instalarse y reproducir la demostracion. Respaldo/restauracion conserva registros, archivos y hashes y permite login/consulta/descarga.

Las optimizaciones P3 no son obligatorias si no hay problema medido y los criterios funcionales/rendimiento se cumplen. Diferirlas no permite diferir un defecto P1/P2. '100 % funcional' describe estos criterios y version; no promete ausencia absoluta de defectos futuros ni capacidad productiva.

### Puerta A: entrega academica concluida

Ademas de F: reglas/catalogo aprobados para la demo; trazabilidad y arquitectura/modelo TGS actualizados; manual tecnico, manuales por rol y explicacion sencilla; registros reales Scrum/XP; piloto y capacitacion ejecutados; representantes de cada rol acreditados, padron con estados y 100 % de usuarios piloto convocados que completan una modalidad, y acta final del profesor/cliente. Una participacion incompleta mantiene el cierre pendiente hasta cumplir o resolver expresamente el requisito con RA; no inventar asistentes.

Es posible registrar 'F verificada, A pendiente de aceptacion humana'. Solo declarar 'proyecto concluido para el alcance academico local' al abrir ambas puertas. No marcar una firma, participante o prueba futura como realizada.

### Medicion sin porcentajes enganosos

La matriz fija antes del cierre 26 filas tecnicas (12 RF, 7 RN y 7 RNF) y 5 entregables transversales, 31 filas en total. Funcionalidad verificada F = filas tecnicas con todos sus casos obligatorios PASO / 26 x 100, ademas de cumplir todas las condiciones de la Puerta F. Entrega academica A = filas aceptadas del conjunto completo / 31 x 100, ademas de sus condiciones de cierre. Los 5 entregables transversales se reportan aparte mientras F avanza. No usar promedio de modulos ni porcentaje de tareas como sustituto. No hay porcentaje actual calculado: falta evidencia vigente.

Una exclusion nueva de requisito obligatorio exige decision expresa y cambiaria el alcance; esta revision no la concede. Los pendientes obligatorios impiden F/A aunque se documenten como riesgos aceptados.

## 5. Decisiones y responsabilidades

Antes de ejecutar una historia, sustituir el rol por persona real en el registro de trabajo. A continuacion se asignan responsabilidades funcionales; no se inventan integrantes ni aprobaciones:

| Rol responsable                  | Obligacion                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsable tecnico (RT)         | Candidato, entorno, implementacion, recuperacion y paquete reproducible.                                                                    |
| Responsable frontend (FE)        | Flujos, estado/caches, formularios, paginacion y accesibilidad. Puede ser la misma persona que RT.                                          |
| Responsable de verificacion (QA) | Casos independientes, evidencia y regresion. Si no hay otra persona, declarar limitacion y solicitar revision academica para la aceptacion. |
| Responsable academico (RA)       | Reglas, catalogo, ejemplos, elegibilidad y umbrales de aceptacion. Profesor/cliente por identificar.                                        |
| Facilitador y participantes      | Piloto/capacitacion y resultados reales por rol.                                                                                            |

Registrar en `docs/DECISIONES.md` fecha, persona, fuente, estado y ejemplos de cada decision:

- Programas/planes requeridos y catalogo autorizado; resolver E12 y cualquier uso sintetico sin atribuir oficialidad.
- Escala/minima/precision/redondeo; recursamientos TODOS/ULTIMO/MEJOR; pendientes, canceladas y creditos unicos. Ratificar o sustituir D09-D13 para la demo, sin afirmar reglamento institucional aprobado.
- Semantica de bajas de programa/plan/asignatura/persona y efectos sobre nuevos grupos/matriculas; conservar historia.
- Zona horaria institucional/de demo, ventanas `[inicio, fin)`, captura de nota final y cierre de captura; parciales/cancelacion/carga/horarios mantienen alcance previo.
- Constancia: tipo ESTUDIOS, contenido, emisor, solicitante, elegibilidad, reemision y recuperacion. QR/hash no equivalen a firma avanzada ni validez oficial.
- Provision/restablecimiento local de acceso, responsable y entrega privada; no exigir correo como dependencia.
- Umbrales D15, conjunto de reglas cubiertas, dispositivos/navegadores de la demo, responsables del piloto y aceptacion.

Decision indispensable pendiente bloquea su historia, no todas las tareas independientes. No tratar silencio como aprobacion. Responsables nominales, capacidad y disponibilidad deben completarse en PB-01 antes de comprometer fechas.

**Decisiones recibidas el 2026-11-05:** el usuario acepto dos programas sinteticos rotulados para la demostracion (D41) y, de forma provisional, escala 0–10, minima 6, dos decimales y promedio ponderado con todos los intentos calificados (D42); constancia de estudios con al menos una nota final, incluyendo aprobadas y reprobadas (D43); y zona horaria de Ciudad de Mexico para las ventanas de inscripcion (D44). Esto permite avanzar con fixtures y ejemplos; no acredita politicas oficiales ni implica que las pantallas ya apliquen D44. Ver `docs/DECISIONES.md`.

**D45:** el usuario acepto como meta provisional 20 usuarios simultaneos, p95 menor de 2 segundos y menos de 1 % de errores inesperados por operacion evaluada para la demostracion local. Falta ejecutar y registrar la medicion.

## 6. Backlog reformulado con criterios verificables

Se conservan PB-01 a PB-24; PB-25 a PB-30 incorporan hallazgos y cierre. Todos estan PENDIENTES de cierre vigente salvo la auditoria/documentacion efectivamente realizada. 'Dependencia' es condicion de entrada; la evidencia previa puede reutilizarse solo si corresponde al mismo candidato y criterio.

Talla inicial orientativa: S pequena/acotada, M varios componentes, L incertidumbre o fallos/concurrencia. No son dias ni compromiso; descomponer L y estimar con capacidad real al cumplir Ready. P1/P2 obligatorias; P3 condicional; EXT externa.

| PB    | Prioridad / responsable / talla | Dependencia                                | Trabajo y criterio de salida                                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PB-01 | P1 RT+RA / M                    | Ninguna                                    | Reconciliar guia/backlog/estado, fijar requisitos y exclusiones existentes, candidato/hash, responsables nominales y matriz. Salida: inventario completo, decisiones externas con dueno y evidencia historica diferenciada. AUD-18.                                                                                                                 |
| PB-02 | P1 RT / M                       | PB-01                                      | Runtime compatible y `npm ci` desde lockfile; generar Prisma y preparar demo/test separadas, puertos/proyecto/volumen propios. Salida: instalacion limpia y checks base ejecutados, sin tocar otros servicios. AUD-01.                                                                                                                              |
| PB-03 | P1 RT+RA / L                    | PB-01/02 y decision curricular             | Completar catalogo transaccional autorizado o sintetico expresamente acordado, dos programas, creditos/periodos/seriacion, sin ciclos/autorreferencias/relaciones fuera del plan. Preservar versiones; resolver bajas padre/hijo. Salida: catalogos contrastados y operaciones probadas; E12 resuelto segun decision, no por mapa estatico. AUD-19. |
| PB-04 | P1 RT+FE / L                    | PB-02, decision de acceso                  | Alta/consulta/edicion/baja de personas, provision y restablecimiento local de cuentas arbitrarias, sesiones y reactivacion. Salida: persona nueva de cada rol completa login y tareas; baja/revocacion bloquea acceso y preserva historia, entrega de secreto privada. AUD-02.                                                                      |
| PB-05 | P1 RT+FE / M                    | PB-03/04/25 y oferta preparada             | Verificar programa/plan, periodo, ventana, estado, asignatura, docente, duplicados y cupo en UI/API; indicador de grupo solicitado. Salida: CP-03/04/05/08 con ultimo cupo y duplicidad entre grupos protegidos. AUD-12/AUD-19.                                                                                                                     |
| PB-06 | P1 RT+RA / M                    | PB-03/05, regla de intentos                | Prerrequisitos cero/uno/varios; aprobada/reprobada/pendiente/repetida. Revisar `EXIGIR_PRERREQUISITOS` para la demo. Salida: oferta y POST coinciden con RN-01 y no hay desactivacion accidental.                                                                                                                                                   |
| PB-07 | EXT RA / S                      | PB-01                                      | Ratificar que cancelacion de autoservicio, limites de carga y horarios permanecen fuera si no se exigen. Salida: decision registrada; no implementar opcionales por defecto ni excluir funciones ya incluidas.                                                                                                                                      |
| PB-08 | P1 RT+FE / M                    | PB-04/05/27 y reglas aprobadas             | Captura/correccion por docente asignado, limites/precision/cero/version/motivo; nota y auditoria atomicas. Salida: CP-06/07 y dos correcciones concurrentes sin perdida/sobrescritura.                                                                                                                                                              |
| PB-09 | P1 RT+RA / M                    | PB-08 y ejemplos aprobados                 | Formulas por periodo/general, ponderacion, recursamientos, pendientes/canceladas, redondeo y avance por creditos unicos; privacidad. Salida: CP-09/10/11 con resultados manuales exactos, plan vacio tratado y cero valido.                                                                                                                         |
| PB-10 | EXT RA / S                      | PB-01                                      | Confirmar nota final directa y decision sobre cierre de captura. Salida: alcance de evaluacion sin parciales/ponderaciones inventadas.                                                                                                                                                                                                              |
| PB-11 | P1 RT+FE+RA / M                 | PB-09, decision de constancia              | Corregir identidad fija ICO-F19, emisor y contenido para dos programas; ajustar textos largos y verificar caracteres admitidos/multipagina. Salida: PDFs legibles/coherentes, QR/verificador coinciden y se informa alcance ficticio. AUD-13/AUD-14.                                                                                                |
| PB-12 | P1 RT / L                       | PB-02/11, diseno de recuperacion           | Recuperar reemision FALLIDA y PENDIENTE respetando unicidad/trigger/historia; conciliar temporales/archivos/BD y reintentos tras timeout/interrupcion. Usar migracion nueva solo si necesaria. Salida: fallos inyectados, reinicio y concurrencia recuperables, un reemplazo valido y auditoria. AUD-04/AUD-05.                                     |
| PB-13 | P2 RT / M                       | PB-02                                      | Revisar cookies para HTTP local, proxy real, cabeceras Nginx y presupuestos de tiempo del recorrido PDF. Salida: configuracion local y respuestas efectivas verificadas sin activar publicacion. AUD-05/AUD-15/16.                                                                                                                                  |
| PB-14 | P1 RT+QA / M                    | PB-04/25; repetir tras cambios de permisos | Matriz rol/recurso para API, sesion ausente/vencida/revocada, CSRF/origen y baja; estudiante/docente ajenos y administracion sin permiso de calificar. Salida: rechazos y caminos autorizados comprobados sin depender de ocultar botones; limitador en instancia real.                                                                             |
| PB-15 | P2 RT+QA / S                    | PB-01; transversal                         | Fixtures/capturas ficticias, minimizacion en verificador, secretos/logs y acceso a PDF/CSV. Salida: revision del paquete y registros sin secretos; sin datos reales ni correo accidental.                                                                                                                                                           |
| PB-16 | P2 FE+QA / M                    | Pantallas estables; empezar en cada flujo  | Semantica de pestanas o controles simples, etiquetas/foco/teclado, errores, carga/vacios y responsive. Salida: tareas de los tres roles en 360/1366 px y zoom comprobadas en navegador, sin bloqueos ni perdida de acciones. AUD-11.                                                                                                                |
| PB-17 | P1 QA+participantes / M         | Puerta F candidata y manuales              | Piloto con persona ajena sin guiar tareas; registrar problemas, corregir bloqueos y repetir. Salida: pasos/resultados reales, por lo menos representante de cada rol evaluado; no basta formato vacio.                                                                                                                                              |
| PB-18 | P1 QA+RT / L                    | PB-02 y cada correccion lista              | Ejecutar bateria completa de seccion 8; cobertura con denominador y umbral aplicado, incluyendo reglas puras. Salida: candidato vigente sin fallos ni omisiones criticas, informes y regresiones AUD ligadas. AUD-08/AUD-09.                                                                                                                        |
| PB-19 | P1 QA+RT / M                    | PB-02/04; necesario antes de aprobar E2E   | Fixtures reproducibles para tres roles y dos titulares sin archivos personales, corregir expectativas antiguas y hacer fallar prerequisitos criticos ausentes. Salida: E2E local equivalente a CI sin skips criticos; workflow remoto y enlace solo cuando haya repo autorizado. AUD-08/AUD-09.                                                     |
| PB-20 | P1 QA+RT+RA / M                 | PB-05/09/12 y D15 acordada                 | Ampliar carga a oferta/matricula/PDF ademas del reporte; medir por operacion, usuarios diferentes, datos aislados y parametros reales. Salida: umbrales seccion 8 cumplidos o defecto abierto; no extrapolar produccion. AUD-10; decidir PB-29 con mediciones.                                                                                      |
| PB-21 | P1 RT+QA / M                    | PB-12/18 y candidato estable               | Respaldar BD/PDF y restaurar en copia aislada; comparar conteos/hashes/descarga y accesos. Salida: CP-15 reproducido y procedimiento local de recuperacion con responsables/frecuencia/objetivos acordados, sin borrar datos originales.                                                                                                            |
| PB-22 | FUERA RT+RA                     | Ampliacion expresa futura                  | Publicacion remota y operacion institucional. No ejecutar ni contar como pendiente del 100 % local; conservar requisitos productivos en `docs/publicacion-web.md`.                                                                                                                                                                                  |
| PB-23 | P1 RT+FE+QA / M                 | Cada incremento y candidato final          | Sincronizar README/backlog/estado/decisiones/trazabilidad/arquitectura/modelo/manuales; actualizar documento sencillo separado y demostracion/problemas conocidos. Corregir entregable academico final/conclusiones solo con resultados reales. Salida: tercero instala y entiende sistema con documentos de esa version.                           |
| PB-24 | P1 equipo+RA / M                | Desde el primer incremento                 | Scrum real, TDD rojo/verde/regresion en reglas/defectos y parejas con participantes reales cuando haya equipo. Salida: planning/daily/review/retro, feedback y evidencia contemporanea; cualquier requisito metodologico no realizable requiere resolucion academica, no simulacion.                                                                |
| PB-25 | P1 FE+RT / M                    | PB-02/04                                   | Aislar cache por usuario, cancelar/retirar consultas privadas al cerrar/cambiar/expirar sesion, manejar respuestas tardias/401. Salida: secuencia A->B mismo rol/navegador y red lenta sin datos cruzados. AUD-03.                                                                                                                                  |
| PB-26 | P1 FE+RT / L                    | PB-02/03; coordinar PB-04/05               | Paginacion/busqueda completa en reportes/constancias/bitacora, selectores, oferta, historial, grupos docentes y cuentas. Actualizar contratos y clientes. Salida: registros >50/>100/>200 alcanzables, seleccion estable, total/vacios/orden correctos. AUD-06.                                                                                     |
| PB-27 | P1 FE / M                       | PB-02 y fixture docente                    | Conservar borradores/motivos tras errores y conflictos, identificar fila activa y prevenir perdida al navegar. Salida: falla una fila sin borrar otra, recuperacion entendible y sin sobreescritura silenciosa. AUD-07/AUD-12.                                                                                                                      |
| PB-28 | P1 RT+FE+QA / M                 | PB-03/04 y reporte disponible              | Completar RF-11/12: reportes/listas/CSV coherentes, permisos y cambios de catalogos con antes/despues pertinente atomico. Salida: CP-13/E2E con lectura de auditoria real; historia previa no reconstruida artificialmente. AUD-17.                                                                                                                 |
| PB-29 | P3 RT+FE / S-M                  | PB-20 y mediciones                         | Optimizar solo cuellos observados: lecturas/agregados repetidos, consultas web innecesarias, copia por lotes; planes SQL/indices solo si hay evidencia. Salida: comparacion antes/despues, contratos intactos, o diferimiento motivado sin incumplir rendimiento. AUD-20/AUD-21.                                                                    |
| PB-30 | P1 RA+QA+RT / M                 | PB-17/18/20/21/23/24 y todas obligatorias  | Capacitacion real, evaluacion >=80/100 y 100 % tareas criticas por rol; padrón/registro y recuperacion de no acreditados. Salida: acta del candidato con F/A, evidencia y firma real, paquete final verificado.                                                                                                                                     |

No se ejecutan PB-22 ni opcionales por aparecer en esta tabla. Ninguna fila pendiente se convierte en aprobada por haber sido planificada.

## 7. Secuencia, dependencias y Scrum

Camino principal: PB-01 -> PB-02 -> acceso/cache y catalogo/oferta -> matricula/prerrequisitos -> calificaciones/progreso -> constancias/recuperacion -> regresion/rendimiento/restauracion -> piloto/capacitacion/aceptacion.

PB-19 empieza al preparar el entorno, antes de confiar en pruebas E2E. PB-26 y PB-28 acompanan catalogos/reportes. Seguridad, accesibilidad, documentacion y TDD forman parte de cada incremento; no se posponen integramente al ultimo sprint. Se pueden avanzar decisiones/manuales/revision mientras un entorno esta bloqueado, sin simular resultados.

Se mantiene como hipotesis seis sprints de dos semanas, sujetos a capacidad/decisiones; no equivale a promesa de doce semanas. El primer planning confirma integrantes, horas disponibles, tallas y dependencias; no crear un calendario ficticio. Si no cabe todo, replanificar plazo/capacidad conservando requisitos incluidos.

| Sprint | Incremento demostrable y puerta parcial                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0      | PB-01/02/19 inicial; decisiones, responsables, matriz, fixtures y entorno limpio; pruebas base ejecutables.                         |
| 1      | Catalogos/personas/oferta, acceso operativo y cache aislada; paginacion/selectores y auditoria iniciales; dos programas preparados. |
| 2      | Matricula/prerrequisitos completos, permisos/concurrencia y acceso a todas las paginas pertinentes.                                 |
| 3      | Notas/correcciones/borradores, calculos/progreso con ejemplos y reportes/CSV/bitacora.                                              |
| 4      | Constancias correctas de varios programas, recuperacion/reemision y configuracion/UX pendientes.                                    |
| 5      | Regresion sin skips, cobertura, carga, restauracion, manuales, piloto, capacitacion y acta; F/A solo con evidencia.                 |

Cada sprint: objetivo y backlog Ready, planning segun capacidad, daily real de hasta 15 minutos o registro honesto de coordinacion, review del incremento y retrospectiva con accion. Las fechas del curso contenidas en el PDF son historicas; no presentarlas como sesiones ejecutadas. Si falta equipo para parejas o revisor independiente, registrar el bloqueo y resolver con RA el modo de cumplir el requisito.

### 7.1 Ejecucion con subagentes especializados

**Directriz del usuario:** realizar con subagentes especializados todo el trabajo del alcance que pueda delegarse de forma util, con contexto suficiente y resultados verificables. El agente principal debe evaluar la delegacion al iniciar cada PB y usarla para frentes independientes, implementacion acotada, pruebas, revision y documentacion. Mantener una tarea en el agente principal cuando dividirla introduzca mas coordinacion que beneficio, requiera una decision central o no permita aislar cambios; registrar brevemente el motivo. No se limita la delegacion a investigacion: incluye implementacion y verificacion cuando las herramientas lo permitan.

El agente principal conserva la responsabilidad de priorizar, respetar dependencias, fijar contratos, asignar archivos, integrar cambios, resolver conflictos y comprobar el resultado conjunto. La especializacion indica el encargo y los criterios del subagente; no implica capacidades infalibles ni sustituye evidencia.

| Especialidad                               | Trabajo delegable                                                                                                 | PB de referencia            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Backend y reglas academicas                | Servicios, validaciones, acceso operativo, transacciones y calculos; reproducciones y cambios minimos             | PB-03/04/05/06/08/09/28     |
| Frontend y accesibilidad                   | Cache por identidad, formularios/borradores, paginacion, feedback, teclado y responsive                           | PB-16/25/26/27              |
| Persistencia y recuperacion de constancias | Restricciones, nuevas migraciones si necesarias, estados/reintentos, PDF multiprograma y consistencia BD/archivos | PB-11/12/21                 |
| Verificacion y revision de seguridad       | Casos independientes, permisos por recurso, fixtures, cobertura, E2E y revision de regresiones                    | PB-14/15/18/19              |
| Entorno y rendimiento                      | Runtime reproducible, herramientas locales, proxy/cabeceras, carga y optimizaciones medidas                       | PB-02/13/20/29              |
| Documentacion y trazabilidad               | Manuales tecnicos y sencillos, matriz, evidencia TGS, coherencia del paquete y preparacion de ejercicios          | PB-01/23; apoyo PB-17/24/30 |

No es necesario mantener un agente permanente por especialidad. Reutilizar especialistas o abrirlos por tarea segun las herramientas, el contexto y el limite simultaneo disponible, contando al coordinador. Trabajar por tandas cuando no haya plazas; no prometer ejecutar todos los perfiles a la vez. Si no hay herramienta de subagentes, registrar la limitacion y avanzar secuencialmente con el mismo backlog y criterios.

**Procedimiento de delegacion e integracion:**

1. El coordinador selecciona tareas Ready sin dependencia pendiente y prepara cada encargo: objetivo PB/AUD/RF/CP, contexto y decisiones vigentes, archivos permitidos, contratos que debe conservar, limites de efectos, criterios de aceptacion y pruebas requeridas. Cada subagente aplica `pragmatic-clean-code` y las skills pertinentes; los cambios documentales incluyen explicacion sencilla separada.
2. Asignar un unico responsable de escritura por archivo o conjunto estrechamente relacionado. Los agentes comparten espacio de trabajo: evitar ediciones simultaneas del mismo archivo. Acordar primero cambios en contratos compartidos, esquema/migraciones, configuracion raiz y datos/fixtures compartidos; serializar esas modificaciones y la integracion cuando haya dependencia. No asumir que una rama aislada evita por si sola conflictos de datos o puertos.
3. Ejecutar en paralelo solo trabajo independiente y con recursos separados. Ejemplo: frontend de borradores PB-27, backend de auditoria PB-28 y revision de pruebas PB-19 pueden avanzar juntos si no pisan archivos ni fixtures; la emision y su migracion se coordinan como un mismo cambio coherente. Mientras tanto el coordinador atiende decisiones, integracion u otro trabajo util.
4. Cada especialista entrega archivos modificados, resumen del comportamiento, contratos afectados, pruebas/comandos ejecutados y resultados observados, casos limite, riesgos y pendientes. Si no pudo probar, debe indicarlo. Ningun subagente puede ampliar alcance, aprobar politicas, publicar, modificar datos ajenos o fabricar resultados por iniciativa propia.
5. El coordinador revisa el cambio real y la evidencia; en reglas, permisos, concurrencia y recuperacion, encarga revision a otro subagente cuando sea viable. La revision automatizada adicional no equivale a aceptacion humana ni acredita por si sola el requisito academico de parejas o revisor externo.
6. Integrar incrementos pequenos, comprobar contratos compartidos y ejecutar regresion del conjunto sobre el candidato integrado. Los resultados aislados de cada agente no sustituyen esta comprobacion. Corregir fallos y repetir comprobaciones afectadas antes de marcar Done o abrir F/A.
7. Registrar en ESTADO/trazabilidad o evidencia del PB: encargo, identificador/especialidad del subagente, archivos asignados, resultado, revision e integracion; o razon de ejecucion secuencial. La coordinacion y las herramientas deben dejar evidencia real, sin inventar participantes, pruebas o ahorro de tiempo.

Esta directriz organiza la ejecucion del trabajo ya incluido. No agrega funciones, no relaja umbrales y no autoriza a sustituir decisiones, piloto, capacitacion o firma del profesor/cliente por respuestas de agentes.

## 8. Estrategia y umbrales de verificacion

### Entorno y comandos

Inspeccionar scripts antes de ejecutarlos, usar copia/BD/puertos propios, no compartir fixtures entre corridas y preservar servicios ajenos. Secuencia de referencia despues de preparar runtime y variables locales seguras:

1. `npm ci` y `npm run db:generate`; comprobar destino de demo/test y migraciones antes de aplicarlas.
2. `npm run format:check` y `npm run check` (lint, tipos, unitarias y build). Criterio: codigo de salida 0, cero errores de tipos/lint y todas las unitarias pasan.
3. Migraciones desde cero en base/esquema de prueba aislado, restricciones verificadas y migracion incremental desde copia del esquema previo si hubo nueva migracion; sin resets de la demo.
4. `npm run test:integration`; cada regla/permiso/fallo critico con BD real. No reutilizar el conteo historico como objetivo de cantidad.
5. `npm run test:coverage` despues de corregir su alcance y enforcement: >=70 % lineas y ramas en cada archivo del inventario de reglas de negocio, con reglas puras y servicios relevantes. Recoger unitarias e integracion sin omitir archivos no ejecutados; reporte y fallo automatico bajo umbral. No hacer promedio simple de porcentajes ni tests espejo.
6. `npm run test:e2e`: con fixtures locales aisladas de tres roles y dos titulares, en escritorio 1366 y movil 360. Cero casos criticos omitidos; registrar browser/version. Las pruebas UI con mocks se etiquetan aparte y no sustituyen API/BD real.
7. `npm run test:load` tras ampliar PB-20. D15 inicial de la guia: 1000 estudiantes ficticios/50 grupos, 20 usuarios concurrentes, 1 minuto de calentamiento y 5 medidos, p95 <2 s y errores inesperados <1 % por operacion comun. Separar reporte/oferta/matricula/PDF, concurrencia de usuarios/solicitudes y rechazos previstos; aprobar metas antes de medir. Parametros y destino aislados, nada de afectar la demo para cargar.
8. `npm run docker:backup` y `npm run docker:restore:verify` solo sobre el proyecto SIGA local preparado y despues de revisar el efecto de pausa de API. Restaurar en copia aislada, comparar datos/archivos/hashes y probar login/consulta/descarga; registrar tiempos y objetivos de recuperacion acordados.

Si una herramienta o decision falta, registrar BLOQUEADO y avanzar en lo independiente. No degradar umbrales ni eliminar casos criticos para conseguir verde. Una instalacion incompatible requiere resolver compatibilidad, no cambiar versiones al azar.

### Casos obligatorios de reglas, integracion y recuperacion

- CP-01/02: sesion valida/invalida/vencida/revocada, altas nuevas, provision/reset, bajas, reactivacion, unicidad y preservacion de historia; matriz de roles/recursos y CSRF.
- CP-03/04/05/08: ventana `[inicio, fin)`, plan/asignatura/docente activos segun decision, plan ajeno, ultima plaza simultanea, duplicidad en el mismo y distintos grupos de la asignatura/periodo. Dos solicitudes concurrentes al ultimo cupo: exactamente una confirmada; ocupacion final correcta y auditoria coherente.
- CP-06/07: cero, escala minima/maxima, precision invalida, nota nula/pendiente, docente ajeno, motivo y version. Dos correcciones a la misma version: como maximo una confirmada, otra con conflicto y version final/auditoria correctas; drafts preservados.
- CP-09/10/11: ejemplo 8x6 y 9x4 = 8.40; avance 10/30 = 33.33 %; pendiente no altera; cero si participa; reprobadas, canceladas, repetidas y TODOS/ULTIMO/MEJOR segun politica; creditos unicos, plan vacio/sin notas sin division por cero. Calcular esperado fuera del codigo bajo prueba y aprobarlo.
- CP-12: constancia sin notas rechazada; dos programas, nombre/plan largo, caracteres admitidos y varias paginas; propiedad/hash/archivo ausente/alterado; vigente/revocado/inexistente; correccion no muta PDF anterior; reemision fallida, pendientes, interrupciones y recuperacion concurrente; una solicitud recuperada no crea documentos repetidos.
- CP-13: lista y CSV con datos de BD, escape correcto/proteccion de formulas, permisos docente/administrador, valores antes/despues en bitacora; paginas finales sin truncamiento.
- CP-14: teclado y foco en los flujos privados, etiquetas/errores vinculados, movil/escritorio/zoom, cargas/vacios/desconexion y confirmacion de resultados; revisar renderizado. Medir rendimiento con metodo PB-20, no inferirlo de capturas.
- CP-15: instalacion limpia, migraciones, respaldo/restauracion, conteos/hashes y recuperacion del servicio/documentos.
- CP-16: cambio A->B en mismo navegador/rol, expiracion/401/respuesta tardia; cero datos cruzados de cache.
- CP-17: todos los listados/selectores y ofertas con conjuntos que exceden 50/100/200 donde corresponda, ultima pagina/busqueda/seleccion persistente.
- CP-18: borradores de dos alumnos, error en uno, conflicto, reintento, cambio de grupo/pagina y feedback por fila sin perder trabajo.

CP-01 a CP-15 conservan sus referencias historicas y aqui se amplian para el cierre; CP-16 a CP-18 son regresiones nuevas. Cada PB/AUD puede tener varios casos y subcasos; marcar un CP PASO exige cumplir todos sus subcriterios obligatorios.

### Recorrido E2E final integrado

1. Preparar copia limpia, candidato y administrador mediante procedimiento reproducible; crear dos programas/planes completos de demo, asignaturas/prerrequisitos, personas nuevas, periodo y grupos/docentes/cupos.
2. Provisionar accesos de personas creadas, login de estudiante A, oferta y matricula; segundo estudiante demuestra rechazo por prerrequisito/cupo; comprobar tambien duplicidad.
3. Docente asignado captura y corrige con motivo; docente ajeno no puede; una falla conserva drafts de otras filas.
4. Titular consulta historial, 8.40 y 33.33 % en fixture de referencia, creditos y politica; otro titular no accede y cambio de cuenta no muestra cache anterior.
5. Emitir, descargar y verificar constancia; contenido y metadatos corresponden al programa real. Repetir con segundo programa, revocar y reemitir; inyectar fallo y demostrar recuperacion.
6. Administrador consulta listas, CSV y antes/despues de cambios; acceder a datos posteriores a la primera pagina; docente exporta solo sus grupos.
7. Baja/revocacion bloquea acceso sin perder historia; recuperar desde respaldo en copia aislada y repetir login/consulta/descarga.
8. Ejecutar tareas criticas por teclado y en movil/escritorio. Guardar evidencia del candidato sin secretos.

No basta visitar pantallas, verificar encabezados o llamar health. Cada paso verifica efecto en BD y resultado observable segun corresponda.

## 9. Arquitectura, TGS y calidad del codigo

Mantener web -> API -> PostgreSQL y almacenamiento de PDF, con contratos compartidos. Documentar en arquitectura/modelo: entradas, procesos, salidas y retroalimentacion de estudiantes, docentes, catalogos/oferta, matriculas, calificaciones/progreso y transversales de acceso/auditoria/certificados.

Ejemplo TGS obligatorio: una nota aprobada alimenta historial/avance, satisface prerrequisitos y entra a una constancia; corregirla conserva auditoria y no altera PDFs ya emitidos. Mostrar IDs y relaciones con fixture sintetica de extremo a extremo.

Aplicar pragmatic-clean-code: cambio minimo, contratos preservados, validacion en servidor, errores especificos, recursos cerrados y autoverificacion posterior. TDD sobre reproduccion/regla real y regresion; no fragmentar por numero de lineas ni crear capas genericas sin necesidad.

Optimizacion PB-29: primero medir, luego cambiar y comparar con el mismo conjunto. Evitar consultas web innecesarias y repeticion de lecturas/agregados si afectan resultados/tiempos. Eliminar limites ciegamente, aumentar pool o agregar infraestructura no son mejoras demostradas. No cambiar el stack ni redisenar toda la UI.

## 10. Ready, Done y gestion de bloqueos

**Ready:** historia y rol claros, responsable nominal, reglas/decision indispensables, subcriterios positivos/negativos/limite, datos sinteticos, dependencias, riesgo, talla revisada y comando/procedimiento de verificacion. Falta una decision esencial: BLOQUEADO con dueno, siguiente accion y fecha de seguimiento.

**Done de historia:** comportamiento implementado, contratos y permisos comprobados, errores/recursos/autoverificacion revisados, pruebas pertinentes realmente PASO, regresion incluida cuando corresponde, evidencia versionada, matriz/estado/manuales actualizados y review registrada. Un hallazgo no se cierra con solo editar codigo o redactar una prueba.

**Cierre final:** todas las historias obligatorias Done, P1/P2 sin pendientes, F/A verificadas. Defectos nuevos se registran con severidad, requisito, reproduccion segura, responsable y verificacion. Descartar hipotesis requiere evidencia; diferir P3 requiere motivo. No fabricar registros retrospectivos de TDD/parejas/Scrum ni aprobaciones de reglas.

Riesgos externos: fuente curricular, decisiones de politica, participantes/revisor y aceptacion. Investigar alternativas dentro del alcance y avanzar en trabajo independiente; no afirmar terminado mientras siga bloqueado un requisito incluido.

## 11. Paquete final y acta

Entregar version/candidato con manifiesto, codigo/configuracion/lockfile sin secretos, instrucciones probadas, preparacion de datos ficticios, matriz completa y evidencias actuales, pruebas/coverage/E2E/carga/recuperacion, arquitectura/modelo/TGS, reglas/catalogos aprobados para demo, manual tecnico/por rol y explicacion sencilla, registros metodologicos reales, piloto/capacitacion y resultados.

Acta minima en `docs/evidencias/CIERRE_LOCAL.md` al realizar la aceptacion: alcance/version/fecha, responsables reales, checklist F/A, conteos de casos pasados/fallidos/omitidos, enlaces a evidencia, porcentaje calculado segun seccion 4, resultado por rol (>=80/100 y 100 % tareas criticas), lista de P1/P2 vacia o hipotesis descartadas justificadas, P3 diferidas y firma/aceptacion del receptor. No crear acta firmada ni asignar fechas de sesiones futuras como reales.

Formula autorizada SOLO cuando hay evidencia: 'SIGA [candidato] cumple el 100 % de los requisitos incluidos de la entrega academica local acordada, con datos ficticios, pruebas [referencia] y aceptacion [acta]'. Esa formula no acredita produccion, firma oficial ni expedientes reales.

## 12. Continuidad tras esta reformulacion

Realizado: auditoria estatica backend/frontend/configuracion/pruebas, comprobacion de entorno y sintaxis, plan reformulado, matriz inicial y documento para principiantes. No se implementaron fixes ni se alcanzaron F/A.

Siguiente ejecucion: PB-01 para responsables/decisiones/candidato y PB-02 para entorno; iniciar fixtures PB-19 y correcciones de acceso/cache PB-04/25. Incorporar los demas hallazgos segun dependencias y aplicar la delegacion especializada de la seccion 7.1 desde cada PB. Actualizar `docs/ESTADO.md` tras cada resultado efectivo. Los historicos E00-E10 siguen como antecedentes y no se convierten automaticamente en aprobacion del nuevo cierre.
