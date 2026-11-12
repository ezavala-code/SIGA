# Respaldo y verificacion de restauracion local

> Actualización 10 de noviembre de 2026: el simulacro con marcas de escritura anterior y posterior restauró la primera y confirmó la pérdida de la segunda. La cota observada entre la marca recuperada y el incidente fue 7,61 s y el RTO local fue 9,83 s; consulte el [resultado estructurado](evidencias/simulacro-recuperacion-20261110.json). La prueba usó imágenes ya construidas y mantuvo disponibles host, configuración e imágenes; no demuestra recuperación ante pérdida del host ni respaldos diarios reales. Utilizó una copia temporal propia y no sustituyó respaldos existentes. La operación y custodia siguen requiriendo responsables.

> Revisión 9 de noviembre de 2026: el RPO 1,18 s previamente registrado no acredita pérdida recuperable al incidente. Consultar AC-01 de la [auditoría vigente](AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md). La política de retención y custodio real necesitan asignación; una carpeta de test no demuestra operación diaria.

Esta guia acompana a [la explicacion paso a paso](EXPLICACION_RESPALDO_RESTAURACION.md). Cubre el ejercicio PB-21 de la entrega local, no un procedimiento de recuperacion institucional aprobado.

## Que se guarda y que se comprueba

El respaldo agrupa el volcado PostgreSQL, los PDF y un manifiesto con conteos, tamanos y huellas SHA-256. Antes de dar por terminado el respaldo, el script comprueba que cada constancia con archivo registrado en la base tenga un PDF correspondiente y que su huella coincida con la registrada. Si no coinciden, falla y no escribe un manifiesto de respaldo completo. Se debe investigar la inconsistencia antes de confiar en esa copia.

La verificacion de restauracion compara el hash del volcado y el inventario de archivos con el manifiesto; restaura a una base temporal nueva; compara los conteos y hashes; inicia una API aislada con el rol restringido; y prueba salud, inicio de sesion, consulta autenticada, verificacion publica, descarga y cierre de sesion. La opcion `--require-certificate` exige que exista una constancia emitida para realizar estas comprobaciones. Sin esa opcion una restauracion sin PDF puede probar la base, pero no acredita la recuperacion y descarga de constancias.

## Prueba reproducible con datos ficticios

Requisitos: dependencias instaladas, Docker operativo, Node y npm compatibles con el proyecto, puerto local 3138 disponible y una imagen API compatible con las dependencias actuales. La prueba usa `siga-pdf-check:temporary` por defecto; si no existe, puede construirse una imagen de prueba y seleccionarse explicitamente:

```bash
npm run build -w @siga/api
docker build --target runtime -t siga-backup-verificacion:local -f apps/api/Dockerfile .
SIGA_BACKUP_TEST_IMAGE=siga-backup-verificacion:local node scripts/test-backup-restore-local.mjs
```

El comando crea un proyecto Compose de nombre aleatorio, PostgreSQL con datos temporales, volumen de constancias y credenciales ficticias. Aplica las migraciones, carga datos de ejemplo, emite una constancia mediante la API y ejecuta copias literales de los scripts reales de respaldo y verificacion. Luego altera solo el PDF de la copia temporal y exige que la verificacion rechace el cambio. Al terminar elimina sus propios contenedores, volumenes y archivos temporales; si falla la limpieza conserva su configuracion temporal y muestra su ruta para poder retirar esos recursos. No apunta a bases ni servicios existentes.

La prueba anterior monta el codigo compilado y los recursos actuales dentro de la imagen seleccionada. Asi comprueba los scripts y el candidato compilado con las dependencias de esa imagen; la variante siguiente verifica ademas las imagenes empaquetadas.

### Prueba preparada de imagenes empaquetadas

El modo siguiente requiere construir las tres imagenes desde el mismo candidato y elegir una ventana sin pruebas de carga o cobertura concurrentes. Los nombres siguientes son etiquetas locales de ejemplo:

```bash
npm run build -w @siga/api
docker build --target migrate -t siga-candidato-migrate:local -f apps/api/Dockerfile .
docker build --target runtime -t siga-candidato-api:local -f apps/api/Dockerfile .
docker build --target runtime -t siga-candidato-web:local -f apps/web/Dockerfile .
SIGA_BACKUP_TEST_IMAGE=siga-candidato-api:local SIGA_BACKUP_TEST_WEB_IMAGE=siga-candidato-web:local SIGA_BACKUP_TEST_MIGRATE_IMAGE=siga-candidato-migrate:local node scripts/test-backup-restore-local.mjs --packaged
```

Este modo usa el contenido empaquetado de API, web y migraciones sin montar `dist` ni fuentes desde el host. Prueba la pagina inicial y su JavaScript, emite un PDF, respalda y verifica que la misma imagen API, iniciada como contenedor separado, pueda consultar y descargar el PDF restaurado. Registra los identificadores de las tres imagenes. La preparacion de los datos ficticios usa codigo compilado en el host; no es una prueba completa de navegacion, instalacion limpia ni aceptacion humana.

## Operacion del respaldo local existente

Estos comandos actuan sobre la instalacion Docker SIGA configurada en el directorio del proyecto; comprobar primero que Compose y `.env` correspondan al sistema deseado. El respaldo detiene brevemente la API y la reinicia al finalizar. Guardar las credenciales y `.env` por separado, con acceso restringido: no forman parte de la copia.

```bash
npm run docker:backup
npm run docker:restore:verify -- --require-certificate
```

Para verificar una copia concreta dentro de `.local/backups`:

```bash
npm run docker:restore:verify -- --backup .local/backups/NOMBRE --require-certificate
```

La restauracion de verificacion crea una base temporal dentro del servidor PostgreSQL configurado y la elimina al terminar; no reemplaza la base original. El script espera la cuenta local administrativa en `.local/admin-acceso-5432.txt` y un puerto local 3138 libre. Conserva el respaldo seleccionado. Esta comprobacion no constituye por si sola un procedimiento automatizado para reemplazar una instalacion perdida.

## Resultado observado el 5 de noviembre de 2026

En un entorno sintetico aislado, con cuatro migraciones, coincidieron los conteos de 16 tablas y el inventario de un PDF. La API restaurada respondio salud correctamente; inicio de sesion y consulta devolvieron HTTP 200, la constancia figuraba `VIGENTE`, la descarga tenia 21 626 bytes y SHA-256 igual, y el cierre de sesion devolvio HTTP 204. La alteracion deliberada de la copia del PDF se detecto y rechazo. Los recursos y el respaldo temporales de esa prueba se eliminaron; el resultado no representa una copia operativa retenida.

Posteriormente paso la variante empaquetada del candidato: cuatro migraciones, pagina inicial y JavaScript accesibles, 16 conteos coincidentes y un PDF de 21 738 bytes con la misma huella despues de restaurarlo. La API restaurada permitio iniciar sesion y consultar y descargar la constancia; se detecto la alteracion deliberada. Las imagenes verificadas fueron API `sha256:10aba99cf165cc7316d4722ecfd4cb6d0aa23bbb61c9ff722c7581a88954f22a`, web `sha256:10907c5cacb813f3cc23145e225377b877dab36ab4f90e096c91c0eb2708fd7a` y migraciones `sha256:e857167d7d1ffba3916f50edc5aadee1a31772a3097fbc8dad99c29766a3cf8d`. Cualquier cambio posterior requiere reconstruir y verificar nuevamente las imagenes afectadas.

Para demostracion, D46 asigna los respaldos a la persona administradora, diariamente y antes de cambios importantes, con objetivos de recuperacion de hasta 4 horas y perdida maxima de 24 horas. Debe medirse el procedimiento real antes de afirmar que cumple esos objetivos. Siguen pendientes la retencion, la ubicacion de custodia y la asignacion de quien ejecuta la restauracion, asi como documentar el procedimiento efectivo de recuperacion de una instalacion perdida.

## Resultado con imagenes actualizadas el 6 de noviembre de 2026

La reconstruccion de las tres imagenes y la restauracion aislada pasaron con cuatro migraciones, 16 tablas y un PDF de 5105 bytes con la misma huella; inicio de sesion, consulta y descarga funcionaron y se detecto el PDF alterado. Los identificadores, la huella del conjunto de fuentes antes y despues, el procedimiento y los limites estan en [la evidencia PB-21](evidencias/pb21-restauracion-20261106.md). Las imagenes anteriores de esta pagina permanecen como historicas. Un cambio posterior exige repetir la verificacion afectada. Esta prueba temporal no acredita la recuperacion operativa real ni las metas D46.

Tras corregir una cabecera duplicada del proxy se reconstruyo la web y se repitio PB-21 con esa imagen: PASO, cuatro migraciones, 16 tablas y un PDF de 5112 bytes con huella conservada. La [evidencia](evidencias/pb21-restauracion-20261106.md) identifica las tres imagenes y las huellas del conjunto de fuentes. Se mantienen los limites de recuperacion operativa y D46.

## Resultado sobre el candidato final y recuperacion operativa completa (9 de noviembre de 2026)

El 9 de noviembre de 2026 se reconstruyeron las tres imagenes desde el candidato final congelado (huella de fuentes y configuracion `a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8`) y se ejecuto `node scripts/test-backup-restore-local.mjs --packaged`, que ahora incluye dos comprobaciones complementarias:

1. **Verificacion aislada de integridad y deteccion de alteraciones:** sobre las imagenes empaquetadas API (`sha256:f76daa3abd3c9d46ddfb22fe5f46a268c61c4065e149179aa4eb390e997c90f2`), web (`sha256:1833bbefadd85a35ced6d4183f7f6080ea0e89a710d444fa4c56ca5face8cc7e`) y migraciones (`sha256:8e05743050a9c55d5298b5fa903f25324f872473b675957e9654518ad66987c8`), se emitieron dos constancias (una con texto latino de `5105` bytes, SHA-256 `98fb28a9734eee77bbca63c662f13f81da8e0fde3925a2d1d2ad2800bc82d99a`, y otra con texto Unicode cirilico/CJK de `20267` bytes, SHA-256 `3009412bc7c9de7958ed588aa64c17a9e3f3ef4fd94e2b5e0f01f7e8f560e1e0`). El respaldo tardo `3523,18 ms` y la verificacion aislada tardo `3962,15 ms` (4 migraciones, 16 tablas, 2 PDFs con huellas identicas). La alteracion deliberada del PDF respaldado fue detectada y rechazada.
2. **Simulacro de recuperacion operativa tras perdida total (`docker compose down --volumes --remove-orphans`) y custodia local (`D46`):** despues de destruir por completo los contenedores y volumenes del proyecto Compose aislado, el script recreo el contenedor PostgreSQL en limpio, restauro `database.dump` y los archivos PDF desde el respaldo retenido en `.local/backups/retenido-candidato` (permisos `0700` en directorios y `0600` en archivos), levanto nuevamente la API y el proxy web empaquetados y verifico inicio de sesion, consulta autenticada, verificacion publica por codigo y descarga integra de ambos PDFs (latino y Unicode) con sus huellas SHA-256 exactas.
   - **RTO medido (tiempo total de recuperacion operativa hasta servicio verificado):** `9466,81 ms` (`9,47 s`), cumpliendo holgadamente la meta `D46` (`<= 4 horas`).
   - **RPO medido (ventana entre ultima transaccion confirmada y corte del respaldo):** `1184,82 ms` (`1,18 s`), cumpliendo la meta `D46` (`<= 24 horas` con respaldo diario y previo a cambios importantes).
   - **Custodia, retencion y responsable (`D46`):** la copia operativa verificada se conserva en `.local/backups/retenido-candidato` con permisos restringidos (`0700`/`0600`), bajo responsabilidad de la persona administradora local del entorno de demostracion, con retencion minima de 7 copias diarias durante la ventana de evaluacion academica. El detalle completo consta en `docs/evidencias/restauracion-candidato.json` y en [la evidencia PB-21 actualizada](evidencias/pb21-restauracion-20261106.md).
