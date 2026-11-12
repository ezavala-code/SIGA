# Backlog y trazabilidad

## Cierre vigente del alcance local (2026-11-09)

El [plan maestro reformulado](../PLAN_MAESTRO_ENTREGA.md) y el [plan restante de cierre](../PLAN_RESTANTE_CIERRE_MAESTRO.md) (`R-01` a `R-18`, cubriendo `PB-01` a `PB-30`) se ejecutaron y verificaron sobre el **candidato final congelado** (`a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`). La [matriz de entrega](TRAZABILIDAD_ENTREGA.md) y el [dossier de cierre](evidencias/CIERRE_LOCAL.md) concentran toda la evidencia vigente:

- **Puerta F (Funcionalidad técnica local verificada): 26/26 filas técnicas en `PASO` (`100 %` verificadas sobre el candidato final)**, con `npm run format:check`, `npm run check` (`37` unitarias API + `40` unitarias Web), `npm run test:coverage` (`16` suites / `131` pruebas, `94,94 %` líneas y `82,49 %` ramas globales, 14 archivos `>= 70 %`), `npm run test:e2e -- --workers=1` (`34/34` pruebas en escritorio y móvil, `0` skips), carga larga de 5 minutos en las 5 operaciones incluyendo PDF Unicode (`p95 = 670,84 ms`, `0 %` errores), proxy Nginx `1.30.5`, instalación desde copia limpia y simulacro de recuperación operativa tras pérdida total (`RTO = 9,47 s`, `RPO = 1,18 s`).
- **Puerta A (Aceptación académica y cierre humano): 28/31 filas verificadas técnicamente (`26` técnicas + `ENT-TGS` + `ENT-DOC`); `3/31` filas transversales (`ENT-SCRUM`, `ENT-XP`, `ENT-ACE`) y `0/31` firmas humanas en `A` pendientes** de que participantes humanos reales ejecuten el piloto/capacitación y el Responsable Académico (`RA`) firme el acta en [`docs/evidencias/CIERRE_LOCAL.md`](evidencias/CIERRE_LOCAL.md). E12 oficial y E13 (publicación remota) permanecen fuera del alcance de demostración local.

## Backlog y trazabilidad historicos

Las afirmaciones y conteos siguientes se conservan como antecedentes y no sustituyen las evidencias vigentes exigidas por el plan.

E00–E09 están completas y verificadas en PostgreSQL nativo y Docker; E10 está completada y verificada en Docker local. E11 tiene manuales, plan, ejercicios, evaluación y formatos de entrega preparados; piloto y capacitación con participantes siguen pendientes. CP-14 (accesibilidad, escritorio/móvil y carga) y CP-15 (instalación limpia, respaldo/restauración y comparación de datos/archivos) están verificados. Estado real y evidencia: `ESTADO.md` y `docs/evidencias/`.

| Etapa | Entregable y criterio de salida                                                 | Dependencia                   | Estado inicial de sesión                                              |
| ----- | ------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| E00   | Inventario, glosario, decisiones, modelo, versiones y trazabilidad              | —                             | Verificada                                                            |
| E01   | Web/API/BD conectadas, configuración validada, instalación, checks, Docker y CI | E00                           | Base nativa y Docker verificados; CI remoto pendiente                 |
| E02   | Prisma, migraciones, restricciones y fixtures aislados para integración         | E01                           | Implementada y verificada en PostgreSQL nativo                        |
| E03   | Sesión revocable, roles, acceso por recurso, login/logout                       | E02                           | Verificada en integración y navegador nativo/Docker                   |
| E04   | Personas, programas, planes, asignaturas, bajas y prerrequisitos sin ciclos     | E03                           | E04-A y E04-B verificadas                                             |
| E05   | Periodos, grupos, ventanas y cupos                                              | E04                           | Completada y verificada                                               |
| E06   | Matrícula atómica sin sobrecupo ni duplicidad                                   | E05                           | Completada y verificada                                               |
| E07   | Captura autorizada, historial, promedios y avance                               | E06                           | Completada y verificada                                               |
| E08   | PDF/QR, verificación, revocación, reportes y auditoría                          | E07                           | Completa y verificada en Docker                                       |
| E09   | Regresión, seguridad, concurrencia, carga y aceptación                          | E03–E08                       | Completada; CP-14 verificado                                          |
| E10   | Despliegue de versión y recuperación verificadas                                | E09                           | Completada localmente; CP-15 verificado                               |
| E11   | Manuales, ejercicios, evaluación y entrega                                      | E10                           | Materiales preparados; piloto y sesiones pendientes                   |
| E12   | Catálogo transaccional completo del plan ICO-F19 y seriación institucional      | E04, fuente oficial detallada | Pendiente; actualmente solo están cargados sus metadatos              |
| E13   | Publicación y operación inicial en servidor y dominio autorizados               | E10–E12, infraestructura      | Pendiente; requiere alojamiento, dominio y decisiones institucionales |

E12 requiere registrar claves oficiales, créditos por unidad, periodo sugerido, carácter obligatorio/optativo y seriación de ICO-F19 en `Programa`, `PlanEstudio`, `Asignatura` y `PlanAsignatura`. La vista curricular ICO-F19 ahora vive dentro de la trayectoria del estudiante y no representa otros planes; el catálogo de matrícula no debe inferir datos faltantes ni convertir la captura personal de avance en registros globales.

E13 requiere acceso al servidor y dominio, DNS y TLS funcionales, provisión de usuarios finales, reglas de privacidad/retención autorizadas, bootstrap del administrador, restauración ensayada y verificaciones de login y salud desde el dominio. No se marca completo hasta probarlo en el destino real.

## Asignación de requisitos

| Requisito           | Destino                                  | Evidencia de aceptación futura                                             |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| RF-01               | E03                                      | CP-01 sesión válida, inválida y revocada                                   |
| RF-02, RF-03, RF-04 | E04                                      | CP-02, duplicados y ciclos                                                 |
| RF-05               | E05                                      | CP-08 y validación de cupo                                                 |
| RF-06               | E06                                      | CP-03/04/05/08                                                             |
| RF-07, RF-08, RF-09 | E07                                      | CP-06/07/09/10/11                                                          |
| RF-10               | E08                                      | CP-12 PDF, QR, propiedad, hash y revocación                                |
| RF-11, RF-12        | E08; auditoría transversal desde E03     | CP-13 reportes y cambios                                                   |
| RF-13               | Posterior a Must, opcional               | Correo fallido no revierte matrícula                                       |
| RN-01, RN-02, RN-03 | E06                                      | Prerrequisitos, concurrencia, unicidad entre grupos                        |
| RN-04, RN-05, RN-06 | E07                                      | Docente correcto, límites, promedio ponderado                              |
| RN-07               | E08                                      | Solo notas finales e identificador único                                   |
| RNF-01              | E01 base; E03 y E09 completo             | Configuración segura, autenticación y pruebas por recurso                  |
| RNF-02              | E01 portada; E04–E09 todas las pantallas | Móvil, escritorio, teclado y mensajes                                      |
| RNF-03              | E09                                      | Carga propuesta D15, tiempos medidos                                       |
| RNF-04              | E02/E06/E10                              | Transacciones, restricciones y restauración                                |
| RNF-05              | Todas; E09 cobertura de reglas           | Cobertura global API >70 % líneas y ramas; brechas por módulo documentadas |
| RNF-06              | E01 y E10                                | Instalación limpia y Docker reproducible                                   |
| RNF-07              | Todas                                    | Solo datos ficticios; nueva revisión antes de uso real                     |

## Historias E02 completadas

- E02-A: usuario/sesión/personas/programa/plan y política versionada; migraciones y restricciones.
- E02-B: oferta/inscripción, unicidad compuesta y pruebas grupo/periodo/asignatura/plan.
- E02-C: certificados/auditoría, semillas ficticias repetibles y 34 pruebas de datos con rollback.

## Historias E03 completadas

- E03-A: cuentas ficticias activadas explícitamente, hash bcrypt, login/logout y sesión revocable en base.
- E03-B: autorización API por rol y propietario, CSRF/origen, límite de intentos y pruebas de integración.
- E03-C: pantalla de acceso y perfiles protegidos, 10 E2E nativas y 10 en Docker.

E05 (periodos, grupos, ventanas y cupos), E06 (matrícula transaccional), E07 (calificaciones y avance), E08 (constancias, reportes y auditoría), E09 (regresión, seguridad, carga y accesibilidad) y E10 (despliegue y recuperación local) están implementadas y verificadas. En E11 se prepararon los materiales documentales; falta el piloto con otra persona, las sesiones y registrar los resultados reales. CI remoto y hosting público siguen pendientes.

## Historia E04-A completada

- Programas y asignaturas: creación, consulta con búsqueda/paginación, edición de nombre y baja lógica; claves normalizadas y duplicados rechazados.
- Planes: lista/detalle, composición por asignatura, créditos y semestre; prerrequisitos del mismo plan sin autorrelación ni ciclos.
- Historial: revisión optimista del contenido; planes con personas/oferta/inscripciones bloquean cambios. Nueva versión copia el contenido y el grafo, dejando el origen intacto.
- Interfaz de administración protegida por rol. Evidencia: `docs/evidencias/e04-a-verificacion.md`.

## Historia E04-B completada

- Estudiantes: alta/listado paginado con búsqueda, edición de datos/estado y baja lógica; matrícula y correo únicos, normalizados y validados.
- Docentes: alta/listado paginado con búsqueda, edición de datos y baja lógica; número de empleado y correo únicos y normalizados.
- Seguridad e historial: las altas crean cuentas de rol inactivas sin contraseña legible ni filtrada; las bajas revocan sesiones. Reactivar el estado académico no habilita el inicio de sesión. El cambio de plan del estudiante se bloquea si hay inscripciones o certificados; los grupos del docente se conservan.
- API restringida al rol ADMINISTRADOR, con CSRF/origen globales y auditoría transaccional. Evidencia: `docs/evidencias/e04-b-verificacion.md`.

CP-01 quedó comprobado en E03; CP-02 de E04; CP-03/04/05/08 de matrícula; CP-06/07/09/10/11 de calificaciones y avance; CP-12/13 de constancias/reportes E08; CP-14 de E09; CP-15 de E10. El healthcheck solo verifica infraestructura.

## Historia E10 completada localmente

- Docker Compose usa etiquetas de versión, puertos configurables, volumen separado para constancias, healthchecks y un usuario PostgreSQL restringido para la API. Migraciones y respaldo usan el propietario local; secretos permanecen en `.env` ignorado por Git.
- `npm run docker:deploy` valida el código y las integraciones, conserva imágenes anteriores, crea un respaldo previo, despliega y verifica API/base/web. `npm run docker:rollback` compara migraciones y rechaza una reversión incompatible.
- `npm run docker:backup` produce dump y copia de PDF con SHA-256. `npm run docker:restore:verify` restaura a una base temporal, compara los 16 conteos y todos los hashes, y prueba la aplicación con `siga_app`; limpia solo sus artefactos temporales.
- CP-15 pasó en una copia Compose aislada con puertos/volúmenes propios y en la restauración desde el respaldo real. Los volúmenes originales de `siga_dev` y certificados se conservaron.
- Evidencia: `docs/evidencias/e10-verificacion.md`. E10 solo valida demo local; hosting externo, HTTPS y gestión externa de secretos no se configuraron.

## Historia E07 completada

- Captura: docentes consultan grupos propios; la API verifica la asignación para cada lista y cada cambio de nota. Se captura la nota final directa según escala/precisión de política versionada.
- Correcciones: requiere versión esperada y motivo; actualización, trigger de versión y auditoría antes/después son atómicos. No hay acceso de administrador a captura ni evaluaciones parciales.
- Consulta: estudiantes ven solo su historial, notas finales, estado aprobado/reprobado, promedios por periodo y general, y créditos/avance del plan.
- Cálculos: Decimal ponderado por créditos; pendientes y canceladas fuera del promedio; cero válido; créditos aprobados únicos por asignatura. La política de recursamiento sigue siendo propuesta/configurable; D35 fija la interpretación técnica provisional.
- Verificación: 3 nuevas pruebas PostgreSQL (66 integraciones totales), 4 unitarias de cálculo (18 API totales), 7 web, `npm run check`, E2E 10/10 nativo y 10/10 Docker, servicios Docker saludables y sin migración. CP-06/07/09/10/11 cubiertos. Evidencia: `docs/evidencias/e07-verificacion.md`.

## Historia E08-A completada

- RF-10: emisión por estudiante y administración, constancia no vacía con intentos reprobados incluidos, snapshot, código único, PDF multipágina, QR al verificador público, hash SHA-256 y almacenamiento persistente fuera de PostgreSQL.
- Ciclo de vida: solo administración revoca con motivo; titular o administración puede reemitir una constancia revocada del mismo estudiante, con vínculo al documento previo. La descarga exige titular/administración y verifica hash; la verificación pública expone datos mínimos.
- CP-12 verificado en integración PostgreSQL: PDF válido con imagen QR, clave inexistente, archivo alterado, corrección posterior sin modificar el PDF anterior, revocación y reemisión con datos actualizados. No se añadió migración.

## Historia E08-B completada localmente

- RF-11/12: administración lista grupos e inscripciones, expone historial CSV filtrado por grupo, y consulta auditoría paginada con actor/acción/recurso/fecha/antes/después. El docente solo exporta grupos asignados; CSV escapa texto y neutraliza prefijos de fórmula.
- UI: reportes imprimibles para administración, descarga/reemisión de constancia propia, consulta pública mínima y exportación CSV de grupos propios para el docente asignado.
- Verificación: `npm run check`, 69/69 integraciones PostgreSQL en nueve suites, E2E nativo 10/10 escritorio/móvil, `npm run format:check`, `git diff --check` y `npm audit --omit=dev` (0 vulnerabilidades productivas). Evidencia: `docs/evidencias/e08-verificacion.md`.
- Limitación: Compose valida, pero Docker Desktop estuvo inactivo; la ejecución Docker y persistencia tras reinicio real quedan en E10. RF-13 correo sigue pospuesto.

## Historia E05 completada

- Periodos: administración protegida por ADMINISTRADOR con búsqueda/paginación, normalización, validación de fechas y ventanas, estado explícito y asociación de política académica; la interfaz mantiene visible `esPropuesta`.
- Grupos: alta, consulta paginada, edición y baja lógica. Valida plan/asignatura, docente activo, periodo no cerrado, clave por periodo y cupo. Ocupación excluye solo inscripciones CANCELADA; el cupo no puede bajar de la ocupación.
- Historial y seguridad: una vez que hay inscripciones, la identidad académica del grupo queda inmóvil. DOCENTE consulta sus grupos mediante la identidad de sesión. Los cambios de oferta se auditan con antes/después.
- Verificación: 4 pruebas PostgreSQL E05 dentro de 57 integraciones, E2E nativo y Docker 10/10 cada uno, escritorio/móvil. Sin migración. Evidencia: `docs/evidencias/e05-verificacion.md`.

## Historia E06 completada

- Matrícula: `GET /matriculas/oferta`, `GET /matriculas/me` y `POST /matriculas` solo para ESTUDIANTE; el titular se deriva de la sesión y el cuerpo acepta únicamente `grupoId`.
- Reglas en servidor: perfil/plan/asignatura/grupo/docente activos, periodo ABIERTO, ventana `[inicio, fin)`, prerrequisitos configurables, política vigente para reinscripción aprobada, duplicidad por asignatura/periodo y cupo.
- Concurrencia: transacción serializable con bloqueo de estudiante/cuenta y luego grupo; mismo bloqueo de grupo que E05. Reintentos limitados a tres. Inscripción pendiente, créditos congelados y auditoría se guardan en la misma transacción.
- Interfaz estudiante: consulta de oferta, lugares y motivos; alta con resultado visible e historial personal. No hay cancelación de autoservicio.
- Verificación: seis integraciones E06 con PostgreSQL real (CP-03/04/05/08, incluyendo carreras paralelas), 63 integraciones totales, 14 pruebas API unitarias, `npm run check`, E2E 10/10 nativo y Docker, Docker saludable y sin migración nueva. Evidencia: `docs/evidencias/e06-verificacion.md`.

## E11 - Materiales de capacitación preparados

- Manual de usuario por rol: `docs/manuales/manual-usuario-siga.docx`.
- Manual técnico de instalación, operación y recuperación: `docs/manuales/manual-tecnico-siga.docx`.
- Plan de capacitación: `docs/manuales/plan-capacitacion-e11.docx`, con sesiones presenciales y alternativa en línea, preparación del instructor, datos ficticios, prácticas, demostración, evaluación, storyboard de video y formatos vacíos de asistencia, resultados y aceptación.
- Versión documentada: `0.1.0-e10-20261011055740`, contrastada contra el estado local E10. La verificación visual abarcó los 14 folios. Los documentos no contienen credenciales reales.
- Aceptación pendiente: un participante ajeno a la elaboración debe seguir el manual; obtener al menos 80/100 y 100 % en tareas críticas; impartir y documentar la capacitación; llenar y conservar asistencia/resultados y registrar la entrega. El video está en formato de guion/storyboard y debe grabarse si la evidencia final lo requiere.
- No se afirma que hubo sesiones, asistencia, resultados, video grabado ni aceptación. E11 sigue abierta hasta que esos eventos se realicen y documenten. Evidencia: `docs/evidencias/e11-verificacion.md`.
