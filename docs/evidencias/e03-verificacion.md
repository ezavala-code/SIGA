# Evidencia de E03 — autenticación y permisos

Fecha: 2026-10-10. Entorno Windows, Node 24.19.0/npm 12.2.0, PostgreSQL 18.6 nativo y Docker Desktop con WSL 3.0.1/Docker Engine 29.8.2. Solo se usaron cuentas y datos ficticios.

## Criterio y cobertura

E03 implementa RF-01 y los controles de sesión y autorización aplicables de RNF-01. Incluye activación local explícita de cuentas, hash bcrypt, login/logout, cookie JWT HttpOnly, sesión persistida y revocable, CSRF/origen, límite temporal de intentos y autorización de servidor por rol y propiedad. El portal presenta acceso y vistas iniciales protegidas para estudiante, docente y administrador. No comprende todavía alta/edición de catálogos, matrícula ni calificaciones.

## Verificaciones ejecutadas

| Verificación | Resultado observado |
| --- | --- |
| `npm run check` | Código 0. ESLint, typecheck, build API/web y pruebas unitarias/componentes correctos: 13 API y 7 web. |
| `npm run test:integration` | Código 0; 45 pruebas en 3 suites PostgreSQL real. Las fixtures se revierten; incluye 7 pruebas RF-01/RNF-01 de sesión, CSRF, roles/propiedad, usuarios inactivos, token vencido/falsificado, revocación y límite de intentos. |
| `npm run test:e2e` | Código 0; 10 pruebas en navegador contra web/API nativos: portal y flujos de los tres roles en escritorio y móvil, recarga y logout. |
| `SIGA_E2E_BASE_URL=http://localhost:8080 npm run test:e2e` (variable temporal PowerShell) | Código 0; 10 pruebas contra la versión Docker reconstruida: portal y acceso por rol en escritorio/móvil, recarga y logout. |
| `npm run format:check` | Código 0; todos los archivos con formato correcto. |
| `npm audit --omit=dev` | 0 vulnerabilidades en dependencias de producción. Las alertas de herramientas de desarrollo registradas en la evidencia E02 siguen fuera de este resultado. |
| `docker compose up --build -d --wait` | Código 0; imágenes de API/web/migración construidas, PostgreSQL saludable, migración finalizada con código 0, API saludable y web disponible. |
| `GET http://localhost:8080/api/health` | `status=ok`, `checks.database=up`. |
| `git diff --check` | Código 0; sin errores de whitespace en los cambios versionados. |
| `git check-ignore .env .local/demo-acceso.txt .local/demo-acceso-5432.txt` | Los tres archivos privados están ignorados por Git. No se muestran ni copian contraseñas en esta evidencia. |

Las credenciales demo de `siga_dev` nativa y Docker son distintas y viven únicamente en `.local`. La migración usa las tablas E02 existentes; no se agregó ni se necesitó migración. No se eliminaron volúmenes, no se ejecutó CI remoto y no se creó un commit.

## Limitaciones conocidas

El limitador de login es memoria local de una instancia; debe centralizarse antes de escalar horizontalmente. Las sesiones duran 30 minutos y requieren volver a iniciar sesión al vencer. `COOKIE_SECURE=false` sirve solo para HTTP local: toda exposición remota requiere HTTPS, cookie segura, origen exacto y revisión de seguridad. No hay flujo de registro/recuperación de contraseñas. Las cuentas son ficticias. Los casos funcionales CP-02 a CP-15 continúan en etapas posteriores; esta evidencia no equivale a aprobación de esas pruebas ni del CI remoto.
