# Cómo entender la prueba de rendimiento

Esta explicación acompaña a [la evidencia técnica de rendimiento](RENDIMIENTO_DEMOSTRACION.md). Los datos usados son inventados y sirven para la demostración local.

1. Se preparó una base de pruebas separada, con 1.000 estudiantes y 50 grupos ficticios. También se arrancó una copia de la API, que es la parte del sistema que recibe y responde solicitudes.
2. Se probaron cinco tareas: consultar reportes, consultar la oferta, inscribirse, generar una constancia PDF con texto latino y generar una constancia PDF con caracteres Unicode (cirílico y chino). Se probaron una después de otra.
3. Para cada tarea se dejó un minuto de calentamiento. Después, durante cinco minutos, 20 usuarios enviaron una solicitud a la vez en cada tanda. Hubo una tanda aproximadamente cada ocho segundos: no estuvieron enviando solicitudes sin parar.
4. Se contaron las respuestas con errores y se midió cuánto tardaron. Se guardaron 780 solicitudes medidas por tarea. Al finalizar, se retiraron la base y los archivos temporales de la prueba.
5. En las cinco tareas hubo cero errores en esas solicitudes. El tiempo llamado p95 fue de 204 ms para reportes, 421,24 ms para oferta, 581,41 ms para matrícula, 627,80 ms para constancias con texto latino y 670,84 ms para constancias con texto Unicode (cirílico y chino). Un segundo tiene 1.000 milisegundos; todos esos valores son menores de los dos segundos acordados para la demostración.

El **p95** sirve para describir los tiempos más habituales sin quedarse solo con el promedio: si ordenamos los tiempos de menor a mayor, al menos 95 de cada 100 mediciones quedaron en o por debajo de ese valor. Algunas solicitudes pueden tardar más; la tabla técnica también muestra el máximo observado.

Se mejoró la matrícula haciendo que las solicitudes de un mismo grupo esperen su turno dentro de la aplicación cuando es posible. La base de datos mantiene sus propias reglas y bloqueos para evitar conflictos, incluso si hay más de una copia de la aplicación. La espera tiene límites para no guardar colas sin fin.

También se agilizó el PDF usando letras estándar para el texto común y cargando una sola vez en memoria los diccionarios de glifos cuando un nombre incluye letras chinas o cirílicas. Con esa mejora, tanto las constancias con texto latino como las constancias con texto Unicode cumplieron la prueba larga de cinco minutos por debajo de un segundo en el p95 y sin errores.

Este resultado dice cómo se comportó esta copia local con los datos y el patrón indicados. No garantiza el mismo resultado con usuarios reales, solicitudes continuas o un servidor distinto.
