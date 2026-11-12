# Evidencia E10: despliegue y recuperación local

Fecha: 11 de octubre de 2026. La prueba usó datos ficticios y Docker Desktop local. No se publicó el sistema, no se creó commit y no se borraron volúmenes originales.

## Entrega

- Compose construye imágenes `siga-api` y `siga-web` con la versión indicada por `SIGA_VERSION`, ejecuta migraciones antes de la API, espera healthchecks y conserva los volúmenes de PostgreSQL y constancias. Los puertos de host se pueden cambiar con `POSTGRES_PORT` y `WEB_PORT`.
- El usuario propietario de PostgreSQL queda para migraciones y respaldos. La API se conecta como `siga_app`, creado por el servicio `db-permissions`: no tiene SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS ni permiso `CREATE` en `public`. Tiene DML de aplicación; UPDATE y DELETE sobre `Auditoria` están revocados. El servicio comprueba esos atributos al iniciar.
- `npm run docker:deploy` pasó preflight (`npm run check`, 18 pruebas API unitarias, 7 web, tipado, lint y builds), integración PostgreSQL (69/69 en nueve suites), configuración Compose y build. Desplegó `0.1.0-e10-20261011055740` tras crear el respaldo previo. Antes/después quedaron las mismas tres migraciones (`20261010030000_inicial`, `20261010030100_integridad`, `20261010030200_identidad_historial`). El manifiesto es `.local/releases/release-0.1.0-e10-20261011055740.json`; smoke: API `ok`, base `up`, web 200.
- `SIGA_VERSION` se persiste en el `.env` local tras un despliegue exitoso o una reversión, para que siguientes comandos Compose usen la etiqueta activa.
- `docker compose exec -T api node -e "console.log(new URL(process.env.DATABASE_URL).username)"` devolvió `siga_app`.

## CP-15: copia limpia y restauración

- Copia limpia: proyecto Compose aislado `sigae10roleclean20261011`, PostgreSQL `127.0.0.1:55444`, web `localhost:18081`, versión `0.1.0-e10-role-clean`. Se construyeron imágenes, se aplicaron las tres migraciones, el rol de aplicación se preparó antes de API, y API/base/web pasaron salud (web 200). Se detuvo el proyecto con `docker compose stop`; sus volúmenes propios se conservaron.
- Respaldo previo final: `.local/backups/e10-2026-10-11T060044-364Z-908a7deb`. El manifiesto registra el dump de `siga_dev`, conteos por tabla, imagen anterior, PDF y SHA-256. La API se detuvo solo durante la instantánea y se reactivó usando el mismo contenedor.
- `npm run docker:restore:verify` restauró ese dump en `siga_restore_e10_83a7bc7785b14c3c8eeb3d11423e1856`; los 16 conteos coincidieron. El PDF restaurado conservó el SHA-256, estado público `VIGENTE` y tamaño de 5,209 bytes. La API aislada, configurada con `siga_app`, pasó health, inicio de sesión HTTP 200, cierre HTTP 204, verificación pública y descarga autenticada del PDF.
- Al finalizar, el verificador eliminó únicamente la base temporal y su carpeta de archivos. Conservó el respaldo completo. Los volúmenes existentes `siga_siga_db` y `siga_siga_certificados` siguieron intactos.

## Reversión y regresión de interfaz

- `npm run docker:rollback -- --release .local/releases/release-0.1.0-e10-20261011052212.json` reactivó la imagen anterior cuando las migraciones coincidían; health reportó API `ok`, base `up` y web 200. La reversión comprueba la lista actual de migraciones y se detiene si el esquema cambió.
- Después del despliegue final con `siga_app`, `SIGA_E2E_BASE_URL=http://localhost:8080 npm run test:e2e` pasó 12/12 en móvil/escritorio e incluyó estudiante, docente y administrador.
- `npm run format:check`, `git diff --check`, `docker compose config --quiet` y `npm audit --omit=dev` pasaron; la auditoría productiva no reportó vulnerabilidades.
- En las corridas de integración se encontró una aserción del listado global que asumía que solo existía un namespace ficticio. Escenarios de concurrencia del mismo esquema temporal pueden dejar más fixtures visibles hasta que el runner elimina el esquema; la prueba ahora verifica los cinco IDs propios y aplica filtros exactos para periodo/auditoría. La suite volvió a pasar 69/69.

## Alcance y pendientes

E10 verifica despliegue, respaldo y recuperación de la demo local HTTP/loopback. No hubo hosting remoto, HTTPS ni ejecución CI remota. Para producción deben configurarse HTTPS, `COOKIE_SECURE=true`, origen permitido y gestión externa de secretos. Vite emite una advertencia no bloqueante: el bundle web de 650.33 kB supera el umbral de recomendación de 500 kB; el build termina correctamente.
