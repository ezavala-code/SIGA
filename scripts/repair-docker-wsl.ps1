# Ejecutar desde PowerShell como administrador. No reinicia ni elimina distribuciones.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $root '.local'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$resultPath = Join-Path $logDirectory 'docker-repair.json'
$result = [ordered]@{ startedAt = (Get-Date).ToString('o'); status = 'running'; features = @(); restartRequired = $true }
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resultPath -Encoding UTF8
try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Se necesita PowerShell como administrador para habilitar componentes de Windows.'
    }
    foreach ($featureName in @('Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform')) {
        $feature = Get-WindowsOptionalFeature -Online -FeatureName $featureName
        if ($feature.State -ne 'Enabled') {
            $enabled = Enable-WindowsOptionalFeature -Online -FeatureName $featureName -All -NoRestart
            $result.restartRequired = $result.restartRequired -or $enabled.RestartNeeded
        }
        $state = (Get-WindowsOptionalFeature -Online -FeatureName $featureName).State.ToString()
        $result.features += @{ name = $featureName; state = $state }
        if ($state -match 'Pending') { $result.restartRequired = $true }
    }
    $wslLog = Join-Path $logDirectory 'docker-wsl-install.log'
    $wslErrorLog = Join-Path $logDirectory 'docker-wsl-install-error.log'
    $result.status = 'installing-wsl'
    $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resultPath -Encoding UTF8
    $installer = Start-Process -FilePath "$env:SystemRoot\System32\wsl.exe" -WindowStyle Hidden -Wait -PassThru -ArgumentList @('--install', '--no-distribution', '--web-download') -RedirectStandardOutput $wslLog -RedirectStandardError $wslErrorLog
    $result.wslInstallExitCode = $installer.ExitCode
    if ($installer.ExitCode -notin @(0, 3010)) {
        throw ('Componentes habilitados, pero WSL devolvio codigo ' + $installer.ExitCode + '. Consultar .local/docker-wsl-install*.log; reiniciar Windows y repetir este script.')
    }
    # La primera habilitación requiere reinicio aunque una segunda consulta diga Enabled.
    $result.restartRequired = $true
    $result.status = 'restart-required'
    $result.message = 'Componentes y paquete WSL preparados. Guardar el trabajo y reiniciar Windows; luego abrir Docker Desktop.'
} catch {
    $result.status = 'error'
    $result.message = $_.Exception.Message
} finally {
    $result.finishedAt = (Get-Date).ToString('o')
    $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resultPath -Encoding UTF8
}
if ($result.status -eq 'error') { Write-Error $result.message; exit 1 }
Write-Output $result.message
