$ErrorActionPreference = "Stop"

. "$PSScriptRoot\server-port-utils.ps1"

$port = Get-PetServerPort
$hostName = if ($env:HOST) { $env:HOST } else { "0.0.0.0" }
$projectDirectory = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backendDirectory = Resolve-Path (Join-Path $PSScriptRoot "..")

$owners = @(Get-PortOwnerIds -Port $port)
if ($owners.Count) {
  if (-not (Stop-PetServerOnPort -Port $port)) {
    throw "Libere a porta $port ou altere a variavel PORT antes de iniciar."
  }
}

Set-PetSessionSecret -ProjectDirectory $projectDirectory

if (-not $env:DATABASE_URL) {
  & "$PSScriptRoot\start-local-db.ps1"
  $dbPort = if ($env:PET_DB_PORT) { [int]$env:PET_DB_PORT } else { 55432 }
  $dbName = if ($env:PET_DB_NAME) { $env:PET_DB_NAME } else { "pet_identification" }
  $env:DATABASE_URL = "postgresql://postgres@127.0.0.1:$dbPort/$dbName"
}

Write-Host "Iniciando Registro Digital Animal em $hostName`:$port..."
Write-Host "Pressione Ctrl+C para encerrar o servidor."
Write-Host ""

Push-Location $backendDirectory
try {
  & node server.js
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
