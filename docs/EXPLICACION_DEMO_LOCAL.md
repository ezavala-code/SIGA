# Cómo usar la demo, paso a paso

La demo es una escuela de ejemplo dentro de tu computadora. Los nombres, las materias y las calificaciones son inventados. Puedes probarla sin cambiar los datos de otros proyectos.

1. Abre Docker y espera a que termine de iniciar.
2. Abre una terminal en la carpeta del proyecto.
3. Escribe `./demo.sh` y presiona Enter. La primera vez puede tardar mientras prepara todo.
4. Cuando aparezca «Demo lista», abre tu navegador y entra a `http://localhost:18080`.
5. Para ver la contraseña, escribe en la terminal: `sed -n 's/^SIGA_DEMO_PASSWORD=//p' .local/demo/config.env`.
6. Usa esa contraseña con alguno de los correos de la [lista de cuentas](DEMO_LOCAL.md). Por ejemplo, `estudiante3.e2d6aff9@example.invalid`.
7. Como estudiante, abre «Mi matrícula» e inscríbete al grupo `INTRO-ALTERNO`.
8. Cierra sesión y entra con `docente2.e2d6aff9@example.invalid`. Busca el grupo y registra la nota del estudiante.
9. Vuelve a entrar como estudiante. Consulta su calificación y genera su constancia.
10. Al terminar, escribe `./demo.sh --stop` en la terminal. Tus cambios de la demo se conservan para la próxima vez.

Para regresar otro día, abre Docker y vuelve a escribir `./demo.sh`. Si la inscripción ya se realizó, la aplicación la conservará; puedes explorar los otros estudiantes o crear nuevos datos de ejemplo desde el administrador. Si algo no inicia, comprueba que Docker esté encendido y que el puerto 18080 no esté ocupado. La [guía técnica](DEMO_LOCAL.md) explica cómo cambiarlo.
