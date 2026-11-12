# PB-21: respaldo y restauracion con imagenes empaquetadas

Fecha: 6 de noviembre de 2026, America/Mexico_City. Ejecutor: subagente de entrega. La aceptacion humana del cierre sigue pendiente.

Se construyeron las imagenes `migrate` y `runtime` desde `apps/api/Dockerfile` y `runtime` desde `apps/web/Dockerfile`. Se compilo tambien la API en el host para preparar los datos ficticios. Despues se ejecuto `node scripts/test-backup-restore-local.mjs --packaged` con las tres imagenes especificadas. La prueba creo un proyecto Compose, base y almacenamiento propios y los retiro al concluir; no retuvo una copia de respaldo utilizable.

- API: `sha256:71f6f28f370bbddcaac7f53befdf96c81630b3c9a5424e491cc40cc02573f6f7`.
- Web: `sha256:290e58633ece62bcf0531824c7ef0ede2d659ceec5db526efc55ab459849ce4c`.
- Migraciones: `sha256:453bef752210991049c4384ee04aaa39bb48a90c578d18fb5576a03fea2c16a4`.
- Huella de fuentes y configuracion antes y despues: `ee233a64767faceb1ca5d7e3528b77ba17b2ee8e1d7760fd1d75efbad1c057a1`. Se obtuvieron los archivos con `rg --files apps/api apps/web packages/contracts scripts`, excluyendo directorios `dist`, `generated`, `node_modules` y archivos `scripts/.tmp-*`; se agregaron `package.json`, `package-lock.json`, `.npmrc`, `tsconfig.base.json` y `.dockerignore`, se ordenaron rutas unicas, se calculo SHA-256 de cada archivo y de la lista resultante. Esta huella identifica ese conjunto, no todos los archivos del proyecto.

Resultado: **PASO**. La web sirvio HTML y JavaScript; se aplicaron cuatro migraciones; la restauracion comparo 16 tablas y un PDF de 5105 bytes con huella identica. La API restaurada respondio salud, inicio de sesion y consulta 200, constancia vigente, descarga con hash correcto y cierre 204. El rol de aplicacion no tenia privilegios DDL. La alteracion deliberada del PDF respaldado fue rechazada. Los datos y credenciales fueron ficticios y no se almacenan en esta evidencia.

La corrida empaquetada del 5 de noviembre probo imagenes anteriores, antes de cambios posteriores de PDF y matricula: API `sha256:10aba99cf165cc7316d4722ecfd4cb6d0aa23bbb61c9ff722c7581a88954f22a`, web `sha256:10907c5cacb813f3cc23145e225377b877dab36ab4f90e096c91c0eb2708fd7a` y migraciones `sha256:e857167d7d1ffba3916f50edc5aadee1a31772a3097fbc8dad99c29766a3cf8d`. En esa corrida el PDF ficticio tenia 21 738 bytes; en la actual tiene 5105. Son documentos de ensayos diferentes: la integridad se compara con la huella guardada en cada propio respaldo, no por igualdad entre ambas corridas.

La prueba restaura una copia temporal y no demuestra una recuperacion completa de una instalacion perdida. No mide el tiempo operativo real ni el punto de perdida de datos; D46, custodia, retencion y persona responsable de restauracion requieren comprobacion y acuerdo. Cambios posteriores del candidato exigen repetir las verificaciones afectadas.

## Repeticion despues de corregir el proxy

El mismo 6 de noviembre se repitio la prueba despues de reconstruir la imagen web para corregir la cabecera duplicada. **PASO**: cuatro migraciones, 16 tablas, PDF ficticio de 5112 bytes con huella coincidente, login/consulta/descarga y rechazo de alteracion. La imagen API continuo siendo `sha256:71f6f28f370bbddcaac7f53befdf96c81630b3c9a5424e491cc40cc02573f6f7`, la web corregida fue `sha256:500b140d977c4b9e11dbe9164be98f1a5cc393b51055af7f1cfcdc90b1542664` y la de migraciones continuo siendo `sha256:453bef752210991049c4384ee04aaa39bb48a90c578d18fb5576a03fea2c16a4`. Con el mismo procedimiento de huella descrito arriba, el conjunto de fuentes/configuracion dio `6200d6f6e0c7eaec315bd7b0b1b4010a3cf517f108946999f06805d2cc49a00a` antes y despues. La corrida anterior de esta pagina conserva valor historico, pero no verifica la web corregida. Persisten los limites de recuperacion real y D46.

## Verificacion sobre el candidato final y simulacro de recuperacion tras desastre (9 de noviembre de 2026)

Fecha: 9 de noviembre de 2026. Candidato final congelado con huella de fuentes y configuracion `a91cd90779ca0a5e5e0faaa7d6f41d212d3417686262ef03c3a41660d0c4bbb8` (147 archivos). Registro estructurado completo en `docs/evidencias/restauracion-candidato.json`.

- **Imagenes verificadas del candidato final:**
  - API (`siga-candidato-api:local`): `sha256:f76daa3abd3c9d46ddfb22fe5f46a268c61c4065e149179aa4eb390e997c90f2`
  - Web (`siga-candidato-web:local`): `sha256:1833bbefadd85a35ced6d4183f7f6080ea0e89a710d444fa4c56ca5face8cc7e`
  - Migraciones (`siga-candidato-migrate:local`): `sha256:8e05743050a9c55d5298b5fa903f25324f872473b675957e9654518ad66987c8`
- **Constancias emitidas, respaldadas y restauradas:**
  - PDF latino (`CERT-2026-000001`): `5105` bytes, SHA-256 `98fb28a9734eee77bbca63c662f13f81da8e0fde3925a2d1d2ad2800bc82d99a`.
  - PDF Unicode cirilico/CJK (`CERT-2026-000002`): `20267` bytes, SHA-256 `3009412bc7c9de7958ed588aa64c17a9e3f3ef4fd94e2b5e0f01f7e8f560e1e0`.
- **Tiempos y metas D46 acreditadas:**
  - Duracion del respaldo (`backup-docker-local.mjs`): `3523,18 ms`.
  - Duracion de la verificacion aislada (`verify-docker-restore.mjs`): `3962,15 ms` (4 migraciones, 16 tablas, 2 PDFs integros y rechazo de alteracion deliberada).
  - Simulacro de recuperacion operativa tras `docker compose down --volumes --remove-orphans`: **RTO = `9466,81 ms` (`9,47 s` <= 4 h)** y **RPO = `1184,82 ms` (`1,18 s` <= 24 h)**, verificando salud HTTP 200 en API y proxy web, login, consulta autenticada, verificacion publica y descarga integra de ambos PDFs con sus huellas SHA-256 originales.
  - Copia retenida en `.local/backups/retenido-candidato` con permisos `0700` en directorios y `0600` en archivos.
