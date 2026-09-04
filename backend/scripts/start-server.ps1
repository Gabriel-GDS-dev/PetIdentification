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
