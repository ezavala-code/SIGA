# Decisiones y supuestos

Fecha de apertura: 2026-10-09. La autorización de programar permite decisiones técnicas reversibles, no acredita aprobación del reglamento académico.

| ID  | Estado                   | Decisión y motivo                                                                                                                                             | Impacto / verificación                                                                                                                                    |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | Requisito de las fuentes | SIGA para el caso académico de CodeShift; estudiante/participante, docente/instructor y asignatura/curso son equivalentes.                                    | Un solo dominio; sin multiempresa ni LMS.                                                                                                                 |
| D02 | Adoptada técnica         | Monorepositorio en la raíz existente, npm workspaces, React/Vite + NestJS + PostgreSQL.                                                                       | No crear otra carpeta `siga` anidada ni mover fuentes.                                                                                                    |
| D03 | Adoptada técnica         | Node 24.19.0 LTS y npm 12.2.0, presentes en el equipo; TypeScript 5.9.3 por compatibilidad de herramientas. Versiones exactas y lockfile.                     | Lint, typecheck, tests e instalación limpia. TS 7 queda fuera por peer dependencies de ts-jest/typescript-eslint.                                         |
| D04 | Adoptada técnica         | NestJS 12.1.2, React 19.3.0, Vite 8.3.4; PostgreSQL 18.6. Prisma 7.10.0 seleccionado para E02, aún no instalado.                                              | Evitar Prisma 8 RC. Dependencias consultadas en npm el 09/10/2026.                                                                                        |
| D05 | Adoptada técnica         | E01 solo usa `pg` para comprobar `SELECT 1`. Prisma reemplazará este acceso central en E02.                                                                   | No inventar tablas, migraciones o datos académicos en E01.                                                                                                |
| D06 | Adoptada técnica         | `GET /health/live` verifica proceso; `GET /health` consulta PostgreSQL y devuelve 503 al fallar.                                                              | No simular disponibilidad, ni exponer credenciales/versiones.                                                                                             |
| D07 | Adoptada técnica         | Web usa `/api`, proxy de Vite en desarrollo y de Nginx en Docker; la API mantiene `/health`.                                                                  | Misma interfaz pública para las siguientes etapas.                                                                                                        |
| D08 | Adoptada técnica         | Motor Docker no disponible por falta de WSL. Usar binarios PostgreSQL 18.6 ya instalados para crear dos instancias privadas en `.local`, puertos 55432/55433. | No modificar el servicio PostgreSQL existente, instalar WSL ni reiniciar Windows. Docker sigue preparado pero su ejecución debe verificarse por separado. |
| D09 | Propuesta académica      | Escala 0–10, mínima 6, dos decimales, final capturada directamente.                                                                                           | Confirmar antes de E07; valores versionados por periodo.                                                                                                  |
| D10 | Propuesta académica      | Promedio general incluye todos los intentos calificados, incluidas reprobadas; NULL se excluye; redondeo solo de presentación.                                | Confirmar antes de E07; ejemplos y CP-09/10/11.                                                                                                           |
| D11 | Propuesta académica      | Avance por créditos únicos aprobados del plan versionado; prerrequisito acreditado si existe intento aprobado.                                                | No contar dos veces una asignatura repetida; confirmar política antes de E06/E07.                                                                         |
| D12 | Propuesta académica      | Sin reinscripción a materia aprobada ni cancelación por autoservicio en MVP. Fechas de inscripción explícitas.                                                | Confirmar antes de E06. No inventar límites de créditos/horarios.                                                                                         |
| D13 | Propuesta académica      | Certificado de estudios con notas finales, no certificado oficial de conclusión. Instantánea, revocación y reemisión.                                         | Confirmar elegibilidad antes de E08. QR verifica registro, no integridad de cualquier archivo.                                                            |
| D14 | Adoptada técnica         | Datos ficticios; credenciales locales generadas, .env y .local ignorados.                                                                                     | No publicar ni usar datos reales. Pruebas con conexión separada y sufijo `_test`.                                                                         |
| D15 | Propuesta de aceptación  | RNF-03: p95 <2 s, errores <1 %, 20 usuarios, 5 min; cobertura >=70 % líneas/ramas de reglas.                                                                  | Confirmar carga con responsable antes de E09; no hay mediciones todavía.                                                                                  |
| D39 | Decisión de producto     | La marca y portada describen SIGA para distintos programas; el ICO-F19 se muestra en la trayectoria del estudiante como el plan actualmente documentado.      | El catálogo oficial y seriación de otros planes requieren sus fuentes institucionales; E12 permanece pendiente.                                           |
| D40 | Decisión operativa       | Inicio muestra cuentas activas; personas y catálogos ocultan filas inactivas por defecto y Administración puede mostrarlas con un control explícito.          | La bitácora, inscripciones, constancias y grupos históricos no se borran ni se alteran para limpiar datos de demostración.                                |

Las fuentes originales mencionadas por el TXT ya no están en la carpeta: se conserva el PDF completado como panorama. Los objetivos y requisitos del TXT siguen vigentes. Las fechas académicas anteriores son planificación, no ejecución acreditada.

## Referencias de compatibilidad consultadas

- [Versiones de Node](https://nodejs.org/en/about/previous-releases): rama 24 LTS.
- [Inicio de Vite](https://vite.dev/guide/): requisitos de Node.
- [Requisitos de Prisma](https://www.prisma.io/docs/orm/v7/reference/system-requirements): compatibilidad y elección de una versión estable.
- [PostgreSQL soportado](https://www.postgresql.org/support/versioning/): 18.6.
- Metadatos de cada paquete en `registry.npmjs.org`: engines y peerDependencies. `package-lock.json` es la resolución exacta; no reemplazar por latest.

## Decisiones E02 (2026-10-09)

Estas decisiones actualizan el estado inicial de D04/D05/D08 sin borrar su contexto:

- D16 técnica: Prisma/cliente/adapter-pg 7.10.0 instalados. Cliente ESM generado antes de build/typecheck/tests, pool único del adaptador en la API. SQL manual conserva restricciones que Prisma no expresa.
- D17 técnica: 15 entidades. Calificaciones parciales se posponen hasta aprobar ponderaciones; nota final solo en Inscripcion. Políticas inmutables, plan congelado con historial, snapshot de créditos y FK compuestas. No se implementan todavía servicios de cupo, prerrequisitos aprobados ni cálculos.
- D18 técnica: semillas aditivas e idempotentes, 7 cuentas deshabilitadas con hashes de contraseñas aleatorias descartadas. No hay credencial compartida. E03 debe provisionar administrador y accesos de forma explícita y segura.
- D19 técnica: integración verifica base real, usa namespace propio y revierte cada fixture por transacción. Sin reset/truncate. Bases privadas conservadas; rol limitado de aplicación corresponde a E10.
- D20 técnica: overrides exactos deepmerge-ts 8.0.2 y mysql2 3.24.5 resuelven avisos altos transitivos de la CLI. Generación, migraciones e integración verificadas. Auditoría productiva sin hallazgos; quedan avisos moderados en dependencias de desarrollo. No se utiliza MySQL ni se hizo audit fix --force.
- D21 autorización nueva: usuario pidió reparar Docker. Se habilitaron Microsoft-Windows-Subsystem-Linux y VirtualMachinePlatform con elevación legítima, sin reiniciar. Paquete WSL y resultado final: docs/docker-windows.md. El límite de no instalar WSL en D08 era de la sesión anterior y quedó sustituido por esta autorización.
- D22 técnica: Compose usa servicio migrate separado y espera éxito antes de iniciar API. CI migra base efímera antes de integración. No afirmar ejecución Docker/CI sin motor/repo remoto.

D09–D13 siguen siendo propuestas académicas; almacenar parámetros no acredita aprobación del reglamento.

## Decisiones E03 (2026-10-10)

- D23 técnica: JWT HS256 con secreto aleatorio local, vigencia de 30 minutos y cookie HttpOnly/SameSite Strict. Cada petición comprueba la sesión, revocación y usuario activo en PostgreSQL; el rol se lee de la base y no del token. No se guardan tokens en el almacenamiento del navegador.
- D24 técnica: rutas privadas por defecto mediante guard global. Los decoradores de rol y propietario se aplican en la API; cambios de estado requieren CSRF ligado a la sesión y verificación de origen. El límite de login es por IP y cuenta, en memoria de una instancia; pasar a almacén compartido antes de escalar horizontalmente.
- D25 técnica: activación explícita de cuentas ficticias solo sobre `siga_dev` local, con claves aleatorias bcrypt y archivo de acceso ignorado por Git. La semilla E02 no activa cuentas ni altera hashes existentes. No se habilita registro público ni recuperación de contraseña en E03.
- D26 verificada: tras reinicio, WSL 3.0.1 y Docker Engine 29.8.2 funcionan. Compose construyó y arrancó con migración correcta; la web y API pasaron pruebas de acceso contra Docker. D08 y la condición pendiente de D21/D22 quedan superadas para ejecución local, no para CI remoto.
- D27 técnica: HTTP y `COOKIE_SECURE=false` únicamente para demo local; una exposición remota requiere HTTPS, cookie segura y origen configurado. Se acepta `localhost` y `127.0.0.1` para el mismo puerto solo en desarrollo; producción exige coincidencia exacta.

D09–D13 continúan como propuestas; E03 no establece políticas de matrícula, notas ni certificados.

## Decisión E04-A (2026-10-10)

- D28 técnica: la administración de programas, asignaturas y planes se implementa sobre las tablas E02 existentes. Claves se normalizan en la API; no hay borrado físico. El grafo se valida en API y vuelve a protegerlo el trigger de PostgreSQL. La revisión del plan evita guardar sobre cambios concurrentes. Si un plan ya tiene personas, oferta o inscripciones, su contenido se conserva y la edición se hace en una nueva versión que copia asignaturas y prerrequisitos. D09–D13 siguen sin aprobación.
- D29 de alcance: esta subetapa cubre catálogos y planes solicitados; personas (estudiantes/docentes) quedan en E04-B. Su flujo de alta debe resolver asignación de cuenta/credencial de manera segura, sin exponer secretos ni crear accesos implícitos.

## Decisión E04-B (2026-10-10)

- D30 técnica y de seguridad: el alta de estudiante/docente crea la persona y su cuenta de rol en una única transacción. La cuenta queda inactiva con un hash bcrypt de un valor aleatorio descartado; ninguna API o pantalla devuelve una contraseña. La baja lógica desactiva la cuenta y revoca sesiones. Reactivar a la persona no concede acceso: deberá existir un flujo de provisión de credenciales separado. Los cambios relevantes se auditan y conservan los vínculos históricos. No se añadió migración: se usan las columnas E02.

## Decisión E05 (2026-10-10)

- D31 técnica y de alcance: E05 reutiliza las entidades existentes, sin migración. Las fechas calendario se mantienen como `Date`; los instantes de inscripción llegan con offset explícito, se almacenan como UTC y se presentan en la zona local del navegador. La zona institucional aún requiere decisión.
- El estado PLANIFICADO/ABIERTO/CERRADO del periodo es explícito y solo cambia por acción administrativa; no se infiere de fechas. El servicio verifica orden de fechas y ventana. La ventana no se restringe a las fechas del curso porque D12 exige fechas de inscripción explícitas y no hay regla aprobada que exija contención.
- Las políticas académicas se consultan y asocian al periodo, con su indicador `esPropuesta` visible. E05 no modifica ni aprueba D09–D13. Un periodo con grupos no puede cambiar de política; el grupo hereda la política al crearse.
- Un grupo se crea con plan activo, asignatura activa incluida en dicho plan, periodo no cerrado y docente activo. Cupo entero positivo. La ocupación de control incluye toda inscripción que no esté CANCELADA. El cambio de cupo bloquea la fila del grupo (`FOR UPDATE`) y usa transacción serializable; rechaza cupos inferiores a la ocupación. E06 debe adquirir el mismo bloqueo antes de insertar una inscripción.
- Con historial no se cambia clave, plan, asignatura, periodo o docente del grupo. La desactivación es lógica y conserva las inscripciones. Los cambios de periodos y grupos se auditan en la misma transacción con valores anteriores y posteriores.
- `GET /docentes/me/grupos` obtiene el docente desde la sesión y devuelve sus grupos; no acepta un ID de propietario enviado por el cliente. La UI administrativa y docente complementa la autorización de API, que sigue siendo la fuente de permisos.

## Decisiones E06 (2026-10-10)

- D32 técnica: la matrícula serializa primero la fila del estudiante y su cuenta, y después bloquea el grupo con el mismo `FOR UPDATE` de E05. Dentro de esa transacción serializable valida vigencia, plan, asignatura, docente, ventana, duplicidad, prerrequisitos y ocupación; inserta la inscripción y auditoría juntas. Reintenta conflictos transitorios como máximo tres veces y devuelve conflicto entendible si no puede confirmar. La ventana se interpreta `[inicio, fin)`.
- D33 técnica y de alcance: `EXIGIR_PRERREQUISITOS=true` aplica RN-01 por defecto y permite configurarlo en el entorno; una acreditación se determina con la política vinculada al intento calificado. La reinscripción de una asignatura aprobada consulta `permiteReinscripcionAprobada` de la política del periodo actual. Estos parámetros pertenecen a D09–D13, que siguen como propuestas y no quedan aprobadas por usarlos. No se inventan límites de créditos ni horarios y el estudiante no cancela desde autoservicio.
- D34 técnica de pruebas: cada ejecución de integración aplica las migraciones a un esquema PostgreSQL aleatorio dentro de `siga_test`; al terminar elimina únicamente ese esquema temporal. Así CP-04/05 usa transacciones HTTP independientes y datos visibles entre ellas, mientras la base compartida y sus auditorías inmutables permanecen fuera del alcance de limpieza.

## Decisiones E07 (2026-10-10)

- D35 técnica, sin aprobación académica: el promedio por periodo usa todas las notas finales no canceladas, ponderadas por `creditosSnapshot`; pendientes se excluyen y un cero sí es una nota. Para el promedio general, cuando existen varios intentos de la misma asignatura, se usa `intentosPromedio` de la política del intento calificado cronológicamente más reciente (`inicio`, `fin`, alta y UUID) para elegir TODOS, ULTIMO o MEJOR. Los parámetros D09–D11 continúan marcados como propuestas. Los promedios se redondean a dos decimales solo al presentarlos.
- D36 técnica: `PUT /calificaciones/:inscripcionId` identifica explícitamente la inscripción, recibe la nota final como texto decimal y la versión esperada; el servidor deriva al docente de la sesión y exige asignación al grupo. Una corrección sobre una nota ya capturada requiere motivo. Nota, control de concurrencia y auditoría se actualizan en una transacción. No se agregan calificaciones parciales ni fecha límite de captura no indicada por las fuentes.

## Decisiones E08 (2026-10-10)

- D37 técnica y de alcance: el documento de E08 es una constancia de estudios, no de conclusión. Incluye todos los intentos con nota final, también reprobados, y no se emite sin calificaciones finales. Como las fuentes dejan la elegibilidad exacta pendiente, E08 no añade una condición por estado ACTIVO/EGRESADO; se requiere un perfil existente, cuenta autenticada para autoservicio y al menos una nota final. La instantánea y el PDF quedan fijos al emitir; una corrección posterior requiere revocar con motivo y puede generar una reemisión enlazada. No se afirma aprobación de D09–D13.
- El QR contiene una URL del portal público de verificación, no datos personales. La consulta pública limita la respuesta a código, tipo, fecha, programa, estado y nombre abreviado; matrícula, correo y expediente completo no se publican. Descargar el PDF requiere ser titular o administrador, y cada descarga comprueba SHA-256.
- Los PDF se guardan fuera de PostgreSQL en `CERTIFICATES_DIR`: `.local/certificados` en desarrollo y un volumen Docker dedicado. E08 reutiliza el esquema de certificados/auditoría de E02 y no modifica migraciones ya aplicadas.
- Los reportes permiten al administrador consultar grupos, historial académico y bitácora; el docente conserva acceso solo a grupos asignados. La exportación de historial es CSV con escape de celdas y protección frente a fórmulas.

## Decisión E10 (2026-10-10)

- D38 técnica: Compose ejecuta migraciones y respaldos con el propietario PostgreSQL local; la API usa `POSTGRES_APP_USER`, sin atributos administrativos ni permiso `CREATE` en `public`. Recibe DML en las tablas de aplicación salvo UPDATE/DELETE sobre `Auditoria`; los privilegios por defecto cubren objetos que agreguen migraciones futuras. Los secretos siguen en `.env` ignorado por Git. E10 solo despliega en loopback local; no acredita preparación para hosting público.

## Decisiones de demostracion local (2026-11-05)

- **D41 — Aceptada por el usuario para demostracion:** usar dos programas con datos sinteticos, identificados como demostracion, mientras no se cuente con el catalogo oficial completo ICO-F19. Esto habilita preparar y probar datos ficticios; no convierte el mapa ICO-F19 en catalogo oficial ni resuelve la carga institucional E12.
- **D42 — Aceptada provisionalmente por el usuario para demostracion:** escala de 0 a 10, minima aprobatoria 6, dos decimales y promedio general ponderado por creditos con todos los intentos calificados. Registrar los resultados y conservar esta politica como provisional; la aceptacion no acredita reglamento institucional ni decide otras reglas pendientes como fechas o elegibilidad de constancia.

Ambas decisiones fueron comunicadas por el usuario en esta conversacion; fecha 2026-11-05, responsable: usuario solicitante. Comprobar que las fixtures y la politica utilizada coinciden con D42 antes de presentar resultados. El resto de D09–D13 sigue propuesto donde D42 no lo cubre.

- **D43 — Aceptada provisionalmente por el usuario para demostracion (2026-11-05):** constancia de estudios disponible con al menos una nota final, incluyendo materias aprobadas y reprobadas. No acredita conclusion del programa ni validez oficial.
- **D44 — Aceptada por el usuario para demostracion (2026-11-05):** las ventanas de inscripcion se interpretan para la zona horaria `America/Mexico_City`. La implementacion y las pantallas deben comprobar esta decision; no presumirla verificada.

- **D45 — Meta provisional aceptada por el usuario para demostracion (2026-11-05, verificada en candidato final el 2026-11-09):** 20 usuarios simultaneos, latencia p95 menor de 2 segundos y menos de 1 % de errores inesperados para cada operacion evaluada. Acreditada en las 5 operaciones con 780 solicitudes medidas y 0 % de errores por operacion: reporte (`p95 = 204,00 ms`), oferta (`p95 = 421,24 ms`), matricula (`p95 = 581,41 ms`), PDF latino (`p95 = 627,80 ms`) y PDF Unicode cirilico/CJK (`p95 = 670,84 ms`). Ver `docs/RENDIMIENTO_DEMOSTRACION.md`.

- **D46 — Objetivos provisionales aceptados por el usuario para demostracion (2026-11-05, verificados en candidato final el 2026-11-09):** la persona administradora realiza respaldo diario y antes de cambios importantes; objetivo de recuperacion en un maximo de 4 horas y perdida maxima de 24 horas de datos. En el simulacro de perdida total (`docker compose down --volumes --remove-orphans`) sobre el candidato final (`a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`), el **RTO medido fue de `9,47 s` (`<= 4 h`)** y el **RPO medido fue de `1,18 s` (`<= 24 h`)**, conservando la copia verificada en `.local/backups/retenido-candidato` con permisos `0700`/`0600`. Ver `docs/OPERACION_RESPALDO_RESTAURACION.md`.

## Decisiones operativas del cierre técnico local (2026-11-09)

- **D47 — Semántica de bajas padre/hijo en catálogos y oferta (`AUD-19`):** desactivar lógicamente un `Programa` o un `PlanEstudio` bloquea la creación de nuevas versiones de plan, el alta o asignación de nuevos estudiantes a ese plan, la apertura de nuevos grupos y la inscripción de estudiantes en grupos asociados (`409 Conflict` y exclusión en `GET /matriculas/oferta`), mientras conserva íntegramente la consulta de historial académico, calificaciones, constancias emitidas y reportes históricos.
- **D48 — Trazado híbrido y caché de fuentes para PDF Unicode (`R-02` / `PB-20` / `PB-29`):** `certificado.pdf.ts` reutiliza en memoria las instancias `fontkit` y el caché de `layout()`, empleando `StandardFonts.Helvetica`/`HelveticaBold` para los segmentos cubiertos por WinAnsi e incrustando el subconjunto de `NotoSans`/`DroidSansFallback` únicamente en los fragmentos que contienen puntos de código fuera de `Helvetica`. Esto conserva la validación estricta de glifos y reduce el `p95` de emisión Unicode con 20 usuarios concurrentes a `670,84 ms` con `0 %` de errores.
