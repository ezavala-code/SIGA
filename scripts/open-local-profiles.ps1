param(
    [ValidateSet('docker', 'native')]
    [string]$Target = 'docker',
    [ValidateSet('Edge', 'Chrome')]
    [string]$Browser = 'Edge'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$port = if ($Target -eq 'docker') { '8080' } else { '5173' }
$url = "http://localhost:$port/acceso"
$browserPath = $null

if ($Browser -eq 'Edge') {
    $command = Get-Command msedge.exe -ErrorAction SilentlyContinue
    if ($command) { $browserPath = $command.Source }
    if (-not $browserPath) {
        $candidates = @(
            (Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe'),
            (Join-Path ${env:ProgramFiles(x86)} 'Microsoft/Edge/Application/msedge.exe'),
            (Join-Path $env:LOCALAPPDATA 'Microsoft/Edge/Application/msedge.exe')
        )
        $browserPath = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
    }
}
else {
    $command = Get-Command chrome.exe -ErrorAction SilentlyContinue
    if ($command) { $browserPath = $command.Source }
    if (-not $browserPath) {
        $candidates = @(
            (Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'),
            (Join-Path ${env:ProgramFiles(x86)} 'Google/Chrome/Application/chrome.exe'),
            (Join-Path $env:LOCALAPPDATA 'Google/Chrome/Application/chrome.exe')
        )
        $browserPath = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
    }
}
if (-not $browserPath) { throw "No se encontró $Browser. Instala el navegador o selecciona el otro disponible." }

try {
    $ready = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 5 -UseBasicParsing
}
catch {
    throw "SIGA no respondió en $url. Inicia el destino local antes de abrir las ventanas."
}
if ($ready.StatusCode -lt 200 -or $ready.StatusCode -ge 300) {
    throw "SIGA no respondió correctamente en $url."
}

foreach ($profile in @('administracion', 'docente', 'estudiante')) {
    $profilePath = Join-Path $projectRoot ".local/navegadores/$Target/$profile"
    New-Item -ItemType Directory -Path $profilePath -Force | Out-Null
    $arguments = '--new-window --no-first-run --no-default-browser-check --user-data-dir="{0}" "{1}"' -f $profilePath, $url
    Start-Process -FilePath $browserPath -ArgumentList $arguments -WindowStyle Normal
    Write-Output "Abierta ventana $profile en $url (sesión aislada)."
}
