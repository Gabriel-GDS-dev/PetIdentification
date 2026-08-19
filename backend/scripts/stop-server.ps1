$ErrorActionPreference = "Stop"

. "$PSScriptRoot\server-port-utils.ps1"

$port = Get-PetServerPort
if (Stop-PetServerOnPort -Port $port) {
  Write-Host "Porta $port liberada para o Pet Identification."
  exit 0
}

exit 1
