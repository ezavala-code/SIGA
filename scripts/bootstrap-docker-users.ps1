$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$published = docker compose port db 5432
if ($LASTEXITCODE -ne 0 -or $published.Trim() -ne '127.0.0.1:5432') {
    throw 'Inicia el Compose de Docker y confirma que PostgreSQL solo publica 127.0.0.1:5432.'
}

$line = Get-Content -LiteralPath '.env' | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $line) { throw 'Falta DATABASE_URL en .env.' }
$nativeUrl = $line.Substring('DATABASE_URL='.Length)
$parsed = [uri]$nativeUrl
if ($parsed.Host -ne '127.0.0.1' -or $parsed.Port -ne 55432 -or $parsed.AbsolutePath -ne '/siga_dev') {
    throw 'Se esperaba la base nativa siga_dev en 127.0.0.1:55432 antes de seleccionar Docker.'
}

$dockerUrl = $nativeUrl.Replace('@127.0.0.1:55432/', '@127.0.0.1:5432/')
$previous = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
try {
    $env:DATABASE_URL = $dockerUrl
    npm run auth:bootstrap:local-users -w @siga/api
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron crear los perfiles locales solicitados.' }
} finally {
    if ($null -eq $previous) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
    else { $env:DATABASE_URL = $previous }
}
