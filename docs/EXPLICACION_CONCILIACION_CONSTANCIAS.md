# Cómo revisar las constancias, explicado paso a paso

Cada constancia tiene dos partes: una ficha en la base de datos y un archivo PDF guardado en una carpeta. La ficha dice dónde está el archivo y guarda una huella para comprobar que sigue igual.

1. La persona técnica prepara la conexión a la base y la ruta de la carpeta de constancias de esa instalación.
2. Ejecuta `node scripts/conciliar-certificados.mjs` desde la carpeta principal del proyecto.
3. El comando muestra las constancias que esperan terminar, los PDF que faltan o cambiaron y los archivos que no encontró relacionados con una ficha. No borra nada.
4. Si una constancia está pendiente, su dueño o un administrador puede intentar recuperarla desde la aplicación. Si falta o cambió un archivo emitido, la persona técnica revisa el respaldo.
5. Un archivo sin relación aparente podría pertenecer a una operación que sigue trabajando. Antes de decidir qué hacer, la persona técnica detiene las instancias de la aplicación que generan constancias, guarda un respaldo y vuelve a comprobar la lista. No se debe borrar solo porque aparezca en el informe.

## Prueba de interrupciones

El 6 de noviembre de 2026 se hizo una prueba con una base y una carpeta temporales. Se detuvo el programa de forma forzada en dos momentos:

1. Si se detiene despues de guardar el PDF pero antes de confirmar el cambio en la base, la solicitud queda pendiente. La prueba comprobo que se puede recuperar y terminar una sola vez. Tambien queda un archivo sin referencia que se debe revisar con cuidado.
2. Si se detiene despues de confirmar el cambio pero antes de comunicar el resultado, la solicitud ya aparece emitida. Se pudo descargar el documento y se comprobo su huella; intentar recuperarla de nuevo produjo un aviso de conflicto y no duplico el registro de emision.

Este ejercicio detuvo procesos de prueba: no simulo un apagon real ni la perdida de una respuesta en la red. No se deben borrar automaticamente archivos sin referencia. La [guia tecnica](OPERACION_CONCILIACION_CONSTANCIAS.md) describe como repetir la prueba y revisar esos archivos.

## Qué pasa si se pierde la respuesta de red después de confirmar la constancia

El 9 de noviembre de 2026 se añadió una comprobación automática para el caso en que el servidor termina de guardar el PDF y confirma la constancia en la base de datos, pero la conexión de red se corta antes de que el navegador reciba la respuesta:

1. Al consultar su lista (`GET /certificados/me`), el estudiante ve que la constancia ya aparece como `EMITIDO` con su código de verificación.
2. Puede descargar el PDF (`GET /certificados/:id/pdf`) y el sistema comprueba que la huella `SHA-256` del archivo coincide exactamente con la guardada.
3. Si intenta recuperar de nuevo esa misma constancia (`POST /certificados/:id/recuperar`), el sistema devuelve un aviso de conflicto (`409`) sin borrar ni modificar el archivo PDF, sin duplicar la constancia y conservando un único registro en la bitácora de auditoría.
4. Al ejecutar `node scripts/conciliar-certificados.mjs`, las constancias confirmadas no presentan errores (`problemas: []`) y solo aparecen en `candidatosSinReferencia` los archivos de intentos que se revirtieron antes de confirmarse en la base de datos.
