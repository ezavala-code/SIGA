# SIGA · Sistema Integral de Gestión Académica

**Ampliación de diez funcionalidades (noviembre de 2026):** horarios y conflictos, mapa dinámico, parciales ponderados, notificaciones, retiros y lista de espera, indicadores, certificados de conclusión, alertas académicas, asistencia y perfil/recuperación. Consulta [guía y limitaciones de la ampliación](docs/AMPLIACION_FUNCIONAL_20261112.md). La ampliación compiló y pasó pruebas unitarias; falta verificarla con una instancia PostgreSQL real antes de producción.

> Para iniciar una demostración local independiente con datos sintéticos, consulta [Demo local](docs/DEMO_LOCAL.md) y [explicación paso a paso](docs/EXPLICACION_DEMO_LOCAL.md).

Edición según las guías académicas: [PDF completo](EntregablesPI-Ing-Software-revisado.pdf), [DOCX editable completo](EntregablesPI-Ing-Software-revisado.docx) y [explicación de estructura y formato](docs/EXPLICACION_FORMATO_ACADEMICO.md).

Documentación revisada del 9 de noviembre de 2026: [auditoría y pendientes](docs/AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md), [informe con conclusiones/anexos/manuales](EntregablesPI-Ing-Software-revisado.pdf) y [fuentes editables y manuales por separado](docs/entrega-revisada/README.md). El cierre integral conserva reservas técnicas y aceptación humana pendiente.

SIGA organiza matrícula, calificaciones, constancias y reportes para distintos programas y planes académicos. La portada es general; el mapa ICO-F19 permanece dentro de la trayectoria del estudiante como el único plan cuyo esquema visual se ha confirmado hasta ahora. E00–E10 están implementadas y verificadas localmente; E11 tiene manuales y plan de capacitación preparados, pendiente de piloto. Consultar [estado](docs/ESTADO.md), [backlog](docs/BACKLOG.md), [guía para publicar en la web](docs/publicacion-web.md), la [evidencia E10](docs/evidencias/e10-verificacion.md) y la [evidencia E11](docs/evidencias/e11-verificacion.md).

El mapa ICO-F19 tiene 10 periodos, 410 créditos, 55 UA obligatorias, dos actividades académicas y tres optativas por acreditar. La carga de materias, claves, créditos por unidad y seriación en el catálogo transaccional queda pendiente de incorporar desde el plan oficial completo; el mapa visual no sustituye ese catálogo.

## Inicio en Windows con PostgreSQL nativo

En este equipo se verificaron Node 24.19.0, npm 12.2.0 y PostgreSQL 18.6. El proyecto crea dos clústeres privados en `.local`, sin modificar el PostgreSQL del sistema: desarrollo en 55432 y pruebas en 55433.

```powershell
npm ci
npm run setup -- --native
npm run db:local:start
npm run db:migrate
npm run db:seed
npm run db:test:migrate
npm run auth:bootstrap:admin
npm run dev
```

Abrir **http://localhost:5173**. La API responde en **http://127.0.0.1:3000/health**. `db:seed` agrega el programa y plan ICO-F19; no crea estudiantes, docentes, notas ni matrículas de ejemplo. `auth:bootstrap:admin` solicita el correo y genera una contraseña aleatoria, guardando el acceso en `.local/admin-acceso.txt`, ignorado por Git. Si necesitas definirlos para una ejecución, acepta `SIGA_BOOTSTRAP_EMAIL` y `SIGA_BOOTSTRAP_PASSWORD` como variables temporales del proceso; el bootstrap nunca imprime la contraseña. Ejecútalo una sola vez por base local.

`setup` crea `.env` con secretos aleatorios si falta; en una configuración existente agrega solo `JWT_SECRET` o las credenciales del rol de aplicación que falten. No sobrescribe credenciales previas. `.env` y `.local` están ignorados. `db:seed` es aditiva y segura para repetirse. `db:local:status` informa estado; `db:local:stop` detiene solo los clústeres privados sin borrar datos. Para detener web/API, usar Ctrl+C.

## Inicio con Docker Desktop

WSL 3.0.1 y Docker Desktop se verificaron tras el reinicio; la [guía de reparación](docs/docker-windows.md) conserva el diagnóstico. En una copia nueva:

```powershell
npm ci
npm run setup
docker compose up --build -d --wait
```

La web queda en **http://localhost:8080**. Compose inicia PostgreSQL, ejecuta las tres migraciones con el servicio `migrate` y después levanta API/web. Para cargar el plan ICO-F19 y crear el administrador de Docker:

```powershell
npm run docker:admin:bootstrap
```

Ese comando usa solo la base local de Docker (`siga_dev` en 127.0.0.1:5432), carga el plan y crea el administrador usando esas variables temporales si están definidas; en otro caso solicita el correo y genera una contraseña aleatoria. El acceso queda en `.local/admin-acceso-5432.txt`. Es independiente de la base nativa. `docker compose stop` conserva los datos. No eliminar el volumen para corregir una falla de acceso.

Para probar los tres roles contra la misma web, prepara los accesos locales solicitados y abre tres perfiles de Edge aislados:

```powershell
npm run docker:users:bootstrap
npm run profiles:open
```

El comando crea los perfiles `jon@gmail.com` y `prueba123@gmail.com`, desactiva los perfiles genéricos anteriores y reúne junto con el administrador los tres accesos aleatorios en `.local/credenciales-siga.txt`. El archivo está fuera de Git. No publiques ni envíes esas credenciales. El docente no tiene grupos asignados y el estudiante está asociado a ICO-F19, sin notas ni matrículas. Cada ventana conserva su sesión en `.local/navegadores/`. Para el sitio nativo en `5173` siguen disponibles las cuentas independientes mediante `npm run auth:bootstrap:local-test-profiles -w @siga/api` y `npm run profiles:open -- -Target native`.

En administración, personas y catálogos muestran por defecto solo cuentas y registros activos. Activa **Mostrar archivados** para consultar los registros inactivos que se conservan por el historial y la auditoría.

Para revisar o archivar los datos de demostración de versiones anteriores, usa `npm run db:archive:demo:check` y luego `npm run db:archive:demo` para PostgreSQL nativo; los comandos `db:archive:demo:docker:check` y `db:archive:demo:docker` hacen lo mismo en Docker. Solo reconoce la semilla `siga-demo-v1`: desactiva sus cuentas, perfiles y catálogos, revoca sus constancias emitidas y quita sus credenciales locales. Conserva inscripciones, constancias y bitácora inmutables como historial; no reinicia la base ni elimina volúmenes.

Compose configura el volumen nombrado `siga_certificados` en `/data/certificados` para separar los PDF de las imágenes de API; un servicio de inicialización prepara permisos privados para el usuario `node`; `siga_db` conserva los datos académicos. El servicio `db-permissions` prepara `POSTGRES_APP_USER` con permisos de datos antes de arrancar la API. `POSTGRES_USER` se reserva para migraciones y respaldo; el rol de aplicación no tiene privilegios de administración ni `CREATE` en `public`, y no puede modificar o borrar auditorías. Las contraseñas se generan en `.env` mediante `npm run setup` y no se guardan en Git.

## Despliegue y recuperación local E10

`npm run docker:deploy` ejecuta `npm run check` y las integraciones PostgreSQL, valida Compose, guarda las imágenes anteriores, construye imágenes con una etiqueta nueva basada en versión y fecha, toma un respaldo y después despliega. Para fijar una etiqueta explícita usa `npm run docker:deploy -- --version 1.0.0`. Persiste la versión activa como `SIGA_VERSION` en el `.env` local para que Compose la conserve en sesiones posteriores. El manifiesto de cada intento queda en `.local/releases/`; uno completado registra el respaldo, el conjunto de migraciones y las pruebas de humo de API/base/web. Si falla el humo, el script solo revierte automáticamente cuando no cambió el esquema. La reversión también persiste su versión activa.

`npm run docker:backup` detiene brevemente la API para obtener una instantánea consistente, genera un dump PostgreSQL y copia los PDF del volumen con tamaños y SHA-256. El respaldo completo queda en `.local/backups/`, carpeta ignorada por Git. No incluye `.env` ni credenciales; resguárdalas por separado y fuera del repositorio.

`npm run docker:restore:verify` restaura el respaldo más reciente a una base temporal nueva, compara todos los conteos de tablas y todos los hashes de archivo, inicia una API aislada con el rol `siga_app` y prueba salud, login/logout y una constancia. Al finalizar elimina solo la base y los archivos temporales de esa verificación; conserva el respaldo. Se puede seleccionar un respaldo con `npm run docker:restore:verify -- --backup .local/backups/<directorio>`.

La reversión manual exige un manifiesto desplegado y que el conjunto actual de migraciones coincida con el registrado:

```powershell
npm run docker:rollback -- --release .local/releases/release-<version>.json
```

Para validar una copia limpia sin tocar los servicios ni los volúmenes existentes, asigna otro proyecto y puertos libres. El ejemplo se detiene sin eliminar sus volúmenes:

```powershell
$env:POSTGRES_PORT = '55444'
$env:WEB_PORT = '18081'
$env:SIGA_VERSION = '0.1.0-copia-limpia'
docker compose -p siga-copia-limpia up --build -d --wait
Invoke-RestMethod http://localhost:18081/api/health
Invoke-WebRequest http://localhost:18081/
docker compose -p siga-copia-limpia stop
```

E10 se validó en instalación local HTTP/loopback. No se publicó un hosting remoto ni se habilitó acceso externo; una exposición de producción requiere HTTPS, cookie segura, gestión de secretos externa y revisión de compatibilidad/migraciones.

Consulta [publicar SIGA como sitio web](docs/publicacion-web.md) para conectar un servidor, dominio y HTTPS. El primer administrador y la activación segura de cuentas académicas reales deben resolverse antes del lanzamiento.

Si se usan solo PostgreSQL en Docker y web/API en Node, configurar en `.env` las URL locales de 5432/5433, ejecutar `npm run db:up`, `npm run db:migrate` y `npm run dev`. No iniciar dos instancias de web/API en los mismos puertos. Docker expone únicamente la web y la base sobre loopback; la API se alcanza por `/api` mediante Nginx.

## Acceso y API E03

El usuario entra desde la portada y se dirige a `/estudiante`, `/docente` o `/administracion` según su rol. El servidor valida cada petición protegida; cambiar la ruta en el navegador no concede permisos. El token firmado vive en cookie HttpOnly/SameSite Strict, dura 30 minutos y se comprueba contra `Sesion` y `Usuario` en PostgreSQL. Cerrar sesión revoca solo esa sesión. No hay renovación ni registro público en E03.

| Ruta                              | Acceso                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /health/live`, `GET /health` | Públicas; proceso y base respectivamente.                                            |
| `POST /auth/login`                | Pública, JSON `{correo,password}`; devuelve usuario y `csrfToken`, establece cookie. |
| `GET /auth/me`                    | Sesión activa; perfil propio y CSRF.                                                 |
| `POST /auth/logout`               | Sesión activa y encabezado `X-CSRF-Token`; revoca sesión.                            |
| `GET /auth/usuarios`              | Solo administrador; lista inicial de hasta 50 cuentas sin hashes.                    |
| `GET /auth/usuarios/:id`          | El propio usuario o administrador; sin hashes.                                       |

Las rutas no marcadas públicas requieren sesión por defecto. La API valida rol y recurso. Los cambios protegidos requieren CSRF y se rechazan orígenes ajenos. Cinco fallos de login por IP o cuenta en cinco minutos se bloquean temporalmente; el contador está en memoria de una sola instancia. Las acciones de login/logout/activación se auditan sin guardar contraseñas o tokens.

## Catálogos y planes E04-A

Desde Administración abre «Catálogos académicos». Solo ADMINISTRADOR puede consultar o modificar esta sección, y las modificaciones requieren el token CSRF de la sesión.

| Ruta                                       | Operación                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `GET/POST /catalogos/programas`            | Lista con búsqueda/paginación o crea programa.                                            |
| `PATCH /catalogos/programas/:id`           | Cambia nombre o estado activo; la baja es lógica.                                         |
| `GET/POST /catalogos/asignaturas`          | Lista con búsqueda/paginación o crea asignatura.                                          |
| `PATCH /catalogos/asignaturas/:id`         | Cambia nombre o estado activo; la baja es lógica.                                         |
| `GET/POST /catalogos/planes`               | Lista o crea un plan por programa y versión.                                              |
| `GET/PATCH /catalogos/planes/:id`          | Consulta detalle o cambia nombre/estado.                                                  |
| `PUT /catalogos/planes/:id/contenido`      | Guarda asignaturas, créditos, semestre sugerido y prerrequisitos, con número de revisión. |
| `POST /catalogos/planes/:id/nueva-version` | Crea la versión siguiente, copiando el contenido y sus prerrequisitos.                    |

Las listas aceptan `q`, `page` y `pageSize` (máximo 100 por página). La API recorta y normaliza las claves a mayúsculas, valida duplicados y no permite borrado físico desde los catálogos. Cada plan rechaza asignaturas fuera del propio plan, créditos no positivos, autorrequisitos y ciclos. La base de datos vuelve a proteger el grafo.

El contenido se bloquea cuando un plan ya tiene estudiantes, grupos u inscripciones. Para actualizarlo, crea una nueva versión; la versión anterior conserva el historial.

## Estudiantes y docentes E04-B

Desde Administración abre «Personas». La API limita todas las rutas a ADMINISTRADOR y admite `q`, `page` y `pageSize` (máximo 100 por página).

| Ruta                              | Operación                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET/POST /personas/estudiantes`  | Consulta paginada/búsqueda o alta con correo, matrícula, plan y fecha de ingreso.           |
| `PATCH /personas/estudiantes/:id` | Actualiza datos/estado; no permite cambiar el plan si existen inscripciones o certificados. |
| `GET/POST /personas/docentes`     | Consulta paginada/búsqueda o alta con correo, número de empleado y departamento.            |
| `PATCH /personas/docentes/:id`    | Actualiza los datos o da de baja lógicamente al docente.                                    |

Las altas normalizan correo y claves y rechazan duplicados. Cada persona se crea en la misma transacción que su cuenta de rol correspondiente y el registro de auditoría. La cuenta nueva queda inactiva con un hash generado a partir de un valor aleatorio que no se conserva en texto; no se devuelve ni muestra una contraseña. Así, registrar una persona no concede acceso automático. La baja desactiva la cuenta y revoca sus sesiones sin borrar inscripciones, certificados ni grupos. Reactivar el estado académico no reactiva el acceso; la provisión de credenciales sigue un flujo separado.

E04 cubre catálogos, planes, estudiantes y docentes. No se añadió migración porque el esquema E02 ya contenía los campos y relaciones requeridos.

## Periodos, grupos y cupos E05

Desde Administración abre «Periodos y grupos». Solo ADMINISTRADOR puede administrar la oferta y cada cambio requiere CSRF. Las claves se normalizan a mayúsculas. Los estados del periodo se guardan explícitamente y no se deducen de las fechas. Las políticas se seleccionan por periodo y la interfaz muestra si siguen siendo propuestas; E05 no las aprueba ni altera sus reglas.

| Ruta                      | Operación                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `GET/POST /periodos`      | Búsqueda/paginación, alta de periodo y fechas de inscripción con offset explícito.            |
| `PATCH /periodos/:id`     | Actualiza fechas, estado explícito y política; no permite cambiar política si existen grupos. |
| `GET /periodos/politicas` | Opciones resumidas con marca `esPropuesta`.                                                   |
| `GET/POST /grupos`        | Consulta paginada o crea grupo vinculado a asignatura del plan, periodo y docente activo.     |
| `PATCH /grupos/:id`       | Cambia cupo/asignación o desactiva lógicamente; protege ocupación e historial.                |
| `GET /docentes/me/grupos` | DOCENTE autenticado consulta solo sus grupos; el servidor deriva el propietario de la sesión. |

El periodo valida orden cronológico interno y de la ventana de inscripción. Las marcas de tiempo se almacenan como UTC; el formulario toma la zona horaria local del navegador al capturar la ventana. La zona institucional aún no está aprobada. La capacidad activa cuenta inscripciones no canceladas; una actualización bloquea la fila del grupo y rechaza cupos menores a esa ocupación. Los grupos con inscripciones no pueden cambiar de clave, plan, asignatura, periodo ni docente; una baja lógica conserva las filas históricas. E06 usa ese mismo bloqueo antes de insertar matrícula y valida periodo/ventana en servidor.

## Matrícula en línea E06

El estudiante abre «Mi matrícula» desde su perfil. Puede consultar los grupos abiertos de su plan, ver lugares y motivos de inelegibilidad, inscribirse y revisar su propio historial. La interfaz no envía un ID de estudiante; la API obtiene al titular de la sesión y rechaza los demás roles.

| Ruta                     | Operación                                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /matriculas/oferta` | Devuelve grupos activos del plan propio cuyo periodo está ABIERTO y cuya ventana incluye el instante actual. Muestra cupo, ocupación, créditos y motivos de rechazo. |
| `GET /matriculas/me`     | Devuelve únicamente las inscripciones del estudiante autenticado, con asignatura, grupo, docente, periodo y créditos guardados.                                      |
| `POST /matriculas`       | Recibe solo `{ "grupoId": "…" }`; revalida todos los requisitos en servidor y registra la inscripción. Requiere CSRF.                                                |

La API valida cuenta y perfil activos, plan y asignatura activos, grupo y docente activos, periodo abierto y ventana `[inicio, fin)`. Aplica RN-01 de forma configurable con `EXIGIR_PRERREQUISITOS` (predeterminado `true`); una calificación previa cuenta como acreditada al compararla con la mínima de la política de ese intento. La reinscripción a una asignatura aprobada depende de `permiteReinscripcionAprobada` en la política del periodo actual. D09–D13 siguen propuestas académicas, por lo que estos valores configurables no equivalen a su aprobación. No se agregaron límites de créditos/horarios ni cancelación de autoservicio.

La transacción serializable bloquea primero estudiante/cuenta y luego grupo, en el mismo orden para todas las solicitudes de matrícula; el grupo usa el bloqueo compartido con la actualización de cupo E05. Con ese bloqueo vuelve a contar inscripciones no canceladas. La restricción única de PostgreSQL evita duplicar estudiante/asignatura/periodo incluso entre grupos distintos. La inscripción `PENDIENTE`, la instantánea exacta de créditos y su auditoría se confirman juntas. Conflictos transitorios se reintentan como máximo tres veces; una carrera por el último lugar produce una sola inscripción y el otro intento recibe un conflicto legible. No se añadió migración porque E02 ya contiene las columnas, relaciones y restricción única.

## Calificaciones y avance E07

El docente abre uno de sus grupos y captura la nota final de cada inscripción. El servidor deriva el perfil docente de la sesión y autoriza la operación por asignación al grupo; la interfaz no concede permisos. La escala y la cantidad de decimales se consultan de la política académica versionada del periodo. D09–D11 siguen marcadas como propuestas; su uso no representa aprobación institucional.

| Ruta                                              | Operación                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /docentes/me/grupos/:grupoId/calificaciones` | Consulta paginada de estudiantes, nota y versión de las inscripciones del grupo asignado.        |
| `PUT /calificaciones/:inscripcionId`              | Guarda `{ "notaFinal": "8.50", "version": 1 }`; una corrección requiere `motivo`. Requiere CSRF. |
| `GET /estudiantes/me/calificaciones`              | Devuelve solo el historial, notas finales, resultados, promedio general y promedio por periodo.  |
| `GET /estudiantes/me/progreso`                    | Calcula créditos totales/aprobados y porcentaje del plan vigente del propio estudiante.          |

La nota se almacena como Decimal, se valida contra límites y precisión antes de guardar y puede ser cero. Cada corrección requiere la versión actual; dos ediciones concurrentes no se pisan. La inscripción y su auditoría antes/después se escriben en la misma transacción. El administrador y otros docentes no pueden calificar el grupo.

El promedio por periodo pondera todas las notas finales no canceladas por `creditosSnapshot`; inscripciones pendientes no entran al cálculo. El promedio general considera los recursamientos según `intentosPromedio` de la política del intento calificado cronológicamente más reciente de cada asignatura (TODOS, ULTIMO o MEJOR). El sistema conserva todos los intentos. Los cálculos no usan coma flotante; se redondean a dos decimales al mostrarse. El avance suma créditos de asignaturas únicas con al menos un intento aprobado, tomando la mínima de la política de ese intento; el denominador es el total de créditos del plan versionado. Un plan sin créditos devuelve avance nulo, no división entre cero. No hay calificaciones parciales ni reglas de cierre de captura en esta etapa.

E07 reutiliza `Inscripcion.notaFinal`, el control de versión, los checks/triggers y `Auditoria` existentes; no requiere migración nueva.

## Constancias y reportes E08

El estudiante emite su constancia desde «Mis constancias». La API solo la genera si tiene notas finales y captura una instantánea inmutable con los intentos calificados, incluidas las reprobaciones. El PDF indica que es una constancia académica y no acredita la conclusión del programa. El QR dirige a la verificación pública; la descarga exige ser titular o administrador y valida el SHA-256 del archivo.

| Ruta                                          | Acceso y operación                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `POST /certificados`                          | ESTUDIANTE; emite una constancia propia.                                                                                  |
| `GET /certificados/me`                        | ESTUDIANTE; consulta solo sus constancias.                                                                                |
| `GET /certificados/:id/pdf`                   | Titular o ADMINISTRADOR; descarga tras comprobar el hash.                                                                 |
| `POST /certificados/:id/revocar`              | ADMINISTRADOR; requiere motivo y deja auditoría.                                                                          |
| `POST /certificados/:id/reemitir`             | Titular o ADMINISTRADOR; reemplaza una constancia revocada con vínculo.                                                   |
| `GET /certificados/verificar/:codigo`         | Pública; muestra código, tipo, fecha, programa, estado y nombre abreviado. No expone correo, matrícula ni calificaciones. |
| `GET /reportes/grupos`                        | ADMINISTRADOR; lista oferta e inscripciones por grupo.                                                                    |
| `GET /reportes/grupos/:grupoId/historial.csv` | ADMINISTRADOR o DOCENTE asignado; exporta el historial del grupo.                                                         |
| `GET /reportes/auditoria`                     | ADMINISTRADOR; consulta actor, acción, recurso, fecha y valores del cambio.                                               |

En desarrollo, `CERTIFICATES_DIR` usa `.local/certificados`; en Compose apunta a `/data/certificados`. No se añadió migración: E08 reutiliza `Certificado` y `Auditoria` de E02. RF-13, envío de comprobantes por correo, sigue fuera de alcance.

## Verificaciones

```powershell
npm run check
npm run format:check
npm run db:test:migrate
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

`check` ejecuta lint, tipos, unitarias/componentes y build. Integración requiere `TEST_DATABASE_URL` terminada en `_test` y distinta de desarrollo. Para cada ejecución crea un esquema aleatorio en esa base, aplica allí las migraciones y elimina solamente ese esquema al terminar; los escenarios de concurrencia pueden confirmar entre sí sin dejar inscripciones/auditorías de prueba en la base compartida. Las demás fixtures se revierten por transacción. Playwright inicia o reutiliza API y Vite locales, comprueba escritorio/móvil, roles, sesión tras recarga y cierre. Para ejecutar E2E contra Docker desde PowerShell:

```powershell
$env:SIGA_E2E_BASE_URL = 'http://localhost:8080'
npm run test:e2e
Remove-Item Env:SIGA_E2E_BASE_URL
```

Las comprobaciones de acceso por rol requieren cuentas de prueba aisladas en `.local/demo-acceso-5432.txt`. Las cuentas de demostración antiguas se archivaron y sus contraseñas se retiraron; no se reactivan automáticamente.

## Capacitación y entrega E11

El paquete documental preparado contiene el [manual de usuario por rol](docs/manuales/manual-usuario-siga.docx), el [manual técnico](docs/manuales/manual-tecnico-siga.docx) y el [plan de capacitación y evaluación](docs/manuales/plan-capacitacion-e11.docx). El plan ofrece dos sesiones presenciales de 150 minutos y una alternativa en línea, prácticas, evaluación práctica, guion/storyboard de video y formatos para asistencia, resultados y entrega. Son editables en Word.

Estos DOCX se consultan desde el repositorio; todavía no están integrados en el portal web ni hay una ruta de descarga dentro de SIGA. La portada describe las funciones por perfil, pero no sustituye los manuales.

La capacitación todavía no se impartió: las hojas de asistencia y evaluación están en blanco y el video está preparado como guion/storyboard, no grabado. Para aceptación E11, otra persona debe seguir el manual, lograr al menos 80/100 y completar el 100 % de tareas críticas; después se registran únicamente los resultados que hayan ocurrido. Ver los [pendientes y criterios de cierre](docs/evidencias/e11-verificacion.md).

La evidencia local está en [E11](docs/evidencias/e11-verificacion.md), [E10](docs/evidencias/e10-verificacion.md), [E09](docs/evidencias/e09-verificacion.md), [E08](docs/evidencias/e08-verificacion.md), [E07](docs/evidencias/e07-verificacion.md), [E06](docs/evidencias/e06-verificacion.md), [E05](docs/evidencias/e05-verificacion.md), [E04-A](docs/evidencias/e04-a-verificacion.md), [E04-B](docs/evidencias/e04-b-verificacion.md), [E03](docs/evidencias/e03-verificacion.md) y [E02](docs/evidencias/e02-verificacion.md). CI remoto no se ha ejecutado porque no hay repositorio remoto/push. `npm audit --omit=dev` verifica dependencias productivas; no hacer actualizaciones forzadas para resolver herramientas de desarrollo sin revisar compatibilidad.

## Datos, estructura y límites

`apps/api/prisma/schema.prisma` describe 15 entidades; tres migraciones incluyen restricciones SQL no expresadas por Prisma. Ver [modelo de datos](docs/modelo-datos.md). No editar migraciones aplicadas ni usar `db push` o `migrate reset` sobre estas bases. `db:seed` solo registra el programa y el plan ICO-F19. Las pruebas automatizadas usan datos sintéticos en esquemas aislados; no se cargan al iniciar la aplicación. Los datos de demostración históricos se archivan con `db:archive:demo` y se conservan las filas protegidas de inscripciones, constancias y auditoría.

```text
apps/api/            API NestJS, Prisma, auth, certificados, reportes y pruebas de integración
apps/web/            Portal React/Vite, cliente HTTP, estilos y componentes
packages/contracts/  Tipos compartidos para la API/web
scripts/             Preparación local, semilla ICO-F19 y verificación
tests/e2e/           Navegador real en escritorio y móvil
docs/                Estado, decisiones, backlog, modelo y evidencias
```

Variables principales: `DATABASE_URL`, `TEST_DATABASE_URL`, `WEB_ORIGIN`, `JWT_SECRET`, `JWT_TTL_SECONDS` (300–3600; 1800 por defecto), `EXIGIR_PRERREQUISITOS` (booleano; `true` por defecto), `CERTIFICATES_DIR` (`.local/certificados` por defecto), `COOKIE_SECURE`, `PORT` y `API_HOST`. Compose usa además `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `TEST_POSTGRES_PASSWORD`. `COOKIE_SECURE=false` y HTTP son solo para la demo local; una exposición remota requiere HTTPS, `COOKIE_SECURE=true` y origen correspondiente. Los roles PostgreSQL locales son administradores de desarrollo: reducir privilegios antes de producción.

Prisma/adapter-pg 7.10.0, TypeScript 5.9.3, NestJS 12.1.2, React 19.3.0 y Vite 8.3.4 están fijados en el lockfile. `npm run db:generate`, `db:validate`, `db:migrate`, `db:status` y `db:test:migrate` operan sobre las bases identificadas. `db:seed` solo funciona en `siga_dev`/`siga_test` locales. Las propuestas académicas D09–D13 siguen sin aprobación; no cambiar reglas de notas, matrícula o certificados sin revisar [decisiones](docs/DECISIONES.md).

Al retomar, leer `AGENTS.md`, `GUIA_CONSTRUCCION_SIGA_CODEX.txt`, [ESTADO](docs/ESTADO.md), [DECISIONES](docs/DECISIONES.md) y [BACKLOG](docs/BACKLOG.md). Continuar una etapa a la vez y preservar cambios locales. E11 tiene los materiales preparados; continúa pendiente el piloto y la capacitación con participantes.

## Cierre académico local verificado (2026-11-09)

El [plan maestro](PLAN_MAESTRO_ENTREGA.md) y el [plan restante de cierre](PLAN_RESTANTE_CIERRE_MAESTRO.md) (`R-01` a `R-18` / `PB-01` a `PB-30`) se completaron y verificaron sobre el **candidato final congelado** (`a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`):

- **Puerta F (Funcionalidad técnica local):** **26/26 filas técnicas en `PASO`** en la [matriz de trazabilidad](docs/TRAZABILIDAD_ENTREGA.md), respaldadas por:
  - `npm run format:check` y `npm run check` (`0` errores ESLint, `37` pruebas unitarias API, `40` pruebas unitarias Web, compilación API + Web).
  - `npm run test:coverage` (`16` suites / `131` pruebas aprobadas en PostgreSQL 18.6 real; **`94,94 %` líneas** y **`82,49 %` ramas** globales; 14 archivos con `>= 70 %` líneas y `>= 70 %` ramas — ver [inventario de cobertura](docs/INVENTARIO_COBERTURA_REGLAS.md)).
  - `npm run test:e2e -- --workers=1` (**`34/34` pruebas aprobadas** en escritorio `1366x900` y móvil `360x800`, `0` skips, incluyendo navegación solo con `Tab` y zoom `200 %`).
  - `node scripts/test-load.mjs` y `node scripts/test-load.mjs --unicode` (`780` solicitudes medidas por operación, `0 %` errores, `p95 < 2.000 ms` en las 5 operaciones: reporte `204 ms`, oferta `421,24 ms`, matrícula `581,41 ms`, PDF latino `627,80 ms` y **PDF Unicode `670,84 ms`** — ver [rendimiento](docs/RENDIMIENTO_DEMOSTRACION.md)).
  - `node scripts/test-backup-restore-local.mjs --packaged` (4 migraciones, 16 tablas, 2 PDFs — latino y Unicode — y simulacro de pérdida total con **`RTO = 9,47 s` (`<= 4 h`)** y **`RPO = 1,18 s` (`<= 24 h`)** — ver [respaldo y restauración](docs/OPERACION_RESPALDO_RESTAURACION.md)).
- **Puerta A (Aceptación académica y cierre humano):** **28/31 filas verificadas técnicamente (`26` técnicas + `ENT-TGS` + `ENT-DOC`); `3/31` filas transversales (`ENT-SCRUM`, `ENT-XP`, `ENT-ACE`) y `0/31` firmas en `A` pendientes** de ejecución del piloto presencial y firma del Responsable Académico (`RA`) en el [dossier de cierre local](docs/evidencias/CIERRE_LOCAL.md).
