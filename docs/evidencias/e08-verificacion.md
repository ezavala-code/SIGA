# Evidencia E08: constancias, reportes y auditoría

Fecha de verificación: 2026-10-10. Datos únicamente ficticios. No se creó una migración, no se modificaron contraseñas demo ni se borró ningún volumen. No se creó commit.

## Implementación

- El estudiante emite su constancia propia; administración puede emitirla para un perfil existente. Sin notas finales no hay emisión. Por decisión técnica provisional (D37), el servicio no condiciona la constancia al estado académico del perfil; la elegibilidad institucional precisa sigue pendiente de definición. Las pruebas cubren emisión con nota final y rechazo de una constancia vacía, pero no cambian explícitamente un perfil a EGRESADO. El PDF aclara que es una constancia académica y no demuestra conclusión del programa.
- Cada emisión registra código aleatorio único, instantánea JSON, PDF multipágina, QR de verificación, ruta de almacenamiento, SHA-256 y auditoría. Corregir una calificación posterior no modifica el archivo emitido.
- Administración revoca con motivo. El titular o administración pueden reemitir una constancia revocada del mismo estudiante; la nueva emisión conserva el vínculo al documento anterior.
- La descarga del PDF exige titular o administración. La API detecta archivo ausente/alterado y lo registra. Verificación pública expone solamente código, tipo, fecha, programa, estado y nombre abreviado.
- El administrador consulta grupos, certificados y bitácora con filtros y paginación. DOCENTE solo puede exportar el historial CSV de un grupo propio; ADMINISTRADOR puede exportar cualquier grupo. CSV escapa celdas y neutraliza prefijos de fórmula. La interfaz administrativa permite imprimir los reportes.
- `.local/certificados` es el destino por defecto en desarrollo. Compose configura `CERTIFICATES_DIR=/data/certificados` y el volumen nombrado `siga_certificados`. La base de datos no almacena el contenido binario del PDF.
- D09–D13 siguen como propuestas. E08 no incorpora envío de correo RF-13, firma digital ni un certificado de conclusión.

## Resultados ejecutados

| Verificación | Resultado |
| --- | --- |
| `npm run check` | Correcto: lint, tipos, 18 pruebas API unitarias, 7 pruebas web y build API/web. |
| `npm run test:integration` | 69/69 en 9 suites PostgreSQL; el runner aplicó las migraciones a un esquema aleatorio de `siga_test` y eliminó solo ese esquema. |
| `npm run test:e2e` | 10/10 en escritorio y móvil con PostgreSQL nativo; cubre acceso a reportes, enlace CSV docente, página de constancias y verificación pública. No emite constancias ni altera calificaciones demo. |
| Revisión visual de PDF con PyMuPDF | Muestra ficticia de dos páginas; QR visible, encabezado de continuación correcto, claves largas ajustadas dentro de columnas y contenido/footer sin traslapes. La muestra temporal se eliminó. |
| `npm run format:check` y `git diff --check` | Correctos al cierre. |
| `npm audit --omit=dev` | 0 vulnerabilidades de dependencias productivas. |
| `docker compose config --quiet` | Correcto; Compose aceptó el volumen y su inicialización de permisos. |
| Docker: emisión y persistencia | Correcto en E09: PDF/QR emitido, PDF descargable después de recrear `siga-api-1`, SHA-256 idéntico antes/después y consulta pública `VIGENTE`. |

## Casos cubiertos

- CP-12: PDF válido con una imagen QR embebida; código inexistente; autorización por propietario; rechazo de docente y otro estudiante; hash incorrecto; notas reprobadas incluidas; constancia vacía rechazada; snapshot conserva la calificación anterior a una corrección; revocación y reemisión con instantánea nueva y vínculo.
- CP-13: lista administrativa de grupos, historial CSV limitado al grupo asignado para docente, rechazo a docente ajeno y a otros roles, escape CSV contra fórmulas, bitácora de emisión/revocación e informe de auditoría sin contraseñas ni tokens.

## Limitaciones registradas

La primera emisión Docker falló porque el volumen nuevo estaba como `root:root`, inaccesible al usuario `node`; quedó un registro ficticio FALLIDO con auditoría. Se corrigió la propiedad y el modo del directorio mediante el servicio `certificados-permisos`, sin borrar archivos. Luego se emitió otro documento ficticio de 5,209 bytes con QR y se verificó su descarga y el mismo SHA-256 tras recrear la API. El certificado vigente y el rastro FALLIDO permanecen en la base y volumen de demostración. No se comprobó respaldo/restauración de la base completa; eso corresponde a E10.

La verificación pública confirma el registro y estado, no autentica legalmente una firma institucional ni muestra el expediente. No se ejecutó CI remoto porque no hay push configurado. RF-13 correo queda pospuesto.
