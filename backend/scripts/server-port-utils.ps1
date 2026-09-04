$DefaultPetPort = 5241

function Get-PetServerPort {
  if ($env:PORT) { return [int]$env:PORT }
  return $DefaultPetPort
}

function Get-PortOwnerIds {
  param([int]$Port)

  @(
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique |
      Where-Object { $_ -and $_ -ne 0 }
  )
}

function Get-PortOwnerDescriptions {
  param([int[]]$ProcessIds)

  @(
    foreach ($processId in $ProcessIds) {
      $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
      if ($process) {
        "$($process.ProcessId) $($process.Name) $($process.CommandLine)"
      } else {
        "PID $processId"
      }
    }
  )
}

function Test-IsPetServer {
  param([int]$Port)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 3
    if ($response.Content -match '"ok"\s*:\s*true' -and $response.Content -match '"database"') {
      return $true
    }
  } catch {
  }

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/" -TimeoutSec 3
    return ($response.Content -match "Registro Digital Animal" -and $response.Content -match "Carteira Digital")
  } catch {
    return $false
  }
}

function Stop-PetServerOnPort {
  param(
    [int]$Port,
    [switch]$Quiet
  )

  $owners = @(Get-PortOwnerIds -Port $Port)
  if (-not $owners.Count) {
    if (-not $Quiet) { Write-Host "Nenhum servidor esta usando a porta $Port." }
    return $true
  }

  if (-not (Test-IsPetServer -Port $Port)) {
    $details = (Get-PortOwnerDescriptions -ProcessIds $owners) -join "`n"
    Write-Host "A porta $Port esta ocupada por outro processo:" -ForegroundColor Yellow
    Write-Host $details
    Write-Host "Nao encerrei esse processo automaticamente." -ForegroundColor Yellow
    return $false
  }

  if (-not $Quiet) {
    Write-Host "Servidor antigo encontrado na porta $Port. Encerrando para iniciar limpo..."
  }

  foreach ($owner in $owners) {
    if ($owner -eq $PID) { continue }
    Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
  }

  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    if (-not @(Get-PortOwnerIds -Port $Port).Count) { return $true }
  }

  Write-Host "Nao consegui liberar a porta $Port." -ForegroundColor Yellow
  return $false
}

function Set-PetSessionSecret {
  param([string]$ProjectDirectory)

  if ($env:SESSION_SECRET) { return }

  $runtimeDirectory = Join-Path $ProjectDirectory ".runtime"
  $secretFile = Join-Path $runtimeDirectory "session-secret.txt"
  New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

  if (-not (Test-Path -LiteralPath $secretFile)) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
      $rng.GetBytes($bytes)
    } finally {
      $rng.Dispose()
    }

    [Convert]::ToBase64String($bytes) | Set-Content -LiteralPath $secretFile -NoNewline -Encoding ASCII
    Write-Host "Segredo local de sessao criado em .runtime/session-secret.txt"
  }

  $env:SESSION_SECRET = (Get-Content -LiteralPath $secretFile -Raw).Trim()
}
