# Como se conectan las partes de SIGA

Esta guia acompana los documentos tecnicos de [arquitectura](arquitectura.md) y [datos](modelo-datos.md). Describe el funcionamiento previsto por el codigo; para conocer que ya se probo y que falta, consulta el [estado del proyecto](ESTADO.md).

## Las piezas

1. **Pantalla:** es lo que una persona abre en el navegador. Permite llenar formularios y consultar informacion.
2. **Servidor:** recibe cada solicitud. Revisa quien la hace y si tiene permiso, aplica las reglas y devuelve el resultado a la pantalla.
3. **Base de datos:** guarda registros relacionados, por ejemplo estudiantes, materias, grupos y notas. Una inscripcion conecta a un estudiante con un grupo.
4. **Carpeta de PDF:** guarda los archivos de las constancias. La base registra donde esta cada archivo y su huella, que permite detectar cambios en su contenido.
5. **Bitacora:** guarda eventos relevantes como cambios de informacion. Ayuda a saber que sucedio y quien lo hizo.

## Un ejemplo de principio a fin

1. Una persona administradora crea un plan de estudios, sus materias, un periodo y un grupo con docente y cupo.
2. Un estudiante inicia sesion y consulta los grupos ofrecidos para su plan. Al inscribirse, el servidor comprueba de nuevo las fechas, los requisitos, el cupo y que no exista una inscripcion duplicada. Si algo impide el registro, responde con un motivo.
3. El docente asignado captura la nota final. Si otra persona ya modifico el mismo registro, la version permite detectar el conflicto en vez de guardar a ciegas sobre el cambio previo.
4. El estudiante consulta su historial. Para calcular el promedio, cada nota cuenta segun los creditos de su materia: por ejemplo, una materia de 6 creditos con nota 9.00 y otra de 4 creditos con nota 7.50 suman 10 creditos aprobados de un plan de 30 (avance de 33.33 %) y un promedio ponderado de 8.40. Ese resultado retroalimenta al sistema: desbloquea las materias del siguiente periodo que pedian la primera como requisito y permite solicitar una constancia de estudios. Una materia aprobada suma creditos al avance una sola vez, aunque se haya cursado mas de una vez, y una nota todavia pendiente no es un cero.
5. Si el estudiante tiene al menos una nota final, puede solicitar una constancia de estudios para la demostracion. El documento guarda una copia congelada de la informacion de ese momento; una correccion posterior actualiza el kardex y los reportes CSV, pero no cambia el PDF ya emitido. La recuperacion y las reemisiones tienen estados y conservan la historia.
6. Para recuperar la informacion se necesitan tanto la base de datos como los PDF. El [respaldo explicado paso a paso](EXPLICACION_RESPALDO_RESTAURACION.md) muestra como se prueba una copia sin reemplazar la original.

Las reglas de escala, promedio y constancia se aceptaron provisionalmente para la demostracion. Los datos de prueba son ficticios; no representan un reglamento o catalogo oficial. Que una pieza este descrita aqui no significa que ya se haya completado toda la verificacion ni la aceptacion de la entrega.

## Como buscar en listas largas

En su pagina principal, administracion puede buscar cuentas activas por correo y avanzar o regresar entre paginas. Un docente puede hacer lo mismo con sus grupos, buscando por clave de grupo, materia o periodo; solamente aparecen grupos asignados a su cuenta. Al cambiar la busqueda se vuelve a la primera pagina. Si no hay coincidencias se muestra un aviso, y si la consulta falla se informa del problema.

## Como llegan las solicitudes al servidor

En la demostracion local, el navegador se comunica primero con Nginx, que entrega la pagina y pasa las solicitudes de datos al servidor de SIGA. Se probo que al entrar, consultar la sesion y salir, los mensajes llegan correctamente. Tambien se comprobo que se entregue una sola cabecera de proteccion y que la cookie de sesion tenga los atributos previstos para el entorno local. La prueba usa HTTP local; no demuestra una instalacion publica con HTTPS.
