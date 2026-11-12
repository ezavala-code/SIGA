# Qué revisamos y qué significa la entrega revisada

Esta guía explica de manera sencilla la [auditoría](AUDITORIA_IMPLEMENTACION_Y_ENTREGA_20261109.md) y el [complemento del informe](entrega-revisada/COMPLEMENTO_INFORME_SIGA.md). Fecha: 9 de noviembre de 2026.

## 1. Qué encontramos

El sistema ya tiene sus funciones principales: administra datos escolares, permite inscribirse, registrar notas, consultar resultados y emitir constancias. No hace falta empezar desde cero.

Todavía no se puede afirmar que todo el plan terminó. Hay que distinguir tres cosas: que una función esté programada, que una prueba adecuada demuestre su resultado y que las personas responsables acepten la entrega.

## 2. Cómo usamos el sistema, paso a paso

1. Administración prepara programas, materias, planes, personas, periodos y grupos.
2. Soporte habilita el acceso de cada persona por el procedimiento compatible con su entorno. Dar de alta a alguien no le entrega automáticamente contraseña.
3. El estudiante entra y el servidor comprueba si puede inscribirse: plan, periodo, requisitos y lugares disponibles.
4. El docente asignado registra la nota final. Si dos cambios compiten, el sistema controla la versión para evitar sobrescribir silenciosamente.
5. El historial calcula promedios por créditos. Pendiente y cero son distintos: cero sí es una nota.
6. Con al menos una nota final se puede solicitar la constancia de estudios de demostración. El PDF conserva una copia de los datos y su QR permite consultar un estado mínimo.
7. Los respaldos permiten recuperar base y PDFs. Para saber si funcionan hay que restaurarlos y comprobar los datos.

Los manuales revisados explican los botones y pasos de cada rol. Los datos y reglas de demo están aprobados provisionalmente; no se deben presentar como reglamento institucional.

## 3. Qué falta programar o configurar

- Corregir cómo una prueba calcula la posible pérdida de datos. El número anterior de RPO no mide lo que decía medir.
- Ajustar qué archivos de reglas deben cumplir cobertura y guardar el reporte real de CI.

No se encontró que falte un módulo principal completo. Si una comprobación posterior descubre un fallo, deberá corregirse y probarse.

## 4. Qué falta comprobar mejor

Se debe usar el zoom real del navegador, no solo agrandar con CSS. También hay que demostrar que una respuesta vieja al cambiar de cuenta no cierre la sesión nueva usando el camino real de la aplicación.

Hay que unir el recorrido completo de los dos programas, revisar todas las listas y permisos, y aclarar algunas pruebas de recuperación y tiempos de espera. La aplicación ya tiene gran parte de esos controles; falta evidencia suficientemente precisa para cerrar cada requisito.

## 5. Qué significa respaldo, RTO y RPO

Un respaldo es una copia de datos y documentos. RTO es cuánto tarda en volver un servicio utilizable después de un incidente. RPO indica hasta qué punto se puede recuperar la información y cuánto podría perderse.

Ejemplo: se hace una copia a las 10:00, se sigue trabajando y ocurre un incidente a las 10:30. Restaurar solo esa copia puede dejar fuera lo escrito después de las 10:00. Medir cuántos segundos tardó en generarse la copia no demuestra esa pérdida. La prueba debe guardar cambios conocidos, restaurar y comparar lo que realmente volvió.

## 6. Qué comprobamos hoy

Ejecutamos el control de lint, tipos, pruebas unitarias y compilación: pasó con 38 pruebas API y 40 pruebas web. Eso no incluye las pruebas completas de navegador, carga o restauración; sus resultados anteriores se conservan como históricos.

También comprobamos el manifiesto anterior: una de sus 222 huellas no coincidía porque el documento de cierre había cambiado. Una huella es una marca matemática del contenido: si el archivo cambia, cambia la marca.

## 7. Qué documentos recibes

1. La auditoría detalla lo existente, lo pendiente y qué demostrar para cerrar.
2. El complemento contiene conclusiones, anexos, manual de usuario, manual técnico y formatos para capacitación/aceptación.
3. El DOCX permite editar ese complemento.
4. El PDF integrado conserva el informe original y añade la actualización después de sus 35 páginas. Las frases antiguas quedan aclaradas por la fe de actualización; no se fingió que el original ya decía otra cosa.
5. Los manuales también se entregan por separado para consultarlos sin buscar dentro del informe completo.

El archivo original se conserva. Las versiones 3.0 son documentales; no significan que la aplicación haya cambiado de versión o que sus pendientes se hayan corregido.

## 8. Cómo se termina de verdad

1. Resolver las correcciones técnicas y ejecutar las comprobaciones pendientes.
2. Identificar una versión y guardar sus pruebas y documentos coherentes.
3. Hacer que personas reales de los tres roles prueben el sistema.
4. Capacitar y evaluar: al menos 80/100 y todas las tareas críticas correctas.
5. Registrar responsables de operación y respaldo.
6. Obtener la revisión y aceptación auténtica del responsable académico.

Los subagentes pueden ayudar a programar, probar y escribir. No pueden convertirse en participantes del piloto ni firmar por las personas. Por eso la redacción puede estar lista mientras la aceptación sigue pendiente.
