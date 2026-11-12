# Plan detallado de trabajo restante de SIGA

> **Estado vigente de auditoría (9 de noviembre de 2026):** la [revisión actual](docs/AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md) identifica reservas técnicas y aceptación humana pendientes. Las declaraciones anteriores de cierre completo y los diagnósticos iniciales se conservan como históricos; no prueban por sí solos cierre F/A. Los módulos principales existen; quedan AC-01–17 y su evidencia.

Revisión: **9 de noviembre de 2026**, zona America/Mexico_City.

Documento derivado del [plan maestro](PLAN_MAESTRO_ENTREGA.md). Conserva su alcance, requisitos, identificadores PB/RF/RN/RNF/CP/AUD y las puertas F y A. **Es un plan de ejecución pendiente, no un acta de terminación.**

Explicación separada para principiantes: [qué existe, qué falta y cómo terminar](docs/EXPLICACION_PLAN_RESTANTE.md).

## 1. Resultado de la revisión

El proyecto ya contiene los módulos principales y numerosas correcciones del plan. Hay evidencia registrada de regresión, concurrencia de matrícula, recuperación de constancias, proxy y restauración empaquetada. El trabajo restante combina:

1. Un defecto confirmado: emisiones de PDF con caracteres Unicode alternativos fallaron bajo carga.
2. Casos obligatorios que todavía no están acreditados de extremo a extremo, aunque exista implementación.
3. Cierre operativo: instalación limpia, recuperación completa, custodia de respaldos y comprobación de objetivos.
4. Consolidación de documentos y evidencias de una misma versión.
5. Actividades humanas de piloto, metodología, capacitación y aceptación.

No procede reescribir lo que ya funciona. Tampoco procede declarar el 100 % a partir del número de pruebas aprobadas.

### 1.1 Qué se hizo en esta revisión

- Lectura del plan, decisiones, backlog, estado, matriz, código, pruebas, scripts, CI y evidencias.
- Tres auditorías especializadas de solo lectura: backend/reglas; QA/operación; entrega/documentación.
- Inspección del contenido de los DOCX existentes por el especialista documental.
- Identificación del conjunto técnico actual mediante manifiesto SHA-256.
- Redacción de este plan y de su explicación sencilla.

**No se ejecutaron nuevamente las suites, cargas, migraciones ni restauraciones durante esta revisión documental.** Los resultados de ejecución citados a continuación son registros anteriores encontrados en el espacio de trabajo, principalmente del 6 de noviembre. Los subagentes no equivalen a participantes humanos ni revisores académicos.

### 1.2 Hechos, hipótesis y recomendaciones

| Tipo                 | Tratamiento en este documento                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Hecho leído          | Existe código, configuración, aserción, reporte o log específico citado.                         |
| Resultado registrado | Una ejecución previa informó PASO/FALLO; debe vincularse al candidato que realmente ensayó.      |
| Hipótesis            | Posible causa o insuficiencia que requiere reproducción; no se presenta como defecto confirmado. |
| Trabajo recomendado  | Paso para satisfacer un criterio obligatorio o resolver una brecha comprobada.                   |
| Decisión humana      | No la toma un agente; se registra responsable, pregunta concreta y dependencia.                  |

## 2. Versión inspeccionada y vigencia

Raíz del proyecto: /home/xemi/Documentos/escuela/SistemaIntegralGestionAcademica-main.

En esta copia no se encontró un directorio .git. No se inventa un commit. La revisión produjo el [manifiesto técnico de 160 archivos](docs/evidencias/revision-plan-20261109-manifiesto.sha256), cuyo SHA-256 es:

```text
02b863012c72ac1159a30531772508e28330fdea82977cda8b9ceb771aabe0f5
```

Incluye archivos de apps, packages, scripts, tests, .github y configuraciones raíz seleccionadas; excluye dist, generated, node_modules, datos locales, archivos .env y scripts temporales .tmp-. El manifiesto enumera exactamente lo incluido. **No es la huella de todo el paquete documental ni prueba de que las suites anteriores se ejecutaran con estos mismos 160 archivos.**

Las huellas de [restauración PB-21](docs/evidencias/pb21-restauracion-20261106.md) usaron otro inventario. No deben compararse directamente como si el algoritmo y el conjunto fueran idénticos.

Antes de ejecutar el cierre:

1. Verificar el manifiesto actual y registrar diferencias legítimas.
2. Fijar un candidato provisional y un inventario explícito de archivos.
3. Tras integrar correcciones, producir el manifiesto final y los identificadores de imágenes.
4. Asociar cada evidencia a ese candidato; repetir las verificaciones afectadas por cambios.
5. Incluir documentos y artefactos entregados en un manifiesto final separado, excluyendo secretos y datos temporales.

## 3. Alcance y decisiones que ya están resueltos

### 3.1 Decisiones aprobadas: no volver a pedir autorización

| Decisión | Regla para continuar                                                                                       | Comprobación pendiente                                               |
| -------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| D41      | Dos programas sintéticos identificados como demostración.                                                  | Completar recorrido transaccional de ambos; no atribuir oficialidad. |
| D42      | Escala 0–10, mínima 6, dos decimales; promedio ponderado por créditos con todos los intentos calificados.  | Ejemplos manuales, configuración efectiva y resultados exactos.      |
| D43      | Constancia de estudios con al menos una nota final; incluye aprobadas y reprobadas.                        | Elegibilidad, contenido y recuperación en candidato final.           |
| D44      | Ventanas de inscripción en America/Mexico_City.                                                            | Fronteras, UI/API y migración incremental.                           |
| D45      | 20 usuarios; p95 menor de 2 s y errores inesperados menores de 1 % por operación evaluada.                 | Resolver Unicode y declarar siempre patrón de carga.                 |
| D46      | Administrador respalda diariamente y antes de cambios importantes; RTO ≤4 h y RPO ≤24 h para demostración. | Medir cumplimiento y acordar retención, custodia y quién restaura.   |

Fuente: [DECISIONES](docs/DECISIONES.md). La aprobación de una regla no demuestra que ya esté implementada y verificada en todos sus casos.

### 3.2 Exclusiones que se mantienen

PB-22, publicación remota, hosting/dominio, HTTPS público, producción institucional, expedientes reales, integraciones oficiales, firma avanzada, LMS, cobros, aplicación móvil nativa y migración histórica real quedan fuera. RF-13/correo sigue opcional.

No añadir por defecto parciales, cancelación de autoservicio, carga máxima ni optimización de horarios. La nota final directa se conserva. No es obligatorio incrustar los manuales dentro del sitio.

El catálogo oficial ICO-F19/E12 sigue pendiente para uso institucional; **D41 permite cerrar la demostración con catálogo sintético completo**. No convertir la fuente oficial en bloqueo de tareas autorizadas de demostración.

### 3.3 Decisiones todavía necesarias

- Personas reales que actuarán como responsable técnico, académico, facilitador y representantes por rol.
- Retención y ubicación/custodia de respaldos; responsable nominal de restauración.
- Regla de cierre de captura si el comportamiento o requisito sigue ambiguo. No inventar parciales para resolverla.
- Plataforma/equipo compatible que debe poder usar la provisión local: el CLI probado exige POSIX; README también ofrece Windows.
- Dispositivos/navegadores finales de aceptación y disponibilidad de personas para piloto.
- Resolución académica si no existen equipo humano, parejas o revisión independiente suficientes para el requisito metodológico.

Cada pregunta debe bloquear solo su dependencia real. No volver a preguntar D41–D46 ni usar silencio como decisión.

## 4. Inventario de lo que ya existe

| Área               | Implementación/evidencia encontrada                                                                                    | Límite que conserva                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Acceso/personas    | Sesión, roles, CSRF, bajas, revocación; CLI de provisión/restablecimiento y ensayo aislado.                            | CLI POSIX/local; recorrido completo de personas nuevas y plataforma final por consolidar.      |
| Catálogos/oferta   | Programas, planes, asignaturas, grafo, períodos, docentes y grupos; auditoría antes/después.                           | Acreditar dos programas, bajas padre/hijo y todos los subcasos.                                |
| Matrícula          | SERIALIZABLE, bloqueos, unicidad, reintentos y cola local acotada por grupo.                                           | No sustituir garantías de BD por la cola; consolidar negativas y prerrequisitos múltiples.     |
| Calificaciones     | Versión optimista, motivos, correcciones, Decimal y avance; borradores por sesión/grupo.                               | Test leído de corrección es secuencial; falta contienda real con la misma versión.             |
| Interfaz           | Paginación/búsqueda, aislamiento de caché, pestañas y conservación de borradores.                                      | Faltan recorridos completos de teclado/zoom y varias comprobaciones E2E de error.              |
| Constancias        | Snapshot, QR, hash, verificador limitado, revocación, reemisión y recuperación; fuentes estándar y Unicode.            | Carga Unicode falla; falta respuesta HTTP realmente perdida y cierre operativo de huérfanos.   |
| Recuperación       | Concurrencia, rollback y SIGKILL antes/después de commit; diagnóstico de solo lectura.                                 | No equivale a apagón ni a pérdida real de respuesta HTTP.                                      |
| Pruebas            | Registro de 30/30 E2E; cobertura 16 suites/117 pruebas, 93,36 % líneas y 79,07 % ramas globales, mínimos individuales. | Resultados previos, inventario service/calculo limitado; no acreditan automáticamente cada CP. |
| Rendimiento latino | 780 solicitudes por operación, cero errores; p95 reporte 204 ms, oferta 421,24 ms, matrícula 581,41 ms, PDF 627,80 ms. | 39 tandas de 20 con pausas de 7,69 s; no carga continua ni rendimiento Unicode.                |
| Proxy/paquete      | Nginx/cookies locales, login/logout/revocación; restauración de cuatro migraciones, 16 tablas y PDF/hash.              | Falta ejercicio de instalación perdida y tiempos D46.                                          |
| Documentación      | Arquitectura/modelo MD, explicaciones, matriz y materiales DOCX.                                                       | Hay estados contradictorios; DOCX siguen identificando E10/octubre.                            |

### 4.1 Evidencia crítica de fallo Unicode

El [script temporal del ensayo](scripts/.tmp-load-pb20-unicode-20261106.mjs) fuerza caracteres chinos y cirílicos. El log local .local/pb20-carga-unicode-20261106.log registra **cuatro errores HTTP 503 durante el calentamiento** y detención antes de los 300 segundos de medición.

No existe p95 válido de la fase medida de esa corrida. No llamar “4/20” a una tasa global sin reconstruir el denominador: el script normal programa cinco tandas de veinte en el calentamiento. El documento de rendimiento menciona un 503 de un ensayo anterior; ese antecedente no reemplaza este fallo posterior.

El escenario depende de un script .tmp- excluido del manifiesto y de un log local que puede desaparecer. R-02 debe volverlo reproducible y conservar evidencia permanente saneada.

## 5. Cobertura de las 30 filas del plan maestro

Estados de revisión: **PAR** implementado o ensayado parcialmente; **DOC** reconciliación documental; **HUM** participación/decisión humana; **COND** optimización condicionada; **FUERA** exclusión. No son declaraciones Done.

| PB    | Lo aprovechable                                                 | Trabajo residual y vínculo                                                                 | Estado      |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| PB-01 | Plan, auditoría, matriz y huellas previas.                      | Candidato/inventario actual, responsables, decisiones y evidencia reconciliada: R-01/R-16. | PAR/DOC/HUM |
| PB-02 | Runtime fijado, npm/Prisma y runners aislados; Docker ensayado. | Copia limpia y migración incremental D44: R-11.                                            | PAR         |
| PB-03 | CRUD/versiones/grafo y D41.                                     | Dos programas completos, coherencia de referencias/bajas: R-03.                            | PAR         |
| PB-04 | Personas, bajas, provisión y reset.                             | Persona nueva→acceso→tarea; plataforma compatible: R-03/R-11.                              | PAR         |
| PB-05 | Reglas/cupo/concurrencia de matrícula.                          | Consolidar límites/negativas, estado en UI y configuración final: R-04.                    | PAR         |
| PB-06 | Prerrequisitos en oferta y POST.                                | Cero/uno/varios, reprobados y recursamiento: R-04.                                         | PAR         |
| PB-07 | Exclusiones explícitas y alcance conservado.                    | Reconciliar documento sin implementar opcionales: R-01/R-16.                               | DOC         |
| PB-08 | Corrección versionada/auditoría.                                | Dos correcciones simultáneas y borradores: R-05/R-08.                                      | PAR         |
| PB-09 | Cálculos/avance y Decimal.                                      | Hoja manual de referencia y todos los límites D42: R-05.                                   | PAR         |
| PB-10 | Nota final directa.                                             | Registrar regla de cierre de captura si pendiente: R-16.                                   | DOC/HUM     |
| PB-11 | PDF multiprograma, Unicode, QR y varias páginas.                | Visual de ambos programas y texto/extremos; defecto Unicode: R-02/R-06.                    | PAR         |
| PB-12 | Reemisión/recuperación, concurrencia y SIGKILL.                 | Respuesta HTTP perdida y conciliación operativa: R-06.                                     | PAR         |
| PB-13 | Proxy y cookies con imágenes identificadas.                     | Presupuestos de timeout y PDF real por proxy: R-02/R-12.                                   | PAR         |
| PB-14 | GET por roles y permisos distribuidos.                          | Matriz exhaustiva por método, propiedad y estado: R-07.                                    | PAR         |
| PB-15 | Fixtures sintéticas y minimización.                             | Auditoría del paquete, logs, trazas y exportaciones: R-14.                                 | PAR         |
| PB-16 | Responsive y algunas pruebas de teclado/zoom CSS.               | Tareas completas con Tab y zoom real: R-09.                                                | PAR         |
| PB-17 | Material de piloto.                                             | Piloto independiente con tres roles y correcciones: R-17.                                  | HUM         |
| PB-18 | Cobertura/enforcement y pruebas registradas.                    | Inventario de reglas, CI, evidencia final de mismo candidato: R-10/R-15.                   | PAR         |
| PB-19 | Fixtures y E2E 30/30 registrados.                               | Recorrido completo de dos programas y casos faltantes: R-03/R-08/R-15.                     | PAR         |
| PB-20 | Carga larga latina aprobada.                                    | Unicode reproducible/corregido/medido, semántica de carga explícita: R-02/R-15.            | PAR         |
| PB-21 | Restauración empaquetada aprobada.                              | Instalación perdida, medición RTO/RPO y custodia: R-12/R-16.                               | PAR/HUM     |
| PB-22 | Publicación remota.                                             | Mantener excluida; no ejecutarla para cerrar el proyecto local.                            | FUERA       |
| PB-23 | Arquitectura/modelo/explicaciones.                              | DOCX, README, matriz, TGS y paquete final: R-01/R-13/R-14.                                 | PAR/DOC     |
| PB-24 | Requisito Scrum/XP documentado.                                 | Evidencias humanas reales o resolución académica: R-17.                                    | HUM         |
| PB-25 | Limpieza de caché y pruebas unitarias de sesión.                | E2E A→B con red lenta/respuesta tardía: R-08.                                              | PAR         |
| PB-26 | Paginación y E2E cuentas/grupos.                                | Inventario de todas las listas/selectores y límites >50/>100/>200: R-08.                   | PAR         |
| PB-27 | Borradores/versiones y aviso de salida.                         | Dos filas, conflicto real, navegación y separación de cuentas: R-08.                       | PAR         |
| PB-28 | Reportes/CSV/auditoría antes/después.                           | CP-13 integrado, filtros/conjuntos y fórmulas CSV: R-07/R-08.                              | PAR         |
| PB-29 | Cola y fuentes estándar con mediciones.                         | Corregir cuello Unicode; diferir P3 sin problema medido: R-02/R-15.                        | COND/PAR    |
| PB-30 | Materiales y criterios.                                         | Capacitación, evaluación, participantes y acta auténtica: R-17/R-18.                       | HUM         |

## 6. Paquetes de trabajo ejecutables

Los IDs R son tareas derivadas; no sustituyen PB/RF/CP ni cambian su denominador. Cada paquete debe producir código solo si hace falta, evidencia permanente, documentación técnica y explicación sencilla.

### R-01. Reconciliar línea base, decisiones y candidato

- **Vincula:** PB-01/07/23; AUD-18. Prioridad P1; responsable coordinador.
- **Entrada:** plan, DECISIONES, BACKLOG, ESTADO, TRAZABILIDAD y este documento.
- Separar cronología de un resumen actual inequívoco. Conservar fallos superados como historial fechado.
- Corregir referencias desactualizadas a 24 E2E/116 pruebas/carga “en curso”; citar los últimos registros 30/117 y el fallo Unicode.
- Registrar D41–D46 como decisiones aceptadas; reconciliar PB-07 y nota final directa sin pedirlas otra vez.
- Fijar inventario/huella, entorno de demostración y propietarios de documentos.
- **Salida:** cada estado remite a evidencia, candidato, fecha, alcance y límite; cero cierre deducido de un plan escrito.
- **Done:** ninguna contradicción entre el resumen actual, la matriz y las decisiones; revisión documental independiente.

### R-02. Resolver emisiones Unicode bajo carga

- **Vincula:** PB-11/12/13/20/29; CP-12 / CP-14; RNF-03/04. Prioridad P1.
- **Propietario:** especialista de persistencia/rendimiento. Archivos: módulos certificados, pruebas PDF/concurrencia y harness de carga; coordinación para cliente/timeouts.
- Convertir la variante temporal Unicode en opción permanente y documentada del harness, sin cambiar el escenario latino existente.
- Reproducir el escenario que produjo cuatro 503 con nombres sintéticos mixtos, misma política/conjunto y recursos propios. Registrar fases y código/categoría de error sin datos personales.
- Distinguir CPU, espera por conexión, transacción, almacenamiento y respuesta; confirmar hipótesis antes de cambiar.
- Definir presupuesto de tiempo coherente entre cliente, Nginx, generación y transacción. Ampliar timeouts por sí solo no acredita D45.
- Comparar alternativas sencillas y medidas. No incorporar un pool de workers por defecto: el prototipo previo tuvo coste alto y no cumplió la meta.
- Preservar snapshot, validación de glifos, exactitud de texto, identidad del programa, hash, recuperación única y PDFs históricos.
- Verificar integridad de archivos emitidos/descargables bajo carga. Si se añade descarga al escenario, reportarla como operación o fase separada para conservar comparación.
- **Pruebas:** latino, acentos/símbolos, chino/cirílico mixto, texto largo, muchas notas, glifo no admitido, fallo de escritura, commit incierto, reintento concurrente y agotamiento de recursos.
- **Done:** calentamiento sin errores inesperados; 60+300 s con 20 usuarios y patrón explícito; p95 <2000 ms y errores <1 % en Unicode y operaciones afectadas; descarga/hash correctos y regresión de recuperación.
- **Si no cumple:** conservar defecto abierto con causa/evidencia y siguiente cambio acotado. No excluir silenciosamente Unicode ni rebajar la meta.

### R-03. Demostración completa de dos programas y personas nuevas

- **Vincula:** PB-03/04/11/19; CP-01 / CP-02 / CP-12. Prioridad P1.
- Preparar desde cero dos programas sintéticos rotulados, planes/versiones, créditos, materias y prerrequisitos identificables.
- Contrastar inventario esperado con BD. Probar ciclos, autorreferencia, relaciones entre planes y bajas padre/hijo sin destruir historia.
- Crear personas nuevas, activar/provisionar acceso privadamente y demostrar tareas autorizadas.
- Distinguir bootstrap administrativo del CLI que entrega acceso a estudiante/docente; no atribuir al segundo una capacidad de crear administradores que no tiene.
- Ejecutar matrícula→nota→avance→constancia para ambos programas; verificar identidad del PDF y QR.
- **Done:** recorrido repetible sin depender solo de cuentas especiales de la semilla; evidencia de ambos programas y de baja/reactivación con historial conservado.

### R-04. Completar reglas de oferta, matrícula y prerrequisitos

- **Vincula:** PB-05/06; CP-03 / CP-04 / CP-05 / CP-08.
- Matriz mínima: plan/asignatura/docente/período válidos e inválidos; cuenta/perfil activo e inactivo; grupo cerrado; ventana [inicio, fin); fecha local D44.
- Prerrequisitos: cero, uno, varios; aprobado, reprobado, pendiente, repetido; todos satisfechos y uno faltante.
- Comprobar configuración efectiva EXIGIR_PRERREQUISITOS en el paquete, sin publicar secretos.
- Exigir que elegibilidad y motivo de oferta coincidan con POST; la UI no es garantía suficiente.
- Mantener pruebas de última plaza, 20 plazas/20 personas y duplicado entre grupos de una misma asignatura/período.
- Revisar saturación/liberación de cola y conservar seguridad entre procesos en BD.
- **Done:** tabla caso→esperado→respuesta→estado BD/auditoría, con fronteras exactas y resultados del candidato final.

### R-05. Concurrencia real de notas y resultados académicos manuales

- **Vincula:** PB-08/09; CP-06 / CP-07 / CP-09 / CP-10 / CP-11. Prioridad P1.
- El test secuencial de versión antigua no acredita dos solicitudes simultáneas.
- Crear dos conexiones/solicitudes reales con la misma versión; sincronizar su inicio sin compartir una única transacción de fixture.
- Exigir como máximo una corrección confirmada, conflicto controlado en la otra, nota/versión coherentes y una auditoría del cambio ganador.
- Repetir para cero, límites, precisión inválida, motivo y docente ajeno. Comprobar que un fallo no borra borradores.
- Crear hoja de cálculo esperado independiente del código: 8×6 y 9×4 = 8,40; avance 10/30 = 33,33 %; cero, pendientes, canceladas, repetidas, créditos únicos y plan vacío.
- Aplicar TODOS para D42; probar ULTIMO/MEJOR si siguen como opciones implementadas, sin presentarlas como regla aprobada de la demo.
- **Done:** concurrencia acreditada con BD real y ejemplos exactos documentados; privacidad entre titulares.

### R-06. Cierre de recuperación y consistencia de constancias

- **Vincula:** PB-11/12; CP-12.
- Reutilizar recuperación concurrente, rollback y SIGKILL existentes; repetir solo lo afectado por R-02.
- Añadir pérdida efectiva de respuesta HTTP después de commit en entorno controlado, sin reiniciar servicios ajenos.
- El cliente debe consultar el estado y recuperar/reintentar según contrato, sin segunda emisión válida ni auditorías duplicadas.
- Verificar el caso distinto de una nueva solicitud voluntaria: no cambiar contratos para confundir recuperación con nueva emisión.
- Probar archivo ausente/alterado, PDF histórico inmutable, revocación y reemplazo único.
- Hacer ejercicio operativo de conciliación: detener escritores propios, respaldar, diagnosticar, repetir inventario y documentar resolución.
- No eliminar automáticamente “candidatos sin referencia”; una foto de la BD durante un commit incierto no autoriza borrar.
- **Done:** procedimiento reproducible y evidencia que identifica qué sucede antes/después del commit y ante respuesta perdida; archivos válidos conservados.

### R-07. Completar permisos, reportes y trazabilidad de cambios

- **Vincula:** PB-14/28; CP-01 / CP-02 / CP-06 / CP-12 / CP-13.
- Inventariar endpoint + método + rol + propiedad/asignación + sesión + CSRF/origen.
- Vincular pruebas existentes antes de añadir nuevas. La matriz de 15 familias GET no cubre todas las escrituras.
- Casos mínimos: sin sesión; vencida/revocada; rol equivocado; titular ajeno; docente no asignado; administrador intentando calificar; baja/reactivación.
- Comprobar limitador de login y revocación en topología empaquetada real, con credenciales sintéticas.
- Reportes/CSV: conjuntos y filtros esperados desde BD, páginas finales, caracteres delimitadores/saltos de línea y protección contra fórmulas.
- Leer cambios reales antes/después en bitácora; no reconstruir artificialmente valores históricos ausentes.
- **Done:** matriz sin celdas obligatorias sin prueba, errores correctos y datos privados no expuestos; CP-13 integrado.

### R-08. Recorridos frontend pendientes de aislamiento, listas y borradores

- **Vincula:** PB-25/26/27/28; CP-13 / CP-16 / CP-17 / CP-18.
- A→B mismo rol en el mismo navegador: retrasar una petición privada de A, cerrar/cambiar sesión y entregar tarde su respuesta; B no ve datos de A.
- Repetir con 401 tardío de A, 401 vigente de B, expiración y cierre.
- Dos alumnos editados por docente: una fila falla, la otra conserva nota/motivo; conflicto real de versión; revisión y reintento explícitos.
- Salir/volver a grupo o página, confirmar navegación y cambiar cuenta; no cruzar borradores ni guardar silenciosamente una versión vieja.
- Inventariar todas las listas/selectores: catálogos, personas, cuentas, grupos, oferta, historial, notas, constancias, reportes y auditoría.
- Por cada límite anterior: dataset mayor, última página alcanzable, búsqueda, reinicio de página, orden estable, total, vacíos y selección histórica.
- Reutilizar E2E >50 cuentas y >100 grupos. Añadir >200 donde el contrato o antecedente lo requiera, sin suponer que esas dos pruebas cubren todo.
- **Done:** E2E real API/BD y revisión visual; no sustituirlo por mocks o tests de componentes.

### R-09. Accesibilidad y revisión visual completas

- **Vincula:** PB-16; CP-14. Prioridad P2 obligatoria.
- Recorrer tareas de administrador, docente y estudiante en 1366 px y 360 px.
- Usar Tab/Shift+Tab/Enter/Escape desde un inicio definido, sin ratón y sin colocar foco programáticamente para aprobar la navegación.
- Comprobar foco visible/orden/restauración, saltos al contenido, pestañas, diálogos, formularios, tablas, paginación y acciones destructivas.
- Aplicar zoom real del navegador al 200 % y documentar navegador/versión/acción. CSS zoom puede complementar, no sustituir.
- Revisar cargas, vacíos, etiquetas y errores asociados, desconexión, reintento, mensajes de conflicto y confirmación de resultado.
- Capturar pantalla completa y zonas afectadas con datos ficticios; anotar desbordamiento, acciones inalcanzables o texto ilegible.
- **Done:** todas las tareas críticas se completan por teclado y a zoom real; defectos corregidos y reprobados.

### R-10. Inventario de reglas, cobertura y CI

- **Vincula:** PB-18/19; AUD-08/09.
- Mantener ≥70 % de líneas y ramas por archivo aplicable; el global 93,36/79,07 no sustituye umbrales individuales.
- Inventariar reglas fuera del patrón service/calculo: contratos, validaciones, utilidades y controladores relevantes; justificar inclusiones/exclusiones.
- Asegurar que archivos no ejecutados aparezcan y que una reducción real bajo umbral provoque salida fallida.
- Revisar CI: hoy ejecuta formato/check/migración/integración/E2E y publica Playwright, pero no cobertura.
- Incorporar cobertura y su artefacto al flujo de calidad cuando se cierre PB-18; mantener variables sintéticas y permisos mínimos.
- La ejecución remota solo procede con repositorio autorizado; la equivalencia local puede verificarse sin publicar.
- Investigar/documentar aviso pg/Prisma con versiones y traza. No ocultarlo elevando límites o suprimiendo mensajes; no actualizar dependencias sin necesidad y regresión.
- **Done:** denominador explícito, umbrales efectivos, reporte conservado y pipeline coherente con el comando local.

### R-11. Copia limpia, plataforma de acceso y migración incremental

- **Vincula:** PB-02/04/18/21; CP-01 / CP-02 / CP-15.
- Construir copia que no herede node_modules, dist, generated, .local, credenciales ni dependencias globales personales.
- Seguir instrucciones entregadas con Node 24.19.x/npm 12.2.x, lockfile y PostgreSQL compatible; comprobar versiones reales.
- Definir soporte de plataforma: la provisión POSIX usa permisos/propietario y no debe “arreglarse” debilitando archivos privados.
- Si Windows está incluido en el equipo aceptado, implementar/probar procedimiento equivalente seguro; si no, documentar el equipo compatible de la demo de manera explícita.
- Probar migraciones desde cero y actualización desde copia sintética con las tres migraciones previas a D44.
- Comparar registros históricos antes/después, restricciones y fecha local; probar horas inexistentes/ambiguas y conservación de segundos al editar sin cambios.
- **Done:** tercero reproduce instalación y acceso sin archivos personales; migración incremental conserva datos y contratos.

### R-12. Recuperación operativa cronometrada y presupuestos de tiempo

- **Vincula:** PB-13/21; CP-15; D46.
- Reutilizar prueba empaquetada, pero crear ejercicio diferente con instalación original propia indisponible.
- Conservar respaldo útil de BD/PDF y configuración necesaria sin publicar secretos; recrear infraestructura, roles y variables.
- Restaurar en destino propio nuevo, arrancar web/API y comprobar login, consulta, matrícula/nota según fixture y descarga/hash.
- Registrar comienzo del incidente simulado, comienzo de restauración, servicio utilizable y verificación final; medir RTO real.
- Registrar fecha/última escritura recuperable y antigüedad del respaldo; medir RPO y demostrar frecuencia/custodia acordadas.
- Acordar solo retención, ubicación/custodia y persona restauradora; D46 ya aprobó frecuencia y metas.
- Ejercitar PDF por proxy con timeouts coherentes, incluida ruta Unicode; preservar configuración HTTP local.
- **Done:** RTO ≤4 h/RPO ≤24 h demostrados, copia retenida y procedimiento que otra persona puede seguir. Un health 200 o una copia temporal luego borrada no basta.

### R-13. Documentos, DOCX y ejemplo TGS

- **Vincula:** PB-23; ENT-TGS/ENT-DOC.
- Actualizar los tres DOCX de docs/manuales: siguen refiriéndose a E10/octubre y reglas propuestas anteriores.
- Incluir D41–D46, acceso operativo, recuperación, paginación, zona horaria, respaldo y limitaciones reales.
- Conservar manual técnico, manual por rol y plan de capacitación; comprobar extracción de texto y renderizado, tablas, imágenes y enlaces.
- Sincronizar README, arquitectura, modelo, decisiones, backlog, matriz, estado y explicación para principiantes.
- Crear ejemplo TGS con IDs sintéticos: nota aprobada→historial/avance→prerrequisito→constancia; corrección→auditoría sin cambiar PDF anterior.
- **Done:** documentos describen el mismo candidato y un tercero entiende entradas, procesos, salidas y retroalimentación; cero afirmaciones históricas presentadas como actuales.

### R-14. Paquete final y revisión de privacidad

- **Vincula:** PB-01/15/23; RNF-07/ENT-DOC.
- Definir lista de inclusión/exclusión; no empaquetar por copia indiscriminada del directorio.
- Excluir .env, accesos locales, cookies, trazas con secretos, bases, volúmenes, respaldos privados, node_modules y residuos temporales.
- Inspeccionar MD/DOCX/PDF/CSV/capturas/trazas/logs; verificar datos sintéticos y minimización del verificador.
- Revisar nombres/metadatos, no solo contenido visible. No copiar un secreto hallado en el informe: indicar archivo y tratamiento sin divulgarlo.
- Conservar evidencia permanente saneada; .local, test-results y playwright-report son temporales y pueden estar ignorados.
- Crear manifiesto final del paquete y comprobar reproducción desde él.
- **Done:** listado revisado, hash final, materiales completos y cero secretos/datos reales en la entrega.

### R-15. Integración y regresión final

- **Vincula:** PB-18/19/20/29 y todas las correcciones.
- Integrar primero, congelar candidato y ejecutar comprobaciones secuenciales según sección 10.
- Exigir cero skips de casos críticos y conservar fallos iniciales/correcciones sin ocultarlos con reintentos globales.
- Repetir solo lo afectado durante iteración; al fijar candidato final ejecutar la batería exigida para F.
- No considerar 117 o 30 como metas de cantidad: nuevos casos pueden aumentar números; todos deben pasar.
- Las cargas y la recuperación usan ventanas exclusivas; guardar patrón, entorno, duración, errores y resultados.
- **Done:** cada CP/subcaso obligatorio enlaza evidencia del candidato final; no quedan P1/P2 conocidos sin resolver.

### R-16. Decisiones operativas y responsables

- **Vincula:** PB-01/07/10/21.
- Preparar registro con pregunta, opciones viables, responsable humano real, dependencia y evidencia requerida.
- Cerrar pendientes nominales y operativos de sección 3.3; no asignar al usuario un nombre/cargo no confirmado.
- Definir ejemplos/manuales aprobados y límites de captura/bajas si afectan comportamiento.
- Registrar resolución de requisitos humanos no realizables con el responsable académico; no convertirla unilateralmente en exclusión.
- **Done:** no existe decisión esencial sin dueño ni una historia bloqueada solo por una pregunta ya contestada.

### R-17. Piloto real, capacitación y evidencia metodológica

- **Vincula:** PB-17/24/30; ENT-SCRUM/ENT-XP.
- Preparar guiones por rol, tareas sin instrucciones de solución, datos ficticios y registro de problemas.
- Personas ajenas al desarrollo ejecutan piloto; al menos un representante de cada rol; registrar observación real, corregir bloqueos y repetir.
- Capacitar, evaluar ≥80/100 y exigir 100 % de tareas críticas; reforzar y reevaluar a quien no acredite.
- Registrar padrón/estados y cumplimiento de participantes convocados según el plan; no crear asistentes ficticios.
- Mantener planning/daily/review/retro y mejora reales; TDD rojo/verde/regresión contemporáneo donde se aplique.
- Agentes pueden preparar y revisar material, pero no reemplazan parejas humanas, participantes o aceptación académica.
- **Done:** evidencia auténtica por persona/rol y resolución académica de cualquier limitación metodológica.

### R-18. Cierre y acta

- **Vincula:** PB-30; puertas F/A.
- Revisar 26 filas técnicas y cinco transversales, todos sus subcasos y condiciones adicionales del maestro.
- Abrir F solo con evidencia técnica completa; abrir A cuando además existan metodología, piloto, capacitación y aceptación humana.
- Crear el acta real en docs/evidencias/CIERRE_LOCAL.md con candidato, alcance, resultados, límites, responsables y firma/aceptación auténtica.
- Calcular porcentajes solo según denominador del maestro; no por módulos implementados, PB o tests verdes.
- **Done:** acta auténtica y paquete verificado; si F pasa y A no, informar exactamente esa diferencia.

## 7. Configuración operativa de subagentes

Esta sección es una **configuración del trabajo**, incluida dentro del MD para copiar a los encargos. No se instaló configuración de Codex ni se afirma que el YAML sea un esquema nativo de .codex/config.toml.

### 7.1 Política de coordinación

```yaml
plan: cierre-restante-siga
workspace: /home/xemi/Documentos/escuela/SistemaIntegralGestionAcademica-main
scope: entrega-academica-local-datos-sinteticos
coordinator: principal
capacity:
  max_agents_including_coordinator: 4
  max_active_specialists: 3
  max_heavy_jobs: 1
  lower_capacity_policy: ejecutar-en-tandas-sin-omitir-criterios
runtime:
  model: heredar-del-agente-principal
  reasoning: heredar
  fork_turns: all
  shared_filesystem: true
rules:
  mandatory_skill: pragmatic-clean-code
  documentation: tecnica-mas-explicacion-sencilla-separada
  one_writer_per_file: true
  freeze_tested_sources_during_verification: true
  preserve_existing_changes: true
  synthetic_data_only: true
  permission_policy: heredar-del-entorno-no-modificar
  external_publication: fuera-de-alcance
  human_approval: no-sustituible-por-agentes
resources:
  database: propia-temporal-test-url-distinta-de-demo
  ports: dinamicos-o-reservados-con-propietario
  docker: nombre-red-volumen-y-etiqueta-propios
  cleanup: solo-recursos-creados-por-la-tarea
  secrets: fuera-de-documentos-logs-y-respuestas
evidence:
  required: [tarea, candidato, fecha_zona, entorno, comando, salida, resultados, limites]
  mutable_local_artifacts_are_final_evidence: false
  final_review: coordinador-mas-especialista-distinto-cuando-sea-viable
```

No fijar modelos o niveles de razonamiento no solicitados. Heredar los disponibles. Si cambia la capacidad, conservar coordinador y ejecutar especialistas por tandas. Si la herramienta no está disponible, continuar secuencialmente y registrar la limitación.

### 7.2 Perfiles, archivos y contratos

| Perfil / nombre sugerido | Encargo                                 | Escritura permitida inicial                                            | Prohibiciones/contratos                                                               |
| ------------------------ | --------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| principal                | R-01/15/16/18; integración y decisiones | Plan, matriz, ESTADO, manifiestos; compartidos solo tras acuerdo       | No inventar aceptación; no editar archivos asignados sin coordinar.                   |
| persistencia_unicode     | R-02/06                                 | Certificados, fuentes, pruebas PDF/recuperación; harness acordado      | Preservar snapshot, hash, reemplazo único y privacidad; no bajar D45.                 |
| backend_academico        | R-03/04/05/07                           | Catálogos/personas/oferta/matrícula/notas/reportes y pruebas asignadas | No modificar certificados simultáneamente; contratos compartidos pasan por principal. |
| frontend_accesibilidad   | R-08/09                                 | Pantallas/servicios web y E2E asignados                                | Aplicar también skill UI/UX; no llamar zoom CSS “zoom real”; preservar caché/drafts.  |
| qa_integracion           | R-07/10/15                              | Pruebas, inventario de reglas, CI y fixtures asignadas                 | No ejecutar pruebas pesadas sin reserva; no cerrar por mocks ni cantidad.             |
| operacion_recuperacion   | R-11/12                                 | Scripts Docker/backup/proxy, guías y pruebas aisladas                  | No pausar bases ajenas; no reutilizar puertos/volúmenes por suposición.               |
| documentacion_entrega    | R-13/14/17                              | Manuales DOCX/MD y paquete asignados                                   | Plan/matriz/ESTADO tienen escritor único; no inventar personas ni resultados.         |

Un perfil puede ocupar distintas tandas. No crear siete especialistas simultáneos. Una asignación debe enumerar archivos concretos: la tabla no concede propiedad permanente de todo un módulo.

### 7.3 Encargo obligatorio por subagente

```yaml
task_id: R-XX
pb_ids: [PB-XX]
requirements: [RF-o-RN-o-RNF-identificado]
cases: [CP-XX-subcaso]
goal: resultado-concreto-observable
context:
  decisions: [D41, D42, D43, D44, D45, D46]
  candidate_manifest: ruta-y-sha-vigentes
  read_first: [AGENTS.md, docs/ESTADO.md, PLAN_RESTANTE_CIERRE_MAESTRO.md]
ownership:
  writable_files: [lista-exacta]
  read_only_files: [contratos-compartidos-no-asignados]
dependencies:
  ready_when: condicion-especifica
  blocks: [tareas-dependientes]
validation:
  expected: [positivo, negativo, limite, concurrencia-si-aplica]
  commands: [solo-comandos-inspeccionados]
  heavy_window: reservar-con-coordinador
handoff:
  required: [archivos, comportamiento, contratos, pruebas, resultados, riesgos, evidencia]
stop_and_report:
  - requiere-decision-humana-no-resuelta
  - necesita-editar-archivo-con-otro-propietario
  - destino-de-datos-no-es-propio
  - incumple-criterio-o-falta-herramienta
```

“Stop and report” detiene la acción dependiente, no todo trabajo independiente. No implica pedir confirmaciones redundantes por una acción autorizada.

### 7.4 Ejemplo de arranque con la herramienta disponible

Ejemplo de argumentos de colaboración, no comando de shell:

```json
{
  "task_name": "persistencia_unicode",
  "fork_turns": "all",
  "message": "Ejecuta R-02 del PLAN_RESTANTE_CIERRE_MAESTRO.md. Aplica pragmatic-clean-code. Lee las decisiones y evidencia Unicode. Antes de escribir confirma con el coordinador tu lista exacta de archivos. No cambies umbrales, snapshot ni privacidad. Reserva pruebas pesadas. Entrega reproducción, corrección mínima, resultados reales, límites y documentación técnica más explicación sencilla."
}
```

El coordinador llama spawn_agent solo cuando haya plaza y la tarea esté Ready. Usa followup_task para reutilizar un agente, send_message para coordinación activa y list_agents para conocer estado real. No inferir actividad de una lista histórica del IDE.

### 7.5 Entrega y revisión

Cada entrega contiene:

1. R/PB/CP, candidato y archivos modificados.
2. Problema previo y comportamiento final observable.
3. Contratos preservados o cambio acordado.
4. Comandos realmente ejecutados, salida y PASO/FALLO/no ejecutado.
5. Casos límite, recursos creados/retirados y riesgos.
6. Enlaces a evidencia saneada y documentación técnica/sencilla.
7. Pendientes que impiden Done.

El revisor inspecciona el cambio real y la evidencia, no solo el resumen del autor. Para permisos, concurrencia y recuperación, usar otro especialista cuando sea viable. El coordinador integra y aprueba la ejecución técnica; solo las personas designadas aceptan F/A.

## 8. Tandas, dependencias y exclusividad de recursos

| Tanda | Especialista 1                      | Especialista 2                          | Especialista 3                                 | Trabajo del coordinador                                         |
| ----- | ----------------------------------- | --------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| 0     | Auditoría backend                   | Auditoría QA/operación                  | Auditoría documental                           | R-01, decisiones ya recibidas, candidato y propietarios.        |
| 1     | R-02 diagnóstico/corrección Unicode | R-08/09 frontend                        | R-03/04/05 casos backend en archivos distintos | Acordar contratos, resolver conflictos y reservar ejecuciones.  |
| 2     | R-06 recuperación                   | R-07/10 permisos/cobertura              | R-13 documentos/TGS                            | Integrar cambios pequeños, revisar evidencia y decisiones R-16. |
| 3     | R-11 copia limpia/migraciones       | R-09 inspección visual                  | R-14 privacidad/documentos                     | Congelar fuentes antes de pruebas y compilar candidato.         |
| 4     | R-15 regresión                      | R-12 operación/restauración en su turno | Revisión independiente de evidencia            | Ceder una sola ventana pesada; ejecutar cargas solas.           |
| 5     | Preparación piloto                  | Materiales/evaluación                   | Auditoría de paquete                           | Personas realizan R-17; resolver bloqueos reales.               |
| 6     | Revisor técnico                     | Revisor documental                      | Apoyo a acta                                   | R-18, F/A y entrega auténtica.                                  |

La simultaneidad de la tabla es de trabajo compatible, no de pruebas intensivas. Ejemplo: QA puede diseñar tests mientras se programa Unicode, pero no medir carga junto a cobertura.

**Camino técnico principal:** R-01 → R-02/03/04/05/08/09 → R-06/07/10/11 → R-15 → R-12/13/14 → Puerta F. Varias tareas documentales y decisiones avanzan en paralelo. R-17/18 y las condiciones metodológicas llevan a Puerta A.

### 8.1 Registro obligatorio de reservas

| Trabajo pesado        | Reserva exclusiva                                   | Fuentes congeladas                            | Recurso propio                     | Liberación                                             |
| --------------------- | --------------------------------------------------- | --------------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| Integración/cobertura | Un ejecutor                                         | Backend, esquema, contratos y tests ensayados | BD/esquema temporal                | Proceso finalizado y conexiones cerradas.              |
| E2E                   | Un ejecutor                                         | Web/API/fixtures                              | BD, carpetas y puertos             | Navegadores/servidores cerrados y cleanup verificado.  |
| Carga                 | Sin build, E2E, cobertura ni restauración paralelos | Producto y harness                            | BD/API/PDF temporales              | Resultado/log conservado y recursos propios retirados. |
| Docker/restauración   | Turno propio tras cargas                            | Dockerfiles/configuración/fuentes             | Imágenes/Compose/volúmenes propios | Huellas antes/después y resultado de cleanup.          |

Cambiar fuentes durante una corrida impide atribuirla a un candidato estable; conservarla como diagnóstico y repetir lo afectado.

## 9. Reglas de evidencia y reanudación

### 9.1 Ficha de evidencia por subcaso

```yaml
evidence_id: R-XX-CP-XX-nombre
status: PENDIENTE
candidate:
  source_manifest: pendiente
  source_sha256: pendiente
  image_ids: []
date_timezone: America/Mexico_City
environment:
  node: pendiente
  npm: pendiente
  postgres: pendiente
  browser: pendiente
fixture: solo-sintetica-identificada
execution:
  command_or_steps: pendiente
  exit_code: pendiente
  passed: pendiente
  failed: pendiente
  skipped: pendiente
expected: pendiente
observed: pendiente
artifacts: []
limitations: []
executor: pendiente
reviewer: pendiente
```

No rellenar “pendiente” con ejemplos que parezcan hechos. Guardar logs completos saneados y resumen; no copiar tokens/contraseñas/cookies. Registros locales temporales no sustituyen evidencia permanente.

### 9.2 Reanudar después de una interrupción

1. Leer AGENTS, resumen actual, este plan y evidencia de la tarea.
2. Consultar agentes/procesos reales antes de reiniciar; no duplicar un test o build todavía activo.
3. Verificar archivos y manifiesto; preservar cambios existentes.
4. Identificar último resultado verificable, siguiente dependencia y recursos propios pendientes de limpieza.
5. Recrear subagentes con encargos acotados si ya no existen; no confiar en IDs históricos.
6. Continuar desde la tarea pendiente sin volver a pedir D41–D46.
7. Registrar estado y siguiente comando/procedimiento al cerrar la subetapa.

## 10. Verificaciones y comandos existentes

Estos son comandos del repositorio inspeccionados, **no resultados ejecutados el 9 de noviembre**. Antes de usarlos revisar sus variables, destino, efectos y versión actual.

| Orden | Comando/procedimiento                                 | Condiciones                                                                                   |
| ----- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1     | npm ci; npm run db:generate                           | Copia limpia, versiones del proyecto y lockfile; no instalar sobre otra app.                  |
| 2     | npm run format:check                                  | Corregir solo archivos asignados; no reformatear licencias de terceros.                       |
| 3     | npm run check                                         | Lint, tipos, unitarias y build; salida 0.                                                     |
| 4     | Migración desde cero e incremental                    | Destinos propios; conservar historia anterior a D44.                                          |
| 5     | npm run test:integration                              | TEST_DATABASE_URL local de prueba, distinta de DATABASE_URL.                                  |
| 6     | npm run test:coverage                                 | Unitarias+integración, inventario y umbral individual; artefacto saneado.                     |
| 7     | npm run test:e2e -- --workers=1                       | Perfil conservador ya utilizado; registrar configuración real y cero skips críticos.          |
| 8     | node scripts/test-provision-local.mjs                 | Docker propio y API compilada según script; no es alta masiva real.                           |
| 9     | node scripts/test-certificados-crash.mjs              | API compilada, BD de prueba y archivos propios; SIGKILL solo a procesos creados.              |
| 10    | npm run test:load                                     | Aproximadamente 24 min para cuatro operaciones; exclusividad CPU/BD.                          |
| 11    | Escenario Unicode permanente de R-02                  | No existe aún como contrato estable del harness; no inventar un flag.                         |
| 12    | node scripts/test-proxy-local.mjs                     | Requiere SIGA_PROXY_API_IMAGE, SIGA_PROXY_WEB_IMAGE y SIGA_PROXY_MIGRATE_IMAGE.               |
| 13    | node scripts/test-backup-restore-local.mjs --packaged | Requiere SIGA_BACKUP_TEST_IMAGE, SIGA_BACKUP_TEST_WEB_IMAGE y SIGA_BACKUP_TEST_MIGRATE_IMAGE. |
| 14    | Ejercicio operativo R-12                              | Distinto del runner temporal; medir y conservar copia recuperable.                            |
| 15    | Inspección de documentos/paquete y revisión humana    | DOCX renderizados, privacidad, manifiestos, piloto/capacitación/acta.                         |

El runner de restauración también usa recursos y puertos que deben inspeccionarse, incluido el puerto de verificación fijo indicado en su guía. No copiar DATABASE_URL ni credenciales a este MD.

No ejecutar docker:backup, docker:restore:verify, despliegue o pausa de API por inercia: esos comandos pueden actuar sobre la instalación configurada. Para pruebas, usar los runners aislados o una copia propia revisada.

## 11. Matriz mínima de subcasos faltantes

| CP                            | Residual principal                                                                | R        | Evidencia de cierre                                              |
| ----------------------------- | --------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| CP-01 / CP-02                 | Personas nuevas, plataforma, reset/baja/reactivación y matriz por recurso/método. | 03/07/11 | Login/tarea, revocación e historia por rol.                      |
| CP-03 / CP-04 / CP-05 / CP-08 | Fronteras D44, referencias, múltiples prerrequisitos y coherencia oferta/POST.    | 04/11    | Tabla positiva/negativa/límite y concurrencia real.              |
| CP-06 / CP-07                 | Misma versión de nota en dos correcciones simultáneas.                            | 05/08    | Una ganadora, conflicto controlado, versión/auditoría correctas. |
| CP-09 / CP-10 / CP-11         | Cálculo esperado independiente y política D42.                                    | 05       | Resultados manuales, cero/pendientes/repetidas/plan vacío.       |
| CP-12                         | Dos programas, visual/Unicode, respuesta perdida y conciliación.                  | 02/03/06 | Archivos/hash, estados, reintento sin duplicación.               |
| CP-13                         | CSV/listados/filtros/bitácora completos con permisos.                             | 07/08    | Conjuntos esperados y exportación segura.                        |
| CP-14                         | Teclado completo, zoom real, móvil/escritorio y Unicode bajo carga.               | 02/09    | Tareas completadas y métrica D45 por operación.                  |
| CP-15                         | Copia limpia, incremental y recuperación operativa D46.                           | 11/12    | Instalación nueva y RTO/RPO cronometrados.                       |
| CP-16                         | Cambio A→B con respuesta tardía/401.                                              | 08       | E2E real sin dato cruzado.                                       |
| CP-17                         | Inventario exhaustivo >50/>100/>200.                                              | 08       | Última página y selección estable por lista.                     |
| CP-18                         | Dos borradores, error/conflicto, salir/volver/cambiar sesión.                     | 08       | Evidencia de conservación y ausencia de cruce.                   |

La tabla identifica brechas; no dice que todos los demás subcasos ya estén aprobados. R-01/R-15 deben enlazar el inventario completo del maestro.

## 12. Cierre de las puertas F y A

### Puerta F

Debe existir evidencia vigente para las 26 filas técnicas y todas las condiciones del maestro. Antes de abrirla:

- R-02 resuelto sin esconder el fallo Unicode.
- Recorridos completos de dos programas, acceso, reglas, notas, promedios, reportes y constancias.
- Integridad, permisos, privacidad, concurrencia, recuperación y accesibilidad acreditadas.
- Instalación/candidato final reproducibles y respaldos recuperables.
- Regresión del candidato y matriz completas, sin P1/P2 obligatorios pendientes.

### Puerta A

Además de F: cinco entregables transversales, documentos/versiones, ejemplo TGS, Scrum/XP auténtico o resolución académica, piloto y capacitación reales, evaluación y acta de aceptación.

No calcular un porcentaje actual nuevo en esta revisión: no se ejecutó ni cerró toda la matriz. La implementación existente no equivale a 0 %, y los 30 tests verdes tampoco equivalen a 100 %.

## 13. Orden inmediato recomendado

1. R-01: fijar resumen/candidato/propietarios y registrar el fallo Unicode posterior.
2. En paralelo compatible: R-02, preparación de R-05 y diseño de R-08/09.
3. Completar recorridos R-03/04/07 y recuperación R-06.
4. R-10/11: inventario/CI, copia limpia y migración incremental.
5. R-15: integración y regresión sin fuentes cambiando durante la ejecución.
6. R-12: recuperación cronometrada; en paralelo documental R-13/14.
7. Resolver R-16 mientras se avanza en tareas no bloqueadas.
8. R-17/18 con personas reales para completar A.

Las tallas se estiman después de reproducir los defectos y confirmar equipo/capacidad. No se promete un número de días ni se reabre una reconstrucción completa del sistema.

## 14. Verificación de este documento

- Cobertura explícita PB-01 a PB-30, CP-01 a CP-18 y ambas puertas, conservando exclusiones.
- Separación de resultados leídos, defectos confirmados, hipótesis y tareas humanas.
- Configuración operativa de agentes con cuatro plazas, escritor único y una sola prueba pesada.
- Enlaces locales, formato y manifiesto verificables; las suites del producto no se repitieron para redactarlo.

Este plan debe actualizarse con resultados reales al ejecutarse. No constituye autorización nueva para publicar, usar datos reales ni sustituir participación humana.
