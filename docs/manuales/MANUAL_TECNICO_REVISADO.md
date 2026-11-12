# Manual técnico revisado de SIGA

Versión documental 3.0 · 9 de noviembre de 2026 · aplicación 0.1.0. Alcance: demostración académica local con datos ficticios. Complementa y corrige el manual técnico 2.0; no acredita por sí solo instalación en otra plataforma ni aceptación institucional.

## 1. Arquitectura y responsabilidades

SIGA es un monorepositorio npm. React/Vite presenta pantallas por rol; NestJS recibe peticiones HTTP, valida contratos, autentica y autoriza; Prisma y PostgreSQL mantienen datos, restricciones y transacciones. Nginx sirve la web compilada y reenvía `/api` a la API en Compose. Los PDFs se guardan en un directorio privado persistente; la base conserva snapshot, estado, código y hash.

| Directorio            | Responsabilidad                                                                       |
| --------------------- | ------------------------------------------------------------------------------------- |
| apps/web/src/app      | Pantallas, navegación, formularios y borradores docentes.                             |
| apps/web/src/services | Clientes HTTP, generación de sesión y rechazo de respuestas obsoletas.                |
| apps/api/src/modules  | Autenticación, catálogos, personas, oferta, matrícula, notas, constancias y reportes. |
| apps/api/prisma       | Modelo y cuatro migraciones; no editar migraciones ya aplicadas.                      |
| packages/contracts    | Tipos compartidos; la validación de seguridad permanece en servidor.                  |
| scripts               | Preparación, pruebas aisladas, provisión, respaldo, restauración y despliegue local.  |
| tests/e2e             | Recorridos de navegador y escenarios de error.                                        |
| docs/evidencias       | Registros históricos y dossier; consultar reservas de auditoría.                      |

Recorrido de información: navegador → API → PostgreSQL → respuesta → pantalla. Una nota guardada modifica historial y avance, puede habilitar un prerrequisito y queda en auditoría. Una constancia emitida conserva su snapshot aunque después se corrija la nota.

## 2. Modelo relacional y reglas de integridad

| Relación                                             | Uso y restricción relevante                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Usuario → Sesion                                     | Cuenta con rol y hash; sesiones revocables. Nunca exportar hashes/tokens en reportes.      |
| Programa → PlanEstudio → PlanAsignatura → Asignatura | Versiones de plan y créditos; dar de baja conserva relaciones históricas.                  |
| PlanAsignatura → Prerrequisito                       | Grafo de asignaturas requerido para elegibilidad; proteger ciclos y referencias inválidas. |
| Usuario → Estudiante → PlanEstudio                   | Identidad académica y plan del alumno.                                                     |
| Usuario → Docente → Grupo                            | Identidad docente y asignación de grupos.                                                  |
| PoliticaAcademica → Periodo → Grupo                  | Escala, mínima, precisión, intentos; fechas y ventana; oferta y cupo.                      |
| Grupo + Estudiante → Inscripcion                     | Nota final, versión y créditos snapshot; unicidad estudiante/asignatura/periodo.           |
| Estudiante → Certificado                             | Snapshot, tipo, código, estado, ruta/hash y vínculo de reemisión.                          |
| Usuario → Auditoria                                  | Actor, acción, recurso y antes/después; no es un log de secretos.                          |

Fuente exacta de campos/tipos: `apps/api/prisma/schema.prisma`; relaciones detalladas en `docs/modelo-datos.md`. Hay 15 modelos de dominio y una tabla interna de migraciones de Prisma: 16 tablas en total.

Matrícula utiliza transacciones serializables, orden de bloqueos y reintentos limitados. La cola local por grupo reduce contención en una instancia, pero la garantía de cupo depende de PostgreSQL. Notas usan control de versión y auditoría atómica; conflictos concurrentes deben traducirse a 409. Los cálculos usan Decimal, distinguen cero de pendiente y conservan todos los intentos.

## 3. Requisitos y plataformas

- Node.js 24.19.x y npm 12.2.x, según package.json y .node-version.
- PostgreSQL 18.6 y Docker/Compose para el recorrido empaquetado; espacio para imágenes, datos y respaldos.
- Puertos locales disponibles: web Compose 8080, PostgreSQL Compose 5432; desarrollo web 5173 y API 3000. Pueden cambiar mediante configuración compatible.
- Las herramientas PowerShell de clústeres nativos y bootstrap Docker requieren PowerShell/Windows o un entorno expresamente compatible. No copiar esos comandos a Bash suponiendo equivalencia.
- La provisión genérica de cuentas está limitada a POSIX, base local siga_dev y entorno no productivo. Su disponibilidad no acredita el mismo flujo en Windows o dentro de Docker de producción.

La instalación limpia registrada se realizó en Linux con Node 24.19.0 y npm 12.2.0. La documentación histórica incluye recorridos Windows; validar el recorrido elegido en el equipo receptor antes de dar portabilidad por terminada.

## 4. Configuración, variable por variable

No se incluyen valores reales. `.env.example` es plantilla; `.env` es privado. `npm run setup` genera valores aleatorios si falta el archivo y conserva los existentes. No ejecutar configuración contra una instalación desconocida.

| Variable                                        | Propósito y condición                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| NODE_ENV                                        | development, test o production. Compose usa production aunque el alcance sea demo local.         |
| PORT                                            | Puerto HTTP API, entero 1–65535; predeterminado 3000.                                            |
| API_HOST                                        | 127.0.0.1 para API nativa; 0.0.0.0 dentro de contenedor.                                         |
| WEB_ORIGIN                                      | Un único origen con protocolo/host/puerto y sin ruta; debe coincidir con navegador para CSRF.    |
| DATABASE_URL                                    | Conexión PostgreSQL con nombre de base; contiene secreto. API Compose utiliza rol de aplicación. |
| TEST_DATABASE_URL                               | Base independiente terminada en _test; nunca usar como alternativa la base de desarrollo.        |
| POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB | Propietario, secreto y base de Compose; reservar propietario para operación/migraciones.         |
| POSTGRES_APP_USER / POSTGRES_APP_PASSWORD       | Rol API limitado sin administración ni cambios de auditoría.                                     |
| POSTGRES_PORT                                   | Puerto de base expuesto sobre loopback; comprobar colisiones.                                    |
| TEST_POSTGRES_PASSWORD                          | Contraseña de la instancia de pruebas de Compose.                                                |
| WEB_PORT                                        | Puerto de Nginx local; predeterminado 8080.                                                      |
| SIGA_VERSION                                    | Etiqueta de imágenes de aplicación y manifiestos de release; no sustituye hash de fuentes.       |
| JWT_SECRET                                      | Secreto aleatorio base64url de al menos 32 bytes; validación exige 43 caracteres o más.          |
| JWT_TTL_SECONDS                                 | Vida de sesión de 300 a 3600 segundos; predeterminado 1800.                                      |
| COOKIE_SECURE                                   | false para HTTP local; exposición HTTPS requiere configuración propia verificada.                |
| EXIGIR_PRERREQUISITOS                           | true/false; predeterminado true. Registrar cualquier cambio como política de demo.               |
| CERTIFICATES_DIR                                | Directorio privado: .local/certificados en desarrollo, /data/certificados en Compose.            |

D44 fija America/Mexico_City para la ventana de demo; no existe una variable genérica que cambie por sí sola esta regla. Revisar `mexico-city-datetime.ts` antes de modificarla.

## 5. Instalación Compose paso a paso

Este procedimiento inicia una instalación propia nueva. Primero comprobar qué proyecto/puertos/volúmenes ya existen y conservar los datos. No usar borrado de volúmenes como método de reparación.

1. Abrir una terminal en la raíz y comprobar `node --version`, `npm --version`, `docker --version` y `docker compose version`.
2. Ejecutar `npm ci` para instalar exactamente el lockfile en una copia nueva.
3. Ejecutar `npm run setup`. Revisar en privado las variables y permisos del archivo creado; no imprimir la URL de base con contraseña.
4. Ejecutar `docker compose config --quiet` para validar configuración y `docker compose up -d --build --wait` para construir/arrancar el stack propio.
5. Comprobar `docker compose ps`. El servicio migrate aplica las cuatro migraciones; db-permissions prepara rol limitado; certificados-permisos prepara el volumen PDF.
6. Abrir `http://localhost:8080` y comprobar `http://localhost:8080/api/health`. Salud no sustituye una prueba de acceso/datos.
7. Para semilla y administrador en el recorrido Windows documentado, usar `npm run docker:admin:bootstrap`. Este comando es PowerShell; revisar `scripts/bootstrap-docker.ps1` y no asumir que existe un equivalente Bash autorizado.
8. Entregar credenciales por canal privado y probar login con los roles preparados. Los perfiles prefijados de demostración no sustituyen el alta/provisión de cualquier persona.
9. Registrar versiones, migraciones y prueba realizada. `db:seed` siembra ICO-F19; el segundo programa sintético de fixtures no se instala automáticamente por esa semilla.

Para parar solo esta instalación usar `docker compose stop`. No se incluye un comando de borrado masivo en el manual de operación normal.

## 6. Desarrollo nativo y acceso genérico

En el recorrido Windows existente: `npm ci`, `npm run setup -- --native`, `npm run db:local:start`, `npm run db:migrate`, `npm run db:seed`, `npm run db:test:migrate`, `npm run auth:bootstrap:admin`, `npm run dev`. `db:local:start` es PowerShell y administra clústeres privados en 55432/55433. En POSIX, preparar PostgreSQL propio y URLs válidas de desarrollo/pruebas; no existe aquí una receta nativa universal acreditada para todos los sistemas.

El portal nativo está en `http://localhost:5173`, salud API en `http://127.0.0.1:3000/health`. WEB_ORIGIN debe coincidir con el origen del portal. No iniciar simultáneamente procesos que compitan por 3000/5173.

Para habilitar o restablecer una persona arbitraria ya creada y activa en POSIX local:

```bash
npm run auth:provision:local -w @siga/api -- persona@example.invalid
```

El correo debe corresponder a un estudiante o docente existente, no un administrador. El CLI comprueba entorno no productivo, conexión local y base siga_dev; genera un archivo privado, activa la cuenta, revoca sesiones y audita. La ruta del archivo se informa; la contraseña no se imprime. El directorio es privado 0700 y el archivo 0600. Conservar o entregar por canal privado. Ante error, revisar su causa y comprobar el estado antes de reintentar.

No existen los comandos `npm run provision:local` ni `auth:bootstrap:demo` en los manifiestos auditados. No utilizarlos. Para administrador se usa el bootstrap separado; no reutilizar provisión docente/estudiante.

## 7. API, contratos y permisos

Las rutas siguientes son de API; en Compose se antepone `/api`. En desarrollo se llama al puerto 3000. La tabla es mapa operativo de familias, no sustituto del inventario exhaustivo de aliases/controladores.

| Método y ruta                                                                                               | Rol y datos relevantes                                                                                   |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| POST /auth/login                                                                                            | Público; correo/contraseña; devuelve perfil y CSRF y establece cookie.                                   |
| GET /auth/me; POST /auth/logout                                                                             | Sesión propia; logout protegido revoca sesión.                                                           |
| GET /auth/usuarios; GET /auth/usuarios/:id                                                                  | Administración o titular según ruta; no devolver hashes.                                                 |
| GET/POST /catalogos/programas, /catalogos/asignaturas, /catalogos/planes                                    | Administración; validaciones de claves, referencias y estado.                                            |
| PATCH /catalogos/programas/:id, /catalogos/asignaturas/:id, /catalogos/planes/:id                           | Administración; cambios/bajas según restricciones históricas.                                            |
| GET/POST /personas/estudiantes, /personas/docentes; PATCH /personas/estudiantes/:id, /personas/docentes/:id | Administración; alta académica no entrega acceso automáticamente.                                        |
| GET/POST /periodos, /grupos; PATCH /periodos/:id, /grupos/:id                                               | Administración; fechas/estado/cupo y referencias.                                                        |
| GET /docentes/me/grupos; GET /docentes/me/grupos/:grupoId/calificaciones                                    | Docente asignado; propiedad derivada de sesión.                                                          |
| GET /matriculas/oferta; GET /matriculas/me; POST /matriculas                                                | Estudiante; POST recibe grupoId y revalida elegibilidad.                                                 |
| PUT /calificaciones/:inscripcionId                                                                          | Docente asignado; notaFinal decimal como texto, version y motivo al corregir. Existen aliases PATCH/PUT. |
| GET /estudiantes/me/calificaciones, /estudiantes/me/progreso                                                | Estudiante; historial y avance propios.                                                                  |
| POST /certificados; GET /certificados/me                                                                    | Estudiante; emisión y listado propios.                                                                   |
| GET /certificados; POST /certificados/estudiantes/:estudianteId                                             | Administrador; listado y emisión de estudios del estudiante seleccionado.                                |
| POST /certificados/:id/recuperar                                                                            | Titular o administrador según autorización; finalizar pendiente/fallido sin duplicar.                    |
| GET /certificados/:id/pdf                                                                                   | Titular o administrador; autorización y comprobación de hash.                                            |
| POST /certificados/:id/revocar                                                                              | Administrador; motivo y auditoría.                                                                       |
| POST /certificados/:id/reemitir                                                                             | Titular o administrador conforme al estado del documento.                                                |
| GET /certificados/verificar/:codigo                                                                         | Público; estado y datos mínimos, sin notas/correo/matrícula.                                             |
| GET /reportes/grupos; GET /reportes/auditoria                                                               | Administrador; filtros y paginación.                                                                     |
| GET /reportes/grupos/:grupoId/historial.csv                                                                 | Administrador o docente asignado; CSV seguro.                                                            |

Ejemplo de intención de matrícula: `{"grupoId":"ID_SINTETICO"}`. Ejemplo de nota: `{"notaFinal":"8.50","version":1}`; para corrección añadir motivo. Usar los contratos actuales de `packages/contracts` para campos completos y errores por endpoint; no enviar estos IDs literales a una instalación real.

Las escrituras protegidas requieren sesión, origen permitido y encabezado X-CSRF-Token. No guardar tokens en manuales/logs. El servidor verifica rol y recurso aunque la pantalla o la URL se cambien.

| Respuesta | Interpretación y acción                                                                      |
| --------- | -------------------------------------------------------------------------------------------- |
| 400       | Datos o formato inválidos; corregir campos.                                                  |
| 401       | Sesión inexistente/vencida/revocada; volver a entrar sin reutilizar caché privada.           |
| 403       | Rol/recurso/origen/CSRF no permitido; revisar sesión y configuración, no evadir control.     |
| 404       | Recurso/ruta no disponible o no visible; comprobar identificador y permiso.                  |
| 409       | Conflicto de negocio, cupo, versión o estado; refrescar y decidir sobre datos vigentes.      |
| 429       | Límite temporal de acceso; esperar y revisar intentos.                                       |
| 5xx       | Error operativo; conservar evidencia saneada, verificar estado antes de duplicar una acción. |

## 8. Respaldo, restauración y límites D46

Respaldar diariamente y antes de cambios importantes. El respaldo debe contener `database.dump`, manifiesto y archivos PDF; no confundir con un SQL plano. Usar `npm run docker:backup` en instalación propia configurada. Comprobar salida y permisos; conservar fuera del host una copia protegida según política acordada.

Para verificar una copia sin reemplazar la base original:

```bash
npm run docker:restore:verify -- --backup .local/backups/NOMBRE --require-certificate
```

El verificador levanta recursos temporales de su propiedad, compara datos/archivos e inicia API recuperada; requiere base configurada, cuenta privada administrativa y puerto 3138 disponible según script. No es el mismo procedimiento que restaurar automáticamente la instalación principal.

La prueba `node scripts/test-backup-restore-local.mjs --packaged` recrea un stack aislado y comprueba dos PDFs, login y hash. El registro reportó RTO 9,47 s; el cálculo publicado de RPO 1,18 s no mide el desfase recuperable al incidente y debe corregirse. La auditoría no volvió a ejecutar ese simulacro.

Para un incidente real: identificar instalación y respaldo, preservar datos/archivos actuales, detener escrituras de ese entorno, preparar instalación compatible aislada, restaurar dump y PDFs siguiendo las herramientas verificadas, reponer configuración privada, validar migraciones/roles/login/registros/hashes y solo después decidir la sustitución con la persona responsable. No improvisar comandos destructivos. Falta acreditar una guía ejecutable completa para el entorno receptor y el RPO corregido.

Medir RTO desde inicio del incidente hasta servicio utilizable y comprobado. Medir recuperación de datos con marcas persistidas anteriores y posteriores al respaldo, comparadas después de restaurar. Antigüedad del respaldo o duración de exportación no prueban por sí solas datos perdidos. Objetivos provisionales: RTO máximo 4 h y RPO máximo 24 h. Una copia retenida de test no demuestra una retención diaria operada; asignar custodio, destino y calendario reales.

## 9. Constancias e incidentes

Si una emisión se interrumpe, consultar su estado antes de repetir. Recuperar mediante flujo de aplicación solo cuando corresponda a PENDIENTE/FALLIDO; la recuperación debe finalizar una sola emisión. Revocar requiere motivo. Reemitir enlaza reemplazo, sin alterar el PDF previo.

`node scripts/conciliar-certificados.mjs` es diagnóstico: revisar su configuración y guía antes de usarlo. Los candidatos a huérfanos requieren investigación; un fallo de respuesta no demuestra que la transacción no se confirmara. No borrar PDFs dudosos de forma automática. Referencia: `docs/OPERACION_CONCILIACION_CONSTANCIAS.md`.

Nginx tiene timeout de lectura 5 s y la transacción de certificados admite hasta 20 s. Esto no es un fallo demostrado con latencias actuales; hace falta un ensayo de saturación/timeout y recuperación para documentar el comportamiento. No aumentar límites a ciegas.

## 10. Pruebas, cobertura y releases

| Comando                                  | Alcance                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| npm run check                            | ESLint, tipos, unitarias y builds. No ejecuta integración ni E2E.                                          |
| npm run format:check                     | Formato del repositorio.                                                                                   |
| npm run test:integration                 | PostgreSQL de prueba independiente y esquema temporal.                                                     |
| npm run test:coverage                    | Unitarias/integración, umbrales por archivo seleccionados por runner.                                      |
| npm run test:e2e -- --workers=1          | Navegador con runner aislado; inspeccionar entorno antes de ejecutar.                                      |
| node scripts/test-load.mjs --unicode     | Emisión Unicode, calentamiento 60 s/medición 300 s, tandas de 20. Requiere API compilada y base de prueba. |
| node scripts/test-proxy-local.mjs        | Proxy en recursos propios; imágenes y puertos según script.                                                |
| node scripts/test-certificados-crash.mjs | Interrupción controlada de API temporal; no usar proceso ajeno.                                            |

La cobertura real se configura dinámicamente en `scripts/test-integration.mjs`, no en un archivo jest.coverage.config.cjs. Incluye service/calculo/guard/pdf/cola/provisión; falta reconciliar csrf.ts y mexico-city-datetime.ts con lo declarado por el inventario. El resultado va a `.local/e09-coverage`; CI ejecuta cobertura pero no publica su artefacto actualmente.

En esta auditoría `npm run check` pasó: 6 suites/38 pruebas API y 13 archivos/40 pruebas web, tipos y builds. Integración/E2E/carga/restauración conservan resultados históricos; no se reejecutaron. Los 131 tests y 34 E2E del dossier no equivalen a validación nueva.

Para desplegar un release propio: revisar `npm run docker:deploy` y su respaldo/manifiesto antes de ejecutar. `npm run docker:rollback -- --release .local/releases/release-ETIQUETA.json` exige manifiesto válido y migraciones compatibles; no realiza una reversión arbitraria de esquema.

## 11. Diagnóstico y mantenimiento

1. Identificar versión, entorno y momento del fallo sin imprimir secretos.
2. Consultar `docker compose ps` y salud; revisar logs saneados.
3. Comprobar migraciones y rol de base, origen web, espacio, permisos del directorio PDF y puertos.
4. Consultar estado de la acción antes de reintentar matrícula/nota/constancia.
5. Reproducir solo con datos ficticios en instalación propia; registrar pasos y respuesta esperada/observada.
6. Aplicar corrección mínima y repetir pruebas afectadas. Congelar archivos durante cada verificación.
7. Regenerar inventario de entrega al terminar documentos y asociar pruebas al candidato correcto.

## 12. Fuentes y reservas

Fuentes: package.json, docker-compose.yml, .env.example, environment.ts, controladores, schema.prisma, scripts operativos, README y registros del dossier. La auditoría y pendientes detallados están en `docs/AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md`. No afirmar cierre F/A por la sola existencia de este manual. Datos reales, reglamento institucional, HTTPS público y correo siguen fuera del cierre de demostración acordado.
