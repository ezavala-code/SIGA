# Inventario de cobertura de reglas

Actualización: 10 de noviembre de 2026, hora de Ciudad de México. Sustituye el [inventario anterior](evidencias/inventario-cobertura-anterior-no-vigente-20261109.md), que contenía rutas y cifras que no correspondían a la configuración real. Ese documento se conserva únicamente como antecedente.

## Configuración real

`scripts/test-integration.mjs --coverage` construye la configuración de Jest para los proyectos unitarios e integración; selecciona los archivos de reglas bajo `apps/api/src/modules` mediante el patrón y agrega explícitamente `config/environment.ts` y `config/origin.ts`. Exige individualmente al menos 70 % de líneas y 70 % de ramas. El runner comprueba que exista al menos un módulo antes de incluir configuración. El reporte se genera en `.local/e09-coverage/`.

La protección CSRF reside en `auth.guard.ts` y `auth.service.ts`; la interpretación de ventanas horarias está en `oferta.service.ts` y la migración correspondiente. Los archivos `csrf.ts`, `mexico-city-datetime.ts` y `jest.coverage.config.cjs` citados anteriormente no existen. La inclusión en el denominador no demuestra cobertura exhaustiva de cada escenario.

## Resultado ejecutado

`npm run test:coverage`, contra PostgreSQL 18.6 y un esquema temporal propio, terminó con **17 suites y 140 pruebas aprobadas**. El resultado global fue 95,31 % de líneas, 82,87 % de ramas, 93,66 % de sentencias y 98,83 % de funciones. Todos los 16 archivos evaluados superaron el umbral individual; el mínimo de ramas fue 72,13 % (`certificados.service.ts`) y el mínimo de líneas 88,88 % (`login-limiter.service.ts`). Las cifras por archivo y advertencias de ejecución están en el [registro completo](evidencias/cobertura-reglas-20261110.log).

La cobertura comprende configuración, servicios de autenticación y reglas académicas, PDF, cola de grupos y provisión local. Controladores, CLI y cableado no se consideran cubiertos por este porcentaje; requieren sus propias pruebas. El runtime emitió advertencias de obsolescencia de `pg` relativas a consultas simultáneas; no se ocultaron y corresponde revisarlas antes de una actualización mayor de esa dependencia.

## CI

El flujo `.github/workflows/ci.yml` conserva `.local/e09-coverage/` como artefacto `coverage-report`, incluso tras fallo. Se comprobó la ubicación generada localmente; **no se ejecutó CI remoto** ni se acredita la descarga de ese artefacto desde un servidor.
