# Publicar SIGA como sitio web

La aplicación que está en `http://localhost:8080` solo es accesible desde el equipo local. Para convertirla en una página pública se necesita alojar el proyecto en un servidor con dirección pública y un dominio. **La publicación remota aún no se ha realizado.**

## Requisitos previos

1. Un servidor Linux con Docker Engine y Docker Compose, capacidad para PostgreSQL/PDF y acceso administrativo para instalar actualizaciones.
2. Un dominio. Sus registros DNS `A` (y `AAAA`, si el servidor tiene IPv6) deben apuntar a la dirección del servidor.
3. Acceso de red entrante a los puertos 80 y 443 para obtener y renovar el certificado TLS.
4. Cuentas, planes, programas y reglas académicas autorizados para producción. `db:seed` únicamente carga los metadatos del plan ICO-F19; el catálogo detallado de asignaturas, créditos y seriación sigue pendiente en E12. La interfaz acepta varios planes, pero no hay que presentar ICO-F19 como si ya existiera el catálogo oficial completo ni cargar la captura personal como expediente institucional.

## Preparar el servidor

Sube una copia revisada del repositorio y ejecuta `npm ci`. Crea el `.env` directamente en el servidor con secretos nuevos, diferentes a los de desarrollo; no copies el `.env` del equipo ni publiques ese archivo. SIGA requiere `POSTGRES_PASSWORD`, `POSTGRES_APP_PASSWORD` y `JWT_SECRET`. Guarda además el origen público exacto, sin barra final, por ejemplo:

```dotenv
SIGA_PUBLIC_ORIGIN=https://siga.ejemplo.edu.mx
WEB_PORT=8080
```

Protege el archivo de entorno para que solo la cuenta operadora pueda leerlo. Elimina contraseñas de ejemplo y comprueba que los respaldos estén cifrados y fuera del servidor principal.

El servicio web seguirá publicado únicamente en `127.0.0.1:8080`; PostgreSQL seguirá en loopback y la API no abrirá un puerto público. El archivo [docker-compose.public.yml](../docker-compose.public.yml) configura la API con el origen exacto del sitio y activa la cookie `Secure`. Arranca Compose con ambos archivos:

```bash
docker compose -f docker-compose.yml -f docker-compose.public.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.public.yml up --build -d --wait
```

Instala Caddy en el servidor y configura el nombre público para que reenvíe al Nginx local:

```caddyfile
siga.ejemplo.edu.mx {
    reverse_proxy 127.0.0.1:8080
}
```

Caddy obtiene y renueva el certificado TLS cuando el DNS y los puertos públicos están bien configurados. Antes de publicar, comprueba que el sitio redirige a HTTPS, que se puede iniciar/cerrar sesión y que una ruta del API como `/api/health` responde desde el dominio.

## Inicialización segura del administrador de producción

El bootstrap local no sirve para producción. El comando dedicado `npm run auth:bootstrap:production -w @siga/api` exige `NODE_ENV=production`, `WEB_ORIGIN` HTTPS, `COOKIE_SECURE=true`, la confirmación `SIGA_CONFIRM_PRODUCTION=I_UNDERSTAND` y el nombre exacto de la base en `SIGA_CONFIRM_DATABASE`. Usa el `DATABASE_URL` de propietario/operación que está en el `.env` del servidor; la API sigue conectándose con el usuario limitado `siga_app`. El correo se entrega mediante `SIGA_BOOTSTRAP_EMAIL`, la contraseña se genera al azar y se escribe en `.local/admin-produccion-acceso.txt` con permisos privados. Entrega ese acceso al responsable institucional por un canal seguro y elimina el archivo del servidor después de confirmar el primer inicio de sesión. Nunca uses las credenciales de `.local/credenciales-siga.txt` en producción.

## Puesta en servicio pendiente

No uses cuentas de demostración o contraseñas de desarrollo en el sitio público. El bootstrap de producción ya está implementado, pero falta ejecutarlo en el servidor real después de recibir los datos de alojamiento. El alta de estudiantes/docentes crea sus registros con el acceso desactivado; SIGA aún no incluye flujo de invitación, activación ni restablecimiento de contraseña para usuarios finales. Antes de abrirlo a una comunidad real, define ese flujo de provisión y configura el mecanismo institucional para entregar credenciales.

Antes de dar acceso a la comunidad, completa E12 desde fuentes curriculares oficiales, confirma y configura las reglas académicas propuestas, acuerda privacidad/retención de expedientes, genera un administrador institucional, crea cuentas iniciales por un procedimiento auditado y ensaya copias/restauración en infraestructura de prueba. No conectes el Docker local de este equipo directamente a Internet.

Las cuentas de validación local se abren con `npm run profiles:open`; el comando usa tres directorios de navegador independientes bajo `.local/navegadores/`. Para Docker, `npm run docker:users:bootstrap` crea los dos perfiles solicitados y escribe las tres credenciales locales en `.local/credenciales-siga.txt`. Son cuentas de demostración y no sirven para producción. Los listados administrativos ocultan los registros inactivos por defecto y permiten consultar el historial con **Mostrar archivados**.

La publicación remota sigue pendiente: hacen falta dominio y servidor con acceso de despliegue. Además, E12 aún debe completarse con el catálogo ICO-F19 oficial de claves, créditos y seriación; faltan las decisiones institucionales de privacidad y retención, y activar el flujo de acceso para usuarios finales. No marques la publicación como terminada hasta validar esos puntos, TLS, login real, respaldo/restauración y recuperación en ese alojamiento.
