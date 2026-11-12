param(
    [ValidateSet('start', 'stop', 'status')][string]$Action = 'status',
    [string]$Bin = 'C:\Program Files\PostgreSQL\18\bin'
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskLocalRoot = [IO.Path]::GetFullPath((Join-Path $taskRoot '.local'))
$taskEnvPath = Join-Path $taskRoot '.env'
if (-not (Test-Path -LiteralPath (Join-Path $Bin 'pg_ctl.exe'))) { throw 'PostgreSQL 18 no esta instalado en la ruta indicada. Usa Docker o especifica -Bin.' }
if (-not (Test-Path -LiteralPath $taskEnvPath)) { throw 'Ejecuta npm run setup -- --native primero.' }
$taskConfig = @{}
Get-Content -LiteralPath $taskEnvPath | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { $taskConfig[$matches[1]] = $matches[2] }
}
New-Item -ItemType Directory -Force -Path $taskLocalRoot | Out-Null
foreach ($taskInstance in @(
    @{ Name = 'dev'; Key = 'DATABASE_URL'; Port = 55432; Database = 'siga_dev'; User = 'siga' },
    @{ Name = 'test'; Key = 'TEST_DATABASE_URL'; Port = 55433; Database = 'siga_test'; User = 'siga_test' }
)) {
    $taskUri = [Uri]$taskConfig[$taskInstance.Key]
    if ($taskUri.Host -ne '127.0.0.1' -or $taskUri.Port -ne $taskInstance.Port -or $taskUri.AbsolutePath -ne "/$($taskInstance.Database)") {
        throw "Configuracion incompatible con el modo local. $($taskInstance.Key) debe usar 127.0.0.1:$($taskInstance.Port)/$($taskInstance.Database)."
    }
    $taskCredentials = $taskUri.UserInfo.Split(':', 2)
    if ($taskCredentials[0] -ne $taskInstance.User -or $taskCredentials.Length -ne 2) { throw 'Usuario o credenciales locales no validos.' }
    $taskPassword = [Uri]::UnescapeDataString($taskCredentials[1])
    $taskData = [IO.Path]::GetFullPath((Join-Path $taskLocalRoot "pg-$($taskInstance.Name)"))
    if (-not $taskData.StartsWith($taskLocalRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Directorio fuera del proyecto.' }
    $taskCtl = Join-Path $Bin 'pg_ctl.exe'
    if ($Action -eq 'start') {
        if (-not (Test-Path -LiteralPath (Join-Path $taskData 'PG_VERSION'))) {
            if (Test-Path -LiteralPath $taskData) { throw "Directorio incompleto existente: $taskData. Revisar manualmente; no se borrara." }
            $taskPasswordFile = Join-Path $taskLocalRoot "init-$($taskInstance.Name).secret"
            try {
                [IO.File]::WriteAllText($taskPasswordFile, $taskPassword, [Text.UTF8Encoding]::new($false))
                & (Join-Path $Bin 'initdb.exe') -D $taskData -U $taskInstance.User "--pwfile=$taskPasswordFile" '--encoding=UTF8' '--locale=C' '--auth=scram-sha-256'
                if ($LASTEXITCODE -ne 0) { throw 'initdb fallo.' }
            } finally {
                if (Test-Path -LiteralPath $taskPasswordFile) { Remove-Item -LiteralPath $taskPasswordFile }
            }
        }
        & $taskCtl -D $taskData status *> $null
        if ($LASTEXITCODE -ne 0) {
            & $taskCtl -D $taskData -l (Join-Path $taskLocalRoot "pg-$($taskInstance.Name).log") -o "-p $($taskInstance.Port) -h 127.0.0.1" -w start
            if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL no pudo iniciar; consultar el log de .local.' }
        }
        $taskPreviousPassword = $env:PGPASSWORD
        try {
            $env:PGPASSWORD = $taskPassword
            $taskExists = & (Join-Path $Bin 'psql.exe') -h 127.0.0.1 -p $taskInstance.Port -U $taskInstance.User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$($taskInstance.Database)'"
            if ($LASTEXITCODE -ne 0) { throw 'No fue posible comprobar la base local.' }
            if ($taskExists -ne '1') {
                & (Join-Path $Bin 'createdb.exe') -h 127.0.0.1 -p $taskInstance.Port -U $taskInstance.User $taskInstance.Database
                if ($LASTEXITCODE -ne 0) { throw 'No fue posible crear la base local.' }
            }
        } finally { $env:PGPASSWORD = $taskPreviousPassword }
        Write-Output "PostgreSQL $($taskInstance.Name) disponible en 127.0.0.1:$($taskInstance.Port)."
    } elseif (Test-Path -LiteralPath (Join-Path $taskData 'PG_VERSION')) {
        & $taskCtl -D $taskData status
        if ($Action -eq 'stop' -and $LASTEXITCODE -eq 0) {
            & $taskCtl -D $taskData -m fast -w stop
            if ($LASTEXITCODE -ne 0) { throw 'No fue posible detener la instancia local.' }
        }
    } else { Write-Output "Instancia $($taskInstance.Name) aun no inicializada." }
}
exit 0
