# Verificación de la primera base ejecutable

Sesión del 9 de octubre de 2026, America/Mexico_City. Windows x64, Node 24.19.0, npm 12.2.0 y PostgreSQL 18.6 nativo. Primera entrega local, guardada sin commit.

## Resultados ejecutados

- **12 unitarias API aprobadas**: parseo de entorno, puertos, secretos en errores, origen, aislamiento test, liveness y readiness.
- **4 pruebas de componentes aprobadas**: disponible, recuperación de error de red, 503 y ruta inexistente.
- **4 de integración aprobadas**: PostgreSQL real y contrato público; liveness; CORS y rutas inexistentes; timeout contra servidor TCP que no habla PostgreSQL conservando liveness.
- **4 E2E aprobadas**: conexión web → API → PostgreSQL y navegación 404, en escritorio de 1366 px y móvil de 360 px. Sin overflow horizontal.
- ESLint, typecheck y construcción: código 0; bundle generado por Vite, sin errores TypeScript.
- Instalación limpia npm ci: código 0. Después se arrancó npm run dev y se comprobó con navegador.
- Compose principal y test: validación estática, código 0.
- Auditoría npm de dependencias productivas: cero hallazgos reportados; no equivale a seguridad completa de la futura aplicación.
- Setup repetido conserva .env; stop/start reutiliza clústeres; .env y .local ignorados por Git.

La primera corrida detectó CommonJS incompatible con NestJS 12 ESM y new URL lanzando antes del manejo seguro de errores. Se corrigieron con ESM y URL.canParse; las corridas posteriores pasaron sin retirar los casos fallidos.

## Evidencia visual

e01-escritorio.png y e01-movil.png son capturas reales revisadas visualmente. e01-navegador.json registra fecha UTC, viewport, respuesta de health, ausencia de errores JS y comprobación de overflow. El reporte automatizado completo local está en playwright-report/ y se regenera con npm run test:e2e.

## Límites

Docker no inicia por falta de WSL: sus imágenes no se construyeron ni ejecutaron. Validar Compose no acredita ejecución. CI remoto no ejecutado. No se midió carga, cobertura de reglas académicas ni seguridad de autenticación porque esos módulos no existen. CP-01 a CP-15 no se ejecutaron; esta evidencia corresponde solo a infraestructura E01.
