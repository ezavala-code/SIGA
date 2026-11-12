# CAPÍTULO I. MARCO REFERENCIAL O CONTEXTUAL

## 1.1 Datos de la empresa

El Sistema Integral de Gestión Académica (SIGA) se presenta en el contexto académico de CodeShift Empresarial S.A. de C.V., organización descrita en el planteamiento original como proveedora de capacitación y actualización profesional en Toluca, Estado de México. Este nombre identifica el caso de estudio: el proyecto dispone de un cliente simulado y no aporta documentos que acrediten la existencia legal, la operación comercial o el diagnóstico presencial de una empresa real. Por tanto, las características organizacionales se conservan como contexto de diseño, no como resultados de una investigación empresarial de campo.

**Tabla 1. Caracterización del caso de estudio CodeShift.**

| Elemento                    | Descripción del caso académico                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Denominación                | CodeShift Empresarial S.A. de C.V.                                                                               |
| Giro planteado              | Capacitación y adiestramiento profesional para organizaciones y particulares.                                    |
| Ubicación de referencia     | Toluca, Estado de México.                                                                                        |
| Usuarios considerados       | Personal administrativo, instructores y participantes; en SIGA se denominan administrador, docente y estudiante. |
| Servicios representados     | Programas y planes de formación, asignaturas, grupos, inscripción, evaluación y expedición de constancias.       |
| Naturaleza de la validación | Simulación académica con datos ficticios y revisión del equipo y responsable académico.                          |

La misión propuesta consiste en apoyar el desarrollo de competencias mediante servicios de formación y capacitación. La visión del caso busca una organización reconocida por la calidad de sus instructores, la pertinencia de sus programas y la eficiencia de sus herramientas tecnológicas. Innovación, calidad, integridad y orientación al usuario son los valores que guían el diseño: se traducen en procesos comprensibles, datos consistentes, permisos explícitos y seguimiento de las modificaciones.

SIGA atiende la administración académica de esa organización. No administra su contabilidad, las relaciones laborales, el contenido didáctico de los cursos ni la acreditación oficial de programas. La distinción permite delimitar un producto realizable y explicar con precisión qué procesos intervienen en el caso de estudio.

## 1.2 Antecedentes

El informe inicial describe un centro de capacitación que pasa de atender grupos reducidos a gestionar varios programas, instructores y participantes. En ese escenario, la combinación de expedientes físicos, hojas de cálculo y archivos aislados dificulta mantener una versión común de la información. Una inscripción anotada en un archivo puede no reflejarse en el control de cupos; una nota corregida en otro puede no llegar al historial utilizado para elaborar una constancia.

Estos antecedentes constituyen la hipótesis operativa del proyecto. La antigüedad de ocho años y el crecimiento comercial mencionados en el documento original no se utilizan como hechos empresariales verificados, porque el repositorio no contiene documentación de campo que los sustente. El desarrollo se fundamenta en la necesidad académica de resolver el flujo descrito mediante un sistema integrado y comprobable.

Durante la construcción se organizó un monorepositorio con una aplicación web, una API y contratos compartidos. Posteriormente se incorporaron persistencia relacional, autorización, catálogos, oferta, matrícula, calificaciones, documentos y reportes. El plan maestro y su continuación descompusieron la entrega en bloques con criterios de verificación. Las auditorías posteriores identificaron la necesidad de separar tres estados: código disponible, comportamiento comprobado y aceptación humana. La existencia de un módulo o de una prueba automatizada no acredita por sí misma que usuarios reales hayan aprobado el sistema.

## 1.3 Definición del problema o problemática

El problema central del caso de estudio es la ausencia de una plataforma común que conserve y relacione la información del ciclo académico. La dispersión de datos obliga a repetir capturas y conciliaciones manuales; además, dificulta determinar quién puede modificar cada registro y cómo se reconstruye una decisión anterior.

### 1.3.1 Problemas identificados

**Tabla 2. Problemas del escenario y respuesta del sistema.**

| Problema del escenario                    | Riesgo o efecto esperado                                              | Respuesta de diseño en SIGA                                                      |
| ----------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Información personal y académica dispersa | Duplicidad e inconsistencias entre archivos.                          | Entidades relacionadas con identificadores, claves únicas y validaciones.        |
| Inscripción manual                        | Errores de cupo, duplicados y dependencia de una revisión individual. | Matrícula transaccional con comprobación de ventana, plan, requisitos y lugares. |
| Prerrequisitos revisados manualmente      | Inscripción sin antecedentes suficientes.                             | Grafo del plan y comparación con el historial aprobado.                          |
| Captura y cálculo separados               | Errores aritméticos y pérdida de correcciones.                        | Notas con versión, cálculo decimal y auditoría de cambios.                       |
| Escasa visibilidad del avance             | Consultas repetidas y dificultad para conocer pendientes.             | Historial y trayectoria accesibles para el estudiante autenticado.               |
| Elaboración manual de constancias         | Diferencias entre historial y documento emitido.                      | Instantánea de datos, PDF, huella de integridad y verificación por código.       |
| Permisos y cambios sin trazabilidad       | Lecturas o modificaciones indebidas.                                  | Sesiones, roles, autorización por recurso y bitácora.                            |

La tabla establece una relación de diseño. No representa una medición de ahorro, disminución de errores o satisfacción empresarial: esas conclusiones exigirían una comparación antes y después con participantes y datos observados.

### 1.3.2 Subsistemas afectados

El subsistema de estudiantes conserva identidad, plan e inscripciones. El de docentes relaciona al instructor con los grupos que puede consultar y calificar. El de asignaturas y oferta organiza programas, versiones de planes, seriación, periodos y cupos. El de calificaciones produce el historial y el avance utilizados por consultas, reportes y constancias.

La dependencia entre estos subsistemas explica la necesidad de una solución integral. La nota de una inscripción puede acreditar un prerrequisito; ese resultado modifica las posibilidades de una inscripción posterior. Una constancia, en cambio, debe conservar los datos que tenía al emitirse aunque más tarde cambie la información académica. El sistema necesita integrar los procesos y, simultáneamente, preservar el historial de sus salidas.

## 1.4 Justificación

La justificación operativa consiste en reducir capturas repetidas y aplicar reglas uniformes en los procesos de inscripción, evaluación y consulta. La automatización aporta una respuesta consistente ante situaciones que serían difíciles de coordinar manualmente, como dos solicitudes simultáneas para el último lugar de un grupo. El beneficio se expresa como capacidad implementada; no se cuantifica un ahorro de tiempo que no haya sido medido en un piloto.

Desde la perspectiva tecnológica, una base relacional permite expresar vínculos y restricciones entre estudiantes, grupos y planes. La API concentra las reglas de negocio y comprueba permisos independientemente de la pantalla utilizada. La separación entre presentación, servicios y persistencia facilita revisar el comportamiento y localizar las causas de un defecto.

Para los usuarios, disponer de consultas propias de matrícula, calificaciones y documentos disminuye la dependencia de archivos administrativos aislados. Esto no equivale a garantizar un portal productivo disponible las veinticuatro horas: la entrega evaluada es una demostración local, sujeta a las condiciones del equipo donde se ejecuta.

La selección de herramientas de código abierto evita depender de licencias comerciales para construir la demostración. Sin embargo, el proyecto no incluye un estudio financiero con cotizaciones, horas efectivas o retorno de inversión, por lo que no se afirma una rentabilidad comprobada. En el plano académico, el trabajo permite relacionar análisis, diseño, implementación, pruebas, operación y documentación con un mismo proceso de negocio.

## 1.5 Objetivos

### 1.5.1 Objetivo general

Desarrollar e implementar un sistema web integral de gestión académica para el caso de estudio CodeShift Empresarial que permita a los estudiantes inscribirse en cursos, consultar su progreso y obtener constancias de estudios; a los docentes registrar calificaciones de sus grupos; y a la administración gestionar personas, programas y oferta académica, con procesos verificables y una organización de trabajo orientada por Scrum y prácticas de Extreme Programming.

El objetivo conserva la intención del informe original y precisa el alcance de los documentos emitidos. La mención metodológica expresa el marco elegido; su aplicación histórica debe sustentarse con registros reales y no se deduce automáticamente de la existencia del software.

### 1.5.2 Objetivos específicos

1. Analizar el escenario y definir requisitos de usuarios, docentes, asignaturas, matrícula, calificaciones y documentos, manteniendo su identificación y trazabilidad.
2. Diseñar una aplicación web con responsabilidades separadas, un modelo relacional e interfaces diferenciadas para estudiante, docente y administrador.
3. Implementar inscripción con validación de prerrequisitos, cupos, pertenencia al plan y ventana del periodo, incluso ante solicitudes concurrentes.
4. Registrar notas finales y calcular promedios y avance con reglas académicas configurables, créditos históricos y control de cambios.
5. Generar constancias de estudios en PDF con código de verificación, consulta pública mínima y mecanismos de integridad, revocación y reemisión.
6. Verificar los procesos mediante pruebas pertinentes y preparar manuales y procedimientos de instalación, uso, respaldo y recuperación.

## 1.6 Alcance y limitaciones

### 1.6.1 Alcance

**Tabla 3. Delimitación funcional de la entrega.**

| Incluido                                                                   | Excluido de esta entrega                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Portal web adaptable para estudiante, docente y administrador.             | Aplicación móvil nativa.                                              |
| Catálogos, personas, planes versionados, periodos y grupos.                | Contabilidad, pagos, colegiaturas y facturación.                      |
| Matrícula con requisitos, cupos y control transaccional.                   | Optimización de horarios y límites adicionales de carga no acordados. |
| Nota final, historial, promedio y avance por créditos.                     | Evaluaciones parciales y cancelación de autoservicio.                 |
| Constancias de estudios PDF, código, verificación, revocación y reemisión. | Firma electrónica avanzada, títulos o validez oficial.                |
| Reportes básicos, auditoría, sesiones y permisos.                          | LMS, tareas, videoclases e integraciones institucionales externas.    |
| Demostración local con datos sintéticos y documentación.                   | Publicación productiva remota y migración de expedientes reales.      |

### 1.6.2 Reglas provisionales de demostración

Las decisiones aceptadas para demostrar el alcance comprenden dos programas con datos sintéticos identificados como tales; escala de cero a diez, mínima aprobatoria de seis y dos decimales; promedio ponderado por créditos con todos los intentos calificados; y expedición de una constancia de estudios cuando exista al menos una nota final, incluidas asignaturas aprobadas y reprobadas. Las ventanas de inscripción utilizan como referencia la zona de Ciudad de México.

Estas decisiones se registran como reglas de demostración y no se presentan como reglamento de una institución. El mapa visual ICO-F19 tampoco acredita que esté cargado el catálogo oficial completo de claves, créditos y seriación. Los datos ficticios permiten verificar el flujo sin sustituir la autorización de un catálogo real.

### 1.6.3 Limitaciones y restricciones

El proyecto está limitado por el calendario académico, la disponibilidad del equipo y la infraestructura local. No dispone de validación empresarial de campo ni de una certificación de seguridad productiva. La provisión de accesos es un procedimiento separado del registro académico de personas. Los servicios externos, el correo opcional y la operación pública no son requisitos para concluir la demostración acordada.

La documentación y las pruebas automáticas constituyen evidencia técnica; la capacitación, el piloto, las ceremonias metodológicas y las firmas requieren intervención humana verificable. La auditoría vigente mantiene reservas de evidencia y operación, por lo que este informe no declara una aceptación integral inexistente.

# CAPÍTULO II. MARCO TEÓRICO

## 2.1 Sistema informático

Como referencia conceptual se conserva la obra de Laudon y Laudon (2020), incluida en la bibliografía original del proyecto.

### 2.1.1 Definición y componentes

Un sistema informático articula personas, procedimientos, datos, programas y equipos para transformar entradas en resultados útiles. La aplicación es solo uno de sus componentes: también intervienen la persona que configura una política, el docente que captura una nota y el responsable que conserva un respaldo. En SIGA, la información académica se almacena en PostgreSQL, las reglas se ejecutan en la API y los usuarios interactúan desde el navegador.

### 2.1.2 Importancia y tipos

Los sistemas de información permiten registrar operaciones y disponer de datos consistentes para la consulta. Un sistema transaccional protege operaciones concretas, como una inscripción; uno de apoyo a la gestión presenta resultados agregados, como un reporte. SIGA combina ambas funciones dentro de un alcance acotado: administra transacciones académicas y ofrece consultas básicas, sin convertirse en una plataforma analítica empresarial o un aula virtual.

La importancia del enfoque sistémico reside en comprender las consecuencias de cada cambio. Registrar una nota afecta el historial, el promedio, el avance y la elegibilidad futura. Una modificación debe conservar relaciones válidas entre esos resultados y respetar las salidas históricas ya emitidas.

## 2.2 Programación orientada a objetos

### 2.2.1 Definición y conceptos fundamentales

La programación orientada a objetos organiza software mediante entidades que reúnen estado y comportamiento. Una clase describe una estructura; una instancia representa un objeto concreto. Encapsular implica exponer operaciones controladas y mantener detalles internos dentro de una responsabilidad definida. Abstraer consiste en seleccionar los elementos relevantes del problema; la composición permite construir una capacidad mediante otras más pequeñas.

NestJS utiliza clases para controladores, servicios y proveedores. Un controlador recibe la petición y delega la operación; un servicio aplica reglas y coordina persistencia. La inyección de dependencias permite proporcionar a una clase los recursos que necesita sin que tenga que construirlos internamente. El modelo académico se expresa además mediante entidades relacionales y contratos tipados; no exige representar cada tabla como una jerarquía de herencia.

### 2.2.2 Ventajas y limitaciones

La separación de responsabilidades favorece la lectura y las pruebas. Por ejemplo, es posible revisar el cálculo académico sin mezclarlo con la presentación de una tabla. No obstante, introducir clases o capas para operaciones triviales incrementa la navegación y puede ocultar el flujo. El proyecto combina servicios orientados a objetos con funciones de cálculo y componentes funcionales de React según la responsabilidad de cada parte.

El uso de TypeScript no demuestra por sí mismo encapsulación correcta ni calidad de diseño. La mantenibilidad depende de interfaces claras, nombres consistentes, dependencias controladas y pruebas que comprueben reglas de negocio. Una estructura simple y verificable resulta más útil que una acumulación de patrones sin necesidad funcional.

## 2.3 TypeScript y JavaScript

### 2.3.1 Definición y ejecución

JavaScript es el lenguaje que ejecutan el navegador y Node.js. TypeScript incorpora anotaciones y comprobaciones estáticas sobre ese lenguaje; antes de la ejecución, el código se transforma a JavaScript. Los tipos ayudan a detectar contratos incompatibles durante la construcción, pero no sustituyen la validación de datos recibidos desde un formulario o una petición HTTP.

### 2.3.2 Aplicación en SIGA

El repositorio utiliza TypeScript en la API, en la interfaz y en los contratos compartidos. Esa elección facilita mantener conceptos comunes, como los roles o las estructuras de una respuesta, sin duplicar definiciones independientes. La API continúa siendo la autoridad para aceptar o rechazar una operación: una restricción del formulario mejora la experiencia, pero no protege el sistema frente a otras formas de invocar el servicio.

La programación asíncrona permite esperar consultas y operaciones de archivos sin bloquear todo el flujo del programa. Sin embargo, dos peticiones pueden competir por el mismo recurso. La concurrencia requiere transacciones y restricciones; utilizar promesas o esperar una función no garantiza por sí mismo que no haya sobrecupo o pérdida de una corrección.

### 2.3.3 Comunicación y manejo de errores

El navegador intercambia solicitudes HTTP y datos JSON con la API. Los contratos describen la información esperada, mientras las validaciones comprueban tipos, rangos y pertenencia de recursos. Los errores deben informar una condición recuperable sin exponer contraseñas, rutas internas ni detalles innecesarios de la base. Un conflicto de versión, por ejemplo, debe permitir actualizar la información antes de reintentar la captura.

## 2.4 PostgreSQL y Prisma

El modelo relacional se contextualiza con Elmasri y Navathe (2016); la descripción concreta de tablas y restricciones deriva del esquema local.

### 2.4.1 Modelo relacional

Una base relacional organiza información en tablas relacionadas por claves. Las claves primarias identifican registros; las foráneas exigen referencias existentes; las restricciones únicas impiden duplicados según el dominio. En SIGA, una inscripción no es solo la unión de identificadores válidos: estudiante, plan, grupo, asignatura, periodo y política deben pertenecer al mismo contexto académico.

PostgreSQL conserva esas relaciones y ejecuta transacciones. La atomicidad exige que una operación se confirme completa o se revierta; la consistencia mantiene las restricciones; el aislamiento controla interacciones concurrentes; y la durabilidad conserva lo confirmado. Estas propiedades no eliminan la necesidad de diseñar correctamente el proceso: el servicio debe bloquear y volver a comprobar los recursos relevantes dentro de la transacción.

### 2.4.2 Acceso mediante Prisma

Prisma permite describir modelos y generar un cliente tipado para consultar la base desde TypeScript. Las migraciones registran cambios del esquema para aplicarlos de forma controlada. El archivo declarativo no contiene toda la semántica: el proyecto también incorpora SQL con restricciones y disparadores que deben preservarse al evolucionar la estructura.

Las notas y los créditos utilizan valores decimales. Una calificación pendiente se representa sin nota; no debe confundirse con cero, que sí es una calificación posible. Los créditos de la inscripción se conservan como instantánea para que un cálculo histórico no cambie accidentalmente por una modificación posterior del catálogo.

### 2.4.3 Ventajas y compromisos

El modelo relacional facilita consultas relacionadas e integridad explícita. Prisma reduce errores de acceso y mantiene contratos de consulta, pero no reemplaza las restricciones persistentes ni el análisis de concurrencia. PostgreSQL exige administración, respaldos y migraciones; trabajar con contenedores simplifica el aislamiento, pero un volumen persistente continúa necesitando protección y un procedimiento de recuperación probado.

## 2.5 Herramientas de desarrollo

**Tabla 4. Herramientas y responsabilidad en el proyecto.**

| Herramienta               | Aplicación                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Node.js y npm             | Ejecución del backend, instalación reproducible mediante archivo de bloqueo y comandos del monorepositorio. |
| React y Vite              | Componentes de interfaz, desarrollo web y construcción del cliente.                                         |
| NestJS                    | Organización modular de controladores, servicios e infraestructura de API.                                  |
| PostgreSQL y Prisma       | Persistencia, cliente tipado y evolución del esquema.                                                       |
| Docker Compose y Nginx    | Entorno empaquetado local y acceso web a la API mediante proxy.                                             |
| Jest, Vitest y Playwright | Pruebas de servicios e integración, unidades web y recorridos de navegador.                                 |
| ESLint y Prettier         | Reglas estáticas de código y formato uniforme.                                                              |
| GitHub Actions            | Definición de automatizaciones del repositorio; su presencia no demuestra una ejecución remota concreta.    |

La herramienta de edición no determina la arquitectura del producto. El ejemplo académico de estructura menciona otros lenguajes, gestores y entornos; esos nombres se adaptan aquí a las tecnologías efectivamente presentes. No se documenta una instalación de Java, MySQL o NetBeans como requisito de SIGA.

La repetibilidad depende de conservar versiones, archivo de bloqueo, variables locales protegidas y procedimientos de instalación. Los archivos generados y los secretos no deben convertirse en requisitos ocultos de una copia limpia. La documentación técnica detalla los comandos y distingue la ejecución nativa de la modalidad con contenedores.

## 2.6 Aplicaciones web, enfoque sistémico, seguridad y pruebas

### 2.6.1 Arquitectura web

La arquitectura cliente-servidor distribuye responsabilidades entre navegador y servidor. SIGA utiliza una interfaz de una sola página que consulta una API; la API es un monolito modular, es decir, una aplicación desplegable organizada en módulos de negocio. Esta elección mantiene el despliegue sencillo para el alcance local y evita introducir servicios distribuidos sin una necesidad comprobada.

La presentación muestra formularios y resultados. Los servicios aplican reglas, autorizan recursos y coordinan transacciones. La persistencia conserva datos e integridad. Esta separación no significa que toda decisión exista en una sola capa: la interfaz puede anticipar errores para orientar al usuario y la base puede volver a proteger un vínculo crítico.

### 2.6.2 Teoría General de Sistemas

El enfoque de entradas, procesos, salidas y retroalimentación se vincula con Bertalanffy (1968).

La Teoría General de Sistemas permite observar entradas, procesos, salidas y retroalimentación. Para SIGA, las entradas incluyen programas, grupos, solicitudes y notas; los procesos son validación, inscripción, cálculo y emisión; las salidas incluyen historial, avance, reportes y constancias. La retroalimentación aparece cuando una nota habilita una asignatura posterior o cuando una corrección informa que debe revisarse una salida anterior.

Un ejemplo ilustra esa relación: el estudiante obtiene una nota aprobatoria, el historial registra el intento y el avance suma los créditos sin duplicarlos; la oferta puede reconocer el prerrequisito satisfecho. Si existe una constancia emitida, su PDF conserva la instantánea original. La corrección posterior debe auditarse y, cuando corresponda, tratar el documento mediante revocación y reemisión, en lugar de reescribir silenciosamente su contenido.

### 2.6.3 Seguridad de la información

La autenticación determina la identidad y la autorización determina las acciones permitidas. Además del rol, importa el recurso: un docente solo puede calificar los grupos que tiene asignados y un estudiante consulta su información privada. Ocultar un botón no constituye autorización; la API debe comprobar cada operación protegida.

El proyecto utiliza hashes de contraseñas, sesiones contrastadas con la base y cookies HttpOnly y SameSite. Las operaciones de cambio requieren protección CSRF y comprobaciones de origen según el flujo implementado. El almacenamiento de secretos en archivos locales ignorados y el uso de un rol restringido de base disminuyen exposición accidental. Estas medidas son parte del diseño local y no constituyen una certificación de seguridad ni una declaración de cumplimiento normativo productivo.

### 2.6.4 Calidad y pruebas

Una prueba unitaria comprueba una responsabilidad acotada; una prueba de integración ejercita componentes con infraestructura real; una prueba de extremo a extremo reproduce un recorrido desde el navegador. Las pruebas de concurrencia examinan operaciones simultáneas y las de carga observan tiempo y errores bajo un escenario definido. Cada resultado tiene un alcance y depende del código, datos y entorno utilizados.

La cobertura indica qué código se ejecutó durante una batería; no demuestra ausencia de defectos. Del mismo modo, una simulación de zoom CSS no equivale a verificar el zoom real del navegador y un intervalo medido antes de un respaldo no demuestra por sí mismo la pérdida de datos ante un incidente. Por ello la auditoría conserva reservas cuando el instrumento no corresponde al criterio que se pretende acreditar.

### 2.6.5 Constancias y verificación

Una constancia electrónica es una salida académica generada a partir de datos del sistema. SIGA utiliza un código de verificación, una instantánea y una huella SHA-256 del archivo emitido. El código permite consultar un estado público con información mínima, mientras la huella permite detectar alteraciones del archivo conservado. La existencia de un código o un QR no otorga automáticamente validez oficial.

El único tipo de documento del alcance es la constancia de estudios de demostración. No acredita necesariamente la terminación del plan, porque la regla aceptada permite emitirla con al menos una nota final y mostrar materias aprobadas y reprobadas. Su autenticidad dentro de SIGA debe distinguirse de la firma electrónica avanzada y del reconocimiento por una autoridad externa.

# CAPÍTULO III. DISEÑO Y DESARROLLO

## 3.1 Metodología

Las referencias metodológicas son Schwaber y Sutherland (2020) y Beck y Andres (2004). Se distinguen de la evidencia de ejecución real del proyecto.

El informe original propone Scrum como marco de organización y Extreme Programming como referencia de prácticas técnicas. Scrum aporta priorización, trabajo iterativo y revisión; XP orienta hacia pruebas, diseño simple, integración y mejora continua. La elección es pertinente para construir incrementos pequeños y revisar reglas académicas progresivamente.

La reconstrucción realizada en esta entrega se basa en los archivos disponibles. Se observan planes por etapas, backlog, decisiones, pruebas y automatizaciones. Esos artefactos permiten describir una construcción incremental y una estrategia técnica de verificación. No permiten demostrar por sí mismos que se celebraron reuniones concretas, que se trabajó en parejas humanas o que cada prueba se escribió antes que el código. Los registros metodológicos y su validación continúan como una obligación de aceptación humana cuando no exista evidencia suficiente.

**Tabla 5. Marco metodológico y evidencia exigible.**

| Elemento                  | Aplicación documentada o prevista                                | Límite de la afirmación                                                    |
| ------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Backlog y etapas          | Plan maestro, continuación y entregas funcionales identificadas. | El archivo de planificación no prueba una reunión.                         |
| Revisión de requisitos    | Decisiones y criterios vinculados con código y pruebas.          | Las reglas de demostración no equivalen a reglamento institucional.        |
| Calidad técnica           | Suites, análisis estático y comandos de verificación.            | Un resultado solo respalda el candidato y escenario registrados.           |
| Scrum                     | Roles y eventos propuestos en el informe inicial.                | Actas, participantes y aceptación requieren registros reales.              |
| XP                        | Pruebas, refactorización e integración presentes.                | TDD histórico y parejas no se acreditan retrospectivamente por inferencia. |
| Capacitación y aceptación | Guiones, manuales y dossier preparados.                          | La ejecución con personas y las firmas permanecen separadas.               |

Los roles personales consignados en el documento inicial son una propuesta organizativa del trabajo académico y no una certificación de que cada responsabilidad se ejecutó. La coordinación mediante herramientas y agentes de apoyo tampoco sustituye la revisión del equipo ni la conformidad del responsable académico.

## 3.2 Recolección de la información

La fuente principal de esta revisión es documental: informe original, estructura solicitada, indicaciones de presentación, plan maestro, decisiones, backlog, modelos, código y evidencias del repositorio. Se contrastaron nombres, relaciones y procesos con el esquema Prisma y la documentación de arquitectura. No se registran entrevistas, encuestas, observaciones de una empresa ni mediciones con usuarios que no estén respaldadas por instrumentos y participantes identificables.

### 3.2.1 Alcance del análisis

Se sigue el recorrido desde la preparación de catálogos y personas hasta la emisión y consulta de una constancia. La revisión incluye acceso por roles, consistencia académica, conservación del historial y operación local. Se distinguen funciones implementadas de comprobaciones pendientes; las necesidades ajenas a la demostración se mantienen fuera de alcance.

La entrega documental adapta los ejemplos tecnológicos de la estructura institucional. Conserva los apartados de contexto, teoría, diseño, implementación, conclusiones y anexos, pero desarrolla el contenido con la aplicación real. También elimina la hoja de instrucciones y los textos de ejemplo ajenos a SIGA del cuerpo del trabajo.

### 3.2.2 Análisis de procesos

El proceso comienza cuando la administración prepara programas, planes, asignaturas, personas, periodos y grupos. El alta de una persona crea su relación académica, pero el acceso requiere una provisión de credenciales independiente. El estudiante autenticado consulta la oferta de su plan y solicita una inscripción. El servicio verifica estado, fechas, requisitos y cupo dentro del proceso protegido.

Posteriormente, el docente asignado registra la nota final de la inscripción. El cálculo académico utiliza notas calificadas y créditos históricos; diferencia pendientes, aprobaciones y reintentos. El estudiante consulta los resultados y solicita una constancia cuando cumple la regla de demostración. La emisión conserva su instantánea, genera el archivo y registra su integridad. La administración dispone de reportes y de operaciones controladas de revocación o reemisión.

### 3.2.3 Estudio de factibilidad

**Tabla 6. Factibilidad del alcance académico local.**

| Dimensión          | Evaluación razonada                                                                         | Condición o restricción                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Técnica            | Existe una arquitectura implementada con herramientas disponibles y procedimientos locales. | Requiere versiones compatibles, base preparada y verificación del candidato final.           |
| Operativa          | Los tres perfiles tienen recorridos y materiales de uso.                                    | La facilidad de uso debe confirmarse en un piloto humano.                                    |
| Económica          | El desarrollo no exige licencias comerciales de los componentes principales.                | No hay presupuesto validado ni estudio de rentabilidad; equipo y mantenimiento tienen costo. |
| Temporal           | El trabajo se organiza en entregas y criterios identificados.                               | El calendario del curso limita nuevas funciones y exige priorizar defectos del alcance.      |
| Datos y privacidad | La demostración puede ejecutarse con datos ficticios.                                       | No autoriza importar expedientes reales ni publicar credenciales.                            |
| Académica          | La estructura permite presentar requisitos, diseño, pruebas y manuales.                     | La aceptación, metodología y firmas dependen de evaluación humana.                           |

La conclusión de factibilidad se limita a continuar y demostrar el producto local. No acredita capacidad de una infraestructura pública ni una contratación empresarial. Antes de operar con información real se requeriría otra evaluación de seguridad, disponibilidad, privacidad, soporte y autoridad sobre las reglas académicas.

### 3.2.4 Análisis de los requerimientos

Los requisitos se agrupan en funcionales, reglas de negocio y atributos no funcionales. Su referencia detallada se conserva en la matriz de trazabilidad del repositorio, junto con los identificadores RF, RN y RNF existentes. La tabla siguiente resume familias para lectura del informe; no crea nuevos requisitos ni sustituye dicha matriz.

**Tabla 7. Familias de requerimientos y criterio de diseño.**

| Familia              | Necesidad                                                      | Criterio observable                                                |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Identidad y acceso   | Iniciar y cerrar sesión con permisos apropiados.               | Rechazo de sesión inválida y de operaciones sobre recursos ajenos. |
| Catálogos y personas | Administrar datos y conservar referencias históricas.          | Validación de claves y bajas lógicas sin eliminar historial.       |
| Plan y oferta        | Relacionar versión, asignaturas, seriación, periodos y grupos. | Rechazo de ciclos y combinaciones académicas incompatibles.        |
| Matrícula            | Inscribir solo cuando se satisfacen reglas y hay lugar.        | Ausencia de duplicados y protección del último cupo concurrente.   |
| Evaluación           | Registrar y corregir nota final con trazabilidad.              | Precisión válida, control de versión y auditoría del cambio.       |
| Consulta académica   | Presentar historial, promedio y avance.                        | Cálculo consistente con política e instantánea de créditos.        |
| Documentos           | Emitir y verificar una constancia de estudios.                 | Instantánea, archivo íntegro y estado de emisión o revocación.     |
| Operación y calidad  | Instalar, respaldar y verificar el sistema.                    | Procedimientos reproducibles y evidencias con sus límites.         |

La política provisional usa promedio ponderado: la suma de cada nota multiplicada por sus créditos se divide entre la suma de créditos de los intentos calificados incluidos. Si no existen intentos aplicables, no se inventa una nota de cero. El avance suma una sola vez los créditos de cada asignatura aprobada y debe tratar de forma explícita un plan sin créditos. Las condiciones de una política se conservan versionadas para interpretar los intentos históricos.

### 3.2.5 Definición de casos de uso

**Tabla 8. Casos de uso principales por actor.**

| Actor         | Caso de uso              | Precondición                                         | Resultado esperado                                                  |
| ------------- | ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Administrador | Preparar catálogo y plan | Sesión administrativa activa.                        | Estructura válida sin ciclos y con versión identificable.           |
| Administrador | Registrar personas       | Datos válidos y claves disponibles.                  | Perfil y cuenta relacionados; acceso tratado por separado.          |
| Administrador | Abrir oferta             | Plan, asignatura, docente y periodo compatibles.     | Grupo disponible con cupo y política definidos.                     |
| Estudiante    | Inscribirse en grupo     | Perfil activo, oferta elegible y ventana vigente.    | Inscripción única y auditada o rechazo sin cambios parciales.       |
| Docente       | Capturar nota final      | Asignación al grupo y versión vigente.               | Nota válida persistida junto con su auditoría.                      |
| Estudiante    | Consultar avance         | Sesión del titular.                                  | Historial y cálculos de su propia trayectoria.                      |
| Estudiante    | Solicitar constancia     | Al menos una nota final según regla de demostración. | Emisión con instantánea y archivo o estado recuperable de fallo.    |
| Público       | Verificar código         | Código conocido de una constancia.                   | Estado e información pública mínima.                                |
| Administrador | Revocar o reemitir       | Documento elegible y motivo cuando corresponde.      | Conservación del documento previo y trazabilidad de la sustitución. |

En matrícula, el flujo alternativo puede ser cupo agotado, requisito no satisfecho, duplicado o ventana cerrada. La oferta orienta al estudiante, pero el servidor vuelve a comprobar las reglas al recibir la solicitud. En calificaciones, una versión obsoleta provoca conflicto en lugar de sobrescribir un cambio ajeno. En emisión, un fallo entre base y archivo exige recuperación y conciliación; no debe resolverse mediante borrados indiscriminados.

## 3.3 Diseño

### 3.3.1 Diseño conceptual

El concepto central es la trayectoria de un estudiante dentro de una versión de plan. Un programa dispone de planes; cada plan incorpora asignaturas con créditos y relaciones de prerrequisito. Un periodo aplica una política y ofrece grupos para asignaturas del plan. El grupo pertenece a un docente y recibe inscripciones de estudiantes compatibles con ese plan.

La identidad de acceso se separa del perfil académico. Usuario conserva correo, hash, rol y estado; Estudiante o Docente agregan sus datos específicos. Sesion permite controlar vigencia y revocación. Esta separación evita confundir una baja o modificación académica con una concesión de credenciales.

La inscripción reúne el contexto histórico: estudiante, grupo, asignatura, plan, periodo, política, estado, nota y créditos. Certificado conserva la salida emitida, su instantánea y su archivo; Auditoria registra acciones relevantes y valores anteriores o posteriores. El diseño mantiene restricciones de eliminación para proteger relaciones e historial.

### 3.3.2 Modelo relacional

El esquema Prisma describe quince modelos de dominio; con la tabla interna de migraciones se contabilizan dieciséis tablas. Sus relaciones se complementan con restricciones y disparadores SQL. Las asociaciones de muchos a muchos se representan explícitamente cuando contienen datos del dominio: PlanAsignatura agrega créditos y semestre sugerido; Prerrequisito expresa una arista dentro del mismo plan.

**Tabla 9. Entidades y relaciones principales del modelo.**

| Entidad           | Responsabilidad                         | Relación principal                           |
| ----------------- | --------------------------------------- | -------------------------------------------- |
| Usuario           | Identidad de acceso y rol.              | Sesiones, perfil y actor de auditoría.       |
| Sesion            | Vigencia y revocación del acceso.       | Pertenece a un usuario.                      |
| Programa          | Catálogo de programas.                  | Contiene versiones de planes.                |
| PlanEstudio       | Versión de estructura académica.        | Programa, asignaturas y estudiantes.         |
| Estudiante        | Perfil académico del participante.      | Usuario, plan, inscripciones y constancias.  |
| Docente           | Perfil del instructor.                  | Usuario y grupos asignados.                  |
| Asignatura        | Identidad de unidad de aprendizaje.     | Participa en distintos planes.               |
| PlanAsignatura    | Configuración de asignatura en plan.    | Créditos, seriación y grupos.                |
| Prerrequisito     | Dependencia entre asignaturas del plan. | Origen requerido y destino.                  |
| PoliticaAcademica | Escala y reglas versionadas.            | Aplicación mediante periodos.                |
| Periodo           | Calendario y ventana de inscripción.    | Política y grupos.                           |
| Grupo             | Oferta con docente y cupo.              | Asignatura del plan e inscripciones.         |
| Inscripcion       | Intento académico y resultado.          | Estudiante y contexto íntegro del grupo.     |
| Certificado       | Constancia, estado e integridad.        | Estudiante y eventual documento reemplazado. |
| Auditoria         | Trazabilidad aditiva de acciones.       | Actor opcional y recurso identificado.       |

Las claves compuestas impiden combinar una inscripción con un plan ajeno al estudiante o un contexto distinto del grupo. La unicidad de estudiante, asignatura y periodo protege contra duplicación entre grupos. Las referencias de tipo Restrict evitan eliminaciones en cascada sobre el historial. Los estados se representan con enumeraciones explícitas, por ejemplo PENDIENTE y CALIFICADA para inscripción, y PENDIENTE, EMITIDO, REVOCADO o FALLIDO para constancia.

El control de concurrencia combina restricciones, transacciones serializables y bloqueos con orden consistente. La nota utiliza una versión para detectar ediciones sobre información obsoleta. Estas decisiones responden a fallos concretos del dominio y no se sustituyen con validaciones solo en el navegador.

## 3.4 Diccionario de datos

El diccionario siguiente describe por entidad los campos, tipos, nulabilidad, valores iniciales y claves declaradas en el esquema real `apps/api/prisma/schema.prisma`. El esquema y las migraciones constituyen la referencia técnica para contrastarlo; la extracción automática evita transcribir nombres incompatibles con la aplicación.

La lectura del diccionario requiere distinguir tipos de aplicación y tipos de almacenamiento. Un identificador String puede almacenarse como UUID; DateTime puede corresponder a fecha o instante con zona; Decimal conserva precisión definida; Json permite almacenar una instantánea estructurada. Un campo opcional no necesariamente carece de regla: la nota solo procede en estados compatibles y una emisión exige datos de archivo que no existen mientras está pendiente.

Además de la descripción por campo deben conservarse las garantías transversales: correo y claves normalizados, créditos positivos, coherencia de ventanas, ausencia de ciclos, relación del estudiante con su plan, integridad del grupo y protección de auditoría. Algunas residen en SQL o servicios, por lo que no deben atribuirse de manera exclusiva al archivo Prisma.

## 3.5 Diseño de interfaces

### 3.5.1 Organización por perfil

La portada permite iniciar sesión y presenta el carácter general del sistema. Tras autenticarse, el usuario accede al espacio de su rol. El estudiante dispone de matrícula, calificaciones, trayectoria y constancias; el docente consulta sus grupos y captura notas; la administración opera catálogos, personas, oferta, documentos y reportes. Los nombres del dominio se mantienen en español para facilitar la relación entre pantallas y procesos académicos.

**Tabla 10. Pantallas y finalidad de interacción.**

| Perfil        | Interfaz                     | Información y acción principal                                        |
| ------------- | ---------------------------- | --------------------------------------------------------------------- |
| Común         | Acceso y sesión              | Identidad, errores comprensibles y cierre de sesión.                  |
| Estudiante    | Matrícula                    | Oferta elegible, lugares, motivos de rechazo e inscripciones propias. |
| Estudiante    | Calificaciones y trayectoria | Historial, promedio, créditos y progreso.                             |
| Estudiante    | Constancias                  | Solicitud, estado y descarga autorizada.                              |
| Docente       | Grupos y captura             | Lista propia, alumnos y edición de nota final.                        |
| Administrador | Catálogos y personas         | Búsqueda, alta, edición y consulta de archivados.                     |
| Administrador | Periodos y grupos            | Calendario, ventana, política, docente y cupo.                        |
| Administrador | Documentos y reportes        | Consulta, filtros, revocación y exportación permitida.                |
| Público       | Verificación                 | Consulta mínima del estado mediante código.                           |

### 3.5.2 Validación y retroalimentación

Las interfaces distinguen carga, ausencia de resultados, error y éxito. Los formularios orientan sobre campos y muestran rechazos del servidor sin simular que se guardó una operación fallida. Las listas requieren búsqueda y paginación para que el acceso a datos no dependa de que todos los registros quepan en una primera página.

La captura de notas exige especial cuidado con borradores y conflictos. Cada fila puede contener una modificación pendiente; un fallo parcial no debe presentar todas las filas como guardadas. Una respuesta tardía de una sesión anterior debe descartarse para evitar mezclar información privada entre personas que usan el mismo navegador. Estas propiedades se revisan tanto en el comportamiento del cliente como en las pruebas de integración del flujo.

### 3.5.3 Adaptabilidad y accesibilidad

El diseño adapta navegación, formularios y tablas a escritorio y móvil. Los controles deben tener etiquetas, orden de foco comprensible y operación mediante teclado. Las pestañas requieren semántica y comportamiento consistentes, y los mensajes de error deben asociarse con la acción que los originó.

La presencia de reglas CSS adaptables no basta para declarar accesibilidad completa. Las auditorías mantienen pendientes de comprobación cuando falta recorrer tareas con Tab real, verificar el aumento mediante zoom real del navegador o revisar desbordamientos y recuperación del foco. Los manuales anexos complementan este diseño con los pasos de uso y resolución de incidencias; no sustituyen la prueba con participantes.

### 3.5.4 Relación con implementación y verificación

Las interfaces se conectan a servicios mediante contratos compartidos y conservan separación entre presentación y autoridad de negocio. La matrícula que se muestra como disponible se revalida al enviarse; la nota se autoriza por asignación; la descarga comprueba pertenencia; y la verificación pública evita exponer el expediente completo. El capítulo de implementación desarrolla cómo se construye y opera esta arquitectura, mientras los anexos reúnen los materiales necesarios para utilizarla y mantenerla.
