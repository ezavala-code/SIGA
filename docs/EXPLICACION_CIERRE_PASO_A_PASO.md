# SIGA y su cierre explicados paso a paso

Fecha: 2026-11-05. Esta explicacion acompana al [plan tecnico](../PLAN_MAESTRO_ENTREGA.md), la [auditoria](AUDITORIA_CIERRE_LOCAL.md) y la [lista de comprobacion](TRAZABILIDAD_ENTREGA.md). Esta escrita para quien empieza en software.

## 1. Que queremos terminar

SIGA es una pagina para administrar la vida academica: programas de estudio, personas, inscripciones, calificaciones y constancias.

El objetivo actual es que funcione completo en un equipo local, con personas y datos inventados para demostrarlo ante el profesor o cliente. Publicarlo en Internet y usar expedientes reales siguen fuera de esta entrega.

Hoy tenemos una auditoria y un plan mejorado. Eso todavia no significa que los problemas encontrados esten corregidos ni que todas las pruebas hayan pasado.

## 2. Las piezas del sistema, sin tecnicismos

Imagina una escuela con ventanilla y archivo:

| Pieza                 | Que hace                                                        | Ejemplo                                                  |
| --------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| Frontend              | Es lo que ves y usas en el navegador.                           | Pantalla y boton para inscribirte.                       |
| Backend o API         | Recibe la peticion, comprueba reglas y decide si puede hacerla. | Revisa que haya lugar y que seas el estudiante correcto. |
| Base de datos         | Guarda los registros que deben conservarse.                     | Personas, grupos, notas y sesiones.                      |
| Almacenamiento PDF    | Guarda los archivos de las constancias.                         | El documento que descargas.                              |
| Contratos compartidos | Describen como intercambian datos las pantallas y el servidor.  | Los campos que contiene una calificacion.                |
| Pruebas               | Comprueban que cada parte y el recorrido completo funcionen.    | Intentar ocupar el ultimo lugar desde dos cuentas.       |

React/Vite son herramientas para las pantallas. NestJS organiza el servidor. PostgreSQL es la base de datos. Prisma permite que el servidor trabaje con ella. No tienes que dominar esas herramientas para seguir el recorrido.

## 3. Quien hace cada cosa

- **Administracion:** prepara programas, planes, materias, personas, periodos y grupos; consulta reportes y bitacora.
- **Docente:** consulta sus grupos y registra o corrige notas de esos grupos.
- **Estudiante:** consulta su oferta, se inscribe, revisa notas/avance y obtiene sus constancias cuando cumple las condiciones.
- **Verificador publico:** consulta por codigo si una constancia esta vigente o revocada, sin poder ver el expediente completo.

El servidor comprueba los permisos en cada peticion. Esconder un boton en una pantalla no es suficiente para proteger la informacion.

## 4. Recorrido completo de una demostracion

### Paso 1: preparar los estudios

La administracion crea un programa, por ejemplo un programa ficticio de Software. Dentro crea un plan: la lista de materias y creditos que una persona debe cursar.

Los **creditos** representan el peso de cada materia. Un **prerrequisito** indica que debes aprobar una materia antes de entrar a otra. El sistema debe impedir que una materia sea requisito de si misma o que dos materias se bloqueen mutuamente formando un circulo.

Se preparara otro programa para demostrar que SIGA funciona con varios, no solo con ICO-F19. Un dibujo del mapa curricular no basta: las materias deben estar guardadas de forma que el sistema pueda usarlas al inscribir y calcular avance.

Si falta informacion oficial, se pide una decision sobre el catalogo que se usara. No se inventan creditos o reglas y se presentan como oficiales. Un catalogo de demostracion debe estar identificado y expresamente acordado.

### Paso 2: registrar personas y entregar acceso

Administracion registra al estudiante y al docente. Su registro academico y su permiso para entrar son cosas diferentes.

La auditoria encontro que una persona nueva queda sin acceso habilitado y que falta un procedimiento general completo para darle acceso. El plan pide resolverlo de manera local y segura. Puede ser un procedimiento del responsable tecnico; no obliga a construir envio de correos.

Se debe demostrar que una persona recien creada puede entrar y trabajar. Tambien que al darla de baja su sesion deja de servir, pero sus notas e historia siguen guardadas.

### Paso 3: abrir un grupo

Administracion crea un periodo de clases y una ventana de inscripcion. Despues crea un grupo de una materia, le asigna docente y define cuantos lugares tiene.

Las fechas deben ser validas. No se puede reducir el cupo por debajo de la cantidad de lugares ya ocupados. La zona horaria que usara la demostracion debe estar acordada para evitar abrir o cerrar inscripciones a una hora equivocada.

### Paso 4: inscribirse

El estudiante consulta grupos correspondientes a su plan y pide uno.

La pantalla manda la solicitud al servidor. Este revisa cuenta, plan, periodo, fechas, reglas, requisitos, duplicados y cupo. Si todo esta bien, guarda la inscripcion y su registro de cambio juntos.

Si solo queda un lugar y dos estudiantes lo piden al mismo tiempo, solo uno debe obtenerlo. El otro recibe una explicacion. El proyecto ya tiene mecanismos para proteger esta operacion; hay que volver a probarlos sobre la version final.

### Paso 5: registrar y corregir notas

El docente asignado abre su lista y guarda la nota final. Otro docente no puede modificarla.

Una nota pendiente es 'todavia no existe nota'; no significa cero. Cero puede ser una nota valida segun la escala. Si una nota ya guardada cambia, se exige un motivo y se conserva el registro del cambio.

La **version** permite saber si alguien cambio una nota mientras otra persona la tenia abierta. El sistema debe avisar del conflicto, no guardar encima sin preguntar. Ademas, si falla el guardado de una fila, las notas que estabas escribiendo en otras filas deben seguir ahi. La auditoria encontro que actualmente esos borradores se borran ante un error; el plan incluye corregirlo.

### Paso 6: calcular promedio y avance

Ejemplo acordado para probar el calculo:

- Materia A: nota 8 y 6 creditos. Aporta 8 x 6 = 48.
- Materia B: nota 9 y 4 creditos. Aporta 9 x 4 = 36.
- Total: 84 entre 10 creditos = **8.40** de promedio.

Si el plan tiene 30 creditos y se aprobaron esas dos materias, el avance es 10 entre 30 por 100 = **33.33 %**.

Una materia pendiente no cambia el promedio. Una materia repetida no debe sumar dos veces sus creditos aprobados. Hay que acordar que intentos cuentan para promedio: todos, el ultimo o el mejor. La configuracion actual no demuestra por si sola que el profesor haya aprobado esa regla.

### Paso 7: generar la constancia

Una constancia toma una copia de los datos que habia al emitirla. A esa copia se le llama **instantanea**. Se genera un PDF con codigo y QR y se guarda su estado en la base.

Si despues cambia una nota, el PDF anterior no se modifica a escondidas. Se puede revocar y emitir otro segun el procedimiento acordado.

El **hash** es una huella del archivo: permite comprobar si el PDF guardado cambio. El QR lleva al verificador. Ninguno convierte automaticamente el documento de demostracion en un certificado oficial o una firma avanzada.

La auditoria encontro dos problemas principales: una reemision que falla puede bloquear nuevos intentos, y una interrupcion puede dejar una solicitud pendiente. El plan exige recuperar esos casos sin borrar la historia. Tambien se corregira el encabezado que menciona ICO-F19 incluso para otros programas y se probaran nombres largos y varias paginas.

### Paso 8: consultar reportes y cambios

Administracion consulta grupos e historial y puede descargar CSV, un archivo de tabla que se abre en programas de hojas de calculo. El docente solo obtiene lo que le corresponde.

La **bitacora** o auditoria dice quien cambio algo, cuando, que registro fue y cuales fueron los valores pertinentes antes y despues. No guarda contrasenas. La revision encontro cambios de catalogos sin esos valores, por lo que hay que completarlos para las operaciones nuevas.

### Paso 9: comprobar listas completas y cambio de usuario

Si hay mas registros de los que caben en una pagina, deben existir busqueda o botones para seguir. Hoy hay pantallas/selectores que solo piden los primeros 100 registros. El plan exige que tambien puedas encontrar el 101, y lo mismo para limites de 50 o 200 donde existan.

La **cache** es informacion guardada temporalmente para que una pantalla responda rapido. Al salir de una cuenta y entrar con otra, no debe mostrar datos de la persona anterior ni siquiera durante la carga. El plan incluye limpiar y separar esos datos y probarlo con dos cuentas en el mismo navegador.

### Paso 10: respaldar y recuperar

Un respaldo completo guarda la base de datos y los PDF correspondientes. Guardar solo uno puede dejar registros sin archivo o archivos sin registro.

Para probar la recuperacion, se restaura en otra copia aislada, sin borrar el sistema original. Se comparan registros y huellas y se intenta entrar, consultar y descargar otra vez. Tener un archivo de respaldo no demuestra que pueda recuperarse.

## 5. Como se relaciona todo: TGS

TGS significa ver varias partes como un sistema que trabaja unido.

En SIGA: las materias definen requisitos; la matricula usa esos requisitos; el docente pone una nota; la nota actualiza historial y avance; una aprobacion permite nuevas inscripciones; esos resultados alimentan una constancia.

Una correccion puede afectar varios resultados, por eso hay que probar el recorrido completo y no solo cada pantalla por separado. La arquitectura tecnica y el ejemplo de demostracion deben explicar esas relaciones.

## 6. Que encontro la auditoria y en que orden se atiende

| Orden | Trabajo                                               | Como sabremos que quedo                                                 |
| ----- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| 1     | Preparar entorno y lista completa de requisitos.      | Una copia limpia instala y ejecuta comprobaciones.                      |
| 2     | Acceso de personas nuevas y separacion entre cuentas. | Pueden entrar; cambiar usuario no muestra datos de otro.                |
| 3     | Catalogos, listas completas y reglas de inscripcion.  | Dos programas funcionan y todos los registros son alcanzables.          |
| 4     | Notas, borradores, calculos, reportes y bitacora.     | Resultados correctos y errores sin perdida de trabajo.                  |
| 5     | Constancias y recuperacion de fallos.                 | PDF correcto y reintento exitoso despues de una interrupcion.           |
| 6     | Permisos, teclado, movil y pruebas completas.         | Tareas centrales correctas y accesibles en el entorno acordado.         |
| 7     | Respaldo, manuales, piloto y capacitacion.            | Otra persona reproduce y usa el sistema sin depender del desarrollador. |
| 8     | Revision y aceptacion del profesor o cliente.         | Acta real de la version entregada.                                      |

Las tareas tecnicas tienen codigo **PB**; los problemas encontrados tienen codigo **AUD**; las pruebas tienen codigo **CP**. Esas etiquetas permiten relacionar trabajo, problema y comprobacion. Un codigo no significa que ya este terminado.

## 7. Que significa optimizar

Optimizar es hacer el mismo trabajo usando menos tiempo o recursos, conservando resultados correctos.

Hay posibles mejoras como evitar pedir dos veces la misma informacion, no cargar listas que no se estan usando y copiar requisitos de un plan en un solo lote. Primero se mide si eso causa un problema. Si ya cumple los tiempos acordados, no hace falta agregar herramientas o complicar la estructura para decir que el producto funciona.

En cambio, perder borradores, ocultar registros por un limite de pagina o bloquear una constancia son defectos que afectan tareas: corregirlos es obligatorio para cerrar.

## 8. Como se comprueba el trabajo

- **Prueba unitaria:** revisa una regla concreta, por ejemplo calcular 8.40.
- **Prueba de integracion:** revisa partes juntas con la base real, por ejemplo guardar nota y bitacora.
- **Prueba E2E:** una persona o herramienta usa el navegador para completar el recorrido de principio a fin.
- **Prueba de concurrencia:** varias solicitudes llegan juntas, por ejemplo dos personas por el ultimo lugar.
- **Prueba de recuperacion:** se provoca un fallo controlado y se comprueba que el sistema puede continuar sin perder coherencia.
- **Prueba de carga:** se mide como responde con varias personas usandolo durante un tiempo definido.

La **cobertura** indica cuanto codigo de reglas recorrio la bateria de pruebas. Se exigira al menos 70 % de lineas y caminos de decision en cada archivo de reglas identificado. Eso ayuda, pero no reemplaza comprobar los casos importantes.

Para rendimiento se parte de la meta de la guia: 20 usuarios concurrentes, 1000 estudiantes ficticios, 50 grupos, un minuto de calentamiento y cinco de medicion; p95 menor de dos segundos y menos de 1 % de errores inesperados por operacion acordada. **p95** significa que al menos 95 de cada 100 tiempos quedan en ese limite. La meta debe acordarse antes de medir. La prueba de carga actual solo mide un reporte y debe ampliarse a las tareas centrales.

Si una prueba se omite, no cuenta como aprobada. Una prueba que solo simula respuestas de servidor puede ayudar a revisar una pantalla, pero no prueba que esa pantalla funcione con la base real.

## 9. Por que todavia no decimos que esta terminado

En esta revision se pudo leer el codigo, revisar configuracion y comprobar sintaxis de 11 scripts. Se intento ejecutar la comprobacion general, pero se detuvo porque faltan dependencias del proyecto. Las versiones de herramientas tambien difieren de las fijadas.

Docker esta disponible, pero no se levanto SIGA ni se modificaron otros servicios. No se ejecutaron pruebas funcionales, no se midio velocidad y no se revisaron pantallas renderizadas. Las pruebas que otros documentos reportan de fechas anteriores siguen siendo antecedentes, no comprobaciones nuevas.

Ahora toca ejecutar el plan: preparar entorno, corregir y probar. Escribir este documento no corrige por si solo un defecto.

## 10. Dos cierres diferentes

**F: funcionalidad local verificada.** Las 26 filas tecnicas incluidas (12 funciones, 7 reglas y 7 requisitos de calidad) cumplen sus casos obligatorios; no hay problemas conocidos que impidan esas tareas. La version se puede instalar, usar y recuperar siguiendo instrucciones probadas.

**A: entrega academica aceptada.** Ademas de F, estan completos los 5 entregables de metodo/documentacion/aceptacion: explicacion de las relaciones del sistema, registros reales de Scrum/XP, documentos y piloto/capacitacion/acta. En total se controlan 31 filas de requisitos y entregables.

En el piloto, otra persona intenta las tareas sin que le vayan diciendo donde hacer clic. En capacitacion se conserva quien participo, que hizo y su resultado. Cada rol necesita representante acreditado: al menos 80/100 y todas sus tareas criticas correctas. Si alguien no acredita, recibe apoyo y repite. Una lista de asistencia sola no demuestra aprendizaje.

Scrum organiza el trabajo en periodos con objetivo, planeacion, seguimiento, demostracion y mejora. XP incluye escribir una prueba que falla, hacer el cambio y verla pasar (TDD), y trabajar en parejas cuando se cumple ese requisito con integrantes reales. No se inventan reuniones ni companeros para llenar un documento.

Puede haber F completada mientras esperamos la aceptacion humana de A. Solo con ambas completas se dira que el proyecto concluyo para el alcance academico local. Publicarlo o usar datos reales requeriria otro trabajo y otra autorizacion.

## 11. Como leer el avance sin perderse

1. Abre el plan para ver que se va a hacer y en que orden.
2. Abre la auditoria si quieres saber por que se pide una correccion y donde se encontro.
3. Abre la trazabilidad para localizar cada requisito y la prueba que debe demostrarlo.
4. Mira ESTADO para saber lo que realmente se hizo, no solo lo que esta planeado.
5. Una prueba aprobada debe tener fecha, version, procedimiento y resultado consultable.
6. Al final revisa el acta y las evidencias. Los pendientes obligatorios impiden declarar 100 %; las mejoras opcionales sin beneficio medido pueden quedar justificadamente para despues.

Una evidencia es como el comprobante de una tarea realizada. El plan indica lo que falta hacer; la evidencia demuestra que se hizo correctamente.

## 12. Como ayudaran los subagentes especializados

Un subagente es otro asistente que recibe una tarea concreta. Podemos encargar a uno las pantallas, a otro las reglas del servidor y a otro revisar las pruebas. El agente principal organiza el trabajo y comprueba que las partes funcionen juntas.

La instruccion es aprovechar especialistas en todo lo que se pueda delegar con utilidad. No significa dividir cada cambio pequeno ni mandar a todos a editar el mismo archivo. Si una tarea necesita el resultado de otra, primero se termina esa parte. La cantidad de agentes trabajando al mismo tiempo depende del limite de la herramienta; se pueden organizar tandas.

Paso a paso:

1. El coordinador elige tareas independientes y les da a los especialistas contexto, archivos asignados, resultado esperado y forma de probarlo.
2. Cada especialista trabaja en su parte y aplica las mismas reglas de calidad del proyecto. Por ejemplo, uno evita que se pierdan notas escritas en pantalla y otro completa los valores de la bitacora en el servidor.
3. Si necesitan cambiar un archivo comun, como la descripcion de los datos que intercambian, el coordinador organiza ese cambio primero para que no se sobrescriban.
4. Cada especialista explica que cambio, que probo y que sigue pendiente. Otro puede revisar su trabajo.
5. El coordinador integra los cambios y prueba el recorrido completo. Que cada pieza pase por separado no garantiza que todas funcionen juntas.
6. Se registra quien hizo la tarea y su resultado real. Si no conviene delegar algo o no hay herramienta disponible, se explica y se hace de manera secuencial.

Los agentes pueden ayudar a preparar manuales y ejercicios, pero no pueden inventar alumnos capacitados ni firmar por el profesor. La aceptacion humana y las pruebas del sistema siguen siendo necesarias para declarar terminado el alcance.

## 13. Decisiones para empezar la demostracion

El usuario acepto usar dos programas inventados, claramente identificados como datos de demostracion. Esto permite probar los flujos aunque el catalogo oficial completo de ICO-F19 aun no este disponible.

Tambien acepto provisionalmente una escala de 0 a 10, minima de 6, dos decimales y promedio ponderado por creditos que incluye todos los intentos calificados. Estas reglas sirven para probar la demo; no son una afirmacion sobre el reglamento oficial. Fechas, elegibilidad de constancias y otras reglas siguen pendientes de aclaracion.

## 14. Primera mejora de configuracion

Se ajusto una instruccion del servidor web para que el navegador reciba una proteccion tambien al cargar la pagina, sus archivos y una ruta de archivo inexistente. La comprobacion local funciono con una version de prueba del servidor. Aun falta repetirla con la version exacta del proyecto y completar las demas revisiones de configuracion.

## 15. Preparacion para probar el sistema

Ya se instalaron las versiones de herramientas que el proyecto indica y se creo una base temporal de pruebas separada. Asi se pueden probar cambios sin usar las bases de otros proyectos. La herramienta de dependencias tambien aviso de componentes que requieren revision; una actualizacion se comprobara con pruebas antes de darla por buena.

Una comprobacion de tipos se inicio mientras todavia se escribia una parte del servidor y fallo por estar incompleta. Se repetira cuando se terminen e integren los cambios. Todavia no significa que el sistema completo este probado.

## 16. Otras decisiones para la demostracion

El usuario acepto provisionalmente que la constancia sea de estudios y se pueda emitir con al menos una nota final, incluyendo materias aprobadas y reprobadas. Tambien eligio la hora de Ciudad de Mexico para las ventanas de inscripcion. Falta comprobar que la configuracion y las pantallas respeten esa hora.

## 17. Avance despues de retomar el trabajo

Las herramientas del proyecto ya instalaron y compilaron la aplicacion. Pasaron 29 pruebas pequenas del servidor y 17 de las pantallas. Tambien pasaron 71 pruebas que usan una base de datos temporal separada. Esto comprueba partes importantes, pero todavia faltan las pruebas completas en navegador, recuperacion frente a interrupciones, restauracion y aceptacion humana.

Se estan revisando tres frentes: constancias, pruebas en navegador y pantallas/reportes. Si la conversacion se interrumpe, el archivo ESTADO conserva que se hizo y que sigue pendiente para que el siguiente intento continue desde ahi.

## 18. Mejoras para navegar y recuperar

Las pestanas del mapa curricular ya se pueden cambiar con las flechas del teclado, ademas de usar el raton. Una prueba automatica comprobo que el foco pasa a la pestana elegida.

La pantalla de reportes permite recorrer paginas separadas para grupos, constancias y bitacora. Se probaron esas paginas y la opcion de recuperar una constancia pendiente. Aun hay otras listas que necesitan revision y falta probar estos recorridos en un navegador real.

## 19. Pruebas reales y dependencias

Se probo en una copia separada que se puede activar el acceso de un estudiante o docente existente y volver a establecerlo sin borrar su historial. Tambien se comprobo que las sesiones anteriores se cierran. El comando de acceso aun requiere comprobar su funcionamiento en Windows.

Una prueba en navegador ya inscribio a un estudiante, permitio al docente guardar una nota y comprobo el resultado en la base y despues de recargar. Paso en los tamanos de escritorio y movil. Faltan mas partes del recorrido y una repeticion con todos los cambios unidos.

Se actualizaron algunas herramientas del servidor que la auditoria habia senalado. La ultima consulta no encontro avisos en dependencias de produccion, pero hay avisos de desarrollo y hay que volver a probar la aplicacion completa. Tambien se preparo una comprobacion mas estricta de cobertura; todavia falta ejecutarla y corregir sus resultados.

## 20. Meta de velocidad de la demostracion

El usuario acepto como meta provisional que 20 personas usen el sistema al mismo tiempo y que, en cada operacion evaluada, al menos el 95 % de las respuestas tarde menos de dos segundos, con menos de 1 % de errores inesperados. Todavia hay que ejecutar la prueba: aceptar la meta no significa que ya se haya cumplido.

## 21. Comprobacion de accesos en una copia temporal

Se repitio la prueba que activa el acceso de estudiantes y docentes usando una base temporal independiente. La prueba comprobo que cambiar la contrasena cierra las sesiones anteriores y conserva el historial. Al terminar retiro sus propios datos temporales. Esta herramienta de activacion aun esta limitada a sistemas POSIX; Windows requiere una solucion y una comprobacion aparte.

## 22. Inscripciones y pruebas en celular

Se corrigio la forma de interpretar las horas de inscripcion para la demostracion en Ciudad de Mexico. Despues pasaron 75 pruebas que conectan distintas partes del servidor con una base temporal.

En una prueba completa de navegador pasaron 18 de 20 casos. Los otros dos se quedaron sin tiempo cuando se ejecutaban junto con otras pruebas; al repetirlos uno por uno pasaron. Falta repetir toda la bateria con los cambios finales para comprobarla como conjunto.

## 23. Recuperacion y solicitudes simultaneas

Se simulo un error al guardar una constancia y luego se intentaron dos recuperaciones a la vez. Una termino correctamente y la otra informo el conflicto, sin crear dos emisiones. Se agrego una herramienta que solo revisa archivos y una [explicacion sencilla de su uso](EXPLICACION_CONCILIACION_CONSTANCIAS.md). Aun faltan pruebas de interrupcion real.

Al preparar la prueba de velocidad, varios estudiantes que intentaron inscribirse al mismo grupo recibieron un conflicto aunque quedaban lugares. Se esta investigando este resultado antes de declarar que la prueba de rendimiento pasa.

## 24. Que falta en la cobertura

Pasaron 107 pruebas del servidor. La herramienta tambien mide que partes del codigo visitan esas pruebas: encontro dos servicios que necesitan mas casos y un problema en la configuracion de la propia medicion. Se corregiran y se repetira; no se considera aprobada todavia.

Despues se corrigio esa configuracion y se agregaron pruebas. La medicion repetida paso con 110 pruebas y el minimo exigido en cada archivo del servidor incluido. Todavia quedan otras comprobaciones del proyecto; esta cifra no mide las pantallas.

## 25. Recuperar una copia de seguridad

Se hizo una copia de prueba y se restauro en una instalacion temporal separada. Se compararon 16 tablas y se comprobo que se pudiera entrar y descargar una constancia identica. Tambien se altero una copia del PDF a proposito y la revision detecto el cambio. Los pasos y limites estan en la [explicacion sencilla del respaldo](EXPLICACION_RESPALDO_RESTAURACION.md).

La prueba se repitio despues con los paquetes de la aplicacion construidos para Docker, y tambien paso. Si el codigo cambia de nuevo, habra que volver a comprobar los paquetes afectados.

La correccion de matricula tambien paso una prueba con 20 estudiantes que pidieron 20 lugares al mismo tiempo. Se repetira junto con el resto del sistema antes de cerrar el plan.

## 26. Comprobacion general y constancias simultaneas

La comprobacion general volvio a pasar: reviso el codigo, los tipos, la compilacion y las pruebas pequenas del servidor y las pantallas. Al probar varias constancias al mismo tiempo aparecieron errores; se investigan antes de repetir la prueba de velocidad completa.

Un ajuste posterior evito esos errores en una prueba corta de 40 constancias. Sin embargo, el tiempo por debajo del cual termino el 95 % de las solicitudes supero la meta de dos segundos, asi que se esta revisando como acelerar la generacion sin perder las comprobaciones de seguridad.

## 27. Acuerdo provisional sobre respaldos

Para la demostracion, la persona administradora hara una copia diariamente y antes de cambios importantes. Se busca recuperar el servicio en un maximo de cuatro horas y perder como maximo un dia de datos. Todavia hay que medir una recuperacion real para comprobar si se alcanzan esas metas.

## 28. Proteccion en el servidor web empaquetado

Se arranco una copia temporal del servidor web que usa el proyecto y se comprobo que entrega al navegador una cabecera de proteccion al abrir la pagina y al pedir un archivo inexistente. Esta prueba no comprueba por si sola todas las conexiones con el servidor de datos.

## 29. Listas completas para administracion y docentes

Antes, la lista de cuentas solo mostraba hasta 50 y la de grupos de un docente hasta 100. Ahora se pueden buscar y recorrer por paginas. Las pruebas comprobaron que los registros posteriores tambien se pueden consultar y que cada docente solo ve sus grupos.

## 30. Interrupcion durante una constancia

Se detuvo a proposito el proceso que generaba una constancia, usando una base y archivos temporales. Se probo tanto antes como despues de guardar el resultado: el caso pendiente se pudo recuperar sin duplicar la emision y el documento ya guardado conservo su archivo correcto. La prueba no simula un apagon ni una respuesta HTTP perdida.

## 31. Pruebas completas de navegador

Despues de corregir la concurrencia de matricula pasaron las 20 pruebas de navegador, tanto en el tamano de escritorio como en el de celular. Incluyen inscripcion, captura de nota y el ciclo de una constancia. Aun faltan otras comprobaciones del plan, incluida la prueba larga de velocidad.

Despues se agregaron los recorridos de las listas y pasaron las 24 pruebas juntas. La generacion de constancias con texto latino tambien mejoro en una prueba corta; se conserva el tratamiento de otros alfabetos, cuya velocidad aun debe comprobarse. La prueba larga de velocidad se explica a continuacion.

La prueba larga termino con las cuatro operaciones dentro de la meta y sin errores, usando tandas de 20 personas con pausas. La [explicacion de rendimiento](EXPLICACION_RENDIMIENTO.md) muestra las cifras y explica por que no describen una carga permanente ni acreditan la velocidad de todos los alfabetos.

## 32. Mas pruebas de permisos y teclado

Se comprobaron accesos a 15 familias de funciones con los tres roles y sin sesion. Tambien se amplio la bateria del navegador a 30 casos, todos aprobados, con algunas acciones usando Enter y una simulacion de ampliacion al 200 %. La prueba coloca primero el foco en el enlace. Todavia falta comprobar el zoom real y recorrer todas las tareas exclusivamente con Tab.

## 33. Conexion del portal y copia final

Se comprobo la conexion entre el servidor de paginas y la aplicacion, incluyendo entrar y salir de una cuenta. Se corrigio una proteccion que se enviaba repetida. Despues se repitio con los paquetes actuales la restauracion de prueba y el documento recuperado mantuvo su huella. Esto todavia no mide cuanto tarda recuperar una instalacion perdida completa.
