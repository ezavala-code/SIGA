"""Compone la fuente completa y HTML académico usando solo archivos locales."""
from pathlib import Path
import re
import json
import subprocess
import markdown
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/entrega-revisada'
chapters = (OUT / 'CAPITULOS_I_II_III_FORMATO.md').read_text()
schema = (ROOT / 'apps/api/prisma/schema.prisma').read_text()
models = re.findall(r'model (\w+)\s*\{(.*?)\n\}', schema, re.S)
model_names = {name for name, _ in models}
dictionary = []
for number, (name, body) in enumerate(models, 1):
    dictionary += [f'### 3.4.{number} Entidad {name}', '', '| Campo | Tipo y nulabilidad | Restricción declarada |', '| --- | --- | --- |']
    for line in body.splitlines():
        match = re.match(r'\s*(\w+)\s+([\w?\[\]]+)\s*(.*)', line)
        if not match or match[2].rstrip('?[]') in model_names:
            continue
        field, kind, attrs = match.groups()
        database_type = re.search(r'@db\.([\w]+(?:\([^)]*\))?)', attrs)
        kind = kind + ((' / ' + database_type[1]) if database_type else '')
        rules = []
        if '@id' in attrs: rules.append('Clave primaria')
        if '@unique' in attrs: rules.append('Único')
        if '@updatedAt' in attrs: rules.append('Actualización automática')
        if '@default' in attrs: rules.append('Valor inicial definido en esquema')
        if field == 'passwordHash': rules.append('Hash privado; no exponer')
        if field == 'notaFinal': rules.append('Pendiente distinto de cero; escala por política')
        if field == 'version': rules.append('Versión de entidad o edición según modelo')
        dictionary.append(f'| {field} | {kind} | {"; ".join(rules) or "Validar contrato y relaciones del modelo"}. |')
    constraints = [line.strip() for line in body.splitlines() if line.strip().startswith(('@@id', '@@unique', '@@index'))]
    dictionary += ['', 'Restricciones e índices compuestos: ' + ('; '.join('`' + line + '`' for line in constraints) if constraints else 'no se declaran adicionales en este modelo') + '.', '']
chapters = chapters.replace('## 3.5 Diseño de interfaces', '\n'.join(dictionary) + '\n## 3.5 Diseño de interfaces')
chapters = chapters.replace('### 3.3.1 Diseño conceptual', '### 3.3.1 Diseño conceptual\n\n![Flujo de subsistemas](figuras/conceptual.svg)\n\nGráfico 1. Entradas, procesos, salidas y retroalimentación del SIGA.\n')
chapters = chapters.replace('### 3.3.2 Modelo relacional', '### 3.3.2 Modelo relacional\n\n![Relaciones de entidades](figuras/relacional.svg)\n\nGráfico 2. Relaciones principales de los quince modelos de dominio. Las claves y cardinalidades se detallan en el esquema y el diccionario.\n')
front = '''<div class="cover">
<p>UNIVERSIDAD AUTÓNOMA DEL ESTADO DE MÉXICO</p>
<p>UNIDAD ACADÉMICA PROFESIONAL TIANGUISTENCO</p>
<p>ASIGNATURA: INGENIERÍA DE SOFTWARE</p>
<p>GRUPO: C9</p>
<p>SISTEMA INTEGRAL DE GESTIÓN ACADÉMICA</p>
<p>INTEGRANTES DEL EQUIPO:</p>
<p>Abraham Eduardo Zavala Dehonor</p>
<p>Antonio Hernandez García</p>
<p>DOCENTE: ING. JOSAFAT MARTÍNEZ MARTÍNEZ</p>
<p>DICIEMBRE DE 2026</p>
</div>

# CONTENIDO

[[CONTENIDO]]

# INTRODUCCIÓN

El Sistema Integral de Gestión Académica (SIGA) integra información y procesos de inscripción, evaluación, seguimiento y emisión de constancias. El caso académico de CodeShift Empresarial permite estudiar cómo una organización de capacitación puede relacionar personas, programas, planes y grupos en una aplicación web con autorización por rol y conservación del historial.

El trabajo presenta el marco contextual, los fundamentos teóricos, el análisis y diseño, la implementación y las conclusiones. Se incluye un diccionario derivado del esquema de datos real, diagramas, resultados registrados, limitaciones y manuales de operación. Las tecnologías documentadas corresponden a la implementación: TypeScript, React/Vite, NestJS, Prisma y PostgreSQL.

El alcance es una demostración local con datos ficticios. Los resultados técnicos disponibles se distinguen de las pruebas pendientes y de la aceptación humana. El documento no presenta el prototipo como servicio institucional ni atribuye a participantes actividades que no están acreditadas. El corte técnico y documental de referencia es el 9 de noviembre de 2026; la fecha de portada sigue el periodo académico solicitado.

# RESUMEN

Se desarrolló SIGA como aplicación web para administrar programas y planes, estudiantes y docentes, periodos y grupos, inscripción, calificaciones, avance, constancias y reportes. Su diseño utiliza un monorepositorio TypeScript con React/Vite, NestJS, Prisma y PostgreSQL. La API valida sesión, rol y recurso; la matrícula combina restricciones y transacciones, y la corrección de notas emplea control de versión y auditoría. El historial calcula resultados por créditos y la constancia conserva una instantánea verificable mediante PDF, hash y código QR.

La revisión local del 9 de noviembre registró aprobación de lint, tipos, compilación y 38 pruebas API y 40 pruebas web. Los registros anteriores informan pruebas de integración, navegador, carga y restauración; sus límites se conservan explícitos. Persisten reservas en el instrumento de RPO, cobertura exigible, pruebas específicas de accesibilidad y sesión, trazabilidad del candidato y aceptación humana. Se entregan arquitectura, diccionario, evidencias indexadas y manuales completos dentro del informe. El resultado es una base funcional sustancial para demostración académica; su cierre integral requiere completar las comprobaciones y el piloto, sin añadir módulos fuera del alcance aprobado.

**Palabras clave:** gestión académica; aplicación web; integridad; trazabilidad; demostración local.

# ÍNDICE DE TABLAS

[[TABLAS]]

# ÍNDICE DE GRÁFICOS

[[GRAFICOS]]

'''
implementation = '''
# CAPÍTULO IV. IMPLEMENTACIÓN DEL SITIO WEB

## 4.1 Configuración de las herramientas de desarrollo

### 4.1.1 Node.js, npm y TypeScript

El repositorio declara Node.js 24.19.x y npm 12.2.x. El archivo de bloqueo fija las dependencias; npm organiza los espacios de trabajo de API, web y contratos. La preparación utiliza npm ci en una copia nueva y genera el cliente Prisma. TypeScript permite comprobar tipos antes de compilar, sin reemplazar la validación de datos externos en servidor. Las instrucciones completas y límites de plataforma están en el anexo 3.

### 4.1.2 PostgreSQL y Prisma

Prisma define quince modelos de dominio y cuatro migraciones. PostgreSQL añade restricciones, índices y validaciones que protegen identidad, relaciones e historial. La base de prueba debe ser independiente de la demostración; los runners crean esquemas temporales identificados. La API no requiere un usuario administrador de base de datos para su operación habitual.

### 4.1.3 Vite, Docker y configuración local

Vite organiza la compilación y desarrollo de la interfaz. Compose coordina PostgreSQL, migraciones, permisos, API, Nginx y volumen privado de PDF. Los secretos se generan y conservan fuera del paquete público. La instalación nativa y algunas herramientas de bootstrap tienen diferencias entre PowerShell y POSIX, documentadas sin prometer compatibilidad universal.

## 4.2 Arquitectura del sistema

![Arquitectura de despliegue local](figuras/arquitectura.svg)

Gráfico 3. Arquitectura local de navegador, proxy, API, base y almacenamiento PDF.

En Compose el navegador se comunica con Nginx; las solicitudes de API pasan por /api hacia NestJS. Los servicios aplican reglas y trabajan con PostgreSQL mediante Prisma. El archivo PDF se conserva en volumen privado y su hash en la base. En desarrollo, web y API usan puertos locales separados. La autenticación combina cookie HttpOnly, token firmado y sesión revocable; CSRF y control de origen protegen las escrituras.

## 4.3 Implementación del sistema

### 4.3.1 Definición de módulos

| Módulo | Implementación principal | Salida |
| --- | --- | --- |
| Autenticación y personas | Sesiones, roles, cuentas y perfiles; provisión local separada. | Acceso controlado e historial de acciones. |
| Catálogos y oferta | Programas, planes, asignaturas, requisitos, periodos y grupos. | Oferta coherente con referencias y estados. |
| Matrícula | Elegibilidad, cupo, duplicidad, transacciones y auditoría. | Inscripción o rechazo explicado. |
| Calificaciones | Docente asignado, nota final, versiones y motivo. | Historial de notas y correcciones. |
| Historial y avance | Cálculos Decimal por créditos e intentos. | Promedios y créditos aprobados únicos. |
| Constancias | Snapshot, PDF, hash, QR, revocación y recuperación. | Documento de estudios verificable del prototipo. |
| Reportes | Consultas, CSV y bitácora. | Datos filtrados según rol y propiedad. |

### 4.3.2 Desarrollo e integración

Los contratos compartidos reducen divergencias entre pantalla y API, pero las reglas críticas permanecen en servidor. Las bajas lógicas conservan historia; los planes versionados evitan reinterpretar intentos anteriores. Los cambios de sesión cancelan solicitudes y descartan respuestas obsoletas. Los borradores docentes conservan cambios por fila ante errores y conflictos.

La emisión usa una instantánea de notas, genera el PDF y valida el estado antes de finalizar. La recuperación impide finalizar dos veces y el hash detecta archivos alterados. La optimización de fuentes conserva texto latino estándar y añade fuentes alternativas para los caracteres admitidos. Su medición no demuestra soporte universal para cualquier escritura.

### 4.3.3 Implementación local y control de versión

El despliegue de demostración no es publicación institucional. Debe identificarse una versión, sus configuraciones e imágenes, y conservar un manifiesto verificable. La auditoría encontró un manifiesto documental anterior desactualizado y una huella técnica histórica sin inventario específico reproducible; por ello se generó un inventario actual separado. La disponibilidad de scripts no acredita por sí sola su ejecución en otra máquina.

## 4.4 Pruebas de la aplicación

### 4.4.1 Estrategia y resultados registrados

| Verificación | Resultado disponible | Límite de interpretación |
| --- | --- | --- |
| Check de la auditoría del 9 de noviembre | Lint, tipos, 38 pruebas API, 40 web y builds aprobados. | No incluye integración, E2E, carga ni restauración. |
| Cobertura e integración anteriores | Dossier registra 131 pruebas aprobadas. | Reconciliar inventario de archivos exigibles y reporte. |
| Navegador anterior | Dossier registra 34 E2E aprobados. | Zoom real y 401 tardío requieren comprobación más precisa. |
| Carga Unicode anterior | 780 solicitudes, 0 errores inesperados, p95 670,84 ms. | Tandas de 20; no carga continua ni descarga bajo carga. |
| Restauración anterior | Recuperación de stack local, datos y dos PDFs; RTO 9,47 s. | Cálculo publicado de RPO necesita corrección. |

Las cifras anteriores no son nuevas ejecuciones de la edición del informe. El anexo 4 conserva fuentes y reservas; no se calcula un porcentaje de terminación a partir del número de pruebas verdes.

### 4.4.2 Casos y criterios de aceptación

Los casos CP-01–15 provienen del informe original y CP-16–18 amplían el plan maestro. Incluyen acceso, altas y bajas, prerrequisitos, último cupo y duplicidad concurrentes, propiedad de notas e historial, escala, promedio, avance, constancias, reportes, usabilidad y restauración. Los detalles de dato esperado, prueba y reserva se conservan en el anexo 4. Una prueba secuencial no acredita concurrencia y una simulación CSS no acredita zoom real.

### 4.4.3 Integridad, permisos y recuperación

La autorización debe acreditarse por método, rol, propiedad y estado. Existen pruebas de conflictos de notas, cupo y recuperación de constancias; falta completar atribución al candidato y algunos subcasos. El RPO debe medir información recuperable al incidente mediante marcas persistidas y comparadas, no la duración entre una escritura y la creación del respaldo.

## 4.5 Capacitación al personal

El material está preparado por rol e incluye ejercicios, rúbrica, padrón y refuerzo. El estudiante practica inscripción, consulta e interpretación de constancia; el docente captura y corrige notas de sus grupos; administración prepara oferta, revisa reportes y conserva historia. Soporte añade instalación y recuperación.

La capacitación real requiere convocatoria, participantes y evaluación auténticos. Se exige al menos 80/100 y todas las tareas críticas correctas, con seguimiento de todos los convocados y representación acreditada de los tres roles. No se consideran realizadas las sesiones por haber redactado manuales o guiones. El anexo 5 contiene formatos pendientes de ejecución.

## 4.6 Mantenimiento de la aplicación

### 4.6.1 Mantenimiento preventivo y respaldos

Se acordó respaldo diario y antes de cambios importantes, con objetivos provisionales de RTO máximo de cuatro horas y RPO máximo de veinticuatro horas. Deben asignarse custodio, destino protegido y retención reales. Una carpeta retenida de prueba no demuestra una rutina diaria ni resguardo fuera del equipo.

### 4.6.2 Mantenimiento correctivo

Las incidencias se reproducen con datos ficticios, se registran pasos, versión y resultado esperado, y se corrigen con cambios mínimos. Las prioridades inmediatas son el instrumento RPO, cobertura/CI y los escenarios específicos pendientes. Deben conservarse integridad, permisos y contratos y repetirse las pruebas afectadas.

### 4.6.3 Actualizaciones y continuidad

Cada cambio requiere candidato identificable, respaldo propio y migraciones compatibles. Las guías de rollback no permiten una reversión arbitraria de esquema. La conciliación de PDF es diagnóstico y no autoriza borrar archivos dudosos automáticamente. Se actualizan manuales, diccionario y evidencias cuando cambian los contratos. La continuidad depende también de personas responsables y aceptación del entorno receptor.

# CAPÍTULO V. CONCLUSIONES Y RECOMENDACIONES

## 5.1 Conclusiones

### 5.1.1 Resultado frente al objetivo

SIGA reúne los principales procesos previstos en una aplicación web: administración de estructura académica, inscripción, calificaciones, historial, avance y constancias. La revisión identifica implementación sustancial y mecanismos para conservar integridad, autorizar por rol y registrar cambios. La entrega dispone de código, modelo, migraciones, pruebas y materiales operativos; no necesita una reescritura para continuar su cierre.

El resultado corresponde a una demostración local con datos ficticios y reglas provisionales autorizadas. El catálogo oficial, reglamento institucional y condiciones productivas no se acreditan por esta demostración. La constancia generada es de estudios y no certifica la conclusión de un programa ni incorpora firma electrónica avanzada.

### 5.1.2 Integración y calidad

La TGS se observa en el intercambio entre oferta, matrícula, notas, historial y constancias, así como en la retroalimentación mediante corrección y auditoría. Una nota modifica el estado académico sin alterar silenciosamente una constancia previa. Transacciones, versiones y snapshots separan hechos históricos de cálculos vigentes.

El check registrado aprobó lint, tipos, pruebas unitarias y compilación. Las demás evidencias muestran avances de integración, navegador, carga y restauración, con los límites de su método. El aprendizaje principal es que implementación, verificación y aceptación son dimensiones diferentes: una matriz marcada en verde no sustituye el caso probado y una métrica necesita una fórmula que represente su objetivo.

### 5.1.3 Límites del cierre

No puede afirmarse cierre integral sin reservas. Faltan correcciones del instrumento RPO y cobertura, pruebas concretas de accesibilidad y sesión, y mayor coherencia de candidato/evidencia. El piloto, la capacitación, la metodología humana y las firmas siguen pendientes de ejecución o resolución académica auténtica. La asistencia de agentes permite repartir trabajo, pero no reemplaza participantes ni aceptación.

## 5.2 Recomendaciones

### 5.2.1 Prioridades dentro del alcance

1. Corregir RPO con datos persistidos y recuperación comparada; reconciliar cobertura exigible y conservar el reporte real de CI.
2. Acreditar tareas por teclado y zoom real, respuesta tardía mediante el cliente real y permisos por método/recurso.
3. Completar recorridos integrales de los dos programas, inventario de listas y recuperación durable/timeout.
4. Congelar una versión y guardar pruebas, configuración y manifiestos coherentes.
5. Validar manuales en el entorno receptor, ejecutar piloto y evaluación por rol, y registrar aceptación auténtica.

### 5.2.2 Evolución futura separada

El catálogo oficial, reglamento definitivo, HTTPS público, correo, integración institucional y operación con datos reales requieren decisiones y comprobaciones adicionales. No se añaden como obligaciones nuevas del cierre local. La mejora debe responder a defectos o mediciones, evitando optimizaciones no justificadas que compliquen un sistema ya implementado.

'''
text_original = subprocess.run(['pdftotext', '-layout', str(ROOT / 'EntregablesPI-Ing-Software-completado.pdf'), '-'], check=True, capture_output=True, text=True).stdout
bib = text_original.split('\f')[-2]
bib = re.sub(r'^\s*Bibliograf[íi]a\s*', '', bib)
bib = re.sub(r'\n\s*35\s*$', '', bib).strip()
paragraphs=[]
for paragraph in re.split(r'\n\s*\n',bib):
    text=' '.join(paragraph.split())
    if text and text!='35':paragraphs.append(text)
bibliography = '# BIBLIOGRAFÍA\n\n'+'\n\n'.join(paragraphs)+'\n\n'
info=json.loads((ROOT/'docs/evidencias/equipo-documentacion-20261109.json').read_text())
equipment=f'''# ANEXOS

Los anexos reúnen información necesaria para reproducir y utilizar la demostración, sin confundir materiales preparados con aceptación realizada. Se presentan primero el informe de equipos y los dos manuales solicitados; después se conserva la trazabilidad que permite revisar límites, pruebas y decisiones. Todos forman parte de este mismo documento.

| Anexo | Contenido | Finalidad |
| --- | --- | --- |
| 1 | Informe de equipos de computación. | Identificar el entorno observado y los datos de puestos todavía no proporcionados. |
| 2 | Manual de usuario. | Realizar tareas de estudiante, docente y administración. |
| 3 | Manual técnico. | Instalar, configurar, operar, probar y recuperar el prototipo. |
| 4 | Trazabilidad, evidencias y trabajo restante. | Relacionar criterios, registros y reservas del cierre. |
| 5 | Capacitación y aceptación. | Ejecutar evaluación y registrar participación auténtica. |
| 6 | Decisiones y exclusiones. | Conservar acuerdos provisionales y límites del alcance. |

# ANEXO 1. INFORME DE EQUIPOS DE COMPUTACIÓN

## A1.1 Equipo y entorno observados

El registro describe los recursos visibles durante la elaboración documental del 9 de noviembre de 2026. No es un inventario patrimonial ni acredita que todas las pruebas históricas se ejecutaran con esta misma asignación de recursos. No se publican nombres de host, números de serie, claves ni credenciales.

| Elemento | Observación local | Interpretación |
| --- | --- | --- |
| Sistema | {info['sistema']} / {info['arquitectura']} | Entorno visible de elaboración. |
| Procesador visible | {info['cpu_modelo_visible']} | Identificador reportado por el sistema. |
| Procesadores lógicos visibles | {info['cpu_logicas_visibles']} | No es garantía de recursos dedicados. |
| Memoria visible | {info['memoria_visible_GiB']} GiB | Memoria reportada, no consumo ni mínimo recomendado. |
| Código y herramienta | Aplicación 0.1.0; Node 24.19.x/npm 12.2.x declarados. | Versiones de proyecto, no inventario universal. |
| Edición documental | LibreOffice 24.2; fuentes declaradas Arial. | El PDF sustituye Arial si la fuente no está instalada. |

## A1.2 Puestos de los usuarios

| Puesto previsto | Uso | Identificación física y validación |
| --- | --- | --- |
| Administración | Catálogos, personas, oferta, reportes y operación autorizada. | Equipo receptor no proporcionado; validar navegador y acceso local. |
| Docente | Grupos, captura y corrección de notas. | Equipo receptor no proporcionado; validar teclado y pantalla. |
| Estudiante | Oferta, inscripción, notas y constancias. | Equipo receptor no proporcionado; validar navegador y tamaño de pantalla. |
| Soporte | Instalación, respaldo y recuperación. | Responsable y medio externo protegidos pendientes de asignación. |

## A1.3 Condiciones de uso y mantenimiento

Los puestos requieren navegador compatible y acceso al entorno de demostración. El servidor necesita puertos libres, espacio para base/PDF/respaldos y versiones compatibles de las herramientas. La capacidad disponible debe comprobarse antes de medir o presentar; no se deduce un mínimo de hardware a partir de la memoria del equipo observado. El inventario definitivo debe registrar equipo, ubicación, responsable y mantenimiento con datos reales autorizados por la organización.

'''
def manual(name, title, prefix):
    source=(ROOT/'docs/manuales'/name).read_text()
    source=re.sub(r'^# .*?\n', '# '+title+'\n',source,count=1)
    source=re.sub(r'^## (\d+)\. ',lambda m:'## '+prefix+'.'+m[1]+' ',source,flags=re.M)
    return source+'\n\n'
complement=(OUT/'COMPLEMENTO_INFORME_SIGA.md').read_text()
case_table=complement.split('# Anexo A. Requisitos y casos de aceptación',1)[1].split('# Anexo B.',1)[0]
annex4='''# ANEXO 4. TRAZABILIDAD, EVIDENCIAS Y TRABAJO RESTANTE

## A4.1 Casos de prueba del alcance

'''+case_table+'''
## A4.2 Correcciones y verificaciones pendientes

| Frente | Trabajo restante | Evidencia de cierre |
| --- | --- | --- |
| RPO | Corregir instrumento y comparar marcas recuperadas. | Simulacro aislado y fórmula reproducible. |
| Cobertura y CI | Incluir reglas exigibles y conservar reporte real. | Umbral por archivo y artefacto verificable. |
| Accesibilidad | Teclado y zoom real del navegador. | Tareas críticas completas por rol. |
| Sesión | 401 tardío por privateFetch real. | Cuenta B conserva sesión sin datos de A. |
| Contratos y listas | Reconciliar métodos, positivos, páginas y límites. | Inventario por ruta/lista/caso. |
| Constancias | Commit durable y timeout bajo condición controlada. | Emisión única, auditoría, descarga/hash y recuperación. |
| Candidato | Vincular fuentes, imágenes y pruebas. | Manifiestos íntegros y registros con límites. |
| Personas | Piloto, capacitación, custodia, metodología y aceptación. | Registros auténticos y resolución académica. |

## A4.3 Fuentes de evidencia y límites

Las fuentes locales son docs/evidencias/CIERRE_LOCAL.md, registros de carga/restauración/instalación, auditoria-check-20261109.log, la matriz TRAZABILIDAD_ENTREGA y la auditoría de implementación. Los registros de carga con extensión .json incluyen stdout de migraciones: no deben consumirse como JSON puro sin separar contenido. Los resultados históricos favorables se conservan, pero no ratifican por sí solos todos los subcasos ni corrigen el RPO.

El plan maestro contiene PB-01–30 y la continuación R-01–18. La auditoría identifica AC-01–17, distingue código faltante de evidencia insuficiente y conserva publicación remota fuera de alcance. Las 26 filas técnicas y cinco transversales siguen siendo la base de aceptación; no se calcula un porcentaje por cantidad de pruebas.

'''
f=complement.split('# Anexo F.',1)[1].split('# Anexo G.',1)[0]
f=f[f.index('\n'):]
f=re.sub(r'^## F\.(\d)',r'## A5.\1',f,flags=re.M)
i=complement.split('# Anexo I.',1)[1];i=i[i.index('\n'):]
annex5='# ANEXO 5. CAPACITACIÓN Y ACEPTACIÓN\n\n'+f+'\n## A5.4 Registro de aceptación pendiente\n'+i
annex6='# ANEXO 6. DECISIONES Y EXCLUSIONES\n\n'+complement.split('# Anexo G.',1)[1].split('# Anexo H.',1)[0].split('\n',1)[1]
source=front+chapters+'\n'+implementation+bibliography+equipment+manual('MANUAL_USUARIO_REVISADO.md','ANEXO 2. MANUAL DE USUARIO','A2')+manual('MANUAL_TECNICO_REVISADO.md','ANEXO 3. MANUAL TÉCNICO','A3')+annex4+annex5+annex6
(OUT/'INFORME_SIGA_FORMATO_ACADEMICO.md').write_text(source)
rendered=markdown.markdown(source,extensions=['tables','fenced_code'])
soup=BeautifulSoup(rendered,'html.parser')
tables=[]
for n,table in enumerate(soup.find_all('table'),1):
    previous=table.find_previous_sibling()
    if previous and re.match(r'^Tabla \d+\.',previous.get_text().strip()):
        title=re.sub(r'^Tabla \d+\.\s*','',previous.get_text().strip()).rstrip('.')
        previous.clear();caption=previous
    else:
        heading=table.find_previous(['h1','h2','h3'])
        title=heading.get_text() if heading else 'Información de SIGA'
        caption=soup.new_tag('p');table.insert_before(caption)
    caption['class']='table-caption';caption.string=f'Tabla {n}. {title}.'
    table['width']='100%';tables.append(caption.string)
for p in soup.find_all('p'):
    if re.match(r'^Gráfico \d+\.',p.get_text().strip()):p['class']='figure-caption'
for img in soup.find_all('img'):
    img['src']=(OUT/img['src']).resolve().as_uri();img['width']='560'
style='''@page { size:A4; margin:2.54cm; } body { font-family:Arial; font-size:12pt; line-height:1.5; text-align:justify; } h1 { font-family:Arial; font-size:14pt; text-align:center; font-weight:bold; page-break-before:always; } h2,h3 { font-family:Arial; font-size:12pt; font-weight:bold; text-align:left; page-break-after:avoid; } p { margin-bottom:6pt; } table { width:100%; border-collapse:collapse; } td,th { border:1px solid #999; padding:4pt; font:12pt Arial; vertical-align:top; } th { font-weight:bold; } .cover p { text-align:center; font-size:14pt; font-weight:bold; margin:18pt 0; } .table-caption,.figure-caption { text-align:left; font-size:12pt; } pre { white-space:pre-wrap; font:12pt Arial; } img { max-width:100%; }'''
(OUT/'INFORME_SIGA_FORMATO_ACADEMICO.html').write_text('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>SIGA · Informe académico</title><style>'+style+'</style></head><body>'+str(soup)+'</body></html>')
(OUT/'tablas-formato-academico.json').write_text(json.dumps(tables,ensure_ascii=False,indent=2)+'\n')
print('Fuente completa creada:',len(source.split()),'palabras;',len(tables),'tablas;',len(models),'modelos; 3 gráficos.')
