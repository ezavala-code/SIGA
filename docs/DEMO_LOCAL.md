# Demostración local de SIGA

La demo crea una instalación Docker independiente con datos sintéticos: dos programas ficticios, dos planes, asignaturas, dos docentes, cuatro estudiantes, grupos y calificaciones de ejemplo. Las reglas académicas de la demostración son provisionales. No utiliza la base de desarrollo ni los volúmenes de otros proyectos.

## Requisitos e inicio

En Linux o macOS, instala y arranca Docker con el complemento Compose y asegúrate de tener `openssl`. Desde la raíz del proyecto:

```bash
./demo.sh
```

La primera ejecución construye las imágenes, crea una base exclusiva, aplica migraciones y carga los datos. Después abre <http://localhost:18080>. El servicio escucha solo en esta computadora. El puerto 18080 debe estar libre. Las ejecuciones posteriores conservan los datos y las contraseñas existentes.

El archivo privado `.local/demo/config.env` contiene la contraseña común de las cuentas en `SIGA_DEMO_PASSWORD` y otros secretos del entorno. Puedes consultarla con:

```bash
sed -n 's/^SIGA_DEMO_PASSWORD=//p' .local/demo/config.env
```

Las cuentas tienen el dominio reservado `example.invalid` y son exclusivamente ficticias:

| Rol           | Correo                                 | Datos disponibles                                  |
| ------------- | -------------------------------------- | -------------------------------------------------- |
| Administrador | `admin.e2d6aff9@example.invalid`       | Catálogos, personas, grupos y reportes.            |
| Docente       | `docente1.e2d6aff9@example.invalid`    | Grupos asignados y notas.                          |
| Docente       | `docente2.e2d6aff9@example.invalid`    | Grupos alternos de ambos programas.                |
| Estudiante    | `estudiante1.e2d6aff9@example.invalid` | Historial con nota y matrícula existente.          |
| Estudiante    | `estudiante2.e2d6aff9@example.invalid` | Historial con nota reprobada.                      |
| Estudiante    | `estudiante3.e2d6aff9@example.invalid` | Puede inscribirse en un grupo alterno de Software. |
| Estudiante    | `estudiante4.e2d6aff9@example.invalid` | Puede inscribirse en Diseño visual.                |

Para probar el flujo completo, entra como estudiante 3, inscríbelo en `INTRO-ALTERNO`; entra después como docente 2, guarda su nota, y vuelve al estudiante para consultar su avance y emitir una constancia. Cada acción modifica los datos persistentes de esta demo; el script no reinicia ni sobrescribe los cambios al volverlo a ejecutar. Las ventanas de inscripción se crean relativas al primer arranque y tienen una duración finita; pueden administrarse desde la interfaz.

Para detener los servicios conservando los datos:

```bash
./demo.sh --stop
```

Para volver a abrirla ejecuta `./demo.sh`. Si el puerto 18080 está ocupado, edita `SIGA_DEMO_WEB_PORT` en `.local/demo/config.env` con otro puerto libre y vuelve a ejecutar el script. Conserva el archivo: contiene las credenciales de la base y de la demo. Si las imágenes aún no están descargadas, el primer arranque necesita conexión a internet. En Windows, el script está pensado para ejecutarse desde WSL con Docker habilitado.

## Alcance técnico

`docker-compose.demo.yml` usa el proyecto Compose `siga-demo`, los volúmenes `siga-demo_demo_db` y `siga-demo_demo_certificados`, y no publica el puerto de PostgreSQL. La semilla está limitada a la base `siga_demo` del servicio `db` y no reemplaza usuarios existentes si ya se cargó. El script no borra volúmenes. Esta instalación local de demostración no se debe exponer a internet ni usar con información real.

Para una explicación paso a paso sin conocimientos técnicos, consulta [Cómo usar la demo](EXPLICACION_DEMO_LOCAL.md).
