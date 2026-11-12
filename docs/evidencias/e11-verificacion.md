# E11 - Verificación de capacitación y entrega

Fecha: 2026-10-11  
Versión documentada: `0.1.0-e10-20261011055740`  
Alcance de esta revisión: preparar y revisar los materiales de capacitación del incremento local E10.

## Materiales preparados

- [Manual de usuario por rol](../manuales/manual-usuario-siga.docx): operación para estudiante, docente y administrador, acceso, tareas principales, seguridad y resolución inicial de problemas.
- [Manual técnico](../manuales/manual-tecnico-siga.docx): requisitos, preparación local, uso de Docker, servicios, salud, respaldos, restauración, reversión, verificaciones y atención de incidentes.
- [Plan de capacitación E11](../manuales/plan-capacitacion-e11.docx): dos sesiones de 150 minutos, alternativa remota, preparación del entorno, ejercicios con información ficticia, demostración guiada, evaluación práctica, criterios de aprobación, seguimiento, storyboard de video y formatos vacíos de asistencia, evaluación y entrega.

El material es editable en Word. No incluye contraseñas; cuando hace falta acceder a la demo, indica los archivos locales ignorados por Git descritos en el README. Las decisiones académicas pendientes se presentan como configurables/propuestas, no como políticas institucionales aprobadas.

## Verificación realizada

- Se contrastó el contenido con `README.md`, `docs/ESTADO.md`, los flujos disponibles de la aplicación y la evidencia E10. Los pasos de instalación y operación corresponden al estado local registrado y no implican un despliegue público.
- Se abrieron los tres DOCX y se exportaron desde Microsoft Word a PDF. Se rasterizaron y revisaron visualmente todas las páginas: 3 del manual de usuario, 4 del manual técnico y 7 del plan, 14 páginas en total. Se ajustaron títulos, numeración, presentación del examen y ubicación del formulario de entrega.
- El renderizador `render_docx.py` de la skill no pudo ejecutarse porque LibreOffice no está instalado en el equipo. La inspección visual se completó con la alternativa de exportación de Word y rasterización local; no se presenta como una prueba del contenido operativo por un usuario independiente.
- E11 es una entrega documental; no se modificó código de aplicación, base de datos, migraciones ni volúmenes. No se ejecutaron pruebas de software en esta subetapa.

## Criterios todavía pendientes

No se realizó aún un piloto con otra persona ni una capacitación presencial o en línea. Por tanto, no existen listas de asistencia firmadas, puntajes, resultados de tareas críticas, aceptación del receptor ni video grabado. Los formatos incluidos permanecen vacíos para completar solo cuando esas actividades sucedan.

Para declarar E11 aceptada falta que otra persona siga el manual, obtenga al menos 80/100 y complete todas las tareas críticas (100 %), que se imparta y documente la sesión y que se registre la entrega. Si la institución solicita un video como evidencia, debe grabarse a partir del storyboard del plan. No se inventan fechas, participantes ni resultados.

## Resultado

**Material documental preparado y revisado visualmente; aceptación integral de E11 pendiente de ejecución humana.** La aplicación permanece en la versión E10 verificada localmente. No se creó commit.
