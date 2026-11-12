# Qué se hizo y qué falta, explicado fácilmente

Imagina que el sistema es una escuela pequeña con una oficina, docentes y estudiantes. El plan maestro es la lista de cosas que hay que comprobar antes de decir que esa escuela está lista para usar.

## 1. Comprobar que se pueden recuperar los datos

1. En una base de prueba se escribió una primera marca.
2. Se hizo una copia de seguridad.
3. Se escribió una segunda marca después de la copia.
4. Se simuló un problema en una instalación temporal y se recuperó la copia.
5. Apareció la primera marca y no la segunda. Es lo esperado: la segunda todavía no existía cuando se hizo la copia.

El programa midió unos 9,83 segundos para recuperar el servicio en esta prueba. Entre la marca recuperada y el problema transcurrieron unos 7,61 segundos. Son resultados de un ensayo local, no una promesa de que cualquier computadora pueda recuperarse igual de rápido. Todavía hace falta que una persona cuide las copias y realice la rutina acordada.

## 2. Revisar las reglas

Se ejecutaron 140 pruebas automáticas que comprueban muchas reglas del sistema. Todas pasaron. También se corrigió una lista antigua que nombraba archivos inexistentes. Una prueba es como hacer preguntas a un alumno: ayuda a encontrar problemas, pero responder correctamente no demuestra que se conozcan todas las preguntas posibles.

## 3. Probar los recorridos

Con estudiantes y docentes ficticios de dos programas se hizo lo siguiente:

1. El estudiante entró y se inscribió a una materia.
2. El docente entró y guardó una calificación.
3. El estudiante consultó su nota y el apartado de avance.
4. El estudiante generó una constancia y se consultó su código de verificación.

También se probó la navegación por teclado con el zoom real del navegador al 200 % para los tres tipos de cuenta. Falta comprobar a ese tamaño todas las tareas importantes, no solo entrar y navegar.

## 4. Evitar mezclar sesiones

Se abrió una consulta del primer estudiante y se cerró su sesión mientras la consulta seguía pendiente. La prueba confirmó que se canceló y que el segundo estudiante pudo entrar. Otras pruebas pequeñas comprueban defensas adicionales cuando una respuesta llega fuera de tiempo.

## 5. Listas largas y cortes inesperados

La primera prueba completa encontró que una prueba de listas buscaba sus datos en el lugar equivocado de la base temporal. Se corrigió esa preparación y se repitieron seis pruebas de listas: pasaron en computadora y en el perfil móvil.

También se interrumpió el proceso que crea una constancia en dos momentos. Si el corte fue antes de guardar definitivamente, se pudo recuperar; si fue después, la constancia y su archivo seguían íntegros. Otra prueba interrumpe la respuesta de la constancia y comprueba desde una segunda conexión que la emisión sí quedó guardada y que su archivo es íntegro. Estas pruebas ayudan a comprobar la recuperación ante esos cortes concretos.

## 6. Qué falta antes de decir que todo terminó

Quedan pruebas y documentos técnicos descritos en el [avance detallado](AVANCE_CIERRE_20261110.md). También se necesitan actividades que una máquina no puede inventar: una persona encargada de los respaldos, gente que pruebe el sistema, capacitación y una aceptación real. El PDF académico anterior conserva la situación de su fecha; todavía debe actualizarse para reflejar estos resultados.
