# Como guardar y recuperar SIGA, explicado paso a paso

Esta explicacion acompana a la [guia tecnica de respaldo y restauracion](OPERACION_RESPALDO_RESTAURACION.md).

1. **Guardar las dos partes.** SIGA conserva datos como personas y calificaciones en una base de datos. Los archivos PDF de las constancias estan aparte. Un respaldo necesita ambas partes para que un registro no quede apuntando a un documento perdido.
2. **Revisar las huellas.** Una huella SHA-256 es como una identificacion calculada a partir del contenido del archivo. Si el contenido cambia, la huella cambia. Antes de terminar la copia, el programa compara la huella del PDF con la que SIGA guardo para ese documento.
3. **Abrir una copia de prueba.** Para no sustituir la informacion original, la verificacion crea otra base temporal y copia los PDF en un lugar separado. Despues compara las cantidades de registros y las huellas de los archivos con lo que se guardo.
4. **Probar que realmente se puede usar.** Se inicia una copia del servidor, se entra con una cuenta, se busca una constancia y se descarga. Tambien se consulta que la constancia este vigente. Esto demuestra mas que simplemente tener un archivo de respaldo guardado.
5. **Comprobar un error.** En la prueba aislada se modifica a proposito la copia de un PDF ficticio. El sistema debe detectar que la huella ya no coincide y detener la restauracion de prueba.
6. **Retirar lo temporal.** El ejercicio borra solo la base, los contenedores y los archivos que creo para probar. Una copia real que se quiera conservar necesita guardarse y protegerse por separado, junto con un lugar seguro para las credenciales.

El 5 de noviembre de 2026 se realizo este ejercicio con informacion ficticia. Coincidieron los registros de 16 tablas y la huella de una constancia; se pudo iniciar sesion, buscarla y descargarla. El cambio intencional en la copia se detecto. La copia usada en el ejercicio se elimino al terminar.

Para la demostracion se acordo que administracion haga los respaldos diariamente y antes de cambios importantes, con metas de recuperar en cuatro horas y perder como maximo 24 horas de datos. Aun hay que medir si el procedimiento real cumple esas metas y definir donde se guardaran las copias, cuanto tiempo y quien restaura. El ejercicio no es una copia real disponible para recuperar datos.

Tambien se ejecuto otra prueba con las versiones empaquetadas de la pagina, el servidor y las migraciones: la pagina cargo, el servidor genero otra constancia ficticia y se pudo recuperar y descargar sin alterar su huella. Si se cambia el proyecto, hay que reconstruir y comprobar de nuevo los paquetes afectados. Esta prueba no reemplaza las pruebas completas en navegador.

El 6 de noviembre se repitio la prueba con paquetes reconstruidos despues de los cambios. Se pudieron recuperar los datos y descargar un PDF identico, y se detecto una alteracion preparada para la prueba. La copia temporal se elimino al terminar. Aun hay que comprobar la recuperacion real de una instalacion perdida y medir las metas de tiempo; si el proyecto vuelve a cambiar, habra que repetir lo que corresponda.

Se volvio a probar la restauracion despues de corregir una cabecera del servidor web. La prueba paso de nuevo con los paquetes actualizados; la copia temporal se retiro y no reemplaza un respaldo real.

El 9 de noviembre de 2026 se ejecuto el ejercicio completo sobre el candidato final congelado, incluyendo dos constancias PDF (una con texto latino y otra con caracteres cirilicos y chinos) y un simulacro de perdida total: se borraron por completo los contenedores y volumenes del entorno de prueba, se recreo el sistema desde cero usando el respaldo guardado en `.local/backups/retenido-candidato` y se comprobo que ambos PDFs se descargan con la misma huella SHA-256. La recuperacion completa tardo **9,47 segundos** (frente al maximo de 4 horas acordado en `D46`) y el respaldo quedo retenido con permisos restringidos (`0700`/`0600`).
