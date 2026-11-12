# Qué tiene SIGA, qué falta y cómo se termina

> **Estado vigente de auditoría (9 de noviembre de 2026):** la [revisión actual](EXPLICACION_AUDITORIA_Y_ENTREGA.md) identifica reservas técnicas y aceptación humana pendientes. Las declaraciones anteriores de cierre completo y los diagnósticos iniciales se conservan como históricos; no prueban por sí solos cierre F/A. Los módulos principales existen; quedan AC-01–17 y su evidencia.

Esta es la explicación sencilla del [plan detallado de cierre](../PLAN_RESTANTE_CIERRE_MAESTRO.md), revisado el 9 de noviembre de 2026. El [plan maestro original](../PLAN_MAESTRO_ENTREGA.md) conserva el alcance. Aquí explicamos el funcionamiento y los pasos para terminar sin necesitar conocimientos de programación.

## 1. Qué estamos construyendo

SIGA es un sistema escolar para una demostración local. “Local” significa que funciona en el equipo o entorno preparado para la presentación. Los alumnos y programas de ejemplo son ficticios y deben identificarse como demostración.

Hay tres tipos de usuario:

- La persona administradora organiza los datos escolares, programas, materias, periodos, grupos y accesos según los permisos disponibles.
- El docente consulta sus grupos y registra las calificaciones que le corresponden.
- El estudiante consulta su oferta, se inscribe cuando cumple las condiciones, consulta su historial y solicita su constancia cuando reúne los requisitos.

No estamos agregando cobros, una aplicación móvil nativa ni una plataforma de cursos. Terminar significa cumplir el alcance acordado y demostrarlo.

## 2. Cómo funciona por dentro, paso a paso

1. Una persona abre la página y entra con su cuenta. La sesión permite reconocerla durante el uso.
2. La pantalla pide información al servidor. La pantalla es el **frontend**; el servidor que comprueba reglas y permisos es el **backend**.
3. El servidor consulta una base de datos. Allí se guardan personas, grupos, inscripciones, notas y otros registros relacionados.
4. Antes de inscribir, comprueba el periodo, requisitos, cupo y restricciones aplicables. Que una opción aparezca en pantalla no basta: el servidor también debe comprobarla al recibir la solicitud.
5. Al guardar una nota, comprueba quién puede hacerlo y la versión del registro. Si dos personas intentan corregir la misma nota al mismo tiempo, hay que evitar que una sobrescriba silenciosamente el trabajo de la otra.
6. El historial usa las notas guardadas para calcular los resultados. En la demostración se aprobó provisionalmente escala de 0 a 10, mínima de 6, dos decimales y promedio ponderado por créditos con todos los intentos calificados.
7. Para una constancia se toma una copia de los datos que debe mostrar el documento. Se genera el PDF y se vincula con su registro. Un identificador y una huella digital permiten comprobar su integridad. Esa huella no equivale a una firma electrónica avanzada.
8. Si ocurre un fallo durante la emisión, el sistema debe recuperar el estado sin crear documentos válidos duplicados. Los archivos dudosos deben investigarse antes de borrarse.
9. Un respaldo guarda lo necesario para recuperar el servicio. Tener un archivo de respaldo no demuestra por sí solo que la recuperación funcione: hay que restaurarlo y comprobar los datos y PDFs.

## 3. Qué ya existe

Existen los módulos principales, reglas de matrícula, manejo de sesiones y permisos, calificaciones, historial, constancias y herramientas de operación. También existen pruebas automáticas y correcciones de concurrencia, paginación, recuperación y rendimiento.

Los registros anteriores incluyen una ejecución de 30 pruebas completas de navegador aprobadas y otra de 117 pruebas de cobertura aprobadas. Son resultados históricos: en esta revisión documental no volvimos a ejecutarlas. Si cambia el programa, deben repetirse las comprobaciones que correspondan.

Una prueba completa de navegador recorre pantallas como una persona. Una prueba de integración comprueba componentes trabajando juntos. La cobertura indica qué partes del código recorrieron ciertas pruebas; no garantiza que se hayan probado todas las reglas posibles.

## 4. Por qué todavía no podemos decir “100 % terminado”

Hay tres situaciones diferentes:

| Situación                        | Ejemplo                                                                                                        | Qué hay que hacer                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Fallo observado                  | La última carga de PDF con ciertos caracteres Unicode registró cuatro respuestas 503 durante el calentamiento. | Reproducir, corregir y repetir la medición completa.           |
| Falta de comprobación suficiente | Dos correcciones realmente simultáneas de la misma nota o navegación completa solo con teclado.                | Diseñar y ejecutar la prueba adecuada; corregir si falla.      |
| Falta de actividad humana        | Piloto, capacitación y aceptación de la entrega.                                                               | Coordinar personas reales y guardar sus resultados auténticos. |

Unicode permite escribir caracteres de muchos idiomas. Los PDFs con textos latinos ya tuvieron una medición satisfactoria bajo el escenario registrado. Eso no demuestra que el camino que usa otras fuentes rinda igual. La carga Unicode se detuvo antes de completar la medición; no hay un resultado final válido de rendimiento para ese ensayo.

Tampoco equivale una prueba que enfoca un enlace automáticamente y simula tamaño con CSS a recorrer toda la aplicación con Tab y usar el zoom real del navegador. La comprobación pendiente debe parecerse al uso real.

## 5. El trabajo restante, en orden

### Paso 1. Identificar exactamente la versión

Se hace una lista de archivos y sus huellas digitales: un **manifiesto**. Sirve para saber qué versión se revisó. No cambia el programa. Ya se creó un manifiesto técnico de 160 archivos para esta revisión; no es todavía la certificación del paquete final.

Se anotan las decisiones aprobadas y se separan resultados históricos de pruebas nuevas. Esto evita mezclar una prueba de una versión anterior con cambios posteriores.

### Paso 2. Corregir y medir los PDFs pendientes

Se reproduce el fallo con datos ficticios, se encuentra la causa y se cambia lo necesario. Se comprueban contenido, integridad, recuperación y rendimiento sin bajar la meta aprobada.

La meta provisional es 20 usuarios simultáneos, menos de dos segundos en el percentil 95 y menos del 1 % de errores inesperados por operación evaluada. Percentil 95 significa que al menos el 95 % de las respuestas medidas queda por debajo de ese tiempo. También se debe explicar cómo se generó la carga: tandas de usuarios no son lo mismo que usuarios trabajando continuamente.

### Paso 3. Comprobar los recorridos escolares difíciles

Se revisan los dos programas ficticios, la creación y acceso de personas, los requisitos de materias, los intentos reprobados y repetidos, las ventanas de inscripción en hora de Ciudad de México y los cálculos del historial.

Se ensayan solicitudes simultáneas de matrícula y corrección de notas. También se comprueba que cada usuario solo pueda consultar o cambiar lo autorizado, tanto desde las pantallas como desde el servidor.

### Paso 4. Revisar las pantallas y su uso real

Se comprueba que los cambios de cuenta no muestren información de la cuenta anterior, incluso si una respuesta llega tarde. Se revisan borradores de notas, errores al guardar y conflictos entre cambios.

Se recorren listas grandes, filtros y páginas para evitar que desaparezcan opciones por límites internos. Después se completan tareas con teclado y zoom real, en computadora y pantalla pequeña según los casos del plan.

### Paso 5. Probar instalación y recuperación

Otra copia limpia debe poder instalarse siguiendo las instrucciones. También hay que comprobar la actualización de una instalación anterior, porque instalar desde cero y actualizar son recorridos diferentes.

Se simula la pérdida de una instalación de prueba y se recupera desde un respaldo propio. Se mide el tiempo y se comprueban cuentas, registros y documentos. Los objetivos provisionales aprobados son recuperar el servicio en cuatro horas y perder como máximo 24 horas de datos, con respaldo diario y antes de cambios importantes.

Falta concretar dónde se guardarán los respaldos, durante cuánto tiempo y quién será responsable de recuperarlos. Los agentes pueden preparar y probar el procedimiento; la responsabilidad operativa necesita una persona identificada.

### Paso 6. Actualizar manuales y paquete

Se actualizan los documentos técnicos y las guías fáciles, incluidos los manuales de Word que conservan versiones antiguas. Se revisa que las instrucciones describan la versión que realmente se entregará.

Se prepara un paquete que no contenga contraseñas, sesiones, datos personales reales ni archivos temporales. Se conservan las evidencias necesarias para que otra persona pueda revisar los resultados.

### Paso 7. Ejecutar la comprobación final de una misma versión

Se evita modificar los archivos mientras se verifica esa versión. Se ejecutan los controles correspondientes y se registran comandos, resultados y limitaciones. Si se corrige algo después, se repiten las pruebas afectadas y se actualiza la identificación de la versión.

### Paso 8. Hacer el piloto y aceptar la entrega

Personas reales prueban los recorridos de sus roles y reciben la capacitación prevista. Se registran sus resultados, dificultades y correcciones. La metodología académica también necesita evidencias auténticas o una resolución del responsable académico si hay una limitación.

Al final se firma o registra la aceptación real. No se debe crear un acta que diga que alguien probó o aprobó algo si todavía no lo hizo.

## 6. Cómo ayudan los subagentes

Un subagente es otro asistente al que se le asigna una tarea concreta. No es una persona que pueda firmar la aceptación académica.

El plan organiza como máximo cuatro agentes activos: un coordinador y hasta tres especialistas. Los perfiles disponibles incluyen backend, PDFs y persistencia, interfaz y accesibilidad, pruebas, operación y documentación. Los perfiles se turnan; no se lanzan todos a la vez.

El coordinador trabaja así:

1. Elige una tarea que tenga sus requisitos listos.
2. Entrega al especialista los archivos exactos que puede modificar, las reglas que debe conservar y la prueba que demostrará el resultado.
3. Reserva las pruebas pesadas para un solo agente a la vez y asigna bases, puertos y contenedores propios.
4. Evita que dos especialistas escriban el mismo archivo simultáneamente.
5. Recibe los cambios, las pruebas realmente ejecutadas y los problemas pendientes.
6. Revisa e integra el resultado antes de comenzar la siguiente tarea dependiente.

La configuración detallada está dentro del plan técnico. Es una guía operativa con ejemplos de encargos; no se ha instalado una configuración nueva de Codex. Al reanudar hay que consultar los agentes activos de verdad, porque una lista antigua del IDE puede mostrar agentes que ya terminaron.

## 7. Qué significan F y A

El plan distingue dos puertas de cierre:

- **F:** la funcionalidad técnica del alcance está comprobada con sus requisitos y casos obligatorios.
- **A:** además están completas las condiciones de entrega académica y humana.

El plan exige revisar 26 filas técnicas y cinco transversales. No se calcula el avance contando pantallas ni sumando pruebas aprobadas. Cada fila necesita su evidencia y sus subcasos. Por eso esta revisión no publica un porcentaje de finalización sin base suficiente.

## 8. Cómo usar los documentos

1. Lee esta guía para entender el recorrido general.
2. Consulta el [plan restante](../PLAN_RESTANTE_CIERRE_MAESTRO.md) para ver las tareas R-01 a R-18, sus relaciones con los 30 bloques del maestro y los criterios de terminación.
3. Usa la sección de subagentes para repartir archivos y reservar las pruebas.
4. Registra resultados en las evidencias y actualiza el [estado](ESTADO.md).
5. Vuelve al [maestro](../PLAN_MAESTRO_ENTREGA.md) para comprobar el alcance y las puertas de aceptación.

Los comandos del plan técnico requieren un entorno preparado. No es necesario ejecutarlos para entender esta explicación. Durante esta tarea se revisaron y documentaron los pendientes; no se corrigió el producto ni se repitieron sus pruebas.
