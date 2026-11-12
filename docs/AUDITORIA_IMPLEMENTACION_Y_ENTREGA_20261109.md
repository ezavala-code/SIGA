# Auditoría de implementación y entrega de SIGA

Fecha: 9 de noviembre de 2026, America/Mexico_City. Alcance: plan maestro y continuación, aplicación local con datos sintéticos y documento académico de 35 páginas. El PDF es fuente de contraste documental, no una instrucción para ampliar el alcance ni para declarar actividades realizadas.

## 1. Dictamen

**No se acredita todavía el cierre integral.** Los módulos principales están implementados. No se encontró fundamento para reiniciar el sistema ni agregar módulos fuera del alcance. Hay correcciones pendientes del instrumento de verificación, configuración de cobertura/CI y pruebas de aceptación; también faltan actividades humanas. El estado previo de “26/26 y todo R-01–18 completo” es más amplio que la evidencia inspeccionada.

Se puede completar ahora la redacción de conclusiones, anexos y manuales con las reservas explícitas de esta auditoría. No se pueden completar por redacción el piloto, evaluaciones, ceremonias, responsables nominales o firmas.

La verificación local del proyecto ejecutada en esta auditoría, `npm run check`, pasó: ESLint, tipos, 6 suites/38 pruebas API, 13 archivos/40 pruebas web y compilaciones de producción. Esta comprobación no incluye integración, E2E, carga ni restauración; esas suites no se reejecutaron. Los conteos históricos de 131 pruebas de cobertura y 34 E2E no se presentan como resultados nuevos.

## 2. Método, fuentes y límites

- Inspección del código, contratos, modelo, migraciones, scripts, CI y pruebas; tres revisiones especializadas de backend, operación y documento académico.
- Lectura de PLAN_MAESTRO_ENTREGA.md, PLAN_RESTANTE_CIERRE_MAESTRO.md, ESTADO, matriz, decisiones y evidencias.
- Extracción con pdfinfo/pdftotext del PDF original y lectura XML de los tres manuales DOCX existentes.
- Verificación SHA-256 de las 222 entradas del manifiesto de entrega anterior: una divergencia, CIERRE_LOCAL.md. Las otras 221 coincidían al comprobarlas antes de los cambios documentales de esta auditoría.
- Validación de formato y estructura de los documentos nuevos; los resultados se registran al finalizar la entrega.
- No se probaron ataques, no se auditaron exhaustivamente todas las dependencias y no se alteraron datos, servicios ni módulos de aplicación. Las pruebas de frontend de esta sesión son unitarias/componentes, no navegación visual real.

Se agregó el [inventario técnico actual](evidencias/auditoria-tecnica-20261109.sha256), con 167 archivos enumerados y SHA-256 individual. Se verifica desde la raíz con `sha256sum --check docs/evidencias/auditoria-tecnica-20261109.sha256`. Incluye apps/packages/scripts/tests/.github y configuraciones raíz seleccionadas, excluye privados/compilados/generados. Identifica esta revisión; no atribuye retroactivamente corridas históricas a este inventario ni sustituye el inventario de 147 entradas declarado anteriormente.

**Hechos:** código o registros observados. **Insuficiencia de evidencia:** falta una demostración concreta, sin afirmar que el producto falle. **Recomendación:** acción para cerrar un criterio. Una prueba escrita no equivale a prueba ejecutada; un resultado global no demuestra todos los subcasos.

## 3. Correcciones de implementación o configuración pendientes

| ID    | Prioridad / relación | Hallazgo confirmado                                                                                                                                                                                           | Trabajo requerido y criterio de cierre                                                                                                                                                                                                          |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | P1; R-12/PB-21/D46   | scripts/test-backup-restore-local.mjs:462–469 calcula RPO como fecha de creación del respaldo menos reloj de última escritura. No mide estado recuperado al incidente.                                        | Persistir marcas de escritura antes/después del respaldo, causar incidente aislado, restaurar y comparar marcas/filas recuperadas. Calcular desfase recuperable al incidente y pérdida efectiva. Registrar resultado nuevo, no reciclar 1,18 s. |
| AC-02 | P1; R-10/PB-18       | El runner scripts/test-integration.mjs:58–78 no incorpora csrf.ts ni mexico-city-datetime.ts aunque INVENTARIO_COBERTURA_REGLAS los da por incluidos; el archivo jest.coverage.config.cjs referido no existe. | Reconciliar inventario de reglas y denominador con configuración real; incluir validaciones exigibles, aplicar umbral por archivo sin bajarlo y producir un reporte nuevo. Actualizar porcentajes a partir de ese reporte.                      |
| AC-03 | P2; R-10/PB-18/19    | CI ejecuta test:coverage, pero únicamente publica playwright-report; el inventario afirma que publica coverage-report.                                                                                        | Configurar publicación del directorio real .local/e09-coverage o ubicación acordada y comprobar el artefacto en la ejecución disponible. Ejecución remota requiere repositorio autorizado y no se inventa.                                      |

Estas son correcciones acotadas. No se ha demostrado por esta inspección una fuga de datos ni fallo del cálculo académico o cupo. Las correcciones de código/configuración anteriores **se documentan y quedan pendientes; esta tarea no las implementa**.

## 4. Verificación pendiente y fortalecimiento de pruebas

| ID    | Relación            | Evidencia actual y brecha                                                                                                                                                                  | Criterio verificable                                                                                                                                                                                      |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-04 | R-09/PB-16/CP-14    | teclado-zoom.spec.ts:67–69 sigue aplicando style.zoom, aunque ya recorre foco con Tab real. R-09 exige zoom del navegador.                                                                 | Completar tareas críticas por rol con teclado y zoom real al 200 %, registrar navegador/versión/acción, dimensiones, foco, mensajes y resultados. Conservar CSS como complemento.                         |
| AC-05 | R-08/PB-25/CP-16    | acceso.spec.ts:196–217 dispara 401 tardío con fetch nativo desde evaluate, sin pasar por privateFetch/onUnauthorized. La protección del wrapper sí existe y tiene unitarias.               | Originar petición desde el flujo real/wrapper, confirmar interceptación, cambio A→B, respuesta tardía y permanencia de sesión/datos B. No se ha demostrado fuga.                                          |
| AC-06 | R-07/PB-14/CP-06/13 | Hay matriz HTTP de escritura/CSRF/roles y pruebas por módulo, pero no están reconciliadas todas las variantes de notas y certificados. Algunos IDs negativos no son inscripciones válidas. | Inventariar endpoint/método/rol/propiedad/estado; enlazar prueba positiva válida y negativas por celda. Cubrir aliases expuestos o justificar su retirada como cambio separado.                           |
| AC-07 | R-03/PB-19/CP-01–12 | Existen dos programas en integración, provisión de persona y PDFs de ambos. No hay un único recorrido integral equivalente completo por cada programa.                                     | Ejecutar guion trazable por programa: alta/acceso/oferta/matrícula/nota/historial/avance/constancia/QR. Puede unir evidencias inequívocas del mismo candidato, sin exigir nueva función si ya existe.     |
| AC-08 | R-08/PB-26/CP-17    | Hay pruebas >50 cuentas/>100 grupos y componentes >200 opciones; no inventario exhaustivo de todas las listas.                                                                             | Lista → origen → búsqueda/página/límite → caso → evidencia, incluidos historial, notas, constancias, reportes y auditoría. Corregir solo truncamientos/errores observados.                                |
| AC-09 | R-06/PB-12/CP-12    | Pérdida de respuesta HTTP existe, pero fixture mantiene transacción externa/savepoints. SIGKILL independiente también existe.                                                              | Vincular ambos ensayos con límites explícitos o ejecutar pérdida de respuesta tras commit durable en fixture confirmado con conexiones independientes. Verificar una emisión/auditoría/hash/recuperación. |
| AC-10 | R-02/12/PB-13       | Proxy y descarga real de dos PDFs ya se ensayaron. Nginx lee 5 s; transacciones admiten 20 s.                                                                                              | Ensayar timeout/congestión y recuperación de cliente sin duplicaciones; no afirmar un fallo solo por diferencia de límites ni aumentar timeout sin medición.                                              |
| AC-11 | R-01/15             | Huella técnica de 147 archivos declarada sin inventario específico reproducible; el manifiesto de entrega lista 222. Las cargas carecen de fecha/huella estructurada en su propia salida.  | Crear manifiesto técnico explícito y algoritmo, vincular logs al candidato y repetir pruebas afectadas por cambios. No comparar huellas de inventarios diferentes como si fueran equivalentes.            |

## 5. Entrega documental y evidencias pendientes

| ID    | Estado observado                                                                                                                                                         | Acción                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-12 | Una entrada del manifiesto previo no coincide con CIERRE_LOCAL.md.                                                                                                       | Mantenerlo como evidencia histórica y producir manifiesto nuevo de esta entrega después de terminar documentos y artefactos. Verificarlo íntegramente. No “reparar” silenciosamente una evidencia antigua. |
| AC-13 | carga-unicode-candidato.json y carga-smoke-candidato.json mezclan stdout de migraciones/logs con JSON final; no son JSON válidos.                                        | Producir artefactos estructurados o identificarlos como logs. Conservar originales y documentar transformación; no inventar metadatos inexistentes.                                                        |
| AC-14 | PDF p3 deja capítulo V pendiente; p26/32 dice que no hay repositorio/evidencias; no contiene anexos/manuales.                                                            | Añadir fe de actualización, conclusiones verificables, anexos, manuales por rol y técnico, formatos humanos y versión revisada PDF. No presentar páginas originales como actualizadas si se conservan.     |
| AC-15 | Manuales DOCX 2.0 sí existen, pero mencionan comandos inexistentes provision:local/auth:bootstrap:demo. El técnico carece del detalle prometido de variables/modelo/API. | Crear manuales revisados con comandos reales y límites por plataforma, variables sin secretos, relaciones/API/errores y recuperación. Conservar fuentes editables y originales.                            |
| AC-16 | El estado y la matriz dan cierre sin reservas; continuación conserva diagnóstico previo. “3 usuarios por rol” contradice JSON: uno por rol, tres en total.               | Añadir estado vigente que prevalezca sobre diagnósticos históricos y rectificar esa interpretación; usar esta auditoría como lista de control actual.                                                      |
| AC-17 | OPERACION_RESPALDO_RESTAURACION menciona database.sql; artefacto real es database.dump.                                                                                  | Corregir referencia operativa y conservar prueba de restauración con formato real.                                                                                                                         |

## 6. Pendientes humanos que no se resuelven con código

- **R-16:** nombres y cargos de responsables, custodio de respaldos, ubicación/retención reales y asignación de participantes. Siete copias declaradas no están acreditadas por una sola carpeta retenida de test.
- **R-17/PB-17/24/30:** piloto y capacitación reales, al menos representante de cada rol, padrón de convocados/atendidos/evaluados/acreditados, >=80/100 y 100 % de tareas críticas. Videos si se comprometen como material: grabarlos con datos ficticios; un guion no es video.
- **Scrum/XP:** registros contemporáneos reales o resolución académica auténtica sobre limitaciones. Las conversaciones con agentes y pruebas aprobadas no prueban ceremonias humanas ni secuencia TDD rojo/verde por sí solas.
- **R-18:** cierre y aceptación humana con fecha y firma/registro reales. El dossier preparado no equivale a acta aceptada.

D41–D46 ya se aprobaron para demo y no se vuelven a pedir. El catálogo oficial, reglamento institucional, HTTPS público, correo y operación real quedan separados del alcance local aprobado.

## 7. Qué ya existe y debe conservarse

| Área                                      | Implementación/prueba inspeccionada                                                                                                       | Límite de la afirmación                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Prerrequisitos y matrícula                | matriculas.integration.spec.ts incorpora cero/uno/varios, reprobados, pendientes, recursamiento, coincidencia oferta/POST y concurrencia. | No reejecutado en esta auditoría.                                                                         |
| Corrección concurrente de notas           | calificaciones.integration.spec.ts:400–460 usa dos sesiones/Promise.all, [200,409], versión y una auditoría.                              | Ya no es solo prueba secuencial; no marcarla otra vez ausente.                                            |
| Acceso de persona arbitraria              | personas.integration.spec.ts:327 y CLI de provisión; reset/sesiones/historial.                                                            | POSIX local siga_dev; no administrador ni operación productiva.                                           |
| PDFs de dos programas y respuesta perdida | certificados.integration.spec.ts incluye emisión, descarga, hash, revocación, reemisión y pérdida HTTP.                                   | Reserva de commit durable indicada en AC-09.                                                              |
| Unicode y rendimiento                     | test-load.mjs incorpora --unicode permanente; registro 780 solicitudes, 0 errores, p95 670,84 ms.                                         | Tandas cada 7,69 s y 2,6 solicitudes/s; no carga continua ni descarga bajo carga.                         |
| Borradores                                | E2E de dos filas, error/conflicto y cierre; componente preserva vuelta a pantalla.                                                        | No todos los subcasos están en un único E2E integral.                                                     |
| Migración incremental                     | data.integration.spec.ts:352–422 aplica tres migraciones, datos previos y cuarta de D44.                                                  | Existe; no volvió a ejecutarse en esta sesión.                                                            |
| Restauración empaquetada                  | Script destruye stack propio, recupera dump y dos PDFs, login y hashes.                                                                   | RTO registrado 9,47 s; RPO publicado necesita corregirse. Host/imágenes/configuración siguen disponibles. |
| Interfaz y aislamiento                    | privateFetch generación/abortos, limpieza de caché/drafts, paginación, pestañas y foco.                                                   | No reemplaza AC-04/05/08.                                                                                 |

## 8. Cobertura de los 30 bloques PB

“Existe” significa implementación/evidencia inspeccionada, no aceptación global. Una brecha de demostración no se convierte en módulo faltante.

| PB    | Resultado actual                                    | Pendiente de esta auditoría                                                    |
| ----- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| PB-01 | Línea base, roles funcionales y documentos.         | AC-11/12/16 y responsables humanos.                                            |
| PB-02 | Runtime, scripts e instalación limpia registrada.   | Reproducibilidad de plataforma/entrega y AC-11.                                |
| PB-03 | Catálogos/versiones/bajas/grafo implementados.      | AC-07/08, evidencia integral y listas.                                         |
| PB-04 | Personas/provisión/reset/sesiones implementados.    | Manual correcto/plataforma y AC-07.                                            |
| PB-05 | Cupo y matrícula transaccional implementados.       | Regresión vinculada al candidato; no nuevo motor.                              |
| PB-06 | Matriz de prerrequisitos y flag implementados.      | Evidencia integral/candidato.                                                  |
| PB-07 | Exclusiones y nota final directa definidas.         | Mantener D42/exclusiones en informe.                                           |
| PB-08 | Versionado/conflicto/auditoría implementados.       | AC-06 y regresión.                                                             |
| PB-09 | Cálculos Decimal y referencias manuales existentes. | AC-02 y resultados reproducibles.                                              |
| PB-10 | Constancia de estudios acordada D43.                | Conservar semántica, sin agregar título/firma avanzada.                        |
| PB-11 | PDFs Unicode/multiprograma existentes.              | AC-07/11 y anexos visuales auténticos.                                         |
| PB-12 | Recuperación/crash/respuesta perdida existentes.    | AC-09/10; evidencia durable/timeout.                                           |
| PB-13 | Proxy/cookies/descarga comprobados en registros.    | AC-10.                                                                         |
| PB-14 | Guardas y matriz fuerte existentes.                 | AC-06.                                                                         |
| PB-15 | Minimizacion/privacidad/carpeta privada.            | Revisión del paquete nuevo y AC-12.                                            |
| PB-16 | Responsive/Tab/pestañas/zoom CSS.                   | AC-04: zoom real y tareas críticas.                                            |
| PB-17 | Material de piloto/capacitación preparado.          | Ejecución humana R-17.                                                         |
| PB-18 | Umbral dinámico y cobertura registrados.            | AC-02/03.                                                                      |
| PB-19 | E2E/fixtures/CI existentes.                         | AC-05/07/08/09/11.                                                             |
| PB-20 | Cargas latina/Unicode registradas.                  | AC-11/13; asociar resultados al candidato correcto.                            |
| PB-21 | Respaldo/restore/RTO/retención de test existentes.  | AC-01/17 y custodio/retención operativa.                                       |
| PB-22 | Fuera de alcance local.                             | Ninguna publicación solicitada.                                                |
| PB-23 | Arquitectura/TGS/manuales/documento.                | AC-14/15/16 y cierre documental revisado.                                      |
| PB-24 | Pruebas y trazabilidad disponibles.                 | Evidencia humana Scrum/XP o resolución RA; no afirmar TDD histórico por tests. |
| PB-25 | Generación/caché privada implementadas.             | AC-05.                                                                         |
| PB-26 | Paginación y opciones históricas implementadas.     | AC-08.                                                                         |
| PB-27 | Borradores y conflictos implementados.              | Consolidar casos regreso/sesión; no nueva funcionalidad sin fallo.             |
| PB-28 | Reportes/CSV/auditoría implementados.               | AC-06/08 e inventario CP-13.                                                   |
| PB-29 | Optimización medida cola/PDF híbrido.               | No agregar workers/caché sin problema medido; AC-10/11.                        |
| PB-30 | Evaluación/acta/material preparados.                | Piloto/evaluación/aceptación auténticos.                                       |

## 9. Estado de R-01 a R-18

| Tarea | Dictamen vigente                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------- |
| R-01  | Reabierta para reconciliar candidato/evidencia/reservas: AC-11/12/16.                               |
| R-02  | Implementación Unicode presente y carga aprobada registrada; AC-10/11/13 limitan cierre probatorio. |
| R-03  | Implementado por piezas; AC-07 completa demostración por dos programas.                             |
| R-04  | Implementación y pruebas escritas actuales; repetir en candidato final según cambios.               |
| R-05  | Concurrencia real y cálculo independiente presentes; no declarar implementación faltante.           |
| R-06  | Implementado; reserva AC-09 de commit durable y AC-10.                                              |
| R-07  | Reconciliar matriz y casos positivos: AC-06.                                                        |
| R-08  | Implementado en gran parte; AC-05/08 y subcasos de borradores.                                      |
| R-09  | Pendiente de prueba de zoom real/tareas: AC-04.                                                     |
| R-10  | Correcciones de configuración/evidencia: AC-02/03.                                                  |
| R-11  | Copia limpia y migración incremental existen; documentar plataforma/candidato.                      |
| R-12  | Restauración/RTO presentes; corregir RPO y custodia: AC-01/17.                                      |
| R-13  | Redacción ampliada en esta entrega; revisión humana pendiente.                                      |
| R-14  | Nuevo paquete requiere manifiesto y verificación propios; no acredita aceptación.                   |
| R-15  | Regresión histórica; check nuevo pasó; faltan corridas afectadas después de correcciones.           |
| R-16  | Decisiones demo aprobadas; responsables/custodia nominales pendientes.                              |
| R-17  | Material preparado; ejecución real pendiente.                                                       |
| R-18  | Dossier preparado; acta/aceptación integral pendiente.                                              |

## 10. Orden de cierre y encargos de subagentes

Máximo cuatro agentes incluido coordinador; tres especialistas por tanda; un escritor por archivo y un único trabajo pesado. Modelos/razonamiento heredan del coordinador. Cada encargo conserva pragmatic-clean-code, datos ficticios, recursos propios y documentación técnica más guía sencilla.

1. **operacion_rpo:** AC-01; propiedad scripts/test-backup-restore-local.mjs y prueba/evidencia asignada. Diagnóstico y corrección mínima, watermark comprobado, sin tocar datos/volúmenes ajenos. Medir y entregar límites.
2. **qa_cobertura:** AC-02/03; propiedad runner/CI/inventario bajo acuerdo. Definir archivos exigibles antes de ejecutar, >=70 % por archivo, no bajar umbrales; publicar ubicación real y reporte.
3. **frontend_validacion:** AC-04/05/08; propiedad tests web/E2E asignados. No confundir CSS con zoom real ni fetch nativo con privateFetch. Cambiar producto solo ante defecto reproducido.
4. **backend_trazabilidad**, en siguiente tanda: AC-06/07/09; mapa de rutas y guiones por programa, fixture durable y casos positivos.
5. **coordinador:** AC-10/11/12/13/16, integración y congelamiento. Reserva pruebas pesadas, manifiestos separados fuentes/entrega y revisión independiente.
6. **documentacion_entrega:** AC-14/15/17; esta entrega redacta fuentes/manuales/conclusiones. Mantener pendiente evidencia humana; no firmar por terceros.

Contrato de salida: archivos, comportamiento, criterios PB/R/CP, comandos realmente ejecutados, candidato, resultados, riesgos y evidencia. Las correcciones de código descritas requieren una siguiente etapa de implementación; la solicitud actual se completa con auditoría y documentación.

## 11. Entregables de esta revisión

- Informe actual con auditoría, brechas y cobertura PB/R.
- Complemento del documento académico con capítulo V, anexos y manuales completos; fuente MD, DOCX editable y PDF.
- PDF integrado: conserva 35 páginas originales y agrega complemento, con advertencia explícita de actualización. No se afirma que el índice viejo haya sido reescrito.
- Manuales revisados MD/DOCX/PDF y explicación sencilla separada.
- Manifiesto nuevo de documentación/artefactos y registro del check ejecutado. No cambia código funcional ni repara silenciosamente evidencias históricas.

## 12. Aceptación

F no debe presentarse como cerrada sin reservas hasta resolver los criterios técnicos anteriores. A sigue pendiente de personas reales. Esta auditoría no publica un porcentaje nuevo: no se reejecutó ni cerró toda la matriz. La evidencia histórica favorable se conserva; se corrige la interpretación excesiva de cierre.

## 13. Verificación de la entrega documental producida

El [registro de validación](evidencias/validacion-entrega-revisada-20261109.json) conserva los resultados efectivos: check aprobado (38 pruebas API/40 web), formato aprobado, 30 enlaces locales verificados en los seis documentos nuevos, tres DOCX con ZIP/XML válidos y tamaño A4, extracción PDF sin errores y texto idéntico de las 35 páginas originales en la versión integrada. Se revisaron visualmente páginas representativas de texto/tablas y se comprobó que las palabras del complemento no salen de los límites de página; esto no equivale a una revisión humana de accesibilidad de todos los documentos.

La versión integrada tiene 65 páginas: 35 originales y 30 de complemento. Los manuales separados tienen 10 páginas (usuario) y 13 (técnico). Las fuentes técnicas del inventario de 167 archivos no cambiaron durante la generación documental. El manifiesto nuevo identifica el paquete actual; las reservas AC y la aceptación humana siguen abiertas.
