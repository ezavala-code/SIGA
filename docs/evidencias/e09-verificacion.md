# Evidencia E09: regresión, seguridad, carga y accesibilidad

Fecha: 10 de octubre de 2026. Todas las cuentas y registros utilizados son ficticios. No se reiniciaron ni eliminaron los volúmenes existentes. No se creó commit.

## Entorno y alcance

- Windows con Node 24.19.0, npm 12.2.0, Docker Desktop 4.94.0, Docker Engine 29.8.2 y PostgreSQL 18.6.
- Se cerraron E09-A (regresión, controles de seguridad y cobertura) y E09-B (prueba de carga, accesibilidad y aceptación local). D09–D13 y D15 conservan su condición de propuestas; medir contra D15 no constituye aprobación institucional.
- La prueba de carga creó un esquema aleatorio dentro de `siga_dev` de Docker y lo eliminó en la salida. El conjunto incluyó 1,000 estudiantes y 50 grupos ficticios. No se cambiaron datos ni volúmenes de demostración.

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run check` | Correcto: ESLint, TypeScript, 18 pruebas unitarias API, 7 pruebas web y builds API/web. |
| `npm run test:integration` | 69/69 pruebas en 9 suites PostgreSQL; ejecutadas en un esquema aleatorio y retirado al terminar. |
| `npm run test:coverage` | 69/69; servicios API: 85.9 % de líneas y 71.06 % de ramas. Cumple el umbral global propuesto de 70 %. |
| E2E nativo `npm run test:e2e` | 12/12, escritorio y móvil. Incluye sesión para los tres roles, rutas funcionales y denegación de reportes para estudiante. |
| E2E Docker `SIGA_E2E_BASE_URL=http://localhost:8080; npm run test:e2e` | 12/12, escritorio y móvil. |
| Accesibilidad | `lang=es`, título y etiquetas accesibles, foco por teclado en orden, contorno visible y ausencia de desbordamiento horizontal; comprobado en 360 px y 1366 px. |
| `npm run format:check`; `git diff --check` | Correctos. |
| `npm audit --omit=dev` | 0 vulnerabilidades de dependencias productivas. |
| `docker compose config --quiet` y `docker compose ps` | Compose válido; PostgreSQL y API saludables, web activa. |
| `.local/admin-acceso-5432.txt` | La cuenta ADMINISTRADOR inició sesión en Docker (HTTP 200) y cerró la sesión de verificación (HTTP 204); no se mostró la contraseña. |

La cobertura agregada no significa que cada archivo supere el umbral: `catalogos.service.ts` alcanzó 60.49 % de ramas, `certificados.service.ts` 66.34 % y `personas.service.ts` 67.02 %. La carpeta local ignorada `.local/e09-coverage` contiene el reporte detallado para orientar ampliaciones posteriores.

Una primera ejecución de integración, lanzada en paralelo con `npm run check`, tuvo un fallo de conteo en el escenario de reportes: esperaba 5 grupos y recibió 15. La repetición completa, ejecutada sola en un esquema nuevo, pasó 69/69. La causa de esa única divergencia no quedó determinada; por eso queda registrada para observar en la próxima ejecución, aunque no se reprodujo en la verificación final.

## Medición de carga D15

El procedimiento `npm run test:load` precalentó el sistema durante 60 segundos y midió durante 300 segundos con 20 solicitudes concurrentes. Cada solicitud leyó `GET /reportes/grupos?page=1&pageSize=100` a través de una API NestJS iniciada como proceso local de Node y conectada al PostgreSQL del contenedor Docker. La medición no corresponde a un despliegue de producción ni a tráfico de Internet.

| Medida | Resultado | Umbral propuesto |
| --- | ---: | ---: |
| Solicitudes | 46,425 | — |
| Errores | 0 (0 %) | <1 % |
| Solicitudes/segundo | 154.71 | — |
| Latencia promedio | 129.26 ms | — |
| Latencia p95 | 201.74 ms | <2,000 ms |
| Latencia máxima | 624.47 ms | — |

La medición pasa los umbrales numéricos propuestos D15 en este entorno local. No sustituye una prueba con datos reales, infraestructura productiva o aceptación del responsable académico.

## E08 en Docker: permisos y persistencia del PDF

Al activar Docker, la carpeta del volumen PDF se creaba con propietario `root:root` y modo 755, pero la API corre como usuario `node` (UID/GID 1000). La primera emisión fallida quedó registrada como FALLIDA con su auditoría; ese historial se conservó. Se corrigió la preparación del almacenamiento con el servicio de inicialización `certificados-permisos` en Compose y permisos seguros en la imagen API. La carpeta quedó `1000:1000`, modo 700; el archivo PDF, `1000:1000`, modo 600.

Después se emitió una constancia ficticia de 5,209 bytes con QR. La consulta pública respondió `VIGENTE` sin matrícula, correo ni calificaciones. Al recrear el contenedor API, se descargó el mismo PDF con SHA-256 `1f0fed561be521fac89e11e9e229568a58ea761a0c6dd9c5b8a3b751ff5b8e8d`. El volumen PostgreSQL no se borró ni se reinició. La evidencia E08 ampliada está en `docs/evidencias/e08-verificacion.md`.

## Trazabilidad y límites

- CP-14: verificado con E2E responsivo de móvil/escritorio y carga p95/error rate dentro del umbral D15 propuesto.
- CP-15: pendiente de E10. No se ejecutó una restauración integral de respaldo ni comparación de datos y archivos.
- CI remoto, despliegue HTTPS y revisión de recuperación no se ejecutaron. El limitador de login sigue siendo en memoria para una instancia local.
- No se ejecutó una prueba de penetración externa. La cobertura y los escenarios de integración/E2E aportan regresión funcional y controles de acceso, pero no certificación de seguridad.
- Las credenciales de demo no se incluyen en esta evidencia. Acceso ADMINISTRADOR Docker verificado mediante el archivo local ignorado por Git `.local/admin-acceso-5432.txt`.
