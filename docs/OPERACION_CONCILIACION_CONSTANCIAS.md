# Diagnóstico de constancias locales

El responsable técnico ejecuta `node scripts/conciliar-certificados.mjs` desde la raíz del proyecto con `DATABASE_URL` y `CERTIFICATES_DIR` configuradas para la misma instalación. No se deben imprimir ni compartir las credenciales. El directorio debe existir y ser accesible para el operador. El comando consulta la base y lee los archivos; no modifica ni elimina datos.

El JSON enumera solicitudes `PENDIENTE` o `FALLIDO`, archivos ausentes, hashes diferentes y archivos PDF con nombre propio del sistema que no aparecen en las rutas consultadas. Ante un archivo ausente o hash distinto, conservar la evidencia y restaurar desde un respaldo verificado; no emitir un PDF distinto bajo el mismo hash. Para pendientes o fallidos, comprobar el estado y usar la recuperación autorizada en la aplicación.

Los candidatos sin referencia son una fotografía, no una autorización de borrado: una emisión podría estar en curso o el resultado de un commit ser incierto. Para resolverlos, detener todas las instancias que escriben constancias, respaldar la base y el directorio, volver a ejecutar el diagnóstico, comprobar que no hay operaciones activas y que cada archivo sigue sin referencia, y conservar la evidencia. La eliminación requiere una decisión operativa y una ventana de seguridad apropiada; este comando no la realiza. Repetir el diagnóstico después de cualquier intervención y conservar sus resultados sin secretos.

La prueba automatizada de concurrencia inyecta una reversión posterior a la escritura y ejecuta dos recuperaciones simultáneas sobre PostgreSQL.

## Interrupcion de procesos y resultado incierto

El 6 de noviembre de 2026 se ejecuto `scripts/test-certificados-crash.mjs` con PostgreSQL temporal, esquema aleatorio y carpeta propios. El ensayo inicia trabajadores separados y los detiene con `SIGKILL` en puntos controlados del servicio real:

- Despues de escribir el PDF y actualizar la transaccion, pero antes de confirmar: al morir el proceso se observo el registro `PENDIENTE` y un PDF sin referencia. La recuperacion autorizada termino en `EMITIDO`, con un unico evento de emision.
- Despues de confirmar la transaccion y antes de entregar el resultado al llamador: se encontro el registro `EMITIDO`, el archivo con hash correcto y descarga valida. La nueva recuperacion devolvio conflicto 409 y no duplico la auditoria.

El script usa la API compilada del candidato, aplica migraciones en su esquema, genera datos ficticios y limpia solo ese esquema y su carpeta. Para reproducirlo se necesita una base PostgreSQL de pruebas aislada cuyo nombre termine en `_test`; debe ser distinta de `DATABASE_URL`. Configurar ambas URL sin mostrar contrasenas, ejecutar `npm run build -w @siga/api` y despues `node scripts/test-certificados-crash.mjs`. Las credenciales quedan fuera de los resultados.

El segundo caso confirma el comportamiento al detener el proceso despues del commit y antes de devolver el resultado de servicio. No simula un corte electrico, una caida del servidor PostgreSQL ni la perdida real de una respuesta HTTP. Tampoco autoriza borrar el PDF huerfano: aplicar el diagnostico y las cautelas anteriores.

## Protocolo ante respuesta HTTP perdida tras commit y conciliacion verificada (R-06 / CP-12)

Cuando `POST /certificados` o `POST /certificados/:id/recuperar` confirma la transaccion en PostgreSQL y escribe el archivo en `CERTIFICATES_DIR` (`estado = 'EMITIDO'`, `archivoRuta` y `archivoSha256` registrados), pero la conexion HTTP se cierra o el cliente pierde la respuesta antes de recibirla:

1. **Consulta previa de estado:** el cliente consulta `GET /certificados/me` (o `GET /certificados` desde administracion) antes de solicitar una nueva emision. La constancia confirmada aparece en estado `EMITIDO` con su codigo verificable de 32 caracteres hexadecimales.
2. **Descarga y verificacion:** `GET /certificados/:id/pdf` entrega el PDF confirmado comprobando en tiempo constante que su hash `SHA-256` coincida con `archivoSha256`, y `GET /certificados/verificar/:codigo` devuelve estado `VIGENTE`.
3. **Reintento de recuperacion bloqueado sin efectos secundarios:** si el cliente invoca `POST /certificados/:id/recuperar` sobre esa constancia ya confirmada, el servicio responde `409 Conflict` (`La constancia ya fue finalizada o no existe.`), conserva intacto el archivo PDF en disco, no escribe archivos adicionales, no crea una segunda constancia y mantiene exactamente un registro en `Auditoria` con accion `EMITIR_CERTIFICADO`.
4. **Conciliacion verificada en pruebas de integracion:** en `apps/api/test/certificados.integration.spec.ts` y `apps/api/test/certificados-concurrencia.integration.spec.ts` (9 de noviembre de 2026) se comprobaron la destruccion del socket HTTP tras el commit de `POST /certificados`, la falla de entrega posterior al commit sobre esquema PostgreSQL real, el recorrido completo de ambos programas sinteticos (`D41`) y la ejecucion de `node scripts/conciliar-certificados.mjs`. El diagnostico reporto `problemas: []` y enumero en `candidatosSinReferencia` unicamente el PDF huerfano del intento revertido antes del commit, sin afectar las constancias confirmadas.
