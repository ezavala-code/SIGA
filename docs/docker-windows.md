# Reparación y verificación de Docker Desktop en Windows

La captura mostraba Virtual Machine Platform not enabled. El 09/10/2026 se ejecutó `scripts/repair-docker-wsl.ps1` con elevación de Windows y se habilitaron correctamente:

- Microsoft-Windows-Subsystem-Linux: Enabled.
- VirtualMachinePlatform: Enabled.
- Reinicio requerido: sí. No se reinició automáticamente el equipo.

Antes del reinicio, la comprobación indicó que también faltaba el paquete WSL. Su instalación estándar falló por conexión interrumpida; la descarga web tampoco concluyó en esa sesión. Se detuvieron únicamente los procesos de descarga iniciados entonces. No se ejecutó un instalador incompleto ni se borraron volúmenes o datos de Docker.

## Acciones que resolvieron el problema

El usuario completó la instalación de WSL y reinició Windows el 10/10/2026. La comprobación local posterior mostró WSL 3.0.1, versión predeterminada 2 y Docker Engine 29.8.2 disponible. `docker compose up --build -d --wait` construyó y arrancó el proyecto: base sana, migración terminada con código 0, API sana y web en http://localhost:8080. `/api/health` respondió `ok`; 10 pruebas E2E de la web Docker pasaron tras activar datos ficticios. Ya no se reproduce el mensaje «Virtual Machine Platform not enabled» de la captura.

En una reinstalación que presente el mismo síntoma, abrir PowerShell como administrador y comprobar:

```powershell
wsl --version
wsl --set-default-version 2
docker info
docker compose up --build -d --wait
```

Si WSL falta, `wsl --install --no-distribution --web-download` instala el paquete; reiniciar cuando Windows lo solicite y volver a comprobar. No se necesita instalar Ubuntu para Docker Desktop. Desde el proyecto, `npm run docker:repair` en PowerShell como administrador repite la habilitación sin eliminar distribuciones ni reiniciar automáticamente. Los resultados históricos están en `.local/docker-repair.json` y `docker-wsl-install*.log`.

## Límites actuales

Docker funciona para la demostración local. No equivale a CI remoto ejecutado ni a despliegue productivo con HTTPS; ver `docs/ESTADO.md`. Las contraseñas de demo Docker se guardan en `.local/demo-acceso-5432.txt`, distinto del acceso nativo.

WMI había indicado HypervisorPresent=True. No se modificó BIOS ni arranque.

Fuentes oficiales: [habilitar WSL y Virtual Machine Platform](https://learn.microsoft.com/en-us/windows/wsl/install-manual), [comandos WSL](https://learn.microsoft.com/en-us/windows/wsl/basic-commands), [requisitos Docker para Windows](https://docs.docker.com/desktop/setup/install/windows-install/) y [distribución oficial WSL](https://github.com/microsoft/WSL/releases/tag/3.0.1).
