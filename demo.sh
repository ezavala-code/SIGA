#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  echo 'Instala Docker con el complemento Docker Compose para iniciar la demo.' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo 'Inicia Docker y comprueba que tu usuario tenga acceso.' >&2
  exit 1
fi
config=.local/demo/config.env
if [[ ${1:-} == --stop ]]; then
  if [[ ! -f $config ]]; then echo 'La demo aún no se ha configurado.'; exit 0; fi
  docker compose --env-file "$config" -f docker-compose.demo.yml -p siga-demo stop
  echo 'Demo detenida; los datos se conservaron.'
  exit 0
fi
if [[ $# -ne 0 ]]; then echo 'Uso: ./demo.sh [--stop]' >&2; exit 2; fi
if [[ ! -f $config ]]; then
  if ! command -v openssl >/dev/null; then echo 'Se necesita openssl para generar credenciales.' >&2; exit 1; fi
  umask 077
  mkdir -p .local/demo
  {
    printf 'SIGA_DEMO_DB_PASSWORD=%s\n' "$(openssl rand -hex 24)"
    printf 'SIGA_DEMO_JWT_SECRET=%s\n' "$(openssl rand -hex 32)"
    printf 'SIGA_DEMO_PASSWORD=%s\n' "$(openssl rand -hex 12)"
    printf 'SIGA_DEMO_WEB_PORT=18080\n'
  } > "$config"
fi
docker compose --env-file "$config" -f docker-compose.demo.yml -p siga-demo up --build -d --wait
printf '\nDemo lista en http://localhost:%s\n' "$(sed -n 's/^SIGA_DEMO_WEB_PORT=//p' "$config")"
printf 'Credenciales y cuentas: .local/demo/config.env y docs/DEMO_LOCAL.md\n'
printf 'Para detenerla conservando datos: ./demo.sh --stop\n'
