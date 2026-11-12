# SIGA · Complemento revisado del informe académico

## Control de edición y lectura

**Versión documental 3.0 · 9 de noviembre de 2026 · aplicación 0.1.0 · demostración local con datos ficticios.**

Este complemento desarrolla las conclusiones, anexos y manuales que faltaban en [EntregablesPI-Ing-Software-completado.pdf](../../EntregablesPI-Ing-Software-completado.pdf). Es una actualización documental sustentada en auditoría. No es un acta de aceptación ni una afirmación de operación institucional.

El PDF integrado conserva las 35 páginas originales y añade este complemento a partir de la página física 36. El índice y las afirmaciones de las páginas originales se conservan como versión previa; para el estado vigente prevalecen la fe de actualización y las reservas de este complemento. El archivo DOCX de este complemento es editable. No se reconstruyó de forma automática el diseño de los capítulos I–IV.

La [auditoría técnica detallada](../AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md) identifica brechas AC-01–17, cubre PB-01–30 y R-01–18 y separa implementación, prueba y aceptación. Los resultados históricos se atribuyen a sus registros, no a esta nueva redacción.

## Índice del complemento

1. Fe de actualización de los capítulos anteriores.
2. Capítulo V: conclusiones y recomendaciones.
3. Anexo A: requisitos, casos y reservas de aceptación.
4. Anexo B: arquitectura e integración de subsistemas.
5. Anexo C: evidencias y control de versión.
6. Anexo D: manual de usuario revisado.
7. Anexo E: manual técnico revisado.
8. Anexo F: capacitación y evaluación.
9. Anexo G: decisiones y exclusiones.
10. Anexo H: trabajo restante y orden de cierre.
11. Anexo I: registro de aceptación pendiente.

## Fe de actualización de los capítulos anteriores

| Página del PDF original | Actualización vigente                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3                       | El capítulo V que figuraba pendiente se desarrolla a continuación. Los anexos D/E integran manuales revisados con límites y reservas explícitos.                                                          |
| 18                      | Tecnologías reales: React/Vite, NestJS, Prisma/PostgreSQL, TypeScript, contratos compartidos, cookie HttpOnly y CSRF. No dar por usadas todas las alternativas propuestas.                                |
| 20–21                   | RF-13 correo permanece opcional/fuera del cierre local. HTTPS público, disponibilidad institucional y catálogo oficial se separan de la demo aprobada. Portabilidad se acredita por plataformas probadas. |
| 22–23                   | Consultar modelo y mapa API revisados en anexos B/E; los ejemplos iniciales son de diseño, no contrato definitivo.                                                                                        |
| 25                      | Ya existen manuales 2.0, ampliados aquí a versión documental 3.0; su entrega no demuestra capacitación efectuada.                                                                                         |
| 26–28                   | Sí hay código ejecutable, migraciones, scripts y evidencia local. Consultar auditoría y anexos; no aplicar la frase histórica de inexistencia de repositorio.                                             |
| 29–32                   | Hay pruebas y registros; su correspondencia con cada CP se muestra sin presumir aprobación de todos los subcasos.                                                                                         |
| 32                      | Sí se adjuntan fuentes y registros en repositorio. El cierre técnico mantiene reservas AC; no afirmar 100 % por conteo de tests.                                                                          |
| 33–34                   | Fechas de capacitación originales son propuestas históricas. Materiales listos, ejecución/evaluación humana pendiente; no asignar asistencias retroactivamente.                                           |
| 35                      | Se conserva bibliografía original. Las fuentes primarias del complemento son archivos y resultados locales identificados. No se añadieron citas bibliográficas no consultadas.                            |

# Capítulo V. Conclusiones y recomendaciones

## 5.1 Resultado frente al objetivo general

El desarrollo de SIGA produjo una aplicación web que integra administración académica, inscripción, calificaciones, seguimiento y constancias para distintos programas y planes. La revisión del código y las pruebas permite reconocer una implementación sustancial de los procesos previstos. El sistema dispone de separación por roles y recursos, modelo relacional, historial y mecanismos de auditoría.

La conclusión debe limitarse a la demostración académica local. Existen decisiones provisionales de datos y reglas autorizadas para ese entorno; no se dispone por ello de aprobación institucional, catálogo curricular oficial completo ni condiciones de operación productiva. Tampoco puede afirmarse cierre integral mientras subsistan las reservas técnicas y la aceptación humana descritas en este complemento.

## 5.2 Resultado frente a los objetivos específicos

| Objetivo de trabajo                          | Resultado sustentado                                                                                                  | Condición pendiente                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Centralizar registros y estructura académica | Programas, planes versionados, materias, personas, periodos y grupos en modelo relacionado; bajas conservan historia. | Demostración integral por ambos programas y matriz exhaustiva de listas.        |
| Controlar inscripción                        | Elegibilidad por plan, ventana, prerrequisitos, cupo y unicidad; servidor revalida con transacciones y bloqueos.      | Mantener regresión del candidato final y trazabilidad de cada caso.             |
| Registrar y consultar notas                  | Docente asignado, nota final directa, versiones, motivo de corrección y auditoría; cálculo Decimal.                   | Reconciliar cobertura/contratos y evidencias del cierre.                        |
| Informar avance e historial                  | Promedios por créditos, intentos conservados y créditos aprobados únicos.                                             | Reglas continúan provisionales para demo, sin aprobación institucional.         |
| Emitir documentos verificables               | Snapshot/PDF/hash/QR, verificador público mínimo y flujos de revocación, reemplazo y recuperación.                    | Enlazar evidencia de commit durable, timeout y recorrido completo por programa. |
| Facilitar uso y continuidad                  | Interfaces por rol, paginación, borradores, respaldo y restauración con pruebas registradas.                          | Zoom real, fortalecimiento E2E, RPO corregido, custodia y validación humana.    |

## 5.3 Integración de subsistemas y TGS

La aplicación de la Teoría General de Sistemas se observa en el flujo de entradas, procesos, salidas y retroalimentación entre módulos. La administración proporciona planes, oferta y políticas; matrícula transforma esa oferta en inscripciones válidas; calificaciones produce resultados; historial y avance convierten esos resultados en información; constancias genera una salida verificable y reportes/auditoría permiten revisar lo sucedido.

Una corrección actualiza historial y elegibilidad, conservando el snapshot del PDF previo. Las restricciones de base y la autorización del servidor mantienen la coherencia ante operaciones simultáneas.

## 5.4 Resultados de calidad observados

En esta auditoría se ejecutó `npm run check` con resultado satisfactorio: lint, tipos, 6 suites con 38 pruebas de API, 13 archivos con 40 pruebas web y builds. Esto demuestra que ese conjunto de verificaciones pasó en el entorno revisado; no equivale a una validación completa de todos los requisitos.

Los registros anteriores informan 131 pruebas de cobertura y 34 E2E aprobadas, carga Unicode de 780 solicitudes sin errores inesperados con p95 de 670,84 ms y recuperación local con RTO de 9,47 s. Se conservan como evidencia registrada, con reservas: falta reconciliar archivos exigibles de cobertura, parte de los escenarios E2E requiere fortalecer su alcance, la carga es por tandas y el RPO publicado usa una fórmula que debe corregirse. No se ratifica a partir de esos números un “100 %” técnico sin reservas.

## 5.5 Limitaciones y aprendizaje

El proyecto muestra la importancia de distinguir funcionalidad implementada, prueba ejecutada y aceptación real. Una matriz marcada como aprobada puede contener subcasos sin acreditar; un manifiesto puede quedar desactualizado tras editar un documento; una métrica puede tener nombre correcto y fórmula insuficiente. La trazabilidad requiere revisar tanto el programa como la validez del instrumento de comprobación.

La entrega sigue limitada a datos ficticios, una instancia local y reglas provisionales. Las mediciones no prueban capacidad de producción ni recuperación de un equipo físico perdido. El piloto, la capacitación y las evidencias metodológicas necesitan personas reales o una resolución académica auténtica. La asistencia de agentes permite repartir análisis y documentación; no sustituye firmas ni actividades humanas.

## 5.6 Recomendaciones priorizadas

1. Corregir el instrumento RPO y el denominador/configuración de cobertura; conservar su artefacto de CI.
2. Acreditar zoom real, sesión tardía mediante el flujo real y correspondencia exhaustiva de permisos/listas.
3. Unir los recorridos completos de los dos programas y reforzar evidencia de commit durable/timeout.
4. Congelar fuentes, ejecutar regresión afectada y registrar candidato, entorno y límites por evidencia.
5. Cerrar el paquete documental con manifiesto íntegro y manuales contrastados por una persona receptora.
6. Ejecutar piloto/capacitación, documentar metodología auténtica y registrar aceptación humana.

Como trabajo futuro separado quedan catálogo/reglamento institucional, exposición HTTPS, correo y operación con datos reales. No se convierten en pendientes nuevos del alcance local por aparecer en estas recomendaciones.

## 5.7 Dictamen de cierre

La base implementada permite completar la entrega sin reescritura. Queda trabajo acotado en pruebas, configuración, medición, documentación operativa y aceptación. Este complemento termina la redacción disponible de conclusiones/anexos/manuales; el proyecto no se declara aceptado ni técnicamente cerrado sin reservas. El responsable académico deberá evaluar el resultado después de resolver los criterios pendientes.

# Anexo A. Requisitos y casos de aceptación

La matriz completa de RF/RN/RNF se conserva en [TRAZABILIDAD_ENTREGA.md](../TRAZABILIDAD_ENTREGA.md). Sus estados históricos deben leerse con las reservas de esta auditoría. Los 26 requisitos técnicos y cinco transversales siguen siendo el denominador del maestro; aquí no se recalcula un porcentaje.

Los casos CP-01–15 provienen de las tablas 21/22 del PDF original (páginas 30/31). El maestro amplía subcasos y agrega CP-16–18; esas ampliaciones complementan el significado original y no sustituyen sus negativas de seguridad.

| Caso  | Área y prueba existente                                                                    | Reserva actual / siguiente comprobación                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| CP-01 | Acceso con credenciales válidas/inválidas y sesión vencida; ampliación de revocación/CSRF. | Vincular matriz por rol y candidato; check no ejecuta estas integraciones.                                                                 |
| CP-02 | Crear/editar catálogos y personas, duplicados y baja lógica con historial.                 | Recorrido integral por programa y conservación de referencias; altas/provisión como ampliación del maestro.                                |
| CP-03 | Prerrequisitos no aprobados/aprobados en matrícula.                                        | Mantener matriz cero/uno/varios y flag, con evidencia final oferta/POST.                                                                   |
| CP-04 | Dos estudiantes compiten simultáneamente por el último cupo.                               | Una confirmación, otro conflicto y conteo/auditoría finales correctos.                                                                     |
| CP-05 | Duplicidad del mismo estudiante/asignatura/periodo, incluso entre grupos y en paralelo.    | Una sola inscripción y sin ocupación parcial; regresión del candidato.                                                                     |
| CP-06 | Docente propio guarda nota y docente ajeno intenta modificarla.                            | Inventario método/alias/propiedad/CSRF; el maestro añade corrección simultánea/versionada y borradores.                                    |
| CP-07 | Estudiante intenta consultar historial o PDF ajenos cambiando ID.                          | Denegar en servidor sin exponer datos. El maestro agrupa además subcasos de corrección de notas bajo CP-06/07, sin eliminar este original. |
| CP-08 | Matrícula fuera de fechas, con usuario inactivo o grupo cerrado.                           | Rechazo sin modificar inscripción/cupo; fronteras D44 y referencias activas como ampliaciones.                                             |
| CP-09 | Límites de escala: 6 aprueba, 5.99 no, -1/11 rechazados bajo D42.                          | Añadir cero/precisión/pendiente y conservar los límites originales; cobertura y evidencia vigente.                                         |
| CP-10 | Notas 8 con 6 créditos y 9 con 4 créditos, más pendiente.                                  | Promedio 8,40 sin pendiente; todos los intentos y políticas del maestro. El cálculo manual no es ejecución.                                |
| CP-11 | Plan de 30 créditos, 10 aprobados, repetida e historial vacío.                             | Avance 33,33 % sin doble conteo; vacío con promedio sin dato/avance cero, plan sin créditos sin división por cero.                         |
| CP-12 | PDF con notas finales, QR, código inexistente y revocación.                                | Agrega dos programas/Unicode/hash/recuperación; AC-09 commit durable y AC-10 timeout.                                                      |
| CP-13 | Lista de grupo, historial y auditoría de corrección autorizada.                            | Filtros/conjuntos/roles/páginas, CSV seguro, antes/después y prueba positiva.                                                              |
| CP-14 | Móvil/escritorio y rendimiento de consultas/inscripción.                                   | Maestro añade teclado/zoom y demás operaciones; zoom real pendiente y carga por tandas con metadatos.                                      |
| CP-15 | Respaldo/restauración aislada e instalación desde instrucciones.                           | Incremental existe; corregir RPO y procedimiento receptor.                                                                                 |
| CP-16 | Añadido por el maestro: aislamiento de sesión A→B.                                         | 401 tardío debe atravesar privateFetch real.                                                                                               |
| CP-17 | Añadido por el maestro: listas grandes y opciones históricas.                              | Inventario completo lista→límite→caso→evidencia.                                                                                           |
| CP-18 | Añadido por el maestro: borradores, error y cambio de sesión.                              | Consolidar retorno tras salida y límites de pruebas por componente/E2E.                                                                    |

# Anexo B. Arquitectura e integración

| Subsistema         | Entrada                                          | Proceso                                                        | Salida y retroalimentación                                |
| ------------------ | ------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------- |
| Administración     | Programas, planes, materias, perfiles y oferta.  | Validación, referencias, baja lógica y auditoría.              | Oferta coherente para matrícula y conservación histórica. |
| Matrícula          | Sesión estudiante y grupo elegido.               | Estado, ventana, requisitos, cupo, bloqueo y unicidad.         | Inscripción; rechazo explicado o confirmación auditable.  |
| Calificaciones     | Docente asignado, nota, versión y motivo.        | Escala/precisión/concurrencia, escritura y auditoría atómicas. | Historial y avance actualizados.                          |
| Historial y avance | Intentos calificados y créditos snapshot.        | Decimal, política de intentos y créditos únicos aprobados.     | Promedios/avance/elegibilidad.                            |
| Constancias        | Historial con nota final y solicitud autorizada. | Snapshot, PDF, hash, código/QR y estado.                       | Documento descargable y verificación mínima pública.      |
| Operación          | Versiones, configuración y respaldos.            | Instalación, verificación, restauración y diagnóstico.         | Servicio comprobado e incidencias para mejora.            |

Ejemplo ficticio: ALU-DEMO-001 cursa asignaturas con notas 8 y 9 y créditos 6 y 4. El promedio esperado es 8,40. Si aprueba la materia requerida, la oferta posterior puede habilitar su sucesora. Una constancia conserva los datos al momento de emisión; una corrección posterior necesita auditoría y, si procede, revocación/reemisión. Este ejemplo explica el flujo y no es un acta de ejecución del piloto.

Modelo de relaciones y API: anexo E, `schema.prisma` y [modelo-datos.md](../modelo-datos.md). Arquitectura ampliada: [arquitectura.md](../arquitectura.md).

# Anexo C. Evidencias y versiones

| Fuente local                                      | Qué aporta                                             | Límite                                                           |
| ------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| docs/evidencias/CIERRE_LOCAL.md                   | Dossier de corridas y formatos humanos.                | Cierre técnico excesivo frente a reservas; aceptación vacía.     |
| docs/evidencias/carga-unicode-candidato.json      | Salida de medición Unicode: 780/0/p95 670,84 ms.       | Es stdout mezclado con JSON; no JSON puro ni carga sostenida.    |
| docs/evidencias/carga-smoke-candidato.json        | Comprobación corta de cinco operaciones.               | No reemplaza medición larga por candidato.                       |
| docs/evidencias/restauracion-candidato.json       | Stack recuperado, dos PDFs/hashes y RTO.               | RPO 1,18 s no acreditado por fórmula válida.                     |
| docs/evidencias/instalacion-limpia-candidato.json | Cuatro migraciones; un usuario por rol, tres en total. | No tres por rol; semilla solo ICO-F19.                           |
| docs/evidencias/proxy-candidato.json              | Login/logout/headers y respuestas proxy.               | No acredita por sí solo timeout bajo congestión.                 |
| docs/evidencias/auditoria-check-20261109.log      | Check ejecutado en esta auditoría.                     | No integra carga, E2E ni restauración.                           |
| docs/evidencias/entrega-revisada-20261109.sha256  | Integridad de los artefactos documentales nuevos.      | No convierte evidencia histórica en prueba del candidato actual. |

La huella técnica histórica a91cd907… se conserva como declaración previa; falta inventario canónico específico de 147 entradas para reproducirla inequívocamente. El manifiesto anterior de 222 entradas sí pudo comprobarse y tenía una discrepancia documental. La nueva entrega conserva el original y genera su inventario separado.

# Anexo D. Manual de usuario revisado

### Manual de usuario revisado del SIGA

Fecha: 9 de noviembre de 2026. Alcance: demostración académica local con datos sintéticos. Fuente editable para complementar el manual DOCX y los anexos del informe. Describe funciones y etiquetas contrastadas con el código; no acredita por sí mismo capacitación ni aceptación humana.

#### 1. Antes de comenzar

SIGA reúne catálogos, estudiantes, docentes, grupos, inscripción, notas, avance y constancias. Cada persona utiliza una cuenta de un solo rol. La cuenta permite acceder a ciertas funciones; cambiar una dirección del navegador no amplía los permisos.

Para Docker local abre `http://localhost:8080`. En desarrollo nativo el portal suele estar en `http://localhost:5173`. Utiliza la dirección indicada por soporte para tu entorno. No mezcles credenciales de instalaciones diferentes.

Las decisiones D41–D46 están autorizadas provisionalmente **para esta demostración**: dos programas sintéticos, notas de 0 a 10, mínima aprobatoria 6, dos decimales, promedio ponderado por créditos considerando todos los intentos calificados, constancia con al menos una nota final y ventanas de inscripción en Ciudad de México. También fijan metas demostrativas de rendimiento y recuperación. No son un reglamento institucional definitivo.

El PDF emitido es una constancia de estudios del prototipo. Incluye materias aprobadas y reprobadas con nota final; no acredita conclusión del programa, título ni validez oficial. El sistema no incluye notas parciales, pago, correo automático ni cancelación de matrícula en autoservicio.

#### 2. Acceso, navegación y cierre de sesión

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

#### 3. Uso con teclado, búsqueda y páginas

1. Pulsa `Tab` para avanzar y `Mayús+Tab` para retroceder. El contorno visible indica el control seleccionado.
2. Activa enlaces con `Enter` y botones con `Enter` o barra espaciadora. Usa flechas para las opciones de un selector nativo.
3. En las pestañas de catálogos, personas u oferta utiliza el control enfocado y las teclas admitidas por esa pestaña; comprueba qué panel quedó abierto antes de escribir.
4. En los listados usa la búsqueda disponible y después «Anterior» o «Siguiente». Una página vacía no demuestra que no existan registros en otras páginas.
5. Algunos selectores incluyen búsqueda y páginas propias: busca por clave o nombre antes de elegir. La selección actual puede conservarse aunque no figure en la página de opciones mostrada.
6. Para ampliar la interfaz usa el zoom del navegador y vuelve al 100 % con su menú cuando termines. Si algún control queda oculto, informa pantalla, navegador y nivel de zoom. Este manual no declara probado un nivel de zoom real por el hecho de describirlo.

No elimines contenido ni guardes un formulario solo para comprobar el teclado. Las operaciones de escritura tienen efectos reales dentro de la base ficticia.

#### 4. Estudiante: mapa curricular

1. Abre «Mapa curricular de mi plan».
2. Revisa el programa y la versión del plan asignado.
3. Consulta asignaturas, créditos y relaciones de prerrequisitos disponibles.
4. Si aparece «Mapa curricular no disponible», pide a administración revisar el plan asociado; no supongas que otra carrera usa el mismo catálogo.

El mapa es una referencia. La posibilidad efectiva de inscripción depende también del periodo, ventana, actividad, intentos anteriores y cupo.

#### 5. Estudiante: inscripción y consulta de matrícula

1. Abre «Matrícula e historial». El título de la pantalla es «Mi matrícula».
2. En «Grupos disponibles» revisa asignatura, periodo, grupo, créditos, docente y lugares.
3. Si no aparecen opciones, pulsa «Actualizar oferta» y comprueba las páginas. Solicita revisión del plan o periodo si sigue sin haber oferta.
4. Lee cualquier motivo junto a un grupo cuyo botón esté deshabilitado. No todos los grupos visibles son elegibles.
5. En el grupo correcto pulsa «Inscribirme» una sola vez y espera el resultado de «Registrando…».
6. Revisa «Mis inscripciones»: debe aparecer el registro confirmado. Comprueba materia, grupo y periodo.
7. Si se informa conflicto o falta de cupo, actualiza la oferta. Otro estudiante puede haber ocupado el último lugar después de que cargaste la pantalla.

El servidor comprueba estudiante y oferta activos, pertenencia al plan, ventana abierta, prerrequisitos, duplicidad y cupo. Que el botón estuviera habilitado no reserva un lugar. No hay botón de baja de inscripción por autoservicio; consulta el procedimiento autorizado con administración.

#### 6. Estudiante: notas y avance

1. Abre «Calificaciones y avance».
2. Revisa el promedio general y los créditos/avance que informa la pantalla.
3. En «Por periodo» identifica el periodo antes de comparar promedios.
4. En «Asignaturas cursadas» busca y pagina el historial de intentos.
5. Distingue una nota pendiente de una nota cero: pendiente significa que no se capturó nota final; cero es una nota y sí interviene en el cálculo.
6. Si detectas una nota incorrecta, comunica al docente materia, grupo y periodo. El estudiante no puede modificarla.

Con la regla provisional TODOS, cada intento con nota final aporta su nota y créditos al promedio ponderado. Una asignatura aprobada cuenta una sola vez en los créditos de avance. Ejemplo: 8 con 6 créditos y 9 con 4 producen `(8×6 + 9×4) / 10 = 8.40`; una nota pendiente no añade cero ni créditos al denominador.

#### 7. Estudiante: emitir, descargar y verificar constancia

1. Abre «Constancias de estudios» y lee la advertencia de alcance.
2. Confirma que tienes al menos una nota final registrada.
3. Pulsa «Emitir constancia de estudios». Espera mientras aparece «Generando PDF…».
4. Revisa el aviso «Constancia emitida. Código: …» y localiza el documento en «Mi historial de emisión».
5. Si hay muchos documentos usa «Buscar constancia por código o estado» y la paginación.
6. Pulsa «Descargar PDF». Comprueba que corresponda a tu programa e historial; guárdalo en una ubicación privada.
7. Abre «Verificación pública» o escanea el QR del PDF.
8. Comprueba código y estado. La consulta muestra datos mínimos; no publica tu correo ni expediente completo.

Una constancia refleja la instantánea emitida. Corregir una nota después no cambia automáticamente un PDF anterior. La comprobación pública del código no demuestra, por sí sola, que un archivo externo presentado no haya sido alterado.

##### Recuperar una solicitud interrumpida

1. Si el historial muestra «Pendiente» o «Fallido», primero consulta nuevamente la lista para conocer su estado actual.
2. Usa «Recuperar solicitud» sobre esa fila y espera «Recuperando…».
3. Comprueba que la solicitud termine emitida y entonces descarga su PDF.
4. Si persiste el error, informa el código a soporte. No borres archivos ni generes repetidamente solicitudes nuevas para esconder el problema.

##### Reemitir una constancia revocada

1. Localiza una constancia «Revocado» en tu historial y lee el motivo.
2. Si aparece «Reemitir», pulsa el botón y espera.
3. Comprueba el nuevo documento y la referencia «Reemplazada por …» del anterior.
4. Descarga y verifica el código nuevo. El anterior conserva su estado histórico; no se vuelve vigente.

El botón solo aparece para una constancia revocada sin reemplazo. Una constancia revocada puede conservar descarga para consulta histórica: poder descargarla no significa que esté vigente.

#### 8. Docente: grupos y captura de nota final

1. Abre «Grupos, calificaciones y CSV». La pantalla se titula «Mis grupos».
2. Usa «Buscar grupo, asignatura o periodo» y pagina si hace falta.
3. Confirma clave, asignatura, periodo y ocupación del grupo.
4. Pulsa «Calificar» para abrir «Captura de calificaciones».
5. Lee la política mostrada: escala, mínima y precisión. Para esta demo se usan 0–10, mínima 6 y hasta dos decimales.
6. Usa «Buscar estudiante» y verifica nombre y matrícula de la fila.
7. Escribe la «Nota final» y pulsa «Guardar nota» en esa misma fila.
8. Espera «Guardando…» y comprueba el resultado antes de continuar con otro alumno.

La captura es de nota final directa, no de evaluaciones parciales. El docente solo trabaja con grupos asignados. Administración no recibe automáticamente permiso docente por tener un rol administrativo.

##### Corregir una nota y resolver versiones

1. Localiza la fila ya calificada y revisa el valor actual.
2. Cambia «Nota final». Aparece «Motivo de corrección».
3. Explica el motivo con claridad, sin contraseñas ni datos ajenos al caso, y pulsa «Corregir».
4. Si otra operación actualizó la misma nota, el sistema conserva tu borrador y muestra que la calificación cambió.
5. Compara el valor actual con tu intención. Para abandonar tu edición pulsa «Descartar borrador».
6. Solo si corresponde aplicar tu edición, pulsa «Revisé el valor actual», revisa nuevamente nota y motivo y guarda la corrección.
7. Confirma el resultado. La corrección se registra en auditoría; no sobrescribas a ciegas un valor nuevo.

Cada fila mantiene su borrador y motivo de forma independiente. Un error al guardar una fila no autoriza a asumir que otras se guardaron. Si el portal advierte cambios sin guardar al salir, cancela la salida para revisar o acepta conscientemente descartarlos. No cierres sesión esperando recuperar esos borradores con otra cuenta.

##### Exportar el historial docente

1. Desde la captura del grupo pulsa «Exportar historial CSV».
2. Comprueba el grupo autorizado antes de abrir o compartir el archivo.
3. Conserva el CSV de forma privada. Si tu hoja de cálculo pregunta por separadores o codificación, utiliza la importación de texto y revisa acentos y columnas.
4. El CSV es una consulta; editarlo no actualiza las notas del sistema.

#### 9. Administración: orden recomendado de preparación

Prepara primero programas y asignaturas, después el plan, estudiantes/docentes, periodos y grupos. Así los selectores tendrán referencias válidas. Busca antes de crear para evitar duplicados y usa solo identidades ficticias.

##### Crear y mantener programas o asignaturas

1. Abre «Catálogos y planes» y selecciona la pestaña «Programas» o «Asignaturas».
2. Busca por clave o nombre para comprobar que no exista.
3. En «Nuevo programa» o «Nueva asignatura» captura «Clave» y «Nombre».
4. Usa una clave sin espacios, comenzando por letra o número; se admiten letras, números, punto, guion y guion bajo.
5. Pulsa «Guardar programa» o «Guardar asignatura» y confirma que aparezca en el listado.
6. Para cambiar el nombre edita el campo de la fila y pulsa «Guardar nombre».
7. Para retirar del uso activo pulsa «Dar de baja». Para consultar retirados utiliza la opción de incluir registros inactivos disponible en el listado.
8. Si corresponde restituirlo, pulsa «Reactivar». La baja lógica conserva relaciones e historial.

##### Crear plan, asignaturas y prerrequisitos

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

##### Alta y edición de estudiantes

1. Abre «Estudiantes y docentes» y la pestaña «Estudiantes».
2. Busca por nombre, matrícula o correo.
3. Inicia un registro nuevo y completa «Nombre completo», «Correo», «Matrícula», «Plan de estudio» y «Fecha de ingreso».
4. Busca y selecciona el plan correcto, incluida su versión.
5. Pulsa «Guardar estudiante» y revisa el resultado.
6. Para corregir datos abre la edición de la persona y guarda los cambios. El correo y la matrícula deben ser únicos.
7. Para una baja lógica revisa «Estado académico», selecciona el estado que corresponda y guarda. «Inactivo» no significa borrar el expediente; «Egresado» tampoco debe asignarse sin justificación.
8. Comprueba por separado el estado de acceso mostrado. Reactivar el estado académico no reactiva automáticamente la cuenta.

##### Alta y edición de docentes

1. En «Estudiantes y docentes» abre «Docentes» y busca por nombre, empleado o correo.
2. Inicia un registro nuevo y completa «Nombre completo», «Correo», «Número de empleado» y «Departamento».
3. Pulsa «Guardar docente» y comprueba la fila.
4. Para actualizar datos abre su edición. En la edición revisa el estado activo y guarda cuando corresponda una baja o reactivación.
5. Comprueba el estado de acceso. Las bajas revocan sesiones y conservan historial; no borres grupos para dar de baja a una persona.

##### Entrega o restablecimiento de acceso: intervención de soporte

Las altas de personas crean cuentas inactivas y esta pantalla no muestra contraseñas. El operador autorizado debe provisionar el acceso por separado. El flujo CLI disponible para una persona estudiante/docente activa es **exclusivo de entorno POSIX de desarrollo local con base `siga_dev`**, sin `NODE_ENV=production` ni parámetros adicionales en la URL de base.

Desde la raíz, el operador usa, sustituyendo el correo de ejemplo por el de la persona existente:

```bash
npm run auth:provision:local -w @siga/api -- estudiante.demo@siga.local
```

Este comando compila la API, activa/restablece el acceso y revoca sesiones anteriores. Conserva la credencial en un archivo privado bajo `.local` con permisos `0600`; el directorio debe ser propio y privado `0700`. El correo del ejemplo es sintético y no se garantiza que exista.

No es un comando para crear administradores ni un procedimiento universal de Docker/Windows/producción. Si el entorno no cumple estas condiciones, soporte debe revisar el manual técnico; no relajes las comprobaciones. Entrega la credencial de forma privada y no la adjuntes al informe, capturas ni bitácora. Si el comando falla, no distribuyas una credencial que no haya quedado confirmada.

##### Configurar periodos

1. Abre «Periodos y grupos» y la pestaña «Periodos».
2. Inicia un periodo o usa la edición del existente.
3. Completa «Clave», «Nombre», «Inicio del periodo» y «Fin del periodo».
4. Completa «Inicio de inscripción (hora de Ciudad de México)» y «Fin de inscripción (hora de Ciudad de México)» con el intervalo previsto.
5. Selecciona «Estado»: «Planificado», «Abierto» o «Cerrado».
6. Elige «Política académica». La marca «propuesta» sigue distinguiendo una política no ratificada institucionalmente; D41–D46 sí autorizan su uso provisional de demostración.
7. Pulsa «Guardar periodo» y comprueba fechas, estado y política.
8. Recuerda que un periodo «Abierto» fuera de su ventana de inscripción no permite matricularse. No cambies fechas de la demo compartida para practicar: pide una copia aislada.

##### Crear, editar y retirar grupos

1. En «Periodos y grupos» abre «Grupos» e inicia uno nuevo.
2. Completa «Clave del grupo» y selecciona «Plan de estudio».
3. Elige «Asignatura del plan», «Periodo» y «Docente activo». Busca y pagina sus opciones si es necesario.
4. Captura «Cupo» como entero positivo.
5. Usa el botón de guardado y comprueba docente, materia, periodo y ocupación del grupo.
6. Para actualizar usa «Editar». Si ya tiene historial, respeta la identidad académica protegida del grupo.
7. No reduzcas el cupo por debajo de la ocupación activa. Un rechazo protege las inscripciones existentes.
8. Para retirarlo de la oferta utiliza «Desactivar»; «Reactivar» lo devuelve al estado activo cuando el servidor lo permite. No elimina las inscripciones históricas.

#### 10. Administración: reportes, CSV y auditoría

1. Abre «Reportes y auditoría». El título es «Reportes e historial».
2. Utiliza «Buscar en certificados, grupos y bitácora». La búsqueda actualiza las tres secciones y devuelve sus páginas al inicio.
3. En «Grupos e historial académico» identifica periodo, clave, programa, asignatura, docente y ocupación.
4. Pulsa «Exportar CSV» en la fila del grupo requerido. Revisa el alcance del grupo antes de compartir.
5. Pagina cada sección de forma independiente: grupos, constancias y bitácora pueden tener totales diferentes.
6. En «Bitácora de cambios» revisa actor, acción, recurso, fecha y datos registrados. No la trates como un formulario editable ni agregues secretos a los motivos.
7. «Imprimir reportes» abre la función de impresión del navegador. Revisa las páginas y la información incluida antes de imprimir o guardar PDF.

La búsqueda de la pantalla localiza filas; no debe confundirse con una exportación global de todos los grupos ni con la modificación del historial.

##### Revocar una constancia

1. En «Reportes e historial» localiza la sección «Constancias».
2. Busca el código y verifica titular, estado y documento antes de intervenir.
3. En una fila con acción disponible escribe «Motivo para revocar».
4. Pulsa «Revocar» y espera el resultado. No lo uses para una mera prueba sobre un documento que deba seguir vigente.
5. Comprueba el estado «Revocado» y su reflejo en la verificación pública.
6. Comunica al titular el motivo y, si procede, que solicite «Reemitir» desde su historial estudiantil. La interfaz administrativa no debe describirse como si ofreciera un botón de reemisión propio.

La revocación conserva la evidencia histórica. Descargar el archivo anterior no revierte la revocación. El administrador puede consultar/descargar los documentos autorizados; la emisión propia y las acciones de recuperación/reemisión descritas en este manual están en la pantalla del estudiante.

#### 11. Verificación pública sin cuenta

1. Abre el enlace del QR o la ruta pública del código entregado.
2. Revisa «Consulta de constancia» y comprueba que el código sea el esperado.
3. Lee el estado: vigente, revocado o no encontrado según la respuesta.
4. Si no se encuentra, comprueba la dirección y comunica la incidencia al emisor. No publiques correos ni expediente para pedir ayuda.

La consulta pública es de lectura y datos mínimos. No permite descargar expedientes ajenos ni modificar el estado del documento.

#### 12. Problemas frecuentes y respuesta segura

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

#### 13. Límites y verificación de este manual

Se contrastaron etiquetas y condiciones visibles en `App.tsx`, `CatalogManagement.tsx`, `PersonManagement.tsx`, `OfertaManagement.tsx`, `StudentMatriculas.tsx`, `StudentCalificaciones.tsx`, `TeacherCalificaciones.tsx` y `CertificadosManagement.tsx`. El comando de provisión se comprobó contra `apps/api/package.json` y `provisionar-acceso-local.ts`.

Esta revisión es documental y estática: no se atribuyen capturas, recorridos de un participante ni nuevas pruebas ejecutadas. El material debe revisarse mediante un piloto real por los tres roles; asistencia, calificaciones y firmas se consignarán después de realizarlo. Los manuales y formatos listos no acreditan capacitación impartida.

La operación técnica se complementa con [el manual técnico DOCX revisado](MANUAL_TECNICO_REVISADO.docx), [el procedimiento de respaldo y restauración](../OPERACION_RESPALDO_RESTAURACION.md) y [la conciliación de constancias](../OPERACION_CONCILIACION_CONSTANCIAS.md). El [dossier de cierre](../evidencias/CIERRE_LOCAL.md) reúne la evidencia declarada del candidato y las aceptaciones humanas pendientes; sus reservas deben leerse junto con la auditoría actual.

# Anexo E. Manual técnico revisado

### Manual técnico revisado de SIGA

Versión documental 3.0 · 9 de noviembre de 2026 · aplicación 0.1.0. Alcance: demostración académica local con datos ficticios. Complementa y corrige el manual técnico 2.0; no acredita por sí solo instalación en otra plataforma ni aceptación institucional.

#### 1. Arquitectura y responsabilidades

SIGA es un monorepositorio npm. React/Vite presenta pantallas por rol; NestJS recibe peticiones HTTP, valida contratos, autentica y autoriza; Prisma y PostgreSQL mantienen datos, restricciones y transacciones. Nginx sirve la web compilada y reenvía `/api` a la API en Compose. Los PDFs se guardan en un directorio privado persistente; la base conserva snapshot, estado, código y hash.

| Directorio            | Responsabilidad                                                                       |
| --------------------- | ------------------------------------------------------------------------------------- |
| apps/web/src/app      | Pantallas, navegación, formularios y borradores docentes.                             |
| apps/web/src/services | Clientes HTTP, generación de sesión y rechazo de respuestas obsoletas.                |
| apps/api/src/modules  | Autenticación, catálogos, personas, oferta, matrícula, notas, constancias y reportes. |
| apps/api/prisma       | Modelo y cuatro migraciones; no editar migraciones ya aplicadas.                      |
| packages/contracts    | Tipos compartidos; la validación de seguridad permanece en servidor.                  |
| scripts               | Preparación, pruebas aisladas, provisión, respaldo, restauración y despliegue local.  |
| tests/e2e             | Recorridos de navegador y escenarios de error.                                        |
| docs/evidencias       | Registros históricos y dossier; consultar reservas de auditoría.                      |

Recorrido de información: navegador → API → PostgreSQL → respuesta → pantalla. Una nota guardada modifica historial y avance, puede habilitar un prerrequisito y queda en auditoría. Una constancia emitida conserva su snapshot aunque después se corrija la nota.

#### 2. Modelo relacional y reglas de integridad

| Relación                                             | Uso y restricción relevante                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Usuario → Sesion                                     | Cuenta con rol y hash; sesiones revocables. Nunca exportar hashes/tokens en reportes.      |
| Programa → PlanEstudio → PlanAsignatura → Asignatura | Versiones de plan y créditos; dar de baja conserva relaciones históricas.                  |
| PlanAsignatura → Prerrequisito                       | Grafo de asignaturas requerido para elegibilidad; proteger ciclos y referencias inválidas. |
| Usuario → Estudiante → PlanEstudio                   | Identidad académica y plan del alumno.                                                     |
| Usuario → Docente → Grupo                            | Identidad docente y asignación de grupos.                                                  |
| PoliticaAcademica → Periodo → Grupo                  | Escala, mínima, precisión, intentos; fechas y ventana; oferta y cupo.                      |
| Grupo + Estudiante → Inscripcion                     | Nota final, versión y créditos snapshot; unicidad estudiante/asignatura/periodo.           |
| Estudiante → Certificado                             | Snapshot, tipo, código, estado, ruta/hash y vínculo de reemisión.                          |
| Usuario → Auditoria                                  | Actor, acción, recurso y antes/después; no es un log de secretos.                          |

Fuente exacta de campos/tipos: `apps/api/prisma/schema.prisma`; relaciones detalladas en `docs/modelo-datos.md`. Hay 15 modelos de dominio y una tabla interna de migraciones de Prisma: 16 tablas en total.

Matrícula utiliza transacciones serializables, orden de bloqueos y reintentos limitados. La cola local por grupo reduce contención en una instancia, pero la garantía de cupo depende de PostgreSQL. Notas usan control de versión y auditoría atómica; conflictos concurrentes deben traducirse a 409. Los cálculos usan Decimal, distinguen cero de pendiente y conservan todos los intentos.

#### 3. Requisitos y plataformas

- Node.js 24.19.x y npm 12.2.x, según package.json y .node-version.
- PostgreSQL 18.6 y Docker/Compose para el recorrido empaquetado; espacio para imágenes, datos y respaldos.
- Puertos locales disponibles: web Compose 8080, PostgreSQL Compose 5432; desarrollo web 5173 y API 3000. Pueden cambiar mediante configuración compatible.
- Las herramientas PowerShell de clústeres nativos y bootstrap Docker requieren PowerShell/Windows o un entorno expresamente compatible. No copiar esos comandos a Bash suponiendo equivalencia.
- La provisión genérica de cuentas está limitada a POSIX, base local siga_dev y entorno no productivo. Su disponibilidad no acredita el mismo flujo en Windows o dentro de Docker de producción.

La instalación limpia registrada se realizó en Linux con Node 24.19.0 y npm 12.2.0. La documentación histórica incluye recorridos Windows; validar el recorrido elegido en el equipo receptor antes de dar portabilidad por terminada.

#### 4. Configuración, variable por variable

No se incluyen valores reales. `.env.example` es plantilla; `.env` es privado. `npm run setup` genera valores aleatorios si falta el archivo y conserva los existentes. No ejecutar configuración contra una instalación desconocida.

| Variable                                        | Propósito y condición                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| NODE_ENV                                        | development, test o production. Compose usa production aunque el alcance sea demo local.         |
| PORT                                            | Puerto HTTP API, entero 1–65535; predeterminado 3000.                                            |
| API_HOST                                        | 127.0.0.1 para API nativa; 0.0.0.0 dentro de contenedor.                                         |
| WEB_ORIGIN                                      | Un único origen con protocolo/host/puerto y sin ruta; debe coincidir con navegador para CSRF.    |
| DATABASE_URL                                    | Conexión PostgreSQL con nombre de base; contiene secreto. API Compose utiliza rol de aplicación. |
| TEST_DATABASE_URL                               | Base independiente terminada en _test; nunca usar como alternativa la base de desarrollo.        |
| POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB | Propietario, secreto y base de Compose; reservar propietario para operación/migraciones.         |
| POSTGRES_APP_USER / POSTGRES_APP_PASSWORD       | Rol API limitado sin administración ni cambios de auditoría.                                     |
| POSTGRES_PORT                                   | Puerto de base expuesto sobre loopback; comprobar colisiones.                                    |
| TEST_POSTGRES_PASSWORD                          | Contraseña de la instancia de pruebas de Compose.                                                |
| WEB_PORT                                        | Puerto de Nginx local; predeterminado 8080.                                                      |
| SIGA_VERSION                                    | Etiqueta de imágenes de aplicación y manifiestos de release; no sustituye hash de fuentes.       |
| JWT_SECRET                                      | Secreto aleatorio base64url de al menos 32 bytes; validación exige 43 caracteres o más.          |
| JWT_TTL_SECONDS                                 | Vida de sesión de 300 a 3600 segundos; predeterminado 1800.                                      |
| COOKIE_SECURE                                   | false para HTTP local; exposición HTTPS requiere configuración propia verificada.                |
| EXIGIR_PRERREQUISITOS                           | true/false; predeterminado true. Registrar cualquier cambio como política de demo.               |
| CERTIFICATES_DIR                                | Directorio privado: .local/certificados en desarrollo, /data/certificados en Compose.            |

D44 fija America/Mexico_City para la ventana de demo; no existe una variable genérica que cambie por sí sola esta regla. Revisar `mexico-city-datetime.ts` antes de modificarla.

#### 5. Instalación Compose paso a paso

Este procedimiento inicia una instalación propia nueva. Primero comprobar qué proyecto/puertos/volúmenes ya existen y conservar los datos. No usar borrado de volúmenes como método de reparación.

1. Abrir una terminal en la raíz y comprobar `node --version`, `npm --version`, `docker --version` y `docker compose version`.
2. Ejecutar `npm ci` para instalar exactamente el lockfile en una copia nueva.
3. Ejecutar `npm run setup`. Revisar en privado las variables y permisos del archivo creado; no imprimir la URL de base con contraseña.
4. Ejecutar `docker compose config --quiet` para validar configuración y `docker compose up -d --build --wait` para construir/arrancar el stack propio.
5. Comprobar `docker compose ps`. El servicio migrate aplica las cuatro migraciones; db-permissions prepara rol limitado; certificados-permisos prepara el volumen PDF.
6. Abrir `http://localhost:8080` y comprobar `http://localhost:8080/api/health`. Salud no sustituye una prueba de acceso/datos.
7. Para semilla y administrador en el recorrido Windows documentado, usar `npm run docker:admin:bootstrap`. Este comando es PowerShell; revisar `scripts/bootstrap-docker.ps1` y no asumir que existe un equivalente Bash autorizado.
8. Entregar credenciales por canal privado y probar login con los roles preparados. Los perfiles prefijados de demostración no sustituyen el alta/provisión de cualquier persona.
9. Registrar versiones, migraciones y prueba realizada. `db:seed` siembra ICO-F19; el segundo programa sintético de fixtures no se instala automáticamente por esa semilla.

Para parar solo esta instalación usar `docker compose stop`. No se incluye un comando de borrado masivo en el manual de operación normal.

#### 6. Desarrollo nativo y acceso genérico

En el recorrido Windows existente: `npm ci`, `npm run setup -- --native`, `npm run db:local:start`, `npm run db:migrate`, `npm run db:seed`, `npm run db:test:migrate`, `npm run auth:bootstrap:admin`, `npm run dev`. `db:local:start` es PowerShell y administra clústeres privados en 55432/55433. En POSIX, preparar PostgreSQL propio y URLs válidas de desarrollo/pruebas; no existe aquí una receta nativa universal acreditada para todos los sistemas.

El portal nativo está en `http://localhost:5173`, salud API en `http://127.0.0.1:3000/health`. WEB_ORIGIN debe coincidir con el origen del portal. No iniciar simultáneamente procesos que compitan por 3000/5173.

Para habilitar o restablecer una persona arbitraria ya creada y activa en POSIX local:

```bash
npm run auth:provision:local -w @siga/api -- persona@example.invalid
```

El correo debe corresponder a un estudiante o docente existente, no un administrador. El CLI comprueba entorno no productivo, conexión local y base siga_dev; genera un archivo privado, activa la cuenta, revoca sesiones y audita. La ruta del archivo se informa; la contraseña no se imprime. El directorio es privado 0700 y el archivo 0600. Conservar o entregar por canal privado. Ante error, revisar su causa y comprobar el estado antes de reintentar.

No existen los comandos `npm run provision:local` ni `auth:bootstrap:demo` en los manifiestos auditados. No utilizarlos. Para administrador se usa el bootstrap separado; no reutilizar provisión docente/estudiante.

#### 7. API, contratos y permisos

Las rutas siguientes son de API; en Compose se antepone `/api`. En desarrollo se llama al puerto 3000. La tabla es mapa operativo de familias, no sustituto del inventario exhaustivo de aliases/controladores.

| Método y ruta                                                                                               | Rol y datos relevantes                                                                                   |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| POST /auth/login                                                                                            | Público; correo/contraseña; devuelve perfil y CSRF y establece cookie.                                   |
| GET /auth/me; POST /auth/logout                                                                             | Sesión propia; logout protegido revoca sesión.                                                           |
| GET /auth/usuarios; GET /auth/usuarios/:id                                                                  | Administración o titular según ruta; no devolver hashes.                                                 |
| GET/POST /catalogos/programas, /catalogos/asignaturas, /catalogos/planes                                    | Administración; validaciones de claves, referencias y estado.                                            |
| PATCH /catalogos/programas/:id, /catalogos/asignaturas/:id, /catalogos/planes/:id                           | Administración; cambios/bajas según restricciones históricas.                                            |
| GET/POST /personas/estudiantes, /personas/docentes; PATCH /personas/estudiantes/:id, /personas/docentes/:id | Administración; alta académica no entrega acceso automáticamente.                                        |
| GET/POST /periodos, /grupos; PATCH /periodos/:id, /grupos/:id                                               | Administración; fechas/estado/cupo y referencias.                                                        |
| GET /docentes/me/grupos; GET /docentes/me/grupos/:grupoId/calificaciones                                    | Docente asignado; propiedad derivada de sesión.                                                          |
| GET /matriculas/oferta; GET /matriculas/me; POST /matriculas                                                | Estudiante; POST recibe grupoId y revalida elegibilidad.                                                 |
| PUT /calificaciones/:inscripcionId                                                                          | Docente asignado; notaFinal decimal como texto, version y motivo al corregir. Existen aliases PATCH/PUT. |
| GET /estudiantes/me/calificaciones, /estudiantes/me/progreso                                                | Estudiante; historial y avance propios.                                                                  |
| POST /certificados; GET /certificados/me                                                                    | Estudiante; emisión y listado propios.                                                                   |
| GET /certificados; POST /certificados/estudiantes/:estudianteId                                             | Administrador; listado y emisión de estudios del estudiante seleccionado.                                |
| POST /certificados/:id/recuperar                                                                            | Titular o administrador según autorización; finalizar pendiente/fallido sin duplicar.                    |
| GET /certificados/:id/pdf                                                                                   | Titular o administrador; autorización y comprobación de hash.                                            |
| POST /certificados/:id/revocar                                                                              | Administrador; motivo y auditoría.                                                                       |
| POST /certificados/:id/reemitir                                                                             | Titular o administrador conforme al estado del documento.                                                |
| GET /certificados/verificar/:codigo                                                                         | Público; estado y datos mínimos, sin notas/correo/matrícula.                                             |
| GET /reportes/grupos; GET /reportes/auditoria                                                               | Administrador; filtros y paginación.                                                                     |
| GET /reportes/grupos/:grupoId/historial.csv                                                                 | Administrador o docente asignado; CSV seguro.                                                            |

Ejemplo de intención de matrícula: `{"grupoId":"ID_SINTETICO"}`. Ejemplo de nota: `{"notaFinal":"8.50","version":1}`; para corrección añadir motivo. Usar los contratos actuales de `packages/contracts` para campos completos y errores por endpoint; no enviar estos IDs literales a una instalación real.

Las escrituras protegidas requieren sesión, origen permitido y encabezado X-CSRF-Token. No guardar tokens en manuales/logs. El servidor verifica rol y recurso aunque la pantalla o la URL se cambien.

| Respuesta | Interpretación y acción                                                                      |
| --------- | -------------------------------------------------------------------------------------------- |
| 400       | Datos o formato inválidos; corregir campos.                                                  |
| 401       | Sesión inexistente/vencida/revocada; volver a entrar sin reutilizar caché privada.           |
| 403       | Rol/recurso/origen/CSRF no permitido; revisar sesión y configuración, no evadir control.     |
| 404       | Recurso/ruta no disponible o no visible; comprobar identificador y permiso.                  |
| 409       | Conflicto de negocio, cupo, versión o estado; refrescar y decidir sobre datos vigentes.      |
| 429       | Límite temporal de acceso; esperar y revisar intentos.                                       |
| 5xx       | Error operativo; conservar evidencia saneada, verificar estado antes de duplicar una acción. |

#### 8. Respaldo, restauración y límites D46

Respaldar diariamente y antes de cambios importantes. El respaldo debe contener `database.dump`, manifiesto y archivos PDF; no confundir con un SQL plano. Usar `npm run docker:backup` en instalación propia configurada. Comprobar salida y permisos; conservar fuera del host una copia protegida según política acordada.

Para verificar una copia sin reemplazar la base original:

```bash
npm run docker:restore:verify -- --backup .local/backups/NOMBRE --require-certificate
```

El verificador levanta recursos temporales de su propiedad, compara datos/archivos e inicia API recuperada; requiere base configurada, cuenta privada administrativa y puerto 3138 disponible según script. No es el mismo procedimiento que restaurar automáticamente la instalación principal.

La prueba `node scripts/test-backup-restore-local.mjs --packaged` recrea un stack aislado y comprueba dos PDFs, login y hash. El registro reportó RTO 9,47 s; el cálculo publicado de RPO 1,18 s no mide el desfase recuperable al incidente y debe corregirse. La auditoría no volvió a ejecutar ese simulacro.

Para un incidente real: identificar instalación y respaldo, preservar datos/archivos actuales, detener escrituras de ese entorno, preparar instalación compatible aislada, restaurar dump y PDFs siguiendo las herramientas verificadas, reponer configuración privada, validar migraciones/roles/login/registros/hashes y solo después decidir la sustitución con la persona responsable. No improvisar comandos destructivos. Falta acreditar una guía ejecutable completa para el entorno receptor y el RPO corregido.

Medir RTO desde inicio del incidente hasta servicio utilizable y comprobado. Medir recuperación de datos con marcas persistidas anteriores y posteriores al respaldo, comparadas después de restaurar. Antigüedad del respaldo o duración de exportación no prueban por sí solas datos perdidos. Objetivos provisionales: RTO máximo 4 h y RPO máximo 24 h. Una copia retenida de test no demuestra una retención diaria operada; asignar custodio, destino y calendario reales.

#### 9. Constancias e incidentes

Si una emisión se interrumpe, consultar su estado antes de repetir. Recuperar mediante flujo de aplicación solo cuando corresponda a PENDIENTE/FALLIDO; la recuperación debe finalizar una sola emisión. Revocar requiere motivo. Reemitir enlaza reemplazo, sin alterar el PDF previo.

`node scripts/conciliar-certificados.mjs` es diagnóstico: revisar su configuración y guía antes de usarlo. Los candidatos a huérfanos requieren investigación; un fallo de respuesta no demuestra que la transacción no se confirmara. No borrar PDFs dudosos de forma automática. Referencia: `docs/OPERACION_CONCILIACION_CONSTANCIAS.md`.

Nginx tiene timeout de lectura 5 s y la transacción de certificados admite hasta 20 s. Esto no es un fallo demostrado con latencias actuales; hace falta un ensayo de saturación/timeout y recuperación para documentar el comportamiento. No aumentar límites a ciegas.

#### 10. Pruebas, cobertura y releases

| Comando                                  | Alcance                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| npm run check                            | ESLint, tipos, unitarias y builds. No ejecuta integración ni E2E.                                          |
| npm run format:check                     | Formato del repositorio.                                                                                   |
| npm run test:integration                 | PostgreSQL de prueba independiente y esquema temporal.                                                     |
| npm run test:coverage                    | Unitarias/integración, umbrales por archivo seleccionados por runner.                                      |
| npm run test:e2e -- --workers=1          | Navegador con runner aislado; inspeccionar entorno antes de ejecutar.                                      |
| node scripts/test-load.mjs --unicode     | Emisión Unicode, calentamiento 60 s/medición 300 s, tandas de 20. Requiere API compilada y base de prueba. |
| node scripts/test-proxy-local.mjs        | Proxy en recursos propios; imágenes y puertos según script.                                                |
| node scripts/test-certificados-crash.mjs | Interrupción controlada de API temporal; no usar proceso ajeno.                                            |

La cobertura real se configura dinámicamente en `scripts/test-integration.mjs`, no en un archivo jest.coverage.config.cjs. Incluye service/calculo/guard/pdf/cola/provisión; falta reconciliar csrf.ts y mexico-city-datetime.ts con lo declarado por el inventario. El resultado va a `.local/e09-coverage`; CI ejecuta cobertura pero no publica su artefacto actualmente.

En esta auditoría `npm run check` pasó: 6 suites/38 pruebas API y 13 archivos/40 pruebas web, tipos y builds. Integración/E2E/carga/restauración conservan resultados históricos; no se reejecutaron. Los 131 tests y 34 E2E del dossier no equivalen a validación nueva.

Para desplegar un release propio: revisar `npm run docker:deploy` y su respaldo/manifiesto antes de ejecutar. `npm run docker:rollback -- --release .local/releases/release-ETIQUETA.json` exige manifiesto válido y migraciones compatibles; no realiza una reversión arbitraria de esquema.

#### 11. Diagnóstico y mantenimiento

1. Identificar versión, entorno y momento del fallo sin imprimir secretos.
2. Consultar `docker compose ps` y salud; revisar logs saneados.
3. Comprobar migraciones y rol de base, origen web, espacio, permisos del directorio PDF y puertos.
4. Consultar estado de la acción antes de reintentar matrícula/nota/constancia.
5. Reproducir solo con datos ficticios en instalación propia; registrar pasos y respuesta esperada/observada.
6. Aplicar corrección mínima y repetir pruebas afectadas. Congelar archivos durante cada verificación.
7. Regenerar inventario de entrega al terminar documentos y asociar pruebas al candidato correcto.

#### 12. Fuentes y reservas

Fuentes: package.json, docker-compose.yml, .env.example, environment.ts, controladores, schema.prisma, scripts operativos, README y registros del dossier. La auditoría y pendientes detallados están en `docs/AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md`. No afirmar cierre F/A por la sola existencia de este manual. Datos reales, reglamento institucional, HTTPS público y correo siguen fuera del cierre de demostración acordado.

# Anexo F. Capacitación y evaluación pendientes de ejecución

Los materiales y rúbrica existentes están en `docs/manuales/plan-capacitacion-e11.docx`. Las fechas anteriores eran propuestas; el responsable debe fijar convocatoria vigente y entorno ficticio independiente. Este anexo no acredita asistencia ni aprendizaje ya ocurrido.

## F.1 Secuencia de una sesión

1. Preparar cuentas por rol, escenario de inscripción, notas y constancias sin datos reales.
2. Explicar alcance local, credenciales privadas y diferencia entre demo/documento oficial.
3. Demostrar una tarea y permitir práctica guiada.
4. Evaluar tareas sin ayuda; anotar errores y tiempos reales.
5. Revisar resultado con participante; ofrecer refuerzo y nueva evaluación si procede.
6. Registrar incidentes, responsable de corrección y evidencia saneada.
7. Completar padrón y aceptación solo cuando se cumplan las condiciones.

## F.2 Rúbrica operativa de 100 puntos

| Criterio                                                   | Puntos | Evidencia esperada                                               |
| ---------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| Acceso correcto, reconocimiento del rol y cierre de sesión | 15     | Registro de ejecución real.                                      |
| Tarea principal del rol                                    | 35     | Inscripción propia / nota autorizada / alta de oferta según rol. |
| Consulta, corrección o salida asociada                     | 25     | Historial/constancia, corrección con motivo o reporte.           |
| Interpretación de rechazo y reporte de incidencia          | 15     | Explicación y uso de canal asignado.                             |
| Manejo seguro y autonomía                                  | 10     | Sin compartir contraseñas ni ayuda durante evaluación.           |

Acreditación: >=80/100 y **100 % de tareas críticas**; una nota alta no compensa una tarea crítica fallida. Críticas: permisos y captura correctos; matrícula sin duplicidad; interpretación de resultados; para soporte, restauración y comprobación del servicio. La asistencia sola no acredita.

## F.3 Padrón para completar durante el piloto

| Participante real | Rol            | Convocado | Capacitado | Evaluado  | Puntaje     | Críticas completas | Acreditado | Evidencia/fecha |
| ----------------- | -------------- | --------- | ---------- | --------- | ----------- | ------------------ | ---------- | --------------- |
| Por registrar     | Estudiante     | Pendiente | Pendiente  | Pendiente | Sin evaluar | Pendiente          | Pendiente  | Sin ejecución   |
| Por registrar     | Docente        | Pendiente | Pendiente  | Pendiente | Sin evaluar | Pendiente          | Pendiente  | Sin ejecución   |
| Por registrar     | Administración | Pendiente | Pendiente  | Pendiente | Sin evaluar | Pendiente          | Pendiente  | Sin ejecución   |

Debe quedar al menos un representante acreditado por rol y seguimiento de todos los convocados. No calcular porcentajes con filas de ejemplo como si fueran personas reales. Registrar también quienes no concluyan y la acción de recuperación.

# Anexo G. Decisiones provisionales y exclusiones

| Decisión aprobada para demo | Alcance                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| D41                         | Dos programas sintéticos identificados como demostración; no afirmar catálogo oficial completo.                        |
| D42                         | Escala 0–10, mínima 6, dos decimales y promedio ponderado por créditos con todos los intentos calificados.             |
| D43                         | Constancia de estudios con al menos una nota final, incluyendo aprobadas y reprobadas.                                 |
| D44                         | Ventanas de inscripción en America/Mexico_City.                                                                        |
| D45                         | Meta provisional: 20 usuarios, p95 <2 s y <1 % de errores inesperados por operación; documentar patrón de carga.       |
| D46                         | Respaldo diario/antes de cambios; RTO <=4 h/RPO <=24 h. Falta custodio/destino/retención nominal y medición corregida. |

No se añaden parciales, cancelación de matrícula por autoservicio, carga máxima ni optimización de horarios. Publicación remota, operación institucional, expedientes reales, correo opcional, pagos, LMS, app nativa e integraciones no condicionan este cierre local.

# Anexo H. Trabajo restante y criterios de terminación

| Frente                 | Qué falta                                                               | Cómo se acredita                                                          |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Instrumento RPO        | Corregir fórmula y verificar marcas recuperadas/perdidas.               | Simulacro nuevo aislado, cálculo reproducible y datos antes/después.      |
| Cobertura y CI         | Denominador real de reglas, umbrales y reporte conservado.              | Reporte nuevo con >=70 % por archivo exigible y artefacto real.           |
| Accesibilidad          | Zoom de navegador real y tareas completas por rol.                      | Registro de pasos/entorno/resultados; CSS no sustituye.                   |
| Sesiones               | 401 tardío por privateFetch/flujo real.                                 | B continúa autenticado sin datos de A y solicitud realmente interceptada. |
| Contratos y recorridos | Métodos/aliases/positivos, dos programas y todas las listas.            | Inventario por criterio y evidencia trazable.                             |
| Constancias            | Commit durable independiente y timeout.                                 | Emisión única, auditoría y hash tras fallo/recuperación.                  |
| Evidencias             | Fuentes/paquete identificados, logs estructurados y manifiesto íntegro. | Comprobación de hashes y vinculación por candidato.                       |
| Personas               | Piloto/capacitación/metodología/custodia/aceptación.                    | Registros y firma reales, sin simulación retrospectiva.                   |

Los detalles AC-01–17 y encargos de subagentes están en la auditoría. Máximo cuatro agentes incluido coordinador, tres especialistas activos y una prueba pesada a la vez; archivo con escritor único. La documentación se entrega ahora y no se usa para ocultar pendientes del sistema.

# Anexo I. Registro de aceptación: pendiente

**Este formato no está firmado y no representa aceptación.**

| Campo                                        | Estado                                                              |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Fecha y lugar de evaluación real             | Por registrar.                                                      |
| Versión/candidato y manifiesto aceptados     | Por registrar tras correcciones.                                    |
| Responsable académico, técnico y verificador | Nombres/cargos reales pendientes.                                   |
| Puerta F                                     | No ratificada sin reservas por esta auditoría.                      |
| Puerta A                                     | Pendiente de piloto, metodología, capacitación y aceptación humana. |
| Resultados técnicos y límites aceptados      | Adjuntar evidencia real y reservas resueltas/decisión competente.   |
| Padrón/evaluación de participantes           | Pendiente de ejecución.                                             |
| Firma o registro auténtico de aceptación     | Pendiente; no sustituible por agentes.                              |

La redacción de conclusiones, anexos y manuales puede entregarse antes de esta firma. Su estado no transforma automáticamente el proyecto en finalizado.
