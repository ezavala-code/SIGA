# Manual de usuario revisado del SIGA

Fecha: 9 de noviembre de 2026. Alcance: demostración académica local con datos sintéticos. Fuente editable para complementar el manual DOCX y los anexos del informe. Describe funciones y etiquetas contrastadas con el código; no acredita por sí mismo capacitación ni aceptación humana.

## 1. Antes de comenzar

SIGA reúne catálogos, estudiantes, docentes, grupos, inscripción, notas, avance y constancias. Cada persona utiliza una cuenta de un solo rol. La cuenta permite acceder a ciertas funciones; cambiar una dirección del navegador no amplía los permisos.

Para Docker local abre `http://localhost:8080`. En desarrollo nativo el portal suele estar en `http://localhost:5173`. Utiliza la dirección indicada por soporte para tu entorno. No mezcles credenciales de instalaciones diferentes.

Las decisiones D41–D46 están autorizadas provisionalmente **para esta demostración**: dos programas sintéticos, notas de 0 a 10, mínima aprobatoria 6, dos decimales, promedio ponderado por créditos considerando todos los intentos calificados, constancia con al menos una nota final y ventanas de inscripción en Ciudad de México. También fijan metas demostrativas de rendimiento y recuperación. No son un reglamento institucional definitivo.

El PDF emitido es una constancia de estudios del prototipo. Incluye materias aprobadas y reprobadas con nota final; no acredita conclusión del programa, título ni validez oficial. El sistema no incluye notas parciales, pago, correo automático ni cancelación de matrícula en autoservicio.

## 2. Acceso, navegación y cierre de sesión

1. Abre el portal y entra en «Acceso».
2. Escribe «Correo electrónico» y «Contraseña» de la cuenta asignada.
3. Envía el formulario y espera la respuesta. Si falla, revisa el mensaje; no repitas contraseñas de otras personas.
4. Comprueba que tu perfil sea estudiante, docente o administración antes de guardar información.
5. Usa el menú lateral para abrir las funciones. «Contraer menú» y «Expandir menú» cambian el espacio disponible. Si una sección está plegada, abre su encabezado.
6. Para terminar selecciona «Cerrar sesión», especialmente en equipos compartidos. Cerrar una pestaña no sustituye este paso.

La sesión dura 30 minutos y puede ser revocada. Al cerrar sesión o cambiar de persona se limpian los datos privados y borradores de la sesión del portal. No uses los borradores como respaldo permanente.

| Perfil         | Opciones del menú                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Estudiante     | «Mapa curricular de mi plan», «Calificaciones y avance», «Matrícula e historial», «Constancias de estudios», «Datos de acceso». |
| Docente        | «Grupos, calificaciones y CSV», «Datos de acceso».                                                                              |
| Administración | «Catálogos y planes», «Estudiantes y docentes», «Periodos y grupos», «Reportes y auditoría», «Datos de acceso».                 |

«Datos de acceso» permite consultar el espacio de cuenta; no debe interpretarse como un formulario de cambio autónomo de contraseña.

## 3. Uso con teclado, búsqueda y páginas

1. Pulsa `Tab` para avanzar y `Mayús+Tab` para retroceder. El contorno visible indica el control seleccionado.
2. Activa enlaces con `Enter` y botones con `Enter` o barra espaciadora. Usa flechas para las opciones de un selector nativo.
3. En las pestañas de catálogos, personas u oferta utiliza el control enfocado y las teclas admitidas por esa pestaña; comprueba qué panel quedó abierto antes de escribir.
4. En los listados usa la búsqueda disponible y después «Anterior» o «Siguiente». Una página vacía no demuestra que no existan registros en otras páginas.
5. Algunos selectores incluyen búsqueda y páginas propias: busca por clave o nombre antes de elegir. La selección actual puede conservarse aunque no figure en la página de opciones mostrada.
6. Para ampliar la interfaz usa el zoom del navegador y vuelve al 100 % con su menú cuando termines. Si algún control queda oculto, informa pantalla, navegador y nivel de zoom. Este manual no declara probado un nivel de zoom real por el hecho de describirlo.

No elimines contenido ni guardes un formulario solo para comprobar el teclado. Las operaciones de escritura tienen efectos reales dentro de la base ficticia.

## 4. Estudiante: mapa curricular

1. Abre «Mapa curricular de mi plan».
2. Revisa el programa y la versión del plan asignado.
3. Consulta asignaturas, créditos y relaciones de prerrequisitos disponibles.
4. Si aparece «Mapa curricular no disponible», pide a administración revisar el plan asociado; no supongas que otra carrera usa el mismo catálogo.

El mapa es una referencia. La posibilidad efectiva de inscripción depende también del periodo, ventana, actividad, intentos anteriores y cupo.

## 5. Estudiante: inscripción y consulta de matrícula

1. Abre «Matrícula e historial». El título de la pantalla es «Mi matrícula».
2. En «Grupos disponibles» revisa asignatura, periodo, grupo, créditos, docente y lugares.
3. Si no aparecen opciones, pulsa «Actualizar oferta» y comprueba las páginas. Solicita revisión del plan o periodo si sigue sin haber oferta.
4. Lee cualquier motivo junto a un grupo cuyo botón esté deshabilitado. No todos los grupos visibles son elegibles.
5. En el grupo correcto pulsa «Inscribirme» una sola vez y espera el resultado de «Registrando…».
6. Revisa «Mis inscripciones»: debe aparecer el registro confirmado. Comprueba materia, grupo y periodo.
7. Si se informa conflicto o falta de cupo, actualiza la oferta. Otro estudiante puede haber ocupado el último lugar después de que cargaste la pantalla.

El servidor comprueba estudiante y oferta activos, pertenencia al plan, ventana abierta, prerrequisitos, duplicidad y cupo. Que el botón estuviera habilitado no reserva un lugar. No hay botón de baja de inscripción por autoservicio; consulta el procedimiento autorizado con administración.

## 6. Estudiante: notas y avance

1. Abre «Calificaciones y avance».
2. Revisa el promedio general y los créditos/avance que informa la pantalla.
3. En «Por periodo» identifica el periodo antes de comparar promedios.
4. En «Asignaturas cursadas» busca y pagina el historial de intentos.
5. Distingue una nota pendiente de una nota cero: pendiente significa que no se capturó nota final; cero es una nota y sí interviene en el cálculo.
6. Si detectas una nota incorrecta, comunica al docente materia, grupo y periodo. El estudiante no puede modificarla.

Con la regla provisional TODOS, cada intento con nota final aporta su nota y créditos al promedio ponderado. Una asignatura aprobada cuenta una sola vez en los créditos de avance. Ejemplo: 8 con 6 créditos y 9 con 4 producen `(8×6 + 9×4) / 10 = 8.40`; una nota pendiente no añade cero ni créditos al denominador.

## 7. Estudiante: emitir, descargar y verificar constancia

1. Abre «Constancias de estudios» y lee la advertencia de alcance.
2. Confirma que tienes al menos una nota final registrada.
3. Pulsa «Emitir constancia de estudios». Espera mientras aparece «Generando PDF…».
4. Revisa el aviso «Constancia emitida. Código: …» y localiza el documento en «Mi historial de emisión».
5. Si hay muchos documentos usa «Buscar constancia por código o estado» y la paginación.
6. Pulsa «Descargar PDF». Comprueba que corresponda a tu programa e historial; guárdalo en una ubicación privada.
7. Abre «Verificación pública» o escanea el QR del PDF.
8. Comprueba código y estado. La consulta muestra datos mínimos; no publica tu correo ni expediente completo.

Una constancia refleja la instantánea emitida. Corregir una nota después no cambia automáticamente un PDF anterior. La comprobación pública del código no demuestra, por sí sola, que un archivo externo presentado no haya sido alterado.

### Recuperar una solicitud interrumpida

1. Si el historial muestra «Pendiente» o «Fallido», primero consulta nuevamente la lista para conocer su estado actual.
2. Usa «Recuperar solicitud» sobre esa fila y espera «Recuperando…».
3. Comprueba que la solicitud termine emitida y entonces descarga su PDF.
4. Si persiste el error, informa el código a soporte. No borres archivos ni generes repetidamente solicitudes nuevas para esconder el problema.

### Reemitir una constancia revocada

1. Localiza una constancia «Revocado» en tu historial y lee el motivo.
2. Si aparece «Reemitir», pulsa el botón y espera.
3. Comprueba el nuevo documento y la referencia «Reemplazada por …» del anterior.
4. Descarga y verifica el código nuevo. El anterior conserva su estado histórico; no se vuelve vigente.

El botón solo aparece para una constancia revocada sin reemplazo. Una constancia revocada puede conservar descarga para consulta histórica: poder descargarla no significa que esté vigente.

## 8. Docente: grupos y captura de nota final

1. Abre «Grupos, calificaciones y CSV». La pantalla se titula «Mis grupos».
2. Usa «Buscar grupo, asignatura o periodo» y pagina si hace falta.
3. Confirma clave, asignatura, periodo y ocupación del grupo.
4. Pulsa «Calificar» para abrir «Captura de calificaciones».
5. Lee la política mostrada: escala, mínima y precisión. Para esta demo se usan 0–10, mínima 6 y hasta dos decimales.
6. Usa «Buscar estudiante» y verifica nombre y matrícula de la fila.
7. Escribe la «Nota final» y pulsa «Guardar nota» en esa misma fila.
8. Espera «Guardando…» y comprueba el resultado antes de continuar con otro alumno.

La captura es de nota final directa, no de evaluaciones parciales. El docente solo trabaja con grupos asignados. Administración no recibe automáticamente permiso docente por tener un rol administrativo.

### Corregir una nota y resolver versiones

1. Localiza la fila ya calificada y revisa el valor actual.
2. Cambia «Nota final». Aparece «Motivo de corrección».
3. Explica el motivo con claridad, sin contraseñas ni datos ajenos al caso, y pulsa «Corregir».
4. Si otra operación actualizó la misma nota, el sistema conserva tu borrador y muestra que la calificación cambió.
5. Compara el valor actual con tu intención. Para abandonar tu edición pulsa «Descartar borrador».
6. Solo si corresponde aplicar tu edición, pulsa «Revisé el valor actual», revisa nuevamente nota y motivo y guarda la corrección.
7. Confirma el resultado. La corrección se registra en auditoría; no sobrescribas a ciegas un valor nuevo.

Cada fila mantiene su borrador y motivo de forma independiente. Un error al guardar una fila no autoriza a asumir que otras se guardaron. Si el portal advierte cambios sin guardar al salir, cancela la salida para revisar o acepta conscientemente descartarlos. No cierres sesión esperando recuperar esos borradores con otra cuenta.

### Exportar el historial docente

1. Desde la captura del grupo pulsa «Exportar historial CSV».
2. Comprueba el grupo autorizado antes de abrir o compartir el archivo.
3. Conserva el CSV de forma privada. Si tu hoja de cálculo pregunta por separadores o codificación, utiliza la importación de texto y revisa acentos y columnas.
4. El CSV es una consulta; editarlo no actualiza las notas del sistema.

## 9. Administración: orden recomendado de preparación

Prepara primero programas y asignaturas, después el plan, estudiantes/docentes, periodos y grupos. Así los selectores tendrán referencias válidas. Busca antes de crear para evitar duplicados y usa solo identidades ficticias.

### Crear y mantener programas o asignaturas

1. Abre «Catálogos y planes» y selecciona la pestaña «Programas» o «Asignaturas».
2. Busca por clave o nombre para comprobar que no exista.
3. En «Nuevo programa» o «Nueva asignatura» captura «Clave» y «Nombre».
4. Usa una clave sin espacios, comenzando por letra o número; se admiten letras, números, punto, guion y guion bajo.
5. Pulsa «Guardar programa» o «Guardar asignatura» y confirma que aparezca en el listado.
6. Para cambiar el nombre edita el campo de la fila y pulsa «Guardar nombre».
7. Para retirar del uso activo pulsa «Dar de baja». Para consultar retirados utiliza la opción de incluir registros inactivos disponible en el listado.
8. Si corresponde restituirlo, pulsa «Reactivar». La baja lógica conserva relaciones e historial.

### Crear plan, asignaturas y prerrequisitos

1. En «Catálogos y planes» abre «Planes».
2. En «Crear plan» busca el programa, elige «Programa activo» e indica «Versión» y «Nombre del plan».
3. Guarda el plan con el botón del formulario y selecciónalo en «Planes registrados».
4. Busca una materia en «Buscar asignatura por clave o nombre», selecciónala en «Agregar asignatura activa» y pulsa «Agregar».
5. Repite hasta reunir las materias. Para cada una captura «Créditos» y «Semestre sugerido».
6. En «Prerrequisitos (puedes elegir varios)» selecciona materias que deban aprobarse antes. El selector es múltiple: usa las teclas modificadoras y flechas del navegador/sistema operativo, comprobando qué opciones quedaron seleccionadas.
7. No establezcas una materia como requisito de sí misma ni un ciclo A→B→A. El servidor rechaza relaciones inválidas.
8. «Quitar del borrador» retira una materia de la edición actual. Revisa también los prerrequisitos que dependían de ella.
9. Pulsa «Guardar contenido del plan» y comprueba el contenido persistido.
10. Si aparece que el plan ya tiene estudiantes u oferta y está protegido, utiliza «Crear nueva versión», revisa la copia y guarda ahí los cambios. No intentes transformar el historial de la versión en uso.

Crear una nueva versión no debe confundirse con transferir automáticamente estudiantes o grupos existentes. Para retirar o devolver un plan al uso activo utiliza «Dar de baja» o «Reactivar» según corresponda.

### Alta y edición de estudiantes

1. Abre «Estudiantes y docentes» y la pestaña «Estudiantes».
2. Busca por nombre, matrícula o correo.
3. Inicia un registro nuevo y completa «Nombre completo», «Correo», «Matrícula», «Plan de estudio» y «Fecha de ingreso».
4. Busca y selecciona el plan correcto, incluida su versión.
5. Pulsa «Guardar estudiante» y revisa el resultado.
6. Para corregir datos abre la edición de la persona y guarda los cambios. El correo y la matrícula deben ser únicos.
7. Para una baja lógica revisa «Estado académico», selecciona el estado que corresponda y guarda. «Inactivo» no significa borrar el expediente; «Egresado» tampoco debe asignarse sin justificación.
8. Comprueba por separado el estado de acceso mostrado. Reactivar el estado académico no reactiva automáticamente la cuenta.

### Alta y edición de docentes

1. En «Estudiantes y docentes» abre «Docentes» y busca por nombre, empleado o correo.
2. Inicia un registro nuevo y completa «Nombre completo», «Correo», «Número de empleado» y «Departamento».
3. Pulsa «Guardar docente» y comprueba la fila.
4. Para actualizar datos abre su edición. En la edición revisa el estado activo y guarda cuando corresponda una baja o reactivación.
5. Comprueba el estado de acceso. Las bajas revocan sesiones y conservan historial; no borres grupos para dar de baja a una persona.

### Entrega o restablecimiento de acceso: intervención de soporte

Las altas de personas crean cuentas inactivas y esta pantalla no muestra contraseñas. El operador autorizado debe provisionar el acceso por separado. El flujo CLI disponible para una persona estudiante/docente activa es **exclusivo de entorno POSIX de desarrollo local con base `siga_dev`**, sin `NODE_ENV=production` ni parámetros adicionales en la URL de base.

Desde la raíz, el operador usa, sustituyendo el correo de ejemplo por el de la persona existente:

```bash
npm run auth:provision:local -w @siga/api -- estudiante.demo@siga.local
```

Este comando compila la API, activa/restablece el acceso y revoca sesiones anteriores. Conserva la credencial en un archivo privado bajo `.local` con permisos `0600`; el directorio debe ser propio y privado `0700`. El correo del ejemplo es sintético y no se garantiza que exista.

No es un comando para crear administradores ni un procedimiento universal de Docker/Windows/producción. Si el entorno no cumple estas condiciones, soporte debe revisar el manual técnico; no relajes las comprobaciones. Entrega la credencial de forma privada y no la adjuntes al informe, capturas ni bitácora. Si el comando falla, no distribuyas una credencial que no haya quedado confirmada.

### Configurar periodos

1. Abre «Periodos y grupos» y la pestaña «Periodos».
2. Inicia un periodo o usa la edición del existente.
3. Completa «Clave», «Nombre», «Inicio del periodo» y «Fin del periodo».
4. Completa «Inicio de inscripción (hora de Ciudad de México)» y «Fin de inscripción (hora de Ciudad de México)» con el intervalo previsto.
5. Selecciona «Estado»: «Planificado», «Abierto» o «Cerrado».
6. Elige «Política académica». La marca «propuesta» sigue distinguiendo una política no ratificada institucionalmente; D41–D46 sí autorizan su uso provisional de demostración.
7. Pulsa «Guardar periodo» y comprueba fechas, estado y política.
8. Recuerda que un periodo «Abierto» fuera de su ventana de inscripción no permite matricularse. No cambies fechas de la demo compartida para practicar: pide una copia aislada.

### Crear, editar y retirar grupos

1. En «Periodos y grupos» abre «Grupos» e inicia uno nuevo.
2. Completa «Clave del grupo» y selecciona «Plan de estudio».
3. Elige «Asignatura del plan», «Periodo» y «Docente activo». Busca y pagina sus opciones si es necesario.
4. Captura «Cupo» como entero positivo.
5. Usa el botón de guardado y comprueba docente, materia, periodo y ocupación del grupo.
6. Para actualizar usa «Editar». Si ya tiene historial, respeta la identidad académica protegida del grupo.
7. No reduzcas el cupo por debajo de la ocupación activa. Un rechazo protege las inscripciones existentes.
8. Para retirarlo de la oferta utiliza «Desactivar»; «Reactivar» lo devuelve al estado activo cuando el servidor lo permite. No elimina las inscripciones históricas.

## 10. Administración: reportes, CSV y auditoría

1. Abre «Reportes y auditoría». El título es «Reportes e historial».
2. Utiliza «Buscar en certificados, grupos y bitácora». La búsqueda actualiza las tres secciones y devuelve sus páginas al inicio.
3. En «Grupos e historial académico» identifica periodo, clave, programa, asignatura, docente y ocupación.
4. Pulsa «Exportar CSV» en la fila del grupo requerido. Revisa el alcance del grupo antes de compartir.
5. Pagina cada sección de forma independiente: grupos, constancias y bitácora pueden tener totales diferentes.
6. En «Bitácora de cambios» revisa actor, acción, recurso, fecha y datos registrados. No la trates como un formulario editable ni agregues secretos a los motivos.
7. «Imprimir reportes» abre la función de impresión del navegador. Revisa las páginas y la información incluida antes de imprimir o guardar PDF.

La búsqueda de la pantalla localiza filas; no debe confundirse con una exportación global de todos los grupos ni con la modificación del historial.

### Revocar una constancia

1. En «Reportes e historial» localiza la sección «Constancias».
2. Busca el código y verifica titular, estado y documento antes de intervenir.
3. En una fila con acción disponible escribe «Motivo para revocar».
4. Pulsa «Revocar» y espera el resultado. No lo uses para una mera prueba sobre un documento que deba seguir vigente.
5. Comprueba el estado «Revocado» y su reflejo en la verificación pública.
6. Comunica al titular el motivo y, si procede, que solicite «Reemitir» desde su historial estudiantil. La interfaz administrativa no debe describirse como si ofreciera un botón de reemisión propio.

La revocación conserva la evidencia histórica. Descargar el archivo anterior no revierte la revocación. El administrador puede consultar/descargar los documentos autorizados; la emisión propia y las acciones de recuperación/reemisión descritas en este manual están en la pantalla del estudiante.

## 11. Verificación pública sin cuenta

1. Abre el enlace del QR o la ruta pública del código entregado.
2. Revisa «Consulta de constancia» y comprueba que el código sea el esperado.
3. Lee el estado: vigente, revocado o no encontrado según la respuesta.
4. Si no se encuentra, comprueba la dirección y comunica la incidencia al emisor. No publiques correos ni expediente para pedir ayuda.

La consulta pública es de lectura y datos mínimos. No permite descargar expedientes ajenos ni modificar el estado del documento.

## 12. Problemas frecuentes y respuesta segura

| Situación                              | Qué hacer                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Credenciales rechazadas                | Comprueba entorno, correo, contraseña y acceso activo. Solicita a soporte restablecimiento cuando corresponda.                |
| Sesión vencida o revocada              | Vuelve a iniciar sesión y consulta el estado antes de repetir un guardado. No reutilices cookies.                             |
| Acción no autorizada                   | Verifica el rol y la asignación. No pruebes direcciones de recursos ajenos para evitar la restricción.                        |
| Registro duplicado                     | Busca el correo, matrícula, clave o empleado ya existente. Corrige el dato; no agregues duplicados con variantes arbitrarias. |
| Lista u opción no encontrada           | Limpia filtros, revisa páginas y estado activo/inactivo. Comprueba programa, plan y versión.                                  |
| Inscripción rechazada                  | Lee el motivo, actualiza oferta y revisa ventana, cupo, plan y prerrequisitos con administración.                             |
| Nota fuera de rango o precisión        | Usa la política visible. En demo: 0–10 y hasta dos decimales. No confundas vacío con cero.                                    |
| Conflicto al corregir una nota         | Compara el valor nuevo, conserva o descarta el borrador y confirma conscientemente antes de corregir.                         |
| Guardado con conexión interrumpida     | Consulta el registro antes de repetir. La ausencia de aviso en pantalla no demuestra que el servidor no haya guardado.        |
| Constancia pendiente/fallida           | Consulta historial y usa «Recuperar solicitud» cuando aparezca; escala a soporte si persiste.                                 |
| PDF no descarga o integridad rechazada | Confirma titular/rol, estado y código. Informa a soporte; no reemplaces archivos del volumen manualmente.                     |
| Portal no disponible                   | Solicita revisión de salud y servicios. No borres volúmenes, base ni certificados para intentar arreglarlo.                   |

Al reportar un problema registra fecha aproximada, rol, pantalla, acción, código del mensaje y resultado esperado. Incluye identificadores mínimos ficticios y una captura solo si no contiene contraseña, token, cookie o expediente completo.

## 13. Límites y verificación de este manual

Se contrastaron etiquetas y condiciones visibles en `App.tsx`, `CatalogManagement.tsx`, `PersonManagement.tsx`, `OfertaManagement.tsx`, `StudentMatriculas.tsx`, `StudentCalificaciones.tsx`, `TeacherCalificaciones.tsx` y `CertificadosManagement.tsx`. El comando de provisión se comprobó contra `apps/api/package.json` y `provisionar-acceso-local.ts`.

Esta revisión es documental y estática: no se atribuyen capturas, recorridos de un participante ni nuevas pruebas ejecutadas. El material debe revisarse mediante un piloto real por los tres roles; asistencia, calificaciones y firmas se consignarán después de realizarlo. Los manuales y formatos listos no acreditan capacitación impartida.

La operación técnica se complementa con [el manual técnico DOCX revisado](../entrega-revisada/MANUAL_TECNICO_REVISADO.docx), [el procedimiento de respaldo y restauración](../OPERACION_RESPALDO_RESTAURACION.md) y [la conciliación de constancias](../OPERACION_CONCILIACION_CONSTANCIAS.md). El [dossier de cierre](../evidencias/CIERRE_LOCAL.md) reúne la evidencia declarada del candidato y las aceptaciones humanas pendientes; sus reservas deben leerse junto con la auditoría actual.
